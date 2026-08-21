const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const modules=new Map();
const moduleRuntime={define:(pid,name,value)=>{modules.set(`${pid}/${name}`,value);return value;},get:(pid,name)=>modules.get(`${pid}/${name}`)||null,require:(pid,name)=>{const value=modules.get(`${pid}/${name}`);if(!value)throw new Error(`missing module ${pid}/${name}`);return value;}};
const context={
  console,
  structuredClone,
  setTimeout,
  clearTimeout,
  requestAnimationFrame:fn=>fn(),
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
  DKDSPluginModules:moduleRuntime,
};
context.window=context;
context.DKDSScience={
  preset:()=>({_preset:'balanced'}),
  parseCsv:()=>({points:[]}),
  buildSweeps:()=>[],
};
vm.createContext(context);
vm.runInContext(read('src/plugins/resonance-workbench/workbench-shared.js'),context,{filename:'workbench-shared.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-runtime.js'),context,{filename:'feature-runtime.js'});
const feature=moduleRuntime.require('builtin.resonance-workbench','feature-runtime');
assert(feature?.createTop,'Resonance feature runtime module must expose createTop.');

(async()=>{
  const runtime=await feature.createTop({
    project:{datasets:[]},artifacts:{list:()=>[]},setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},savePlotlyImage(){}
  });
  assert.equal(runtime.serviceName,'builtin.resonance-workbench.runtime');
  assert.equal(typeof runtime.service?.serialize,'function');
  assert.equal(runtime.service.serialize()?.schema,1);
  // Regression: the shared extraction must not depend on helpers from a former
  // outer closure (clone/finite/esc/$/$$/directionName/csvCell/fmt).
  runtime.setProject({datasets:[]});
  assert.equal(runtime.service.serialize()?.schema,1);
  console.log('Resonance runtime bootstrap checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
