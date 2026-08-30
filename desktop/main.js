const { app, BrowserWindow, dialog, ipcMain, clipboard, Menu, shell, nativeTheme } = require('electron');
const { safeStorage } = require('electron');
const { LanUpdateClient } = require('./update-client');
const { ProjectFileSafety } = require('./project-file-safety');
const { LanWebServer } = require('./lan-web-server');
const { resolvePluginWindow, listPluginWindows } = require('./plugin-window-manager');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const APP_ROOT = path.resolve(__dirname, '..');
const crypto = require('crypto');
const { validPluginId } = require('./plugin-package');
const SmbService = require('../services/smb-service');
const { McpServer } = require('../services/mcp-server');
const { createAppearanceRuntime } = require('./main-modules/appearance-runtime');
const { createPluginPackageRuntime } = require('./main-modules/plugin-package-runtime');
const { createPackagedExpiryRuntime } = require('./main-modules/packaged-expiry');
const { createAgentRuntime } = require('./main-modules/agent-runtime');
const { createAuxiliaryWindowRuntime } = require('./main-modules/auxiliary-window-runtime');

const DKDSProjectFormat = require('../src/core/project/format');
require('../src/project-importers/compatibility-gateway').register(DKDSProjectFormat);
const APP_NAME = 'DK Data Studio';
const APP_ID = 'com.dk.datastudio';

// Keep development, installed and portable Windows identities consistent.
app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

let lanUpdater = null;
let lanWebServer = null;
const pendingCapabilityInvocations = new Map();
let capabilityRequestSeq = 0;
let appQuitting = false;
let primaryWindow = null;
let mcpServer = null;
let mcpRequestSeq = 0;
const pendingMcpRequests = new Map();
let projectFileSafety = null;

function getProjectFileSafety(){
  if(projectFileSafety)return projectFileSafety;
  const userData=app.getPath('userData');
  projectFileSafety=new ProjectFileSafety({
    recoveryRoot:path.join(userData,'project-recovery'),
    auditPath:path.join(userData,'project-file-audit.jsonl'),
    parseBytes:bytes=>DKDSProjectFormat.parseProjectBytes(bytes)
  });
  return projectFileSafety;
}

const appearanceRuntime=createAppearanceRuntime({app,BrowserWindow,nativeTheme});
const {readPersistedAppearanceTheme,nativeWindowBackground,applyNativeAppearance}=appearanceRuntime;
const pluginPackageRuntime=createPluginPackageRuntime({app,BrowserWindow});
const {
  PLUGIN_API_VERSION,pendingPluginInstalls,
  ensureExternalPluginDirectory,pluginHistoryDirectory,listPluginHistory,
  pluginInstallErrorPayload,sweepPendingPluginInstalls,
  algorithmPackageCatalog,readInstalledExternalPlugins,installedExternalPluginPackages,
  readInstalledPluginOverrides,classifyInstalledPluginOverrides,installedPluginOverridePackages,
  currentPluginPackage,packageCompatibility,assertPackageCompatible,pluginInstallPlan,pluginRollbackPlan,commitPluginInstall,restoreInstalledPackage,installLanPluginPackage
}=pluginPackageRuntime;
const {enforcePackagedExpiry}=createPackagedExpiryRuntime({app,appRoot:APP_ROOT});
const {storeAgentSecret,loadAgentSecret,agentHttpJson}=createAgentRuntime({app,safeStorage});

function resolveConfiguredPluginWindow(activityId) {
  return resolvePluginWindow(app.getAppPath(), activityId, installedExternalPluginPackages(), installedPluginOverridePackages());
}

function listConfiguredPluginWindows() {
  return listPluginWindows(app.getAppPath(), installedExternalPluginPackages(), installedPluginOverridePackages());
}

function commonWindowPreferences() {
  return {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  };
}

const auxiliaryWindowRuntime=createAuxiliaryWindowRuntime({
  app,BrowserWindow,appRoot:APP_ROOT,resolveConfiguredPluginWindow,listConfiguredPluginWindows,
  nativeWindowBackground,commonWindowPreferences,isAppQuitting:()=>appQuitting
});
const {
  auxiliaryWindows,auxiliaryBootstrap,auxiliaryReady,auxiliaryFailures,auxiliaryPendingShow,auxiliaryStartupProfiles,pendingAuxiliaryRoleSnapshots,
  projectSnapshotDigest,hideDedicatedAuxiliaryWindow,closeAuxiliaryWindowForReal,markAuxiliaryWindowReady,markAuxiliaryWindowFailed,
  runDiagnosticActivitySmoke,diagnosticsDirectory,diagnosticEnvironment,requestAuxiliaryRoleSnapshot,wrapAuxiliaryRoleSnapshot,createOrFocusAuxiliaryWindow
}=auxiliaryWindowRuntime;


