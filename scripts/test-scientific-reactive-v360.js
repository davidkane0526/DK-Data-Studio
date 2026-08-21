const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/scientific-reactive-runtime.js'),'utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const context={console,structuredClone:global.structuredClone,setTimeout,clearTimeout,queueMicrotask,performance:{now:()=>Date.now()},requestAnimationFrame:fn=>setTimeout(()=>fn(Date.now()),0),cancelAnimationFrame:clearTimeout};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'scientific-reactive-runtime.js'});
(async()=>{
  const runtime=context.DKDSScientificReactive;
  assert(runtime&&runtime.VERSION==='1.0.0','Scientific Reactive Runtime v1.0.0 must be available.');
  const scope=runtime.createScope('test.reactive');
  let derivedRuns=0,effectRuns=0;
  scope.derive('metric',{dependsOn:['peak.geometry'],compute:ctx=>{derivedRuns++;return ctx.revision('peak.geometry')*10;}});
  scope.effect('group-view',{dependsOn:['metric'],scheduler:'microtask',effect:()=>{effectRuns++;}});
  scope.transact('drag-commit',tx=>{tx.touch('peak.geometry');tx.touch('peak.geometry');});
  await delay(10);
  assert.strictEqual(scope.revision('peak.geometry'),1,'One transaction must coalesce repeated touches of the same scientific node.');
  assert.strictEqual(derivedRuns,1,'A coalesced transaction must compute each derived dependency once.');
  assert.strictEqual(scope.value('metric'),10,'Derived result must publish through the dependency graph.');
  assert.strictEqual(effectRuns,1,'Dependent views must refresh once for the committed revision.');

  let releaseFirst;
  const first=scope.runLatest('async.metric',()=>new Promise(resolve=>{releaseFirst=resolve;}),{dependsOn:['peak.geometry']});
  const second=scope.runLatest('async.metric',()=>Promise.resolve('new'),{dependsOn:['peak.geometry']});
  const secondResult=await second;assert(secondResult.accepted&&secondResult.value==='new','Newest async computation must be accepted.');
  releaseFirst('old');const firstResult=await first;assert(firstResult.stale&&!firstResult.accepted,'Older async computation must be rejected after a newer revision/task starts.');

  let asyncRuns=0,resolveOld;
  scope.derive('async-derived',{dependsOn:['source'],async:true,compute:()=>{asyncRuns++;return asyncRuns===1?new Promise(resolve=>{resolveOld=resolve;}):Promise.resolve('fresh');}});
  scope.touch('source');await delay(1);scope.touch('source');await delay(1);resolveOld('stale');await delay(15);
  assert.strictEqual(scope.value('async-derived'),'fresh','Stale async derived results must never overwrite a newer dependency revision.');
  assert(scope.snapshot().stats.asyncStale>=2,'Reactive diagnostics must expose stale async rejections.');
  runtime.removeOwner('test.reactive');
  console.log('Scientific Reactive Runtime v3.60 transaction/dependency/stale-result checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
