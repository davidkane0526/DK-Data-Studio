(() => {
  async function mount(ctx,controller,views){
    const feature=window.DKDSTERFeatureRuntime;if(!feature?.mount)throw new Error('TER Analysis feature runtime unavailable.');
    return feature.mount(ctx,controller,views,{mode:'super',root:document.querySelector('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'ter-super-adapter'})});
  }
  window.DKDSTERSuperLayout=Object.freeze({mount});
})();
