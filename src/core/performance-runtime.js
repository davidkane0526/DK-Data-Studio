(() => {
  if (window.DKDSPerformance) return;
  const VERSION='1.0.0';
  const weakNamespaces=new Map();
  const valueNamespaces=new Map();
  const metrics=new Map();
  const now=()=>globalThis.performance?.now?.()??Date.now();
  const finite=value=>Number.isFinite(Number(value));
  function metric(namespace){
    const id=String(namespace||'core');
    if(!metrics.has(id))metrics.set(id,{namespace:id,hits:0,misses:0,computes:0,evictions:0,skips:0,computeMs:0,lastComputeMs:0,entries:0});
    return metrics.get(id);
  }
  function clone(value){try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}}
  function updateEntries(namespace,count){metric(namespace).entries=Math.max(0,Number(count)||0);}
  function memoWeak(namespace,target,key,compute,options={}){
    if(!target||(typeof target!=='object'&&typeof target!=='function')||typeof compute!=='function')return compute?.();
    const ns=String(namespace||'core'),cache=weakNamespaces.get(ns)||new WeakMap();if(!weakNamespaces.has(ns))weakNamespaces.set(ns,cache);
    let bucket=cache.get(target);if(!bucket){bucket={entries:new Map(),signature:options.signature??null};cache.set(target,bucket);}
    const signature=options.signature??null;
    const m=metric(ns);
    if(signature!==null&&bucket.signature!==signature){m.entries=Math.max(0,m.entries-bucket.entries.size);bucket.entries.clear();bucket.signature=signature;}
    const id=String(key??'');
    if(bucket.entries.has(id)){m.hits+=1;return bucket.entries.get(id).value;}
    m.misses+=1;m.computes+=1;const started=now();const value=compute();const elapsed=Math.max(0,now()-started);m.computeMs+=elapsed;m.lastComputeMs=elapsed;
    bucket.entries.set(id,{value,at:Date.now()});m.entries+=1;
    const limit=Math.max(1,Number(options.limit)||16);
    while(bucket.entries.size>limit){bucket.entries.delete(bucket.entries.keys().next().value);m.evictions+=1;m.entries=Math.max(0,m.entries-1);}
    return value;
  }
  function memo(namespace,key,compute,options={}){
    if(typeof compute!=='function')return undefined;
    const ns=String(namespace||'core'),id=String(key??''),m=metric(ns),ttl=Math.max(0,Number(options.ttlMs)||0),limit=Math.max(1,Number(options.limit)||32);
    let cache=valueNamespaces.get(ns);if(!cache){cache=new Map();valueNamespaces.set(ns,cache);}
    const row=cache.get(id);if(row&&(!ttl||Date.now()-row.at<=ttl)){cache.delete(id);cache.set(id,row);m.hits+=1;updateEntries(ns,cache.size);return row.value;}
    if(row)cache.delete(id);m.misses+=1;m.computes+=1;const started=now();const value=compute();const elapsed=Math.max(0,now()-started);m.computeMs+=elapsed;m.lastComputeMs=elapsed;cache.set(id,{value,at:Date.now()});
    while(cache.size>limit){cache.delete(cache.keys().next().value);m.evictions+=1;}updateEntries(ns,cache.size);return value;
  }
  function measure(namespace,fn){const ns=String(namespace||'core'),m=metric(ns),started=now();try{return fn?.();}finally{const elapsed=Math.max(0,now()-started);m.computes+=1;m.computeMs+=elapsed;m.lastComputeMs=elapsed;}}
  function skip(namespace,count=1){metric(namespace).skips+=Math.max(1,Number(count)||1);}
  function clear(namespace=''){
    const id=String(namespace||'');
    if(id){valueNamespaces.delete(id);weakNamespaces.delete(id);const m=metrics.get(id);if(m)m.entries=0;return true;}
    valueNamespaces.clear();weakNamespaces.clear();for(const m of metrics.values())m.entries=0;return true;
  }
  function resetMetrics(namespace=''){
    const reset=m=>Object.assign(m,{hits:0,misses:0,computes:0,evictions:0,skips:0,computeMs:0,lastComputeMs:0});
    const id=String(namespace||'');if(id){if(metrics.has(id))reset(metrics.get(id));return true;}for(const m of metrics.values())reset(m);return true;
  }
  function snapshot(){
    const namespaces=[...metrics.values()].map(row=>({...row,hitRate:(row.hits+row.misses)?row.hits/(row.hits+row.misses):null,computeMs:Number(row.computeMs.toFixed(3)),lastComputeMs:Number(row.lastComputeMs.toFixed(3))})).sort((a,b)=>a.namespace.localeCompare(b.namespace));
    return {version:VERSION,namespaces,totals:namespaces.reduce((out,row)=>{for(const key of ['hits','misses','computes','evictions','skips','entries'])out[key]+=Number(row[key])||0;out.computeMs+=Number(row.computeMs)||0;return out;},{hits:0,misses:0,computes:0,evictions:0,skips:0,entries:0,computeMs:0})};
  }
  window.DKDSPerformance=Object.freeze({VERSION,memoWeak,memo,measure,skip,clear,resetMetrics,snapshot,metric:namespace=>clone(metric(namespace))});
})();
