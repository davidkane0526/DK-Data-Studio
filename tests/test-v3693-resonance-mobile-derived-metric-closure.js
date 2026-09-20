'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function loadPeakRuntime(){
  let exported=null;
  const context={console,setTimeout,clearTimeout,Promise,window:{DKDSPluginModules:{define(_owner,_name,value){exported=value;}}}};
  context.globalThis=context.window;
  vm.createContext(context);
  vm.runInContext(read('src/plugins/resonance-workbench/feature-peak-runtime.js'),context,{filename:'feature-peak-runtime.js'});
  return exported;
}

(async()=>{
  const appPackage=JSON.parse(read('package.json'));const mobileApp=JSON.parse(read('mobile/app.json'));
  assert(Number(appPackage.version.split('.').slice(0,3).join(''))>=3693,'v3.69.3 regression must remain active on later maintenance builds.');
  assert(Number(mobileApp.expo.android.versionCode)>=129,'Android versionCode must advance for 3.69.3.');
  // The cache must follow stable peak identity, not a particular rematerialized
  // JS object. Mobile/project projection can legitimately replace objects while
  // preserving the same peak id.
  const PeakRuntime=loadPeakRuntime();
  assert(PeakRuntime?.create,'Peak runtime must load.');
  const sweep={id:'sweep-a',step:0.01,points:[{v:-1,i:0},{v:0,i:2},{v:1,i:0}]};
  const workspace={activeMetricAlgorithm:'baseline-fwhm-v1@1.0.0'};
  let resolveMetric=null,providerCalls=0,settledCalls=0,status='';
  const provider={id:'baseline-fwhm-v1',version:'1.0.0',category:'peak-metrics',default:true,run(){providerCalls+=1;return new Promise(resolve=>{resolveMetric=resolve;});}};
  const runtime=PeakRuntime.create({
    live:{workspace,algorithmRuntime:{list:()=>[provider],provenance:ref=>({algorithmId:ref.id,algorithmVersion:ref.version})},pipelineRuntime:null,reactiveRuntime:null,selectedPeakId:''},
    services:{S:{},setStatus:value=>{status=String(value||'');}},
    actions:{sweepById:id=>id===sweep.id?sweep:null,invalidatePhysics(){},metricWaveSettled(){settledCalls+=1;},visibleSweeps:()=>[],selectedSweep:()=>null,normalizeCategories(){},publishPeakSelection(){},render(){},commitWorkspaceEdit(){},assignDetectedOrders:x=>x,peaksInRange:()=>[]},
    utils:{clone:value=>JSON.parse(JSON.stringify(value))}
  });
  const p1={id:'peak-1',sweepId:sweep.id,v:0,i:2,analysisLeft:-.2,analysisRight:.2,analysisManual:false};
  assert.strictEqual(runtime.peakMetrics(p1),null,'First read starts asynchronous metric work.');
  assert.strictEqual(providerCalls,1);
  const p2={...p1}; // same domain identity, new object instance
  resolveMetric({fwhm:.12,amplitude:1.5,area:.3});
  await tick();await tick();
  const rematerialized=runtime.peakMetrics(p2);
  assert(rematerialized&&rematerialized.fwhm===.12&&rematerialized.amplitude===1.5&&rematerialized.area===.3,'Rematerialized peak object must reuse completed metrics by stable peak identity.');
  assert.strictEqual(providerCalls,1,'Stable identity hit must not resubmit metric work.');
  assert.strictEqual(settledCalls,1,'A resolved metric wave must issue one settled notification.');
  assert.strictEqual(runtime.diagnostics().cacheEntries,1,'Stable cache should retain one bounded entry.');

  // Reset while an old request is in flight: the old project/workspace result
  // must never leak back into the new epoch.
  let resolveOld=null;
  provider.run=()=>{providerCalls+=1;return new Promise(resolve=>{resolveOld=resolve;});};
  const p3={id:'peak-2',sweepId:sweep.id,v:.2,i:1,analysisLeft:0,analysisRight:.4,analysisManual:false};
  runtime.peakMetrics(p3);runtime.resetMetricCache({reason:'project-switch'});
  resolveOld({fwhm:99,amplitude:99,area:99});await tick();await tick();
  assert.strictEqual(runtime.diagnostics().cacheEntries,0,'Old-epoch result must be discarded after project/workspace rematerialization.');

  // Built-in task source transport: generated catalog must carry exact task
  // bytes so Android workers do not have to import plugin code from file://.
  const generator=require('../scripts/generate-plugin-index');
  const built=generator.buildPluginIndexSource();
  const resonance=built.plugins.find(row=>row.id==='builtin.resonance-detector-robust');
  assert(resonance?.taskSources&&typeof resonance.taskSources['resonance-task.js']==='string','Built-in index must embed resonance task source.');
  assert(typeof resonance.taskSources['task-core.js']==='string'&&typeof resonance.taskSources['algorithm.js']==='string','Built-in index must embed every declared task import.');
  const packageRuntime=read('src/core/plugins/kernel/modules/package-runtime.js');
  assert(packageRuntime.includes("definition=applyPackage(id,row.manifest,String(row?.source||'builtin'),row?.taskSources||{},{taskCoreSources:row?.taskCoreSources||{}})"),'Built-in loader must attach generated task sources through the canonical package operation before Plugin API scope creation.');

  // Core task runner must itself use a blob worker and must cleanly reject a
  // synchronous postMessage/DataClone failure instead of leaving a permanent
  // running task (which previously surfaced as an indefinitely blank chart).
  class FakeWorker{
    static rows=[];static throwPost=false;
    constructor(url){this.url=String(url);FakeWorker.rows.push(this);}
    postMessage(msg){if(FakeWorker.throwPost)throw new Error('clone failed');this.msg=msg;}
    terminate(){this.terminated=true;}
    finish(result){this.onmessage?.({data:{type:'result',result}});}
  }
  const taskDocument={baseURI:'file:///android_asset/dkds/index.html',currentScript:{src:'file:///android_asset/dkds/core/execution/task-runtime.js'},documentElement:{dataset:{dkdsHost:'mobile'}}};
  const taskContext={console,document:taskDocument,navigator:{hardwareConcurrency:8,deviceMemory:8},Worker:FakeWorker,URL,Blob,Promise,setTimeout,clearTimeout};taskContext.window=taskContext;taskContext.globalThis=taskContext;
  vm.createContext(taskContext);vm.runInContext(read('src/core/execution/task-runtime.js'),taskContext,{filename:'task-runtime.js'});
  const scope=taskContext.DKDSTasks.createScope('builtin.test',[{id:'metric',entry:'metric.js',source:'self.DKDSTaskDefinition={run:async input=>input};',imports:['dep.js'],importSources:{'dep.js':'self.dep=1;'}}],'file:///android_asset/dkds/plugins/test/');
  const job=scope.submit('metric',{x:1},{latest:false});
  assert(FakeWorker.rows[0].url.startsWith('blob:'),'Task runner must execute a source-composed blob worker rather than a file:// worker on Mobile.');
  assert(!('moduleUrl' in FakeWorker.rows[0].msg)&&!('importUrls' in FakeWorker.rows[0].msg)&&!('appBaseUrl' in FakeWorker.rows[0].msg),'Current task transport must not ask the worker to import nested file/blob URLs.');
  FakeWorker.rows[0].finish({ok:true});assert.deepStrictEqual(await job.promise,{ok:true});

  FakeWorker.throwPost=true;
  const failed=scope.submit('metric',{bad:true},{latest:false});
  await assert.rejects(failed.promise,/clone failed/);
  assert.strictEqual(taskContext.DKDSTasks.snapshot('builtin.test').running,0,'Synchronous Worker postMessage failure must release the running slot.');
  assert.strictEqual(failed.state,'failed');

  // The obsolete file bootstrap must be gone so worker protocol has one owner.
  assert(!fs.existsSync(path.join(root,'src/core/execution/task-worker-bootstrap.js')),'Task worker bootstrap must have one owner inside task-runtime.js.');
  assert.strictEqual(status,'','Successful metric flow should not emit a failure status.');
  console.log('v3.69.3 Mobile derived-metric closure PASS: stable metric identity + project epoch isolation + embedded blob Worker transport + fail-fast task slot cleanup.');
})().catch(error=>{console.error(error);process.exit(1);});
