'use strict';

  const SELECTION_SCHEMA=2;
  const REFERENCE_VERSION='1.1.0';
  const LIMITS=Object.freeze({items:2048,ranges:32,refKeys:32,metaKeys:32,array:32,string:512,depth:3});
  const text=value=>String(value??'').trim();
  const finiteRevision=value=>{const n=Number(value);return Number.isInteger(n)&&n>=0?n:undefined;};
  function bounded(value,{keys=LIMITS.refKeys,array=LIMITS.array,string=LIMITS.string,depth=LIMITS.depth,label='selection reference'}={},level=0){
    if(value===null)return null;
    const type=typeof value;
    if(type==='string')return value.length>string?value.slice(0,string):value;
    if(type==='number'){if(!Number.isFinite(value))throw new TypeError(`${label} contains a non-finite number.`);return value;}
    if(type==='boolean')return value;
    if(type==='undefined')return undefined;
    if(type!=='object')throw new TypeError(`${label} must contain only JSON-safe reference metadata.`);
    if(level>=depth)throw new RangeError(`${label} exceeds maximum depth ${depth}.`);
    if(typeof ArrayBuffer!=='undefined'&&ArrayBuffer.isView?.(value))throw new TypeError(`${label} must not contain typed payload buffers.`);
    if(Array.isArray(value)){
      if(value.length>array)throw new RangeError(`${label} array exceeds ${array} entries.`);
      return value.map(item=>bounded(item,{keys,array,string,depth,label},level+1));
    }
    const names=Object.keys(value).filter(key=>value[key]!==undefined);
    if(names.length>keys)throw new RangeError(`${label} exceeds ${keys} fields.`);
    const out={};for(const key of names)out[key]=bounded(value[key],{keys,array,string,depth,label},level+1);return out;
  }
  function normalizeReference(ref={}){
    if(!ref||typeof ref!=='object'||Array.isArray(ref))throw new TypeError('Selection reference object required.');
    const out=bounded(ref,{label:'selection reference'});
    for(const key of ['artifactId','seriesId','rowId','entityId','columnId'])if(out[key]!==undefined){const id=text(out[key]);if(id)out[key]=id;else delete out[key];}
    if(out.artifactRevision!==undefined){const revision=finiteRevision(out.artifactRevision);if(revision===undefined)throw new TypeError('artifactRevision must be a non-negative integer snapshot condition.');out.artifactRevision=revision;}
    return out;
  }
  function artifactReference(artifactId,options={}){
    const id=text(artifactId);if(!id)throw new Error('artifactId required.');
    const out={artifactId:id};const revision=finiteRevision(options.artifactRevision);if(revision!==undefined)out.artifactRevision=revision;return normalizeReference({...out,...(options.extra||{})});
  }
  function seriesReference(artifactId,seriesId,options={}){
    const sid=text(seriesId);if(!sid)throw new Error('seriesId required.');return normalizeReference({...artifactReference(artifactId,options),seriesId:sid,...(options.extra||{})});
  }
  function rowReference(artifactId,rowId,options={}){
    const rid=text(rowId);if(!rid)throw new Error('rowId required.');const base=options.seriesId?seriesReference(artifactId,options.seriesId,options):artifactReference(artifactId,options);return normalizeReference({...base,rowId:rid,...(options.extra||{})});
  }
  function referenceIdentity(ref={}){
    const value=normalizeReference(ref),artifactId=text(value.artifactId),seriesId=text(value.seriesId),rowId=text(value.rowId),entityId=text(value.entityId);
    const part=value=>encodeURIComponent(String(value));
    if(artifactId&&rowId)return `row:${part(artifactId)}:${seriesId?`${part(seriesId)}:`:''}${part(rowId)}`;
    if(artifactId&&seriesId)return `series:${part(artifactId)}:${part(seriesId)}`;
    if(artifactId)return `artifact:${part(artifactId)}`;
    if(entityId)return `entity:${part(entityId)}`;
    return '';
  }
  function sourceRowKey(ref={}){
    const value=normalizeReference(ref),artifactId=text(value.artifactId),rowId=text(value.rowId);if(!artifactId||!rowId)return '';
    const part=value=>encodeURIComponent(String(value));return `source-row:${part(artifactId)}:${part(rowId)}`;
  }
  function sameSourceRow(a={},b={}){const left=sourceRowKey(a),right=sourceRowKey(b);return !!left&&left===right;}
  function rangeReference(sourceRef,bounds={},options={}){
    const source=normalizeReference(sourceRef||{});if(!referenceIdentity(source))throw new Error('Range selection requires a stable source reference.');
    const cleanBounds=bounded(bounds,{keys:16,array:4,string:256,depth:2,label:'selection range bounds'});
    for(const key of ['pointIds','rowIds','indices','items','points'])if(Array.isArray(cleanBounds?.[key]))throw new Error(`Range selection must reference its source instead of embedding ${key}.`);
    const revision=finiteRevision(options.artifactRevision);const out={...source,range:cleanBounds};if(revision!==undefined)out.artifactRevision=revision;return normalizeReference(out);
  }
  const selectionReferences=Object.freeze({version:REFERENCE_VERSION,limits:LIMITS,normalize:normalizeReference,identity:referenceIdentity,sourceRowKey,sameSourceRow,artifact:artifactReference,series:seriesReference,row:rowReference,range:rangeReference});
  function boundedMeta(value={},label='selection metadata'){return bounded(value&&typeof value==='object'&&!Array.isArray(value)?value:{},{keys:LIMITS.metaKeys,array:LIMITS.array,string:LIMITS.string,depth:2,label});}
  function ensureCount(rows,max,label){if(rows.length>max)throw new RangeError(`${label} exceeds ${max}; publish a source-referenced range instead.`);return rows;}

  const INTERACTION_TRANSACTION_SCHEMA='dkds.interaction-transaction.v1';
  const TRANSACTION_LIMITS=Object.freeze({seen:256,id:160,linkGroup:96,projectId:192,scopeId:192,runtimeId:128,owner:192});
  let interactionScopeSequence=0,interactionTransactionSequence=0;
  const boundedText=(value,max,label)=>{const out=text(value);if(out.length>max)throw new RangeError(`${label} exceeds ${max} characters.`);return out;};
  function nextInteractionScopeId(owner='scope'){const name=boundedText(owner,TRANSACTION_LIMITS.owner,'interaction owner')||'scope';return `${name}#${(++interactionScopeSequence).toString(36)}`;}
  function currentProjectId(scope){
    const unresolved=()=>`scope:${String(scope?.scopeId||scope?.owner||'unresolved').slice(0,180)}`;
    const configured=scope?.options?.projectId;
    if(configured!==undefined){let value;try{value=typeof configured==='function'?configured():configured;}catch{return unresolved();}const id=boundedText(value,TRANSACTION_LIMITS.projectId,'projectId');return id||unresolved();}
    const getter=scope?.options?.host?.getActiveProjectTab;if(typeof getter==='function'){let tab;try{tab=getter();}catch{return unresolved();}const id=boundedText(tab?.id??tab?.projectId,TRANSACTION_LIMITS.projectId,'projectId');return id||unresolved();}
    return 'session:default';
  }
  function transactionFrom(value={}){if(value?.transaction&&typeof value.transaction==='object'&&!Array.isArray(value.transaction))return value.transaction;return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}
  function normalizeInteractionTransaction(input={},runtime,options={}){
    const raw=transactionFrom(input),scope=runtime?.scope||options.scope||null;
    if(raw.schema&&raw.schema!==INTERACTION_TRANSACTION_SCHEMA)throw new Error(`Unsupported interaction transaction schema: ${raw.schema}`);
    if(options.remote===true&&!text(raw.projectId))throw new Error('Remote interaction transaction requires projectId.');
    const owner=boundedText(runtime?.owner||scope?.owner||raw.sourceOwner||raw.originOwner||'',TRANSACTION_LIMITS.owner,'transaction owner');
    const scopeId=boundedText(runtime?.scopeId||scope?.scopeId||raw.sourceScopeId||raw.originScopeId||'',TRANSACTION_LIMITS.scopeId,'transaction scopeId');
    const runtimeId=boundedText(runtime?.id||raw.sourceRuntimeId||raw.originRuntimeId||'',TRANSACTION_LIMITS.runtimeId,'transaction runtimeId');
    const create=options.create===true;
    let transactionId=boundedText(raw.transactionId||raw.id||'',TRANSACTION_LIMITS.id,'transactionId');
    if(!transactionId&&create)transactionId=`tx:${(++interactionTransactionSequence).toString(36)}`;
    if(!transactionId)throw new Error('Interaction transactionId required for remote state application.');
    const projectId=boundedText(raw.projectId||input?.projectId||currentProjectId(scope),TRANSACTION_LIMITS.projectId,'projectId');
    const linkGroup=boundedText(raw.linkGroup||input?.linkGroup||runtime?.linkGroup||runtime?.spec?.linkGroup||'',TRANSACTION_LIMITS.linkGroup,'linkGroup');
    const originOwner=boundedText(raw.originOwner||owner,TRANSACTION_LIMITS.owner,'originOwner');
    const originScopeId=boundedText(raw.originScopeId||scopeId,TRANSACTION_LIMITS.scopeId,'originScopeId');
    const originRuntimeId=boundedText(raw.originRuntimeId||runtimeId,TRANSACTION_LIMITS.runtimeId,'originRuntimeId');
    return Object.freeze({
      schema:INTERACTION_TRANSACTION_SCHEMA,transactionId,projectId,linkGroup,originOwner,originScopeId,originRuntimeId,
      sourceOwner:owner,sourceScopeId:scopeId,sourceRuntimeId:runtimeId,remote:options.remote===true||raw.remote===true
    });
  }
  const interactionTransactions=Object.freeze({schema:INTERACTION_TRANSACTION_SCHEMA,limits:TRANSACTION_LIMITS,normalize:normalizeInteractionTransaction,currentProjectId});
  const INTERACTION_BRIDGE_EVENT='dkds:selection-changed';
  const LINKED_STATE_LIMITS=Object.freeze({channel:48,keys:32,array:24,string:384,depth:5});
  function normalizeLinkedState(channel,state={}){
    const name=boundedText(channel,LINKED_STATE_LIMITS.channel,'linked state channel');if(!name||name==='selection')throw new Error('Linked interaction state channel must be non-empty and must not use the reserved selection channel.');
    if(!state||typeof state!=='object'||Array.isArray(state))throw new TypeError('Linked interaction state must be a bounded object.');
    return bounded(state,{keys:LINKED_STATE_LIMITS.keys,array:LINKED_STATE_LIMITS.array,string:LINKED_STATE_LIMITS.string,depth:LINKED_STATE_LIMITS.depth,label:`linked interaction state ${name}`});
  }



  class SelectionChannel {
    constructor(owner,id,initial=null){this.owner=owner;this.id=id;this.value=initial;this.listeners=new Set();}
    get(){return this.value;}
    set(value,meta={}){this.value=value;for(const fn of [...this.listeners]){try{fn(value,meta,this);}catch(err){console.warn('[DKDS selection]',err);}}return value;}
    clear(meta={}){return this.set(null,{reason:'clear',...meta});}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.value,{reason:'subscribe'},this);return()=>this.listeners.delete(fn);}
    dispose(){this.listeners.clear();this.value=null;}
  }

  class DataTypeRegistry {
    constructor(){this.rows=new Map();this.ownerIndex=new Map();this.aliases=new Map();}
    resolveId(id){const raw=String(id||'').trim();return this.aliases.get(raw)||raw;}
    register(owner,id,spec={}){
      const key=String(id||'').trim();if(!key)throw new Error('Data type id required.');
      const ownerId=String(owner||'core');
      const previous=this.rows.get(key);
      if(previous&&previous.owner!==ownerId)throw new Error(`Data type ${key} is already owned by ${previous.owner}.`);
      if(previous)this.unregister(key);
      const parents=[...new Set([...(Array.isArray(spec.parents)?spec.parents:[]),spec.parent].filter(Boolean).map(String))];
      const aliases=[...new Set((Array.isArray(spec.aliases)?spec.aliases:[]).map(v=>String(v||'').trim()).filter(Boolean))];
      for(const alias of aliases){const existing=this.aliases.get(alias);if(existing&&existing!==key)throw new Error(`Data type alias ${alias} is already mapped to ${existing}.`);if(this.rows.has(alias)&&alias!==key)throw new Error(`Data type alias ${alias} conflicts with a registered type.`);}
      const tags=Object.freeze([...new Set((Array.isArray(spec.tags)?spec.tags:[]).map(String))]);
      const axes=Object.freeze(Array.isArray(spec.axes)?spec.axes.map(axis=>Object.freeze({...axis})):[]);
      const value=Object.freeze({id:key,owner:ownerId,title:String(spec.title||key),parent:parents[0]||'',parents:Object.freeze(parents),aliases:Object.freeze(aliases),kind:String(spec.kind||'entity'),quantity:String(spec.quantity||spec.metadata?.quantity||''),shape:String(spec.shape||spec.metadata?.shape||''),unit:String(spec.unit||spec.metadata?.unit||''),tags,axes,schema:spec.schema||null,key:typeof spec.key==='function'?spec.key:null,normalize:typeof spec.normalize==='function'?spec.normalize:null,selection:typeof spec.selection==='function'?spec.selection:null,resolve:typeof spec.resolve==='function'?spec.resolve:null,serialize:typeof spec.serialize==='function'?spec.serialize:null,deserialize:typeof spec.deserialize==='function'?spec.deserialize:null,describe:typeof spec.describe==='function'?spec.describe:null,match:typeof spec.match==='function'?spec.match:null,metadata:spec.metadata&&typeof spec.metadata==='object'?{...spec.metadata}:{}});
      this.rows.set(key,value);for(const alias of aliases)this.aliases.set(alias,key);if(!this.ownerIndex.has(ownerId))this.ownerIndex.set(ownerId,new Set());this.ownerIndex.get(ownerId).add(key);return value;
    }
    unregister(id){const key=this.resolveId(id);const row=this.rows.get(key);if(!row)return false;this.rows.delete(key);for(const alias of row.aliases||[])if(this.aliases.get(alias)===key)this.aliases.delete(alias);this.ownerIndex.get(row.owner)?.delete(key);if(!this.ownerIndex.get(row.owner)?.size)this.ownerIndex.delete(row.owner);return true;}
    unregisterOwner(owner){for(const id of [...(this.ownerIndex.get(String(owner||''))||[])])this.unregister(id);}
    get(id){return this.rows.get(this.resolveId(id))||null;}
    list(query={}){const q=typeof query==='string'?{kind:query}:query||{};const tags=Array.isArray(q.tags)?q.tags:(q.tag?[q.tag]:[]);return [...this.rows.values()].filter(row=>(!q.owner||row.owner===q.owner)&&(!q.kind||row.kind===q.kind)&&(!q.quantity||row.quantity===q.quantity)&&(!q.shape||row.shape===q.shape)&&(!q.parent||this.isA(row.id,q.parent))&&(!tags.length||tags.every(tag=>row.tags.includes(String(tag)))));}
    lineage(id){const start=this.resolveId(id),out=[],seen=new Set(),queue=[start];let guard=0;while(queue.length&&guard++<256){const currentId=this.resolveId(queue.shift());if(!currentId||seen.has(currentId))continue;seen.add(currentId);const row=this.rows.get(currentId);if(!row)continue;out.push(row);queue.push(...(row.parents||[]));}return out;}
    isA(id,parent){
      const target=this.resolveId(parent);if(!target)return true;const start=this.resolveId(id);if(start===target)return true;
      const seen=new Set(),queue=[start];let guard=0;
      while(queue.length&&guard++<128){const currentId=this.resolveId(queue.shift());if(seen.has(currentId))continue;seen.add(currentId);const current=this.rows.get(currentId);if(!current)continue;for(const rawNext of current.parents||(current.parent?[current.parent]:[])){const next=this.resolveId(rawNext);if(next===target)return true;if(!seen.has(next))queue.push(next);}}
      return false;
    }
    accepts(sourceType,acceptedTypes=[]){const rows=(Array.isArray(acceptedTypes)?acceptedTypes:[acceptedTypes]).map(v=>String(v||'')).filter(Boolean);return rows.length===0||rows.some(target=>this.isA(sourceType,target));}
    compatible(a,b){return this.isA(a,b)||this.isA(b,a);}
    infer(value,query={}){for(const row of this.list(query)){try{if(row.match?.(value,{registry:this,type:row}))return row;}catch{}}return null;}
    describe(id,value){const row=this.get(id);if(!row)return String(value?.name||value?.id||id||'');try{return row.describe?String(row.describe(value,{registry:this,type:row})||''):String(value?.label||value?.name||value?.id||row.title);}catch{return String(value?.label||value?.name||value?.id||row.title);}}
    normalize(type,value,context={}){const row=this.get(type);if(!row)return value;try{return row.normalize?row.normalize(value,{...context,type:row}):value;}catch(err){console.warn('[DKDS data type normalize]',type,err);return value;}}
    key(type,value,context={}){const row=this.get(type);if(row?.key){try{const k=row.key(value,{...context,type:row});if(k!==undefined&&k!==null&&String(k)!=='')return String(k);}catch(err){console.warn('[DKDS data type key]',type,err);}}const direct=value?.id??value?.key??value?.path??value?.name;return direct!==undefined&&direct!==null&&String(direct)!==''?String(direct):'';}
    projectSelection(type,value,context={}){
      const row=this.get(type);if(!row?.selection)return {};
      const projected=row.selection(value,{...context,type:row,registry:this});
      if(projected===null||projected===undefined)return {};
      if(!projected||typeof projected!=='object'||Array.isArray(projected))throw new TypeError(`Data type ${type} selection projection must return {id, ref, meta}.`);
      if(Object.prototype.hasOwnProperty.call(projected,'value'))throw new TypeError(`Data type ${type} selection projection must be reference-only; value is not allowed.`);
      return projected;
    }
    resolve(type,item,context={}){
      const row=this.get(type);if(!row?.resolve)return item?.ref;
      try{return row.resolve(item?.ref,{...context,type:row,item,registry:this});}
      catch(err){console.warn('[DKDS data type resolve]',type,err);return undefined;}
    }
    validate(){
      const errors=[];
      for(const row of this.rows.values())for(const parent of row.parents||[])if(!this.get(parent))errors.push(`${row.id}: unknown parent ${parent}`);
      const visiting=new Set(),visited=new Set();
      const visit=id=>{
        const key=this.resolveId(id);if(!key||visited.has(key)||!this.rows.has(key))return;
        if(visiting.has(key)){errors.push(`${key}: inheritance cycle detected`);return;}
        visiting.add(key);
        for(const parent of this.rows.get(key)?.parents||[])visit(parent);
        visiting.delete(key);visited.add(key);
      };
      for(const id of this.rows.keys())visit(id);
      return {ok:errors.length===0,errors:[...new Set(errors)],count:this.rows.size,aliases:this.aliases.size};
    }
  }
  const dataTypeRegistry=new DataTypeRegistry();
  dataTypeRegistry.register('core','core.entity',{title:'Entity'});
  dataTypeRegistry.register('core','data.artifact',{title:'Data artifact',parent:'core.entity',kind:'data'});
  dataTypeRegistry.register('core','data.table',{title:'Data table',parent:'data.artifact',kind:'data',shape:'table',match:v=>v?.kind==='data.table'});
  dataTypeRegistry.register('core','data.series',{title:'Series',parent:'data.artifact',kind:'data',shape:'curve',match:v=>v?.kind==='data.series'});
  dataTypeRegistry.register('core','data.sweep',{title:'Sweep',parent:'data.series',kind:'data',shape:'curve',match:v=>v?.kind==='data.sweep'});
  dataTypeRegistry.register('core','data.transform',{title:'Transformed series',parent:'data.series',kind:'data',shape:'curve',match:v=>v?.kind==='data.transform'});
  dataTypeRegistry.register('core','data.point',{title:'Point',parent:'core.entity',kind:'data',shape:'point'});
  dataTypeRegistry.register('core','data.range',{title:'Range',parent:'core.entity',kind:'region',shape:'region'});
  dataTypeRegistry.register('core','result.analysis',{title:'Analysis result',parent:'data.artifact',kind:'result'});
  dataTypeRegistry.register('core','result.matrix',{title:'Derived matrix',parent:'result.analysis',kind:'result',shape:'matrix',match:v=>v?.kind==='result.matrix'});
  dataTypeRegistry.register('core','annotation',{title:'Annotation',parent:'core.entity',kind:'annotation'});

  // Canonical scientific semantics. Plugins may expose richer domain-specific
  // types, but those types should inherit these IDs so another plugin can
  // understand the quantity without knowing the producer plugin.
  dataTypeRegistry.register('core','science.measurement',{title:'Scientific measurement',parent:'data.artifact',kind:'data',tags:['scientific']});
  dataTypeRegistry.register('core','science.scalar',{title:'Scientific scalar',parent:'core.entity',kind:'result',shape:'scalar',tags:['scientific']});
  dataTypeRegistry.register('core','science.curve',{title:'Scientific curve',parents:['data.series','science.measurement'],kind:'data',shape:'curve',tags:['scientific']});
  dataTypeRegistry.register('core','science.scalar-field',{title:'Scientific scalar field',parents:['result.matrix','science.measurement'],kind:'result',shape:'matrix',tags:['scientific','field']});


  class SelectionModel {
    constructor(owner,id,spec={}){
      this.owner=String(owner||'');this.id=String(id||'selection');this.spec={multiple:true,...spec};this.listeners=new Set();this.revision=0;
      this.value={schema:SELECTION_SCHEMA,revision:0,items:[],focus:null,ranges:[],context:{},source:null};
      if(spec.initial)this.restore(spec.initial,{reason:'initial'});
    }
    normalizeItem(input,options={}){
      if(input===null||input===undefined)return null;
      const raw=(input&&typeof input==='object'&&!Array.isArray(input))?input:{value:input};
      const type=String(options.type||raw.type||this.spec.defaultType||'core.entity');
      const sourceValue=raw.value!==undefined?raw.value:raw;
      const normalized=dataTypeRegistry.normalize(type,sourceValue,{selection:this,owner:this.owner});
      const projected=dataTypeRegistry.projectSelection(type,normalized,{selection:this,owner:this.owner});
      const rawRef=raw.ref&&typeof raw.ref==='object'&&!Array.isArray(raw.ref)?raw.ref:null,projectedRef=projected.ref&&typeof projected.ref==='object'&&!Array.isArray(projected.ref)?projected.ref:null;
      let ref=rawRef?normalizeReference(rawRef):(projectedRef?normalizeReference(projectedRef):null);
      const explicit=raw.id||projected.id||dataTypeRegistry.key(type,normalized,{selection:this,owner:this.owner});
      let id=text(explicit);if(!id&&ref)id=referenceIdentity(ref);if(!id)throw new Error(`Selection item ${type} requires a stable id or artifactId/seriesId/rowId reference.`);
      if(!ref)ref=normalizeReference({entityId:id});
      const meta=boundedMeta({...((projected.meta&&typeof projected.meta==='object')?projected.meta:{}),...((raw.meta&&typeof raw.meta==='object')?raw.meta:{})});
      return {type,id,role:String(raw.role||options.role||''),ref,meta};
    }
    snapshot(){try{return structuredClone(this.value);}catch{return JSON.parse(JSON.stringify(this.value));}}
    get(){return this.snapshot();}
    items(type=''){const rows=this.value.items.slice();return type?rows.filter(row=>dataTypeRegistry.isA(row.type,type)):rows;}
    focus(){if(!this.value.focus)return null;try{return structuredClone(this.value.focus);}catch{return {...this.value.focus};}}
    emit(meta={}){this.revision+=1;this.value.revision=this.revision;const snap=this.get();for(const fn of [...this.listeners]){try{fn(snap,meta,this);}catch(err){console.warn('[DKDS typed selection]',err);}}return snap;}
    normalizeMany(inputs=[],options={}){const rows=(Array.isArray(inputs)?inputs:[inputs]).map(v=>this.normalizeItem(v,options)).filter(Boolean),out=[],seen=new Set();for(const item of rows){const key=`${item.type}::${item.id}`;if(seen.has(key))continue;seen.add(key);out.push(item);}return ensureCount(out,LIMITS.items,'Selection item count');}
    select(input,options={}){
      const item=this.normalizeItem(input,options);if(!item)return this.clear(options);
      const key=`${item.type}::${item.id}`;let rows=this.value.items.slice();const idx=rows.findIndex(row=>`${row.type}::${row.id}`===key);
      if(options.toggle&&idx>=0)rows.splice(idx,1);else if(options.additive&&this.spec.multiple!==false){if(idx>=0)rows[idx]=item;else rows.push(item);}else rows=[item];
      ensureCount(rows,LIMITS.items,'Selection item count');this.value.items=rows;this.value.focus=rows.find(row=>`${row.type}::${row.id}`===key)||rows.at(-1)||null;
      this.value.source=options.source||options.sourceView||this.value.source||null;if(options.context)this.value.context={...this.value.context,...boundedMeta(options.context,'selection context')};return this.emit({reason:'select',...options});
    }
    selectMany(inputs=[],options={}){const rows=this.normalizeMany(inputs,options);this.value.items=this.spec.multiple===false?rows.slice(-1):rows;this.value.focus=this.value.items.at(-1)||null;this.value.source=options.source||options.sourceView||this.value.source||null;if(options.context)this.value.context={...this.value.context,...boundedMeta(options.context,'selection context')};return this.emit({reason:'select-many',...options});}
    setRange(range,options={}){
      const raw=range&&typeof range==='object'?range:{};const sourceRef=options.sourceRef||raw.sourceRef||raw.source||null;
      const bounds=options.bounds||raw.bounds||Object.fromEntries(Object.entries(raw).filter(([key])=>!['id','type','role','ref','source','sourceRef','meta'].includes(key)));
      const ref=raw.ref?normalizeReference(raw.ref):rangeReference(sourceRef,bounds,{artifactRevision:options.artifactRevision});
      const item=this.normalizeItem({type:options.type||raw.type||'data.range',id:raw.id||options.id||`range:${referenceIdentity(ref)}`,ref,role:options.role||raw.role||'range',meta:raw.meta},{type:options.type||raw.type||'data.range'});
      if(options.append)this.value.ranges=ensureCount([...this.value.ranges,item],LIMITS.ranges,'Selection range count');else this.value.ranges=item?[item]:[];this.value.source=options.source||options.sourceView||this.value.source||null;return this.emit({reason:'range',...options});
    }
    selectRegion(range,inputs=[],options={}){
      const raw=range&&typeof range==='object'?range:{};const sourceRef=options.sourceRef||raw.sourceRef||raw.source||null;
      const bounds=options.bounds||raw.bounds||Object.fromEntries(Object.entries(raw).filter(([key])=>!['id','type','role','ref','source','sourceRef','meta'].includes(key)));
      const ref=raw.ref?normalizeReference(raw.ref):rangeReference(sourceRef,bounds,{artifactRevision:options.artifactRevision});
      const rangeItem=this.normalizeItem({type:options.rangeType||raw.type||'data.range',id:raw.id||options.rangeId||`range:${referenceIdentity(ref)}`,ref,role:options.rangeRole||raw.role||'range',meta:raw.meta},{type:options.rangeType||raw.type||'data.range'});
      const rows=this.normalizeMany(inputs,options);
      if(options.appendRange&&rangeItem)this.value.ranges=ensureCount([...this.value.ranges,rangeItem],LIMITS.ranges,'Selection range count');else this.value.ranges=rangeItem?[rangeItem]:[];
      if(rows.length){this.value.items=this.spec.multiple===false?rows.slice(-1):rows;this.value.focus=this.value.items.at(-1)||null;}
      this.value.source=options.source||options.sourceView||this.value.source||null;if(options.context)this.value.context={...this.value.context,...boundedMeta(options.context,'selection context')};
      return this.emit({reason:'region-select',...options});
    }
    clearRange(options={}){this.value.ranges=[];return this.emit({reason:'range-clear',...options});}
    setContext(context={},options={}){this.value.context={...this.value.context,...boundedMeta(context,'selection context')};return this.emit({reason:'context',...options});}
    clear(options={}){this.value.items=[];this.value.focus=null;if(options.keepRanges!==true)this.value.ranges=[];if(options.keepContext!==true)this.value.context={};this.value.source=options.source||null;return this.emit({reason:'clear',...options});}
    restore(snapshot,meta={}){const source=snapshot&&typeof snapshot==='object'?snapshot:{};const items=this.normalizeMany(source.items||[]),focus=source.focus?this.normalizeItem(source.focus):null,ranges=ensureCount((source.ranges||[]).map(v=>this.normalizeItem(v)).filter(Boolean),LIMITS.ranges,'Selection range count');this.value={schema:SELECTION_SCHEMA,revision:Number(source.revision)||0,items,focus,ranges,context:boundedMeta(source.context||{},'selection context'),source:source.source||null};this.revision=this.value.revision;return this.emit({reason:'restore',...meta});}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.get(),{reason:'subscribe'},this);return()=>this.listeners.delete(fn);}
    dispose(){this.listeners.clear();this.value={schema:SELECTION_SCHEMA,revision:0,items:[],focus:null,ranges:[],context:{},source:null};}
  }

  class InteractionRuntime {
    constructor(scope,id,spec={}){
      this.scope=scope;this.owner=scope.owner;this.scopeId=scope.scopeId||nextInteractionScopeId(this.owner);this.id=String(id||'interaction');this.spec=spec||{};this.bindings=new Map();this.viewBindings=new Map();this.linkSubscriptions=new Set();this.stateListeners=new Map();this.stateLinkSubscriptions=new Map();this.seenTransactions=new Set();this.seenTransactionOrder=[];this.linkGroup=boundedText(spec.linkGroup||'',TRANSACTION_LIMITS.linkGroup,'linkGroup');this.suspended=false;this.entities=scope.entities||window.DKDSEntities?.createScope?.(this.owner)||null;
      this.selection=scope.selection.model(`${this.id}:selection`,spec.selection||spec.selectionSpec||{});
      this.entityChannel=`${this.owner}:${this.id}`;
      this.off=this.selection.subscribe((snapshot,meta)=>{
        const tx=this.transactionMeta(meta,{create:true,remote:meta?.remote===true});this.rememberTransaction(tx,{channel:'selection'});const enriched={...meta,transaction:tx,transactionId:tx.transactionId,projectId:tx.projectId,linkGroup:tx.linkGroup};
        try{Object.assign(meta,enriched);}catch{}
        this.syncEntities(snapshot,enriched);this.dispatch(snapshot,enriched);
        if(this.suspended||meta?.rebroadcast===false||tx.remote===true)return;
        try{window.dispatchEvent(new CustomEvent(INTERACTION_BRIDGE_EVENT,{detail:{channel:'selection',owner:this.owner,scopeId:this.scopeId,runtimeId:this.id,projectId:tx.projectId,linkGroup:tx.linkGroup,transactionId:tx.transactionId,transaction:tx,snapshot,meta:enriched}}));}catch{}
      });
      if(this.linkGroup&&spec.autoLink===true)this.link(this.linkGroup,spec.linkOptions||{});
    }
    currentProjectId(){return currentProjectId(this.scope);}
    scientificUnits(){return globalThis.DKDSScientificUnits||null;}
    axisCompatibility(sourceAxis,targetAxis){const units=this.scientificUnits();return units?.compatibility?.(sourceAxis,targetAxis)||Object.freeze({compatible:false,reason:'scientific-unit-runtime-unavailable'});}
    canLinkAxes(sourceAxis,targetAxis){return this.axisCompatibility(sourceAxis,targetAxis).compatible===true;}
    convertAxisValue(value,sourceAxis,targetAxis){const units=this.scientificUnits();if(!units?.convertAxisValue)throw new Error('Scientific unit runtime unavailable.');return units.convertAxisValue(value,sourceAxis,targetAxis);}
    convertAxisRange(range,sourceAxis,targetAxis){const units=this.scientificUnits();if(!units?.convertAxisRange)throw new Error('Scientific unit runtime unavailable.');return units.convertAxisRange(range,sourceAxis,targetAxis);}
    transactionMeta(meta={},options={}){return normalizeInteractionTransaction(meta,this,{create:options.create===true,remote:options.remote===true});}
    transactionCacheKey(value,options={}){
      const raw=transactionFrom(value),transactionId=boundedText(raw.transactionId||raw.id||(typeof value==='string'?value:''),TRANSACTION_LIMITS.id,'transactionId');if(!transactionId)return '';
      const channel=boundedText(options.channel||raw.channel||'selection',LINKED_STATE_LIMITS.channel,'linked state channel')||'selection';
      const projectId=boundedText(options.projectId||raw.projectId||this.currentProjectId(),TRANSACTION_LIMITS.projectId,'projectId');
      const linkGroup=boundedText(options.linkGroup||raw.linkGroup||this.linkGroup||'',TRANSACTION_LIMITS.linkGroup,'linkGroup');
      const part=value=>encodeURIComponent(String(value||''));return `${part(projectId)}::${part(channel)}::${part(linkGroup)}::${part(transactionId)}`;
    }
    rememberTransaction(value,options={}){const key=this.transactionCacheKey(value,options);if(!key||this.seenTransactions.has(key))return false;this.seenTransactions.add(key);this.seenTransactionOrder.push(key);while(this.seenTransactionOrder.length>TRANSACTION_LIMITS.seen){const stale=this.seenTransactionOrder.shift();this.seenTransactions.delete(stale);}return true;}
    hasSeenTransaction(value,options={}){const key=this.transactionCacheKey(value,options);return !!key&&this.seenTransactions.has(key);}
    lifecycle(state='active'){
      const value=String(state||'').toLowerCase();if(value==='hidden'||value==='suspended')this.suspended=true;else if(value==='visible'||value==='active'||value==='resumed')this.suspended=false;return this.lifecycleState();
    }
    lifecycleState(){return Object.freeze({suspended:this.suspended===true,selectionLinks:this.linkSubscriptions.size,stateLinks:this.stateLinkSubscriptions.size,stateListeners:[...this.stateListeners.values()].reduce((sum,row)=>sum+row.size,0),seenTransactions:this.seenTransactions.size});}
    subscribeState(channel,fn){const name=boundedText(channel,LINKED_STATE_LIMITS.channel,'linked state channel');if(!name||name==='selection'||typeof fn!=='function')return()=>{};let listeners=this.stateListeners.get(name);if(!listeners){listeners=new Set();this.stateListeners.set(name,listeners);}listeners.add(fn);return()=>{listeners.delete(fn);if(!listeners.size)this.stateListeners.delete(name);};}
    dispatchState(channel,state,meta={}){const listeners=this.stateListeners.get(String(channel||''));if(!listeners?.size)return state;for(const fn of [...listeners])try{fn(state,meta,this);}catch(err){console.warn('[DKDS linked interaction state]',channel,err);}return state;}
    publishState(channel,state,options={}){
      const name=boundedText(channel,LINKED_STATE_LIMITS.channel,'linked state channel'),payload=normalizeLinkedState(name,state),tx=this.transactionMeta({...options,linkGroup:options.linkGroup||this.linkGroup},{create:true,remote:false});this.rememberTransaction(tx,{channel:name});
      const meta={...options,channel:name,transaction:tx,transactionId:tx.transactionId,projectId:tx.projectId,linkGroup:tx.linkGroup,remote:false};this.dispatchState(name,payload,meta);
      if(this.suspended||options.rebroadcast===false)return Object.freeze({state:payload,transaction:tx});
      try{window.dispatchEvent(new CustomEvent(INTERACTION_BRIDGE_EVENT,{detail:{channel:name,owner:this.owner,scopeId:this.scopeId,runtimeId:this.id,projectId:tx.projectId,linkGroup:tx.linkGroup,transactionId:tx.transactionId,transaction:tx,state:payload,meta}}));}catch{}
      return Object.freeze({state:payload,transaction:tx});
    }
    applyRemoteState(channel,state,options={}){
      const name=boundedText(channel,LINKED_STATE_LIMITS.channel,'linked state channel'),payload=normalizeLinkedState(name,state),tx=this.transactionMeta(options,{create:false,remote:true});if(this.suspended||tx.projectId!==this.currentProjectId())return null;
      const expected=boundedText(options.linkGroup||this.linkGroup||'',TRANSACTION_LIMITS.linkGroup,'linkGroup');if(expected&&tx.linkGroup!==expected)return null;if(this.hasSeenTransaction(tx,{channel:name}))return null;this.rememberTransaction(tx,{channel:name});
      const meta={...options,channel:name,transaction:tx,transactionId:tx.transactionId,projectId:tx.projectId,linkGroup:tx.linkGroup,remote:true,rebroadcast:false};this.dispatchState(name,payload,meta);return payload;
    }
    linkState(channel,group=this.linkGroup,options={}){
      const name=boundedText(channel,LINKED_STATE_LIMITS.channel,'linked state channel'),linkGroup=boundedText(group,TRANSACTION_LIMITS.linkGroup,'linkGroup');if(!name||name==='selection')throw new Error('Linked interaction state channel required.');if(!linkGroup)throw new Error('Interaction link group required.');
      const key=`${name}::${linkGroup}`,existing=this.stateLinkSubscriptions.get(key);if(existing){existing.refs+=1;return()=>this.releaseStateLink(key);}
      const handler=event=>{const detail=event?.detail||{};if(detail.channel!==name)return;const tx=detail.transaction||detail.meta?.transaction||null;if(!tx||detail.scopeId===this.scopeId&&detail.runtimeId===this.id)return;if(String(tx.projectId||detail.projectId||'')!==this.currentProjectId())return;if(String(tx.linkGroup||detail.linkGroup||'')!==linkGroup)return;try{this.applyRemoteState(name,detail.state,{...options,transaction:tx,linkGroup,source:options.source||`linked-${name}`});}catch(err){console.warn('[DKDS linked interaction state]',name,err);}};
      window.addEventListener(INTERACTION_BRIDGE_EVENT,handler);this.stateLinkSubscriptions.set(key,{refs:1,handler});return()=>this.releaseStateLink(key);
    }
    releaseStateLink(key){const row=this.stateLinkSubscriptions.get(String(key||''));if(!row)return false;row.refs-=1;if(row.refs>0)return false;try{window.removeEventListener(INTERACTION_BRIDGE_EVENT,row.handler);}catch{}this.stateLinkSubscriptions.delete(String(key||''));return true;}
    unlinkStateAll(){for(const [key,row] of [...this.stateLinkSubscriptions]){try{window.removeEventListener(INTERACTION_BRIDGE_EVENT,row.handler);}catch{}this.stateLinkSubscriptions.delete(key);}this.stateListeners.clear();}
    syncEntities(snapshot,meta={}){
      if(!this.entities)return;
      for(const item of snapshot?.items||[]){if(!item?.id)continue;try{this.entities.upsert({id:item.id,type:item.type||'core.entity',label:item.meta?.label||item.id,ref:item.ref||null,metadata:{...(item.meta||{}),selectionRole:item.role||'',referenceIdentity:referenceIdentity(item.ref||{})}});}catch{}}
      try{window.DKDSEntities?.registry?.applySelection?.(this.entityChannel,snapshot,meta);}catch{}
    }
    itemMatches(binding,item,snapshot){
      if(!item)return false;
      const types=[...(binding.types||[])].map(String),roles=[...(binding.roles||[])].map(String),kinds=[...(binding.kinds||[])].map(String);
      if(types.length&&!types.some(type=>dataTypeRegistry.isA(item.type,type)))return false;
      if(roles.length&&!roles.includes(String(item.role||'')))return false;
      if(kinds.length){const kind=dataTypeRegistry.get(item.type)?.kind||'';if(!kinds.includes(kind))return false;}
      if(typeof binding.where==='function'&&!binding.where(item,snapshot,this))return false;
      return true;
    }
    matches(binding,snapshot){
      const mode=String(binding.mode||'focus');
      const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;
      if(mode==='range'){const rows=snapshot?.ranges||[];return rows.length?rows.some(item=>this.itemMatches(binding,item,snapshot)):binding.empty===true;}
      if(mode==='any'){const rows=snapshot?.items||[];return rows.length?rows.some(item=>this.itemMatches(binding,item,snapshot)):binding.empty===true;}
      if(mode==='all'){const rows=snapshot?.items||[];return rows.length?rows.every(item=>this.itemMatches(binding,item,snapshot)):binding.empty===true;}
      if(!focus)return binding.empty===true;
      return this.itemMatches(binding,focus,snapshot);
    }
    bind(id,spec={}){
      const key=String(id||`binding-${this.bindings.size+1}`);const row={id:key,types:Array.isArray(spec.types)?spec.types:(spec.type?[spec.type]:[]),roles:Array.isArray(spec.roles)?spec.roles:(spec.role?[spec.role]:[]),kinds:Array.isArray(spec.kinds)?spec.kinds:(spec.kind?[spec.kind]:[]),mode:['focus','any','all','range'].includes(String(spec.mode))?String(spec.mode):'focus',where:typeof spec.where==='function'?spec.where:null,empty:spec.empty===true,onSelection:spec.onSelection||spec.handler};
      this.bindings.set(key,row);
      if(spec.immediate&&this.matches(row,this.selection.get()))try{row.onSelection?.(this.selection.get(),{reason:'bind-immediate'},this);}catch(err){console.warn('[DKDS interaction binding]',err);}
      return()=>this.bindings.delete(key);
    }
    dispatch(snapshot,meta={}){for(const row of this.bindings.values()){if(!this.matches(row,snapshot))continue;try{row.onSelection?.(snapshot,meta,this);}catch(err){console.warn('[DKDS interaction runtime]',row.id,err);}}}
    resolveType(value,options={}){if(options.type)return dataTypeRegistry.resolveId(options.type);if(value?.type&&dataTypeRegistry.get(value.type))return dataTypeRegistry.resolveId(value.type);return dataTypeRegistry.infer(value,options.query||{})?.id||this.spec.defaultType||this.selection.spec.defaultType||'core.entity';}
    accepts(typeOrItem,acceptedTypes=this.spec.acceptTypes||[]){const type=typeof typeOrItem==='string'?typeOrItem:typeOrItem?.type;return !!type&&dataTypeRegistry.accepts(type,acceptedTypes);}
    importSelection(snapshot,options={}){const accepted=options.acceptTypes||this.spec.acceptTypes||[];const items=(snapshot?.items||[]).filter(item=>this.accepts(item,accepted));if(!items.length)return this.selection.get();return this.selection.selectMany(items,{...options,source:options.source||snapshot?.source||'selection-import'});}
    applyRemoteSelection(snapshot,options={}){
      const tx=this.transactionMeta(options,{create:false,remote:true});
      if(tx.projectId!==this.currentProjectId())return this.selection.get();
      const expected=boundedText(options.linkGroup||this.linkGroup||'',TRANSACTION_LIMITS.linkGroup,'linkGroup');if(expected&&tx.linkGroup!==expected)return this.selection.get();
      if(this.suspended)return this.selection.get();
      if(this.hasSeenTransaction(tx,{channel:'selection'}))return this.selection.get();this.rememberTransaction(tx,{channel:'selection'});
      const accepted=options.acceptTypes||this.spec.acceptTypes||[];const source=snapshot&&typeof snapshot==='object'?snapshot:{};const sourceItems=source.items||[],sourceRanges=source.ranges||[];const items=sourceItems.filter(item=>this.accepts(item,accepted));const itemKeys=new Set(items.map(item=>`${item.type}::${item.id}`));const focus=source.focus&&this.accepts(source.focus,accepted)&&itemKeys.has(`${source.focus.type}::${source.focus.id}`)?source.focus:(items.at(-1)||null);const ranges=sourceRanges.filter(item=>this.accepts(item,accepted));
      if((sourceItems.length||sourceRanges.length)&&!items.length&&!ranges.length)return this.selection.get();
      const imported={schema:SELECTION_SCHEMA,revision:Number(source.revision)||0,items,focus,ranges,context:source.context||{},source:source.source||options.source||'linked-selection'};
      return this.selection.restore(imported,{...options,reason:options.reason||'remote-selection',source:options.source||source.source||'linked-selection',remote:true,rebroadcast:false,transaction:tx,transactionId:tx.transactionId,projectId:tx.projectId,linkGroup:tx.linkGroup});
    }
    link(group=this.linkGroup,options={}){
      const linkGroup=boundedText(group,TRANSACTION_LIMITS.linkGroup,'linkGroup');if(!linkGroup)throw new Error('Interaction link group required.');this.linkGroup=linkGroup;
      const off=this.scope.selection.observe((snapshot,meta,detail)=>{
        const tx=detail?.transaction||meta?.transaction||null;if(!tx||detail?.scopeId===this.scopeId&&detail?.runtimeId===this.id)return;
        this.applyRemoteSelection(snapshot,{...options,transaction:tx,linkGroup,source:options.source||'linked-selection'});
      },{linkGroup,sameProject:true,excludeScopeId:this.scopeId,excludeRuntimeId:this.id});
      const wrapped=()=>{off?.();this.linkSubscriptions.delete(wrapped);};this.linkSubscriptions.add(wrapped);return wrapped;
    }
    unlinkAll(){for(const off of [...this.linkSubscriptions])off?.();this.linkSubscriptions.clear();}
    selectRef(ref,options={}){const normalized=normalizeReference(ref||{}),type=String(options.type||this.spec.defaultType||this.selection.spec.defaultType||'core.entity'),id=String(options.id||referenceIdentity(normalized)||'');if(!id)throw new Error('selectRef requires artifactId/seriesId/rowId/entityId identity or an explicit id.');return this.selection.select({type,id,ref:normalized,role:options.role,meta:options.meta},{...options,type,linkGroup:options.linkGroup||this.linkGroup});}
    select(value,options={}){const type=this.resolveType(value,options);return this.selection.select(value?.type?value:{type,id:options.id,value,role:options.role,meta:options.meta},{...options,type,linkGroup:options.linkGroup||this.linkGroup});}
    selectMany(values=[],options={}){return this.selection.selectMany((values||[]).map(value=>value?.type?value:{type:this.resolveType(value,options),id:options.key?.(value),value,role:options.role}),{...options,linkGroup:options.linkGroup||this.linkGroup});}
    range(value,options={}){const inferred=options.type||value?.type||dataTypeRegistry.infer(value,{kind:'region'})?.id||'data.range';return this.selection.setRange(value,{...options,type:inferred,linkGroup:options.linkGroup||this.linkGroup});}
    region(value,items=[],options={}){const inferred=options.rangeType||value?.type||dataTypeRegistry.infer(value,{kind:'region'})?.id||'data.range';return this.selection.selectRegion(value,items,{...options,rangeType:inferred,linkGroup:options.linkGroup||this.linkGroup});}
    context(value,options={}){return this.selection.setContext(value,{...options,linkGroup:options.linkGroup||this.linkGroup});}
    clear(options={}){return this.selection.clear({...options,linkGroup:options.linkGroup||this.linkGroup});}
    get(){return this.selection.get();}
    items(type=''){return this.selection.items(type);}
    focus(){return this.selection.focus();}
    resolve(item=this.selection.focus(),context={}){return item?dataTypeRegistry.resolve(item.type,item,{runtime:this,...context}):undefined;}
    subscribe(fn,options={}){return this.selection.subscribe(fn,options);}
    bindView(id,target,spec={}){
      const key=String(id||`view-${this.viewBindings.size+1}`);this.viewBindings.get(key)?.dispose?.();
      const {SelectionViewBinding}=require('./view-binding');const view=new SelectionViewBinding(this,key,target,spec);this.viewBindings.set(key,view);return view;
    }
    view(id){return this.viewBindings.get(String(id||''))||null;}
    dispose(){this.off?.();this.off=null;this.unlinkAll();this.unlinkStateAll();try{window.DKDSEntities?.registry?.clearSelectionChannel?.(this.entityChannel);}catch{}this.bindings.clear();for(const view of this.viewBindings.values())view.dispose?.();this.viewBindings.clear();this.seenTransactions.clear();this.seenTransactionOrder=[];}
  }

module.exports=Object.freeze({SelectionChannel, DataTypeRegistry, dataTypeRegistry, SelectionModel, InteractionRuntime, selectionReferences, interactionTransactions, nextInteractionScopeId, currentProjectId, SELECTION_SCHEMA, SELECTION_LIMITS:LIMITS, INTERACTION_BRIDGE_EVENT, LINKED_STATE_LIMITS});
