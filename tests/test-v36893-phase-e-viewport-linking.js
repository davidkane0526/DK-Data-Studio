const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const interactionSource=read('src/core/ui/modules/selection/data-interaction.js');
const scopeSource=read('src/core/ui/modules/scope/plugin-scope.js');
const viewportSource=read('src/core/scientific/viewport-link-runtime.js');
const plotSource=read('src/core/scientific/plot-runtime.js');
const terSource=read('src/plugins/ter-analysis/feature-runtime.js');
const indexSource=read('src/index.html');
const dedicatedSource=read('src/plugin-window/runtime.js');

const globalEventNames=[...new Set([...(`${interactionSource}\n${scopeSource}`).matchAll(/['"](dkds:[^'"]+changed)['"]/g)].map(match=>match[1]))];
assert.deepStrictEqual(globalEventNames,['dkds:selection-changed'],'viewport linking must reuse the existing single cross-scope Interaction bridge instead of creating a viewport event bus');
assert(!/dkds:(?:viewport|axis|interaction)-changed/.test(viewportSource),'viewport owner must not create a viewport-specific global event name');
assert(!/addEventListener|dispatchEvent|EventTarget/.test(viewportSource),'Scientific viewport-link owner must delegate transport to InteractionRuntime rather than own a second bus');
assert(interactionSource.includes("channel:'selection'")&&interactionSource.includes('publishState(channel,state')&&interactionSource.includes('linkState(channel,group'),'the existing Interaction bridge must be explicitly multiplexed by channel and own generic linked-state transport');
assert(scopeSource.includes("if(detail.channel!=='selection')return"),'Selection observers must ignore non-Selection Interaction envelopes');
assert(indexSource.indexOf('scientific/unit-runtime.js')<indexSource.indexOf('scientific/viewport-link-runtime.js')&&indexSource.indexOf('scientific/viewport-link-runtime.js')<indexSource.indexOf('scientific/plot-runtime.js'),'Main Host must load Scientific Units -> Viewport Link -> ScientificPlot');
assert(dedicatedSource.includes("'scientific-viewport-link-runtime':'../core/scientific/viewport-link-runtime.js'")&&dedicatedSource.indexOf("'scientific-unit-runtime','scientific-viewport-link-runtime'")>=0,'Dedicated TOP must load the same viewport-link owner after Scientific Units');
assert(plotSource.includes("link:false,linkGroup:'',linkedAxes:['x','y']")&&plotSource.includes('window.DKDSViewportLink?.connect?.(this)')&&plotSource.includes('window.DKDSViewportLink?.publish?.(this,meta)'),'ScientificPlot viewport controller must opt in explicitly and delegate linkage to the dedicated Core owner');
assert(plotSource.includes('this.viewportRelayoutDepth>0')&&plotSource.includes('meta.remote!==true&&meta.publish!==false'),'programmatic remote relayout must not feed back into capture/publish');
assert(terSource.match(/ter-vds-viewport/g)?.length>=3&&terSource.includes("linkedAxes:['x']"),'TER heatmaps and R-V source scans must prove first-party X-only viewport linking');

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
  const localStorage={getItem(){return null;},setItem(){}};
  const context={window,document,localStorage,structuredClone,CustomEvent,console,setTimeout,clearTimeout,requestAnimationFrame:fn=>{fn();return 1;},cancelAnimationFrame(){},globalThis:null};
  context.globalThis=context;window.window=window;window.document=document;window.localStorage=localStorage;window.CustomEvent=CustomEvent;
  vm.createContext(context);
  vm.runInContext(read('src/core/scientific/unit-runtime.js'),context,{filename:'unit-runtime.js'});context.DKDSScientificUnits=window.DKDSScientificUnits;
  vm.runInContext(read('src/core/data/entity-runtime.js'),context,{filename:'entity-runtime.js'});
  vm.runInContext(read('src/generated/runtime/ui-infrastructure.js'),context,{filename:'ui-infrastructure.js'});
  vm.runInContext(viewportSource,context,{filename:'viewport-link-runtime.js'});
  return {context,window,events,dispatches};
}

function makeView(context,interaction,id,axisSpecs,linkedAxes=['x','y']){
  const view={
    owner:`view-owner-${id}`,viewportLinkId:id,target:{id,dataset:{}},interaction,
    controllerSpec:{viewport:{enabled:true,link:true,linkGroup:'scientific-viewport',linkedAxes,axes:axisSpecs}},spec:{},
    viewportState:{xRange:null,yRange:null,revision:0,source:'initial'},applies:[],
    getViewport(){return structuredClone(this.viewportState);},
    async setViewport(state,meta={}){this.applies.push({state:structuredClone(state),meta});for(const axis of ['x','y']){const key=`${axis}Range`;if(Object.prototype.hasOwnProperty.call(state,key))this.viewportState[key]=state[key]===null?null:[...state[key]];}this.viewportState.revision+=1;this.viewportState.source=meta.source||'set';return this.getViewport();}
  };
  view.link=context.window.DKDSViewportLink.connect(view);
  return view;
}

