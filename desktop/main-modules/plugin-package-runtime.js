'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {normalizePluginPackage,pluginPackageFileName,validPluginId}=require('../plugin-package');
const AlgorithmPackageCatalog=require('../algorithm-package-catalog');
const PluginOverridePolicy=require('../plugin-override-policy');
const PluginSdkContract=require('../../sdk/contract.json');

function createPluginPackageRuntime({app,BrowserWindow}){
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
  if(!validPluginId(pluginId))throw new Error('无效的插件历史 ID。');
  return path.join(pluginHistoryRootDirectory(),pluginId);
}
function normalizePackageForInstalledId(pkg,id=''){
  const pluginId=String(id||pkg?.manifest?.id||'').trim();
  return normalizePluginPackage(pkg,{allowBuiltinId:builtinPluginIds().has(pluginId)});
}
function archivePluginPackage(pkg,reason='update'){
  if(!pkg?.manifest?.id)return null;
  const normalized=normalizePackageForInstalledId(pkg);
  const dir=pluginHistoryDirectory(normalized.manifest.id);fs.mkdirSync(dir,{recursive:true});
  const version=String(normalized.manifest.version||'0.0.0').replace(/[^0-9A-Za-z._-]/g,'_');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const fileName=`${version}--${stamp}.dkplugin`;
  const payload={...normalized,archivedAt:new Date().toISOString(),archiveReason:String(reason||'update')};
  atomicWritePluginPackage(path.join(dir,fileName),payload);
  return fileName;
}
function listPluginHistory(id){
  const pluginId=String(id||'');const dir=pluginHistoryDirectory(pluginId);const versions=[];if(!fs.existsSync(dir))return versions;
  const allowBuiltinId=builtinPluginIds().has(pluginId);
  for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort().reverse()){
    try{const raw=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),pkg=normalizePluginPackage(raw,{allowBuiltinId});if(pkg.manifest.id!==pluginId)continue;versions.push({token:name,version:String(pkg.manifest.version||''),name:String(pkg.manifest.name||pluginId),archivedAt:String(raw.archivedAt||''),archiveReason:String(raw.archiveReason||'update')});}catch{}
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

const PLUGIN_API_VERSION=String(PluginSdkContract.pluginApiVersion||'').trim();
if(!PLUGIN_API_VERSION)throw new Error('sdk/contract.json is missing pluginApiVersion.');

const pendingPluginInstalls=new Map();
function pluginInstallCompatibilityDetails(result){
  return (result?.issues||[]).map(issue=>({
    kind:String(issue?.kind||'compatibility'),
    id:String(issue?.id||''),
    required:String(issue?.required||''),
    actual:String(issue?.actual||'missing')
  }));
}
function pluginInstallErrorPayload(error,{code='PLUGIN_INSTALL_FAILED',title='插件安装失败',manifest=null,compatibility=null}={}){
  const message=String(error?.message||error||'未知错误').replace(/^Error:\s*/,'').trim();
  return {
    code,
    title,
    message,
    plugin:manifest?{id:String(manifest.id||''),name:String(manifest.name||manifest.id||''),version:String(manifest.version||''),type:String(manifest.pluginType||'extension')} : null,
    compatibility:compatibility?{
      compatible:!!compatibility.compatible,
      issues:pluginInstallCompatibilityDetails(compatibility),
      appVersion:String(app.getVersion()||''),
      pluginApiVersion:PLUGIN_API_VERSION,
      requiredApp:String(manifest?.compatibility?.app||'*'),
      requiredPluginApi:String(manifest?.compatibility?.pluginApi||manifest?.apiVersion||'*')
    }:null,
    versionContext:(error?.currentVersion||error?.bundledVersion)?{
      currentVersion:String(error?.currentVersion||''),
      bundledVersion:String(error?.bundledVersion||'')
    }:null
  };
}
function sweepPendingPluginInstalls(){
  const cutoff=Date.now()-10*60*1000;
  for(const [token,row] of pendingPluginInstalls)if(Number(row?.createdAt||0)<cutoff)pendingPluginInstalls.delete(token);
}
function readBuiltinPluginManifests(){
  const base=path.join(app.getAppPath(),'src','plugins'),rows=[];
  try{for(const name of fs.readdirSync(base).sort()){if(name.startsWith('_'))continue;const manifestPath=path.join(base,name,'plugin.json');if(!fs.existsSync(manifestPath))continue;try{const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(manifest?.id)rows.push({manifest,source:'builtin',current:true,installed:true});}catch{}}}catch{}
  return rows;
}

