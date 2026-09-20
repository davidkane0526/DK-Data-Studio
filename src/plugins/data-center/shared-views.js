(() => {
  function create(controller){
    return Object.freeze({
      controller,
      pageHtml:()=>'',
      attach(ctx,page,handlers={}){
        const presentation=window.DKDSPluginModules.get('builtin.data-center','unit-presentation');
        if(!presentation?.mount)throw new Error('Data Center Unit presentation is unavailable.');
        return presentation.mount(ctx,page,controller,handlers);
      }
    });
  }
  window.DKDSPluginModules.define('builtin.data-center','shared-views',Object.freeze({create}));
})();
