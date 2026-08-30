(() => {
  DKDSPlugins.define({
    id:'builtin.flexible-import',pluginType:'data',
    name:'Flexible Text Import',
    version:'1.1.0',
    apiVersion:'1.19.0',requiresCore:["science","data.importers","data.model"],
    pluginDependencies:[{id:'builtin.scientific-data-contracts',range:'^1.0.0'}],
    description:'Generic text/multicolumn import provider used by the import workbench.',
    source:'builtin',
    order:10,
    capabilities:['data.importer','data.inspector']
  }, async ctx => {
    const A=ctx.science;
    const D=ctx.data.model;
    ctx.data.importers.register('flexible-text',{
      id:'flexible-text',
      name:'Flexible Text / Multi-column',
      extensions:['csv','txt','dat','tsv','asc','xy','iv','prn','out','log'],
      inspect:(file,options)=>A.inspectDataText(file,options),
      parse:(file,options)=>A.parseFlexibleData(file,options),
      parseArtifacts(file,options){
        const parsed=A.parseFlexibleData(file,options);
        const artifacts=parsed.datasets.map(ds=>{
          const points=Array.isArray(ds?.points)?ds.points:[],seriesPath=String(ds?.path||ds?.name||file?.path||'transport-data'),vg=Number.isFinite(Number(ds?.vg))?Number(ds.vg):null;
          return D.createTable({
            id:D.stableId('source-table',seriesPath),name:String(ds?.name||file?.name||'I-V data'),semanticType:'science.transport.iv',transient:false,
            metadata:{importedSource:true,importerId:'flexible-text',seriesPath,vg,importSpec:D.deepClone(ds?.importSpec||options||{}),dataAssignments:[]},
            source:{path:String(ds?.sourcePath||file?.path||''),name:String(ds?.sourceName||file?.name||''),encoding:String(ds?.encoding||file?.encoding||options?.encoding||'auto')},
            columns:[
              {key:'Vd',name:ds?.importSpec?.xHeader||'Vd',unit:'V',role:'x',values:points.map(p=>p.v),metadata:{sourceColumn:ds?.importSpec?.xCol}},
              {key:'Id',name:ds?.importSpec?.yHeader||'Id',unit:'A',role:'y',values:points.map(p=>p.i),metadata:{sourceColumn:ds?.importSpec?.yCol}},
              {key:'Vg',name:'Vg',unit:'V',role:'group',values:points.map(()=>vg===null?NaN:vg)},
              {key:'sourceLine',name:'Source line',unit:'',role:'index',values:points.map((p,index)=>Number.isFinite(Number(p.sourceLine))?Number(p.sourceLine):index+1)}
            ],
            provenance:[{type:'import',label:'Flexible text import',providerId:'flexible-text',pluginId:'builtin.flexible-import',version:'1.1.0',parameters:D.deepClone(ds?.importSpec||options||{}),source:{path:String(ds?.sourcePath||file?.path||''),name:String(ds?.sourceName||file?.name||'')}}]
          });
        });
        return {artifacts,inspection:parsed.inspection};
      },
      outputKinds:['data.table'],
      outputTypes:['science.transport.iv'],
      editor:'flexible-iv',
      priority:20,
      defaultOptions:()=>A.defaultImportOptions(),
      normalizeOptions:options=>A.normalizeImportOptions(options),
      parseVg:(name,text)=>A.parseVg(name,text),
      parseVgFromHeader:header=>A.parseVgFromImportHeader(header)
    });
    return {};
  });
})();
