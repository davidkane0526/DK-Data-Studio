'use strict';
const StyleGate=require('ui/style-ownership-gate');
const STYLE_SOURCE='src/core/ui/modules/presentation/mobile-web-surface.js';
const mobileSurfaceSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.mobile-web-surface',scope:'runtime-mobile-presentation',source:STYLE_SOURCE});
const mobileSurfaceToken=(el,property,value)=>StyleGate.setToken(el,property,value,{owner:'core.mobile-web-surface',scope:'runtime-mobile-presentation-token',source:STYLE_SOURCE});
const mobileSurfaceRemove=(el,property)=>StyleGate.remove(el,property,{owner:'core.mobile-web-surface',scope:property.startsWith('--')?'runtime-mobile-presentation-token':'runtime-mobile-presentation',source:STYLE_SOURCE});

const PlatformBoundary=require('../../../host/platform-boundary');
const NativeTouchDrag=require('../../../host/native-touch-drag');
const {BASE_METRICS}=require('../composition/unit-template-spec');
const {resolveInlineConstraintDeficit,reflowUnitGeometry,GEOMETRY_CONSTRAINT_EVENTS}=require('../composition/unit-geometry-constraints');
const {dismissAllContextMenus}=require('../interaction/transient-registry');
const {drawerOverflowCompensation}=require('./mobile-web-surface-geometry');
const ProjectionContract=require('./mobile-web-projection-contract');
const text=value=>String(value??'');
const esc=value=>{
  const raw=text(value);
  if(globalThis.CSS?.escape)return globalThis.CSS.escape(raw);
  return raw.replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch.codePointAt(0).toString(16)} `);
};
const PROJECTION_STYLE=ProjectionContract.PROJECTION_STYLE;


class MobileWebSurfacePresenter {
  constructor(){this.activeActivity='';this.projectedNodes=new Map();this.decoratedNodes=new Set();this.activeRoot=null;this.drawerFitFrames=new WeakMap();this.lastApplySignature='';}
  isMobileDocument(){return PlatformBoundary.isMobileDocument();}
  portableOwnsPlacement(node){
    if(!node?.classList?.contains?.('dkds-portable-view'))return false;
    // DATA_CONTROL has a Desktop PortableView placement (usually left) even
    // though Mobile presents the same semantic surface as a transient drawer.
    // Treating that inherited Desktop placement as Mobile geometry ownership
    // prevented every native “参数” button from ever projecting its panel.
    const semanticRole=text(node.dataset?.dkdsPresentationRole||node.dataset?.dkdsMobileRole).toLowerCase();
    const purpose=text(node.dataset?.dkdsPresentationPurpose).toLowerCase();
    if(semanticRole==='data-control'||purpose==='parameters')return false;
    const placementSource=text(node.dataset?.dkdsPortablePlacementSource).toLowerCase();
    const placement=text(node.dataset?.placement||'home').toLowerCase();
    // Semantic companion *home lanes* stay Presenter-owned even when an older
    // PortableView state remembers that the user once moved the surface and later
    // returned it to the canonical dock. Ownership follows the effective placement,
    // not the historical gesture source. Otherwise a persisted `user:right` Inspector
    // or `user:bottom` scientific-secondary bypasses the companion track entirely and
    // re-enters the compact legacy dock/overlay geometry, producing a different height
    // contract for the same visible layout. Only a genuine non-home placement remains
    // PortableView-owned on Mobile.
    const semanticHome=semanticRole==='inspector'?'right':semanticRole==='scientific-secondary'?'bottom':'';
    if(semanticHome&&(placementSource!=='user'||placement==='home'||placement===semanticHome))return false;
    return placement!=='home'||node.classList.contains('is-floating')||node.classList.contains('is-global-floating')||node.classList.contains('is-sticky')||node.classList.contains('is-docked');
  }
  surfaceNode(activityId,surface){
    const surfaceId=text(surface?.surfaceId||surface?.id);if(!activityId||!surfaceId)return null;
    return document.querySelector?.(`[data-dkds-workspace-activity="${esc(activityId)}"][data-dkds-workspace-surface-id="${esc(surfaceId)}"]`)||null;
  }
  semanticLaneActive(activityId,surface,region){
    if(surface?.active!==true||text(surface?.presentation?.region)!==region)return false;
    const node=this.surfaceNode(activityId,surface);
    return !node||!this.portableOwnsPlacement(node);
  }
  setData(node,key,value){if(!node?.dataset)return;const next=text(value);if(node.dataset[key]!==next)node.dataset[key]=next;}
  setStyle(node,property,value){
    const style=node?.style;if(!style)return false;const next=text(value);
    const current=style.getPropertyValue?style.getPropertyValue(property):'';if(current===next)return false;
    if(next)mobileSurfaceSet(node,property,next);else mobileSurfaceRemove(node,property);
    return true;
  }
  setToken(node,property,value){
    if(!node?.style)return false;const next=text(value),current=node.style.getPropertyValue?.(property)||'';if(current===next)return false;
    if(next)mobileSurfaceToken(node,property,next);else mobileSurfaceRemove(node,property);return true;
  }
  clearNodeData(node){
    if(!node?.dataset)return;
    delete node.dataset.dkdsMobileRegion;delete node.dataset.dkdsMobileRole;delete node.dataset.dkdsMobileNavigation;delete node.dataset.dkdsMobileActive;
  }
  clearRootData(root){
    if(!root?.dataset)return;
    delete root.dataset.dkdsMobilePresentation;delete root.dataset.dkdsMobileLayout;delete root.dataset.dkdsMobileOrientation;delete root.dataset.dkdsMobileCompanionRight;delete root.dataset.dkdsMobileCompanionBottom;delete root.dataset.dkdsMobileDrawerOpen;
  }
  captureInline(node){
    const style=node?.style;if(!style?.getPropertyValue)return null;
    const rows={};for(const prop of PROJECTION_STYLE)rows[prop]={value:style.getPropertyValue(prop),priority:style.getPropertyPriority?.(prop)||''};
    return rows;
  }
  restoreInline(node,rows){
    if(!node?.style||!rows)return;
    for(const [prop,row] of Object.entries(rows)){
      if(row?.priority)throw new Error(`Mobile presentation refuses prioritized inline style: ${prop}`);
      if(row?.value)mobileSurfaceSet(node,prop,row.value);else mobileSurfaceRemove(node,prop);
    }
  }
  normalizeProjectedNode(node,region,purpose=''){
    const style=node?.style;if(!style?.setProperty)return;
    const projection=ProjectionContract.styleValues(node,region,purpose);
    if(projection.parameterDrawer){if(node.dataset)node.dataset.dkdsMobileParameterInsetHandoff='true';}
    else if(node.dataset)delete node.dataset.dkdsMobileParameterInsetHandoff;
    for(const [prop,value] of Object.entries(projection.values))this.setStyle(node,prop,value);
  }
  releaseProjectionDetachObserver(frame){ProjectionContract.releaseDetachObserver(frame);}
  installProjectionDetachObserver(frame,node){
    ProjectionContract.installDetachObserver(frame,node,{
      isCurrent:()=>this.projectedNodes.get(node)?.frame===frame,
      onDetached:()=>this.restoreNode(node)
    });
  }
  viewportOrientation(){
    const declared=text(this.activeRoot?.dataset?.dkdsMobileOrientation||globalThis.window?.DKDSPlatform?.profile?.orientation).trim().toLowerCase();
    if(declared==='landscape'||declared==='portrait')return declared;
    const visual=globalThis.window?.visualViewport,width=Number(visual?.width)||Number(globalThis.window?.innerWidth)||Number(globalThis.innerWidth)||0,height=Number(visual?.height)||Number(globalThis.window?.innerHeight)||Number(globalThis.innerHeight)||0;
    return width>height?'landscape':'portrait';
  }
  drawerStorageKey(surfaceId='',storageScope=''){
    const scope=text(storageScope||surfaceId||'parameters').trim().replace(/[^a-zA-Z0-9_.:-]+/g,'-')||'parameters';
    return `dkds.mobile.drawer-width.v21.${this.viewportOrientation()}.${scope}`;
  }
  viewportInlineSize(){const visual=globalThis.window?.visualViewport;return Math.max(0,Number(visual?.width)||Number(globalThis.window?.innerWidth)||Number(globalThis.innerWidth)||320);}
  surfaceInlineReservePx(){return Math.max(0,Number(BASE_METRICS?.portable?.floatingViewportInlineReservePx)||12);}
  semanticSearchFloorPx(){
    // Probe from the smallest canonical single-control footprint. This is not a
    // target width. Unit gaps/padding remain untouched and therefore consume real
    // space during every probe; only shrinkable controls are allowed to contract.
    const action=Math.max(1,Number(BASE_METRICS?.action?.minWidthPx)||30);
    const inset=Math.max(0,Number(BASE_METRICS?.surface?.padInlinePx)||10);
    return action+inset*2;
  }
  surfaceAvailableWidth(frame,region='drawer'){
    const viewport=this.viewportInlineSize(),reserve=this.surfaceInlineReservePx();
    let available=Math.max(1,viewport-reserve);
    if(region==='drawer'){
      // The parameter Drawer is a true overlay Surface. Scientific companions keep
      // their own full Presenter allocation underneath it; opening/resizing the
      // Drawer must never shrink Inspector/Group lanes. Only the viewport/overlay
      // host bounds the Drawer itself.
      const parentWidth=Math.max(0,Number(frame?.parentElement?.clientWidth)||Number(frame?.parentElement?.getBoundingClientRect?.().width)||0);
      if(parentWidth>0)available=Math.min(available,Math.max(1,parentWidth-reserve));
    }
    return Math.max(1,available);
  }
  surfaceReasonableFloor(frame,region='drawer'){
    const available=this.surfaceAvailableWidth(frame,region);
    // Start from the smallest canonical control footprint only. The actual Drawer
    // minimum is discovered from live Unit density constraints and intrinsic
    // overflow in solveMinimumReasonableWidth(); Presenter must not substitute a
    // viewport-percentage guess for the content contract.
    return Math.max(1,Math.min(available,this.semanticSearchFloorPx()));
  }
  drawerBounds(frame=null){const max=this.surfaceAvailableWidth(frame,'drawer'),base=this.surfaceReasonableFloor(frame,'drawer');return {base,max};}
  storedReasonableMin(frame){const raw=Number(frame?.dataset?.dkdsMobileReasonableMinWidth);return Number.isFinite(raw)&&raw>0?raw:0;}
  drawerContentMin(frame){return Math.max(this.surfaceReasonableFloor(frame,'drawer'),this.storedReasonableMin(frame));}
  savedDrawerWidth(surfaceId='',storageScope=''){try{const raw=localStorage.getItem(this.drawerStorageKey(surfaceId,storageScope));if(raw===null||String(raw).trim()==='')return NaN;const value=Number(raw);return Number.isFinite(value)?value:NaN;}catch{return NaN;}}
  clampDrawerWidth(value,minOverride=0,frame=null){const bounds=this.drawerBounds(frame),min=Math.max(bounds.base,Math.min(bounds.max,Number(minOverride)||0)),n=Number(value);return Math.max(min,Math.min(bounds.max,Number.isFinite(n)?n:min));}
  drawerScrollHost(frame){return frame?.querySelector?.(':scope > .dkds-mobile-drawer-scroll')||[...frame?.children||[]].find(node=>node?.classList?.contains?.('dkds-mobile-drawer-scroll')||String(node?.className||'').split(/\s+/).includes('dkds-mobile-drawer-scroll'))||null;}
  ensureDrawerScrollHost(frame){
    if(!frame||typeof document?.createElement!=='function')return null;
    let host=this.drawerScrollHost(frame);
    if(!host){
      host=document.createElement('div');host.className='dkds-mobile-drawer-scroll';host.dataset.dkdsMobileDrawerScroll='true';
      const handle=frame.querySelector?.(':scope > .dkds-mobile-drawer-resize-handle')||null;
      try{frame.insertBefore?.(host,handle||null);}catch{try{frame.append?.(host);}catch{}}
    }
    return host;
  }
  drawerContentHost(frame){
    const host=this.drawerScrollHost(frame);if(!host)return null;
    return host.querySelector?.(':scope > .dkds-mobile-drawer-content')||[...host.children||[]].find(node=>node?.classList?.contains?.('dkds-mobile-drawer-content')||String(node?.className||'').split(/\s+/).includes('dkds-mobile-drawer-content'))||null;
  }
  ensureDrawerContentHost(frame){
    const scroll=this.ensureDrawerScrollHost(frame);if(!scroll||typeof document?.createElement!=='function')return null;
    let content=this.drawerContentHost(frame);
    if(!content){content=document.createElement('div');content.className='dkds-mobile-drawer-content';content.dataset.dkdsMobileDrawerContent='true';try{scroll.append(content);}catch{}}
    let safeEnd=content.querySelector?.(':scope > .dkds-mobile-drawer-safe-end')||null;
    if(!safeEnd){safeEnd=document.createElement('div');safeEnd.className='dkds-mobile-drawer-safe-end';safeEnd.dataset.dkdsMobileDrawerSafeEnd='true';safeEnd.setAttribute?.('aria-hidden','true');try{content.append(safeEnd);}catch{}}
    return content;
  }
  drawerSafeEnd(frame){const content=this.drawerContentHost(frame);return content?.querySelector?.(':scope > .dkds-mobile-drawer-safe-end')||[...(content?.children||[])].find(node=>node?.classList?.contains?.('dkds-mobile-drawer-safe-end')||String(node?.className||'').split(/\s+/).includes('dkds-mobile-drawer-safe-end'))||null;}
  syncDrawerSafeExtent(frame){
    const node=this.drawerContentNode(frame),safeEnd=this.drawerSafeEnd(frame);if(!node||!safeEnd)return 0;
    if(text(frame?.dataset?.dkdsPresentationPurpose)!=='parameters'){this.setStyle(safeEnd,'margin-top','0px');return 0;}
    const overflow=drawerOverflowCompensation(node);
    this.setStyle(safeEnd,'margin-top',overflow>0?`${overflow}px`:'0px');
    this.setData(safeEnd,'dkdsMobileOverflowCompensation',String(overflow));
    return overflow;
  }
  drawerContentNode(frame){
    const content=this.drawerContentHost(frame);if(content)return [...content.children||[]][0]||null;
    const host=this.drawerScrollHost(frame);if(host)return [...host.children||[]].find(node=>!node?.classList?.contains?.('dkds-mobile-drawer-content'))||null;
    return [...frame?.children||[]].find(node=>!node?.classList?.contains('dkds-mobile-drawer-resize-handle'))||null;
  }
  syncFrameContentHost(frame,node,region=''){
    if(!frame||!node)return frame;
    if(region==='drawer'){
      const content=this.ensureDrawerContentHost(frame),safeEnd=this.drawerSafeEnd(frame);if(content&&node.parentNode!==content){try{content.insertBefore(node,safeEnd||null);}catch{try{content.append(node);}catch{}}}
      return content||this.drawerScrollHost(frame)||frame;
    }
    const host=this.drawerScrollHost(frame);
    // Companion/sheet frames are the physical projection boundary. The projected
    // Surface must be a child of that frame, never its flex sibling. Otherwise the
    // empty frame and the real Surface both participate in the slot flex layout and
    // split the available block size between them. This is deliberately domain-blind:
    // Presenter owns the projection shell; Unit/Portable own only content inside it.
    if(node.parentNode!==frame){
      try{frame.insertBefore(node,host||null);}catch{try{frame.append(node);}catch{}}
    }
    try{host?.remove?.();}catch{}
    return frame;
  }
  reflowMeasuredUnits(frame){
    const content=this.drawerContentNode(frame);if(!content)return;
    // Presenter asks the generic Unit geometry subsystem to settle accepted
    // responsive layouts. It does not inspect Layout-private markers or hooks.
    reflowUnitGeometry(content,{passes:2,includeRoot:false});
    this.syncDrawerSafeExtent(frame);
  }
  constraintDeficit(frame){
    const content=this.drawerContentNode(frame);if(!content)return 0;
    return resolveInlineConstraintDeficit(content).deficitPx;
  }
  solveMinimumReasonableWidth(frame,region='drawer'){
    if(region!=='drawer')return this.surfaceAvailableWidth(frame,region);
    const available=Math.ceil(this.surfaceAvailableWidth(frame,'drawer'));
    let width=Math.ceil(this.surfaceReasonableFloor(frame,'drawer'));
    // Surface frame owns allocation; Unit/PRIME own intrinsic constraints. Start
    // small, let the real Unit tree reflow, then grow only by the measured local
    // deficit. Insets, panel padding and nested composition therefore participate
    // naturally without the Presenter knowing form-grid/TER/Pulse identities.
    for(let pass=0;pass<8;pass+=1){
      width=Math.max(1,Math.min(available,Math.ceil(width)));
      this.setStyle(frame,'width',`${width}px`);
      this.reflowMeasuredUnits(frame);
      frame?.getBoundingClientRect?.();
      const deficit=this.constraintDeficit(frame);
      if(deficit<=0||width>=available)return width;
      const next=Math.min(available,width+Math.max(1,deficit));
      if(next<=width)return width;width=next;
    }
    return width;
  }
  solveCompactDrawerWidth(frame){return this.solveMinimumReasonableWidth(frame,'drawer');}
  fitDrawerToContent(frame,surfaceId='',storageScope=''){
    if(!frame?.isConnected)return;
    const reasonableMin=this.solveMinimumReasonableWidth(frame,'drawer'),saved=this.savedDrawerWidth(surfaceId,storageScope);
    frame.dataset.dkdsMobileReasonableMinWidth=String(Math.round(reasonableMin));
    const width=Number.isFinite(saved)?this.clampDrawerWidth(saved,reasonableMin,frame):reasonableMin;
    this.setData(frame,'dkdsMobileContentMinWidth',String(Math.round(reasonableMin)));
    this.setStyle(frame,'width',`${Math.round(width)}px`);
    this.syncDrawerSafeExtent(frame);
    this.setData(frame,'dkdsMobileDrawerFitted','true');this.setStyle(frame,'visibility','');
  }
  scheduleDrawerFit(frame,surfaceId='',storageScope=''){
    if(!frame)return;const prior=this.drawerFitFrames.get(frame);if(prior)try{(globalThis.cancelAnimationFrame||clearTimeout)(prior);}catch{}
    const raf=(globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16)))(()=>{this.drawerFitFrames.delete(frame);this.fitDrawerToContent(frame,surfaceId,storageScope);});this.drawerFitFrames.set(frame,raf);
  }
  restoreDrawerWidth(frame,surfaceId='',storageScope=''){
    if(!frame)return;const saved=this.savedDrawerWidth(surfaceId,storageScope),bounds=this.drawerBounds(frame);
    // v20 invalidates widths saved before the physical safe-area wrapper and corrected single-row parameter-header geometry contract.
    // Saved width is only a user preference: the current Unit tree recomputes its
    // live minimum before the preference is clamped.
    // First paint remains hidden until the resolved width has been committed.
    this.setStyle(frame,'width',`${Math.round(Number.isFinite(saved)?this.clampDrawerWidth(saved,bounds.base,frame):bounds.base)}px`);
    this.setStyle(frame,'visibility','hidden');this.setData(frame,'dkdsMobileDrawerFitted','false');this.scheduleDrawerFit(frame,surfaceId,storageScope);
  }
  persistDrawerWidth(frame,surfaceId='',storageScope=''){
    const width=Math.round(frame?.getBoundingClientRect?.().width||0),min=this.drawerContentMin(frame);if(width>0)try{localStorage.setItem(this.drawerStorageKey(surfaceId,storageScope),String(this.clampDrawerWidth(width,min,frame)));}catch{}
  }
  installDrawerHandle(frame,surfaceId='',storageScope=''){
    if(!frame)return;const existing=frame.querySelector?.(':scope > .dkds-mobile-drawer-resize-handle');if(existing)return;
    const handle=document.createElement('div');handle.className='dkds-mobile-drawer-resize-handle';handle.dataset.dkdsMobileDrawerResize='true';handle.dataset.dkdsTouchGestureOwner='drawer-resize';handle.setAttribute?.('role','separator');handle.setAttribute?.('aria-orientation','vertical');handle.setAttribute?.('aria-label','拖动调整参数面板宽度');handle.tabIndex=0;
    const grip=document.createElement('span');grip.className='dkds-mobile-drawer-resize-grip';grip.setAttribute?.('aria-hidden','true');handle.append?.(grip);frame.append?.(handle);
    if(typeof handle.addEventListener!=='function'){if(frame.style)this.restoreDrawerWidth(frame,surfaceId,storageScope);return;}
    let pointerDrag=null;
    const point=event=>{const x=Number(event?.clientX);return Number.isFinite(x)?x:null;};
    const rafRequest=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16)),rafCancel=globalThis.cancelAnimationFrame||clearTimeout;
    const applyPending=()=>{const drag=pointerDrag;if(!drag)return;drag.raf=0;const width=Math.max(drag.min,Math.min(drag.max,Number(drag.pendingWidth)||drag.min));drag.appliedWidth=width;this.setStyle(frame,'width',`${Math.round(width)}px`);};
    const begin=(x,id=null)=>{if(x===null||pointerDrag)return false;const bounds=this.drawerBounds(frame),min=Math.max(bounds.base,Math.min(bounds.max,this.drawerContentMin(frame))),startWidth=Math.max(min,Math.min(bounds.max,Number(frame.getBoundingClientRect().width)||min));pointerDrag={id,startX:x,startWidth,min,max:bounds.max,pendingWidth:startWidth,appliedWidth:startWidth,raf:0};handle.classList.add('is-dragging');return true;};
    const move=x=>{if(!pointerDrag||x===null)return;pointerDrag.pendingWidth=Math.max(pointerDrag.min,Math.min(pointerDrag.max,pointerDrag.startWidth+(x-pointerDrag.startX)));if(!pointerDrag.raf)pointerDrag.raf=rafRequest(applyPending);};
    const end=()=>{const drag=pointerDrag;if(!drag)return;if(drag.raf){try{rafCancel(drag.raf);}catch{}drag.raf=0;}applyPending();pointerDrag=null;handle.classList.remove('is-dragging');this.reflowMeasuredUnits(frame);this.persistDrawerWidth(frame,surfaceId,storageScope);};
    const pointerDown=event=>{if(event.button!==undefined&&event.button!==0)return;const x=point(event);if(!begin(x,event.pointerId))return;event.preventDefault?.();event.stopPropagation?.();try{handle.setPointerCapture?.(event.pointerId);}catch{}};
    const pointerMove=event=>{if(!pointerDrag||pointerDrag.id!==event.pointerId)return;event.preventDefault?.();event.stopPropagation?.();move(point(event));};
    const pointerFinish=event=>{if(!pointerDrag||(event?.pointerId!==undefined&&pointerDrag.id!==event.pointerId))return;const id=pointerDrag.id;end();try{handle.releasePointerCapture?.(id);}catch{}};
    const win=globalThis.window;handle.addEventListener('pointerdown',pointerDown);win?.addEventListener?.('pointermove',pointerMove,{passive:false});win?.addEventListener?.('pointerup',pointerFinish);win?.addEventListener?.('pointercancel',pointerFinish);
    const touchCleanup=NativeTouchDrag.bind(handle,{
      onStart(p){return begin(p.clientX,'touch')?{}:false;},
      onMove(p){if(pointerDrag?.id==='touch')move(p.clientX);},
      onEnd(){if(pointerDrag?.id==='touch')end();},onCancel(){if(pointerDrag?.id==='touch')end();}
    });
    handle.__dkdsTouchResizeCleanup=()=>{touchCleanup?.();handle.removeEventListener('pointerdown',pointerDown);win?.removeEventListener?.('pointermove',pointerMove);win?.removeEventListener?.('pointerup',pointerFinish);win?.removeEventListener?.('pointercancel',pointerFinish);};
    handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();const current=frame.getBoundingClientRect().width,next=event.key==='Home'?this.drawerContentMin(frame):current+(event.key==='ArrowRight'?18:-18);this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(next,this.drawerContentMin(frame),frame))}px`);this.reflowMeasuredUnits(frame);this.persistDrawerWidth(frame,surfaceId,storageScope);});
    this.restoreDrawerWidth(frame,surfaceId,storageScope);
  }


  installDrawerConstraintListener(frame,surfaceId='',storageScope=''){
    if(!frame||frame.__dkdsMobileDrawerConstraintCleanup)return;
    const onConstraint=()=>this.scheduleDrawerFit(frame,surfaceId,storageScope);
    frame.addEventListener?.(GEOMETRY_CONSTRAINT_EVENTS.inline,onConstraint);frame.addEventListener?.(GEOMETRY_CONSTRAINT_EVENTS.block,onConstraint);
    let resize=null,mutation=null;const observed=new Set();
    const observe=()=>{if(!resize)return;const content=this.drawerContentNode(frame),rows=[content,...(content?.querySelectorAll?.('[data-dkds-unit-template]')||[])];let count=0;for(const node of rows){if(!node||observed.has(node)||count>=256)continue;try{resize.observe(node);observed.add(node);count+=1;}catch{}}};
    if(globalThis.ResizeObserver){try{resize=new ResizeObserver(onConstraint);observe();}catch{resize=null;}}
    if(globalThis.MutationObserver){try{mutation=new MutationObserver(()=>{observe();onConstraint();});mutation.observe(this.drawerContentHost(frame)||frame,{childList:true,subtree:true,characterData:true});}catch{mutation=null;}}
    frame.__dkdsMobileDrawerConstraintCleanup=()=>{frame.removeEventListener?.(GEOMETRY_CONSTRAINT_EVENTS.inline,onConstraint);frame.removeEventListener?.(GEOMETRY_CONSTRAINT_EVENTS.block,onConstraint);try{mutation?.disconnect?.();}catch{}try{resize?.disconnect?.();}catch{}observed.clear();};
  }
  releaseDrawerConstraintListener(frame){try{frame?.__dkdsMobileDrawerConstraintCleanup?.();}catch{}if(frame)delete frame.__dkdsMobileDrawerConstraintCleanup;}

  /* Companion outer geometry is intentionally absent from Presenter runtime.
     SplitController owns the workspace/user preference, native workspace CSS
     bounds that preference against the live viewport, and Unit content adapts
     inside the allocated lane. No child measurement or observer is allowed to
     feed back into right/bottom track allocation. */
  materialRoleForRegion(region='',purpose=''){
    if(region==='drawer'&&text(purpose)==='parameters')return 'popover';
    if(region==='drawer'||region==='companion-right')return 'sidebar';
    if(region==='sheet')return 'floating';
    if(region==='companion-bottom')return 'surface';
    return 'surface';
  }
  applyFrameMaterial(frame,region='',purpose=''){
    if(!frame)return;
    const role=this.materialRoleForRegion(region,purpose);
    try{window.DKDSMaterialSurface?.apply?.(frame,role);}catch{
      for(const cls of ['chrome','sidebar','surface','elevated','popover','control','floating'].map(value=>`dkds-material-role-${value}`))frame.classList?.remove?.(cls);
      frame.classList?.add?.(`dkds-material-role-${role}`);
      frame.dataset.dkdsMaterialSurface='core';
    }
  }
  refreshProjectedMaterial(frame){
    if(!frame)return;
    // Reparenting can change the nearest semantic Material context. Re-run the
    // canonical renderer after the live plugin node is inside its Mobile frame
    // so the first projected paint consumes the active theme deterministically
    // instead of waiting for a later mutation/observer pass.
    try{window.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(frame);}catch{}
  }
  createFrame(region,surfaceId='',purpose='',presentationRole='',storageScope=''){
    if(typeof document?.createElement!=='function')return null;
    const frame=document.createElement('div');frame.className='dkds-mobile-surface-frame';
    frame.dataset.dkdsMobileFrame='true';frame.dataset.dkdsMobileFrameRegion=region;frame.dataset.dkdsMobileActive='true';frame.dataset.dkdsMobileSurfaceId=text(surfaceId);if(text(purpose))frame.dataset.dkdsPresentationPurpose=text(purpose);if(text(presentationRole))frame.dataset.dkdsPresentationRole=text(presentationRole);
    this.applyFrameMaterial(frame,region,purpose);
    if(region==='drawer'){this.ensureDrawerContentHost(frame);this.setToken(frame,'--dkds-mobile-parameter-safe-inset',`${Math.max(0,Number(BASE_METRICS?.surface?.parameterPrimeInsetPx)||6)}px`);this.installDrawerHandle(frame,surfaceId,storageScope);this.installDrawerConstraintListener(frame,surfaceId,storageScope);}
    return frame;
  }
  restoreNode(node){
    const saved=this.projectedNodes.get(node);if(!saved)return;
    const parent=saved.parent,frame=saved.frame;
    this.releaseProjectionDetachObserver(frame);
    const detachedFromProjection=!!(frame&&node&&!frame.contains?.(node));
    const parked=detachedFromProjection&&!!(node.classList?.contains?.('dkds-prime-hidden')||node.parentElement?.closest?.('.dkds-analysis-parking'));
    const externallyPlaced=detachedFromProjection&&this.portableOwnsPlacement(node);
    // If another Core lifecycle has already moved the node out of our projection
    // frame, this Presenter no longer owns reparenting. PRIME close parks the
    // node in .dkds-analysis-parking; PortableView may also move it to a dock or
    // float layer. Re-inserting either node into saved.parent resurrected closed
    // panels and left phantom companion lanes. Parking may safely recover the
    // pre-projection inline geometry, but its DOM parent must remain untouched.
    if(parked)this.restoreInline(node,saved.inline);
    else if(!detachedFromProjection&&!externallyPlaced){
      this.restoreInline(node,saved.inline);
      if(parent?.isConnected){
        const next=saved.next?.parentNode===parent?saved.next:null;
        try{parent.insertBefore(node,next);}catch{try{parent.append(node);}catch{}}
      }else if(frame?.parentNode){
        try{frame.parentNode.insertBefore(node,frame);}catch{}
      }
    }
    try{frame?.querySelector?.(':scope > .dkds-mobile-drawer-resize-handle')?.__dkdsTouchResizeCleanup?.();}catch{}
    const fitFrame=this.drawerFitFrames.get(frame);if(fitFrame)try{(globalThis.cancelAnimationFrame||clearTimeout)(fitFrame);}catch{}this.drawerFitFrames.delete(frame);if(frame?.dataset)frame.dataset.dkdsMobileActive='false';this.releaseDrawerConstraintListener(frame);
    if(node?.dataset?.dkdsMaterialContentOwner==='mobile-presentation'){delete node.dataset.dkdsMaterialContent;delete node.dataset.dkdsMaterialContentOwner;}
    if(node?.dataset)delete node.dataset.dkdsMobileParameterInsetHandoff;
    try{window.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(node);}catch{}
    try{frame?.remove?.();}catch{try{frame?.parentNode?.removeChild?.(frame);}catch{}}
    this.projectedNodes.delete(node);
    parent?.closest?.('.dkds-managed-grid')?.__dkdsGridController?.apply?.();
  }
  restoreAll(){for(const node of [...this.projectedNodes.keys()])this.restoreNode(node);}
  projectNode(node,target,region,surfaceId='',purpose='',presentationRole='',storageScope=''){
    if(!node||!target)return;
    let saved=this.projectedNodes.get(node);
    if(!saved){
      saved={parent:node.parentNode,next:node.nextSibling,inline:this.captureInline(node),frame:null,target:null,region:'',purpose:'',presentationRole:'',surfaceId:''};
      const frame=this.createFrame(region,surfaceId,purpose,presentationRole,storageScope);
      saved.frame=frame;this.projectedNodes.set(node,saved);
      if(frame){
        try{target.append(frame);this.syncFrameContentHost(frame,node,region);saved.parent?.closest?.('.dkds-managed-grid')?.__dkdsGridController?.apply?.();}catch{}
      }else if(node.parentNode!==target){try{target.append(node);}catch{}}
    }else if(saved.frame&&saved.frame.parentNode!==target){try{target.append(saved.frame);}catch{}}
    else if(!saved.frame&&node.parentNode!==target){try{target.append(node);}catch{}}
    const regionChanged=saved.region!==region||saved.normalized!==true;saved.target=target;saved.region=region;saved.purpose=text(purpose);saved.presentationRole=text(presentationRole);saved.surfaceId=text(surfaceId);
    if(regionChanged&&(region==='companion-right'||region==='companion-bottom')){
      // Companion slots/frames are geometry shells, never scroll owners. Clear any
      // stale offsets left by an older projection contract without touching the
      // Unit's own internal scroll body (Inspector/Group content keeps its state).
      try{target.scrollLeft=0;target.scrollTop=0;}catch{}try{saved.frame.scrollLeft=0;saved.frame.scrollTop=0;}catch{}
    }
    if(node?.dataset){node.dataset.dkdsMaterialContent='true';node.dataset.dkdsMaterialContentOwner='mobile-presentation';}
    if(saved.frame){this.setData(saved.frame,'dkdsMobileFrameRegion',region);this.setData(saved.frame,'dkdsMobileActive','true');this.setData(saved.frame,'dkdsMobileSurfaceId',surfaceId);this.setData(saved.frame,'dkdsMobileSurfaceSizing',text(node?.dataset?.dkdsPortableSizing||'content'));if(text(purpose))this.setData(saved.frame,'dkdsPresentationPurpose',purpose);if(text(presentationRole))this.setData(saved.frame,'dkdsPresentationRole',presentationRole);this.syncFrameContentHost(saved.frame,node,region);this.applyFrameMaterial(saved.frame,region,purpose);this.refreshProjectedMaterial(saved.frame);if(region==='drawer'){this.installDrawerHandle(saved.frame,surfaceId,storageScope);this.installDrawerConstraintListener(saved.frame,surfaceId,storageScope);this.scheduleDrawerFit(saved.frame,surfaceId,storageScope);}}
    // Projection outer geometry is a live Presenter invariant, not a one-time
    // mount normalization. Idempotent StyleGate writes are cheap and prevent a
    // later Unit/Portable lifecycle from restoring Desktop/intrinsic root size.
    this.normalizeProjectedNode(node,region,purpose);saved.normalized=true;
    if(saved.frame)this.installProjectionDetachObserver(saved.frame,node);
    if(region==='drawer')this.syncDrawerSafeExtent(saved.frame);
  }
  applySignature(snapshot,workspace,activityId){
    const viewport=snapshot?.viewport||{},layout=snapshot?.layout||{};
    const surfaces=(workspace?.surfaces||[]).map(surface=>[
      text(surface.surfaceId||surface.id),surface.active===true?'1':'0',text(surface.kind),text(surface.role||surface.presentationRole),
      text(surface.presentation?.region),text(surface.presentation?.navigation),text(surface.presentationPurpose||surface.presentation?.purpose)
    ].join(':')).join('|');
    return [text(activityId),text(layout.profile),Number(viewport.width)||0,Number(viewport.height)||0,workspace?.presentationComplete===true?'1':'0',surfaces].join('~');
  }
  projectionStillValid(workspace,activityId,root){
    if(!root||root!==this.activeRoot)return false;
    const slots={right:root.querySelector?.('[data-plugin-canvas-slot="right"]'),bottom:root.querySelector?.('[data-plugin-canvas-slot="bottom"]'),overlay:root.querySelector?.('[data-plugin-canvas-slot="overlay"]')};
    for(const surface of workspace?.surfaces||[]){
      const surfaceId=text(surface.surfaceId||surface.id);if(!surfaceId)continue;
      const node=document.querySelector?.(`[data-dkds-workspace-activity="${esc(activityId)}"][data-dkds-workspace-surface-id="${esc(surfaceId)}"]`);if(!node||!this.decoratedNodes.has(node))return false;
      const region=text(surface.presentation?.region||'route');
      if(this.portableOwnsPlacement(node)){if(this.projectedNodes.has(node))return false;continue;}
      if(surface.active&&['companion-right','companion-bottom','drawer','sheet'].includes(region)){
        const target=region==='companion-right'?slots.right:region==='companion-bottom'?slots.bottom:slots.overlay,saved=this.projectedNodes.get(node);
        if(!target||!saved?.frame?.isConnected||saved.frame.parentNode!==target||saved.region!==region||!saved.frame.contains?.(node))return false;
      }
    }
    return true;
  }
  clear(){
    if(typeof document==='undefined')return;
    dismissAllContextMenus();
    this.restoreAll();
    for(const node of this.decoratedNodes)this.clearNodeData(node);
    this.decoratedNodes.clear();
    if(this.activeRoot)this.clearRootData(this.activeRoot);
    this.activeRoot=null;
    this.activeActivity='';this.lastApplySignature='';
  }
  apply(snapshot={}){
    if(typeof document==='undefined')return {mode:'none',activityId:'',projected:0};
    // This module is bundled into every renderer, including Electron Desktop.
    // Mobile projection is therefore hard-gated at the mutation boundary, not
    // merely at the Mobile Host caller. A Desktop renderer must never receive
    // projection wrappers, reparented plugin nodes or Mobile semantic data.
    if(!this.isMobileDocument()){
      if(this.projectedNodes.size||this.decoratedNodes.size||this.activeRoot||this.activeActivity)this.clear();
      return {mode:'desktop-inert',activityId:'',projected:0};
    }
    const desiredProjected=new Set(),desiredDecorated=new Set();
    const activityId=text(snapshot.activityId||snapshot.route?.activityId),workspace=(snapshot.workspaces||[]).find(row=>text(row.activityId)===activityId)||null;
    const root=activityId?document.querySelector(`[data-dkds-workspace-activity="${esc(activityId)}"]`):null;
    const semantic=!!root&&workspace?.presentationComplete===true,mode=semantic?'semantic':'invalid',signature=this.applySignature(snapshot,workspace,activityId);
    if(semantic&&signature===this.lastApplySignature&&this.projectionStillValid(workspace,activityId,root))return {mode:'stable',activityId,projected:this.projectedNodes.size};
    if(signature!==this.lastApplySignature)dismissAllContextMenus();
    if(this.activeRoot&&this.activeRoot!==root)this.clearRootData(this.activeRoot);
    this.activeRoot=root||null;
    const canvasSlots=root?{
      right:root.querySelector('[data-plugin-canvas-slot="right"]'),
      bottom:root.querySelector('[data-plugin-canvas-slot="bottom"]'),
      overlay:root.querySelector('[data-plugin-canvas-slot="overlay"]')
    }:{};
    if(root){
      this.setData(root,'dkdsMobilePresentation',mode);
      this.setData(root,'dkdsMobileLayout',snapshot.layout?.profile||'compact');
      this.setData(root,'dkdsMobileOrientation',snapshot.layout?.orientation||snapshot.orientation||'portrait');
      const activeSurfaces=(workspace?.surfaces||[]).filter(surface=>surface.active);
      this.setData(root,'dkdsMobileCompanionRight',activeSurfaces.some(surface=>this.semanticLaneActive(activityId,surface,'companion-right'))?'true':'false');
      this.setData(root,'dkdsMobileCompanionBottom',activeSurfaces.some(surface=>this.semanticLaneActive(activityId,surface,'companion-bottom'))?'true':'false');
      this.setData(root,'dkdsMobileDrawerOpen',activeSurfaces.some(surface=>text(surface.presentation?.region)==='drawer')?'true':'false');
    }
    let projected=0;
    if(semantic){
      for(const surface of workspace.surfaces||[]){
        const surfaceId=text(surface.surfaceId||surface.id);if(!surfaceId)continue;
        const selector=`[data-dkds-workspace-activity="${esc(activityId)}"][data-dkds-workspace-surface-id="${esc(surfaceId)}"]`;
        const node=document.querySelector(selector);if(!node)continue;
        const region=text(surface.presentation?.region||'route'),portableOwned=this.portableOwnsPlacement(node),effectiveRegion=portableOwned?'portable':region;desiredDecorated.add(node);
        this.setData(node,'dkdsMobileRegion',effectiveRegion);this.setData(node,'dkdsMobileRole',surface.role);this.setData(node,'dkdsMobileNavigation',surface.presentation?.navigation);this.setData(node,'dkdsMobileActive',surface.active?'true':'false');
        // Projection shells own semantic home geometry only. Once a PortableView
        // becomes floating/global/bottom-shelf, the PortableView is the geometry
        // owner and the Presenter must leave that live node alone.
        if(!portableOwned&&surface.active&&['companion-right','companion-bottom','drawer','sheet'].includes(region)){
          const target=region==='companion-right'?canvasSlots.right:region==='companion-bottom'?canvasSlots.bottom:(region==='drawer'||region==='sheet')?canvasSlots.overlay:null;
          if(target){desiredProjected.add(node);this.projectNode(node,target,region,surfaceId,surface.presentationPurpose||surface.presentation?.purpose||'',surface.role||surface.presentationRole||'',`${activityId}:${surfaceId}`);}
        }
        projected++;
      }
    }
    for(const node of [...this.projectedNodes.keys()])if(!desiredProjected.has(node))this.restoreNode(node);
    for(const node of [...this.decoratedNodes])if(!desiredDecorated.has(node)){this.clearNodeData(node);this.decoratedNodes.delete(node);}
    for(const node of desiredDecorated)this.decoratedNodes.add(node);
    this.activeActivity=activityId;this.lastApplySignature=signature;
    return {mode,activityId,projected};
  }
}

const instance=new MobileWebSurfacePresenter();
const api=Object.freeze({version:'1.6.0',MobileWebSurfacePresenter,apply:snapshot=>instance.apply(snapshot),clear:()=>instance.clear(),releasePortable:node=>{if(instance.portableOwnsPlacement(node)&&instance.projectedNodes.has(node)){instance.restoreNode(node);return true;}return false;}});
if(typeof window!=='undefined')window.DKDSMobileWebPresentation=api;
module.exports=api;
