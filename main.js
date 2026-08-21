const { app, BrowserWindow, dialog, ipcMain, clipboard, Menu, shell } = require('electron');
const { LanUpdateClient } = require('./update-client');
const { LanWebServer } = require('./lan-web-server');
const { resolvePluginWindow, listPluginWindows } = require('./plugin-window-manager');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { normalizePluginPackage, pluginPackageFileName, validPluginId } = require('./plugin-package');
const AlgorithmPackageCatalog = require('./algorithm-package-catalog');

const DKDSProjectFormat = require('./src/core/project-format');
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
const auxiliaryFailures = new Map();
const auxiliaryPendingShow = new Set();
const auxiliaryStartupProfiles = new Map();
const forcedAuxiliaryClose = new WeakSet();
const pendingCapabilityInvocations = new Map();
const pendingAuxiliaryRoleSnapshots = new Map();
let capabilityRequestSeq = 0;
let auxiliaryRoleSnapshotSeq = 0;
let appQuitting = false;

function externalPluginDirectory() {
  return path.join(app.getPath('userData'), 'plugins');
}

function ensureExternalPluginDirectory() {
  const dir = externalPluginDirectory();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pluginOverrideDirectory() {
  return path.join(app.getPath('userData'), 'plugin-overrides');
}
function pluginHistoryRootDirectory(){return path.join(app.getPath('userData'),'plugin-history');}
function pluginHistoryDirectory(id){
  const pluginId=String(id||'');
  if(!validPluginId(pluginId)||pluginId.startsWith('builtin.'))throw new Error('无效的插件历史 ID。');
  return path.join(pluginHistoryRootDirectory(),pluginId);
}
function archiveExternalPluginPackage(pkg,reason='update'){
  if(!pkg?.manifest?.id)return null;
  const normalized=normalizePluginPackage(pkg,{allowBuiltinId:false});
  const dir=pluginHistoryDirectory(normalized.manifest.id);fs.mkdirSync(dir,{recursive:true});
  const version=String(normalized.manifest.version||'0.0.0').replace(/[^0-9A-Za-z._-]/g,'_');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const fileName=`${version}--${stamp}.dkplugin`;
  const payload={...normalized,archivedAt:new Date().toISOString(),archiveReason:String(reason||'update')};
  atomicWritePluginPackage(path.join(dir,fileName),payload);
  return fileName;
}
function listExternalPluginHistory(id){
  const dir=pluginHistoryDirectory(id);const versions=[];if(!fs.existsSync(dir))return versions;
  for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort().reverse()){
    try{const raw=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),pkg=normalizePluginPackage(raw,{allowBuiltinId:false});if(pkg.manifest.id!==id)continue;versions.push({token:name,version:String(pkg.manifest.version||''),name:String(pkg.manifest.name||id),archivedAt:String(raw.archivedAt||''),archiveReason:String(raw.archiveReason||'update')});}catch{}
  }
  return versions;
}

function ensurePluginOverrideDirectory() {
  const dir=pluginOverrideDirectory();
  fs.mkdirSync(dir,{recursive:true});
  return dir;
}

function pluginLanStatePath(){return path.join(app.getPath('userData'),'plugin-lan-update-state.json');}
function readPluginLanState(){
  try{return JSON.parse(fs.readFileSync(pluginLanStatePath(),'utf8'))||{};}catch{return {};}
}
function writePluginLanState(state){
  const target=pluginLanStatePath();fs.mkdirSync(path.dirname(target),{recursive:true});
  const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp,JSON.stringify(state,null,2)+'\n','utf8');
  if(fs.existsSync(target))fs.rmSync(target,{force:true});
  fs.renameSync(tmp,target);
}
function atomicWritePluginPackage(target,pkg){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp,JSON.stringify(pkg,null,2)+'\n','utf8');
  if(fs.existsSync(target))fs.rmSync(target,{force:true});
  fs.renameSync(tmp,target);
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

