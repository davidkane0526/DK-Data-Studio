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

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
{const [major,minor,patch]=pkg.version.split('.').map(Number);assert(major>3||(major===3&&(minor>67||(minor===67&&patch>=46))),'v3.67.46+ layout closure must remain available.');}
assert(mobilePkg.version===pkg.version||Number(String(mobilePkg.version).split('.').at(-1))>=32,'Mobile package must retain the v3.67.46+ layout closure baseline or use synchronized app identity.');
assert.strictEqual(expo.version,mobilePkg.version,'Expo and Mobile package versions must stay synchronized.');
assert(Number(expo.android.versionCode)>=43,'Android versionCode must advance for the v3.67.46 acceptance build.');

// 1/5. Parameter drawers: compact automatic solver, no legacy greedy persistence,
// slight radius, an in-edge handle, and both PointerEvent + TouchEvent dragging.
const presentation=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const workspaceCss=read('src/styles/platform/native-workspace-presentation.css');
for(const token of [
  "drawerStorageKey(surfaceId='',storageScope=''){",
  'solveMinimumReasonableWidth(frame,region=',
  'measureSurfaceOverflow(frame)',
  "win?.addEventListener?.('pointermove',pointerMove,{passive:false})",
  'NativeTouchDrag.bind(handle'
]) assert(presentation.includes(token),`Content-derived drawer runtime missing ${token}.`);
assert(!/viewport\*\.[0-9]+/.test(presentation),'Drawer fitting must not derive automatic width from a viewport ratio.');
for(const token of ['max-width:calc(100vw - 12px)','border-radius:10px','right:0;top:50%;width:12px;height:72px'])
  assert(workspaceCss.includes(token),`Drawer safety/interaction geometry missing ${token}.`);
assert(!workspaceCss.includes('width:min(32vw,420px'),'Retired percentage/cap automatic drawer geometry must stay removed.');
assert(!/\[data-dkds-mobile-region=\"drawer\"\]\[data-dkds-mobile-active=\"true\"\]\{[^}]*padding-right:0/.test(workspaceCss),'Core Mobile drawer geometry must not erase plugin-owned content inset.');
assert(!workspaceCss.includes('right:-14px'),'Drawer resize hit target must not sit outside the visible panel edge.');

// Runtime interaction: a pointer drag on the visible handle must update width and
// persist it under the current drawer-width key. This catches the prior inert-handle regression.
{
  const prior={window:global.window,document:global.document,localStorage:global.localStorage,raf:global.requestAnimationFrame,caf:global.cancelAnimationFrame};
  const listeners=new Map();
  const eventTarget=()=>({
    addEventListener(type,fn){if(!listeners.has(this))listeners.set(this,new Map());const m=listeners.get(this);if(!m.has(type))m.set(type,new Set());m.get(type).add(fn);},
    removeEventListener(type,fn){listeners.get(this)?.get(type)?.delete(fn);},
    emit(type,event){for(const fn of [...(listeners.get(this)?.get(type)||[])])fn(event);}
  });
  const classList=()=>{const s=new Set();return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)};};
  const makeNode=()=>Object.assign(eventTarget(),{dataset:{},style:{width:''},children:[],classList:classList(),setAttribute(){},append(node){this.children.push(node);node.parentNode=this;},querySelector(sel){return this.children.find(n=>sel.includes('dkds-mobile-drawer-resize-handle')&&(n.classList?.contains('dkds-mobile-drawer-resize-handle')||String(n.className||'').split(/\s+/).includes('dkds-mobile-drawer-resize-handle')))||null;}});
  const fakeWindow=eventTarget();fakeWindow.innerWidth=900;
  const store=new Map();
  global.window=fakeWindow;global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v))};
  global.requestAnimationFrame=()=>0;global.cancelAnimationFrame=()=>{};
  global.document={createElement(){return makeNode();},documentElement:{dataset:{dkdsHost:'mobile'},classList:{contains:v=>v==='react-native-client'}}};
  delete require.cache[require.resolve('../src/core/host/native-touch-drag')];
  delete require.cache[require.resolve('../src/core/ui/modules/presentation/mobile-web-surface')];
  const {MobileWebSurfacePresenter}=require('../src/core/ui/modules/presentation/mobile-web-surface');
  const runtime=new MobileWebSurfacePresenter();
  const content=makeNode();content.getBoundingClientRect=()=>({left:0,right:Number.parseFloat(frame.style.width)||320});content.querySelectorAll=()=>[];
  const frame=makeNode();frame.isConnected=true;frame.getBoundingClientRect=()=>({width:Number.parseFloat(frame.style.width)||320});frame.append(content);
  runtime.installDrawerHandle(frame,'parameters');
  const handle=frame.querySelector(':scope > .dkds-mobile-drawer-resize-handle');
  assert(handle,'Drawer handle must be created.');
  const evt=(x,id=4)=>({button:0,pointerId:id,clientX:x,cancelable:true,preventDefault(){},stopPropagation(){}});
  const beforeWidth=Number.parseFloat(frame.style.width)||runtime.drawerBounds(frame).base;
  handle.emit('pointerdown',evt(320));
  fakeWindow.emit('pointermove',evt(400));
  fakeWindow.emit('pointerup',evt(400));
  const afterWidth=Number.parseFloat(frame.style.width)||0;
  assert(afterWidth>=beforeWidth+70,'Pointer drag must directly increase the compact drawer width by the gesture delta.');
  assert(Number(store.get('dkds.mobile.drawer-width.v12.parameters'))>=afterWidth-1,'Dragged drawer width must be persisted under the current key.');
  handle.__dkdsTouchResizeCleanup?.();
  if(prior.window===undefined)delete global.window;else global.window=prior.window;
  if(prior.document===undefined)delete global.document;else global.document=prior.document;
  if(prior.localStorage===undefined)delete global.localStorage;else global.localStorage=prior.localStorage;
  if(prior.raf===undefined)delete global.requestAnimationFrame;else global.requestAnimationFrame=prior.raf;
  if(prior.caf===undefined)delete global.cancelAnimationFrame;else global.cancelAnimationFrame=prior.caf;
}