function readBuiltinPluginPackage(id){
  const pluginId=String(id||'');const base=path.join(app.getAppPath(),'src','plugins');
  for(const name of fs.readdirSync(base).sort()){
    if(name.startsWith('_'))continue;const folder=path.join(base,name),manifestPath=path.join(folder,'plugin.json');if(!fs.existsSync(manifestPath))continue;
    let manifest;try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}catch{continue;}if(String(manifest?.id||'')!==pluginId)continue;
    const referenced=new Set([manifest.entry||'plugin.js',...(manifest.scripts||[]),...(manifest.styles||[]),...(manifest.window?.runtime?[manifest.window.runtime]:[]),...(manifest.window?.scripts||[])]);
    if(fs.existsSync(path.join(folder,'README.md')))referenced.add('README.md');const files={};
    for(const rel of referenced){const normalized=String(rel).replace(/\\/g,'/');const file=path.resolve(folder,normalized);if(!file.startsWith(folder+path.sep)&&file!==folder)throw new Error(`Unsafe built-in plugin path: ${normalized}`);if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error(`Built-in plugin file missing: ${normalized}`);files[normalized]=fs.readFileSync(file,'utf8');}
    return normalizePluginPackage({schema:1,manifest,files},{allowBuiltinId:true});
  }
  return null;
}

