const { app, BrowserWindow, dialog, ipcMain, clipboard, Menu, shell } = require('electron');
const { LanUpdateClient } = require('./update-client');
const { LanWebServer } = require('./lan-web-server');
const { resolvePluginWindow, listPluginWindows } = require('./plugin-window-manager');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normalizePluginPackage, pluginPackageFileName, validPluginId } = require('./plugin-package');

const APP_NAME = 'DK Data Studio';
const APP_ID = 'com.dk.datastudio';

// Keep development, installed and portable Windows identities consistent.
app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

let lanUpdater = null;
let lanWebServer = null;
const auxiliaryWindows = new Map();
const auxiliaryBootstrap = new Map();
const auxiliaryReady = new Set();
const auxiliaryPendingShow = new Set();
const forcedAuxiliaryClose = new WeakSet();
let appQuitting = false;

function externalPluginDirectory() {
  return path.join(app.getPath('userData'), 'plugins');
}

function ensureExternalPluginDirectory() {
  const dir = externalPluginDirectory();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function builtinPluginIds() {
  const base = path.join(app.getAppPath(), 'src', 'plugins');
  const ids = new Set();
  try {
    for (const name of fs.readdirSync(base)) {
      if (name.startsWith('_')) continue;
      const manifestPath = path.join(base, name, 'plugin.json');
      if (!fs.existsSync(manifestPath)) continue;
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (manifest?.id) ids.add(String(manifest.id));
      } catch {}
    }
  } catch {}
  return ids;
}

function readInstalledExternalPlugins() {
  const dir = ensureExternalPluginDirectory();
  const packages = [];
  const errors = [];
  for (const name of fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.dkplugin')).sort()) {
    const filePath = path.join(dir, name);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const pkg = normalizePluginPackage(JSON.parse(raw), { allowBuiltinId:false });
      if (builtinPluginIds().has(pkg.manifest.id)) throw new Error(`Plugin id conflicts with built-in plugin: ${pkg.manifest.id}`);
      packages.push({ ...pkg, installedPath:filePath });
    } catch (err) {
      errors.push({ file:name, error:err?.message || String(err) });
    }
  }
  return { packages, errors, directory:dir };
}

function installedExternalPluginPackages() {
  return readInstalledExternalPlugins().packages || [];
}

function resolveConfiguredPluginWindow(activityId) {
  return resolvePluginWindow(app.getAppPath(), activityId, installedExternalPluginPackages());
}

function listConfiguredPluginWindows() {
  return listPluginWindows(app.getAppPath(), installedExternalPluginPackages());
}

const PACKAGED_TRIAL_DAYS = 30;
const PACKAGED_EXPIRY_MAX_TIMER_MS = 12 * 60 * 60 * 1000;

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
    ) return null;
    return info;
  } catch {
    return null;
  }
}

function packagedBuildIsExpired(info, nowMs = Date.now()) {
  return !info || nowMs >= Number(info.expiresAtMs);
}

function exitImmediately() {
  process.exit(0);
}

function enforcePackagedExpiry() {
  if (!app.isPackaged) return;
  const info = readPackagedBuildInfo();
  if (packagedBuildIsExpired(info)) {
    exitImmediately();
    return;
  }
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

function commonWindowPreferences() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 1040,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#f5f7fb',
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'dkds-icon.png'),
    autoHideMenuBar: true,
    webPreferences: commonWindowPreferences()
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  return win;
}

function auxiliaryWindowKey(ownerWebContentsId, projectTabId, activityId) {
  return `${ownerWebContentsId}::${projectTabId || 'project'}::${activityId}`;
}

function projectSnapshotDigest(project) {
  try {
    return crypto.createHash('sha1').update(JSON.stringify(project || null)).digest('hex');
  } catch {
    return '';
  }
}

function makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow) {
  const project = payload.project || null;
  return {
    activityId:String(payload.activityId || '').trim(),
    projectTabId:String(payload.projectTabId || '').trim(),
    project,
    projectDigest:projectSnapshotDigest(project),
    projectPath:payload.projectPath || null,
    title:payload.title || '',
    ownerWebContentsId,
    prewarm:payload.prewarm === true,
    pluginWindow:pluginWindow ? {...pluginWindow} : null
  };
}

