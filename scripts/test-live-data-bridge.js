const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const context={
  console,structuredClone,setTimeout,clearTimeout,crypto:global.crypto,
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(read('src/core/data-model.js'),context,{filename:'data-model.js'});
vm.runInContext(read('src/core/plugin-module-runtime.js'),context,{filename:'plugin-module-runtime.js'});
const D=context.DKDSData;

const legacyA={
  path:'device-A::Id',name:'device-A',sourcePath:'/tmp/device-A.csv',sourceName:'device-A.csv',vg:0,
  importedAt:'2026-08-19T00:00:00.000Z',
  importSpec:{xHeader:'Vd',yHeader:'Id',xCol:0,yCol:1},
  points:[{v:-1,i:1e-9,index:0,sourceLine:2},{v:0,i:2e-9,index:1,sourceLine:3},{v:1,i:1e-9,index:2,sourceLine:4}]
};
const legacyB={...legacyA,path:'device-B::Id',name:'device-B',sourcePath:'/tmp/device-B.csv',sourceName:'device-B.csv',vg:10};
const store=D.createStore();
D.syncLegacyDatasetArtifacts(store,[legacyA]);
assert.strictEqual(store.list({includeTransient:true}).length,1,'legacy dataset must appear in the live Artifact Store');
assert.strictEqual(D.serializeStore(store,{includeTransient:false}).artifacts.length,0,'legacy adapter must remain transient on project save');
let roundTrip=D.legacyDatasetsFromArtifacts(store.list({includeTransient:true}));
assert.strictEqual(roundTrip.length,1);
assert.strictEqual(roundTrip[0].path,legacyA.path);
assert.strictEqual(roundTrip[0].points[1].i,2e-9);
D.syncLegacyDatasetArtifacts(store,[legacyB]);
roundTrip=D.legacyDatasetsFromArtifacts(store.list({includeTransient:true}));
assert.strictEqual(roundTrip.map(d=>d.path).join('|'),legacyB.path,'bridge must prune replaced transient source artifacts');

let terSeen=[];
context.Analysis={
  detectTerVoltageParameters(rows){terSeen=rows;return {vmin:-1,vmax:1,vstep:0.1};},
  computeTerMatrix(){throw new Error('not needed in bridge test');}
};
vm.runInContext(read('src/plugins/ter-analysis/analysis-service.js'),context,{filename:'ter-analysis-service.js'});

(async()=>{
  const terAnalysis=context.DKDSPluginModules.require('builtin.ter-analysis','analysis-service');
  const runtime=await terAnalysis.create({
    artifacts:{list:opts=>store.list(opts)},
    getVisibility:()=>new Map(),
    project:{datasets:[legacyA]},setStatus(){},copyTextToClipboard(){},savePlotlyImage(){},scheduleSnapshot(){}
  });
  runtime.service.autoParameters();
  assert.strictEqual(terSeen.length,1);
  assert.strictEqual(terSeen[0].path,legacyB.path,'TER must prefer current Artifact data instead of activation-time project snapshot');

  context.DKDSScience={preset:()=>({_preset:'balanced'}),parseCsv:()=>({points:[]}),buildSweeps:dataset=>[{id:`${dataset.path}:f`,datasetPath:dataset.path,datasetName:dataset.name,vg:dataset.vg,direction:1,points:dataset.points}]};
  vm.runInContext(read('src/plugins/resonance-workbench/workbench-shared.js'),context,{filename:'workbench-shared.js'});
  vm.runInContext(read('src/plugins/resonance-workbench/feature-runtime.js'),context,{filename:'feature-runtime.js'});
  const resonanceFeature=context.DKDSPluginModules.require('builtin.resonance-workbench','feature-runtime');
  const resonance=await resonanceFeature.createTop({
    artifacts:{list:opts=>store.list(opts)},project:{datasets:[legacyA]},setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},savePlotlyImage(){}
  });
  assert.strictEqual(resonance.getState().datasets[0].path,legacyB.path,'Resonance must consume the same canonical Artifact source');
  D.syncLegacyDatasetArtifacts(store,[legacyA,legacyB]);
  const count=resonance.service.refreshData();
  assert.strictEqual(count,2,'Resonance must refresh after data:artifacts-changed without recreating the plugin');
  console.log('Live Artifact / legacy dataset bridge checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
