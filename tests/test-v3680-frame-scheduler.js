'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/ui/frame-scheduler.js'),'utf8');
const composition=JSON.parse(fs.readFileSync(path.join(root,'src/core/ui/composition/composition.json'),'utf8'));
const runtime=fs.readFileSync(path.join(root,'src/core/ui/modules/runtime.js'),'utf8');
const index=fs.readFileSync(path.join(root,'src/index.html'),'utf8');
const pluginWindow=fs.readFileSync(path.join(root,'src/plugin-window/index.html'),'utf8');

let token=0,requestCount=0,cancelCount=0;
const frames=new Map();
const context={
  console,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  requestAnimationFrame(callback){const id=++token;requestCount++;frames.set(id,callback);return id;},
  cancelAnimationFrame(id){if(frames.delete(id))cancelCount++;}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'frame-scheduler.js'});
const scheduler=context.DKDSFrameScheduler;
assert(scheduler&&scheduler.VERSION==='1.1.0','Frame Scheduler must initialize as one Core runtime owner.');
const order=[];
scheduler.schedule('appearance',()=>order.push('appearance'),{priority:scheduler.PRIORITY.APPEARANCE});
scheduler.schedule('semantic',()=>order.push('semantic-old'),{priority:scheduler.PRIORITY.SEMANTIC});
scheduler.schedule('material',()=>order.push('material'),{priority:scheduler.PRIORITY.MATERIAL});
scheduler.schedule('semantic',()=>order.push('semantic'),{priority:scheduler.PRIORITY.SEMANTIC});
assert.equal(requestCount,1,'Multiple Core invalidations in one turn must share one RAF request.');
assert.equal(frames.size,1,'Only one browser frame may be pending.');
const [firstId,firstFrame]=frames.entries().next().value;frames.delete(firstId);firstFrame(16.6);
assert.deepEqual(order,['semantic','material','appearance'],'Shared frame work must execute in semantic → material → appearance order.');
assert.equal(scheduler.snapshot().coalesced,1,'Same-key invalidation must coalesce instead of allocating duplicate frame work.');
const frameStats=scheduler.snapshot();
assert(frameStats.maxPending>=3,'Frame Scheduler diagnostics must report peak queue pressure.');
assert(frameStats.callbacksByPriority[scheduler.PRIORITY.SEMANTIC]===1,'Frame Scheduler diagnostics must retain per-priority callback counts.');
assert(Number.isFinite(frameStats.lastFlushMs)&&Number.isFinite(frameStats.maxFlushMs),'Frame Scheduler must expose flush timing diagnostics.');

scheduler.schedule('after-two',()=>order.push('after-two'),{delayFrames:2});
assert.equal(requestCount,2,'Delayed work must still use the same scheduler frame source.');
let entry=frames.entries().next().value;frames.delete(entry[0]);entry[1](33.2);
assert(!order.includes('after-two'),'Two-frame work must not run on the first scheduled frame.');
assert.equal(frames.size,1,'Scheduler must keep exactly one RAF pending for future-frame work.');
entry=frames.entries().next().value;frames.delete(entry[0]);entry[1](49.8);
assert.equal(order.at(-1),'after-two','Two-frame work must run on the requested later frame.');

scheduler.schedule('cancel-me',()=>order.push('cancelled'));
assert(scheduler.cancel('cancel-me'),'Cancellation must remove pending work.');
assert.equal(frames.size,0,'Cancelling the final pending task must cancel the browser frame.');
assert(cancelCount>=1,'Final-task cancellation must release the RAF token.');

for(const id of ['ui/frame-scheduler','ui/dom-mutation-hub'])assert(composition.importableModules.some(row=>row.id===id),`${id} must be bundled into UI Infrastructure for isolated hosts/tests.`);
assert(runtime.includes("require('ui/frame-scheduler')")&&runtime.includes("require('ui/dom-mutation-hub')"),'UI Infrastructure entry must initialize lifecycle primitives itself.');
for(const html of [index,pluginWindow]){
  const schedulerPos=html.indexOf('core/ui/frame-scheduler.js');
  const hubPos=html.indexOf('core/ui/dom-mutation-hub.js');
  const semanticPos=html.indexOf('core/theme/semantic-registry.js');
  assert(schedulerPos>=0&&schedulerPos<hubPos&&hubPos<semanticPos,'Early Theme bootstrap must load Scheduler → Mutation Hub → Semantic Registry.');
}
for(const rel of ['src/core/theme/semantic-registry.js','src/core/theme/material-renderer.js','src/core/theme/component-appearance.js']){
  const text=fs.readFileSync(path.join(root,rel),'utf8');
  assert(!/requestAnimationFrame/.test(text),`${rel} must schedule shared Theme work through DKDSFrameScheduler.`);
  assert(text.includes('DKDSFrameScheduler'),`${rel} must consume the shared Frame Scheduler.`);
}
console.log('v3.68.0 shared Frame Scheduler regression passed.');
