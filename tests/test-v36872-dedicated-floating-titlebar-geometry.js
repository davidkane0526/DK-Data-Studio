'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const assert=(cond,msg)=>{if(!cond)throw new Error(msg);};
const atLeast=(actual,required)=>{const a=String(actual).split('.').map(Number),b=String(required).split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};

assert(atLeast(json('package.json').version,'3.68.72'),'App version must remain at or above 3.68.72.');
assert(Number(json('mobile/app.json').expo.android.versionCode)>=94,'Android versionCode must remain at or above the dedicated floating-titlebar geometry baseline.');

const source=read('src/core/ui/modules/layout/portable-view.js');
for(const token of [
  'resolveFloatingPositionMode()',
  "position==='fixed'?'fixed':'local'",
  'setFloatingPosition(left,top,metrics=null)',
  'originTop=fixed?Number(m?.rect?.top)||0:0'
])assert(source.includes(token),`PortableView zone/viewport geometry contract missing: ${token}`);
assert(!/pluginWindowTitlebar|data-center|resonance|\bter\b|pulse/i.test(source),'Core floating geometry must remain host/domain blind.');

// Reproduce the dedicated-window failure directly: the workspace floating zone
// starts below the 52px native titlebar + 6px shell gap (top=58), while the
// generic PortableView CSS may resolve to position:fixed. Persisted coordinates
// are zone-local, so fixed coordinates must be translated by the live zone
// origin. This coordinate invariant alone keeps the whole draggable surface in
// the workspace and does not require measuring the drag handle on every move.
const writes=[];
const fakeGate={
  set(_el,property,value){writes.push([property,value]);},
  setToken(){},remove(){},KINDS:{CONFIG_TOKEN:'token',RUNTIME_INLINE:'inline'}
};
const moduleBox={exports:{}};
const context={
  module:moduleBox,exports:moduleBox.exports,console,
  window:{innerWidth:1400,innerHeight:900},
  document:{body:{},documentElement:{}},
  getComputedStyle:()=>({position:'fixed'}),
  require:id=>{
    if(id==='../foundation/shortcuts')return {hostState:{root:null,zones:new Map()},esc:v=>String(v),resolveElement:v=>v,resolveScopedElement:()=>null,cleanupCall(){},readJson:()=>({}),writeJson(){}};
    if(id==='../interaction/context-actions')return {ContextMenu:class {}};
    if(id==='./docking')return {normalizePlacement:v=>String(v||'home'),refreshDockZoneState(){}};
if(id==='../../../host/native-touch-drag')return {bind:()=>()=>{}};
    if(id==='ui/style-ownership-gate')return fakeGate;
    throw new Error(id);
  }
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'portable-view.js'});
const {PortableView}=moduleBox.exports;
const view=Object.create(PortableView.prototype);
view.wrapper={dataset:{placement:'global'},classList:{contains:name=>name==='is-floating'||name==='is-global-floating'}};
view.floatingPositionMode='';
const metrics={rect:{left:84,top:58,width:1200,height:800,right:1284,bottom:858},minTop:0};
view.setFloatingPosition(12,8,metrics);
assert(writes.some(([p,v])=>p==='left'&&v==='96px'),'Fixed PortableView left must translate zone-local X by the workspace viewport origin.');
assert(writes.some(([p,v])=>p==='top'&&v==='66px'),'Fixed PortableView top must translate zone-local Y by the workspace viewport origin, keeping the whole surface below dedicated titlebar chrome.');

// Absolute overlays already use the zone as their containing block and must not
// receive the viewport-origin offset.
writes.length=0;
view.floatingPositionMode='';
context.getComputedStyle=()=>({position:'absolute'});
view.setFloatingPosition(12,8,metrics);
assert(writes.some(([p,v])=>p==='left'&&v==='12px'),'Absolute PortableView X must remain zone-local.');
assert(writes.some(([p,v])=>p==='top'&&v==='8px'),'Absolute PortableView Y must remain zone-local.');

console.log('v3.68.72 dedicated floating titlebar geometry: zone-local/fixed coordinate translation PASS.');
