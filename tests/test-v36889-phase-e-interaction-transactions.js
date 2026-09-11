const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');

function uiContext(){
  const events=new Map(),dispatches=[];
  const window={
    addEventListener(name,fn){if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
    removeEventListener(name,fn){events.get(name)?.delete(fn);},
    dispatchEvent(event){dispatches.push(event);for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},
    innerWidth:1200,innerHeight:800,ResizeObserver:null,MutationObserver:null
  };
  class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail;}}
  const fakeElement={nodeType:1,classList:{add(){},remove(){},toggle(){},contains(){return false;}},querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){},removeEventListener(){}};
  const document={querySelector(){return null;},querySelectorAll(){return[];},body:fakeElement,documentElement:fakeElement,createElement(){return {...fakeElement};}};
  const localStorage={getItem(){return null;},setItem(){}};
  const context={window,document,localStorage,structuredClone,CustomEvent,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},globalThis:null};
  context.globalThis=context;window.window=window;window.document=document;window.localStorage=localStorage;window.CustomEvent=CustomEvent;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/entity-runtime.js'),'utf8'),context,{filename:'entity-runtime.js'});
  vm.runInContext(fs.readFileSync(path.join(root,'src/generated/runtime/ui-infrastructure.js'),'utf8'),context,{filename:'ui-infrastructure.js'});
  return {window,events,dispatches};
}

