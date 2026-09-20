'use strict';
const sdkAtLeast=(value,floor)=>{const a=String(value||'0.0.0').split('.').map(Number),b=String(floor||'0.0.0').split('.').map(Number);for(let i=0;i<3;i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
class FakeWorker{
  static instances=[];
  constructor(url){this.url=String(url);this.terminated=false;FakeWorker.instances.push(this);}
  postMessage(msg){this.last=msg;}
  terminate(){this.terminated=true;}
  finish(result){this.onmessage?.({data:{type:'result',result}});}
}
function runtime(host='desktop',hardwareConcurrency=8,deviceMemory=8){
  FakeWorker.instances=[];
  const document={baseURI:'file:///app/src/index.html',currentScript:{src:'file:///app/src/core/execution/task-runtime.js'},documentElement:{dataset:{dkdsHost:host}}};
  const context={console,document,navigator:{hardwareConcurrency,deviceMemory},Worker:FakeWorker,URL,Blob,setTimeout,clearTimeout,Promise};context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/core/execution/task-runtime.js'),context);return context.DKDSTasks;
}
(async()=>{
  const tasks=runtime();assert(tasks,'Core task runtime must install.');assert.strictEqual(tasks.concurrencyLimit(),3,'8 threads / 8 GiB desktop should use bounded cap 3.');
  const scope=tasks.createScope('plugin.a',[{id:'work',entry:'work.js',source:'self.DKDSTaskDefinition={run:async input=>input};'}],'file:///app/src/plugins/a/');
  const a=scope.submit('work',{v:1},{key:'same'});a.promise.catch(()=>{});const b=scope.submit('work',{v:2},{key:'same'});b.promise.catch(()=>{});
  assert.strictEqual(a.state,'cancelled','new same-key generation must cancel old task');assert(FakeWorker.instances[0].terminated,'running stale worker must be terminated');FakeWorker.instances.at(-1).finish(2);await b.promise;
  let published=0;const c=scope.submit('work',{v:3},{key:'publish',publish:r=>{published+=r;}});const cWorker=FakeWorker.instances.at(-1);cWorker.finish(5);assert.strictEqual(await c.promise,5);assert.strictEqual(published,5,'only the current generation may publish');
  const jobs=[];const before=FakeWorker.instances.length;for(let i=0;i<4;i++){const job=scope.submit('work',{i},{key:`parallel-${i}`});job.promise.catch(()=>{});jobs.push(job);}assert.strictEqual(FakeWorker.instances.length-before,3,'desktop runner must start only its bounded in-flight limit');assert.strictEqual(tasks.snapshot('plugin.a').queued,1,'excess work must remain queued');
  for(const instance of FakeWorker.instances.slice(-3))instance.finish(1);await Promise.resolve();await Promise.resolve();assert(FakeWorker.instances.length-before<=4,'queue may start one replacement but never an unbounded pool');
  scope.dispose();
  assert.strictEqual(runtime('mobile',16,16).concurrencyLimit(),1,'Mobile must stay at one worker regardless of hardware count.');
  assert.strictEqual(runtime('desktop',4,4).concurrencyLimit(),2,'low-memory desktop must use the lower bounded cap.');

  const workerContext={self:{}};workerContext.globalThis=workerContext.self;vm.createContext(workerContext);vm.runInContext(read('src/plugins/pulse-sampler-tool/steady-state-task.js'),workerContext);
  const extract=workerContext.self.DKDSTaskDefinition.run;
  const result=await extract({dataTimes:[0,1,2,3,4,5],dataCurrent:[1,1,3,3,5,5],pulseTime:[1,3,5],pulseVoltage:[0,2,0],trimLeftRaw:0,trimRightRaw:0});
  assert.deepStrictEqual(Array.from(result.means),[1,3,5]);assert.deepStrictEqual(Array.from(result.readCurrent),[1,5]);assert.deepStrictEqual(Array.from(result.pulseCurrent),[3]);

  const manifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));assert(manifest.requiresCore.includes('execution.tasks'));assert.deepStrictEqual(manifest.tasks,[{id:'extract-steady-state',entry:'steady-state-task.js'}]);
  const pluginSource=read('src/plugins/pulse-sampler-tool/plugin.js');assert(pluginSource.includes("ctx.tasks.submit('extract-steady-state'"));assert(!pluginSource.includes('function extractSteadyState('),'main-thread extraction fallback must be removed');
  const contract=JSON.parse(read('sdk/contract.json'));assert(sdkAtLeast(contract.sdkVersion,'1.49.0'));assert(sdkAtLeast(contract.minimumAppVersion,'3.70.6'));
  const types=read('sdk/plugin-api.d.ts');assert(types.includes('readonly tasks:DKDSTaskRuntime|null'));assert(types.includes('tasks?:DKDSManifestTask[]'));
  const coreContract=read('src/core/plugins/contract-runtime.js');assert(coreContract.includes("'execution.tasks':api=>!!api?.tasks"));
  console.log('v3.68.81 bounded Core task runner + Pulse Worker consumer PASS');
})().catch(err=>{console.error(err);process.exit(1);});
