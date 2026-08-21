'use strict';
const fs=require('fs');
const os=require('os');
const path=require('path');
const {execFileSync}=require('child_process');
const {normalizePluginPackage}=require('../plugin-package');
function assert(c,m){if(!c)throw new Error(m);}
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const contract=JSON.parse(read('sdk/contract.json'));
const schema=JSON.parse(read('sdk/plugin-manifest.schema.json'));
const appSchema=JSON.parse(read('docs/plugin-manifest.schema.json'));
assert(contract.pluginApiVersion==='1.10.0','SDK must target Plugin API 1.10.0.');
assert(contract.packageSchema===1,'SDK package schema must match .dkplugin schema 1.');
assert(schema.properties.apiVersion.const===contract.pluginApiVersion,'SDK schema/API version mismatch.');
assert(JSON.stringify(schema.properties.requiresCore.items.enum)===JSON.stringify(appSchema.properties.requiresCore.items.enum),'SDK requiresCore catalog must match application manifest schema.');
const sdkTypes=read('sdk/plugin-api.d.ts');
assert(sdkTypes.includes("apiVersion:'1.10.0'")&&sdkTypes.includes('DKDSPluginContext'),'SDK must ship editor-readable Plugin API declarations.');
assert(Array.isArray(schema.properties.pluginType.enum)&&schema.properties.pluginType.enum.includes('algorithm')&&schema.properties.pluginType.enum.includes('task'),'SDK manifest must expose explicit plugin categories used by Plugin Manager.');
assert(JSON.stringify(schema.properties.pluginType)===JSON.stringify(appSchema.properties.pluginType),'SDK and application pluginType schemas must remain identical.');
assert(sdkTypes.includes('DKDSScientificCurveSurfaceSpec')&&sdkTypes.includes('onMarkerDragCommit?')&&sdkTypes.includes('onWidthWindowCommit?')&&sdkTypes.includes('scientificPlot:DKDSScientificPlotRuntime'),'Standalone SDK must expose Core-owned scientific direct-manipulation contracts to third-party plugins.');

// Copy the SDK outside the repository and use only that copy. This is the
// release gate for "no application source tree required" plugin development.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-sdk-v357-'));
const detached=path.join(tmp,'sdk');
fs.cpSync(path.join(root,'sdk'),detached,{recursive:true});
const cli=path.join(detached,'tools','dkds-plugin.js');
for(const name of ['workspace-plugin','algorithm-provider']){
  const pluginDir=path.join(detached,'templates',name);
  execFileSync(process.execPath,[cli,'validate',pluginDir],{stdio:'pipe'});
  const output=path.join(tmp,`${name}.dkplugin`);
  execFileSync(process.execPath,[cli,'package',pluginDir,output],{stdio:'pipe'});
  const pkg=normalizePluginPackage(JSON.parse(fs.readFileSync(output,'utf8')));
  assert(pkg.manifest.apiVersion==='1.10.0'&&pkg.manifest.source==='external',`${name} SDK package must be installable by the application normalizer.`);
  assert(['workbench','algorithm'].includes(pkg.manifest.pluginType),`${name} SDK template must declare its Plugin Manager category explicitly.`);
}
fs.rmSync(tmp,{recursive:true,force:true});

const resonance=read('src/plugins/resonance-workbench/plugin.js');
const ter=read('src/plugins/ter-analysis/plugin.js');
const pulse=read('src/plugins/pulse-analysis/plugin.js');
assert(!resonance.includes("ctx.services?.get?.('resonance')")&&!ter.includes("ctx.services?.get?.('ter')")&&!pulse.includes("ctx.services?.get?.('pulse')"),'First-party analysis plugins must not fall back to host-owned domain services.');
assert(resonance.includes("ctx.services.require('builtin.resonance-workbench.runtime')"),'Resonance TOP must consume only its plugin-owned namespaced runtime service.');
assert(ter.includes("ctx.services.require('builtin.ter-analysis.runtime')"),'TER TOP must consume only its plugin-owned namespaced runtime service.');
assert(pulse.includes("ctx.services.require('builtin.pulse-analysis.runtime')"),'Pulse TOP must consume only its plugin-owned namespaced runtime service.');
for(const [rel,id] of [
  ['src/plugins/resonance-workbench/feature-runtime.js','builtin.resonance-workbench.runtime'],
  ['src/plugins/ter-analysis/analysis-service.js','builtin.ter-analysis.runtime'],
  ['src/plugins/pulse-analysis/analysis-service.js','builtin.pulse-analysis.runtime']
])assert(read(rel).includes(`serviceName:'${id}'`),`${rel} must publish a namespaced plugin-owned service.`);

const app=read('src/app.js');
const start=app.indexOf('window.DKDSPlugins.configure({');
const end=start>=0?app.indexOf('\n    });',start):-1;
const configure=start>=0&&end>start?app.slice(start,end):'';
for(const token of ['resonance:resonanceHostApi()','pulse:pulseHostApi()','ter:terHostApi()','applyResonanceWorkspace:','renderGateAnalysis,','renderTerMaxPage,','renderPulseAnalysis:'])assert(!configure.includes(token),`Host configure must remain domain-neutral: ${token}`);

const packages=read('docs/PLUGIN_PACKAGES.md');
assert(packages.includes('node sdk/tools/dkds-plugin.js validate')&&packages.includes('"apiVersion": "1.10.0"'),'Plugin package guide must document the standalone v1.10 SDK workflow.');
console.log('v3.60 standalone Plugin SDK + host-independent first-party plugin contract checks passed.');
