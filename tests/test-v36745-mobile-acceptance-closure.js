'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const Module=require('module');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);
Module._initPaths();
// These tests exercise Mobile presenter behavior, while the Gate itself has a
// dedicated runtime suite. Install the same authority boundary with a minimal
// CSSStyleDeclaration-compatible adapter for the lightweight fake nodes here.
global.DKDSStyleGate={
  KINDS:{RUNTIME_INLINE:'runtime-inline',CONFIG_TOKEN:'configuration-token'},
  set(el,property,value){if(el?.style?.setProperty)el.style.setProperty(property,String(value));else if(el?.style)el.style[property]=String(value);return value;},
  setToken(el,property,value){return this.set(el,property,value);},
  remove(el,property){if(el?.style?.removeProperty)el.style.removeProperty(property);else if(el?.style)delete el.style[property];return true;}
};
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=45))),'v3.67.45+ acceptance closure capability must remain available.');}

const structure=read('src/styles/structure/plugin-workspace.css');
assert(structure.includes('.super-workspace-root-page>.analysis-page-body{padding:0;'),'Desktop SUPER workspace must not recreate the blank perimeter band.');

const touch=read('src/core/host/native-touch-drag.js');
assert(touch.includes("window.addEventListener('touchmove',move,{capture:true,passive:false})"),'Native drag must follow TouchEvent motion at window capture scope.');
for(const rel of ['src/core/ui/modules/scientific-curve/navigation.js','src/core/scientific/chart-runtime.js']){
  const source=read(rel);assert(source.includes('NativeTouchDrag')||source.includes('nativeTouchDrag'),'Both scientific toolbar implementations must consume the shared native touch drag path.');
  assert(source.includes('getCoalescedEvents'),'Desktop scientific drag must retain its coalesced PointerEvent path.');
}

const mobilePresentation=read('src/styles/platform/native-workspace-presentation.css');
for(const token of ['border-radius:10px','right:0','width:12px;height:72px','::-webkit-scrollbar{width:3px;height:3px}','resize:none'])assert(mobilePresentation.includes(token),`Parameter drawer acceptance geometry missing ${token}.`);
assert(!mobilePresentation.includes('.dkds-mobile-drawer-resize-handle{position:absolute;z-index:30;right:0;top:0;bottom:0'),'Drawer must not make its entire edge a resize hit area.');
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
for(const token of ['measureDrawerOverflow(frame)','solveCompactDrawerWidth(frame)','fitDrawerToContent(frame,surfaceId','dkdsMobileContentMinWidth','NativeTouchDrag.bind(handle'])assert(presenter.includes(token),`Content-fit parameter drawer missing ${token}.`);


// Runtime-level native touch verification: one long finger move must be delivered
// as one continuous drag instead of being clipped into tiny deltas.
{
  const listeners=new Map();
  const makeTarget=()=>({
    addEventListener(type,fn){if(!listeners.has(this))listeners.set(this,new Map());const map=listeners.get(this);if(!map.has(type))map.set(type,new Set());map.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(this)?.get(type)?.delete(fn);},
    emit(type,event){for(const fn of [...(listeners.get(this)?.get(type)||[])])fn(event);}
  });
  const fakeWindow=makeTarget(),handle=makeTarget();
  const oldWindow=global.window;global.window=fakeWindow;
  delete require.cache[require.resolve('../src/core/host/native-touch-drag')];
  const NativeTouchDrag=require('../src/core/host/native-touch-drag');
  const moves=[];
  const cleanup=NativeTouchDrag.bind(handle,{
    onStart:p=>({start:p}),
    onMove:p=>moves.push([p.clientX,p.clientY]),
    onEnd:p=>moves.push(['end',p.clientX,p.clientY])
  });
  const evt=(touches,changedTouches=touches)=>({touches,changedTouches,cancelable:true,preventDefault(){},stopPropagation(){}});
  handle.emit('touchstart',evt([{identifier:7,clientX:40,clientY:50}]));
  fakeWindow.emit('touchmove',evt([{identifier:7,clientX:240,clientY:160}]));
  fakeWindow.emit('touchend',evt([],[{identifier:7,clientX:240,clientY:160}]));
  cleanup();global.window=oldWindow;
  assert.deepStrictEqual(moves[0],[240,160],'Native touch drag must deliver the full long-distance finger coordinate.');
  assert.deepStrictEqual(moves.at(-1),['end',240,160],'Native touch drag must persist the actual release coordinate.');
}

