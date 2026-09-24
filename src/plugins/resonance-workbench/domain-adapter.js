(() => {
  function provide(ctx,service){
    if(!service?.getState||!ctx.services?.domain)return null;
    const snapshot=()=>{
      const state=service.getState?.()||{};
      const visibleIds=new Set((service.visibleSweepIds?.()||[]).map(String));
      const visibleSweeps=(Array.isArray(state.sweeps)?state.sweeps:[]).filter(sw=>visibleIds.has(String(sw?.id||'')));
      return {
        ...state,
        visibleSweeps,
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
        selectPeak:payload=>service.selectPeak?.(payload?.id??valueOf(payload),{source:'resonance-domain-adapter'}),
        selectSweep:payload=>service.selectSweep?.(payload?.id??valueOf(payload),{source:'resonance-domain-adapter'}),
        selectRange:payload=>service.selectRange?.(payload?.range??valueOf(payload),{source:'resonance-domain-adapter'}),
        clearSelection:()=>service.clearSelection?.(),
        resetMainView:()=>service.resetMainView?.(),
        reset:()=>service.reset?.(),
        refreshData:()=>service.refreshData?.()
      }
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','domain-adapter',Object.freeze({provide}));
})();
