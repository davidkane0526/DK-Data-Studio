'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const pkg=json('package.json'),mobilePkg=json('mobile/package.json'),expo=json('mobile/app.json').expo;
const tuple=v=>String(v).split('.').map(Number);
const atLeast=(v,min)=>{const a=tuple(v),b=tuple(min);for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x!==y)return x>y;}return true;};
assert(atLeast(pkg.version,'3.67.50'));
assert(atLeast(mobilePkg.version,'0.8.36'));
assert(atLeast(expo.version,'0.8.36'));
assert(Number(expo.android.versionCode)>=47);

// 1. Desktop scientific chrome gets smaller without shrinking native touch chrome.
const nav=read('src/styles/structure/sdk-semantic-surfaces.css');
const platform=read('src/styles/platform/touch.css');
const native=read('src/styles/platform/native-client-shell.css');
assert(nav.includes('--dkds-scientific-nav-item-width:28px')&&nav.includes('--dkds-scientific-nav-item-height:28px'),'Shared scientific geometry must remain at the frozen baseline.');
assert(platform.includes('html[data-dkds-host="desktop"] .dkds-scientific-nav-tools')&&platform.includes('--dkds-scientific-nav-item-width:'),'Desktop host must continue to own its compact scientific-control geometry.');
assert(native.includes('html[data-dkds-host="mobile"].react-native-client .dkds-scientific-nav-tools')&&native.includes('--dkds-scientific-nav-item-width:'),'Native Mobile must explicitly own a separate scientific-control geometry.');

// 2. Row selection is fill-based and may not draw the intermittent rectangular focus rim.
const shell=read('src/styles/presentation/shell.css');
const appearance=read('src/styles/theme/component-appearance.css');
assert(appearance.includes('.dkds-selection-item.dkds-selection-row:is(')&&appearance.includes('[aria-selected="true"]')&&appearance.includes('border-color:transparent'),'Focused/selected list rows must suppress the generic selection rim in canonical appearance ownership.');

// 3/4. Dynamic and shell menus are paint-hidden until Material + Component
// appearance is composed synchronously; this prevents the one-frame gray/default UI.
const context=read('src/core/ui/modules/interaction/context-actions.js');
assert(context.includes("menuSet(el,'visibility','hidden')"),'ContextMenu must begin paint-hidden through the Style Gate.');
assert(context.includes("b.dataset.dkdsComponentIdentity='menuItem'"),'ContextMenu items must have their canonical component identity before first paint.');
const appendAt=context.indexOf('document.body.appendChild(el);this.element=el;');
const assignAt=context.indexOf("globalThis.DKDSThemeComponentAppearance?.assign?.(el)",appendAt);
const revealAt=context.indexOf("menuRemove(el,'visibility')",assignAt);
assert(appendAt>=0&&assignAt>appendAt&&revealAt>assignAt,'ContextMenu must connect -> synchronously compose appearance -> reveal in that order.');
const menu=read('src/core/plugins/kernel/modules/shortcuts/menu.js');
assert(menu.includes('function prepareCommandMenuForPaint(menu)'),'Shell menus must share a pre-paint composition helper.');
assert(menu.includes("DKDSThemeComponentAppearance?.assign?.(menu)"),'Shell menu appearance must be synchronized before reveal.');
assert(menu.includes("menuSet(menu,'visibility','hidden');\n    menu.classList.remove('hidden');\n    prepareCommandMenuForPaint(menu);\n    positionCommandMenuPortal"),'Portaled command menus must compose while paint-hidden through the Style Gate.');
assert(menu.includes("menuSet(menu,'visibility','hidden');menu.classList.remove('hidden');prepareCommandMenuForPaint(menu);menuRemove(menu,'visibility')"),'Non-portaled command menus must use the same first-paint staging through the Style Gate.');

