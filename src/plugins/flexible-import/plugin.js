(() => {
  GRSPlugins.define({
    id:'builtin.flexible-import',
    name:'Flexible Text Import',
    version:'1.0.0',
    apiVersion:'1.0.0',
    description:'Generic text/multicolumn import provider used by the import workbench.',
    source:'builtin',
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
      parseArtifacts(file,options){
        const parsed=A.parseFlexibleData(file,options);
        return {artifacts:parsed.datasets.map(ds=>ctx.data.model.fromLegacyDataset(ds)),inspection:parsed.inspection};
      },
      outputKinds:['data.table'],
      defaultOptions:()=>A.defaultImportOptions(),
      normalizeOptions:options=>A.normalizeImportOptions(options)
    });
    return {};
  });
})();
