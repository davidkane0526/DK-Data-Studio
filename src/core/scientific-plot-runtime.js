(() => {
  if (window.DKDSScientificPlot) return;
  const VERSION='1.0.0';
  const resolve=value=>{
    if(value?.nodeType===1)return value;
    if(typeof value==='string')return document.getElementById(value)||document.querySelector(value);
    return null;
  };
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const asId=value=>String(value??'').trim();
  const baseTraceStyle=trace=>({opacity:trace?.opacity??1,lineWidth:Number(trace?.line?.width)||1.5,markerOpacity:trace?.marker?.opacity??1,markerSize:trace?.marker?.size});

  class ScientificPlotView {
    constructor(owner,target,spec={}){
      this.owner=String(owner||'core');this.target=resolve(target);this.spec={...spec};this.disposed=false;this.bound=false;this.selectionOff=null;this.traceEntities=[];this.pointEntities=[];this.baseStyles=[];this.lastSelection=null;
      if(!this.target)throw new Error('ScientificPlot target not found.');
      this.chart=window.DKDSCharts?.createScope?.(this.owner)||window.DKDSCharts;
      this.entities=window.DKDSEntities?.createScope?.(this.owner)||null;
      this.target.classList.add('dkds-scientific-plotly');
      this.setInteraction(spec.interaction||null);
    }
    setInteraction(interaction){if(this.interaction===interaction)return;this.selectionOff?.();this.selectionOff=null;this.interaction=interaction||null;if(this.interaction?.subscribe)this.selectionOff=this.interaction.subscribe((snapshot,meta)=>{this.lastSelection=snapshot;this.applySelection(snapshot,meta);},{immediate:true});}
    registerEntity(input,parentIds=[]){if(!input)return null;const raw=typeof input==='string'?{id:input}:input;if(!raw?.id)return null;try{return this.entities?.upsert?.({...raw,parents:raw.parents||raw.parentId||parentIds})||raw;}catch{return raw;}}
    normalizeMappings(traces,spec){
      this.traceEntities=[];this.pointEntities=[];this.baseStyles=traces.map(baseTraceStyle);
      traces.forEach((trace,ti)=>{
        let traceEntity=null;
        try{traceEntity=typeof spec.traceEntity==='function'?spec.traceEntity(trace,ti,this):(trace.entity||trace.entityId||trace.meta?.entityId||null);}catch{}
        traceEntity=this.registerEntity(traceEntity);this.traceEntities[ti]=traceEntity?.id||asId(traceEntity?.id||traceEntity)||'';
        const points=[];const n=Math.max(Array.isArray(trace?.x)?trace.x.length:0,Array.isArray(trace?.y)?trace.y.length:0,Array.isArray(trace?.customdata)?trace.customdata.length:0);
        for(let pi=0;pi<n;pi++){
          let entity=null;try{entity=typeof spec.pointEntity==='function'?spec.pointEntity({trace,traceIndex:ti,pointIndex:pi,customdata:trace?.customdata?.[pi]},this):null;}catch{}
          const registered=this.registerEntity(entity,this.traceEntities[ti]?[this.traceEntities[ti]]:[]);points[pi]=registered?.id||asId(entity?.id||entity)||'';
        }
        this.pointEntities[ti]=points;
      });
    }
    entityFromPoint(point){const ti=Number(point?.curveNumber),pi=Number(point?.pointNumber);const pointId=this.pointEntities?.[ti]?.[pi]||'';const traceId=this.traceEntities?.[ti]||'';const id=pointId||traceId;if(!id)return null;return this.entities?.get?.(id)||{id,type:'core.entity'};}
    bindPlotEvents(){if(this.bound||!this.target?.on)return;this.bound=true;const handler=event=>{
        const point=event?.points?.[0];if(!point)return;const entity=this.entityFromPoint(point);if(entity){
          const payload={type:entity.type||'core.entity',id:entity.id,ref:entity.ref||null,value:entity.value??entity,meta:{...(entity.metadata||{}),plotId:this.target.id||'',curveNumber:point.curveNumber,pointNumber:point.pointNumber}};
          try{this.interaction?.select?.(payload,{source:this.spec.source||'scientific-plot',additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}catch(err){console.warn('[DKDS ScientificPlot select]',err);}
          try{this.spec.onEntitySelect?.({entity,payload,event,point,view:this});}catch(err){console.warn('[DKDS ScientificPlot onEntitySelect]',err);}
        }
        try{this.spec.onClick?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot onClick]',err);}
      };
      this.clickHandler=handler;this.target.on('plotly_click',handler);
    }
    attach(spec={}){
      // attach() adopts an already-rendered graph. Mapping/click callbacks belong
      // to that current attachment and must not leak from a previous render.
      this.spec={...this.spec,...spec,traceEntity:spec.traceEntity??null,pointEntity:spec.pointEntity??null,onEntitySelect:spec.onEntitySelect??null,onClick:spec.onClick??null};if(spec.interaction!==undefined)this.setInteraction(spec.interaction);const traces=clone(this.target?.data||this.spec.data||this.spec.traces||[]);this.normalizeMappings(traces,this.spec);this.bindPlotEvents();if(this.lastSelection)this.applySelection(this.lastSelection,{reason:'plot-attach'});return this;
    }
    async set(spec={}){
      this.spec={...this.spec,...spec};if(spec.interaction!==undefined)this.setInteraction(spec.interaction);
      const traces=clone(this.spec.data||this.spec.traces||[]);this.normalizeMappings(traces,this.spec);
      await this.chart.react(this.target,traces,this.spec.layout||{},this.spec.config||{});this.bindPlotEvents();if(this.lastSelection)this.applySelection(this.lastSelection,{reason:'plot-react'});return this;
    }
    related(entityId,focusId){if(!entityId||!focusId)return false;if(entityId===focusId)return true;return !!this.entities?.related?.(entityId,focusId);}
    applySelection(snapshot){
      if(this.disposed||!this.target?.data?.length||!this.chart?.restyle)return false;const focusId=asId(snapshot?.focus?.id||snapshot?.items?.at?.(-1)?.id||'');if(!focusId)return this.restoreStyles();
      const traceActive=this.traceEntities.map(id=>this.related(id,focusId));const pointActive=this.pointEntities.map(ids=>ids.map(id=>this.related(id,focusId)));
      const any=traceActive.some(Boolean)||pointActive.some(row=>row.some(Boolean));if(!any)return this.restoreStyles();
      this.target.data.forEach((trace,ti)=>{
        const activeTrace=traceActive[ti]||pointActive[ti]?.some(Boolean);const base=this.baseStyles[ti]||baseTraceStyle(trace);const update={'opacity':[activeTrace?Math.max(.88,Number(base.opacity)||1):.16]};
        if(trace?.line)update['line.width']=[activeTrace?Math.max(2.6,Number(base.lineWidth)||1.5):Math.max(.8,(Number(base.lineWidth)||1.5)*.8)];
        const pointFlags=pointActive[ti]||[];if(pointFlags.some(Boolean)&&trace?.marker){const count=Math.max(pointFlags.length,Array.isArray(trace.x)?trace.x.length:0);const sizes=[];const opacities=[];for(let i=0;i<count;i++){const active=pointFlags[i];const raw=Array.isArray(base.markerSize)?Number(base.markerSize[i]):Number(base.markerSize)||7;sizes.push(active?Math.max(raw+3,10):Math.max(3,raw));opacities.push(active?1:.18);}update['marker.size']=[sizes];update['marker.opacity']=[opacities];update['opacity']=[1];}
        try{this.chart.restyle(this.target,update,[ti]);}catch{}
      });return true;
    }
    restoreStyles(){if(this.disposed||!this.target?.data?.length)return false;this.target.data.forEach((trace,ti)=>{const base=this.baseStyles[ti]||baseTraceStyle(trace),update={'opacity':[base.opacity]};if(trace?.line)update['line.width']=[base.lineWidth];if(trace?.marker){update['marker.opacity']=[base.markerOpacity];if(base.markerSize!==undefined)update['marker.size']=[base.markerSize];}try{this.chart.restyle(this.target,update,[ti]);}catch{}});return true;}
    resize(){return this.chart?.resize?.(this.target);}
    dispose(){if(this.disposed)return;this.disposed=true;this.selectionOff?.();this.selectionOff=null;if(this.clickHandler)try{this.target?.removeListener?.('plotly_click',this.clickHandler);}catch{}this.clickHandler=null;this.target?.classList?.remove('dkds-scientific-plotly');}
  }

  class ScientificPlotScope {
    constructor(owner){this.owner=String(owner||'core');this.views=new Map();}
    key(target){const el=resolve(target);if(!el)return '';if(!el.dataset.dkdsScientificPlotId)el.dataset.dkdsScientificPlotId=`sp-${Math.random().toString(36).slice(2,10)}`;return el.dataset.dkdsScientificPlotId;}
    get(target){return this.views.get(this.key(target))||null;}
    create(target,spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');this.views.get(key)?.dispose?.();const view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);return view;}
    attach(target,spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');let view=this.views.get(key);if(!view){view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);}return view.attach(spec);}
    async react(target,data=[],layout={},config={},spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');let view=this.views.get(key);if(!view){view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);}await view.set({...spec,data,layout,config});return view;}
    resize(target){return this.get(target)?.resize?.()||window.DKDSCharts?.resize?.(target);}
    restyle(target,update,traces){return window.DKDSCharts?.restyle?.(target,update,traces);}
    relayout(target,update){return window.DKDSCharts?.relayout?.(target,update);}
    saveImage(target,baseName,format='svg',options={}){return window.DKDSCharts?.saveImage?.(target,baseName,format,options);}
    purge(target){const key=this.key(target),view=this.views.get(key),chart=view?.chart||window.DKDSCharts;view?.dispose?.();this.views.delete(key);return chart?.purge?.(target);}
    dispose(){for(const view of this.views.values())view.dispose?.();this.views.clear();}
  }
  const scopes=new Map();
  function createScope(owner){const id=String(owner||'core');const scope=new ScientificPlotScope(id);if(!scopes.has(id))scopes.set(id,new Set());scopes.get(id).add(scope);const original=scope.dispose.bind(scope);scope.dispose=()=>{original();scopes.get(id)?.delete(scope);if(!scopes.get(id)?.size)scopes.delete(id);};return scope;}
  function disposeOwner(owner){const id=String(owner||'');for(const scope of [...(scopes.get(id)||[])])scope.dispose();scopes.delete(id);}
  window.DKDSScientificPlot=Object.freeze({VERSION,ScientificPlotView,ScientificPlotScope,createScope,disposeOwner});
})();
