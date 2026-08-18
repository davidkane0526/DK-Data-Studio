(() => {
  if (window.DKDSState) return;
  const deepClone=value=>{
    if(value===undefined)return undefined;
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  };
  const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

  class Store {
    constructor(initial,options={}){
      this.options={historyLimit:0,...options};
      this.initial=deepClone(initial);
      this.value=deepClone(initial);
      this.listeners=new Set();
      this.batchDepth=0;this.pending=false;this.pendingMeta=null;
      this.history=[];this.future=[];this.disposed=false;
    }
    get(){return this.value;}
    snapshot(){return deepClone(this.value);}
    validate(next){
      if(typeof this.options.validate!=='function')return next;
      const result=this.options.validate(next,this.value);
      if(result===false)throw new Error(this.options.validationMessage||'State validation failed.');
      return result===true||result===undefined?next:result;
    }
    remember(){
      const limit=Math.max(0,Number(this.options.historyLimit)||0);if(!limit)return;
      this.history.push(this.snapshot());if(this.history.length>limit)this.history.splice(0,this.history.length-limit);this.future=[];
    }
    set(next,meta={}){
      if(this.disposed)return this.value;
      const value=typeof next==='function'?next(this.value):next;
      const validated=this.validate(deepClone(value));
      this.remember();this.value=validated;this.queue(meta);return this.value;
    }
    patch(patch,meta={}){
      if(!isObject(this.value))return this.set(patch,meta);
      const delta=typeof patch==='function'?patch(this.value):patch;
      return this.set({...this.value,...deepClone(delta||{})},meta);
    }
    update(mutator,meta={}){
      const draft=this.snapshot();const result=mutator?.(draft);
      return this.set(result===undefined?draft:result,meta);
    }
    transaction(fn,meta={}){
      this.batchDepth++;
      try{return fn?.(this);}finally{this.batchDepth--;if(!this.batchDepth&&this.pending)this.flush(meta);}
    }
    queue(meta={}){this.pending=true;this.pendingMeta={...(this.pendingMeta||{}),...meta};if(!this.batchDepth)this.flush();}
    flush(extra={}){
      if(!this.pending||this.disposed)return;
      this.pending=false;const meta={...(this.pendingMeta||{}),...extra};this.pendingMeta=null;
      for(const fn of [...this.listeners]){try{fn(this.value,meta,this);}catch(err){console.error('[DKDS state listener]',err);}}
      try{this.options.onChange?.(this.value,meta,this);}catch(err){console.error('[DKDS state onChange]',err);}
    }
    subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return()=>{};this.listeners.add(fn);if(immediate)fn(this.value,{reason:'subscribe'},this);return()=>this.listeners.delete(fn);}
    select(selector,listener,{equals=Object.is,immediate=false}={}){
      let prev=selector(this.value);
      if(immediate)listener(prev,undefined,{reason:'subscribe'},this);
      return this.subscribe((value,meta)=>{const next=selector(value);if(equals(next,prev))return;const old=prev;prev=next;listener(next,old,meta,this);});
    }
    restore(value,meta={}){const validated=this.validate(deepClone(value===undefined?this.initial:value));this.value=validated;this.history=[];this.future=[];this.queue({reason:'restore',...meta});return this.value;}
    reset(meta={}){return this.restore(this.initial,{reason:'reset',...meta});}
    canUndo(){return this.history.length>0;}
    canRedo(){return this.future.length>0;}
    undo(meta={}){if(!this.history.length)return false;this.future.push(this.snapshot());this.value=this.history.pop();this.queue({reason:'undo',...meta});return true;}
    redo(meta={}){if(!this.future.length)return false;this.history.push(this.snapshot());this.value=this.future.pop();this.queue({reason:'redo',...meta});return true;}
    dispose(){this.disposed=true;this.listeners.clear();this.history=[];this.future=[];}
  }

  function create(initial={},options={}){return new Store(initial,options);}
  window.DKDSState=Object.freeze({version:'1.0.0',create,Store,deepClone});
})();
