(() => {
  async function mount(ctx,controller){
    const views=window.DKDSResonanceViewComponents;
    if(!views?.mountUnified)throw new Error('Resonance unified View runtime is unavailable.');
    return views.mountUnified(ctx,controller,{
      mode:'super',
      adapter:{
        mode:'super',
        root:document.querySelector('#app'),
        resize:()=>ctx.events.emit('layout:resize',{reason:'resonance-super-adapter'})
      }
    });
  }
  window.DKDSResonanceSuperLayout=Object.freeze({mount});
})();
