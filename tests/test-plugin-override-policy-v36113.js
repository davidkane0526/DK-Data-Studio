'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const root=path.resolve(__dirname,'..');
const policy=require(path.join(root,'desktop','plugin-override-policy'));
const runtimeFactory=require(path.join(root,'desktop','main-modules','plugin-package-runtime')).createPluginPackageRuntime;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

assert(policy.compareVersions('1.13.6','1.13.2')>0,'Current override policy must compare exact package versions.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.6'}},'1.13.2')===true,'A built-in update must be strictly newer than the bundled package.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.13.2'}},'1.13.2')===false,'An equal built-in update must be rejected.');
assert(policy.isNewerThanBuiltin({manifest:{version:'1.12.9'}},'1.13.2')===false,'A downgrade built-in update must be rejected.');

const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-current-override-'));
try{
  const userData=path.join(tempRoot,'user-data');fs.mkdirSync(userData,{recursive:true});
  const fakeApp={getPath:key=>key==='userData'?userData:tempRoot,getAppPath:()=>root,getVersion:()=>require('../package.json').version};
  const runtime=runtimeFactory({app:fakeApp,BrowserWindow:{getAllWindows:()=>[]}});
  const builtin=runtime.readBuiltinPluginPackage('builtin.data-center');
  assert(builtin?.manifest?.apiVersion==='1.19.0','Built-in package baseline must already use the exact current Plugin API.');
  const overrideDir=runtime.ensurePluginOverrideDirectory();

  const newer=JSON.parse(JSON.stringify(builtin));newer.manifest.version='99.0.0';
  fs.writeFileSync(path.join(overrideDir,'newer.dkplugin'),JSON.stringify(newer));
  let scanned=runtime.readInstalledPluginOverrides();
  assert(scanned.packages.some(row=>row.manifest.id==='builtin.data-center'&&row.manifest.version==='99.0.0'),'A valid exact-current-contract newer override must be accepted.');

  fs.rmSync(path.join(overrideDir,'newer.dkplugin'));
  const stale=JSON.parse(JSON.stringify(builtin));stale.manifest.version='0.0.1';
  fs.writeFileSync(path.join(overrideDir,'stale.dkplugin'),JSON.stringify(stale));
  scanned=runtime.readInstalledPluginOverrides();
  assert(scanned.packages.length===0&&scanned.errors.length===0&&scanned.removed.some(row=>row.reason==='override-not-newer-than-bundled'),'A stale/equal override must be removed from current installation state, not retained as a shadow compatibility layer.');

  const oldApi=JSON.parse(JSON.stringify(builtin));oldApi.manifest.version='99.0.0';oldApi.manifest.apiVersion='1.17.0';
  fs.writeFileSync(path.join(overrideDir,'old-api.dkplugin'),JSON.stringify(oldApi));
  scanned=runtime.readInstalledPluginOverrides();
  assert(scanned.packages.length===0&&scanned.errors.length===0&&scanned.removed.some(row=>row.reason==='non-current-contract'),'Old Plugin API overrides must be discarded from current installation state rather than revived by a compatibility bridge.');

  const externalDir=runtime.ensureExternalPluginDirectory();
  const staleBundledCopy=JSON.parse(JSON.stringify(runtime.readBuiltinPluginPackage('com.dkds.theme.aurora-pop')));staleBundledCopy.manifest.compatibility={app:'>=3.60.0'};staleBundledCopy.manifest.source='builtin';
  const staleBundledPath=path.join(externalDir,'com.dkds.theme.aurora-pop.dkplugin');fs.writeFileSync(staleBundledPath,JSON.stringify(staleBundledCopy));
  let external=runtime.readInstalledExternalPlugins();
  assert(!fs.existsSync(staleBundledPath)&&external.errors.length===0&&external.removed.some(row=>row.id==='com.dkds.theme.aurora-pop'),'A bundled-ID package in the external directory is invalid current installation topology and must be removed, not translated.');
  fs.writeFileSync(path.join(externalDir,'old-third-party.dkplugin'),JSON.stringify({schema:1,manifest:{id:'third.party.old',name:'Old Third Party',version:'1.0.0',apiVersion:'1.17.0',entry:'plugin.js',pluginType:'extension'},files:{'plugin.js':''}}));
  external=runtime.readInstalledExternalPlugins();
  assert(external.packages.length===0&&external.errors.some(row=>String(row.error).includes('Unsupported Plugin API: 1.17.0')),'Third-party packages on an old Plugin API must be rejected; no compatibility bridge may revive them.');
}finally{fs.rmSync(tempRoot,{recursive:true,force:true});}

const packageRuntime=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/package-runtime.js'),'utf8');
assert(packageRuntime.includes('Installed override failed current-contract load'),'A broken installed override must surface as a current-contract load failure.');
assert(!packageRuntime.includes('[DKDS built-in plugin override fallback]'),'A broken override must not silently fall back to bundled code.');
const manager=fs.readFileSync(path.join(root,'src/core/plugins/manager-ui.js'),'utf8');
assert(!manager.includes('plugin-history-btn')&&!manager.includes('external.history')&&!manager.includes('external.rollback'),'Plugin Manager must not expose package-version compatibility/history rollback UI.');
console.log('Current-contract built-in override policy checks passed.');
