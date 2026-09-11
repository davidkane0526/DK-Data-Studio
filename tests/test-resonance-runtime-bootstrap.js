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
context.DKDSData={transportDatasetsFromArtifacts:()=>[]};
vm.createContext(context);
vm.runInContext(read('src/plugins/resonance-workbench/workbench-shared.js'),context,{filename:'workbench-shared.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-context.js'),context,{filename:'feature-context.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-data-runtime.js'),context,{filename:'feature-data-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-ter-runtime.js'),context,{filename:'feature-ter-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-group-runtime.js'),context,{filename:'feature-group-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-analysis-runtime.js'),context,{filename:'feature-analysis-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-peak-runtime.js'),context,{filename:'feature-peak-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-selection-runtime.js'),context,{filename:'feature-selection-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-inspector-runtime.js'),context,{filename:'feature-inspector-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-main-plot-runtime.js'),context,{filename:'feature-main-plot-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-controls-runtime.js'),context,{filename:'feature-controls-runtime.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-runtime.js'),context,{filename:'feature-runtime.js'});
const feature=moduleRuntime.require('builtin.resonance-workbench','feature-runtime');
assert(feature?.createTop,'Resonance feature runtime module must expose createTop.');

(async()=>{
  const runtime=await feature.createTop({
    project:{datasets:[]},artifacts:{list:()=>[]},science:context.DKDSScience,dataModel:context.DKDSData,setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},saveChartImage(){}
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
