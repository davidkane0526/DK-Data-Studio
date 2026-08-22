'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

global.DKDSScience={};
require('../src/science/common.js');
require('../src/science/peaks.js');
const S=global.DKDSScience;
const modules=new Map();
const moduleRuntime={
  define:(pid,name,value)=>{modules.set(`${pid}/${name}`,value);return value;},
  get:(pid,name)=>modules.get(`${pid}/${name}`)||null,
  require:(pid,name)=>{const value=modules.get(`${pid}/${name}`);if(!value)throw new Error(`missing module ${pid}/${name}`);return value;}
};
const mkPoints=(scale=1)=>[-1,-.5,0,.5,1,.5,0,-.5,-1].map((v,index)=>({v,i:scale*(index+1)*1e-9,index,sourceLine:index+3}));
const idPath='C:\\legacy\\VG=5 V.csv::series::0::x1y2';
const igPath='C:\\legacy\\VG=5 V.csv::series::1::x1y3';
const idDataset={name:'VG=5 V · id(0.0)',path:idPath,vg:5,points:mkPoints(),assignments:['*'],importSpec:{xHeader:'vd(V)',yHeader:'id(0.0)',xCol:0,yCol:1,yCols:[1]}};
const igDataset={name:'VG=5 V · ig(0.0)',path:igPath,vg:5,points:mkPoints(1e-3),assignments:[],importSpec:{xHeader:'vd(V)',yHeader:'ig(0.0)',xCol:0,yCol:2,yCols:[2]}};
const idSweeps=S.buildSweeps(idDataset);
assert.equal(idSweeps.length,2,'fixture must have one forward and one reverse sweep');
const stalePeaks=idSweeps.map((sw,index)=>({
  id:`legacy-peak-${index}`,
  // Simulate an old sweep identity that no longer exists after a later sweep
  // reconstruction implementation, while retaining the stable dataset path,
  // direction and actual peak geometry.
  sweepId:`${idPath}::${sw.direction>0?'up':'down'}::9`,
  datasetPath:idPath,vg:5,direction:sw.direction,v:sw.points[2].v,i:sw.points[2].i,
  accepted:true,manual:true,locked:false,peakOrder:1,peakLabel:'峰1'
}));
const project={datasets:[idDataset,igDataset],plugins:{'builtin.resonance-workbench':{workspace:{schema:1,scanVisibility:[[idPath,{forward:true,reverse:true}]],peaks:stalePeaks,peakCategories:[{order:1,label:'峰1'}]}}}};
const context={
  console,structuredClone,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
  DKDSPluginModules:moduleRuntime,DKDSScience:S,
  DKDSData:{legacyDatasetsFromArtifacts:rows=>rows.map(row=>structuredClone(row.dataset)).filter(Boolean)}
};
context.window=context;
vm.createContext(context);
vm.runInContext(read('src/plugins/resonance-workbench/workbench-shared.js'),context,{filename:'workbench-shared.js'});
vm.runInContext(read('src/plugins/resonance-workbench/feature-runtime.js'),context,{filename:'feature-runtime.js'});
const feature=moduleRuntime.require('builtin.resonance-workbench','feature-runtime');
(async()=>{
  const artifacts={list:()=>[{id:'id-table',dataset:idDataset},{id:'ig-table',dataset:igDataset}]};
  const runtime=await feature.createTop({project,artifacts,setStatus(){},scheduleSnapshot(){},copyTextToClipboard(){},savePlotlyImage(){}});
  const state=runtime.service.getState();
  assert.equal(state.datasets.length,1,'Resonance Artifact path must honor assignments and exclude unadopted Ig.');
  assert.equal(state.datasets[0].path,idPath,'The adopted Id dataset must remain in Resonance.');
  assert.equal(state.sweeps.length,2,'The adopted Id dataset must still rebuild both sweep directions.');
  assert(state.workspace.peaks.every(p=>state.sweeps.some(sw=>String(sw.id)===String(p.sweepId))),'Stale saved peak sweep identities must be reconciled to rebuilt sweeps.');
  const diag=runtime.service.getGroupDiagnostics();
  assert.equal(diag.unresolvedPeaks,0,'No accepted saved peak may remain orphaned after deterministic reconciliation.');
  assert.equal(diag.matchedPeaks,2,'Both legacy peaks must be visible to group analysis.');
  assert(diag.series>=2&&diag.seriesPoints===2,'The real Resonance runtime must produce non-empty group series after legacy restoration.');
  const runtimeSource=read('src/plugins/resonance-workbench/feature-runtime.js');
  const windowRuntime=read('src/plugin-window/runtime.js');
  const automation=read('src/core/automation-test-runtime.js');
  assert(runtimeSource.includes('canonical.filter(assignedToResonance)'),'Artifact-backed Resonance datasets must preserve the scoped assignment boundary.');
  assert(runtimeSource.includes('reconcileSavedPeakSweeps')&&runtimeSource.includes('getGroupDiagnostics'),'Resonance runtime must reconcile old peak identities and expose live diagnostics.');
  assert(windowRuntime.includes('resonanceGroupDiagnostics'),'Dedicated renderer diagnostics must report the live Resonance runtime rather than an external reconstructed model.');
  assert(automation.includes("const VERSION='1.24.0'")&&automation.includes("'project.resonance-live'"),'Windows automation must execute current-project Resonance restoration inside a real dedicated renderer.');
  console.log('v3.61.22 legacy Resonance scoped-artifact + peak identity reconciliation runtime checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
