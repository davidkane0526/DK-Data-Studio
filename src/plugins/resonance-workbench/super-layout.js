(() => {
  async function mount(ctx,controller){
    const feature=window.DKDSResonanceFeatureRuntime;
    if(!feature?.mountSuper)throw new Error('Resonance feature runtime is unavailable.');
    const adapter={
      mode:'super',
      root:document.querySelector('.workspace'),
      slots:{
        sidebar:document.querySelector('#pluginSidebarSections'),
        main:document.querySelector('#mainWorkspace'),
        inspector:document.querySelector('#inspectorPanel'),
        group:document.querySelector('#groupPanel'),
        rightDock:document.querySelector('#primeRightDockSlot'),
        bottomDock:document.querySelector('#primeBottomDockSlot'),
        overlay:document.querySelector('#app')
      },
      resize:()=>ctx.events.emit('layout:resize',{reason:'resonance-super-adapter'})
    };
    return feature.mountSuper(ctx,controller,adapter);
  }
  window.DKDSResonanceSuperLayout=Object.freeze({mount});
})();
