'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

function loadPluginModule(relative,moduleId){
  const file=path.resolve(__dirname,'..',relative);
  const previousWindow=global.window;
  const modules=new Map();
  global.window={DKDSPluginModules:{define(_plugin,id,value){modules.set(id,value);},get(_plugin,id){return modules.get(id);},require(_plugin,id){return modules.get(id);}}};
  try{
    delete require.cache[require.resolve(file)];
    require(file);
    return modules.get(moduleId);
  } finally { global.window=previousWindow; }
}
function deferred(){let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

(async()=>{
  // TER: execute the plugin-owned canonical source-scan projection, not only the
  // generic ScientificPlot mapping.
  const linkModule=loadPluginModule('src/plugins/ter-analysis/selection-link-runtime.js','selection-link-runtime');
  assert(linkModule?.create,'TER selection-link runtime must load');
  const resolver=(vg,source,direction)=>({artifactId:`artifact:${source||'default'}`,seriesId:`sweep:${Number(vg)}:${direction>0?'up':'down'}`});
  const nearly=(a,b)=>Math.abs(Number(a)-Number(b))<1e-9;
  const link=linkModule.create({sourceScanReference:resolver,nearlyEqual:nearly});
  const result={vgs:[-10,0,10],records:[
    {vg:-10,vds:.1,rUp:100,rDown:200,ter:100,sourceFile:'A'},
    {vg:0,vds:.1,rUp:110,rDown:220,ter:100,sourceFile:'B'},
    {vg:10,vds:.1,rUp:120,rDown:240,ter:100,sourceFile:'C'}
  ]};
  const refs=link.sourceScans(result);
  assert.strictEqual(refs.length,3);
  assert.deepStrictEqual(refs[1].ref,resolver(0,'B',1));
  const groups=[{vg:-10,sourceFile:'A',rows:[result.records[0]]},{vg:0,sourceFile:'B',rows:[result.records[1]]},{vg:10,sourceFile:'C',rows:[result.records[2]]}];
  const match=link.matchSelection({items:[{type:'data.sweep',ref:resolver(0,'B',-1)}],focus:{type:'data.sweep',ref:resolver(0,'B',-1)}},groups);
  assert(match&&match.group.vg===0&&match.direction===-1,'canonical source-scan ref must resolve back to the TER R-V group');
  const point=link.resistancePoint({points:[{curveNumber:2,x:.1}]},result,groups);
  assert(point&&point.vg===0&&point.vds===.1&&point.rUp===110&&point.rDown===220,'R-V click must recover the exact local TER point');

  const terFeature=fs.readFileSync(path.resolve(__dirname,'../src/plugins/ter-analysis/feature-runtime.js'),'utf8');
  assert(/sourceScans=selectionLink\.sourceScans\(result\)/.test(terFeature),'main TER heatmap must publish source-scan references');
  assert(/'ter-heatmap',\{publish:false\}\)/.test(terFeature),'main TER heatmap local point state must not overwrite canonical source-scan Selection');
  assert(/selectionLink\.resistancePoint\(event,result,resistanceGroups\)/.test(terFeature),'R-V click must restore exact local Vds highlighting');
  assert(/T\.interaction\?\.subscribe\?\.\(syncCanonicalScanSelection/.test(terFeature),'TER must consume canonical source-scan Selection back into its legacy/local highlight state');

  // Resonance: peak metrics from one render wave must settle as one reactive
  // notification instead of one group redraw per peak.
  const peakModule=loadPluginModule('src/plugins/resonance-workbench/feature-peak-runtime.js','feature-peak-runtime');
  const p1={id:'p1',sweepId:'s1',v:1,i:2},p2={id:'p2',sweepId:'s2',v:2,i:3};
  const sweeps=new Map([['s1',{id:'s1',step:.1}],['s2',{id:'s2',step:.1}]]);
  const jobs=new Map(),touches=[];let invalidations=0;
  const provider={id:'metric',version:'1.0.0',default:true,run({peak}){const d=deferred();jobs.set(peak.id,d);return d.promise;}};
  const peakRuntime=peakModule.create({
    live:{selectedPeakId:'p1',workspace:{activeMetricAlgorithm:'metric@1.0.0'},algorithmRuntime:{list:()=>[provider],provenance:()=>({algorithmId:'metric',algorithmVersion:'1.0.0'})},pipelineRuntime:null,reactiveRuntime:{touch:(key,meta)=>{touches.push({key,meta});return true;}}},
    services:{S:{}},actions:{sweepById:id=>sweeps.get(String(id)),invalidatePhysics:()=>{invalidations++;}},utils:{clone:value=>value}
  });
  assert.strictEqual(peakRuntime.peakMetrics(p1),null);assert.strictEqual(peakRuntime.peakMetrics(p2),null);
  jobs.get('p1').resolve({fwhm:.1,amplitude:1});await tick();await tick();
  assert.strictEqual(touches.filter(row=>row.key==='resonance.peak.metrics').length,0,'first completed metric must not redraw the whole group while sibling jobs are pending');
  assert.strictEqual(touches.filter(row=>row.key==='resonance.peak.metric-focus'&&row.meta?.peakId==='p1').length,1,'selected peak metric must invalidate the main/inspector immediately without waiting for sibling metrics');
  jobs.get('p2').resolve({fwhm:.2,amplitude:2});await tick();await tick();
  assert.strictEqual(touches.filter(row=>row.key==='resonance.peak.metrics').length,1,'one metric wave must emit one global group invalidation');
  assert.strictEqual(invalidations,1,'physics/group invalidation must also be batched per metric wave');

  // Resonant TER group curves must settle together as well.
  const terMetricModule=loadPluginModule('src/plugins/resonance-workbench/feature-ter-runtime.js','feature-ter-runtime');
  const terJobs=new Map();let resolvedWaves=0;
  const terMetric=terMetricModule.create({
    tasks:{submit(_task,payload){const d=deferred();terJobs.set(payload.label,d);return {promise:d.promise,cancel(){}};}},
    getWorkspace:()=>({peaks:[]}),getSweeps:()=>[],peakLabel:()=>'',onResolved:()=>{resolvedWaves++;}
  });
  terMetric.get('A',['s1']);terMetric.get('B',['s1']);
  terJobs.get('A').resolve([{vg:0,ter:1}]);await tick();await tick();
  assert.strictEqual(resolvedWaves,0,'resonant TER must not rerender group after the first label finishes');
  terJobs.get('B').resolve([{vg:0,ter:2}]);await tick();await tick();
  assert.strictEqual(resolvedWaves,1,'resonant TER labels in one wave must trigger one group redraw');

  // Actual memory-path fixes: source-table filtering, metadata-only long-lived
  // Resonance catalog, and private-memory status accounting.
  const resonance=fs.readFileSync(path.resolve(__dirname,'../src/plugins/resonance-workbench/feature-runtime.js'),'utf8');
  const resonanceData=fs.readFileSync(path.resolve(__dirname,'../src/plugins/resonance-workbench/feature-data-runtime.js'),'utf8');
  assert(resonanceData.includes("artifacts.list({kind:'data.table',includeTransient:true})"),'Resonance data owner must filter source tables before materialization');
  assert(resonance.includes('DataRuntime.materialize({artifacts,dataModel:D,workspace})'),'Resonance must materialize full source rows only through the dedicated data owner');
  assert(resonance.includes('datasets=DataRuntime.catalog(sourceDatasets)')&&resonanceData.includes('const {points:_points,...metadata}=dataset'),'Resonance must release the full object-per-row source dataset after sweep construction');
  assert(resonance.includes('signature===derivedArtifactsSignature'),'derived sweep artifacts must not be republished on every UI render');
  const terService=fs.readFileSync(path.resolve(__dirname,'../src/plugins/ter-analysis/analysis-service.js'),'utf8');
  assert(terService.includes("list?.({kind:'data.table',includeTransient:true})"),'TER input materialization must be bounded to source tables');
  const status=fs.readFileSync(path.resolve(__dirname,'../src/plugins/status-monitor/plugin.js'),'utf8');
  assert(/runtime[^\n]*desktop[^\n]*privateBytes/s.test(status)||status.includes("status?.runtime||'')==='desktop'&&Number(m.privateBytes)>0"),'desktop memory display must prefer additive private bytes');
  assert(status.includes('工作集包含共享页'),'memory UI must explain why process working sets are not summed as application memory');

  console.log('v3.68.95 runtime effectiveness regressions PASS');
})().catch(err=>{console.error(err);process.exit(1);});