// 2. Scientific feature routes pack against actual surface width. The historical
// gate-analysis-grid is covered explicitly so the Desktop <=1050px single-column
// rule can no longer dominate the Mobile route.
const resonanceMobile=read('src/plugins/resonance-workbench/mobile.css');
assert(resonanceMobile.includes('repeat(auto-fit,minmax(min(100%,300px),1fr))'),'Resonance derived chart routes must auto-fit compact scientific cards.');
assert(resonanceMobile.includes('.gate-analysis-body .gate-analysis-grid')&&resonanceMobile.includes('repeat(auto-fit,minmax(min(100%,360px),1fr))'),'Historical gate-analysis pages must have a Mobile-owned auto-fit grid.');
assert(resonanceMobile.includes('height:clamp(230px,31vh,310px)'),'Gate-analysis plots must use compact Mobile chart height.');

// 3. Plugin Manager cards keep a 320px minimum but stretch tracks to consume
// the full row; action chrome must remain horizontal and legible.
const shell=read('src/styles/platform/native-client-shell.css');
assert(shell.includes('.plugin-manager-section-list{grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:7px;width:100%;justify-content:stretch}'),'Plugin cards must use flexible auto-fit tracks that consume the available row width.');
assert(shell.includes('.plugin-card-actions{flex:0 0 auto;min-width:max-content;flex-wrap:nowrap}')&&shell.includes('white-space:nowrap;word-break:keep-all'),'Plugin card actions must remain horizontal and legible.');

// 4. Bottom companions may be resized, but cannot cover the primary work area.
// Both the SplitController contract and CSS projection ceiling enforce this.
const workbench=read('src/core/ui/modules/workbench/plugin.js');
assert(workbench.includes("axis:'y'")&&workbench.includes('mobileMaxRatio:.58,mobileReserve:240'),'Bottom split must remain bounded while allowing the larger user-requested Mobile companion range.');
assert(workspaceCss.includes('var(--dkds-mobile-user-bottom-track,36%)')&&workspaceCss.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Both orientations keep disjoint, bounded companion regions.');

// 5. Small parameter sets are content-sized. Data Center opts into the shared
// ParameterSchema capability and keeps its preview height compact in Mobile CSS.
const parameterSchema=read('src/core/data/parameter-schema.js');
const dcRuntime=read('src/plugins/data-center/feature-runtime.js');
const dcChartRuntime=read('src/plugins/data-center/chart-runtime.js');
const dcManifest=json('src/plugins/data-center/plugin.json');
const dcMobile=read('src/plugins/data-center/mobile.css');
assert(parameterSchema.includes('autoFit=false')&&parameterSchema.includes("classList.toggle('auto-fit',!!autoFit)"),'ParameterSchema must expose a generic opt-in auto-fit form layout.');
assert(shell.includes('.schema-parameter-panel.auto-fit')&&shell.includes('var(--dkds-parameter-auto-fit-native-columns,repeat(auto-fit,minmax(150px,220px)))'),'Mobile auto-fit parameter fields must retain the compact fallback while allowing a Surface to request an alternate Core-owned track recipe.');
assert(dcRuntime.includes("ctx.modules.require('chart-runtime')")&&dcChartRuntime.includes('compact:true,autoFit:true'),'Data Center delegated chart parameters must opt into compact auto-fit fields.');
assert(!dcManifest.styles.includes('mobile.css')&&dcManifest.platformPresentation?.mobile?.mode==='custom'&&dcManifest.platformPresentation.mobile.styles?.includes('mobile.css')&&/^1\.15\.(?:[6-9]|\d{2,})$/.test(dcManifest.version),'Data Center must load its Mobile composition stylesheet only through the Mobile platform presentation contract and retain its synchronized Mobile layout version.');
assert(dcMobile.includes('--dc-chart-height:clamp(180px,30dvh,280px)')&&dcMobile.includes('--dc-chart-min-height:160px'),'Data Center graph preview must remain viewport-bounded through the plugin-owned chart-height token contract.');

for(const rel of ['src/styles/platform/native-client-shell.css','src/styles/platform/native-workspace-presentation.css','src/plugins/resonance-workbench/mobile.css','src/plugins/data-center/mobile.css'])
  assert(!read(rel).includes('!important'),`${rel} must stay free of patch-style !important overrides.`);

console.log('v3.67.46 mobile layout closure PASS: compact draggable drawers, auto-fit scientific grids, stable plugin cards, bounded bottom splits, and compact Data Center parameters.');
