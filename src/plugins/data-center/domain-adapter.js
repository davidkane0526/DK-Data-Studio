(() => {
  function provide(ctx,runtime,controller=null){
    const domain=runtime?.domain;
    if(!domain?.snapshot||!domain?.actions||!ctx.services?.domain)return null;
    const snapshot=()=>domain.snapshot();
    const subscribe=fn=>{
      const offs=[];
      const offDomain=domain?.subscribe?.(event=>fn(event));if(typeof offDomain==='function')offs.push(offDomain);
      const offController=controller?.subscribe?.((_value,meta={})=>fn({type:'controller',reason:String(meta?.reason||'state'),detail:meta}),{immediate:false});
      if(typeof offController==='function')offs.push(offController);
      const offArtifacts=ctx.events?.on?.('data:artifacts-changed',event=>fn({type:'artifacts',reason:'data:artifacts-changed',detail:event}));
      if(typeof offArtifacts==='function')offs.push(offArtifacts);
      return()=>{for(const off of offs.splice(0))try{off();}catch{}};
    };
    const actions={};for(const [id,handler] of Object.entries(domain.actions))actions[id]=payload=>handler(payload);
    return ctx.services.domain.provide('live',{version:'1.0.0',title:'Data Center live domain owner',snapshot,subscribe,actions});
  }
  window.DKDSPluginModules.define('builtin.data-center','domain-adapter',Object.freeze({provide}));
})();
