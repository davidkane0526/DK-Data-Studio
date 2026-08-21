(() => {
  const modules=window.DKDSPluginModules;
  const service=modules.require('builtin.ter-analysis','analysis-service');
  modules.define('builtin.ter-analysis','window-runtime',{
    create(args){
      // The analysis service renders both ordinary Plotly traces and shared
      // scalar fields.  A raw DKDSCharts scope only implements the former.
      // Create the service through the same Core UI/ScientificPlot surface
      // used by plugin feature code so TOP and SUPER receive one chart contract.
      const runtimeUi=window.DKDSUI?.createScope?.('builtin.ter-analysis')||null;
      const charts=runtimeUi?.scientificPlot||window.DKDSScientificPlot?.createScope?.('builtin.ter-analysis')||null;
      if(typeof charts?.scalarField!=='function')throw new Error('ScientificPlot Runtime unavailable for TER TOP.');
      return service.create({...args,io:window.DKDSIO?.createScope?.('builtin.ter-analysis')||window.DKDSIO,charts,dom:window.DKDSComponents?.createScope?.('builtin.ter-analysis')||null,algorithms:{list:q=>window.DKDSScientificAlgorithms?.list?.(q)||[],resolve:(ref,q)=>window.DKDSScientificAlgorithms?.resolve?.(ref,q)||null,run:(ref,input,options)=>window.DKDSScientificAlgorithms?.run?.(ref,input,options),provenance:(ref,q)=>window.DKDSScientificAlgorithms?.provenance?.(ref,q)||null}});
    }
  });
})();
