(() => {
  if (window.DKDSCapabilities) return;

  const VERSION = '2.0.0';
  const SCHEMA = 2;
  const local = new Map();
  const remote = new Map();
  const listeners = new Set();
  let remoteInvoker = null;
  let remoteRevision = 0;
  let revision = 0;

  const clone = value => {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch { try { return JSON.parse(JSON.stringify(value)); } catch { return null; } }
  };
  const safeMeta = value => {
    const out = clone(value);
    if (out === null || out === undefined) return {};
    return typeof out === 'object' ? out : { value: out };
  };
  const normalizedId = value => String(value || '').trim();
  const normalizedKind = value => String(value || 'service').trim().toLowerCase() || 'service';
  const normalizedTags = value => Object.freeze([...new Set((Array.isArray(value) ? value : value ? [value] : []).map(String).map(x=>x.trim()).filter(Boolean))]);
  const normalizedMethods = value => Object.freeze([...new Set((Array.isArray(value) ? value : []).map(String).filter(Boolean))]);

  function notify(reason='change', detail={}) {
    const payload={reason,revision,remoteRevision,...detail};
    for(const fn of [...listeners]){try{fn(payload);}catch(err){console.warn('[DKDS capabilities listener]',err);}}
    try{window.dispatchEvent(new CustomEvent('dkds:capabilities-changed',{detail:payload}));}catch{}
  }

  function descriptorOf(row) {
    return Object.freeze({
      schema:SCHEMA,
      id:row.id,
      kind:row.kind,
      owner:row.owner,
      title:row.title,
      version:row.version,
      methods:normalizedMethods([...row.methods.keys()]),
      metadata:Object.freeze(safeMeta(row.metadata)),
      tags:normalizedTags(row.tags),
      priority:Number(row.priority)||0,
      remote:row.remote !== false,
      revision:row.revision
    });
  }

  function register(owner, id, spec={}) {
    const key = normalizedId(id);
    if (!key) throw new Error('Capability id is required.');
    const methods = new Map();
    const sourceMethods = spec.methods && typeof spec.methods === 'object' ? spec.methods : {};
    for (const [name, fn] of Object.entries(sourceMethods)) if (typeof fn === 'function') methods.set(String(name), fn);
    if (typeof spec.invoke === 'function' && !methods.has('invoke')) methods.set('invoke', spec.invoke);
    const row = {
      id:key,
      kind:normalizedKind(spec.kind),
      owner:String(owner || spec.owner || ''),
      title:String(spec.title || spec.name || key),
      version:String(spec.version || '1.0.0'),
      metadata:safeMeta(spec.metadata || {}),
      tags:normalizedTags(spec.tags),
      priority:Number(spec.priority)||0,
      methods,
      remote:spec.remote !== false,
      revision:++revision
    };
    local.set(key, row);
    remote.delete(key);
    notify('register',{id:key,owner:row.owner,kind:row.kind});
    return descriptorOf(row);
  }

  function unregister(id) {
    const key = normalizedId(id);
    if (!local.has(key)) return false;
    const row=local.get(key);local.delete(key);revision += 1;notify('unregister',{id:key,owner:row?.owner||'',kind:row?.kind||''});return true;
  }

  function removeOwner(owner) {
    const value = String(owner || '');
    const removed=[];
    for (const [id,row] of [...local]) if (row.owner === value) { local.delete(id); removed.push(id); }
    if (removed.length) { revision += 1; notify('remove-owner',{owner:value,ids:removed}); }
  }

  function snapshot({remoteOnly=false}={}) {
    const rows = [...local.values()]
      .filter(row => !remoteOnly || row.remote !== false)
      .sort((a,b)=>(b.priority-a.priority)||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title))
      .map(row => descriptorOf(row));
    return { schema:SCHEMA, version:VERSION, revision, providers:clone(rows) || [] };
  }

  function importRemote(payload, invoker) {
    remote.clear();
    const rows = Array.isArray(payload?.providers) ? payload.providers : [];
    for (const raw of rows) {
      const id = normalizedId(raw?.id); if (!id || local.has(id)) continue;
      remote.set(id, Object.freeze({
        schema:Number(raw.schema)||1,
        id,
        kind:normalizedKind(raw.kind),
        owner:String(raw.owner || ''),
        title:String(raw.title || id),
        version:String(raw.version || '1.0.0'),
        methods:normalizedMethods(raw.methods),
        metadata:Object.freeze(safeMeta(raw.metadata || {})),
        tags:normalizedTags(raw.tags),
        priority:Number(raw.priority)||0,
        remote:true,
        revision:Number(raw.revision) || 0
      }));
    }
    remoteRevision=Number(payload?.revision)||remoteRevision+1;
    if (typeof invoker === 'function') remoteInvoker = invoker;
    notify('remote-import',{count:remote.size});
    return list();
  }

  function get(id) {
    const key = normalizedId(id);
    const localRow = local.get(key);
    if (localRow) return descriptorOf(localRow);
    return remote.get(key) || null;
  }

  function matchesQuery(row, query={}){
    if(typeof query==='string')return !query || row.kind===normalizedKind(query);
    const q=query&&typeof query==='object'?query:{};
    if(q.kind&&row.kind!==normalizedKind(q.kind))return false;
    if(q.owner&&row.owner!==String(q.owner))return false;
    if(q.remote!==undefined&&!!row.remote!==!!q.remote)return false;
    if(q.id&&row.id!==String(q.id))return false;
    if(q.method&&!row.methods.includes(String(q.method)))return false;
    const tags=(Array.isArray(q.tags)?q.tags:q.tag?[q.tag]:[]).map(String);
    if(tags.length&&!tags.every(tag=>row.tags.includes(tag)))return false;
    if(typeof q.filter==='function')return !!q.filter(row);
    return true;
  }

  function list(kind='') {
    const query=typeof kind==='string'?{kind}:kind||{};
    const rows = [];
    for (const row of local.values()) {const d=descriptorOf(row);if(matchesQuery(d,query))rows.push(d);}
    for (const row of remote.values()) if (!local.has(row.id) && matchesQuery(row,query)) rows.push(row);
    return rows.sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
  }

  function requireCapability(id, options={}){
    const row=get(id);if(!row)throw new Error(`Capability unavailable: ${id}`);
    if(options.kind&&row.kind!==normalizedKind(options.kind))throw new Error(`Capability kind mismatch: ${id} is ${row.kind}, expected ${normalizedKind(options.kind)}`);
    for(const method of options.methods||[])if(!row.methods.includes(String(method)))throw new Error(`Capability method unavailable: ${id}.${method}`);
    return row;
  }

  async function invoke(id, method='invoke', ...args) {
    const key = normalizedId(id); const name = String(method || 'invoke');
    const localRow = local.get(key);
    if (localRow) {
      const fn = localRow.methods.get(name);
      if (typeof fn !== 'function') throw new Error(`Capability method unavailable: ${key}.${name}`);
      return await fn(...args);
    }
    const remoteRow = remote.get(key);
    if (!remoteRow) throw new Error(`Capability unavailable: ${key}`);
    if (!remoteRow.methods.includes(name)) throw new Error(`Remote capability method unavailable: ${key}.${name}`);
    if (typeof remoteInvoker !== 'function') throw new Error(`Remote capability bridge unavailable: ${key}.${name}`);
    return await remoteInvoker({id:key, method:name, args:clone(args) || []});
  }

  function proxy(id) {
    const descriptor = get(id); if (!descriptor) return null;
    return new Proxy({...descriptor}, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (descriptor.methods.includes(String(prop))) return (...args)=>invoke(descriptor.id,String(prop),...args);
        return undefined;
      }
    });
  }

  function subscribe(fn,{immediate=false}={}){
    if(typeof fn!=='function')return()=>{};listeners.add(fn);if(immediate)fn({reason:'subscribe',revision,remoteRevision});return()=>listeners.delete(fn);
  }

  window.DKDSCapabilities = Object.freeze({
    version:VERSION,schema:SCHEMA,
    register, unregister, removeOwner, snapshot, importRemote, get, list, invoke, proxy,
    require:requireCapability, subscribe,
    revision:()=>revision,
    remoteRevision:()=>remoteRevision
  });
})();
