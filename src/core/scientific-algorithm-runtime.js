(() => {
  if (window.DKDSScientificAlgorithms) return;
  const VERSION='1.0.0';
  const registry=new Map();
  const ownerIndex=new Map();
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const arr=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  const clean=value=>String(value||'').trim();
  const semver=value=>clean(value).split(/[.-]/).slice(0,3).map(v=>Number(v)||0);
  const compareVersion=(a,b)=>{const av=semver(a),bv=semver(b);for(let i=0;i<3;i++){if(av[i]!==bv[i])return av[i]-bv[i];}return clean(a).localeCompare(clean(b));};
  const keyOf=(category,id,version)=>`${clean(category)}::${clean(id)}@${clean(version)}`;
  const normalizeRef=(ref,query={})=>{
    if(ref&&typeof ref==='object')return {id:clean(ref.id||ref.algorithmId),version:clean(ref.version||ref.algorithmVersion),category:clean(ref.category||query.category)};
    const text=clean(ref);const at=text.lastIndexOf('@');
    return at>0?{id:text.slice(0,at),version:text.slice(at+1),category:clean(query.category)}:{id:text,version:'',category:clean(query.category)};
  };
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
  function resolve(ref,query={}){
    const wanted=normalizeRef(ref,query);const candidates=[...registry.values()].filter(row=>(!wanted.category||row.category===wanted.category)&&(!wanted.id||row.id===wanted.id)&&(!wanted.version||row.version===wanted.version)&&(!query.owner||row.owner===clean(query.owner)));
    candidates.sort((a,b)=>(Number(b.default)-Number(a.default))||(b.priority-a.priority)||compareVersion(b.version,a.version));return descriptor(candidates[0]||null);
  }
  function getRow(ref,query={}){const d=resolve(ref,query);return d?registry.get(keyOf(d.category,d.id,d.version))||null:null;}
  function run(ref,input,options={}){const row=getRow(ref,options);if(!row)throw new Error(`Scientific algorithm unavailable: ${typeof ref==='string'?ref:JSON.stringify(ref)}`);return row.run(input,{...options,algorithm:descriptor(row),parameters:clone(options.parameters||{})});}
  function provenance(ref,query={}){const row=resolve(ref,query);return row?Object.freeze({pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title}):null;}
  function snapshot(){return {version:VERSION,count:registry.size,algorithms:list().map(row=>({id:row.id,version:row.version,category:row.category,owner:row.owner,default:row.default,inputTypes:[...row.inputTypes],outputTypes:[...row.outputTypes]}))};}
  function createScope(owner){const o=clean(owner)||'plugin';return Object.freeze({version:VERSION,owner:o,register:(id,spec)=>register(o,id,spec),unregister:(id,version,category)=>unregister(o,id,version,category),list,resolve,run,provenance,snapshot});}
  window.DKDSScientificAlgorithms=Object.freeze({VERSION,register,unregister,removeOwner,list,resolve,run,provenance,snapshot,createScope,compareVersion,normalizeRef});
})();
