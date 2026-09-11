(() => {
  async function mount(ctx,controller){
    const views=window.DKDSPluginModules.get('builtin.resonance-workbench','view-components');
    if(!views?.mountUnified)throw new Error('Resonance unified View runtime is unavailable.');
    return views.mountUnified(ctx,controller,{
      mode:'super',
      adapter:{
        mode:'super',
        root:ctx.ui.dom.query('#app'),
        resize:()=>ctx.events.emit('layout:resize',{reason:'resonance-super-adapter'})
      }
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','super-layout',Object.freeze({mount}));
})();
