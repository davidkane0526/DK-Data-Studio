'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});return {promise,resolve,reject};};
const atLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};
function loadPluginModule(relative,moduleId){
  const file=path.resolve(root,relative),previousWindow=global.window,modules=new Map();
  global.window={DKDSPluginModules:{define(_plugin,id,value){modules.set(id,value);},get(_plugin,id){return modules.get(id);}}};
  try{delete require.cache[require.resolve(file)];require(file);return modules.get(moduleId);}finally{global.window=previousWindow;}
}

(async()=>{
  assert(atLeast(json('package.json').version,'3.69.1'),'App version must remain at or above 3.69.1.');
  assert(Number(json('mobile/app.json').expo.android.versionCode)>=127,'Android versionCode must advance for the post-freeze Mobile regression build.');

  // 1) Resonance group metrics: metric completion must invalidate the data
  // projection even while Mobile has temporarily hidden/reparented the panel.
  const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
  const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
  const settledRender=group.indexOf('function metricWaveSettled()'),settledInvalidate=group.indexOf('invalidate();',settledRender),settledVisibility=group.indexOf("if(!panel?.isConnected||metricRenderRaf)return false;",settledRender);
  assert(settledRender>=0&&settledInvalidate>settledRender&&settledVisibility>settledInvalidate,'Resonance metric completion must invalidate the GroupArea projection before any mounted/visibility render gate.');
  assert(feature.includes("effect:()=>{groupRuntime.metricWaveSettled?.();}"),'Reactive group invalidation must share the GroupRuntime coalesced settled-metric render owner.');
  assert(group.includes('live.peakMetricSettledRevision'),'Group render identity must carry the settled metric-wave revision so reopen/reprojection cannot reuse a pre-metric blank render.');
  const peakModule=loadPluginModule('src/plugins/resonance-workbench/feature-peak-runtime.js','feature-peak-runtime');
  const p1={id:'p1',sweepId:'s1',v:1,i:2},p2={id:'p2',sweepId:'s2',v:2,i:3},sweeps=new Map([['s1',{id:'s1',step:.1}],['s2',{id:'s2',step:.1}]]),jobs=new Map();
  const provider={id:'metric',version:'1.0.0',default:true,run({peak}){const d=deferred();jobs.set(peak.id,d);return d.promise;}};
  const peakRuntime=peakModule.create({live:{selectedPeakId:'',workspace:{activeMetricAlgorithm:'metric@1.0.0'},algorithmRuntime:{list:()=>[provider],provenance:()=>({})},pipelineRuntime:null,reactiveRuntime:{touch(){return true;}}},services:{S:{}},actions:{sweepById:id=>sweeps.get(String(id)),invalidatePhysics(){}},utils:{clone:v=>v}});
  peakRuntime.peakMetrics(p1);peakRuntime.peakMetrics(p2);
  jobs.get('p1').resolve({fwhm:.1,amplitude:1});await tick();await tick();
  assert.strictEqual(peakRuntime.settledRevision(),0,'Settled metric revision must not advance on a partial wave.');
  jobs.get('p2').resolve({fwhm:.2,amplitude:2});await tick();await tick();
  assert.strictEqual(peakRuntime.settledRevision(),1,'Settled metric revision must advance exactly once when the full metric wave is ready.');

  // 2) Data Center Mobile selection commands stay in one four-cell row.
  const dcMobile=read('src/plugins/data-center/mobile.css');
  assert(/\.dc-selection-tools\{\s*\n\s*grid-template-columns:repeat\(4,minmax\(0,1fr\)\);gap:4px/.test(dcMobile),'Mobile Data Center 多选/全选/反选/清除 must stay in one four-column row.');
  assert(dcMobile.includes('.dc-selection-tools>button{\n  white-space:nowrap'),'Mobile selection commands must not wrap their two-character labels.');

  // 3) Native floating PlotView drag uses the raw touch stream and a compositor
  // preview. Pointermove remains measurement-free, and collision/snap repair is
  // still release-only.
  const portableSource=read('src/core/ui/modules/layout/portable-view.js');
  assert(portableSource.includes("NativeTouchDrag=require('../../../host/native-touch-drag')"),'PortableView must consume the shared native TouchEvent drag adapter.');
  assert(portableSource.includes("nativeClient&&e.pointerType==='touch'"),'Native touch must bypass the throttled PointerEvent drag path.');
  assert(portableSource.includes('requestAnimationFrame(applyNative)')&&portableSource.includes('translate3d('),'Native floating drag must coalesce to animation frames and use a compositor transform preview.');
  const dragStart=portableSource.indexOf("bindFloatDrag(mode='float')"),dragEnd=portableSource.indexOf('\n    dispose()',dragStart),drag=portableSource.slice(dragStart,dragEnd),moveBody=drag.match(/const move=e=>\{([\s\S]*?)\};\n\s*const applyNative=/)?.[1]||'';
  assert(moveBody&&!moveBody.includes('getBoundingClientRect')&&!moveBody.includes('floatingZoneMetrics'),'Floating pointermove must remain free of synchronous geometry reads.');
  assert(drag.indexOf('this.avoidFloatOverlap()')>drag.indexOf('const finish='),'Collision avoidance must run only during release/finalization, never continuously under the finger.');

  // Execute the real PortableView native-touch branch with a minimal DOM shell.
  let touchSpec=null,rafFn=null,rectReads=0;const styleWrites=[],positions=[];
  const head={style:{touchAction:''},addEventListener(){},removeEventListener(){},setPointerCapture(){}};
  const styleMap=new Map();
  const wrapper={dataset:{placement:'float'},classList:{contains:n=>n==='is-floating'},style:{setProperty(k,v){styleMap.set(k,String(v));},removeProperty(k){styleMap.delete(k);},getPropertyValue(k){return styleMap.get(k)||'';}},querySelector(){return head;},getBoundingClientRect(){rectReads++;return {left:100,top:80,width:300,height:200,right:400,bottom:280};}};
  const fakeGate={KINDS:{CONFIG_TOKEN:'token',RUNTIME_INLINE:'inline'},set(el,k,v){el.style?.setProperty?.(k,v);styleWrites.push([k,String(v)]);return v;},setToken(el,k,v){return this.set(el,k,v);},remove(el,k){el.style?.removeProperty?.(k);styleWrites.push([k,'']);return true;}};
  const moduleBox={exports:{}};
  const context={module:moduleBox,exports:moduleBox.exports,console,window:{innerWidth:1000,innerHeight:800,addEventListener(){},removeEventListener(){}},document:{body:{},documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:n=>n==='react-native-client'}}},requestAnimationFrame(fn){rafFn=fn;return 1;},cancelAnimationFrame(){rafFn=null;},getComputedStyle:()=>({position:'absolute'}),require:id=>{
    if(id==='../foundation/shortcuts')return {hostState:{root:null,zones:new Map()},esc:String,resolveElement:v=>v,resolveScopedElement:()=>null,cleanupCall(){},readJson:()=>({}),writeJson(){}};
    if(id==='../interaction/context-actions')return {ContextMenu:class {}};
    if(id==='../../../host/native-touch-drag')return {bind(_head,spec){touchSpec=spec;return ()=>{};}};
    if(id==='./docking')return {normalizePlacement:v=>String(v||'home'),refreshDockZoneState(){}};
    if(id==='ui/style-ownership-gate')return fakeGate;
    throw new Error(id);
  }};context.globalThis=context;
  vm.createContext(context);vm.runInContext(portableSource,context,{filename:'portable-view.js'});
  const {PortableView}=moduleBox.exports,view=Object.create(PortableView.prototype);view.wrapper=wrapper;view.spec={snap:false};view.allowed=['home','float'];view.raiseLayer=()=>{};view.floatingZoneMetrics=()=>({zone:{querySelectorAll:()=>[]},rect:{left:0,top:0,width:1000,height:800,right:1000,bottom:800},minTop:0});view.setFloatingPosition=(l,t)=>{positions.push([Math.round(l),Math.round(t)]);};view.avoidFloatOverlap=()=>{};view.writeState=()=>{};view.bounds=()=>({left:300,top:180,width:300,height:200});
  const cleanup=view.bindFloatDrag('float');assert(touchSpec,'Native Mobile PortableView must install NativeTouchDrag.');
  assert.notStrictEqual(touchSpec.onStart({clientX:150,clientY:100},{target:{closest:()=>null}}),false,'Native touch start must arm floating drag.');
  assert.strictEqual(rectReads,1,'Native floating drag may read wrapper geometry once at gesture start.');
  touchSpec.onMove({clientX:350,clientY:200});assert.strictEqual(rectReads,1,'Native touch move must not read layout.');assert(rafFn,'Native touch move must wait for the next animation frame.');const frame=rafFn;rafFn=null;frame();
  assert(styleWrites.some(([k,v])=>k==='transform'&&v.includes('translate3d(200px,100px,0)')),'Native preview must follow the finger through a compositor translation.');
  touchSpec.onEnd({clientX:350,clientY:200});assert(positions.some(([l,t])=>l===300&&t===180),'Native drag release must commit the preview to zone-local left/top geometry.');
  cleanup();

  console.log('v3.69.1 Mobile regression closure PASS: Resonance metric reprojection, Data Center one-row selection commands, and native compositor floating drag.');
})().catch(error=>{console.error(error);process.exit(1);});
