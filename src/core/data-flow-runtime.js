(() => {
  if(window.DKDSDataFlow)return;
  const VERSION='1.0.0';
  const registries=new Map([['importer',new Map()],['exporter',new Map()],['transformer',new Map()],['analyzer',new Map()]]);
  const ownerIndex=new Map();
  const kinds=new Set(registries.keys());
  function key(kind,id){return `${kind}:${id}`;}
  function register(owner,kind,id,spec={}){
    const o=String(owner||'plugin'),k=String(kind||''),name=String(id||'').trim();if(!kinds.has(k))throw new Error(`Unsupported data-flow kind: ${k}`);if(!name)throw new Error('Data-flow id required.');
    const reg=registries.get(k);const existing=reg.get(name);if(existing&&existing.owner!==o)throw new Error(`${k} ${name} already owned by ${existing.owner}.`);
    const row=Object.freeze({id:name,kind:k,owner:o,version:String(spec.version||'1.0.0'),title:String(spec.title||spec.name||name),inputKinds:[...(spec.inputKinds||[])],outputKinds:[...(spec.outputKinds||[])],extensions:[...(spec.extensions||[])],parameterSchema:spec.parameterSchema||null,metadata:{...(spec.metadata||{})},run:spec.run||spec.parse||spec.build||null,inspect:spec.inspect||null,serialize:spec.serialize||null});
    reg.set(name,row);if(!ownerIndex.has(o))ownerIndex.set(o,new Set());ownerIndex.get(o).add(key(k,name));return row;
  }
  function unregister(owner,kind,id){const reg=registries.get(String(kind||''));const row=reg?.get(String(id||''));if(!row||row.owner!==String(owner||''))return false;reg.delete(row.id);ownerIndex.get(row.owner)?.delete(key(row.kind,row.id));return true;}
  function removeOwner(owner){const o=String(owner||'');for(const token of [...(ownerIndex.get(o)||[])]){const i=token.indexOf(':');unregister(o,token.slice(0,i),token.slice(i+1));}ownerIndex.delete(o);}
  function list(kind,query={}){const rows=[...(registries.get(String(kind||''))?.values()||[])];return rows.filter(row=>(!query.owner||row.owner===query.owner)&&(!query.inputKind||!row.inputKinds.length||row.inputKinds.includes(query.inputKind))&&(!query.outputKind||!row.outputKinds.length||row.outputKinds.includes(query.outputKind)));}
  function get(kind,id){return registries.get(String(kind||''))?.get(String(id||''))||null;}
  async function run(kind,id,payload,context={}){const row=get(kind,id);if(!row)throw new Error(`Data-flow ${kind}/${id} not found.`);if(typeof row.run!=='function')throw new Error(`Data-flow ${kind}/${id} has no run() implementation.`);return row.run(payload,{...context,provider:row});}
  function createScope(owner){const o=String(owner||'plugin');const make=kind=>Object.freeze({register:(id,spec)=>register(o,kind,id,spec),list:q=>list(kind,q),get:id=>get(kind,id),run:(id,payload,ctx)=>run(kind,id,payload,ctx)});return Object.freeze({version:VERSION,owner:o,importers:make('importer'),exporters:make('exporter'),transformers:make('transformer'),analyzers:make('analyzer')});}
  window.DKDSDataFlow=Object.freeze({VERSION,createScope,register,unregister,removeOwner,list,get,run});
})();
