(() => {
  async function mount(ctx,controller,views){const feature=window.DKDSPluginModules.get('builtin.pulse-analysis','feature-runtime');if(!feature?.mount)throw new Error('Pulse / Read Analysis feature runtime unavailable.');return feature.mount(ctx,controller,views,{mode:'super',root:ctx.ui.dom.query('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'pulse-super-adapter'})});}
  window.DKDSPluginModules.define('builtin.pulse-analysis','super-layout',Object.freeze({mount}));
})();
