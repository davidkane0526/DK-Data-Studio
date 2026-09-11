(() => {
  if (window.DKDSEntities) return;
  const VERSION='1.0.0';
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const flagNames=['visible','focused','selected','locked','hidden','disabled'];
  const normId=value=>String(value??'').trim();
  const normParents=value=>[...new Set((Array.isArray(value)?value:[value]).filter(Boolean).map(normId).filter(Boolean))];
  const stable=value=>{const sort=v=>Array.isArray(v)?v.map(sort):(v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v);try{return JSON.stringify(sort(value));}catch{return String(value);}};
  const comparable=row=>({id:row.id,type:row.type,owner:row.owner,label:row.label,parents:[...(row.parents||[])],state:{...(row.state||{})},ref:row.ref??null,value:row.value??null,metadata:{...(row.metadata||{})},provenance:[...(row.provenance||[])]});
  const sameEntity=(a,b)=>stable(comparable(a))===stable(comparable(b));
  const normEntity=(input={},owner='core')=>{
    const raw=input&&typeof input==='object'?input:{id:input};
    const id=normId(raw.id||raw.key);if(!id)throw new Error('Entity id required.');
    const state={visible:raw.visible!==false,focused:!!raw.focused,selected:!!raw.selected,locked:!!raw.locked,hidden:!!raw.hidden,disabled:!!raw.disabled,...(raw.state&&typeof raw.state==='object'?raw.state:{})};
    for(const key of flagNames)state[key]=key==='visible'?state[key]!==false:!!state[key];
    return {id,type:String(raw.type||raw.kind||'core.entity'),owner:String(raw.owner||owner||'core'),label:String(raw.label||raw.name||id),parents:normParents(raw.parents||raw.parentId||raw.parent),state,ref:raw.ref&&typeof raw.ref==='object'?clone(raw.ref):null,value:raw.value===undefined?null:clone(raw.value),metadata:raw.metadata&&typeof raw.metadata==='object'?clone(raw.metadata):{},provenance:Array.isArray(raw.provenance)?clone(raw.provenance):[],revision:Number(raw.revision)||0};
  };
  class EntityRegistry {
    constructor(){this.rows=new Map();this.children=new Map();this.listeners=new Set();this.revision=0;this.batchDepth=0;this.pending=[];this.selectionByChannel=new Map();}
    begin(){this.batchDepth++;return()=>this.end();}
    end(){if(this.batchDepth>0)this.batchDepth--;if(!this.batchDepth&&this.pending.length){const changes=this.pending.splice(0);this.emit({type:'batch',changes});}}
    transact(fn){const done=this.begin();try{return fn(this);}finally{done();}}
    emit(change){this.revision++;const payload={revision:this.revision,...change};if(this.batchDepth){this.pending.push(payload);return payload;}for(const fn of [...this.listeners]){try{fn(payload,this);}catch(err){console.warn('[DKDS entities]',err);}}return payload;}
    onChange(fn){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);return()=>this.listeners.delete(fn);}
    rebuildRelations(){this.children.clear();for(const row of this.rows.values())for(const parent of row.parents){if(!this.children.has(parent))this.children.set(parent,new Set());this.children.get(parent).add(row.id);}}
    upsert(input,options={}){
      const next=normEntity(input,options.owner);const previous=this.rows.get(next.id);
      if(previous){next.owner=String(input?.owner||previous.owner||next.owner);next.type=String(input?.type||input?.kind||previous.type||next.type);next.label=String(input?.label||input?.name||previous.label||next.label);next.parents=input?.parents||input?.parentId||input?.parent?next.parents:previous.parents.slice();next.ref=input?.ref===undefined?clone(previous.ref):next.ref;next.value=input?.value===undefined?clone(previous.value):next.value;next.metadata={...(previous.metadata||{}),...(next.metadata||{})};next.provenance=Array.isArray(input?.provenance)?next.provenance:clone(previous.provenance||[]);next.state={...(previous.state||{}),...(input?.state||{})};for(const key of flagNames)if(input?.[key]!==undefined)next.state[key]=key==='visible'?input[key]!==false:!!input[key];if(sameEntity(previous,next))return this.get(previous.id);next.revision=(previous.revision||0)+1;}
      this.rows.set(next.id,next);this.rebuildRelations();this.emit({type:previous?'upsert':'add',entity:this.get(next.id)});return this.get(next.id);
    }
    ensure(input,options={}){const id=normId(input?.id||input?.key||input);return id&&this.rows.has(id)?this.get(id):this.upsert(input,options);}
    get(id){const row=this.rows.get(normId(id));return row?clone(row):null;}
    getMutable(id){return this.rows.get(normId(id))||null;}
    has(id){return this.rows.has(normId(id));}
    list(query={}){const q=typeof query==='string'?{type:query}:query||{};return [...this.rows.values()].filter(row=>(!q.owner||row.owner===q.owner)&&(!q.type||row.type===q.type)&&(!q.parent||row.parents.includes(String(q.parent)))&&(!q.visible||row.state.visible&&!row.state.hidden)&&(!q.selected||row.state.selected)&&(!q.focused||row.state.focused)).map(clone);}
    remove(id){const key=normId(id),row=this.rows.get(key);if(!row)return false;this.rows.delete(key);this.rebuildRelations();this.emit({type:'remove',entity:clone(row)});return true;}
    removeOwner(owner){const target=String(owner||'');return this.transact(()=>{let count=0,retained=0;for(const row of [...this.rows.values()])if(row.owner===target){if(row.metadata?.artifactProjected===true){row.owner='core.data';row.type=String(row.metadata?.artifactKind||'data.artifact');row.value={id:row.id,kind:row.metadata?.artifactKind||'data.artifact',name:row.label};row.revision=(row.revision||0)+1;retained++;}else{this.rows.delete(row.id);count++;}}this.rebuildRelations();if(count||retained)this.emit({type:'remove-owner',owner:target,count,retained});return count;});}
    childrenOf(id,{deep=false}={}){const start=normId(id),seen=new Set(),queue=[...(this.children.get(start)||[])];while(queue.length){const current=queue.shift();if(seen.has(current))continue;seen.add(current);if(deep)queue.push(...(this.children.get(current)||[]));}return [...seen].map(x=>this.get(x)).filter(Boolean);}
    ancestorsOf(id,{includeSelf=false}={}){const start=normId(id),seen=new Set(),queue=includeSelf?[start]:[...(this.rows.get(start)?.parents||[])];while(queue.length){const current=queue.shift();if(!current||seen.has(current))continue;seen.add(current);queue.push(...(this.rows.get(current)?.parents||[]));}return [...seen].map(x=>this.get(x)).filter(Boolean);}
    isRelated(a,b){const aa=normId(a),bb=normId(b);if(!aa||!bb)return false;if(aa===bb)return true;return this.ancestorsOf(aa).some(x=>x.id===bb)||this.ancestorsOf(bb).some(x=>x.id===aa);}
    closestInSet(id,candidates){const set=new Set(Array.from(candidates||[]).map(String));const key=normId(id);if(set.has(key))return key;const queue=[...(this.rows.get(key)?.parents||[])],seen=new Set();while(queue.length){const cur=queue.shift();if(!cur||seen.has(cur))continue;seen.add(cur);if(set.has(cur))return cur;queue.push(...(this.rows.get(cur)?.parents||[]));}return '';
    }
    setState(id,patch={},meta={}){const row=this.rows.get(normId(id));if(!row)return null;let changed=false;for(const key of flagNames)if(patch[key]!==undefined){const value=key==='visible'?patch[key]!==false:!!patch[key];if(row.state[key]!==value){row.state[key]=value;changed=true;}}if(!changed)return this.get(row.id);row.revision=(row.revision||0)+1;this.emit({type:'state',entity:this.get(row.id),patch:clone(patch),meta:clone(meta)});return this.get(row.id);}
    setVisible(id,value,meta){return this.setState(id,{visible:value,hidden:!value},meta);}
    applySelection(channel,snapshot={},meta={}){
      const key=String(channel||'default');const selected=new Set((snapshot.items||[]).map(item=>String(item?.id||'')).filter(Boolean));const focus=String(snapshot.focus?.id||snapshot.items?.at?.(-1)?.id||'');this.selectionByChannel.set(key,{selected,focus});
      const allSelected=new Set(),allFocused=new Set();for(const entry of this.selectionByChannel.values()){for(const id of entry.selected)allSelected.add(id);if(entry.focus)allFocused.add(entry.focus);}
      this.transact(()=>{for(const row of this.rows.values()){const nextSelected=allSelected.has(row.id),nextFocused=allFocused.has(row.id);if(row.state.selected!==nextSelected||row.state.focused!==nextFocused){row.state.selected=nextSelected;row.state.focused=nextFocused;row.revision=(row.revision||0)+1;this.pending.push({type:'state',entity:this.get(row.id),patch:{selected:nextSelected,focused:nextFocused},meta:{...meta,channel:key}});}}});
      return {selected:[...selected],focus};
    }
    clearSelectionChannel(channel){const key=String(channel||'default');this.selectionByChannel.delete(key);const allSelected=new Set(),allFocused=new Set();for(const entry of this.selectionByChannel.values()){for(const id of entry.selected)allSelected.add(id);if(entry.focus)allFocused.add(entry.focus);}this.transact(()=>{for(const row of this.rows.values()){const nextSelected=allSelected.has(row.id),nextFocused=allFocused.has(row.id);if(row.state.selected!==nextSelected||row.state.focused!==nextFocused){row.state.selected=nextSelected;row.state.focused=nextFocused;row.revision=(row.revision||0)+1;this.pending.push({type:'state',entity:this.get(row.id),patch:{selected:nextSelected,focused:nextFocused},meta:{reason:'channel-clear',channel:key}});}}});return true;}
    snapshot(){return {version:VERSION,revision:this.revision,entities:this.list()};}
  }
  const registry=new EntityRegistry();
  function projectArtifact(artifact,owner='core.data'){
    if(!artifact?.id)return null;const existing=registry.get(artifact.id);const fingerprint=window.DKDSData?.fingerprintArtifact?.(artifact)||'';
    if(existing?.metadata?.artifactFingerprint&&existing.metadata.artifactFingerprint===fingerprint)return existing;
    const genericType=String(artifact.kind||'data.artifact');const previousArtifactKind=String(existing?.metadata?.artifactKind||'');const keepDomain=!!(existing?.type&&existing.type!=='core.entity'&&existing.type!==genericType&&existing.type!==previousArtifactKind);
    return registry.upsert({id:artifact.id,type:keepDomain?existing.type:genericType,owner:keepDomain?existing.owner:String(owner||'core.data'),label:artifact.name||existing?.label||artifact.id,parents:[...new Set([...(existing?.parents||[]),...(artifact.lineage?.parents||[])])],ref:{...(existing?.ref||{}),artifactId:artifact.id},value:keepDomain?existing.value:{id:artifact.id,kind:artifact.kind,name:artifact.name},metadata:{...(existing?.metadata||{}),artifactProjected:true,artifactKind:artifact.kind,artifactFingerprint:fingerprint,transient:!!artifact.transient,provenanceCount:Array.isArray(artifact.provenance)?artifact.provenance.length:0},provenance:artifact.provenance||existing?.provenance||[]});
  }
  function projectArtifacts(artifacts=[],owner='core.data'){return registry.transact(()=>artifacts.map(a=>projectArtifact(a,owner)).filter(Boolean));}
  function createScope(owner){const ownerId=String(owner||'core');return Object.freeze({version:VERSION,owner:ownerId,upsert:(entity,options={})=>registry.upsert(entity,{...options,owner:ownerId}),ensure:(entity,options={})=>registry.ensure(entity,{...options,owner:ownerId}),projectArtifact:artifact=>projectArtifact(artifact,'core.data'),projectArtifacts:artifacts=>projectArtifacts(artifacts,'core.data'),get:id=>registry.get(id),has:id=>registry.has(id),list:q=>registry.list(q),remove:id=>registry.remove(id),children:(id,opts)=>registry.childrenOf(id,opts),ancestors:(id,opts)=>registry.ancestorsOf(id,opts),related:(a,b)=>registry.isRelated(a,b),closestInSet:(id,set)=>registry.closestInSet(id,set),setState:(id,patch,meta)=>registry.setState(id,patch,meta),setVisible:(id,value,meta)=>registry.setVisible(id,value,meta),onChange:fn=>registry.onChange(fn),transact:fn=>registry.transact(fn),snapshot:()=>registry.snapshot()});}
  window.DKDSEntities=Object.freeze({VERSION,EntityRegistry,registry,projectArtifact,projectArtifacts,createScope});
})();
