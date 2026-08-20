(() => {
  if (window.DKDSPerformance) return;
  const VERSION='1.2.0';
  const DEFAULT_POLICY=Object.freeze({limit:32,ttlMs:0});
  const weakNamespaces=new Map();
  const weakEntryCounts=new Map();
  const valueNamespaces=new Map();
  const policies=new Map();
  const metrics=new Map();
  const now=()=>globalThis.performance?.now?.()??Date.now();
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const namespaceId=value=>String(value||'core');

  function metric(namespace){
    const id=namespaceId(namespace);
    if(!metrics.has(id))metrics.set(id,{namespace:id,hits:0,misses:0,computes:0,evictions:0,expirations:0,trims:0,trimmedEntries:0,weakResets:0,disposedEntries:0,disposeErrors:0,skips:0,computeMs:0,lastComputeMs:0,entries:0});
    return metrics.get(id);
  }
  function normalizedPolicy(spec={}){
    return {
      limit:Math.max(1,Number(spec.limit)||DEFAULT_POLICY.limit),
      ttlMs:Math.max(0,Number(spec.ttlMs)||0)
    };
  }
  function policy(namespace,overrides={}){
    const stored=policies.get(namespaceId(namespace))||DEFAULT_POLICY;
    return normalizedPolicy({...stored,...overrides});
  }
  function configure(namespace,spec={}){
    const id=namespaceId(namespace),next=normalizedPolicy({...policy(id),...spec});
    policies.set(id,next);
    return clone(next);
  }
  function updateEntries(namespace){const ns=namespaceId(namespace);metric(ns).entries=(valueNamespaces.get(ns)?.size||0)+(weakEntryCounts.get(ns)||0);}
  function recordCompute(m,started){const elapsed=Math.max(0,now()-started);m.computeMs+=elapsed;m.lastComputeMs=elapsed;}
  function expired(row,ttlMs){return !!(row&&ttlMs&&Date.now()-Number(row.at||0)>ttlMs);}
  function disposeValue(namespace,row,reason='evict'){
    if(!row||typeof row.dispose!=='function')return false;const m=metric(namespace);
    try{row.dispose(row.value,{namespace:namespaceId(namespace),reason:String(reason||'evict')});m.disposedEntries+=1;return true;}
    catch(err){m.disposeErrors+=1;console.warn('[DKDS Performance dispose]',namespace,err);return false;}
  }

  function memoWeak(namespace,target,key,compute,options={}){
    if(!target||(typeof target!=='object'&&typeof target!=='function')||typeof compute!=='function')return compute?.();
    const ns=namespaceId(namespace),cfg=policy(ns,options),m=metric(ns);
    let cache=weakNamespaces.get(ns);if(!cache){cache=new WeakMap();weakNamespaces.set(ns,cache);}
    let bucket=cache.get(target);if(!bucket){bucket={entries:new Map(),signature:options.signature??null};cache.set(target,bucket);}
    const signature=options.signature??null;
    if(signature!==null&&bucket.signature!==signature){for(const row of bucket.entries.values())disposeValue(ns,row,'signature');weakEntryCounts.set(ns,Math.max(0,(weakEntryCounts.get(ns)||0)-bucket.entries.size));bucket.entries.clear();bucket.signature=signature;updateEntries(ns);}
    const id=String(key??''),row=bucket.entries.get(id);
    if(row&&!expired(row,cfg.ttlMs)){bucket.entries.delete(id);bucket.entries.set(id,row);m.hits+=1;return row.value;}
    if(row){bucket.entries.delete(id);disposeValue(ns,row,'expired');weakEntryCounts.set(ns,Math.max(0,(weakEntryCounts.get(ns)||0)-1));m.expirations+=1;updateEntries(ns);}
    m.misses+=1;m.computes+=1;const started=now();const value=compute();recordCompute(m,started);
    bucket.entries.set(id,{value,at:Date.now(),dispose:typeof options.dispose==='function'?options.dispose:null});weakEntryCounts.set(ns,(weakEntryCounts.get(ns)||0)+1);updateEntries(ns);
    while(bucket.entries.size>cfg.limit){const oldest=bucket.entries.keys().next().value;const removed=bucket.entries.get(oldest);bucket.entries.delete(oldest);disposeValue(ns,removed,'lru');weakEntryCounts.set(ns,Math.max(0,(weakEntryCounts.get(ns)||0)-1));m.evictions+=1;updateEntries(ns);}
    return value;
  }

  function memo(namespace,key,compute,options={}){
    if(typeof compute!=='function')return undefined;
    const ns=namespaceId(namespace),id=String(key??''),cfg=policy(ns,options),m=metric(ns);
    let cache=valueNamespaces.get(ns);if(!cache){cache=new Map();valueNamespaces.set(ns,cache);}
    const row=cache.get(id);
    if(row&&!expired(row,cfg.ttlMs)){cache.delete(id);cache.set(id,row);m.hits+=1;updateEntries(ns);return row.value;}
    if(row){cache.delete(id);disposeValue(ns,row,'expired');m.expirations+=1;}
    m.misses+=1;m.computes+=1;const started=now();const value=compute();recordCompute(m,started);cache.set(id,{value,at:Date.now(),dispose:typeof options.dispose==='function'?options.dispose:null});
    while(cache.size>cfg.limit){const oldest=cache.keys().next().value;const removed=cache.get(oldest);cache.delete(oldest);disposeValue(ns,removed,'lru');m.evictions+=1;}updateEntries(ns);return value;
  }

  function stage(namespace,revision,parameterKey,compute,options={}){
    const rev=String(revision??'0'),params=String(parameterKey??'');
    return memo(namespace,`${rev}::${params}`,compute,options);
  }

  function trimNamespace(namespace,options={}){
    const ns=namespaceId(namespace),m=metric(ns),cache=valueNamespaces.get(ns);
    const ratio=clamp(options.retainRatio??options.ratio??0.5,0,1);
    let removed=0;
    if(cache){
      const requested=Number.isFinite(Number(options.targetEntries))?Math.max(0,Math.floor(Number(options.targetEntries))):Math.floor(cache.size*ratio);
      const target=Math.min(cache.size,requested);
      while(cache.size>target){const oldest=cache.keys().next().value;const row=cache.get(oldest);cache.delete(oldest);disposeValue(ns,row,options.reason||'trim');removed+=1;}
      updateEntries(ns);
      if(!cache.size)valueNamespaces.delete(ns);
    }
    if(options.dropWeak===true&&weakNamespaces.has(ns)){
      weakNamespaces.delete(ns);weakEntryCounts.delete(ns);m.weakResets+=1;updateEntries(ns);
    }
    m.trims+=1;m.trimmedEntries+=removed;
    return {namespace:ns,removed,entries:metric(ns).entries,dropWeak:options.dropWeak===true,reason:String(options.reason||'manual')};
  }

  function trimPrefix(prefix='',options={}){
    const p=String(prefix||'');
    const ids=new Set([...valueNamespaces.keys(),...weakNamespaces.keys()].filter(id=>!p||id.startsWith(p)));
    const rows=[...ids].map(id=>trimNamespace(id,options));
    return {prefix:p,removed:rows.reduce((sum,row)=>sum+row.removed,0),namespaces:rows};
  }
  function trimAll(options={}){return trimPrefix('',options);}
  function lifecycle(state,options={}){
    const value=String(state||'').toLowerCase();
    if(value==='hidden'||value==='suspended')return trimAll({retainRatio:0.25,dropWeak:true,reason:value,...options});
    return {state:value||'active',removed:0,namespaces:[]};
  }

  function measure(namespace,fn){const ns=namespaceId(namespace),m=metric(ns),started=now();try{return fn?.();}finally{m.computes+=1;recordCompute(m,started);}}
  function skip(namespace,count=1){metric(namespace).skips+=Math.max(1,Number(count)||1);}
  function clear(namespace=''){
    const id=String(namespace||'');
    if(id){const cache=valueNamespaces.get(id);if(cache)for(const row of cache.values())disposeValue(id,row,'clear');valueNamespaces.delete(id);weakNamespaces.delete(id);weakEntryCounts.delete(id);const m=metrics.get(id);if(m)m.entries=0;return true;}
    for(const [ns,cache] of valueNamespaces)for(const row of cache.values())disposeValue(ns,row,'clear');valueNamespaces.clear();weakNamespaces.clear();weakEntryCounts.clear();for(const m of metrics.values())m.entries=0;return true;
  }
  function resetMetrics(namespace=''){
    const reset=m=>Object.assign(m,{hits:0,misses:0,computes:0,evictions:0,expirations:0,trims:0,trimmedEntries:0,weakResets:0,disposedEntries:0,disposeErrors:0,skips:0,computeMs:0,lastComputeMs:0});
    const id=String(namespace||'');if(id){if(metrics.has(id))reset(metrics.get(id));return true;}for(const m of metrics.values())reset(m);return true;
  }
  function snapshot(prefix=''){
    const p=String(prefix||'');
    const namespaces=[...metrics.values()].filter(row=>!p||row.namespace.startsWith(p)).map(row=>({...row,policy:policy(row.namespace),hitRate:(row.hits+row.misses)?row.hits/(row.hits+row.misses):null,computeMs:Number(row.computeMs.toFixed(3)),lastComputeMs:Number(row.lastComputeMs.toFixed(3))})).sort((a,b)=>a.namespace.localeCompare(b.namespace));
    const totals=namespaces.reduce((out,row)=>{for(const key of ['hits','misses','computes','evictions','expirations','trims','trimmedEntries','weakResets','disposedEntries','disposeErrors','skips','entries'])out[key]+=Number(row[key])||0;out.computeMs+=Number(row.computeMs)||0;return out;},{hits:0,misses:0,computes:0,evictions:0,expirations:0,trims:0,trimmedEntries:0,weakResets:0,disposedEntries:0,disposeErrors:0,skips:0,entries:0,computeMs:0});
    totals.computeMs=Number(totals.computeMs.toFixed(3));
    return {version:VERSION,prefix:p,namespaces,totals};
  }

  window.DKDSPerformance=Object.freeze({VERSION,DEFAULT_POLICY,configure,policy,memoWeak,memo,stage,measure,skip,trim:trimNamespace,trimPrefix,trimAll,lifecycle,clear,resetMetrics,snapshot,metric:namespace=>clone({...metric(namespace),policy:policy(namespace)})});
})();
