(() => {
  const modules=window.DKDSPluginModules;
  const service=modules.require('builtin.ter-analysis','analysis-service');
  modules.define('builtin.ter-analysis','window-runtime',{
    create:args=>service.create({...args,io:window.DKDSIO?.createScope?.('builtin.ter-analysis')||window.DKDSIO,charts:window.DKDSCharts?.createScope?.('builtin.ter-analysis')||window.DKDSCharts,dom:window.DKDSComponents?.createScope?.('builtin.ter-analysis')||null})
  });
})();
