(() => {
  async function mount(ctx,controller,views){const feature=window.DKDSPluginModules.get('builtin.data-center','feature-runtime');if(!feature?.mount)throw new Error('Data Center feature runtime unavailable.');return feature.mount(ctx,controller,views,{mode:'super',root:ctx.ui.dom.query('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'data-center-super-adapter'})});}
  window.DKDSPluginModules.define('builtin.data-center','super-layout',Object.freeze({mount}));
})();
