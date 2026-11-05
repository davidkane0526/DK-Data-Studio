'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const {buildPluginIndexSource}=require('../scripts/generate-plugin-index');
const {createPluginPackageRuntime}=require('../desktop/main-modules/plugin-package-runtime');
const builtins=buildPluginIndexSource().plugins;
const retiredId='com.dkds.keithley-4200';
const pluginRoot=path.join(root,'src','plugins');
for(const dir of fs.readdirSync(pluginRoot,{withFileTypes:true}).filter(row=>row.isDirectory()&&!row.name.startsWith('_'))){
  const manifestPath=path.join(pluginRoot,dir.name,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.notEqual(manifest.id,retiredId,'Retired DKDS 4200 plugin must not remain in the source bundle, even as enabled:false.');
  assert(!/keithley|4200a?|dkts/i.test([manifest.id,manifest.name,manifest.workspace?.activity,manifest.window?.activity,...(manifest.capabilities||[])].join(' ')),
    'No disabled or enabled instrument-specific manifest may be shipped: '+manifest.id);
}
assert(builtins.length>10,'built-in catalog should not be empty');
assert(builtins.some(row=>row.id==='builtin.connectivity-center'),'generic connectivity must stay built in');
const instrument=/keithley|4200a?|dkts/i;
for(const row of builtins){
  const m=row.manifest||{};
  assert(!instrument.test([row.id,m.name,m.workspace?.activity,m.window?.activity,...(m.capabilities||[])].join(' ')),
    'DKDS must not ship an instrument-specific 4200 plugin: '+row.id);
}
assert(!builtins.some(row=>row.id==='com.dkts.keithley-4200'),'DKTS must remain an external installation');
const runtimeSource=fs.readFileSync(path.join(root,'src/core/plugins/kernel/modules/package-runtime.js'),'utf8');
assert(runtimeSource.includes('purgeRetiredPluginPreferences();'),
  'The host must clear stale enabled/prewarm/SUPER preferences for the retired plugin');
assert(runtimeSource.includes("RETIRED_PLUGIN_IDS=new Set(['com.dkds.keithley-4200'])"),
  'Runtime must reserve the retired DKDS-owned 4200 identity');
assert(runtimeSource.includes(".filter(row=>!RETIRED_PLUGIN_IDS.has(startupRowId(row)))"),
  'Stale generated catalogs must not re-register the retired built-in plugin');
assert(runtimeSource.includes("if(RETIRED_PLUGIN_IDS.has(String(manifest.id)))"),
  'The plugin API must fail closed if the retired built-in entry is loaded directly');
assert(runtimeSource.includes('generatedBuiltinRows().some(row=>startupRowId(row)===id)'),
  'renderer must use the authoritative distribution catalog rather than temporary registration source');
assert(!runtimeSource.includes("existing.packageSource!=='external'"),
  'provisional builtin source must not block an external plugin upgrade');
assert(runtimeSource.includes('script.dataset.dkdsPackageSource=packageSource'),
  'external code must tag itself at registration, not rely on the temporary builtin label');
assert(runtimeSource.includes("document.currentScript?.dataset?.dkdsPackageSource||'builtin'"),
  'registry must preserve original package source during registration');
const desktopSource=fs.readFileSync(path.join(root,'desktop/main-modules/plugin-package-runtime.js'),'utf8');
assert(desktopSource.includes("RETIRED_BUILTIN_PLUGIN_IDS=new Set(['com.dkds.keithley-4200'])"),
  'Desktop host must reserve the retired DKDS-owned 4200 identity');
assert(desktopSource.includes("reason:'retired-dkds-builtin-migrated-to-dkts'"),
  'Desktop host must delete old external and override package files during migration');
const bridgeSource=fs.readFileSync(path.join(root,'src/web-bridge.js'),'utf8');
assert(bridgeSource.includes("MOBILE_RETIRED_PLUGIN_IDS=new Set(['com.dkds.keithley-4200'])"),
  'Android must explicitly recognize the retired built-in identity');
assert(bridgeSource.includes('const mobilePluginList=async()=>'),
  'Android external package enumeration must migrate the legacy store before loading packages');
assert(bridgeSource.includes('assertCurrentExternalPluginId(pkg.manifest.id)'),
  'Android must refuse to reinstall the retired built-in identity');

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-dkts-external-'));
try{
  const host=createPluginPackageRuntime({
    app:{getPath:(name)=>temp,getAppPath:()=>root},
    BrowserWindow:{getAllWindows:()=>[]}
  });
  const legacyManifest={
    id:retiredId,name:'Legacy DKDS Keithley 4200A KXCI',version:'0.3.0',apiVersion:'1.19.0',
    entry:'plugin.js',pluginType:'developer',enabled:true,
    scripts:['plugin.js'],requiresCore:['runtime'],capabilities:['instrument.keithley-4200']
  };
  const legacySource="DKDSPlugins.define({id:'"+retiredId+"',apiVersion:'1.19.0',pluginType:'developer'},async()=>{});";
  const legacyPackage={schema:1,manifest:legacyManifest,files:{'plugin.js':legacySource}};
  const externalDir=host.ensureExternalPluginDirectory();
  const staleExternalPath=path.join(externalDir,'legacy-keithley-4200.dkplugin');
  fs.writeFileSync(staleExternalPath,JSON.stringify(legacyPackage));
  const migratedExternal=host.readInstalledExternalPlugins();
  assert(!fs.existsSync(staleExternalPath),'Legacy DKDS 4200 package must be physically removed from desktop external plugin storage.');
  assert(migratedExternal.removed.some(row=>row.id===retiredId&&row.reason==='retired-dkds-builtin-migrated-to-dkts'),
    'Desktop migration must report removal of the retired DKDS 4200 package.');
  assert.throws(()=>host.pluginInstallPlan(legacyPackage),/已退役/,'The retired DKDS plugin ID must not be reinstalled.');
  const overrideDir=host.ensurePluginOverrideDirectory();
  const staleOverridePath=path.join(overrideDir,'legacy-keithley-4200.dkplugin');
  fs.writeFileSync(staleOverridePath,JSON.stringify(legacyPackage));
  const migratedOverrides=host.readInstalledPluginOverrides();
  assert(!fs.existsSync(staleOverridePath)&&migratedOverrides.removed.some(row=>row.id===retiredId&&row.reason==='retired-dkds-builtin-migrated-to-dkts'),
    'Legacy DKDS 4200 override records must also be physically removed.');
  assert(!host.readBuiltinPluginManifests().some(row=>row.manifest.id===retiredId),'Retired plugin must never be exposed as a bundled manifest.');
  assert.equal(host.readBuiltinPluginPackage(retiredId),null,'Retired plugin must not be loadable as a built-in package.');

  const id='com.dkts.keithley-4200';
  const manifest={
    id,name:'External test instrument',version:'0.6.11',apiVersion:'1.19.0',
    entry:'plugin.js',pluginType:'developer',enabled:true,
    scripts:['plugin.js'],requiresCore:['runtime'],capabilities:['instrument.external-test']
  };
  const source="DKDSPlugins.define({id:'"+id+"',apiVersion:'1.19.0',pluginType:'developer'},async()=>{});";
  const plan=host.pluginInstallPlan({schema:1,manifest,files:{'plugin.js':source}});
  assert.equal(plan.installationKind,'external','independently produced DKTS ID must never be an override');
  assert.equal(plan.requiresRestart,false);
  host.commitPluginInstall(plan);
  assert(host.installedExternalPluginPackages().some(row=>row.manifest.id===id));
  const newer=host.pluginInstallPlan({schema:1,manifest:{...manifest,version:'0.6.12'},files:{'plugin.js':source}});
  assert.equal(newer.installationKind,'external');
  assert.equal(newer.exists,true);
  host.commitPluginInstall(newer);
  assert.equal(host.installedExternalPluginPackages().find(row=>row.manifest.id===id)?.manifest.version,'0.6.12');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
console.log('DKDS actual builtins contain no 4200; external plugin install/upgrade route PASS');
