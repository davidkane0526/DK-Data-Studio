(() => {
  async function mount(ctx,controller,views){const feature=window.DKDSPulseFeatureRuntime;if(!feature?.mount)throw new Error('Pulse / Read Analysis feature runtime unavailable.');return feature.mount(ctx,controller,views,{mode:'super',root:document.querySelector('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'pulse-super-adapter'})});}
  window.DKDSPulseSuperLayout=Object.freeze({mount});
})();
