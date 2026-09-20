(() => {
  async function mount(ctx,controller){
    const feature=window.DKDSPluginModules.get('builtin.ter-analysis','feature-runtime');
    const unitPresentation=window.DKDSPluginModules.get('builtin.ter-analysis','unit-presentation');
    if(!feature?.mount)throw new Error('TER Analysis feature runtime unavailable.');
    if(!unitPresentation?.mount)throw new Error('TER Unit presentation runtime unavailable.');
    return feature.mount(ctx,controller,{mode:'unit',unitPresentation,root:ctx.ui.dom.query('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'ter-unit-adapter'})});
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','super-layout',Object.freeze({mount}));
})();