const PLUGIN_API_VERSION='1.10.0';
function readBuiltinPluginManifests(){
  const base=path.join(app.getAppPath(),'src','plugins'),rows=[];
  try{for(const name of fs.readdirSync(base).sort()){if(name.startsWith('_'))continue;const manifestPath=path.join(base,name,'plugin.json');if(!fs.existsSync(manifestPath))continue;try{const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(manifest?.id)rows.push({manifest,source:'builtin',current:true,installed:true});}catch{}}}catch{}
  return rows;
}
function installedPluginVersionMap(){
  const map=new Map();for(const row of readBuiltinPluginManifests())map.set(String(row.manifest.id),String(row.manifest.version||''));
  for(const pkg of installedPluginOverridePackages())map.set(String(pkg.manifest.id),String(pkg.manifest.version||''));
  for(const pkg of installedExternalPluginPackages())map.set(String(pkg.manifest.id),String(pkg.manifest.version||''));
  return map;
}
function currentCompatibilityEnvironment(){return {appVersion:String(app.getVersion()||''),pluginApiVersion:PLUGIN_API_VERSION,installedVersions:installedPluginVersionMap()};}
function packageCompatibility(manifest){return AlgorithmPackageCatalog.compatibility(manifest,currentCompatibilityEnvironment());}
function assertPackageCompatible(manifest,action='install'){const result=packageCompatibility(manifest);if(result.compatible)return result;const details=result.issues.map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ');throw new Error(`Plugin package is not compatible with this DK Data Studio environment for ${action}: ${details}`);}
function readAlgorithmHistoryCatalogPackages(){
  const root=pluginHistoryRootDirectory(),rows=[];if(!fs.existsSync(root))return rows;
  for(const id of fs.readdirSync(root).sort()){let dir;try{dir=pluginHistoryDirectory(id);}catch{continue;}if(!fs.existsSync(dir))continue;for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort().reverse()){try{const raw=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),pkg=normalizePluginPackage(raw,{allowBuiltinId:false});rows.push({manifest:pkg.manifest,source:'history',token:name,current:false,installed:false});}catch{}}}
  return rows;
}
function algorithmPackageCatalog(ref={}){
  const builtin=readBuiltinPluginManifests();const overrides=installedPluginOverridePackages().map(pkg=>({manifest:pkg.manifest,source:'override',current:true,installed:true}));const external=installedExternalPluginPackages().map(pkg=>({manifest:pkg.manifest,source:'external',current:true,installed:true}));const history=readAlgorithmHistoryCatalogPackages();
  const result=AlgorithmPackageCatalog.catalog([...builtin,...overrides,...external,...history],ref,currentCompatibilityEnvironment());
  return {...result,appVersion:String(app.getVersion()||''),pluginApiVersion:PLUGIN_API_VERSION};
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

function readInstalledPluginOverrides() {
  const dir=ensurePluginOverrideDirectory();
  const packages=[];const errors=[];const builtinIds=builtinPluginIds();
  for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort()){
    const filePath=path.join(dir,name);
    try{
      const pkg=normalizePluginPackage(JSON.parse(fs.readFileSync(filePath,'utf8')),{allowBuiltinId:true});
      if(!pkg.manifest.id.startsWith('builtin.')||!builtinIds.has(pkg.manifest.id))throw new Error(`Override target is not a packaged built-in plugin: ${pkg.manifest.id}`);
      packages.push({...pkg,installedPath:filePath});
    }catch(err){errors.push({file:name,error:err?.message||String(err)});}
  }
  return {packages,errors,directory:dir};
}
function installedPluginOverridePackages(){return readInstalledPluginOverrides().packages||[];}

