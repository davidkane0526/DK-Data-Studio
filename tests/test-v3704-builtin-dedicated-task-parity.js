'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {listBuiltinPluginWindows}=require('../desktop/plugin-window-manager');
const {buildPluginIndexSource}=require('../scripts/generate-plugin-index');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const windows=listBuiltinPluginWindows(root);
const ownerRows=buildPluginIndexSource().plugins;
const ownerById=new Map(ownerRows.map(row=>[String(row.id||row.manifest?.id||''),row]));

function assertTaskTransport(row,label){
  const manifest=row?.packageManifest||row?.manifest||{};
  const tasks=Array.isArray(manifest.tasks)?manifest.tasks:[];
  if(!tasks.length)return 0;
  assert.equal(typeof row.taskSources,'object',`${label}: dedicated spec must carry trusted built-in task source bytes.`);
  for(const task of tasks){
    const entry=String(task?.entry||'');
    assert(entry&&typeof row.taskSources?.[entry]==='string'&&row.taskSources[entry].length>0,`${label}/${task.id}: missing task entry bytes ${entry}`);
    for(const file of (Array.isArray(task?.imports)?task.imports:[])){
      assert(typeof row.taskSources?.[file]==='string'&&row.taskSources[file].length>0,`${label}/${task.id}: missing task import bytes ${file}`);
    }
  }
  const owner=ownerById.get(String(manifest.id||row.pluginId||''));
  assert(owner,`${label}: owner generated-index row must exist.`);
  assert.deepStrictEqual(row.taskSources,owner.taskSources,`${label}: owner and dedicated task source bytes must be identical.`);
  assert.deepStrictEqual(row.taskCoreSources||{},owner.taskCoreSources||{},`${label}: owner and dedicated Core task preludes must be identical.`);
  return tasks.length;
}

let transportedTasks=0;
for(const spec of windows){
  transportedTasks+=assertTaskTransport(spec,`target:${spec.pluginId}`);
  for(const provider of (spec.algorithmProviders||[]))transportedTasks+=assertTaskTransport(provider,`algorithm:${provider.pluginId}`);
  for(const provider of (spec.themeProviders||[]))transportedTasks+=assertTaskTransport(provider,`theme:${provider.pluginId}`);
}
assert(transportedTasks>=7,'Expected first-party dedicated analysis/task coverage across current built-ins.');

// Reproduce the screenshot's exact failing provider from the resonance dedicated window.
const resonance=windows.find(row=>row.activity==='resonance');
assert(resonance,'Resonance dedicated window spec must exist.');
const transport=(resonance.algorithmProviders||[]).find(row=>row.pluginId==='builtin.standard-transport-algorithms');
assert(transport,'Resonance dedicated window must receive the standard transport algorithm provider.');
assert.equal(typeof transport.taskSources?.['transport-task.js'],'string','transport-compute entry bytes must reach the dedicated renderer.');
assert.equal(typeof transport.taskSources?.['algorithm.js'],'string','transport-compute import bytes must reach the dedicated renderer.');

// Execute the transported import + entry bytes, proving the payload is runnable rather than metadata-only.
const workerSelf={};
const sandbox={self:workerSelf,globalThis:workerSelf,console,Math,Number,String,Boolean,Object,Array,Map,Set,Date,JSON,Error,TypeError,Promise};
vm.createContext(sandbox);
vm.runInContext(transport.taskSources['algorithm.js'],sandbox,{filename:'algorithm.js'});
vm.runInContext(transport.taskSources['transport-task.js'],sandbox,{filename:'transport-task.js'});
assert.equal(typeof workerSelf.DKDSTaskDefinition?.run,'function','Transport task definition must materialize from dedicated bytes.');

(async()=>{
  const result=await workerSelf.DKDSTaskDefinition.run({
    op:'transform',transformId:'raw',parameters:{},
    sweep:{step:0.1,points:[{v:-0.1,i:-1e-6},{v:0,i:0},{v:0.1,i:2e-6}]}
  });
  assert.equal(result.type,'raw');
  assert.equal(result.points.length,3);
  assert.equal(result.points[2].y,2e-6,'Transport import must be active when the task entry runs.');

  const manager=read('desktop/plugin-window-manager.js');
  const runtime=read('src/plugin-window/runtime.js');
  const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
  const generator=read('scripts/generate-plugin-index.js');

  assert(manager.includes("buildBuiltinTaskSourceBundle(appPath,pluginDir,manifest)"),'Electron dedicated-window resolver must use the canonical built-in task source bundle helper.');
  assert(generator.includes("buildBuiltinTaskSourceBundle(root,dir,manifest)"),'Owner generated index must use the same built-in task source bundle helper.');
  assert(runtime.includes('applyRuntimePackage(provider);'),'Dedicated providers must be materialized before activation regardless of source kind.');
  const targetApply=runtime.indexOf('applyRuntimePackage(spec);');
  const targetActivate=runtime.indexOf("measure('plugins-activate'");
  assert(targetApply>=0&&targetActivate>targetApply,'Dedicated target task sources must materialize before activateAll().');
  assert(runtime.includes("const files=(source==='external'||source==='override')?(row?.packageFiles||{}):(row?.taskSources||{});"),'Dedicated runtime must route trusted built-in task bytes into canonical package materialization.');
  assert(packageRuntime.includes("function applyPackage(id,manifest={},source='external',files={},options={})"),'Canonical package apply must accept task Core source transport metadata.');
  assert(packageRuntime.includes("if(taskCoreSources&&typeof taskCoreSources==='object')definition.taskCoreSources=structuredClone(taskCoreSources)"),'Canonical package apply must preserve generated built-in Core task preludes.');
  assert(packageRuntime.includes("definition=applyPackage(id,row.manifest,String(row?.source||'builtin'),row?.taskSources||{},{taskCoreSources:row?.taskCoreSources||{}})"),'Owner built-in loader must use the same package materialization operation.');

  console.log(`v3.70.4 built-in dedicated Task parity PASS (${transportedTasks} transported task contracts)`);
})().catch(err=>{console.error(err);process.exit(1);});
