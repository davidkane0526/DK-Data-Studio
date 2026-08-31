'use strict';
const {hostState, isElement, resolveElement, cleanupCall, readJson, writeJson}=require('../foundation/shortcuts');


  class SplitController {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={axis:'x',min:180,max:null,defaultSize:320,...spec};this.container=resolveElement(spec.container);this.handle=resolveElement(spec.handle,this.container||document);this.target=resolveElement(spec.target,this.container||document)||this.container;this.axis=this.spec.axis==='y'?'y':'x';this.cleanups=[];this.drag=null;this.previewFrame=0;this.previewSize=null;
      if(!this.container||!this.handle||!this.target)throw new Error('SplitController container/handle/target not found.');
      this.handle.dataset.dkdsTouchGestureOwner='split-resize';
      this.key=`${hostState.storagePrefix}.${scope.owner}.split.${String(spec.id||'default')}`;
      const saved=readJson(this.key,{});this.apply(Number(saved.size)||Number(this.spec.defaultSize)||320,{persist:false});this.bind();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>{if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.apply(this.size,{persist:false,emit:false});});this.ro.observe(this.container);}
    }
    limits(){const rect=this.container.getBoundingClientRect();const total=this.axis==='x'?rect.width:rect.height;const min=Math.max(0,Number(this.spec.min)||0);const configured=Number(this.spec.max);const mobileOverlay=!!this.spec.mobileOverlay&&document.documentElement.classList.contains('react-native-client');const mobileRatio=Math.max(.45,Math.min(.96,Number(this.spec.mobileMaxRatio)||(this.axis==='x'?.92:.68)));const max=mobileOverlay?Math.max(min,total*mobileRatio):(Number.isFinite(configured)&&configured>0?configured:Math.max(min,total-Math.max(120,Number(this.spec.reserve)||220)));return {min,max:Math.max(min,max)};}
    apply(value,{persist=true,emit=true,notify=true}={}){const {min,max}=this.limits();const next=Math.round(Math.max(min,Math.min(max,Number(value)||Number(this.spec.defaultSize)||min)));const changed=next!==this.size;this.size=next;if(this.spec.cssVar)this.container.style.setProperty(this.spec.cssVar,`${next}px`);else if(this.axis==='x')this.target.style.width=`${next}px`;else this.target.style.height=`${next}px`;if(persist)writeJson(this.key,{size:next});if(notify){if(emit&&changed)this.scope.emitResize?.({reason:'split',id:this.spec.id,size:next});else this.scope.requestChartResize?.({reason:'split-observer',id:this.spec.id,size:next});}return next;}
    schedulePreview(value){
      this.previewSize=value;if(this.previewFrame)return;
      const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.previewFrame=raf(()=>{this.previewFrame=0;const next=this.previewSize;this.previewSize=null;if(next!==null)this.apply(next,{persist:false,emit:false,notify:false});});
    }
    flushPreview(){
      if(this.previewFrame){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.previewFrame);}catch{}this.previewFrame=0;}
      const next=this.previewSize;this.previewSize=null;if(next!==null)this.apply(next,{persist:false,emit:false,notify:false});
    }
    bind(){
      const down=e=>{if(e.button!==0)return;const rect=this.container.getBoundingClientRect();this.flushPreview();this.drag={start:this.axis==='x'?e.clientX:e.clientY,size:this.size,rect,pointerId:e.pointerId};document.documentElement?.classList?.add('dkds-split-drag-active');this.scope.resizeScheduler?.suspend?.();this.handle.classList.add('is-dragging');this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!this.drag||e.pointerId!==this.drag.pointerId)return;const point=this.axis==='x'?e.clientX:e.clientY;const sign=this.spec.reverse?-1:1;this.schedulePreview(this.drag.size+(point-this.drag.start)*sign);e.preventDefault();};
      const up=e=>{if(!this.drag||(e?.pointerId!==undefined&&e.pointerId!==this.drag.pointerId))return;this.handle.releasePointerCapture?.(this.drag.pointerId);this.flushPreview();this.drag=null;document.documentElement?.classList?.remove('dkds-split-drag-active');this.handle.classList.remove('is-dragging');this.apply(this.size,{persist:true,emit:false,notify:false});this.scope.resizeScheduler?.resume?.();this.scope.emitResize?.({reason:'split-end',id:this.spec.id,size:this.size});};
      const reset=e=>{e.preventDefault();this.flushPreview();this.apply(Number(this.spec.defaultSize)||320);};
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.handle.addEventListener('dblclick',reset);
      this.cleanups.push(()=>this.handle.removeEventListener('pointerdown',down),()=>window.removeEventListener('pointermove',move),()=>window.removeEventListener('pointerup',up),()=>window.removeEventListener('pointercancel',up),()=>this.handle.removeEventListener('dblclick',reset));
    }
    dispose(){document.documentElement?.classList?.remove('dkds-split-drag-active');this.flushPreview();this.scope.resizeScheduler?.resume?.();this.ro?.disconnect?.();this.cleanups.splice(0).forEach(cleanupCall);}
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
    apply(value,{persist=true,clamp=true}={}){this.position={x:Number(value?.x)||0,y:Number(value?.y)||0};this.target.style.translate=`${Math.round(this.position.x)}px ${Math.round(this.position.y)}px`;if(clamp)this.clamp({persist:false});if(persist&&this.spec.persist!==false)writeJson(this.key,this.position);return {...this.position};}
    clamp({persist=false}={}){const r=this.target.getBoundingClientRect(),b=this.bounds();let x=this.position.x,y=this.position.y;if(r.left<b.left)x+=b.left-r.left;if(r.right>b.right)x-=r.right-b.right;if(r.top<b.top)y+=b.top-r.top;if(r.bottom>b.bottom)y-=r.bottom-b.bottom;if(x!==this.position.x||y!==this.position.y){this.position={x,y};this.target.style.translate=`${Math.round(x)}px ${Math.round(y)}px`;}if(persist&&this.spec.persist!==false)writeJson(this.key,this.position);return {...this.position};}
    reset({persist=true}={}){return this.apply({x:0,y:0},{persist});}
    bind(){
      const previousTouch=this.handle.style.touchAction;this.handle.style.touchAction='none';
      const down=e=>{if(e.button!==undefined&&e.button!==0)return;if(e.target.closest('button,input,select,textarea,a,[role="button"]'))return;const r=this.target.getBoundingClientRect();this.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:this.position.x,baseY:this.position.y,rect:r,bounds:this.bounds()};this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{const d=this.drag;if(!d||e.pointerId!==d.id)return;const rawX=e.clientX-d.startX,rawY=e.clientY-d.startY;const dx=Math.max(d.bounds.left-d.rect.left,Math.min(d.bounds.right-d.rect.right,rawX));const dy=Math.max(d.bounds.top-d.rect.top,Math.min(d.bounds.bottom-d.rect.bottom,rawY));this.apply({x:d.baseX+dx,y:d.baseY+dy},{persist:false,clamp:false});if(e.cancelable)e.preventDefault();};
      const up=e=>{if(!this.drag||(e?.pointerId!==undefined&&e.pointerId!==this.drag.id))return;this.handle.releasePointerCapture?.(this.drag.id);this.drag=null;if(this.spec.persist!==false)writeJson(this.key,this.position);};
      const reset=e=>{if(this.spec.resetOnDoubleClick===false||e.target.closest('button,input,select,textarea,a,[role="button"]'))return;e.preventDefault();this.reset();};
      const resize=()=>this.clamp({persist:false});
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);this.handle.addEventListener('dblclick',reset);window.addEventListener('resize',resize);
      this.cleanups.push(()=>{this.handle.style.touchAction=previousTouch;this.handle.removeEventListener('pointerdown',down);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);this.handle.removeEventListener('dblclick',reset);window.removeEventListener('resize',resize);});
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
      if(el){el.dataset.dkdsRegion=name;this.regions.set(name,el);if(def.className)el.classList.add(...String(def.className).split(/\s+/).filter(Boolean));}
      return el;
    }
    slot(name){return this.regions.get(name)||hostState.zones.get(name)||null;}
    mount(name,node,{replace=false}={}){const slot=this.slot(name);const el=resolveElement(node)||node;if(!slot||!el)return null;if(replace)slot.replaceChildren();slot.appendChild(el);return el;}
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this});}
    dispose(){for(const el of this.created)el.remove();this.root?.classList.remove('dkds-ui-workspace');this.regions.clear();}
  }

module.exports=Object.freeze({SplitController, MovableSurface, WorkspaceLayout});
