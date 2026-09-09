(() => {
  // Owns the Resonance primary ScientificCurveSurface adapter: legend, range
  // selection menu, marker/manipulator projection and direct-edit mapping.
  // Scientific gesture geometry remains Core-owned; this module only maps the
  // semantic commits back into Resonance state.
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,dom,setStatus}=services;
    const {esc,fmt,finite,directionName}=utils;
    let mainSurface=null,nativeTooltipDismissDispose=null;
    const sweepVoltageBoundsCache=new WeakMap();
    const selectionPaint=(selection,attribute,value)=>{selection?.each?.(function(d,i,nodes){const next=typeof value==='function'?value.call(this,d,i,nodes):value;dom.attr(this,attribute,next===undefined||next===null||next===''?null:next);});return selection;};

    function peakColor(p){return p?.customColor||actions.colorForPeakOrder(p?.peakOrder||1,p?.direction||1);}
    function movePeakToIndex(p,sw,index){
      const points=sw?.points||[];if(!p||!points.length)return;
      const idx=Math.max(0,Math.min(points.length-1,Number(index)||0)),pt=points[idx],oldV=Number(p.v);
      p.index=Number.isFinite(Number(pt.index))?Number(pt.index):idx;p.v=Number(pt.v);p.i=Number(pt.i);p.manual=true;
      const delta=Number(p.v)-oldV;if(Number.isFinite(delta)){if(Number.isFinite(Number(p.widthLeft)))p.widthLeft=Number(p.widthLeft)+delta;if(Number.isFinite(Number(p.widthRight)))p.widthRight=Number(p.widthRight)+delta;if(Number.isFinite(Number(p.analysisLeft)))p.analysisLeft=Number(p.analysisLeft)+delta;if(Number.isFinite(Number(p.analysisRight)))p.analysisRight=Number(p.analysisRight)+delta;}
    }
    function clearRangeMenu({keepSelection=false}={}){
      $('#resparRangeMenu')?.classList.add('hidden');
      if(!keepSelection)actions.clearRangeState();
    }
    function showRangeMenu(range,event){
      const selectedRange=actions.setRangeState({...range,target:'markers',targetType:'resonance.peak'});actions.publishRangeSelection(selectedRange,'resonance-main-range');
      const menu=$('#resparRangeMenu'),wrap=$('#resparMainPlotWrap');if(!menu||!wrap)return;
      const count=actions.peaksInRange(selectedRange).length,targets=range.sweepId?1:actions.visibleSweeps().length;
      const summary=$('#resparRangeSummary');if(summary)summary.textContent=`Vd ${fmt(range.vMin,4)} ~ ${fmt(range.vMax,4)} V · 框内 ${count} 个峰 · 局部寻峰作用于${range.sweepId?'当前曲线':`${targets} 条可见曲线`}`;
      const orderSelect=$('#resparRangeOrder'),labelInput=$('#resparRangeLabel');actions.normalizeCategories();
      if(orderSelect){const rows=live.workspace.peakCategories||[];dom.html(orderSelect,rows.map(c=>`<option value="${Number(c.order)}">${esc(c.label||`峰${c.order}`)}</option>`).join(''));const selected=actions.peaksInRange(range)[0];if(selected&&rows.some(c=>Number(c.order)===Number(selected.peakOrder)))orderSelect.value=String(selected.peakOrder);}
      if(labelInput){const selected=actions.peaksInRange(range)[0];labelInput.value=selected?actions.peakLabel(selected):'';}
      menu.classList.remove('hidden');
      dom.frame(()=>{const wr=wrap.getBoundingClientRect(),mr=menu.getBoundingClientRect();const cx=Number(event?.clientX)||wr.left+wr.width/2,cy=Number(event?.clientY)||wr.top+90;dom.style(menu,{left:`${Math.max(8,Math.min(wr.width-mr.width-8,cx-wr.left+8))}px`,top:`${Math.max(42,Math.min(wr.height-mr.height-8,cy-wr.top+8))}px`});});
    }
    function compactLegendNumber(value,maxDigits=6){
      const n=Number(value);if(!Number.isFinite(n))return '?';const normalized=Object.is(n,-0)?0:n;
      return new Intl.NumberFormat('zh-CN',{useGrouping:false,maximumSignificantDigits:Math.max(1,Math.min(12,Number(maxDigits)||6))}).format(normalized);
    }
    function renderLegend(curveColor){
      const host=$('#resparMainLegend');if(!host)return;dom.html(host,'');const current=actions.selectedSweep();
      for(const ds of live.datasets){
        const visible=actions.visibilityMap().get(String(ds.path))||{forward:true,reverse:true};if(!visible.forward&&!visible.reverse)continue;
        const candidates=live.sweeps.filter(sw=>sw.datasetPath===ds.path&&actions.isVisible(sw)),preferred=current?.datasetPath===ds.path?current:(candidates.find(sw=>sw.direction>0)||candidates[0]);
        const chip=dom.create('button');chip.type='button';chip.className='respar-legend-chip dkds-legend-item';chip.dataset.datasetPath=String(ds.path||'');chip.dataset.entityId=actions.datasetEntityId(ds.path);chip.dataset.selectionKey=actions.datasetEntityId(ds.path);chip.dataset.sweepId=String(preferred?.id||'');
        const c=typeof curveColor==='function'?curveColor(Number.isFinite(Number(ds.vg))?Number(ds.vg):0):actions.colorForSeries(`resonance.dataset.${ds.path}`,ds.name||ds.path,'resonance.dataset'),dash=preferred?.direction<0?' reverse':'';
        dom.html(chip,`<i class="respar-legend-line dkds-series-swatch-line${dash}"></i><span>${compactLegendNumber(ds.vg)} V</span>`);dom.token(dom.query('.respar-legend-line',chip),{'--dkds-series-color':c});chip.dataset.dkdsTooltip=`${ds.name||ds.path}${preferred?` · ${directionName(preferred.direction)}`:''}`;dom.append(host,chip);
      }
    }
    function peakMarkerShape(p){return ({raw:'circle',snr:'diamond',diff:'triangle',detrend:'square',curvature:'cross',matched:'circle',manual:'star'})[p?.primaryAlgorithm]||'circle';}
    function sweepVoltageBounds(sw){
      if(!sw)return null;const cached=sweepVoltageBoundsCache.get(sw);if(cached)return cached;let lo=Infinity,hi=-Infinity;
      for(const q of (sw.points||[])){const v=Number(q?.v);if(!Number.isFinite(v))continue;if(v<lo)lo=v;if(v>hi)hi=v;}
      const row=Number.isFinite(lo)&&Number.isFinite(hi)?{lo,hi}:null;if(row)sweepVoltageBoundsCache.set(sw,row);return row;
    }
    function markers(){
      const display=live.workspace.peakDisplay||{},visibleIds=new Set(actions.visibleSweepIds());if(display.showPoints===false)return [];
      return (live.workspace.peaks||[]).filter(p=>visibleIds.has(p.sweepId)&&(p.accepted!==false||display.showRejected===true)).map(p=>({id:String(p.id),entityId:String(p.id),curveId:String(p.sweepId),x:Number(p.v),y:Number(p.i),color:peakColor(p),locked:!!p.locked,accepted:p.accepted!==false,shape:peakMarkerShape(p),source:p}));
    }
    function markerWidthSpec(marker){
      const p=marker?.source,sw=p?actions.sweepById(p.sweepId):null;if(!p||!sw)return null;const m=actions.peakMetrics(p)||{};
      const sign=Math.sign(Number(p.i)||1)||1,baselineAt=xv=>Math.max(0,(Number(m.baselineSlope)||0)*Number(xv)+(Number.isFinite(Number(m.baselineIntercept))?Number(m.baselineIntercept):Number(m.baseline)||0));
      const left=Number(m.fwhmLeft),right=Number(m.fwhmRight),halfResidual=Number(m.halfResidual);
      const metricWindowLeft=Number(m.analysisLeft),metricWindowRight=Number(m.analysisRight),rawWindowLeft=Number(p.analysisLeft),rawWindowRight=Number(p.analysisRight);
      const windowLeft=Number.isFinite(metricWindowLeft)?metricWindowLeft:rawWindowLeft,windowRight=Number.isFinite(metricWindowRight)?metricWindowRight:rawWindowRight;if(!Number.isFinite(windowLeft)||!Number.isFinite(windowRight)||windowRight<=windowLeft)return null;
      return {left,right,yLeft:Number.isFinite(left)&&Number.isFinite(halfResidual)?sign*(baselineAt(left)+halfResidual):NaN,yRight:Number.isFinite(right)&&Number.isFinite(halfResidual)?sign*(baselineAt(right)+halfResidual):NaN,windowLeft,windowRight,baseline:{x1:windowLeft,y1:sign*baselineAt(windowLeft),x2:windowRight,y2:sign*baselineAt(windowRight)},handlePosition:'top'};
    }
    function manipulators(){
      const rows=[];for(const marker of markers()){if(marker.locked)continue;rows.push({id:`peak-position:${marker.id}`,kind:'point',targetId:String(marker.id),geometry:{x:Number(marker.x),y:Number(marker.y)},snap:{kind:'curve',curveId:String(marker.curveId)},source:{action:'peak-position',peak:marker.source}});}
      const p=actions.selectedPeak();if(p&&live.workspace.peakDisplay?.showWidth!==false&&!p.locked){const marker={id:String(p.id),curveId:String(p.sweepId),x:Number(p.v),y:Number(p.i),color:peakColor(p),source:p},width=markerWidthSpec(marker),sw=actions.sweepById(p.sweepId);if(width&&sw){const minGap=Math.max(Math.abs(Number(sw.step)||0.01)*3,1e-12);rows.push({id:`analysis-window:${p.id}`,kind:'range',axis:'x',geometry:{start:Number(width.windowLeft),end:Number(width.windowRight)},snap:{kind:'curve',curveId:String(p.sweepId)},constraints:{contains:Number(p.v),containsGap:minGap,minSpan:minGap*2},presentation:{color:peakColor(p),band:true,handlePosition:'top'},source:{action:'analysis-window',peak:p}});}}
      return rows;
    }
    function ensure(){
      const node=$('#reswinMainPlot');if(!node)return null;if(mainSurface&&mainSurface.target===node)return mainSurface;dispose();const factory=live.uiRuntime?.scientificPlot;if(!factory?.create)return null;
      if(!node.hasAttribute('tabindex'))node.tabIndex=-1;const claimKeyboardFocus=()=>{try{node.focus({preventScroll:true});}catch{try{node.focus();}catch{}}};
      if(live.isNativeClient?.()===true&&!nativeTooltipDismissDispose){
        nativeTooltipDismissDispose=dom.on(node,'pointerdown',event=>{
          if(event.target?.closest?.('.dkds-scientific-marker-hit,.dkds-scientific-nav-tools,.respar-range-menu'))return;
          $('#resparHoverTip')?.classList.add('hidden');
        },true);
      }
      mainSurface=factory.create(node,{
        container:'#resparMainPlotWrap',minWidth:260,minHeight:180,legend:false,margin:{top:62,right:30,bottom:50,left:78},xTitle:'Vd (V)',yTitle:'I (A)',xValue:p=>p?.v,yValue:p=>p?.i,
        yTickFormat:v=>{const a=Math.abs(v);return a>=1e-6?`${(v*1e6).toFixed(1)}μA`:a>=1e-9?`${(v*1e9).toFixed(1)}nA`:`${(v*1e12).toFixed(0)}pA`;},
        interaction:live.interactionRuntime||null,source:'resonance-main',rangeSelectionTarget:'markers',rangeSelectionType:'resonance.peak',
        interactionBehavior:{bindings:[
          {id:'resonance-add-point',gesture:'click',target:'curve',modifiers:['shift'],command:'builtin.resonance.add-point',priority:120},
          {id:'resonance-delete-point-fast',gesture:'context',target:'marker',button:'secondary',modifiers:['shift'],command:'builtin.resonance.delete-target-peak',priority:140},
          {id:'resonance-marker-context',gesture:'context',target:'marker',button:'secondary',priority:80,contextActions:ctx=>[
            {id:'toggle-lock',label:()=>ctx.marker?.locked?'解锁峰位':'锁定峰位',command:'builtin.resonance.toggle-target-lock'},
            {id:'delete',label:'删除峰位',enabled:()=>!ctx.marker?.locked,command:'builtin.resonance.delete-target-peak'}
          ]}
        ]},
        getCurves:()=>actions.visibleSweeps().map(sw=>({id:String(sw.id),entityId:String(sw.id),points:sw.points||[],colorValue:finite(sw.vg)?Number(sw.vg):0,direction:Number(sw.direction),source:sw})),
        getSelectedCurveIds:()=>{
          const focus=live.interactionSelection?.get?.()?.focus||null;
          if(focus?.type==='resonance.dataset'){const path=String(focus.value?.path||focus.ref?.datasetPath||'');return actions.visibleSweeps().filter(sw=>String(sw.datasetPath)===path).map(sw=>String(sw.id));}
          return live.selectedSweepId?[String(live.selectedSweepId)]:[];
        },getSelectedCurveId:()=>String(live.selectedSweepId||''),getSelectedMarkerIds:()=>live.selectedPeakId?[String(live.selectedPeakId)]:[],
        getColorDomainValues:()=>live.datasets.map(ds=>finite(ds?.vg)?Number(ds.vg):null).filter(Number.isFinite),getMarkers:()=>markers(),getManipulators:()=>manipulators(),
        getView:()=>live.workspace.mainView||{xDomain:null,yDomain:null},setView:(next,meta)=>{live.workspace.mainView={xDomain:Array.isArray(next?.xDomain)?next.xDomain.slice():null,yDomain:Array.isArray(next?.yDomain)?next.yDomain.slice():null};if(meta?.reason==='box-zoom'){actions.scheduleSnapshot();setStatus('Ctrl+框选缩放完成；滚轮可继续围绕鼠标缩放，双击或 R 恢复。');}},
        getRangeSelection:()=>{const range=live.selectedRange;return range?{xMin:range.min,xMax:range.max,yMin:range.iMin,yMax:range.iMax}:null},showMarkers:()=>live.workspace.peakDisplay?.showPoints!==false,showWidth:()=>live.workspace.peakDisplay?.showWidth!==false,getMarkerWidth:marker=>markerWidthSpec(marker),onColorScale:scale=>renderLegend(scale),
        onCurveSelect:({curve})=>{clearRangeMenu();claimKeyboardFocus();const sw=curve?.source;if(sw)actions.publishSweepSelection(sw,'resonance-main');},
        onCurveDoubleClick:({curve})=>{const sw=curve?.source;if(sw){actions.publishSweepSelection(sw,'resonance-main');live.workspaceNavigator?.('inspect');}},
        onMarkerSelect:({marker,additive})=>{const p=marker?.source;if(p){clearRangeMenu();claimKeyboardFocus();actions.publishPeakSelection(p,'resonance-main',{openInspector:true,additive});}},
        onMarkerDoubleClick:({marker})=>{const p=marker?.source;if(p){claimKeyboardFocus();actions.publishPeakSelection(p,'resonance-main',{openInspector:true});}},
        onMarkerHover:({marker,event,phase})=>{const tip=$('#resparHoverTip');if(!tip)return;if(phase==='leave'){tip.classList.add('hidden');return;}const p=marker?.source;if(!p)return;if(phase==='enter'){dom.html(tip,`<b>${esc(directionName(p.direction))} · ${esc(actions.peakLabel(p))}</b><br>Vg=${fmt(p.vg,4)} V · Vd=${fmt(p.v,6)} V<br>I=${fmt(p.i,6)} A${p.locked?' · 已锁定':''}`);tip.classList.remove('hidden');}const wrap=$('#resparMainPlotWrap'),wr=wrap?.getBoundingClientRect?.();if(wr){dom.style(tip,{left:`${event.clientX-wr.left+12}px`,top:`${event.clientY-wr.top+12}px`}); }},
        onManipulationCommit:({manipulator,geometry,curve,index})=>{const action=manipulator?.source?.action,p=manipulator?.source?.peak;if(action==='peak-position'){const sw=curve?.source||actions.sweepById(p?.sweepId);if(!p||!sw)return;movePeakToIndex(p,sw,index);actions.commitPeakMetricEdit(p,{geometry:true,reason:'peak-position-edit'});actions.scheduleSnapshot({label:'移动峰位'});setStatus(`已移动 ${directionName(p.direction)} · ${actions.peakLabel(p)} 至 Vd=${fmt(p.v,6)} V。`);return;}if(action==='analysis-window'){const sw=p?actions.sweepById(p.sweepId):null,bounds=sweepVoltageBounds(sw);if(!p||!sw||!bounds)return;const minGap=Math.max(Math.abs(Number(sw.step)||0.01)*3,1e-12),center=Number(p.v);let left=Math.max(bounds.lo,Math.min(Number(geometry?.start),center-minGap)),right=Math.min(bounds.hi,Math.max(Number(geometry?.end),center+minGap));if(!(Number.isFinite(left)&&Number.isFinite(right)&&left<center&&right>center))return;p.analysisLeft=left;p.analysisRight=right;p.analysisManual=true;actions.commitPeakMetricEdit(p,{reason:'analysis-window-edit'});actions.scheduleSnapshot();}},
        onManipulationReset:({manipulator})=>{if(manipulator?.source?.action!=='analysis-window')return;const p=manipulator?.source?.peak;if(!p)return;delete p.analysisLeft;delete p.analysisRight;delete p.analysisManual;actions.commitPeakMetricEdit(p,{reason:'analysis-window-reset'});actions.scheduleSnapshot();setStatus('已恢复自动 FWHM 分析窗口。');},
        onRangeStart:()=>clearRangeMenu(),onWheelZoomStart:()=>clearRangeMenu({keepSelection:true}),
        onRangeSelect:({xMin,xMax,yMin,yMax,event,markers:rows,markerIds,target,targetType})=>showRangeMenu({vMin:xMin,vMax:xMax,iMin:yMin,iMax:yMax,min:xMin,max:xMax,sweepId:'',markers:rows||[],markerIds:markerIds||[],target:target||'markers',targetType:targetType||'resonance.peak'},event),
        onClearSelection:()=>{actions.clearSelectionIds({keepRange:true});live.interactionSelection?.clear?.({source:'resonance-main'});render();},
        onReset:()=>{live.workspace.mainView={xDomain:null,yDomain:null};clearRangeMenu();actions.scheduleSnapshot();setStatus('主图已恢复全部当前可见数据。');},
        onEmpty:({svg,width,height})=>{dom.html($('#resparMainLegend'),'');svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('class','dkds-svg-empty-text').text('请勾选要显示的正扫/反扫数据');},
        afterRender:({dataLayer,x,y,markers:rows})=>{if(live.workspace.physicsShowLabels===false||live.workspace.peakDisplay?.showPoints===false)return;try{const ph=actions.physicalAnalysis(),focus=live.interactionSelection?.get?.()?.focus||null,datasetPath=focus?.type==='resonance.dataset'?String(focus.value?.path||focus.ref?.datasetPath||''):'',hasSelection=!!live.selectedSweepId||!!datasetPath;dataLayer.append('g').selectAll('text.respar-physics-label').data(rows.filter(m=>m.accepted!==false),m=>m.id).join('text').attr('class','respar-physics-label').attr('x',m=>x(Number(m.x))+8).attr('y',m=>y(Number(m.y))-8).call(selectionPaint,'opacity',m=>{if(!hasSelection)return .92;if(datasetPath){const sw=actions.sweepById(m.curveId);return String(sw?.datasetPath||'')===datasetPath?1:.28;}return String(m.curveId)===String(live.selectedSweepId||'')?1:.28;}).call(selectionPaint,'fill',m=>actions.colorForPhysicsCode(ph?.peakMap?.get?.(m.id)?.code||'Q')).text(m=>{const code=ph?.peakMap?.get?.(m.id)?.code||'Q';return code==='Q'?'?':code;});}catch{}}
      });
      return mainSurface;
    }
    function render(){const surface=ensure();if(surface){surface.render('resonance');const legendScale=surface.colorScaleState?.scale;if(typeof legendScale==='function')renderLegend(legendScale);else renderLegend(null);return;}const node=$('#reswinMainPlot'),wrap=$('#resparMainPlotWrap');if(!node||!wrap)return;const rect=wrap.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height);dom.replace(node);node.setAttribute('width',String(Math.max(0,width)));node.setAttribute('height',String(Math.max(0,height)));const text=dom.createNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',String(Math.max(0,width)/2));text.setAttribute('y',String(Math.max(0,height)/2));text.setAttribute('text-anchor','middle');text.setAttribute('class','dkds-svg-error-text');text.textContent='ScientificCurveSurface 基座未就绪';dom.append(node,text);}
    function reset(){live.workspace.mainView={xDomain:null,yDomain:null};clearRangeMenu();const surface=ensure();if(surface)surface.resetView();else{render();actions.scheduleSnapshot();setStatus('主图已恢复全部当前可见数据。');}return true;}
    function dispose(){mainSurface?.dispose?.();mainSurface=null;nativeTooltipDismissDispose?.();nativeTooltipDismissDispose=null;}
    return Object.freeze({ensure,render,reset,dispose,peakColor,clearRangeMenu,state:()=>({mounted:!!mainSurface})});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-main-plot-runtime',Object.freeze({create}));
})();
