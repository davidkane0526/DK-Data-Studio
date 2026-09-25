(() => {
  const MarkerProjection=window.DKDSPluginModules.require('builtin.resonance-workbench','main-marker-projection');
  const InspectorProjection=window.DKDSPluginModules.require('builtin.resonance-workbench','inspector-detail-projection');
  function provide(ctx,service){
    if(!service?.getState||!ctx.services?.domain)return null;
    const snapshot=()=>{
      const state=service.getState?.()||{};
      const visibleSweepIds=(service.visibleSweepIds?.()||[]).map(String);
      const visibleIds=new Set(visibleSweepIds);
      const visibleSweeps=(Array.isArray(state.sweeps)?state.sweeps:[]).filter(sw=>visibleIds.has(String(sw?.id||'')));
      const mainMarkers=MarkerProjection.project({
        workspace:state.workspace||{},
        visibleSweepIds,
        colorForPeak:peak=>peak?.customColor||service.colorForPeakOrder?.(peak?.peakOrder||1,peak?.direction||1)||''
      });
      const inspector=InspectorProjection.project({
        selectedSweep:state.selectedSweep||null,
        selectedPeak:state.selectedPeak||null,
        workspace:state.workspace||{},
        sweepById:id=>service.sweepById?.(id)||null,
        peakMetrics:peak=>service.metrics?.(peak)||{}
      });
      return {
        ...state,
        visibleSweeps,
        mainMarkers,
        inspector,
        group:{
          preference:String(service.getCurrentGroupColumnPreference?.()||state?.workspace?.groupColumns||'auto'),
          effective:String(service.getEffectiveGroupColumns?.()||1),
          context:String(service.getGroupContext?.()||'')
        },
        diagnostics:service.getGroupDiagnostics?.()||{}
      };
    };
    const subscribe=fn=>{
      const offs=[];
      const off=ctx.data.reactive?.subscribe?.(event=>fn({
        type:event?.type||'state',
        reason:event?.meta?.at?.(-1)?.reason||event?.touched?.join(',')||'',
        detail:event
      }),{immediate:false});
      if(typeof off==='function')offs.push(off);
      return()=>{for(const dispose of offs.splice(0))try{dispose();}catch{}};
    };
    const valueOf=payload=>payload?.value??payload;
    return ctx.services.domain.provide('live',{
      version:'1.0.0',
      title:'Resonance live domain owner',
      snapshot,subscribe,
      actions:{
        setGroupColumns:payload=>service.setGroupColumns?.(valueOf(payload)),
        setPeakDisplay:payload=>{const key=String(payload?.key||'');if(!key)throw new Error('setPeakDisplay requires key');return service.setPeakDisplay?.(key,payload?.value);},
        setTransform:payload=>service.setTransform?.(valueOf(payload)),
        setPreset:payload=>service.setPreset?.(valueOf(payload)),
        setAllVisibility:payload=>service.setAllVisibility?.(valueOf(payload)),
        selectPeak:payload=>service.selectPeak?.(payload?.id??valueOf(payload),{source:'resonance-domain-adapter',additive:payload?.additive===true,openInspector:payload?.openInspector===true}),
        selectSweep:payload=>service.selectSweep?.(payload?.id??valueOf(payload),{source:'resonance-domain-adapter'}),
        selectRange:payload=>service.selectRange?.(payload?.range??valueOf(payload),{source:'resonance-domain-adapter'}),
        assignSelectedPeakCategory:payload=>service.assignSelectedPeakCategory?.(payload?.order??valueOf(payload)),
        createCategoryForSelectedPeak:()=>service.createCategoryForSelectedPeak?.(),
        renameSelectedPeakCategory:payload=>service.renameSelectedPeakCategory?.(payload?.label??valueOf(payload)),
        toggleSelectedPeakAccepted:()=>service.toggleSelectedPeakAccepted?.(),
        toggleSelectedPeakLocked:()=>service.toggleSelectedPeakLocked?.(),
        resetSelectedPeakFwhmWindow:()=>service.resetSelectedPeakFwhmWindow?.(),
        deleteSelectedPeak:()=>service.deleteSelectedPeak?.(),
        selectSelectedPeakSweep:()=>service.selectSelectedPeakSweep?.(),
        clearSelection:()=>service.clearSelection?.(),
        resetMainView:()=>service.resetMainView?.(),
        reset:()=>service.reset?.(),
        refreshData:()=>service.refreshData?.()
      }
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','domain-adapter',Object.freeze({provide}));
})();
