'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

class FakeWorker{
  static instances=[];
  constructor(url){this.url=String(url);this.terminated=false;FakeWorker.instances.push(this);}
  postMessage(msg){this.last=msg;}
  terminate(){this.terminated=true;}
  progress(progress){this.onmessage?.({data:{type:'progress',progress}});}
  finish(result){this.onmessage?.({data:{type:'result',result}});}
  fail(message='failed'){this.onmessage?.({data:{type:'error',error:message}});}
}

function loadTasks(){
  FakeWorker.instances=[];
  const document={baseURI:'file:///app/src/index.html',currentScript:{src:'file:///app/src/core/execution/task-runtime.js'},documentElement:{dataset:{dkdsHost:'desktop'}}};
  const context={console,document,navigator:{hardwareConcurrency:8,deviceMemory:8},Worker:FakeWorker,URL,Blob,setTimeout,clearTimeout,Date,Promise,Object,Array,Map,Set,Number,String,Math};
  context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/core/execution/task-runtime.js'),context,{filename:'task-runtime.js'});return context.DKDSTasks;
}

function loadData(){
  const context={console,structuredClone,ArrayBuffer,Float32Array,Float64Array,Date,Math,JSON,Number,String,Array,Object,Map,Set,WeakMap};
  context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/core/data/model.js'),context,{filename:'model.js'});return context.DKDSData;
}

