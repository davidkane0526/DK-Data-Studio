(() => {
  window.DKDSPluginModules.define('builtin.resonance-workbench','window-runtime',{
    async create(args){
      const feature=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-runtime');
      if(!feature?.createTop)throw new Error('Resonance feature runtime unavailable.');
      const dom=window.DKDSComponents?.createScope?.('builtin.resonance-workbench')||null;
      const adapter={
        mode:'top',
        root:dom?.query?.('#app'),
        resize:()=>window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'resonance-top-adapter'})
      };
      return feature.createTop({...args,adapter,io:window.DKDSIO?.createScope?.('builtin.resonance-workbench')||window.DKDSIO,charts:window.DKDSCharts?.createScope?.('builtin.resonance-workbench')||window.DKDSCharts,dom});
    }
  });
})();
