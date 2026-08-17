const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { EventEmitter } = require('events');

function randomPairKey() {
  return String(crypto.randomInt(1000, 10000));
}

function lanIPv4Addresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const item of list || []) {
      if (item.family === 'IPv4' && !item.internal) out.push(item.address);
    }
  }
  return [...new Set(out)];
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    '.html':'text/html; charset=utf-8',
    '.js':'application/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.json':'application/json; charset=utf-8',
    '.svg':'image/svg+xml',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp',
    '.ico':'image/x-icon',
    '.map':'application/json; charset=utf-8'
  }[ext] || 'application/octet-stream';
}

function readBody(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('request too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

class LanWebServer extends EventEmitter {
  constructor({ app, BrowserWindow }) {
    super();
    this.app = app;
    this.BrowserWindow = BrowserWindow;
    this.root = app.getAppPath();
    this.settingsPath = path.join(app.getPath('userData'), 'lan-web-settings.json');
    this.settings = this.readSettings();
    this.server = null;
    this.pairKey = randomPairKey();
    this.tokens = new Set();
    this.lastError = '';
  }

  readSettings() {
    let saved = {};
    try { saved = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8')); } catch {}
    return {
      enabled: !!saved.enabled,
      noKey: !!saved.noKey,
      port: Math.max(1024, Math.min(65535, Number(saved.port) || 45910))
    };
  }

  persist() {
    fs.mkdirSync(path.dirname(this.settingsPath), { recursive: true });
    fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2) + '\n', 'utf8');
  }

  getStatus() {
    const port = Number(this.settings.port) || 45910;
    return {
      running: !!this.server,
      enabled: !!this.settings.enabled,
      noKey: !!this.settings.noKey,
      key: this.settings.noKey ? '' : this.pairKey,
      port,
      urls: this.server ? lanIPv4Addresses().map(ip => `http://${ip}:${port}/`) : [],
      localhostUrl: `http://127.0.0.1:${port}/`,
      pairedClients: this.tokens.size,
      error: this.lastError
    };
  }

  getSettings() {
    return { ...this.settings };
  }

  broadcast() {
    const status = this.getStatus();
    for (const win of this.BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('lanweb:status', status);
    }
    this.emit('status', status);
  }

  async setSettings(next = {}) {
    const wasRunning = !!this.server;
    const oldPort = this.settings.port;
    if (next.enabled !== undefined) this.settings.enabled = !!next.enabled;
    if (next.noKey !== undefined) this.settings.noKey = !!next.noKey;
    const port = Number(next.port);
    if (Number.isFinite(port)) this.settings.port = Math.max(1024, Math.min(65535, Math.round(port)));
    this.persist();

    if (next.noKey !== undefined) this.tokens.clear();

    if (this.settings.enabled) {
      if (wasRunning && oldPort !== this.settings.port) {
        await this.stop(false);
        await this.start(false);
      } else if (!wasRunning) {
        await this.start(false);
      }
    } else if (wasRunning) {
      await this.stop(false);
    }
    this.broadcast();
    return this.getStatus();
  }

  regenerateKey() {
    this.pairKey = randomPairKey();
    this.tokens.clear();
    this.broadcast();
    return this.getStatus();
  }

  async start(persistEnabled = true) {
    if (this.server) return this.getStatus();
    if (!this.settings.noKey) {
      this.pairKey = randomPairKey();
      this.tokens.clear();
    }
    if (persistEnabled) {
      this.settings.enabled = true;
      this.persist();
    }
    this.lastError = '';

    const server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(err => {
        try {
          res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8', 'Cache-Control':'no-store' });
          res.end(`LAN web server error: ${err.message}`);
        } catch {}
      });
    });

    await new Promise((resolve, reject) => {
      const onError = err => {
        server.removeListener('listening', onListening);
        reject(err);
      };
      const onListening = () => {
        server.removeListener('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(this.settings.port, '0.0.0.0');
    }).catch(err => {
      this.lastError = err.message;
      this.settings.enabled = false;
      this.persist();
      throw err;
    });

    this.server = server;
    this.broadcast();
    return this.getStatus();
  }

  async stop(persistEnabled = true) {
    if (persistEnabled) {
      this.settings.enabled = false;
      this.persist();
    }
    const server = this.server;
    this.server = null;
    this.tokens.clear();
    if (server) {
      await new Promise(resolve => server.close(() => resolve()));
    }
    this.broadcast();
    return this.getStatus();
  }

  isAuthorized(req) {
    if (this.settings.noKey) return true;
    const cookie = String(req.headers.cookie || '');
    const m = cookie.match(/(?:^|;\s*)dkds_pair=([a-f0-9]+)/i);
    return !!(m && this.tokens.has(m[1]));
  }

  pairPage(errorText = '') {
    const noKey = this.settings.noKey;
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DK Data Studio · LAN</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;background:#f4f7fb;color:#1f2937}
.wrap{min-height:100vh;display:grid;place-items:center;padding:24px}
.card{width:min(420px,92vw);background:#fff;border:1px solid #dbe3ef;border-radius:16px;box-shadow:0 20px 60px rgba(15,23,42,.12);padding:26px}
h1{font-size:20px;margin:0 0 7px}.sub{font-size:12px;color:#667085;line-height:1.6;margin-bottom:18px}
.key{width:100%;box-sizing:border-box;height:52px;text-align:center;font-size:24px;letter-spacing:8px;border:1px solid #bfcbe0;border-radius:9px;outline:none}
.key:focus{border-color:#4772e6;box-shadow:0 0 0 3px rgba(71,114,230,.13)}
button{margin-top:10px;width:100%;height:42px;border:0;border-radius:8px;background:#315efb;color:white;font-weight:700;cursor:pointer}
.err{min-height:20px;margin-top:8px;color:#b42318;font-size:11px}.foot{font-size:10px;color:#98a2b3;margin-top:16px;line-height:1.5}
</style></head>
<body><div class="wrap"><div class="card">
<h1>DK Data Studio</h1>
<div class="sub">${noKey ? '桌面端已关闭配对 Key，点击进入网页版。' : '请输入桌面端“局域网网页版”面板显示的 4 位配对 Key。'}</div>
${noKey ? '<button id="enter">进入网页版</button>' : '<input id="key" class="key" inputmode="numeric" maxlength="4" autocomplete="one-time-code" autofocus><button id="enter">配对并进入</button>'}
<div id="err" class="err">${errorText}</div>
<div class="foot">该页面只在当前局域网中提供。分析、寻峰、TER、导入和导出均在浏览器本地运行。</div>
</div></div>
<script>
async function go(){
  ${noKey ? "location.href='/app/';return;" : `
  const key=document.getElementById('key').value.trim();
  const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
  if(r.ok){location.href='/app/';return;}
  const j=await r.json().catch(()=>({error:'配对失败'}));document.getElementById('err').textContent=j.error||'配对失败';`}
}
document.getElementById('enter').onclick=go;
document.getElementById('key')?.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
</script></body></html>`;
  }

  safeStaticPath(urlPath) {
    const clean = decodeURIComponent(urlPath.split('?')[0]);
    if (clean === '/app' || clean === '/app/') return path.join(this.root, 'src', 'index.html');
    if (clean.startsWith('/app/')) {
      const rel = clean.slice('/app/'.length);
      const normalized = path.normalize(rel).replace(/^([.][.][/\\])+/, '');
      const base = path.join(this.root, 'src');
      const target = path.join(base, normalized);
      if (!target.startsWith(base)) return null;
      return target;
    }
    if (clean.startsWith('/node_modules/')) {
      const rel = clean.slice('/node_modules/'.length);
      const normalized = path.normalize(rel).replace(/^([.][.][/\\])+/, '');
      const base = path.join(this.root, 'node_modules');
      const target = path.join(base, normalized);
      if (!target.startsWith(base)) return null;
      return target;
    }
    return null;
  }

  async handleRequest(req, res) {
    const u = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && u.pathname === '/health') {
      res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify({ ok:true, app:'DK Data Studio', version:this.app.getVersion(), noKey:this.settings.noKey }));
      return;
    }

    if (req.method === 'POST' && u.pathname === '/api/pair') {
      if (this.settings.noKey) {
        res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok:true }));
        return;
      }
      let payload = {};
      try { payload = JSON.parse((await readBody(req)).toString('utf8')); } catch {}
      if (String(payload.key || '') !== this.pairKey) {
        res.writeHead(403, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
        res.end(JSON.stringify({ ok:false, error:'配对 Key 不正确' }));
        return;
      }
      const token = crypto.randomBytes(24).toString('hex');
      this.tokens.add(token);
      res.writeHead(200, {
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store',
        'Set-Cookie':`dkds_pair=${token}; HttpOnly; SameSite=Lax; Path=/`
      });
      res.end(JSON.stringify({ ok:true }));
      this.broadcast();
      return;
    }

    if (req.method === 'POST' && u.pathname === '/api/logout') {
      const cookie = String(req.headers.cookie || '');
      const m = cookie.match(/(?:^|;\s*)dkds_pair=([a-f0-9]+)/i);
      if (m) this.tokens.delete(m[1]);
      res.writeHead(200, {
        'Content-Type':'application/json; charset=utf-8',
        'Set-Cookie':'dkds_pair=; Max-Age=0; Path=/'
      });
      res.end(JSON.stringify({ ok:true }));
      this.broadcast();
      return;
    }

    if (u.pathname === '/' || u.pathname === '/pair') {
      if (this.isAuthorized(req)) {
        res.writeHead(302, { Location:'/app/' });
        res.end();
        return;
      }

      // QR share links may contain the current four-digit key. A matching
      // key establishes the same HttpOnly pairing cookie as the manual form,
      // so scanning the QR can enter the web app directly.
      const qrKey=String(u.searchParams.get('key')||'');
      if (!this.settings.noKey && qrKey && qrKey === this.pairKey) {
        const token = crypto.randomBytes(24).toString('hex');
        this.tokens.add(token);
        res.writeHead(302, {
          Location:'/app/',
          'Cache-Control':'no-store',
          'Set-Cookie':`dkds_pair=${token}; HttpOnly; SameSite=Lax; Path=/`
        });
        res.end();
        this.broadcast();
        return;
      }

      if (this.settings.noKey) {
        res.writeHead(302, { Location:'/app/' });
        res.end();
        return;
      }

      res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(this.pairPage());
      return;
    }

    if (!this.isAuthorized(req)) {
      res.writeHead(302, { Location:'/' });
      res.end();
      return;
    }

    const filePath = this.safeStaticPath(u.pathname);
    if (!filePath) {
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    let stat;
    try { stat = fs.statSync(filePath); } catch {
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    if (!stat.isFile()) {
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeFor(filePath),
      'Content-Length': stat.size,
      'Cache-Control':'no-store',
      'X-Content-Type-Options':'nosniff'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

module.exports = { LanWebServer, randomPairKey, lanIPv4Addresses };
