(() => {
  if (window.DKDSUI) return;

  const VERSION = '6.8.0';
  const scopes = new Map();
  const hostState = {
    root: null,
    zones: new Map(),
    activity: () => '',
    status: () => {},
    storagePrefix: 'dkds.ui.layout.v6',
    layers: { canvasBase: 1400, globalBase: 2400, canvasSeq: 0, globalSeq: 0 }
  };

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isElement = value => !!value && value.nodeType === 1;
  const resolveElement = (value, root=document) => {
    if (isElement(value)) return value;
    if (typeof value === 'function') {
      try { return resolveElement(value(), root); } catch { return null; }
    }
    const selector = String(value || '').trim();
    if (!selector) return null;
    try { return root.querySelector(selector) || document.querySelector(selector); } catch { return null; }
  };
  // Strict local resolver for reusable view chrome. Unlike resolveElement(), this
  // never falls back to document.querySelector when a selector is absent from
  // its own card/panel. Cross-card fallback caused standard controls from many
  // PlotViews to accumulate in one unrelated chart header.
  const resolveScopedElement = (value, root=document) => {
    if (isElement(value)) return value;
    if (typeof value === 'function') {
      try { return resolveScopedElement(value(), root); } catch { return null; }
    }
    const selector=String(value||'').trim();
    if(!selector||!root?.querySelector)return null;
    try{return root.querySelector(selector);}catch{return null;}
  };
  const isTypingTarget = target => {
    if (!target) return false;
    const tag = String(target.tagName || '').toLowerCase();
    return ['input','textarea','select'].includes(tag) || !!target.isContentEditable;
  };
  const cleanupCall = fn => { try { fn?.(); } catch (err) { console.warn('[DKDS UI cleanup]', err); } };
  const readJson = (key, fallback={}) => {
    try { const value=JSON.parse(localStorage.getItem(key)||'null'); return value && typeof value==='object' ? value : fallback; } catch { return fallback; }
  };
  const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  function normalizeKeyName(key='') {
    const raw=String(key||'');
    const map={ ' ':'Space',Esc:'Escape',Del:'Delete',Left:'ArrowLeft',Right:'ArrowRight',Up:'ArrowUp',Down:'ArrowDown' };
    if(map[raw])return map[raw];
    if(raw.length===1)return raw.toUpperCase();
    return raw;
  }
  function eventChord(event) {
    const parts=[];
    if(event.ctrlKey||event.metaKey)parts.push('Ctrl');
    if(event.altKey)parts.push('Alt');
    if(event.shiftKey)parts.push('Shift');
    const key=normalizeKeyName(event.key);
    if(!['Control','Meta','Alt','Shift'].includes(key))parts.push(key);
    return parts.join('+');
  }
  function normalizeChord(chord='') {
    const parts=String(chord||'').split('+').map(x=>x.trim()).filter(Boolean);
    const mods=[];let key='';
    for(const part of parts){
      const p=part.toLowerCase();
      if(['ctrl','control','cmd','command','meta'].includes(p)){if(!mods.includes('Ctrl'))mods.push('Ctrl');continue;}
      if(p==='alt'||p==='option'){if(!mods.includes('Alt'))mods.push('Alt');continue;}
      if(p==='shift'){if(!mods.includes('Shift'))mods.push('Shift');continue;}
      key=normalizeKeyName(part);
    }
    return [...['Ctrl','Alt','Shift'].filter(x=>mods.includes(x)),key].filter(Boolean).join('+');
  }

  class ShortcutHub {
    constructor(){
      this.rows=[];
      this.bound=this.handle.bind(this);
      window.addEventListener('keydown',this.bound,true);
    }
    register(owner,id,spec={}){
      const row={owner:String(owner||''),id:String(id||spec.id||''),spec:{...spec},seq:Date.now()+Math.random()};
      row.spec.chord=normalizeChord(spec.chord||spec.key||'');
      this.rows.push(row);
      return ()=>{const i=this.rows.indexOf(row);if(i>=0)this.rows.splice(i,1);};
    }
    removeOwner(owner){this.rows=this.rows.filter(row=>row.owner!==owner);}
    handle(event){
      if(!event||event.defaultPrevented)return;
      const active=String(hostState.activity?.()||'');
      const chord=eventChord(event);
      const rows=this.rows.slice().sort((a,b)=>(Number(b.spec.priority)||0)-(Number(a.spec.priority)||0)||a.seq-b.seq);
      for(const row of rows){
        const s=row.spec;
        if(s.activity&&String(s.activity)!==active)continue;
        if(isTypingTarget(event.target)&&!s.allowTyping)continue;
        if(s.visible===false||s.enabled===false)continue;
        if(s.chord&&s.chord!==chord)continue;
        if(typeof s.when==='function'){
          let ok=false;try{ok=!!s.when({event,activity:active,owner:row.owner});}catch(err){console.warn('[DKDS UI shortcut when]',err);}
          if(!ok)continue;
        }
        if(!s.chord&&typeof s.match==='function'){
          let ok=false;try{ok=!!s.match(event,{activityId:active,pluginId:row.owner});}catch(err){console.warn('[DKDS UI shortcut match]',err);}
          if(!ok)continue;
        }
        if(!s.chord&&!s.match)continue;
        try{
          const handled=(s.handler||s.onInvoke)?.({event,activity:active,owner:row.owner})!==false;
          if(handled){event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();return;}
        }catch(err){console.error('[DKDS UI shortcut]',err);hostState.status?.(`快捷键执行失败：${err.message}`);return;}
      }
    }
  }
  const shortcutHub=new ShortcutHub();

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
      const view=new SelectionViewBinding(this,key,target,spec);this.viewBindings.set(key,view);return view;
    }
    view(id){return this.viewBindings.get(String(id||''))||null;}
    dispose(){this.off?.();this.off=null;try{window.DKDSEntities?.registry?.clearSelectionChannel?.(this.entityChannel);}catch{}this.bindings.clear();for(const view of this.viewBindings.values())view.dispose?.();this.viewBindings.clear();}
  }

  class HorizontalWheelScroller {
    constructor(owner,target,spec={}){
      this.owner=String(owner||'');this.target=resolveElement(target);this.spec={hideScrollbar:true,multiplier:1,revealPadding:12,...spec};this.cleanups=[];
      if(!this.target)throw new Error('HorizontalWheelScroller target not found.');
      this.target.classList.add('dkds-horizontal-wheel-scroll');if(this.spec.hideScrollbar!==false)this.target.classList.add('dkds-scrollbar-hidden');
      const wheel=event=>{
        if(this.spec.enabled===false||this.target.scrollWidth<=this.target.clientWidth+1)return;
        const dx=Number(event.deltaX)||0,dy=Number(event.deltaY)||0;
        const delta=(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>0?dx:dy)*Number(this.spec.multiplier||1);if(!delta)return;
        const before=this.target.scrollLeft;this.target.scrollLeft+=delta;
        if(this.target.scrollLeft!==before){event.preventDefault();event.stopPropagation();}
      };
      this.target.addEventListener('wheel',wheel,{passive:false});this.cleanups.push(()=>this.target.removeEventListener('wheel',wheel,{passive:false}));
    }
    reveal(element,{padding=this.spec.revealPadding,behavior='auto'}={}){
      const target=this.target,node=resolveElement(element);if(!target||!node||!target.contains?.(node))return false;
      const pad=Math.max(0,Number(padding)||0);
      // Prefer local geometry so revealing an item never scrolls the entire page.
      try{
        const tr=target.getBoundingClientRect?.(),er=node.getBoundingClientRect?.();
        if(tr&&er&&Number.isFinite(tr.left)&&Number.isFinite(er.left)){
          let delta=0;
          if(er.left<tr.left+pad)delta=er.left-(tr.left+pad);
          else if(er.right>tr.right-pad)delta=er.right-(tr.right-pad);
          if(Math.abs(delta)>.5){
            if(typeof target.scrollBy==='function')target.scrollBy({left:delta,top:0,behavior});
            else target.scrollLeft=(Number(target.scrollLeft)||0)+delta;
            return true;
          }
          return false;
        }
      }catch{}
      try{node.scrollIntoView({block:'nearest',inline:'nearest',behavior});return true;}catch{return false;}
    }
    dispose(){this.cleanups.splice(0).forEach(cleanupCall);this.target?.classList?.remove('dkds-horizontal-wheel-scroll','dkds-scrollbar-hidden');}
  }

  class SelectionViewBinding {
    constructor(runtime,id,target,spec={}){
      this.runtime=runtime;this.owner=runtime.owner;this.id=String(id||'selection-view');this.root=resolveElement(target);this.spec={selector:'[data-selection-key]',revealFocus:true,dimOthers:false,itemVariant:'',...spec};this.snapshot=runtime.get();this.lastFocusKey='';this.lastFocusElement=null;this.cleanups=[];this.scroller=null;
      if(!this.root)throw new Error(`Selection view target not found: ${this.id}`);
      this.root.classList.add('dkds-selection-view');this.root.dataset.dkdsSelectionView=this.id;
      if(this.spec.horizontalWheel===true)this.scroller=new HorizontalWheelScroller(this.owner,this.root,{hideScrollbar:this.spec.hideScrollbar!==false,multiplier:this.spec.wheelMultiplier||1});
      const click=event=>{
        if(typeof this.spec.onActivate!=='function')return;
        if(this.spec.ignore&&event.target?.closest?.(this.spec.ignore))return;
        const element=event.target?.closest?.(this.spec.selector);if(!element||!this.root.contains(element))return;
        try{this.spec.onActivate({event,element,key:this.itemKey(element,this.snapshot),snapshot:this.snapshot,runtime:this.runtime,view:this});}catch(err){console.warn('[DKDS selection view activate]',this.id,err);}
      };
      this.root.addEventListener('click',click);this.cleanups.push(()=>this.root.removeEventListener('click',click));
      this.off=runtime.subscribe((snapshot,meta)=>{this.snapshot=snapshot;this.apply(snapshot,meta);},{immediate:true});
      if(window.MutationObserver){this.observer=new MutationObserver(()=>this.apply(this.snapshot,{reason:'view-mutation',reveal:'if-needed'}));this.observer.observe(this.root,{childList:true,subtree:true});}
    }
    elements(){try{return [...this.root.querySelectorAll(this.spec.selector)];}catch{return [];}}
    itemKey(element,snapshot){
      try{if(typeof this.spec.itemKey==='function')return String(this.spec.itemKey(element,snapshot,this)||'');}catch(err){console.warn('[DKDS selection view itemKey]',this.id,err);}
      return String(element?.dataset?.selectionKey||element?.dataset?.selectionId||'');
    }
    focusKey(snapshot){
      try{if(typeof this.spec.focusKey==='function')return String(this.spec.focusKey(snapshot,this)||'');}catch(err){console.warn('[DKDS selection view focusKey]',this.id,err);}
      const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;return String(focus?.id||'');
    }
    selectedKeys(snapshot){
      try{if(typeof this.spec.selectedKeys==='function')return new Set([...(this.spec.selectedKeys(snapshot,this)||[])].map(String));}catch(err){console.warn('[DKDS selection view selectedKeys]',this.id,err);}
      return new Set((snapshot?.items||[]).map(item=>String(item?.id||'')).filter(Boolean));
    }
    apply(snapshot=this.snapshot,meta={}){
      const elements=this.elements(),elementKeys=new Set(elements.map(element=>this.itemKey(element,snapshot)).filter(Boolean));
      let focusKey=this.focusKey(snapshot);const rawFocusId=String(snapshot?.focus?.id||snapshot?.items?.at?.(-1)?.id||'');
      if(this.spec.entityLinked!==false&&rawFocusId&&(!focusKey||!elementKeys.has(focusKey))){const related=window.DKDSEntities?.registry?.closestInSet?.(rawFocusId,elementKeys);if(related)focusKey=related;}
      const selected=this.selectedKeys(snapshot),hasFocus=!!focusKey,variant=String(this.spec.itemVariant||'').trim();let focusElement=null;
      for(const element of elements){
        const key=this.itemKey(element,snapshot),focused=!!key&&key===focusKey,isSelected=!!key&&(selected.has(key)||focused),dimmed=!!(this.spec.dimOthers&&hasFocus&&!focused);
        element.classList.add('dkds-selection-item');if(variant)element.classList.add(`dkds-selection-${variant}`);
        element.classList.toggle('dkds-selection-focused',focused);element.classList.toggle('dkds-selection-selected',isSelected);element.classList.toggle('dkds-selection-dimmed',dimmed);
        if(focused){element.setAttribute('aria-current','true');focusElement=element;}else element.removeAttribute('aria-current');
        element.setAttribute('aria-selected',isSelected?'true':'false');
      }
      const elementReplaced=!!focusElement&&focusElement!==this.lastFocusElement;
      const focusChanged=focusKey!==this.lastFocusKey;
      const revealMode=meta?.reveal;
      const shouldReveal=this.spec.revealFocus!==false&&focusElement&&revealMode!==false&&(focusChanged||elementReplaced||revealMode===true||revealMode==='if-needed');
      this.lastFocusKey=focusKey;this.lastFocusElement=focusElement;
      if(shouldReveal){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,0));raf(()=>{
        if(!focusElement?.isConnected&&typeof focusElement?.isConnected==='boolean')return;
        if(this.scroller){this.scroller.reveal(focusElement,{padding:this.spec.revealPadding,behavior:'auto'});return;}
        try{focusElement.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}catch{}
      });}
      return focusElement;
    }
    refresh(options={}){return this.apply(this.snapshot,{reason:'refresh',...options});}
    dispose(){this.off?.();this.off=null;this.observer?.disconnect?.();this.scroller?.dispose?.();this.scroller=null;this.cleanups.splice(0).forEach(cleanupCall);for(const element of this.elements()){element.classList.remove('dkds-selection-item','dkds-selection-focused','dkds-selection-selected','dkds-selection-dimmed');element.removeAttribute('aria-current');element.removeAttribute('aria-selected');}delete this.root?.dataset?.dkdsSelectionView;if(this.runtime?.viewBindings?.get?.(this.id)===this)this.runtime.viewBindings.delete(this.id);}
  }

  class ResizeScheduler {
    constructor(scope){this.scope=scope;this.pending=null;this.raf=0;this.dispatching=false;this.disposed=false;this.suspended=false;}
    request(payload={},options={}){
      if(this.disposed)return;
      const emit=options.emit!==false;
      // Never allow a listener handling layout:resize to synchronously create
      // another layout event. Such requests are reduced to a chart-only refresh.
      const effectiveEmit=this.dispatching?false:emit;
      const previous=this.pending||{};
      this.pending={...previous,...payload,_emit:previous._emit===true||effectiveEmit};
      if(this.suspended){window.DKDSPerformance?.skip?.('ui.suspended-resize');return;}
      if(typeof document!=='undefined'&&document.hidden){window.DKDSPerformance?.skip?.('ui.hidden-resize');return;}
      if(this.raf)return;
      const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
      this.raf=raf(()=>this.flush());
    }
    flush(){
      if(this.disposed||this.suspended){this.raf=0;return;}this.raf=0;
      const payload=this.pending||{};this.pending=null;this.dispatching=true;
      try{
        if(payload._emit===true)this.scope.options.events?.emit?.('layout:resize',{pluginId:this.scope.owner,...Object.fromEntries(Object.entries(payload).filter(([k])=>k!=='_emit'))});
      }catch{}finally{this.dispatching=false;}
      for(const chart of this.scope.charts){try{if(!chart?.container||chart.container.offsetParent===null)continue;chart.resize?.();}catch{}}
      if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}
    }
    suspend(){if(this.disposed||this.suspended)return false;this.suspended=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;return true;}
    resume(){if(this.disposed||!this.suspended)return false;this.suspended=false;if(this.pending&&!this.raf){const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));this.raf=raf(()=>this.flush());}return true;}
    state(){return {suspended:this.suspended,pending:!!this.pending,scheduled:!!this.raf};}
    dispose(){this.disposed=true;if(this.raf){const cancel=globalThis.cancelAnimationFrame||clearTimeout;try{cancel(this.raf);}catch{}}this.raf=0;this.pending=null;this.suspended=false;}
  }

  class ContextMenu {
    constructor(owner,spec={}){
      this.owner=owner;this.spec=spec;this.element=null;
      this.boundOutsidePointer=this.handleOutsidePointer.bind(this);
      this.boundBlur=this.close.bind(this);
    }
    handleOutsidePointer(event){
      // The previous implementation closed on *every* window pointerdown in
      // capture phase. That removed the menu before a menu item's click event
      // could fire, making all ContextMenu-backed controls look dead (TER
      // layout and every portable-view placement menu). Only outside presses
      // may close the menu.
      if(this.element?.contains?.(event?.target))return;
      this.close();
    }
    open({x,y,items=[],context={}}={}){
      this.close();
      const el=document.createElement('div');el.className='dkds-context-menu';el.dataset.owner=this.owner;
      for(const item of items){
        if(typeof item.visible==='function'&&!item.visible(context))continue;if(item.visible===false)continue;
        if(item.type==='separator'){const sep=document.createElement('div');sep.className='dkds-context-separator';el.appendChild(sep);continue;}
        const b=document.createElement('button');b.type='button';b.className='dkds-context-item';b.disabled=typeof item.enabled==='function'?!item.enabled(context):item.enabled===false;
        b.innerHTML=`${item.icon?`<span>${esc(item.icon)}</span>`:''}<span>${esc(typeof item.label==='function'?item.label(context):item.label||item.id||'')}</span>${item.shortcut?`<kbd>${esc(item.shortcut)}</kbd>`:''}`;
        b.onclick=e=>{e.stopPropagation();if(b.disabled)return;this.close();item.onInvoke?.({...context,event:e,item});};el.appendChild(b);
      }
      if(!el.children.length)return null;
      document.body.appendChild(el);this.element=el;
      const rect=el.getBoundingClientRect();const left=Math.max(6,Math.min(window.innerWidth-rect.width-6,Number(x)||0));const top=Math.max(6,Math.min(window.innerHeight-rect.height-6,Number(y)||0));el.style.left=`${left}px`;el.style.top=`${top}px`;
      queueMicrotask(()=>{window.addEventListener('pointerdown',this.boundOutsidePointer,true);window.addEventListener('blur',this.boundBlur,{once:true});});
      return el;
    }
    close(){
      window.removeEventListener('pointerdown',this.boundOutsidePointer,true);
      window.removeEventListener('blur',this.boundBlur);
      const hadElement=!!this.element;
      if(this.element){this.element.remove();this.element=null;}
      if(hadElement){try{this.spec.onClose?.();}catch{}}
    }
    dispose(){this.close();}
  }

  class ActionGroup {
    constructor(owner,container,spec={}){
      this.owner=owner;this.container=resolveElement(container);this.spec={...spec};this.actions=[];this.state={};this.cleanups=[];this.menu=null;
      if(!this.container)throw new Error('ActionGroup container not found.');
      this.container.classList.add('dkds-action-group');
      if(spec.className)this.container.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      this.setActions(spec.actions||[]);
    }
    setActions(actions=[]){this.actions=Array.isArray(actions)?actions.slice():[];this.render();return this;}
    update(state={}){this.state={...this.state,...state};this.render();return this;}
    value(value,ctx){return typeof value==='function'?value({...this.state,...ctx}):value;}
    render(){
      this.cleanups.splice(0).forEach(cleanupCall);
      this.container.innerHTML='';
      const ordered=this.actions.slice().sort((a,b)=>(Number(a.order)||100)-(Number(b.order)||100));
      for(const action of ordered){
        const ctx={action,group:this};
        if(this.value(action.visible,ctx)===false)continue;
        if(action.type==='separator'){const sep=document.createElement('span');sep.className='dkds-action-separator';this.container.appendChild(sep);continue;}
        const button=document.createElement('button');
        button.type='button';button.className=`dkds-action-button ${action.className||''}`.trim();button.dataset.actionId=String(action.id||'');
        const label=this.value(action.label,ctx)??action.id??'';
        const icon=this.value(action.icon,ctx);
        const active=!!this.value(action.active,ctx);const enabled=this.value(action.enabled,ctx)!==false;
        button.classList.toggle('active',active);button.disabled=!enabled;
        button.title=String(this.value(action.title,ctx)||'');
        button.innerHTML=`${icon?`<span class="dkds-action-icon">${esc(icon)}</span>`:''}<span class="dkds-action-label">${esc(label)}</span>${action.menu?'<span class="dkds-action-caret">▾</span>':''}`;
        button.addEventListener('click',event=>{
          if(button.disabled)return;
          const invokeContext={event,action,group:this,state:this.state,button};
          const rawItems=typeof action.items==='function'?action.items(invokeContext):action.items;
          if(action.menu&&Array.isArray(rawItems)){
            this.menu?.dispose?.();
            const rect=button.getBoundingClientRect();
            this.menu=new ContextMenu(this.owner);
            this.menu.open({x:rect.left,y:rect.bottom+4,items:rawItems,context:invokeContext});
            return;
          }
          (action.onInvoke||action.handler)?.(invokeContext);
        });
        this.container.appendChild(button);
        if(action.shortcut){
          this.cleanups.push(shortcutHub.register(this.owner,`action:${action.id}`,{chord:action.shortcut,activity:action.activity||this.spec.activity,priority:action.priority||0,allowTyping:action.allowTyping,handler:()=>{if(button.disabled||button.offsetParent===null)return false;button.click();return true;}}));
        }
      }
      return this;
    }
    dispose(){this.menu?.dispose?.();this.menu=null;this.cleanups.splice(0).forEach(cleanupCall);this.container?.replaceChildren();}
  }

  class InteractionBinding {
    constructor(owner,target,spec={}){
      this.owner=owner;this.target=resolveElement(target);this.spec=spec;this.cleanups=[];this.drag=null;
      if(!this.target)throw new Error('Interaction target not found.');
      this.bind();
    }
    add(name,fn,opts){this.target.addEventListener(name,fn,opts);this.cleanups.push(()=>this.target.removeEventListener(name,fn,opts));}
    mods(event){return {shift:!!event.shiftKey,ctrl:!!event.ctrlKey||!!event.metaKey,alt:!!event.altKey};}
    bind(){
      const s=this.spec;
      if(s.click)this.add('click',e=>s.click({event:e,mods:this.mods(e),target:this.target}));
      if(s.doubleClick)this.add('dblclick',e=>s.doubleClick({event:e,mods:this.mods(e),target:this.target}));
      if(s.contextMenu)this.add('contextmenu',e=>{if(s.preventContext!==false)e.preventDefault();s.contextMenu({event:e,mods:this.mods(e),target:this.target});});
      if(s.wheel)this.add('wheel',e=>s.wheel({event:e,mods:this.mods(e),target:this.target}),{passive:s.passiveWheel===true});
      if(s.drag){
        this.add('pointerdown',e=>{
          if(e.button!==0&&s.drag.anyButton!==true)return;
          const rect=this.target.getBoundingClientRect();
          this.drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:e.clientX,y:e.clientY,rect,mods:this.mods(e),moved:false};
          try{this.target.setPointerCapture?.(e.pointerId);}catch{}
          s.drag.start?.({event:e,drag:this.drag,target:this.target});
        });
        this.add('pointermove',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;d.x=e.clientX;d.y=e.clientY;d.dx=d.x-d.sx;d.dy=d.y-d.sy;d.moved=d.moved||Math.hypot(d.dx,d.dy)>=(s.drag.threshold||4);s.drag.move?.({event:e,drag:d,target:this.target});});
        const end=e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;this.drag=null;s.drag.end?.({event:e,drag:d,target:this.target});};
        this.add('pointerup',end);this.add('pointercancel',end);
      }
    }
    dispose(){this.cleanups.splice(0).forEach(cleanupCall);}
  }

  function normalizePlacement(value){const p=String(value||'').toLowerCase();return ['home','sticky','left','right','bottom','main','float','global'].includes(p)?p:'home';}
  function refreshDockZoneState(){
    const zones=new Set();
    for(const name of ['left','right','bottom']){const zone=hostState.zones.get(name);if(zone)zones.add(zone);}
    for(const zone of document.querySelectorAll('.dkds-portable-zone'))zones.add(zone);
    for(const zone of zones){
      zone.classList.toggle('active',[...zone.children].some(child=>child.classList?.contains('dkds-portable-view')||child.classList?.contains('dkds-prime-portable')));
    }
  }

  class PortableView {
    constructor(scope,id,node,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id);this.node=resolveElement(node);this.spec={...spec};this.allowed=[...new Set((spec.placements||['home','float','right','bottom']).map(normalizePlacement))];
      if(!this.node)throw new Error(`Portable view target not found: ${id}`);
      const homeParent=this.node.parentNode||null;
      const homeAnchor=homeParent?document.createComment(`dkds-portable-home:${this.owner}:${this.id}`):null;
      if(homeParent&&homeAnchor)homeParent.insertBefore(homeAnchor,this.node);
      this.original={parent:homeParent,next:this.node.nextSibling||null,anchor:homeAnchor};this.wrapper=null;this.dragCleanup=null;this.resizeObserver=null;this.resizeFrame=0;this.chromeCleanups=[];this.contextMenu=null;
      this.ensureWrapper();
      const saved=this.readState();
      const requested=saved.placement||spec.defaultPlacement||'home';
      this.place(requested,{persist:false,bounds:saved.bounds});
    }
    storageKey(){const version=String(this.spec.stateVersion||'').trim().replace(/[^a-zA-Z0-9_.-]+/g,'-');return `${hostState.storagePrefix}.${this.owner}.${this.id}${version?`.${version}`:''}`;}
    readState(){return readJson(this.storageKey(),{});}
    writeState(extra={}){const prev=this.readState();writeJson(this.storageKey(),{...prev,...extra});}
    ensureWrapper(){
      const useTarget=this.spec.useTargetAsWrapper===true;
      const wrapper=useTarget?this.node:document.createElement('section');
      wrapper.classList.add('dkds-portable-view');wrapper.dataset.portableId=this.id;
      let header=useTarget?resolveElement(this.spec.handle||'.analysis-chart-title',wrapper):null;
      if(!header){header=document.createElement('header');header.className='dkds-portable-header drag-handle';if(useTarget)wrapper.prepend(header);}
      else header.classList.add('dkds-portable-inline-header','drag-handle');
      let title=header.querySelector?.('.dkds-portable-title');
      if(!title&&!useTarget){title=document.createElement('div');title.className='dkds-portable-title';title.textContent=this.spec.title||this.node.getAttribute('aria-label')||this.id;header.appendChild(title);}
      const controls=document.createElement('div');controls.className='dkds-portable-controls dkds-portable-breadcrumb';controls.dataset.dkdsPortableControls=this.id;
      const placementIcons={home:'◫',sticky:'⌖',left:'←',main:'◫',right:'→',bottom:'↓',float:'↗',global:'⤢'};
      const placementLongLabels={home:'恢复默认位置',sticky:'在当前滚动区吸附',left:'固定到左侧',main:'固定到主区域',right:'固定到右侧',bottom:'固定到底部',float:'画布悬浮 / 边缘吸附',global:'全界面自由悬浮'};
      const placementButton=document.createElement('button');placementButton.type='button';placementButton.className='dkds-portable-placement-trigger';placementButton.title='图表位置';
      const refreshPlacementButton=()=>{const current=normalizePlacement(this.wrapper?.dataset?.placement||'home');placementButton.innerHTML=`<span class="dkds-portable-location-icon">${esc(placementIcons[current]||'◫')}</span><span class="dkds-portable-caret">▾</span>`;placementButton.setAttribute('aria-label',`图表位置：${placementLongLabels[current]||current}`);};
      const menuItems=()=>this.allowed.map(placement=>({id:placement,icon:placementIcons[placement]||'◫',label:placementLongLabels[placement]||placement,enabled:()=>this.wrapper.dataset.placement!==placement,onInvoke:()=>this.place(placement)}));
      const showPlacementMenu=(event)=>{event?.stopPropagation?.();event?.preventDefault?.();this.contextMenu?.dispose?.();const rect=placementButton.getBoundingClientRect();const x=Number.isFinite(event?.clientX)&&event.clientX>0?event.clientX:rect.left;const y=Number.isFinite(event?.clientY)&&event.clientY>0?event.clientY:rect.bottom+4;const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x,y,items:menuItems()});};
      placementButton.addEventListener('click',showPlacementMenu);controls.appendChild(placementButton);
      const controlsHost=resolveElement(this.spec.controlsHost,wrapper)||header;
      if(this.spec.controlsPlacement==='start')controlsHost.prepend(controls);else controlsHost.appendChild(controls);
      this.refreshPlacementButton=refreshPlacementButton;refreshPlacementButton();
      const toggleFloat=e=>{if(e.target.closest('button'))return;e.preventDefault();const preferred=this.allowed.includes('global')&&!this.allowed.includes('float')?'global':'float';this.place(this.wrapper.dataset.placement===preferred?'home':preferred);};
      const openPlacementMenu=e=>{if(e.target.closest('button'))return;e.preventDefault();this.contextMenu?.dispose?.();const menu=this.contextMenu=new ContextMenu(this.owner);menu.open({x:e.clientX,y:e.clientY,items:menuItems()});};
      header.addEventListener('dblclick',toggleFloat);header.addEventListener('contextmenu',openPlacementMenu);
      this.chromeCleanups.push(()=>header.removeEventListener('dblclick',toggleFloat),()=>header.removeEventListener('contextmenu',openPlacementMenu));
      if(!useTarget){wrapper.append(header);this.node.parentNode?.insertBefore(wrapper,this.node);wrapper.appendChild(this.node);}
      this.wrapper=wrapper;this.injectedHeader=useTarget&&!resolveElement(this.spec.handle||'.analysis-chart-title',wrapper)?header:null;this.controls=controls;this.useTargetAsWrapper=useTarget;
      const bindChromeAction=(selector,handler)=>{const el=resolveScopedElement(selector,wrapper);if(!el||typeof handler!=='function')return null;const fn=e=>{e.preventDefault();e.stopPropagation();handler(e,this);};el.addEventListener('click',fn);this.chromeCleanups.push(()=>el.removeEventListener('click',fn));return el;};
      const closeButton=bindChromeAction(this.spec.closeSelector,()=>this.spec.onClose?.({id:this.id,portable:this,wrapper:this.wrapper}));
      if(closeButton){closeButton.classList.add('dkds-portable-icon-action','dkds-portable-close-action');closeButton.textContent='×';closeButton.title=String(this.spec.closeTitle||'关闭');closeButton.setAttribute('aria-label',closeButton.title);}
      const collapseButton=bindChromeAction(this.spec.collapseSelector,()=>this.toggleCollapsed());
      if(collapseButton){collapseButton.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');collapseButton.textContent='−';collapseButton.title=String(this.spec.collapseTitle||'缩小');collapseButton.setAttribute('aria-label',collapseButton.title);}
      const activatePointer=()=>{if(this.wrapper?.classList?.contains('is-floating'))this.raiseLayer();};
      wrapper.addEventListener('pointerdown',activatePointer,true);this.chromeCleanups.push(()=>wrapper.removeEventListener('pointerdown',activatePointer,true));
      const savedState=this.readState();if(savedState.collapsed===true)this.setCollapsed(true,{persist:false});
      const requestPortableResize=()=>{this.scope.requestChartResize?.({id:this.id,reason:'portable-resize'});if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=requestAnimationFrame(()=>{this.resizeFrame=0;for(const plot of this.wrapper.querySelectorAll?.('.js-plotly-plot')||[]){try{window.DKDSCharts?.resize?.(plot);}catch{}}});};
      const ro=window.ResizeObserver?new ResizeObserver(requestPortableResize):null;ro?.observe(wrapper);this.resizeObserver=ro;
    }
    zone(placement){return this.spec.layout?.slot?.(placement)||hostState.zones.get(placement)||null;}
    restoreHome(){
      const {parent,next,anchor}=this.original;
      if(anchor?.parentNode){anchor.parentNode.insertBefore(this.wrapper,anchor.nextSibling);return true;}
      if(parent?.isConnected){if(next?.parentNode===parent)parent.insertBefore(this.wrapper,next);else parent.appendChild(this.wrapper);return true;}return false;
    }
    place(value,{persist=true,bounds=null}={}){
      let placement=normalizePlacement(value);if(!this.allowed.includes(placement))placement=this.allowed[0]||'home';
      this.wrapper.classList.remove('is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main');
      this.wrapper.style.removeProperty('left');this.wrapper.style.removeProperty('top');this.wrapper.style.removeProperty('width');this.wrapper.style.removeProperty('height');this.wrapper.style.removeProperty('--dkds-portable-z');
      cleanupCall(this.dragCleanup);this.dragCleanup=null;
      if(placement==='home')this.restoreHome();
      else if(placement==='sticky'){this.restoreHome();this.wrapper.classList.add('is-sticky');}
      else if(placement==='float'||placement==='global'){
        const zone=placement==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);zone.appendChild(this.wrapper);this.wrapper.classList.add('is-floating');if(placement==='global')this.wrapper.classList.add('is-global-floating');this.wrapper.dataset.placement=placement;
        const saved=bounds||this.readState().bounds||{};
        const zoneRect=zone.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight};
        const rect=this.wrapper.getBoundingClientRect();
        const defaultLeft=Math.max(8,Math.min(Math.max(8,(zoneRect.width||window.innerWidth)-420),(rect.left||zoneRect.left+80)-zoneRect.left));
        const defaultTop=Math.max(8,Math.min(Math.max(8,(zoneRect.height||window.innerHeight)-180),(rect.top||zoneRect.top+60)-zoneRect.top));
        this.wrapper.style.left=`${Number.isFinite(Number(saved.left))?Number(saved.left):defaultLeft}px`;
        this.wrapper.style.top=`${Number.isFinite(Number(saved.top))?Number(saved.top):defaultTop}px`;
        this.wrapper.style.width=`${Number(saved.width)||Math.max(360,Math.min(zoneRect.width||window.innerWidth,rect.width||520))}px`;
        if(Number(saved.height)>160)this.wrapper.style.height=`${Number(saved.height)}px`;
        this.avoidFloatOverlap();this.raiseLayer();
        this.dragCleanup=this.bindFloatDrag(placement);
      }else{
        const zone=this.zone(placement);if(zone)zone.appendChild(this.wrapper);else this.restoreHome();
        this.wrapper.classList.add('is-docked',`dock-${placement}`);
      }
      this.wrapper.dataset.placement=placement;
      this.refreshPlacementButton?.();
      refreshDockZoneState();
      if(persist)this.writeState({placement,bounds:(placement==='float'||placement==='global')?this.bounds():undefined});
      try{this.spec.onPlacementChanged?.({id:this.id,placement,portable:this,wrapper:this.wrapper});}catch(err){console.warn('[DKDS portable placement]',err);}
      this.scope.emitResize?.({id:this.id,reason:'portable-place',placement});
      return placement;
    }
    bounds(){const r=this.wrapper.getBoundingClientRect();const placement=normalizePlacement(this.wrapper?.dataset?.placement);const zone=placement==='global'?(this.zone('global')||hostState.root):(this.zone('overlay')||hostState.root);const z=zone?.getBoundingClientRect?.()||{left:0,top:0};return {left:Math.round(r.left-z.left),top:Math.round(r.top-z.top),width:Math.round(r.width),height:Math.round(r.height)};}
    raiseLayer(){
      if(!this.wrapper?.classList?.contains('is-floating'))return 0;
      const global=this.wrapper.classList.contains('is-global-floating');const layers=hostState.layers||{};const key=global?'globalSeq':'canvasSeq';const base=Number(global?layers.globalBase:layers.canvasBase)||(global?2400:1400);let seq=(Number(layers[key])||0)+1;if(seq>360)seq=1;layers[key]=seq;const z=base+seq;this.wrapper.style.setProperty('--dkds-portable-z',String(z));return z;
    }
    avoidFloatOverlap(){
      const placement=normalizePlacement(this.wrapper?.dataset?.placement);const zone=placement==='global'?(this.zone('global')||hostState.root):this.zone('overlay');if(!zone||!['float','global'].includes(placement)&&!this.wrapper.classList.contains('is-floating'))return this.bounds();
      const z=zone.getBoundingClientRect?.();if(!z?.width||!z?.height)return this.bounds();
      const gap=Math.max(6,Number(this.spec.collisionGap)||10),current=this.bounds(),width=Math.min(current.width,z.width),height=Math.min(current.height,z.height);
      const clamp=(left,top)=>({left:Math.max(0,Math.min(Math.max(0,z.width-width),left)),top:Math.max(0,Math.min(Math.max(0,z.height-height),top)),width,height});
      const intersects=(a,b)=>a.left<b.left+b.width+gap&&a.left+a.width+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
      const peers=[...zone.querySelectorAll('.dkds-portable-view.is-floating')].filter(el=>el!==this.wrapper).map(el=>{const r=el.getBoundingClientRect();return {left:r.left-z.left,top:r.top-z.top,width:r.width,height:r.height};});
      let start=clamp(current.left,current.top);if(!peers.some(peer=>intersects(start,peer))){this.wrapper.style.left=`${start.left}px`;this.wrapper.style.top=`${start.top}px`;return start;}
      const candidates=[];for(const peer of peers){candidates.push(clamp(peer.left+peer.width+gap,start.top),clamp(peer.left-width-gap,start.top),clamp(start.left,peer.top+peer.height+gap),clamp(start.left,peer.top-height-gap));}
      candidates.push(clamp(gap,gap),clamp(z.width-width-gap,gap),clamp(gap,z.height-height-gap),clamp(z.width-width-gap,z.height-height-gap));
      const viable=candidates.filter(candidate=>!peers.some(peer=>intersects(candidate,peer))).sort((a,b)=>(Math.abs(a.left-start.left)+Math.abs(a.top-start.top))-(Math.abs(b.left-start.left)+Math.abs(b.top-start.top)));
      const next=viable[0]||start;this.wrapper.style.left=`${next.left}px`;this.wrapper.style.top=`${next.top}px`;return next;
    }
    pin(placement='right'){return this.place(placement);}
    float(){return this.place('float');}
    globalFloat(){return this.place('global');}
    setCollapsed(value,{persist=true}={}){const collapsed=!!value;this.wrapper?.classList?.toggle('is-collapsed',collapsed);this.wrapper?.classList?.toggle('collapsed',collapsed);const button=resolveScopedElement(this.spec.collapseSelector,this.wrapper);if(button){button.classList.add('dkds-portable-icon-action','dkds-portable-collapse-action');button.textContent=collapsed?String(this.spec.expandIcon||'+'):String(this.spec.collapseIcon||'−');button.title=collapsed?String(this.spec.expandTitle||'展开'):String(this.spec.collapseTitle||'缩小');button.setAttribute('aria-label',button.title);}if(persist)this.writeState({collapsed});try{this.spec.onCollapse?.({id:this.id,collapsed,portable:this,wrapper:this.wrapper});}catch{}this.scope.emitResize?.({id:this.id,reason:'portable-collapse',collapsed});return collapsed;}
    toggleCollapsed(){return this.setCollapsed(!this.wrapper?.classList?.contains('is-collapsed'));}
    bindFloatDrag(mode='float'){
      const head=this.wrapper.querySelector('.drag-handle')||this.wrapper.querySelector('.dkds-portable-header');if(!head)return ()=>{};let state=null;
      const down=e=>{if(e.button!==0||e.target.closest('button'))return;this.raiseLayer();const r=this.wrapper.getBoundingClientRect();state={dx:e.clientX-r.left,dy:e.clientY-r.top};e.preventDefault();};
      const move=e=>{if(!state)return;const zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body);const z=zone?.getBoundingClientRect?.()||{left:0,top:0,width:window.innerWidth,height:window.innerHeight},r=this.wrapper.getBoundingClientRect();this.wrapper.style.left=`${Math.max(0,Math.min(Math.max(0,z.width-r.width),e.clientX-state.dx-z.left))}px`;this.wrapper.style.top=`${Math.max(0,Math.min(Math.max(0,z.height-r.height),e.clientY-state.dy-z.top))}px`;};
      const up=()=>{if(!state)return;state=null;
        const r=this.wrapper.getBoundingClientRect(),snap=Math.max(24,Number(this.spec.snapDistance)||44),zone=mode==='global'?(this.zone('global')||hostState.root||document.body):(this.zone('overlay')||hostState.root||document.body),z=zone?.getBoundingClientRect?.()||{left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
        if(mode==='float'&&this.spec.snap!==false){
          if(r.left-z.left<=snap&&this.allowed.includes('left')){this.place('left');return;}
          if(z.right-r.right<=snap&&this.allowed.includes('right')){this.place('right');return;}
          if(z.bottom-r.bottom<=snap&&this.allowed.includes('bottom')){this.place('bottom');return;}
        }
        this.avoidFloatOverlap();this.writeState({placement:mode,bounds:this.bounds()});
      };
      head.addEventListener('mousedown',down);window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);
      return ()=>{head.removeEventListener('mousedown',down);window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
    }
    dispose(){cleanupCall(this.dragCleanup);this.contextMenu?.dispose?.();this.contextMenu=null;this.chromeCleanups.splice(0).forEach(cleanupCall);this.resizeObserver?.disconnect?.();if(this.resizeFrame)cancelAnimationFrame(this.resizeFrame);this.resizeFrame=0;this.restoreHome();this.controls?.remove?.();if(this.useTargetAsWrapper){this.wrapper?.classList?.remove('dkds-portable-view','is-floating','is-global-floating','is-sticky','is-docked','dock-left','dock-right','dock-bottom','dock-main','is-collapsed','collapsed');delete this.wrapper?.dataset?.portableId;delete this.wrapper?.dataset?.placement;}else if(this.wrapper?.parentNode){this.wrapper.parentNode.insertBefore(this.node,this.wrapper);this.wrapper.remove();}this.original?.anchor?.remove?.();if(this.scope?.portables?.get?.(this.id)===this)this.scope.portables.delete(this.id);refreshDockZoneState();}
  }

  class SplitController {
    constructor(scope,spec={}){
      this.scope=scope;this.spec={axis:'x',min:180,max:null,defaultSize:320,...spec};this.container=resolveElement(spec.container);this.handle=resolveElement(spec.handle,this.container||document);this.target=resolveElement(spec.target,this.container||document)||this.container;this.axis=this.spec.axis==='y'?'y':'x';this.cleanups=[];this.drag=null;
      if(!this.container||!this.handle||!this.target)throw new Error('SplitController container/handle/target not found.');
      this.key=`${hostState.storagePrefix}.${scope.owner}.split.${String(spec.id||'default')}`;
      const saved=readJson(this.key,{});this.apply(Number(saved.size)||Number(this.spec.defaultSize)||320,{persist:false});this.bind();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply(this.size,{persist:false,emit:false}));this.ro.observe(this.container);}
    }
    limits(){const rect=this.container.getBoundingClientRect();const total=this.axis==='x'?rect.width:rect.height;const min=Math.max(0,Number(this.spec.min)||0);const configured=Number(this.spec.max);const max=Number.isFinite(configured)&&configured>0?configured:Math.max(min,total-Math.max(120,Number(this.spec.reserve)||220));return {min,max:Math.max(min,max)};}
    apply(value,{persist=true,emit=true}={}){const {min,max}=this.limits();const next=Math.round(Math.max(min,Math.min(max,Number(value)||Number(this.spec.defaultSize)||min)));const changed=next!==this.size;this.size=next;if(this.spec.cssVar)this.container.style.setProperty(this.spec.cssVar,`${next}px`);else if(this.axis==='x')this.target.style.width=`${next}px`;else this.target.style.height=`${next}px`;if(persist)writeJson(this.key,{size:next});if(emit&&changed)this.scope.emitResize?.({reason:'split',id:this.spec.id,size:next});else this.scope.requestChartResize?.({reason:'split-observer',id:this.spec.id,size:next});return next;}
    bind(){
      const down=e=>{if(e.button!==0)return;const rect=this.container.getBoundingClientRect();this.drag={start:this.axis==='x'?e.clientX:e.clientY,size:this.size,rect};this.handle.setPointerCapture?.(e.pointerId);e.preventDefault();};
      const move=e=>{if(!this.drag)return;const point=this.axis==='x'?e.clientX:e.clientY;const sign=this.spec.reverse?-1:1;this.apply(this.drag.size+(point-this.drag.start)*sign,{persist:false});};
      const up=()=>{if(!this.drag)return;this.drag=null;this.apply(this.size,{persist:true});};
      const reset=e=>{e.preventDefault();this.apply(Number(this.spec.defaultSize)||320);};
      this.handle.addEventListener('pointerdown',down);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);this.handle.addEventListener('dblclick',reset);
      this.cleanups.push(()=>this.handle.removeEventListener('pointerdown',down),()=>window.removeEventListener('pointermove',move),()=>window.removeEventListener('pointerup',up),()=>this.handle.removeEventListener('dblclick',reset));
    }
    dispose(){this.ro?.disconnect?.();this.cleanups.splice(0).forEach(cleanupCall);}
  }

  class WorkspaceLayout {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.regions=new Map();this.created=[];
      if(!this.root)throw new Error('Workspace root not found.');
      this.root.classList.add('dkds-ui-workspace');
      if(spec.className)this.root.classList.add(...String(spec.className).split(/\s+/).filter(Boolean));
      const defs=spec.regions||{};
      for(const [name,def] of Object.entries(defs))this.mapRegion(name,def);
    }
    mapRegion(name,definition={}){
      const def=isElement(definition)||typeof definition==='string'||typeof definition==='function'?{target:definition}:definition;
      let el=resolveElement(def.target||def.selector,this.root);
      if(!el&&def.create!==false){el=document.createElement(def.tag||'div');el.className=`dkds-ui-region dkds-ui-region-${name} ${def.className||''}`.trim();el.dataset.region=name;this.root.appendChild(el);this.created.push(el);}
      if(el){el.dataset.dkdsRegion=name;this.regions.set(name,el);if(def.className)el.classList.add(...String(def.className).split(/\s+/).filter(Boolean));}
      return el;
    }
    slot(name){return this.regions.get(name)||hostState.zones.get(name)||null;}
    mount(name,node,{replace=false}={}){const slot=this.slot(name);const el=resolveElement(node)||node;if(!slot||!el)return null;if(replace)slot.replaceChildren();slot.appendChild(el);return el;}
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this});}
    dispose(){for(const el of this.created)el.remove();this.root?.classList.remove('dkds-ui-workspace');this.regions.clear();}
  }

  class ChartSurface {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.plot=null;this.toolbar=null;this.ro=null;this.boundPlotEvents=[];this.disposed=false;
      if(!this.container)throw new Error('Chart container not found.');
      this.container.classList.add('dkds-chart-surface');
      if(spec.title||spec.actions?.length)this.buildChrome();
      else this.plot=this.container;
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.scope.requestChartResize?.({reason:'chart-surface-observer'}));this.ro.observe(this.container);}
      if(spec.data||spec.layout)this.set(spec);
    }
    buildChrome(){
      const head=document.createElement('div');head.className='dkds-chart-head';const title=document.createElement('strong');title.className='dkds-chart-title';title.textContent=this.spec.title||'';const actions=document.createElement('div');actions.className='dkds-chart-actions';head.append(title,actions);
      const plot=document.createElement('div');plot.className='dkds-chart-plot';this.container.append(head,plot);this.plot=plot;
      if(this.spec.actions?.length)this.toolbar=new ActionGroup(this.scope.owner,actions,{activity:this.spec.activity,actions:this.spec.actions});
    }
    async set(spec={}){
      this.spec={...this.spec,...spec};if(!this.plot||!window.DKDSCharts?.react)return false;
      const config={responsive:true,displaylogo:false,...(this.spec.config||{})};
      const layout={autosize:true,...(this.spec.layout||{})};
      await window.DKDSCharts.react(this.plot,this.spec.data||this.spec.traces||[],layout,config);
      this.bindPlotEvents();return true;
    }
    bindPlotEvents(){
      if(!this.plot?.on)return;
      for(const [name,handler] of this.boundPlotEvents)try{this.plot.removeListener?.(name,handler);}catch{}
      this.boundPlotEvents=[];
      const events={plotly_click:'onClick',plotly_doubleclick:'onDoubleClick',plotly_hover:'onHover',plotly_unhover:'onUnhover',plotly_selected:'onSelected',plotly_relayout:'onRelayout'};
      for(const [eventName,key] of Object.entries(events)){const fn=this.spec[key];if(typeof fn!=='function')continue;const handler=payload=>fn(payload,this);this.plot.on(eventName,handler);this.boundPlotEvents.push([eventName,handler]);}
    }
    resize(){try{window.DKDSCharts?.resize?.(this.plot);}catch{}}
    portable(id,spec={}){return this.scope.panels.create(id,this.container,{title:this.spec.title||spec.title,...spec});}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.toolbar?.dispose?.();try{window.DKDSCharts?.purge?.(this.plot);}catch{}this.boundPlotEvents=[];const i=this.scope?.charts?.indexOf?.(this);if(Number.isInteger(i)&&i>=0)this.scope.charts.splice(i,1);}
  }

  class PlotView {
    constructor(scope,id,card,spec={}){
      this.scope=scope;this.owner=scope.owner;this.id=String(id||'plot');this.card=resolveElement(card);this.spec={copy:true,images:true,csv:true,portable:true,...spec};this.cleanups=[];this.portable=null;this.disposed=false;
      if(!this.card)throw new Error(`PlotView card not found: ${this.id}`);
      this.card.classList.add('dkds-plot-view');
      this.plot=resolveScopedElement(this.spec.plot||'.analysis-chart,.dkds-chart-plot,.js-plotly-plot',this.card)||this.card.querySelector('.analysis-chart')||this.card;
      this.header=resolveScopedElement(this.spec.header||'.analysis-chart-title,.reswin-group-head,.ter-resistance-card-header,.ter-chart-header,.pulse-card-heading,.pulse-plot-header,.dc-tool-title',this.card);
      if(!this.header){this.header=document.createElement('div');this.header.className='dkds-plot-view-head';this.card.prepend(this.header);}
      this.header.classList.add('dkds-plot-view-head');
      this.ensureTitle();this.ensureActions();this.bindStandardActions();this.bindPortable();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.card);}
    }
    configure(spec={}){
      this.spec={...this.spec,...spec};
      if(spec.plot!==undefined){const next=resolveScopedElement(spec.plot,this.card)||resolveElement(spec.plot);if(next)this.plot=next;}
      if(spec.fileStem!==undefined||spec.csv!==undefined||spec.copyText!==undefined||spec.exportImage!==undefined||spec.actions!==undefined){
        this.exportMenu?.dispose?.();this.exportMenu=null;
        this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());
        this.bindStandardActions();
      }
      return this;
    }
    ensureTitle(){
      let title=this.header.querySelector('.dkds-plot-view-title');
      if(title){this.title=title;return;}
      const actionsExisting=this.header.querySelector('.dkds-plot-view-actions,.reswin-group-card-actions,.ter-chart-actions,.pulse-plot-actions');
      const wrap=document.createElement('span');wrap.className='dkds-plot-view-title';
      if(this.spec.titleHtml!==undefined)wrap.innerHTML=String(this.spec.titleHtml||'');
      else if(this.spec.title!==undefined)wrap.textContent=String(this.spec.title||'');
      else{
        const nodes=[...this.header.childNodes].filter(node=>node!==actionsExisting);
        for(const node of nodes)wrap.appendChild(node);
      }
      this.header.insertBefore(wrap,this.header.firstChild||null);this.title=wrap;
    }
    ensureActions(){
      this.actions=resolveScopedElement(this.spec.actionsHost||'.dkds-plot-view-actions,.reswin-group-card-actions,.ter-chart-actions,.pulse-plot-actions,.dc-chart-toolbar',this.header);
      if(!this.actions){this.actions=document.createElement('span');this.actions.className='dkds-plot-view-actions';this.header.appendChild(this.actions);}
      this.actions.classList.add('dkds-plot-view-actions');
    }
    invokeAction(handler,event){return Promise.resolve(handler?.(event)).catch(err=>{console.error('[DKDS PlotView]',err);hostState.status?.(`图表操作失败：${err.message}`);});}
    button(label,title,handler){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title||label;b.className='dkds-plot-view-action';const fn=e=>{e.preventDefault();e.stopPropagation();this.invokeAction(handler,e);};b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;}
    menuButton({icon='⋯',title='图表操作',items=[]}={}){
      if(!Array.isArray(items)||!items.length)return null;
      const b=document.createElement('button');b.type='button';b.className='dkds-plot-view-action dkds-plot-view-menu-trigger dkds-portable-placement-trigger';b.title=title;b.setAttribute('aria-label',title);b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');
      const iconMarkup=icon==='file'?'<svg class="dkds-plot-view-file-svg" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.75h5l3 3v9.5H4z"></path><path d="M9 1.75v3h3"></path></svg>':esc(icon);
      b.innerHTML=`<span class="dkds-portable-location-icon dkds-plot-view-menu-icon">${iconMarkup}</span><span class="dkds-portable-caret">▾</span>`;
      const fn=e=>{
        e.preventDefault();e.stopPropagation();
        this.exportMenu?.dispose?.();
        const rect=b.getBoundingClientRect();
        const menu=this.exportMenu=new ContextMenu(this.owner,{onClose:()=>b.setAttribute('aria-expanded','false')});
        b.setAttribute('aria-expanded','true');
        menu.open({x:rect.left,y:rect.bottom+4,items});
      };
      b.addEventListener('click',fn);this.cleanups.push(()=>b.removeEventListener('click',fn));this.actions.appendChild(b);return b;
    }
    plotNode(){return this.spec.getPlot?.()||this.plot;}
    fileStem(){return String(typeof this.spec.fileStem==='function'?this.spec.fileStem(this):this.spec.fileStem||this.title?.textContent||this.id).trim().replace(/[\\/:*?\"<>|]+/g,'_')||this.id;}
    traceCsv(){
      if(typeof this.spec.csv==='function')return String(this.spec.csv(this)||'');
      const plot=this.plotNode(),traces=Array.from(plot?.data||[]),lines=[];
      const quote=v=>{const s=String(v??'');return /[\",\r\n]/.test(s)?`\"${s.replace(/\"/g,'\"\"')}\"`:s;};
      let hasHeatmap=false;
      for(const tr of traces){if(Array.isArray(tr?.z)&&Array.isArray(tr.z[0])){hasHeatmap=true;break;}}
      if(hasHeatmap){lines.push('series,x,y,z');for(const tr of traces){if(!Array.isArray(tr?.z)||!Array.isArray(tr.z[0]))continue;const xs=Array.isArray(tr.x)?tr.x:tr.z[0].map((_,i)=>i),ys=Array.isArray(tr.y)?tr.y:tr.z.map((_,i)=>i);for(let r=0;r<tr.z.length;r++)for(let c=0;c<(tr.z[r]||[]).length;c++)lines.push([tr.name||this.title?.textContent||this.id,xs[c],ys[r],tr.z[r][c]].map(quote).join(','));}return lines.join('\n');}
      lines.push('series,x,y');for(const tr of traces){const xs=Array.from(tr?.x||[]),ys=Array.from(tr?.y||[]),n=Math.max(xs.length,ys.length);for(let i=0;i<n;i++)lines.push([tr?.name||this.title?.textContent||this.id,xs[i]??i,ys[i]??''].map(quote).join(','));}return lines.join('\n');
    }
    async saveText(text,name,ext='csv'){
      if(typeof this.spec.saveText==='function')return this.spec.saveText({content:text,defaultName:name,extension:ext,view:this});
      if(window.electronAPI?.saveText)return window.electronAPI.saveText({defaultName:name,content:text,filters:[{name:ext.toUpperCase(),extensions:[ext]}]});
      const blob=new Blob([text],{type:ext==='csv'?'text/csv;charset=utf-8':'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
    }
    async exportCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可导出的数据。');return this.saveText(csv,`${this.fileStem()}.csv`,'csv');}
    async copyCsv(){const csv=this.traceCsv();if(!csv.trim())throw new Error('当前图没有可复制的数据。');if(typeof this.spec.copyText==='function')return this.spec.copyText(csv,`${this.title?.textContent||this.id} 数据`);if(window.electronAPI?.copyText)return window.electronAPI.copyText(csv);if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(csv);throw new Error('当前环境不支持复制。');}
    async exportImage(format){
      const plot=this.plotNode();if(!plot)throw new Error('图表尚未渲染。');
      if(typeof this.spec.exportImage==='function')return this.spec.exportImage({format,plot,fileStem:this.fileStem(),view:this});
      const data=await window.DKDSCharts.toImage(plot,{format,width:1500,height:950,scale:format==='png'?2:1});
      if(format==='svg'){const raw=data.split(',')[1]||'',content=decodeURIComponent(raw);return this.saveText(content,`${this.fileStem()}.svg`,'svg');}
      const base64=data.split(',')[1]||'';
      if(window.electronAPI?.saveBase64)return window.electronAPI.saveBase64({defaultName:`${this.fileStem()}.png`,base64,filters:[{name:'PNG',extensions:['png']}]});
      const a=document.createElement('a');a.href=data;a.download=`${this.fileStem()}.png`;document.body.appendChild(a);a.click();a.remove();return true;
    }
    bindStandardActions(){
      const exportItems=[];
      if(this.spec.csv!==false)exportItems.push({id:'csv',label:'数据 CSV',onInvoke:e=>this.invokeAction(()=>this.exportCsv(),e)});
      if(this.spec.copy!==false)exportItems.push({id:'copy',label:'复制数据',onInvoke:e=>this.invokeAction(()=>this.copyCsv(),e)});
      if(this.spec.images!==false){exportItems.push({id:'svg',label:'图形 SVG',onInvoke:e=>this.invokeAction(()=>this.exportImage('svg'),e)},{id:'png',label:'图形 PNG',onInvoke:e=>this.invokeAction(()=>this.exportImage('png'),e)});}
      this.menuButton({icon:'file',title:'图表数据与图像',items:exportItems});
      for(const action of this.spec.actions||[])this.button(action.label||action.id,action.title,()=>action.onInvoke?.({view:this,plot:this.plotNode()}));
    }
    bindPortable(){
      if(this.spec.portable===false)return;
      const placements=Array.isArray(this.spec.placements)?this.spec.placements:['home','global'];
      const portableSpec={title:this.spec.portableTitle||this.title?.textContent||this.id,useTargetAsWrapper:true,handle:this.header,controlsHost:this.actions,controlsPlacement:'start',placements,defaultPlacement:this.spec.defaultPlacement||'home',stateVersion:this.spec.stateVersion||'plot-view-v1',snap:this.spec.snap,...(this.spec.portableSpec||{})};
      const factory=this.spec.portableFactory;
      this.portable=typeof factory==='function'?factory(this.id,this.card,portableSpec):this.scope.panels.create(this.id,this.card,portableSpec);
    }
    resize(reason='resize'){this.scope.requestChartResize?.({id:this.id,reason:`plot-view-${reason}`});const plot=this.plotNode();if(plot?.classList?.contains('js-plotly-plot')){try{window.DKDSCharts?.resize?.(plot);}catch{}}return this;}
    dispose(){if(this.disposed)return;this.disposed=true;this.ro?.disconnect?.();this.exportMenu?.dispose?.();this.exportMenu=null;this.cleanups.splice(0).forEach(cleanupCall);this.portable?.dispose?.();this.portable=null;this.actions?.querySelectorAll?.('.dkds-plot-view-action')?.forEach(el=>el.remove());this.card?.classList?.remove('dkds-plot-view');this.header?.classList?.remove('dkds-plot-view-head');}
  }

  class PlotViewRegistry {
    constructor(scope){this.scope=scope;this.byId=new Map();this.byCard=new WeakMap();this.observers=[];}
    bind(id,card,spec={}){
      const node=resolveElement(card);if(!node)throw new Error(`PlotView card not found: ${id}`);
      const key=String(id||node.dataset?.plotViewId||'plot');let view=this.byCard.get(node)||this.byId.get(key)||null;
      if(view&&(view.disposed||view.card!==node))view=null;
      if(view){view.configure?.(spec);this.byId.set(key,view);return view;}
      view=this.scope.trackObject(new PlotView(this.scope,key,node,spec));this.byCard.set(node,view);this.byId.set(key,view);node.dataset.dkdsPlotViewBound='1';return view;
    }
    cards(root){
      const node=resolveElement(root);if(!node)return[];const selector='.analysis-chart-card,.reswin-group-card,.pulse-card,.dc-chart-pane,[data-dkds-plot-card]';const rows=[];
      if(node.matches?.(selector))rows.push(node);for(const el of node.querySelectorAll?.(selector)||[])rows.push(el);return [...new Set(rows)];
    }
    hydrate(root,spec={}){
      const rows=[];for(const card of this.cards(root)){
        const bound=this.byCard.get(card);if(bound&&!bound.disposed){rows.push(bound);continue;}
        const plot=resolveScopedElement(spec.plotSelector||'.analysis-chart,.reswin-group-plot,.dkds-chart-plot,.js-plotly-plot,#dcChart',card);if(!plot)continue;
        const header=resolveScopedElement(spec.headerSelector||'.analysis-chart-title,.reswin-group-head,.ter-resistance-card-header,.pulse-card-heading,.dc-tool-title,.dkds-chart-head',card);
        const plotId=String(plot.id||card.dataset?.plotId||card.dataset?.groupMetric||`plot-${this.byId.size+1}`);const alreadyPrime=card.dataset.dkdsPrimeOwned==='1'||card.classList.contains('dkds-portable-view');
        const base={plot,header,portable:alreadyPrime?false:spec.portable!==false,placements:spec.placements||['home','left','right','bottom','global'],defaultPlacement:spec.defaultPlacement||'home',stateVersion:spec.stateVersion||'plot-view-v2',portableFactory:spec.portableFactory};
        try{rows.push(this.bind(`auto:${plotId}`,card,base));}catch(err){console.warn('[DKDS PlotView hydrate]',plotId,err);}
      }return rows;
    }
    observe(root,spec={}){
      const node=resolveElement(root);if(!node)return()=>{};let queued=false;const run=()=>{queued=false;this.hydrate(node,spec);};const schedule=()=>{if(queued)return;queued=true;queueMicrotask(run);};schedule();
      if(!window.MutationObserver)return()=>{};const observer=new MutationObserver(schedule);observer.observe(node,{childList:true,subtree:true});this.observers.push(observer);return()=>{observer.disconnect();const i=this.observers.indexOf(observer);if(i>=0)this.observers.splice(i,1);};
    }
    get(id){return this.byId.get(String(id||''))||null;}
    dispose(){for(const observer of this.observers)observer.disconnect();this.observers=[];this.byId.clear();this.byCard=new WeakMap();}
  }

  class ViewHost {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.controller=spec.controller||null;this.cleanup=null;this.unsubscribe=null;this.ro=null;this.mounted=false;
      if(!this.container)throw new Error('ViewHost container not found.');
      this.container.classList.add('dkds-view-host');
      this.mount();
    }
    context(reason='render'){return {scope:this.scope,container:this.container,controller:this.controller,reason,host:hostState};}
    mount(){
      if(this.mounted)return this;this.mounted=true;
      try{const out=this.spec.mount?.(this.context('mount'));if(typeof out==='function')this.cleanup=out;}catch(err){console.error('[DKDS view mount]',err);}
      const source=this.controller?.subscribe?this.controller:(this.spec.store?.subscribe?this.spec.store:null);
      if(source)this.unsubscribe=source.subscribe(()=>this.render('state'));
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}
      this.render('mount');return this;
    }
    render(reason='render'){if(!this.mounted)return;try{this.spec.render?.(this.context(reason));}catch(err){console.error('[DKDS view render]',err);hostState.status?.(`界面渲染失败：${err.message}`);}return this;}
    resize(reason='resize'){if(!this.mounted)return;try{this.spec.resize?.(this.context(reason));}catch(err){console.warn('[DKDS view resize]',err);}return this;}
    setController(controller){cleanupCall(this.unsubscribe);this.unsubscribe=null;this.controller=controller||null;if(this.controller?.subscribe)this.unsubscribe=this.controller.subscribe(()=>this.render('state'));this.render('controller');return this;}
    move(container){const next=resolveElement(container);if(!next||next===this.container)return this;this.ro?.disconnect?.();this.container=next;this.container.classList.add('dkds-view-host');if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.resize('observer'));this.ro.observe(this.container);}this.render('move');return this;}
    dispose(){if(!this.mounted)return;this.mounted=false;cleanupCall(this.unsubscribe);cleanupCall(this.cleanup);this.ro?.disconnect?.();try{this.spec.unmount?.(this.context('unmount'));}catch(err){console.warn('[DKDS view unmount]',err);}this.container?.classList?.remove('dkds-view-host');}
  }

  class Workbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.root=resolveElement(root);this.spec=spec;this.views=new Map();this.active='';this.splitter=null;this.split=null;this.portableZones=new Map();
      if(!this.root)throw new Error('Workbench root not found.');
      this.root.classList.add('dkds-workbench');
      if(spec.existing===true){
        this.root.classList.add('dkds-workbench-existing');
        this.layout=new WorkspaceLayout(scope,this.root,{regions:spec.regions||{}});
        this.createPortableZones();
        if(spec.split&&spec.split.enabled!==false)this.mountExistingSplit(spec.split);
        return;
      }
      const showHeader=spec.header!==false,showTabs=spec.tabs!==false;
      this.root.innerHTML=`${showHeader?'<header class="dkds-workbench-header"><div class="dkds-workbench-heading"><h2></h2><div class="dkds-workbench-subtitle"></div></div><div class="dkds-workbench-actions"></div></header>':''}${showTabs?'<div class="dkds-workbench-tabs"></div>':''}<div class="dkds-workbench-grid"><aside class="dkds-workbench-left"></aside><main class="dkds-workbench-main"></main><aside class="dkds-workbench-right"></aside><section class="dkds-workbench-bottom"></section><div class="dkds-workbench-overlay"></div></div>`;
      const h=this.root.querySelector('h2');if(h)h.textContent=spec.title||'';const st=this.root.querySelector('.dkds-workbench-subtitle');if(st)st.textContent=spec.subtitle||'';
      this.layout=new WorkspaceLayout(scope,this.root.querySelector('.dkds-workbench-grid'),{regions:{left:{target:'.dkds-workbench-left'},main:{target:'.dkds-workbench-main'},right:{target:'.dkds-workbench-right'},bottom:{target:'.dkds-workbench-bottom'},overlay:{target:'.dkds-workbench-overlay'}}});
      this.portableLayout=this.layout;
      const actionHost=this.root.querySelector('.dkds-workbench-actions');if(spec.actions&&actionHost)this.actions=new ActionGroup(scope.owner,actionHost,{activity:spec.activity,actions:spec.actions});
      for(const view of spec.views||[])this.registerView(view);
      if(spec.defaultView||this.views.size)this.activate(spec.defaultView||this.views.keys().next().value);
    }
    createPortableZones(){
      const make=(name)=>{const el=document.createElement('div');el.className=`dkds-portable-zone dkds-portable-zone-${name}`;el.dataset.portableZone=name;this.root.appendChild(el);this.portableZones.set(name,el);return el;};
      for(const name of ['left','right','bottom'])make(name);
      const semanticOverlay=this.layout.slot('overlay');
      this.portableLayout={slot:(name)=>name==='overlay'?(semanticOverlay||hostState.zones.get('overlay')||this.root):(this.portableZones.get(name)||this.layout.slot(name)||hostState.zones.get(name)||null)};
      return this.portableLayout;
    }
    portable(id,node,spec={}){return this.scope.panels.create(id,node,{...spec,layout:this.portableLayout||this.layout});}
    mountExistingSplit(splitSpec={}){
      const left=this.layout.slot(splitSpec.region||'left');const main=this.layout.slot(splitSpec.mainRegion||'main');if(!left||!main)return null;
      this.root.classList.add('dkds-workbench-existing-split');
      const handle=document.createElement('div');handle.className='dkds-workbench-splitter';handle.tabIndex=0;handle.title='拖动调整侧栏宽度；双击恢复默认';
      if(left.nextSibling)this.root.insertBefore(handle,left.nextSibling);else this.root.appendChild(handle);this.splitter=handle;
      this.split=new SplitController(this.scope,{id:splitSpec.id||'workbench-left',container:this.root,handle,target:left,axis:'x',min:splitSpec.min||190,max:splitSpec.max||null,reserve:splitSpec.reserve||360,defaultSize:splitSpec.defaultSize||300});
      return this.split;
    }
    registerView(view={}){const id=String(view.id||'');if(!id)throw new Error('Workbench view id required.');this.views.set(id,{...view,id});this.renderTabs();return this;}
    renderTabs(){const host=this.root.querySelector('.dkds-workbench-tabs');if(!host)return;host.innerHTML='';for(const view of [...this.views.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.dataset.viewId=view.id;b.className='dkds-workbench-tab';b.textContent=view.label||view.title||view.id;b.classList.toggle('active',view.id===this.active);b.onclick=()=>this.activate(view.id);host.appendChild(b);}}
    activate(id){const next=this.views.get(String(id));if(!next)return false;const main=this.layout.slot('main');if(!main)return false;const previous=this.views.get(this.active);try{previous?.unmount?.({workbench:this,scope:this.scope,container:main});}catch(err){console.warn('[DKDS workbench unmount]',err);}this.active=next.id;main.replaceChildren();if(typeof next.mount==='function')next.mount({workbench:this,scope:this.scope,container:main,layout:this.layout});else if(next.html!==undefined)main.innerHTML=typeof next.html==='function'?next.html():String(next.html);this.renderTabs();this.scope.emitResize({reason:'workbench-view',viewId:next.id});return true;}
    dispose(){try{this.views.get(this.active)?.unmount?.({workbench:this,scope:this.scope,container:this.layout.slot('main')});}catch{}this.actions?.dispose?.();this.split?.dispose?.();this.splitter?.remove?.();for(const zone of this.portableZones.values())zone.remove();this.portableZones.clear();this.layout?.dispose?.();if(this.spec.existing===true){this.root.classList.remove('dkds-workbench','dkds-workbench-existing','dkds-workbench-existing-split');}else this.root.replaceChildren();}
  }


  class GridController {
    constructor(scope,container,spec={}){
      this.scope=scope;this.container=resolveElement(container);this.spec={...spec};this.columns=Math.max(1,Number(spec.columns)||3);this.minItemWidth=Math.max(180,Number(spec.minItemWidth)||320);this.maxColumns=Math.max(this.columns,Number(spec.maxColumns)||6);this.ro=null;this.appliedColumns=0;
      if(!this.container)throw new Error('GridController container not found.');
      this.container.classList.add('dkds-managed-grid');
      this.apply();
      if(window.ResizeObserver){this.ro=new ResizeObserver(()=>this.apply());this.ro.observe(this.container);}
    }
    responsiveColumns(){
      if(this.spec.responsive===false)return this.columns;
      const width=Math.max(0,this.container.clientWidth||0);
      if(!width)return this.columns;
      return Math.max(1,Math.min(this.columns,this.maxColumns,Math.floor((width+10)/(this.minItemWidth+10))||1));
    }
    apply(){const cols=this.responsiveColumns();const changed=cols!==this.appliedColumns;this.appliedColumns=cols;this.container.style.setProperty('--dkds-grid-columns',String(cols));this.container.dataset.dkdsGridColumns=String(cols);if(changed)this.scope.emitResize?.({reason:'grid',columns:cols});else this.scope.requestChartResize?.({reason:'grid-observer',columns:cols});return cols;}
    setColumns(value){this.columns=Math.max(1,Math.min(this.maxColumns,Number(value)||1));this.apply();return this.columns;}
    getColumns(){return this.columns;}
    dispose(){this.ro?.disconnect?.();this.container.classList.remove('dkds-managed-grid');this.container.style.removeProperty('--dkds-grid-columns');delete this.container.dataset.dkdsGridColumns;}
  }


  class SettingsSurface {
    constructor(scope,id,spec={}){
      this.scope=scope||null;this.owner=String(scope?.owner||spec.owner||'core');this.id=String(id||spec.id||'defaults');this.spec={title:'插件设置',fields:[],defaults:{},...spec};this.listeners=new Set();this.dialog=null;this.value=this.read();
    }
    storageKey(){return `${hostState.storagePrefix}.settings.v1.${this.owner}.${this.id}`;}
    normalize(value={}){return {...(this.spec.defaults||{}),...(value&&typeof value==='object'?value:{})};}
    read(){try{return this.normalize(JSON.parse(localStorage.getItem(this.storageKey())||'null')||{});}catch{return this.normalize({});}}
    get(key){const value=this.normalize(this.value);return key===undefined?{...value}:value?.[key];}
    set(patch={},meta={}){const next=this.normalize({...this.value,...(patch&&typeof patch==='object'?patch:{})});this.value=next;try{localStorage.setItem(this.storageKey(),JSON.stringify(next));}catch{}for(const fn of this.listeners)try{fn({...next},meta);}catch(err){console.warn('[DKDS settings change]',err);}return {...next};}
    reset(meta={}){this.value=this.normalize({});try{localStorage.removeItem(this.storageKey());}catch{}for(const fn of this.listeners)try{fn({...this.value},{...meta,reset:true});}catch{}return {...this.value};}
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.get(),{initial:true});return()=>this.listeners.delete(fn);}
    fieldOptions(field){const rows=Array.isArray(field?.options)?field.options:[];return rows.map(row=>typeof row==='object'?{value:String(row.value??row.id??''),label:String(row.label??row.title??row.value??row.id??'')}:{value:String(row),label:String(row)});}
    createControl(field,value){
      const type=String(field?.type||'text');let input;if(type==='select'){input=document.createElement('select');for(const row of this.fieldOptions(field)){const option=document.createElement('option');option.value=row.value;option.textContent=row.label;input.appendChild(option);}input.value=String(value??'');}
      else if(type==='boolean'||type==='checkbox'){input=document.createElement('input');input.type='checkbox';input.checked=!!value;}
      else{input=document.createElement('input');input.type=type==='number'?'number':'text';if(type==='number'&&field.step!==undefined)input.step=String(field.step);if(type==='number'&&field.min!==undefined)input.min=String(field.min);if(type==='number'&&field.max!==undefined)input.max=String(field.max);input.value=value??'';}
      input.dataset.settingId=String(field.id||'');return input;
    }
    controlValue(field,input){const type=String(field?.type||'text');if(type==='boolean'||type==='checkbox')return !!input.checked;if(type==='number'){const n=Number(input.value);return Number.isFinite(n)?n:(field.default??this.spec.defaults?.[field.id]??null);}return String(input.value??'');}
    close(){this.dialog?.remove?.();this.dialog=null;}
    open(options={}){
      this.close();const overlay=document.createElement('div');overlay.className='dkds-settings-overlay';overlay.innerHTML=`<section class="dkds-settings-dialog" role="dialog" aria-modal="true"><header><div><strong>${esc(options.title||this.spec.title||'插件设置')}</strong>${this.spec.description?`<span>${esc(this.spec.description)}</span>`:''}</div><button type="button" data-action="close" title="关闭">×</button></header><div class="dkds-settings-body"></div><footer><button type="button" data-action="reset">恢复默认</button><span></span><button type="button" data-action="cancel">取消</button><button type="button" class="primary" data-action="apply">应用</button></footer></section>`;
      document.body.appendChild(overlay);this.dialog=overlay;const body=overlay.querySelector('.dkds-settings-body'),controls=new Map(),current=this.get();
      for(const field of this.spec.fields||[]){if(!field?.id)continue;const row=document.createElement('label');row.className=`dkds-settings-field ${String(field.type||'text')==='boolean'||String(field.type||'text')==='checkbox'?'is-check':''}`;const text=document.createElement('span');text.className='dkds-settings-label';text.textContent=String(field.label||field.id);const input=this.createControl(field,current[field.id]);controls.set(String(field.id),{field,input});if(String(field.type||'')==='boolean'||String(field.type||'')==='checkbox'){row.append(input,text);}else{row.append(text,input);}if(field.description){const help=document.createElement('small');help.textContent=String(field.description);row.appendChild(help);}body.appendChild(row);}
      const finish=action=>{if(action==='apply'){const patch={};for(const [id,row] of controls)patch[id]=this.controlValue(row.field,row.input);const next=this.set(patch,{source:'settings-dialog'});try{this.spec.onApply?.(next,{surface:this});}catch(err){console.warn('[DKDS settings apply]',err);}try{options.onApply?.(next,{surface:this});}catch{}this.close();return;}if(action==='reset'){const next=this.reset({source:'settings-dialog'});for(const [id,row] of controls){const value=next[id],type=String(row.field.type||'text');if(type==='boolean'||type==='checkbox')row.input.checked=!!value;else row.input.value=value??'';}try{this.spec.onApply?.(next,{surface:this,reset:true});}catch{}try{options.onApply?.(next,{surface:this,reset:true});}catch{}return;}this.close();};
      overlay.addEventListener('click',event=>{const action=event.target?.closest?.('[data-action]')?.dataset?.action;if(action)finish(action);else if(event.target===overlay)finish('cancel');});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finish('cancel');}});Promise.resolve().then(()=>overlay.querySelector('select,input,button')?.focus?.());return overlay;
    }
    button(container,options={}){const host=resolveElement(container);if(!host)return null;const button=document.createElement('button');button.type='button';button.className=String(options.className||'');button.textContent=String(options.label||'设置');button.title=String(options.title||'插件默认设置');button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.open(options);});host.appendChild(button);return button;}
    dispose(){this.close();this.listeners.clear();}
  }

  class SettingsRegistry {
    constructor(scope){this.scope=scope;this.rows=new Map();}
    define(id,spec={}){const key=String(id||spec.id||'defaults');let row=this.rows.get(key);if(row){row.spec={...row.spec,...spec};row.value=row.read();return row;}row=new SettingsSurface(this.scope,key,spec);this.rows.set(key,row);return row;}
    get(id='defaults'){return this.rows.get(String(id))||null;}
    dispose(){for(const row of this.rows.values())row.dispose?.();this.rows.clear();}
  }


  class TableSurface {
    constructor(scope,table,spec={}){
      this.scope=scope||null;this.owner=String(spec.owner||scope?.owner||'core.table');this.table=resolveElement(table);this.spec={minColumnWidth:56,maxColumnWidth:640,sortable:true,headerMenu:true,cellMenu:true,copyTable:true,persist:true,...spec};this.disposed=false;this.refreshing=false;this.rowOrder=new WeakMap();this.rowOrderSeq=0;this.cleanups=[];this.menu=new ContextMenu(this.owner);this.state={widths:{},hidden:{},sort:null};
      if(!this.table)throw new Error('TableSurface target not found.');
      this.table.classList.add('dkds-managed-table');this.table.dataset.dkdsTableManaged='1';
      this.stableId=String(this.spec.id||this.table.dataset.tableId||this.table.id||'').trim();
      this.restorePersistedState();this.bindEvents();this.observe();this.refresh();
    }
    key(){
      if(this.stableId)return this.stableId;
      const labels=[...this.table.querySelectorAll('thead th')].map(th=>String(th.textContent||'').trim()).join('|');
      return `${this.owner}:${labels||'table'}`;
    }
    storageKey(){return this.stableId&&this.spec.persist!==false?`${hostState.storagePrefix}.table.v1.${this.owner}.${this.stableId}`:'';}
    restorePersistedState(){
      const key=this.storageKey();if(!key)return;
      try{const row=JSON.parse(localStorage.getItem(key)||'null');if(row&&typeof row==='object')this.state={widths:{...(row.widths||{})},hidden:{...(row.hidden||{})},sort:row.sort&&typeof row.sort==='object'?{key:String(row.sort.key||''),direction:String(row.sort.direction||'')} : null};}catch{}
    }
    persistState(){const key=this.storageKey();if(!key)return false;try{localStorage.setItem(key,JSON.stringify(this.state));return true;}catch{return false;}}
    columnHeaders(){return [...this.table.querySelectorAll('thead tr:first-child > th')];}
    columnKey(index,th=this.columnHeaders()[index]){return String(th?.dataset?.columnKey||th?.getAttribute?.('data-key')||th?.textContent||`column-${index}`).replace(/[▲▼↕]/g,'').trim()||`column-${index}`;}
    indexForKey(key){const value=String(key||'');return this.columnHeaders().findIndex((th,index)=>this.columnKey(index,th)===value);}
    columnIndex(value){if(Number.isInteger(value))return value;const n=Number(value);if(typeof value==='number'&&Number.isFinite(n))return Math.trunc(n);return this.indexForKey(value);}
    visibleColumnKeys(){return this.columnHeaders().map((th,index)=>({key:this.columnKey(index,th),index})).filter(row=>!this.isColumnHidden(row.index)).map(row=>row.key);}
    columnCells(index){const rows=[...this.table.querySelectorAll('tr')];return rows.map(row=>row.children?.[index]).filter(Boolean);}
    bodyRows(){return [...this.table.querySelectorAll('tbody > tr')];}
    registerRows(){for(const row of this.bodyRows())if(!this.rowOrder.has(row))this.rowOrder.set(row,this.rowOrderSeq++);}
    bindEvents(){
      const click=event=>{
        if(this.disposed||this.spec.sortable===false)return;
        if(event.target?.closest?.('.dkds-table-column-resizer,button,input,select,textarea,a,[data-dkds-no-sort]'))return;
        const th=event.target?.closest?.('thead th');if(!th||!this.table.contains(th)||th.dataset.dkdsSortable==='false')return;
        const index=this.columnHeaders().indexOf(th);if(index<0)return;this.sort(index,'toggle');
      };
      const context=event=>{
        if(this.disposed||event.defaultPrevented)return;
        const th=event.target?.closest?.('thead th');if(th&&this.table.contains(th)&&this.spec.headerMenu!==false){event.preventDefault();event.stopPropagation();this.openHeaderMenu(event,th);return;}
        const td=event.target?.closest?.('tbody td, tbody th');if(td&&this.table.contains(td)&&this.spec.cellMenu!==false){event.preventDefault();event.stopPropagation();this.openCellMenu(event,td);}
      };
      const rowActivate=event=>{
        if(typeof this.spec.onRowActivate!=='function'||event.target?.closest?.('button,input,select,textarea,a'))return;
        const row=event.target?.closest?.('tbody tr');if(!row||!this.table.contains(row))return;const cell=event.target?.closest?.('td,th');
        try{this.spec.onRowActivate({event,row,rowIndex:this.bodyRows().indexOf(row),cell,columnIndex:cell?[...row.children].indexOf(cell):-1,surface:this});}catch(err){console.warn('[DKDS table row activate]',err);}
      };
      this.table.addEventListener('click',click);this.table.addEventListener('contextmenu',context);this.table.addEventListener('dblclick',rowActivate);
      this.cleanups.push(()=>this.table.removeEventListener('click',click),()=>this.table.removeEventListener('contextmenu',context),()=>this.table.removeEventListener('dblclick',rowActivate));
    }
    observe(){if(!window.MutationObserver)return;this.observer=new MutationObserver(records=>{if(this.refreshing)return;if(records.some(row=>row.type==='childList'))this.refresh();});this.observer.observe(this.table,{childList:true,subtree:true});this.cleanups.push(()=>this.observer?.disconnect?.());}
    refresh(){
      if(this.disposed||this.refreshing)return false;this.refreshing=true;
      try{
        const heads=this.columnHeaders();this.registerRows();heads.forEach((th,index)=>this.installHeader(th,index));this.applyState();return !!heads.length;
      }finally{this.refreshing=false;}
    }
    installHeader(th,index){
      if(!th)return;th.classList.add('dkds-table-column');if(this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false'){th.classList.add('dkds-table-sortable');th.title=th.title||'单击排序；右键打开列操作';}
      let handle=[...th.children].find(node=>node.classList?.contains('dkds-table-column-resizer'));
      if(handle)return;
      handle=document.createElement('span');handle.className='dkds-table-column-resizer';handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.title='拖动调整列宽；双击自动列宽';th.appendChild(handle);
      let drag=null;
      const move=event=>{if(!drag)return;const width=this.clampWidth(drag.width+(event.clientX-drag.x));this.setColumnWidth(index,width,{persist:false});event.preventDefault();};
      const end=()=>{if(!drag)return;drag=null;document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',end,true);document.body.classList.remove('dkds-table-resizing');this.persistState();};
      const down=event=>{if(event.button!==0)return;drag={x:event.clientX,width:th.getBoundingClientRect().width};document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',end,true);document.body.classList.add('dkds-table-resizing');event.preventDefault();event.stopPropagation();};
      const auto=event=>{event.preventDefault();event.stopPropagation();this.autoSizeColumn(index);};
      handle.addEventListener('pointerdown',down);handle.addEventListener('dblclick',auto);
    }
    clampWidth(value){const min=Math.max(36,Number(this.spec.minColumnWidth)||56),max=Math.max(min,Number(this.spec.maxColumnWidth)||640);return Math.max(min,Math.min(max,Math.round(Number(value)||min)));}
    setColumnWidth(index,width,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th),px=this.clampWidth(width);this.state.widths[key]=px;
      for(const cell of this.columnCells(index)){cell.style.width=`${px}px`;cell.style.minWidth=`${px}px`;cell.style.maxWidth=`${px}px`;}
      this.table.dataset.dkdsTableUserSized='1';if(persist)this.persistState();return px;
    }
    resetColumn(index,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th);delete this.state.widths[key];for(const cell of this.columnCells(index)){cell.style.removeProperty('width');cell.style.removeProperty('min-width');cell.style.removeProperty('max-width');}if(persist)this.persistState();return true;
    }
    autoSizeColumn(index,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;this.resetColumn(index,{persist:false});const cells=this.columnCells(index).filter(cell=>!cell.hidden&&!cell.classList?.contains('dkds-table-column-hidden')).slice(0,220);let width=0;
      for(const cell of cells){const measured=Math.max(Number(cell.scrollWidth)||0,Number(cell.getBoundingClientRect?.().width)||0);const fallback=Math.min(520,String(cell.textContent||'').trim().length*7.4+28);width=Math.max(width,measured||fallback);}
      width=this.setColumnWidth(index,this.clampWidth(width+10),{persist:false});if(persist)this.persistState();return width;
    }
    autoSizeAll(){const heads=this.columnHeaders();heads.forEach((_th,index)=>{if(!this.isColumnHidden(index))this.autoSizeColumn(index,{persist:false});});this.persistState();return this.columnState();}
    resetColumns(){for(let index=0;index<this.columnHeaders().length;index++)this.resetColumn(index,{persist:false});delete this.table.dataset.dkdsTableUserSized;this.persistState();return true;}
    isColumnHidden(index){index=this.columnIndex(index);const th=this.columnHeaders()[index];return !!th&&this.state.hidden[this.columnKey(index,th)]===true;}
    setColumnVisible(index,visible=true,{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index];if(!th)return false;const key=this.columnKey(index,th),show=visible!==false;if(show)delete this.state.hidden[key];else{const visibleCount=heads.filter((_row,i)=>!this.isColumnHidden(i)).length;if(visibleCount<=1)return false;this.state.hidden[key]=true;}
      for(const cell of this.columnCells(index)){cell.classList.toggle('dkds-table-column-hidden',!show);cell.setAttribute('aria-hidden',show?'false':'true');}
      if(persist)this.persistState();return true;
    }
    showAllColumns(){this.state.hidden={};for(let index=0;index<this.columnHeaders().length;index++)this.setColumnVisible(index,true,{persist:false});this.persistState();return true;}
    compareText(a,b){
      const clean=value=>String(value??'').trim().replace(/,/g,'');const av=clean(a),bv=clean(b),numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
      if(numeric.test(av)&&numeric.test(bv)){const an=Number(av),bn=Number(bv);if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;}
      return av.localeCompare(bv,undefined,{numeric:true,sensitivity:'base'});
    }
    sort(index,direction='toggle',{persist=true}={}){
      index=this.columnIndex(index);const heads=this.columnHeaders(),th=heads[index],body=this.table.tBodies?.[0];if(!th||!body||this.spec.sortable===false||th.dataset.dkdsSortable==='false')return false;const key=this.columnKey(index,th),current=this.state.sort?.key===key?this.state.sort.direction:'';
      let next=String(direction||'toggle');if(next==='toggle')next=current==='asc'?'desc':current==='desc'?'none':'asc';if(!['asc','desc','none'].includes(next))next='none';this.registerRows();const rows=this.bodyRows();
      const currentRows=rows.slice();rows.sort((ra,rb)=>{if(next==='none')return (this.rowOrder.get(ra)||0)-(this.rowOrder.get(rb)||0);const ca=ra.children?.[index],cb=rb.children?.[index],column=this.spec.columns?.[index];const value=(row,cell)=>{if(typeof column?.sortValue==='function')return column.sortValue(row?.__dkdsRowData??row,cell);const explicit=cell?.dataset?.sortValue;return explicit!==undefined?explicit:(cell?.textContent||'');};const av=value(ra,ca),bv=value(rb,cb),cmp=this.compareText(av,bv);return next==='desc'?-cmp:cmp;});
      const changed=rows.some((row,rowIndex)=>row!==currentRows[rowIndex]);if(changed){this.refreshing=true;try{for(const row of rows)body.appendChild(row);}finally{this.refreshing=false;}}
      this.state.sort=next==='none'?null:{key,direction:next};this.applySortIndicators();if(persist)this.persistState();
      try{this.table.dispatchEvent(new CustomEvent('dkds:table-sort',{bubbles:true,detail:{owner:this.owner,tableId:this.key(),columnKey:key,index,direction:next,surface:this}}));}catch{}
      return next;
    }
    clearSort(){const sort=this.state.sort;if(!sort)return true;const index=this.indexForKey(sort.key);return index>=0?this.sort(index,'none'):false;}
    applySortIndicators(){for(const [index,th] of this.columnHeaders().entries()){const key=this.columnKey(index,th),direction=this.state.sort?.key===key?this.state.sort.direction:'';if(direction){th.dataset.dkdsSort=direction;th.setAttribute('aria-sort',direction==='asc'?'ascending':'descending');}else{delete th.dataset.dkdsSort;th.setAttribute('aria-sort','none');}}}
    applyState(){
      const heads=this.columnHeaders();heads.forEach((th,index)=>{const key=this.columnKey(index,th),width=Number(this.state.widths[key]);if(Number.isFinite(width)&&width>0)this.setColumnWidth(index,width,{persist:false});else this.resetColumn(index,{persist:false});this.setColumnVisible(index,this.state.hidden[key]!==true,{persist:false});});this.applySortIndicators();
      if(this.state.sort?.key){const index=this.indexForKey(this.state.sort.key);if(index>=0)this.sort(index,this.state.sort.direction,{persist:false});}
    }
    copyText(text){
      const value=String(text??'');try{if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value);hostState.status?.('已复制表格内容。');return true;}}catch{}
      try{const area=document.createElement('textarea');area.value=value;area.style.cssText='position:fixed;left:-10000px;top:-10000px';document.body.appendChild(area);area.select();const ok=document.execCommand?.('copy')!==false;area.remove();if(ok)hostState.status?.('已复制表格内容。');return ok;}catch{return false;}
    }
    visibleTableText({includeHeader=true}={}){
      const indices=this.columnHeaders().map((_th,index)=>index).filter(index=>!this.isColumnHidden(index)),lines=[];
      if(includeHeader)lines.push(indices.map(index=>String(this.columnHeaders()[index]?.textContent||'').replace(/[▲▼↕]/g,'').trim()).join('\t'));
      for(const row of this.bodyRows())lines.push(indices.map(index=>String(row.children?.[index]?.textContent||'').trim()).join('\t'));
      return lines.join('\n');
    }
    copyVisibleTable(options={}){return this.copyText(this.visibleTableText(options));}
    resetState({persist=true}={}){this.state={widths:{},hidden:{},sort:null};this.applyState();if(persist)this.persistState();return this.columnState();}
    menuItems(value,context){try{const rows=typeof value==='function'?value(context):value;return Array.isArray(rows)?rows.filter(Boolean):[];}catch(err){console.warn('[DKDS table menu]',err);return [];}}
    openHeaderMenu(event,th){
      const index=this.columnHeaders().indexOf(th),key=this.columnKey(index,th),hidden=Object.keys(this.state.hidden).length>0;
      const context={surface:this,index,key,header:th};const custom=this.menuItems(this.spec.headerMenuItems,context);const items=[
        {id:'sort-asc',label:'升序排列',icon:'↑',enabled:this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false',onInvoke:()=>this.sort(index,'asc')},
        {id:'sort-desc',label:'降序排列',icon:'↓',enabled:this.spec.sortable!==false&&th.dataset.dkdsSortable!=='false',onInvoke:()=>this.sort(index,'desc')},
        {id:'sort-clear',label:'恢复原顺序',icon:'↕',enabled:!!this.state.sort,onInvoke:()=>this.clearSort()},
        {type:'separator'},
        {id:'autosize-column',label:'自动适配此列',onInvoke:()=>this.autoSizeColumn(index)},
        {id:'autosize-all',label:'自动适配全部列',onInvoke:()=>this.autoSizeAll()},
        {id:'reset-widths',label:'重置全部列宽',onInvoke:()=>this.resetColumns()},
        {type:'separator'},
        {id:'hide-column',label:`隐藏“${key}”`,enabled:this.columnHeaders().filter((_row,i)=>!this.isColumnHidden(i)).length>1,onInvoke:()=>this.setColumnVisible(index,false)},
        {id:'show-columns',label:'恢复全部列',visible:hidden,onInvoke:()=>this.showAllColumns()},
        ...(this.spec.copyTable!==false?[{type:'separator'},{id:'copy-table',label:'复制可见表格',icon:'⧉',onInvoke:()=>this.copyVisibleTable()}]:[]),
        ...(custom.length?[{type:'separator'},...custom]:[])
      ];return this.menu.open({x:event.clientX,y:event.clientY,context,items});
    }
    openCellMenu(event,cell){
      const row=cell.closest('tr'),cells=[...(row?.children||[])],index=cells.indexOf(cell),text=String(cell.textContent||'').trim(),rowText=cells.filter((_node,i)=>!this.isColumnHidden(i)).map(node=>String(node.textContent||'').trim()).join('\t');
      const context={surface:this,row,cell,index,rowIndex:this.bodyRows().indexOf(row),columnKey:this.columnKey(index)};const custom=this.menuItems(this.spec.cellMenuItems||this.spec.rowMenuItems,context);return this.menu.open({x:event.clientX,y:event.clientY,context,items:[
        {id:'copy-cell',label:'复制单元格',icon:'⧉',onInvoke:()=>this.copyText(text)},
        {id:'copy-row',label:'复制本行',icon:'≡',onInvoke:()=>this.copyText(rowText)},
        ...(custom.length?[{type:'separator'},...custom]:[])
      ]});
    }
    columnState(){return {widths:{...this.state.widths},hidden:{...this.state.hidden},sort:this.state.sort?{...this.state.sort}:null};}
    restoreColumnState(value={},options={}){this.state={widths:{...(value?.widths||{})},hidden:{...(value?.hidden||{})},sort:value?.sort?{...value.sort}:null};this.applyState();if(options.persist!==false)this.persistState();return this.columnState();}
    setData(columns=[],rows=[]){this.spec.columns=Array.isArray(columns)?columns.slice():[];this.spec.rows=Array.isArray(rows)?rows.slice():[];return this.renderData();}
    renderData(){
      const columns=Array.isArray(this.spec.columns)?this.spec.columns:[],rows=Array.isArray(this.spec.rows)?this.spec.rows:[];if(!columns.length)return false;const thead=document.createElement('thead'),hr=document.createElement('tr');
      for(const [index,column] of columns.entries()){const th=document.createElement('th');const key=String(column?.key??index);th.dataset.columnKey=key;th.dataset.dkdsSortable=column?.sortable===false?'false':'true';th.textContent=`${column?.label??key}${column?.unit?` (${column.unit})`:''}`;hr.appendChild(th);}thead.appendChild(hr);const tbody=document.createElement('tbody');
      rows.forEach((row,rowIndex)=>{const tr=document.createElement('tr');tr.__dkdsRowData=row;if(row?.id!=null)tr.dataset.rowId=String(row.id);for(const [index,column] of columns.entries()){const td=document.createElement('td');const key=column?.key??index;const raw=typeof column?.value==='function'?column.value(row,rowIndex):row?.[key];let value=raw;if(typeof column?.format==='function')value=column.format(value,row,rowIndex);if(typeof column?.sortValue==='function'){const sortValue=column.sortValue(row,rowIndex,raw);if(sortValue!=null)td.dataset.sortValue=String(sortValue);}else if(raw!=null&&typeof raw!=='object')td.dataset.sortValue=String(raw);td.textContent=value==null?'':String(value);tr.appendChild(td);}tbody.appendChild(tr);});
      this.refreshing=true;try{this.table.replaceChildren(thead,tbody);}finally{this.refreshing=false;}this.rowOrder=new WeakMap();this.rowOrderSeq=0;this.refresh();return true;
    }
    updateSpec(spec={}){this.spec={...this.spec,...spec};if(spec.owner)this.owner=String(spec.owner);if(spec.columns||spec.rows)this.renderData();else this.refresh();return this;}
    dispose(){if(this.disposed)return;this.disposed=true;this.menu?.dispose?.();this.cleanups.splice(0).reverse().forEach(cleanupCall);for(const cell of this.table.querySelectorAll('.dkds-table-column')){cell.classList.remove('dkds-table-column','dkds-table-sortable');delete cell.dataset.dkdsSort;cell.removeAttribute('aria-sort');cell.querySelector('.dkds-table-column-resizer')?.remove?.();}for(const cell of this.table.querySelectorAll('.dkds-table-column-hidden')){cell.classList.remove('dkds-table-column-hidden');cell.removeAttribute('aria-hidden');}this.table.classList.remove('dkds-managed-table');delete this.table.dataset.dkdsTableManaged;}
  }

  class TableSurfaceRegistry {
    constructor(scope=null){this.scope=scope;this.rows=new Map();this.byElement=new WeakMap();this.anonymousIds=new WeakMap();this.anonymousSeq=0;this.observers=new Set();}
    bind(id,table,spec={}){
      const node=resolveElement(table);if(!node)return null;const key=String(id||spec.id||node.dataset.tableId||node.id||'table');let surface=this.byElement.get(node);
      if(surface&&!surface.disposed){surface.stableId=surface.stableId||key;surface.updateSpec({...spec,id:key,owner:spec.owner||this.scope?.owner||surface.owner});this.rows.set(key,surface);return surface;}
      surface=new TableSurface(this.scope,node,{...spec,id:key,owner:spec.owner||this.scope?.owner||'core.table'});this.byElement.set(node,surface);this.rows.set(key,surface);return surface;
    }
    mount(id,container,spec={}){const host=resolveElement(container);if(!host)return null;let table=spec.table?resolveElement(spec.table,host):host.querySelector?.('table[data-dkds-mounted-table]');if(!table){table=document.createElement('table');table.dataset.dkdsMountedTable='1';if(spec.className)table.className=String(spec.className);host.replaceChildren(table);}const surface=this.bind(id,table,spec);if(spec.columns)surface.setData(spec.columns,spec.rows||[]);return surface;}
    anonymousId(table){let id=this.anonymousIds.get(table);if(id)return id;id=`anonymous-${++this.anonymousSeq}`;this.anonymousIds.set(table,id);return id;}
    hydrationId(table){const explicit=String(table?.dataset?.tableId||table?.id||'').trim();return {explicit,id:explicit||this.anonymousId(table)};}
    hydrate(root=document,spec={}){const base=resolveElement(root)||root;if(!base?.querySelectorAll)return [];const selector=spec.selector||'table:not([data-dkds-table="off"])';const tables=[];if(base.matches?.(selector))tables.push(base);tables.push(...base.querySelectorAll(selector));return tables.map(table=>{const {explicit,id}=this.hydrationId(table);return this.bind(id,table,{...spec,persist:explicit?spec.persist:(spec.persistAnonymous===true)});}).filter(Boolean);}
    hydrateAddedNode(node,spec={}){if(!node||node.nodeType!==1)return [];const selector=spec.selector||'table:not([data-dkds-table="off"])';const tables=[];if(node.matches?.(selector))tables.push(node);tables.push(...(node.querySelectorAll?.(selector)||[]));return tables.map(table=>{const {explicit,id}=this.hydrationId(table);return this.bind(id,table,{...spec,persist:explicit?spec.persist:(spec.persistAnonymous===true)});}).filter(Boolean);}
    prune(){for(const [key,surface] of [...this.rows])if(!surface?.table?.isConnected){surface?.dispose?.();this.rows.delete(key);}return this.rows.size;}
    observe(root=document,spec={}){const base=resolveElement(root)||root;this.hydrate(base,spec);if(!window.MutationObserver||!base)return()=>{};const observer=new MutationObserver(records=>{let removed=false;for(const record of records){if(record.type!=='childList')continue;for(const node of record.addedNodes||[])this.hydrateAddedNode(node,spec);if(record.removedNodes?.length)removed=true;}if(removed)this.prune();});observer.observe(base,{childList:true,subtree:true});this.observers.add(observer);return()=>{observer.disconnect();this.observers.delete(observer);};}
    get(value){const node=resolveElement(value);if(node)return this.byElement.get(node)||null;return this.rows.get(String(value||''))||null;}
    dispose(){for(const observer of this.observers)observer.disconnect();this.observers.clear();for(const surface of new Set(this.rows.values()))surface.dispose?.();this.rows.clear();this.byElement=new WeakMap();this.anonymousIds=new WeakMap();this.anonymousSeq=0;}
  }

  const TableView=TableSurface;
  const TableViewRegistry=TableSurfaceRegistry;
  const globalTableSurfaceRegistry=new TableSurfaceRegistry(null);
  let globalTableObserverCleanup=null;
  function ensureGlobalTableSurfaceObserver(){if(globalTableObserverCleanup||typeof document==='undefined')return;const start=()=>{if(globalTableObserverCleanup)return;globalTableObserverCleanup=globalTableSurfaceRegistry.observe(document,{selector:'table:not([data-dkds-table="off"])',owner:'core.table'});};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else Promise.resolve().then(start);}
  ensureGlobalTableSurfaceObserver();


  class ScientificCurveSurface {
    constructor(scope,target,spec={}){
      this.scope=scope;this.owner=scope.owner;this.target=resolveElement(target);this.spec={...spec};this.disposed=false;this.renderQueued=false;this.selectionSnapshot=null;this.selectionOff=null;this.interaction=null;this.pointOrderCache=new WeakMap();this.colorScaleState={key:'',scale:null};this.markerClickSuppressUntil=new Map();
      if(!this.target)throw new Error('ScientificCurveSurface target not found.');
      this.entities=scope.entities||window.DKDSEntities?.createScope?.(this.owner)||null;
      this.target.classList.add('dkds-scientific-curve-surface');
      this.container=resolveElement(spec.container)||this.target.parentElement||this.target;
      this.container.classList.add('dkds-scientific-surface-host');
      this.installNavigationTools();
      this.resizeObserver=window.ResizeObserver?new ResizeObserver(()=>this.requestRender('resize')):null;
      this.resizeObserver?.observe(this.container);
      this.setInteraction(spec.interaction||null);
    }
    d3(){return window.d3||null;}
    finite(value){return Number.isFinite(Number(value));}
    curves(){const rows=this.spec.getCurves?.()||[];return Array.isArray(rows)?rows.filter(Boolean):[];}
    markers(){const rows=this.spec.getMarkers?.()||[];return Array.isArray(rows)?rows.filter(Boolean):[];}
    view(){const raw=this.spec.getView?.()||{};return raw&&typeof raw==='object'?raw:{};}
    setView(next,meta={}){this.spec.setView?.(next,meta);this.spec.onViewChanged?.(next,meta);}
    setInteraction(interaction){if(this.interaction===interaction)return;this.selectionOff?.();this.selectionOff=null;this.interaction=interaction||null;if(this.interaction?.subscribe)this.selectionOff=this.interaction.subscribe(snapshot=>{this.selectionSnapshot=snapshot;this.requestRender('entity-selection');},{immediate:true});}
    focusEntityId(){return String(this.selectionSnapshot?.focus?.id||this.selectionSnapshot?.items?.at?.(-1)?.id||'');}
    ensureEntity(id,parentId=''){const key=String(id||'');if(!key)return null;try{return this.entities?.ensure?.({id:key,parents:parentId?[String(parentId)]:[]})||{id:key};}catch{return {id:key};}}
    selectedCurveId(){const explicit=String(this.spec.getSelectedCurveId?.()||'');if(explicit)return explicit;const focus=this.focusEntityId();if(!focus)return '';const ids=this.curves().map(row=>String(row?.entityId||row?.id||'')).filter(Boolean),set=new Set(ids);if(set.has(focus))return focus;return String(this.entities?.closestInSet?.(focus,set)||'');}
    selectedMarkerIds(){const explicit=(this.spec.getSelectedMarkerIds?.()||[]).map(String).filter(Boolean);if(explicit.length)return new Set(explicit);const markerIds=new Set(this.markers().map(row=>String(row?.entityId||row?.id||'')).filter(Boolean)),selected=new Set((this.selectionSnapshot?.items||[]).map(item=>String(item?.id||'')).filter(id=>markerIds.has(id)));const focus=this.focusEntityId();if(markerIds.has(focus))selected.add(focus);return selected;}
    selectEntity(id,{source='scientific-curve',additive=false,value=null,type='core.entity'}={}){const key=String(id||'');if(!key||!this.interaction?.select)return false;const entity=this.entities?.get?.(key)||{id:key,type,value};try{this.interaction.select({type:entity.type||type,id:key,ref:entity.ref||null,value:entity.value??value??entity,meta:{...(entity.metadata||{})}},{source,additive});return true;}catch{return false;}}
    curveById(id){return this.curves().find(row=>String(row.id)===String(id))||null;}
    normalizePoint(point,index=-1){
      const x=this.spec.xValue?this.spec.xValue(point):point?.x;
      const y=this.spec.yValue?this.spec.yValue(point):point?.y;
      return {x:Number(x),y:Number(y),raw:point,sourceIndex:index};
    }
    normalizedPoints(curve){return (curve?.points||[]).map((p,index)=>this.normalizePoint(p,index)).filter(p=>this.finite(p.x)&&this.finite(p.y));}
    nearestIndex(points,value){
      if(!points.length)return -1;const target=Number(value);
      if(!Number.isFinite(target))return 0;
      // A normalized point array is immutable for the lifetime of one render.
      // Determine its sweep order once, then reuse that metadata throughout
      // pointermove. This keeps ordered sweeps on the O(log n) hot path instead
      // of rescanning every sample on every drag event.
      let order=this.pointOrderCache.get(points);
      if(!order){
        const first=Number(points[0].x),last=Number(points.at(-1).x),ascending=last>=first;let ordered=true;
        for(let i=1;i<points.length;i++){const a=Number(points[i-1].x),b=Number(points[i].x);if((ascending&&b<a)||(!ascending&&b>a)){ordered=false;break;}}
        order={ascending,ordered};this.pointOrderCache.set(points,order);
      }
      if(!order.ordered){let best=0,dist=Infinity;for(let i=0;i<points.length;i++){const d=Math.abs(Number(points[i].x)-target);if(d<dist){dist=d;best=i;}}return best;}
      let lo=0,hi=points.length-1;
      while(lo<hi){const mid=(lo+hi)>>1,x=Number(points[mid].x);if(order.ascending?(x<target):(x>target))lo=mid+1;else hi=mid;}
      if(lo>0&&Math.abs(Number(points[lo-1].x)-target)<=Math.abs(Number(points[lo].x)-target))return lo-1;return lo;
    }
    installNavigationTools(){
      if(this.spec.navigationTools===false||this.navTools)return;
      const tools=document.createElement('div');tools.className='dkds-scientific-nav-tools';tools.setAttribute('aria-label','图形操作');
      const rows=[['zoom-in','＋','放大'],['zoom-out','−','缩小'],['home','⌂','恢复全部数据']];
      for(const [action,label,title] of rows){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;button.title=title;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(action==='home')this.resetView({reason:'toolbar-home'});else this.zoomBy(action==='zoom-in'?0.72:1.38,{reason:`toolbar-${action}`});});tools.appendChild(button);}
      this.container.appendChild(tools);this.navTools=tools;
    }
    zoomBy(factor,meta={}){
      const last=this.lastRender;if(!last)return false;const xd=last.x.domain(),yd=last.y.domain(),cx=(xd[0]+xd[1])/2,cy=(yd[0]+yd[1])/2;
      this.setView({xDomain:this.scaleDomainAround(xd,cx,Number(factor)||1),yDomain:this.scaleDomainAround(yd,cy,Number(factor)||1)},{reason:'toolbar-zoom',...meta});this.requestRender('toolbar-zoom');return true;
    }
    scaleDomainAround(domain,center,factor,minSpan=1e-12){const lo=center+(domain[0]-center)*factor,hi=center+(domain[1]-center)*factor;return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=minSpan?[lo,hi]:domain.slice();}
    symbolType(shape,d3){return ({circle:d3.symbolCircle,diamond:d3.symbolDiamond,triangle:d3.symbolTriangle,square:d3.symbolSquare,cross:d3.symbolCross,star:d3.symbolStar})[String(shape||'circle')]||d3.symbolCircle;}
    requestRender(reason='request'){if(this.disposed||this.renderQueued)return;this.renderQueued=true;requestAnimationFrame(()=>{this.renderQueued=false;if(!this.disposed)this.render(reason);});}
    fitToData(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'fit-data',...meta});this.spec.onFit?.(meta);this.requestRender('fit-data');return true;}
    resetView(meta={}){this.setView({xDomain:null,yDomain:null},{reason:'reset',...meta});this.spec.onReset?.(meta);this.requestRender('reset');return true;}
    updateMarkerVisual(marker,point){
      const last=this.lastRender;if(!last||!marker||!point)return false;const id=String(marker.id),xv=Number(point.x??point.v),yv=Number(point.y??point.i);if(!Number.isFinite(xv)||!Number.isFinite(yv))return false;
      marker.x=xv;marker.y=yv;const {dataLayer,x,y}=last;if(!dataLayer||!x||!y)return false;
      const nodes=last.markerNodes?.get?.(id);
      if(nodes?.mark)nodes.mark.setAttribute('transform',`translate(${x(xv)},${y(yv)})`);else dataLayer.selectAll('path.dkds-scientific-marker').filter(d=>String(d?.id)===id).attr('transform',`translate(${x(xv)},${y(yv)})`);
      if(nodes?.hit){nodes.hit.setAttribute('cx',String(x(xv)));nodes.hit.setAttribute('cy',String(y(yv)));}else dataLayer.selectAll('circle.dkds-scientific-marker-hit').filter(d=>String(d?.id)===id).attr('cx',x(xv)).attr('cy',y(yv));
      return true;
    }
    nearestCurveAtPixel(px,py,x,y,curves,maxDistancePx=18){
      let best=null;
      for(const curve of curves){const points=this.normalizedPoints(curve);if(!points.length)continue;const idx=this.nearestIndex(points,x.invert(px));for(let j=Math.max(0,idx-2);j<=Math.min(points.length-1,idx+2);j++){const p=points[j],dx=x(p.x)-px,dy=y(p.y)-py,dist=Math.hypot(dx,dy);if(!best||dist<best.distance)best={curve,point:p,index:Number.isFinite(Number(p.sourceIndex))?Number(p.sourceIndex):j,distance:dist};}}
      return best&&best.distance<=maxDistancePx?best:null;
    }
    render(reason='render'){
      const d3=this.d3(),node=this.target,container=this.container;if(!d3||!node||!container)return false;
      const rect=container.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height);
      const minWidth=Number(this.spec.minWidth)||260,minHeight=Number(this.spec.minHeight)||180;
      if(width<minWidth||height<minHeight){this.requestRender('await-layout');return false;}
      const curves=this.curves(),svg=d3.select(node);svg.on('.dkdssci',null).attr('viewBox',null).attr('preserveAspectRatio',null).attr('width',width).attr('height',height).style('width',`${width}px`).style('height',`${height}px`);svg.selectAll('*').remove();
      if(!curves.length){this.spec.onEmpty?.({svg,width,height});if(!this.spec.onEmpty)svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('fill','#6b7280').text(this.spec.emptyText||'没有可显示的数据');return true;}
      const margin={top:62,right:30,bottom:50,left:78,...(this.spec.margin||{})},innerW=Math.max(60,width-margin.left-margin.right),innerH=Math.max(60,height-margin.top-margin.bottom);
      const normalized=new Map(curves.map(curve=>[String(curve.id),this.normalizedPoints(curve)]));
      const xs=[...normalized.values()].flatMap(rows=>rows.map(p=>p.x)),ys=[...normalized.values()].flatMap(rows=>rows.map(p=>p.y));if(!xs.length||!ys.length)return false;
      const fullX=d3.extent(xs);let fullY=d3.extent(ys),ypad=((fullY[1]-fullY[0])||1)*Number(this.spec.yPaddingFactor??.06);fullY=[fullY[0]-ypad,fullY[1]+ypad];
      const view=this.view();let xDomain=Array.isArray(view.xDomain)?view.xDomain.slice():d3.scaleLinear().domain(fullX).nice().domain(),yDomain=Array.isArray(view.yDomain)?view.yDomain.slice():d3.scaleLinear().domain(fullY).nice().domain();
      if(!xDomain.every(Number.isFinite)||xDomain[0]===xDomain[1])xDomain=fullX.slice();if(!yDomain.every(Number.isFinite)||yDomain[0]===yDomain[1])yDomain=fullY.slice();
      const x=d3.scaleLinear().domain(xDomain).range([margin.left,margin.left+innerW]),y=d3.scaleLinear().domain(yDomain).range([margin.top+innerH,margin.top]);
      const clipId=`dkds-sci-clip-${Math.random().toString(36).slice(2,9)}`;svg.append('defs').append('clipPath').attr('id',clipId).append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH);
      const plotBg=svg.append('rect').attr('class','dkds-scientific-plot-bg').attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH).style('cursor','crosshair');
      svg.append('g').attr('class','dkds-scientific-axis').attr('transform',`translate(0,${margin.top+innerH})`).call(d3.axisBottom(x).tickFormat(this.spec.xTickFormat||undefined));
      svg.append('g').attr('class','dkds-scientific-axis').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(this.spec.yTickFormat||undefined));
      if(this.spec.xTitle!==false)svg.append('text').attr('class','dkds-scientific-axis-title').attr('x',margin.left+innerW/2).attr('y',height-10).attr('text-anchor','middle').text(this.spec.xTitle||'X');
      if(this.spec.yTitle!==false)svg.append('text').attr('class','dkds-scientific-axis-title').attr('transform',`translate(18,${margin.top+innerH/2}) rotate(-90)`).attr('text-anchor','middle').text(this.spec.yTitle||'Y');
      const configuredColorValues=this.spec.getColorDomainValues?.();const values=(Array.isArray(configuredColorValues)&&configuredColorValues.some(v=>this.finite(v))?configuredColorValues:curves.map(c=>c.colorValue)).filter(v=>this.finite(v)).map(Number);if(!values.length)values.push(0);const extent=d3.extent(values);if(extent[0]===extent[1]){extent[0]-=1;extent[1]+=1;}
      // Color-domain changes are semantic data changes, not selection/drag changes.
      // Keep the scale stable across geometry-only renders so external legends do
      // not rebuild or flicker when a marker is dragged or focus changes.
      const colorScaleKey=`${extent[0]}|${extent[1]}|${values.join(',')}`;let colorScale=this.colorScaleState?.key===colorScaleKey?this.colorScaleState.scale:null;
      if(!colorScale){colorScale=this.spec.colorScale?.({d3,extent,curves,values})||d3.scaleSequential(d3.interpolateTurbo).domain(extent);this.colorScaleState={key:colorScaleKey,scale:colorScale};this.spec.onColorScale?.(colorScale,{curves,extent,values});}
      for(const curve of curves)this.ensureEntity(curve?.entityId||curve?.id);const selectedCurveId=this.selectedCurveId(),hasCurveSelection=!!selectedCurveId,dataLayer=svg.append('g').attr('clip-path',`url(#${clipId})`);
      const line=d3.line().defined(p=>this.finite(p.x)&&this.finite(p.y)).x(p=>x(p.x)).y(p=>y(p.y));
      for(const curve of curves){
        const points=normalized.get(String(curve.id))||[],active=String(curve.id)===selectedCurveId,color=curve.color||colorScale(this.finite(curve.colorValue)?Number(curve.colorValue):0),dash=curve.dash??(Number(curve.direction)<0?'7 4':null);
        const opacity=curve.opacity??(hasCurveSelection?(active?1:.10):.74),strokeWidth=curve.strokeWidth??(active?3:1.25);
        dataLayer.append('path').datum(points).attr('class',`dkds-scientific-curve ${hasCurveSelection&&!active?'is-dimmed':''}`).attr('d',line).attr('stroke',color).attr('stroke-width',strokeWidth).attr('stroke-dasharray',dash).attr('opacity',opacity).style('pointer-events','none');
        dataLayer.append('path').datum(points).attr('class','dkds-scientific-curve-hit').attr('d',line)
          .on('click',(event)=>{event.stopPropagation();const [px]=d3.pointer(event,node),xValue=x.invert(px);if(event.ctrlKey||event.shiftKey)this.spec.onCurveModifiedClick?.({curve,x:xValue,event,surface:this});else if(this.spec.onCurveSelect)this.spec.onCurveSelect({curve,event,surface:this});else this.selectEntity(curve?.entityId||curve?.id,{source:this.spec.source||'scientific-curve',value:curve?.source||curve});})
          .on('dblclick',event=>{event.preventDefault();event.stopPropagation();if(this.spec.onCurveDoubleClick)this.spec.onCurveDoubleClick({curve,event,surface:this});else this.selectEntity(curve?.entityId||curve?.id,{source:this.spec.source||'scientific-curve-double',value:curve?.source||curve});});
      }
      const markers=this.markers();for(const marker of markers)this.ensureEntity(marker?.entityId||marker?.id,marker?.curveId||'');const selectedMarkerIds=this.selectedMarkerIds(),markerNodes=new Map();
      if(this.spec.showMarkers?.()!==false&&markers.length){
        const marks=dataLayer.append('g').selectAll('path.dkds-scientific-marker').data(markers,m=>m.id).join('path').attr('class',m=>`dkds-scientific-marker ${m.locked?'is-locked':''} ${hasCurveSelection&&String(m.curveId)!==selectedCurveId?'is-dimmed':''}`)
          .attr('d',m=>d3.symbol().type(this.symbolType(m.shape,d3)).size(selectedMarkerIds.has(String(m.id))?180:105)()).attr('transform',m=>`translate(${x(Number(m.x))},${y(Number(m.y))})`).attr('fill',m=>m.color||'#2563eb')
          .attr('stroke',m=>selectedMarkerIds.has(String(m.id))?'#111827':(m.accepted!==false?'#fff':'#6b7280')).attr('stroke-width',m=>selectedMarkerIds.has(String(m.id))?3.2:1.8).attr('opacity',m=>{let o=m.accepted!==false?.98:.34;if(hasCurveSelection&&String(m.curveId)!==selectedCurveId)o*=.11;return o;}).style('pointer-events','none');
        const hits=dataLayer.append('g').selectAll('circle.dkds-scientific-marker-hit').data(markers,m=>m.id).join('circle').attr('class',m=>`dkds-scientific-marker-hit ${m.locked?'is-locked':''}`).attr('cx',m=>x(Number(m.x))).attr('cy',m=>y(Number(m.y))).attr('r',m=>selectedMarkerIds.has(String(m.id))?12:10)
          .on('click',(event,marker)=>{event.stopPropagation();const id=String(marker?.id||'');if((this.markerClickSuppressUntil.get(id)||0)>Date.now()){event.preventDefault();return;}this.spec.onMarkerSelect?.({marker,event,surface:this,additive:!!(event.ctrlKey||event.metaKey)});})
          .on('dblclick',(event,marker)=>{event.preventDefault();event.stopPropagation();this.spec.onMarkerDoubleClick?.({marker,event,surface:this});})
          .on('contextmenu',(event,marker)=>{if(!(event.ctrlKey||event.shiftKey))return;event.preventDefault();event.stopPropagation();if(!marker.locked)this.spec.onMarkerDelete?.({marker,event,surface:this});else this.spec.onLockedMarkerAction?.({marker,action:'delete',event,surface:this});})
          .on('mouseenter',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'enter'})).on('mousemove',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'move'})).on('mouseleave',(event,marker)=>this.spec.onMarkerHover?.({marker,event,surface:this,phase:'leave'}));
        marks.each(function(marker){const id=String(marker?.id||'');if(!id)return;const row=markerNodes.get(id)||{};row.mark=this;markerNodes.set(id,row);});
        hits.each(function(marker){const id=String(marker?.id||'');if(!id)return;const row=markerNodes.get(id)||{};row.hit=this;markerNodes.set(id,row);});
        const markerDragState=new Map(),curveById=new Map(curves.map(curve=>[String(curve.id),curve]));
        hits.call(d3.drag().clickDistance(7).filter(event=>event.button===0&&!event.ctrlKey).on('start',(event,marker)=>{if(marker.locked)return;markerDragState.set(String(marker.id),{x:Number(event.x),y:Number(event.y),moved:false,curve:null,index:-1,point:null});this.spec.onMarkerDragStart?.({marker,event,surface:this});}).on('drag',(event,marker)=>{if(marker.locked)return;const state=markerDragState.get(String(marker.id));if(state&&!state.moved){state.moved=Math.hypot(Number(event.x)-state.x,Number(event.y)-state.y)>=5;if(!state.moved)return;}const curve=curveById.get(String(marker.curveId)),points=normalized.get(String(marker.curveId))||[];if(!curve||!points.length)return;const idx=this.nearestIndex(points,x.invert(event.x)),point=points[idx],sourceIndex=Number.isFinite(Number(point?.sourceIndex))?Number(point.sourceIndex):idx;if(state){state.curve=curve;state.index=sourceIndex;state.point=point?.raw||point;}const payload={marker,curve,index:sourceIndex,point:point?.raw||point,event,surface:this};this.spec.onMarkerDragPreview?.(payload);this.spec.onMarkerDrag?.(payload);this.updateMarkerVisual(marker,point);}).on('end',(event,marker)=>{if(marker.locked)return;const state=markerDragState.get(String(marker.id));markerDragState.delete(String(marker.id));if(!state?.moved)return;const payload={marker,curve:state.curve,index:state.index,point:state.point,event,surface:this};this.markerClickSuppressUntil.set(String(marker.id),Date.now()+160);this.spec.onMarkerDragCommit?.(payload);this.spec.onMarkerDragEnd?.(payload);this.requestRender('marker-drag-end');}));
      }
      const selectedMarker=markers.find(m=>selectedMarkerIds.has(String(m.id)));
      if(selectedMarker&&this.spec.showWidth?.()!==false){
        const widthSpec=this.spec.getMarkerWidth?.(selectedMarker)||selectedMarker.width;
        if(widthSpec){
          const finite=v=>this.finite(v),color=selectedMarker.color||'#2563eb';
          let measureLeft=finite(widthSpec.left)?Number(widthSpec.left):NaN,measureRight=finite(widthSpec.right)?Number(widthSpec.right):NaN;
          if(finite(measureLeft)&&finite(measureRight)&&measureLeft>measureRight)[measureLeft,measureRight]=[measureRight,measureLeft];
          let windowLeft=finite(widthSpec.windowLeft)?Number(widthSpec.windowLeft):measureLeft,windowRight=finite(widthSpec.windowRight)?Number(widthSpec.windowRight):measureRight;
          if(finite(windowLeft)&&finite(windowRight)&&windowLeft>windowRight)[windowLeft,windowRight]=[windowRight,windowLeft];
          if(finite(windowLeft)&&finite(windowRight)&&windowRight>windowLeft){
            const band=svg.append('g').attr('clip-path',`url(#${clipId})`);
            band.append('rect').attr('class','dkds-scientific-width-band').attr('x',x(windowLeft)).attr('width',Math.max(2,x(windowRight)-x(windowLeft))).attr('y',margin.top).attr('height',innerH).attr('fill',color);
            const baseline=widthSpec.baseline;
            if(baseline&&finite(baseline.x1)&&finite(baseline.x2)&&finite(baseline.y1)&&finite(baseline.y2)){
              band.append('line').attr('class','dkds-scientific-baseline-line').attr('x1',x(Number(baseline.x1))).attr('x2',x(Number(baseline.x2))).attr('y1',y(Number(baseline.y1))).attr('y2',y(Number(baseline.y2))).attr('stroke',color);
            }
            if(finite(measureLeft)&&finite(measureRight)&&measureRight>measureLeft){
              const yLeft=finite(widthSpec.yLeft)?Number(widthSpec.yLeft):(finite(widthSpec.y)?Number(widthSpec.y):Number(selectedMarker.y));
              const yRight=finite(widthSpec.yRight)?Number(widthSpec.yRight):yLeft;
              band.append('line').attr('class','dkds-scientific-width-line').attr('x1',x(measureLeft)).attr('x2',x(measureRight)).attr('y1',y(yLeft)).attr('y2',y(yRight)).attr('stroke',color);
              for(const row of [{x:measureLeft,y:yLeft},{x:measureRight,y:yRight}])band.append('circle').attr('class','dkds-scientific-width-crossing').attr('cx',x(row.x)).attr('cy',y(row.y)).attr('r',3.5).attr('fill','#fff').attr('stroke',color).attr('stroke-width',1.6);
            }
            const handleY=String(widthSpec.handlePosition||'').toLowerCase()==='top'?margin.top+10:(finite(widthSpec.handleY)?y(Number(widthSpec.handleY)):margin.top+10);
            for(const side of ['left','right']){
              const xv=side==='left'?windowLeft:windowRight;
              const h=band.append('circle').attr('class','dkds-scientific-width-handle dkds-scientific-window-handle').attr('data-width-side',side).attr('cx',x(xv)).attr('cy',handleY).attr('r',6).attr('fill','#fff').attr('stroke',color).attr('stroke-width',2);let widthDragMoved=false;
              const initialWindowLeft=windowLeft,initialWindowRight=windowRight;
              h.on('click',event=>event.stopPropagation()).on('dblclick',event=>{event.preventDefault();event.stopPropagation();this.spec.onWidthReset?.({marker:selectedMarker,side,event,surface:this});this.requestRender('width-reset');})
                .call(d3.drag().clickDistance(5).filter(event=>event.button===0).on('start',event=>{widthDragMoved=false;this.spec.onWidthDragStart?.({marker:selectedMarker,side,windowLeft,windowRight,event,surface:this});}).on('drag',event=>{
                  if(selectedMarker.locked)return;
                  const curve=curves.find(c=>String(c.id)===String(selectedMarker.curveId)),points=normalized.get(String(selectedMarker.curveId))||[];
                  if(!curve||!points.length)return;
                  const idx=this.nearestIndex(points,x.invert(event.x)),point=points[idx];
                  // The analysis window is a Core-owned atomic edit draft. Pointermove
                  // updates only SVG geometry. Domain state is committed once at end,
                  // with both endpoints present, so a one-sided drag can never be
                  // interpreted as an incomplete scientific window.
                  const previewX=Number(point?.x),anchorX=Number(selectedMarker?.x);widthDragMoved=true;
                  let nl=windowLeft,nr=windowRight;
                  if(finite(previewX)){
                    if(side==='left')nl=Math.min(previewX,finite(anchorX)?anchorX-1e-15:nr-1e-15);else nr=Math.max(previewX,finite(anchorX)?anchorX+1e-15:nl+1e-15);
                  }
                  if(nl>nr)[nl,nr]=[nr,nl];
                  if(finite(nl)&&finite(nr)&&nr>nl){windowLeft=nl;windowRight=nr;band.select('rect.dkds-scientific-width-band').attr('x',x(nl)).attr('width',Math.max(2,x(nr)-x(nl)));band.selectAll('circle.dkds-scientific-window-handle').attr('cx',function(){return x(this.getAttribute('data-width-side')==='left'?nl:nr);});}
                  const payload={marker:selectedMarker,curve,side,index:Number.isFinite(Number(point?.sourceIndex))?Number(point.sourceIndex):idx,point:point?.raw||point,windowLeft,windowRight,initialWindowLeft,initialWindowRight,event,surface:this};this.spec.onWidthDragPreview?.(payload);this.spec.onWidthDrag?.(payload);
                }).on('end',event=>{if(!widthDragMoved)return;const payload={marker:selectedMarker,side,windowLeft,windowRight,initialWindowLeft,initialWindowRight,event,surface:this};this.spec.onWidthWindowCommit?.(payload);this.spec.onWidthDragEnd?.(payload);this.requestRender('width-drag-end');}));
            }
          }
        }
      }
      this.spec.afterRender?.({svg,dataLayer,x,y,curves,markers,width,height,margin,innerW,innerH,clipId,colorScale,surface:this});
      let rangeDrag=null;plotBg.on('pointerdown',event=>{if(event.button!==0)return;this.spec.onRangeStart?.({event,surface:this});const [px,py]=d3.pointer(event,node),sx=Math.max(margin.left,Math.min(margin.left+innerW,px)),sy=Math.max(margin.top,Math.min(margin.top+innerH,py));rangeDrag={pointerId:event.pointerId,sx,sy,ex:sx,ey:sy,zoom:!!event.ctrlKey,moved:false};try{plotBg.node().setPointerCapture(event.pointerId);}catch{}event.preventDefault();}).on('pointermove',event=>{if(!rangeDrag||rangeDrag.pointerId!==event.pointerId)return;const [px,py]=d3.pointer(event,node);rangeDrag.ex=Math.max(margin.left,Math.min(margin.left+innerW,px));rangeDrag.ey=Math.max(margin.top,Math.min(margin.top+innerH,py));rangeDrag.moved=rangeDrag.moved||Math.hypot(rangeDrag.ex-rangeDrag.sx,rangeDrag.ey-rangeDrag.sy)>=5;svg.selectAll('.dkds-scientific-direct-box').remove();svg.append('rect').attr('class',`dkds-scientific-direct-box ${rangeDrag.zoom?'is-zoom':'is-range'}`).attr('x',Math.min(rangeDrag.sx,rangeDrag.ex)).attr('y',Math.min(rangeDrag.sy,rangeDrag.ey)).attr('width',Math.abs(rangeDrag.ex-rangeDrag.sx)).attr('height',Math.abs(rangeDrag.ey-rangeDrag.sy));event.preventDefault();});
      const finishRange=event=>{if(!rangeDrag||rangeDrag.pointerId!==event.pointerId)return;const drag=rangeDrag;rangeDrag=null;svg.selectAll('.dkds-scientific-direct-box').remove();try{plotBg.node().releasePointerCapture(event.pointerId);}catch{}if(!drag.moved){const near=this.nearestCurveAtPixel(drag.sx,drag.sy,x,y,curves,Number(this.spec.nearestDistance)||18);if(near){if(drag.zoom)this.spec.onCurveModifiedClick?.({curve:near.curve,x:near.point.x,event,surface:this,source:'background'});else if(this.spec.onCurveSelect)this.spec.onCurveSelect({curve:near.curve,event,surface:this,source:'background'});else this.selectEntity(near.curve?.entityId||near.curve?.id,{source:this.spec.source||'scientific-curve-background',value:near.curve?.source||near.curve});}else if(!drag.zoom){if(this.spec.onClearSelection)this.spec.onClearSelection({event,surface:this});else this.interaction?.clear?.({source:this.spec.source||'scientific-curve-background'});}return;}const sx0=Math.min(drag.sx,drag.ex),sx1=Math.max(drag.sx,drag.ex),sy0=Math.min(drag.sy,drag.ey),sy1=Math.max(drag.sy,drag.ey);if(Math.abs(sx1-sx0)<6||Math.abs(sy1-sy0)<6)return;if(drag.zoom){const next={xDomain:[x.invert(sx0),x.invert(sx1)].sort((a,b)=>a-b),yDomain:[y.invert(sy1),y.invert(sy0)].sort((a,b)=>a-b)};this.setView(next,{reason:'box-zoom',event});this.requestRender('box-zoom');return;}const selection={xMin:Math.min(x.invert(sx0),x.invert(sx1)),xMax:Math.max(x.invert(sx0),x.invert(sx1)),yMin:Math.min(y.invert(sy0),y.invert(sy1)),yMax:Math.max(y.invert(sy0),y.invert(sy1)),curveId:selectedCurveId,event,surface:this,target:String(this.spec.rangeSelectionTarget||'samples'),targetType:String(this.spec.rangeSelectionType||'')};selection.markers=markers.filter(marker=>this.finite(marker?.x)&&this.finite(marker?.y)&&Number(marker.x)>=selection.xMin&&Number(marker.x)<=selection.xMax&&Number(marker.y)>=selection.yMin&&Number(marker.y)<=selection.yMax);selection.markerIds=selection.markers.map(marker=>String(marker?.entityId||marker?.id||'')).filter(Boolean);this.spec.onRangeSelect?.(selection);};plotBg.on('pointerup',finishRange).on('pointercancel',()=>{rangeDrag=null;svg.selectAll('.dkds-scientific-direct-box').remove();});
      plotBg.on('dblclick',event=>{event.preventDefault();this.resetView({event});});
      svg.on('wheel.dkdssci',event=>{const [px,py]=d3.pointer(event,node);if(px<margin.left||px>margin.left+innerW||py<margin.top||py>margin.top+innerH)return;event.preventDefault();event.stopPropagation();this.spec.onWheelZoomStart?.({event,surface:this});const dy=Math.max(-220,Math.min(220,Number(event.deltaY)||0)),factor=Math.max(.72,Math.min(1.38,Math.exp(dy*.00145))),cx=x.invert(px),cy=y.invert(py),minX=Math.max(1e-12,Math.abs(fullX[1]-fullX[0])*1e-6),minY=Math.max(1e-30,Math.abs(fullY[1]-fullY[0])*1e-6),next={xDomain:this.scaleDomainAround(xDomain,cx,factor,minX),yDomain:this.scaleDomainAround(yDomain,cy,factor,minY)};this.setView(next,{reason:'wheel',event});this.requestRender('wheel');});
      const selectedRange=this.spec.getRangeSelection?.();if(selectedRange&&this.finite(selectedRange.xMin??selectedRange.min)&&this.finite(selectedRange.xMax??selectedRange.max)){
        const xv0=Number(selectedRange.xMin??selectedRange.min),xv1=Number(selectedRange.xMax??selectedRange.max),rx0=x(xv0),rx1=x(xv1),hasY=this.finite(selectedRange.yMin)&&this.finite(selectedRange.yMax),yv0=hasY?Number(selectedRange.yMin):null,yv1=hasY?Number(selectedRange.yMax):null,ry0=hasY?y(yv0):margin.top+innerH,ry1=hasY?y(yv1):margin.top;
        if(Number.isFinite(rx0)&&Number.isFinite(rx1)&&Number.isFinite(ry0)&&Number.isFinite(ry1)){
          const xLo=Math.min(xv0,xv1),xHi=Math.max(xv0,xv1),yLo=hasY?Math.min(yv0,yv1):-Infinity,yHi=hasY?Math.max(yv0,yv1):Infinity;
          svg.append('rect').attr('class','dkds-scientific-persisted-range').attr('x',Math.min(rx0,rx1)).attr('y',Math.min(ry0,ry1)).attr('width',Math.abs(rx1-rx0)).attr('height',Math.abs(ry1-ry0));
          const rangeTarget=String(this.spec.rangeSelectionTarget||'samples');
          if(rangeTarget==='markers'){
            const rangeMarkers=markers.filter(marker=>this.finite(marker?.x)&&this.finite(marker?.y)&&Number(marker.x)>=xLo&&Number(marker.x)<=xHi&&Number(marker.y)>=yLo&&Number(marker.y)<=yHi);
            const selectedLayer=dataLayer.append('g').attr('class','dkds-scientific-range-markers');
            selectedLayer.selectAll('circle').data(rangeMarkers,marker=>String(marker?.id||marker?.entityId||'')).join('circle').attr('cx',marker=>x(Number(marker.x))).attr('cy',marker=>y(Number(marker.y))).attr('r',8.5).attr('fill','rgba(255,255,255,.18)').attr('stroke',marker=>marker?.color||'#315efb').attr('stroke-width',2.2).style('pointer-events','none');
          }else{
            const selectedLayer=dataLayer.append('g').attr('class','dkds-scientific-range-points');
            for(const curve of curves){const points=(normalized.get(String(curve.id))||[]).filter(point=>point.x>=xLo&&point.x<=xHi&&point.y>=yLo&&point.y<=yHi);if(!points.length)continue;const color=curve.color||colorScale(this.finite(curve.colorValue)?Number(curve.colorValue):0),path=points.map(point=>`M${x(point.x).toFixed(2)},${y(point.y).toFixed(2)}h0`).join('');selectedLayer.append('path').attr('d',path).attr('fill','none').attr('stroke',color).attr('stroke-width',4.2).attr('stroke-linecap','round').attr('opacity',.96).style('pointer-events','none');}
          }
        }
      }
      this.lastRender={reason,width,height,x,y,colorScale,curves,markers,margin,innerW,innerH,clipId,dataLayer,markerNodes};return true;
    }
    dispose(){if(this.disposed)return;this.disposed=true;this.selectionOff?.();this.selectionOff=null;this.resizeObserver?.disconnect?.();try{this.d3()?.select(this.target)?.on('.dkdssci',null);}catch{}this.target.classList.remove('dkds-scientific-curve-surface');this.navTools?.remove?.();this.navTools=null;this.container?.classList?.remove('dkds-scientific-surface-host');}
  }

  class AnalysisWorkbench {
    constructor(scope,root,spec={}){
      this.scope=scope;this.owner=scope.owner;this.root=resolveElement(root);this.spec={...spec};
      this.primary=null;this.primes=new Map();this.subs=new Map();this.activeSub='';this.portables=new Map();this.grids=[];this.closed=false;
      this.resizeObserver=null;this.regionObserver=null;this.leftSplit=null;this.rightSplit=null;this.bottomSplit=null;
      if(!this.root)throw new Error('AnalysisWorkbench root not found.');
      this.root.classList.add('dkds-analysis-workbench-host');
      this.build();
    }
    build(){
      const s=this.spec;
      this.root.innerHTML=`<section class="dkds-analysis-workbench" data-workbench-owner="${esc(this.owner)}">
        <header class="dkds-analysis-header">
          <div class="dkds-analysis-heading"><h2></h2><div class="dkds-analysis-subtitle"></div></div>
          <div class="dkds-analysis-commandbar"></div>
          <button type="button" class="dkds-analysis-close">关闭窗口</button>
        </header>
        <nav class="dkds-analysis-nav" aria-label="分析工作区导航">
          <div class="dkds-analysis-nav-primary"></div><div class="dkds-analysis-nav-prime"></div><div class="dkds-analysis-nav-sub"></div>
        </nav>
        <div class="dkds-analysis-frame">
          <aside class="dkds-analysis-left" data-analysis-slot="left"></aside>
          <div class="dkds-analysis-left-resizer" role="separator" aria-orientation="vertical" title="拖动调整左侧宽度；双击复位"></div>
          <main class="dkds-analysis-main" data-analysis-slot="main">
            <div class="dkds-analysis-primary-host"></div><div class="dkds-analysis-sub-host hidden"></div>
          </main>
          <div class="dkds-analysis-right-resizer" role="separator" aria-orientation="vertical" title="拖动调整右侧宽度；双击复位"></div>
          <aside class="dkds-analysis-right" data-analysis-slot="right"></aside>
          <div class="dkds-analysis-bottom-resizer" role="separator" aria-orientation="horizontal" title="拖动调整底部高度；双击复位"></div>
          <section class="dkds-analysis-bottom" data-analysis-slot="bottom"></section>
          <div class="dkds-analysis-overlay" data-analysis-slot="overlay"></div>
        </div>
        <div class="dkds-analysis-parking" aria-hidden="true"></div>
      </section>`;
      this.shell=this.root.firstElementChild;
      this.slots={
        left:this.shell.querySelector('[data-analysis-slot="left"]'),main:this.shell.querySelector('[data-analysis-slot="main"]'),
        right:this.shell.querySelector('[data-analysis-slot="right"]'),bottom:this.shell.querySelector('[data-analysis-slot="bottom"]'),
        overlay:this.shell.querySelector('[data-analysis-slot="overlay"]'),primary:this.shell.querySelector('.dkds-analysis-primary-host'),
        sub:this.shell.querySelector('.dkds-analysis-sub-host'),parking:this.shell.querySelector('.dkds-analysis-parking')
      };
      const frame=this.shell.querySelector('.dkds-analysis-frame');
      const leftHandle=this.shell.querySelector('.dkds-analysis-left-resizer');
      const rightHandle=this.shell.querySelector('.dkds-analysis-right-resizer');
      const bottomHandle=this.shell.querySelector('.dkds-analysis-bottom-resizer');
      if(s.resizableLeft===false)leftHandle?.remove();else if(frame&&leftHandle){
        this.leftSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-left`,container:frame,handle:leftHandle,target:this.slots.left,cssVar:'--dkds-analysis-left-width',defaultSize:Number(s.leftWidth)||280,min:Number(s.leftMin)||210,reserve:Number(s.leftReserve)||520});
      }
      if(s.resizableRight===false)rightHandle?.remove();else if(frame&&rightHandle){
        this.rightSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-right`,container:frame,handle:rightHandle,target:this.slots.right,cssVar:'--dkds-analysis-right-width',defaultSize:Number(s.rightWidth)||390,min:Number(s.rightMin)||280,reserve:Number(s.rightReserve)||520,reverse:true});
      }
      if(s.resizableBottom===false)bottomHandle?.remove();else if(frame&&bottomHandle){
        this.bottomSplit=new SplitController(this.scope,{id:`analysis-${String(s.activity||s.id||'main')}-bottom`,container:frame,handle:bottomHandle,target:this.slots.bottom,cssVar:'--dkds-analysis-bottom-height',axis:'y',defaultSize:Number(s.bottomHeight)||320,min:Number(s.bottomMin)||190,reserve:Number(s.bottomReserve)||260,reverse:true});
      }
      const header=this.shell.querySelector('.dkds-analysis-header');
      if(s.header===false)header?.remove();else if(header){
        header.querySelector('h2').textContent=s.title||'';
        header.querySelector('.dkds-analysis-subtitle').textContent=s.subtitle||'';
        const close=header.querySelector('.dkds-analysis-close');
        if(s.closable===false)close?.remove();else if(close)close.onclick=()=>s.onClose?.();
        const commandHost=header.querySelector('.dkds-analysis-commandbar');
        if(Array.isArray(s.actions)&&s.actions.length&&commandHost)this.actions=new ActionGroup(this.owner,commandHost,{activity:s.activity,actions:s.actions});
        else commandHost?.remove();
      }
      this.syncRegions();
      if(window.MutationObserver){
        this.regionObserver=new MutationObserver(()=>this.syncRegions());
        for(const el of [this.slots.left,this.slots.right,this.slots.bottom])this.regionObserver.observe(el,{childList:true,subtree:false});
      }
      if(window.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>{this.syncRegions();this.scope.emitResize?.({reason:'analysis-workbench-observer'});});this.resizeObserver.observe(this.shell);}
    }
    portableSlot(name,row=null){return this.slots[String(name)]||null;}
    layout(){return {slot:name=>this.portableSlot(name)};}
    setTitle(title,subtitle){const h=this.shell.querySelector('h2');if(h)h.textContent=String(title||'');const st=this.shell.querySelector('.dkds-analysis-subtitle');if(st&&subtitle!==undefined)st.textContent=String(subtitle||'');return this;}
    syncRegions(){
      if(!this.shell)return;
      const visibleChildren=el=>[...(el?.children||[])].some(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden'));
      const left=visibleChildren(this.slots.left)&&!this.slots.left.classList.contains('hidden');
      const right=visibleChildren(this.slots.right);const bottom=visibleChildren(this.slots.bottom);
      this.shell.classList.toggle('has-left',left);this.shell.classList.toggle('has-right',right);this.shell.classList.toggle('has-bottom',bottom);
      this.shell.querySelector('.dkds-analysis-left-resizer')?.classList.toggle('active',left);
      this.shell.querySelector('.dkds-analysis-right-resizer')?.classList.toggle('active',right);
      this.shell.querySelector('.dkds-analysis-bottom-resizer')?.classList.toggle('active',bottom);
      return {left,right,bottom};
    }
    park(node){if(node&&this.slots.parking&&!this.slots.parking.contains(node))this.slots.parking.appendChild(node);return node;}
    mountPrimary(spec={}){
      cleanupCall(this.primary?.cleanup);
      this.primary={...spec,id:String(spec.id||'main')};
      const left=this.slots.left,main=this.slots.primary;
      left.replaceChildren();main.replaceChildren();
      if(spec.leftNode){const node=resolveElement(spec.leftNode,this.root)||spec.leftNode;if(node)left.appendChild(node);}
      else if(spec.leftHtml!==undefined)left.innerHTML=typeof spec.leftHtml==='function'?spec.leftHtml():String(spec.leftHtml||'');
      if(spec.mainNode){const node=resolveElement(spec.mainNode,this.root)||spec.mainNode;if(node)main.appendChild(node);}
      else if(spec.mainHtml!==undefined)main.innerHTML=typeof spec.mainHtml==='function'?spec.mainHtml():String(spec.mainHtml||'');
      const ctx={workbench:this,scope:this.scope,slots:this.slots,left,main,root:this.shell};
      const cleanup=spec.mount?.(ctx);if(typeof cleanup==='function')this.primary.cleanup=cleanup;
      queueMicrotask(()=>this.scope.plotViews?.hydrate?.(this.slots.primary,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)}));
      this.renderNav();this.syncRegions();this.resize('primary');return this;
    }
    registerSurface(spec={}){
      const role=String(spec.role||'').toLowerCase();
      if(role==='primary')return this.mountPrimary(spec);
      if(role==='prime')return this.registerPrime(spec);
      if(role==='sub')return this.registerSub(spec);
      throw new Error(`Unknown AnalysisWorkbench surface role: ${role||'(empty)'}`);
    }
    compose(spec={}){
      if(spec.primary)this.mountPrimary({...spec.primary,role:'primary'});
      for(const prime of spec.primes||[])this.registerPrime({...prime,role:'prime'});
      for(const sub of spec.subs||[])this.registerSub({...sub,role:'sub'});
      if(spec.openPrime)for(const entry of (Array.isArray(spec.openPrime)?spec.openPrime:[spec.openPrime]))this.openPrime(typeof entry==='string'?entry:entry.id,typeof entry==='string'?undefined:entry.placement);
      if(spec.openSub)this.openSub(typeof spec.openSub==='string'?spec.openSub:spec.openSub.id);
      return this;
    }
    registerPrime(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('PRIME id required.');
      const row={role:'prime',placements:['inline','right','bottom','float'],defaultPlacement:'inline',...spec,id,container:null,portable:null,mounted:false,cleanup:null,actionGroup:null};
      const owned=spec.existingNode||resolveElement(spec.node,this.shell)||resolveElement(spec.node,this.root);if(owned?.dataset)owned.dataset.dkdsPrimeOwned='1';
      this.primes.set(id,row);this.renderNav();if(spec.autoOpen===true)this.openPrime(id,spec.defaultPlacement);return row;
    }
    registerSub(spec={}){
      const id=String(spec.id||'').trim();if(!id)throw new Error('SUB id required.');
      const row={role:'sub',keepLeft:false,persistent:true,...spec,id,mounted:false,container:null,cleanup:null};this.subs.set(id,row);this.renderNav();return row;
    }
    renderNav(){
      const primaryHost=this.shell.querySelector('.dkds-analysis-nav-primary'),primeHost=this.shell.querySelector('.dkds-analysis-nav-prime'),subHost=this.shell.querySelector('.dkds-analysis-nav-sub');
      primaryHost?.replaceChildren();primeHost?.replaceChildren();subHost?.replaceChildren();
      if(this.primary&&primaryHost){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn';b.classList.toggle('active',!this.activeSub);b.textContent=this.primary.label||'主界面';b.onclick=()=>this.showPrimary();primaryHost.appendChild(b);}
      for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-prime-btn';b.classList.toggle('active',row.mounted);b.textContent=row.label||row.title||row.id;b.title='PRIME：可嵌入、固定或悬浮';b.onclick=()=>this.togglePrime(row.id);primeHost?.appendChild(b);}
      for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100))){const b=document.createElement('button');b.type='button';b.className='dkds-analysis-nav-btn dkds-analysis-sub-btn';b.classList.toggle('active',this.activeSub===row.id);b.textContent=row.label||row.title||row.id;b.onclick=()=>this.openSub(row.id);subHost?.appendChild(b);}
      const nav=this.shell.querySelector('.dkds-analysis-nav');if(nav)nav.classList.toggle('empty',!(primaryHost?.children.length||primeHost?.children.length||subHost?.children.length));
    }
    primeHome(row){
      if(row.inlineHost){const el=resolveElement(row.inlineHost,this.shell)||resolveElement(row.inlineHost,this.root);if(el)return el;}
      return this.slots.primary;
    }
    resolvePrimeNode(row){
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;return {container,existing:true};}
      container=document.createElement('section');container.className='dkds-analysis-prime-panel';container.dataset.primeId=row.id;
      container.innerHTML=`<div class="dkds-analysis-prime-head"><strong>${esc(row.title||row.label||row.id)}</strong><div class="dkds-analysis-prime-chrome"></div></div><div class="dkds-analysis-prime-body"></div>`;
      return {container,existing:false};
    }
    ensurePrime(row){
      if(row.mounted&&row.container)return row;
      const found=this.resolvePrimeNode(row);const container=found.container;row.existing=found.existing;
      container.classList.remove('dkds-prime-hidden');
      if(!container.isConnected)this.primeHome(row)?.appendChild(container);
      const body=found.existing?container:container.querySelector('.dkds-analysis-prime-body');
      const cleanup=row.mount?.({workbench:this,scope:this.scope,container:body,panel:container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;
      row.container=container;row.mounted=true;
      const allowed=[...new Set((row.placements||['inline','right','bottom','float']).map(x=>x==='inline'?'home':normalizePlacement(x)))];
      const layout={slot:name=>name==='home'?this.primeHome(row):this.portableSlot(name,row)};
      const onPlacementChanged=info=>{
        try{row.onPlacementChanged?.(info);}catch(err){console.warn('[DKDS PRIME placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('prime-placement');});
      };
      const lifecycle={closeSelector:row.closeSelector,onClose:()=>this.closePrime(row.id),collapseSelector:row.collapseSelector,onCollapse:info=>{try{row.onCollapse?.(info);}catch(err){console.warn('[DKDS PRIME collapse]',err);}this.resize('prime-collapse');}};
      const portableSpec=found.existing?{
        title:row.title||row.label||row.id,useTargetAsWrapper:row.useTargetAsWrapper!==false,
        handle:row.handle||'.analysis-chart-title,.pulse-card-heading,.dc-tool-title,.dkds-analysis-prime-head',controlsHost:row.controlsHost,controlsPlacement:row.controlsPlacement||'start',
        placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,layout,onPlacementChanged,...lifecycle
      }:{title:row.title||row.label||row.id,useTargetAsWrapper:true,handle:'.dkds-analysis-prime-head',controlsHost:'.dkds-analysis-prime-chrome',placements:allowed,defaultPlacement:row.defaultPlacement==='inline'?'home':row.defaultPlacement,stateVersion:row.stateVersion,layout,onPlacementChanged,...lifecycle};
      row.portable=this.scope.panels.create(`prime:${row.id}`,container,portableSpec);
      if(Array.isArray(row.actions)&&row.actions.length){
        const actionHost=resolveScopedElement(row.actionHost||row.actionsHost,container)||resolveScopedElement('[data-dkds-prime-actions]',container);
        if(actionHost){row.actionGroup?.dispose?.();row.actionGroup=new ActionGroup(this.owner,actionHost,{activity:this.spec.activity,actions:row.actions});}
      }
      this.scope.plotViews?.hydrate?.(container,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)});
      this.syncRegions();return row;
    }
    openPrime(id,placement){const row=this.primes.get(String(id));if(!row)return false;this.ensurePrime(row);if(placement!==undefined&&placement!==null&&placement!=='')row.portable.place(placement==='inline'?'home':placement);this.renderNav();this.syncRegions();this.resize('prime-open');return true;}
    setPrimePlacement(id,placement){return this.openPrime(id,placement);}
    togglePrime(id){const row=this.primes.get(String(id));if(!row)return false;if(!row.mounted)return this.openPrime(id);this.closePrime(id);return true;}
    closePrime(id){
      const row=this.primes.get(String(id));if(!row?.mounted)return false;
      try{row.onClose?.({workbench:this,scope:this.scope,container:row.container,row});}catch(err){console.warn('[DKDS PRIME close]',err);}
      row.portable?.dispose?.();row.portable=null;row.actionGroup?.dispose?.();row.actionGroup=null;cleanupCall(row.cleanup);row.cleanup=null;
      if(row.container){row.container.classList.add('dkds-prime-hidden');this.park(row.container);}
      row.mounted=false;this.renderNav();this.syncRegions();this.resize('prime-close');return true;
    }
    showPrimary(){
      const active=this.activeSub?this.subs.get(this.activeSub):null;if(active?.container)this.park(active.container);
      this.activeSub='';this.slots.primary.classList.remove('hidden');this.slots.sub.classList.add('hidden');this.slots.sub.replaceChildren();
      this.slots.left.classList.toggle('hidden',this.primary?.showLeft===false);this.renderNav();this.syncRegions();this.resize('primary-show');return true;
    }
    ensureSub(row){
      if(row.container)return row.container;
      let container=row.existingNode||resolveElement(row.node,this.shell)||resolveElement(row.node,this.root);
      if(container){row.existingNode=container;}else{container=document.createElement('section');container.className='dkds-analysis-sub-view';container.dataset.subId=row.id;if(row.html!==undefined)container.innerHTML=typeof row.html==='function'?row.html():String(row.html||'');}
      row.container=container;return container;
    }
    openSub(id){
      const row=this.subs.get(String(id));if(!row)return false;
      if(this.activeSub&&this.activeSub!==row.id){const previous=this.subs.get(this.activeSub);if(previous?.container)this.park(previous.container);if(previous&&previous.persistent===false){cleanupCall(previous.cleanup);previous.cleanup=null;previous.container=null;previous.mounted=false;}}
      this.activeSub=row.id;this.slots.primary.classList.add('hidden');this.slots.sub.classList.remove('hidden');this.slots.left.classList.toggle('hidden',row.keepLeft!==true);this.slots.sub.replaceChildren();
      const container=this.ensureSub(row);this.slots.sub.appendChild(container);
      if(!row.mounted||row.remount===true){cleanupCall(row.cleanup);const cleanup=row.mount?.({workbench:this,scope:this.scope,container,slots:this.slots});row.cleanup=typeof cleanup==='function'?cleanup:null;row.mounted=true;}
      row.onShow?.({workbench:this,scope:this.scope,container,slots:this.slots});
      queueMicrotask(()=>this.scope.plotViews?.hydrate?.(container,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec)}));
      this.renderNav();this.syncRegions();this.resize('sub-open');return true;
    }
    portable(id,node,spec={}){
      const userPlacementChanged=spec.onPlacementChanged;
      const value=this.scope.panels.create(id,node,{...spec,layout:this.layout(),onPlacementChanged:info=>{
        try{userPlacementChanged?.(info);}catch(err){console.warn('[DKDS workbench portable placement]',err);}
        this.syncRegions();for(const grid of this.grids)grid.apply?.();
        requestAnimationFrame(()=>{this.syncRegions();for(const grid of this.grids)grid.apply?.();this.resize('portable-placement');});
      }});
      this.portables.set(String(id),value);this.syncRegions();return value;
    }
    grid(container,spec={}){const value=new GridController(this.scope,container,spec);this.grids.push(value);return value;}
    surfaceState(){return {primary:this.primary?.id||'',activeSub:this.activeSub,primes:Object.fromEntries([...this.primes].map(([id,row])=>[id,{open:!!row.mounted,placement:row.portable?.wrapper?.dataset?.placement||''}]))};}
    resize(reason='resize'){this.syncRegions();this.scope.requestChartResize?.({reason:`analysis-workbench:${reason}`});return this;}
    dispose(){
      if(this.closed)return;this.closed=true;cleanupCall(this.primary?.cleanup);
      for(const row of this.primes.values()){row.actionGroup?.dispose?.();if(row.portable)row.portable.dispose?.();cleanupCall(row.cleanup);}
      for(const row of this.subs.values())cleanupCall(row.cleanup);
      for(const grid of this.grids)grid.dispose?.();for(const portable of this.portables.values())portable.dispose?.();
      this.actions?.dispose?.();this.regionObserver?.disconnect?.();this.resizeObserver?.disconnect?.();this.leftSplit?.dispose?.();this.rightSplit?.dispose?.();this.bottomSplit?.dispose?.();
      this.root.replaceChildren();this.root.classList.remove('dkds-analysis-workbench-host');
    }
  }


  class PluginWorkspace extends AnalysisWorkbench {
    constructor(scope,root,spec={}){
      super(scope,root,{...spec});
      this.shell?.classList.add('dkds-plugin-workspace');
      this.shell?.setAttribute('data-plugin-workspace-owner',this.owner);
      this.hostMode=String(spec.hostMode||'embedded');
      this.shell?.setAttribute('data-host-mode',this.hostMode);
      this.navigationPresentation='inline';
      this.primaryScrollMode=String(spec.primaryScroll||'auto')==='contained'?'contained':'auto';
      this.canvasSlots=null;this.canvasObserver=null;this.canvasLeftSplit=null;this.canvasRightSplit=null;this.canvasBottomSplit=null;
      this.installCanvasDocking(spec);
      this.setPrimaryScrollMode(this.primaryScrollMode);
      this.plotViewObserverCleanup=this.scope.plotViews?.observe?.(this.shell,{portableFactory:(id,node,pSpec)=>this.portable(id,node,pSpec),placements:['home','left','right','bottom','global'],defaultPlacement:'home',stateVersion:'plot-view-v2'});
    }
    installCanvasDocking(spec={}){
      const main=this.slots?.main,primary=this.slots?.primary,sub=this.slots?.sub;if(!main||!primary||!sub)return;
      const frame=document.createElement('div');frame.className='dkds-plugin-canvas-frame';
      frame.innerHTML=`<aside class="dkds-plugin-canvas-left" data-plugin-canvas-slot="left"></aside><div class="dkds-plugin-canvas-left-resizer" role="separator" aria-orientation="vertical"></div><div class="dkds-plugin-canvas-center" data-plugin-canvas-slot="main"></div><div class="dkds-plugin-canvas-right-resizer" role="separator" aria-orientation="vertical"></div><aside class="dkds-plugin-canvas-right" data-plugin-canvas-slot="right"></aside><div class="dkds-plugin-canvas-bottom-resizer" role="separator" aria-orientation="horizontal"></div><section class="dkds-plugin-canvas-bottom" data-plugin-canvas-slot="bottom"></section><div class="dkds-plugin-canvas-overlay" data-plugin-canvas-slot="overlay"></div>`;
      const center=frame.querySelector('[data-plugin-canvas-slot="main"]');center.append(primary);main.replaceChildren(frame,sub);
      sub.classList.add('dkds-plugin-sub-page-host');
      this.canvasFrame=frame;this.canvasSlots={main:center,left:frame.querySelector('[data-plugin-canvas-slot="left"]'),right:frame.querySelector('[data-plugin-canvas-slot="right"]'),bottom:frame.querySelector('[data-plugin-canvas-slot="bottom"]'),overlay:frame.querySelector('[data-plugin-canvas-slot="overlay"]')};
      const id=String(spec.activity||spec.id||'main');
      this.canvasLeftSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-left`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-left-resizer'),target:this.canvasSlots.left,cssVar:'--dkds-plugin-canvas-left-width',defaultSize:Number(spec.canvasLeftWidth)||320,min:Number(spec.canvasLeftMin)||240,reserve:Number(spec.canvasLeftReserve)||520});
      this.canvasRightSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-right`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-right-resizer'),target:this.canvasSlots.right,cssVar:'--dkds-plugin-canvas-right-width',defaultSize:Number(spec.canvasRightWidth)||390,min:Number(spec.canvasRightMin)||280,reserve:Number(spec.canvasRightReserve)||520,reverse:true});
      this.canvasBottomSplit=new SplitController(this.scope,{id:`plugin-${id}-canvas-bottom`,container:frame,handle:frame.querySelector('.dkds-plugin-canvas-bottom-resizer'),target:this.canvasSlots.bottom,cssVar:'--dkds-plugin-canvas-bottom-height',axis:'y',defaultSize:Number(spec.canvasBottomHeight)||320,min:Number(spec.canvasBottomMin)||190,reserve:Number(spec.canvasBottomReserve)||260,reverse:true});
      const sync=()=>this.syncCanvasRegions();
      if(window.MutationObserver){this.canvasObserver=new MutationObserver(sync);for(const el of [this.canvasSlots.left,this.canvasSlots.right,this.canvasSlots.bottom])this.canvasObserver.observe(el,{childList:true,subtree:false});}
      this.syncCanvasRegions();
    }
    setPrimaryScrollMode(mode='auto'){
      this.primaryScrollMode=String(mode||'auto')==='contained'?'contained':'auto';
      this.canvasFrame?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      this.slots?.primary?.setAttribute('data-primary-scroll',this.primaryScrollMode);
      return this;
    }
    mountPrimary(spec={}){const value=super.mountPrimary(spec);this.setPrimaryScrollMode(spec.scroll||spec.scrollMode||this.spec.primaryScroll||'auto');return value;}
    portableSlot(name,row=null){
      const key=String(name||'');
      if(key==='global')return super.portableSlot('overlay',row);
      if(this.canvasSlots&&['left','right','bottom','overlay','main'].includes(key))return this.canvasSlots[key]||null;
      return super.portableSlot(name,row);
    }
    layout(){return {slot:name=>this.portableSlot(name)};}
    syncCanvasRegions(){
      if(!this.canvasFrame||!this.canvasSlots)return {left:false,right:false,bottom:false,bottomCollapsedOnly:false};
      const visible=el=>[...(el?.children||[])].filter(node=>!node.classList?.contains('hidden')&&!node.classList?.contains('dkds-prime-hidden'));
      const leftRows=visible(this.canvasSlots.left),rightRows=visible(this.canvasSlots.right),bottomRows=visible(this.canvasSlots.bottom);
      const state={left:leftRows.length>0,right:rightRows.length>0,bottom:bottomRows.length>0,bottomCollapsedOnly:bottomRows.length>0&&bottomRows.every(node=>node.classList?.contains('is-collapsed')||node.classList?.contains('collapsed'))};
      this.canvasFrame.classList.toggle('has-canvas-left',state.left);this.canvasFrame.classList.toggle('has-canvas-right',state.right);this.canvasFrame.classList.toggle('has-canvas-bottom',state.bottom);this.canvasFrame.classList.toggle('canvas-bottom-collapsed-only',state.bottomCollapsedOnly);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-left-resizer')?.classList.toggle('active',state.left);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-right-resizer')?.classList.toggle('active',state.right);
      this.canvasFrame.querySelector('.dkds-plugin-canvas-bottom-resizer')?.classList.toggle('active',state.bottom&&!state.bottomCollapsedOnly);return state;
    }
    syncRegions(){const state=super.syncRegions();this.syncCanvasRegions?.();return state;}
    showPrimary(){const value=super.showPrimary();if(this.canvasFrame)this.canvasFrame.classList.remove('hidden');return value;}
    openSub(id){const ok=super.openSub(id);if(ok&&this.canvasFrame)this.canvasFrame.classList.add('hidden');return ok;}
    setNavigationPresentation(mode='inline'){
      this.navigationPresentation=String(mode||'inline');const nav=this.shell?.querySelector('.dkds-analysis-nav');if(nav)nav.classList.toggle('host-presented',this.navigationPresentation!=='inline');return this;
    }
    navigationActions({includePrimary=true,includePrimes=true,includeSubs=true}={}){
      const rows=[];if(includePrimary&&this.primary)rows.push({id:`workspace-primary:${this.primary.id}`,label:this.primary.label||'主界面',active:()=>!this.activeSub,onInvoke:()=>this.showPrimary()});
      if(includePrimes)for(const row of [...this.primes.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push({id:`workspace-prime:${row.id}`,label:row.label||row.title||row.id,active:()=>!!row.mounted,onInvoke:()=>this.togglePrime(row.id)});
      if(includeSubs)for(const row of [...this.subs.values()].sort((a,b)=>(a.order||100)-(b.order||100)))rows.push({id:`workspace-sub:${row.id}`,label:row.label||row.title||row.id,active:()=>this.activeSub===row.id,onInvoke:()=>this.openSub(row.id)});return rows;
    }
    setHostMode(mode='embedded'){
      this.hostMode=String(mode||'embedded');this.shell?.setAttribute('data-host-mode',this.hostMode);this.resize('host-mode');return this;
    }
    resize(reason='resize'){this.syncCanvasRegions();return super.resize(reason);}
    capabilityState(){return Object.freeze({owner:this.owner,hostMode:this.hostMode,primaryScroll:this.primaryScrollMode,...this.surfaceState()});}
    dispose(){cleanupCall(this.plotViewObserverCleanup);this.plotViewObserverCleanup=null;this.canvasObserver?.disconnect?.();this.canvasLeftSplit?.dispose?.();this.canvasRightSplit?.dispose?.();this.canvasBottomSplit?.dispose?.();super.dispose();}
  }

  class PluginScope {
    constructor(owner,options={}){
      this.owner=String(owner||'anonymous');this.options=options;this.cleanups=[];this.portables=new Map();this.layouts=[];this.charts=[];this.workbenches=[];
      this.shortcuts={
        register:(id,spec)=>this.track(shortcutHub.register(this.owner,id,spec)),
        add:spec=>this.track(shortcutHub.register(this.owner,spec?.id||`shortcut-${this.cleanups.length}`,spec||{})),
        chord:normalizeChord
      };
      this.actions={mount:(container,spec)=>this.trackObject(new ActionGroup(this.owner,container,spec))};
      this.interactions={bind:(target,spec)=>this.trackObject(new InteractionBinding(this.owner,target,spec))};
      this.menus={create:spec=>this.trackObject(new ContextMenu(this.owner,spec)),open:(spec={})=>{const menu=this.trackObject(new ContextMenu(this.owner,spec));menu.open(spec);return menu;}};
      this.entities=window.DKDSEntities?.createScope?.(this.owner)||null;
      this.selectionChannels=new Map();this.selectionModels=new Map();this.interactionRuntimes=new Map();
      this.selection={
        channel:(id,initial=null)=>{const key=String(id);if(!this.selectionChannels.has(key))this.selectionChannels.set(key,this.trackObject(new SelectionChannel(this.owner,key,initial)));return this.selectionChannels.get(key);},
        model:(id,spec={})=>{const key=String(id);if(!this.selectionModels.has(key))this.selectionModels.set(key,this.trackObject(new SelectionModel(this.owner,key,spec)));return this.selectionModels.get(key);},
        accepts:(type,accepted)=>dataTypeRegistry.accepts(type,accepted),
        observe:(fn,options={})=>{if(typeof fn!=='function')return()=>{};const handler=event=>{const detail=event?.detail||{};if(options.owner&&detail.owner!==options.owner)return;const types=Array.isArray(options.types)?options.types:(options.type?[options.type]:[]);if(types.length&&!((detail.snapshot?.items||[]).some(item=>dataTypeRegistry.accepts(item.type,types))))return;fn(detail.snapshot,detail.meta||{},detail);};window.addEventListener('dkds:selection-changed',handler);const off=()=>window.removeEventListener('dkds:selection-changed',handler);this.track(off);return off;}
      };
      this.interactionRuntime={create:(id,spec={})=>{const key=String(id||'interaction');if(!this.interactionRuntimes.has(key))this.interactionRuntimes.set(key,this.trackObject(new InteractionRuntime(this,key,spec)));return this.interactionRuntimes.get(key);},get:id=>this.interactionRuntimes.get(String(id||''))||null};
      this.resizeScheduler=new ResizeScheduler(this);
      this.layout={create:(root,spec)=>{const obj=new WorkspaceLayout(this,root,spec);this.layouts.push(obj);return this.trackObject(obj);},split:spec=>this.trackObject(new SplitController(this,spec))};
      this.panels={create:(id,node,spec={})=>{const obj=new PortableView(this,id,node,spec);this.portables.set(String(id),obj);return this.trackObject(obj);},get:id=>this.portables.get(String(id))||null};
      this.chartsApi={mount:(container,spec)=>{const obj=new ChartSurface(this,container,spec);this.charts.push(obj);return this.trackObject(obj);}};
      this.plotViewRegistry=new PlotViewRegistry(this);this.cleanups.push(()=>this.plotViewRegistry.dispose());
      this.plotViews={bind:(id,card,spec={})=>this.plotViewRegistry.bind(id,card,spec),hydrate:(root,spec={})=>this.plotViewRegistry.hydrate(root,spec),observe:(root,spec={})=>this.plotViewRegistry.observe(root,spec),get:id=>this.plotViewRegistry.get(id)};
      this.tables={
        mount:(id,container,spec={})=>globalTableSurfaceRegistry.mount(id,container,{...spec,owner:this.owner}),
        bind:(id,table,spec={})=>globalTableSurfaceRegistry.bind(id,table,{...spec,owner:this.owner}),
        hydrate:(root,spec={})=>globalTableSurfaceRegistry.hydrate(root,{...spec,owner:this.owner}),
        observe:(root,spec={})=>this.track(globalTableSurfaceRegistry.observe(root,{...spec,owner:this.owner})),
        get:value=>globalTableSurfaceRegistry.get(value)
      };
      this.settingsRegistry=new SettingsRegistry(this);this.cleanups.push(()=>this.settingsRegistry.dispose());
      this.settings={define:(id,spec={})=>this.settingsRegistry.define(id,spec),get:(id='defaults')=>this.settingsRegistry.get(id)};
      this.views={mount:(container,spec)=>this.trackObject(new ViewHost(this,container,spec))};
      this.workbench={create:(root,spec)=>{const obj=new Workbench(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);}};
      const createPluginWorkspace=(root,spec)=>{const obj=new PluginWorkspace(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);};
      this.pluginWorkspace={create:createPluginWorkspace};
      this.analysisWorkbench={create:createPluginWorkspace};
      this.scientificPlotly=window.DKDSScientificPlot?.createScope?.(this.owner)||null;if(this.scientificPlotly)this.cleanups.push(()=>this.scientificPlotly.dispose?.());
      this.scientificPlot={
        create:(target,spec={})=>this.trackObject(new ScientificCurveSurface(this,target,spec)),
        createPlotly:(target,spec={})=>this.scientificPlotly?.create?.(target,spec)||null,
        attach:(target,spec={})=>this.scientificPlotly?.attach?.(target,spec)||null,
        react:(target,data=[],layout={},config={},spec={})=>this.scientificPlotly?.react?.(target,data,layout,config,spec)||window.DKDSCharts?.react?.(target,data,layout,config),
        scalarField:(target,field={},options={})=>this.scientificPlotly?.scalarField?.(target,field,options)||null,
        get:target=>this.scientificPlotly?.get?.(target)||null,
        controller:(target,name)=>this.scientificPlotly?.controller?.(target,name)||null,
        resize:target=>this.scientificPlotly?.resize?.(target)||window.DKDSCharts?.resize?.(target),
        restyle:(target,update,traces)=>this.scientificPlotly?.restyle?.(target,update,traces)||window.DKDSCharts?.restyle?.(target,update,traces),
        relayout:(target,update)=>this.scientificPlotly?.relayout?.(target,update)||window.DKDSCharts?.relayout?.(target,update),
        viewport:target=>this.scientificPlotly?.viewport?.(target)||null,
        setViewport:(target,state,meta={})=>this.scientificPlotly?.setViewport?.(target,state,meta)||false,
        resetViewport:(target,meta={})=>this.scientificPlotly?.resetViewport?.(target,meta)||false,
        pin:(target,id,meta={})=>this.scientificPlotly?.pin?.(target,id,meta)||false,
        unpin:(target,id,meta={})=>this.scientificPlotly?.unpin?.(target,id,meta)||false,
        pins:target=>this.scientificPlotly?.pins?.(target)||[],
        stats:target=>this.scientificPlotly?.stats?.(target)||null,
        suspend:(target,options={})=>this.scientificPlotly?.get?.(target)?.suspend?.(options)||false,
        resume:(target,options={})=>this.scientificPlotly?.get?.(target)?.resume?.(options)||false,
        lifecycleState:()=>this.scientificPlotly?.lifecycleState?.()||null,
        saveImage:(target,baseName,format='svg',options={})=>this.scientificPlotly?.saveImage?.(target,baseName,format,options)||window.DKDSCharts?.saveImage?.(target,baseName,format,options),
        purge:target=>this.scientificPlotly?.purge?.(target)||window.DKDSCharts?.purge?.(target)
      };
      this.grid={create:(container,spec)=>this.trackObject(new GridController(this,container,spec))};
      this.dataTypes={register:(id,spec)=>dataTypeRegistry.register(this.owner,id,spec),get:id=>dataTypeRegistry.get(id),list:q=>dataTypeRegistry.list(q),isA:(id,parent)=>dataTypeRegistry.isA(id,parent),accepts:(id,accepted)=>dataTypeRegistry.accepts(id,accepted),compatible:(a,b)=>dataTypeRegistry.compatible(a,b),lineage:id=>dataTypeRegistry.lineage(id),infer:(value,q)=>dataTypeRegistry.infer(value,q),describe:(id,value)=>dataTypeRegistry.describe(id,value),projectSelection:(id,value,context)=>dataTypeRegistry.projectSelection(id,value,context),resolve:(id,item,context)=>dataTypeRegistry.resolve(id,item,context),validate:()=>dataTypeRegistry.validate()};
    }
    track(cleanup){if(typeof cleanup==='function')this.cleanups.push(cleanup);return cleanup;}
    trackObject(obj){if(obj?.dispose)this.cleanups.push(()=>obj.dispose());return obj;}
    emitResize(payload={}){this.resizeScheduler?.request?.(payload,{emit:true});}
    requestChartResize(payload={}){this.resizeScheduler?.request?.(payload,{emit:false});}
    async lifecycle(state,options={}){
      const value=String(state||'').toLowerCase();
      if(value==='hidden'||value==='suspended'){this.resizeScheduler?.suspend?.();const plots=await this.scientificPlotly?.lifecycle?.('hidden',{purgeManaged:true,...options});return {owner:this.owner,state:'hidden',resize:this.resizeScheduler?.state?.()||null,plots:plots||[]};}
      if(value==='visible'||value==='active'||value==='resumed'){const plots=await this.scientificPlotly?.lifecycle?.('visible',{resize:false,...options});this.resizeScheduler?.resume?.();this.requestChartResize({reason:options.reason||'lifecycle-resume'});return {owner:this.owner,state:'visible',resize:this.resizeScheduler?.state?.()||null,plots:plots||[]};}
      return {owner:this.owner,state:value||'active',resize:this.resizeScheduler?.state?.()||null,plots:this.scientificPlotly?.lifecycleState?.()||null};
    }
    dispose(){this.resizeScheduler?.dispose?.();const rows=this.cleanups.splice(0).reverse();rows.forEach(cleanupCall);shortcutHub.removeOwner(this.owner);dataTypeRegistry.unregisterOwner(this.owner);this.portables.clear();this.selectionChannels.clear();this.selectionModels.clear();this.interactionRuntimes.clear();this.layouts=[];this.charts=[];this.workbenches=[];}
  }

  function configureHost(options={}){
    if(options.root!==undefined)hostState.root=resolveElement(options.root)||hostState.root;
    if(typeof options.activity==='function')hostState.activity=options.activity;
    if(typeof options.status==='function')hostState.status=options.status;
    if(options.storagePrefix)hostState.storagePrefix=String(options.storagePrefix);
    if(options.zones&&typeof options.zones==='object'){
      for(const [name,target] of Object.entries(options.zones)){const el=resolveElement(target);if(el)hostState.zones.set(name,el);}
    }
    if(!hostState.zones.has('overlay')&&hostState.root)hostState.zones.set('overlay',hostState.root);
    return api.host.snapshot();
  }

  function createScope(owner,options={}){
    const id=String(owner||'anonymous');
    const scope=new PluginScope(id,options);
    if(!scopes.has(id))scopes.set(id,new Set());
    scopes.get(id).add(scope);
    scope.track(()=>{scopes.get(id)?.delete(scope);if(!scopes.get(id)?.size)scopes.delete(id);});
    return scope;
  }

  const api={
    version:VERSION,
    host:{
      configure:configureHost,
      zone:name=>hostState.zones.get(String(name))||null,
      snapshot:()=>({root:hostState.root,zones:Object.fromEntries([...hostState.zones].map(([k,v])=>[k,v])),activity:hostState.activity?.()||''})
    },
    shortcuts:{register:(owner,id,spec)=>shortcutHub.register(owner,id,spec),normalizeChord,eventChord},
    createScope,
    tables:{mount:(id,container,spec={})=>globalTableSurfaceRegistry.mount(id,container,spec),bind:(id,table,spec={})=>globalTableSurfaceRegistry.bind(id,table,spec),hydrate:(root,spec={})=>globalTableSurfaceRegistry.hydrate(root,spec),observe:(root,spec={})=>globalTableSurfaceRegistry.observe(root,spec),get:value=>globalTableSurfaceRegistry.get(value)},
    dataTypes:{register:(owner,id,spec)=>dataTypeRegistry.register(owner,id,spec),unregister:id=>dataTypeRegistry.unregister(id),resolveId:id=>dataTypeRegistry.resolveId(id),get:id=>dataTypeRegistry.get(id),list:q=>dataTypeRegistry.list(q),lineage:id=>dataTypeRegistry.lineage(id),isA:(id,parent)=>dataTypeRegistry.isA(id,parent),accepts:(id,accepted)=>dataTypeRegistry.accepts(id,accepted),compatible:(a,b)=>dataTypeRegistry.compatible(a,b),infer:(value,q)=>dataTypeRegistry.infer(value,q),describe:(id,value)=>dataTypeRegistry.describe(id,value),normalize:(id,value,ctx)=>dataTypeRegistry.normalize(id,value,ctx),projectSelection:(id,value,ctx)=>dataTypeRegistry.projectSelection(id,value,ctx),resolve:(id,item,ctx)=>dataTypeRegistry.resolve(id,item,ctx),validate:()=>dataTypeRegistry.validate()},
    async lifecycle(state,options={}){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push(await scope.lifecycle?.(state,options));return {state:String(state||''),scopes:rows.length,rows};},
    lifecycleSnapshot(){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push({owner:scope.owner,resize:scope.resizeScheduler?.state?.()||null,plots:scope.scientificPlotly?.lifecycleState?.()||null});return {scopes:rows.length,rows};},
    disposeOwner(owner){for(const scope of [...(scopes.get(String(owner))||[])])scope.dispose();shortcutHub.removeOwner(String(owner));window.DKDSEntities?.registry?.removeOwner?.(String(owner));window.DKDSScientificPlot?.disposeOwner?.(String(owner));},
    ActionGroup,InteractionBinding,SelectionChannel,SelectionModel,InteractionRuntime,SelectionViewBinding,HorizontalWheelScroller,DataTypeRegistry,ResizeScheduler,ContextMenu,SplitController,WorkspaceLayout,PortableView,ChartSurface,PlotView,PlotViewRegistry,SettingsSurface,SettingsRegistry,TableSurface,TableSurfaceRegistry,TableView,TableViewRegistry,ScientificCurveSurface,ViewHost,Workbench,GridController,AnalysisWorkbench,PluginWorkspace,
    util:{resolveElement,isTypingTarget,esc}
  };
  window.DKDSUI=Object.freeze(api);
})();
