const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const dgram = require('dgram');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const ROOT = path.resolve(__dirname);
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const storageDir = path.resolve(ROOT, config.storageDir || './storage');
const releaseDir = path.join(storageDir, 'releases');
const incomingDir = path.join(storageDir, '.incoming');
const currentPath = path.join(storageDir, 'current.json');
const pluginDir = path.join(storageDir, 'plugins');
const currentPluginsPath = path.join(storageDir, 'plugins-current.json');

const logPath = path.join(ROOT, 'server.log');

function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 2 * 1024 * 1024) {
      const oldPath = logPath + '.1';
      try { fs.rmSync(oldPath, { force: true }); } catch {}
      fs.renameSync(logPath, oldPath);
    }
  } catch {}
}

function log(...parts) {
  const line = `[${new Date().toISOString()}] ${parts.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(logPath, line + '\n', 'utf8'); } catch {}
}

rotateLogIfNeeded();

fs.mkdirSync(releaseDir, { recursive: true });
fs.mkdirSync(incomingDir, { recursive: true });
fs.mkdirSync(pluginDir, { recursive: true });

const serverId = crypto
  .createHash('sha256')
  .update(`${os.hostname()}|${ROOT}`)
  .digest('hex')
  .slice(0, 16);

const clients = new Set();
const publishSessions = new Map();
let currentRelease = readCurrentRelease();
let currentPlugins = readCurrentPlugins();
let lastCurrentFingerprint = fingerprintCurrent(currentRelease);

function readCurrentRelease() {
  try {
    const value = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
    if (!value?.version) return null;
    return value;
  } catch {
    return null;
  }
}

function fingerprintCurrent(value) {
  return value ? `${value.version}|${value.publishedAt || ''}` : '';
}

function readCurrentPlugins() {
  try{
    const value=JSON.parse(fs.readFileSync(currentPluginsPath,'utf8'));
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }catch{return {};}
}

function writeCurrentPlugins(next) {
  const temp=currentPluginsPath+`.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp,JSON.stringify(next,null,2)+'\n','utf8');
  if(fs.existsSync(currentPluginsPath))fs.rmSync(currentPluginsPath,{force:true});
  fs.renameSync(temp,currentPluginsPath);
}

function pluginList(){return Object.values(currentPlugins).sort((a,b)=>String(a.id).localeCompare(String(b.id)));}
function validPluginId(value){return /^[a-z0-9][a-z0-9._-]{0,119}$/i.test(String(value||''));}
function readBufferBody(req,limit=12*1024*1024){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    req.on('data',chunk=>{size+=chunk.length;if(size>limit){reject(new Error('request_body_too_large'));req.destroy();return;}chunks.push(chunk);});
    req.on('end',()=>resolve(Buffer.concat(chunks)));
    req.on('error',reject);
  });
}

