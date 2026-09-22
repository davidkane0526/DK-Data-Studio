'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const State=require('../src/core/ui/modules/layout/state-resolver');

const intent=State.createLayoutState({id:'right',axis:'x',defaultSize:320,min:100,reserve:220,mobileOverlay:true,mobileMaxRatio:.48,mobileReserve:120,placement:'right'});
const desktop=State.resolveLayout(intent,{width:1000,height:700},{nativeMobile:false});
assert.strictEqual(desktop.effectiveSize,320,'Desktop must preserve the established default split geometry.');
assert.strictEqual(desktop.platform,'desktop');

const preferred=State.withLayoutPreference(intent,400,{width:1000,height:700});
assert.strictEqual(preferred.preferredSize,400);assert.strictEqual(preferred.preferredRatio,.4);
const hidden=State.resolveLayout(preferred,{width:0,height:0},{nativeMobile:true});
assert.strictEqual(hidden.effectiveSize,0);assert.strictEqual(hidden.preferredSize,400,'Zero geometry must not overwrite user intent.');
const compact=State.resolveLayout(preferred,{width:500,height:900},{nativeMobile:true});
assert.strictEqual(compact.effectiveSize,200,'Native Mobile must replay the durable 0.4 user ratio at the compact viewport; max-ratio/reserve are upper bounds, not target widths.');
assert.strictEqual(State.resolveLayout(preferred,{width:1000,height:700},{nativeMobile:true}).effectiveSize,400,'Returning to a larger/original viewport must restore the preferred size.');
const collapsed=State.resolveLayout(State.withLayoutIntent(preferred,{collapsed:true}),{width:1000,height:700},{nativeMobile:true});
assert.strictEqual(collapsed.effectiveSize,0);assert.strictEqual(collapsed.handleVisible,false);assert.strictEqual(collapsed.preferredSize,400);
assert.deepStrictEqual(State.serializeLayoutState(preferred),{size:400,ratio:.4,placement:'right',collapsed:false});

const region={dataset:{}};assert.strictEqual(State.applyScrollPolicy(region,'chain'),'chain');assert.strictEqual(region.dataset.dkdsScrollPolicy,'chain');
assert.strictEqual(State.normalizeScrollPolicy('invalid','contain'),'contain');

const workspace=read('src/core/ui/modules/layout/workspace.js');
const plugin=read('src/core/ui/modules/workbench/plugin.js');
const analysis=read('src/core/ui/modules/workbench/analysis.js');
const composition=read('src/core/ui/composition/composition.json');
assert(workspace.includes("require('./state-resolver')")&&workspace.includes('stateSnapshot()')&&workspace.includes('this.previewViewport=this.viewport(this.drag?.rect)'),'SplitController must own state resolution and frozen Mobile drag geometry.');
assert(!fs.existsSync(path.join(root,'src/core/ui/modules/layout/mobile-split-performance.js'))&&!composition.includes('mobile-split-performance'),'Runtime method replacement must be retired from the authored graph.');
assert(!plugin.includes("querySelectorAll('*')")&&!plugin.includes('installLayoutGuard')&&!plugin.includes('layoutGuardObserver'),'Normal workspace resize/mutation flow must not scan the PRIMARY subtree.');
assert(plugin.includes('diagnosticRegions()')&&plugin.includes('bounded:true')&&plugin.includes("applyScrollPolicy(this.canvasSlots.left,'chain')"),'Layout diagnostics must inspect only registered regions on demand.');
assert(analysis.includes("applyScrollPolicy(this.slots.overlay,'contain')")&&analysis.includes("this.leftSplit?.setCollapsed(!left"),'Workbench regions must declare scroll policy and synchronize track collapse through SplitController.');

