'use strict';
const {plotPresentation, resolveElement}=require('../foundation/shortcuts');
const {compactSeriesLabel}=require('../series/primitives');
const {DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS}=require('../tooltip/group-plot');

  class ScientificCurveSurface {
    constructor(scope,target,spec={}){
      this.scope=scope;this.owner=scope.owner;const resolvedTarget=resolveElement(target);this.spec={...spec};this.disposed=false;this.renderQueued=false;this.selectionSnapshot=null;this.selectionOff=null;this.interaction=null;this.pointOrderCache=new WeakMap();this.colorScaleState={key:'',scale:null};this.navCollisionFrame=0;this.navObstacleObserver=null;this.displayYAxisType=String(spec.yScaleType||'linear').toLowerCase()==='log'?'log':'linear';this.markerClickSuppressUntil=new Map();this.ownsTarget=false;const behaviorSpec=spec.interactionBehavior&&typeof spec.interactionBehavior==='object'&&!spec.interactionBehavior.route?spec.interactionBehavior:{};this.behavior=spec.interactionBehavior?.route?spec.interactionBehavior:scope.interactionBehaviors?.compile?.({...behaviorSpec,bindings:[...DEFAULT_SCIENTIFIC_INTERACTION_BINDINGS,...(Array.isArray(behaviorSpec.bindings)?behaviorSpec.bindings:[])]})||null;
      if(!resolvedTarget)throw new Error('ScientificCurveSurface target not found.');
      const isSvg=String(resolvedTarget.tagName||'').toLowerCase()==='svg'||resolvedTarget.namespaceURI==='http://www.w3.org/2000/svg';
      if(isSvg)this.target=resolvedTarget;
      else{
        this.target=document.createElementNS('http://www.w3.org/2000/svg','svg');this.target.classList.add('dkds-scientific-curve-canvas');this.target.setAttribute('role','img');resolvedTarget.appendChild(this.target);this.ownsTarget=true;
      }
      this.entities=scope.entities||window.DKDSEntities?.createScope?.(this.owner)||null;
      this.target.classList.add('dkds-scientific-curve-surface');
      this.container=resolveElement(spec.container)||(this.ownsTarget?resolvedTarget:this.target.parentElement)||this.target;
      this.container.classList.add('dkds-scientific-surface-host');globalThis.DKDSMaterialSurface?.apply?.(this.container,'surface');
      this.layoutState={status:'initial',width:0,height:0,preferredMinWidth:Number(spec.minWidth)||260,preferredMinHeight:Number(spec.minHeight)||180,hardMinWidth:Math.max(72,Number(spec.hardMinWidth)||112),hardMinHeight:Math.max(72,Number(spec.hardMinHeight)||96),fallbackApplied:false,compact:false,reason:'initial'};
      this.layoutFallbackOwned=false;this.legendHost=null;this.legendController=null;this.legendSoloId='';this.legendSelectedId='';this.legendGroup=null;this.legendGroupOff=null;this.legendLayoutState={enabled:false,placement:'none',count:0,rows:0,width:0,height:0,reserve:0};
      this.installLegendHost();
      this.installNavigationTools();
      this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>{if(document.documentElement?.classList?.contains('dkds-split-drag-active'))return;this.clampNavigationTools();this.requestRender('resize');this.scheduleNavigationCollisionCheck();}):null;
      this.resizeObserver?.observe(this.container);
      this.installNavigationObstacleObserver();
      this.setInteraction(spec.interaction||null);
    }
    d3(){return window.d3||null;}
    layoutDiagnostics(){return Object.freeze({...this.layoutState,legend:Object.freeze({...this.legendLayoutState})});}
    legendLayout(){return Object.freeze({...this.legendLayoutState});}
    legendOptions(){const raw=this.spec.legend;if(raw===false)return {enabled:false,placement:'none',interaction:'none'};if(raw&&typeof raw==='object')return {enabled:raw.enabled!==false,placement:String(raw.placement||'auto'),interaction:String(raw.interaction||'isolate'),maxRows:Math.max(1,Number(raw.maxRows)||3),group:String(raw.group||'')};return {enabled:true,placement:'auto',interaction:'isolate',maxRows:3,group:''};}
    curveLegendLabel(curve){const id=String(curve?.id||'');return this.scope.series?.label?.(id,curve?.label??curve?.name??curve?.title??id)||compactSeriesLabel(curve?.label??curve?.name??curve?.title??id);}
    categoricalColor(index=0){const d3=this.d3(),themed=globalThis.DKDSTheme?.scientific?.()?.seriesPalette,palette=Array.isArray(themed)&&themed.length>=2?themed:(Array.isArray(d3?.schemeTableau10)?d3.schemeTableau10:['#4e79a7','#f28e2b','#59a14f','#e15759','#76b7b2','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab']);return palette[Math.abs(Number(index)||0)%palette.length];}
    legendEntries(curves){const scale=this.colorScaleState?.scale;const rows=(Array.isArray(curves)?curves:[]).map((curve,index)=>{const scaled=this.finite(curve?.colorValue)&&typeof scale==='function'?String(scale(Number(curve.colorValue))):'';const initial=this.scope.series?.register?.({...curve,color:curve?.color||scaled||undefined},index);const color=String(curve?.color||scaled||initial?.color||this.categoricalColor(index));const reg=this.scope.series?.register?.({...curve,color},index);return {curve,id:String(curve?.id||reg?.id||''),label:this.curveLegendLabel(curve),color,group:String(curve?.legendGroup||curve?.legendgroup||reg?.group||''),visible:curve?.visible!==false};}).filter(row=>row.id&&row.label&&row.curve?.legend!==false);const groupId=this.legendOptions().group;if(groupId){const group=this.scope.legends?.group?.(groupId);if(group!==this.legendGroup){this.legendGroupOff?.();this.legendGroup=group;this.legendGroupOff=group?.register?.(this,rows)||null;}group?.setSeries?.(this,rows);}return rows;}
    installLegendHost(){
      if(this.legendController||!this.container)return;
      if(!plotPresentation?.LegendController)return;
      this.legendController=new plotPresentation.LegendController(this.container,{engine:'d3',ariaLabel:'图例',onActivate:({key,event})=>{
        const options=this.legendOptions();if(options.interaction==='none')return;const id=String(key||'');if(!id)return;
        if(this.legendGroup)this.legendSoloId=this.legendGroup.isolate(id);else this.legendSoloId=this.legendSoloId===id?'':id;
        this.legendSelectedId=this.legendSoloId;
        try{this.spec.onLegendChange?.({soloId:this.legendSoloId,curveId:id,visibleIds:this.legendGroup?.visibleIds?.()||(this.legendSoloId?[this.legendSoloId]:this.curves().filter(curve=>curve?.visible!==false).map(curve=>String(curve.id))),surface:this,event});}catch(err){console.warn('[DKDS ScientificCurveSurface legend]',err);}
        this.requestRender('legend');
      }});
      this.legendHost=this.legendController.host;
    }
    computeLegendLayout(width,height,curves,baseMargin){
      const options=this.legendOptions(),raw=this.legendEntries(curves),entries=raw.map(row=>({...row,key:row.id}));
      if(!plotPresentation?.solveLegend)return {enabled:false,placement:'none',count:entries.length,rows:0,width:0,height:0,reserve:0,entries};
      const metrics=plotPresentation.solveLegend({entries,width,height,margin:baseMargin,placement:options.placement,maxRows:Math.min(2,options.maxRows),enabled:options.enabled,previous:this.legendLayoutState,stabilize:true,options:{maxItemWidth:146,minPlotWidth:220}});
      return {...metrics,entries};
    }
    renderLegend(metrics,curves){
      const entries=metrics?.entries||[];
      if(this.legendSoloId&&!entries.some(row=>String(row.id||row.key)===this.legendSoloId))this.legendSoloId='';
      if(this.legendSelectedId&&!entries.some(row=>String(row.id||row.key)===this.legendSelectedId))this.legendSelectedId='';
      this.legendController?.update?.(entries.map(row=>({...row,key:String(row.id||row.key)})),metrics,{soloKey:this.legendSoloId,selectedKey:this.legendSelectedId});
      this.legendHost=this.legendController?.host||null;
      this.legendLayoutState=metrics?.enabled?{enabled:true,placement:metrics.placement,count:entries.length,rows:metrics.rows,width:Math.round(metrics.width||0),height:Math.round(metrics.height||0),reserve:Math.round(metrics.reserve||0),soloId:this.legendSoloId,selectedId:this.legendSelectedId}:{enabled:false,placement:'none',count:entries.length,rows:0,width:0,height:0,reserve:0,soloId:this.legendSoloId,selectedId:this.legendSelectedId};
    }
    visibleCurves(curves){let rows=(Array.isArray(curves)?curves:[]).filter(curve=>curve?.visible!==false);if(this.legendGroup){const visible=new Set(this.legendGroup.visibleIds());rows=rows.filter(curve=>visible.has(String(curve?.id||'')));}else if(this.legendSoloId)rows=rows.filter(curve=>String(curve?.id||'')===this.legendSoloId);return rows;}
    prepareLayoutGeometry(){
      const container=this.container;if(!container)return null;
      const preferredMinWidth=Number(this.spec.minWidth)||260,preferredMinHeight=Number(this.spec.minHeight)||180;
      const hardMinWidth=Math.max(72,Number(this.spec.hardMinWidth)||112),hardMinHeight=Math.max(72,Number(this.spec.hardMinHeight)||96);
      let rect=container.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height),fallbackApplied=false;
      const visible=container.isConnected&&getComputedStyle(container).display!=='none';
      if(visible&&height<preferredMinHeight){
        container.style.setProperty('--dkds-scientific-preferred-min-height',`${preferredMinHeight}px`);
        container.classList.add('dkds-scientific-layout-fallback');this.layoutFallbackOwned=true;fallbackApplied=true;
        rect=container.getBoundingClientRect();width=Math.round(rect.width);height=Math.round(rect.height);
      }else if(this.layoutFallbackOwned&&height>=preferredMinHeight){
        container.classList.remove('dkds-scientific-layout-fallback');container.style.removeProperty('--dkds-scientific-preferred-min-height');this.layoutFallbackOwned=false;
      }
      const compact=width<preferredMinWidth||height<preferredMinHeight;
      const renderable=width>=hardMinWidth&&height>=hardMinHeight;
      this.layoutState={status:renderable?(compact?'compact':'ready'):'waiting',width,height,preferredMinWidth,preferredMinHeight,hardMinWidth,hardMinHeight,fallbackApplied:this.layoutFallbackOwned||fallbackApplied,compact,reason:renderable?(compact?'preferred-size-unavailable':'ready'):(visible?'hard-minimum-unavailable':'hidden-or-detached')};
      container.dataset.dkdsScientificLayout=this.layoutState.status;
      return {...this.layoutState,rect};
    }
    adaptiveMargin(width,height){
      const configured=this.spec.margin||{};
      const compact=width<420||height<230;
      const tiny=width<300||height<150;
      const defaults=tiny?{top:18,right:12,bottom:34,left:48}:compact?{top:28,right:18,bottom:42,left:58}:{top:40,right:24,bottom:50,left:72};
      return {...defaults,...configured};
    }
    finite(value){return Number.isFinite(Number(value));}
    yDisplayValue(value){const n=Number(value);return this.displayYAxisType==='log'?Math.abs(n):n;}
    yDisplayable(value){const n=this.yDisplayValue(value);return Number.isFinite(n)&&(this.displayYAxisType!=='log'||n>0);}
    logDecadeTicks(domain){const rows=(Array.isArray(domain)?domain:[]).map(Number).filter(value=>Number.isFinite(value)&&value>0);if(rows.length<2)return rows;const lo=Math.min(...rows),hi=Math.max(...rows),from=Math.ceil(Math.log10(lo)-1e-12),to=Math.floor(Math.log10(hi)+1e-12),ticks=[];for(let exp=from;exp<=to;exp++)ticks.push(Math.pow(10,exp));if(!ticks.length){const mid=Math.pow(10,Math.round((Math.log10(lo)+Math.log10(hi))/2));if(mid>=lo&&mid<=hi)ticks.push(mid);}return ticks;}
    curves(){const rows=this.spec.getCurves?.()||[];return Array.isArray(rows)?rows.filter(Boolean):[];}
    markers(){const rows=this.spec.getMarkers?.()||[];return Array.isArray(rows)?rows.filter(Boolean):[];}
    manipulators(){const rows=this.spec.getManipulators?.()||[];return Array.isArray(rows)?rows.filter(row=>row&&row.id&&row.kind):[];}
    view(){const raw=this.spec.getView?.()||{};return raw&&typeof raw==='object'?raw:{};}
    setView(next,meta={}){this.spec.setView?.(next,meta);this.spec.onViewChanged?.(next,meta);}
    toggleYAxisDisplay(meta={}){const next=this.displayYAxisType==='log'?'linear':'log';if(next==='log'&&!this.curves().some(curve=>this.normalizedPoints(curve).some(point=>Math.abs(Number(point.y))>0)))return false;const current=this.view();this.displayYAxisType=next;this.target.dataset.dkdsYScale=this.displayYAxisType;this.setView({xDomain:Array.isArray(current.xDomain)?current.xDomain.slice():null,yDomain:null},{reason:'axis-scale-toggle',...meta});this.spec.onDisplayScaleChanged?.({axis:'y',type:this.displayYAxisType,surface:this,...meta});this.requestRender('axis-scale-toggle');return this.displayYAxisType;}
    setInteraction(interaction){if(this.interaction===interaction)return;this.selectionOff?.();this.selectionOff=null;this.interaction=interaction||null;if(this.interaction?.subscribe)this.selectionOff=this.interaction.subscribe(snapshot=>{this.selectionSnapshot=snapshot;this.requestRender('entity-selection');},{immediate:true});}
    routeInteraction(gesture,target,event,payload={},extra={}){const input={gesture,target,event,payload,targetId:String(extra.targetId||payload?.marker?.id||payload?.curve?.id||payload?.manipulator?.id||''),button:extra.button};return this.behavior?.route?.(input)||{handled:false,intent:'',binding:null,input};}
    interactionIntent(gesture,target,event,payload={},extra={}){return String(this.routeInteraction(gesture,target,event,payload,extra)?.intent||'');}
    canManipulate(manipulator,event){const input={gesture:'drag',target:'manipulator',event,payload:{manipulator,surface:this},targetId:String(manipulator?.id||'')};const decision=this.behavior?.resolve?.(input);return !decision?.binding||decision.intent==='manipulate';}
    focusEntityId(){return String(this.selectionSnapshot?.focus?.id||this.selectionSnapshot?.items?.at?.(-1)?.id||'');}
    selectionVisuals(){
      const theme=String(globalThis.DKDSTheme?.current?.()||globalThis.document?.documentElement?.dataset?.dkdsTheme||'').toLowerCase();
      const dark=theme==='dark'||(!theme&&globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
      const authored=this.spec.selectionVisuals&&typeof this.spec.selectionVisuals==='object'?this.spec.selectionVisuals:{};
      return {
        curveActiveOpacity:1,curveInactiveOpacity:dark?.055:.10,curveActiveWidth:dark?3.4:3,curveInactiveWidth:dark?.72:1.0,
        markerActiveOpacity:.98,markerInactiveOpacity:dark?.30:.50,markerOtherCurveOpacity:dark?.045:.08,
        ...authored
      };
    }
    ensureEntity(id,parentId=''){const key=String(id||'');if(!key)return null;try{return this.entities?.ensure?.({id:key,parents:parentId?[String(parentId)]:[]})||{id:key};}catch{return {id:key};}}
    selectedCurveId(){const explicit=String(this.spec.getSelectedCurveId?.()||'');if(explicit)return explicit;const focus=this.focusEntityId();if(!focus)return '';const ids=this.curves().map(row=>String(row?.entityId||row?.id||'')).filter(Boolean),set=new Set(ids);if(set.has(focus))return focus;return String(this.entities?.closestInSet?.(focus,set)||'');}
    selectedMarkerIds(){const explicit=(this.spec.getSelectedMarkerIds?.()||[]).map(String).filter(Boolean);if(explicit.length)return new Set(explicit);const markerIds=new Set(this.markers().map(row=>String(row?.entityId||row?.id||'')).filter(Boolean)),selected=new Set((this.selectionSnapshot?.items||[]).map(item=>String(item?.id||'')).filter(id=>markerIds.has(id)));const focus=this.focusEntityId();if(markerIds.has(focus))selected.add(focus);return selected;}
    selectEntity(id,{source='scientific-curve',additive=false,value=null,type='core.entity'}={}){const key=String(id||'');if(!key||!this.interaction?.select)return false;const entity=this.entities?.get?.(key)||{id:key,type,value};try{this.interaction.select({type:entity.type||type,id:key,ref:entity.ref||null,value:entity.value??value??entity,meta:{...(entity.metadata||{})}},{source,additive});return true;}catch{return false;}}
    curveById(id){return this.curves().find(row=>String(row.id)===String(id))||null;}
    normalizePoint(point,index=-1){
      const x=this.spec.xValue?this.spec.xValue(point):point?.x;
      const y=this.spec.yValue?this.spec.yValue(point):point?.y;
      return {x:Number(x),y:Number(y),raw:point,sourceIndex:index};
    }
    normalizedPoints(curve){return (curve?.points||[]).map((p,index)=>this.normalizePoint(p,index)).filter(p=>this.finite(p.x)&&this.finite(p.y));}
    nearestIndex(points,value){
      if(!points.length)return -1;const target=Number(value);
      if(!Number.isFinite(target))return 0;
      // A normalized point array is immutable for the lifetime of one render.
      // Determine its sweep order once, then reuse that metadata throughout
      // pointermove. This keeps ordered sweeps on the O(log n) hot path instead
      // of rescanning every sample on every drag event.
      let order=this.pointOrderCache.get(points);
      if(!order){
        const first=Number(points[0].x),last=Number(points.at(-1).x),ascending=last>=first;let ordered=true;
        for(let i=1;i<points.length;i++){const a=Number(points[i-1].x),b=Number(points[i].x);if((ascending&&b<a)||(!ascending&&b>a)){ordered=false;break;}}
        order={ascending,ordered};this.pointOrderCache.set(points,order);
      }
      if(!order.ordered){let best=0,dist=Infinity;for(let i=0;i<points.length;i++){const d=Math.abs(Number(points[i].x)-target);if(d<dist){dist=d;best=i;}}return best;}
      let lo=0,hi=points.length-1;
      while(lo<hi){const mid=(lo+hi)>>1,x=Number(points[mid].x);if(order.ascending?(x<target):(x>target))lo=mid+1;else hi=mid;}
      if(lo>0&&Math.abs(Number(points[lo-1].x)-target)<=Math.abs(Number(points[lo].x)-target))return lo-1;return lo;
    }
  }

module.exports=Object.freeze({ScientificCurveSurface});
