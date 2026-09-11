(() => {
  if (window.DKDSScientificReactive) return;

  const VERSION = '1.0.0';
  const scopes = new Map();
  const clone = value => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch { try { return JSON.parse(JSON.stringify(value)); } catch { return value; } }
  };
  const array = value => Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]);
  const unique = value => [...new Set(array(value).map(v => String(v || '').trim()).filter(Boolean))];
  const queue = fn => {
    if (typeof queueMicrotask === 'function') return queueMicrotask(fn);
    Promise.resolve().then(fn);
  };
  const frame = fn => {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
    return setTimeout(() => fn(Date.now()), 0);
  };
  const cancelFrame = id => {
    if (typeof cancelAnimationFrame === 'function') return cancelAnimationFrame(id);
    clearTimeout(id);
  };

  class ReactiveScope {
    constructor(owner) {
      this.owner = String(owner || 'plugin');
      this.nodes = new Map();
      this.entries = new Map();
      this.dependents = new Map();
      this.listeners = new Set();
      this.pendingTouches = new Set();
      this.pendingMeta = [];
      this.transactionDepth = 0;
      this.flushQueued = false;
      this.flushing = false;
      this.frameQueued = false;
      this.frameId = 0;
      this.frameEffects = new Set();
      this.asyncTokens = new Map();
      this.sequence = 0;
      this.disposed = false;
      this.stats = {transactions:0,touches:0,flushes:0,derivedRuns:0,effectRuns:0,asyncStarted:0,asyncAccepted:0,asyncStale:0};
    }
    node(id) {
      const key = String(id || '').trim();
      if (!key) throw new Error('Reactive node id required.');
      if (!this.nodes.has(key)) this.nodes.set(key,{id:key,revision:0,value:undefined,updatedAt:0});
      return this.nodes.get(key);
    }
    revision(id) { return Number(this.node(id).revision) || 0; }
    value(id) { return this.node(id).value; }
    signature(ids=[]) { return unique(ids).map(id => `${id}:${this.revision(id)}`).join('|'); }
    setValue(id,value,{touch=true,meta={}}={}) {
      const row=this.node(id);row.value=value;row.updatedAt=Date.now();
      if(touch)this.touch(id,{reason:'value',...meta});
      return value;
    }
    dependencyChanged(entry) {
      for (const dep of entry.dependsOn) if ((entry.lastRevisions.get(dep) ?? -1) !== this.revision(dep)) return true;
      return entry.initialPending === true;
    }
    captureRevisions(entry) {
      entry.lastRevisions.clear();
      for (const dep of entry.dependsOn) entry.lastRevisions.set(dep,this.revision(dep));
      entry.initialPending=false;
    }
    addDependent(dep,id) {
      if(!this.dependents.has(dep))this.dependents.set(dep,new Set());
      this.dependents.get(dep).add(id);
    }
    removeEntry(id) {
      const key=String(id||'');const entry=this.entries.get(key);if(!entry)return false;
      this.entries.delete(key);
      for(const dep of entry.dependsOn)this.dependents.get(dep)?.delete(key);
      this.frameEffects.delete(key);
      this.asyncTokens.delete(key);
      return true;
    }
    define(id,spec={},kind='effect') {
      const key=String(id||'').trim();if(!key)throw new Error('Reactive entry id required.');
      this.removeEntry(key);
      const dependsOn=unique(spec.dependsOn||spec.dependencies||[]);
      const runner=kind==='derived'?(spec.compute||spec.run):(spec.effect||spec.run||spec.handler);
      if(typeof runner!=='function')throw new Error(`Reactive ${kind} ${key} requires ${kind==='derived'?'compute()':'effect()'}.`);
      const entry={id:key,kind,dependsOn,lastRevisions:new Map(),runner,enabled:spec.enabled!==false,when:typeof spec.when==='function'?spec.when:null,scheduler:String(spec.scheduler||spec.schedule||(kind==='effect'?'frame':'microtask')),async:spec.async===true,initialPending:spec.immediate===true||spec.initial===true,metadata:{...(spec.metadata||{})},runs:0,lastError:'',lastDurationMs:0};
      this.entries.set(key,entry);for(const dep of dependsOn)this.addDependent(dep,key);
      if(entry.initialPending)this.scheduleFlush();
      return Object.freeze({id:key,kind,dependsOn:Object.freeze([...dependsOn]),dispose:()=>this.removeEntry(key)});
    }
    derive(id,spec={}) { return this.define(id,spec,'derived'); }
    effect(id,spec={}) { return this.define(id,spec,'effect'); }
    markTouched(keys,meta={}) {
      for(const key of unique(keys)){this.pendingTouches.add(key);this.stats.touches+=1;}
      if(meta&&Object.keys(meta).length)this.pendingMeta.push({...meta});
    }
    touch(keys,meta={}) {
      if(this.disposed)return null;
      this.markTouched(keys,meta);
      if(this.transactionDepth===0)this.commitTouches();
      return this.snapshot();
    }
    transact(label,fn,meta={}) {
      if(this.disposed)return typeof fn==='function'?fn():undefined;
      this.transactionDepth+=1;this.stats.transactions+=1;
      const tx={id:++this.sequence,label:String(label||'transaction'),owner:this.owner,meta:{...meta},touch:(keys,touchMeta={})=>this.markTouched(keys,{transaction:label,...touchMeta})};
      let result;
      try { result=typeof fn==='function'?fn(tx):undefined; }
      catch(err){this.transactionDepth-=1;if(this.transactionDepth===0)this.commitTouches();throw err;}
      if(result&&typeof result.then==='function'){
        return Promise.resolve(result).finally(()=>{this.transactionDepth-=1;if(this.transactionDepth===0)this.commitTouches();});
      }
      this.transactionDepth-=1;if(this.transactionDepth===0)this.commitTouches();return result;
    }
    commitTouches() {
      if(this.disposed||!this.pendingTouches.size)return false;
      const touched=[...this.pendingTouches];this.pendingTouches.clear();const meta=this.pendingMeta.splice(0);
      for(const key of touched){const row=this.node(key);row.revision+=1;row.updatedAt=Date.now();}
      this.emit({type:'touch',touched,meta});this.scheduleFlush();return true;
    }
    scheduleFlush() {
      if(this.disposed||this.flushQueued)return;
      this.flushQueued=true;queue(()=>{this.flushQueued=false;this.flush();});
    }
    scheduleFrameEffect(id) {
      this.frameEffects.add(id);
      if(this.frameQueued)return;
      this.frameQueued=true;this.frameId=frame(()=>{this.frameQueued=false;this.frameId=0;const ids=[...this.frameEffects];this.frameEffects.clear();for(const key of ids){const entry=this.entries.get(key);if(entry&&entry.kind==='effect'&&entry.enabled&&this.dependencyChanged(entry))this.runEffect(entry,{scheduler:'frame'});}});
    }
    runDerived(entry) {
      if(!entry.enabled||!this.dependencyChanged(entry))return false;
      if(entry.when&&!entry.when(this.context(entry))) { this.captureRevisions(entry); return false; }
      const depSignature=this.signature(entry.dependsOn),started=globalThis.performance?.now?.()??Date.now();entry.runs+=1;this.stats.derivedRuns+=1;
      let result;
      try{result=entry.runner(this.context(entry));}
      catch(err){entry.lastError=String(err?.message||err);this.captureRevisions(entry);console.warn('[DKDS Scientific Reactive derived]',this.owner,entry.id,err);return false;}
      if(result&&typeof result.then==='function'){
        const token=(this.asyncTokens.get(entry.id)||0)+1;this.asyncTokens.set(entry.id,token);this.stats.asyncStarted+=1;this.captureRevisions(entry);
        Promise.resolve(result).then(value=>{
          if(this.disposed)return;
          if(this.asyncTokens.get(entry.id)!==token||this.signature(entry.dependsOn)!==depSignature){this.stats.asyncStale+=1;this.emit({type:'async-stale',id:entry.id,token});return;}
          const row=this.node(entry.id);row.value=value;row.revision+=1;row.updatedAt=Date.now();this.stats.asyncAccepted+=1;entry.lastError='';entry.lastDurationMs=Math.max(0,(globalThis.performance?.now?.()??Date.now())-started);this.emit({type:'derived',id:entry.id,async:true,revision:row.revision});this.scheduleFlush();
        }).catch(err=>{if(this.asyncTokens.get(entry.id)===token){entry.lastError=String(err?.message||err);console.warn('[DKDS Scientific Reactive async derived]',this.owner,entry.id,err);}});
        return true;
      }
      this.captureRevisions(entry);const row=this.node(entry.id);row.value=result;row.revision+=1;row.updatedAt=Date.now();entry.lastError='';entry.lastDurationMs=Math.max(0,(globalThis.performance?.now?.()??Date.now())-started);this.emit({type:'derived',id:entry.id,async:false,revision:row.revision});return true;
    }
    runEffect(entry,meta={}) {
      if(!entry.enabled||!this.dependencyChanged(entry))return false;
      if(entry.when&&!entry.when(this.context(entry))) { this.captureRevisions(entry); return false; }
      const started=globalThis.performance?.now?.()??Date.now();
      try{entry.runner(this.context(entry),meta);entry.lastError='';}
      catch(err){entry.lastError=String(err?.message||err);console.warn('[DKDS Scientific Reactive effect]',this.owner,entry.id,err);}
      this.captureRevisions(entry);entry.runs+=1;this.stats.effectRuns+=1;entry.lastDurationMs=Math.max(0,(globalThis.performance?.now?.()??Date.now())-started);return true;
    }
    flush() {
      if(this.disposed||this.flushing)return false;
      this.flushing=true;this.stats.flushes+=1;
      try{
        let guard=0,progress=true;
        while(progress&&guard++<128){progress=false;for(const entry of this.entries.values()){if(entry.kind!=='derived'||!this.dependencyChanged(entry))continue;if(this.runDerived(entry))progress=true;}}
        if(guard>=128)console.warn('[DKDS Scientific Reactive] dependency flush exceeded guard',this.owner);
        for(const entry of this.entries.values()){
          if(entry.kind!=='effect'||!this.dependencyChanged(entry))continue;
          if(entry.scheduler==='frame')this.scheduleFrameEffect(entry.id);else this.runEffect(entry,{scheduler:'microtask'});
        }
      } finally { this.flushing=false; }
      this.emit({type:'flush'});return true;
    }
    flushNow(){this.commitTouches();return this.flush();}
    runLatest(id,work,options={}) {
      const key=String(id||'task');const token=(this.asyncTokens.get(key)||0)+1;this.asyncTokens.set(key,token);const dependsOn=unique(options.dependsOn||[]),signature=this.signature(dependsOn);this.stats.asyncStarted+=1;
      const ctx={owner:this.owner,id:key,token,dependsOn,signature,revision:id=>this.revision(id),value:id=>this.value(id)};
      let result;try{result=typeof work==='function'?work(ctx):work;}catch(err){return Promise.reject(err);}
      return Promise.resolve(result).then(value=>{const accepted=!this.disposed&&this.asyncTokens.get(key)===token&&this.signature(dependsOn)===signature;if(!accepted){this.stats.asyncStale+=1;return {accepted:false,stale:true,token,value};}this.stats.asyncAccepted+=1;if(options.publish){const nodeId=String(options.publish);const row=this.node(nodeId);row.value=value;row.revision+=1;row.updatedAt=Date.now();this.emit({type:'derived',id:nodeId,async:true,revision:row.revision});this.scheduleFlush();}return {accepted:true,stale:false,token,value};});
    }
    context(entry=null) { return Object.freeze({owner:this.owner,id:entry?.id||'',revision:id=>this.revision(id),value:id=>this.value(id),signature:ids=>this.signature(ids),touch:(keys,meta)=>this.touch(keys,meta),transact:(label,fn,meta)=>this.transact(label,fn,meta),runLatest:(id,work,options)=>this.runLatest(id,work,options),snapshot:()=>this.snapshot()}); }
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn({type:'snapshot',snapshot:this.snapshot()},this);return()=>this.listeners.delete(fn);}
    emit(event){for(const fn of [...this.listeners])try{fn(event,this);}catch(err){console.warn('[DKDS Scientific Reactive listener]',err);}}
    snapshot(){return Object.freeze({version:VERSION,owner:this.owner,nodes:Object.freeze([...this.nodes.values()].map(row=>Object.freeze({id:row.id,revision:row.revision,value:clone(row.value),updatedAt:row.updatedAt}))),entries:Object.freeze([...this.entries.values()].map(entry=>Object.freeze({id:entry.id,kind:entry.kind,dependsOn:Object.freeze([...entry.dependsOn]),runs:entry.runs,lastError:entry.lastError,lastDurationMs:Number(entry.lastDurationMs.toFixed?.(3)??entry.lastDurationMs)}))),stats:Object.freeze({...this.stats})});}
    dispose(){if(this.disposed)return;this.disposed=true;if(this.frameQueued)cancelFrame(this.frameId);this.listeners.clear();this.pendingTouches.clear();this.pendingMeta.length=0;this.entries.clear();this.dependents.clear();this.nodes.clear();this.asyncTokens.clear();this.frameEffects.clear();}
  }

  function createScope(owner){const key=String(owner||'plugin');let scope=scopes.get(key);if(!scope||scope.disposed){scope=new ReactiveScope(key);scopes.set(key,scope);}return scope;}
  function removeOwner(owner){const key=String(owner||'');const scope=scopes.get(key);scope?.dispose?.();scopes.delete(key);return !!scope;}
  function snapshot(){return Object.freeze({version:VERSION,scopes:Object.freeze([...scopes.values()].filter(scope=>!scope.disposed).map(scope=>scope.snapshot()))});}

  window.DKDSScientificReactive=Object.freeze({VERSION,ReactiveScope,createScope,removeOwner,snapshot});
})();
