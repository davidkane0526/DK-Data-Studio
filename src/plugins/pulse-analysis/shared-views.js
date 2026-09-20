(() => {
  function create(controller){
    return Object.freeze({
      controller,
      pageHtml:()=>'',
      attach(ctx,page){
        const presentation=window.DKDSPluginModules.get('builtin.pulse-analysis','unit-presentation');
        if(!presentation?.mount)throw new Error('Pulse Unit presentation is unavailable.');
        return presentation.mount(ctx,page,controller);
      }
    });
  }
  window.DKDSPluginModules.define('builtin.pulse-analysis','shared-views',Object.freeze({create}));
})();
