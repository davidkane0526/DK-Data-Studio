'use strict';


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
      const row=this.get(type);if(!row?.selection)return {value};
      try{
        const projected=row.selection(value,{...context,type:row,registry:this});
        if(projected&&typeof projected==='object'&&!Array.isArray(projected)&&('value' in projected||'ref' in projected||'id' in projected||'meta' in projected))return projected;
        return {value:projected};
      }catch(err){console.warn('[DKDS data type selection]',type,err);return {value};}
    }
    resolve(type,item,context={}){
      const row=this.get(type);if(!row?.resolve)return item?.value;
      try{return row.resolve(item?.ref??item?.value,{...context,type:row,item,registry:this});}
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
  dataTypeRegistry.register('core','science.iv.raw',{title:'原始 I–V',parents:['data.sweep','science.curve'],kind:'data',quantity:'current',shape:'curve',unit:'A',tags:['transport','iv','raw'],axes:[{name:'V',unit:'V'},{name:'I',unit:'A'}],metadata:{transformKey:'raw'}});
  dataTypeRegistry.register('core','science.transport.iv',{title:'输运 I–V 数据表',parent:'data.table',kind:'data',shape:'table',tags:['transport','iv','imported']});
  dataTypeRegistry.register('core','science.pulse.trace',{title:'脉冲/读取数据表',parent:'data.table',kind:'data',shape:'table',tags:['pulse','read','imported']});
  dataTypeRegistry.register('core','science.iv.background-removed',{title:'去背景 I–V',parents:['data.transform','science.curve'],kind:'data',quantity:'current',shape:'curve',unit:'A',tags:['transport','iv','transform'],metadata:{transformKey:'detrend'}});
  dataTypeRegistry.register('core','science.iv.derivative',{title:'I–V 导数',parents:['data.transform','science.curve'],kind:'data',shape:'curve',tags:['transport','iv','transform']});
  dataTypeRegistry.register('core','science.transport.didv',{title:'dI/dV',parent:'science.iv.derivative',kind:'data',quantity:'conductance',shape:'curve',unit:'A/V',tags:['transport','conductance','transform'],metadata:{transformKey:'didv'}});
  dataTypeRegistry.register('core','science.transport.d2idv2',{title:'d²I/dV²',parent:'science.iv.derivative',kind:'data',quantity:'second-derivative-current',shape:'curve',unit:'A/V²',tags:['transport','transform'],metadata:{transformKey:'d2idv2'}});
  dataTypeRegistry.register('core','science.transport.dlnabsidv',{title:'d ln|I|/dV',parent:'science.iv.derivative',kind:'data',quantity:'log-current-slope',shape:'curve',unit:'1/V',tags:['transport','transform'],metadata:{transformKey:'dlog'}});
  dataTypeRegistry.register('core','science.transport.dvdi',{title:'dV/dI',parents:['data.transform','science.curve'],kind:'data',quantity:'differential-resistance',shape:'curve',unit:'V/A',tags:['transport','resistance','transform'],metadata:{transformKey:'dvdi'}});
  dataTypeRegistry.register('core','science.transport.resistance',{title:'R = |V/I|',parents:['data.transform','science.curve'],kind:'data',quantity:'resistance',shape:'curve',unit:'Ω',tags:['transport','resistance','transform'],metadata:{transformKey:'resistance'}});
  dataTypeRegistry.register('core','science.transport.current-field',{title:'I(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'current',shape:'matrix',unit:'A',tags:['transport','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.background-removed-current-field',{title:'去背景 I(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'current',shape:'matrix',unit:'A',tags:['transport','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.conductance-field',{title:'dI/dV(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'conductance',shape:'matrix',unit:'A/V',tags:['transport','conductance','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.second-derivative-current-field',{title:'d²I/dV²(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'second-derivative-current',shape:'matrix',unit:'A/V²',tags:['transport','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.log-current-slope-field',{title:'d ln|I|/dV(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'log-current-slope',shape:'matrix',unit:'1/V',tags:['transport','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.differential-resistance-field',{title:'dV/dI(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'differential-resistance',shape:'matrix',unit:'V/A',tags:['transport','resistance','field','heatmap']});
  dataTypeRegistry.register('core','science.transport.resistance-field',{title:'R(Vd,Vg)',parent:'science.scalar-field',kind:'result',quantity:'resistance',shape:'matrix',unit:'Ω',tags:['transport','resistance','field','heatmap']});
  dataTypeRegistry.register('core','science.resonance.peak',{title:'共振峰',parents:['data.point','science.scalar'],kind:'result',quantity:'resonance-peak',shape:'point',tags:['resonance','peak']});
  dataTypeRegistry.register('core','science.resonance.peak-set',{title:'共振峰集合',parent:'result.analysis',kind:'result',quantity:'resonance-peaks',shape:'collection',tags:['resonance','peak','collection']});
  dataTypeRegistry.register('core','science.resonance.peak-metrics',{title:'共振峰度量',parent:'result.analysis',kind:'result',quantity:'resonance-peak-metrics',shape:'record',tags:['resonance','peak','metrics']});
  dataTypeRegistry.register('core','science.resonance.fwhm',{title:'FWHM',parent:'science.scalar',kind:'result',quantity:'width',shape:'scalar',unit:'V',tags:['resonance','width']});
  dataTypeRegistry.register('core','science.ter.value',{title:'TER',parent:'science.scalar',kind:'result',quantity:'ter',shape:'scalar',tags:['ter','transport']});
  dataTypeRegistry.register('core','science.ter.matrix',{title:'TER heatmap',parents:['science.scalar-field','result.matrix'],kind:'result',quantity:'ter',shape:'matrix',tags:['ter','transport','heatmap']});

  class SelectionModel {
    constructor(owner,id,spec={}){
      this.owner=String(owner||'');this.id=String(id||'selection');this.spec={multiple:true,...spec};this.listeners=new Set();this.revision=0;
      this.value={schema:1,revision:0,items:[],focus:null,ranges:[],context:{},source:null};
      if(spec.initial)this.restore(spec.initial,{reason:'initial'});
    }
    normalizeItem(input,options={}){
      if(input===null||input===undefined)return null;
      const raw=(input&&typeof input==='object'&&!Array.isArray(input))?input:{value:input};
      const type=String(options.type||raw.type||this.spec.defaultType||'core.entity');
      const normalized=dataTypeRegistry.normalize(type,raw.value!==undefined?raw.value:raw,{selection:this,owner:this.owner});
      // Selection is an interaction document, not a second data store. A type
      // may project large tables/sweeps/results into a compact value + ref while
      // the canonical data remains in the plugin/project artifact store.
      const projected=dataTypeRegistry.projectSelection(type,normalized,{selection:this,owner:this.owner});
      const projectedValue='value' in projected?projected.value:normalized;
      const id=String(raw.id||projected.id||dataTypeRegistry.key(type,normalized,{selection:this,owner:this.owner})||dataTypeRegistry.key(type,projectedValue,{selection:this,owner:this.owner})||`${type}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,8)}`);
      const projectedRef=projected.ref&&typeof projected.ref==='object'?projected.ref:null;
      const rawRef=raw.ref&&typeof raw.ref==='object'?raw.ref:null;
      return {type,id,role:String(raw.role||options.role||''),ref:rawRef?{...rawRef}:projectedRef?{...projectedRef}:null,value:projectedValue,meta:{...(projected.meta&&typeof projected.meta==='object'?projected.meta:{}),...(raw.meta&&typeof raw.meta==='object'?raw.meta:{})}};
    }
    snapshot(){try{return structuredClone(this.value);}catch{return JSON.parse(JSON.stringify(this.value));}}
    get(){return this.snapshot();}
    items(type=''){const rows=this.value.items.slice();return type?rows.filter(row=>dataTypeRegistry.isA(row.type,type)):rows;}
    focus(){if(!this.value.focus)return null;try{return structuredClone(this.value.focus);}catch{return {...this.value.focus};}}
    emit(meta={}){this.revision+=1;this.value.revision=this.revision;const snap=this.get();for(const fn of [...this.listeners]){try{fn(snap,meta,this);}catch(err){console.warn('[DKDS typed selection]',err);}}return snap;}
    select(input,options={}){
      const item=this.normalizeItem(input,options);if(!item)return this.clear(options);
      const key=`${item.type}::${item.id}`;let rows=this.value.items.slice();const idx=rows.findIndex(row=>`${row.type}::${row.id}`===key);
      if(options.toggle&&idx>=0)rows.splice(idx,1);else if(options.additive&&this.spec.multiple!==false){if(idx>=0)rows[idx]=item;else rows.push(item);}else rows=[item];
      this.value.items=rows;this.value.focus=rows.find(row=>`${row.type}::${row.id}`===key)||rows.at(-1)||null;
      this.value.source=options.source||options.sourceView||this.value.source||null;if(options.context)this.value.context={...this.value.context,...options.context};return this.emit({reason:'select',...options});
    }
    selectMany(inputs=[],options={}){const rows=(Array.isArray(inputs)?inputs:[inputs]).map(v=>this.normalizeItem(v,options)).filter(Boolean);this.value.items=this.spec.multiple===false?rows.slice(-1):rows;this.value.focus=this.value.items.at(-1)||null;this.value.source=options.source||options.sourceView||this.value.source||null;return this.emit({reason:'select-many',...options});}
    setRange(range,options={}){const item=this.normalizeItem({type:options.type||range?.type||'data.range',id:range?.id||'range',value:range,role:options.role||'range'});if(options.append)this.value.ranges=[...this.value.ranges,item];else this.value.ranges=item?[item]:[];this.value.source=options.source||options.sourceView||this.value.source||null;return this.emit({reason:'range',...options});}
    selectRegion(range,inputs=[],options={}){
      const rangeItem=this.normalizeItem({type:options.rangeType||range?.type||'data.range',id:range?.id||'range',value:range,role:options.rangeRole||'range'});
      const rows=(Array.isArray(inputs)?inputs:[inputs]).map(v=>this.normalizeItem(v,options)).filter(Boolean);
      if(options.appendRange&&rangeItem)this.value.ranges=[...this.value.ranges,rangeItem];else this.value.ranges=rangeItem?[rangeItem]:[];
      if(rows.length){this.value.items=this.spec.multiple===false?rows.slice(-1):rows;this.value.focus=this.value.items.at(-1)||null;}
      this.value.source=options.source||options.sourceView||this.value.source||null;if(options.context)this.value.context={...this.value.context,...options.context};
      return this.emit({reason:'region-select',...options});
    }
    clearRange(options={}){this.value.ranges=[];return this.emit({reason:'range-clear',...options});}
    setContext(context={},options={}){this.value.context={...this.value.context,...(context||{})};return this.emit({reason:'context',...options});}
    clear(options={}){this.value.items=[];this.value.focus=null;if(options.keepRanges!==true)this.value.ranges=[];if(options.keepContext!==true)this.value.context={};this.value.source=options.source||null;return this.emit({reason:'clear',...options});}
    restore(snapshot,meta={}){const source=snapshot&&typeof snapshot==='object'?snapshot:{};this.value={schema:1,revision:Number(source.revision)||0,items:(source.items||[]).map(v=>this.normalizeItem(v)).filter(Boolean),focus:source.focus?this.normalizeItem(source.focus):null,ranges:(source.ranges||[]).map(v=>this.normalizeItem(v)).filter(Boolean),context:source.context&&typeof source.context==='object'?{...source.context}:{},source:source.source||null};this.revision=this.value.revision;return this.emit({reason:'restore',...meta});}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.get(),{reason:'subscribe'},this);return()=>this.listeners.delete(fn);}
    dispose(){this.listeners.clear();this.value={schema:1,revision:0,items:[],focus:null,ranges:[],context:{},source:null};}
  }

  class InteractionRuntime {
    constructor(scope,id,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'interaction');this.spec=spec||{};this.bindings=new Map();this.viewBindings=new Map();this.entities=scope.entities||window.DKDSEntities?.createScope?.(this.owner)||null;
      this.selection=scope.selection.model(`${this.id}:selection`,spec.selection||spec.selectionSpec||{});
      this.entityChannel=`${this.owner}:${this.id}`;
      this.off=this.selection.subscribe((snapshot,meta)=>{this.syncEntities(snapshot,meta);this.dispatch(snapshot,meta);try{window.dispatchEvent(new CustomEvent('dkds:selection-changed',{detail:{owner:this.owner,runtimeId:this.id,snapshot,meta}}));}catch{}});
    }
    syncEntities(snapshot,meta={}){
      if(!this.entities)return;
      for(const item of snapshot?.items||[]){if(!item?.id)continue;try{this.entities.upsert({id:item.id,type:item.type||'core.entity',label:item.meta?.label||item.value?.label||item.value?.name||item.id,ref:item.ref||null,value:item.value,metadata:{...(item.meta||{}),selectionRole:item.role||''}});}catch{}}
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
    select(value,options={}){const type=this.resolveType(value,options);return this.selection.select(value?.type?value:{type,id:options.id,value,role:options.role,meta:options.meta},{...options,type});}
    selectMany(values=[],options={}){return this.selection.selectMany((values||[]).map(value=>value?.type?value:{type:this.resolveType(value,options),id:options.key?.(value),value,role:options.role}),options);}
    range(value,options={}){const inferred=options.type||value?.type||dataTypeRegistry.infer(value,{kind:'region'})?.id||'data.range';return this.selection.setRange(value,{...options,type:inferred});}
    region(value,items=[],options={}){const inferred=options.rangeType||value?.type||dataTypeRegistry.infer(value,{kind:'region'})?.id||'data.range';return this.selection.selectRegion(value,items,{...options,rangeType:inferred});}
    context(value,options={}){return this.selection.setContext(value,options);}
    clear(options={}){return this.selection.clear(options);}
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
    dispose(){this.off?.();this.off=null;try{window.DKDSEntities?.registry?.clearSelectionChannel?.(this.entityChannel);}catch{}this.bindings.clear();for(const view of this.viewBindings.values())view.dispose?.();this.viewBindings.clear();}
  }

module.exports=Object.freeze({SelectionChannel, DataTypeRegistry, dataTypeRegistry, SelectionModel, InteractionRuntime});
