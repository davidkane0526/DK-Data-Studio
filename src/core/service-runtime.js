(() => {
  const rows = new Map();

  function norm(value,label='service id') {
    const text=String(value||'').trim();
    if(!text)throw new Error(`${label} is required.`);
    return text;
  }

  function register(owner,id,service,options={}) {
    const key=norm(id);
    const ownerId=norm(owner,'service owner');
    if(service==null)throw new Error(`Service ${key} is required.`);
    const current=rows.get(key);
    if(current && options.replace===false)throw new Error(`Service already registered: ${key}`);
    rows.set(key,{id:key,owner:ownerId,service,metadata:{...(options.metadata||{})}});
    return service;
  }

  function get(id) { return rows.get(String(id||''))?.service || null; }
  function requireService(id) {
    const value=get(id);
    if(!value)throw new Error(`Required host service is unavailable: ${id}`);
    return value;
  }
  function list() { return [...rows.values()].map(row=>({id:row.id,owner:row.owner,metadata:{...row.metadata}})); }
  function removeOwner(owner) {
    const ownerId=String(owner||'');
    let count=0;
    for(const [id,row] of rows){if(row.owner===ownerId){rows.delete(id);count++;}}
    return count;
  }
  function configure(services) {
    removeOwner('@host');
    if(!services)return;
    const entries=services instanceof Map ? [...services.entries()] : Object.entries(services);
    for(const [id,service] of entries){if(service!=null)register('@host',id,service,{replace:true});}
  }
  function createScope(owner) {
    const ownerId=norm(owner,'service owner');
    return Object.freeze({
      get,
      require:requireService,
      list,
      register:(id,service,options)=>register(ownerId,id,service,options)
    });
  }

  window.DKDSServices=Object.freeze({register,get,require:requireService,list,removeOwner,configure,createScope});
})();
