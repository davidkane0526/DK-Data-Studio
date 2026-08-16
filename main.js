const { app, BrowserWindow, dialog, ipcMain, clipboard, Menu } = require('electron');
const { LanUpdateClient } = require('./update-client');
const { LanWebServer } = require('./lan-web-server');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

let lanUpdater = null;
let lanWebServer = null;

const PACKAGED_TRIAL_DAYS = 30;
const PACKAGED_EXPIRY_MAX_TIMER_MS = 12 * 60 * 60 * 1000; // reschedule at most every 12 h

function readPackagedBuildInfo() {
  const infoPath = path.join(__dirname, 'build-info.json');
  try {
    const raw = fs.readFileSync(infoPath, 'utf8');
    const info = JSON.parse(raw);

    if (
      info?.buildType !== 'packaged-trial' ||
      Number(info?.durationDays) !== PACKAGED_TRIAL_DAYS ||
      !Number.isFinite(Number(info?.builtAtMs)) ||
      !Number.isFinite(Number(info?.expiresAtMs)) ||
      Number(info.expiresAtMs) <= Number(info.builtAtMs)
    ) {
      return null;
    }
    return info;
  } catch {
    return null;
  }
}

function packagedBuildIsExpired(info, nowMs = Date.now()) {
  return !info || nowMs >= Number(info.expiresAtMs);
}

function exitImmediately() {
  // Deliberately no dialog/message: packaged build should terminate directly.
  // Development mode never reaches this path because app.isPackaged is false.
  process.exit(0);
}