function lanIPv4Addresses() {
  const out = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const info of entries || []) {
      if (info.family === 'IPv4' && !info.internal) out.push(info.address);
    }
  }
  return [...new Set(out)];
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.yml': 'text/yaml; charset=utf-8',
    '.yaml': 'text/yaml; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.sig': 'text/plain; charset=utf-8',
    '.exe': 'application/octet-stream',
    '.blockmap': 'application/octet-stream',
    '.zip': 'application/zip',
    '.txt': 'text/plain; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function safeJoin(base, relative) {
  const decoded = decodeURIComponent(relative);
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.resolve(base, normalized);
  if (!full.startsWith(path.resolve(base) + path.sep) && full !== path.resolve(base)) return null;
  return full;
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj, null, 2));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function isLoopbackRequest(req) {
  const address = String(req.socket?.remoteAddress || '').toLowerCase();
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function readJsonBody(req, limit = 128 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('request_body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim();
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(new Error(`invalid_json: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function normalizeReleaseVersion(value) {
  const version = String(value || '').trim();
  if (!version || !/^[0-9A-Za-z][0-9A-Za-z._+-]{0,79}$/.test(version)) return null;
  return version;
}

function allowedPublishFilename(value) {
  const name = String(value || '').trim();
  if (!name || path.basename(name) !== name || name.includes('/') || name.includes('\\')) return null;
  const lower = name.toLowerCase();
  if (lower === 'latest.yml' || lower.endsWith('.exe') || lower.endsWith('.blockmap')) return name;
  return null;
}

function parseLatestVersion(text) {
  const match = String(text || '').match(/^version:\s*["']?([^"' \r\n]+)["']?\s*$/m);
  return match ? match[1] : null;
}

function parseLatestPrimaryFile(text) {
  const match = String(text || '').match(/^path:\s*["']?(.+?)["']?\s*$/m);
  return match ? match[1].trim() : null;
}

function retainRecentReleases(currentVersion) {
  const retain = Math.max(2, Number(config.retainReleases) || 12);
  const dirs = fs.readdirSync(releaseDir)
    .map(name => ({ name, full: path.join(releaseDir, name) }))
    .filter(x => !x.name.startsWith('.') && fs.statSync(x.full).isDirectory())
    .map(x => ({ ...x, mtime: fs.statSync(x.full).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const item of dirs.slice(retain)) {
    if (item.name === currentVersion) continue;
    fs.rmSync(item.full, { recursive: true, force: true });
  }
}

function writeCurrentRelease(next) {
  const temp = currentPath + `.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, currentPath);
}

function dashboardHtml() {
  const ips = lanIPv4Addresses();
  const urls = ips.map(ip => `http://${ip}:${config.port}`).join('<br>');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>DKDS LAN Update Server</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f5f7fb;color:#172033;margin:0}
main{max-width:920px;margin:40px auto;background:#fff;padding:28px;border:1px solid #dfe5ef;border-radius:14px;box-shadow:0 8px 30px rgba(20,30,60,.08)}
code{background:#f2f5fa;padding:2px 5px;border-radius:5px}.ok{color:#087443}.muted{color:#667085}
.grid{display:grid;grid-template-columns:180px 1fr;gap:9px 14px}.box{margin-top:18px;padding:14px;border:1px solid #e5eaf2;border-radius:10px;background:#fafcff}
</style></head><body><main>
<h1>DK Data Studio 局域网更新服务</h1>
<div class="grid">
<div>服务状态</div><div class="ok">运行中</div>
<div>Server ID</div><div><code>${serverId}</code></div>
<div>HTTP</div><div>${urls || `http://127.0.0.1:${config.port}`}</div>
<div>Multicast</div><div><code>${config.multicastGroup}:${config.multicastPort}</code></div>
<div>WebSocket 客户端</div><div>${clients.size}</div>
<div>当前版本</div><div>${currentRelease?.version || '尚未发布'}</div>
<div>插件更新</div><div>${pluginList().length} 个已发布插件通道</div>
</div>
<div class="box">
<b>发布方式</b><br><br>
GitHub Actions 下载的 Windows Artifact 可直接双击 <code>局域网发布.cmd</code>。发布接口只接受本机 127.0.0.1 请求，局域网其他设备不能上传版本。<br><br>
本地源码构建仍可使用 <code>DKDS.cmd publish-update</code>；单独推送插件使用 <code>DKDS.cmd plugin-publish-lan</code>。
</div>
<p class="muted">简化可信局域网模式：不需要任何公钥/私钥。安装包下载后仍由 electron-updater 按 latest.yml 中的 SHA512 校验完整性。请仅在你信任的实验室/办公室局域网中使用。</p>
</main></body></html>`;
}

function serveRelease(req, res, pathname) {
  const match = pathname.match(/^\/releases\/([^/]+)\/(.+)$/);
  if (!match) return false;
  const version = match[1];
  const relative = match[2];
  const base = path.join(releaseDir, version);
  const filePath = safeJoin(base, relative);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(res, 404, { error: 'file_not_found' });
    return true;
  }

  const stat = fs.statSync(filePath);
  const headers = {
    'Content-Type': mimeType(filePath),
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': relative === 'latest.yml'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable'
  };

  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    return true;
  }

  const range = req.headers.range;
  if (range) {
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
      if (start <= end && start < stat.size) {
        res.writeHead(206, {
          ...headers,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Content-Length': end - start + 1
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return true;
      }
    }
  }

  res.writeHead(200, headers);
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function servePlugin(req,res,pathname) {
  const match=pathname.match(/^\/plugins\/([^/]+)\/([a-f0-9]{64})\.dkplugin$/i);
  if(!match)return false;
  const id=decodeURIComponent(match[1]);const sha=match[2].toLowerCase();
  if(!validPluginId(id)){sendJson(res,404,{error:'plugin_not_found'});return true;}
  const filePath=path.join(pluginDir,id,`${sha}.dkplugin`);
  if(!fs.existsSync(filePath)||!fs.statSync(filePath).isFile()){sendJson(res,404,{error:'plugin_not_found'});return true;}
  const stat=fs.statSync(filePath);
  res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Content-Length':stat.size,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleLocalPublish(req, res, url) {
  const pathname = url.pathname;
  if (!pathname.startsWith('/api/publish/') && pathname !== '/api/plugins/publish') return false;

  if (!isLoopbackRequest(req)) {
    sendJson(res, 403, { error: 'local_publish_only' });
    return true;
  }

  if (pathname === '/api/plugins/publish' && req.method === 'PUT') {
    try{
      const raw=await readBufferBody(req);
      const parsed=JSON.parse(raw.toString('utf8'));
      const manifest=parsed?.manifest||{};
      const id=String(manifest.id||'').trim();
      const name=String(manifest.name||id).trim();
      const version=String(manifest.version||'').trim();
      if(Number(parsed?.schema)!==1||!validPluginId(id)||!version||!parsed?.files||typeof parsed.files!=='object'){
        sendJson(res,400,{error:'invalid_plugin_package'});return true;
      }
      const sha256=crypto.createHash('sha256').update(raw).digest('hex');
      const dir=path.join(pluginDir,id);fs.mkdirSync(dir,{recursive:true});
      const target=path.join(dir,`${sha256}.dkplugin`);
      if(!fs.existsSync(target)){
        const temp=`${target}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(temp,raw);fs.renameSync(temp,target);
      }
      const plugin={id,name,version,sha256,publishedAt:new Date().toISOString(),revision:`${version}+${sha256.slice(0,12)}`,url:`/plugins/${encodeURIComponent(id)}/${sha256}.dkplugin`};
      currentPlugins={...currentPlugins,[id]:plugin};writeCurrentPlugins(currentPlugins);
      log(`[plugin-publish] ${id} v${version} ${sha256.slice(0,12)}`);
      broadcast({type:'plugin-release',schema:1,serverId,plugin});
      sendJson(res,200,{ok:true,plugin,connectedClients:clients.size});
    }catch(err){sendJson(res,400,{error:'plugin_publish_failed',message:err.message});}
    return true;
  }

  if (pathname === '/api/publish/start' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const version = normalizeReleaseVersion(body.version);
      if (!version) {
        sendJson(res, 400, { error: 'invalid_version' });
        return true;
      }

      const releasePath = path.join(releaseDir, version);
      const replace = body.replace === true;
      if (fs.existsSync(releasePath) && !replace) {
        sendJson(res, 409, {
          error: 'release_exists',
          version,
          message: 'Use a newer application version for normal auto-update publishing.'
        });
        return true;
      }

      const session = crypto.randomUUID();
      const tempPath = path.join(incomingDir, session);
      fs.mkdirSync(tempPath, { recursive: true });
      publishSessions.set(session, {
        session,
        version,
        replace,
        dir: tempPath,
        createdAt: Date.now()
      });
      sendJson(res, 200, { ok: true, session, version });
    } catch (err) {
      sendJson(res, 400, { error: 'publish_start_failed', message: err.message });
    }
    return true;
  }

  if (pathname === '/api/publish/file' && req.method === 'PUT') {
    const sessionId = String(url.searchParams.get('session') || '');
    const filename = allowedPublishFilename(url.searchParams.get('name'));
    const session = publishSessions.get(sessionId);
    if (!session) {
      sendJson(res, 404, { error: 'publish_session_not_found' });
      return true;
    }
    if (!filename) {
      sendJson(res, 400, { error: 'invalid_publish_filename' });
      return true;
    }

    const finalPath = path.join(session.dir, filename);
    const tempPath = finalPath + `.tmp-${process.pid}`;
    try {
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(tempPath, { flags: 'w' });
        req.pipe(out);
        req.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
      });
      fs.renameSync(tempPath, finalPath);
      sendJson(res, 200, { ok: true, session: sessionId, name: filename, size: fs.statSync(finalPath).size });
    } catch (err) {
      try { fs.rmSync(tempPath, { force: true }); } catch {}
      sendJson(res, 500, { error: 'publish_upload_failed', message: err.message });
    }
    return true;
  }

  if (pathname === '/api/publish/commit' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const sessionId = String(body.session || '');
      const session = publishSessions.get(sessionId);
      if (!session) {
        sendJson(res, 404, { error: 'publish_session_not_found' });
        return true;
      }

      const latestPath = path.join(session.dir, 'latest.yml');
      if (!fs.existsSync(latestPath)) {
        sendJson(res, 400, { error: 'latest_yml_missing' });
        return true;
      }
      const latestText = fs.readFileSync(latestPath, 'utf8');
      const manifestVersion = parseLatestVersion(latestText);
      if (manifestVersion !== session.version) {
        sendJson(res, 400, {
          error: 'version_mismatch',
          expected: session.version,
          manifestVersion
        });
        return true;
      }

      const primaryName = allowedPublishFilename(parseLatestPrimaryFile(latestText));
      if (!primaryName || !fs.existsSync(path.join(session.dir, primaryName))) {
        sendJson(res, 400, { error: 'installer_payload_missing', path: primaryName });
        return true;
      }

      const files = fs.readdirSync(session.dir);
      if (!files.some(name => /setup.*\.exe$/i.test(name) || /\.exe$/i.test(name) && /setup/i.test(name))) {
        sendJson(res, 400, { error: 'setup_exe_missing' });
        return true;
      }

      const releasePath = path.join(releaseDir, session.version);
      if (fs.existsSync(releasePath)) {
        if (!session.replace) {
          sendJson(res, 409, { error: 'release_exists', version: session.version });
          return true;
        }
        fs.rmSync(releasePath, { recursive: true, force: true });
      }

      fs.renameSync(session.dir, releasePath);
      publishSessions.delete(sessionId);

      const next = {
        schema: 2,
        mode: 'trusted-lan',
        version: session.version,
        publishedAt: new Date().toISOString()
      };
      writeCurrentRelease(next);
      retainRecentReleases(session.version);
      updateCurrentAndPush(next);
      log(`[publish-api] release ${session.version} from localhost`);

      sendJson(res, 200, {
        ok: true,
        version: session.version,
        publishedAt: next.publishedAt,
        connectedClients: clients.size
      });
    } catch (err) {
      sendJson(res, 500, { error: 'publish_commit_failed', message: err.message });
    }
    return true;
  }

  sendJson(res, 404, { error: 'publish_endpoint_not_found' });
  return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (await handleLocalPublish(req, res, url)) return;

    if (pathname === '/') {
      const body = Buffer.from(dashboardHtml());
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': body.length });
      res.end(body);
      return;
    }

    if (pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        serverId,
        serverName: config.serverName,
        currentVersion: currentRelease?.version || null,
        connectedClients: clients.size,
        localPublishApi: true,
        pluginPublishApi: true,
        pluginCount: pluginList().length,
        time: new Date().toISOString()
      });
      return;
    }

    if (pathname === '/api/plugins') {
      sendJson(res,200,{schema:1,serverId,plugins:pluginList()});
      return;
    }

    if (pathname === '/api/latest') {
      sendJson(res, 200, {
        schema: 1,
        serverId,
        version: currentRelease?.version || null,
        publishedAt: currentRelease?.publishedAt || null,
        releasePath: currentRelease?.version ? `/releases/${encodeURIComponent(currentRelease.version)}/` : null
      });
      return;
    }

    if (serveRelease(req, res, pathname)) return;
    if (servePlugin(req,res,pathname)) return;

    sendJson(res, 404, { error: 'not_found' });
  } catch (err) {
    log('[http]', err?.stack || err?.message || String(err));
    if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
    else res.end();
  }
});