// 5. The resize rail is inside the transient Drawer frame. It may never trigger
// the global outside-dismiss capture handler.
const presenter=read('src/core/ui/modules/presentation/mobile-web-surface.js');
const adapters=read('src/core/ui/modules/interaction/adapters.js');
assert(presenter.includes("handle.dataset.dkdsTouchGestureOwner='drawer-resize'"),'Drawer resize rail must own its native touch gesture.');
assert(adapters.includes('activeDrawerFrames.find(frame=>eventPath.includes(frame)||frame.contains?.(event.target))'),'Outside-dismiss must test the entire active Drawer frame/composed path, including its resize rail.');
{
  const prior={window:global.window,document:global.document,KeyboardEvent:global.KeyboardEvent};
  const listeners={};
  let handle=null;
  const frame={dataset:{dkdsMobileSurfaceId:'parameters'},contains(target){return target===handle;}};
  handle={closest(selector){
    if(selector.includes('data-dkds-mobile-frame-region="drawer"'))return frame;
    if(selector.includes('dkds-mobile-drawer-resize')||selector.includes('data-dkds-touch-gesture-owner'))return handle;
    return null;
  }};
  global.window={DKDSPlugins:{activities:{active:()=> 'resonance'}}};
  global.document={
    addEventListener(type,fn){listeners[type]=fn;},
    querySelectorAll(selector){return selector.includes('dkds-mobile-frame-region="drawer"')?[frame]:[];}
  };
  delete require.cache[require.resolve('../src/core/ui/modules/interaction/adapters')];
  const {MobileGestureAdapter}=require('../src/core/ui/modules/interaction/adapters');
  const seen=[];new MobileGestureAdapter({dispatch:intent=>{seen.push(intent);return true;}}).installDocumentBindings();
  listeners.pointerdown({isPrimary:true,pointerType:'touch',pointerId:1,clientX:400,clientY:200,target:handle,composedPath(){return [handle,frame];},cancelable:true,preventDefault(){},stopPropagation(){}});
  assert.strictEqual(seen.length,0,'Pressing the Drawer resize rail must not dismiss the Drawer.');
  if(prior.window===undefined)delete global.window;else global.window=prior.window;
  if(prior.document===undefined)delete global.document;else global.document=prior.document;
  if(prior.KeyboardEvent===undefined)delete global.KeyboardEvent;else global.KeyboardEvent=prior.KeyboardEvent;
}

// 6. Data Management is a dense native browser: compact header/filters,
// one-row segmented selection actions and a flex-filling artifact list.
const dcMobile=read('src/plugins/data-center/mobile.css'),dc=json('src/plugins/data-center/plugin.json'),dcRuntime=read('src/plugins/data-center/plugin.js');
for(const token of [
  'grid-template-columns:minmax(0,1fr) minmax(118px,150px)',
  'grid-template-columns:repeat(2,minmax(0,1fr));gap:5px',
  'grid-template-columns:repeat(4,minmax(0,1fr));gap:4px',
  'flex:1 1 0;min-height:0;padding:4px 6px 6px',
  'margin:0 0 3px;padding:6px 7px',
  '@container data-center-artifacts-mobile (max-width:339px)'
])assert(dcMobile.includes(token),`Native Data Management layout missing ${token}.`);
assert(/^1\.15\.(?:[8-9]|\d{2,})$/.test(dc.version));
{
  let runtimeManifest=null;
  const sandbox={DKDSPlugins:{define:(manifest)=>{runtimeManifest=manifest;}}};
  vm.createContext(sandbox);
  vm.runInContext(dcRuntime,sandbox,{filename:'src/plugins/data-center/plugin.js'});
  assert(runtimeManifest&&runtimeManifest.id===dc.id,'Runtime Data Center manifest must define the plugin.json id.');
  assert.strictEqual(runtimeManifest.version,dc.version,'Runtime Data Center version must match plugin.json.');
}