function enforcePackagedExpiry() {
  if (!app.isPackaged) return;

  const info = readPackagedBuildInfo();

  // Fail closed for packaged builds: if build metadata is missing/corrupted,
  // terminate instead of accidentally creating a non-expiring package.
  if (packagedBuildIsExpired(info)) {
    exitImmediately();
    return;
  }

  // Also enforce expiry if the application remains open across the deadline.
  // Node timers cannot safely hold an arbitrary 30-day delay on every runtime,
  // so schedule in bounded chunks and use the exact remaining time for the
  // final chunk.
  const scheduleNextExpiryCheck = () => {
    const remainingMs = Number(info.expiresAtMs) - Date.now();
    if (remainingMs <= 0) {
      exitImmediately();
      return;
    }

    const delayMs = Math.min(remainingMs, PACKAGED_EXPIRY_MAX_TIMER_MS);
    const timer = setTimeout(scheduleNextExpiryCheck, delayMs);
    if (typeof timer.unref === 'function') timer.unref();
  };

  scheduleNextExpiryCheck();
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 1040,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#f5f7fb',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  enforcePackagedExpiry();
  Menu.setApplicationMenu(null);

  ipcMain.handle('update:getStatus', async () => lanUpdater?.getStatus() || null);
  ipcMain.handle('update:getSettings', async () => lanUpdater?.getSettings() || null);
  ipcMain.handle('update:setSettings', async (_event, settings) => lanUpdater?.setSettings(settings) || null);
  ipcMain.handle('update:checkNow', async () => lanUpdater?.checkNow() || null);
  ipcMain.handle('update:downloadNow', async () => lanUpdater?.downloadNow() || false);
  ipcMain.handle('update:installNow', async () => lanUpdater?.installNow() || false);

  function detectBomEncoding(buffer) {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return 'utf-8';
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return 'utf-16le';
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return 'utf-16be';
    return null;
  }

  function decodeTextBuffer(buffer, requestedEncoding = 'auto') {
    const req = String(requestedEncoding || 'auto').toLowerCase();
    const aliases = {
      auto: 'auto',
      utf8: 'utf-8',
      'utf-8-bom': 'utf-8',
      gbk: 'gb18030',
      gb2312: 'gb18030',
      sjis: 'shift_jis',
      'shift-jis': 'shift_jis',
      latin1: 'windows-1252',
      'iso-8859-1': 'windows-1252'
    };
    let enc = aliases[req] || req;

    if (enc === 'auto') {
      enc = detectBomEncoding(buffer) || 'utf-8';
      if (enc === 'utf-8') {
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
          return { text: text.replace(/^\uFEFF/, ''), encoding: 'utf-8' };
        } catch {
          // Chinese laboratory instruments commonly export ANSI/GBK text.
          enc = 'gb18030';
        }
      }
    }

    try {
      let text = new TextDecoder(enc, { fatal: false }).decode(buffer);
      text = text.replace(/^\uFEFF/, '');
      return { text, encoding: enc };
    } catch {
      return { text: buffer.toString('utf8').replace(/^\uFEFF/, ''), encoding: 'utf-8' };
    }
  }

  ipcMain.handle('lanweb:getStatus', async () => lanWebServer?.getStatus() || null);
  ipcMain.handle('lanweb:makeQr', async (_event, payload) => {
    const text=String(payload?.text||'').trim();
    if(!text) return null;
    if(text.length>2048) throw new Error('QR content too long.');
    return QRCode.toDataURL(text,{
      errorCorrectionLevel:'M',
      type:'image/png',
      width:320,
      margin:2,
      color:{dark:'#172033',light:'#ffffff'}
    });
  });

  ipcMain.handle('lanweb:getSettings', async () => lanWebServer?.getSettings() || null);
  ipcMain.handle('lanweb:setSettings', async (_event, settings) => lanWebServer?.setSettings(settings) || null);
  ipcMain.handle('lanweb:start', async () => lanWebServer?.start() || null);
  ipcMain.handle('lanweb:stop', async () => lanWebServer?.stop() || null);
  ipcMain.handle('lanweb:regenerateKey', async () => lanWebServer?.regenerateKey() || null);

  ipcMain.handle('files:openData', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 I-V / 多列数据文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Data / Text', extensions: ['csv', 'txt', 'dat', 'tsv', 'asc', 'xy', 'iv', 'prn', 'out', 'log'] },
        { name: 'CSV', extensions: ['csv'] },
        { name: 'Text / DAT', extensions: ['txt', 'dat', 'tsv', 'asc', 'xy', 'iv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths.map(filePath => {
      const stat = fs.statSync(filePath);
      return { path: filePath, name: path.basename(filePath), size: stat.size };
    });
  });

  ipcMain.handle('files:readDataText', async (_event, payload) => {
    const filePath = String(payload?.path || '');
    if (!filePath || !fs.existsSync(filePath)) throw new Error('Data file not found.');
    const buffer = fs.readFileSync(filePath);
    const decoded = decodeTextBuffer(buffer, payload?.encoding || 'auto');
    return {
      path: filePath,
      name: path.basename(filePath),
      size: buffer.length,
      text: decoded.text,
      encoding: decoded.encoding
    };
  });

  // Backward-compatible endpoint for older renderer/project code paths.
  ipcMain.handle('files:openCsv', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 I-V CSV 数据',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Data / Text', extensions: ['csv', 'txt', 'dat', 'tsv', 'asc', 'xy', 'iv', 'prn', 'out', 'log'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (result.canceled) return [];
    return result.filePaths.map(filePath => {
      const buffer = fs.readFileSync(filePath);
      const decoded = decodeTextBuffer(buffer, 'auto');
      return { path: filePath, name: path.basename(filePath), text: decoded.text };
    });
  });

  ipcMain.handle('clipboard:writeText', async (_event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  ipcMain.handle('files:saveText', async (_event, payload) => {
    const { defaultName, content, filters } = payload;
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: filters || [{ name: 'Text', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, content, 'utf8');
    return true;
  });

  ipcMain.handle('files:saveBase64', async (_event, payload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.defaultName || 'graphene_resonance.png',
      filters: payload.filters || [{ name: 'PNG Image', extensions: ['png'] }]
    });
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, Buffer.from(payload.base64, 'base64'));
    return result.filePath;
  });

  ipcMain.handle('files:saveProject', async (_event, payload) => {
    let filePath = payload.path || null;
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        defaultPath: payload.defaultName || 'graphene_resonance_project.grs.json',
        filters: [{ name: 'Graphene Resonance Project', extensions: ['grs.json', 'json'] }]
      });
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    fs.writeFileSync(filePath, JSON.stringify(payload.project, null, 2), 'utf8');
    return filePath;
  });

  ipcMain.handle('files:openProject', async () => {
    const result = await dialog.showOpenDialog({
      title: '打开 Graphene Resonance Studio 项目',
      properties: ['openFile'],
      filters: [{ name: 'Graphene Resonance Project', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    return {
      path: filePath,
      project: JSON.parse(fs.readFileSync(filePath, 'utf8'))
    };
  });

  lanUpdater = new LanUpdateClient({ app, BrowserWindow });
  lanUpdater.start();

  lanWebServer = new LanWebServer({ app, BrowserWindow });
  if (lanWebServer.getSettings().enabled) {
    lanWebServer.start(false).catch(err => console.error('LAN web server:', err));
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { try { lanUpdater?.stop(); } catch {} try { lanWebServer?.stop(false); } catch {} });
