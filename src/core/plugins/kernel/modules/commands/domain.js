'use strict';

const clone=value=>{
  if(value===undefined)return undefined;
  try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return null;}}
};
const text=value=>String(value??'').trim();
const finite=value=>Number.isFinite(Number(value));

function validate(schema,value,path='$'){
  if(!schema||typeof schema!=='object')return value;
  if(Array.isArray(schema.enum)&&!schema.enum.some(item=>Object.is(item,value)))throw new Error(`${path} must be one of: ${schema.enum.join(', ')}`);
  const type=text(schema.type);
  if(type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${path} must be an object`);
    const props=schema.properties&&typeof schema.properties==='object'?schema.properties:{};
    for(const key of Array.isArray(schema.required)?schema.required:[])if(!(key in value))throw new Error(`${path}.${key} is required`);
    if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!(key in props))throw new Error(`${path}.${key} is not allowed`);
    for(const [key,sub] of Object.entries(props))if(key in value)validate(sub,value[key],`${path}.${key}`);
  }else if(type==='array'){
    if(!Array.isArray(value))throw new Error(`${path} must be an array`);
    if(finite(schema.minItems)&&value.length<Number(schema.minItems))throw new Error(`${path} must contain at least ${schema.minItems} items`);
    if(finite(schema.maxItems)&&value.length>Number(schema.maxItems))throw new Error(`${path} must contain at most ${schema.maxItems} items`);
    if(schema.items)for(let i=0;i<value.length;i++)validate(schema.items,value[i],`${path}[${i}]`);
  }else if(type==='string'){
    if(typeof value!=='string')throw new Error(`${path} must be a string`);
  }else if(type==='number'){
    if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`${path} must be a finite number`);
    if(finite(schema.minimum)&&value<Number(schema.minimum))throw new Error(`${path} must be >= ${schema.minimum}`);
    if(finite(schema.maximum)&&value>Number(schema.maximum))throw new Error(`${path} must be <= ${schema.maximum}`);
  }else if(type==='integer'){
    if(!Number.isInteger(value))throw new Error(`${path} must be an integer`);
    if(finite(schema.minimum)&&value<Number(schema.minimum))throw new Error(`${path} must be >= ${schema.minimum}`);
    if(finite(schema.maximum)&&value>Number(schema.maximum))throw new Error(`${path} must be <= ${schema.maximum}`);
  }else if(type==='boolean'&&typeof value!=='boolean')throw new Error(`${path} must be a boolean`);
  return value;
}

function normalizeRef(raw){
  if(typeof raw==='string')return {artifactId:text(raw)};
  if(raw&&typeof raw==='object')return {artifactId:text(raw.artifactId||raw.id),role:text(raw.role),label:text(raw.label)};
  return {artifactId:''};
}
function normalizeAlgorithm(raw){
  if(!raw)return null;
  const row=typeof raw==='string'?{id:raw}:raw;
  const id=text(row.id),version=text(row.version),category=text(row.category),provider=text(row.provider||row.owner||row.pluginId);
  if(!id)return null;
  return Object.freeze({category,id,version,provider});
}
function domainSpec(row){
  const raw=row?.meta?.domainCommand;
  if(raw===false)return null;
  const explicit=!!(raw&&typeof raw==='object');
  const spec=explicit?raw:{};
  return Object.freeze({
    explicit,
    domain:text(spec.domain||row?.meta?.domain)||'command',
    version:text(spec.version||row?.meta?.version)||'1.0.0',
    title:text(spec.title||row?.meta?.title)||text(row?.id),
    description:text(spec.description||row?.meta?.description),
    inputSchema:clone(spec.inputSchema||row?.meta?.inputSchema||{type:'object'}),
    replayable:spec.replayable===true,
    destructive:spec.destructive===true||row?.meta?.destructive===true,
    captureArgs:typeof spec.captureArgs==='function'?spec.captureArgs:null,
    inputs:typeof spec.inputs==='function'?spec.inputs:null,
    algorithm:typeof spec.algorithm==='function'?spec.algorithm:null,
    parameters:typeof spec.parameters==='function'?spec.parameters:null,
    outputs:typeof spec.outputs==='function'?spec.outputs:null,
    replayArgs:typeof spec.replayArgs==='function'?spec.replayArgs:null
  });
}

function createDomainCommandRuntime(options={}){
  const historyLimit=Math.max(8,Math.min(2048,Number(options.historyLimit)||256));
  const now=typeof options.clock==='function'?options.clock:()=>Date.now();
  const artifacts=()=>typeof options.artifacts==='function'?options.artifacts():options.artifacts||null;
  const records=[];let seq=0;
  const executionId=()=>`cmd-${Math.floor(now()).toString(36)}-${(++seq).toString(36)}`;
  const push=record=>{records.unshift(Object.freeze(record));if(records.length>historyLimit)records.length=historyLimit;return record;};
  const snapshotRef=(raw,access=null)=>{
    const ref=normalizeRef(raw),store=access||artifacts();if(!ref.artifactId)return null;
    if(typeof store?.visible==='function'&&!store.visible(ref.artifactId))throw new Error(`Artifact is not visible to the command owner: ${ref.artifactId}`);
    return Object.freeze({...ref,artifactRevision:Number(store?.artifactRevision?.(ref.artifactId))||0,fingerprint:text(store?.fingerprint?.(ref.artifactId))});
  };
  const outputRef=(raw,access=null)=>{
    const ref=snapshotRef(raw,access);return ref&&Object.freeze({...ref});
  };
  function describe(row){
    const spec=domainSpec(row);if(!spec?.explicit)return null;
    return Object.freeze({id:text(row?.id),pluginId:text(row?.pluginId),pluginVersion:text(row?.pluginVersion),domain:spec.domain,title:spec.title,description:spec.description,version:spec.version,replayable:spec.replayable,destructive:spec.destructive,inputSchema:clone(spec.inputSchema)});
  }
  async function execute(row,args={},context={}){
    if(!row||typeof row.handler!=='function')throw new Error('Invalid command registration.');
    const spec=domainSpec(row);if(!spec?.explicit)return await row.handler(args,context);
    const validatedArgs=clone(args)||{};validate(spec.inputSchema,validatedArgs);
    let safeArgs;try{safeArgs=context?.canonicalArgs===true?validatedArgs:(clone(spec.captureArgs?spec.captureArgs(validatedArgs,context):validatedArgs)||{});}catch(err){throw new Error(`Command argument capture failed: ${err.message}`);}
    const started=now(),id=executionId(),source=text(context.source)||'plugin';
    let inputs=[];try{inputs=(spec.inputs?spec.inputs(safeArgs,context):[]||[]).map(ref=>snapshotRef(ref,row.artifactAccess)).filter(Boolean);}catch(err){throw new Error(`Command input resolution failed: ${err.message}`);}
    let algorithm=null;try{algorithm=normalizeAlgorithm(spec.algorithm?spec.algorithm(safeArgs,context):null);}catch(err){throw new Error(`Command algorithm resolution failed: ${err.message}`);}
    if(spec.replayable&&algorithm?.id&&!algorithm.version)throw new Error(`Replayable command ${row.id} requires an exact algorithm version.`);
    let parameters;try{parameters=clone(spec.parameters?spec.parameters(safeArgs,context):(safeArgs.parameters&&typeof safeArgs.parameters==='object'?safeArgs.parameters:{}))||{};}catch(err){throw new Error(`Command parameter resolution failed: ${err.message}`);}
    const base={executionId:id,source,replayOf:text(context.replayOf)||null,command:Object.freeze({id:text(row.id),pluginId:text(row.pluginId),pluginVersion:text(row.pluginVersion),domain:spec.domain,title:spec.title,version:spec.version}),arguments:safeArgs,inputs:Object.freeze(inputs),algorithm,parameters,replayable:spec.replayable,destructive:spec.destructive,startedAt:started};
    try{
      const handlerArgs=spec.explicit?safeArgs:args;
      const value=await row.handler(handlerArgs,Object.freeze({executionId:id,source,record:()=>base}));
      let outputs=[];try{outputs=(spec.outputs?spec.outputs(value,safeArgs,context):[]||[]).map(ref=>outputRef(ref,row.artifactAccess)).filter(Boolean);}catch(err){throw new Error(`Command output resolution failed: ${err.message}`);}
      const ended=now();push({...base,status:'completed',outputs:Object.freeze(outputs),completedAt:ended,durationMs:Math.max(0,ended-started),error:null});return value;
    }catch(error){const ended=now();push({...base,status:context?.signal?.aborted?'cancelled':'failed',outputs:Object.freeze([]),completedAt:ended,durationMs:Math.max(0,ended-started),error:String(error?.message||error)});throw error;}
  }
  function history(query={}){
    const limit=Math.max(1,Math.min(historyLimit,Number(query.limit)||historyLimit));
    return records.filter(row=>(!query.commandId||row.command.id===query.commandId)&&(!query.pluginId||row.command.pluginId===query.pluginId)&&(!query.status||row.status===query.status)&&(!query.source||row.source===query.source)).slice(0,limit).map(row=>clone(row));
  }
  function getRecord(id){const row=records.find(item=>item.executionId===text(id));return row?clone(row):null;}
  async function replay(id,context={}){
    const original=records.find(item=>item.executionId===text(id));if(!original)throw new Error(`Command execution record not found: ${id}`);
    if(!original.replayable)throw new Error(`Command is not replayable: ${original.command.id}`);
    const resolve=options.resolveCommand;if(typeof resolve!=='function')throw new Error('Domain command replay resolver is unavailable.');
    if(context.requesterPluginId&&text(context.requesterPluginId)!==original.command.pluginId)throw new Error('Plugin command replay is limited to the owning plugin.');
    const row=resolve(original.command.id);if(!row)throw new Error(`Command not found for replay: ${original.command.id}`);
    const spec=domainSpec(row);if(!spec?.replayable)throw new Error(`Command no longer permits replay: ${original.command.id}`);
    if(spec.version!==original.command.version)throw new Error(`Command version changed: expected ${original.command.version}, current ${spec.version}`);
    const store=row.artifactAccess||artifacts();if(context.requireRevisions!==false)for(const input of original.inputs){if(typeof store?.visible==='function'&&!store.visible(input.artifactId))throw new Error(`Artifact is no longer visible to the command owner: ${input.artifactId}`);const current=Number(store?.artifactRevision?.(input.artifactId))||0;if(current!==Number(input.artifactRevision))throw new Error(`Artifact revision changed for ${input.artifactId}: expected ${input.artifactRevision}, current ${current}`);}
    const nextArgs=spec.replayArgs?spec.replayArgs(clone(original.arguments),clone(original),context):clone(original.arguments);
    return execute(row,nextArgs||{}, {...context,source:text(context.source)||'recipe',replayOf:original.executionId,canonicalArgs:true});
  }
  return Object.freeze({VERSION:'1.0.0',validate,describe,execute,history,get:getRecord,replay});
}

module.exports=Object.freeze({createDomainCommandRuntime,validate});
