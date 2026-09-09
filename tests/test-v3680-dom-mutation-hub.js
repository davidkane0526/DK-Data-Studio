const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/core/ui/dom-mutation-hub.js'),'utf8');

const documentRoot={nodeType:1,contains(node){return node===this||node?.inside===true;}};
const observations=[];
let created=0,callback=null;
class FakeMutationObserver{
  constructor(cb){created++;callback=cb;this.disconnected=false;}
  observe(target,options){this.disconnected=false;observations.push({target,options});}
  disconnect(){this.disconnected=true;}
}
const document={documentElement:documentRoot,body:documentRoot,readyState:'complete',addEventListener(){}};
const context={window:{},document,MutationObserver:FakeMutationObserver,queueMicrotask:fn=>fn(),console};
context.globalThis=context.window;
vm.runInNewContext(source,context,{filename:'dom-mutation-hub.js'});
const hub=context.window.DKDSDOMMutationHub;
assert(hub&&hub.VERSION==='1.1.0','DOM Mutation Hub must initialize.');
const a=[],b=[];
const offA=hub.subscribe('a',records=>a.push(...records),{attributes:true,attributeFilter:['class'],childList:false});
const offB=hub.subscribe('b',records=>b.push(...records),{attributes:true,attributeFilter:['data-x'],childList:true});
assert.equal(created,1,'Mutation Hub must reuse one MutationObserver instance across subscription reconnects.');
assert(observations.length>=2,'Subscription changes should reconnect the single observer.');
const latest=observations.at(-1);
assert.equal(latest.target,documentRoot,'Mutation Hub must be the sole document-root observer owner.');
assert.deepEqual(Array.from(latest.options.attributeFilter),['class','data-x'],'Merged observer must union bounded attribute filters.');
const inside={nodeType:1,inside:true},outside={nodeType:1,inside:false};
callback([
  {type:'attributes',target:inside,attributeName:'class'},
  {type:'attributes',target:inside,attributeName:'data-x'},
  {type:'childList',target:inside},
  {type:'attributes',target:outside,attributeName:'class'}
]);
assert.equal(a.length,1,'Subscriber A must receive only its requested class attribute records.');
assert.equal(b.length,2,'Subscriber B must receive data-x plus childList records.');
const hubStats=hub.snapshot();
assert.equal(hubStats.subscribers,2,'Hub snapshot must report live subscriptions.');
assert.equal(hubStats.filterChecks,8,'Hub diagnostics must expose subscription filtering cost (4 records × 2 subscribers).');
assert.equal(hubStats.callbackBatches,2,'Hub diagnostics must expose delivered subscriber batches.');
assert.equal(hubStats.maxBatchRecords,4,'Hub diagnostics must retain peak mutation batch size.');
assert(Number.isFinite(hubStats.lastDispatchMs)&&Number.isFinite(hubStats.maxDispatchMs),'Hub must expose dispatch timing diagnostics.');
offA();offB();
assert.equal(created,1,'Unsubscription must not allocate another MutationObserver.');
assert.equal(hub.snapshot().observerActive,false,'Observer must be inactive when no subscriptions remain.');
console.log('v3.68.0 shared DOM Mutation Hub regression passed.');
