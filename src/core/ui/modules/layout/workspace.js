'use strict';
const {hostState, isElement, resolveElement, cleanupCall, readJson, writeJson}=require('../foundation/shortcuts');
const {createLayoutState,withLayoutPreference,withLayoutIntent,resolveLayout,serializeLayoutState,applyScrollPolicy}=require('./state-resolver');
const StyleGate=require('ui/style-ownership-gate');
const STYLE_SOURCE='src/core/ui/modules/layout/workspace.js';
const splitSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.split-controller',scope:'runtime-layout',source:STYLE_SOURCE});
const splitToken=(el,property,value)=>StyleGate.setToken(el,property,value,{owner:'core.split-controller',scope:'runtime-layout-token',source:STYLE_SOURCE});
const movableSet=(el,property,value)=>StyleGate.set(el,property,value,{owner:'core.movable-surface',scope:'runtime-layout',source:STYLE_SOURCE});
const movableRemove=(el,property)=>StyleGate.remove(el,property,{owner:'core.movable-surface',scope:'runtime-layout',source:STYLE_SOURCE});
const MOBILE_SPLIT_STATE_SCHEMA='workspace-owned-v2';


  class SplitController {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={axis:'x',min:180,max:null,defaultSize:320,...spec};this.container=resolveElement(spec.container);this.handle=resolveElement(spec.handle,this.container||document);this.target=resolveElement(spec.target,this.container||document)||this.container;this.axis=this.spec.axis==='y'?'y':'x';this.cleanups=[];this.drag=null;this.previewFrame=0;this.previewSize=null;this.previewActive=false;this.previewViewport=null;this.resolved=null;
      if(!this.container||!this.handle||!this.target)throw new Error('SplitController container/handle/target not found.');
      this.handle.dataset.dkdsTouchGestureOwner='split-resize';
      const mobileScoped=!!this.spec.mobileStateScope&&document.documentElement?.classList?.contains('react-native-client');
      this.key=`${hostState.storagePrefix}.${scope.owner}.split.${String(spec.id||'default')}${mobileScoped?`.mobile.${MOBILE_SPLIT_STATE_SCHEMA}`:''}`;
      const restored=readJson(this.key,{});
      this.persistedPreference=(Number(restored?.size)>0)||(Number(restored?.ratio)>0);
      this.runtimeMinimum=null;this.runtimeDefault=null;
      this.state=createLayoutState(this.spec,restored);this.size=0;this.applyPreferred({persist:false,emit:false});this.bind();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>{
        if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;
        if(!this.container?.isConnected||this.container.hidden||this.container.closest?.('.hidden,[hidden]'))return;
        const rect=this.container.getBoundingClientRect?.();const total=this.axis==='x'?Number(rect?.width):Number(rect?.height);
        if(!(total>2))return;
        this.applyPreferred({persist:false,emit:false});
      });this.ro.observe(this.container);}
    }
    platformProfile(){const root=document.documentElement;return {nativeMobile:root?.dataset?.dkdsHost==='mobile'&&root?.classList?.contains?.('react-native-client')};}
    viewport(rect=null){const row=rect||this.container.getBoundingClientRect?.()||{};return {width:Number(row.width)||0,height:Number(row.height)||0};}
    runtimeState(state=this.state){
      const profile=this.platformProfile();
      if(!profile.nativeMobile||!Number.isFinite(this.runtimeMinimum))return state;
      return Object.freeze({...state,min:Math.max(0,Number(this.runtimeMinimum)||0)});
    }
    resolve(value=this.state.preferredSize,viewport=this.previewViewport||this.viewport()){
      const state=this.runtimeState(this.state),candidate=withLayoutPreference(state,value,viewport);return resolveLayout(candidate,viewport,this.platformProfile());
    }
    limits(){const row=this.resolve();return {min:row.min,max:row.max};}
    hasPersistedPreference(){return this.persistedPreference===true;}
    setRuntimeMinimum(value,{apply=false}={}){const number=Number(value);this.runtimeMinimum=Number.isFinite(number)?Math.max(0,number):null;if(apply)this.applyPreferred({persist:false,emit:false});return this.runtimeMinimum;}
    setRuntimeDefault(value){const number=Number(value);this.runtimeDefault=Number.isFinite(number)&&number>0?number:null;return this.runtimeDefault;}
    clampSize(value){return this.resolve(value).effectiveSize;}
    paintResolved(row){const next=row.effectiveSize,changed=next!==this.size;this.resolved=row;this.size=next;if(this.spec.cssVar)splitToken(this.container,this.spec.cssVar,row.track);else if(this.axis==='x')splitSet(this.target,'width',row.track);else splitSet(this.target,'height',row.track);return changed;}
    apply(value,{persist=true,emit=true,notify=true,intent=true,viewport=null}={}){
      const measured=viewport||this.viewport();
      const nextState=intent?withLayoutPreference(this.state,value,measured):withLayoutPreference(this.state,value,measured);
      if(intent)this.state=nextState;
      const row=resolveLayout(this.runtimeState(nextState),measured,this.platformProfile());const changed=this.paintResolved(row);
      if(persist){writeJson(this.key,serializeLayoutState(this.state));this.persistedPreference=true;}
      if(notify){if(emit&&changed)this.scope.emitResize?.({reason:'split',id:this.spec.id,size:this.size});else this.scope.requestChartResize?.({reason:'split-observer',id:this.spec.id,size:this.size});}return this.size;
    }
    applyPreferred(options={}){const measured=options.viewport||this.viewport();const row=resolveLayout(this.runtimeState(this.state),measured,this.platformProfile());const changed=this.paintResolved(row);if(options.persist){writeJson(this.key,serializeLayoutState(this.state));this.persistedPreference=true;}if(options.notify!==false){if(options.emit!==false&&changed)this.scope.emitResize?.({reason:options.reason||'split-layout',id:this.spec.id,size:this.size});else this.scope.requestChartResize?.({reason:options.reason||'split-observer',id:this.spec.id,size:this.size});}return this.size;}
    setCollapsed(collapsed,{persist=false,notify=true}={}){const next=collapsed===true;if(next===this.state.collapsed)return this.size;this.state=withLayoutIntent(this.state,{collapsed:next});return this.applyPreferred({persist,notify,reason:next?'split-collapse':'split-restore'});}
    setPlacement(placement,{persist=true}={}){this.state=withLayoutIntent(this.state,{placement});if(persist)writeJson(this.key,serializeLayoutState(this.state));return this.state.placement;}
    stateSnapshot(){return Object.freeze({...this.state,effectiveSize:this.size,resolved:this.resolved});}
    beginPreview(){
      this.clearPreview();this.previewSize=null;if(this.previewActive)return;
      this.previewViewport=this.viewport(this.drag?.rect);this.previewActive=true;document.documentElement?.classList?.add('dkds-split-drag-active');this.scope.resizeScheduler?.suspend?.();this.handle.classList.add('is-dragging');
    }
    paintPreview(){
      if(this.previewSize===null||!this.previewActive)return;
      // Follow the pointer with real geometry while expensive chart/layout
      // notifications stay suspended. This path is shared by the visible split
      // seam and the held-title touch gesture used by Mobile companions.
      this.apply(this.previewSize,{persist:false,emit:false,notify:false,intent:false,viewport:this.previewViewport});
    }
    schedulePreview(value){
      const raw=Number(value);if(Number.isFinite(raw))this.previewSize=raw;if(this.previewFrame)return;
      const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.previewFrame=raf(()=>{this.previewFrame=0;this.paintPreview();});
    }
    clearPreview(){
      if(this.previewFrame){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.previewFrame);}catch{}this.previewFrame=0;}
    }
    finishPreview({persist=true,reason='split-end'}={}){
      const next=this.previewSize===null?this.size:this.previewSize;this.clearPreview();this.previewSize=null;
      this.apply(next,{persist,emit:false,notify:false,intent:true,viewport:this.previewViewport||this.viewport()});this.previewViewport=null;
      if(this.previewActive){this.previewActive=false;document.documentElement?.classList?.remove('dkds-split-drag-active');this.handle.classList.remove('is-dragging');this.scope.resizeScheduler?.resume?.();this.scope.emitResize?.({reason,id:this.spec.id,size:this.size});}
      return this.size;
    }
    bind(){
      const down=e=>{if(e.button!==0)return;const rect=this.container.getBoundingClientRect();this.drag={start:this.axis==='x'?e.clientX:e.clientY,size:this.size,rect,pointerId:e.pointerId};this.beginPreview();this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!this.drag||e.pointerId!==this.drag.pointerId)return;const point=this.axis==='x'?e.clientX:e.clientY;const sign=this.spec.reverse?-1:1;this.schedulePreview(this.drag.size+(point-this.drag.start)*sign);e.preventDefault();};
      const up=e=>{if(!this.drag||(e?.pointerId!==undefined&&e.pointerId!==this.drag.pointerId))return;this.handle.releasePointerCapture?.(this.drag.pointerId);this.drag=null;this.finishPreview({persist:true,reason:'split-end'});};
      const reset=e=>{e.preventDefault();this.clearPreview();this.previewSize=null;this.previewViewport=null;this.apply(this.runtimeDefault||this.state.defaultSize);};
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.handle.addEventListener('dblclick',reset);
      this.cleanups.push(()=>this.handle.removeEventListener('pointerdown',down),()=>window.removeEventListener('pointermove',move),()=>window.removeEventListener('pointerup',up),()=>window.removeEventListener('pointercancel',up),()=>this.handle.removeEventListener('dblclick',reset));
    }
    dispose(){document.documentElement?.classList?.remove('dkds-split-drag-active');this.clearPreview();this.previewSize=null;this.previewViewport=null;this.previewActive=false;this.scope.resizeScheduler?.resume?.();this.ro?.disconnect?.();this.cleanups.splice(0).forEach(cleanupCall);}
  }

  class MovableSurface {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={persist:true,resetOnDoubleClick:true,...spec};
      this.target=resolveElement(spec.target||spec.surface);this.handle=resolveElement(spec.handle,this.target||document);this.boundsElement=resolveElement(spec.bounds||spec.container)||null;this.drag=null;this.cleanups=[];
      if(!this.target||!this.handle)throw new Error('MovableSurface target/handle not found.');
      this.handle.dataset.dkdsTouchGestureOwner='movable-surface';
      this.key=`${hostState.storagePrefix}.${scope.owner}.move.${String(spec.id||'default')}`;
      this.position={x:0,y:0};
      if(this.spec.persist!==false){const saved=readJson(this.key,{});this.position.x=Number(saved.x)||0;this.position.y=Number(saved.y)||0;}
      this.target.classList.add('dkds-movable-surface');this.handle.classList.add('dkds-movable-handle');
      this.apply(this.position,{persist:false,clamp:false});this.bind();requestAnimationFrame(()=>this.clamp({persist:false}));
    }
    bounds(){const rect=this.boundsElement?.getBoundingClientRect?.();return rect||{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight,width:window.innerWidth,height:window.innerHeight};}
    apply(value,{persist=true,clamp=true}={}){this.position={x:Number(value?.x)||0,y:Number(value?.y)||0};movableSet(this.target,'translate',`${Math.round(this.position.x)}px ${Math.round(this.position.y)}px`);if(clamp)this.clamp({persist:false});if(persist&&this.spec.persist!==false)writeJson(this.key,this.position);return {...this.position};}
    clamp({persist=false}={}){const r=this.target.getBoundingClientRect(),b=this.bounds();let x=this.position.x,y=this.position.y;if(r.left<b.left)x+=b.left-r.left;if(r.right>b.right)x-=r.right-b.right;if(r.top<b.top)y+=b.top-r.top;if(r.bottom>b.bottom)y-=r.bottom-b.bottom;if(x!==this.position.x||y!==this.position.y){this.position={x,y};movableSet(this.target,'translate',`${Math.round(x)}px ${Math.round(y)}px`);}if(persist&&this.spec.persist!==false)writeJson(this.key,this.position);return {...this.position};}
    reset({persist=true}={}){return this.apply({x:0,y:0},{persist});}
    bind(){
      const previousTouch=this.handle.style.touchAction;movableSet(this.handle,'touch-action','none');
      const down=e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest('button,input,select,textarea,a,[role="button"]'))return;const r=this.target.getBoundingClientRect();this.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:this.position.x,baseY:this.position.y,rect:r,bounds:this.bounds()};this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{const d=this.drag;if(!d||e.pointerId!==d.id)return;const rawX=e.clientX-d.startX,rawY=e.clientY-d.startY;const dx=Math.max(d.bounds.left-d.rect.left,Math.min(d.bounds.right-d.rect.right,rawX));const dy=Math.max(d.bounds.top-d.rect.top,Math.min(d.bounds.bottom-d.rect.bottom,rawY));this.apply({x:d.baseX+dx,y:d.baseY+dy},{persist:false,clamp:false});if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!this.drag||(e?.pointerId!==undefined&&e.pointerId!==this.drag.id))return;this.handle.releasePointerCapture?.(this.drag.id);this.drag=null;if(this.spec.persist!==false)writeJson(this.key,this.position);};
      const reset=e=>{if(this.spec.resetOnDoubleClick===false||e.target.closest('button,input,select,textarea,a,[role="button"]'))return;e.preventDefault();this.reset();};
      const resize=()=>this.clamp({persist:false});
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.handle.addEventListener('dblclick',reset);window.addEventListener('resize',resize);
      this.cleanups.push(()=>{if(previousTouch)movableSet(this.handle,'touch-action',previousTouch);else movableRemove(this.handle,'touch-action');this.handle.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);this.handle.removeEventListener('dblclick',reset);window.removeEventListener('resize',resize);});
    }
    dispose(){this.cleanups.splice(0).forEach(cleanupCall);this.target?.classList?.remove('dkds-movable-surface');this.handle?.classList?.remove('dkds-movable-handle');}
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
      if(el){el.dataset.dkdsRegion=name;applyScrollPolicy(el,def.scrollPolicy||this.spec.scrollPolicies?.[name]||(name==='overlay'?'contain':'chain'));this.regions.set(name,el);if(def.className)el.classList.add(...String(def.className).split(/\s+/).filter(Boolean));}
      return el;
    }
    slot(name){return this.regions.get(name)||hostState.zones.get(name)||null;}
    mount(name,node,{replace=false}={}){const slot=this.slot(name);const el=resolveElement(node)||node;if(!slot||!el)return null;if(replace)slot.replaceChildren();slot.appendChild(el);return el;}
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this});}
    dispose(){for(const el of this.created)el.remove();this.root?.classList.remove('dkds-ui-workspace');this.regions.clear();}
  }

module.exports=Object.freeze({MOBILE_SPLIT_STATE_SCHEMA,SplitController, MovableSurface, WorkspaceLayout});
