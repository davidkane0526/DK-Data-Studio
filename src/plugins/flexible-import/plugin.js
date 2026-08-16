(() => {
  GRSPlugins.define({
    id:'builtin.flexible-import',
    name:'Flexible Text Import',
    version:'1.0.0',
    apiVersion:'1.0.0',
    order:10,
    capabilities:['data.importer','data.inspector']
  }, async ctx => {
    const A=window.GRSScience;
    ctx.registry.add('data.importers','flexible-text',{
      id:'flexible-text',
      name:'Flexible Text / Multi-column',
      extensions:['csv','txt','dat','tsv','asc','xy','iv','prn','out','log'],
      inspect:(file,options)=>A.inspectDataText(file,options),
      parse:(file,options)=>A.parseFlexibleData(file,options),
      defaultOptions:()=>A.defaultImportOptions(),
      normalizeOptions:options=>A.normalizeImportOptions(options)
    });
    return {};
  });
})();
