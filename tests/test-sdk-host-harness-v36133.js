'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const cp=require('child_process');
const assert=require('assert');
const {normalizePluginPackage}=require('../desktop/plugin-package');
const {normalizeExternalPluginWindow}=require('../desktop/plugin-window-manager');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const contract=JSON.parse(read('sdk/contract.json'));
assert.equal(contract.sdkVersion,'1.17.16');
assert.equal(contract.pluginApiVersion,'1.17.0');

const kernel=read('src/generated/runtime/plugin-kernel.js'),infra=read('src/generated/runtime/ui-infrastructure.js'),chart=read('src/core/scientific/chart-runtime.js');
const requiredHostTokens=[
  [kernel,'history: Object.freeze'],[kernel,'series: infrastructureScope?.series'],[kernel,'legends: infrastructureScope?.legends'],[kernel,'groupPlots: infrastructureScope?.groupPlots'],[kernel,'tooltips: infrastructureScope?.tooltips'],
  [infra,'class SeriesRegistry'],[infra,'class LegendGroup'],[infra,'class ActiveLayoutSolver'],[infra,'class GroupPlot'],[chart,'smartLegendLayout'],
  [kernel,'function applyPackagedManifest('],[kernel,'packageRuntime:Object.freeze({']
];
for(const [source,token] of requiredHostTokens)assert(source.includes(token),`SDK Host missing ${token}`);

// Standalone SDK proof: copy SDK away from app source, validate and package each reference template.
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-sdk-host-117-'));
try{
  const detached=path.join(temp,'sdk');fs.cpSync(path.join(root,'sdk'),detached,{recursive:true});
  const cli=path.join(detached,'tools','dkds-plugin.js');
  for(const name of ['workspace-plugin','top-workspace-plugin','tool-plugin','algorithm-provider']){
    const dir=path.join(detached,'templates',name),out=path.join(temp,`${name}.dkplugin`);
    cp.execFileSync(process.execPath,[cli,'validate',dir],{stdio:'pipe'});
    cp.execFileSync(process.execPath,[cli,'package',dir,out],{stdio:'pipe'});
    const raw=JSON.parse(fs.readFileSync(out,'utf8'));
    assert.equal(raw.manifest.apiVersion,'1.17.0',`${name} must target SDK 1.17`);
    if(name==='tool-plugin'){
      const pkg=normalizePluginPackage(raw,{allowBuiltinId:false});
      const windowSpec=normalizeExternalPluginWindow(pkg);
      assert.equal(windowSpec?.packageManifest?.id,pkg.manifest.id,'Detached SDK Tool package must carry its canonical manifest into the dedicated renderer.');
      assert.equal(windowSpec?.packageManifest?.workspace?.role,'top','Detached SDK Tool package must preserve TOP role in its machine window contract.');
      assert(windowSpec?.dependencies?.includes('scientific-renderer'),'Detached SDK Tool package must resolve the D3-only scientific-renderer contract.');
    }
  }
}finally{fs.rmSync(temp,{recursive:true,force:true});}

// First-party equality gate: no special host legend/layout service is introduced for Resonance.
const app=read('src/generated/runtime/app.js');
const configureStart=app.indexOf('window.DKDSPlugins.configure({'),configureEnd=app.indexOf('\n    });',configureStart),hostConfigure=app.slice(configureStart,configureEnd);
for(const forbidden of ['resonanceLegend','resonanceLayoutSolver','resonanceGroupPlot','resonanceTooltip'])assert(!hostConfigure.includes(forbidden),`First-party privilege detected: ${forbidden}`);
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(resonance.includes('legend:false'),'First-party Resonance must suppress a duplicate legend through the same public plot spec available to SDK plugins');
console.log('SDK Harness=PASS');
