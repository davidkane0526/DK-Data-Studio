(() => {
  if (window.DKDSCapabilities) return;

  const VERSION = '1.0.0';
  const local = new Map();
  const remote = new Map();
  let remoteInvoker = null;
  let revision = 0;
  const emitChange=()=>{try{window.dispatchEvent(new CustomEvent('dkds:capabilities-changed',{detail:{revision}}));}catch{}};

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

  function descriptorOf(row) {
    return Object.freeze({
      id:row.id,
      kind:row.kind,
      owner:row.owner,
      title:row.title,
      version:row.version,
      methods:Object.freeze([...row.methods.keys()]),
      metadata:Object.freeze(safeMeta(row.metadata)),
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
      methods,
      remote:spec.remote !== false,
      revision:++revision
    };
    local.set(key, row);
    remote.delete(key);
    emitChange();
    return descriptorOf(row);
  }

  function unregister(id) {
    const key = normalizedId(id);
    if (!local.has(key)) return false;
    local.delete(key); revision += 1; emitChange(); return true;
  }

  function removeOwner(owner) {
    const value = String(owner || '');
    let changed = false;
    for (const [id,row] of [...local]) if (row.owner === value) { local.delete(id); changed = true; }
    if (changed) { revision += 1; emitChange(); }
  }

  function snapshot({remoteOnly=false}={}) {
    const rows = [...local.values()]
      .filter(row => !remoteOnly || row.remote !== false)
      .map(row => descriptorOf(row));
    return { schema:1, version:VERSION, revision, providers:clone(rows) || [] };
  }

  function importRemote(payload, invoker) {
    remote.clear();
    const rows = Array.isArray(payload?.providers) ? payload.providers : [];
    for (const raw of rows) {
      const id = normalizedId(raw?.id); if (!id || local.has(id)) continue;
      remote.set(id, Object.freeze({
        id,
        kind:normalizedKind(raw.kind),
        owner:String(raw.owner || ''),
        title:String(raw.title || id),
        version:String(raw.version || '1.0.0'),
        methods:Object.freeze((Array.isArray(raw.methods) ? raw.methods : []).map(String)),
        metadata:Object.freeze(safeMeta(raw.metadata || {})),
        remote:true,
        revision:Number(raw.revision) || 0
      }));
    }
    if (typeof invoker === 'function') remoteInvoker = invoker;
    return list();
  }

  function get(id) {
    const key = normalizedId(id);
    const localRow = local.get(key);
    if (localRow) return descriptorOf(localRow);
    return remote.get(key) || null;
  }

  function list(kind='') {
    const target = String(kind || '').trim().toLowerCase();
    const rows = [];
    for (const row of local.values()) if (!target || row.kind === target) rows.push(descriptorOf(row));
    for (const row of remote.values()) if (!local.has(row.id) && (!target || row.kind === target)) rows.push(row);
    return rows.sort((a,b)=>a.kind.localeCompare(b.kind)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
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

  window.DKDSCapabilities = Object.freeze({
    version:VERSION,
    register, unregister, removeOwner, snapshot, importRemote, get, list, invoke, proxy,
    revision:()=>revision
  });
})();
