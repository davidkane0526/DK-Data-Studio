(() => {
  function provide(ctx,service,controller=null){
    if(!service||!ctx.services?.domain)return null;
    const patchState=patch=>{
      const current=service.serialize?.()||service.getState?.()||{};
      const next={...current,...(patch||{})};
      if(patch?.settings)next.settings={...(current.settings||{}),...patch.settings};
      if(patch?.display)next.display={...(current.display||{}),...patch.display};
      if(patch?.transform)next.transform={...(current.transform||{}),...patch.transform};
      service.restore?.(next);service.render?.();return service.getState?.()||next;
    };
    const snapshot=()=>{
      const state=service.getState?.()||{};
      return {...state,interaction:{selection:controller?.getSelection?.()||null},derived:{transformMatrix:state.result?service.getTransformMatrix?.()||null:null}};
    };
    const subscribe=fn=>{
      const offs=[];
      const reactiveOff=ctx.data.reactive?.subscribe?.(event=>fn({type:event?.type||'state',reason:event?.meta?.at?.(-1)?.reason||event?.touched?.join(',')||'',detail:event}),{immediate:false});
      if(typeof reactiveOff==='function')offs.push(reactiveOff);
      const selectionOff=controller?.selection?.subscribe?.((selection,meta={})=>fn({type:'selection',reason:String(meta.reason||'selection'),detail:{selection}}),{immediate:false});
      if(typeof selectionOff==='function')offs.push(selectionOff);
      return()=>{for(const off of offs.splice(0))try{off();}catch{}};
    };
    return ctx.services.domain.provide('live',{
      version:'1.1.0',title:'TER live domain owner',snapshot,subscribe,
      actions:{
        calculate:()=>service.calculate?.(),autoParameters:()=>service.autoParameters?.(),reset:()=>service.reset?.(),
        setSetting:payload=>patchState({settings:{[String(payload?.key||'')]:payload?.value}}),
        setDisplay:payload=>patchState({display:{[String(payload?.key||'')]:payload?.value}}),
        setAlgorithm:payload=>patchState({algorithmRef:payload?.value}),
        setTransformSettings:payload=>{const value=payload?.value||payload||{};service.setTransformSettings?.(value);return service.getState?.();},
        setOnlyFullyVisible:payload=>service.setOnlyFullyVisible?.(payload?.value??payload),applyDisplay:()=>service.applyDisplay?.(),resetDisplay:()=>service.resetDisplay?.(),
        clearSelection:payload=>controller?.clearSelection?.(payload||{source:'ter-unit-shadow'}),
        selectSelection:payload=>controller?.select?.(payload?.value??payload,{source:'ter-unit-shadow'}),
        getTransformMatrix:()=>service.getTransformMatrix?.(),
        exportLong:()=>service.exportLong?.(),copyLong:()=>service.copyLong?.(),exportMatrix:()=>service.exportMatrix?.(),copyMatrix:()=>service.copyMatrix?.(),
        exportMaxVg:()=>service.exportMaxVg?.(),copyMaxVg:()=>service.copyMaxVg?.(),exportMaxVd:()=>service.exportMaxVd?.(),copyMaxVd:()=>service.copyMaxVd?.()
      }
    });
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','domain-adapter',Object.freeze({provide}));
})();