async function installLanPluginPackage(buffer,metadata={}) {
  const raw=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||'');
  if(!raw.length)throw new Error('LAN plugin package is empty.');
  const sha256=crypto.createHash('sha256').update(raw).digest('hex');
  if(metadata.sha256&&String(metadata.sha256).toLowerCase()!==sha256)throw new Error('LAN plugin package SHA256 mismatch.');
  const parsed=JSON.parse(raw.toString('utf8'));
  const id=String(parsed?.manifest?.id||'');
  if(metadata.id&&String(metadata.id)!==id)throw new Error(`LAN plugin id mismatch: ${id} != ${metadata.id}`);
  const isBuiltin=id.startsWith('builtin.');
  const pkg=normalizePluginPackage(parsed,{allowBuiltinId:isBuiltin});
  assertPackageCompatible(pkg.manifest,'LAN update');
  const state=readPluginLanState();
  if(state[id]?.sha256===sha256)return {installed:false,skipped:true,id,version:pkg.manifest.version,sha256};

  let target,kind;
  if(isBuiltin){
    if(!builtinPluginIds().has(id))throw new Error(`LAN update cannot introduce unknown built-in plugin: ${id}`);
    target=path.join(ensurePluginOverrideDirectory(),pluginPackageFileName(id));
    kind='builtin-override';
  }else{
    const existing=readInstalledExternalPlugins().packages.find(row=>row.manifest.id===id);
    if(!existing)return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'external-plugin-not-installed'};
    target=existing.installedPath;
    kind='external-update';
  }

  const installed={...pkg,installedAt:new Date().toISOString()};
  atomicWritePluginPackage(target,installed);
  state[id]={sha256,version:installed.manifest.version,revision:metadata.revision||metadata.publishedAt||installed.installedAt,installedAt:installed.installedAt,kind};
  writePluginLanState(state);
  const event={id,name:installed.manifest.name,version:installed.manifest.version,kind,sha256,requiresRestart:true};
  for(const win of BrowserWindow.getAllWindows())if(!win.isDestroyed())win.webContents.send('plugins:lanUpdate',event);
  return {installed:true,...event};
}

function resolveConfiguredPluginWindow(activityId) {
  return resolvePluginWindow(app.getAppPath(), activityId, installedExternalPluginPackages(), installedPluginOverridePackages());
}

