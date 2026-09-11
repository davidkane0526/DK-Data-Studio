(() => {
  const ARTIFACT_VERSION=2;
  const STORE_VERSION=2;
  const COLUMN_BUFFER_VERSION=1;
  const COLUMN_RANGE_VERSION=1;
  const MAX_COLUMN_RANGE_VALUES=65536;
  const COLUMN_BUFFER_DTYPES=Object.freeze(['number','float64','float32','int32','uint32','int16','uint16','int8','uint8']);
  const COLUMN_BUFFER_RANGES=Object.freeze({int32:[-2147483648,2147483647],uint32:[0,4294967295],int16:[-32768,32767],uint16:[0,65535],int8:[-128,127],uint8:[0,255]});

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
  function isTypedSequence(v){ return typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(v)&&!(v instanceof DataView)&&typeof v.length==='number'; }
  function sequenceArray(v){
    if(Array.isArray(v))return v.map(item=>item&&typeof item==='object'?deepClone(item):item);
    if(isTypedSequence(v))return Array.from(v);
    return [];
  }
  function dataArray(v){
    if(Array.isArray(v))return v;
    if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(v)&&typeof v.length==='number'){
      const values=Array.from(v);
      if(values.some(value=>typeof value==='bigint'))throw new TypeError('BigInt TypedArrays are not supported by the serializable Artifact contract.');
      return values;
    }
    return [];
  }
  function normalizeMetadata(v){ return v&&typeof v==='object'&&!Array.isArray(v)?deepClone(v):{}; }
  function normalizeColumnBufferDtype(dtype){const kind=String(dtype||'').trim().toLowerCase();if(!COLUMN_BUFFER_DTYPES.includes(kind))throw new TypeError(`Unsupported Column Buffer dtype: ${dtype||'(empty)'}.`);return kind;}
  function validateColumnBufferValues(dtype,values){
    const kind=normalizeColumnBufferDtype(dtype);
    for(let index=0;index<values.length;index++){
      const value=values[index];
      if(typeof value!=='number'||(!Number.isFinite(value)&&!Number.isNaN(value)))throw new TypeError(`Column Buffer ${kind} value at ${index} must be a finite number or NaN.`);
      if(Number.isNaN(value))continue;
      if(kind==='float32'&&!Object.is(Math.fround(value),value))throw new RangeError(`Column Buffer float32 value at ${index} is not exactly representable.`);
      const range=COLUMN_BUFFER_RANGES[kind];
      if(range&&(!Number.isInteger(value)||value<range[0]||value>range[1]))throw new RangeError(`Column Buffer ${kind} value at ${index} is outside its exact integer range.`);
    }
    return kind;
  }

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
  function isCanonicalArrayIndex(key){
    const number=Number(key);return Number.isInteger(number)&&number>=0&&number<4294967295&&String(number)===key;
  }
  function canonicalObjectKeys(value){
    const keys=Object.keys(value).filter(key=>!['createdAt','updatedAt'].includes(key)).sort(),indices=[],names=[];
    for(const key of keys)(isCanonicalArrayIndex(key)?indices:names).push(key);
    indices.sort((left,right)=>Number(left)-Number(right));return indices.concat(names);
  }
  function fingerprintArtifact(value){
    let hash=2166136261,buffer='';
    const stack=new Set();
    const hashText=text=>{for(let index=0;index<text.length;index++){hash^=text.charCodeAt(index);hash=Math.imul(hash,16777619);}};
    const flush=()=>{hashText(buffer);buffer='';};
    const write=text=>{const token=String(text);if(buffer&&buffer.length+token.length>=65536)flush();if(token.length>=65536)hashText(token);else buffer+=token;};
    const stream=current=>{
      if(current===null){write('null');return true;}
      const type=typeof current;
      if(type==='string'){write(JSON.stringify(current));return true;}
      if(type==='number'){write(Number.isFinite(current)?String(current):'null');return true;}
      if(type==='boolean'){write(current?'true':'false');return true;}
      if(type==='bigint')throw new TypeError('Do not know how to serialize a BigInt');
      if(type==='undefined'||type==='function'||type==='symbol')return false;
      if(type!=='object')return false;
      if(stack.has(current))throw new TypeError('Converting circular structure to JSON');
      stack.add(current);
      if(isTypedSequence(current)){
        write('[');for(let start=0;start<current.length;start+=8192){if(start)write(',');const slice=current.subarray?current.subarray(start,Math.min(current.length,start+8192)):current.slice(start,start+8192),chunk=JSON.stringify(Array.from(slice));write(chunk.slice(1,-1));}write(']');stack.delete(current);return true;
      }
      if(Array.isArray(current)){
        if(current.length>=1024&&current.every(item=>item===null||typeof item==='number')){
          write('[');for(let start=0;start<current.length;start+=8192){if(start)write(',');const chunk=JSON.stringify(current.slice(start,start+8192));write(chunk.slice(1,-1));}write(']');stack.delete(current);return true;
        }
        write('[');for(let index=0;index<current.length;index++){if(index)write(',');if(!stream(current[index]))write('null');}write(']');stack.delete(current);return true;
      }
      write('{');let emitted=0;
      for(const key of canonicalObjectKeys(current)){
        const item=current[key],itemType=typeof item;if(itemType==='undefined'||itemType==='function'||itemType==='symbol')continue;
        if(emitted++)write(',');write(JSON.stringify(key));write(':');stream(item);
      }
      write('}');stack.delete(current);return true;
    };
    stream(value);flush();return (hash>>>0).toString(36);
  }

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
    const out={
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
    const semanticType=String(spec.semanticType||spec.dataType||spec.metadata?.dataType||'').trim();if(semanticType)out.semanticType=semanticType;
    return out;
  }

  function normalizeColumn(column,index,rowCountHint=0){
    const values=dataArray(column?.values).map(v=>v===null?NaN:v);
    const name=String(column?.name||column?.key||`Column ${index+1}`);
    const key=String(column?.key||name).trim()||`col_${index+1}`;
    const unit=String(column?.unit||''),dimension=String(column?.dimension||'').trim(),quantity=String(column?.quantity||'').trim();
    return {
      id:String(column?.id||`col:${hashString(`${key}:${index}`)}`),
      key,
      name,
      unit,
      ...(dimension?{dimension}:{}),
      ...(quantity?{quantity}:{}),
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
    const explicitRowIds=safeArray(spec.rowIds).slice(0,rowCount).map((value,index)=>String(value??`row:${index}`));
    return {
      ...envelope('data.table',spec),
      schemaVersion:1,
      rowCount,
      columns:cols,
      ...(explicitRowIds.length?{rowIds:explicitRowIds}: {})
    };
  }

  function createSeries(spec={}){
    const x=dataArray(spec.x),y=dataArray(spec.y);
    const n=Math.min(x.length,y.length);
    return {
      ...envelope('data.series',spec),
      schemaVersion:1,
      x:x.slice(0,n),y:y.slice(0,n),
      xName:String(spec.xName||'x'),yName:String(spec.yName||'y'),
      xUnit:String(spec.xUnit||''),yUnit:String(spec.yUnit||''),
      ...(String(spec.xDimension||'').trim()?{xDimension:String(spec.xDimension).trim()}:{}),
      ...(String(spec.yDimension||'').trim()?{yDimension:String(spec.yDimension).trim()}:{}),
      ...(String(spec.xQuantity||'').trim()?{xQuantity:String(spec.xQuantity).trim()}:{}),
      ...(String(spec.yQuantity||'').trim()?{yQuantity:String(spec.yQuantity).trim()}:{}),
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
    const x=dataArray(spec.x),y=dataArray(spec.y),z=dataArray(spec.z).map(row=>dataArray(row));
    return {...envelope('result.matrix',spec),schemaVersion:1,x,y,z,xName:String(spec.xName||'x'),yName:String(spec.yName||'y'),valueName:String(spec.valueName||'value'),xUnit:String(spec.xUnit||''),yUnit:String(spec.yUnit||''),valueUnit:String(spec.valueUnit||''),...(String(spec.xDimension||'').trim()?{xDimension:String(spec.xDimension).trim()}:{}),...(String(spec.yDimension||'').trim()?{yDimension:String(spec.yDimension).trim()}:{}),...(String(spec.valueDimension||'').trim()?{valueDimension:String(spec.valueDimension).trim()}:{}),...(String(spec.xQuantity||'').trim()?{xQuantity:String(spec.xQuantity).trim()}:{}),...(String(spec.yQuantity||'').trim()?{yQuantity:String(spec.yQuantity).trim()}:{}),...(String(spec.valueQuantity||'').trim()?{valueQuantity:String(spec.valueQuantity).trim()}:{}),parameters:normalizeMetadata(spec.parameters)};
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
    if(a?.kind==='result.matrix'){
      if(!Array.isArray(a.x))errors.push('ResultMatrix.x must be an array.');
      if(!Array.isArray(a.y))errors.push('ResultMatrix.y must be an array.');
      if(!Array.isArray(a.z))errors.push('ResultMatrix.z must be an array of rows.');
      if(Array.isArray(a.x)&&Array.isArray(a.y)&&Array.isArray(a.z)){
        if(a.z.length!==a.y.length)errors.push(`ResultMatrix.z row count ${a.z.length} must match y length ${a.y.length}.`);
        for(let index=0;index<a.z.length;index++){
          const row=a.z[index];
          if(!Array.isArray(row))errors.push(`ResultMatrix.z[${index}] must be an array.`);
          else if(row.length!==a.x.length)errors.push(`ResultMatrix.z[${index}] length ${row.length} must match x length ${a.x.length}.`);
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
  function seriesId(table,ref){const c=column(table,ref);return c?String(c.id||c.key||''):'';}
  function rowId(table,index){
    if(table?.kind!=='data.table')return '';
    const i=Math.trunc(Number(index));if(!Number.isInteger(i)||i<0||i>=Number(table.rowCount||0))return '';
    const explicit=Array.isArray(table.rowIds)?table.rowIds[i]:undefined;return explicit!==undefined&&explicit!==null&&String(explicit).trim()!==''?String(explicit):`row:${i}`;
  }

  function rows(table,{start=0,limit=Infinity,includeRowId=false}={}){
    if(table?.kind!=='data.table')return [];
    const out=[];
    const end=Math.min(table.rowCount,start+limit);
    for(let r=Math.max(0,start);r<end;r++){
      const row={};
      for(const c of table.columns)row[c.key]=c.values[r];
      if(includeRowId)row.rowId=rowId(table,r);
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

  const DATA_TAG_RULES=Object.freeze([
    ['vd',[/\bvd\b/i,/\bvds\b/i,/\bv[_\s-]*d\b/i,/\bdrain[_\s-]*voltage\b/i,/漏极电压|源漏电压/]],
    ['id',[/\b(?:Id|id)\b/,/\b(?:Ids|ids)\b/,/\b(?:I|i)[_\s-]+[dD]\b/,/\bdrain[_\s-]*current\b/i,/漏极电流|源漏电流/]],
    ['vg',[/\bvg\b/i,/\bvgs\b/i,/\bv[_\s-]*g\b/i,/\bgate[_\s-]*voltage\b/i,/栅压|栅极电压/]],
    ['ig',[/\big\b/i,/\bigs\b/i,/\bi[_\s-]*g\b/i,/\bgate[_\s-]*current\b/i,/栅流|栅极电流/]],
    ['vth',[/\bvth\b/i,/\bthreshold[_\s-]*voltage\b/i,/阈值电压/]],
    ['didv',[/\bd\s*i\s*\/\s*d\s*v\b/i,/\bdidv\b/i,/微分电导/]],
    ['dvdi',[/\bd\s*v\s*\/\s*d\s*i\b/i,/\bdvdi\b/i]],
    ['resistance',[/\bresistance\b/i,/\bresistivity\b/i,/\bohm\b/i,/电阻/]],
    ['conductance',[/\bconductance\b/i,/电导/]],
    ['time',[/\btime\b/i,/\btimestamp\b/i,/时间/]],
    ['temperature',[/\btemperature\b/i,/\btemp\b/i,/温度/]]
  ]);
  const DATA_TAG_LABELS=Object.freeze({vd:'Vd',id:'Id',vg:'Vg',ig:'Ig',vth:'Vth',didv:'dI/dV',dvdi:'dV/dI',resistance:'R',conductance:'G',time:'Time',temperature:'T'});
  function dataTagLabel(tag){const key=normalizeDataTag(tag);return DATA_TAG_LABELS[key]||String(tag||'');}
  function normalizeDataTag(value){
    const text=String(value??'').normalize?.('NFKC')||String(value??'');
    const lowered=text.trim().toLowerCase().replace(/[µμ]/g,'u').replace(/[^a-z0-9_./+-]+/g,'-').replace(/^-+|-+$/g,'');
    return lowered;
  }
  function dataTagsFromText(value){
    const text=String(value??'').normalize?.('NFKC')||String(value??'');
    const out=[];
    for(const [tag,patterns] of DATA_TAG_RULES)if(patterns.some(pattern=>pattern.test(text)))out.push(tag);
    return [...new Set(out)];
  }
  function columnDataTags(column){
    const values=[column?.key,column?.name,column?.metadata?.label,column?.metadata?.sourceHeader];
    const tags=new Set();for(const value of values)for(const tag of dataTagsFromText(value))tags.add(tag);
    const role=String(column?.role||'').toLowerCase();if(role==='x')tags.add('x');if(role==='y')tags.add('y');if(role==='group')tags.add('group');
    return [...tags];
  }
  function artifactDataTags(artifact){
    if(!artifact||typeof artifact!=='object')return [];
    const tags=new Set();
    const add=value=>{for(const tag of dataTagsFromText(value))tags.add(tag);};
    for(const tag of safeArray(artifact.tags)){const normalized=normalizeDataTag(tag);if(normalized)tags.add(normalized);add(tag);}
    for(const value of [artifact.name,artifact.semanticType,artifact?.source?.name,artifact?.source?.path,artifact?.metadata?.sourceName,artifact?.metadata?.seriesPath,artifact?.metadata?.label])add(value);
    for(const column of safeArray(artifact.columns))for(const tag of columnDataTags(column))tags.add(tag);
    return [...tags];
  }

  function transportDatasetFromTable(artifact){
    const table=rehydrateArtifact(artifact);if(!table||table.kind!=='data.table')return null;
    const semantic=String(table.semanticType||table.metadata?.dataType||'');if(semantic&&semantic!=='science.transport.iv')return null;
    const x=column(table,'Vd')||table.columns?.find(c=>c.role==='x')||table.columns?.[0],y=column(table,'Id')||table.columns?.find(c=>c.role==='y')||table.columns?.[1];if(!x||!y)return null;
    const vgColumn=column(table,'Vg')||table.columns?.find(c=>c.role==='group'),sourceLineColumn=column(table,'sourceLine')||table.columns?.find(c=>c.role==='index');
    const length=Math.min(safeArray(x.values).length,safeArray(y.values).length),metaVg=table.metadata?.vg,vgValue=metaVg!==null&&metaVg!==undefined&&String(metaVg).trim()!==''&&Number.isFinite(Number(metaVg))?Number(metaVg):safeArray(vgColumn?.values).map(Number).find(Number.isFinite),points=[];
    for(let index=0;index<length;index++){const v=Number(x.values[index]),i=Number(y.values[index]);if(!Number.isFinite(v)||!Number.isFinite(i))continue;const sourceLine=Number(sourceLineColumn?.values?.[index]);points.push({v,i,index,rowId:rowId(table,index),sourceLine:Number.isFinite(sourceLine)?sourceLine:index+1});}
    return {path:String(table.metadata?.seriesPath||table.id),name:String(table.name||table.source?.name||'I-V data'),sourcePath:String(table.source?.path||''),sourceName:String(table.source?.name||table.name||''),encoding:String(table.source?.encoding||''),vg:Number.isFinite(vgValue)?vgValue:null,points,importSpec:deepClone(table.metadata?.importSpec||null),assignments:safeArray(table.metadata?.dataAssignments).map(String).filter(Boolean),excluded:table.metadata?.excluded===true,artifactId:String(table.id),seriesId:String(y.id||y.key||'')};
  }
  function transportDatasetsFromArtifacts(artifacts,{consumer=''}={}){
    const id=String(consumer||'').trim();return safeArray(artifacts).map(transportDatasetFromTable).filter(Boolean).filter(dataset=>{if(!id)return true;const assignments=safeArray(dataset.assignments);return assignments.includes('*')||assignments.includes(id);});
  }

  function summarize(a){
    if(!a)return null;
    if(a.kind==='data.table')return {id:a.id,kind:a.kind,name:a.name,rows:a.rowCount,columns:a.columns.length,provenance:a.provenance?.length||0};
    if(a.kind==='data.series'||a.kind==='data.sweep')return {id:a.id,kind:a.kind,name:a.name,length:a.length,provenance:a.provenance?.length||0};
    return {id:a.id,kind:a.kind,name:a.name,provenance:a.provenance?.length||0};
  }

  function rehydrateArtifact(artifact){
    if(!artifact||typeof artifact!=='object')return artifact;
    if(artifact.kind==='data.table')return createTable({...artifact,columns:safeArray(artifact.columns).map(c=>({...c,values:dataArray(c.values).map(v=>v===null?NaN:v)}))});
    if(artifact.kind==='data.series')return createSeries({...artifact,x:dataArray(artifact.x).map(v=>v===null?NaN:v),y:dataArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='data.sweep')return createSweep({...artifact,x:dataArray(artifact.x).map(v=>v===null?NaN:v),y:dataArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='data.transform')return createTransform({...artifact,x:dataArray(artifact.x).map(v=>v===null?NaN:v),y:dataArray(artifact.y).map(v=>v===null?NaN:v)});
    if(artifact.kind==='result.matrix')return createMatrix({...artifact,x:dataArray(artifact.x).map(v=>v===null?NaN:v),y:dataArray(artifact.y).map(v=>v===null?NaN:v),z:dataArray(artifact.z).map(row=>dataArray(row).map(v=>v===null?NaN:v))});
    const out=deepClone(artifact);out.lineage=normalizeLineage(out.lineage||{parents:out.parents||out.parentId});return out;
  }

  function createStore(initial=[]){
    const map=new Map();
    const listeners=new Set();
    const childrenIndex=new Map();
    let batchDepth=0,batchEvents=[],revision=0;
    const kindRevisions=new Map(),artifactRevisions=new Map(),bufferRevisions=new Map(),bufferSnapshots=new WeakMap();
    const typedCtors=Object.freeze({number:Float64Array,float64:Float64Array,float32:typeof Float32Array==='function'?Float32Array:null,int32:typeof Int32Array==='function'?Int32Array:null,uint32:typeof Uint32Array==='function'?Uint32Array:null,int16:typeof Int16Array==='function'?Int16Array:null,uint16:typeof Uint16Array==='function'?Uint16Array:null,int8:typeof Int8Array==='function'?Int8Array:null,uint8:typeof Uint8Array==='function'?Uint8Array:null});
    function createNumericBacking(values,dtype='number'){
      const source=Array.isArray(values)?values:sequenceArray(values),kind=String(dtype||'number').trim().toLowerCase(),Ctor=typedCtors[kind];
      if(!Ctor)return source.slice();
      for(let index=0;index<source.length;index++)if(typeof source[index]!=='number')return source.slice();
      if(kind!=='number'&&kind!=='float64'){try{validateColumnBufferValues(kind,source);}catch{return source.slice();}}
      return new Ctor(source);
    }
    function createColumnBacking(column){return createNumericBacking(column?.values,column?.dtype);}
    function createStoreArtifact(artifact){
      if(artifact?.kind==='data.table')return {...artifact,columns:safeArray(artifact.columns).map(column=>({...column,values:createColumnBacking(column)}))};
      if(['data.series','data.sweep','data.transform'].includes(artifact?.kind))return {...artifact,x:createNumericBacking(artifact.x),y:createNumericBacking(artifact.y)};
      if(artifact?.kind==='result.matrix')return {...artifact,x:createNumericBacking(artifact.x),y:createNumericBacking(artifact.y),z:safeArray(artifact.z).map(row=>createNumericBacking(row))};
      return deepClone(artifact);
    }
    function materializeStoreArtifact(artifact){
      if(!artifact)return artifact;
      if(artifact.kind==='data.table'){
        const {columns,...rest}=artifact,out=deepClone(rest);
        out.columns=safeArray(columns).map(column=>{const {values,...meta}=column;return {...deepClone(meta),values:sequenceArray(values)};});
        return out;
      }
      if(['data.series','data.sweep','data.transform'].includes(artifact.kind)){const {x,y,...rest}=artifact;return {...deepClone(rest),x:sequenceArray(x),y:sequenceArray(y)};}
      if(artifact.kind==='result.matrix'){const {x,y,z,...rest}=artifact;return {...deepClone(rest),x:sequenceArray(x),y:sequenceArray(y),z:safeArray(z).map(sequenceArray)};}
      return deepClone(artifact);
    }
    const bufferRevisionKey=(artifactId,columnId)=>`${String(artifactId||'')}\u0000${String(columnId||'')}`;
    function bumpRevision(id,kind,previousKind=''){revision+=1;const artifactId=String(id||'');if(artifactId)artifactRevisions.set(artifactId,revision);for(const raw of new Set([kind,previousKind])){const key=String(raw||'');if(key)kindRevisions.set(key,(kindRevisions.get(key)||0)+1);}return revision;}
    function unrestrictedBufferIds(previous,next){const ids=new Set();if(previous?.kind==='data.table')for(const item of safeArray(previous.columns))ids.add(String(item.id));if(next?.kind==='data.table')for(const item of safeArray(next.columns))ids.add(String(item.id));return [...ids];}
    function updateBufferRevisions(previous,next,stamp,knownChanged=null){const artifactId=String(next?.id||previous?.id||''),ids=knownChanged?Array.from(knownChanged,String):unrestrictedBufferIds(previous,next);for(const columnId of ids)bufferRevisions.set(bufferRevisionKey(artifactId,columnId),stamp);return ids;}
    function updateLineageEdges(id,previousParents=[],nextParents=[]){const child=String(id||''),before=new Set(safeArray(previousParents).map(String).filter(Boolean)),after=new Set(safeArray(nextParents).map(String).filter(Boolean));if(!child)return;for(const parent of before)if(!after.has(parent)){const children=childrenIndex.get(parent);children?.delete(child);if(children&&!children.size)childrenIndex.delete(parent);}for(const parent of after)if(!before.has(parent)){if(!childrenIndex.has(parent))childrenIndex.set(parent,new Set());childrenIndex.get(parent).add(child);}}
    function commitArtifact(hydrated,previous,type,extra={},knownChanged=null){map.set(hydrated.id,createStoreArtifact(hydrated));const stamp=bumpRevision(hydrated.id,hydrated.kind,previous?.kind);updateBufferRevisions(previous,hydrated,stamp,knownChanged);updateLineageEdges(hydrated.id,previous?.lineage?.parents,hydrated.lineage?.parents);emit(type,hydrated,extra);return stamp;}
    function emit(type,artifact,extra={}){const event={type,artifact:artifact?materializeStoreArtifact(artifact):null,...extra};if(batchDepth){batchEvents.push(event);return;}for(const fn of listeners){try{fn(event);}catch(err){console.error(err);}}}
    function begin(){batchDepth++;return()=>endBatch();}
    function endBatch(){if(batchDepth>0)batchDepth--;if(!batchDepth&&batchEvents.length){const events=batchEvents.splice(0);for(const fn of listeners){try{fn({type:'batch',events});}catch(err){console.error(err);}}}}
    function lineage(id){const root=String(id||''),ancestors=[],descendants=[],seenUp=new Set(),seenDown=new Set(),up=[...(map.get(root)?.lineage?.parents||[])],down=[...(childrenIndex.get(root)||[])];while(up.length){const cur=up.shift();if(!cur||seenUp.has(cur))continue;seenUp.add(cur);const row=map.get(cur);if(row){ancestors.push(materializeStoreArtifact(row));up.push(...(row.lineage?.parents||[]));}}while(down.length){const cur=down.shift();if(!cur||seenDown.has(cur))continue;seenDown.add(cur);const row=map.get(cur);if(row){descendants.push(materializeStoreArtifact(row));down.push(...(childrenIndex.get(cur)||[]));}}return {id:root,artifact:map.has(root)?materializeStoreArtifact(map.get(root)):null,parents:(map.get(root)?.lineage?.parents||[]).map(id=>map.get(id)?materializeStoreArtifact(map.get(id)):null).filter(Boolean),children:[...(childrenIndex.get(root)||[])].map(id=>map.get(id)?materializeStoreArtifact(map.get(id)):null).filter(Boolean),ancestors,descendants};}
    function columnMetadataSnapshot(artifact,column){
      const row={artifactId:String(artifact.id),artifactRevision:artifactRevisions.get(String(artifact.id))||0,bufferRevision:bufferRevisions.get(bufferRevisionKey(artifact.id,column.id))||0,id:String(column.id),key:String(column.key),name:String(column.name||column.key||''),unit:String(column.unit||''),dtype:String(column.dtype||'number'),role:String(column.role||''),length:Number(column.length??column.values?.length??0)||0,metadata:normalizeMetadata(column.metadata)};
      if(column.dimension)row.dimension=String(column.dimension);if(column.quantity)row.quantity=String(column.quantity);return Object.freeze(row);
    }
    function artifactMetadataSnapshot(artifact){
      const row={artifactVersion:artifact.artifactVersion,id:String(artifact.id),kind:String(artifact.kind||''),name:String(artifact.name||''),semanticType:String(artifact.semanticType||''),createdAt:String(artifact.createdAt||''),updatedAt:String(artifact.updatedAt||''),transient:artifact.transient===true,tags:safeArray(artifact.tags).map(String),source:normalizeMetadata(artifact.source),metadata:normalizeMetadata(artifact.metadata),lineage:normalizeLineage(artifact.lineage),provenanceCount:safeArray(artifact.provenance).length,provenanceTypes:Object.freeze([...new Set(safeArray(artifact.provenance).map(step=>String(step?.type||'').trim()).filter(Boolean))]),artifactRevision:artifactRevisions.get(String(artifact.id))||0};
      if(artifact.schemaVersion!==undefined)row.schemaVersion=artifact.schemaVersion;
      if(artifact.kind==='data.table'){row.rowCount=Number(artifact.rowCount)||0;row.columns=Object.freeze(safeArray(artifact.columns).map(column=>columnMetadataSnapshot(artifact,column)));}
      else if(['data.series','data.sweep','data.transform'].includes(artifact.kind)){row.length=Number(artifact.length??artifact.x?.length??0)||0;row.xName=String(artifact.xName||'');row.yName=String(artifact.yName||'');row.xUnit=String(artifact.xUnit||'');row.yUnit=String(artifact.yUnit||'');for(const key of ['xDimension','yDimension','xQuantity','yQuantity'])if(artifact[key])row[key]=String(artifact[key]);}
      else if(artifact.kind==='result.matrix'){row.shape=[Number(artifact.y?.length||artifact.z?.length||0),Number(artifact.x?.length||artifact.z?.[0]?.length||0)];row.xName=String(artifact.xName||'');row.yName=String(artifact.yName||'');row.valueName=String(artifact.valueName||'');row.xUnit=String(artifact.xUnit||'');row.yUnit=String(artifact.yUnit||'');row.valueUnit=String(artifact.valueUnit||'');for(const key of ['xDimension','yDimension','valueDimension','xQuantity','yQuantity','valueQuantity'])if(artifact[key])row[key]=String(artifact[key]);}
      return Object.freeze(row);
    }
    function createColumnBufferSnapshot(artifact,column){
      const dtype=validateColumnBufferValues(column.dtype,column.values);
      const owner=Object.freeze({artifactId:String(artifact.id),columnId:String(column.id),columnKey:String(column.key)});
      const values=Object.freeze(sequenceArray(column.values));
      const snapshot=Object.freeze({version:COLUMN_BUFFER_VERSION,owner,dtype,length:values.length,artifactRevision:artifactRevisions.get(String(artifact.id))||0,bufferRevision:bufferRevisions.get(bufferRevisionKey(artifact.id,column.id))||0,values});
      bufferSnapshots.set(snapshot,{artifactId:owner.artifactId,columnId:owner.columnId,bufferRevision:snapshot.bufferRevision});
      return snapshot;
    }
    function createColumnRangeSnapshot(artifact,column,options={}){
      const startRaw=options?.start===undefined?0:Number(options.start),limit=Number(options?.limit);
      if(!Number.isInteger(startRaw)||startRaw<0)throw new RangeError('Column range start must be a non-negative integer.');
      if(!Number.isInteger(limit)||limit<1||limit>MAX_COLUMN_RANGE_VALUES)throw new RangeError(`Column range limit must be an integer from 1 to ${MAX_COLUMN_RANGE_VALUES}.`);
      const totalLength=Number(column.length??column.values?.length??0)||0,start=Math.min(startRaw,totalLength),end=Math.min(totalLength,start+limit),dtype=String(column.dtype||'number'),owner=Object.freeze({artifactId:String(artifact.id),columnId:String(column.id),columnKey:String(column.key)}),slice=isTypedSequence(column.values)?Array.from(column.values.subarray(start,end)):column.values.slice(start,end).map(value=>value&&typeof value==='object'?deepClone(value):value),values=Object.freeze(slice);
      return Object.freeze({version:COLUMN_RANGE_VERSION,owner,dtype,start,end,length:values.length,totalLength,artifactRevision:artifactRevisions.get(String(artifact.id))||0,bufferRevision:bufferRevisions.get(bufferRevisionKey(artifact.id,column.id))||0,values});
    }
    const api={
      version:STORE_VERSION,
      add(artifact,{replace=false}={}){
        const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));
        const previous=map.get(hydrated.id),existed=!!previous;if(existed&&!replace)throw new Error(`Artifact already exists: ${hydrated.id}`);
        commitArtifact(hydrated,previous,existed?'upsert':'add');return hydrated.id;
      },
      upsert(artifact){const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));const previous=map.get(hydrated.id);commitArtifact(hydrated,previous,'upsert');return hydrated.id;},
      publish(artifact,{dedupe=true}={}){const hydrated=rehydrateArtifact(artifact);const v=validateArtifact(hydrated);if(!v.ok)throw new Error(v.errors.join(' '));const previous=map.get(hydrated.id);if(dedupe&&previous&&fingerprintArtifact(previous)===fingerprintArtifact(hydrated))return {id:hydrated.id,changed:false,artifact:materializeStoreArtifact(previous)};commitArtifact(hydrated,previous,previous?'upsert':'add',{published:true});return {id:hydrated.id,changed:true,artifact:materializeStoreArtifact(hydrated)};},
      batch(fn){const done=begin();try{return fn?.(api);}finally{done();}},
      get(id){const a=map.get(String(id));return a?materializeStoreArtifact(a):null;},
      has(id){return map.has(String(id));},
      list({kind=null,includeTransient=true,parent=null}={}){return [...map.values()].filter(a=>(!kind||a.kind===kind)&&(includeTransient||!a.transient)&&(!parent||(a.lineage?.parents||[]).includes(String(parent)))).map(materializeStoreArtifact);},
      listMetadata({id=null,kind=null,includeTransient=true,parent=null}={}){const source=id?[map.get(String(id))].filter(Boolean):[...map.values()];return source.filter(a=>(!kind||a.kind===kind)&&(includeTransient||!a.transient)&&(!parent||(a.lineage?.parents||[]).includes(String(parent)))).map(artifactMetadataSnapshot);},
      parents(id){return (map.get(String(id))?.lineage?.parents||[]).map(key=>map.get(key)?materializeStoreArtifact(map.get(key)):null).filter(Boolean);},
      children(id){return [...(childrenIndex.get(String(id))||[])].map(key=>map.get(key)?materializeStoreArtifact(map.get(key)):null).filter(Boolean);},
      lineage,
      remove(id){const key=String(id),a=map.get(key),ok=map.delete(key);if(ok){const stamp=bumpRevision(key,a?.kind);updateBufferRevisions(a,null,stamp);updateLineageEdges(key,a?.lineage?.parents,[]);emit('remove',a);}return ok;},
      clear({includeTransient=true}={}){const removed=[];for(const [id,a] of [...map])if(includeTransient||!a.transient){map.delete(id);removed.push(a);}if(removed.length){revision+=1;for(const a of removed){const id=String(a?.id||''),key=String(a?.kind||'');if(id)artifactRevisions.set(id,revision);if(key)kindRevisions.set(key,(kindRevisions.get(key)||0)+1);updateBufferRevisions(a,null,revision);updateLineageEdges(id,a?.lineage?.parents,[]);}}if(removed.length){if(removed.length===1)emit('remove',removed[0]);else emit('clear',null,{ids:removed.map(a=>a.id)});}},
      onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);},
      size(){return map.size;},
      revision:kind=>{const key=String(kind||'');return key?(kindRevisions.get(key)||0):revision;},
      artifactRevision:id=>artifactRevisions.get(String(id||''))||0,
      columnRevision(id,ref){const artifact=map.get(String(id));if(!artifact||artifact.kind!=='data.table')return 0;const selected=column(artifact,ref);return selected?(bufferRevisions.get(bufferRevisionKey(artifact.id,selected.id))||0):0;},
      fingerprint:id=>{const a=map.get(String(id));return a?fingerprintArtifact(a):'';},
      storageProfile(){let typedColumns=0,arrayColumns=0,typedSequences=0,arraySequences=0,typedBytes=0,values=0;const visit=(sequence,{column=false}={})=>{values+=Number(sequence?.length||0);if(isTypedSequence(sequence)){typedSequences+=1;typedBytes+=Number(sequence.byteLength||0);if(column)typedColumns+=1;}else{arraySequences+=1;if(column)arrayColumns+=1;}};for(const artifact of map.values()){if(artifact?.kind==='data.table')for(const selected of safeArray(artifact.columns))visit(selected?.values,{column:true});else if(['data.series','data.sweep','data.transform'].includes(artifact?.kind)){visit(artifact.x);visit(artifact.y);}else if(artifact?.kind==='result.matrix'){visit(artifact.x);visit(artifact.y);for(const row of safeArray(artifact.z))visit(row);}}return Object.freeze({typedColumns,arrayColumns,typedSequences,arraySequences,typedBytes,values});},
      columnMetadata(id){const artifact=map.get(String(id));if(!artifact||artifact.kind!=='data.table')return null;return Object.freeze(artifact.columns.map(selected=>columnMetadataSnapshot(artifact,selected)));},
      readColumnRange(id,ref,options={}){const artifact=map.get(String(id));if(!artifact||artifact.kind!=='data.table')return null;const selected=column(artifact,ref);return selected?createColumnRangeSnapshot(artifact,selected,options):null;},
      columnBuffer(id,ref){const artifact=map.get(String(id));if(!artifact||artifact.kind!=='data.table')return null;const selected=column(artifact,ref);return selected?createColumnBufferSnapshot(artifact,selected):null;},
      transactColumn(buffer,mutate,options={}){
        const ownership=buffer&&typeof buffer==='object'?bufferSnapshots.get(buffer):null;
        if(!ownership)throw new Error('Column Buffer owner does not belong to this Artifact Store.');
        if(typeof mutate!=='function')throw new TypeError('Column Buffer transaction requires a synchronous mutator.');
        if(mutate.constructor?.name==='AsyncFunction')throw new TypeError('Column Buffer transaction mutator must be synchronous.');
        const artifact=map.get(ownership.artifactId),currentRevision=artifactRevisions.get(ownership.artifactId)||0,currentBufferRevision=bufferRevisions.get(bufferRevisionKey(ownership.artifactId,ownership.columnId))||0;
        if(!artifact||currentBufferRevision!==ownership.bufferRevision)throw new Error(`Column Buffer snapshot is stale for Artifact ${ownership.artifactId} column ${ownership.columnId}.`);
        const selected=artifact.columns?.find(item=>String(item?.id)===ownership.columnId);
        if(!selected)throw new Error(`Column Buffer snapshot is stale for column ${ownership.columnId}.`);
        const dtype=validateColumnBufferValues(selected.dtype,selected.values),draft=sequenceArray(selected.values);
        const outcome=mutate(draft,Object.freeze({owner:buffer.owner,dtype,length:buffer.length,artifactRevision:buffer.artifactRevision}));
        if(outcome&&typeof outcome.then==='function'){Promise.resolve(outcome).catch(()=>{});throw new TypeError('Column Buffer transaction mutator must be synchronous.');}
        if(draft.length!==selected.values.length)throw new RangeError('Column Buffer transaction cannot change column length.');
        validateColumnBufferValues(dtype,draft);
        const changed=draft.some((value,index)=>!Object.is(value,selected.values[index]));
        if(!changed)return {changed:false,artifactId:ownership.artifactId,columnId:ownership.columnId,artifactRevision:currentRevision,bufferRevision:currentBufferRevision,buffer};
        const next=materializeStoreArtifact(artifact),nextColumn=next.columns.find(item=>String(item?.id)===ownership.columnId);
        nextColumn.values=draft;nextColumn.length=draft.length;next.updatedAt=nowIso();const v=validateArtifact(next);if(!v.ok)throw new Error(v.errors.join(' '));commitArtifact(next,artifact,'upsert',{},[ownership.columnId]);
        const nextBuffer=api.columnBuffer(ownership.artifactId,ownership.columnId);
        return {changed:true,artifactId:ownership.artifactId,columnId:ownership.columnId,artifactRevision:nextBuffer.artifactRevision,bufferRevision:nextBuffer.bufferRevision,buffer:nextBuffer,label:String(options?.label||'')};
      }
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
    ARTIFACT_VERSION,STORE_VERSION,COLUMN_BUFFER_VERSION,COLUMN_RANGE_VERSION,MAX_COLUMN_RANGE_VALUES,COLUMN_BUFFER_DTYPES,nowIso,deepClone,hashString,makeId,stableId,
    provenanceStep,normalizeLineage,fingerprintArtifact,createTable,createSeries,createSweep,createTransform,createMatrix,createEventSeries,createPeakSet,
    createFitResult,createAnalysisResult,createAnnotation,createImageData,isArtifact,validateArtifact,
    column,columnValues,seriesId,rowId,rows,withProvenance,derive,summarize,
    rehydrateArtifact,createStore,serializeStore,restoreStore,transportDatasetFromTable,transportDatasetsFromArtifacts,normalizeDataTag,dataTagLabel,dataTagsFromText,columnDataTags,artifactDataTags
  };
})();