(async()=>{
  const {context,dispatches,events}=runtimeContext();
  const UI=context.window.DKDSUI,Link=context.window.DKDSViewportLink;
  assert.equal(Link.SCHEMA,'dkds.viewport-state.v1');
  let projectA='project-viewport',projectB='project-viewport',projectC='other-project';
  const A=UI.createScope('viewport-a',{projectId:()=>projectA}),B=UI.createScope('viewport-b',{projectId:()=>projectB}),C=UI.createScope('viewport-c',{projectId:()=>projectC});
  const a=A.interactionRuntime.create('ia',{linkGroup:'selection-group'}),b=B.interactionRuntime.create('ib',{linkGroup:'selection-group'}),c=C.interactionRuntime.create('ic',{linkGroup:'selection-group'});
  const axisA={x:{unit:'mV',dimension:'voltage',quantity:'drain-source-voltage'},y:{unit:'A',dimension:'current',quantity:'current'}},axisB={x:{unit:'V',dimension:'voltage',quantity:'drain-source-voltage'},y:{unit:'mA',dimension:'current',quantity:'current'}},axisC={x:{unit:'V',dimension:'voltage',quantity:'drain-source-voltage'},y:{unit:'mA',dimension:'current',quantity:'current'}};
  const va=makeView(context,a,'plot-a',axisA),va2=makeView(context,a,'plot-a-sibling',axisA),vb=makeView(context,b,'plot-b',axisB),vc=makeView(context,c,'plot-c',axisC);
  va.viewportState={xRange:[-500,1500],yRange:[-.002,.008],revision:1,source:'gesture'};
  const before=dispatches.length;
  const published=Link.publish(va,{source:'test-gesture'});
  assert(published?.transaction?.transactionId,'linked viewport publish must use the existing Interaction transaction contract');
  assert.equal(dispatches.length-before,1,'one local viewport gesture must cross the global bridge exactly once');
  const event=dispatches.at(-1);assert.equal(event.type,'dkds:selection-changed');assert.equal(event.detail.channel,'viewport');assert.equal(event.detail.state.schema,'dkds.viewport-state.v1');
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(va2.viewportState.xRange,[-500,1500],'views sharing one InteractionRuntime must link through local state dispatch without a second global event');
  assert.deepStrictEqual(vb.viewportState.xRange,[-.5,1.5],'remote viewport X range must convert mV -> V before apply');
  assert.deepStrictEqual(vb.viewportState.yRange,[-2,8],'remote viewport Y range must convert A -> mA before apply');
  assert.deepStrictEqual(vc.viewportState.xRange,null,'same link group in another project must remain isolated');
  assert.equal(dispatches.length-before,1,'remote apply must not rebroadcast and A->B->A must terminate');
  assert.equal(a.get().items.length,0);assert.equal(b.get().items.length,0,'viewport linking must not mutate reference-only Selection');

  const Bq=UI.createScope('viewport-quantity',{projectId:()=>projectB}),bq=Bq.interactionRuntime.create('iq');
  const vq=makeView(context,bq,'plot-q',{x:{unit:'V',dimension:'voltage',quantity:'gate-voltage'},y:{unit:'mA',dimension:'current',quantity:'current'}},['x']);
  Link.publish(va,{source:'quantity-mismatch'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(vq.viewportState.xRange,null,'matching voltage units must still fail closed when both axes explicitly declare different quantities');

  const Bu=UI.createScope('viewport-unknown',{projectId:()=>projectB}),bu=Bu.interactionRuntime.create('iu');
  const vu=makeView(context,bu,'plot-u',{x:{unit:'a.u.',quantity:'drain-source-voltage'},y:{unit:'mA',dimension:'current',quantity:'current'}},['x']);
  Link.publish(va,{source:'unknown-unit'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(vu.viewportState.xRange,null,'unknown target scientific units must fail closed rather than copy numeric ranges');

  va.viewportState={xRange:null,yRange:null,revision:2,source:'home'};Link.publish(va,{source:'home'});await new Promise(resolve=>setImmediate(resolve));
  assert.strictEqual(vb.viewportState.xRange,null,'linked autorange reset must propagate as null without inventing a numeric domain');
  assert.strictEqual(vb.viewportState.yRange,null);

  const lastViewport=dispatches.filter(row=>row.detail?.channel==='viewport').at(-1).detail;
  const priorApplyCount=vb.applies.length;
  assert.strictEqual(b.applyRemoteState('viewport',lastViewport.state,{transaction:lastViewport.transaction,linkGroup:'scientific-viewport'}),null,'duplicate remote state transaction must be rejected before mutation');
  assert.equal(vb.applies.length,priorApplyCount);
  assert.throws(()=>a.publishState('viewport',{schema:'probe',values:Array.from({length:25},(_,i)=>i)},{linkGroup:'scientific-viewport'}),/array exceeds 24/i,'generic linked interaction state must remain bounded');

  projectA='other-project';va.viewportState={xRange:[0,1000],yRange:[0,.001],revision:3,source:'project-switch'};Link.publish(va,{source:'project-switch'});await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(vc.viewportState.xRange,[0,1],'project identity must be resolved at event time for viewport transactions too');
  assert.strictEqual(vb.viewportState.xRange,null,'runtime still on the previous project must ignore the switched-project viewport transaction');

  const listenerCount=events.get('dkds:selection-changed')?.size||0;
  va.link.dispose();va2.link.dispose();vb.link.dispose();vc.link.dispose();vq.link.dispose();vu.link.dispose();A.dispose();B.dispose();C.dispose();Bq.dispose();Bu.dispose();
  assert((events.get('dkds:selection-changed')?.size||0)<listenerCount,'viewport link disposal must release shared Interaction bridge subscriptions');
  console.log('v3.68.93 Phase E bounded scientific viewport linking, unit conversion, project isolation and cycle suppression PASS.');
})().catch(err=>{console.error(err);process.exit(1);});
