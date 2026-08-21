(() => {
  if (window.DKDSScientificPlot) return;
  const VERSION='2.3.0';
  const CONTROLLERS=Object.freeze(['selection','legend','tooltip','focus','pin','viewport','export']);
  const resolve=value=>{
    if(value?.nodeType===1)return value;
    if(typeof value==='string')return document.getElementById(value)||document.querySelector(value);
    return null;
  };
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const asId=value=>String(value??'').trim();
  const finite=value=>Number.isFinite(Number(value));
  const baseTraceStyle=trace=>({opacity:trace?.opacity??1,lineWidth:Number(trace?.line?.width)||1.5,markerOpacity:trace?.marker?.opacity??1,markerSize:clone(trace?.marker?.size)});
  const array=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  // Plotly can spend tens to hundreds of milliseconds inside one react().
  // Multi-chart plugins must not start every heavy render in the same browser
  // turn, otherwise the first useful chart cannot paint until the whole grid is
  // finished. Non-immediate renders are coalesced by view and executed one per
  // animation frame so the browser can paint between scientific views.
  const renderQueue=new Map();let renderPumpPending=false;let renderSequence=0;
  const renderPriorityValue=value=>String(value||'immediate').toLowerCase()==='frame'?1:String(value||'immediate').toLowerCase()==='idle'?2:0;
  function cancelScheduledRender(key,value=null){const id=String(key||'');const row=renderQueue.get(id);if(!row)return false;renderQueue.delete(id);for(const waiter of row.waiters||[])try{waiter.resolve(value);}catch{}return true;}
  function pumpRenderQueue(){
    if(renderPumpPending||!renderQueue.size)return;renderPumpPending=true;
    const run=async()=>{renderPumpPending=false;if(!renderQueue.size)return;const row=[...renderQueue.values()].sort((a,b)=>(a.priority-b.priority)||(a.sequence-b.sequence))[0];renderQueue.delete(row.key);try{const value=await row.task();for(const waiter of row.waiters)waiter.resolve(value);}catch(err){for(const waiter of row.waiters)waiter.reject(err);}finally{pumpRenderQueue();}};
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>void run());else setTimeout(()=>void run(),0);
  }
  function scheduleRender(key,priority,task){
    const level=renderPriorityValue(priority);const id=String(key||`plot-${++renderSequence}`);
    if(level===0){cancelScheduledRender(id);return Promise.resolve().then(task);}
    return new Promise((resolve,reject)=>{const existing=renderQueue.get(id);if(existing){existing.task=task;existing.priority=Math.min(existing.priority,level);existing.waiters.push({resolve,reject});return;}renderQueue.set(id,{key:id,priority:level,sequence:++renderSequence,task,waiters:[{resolve,reject}]});pumpRenderQueue();});
  }
  function scalarFieldSpec(field={},options={}){
    const x=clone(field.x||field.targets||[]),y=clone(field.y||field.vgs||[]),z=clone(field.z||field.matrix||[]);
    const valueName=String(options.valueName||field.valueName||field.label||field.title||field.transformId||'value');
    const valueUnit=String(options.valueUnit??field.valueUnit??field.unit??'');
    const xName=String(options.xName||field.xName||'x'),yName=String(options.yName||field.yName||'y');
    const xUnit=String(options.xUnit??field.xUnit??''),yUnit=String(options.yUnit??field.yUnit??'');
    const transformMeta=field?.metadata?.scientificTransform||{};
    const diverging=options.diverging!==undefined?!!options.diverging:(field.diverging!==undefined?!!field.diverging:!!transformMeta.diverging);
    const colorscale=String(options.colorscale||field.colorscale||(diverging?'RdBu':'Viridis'));
    const trace={x,y,z,type:'heatmap',colorscale,reversescale:options.reversescale!==undefined?!!options.reversescale:diverging,zsmooth:options.zsmooth===true?'best':false,hoverongaps:false,
      colorbar:{title:{text:`${valueName}${valueUnit?` (${valueUnit})`:''}`,side:'right'},thickness:Number(options.colorbarThickness)||18,len:Number(options.colorbarLength)||.86,...(options.colorbar||{})},
      hovertemplate:options.hovertemplate||`${xName}=%{x}${xUnit?` ${xUnit}`:''}<br>${yName}=%{y}${yUnit?` ${yUnit}`:''}<br>${valueName}=%{z:.6g}${valueUnit?` ${valueUnit}`:''}<extra></extra>`};
    if(finite(options.zmin))trace.zmin=Number(options.zmin);if(finite(options.zmax))trace.zmax=Number(options.zmax);
    if(finite(options.zmid))trace.zmid=Number(options.zmid);else if(diverging)trace.zmid=0;
    const axisTitle=(name,unit)=>`${name}${unit?` (${unit})`:''}`;
    const layout={margin:{l:76,r:98,t:26,b:66,...(options.margin||{})},xaxis:{title:axisTitle(xName,xUnit),automargin:true,constrain:'domain',...(options.xaxis||{})},yaxis:{title:axisTitle(yName,yUnit),automargin:true,constrain:'domain',...(options.yaxis||{})},dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff',...(options.layout||{})};
    const config={responsive:true,displaylogo:false,scrollZoom:options.scrollZoom!==false,...(options.config||{})};
    const renderKey=asId(options.renderKey||field.revisionKey||field.fingerprint||'');
    return {traces:[trace],layout,config,spec:{interaction:options.interaction||null,source:options.source||'scientific-scalar-field',renderKey,renderPriority:options.renderPriority||'immediate',onClick:options.onClick||null,onEntitySelect:options.onEntitySelect||null,controllers:options.controllers||undefined}};
  }

  function normalizeControllerSpec(spec={}){
    const controllers=spec.controllers&&typeof spec.controllers==='object'?spec.controllers:{};
    const selection={area:false,clearOnDeselect:false,...(controllers.selection||{}),...(spec.selectionPolicy||{})};
    const legend={selectOnClick:false,selectOnDoubleClick:false,...(controllers.legend||{}),...(spec.legendPolicy||{})};
    const tooltip={enabled:true,...(controllers.tooltip||{}),...(spec.tooltipPolicy||{})};
    const focus={activeOpacity:.96,inactiveOpacity:.16,activeLineWidth:2.6,inactiveLineFactor:.8,pointInactiveOpacity:.18,pointSizeBoost:3,pointMinSize:10,...(controllers.focus||{}),...(spec.focusPolicy||{})};
    const pin={enabled:false,modifier:'shift',...((controllers.pin)||{}),...(spec.pinPolicy||{})};
    const viewport={enabled:true,persist:false,preserveOnReact:true,key:'',...((controllers.viewport)||{}),...(spec.viewportPolicy||{})};
    const exp={baseName:'scientific_plot',format:'svg',...((controllers.export)||{}),...(spec.exportPolicy||{})};
    return {selection,legend,tooltip,focus,pin,viewport,export:exp};
  }

  class ScientificPlotView {
    constructor(owner,target,spec={}){
      this.owner=String(owner||'core');this.target=resolve(target);this.spec={...spec};this.disposed=false;this.bound=false;this.selectionOff=null;this.traceEntities=[];this.pointEntities=[];this.baseStyles=[];this.lastSelection=null;this.renderRequestRevision=0;
      this.pinnedIds=new Set();this.pinListeners=new Set();this.viewportListeners=new Set();this.viewportState={xRange:null,yRange:null,revision:0,source:'initial'};this.hoverState=null;this.eventHandlers=new Map();this.controllerSpec=normalizeControllerSpec(spec);this.lastRenderKey='';this.appliedStyleKey='';this.suspended=false;this.purged=false;this.managedRender=false;this.pendingRender=false;this.renderStats={reacts:0,skippedReacts:0,selectionApplies:0,selectionSkips:0,styleRestores:0,suspends:0,resumes:0,rendererPurges:0,resumeRenders:0,hiddenRenderSkips:0};
      if(!this.target)throw new Error('ScientificPlot target not found.');
      this.chart=window.DKDSCharts?.createScope?.(this.owner)||window.DKDSCharts;
      this.entities=window.DKDSEntities?.createScope?.(this.owner)||null;
      this.target.classList.add('dkds-scientific-plotly');
      this.renderScheduleKey=`${this.owner}:${this.target.dataset?.dkdsScientificPlotId||this.target.id||Math.random().toString(36).slice(2,10)}`;
      this.controllers=this.createControllers();
      this.displayAxisState={y:null};this.baseYAxisType='linear';
      this.axisDoubleClickHandler=event=>{if(!this.isYAxisDomTarget(event?.target))return;event.preventDefault?.();event.stopPropagation?.();event.stopImmediatePropagation?.();void this.toggleYAxisDisplay({event,source:'axis-double-click'});};
      this.target.addEventListener?.('dblclick',this.axisDoubleClickHandler,true);
      this.setInteraction(spec.interaction||null);
      this.restoreViewportPreference();
    }
    isYAxisDomTarget(node){
      let current=node;while(current&&current!==this.target){const cls=typeof current.getAttribute==='function'?String(current.getAttribute('class')||''):'';if(/(^|\s)(ytick|ytitle|yaxislayer-above|yaxislayer-below|g-ytitle)(\s|$)/.test(cls)||/yaxis/i.test(cls))return true;current=current.parentNode;}return false;
    }
    effectiveYAxisType(){return String(this.chart?.displayScaleState?.(this.target)?.type||this.baseYAxisType||'linear').toLowerCase();}
    async toggleYAxisDisplay(meta={}){const current=this.effectiveYAxisType();if(['category','date','multicategory'].includes(current))return false;try{const next=await Promise.resolve(this.chart?.toggleYAxisDisplay?.(this.target));if(!next)return false;this.viewportState={...this.viewportState,yRange:null,revision:(Number(this.viewportState?.revision)||0)+1,source:'axis-scale-toggle'};this.persistViewport();this.emitViewport({reason:'axis-scale-toggle',scale:next,...meta});this.spec.onDisplayScaleChanged?.({axis:'y',type:next,view:this,...meta});return next;}catch{return false;}}
    createControllers(){
      const view=this;
      return Object.freeze({
        selection:Object.freeze({get:()=>clone(view.lastSelection||view.interaction?.get?.()||null),select:(value,options={})=>view.interaction?.select?.(value,options),clear:(options={})=>view.interaction?.clear?.(options),entityFromPoint:point=>view.entityFromPoint(point),entityFromTrace:index=>view.entityFromTrace(index)}),
        legend:Object.freeze({entity:index=>view.entityFromTrace(index),select:(index,options={})=>view.selectTrace(index,{source:'scientific-plot-legend',...options}),state:()=>view.legendState()}),
        tooltip:Object.freeze({theme:()=>clone(view.chart?.tooltipTheme||window.DKDSCharts?.tooltipTheme||{}),hover:()=>clone(view.hoverState),enabled:()=>view.controllerSpec.tooltip.enabled!==false}),
        focus:Object.freeze({apply:(snapshot=view.lastSelection)=>view.applySelection(snapshot),restore:()=>view.restoreStyles(),configure:spec=>view.configureController('focus',spec)}),
        pin:Object.freeze({list:()=>[...view.pinnedIds],has:id=>view.pinnedIds.has(asId(id)),pin:(id,meta={})=>view.pin(id,meta),unpin:(id,meta={})=>view.unpin(id,meta),toggle:(id,meta={})=>view.togglePin(id,meta),clear:(meta={})=>view.clearPins(meta),subscribe:fn=>view.subscribePins(fn)}),
        viewport:Object.freeze({get:()=>view.getViewport(),set:(state,meta={})=>view.setViewport(state,meta),reset:(meta={})=>view.resetViewport(meta),subscribe:fn=>view.subscribeViewport(fn)}),
        export:Object.freeze({save:(baseName,format,options={})=>view.exportImage(baseName,format,options),toImage:options=>view.chart?.toImage?.(view.target,options)})
      });
    }
    controller(name){return this.controllers?.[String(name||'')]||null;}
    configureController(name,spec={}){const key=String(name||'');if(!this.controllerSpec[key])return null;this.controllerSpec[key]={...this.controllerSpec[key],...(spec||{})};if(key==='viewport')this.restoreViewportPreference();if(key==='focus'){this.appliedStyleKey='';this.applySelection(this.lastSelection);}return clone(this.controllerSpec[key]);}
    setInteraction(interaction){if(this.interaction===interaction)return;this.selectionOff?.();this.selectionOff=null;this.interaction=interaction||null;if(this.interaction?.subscribe)this.selectionOff=this.interaction.subscribe((snapshot,meta)=>{this.lastSelection=snapshot;this.applySelection(snapshot,meta);},{immediate:true});}
    registerEntity(input,parentIds=[]){if(!input)return null;const raw=typeof input==='string'?{id:input}:input;if(!raw?.id)return null;try{return this.entities?.upsert?.({...raw,parents:raw.parents||raw.parentId||parentIds})||raw;}catch{return raw;}}
    normalizeMappings(traces,spec){
      this.traceEntities=[];this.pointEntities=[];this.baseStyles=traces.map(baseTraceStyle);this.appliedStyleKey='';
      traces.forEach((trace,ti)=>{
        let traceEntity=null;
        try{traceEntity=typeof spec.traceEntity==='function'?spec.traceEntity(trace,ti,this):(trace.entity||trace.entityId||trace.meta?.entityId||null);}catch{}
        traceEntity=this.registerEntity(traceEntity);this.traceEntities[ti]=traceEntity?.id||asId(traceEntity?.id||traceEntity)||'';
        const points=[];const n=Math.max(Array.isArray(trace?.x)?trace.x.length:0,Array.isArray(trace?.y)?trace.y.length:0,Array.isArray(trace?.z)?trace.z.flat?.().length||0:0,Array.isArray(trace?.customdata)?trace.customdata.length:0);
        for(let pi=0;pi<n;pi++){
          let entity=null;try{entity=typeof spec.pointEntity==='function'?spec.pointEntity({trace,traceIndex:ti,pointIndex:pi,customdata:trace?.customdata?.[pi]},this):null;}catch{}
          const registered=this.registerEntity(entity,this.traceEntities[ti]?[this.traceEntities[ti]]:[]);points[pi]=registered?.id||asId(entity?.id||entity)||'';
        }
        this.pointEntities[ti]=points;
      });
    }
    entityFromTrace(index){const ti=Number(index);const id=this.traceEntities?.[ti]||'';if(!id)return null;return this.entities?.get?.(id)||{id,type:'core.entity'};}
    entityFromPoint(point){const ti=Number(point?.curveNumber),pi=Number(point?.pointNumber??point?.pointIndex);const pointId=this.pointEntities?.[ti]?.[pi]||'';const traceId=this.traceEntities?.[ti]||'';const id=pointId||traceId;if(!id)return null;return this.entities?.get?.(id)||{id,type:'core.entity'};}
    payloadFromEntity(entity,point=null){if(!entity?.id)return null;return {type:entity.type||'core.entity',id:entity.id,ref:entity.ref||null,value:entity.value??entity,meta:{...(entity.metadata||{}),plotId:this.target.id||'',curveNumber:point?.curveNumber,pointNumber:point?.pointNumber??point?.pointIndex}};}
    selectEntity(entity,point=null,options={}){const payload=this.payloadFromEntity(entity,point);if(!payload)return null;try{return this.interaction?.select?.(payload,{source:options.source||this.spec.source||'scientific-plot',additive:options.additive===true,...options});}catch(err){console.warn('[DKDS ScientificPlot select]',err);return null;}}
    selectTrace(index,options={}){const entity=this.entityFromTrace(index);return entity?this.selectEntity(entity,{curveNumber:Number(index),pointNumber:null},options):null;}
    modifierMatches(event,modifier){const raw=String(modifier||'shift').toLowerCase();const e=event?.event||event||{};if(raw==='none')return true;if(raw==='ctrl'||raw==='control')return !!(e.ctrlKey||e.metaKey);if(raw==='alt')return !!e.altKey;if(raw==='meta'||raw==='cmd')return !!e.metaKey;return !!e.shiftKey;}
    bindEvent(name,handler){if(!this.target?.on||this.eventHandlers.has(name))return;this.eventHandlers.set(name,handler);this.target.on(name,handler);}
    unbindPlotEvents(){for(const [name,handler] of this.eventHandlers)try{this.target?.removeListener?.(name,handler);}catch{}this.eventHandlers.clear();this.bound=false;}
    bindPlotEvents(){
      if(this.bound||!this.target?.on)return;this.bound=true;
      this.bindEvent('plotly_click',event=>{
        const point=event?.points?.[0];if(!point)return;const entity=this.entityFromPoint(point);
        if(entity){
          const additive=!!(event?.event?.ctrlKey||event?.event?.metaKey);
          this.selectEntity(entity,point,{source:this.spec.source||'scientific-plot',additive});
          if(this.controllerSpec.pin.enabled&&this.modifierMatches(event,this.controllerSpec.pin.modifier))this.togglePin(entity.id,{source:'plot-click',event});
          try{this.spec.onEntitySelect?.({entity,payload:this.payloadFromEntity(entity,point),event,point,view:this});}catch(err){console.warn('[DKDS ScientificPlot onEntitySelect]',err);}
        }
        try{this.spec.onClick?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot onClick]',err);}
      });
      this.bindEvent('plotly_legendclick',event=>this.handleLegend(event,false));
      this.bindEvent('plotly_legenddoubleclick',event=>this.handleLegend(event,true));
      this.bindEvent('plotly_relayout',event=>this.captureViewport(event,{source:'plotly-relayout'}));
      this.bindEvent('plotly_hover',event=>{this.hoverState=this.hoverSnapshot(event);try{this.spec.onHover?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot onHover]',err);}});
      this.bindEvent('plotly_unhover',event=>{this.hoverState=null;try{this.spec.onUnhover?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot onUnhover]',err);}});
      this.bindEvent('plotly_selected',event=>this.handleAreaSelection(event));
      this.bindEvent('plotly_deselect',event=>{if(this.controllerSpec.selection.clearOnDeselect)this.interaction?.clear?.({source:this.spec.source||'scientific-plot-deselect'});try{this.spec.onDeselect?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot onDeselect]',err);}});
    }
    handleLegend(event,doubleClick=false){
      const index=Number(event?.curveNumber);const entity=this.entityFromTrace(index);const policy=this.controllerSpec.legend;
      if(entity&&((doubleClick&&policy.selectOnDoubleClick)||(!doubleClick&&policy.selectOnClick)))this.selectEntity(entity,{curveNumber:index},{source:doubleClick?'scientific-plot-legend-double':'scientific-plot-legend'});
      try{const out=this.spec.onLegendAction?.({event,entity,index,doubleClick,view:this});if(out===false)return false;}catch(err){console.warn('[DKDS ScientificPlot legend]',err);}
      return undefined;
    }
    handleAreaSelection(event){
      const points=event?.points||[];if(this.controllerSpec.selection.area&&points.length&&this.interaction?.selectMany){
        const values=[];for(const point of points){const entity=this.entityFromPoint(point);const payload=this.payloadFromEntity(entity,point);if(payload)values.push(payload);}if(values.length)this.interaction.selectMany(values,{source:this.spec.source||'scientific-plot-area'});
      }
      try{this.spec.onAreaSelect?.(event,this);}catch(err){console.warn('[DKDS ScientificPlot area]',err);}
    }
    hoverSnapshot(event){const point=event?.points?.[0];const entity=point?this.entityFromPoint(point):null;return {entityId:entity?.id||'',curveNumber:point?.curveNumber??null,pointNumber:point?.pointNumber??point?.pointIndex??null,x:point?.x,y:point?.y,z:point?.z};}
    applyTooltipTheme(){
      if(this.controllerSpec.tooltip.enabled===false)return false;const theme=this.chart?.tooltipTheme||window.DKDSCharts?.tooltipTheme||null;if(!theme||!this.chart?.relayout)return false;
      const themeKey=[theme.bgcolor||'',theme.bordercolor||'',theme.align||'',theme.font?.color||'',finite(theme.font?.size)?Number(theme.font.size):''].join('|');
      if(this.target.dataset.dkdsTooltipTheme===themeKey){window.DKDSPerformance?.skip?.('plot.tooltip-relayout');return false;}
      const update={};if(theme.bgcolor)update['hoverlabel.bgcolor']=theme.bgcolor;if(theme.bordercolor)update['hoverlabel.bordercolor']=theme.bordercolor;if(theme.align)update['hoverlabel.align']=theme.align;if(theme.font?.color)update['hoverlabel.font.color']=theme.font.color;if(finite(theme.font?.size))update['hoverlabel.font.size']=Number(theme.font.size);
      if(!Object.keys(update).length)return false;try{this.chart.relayout(this.target,update);this.target.dataset.dkdsTooltipTheme=themeKey;return true;}catch{return false;}
    }
    legendState(){return (this.target?.data||[]).map((trace,index)=>({index,entityId:this.traceEntities[index]||'',name:String(trace?.name||''),visible:trace?.visible!==false&&trace?.visible!=='legendonly',legendgroup:String(trace?.legendgroup||'')}));}
    related(entityId,focusId){if(!entityId||!focusId)return false;if(entityId===focusId)return true;return !!this.entities?.related?.(entityId,focusId);}
    isEntityActive(entityId,focusId){if(!entityId)return false;if(this.pinnedIds.has(entityId))return true;return this.related(entityId,focusId);}
    applySelection(snapshot){
      if(this.disposed||!this.target?.data?.length||!this.chart?.restyle)return false;const focusId=asId(snapshot?.focus?.id||snapshot?.items?.at?.(-1)?.id||'');
      const styleKey=`focus:${focusId}|pins:${[...this.pinnedIds].sort().join(',')}`;
      if(this.appliedStyleKey===styleKey){this.renderStats.selectionSkips+=1;window.DKDSPerformance?.skip?.('plot.selection-restyle');return false;}
      if(!focusId&&!this.pinnedIds.size)return this.restoreStyles();
      const traceActive=this.traceEntities.map(id=>this.isEntityActive(id,focusId));const pointActive=this.pointEntities.map(ids=>ids.map(id=>this.isEntityActive(id,focusId)));
      const any=traceActive.some(Boolean)||pointActive.some(row=>row.some(Boolean));if(!any)return this.restoreStyles();
      const policy=this.controllerSpec.focus;this.renderStats.selectionApplies+=1;
      this.target.data.forEach((trace,ti)=>{
        const activeTrace=traceActive[ti]||pointActive[ti]?.some(Boolean);const base=this.baseStyles[ti]||baseTraceStyle(trace);const update={'opacity':[activeTrace?Math.max(Number(policy.activeOpacity)||.96,Number(base.opacity)||1):Number(policy.inactiveOpacity)]};
        if(trace?.line)update['line.width']=[activeTrace?Math.max(Number(policy.activeLineWidth)||2.6,Number(base.lineWidth)||1.5):Math.max(.5,(Number(base.lineWidth)||1.5)*Number(policy.inactiveLineFactor||.8))];
        const pointFlags=pointActive[ti]||[];if(pointFlags.some(Boolean)&&trace?.marker){const count=Math.max(pointFlags.length,Array.isArray(trace.x)?trace.x.length:0);const sizes=[];const opacities=[];for(let i=0;i<count;i++){const active=pointFlags[i]||this.pinnedIds.has(this.pointEntities?.[ti]?.[i]||'');const raw=Array.isArray(base.markerSize)?Number(base.markerSize[i]):Number(base.markerSize)||7;sizes.push(active?Math.max(raw+Number(policy.pointSizeBoost||3),Number(policy.pointMinSize||10)):Math.max(3,raw));opacities.push(active?1:Number(policy.pointInactiveOpacity||.18));}update['marker.size']=[sizes];update['marker.opacity']=[opacities];update['opacity']=[1];}
        try{this.chart.restyle(this.target,update,[ti]);}catch{}
      });this.appliedStyleKey=styleKey;return true;
    }
    restoreStyles(){if(this.disposed||!this.target?.data?.length)return false;if(this.appliedStyleKey==='restored'){this.renderStats.selectionSkips+=1;window.DKDSPerformance?.skip?.('plot.selection-restyle');return false;}this.target.data.forEach((trace,ti)=>{const base=this.baseStyles[ti]||baseTraceStyle(trace),update={'opacity':[base.opacity]};if(trace?.line)update['line.width']=[base.lineWidth];if(trace?.marker){update['marker.opacity']=[base.markerOpacity];if(base.markerSize!==undefined)update['marker.size']=[clone(base.markerSize)];}try{this.chart.restyle(this.target,update,[ti]);}catch{}});this.appliedStyleKey='restored';this.renderStats.styleRestores+=1;return true;}
    pin(id,meta={}){const key=asId(id);if(!key)return false;const changed=!this.pinnedIds.has(key);this.pinnedIds.add(key);if(changed)this.emitPins({reason:'pin',id:key,...meta});this.applySelection(this.lastSelection);return changed;}
    unpin(id,meta={}){const key=asId(id);if(!key)return false;const changed=this.pinnedIds.delete(key);if(changed)this.emitPins({reason:'unpin',id:key,...meta});this.applySelection(this.lastSelection);return changed;}
    togglePin(id,meta={}){return this.pinnedIds.has(asId(id))?(this.unpin(id,meta),false):(this.pin(id,meta),true);}
    clearPins(meta={}){if(!this.pinnedIds.size)return false;const previous=[...this.pinnedIds];this.pinnedIds.clear();this.emitPins({reason:'clear',previous,...meta});this.applySelection(this.lastSelection);return true;}
    subscribePins(fn){if(typeof fn!=='function')return()=>{};this.pinListeners.add(fn);try{fn([...this.pinnedIds],{reason:'subscribe'},this);}catch{}return()=>this.pinListeners.delete(fn);}
    emitPins(meta={}){const pins=[...this.pinnedIds];this.target?.classList?.toggle?.('dkds-scientific-plot-has-pins',pins.length>0);for(const fn of [...this.pinListeners])try{fn(pins,meta,this);}catch(err){console.warn('[DKDS ScientificPlot pin]',err);}try{this.spec.onPinsChanged?.(pins,meta,this);}catch(err){console.warn('[DKDS ScientificPlot onPinsChanged]',err);}}
    viewportStorageKey(){const policy=this.controllerSpec.viewport;if(!policy.persist)return '';return String(policy.key||`dkds.scientificPlot.viewport.${this.owner}.${this.target.id||this.target.dataset?.dkdsScientificPlotId||'plot'}`);}
    restoreViewportPreference(){const key=this.viewportStorageKey();if(!key||typeof localStorage==='undefined')return false;try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object'){this.viewportState={...this.viewportState,...saved,source:'restore'};return true;}}catch{}return false;}
    persistViewport(){const key=this.viewportStorageKey();if(!key||typeof localStorage==='undefined')return false;try{localStorage.setItem(key,JSON.stringify(this.viewportState));return true;}catch{return false;}}
    captureViewport(event={},meta={}){if(this.controllerSpec.viewport.enabled===false)return this.getViewport();let changed=false;const next={...this.viewportState};
      const pair=(axis)=>{const a=event?.[`${axis}.range[0]`],b=event?.[`${axis}.range[1]`];if(finite(a)&&finite(b))return [Number(a),Number(b)];if(event?.[`${axis}.autorange`]===true)return null;return undefined;};
      const xr=pair('xaxis'),yr=pair('yaxis');if(xr!==undefined){next.xRange=xr;changed=true;}if(yr!==undefined){next.yRange=yr;changed=true;}if(!changed)return this.getViewport();next.revision=(Number(this.viewportState.revision)||0)+1;next.source=meta.source||'relayout';this.viewportState=next;this.persistViewport();this.emitViewport(meta);return this.getViewport();}
    getViewport(){return clone(this.viewportState);}
    async setViewport(state={},meta={}){if(this.controllerSpec.viewport.enabled===false)return this.getViewport();const next={...this.viewportState};const update={};if(Array.isArray(state.xRange)&&state.xRange.length>=2){next.xRange=[Number(state.xRange[0]),Number(state.xRange[1])];update['xaxis.range']=next.xRange;}if(Array.isArray(state.yRange)&&state.yRange.length>=2){next.yRange=[Number(state.yRange[0]),Number(state.yRange[1])];update['yaxis.range']=next.yRange;}next.revision=(Number(next.revision)||0)+1;next.source=meta.source||'controller';this.viewportState=next;this.persistViewport();if(Object.keys(update).length)await Promise.resolve(this.chart?.relayout?.(this.target,update));this.emitViewport(meta);return this.getViewport();}
    async resetViewport(meta={}){const next={xRange:null,yRange:null,revision:(Number(this.viewportState.revision)||0)+1,source:meta.source||'reset'};this.viewportState=next;this.persistViewport();await Promise.resolve(this.chart?.relayout?.(this.target,{'xaxis.autorange':true,'yaxis.autorange':true}));this.emitViewport(meta);return this.getViewport();}
    async applyViewportState(meta={}){if(this.controllerSpec.viewport.enabled===false||this.controllerSpec.viewport.preserveOnReact===false)return false;const update={};if(Array.isArray(this.viewportState.xRange)&&this.viewportState.xRange.length>=2)update['xaxis.range']=this.viewportState.xRange;if(Array.isArray(this.viewportState.yRange)&&this.viewportState.yRange.length>=2)update['yaxis.range']=this.viewportState.yRange;if(!Object.keys(update).length)return false;try{await Promise.resolve(this.chart?.relayout?.(this.target,update));return true;}catch{return false;}}
    subscribeViewport(fn){if(typeof fn!=='function')return()=>{};this.viewportListeners.add(fn);try{fn(this.getViewport(),{reason:'subscribe'},this);}catch{}return()=>this.viewportListeners.delete(fn);}
    emitViewport(meta={}){const snapshot=this.getViewport();for(const fn of [...this.viewportListeners])try{fn(snapshot,meta,this);}catch(err){console.warn('[DKDS ScientificPlot viewport]',err);}try{this.spec.onViewportChanged?.(snapshot,meta,this);}catch(err){console.warn('[DKDS ScientificPlot onViewportChanged]',err);}}
    exportImage(baseName,format,options={}){const policy=this.controllerSpec.export;return this.chart?.saveImage?.(this.target,baseName||policy.baseName||'scientific_plot',format||policy.format||'svg',options);}
    prepareSpec(spec={}){this.spec={...this.spec,...spec,traceEntity:spec.traceEntity??this.spec.traceEntity??null,pointEntity:spec.pointEntity??this.spec.pointEntity??null,onEntitySelect:spec.onEntitySelect??this.spec.onEntitySelect??null,onClick:spec.onClick??this.spec.onClick??null};this.controllerSpec=normalizeControllerSpec(this.spec);if(spec.interaction!==undefined)this.setInteraction(spec.interaction);}
    attach(spec={}){
      // attach() adopts an already-rendered graph. Mapping/click callbacks belong
      // to that current attachment and must not leak from a previous render.
      this.spec={...this.spec,...spec,traceEntity:spec.traceEntity??null,pointEntity:spec.pointEntity??null,onEntitySelect:spec.onEntitySelect??null,onClick:spec.onClick??null,onLegendAction:spec.onLegendAction??null,onAreaSelect:spec.onAreaSelect??null};this.controllerSpec=normalizeControllerSpec(this.spec);if(spec.interaction!==undefined)this.setInteraction(spec.interaction);this.managedRender=false;this.suspended=false;this.purged=false;this.baseYAxisType=String(this.target?.layout?.yaxis?.type||this.spec?.layout?.yaxis?.type||'linear').toLowerCase();const traces=clone(this.target?.data||this.spec.data||this.spec.traces||[]);this.chart?.adoptDisplayScale?.(this.target,traces,this.target?.layout||this.spec?.layout||{},this.target?._context||this.spec?.config||{});this.normalizeMappings(traces,this.spec);this.bindPlotEvents();this.applyTooltipTheme();void this.applyViewportState({reason:'plot-attach'});if(this.lastSelection||this.pinnedIds.size)this.applySelection(this.lastSelection,{reason:'plot-attach'});return this;
    }
    async set(spec={}){
      this.prepareSpec(spec);this.managedRender=true;const renderKey=asId(this.spec.renderKey||this.spec.revisionKey||'');
      if(this.suspended){this.pendingRender=true;this.renderStats.hiddenRenderSkips+=1;window.DKDSPerformance?.skip?.('plot.hidden-react');return this;}
      if(renderKey&&renderKey===this.lastRenderKey&&this.target?.data?.length){this.renderStats.skippedReacts+=1;window.DKDSPerformance?.skip?.('plot.react');this.bindPlotEvents();this.applyTooltipTheme();return this;}
      const traces=clone(this.spec.data||this.spec.traces||[]),layout=clone(this.spec.layout||{}),config=clone(this.spec.config||{}),requestRevision=++this.renderRequestRevision;this.baseYAxisType=String(layout?.yaxis?.type||'linear').toLowerCase();this.normalizeMappings(traces,this.spec);
      const renderPriority=String(this.spec.renderPriority||'immediate');
      await scheduleRender(this.renderScheduleKey,renderPriority,()=>{if(this.disposed||this.suspended||requestRevision!==this.renderRequestRevision)return null;return this.chart.react(this.target,traces,layout,config);});
      if(this.disposed||this.suspended||requestRevision!==this.renderRequestRevision)return this;this.renderStats.reacts+=1;this.purged=false;this.pendingRender=false;if(renderKey)this.lastRenderKey=renderKey;else this.lastRenderKey='';this.bindPlotEvents();this.applyTooltipTheme();await this.applyViewportState({reason:'plot-react'});if(this.lastSelection||this.pinnedIds.size)this.applySelection(this.lastSelection,{reason:'plot-react'});return this;
    }
    async suspend(options={}){
      if(this.disposed||this.suspended)return this.lifecycleState();this.suspended=true;this.renderStats.suspends+=1;
      const purge=options.purge!==false&&options.purgeManaged!==false&&this.managedRender&&!!this.target?.data?.length;
      if(purge){this.unbindPlotEvents();try{await Promise.resolve(this.chart?.purge?.(this.target));this.purged=true;this.renderStats.rendererPurges+=1;if(this.target?.dataset)delete this.target.dataset.dkdsTooltipTheme;}catch(err){console.warn('[DKDS ScientificPlot suspend]',err);}}
      return this.lifecycleState();
    }
    async resume(options={}){
      if(this.disposed)return this.lifecycleState();const wasSuspended=this.suspended;this.suspended=false;if(wasSuspended)this.renderStats.resumes+=1;
      if(this.purged&&this.managedRender){this.purged=false;this.renderStats.resumeRenders+=1;await this.set({...this.spec});}
      else{this.bindPlotEvents();this.applyTooltipTheme();if(options.resize!==false)try{await Promise.resolve(this.resize());}catch{}if(this.lastSelection||this.pinnedIds.size)this.applySelection(this.lastSelection,{reason:'plot-resume'});}
      return this.lifecycleState();
    }
    lifecycleState(){return {owner:this.owner,targetId:this.target?.id||this.target?.dataset?.dkdsScientificPlotId||'',managedRender:this.managedRender,suspended:this.suspended,purged:this.purged,pendingRender:this.pendingRender,traceCount:this.target?.data?.length||0,pins:this.pinnedIds.size,viewportRevision:Number(this.viewportState?.revision)||0};}
    performance(){return clone({...this.renderStats,lastRenderKey:this.lastRenderKey,traceCount:this.target?.data?.length||0,suspended:this.suspended,purged:this.purged,managedRender:this.managedRender});}
    resize(){if(this.suspended){window.DKDSPerformance?.skip?.('plot.hidden-resize');return false;}return this.chart?.resize?.(this.target);}
    dispose(options={}){if(this.disposed)return;this.disposed=true;cancelScheduledRender(this.renderScheduleKey,this);this.target?.removeEventListener?.('dblclick',this.axisDoubleClickHandler,true);this.selectionOff?.();this.selectionOff=null;this.unbindPlotEvents();if(options.purge===true)try{this.chart?.purge?.(this.target);}catch{}this.pinListeners.clear();this.viewportListeners.clear();this.pinnedIds.clear();this.traceEntities=[];this.pointEntities=[];this.baseStyles=[];this.spec={};this.target?.classList?.remove('dkds-scientific-plotly','dkds-scientific-plot-has-pins');if(this.target?.dataset)delete this.target.dataset.dkdsTooltipTheme;}
  }

  class ScientificPlotScope {
    constructor(owner){this.owner=String(owner||'core');this.views=new Map();}
    key(target){const el=resolve(target);if(!el)return '';if(!el.dataset.dkdsScientificPlotId)el.dataset.dkdsScientificPlotId=`sp-${Math.random().toString(36).slice(2,10)}`;return el.dataset.dkdsScientificPlotId;}
    get(target){return this.views.get(this.key(target))||null;}
    controller(target,name){return this.get(target)?.controller?.(name)||null;}
    create(target,spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');this.views.get(key)?.dispose?.();const view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);return view;}
    attach(target,spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');let view=this.views.get(key);if(!view){view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);}return view.attach(spec);}
    async react(target,data=[],layout={},config={},spec={}){const key=this.key(target);if(!key)throw new Error('ScientificPlot target not found.');let view=this.views.get(key);if(!view){view=new ScientificPlotView(this.owner,target,spec);this.views.set(key,view);}await view.set({...spec,data,layout,config});return view;}
    async scalarField(target,field={},options={}){const prepared=scalarFieldSpec(field,options);return this.react(target,prepared.traces,prepared.layout,prepared.config,prepared.spec);}
    resize(target){return this.get(target)?.resize?.()||window.DKDSCharts?.resize?.(target);}
    restyle(target,update,traces){return window.DKDSCharts?.restyle?.(target,update,traces);}
    relayout(target,update){return window.DKDSCharts?.relayout?.(target,update);}
    viewport(target){return this.get(target)?.getViewport?.()||null;}
    setViewport(target,state,meta={}){return this.get(target)?.setViewport?.(state,meta)||false;}
    resetViewport(target,meta={}){return this.get(target)?.resetViewport?.(meta)||false;}
    pin(target,id,meta={}){return this.get(target)?.pin?.(id,meta)||false;}
    unpin(target,id,meta={}){return this.get(target)?.unpin?.(id,meta)||false;}
    pins(target){return this.get(target)?.controllers?.pin?.list?.()||[];}
    stats(target){return this.get(target)?.performance?.()||null;}
    lifecycleState(){const rows=[...this.views.values()].map(view=>view.lifecycleState());return {owner:this.owner,views:rows.length,suspended:rows.filter(row=>row.suspended).length,purged:rows.filter(row=>row.purged).length,managed:rows.filter(row=>row.managedRender).length,rows};}
    async suspend(options={}){return Promise.all([...this.views.values()].map(view=>view.suspend(options)));}
    async resume(options={}){return Promise.all([...this.views.values()].map(view=>view.resume(options)));}
    async lifecycle(state,options={}){const value=String(state||'').toLowerCase();if(value==='hidden'||value==='suspended')return this.suspend(options);if(value==='visible'||value==='active'||value==='resumed')return this.resume(options);return this.lifecycleState();}
    saveImage(target,baseName,format='svg',options={}){return this.get(target)?.exportImage?.(baseName,format,options)||window.DKDSCharts?.saveImage?.(target,baseName,format,options);}
    purge(target){const key=this.key(target),view=this.views.get(key);if(!view)return window.DKDSCharts?.purge?.(target);view.dispose?.({purge:true});this.views.delete(key);return true;}
    dispose(){for(const view of this.views.values())view.dispose?.({purge:true});this.views.clear();}
  }
  const scopes=new Map();
  function createScope(owner){const id=String(owner||'core');const scope=new ScientificPlotScope(id);if(!scopes.has(id))scopes.set(id,new Set());scopes.get(id).add(scope);const original=scope.dispose.bind(scope);scope.dispose=()=>{original();scopes.get(id)?.delete(scope);if(!scopes.get(id)?.size)scopes.delete(id);};return scope;}
  function disposeOwner(owner){const id=String(owner||'');for(const scope of [...(scopes.get(id)||[])])scope.dispose();scopes.delete(id);}
  async function lifecycle(state,options={}){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push(await scope.lifecycle(state,options));return {state:String(state||''),scopes:rows.length,views:rows.reduce((sum,row)=>sum+Number(row?.length??row?.views??0),0)};}
  function snapshot(){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push(scope.lifecycleState());return {version:VERSION,scopes:rows.length,views:rows.reduce((sum,row)=>sum+row.views,0),managed:rows.reduce((sum,row)=>sum+row.managed,0),suspended:rows.reduce((sum,row)=>sum+row.suspended,0),purged:rows.reduce((sum,row)=>sum+row.purged,0),rows};}
  window.DKDSScientificPlot=Object.freeze({VERSION,CONTROLLERS,ScientificPlotView,ScientificPlotScope,scalarFieldSpec,createScope,disposeOwner,lifecycle,snapshot});
})();
