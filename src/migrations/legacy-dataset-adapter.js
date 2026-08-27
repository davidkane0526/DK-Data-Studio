(() => {
  const D=window.DKDSData;
  if(!D||D.legacyDatasetsFromArtifacts)return;
  const safeArray=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  const clone=value=>D.deepClone(value);
  function fromLegacyDataset(ds){
    const path=String(ds?.path||ds?.name||'dataset');
    const points=safeArray(ds?.points);
    const assignments=Object.prototype.hasOwnProperty.call(ds||{},'assignments')?safeArray(ds?.assignments).map(String).map(x=>x.trim()).filter(Boolean):['*'];
    const table=D.createTable({
      id:D.stableId('legacy-table',path),name:String(ds?.name||'I-V data'),semanticType:'science.transport.iv',createdAt:ds?.importedAt||undefined,
      updatedAt:safeArray(ds?.dataProvenance).at(-1)?.timestamp||ds?.importedAt||undefined,transient:true,
      metadata:{adapter:'legacy-dataset',legacyDatasetPath:path,vg:Number.isFinite(ds?.vg)?ds.vg:null,importSpec:clone(ds?.importSpec||null),sourceExcluded:ds?.excluded===true,dataAssignments:assignments},
      source:{path:ds?.sourcePath||ds?.path||'',name:ds?.sourceName||ds?.name||'',encoding:ds?.encoding||''},
      columns:[
        {key:'Vd',name:ds?.importSpec?.xHeader||'Vd',unit:'V',role:'x',values:points.map(p=>p.v),metadata:{sourceColumn:ds?.importSpec?.xCol}},
        {key:'Id',name:ds?.importSpec?.yHeader||'Id',unit:'A',role:'y',values:points.map(p=>p.i),metadata:{sourceColumn:ds?.importSpec?.yCol}},
        {key:'Vg',name:'Vg',unit:'V',role:'group',values:points.map(()=>Number.isFinite(ds?.vg)?ds.vg:NaN)},
        {key:'sourceLine',name:'Source line',unit:'',role:'index',values:points.map(p=>Number(p.sourceLine)||NaN)}
      ]
    });
    table.provenance=[D.provenanceStep({timestamp:ds?.importedAt||undefined,type:'import',label:'Import source data',providerId:'flexible-text',pluginId:'builtin.flexible-import',version:'1.x',parameters:clone(ds?.importSpec||{}),inputs:[String(ds?.sourcePath||ds?.path||'')],outputs:[table.id],source:{path:ds?.sourcePath||ds?.path||'',name:ds?.sourceName||ds?.name||''}}),...safeArray(ds?.dataProvenance).map(p=>D.provenanceStep(p))];
    return table;
  }
  function syncLegacyDatasetArtifacts(store,datasets,{prune=true}={}){
    if(!store?.upsert)return store;const rows=safeArray(datasets),live=new Set(rows.map(d=>String(d?.path||d?.name||'dataset')));
    if(prune&&store.list&&store.remove)for(const artifact of store.list({includeTransient:true}))if(artifact?.transient&&artifact.metadata?.adapter==='legacy-dataset'&&!live.has(String(artifact.metadata?.legacyDatasetPath||'')))store.remove(artifact.id);
    for(const dataset of rows)store.upsert(fromLegacyDataset(dataset));return store;
  }
  function toLegacyDataset(artifact){
    const table=D.rehydrateArtifact(artifact);if(!table||table.kind!=='data.table'||table.metadata?.adapter!=='legacy-dataset')return null;
    const x=D.column(table,'Vd')||table.columns?.find(c=>c.role==='x')||table.columns?.[0],y=D.column(table,'Id')||table.columns?.find(c=>c.role==='y')||table.columns?.[1];if(!x||!y)return null;
    const vgColumn=D.column(table,'Vg')||table.columns?.find(c=>c.role==='group'),sourceLineColumn=D.column(table,'sourceLine')||table.columns?.find(c=>c.role==='index');
    const length=Math.min(safeArray(x.values).length,safeArray(y.values).length),vgRaw=table.metadata?.vg,vgMeta=vgRaw!==null&&vgRaw!==undefined&&String(vgRaw).trim()!==''&&Number.isFinite(Number(vgRaw))?Number(vgRaw):NaN,vgValues=safeArray(vgColumn?.values).map(Number).filter(Number.isFinite),vg=Number.isFinite(vgMeta)?vgMeta:(vgValues.length?vgValues[0]:null),path=String(table.metadata?.legacyDatasetPath||table.source?.path||table.id),importSpec=clone(table.metadata?.importSpec||null),points=[];
    for(let index=0;index<length;index++){const v=Number(x.values[index]),i=Number(y.values[index]);if(!Number.isFinite(v)||!Number.isFinite(i))continue;const sourceLine=Number(sourceLineColumn?.values?.[index]);points.push({v,i,index,sourceLine:Number.isFinite(sourceLine)?sourceLine:index+1});}
    return {path,name:String(table.name||table.source?.name||'I-V data'),sourcePath:String(table.source?.path||path),sourceName:String(table.source?.name||table.name||''),encoding:String(table.source?.encoding||''),vg:Number.isFinite(vg)?vg:null,points,importSpec,assignments:safeArray(table.metadata?.dataAssignments).map(String).filter(Boolean),excluded:table.metadata?.sourceExcluded===true,importedAt:table.createdAt||undefined,dataProvenance:safeArray(table.provenance).slice(1).map(clone)};
  }
  const legacyDatasetsFromArtifacts=artifacts=>safeArray(artifacts).map(toLegacyDataset).filter(Boolean);
  function removeLegacyDatasets(store,datasets,refs=[]){
    const requests=safeArray(refs).map(ref=>ref&&typeof ref==='object'?{path:String(ref.path||''),sourcePath:String(ref.sourcePath||'')}:{path:String(ref||''),sourcePath:''}).filter(ref=>ref.path||ref.sourcePath);
    if(!requests.length)return {datasets:safeArray(datasets).map(clone),removed:[],removedArtifactIds:[]};
    const removed=[],remaining=[];for(const dataset of safeArray(datasets)){const path=String(dataset?.path||dataset?.name||''),sourcePath=String(dataset?.sourcePath||'');const match=requests.some(ref=>(ref.path&&ref.path===path)||(ref.sourcePath&&ref.sourcePath===sourcePath));(match?removed:remaining).push(clone(dataset));}
    const removedPaths=new Set(removed.map(dataset=>String(dataset?.path||dataset?.name||''))),roots=(store?.list?.({includeTransient:true})||[]).filter(artifact=>artifact?.metadata?.adapter==='legacy-dataset'&&removedPaths.has(String(artifact.metadata?.legacyDatasetPath||''))),removeIds=new Set();
    for(const root of roots){for(const row of (store?.lineage?.(root.id)?.descendants||[]))if(row?.id)removeIds.add(String(row.id));if(root?.id)removeIds.add(String(root.id));}
    if(store?.batch)store.batch(api=>{for(const id of removeIds)api.remove?.(id);});else for(const id of removeIds)store?.remove?.(id);
    syncLegacyDatasetArtifacts(store,remaining);return {datasets:remaining,removed,removedArtifactIds:[...removeIds]};
  }
  Object.assign(D,{fromLegacyDataset,syncLegacyDatasetArtifacts,toLegacyDataset,legacyDatasetsFromArtifacts,removeLegacyDatasets});
  window.DKDSLegacyDatasetMigration=Object.freeze({fromLegacyDataset,syncLegacyDatasetArtifacts,toLegacyDataset,legacyDatasetsFromArtifacts,removeLegacyDatasets});
})();