function listConfiguredPluginWindows() {
  return listPluginWindows(app.getAppPath(), installedExternalPluginPackages(), installedPluginOverridePackages());
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
    capabilitySnapshot:payload.capabilitySnapshot || null,
    capabilityRevision:Number(payload.capabilityRevision)||0,
    diagnosticRun:payload.diagnosticRun===true,
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

function markAuxiliaryWindowReady(win,payload={}) {
  if(!win||win.isDestroyed())return;
  const id=win.webContents.id;
  const profile=auxiliaryStartupProfiles.get(id)||{};
  profile.readyAtMs=Date.now();
  profile.main=profile.main||{};
  profile.main.createToReadyMs=Math.max(0,profile.readyAtMs-Number(profile.createdAtMs||profile.readyAtMs));
  if(payload?.startupProfile&&typeof payload.startupProfile==='object')profile.renderer=payload.startupProfile;
  auxiliaryStartupProfiles.set(id,profile);
  auxiliaryFailures.delete(id);
  auxiliaryReady.add(id);
  if(!auxiliaryPendingShow.has(id))return;
  auxiliaryPendingShow.delete(id);
  try { win.webContents.send('windows:activityWillShow'); } catch {}
  win.show();
  win.focus();
}

function markAuxiliaryWindowFailed(win,payload={}) {
  if(!win||win.isDestroyed())return;
  const id=win.webContents.id;
  const bootstrap=auxiliaryBootstrap.get(id)||{};
  const profile=auxiliaryStartupProfiles.get(id)||{};
  if(payload?.startupProfile&&typeof payload.startupProfile==='object')profile.renderer=payload.startupProfile;
  profile.failedAtMs=Date.now();auxiliaryStartupProfiles.set(id,profile);
  const failure={
    activityId:String(bootstrap.activityId||payload.activityId||''),
    projectTabId:String(bootstrap.projectTabId||payload.projectTabId||''),
    pluginId:String(bootstrap.pluginWindow?.pluginId||payload.pluginId||''),
    error:String(payload.error||payload.message||'插件独立窗口启动失败。'),
    startupProfile:profile
  };
  auxiliaryReady.delete(id);
  auxiliaryFailures.set(id,failure);

  // A user-requested window must never fail invisibly behind `show:false`.
  // Prewarmed failures stay hidden until the user actually opens the TOP.
  if(auxiliaryPendingShow.has(id)){
    auxiliaryPendingShow.delete(id);
    try{win.show();win.focus();}catch{}
  }

  const owner=BrowserWindow.getAllWindows().find(candidate=>!candidate.isDestroyed()&&candidate.webContents.id===bootstrap.ownerWebContentsId);
  if(!bootstrap.diagnosticRun)try{owner?.webContents?.send?.('windows:activityFailed',failure);}catch{}
}

const diagnosticDelay=ms=>new Promise(resolve=>setTimeout(resolve,Math.max(0,Number(ms)||0)));
async function diagnosticRendererLifecycleSnapshot(win){
  if(!win||win.isDestroyed())return null;
  try{return await win.webContents.executeJavaScript('window.DKDSUI?.lifecycleSnapshot?.() || null',true);}
  catch{return null;}
}
function lifecycleSnapshotSuspended(snapshot,expected){
  const rows=Array.isArray(snapshot?.rows)?snapshot.rows:[];
  if(!rows.length)return true;
  return rows.every(row=>row?.resize?.suspended===expected&&(!row?.plots||Number(row.plots.suspended||0)===(expected?Number(row.plots.views||0):0)));
}

function waitForAuxiliaryDiagnosticOutcome(win,timeoutMs=15000){
  if(!win||win.isDestroyed())return Promise.resolve({ok:false,error:'Diagnostic TOP window was not created.'});
  const webContentsId=win.webContents.id;
  const started=Date.now();
  return new Promise(resolve=>{
    const tick=()=>{
      const failure=auxiliaryFailures.get(webContentsId);
      if(failure)return resolve({ok:false,error:String(failure.error||'TOP renderer failed.'),durationMs:Date.now()-started});
      if(!win||win.isDestroyed())return resolve({ok:false,error:'Diagnostic TOP window closed before ready.',durationMs:Date.now()-started});
      if(auxiliaryReady.has(webContentsId))return resolve({ok:true,durationMs:Date.now()-started});
      if(Date.now()-started>=timeoutMs)return resolve({ok:false,error:`TOP renderer did not reach ready within ${timeoutMs} ms.`,durationMs:Date.now()-started,timeout:true});
      setTimeout(tick,50);
    };
    tick();
  });
}

async function runDiagnosticActivitySmoke(ownerWindow,payload={}){
  const activityId=String(payload?.activityId||'').trim();
  if(!ownerWindow||ownerWindow.isDestroyed())throw new Error('Main application window is unavailable.');
  if(!activityId)throw new Error('Diagnostic activity id is required.');
  const spec=resolveConfiguredPluginWindow(activityId);
  if(!spec)return {ok:false,activityId,error:'No independent TOP window is configured for this activity.'};
  const projectTabId=`__dkds_automation__${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const project={version:app.getVersion(),datasets:[],plugins:{},dataModel:{schema:2,artifacts:[]}};
  const created=createOrFocusAuxiliaryWindow(ownerWindow,{activityId,projectTabId,project,projectPath:null,title:'自动化测试',prewarm:true,diagnosticRun:true,capabilitySnapshot:payload?.capabilitySnapshot||null,capabilityRevision:Number(payload?.capabilityRevision)||0});
  const key=auxiliaryWindowKey(ownerWindow.webContents.id,projectTabId,activityId);
  const win=auxiliaryWindows.get(key);
  const rendererProcessId=(()=>{try{return Number(win?.webContents?.getOSProcessId?.())||0;}catch{return 0;}})();
  const outcome=await waitForAuxiliaryDiagnosticOutcome(win,Math.max(4000,Math.min(30000,Number(payload?.timeoutMs)||15000)));
  let lifecycle={tested:false,ok:false};
  if(outcome.ok&&win&&!win.isDestroyed()){
    try{
      try{win.webContents.send('windows:activityWillShow');win.show();}catch{}
      await diagnosticDelay(80);
      const hidden=hideDedicatedAuxiliaryWindow(win);
      await diagnosticDelay(100);
      const hiddenSnapshot=await diagnosticRendererLifecycleSnapshot(win);
      const reopened=createOrFocusAuxiliaryWindow(ownerWindow,{activityId,projectTabId,project,projectPath:null,title:'自动化测试',prewarm:false,diagnosticRun:true,capabilitySnapshot:payload?.capabilitySnapshot||null,capabilityRevision:Number(payload?.capabilityRevision)||0});
      await diagnosticDelay(160);
      const visibleSnapshot=await diagnosticRendererLifecycleSnapshot(win);
      lifecycle={tested:true,hidden:!!hidden,reused:reopened?.reused===true,alive:!win.isDestroyed(),visible:!win.isDestroyed()&&win.isVisible(),hiddenContract:lifecycleSnapshotSuspended(hiddenSnapshot,true),visibleContract:lifecycleSnapshotSuspended(visibleSnapshot,false),hiddenSnapshot,visibleSnapshot};
      lifecycle.ok=lifecycle.hidden&&lifecycle.reused&&lifecycle.alive&&lifecycle.hiddenContract&&lifecycle.visibleContract;
    }catch(err){lifecycle={tested:true,ok:false,error:String(err?.message||err)};}
  }
  const startupProfile=win&&!win.isDestroyed()?structuredClone(auxiliaryStartupProfiles.get(win.webContents.id)||null):null;
  const details={...outcome,activityId,pluginId:spec.pluginId,mode:spec.mode||'dedicated',version:spec.version||'',rendererProcessId,dependencies:[...(spec.dependencies||[])],scripts:[...(spec.scripts||[])],persistence:spec.persistence||'',created,startupProfile,lifecycle};
  closeAuxiliaryWindowForReal(win);
  return details;
}

function diagnosticsDirectory(){
  const dir=path.join(app.getPath('userData'),'diagnostics');
  fs.mkdirSync(dir,{recursive:true});
  return dir;
}

function diagnosticEnvironment(){
  const metrics=app.getAppMetrics();
  const memory=metrics.reduce((sum,row)=>{const m=row?.memory||{};sum.workingSetBytes+=(Number(m.workingSetSize)||0)*1024;sum.privateBytes+=(Number(m.privateBytes)||0)*1024;return sum;},{workingSetBytes:0,privateBytes:0});
  return {runtime:'desktop',appVersion:app.getVersion(),platform:process.platform,arch:process.arch,osRelease:os.release(),isPackaged:app.isPackaged,locale:app.getLocale?.()||'',processVersions:{electron:process.versions.electron||'',chrome:process.versions.chrome||'',node:process.versions.node||''},processCount:metrics.length,memory,windowCount:BrowserWindow.getAllWindows().filter(win=>!win.isDestroyed()).length,configuredTopWindows:listConfiguredPluginWindows().map(row=>({pluginId:row.pluginId,activity:row.activity,mode:row.mode||'dedicated',version:row.version,prewarm:row.prewarm,reuse:row.reuse,persistence:row.persistence}))};
}

function requestAuxiliaryRoleSnapshot(win, reason='host-role-change', timeoutMs=1800) {
  if (!win || win.isDestroyed()) return Promise.resolve(null);
  const webContentsId=win.webContents.id;
  if(!auxiliaryReady.has(webContentsId)||auxiliaryFailures.has(webContentsId))return Promise.resolve(null);
  const bootstrap=auxiliaryBootstrap.get(webContentsId)||null;
  if(!bootstrap)return Promise.resolve(null);
  const requestId=`role-${process.pid}-${Date.now()}-${++auxiliaryRoleSnapshotSeq}`;
  return new Promise(resolve=>{
    const timer=setTimeout(()=>{
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      resolve(null);
    },Math.max(250,Number(timeoutMs)||1800));
    pendingAuxiliaryRoleSnapshots.set(requestId,{resolve,timer,webContentsId,bootstrap});
    try{win.webContents.send('windows:activityRoleSnapshotRequest',{requestId,reason});}
    catch{
      clearTimeout(timer);
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      resolve(null);
    }
  });
}

function wrapAuxiliaryRoleSnapshot(bootstrap,snapshot={}) {
  return {
    projectTabId:String(bootstrap?.projectTabId||''),
    activityId:String(bootstrap?.activityId||''),
    pluginId:String(bootstrap?.pluginWindow?.pluginId||''),
    persistence:bootstrap?.pluginWindow?.persistence||'project',
    project:snapshot?.project||null,
    pluginState:snapshot?.pluginState??null,
    artifactDelta:snapshot?.artifactDelta||null,
    final:true
  };
}

function createOrFocusAuxiliaryWindow(ownerWindow, payload = {}) {
  const startupRequestedAtMs=Date.now();
  const activityId = String(payload.activityId || '').trim();
  const projectTabId = String(payload.projectTabId || '').trim();
  if (!activityId || !projectTabId) throw new Error('Missing auxiliary activity/project id.');

  const ownerWebContentsId = ownerWindow?.webContents?.id;
  if (!ownerWebContentsId) throw new Error('Main window is no longer available.');

  const resolveStartedAtMs=Date.now();
  const pluginWindow = resolveConfiguredPluginWindow(activityId);
  const resolveSpecMs=Date.now()-resolveStartedAtMs;
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
      || cachedBootstrap.prewarm !== nextBootstrap.prewarm
      || cachedBootstrap.capabilityRevision !== nextBootstrap.capabilityRevision;
    const promoteFromPrewarm = cachedBootstrap?.prewarm === true && nextBootstrap.prewarm !== true;
    auxiliaryBootstrap.set(previous.webContents.id, nextBootstrap);

    // Runtime-only prewarm marks the hidden renderer ready after Core/plugin/chart
    // code is loaded, but before domain project state or the activity is mounted.
    // First user open must therefore wait for a second, hydrated readiness signal.
    // Never show the prewarmed DOM early just because the runtime shell is warm.
    if (promoteFromPrewarm) {
      auxiliaryReady.delete(previous.webContents.id);
      auxiliaryFailures.delete(previous.webContents.id);
      auxiliaryPendingShow.add(previous.webContents.id);
    }

    // A cached plugin renderer keeps its runtime and chart libraries. Only push
    // bootstrap replacement when project/capability/prewarm state changed.
    if (projectChanged) previous.webContents.send('windows:activityBootstrapChanged');

    if (payload.prewarm === true) {
      return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:auxiliaryReady.has(previous.webContents.id) };
    }

    if (previous.isMinimized()) previous.restore();
    if (promoteFromPrewarm) {
      return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, warming:true, prewarmed:true };
    }
    if (pluginWindow && !auxiliaryReady.has(previous.webContents.id)) {
      const failure=auxiliaryFailures.get(previous.webContents.id);
      if(failure){
        try { previous.webContents.send('windows:activityWillShow'); } catch {}
        previous.show();
        previous.focus();
        return { reused:true, dedicated:true, synchronized:projectChanged, failed:true, error:failure.error };
      }
      auxiliaryPendingShow.add(previous.webContents.id);
      return { reused:true, dedicated:true, synchronized:projectChanged, warming:true };
    }

    try { previous.webContents.send('windows:activityWillShow'); } catch {}
    previous.show();
    previous.focus();
    return { reused:true, dedicated:!!pluginWindow, synchronized:projectChanged, ready:true };
  }

  const browserWindowStartedAtMs=Date.now();
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
    webPreferences: {
      ...commonWindowPreferences(),
      // A hidden dedicated TOP may be intentionally warming its declared Core,
      // SDK and chart runtimes. Chromium background throttling must not postpone
      // that generic warmup until the user finally opens the window.
      backgroundThrottling:false
    }
  });
  win.setMenuBarVisibility(false);
  const browserWindowCreateMs=Date.now()-browserWindowStartedAtMs;
  auxiliaryWindows.set(key, win);
  const auxiliaryWebContentsId = win.webContents.id;
  const startupProfile={version:'1.0.0',createdAtMs:startupRequestedAtMs,activityId,pluginId:String(pluginWindow?.pluginId||''),main:{resolveSpecMs,browserWindowCreateMs,navigationMs:null,createToReadyMs:null}};
  auxiliaryStartupProfiles.set(auxiliaryWebContentsId,startupProfile);
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
    auxiliaryFailures.delete(auxiliaryWebContentsId);
    auxiliaryPendingShow.delete(auxiliaryWebContentsId);
    auxiliaryStartupProfiles.delete(auxiliaryWebContentsId);
    for(const [requestId,pending] of pendingAuxiliaryRoleSnapshots){
      if(pending.webContentsId!==auxiliaryWebContentsId)continue;
      clearTimeout(pending.timer);
      pendingAuxiliaryRoleSnapshots.delete(requestId);
      pending.resolve(null);
    }
  });
  ownerWindow.once('closed', () => closeAuxiliaryWindowForReal(win));
  win.webContents.on('render-process-gone', (_event, details={}) => {
    if(appQuitting||forcedAuxiliaryClose.has(win)||win.isDestroyed())return;
    const reason=String(details?.reason||'unknown');
    const bootstrap=auxiliaryBootstrap.get(auxiliaryWebContentsId)||{};
    const owner=BrowserWindow.getAllWindows().find(candidate=>!candidate.isDestroyed()&&candidate.webContents.id===bootstrap.ownerWebContentsId);
    const failure={
      activityId:String(bootstrap.activityId||''),
      projectTabId:String(bootstrap.projectTabId||''),
      pluginId:String(bootstrap.pluginWindow?.pluginId||''),
      error:`插件独立窗口异常退出（${reason}），再次打开时将自动重建。`
    };
    if(!bootstrap.diagnosticRun)try{owner?.webContents?.send?.('windows:activityFailed',failure);}catch{}
    auxiliaryReady.delete(auxiliaryWebContentsId);
    if(bootstrap.diagnosticRun)auxiliaryFailures.set(auxiliaryWebContentsId,failure);
    else auxiliaryFailures.delete(auxiliaryWebContentsId);
    auxiliaryPendingShow.delete(auxiliaryWebContentsId);
    closeAuxiliaryWindowForReal(win);
  });

  const navigationStartedAtMs=Date.now();
  win.webContents.once('did-finish-load',()=>{
    const profile=auxiliaryStartupProfiles.get(auxiliaryWebContentsId);
    if(profile){profile.main=profile.main||{};profile.main.navigationMs=Date.now()-navigationStartedAtMs;}
  });
  if (!pluginWindow) throw new Error(`Activity ${activityId} has no plugin-owned window contract.`);
  if (payload.prewarm !== true) auxiliaryPendingShow.add(auxiliaryWebContentsId);
  win.loadFile(path.join(__dirname, 'src', 'plugin-window', 'index.html'));
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
      const timer=setTimeout(()=>{pendingCapabilityInvocations.delete(requestId);reject(new Error(`Capability invocation timed out: ${request.id}.${request.method}`));},15000);
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

  ipcMain.handle('plugins:listExternal', async () => {const result=readInstalledExternalPlugins();return {...result,packages:(result.packages||[]).map(pkg=>({...pkg,compatibilityStatus:packageCompatibility(pkg.manifest) }))};});
  ipcMain.handle('plugins:listOverrides', async () => {const result=readInstalledPluginOverrides();return {...result,packages:(result.packages||[]).map(pkg=>({...pkg,compatibilityStatus:packageCompatibility(pkg.manifest) }))};});
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
    assertPackageCompatible(pkg.manifest,'install/update');
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
    if(previousPackage)archiveExternalPluginPackage(previousPackage,'upgrade');
    const normalized={...pkg,installedAt:new Date().toISOString()};
    const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp,JSON.stringify(normalized,null,2)+'\n','utf8');
    if(fs.existsSync(target))fs.rmSync(target,{force:true});
    fs.renameSync(tmp,target);
    return {...normalized,installedPath:target,previousPackage};
  });
  ipcMain.handle('plugins:historyList', async (_event, id) => {
    const pluginId=String(id||'');
    return listExternalPluginHistory(pluginId);
  });
  ipcMain.handle('plugins:algorithmCatalog', async (_event, ref) => algorithmPackageCatalog(ref||{}));
  ipcMain.handle('plugins:rollbackVersion', async (_event, payload) => {
    const id=String(payload?.id||'');const token=path.basename(String(payload?.token||''));
    if(!validPluginId(id)||id.startsWith('builtin.')||!token.toLowerCase().endsWith('.dkplugin'))throw new Error('无效的插件回退请求。');
    const historyPath=path.join(pluginHistoryDirectory(id),token);if(!fs.existsSync(historyPath))throw new Error('指定的插件历史版本不存在。');
    const selected=normalizePluginPackage(JSON.parse(fs.readFileSync(historyPath,'utf8')),{allowBuiltinId:false});if(selected.manifest.id!==id)throw new Error('插件历史版本 ID 不匹配。');
    assertPackageCompatible(selected.manifest,'rollback');
    const target=path.join(ensureExternalPluginDirectory(),pluginPackageFileName(id));let previousPackage=null;
    if(fs.existsSync(target)){previousPackage=normalizePluginPackage(JSON.parse(fs.readFileSync(target,'utf8')),{allowBuiltinId:false});archiveExternalPluginPackage(previousPackage,'rollback');}
    const restored={...selected,installedAt:new Date().toISOString()};atomicWritePluginPackage(target,restored);
    return {...restored,installedPath:target,previousPackage};
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
    fs.writeFileSync(filePath, DKDSProjectFormat.serializeProject(payload.project || {}), 'utf8');
    return filePath;
  });

  ipcMain.handle('system:getRuntimeStatus', async () => {
    const metrics = app.getAppMetrics();
    const memory = metrics.reduce((sum, row) => {
      const m = row?.memory || {};
      sum.workingSetBytes += (Number(m.workingSetSize) || 0) * 1024;
      sum.peakWorkingSetBytes += (Number(m.peakWorkingSetSize) || 0) * 1024;
      sum.privateBytes += (Number(m.privateBytes) || 0) * 1024;
      return sum;
    }, { workingSetBytes:0, peakWorkingSetBytes:0, privateBytes:0 });
    return {
      runtime:'desktop',
      platform:process.platform,
      isPackaged:app.isPackaged,
      processCount:metrics.length,
      memory
    };
  });

  ipcMain.handle('files:openProject', async () => {
    const result = await dialog.showOpenDialog({
      title: '打开 DK Data Studio 项目', properties: ['openFile'],
      filters: [{ name: 'DK Data Studio Project', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const parsed=DKDSProjectFormat.parseProjectBytes(fs.readFileSync(filePath));
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

app.on('before-quit', () => { appQuitting = true; try { lanUpdater?.stop(); } catch {} try { lanWebServer?.stop(false); } catch {} });
