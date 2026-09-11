const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const interactionSource=read('src/core/ui/modules/selection/data-interaction.js');
const scopeSource=read('src/core/ui/modules/scope/plugin-scope.js');
const legendSource=read('src/core/scientific/legend-link-runtime.js');
const plotSource=read('src/core/scientific/plot-runtime.js');
const chartSource=read('src/core/scientific/chart-runtime.js');
const dataCenterSource=read('src/plugins/data-center/feature-runtime.js');
const indexSource=read('src/index.html');
const dedicatedSource=read('src/plugin-window/runtime.js');

const globalEventNames=[...new Set([...(`${interactionSource}\n${scopeSource}`).matchAll(/['"](dkds:[^'"]+changed)['"]/g)].map(match=>match[1]))];
assert.deepStrictEqual(globalEventNames,['dkds:selection-changed'],'legend linking must reuse the single cross-scope Interaction bridge');
assert(!/dkds:(?:legend|visibility)-changed/.test(legendSource),'legend owner must not create a legend-specific global event');
assert(!/addEventListener|dispatchEvent|EventTarget/.test(legendSource),'legend owner must delegate transport to InteractionRuntime');
assert(indexSource.indexOf('scientific/viewport-link-runtime.js')<indexSource.indexOf('scientific/legend-link-runtime.js')&&indexSource.indexOf('scientific/legend-link-runtime.js')<indexSource.indexOf('core/data/model.js'),'Main Host must load the bounded legend owner after viewport infrastructure and before consumers');
assert(dedicatedSource.includes("'scientific-legend-link-runtime':'../core/scientific/legend-link-runtime.js'")&&dedicatedSource.includes("'scientific-unit-runtime','scientific-viewport-link-runtime','scientific-legend-link-runtime'"),'Dedicated TOP must load the same legend-link owner');
assert(plotSource.includes("link:false,linkGroup:'',maxLinkedTargets:24")&&plotSource.includes('window.DKDSLegendLink?.connect?.(this)')&&plotSource.includes('window.DKDSLegendLink?.publish?.(this,event)'),'ScientificPlot legend linkage must be explicit and thin');
assert(chartSource.includes('function setLegendVisibility(target,indices=[]')&&chartSource.includes("state.legendSoloKey=entry?.key||''"),'Chart Runtime must expose one renderer-neutral remote legend visibility apply primitive');
assert(legendSource.includes("SCHEMA='dkds.legend-visibility-state.v1'")&&legendSource.includes("CHANNEL='legend'")&&legendSource.includes('MAX_TARGETS=24'),'legend linked-state must be separately typed and bounded');
assert(legendSource.includes('ref?.artifactId||!ref?.seriesId')&&legendSource.includes('refs()?.identity?.(ref)'),'legend targets must use stable artifactId / seriesId identities rather than display labels');
assert(dataCenterSource.includes('legendPolicy:{link:true,linkGroup:`data-center:${artifact.id}:legend`}'),'Data Center multi-series charts must provide a first-party stable legend-link adoption');