// 7. Mobile split dragging must avoid synchronous layout reads on every raw
// pointermove, and the group companion ceiling must be materially higher.
const split=read('src/core/ui/modules/layout/workspace.js');
const layoutState=read('src/core/ui/modules/layout/state-resolver.js');
assert(split.includes("require('./state-resolver')")&&!split.includes('mobile-split-performance')&&!split.includes('__dkdsMobilePreviewTotal'),'Split policy must have one authored Core owner and no runtime method patch.');
assert(split.includes("root?.dataset?.dkdsHost==='mobile'")&&split.includes("react-native-client"),'Native Mobile split constraints must be hard-gated to the immutable host identity.');
assert(split.includes('this.previewViewport=this.viewport(this.drag?.rect)'),'Split drag must cache container geometry once at drag start.');
assert(split.includes('if(Number.isFinite(raw))this.previewSize=raw')&&split.includes('if(this.previewFrame)return'),'Raw pointermove must only queue the latest size; clamping/layout occurs once in rAF.');
assert(layoutState.includes('if(nativeMobile&&state.mobileOverlay)')&&layoutState.includes('const ratioMax=total*state.mobileMaxRatio'),'The pure resolver must own Native Mobile overlay limits.');
const workbench=read('src/core/ui/modules/workbench/plugin.js'),workspace=read('src/styles/platform/native-workspace-presentation.css');
assert(!workbench.includes('enhanceMobileSplitController')&&workbench.includes('this.canvasBottomSplit=new SplitController'),'Plugin canvas splits must consume the canonical controller directly.');
assert(workbench.includes('mobileMaxRatio:.58,mobileReserve:240'),'Mobile bottom companion must permit the raised 58% range while reserving the primary area.');
assert(workspace.includes('--dkds-mobile-bottom-track:clamp(180px,var(--dkds-plugin-canvas-bottom-height),min(620px,72vh))'),'Wide/expanded native companions must use a viewport-bounded physical bottom track that preserves the primary work area.');
assert(workspace.includes('var(--dkds-mobile-user-bottom-track,36%)')&&workspace.includes('--dkds-mobile-bottom-seam:var(--dkds-canvas-resizer-track-size,7px)'),'Both orientations keep disjoint, bounded companion regions.');

// Mobile Presenter must not rewrite projection styles/refit Drawer width on every
// host publication. First-open fitting occurs paint-hidden to avoid visible jumps.
assert(presenter.includes("if(current===next)return false"),'Presenter must make projection style writes idempotent.');
assert(presenter.includes('const regionChanged=saved.region!==region||saved.normalized!==true'),'Projected geometry must only normalize when projection region changes.');
assert(presenter.includes("if(existing)return;"),'Existing Drawer handles must not schedule another content-fit on every presentation publish.');
assert(!presenter.includes("this.projectNode(node,target,region,surfaceId,surface.presentationPurpose||surface.presentation?.purpose||'',surface.role||surface.presentationRole||'');if(region==='drawer'"),'Presentation apply must not unconditionally refit active Drawers.');
assert(presenter.includes("this.setStyle(frame,'visibility','hidden')")&&presenter.includes("this.setStyle(frame,'visibility','')"),'First-open auto-fit must be paint-hidden until the final width is resolved.');
assert(presenter.includes("signature===this.lastApplySignature&&this.projectionStillValid"),'Repeated Mobile state publications with unchanged presentation must use the stable no-mutation path.');
assert(presenter.includes("return {mode:'stable'"),'Stable presentation snapshots must return before projection DOM writes.');

for(const rel of ['src/styles/structure/sdk-semantic-surfaces.css','src/styles/presentation/shell.css','src/styles/platform/native-client-shell.css','src/styles/platform/native-workspace-presentation.css','src/plugins/data-center/mobile.css'])
  assert(!read(rel).includes('!important'),`${rel} must remain free of patch-style !important.`);

console.log('v3.67.50 menu + Mobile performance closure PASS: smaller Desktop plot chrome, row focus fill, first-paint themed menus, resize-safe drawers, dense Data Management, coalesced split dragging and higher companion range.');