function hideDedicatedAuxiliaryWindow(win) {
  if (!win || win.isDestroyed()) return false;
  try { win.webContents.send('windows:activityWillHide'); } catch {}
  win.hide();
  return true;
}

function closeAuxiliaryWindowForReal(win) {
  if (!win || win.isDestroyed()) return;
  forcedAuxiliaryClose.add(win);
  win.close();
}

function markAuxiliaryWindowReady(win) {
  if(!win||win.isDestroyed())return;
  const id=win.webContents.id;
  auxiliaryReady.add(id);
  if(!auxiliaryPendingShow.has(id))return;
  auxiliaryPendingShow.delete(id);
  try { win.webContents.send('windows:activityWillShow'); } catch {}
  win.show();
  win.focus();
}

function createOrFocusAuxiliaryWindow(ownerWindow, payload = {}) {
  const activityId = String(payload.activityId || '').trim();
  const projectTabId = String(payload.projectTabId || '').trim();
  if (!activityId || !projectTabId) throw new Error('Missing auxiliary activity/project id.');

  const ownerWebContentsId = ownerWindow?.webContents?.id;
  if (!ownerWebContentsId) throw new Error('Main window is no longer available.');

  const pluginWindow = resolveConfiguredPluginWindow(activityId);
  const key = auxiliaryWindowKey(ownerWebContentsId, projectTabId, activityId);
  let previous = auxiliaryWindows.get(key);
  if (previous && !previous.isDestroyed()) {
    const previousSpec=auxiliaryBootstrap.get(previous.webContents.id)?.pluginWindow||null;
    const definitionChanged=!!pluginWindow&&!!previousSpec&&(
      previousSpec.pluginId!==pluginWindow.pluginId
      ||previousSpec.source!==pluginWindow.source
      ||previousSpec.revision!==pluginWindow.revision
    );
    if(definitionChanged){
      auxiliaryWindows.delete(key);
      closeAuxiliaryWindowForReal(previous);
      previous=null;
    }
  }
  if (previous && !previous.isDestroyed()) {
    const nextBootstrap = makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow);
    const cachedBootstrap = auxiliaryBootstrap.get(previous.webContents.id) || null;
    const projectChanged = !cachedBootstrap || cachedBootstrap.projectDigest !== nextBootstrap.projectDigest
      || cachedBootstrap.projectPath !== nextBootstrap.projectPath
      || cachedBootstrap.prewarm !== nextBootstrap.prewarm;
    auxiliaryBootstrap.set(previous.webContents.id, nextBootstrap);

    // A cached plugin renderer keeps its DOM, Plotly state and in-memory results.
    // Only replace its project snapshot when the main project actually changed.
    if (projectChanged) previous.webContents.send('windows:activityBootstrapChanged');

    if (payload.prewarm === true) {
      return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:auxiliaryReady.has(previous.webContents.id) };
    }

    if (previous.isMinimized()) previous.restore();
    if (pluginWindow && !auxiliaryReady.has(previous.webContents.id)) {
      auxiliaryPendingShow.add(previous.webContents.id);
      return { reused:true, dedicated:true, synchronized:projectChanged, warming:true };
    }

    try { previous.webContents.send('windows:activityWillShow'); } catch {}
    previous.show();
    previous.focus();
    return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:true };
  }

  const win = new BrowserWindow({
    show: pluginWindow ? false : payload.prewarm !== true,
    width: pluginWindow?.width || 1480,
    height: pluginWindow?.height || 940,
    minWidth: pluginWindow?.minWidth || 920,
    minHeight: pluginWindow?.minHeight || 650,
    backgroundColor: '#f5f7fb',
    icon: path.join(__dirname, 'assets', 'dkds-icon.png'),
    autoHideMenuBar: true,
    title: `DK Data Studio · ${pluginWindow?.title || payload.title || activityId}`,
    webPreferences: commonWindowPreferences()
  });
  win.setMenuBarVisibility(false);
  auxiliaryWindows.set(key, win);
  const auxiliaryWebContentsId = win.webContents.id;
  auxiliaryBootstrap.set(
    auxiliaryWebContentsId,
    makeAuxiliaryBootstrap(ownerWebContentsId, payload, pluginWindow)
  );
  if (pluginWindow?.reuse !== false) {
    win.on('close', event => {
      if (appQuitting || forcedAuxiliaryClose.has(win)) return;
      event.preventDefault();
      hideDedicatedAuxiliaryWindow(win);
    });
  }
  win.on('closed', () => {
    auxiliaryWindows.delete(key);
    auxiliaryBootstrap.delete(auxiliaryWebContentsId);
    auxiliaryReady.delete(auxiliaryWebContentsId);
    auxiliaryPendingShow.delete(auxiliaryWebContentsId);
  });
  ownerWindow.once('closed', () => closeAuxiliaryWindowForReal(win));

  if (pluginWindow?.mode !== 'compatibility' && pluginWindow) {
    if (payload.prewarm !== true) auxiliaryPendingShow.add(auxiliaryWebContentsId);
    win.loadFile(path.join(__dirname, 'src', 'plugin-window', 'index.html'));
  } else {
    // Compatibility TOPs still use the full renderer because their UI depends
    // on host-owned services. They nevertheless share the same prewarm/hide/
    // reuse lifecycle as dedicated plugin renderers.
    if(payload.prewarm !== true)auxiliaryPendingShow.add(auxiliaryWebContentsId);
    win.loadFile(path.join(__dirname, 'src', 'index.html'), { query: { aux: activityId } });
  }
  return { reused:false, dedicated:!!pluginWindow, warming:!!pluginWindow, prewarmed:payload.prewarm === true };
}

