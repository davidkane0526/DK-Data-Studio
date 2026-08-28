'use strict';
const {hostState, esc, resolveElement, resolveScopedElement, cleanupCall, readJson, writeJson}=require('../foundation/shortcuts');
const {ContextMenu}=require('../interaction/context-actions');
const {normalizePlacement, refreshDockZoneState}=require('./docking');

  class PortableView {
    constructor(scope,id,node,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id);this.node=resolveElement(node);this.spec={...spec};this.allowed=[...new Set((spec.placements||['home','float','right','bottom']).map(normalizePlacement))];
      if(!this.node)throw new Error(`Portable view target not found: ${id}`);
      const homeParent=this.node.parentNode||null;
      const homeAnchor=homeParent?document.createComment(`dkds-portable-home:${this.owner}:${this.id}`):null;
      if(homeParent&&homeAnchor)homeParent.insertBefore(homeAnchor,this.node);
      this.original={parent:homeParent,next:this.node.nextSibling||null,anchor:homeAnchor};this.wrapper=null;this.dragCleanup=null;this.resizeObserver=null;this.resizeFrame=0;this.chromeCleanups=[];this.contextMenu=null;
      this.ensureWrapper();
      const initialRect=this.wrapper.getBoundingClientRect?.()||{width:0,height:0};
      this.initialBounds={width:Math.round(initialRect.width)||0,height:Math.round(initialRect.height)||0};
      const saved=this.readState();
      const requested=saved.placement||spec.defaultPlacement||'home';
      this.place(requested,{persist:false,bounds:saved.bounds});
    }
    storageKey(){const version=String(this.spec.stateVersion||'').trim().replace(/[^a-zA-Z0-9_.-]+/g,'-');return `${hostState.storagePrefix}.${this.owner}.${this.id}${version?`.${version}`:''}`;}
    readState(){return readJson(this.storageKey(),{});}
    writeState(extra={}){const prev=this.readState();writeJson(this.storageKey(),{...prev,...extra});}
    ensureWrapper(){
      const useTarget=this.spec.useTargetAsWrapper===true;
      const wrapper=useTarget?this.node:document.createElement('section');
      wrapper.classList.add('dkds-portable-view');wrapper.dataset.portableId=this.id;
      let header=useTarget?resolveElement(this.spec.handle||'.analysis-chart-title',wrapper):null;
      if(!header){header=document.createElement('header');header.className='dkds-portable-header drag-handle';if(useTarget)wrapper.prepend(header);}
      else header.classList.add('dkds-portable-inline-header','drag-handle');
      const specializedHeader=header.classList.contains('dkds-plot-view-head')||header.classList.contains('dkds-group-plot-head');
      if(specializedHeader)header.classList.remove('dkds-surface-header');
      else header.classList.add('dkds-surface-header');
      const headingStack=header.querySelector?.(':scope > div:first-child');
      if(headingStack&&(headingStack.querySelector?.('h1,h2,h3,h4,strong')||headingStack.querySelector?.('p,.analysis-subtitle,[class$="-description"]')))headingStack.classList.add('dkds-surface-heading-stack');
      let title=header.querySelector?.('.dkds-portable-title');
      if(!title&&!useTarget){title=document.createElement('div');title.className='dkds-portable-title';title.textContent=this.spec.title||this.node.getAttribute('aria-label')||this.id;header.appendChild(title);}
      const controls=document.createElement('div');controls.className='dkds-portable-controls dkds-portable-breadcrumb dkds-integrated-action-subgroup';controls.dataset.dkdsPortableControls=this.id;
      const placementIcons={home:'◫',sticky:'⌖',left:'←',main:'◫',right:'→',bottom:'↓',float:'↗',global:'⤢'};
      const placementLongLabels={home:'恢复默认位置',sticky:'在当前滚动区吸附',left:'固定到左侧',main:'固定到主区域',right:'固定到右侧',bottom:'固定到底部',float:'画布悬浮 / 边缘吸附',global:'全界面自由悬浮'};
      const placementButton=document.createElement('button');placementButton.type='button';placementButton.className='dkds-portable-placement-trigger';placementButton.title='图表位置';
      const refreshPlacementButton=()=>{const current=normalizePlacement(this.wrapper?.dataset?.placement||'home');placementButton.innerHTML=`<span class="dkds-portable-location-icon">${esc(placementIcons[current]||'◫')}</span><span class="dkds-portable-caret">▾</span>`;placementButton.setAttribute('aria-label',`图表位置：${placementLongLabels[current]||current}`);};
      const menuItems=()=>this.allowed.map(placement=>({id:placement,icon:placementIcons[placement]||'◫',label:placementLongLabels[placement]||placement,enabled:()=>this.wrapper.dataset.placement!==placement,onInvoke:()=>this.place(placement)}));
      const showPlacementMenu=(event)=>{event?.stopPropagation?.();event?.preventDefault?.();this.contextMenu?.dispose?.();const rect=placementButton.getBoundingClientRect();const x=Number.isFinite(event?.clientX)&&event.clientX>0?event.clientX:rect.left;const y=Number.isFinite(event?.clientY)&&event.clientY>0?event.clientY:rect.bottom+4;const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x,y,items:menuItems()});};
      placementButton.addEventListener('click',showPlacementMenu);controls.appendChild(placementButton);
      const controlsHost=resolveElement(this.spec.controlsHost,wrapper)||header;
      if(this.spec.controlsPlacement==='start')controlsHost.prepend(controls);else controlsHost.appendChild(controls);
      this.refreshPlacementButton=refreshPlacementButton;refreshPlacementButton();
      const toggleFloat=e=>{if(e.target.closest('button'))return;e.preventDefault();const preferred=this.allowed.includes('global')&&!this.allowed.includes('float')?'global':'float';this.place(this.wrapper.dataset.placement===preferred?'home':preferred);};
      header.addEventListener('dblclick',toggleFloat);
      this.chromeCleanups.push(()=>header.removeEventListener('dblclick',toggleFloat));
      this.bindHeldTitleResize(header);
      if(!useTarget){wrapper.append(header);this.node.parentNode?.insertBefore(wrapper,this.node);wrapper.appendChild(this.node);}
      this.wrapper=wrapper;this.injectedHeader=useTarget&&!resolveElement(this.spec.handle||'.analysis-chart-title',wrapper)?header:null;this.controls=controls;this.useTargetAsWrapper=useTarget;
      const resizeHandle=document.createElement('div');resizeHandle.className='dkds-portable-resize-handle';resizeHandle.setAttribute('role','separator');resizeHandle.setAttribute('aria-label','拖动调整悬浮窗口大小');wrapper.appendChild(resizeHandle);this.resizeHandle=resizeHandle;this.bindFloatResize(resizeHandle);
      const bindChromeAction=(selector,handler)=>{const el=resolveScopedElement(selector,wrapper);if(!el||typeof handler!=='function')return null;const fn=e=>{e.preventDefault();e.stopPropagation();handler(e,this);};el.addEventListener('click',fn);this.chromeCleanups.push(()=>el.removeEventListener('click',fn));return el;};
      const closeButton=bindChromeAction(this.spec.closeSelector,()=>this.spec.onClose?.({id:this.id,portable:this,wrapper:this.wrapper}));
      if(closeButton){closeButton.classList.add('dkds-portable-icon-action','dkds-portable-close-action');closeButton.textContent='×';closeButton.title=String(this.spec.closeTitle||'关闭');closeButton.setAttribute('aria-label',closeButton.title);}
      const collapseButton=bindChromeAction(this.spec.collapseSelector,()=>this.toggleCollapsed());
      if(collapseButton){collapseButton.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');collapseButton.textContent='−';collapseButton.title=String(this.spec.collapseTitle||'缩小');collapseButton.setAttribute('aria-label',collapseButton.title);}
      const activatePointer=()=>{if(this.wrapper?.classList?.contains('is-floating'))this.raiseLayer();};
      wrapper.addEventListener('pointerdown',activatePointer,true);this.chromeCleanups.push(()=>wrapper.removeEventListener('pointerdown',activatePointer,true));
      const savedState=this.readState();if(savedState.collapsed===true)this.setCollapsed(true,{persist:false});
      const requestPortableResize=()=>{if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.scope.requestChartResize?.({id:this.id,reason:'portable-resize'});if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;for(const plot of this.wrapper.querySelectorAll?.('[data-dkds-chart-renderer],.dkds-scientific-chart-host')||[]){try{window.DKDSCharts?.resize?.(plot);}catch{}}});};
      const ro=window.ResizeObserver?new ResizeObserver(requestPortableResize):null;ro?.observe(wrapper);this.resizeObserver=ro;
    }
    zone(placement){return this.spec.layout?.slot?.(placement)||hostState.zones.get(placement)||null;}
    restoreHome(){
      const {parent,next,anchor}=this.original;
      if(anchor?.parentNode){anchor.parentNode.insertBefore(this.wrapper,anchor.nextSibling);return true;}
      if(parent?.isConnected){if(next?.parentNode===parent)parent.insertBefore(this.wrapper,next);else parent.appendChild(this.wrapper);return true;}return false;
    }
    place(value,{persist=true,bounds=null}={}){
      const previousGrid=this.wrapper?.closest?.('.dkds-managed-grid')||null;
      let placement=normalizePlacement(value);if(!this.allowed.includes(placement))placement=this.allowed[0]||'home';
      this.wrapper.classList.remove('is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main');
      this.wrapper.style.removeProperty('left');this.wrapper.style.removeProperty('top');this.wrapper.style.removeProperty('width');this.wrapper.style.removeProperty('height');this.wrapper.style.removeProperty('--dkds-portable-z');
      cleanupCall(this.dragCleanup);this.dragCleanup=null;
      if(placement==='home')this.restoreHome();
      else if(placement==='sticky'){this.restoreHome();this.wrapper.classList.add('is-sticky');}
      else if(placement==='float'||placement==='global'){
        const zone=placement==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);zone.appendChild(this.wrapper);this.wrapper.classList.add('is-floating');if(placement==='global')this.wrapper.classList.add('is-global-floating');this.wrapper.dataset.placement=placement;
        const saved=bounds||this.readState().bounds||{};
        const zoneRect=zone.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
        const rect=this.wrapper.getBoundingClientRect();
        const defaultLeft=Math.max(8,Math.min(Math.max(8,(zoneRect.width||window.innerWidth)-420),(rect.left||zoneRect.left+80)-zoneRect.left));
        const defaultTop=Math.max(8,Math.min(Math.max(8,(zoneRect.height||window.innerHeight)-180),(rect.top||zoneRect.top+60)-zoneRect.top));
        this.wrapper.style.left=`${Number.isFinite(Number(saved.left))?Number(saved.left):defaultLeft}px`;
        this.wrapper.style.top=`${Number.isFinite(Number(saved.top))?Number(saved.top):defaultTop}px`;
        const initialWidth=Number(this.initialBounds?.width)||Number(rect.width)||520;
        const initialHeight=Number(this.initialBounds?.height)||Number(rect.height)||0;
        const maxDefaultWidth=Math.max(280,Math.min(680,(zoneRect.width||window.innerWidth)*.82));
        const defaultWidth=Math.max(280,Math.min(maxDefaultWidth,initialWidth));
        this.wrapper.style.width=`${Number(saved.width)||defaultWidth}px`;
        const defaultHeight=Math.max(180,Math.min((zoneRect.height||window.innerHeight)*.78,initialHeight||420));
        this.wrapper.style.height=`${Number(saved.height)>160?Number(saved.height):defaultHeight}px`;
        this.avoidFloatOverlap();this.raiseLayer();
        this.dragCleanup=this.bindFloatDrag(placement);
      }else{
        const zone=this.zone(placement);if(zone)zone.appendChild(this.wrapper);else this.restoreHome();
        this.wrapper.classList.add('is-docked',`dock-${placement}`);
        const docked=this.readState().dockedBounds?.[placement]||{};
        // Side-docked views fill their dock width; the SplitController owns the
        // actual column width. Persisting a second wrapper width made held-resize
        // look like a translation instead of widening the inspector.
        if(placement==='left'||placement==='right')this.wrapper.style.setProperty('width','100%');
        else if(Number(docked.width)>0)this.wrapper.style.setProperty('width',`${Number(docked.width)}px`);
        if(placement==='bottom')this.wrapper.style.setProperty('height','100%');
        else if(Number(docked.height)>0)this.wrapper.style.setProperty('height',`${Number(docked.height)}px`);
      }
      this.wrapper.dataset.placement=placement;
      window.DKDSThemeMaterialRenderer?.assignSemanticRoles?.(this.wrapper);
      this.refreshPlacementButton?.();
      const currentGrid=this.wrapper?.closest?.('.dkds-managed-grid')||null;
      requestAnimationFrame(()=>{previousGrid?.__dkdsGridController?.apply?.();if(currentGrid&&currentGrid!==previousGrid)currentGrid.__dkdsGridController?.apply?.();});
      refreshDockZoneState();
      if(persist)this.writeState({placement,bounds:(placement==='float'||placement==='global')?this.bounds():undefined});
      try{this.spec.onPlacementChanged?.({id:this.id,placement,portable:this,wrapper:this.wrapper});}catch(err){console.warn('[DKDS portable placement]',err);}
      this.scope.emitResize?.({id:this.id,reason:'portable-place',placement});
      return placement;
    }
    bounds(){const r=this.wrapper.getBoundingClientRect();const placement=normalizePlacement(this.wrapper?.dataset?.placement);const zone=placement==='global'?(this.zone('global')||hostState.root):(this.zone('overlay')||hostState.root);const z=zone?.getBoundingClientRect?.()||{left:0,top:0};return {left:Math.round(r.left-z.left),top:Math.round(r.top-z.top),width:Math.round(r.width),height:Math.round(r.height)};}
    raiseLayer(){
      if(!this.wrapper?.classList?.contains('is-floating'))return 0;
      const global=this.wrapper.classList.contains('is-global-floating');const layers=hostState.layers||{};const key=global?'globalSeq':'canvasSeq';const base=Number(global?layers.globalBase:layers.canvasBase)||(global?2400:1400);let seq=(Number(layers[key])||0)+1;if(seq>360)seq=1;layers[key]=seq;const z=base+seq;this.wrapper.style.setProperty('--dkds-portable-z',String(z));return z;
    }
    avoidFloatOverlap(){
      const placement=normalizePlacement(this.wrapper?.dataset?.placement);const zone=placement==='global'?(this.zone('global')||hostState.root):this.zone('overlay');if(!zone||!['float','global'].includes(placement)&&!this.wrapper.classList.contains('is-floating'))return this.bounds();
      const z=zone.getBoundingClientRect?.();if(!z?.width||!z?.height)return this.bounds();
      const gap=Math.max(6,Number(this.spec.collisionGap)||10),current=this.bounds(),width=Math.min(current.width,z.width),height=Math.min(current.height,z.height);
      const clamp=(left,top)=>({left:Math.max(0,Math.min(Math.max(0,z.width-width),left)),top:Math.max(0,Math.min(Math.max(0,z.height-height),top)),width,height});
      const intersects=(a,b)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
      const peers=[...zone.querySelectorAll('.dkds-portable-view.is-floating')].filter(el=>el!==this.wrapper).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-z.left,top:r.top-z.top,width:r.width,height:r.height};});
      let start=clamp(current.left,current.top);if(!peers.some(peer=>intersects(start,peer))){this.wrapper.style.left=`${start.left}px`;this.wrapper.style.top=`${start.top}px`;return start;}
      const candidates=[];for(const peer of peers){candidates.push(clamp(peer.left+peer.width+gap,start.top),clamp(peer.left-width-gap,start.top),clamp(start.left,peer.top+peer.height+gap),clamp(start.left,peer.top-height-gap));}
      candidates.push(clamp(gap,gap),clamp(z.width-width-gap,gap),clamp(gap,z.height-height-gap),clamp(z.width-width-gap,z.height-height-gap));
      const viable=candidates.filter(candidate=>!peers.some(peer=>intersects(candidate,peer))).sort((a,b)=>(Math.abs(a.left-start.left)+Math.abs(a.top-start.top))-(Math.abs(b.left-start.left)+Math.abs(b.top-start.top)));
      const next=viable[0]||start;this.wrapper.style.left=`${next.left}px`;this.wrapper.style.top=`${next.top}px`;return next;
    }
    pin(placement='right'){return this.place(placement);}
    float(){return this.place('float');}
    globalFloat(){return this.place('global');}
    setCollapsed(value,{persist=true}={}){const collapsed=!!value;this.wrapper?.classList?.toggle('is-collapsed',collapsed);this.wrapper?.classList?.toggle('collapsed',collapsed);const button=resolveScopedElement(this.spec.collapseSelector,this.wrapper);if(button){button.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');button.textContent=collapsed?String(this.spec.expandIcon||'+'):String(this.spec.collapseIcon||'−');button.title=collapsed?String(this.spec.expandTitle||'展开'):String(this.spec.collapseTitle||'缩小');button.setAttribute('aria-label',button.title);}if(persist)this.writeState({collapsed});try{this.spec.onCollapse?.({id:this.id,collapsed,portable:this,wrapper:this.wrapper});}catch{}this.scope.emitResize?.({id:this.id,reason:'portable-collapse',collapsed});return collapsed;}
    toggleCollapsed(){return this.setCollapsed(!this.wrapper?.classList?.contains('is-collapsed'));}
    bindHeldTitleResize(header){
      let gesture=null,timer=null;const cancelTimer=()=>{if(timer){clearTimeout(timer);timer=null;}};
      const inScrollbarGutter=e=>{
        const nodes=[this.wrapper,e.target?.closest?.('.dkds-portable-view,.floating-body,.dkds-scroll-region')].filter(Boolean);
        for(const node of nodes){const r=node.getBoundingClientRect?.();if(!r)continue;const vertical=node.scrollHeight>node.clientHeight+2,horizontal=node.scrollWidth>node.clientWidth+2;if(vertical&&e.clientX>=r.right-20)return true;if(horizontal&&e.clientY>=r.bottom-20)return true;}
        return false;
      };
      // The title bar owns held-resize gestures.  Prevent Android/browser pan
      // arbitration from handing the same pointer to a nearby overlay scrollbar.
      const previousTouchAction=header.style.touchAction;header.style.touchAction='none';
      const down=e=>{
        if(e.isPrimary===false||e.target.closest('button,input,select,textarea,a,[role=scrollbar],.dkds-portable-resize-handle,.dkds-table-column-resizer')||inScrollbarGutter(e))return;
        const placement=normalizePlacement(this.wrapper?.dataset?.placement);if(!['left','right','bottom','main'].includes(placement))return;
        const frame=this.wrapper.closest('.dkds-plugin-canvas-frame');const splits=frame?.__dkdsCanvasSplits||{};
        gesture={id:e.pointerId,x:e.clientX,y:e.clientY,placement,armed:false,wrapperWidth:this.wrapper.getBoundingClientRect().width,wrapperHeight:this.wrapper.getBoundingClientRect().height,splitSize:splits[placement]?.size||0,splits};
        timer=setTimeout(()=>{if(gesture&&gesture.id===e.pointerId){gesture.armed=true;this.wrapper.classList.add('is-held-resizing');header.setPointerCapture?.(e.pointerId);}},320);
      };
      const move=e=>{if(!gesture||gesture.id!==e.pointerId)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.armed){if(Math.hypot(dx,dy)>9){cancelTimer();gesture=null;}return;}
        const p=gesture.placement,split=gesture.splits?.[p];
        if((p==='left'||p==='right')&&Math.abs(dx)>=Math.abs(dy)&&split){const sign=p==='right'?-1:1;split.apply(gesture.splitSize+dx*sign,{persist:false});}
        else if(p==='bottom'&&Math.abs(dy)>Math.abs(dx)&&split)split.apply(gesture.splitSize-dy,{persist:false});
        else if(p==='left'||p==='right'){const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{height:window.innerHeight};const next=Math.max(140,Math.min(Math.max(160,zr.height),gesture.wrapperHeight+dy));this.wrapper.style.setProperty('height',`${Math.round(next)}px`);}
        else {const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{width:window.innerWidth};const next=Math.max(260,Math.min(Math.max(280,zr.width),gesture.wrapperWidth+dx));this.wrapper.style.setProperty('width',`${Math.round(next)}px`);}
        if(e.cancelable)e.preventDefault();
      };
      const up=e=>{if(!gesture||gesture.id!==e.pointerId)return;cancelTimer();if(gesture.armed){const split=gesture.splits?.[gesture.placement];if(split)split.apply(split.size,{persist:true});const state=this.readState(),dockedBounds={...(state.dockedBounds||{})};const r=this.wrapper.getBoundingClientRect(),p=gesture.placement;dockedBounds[p]={width:(p==='left'||p==='right')?0:Math.round(r.width),height:p==='bottom'?0:Math.round(r.height)};this.writeState({dockedBounds});if(p==='left'||p==='right')this.wrapper.style.setProperty('width','100%');window.dispatchEvent(new Event('resize'));}this.wrapper.classList.remove('is-held-resizing');gesture=null;};
      header.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
      this.chromeCleanups.push(()=>{cancelTimer();header.style.touchAction=previousTouchAction;header.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);});
    }
    bindFloatResize(handle){
      let state=null;
      const down=e=>{if(e.button!==undefined&&e.button!==0)return;if(!this.wrapper.classList.contains('is-floating'))return;const r=this.wrapper.getBoundingClientRect();state={id:e.pointerId,x:e.clientX,y:e.clientY,width:r.width,height:r.height};handle.setPointerCapture?.(e.pointerId);this.raiseLayer();e.preventDefault();e.stopPropagation();};
      const move=e=>{if(!state||state.id!==e.pointerId)return;const placement=normalizePlacement(this.wrapper.dataset.placement),zone=placement==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body),z=zone?.getBoundingClientRect?.()||{width:window.innerWidth,height:window.innerHeight};const b=this.bounds();const maxW=Math.max(260,z.width-b.left),maxH=Math.max(160,z.height-b.top);this.wrapper.style.width=`${Math.round(Math.max(260,Math.min(maxW,state.width+e.clientX-state.x)))}px`;this.wrapper.style.height=`${Math.round(Math.max(160,Math.min(maxH,state.height+e.clientY-state.y)))}px`;if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!state||(e?.pointerId!==undefined&&e.pointerId!==state.id))return;state=null;const placement=normalizePlacement(this.wrapper.dataset.placement);if(['float','global'].includes(placement))this.writeState({placement,bounds:this.bounds()});};
      handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.chromeCleanups.push(()=>{handle.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);});
    }
    bindFloatDrag(mode='float'){
      const head=this.wrapper.querySelector('.drag-handle')||this.wrapper.querySelector('.dkds-portable-header');if(!head)return ()=>{};let state=null;
      const down=e=>{if(e.button!==undefined&&e.button!==0||e.target.closest('button')||e.target.closest('.dkds-portable-resize-handle'))return;this.raiseLayer();const r=this.wrapper.getBoundingClientRect();state={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};head.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!state||e.pointerId!==state.id)return;const zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);const z=zone?.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight},r=this.wrapper.getBoundingClientRect();this.wrapper.style.left=`${Math.max(0,Math.min(Math.max(0,z.width-r.width),e.clientX-state.dx-z.left))}px`;this.wrapper.style.top=`${Math.max(0,Math.min(Math.max(0,z.height-r.height),e.clientY-state.dy-z.top))}px`;if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!state||(e?.pointerId!==undefined&&e.pointerId!==state.id))return;state=null;
        const r=this.wrapper.getBoundingClientRect(),snap=Math.max(24,Number(this.spec.snapDistance)||44),zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body),z=zone?.getBoundingClientRect?.()||{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
        if(mode==='float'&&this.spec.snap!==false){if(r.left-z.left<=snap&&this.allowed.includes('left')){this.place('left');return;}if(z.right-r.right<=snap&&this.allowed.includes('right')){this.place('right');return;}if(z.bottom-r.bottom<=snap&&this.allowed.includes('bottom')){this.place('bottom');return;}}
        this.avoidFloatOverlap();this.writeState({placement:mode,bounds:this.bounds()});
      };
      head.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
      return ()=>{head.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);};
    }
    dispose(){cleanupCall(this.dragCleanup);this.contextMenu?.dispose?.();this.contextMenu=null;this.chromeCleanups.splice(0).forEach(cleanupCall);this.resizeObserver?.disconnect?.();if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=0;this.restoreHome();this.controls?.remove?.();this.resizeHandle?.remove?.();if(this.useTargetAsWrapper){this.wrapper?.classList?.remove('dkds-portable-view','is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main','is-collapsed','collapsed');delete this.wrapper?.dataset?.portableId;delete this.wrapper?.dataset?.placement;}else if(this.wrapper?.parentNode){this.wrapper.parentNode.insertBefore(this.node,this.wrapper);this.wrapper.remove();}this.original?.anchor?.remove?.();if(this.scope?.portables?.get?.(this.id)===this)this.scope.portables.delete(this.id);refreshDockZoneState();}
  }

module.exports=Object.freeze({PortableView});
