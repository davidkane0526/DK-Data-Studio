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
const currentPath = path.join(storageDir, 'current.json');

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

const serverId = crypto
  .createHash('sha256')
  .update(`${os.hostname()}|${ROOT}`)
  .digest('hex')
  .slice(0, 16);

const clients = new Set();
let currentRelease = readCurrentRelease();
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
</div>
<div class="box">
<b>发布方式</b><br><br>
在应用工程目录运行 <code>DKDS_GUI.cmd</code>，在“局域网更新”页执行“构建 Windows”与“发布现有构建”。
发布脚本会复制 electron-builder 生成的更新文件；服务端检测到 <code>current.json</code> 改变后立即向所有客户端推送。
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

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

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
      time: new Date().toISOString()
    });
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

  sendJson(res, 404, { error: 'not_found' });
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
    currentVersion: currentRelease?.version || null
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
  for (const ip of lanIPv4Addresses()) log(`Dashboard : http://${ip}:${config.port}`);
  log('Publish a build with: DKDS.cmd publish-update');
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
