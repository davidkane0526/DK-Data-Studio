(() => {
  function provide(ctx,domain){
    if(!domain?.snapshot||!domain?.actions||!ctx.services?.domain)return null;
    const actions={};
    for(const [id,handler] of Object.entries(domain.actions))actions[id]=payload=>handler(payload);
    return ctx.services.domain.provide('live',{
      version:'1.0.0',
      title:'Pulse Sampler Tool live domain owner',
      snapshot:()=>domain.snapshot(),
      subscribe:fn=>domain.subscribe(fn),
      actions
    });
  }
  window.DKDSPluginModules.define('com.dkds.tools.pulse-sampler','domain-adapter',Object.freeze({provide}));
})();