function dispatchMcpToRenderer(request){
  const win=primaryWindow&&!primaryWindow.isDestroyed()?primaryWindow:BrowserWindow.getAllWindows().find(candidate=>!candidate.isDestroyed()&&!auxiliaryBootstrap.has(candidate.webContents.id));
  if(!win)throw new Error('Studio Core 尚未就绪。');
  const id=`mcp-${Date.now()}-${++mcpRequestSeq}`;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pendingMcpRequests.delete(id);reject(new Error('Studio MCP Core 响应超时。'));},120000);
    pendingMcpRequests.set(id,{resolve,reject,timer,webContentsId:win.webContents.id});
    win.webContents.send('mcp:request',{id,...request});
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1680,
    height: 1040,
    minWidth: 1200,
    minHeight: 760,
    frame: false,
    backgroundColor: nativeWindowBackground(),
    title: APP_NAME,
    icon: path.join(APP_ROOT, 'assets', 'dkds-icon.png'),
    autoHideMenuBar: true,
    webPreferences: commonWindowPreferences()
  });
  win.setMenuBarVisibility(false);
  primaryWindow = win;
  const publishMaximizedState=()=>{
    if(!win.isDestroyed())win.webContents.send('windows:maximizedChanged',win.isMaximized());
  };
  win.on('maximize',publishMaximizedState);
  win.on('unmaximize',publishMaximizedState);
  win.on('closed',()=>{ if(primaryWindow===win) primaryWindow=null; });
  win.loadFile(path.join(APP_ROOT, 'src', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  enforcePackagedExpiry();
  const persistedAppearance=readPersistedAppearanceTheme();
  if(persistedAppearance)applyNativeAppearance(persistedAppearance,{persist:false,broadcast:false});
  else try{nativeTheme.themeSource='system';}catch{}
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
  ipcMain.handle('diagnostics:getEnvironment', async () => diagnosticEnvironment());
  ipcMain.handle('diagnostics:runActivitySmoke', async (event,payload={}) => {
    const owner=BrowserWindow.fromWebContents(event.sender);
    if(!owner)throw new Error('Unable to resolve the main application window.');
    return runDiagnosticActivitySmoke(owner,payload);
  });
  ipcMain.handle('diagnostics:writeAutomationReport', async (_event,report={}) => {
    const dir=diagnosticsDirectory();
    const appVersion=String(report?.appVersion||app.getVersion()||'runtime').replace(/[^0-9A-Za-z._-]+/g,'-');
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const name=`dkds-automation-${appVersion}-${stamp}.json`;
    const target=path.join(dir,name);
    const payload={...report,desktopEnvironment:diagnosticEnvironment()};
    fs.writeFileSync(target,JSON.stringify(payload,null,2)+'\n','utf8');
    return {name,path:target,size:fs.statSync(target).size};
  });
  ipcMain.handle('diagnostics:openFolder', async () => {
    const dir=diagnosticsDirectory();
    const error=await shell.openPath(dir);
    if(error)throw new Error(error);
    return true;
  });

  ipcMain.handle('windows:prewarmActivity', async (event, payload) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    if (!owner) throw new Error('Unable to resolve the main application window.');
    const activityId = String(payload?.activityId || '').trim();
    const spec = resolveConfiguredPluginWindow(activityId);
    if (!spec) return { skipped:true, reason:'not-dedicated' };
    return createOrFocusAuxiliaryWindow(owner, { ...(payload || {}), prewarm:true });
  });
  ipcMain.handle('windows:getActivityBootstrap', async event => auxiliaryBootstrap.get(event.sender.id) || null);
  ipcMain.handle('capabilities:publishSnapshot', async (event, payload = {}) => {
    const ownerId=event.sender.id;
    const snapshot=payload?.snapshot||null;
    const nextRevision=Number(payload?.revision??snapshot?.revision)||0;
    let updated=0;
    for(const win of BrowserWindow.getAllWindows()){
      if(win.isDestroyed())continue;
      const current=auxiliaryBootstrap.get(win.webContents.id);
      if(!current||Number(current.ownerWebContentsId)!==ownerId)continue;
      if(Number(current.capabilityRevision||0)===nextRevision)continue;
      auxiliaryBootstrap.set(win.webContents.id,{...current,capabilitySnapshot:snapshot,capabilityRevision:nextRevision});
      try{win.webContents.send('windows:activityBootstrapChanged');updated+=1;}catch{}
    }
    return {updated,revision:nextRevision};
  });
  ipcMain.handle('capabilities:invokeOwner', async (event, payload = {}) => {
    const bootstrap=auxiliaryBootstrap.get(event.sender.id);
    const ownerId=Number(bootstrap?.ownerWebContentsId)||0;
    const ownerWindow=BrowserWindow.getAllWindows().find(win=>!win.isDestroyed()&&win.webContents.id===ownerId);
    if(!ownerWindow)throw new Error('Capability owner window is unavailable.');
    const requestId=`cap-${process.pid}-${Date.now()}-${++capabilityRequestSeq}`;
    const request={requestId,id:String(payload.id||''),method:String(payload.method||'invoke'),args:Array.isArray(payload.args)?payload.args:[]};
    return await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pendingCapabilityInvocations.delete(requestId);reject(new Error(`Capability invocation timed out: ${request.id}.${request.method}`));},60000);
      pendingCapabilityInvocations.set(requestId,{resolve,reject,timer,ownerId});
      try{ownerWindow.webContents.send('capabilities:invokeRequest',request);}
      catch(err){clearTimeout(timer);pendingCapabilityInvocations.delete(requestId);reject(err);}
    });
  });
  ipcMain.on('capabilities:invokeResponse', (event, payload = {}) => {
    const requestId=String(payload.requestId||'');
    const pending=pendingCapabilityInvocations.get(requestId);
    if(!pending||pending.ownerId!==event.sender.id)return;
    pendingCapabilityInvocations.delete(requestId);clearTimeout(pending.timer);
    if(payload.ok===false)pending.reject(new Error(String(payload.error||'Capability invocation failed.')));
    else pending.resolve(payload.result);
  });
  ipcMain.handle('windows:prepareSuperTransition', async (event, payload = {}) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const ownerId=owner?.webContents?.id;
    const activityId=String(payload?.activityId||'').trim();
    if(!ownerId||!activityId)return {activityId,snapshots:[],closed:0};
    const targets=[];
    for(const win of auxiliaryWindows.values()){
      if(!win||win.isDestroyed())continue;
      const row=auxiliaryBootstrap.get(win.webContents.id);
      if(row?.ownerWebContentsId===ownerId&&String(row?.activityId||'')===activityId)targets.push(win);
    }
    const snapshots=[];
    for(const win of targets){
      const row=auxiliaryBootstrap.get(win.webContents.id);
      const snapshot=await requestAuxiliaryRoleSnapshot(win,'promote-to-super');
      if(snapshot&&row)snapshots.push(wrapAuxiliaryRoleSnapshot(row,snapshot));
    }
    for(const win of targets)closeAuxiliaryWindowForReal(win);
    return {activityId,snapshots,closed:targets.length};
  });
  ipcMain.on('windows:activityRoleSnapshotResponse', (event, payload = {}) => {
    const requestId=String(payload?.requestId||'');
    const pending=pendingAuxiliaryRoleSnapshots.get(requestId);
    if(!pending||pending.webContentsId!==event.sender.id)return;
    pendingAuxiliaryRoleSnapshots.delete(requestId);
    clearTimeout(pending.timer);
    pending.resolve(payload?.snapshot||null);
  });
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
  ipcMain.handle('windows:syncPluginActivities', async (event, payload) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const ownerId = owner?.webContents?.id;
    if (!ownerId) return 0;
    const enabledRows=Array.isArray(payload)?payload:(Array.isArray(payload?.enabled)?payload.enabled:[]);
    const prewarmRows=Array.isArray(payload)?enabledRows:(Array.isArray(payload?.prewarm)?payload.prewarm:[]);
    const allowed = new Set(enabledRows.map(v => String(v || '').trim()).filter(Boolean));
    const allowedPrewarm = new Set(prewarmRows.map(v => String(v || '').trim()).filter(Boolean));
    const doomed = [];
    for (const win of auxiliaryWindows.values()) {
      if (!win || win.isDestroyed()) continue;
      const row = auxiliaryBootstrap.get(win.webContents.id);
      if (row?.ownerWebContentsId !== ownerId || !row?.pluginWindow) continue;
      const activity=String(row.activityId||'');
      if (!allowed.has(activity) || (row.prewarm===true && !allowedPrewarm.has(activity))) doomed.push(win);
    }
    for (const win of doomed) closeAuxiliaryWindowForReal(win);
    return doomed.length;
  });
  ipcMain.on('windows:activityReady', (event,payload={}) => {
    markAuxiliaryWindowReady(BrowserWindow.fromWebContents(event.sender),payload);
  });
  ipcMain.on('windows:activityFailed', (event,payload={}) => {
    markAuxiliaryWindowFailed(BrowserWindow.fromWebContents(event.sender),payload);
  });
  ipcMain.handle('windows:closeCurrent', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    const bootstrap = auxiliaryBootstrap.get(event.sender.id);
    if (bootstrap?.pluginWindow?.reuse !== false) return hideDedicatedAuxiliaryWindow(win);
    win.close();
    return true;
  });
  ipcMain.handle('windows:minimizeCurrent', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    win.minimize();
    return true;
  });
  ipcMain.handle('windows:toggleMaximizeCurrent', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return { maximized:false };
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return { maximized:win.isMaximized() };
  });
  ipcMain.handle('windows:getCurrentState', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return { maximized:!!(win && !win.isDestroyed() && win.isMaximized()) };
  });
  ipcMain.on('windows:requestProjectSave', (event, payload={}) => {
    const bootstrap = auxiliaryBootstrap.get(event.sender.id);
    if (!bootstrap) return;
    const owner = BrowserWindow.getAllWindows().find(w => w.webContents?.id === bootstrap.ownerWebContentsId);
    if (!owner || owner.isDestroyed()) return;
    owner.webContents.send('windows:requestProjectSave', {
      projectTabId: bootstrap.projectTabId,
      activityId: bootstrap.activityId,
      pluginId: bootstrap.pluginWindow?.pluginId || '',
      persistence: bootstrap.pluginWindow?.persistence || 'project',
      project: payload?.project || null,
      pluginState: payload?.pluginState ?? null,
      artifactDelta: payload?.artifactDelta || null,
      final: true
    });
  });
  ipcMain.on('windows:requestImportWorkbench', (event, payload={}) => {
    const bootstrap = auxiliaryBootstrap.get(event.sender.id);
    if (!bootstrap) return;
    const owner = BrowserWindow.getAllWindows().find(w => w.webContents?.id === bootstrap.ownerWebContentsId);
    if (!owner || owner.isDestroyed()) return;
    if (owner.isMinimized()) owner.restore();
    owner.show();owner.focus();
    owner.webContents.send('windows:requestImportWorkbench', {
      projectTabId: bootstrap.projectTabId,
      activityId: bootstrap.activityId,
      pluginId: bootstrap.pluginWindow?.pluginId || '',
      options: payload?.options && typeof payload.options === 'object' ? payload.options : payload || {}
    });
  });
  ipcMain.on('windows:ownerArtifactDelta', (event, payload={}) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const ownerId = owner?.webContents?.id;
    const projectTabId = String(payload?.projectTabId || '').trim();
    const excludeActivityId = String(payload?.excludeActivityId || '').trim();
    const delta = payload?.artifactDelta && typeof payload.artifactDelta === 'object' ? payload.artifactDelta : null;
    if (!ownerId || !projectTabId || !delta) return;
    for (const win of auxiliaryWindows.values()) {
      if (!win || win.isDestroyed()) continue;
      const row = auxiliaryBootstrap.get(win.webContents.id);
      if (row?.ownerWebContentsId !== ownerId || String(row?.projectTabId || '') !== projectTabId) continue;
      if (excludeActivityId && String(row?.activityId || '') === excludeActivityId) continue;
      // Runtime-only prewarm has no hydrated domain store yet. The current
      // project snapshot will be supplied when that renderer is promoted.
      if (row?.prewarm === true) continue;
      try {
        win.webContents.send('windows:ownerArtifactDelta', {
          projectTabId,
          reason:String(payload?.reason || 'owner-artifact-change'),
          artifactDelta:delta
        });
      } catch {}
    }
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
  ipcMain.handle('update:installNow', async () => {
    const safety=getProjectFileSafety();
    safety.prepareForQuit('explicit-update-install');
    const installRoot=path.dirname(process.execPath);
    const risky=safety.pathsInside(installRoot);
    if(risky.length){
      console.error('[DKDS project safety] Refusing update install because an open project is inside the application install directory:',risky);
      return false;
    }
    return lanUpdater?.installNow() || false;
  });

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

  ipcMain.handle('plugins:listExternal', async () => {const result=readInstalledExternalPlugins();return {...result,packages:(result.packages||[]).map(pkg=>({...pkg,compatibilityStatus:packageCompatibility(pkg.manifest) }))};});
  ipcMain.handle('plugins:listOverrides', async () => {const result=readInstalledPluginOverrides(),classified=classifyInstalledPluginOverrides(result);return {...result,packages:classified.active.map(pkg=>({...pkg,effective:true,compatibilityStatus:packageCompatibility(pkg.manifest)})),shadowed:classified.shadowed.map(pkg=>({...pkg,compatibilityStatus:packageCompatibility(pkg.manifest)}))};});
  const installPlanError=(err,manifest=null,compatibility=null,fallbackCode='PLUGIN_PACKAGE_INVALID',fallbackTitle='无法读取插件包')=>{const code=String(err?.code||fallbackCode),showCompatibility=!['PLUGIN_VERSION_NOT_NEWER','PLUGIN_HISTORY_SHADOWED_BY_BUNDLED','PLUGIN_SOURCE_CONTRACT'].includes(code);return pluginInstallErrorPayload(err,{code,title:String(err?.title||fallbackTitle),manifest,compatibility:showCompatibility?compatibility:null});};
  ipcMain.handle('plugins:selectPackage', async () => {
    sweepPendingPluginInstalls();let manifest=null;
    try{
      const result=await dialog.showOpenDialog({title:'选择 DK Data Studio 插件',properties:['openFile'],filters:[{name:'DK Data Studio Plugin',extensions:['dkplugin']},{name:'JSON',extensions:['json']}]});
      if(result.canceled||!result.filePaths.length)return {ok:true,canceled:true};
      const sourcePath=result.filePaths[0],stat=fs.statSync(sourcePath);
      if(stat.size>10*1024*1024)return {ok:false,error:pluginInstallErrorPayload('插件包超过 10 MB 限制。',{code:'PLUGIN_PACKAGE_TOO_LARGE',title:'插件包过大'})};
      const raw=JSON.parse(fs.readFileSync(sourcePath,'utf8'));manifest=raw?.manifest||null;const plan=pluginInstallPlan(raw);manifest=plan.manifest;
      const compatibility=plan.compatibility;
      if(!compatibility.compatible){
        const details=(compatibility.issues||[]).map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required}（当前 ${issue.actual}）`:`${issue.kind} ${issue.required}（当前 ${issue.actual}）`).join('；');
        return {ok:false,error:pluginInstallErrorPayload(`插件与当前 DK Data Studio 环境不兼容：${details}`,{code:'PLUGIN_INCOMPATIBLE',title:'插件版本不兼容',manifest,compatibility})};
      }
      const token=crypto.randomUUID();pendingPluginInstalls.set(token,{...plan,createdAt:Date.now()});
      return {ok:true,canceled:false,token,manifest,exists:plan.exists,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart,previousVersion:plan.previousVersion,bundledVersion:plan.bundledVersion,compatibility:{appVersion:String(app.getVersion()||''),pluginApiVersion:PLUGIN_API_VERSION,requiredApp:String(manifest.compatibility?.app||'*'),requiredPluginApi:String(manifest.compatibility?.pluginApi||manifest.apiVersion||'*')}};
    }catch(err){return {ok:false,error:installPlanError(err,manifest,manifest?packageCompatibility(manifest):null)};}
  });
  ipcMain.handle('plugins:cancelInstall', async (_event, token) => {pendingPluginInstalls.delete(String(token||''));return true;});
  ipcMain.handle('plugins:installPackage', async (_event, token) => {
    sweepPendingPluginInstalls();const key=String(token||''),pending=pendingPluginInstalls.get(key);
    if(!pending)return {ok:false,error:pluginInstallErrorPayload('安装会话已失效，请重新选择插件包。',{code:'PLUGIN_INSTALL_SESSION_EXPIRED',title:'安装会话已失效'})};
    pendingPluginInstalls.delete(key);const manifest=pending.pkg.manifest;
    try{
      const plan=pluginInstallPlan(pending.pkg),compatibility=plan.compatibility;
      if(!compatibility.compatible)return {ok:false,error:pluginInstallErrorPayload('插件环境兼容性在确认期间发生变化，请重新选择插件包。',{code:'PLUGIN_INCOMPATIBLE',title:'插件版本不兼容',manifest,compatibility})};
      const installed=commitPluginInstall(plan,{archiveReason:plan.installationKind==='override'?'override-upgrade':'upgrade'});
      return {ok:true,package:installed,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart};
    }catch(err){
      try{restoreInstalledPackage(manifest.id,pending.previousPackage||null);}catch(restoreErr){return {ok:false,error:pluginInstallErrorPayload(`${err.message||err}；写入失败后的自动恢复也失败：${restoreErr.message||restoreErr}`,{code:'PLUGIN_INSTALL_AND_RESTORE_FAILED',title:'插件安装与自动恢复均失败',manifest,compatibility:packageCompatibility(manifest)})};}
      return {ok:false,error:installPlanError(err,manifest,packageCompatibility(manifest),'PLUGIN_INSTALL_FAILED','插件安装失败')};
    }
  });
  ipcMain.handle('plugins:validateGeneratedPackage', async (_event, raw) => {
    let manifest=null;
    try{
      const serialized=JSON.stringify(raw||{});if(Buffer.byteLength(serialized,'utf8')>10*1024*1024)return {ok:false,error:pluginInstallErrorPayload('插件包超过 10 MB 限制。',{code:'PLUGIN_PACKAGE_TOO_LARGE',title:'插件包过大'})};
      manifest=raw?.manifest||null;const plan=pluginInstallPlan(raw);manifest=plan.manifest;
      if(!plan.compatibility.compatible)return {ok:false,error:pluginInstallErrorPayload('生成的插件与当前 DK Data Studio 环境不兼容。',{code:'PLUGIN_INCOMPATIBLE',title:'插件版本不兼容',manifest,compatibility:plan.compatibility})};
      return {ok:true,package:plan.pkg,manifest,compatibility:plan.compatibility,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart,previousVersion:plan.previousVersion,bundledVersion:plan.bundledVersion};
    }catch(err){return {ok:false,error:installPlanError(err,manifest,manifest?packageCompatibility(manifest):null,'PLUGIN_PACKAGE_INVALID','生成插件包无效')};}
  });
  ipcMain.handle('plugins:installGeneratedPackage', async (_event, payload={}) => {
    let manifest=null,plan=null;
    try{
      const raw=payload?.package||payload,serialized=JSON.stringify(raw||{});if(Buffer.byteLength(serialized,'utf8')>10*1024*1024)throw new Error('插件包超过 10 MB 限制。');
      manifest=raw?.manifest||null;plan=pluginInstallPlan(raw);manifest=plan.manifest;
      if(!plan.compatibility.compatible)return {ok:false,error:pluginInstallErrorPayload('生成的插件与当前 DK Data Studio 环境不兼容。',{code:'PLUGIN_INCOMPATIBLE',title:'插件版本不兼容',manifest,compatibility:plan.compatibility})};
      const installed=commitPluginInstall(plan,{archiveReason:plan.installationKind==='override'?'override-agent-update':'agent-update',generatedBy:String(payload?.source||'studio-kernel')});
      return {ok:true,package:installed,compatibility:plan.compatibility,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart};
    }catch(err){
      try{if(plan)restoreInstalledPackage(manifest.id,plan.previousPackage||null);}catch{}
      return {ok:false,error:installPlanError(err,manifest,manifest?packageCompatibility(manifest):null,'PLUGIN_GENERATED_INSTALL_FAILED','生成插件安装失败')};
    }
  });
  ipcMain.handle('plugins:historyList', async (_event, id) => listPluginHistory(String(id||'')));
  ipcMain.handle('plugins:algorithmCatalog', async (_event, ref) => algorithmPackageCatalog(ref||{}));
  ipcMain.handle('plugins:rollbackVersion', async (_event, payload) => {
    const id=String(payload?.id||''),token=path.basename(String(payload?.token||''));
    if(!validPluginId(id)||!token.toLowerCase().endsWith('.dkplugin'))throw new Error('无效的插件回退请求。');
    const historyPath=path.join(pluginHistoryDirectory(id),token);if(!fs.existsSync(historyPath))throw new Error('指定的插件历史版本不存在。');
    const plan=pluginRollbackPlan(id,JSON.parse(fs.readFileSync(historyPath,'utf8')));assertPackageCompatible(plan.manifest,'rollback');
    const restored=commitPluginInstall(plan,{archiveReason:plan.installationKind==='override'?'override-rollback':'rollback'});
    return {...restored,installationKind:plan.installationKind,requiresRestart:plan.requiresRestart};
  });
  ipcMain.handle('plugins:restorePackage', async (_event, payload) => restoreInstalledPackage(String(payload?.id||payload?.package?.manifest?.id||''),payload?.package||null));
  ipcMain.handle('plugins:uninstall', async (_event, id) => {
    const pluginId=String(id||'');if(!validPluginId(pluginId))throw new Error('无效的插件 ID。');
    return restoreInstalledPackage(pluginId,null);
  });
  ipcMain.handle('plugins:exportPackage', async (_event, id) => {
    const pluginId=String(id||'');if(!validPluginId(pluginId))throw new Error('无效的插件 ID。');
    const pkg=currentPluginPackage(pluginId);if(!pkg)throw new Error(`未找到插件包：${pluginId}`);
    const safeId=pluginId.replace(/[^0-9A-Za-z._-]/g,'_'),safeVersion=String(pkg.manifest.version||'0.0.0').replace(/[^0-9A-Za-z._-]/g,'_');
    const result=await dialog.showSaveDialog({title:`导出插件 · ${pkg.manifest.name||pluginId}`,defaultPath:path.join(app.getPath('downloads'),`${safeId}-${safeVersion}.dkplugin`),filters:[{name:'DK Data Studio Plugin',extensions:['dkplugin']}]});
    if(result.canceled||!result.filePath)return null;fs.writeFileSync(result.filePath,JSON.stringify(pkg,null,2)+'\n','utf8');return {id:pluginId,name:pkg.manifest.name||pluginId,version:pkg.manifest.version||'',path:result.filePath};
  });
  ipcMain.handle('plugins:openFolder', async () => {
    const dir=ensureExternalPluginDirectory();
    const error=await shell.openPath(dir);
    if(error)throw new Error(error);
    return dir;
  });


  ipcMain.handle('smb:discover', async () => SmbService.safeSmbOperation(()=>SmbService.discoverSmbServers(),'SMB 设备发现失败'));
  ipcMain.handle('smb:listShares', async (_event, connection={}) => SmbService.safeSmbOperation(()=>SmbService.scanDesktopSmbShares(connection),'SMB 共享枚举失败'));
  ipcMain.handle('smb:list', async (_event, payload={}) => SmbService.safeSmbOperation(()=>SmbService.listDesktopSmb(payload.connection||{},payload.path||''),'SMB 目录读取失败'));
  ipcMain.handle('smb:read', async (_event, payload={}) => SmbService.safeSmbOperation(()=>SmbService.readDesktopSmb(payload.connection||{},Array.isArray(payload.paths)?payload.paths:[]),'SMB 文件读取失败'));

  ipcMain.handle('agent:getSecret', async (_event,key) => loadAgentSecret(key));
  ipcMain.handle('agent:setSecret', async (_event,payload={}) => storeAgentSecret(payload.key,payload.value));
  ipcMain.handle('agent:httpJson', async (_event,payload={}) => agentHttpJson(payload));

  ipcMain.handle('mcp:getStatus', async () => mcpServer?.status?.()||{running:false,port:8766,url:'',localUrl:'',lanUrl:'',tokenHeader:'x-dkds-token',protocolVersion:'2025-06-18'});
  ipcMain.handle('mcp:start', async (_event,payload={}) => {
    if(!mcpServer)mcpServer=new McpServer({dispatch:dispatchMcpToRenderer,log:message=>console.log(message)});
    return mcpServer.start(String(payload.token||''));
  });
  ipcMain.handle('mcp:stop', async () => mcpServer?.stop?.()||{running:false});
  ipcMain.on('mcp:response',(event,payload={})=>{
    const row=pendingMcpRequests.get(String(payload.id||''));if(!row||row.webContentsId!==event.sender.id)return;
    clearTimeout(row.timer);pendingMcpRequests.delete(String(payload.id));
    if(payload.ok===false)row.reject(new Error(String(payload.error||'MCP Core request failed')));else row.resolve(payload.value);
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
      title: '选择数据 / 项目文件', properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Data / Text', extensions: ['csv', 'txt', 'dat', 'tsv', 'asc', 'xy', 'iv', 'prn', 'out', 'log'] },
        { name: '项目文件', extensions: ['json'] },
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

  ipcMain.handle('files:openDataDirectory', async () => {
    const result=await dialog.showOpenDialog({title:'选择数据文件夹',properties:['openDirectory','createDirectory']});
    if(result.canceled||!result.filePaths.length)return null;
    const folder=result.filePaths[0];return {path:folder,name:path.basename(folder)||folder};
  });

  ipcMain.handle('files:listDataDirectory', async (_event,payload={}) => {
    const root=path.resolve(String(payload.root||payload.path||''));
    const relative=String(payload.relativePath||'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');
    if(!root||!fs.existsSync(root)||!fs.statSync(root).isDirectory())throw new Error('数据文件夹不存在。');
    if(relative.split('/').includes('..'))throw new Error('文件夹路径无效。');
    const target=path.resolve(root,relative);if(target!==root&&!target.startsWith(root+path.sep))throw new Error('文件夹路径越界。');
    const entries=fs.readdirSync(target,{withFileTypes:true}).map(row=>{
      const full=path.join(target,row.name),stat=fs.statSync(full),rel=path.relative(root,full).replace(/\\/g,'/');
      return {name:row.name,path:full,relativePath:rel,directory:row.isDirectory(),size:row.isDirectory()?0:stat.size,modifiedAt:stat.mtime?.toISOString?.()||null};
    }).filter(row=>row.directory||/\.(csv|tsv|txt|dat|json|asc|xy|iv|prn|out|log|png|jpe?g)$/i.test(row.name));
    return {root,relativePath:relative,entries};
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

  ipcMain.handle('files:saveProject', async (_event, payload = {}) => {
    const mode = payload.mode === 'saveAs' ? 'saveAs' : 'current';
    const currentPath = typeof payload.path === 'string' && !/^(?:web|webfs|native):\/\//i.test(payload.path)
      ? payload.path
      : null;
    let filePath = mode === 'current' ? currentPath : null;
    if (!filePath) {
      const result = await dialog.showSaveDialog({
        title: mode === 'saveAs' ? '项目另存为' : '保存 DK Data Studio 项目',
        defaultPath: currentPath || payload.defaultName || 'dk_data_project.dkds.json',
        filters: [{ name: 'DK Data Studio Project', extensions: ['dkds.json', 'json'] }]
      });
      if (result.canceled || !result.filePath) return null;
      filePath = result.filePath;
    }
    const serialized=DKDSProjectFormat.serializeProject(payload.project || {});
    return getProjectFileSafety().safeWrite(filePath, serialized);
  });

  ipcMain.handle('system:getDevToolsState', async event => {
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win||win.isDestroyed())return {available:false,open:false};
    return {available:true,open:!!win.webContents?.isDevToolsOpened?.()};
  });
  ipcMain.handle('system:toggleDevTools', async event => {
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win||win.isDestroyed())return {available:false,open:false};
    const contents=win.webContents;if(contents?.isDevToolsOpened?.())contents.closeDevTools();else contents?.openDevTools?.({mode:'detach',activate:true});
    return {available:true,open:!!contents?.isDevToolsOpened?.()};
  });

  ipcMain.handle('system:getAppearanceTheme', async () => appearanceRuntime.currentAppearance() || null);
  ipcMain.handle('system:setAppearanceTheme', async (_event, value) => {
    const next=String(value||'').toLowerCase();
    if(!['light','dark'].includes(next))throw new Error('Invalid appearance theme.');
    if(appearanceRuntime.currentAppearance()===next){
      // Re-assert nativeTheme: Windows can recreate native chrome when a
      // BrowserWindow is restored or moved between displays.
      return applyNativeAppearance(next,{persist:true,broadcast:false});
    }
    return applyNativeAppearance(next,{persist:true,broadcast:true});
  });

  ipcMain.handle('system:getRuntimeStatus', async () => {
    const metrics = app.getAppMetrics();
    const rendererMeta=new Map();
    for(const win of BrowserWindow.getAllWindows()){
      if(!win||win.isDestroyed())continue;
      const pid=Number(win.webContents?.getOSProcessId?.())||0;
      if(!pid)continue;
      const bootstrap=auxiliaryBootstrap.get(win.webContents.id)||{};
      const pluginWindow=bootstrap.pluginWindow||{};
      const pluginId=String(pluginWindow.pluginId||'');
      const activityId=String(pluginWindow.activity||bootstrap.activityId||'');
      const title=String(pluginWindow.title||bootstrap.title||win.getTitle?.()||'').trim();
      const projectTabId=String(bootstrap.projectTabId||'');
      const projectTitle=String(bootstrap.title||'').trim();
      const lifecycle=pluginId?(bootstrap.prewarm===true?'预热':(win.isVisible()?'已打开':'已隐藏')):'主界面';
      rendererMeta.set(pid,{
        pluginId,activityId,title,projectTabId,projectTitle,lifecycle,visible:win.isVisible(),prewarm:bootstrap.prewarm===true,
        label:pluginId?`插件 · ${title||pluginId}${projectTitle?` · ${projectTitle}`:''} · ${lifecycle}`:`主界面 · ${title||APP_NAME}`
      });
    }
    const components=metrics.map((row,index)=>{
      const m=row?.memory||{};
      const pid=Number(row?.pid)||0;
      const renderer=rendererMeta.get(pid)||null;
      const type=String(row?.type||'process');
      const processName=String(row?.name||row?.serviceName||'').trim();
      let label=renderer?.label||'';
      if(!label){
        if(type==='Browser')label='主进程';
        else if(type==='GPU')label='GPU 进程';
        else if(type==='Utility')label=processName?`服务 · ${processName}`:'Utility 服务';
        else if(type==='Tab')label='渲染进程';
        else label=processName||`${type} 进程`;
      }
      return {
        id:`${type}:${pid||index}`,
        type,pid,label,
        pluginId:renderer?.pluginId||'',
        activityId:renderer?.activityId||'',
        projectTabId:renderer?.projectTabId||'',
        projectTitle:renderer?.projectTitle||'',
        lifecycle:renderer?.lifecycle||'',
        visible:renderer?.visible!==false,
        prewarm:renderer?.prewarm===true,
        workingSetBytes:(Number(m.workingSetSize)||0)*1024,
        peakWorkingSetBytes:(Number(m.peakWorkingSetSize)||0)*1024,
        privateBytes:(Number(m.privateBytes)||0)*1024
      };
    }).sort((a,b)=>b.workingSetBytes-a.workingSetBytes);
    const memory = components.reduce((sum, row) => {
      sum.workingSetBytes += Number(row.workingSetBytes)||0;
      sum.peakWorkingSetBytes += Number(row.peakWorkingSetBytes)||0;
      sum.privateBytes += Number(row.privateBytes)||0;
      return sum;
    }, { workingSetBytes:0, peakWorkingSetBytes:0, privateBytes:0 });
    return {
      runtime:'desktop',
      platform:process.platform,
      isPackaged:app.isPackaged,
      processCount:metrics.length,
      memory,
      components
    };
  });

  ipcMain.handle('files:openProject', async () => {
    const result = await dialog.showOpenDialog({
      title: '打开 DK Data Studio 项目', properties: ['openFile'],
      filters: [{ name: 'DK Data Studio Project', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const bytes=fs.readFileSync(filePath);
    const parsed=DKDSProjectFormat.parseProjectBytes(bytes);
    getProjectFileSafety().registerOpen(filePath);
    return {path:filePath,project:parsed.project,encoding:parsed.encoding};
  });

  lanUpdater = new LanUpdateClient({ app, BrowserWindow, installPluginPackage:installLanPluginPackage });
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

app.on('before-quit', () => {
  appQuitting = true;
  try { projectFileSafety?.prepareForQuit('app-before-quit'); } catch (err) { console.error('[DKDS project safety:quit]',err); }
  try { lanUpdater?.stop(); } catch {}
  try { lanWebServer?.stop(false); } catch {}
  try { mcpServer?.stop?.(); } catch {}
  try { SmbService.shutdownSmbSessions?.(); } catch {}
});
