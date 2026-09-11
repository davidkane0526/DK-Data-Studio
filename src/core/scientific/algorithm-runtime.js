(() => {
  if (window.DKDSScientificAlgorithms) return;
  const VERSION='1.1.0';
  const PREF_KEY='dkds.scientific-algorithm-preferences.v1';
  const registry=new Map();
  const ownerIndex=new Map();
  const preferences=new Map();
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const arr=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  const clean=value=>String(value||'').trim();
  const semver=value=>clean(value).split(/[.-]/).slice(0,3).map(v=>Number(v)||0);
  const compareVersion=(a,b)=>{const av=semver(a),bv=semver(b);for(let i=0;i<3;i++){if(av[i]!==bv[i])return av[i]-bv[i];}return clean(a).localeCompare(clean(b));};
  const keyOf=(category,id,version)=>`${clean(category)}::${clean(id)}@${clean(version)}`;
  const familyKey=(category,id)=>`${clean(category)}::${clean(id)}`;
  const normalizeRef=(ref,query={})=>{
    if(ref&&typeof ref==='object')return {id:clean(ref.id||ref.algorithmId),version:clean(ref.version||ref.algorithmVersion),category:clean(ref.category||query.category)};
    const text=clean(ref);const at=text.lastIndexOf('@');
    return at>0?{id:text.slice(0,at),version:text.slice(at+1),category:clean(query.category)}:{id:text,version:'',category:clean(query.category)};
  };
  function loadPreferences(){
    try{
      const raw=JSON.parse(localStorage.getItem(PREF_KEY)||'{}');
      for(const [key,value] of Object.entries(raw||{})){const version=clean(value);if(version)preferences.set(key,version);}
    }catch{}
  }
  function savePreferences(){
    try{localStorage.setItem(PREF_KEY,JSON.stringify(Object.fromEntries(preferences)));}catch{}
  }
  loadPreferences();
  function descriptor(row){
    if(!row)return null;
    return Object.freeze({id:row.id,algorithmId:row.id,version:row.version,algorithmVersion:row.version,category:row.category,owner:row.owner,title:row.title,description:row.description,default:row.default===true,priority:row.priority,inputTypes:Object.freeze([...row.inputTypes]),outputTypes:Object.freeze([...row.outputTypes]),parameterSchema:row.parameterSchema?clone(row.parameterSchema):null,tags:Object.freeze([...row.tags]),metadata:Object.freeze(clone(row.metadata||{})),remote:!!row.remote});
  }
  function register(owner,id,spec={}){
    const o=clean(owner)||'plugin',algorithmId=clean(id);if(!algorithmId)throw new Error('Scientific algorithm id required.');
    const category=clean(spec.category);if(!category)throw new Error(`Scientific algorithm ${algorithmId} requires category.`);
    const version=clean(spec.version)||'1.0.0';const run=spec.run||spec.compute||spec.detect;
    if(typeof run!=='function')throw new Error(`Scientific algorithm ${algorithmId}@${version} requires run().`);
    const key=keyOf(category,algorithmId,version);const existing=registry.get(key);
    if(existing&&existing.owner!==o)throw new Error(`Scientific algorithm ${category}/${algorithmId}@${version} already belongs to ${existing.owner}.`);
    const row={key,owner:o,id:algorithmId,category,version,title:clean(spec.title||spec.name||algorithmId),description:clean(spec.description),default:spec.default===true,priority:Number(spec.priority)||0,inputTypes:arr(spec.inputTypes||spec.inputType).map(clean).filter(Boolean),outputTypes:arr(spec.outputTypes||spec.outputType).map(clean).filter(Boolean),parameterSchema:spec.parameterSchema||null,tags:[...new Set(arr(spec.tags).map(clean).filter(Boolean))],metadata:{...(spec.metadata||{})},run,defaultSettings:typeof spec.defaultSettings==='function'?spec.defaultSettings:null,getPreset:typeof spec.getPreset==='function'?spec.getPreset:null,migrateParameters:typeof spec.migrateParameters==='function'?spec.migrateParameters:null,remote:false};
    registry.set(key,row);if(!ownerIndex.has(o))ownerIndex.set(o,new Set());ownerIndex.get(o).add(key);return descriptor(row);
  }
  function unregister(owner,id,version='',category=''){
    const o=clean(owner),ref=normalizeRef({id,version,category});let removed=false;
    for(const [key,row] of [...registry]){if(row.owner!==o||row.id!==ref.id)continue;if(ref.version&&row.version!==ref.version)continue;if(ref.category&&row.category!==ref.category)continue;registry.delete(key);ownerIndex.get(o)?.delete(key);removed=true;}return removed;
  }
  function removeOwner(owner){const o=clean(owner);for(const key of [...(ownerIndex.get(o)||[])])registry.delete(key);ownerIndex.delete(o);}
  function list(query={}){
    const q=typeof query==='string'?{category:query}:query||{};return [...registry.values()].filter(row=>(!q.category||row.category===clean(q.category))&&(!q.id||row.id===clean(q.id))&&(!q.owner||row.owner===clean(q.owner))&&(!q.version||row.version===clean(q.version))&&(!q.tag||row.tags.includes(clean(q.tag)))).sort((a,b)=>(Number(b.default)-Number(a.default))||(b.priority-a.priority)||compareVersion(b.version,a.version)||a.title.localeCompare(b.title)).map(descriptor);
  }
  function preferred(category,id){const c=clean(category),a=clean(id);if(!c||!a)return '';return clean(preferences.get(familyKey(c,a)));}
  function setPreferred(ref,query={}){
    const wanted=normalizeRef(ref,query);if(!wanted.category||!wanted.id||!wanted.version)throw new Error('Preferred algorithm requires category, id and version.');
    const exact=registry.get(keyOf(wanted.category,wanted.id,wanted.version));if(!exact)throw new Error(`Cannot prefer unavailable algorithm: ${wanted.category}/${wanted.id}@${wanted.version}`);
    preferences.set(familyKey(wanted.category,wanted.id),wanted.version);savePreferences();return descriptor(exact);
  }
  function clearPreferred(category,id){const changed=preferences.delete(familyKey(category,id));if(changed)savePreferences();return changed;}
  function resolve(ref,query={}){
    const wanted=normalizeRef(ref,query);
    const candidates=[...registry.values()].filter(row=>(!wanted.category||row.category===wanted.category)&&(!wanted.id||row.id===wanted.id)&&(!wanted.version||row.version===wanted.version)&&(!query.owner||row.owner===clean(query.owner)));
    if(!wanted.version&&wanted.category&&wanted.id){const version=preferred(wanted.category,wanted.id);if(version){const hit=candidates.find(row=>row.version===version);if(hit)return descriptor(hit);}}
    candidates.sort((a,b)=>(Number(b.default)-Number(a.default))||(b.priority-a.priority)||compareVersion(b.version,a.version));return descriptor(candidates[0]||null);
  }
  function getRow(ref,query={}){const d=resolve(ref,query);return d?registry.get(keyOf(d.category,d.id,d.version))||null:null;}
  function versions(ref,query={}){const wanted=normalizeRef(ref,query);return list({category:wanted.category,id:wanted.id,owner:query.owner}).sort((a,b)=>compareVersion(b.version,a.version));}
  function diagnose(ref,query={}){
    const wanted=normalizeRef(ref,query);const family=versions(wanted,query);const exact=wanted.version?family.find(row=>row.version===wanted.version):null;const resolved=resolve(wanted,query);
    let status='available';
    if(wanted.version&&!exact)status=family.length?'missing-version':'missing-algorithm';
    else if(!wanted.version&&!resolved)status='missing-algorithm';
    return Object.freeze({status,available:status==='available',requested:Object.freeze({...wanted}),resolved:resolved?Object.freeze({category:resolved.category,id:resolved.id,version:resolved.version,owner:resolved.owner}):null,preferredVersion:wanted.category&&wanted.id?preferred(wanted.category,wanted.id):'',alternatives:Object.freeze(family.map(row=>Object.freeze({category:row.category,id:row.id,version:row.version,owner:row.owner,title:row.title,default:row.default})))});
  }
  function lock(ref,query={}){
    const wanted=normalizeRef(ref,query);const resolved=resolve(wanted,query);
    if(wanted.version){return Object.freeze({category:wanted.category||resolved?.category||'',id:wanted.id||resolved?.id||'',version:wanted.version});}
    if(!resolved)return Object.freeze({category:wanted.category,id:wanted.id,version:''});
    return Object.freeze({category:resolved.category,id:resolved.id,version:resolved.version});
  }
  function run(ref,input,options={}){const row=getRow(ref,options);if(!row){const d=diagnose(ref,options);const suffix=d.status==='missing-version'&&d.alternatives.length?` Available: ${d.alternatives.map(x=>x.version).join(', ')}`:'';throw new Error(`Scientific algorithm unavailable: ${typeof ref==='string'?ref:JSON.stringify(ref)}.${suffix}`);}return row.run(input,{...options,algorithm:descriptor(row),parameters:clone(options.parameters||{})});}
  function provenance(ref,query={}){const row=resolve(ref,query);return row?Object.freeze({pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title}):null;}
  function snapshot(){return {version:VERSION,count:registry.size,preferences:[...preferences].map(([family,version])=>({family,version})),algorithms:list().map(row=>({id:row.id,version:row.version,category:row.category,owner:row.owner,default:row.default,inputTypes:[...row.inputTypes],outputTypes:[...row.outputTypes]}))};}
  function createScope(owner){const o=clean(owner)||'plugin';return Object.freeze({version:VERSION,owner:o,register:(id,spec)=>register(o,id,spec),unregister:(id,version,category)=>unregister(o,id,version,category),list,resolve,versions,diagnose,lock,run,provenance,preferred,setPreferred,clearPreferred,snapshot});}
  window.DKDSScientificAlgorithms=Object.freeze({VERSION,register,unregister,removeOwner,list,resolve,versions,diagnose,lock,run,provenance,preferred,setPreferred,clearPreferred,snapshot,createScope,compareVersion,normalizeRef});
})();
