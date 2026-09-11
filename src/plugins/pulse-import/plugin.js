(() => {
  DKDSPlugins.define({"id":"builtin.pulse-import","name":"Pulse Text Import","version":"1.1.0","apiVersion":"1.19.0","requiresCore":["science","data.model","data.importers"],"entry":"plugin.js","enabled":true,"order":18,"description":"Typed pulse/read text importer. Parses raw instrument tables into a shared science.pulse.trace DataTable without owning file dialogs or workbench UI.","capabilities":["data.importer","data.inspector"],"pluginType":"data","scripts":["plugin.js"],"pluginDependencies":[{"id":"builtin.scientific-data-contracts"}]}, async ctx => {
    const A=ctx.science;
    const D=ctx.data.model;
    const safeKey=(header,index)=>{
      const raw=String(header||'').trim().replace(/[^A-Za-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');
      return `${raw||'col'}_${index+1}`;
    };
    const inspect=(file,options={})=>A.inspectDataText(file,{...A.defaultImportOptions(),...(options||{})});
    function artifactResult(file,options,ins,columnValues,sourceLines){
      const columns=(ins.headers||[]).map((header,index)=>({key:safeKey(header,index),name:String(header||`Col ${index+1}`),role:'',unit:'',values:Array.isArray(columnValues?.[index])?columnValues[index]:[],metadata:{sourceColumn:index+1}}));
      columns.push({key:'sourceLine',name:'Source line',role:'index',unit:'',values:Array.isArray(sourceLines)?sourceLines:[]});
      const sourcePath=String(file?.path||file?.name||'pulse-data'),rowCount=sourceLines?.length||0;
      const artifact=D.createTable({id:D.stableId('pulse-table',sourcePath),name:String(file?.name||'pulse-data').replace(/\.[^.]+$/,''),semanticType:'science.pulse.trace',metadata:{importedSource:true,importerId:'pulse-text',sourceFormat:'pulse-text',dataAssignments:[],resolvedDelimiter:ins.delimiter||'',sourceRowCount:rowCount},source:{path:sourcePath,name:String(file?.name||'pulse-data'),encoding:String(file?.encoding||options?.encoding||'auto')},columns,provenance:[{type:'import',label:'Pulse text import',providerId:'pulse-text',pluginId:'builtin.pulse-import',version:'1.1.0',source:{path:sourcePath,name:String(file?.name||'')}}]});
      return {artifacts:[artifact],inspection:ins};
    }
    ctx.data.importers.register('pulse-text',{
      id:'pulse-text',
      name:'Pulse / Read text table',
      description:'Preserves numeric columns and source provenance for pulse/read protocol analysis without duplicating the raw file text.',
      extensions:['csv','txt','dat','tsv','asc','prn','out','log'],
      preferredConsumers:['builtin.pulse-analysis'],
      outputKinds:['data.table'],
      outputTypes:['science.pulse.trace'],
      editor:'generic-table',
      priority:0,
      defaultOptions:()=>A.defaultImportOptions(),
      normalizeOptions:options=>A.normalizeImportOptions(options),
      inspect,
      score:(file,context={})=>{
        const targets=Array.isArray(context.targets)?context.targets.map(String):[];
        if(targets.includes('builtin.pulse-analysis'))return 1000;
        const name=String(file?.name||'').toLowerCase();
        return /pulse|read|write|program|erase/.test(name)?80:5;
      },
      estimateArtifacts:()=>1,
      parseArtifacts(file,options={}){
        const ins=inspect(file,options);
        if(!ins?.numericRows?.length)throw new Error('没有可导入的数值数据行。');
        const columnValues=(ins.headers||[]).map((_,index)=>ins.numericRows.map(row=>Number.isFinite(row.values?.[index])?Number(row.values[index]):NaN));
        return artifactResult(file,options,ins,columnValues,ins.numericRows.map(row=>Number(row.sourceLine)||NaN));
      },
      createStreamParser(file,options={},inspection){
        const parser=A.createNumericTableStream?.(file,{...A.defaultImportOptions(),...(options||{})},inspection);if(!parser)return null;
        return Object.freeze({
          pushLines:(lines,meta)=>parser.pushLines(lines,meta),
          finish:meta=>{const result=parser.finish(meta);if(!result.rowCount)throw new Error('没有可导入的数值数据行。');return artifactResult({...file,encoding:meta?.encoding||file?.encoding},options,result.inspection,result.columns,result.sourceLines);}
        });
      }
    });
    return {};
  });
})();
