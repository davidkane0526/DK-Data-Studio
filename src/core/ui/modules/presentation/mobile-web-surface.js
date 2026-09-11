'use strict';
const StyleGate=require('ui/style-ownership-gate');
const STYLE_SOURCE='src/core/ui/modules/presentation/mobile-web-surface.js';
const mobileSurfaceSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.mobile-web-surface',scope:'runtime-mobile-presentation',source:STYLE_SOURCE});

const PlatformBoundary=require('../../../host/platform-boundary');
const NativeTouchDrag=require('../../../host/native-touch-drag');
const text=value=>String(value??'');
const esc=value=>{
  const raw=text(value);
  if(globalThis.CSS?.escape)return globalThis.CSS.escape(raw);
  return raw.replace(/[^a-zA-Z0-9_-]/g,ch=>`\\${ch.codePointAt(0).toString(16)} `);
};
const PROJECTION_STYLE=Object.freeze([
  'display','flex-direction','position','left','right','top','bottom','inset','width','height','min-width','min-height','max-width','max-height','transform','box-sizing','overflow','overflow-x','overflow-y','resize'
]);

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
    if((semanticRole==='inspector'||semanticRole==='scientific-secondary')&&placementSource!=='user')return false;
    const placement=text(node.dataset?.placement||'home').toLowerCase();
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
    if(next)mobileSurfaceSet(node,property,next);else StyleGate.remove(node,property,{owner:'core.mobile-web-surface',scope:'runtime-mobile-presentation',source:STYLE_SOURCE});
    return true;
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
      if(row?.value)mobileSurfaceSet(node,prop,row.value);else StyleGate.remove(node,prop,{owner:'core.mobile-web-surface',scope:'runtime-mobile-presentation',source:STYLE_SOURCE});
    }
  }
  normalizeProjectedNode(node,region){
    const style=node?.style;if(!style?.setProperty)return;
    const drawer=region==='drawer',overlay=drawer||region==='sheet';
    const plot=node.classList?.contains('dkds-plot-view');
    const values={
      ...(plot?{display:'flex','flex-direction':'column'}:{}),
      position:'relative',left:'auto',right:'auto',top:'auto',bottom:'auto',inset:'auto',width:'100%',
      height:'100%','min-width':'0','min-height':'0','max-width':'none','max-height':'none',transform:'none','box-sizing':'border-box',
      overflow:drawer?'hidden auto':overlay?'auto':'visible','overflow-x':drawer?'hidden':overlay?'auto':'visible','overflow-y':overlay?'auto':'visible',resize:overlay?'none':''
    };
    for(const [prop,value] of Object.entries(values))this.setStyle(node,prop,value);
  }
  drawerStorageKey(surfaceId=''){return `dkds.mobile.drawer-width.v2.${text(surfaceId)||'parameters'}`;}
  drawerBounds(){
    const viewport=Math.max(0,Number(globalThis.window?.innerWidth)||Number(globalThis.innerWidth)||320),hardMax=Math.max(280,viewport-12);
    const min=Math.min(320,Math.max(280,viewport-20));
    const autoMax=Math.max(min,Math.min(480,hardMax,viewport*.78));
    // Content-fit normally stays compact, but a genuinely width-critical control
    // may use the remaining viewport instead of being clipped by the old 88vw cap.
    // The solver still grows only by measured overflow, so this is a ceiling rather
    // than a greedy target width.
    const max=Math.max(autoMax,Math.min(680,hardMax));
    return {min,autoMax,max};
  }
  drawerContentMin(frame){const raw=Number(frame?.dataset?.dkdsMobileContentMinWidth);return Number.isFinite(raw)&&raw>0?raw:this.drawerBounds().min;}
  savedDrawerWidth(surfaceId=''){try{const raw=localStorage.getItem(this.drawerStorageKey(surfaceId));if(raw===null||String(raw).trim()==='')return NaN;const value=Number(raw);return Number.isFinite(value)?value:NaN;}catch{return NaN;}}
  clampDrawerWidth(value){const bounds=this.drawerBounds(),n=Number(value);return Math.max(bounds.min,Math.min(bounds.max,Number.isFinite(n)?n:bounds.min));}
  intentionalHorizontalScroll(node){
    if(!node||node===node?.ownerDocument?.documentElement)return false;
    if(node.matches?.('[data-dkds-horizontal-scroll],.table-wrap,.table-scroll,.data-table-scroll,.dkds-table-wrap'))return true;
    const overflow=text(node.style?.overflowX).trim().toLowerCase();return overflow==='auto'||overflow==='scroll';
  }
  drawerContentNode(frame){return [...frame?.children||[]].find(node=>!node?.classList?.contains('dkds-mobile-drawer-resize-handle'))||null;}
  measureDrawerOverflow(frame){
    const content=this.drawerContentNode(frame);if(!content)return 0;
    const critical='input,select,textarea,button,.schema-parameter-panel,.dkds-action-row,.dkds-toolbar,[data-dkds-mobile-width-critical]';
    let overflow=0;
    const frameRect=frame?.getBoundingClientRect?.(),contentRect=content.getBoundingClientRect?.();
    const boundary=frameRect&&Number.isFinite(frameRect.left)&&Number.isFinite(frameRect.right)?frameRect:contentRect;
    const nodes=content.querySelectorAll?.(critical)||[];
    for(const node of nodes){
      if(this.intentionalHorizontalScroll(node)||node?.classList?.contains('hidden')||node?.hidden)continue;
      const rect=node.getBoundingClientRect?.();
      if(boundary&&rect&&Number.isFinite(rect.left)&&Number.isFinite(rect.right)&&Number.isFinite(boundary.left)&&Number.isFinite(boundary.right)){
        overflow=Math.max(overflow,rect.right-boundary.right,boundary.left-rect.left);
      }
      // Geometry alone cannot detect text/content clipped inside a button or
      // field. Measure intrinsic overflow as well, otherwise Vg / long actions
      // can be visually truncated while their border box still fits the drawer.
      const client=Number(node.clientWidth)||0,scroll=Number(node.scrollWidth)||0;
      if(client>0&&scroll>client+2)overflow=Math.max(overflow,scroll-client);
    }
    return Math.max(0,overflow);
  }
  solveCompactDrawerWidth(frame){
    const bounds=this.drawerBounds();let target=bounds.min;
    for(let pass=0;pass<8;pass+=1){
      mobileSurfaceSet(frame,'width',`${Math.round(target)}px`);
      const overflow=this.measureDrawerOverflow(frame);
      if(!(overflow>2))break;
      const next=Math.min(bounds.max,Math.ceil(target+overflow+8));
      if(next<=target+1)break;target=next;
    }
    return Math.max(bounds.min,Math.min(bounds.max,Math.ceil(target)));
  }
  fitDrawerToContent(frame,surfaceId=''){
    if(!frame?.isConnected)return;
    const saved=this.savedDrawerWidth(surfaceId);
    if(Number.isFinite(saved)){
      this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(saved))}px`);
      this.setData(frame,'dkdsMobileDrawerFitted','true');this.setStyle(frame,'visibility','');return;
    }
    const contentMin=this.solveCompactDrawerWidth(frame);
    this.setData(frame,'dkdsMobileContentMinWidth',String(contentMin));
    this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(contentMin))}px`);
    this.setData(frame,'dkdsMobileDrawerFitted','true');this.setStyle(frame,'visibility','');
  }
  scheduleDrawerFit(frame,surfaceId=''){
    if(!frame)return;const prior=this.drawerFitFrames.get(frame);if(prior)try{(globalThis.cancelAnimationFrame||clearTimeout)(prior);}catch{}
    const raf=(globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16)))(()=>{this.drawerFitFrames.delete(frame);this.fitDrawerToContent(frame,surfaceId);});this.drawerFitFrames.set(frame,raf);
  }
  restoreDrawerWidth(frame,surfaceId=''){
    if(!frame)return;const saved=this.savedDrawerWidth(surfaceId);
    if(Number.isFinite(saved)){
      this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(saved))}px`);this.setData(frame,'dkdsMobileDrawerFitted','true');this.setStyle(frame,'visibility','');
      return;
    }
    // First-open content-fit runs while the frame is paint-hidden. That removes
    // the visible narrow->wide resize jump that previously looked like a drawer
    // repaint/re-layout flash on native Mobile.
    this.setStyle(frame,'width',`${Math.round(this.drawerBounds().min)}px`);this.setStyle(frame,'visibility','hidden');this.setData(frame,'dkdsMobileDrawerFitted','false');
    this.scheduleDrawerFit(frame,surfaceId);
  }
  persistDrawerWidth(frame,surfaceId=''){
    const width=Math.round(frame?.getBoundingClientRect?.().width||0);if(width>0)try{localStorage.setItem(this.drawerStorageKey(surfaceId),String(this.clampDrawerWidth(width)));}catch{}
  }
  installDrawerHandle(frame,surfaceId=''){
    if(!frame)return;const existing=frame.querySelector?.(':scope > .dkds-mobile-drawer-resize-handle');if(existing)return;
    const handle=document.createElement('div');handle.className='dkds-mobile-drawer-resize-handle';handle.dataset.dkdsMobileDrawerResize='true';handle.dataset.dkdsTouchGestureOwner='drawer-resize';handle.setAttribute?.('role','separator');handle.setAttribute?.('aria-orientation','vertical');handle.setAttribute?.('aria-label','拖动调整参数面板宽度');handle.tabIndex=0;
    const grip=document.createElement('span');grip.className='dkds-mobile-drawer-resize-grip';grip.setAttribute?.('aria-hidden','true');handle.append?.(grip);frame.append?.(handle);
    if(typeof handle.addEventListener!=='function'){if(frame.style)this.restoreDrawerWidth(frame,surfaceId);return;}
    let pointerDrag=null;
    const point=event=>{const x=Number(event?.clientX);return Number.isFinite(x)?x:null;};
    const begin=(x,id=null)=>{if(x===null||pointerDrag)return false;pointerDrag={id,startX:x,startWidth:frame.getBoundingClientRect().width};handle.classList.add('is-dragging');return true;};
    const move=x=>{if(!pointerDrag||x===null)return;this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(pointerDrag.startWidth+(x-pointerDrag.startX)))}px`);};
    const end=()=>{if(!pointerDrag)return;pointerDrag=null;handle.classList.remove('is-dragging');this.persistDrawerWidth(frame,surfaceId);};
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
    handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();const current=frame.getBoundingClientRect().width,next=event.key==='Home'?this.drawerContentMin(frame):current+(event.key==='ArrowRight'?18:-18);this.setStyle(frame,'width',`${Math.round(this.clampDrawerWidth(next))}px`);this.persistDrawerWidth(frame,surfaceId);});
    this.restoreDrawerWidth(frame,surfaceId);
  }
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
  createFrame(region,surfaceId='',purpose='',presentationRole=''){
    if(typeof document?.createElement!=='function')return null;
    const frame=document.createElement('div');frame.className='dkds-mobile-surface-frame';
    frame.dataset.dkdsMobileFrame='true';frame.dataset.dkdsMobileFrameRegion=region;frame.dataset.dkdsMobileActive='true';frame.dataset.dkdsMobileSurfaceId=text(surfaceId);if(text(purpose))frame.dataset.dkdsPresentationPurpose=text(purpose);if(text(presentationRole))frame.dataset.dkdsPresentationRole=text(presentationRole);
    this.applyFrameMaterial(frame,region,purpose);
    if(region==='drawer')this.installDrawerHandle(frame,surfaceId);
    return frame;
  }
  restoreNode(node){
    const saved=this.projectedNodes.get(node);if(!saved)return;
    const parent=saved.parent,frame=saved.frame;
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
    const fitFrame=this.drawerFitFrames.get(frame);if(fitFrame)try{(globalThis.cancelAnimationFrame||clearTimeout)(fitFrame);}catch{}this.drawerFitFrames.delete(frame);
    if(node?.dataset?.dkdsMaterialContentOwner==='mobile-presentation'){delete node.dataset.dkdsMaterialContent;delete node.dataset.dkdsMaterialContentOwner;}
    try{window.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(node);}catch{}
    try{frame?.remove?.();}catch{try{frame?.parentNode?.removeChild?.(frame);}catch{}}
    this.projectedNodes.delete(node);
    parent?.closest?.('.dkds-managed-grid')?.__dkdsGridController?.apply?.();
  }
  restoreAll(){for(const node of [...this.projectedNodes.keys()])this.restoreNode(node);}
  projectNode(node,target,region,surfaceId='',purpose='',presentationRole=''){
    if(!node||!target)return;
    let saved=this.projectedNodes.get(node);
    if(!saved){
      saved={parent:node.parentNode,next:node.nextSibling,inline:this.captureInline(node),frame:null,target:null,region:''};
      const frame=this.createFrame(region,surfaceId,purpose,presentationRole);
      saved.frame=frame;this.projectedNodes.set(node,saved);
      if(frame){
        try{target.append(frame);frame.append(node);saved.parent?.closest?.('.dkds-managed-grid')?.__dkdsGridController?.apply?.();}catch{}
      }else if(node.parentNode!==target){try{target.append(node);}catch{}}
    }else if(saved.frame&&saved.frame.parentNode!==target){try{target.append(saved.frame);}catch{}}
    else if(!saved.frame&&node.parentNode!==target){try{target.append(node);}catch{}}
    const regionChanged=saved.region!==region||saved.normalized!==true;saved.target=target;saved.region=region;
    if(node?.dataset){node.dataset.dkdsMaterialContent='true';node.dataset.dkdsMaterialContentOwner='mobile-presentation';}
    if(saved.frame){this.setData(saved.frame,'dkdsMobileFrameRegion',region);this.setData(saved.frame,'dkdsMobileActive','true');this.setData(saved.frame,'dkdsMobileSurfaceId',surfaceId);if(text(purpose))this.setData(saved.frame,'dkdsPresentationPurpose',purpose);if(text(presentationRole))this.setData(saved.frame,'dkdsPresentationRole',presentationRole);this.applyFrameMaterial(saved.frame,region,purpose);this.refreshProjectedMaterial(saved.frame);if(region==='drawer')this.installDrawerHandle(saved.frame,surfaceId);}
    if(regionChanged){this.normalizeProjectedNode(node,region);saved.normalized=true;}
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
        if(!target||!saved?.frame?.isConnected||saved.frame.parentNode!==target||saved.region!==region)return false;
      }
    }
    return true;
  }
  clear(){
    if(typeof document==='undefined')return;
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
          if(target){desiredProjected.add(node);this.projectNode(node,target,region,surfaceId,surface.presentationPurpose||surface.presentation?.purpose||'',surface.role||surface.presentationRole||'');}
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
