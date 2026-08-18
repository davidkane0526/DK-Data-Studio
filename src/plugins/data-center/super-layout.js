(() => {
  async function mount(ctx,controller,views){const feature=window.DKDSDataCenterFeatureRuntime;if(!feature?.mount)throw new Error('Data Center feature runtime unavailable.');return feature.mount(ctx,controller,views,{mode:'super',root:document.querySelector('#app'),resize:()=>ctx.events.emit('layout:resize',{reason:'data-center-super-adapter'})});}
  window.DKDSDataCenterSuperLayout=Object.freeze({mount});
})();