function currentPluginPackage(id){
  const pluginId=String(id||'');
  const override=installedPluginOverridePackages().find(pkg=>String(pkg?.manifest?.id||'')===pluginId);if(override)return normalizePluginPackage(override,{allowBuiltinId:true});
  const external=installedExternalPluginPackages().find(pkg=>String(pkg?.manifest?.id||'')===pluginId);if(external)return normalizePluginPackage(external,{allowBuiltinId:false});
  return readBuiltinPluginPackage(pluginId);
}
function installedPluginVersionMap(){
  const map=new Map();for(const row of readBuiltinPluginManifests())map.set(String(row.manifest.id),String(row.manifest.version||''));
  for(const pkg of installedPluginOverridePackages())map.set(String(pkg.manifest.id),String(pkg.manifest.version||''));
  for(const pkg of installedExternalPluginPackages())map.set(String(pkg.manifest.id),String(pkg.manifest.version||''));
  return map;
}
function currentCompatibilityEnvironment(){return {appVersion:String(app.getVersion()||''),pluginApiVersion:PLUGIN_API_VERSION,themeContractVersion:String(PluginSdkContract.themeContractVersion||''),installedVersions:installedPluginVersionMap()};}
function packageCompatibility(manifest){return AlgorithmPackageCatalog.compatibility(manifest,currentCompatibilityEnvironment());}
function assertPackageCompatible(manifest,action='install'){const result=packageCompatibility(manifest);if(result.compatible)return result;const details=result.issues.map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ');throw new Error(`Plugin package is not compatible with this DK Data Studio environment for ${action}: ${details}`);}
function readAlgorithmHistoryCatalogPackages(){
  const root=pluginHistoryRootDirectory(),rows=[];if(!fs.existsSync(root))return rows;
  const bundledIds=builtinPluginIds();
  for(const id of fs.readdirSync(root).sort()){let dir;try{dir=pluginHistoryDirectory(id);}catch{continue;}if(!fs.existsSync(dir))continue;for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort().reverse()){try{const raw=JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')),pkg=normalizePluginPackage(raw,{allowBuiltinId:bundledIds.has(id)});rows.push({manifest:pkg.manifest,source:'history',token:name,current:false,installed:false});}catch{}}}
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
  const packagedIds=builtinPluginIds();
  for (const name of fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.dkplugin')).sort()) {
    const filePath = path.join(dir, name);
    try {
      const parsed=JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const packageId=String(parsed?.manifest?.id||'').trim();
      // Shipped first-party plugins are authoritative. A stale user-installed
      // copy of the same stable id is not an external candidate and must be
      // filtered before Plugin API normalization/compatibility diagnostics.
      if(packageId&&packagedIds.has(packageId))continue;
      const pkg = normalizePluginPackage(parsed, { allowBuiltinId:false });
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
      if(!builtinIds.has(pkg.manifest.id))throw new Error(`Override target is not a packaged built-in plugin: ${pkg.manifest.id}`);
      packages.push({...pkg,installedPath:filePath});
    }catch(err){errors.push({file:name,error:err?.message||String(err)});}
  }
  return {packages,errors,directory:dir};
}
function classifyInstalledPluginOverrides(result=readInstalledPluginOverrides()){
  return PluginOverridePolicy.classify(result?.packages||[],readBuiltinPluginManifests());
}
function installedPluginOverridePackages(){return classifyInstalledPluginOverrides().active;}

function isBundledPluginId(id){return builtinPluginIds().has(String(id||''));}
function normalizeInstallCandidate(raw){
  const id=String(raw?.manifest?.id||'').trim();
  return normalizePluginPackage(raw,{allowBuiltinId:isBundledPluginId(id)});
}
function bundledManifest(id){return readBuiltinPluginManifests().find(row=>String(row?.manifest?.id||'')===String(id||''))?.manifest||null;}
function installedOverridePackage(id){return readInstalledPluginOverrides().packages.find(pkg=>String(pkg?.manifest?.id||'')===String(id||''))||null;}
function installedExternalPackage(id){return readInstalledExternalPlugins().packages.find(pkg=>String(pkg?.manifest?.id||'')===String(id||''))||null;}
function pluginInstallPlan(raw){
  const pkg=normalizeInstallCandidate(raw),manifest=pkg.manifest,id=String(manifest.id||''),compatibility=packageCompatibility(manifest);
  const bundled=isBundledPluginId(id),bundledRow=bundled?bundledManifest(id):null;
  if(bundled){
    const activeOverride=installedPluginOverridePackages().find(row=>String(row?.manifest?.id||'')===id)||null;
    const effectiveVersion=String(activeOverride?.manifest?.version||bundledRow?.version||'0.0.0');
    if(!PluginOverridePolicy.isNewerVersion(String(manifest.version||'0.0.0'),effectiveVersion)){
      const error=new Error(`内置插件更新版本必须高于当前有效版本：${manifest.version} ≤ ${effectiveVersion}`);
      error.code='PLUGIN_VERSION_NOT_NEWER';error.title='插件版本未提高';error.currentVersion=effectiveVersion;error.bundledVersion=String(bundledRow?.version||'');throw error;
    }
    const previousPackage=installedOverridePackage(id);
    return {pkg,manifest,compatibility,installationKind:'override',requiresRestart:true,target:path.join(ensurePluginOverrideDirectory(),pluginPackageFileName(id)),exists:true,previousPackage,previousVersion:effectiveVersion,bundledVersion:String(bundledRow?.version||'')};
  }
  const previousPackage=installedExternalPackage(id);
  return {pkg,manifest,compatibility,installationKind:'external',requiresRestart:false,target:path.join(ensureExternalPluginDirectory(),pluginPackageFileName(id)),exists:!!previousPackage,previousPackage,previousVersion:String(previousPackage?.manifest?.version||''),bundledVersion:''};
}
function pluginRollbackPlan(id,raw){
  const pluginId=String(id||'');if(!validPluginId(pluginId))throw new Error('无效的插件回退 ID。');
  const bundled=isBundledPluginId(pluginId),pkg=normalizePluginPackage(raw,{allowBuiltinId:bundled});if(pkg.manifest.id!==pluginId)throw new Error('插件历史版本 ID 不匹配。');
  const compatibility=packageCompatibility(pkg.manifest);
  if(bundled){
    const bundledVersion=String(bundledManifest(pluginId)?.version||'0.0.0');
    if(!PluginOverridePolicy.isNewerVersion(String(pkg.manifest.version||'0.0.0'),bundledVersion)){
      const error=new Error(`历史版本 ${pkg.manifest.version} 已不高于当前内置基线 ${bundledVersion}；请直接恢复内置版本。`);error.code='PLUGIN_HISTORY_SHADOWED_BY_BUNDLED';error.title='历史版本已被内置版本取代';throw error;
    }
    return {pkg,manifest:pkg.manifest,compatibility,installationKind:'override',requiresRestart:true,target:path.join(ensurePluginOverrideDirectory(),pluginPackageFileName(pluginId)),previousPackage:installedOverridePackage(pluginId),previousVersion:String(installedPluginOverridePackages().find(row=>String(row?.manifest?.id||'')===pluginId)?.manifest?.version||bundledVersion),bundledVersion};
  }
  const previousPackage=installedExternalPackage(pluginId);
  return {pkg,manifest:pkg.manifest,compatibility,installationKind:'external',requiresRestart:false,target:path.join(ensureExternalPluginDirectory(),pluginPackageFileName(pluginId)),previousPackage,previousVersion:String(previousPackage?.manifest?.version||''),bundledVersion:''};
}

function commitPluginInstall(plan,{archiveReason='upgrade',generatedBy=''}={}){
  const {pkg,target,previousPackage,installationKind,requiresRestart}=plan||{};if(!pkg?.manifest?.id||!target)throw new Error('无效的插件安装计划。');
  if(previousPackage)archivePluginPackage(previousPackage,archiveReason);
  const installed={...pkg,installedAt:new Date().toISOString(),...(generatedBy?{generatedBy:String(generatedBy)}:{})};
  atomicWritePluginPackage(target,installed);
  return {...installed,installedPath:target,previousPackage,installationKind,requiresRestart:!!requiresRestart};
}
function restoreInstalledPackage(id,pkg=null){
  const pluginId=String(id||pkg?.manifest?.id||'');if(!validPluginId(pluginId))throw new Error('无效的插件回滚 ID。');
  const bundled=isBundledPluginId(pluginId),target=path.join(bundled?ensurePluginOverrideDirectory():ensureExternalPluginDirectory(),pluginPackageFileName(pluginId));
  if(!pkg){if(fs.existsSync(target))fs.rmSync(target,{force:true});return {ok:true,id:pluginId,installationKind:bundled?'override':'external',requiresRestart:bundled};}
  const normalized=normalizePluginPackage(pkg,{allowBuiltinId:bundled});if(normalized.manifest.id!==pluginId)throw new Error('插件回滚包 ID 不匹配。');
  atomicWritePluginPackage(target,normalized);return {ok:true,id:pluginId,package:{...normalized,installedPath:target},installationKind:bundled?'override':'external',requiresRestart:bundled};
}

async function installLanPluginPackage(buffer,metadata={}) {
  const raw=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||'');
  if(!raw.length)throw new Error('LAN plugin package is empty.');
  const sha256=crypto.createHash('sha256').update(raw).digest('hex');
  if(metadata.sha256&&String(metadata.sha256).toLowerCase()!==sha256)throw new Error('LAN plugin package SHA256 mismatch.');
  const parsed=JSON.parse(raw.toString('utf8'));
  const id=String(parsed?.manifest?.id||'');
  if(metadata.id&&String(metadata.id)!==id)throw new Error(`LAN plugin id mismatch: ${id} != ${metadata.id}`);
  const isBuiltin=isBundledPluginId(id);
  const pkg=normalizePluginPackage(parsed,{allowBuiltinId:isBuiltin});
  assertPackageCompatible(pkg.manifest,'LAN update');
  const state=readPluginLanState();
  if(state[id]?.sha256===sha256)return {installed:false,skipped:true,id,version:pkg.manifest.version,sha256};

  let target,kind;
  if(isBuiltin){
    if(!builtinPluginIds().has(id))throw new Error(`LAN update cannot introduce unknown built-in plugin: ${id}`);
    const bundled=readBuiltinPluginManifests().find(row=>String(row?.manifest?.id||'')===id)?.manifest||null;
    const bundledVersion=String(bundled?.version||'0.0.0');
    if(!PluginOverridePolicy.isNewerThanBuiltin(pkg,bundledVersion)){
      return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'not-newer-than-bundled',bundledVersion};
    }
    const installedOverride=readInstalledPluginOverrides().packages.find(row=>String(row?.manifest?.id||'')===id)||null;
    if(installedOverride&&!PluginOverridePolicy.isNewerThanBuiltin(pkg,String(installedOverride.manifest.version||'0.0.0'))){
      return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'not-newer-than-installed-override',installedVersion:String(installedOverride.manifest.version||'')};
    }
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
  return Object.freeze({
    PLUGIN_API_VERSION,
    pendingPluginInstalls,
    externalPluginDirectory,ensureExternalPluginDirectory,
    pluginOverrideDirectory,ensurePluginOverrideDirectory,
    pluginHistoryRootDirectory,pluginHistoryDirectory,archivePluginPackage,listPluginHistory,
    readPluginLanState,writePluginLanState,atomicWritePluginPackage,builtinPluginIds,
    pluginInstallCompatibilityDetails,pluginInstallErrorPayload,sweepPendingPluginInstalls,
    readBuiltinPluginManifests,readBuiltinPluginPackage,currentPluginPackage,installedPluginVersionMap,
    currentCompatibilityEnvironment,packageCompatibility,assertPackageCompatible,readAlgorithmHistoryCatalogPackages,algorithmPackageCatalog,
    readInstalledExternalPlugins,installedExternalPluginPackages,readInstalledPluginOverrides,classifyInstalledPluginOverrides,installedPluginOverridePackages,
    isBundledPluginId,normalizeInstallCandidate,pluginInstallPlan,pluginRollbackPlan,commitPluginInstall,restoreInstalledPackage,
    installLanPluginPackage
  });
}

module.exports={createPluginPackageRuntime};
