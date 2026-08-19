(() => {
  async function mount(ctx,controller,views){
    const feature=window.DKDSPluginModules.get('builtin.ter-analysis','feature-runtime');if(!feature?.mount)throw new Error('TER Analysis feature runtime unavailable.');
    return feature.mount(ctx,controller,views,{mode:'super',root:ctx.ui.dom.query('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'ter-super-adapter'})});
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','super-layout',Object.freeze({mount}));
})();
