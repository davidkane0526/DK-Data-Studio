const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');

function uiContext(){
  const events=new Map(),eventNames=[];
  const window={
    addEventListener(name,fn){eventNames.push(['add',name]);if(!events.has(name))events.set(name,new Set());events.get(name).add(fn);},
    removeEventListener(name,fn){events.get(name)?.delete(fn);},
    dispatchEvent(event){eventNames.push(['dispatch',event.type]);for(const fn of [...(events.get(event.type)||[])])fn(event);return true;},
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
  return {context,window,events,eventNames};
}

const selectionBusSource=[
  fs.readFileSync(path.join(root,'src/core/ui/modules/selection/data-interaction.js'),'utf8'),
  fs.readFileSync(path.join(root,'src/core/ui/modules/scope/plugin-scope.js'),'utf8')
].join('\n');
const declaredSelectionEvents=[...new Set([...selectionBusSource.matchAll(/['"](dkds:[^'"]*selection[^'"]*)['"]/gi)].map(match=>match[1]))];
assert.deepEqual(declaredSelectionEvents,['dkds:selection-changed'],'source contract must contain exactly one cross-scope Selection event name');

const {context,window,events,eventNames}=uiContext();
const UI=window.DKDSUI;
const refs=UI.selectionReferences;
assert(refs&&refs===UI.createScope('refs-probe').selection.refs,'Core and PluginScope must share one reference contract');
UI.disposeOwner('refs-probe');

const a1=refs.artifact('artifact-A',{artifactRevision:3});
const a2=refs.artifact('artifact-A',{artifactRevision:99});
assert.equal(refs.identity(a1),refs.identity(a2),'artifactRevision is a snapshot condition, never permanent identity');
assert.equal(refs.identity(refs.series('artifact-A','col-current')),'series:artifact-A:col-current');
assert.equal(refs.identity(refs.row('artifact-A','source-17',{seriesId:'col-current'})),'row:artifact-A:col-current:source-17');
assert.equal(refs.row('artifact-A','source-17',{artifactRevision:4}).artifactRevision,4);

const producer=UI.createScope('phase-e.producer');
const consumer=UI.createScope('phase-e.consumer');
const source=producer.interactionRuntime.create('source',{selection:{multiple:true,defaultType:'core.entity'}});
const same=producer.interactionRuntime.create('same',{selection:{multiple:true,defaultType:'core.entity'}});
const sourceRef=refs.row('artifact-A','source-17',{seriesId:'col-current',artifactRevision:7});
source.selectRef(sourceRef,{type:'core.entity',source:'phase-e-test'});
same.selectRef(refs.row('artifact-A','source-17',{seriesId:'col-current',artifactRevision:8}),{type:'core.entity'});
assert.equal(source.get().focus.id,same.get().focus.id,'canonical ref must derive deterministic selection id across runtimes and revisions');
assert(!Object.prototype.hasOwnProperty.call(source.get().focus,'value'),'selection item must be reference-only');
assert.throws(()=>source.selection.select({type:'core.entity',value:{anonymous:true}}),/stable id|reference/i,'selection must never synthesize random identity');

let observed=null;
const listenerCountBefore=events.get('dkds:selection-changed')?.size||0;
consumer.selection.observe((snapshot,meta,detail)=>{observed={snapshot,meta,detail};},{type:'core.entity'});
const listenerCountDuring=events.get('dkds:selection-changed')?.size||0;
source.selectRef(refs.artifact('artifact-B'),{type:'core.entity',source:'existing-bus'});
assert.equal(observed?.snapshot?.focus?.ref?.artifactId,'artifact-B','cross-scope selection must continue through the existing selection event');
assert.equal(observed?.detail?.runtimeId,'source');
const selectionEventNames=[...new Set(eventNames.map(row=>row[1]).filter(name=>/^dkds:.*selection/i.test(name)))];
assert.deepEqual(selectionEventNames,['dkds:selection-changed'],'Phase E must not create a second global selection event bus');
consumer.dispose();
assert((events.get('dkds:selection-changed')?.size||0)<listenerCountDuring,'scope disposal must remove cross-scope selection observer');
assert(listenerCountDuring>listenerCountBefore);

producer.dataTypes.register('phase-e.large',{parent:'result.analysis',kind:'result',key:v=>v.id,selection:v=>({id:v.id,ref:refs.artifact(v.id),meta:{label:v.label,rowCount:v.rows.length}}),resolve:ref=>({artifactId:ref.artifactId})});
const huge={id:'large-artifact',label:'Large',rows:Array.from({length:5000},(_,i)=>({i,value:i*i}))};
source.select({type:'phase-e.large',value:huge},{source:'projection'});
const projected=source.get().focus;
assert.equal(projected.ref.artifactId,'large-artifact');
assert.equal(projected.meta.rowCount,5000);
assert(!('value' in projected),'large source value must not enter the selection document');
assert.equal(producer.dataTypes.resolve('phase-e.large',projected).artifactId,'large-artifact','data type resolver must hydrate from ref only');
producer.dataTypes.register('phase-e.invalid-projection',{key:v=>v.id,selection:v=>({id:v.id,ref:{entityId:v.id},value:{id:v.id}})});
assert.throws(()=>source.select({type:'phase-e.invalid-projection',value:{id:'legacy'}}),/reference-only/i,'selection projections that return value must fail current contract');

const bounded=producer.selection.model('bounded',{multiple:true,defaultType:'core.entity'});
const many=Array.from({length:UI.selectionReferences.limits.items+1},(_,i)=>({type:'core.entity',id:`item-${i}`,ref:{entityId:`item-${i}`}}));
assert.throws(()=>bounded.selectMany(many),/publish a source-referenced range/i,'huge point selections must be rejected in favor of ranges');
bounded.selectRegion({min:-1,max:1},[],{rangeType:'data.range',sourceRef:refs.series('artifact-A','col-current'),source:'range'});
const range=bounded.get().ranges[0];
assert(range?.ref?.range&&range.ref.artifactId==='artifact-A'&&range.ref.seriesId==='col-current');
assert(!('value' in range),'range selection must store source ref + bounds only');
assert.throws(()=>bounded.setRange({min:0,max:1,pointIds:['a','b']},{sourceRef:refs.artifact('artifact-A')}),/pointIds|array/i,'range must not embed point id arrays');
assert.throws(()=>bounded.setContext({ids:Array.from({length:33},(_,i)=>i)}),/32/,'selection context must remain bounded');

const entity=window.DKDSEntities.registry.get(source.get().focus.id);
assert(entity,'selection must synchronize into the existing Entity Runtime');
assert.equal(entity.ref.artifactId,'large-artifact');
assert.equal(entity.metadata.referenceIdentity,'artifact:large-artifact');

vm.runInContext(fs.readFileSync(path.join(root,'src/core/scientific/display-runtime.js'),'utf8'),context,{filename:'display-runtime.js'});
const display=window.DKDSScientificDisplay;
const x=Array.from({length:1000},(_,i)=>i),y=x.map(i=>Math.sin(i/13)),rowIds=x.map(i=>`source-row-${i}`);
const trace={artifactId:'artifact-A',seriesId:'col-current',x,y,rowIds};
assert.equal(display.stableSeriesId(trace),'col-current');
const sampled=display.sampleTrace(trace,{pixelWidth:120});
assert(sampled.displayCount<1000,'test trace must be display-sampled');
for(const point of sampled.points.filter(row=>row.valid))assert.equal(point.rowId,rowIds[point.i],'display sampling must preserve source rowId');
const order=x.map((_,i)=>i).filter(i=>i%3!==0).reverse();
const sortedTrace={artifactId:'artifact-A',seriesId:'col-current',x:order.map(i=>x[i]),y:order.map(i=>y[i]),rowIds:order.map(i=>rowIds[i]),scanSegment:order.map(()=>0)};
const sortedSample=display.sampleTrace(sortedTrace,{pixelWidth:120});
for(const point of sortedSample.points.filter(row=>row.valid))assert.equal(point.rowId,sortedTrace.rowIds[point.i],'sorting/filtering projections must retain carried source rowId');

const dataContext={console,structuredClone,Date,Math,ArrayBuffer,Float64Array,Float32Array,Int32Array,Uint32Array,Int16Array,Uint16Array,Int8Array,Uint8Array,DataView,crypto:globalThis.crypto};dataContext.window=dataContext;dataContext.globalThis=dataContext;vm.createContext(dataContext);
vm.runInContext(fs.readFileSync(path.join(root,'src/core/data/model.js'),'utf8'),dataContext,{filename:'model.js'});
const D=dataContext.DKDSData;
const table=D.createTable({id:'table-A',columns:[{key:'Vd',values:[1,2,3]},{key:'Id',values:[4,5,6]}]});
assert.equal(D.rowId(table,0),'row:0','DataTable must expose deterministic source row identity without allocating a row-id array');
assert(D.seriesId(table,'Id').startsWith('col:'),'DataTable column id must be the stable seriesId');
const rehydrated=D.rehydrateArtifact(table);
assert.equal(D.seriesId(rehydrated,'Id'),D.seriesId(table,'Id'),'seriesId must survive rehydrate');
assert.equal(D.rowId(rehydrated,2),'row:2','rowId must survive rehydrate');
const explicit=D.createTable({id:'table-B',rowIds:['raw:8','raw:3'],columns:[{key:'x',values:[8,3]}]});
assert.equal(D.rowId(D.rehydrateArtifact(explicit),1),'raw:3','explicit source rowId must be preserved when supplied');

producer.dispose();
console.log('v3.68.88 Phase E stable artifact/series/row references + reference-only selection checks passed.');