(async()=>{
  // ---- Task Runner real progress ----
  const tasks=loadTasks();
  const scope=tasks.createScope('plugin.progress',[{id:'fit',entry:'fit.js',source:'self.DKDSTaskDefinition={run:async()=>42};'}],'file:///app/src/plugins/progress/');
  const handle=scope.submit('fit',{},{key:'finite-q'});
  const worker=FakeWorker.instances.at(-1),events=[];
  const off=handle.onProgress(progress=>events.push(progress));
  worker.progress({stage:'gate-fit',label:' first ',completed:1,total:10});
  assert.strictEqual(events.length,1,'First worker progress update should be delivered immediately.');
  assert.strictEqual(events[0].stage,'gate-fit');
  assert.strictEqual(events[0].label,'first');
  assert.strictEqual(events[0].fraction,0.1,'fraction should derive from completed/total when omitted.');
  worker.progress({stage:'gate-fit',completed:2,total:10});
  worker.progress({stage:'gate-fit',completed:4,total:10});
  assert.strictEqual(events.length,1,'Rapid updates must be coalesced instead of flooding renderer listeners.');
  await sleep(70);
  assert.strictEqual(events.length,2,'One coalesced update should be delivered after the throttle window.');
  assert.strictEqual(events[1].completed,4,'Coalescing must retain the newest pending progress update.');
  worker.progress({fraction:2,completed:9,total:5,stage:'done'});
  await sleep(70);
  assert.strictEqual(events.at(-1).fraction,1,'fraction must be bounded to 0..1.');
  assert.strictEqual(events.at(-1).completed,5,'completed must not exceed a known total.');
  assert.strictEqual(handle.progress.stage,'done','Task handle should retain the latest delivered progress snapshot.');
  worker.progress({stage:'final',completed:5,total:5});
  worker.finish(42);
  assert.strictEqual(await handle.promise,42);
  assert.strictEqual(events.at(-1).stage,'final','A pending final progress update must flush before successful completion.');
  off();

  const cancelled=scope.submit('fit',{},{key:'cancel-progress'});cancelled.promise.catch(()=>{});
  const cancelledWorker=FakeWorker.instances.at(-1),cancelEvents=[];cancelled.onProgress(progress=>cancelEvents.push(progress));
  cancelledWorker.progress({stage:'running',completed:1,total:5});
  cancelledWorker.progress({stage:'running',completed:2,total:5});
  const deliveredBeforeCancel=cancelEvents.length;
  cancelled.cancel('test');
  cancelledWorker.progress({stage:'should-not-deliver',completed:5,total:5});
  await sleep(70);
  assert.strictEqual(cancelEvents.length,deliveredBeforeCancel,'Cancellation must stop progress delivery immediately and discard pending progress.');
  assert.strictEqual(cancelled.state,'cancelled');

  const old=scope.submit('fit',{},{key:'latest-progress'});old.promise.catch(()=>{});const oldWorker=FakeWorker.instances.at(-1),oldEvents=[];old.onProgress(p=>oldEvents.push(p));
  oldWorker.progress({stage:'old',fraction:0.1});
  const replacement=scope.submit('fit',{},{key:'latest-progress'});replacement.promise.catch(()=>{});const replacementWorker=FakeWorker.instances.at(-1),replacementEvents=[];replacement.onProgress(p=>replacementEvents.push(p));
  const oldCount=oldEvents.length;oldWorker.progress({stage:'stale',fraction:0.9});replacementWorker.progress({stage:'new',fraction:0.2});
  assert.strictEqual(oldEvents.length,oldCount,'Superseded generations must not publish later progress.');
  assert.strictEqual(replacementEvents.at(-1).stage,'new');
  replacement.cancel('cleanup');
  scope.dispose();

  const taskSource=read('src/core/execution/task-runtime.js');
  assert(taskSource.includes('context.reportProgress')||taskSource.includes('reportProgress(value)'),'Worker context must expose reportProgress().');
  assert(taskSource.includes("type:'progress'"),'Worker runner must transport progress through postMessage, not direct UI access.');
  assert(taskSource.includes('PROGRESS_INTERVAL_MS=50'),'Core must own a bounded progress delivery cadence.');

  // ---- Acquisition-order metadata ----
  const D=loadData();
  const table=D.createTable({id:'acq:source',name:'source',metadata:{importedSource:true,acquisition:{runId:'run-A',sequenceIndex:7,timestamp:'2026-09-11T10:00:00Z',parentSequenceIndex:6}},source:{path:'a.dat'},columns:[{key:'x',values:[1]}]});
  const store=D.createStore([table]);
  const meta=store.listMetadata({id:'acq:source'})[0];
  assert(meta.acquisition,'listMetadata() must retain explicit lightweight acquisition metadata.');
  assert.strictEqual(meta.acquisition.runId,'run-A');
  assert.strictEqual(meta.acquisition.sequenceIndex,7);
  assert.strictEqual(meta.acquisition.parentSequenceIndex,6);
  assert.strictEqual(meta.acquisition.provenance,'source','Explicit acquisition sequence without a provenance marker defaults to source provenance.');
  assert(!Object.prototype.hasOwnProperty.call(meta,'provenance'),'Acquisition metadata must not reintroduce full provenance payloads into metadata-only enumeration.');

  const normalized=D.normalizeAcquisition({runId:'  run-B  ',sequenceIndex:-1,parentSequenceIndex:2.2,timestamp:' raw-clock ',provenance:'invalid'});
  assert.strictEqual(normalized.runId,'run-B');assert.strictEqual(normalized.timestamp,'raw-clock');
  assert(!Object.prototype.hasOwnProperty.call(normalized,'sequenceIndex'),'Negative sequenceIndex must fail closed.');
  assert(!Object.prototype.hasOwnProperty.call(normalized,'parentSequenceIndex'),'Non-integer parentSequenceIndex must fail closed.');
  assert(!Object.prototype.hasOwnProperty.call(normalized,'provenance'),'Unknown acquisition provenance must fail closed.');

  global.window={DKDSData:D};
  const importStream=require('../src/app/modules/import-stream-runtime');
  const fallback=importStream.acquisitionMetadata({metadata:{},source:{acquisition:{runId:'run-C',timestamp:'clock-1'}}},{},3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(fallback)),{runId:'run-C',timestamp:'clock-1',sequenceIndex:3,provenance:'import-batch'},'Shared importer must deterministically assign missing sequenceIndex and preserve source fields.');
  const explicit=importStream.acquisitionMetadata({metadata:{acquisition:{runId:'run-D',sequenceIndex:11,parentSequenceIndex:10}}},{},4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(explicit)),{runId:'run-D',sequenceIndex:11,parentSequenceIndex:10,provenance:'source'},'Importer-provided sequenceIndex must be preserved rather than replaced by batch order.');

  // Generic JSON importer preserves explicit source acquisition metadata.
  const sandbox={console,structuredClone,Date,Math,JSON,Number,String,Array,Object,Set,Map,RegExp,Error};
  sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.crypto={randomUUID:()=> 'runtime-test'};
  sandbox.DKDSScience={
    inspectDataText:()=>({headers:['x','y'],suggestedX:0,suggestedYCols:[1],suggestedLayout:'single'}),
    defaultImportOptions:()=>({}),normalizeImportOptions:o=>o||{},parseVg:()=>null,parseVgFromImportHeader:()=>null,
    parseFlexibleData:file=>({datasets:[{name:'json',path:file.path,sourcePath:file.path,sourceName:file.name,vg:null,points:[{v:1,i:2,sourceLine:1}],importSpec:{xHeader:'x',yHeader:'y',xCol:0,yCol:1}}]}),
    createFlexibleDataStream:()=>null
  };
  vm.createContext(sandbox);vm.runInContext(read('src/core/data/model.js'),sandbox);let definition=null;
  sandbox.DKDSPlugins={define:(manifest,activate)=>{definition={manifest,activate};}};
  vm.runInContext(read('src/plugins/flexible-import/plugin.js'),sandbox,{filename:'flexible-import.js'});
  let provider=null;await definition.activate({science:sandbox.DKDSScience,data:{model:sandbox.DKDSData,importers:{register:(id,spec)=>{provider={id,...spec};return provider;}}}});
  const json=JSON.stringify({acquisition:{runId:'instrument-1',sequenceIndex:4,timestamp:'2026-09-11T12:00:00Z'},rows:[[1,2],[3,4]],columns:['x','y']});
  const imported=provider.parseArtifacts({name:'history.json',path:'history.json',text:json},{}).artifacts[0];
  assert.strictEqual(imported.metadata.acquisition.runId,'instrument-1');assert.strictEqual(imported.metadata.acquisition.sequenceIndex,4);

  const hostSource=read('src/app/modules/data-artifact-host.js');
  const pluginApi=read('src/core/plugins/kernel/modules/plugin-api.js');
  const windowsSource=read('src/app/modules/dedicated-plugin-windows.js');
  assert(hostSource.includes('acquisitionOrder=(options={})')&&hostSource.includes('provenance'), 'Data Sources host must own acquisitionOrder().');
  assert(pluginApi.includes('acquisitionOrder:options=>sourceCapability()?.acquisitionOrder?.(options)||[]'),'Plugin API must expose acquisitionOrder().');
  assert(windowsSource.includes("acquisitionOrder:typeof sourceApi.acquisitionOrder==='function'?sourceApi.acquisitionOrder():[]"),'Dedicated windows must receive a synchronized acquisition-order snapshot rather than reusing UI order.');

  const types=read('sdk/plugin-api.d.ts'),taskGuide=read('sdk/TASK_RUNNER.md'),acqGuide=read('sdk/ACQUISITION_ORDER.md'),contract=JSON.parse(read('sdk/contract.json'));
  assert(types.includes('interface DKDSTaskProgress')&&types.includes('onProgress(listener:'),'SDK types must expose bounded Task Runner progress.');
  assert(types.includes('DKDSAcquisitionMetadata')&&types.includes('acquisitionOrder(options?'),'SDK types must expose acquisition metadata/order.');
  assert(taskGuide.includes('context.reportProgress')&&taskGuide.includes('handle.onProgress'),'Task Runner guide must document both worker and renderer sides.');
  assert(acqGuide.includes("provenance:'import-batch'")&&acqGuide.includes('must not interpret UI order'),'Acquisition guide must explicitly reject UI enumeration order as physical history.');
  assert(sdkAtLeast(contract.sdkVersion,'1.49.0'));assert(sdkAtLeast(contract.minimumAppVersion,'3.70.6'));
  const pkg=JSON.parse(read('package.json')),mobileTest=String(pkg.scripts?.['mobile:test']||'');
  assert(mobileTest.includes('npm run sdk:authoring')&&mobileTest.indexOf('npm run sdk:authoring')<mobileTest.indexOf('node tests/run.js mobile'),'Clean-source mobile:test must regenerate the exported SDK bundle before Mobile SDK-export regression coverage runs.');

  console.log('v3.70.6 SDK Task Runner progress + acquisition-order metadata PASS');
})().catch(err=>{console.error(err);process.exit(1);});
