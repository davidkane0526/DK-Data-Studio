(() => {
  const rows = new Map();
  const DOMAIN_PREFIX='@domain:';

  function norm(value,label='service id') {
    const text=String(value||'').trim();
    if(!text)throw new Error(`${label} is required.`);
    return text;
  }
  function cloneSerializable(value,label='domain payload'){
    if(value===undefined)return undefined;
    try{return structuredClone(value);}catch{}
    try{return JSON.parse(JSON.stringify(value));}catch{throw new Error(`${label} must be serializable.`);}
  }
  function isDomainRow(row){return row?.metadata?.kind==='domain-adapter';}
  function domainRef(owner,id){return `${norm(owner,'domain owner')}/${norm(id,'domain adapter id')}`;}
  function domainKey(ref){return `${DOMAIN_PREFIX}${norm(ref,'domain adapter ref')}`;}

  function register(owner,id,service,options={}) {
    const key=norm(id);
    if(key.startsWith(DOMAIN_PREFIX))throw new Error('Reserved service id prefix.');
    const ownerId=norm(owner,'service owner');
    if(service==null)throw new Error(`Service ${key} is required.`);
    const current=rows.get(key);
    if(current && options.replace===false)throw new Error(`Service already registered: ${key}`);
    rows.set(key,{id:key,owner:ownerId,service,metadata:{...(options.metadata||{})}});
    return service;
  }

  function get(id) { const row=rows.get(String(id||''));return !row||isDomainRow(row)?null:row.service; }
  function requireService(id) {
    const value=get(id);
    if(!value)throw new Error(`Required host service is unavailable: ${id}`);
    return value;
  }
  function list() { return [...rows.values()].filter(row=>!isDomainRow(row)).map(row=>({id:row.id,owner:row.owner,metadata:{...row.metadata}})); }

  function disposeDomainRow(row){try{row?.service?.disposeRegistration?.();}catch(err){console.warn('[DKDS domain adapter dispose]',err);}}
  function removeOwner(owner) {
    const ownerId=String(owner||'');
    let count=0;
    for(const [id,row] of [...rows]){if(row.owner===ownerId){if(isDomainRow(row))disposeDomainRow(row);rows.delete(id);count++;}}
    return count;
  }
  function configure(services) {
    removeOwner('@host');
    if(!services)return;
    const entries=services instanceof Map ? [...services.entries()] : Object.entries(services);
    for(const [id,service] of entries){if(service!=null)register('@host',id,service,{replace:true});}
  }

  function createDomainAdapter(owner,id,spec={}){
    const ownerId=norm(owner,'domain owner'),localId=norm(id,'domain adapter id'),ref=domainRef(ownerId,localId);
    if(typeof spec.snapshot!=='function')throw new Error(`Domain adapter ${ref} requires snapshot().`);
    const actionEntries=Object.entries(spec.actions&&typeof spec.actions==='object'?spec.actions:{});
    const actions=new Map();
    for(const [name,fn] of actionEntries){const key=norm(name,'domain action');if(typeof fn!=='function')throw new Error(`Domain adapter ${ref} action ${key} must be a function.`);actions.set(key,fn);}
    const listeners=new Set();let revision=0,disposed=false,providerOff=null;
    const descriptor=()=>Object.freeze({ref,id:localId,owner:ownerId,version:String(spec.version||'1.0.0'),title:String(spec.title||localId),access:String(spec.access||'dependency'),actions:Object.freeze([...actions.keys()]),revision});
    const emit=(event={})=>{revision+=1;const payload=Object.freeze({type:String(event.type||'state'),reason:String(event.reason||''),revision,ref,owner:ownerId,detail:cloneSerializable(event.detail,'domain adapter event')});for(const fn of [...listeners])try{fn(payload);}catch(err){console.warn('[DKDS domain adapter listener]',err);}return payload;};
    const api={
      descriptor,
      snapshot(){if(disposed)throw new Error(`Domain adapter unavailable: ${ref}`);return Object.freeze({descriptor:descriptor(),state:cloneSerializable(spec.snapshot(),'domain snapshot')});},
      async invoke(consumerId,action,payload){if(disposed)throw new Error(`Domain adapter unavailable: ${ref}`);const key=String(action||'').trim(),fn=actions.get(key);if(!fn)throw new Error(`Domain action unavailable: ${ref}#${key||'(empty)'}`);const result=await Promise.resolve(fn(cloneSerializable(payload,'domain action payload'),Object.freeze({consumerId:String(consumerId||''),owner:ownerId,ref,action:key})));emit({type:'invoke',reason:key});return cloneSerializable(result,'domain action result');},
      subscribe(fn){if(disposed||typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
      disposeRegistration(){if(disposed)return;disposed=true;try{providerOff?.();}catch{}providerOff=null;listeners.clear();}
    };
    if(typeof spec.subscribe==='function'){
      providerOff=spec.subscribe(event=>{if(disposed)return;const source=event&&typeof event==='object'?event:{detail:event};emit({type:'owner-state',reason:String(source.reason||source.type||''),detail:source.detail??source});})||null;
    }
    return Object.freeze(api);
  }

  function canConsume(row,consumerId,dependencies){
    if(!row||!isDomainRow(row))return false;
    const access=String(row.metadata.access||'dependency');
    if(String(row.owner)===String(consumerId))return true;
    if(access==='public')return true;
    return access==='dependency'&&dependencies.has(String(row.owner));
  }

  function createScope(owner,options={}) {
    const ownerId=norm(owner,'service owner');
    const dependencies=new Set((Array.isArray(options.dependencies)?options.dependencies:[]).map(value=>String(value||'').trim()).filter(Boolean));
    const consumerOffs=new Set();
    const domain=Object.freeze({
      provide(id,spec={}){
        const adapter=createDomainAdapter(ownerId,id,spec),desc=adapter.descriptor(),key=domainKey(desc.ref),current=rows.get(key);
        if(current)throw new Error(`Domain adapter already registered: ${desc.ref}`);
        rows.set(key,{id:key,owner:ownerId,service:adapter,metadata:{kind:'domain-adapter',ref:desc.ref,localId:desc.id,version:desc.version,title:desc.title,access:desc.access}});
        return Object.freeze({...desc,dispose:()=>{const row=rows.get(key);if(row?.owner!==ownerId)return false;disposeDomainRow(row);rows.delete(key);return true;}});
      },
      connect(ref){
        const wanted=norm(ref,'domain adapter ref');
        const resolve=()=>{const row=rows.get(domainKey(wanted));if(!canConsume(row,ownerId,dependencies))throw new Error(`Domain adapter unavailable or dependency not declared: ${wanted}`);return row.service;};
        resolve();
        return Object.freeze({
          ref:wanted,
          descriptor:()=>resolve().descriptor(),
          snapshot:()=>resolve().snapshot(),
          invoke:(action,payload)=>resolve().invoke(ownerId,action,payload),
          subscribe:(fn,{immediate=false}={})=>{const adapter=resolve();const off=adapter.subscribe(fn);consumerOffs.add(off);const wrapped=()=>{consumerOffs.delete(off);off();};if(immediate&&typeof fn==='function')fn(Object.freeze({type:'snapshot',reason:'connect',revision:adapter.descriptor().revision,ref:wanted,owner:adapter.descriptor().owner,detail:null}));return wrapped;},
          available:()=>{try{resolve();return true;}catch{return false;}}
        });
      },
      list(){return [...rows.values()].filter(row=>canConsume(row,ownerId,dependencies)).map(row=>row.service.descriptor());}
    });
    return Object.freeze({
      get,
      require:requireService,
      list,
      register:(id,service,options)=>register(ownerId,id,service,options),
      domain,
      dispose(){for(const off of [...consumerOffs])try{off();}catch{}consumerOffs.clear();return removeOwner(ownerId);}
    });
  }

  window.DKDSServices=Object.freeze({register,get,require:requireService,list,removeOwner,configure,createScope});
})();