const source=[
  fs.readFileSync(path.join(root,'src/core/ui/modules/selection/data-interaction.js'),'utf8'),
  fs.readFileSync(path.join(root,'src/core/ui/modules/scope/plugin-scope.js'),'utf8')
].join('\n');
const selectionEvents=[...new Set([...source.matchAll(/['"](dkds:[^'"]*selection[^'"]*)['"]/gi)].map(match=>match[1]))];
assert.deepStrictEqual(selectionEvents,['dkds:selection-changed'],'Phase E step 4 must continue to use exactly one existing cross-scope Selection event');
assert(!/dkds:(?:interaction|link|transaction)-changed/.test(source),'step 4 must not add a second global Interaction/link transaction bus');

const {window,events,dispatches}=uiContext();
const UI=window.DKDSUI,refs=UI.selectionReferences;
assert.equal(UI.interactionTransactions.schema,'dkds.interaction-transaction.v1');

let projectA='project-1',projectB='project-1',projectC='project-1',projectD='project-1',projectE='project-2';
const A=UI.createScope('phase-e.tx-a',{projectId:()=>projectA});
const B=UI.createScope('phase-e.tx-b',{projectId:()=>projectB});
const C=UI.createScope('phase-e.tx-c',{projectId:()=>projectC});
const D=UI.createScope('phase-e.tx-d',{projectId:()=>projectD});
const E=UI.createScope('phase-e.tx-e',{projectId:()=>projectE});
assert.notEqual(A.scopeId,B.scopeId,'scope identity must be explicit and unique even when owners are long-lived');
assert.deepStrictEqual(JSON.parse(JSON.stringify(A.selection.scope())),{owner:'phase-e.tx-a',scopeId:A.scopeId,projectId:'project-1'});

const a=A.interactionRuntime.create('view-a',{selection:{multiple:true,defaultType:'core.entity'}});
const b=B.interactionRuntime.create('view-b',{selection:{multiple:true,defaultType:'core.entity'}});
const c=C.interactionRuntime.create('view-c',{selection:{multiple:true,defaultType:'core.entity'}});
const d=D.interactionRuntime.create('view-d',{selection:{multiple:true,defaultType:'core.entity'}});
const e=E.interactionRuntime.create('view-e',{selection:{multiple:true,defaultType:'core.entity'}});
const offA=a.link('artifact-selection');
const offB=b.link('artifact-selection');
const offC=c.link('artifact-selection');
const offD=d.link('other-selection');
const offE=e.link('artifact-selection');
void offA;void offB;void offC;void offD;void offE;

let aMeta=null,bMeta=null,cMeta=null,eMeta=null;
a.subscribe((snapshot,meta)=>{if(snapshot.focus)aMeta=meta;});
b.subscribe((snapshot,meta)=>{if(snapshot.focus)bMeta=meta;});
c.subscribe((snapshot,meta)=>{if(snapshot.focus)cMeta=meta;});
e.subscribe((snapshot,meta)=>{if(snapshot.focus)eMeta=meta;});

const selectionDispatchCount=()=>dispatches.filter(row=>row.type==='dkds:selection-changed').length;
const before=selectionDispatchCount();
a.selectRef(refs.artifact('artifact-A'),{type:'core.entity',source:'tx-local'});
assert.equal(selectionDispatchCount()-before,1,'one local Selection transaction must publish exactly once even when multiple linked runtimes apply it');
assert.equal(b.focus()?.ref?.artifactId,'artifact-A');
assert.equal(c.focus()?.ref?.artifactId,'artifact-A');
assert.equal(d.focus(),null,'different link groups must stay isolated');
assert.equal(e.focus(),null,'same link group in another project must stay isolated');
assert(aMeta?.transaction?.transactionId,'local Interaction callbacks must receive transaction metadata');
assert.equal(aMeta.transaction.projectId,'project-1');
assert.equal(aMeta.transaction.linkGroup,'artifact-selection');
assert.equal(aMeta.transaction.originScopeId,A.scopeId);
assert.equal(aMeta.transaction.originRuntimeId,'view-a');
assert.equal(aMeta.transaction.remote,false);
assert.equal(bMeta?.transaction?.transactionId,aMeta.transaction.transactionId,'remote application must preserve the originating transaction id');
assert.equal(cMeta?.transaction?.transactionId,aMeta.transaction.transactionId);
assert.equal(bMeta.transaction.originScopeId,A.scopeId,'remote application must preserve transaction origin');
assert.equal(bMeta.transaction.sourceScopeId,B.scopeId,'remote application may identify the current applying scope without changing origin');
assert.equal(bMeta.transaction.remote,true,'linked state application must be marked remote');

const clearBefore=selectionDispatchCount();
a.clear({source:'linked-clear'});
assert.equal(selectionDispatchCount()-clearBefore,1,'a linked clear must still publish only the originating transaction');
assert.equal(b.focus(),null,'empty Selection transactions must propagate linked clear state');
assert.equal(c.focus(),null,'linked clear must reach every same-project member');
a.selectRef(refs.artifact('artifact-A'),{type:'core.entity',source:'tx-local-restore'});
assert.equal(b.focus()?.ref?.artifactId,'artifact-A');

const published=dispatches.filter(row=>row.type==='dkds:selection-changed').at(-1).detail;
assert.equal(published.transactionId,aMeta.transaction.transactionId);
assert.equal(published.scopeId,A.scopeId);
assert.equal(published.projectId,'project-1');
assert.equal(published.linkGroup,'artifact-selection');
const revisionBeforeDuplicate=b.get().revision;
b.applyRemoteSelection(published.snapshot,{transaction:published.transaction,linkGroup:'artifact-selection'});
assert.equal(b.get().revision,revisionBeforeDuplicate,'the same transaction must be deduplicated before a second remote application');
const revisionBeforeCycle=a.get().revision;
a.applyRemoteSelection(published.snapshot,{transaction:published.transaction,linkGroup:'artifact-selection'});
assert.equal(a.get().revision,revisionBeforeCycle,'A→B→A must be suppressed because origin already handled its transaction');
assert.throws(()=>b.applyRemoteSelection(published.snapshot,{transaction:{transactionId:'missing-project',linkGroup:'artifact-selection'},linkGroup:'artifact-selection'}),/projectId/i,'remote transactions without project identity must fail closed');
assert.throws(()=>b.applyRemoteSelection(published.snapshot,{transaction:{...published.transaction,schema:'dkds.interaction-transaction.v2',transactionId:'future-schema'},linkGroup:'artifact-selection'}),/schema/i,'unknown transaction schemas must fail closed');

projectA='project-2';
const beforeProject2=selectionDispatchCount();
a.selectRef(refs.artifact('artifact-B'),{type:'core.entity',source:'project-switch'});
assert.equal(selectionDispatchCount()-beforeProject2,1);
assert.equal(b.focus()?.ref?.artifactId,'artifact-A','a runtime still on project-1 must ignore project-2 transactions');
assert.equal(c.focus()?.ref?.artifactId,'artifact-A');
assert.equal(e.focus()?.ref?.artifactId,'artifact-B','project identity must be resolved at event time rather than frozen when the plugin scope was created');
assert.equal(eMeta?.transaction?.projectId,'project-2');

const F=UI.createScope('phase-e.tx-f',{host:{getActiveProjectTab:()=>null}});
const G=UI.createScope('phase-e.tx-g',{host:{getActiveProjectTab:()=>null}});
const f=F.interactionRuntime.create('view-f',{selection:{defaultType:'core.entity'}});
const g=G.interactionRuntime.create('view-g',{selection:{defaultType:'core.entity'}});
f.link('unresolved-project');g.link('unresolved-project');
f.selectRef(refs.artifact('artifact-unresolved'),{type:'core.entity'});
assert.equal(g.focus(),null,'if a real host cannot identify the active project, link propagation must fail closed per scope rather than fall back to a shared project');
F.dispose();G.dispose();

const listenersBeforeDispose=events.get('dkds:selection-changed')?.size||0;
B.dispose();
const listenersAfterDispose=events.get('dkds:selection-changed')?.size||0;
assert(listenersAfterDispose<listenersBeforeDispose,'plugin/scope disposal must remove link-group subscriptions');

// Bounded per-runtime transaction history: old transaction ids may age out, but the cache itself must never grow with session length.
for(let i=0;i<UI.interactionTransactions.limits.seen+40;i++)e.rememberTransaction(`probe-${i}`);
assert(e.seenTransactions.size<=UI.interactionTransactions.limits.seen,'per-transaction dedupe state must be bounded');

A.dispose();C.dispose();D.dispose();E.dispose();
console.log('v3.68.89 Phase E transaction/link-group metadata, project isolation and cycle suppression PASS.');
