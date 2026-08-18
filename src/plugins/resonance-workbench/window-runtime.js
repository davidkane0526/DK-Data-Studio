(() => {
  window.DKDSPluginWindowRuntime={
    create(args){
      const feature=window.DKDSResonanceFeatureRuntime;
      if(!feature?.createTop)throw new Error('Resonance feature runtime is unavailable.');
      const adapter={
        mode:'top',
        root:document.querySelector('#app'),
        statusBar:document.querySelector('#statusBar'),
        resize:()=>window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'resonance-top-adapter'})
      };
      return feature.createTop({...args,adapter});
    }
  };
})();
