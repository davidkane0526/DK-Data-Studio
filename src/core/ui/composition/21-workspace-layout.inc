
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