function runtimeContext(){
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
  const context={window,document,structuredClone,CustomEvent,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},globalThis:null};
  context.globalThis=context;window.window=window;window.document=document;window.CustomEvent=CustomEvent;
  vm.createContext(context);
  vm.runInContext(read('src/core/data/entity-runtime.js'),context,{filename:'entity-runtime.js'});
  vm.runInContext(read('src/generated/runtime/ui-infrastructure.js'),context,{filename:'ui-infrastructure.js'});
  vm.runInContext(legendSource,context,{filename:'legend-link-runtime.js'});
  return {context,window,events,dispatches};
}
function seriesRef(artifactId,seriesId,artifactRevision=1){return {artifactId,seriesId,artifactRevision};}
function makeView(context,interaction,id,rows,projectGroup='linked-legend'){
  const view={owner:`owner-${id}`,target:{id,dataset:{dkdsScientificPlotId:id},data:rows.map(row=>({...row}))},interaction,controllerSpec:{legend:{enabled:true,link:true,linkGroup:projectGroup,maxLinkedTargets:24}},applies:[],mode:'restore',indices:[],chart:{setLegendVisibility(_target,indices){view.indices=[...indices];view.mode=indices.length?'isolate':'restore';view.applies.push([...indices]);return Promise.resolve(true);}},entityFromTrace(index){const trace=this.target.data[index];return trace?.ref?{id:`trace-${index}`,type:'data.series',ref:trace.ref}:null;}};
  view.link=context.window.DKDSLegendLink.connect(view);return view;
}
(async()=>{
  const {context,dispatches,events}=runtimeContext(),UI=context.window.DKDSUI,Link=context.window.DKDSLegendLink;
  assert.equal(Link.SCHEMA,'dkds.legend-visibility-state.v1');
  let projectA='legend-project',projectB='legend-project',projectC='other-project';
  const A=UI.createScope('legend-a',{projectId:()=>projectA}),B=UI.createScope('legend-b',{projectId:()=>projectB}),C=UI.createScope('legend-c',{projectId:()=>projectC});
  const a=A.interactionRuntime.create('ia'),b=B.interactionRuntime.create('ib'),c=C.interactionRuntime.create('ic');
  const s1=seriesRef('artifact-A','series-1',7),s2=seriesRef('artifact-A','series-2',7);
  const va=makeView(context,a,'plot-a',[{name:'Same label',ref:s1},{name:'Same label',ref:s2}]);
  const va2=makeView(context,a,'plot-a-sibling',[{name:'Renamed',ref:seriesRef('artifact-A','series-1',9)},{name:'Other',ref:s2}]);
  const vb=makeView(context,b,'plot-b',[{name:'Different display label',ref:s2},{name:'Series one',ref:s1}]);
  const vc=makeView(context,c,'plot-c',[{name:'Series one',ref:s1},{name:'Series two',ref:s2}]);

  const before=dispatches.length;
  const published=Link.publish(va,{detail:{curveNumber:0,indices:[0],soloKey:'local-key',restored:false}},{source:'legend-click'});
  assert(published?.transaction?.transactionId,'legend publish must reuse the existing Interaction transaction');
  assert.equal(dispatches.length-before,1,'one legend action must cross the global bridge exactly once');
  assert.equal(dispatches.at(-1).type,'dkds:selection-changed');assert.equal(dispatches.at(-1).detail.channel,'legend');
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(va.applies,[],'origin view must not re-apply its own linked legend state');
  assert.deepStrictEqual(va2.indices,[0],'same-runtime sibling must match stable series identity despite artifact revision or label differences');
  assert.deepStrictEqual(vb.indices,[1],'remote plot must locate the same artifactId/seriesId even at a different trace index');
  assert.deepStrictEqual(vc.indices,[],'same link group in another project must remain isolated');
  assert.equal(dispatches.length-before,1,'remote legend apply must never rebroadcast or form A->B->A loops');
  assert.equal(a.get().items.length,0);assert.equal(b.get().items.length,0,'legend visibility state must stay separate from Selection');

  Link.publish(va,{detail:{curveNumber:0,indices:[0],soloKey:'',restored:true}},{source:'legend-restore'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(va2.mode,'restore');assert.equal(vb.mode,'restore','restoring the legend must restore each target plot baseline without copying display data');

  const Bmissing=UI.createScope('legend-missing',{projectId:()=>projectB}),missing=Bmissing.interactionRuntime.create('im');
  const vmismatch=makeView(context,missing,'plot-missing',[{name:'Same label',ref:seriesRef('artifact-A','series-X')}]);
  Link.publish(va,{detail:{indices:[0],soloKey:'again',restored:false}});await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(vmismatch.indices,[],'matching legend text without matching stable series reference must not link');

  const many=Array.from({length:25},(_,i)=>({name:`S${i}`,ref:seriesRef('artifact-many',`series-${i}`)})),vMany=makeView(context,a,'plot-many',many);
  assert.throws(()=>Link.publish(vMany,{detail:{indices:Array.from({length:25},(_,i)=>i),soloKey:'many',restored:false}}),/exceeds 24/i,'linked legend payload must remain bounded');
  const unstable=makeView(context,a,'plot-unstable',[{name:'Label only'}]),dispatchBeforeUnstable=dispatches.length;
  assert.strictEqual(Link.publish(unstable,{detail:{indices:[0],soloKey:'label',restored:false}}),null,'legend entries without stable artifactId/seriesId must fail closed');
  assert.equal(dispatches.length,dispatchBeforeUnstable,'unstable label-only legend actions must not cross the bridge');

  const vbBeforeSwitch=[...vb.indices];projectA='other-project';Link.publish(va,{detail:{indices:[1],soloKey:'project-switch',restored:false}});await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(vc.indices,[1],'project identity must be resolved at event time for legend transactions');
  assert.deepStrictEqual(vb.indices,vbBeforeSwitch,'runtime on the previous project must ignore the switched-project legend transaction');

  const listenerCount=events.get('dkds:selection-changed')?.size||0;
  for(const view of [va,va2,vb,vc,vmismatch,vMany,unstable])view.link?.dispose?.();A.dispose();B.dispose();C.dispose();Bmissing.dispose();
  assert((events.get('dkds:selection-changed')?.size||0)<listenerCount,'legend link disposal must release shared Interaction bridge subscriptions');
  console.log('v3.68.94 Phase E bounded legend visibility linking, stable series identity, project isolation and cycle suppression PASS.');
})().catch(err=>{console.error(err);process.exit(1);});
