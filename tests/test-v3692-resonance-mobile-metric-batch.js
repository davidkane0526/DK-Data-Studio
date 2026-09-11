'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const atLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};

(async()=>{
  assert(atLeast(json('package.json').version,'3.69.2'),'App version must remain at or above 3.69.2.');
  assert(Number(json('mobile/app.json').expo.android.versionCode)>=128,'Android versionCode must advance for the 3.69.2 Mobile metric closure build.');

  // Pass 1 regression: derived group charts share one peak-metrics result per
  // peak, so Mobile must not serialize one brand-new Worker startup per peak.
  const providerSource=read('src/plugins/resonance-detector-robust/plugin.js');
  const taskSource=read('src/plugins/resonance-detector-robust/resonance-task.js');
  assert(providerSource.includes("runTask('metrics-batch'"),'Peak metrics provider must submit batched worker work.');
  assert(providerSource.includes('metricQueue.splice(0,128)'),'Metric batches must remain bounded.');
  assert(providerSource.includes("{latest:false}"),'Independent metric batches must not cancel their predecessor.');
  assert(!/run:\(input\)=>runTask\('metrics'/.test(providerSource),'Peak metrics provider must not restore one Worker task per individual peak.');
  assert(taskSource.includes("op==='metrics-batch'")&&taskSource.includes('.map(row=>A.peakMetrics(row?.peak,row?.sweep))'),'Worker task must execute one metric result for every item in the batch.');
  assert(!taskSource.includes("op==='metrics'"),'Obsolete per-peak worker operation must not remain as a second metrics execution path.');

  // Pass 2 executable provider path: activate the real Algorithm Plugin, issue
  // the same 59 metric requests visible in the user's project, and verify that
  // they coalesce into a single Core Task submission while every caller still
  // receives its own result.
  let activate=null;
  const algorithms=new Map();
  const submissions=[];
  const context={
    console,Promise,queueMicrotask,setTimeout,clearTimeout,
    DKDSPlugins:{define(_manifest,fn){activate=fn;}},
  };
  context.window=context;context.globalThis=context;
  vm.createContext(context);
  vm.runInContext(providerSource,context,{filename:'resonance-detector-robust/plugin.js'});
  assert.strictEqual(typeof activate,'function','Algorithm plugin activation must be captured.');
  const algorithmModule={detectPeaks(){return[];},peakMetrics(){return null;}};
  const ctx={
    science:{preset:()=>({})},
    modules:{require:id=>id==='algorithm'?algorithmModule:null},
    analysis:{algorithms:{register(id,spec){algorithms.set(id,spec);}}},
    tasks:{submit(task,payload,options){
      submissions.push({task,payload,options});
      return {promise:new Promise(resolve=>queueMicrotask(()=>resolve((payload.items||[]).map((row,index)=>({fwhm:index+.1,amplitude:index+1,area:index+2,peakId:row.peak.id})))))};
    }}
  };
  await activate(ctx);
  const metric=algorithms.get('baseline-fwhm-v1');
  assert(metric&&typeof metric.run==='function','Metric Algorithm Provider must register.');
  const sweep={id:'sweep-shared',points:[{v:-1,i:1},{v:0,i:2},{v:1,i:1}]};
  const pending=Array.from({length:59},(_,index)=>metric.run({peak:{id:`peak-${index}`,v:index/10,i:index},sweep}));
  await tick();
  assert.strictEqual(submissions.length,1,'59 same-turn metric requests must produce exactly one Core Task submission on Mobile.');
  assert.strictEqual(submissions[0].task,'resonance-compute');
  assert.strictEqual(submissions[0].payload.op,'metrics-batch');
  assert.strictEqual(submissions[0].payload.items.length,59);
  assert.strictEqual(submissions[0].options.latest,false,'Metric batch must not use latest-wins cancellation.');
  const values=await Promise.all(pending);
  assert.strictEqual(values.length,59);
  assert.strictEqual(values[0].peakId,'peak-0');
  assert.strictEqual(values[58].peakId,'peak-58');
  assert(values.every(v=>Number.isFinite(v.fwhm)&&Number.isFinite(v.amplitude)&&Number.isFinite(v.area)),'Every peak request must receive complete derived metrics.');

  // Execute the actual worker task module's batch branch independently from the
  // provider queue to prove the worker-side mapping preserves result order.
  const taskContext={console,self:{DKDSResonanceAlgorithms:{peakMetrics:(peak,sweep)=>({id:peak.id,sweepId:sweep.id,fwhm:Number(peak.v)+1,amplitude:Number(peak.i)+2,area:3})}}};
  taskContext.globalThis=taskContext.self;
  vm.createContext(taskContext);vm.runInContext(taskSource,taskContext,{filename:'resonance-task.js'});
  const batch=await taskContext.self.DKDSTaskDefinition.run({op:'metrics-batch',items:[{peak:{id:'a',v:1,i:2},sweep:{id:'sa'}},{peak:{id:'b',v:3,i:4},sweep:{id:'sb'}}]});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(batch)),[{id:'a',sweepId:'sa',fwhm:2,amplitude:4,area:3},{id:'b',sweepId:'sb',fwhm:4,amplitude:6,area:3}]);

  console.log('v3.69.2 Resonance Mobile metric batching PASS: 59 derived-metric requests -> 1 bounded Core Worker task with ordered FWHM/amplitude/area results.');
})().catch(error=>{console.error(error);process.exit(1);});
