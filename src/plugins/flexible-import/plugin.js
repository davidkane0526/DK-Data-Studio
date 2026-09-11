(() => {
  DKDSPlugins.define({"id":"builtin.flexible-import","name":"Flexible Text Import","version":"1.3.0","apiVersion":"1.19.0","requiresCore":["science","data.importers","data.model"],"entry":"plugin.js","enabled":true,"order":10,"description":"Generic text/multicolumn and tabular JSON import provider used by the import workbench.","capabilities":["data.importer","data.inspector"],"pluginType":"data","pluginDependencies":[{"id":"builtin.scientific-data-contracts"}]}, async ctx => {
    const A=ctx.science;
    const D=ctx.data.model;
    const ext=name=>String(name||'').toLowerCase().match(/\.([^.\\/]+)$/)?.[1]||'';
    const cell=value=>{
      if(value===null||value===undefined)return '';
      if(typeof value==='number'||typeof value==='boolean')return String(value);
      if(typeof value==='string')return value.replace(/[\t\r\n]+/g,' ');
      return JSON.stringify(value).replace(/[\t\r\n]+/g,' ');
    };
    function rowsFromJson(raw){
      let rows=raw,columns=null;
      if(raw&&typeof raw==='object'&&!Array.isArray(raw)){
        for(const key of ['data','rows','records','points','values']){
          if(Array.isArray(raw[key])){rows=raw[key];columns=Array.isArray(raw.columns)?raw.columns.map(String):null;break;}
        }
        if(rows===raw){
          const entries=Object.entries(raw).filter(([,value])=>Array.isArray(value));
          if(entries.length>=2){
            const length=Math.max(...entries.map(([,value])=>value.length));
            if(length>0){columns=entries.map(([key])=>key);rows=Array.from({length},(_,index)=>entries.map(([,value])=>value[index]));}
          }
        }
      }
      if(!Array.isArray(rows)||!rows.length)throw new Error('JSON 不是可识别的表格数据；支持对象数组、二维数组、rows/data/records/points/values 数组或等长列数组对象。');
      if(rows.every(row=>Array.isArray(row))){
        const width=Math.max(...rows.map(row=>row.length));
        if(width<2)throw new Error('JSON 表格至少需要两列。');
        const header=columns&&columns.length?columns:Array.from({length:width},(_,i)=>`Col ${i+1}`);
        return [header,...rows];
      }
      if(rows.every(row=>row&&typeof row==='object'&&!Array.isArray(row))){
        const keys=[];const seen=new Set();
        for(const row of rows.slice(0,200))for(const key of Object.keys(row)){if(!seen.has(key)){seen.add(key);keys.push(key);}}
        if(keys.length<2)throw new Error('JSON 对象表格至少需要两个字段。');
        return [keys,...rows.map(row=>keys.map(key=>row[key]))];
      }
      throw new Error('JSON 数据行结构不一致，无法可靠转换为表格。');
    }
    function normalizeFile(file){
      if(ext(file?.name||file?.path)!=='json')return file;
      let raw;try{raw=JSON.parse(String(file?.text||''));}catch(err){throw new Error(`JSON 解析失败：${err?.message||err}`);}
      if(window.DKDSProjectFormat?.isProjectLike?.(raw))throw new Error('该 JSON 是 DK Data Studio 项目文件，应由项目加载器打开。');
      const rows=rowsFromJson(raw);
      return {...file,text:rows.map(row=>row.map(cell).join('\t')).join('\n'),jsonTabular:true};
    }
    const inspect=(file,options)=>A.inspectDataText(normalizeFile(file),options);
    const parse=(file,options)=>A.parseFlexibleData(normalizeFile(file),options);
    function artifactsFromParsed(parsed,normalized,file,options){
      const artifacts=(parsed?.datasets||[]).map(ds=>{
        const points=Array.isArray(ds?.points)?ds.points:[],columnar=ds?.columnar&&Array.isArray(ds.columnar.v)&&Array.isArray(ds.columnar.i)?ds.columnar:null,seriesPath=String(ds?.path||ds?.name||file?.path||'transport-data'),vg=Number.isFinite(Number(ds?.vg))?Number(ds.vg):null;
        const vValues=columnar?columnar.v:points.map(p=>p.v),iValues=columnar?columnar.i:points.map(p=>p.i),sourceLines=columnar&&Array.isArray(columnar.sourceLine)?columnar.sourceLine:points.map((p,index)=>Number.isFinite(Number(p.sourceLine))?Number(p.sourceLine):index+1),n=Math.min(vValues.length,iValues.length);
        return D.createTable({
          id:D.stableId('source-table',seriesPath),name:String(ds?.name||file?.name||'I-V data'),semanticType:'science.transport.iv',transient:false,
          metadata:{importedSource:true,importerId:'flexible-text',seriesPath,vg,importSpec:D.deepClone(ds?.importSpec||options||{}),dataAssignments:[],sourceContainer:normalized.jsonTabular?'json-tabular':'text'},
          source:{path:String(ds?.sourcePath||file?.path||''),name:String(ds?.sourceName||file?.name||''),encoding:String(ds?.encoding||file?.encoding||options?.encoding||'auto')},
          columns:[
            {key:'Vd',name:ds?.importSpec?.xHeader||'Vd',unit:'V',role:'x',values:vValues.slice(0,n),metadata:{sourceColumn:ds?.importSpec?.xCol}},
            {key:'Id',name:ds?.importSpec?.yHeader||'Id',unit:'A',role:'y',values:iValues.slice(0,n),metadata:{sourceColumn:ds?.importSpec?.yCol}},
            {key:'Vg',name:'Vg',unit:'V',role:'group',values:Array.from({length:n},()=>vg===null?NaN:vg)},
            {key:'sourceLine',name:'Source line',unit:'',role:'index',values:sourceLines.slice(0,n)}
          ],
          provenance:[{type:'import',label:normalized.jsonTabular?'Tabular JSON import':'Flexible text import',providerId:'flexible-text',pluginId:'builtin.flexible-import',version:'1.3.0',parameters:D.deepClone(ds?.importSpec||options||{}),source:{path:String(ds?.sourcePath||file?.path||''),name:String(ds?.sourceName||file?.name||'')}}]
        });
      });
      return {artifacts,inspection:parsed?.inspection};
    }
    ctx.data.importers.register('flexible-text',{
      id:'flexible-text',
      name:'Flexible Text / Multi-column / JSON',
      extensions:['json','csv','txt','dat','tsv','asc','xy','iv','prn','out','log'],
      inspect,
      parse,
      parseArtifacts(file,options){
        const normalized=normalizeFile(file);
        return artifactsFromParsed(A.parseFlexibleData(normalized,options),normalized,file,options);
      },
      createStreamParser(file,options,inspection){
        if(ext(file?.name||file?.path)==='json')return null;
        const parser=A.createFlexibleDataStream?.(file,options,inspection);
        if(!parser)return null;
        return Object.freeze({
          pushLines:(lines,meta)=>parser.pushLines(lines,meta),
          finish:meta=>artifactsFromParsed(parser.finish(meta),file,file,options)
        });
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
