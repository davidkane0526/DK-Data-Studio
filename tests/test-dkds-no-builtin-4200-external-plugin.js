'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const {buildPluginIndexSource}=require('../scripts/generate-plugin-index');
const {createPluginPackageRuntime}=require('../desktop/main-modules/plugin-package-runtime');
const builtins=buildPluginIndexSource().plugins;
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
assert(runtimeSource.includes('generatedBuiltinRows().some(row=>startupRowId(row)===id)'),
  'renderer must use the authoritative distribution catalog rather than temporary registration source');
assert(!runtimeSource.includes("existing.packageSource!=='external'"),
  'provisional builtin source must not block an external plugin upgrade');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-dkts-external-'));
try{
  const host=createPluginPackageRuntime({
    app:{getPath:(name)=>temp,getAppPath:()=>root},
    BrowserWindow:{getAllWindows:()=>[]}
  });
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
