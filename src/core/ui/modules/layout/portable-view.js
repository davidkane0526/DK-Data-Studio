'use strict';
const {hostState, esc, resolveElement, resolveScopedElement, cleanupCall, readJson, writeJson}=require('../foundation/shortcuts');
const {ContextMenu}=require('../interaction/context-actions');
const {normalizePlacement, refreshDockZoneState}=require('./docking');
const StyleGate=require('ui/style-ownership-gate');
const STYLE_SOURCE='src/core/ui/modules/layout/portable-view.js';
const portableSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.portable-view',scope:'runtime-portable-geometry',source:STYLE_SOURCE});
const portableToken=(el,property,value)=>StyleGate.setToken(el,property,value,{owner:'core.portable-view',scope:'runtime-portable-token',source:STYLE_SOURCE});
const portableRemove=(el,property)=>StyleGate.remove(el,property,{owner:'core.portable-view',scope:property.startsWith('--')?'runtime-portable-token':'runtime-portable-geometry',kind:property.startsWith('--')?StyleGate.KINDS.CONFIG_TOKEN:StyleGate.KINDS.RUNTIME_INLINE,source:STYLE_SOURCE});

const PORTABLE_SEMANTIC_KINDS=new Set(['panel','inspector']);

  class PortableView {
    constructor(scope,id,node,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id);this.node=resolveElement(node);this.spec={...spec};
      if(!this.node)throw new Error(`Portable view target not found: ${id}`);
      this.portableDisabled=!!(this.node.matches?.('.dkds-fixed-popover,[data-dkds-portable-chrome="false"],[data-dkds-portable="false"]')||this.node.closest?.('.dkds-fixed-popover,[data-dkds-portable-chrome="false"],[data-dkds-portable="false"]'));
      this.allowed=this.portableDisabled?['home']:[...new Set((spec.placements||['home','float','right','bottom']).map(normalizePlacement))];
      const homeParent=this.node.parentNode||null;
      const homeAnchor=homeParent?document.createComment(`dkds-portable-home:${this.owner}:${this.id}`):null;
      if(homeParent&&homeAnchor)homeParent.insertBefore(homeAnchor,this.node);
      this.original={parent:homeParent,next:this.node.nextSibling||null,anchor:homeAnchor};this.wrapper=null;this.dragCleanup=null;this.stickyViewportCleanup=null;this.resizeObserver=null;this.resizeFrame=0;this.chromeCleanups=[];this.contextMenu=null;
      this.ensureWrapper();
      const initialRect=this.wrapper.getBoundingClientRect?.()||{width:0,height:0};
      this.initialBounds={width:Math.round(initialRect.width)||0,height:Math.round(initialRect.height)||0};
      const saved=this.readState();
      const savedUserPlacement=saved.placementSource==='user'?saved.placement:'';
      const requested=this.portableDisabled?'home':savedUserPlacement||spec.defaultPlacement||'home';
      this.place(requested,{persist:false,bounds:savedUserPlacement?saved.bounds:null,source:savedUserPlacement?'user':'default'});
    }
    storageKey(){const version=String(this.spec.stateVersion||'').trim().replace(/[^a-zA-Z0-9_.-]+/g,'-');const platform=document.documentElement?.dataset?.dkdsHost==='mobile'?'mobile.m3':'desktop';return `${hostState.storagePrefix}.${platform}.${this.owner}.${this.id}${version?`.${version}`:''}`;}
    readState(){return readJson(this.storageKey(),{});}
    writeState(extra={}){const prev=this.readState();writeJson(this.storageKey(),{...prev,...extra});}
    ensureWrapper(){
      const useTarget=this.spec.useTargetAsWrapper===true;
      const chrome=this.spec.chrome!==false&&!this.portableDisabled;
      const wrapper=useTarget?this.node:document.createElement('section');
      wrapper.classList.add('dkds-portable-view');wrapper.dataset.portableId=this.id;
      const semanticKind=String(this.spec.semanticKind||'panel').trim().toLowerCase();
      if(!PORTABLE_SEMANTIC_KINDS.has(semanticKind))throw new Error(`Unknown PortableView semanticKind: ${semanticKind}`);
      wrapper.dataset.dkdsSurfaceKind=semanticKind;wrapper.dataset.dkdsSurfaceKindOwner='portable-view';
      let header=null,controls=null;
      if(chrome){
        header=useTarget?resolveElement(this.spec.handle||'.analysis-chart-title',wrapper):null;
        if(!header){header=document.createElement('header');header.className='dkds-portable-header drag-handle';if(useTarget)wrapper.prepend(header);}
        else header.classList.add('dkds-portable-inline-header','drag-handle');
        const specializedHeader=header.classList.contains('dkds-plot-view-head')||header.classList.contains('dkds-group-plot-head');
        if(specializedHeader)header.classList.remove('dkds-surface-header');
        else header.classList.add('dkds-surface-header');
        const headingStack=header.querySelector?.(':scope > div:first-child');
        if(headingStack&&(headingStack.querySelector?.('h1,h2,h3,h4,strong')||headingStack.querySelector?.('p,.analysis-subtitle,[class$="-description"]')))headingStack.classList.add('dkds-surface-heading-stack');
        let title=header.querySelector?.('.dkds-portable-title');
        if(!title&&!useTarget){title=document.createElement('div');title.className='dkds-portable-title';title.textContent=this.spec.title||this.node.getAttribute('aria-label')||this.id;header.appendChild(title);}
        const placementIcons={home:'◫',sticky:'⌖',left:'←',main:'◫',right:'→',bottom:'↓',float:'↗',global:'⤢'};
        const placementLongLabels={home:'恢复默认位置',sticky:'在当前滚动区吸附',left:'固定到左侧',main:'固定到主区域',right:'固定到右侧',bottom:'固定到底部',float:'画布悬浮 / 边缘吸附',global:'全界面自由悬浮'};
        const placementChoices=this.availablePlacements();
        // A fixed PRIME has no placement action. Do not inject an empty control
        // group into its titlebar; the empty node used to perturb header alignment
        // and created needless chrome DOM on every fixed panel.
        if(placementChoices.length>1){
          controls=document.createElement('div');controls.className='dkds-portable-controls dkds-portable-breadcrumb dkds-integrated-action-subgroup';controls.dataset.dkdsPortableControls=this.id;
          const placementButton=document.createElement('button');placementButton.type='button';placementButton.className='dkds-portable-placement-trigger';placementButton.dataset.dkdsComponentIdentity='toolbarAction';placementButton.dataset.dkdsComponentIdentityOwner='core-portable-view';placementButton.dataset.dkdsComponentVariant='quiet';placementButton.dataset.dkdsComponentVariantOwner='core-portable-view';
          const refreshPlacementButton=()=>{const current=normalizePlacement(this.wrapper?.dataset?.placement||'home');placementButton.innerHTML=`<span class="dkds-portable-location-icon">${esc(placementIcons[current]||'◫')}</span><span class="dkds-portable-caret">▾</span>`;placementButton.setAttribute('aria-label',`图表位置：${placementLongLabels[current]||current}`);};
          const menuItems=()=>this.availablePlacements().map(placement=>({id:placement,icon:placementIcons[placement]||'◫',label:placementLongLabels[placement]||placement,enabled:()=>this.wrapper.dataset.placement!==placement,onInvoke:()=>this.place(placement,{source:'user'})}));
          const showPlacementMenu=(event)=>{event?.stopPropagation?.();event?.preventDefault?.();this.contextMenu?.dispose?.();const rect=placementButton.getBoundingClientRect();const x=Number.isFinite(event?.clientX)&&event.clientX>0?event.clientX:rect.left;const y=Number.isFinite(event?.clientY)&&event.clientY>0?event.clientY:rect.bottom+4;const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x,y,items:menuItems()});};
          placementButton.addEventListener('click',showPlacementMenu);controls.appendChild(placementButton);this.refreshPlacementButton=refreshPlacementButton;refreshPlacementButton();
          const controlsHost=resolveElement(this.spec.controlsHost,wrapper)||header;
          if(this.spec.controlsPlacement==='start')controlsHost.prepend(controls);else controlsHost.appendChild(controls);
        }
        const toggleFloat=e=>{if(e.target.closest('button'))return;e.preventDefault();const preferred=this.allowed.includes('global')&&!this.allowed.includes('float')?'global':'float';this.place(this.wrapper.dataset.placement===preferred?'home':preferred,{source:'user'});};
        header.addEventListener('dblclick',toggleFloat);
        this.chromeCleanups.push(()=>header.removeEventListener('dblclick',toggleFloat));
        this.bindHeldTitleResize(header);
      }
      if(!useTarget){if(header)wrapper.append(header);this.node.parentNode?.insertBefore(wrapper,this.node);wrapper.appendChild(this.node);}
      this.wrapper=wrapper;this.injectedHeader=chrome&&useTarget&&!resolveElement(this.spec.handle||'.analysis-chart-title',wrapper)?header:null;this.controls=controls;this.useTargetAsWrapper=useTarget;
      if(chrome){
        const resizeHandle=document.createElement('div');resizeHandle.className='dkds-portable-resize-handle';resizeHandle.dataset.dkdsTouchGestureOwner='portable-resize';resizeHandle.setAttribute('role','separator');resizeHandle.setAttribute('aria-label','拖动调整悬浮窗口大小');resizeHandle.setAttribute('aria-orientation','horizontal');resizeHandle.tabIndex=0;wrapper.appendChild(resizeHandle);this.resizeHandle=resizeHandle;this.bindFloatResize(resizeHandle);
        const bindChromeAction=(selector,handler)=>{const el=resolveScopedElement(selector,wrapper);if(!el||typeof handler!=='function')return null;const fn=e=>{e.preventDefault();e.stopPropagation();handler(e,this);};el.addEventListener('click',fn);this.chromeCleanups.push(()=>el.removeEventListener('click',fn));return el;};
        const closeButton=bindChromeAction(this.spec.closeSelector,()=>this.spec.onClose?.({id:this.id,portable:this,wrapper:this.wrapper}));
        if(closeButton){closeButton.classList.add('dkds-panel-close-button','dkds-portable-icon-action','dkds-portable-close-action');closeButton.dataset.dkdsComponentIdentity='toolbarAction';closeButton.dataset.dkdsComponentIdentityOwner='core-portable-view';closeButton.dataset.dkdsComponentVariant='quiet';closeButton.dataset.dkdsComponentVariantOwner='core-portable-view';closeButton.textContent='×';closeButton.removeAttribute('title');closeButton.setAttribute('aria-label',String(this.spec.closeTitle||'关闭'));}
        const collapseButton=bindChromeAction(this.spec.collapseSelector,()=>this.toggleCollapsed());
        if(collapseButton){collapseButton.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');collapseButton.dataset.dkdsComponentIdentity='toolbarAction';collapseButton.dataset.dkdsComponentIdentityOwner='core-portable-view';collapseButton.dataset.dkdsComponentVariant='quiet';collapseButton.dataset.dkdsComponentVariantOwner='core-portable-view';collapseButton.textContent='−';collapseButton.removeAttribute('title');collapseButton.setAttribute('aria-label',String(this.spec.collapseTitle||'缩小'));}
      }
      const activatePointer=()=>{if(this.wrapper?.classList?.contains('is-floating'))this.raiseLayer();};
      wrapper.addEventListener('pointerdown',activatePointer,true);this.chromeCleanups.push(()=>wrapper.removeEventListener('pointerdown',activatePointer,true));
      const savedState=this.readState();if(savedState.collapsed===true)this.setCollapsed(true,{persist:false});
      const requestPortableResize=()=>{if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.scope.requestChartResize?.({id:this.id,reason:'portable-resize'});if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;for(const plot of this.wrapper.querySelectorAll?.('[data-dkds-chart-renderer],.dkds-scientific-chart-host')||[]){try{window.DKDSCharts?.resize?.(plot);}catch{}}});};
      const ro=window.ResizeObserver?new ResizeObserver(requestPortableResize):null;ro?.observe(wrapper);this.resizeObserver=ro;
    }
    zone(placement){return this.spec.layout?.slot?.(placement)||hostState.zones.get(placement)||null;}
    nearestVerticalScrollportFrom(start){
      let node=start||null;
      while(node&&node!==document.body&&node!==document.documentElement){
        const style=globalThis.getComputedStyle?.(node);
        const overflow=String(style?.overflowY||'');
        if(/^(auto|scroll|overlay)$/.test(overflow)&&Number(node.clientHeight)>0)return node;
        node=node.parentElement;
      }
      return document.scrollingElement||document.documentElement||null;
    }
    nearestVerticalScrollport(){return this.nearestVerticalScrollportFrom(this.wrapper?.parentElement||null);}
    homeVerticalScrollport(){return this.nearestVerticalScrollportFrom(this.original?.anchor?.parentElement||this.original?.parent||null);}
    bindStickyViewport(){
      cleanupCall(this.stickyViewportCleanup);this.stickyViewportCleanup=null;
      let scrollport=null,ro=null,frame=0,settleFrame=0;
      const bindScrollport=()=>{
        const next=this.nearestVerticalScrollport();
        if(next===scrollport)return scrollport;
        ro?.disconnect?.();scrollport=next;
        ro=globalThis.ResizeObserver&&scrollport?new ResizeObserver(update):null;ro?.observe?.(scrollport);
        return scrollport;
      };
      const update=()=>{
        if(frame)return;
        const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,0));
        frame=raf(()=>{
          frame=0;if(!this.wrapper?.classList?.contains('is-sticky'))return;
          const activeScrollport=bindScrollport();
          const viewportHeight=Math.max(0,Number(activeScrollport?.clientHeight)||Number(globalThis.innerHeight)||0);
          const top=Math.max(0,Number(this.spec.stickyTop)||0);
          const bottomGap=Math.max(8,Number(this.spec.stickyBottomGap)||8);
          const available=Math.max(180,Math.floor(viewportHeight-top-bottomGap));
          portableToken(this.wrapper,'--dkds-portable-sticky-max-height',`${available}px`);
          if(this.wrapper.classList.contains('dkds-plot-view'))portableToken(this.wrapper,'--dkds-portable-sticky-height',`${available}px`);
          this.scope.requestChartResize?.({id:this.id,reason:'portable-sticky-viewport'});
        });
      };
      const settle=()=>{
        const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
        settleFrame=raf(()=>{settleFrame=raf(()=>{settleFrame=0;bindScrollport();update();});});
      };
      window.addEventListener('resize',settle,{passive:true});bindScrollport();update();settle();
      this.stickyViewportCleanup=()=>{const caf=globalThis.cancelAnimationFrame||clearTimeout;if(frame)caf(frame);if(settleFrame)caf(settleFrame);frame=0;settleFrame=0;ro?.disconnect?.();window.removeEventListener('resize',settle);portableRemove(this.wrapper,'--dkds-portable-sticky-height');portableRemove(this.wrapper,'--dkds-portable-sticky-max-height');};
      return this.stickyViewportCleanup;
    }
    restoreHome(){
      const {parent,next,anchor}=this.original;
      if(anchor?.parentNode){anchor.parentNode.insertBefore(this.wrapper,anchor.nextSibling);return true;}
      if(parent?.isConnected){if(next?.parentNode===parent)parent.insertBefore(this.wrapper,next);else parent.appendChild(this.wrapper);return true;}return false;
    }
    availablePlacements(){
      const isPlot=this.node.classList.contains('dkds-plot-view')||!!this.node.querySelector?.('[data-dkds-plot-header],.analysis-chart,.dkds-scientific-chart-host');
      if(!isPlot||this.portableDisabled)return this.allowed;
      const home=this.original?.anchor?.parentElement||this.original?.parent;
      // `sticky` is a group-area placement, not a generic PlotView placement.
      // A standalone plot never gains it merely because another plot is nearby.
      // Today GridController can opt into this internal group-area semantic boundary;
      // the future SDK GroupArea abstraction can formalize that boundary without
      // changing PortableView placement behavior.
      const grouped=!!home?.closest?.('.dkds-group-area-grid');
      const allowSticky=grouped;
      const values=this.allowed.filter(value=>value!=='sticky');
      if(allowSticky)values.splice(1,0,'sticky');
      return values;
    }
    place(value,{persist=true,bounds=null,source=''}={}){
      const previousGrid=this.wrapper?.closest?.('.dkds-managed-grid')||null;
      let placement=normalizePlacement(value);if(!this.availablePlacements().includes(placement))placement=this.availablePlacements()[0]||'home';
      this.wrapper.classList.remove('is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main');
      portableRemove(this.wrapper,'left');portableRemove(this.wrapper,'right');portableRemove(this.wrapper,'top');portableRemove(this.wrapper,'bottom');portableRemove(this.wrapper,'width');portableRemove(this.wrapper,'height');portableRemove(this.wrapper,'--dkds-portable-z');
      cleanupCall(this.dragCleanup);this.dragCleanup=null;cleanupCall(this.stickyViewportCleanup);this.stickyViewportCleanup=null;
      portableRemove(this.wrapper,'--dkds-portable-sticky-height');portableRemove(this.wrapper,'--dkds-portable-sticky-max-height');
      if(placement==='home')this.restoreHome();
      else if(placement==='sticky'){this.restoreHome();this.wrapper.classList.add('is-sticky');this.bindStickyViewport();}
      else if(placement==='float'||placement==='global'){
        const zone=placement==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);zone.appendChild(this.wrapper);this.wrapper.classList.add('is-floating');if(placement==='global')this.wrapper.classList.add('is-global-floating');this.wrapper.dataset.placement=placement;
        const saved=bounds||this.readState().bounds||{};
        const zoneRect=zone.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
        const rect=this.wrapper.getBoundingClientRect();
        const defaultLeft=Math.max(8,Math.min(Math.max(8,(zoneRect.width||window.innerWidth)-420),(rect.left||zoneRect.left+80)-zoneRect.left));
        const defaultTop=Math.max(8,Math.min(Math.max(8,(zoneRect.height||window.innerHeight)-180),(rect.top||zoneRect.top+60)-zoneRect.top));
        const mobileHost=document.documentElement?.dataset?.dkdsHost==='mobile';
        const zoneWidth=Math.max(0,Number(zoneRect.width)||Number(window.innerWidth)||0),zoneHeight=Math.max(0,Number(zoneRect.height)||Number(window.innerHeight)||0);
        const initialWidth=Number(this.initialBounds?.width)||Number(rect.width)||520;
        const initialHeight=Number(this.initialBounds?.height)||Number(rect.height)||0;
        const maxDefaultWidth=Math.max(280,Math.min(680,zoneWidth*.82));
        const defaultWidth=Math.max(280,Math.min(maxDefaultWidth,initialWidth));
        const mobileMaxWidth=Math.max(220,zoneWidth-12),mobileMaxHeight=Math.max(160,zoneHeight-12);
        const resolvedWidth=mobileHost?Math.max(Math.min(280,mobileMaxWidth),Math.min(mobileMaxWidth,Number(saved.width)||defaultWidth)):(Number(saved.width)||defaultWidth);
        const defaultHeight=Math.max(180,Math.min(zoneHeight*.78,initialHeight||420));
        const resolvedHeight=mobileHost?Math.max(Math.min(180,mobileMaxHeight),Math.min(mobileMaxHeight,Number(saved.height)>160?Number(saved.height):defaultHeight)):(Number(saved.height)>160?Number(saved.height):defaultHeight);
        const requestedLeft=Number.isFinite(Number(saved.left))?Number(saved.left):defaultLeft,requestedTop=Number.isFinite(Number(saved.top))?Number(saved.top):defaultTop;
        const resolvedLeft=mobileHost?Math.max(6,Math.min(Math.max(6,zoneWidth-resolvedWidth-6),requestedLeft)):requestedLeft;
        const resolvedTop=mobileHost?Math.max(6,Math.min(Math.max(6,zoneHeight-resolvedHeight-6),requestedTop)):requestedTop;
        portableSet(this.wrapper,'left',`${resolvedLeft}px`);
        portableSet(this.wrapper,'top',`${resolvedTop}px`);
        portableSet(this.wrapper,'width',`${resolvedWidth}px`);
        portableSet(this.wrapper,'height',`${resolvedHeight}px`);
        this.avoidFloatOverlap();this.raiseLayer();
        this.dragCleanup=this.bindFloatDrag(placement);
        if(mobileHost)try{globalThis.DKDSMobileWebPresentation?.releasePortable?.(this.wrapper);}catch{}
      }else{
        const zone=this.zone(placement);if(zone)zone.appendChild(this.wrapper);else this.restoreHome();
        this.wrapper.classList.add('is-docked',`dock-${placement}`);
        const docked=this.readState().dockedBounds?.[placement]||{};
        // Side-docked views fill their dock width; the SplitController owns the
        // actual column width. Persisting a second wrapper width made held-resize
        // look like a translation instead of widening the inspector.
        const scientificPlot=this.wrapper.classList.contains('dkds-plot-view');
        if(placement==='left'||placement==='right')portableSet(this.wrapper,'width','100%');
        else if(Number(docked.width)>0)portableSet(this.wrapper,'width',`${Number(docked.width)}px`);
        // A side-docked scientific plot is a viewport consumer. Reapplying an
        // old persisted card height here defeats the dock flex contract and is
        // exactly what made R–V/group plots stay tiny after moving them right.
        if(placement==='bottom')portableSet(this.wrapper,'height','100%');
        else if(!scientificPlot&&Number(docked.height)>0)portableSet(this.wrapper,'height',`${Number(docked.height)}px`);
      }
      this.wrapper.dataset.placement=placement;
      if(source)this.wrapper.dataset.dkdsPortablePlacementSource=String(source);
      window.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(this.wrapper);
      this.refreshPlacementButton?.();
      const currentGrid=this.wrapper?.closest?.('.dkds-managed-grid')||null;
      // Sticky/home changes must update the group layout in the same frame.
      // Waiting for RAF lets the viewport-height sticky card participate in one
      // grid layout pass, which visibly shifts sibling Y geometry before the
      // avoidance rail is installed (and does the inverse when returning home).
      if(placement==='sticky'||placement==='home'){
        previousGrid?.__dkdsGridController?.apply?.();
        if(currentGrid&&currentGrid!==previousGrid)currentGrid.__dkdsGridController?.apply?.();
      }
      requestAnimationFrame(()=>{previousGrid?.__dkdsGridController?.apply?.();if(currentGrid&&currentGrid!==previousGrid)currentGrid.__dkdsGridController?.apply?.();});
      refreshDockZoneState();
      this.scope.syncRegions?.();
      this.scope.syncCanvasRegions?.();
      if(persist)this.writeState({placement,placementSource:source==='user'?'user':(source||undefined),bounds:(placement==='float'||placement==='global')?this.bounds():undefined});
      try{this.spec.onPlacementChanged?.({id:this.id,placement,portable:this,wrapper:this.wrapper});}catch(err){console.warn('[DKDS portable placement]',err);}
      this.scope.requestChartResize?.({id:this.id,reason:`portable-place-${placement}`});
      if(placement==='sticky'||placement==='left'||placement==='right'||placement==='bottom'||placement==='home'){
        const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
        raf(()=>raf(()=>this.scope.requestChartResize?.({id:this.id,reason:`portable-place-${placement}-settled`})));}
      this.scope.emitResize?.({id:this.id,reason:'portable-place',placement});
      this.scope.presentationChanged?.('portable-place',{portableId:this.id,placement});
      return placement;
    }
    bounds(){const r=this.wrapper.getBoundingClientRect();const placement=normalizePlacement(this.wrapper?.dataset?.placement),globalFloat=this.wrapper?.classList?.contains('is-global-floating');const zone=(placement==='global'||globalFloat)?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);const z=zone?.getBoundingClientRect?.()||{left:0,top:0};return {left:Math.round(r.left-z.left),top:Math.round(r.top-z.top),width:Math.round(r.width),height:Math.round(r.height)};}
    raiseLayer(){
      if(!this.wrapper?.classList?.contains('is-floating'))return 0;
      const global=this.wrapper.classList.contains('is-global-floating');const layers=hostState.layers||{};const key=global?'globalSeq':'canvasSeq';const base=Number(global?layers.globalBase:layers.canvasBase)||(global?2400:1400);let seq=(Number(layers[key])||0)+1;if(seq>360)seq=1;layers[key]=seq;const z=base+seq;portableToken(this.wrapper,'--dkds-portable-z',String(z));return z;
    }
    avoidFloatOverlap(){
      const placement=normalizePlacement(this.wrapper?.dataset?.placement);const zone=placement==='global'?(this.zone('global')||hostState.root):this.zone('overlay');if(!zone||!['float','global'].includes(placement)&&!this.wrapper.classList.contains('is-floating'))return this.bounds();
      const z=zone.getBoundingClientRect?.();if(!z?.width||!z?.height)return this.bounds();
      const gap=Math.max(6,Number(this.spec.collisionGap)||10),current=this.bounds(),width=Math.min(current.width,z.width),height=Math.min(current.height,z.height);
      const clamp=(left,top)=>({left:Math.max(0,Math.min(Math.max(0,z.width-width),left)),top:Math.max(0,Math.min(Math.max(0,z.height-height),top)),width,height});
      const intersects=(a,b)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
      const peers=[...zone.querySelectorAll('.dkds-portable-view.is-floating')].filter(el=>el!==this.wrapper).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-z.left,top:r.top-z.top,width:r.width,height:r.height};});
      let start=clamp(current.left,current.top);if(!peers.some(peer=>intersects(start,peer))){portableSet(this.wrapper,'left',`${start.left}px`);portableSet(this.wrapper,'top',`${start.top}px`);return start;}
      const candidates=[];for(const peer of peers){candidates.push(clamp(peer.left+peer.width+gap,start.top),clamp(peer.left-width-gap,start.top),clamp(start.left,peer.top+peer.height+gap),clamp(start.left,peer.top-height-gap));}
      candidates.push(clamp(gap,gap),clamp(z.width-width-gap,gap),clamp(gap,z.height-height-gap),clamp(z.width-width-gap,z.height-height-gap));
      const viable=candidates.filter(candidate=>!peers.some(peer=>intersects(candidate,peer))).sort((a,b)=>(Math.abs(a.left-start.left)+Math.abs(a.top-start.top))-(Math.abs(b.left-start.left)+Math.abs(b.top-start.top)));
      const next=viable[0]||start;portableSet(this.wrapper,'left',`${next.left}px`);portableSet(this.wrapper,'top',`${next.top}px`);return next;
    }
    pin(placement='right'){return this.place(placement);}
    float(){return this.place('float');}
    globalFloat(){return this.place('global');}
    setCollapsed(value,{persist=true}={}){const collapsed=!!value;this.wrapper?.classList?.toggle('is-collapsed',collapsed);this.wrapper?.classList?.toggle('collapsed',collapsed);const button=resolveScopedElement(this.spec.collapseSelector,this.wrapper);if(button){button.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');button.textContent=collapsed?String(this.spec.expandIcon||'+'):String(this.spec.collapseIcon||'−');button.removeAttribute('title');button.setAttribute('aria-label',collapsed?String(this.spec.expandTitle||'展开'):String(this.spec.collapseTitle||'缩小'));}if(persist)this.writeState({collapsed});try{this.spec.onCollapse?.({id:this.id,collapsed,portable:this,wrapper:this.wrapper});}catch{}this.scope.emitResize?.({id:this.id,reason:'portable-collapse',collapsed});return collapsed;}
    toggleCollapsed(){return this.setCollapsed(!this.wrapper?.classList?.contains('is-collapsed'));}
    bindHeldTitleResize(header){
      // Mobile companion/dock resizing is owned by the visible canvas seam. A
      // long-press title gesture made the same panel resize through two unrelated
      // affordances and regressed the desktop-style boundary interaction.
      if(document.documentElement?.dataset?.dkdsHost==='mobile'||document.documentElement?.classList?.contains('react-native-client'))return;
      let gesture=null,timer=null;const cancelTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};
      const inScrollbarGutter=e=>{
        const nodes=[this.wrapper,e.target?.closest?.('.dkds-portable-view,.floating-body,.dkds-scroll-region')].filter(Boolean);
        for(const node of nodes){const r=node.getBoundingClientRect?.();if(!r)continue;const vertical=node.scrollHeight>node.clientHeight+2,horizontal=node.scrollWidth>node.clientWidth+2;if(vertical&&e.clientX>=r.right-20)return true;if(horizontal&&e.clientY>=r.bottom-20)return true;}
        return false;
      };
      // The title bar owns held-resize gestures.  Prevent Android/browser pan
      // arbitration from handing the same pointer to a nearby overlay scrollbar.
      const previousTouchAction=header.style.touchAction;portableSet(header,'touch-action','none');
      const down=e=>{
        if(e.isPrimary===false||e.target.closest('button,input,select,textarea,a,[role=scrollbar],.dkds-portable-resize-handle,.dkds-table-column-resizer')||inScrollbarGutter(e))return;
        const mobile=document.documentElement?.classList?.contains('react-native-client');
        const region=mobile?String(this.wrapper?.dataset?.dkdsMobileRegion||'').toLowerCase():'';
        const explicitPlacement=normalizePlacement(this.wrapper?.dataset?.placement);
        const semanticPlacement=region==='companion-right'?'right':region==='companion-bottom'?'bottom':(['left','right','sticky'].includes(explicitPlacement)||this.wrapper.classList.contains('is-sticky')||(this.wrapper.classList.contains('is-docked')&&(this.wrapper.classList.contains('dock-left')||this.wrapper.classList.contains('dock-right')))?'right':(explicitPlacement==='bottom'||(this.wrapper.classList.contains('is-docked')&&this.wrapper.classList.contains('dock-bottom'))?'bottom':''));
        const placement=semanticPlacement||explicitPlacement;if(!['left','right','bottom','main','sticky'].includes(placement))return;
        const frame=this.wrapper.closest('.dkds-plugin-canvas-frame');const splits=frame?.__dkdsCanvasSplits||{},frameRect=frame?.getBoundingClientRect?.()||{width:window.innerWidth,height:window.innerHeight};
        const semanticMobile=mobile&&!!semanticPlacement&&!!frame;
        gesture={id:e.pointerId,x:e.clientX,y:e.clientY,placement,armed:false,semanticMobile,frame,frameWidth:frameRect.width,frameHeight:frameRect.height,wrapperWidth:this.wrapper.getBoundingClientRect().width,wrapperHeight:this.wrapper.getBoundingClientRect().height,splitSize:splits[placement]?.size||0,splits};
        timer=setTimeout(()=>{if(gesture&&gesture.id===e.pointerId){gesture.armed=true;const split=gesture.splits?.[gesture.placement];split?.beginPreview?.();this.wrapper.classList.add('is-held-resizing');header.setPointerCapture?.(e.pointerId);}},320);
      };
      const move=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.armed){if(Math.hypot(dx,dy)>9){cancelTimer();gesture=null;}return;}
        const p=gesture.placement,split=gesture.splits?.[p];
        if(gesture.semanticMobile&&(p==='left'||p==='right')&&Math.abs(dx)>=Math.abs(dy)){const sign=p==='right'?-1:1,min=190,max=Math.max(min,Math.min(680,gesture.frameWidth*.72)),next=Math.max(min,Math.min(max,gesture.wrapperWidth+dx*sign));portableToken(gesture.frame,'--dkds-mobile-user-right-track',`${Math.round(next)}px`);this.scope.requestChartResize?.({id:this.id,reason:'portable-mobile-side-held-resize'});}
        else if(gesture.semanticMobile&&p==='bottom'&&Math.abs(dy)>Math.abs(dx)){const min=180,max=Math.max(min,Math.min(620,gesture.frameHeight*.72)),next=Math.max(min,Math.min(max,gesture.wrapperHeight-dy));portableToken(gesture.frame,'--dkds-mobile-user-bottom-track',`${Math.round(next)}px`);this.scope.requestChartResize?.({id:this.id,reason:'portable-mobile-bottom-held-resize'});}
        else if((p==='left'||p==='right')&&Math.abs(dx)>=Math.abs(dy)&&split){const sign=p==='right'?-1:1;split.schedulePreview?.(gesture.splitSize+dx*sign);}
        else if(p==='bottom'&&Math.abs(dy)>Math.abs(dx)&&split)split.schedulePreview?.(gesture.splitSize-dy);
        else if(p==='left'||p==='right'){
          if(mobile){const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{width:window.innerWidth};const sign=p==='right'?-1:1;const next=Math.max(190,Math.min(Math.max(220,zr.width),gesture.wrapperWidth+dx*sign));portableSet(this.wrapper,'width',`${Math.round(next)}px`);}
          else{const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{height:window.innerHeight};const next=Math.max(140,Math.min(Math.max(160,zr.height),gesture.wrapperHeight+dy));portableSet(this.wrapper,'height',`${Math.round(next)}px`);}
        }else{
          if(mobile){const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{height:window.innerHeight};const next=Math.max(180,Math.min(Math.max(220,zr.height),gesture.wrapperHeight-dy));portableSet(this.wrapper,'height',`${Math.round(next)}px`);}
          else{const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{width:window.innerWidth};const next=Math.max(260,Math.min(Math.max(280,zr.width),gesture.wrapperWidth+dx));portableSet(this.wrapper,'width',`${Math.round(next)}px`);}
        }
        if(e.cancelable)e.preventDefault();
      };
      const up=e=>{if(!gesture||gesture.id!==e.pointerId)return;cancelTimer();if(gesture.armed){const split=gesture.splits?.[gesture.placement];split?.finishPreview?.({persist:true,reason:'portable-held-resize'});const p=gesture.placement,isMobile=document.documentElement?.classList?.contains('react-native-client');if(!isMobile){const state=this.readState(),dockedBounds={...(state.dockedBounds||{})};const r=this.wrapper.getBoundingClientRect();dockedBounds[p]={width:(p==='left'||p==='right')?0:Math.round(r.width),height:p==='bottom'?0:Math.round(r.height)};this.writeState({dockedBounds});}if(!gesture.semanticMobile&&(p==='left'||p==='right'))portableSet(this.wrapper,'width','100%');if(gesture.semanticMobile){const r=this.wrapper.getBoundingClientRect();const state=this.readState(),mobileSemanticBounds={...(state.mobileSemanticBounds||{})};if(p==='left'||p==='right')mobileSemanticBounds.rightWidth=Math.round(r.width);if(p==='bottom')mobileSemanticBounds.bottomHeight=Math.round(r.height);this.writeState({mobileSemanticBounds});}window.dispatchEvent(new Event('resize'));}this.wrapper.classList.remove('is-held-resizing');gesture=null;};
      header.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
      this.chromeCleanups.push(()=>{cancelTimer();previousTouchAction?portableSet(header,'touch-action',previousTouchAction):portableRemove(header,'touch-action');header.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);});
    }
    bindFloatResize(handle){
      let state=null;
      const down=e=>{if(e.button!==undefined&&e.button!==0)return;if(!this.wrapper.classList.contains('is-floating'))return;const r=this.wrapper.getBoundingClientRect();state={id:e.pointerId,x:e.clientX,y:e.clientY,width:r.width,height:r.height};handle.classList.add('is-dragging');handle.setPointerCapture?.(e.pointerId);this.raiseLayer();e.preventDefault();e.stopPropagation();};
      const move=e=>{if(!state||state.id!==e.pointerId)return;const placement=normalizePlacement(this.wrapper.dataset.placement),zone=placement==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body),z=zone?.getBoundingClientRect?.()||{width:window.innerWidth,height:window.innerHeight};const b=this.bounds();const maxW=Math.max(260,z.width-b.left),maxH=Math.max(160,z.height-b.top),dx=e.clientX-state.x,dy=e.clientY-state.y;portableSet(this.wrapper,'width',`${Math.round(Math.max(260,Math.min(maxW,state.width+dx)))}px`);portableSet(this.wrapper,'height',`${Math.round(Math.max(160,Math.min(maxH,state.height+dy)))}px`);this.scope.requestChartResize?.({id:this.id,reason:'portable-float-resize-live'});if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!state||(e?.pointerId!==undefined&&e.pointerId!==state.id))return;state=null;handle.classList.remove('is-dragging');const placement=normalizePlacement(this.wrapper.dataset.placement);if(['float','global'].includes(placement))this.writeState({placement,bounds:this.bounds()});};
      handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.chromeCleanups.push(()=>{handle.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);});
    }
    bindFloatDrag(mode='float'){
      const head=this.wrapper.querySelector('.drag-handle')||this.wrapper.querySelector('.dkds-portable-header');if(!head)return ()=>{};let state=null;
      const down=e=>{if(e.button!==undefined&&e.button!==0||e.target.closest('button')||e.target.closest('.dkds-portable-resize-handle'))return;this.raiseLayer();const r=this.wrapper.getBoundingClientRect();state={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};head.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!state||e.pointerId!==state.id)return;const zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);const z=zone?.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight},r=this.wrapper.getBoundingClientRect();portableSet(this.wrapper,'left',`${Math.max(0,Math.min(Math.max(0,z.width-r.width),e.clientX-state.dx-z.left))}px`);portableSet(this.wrapper,'top',`${Math.max(0,Math.min(Math.max(0,z.height-r.height),e.clientY-state.dy-z.top))}px`);if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!state||(e?.pointerId!==undefined&&e.pointerId!==state.id))return;state=null;
        const r=this.wrapper.getBoundingClientRect(),snap=Math.max(24,Number(this.spec.snapDistance)||44),zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body),z=zone?.getBoundingClientRect?.()||{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
        if(mode==='float'&&this.spec.snap!==false){if(r.left-z.left<=snap&&this.allowed.includes('left')){this.place('left',{source:'user'});return;}if(z.right-r.right<=snap&&this.allowed.includes('right')){this.place('right',{source:'user'});return;}if(z.bottom-r.bottom<=snap&&this.allowed.includes('bottom')){this.place('bottom',{source:'user'});return;}}
        this.avoidFloatOverlap();this.writeState({placement:mode,bounds:this.bounds()});
      };
      head.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
      return ()=>{head.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
    }
    dispose(){cleanupCall(this.dragCleanup);cleanupCall(this.stickyViewportCleanup);this.stickyViewportCleanup=null;this.contextMenu?.dispose?.();this.contextMenu=null;this.chromeCleanups.splice(0).forEach(cleanupCall);this.resizeObserver?.disconnect?.();if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=0;this.restoreHome();this.controls?.remove?.();this.resizeHandle?.remove?.();if(this.useTargetAsWrapper){this.wrapper?.classList?.remove('dkds-portable-view','is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main','is-collapsed','collapsed');delete this.wrapper?.dataset?.portableId;delete this.wrapper?.dataset?.placement;if(this.wrapper?.dataset?.dkdsSurfaceKindOwner==='portable-view'){delete this.wrapper.dataset.dkdsSurfaceKind;delete this.wrapper.dataset.dkdsSurfaceKindOwner;}}else if(this.wrapper?.parentNode){this.wrapper.parentNode.insertBefore(this.node,this.wrapper);this.wrapper.remove();}this.original?.anchor?.remove?.();if(this.scope?.portables?.get?.(this.id)===this)this.scope.portables.delete(this.id);refreshDockZoneState();}
  }

module.exports=Object.freeze({PortableView});
