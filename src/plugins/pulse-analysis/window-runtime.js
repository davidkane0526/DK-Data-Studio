(() => {
  const modules=window.DKDSPluginModules;
  const service=modules.require('builtin.pulse-analysis','analysis-service');
  modules.define('builtin.pulse-analysis','window-runtime',{
    create:args=>service.create({...args,io:window.DKDSIO?.createScope?.('builtin.pulse-analysis')||window.DKDSIO,charts:window.DKDSCharts?.createScope?.('builtin.pulse-analysis')||window.DKDSCharts,dom:window.DKDSComponents?.createScope?.('builtin.pulse-analysis')||null})
  });
})();