// Execute the real controller with a minimal host to verify that effective
// geometry changes never overwrite the persisted preference.
{
  const prior={window:global.window,document:global.document,localStorage:global.localStorage,ResizeObserver:global.ResizeObserver,raf:global.requestAnimationFrame,caf:global.cancelAnimationFrame,gate:global.DKDSStyleGate};
  const listeners=new Map();
  const events=()=>({addEventListener(type,fn){if(!listeners.has(this))listeners.set(this,new Map());if(!listeners.get(this).has(type))listeners.get(this).set(type,new Set());listeners.get(this).get(type).add(fn);},removeEventListener(type,fn){listeners.get(this)?.get(type)?.delete(fn);}});
  const classes=initial=>{const set=new Set(initial);return {add:v=>set.add(v),remove:v=>set.delete(v),contains:v=>set.has(v)};};
  const style=()=>{const values=new Map();return {setProperty:(key,value)=>values.set(key,String(value)),removeProperty:key=>values.delete(key),getPropertyValue:key=>values.get(key)||'',getPropertyPriority:()=>''};};
  const node=()=>Object.assign(events(),{nodeType:1,dataset:{},style:style(),classList:classes([]),isConnected:true,hidden:false,closest:()=>null,getBoundingClientRect:()=>({width:0,height:0}),setPointerCapture(){},releasePointerCapture(){}});
  const fakeWindow=events();fakeWindow.DKDSPlotPresentation=null;
  const rootNode=node();rootNode.dataset.dkdsHost='mobile';rootNode.classList=classes(['react-native-client']);
  global.window=fakeWindow;global.document={documentElement:rootNode,querySelector:()=>null};
  const store=new Map();global.localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,String(value))};
  const observers=[];global.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}};
  fakeWindow.ResizeObserver=global.ResizeObserver;
  global.requestAnimationFrame=fn=>{fn();return 1;};global.cancelAnimationFrame=()=>{};
  global.DKDSStyleGate={set:(el,key,value)=>{el.style.setProperty(key,value);return value;},setToken:(el,key,value)=>{el.style.setProperty(key,value);return value;},remove:(el,key)=>el.style.removeProperty(key)};
  process.env.NODE_PATH=path.join(root,'src/core');require('module').Module._initPaths();
  for(const rel of ['../src/core/ui/modules/foundation/shortcuts','../src/core/ui/style-ownership-gate','../src/core/ui/modules/layout/workspace'])delete require.cache[require.resolve(rel)];
  const {SplitController}=require('../src/core/ui/modules/layout/workspace');
  let width=1000,height=700;const container=node(),handle=node(),target=node();container.getBoundingClientRect=()=>({width,height});
  const resize=[];const scope={owner:'test.layout',emitResize:row=>resize.push(row),requestChartResize:()=>{},resizeScheduler:{suspend(){},resume(){}}};
  const split=new SplitController(scope,{id:'right',container,handle,target,cssVar:'--right-track',defaultSize:320,min:100,reserve:220,mobileOverlay:true,mobileMaxRatio:.48,mobileReserve:120,placement:'right'});
  assert.strictEqual(split.size,320);split.apply(400);assert.strictEqual(split.size,400);
  width=0;height=0;observers[0].callback();assert.strictEqual(split.size,400);assert.strictEqual(split.stateSnapshot().preferredSize,400,'A zero-size observer turn must leave both effective and preferred geometry intact.');
  split.setCollapsed(true,{persist:false,notify:false});assert.strictEqual(split.size,0);assert.strictEqual(container.style.getPropertyValue('--right-track'),'0px');
  width=500;height=900;split.setCollapsed(false,{persist:false,notify:false});assert.strictEqual(split.size,200);assert.strictEqual(split.stateSnapshot().preferredSize,400);
  width=1000;height=700;observers[0].callback();assert.strictEqual(split.size,400,'Reopening/orientation restoration must recover the unclamped preference.');
  const persisted=JSON.parse(store.get(split.key));assert.strictEqual(persisted.size,400);assert.strictEqual(persisted.ratio,.4,'Persistence must store intent, not the compact effective size.');
  split.dispose();
  if(prior.window===undefined)delete global.window;else global.window=prior.window;if(prior.document===undefined)delete global.document;else global.document=prior.document;if(prior.localStorage===undefined)delete global.localStorage;else global.localStorage=prior.localStorage;if(prior.ResizeObserver===undefined)delete global.ResizeObserver;else global.ResizeObserver=prior.ResizeObserver;if(prior.raf===undefined)delete global.requestAnimationFrame;else global.requestAnimationFrame=prior.raf;if(prior.caf===undefined)delete global.cancelAnimationFrame;else global.cancelAnimationFrame=prior.caf;if(prior.gate===undefined)delete global.DKDSStyleGate;else global.DKDSStyleGate=prior.gate;
}

console.log('v3.68.76 deterministic LayoutState, owned Mobile split policy and bounded diagnostics PASS.');
