'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function uiContext(){
  const events=new Map(),dispatches=[];
  const window={addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},removeEventListener(name,fn){events.get(name)?.delete(fn);},dispatchEvent(event){dispatches.push(event);for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},innerWidth:1200,innerHeight:800,ResizeObserver:null,MutationObserver:null};
  class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  const fakeElement={nodeType:1,classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},removeEventListener(){}};
  const document={querySelector(){return null;},querySelectorAll(){return[];},body:fakeElement,documentElement:fakeElement,createElement(){return {...fakeElement};}};
  const context={window,document,localStorage:{getItem(){return null;},setItem(){}},structuredClone,CustomEvent,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},globalThis:null};context.globalThis=context;window.window=window;window.document=document;window.CustomEvent=CustomEvent;window.localStorage=context.localStorage;
  vm.createContext(context);vm.runInContext(read('src/core/data/entity-runtime.js'),context);vm.runInContext(read('src/generated/runtime/ui-infrastructure.js'),context);return {context,window,events,dispatches};
}
const {context,events}=uiContext(),UI=context.window.DKDSUI,refs=UI.selectionReferences;
let project='phase-e-project-1';
const A=UI.createScope('phase-e.final-a',{projectId:()=>project}),B=UI.createScope('phase-e.final-b',{projectId:()=>project});
const a=A.interactionRuntime.create('a',{selection:{defaultType:'core.entity'}}),b=B.interactionRuntime.create('b',{selection:{defaultType:'core.entity'}});
a.link('mixed');b.link('mixed');
const stateCounts={viewport:0,legend:0};b.subscribeState('viewport',()=>stateCounts.viewport++);b.subscribeState('legend',()=>stateCounts.legend++);
b.linkState('viewport','mixed');b.linkState('legend','mixed');
const tx=(id,projectId=project,linkGroup='mixed')=>({schema:UI.interactionTransactions.schema,transactionId:id,projectId,linkGroup,originOwner:'external',originScopeId:'external-scope',originRuntimeId:'external-runtime'});
const item={type:'core.entity',id:'artifact:one',ref:refs.artifact('artifact-one')},snapshot={schema:2,revision:1,items:[item],focus:item,ranges:[],context:{},source:'phase-e-test'};
const shared=tx('same-id');
b.applyRemoteSelection(snapshot,{transaction:shared,linkGroup:'mixed'});
assert.equal(b.focus()?.ref?.artifactId,'artifact-one','Selection leg of a mixed transaction must apply.');
assert(b.applyRemoteState('viewport',{xRange:[0,1]},{transaction:shared,linkGroup:'mixed'}),'Viewport must not be suppressed by the same transactionId used by Selection.');
assert(b.applyRemoteState('legend',{targets:[{artifactId:'artifact-one',seriesId:'s1'}]},{transaction:shared,linkGroup:'mixed'}),'Legend must not be suppressed by the same transactionId used by Selection/Viewport.');
assert.deepStrictEqual(stateCounts,{viewport:1,legend:1});
assert.strictEqual(b.applyRemoteState('viewport',{xRange:[1,2]},{transaction:shared,linkGroup:'mixed'}),null,'Duplicate in the same project/channel/group must still be suppressed.');
assert.strictEqual(b.applyRemoteState('legend',{targets:[]},{transaction:shared,linkGroup:'mixed'}),null);

project='phase-e-project-2';
assert(b.applyRemoteState('viewport',{xRange:[2,3]},{transaction:tx('same-id',project),linkGroup:'mixed'}),'TransactionId reuse after project switch must not leak the previous project dedupe cache.');
assert.equal(stateCounts.viewport,2);
assert(b.applyRemoteState('viewport',{xRange:[3,4]},{transaction:tx('same-id',project,'other-group'),linkGroup:'other-group'}),'The same transactionId in another link group must remain isolated.');
assert.equal(stateCounts.viewport,3);