// Drawer content-fit verification: the compact solver must ignore the legacy
// greedy-width key and expand only as far as an actual width-critical control
// requires. Long filenames/text and intentionally scrollable content are not
// allowed to make the drawer consume tablet space.
{
  const oldWindow=global.window,oldStorage=global.localStorage,oldRaf=global.requestAnimationFrame,oldCancel=global.cancelAnimationFrame;
  const store=new Map([['dkds.mobile.drawer-width.parameters','700']]);
  global.window={innerWidth:800};global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};global.requestAnimationFrame=()=>0;global.cancelAnimationFrame=()=>{};
  delete require.cache[require.resolve('../src/core/ui/modules/presentation/mobile-web-surface')];
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  const presenterRuntime=new MobileWebSurfacePresenter();
  let frame;
  const critical={hidden:false,classList:{contains:()=>false},matches:()=>false,style:{overflowX:''},getBoundingClientRect(){const w=Number.parseFloat(frame.style.width)||300;return {left:0,right:w<360?360:w};}};
  const content={classList:{contains:()=>false},getBoundingClientRect(){const w=Number.parseFloat(frame.style.width)||300;return {left:0,right:w};},querySelectorAll:()=>[critical]};
  frame={isConnected:true,dataset:{},children:[content],style:{width:''},getBoundingClientRect(){return {width:Number.parseFloat(this.style.width)||300};}};
  presenterRuntime.fitDrawerToContent(frame,'parameters');
  const solved=Number.parseFloat(frame.style.width);
  assert(solved>=360&&solved<=480,'Parameter drawer must grow only to the compact critical-control requirement.');
  assert(solved<700,'Legacy greedy drawer width must not leak through the v2 persistence key.');
  assert(Number(frame.dataset.dkdsMobileContentMinWidth)<=480,'Automatic content-fit minimum must remain inside the compact auto-fit ceiling.');
  global.window=oldWindow;global.localStorage=oldStorage;global.requestAnimationFrame=oldRaf;global.cancelAnimationFrame=oldCancel;
}

const shell=read('src/styles/platform/native-client-shell.css');
assert(shell.includes('width:min(340px,calc(100vw - 18px))')&&shell.includes('max-height:min(48vh,360px)'),'Range selection menu must be a compact content-height Mobile popover.');
assert(shell.includes('repeat(auto-fit,minmax(min(320px,100%),1fr))'),'Plugin Manager Mobile cards must use dense auto-fit columns instead of wasting a full row per card.');
assert(shell.includes('.range-action-menu button{width:auto;min-height:28px'),'Range selection actions must use compact touch geometry.');

const resonanceManifest=json('src/plugins/resonance-workbench/plugin.json');
assert(!resonanceManifest.styles.includes('mobile.css')&&resonanceManifest.platformPresentation?.mobile?.mode==='custom'&&resonanceManifest.platformPresentation.mobile.styles?.includes('mobile.css'),'Resonance must keep Mobile SUB density in Mobile-only platform presentation assets outside the frozen Desktop stylesheet.');
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
assert(resonanceMobile.includes('repeat(auto-fit,minmax(min(100%,300px),1fr))'),'Resonance Mobile derived charts must auto-fit across available width.');
assert(resonanceMobile.includes('.reswin-feature-field-card{grid-column:auto}'),'Feature-field chart must not force a full row on Mobile.');

const workbench=read('src/core/ui/modules/workbench/plugin.js');
const host=read('src/core/host/mobile-host-runtime.js');
assert(workbench.includes("{kind:'primary',surfaceId:String(this.primary?.id||'main')}"),'Direct PRIMARY navigation must publish semantic route detail.');
assert(workbench.includes("{kind:'sub',surfaceId:String(id||'')}"),'Direct SUB navigation must publish semantic route detail.');
assert(host.includes('function reconcileWorkspacePresentation(event)'),'Mobile Host must reconcile direct workspace PRIMARY/SUB changes.');
assert(host.includes("window.addEventListener('dkds:workspace-presentation-changed',reconcileWorkspacePresentation)"),'Workspace publication must use route reconciliation, not blind republish.');

const pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
assert(pulseMobile.includes('[data-dkds-mobile-region="main"][data-dkds-mobile-active="true"]'),'Pulse Mobile density must use Presenter semantic activation.');
assert(pulseMobile.includes('repeat(auto-fit,minmax(min(100%,240px),1fr))'),'Pulse result charts must auto-fit instead of forcing one full-width row.');
assert(!read('src/plugins/pulse-analysis/shared-views.js').includes('isNativeClient'),'Pulse shared view must not know platform identity.');

console.log('v3.67.45+ mobile acceptance closure PASS: compact non-greedy drawer, edge handle, dense cards, auto-fit derived grids, route reconciliation, and native drag.');
