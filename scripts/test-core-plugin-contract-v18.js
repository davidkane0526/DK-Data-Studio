const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

// Machine-readable and runtime contract must describe the same stable Core surface.
const schema=JSON.parse(read('docs/plugin-manifest.schema.json'));
const allowed=new Set(schema.properties.requiresCore.items.enum);
const contractSource=read('src/core/plugin-contract-runtime.js');
const sandbox={window:{}};sandbox.window.window=sandbox.window;vm.createContext(sandbox);vm.runInContext(contractSource,sandbox,{filename:'plugin-contract-runtime.js'});
const contract=sandbox.window.DKDSPluginContract;
assert(contract&&contract.API_VERSION==='1.8.0','Core contract must target Plugin API 1.8.0.');
assert.deepStrictEqual([...contract.requirements].sort(),[...allowed].sort(),'Runtime and JSON schema Core requirement catalogs must stay identical.');
assert(contract.validateManifest({apiVersion:'1.8.0',requiresCore:['io','charts']}).ok,'Known Core requirements must validate.');
assert(!contract.validateManifest({apiVersion:'1.8.0',requiresCore:['private.magic']}).ok,'Unknown private infrastructure requirements must be rejected.');

for(const dir of fs.readdirSync(path.join(root,'src/plugins'))){
  if(dir.startsWith('_'))continue;
  const manifestPath=path.join(root,'src/plugins',dir,'plugin.json');
  if(!fs.existsSync(manifestPath))continue;
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  assert.strictEqual(manifest.apiVersion,'1.8.0',`${dir}: built-in manifest must use API 1.8.0.`);
  assert(Array.isArray(manifest.requiresCore),`${dir}: requiresCore must be explicit.`);
  for(const id of manifest.requiresCore)assert(allowed.has(id),`${dir}: unknown requiresCore ${id}`);
  const entry=read(`src/plugins/${dir}/${manifest.entry||'plugin.js'}`);
  assert(entry.includes('requiresCore:'),`${dir}: runtime manifest must declare requiresCore too.`);
}

const kernel=read('src/core/plugin-kernel.js');
for(const token of ['io: ioScope','science: window.DKDSScience','services: serviceScope','modules: moduleScope','flow: dataFlowScope','dom: componentScope','providers: Object.freeze','status: Object.freeze','workspace: Object.freeze','DKDSPluginContract?.assertApi']){
  assert(kernel.includes(token),`Kernel v1.8 surface missing ${token}`);
}
const dedicated=read('src/plugin-window/runtime.js');
for(const id of ['io-runtime','chart-runtime','component-runtime','data-flow-runtime','service-runtime','plugin-contract-runtime','plugin-module-runtime'])assert(dedicated.includes(id),`Dedicated TOP host must load ${id}.`);
assert(dedicated.includes('DKDSServices?.register?.'),'Dedicated TOP runtime services must enter Core Service Registry.');

console.log('Core Plugin Contract v1.8 checks passed.');
