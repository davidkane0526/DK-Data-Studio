(() => {
  if(window.DKDSScientificPipeline)return;
  const VERSION='1.0.0';
  const registry=new Map();
  const ownerIndex=new Map();
  const stats=new Map();
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};
  const safeArray=value=>Array.isArray(value)?value:(value===undefined||value===null?[]:[value]);
  const stable=value=>{if(value===null||value===undefined)return String(value);if(typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;};
  const hash=value=>window.DKDSData?.hashString?.(stable(value))||stable(value);
  function stageKey(owner,id){return `${String(owner||'plugin')}::${String(id||'').trim()}`;}
  function metric(key){if(!stats.has(key))stats.set(key,{key,runs:0,failures:0,publishes:0,lastMs:0,totalMs:0});return stats.get(key);}
  function typeOf(value,dataTypes){
    const direct=String(value?.semanticType||value?.dataType||value?.metadata?.dataType||'').trim();
    if(direct)return dataTypes?.get?.(direct)?.id||direct;
    const inferred=dataTypes?.infer?.(value);if(inferred?.id)return inferred.id;
    return String(value?.kind||'');
  }
  function validateInput(row,input,context){
    const accepted=row.inputTypes||[],kinds=row.inputKinds||[];const values=safeArray(input).filter(v=>v!==undefined&&v!==null);if(!values.length&&row.allowEmptyInput)return true;
    for(const value of values){
      if(kinds.length&&!kinds.includes(String(value?.kind||'')))throw new Error(`${row.id}: input kind ${value?.kind||'(unknown)'} is not accepted; expected ${kinds.join(', ')}`);
      if(accepted.length){const actual=typeOf(value,context.dataTypes);if(!actual||!accepted.some(type=>context.dataTypes?.accepts?.(actual,[type])||actual===type))throw new Error(`${row.id}: input type ${actual||'(unknown)'} is not accepted; expected ${accepted.join(', ')}`);}
    }
    return true;
  }
  function validateOutput(row,result,context){
    for(let index=0;index<(result.artifacts||[]).length;index++){
      const artifact=result.artifacts[index],expectedType=row.outputTypes?.[Math.min(index,row.outputTypes.length-1)]||row.outputTypes?.[0]||'',actualType=typeOf(artifact,context.dataTypes);
      if(row.outputKinds?.length&&!row.outputKinds.includes(String(artifact?.kind||'')))throw new Error(`${row.id}: output kind ${artifact?.kind||'(unknown)'} is not declared; expected ${row.outputKinds.join(', ')}`);
      if(expectedType&&actualType&&!(context.dataTypes?.accepts?.(actualType,[expectedType])||actualType===expectedType))throw new Error(`${row.id}: output type ${actualType} is not compatible with ${expectedType}`);
    }
    return result;
  }
  function sourceIds(input){return safeArray(input).map(v=>v?.id).filter(Boolean).map(String);}
  function revisionKey(row,input,parameters,context){
    if(typeof context.revision==='function')return String(context.revision(input,parameters,row));
    if(context.revision!==undefined)return String(context.revision);
    const parts=[];
    for(const value of safeArray(input)){
      if(value?.id){const fingerprint=context.artifacts?.fingerprint?.(value.id);parts.push(`${value.id}:${fingerprint||hash(value)}`);}
      else parts.push(hash(value));
    }
    if(!parts.length&&row.inputKinds?.length)for(const kind of row.inputKinds)parts.push(`${kind}:${context.artifacts?.revision?.(kind)||0}`);
    return parts.join('|')||'0';
  }
  function normalizeArtifact(row,artifact,index,input,parameters,context){
    if(!artifact||typeof artifact!=='object')return artifact;
    const out=clone(artifact);const outputType=row.outputTypes?.[Math.min(index,row.outputTypes.length-1)]||row.outputTypes?.[0]||'';
    if(outputType&&!out.semanticType)out.semanticType=outputType;
    const parentIds=sourceIds(input);
    const lineage=out.lineage&&typeof out.lineage==='object'?clone(out.lineage):{};
    lineage.parents=[...new Set([...(lineage.parents||[]),...parentIds].filter(Boolean).map(String))];
    lineage.role=String(lineage.role||row.kind||'derived');lineage.producer=String(lineage.producer||row.owner);lineage.operation=String(lineage.operation||row.id);lineage.parameters={...(lineage.parameters||{}),...clone(parameters||{})};out.lineage=lineage;
    const provenance=Array.isArray(out.provenance)?out.provenance.slice():[];
    const step=window.DKDSData?.provenanceStep?.({type:row.kind||'process',label:row.title||row.id,providerId:row.id,pluginId:row.owner,version:row.version,parameters:clone(parameters||{}),inputs:parentIds,outputs:out.id?[String(out.id)]:[]})||null;
    if(step&&!provenance.some(p=>p?.providerId===row.id&&stable(p?.parameters||{})===stable(parameters||{})&&stable(p?.inputs||[])===stable(parentIds)))provenance.push(step);
    out.provenance=provenance;
    out.metadata={...(out.metadata||{}),pipeline:{stageId:row.id,owner:row.owner,version:row.version,outputType:outputType||typeOf(out,context.dataTypes)}};
    return out;
  }
  function normalizeResult(row,raw,input,parameters,context){
    const envelope=raw&&typeof raw==='object'&&!Array.isArray(raw)&&('artifacts' in raw||'value' in raw||'selection' in raw||'viewModel' in raw)?raw:{artifacts:raw};
    const artifacts=safeArray(envelope.artifacts).filter(v=>v&&typeof v==='object'&&v.id&&v.kind).map((artifact,index)=>normalizeArtifact(row,artifact,index,input,parameters,context));
    const selection=typeof row.selection==='function'?row.selection({artifacts,value:envelope.value,raw:envelope,input,parameters},{...context,stage:row}):envelope.selection;
    const viewModel=typeof row.project==='function'?row.project({artifacts,value:envelope.value,raw:envelope,input,parameters},{...context,stage:row}):envelope.viewModel;
    return validateOutput(row,{stage:row,artifacts,value:envelope.value??(artifacts.length===1?artifacts[0]:artifacts),selection:selection??null,viewModel:viewModel??null,metadata:clone(envelope.metadata||{})},context);
  }
  function publishResult(result,context){
    if(context.publish===false||!result.artifacts?.length||!context.artifacts)return result;
    const publishOne=(api,artifact)=>api.publish?.(artifact,context.publishOptions||{})??api.upsert?.(artifact);
    if(context.artifacts.batch)context.artifacts.batch(api=>result.artifacts.forEach(artifact=>publishOne(api,artifact)));else result.artifacts.forEach(artifact=>publishOne(context.artifacts,artifact));
    metric(result.stage.key).publishes+=result.artifacts.length;return result;
  }
  function register(owner,id,spec={}){
    const o=String(owner||'plugin'),name=String(id||'').trim();if(!name)throw new Error('Scientific pipeline stage id required.');const key=stageKey(o,name);const existing=registry.get(key);if(existing&&existing.owner!==o)throw new Error(`Scientific pipeline stage ${name} already belongs to ${existing.owner}.`);
    const execution=String(spec.execution|| (spec.async?'async':'sync')).toLowerCase();if(!['sync','async'].includes(execution))throw new Error(`Scientific pipeline stage ${name} has invalid execution mode: ${execution}`);
    const row=Object.freeze({key,id:name,owner:o,title:String(spec.title||name),version:String(spec.version||'1.0.0'),kind:String(spec.kind||'transform'),execution,inputTypes:Object.freeze(safeArray(spec.inputTypes||spec.inputType).map(String).filter(Boolean)),outputTypes:Object.freeze(safeArray(spec.outputTypes||spec.outputType).map(String).filter(Boolean)),inputKinds:Object.freeze(safeArray(spec.inputKinds).map(String).filter(Boolean)),outputKinds:Object.freeze(safeArray(spec.outputKinds).map(String).filter(Boolean)),parameterSchema:spec.parameterSchema||null,allowEmptyInput:!!spec.allowEmptyInput,publish:spec.publish!==false,cache:spec.cache!==false,cacheLimit:Math.max(1,Number(spec.cacheLimit)||8),run:spec.run,selection:spec.selection,project:spec.project,metadata:Object.freeze({...spec.metadata})});
    if(typeof row.run!=='function')throw new Error(`Scientific pipeline stage ${name} requires run().`);registry.set(key,row);if(!ownerIndex.has(o))ownerIndex.set(o,new Set());ownerIndex.get(o).add(key);return row;
  }
  function unregister(owner,id){const key=stageKey(owner,id);if(!registry.has(key))return false;registry.delete(key);ownerIndex.get(String(owner||''))?.delete(key);stats.delete(key);return true;}
  function removeOwner(owner){const o=String(owner||'');for(const key of [...(ownerIndex.get(o)||[])]){registry.delete(key);stats.delete(key);}ownerIndex.delete(o);}
  function get(owner,id){return registry.get(stageKey(owner,id))||null;}
  function list(query={}){const q=typeof query==='string'?{owner:query}:query||{};return [...registry.values()].filter(row=>(!q.owner||row.owner===q.owner)&&(!q.kind||row.kind===q.kind)&&(!q.inputType||row.inputTypes.some(type=>type===q.inputType))&&(!q.outputType||row.outputTypes.some(type=>type===q.outputType)));}
  async function execute(owner,id,input,options={}){
    const row=get(owner,id);if(!row)throw new Error(`Scientific pipeline stage not found: ${owner}/${id}`);const context={...options,dataTypes:options.dataTypes||null,artifacts:options.artifacts||null,performance:options.performance||null,publish:options.publish??row.publish};validateInput(row,input,context);
    const parameters=clone(options.parameters||{}),revision=revisionKey(row,input,parameters,context),parameterKey=hash(parameters),m=metric(row.key),started=globalThis.performance?.now?.()??Date.now();m.runs+=1;
    const compute=async()=>normalizeResult(row,await row.run(input,{...context,parameters,revision,stage:row}),input,parameters,context);
    try{
      let result;
      if(row.cache&&row.execution!=='async'&&context.performance?.stage)result=await context.performance.stage(`pipeline.${row.id}`,revision,parameterKey,compute,{limit:row.cacheLimit});else result=await compute();
      publishResult(result,context);
      if(options.selectionModel&&result.selection){const items=safeArray(result.selection);options.selectionModel.replace?.(items,{reason:'pipeline',stageId:row.id,source:row.owner});}
      return result;
    }catch(err){m.failures+=1;throw err;}finally{const elapsed=Math.max(0,(globalThis.performance?.now?.()??Date.now())-started);m.lastMs=elapsed;m.totalMs+=elapsed;}
  }

  function executeSync(owner,id,input,options={}){
    const row=get(owner,id);if(!row)throw new Error(`Scientific pipeline stage not found: ${owner}/${id}`);if(row.execution==='async')throw new Error(`${row.id}: async stage cannot be used with runSync().`);const context={...options,dataTypes:options.dataTypes||null,artifacts:options.artifacts||null,performance:options.performance||null,publish:options.publish??row.publish};validateInput(row,input,context);
    const parameters=clone(options.parameters||{}),revision=revisionKey(row,input,parameters,context),parameterKey=hash(parameters),m=metric(row.key),started=globalThis.performance?.now?.()??Date.now();m.runs+=1;
    const compute=()=>{const raw=row.run(input,{...context,parameters,revision,stage:row});if(raw&&typeof raw.then==='function')throw new Error(`${row.id}: async result cannot be used with runSync().`);return normalizeResult(row,raw,input,parameters,context);};
    try{
      const result=row.cache&&context.performance?.stage?context.performance.stage(`pipeline.${row.id}`,revision,parameterKey,compute,{limit:row.cacheLimit}):compute();
      if(result&&typeof result.then==='function')throw new Error(`${row.id}: async cache result cannot be used with runSync().`);
      publishResult(result,context);
      if(options.selectionModel&&result.selection){const items=safeArray(result.selection);options.selectionModel.replace?.(items,{reason:'pipeline',stageId:row.id,source:row.owner});}
      return result;
    }catch(err){m.failures+=1;throw err;}finally{const elapsed=Math.max(0,(globalThis.performance?.now?.()??Date.now())-started);m.lastMs=elapsed;m.totalMs+=elapsed;}
  }

  async function runPlan(owner,plan,input,options={}){
    const steps=safeArray(plan);let current=input;const results=[];
    for(const step of steps){const id=typeof step==='string'?step:step.id;const result=await execute(owner,id,current,{...options,...(typeof step==='object'?step.options||{}:{}),parameters:typeof step==='object'?(step.parameters||{}):{}});results.push(result);current=result.artifacts.length===1?result.artifacts[0]:result.artifacts;}
    return {input,output:current,results};
  }
  function snapshot(owner=''){const prefix=String(owner||'');const stages=list(prefix?{owner:prefix}:{}).map(row=>{const m=metric(row.key);return {id:row.id,owner:row.owner,kind:row.kind,inputTypes:[...row.inputTypes],outputTypes:[...row.outputTypes],runs:m.runs,failures:m.failures,publishes:m.publishes,lastMs:Number(m.lastMs.toFixed(3)),totalMs:Number(m.totalMs.toFixed(3))};});return {version:VERSION,owner:prefix,stages};}
  function createScope(owner){const o=String(owner||'plugin');return Object.freeze({version:VERSION,owner:o,register:(id,spec)=>register(o,id,spec),unregister:id=>unregister(o,id),get:id=>get(o,id),list:q=>list({...((q&&typeof q==='object')?q:{}),owner:o}),run:(id,input,options)=>execute(o,id,input,options),runSync:(id,input,options)=>executeSync(o,id,input,options),runPlan:(plan,input,options)=>runPlan(o,plan,input,options),snapshot:()=>snapshot(o)});}
  window.DKDSScientificPipeline=Object.freeze({VERSION,createScope,register,unregister,removeOwner,get,list,execute,executeSync,runPlan,snapshot,typeOf});
})();
