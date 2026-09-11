'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {normalizePluginPackage,pluginPackageFileName,validPluginId,referencedPluginAssets}=require('../plugin-package');
const AlgorithmPackageCatalog=require('../algorithm-package-catalog');
const PluginOverridePolicy=require('../plugin-override-policy');
const PluginSdkContract=require('../../sdk/contract.json');
const PlatformPresentation=require('../../sdk/platform-presentation-contract');

function createPluginPackageRuntime({app,BrowserWindow}){
  function externalPluginDirectory(){return path.join(app.getPath('userData'),'plugins');}
  function ensureExternalPluginDirectory(){const dir=externalPluginDirectory();fs.mkdirSync(dir,{recursive:true});return dir;}
  function pluginOverrideDirectory(){return path.join(app.getPath('userData'),'plugin-overrides');}
  function ensurePluginOverrideDirectory(){const dir=pluginOverrideDirectory();fs.mkdirSync(dir,{recursive:true});return dir;}
  function pluginLanStatePath(){return path.join(app.getPath('userData'),'plugin-lan-update-state.json');}
  function readPluginLanState(){try{return JSON.parse(fs.readFileSync(pluginLanStatePath(),'utf8'))||{};}catch{return {};}}
  function writePluginLanState(state){const target=pluginLanStatePath();fs.mkdirSync(path.dirname(target),{recursive:true});const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(state,null,2)+'\n','utf8');if(fs.existsSync(target))fs.rmSync(target,{force:true});fs.renameSync(tmp,target);}
  function atomicWritePluginPackage(target,pkg){fs.mkdirSync(path.dirname(target),{recursive:true});const tmp=`${target}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(pkg,null,2)+'\n','utf8');if(fs.existsSync(target))fs.rmSync(target,{force:true});fs.renameSync(tmp,target);}

  function readBuiltinPluginManifests(){
    const base=path.join(app.getAppPath(),'src','plugins'),rows=[];
    try{for(const name of fs.readdirSync(base).sort()){if(name.startsWith('_'))continue;const manifestPath=path.join(base,name,'plugin.json');if(!fs.existsSync(manifestPath))continue;try{const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));if(manifest?.id)rows.push({manifest,source:'builtin',current:true,installed:true});}catch{}}}catch{}
    return rows;
  }
  function builtinPluginIds(){return new Set(readBuiltinPluginManifests().map(row=>String(row.manifest.id)));}
  function bundledManifest(id){return readBuiltinPluginManifests().find(row=>String(row?.manifest?.id||'')===String(id||''))?.manifest||null;}

  const PLUGIN_API_VERSION=String(PluginSdkContract.pluginApiVersion||'').trim();
  if(!PLUGIN_API_VERSION)throw new Error('sdk/contract.json is missing pluginApiVersion.');
  const pendingPluginInstalls=new Map();

  function pluginInstallErrorPayload(error,{code='PLUGIN_INSTALL_FAILED',title='插件安装失败',manifest=null}={}){
    const message=String(error?.message||error||'未知错误').replace(/^Error:\s*/,'').trim();
    return {code,title,message,plugin:manifest?{id:String(manifest.id||''),name:String(manifest.name||manifest.id||''),version:String(manifest.version||''),type:String(manifest.pluginType||'extension')}:null,versionContext:(error?.currentVersion||error?.bundledVersion)?{currentVersion:String(error?.currentVersion||''),bundledVersion:String(error?.bundledVersion||'')}:null};
  }
  function sweepPendingPluginInstalls(){const cutoff=Date.now()-10*60*1000;for(const [token,row] of pendingPluginInstalls)if(Number(row?.createdAt||0)<cutoff)pendingPluginInstalls.delete(token);}

  function readBuiltinPluginPackage(id){
    const pluginId=String(id||''),base=path.join(app.getAppPath(),'src','plugins');
    for(const name of fs.readdirSync(base).sort()){
      if(name.startsWith('_'))continue;const folder=path.join(base,name),manifestPath=path.join(folder,'plugin.json');if(!fs.existsSync(manifestPath))continue;
      let manifest;try{manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));}catch{continue;}if(String(manifest?.id||'')!==pluginId)continue;
      if(!manifest.entry)throw new Error(`Built-in plugin ${pluginId} is missing manifest.entry.`);
      const referenced=new Set(referencedPluginAssets(manifest));
      if(fs.existsSync(path.join(folder,'README.md')))referenced.add('README.md');const files={};
      for(const rel of referenced){const normalized=String(rel).replace(/\\/g,'/');const file=path.resolve(folder,normalized);if(!file.startsWith(folder+path.sep)&&file!==folder)throw new Error(`Unsafe built-in plugin path: ${normalized}`);if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw new Error(`Built-in plugin file missing: ${normalized}`);files[normalized]=fs.readFileSync(file,'utf8');}
      return normalizePluginPackage({schema:1,manifest,files},{allowBuiltinId:true});
    }
    return null;
  }

  const retiredContractPackageError=err=>/unsupported current-contract(?: manifest)? fields|unsupported plugin api|manifest contains unsupported current-contract fields/i.test(String(err?.message||err||''));
  function readInstalledExternalPlugins(){
    const dir=ensureExternalPluginDirectory(),packages=[],errors=[],removed=[];
    for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort()){
      const filePath=path.join(dir,name);let parsed=null,id='';
      try{
        parsed=JSON.parse(fs.readFileSync(filePath,'utf8'));id=String(parsed?.manifest?.id||'').trim();
        if(id&&isBundledPluginId(id)){
          fs.rmSync(filePath,{force:true});removed.push({file:name,id,reason:'bundled-id-must-use-current-override-directory'});continue;
        }
        const pkg=normalizePluginPackage(parsed,{allowBuiltinId:false});packages.push({...pkg,installedPath:filePath});
      }catch(err){errors.push({file:name,...(id?{id}:{}),error:err?.message||String(err)});}
    }
    return {packages,errors,removed,directory:dir};
  }
  function installedExternalPluginPackages(){return readInstalledExternalPlugins().packages||[];}

  function readInstalledPluginOverrides(){
    const dir=ensurePluginOverrideDirectory(),packages=[],errors=[],removed=[];
    for(const name of fs.readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.dkplugin')).sort()){
      const filePath=path.join(dir,name);let id='';try{
        const raw=JSON.parse(fs.readFileSync(filePath,'utf8'));id=String(raw?.manifest?.id||'').trim();const bundled=id?bundledManifest(id):null;
        let pkg;try{pkg=normalizePluginPackage(raw,{allowBuiltinId:true});}
        catch(err){
          if(bundled&&retiredContractPackageError(err)){fs.rmSync(filePath,{force:true});removed.push({file:name,id,reason:'non-current-contract'});continue;}
          throw err;
        }
        id=String(pkg.manifest.id||'');
        if(!bundled){fs.rmSync(filePath,{force:true});removed.push({file:name,id,reason:'override-target-not-bundled'});continue;}
        if(!PluginOverridePolicy.isNewerVersion(pkg.manifest.version,bundled.version)){fs.rmSync(filePath,{force:true});removed.push({file:name,id,reason:'override-not-newer-than-bundled'});continue;}
        packages.push({...pkg,installedPath:filePath});
      }catch(err){errors.push({file:name,...(id?{id}:{}),error:err?.message||String(err)});}
    }
    return {packages,errors,removed,directory:dir};
  }
  function installedPluginOverridePackages(){return readInstalledPluginOverrides().packages||[];}

  function currentPluginPackage(id){
    const pluginId=String(id||''),overrideResult=readInstalledPluginOverrides(),overrideError=(overrideResult.errors||[]).find(row=>String(row?.id||'')===pluginId);
    if(overrideError)throw new Error(`Installed override failed current-contract validation for ${pluginId}: ${overrideError.error}`);
    const override=(overrideResult.packages||[]).find(pkg=>String(pkg?.manifest?.id||'')===pluginId);if(override)return normalizePluginPackage(override,{allowBuiltinId:true});
    const external=installedExternalPluginPackages().find(pkg=>String(pkg?.manifest?.id||'')===pluginId);if(external)return normalizePluginPackage(external,{allowBuiltinId:false});
    return readBuiltinPluginPackage(pluginId);
  }
  function installedPluginIds(){return new Set([...readBuiltinPluginManifests().map(row=>String(row.manifest.id)),...installedPluginOverridePackages().map(row=>String(row.manifest.id)),...installedExternalPluginPackages().map(row=>String(row.manifest.id))]);}
  function assertPluginDependencies(manifest,action='install'){
    const missing=(manifest?.pluginDependencies||[]).map(row=>String(row?.id||'').trim()).filter(id=>id&&!installedPluginIds().has(id));
    if(missing.length){const error=new Error(`Missing required current plugins for ${action}: ${missing.join(', ')}`);error.code='PLUGIN_DEPENDENCY_MISSING';error.title='缺少插件依赖';throw error;}
    return true;
  }
  function algorithmPackageCatalog(ref={}){
    const builtin=readBuiltinPluginManifests(),overrides=installedPluginOverridePackages().map(pkg=>({manifest:pkg.manifest,source:'override',current:true,installed:true})),external=installedExternalPluginPackages().map(pkg=>({manifest:pkg.manifest,source:'external',current:true,installed:true}));
    return AlgorithmPackageCatalog.catalog([...builtin,...overrides,...external],ref,installedPluginIds());
  }

  function isBundledPluginId(id){return builtinPluginIds().has(String(id||''));}
  function normalizeInstallCandidate(raw){const id=String(raw?.manifest?.id||'').trim();return normalizePluginPackage(raw,{allowBuiltinId:isBundledPluginId(id)});}
  function installedOverridePackage(id){return readInstalledPluginOverrides().packages.find(pkg=>String(pkg?.manifest?.id||'')===String(id||''))||null;}
  function installedExternalPackage(id){return readInstalledExternalPlugins().packages.find(pkg=>String(pkg?.manifest?.id||'')===String(id||''))||null;}
  function pluginInstallPlan(raw){
    const pkg=normalizeInstallCandidate(raw),manifest=pkg.manifest,id=String(manifest.id||'');assertPluginDependencies(manifest,'install');
    const bundled=isBundledPluginId(id),bundledRow=bundled?bundledManifest(id):null;
    if(bundled){
      const activeOverride=installedPluginOverridePackages().find(row=>String(row?.manifest?.id||'')===id)||null,effectiveVersion=String(activeOverride?.manifest?.version||bundledRow?.version||'0.0.0');
      if(!PluginOverridePolicy.isNewerVersion(String(manifest.version||'0.0.0'),effectiveVersion)){const error=new Error(`内置插件更新版本必须高于当前有效版本：${manifest.version} ≤ ${effectiveVersion}`);error.code='PLUGIN_VERSION_NOT_NEWER';error.title='插件版本未提高';error.currentVersion=effectiveVersion;error.bundledVersion=String(bundledRow?.version||'');throw error;}
      const previousPackage=installedOverridePackage(id);return {pkg,manifest,installationKind:'override',requiresRestart:true,target:path.join(ensurePluginOverrideDirectory(),pluginPackageFileName(id)),exists:true,previousPackage,previousVersion:effectiveVersion,bundledVersion:String(bundledRow?.version||'')};
    }
    const previousPackage=installedExternalPackage(id);return {pkg,manifest,installationKind:'external',requiresRestart:false,target:path.join(ensureExternalPluginDirectory(),pluginPackageFileName(id)),exists:!!previousPackage,previousPackage,previousVersion:String(previousPackage?.manifest?.version||''),bundledVersion:''};
  }
  function commitPluginInstall(plan,{generatedBy=''}={}){
    const {pkg,target,previousPackage,installationKind,requiresRestart}=plan||{};if(!pkg?.manifest?.id||!target)throw new Error('无效的插件安装计划。');
    const installed={...pkg,installedAt:new Date().toISOString(),...(generatedBy?{generatedBy:String(generatedBy)}:{})};atomicWritePluginPackage(target,installed);return {...installed,installedPath:target,previousPackage,installationKind,requiresRestart:!!requiresRestart};
  }
  function restoreInstalledPackage(id,pkg=null){
    const pluginId=String(id||pkg?.manifest?.id||'');if(!validPluginId(pluginId))throw new Error('无效的插件恢复 ID。');
    const bundled=isBundledPluginId(pluginId),target=path.join(bundled?ensurePluginOverrideDirectory():ensureExternalPluginDirectory(),pluginPackageFileName(pluginId));
    if(!pkg){if(fs.existsSync(target))fs.rmSync(target,{force:true});return {ok:true,id:pluginId,installationKind:bundled?'override':'external',requiresRestart:bundled};}
    const normalized=normalizePluginPackage(pkg,{allowBuiltinId:bundled});if(normalized.manifest.id!==pluginId)throw new Error('插件恢复包 ID 不匹配。');atomicWritePluginPackage(target,normalized);return {ok:true,id:pluginId,package:{...normalized,installedPath:target},installationKind:bundled?'override':'external',requiresRestart:bundled};
  }

  async function installLanPluginPackage(buffer,metadata={}){
    const raw=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer||'');if(!raw.length)throw new Error('LAN plugin package is empty.');
    const sha256=crypto.createHash('sha256').update(raw).digest('hex');if(metadata.sha256&&String(metadata.sha256).toLowerCase()!==sha256)throw new Error('LAN plugin package SHA256 mismatch.');
    const parsed=JSON.parse(raw.toString('utf8')),id=String(parsed?.manifest?.id||'');if(metadata.id&&String(metadata.id)!==id)throw new Error(`LAN plugin id mismatch: ${id} != ${metadata.id}`);
    const isBuiltin=isBundledPluginId(id),pkg=normalizePluginPackage(parsed,{allowBuiltinId:isBuiltin});assertPluginDependencies(pkg.manifest,'LAN update');
    const state=readPluginLanState();if(state[id]?.sha256===sha256)return {installed:false,skipped:true,id,version:pkg.manifest.version,sha256};
    let target,kind;
    if(isBuiltin){
      const bundled=bundledManifest(id),bundledVersion=String(bundled?.version||'0.0.0');if(!PluginOverridePolicy.isNewerThanBuiltin(pkg,bundledVersion))return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'not-newer-than-bundled',bundledVersion};
      const installedOverride=readInstalledPluginOverrides().packages.find(row=>String(row?.manifest?.id||'')===id)||null;if(installedOverride&&!PluginOverridePolicy.isNewerThanBuiltin(pkg,String(installedOverride.manifest.version||'0.0.0')))return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'not-newer-than-installed-override',installedVersion:String(installedOverride.manifest.version||'')};
      target=path.join(ensurePluginOverrideDirectory(),pluginPackageFileName(id));kind='builtin-override';
    }else{
      const existing=readInstalledExternalPlugins().packages.find(row=>row.manifest.id===id);if(!existing)return {installed:false,ignored:true,id,version:pkg.manifest.version,reason:'external-plugin-not-installed'};target=existing.installedPath;kind='external-update';
    }
    const installed={...pkg,installedAt:new Date().toISOString()};atomicWritePluginPackage(target,installed);state[id]={sha256,version:installed.manifest.version,revision:metadata.revision||metadata.publishedAt||installed.installedAt,installedAt:installed.installedAt,kind};writePluginLanState(state);
    const event={id,name:installed.manifest.name,version:installed.manifest.version,kind,sha256,requiresRestart:true};for(const win of BrowserWindow.getAllWindows())if(!win.isDestroyed())win.webContents.send('plugins:lanUpdate',event);return {installed:true,...event};
  }

  return Object.freeze({
    PLUGIN_API_VERSION,pendingPluginInstalls,externalPluginDirectory,ensureExternalPluginDirectory,pluginOverrideDirectory,ensurePluginOverrideDirectory,
    readPluginLanState,writePluginLanState,atomicWritePluginPackage,builtinPluginIds,pluginInstallErrorPayload,sweepPendingPluginInstalls,
    readBuiltinPluginManifests,readBuiltinPluginPackage,currentPluginPackage,installedPluginIds,assertPluginDependencies,algorithmPackageCatalog,
    readInstalledExternalPlugins,installedExternalPluginPackages,readInstalledPluginOverrides,installedPluginOverridePackages,isBundledPluginId,
    normalizeInstallCandidate,pluginInstallPlan,commitPluginInstall,restoreInstalledPackage,installLanPluginPackage
  });
}
module.exports={createPluginPackageRuntime};