const wss = new WebSocketServer({ server, path: '/push' });

function broadcast(payload) {
  const body = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(body); } catch {}
    }
  }
}

wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  ws.send(JSON.stringify({
    type: 'hello',
    schema: 1,
    serverId,
    serverName: config.serverName,
    currentVersion: currentRelease?.version || null,
    plugins: pluginList()
  }));
});

function updateCurrentAndPush(next) {
  const fp = fingerprintCurrent(next);
  if (fp === lastCurrentFingerprint) return;
  currentRelease = next;
  lastCurrentFingerprint = fp;
  if (currentRelease?.version) {
    log(`[push] release ${currentRelease.version}`);
    broadcast({
      type: 'release',
      schema: 1,
      serverId,
      version: currentRelease.version,
      publishedAt: currentRelease.publishedAt || new Date().toISOString()
    });
  }
}

setInterval(() => {
  updateCurrentAndPush(readCurrentRelease());
}, Math.max(500, Number(config.currentPollIntervalMs) || 1500)).unref?.();

setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of publishSessions) {
    if (session.createdAt >= cutoff) continue;
    publishSessions.delete(id);
    try { fs.rmSync(session.dir, { recursive: true, force: true }); } catch {}
  }
}, 5 * 60 * 1000).unref?.();

const udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
udp.bind(() => {
  try { udp.setMulticastTTL(1); } catch {}
});

