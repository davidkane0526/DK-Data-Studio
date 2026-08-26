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
      this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>{this.clampNavigationTools();this.requestRender('resize');this.scheduleNavigationCollisionCheck();}):null;
      this.resizeObserver?.observe(this.container);
      this.installNavigationObstacleObserver();
      this.setInteraction(spec.interaction||null);
    }
    d3(){return window.d3||null;}
    layoutDiagnostics(){return Object.freeze({...this.layoutState,legend:Object.freeze({...this.legendLayoutState})});}
    legendLayout(){return Object.freeze({...this.legendLayoutState});}
    legendOptions(){const raw=this.spec.legend;if(raw===false)return {enabled:false,placement:'none',interaction:'none'};if(raw&&typeof raw==='object')return {enabled:raw.enabled!==false,placement:String(raw.placement||'auto'),interaction:String(raw.interaction||'isolate'),maxRows:Math.max(1,Number(raw.maxRows)||3),group:String(raw.group||'')};return {enabled:true,placement:'auto',interaction:'isolate',maxRows:3,group:''};}
    curveLegendLabel(curve){const id=String(curve?.id||'');return this.scope.series?.label?.(id,curve?.label??curve?.name??curve?.title??id)||compactSeriesLabel(curve?.label??curve?.name??curve?.title??id);}
    categoricalColor(index=0){const d3=this.d3(),palette=Array.isArray(d3?.schemeTableau10)?d3.schemeTableau10:['#4e79a7','#f28e2b','#59a14f','#e15759','#76b7b2','#edc949','#af7aa1','#ff9da7','#9c755f','#bab0ab'];return palette[Math.abs(Number(index)||0)%palette.length];}
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
    toggleYAxisDisplay(meta={}){const next=this.displayYAxisType==='log'?'linear':'log';if(next==='log'&&!this.curves().some(curve=>this.normalizedPoints(curve).some(point=>Math.abs(Number(point.y))>0)))return false;this.displayYAxisType=next;this.target.dataset.dkdsYScale=this.displayYAxisType;this.spec.onDisplayScaleChanged?.({axis:'y',type:this.displayYAxisType,surface:this,...meta});this.requestRender('axis-scale-toggle');return this.displayYAxisType;}
    setInteraction(interaction){if(this.interaction===interaction)return;this.selectionOff?.();this.selectionOff=null;this.interaction=interaction||null;if(this.interaction?.subscribe)this.selectionOff=this.interaction.subscribe(snapshot=>{this.selectionSnapshot=snapshot;this.requestRender('entity-selection');},{immediate:true});}
    routeInteraction(gesture,target,event,payload={},extra={}){const input={gesture,target,event,payload,targetId:String(extra.targetId||payload?.marker?.id||payload?.curve?.id||payload?.manipulator?.id||''),button:extra.button};return this.behavior?.route?.(input)||{handled:false,intent:'',binding:null,input};}
    interactionIntent(gesture,target,event,payload={},extra={}){return String(this.routeInteraction(gesture,target,event,payload,extra)?.intent||'');}
    canManipulate(manipulator,event){const input={gesture:'drag',target:'manipulator',event,payload:{manipulator,surface:this},targetId:String(manipulator?.id||'')};const decision=this.behavior?.resolve?.(input);return !decision?.binding||decision.intent==='manipulate';}
    focusEntityId(){return String(this.selectionSnapshot?.focus?.id||this.selectionSnapshot?.items?.at?.(-1)?.id||'');}
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
    navigationToolsStorageKey(){
      const targetId=String(this.target?.id||this.container?.id||this.target?.dataset?.dkdsScientificPlotId||'').trim();
      return targetId?`${hostState.storagePrefix}.scientific-nav.${this.owner}.${targetId}`:'';
    }
    setNavigationToolsPosition(x,y,{persist=false,moved=true}={}){
      const tools=this.navTools,container=this.container;if(!tools||!container)return false;
      const hostRect=container.getBoundingClientRect(),toolRect=tools.getBoundingClientRect();
      if(!(hostRect.width>0&&hostRect.height>0&&toolRect.width>0&&toolRect.height>0))return false;
      const pad=4,maxX=Math.max(pad,hostRect.width-toolRect.width-pad),maxY=Math.max(pad,hostRect.height-toolRect.height-pad);
      const nx=Math.min(maxX,Math.max(pad,Number(x)||pad)),ny=Math.min(maxY,Math.max(pad,Number(y)||pad));
      tools.style.left=`${Math.round(nx)}px`;tools.style.top=`${Math.round(ny)}px`;tools.style.right='auto';tools.style.bottom='auto';if(moved)tools.dataset.moved='1';else delete tools.dataset.moved;
      if(persist){const key=this.navigationToolsStorageKey();if(key)writeJson(key,{x:nx,y:ny});}
      return true;
    }
    restoreNavigationToolsPosition(){
      const key=this.navigationToolsStorageKey();if(!key)return false;const saved=readJson(key,null);
      if(!saved||!Number.isFinite(Number(saved.x))||!Number.isFinite(Number(saved.y)))return false;
      requestAnimationFrame(()=>this.setNavigationToolsPosition(Number(saved.x),Number(saved.y)));return true;
    }
    resetNavigationToolsPosition(){
      const tools=this.navTools;if(!tools)return false;const key=this.navigationToolsStorageKey();if(key)try{localStorage.removeItem(key);}catch{}
      for(const prop of ['left','top','right','bottom'])tools.style.removeProperty(prop);delete tools.dataset.moved;return true;
    }
    navigationToolObstacles(){
      const container=this.container,tools=this.navTools;if(!container||!tools)return [];
      const hostRect=container.getBoundingClientRect(),selectors=['.main-legend-bar','.respar-main-legend','.respar-peak-legend','.reswin-group-legend','.trend-card-legend','.dkds-plot-legend','[data-dkds-legend]'],seen=new Set(),rows=[];
      for(const selector of selectors)for(const el of document.querySelectorAll(selector)){if(!el||el===tools||seen.has(el)||el.closest?.('.dkds-scientific-nav-tools'))continue;seen.add(el);const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;const r=el.getBoundingClientRect();const left=Math.max(hostRect.left,r.left),right=Math.min(hostRect.right,r.right),top=Math.max(hostRect.top,r.top),bottom=Math.min(hostRect.bottom,r.bottom);if(right>left&&bottom>top)rows.push({el,rect:r});}
      return rows;
    }
    isNavigationLegendNode(node){
      const el=node?.nodeType===1?node:node?.parentElement;if(!el?.closest)return false;
      return !!el.closest('.main-legend-bar,.respar-main-legend,.respar-peak-legend,.reswin-group-legend,.trend-card-legend,.dkds-plot-legend,[data-dkds-legend]');
    }
    scheduleNavigationCollisionCheck(){
      if(this.disposed||this.navCollisionFrame)return;this.navCollisionFrame=requestAnimationFrame(()=>{this.navCollisionFrame=0;if(!this.disposed)this.avoidNavigationToolCollisions();});
    }
    installNavigationObstacleObserver(){
      if(!window.MutationObserver||this.navObstacleObserver)return false;
      const root=this.container?.closest?.('.dkds-workbench,.respar-main-card,.trend-card,.card')||this.container?.parentElement||this.container;if(!root)return false;
      this.navObstacleObserver=new MutationObserver(records=>{for(const record of records){if(this.isNavigationLegendNode(record.target)||[...(record.addedNodes||[])].some(node=>this.isNavigationLegendNode(node))||[...(record.removedNodes||[])].some(node=>this.isNavigationLegendNode(node))){this.scheduleNavigationCollisionCheck();break;}}});
      this.navObstacleObserver.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});return true;
    }
    avoidNavigationToolCollisions(){
      const tools=this.navTools,container=this.container;if(!tools||!container||tools.classList.contains('is-dragging'))return false;
      const host=container.getBoundingClientRect(),tr=tools.getBoundingClientRect();if(!(host.width>0&&host.height>0&&tr.width>0&&tr.height>0))return false;
      const obstacles=this.navigationToolObstacles(),userMoved=tools.dataset.moved==='1',margin=this.lastRender?.margin||{top:0,right:0,bottom:0,left:0},pad=8;
      const overlap=(x,y)=>{const candidate={left:host.left+x,top:host.top+y,right:host.left+x+tr.width,bottom:host.top+y+tr.height};let area=0;for(const row of obstacles){const r=row.rect,w=Math.max(0,Math.min(candidate.right,r.right)-Math.max(candidate.left,r.left)),h=Math.max(0,Math.min(candidate.bottom,r.bottom)-Math.max(candidate.top,r.top));area+=w*h;}return area;};
      const defaultPos={x:Math.max(pad,host.width-tr.width-pad),y:pad};
      const currentX=Number.parseFloat(tools.style.left),currentY=Number.parseFloat(tools.style.top),current={x:Number.isFinite(currentX)?currentX:defaultPos.x,y:Number.isFinite(currentY)?currentY:defaultPos.y};
      if(overlap(current.x,current.y)<=0){if(!userMoved&&Number.isFinite(currentX)&&overlap(defaultPos.x,defaultPos.y)<=0)this.resetNavigationToolsPosition();return false;}
      const rightX=Math.max(pad,host.width-tr.width-pad),leftX=Math.max(pad,Number(margin.left)||pad),bottomY=Math.max(pad,host.height-tr.height-Math.max(pad,Number(margin.bottom)||0)-pad),topY=Math.max(pad,Number(margin.top)>tr.height?Math.min(pad,Number(margin.top)-tr.height-pad):pad),candidates=[defaultPos,{x:rightX,y:bottomY},{x:leftX,y:topY},{x:leftX,y:bottomY}];
      for(const row of obstacles){const below=Math.max(pad,row.rect.bottom-host.top+6),above=Math.max(pad,row.rect.top-host.top-tr.height-6);candidates.push({x:rightX,y:below},{x:leftX,y:below},{x:rightX,y:above},{x:leftX,y:above});}
      const unique=[];const seen=new Set();for(const c of candidates){const x=Math.min(Math.max(pad,c.x),Math.max(pad,host.width-tr.width-pad)),y=Math.min(Math.max(pad,c.y),Math.max(pad,host.height-tr.height-pad)),key=`${Math.round(x)}:${Math.round(y)}`;if(!seen.has(key)){seen.add(key);unique.push({x,y});}}
      unique.sort((a,b)=>overlap(a.x,a.y)-overlap(b.x,b.y)||Math.hypot(a.x-current.x,a.y-current.y)-Math.hypot(b.x-current.x,b.y-current.y));const best=unique[0];if(!best)return false;return this.setNavigationToolsPosition(best.x,best.y,{persist:userMoved,moved:userMoved});
    }
    clampNavigationTools(){
      const tools=this.navTools;if(!tools)return false;
      const x=Number.parseFloat(tools.style.left),y=Number.parseFloat(tools.style.top);if(!Number.isFinite(x)||!Number.isFinite(y))return false;
      return this.setNavigationToolsPosition(x,y,{persist:false,moved:tools.dataset.moved==='1'});
    }
    installNavigationTools(){
      if(this.spec.navigationTools===false||this.navTools)return;
      const tools=document.createElement('div');tools.className='dkds-scientific-nav-tools dkds-integrated-action-group dkds-material-role-floating';tools.setAttribute('aria-label','图形操作');
      const drag=document.createElement('span');drag.className='dkds-scientific-nav-drag';drag.setAttribute('role','button');drag.setAttribute('tabindex','0');drag.setAttribute('aria-label','拖动图形工具条');drag.title='拖动工具条；双击恢复默认位置';drag.textContent='⋮';tools.appendChild(drag);
      const rows=[['zoom-in','＋','放大'],['zoom-out','−','缩小'],['home','⌂','恢复全部数据']];
      for(const [action,label,title] of rows){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;button.title=title;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(action==='home')this.resetView({reason:'toolbar-home'});else this.zoomBy(action==='zoom-in'?0.72:1.38,{reason:`toolbar-${action}`});});tools.appendChild(button);}
      this.container.appendChild(tools);this.navTools=tools;
      let dragState=null;
      drag.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;event.preventDefault();event.stopPropagation();
        const hostRect=this.container.getBoundingClientRect(),toolRect=tools.getBoundingClientRect();
        dragState={pointerId:event.pointerId,startClientX:event.clientX,startClientY:event.clientY,startX:toolRect.left-hostRect.left,startY:toolRect.top-hostRect.top};
        tools.classList.add('is-dragging');try{drag.setPointerCapture(event.pointerId);}catch{}
      });
      drag.addEventListener('pointermove',event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;event.preventDefault();this.setNavigationToolsPosition(dragState.startX+event.clientX-dragState.startClientX,dragState.startY+event.clientY-dragState.startClientY);});
      const finishDrag=event=>{if(!dragState||event.pointerId!==dragState.pointerId)return;const pointerId=dragState.pointerId;dragState=null;tools.classList.remove('is-dragging');try{drag.releasePointerCapture(pointerId);}catch{}const x=Number.parseFloat(tools.style.left),y=Number.parseFloat(tools.style.top);if(Number.isFinite(x)&&Number.isFinite(y))this.setNavigationToolsPosition(x,y,{persist:true});this.scheduleNavigationCollisionCheck();};
      drag.addEventListener('pointerup',finishDrag);drag.addEventListener('pointercancel',finishDrag);
      drag.addEventListener('dblclick',event=>{event.preventDefault();event.stopPropagation();this.resetNavigationToolsPosition();});
      drag.addEventListener('keydown',event=>{if(event.key==='Home'||event.key==='Escape'){event.preventDefault();this.resetNavigationToolsPosition();}});
      this.restoreNavigationToolsPosition();this.scheduleNavigationCollisionCheck();
    }
    zoomBy(factor,meta={}){
      const last=this.lastRender;if(!last)return false;const xd=last.x.domain(),yd=last.y.domain(),cx=(xd[0]+xd[1])/2,cy=(yd[0]+yd[1])/2;
      this.setView({xDomain:this.scaleDomainAround(xd,cx,Number(factor)||1),yDomain:this.scaleDomainAround(yd,cy,Number(factor)||1)},{reason:'toolbar-zoom',...meta});this.requestRender('toolbar-zoom');return true;
    }
    scaleDomainAround(domain,center,factor,minSpan=1e-12){const lo=center+(domain[0]-center)*factor,hi=center+(domain[1]-center)*factor;return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=minSpan?[lo,hi]:domain.slice();}
    symbolType(shape,d3){return ({circle:d3.symbolCircle,diamond:d3.symbolDiamond,triangle:d3.symbolTriangle,square:d3.symbolSquare,cross:d3.symbolCross,star:d3.symbolStar})[String(shape||'circle')]||d3.symbolCircle;}
    requestRender(reason='request'){if(this.disposed||this.renderQueued)return;this.renderQueued=true;requestAnimationFrame(()=>{this.renderQueued=false;if(!this.disposed)this.render(reason);});}
    fitToData(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'fit-data',...meta});this.spec.onFit?.(meta);this.requestRender('fit-data');return true;}
    resetView(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'reset',...meta});this.spec.onReset?.(meta);this.requestRender('reset');return true;}
    updateMarkerVisual(marker,point){
      const last=this.lastRender;if(!last||!marker||!point)return false;const id=String(marker.id),xv=Number(point.x??point.v),yv=Number(point.y??point.i);if(!Number.isFinite(xv)||!Number.isFinite(yv))return false;
      marker.x=xv;marker.y=yv;const {dataLayer,x,y}=last;if(!dataLayer||!x||!y)return false;
      const nodes=last.markerNodes?.get?.(id),visible=this.yDisplayable(yv);
      if(nodes?.mark){nodes.mark.style.display=visible?'':'none';if(visible)nodes.mark.setAttribute('transform',`translate(${x(xv)},${y(this.yDisplayValue(yv))})`);}else dataLayer.selectAll('path.dkds-scientific-marker').filter(d=>String(d?.id)===id).style('display',visible?null:'none').attr('transform',visible?`translate(${x(xv)},${y(this.yDisplayValue(yv))})`:null);
      if(nodes?.hit){nodes.hit.style.display=visible?'':'none';if(visible){nodes.hit.setAttribute('cx',String(x(xv)));nodes.hit.setAttribute('cy',String(y(this.yDisplayValue(yv))));}}else dataLayer.selectAll('circle.dkds-scientific-marker-hit').filter(d=>String(d?.id)===id).style('display',visible?null:'none').attr('cx',visible?x(xv):null).attr('cy',visible?y(yv):null);
      return true;
    }
    nearestCurveAtPixel(px,py,x,y,curves,maxDistancePx=18){
      let best=null;
      for(const curve of curves){const points=this.normalizedPoints(curve);if(!points.length)continue;const idx=this.nearestIndex(points,x.invert(px));for(let j=Math.max(0,idx-2);j<=Math.min(points.length-1,idx+2);j++){const p=points[j];if(!this.yDisplayable(p.y))continue;const dx=x(p.x)-px,dy=y(this.yDisplayValue(p.y))-py,dist=Math.hypot(dx,dy);if(!best||dist<best.distance)best={curve,point:p,index:Number.isFinite(Number(p.sourceIndex))?Number(p.sourceIndex):j,distance:dist};}}
      return best&&best.distance<=maxDistancePx?best:null;
    }
    render(reason='render'){
      const d3=this.d3(),node=this.target,container=this.container;if(!d3||!node||!container)return false;
      const geometry=this.prepareLayoutGeometry();if(!geometry)return false;const {width,height}=geometry;
      if(geometry.status==='waiting'){this.awaitingLayout=true;return false;}this.awaitingLayout=false;
      const allCurves=this.curves(),svg=d3.select(node);svg.on('.dkdssci',null).attr('viewBox',null).attr('preserveAspectRatio',null).attr('width',width).attr('height',height).style('width',`${width}px`).style('height',`${height}px`);svg.selectAll('*').remove();
      if(!allCurves.length){this.renderLegend({enabled:false,entries:[]},allCurves);this.spec.onEmpty?.({svg,width,height});if(!this.spec.onEmpty)svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('fill','#6b7280').text(this.spec.emptyText||'没有可显示的数据');return true;}
      const baseMargin=this.adaptiveMargin(width,height),legendMetrics=this.computeLegendLayout(width,height,allCurves,baseMargin),margin={...baseMargin};if(legendMetrics.reserve>0&&legendMetrics.placement!=='none'){if(legendMetrics.placement==='right')margin.right=Math.max(margin.right,legendMetrics.reserve+8);else if(legendMetrics.placement==='left')margin.left=Math.max(margin.left,legendMetrics.reserve+40);else if(legendMetrics.placement==='top')margin.top=Math.max(margin.top,legendMetrics.reserve+8);else margin.bottom=Math.max(margin.bottom,legendMetrics.reserve+42);}this.renderLegend(legendMetrics,allCurves);const curves=this.visibleCurves(allCurves),innerW=Math.max(24,width-margin.left-margin.right),innerH=Math.max(24,height-margin.top-margin.bottom);
      const normalized=new Map(curves.map(curve=>[String(curve.id),this.normalizedPoints(curve)]));
      const xs=[...normalized.values()].flatMap(rows=>rows.map(p=>p.x)),ys=[...normalized.values()].flatMap(rows=>rows.map(p=>p.y));if(!xs.length||!ys.length)return false;
      const fullX=d3.extent(xs),logY=this.displayYAxisType==='log',displayYs=logY?ys.map(value=>Math.abs(Number(value))).filter(value=>Number.isFinite(value)&&value>0):ys;let fullY=d3.extent(displayYs.length?displayYs:ys);
      if(logY){const lo=Math.max(Number.MIN_VALUE,Number(fullY[0])),hi=Math.max(lo*(1+1e-9),Number(fullY[1]));fullY=[lo/Math.pow(10,.04),hi*Math.pow(10,.04)];}
      else{const ypad=((fullY[1]-fullY[0])||1)*Number(this.spec.yPaddingFactor??.06);fullY=[fullY[0]-ypad,fullY[1]+ypad];}
      const view=this.view();let xDomain=Array.isArray(view.xDomain)?view.xDomain.slice():d3.scaleLinear().domain(fullX).nice().domain(),candidateY=Array.isArray(view.yDomain)?view.yDomain.slice():null,yDomain=(candidateY&&(!logY||candidateY.every(value=>Number(value)>0)))?candidateY:(logY?fullY.slice():d3.scaleLinear().domain(fullY).nice().domain());
      if(!xDomain.every(Number.isFinite)||xDomain[0]===xDomain[1])xDomain=fullX.slice();if(!yDomain.every(Number.isFinite)||yDomain[0]===yDomain[1]||(logY&&yDomain.some(value=>Number(value)<=0)))yDomain=fullY.slice();
      const x=d3.scaleLinear().domain(xDomain).range([margin.left,margin.left+innerW]),y=(logY?d3.scaleLog():d3.scaleLinear()).domain(yDomain).range([margin.top+innerH,margin.top]);
      const clipId=`dkds-sci-clip-${Math.random().toString(36).slice(2,9)}`;svg.append('defs').append('clipPath').attr('id',clipId).append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH);
      const plotBg=svg.append('rect').attr('class','dkds-scientific-plot-bg').attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH).style('cursor','crosshair');
      svg.append('g').attr('class','dkds-scientific-axis dkds-scientific-x-axis').attr('transform',`translate(0,${margin.top+innerH})`).call(d3.axisBottom(x).tickFormat(this.spec.xTickFormat||undefined));
      const yAxisGenerator=d3.axisLeft(y).tickFormat(this.spec.yTickFormat||undefined);if(logY)yAxisGenerator.tickValues(this.logDecadeTicks(y.domain()));
      const yAxis=svg.append('g').attr('class','dkds-scientific-axis dkds-scientific-y-axis').attr('transform',`translate(${margin.left},0)`).style('cursor','pointer').call(yAxisGenerator);
      const toggleY=event=>{event.preventDefault();event.stopPropagation();this.toggleYAxisDisplay({event,source:'axis-double-click'});};
      svg.append('rect').attr('class','dkds-scientific-y-axis-hit').attr('x',0).attr('y',Math.max(0,margin.top-14)).attr('width',margin.left+12).attr('height',innerH+28).attr('fill','transparent').style('cursor','pointer').on('dblclick.dkdsyaxis',toggleY);
      yAxis.raise().on('dblclick.dkdsyaxis',toggleY);
      if(this.spec.xTitle!==false)svg.append('text').attr('class','dkds-scientific-axis-title').attr('x',margin.left+innerW/2).attr('y',height-10).attr('text-anchor','middle').text(this.spec.xTitle||'X');
      if(this.spec.yTitle!==false)svg.append('text').attr('class','dkds-scientific-axis-title dkds-scientific-y-axis-title').style('cursor','pointer').attr('transform',`translate(18,${margin.top+innerH/2}) rotate(-90)`).attr('text-anchor','middle').text(this.spec.yTitle||'Y').on('dblclick.dkdsyaxis',toggleY);
      const configuredColorValues=this.spec.getColorDomainValues?.();const values=(Array.isArray(configuredColorValues)&&configuredColorValues.some(v=>this.finite(v))?configuredColorValues:curves.map(c=>c.colorValue)).filter(v=>this.finite(v)).map(Number);if(!values.length)values.push(0);const extent=d3.extent(values);if(extent[0]===extent[1]){extent[0]-=1;extent[1]+=1;}
      // Color-domain changes are semantic data changes, not selection/drag changes.
      // Keep the scale stable across geometry-only renders so external legends do
      // not rebuild or flicker when a marker is dragged or focus changes.
      const colorScaleKey=`${extent[0]}|${extent[1]}|${values.join(',')}`;let colorScale=this.colorScaleState?.key===colorScaleKey?this.colorScaleState.scale:null;
      if(!colorScale){colorScale=this.spec.colorScale?.({d3,extent,curves,values})||d3.scaleSequential(d3.interpolateTurbo).domain(extent);this.colorScaleState={key:colorScaleKey,scale:colorScale};this.spec.onColorScale?.(colorScale,{curves,extent,values});}
      const colorById=new Map(curves.map((curve,index)=>[String(curve.id),curve.color||(this.finite(curve.colorValue)?colorScale(Number(curve.colorValue)):this.categoricalColor(index))]));this.renderLegend({...legendMetrics,entries:this.legendEntries(allCurves)},allCurves);
      for(const curve of curves)this.ensureEntity(curve?.entityId||curve?.id);const selectedCurveId=this.selectedCurveId(),hasCurveSelection=!!selectedCurveId,dataLayer=svg.append('g').attr('clip-path',`url(#${clipId})`);
      const line=d3.line().defined(p=>this.finite(p.x)&&this.yDisplayable(p.y)).x(p=>x(p.x)).y(p=>y(this.yDisplayValue(p.y)));
      for(const curve of curves){
        const points=normalized.get(String(curve.id))||[],active=String(curve.id)===selectedCurveId,color=colorById.get(String(curve.id))||this.categoricalColor(0),dash=curve.dash??(Number(curve.direction)<0?'7 4':null);
        const opacity=curve.opacity??(hasCurveSelection?(active?1:.10):.74),strokeWidth=curve.strokeWidth??(active?3:1.25);
        dataLayer.append('path').datum(points).attr('class',`dkds-scientific-curve ${hasCurveSelection&&!active?'is-dimmed':''}`).attr('d',line).attr('stroke',color).attr('stroke-width',strokeWidth).attr('stroke-dasharray',dash).attr('opacity',opacity).style('pointer-events','none');
        dataLayer.append('path').datum(points).attr('class','dkds-scientific-curve-hit').attr('d',line)
          .on('click',(event)=>{event.stopPropagation();this.legendSelectedId=String(curve?.id||'');this.renderLegend({...legendMetrics,entries:this.legendEntries(allCurves)},allCurves);const [px]=d3.pointer(event,node),xValue=x.invert(px),payload={curve,x:xValue,event,surface:this,source:'curve-hit'};const decision=this.routeInteraction('click','curve',event,payload,{targetId:curve?.id});if(decision.handled)return;if(decision.intent==='select'){payload.additive=decision.binding?.selectionMode==='additive';if(this.spec.onCurveSelect)this.spec.onCurveSelect(payload);else this.selectEntity(curve?.entityId||curve?.id,{source:this.spec.source||'scientific-curve',additive:payload.additive,value:curve?.source||curve});}else if(decision.intent==='activate')this.spec.onCurveDoubleClick?.(payload);else if(decision.intent==='command'&&this.spec.onCurveModifiedClick)this.spec.onCurveModifiedClick(payload);})
          .on('dblclick',event=>{event.preventDefault();event.stopPropagation();const payload={curve,event,surface:this,source:'curve-hit'};const decision=this.routeInteraction('double-click','curve',event,payload,{targetId:curve?.id});if(decision.handled)return;if(decision.intent==='activate'){if(this.spec.onCurveDoubleClick)this.spec.onCurveDoubleClick(payload);else this.selectEntity(curve?.entityId||curve?.id,{source:this.spec.source||'scientific-curve-double',value:curve?.source||curve});}});
      }
      const markers=this.markers();for(const marker of markers)this.ensureEntity(marker?.entityId||marker?.id,marker?.curveId||'');const selectedMarkerIds=this.selectedMarkerIds(),selectedMarker=markers.find(m=>selectedMarkerIds.has(String(m.id))),markerNodes=new Map(),curveById=new Map(curves.map(curve=>[String(curve.id),curve]));
      const declaredManipulators=this.manipulators(),manipulators=declaredManipulators.slice();
      // v1.10 compatibility is intentionally implemented as an adapter into the
      // generic manipulation model. New plugins should never need marker/FWHM-
      // named drag contracts: a marker move is a point manipulator and an
      // analysis window is simply an axis range manipulator.
      if(!this.spec.getManipulators){
        if(this.spec.onMarkerDragStart||this.spec.onMarkerDragPreview||this.spec.onMarkerDragCommit||this.spec.onMarkerDrag||this.spec.onMarkerDragEnd){
          for(const marker of markers)manipulators.push({id:`compat:marker:${marker.id}`,kind:'point',targetId:String(marker.id),geometry:{x:Number(marker.x),y:Number(marker.y)},snap:{kind:'curve',curveId:String(marker.curveId)},locked:!!marker.locked,source:{compat:'marker',marker}});
        }
        if(selectedMarker&&this.spec.showWidth?.()!==false){
          const widthSpec=this.spec.getMarkerWidth?.(selectedMarker)||selectedMarker.width;
          const wl=Number(widthSpec?.windowLeft),wr=Number(widthSpec?.windowRight);
          if(Number.isFinite(wl)&&Number.isFinite(wr)&&wr>wl&&(this.spec.onWidthDragStart||this.spec.onWidthDragPreview||this.spec.onWidthWindowCommit||this.spec.onWidthDrag||this.spec.onWidthDragEnd||this.spec.onWidthReset)){
            manipulators.push({id:`compat:width:${selectedMarker.id}`,kind:'range',axis:'x',geometry:{start:wl,end:wr},snap:{kind:'curve',curveId:String(selectedMarker.curveId)},constraints:{contains:Number(selectedMarker.x)},presentation:{color:selectedMarker.color||'#2563eb',band:true,handlePosition:widthSpec?.handlePosition||'top'},locked:!!selectedMarker.locked,source:{compat:'width',marker:selectedMarker,widthSpec}});
          }
        }
      }
      const manipulatorByTarget=new Map(manipulators.filter(row=>row.kind==='point'&&row.targetId).map(row=>[String(row.targetId),row]));
      const emitManipulation=(phase,payload)=>{
        const fn=phase==='start'?this.spec.onManipulationStart:phase==='preview'?this.spec.onManipulationPreview:phase==='commit'?this.spec.onManipulationCommit:null;
        fn?.(payload);
        const compat=payload?.manipulator?.source?.compat;
        if(compat==='marker'){
          const legacy={marker:payload.manipulator.source.marker,curve:payload.curve||null,index:payload.index??-1,point:payload.point??null,event:payload.event,surface:this};
          if(phase==='start')this.spec.onMarkerDragStart?.(legacy);
          else if(phase==='preview'){this.spec.onMarkerDragPreview?.(legacy);this.spec.onMarkerDrag?.(legacy);}
          else if(phase==='commit'){this.spec.onMarkerDragCommit?.(legacy);this.spec.onMarkerDragEnd?.(legacy);}
        }else if(compat==='width'){
          const g=payload.geometry||{},ig=payload.initialGeometry||{},legacy={marker:payload.manipulator.source.marker,curve:payload.curve||null,side:payload.handle==='start'?'left':'right',index:payload.index??-1,point:payload.point??null,windowLeft:Number(g.start),windowRight:Number(g.end),initialWindowLeft:Number(ig.start),initialWindowRight:Number(ig.end),event:payload.event,surface:this};
          if(phase==='start')this.spec.onWidthDragStart?.(legacy);
          else if(phase==='preview'){this.spec.onWidthDragPreview?.(legacy);this.spec.onWidthDrag?.(legacy);}
          else if(phase==='commit'){this.spec.onWidthWindowCommit?.(legacy);this.spec.onWidthDragEnd?.(legacy);}
        }
      };
      const resetManipulator=(manipulator,event,handle='')=>{
        const payload={manipulator,handle,event,surface:this};this.spec.onManipulationReset?.(payload);
        if(manipulator?.source?.compat==='width')this.spec.onWidthReset?.({marker:manipulator.source.marker,side:handle==='start'?'left':'right',event,surface:this});
        this.requestRender('manipulation-reset');
      };
      const snapToCurve=(manipulator,event)=>{
        const curveId=String(manipulator?.snap?.curveId||manipulator?.curveId||'');
        if(manipulator?.snap?.kind!=='curve'||!curveId)return {curve:null,index:-1,point:null,xValue:x.invert(event.x),yValue:y.invert(event.y)};
        const curve=curveById.get(curveId),points=normalized.get(curveId)||[];if(!curve||!points.length)return {curve:null,index:-1,point:null,xValue:x.invert(event.x),yValue:y.invert(event.y)};
        const idx=this.nearestIndex(points,x.invert(event.x)),point=points[idx],sourceIndex=Number.isFinite(Number(point?.sourceIndex))?Number(point.sourceIndex):idx;
        return {curve,index:sourceIndex,point:point?.raw||point,xValue:Number(point?.x),yValue:Number(point?.y)};
      };
      if(this.spec.showMarkers?.()!==false&&markers.length){
        const marks=dataLayer.append('g').selectAll('path.dkds-scientific-marker').data(markers,m=>m.id).join('path').attr('class',m=>`dkds-scientific-marker ${m.locked?'is-locked':''} ${hasCurveSelection&&String(m.curveId)!==selectedCurveId?'is-dimmed':''}`)
          .attr('d',m=>d3.symbol().type(this.symbolType(m.shape,d3)).size(selectedMarkerIds.has(String(m.id))?180:105)()).style('display',m=>this.yDisplayable(m.y)?null:'none').attr('transform',m=>this.yDisplayable(m.y)?`translate(${x(Number(m.x))},${y(this.yDisplayValue(m.y))})`:null).attr('fill',m=>m.color||'#2563eb')
          .attr('stroke',m=>selectedMarkerIds.has(String(m.id))?'#111827':(m.accepted!==false?'#fff':'#6b7280')).attr('stroke-width',m=>selectedMarkerIds.has(String(m.id))?3.2:1.8).attr('opacity',m=>{let o=m.accepted!==false?.98:.34;if(hasCurveSelection&&String(m.curveId)!==selectedCurveId)o*=.11;return o;}).style('pointer-events','none');
        const hits=dataLayer.append('g').selectAll('circle.dkds-scientific-marker-hit').data(markers,m=>m.id).join('circle').attr('class',m=>`dkds-scientific-marker-hit ${m.locked?'is-locked':''} ${manipulatorByTarget.has(String(m.id))?'is-manipulable':''}`).style('display',m=>this.yDisplayable(m.y)?null:'none').attr('cx',m=>this.yDisplayable(m.y)?x(Number(m.x)):null).attr('cy',m=>this.yDisplayable(m.y)?y(this.yDisplayValue(m.y)):null).attr('r',m=>selectedMarkerIds.has(String(m.id))?12:10)
          .on('click',(event,marker)=>{event.stopPropagation();const id=String(marker?.id||'');if((this.markerClickSuppressUntil.get(id)||0)>Date.now()){event.preventDefault();return;}const payload={marker,event,surface:this,additive:false};const decision=this.routeInteraction('click','marker',event,payload,{targetId:id});if(decision.handled)return;if(decision.intent==='select'){payload.additive=decision.binding?.selectionMode==='additive';this.spec.onMarkerSelect?.(payload);}})
          .on('dblclick',(event,marker)=>{event.preventDefault();event.stopPropagation();const payload={marker,event,surface:this};const decision=this.routeInteraction('double-click','marker',event,payload,{targetId:marker?.id});if(decision.handled)return;if(decision.intent==='activate')this.spec.onMarkerDoubleClick?.(payload);})
          .on('contextmenu',(event,marker)=>{const payload={marker,event,surface:this};const decision=this.routeInteraction('context','marker',event,payload,{targetId:marker?.id,button:'secondary'});if(decision.handled){event.preventDefault();event.stopPropagation();return;}if(decision.intent==='context-menu'&&(event.ctrlKey||event.shiftKey)){event.preventDefault();event.stopPropagation();if(!marker.locked)this.spec.onMarkerDelete?.(payload);else this.spec.onLockedMarkerAction?.({marker,action:'delete',event,surface:this});}})
          .on('mouseenter',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'enter'})).on('mousemove',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'move'})).on('mouseleave',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'leave'}));
        marks.each(function(marker){const id=String(marker?.id||'');if(!id)return;const row=markerNodes.get(id)||{};row.mark=this;markerNodes.set(id,row);});
        hits.each(function(marker){const id=String(marker?.id||'');if(!id)return;const row=markerNodes.get(id)||{};row.hit=this;markerNodes.set(id,row);});
        const dragState=new Map();
        hits.call(d3.drag().clickDistance(7).filter((event,marker)=>{const manipulator=manipulatorByTarget.get(String(marker?.id||''));return event.button===0&&!!manipulator&&this.canManipulate(manipulator,event);}).on('start',(event,marker)=>{
          const manipulator=manipulatorByTarget.get(String(marker.id));if(!manipulator||manipulator.locked||marker.locked)return;const geometry={x:Number(manipulator.geometry?.x??marker.x),y:Number(manipulator.geometry?.y??marker.y)};dragState.set(String(marker.id),{x:Number(event.x),y:Number(event.y),moved:false,manipulator,initialGeometry:{...geometry},geometry:{...geometry},curve:null,index:-1,point:null});emitManipulation('start',{manipulator,handle:'point',geometry:{...geometry},initialGeometry:{...geometry},event,surface:this});
        }).on('drag',(event,marker)=>{
          const state=dragState.get(String(marker.id));if(!state||state.manipulator.locked||marker.locked)return;if(!state.moved){state.moved=Math.hypot(Number(event.x)-state.x,Number(event.y)-state.y)>=5;if(!state.moved)return;}
          const snapped=snapToCurve(state.manipulator,event),axis=String(state.manipulator.axis||'xy');let nx=snapped.xValue,ny=snapped.yValue;if(axis==='x')ny=state.initialGeometry.y;if(axis==='y')nx=state.initialGeometry.x;state.geometry={x:Number(nx),y:Number(ny)};state.curve=snapped.curve;state.index=snapped.index;state.point=snapped.point;
          const payload={manipulator:state.manipulator,handle:'point',geometry:{...state.geometry},initialGeometry:{...state.initialGeometry},curve:snapped.curve,index:snapped.index,point:snapped.point,event,surface:this};emitManipulation('preview',payload);this.updateMarkerVisual(marker,{x:nx,y:ny});
        }).on('end',(event,marker)=>{
          const state=dragState.get(String(marker.id));dragState.delete(String(marker.id));if(!state?.moved)return;this.markerClickSuppressUntil.set(String(marker.id),Date.now()+160);emitManipulation('commit',{manipulator:state.manipulator,handle:'point',geometry:{...state.geometry},initialGeometry:{...state.initialGeometry},curve:state.curve,index:state.index,point:state.point,event,surface:this});this.requestRender('manipulation-end');
        }));
      }
      // Width/FWHM is presentation only here. Editing is owned by the generic
      // range manipulator below, so measurement semantics and interaction
      // semantics are no longer coupled.
      if(selectedMarker&&this.spec.showWidth?.()!==false){
        const widthSpec=this.spec.getMarkerWidth?.(selectedMarker)||selectedMarker.width;
        if(widthSpec){
          const finite=v=>this.finite(v),color=selectedMarker.color||'#2563eb';let measureLeft=finite(widthSpec.left)?Number(widthSpec.left):NaN,measureRight=finite(widthSpec.right)?Number(widthSpec.right):NaN;if(finite(measureLeft)&&finite(measureRight)&&measureLeft>measureRight)[measureLeft,measureRight]=[measureRight,measureLeft];
          const layer=svg.append('g').attr('clip-path',`url(#${clipId})`),baseline=widthSpec.baseline;
          if(baseline&&finite(baseline.x1)&&finite(baseline.x2)&&finite(baseline.y1)&&finite(baseline.y2))layer.append('line').attr('class','dkds-scientific-baseline-line').attr('x1',x(Number(baseline.x1))).attr('x2',x(Number(baseline.x2))).attr('y1',y(this.yDisplayValue(baseline.y1))).attr('y2',y(this.yDisplayValue(baseline.y2))).attr('stroke',color);
          if(finite(measureLeft)&&finite(measureRight)&&measureRight>measureLeft){const yLeft=finite(widthSpec.yLeft)?Number(widthSpec.yLeft):(finite(widthSpec.y)?Number(widthSpec.y):Number(selectedMarker.y)),yRight=finite(widthSpec.yRight)?Number(widthSpec.yRight):yLeft;layer.append('line').attr('class','dkds-scientific-width-line').attr('x1',x(measureLeft)).attr('x2',x(measureRight)).attr('y1',y(this.yDisplayValue(yLeft))).attr('y2',y(this.yDisplayValue(yRight))).attr('stroke',color);for(const row of [{x:measureLeft,y:yLeft},{x:measureRight,y:yRight}])layer.append('circle').attr('class','dkds-scientific-width-crossing').attr('cx',x(row.x)).attr('cy',y(this.yDisplayValue(row.y))).attr('r',3.5).attr('fill','#fff').attr('stroke',color).attr('stroke-width',1.6);}
        }
      }
      // Generic direct-manipulation primitives. These know only geometry,
      // snapping and constraints; domain meanings such as peak, threshold,
      // fit interval, crop window or FWHM belong entirely to the plugin.
      for(const manipulator of manipulators){
        if(!manipulator||manipulator.locked)continue;const kind=String(manipulator.kind),axis=String(manipulator.axis||'x'),g=manipulator.geometry||{},presentation=manipulator.presentation||{},color=presentation.color||'#2563eb';
        if(kind==='range'){
          let start=Number(g.start),end=Number(g.end);if(!Number.isFinite(start)||!Number.isFinite(end))continue;if(start>end)[start,end]=[end,start];
          const initialGeometry={start,end},constraints=manipulator.constraints||{},layer=svg.append('g').attr('class','dkds-direct-manipulation dkds-direct-range').attr('data-manipulator-id',String(manipulator.id)).attr('clip-path',`url(#${clipId})`),band=presentation.band===false?null:layer.append('rect').attr('class',`dkds-direct-range-band ${axis==='x'?'dkds-scientific-width-band':''}`).attr('fill',color),handleNodes={};let moved=false,lastCurve=null,lastIndex=-1,lastPoint=null;
          const redraw=()=>{
            if(axis==='y'){
              const py0=y(this.yDisplayValue(start)),py1=y(this.yDisplayValue(end));band?.attr('x',margin.left).attr('width',innerW).attr('y',Math.min(py0,py1)).attr('height',Math.max(2,Math.abs(py1-py0)));
              for(const handle of ['start','end'])handleNodes[handle]?.attr('cx',String(presentation.handlePosition||'').toLowerCase()==='right'?margin.left+innerW-10:margin.left+10).attr('cy',y(this.yDisplayValue(handle==='start'?start:end)));
            }else{
              const px0=x(start),px1=x(end);band?.attr('x',Math.min(px0,px1)).attr('width',Math.max(2,Math.abs(px1-px0))).attr('y',margin.top).attr('height',innerH);
              const handleY=String(presentation.handlePosition||'').toLowerCase()==='bottom'?margin.top+innerH-10:(Number.isFinite(Number(presentation.handlePosition))?y(this.yDisplayValue(Number(presentation.handlePosition))):margin.top+10);
              for(const handle of ['start','end'])handleNodes[handle]?.attr('cx',x(handle==='start'?start:end)).attr('cy',handleY);
            }
          };
          const installRangeDrag=(handleNode,handle)=>handleNode.on('click',event=>event.stopPropagation()).on('dblclick',event=>{event.preventDefault();event.stopPropagation();resetManipulator(manipulator,event,handle);}).call(d3.drag().clickDistance(5).filter(event=>event.button===0&&this.canManipulate(manipulator,event)).on('start',event=>{moved=false;lastCurve=null;lastIndex=-1;lastPoint=null;emitManipulation('start',{manipulator,handle,geometry:{start,end},initialGeometry:{...initialGeometry},event,surface:this});}).on('drag',event=>{
            let value,curve=null,index=-1,point=null;if(axis==='x'){const snapped=snapToCurve(manipulator,event);value=Number(snapped.xValue);curve=snapped.curve;index=snapped.index;point=snapped.point;}else{value=Number(y.invert(event.y));if(this.displayYAxisType==='log'){const seed=handle==='start'?initialGeometry.start:initialGeometry.end;value=(Number(seed)<0?-1:1)*value;}}if(!Number.isFinite(value))return;
            const min=Number(constraints.min),max=Number(constraints.max),minSpan=Math.max(0,Number(constraints.minSpan)||0),contains=Number(constraints.contains),containsGap=Math.max(0,Number(constraints.containsGap)||0);if(Number.isFinite(min))value=Math.max(min,value);if(Number.isFinite(max))value=Math.min(max,value);
            if(handle==='start'){value=Math.min(value,end-minSpan);if(Number.isFinite(contains))value=Math.min(value,contains-containsGap);start=value;}else{value=Math.max(value,start+minSpan);if(Number.isFinite(contains))value=Math.max(value,contains+containsGap);end=value;}
            if(!(Number.isFinite(start)&&Number.isFinite(end)&&end>=start))return;moved=true;lastCurve=curve;lastIndex=index;lastPoint=point;redraw();emitManipulation('preview',{manipulator,handle,geometry:{start,end},initialGeometry:{...initialGeometry},curve,index,point,event,surface:this});
          }).on('end',event=>{if(!moved)return;emitManipulation('commit',{manipulator,handle,geometry:{start,end},initialGeometry:{...initialGeometry},curve:lastCurve,index:lastIndex,point:lastPoint,event,surface:this});this.requestRender('manipulation-end');}));
          for(const handle of ['start','end']){const h=layer.append('circle').attr('class',`dkds-direct-handle dkds-direct-range-handle ${axis==='x'?'dkds-scientific-width-handle':''}`).attr('data-handle',handle).attr('r',6).attr('fill','#fff').attr('stroke',color).attr('stroke-width',2).style('cursor',axis==='y'?'ns-resize':'ew-resize');handleNodes[handle]=h;installRangeDrag(h,handle);}redraw();
        }else if(kind==='axis'){
          let value=Number(g.value);if(!Number.isFinite(value))continue;const initialGeometry={value},layer=svg.append('g').attr('class','dkds-direct-manipulation dkds-direct-axis').attr('data-manipulator-id',String(manipulator.id)).attr('clip-path',`url(#${clipId})`),lineNode=layer.append('line').attr('class','dkds-direct-axis-line').attr('stroke',color),handleNode=layer.append('circle').attr('class','dkds-direct-handle dkds-direct-axis-handle').attr('r',6).attr('fill','#fff').attr('stroke',color).attr('stroke-width',2);const redraw=()=>{if(axis==='y'){lineNode.attr('x1',margin.left).attr('x2',margin.left+innerW).attr('y1',y(this.yDisplayValue(value))).attr('y2',y(this.yDisplayValue(value)));handleNode.attr('cx',margin.left+10).attr('cy',y(this.yDisplayValue(value))).style('cursor','ns-resize');}else{lineNode.attr('x1',x(value)).attr('x2',x(value)).attr('y1',margin.top).attr('y2',margin.top+innerH);handleNode.attr('cx',x(value)).attr('cy',margin.top+10).style('cursor','ew-resize');}};let moved=false;handleNode.on('click',event=>event.stopPropagation()).on('dblclick',event=>{event.preventDefault();event.stopPropagation();resetManipulator(manipulator,event,'value');}).call(d3.drag().clickDistance(5).filter(event=>event.button===0&&this.canManipulate(manipulator,event)).on('start',event=>{moved=false;emitManipulation('start',{manipulator,handle:'value',geometry:{value},initialGeometry:{...initialGeometry},event,surface:this});}).on('drag',event=>{let curve=null,index=-1,point=null,next;if(axis==='x'){const snapped=snapToCurve(manipulator,event);next=Number(snapped.xValue);curve=snapped.curve;index=snapped.index;point=snapped.point;}else{next=Number(y.invert(event.y));if(this.displayYAxisType==='log')next=(Number(initialGeometry.value)<0?-1:1)*next;}if(!Number.isFinite(next))return;moved=true;const min=Number(manipulator.constraints?.min),max=Number(manipulator.constraints?.max);if(Number.isFinite(min))next=Math.max(min,next);if(Number.isFinite(max))next=Math.min(max,next);value=next;redraw();emitManipulation('preview',{manipulator,handle:'value',geometry:{value},initialGeometry:{...initialGeometry},curve,index,point,event,surface:this});}).on('end',event=>{if(!moved)return;emitManipulation('commit',{manipulator,handle:'value',geometry:{value},initialGeometry:{...initialGeometry},event,surface:this});this.requestRender('manipulation-end');}));redraw();
        }else if(kind==='point'&&!manipulator.targetId){
          let px=Number(g.x),py=Number(g.y);if(!Number.isFinite(px)||!Number.isFinite(py))continue;const initialGeometry={x:px,y:py},layer=svg.append('g').attr('class','dkds-direct-manipulation dkds-direct-point').attr('data-manipulator-id',String(manipulator.id)).attr('clip-path',`url(#${clipId})`),handleNode=layer.append('circle').attr('class','dkds-direct-handle dkds-direct-point-handle').attr('r',6).attr('fill','#fff').attr('stroke',color).attr('stroke-width',2).attr('cx',x(px)).attr('cy',y(this.yDisplayValue(py))).style('cursor','grab');let moved=false;handleNode.on('dblclick',event=>{event.preventDefault();event.stopPropagation();resetManipulator(manipulator,event,'point');}).call(d3.drag().clickDistance(5).filter(event=>event.button===0&&this.canManipulate(manipulator,event)).on('start',event=>{moved=false;emitManipulation('start',{manipulator,handle:'point',geometry:{x:px,y:py},initialGeometry:{...initialGeometry},event,surface:this});}).on('drag',event=>{const snapped=snapToCurve(manipulator,event),dragAxis=String(manipulator.axis||'xy');let nx=Number(snapped.xValue),ny=Number(snapped.yValue);if(dragAxis==='x')ny=initialGeometry.y;if(dragAxis==='y')nx=initialGeometry.x;if(!Number.isFinite(nx)||!Number.isFinite(ny))return;moved=true;px=nx;py=ny;handleNode.attr('cx',x(px)).attr('cy',y(this.yDisplayValue(py)));emitManipulation('preview',{manipulator,handle:'point',geometry:{x:px,y:py},initialGeometry:{...initialGeometry},curve:snapped.curve,index:snapped.index,point:snapped.point,event,surface:this});}).on('end',event=>{if(!moved)return;emitManipulation('commit',{manipulator,handle:'point',geometry:{x:px,y:py},initialGeometry:{...initialGeometry},event,surface:this});this.requestRender('manipulation-end');}));
        }
      }
      this.spec.afterRender?.({svg,dataLayer,x,y,curves,markers,width,height,margin,innerW,innerH,clipId,colorScale,surface:this});
      let rangeDrag=null;plotBg.on('pointerdown',event=>{if(event.button!==0)return;this.spec.onRangeStart?.({event,surface:this});const [px,py]=d3.pointer(event,node),sx=Math.max(margin.left,Math.min(margin.left+innerW,px)),sy=Math.max(margin.top,Math.min(margin.top+innerH,py));rangeDrag={pointerId:event.pointerId,sx,sy,ex:sx,ey:sy,moved:false};try{plotBg.node().setPointerCapture(event.pointerId);}catch{}event.preventDefault();}).on('pointermove',event=>{if(!rangeDrag||rangeDrag.pointerId!==event.pointerId)return;const [px,py]=d3.pointer(event,node);rangeDrag.ex=Math.max(margin.left,Math.min(margin.left+innerW,px));rangeDrag.ey=Math.max(margin.top,Math.min(margin.top+innerH,py));rangeDrag.moved=rangeDrag.moved||Math.hypot(rangeDrag.ex-rangeDrag.sx,rangeDrag.ey-rangeDrag.sy)>=5;if(!rangeDrag.moved)return;const preview=this.behavior?.resolve?.({gesture:'box',target:'background',event,payload:{surface:this}}),zoom=preview?.intent==='zoom-box';svg.selectAll('.dkds-scientific-direct-box').remove();svg.append('rect').attr('class',`dkds-scientific-direct-box ${zoom?'is-zoom':'is-range'}`).attr('x',Math.min(rangeDrag.sx,rangeDrag.ex)).attr('y',Math.min(rangeDrag.sy,rangeDrag.ey)).attr('width',Math.abs(rangeDrag.ex-rangeDrag.sx)).attr('height',Math.abs(rangeDrag.ey-rangeDrag.sy));event.preventDefault();});
      const finishRange=event=>{if(!rangeDrag||rangeDrag.pointerId!==event.pointerId)return;const drag=rangeDrag;rangeDrag=null;svg.selectAll('.dkds-scientific-direct-box').remove();try{plotBg.node().releasePointerCapture(event.pointerId);}catch{}
        if(!drag.moved){const near=this.nearestCurveAtPixel(drag.sx,drag.sy,x,y,curves,Number(this.spec.nearestDistance)||18);if(near){this.legendSelectedId=String(near.curve?.id||'');this.renderLegend({...legendMetrics,entries:this.legendEntries(allCurves)},allCurves);const payload={curve:near.curve,x:near.point.x,index:near.index,point:near.point?.raw||near.point,event,surface:this,source:'background'};const decision=this.routeInteraction('click','curve',event,payload,{targetId:near.curve?.id});if(decision.handled)return;if(decision.intent==='select'){payload.additive=decision.binding?.selectionMode==='additive';if(this.spec.onCurveSelect)this.spec.onCurveSelect(payload);else this.selectEntity(near.curve?.entityId||near.curve?.id,{source:this.spec.source||'scientific-curve-background',additive:payload.additive,value:near.curve?.source||near.curve});}else if(decision.intent==='command'&&this.spec.onCurveModifiedClick)this.spec.onCurveModifiedClick(payload);}else{const payload={event,surface:this,source:'background'};const decision=this.routeInteraction('click','background',event,payload);if(decision.handled)return;if(decision.intent==='clear-selection'){this.legendSelectedId='';this.renderLegend({...legendMetrics,entries:this.legendEntries(allCurves)},allCurves);if(this.spec.onClearSelection)this.spec.onClearSelection(payload);else this.interaction?.clear?.({source:this.spec.source||'scientific-curve-background'});}}return;}
        const sx0=Math.min(drag.sx,drag.ex),sx1=Math.max(drag.sx,drag.ex),sy0=Math.min(drag.sy,drag.ey),sy1=Math.max(drag.sy,drag.ey);if(Math.abs(sx1-sx0)<6||Math.abs(sy1-sy0)<6)return;const selection={xMin:Math.min(x.invert(sx0),x.invert(sx1)),xMax:Math.max(x.invert(sx0),x.invert(sx1)),yMin:Math.min(y.invert(sy0),y.invert(sy1)),yMax:Math.max(y.invert(sy0),y.invert(sy1)),curveId:selectedCurveId,event,surface:this,target:String(this.spec.rangeSelectionTarget||'samples'),targetType:String(this.spec.rangeSelectionType||'')};selection.markers=markers.filter(marker=>{const my=this.yDisplayValue(marker?.y);return this.finite(marker?.x)&&Number.isFinite(my)&&Number(marker.x)>=selection.xMin&&Number(marker.x)<=selection.xMax&&my>=selection.yMin&&my<=selection.yMax;});selection.markerIds=selection.markers.map(marker=>String(marker?.entityId||marker?.id||'')).filter(Boolean);const decision=this.routeInteraction('box','background',event,selection);if(decision.handled)return;if(decision.intent==='zoom-box'){const next={xDomain:[selection.xMin,selection.xMax],yDomain:[selection.yMin,selection.yMax]};this.setView(next,{reason:'box-zoom',event});this.requestRender('box-zoom');return;}if(decision.intent==='select-region')this.spec.onRangeSelect?.(selection);
      };plotBg.on('pointerup',finishRange).on('pointercancel',()=>{rangeDrag=null;svg.selectAll('.dkds-scientific-direct-box').remove();});
      plotBg.on('dblclick',event=>{event.preventDefault();const decision=this.routeInteraction('double-click','background',event,{event,surface:this});if(decision.handled)return;if(decision.intent==='reset-view')this.resetView({event});});
      svg.on('wheel.dkdssci',event=>{const [px,py]=d3.pointer(event,node);if(px<margin.left||px>margin.left+innerW||py<margin.top||py>margin.top+innerH)return;const payload={event,surface:this,x:x.invert(px),y:y.invert(py)};const decision=this.routeInteraction('wheel','plot',event,payload);if(decision.handled)return;if(decision.intent!=='zoom-wheel')return;event.preventDefault();event.stopPropagation();this.spec.onWheelZoomStart?.({event,surface:this});const dy=Math.max(-220,Math.min(220,Number(event.deltaY)||0)),factor=Math.max(.72,Math.min(1.38,Math.exp(dy*.00145))),cx=x.invert(px),cy=y.invert(py),minX=Math.max(1e-12,Math.abs(fullX[1]-fullX[0])*1e-6),minY=Math.max(1e-30,Math.abs(fullY[1]-fullY[0])*1e-6),next={xDomain:this.scaleDomainAround(xDomain,cx,factor,minX),yDomain:this.scaleDomainAround(yDomain,cy,factor,minY)};this.setView(next,{reason:'wheel',event});this.requestRender('wheel');});
      const selectedRange=this.spec.getRangeSelection?.();if(selectedRange&&this.finite(selectedRange.xMin??selectedRange.min)&&this.finite(selectedRange.xMax??selectedRange.max)){
        const xv0=Number(selectedRange.xMin??selectedRange.min),xv1=Number(selectedRange.xMax??selectedRange.max),rx0=x(xv0),rx1=x(xv1),hasY=this.finite(selectedRange.yMin)&&this.finite(selectedRange.yMax),yv0=hasY?Number(selectedRange.yMin):null,yv1=hasY?Number(selectedRange.yMax):null,ry0=hasY?y(this.yDisplayValue(yv0)):margin.top+innerH,ry1=hasY?y(this.yDisplayValue(yv1)):margin.top;
        if(Number.isFinite(rx0)&&Number.isFinite(rx1)&&Number.isFinite(ry0)&&Number.isFinite(ry1)){
          const xLo=Math.min(xv0,xv1),xHi=Math.max(xv0,xv1),yLo=hasY?Math.min(yv0,yv1):-Infinity,yHi=hasY?Math.max(yv0,yv1):Infinity;
          svg.append('rect').attr('class','dkds-scientific-persisted-range').attr('x',Math.min(rx0,rx1)).attr('y',Math.min(ry0,ry1)).attr('width',Math.abs(rx1-rx0)).attr('height',Math.abs(ry1-ry0));
          const rangeTarget=String(this.spec.rangeSelectionTarget||'samples');
          if(rangeTarget==='markers'){
            const rangeMarkers=markers.filter(marker=>this.finite(marker?.x)&&this.finite(marker?.y)&&Number(marker.x)>=xLo&&Number(marker.x)<=xHi&&Number(marker.y)>=yLo&&Number(marker.y)<=yHi);
            const selectedLayer=dataLayer.append('g').attr('class','dkds-scientific-range-markers');
            selectedLayer.selectAll('circle').data(rangeMarkers,marker=>String(marker?.id||marker?.entityId||'')).join('circle').attr('cx',marker=>x(Number(marker.x))).attr('cy',marker=>y(this.yDisplayValue(marker.y))).attr('r',8.5).attr('fill','rgba(255,255,255,.18)').attr('stroke',marker=>marker?.color||'#315efb').attr('stroke-width',2.2).style('pointer-events','none');
          }else{
            const selectedLayer=dataLayer.append('g').attr('class','dkds-scientific-range-points');
            for(const curve of curves){const points=(normalized.get(String(curve.id))||[]).filter(point=>{const py=this.yDisplayValue(point.y);return point.x>=xLo&&point.x<=xHi&&py>=yLo&&py<=yHi;});if(!points.length)continue;const color=curve.color||colorScale(this.finite(curve.colorValue)?Number(curve.colorValue):0),path=points.map(point=>`M${x(point.x).toFixed(2)},${y(this.yDisplayValue(point.y)).toFixed(2)}h0`).join('');selectedLayer.append('path').attr('d',path).attr('fill','none').attr('stroke',color).attr('stroke-width',4.2).attr('stroke-linecap','round').attr('opacity',.96).style('pointer-events','none');}
          }
        }
      }
      this.lastRender={reason,width,height,x,y,colorScale,curves,markers,margin,innerW,innerH,clipId,dataLayer,markerNodes,yScaleType:this.displayYAxisType};requestAnimationFrame(()=>{this.clampNavigationTools();this.scheduleNavigationCollisionCheck();});return true;
    }
    dispose(){if(this.disposed)return;this.disposed=true;this.selectionOff?.();this.selectionOff=null;this.resizeObserver?.disconnect?.();this.navObstacleObserver?.disconnect?.();this.navObstacleObserver=null;if(this.navCollisionFrame){cancelAnimationFrame(this.navCollisionFrame);this.navCollisionFrame=0;}try{this.d3()?.select(this.target)?.on('.dkdssci',null);}catch{}this.target.classList.remove('dkds-scientific-curve-surface');if(this.ownsTarget)this.target.remove?.();this.navTools?.remove?.();this.navTools=null;this.legendController?.dispose?.();this.legendController=null;this.legendHost=null;this.legendGroupOff?.();this.legendGroupOff=null;this.legendGroup=null;if(this.layoutFallbackOwned){this.container?.classList?.remove('dkds-scientific-layout-fallback');this.container?.style?.removeProperty?.('--dkds-scientific-preferred-min-height');this.layoutFallbackOwned=false;}this.container?.removeAttribute?.('data-dkds-scientific-layout');this.container?.classList?.remove('dkds-scientific-surface-host');}
  }
