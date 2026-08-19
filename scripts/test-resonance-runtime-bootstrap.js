const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const context={
  console,
  structuredClone,
  setTimeout,
  clearTimeout,
  requestAnimationFrame:fn=>fn(),
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
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
assert(context.DKDSResonanceFeatureRuntime?.createTop,'Resonance feature runtime must expose createTop.');

(async()=>{
  const runtime=await context.DKDSResonanceFeatureRuntime.createTop({
    host:{},project:{datasets:[]},setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},savePlotlyImage(){}
  });
  assert.equal(runtime.serviceName,'resonance');
  assert.equal(typeof runtime.service?.serialize,'function');
  assert.equal(runtime.service.serialize()?.schema,1);
  // Regression: the shared extraction must not depend on helpers from a former
  // outer closure (clone/finite/esc/$/$$/directionName/csvCell/fmt).
  runtime.setProject({datasets:[]});
  assert.equal(runtime.service.serialize()?.schema,1);
  console.log('Resonance runtime bootstrap checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