app.whenReady().then(() => {
  enforcePackagedExpiry();
  Menu.setApplicationMenu(null);

  ipcMain.handle('windows:openActivity', async (event, payload) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner) throw new Error('Unable to resolve the main application window.');
    return createOrFocusAuxiliaryWindow(owner, payload || {});
  });
  ipcMain.handle('windows:listPluginWindows', async () => listConfiguredPluginWindows().map(spec => ({
    pluginId:spec.pluginId,
    mode:spec.mode||'dedicated',
    version:spec.version,
    revision:spec.revision,
    activity:spec.activity,
    title:spec.title,
    prewarm:spec.prewarm,
    reuse:spec.reuse,
    persistence:spec.persistence
  })));
  ipcMain.handle('windows:prewarmActivity', async (event, payload) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner) throw new Error('Unable to resolve the main application window.');
    const activityId = String(payload?.activityId || '').trim();
    const spec = resolveConfiguredPluginWindow(activityId);
    if (!spec) return { skipped:true, reason:'not-dedicated' };
    if (spec.prewarm === false) return { skipped:true, reason:'prewarm-disabled' };
    return createOrFocusAuxiliaryWindow(owner, { ...(payload || {}), prewarm:true });
  });
  ipcMain.handle('windows:getActivityBootstrap', async event => auxiliaryBootstrap.get(event.sender.id) || null);
  ipcMain.handle('windows:disposeProjectActivities', async (event, projectTabId) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const ownerId = owner?.webContents?.id;
    const targetProjectId = String(projectTabId || '').trim();
    if (!ownerId || !targetProjectId) return 0;
    const doomed = [];
    for (const win of auxiliaryWindows.values()) {
      if (!win || win.isDestroyed()) continue;
      const row = auxiliaryBootstrap.get(win.webContents.id);
      if (row?.ownerWebContentsId === ownerId && row?.projectTabId === targetProjectId) doomed.push(win);
    }
    for (const win of doomed) closeAuxiliaryWindowForReal(win);
    return doomed.length;
  });
  ipcMain.handle('windows:syncPluginActivities', async (event, activityIds) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const ownerId = owner?.webContents?.id;
    if (!ownerId) return 0;
    const allowed = new Set((Array.isArray(activityIds) ? activityIds : []).map(v => String(v || '').trim()).filter(Boolean));
    const doomed = [];
    for (const win of auxiliaryWindows.values()) {
      if (!win || win.isDestroyed()) continue;
      const row = auxiliaryBootstrap.get(win.webContents.id);
      if (row?.ownerWebContentsId !== ownerId || !row?.pluginWindow) continue;
      if (!allowed.has(String(row.activityId || ''))) doomed.push(win);
    }
    for (const win of doomed) closeAuxiliaryWindowForReal(win);
    return doomed.length;
  });
  ipcMain.on('windows:activityReady', event => {
    markAuxiliaryWindowReady(BrowserWindow.fromWebContents(event.sender));
  });
  ipcMain.handle('windows:closeCurrent', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    const bootstrap = auxiliaryBootstrap.get(event.sender.id);
    if (bootstrap?.pluginWindow?.reuse !== false) return hideDedicatedAuxiliaryWindow(win);
    win.close();
    return true;
  });
  ipcMain.on('windows:activityProjectSnapshot', (event, payload) => {
    const bootstrap = auxiliaryBootstrap.get(event.sender.id);
    if (!bootstrap) return;
    if (payload?.project && typeof payload.project === 'object') {
      bootstrap.project = payload.project;
      bootstrap.projectDigest = projectSnapshotDigest(payload.project);
    }
    const owner = BrowserWindow.getAllWindows().find(w => w.webContents?.id === bootstrap.ownerWebContentsId);
    if (!owner || owner.isDestroyed()) return;
    owner.webContents.send('windows:activityProjectSnapshot', {
      projectTabId: bootstrap.projectTabId,
      activityId: bootstrap.activityId,
      pluginId: bootstrap.pluginWindow?.pluginId || '',
      persistence: bootstrap.pluginWindow?.persistence || 'project',
      project: payload?.project || null,
      pluginState: payload?.pluginState ?? null,
      artifactDelta: payload?.artifactDelta || null,
      final: payload?.final !== false
    });
  });

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
      auto: 'auto', utf8: 'utf-8', 'utf-8-bom': 'utf-8', gbk: 'gb18030',
      gb2312: 'gb18030', sjis: 'shift_jis', 'shift-jis': 'shift_jis',
      latin1: 'windows-1252', 'iso-8859-1': 'windows-1252'
    };
    let enc = aliases[req] || req;
    if (enc === 'auto') {
      enc = detectBomEncoding(buffer) || 'utf-8';
      if (enc === 'utf-8') {
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
          return { text: text.replace(/^\uFEFF/, ''), encoding: 'utf-8' };
        } catch {
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

  ipcMain.handle('plugins:listExternal', async () => readInstalledExternalPlugins());
  ipcMain.handle('plugins:installPackage', async () => {
    const result = await dialog.showOpenDialog({
      title:'安装 DK Data Studio 插件', properties:['openFile'],
      filters:[{ name:'DK Data Studio Plugin', extensions:['dkplugin'] },{ name:'JSON', extensions:['json'] }]
    });
    if(result.canceled || !result.filePaths.length)return null;
    const sourcePath=result.filePaths[0];
    const stat=fs.statSync(sourcePath);
    if(stat.size>10*1024*1024)throw new Error('插件包超过 10 MB 限制。');
    const pkg=normalizePluginPackage(JSON.parse(fs.readFileSync(sourcePath,'utf8')),{allowBuiltinId:false});
    if(builtinPluginIds().has(pkg.manifest.id))throw new Error(`不能覆盖内置插件：${pkg.manifest.id}`);
    const dir=ensureExternalPluginDirectory();
    const target=path.join(dir,pluginPackageFileName(pkg.manifest.id));
    const exists=fs.existsSync(target);
    let previousPackage=null;
    if(exists){
      try{previousPackage=normalizePluginPackage(JSON.parse(fs.readFileSync(target,'utf8')),{allowBuiltinId:false});}
      catch(err){throw new Error(`已安装插件包损坏，无法安全更新：${err.message}`);}
    }
    const confirm=await dialog.showMessageBox({
      type:'warning',buttons:['取消',exists?'更新插件':'安装插件'],defaultId:0,cancelId:0,
      title:exists?'更新已安装插件':'安装本地插件',message:`${pkg.manifest.name} v${pkg.manifest.version}`,
      detail:(exists?`将替换已安装的 ${pkg.manifest.id}。\n\n`:'')
        +'本地插件包含可执行 JavaScript，可访问当前应用提供的插件 API 和工作区数据。仅安装你信任或已审查源码的插件包。工程中的插件数据不会因安装/更新被删除。'
    });
    if(confirm.response!==1)return null;
    const normalized={...pkg,installedAt:new Date().toISOString()};
    const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp,JSON.stringify(normalized,null,2)+'\n','utf8');
    if(fs.existsSync(target))fs.rmSync(target,{force:true});
    fs.renameSync(tmp,target);
    return {...normalized,installedPath:target,previousPackage};
  });
  ipcMain.handle('plugins:restorePackage', async (_event, payload) => {
    const id=String(payload?.id||payload?.package?.manifest?.id||'');
    if(!validPluginId(id)||id.startsWith('builtin.'))throw new Error('无效的插件回滚 ID。');
    const target=path.join(ensureExternalPluginDirectory(),pluginPackageFileName(id));
    if(!payload?.package){if(fs.existsSync(target))fs.unlinkSync(target);return true;}
    const pkg=normalizePluginPackage(payload.package,{allowBuiltinId:false});
    if(pkg.manifest.id!==id)throw new Error('插件回滚包 ID 不匹配。');
    const tmp=`${target}.rollback-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp,JSON.stringify(pkg,null,2)+'\n','utf8');
    if(fs.existsSync(target))fs.rmSync(target,{force:true});
    fs.renameSync(tmp,target);
    return true;
  });
  ipcMain.handle('plugins:uninstall', async (_event, id) => {
    const pluginId=String(id||'');
    if(!validPluginId(pluginId)||pluginId.startsWith('builtin.'))throw new Error('无效的可卸载插件 ID。');
    const target=path.join(ensureExternalPluginDirectory(),pluginPackageFileName(pluginId));
    if(fs.existsSync(target))fs.unlinkSync(target);
    return true;
  });
  ipcMain.handle('plugins:openFolder', async () => {
    const dir=ensureExternalPluginDirectory();
    const error=await shell.openPath(dir);
    if(error)throw new Error(error);
    return dir;
  });

  ipcMain.handle('lanweb:getStatus', async () => lanWebServer?.getStatus() || null);
  ipcMain.handle('lanweb:makeQr', async (_event, payload) => {
    const text=String(payload?.text||'').trim();
    if(!text) return null;
    if(text.length>2048) throw new Error('QR content too long.');
    return QRCode.toDataURL(text,{errorCorrectionLevel:'M',type:'image/png',width:320,margin:2,color:{dark:'#172033',light:'#ffffff'}});
  });
  ipcMain.handle('lanweb:getSettings', async () => lanWebServer?.getSettings() || null);
  ipcMain.handle('lanweb:setSettings', async (_event, settings) => lanWebServer?.setSettings(settings) || null);
  ipcMain.handle('lanweb:start', async () => lanWebServer?.start() || null);
  ipcMain.handle('lanweb:stop', async () => lanWebServer?.stop() || null);
  ipcMain.handle('lanweb:regenerateKey', async () => lanWebServer?.regenerateKey() || null);

  ipcMain.handle('files:openData', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 I-V / 多列数据文件', properties: ['openFile', 'multiSelections'],
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
    return {path:filePath,name:path.basename(filePath),size:buffer.length,text:decoded.text,encoding:decoded.encoding};
  });

  ipcMain.handle('files:openCsv', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 I-V CSV 数据', properties: ['openFile', 'multiSelections'],
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
    const result = await dialog.showSaveDialog({defaultPath:defaultName,filters:filters || [{ name: 'Text', extensions: ['txt'] }]});
    if (result.canceled || !result.filePath) return false;
    fs.writeFileSync(result.filePath, content, 'utf8');
    return true;
  });

  ipcMain.handle('files:saveBase64', async (_event, payload) => {
    const result = await dialog.showSaveDialog({
      defaultPath: payload.defaultName || 'dk_data.png',
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
        defaultPath: payload.defaultName || 'dk_data_project.dkds.json',
        filters: [{ name: 'DK Data Studio Project', extensions: ['dkds.json', 'json'] }]
      });
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    fs.writeFileSync(filePath, JSON.stringify(payload.project, null, 2), 'utf8');
    return filePath;
  });

  ipcMain.handle('files:openProject', async () => {
    const result = await dialog.showOpenDialog({
      title: '打开 DK Data Studio 项目', properties: ['openFile'],
      filters: [{ name: 'DK Data Studio Project', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    return {path:filePath,project:JSON.parse(fs.readFileSync(filePath, 'utf8'))};
  });

  lanUpdater = new LanUpdateClient({ app, BrowserWindow });
  lanUpdater.start();
  lanWebServer = new LanWebServer({ app, BrowserWindow });
  if (lanWebServer.getSettings().enabled) lanWebServer.start(false).catch(err => console.error('LAN web server:', err));

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { appQuitting = true; try { lanUpdater?.stop(); } catch {} try { lanWebServer?.stop(false); } catch {} });