// Warm-hide is quiescence, not destruction: bridge subscriptions stay reusable
// but hidden runtimes neither receive nor rebroadcast linked interaction state.
project='phase-e-project-1';
const beforeHiddenListeners=events.get('dkds:selection-changed')?.size||0;
(async()=>{
  const hidden=await B.lifecycle('hidden',{reason:'phase-e-warm-hide'});assert.equal(hidden.interactions.runtimes,1);assert.equal(hidden.interactions.suspended,1);
  const focusBefore=b.focus()?.ref?.artifactId||'';const viewportBefore=stateCounts.viewport;
  a.publishState('viewport',{xRange:[7,8]},{linkGroup:'mixed'});a.selectRef(refs.artifact('artifact-hidden'),{type:'core.entity',linkGroup:'mixed'});
  assert.equal(stateCounts.viewport,viewportBefore,'warm-hidden linked view must not consume remote viewport updates.');assert.equal(b.focus()?.ref?.artifactId||'',focusBefore,'warm-hidden linked view must not consume remote Selection updates.');
  assert.equal(events.get('dkds:selection-changed')?.size||0,beforeHiddenListeners,'warm hide must retain reusable subscriptions without listener churn.');
  const visible=await B.lifecycle('visible',{reason:'phase-e-warm-show'});assert.equal(visible.interactions.suspended,0);
  a.publishState('viewport',{xRange:[8,9]},{linkGroup:'mixed'});assert.equal(stateCounts.viewport,viewportBefore+1,'resumed linked view must receive new updates.');
  a.selectRef(refs.artifact('artifact-visible'),{type:'core.entity',linkGroup:'mixed'});assert.equal(b.focus()?.ref?.artifactId,'artifact-visible');

  // Many local linked views share one bridge subscription per channel/group.
  const M=UI.createScope('phase-e.final-many',{projectId:()=>project}),m=M.interactionRuntime.create('many');
  const linkOff=[],stateOff=[];const listenersBeforeMany=events.get('dkds:selection-changed')?.size||0;
  for(let i=0;i<128;i++){linkOff.push(m.linkState('viewport','bounded'));linkOff.push(m.linkState('legend','bounded'));stateOff.push(m.subscribeState('viewport',()=>{}));stateOff.push(m.subscribeState('legend',()=>{}));}
  assert.equal(m.stateLinkSubscriptions.size,2,'128 linked views must share one bridge subscription for viewport and one for legend.');
  assert.equal(m.stateLinkSubscriptions.get('viewport::bounded').refs,128);assert.equal(m.stateLinkSubscriptions.get('legend::bounded').refs,128);
  assert.equal((events.get('dkds:selection-changed')?.size||0)-listenersBeforeMany,2,'linked-view count must not multiply global bridge listeners.');
  for(const off of [...linkOff,...stateOff])off();assert.equal(m.stateLinkSubscriptions.size,0);assert.equal(m.stateListeners.size,0);
  for(let i=0;i<UI.interactionTransactions.limits.seen+80;i++)m.rememberTransaction(`bounded-${i}`,{channel:i%2?'viewport':'legend',linkGroup:'bounded'});
  assert(m.seenTransactions.size<=UI.interactionTransactions.limits.seen,'mixed-channel dedupe history must remain bounded.');
  M.dispose();

  // Scope/plugin unload must destroy interaction subscriptions and bounded caches.
  const listenerBeforeDispose=events.get('dkds:selection-changed')?.size||0;B.dispose();
  assert((events.get('dkds:selection-changed')?.size||0)<listenerBeforeDispose,'plugin/scope unload must detach bridge listeners.');
  assert.equal(b.linkSubscriptions.size,0);assert.equal(b.stateLinkSubscriptions.size,0);assert.equal(b.stateListeners.size,0);assert.equal(b.seenTransactions.size,0);

  const interactionSource=read('src/core/ui/modules/selection/data-interaction.js'),scopeSource=read('src/core/ui/modules/scope/plugin-scope.js'),hostSource=read('src/core/ui/modules/host/api.js');
  assert(interactionSource.includes('projectId)}::${part(channel)}::${part(linkGroup)}::${part(transactionId)}'),'Dedupe identity must explicitly contain project/channel/group/transaction.');
  assert(scopeSource.includes("setInteractionLifecycle('hidden')")&&hostSource.includes('interactions:scope.interactionLifecycleState?.()'),'warm-hide diagnostics must cover InteractionRuntime quiescence.');

  const lifecycleSource=read('src/core/plugins/kernel/modules/lifecycle.js'),apiSource=read('src/core/plugins/kernel/modules/plugin-api.js');
  assert(lifecycleSource.includes('(cleanupByPlugin.get(id) || []).reverse()')&&lifecycleSource.includes('cleanupByPlugin.delete(id)')&&lifecycleSource.includes('active.delete(id)'),'plugin unload must run registered teardown in reverse and clear lifecycle registries.');
  assert(apiSource.includes('infrastructureScope.dispose()')&&apiSource.includes("reason:'plugin-deactivate'"),'plugin API unload must dispose UI scopes and drop plugin performance caches.');
  const auxSource=read('desktop/main-modules/auxiliary-window-runtime.js'),mainSource=read('desktop/main.js');
  assert(auxSource.includes('row?.interactions')&&auxSource.includes('row.interactions.suspended'),'warm-hide diagnostic must require InteractionRuntime suspension.');
  assert(mainSource.includes('const closed=await Promise.all(waits),released=closed.filter(Boolean).length')&&mainSource.includes('pending:Math.max(0,targets.length-released)'),'cold release must report only windows actually destroyed, not requested closes.');

  // Stable table identity: hydrated DOM rows get an immutable source index, and
  // setData keeps object identity in a WeakMap so filter/reorder rerenders do not
  // renumber source rows or retain them strongly.
  const tableSource=read('src/core/ui/modules/table/surfaces.js');
  assert.equal((tableSource.match(/this\.rowDataOrder=new WeakMap\(\)/g)||[]).length,1,'row-data identity WeakMap must be scope-local and not reset on every render.');
  assert(tableSource.includes("if(row?.dataset&&String(row.dataset.dkdsSourceRowIndex??'').trim()==='')row.dataset.dkdsSourceRowIndex=String(sourceIndex)"));
  assert(tableSource.includes('this.sourceIndexForData(row,rowIndex)'),'setData rendering must preserve stable object source identity across sort/filter rerenders.');

  // Display sampling carries source row identity without allocating a full rowIds
  // array when the artifact can resolve a row ID lazily.
  const displayContext={window:{},console};displayContext.globalThis=displayContext;vm.createContext(displayContext);vm.runInContext(read('src/core/scientific/display-runtime.js'),displayContext);
  const order=Array.from({length:1200},(_,i)=>1199-i),trace={artifactId:'artifact-sampled',x:order.map((_v,i)=>i),y:order.map(v=>Math.sin(v/17)),rowIdAt:i=>`row-stable-${order[i]}`};
  const sampled=displayContext.window.DKDSScientificDisplay.sampleTrace(trace,{pixelWidth:160});assert(sampled.displayCount<1200,'test must exercise actual display sampling.');
  for(const point of sampled.points.filter(row=>row.valid))assert.equal(point.rowId,`row-stable-${order[point.i]}`,'sampled points must retain the stable source-row identity after reordering.');
  const dcFeatureSource=read('src/plugins/data-center/feature-runtime.js'),dcChartSource=read('src/plugins/data-center/chart-runtime.js');assert(dcFeatureSource.includes("ctx.modules.require('chart-runtime')"),'Data Center feature must delegate Chart Provider rendering to its bounded chart runtime.');assert(dcChartSource.includes('rowIdAt:index=>D.rowId(artifact,index)'),'Data Center chart runtime must expose lazy stable row identity to the display sampler without a large duplicate rowIds allocation.');

  A.dispose();
  console.log('v3.68.104 Phase E final-integration isolation / lifecycle / identity / bounded linked-view audit PASS.');
})().catch(err=>{console.error(err);process.exit(1);});
