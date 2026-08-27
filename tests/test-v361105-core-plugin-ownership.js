'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const walk=(dir,out=[])=>{for(const name of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,name.name);if(name.isDirectory())walk(full,out);else out.push(full);}return out;};

assert(fs.existsSync(path.join(root,'src','diagnostics')),'Diagnostics must exist as an integration layer.');
assert(!fs.existsSync(path.join(root,'src','core','diagnostics')),'Diagnostics must not be owned by Core.');
assert(fs.existsSync(path.join(root,'src','migrations','legacy-dataset-adapter.js')),'Legacy dataset compatibility must be isolated under migrations/.');
assert(fs.existsSync(path.join(root,'src','migrations','project-v1-domain.js')),'Legacy domain project migration must be isolated under migrations/.');

const coreFiles=walk(path.join(root,'src','core')).filter(file=>/\.(?:js|json)$/.test(file));
const forbiddenDomain=/(?:builtin\.(?:resonance|ter|pulse|data-center|flexible-import|standard-transport|scientific-data)|science\.(?:transport|resonance|ter|pulse)|transport-transform|transport-scalar-field)/;
for(const file of coreFiles){
  const source=fs.readFileSync(file,'utf8');
  assert(!forbiddenDomain.test(source),`${path.relative(root,file)} leaks first-party scientific domain ownership into Core.`);
}
const model=read('src/core/data/model.js');
for(const token of ['fromLegacyDataset','syncLegacyDatasetArtifacts','toLegacyDataset','legacyDatasetsFromArtifacts','removeLegacyDatasets'])assert(!model.includes(token),`Core Data Model must not own legacy adapter primitive ${token}.`);
const projectFormat=read('src/core/project/format.js');
for(const token of ['scanVisibility','terMaxSettings','pulseAnalysis','builtin.resonance-workbench','builtin.ter-analysis','builtin.pulse-analysis'])assert(!projectFormat.includes(token),`Core Project Format must not know legacy domain token ${token}.`);
assert(projectFormat.includes('registerMigration'),'Core Project Format must expose a generic migration registry.');

const transform=read('src/core/scientific/transform-runtime.js');
assert(!transform.includes('legacyDatasetsFromArtifacts'),'Scientific Transform Runtime must consume canonical data, not legacy adapters.');
assert(!transform.includes('transport-transform')&&!transform.includes('transport-scalar-field'),'Scientific Transform Runtime must not impose transport algorithm categories.');
const transportPlugin=read('src/plugins/standard-transport-algorithms/plugin.js');
assert(transportPlugin.includes('ctx.data.transforms.register'),'Transport transforms must be plugin-owned.');
const contracts=JSON.parse(read('src/plugins/scientific-data-contracts/plugin.json'));
assert.strictEqual(contracts.pluginType,'foundation','Shared scientific data semantics must be foundation-plugin owned.');
assert(Array.isArray(contracts.requiresCore)&&contracts.requiresCore.includes('data.types'),'Scientific data contract plugin must consume the generic Core data-type registry.');

const manager=read('src/core/plugins/manager-ui.js');
assert(!manager.includes('BUILTIN_DISPLAY'),'Plugin Manager must not hard-code first-party plugin presentation metadata.');
const lifecycle=read('src/core/plugins/kernel/modules/lifecycle.js');
assert(lifecycle.includes('pluginType')&&/invalid pluginType|pluginType.*required|requires explicit pluginType/i.test(lifecycle),'Plugin lifecycle must require explicit pluginType rather than infer legacy types.');
const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
assert(!pluginApi.includes('detectors:'),'Legacy analysis.detectors facade must not return to Plugin API.');
const contractRuntime=read('src/core/plugins/contract-runtime.js');
assert(!contractRuntime.includes('analysis.detectors'),'Legacy detector capability must not return to Core capability resolution.');

for(const dirent of fs.readdirSync(path.join(root,'src','plugins'),{withFileTypes:true})){
  if(!dirent.isDirectory()||dirent.name.startsWith('_'))continue;
  const manifestPath=path.join(root,'src','plugins',dirent.name,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert(['foundation','workbench','tool','extension','theme','algorithm','data','developer','task'].includes(String(manifest.pluginType||'')),`${manifest.id||dirent.name} must declare a valid pluginType.`);
}
console.log('v3.61.105 Core/Plugin ownership PASS: Core is domain-neutral; migrations, diagnostics, scientific contracts and algorithms have explicit owners.');