function multicastAnnouncement() {
  const ips = lanIPv4Addresses();
  for (const ip of ips.length ? ips : ['127.0.0.1']) {
    const payload = Buffer.from(JSON.stringify({
      type: 'dkds-update-server',
      schema: 1,
      serverId,
      serverName: config.serverName,
      baseUrl: `http://${ip}:${config.port}`,
      wsUrl: `ws://${ip}:${config.port}/push`,
      currentVersion: currentRelease?.version || null
    }));
    udp.send(payload, Number(config.multicastPort), config.multicastGroup, () => {});
  }
}
setInterval(multicastAnnouncement, Math.max(1000, Number(config.announceIntervalMs) || 3000)).unref?.();

server.listen(Number(config.port), config.host || '0.0.0.0', () => {
  log('============================================================');
  log('DK Data Studio - LAN Update Server');
  log('============================================================');
  log(`Server ID : ${serverId}`);
  log(`HTTP port : ${config.port}`);
  log(`Multicast : ${config.multicastGroup}:${config.multicastPort}`);
  log(`Storage   : ${storageDir}`);
  log(`Current   : ${currentRelease?.version || '(none)'}`);
  log('Local publish API: http://127.0.0.1:' + config.port + '/api/publish/*');
  log('Plugin publish API: http://127.0.0.1:' + config.port + '/api/plugins/publish');
  for (const ip of lanIPv4Addresses()) log(`Dashboard : http://${ip}:${config.port}`);
  log('Publish local source build with: DKDS.cmd publish-update');
  log('Publish one plugin with: DKDS.cmd plugin-publish-lan');
  log('Publish GitHub Artifact by double-clicking: 局域网发布.cmd');
  log('============================================================');
  multicastAnnouncement();
});

process.on('SIGINT', () => {
  try { udp.close(); } catch {}
  try { wss.close(); } catch {}
  server.close(() => process.exit(0));
});

process.on('uncaughtException', err => {
  log('[uncaughtException]', err?.stack || err?.message || String(err));
});

process.on('unhandledRejection', err => {
  log('[unhandledRejection]', err?.stack || err?.message || String(err));
});
