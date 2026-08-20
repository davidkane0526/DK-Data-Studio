(() => {
  const ARTIFACT_VERSION=2;
  const STORE_VERSION=2;

  function nowIso(){ return new Date().toISOString(); }
  function deepClone(value){
    if(value===undefined)return undefined;
    if(typeof structuredClone==='function'){
      try{return structuredClone(value);}catch{}
    }
    return JSON.parse(JSON.stringify(value));
  }
  function hashString(value){
    const text=String(value??'');
    let h=2166136261;
    for(let i=0;i<text.length;i++){
      h^=text.charCodeAt(i);
      h=Math.imul(h,16777619);
    }
    return (h>>>0).toString(36);
  }
  function makeId(prefix='artifact'){
    if(globalThis.crypto?.randomUUID)return `${prefix}:${crypto.randomUUID()}`;
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,10)}`;
  }
  function stableId(prefix,value){ return `${prefix}:${hashString(value)}`; }
  function safeArray(v){ return Array.isArray(v)?v:[]; }
  function normalizeMetadata(v){ return v&&typeof v==='object'&&!Array.isArray(v)?deepClone(v):{}; }

  function normalizeLineage(spec={}){
    const source=spec&&typeof spec==='object'?spec:{};
    const parents=[...new Set([...(Array.isArray(source.parents)?source.parents:[]),source.parentId,source.parent].filter(Boolean).map(String))];
    return {parents,role:String(source.role||''),producer:String(source.producer||source.providerId||''),operation:String(source.operation||source.type||''),parameters:normalizeMetadata(source.parameters),metadata:normalizeMetadata(source.metadata)};
  }
  function canonicalize(value){
    if(value===null||value===undefined)return value;
    if(Array.isArray(value))return value.map(canonicalize);
    if(typeof value==='object'){const out={};for(const key of Object.keys(value).sort()){if(['createdAt','updatedAt'].includes(key))continue;out[key]=canonicalize(value[key]);}return out;}
    if(typeof value==='number'&&Number.isNaN(value))return null;
    return value;
  }
  function fingerprintArtifact(value){return hashString(JSON.stringify(canonicalize(value)));}

  function provenanceStep(spec={}){
    return {
      id:spec.id||makeId('prov'),
      timestamp:spec.timestamp||nowIso(),
      type:spec.type||'process',
      label:spec.label||spec.type||'process',
      providerId:spec.providerId||'',
      pluginId:spec.pluginId||'',
      version:spec.version||'',
      parameters:normalizeMetadata(spec.parameters),
      inputs:safeArray(spec.inputs).map(String),
      outputs:safeArray(spec.outputs).map(String),
      manual:!!spec.manual,
      note:String(spec.note||''),
      source:normalizeMetadata(spec.source),
      environment:normalizeMetadata(spec.environment)
    };
  }

  function envelope(kind,spec={}){
    return {
      artifactVersion:ARTIFACT_VERSION,
      id:spec.id||makeId(kind.replace(/[^a-z0-9]+/gi,'-')),
      kind,
      name:String(spec.name||kind),
      createdAt:spec.createdAt||nowIso(),
      updatedAt:spec.updatedAt||nowIso(),
      metadata:normalizeMetadata(spec.metadata),
      tags:safeArray(spec.tags).map(String),
      source:normalizeMetadata(spec.source),
      provenance:safeArray(spec.provenance).map(p=>provenanceStep(p)),
      lineage:normalizeLineage(spec.lineage||{parents:spec.parents,parentId:spec.parentId,parent:spec.parent,role:spec.role,producer:spec.producer,operation:spec.operation,parameters:spec.parameters}),
      transient:!!spec.transient
    };
  }

  function normalizeColumn(column,index,rowCountHint=0){
    const values=safeArray(column?.values).map(v=>v===null?NaN:v);
    const name=String(column?.name||column?.key||`Column ${index+1}`);
    const key=String(column?.key||name).trim()||`col_${index+1}`;
    return {
      id:String(column?.id||`col:${hashString(`${key}:${index}`)}`),
      key,
      name,
      unit:String(column?.unit||''),
      dtype:String(column?.dtype||'number'),
      role:String(column?.role||''),
      values,
      metadata:normalizeMetadata(column?.metadata),
      length:values.length||Number(rowCountHint)||0
    };
  }

  function createTable(spec={}){
    const cols=safeArray(spec.columns).map((c,i)=>normalizeColumn(c,i));
    const rowCount=cols.length?Math.max(...cols.map(c=>c.values.length)):Math.max(0,Number(spec.rowCount)||0);
    for(const c of cols){
      if(c.values.length<rowCount)c.values=c.values.concat(new Array(rowCount-c.values.length).fill(NaN));
      c.length=rowCount;
    }
    return {
      ...envelope('data.table',spec),
      schemaVersion:1,
      rowCount,
      columns:cols
    };
  }

  function createSeries(spec={}){
    const x=safeArray(spec.x),y=safeArray(spec.y);
    const n=Math.min(x.length,y.length);
    return {
      ...envelope('data.series',spec),
      schemaVersion:1,
      x:x.slice(0,n),y:y.slice(0,n),
      xName:String(spec.xName||'x'),yName:String(spec.yName||'y'),
      xUnit:String(spec.xUnit||''),yUnit:String(spec.yUnit||''),
      length:n
    };
  }

  function createSweep(spec={}){
    const series=createSeries(spec);
    return {...series,kind:'data.sweep',direction:Number(spec.direction)||0,scanAxis:String(spec.scanAxis||series.xName)};
  }


  function createTransform(spec={}){
    const series=createSeries(spec);
    return {...series,kind:'data.transform',transform:String(spec.transform||spec.operation||''),parameters:normalizeMetadata(spec.parameters),inputKind:String(spec.inputKind||''),lineage:normalizeLineage(spec.lineage||{parents:spec.parents||spec.parentId,role:'transform',producer:spec.producer,operation:spec.transform||spec.operation,parameters:spec.parameters})};
  }

  function createMatrix(spec={}){
    const x=safeArray(spec.x),y=safeArray(spec.y),z=safeArray(spec.z).map(row=>safeArray(row));
    return {...envelope('result.matrix',spec),schemaVersion:1,x,y,z,xName:String(spec.xName||'x'),yName:String(spec.yName||'y'),valueName:String(spec.valueName||'value'),xUnit:String(spec.xUnit||''),yUnit:String(spec.yUnit||''),valueUnit:String(spec.valueUnit||''),parameters:normalizeMetadata(spec.parameters)};
  }

  function createEventSeries(spec={}){
    return {
      ...envelope('data.events',spec),schemaVersion:1,
      events:safeArray(spec.events).map((e,i)=>({id:e?.id||`event-${i+1}`,...deepClone(e)}))
    };
  }

  function createPeakSet(spec={}){
    return {
      ...envelope('result.peaks',spec),schemaVersion:1,
      peaks:safeArray(spec.peaks).map((p,i)=>({id:p?.id||`peak-${i+1}`,...deepClone(p)}))
    };
  }

  function createFitResult(spec={}){
    return {...envelope('result.fit',spec),schemaVersion:1,model:String(spec.model||''),parameters:normalizeMetadata(spec.parameters),statistics:normalizeMetadata(spec.statistics),series:deepClone(spec.series||null)};
  }

  function createAnalysisResult(spec={}){
    return {...envelope('result.analysis',spec),schemaVersion:1,summary:normalizeMetadata(spec.summary),tables:safeArray(spec.tables).map(deepClone),payload:deepClone(spec.payload??null)};
  }

  function createAnnotation(spec={}){
    return {...envelope('annotation',spec),schemaVersion:1,targetId:String(spec.targetId||''),annotationType:String(spec.annotationType||'note'),payload:deepClone(spec.payload??null)};
  }

  function createImageData(spec={}){
    return {...envelope('data.image',spec),schemaVersion:1,width:Number(spec.width)||0,height:Number(spec.height)||0,channels:Number(spec.channels)||1,unit:String(spec.unit||''),data:deepClone(spec.data||null)};
  }

  function isArtifact(value){ return !!value&&typeof value==='object'&&typeof value.id==='string'&&typeof value.kind==='string'; }
  function validateArtifact(a){
    const errors=[];
    if(!isArtifact(a))errors.push('Artifact requires string id and kind.');
    if(a?.kind==='data.table'){
      if(!Array.isArray(a.columns))errors.push('DataTable.columns must be an array.');
      else{
        const names=new Set();
        for(const c of a.columns){
          if(!c?.key)errors.push('Every DataTable column requires key.');
          if(names.has(c?.key))errors.push(`Duplicate column key: ${c?.key}`);
          names.add(c?.key);
          if(!Array.isArray(c?.values))errors.push(`Column ${c?.key||'?'} values must be an array.`);
        }
      }
    }
    return {ok:!errors.length,errors};
  }

  function column(table,ref){
    if(!table||table.kind!=='data.table')return null;
    if(typeof ref==='number')return table.columns[ref]||null;
    const target=String(ref??'');
    return table.columns.find(c=>c.id===target||c.key===target||c.name===target)||null;
  }

  function columnValues(table,ref){ return column(table,ref)?.values||[]; }

  function rows(table,{start=0,limit=Infinity}={}){
    if(table?.kind!=='data.table')return [];
    const out=[];
    const end=Math.min(table.rowCount,start+limit);
    for(let r=Math.max(0,start);r<end;r++){
      const row={};
      for(const c of table.columns)row[c.key]=c.values[r];
      out.push(row);
    }
    return out;
  }

  function withProvenance(artifact,step){
    const out=deepClone(artifact);
    out.updatedAt=nowIso();
    out.provenance=safeArray(out.provenance);
    out.provenance.push(provenanceStep({...step,outputs:[...(step?.outputs||[]),out.id]}));
    return out;
  }

  function derive(parent,spec={},step={}){
    const out=deepClone(parent);
    out.id=spec.id||makeId(parent.kind.replace(/[^a-z0-9]+/gi,'-'));
    out.name=String(spec.name||parent.name);
    out.createdAt=nowIso();out.updatedAt=out.createdAt;
    out.transient=!!spec.transient;
    if(spec.metadata)out.metadata={...normalizeMetadata(parent.metadata),...normalizeMetadata(spec.metadata)};
    Object.assign(out,deepClone(spec.patch||{}));
    out.provenance=safeArray(parent.provenance).map(provenanceStep);
    out.provenance.push(provenanceStep({...step,inputs:[...(step.inputs||[]),parent.id],outputs:[out.id]}));
    out.lineage=normalizeLineage(spec.lineage||{parents:[parent.id,...safeArray(step.inputs)],role:spec.role||step.role||'derived',producer:step.providerId||step.pluginId||'',operation:step.type||'derive',parameters:step.parameters});
    return out;
  }

  function fromLegacyDataset(ds){
    const path=String(ds?.path||ds?.name||'dataset');
    const points=safeArray(ds?.points);
    const table=createTable({
      id:stableId('legacy-table',path),
      name:String(ds?.name||'I-V data'),
      createdAt:ds?.importedAt||undefined,
      updatedAt:safeArray(ds?.dataProvenance).at(-1)?.timestamp||ds?.importedAt||undefined,
      transient:true,
      metadata:{
        adapter:'legacy-dataset',legacyDatasetPath:path,vg:Number.isFinite(ds?.vg)?ds.vg:null,
        importSpec:deepClone(ds?.importSpec||null)
      },
      source:{path:ds?.sourcePath||ds?.path||'',name:ds?.sourceName||ds?.name||'',encoding:ds?.encoding||''},
      columns:[
        {key:'Vd',name:ds?.importSpec?.xHeader||'Vd',unit:'V',role:'x',values:points.map(p=>p.v),metadata:{sourceColumn:ds?.importSpec?.xCol}},
        {key:'Id',name:ds?.importSpec?.yHeader||'Id',unit:'A',role:'y',values:points.map(p=>p.i),metadata:{sourceColumn:ds?.importSpec?.yCol}},
        {key:'Vg',name:'Vg',unit:'V',role:'group',values:points.map(()=>Number.isFinite(ds?.vg)?ds.vg:NaN)},
        {key:'sourceLine',name:'Source line',unit:'',role:'index',values:points.map(p=>Number(p.sourceLine)||NaN)}
      ]
    });
    table.provenance=[provenanceStep({
      timestamp:ds?.importedAt||undefined,
      type:'import',label:'Import source data',providerId:'flexible-text',pluginId:'builtin.flexible-import',version:'1.x',
      parameters:deepClone(ds?.importSpec||{}),inputs:[String(ds?.sourcePath||ds?.path||'')],outputs:[table.id],
      source:{path:ds?.sourcePath||ds?.path||'',name:ds?.sourceName||ds?.name||''}
    }),...safeArray(ds?.dataProvenance).map(p=>provenanceStep(p))];
    return table;
  }

  function syncLegacyDatasetArtifacts(store,datasets,{prune=true}={}){
    if(!store?.upsert)return store;
    const rows=safeArray(datasets);
    const live=new Set(rows.map(d=>String(d?.path||d?.name||'dataset')));
    if(prune&&store.list&&store.remove){
      for(const artifact of store.list({includeTransient:true})){
        if(artifact?.transient&&artifact.metadata?.adapter==='legacy-dataset'&&!live.has(String(artifact.metadata?.legacyDatasetPath||'')))store.remove(artifact.id);
      }
    }
    for(const dataset of rows)store.upsert(fromLegacyDataset(dataset));
    return store;
  }

  function toLegacyDataset(artifact){
    const table=rehydrateArtifact(artifact);
    if(!table||table.kind!=='data.table'||table.metadata?.adapter!=='legacy-dataset')return null;
    const x=column(table,'Vd')||table.columns?.find(c=>c.role==='x')||table.columns?.[0];
    const y=column(table,'Id')||table.columns?.find(c=>c.role==='y')||table.columns?.[1];
    if(!x||!y)return null;
    const vgColumn=column(table,'Vg')||table.columns?.find(c=>c.role==='group');
    const sourceLineColumn=column(table,'sourceLine')||table.columns?.find(c=>c.role==='index');
    const length=Math.min(safeArray(x.values).length,safeArray(y.values).length);
    const vgRaw=table.metadata?.vg;
    const vgMeta=vgRaw!==null&&vgRaw!==undefined&&String(vgRaw).trim()!==''&&Number.isFinite(Number(vgRaw))?Number(vgRaw):NaN;
    const vgValues=safeArray(vgColumn?.values).map(Number).filter(Number.isFinite);
    const vg=Number.isFinite(vgMeta)?vgMeta:(vgValues.length?vgValues[0]:null);
    const path=String(table.metadata?.legacyDatasetPath||table.source?.path||table.id);
    const importSpec=deepClone(table.metadata?.importSpec||null);
    const points=[];
    for(let index=0;index<length;index++){
      const v=Number(x.values[index]),i=Number(y.values[index]);
      if(!Number.isFinite(v)||!Number.isFinite(i))continue;
      const sourceLine=Number(sourceLineColumn?.values?.[index]);
      points.push({v,i,index,sourceLine:Number.isFinite(sourceLine)?sourceLine:index+1});
    }
    return {
      path,
      name:String(table.name||table.source?.name||'I-V data'),
      sourcePath:String(table.source?.path||path),
      sourceName:String(table.source?.name||table.name||''),
      encoding:String(table.source?.encoding||''),
      vg:Number.isFinite(vg)?vg:null,
      points,
      importSpec,
      importedAt:table.createdAt||undefined,
      dataProvenance:safeArray(table.provenance).slice(1).map(deepClone)
    };
  }

  function legacyDatasetsFromArtifacts(artifacts){
    return safeArray(artifacts).map(toLegacyDataset).filter(Boolean);
  }

  function summarize(a){
    if(!a)return null;
    if(a.kind==='data.table')return {id:a.id,kind:a.kind,name:a.name,rows:a.rowCount,columns:a.columns.length,provenance:a.provenance?.length||0};
    if(a.kind==='data.series'||a.kind==='data.sweep')return {id:a.id,kind:a.kind,name:a.name,length:a.length,provenance:a.provenance?.length||0};
    return {id:a.id,kind:a.kind,name:a.name,provenance:a.provenance?.length||0};
  }

  function rehydrateArtifact(artifact){
    if(!artifact||typeof artifact!=='object')return artifact;
    if(artifact.kind==='data.table')return createTable({...artifact,columns:safeArray(artifact.columns).map(c=>({...c,values:safeArray(c.values).map(v=>v===null?NaN:v)}))});
    if(artifact.kind==='data.series')return createSeries({...artifact,x:safeArray(artifact.x).map(v=>v===null?NaN:v),y:safeArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='data.sweep')return createSweep({...artifact,x:safeArray(artifact.x).map(v=>v===null?NaN:v),y:safeArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='data.transform')return createTransform({...artifact,x:safeArray(artifact.x).map(v=>v===null?NaN:v),y:safeArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='result.matrix')return createMatrix({...artifact,x:safeArray(artifact.x).map(v=>v===null?NaN:v),y:safeArray(artifact.y).map(v=>v===null?NaN:v),z:safeArray(artifact.z).map(row=>safeArray(row).map(v=>v===null?NaN:v))});
    const out=deepClone(artifact);out.lineage=normalizeLineage(out.lineage||{parents:out.parents||out.parentId});return out;
  }

  function createStore(initial=[]){
    const map=new Map();
    const listeners=new Set();
    const childrenIndex=new Map();
    let batchDepth=0,batchEvents=[];
    function rebuildRelations(){childrenIndex.clear();for(const artifact of map.values())for(const parent of artifact?.lineage?.parents||[]){if(!childrenIndex.has(parent))childrenIndex.set(parent,new Set());childrenIndex.get(parent).add(artifact.id);}}
    function emit(type,artifact,extra={}){const event={type,artifact:artifact?deepClone(artifact):null,...extra};if(batchDepth){batchEvents.push(event);return;}for(const fn of listeners){try{fn(event);}catch(err){console.error(err);}}}
    function begin(){batchDepth++;return()=>endBatch();}
    function endBatch(){if(batchDepth>0)batchDepth--;if(!batchDepth&&batchEvents.length){const events=batchEvents.splice(0);for(const fn of listeners){try{fn({type:'batch',events});}catch(err){console.error(err);}}}}
    function lineage(id){const root=String(id||''),ancestors=[],descendants=[],seenUp=new Set(),seenDown=new Set(),up=[...(map.get(root)?.lineage?.parents||[])],down=[...(childrenIndex.get(root)||[])];while(up.length){const cur=up.shift();if(!cur||seenUp.has(cur))continue;seenUp.add(cur);const row=map.get(cur);if(row){ancestors.push(deepClone(row));up.push(...(row.lineage?.parents||[]));}}while(down.length){const cur=down.shift();if(!cur||seenDown.has(cur))continue;seenDown.add(cur);const row=map.get(cur);if(row){descendants.push(deepClone(row));down.push(...(childrenIndex.get(cur)||[]));}}return {id:root,artifact:map.has(root)?deepClone(map.get(root)):null,parents:(map.get(root)?.lineage?.parents||[]).map(id=>map.get(id)?deepClone(map.get(id)):null).filter(Boolean),children:[...(childrenIndex.get(root)||[])].map(id=>map.get(id)?deepClone(map.get(id)):null).filter(Boolean),ancestors,descendants};}
    const api={
      version:STORE_VERSION,
      add(artifact,{replace=false}={}){
        const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));
        const existed=map.has(hydrated.id);if(existed&&!replace)throw new Error(`Artifact already exists: ${hydrated.id}`);
        map.set(hydrated.id,deepClone(hydrated));rebuildRelations();emit(existed?'upsert':'add',hydrated);return hydrated.id;
      },
      upsert(artifact){const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));map.set(hydrated.id,deepClone(hydrated));rebuildRelations();emit('upsert',hydrated);return hydrated.id;},
      publish(artifact,{dedupe=true}={}){const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));const previous=map.get(hydrated.id);if(dedupe&&previous&&fingerprintArtifact(previous)===fingerprintArtifact(hydrated))return {id:hydrated.id,changed:false,artifact:deepClone(previous)};map.set(hydrated.id,deepClone(hydrated));rebuildRelations();emit(previous?'upsert':'add',hydrated,{published:true});return {id:hydrated.id,changed:true,artifact:deepClone(hydrated)};},
      batch(fn){const done=begin();try{return fn?.(api);}finally{done();}},
      get(id){const a=map.get(String(id));return a?deepClone(a):null;},
      getMutable(id){return map.get(String(id))||null;},
      has(id){return map.has(String(id));},
      list({kind=null,includeTransient=true,parent=null}={}){return [...map.values()].filter(a=>(!kind||a.kind===kind)&&(includeTransient||!a.transient)&&(!parent||(a.lineage?.parents||[]).includes(String(parent)))).map(deepClone);},
      parents(id){return (map.get(String(id))?.lineage?.parents||[]).map(key=>map.get(key)?deepClone(map.get(key)):null).filter(Boolean);},
      children(id){return [...(childrenIndex.get(String(id))||[])].map(key=>map.get(key)?deepClone(map.get(key)):null).filter(Boolean);},
      lineage,
      remove(id){const a=map.get(String(id));const ok=map.delete(String(id));if(ok){rebuildRelations();emit('remove',a);}return ok;},
      clear({includeTransient=true}={}){const removed=[];for(const [id,a] of [...map])if(includeTransient||!a.transient){map.delete(id);removed.push(a);}rebuildRelations();if(removed.length){if(removed.length===1)emit('remove',removed[0]);else emit('clear',null,{ids:removed.map(a=>a.id)});}},
      onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
      size(){return map.size;},
      fingerprint:id=>{const a=map.get(String(id));return a?fingerprintArtifact(a):'';}
    };
    api.batch(()=>{for(const a of safeArray(initial))api.upsert(a);});
    return api;
  }

  function serializeStore(store,{includeTransient=false}={}){
    const artifacts=store?.list?store.list({includeTransient}):safeArray(store?.artifacts).filter(a=>includeTransient||!a.transient);
    return {schema:STORE_VERSION,artifacts:artifacts.map(deepClone)};
  }
  function restoreStore(data){ return createStore(safeArray(data?.artifacts)); }

  window.DKDSData={
    ARTIFACT_VERSION,STORE_VERSION,nowIso,deepClone,hashString,makeId,stableId,
    provenanceStep,normalizeLineage,fingerprintArtifact,createTable,createSeries,createSweep,createTransform,createMatrix,createEventSeries,createPeakSet,
    createFitResult,createAnalysisResult,createAnnotation,createImageData,isArtifact,validateArtifact,
    column,columnValues,rows,withProvenance,derive,fromLegacyDataset,syncLegacyDatasetArtifacts,toLegacyDataset,legacyDatasetsFromArtifacts,summarize,
    rehydrateArtifact,createStore,serializeStore,restoreStore
  };
})();
