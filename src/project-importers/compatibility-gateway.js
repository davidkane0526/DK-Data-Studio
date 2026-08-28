(function(root,factory){
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root){root.DKDSProjectCompatibilityGateway=api;api.register(root.DKDSProjectFormat);}
})(typeof window!=='undefined'?window:globalThis,function(root){
  const FORMAT='dk-data-studio-project';
  const SCHEMA_VERSION=3;
  const STORE_SCHEMA=2;
  const DOMAIN_ROOT_FIELDS=Object.freeze([
    'scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings',
    'physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset',
    'terMaxSettings','terHeatmapDisplay','terTransformSettings','terAlgorithmRef','terMaxResult',
    'pulseAnalysis','panelLayout','trendColumns'
  ]);
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const safeArray=value=>Array.isArray(value)?value:[];
  const empty=value=>value===undefined||value===null||(Array.isArray(value)&&value.length===0)||(typeof value==='string'&&!value.trim())||(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===0);
  function hashString(value){const text=String(value??'');let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
  const stableId=(prefix,value)=>`${prefix}:${hashString(value)}`;
  const nowIso=()=>new Date().toISOString();
  function science(){
    if(root?.DKDSScience?.parseFlexibleData)return root.DKDSScience;
    if(typeof module!=='undefined'&&module.exports){try{return require('../science/index.js');}catch{}}
    return null;
  }
  function validateRaw(project){
    if(!project||typeof project!=='object'||Array.isArray(project))throw new Error('文件内容不是 DK Data Studio 工程对象');
    if(project.datasets!==undefined&&!Array.isArray(project.datasets))throw new Error('工程字段 datasets 损坏：应为数组');
    if(project.plugins!==undefined&&(project.plugins===null||typeof project.plugins!=='object'||Array.isArray(project.plugins)))throw new Error('工程字段 plugins 损坏：应为对象');
    if(project.host!==undefined&&(project.host===null||typeof project.host!=='object'||Array.isArray(project.host)))throw new Error('工程字段 host 损坏：应为对象');
    if(project.dataModel!==undefined&&(project.dataModel===null||typeof project.dataModel!=='object'||Array.isArray(project.dataModel)))throw new Error('工程字段 dataModel 损坏：应为对象');
    return project;
  }
  function assignmentsFor(dataset){
    return Object.prototype.hasOwnProperty.call(dataset||{},'assignments')
      ? safeArray(dataset.assignments).map(String).map(x=>x.trim()).filter(Boolean)
      : ['*'];
  }
  function normalizePulseMode(value){return String(value||'')==='legacy'?'equal-count':value;}
  function parseNumericText(text){
    const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/),rows=[];let headers=[];
    for(const raw of lines){const line=raw.trim();if(!line)continue;const cells=line.split(/[\t,; ]+/).filter(Boolean);const nums=cells.map(Number);if(nums.length>=1&&nums.every(Number.isFinite)){rows.push(nums);continue;}if(!headers.length)headers=cells;}
    const width=rows.length?Math.max(...rows.map(row=>row.length)):0;if(!width)return {headers:[],rows:[]};if(headers.length!==width)headers=Array.from({length:width},(_,i)=>`Col ${i+1}`);return {headers,rows};
  }
  function pulseTableFromFile(file,index=0){
    const sourcePath=String(file?.path||file?.name||`pulse-${index+1}`),parsed=parseNumericText(file?.text||''),id=stableId('pulse-table',sourcePath),createdAt=file?.importedAt||nowIso();
    const columns=parsed.headers.map((name,col)=>({id:`col:${hashString(`${name}:${col}`)}`,key:`col_${col+1}`,name:String(name||`Col ${col+1}`),unit:'',dtype:'number',role:'',values:parsed.rows.map(row=>Number.isFinite(row[col])?row[col]:null),metadata:{sourceColumn:col+1},length:parsed.rows.length}));
    if(columns.length)columns.push({id:`col:${hashString('sourceLine:index')}`,key:'sourceLine',name:'Source line',unit:'',dtype:'number',role:'index',values:parsed.rows.map((_,row)=>row+1),metadata:{},length:parsed.rows.length});
    return {artifactVersion:2,id,kind:'data.table',name:String(file?.label||file?.name||'pulse-data').replace(/\.[^.]+$/,''),createdAt,updatedAt:createdAt,metadata:{importedSource:true,importerId:'pulse-text',sourceFormat:'pulse-text',dataAssignments:['builtin.pulse-analysis'],excluded:false},tags:[],source:{path:sourcePath,name:String(file?.name||'pulse-data'),encoding:String(file?.encoding||'auto'),...(columns.length?{}:{text:String(file?.text||'')})},provenance:[{id:`prov:${hashString(`pulse:${id}`)}`,timestamp:createdAt,type:'import',label:'Pulse text import',providerId:'pulse-text',pluginId:'builtin.pulse-import',version:'1.18.0',parameters:{},inputs:[sourcePath],outputs:[id],manual:false,note:'',source:{path:sourcePath,name:String(file?.name||'')},environment:{}}],lineage:{parents:[],role:'source',producer:'builtin.pulse-import',operation:'import',parameters:{},metadata:{}},transient:false,semanticType:'science.pulse.trace',schemaVersion:1,rowCount:parsed.rows.length,columns};
  }
  function normalizeTerWorkspace(workspace){const out=clone(workspace||{});if(out?.result&&out.result.terMax!==undefined&&out.result.terMaxByVg===undefined){out.result.terMaxByVg=clone(out.result.terMax);delete out.result.terMax;}return out;}
  function migrateDomainRoots(out){
    const plugins={...(out.plugins||{})};
    const resonanceKeys=['scanVisibility','peaks','peakCategories','algorithms','peakDisplay','activeDetector','activeMetricAlgorithm','detectorSettings','physicsShowLabels','spacingSettings','gateAnalysisSettings','transformPreviewByDataset'];
    if(resonanceKeys.some(key=>out[key]!==undefined)){
      const plugin={...(plugins['builtin.resonance-workbench']||{})};
      const workspace={...(plugin.workspace||{})};
      if(workspace.schema===undefined)workspace.schema=1;
      if(empty(workspace.datasetMeta)&&Array.isArray(out.datasets)&&out.datasets.length)workspace.datasetMeta=out.datasets.map(d=>({path:d.path,name:d.name,vg:d.vg}));
      for(const key of resonanceKeys)if(out[key]!==undefined&&(workspace[key]===undefined||(empty(workspace[key])&&!empty(out[key]))))workspace[key]=clone(out[key]);
      if(workspace.groupColumns===undefined&&out.trendColumns!==undefined){const n=String(out.trendColumns);workspace.groupColumns=['1','2','3','4','5','6'].includes(n)?n:'auto';}
      plugin.workspace=workspace;plugins['builtin.resonance-workbench']=plugin;
    }
    const resonanceWorkspace=plugins['builtin.resonance-workbench']?.workspace;
    if(resonanceWorkspace&&typeof resonanceWorkspace==='object'){delete resonanceWorkspace.legacyVisibilityExplicit;delete resonanceWorkspace.legacyVisibilityDatasetPaths;}
    if(Array.isArray(resonanceWorkspace?.scanVisibility)&&resonanceWorkspace.scanVisibility.length&&Array.isArray(out.datasets)){
      const adopted=new Set(resonanceWorkspace.scanVisibility.map(row=>String(Array.isArray(row)?row[0]:'')));
      out.datasets=out.datasets.map(dataset=>{
        if(Object.prototype.hasOwnProperty.call(dataset||{},'assignments'))return dataset;
        const path=String(dataset?.path||dataset?.name||'');
        return path&&!adopted.has(path)?{...dataset,assignments:[]}:dataset;
      });
    }
    if(['terMaxSettings','terHeatmapDisplay','terTransformSettings','terAlgorithmRef','terMaxResult'].some(key=>out[key]!==undefined)){
      const plugin={...(plugins['builtin.ter-analysis']||{})},workspace={...(plugin.workspace||{})};
      if(workspace.schema===undefined)workspace.schema=3;
      if(workspace.settings===undefined&&out.terMaxSettings!==undefined)workspace.settings=clone(out.terMaxSettings);
      if(workspace.display===undefined&&out.terHeatmapDisplay!==undefined)workspace.display=clone(out.terHeatmapDisplay);
      if(workspace.transform===undefined&&out.terTransformSettings!==undefined)workspace.transform=clone(out.terTransformSettings);
      if(workspace.algorithmRef===undefined){const ref=out.terAlgorithmRef??out.terMaxSettings?.algorithmRef;if(ref!==undefined)workspace.algorithmRef=clone(ref);}
      if(workspace.result===undefined&&out.terMaxResult!==undefined)workspace.result=clone(out.terMaxResult);
      plugin.workspace=workspace;plugins['builtin.ter-analysis']=plugin;
    }
    if(plugins['builtin.ter-analysis']?.workspace)plugins['builtin.ter-analysis']={...plugins['builtin.ter-analysis'],workspace:normalizeTerWorkspace(plugins['builtin.ter-analysis'].workspace)};
    const resonancePlugin=plugins['builtin.resonance-workbench'],terWorkspace=plugins['builtin.ter-analysis']?.workspace;
    if(resonancePlugin?.workspace&&terWorkspace){const gate={...(resonancePlugin.workspace.gateAnalysisSettings||{})};if(gate.terSettings===undefined&&terWorkspace.settings!==undefined)gate.terSettings=clone(terWorkspace.settings);if(gate.terAlgorithmRef===undefined&&terWorkspace.algorithmRef!==undefined)gate.terAlgorithmRef=clone(terWorkspace.algorithmRef);resonancePlugin.workspace={...resonancePlugin.workspace,gateAnalysisSettings:gate};plugins['builtin.resonance-workbench']=resonancePlugin;}
    if(out.pulseAnalysis!==undefined){const plugin={...(plugins['builtin.pulse-analysis']||{})};if(plugin.workspace===undefined)plugin.workspace=clone(out.pulseAnalysis);plugins['builtin.pulse-analysis']=plugin;}
    const host={...(out.host||{})};if(host.panelLayout===undefined&&out.panelLayout!==undefined)host.panelLayout=clone(out.panelLayout);if(host.trendColumns===undefined&&out.trendColumns!==undefined)host.trendColumns=clone(out.trendColumns);out.host=host;out.plugins=plugins;
    for(const key of DOMAIN_ROOT_FIELDS)delete out[key];
    return out;
  }
  function datasetSeries(dataset){
    if(Array.isArray(dataset?.points)&&dataset.points.length)return [clone(dataset)];
    if(typeof dataset?.text!=='string'||!dataset.text.trim())return [];
    const S=science();if(!S?.parseFlexibleData)return [];
    try{
      const file={name:dataset.sourceName||dataset.name||'data',path:dataset.sourcePath||dataset.path||'',text:dataset.text,encoding:dataset.encoding||'auto'};
      const parsed=S.parseFlexibleData(file,dataset.importSpec&&typeof dataset.importSpec==='object'?dataset.importSpec:{});
      const rows=safeArray(parsed?.datasets),single=rows.length===1;
      return rows.map(row=>({...row,name:single&&dataset.name?dataset.name:row.name,path:single&&dataset.path?dataset.path:row.path,importSpec:{...(row.importSpec||{}),...(dataset.importSpec||{})},assignments:assignmentsFor(dataset),excluded:dataset.excluded===true,importedAt:dataset.importedAt||row.importedAt,sourcePath:dataset.sourcePath||dataset.path||row.sourcePath,sourceName:dataset.sourceName||dataset.name||row.sourceName,dataProvenance:safeArray(dataset.dataProvenance)}));
    }catch{return [];}
  }
  function importStep(dataset,id){
    return {id:`prov:${hashString(`import:${id}`)}`,timestamp:dataset.importedAt||nowIso(),type:'import',label:'Import source data',providerId:'flexible-text',pluginId:'builtin.flexible-import',version:'1.18.0',parameters:clone(dataset.importSpec||{}),inputs:[String(dataset.sourcePath||dataset.path||'')],outputs:[id],manual:false,note:'',source:{path:dataset.sourcePath||dataset.path||'',name:dataset.sourceName||dataset.name||''},environment:{}};
  }
  function tableFromDataset(dataset){
    const path=String(dataset?.path||dataset?.name||'dataset'),points=safeArray(dataset?.points),id=stableId('source-table',path),vg=Number.isFinite(Number(dataset?.vg))?Number(dataset.vg):null;
    const createdAt=dataset?.importedAt||nowIso();
    const columns=[
      {id:`col:${hashString('Vd:0')}`,key:'Vd',name:dataset?.importSpec?.xHeader||'Vd',unit:'V',dtype:'number',role:'x',values:points.map(p=>p.v),metadata:{sourceColumn:dataset?.importSpec?.xCol},length:points.length},
      {id:`col:${hashString('Id:1')}`,key:'Id',name:dataset?.importSpec?.yHeader||'Id',unit:'A',dtype:'number',role:'y',values:points.map(p=>p.i),metadata:{sourceColumn:dataset?.importSpec?.yCol},length:points.length},
      {id:`col:${hashString('Vg:2')}`,key:'Vg',name:'Vg',unit:'V',dtype:'number',role:'group',values:points.map(()=>vg===null?null:vg),metadata:{},length:points.length},
      {id:`col:${hashString('sourceLine:3')}`,key:'sourceLine',name:'Source line',unit:'',dtype:'number',role:'index',values:points.map((p,index)=>Number.isFinite(Number(p.sourceLine))?Number(p.sourceLine):index+1),metadata:{},length:points.length}
    ];
    return {artifactVersion:2,id,kind:'data.table',name:String(dataset?.name||dataset?.sourceName||'I-V data'),createdAt,updatedAt:createdAt,metadata:{importedSource:true,importerId:'flexible-text',seriesPath:path,vg,importSpec:clone(dataset?.importSpec||null),dataAssignments:assignmentsFor(dataset),excluded:dataset?.excluded===true},tags:[],source:{path:String(dataset?.sourcePath||dataset?.path||''),name:String(dataset?.sourceName||dataset?.name||''),encoding:String(dataset?.encoding||'')},provenance:[importStep(dataset,id),...safeArray(dataset?.dataProvenance).map(clone)],lineage:{parents:[],role:'source',producer:'builtin.flexible-import',operation:'import',parameters:clone(dataset?.importSpec||{}),metadata:{}},transient:false,semanticType:'science.transport.iv',schemaVersion:1,rowCount:points.length,columns};
  }
  function canonicalizeExistingArtifact(artifact,idMap){
    const out=clone(artifact);if(!out||typeof out!=='object')return out;
    if(out.metadata?.adapter==='legacy-dataset'){
      const oldId=String(out.id||''),path=String(out.metadata?.legacyDatasetPath||out.source?.path||oldId),nextId=stableId('source-table',path);idMap.set(oldId,nextId);out.id=nextId;out.transient=false;out.semanticType=out.semanticType||'science.transport.iv';out.metadata={...(out.metadata||{}),importedSource:true,importerId:'flexible-text',seriesPath:path,excluded:out.metadata?.sourceExcluded===true};delete out.metadata.adapter;delete out.metadata.legacyDatasetPath;delete out.metadata.sourceExcluded;
    }
    return out;
  }
  function materializeDataModel(out){
    const inputArtifacts=safeArray(out.dataModel?.artifacts),idMap=new Map(),existing=inputArtifacts.map(a=>canonicalizeExistingArtifact(a,idMap)).filter(Boolean),byId=new Map(existing.map(a=>[String(a.id),a]));
    for(const source of safeArray(out.datasets))for(const dataset of datasetSeries(source)){
      const table=tableFromDataset(dataset);const oldId=stableId('legacy-table',String(dataset?.path||dataset?.name||'dataset'));idMap.set(oldId,table.id);if(!byId.has(table.id)||byId.get(table.id)?.metadata?.importedSource!==true)byId.set(table.id,table);
    }
    const pulsePlugin=out.plugins?.['builtin.pulse-analysis'];
    if(pulsePlugin?.workspace&&typeof pulsePlugin.workspace==='object'){
      const workspace=clone(pulsePlugin.workspace)||{};workspace.segmentationMode=normalizePulseMode(workspace.segmentationMode);
      if(Array.isArray(workspace.files))workspace.files=workspace.files.map((file,index)=>{const next=clone(file)||{};if(next.settings)next.settings={...next.settings,segmentationMode:normalizePulseMode(next.settings.segmentationMode)};if(next.result)next.result={...next.result,segmentationMode:normalizePulseMode(next.result.segmentationMode)};const mapped=idMap.get(String(next.artifactId||next.id||''));if(mapped){next.artifactId=mapped;next.id=mapped;}else if(!next.artifactId&&typeof next.text==='string'&&next.text.trim()){const artifact=pulseTableFromFile(next,index);byId.set(artifact.id,artifact);next.artifactId=artifact.id;next.id=artifact.id;delete next.text;delete next.encoding;}return next;});
      out.plugins['builtin.pulse-analysis']={...pulsePlugin,workspace};
    }
    const artifacts=[...byId.values()];
    for(const artifact of artifacts){
      if(artifact?.lineage&&Array.isArray(artifact.lineage.parents))artifact.lineage.parents=artifact.lineage.parents.map(id=>idMap.get(String(id))||String(id));
      for(const step of safeArray(artifact?.provenance)){if(Array.isArray(step.inputs))step.inputs=step.inputs.map(id=>idMap.get(String(id))||String(id));if(Array.isArray(step.outputs))step.outputs=step.outputs.map(id=>idMap.get(String(id))||String(id));}
    }
    out.dataModel={schema:STORE_SCHEMA,artifacts};delete out.datasets;return out;
  }
  function canonicalize(project){
    validateRaw(project);let out=clone(project)||{};
    const pulseLegacy=JSON.stringify(out).includes('\"segmentationMode\":\"legacy\"'),legacyArtifacts=safeArray(out.dataModel?.artifacts).some(a=>a?.metadata?.adapter==='legacy-dataset'||a?.metadata?.legacyDatasetPath!==undefined),terLegacy=out.plugins?.['builtin.ter-analysis']?.workspace?.result?.terMax!==undefined;
    const alreadyModern=String(out.format||'')===FORMAT&&Number(out.schemaVersion||0)>=SCHEMA_VERSION&&!Object.prototype.hasOwnProperty.call(out,'datasets')&&!DOMAIN_ROOT_FIELDS.some(key=>Object.prototype.hasOwnProperty.call(out,key))&&!pulseLegacy&&!legacyArtifacts&&!terLegacy;
    if(!alreadyModern){out=migrateDomainRoots(out);out=materializeDataModel(out);}else out.dataModel={schema:STORE_SCHEMA,artifacts:safeArray(out.dataModel?.artifacts).map(clone)};
    out.format=FORMAT;out.schemaVersion=SCHEMA_VERSION;out.plugins={...(out.plugins||{})};out.host={...(out.host||{})};delete out.datasets;for(const key of DOMAIN_ROOT_FIELDS)delete out[key];
    return validateCanonical(out);
  }
  function validateCanonical(project){
    validateRaw(project);if(String(project.format||'')!==FORMAT)throw new Error('工程格式标识无效');if(Number(project.schemaVersion)!==SCHEMA_VERSION)throw new Error(`工程 Schema 必须为 ${SCHEMA_VERSION}`);if(Object.prototype.hasOwnProperty.call(project,'datasets'))throw new Error('Schema v3 不允许 datasets 双轨数据字段');if(!project.dataModel||!Array.isArray(project.dataModel.artifacts))throw new Error('Schema v3 工程缺少 canonical dataModel.artifacts');return project;
  }
  function isHistorical(project){
    if(!project||typeof project!=='object'||Array.isArray(project))return false;
    const hasDomainRoots=DOMAIN_ROOT_FIELDS.some(key=>Object.prototype.hasOwnProperty.call(project,key)),hasDatasets=Object.prototype.hasOwnProperty.call(project,'datasets'),pulseLegacy=JSON.stringify(project).includes('\"segmentationMode\":\"legacy\"'),legacyArtifacts=safeArray(project.dataModel?.artifacts).some(a=>a?.metadata?.adapter==='legacy-dataset'||a?.metadata?.legacyDatasetPath!==undefined),terLegacy=project.plugins?.['builtin.ter-analysis']?.workspace?.result?.terMax!==undefined;
    if(String(project.format||'')===FORMAT){return Number(project.schemaVersion)!==SCHEMA_VERSION||hasDatasets||hasDomainRoots||pulseLegacy||legacyArtifacts||terLegacy;}
    return Array.isArray(project.datasets)&&(project.schemaVersion!==undefined||project.plugins!==undefined||project.host!==undefined||typeof project.format==='string');
  }
  function register(format){if(format?.registerCompatibilityImporter)format.registerCompatibilityImporter('project-v1-v2',{recognize:isHistorical,convert:canonicalize});return format;}
  return Object.freeze({FORMAT,SCHEMA_VERSION,STORE_SCHEMA,DOMAIN_ROOT_FIELDS,isHistorical,validateRaw,validateCanonical,canonicalize,stableId,register});
});
