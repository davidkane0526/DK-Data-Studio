(() => {
  const modules=window.DKDSPluginModules;
  const service=modules.require('builtin.ter-analysis','analysis-service');
  modules.define('builtin.ter-analysis','window-runtime',{
    create(args){
      return service.create({...args,io:window.DKDSIO?.createScope?.('builtin.ter-analysis')||window.DKDSIO,dom:window.DKDSComponents?.createScope?.('builtin.ter-analysis')||null,reactive:window.DKDSScientificReactive?.createScope?.('builtin.ter-analysis')||null,algorithms:{list:q=>window.DKDSScientificAlgorithms?.list?.(q)||[],resolve:(ref,q)=>window.DKDSScientificAlgorithms?.resolve?.(ref,q)||null,run:(ref,input,options)=>window.DKDSScientificAlgorithms?.run?.(ref,input,options),provenance:(ref,q)=>window.DKDSScientificAlgorithms?.provenance?.(ref,q)||null}});
    }

  });
})();
