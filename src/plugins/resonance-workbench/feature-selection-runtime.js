(() => {
  // Owns Resonance selection/range state and the edit commands whose semantics
  // are defined by that state. Mutable selection must not leak back into the
  // feature coordinator or become a snapshot in FeatureContext.
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,setStatus,dom}=services;
    const {peakLabel}=actions;
    let selectedSweepId='';
    let selectedPeakId='';
    let selectedPeakIds=new Set();
    let selectedRange=null;
    let interactionRuntime=null;
    let interactionSelection=null;
    let interactionSelectionOff=null;
    let applyingExternalSelection=false;

    const selectedSweep=()=>actions.sweepById(selectedSweepId);
    const selectedPeak=()=>actions.peakById(selectedPeakId);
    function selectionDatasetItem(path){const dataset=live.datasets.find(row=>String(row?.path)===String(path)),id=actions.datasetEntityId(path);return path?{type:'resonance.dataset',id,role:'dataset',ref:{entityId:id,datasetPath:String(path)},meta:{label:dataset?.name||String(path),vg:dataset?.vg}}:null;}
    function selectionSweepItem(sw){return sw?{type:'resonance.sweep',id:String(sw.id),role:'sweep',ref:{entityId:String(sw.id),sweepId:String(sw.id),datasetPath:sw.datasetPath||''},meta:{label:sw.datasetName||String(sw.id),vg:sw.vg,direction:sw.direction}}:null;}
    function selectionPeakItem(p){return p?{type:'resonance.peak',id:String(p.id),role:'peak',ref:{entityId:String(p.id),peakId:String(p.id),sweepId:String(p.sweepId||''),datasetPath:p.datasetPath||''},meta:{vg:p.vg,direction:p.direction,peakOrder:p.peakOrder,peakLabel:peakLabel(p)}}:null;}
    function bindLinkedSelectionViews(){
      if(!actions.isUiBound()||!interactionRuntime?.bindView)return false;
      const list=$('#reswinDatasetList'),legend=$('#resparMainLegend');
      if(list)interactionRuntime.bindView('resonance-dataset-list',list,{selector:'.respar-dataset-item',itemVariant:'row',itemKey:el=>el.dataset.entityId||actions.datasetEntityId(el.dataset.datasetPath),entityLinked:true,revealFocus:true,ignore:'input,select,label,button,a',onActivate:({element})=>{const path=String(element.dataset.datasetPath||'');if(path)publishDatasetSelection(path,'resonance-dataset');}});
      if(legend)interactionRuntime.bindView('resonance-main-legend',legend,{selector:'.respar-legend-chip',itemVariant:'chip',itemKey:el=>el.dataset.entityId||actions.datasetEntityId(el.dataset.datasetPath),entityLinked:true,revealFocus:true,dimOthers:true,horizontalWheel:true,hideScrollbar:true,onActivate:({element})=>{const sw=actions.sweepById(String(element.dataset.sweepId||''));if(sw)publishSweepSelection(sw,'resonance-main-legend');}});
      return true;
    }
    function renderLinkedSelection({includeGroup=true,controls=false}={}){
      if(controls)actions.renderControls();
      actions.renderSummary();
      // Queue the primary scientific paint before expensive inspector work. A
      // group-point click used to synchronously rebuild controls + inspector,
      // delaying the visible main-plot linkage by seconds on larger projects.
      if($('#reswinMainPlot')?.offsetParent!==null)actions.ensureMainSurface()?.requestRender?.('entity-selection');
      const deferred=()=>{if($('#reswinInspectPlot')?.offsetParent!==null)actions.renderInspection();if(includeGroup)actions.updateGroupContext();};
      dom.frame(deferred);
    }
    function publishSweepSelection(sw,source='resonance-main'){
      if(!sw)return false;selectedSweepId=String(sw.id);selectedPeakId='';selectedPeakIds.clear();
      const candidates=(live.workspace.peaks||[]).filter(p=>p.sweepId===sw.id&&p.accepted!==false),autoPeak=candidates.length===1?candidates[0]:null;
      if(autoPeak){selectedPeakId=String(autoPeak.id);selectedPeakIds=new Set([selectedPeakId]);}
      if(interactionSelection&&!applyingExternalSelection){const item=autoPeak?selectionPeakItem(autoPeak):selectionSweepItem(sw);interactionSelection.select(item,{source,context:{datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,autoPeak:!!autoPeak}});}else renderLinkedSelection({includeGroup:true,controls:true});
      return true;
    }
    function publishDatasetSelection(path,source='resonance-dataset'){
      const key=String(path||'');if(!key)return false;
      const current=selectedSweep(),visible=actions.visibleSweeps(),rows=(visible.length?visible:live.sweeps).filter(sw=>String(sw.datasetPath)===key);
      const preferred=current&&String(current.datasetPath)===key?current:(rows.find(sw=>Number(sw.direction)>0)||rows[0]||null);
      if(preferred)selectedSweepId=String(preferred.id);selectedPeakId='';selectedPeakIds.clear();
      const item=selectionDatasetItem(key);
      if(interactionSelection&&!applyingExternalSelection&&item)interactionSelection.select(item,{source,context:{datasetPath:key}});
      else renderLinkedSelection({includeGroup:true,controls:false});
      return true;
    }
    function publishPeakSelection(p,source='resonance-main',{openInspector=false,additive=false}={}){
      if(!p)return false;selectedPeakId=String(p.id);selectedSweepId=String(p.sweepId||selectedSweepId);if(additive)selectedPeakIds.add(selectedPeakId);else selectedPeakIds=new Set([selectedPeakId]);
      if(interactionSelection&&!applyingExternalSelection)interactionSelection.select(selectionPeakItem(p),{source,additive,context:{sweepId:p.sweepId,datasetPath:p.datasetPath,vg:p.vg,direction:p.direction}});else renderLinkedSelection({includeGroup:true});
      if(openInspector)dom.frame(()=>live.workspaceNavigator?.('inspect'));
      return true;
    }
    function publishRangeSelection(range,source='resonance-main'){
      if(!range)return false;selectedRange={...range};
      if(interactionSelection){const selected=peaksInRange(selectedRange).map(selectionPeakItem).filter(Boolean),sweepId=String(selectedRange.sweepId||selectedSweepId||'');if(!sweepId)return false;const sourceRef={entityId:sweepId,sweepId};if(interactionSelection.selectRegion)interactionSelection.selectRegion(selectedRange,selected,{rangeType:'resonance.range',source,sourceRef,context:{sweepId}});else interactionSelection.setRange(selectedRange,{type:'resonance.range',source,sourceRef});}
      return true;
    }
    function applyInteractionSelection(snapshot,meta={}){
      if(!snapshot||applyingExternalSelection)return;const focus=snapshot.focus||snapshot.items?.at?.(-1)||null;if(!focus)return;
      const previousSweep=selectedSweepId,previousPeak=selectedPeakId;applyingExternalSelection=true;
      try{
        selectedPeakIds=new Set((snapshot.items||[]).filter(item=>item.type==='resonance.peak').map(item=>String(item.id||'')).filter(Boolean));
        if(focus.type==='resonance.peak'){const p=actions.peakById(focus.id);if(p){selectedPeakId=p.id;selectedSweepId=p.sweepId;selectedPeakIds.add(String(p.id));}}
        else if(focus.type==='resonance.sweep'){const sw=actions.sweepById(focus.id);if(sw){selectedSweepId=sw.id;selectedPeakId='';selectedPeakIds.clear();}}
        else if(focus.type==='resonance.dataset'){const path=String(focus.ref?.datasetPath||meta?.context?.datasetPath||'');const rows=actions.visibleSweeps().filter(sw=>String(sw.datasetPath)===path);const preferred=rows.find(sw=>Number(sw.direction)>0)||rows[0];if(preferred)selectedSweepId=preferred.id;selectedPeakId='';selectedPeakIds.clear();}
        const changed=previousSweep!==selectedSweepId||previousPeak!==selectedPeakId;
        if(changed)renderLinkedSelection({includeGroup:meta?.source!=='resonance-group',controls:meta?.source!=='resonance-group'&&previousSweep!==selectedSweepId});
        else{if($('#reswinMainPlot')?.offsetParent!==null)actions.ensureMainSurface()?.requestRender?.('resonance-host-resize');if($('#reswinTrendPlot')?.offsetParent!==null)actions.renderTrend();if($('#reswinInspectPlot')?.offsetParent!==null)actions.renderInspection();}
      }finally{applyingExternalSelection=false;}
    }
    function peaksInRange(range=selectedRange){
      if(!range)return [];const lo=Math.min(Number(range.min??range.vMin??range.xMin),Number(range.max??range.vMax??range.xMax)),hi=Math.max(Number(range.min??range.vMin??range.xMin),Number(range.max??range.vMax??range.xMax));
      const hasY=Number.isFinite(Number(range.iMin??range.yMin))&&Number.isFinite(Number(range.iMax??range.yMax)),yLo=hasY?Math.min(Number(range.iMin??range.yMin),Number(range.iMax??range.yMax)):NaN,yHi=hasY?Math.max(Number(range.iMin??range.yMin),Number(range.iMax??range.yMax)):NaN;
      return (live.workspace.peaks||[]).filter(p=>(!range.sweepId||p.sweepId===range.sweepId)&&Number(p.v)>=lo&&Number(p.v)<=hi&&(!hasY||(Number(p.i)>=yLo&&Number(p.i)<=yHi)));
    }
    function setRangeLocked(value){for(const p of peaksInRange())p.locked=!!value;actions.invalidatePhysics();renderLinkedSelection();actions.scheduleSnapshot();}
    function applyRangeIdentity(order,label=''){
      const n=Math.max(1,Math.round(Number(order)||1)),rows=peaksInRange();if(!rows.length)return false;actions.normalizeCategories();let c=actions.category(n),text=String(label||'').trim();
      if(text){const cat=(live.workspace.peakCategories||[]).find(row=>Number(row.order)===n);if(cat)cat.label=text;for(const p of live.workspace.peaks||[])if(Number(p.peakOrder)===n)p.peakLabel=text;c={...c,label:text};}
      for(const p of rows){p.peakOrder=n;p.peakLabel=c.label;p.manual=true;p.orderAnchor=true;}actions.invalidatePhysics();actions.render();actions.scheduleSnapshot({label:'修改峰序身份'});setStatus(`已将框选的 ${rows.length} 个峰统一设为 ${c.label}。`);return true;
    }
    function deleteRangePeaks(){const ids=new Set(peaksInRange().filter(p=>!p.locked).map(p=>p.id));live.workspace.peaks=(live.workspace.peaks||[]).filter(p=>!ids.has(p.id));if(ids.has(selectedPeakId))selectedPeakId='';for(const id of ids)selectedPeakIds.delete(String(id));actions.invalidatePhysics();actions.render();actions.scheduleSnapshot();}
    function switchSelectedSweep(step){const rows=actions.visibleSweeps();if(!rows.length)return false;let index=Math.max(0,rows.findIndex(sw=>sw.id===selectedSweepId));index=(index+(Number(step)||0)+rows.length)%rows.length;publishSweepSelection(rows[index],'resonance-shortcut');actions.scheduleSnapshot();return true;}
    function moveSelectedPeakBy(step){
      const peak=selectedPeak();if(!peak)return false;if(peak.locked){setStatus('该峰位已锁定，无法移动。');return true;}const sw=actions.sweepById(peak.sweepId),points=sw?.points||[];if(!points.length)return false;
      let index=points.reduce((best,p,i)=>Math.abs(Number(p.v)-Number(peak.v))<Math.abs(Number(points[best]?.v)-Number(peak.v))?i:best,0);index=Math.max(0,Math.min(points.length-1,index+(Number(step)||0)));
      const point=points[index],oldV=Number(peak.v);peak.v=Number(point.v);peak.i=Number(point.i);peak.index=Number.isFinite(Number(point.index))?Number(point.index):index;peak.manual=true;
      const delta=peak.v-oldV;if(Number.isFinite(delta)){if(Number.isFinite(Number(peak.widthLeft)))peak.widthLeft=Number(peak.widthLeft)+delta;if(Number.isFinite(Number(peak.widthRight)))peak.widthRight=Number(peak.widthRight)+delta;if(Number.isFinite(Number(peak.analysisLeft)))peak.analysisLeft=Number(peak.analysisLeft)+delta;if(Number.isFinite(Number(peak.analysisRight)))peak.analysisRight=Number(peak.analysisRight)+delta;}
      actions.commitPeakMetricEdit(peak,{geometry:true,reason:'peak-keyboard-move'});publishPeakSelection(peak,'resonance-peak-move');actions.scheduleSnapshot();return true;
    }
    function selectAdjacentPeak(step){const sw=selectedSweep();if(!sw)return false;const rows=(live.workspace.peaks||[]).filter(p=>p.sweepId===sw.id).sort((a,b)=>Number(a.v)-Number(b.v));if(!rows.length)return false;let index=Math.max(0,rows.findIndex(p=>p.id===selectedPeakId));index=Math.max(0,Math.min(rows.length-1,index+(Number(step)||0)));publishPeakSelection(rows[index],'resonance-shortcut');return true;}
    function selectedIdSet(){return selectedPeakIds.size?new Set(selectedPeakIds):(selectedPeakId?new Set([String(selectedPeakId)]):new Set());}
    function lockSelectedPeaks(value=true){const ids=selectedIdSet();if(!ids.size)return false;let count=0;for(const p of live.workspace.peaks||[])if(ids.has(String(p.id))){p.locked=!!value;count++;}actions.invalidatePhysics();renderLinkedSelection({includeGroup:true});actions.scheduleSnapshot();setStatus(`${value?'已锁定':'已解锁'} ${count} 个峰。`);return true;}
    function deleteSelectedPeaks(){const ids=selectedIdSet();if(!ids.size)return false;live.workspace.peaks=(live.workspace.peaks||[]).filter(p=>!ids.has(String(p.id)));selectedPeakIds.clear();selectedPeakId='';actions.invalidatePhysics();interactionSelection?.clear?.({source:'resonance-delete',keepRanges:true,keepContext:true});actions.render();actions.scheduleSnapshot({label:'删除峰'});setStatus(`已删除 ${ids.size} 个峰。`);return true;}
    function clearSelectedRange(){actions.clearMainRangeMenu();interactionSelection?.clearRange?.({source:'resonance-range-clear'});actions.renderMainPlot();return true;}
    function clearSelection(){selectedPeakId='';selectedPeakIds.clear();selectedSweepId='';actions.clearMainRangeMenu();interactionSelection?.clear?.({source:'resonance-deselect'});renderLinkedSelection({includeGroup:true,controls:true});setStatus('已退出共振选中。');return true;}
    function clearIds({keepRange=false}={}){selectedPeakId='';selectedPeakIds.clear();selectedSweepId='';if(!keepRange)selectedRange=null;}
    function reconcileAfterRebuild(){if(!live.sweeps.some(sw=>sw.id===selectedSweepId))selectedSweepId=actions.visibleSweeps()[0]?.id||live.sweeps[0]?.id||'';if(selectedPeakId&&!actions.peakById(selectedPeakId)){selectedPeakId='';selectedPeakIds.clear();}}
    function setInteractionRuntime(runtime={}){interactionSelectionOff?.();interactionSelectionOff=null;interactionRuntime=runtime.runtime||null;interactionSelection=runtime.selection||interactionRuntime?.selection||null;if(interactionSelection?.subscribe)interactionSelectionOff=interactionSelection.subscribe(applyInteractionSelection,{immediate:false});bindLinkedSelectionViews();if(interactionSelection&&!interactionSelection.get?.()?.focus&&selectedSweep())publishSweepSelection(selectedSweep(),'resonance-initial');}
    function setSelectedSweepId(value){selectedSweepId=String(value||'');return selectedSweepId;}
    function setSelectedPeakId(value,{single=true}={}){selectedPeakId=String(value||'');if(single){selectedPeakIds.clear();if(selectedPeakId)selectedPeakIds.add(selectedPeakId);}return selectedPeakId;}
    function clearRangeState(){selectedRange=null;}
    function setRangeState(range){selectedRange=range?{...range}:null;return selectedRange;}
    return Object.freeze({
      get selectedSweepId(){return selectedSweepId;},get selectedPeakId(){return selectedPeakId;},get selectedRange(){return selectedRange?{...selectedRange}:null;},
      selectedSweep,selectedPeak,selectedPeakIds:()=>new Set(selectedPeakIds),interactionRuntime:()=>interactionRuntime,interactionSelection:()=>interactionSelection,selection:()=>interactionSelection?.get?.()||null,
      bindLinkedSelectionViews,renderLinkedSelection,publishDatasetSelection,publishSweepSelection,publishPeakSelection,publishRangeSelection,peaksInRange,setRangeLocked,applyRangeIdentity,deleteRangePeaks,
      switchSelectedSweep,moveSelectedPeakBy,selectAdjacentPeak,lockSelectedPeaks,deleteSelectedPeaks,clearSelectedRange,clearSelection,clearIds,reconcileAfterRebuild,setInteractionRuntime,setSelectedSweepId,setSelectedPeakId,clearRangeState,setRangeState
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-selection-runtime',Object.freeze({create}));
})();
