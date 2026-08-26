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
      header.classList.add('dkds-surface-header');
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
      const requestPortableResize=()=>{this.scope.requestChartResize?.({id:this.id,reason:'portable-resize'});if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;for(const plot of this.wrapper.querySelectorAll?.('[data-dkds-chart-renderer],.dkds-scientific-chart-host')||[]){try{window.DKDSCharts?.resize?.(plot);}catch{}}});};
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
        if(placement==='left'||placement==='right')this.wrapper.style.setProperty('width','100%','important');
        else if(Number(docked.width)>0)this.wrapper.style.setProperty('width',`${Number(docked.width)}px`,'important');
        if(placement==='bottom')this.wrapper.style.setProperty('height','100%','important');
        else if(Number(docked.height)>0)this.wrapper.style.setProperty('height',`${Number(docked.height)}px`,'important');
      }
      this.wrapper.dataset.placement=placement;
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
        else if(p==='left'||p==='right'){const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{height:window.innerHeight};const next=Math.max(140,Math.min(Math.max(160,zr.height),gesture.wrapperHeight+dy));this.wrapper.style.setProperty('height',`${Math.round(next)}px`,'important');}
        else {const zone=this.zone(p),zr=zone?.getBoundingClientRect?.()||{width:window.innerWidth};const next=Math.max(260,Math.min(Math.max(280,zr.width),gesture.wrapperWidth+dx));this.wrapper.style.setProperty('width',`${Math.round(next)}px`,'important');}
        if(e.cancelable)e.preventDefault();
      };
      const up=e=>{if(!gesture||gesture.id!==e.pointerId)return;cancelTimer();if(gesture.armed){const split=gesture.splits?.[gesture.placement];if(split)split.apply(split.size,{persist:true});const state=this.readState(),dockedBounds={...(state.dockedBounds||{})};const r=this.wrapper.getBoundingClientRect(),p=gesture.placement;dockedBounds[p]={width:(p==='left'||p==='right')?0:Math.round(r.width),height:p==='bottom'?0:Math.round(r.height)};this.writeState({dockedBounds});if(p==='left'||p==='right')this.wrapper.style.setProperty('width','100%','important');window.dispatchEvent(new Event('resize'));}this.wrapper.classList.remove('is-held-resizing');gesture=null;};
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

  class SplitController {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={axis:'x',min:180,max:null,defaultSize:320,...spec};this.container=resolveElement(spec.container);this.handle=resolveElement(spec.handle,this.container||document);this.target=resolveElement(spec.target,this.container||document)||this.container;this.axis=this.spec.axis==='y'?'y':'x';this.cleanups=[];this.drag=null;
      if(!this.container||!this.handle||!this.target)throw new Error('SplitController container/handle/target not found.');
      this.key=`${hostState.storagePrefix}.${scope.owner}.split.${String(spec.id||'default')}`;
      const saved=readJson(this.key,{});this.apply(Number(saved.size)||Number(this.spec.defaultSize)||320,{persist:false});this.bind();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply(this.size,{persist:false,emit:false}));this.ro.observe(this.container);}
    }
    limits(){const rect=this.container.getBoundingClientRect();const total=this.axis==='x'?rect.width:rect.height;const min=Math.max(0,Number(this.spec.min)||0);const configured=Number(this.spec.max);const mobileOverlay=!!this.spec.mobileOverlay&&document.documentElement.classList.contains('react-native-client');const mobileRatio=Math.max(.45,Math.min(.96,Number(this.spec.mobileMaxRatio)||(this.axis==='x'?.92:.68)));const max=mobileOverlay?Math.max(min,total*mobileRatio):(Number.isFinite(configured)&&configured>0?configured:Math.max(min,total-Math.max(120,Number(this.spec.reserve)||220)));return {min,max:Math.max(min,max)};}
    apply(value,{persist=true,emit=true}={}){const {min,max}=this.limits();const next=Math.round(Math.max(min,Math.min(max,Number(value)||Number(this.spec.defaultSize)||min)));const changed=next!==this.size;this.size=next;if(this.spec.cssVar)this.container.style.setProperty(this.spec.cssVar,`${next}px`);else if(this.axis==='x')this.target.style.width=`${next}px`;else this.target.style.height=`${next}px`;if(persist)writeJson(this.key,{size:next});if(emit&&changed)this.scope.emitResize?.({reason:'split',id:this.spec.id,size:next});else this.scope.requestChartResize?.({reason:'split-observer',id:this.spec.id,size:next});return next;}
    bind(){
      const down=e=>{if(e.button!==0)return;const rect=this.container.getBoundingClientRect();this.drag={start:this.axis==='x'?e.clientX:e.clientY,size:this.size,rect,pointerId:e.pointerId};this.handle.classList.add('is-dragging');this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!this.drag||e.pointerId!==this.drag.pointerId)return;const point=this.axis==='x'?e.clientX:e.clientY;const sign=this.spec.reverse?-1:1;this.apply(this.drag.size+(point-this.drag.start)*sign,{persist:false});e.preventDefault();};
      const up=e=>{if(!this.drag||(e?.pointerId!==undefined&&e.pointerId!==this.drag.pointerId))return;this.handle.releasePointerCapture?.(this.drag.pointerId);this.drag=null;this.handle.classList.remove('is-dragging');this.apply(this.size,{persist:true});};
      const reset=e=>{e.preventDefault();this.apply(Number(this.spec.defaultSize)||320);};
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.handle.addEventListener('dblclick',reset);
      this.cleanups.push(()=>this.handle.removeEventListener('pointerdown',down),()=>window.removeEventListener('pointermove',move),()=>window.removeEventListener('pointerup',up),()=>window.removeEventListener('pointercancel',up),()=>this.handle.removeEventListener('dblclick',reset));
    }
    dispose(){this.ro?.disconnect?.();this.cleanups.splice(0).forEach(cleanupCall);}
  }

  class WorkspaceLayout {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.regions=new Map();this.created=[];
      if(!this.root)throw new Error('Workspace root not found.');
      this.root.classList.add('dkds-ui-workspace');
      if(spec.className)this.root.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      const defs=spec.regions||{};
      for(const [name,def] of Object.entries(defs))this.mapRegion(name,def);
    }
    mapRegion(name,definition={}){
      const def=isElement(definition)||typeof definition==='string'||typeof definition==='function'?{target:definition}:definition;
      let el=resolveElement(def.target||def.selector,this.root);
      if(!el&&def.create!==false){el=document.createElement(def.tag||'div');el.className=`dkds-ui-region dkds-ui-region-${name} ${def.className||''}`.trim();el.dataset.region=name;this.root.appendChild(el);this.created.push(el);}
      if(el){el.dataset.dkdsRegion=name;this.regions.set(name,el);if(def.className)el.classList.add(...String(def.className).split(/\s+/).filter(Boolean));}
      return el;
    }
    slot(name){return this.regions.get(name)||hostState.zones.get(name)||null;}
    mount(name,node,{replace=false}={}){const slot=this.slot(name);const el=resolveElement(node)||node;if(!slot||!el)return null;if(replace)slot.replaceChildren();slot.appendChild(el);return el;}
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this});}
    dispose(){for(const el of this.created)el.remove();this.root?.classList.remove('dkds-ui-workspace');this.regions.clear();}
  }

  class ChartSurface {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.plot=null;this.toolbar=null;this.ro=null;this.boundPlotEvents=[];this.disposed=false;
      if(!this.container)throw new Error('Chart container not found.');
      this.container.classList.add('dkds-chart-surface');
      if(spec.title||spec.actions?.length)this.buildChrome();
      else this.plot=this.container;
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.scope.requestChartResize?.({reason:'chart-surface-observer'}));this.ro.observe(this.container);}
      if(spec.data||spec.layout)this.set(spec);
    }
    buildChrome(){
      const head=document.createElement('div');head.className='dkds-chart-head';const title=document.createElement('strong');title.className='dkds-chart-title';title.textContent=this.spec.title||'';const actions=document.createElement('div');actions.className='dkds-chart-actions';head.append(title,actions);
      const plot=document.createElement('div');plot.className='dkds-chart-plot';this.container.append(head,plot);this.plot=plot;
      if(this.spec.actions?.length)this.toolbar=new ActionGroup(this.scope.owner,actions,{activity:this.spec.activity,actions:this.spec.actions});
    }
    async set(spec={}){
      this.spec={...this.spec,...spec};if(!this.plot||!window.DKDSCharts?.react)return false;
      const config={responsive:true,displaylogo:false,...(this.spec.config||{})};
      const layout={autosize:true,...(this.spec.layout||{})};
      await window.DKDSCharts.react(this.plot,this.spec.data||this.spec.traces||[],layout,config);
      this.bindPlotEvents();return true;
    }
    bindPlotEvents(){
      for(const off of this.boundPlotEvents)try{off?.();}catch{}
      this.boundPlotEvents=[];
      const events={dkds_chart_click:'onClick',dkds_chart_doubleclick:'onDoubleClick',dkds_chart_hover:'onHover',dkds_chart_unhover:'onUnhover',dkds_chart_selected:'onSelected',dkds_chart_relayout:'onRelayout'};
      for(const [eventName,key] of Object.entries(events)){const fn=this.spec[key];if(typeof fn!=='function')continue;const off=window.DKDSCharts?.bind?.(this.scope.owner,this.plot,eventName,payload=>fn(payload,this));if(typeof off==='function')this.boundPlotEvents.push(off);}
    }
    resize(){try{window.DKDSCharts?.resize?.(this.plot);}catch{}}
    portable(id,spec={}){return this.scope.panels.create(id,this.container,{title:this.spec.title||spec.title,...spec});}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.toolbar?.dispose?.();for(const off of this.boundPlotEvents.splice(0))try{off?.();}catch{}try{window.DKDSCharts?.purge?.(this.plot);}catch{}const i=this.scope?.charts?.indexOf?.(this);if(Number.isInteger(i)&&i>=0)this.scope.charts.splice(i,1);}
  }

  class PlotView {
    constructor(scope,id,card,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'plot');this.card=resolveElement(card);this.spec={copy:true,images:true,csv:true,portable:true,...spec};this.cleanups=[];this.portable=null;this.disposed=false;
      if(!this.card)throw new Error(`PlotView card not found: ${this.id}`);
      this.card.classList.add('dkds-plot-view');
      this.plot=resolveScopedElement(this.spec.plot||'.analysis-chart,.dkds-chart-plot,.dkds-scientific-chart-host',this.card)||this.card.querySelector('.analysis-chart')||this.card;
      this.header=resolveScopedElement(this.spec.header||'[data-dkds-plot-header],.analysis-chart-title,.dkds-chart-head',this.card);
      if(!this.header){this.header=document.createElement('div');this.header.className='dkds-plot-view-head';this.card.prepend(this.header);}
      this.header.classList.add('dkds-plot-view-head');
      this.ensureTitle();this.ensureActions();this.bindStandardActions();this.bindPortable();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.card);}
    }
    configure(spec={}){
      this.spec={...this.spec,...spec};
      if(spec.plot!==undefined){const next=resolveScopedElement(spec.plot,this.card)||resolveElement(spec.plot);if(next)this.plot=next;}
      if(spec.fileStem!==undefined||spec.csv!==undefined||spec.copyText!==undefined||spec.exportImage!==undefined||spec.actions!==undefined){
        this.exportMenu?.dispose?.();this.exportMenu=null;
        this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());
        this.bindStandardActions();
      }
      return this;
    }
    ensureTitle(){
      let title=this.header.querySelector('.dkds-plot-view-title');
      if(title){this.title=title;return;}
      const actionsExisting=this.header.querySelector('[data-dkds-plot-actions],.dkds-plot-view-actions,.dkds-chart-actions');
      const wrap=document.createElement('span');wrap.className='dkds-plot-view-title';
      if(this.spec.titleHtml!==undefined)wrap.innerHTML=String(this.spec.titleHtml||'');
      else if(this.spec.title!==undefined)wrap.textContent=String(this.spec.title||'');
      else{
        const nodes=[...this.header.childNodes].filter(node=>node!==actionsExisting);
        for(const node of nodes)wrap.appendChild(node);
      }
      this.header.insertBefore(wrap,this.header.firstChild||null);this.title=wrap;
    }
    ensureActions(){
      this.actions=resolveScopedElement(this.spec.actionsHost||'[data-dkds-plot-actions],.dkds-plot-view-actions,.dkds-chart-actions',this.header);
      if(!this.actions){this.actions=document.createElement('span');this.actions.className='dkds-plot-view-actions';this.header.appendChild(this.actions);}
      this.actions.classList.add('dkds-plot-view-actions','dkds-integrated-action-group');
    }
    invokeAction(handler,event){return Promise.resolve(handler?.(event)).catch(err=>{console.error('[DKDS PlotView]',err);hostState.status?.(`图表操作失败：${err.message}`);});}
    button(label,title,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title||label;b.className='dkds-plot-view-action';const fn=e=>{e.preventDefault();e.stopPropagation();this.invokeAction(handler,e);};b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;}
    menuButton({icon='⋯',title='图表操作',items=[]}={}){
      if(!Array.isArray(items)||!items.length)return null;
      const b=document.createElement('button');b.type='button';b.className='dkds-plot-view-action dkds-plot-view-menu-trigger dkds-portable-placement-trigger';b.title=title;b.setAttribute('aria-label',title);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');
      const iconMarkup=icon==='file'?'<svg class="dkds-plot-view-file-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.75h5l3 3v9.5H4z"></path><path d="M9 1.75v3h3"></path></svg>':esc(icon);
      b.innerHTML=`<span class="dkds-portable-location-icon dkds-plot-view-menu-icon">${iconMarkup}</span><span class="dkds-portable-caret">▾</span>`;
      const fn=e=>{
        e.preventDefault();e.stopPropagation();
        this.exportMenu?.dispose?.();
        const rect=b.getBoundingClientRect();
        const menu=this.exportMenu=new ContextMenu(this.owner,{onClose:()=>b.setAttribute('aria-expanded','false')});
        b.setAttribute('aria-expanded','true');
        menu.open({x:rect.left,y:rect.bottom+4,items});
      };
      b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;
    }
    plotNode(){return this.spec.getPlot?.()||this.plot;}
    fileStem(){return String(typeof this.spec.fileStem==='function'?this.spec.fileStem(this):this.spec.fileStem||this.title?.textContent||this.id).trim().replace(/[\\/:*?\"<>|]+/g,'_')||this.id;}
    traceCsv(){
      if(typeof this.spec.csv==='function')return String(this.spec.csv(this)||'');
      const plot=this.plotNode(),traces=Array.from(plot?.data||[]),lines=[];
      const quote=v=>{const s=String(v??'');return /[\",\r\n]/.test(s)?`\"${s.replace(/\"/g,'\"\"')}\"`:s;};
      let hasHeatmap=false;
      for(const tr of traces){if(Array.isArray(tr?.z)&&Array.isArray(tr.z[0])){hasHeatmap=true;break;}}
      if(hasHeatmap){lines.push('series,x,y,z');for(const tr of traces){if(!Array.isArray(tr?.z)||!Array.isArray(tr.z[0]))continue;const xs=Array.isArray(tr.x)?tr.x:tr.z[0].map((_,i)=>i),ys=Array.isArray(tr.y)?tr.y:tr.z.map((_,i)=>i);for(let r=0;r<tr.z.length;r++)for(let c=0;c<(tr.z[r]||[]).length;c++)lines.push([tr.name||this.title?.textContent||this.id,xs[c],ys[r],tr.z[r][c]].map(quote).join(','));}return lines.join('\n');}
      lines.push('series,x,y');for(const tr of traces){const xs=Array.from(tr?.x||[]),ys=Array.from(tr?.y||[]),n=Math.max(xs.length,ys.length);for(let i=0;i<n;i++)lines.push([tr?.name||this.title?.textContent||this.id,xs[i]??i,ys[i]??''].map(quote).join(','));}return lines.join('\n');
    }
    async saveText(text,name,ext='csv'){
      if(typeof this.spec.saveText==='function')return this.spec.saveText({content:text,defaultName:name,extension:ext,view:this});
      if(window.electronAPI?.saveText)return window.electronAPI.saveText({defaultName:name,content:text,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});
      const blob=new Blob([text],{type:ext==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
    }
    async exportCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可导出的数据。');return this.saveText(csv,`${this.fileStem()}.csv`,'csv');}
    async copyCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可复制的数据。');if(typeof this.spec.copyText==='function')return this.spec.copyText(csv,`${this.title?.textContent||this.id} 数据`);if(window.electronAPI?.copyText)return window.electronAPI.copyText(csv);if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(csv);throw new Error('当前环境不支持复制。');}
    async exportImage(format){
      const plot=this.plotNode();if(!plot)throw new Error('图表尚未渲染。');
      if(typeof this.spec.exportImage==='function')return this.spec.exportImage({format,plot,fileStem:this.fileStem(),view:this});
      const data=await window.DKDSCharts.toImage(plot,{format,width:1500,height:950,scale:format==='png'?2:1});
      if(format==='svg'){const raw=data.split(',')[1]||'',content=decodeURIComponent(raw);return this.saveText(content,`${this.fileStem()}.svg`,'svg');}
      const base64=data.split(',')[1]||'';
      if(window.electronAPI?.saveBase64)return window.electronAPI.saveBase64({defaultName:`${this.fileStem()}.png`,base64,filters:[{name:'PNG',extensions:['png']}]});
      const a=document.createElement('a');a.href=data;a.download=`${this.fileStem()}.png`;document.body.appendChild(a);a.click();a.remove();return true;
    }
    bindStandardActions(){
      const exportItems=[];
      if(this.spec.csv!==false)exportItems.push({id:'csv',label:'数据 CSV',onInvoke:e=>this.invokeAction(()=>this.exportCsv(),e)});
      if(this.spec.copy!==false)exportItems.push({id:'copy',label:'复制数据',onInvoke:e=>this.invokeAction(()=>this.copyCsv(),e)});
      if(this.spec.images!==false){exportItems.push({id:'svg',label:'图形 SVG',onInvoke:e=>this.invokeAction(()=>this.exportImage('svg'),e)},{id:'png',label:'图形 PNG',onInvoke:e=>this.invokeAction(()=>this.exportImage('png'),e)});}
      this.menuButton({icon:'file',title:'图表数据与图像',items:exportItems});
      for(const action of this.spec.actions||[])this.button(action.label||action.id,action.title,()=>action.onInvoke?.({view:this,plot:this.plotNode()}));
    }
    bindPortable(){
      if(this.spec.portable===false)return;
      const placements=Array.isArray(this.spec.placements)?this.spec.placements:['home','global'];
      const portableSpec={title:this.spec.portableTitle||this.title?.textContent||this.id,useTargetAsWrapper:true,handle:this.header,controlsHost:this.actions,controlsPlacement:'start',placements,defaultPlacement:this.spec.defaultPlacement||'home',stateVersion:this.spec.stateVersion||'plot-view-v1',snap:this.spec.snap,...(this.spec.portableSpec||{})};
      const factory=this.spec.portableFactory;
      this.portable=typeof factory==='function'?factory(this.id,this.card,portableSpec):this.scope.panels.create(this.id,this.card,portableSpec);
    }
    resize(reason='resize'){this.scope.requestChartResize?.({id:this.id,reason:`plot-view-${reason}`});const plot=this.plotNode();if(plot){try{window.DKDSCharts?.resize?.(plot);}catch{}}return this;}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.exportMenu?.dispose?.();this.exportMenu=null;this.cleanups.splice(0).forEach(cleanupCall);this.portable?.dispose?.();this.portable=null;this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());this.card?.classList?.remove('dkds-plot-view');this.header?.classList?.remove('dkds-plot-view-head');}
  }

  class PlotViewRegistry {
    constructor(scope){this.scope=scope;this.byId=new Map();this.byCard=new WeakMap();this.observers=[];}
    bind(id,card,spec={}){
      const node=resolveElement(card);if(!node)throw new Error(`PlotView card not found: ${id}`);
      const key=String(id||node.dataset?.plotViewId||'plot');let view=this.byCard.get(node)||this.byId.get(key)||null;
      if(view&&(view.disposed||view.card!==node))view=null;
      if(view){view.configure?.(spec);this.byId.set(key,view);return view;}
      view=this.scope.trackObject(new PlotView(this.scope,key,node,spec));this.byCard.set(node,view);this.byId.set(key,view);node.dataset.dkdsPlotViewBound='1';return view;
    }
    cards(root){
      const node=resolveElement(root);if(!node)return[];const selector='[data-dkds-plot-card],.analysis-chart-card,.dkds-chart-surface';const rows=[];
      if(node.matches?.(selector))rows.push(node);for(const el of node.querySelectorAll?.(selector)||[])rows.push(el);return [...new Set(rows)];
    }
    hydrate(root,spec={}){
      const rows=[];for(const card of this.cards(root)){
        const bound=this.byCard.get(card);if(bound&&!bound.disposed){rows.push(bound);continue;}
        const plot=resolveScopedElement(spec.plotSelector||'[data-dkds-plot],.analysis-chart,.dkds-chart-plot,.dkds-scientific-chart-host',card);if(!plot)continue;
        const header=resolveScopedElement(spec.headerSelector||'[data-dkds-plot-header],.analysis-chart-title,.dkds-chart-head',card);
        const plotId=String(plot.id||card.dataset?.plotId||card.dataset?.groupMetric||`plot-${this.byId.size+1}`);const alreadyPrime=card.dataset.dkdsPrimeOwned==='1'||card.classList.contains('dkds-portable-view');
        const base={plot,header,portable:alreadyPrime?false:spec.portable!==false,placements:spec.placements||['home','left','right','bottom','global'],defaultPlacement:spec.defaultPlacement||'home',stateVersion:spec.stateVersion||'plot-view-v2',portableFactory:spec.portableFactory};
        try{rows.push(this.bind(`auto:${plotId}`,card,base));}catch(err){console.warn('[DKDS PlotView hydrate]',plotId,err);}
      }return rows;
    }
    observe(root,spec={}){
      const node=resolveElement(root);if(!node)return()=>{};let queued=false;const run=()=>{queued=false;this.hydrate(node,spec);};const schedule=()=>{if(queued)return;queued=true;queueMicrotask(run);};schedule();
      if(!window.MutationObserver)return()=>{};const observer=new MutationObserver(schedule);observer.observe(node,{childList:true,subtree:true});this.observers.push(observer);return()=>{observer.disconnect();const i=this.observers.indexOf(observer);if(i>=0)this.observers.splice(i,1);};
    }
    get(id){return this.byId.get(String(id||''))||null;}
    dispose(){for(const observer of this.observers)observer.disconnect();this.observers=[];this.byId.clear();this.byCard=new WeakMap();}
  }

  class ViewHost {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.controller=spec.controller||null;this.cleanup=null;this.unsubscribe=null;this.ro=null;this.mounted=false;
      if(!this.container)throw new Error('ViewHost container not found.');
      this.container.classList.add('dkds-view-host');
      this.mount();
    }
    context(reason='render'){return {scope:this.scope,container:this.container,controller:this.controller,reason,host:hostState};}
    mount(){
      if(this.mounted)return this;this.mounted=true;
      try{const out=this.spec.mount?.(this.context('mount'));if(typeof out==='function')this.cleanup=out;}catch(err){console.error('[DKDS view mount]',err);}
      const source=this.controller?.subscribe?this.controller:(this.spec.store?.subscribe?this.spec.store:null);
      if(source)this.unsubscribe=source.subscribe(()=>this.render('state'));
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}
      this.render('mount');return this;
    }
    render(reason='render'){if(!this.mounted)return;try{this.spec.render?.(this.context(reason));}catch(err){console.error('[DKDS view render]',err);hostState.status?.(`界面渲染失败：${err.message}`);}return this;}
    resize(reason='resize'){if(!this.mounted)return;try{this.spec.resize?.(this.context(reason));}catch(err){console.warn('[DKDS view resize]',err);}return this;}
    setController(controller){cleanupCall(this.unsubscribe);this.unsubscribe=null;this.controller=controller||null;if(this.controller?.subscribe)this.unsubscribe=this.controller.subscribe(()=>this.render('state'));this.render('controller');return this;}
    move(container){const next=resolveElement(container);if(!next||next===this.container)return this;this.ro?.disconnect?.();this.container=next;this.container.classList.add('dkds-view-host');if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}this.render('move');return this;}
    dispose(){if(!this.mounted)return;this.mounted=false;cleanupCall(this.unsubscribe);cleanupCall(this.cleanup);this.ro?.disconnect?.();try{this.spec.unmount?.(this.context('unmount'));}catch(err){console.warn('[DKDS view unmount]',err);}this.container?.classList?.remove('dkds-view-host');}
  }

  class Workbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.views=new Map();this.active='';this.splitter=null;this.split=null;this.portableZones=new Map();
      if(!this.root)throw new Error('Workbench root not found.');
      this.root.classList.add('dkds-workbench');
      if(spec.existing===true){
        this.root.classList.add('dkds-workbench-existing');
        this.layout=new WorkspaceLayout(scope,this.root,{regions:spec.regions||{}});
        this.createPortableZones();
        if(spec.split&&spec.split.enabled!==false)this.mountExistingSplit(spec.split);
        return;
      }
      const showHeader=spec.header!==false,showTabs=spec.tabs!==false;
      this.root.innerHTML=`${showHeader?'<header class="dkds-workbench-header"><div class="dkds-workbench-heading"><h2></h2><div class="dkds-workbench-subtitle"></div></div><div class="dkds-workbench-actions"></div></header>':''}${showTabs?'<div class="dkds-workbench-tabs"></div>':''}<div class="dkds-workbench-grid"><aside class="dkds-workbench-left"></aside><main class="dkds-workbench-main"></main><aside class="dkds-workbench-right"></aside><section class="dkds-workbench-bottom"></section><div class="dkds-workbench-overlay"></div></div>`;
      const h=this.root.querySelector('h2');if(h)h.textContent=spec.title||'';const st=this.root.querySelector('.dkds-workbench-subtitle');if(st)st.textContent=spec.subtitle||'';
      this.layout=new WorkspaceLayout(scope,this.root.querySelector('.dkds-workbench-grid'),{regions:{left:{target:'.dkds-workbench-left'},main:{target:'.dkds-workbench-main'},right:{target:'.dkds-workbench-right'},bottom:{target:'.dkds-workbench-bottom'},overlay:{target:'.dkds-workbench-overlay'}}});
      this.portableLayout=this.layout;
      const actionHost=this.root.querySelector('.dkds-workbench-actions');if(spec.actions&&actionHost)this.actions=new ActionGroup(scope.owner,actionHost,{activity:spec.activity,actions:spec.actions});
      for(const view of spec.views||[])this.registerView(view);
      if(spec.defaultView||this.views.size)this.activate(spec.defaultView||this.views.keys().next().value);
    }
    createPortableZones(){
      const make=(name)=>{const el=document.createElement('div');el.className=`dkds-portable-zone dkds-portable-zone-${name}`;el.dataset.portableZone=name;this.root.appendChild(el);this.portableZones.set(name,el);return el;};
      for(const name of ['left','right','bottom'])make(name);
      const semanticOverlay=this.layout.slot('overlay');
      this.portableLayout={slot:(name)=>name==='overlay'?(semanticOverlay||hostState.zones.get('overlay')||this.root):(this.portableZones.get(name)||this.layout.slot(name)||hostState.zones.get(name)||null)};
      return this.portableLayout;
    }
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this.portableLayout||this.layout});}
    mountExistingSplit(splitSpec={}){
      const left=this.layout.slot(splitSpec.region||'left');const main=this.layout.slot(splitSpec.mainRegion||'main');if(!left||!main)return null;
      this.root.classList.add('dkds-workbench-existing-split');
      const handle=document.createElement('div');handle.className='dkds-workbench-splitter';handle.tabIndex=0;handle.title='拖动调整侧栏宽度；双击恢复默认';
      if(left.nextSibling)this.root.insertBefore(handle,left.nextSibling);else this.root.appendChild(handle);this.splitter=handle;
      this.split=new SplitController(this.scope,{id:splitSpec.id||'workbench-left',container:this.root,handle,target:left,axis:'x',min:splitSpec.min||190,max:splitSpec.max||null,reserve:splitSpec.reserve||360,defaultSize:splitSpec.defaultSize||300});
      return this.split;
    }
    registerView(view={}){const id=String(view.id||'');if(!id)throw new Error('Workbench view id required.');this.views.set(id,{...view,id});this.renderTabs();return this;}
    renderTabs(){const host=this.root.querySelector('.dkds-workbench-tabs');if(!host)return;host.innerHTML='';for(const view of [...this.views.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.dataset.viewId=view.id;b.className='dkds-workbench-tab';b.textContent=view.label||view.title||view.id;b.classList.toggle('active',view.id===this.active);b.onclick=()=>this.activate(view.id);host.appendChild(b);}}
    activate(id){const next=this.views.get(String(id));if(!next)return false;const main=this.layout.slot('main');if(!main)return false;const previous=this.views.get(this.active);try{previous?.unmount?.({workbench:this,scope:this.scope,container:main});}catch(err){console.warn('[DKDS workbench unmount]',err);}this.active=next.id;main.replaceChildren();if(typeof next.mount==='function')next.mount({workbench:this,scope:this.scope,container:main,layout:this.layout});else if(next.html!==undefined)main.innerHTML=typeof next.html==='function'?next.html():String(next.html);this.renderTabs();this.scope.emitResize({reason:'workbench-view',viewId:next.id});return true;}
    dispose(){try{this.views.get(this.active)?.unmount?.({workbench:this,scope:this.scope,container:this.layout.slot('main')});}catch{}this.actions?.dispose?.();this.split?.dispose?.();this.splitter?.remove?.();for(const zone of this.portableZones.values())zone.remove();this.portableZones.clear();this.layout?.dispose?.();if(this.spec.existing===true){this.root.classList.remove('dkds-workbench','dkds-workbench-existing','dkds-workbench-existing-split');}else this.root.replaceChildren();}
  }


  class GridController {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.columns=Math.max(1,Number(spec.columns)||3);this.minItemWidth=Math.max(180,Number(spec.minItemWidth)||320);this.maxColumns=Math.max(this.columns,Number(spec.maxColumns)||6);this.ro=null;this.appliedColumns=0;
      if(!this.container)throw new Error('GridController container not found.');
      this.container.classList.add('dkds-managed-grid');this.container.__dkdsGridController=this;
      this.apply();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply());this.ro.observe(this.container);}
    }
    responsiveColumns(){
      if(this.spec.responsive===false)return this.columns;
      const width=Math.max(0,this.container.clientWidth||0);
      if(!width)return this.columns;
      return Math.max(1,Math.min(this.columns,this.maxColumns,Math.floor((width+10)/(this.minItemWidth+10))||1));
    }
    applyStickyAvoidance(cols){
      const children=[...this.container.children].filter(node=>node?.nodeType===1);
      for(const child of children){if(child.dataset?.dkdsGridAvoidance==='1'){child.style.removeProperty('grid-column');child.style.removeProperty('grid-row');delete child.dataset.dkdsGridAvoidance;}}
      this.container.classList.remove('dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');
      const sticky=children.filter(child=>child.classList?.contains('is-sticky'));
      if(!sticky.length)return;
      if(cols<2){this.container.classList.add('dkds-grid-sticky-disabled');return;}
      // Reserve one grid column for the first sticky view. All sibling plots are
      // deterministically packed into the remaining cells, so pinning one plot
      // never visually covers another plot on desktop or mobile.
      const anchor=sticky[0],anchorIndex=Math.max(0,children.indexOf(anchor)),anchorCol=Math.min(cols,(anchorIndex%cols)+1),available=[];
      for(let col=1;col<=cols;col++)if(col!==anchorCol)available.push(col);
      const others=children.filter(child=>child!==anchor);let row=1,index=0;
      for(const child of others){const col=available[index%available.length];row=Math.floor(index/available.length)+1;child.style.setProperty('grid-column',String(col));child.style.setProperty('grid-row',String(row));child.dataset.dkdsGridAvoidance='1';index++;}
      const rows=Math.max(1,Math.ceil(others.length/available.length));anchor.style.setProperty('grid-column',String(anchorCol));anchor.style.setProperty('grid-row',`1 / span ${rows}`);anchor.dataset.dkdsGridAvoidance='1';this.container.classList.add('dkds-grid-sticky-avoidance');
    }
    apply(){const cols=this.responsiveColumns();const changed=cols!==this.appliedColumns;this.appliedColumns=cols;this.container.style.setProperty('--dkds-grid-columns',String(cols));this.container.dataset.dkdsGridColumns=String(cols);this.applyStickyAvoidance(cols);if(changed)this.scope.emitResize?.({reason:'grid',columns:cols});else this.scope.requestChartResize?.({reason:'grid-observer',columns:cols});return cols;}
    setColumns(value){this.columns=Math.max(1,Math.min(this.maxColumns,Number(value)||1));this.apply();return this.columns;}
    getColumns(){return this.columns;}
    dispose(){this.ro?.disconnect?.();if(this.container.__dkdsGridController===this)delete this.container.__dkdsGridController;for(const child of this.container.children){if(child.dataset?.dkdsGridAvoidance==='1'){child.style.removeProperty('grid-column');child.style.removeProperty('grid-row');delete child.dataset.dkdsGridAvoidance;}}this.container.classList.remove('dkds-managed-grid','dkds-grid-sticky-avoidance','dkds-grid-sticky-disabled');this.container.style.removeProperty('--dkds-grid-columns');delete this.container.dataset.dkdsGridColumns;}
  }
