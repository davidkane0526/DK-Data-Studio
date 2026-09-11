(() => {
  if(globalThis.DKDSTasks)return;
  const VERSION='1.1.0';
  const MOBILE_LIMIT=1, DESKTOP_MIN=2, DESKTOP_MAX=4;
  const owners=new Map(), ownerUrls=new Map(), queue=[], running=new Map(), latestByKey=new Map(), history=[];
  const WORKER_RUNNER_SOURCE=`'use strict';
let cancelled=false;
self.onmessage=async event=>{
  const msg=event?.data||{};
  if(msg.type==='cancel'){cancelled=true;return;}
  if(msg.type!=='run')return;
  try{
    const task=self.DKDSTaskDefinition;
    if(!task||typeof task.run!=='function')throw new Error('Task module must define self.DKDSTaskDefinition.run(input, context).');
    const context=Object.freeze({taskId:String(msg.taskId||''),generation:Number(msg.generation)||0,isCancelled:()=>cancelled});
    const result=await task.run(msg.input,context);
    if(cancelled)return;
    self.postMessage({type:'result',result});
  }catch(err){if(!cancelled)self.postMessage({type:'error',error:err?.message||String(err),stack:err?.stack||''});}
};`;
  let seq=0,generationSeq=0;
  const hostKind=()=>String(document?.documentElement?.dataset?.dkdsHost||globalThis.__DKDS_HOST_KIND__||'desktop').toLowerCase()==='mobile'?'mobile':'desktop';
  const hardware=()=>Math.max(1,Math.floor(Number(globalThis.navigator?.hardwareConcurrency)||2));
  const memory=()=>{const n=Number(globalThis.navigator?.deviceMemory);return Number.isFinite(n)&&n>0?n:null;};
  function concurrencyLimit(){
    if(hostKind()==='mobile')return MOBILE_LIMIT;
    const hc=hardware(),mem=memory();
    const cpuCap=Math.max(DESKTOP_MIN,Math.min(DESKTOP_MAX,Math.floor(hc/2)||DESKTOP_MIN));
    const memoryCap=mem===null?3:mem<=4?2:mem<12?3:4;
    return Math.max(DESKTOP_MIN,Math.min(cpuCap,memoryCap,DESKTOP_MAX));
  }
  function note(task,state,error=''){task.state=state;task.updatedAt=Date.now();if(error)task.lastError=String(error||'');history.push({id:task.id,owner:task.owner,task:task.task,key:task.key,state,error:task.lastError||'',updatedAt:task.updatedAt});if(history.length>200)history.splice(0,history.length-200);}
  function normalizeDefinitions(owner,definitions=[]){
    const map=new Map(),urls=[];
    for(const row of Array.isArray(definitions)?definitions:[]){
      const id=String(row?.id||'').trim(),entry=String(row?.entry||'').trim();if(!id||!entry)continue;
      if(typeof row?.source!=='string')throw new Error(`Task source bytes are required by the current runtime: ${owner}/${id}`);
      const chunks=[];
      for(const item of Array.isArray(row?.preludeSources)?row.preludeSources:[]){if(typeof item?.source==='string'&&item.source)chunks.push(`/* core-task-source:${String(item.file||'')} */\n${item.source}`);}
      for(const rel of Array.isArray(row?.imports)?row.imports:[]){const key=String(rel||'').trim();if(!key)continue;const text=row?.importSources?.[key];if(typeof text!=='string')throw new Error(`Task import source bytes are required by the current runtime: ${owner}/${id}:${key}`);chunks.push(`/* task-import:${key} */\n${text}`);}
      chunks.push(`/* task-entry:${entry} */\n${row.source}`);
      chunks.push(WORKER_RUNNER_SOURCE);
      const workerUrl=URL.createObjectURL(new Blob([chunks.join('\n')],{type:'text/javascript'}));urls.push(workerUrl);
      map.set(id,Object.freeze({id,entry,workerUrl,sourceCount:chunks.length-1}));
    }
    ownerUrls.set(owner,urls);return map;
  }
  function registerOwner(owner,definitions,baseUrl){owner=String(owner||'').trim();if(!owner)throw new Error('Task owner is required.');disposeOwner(owner);owners.set(owner,normalizeDefinitions(owner,definitions,baseUrl));return ()=>disposeOwner(owner);}
  function cancellationError(reason='cancelled'){const err=new Error(`Task cancelled: ${reason}`);err.name='AbortError';return err;}
  function cancelTask(task,reason='cancelled'){
    if(!task||['completed','failed','cancelled'].includes(task.state))return false;
    task.cancelReason=String(reason||'cancelled');note(task,'cancelled');
    const idx=queue.indexOf(task);if(idx>=0)queue.splice(idx,1);
    const active=running.get(task.id);if(active){try{active.worker.terminate();}catch{}running.delete(task.id);}
    task.reject(cancellationError(task.cancelReason));pump();return true;
  }
  function disposeOwner(owner){owner=String(owner||'');owners.delete(owner);for(const url of ownerUrls.get(owner)||[]){try{URL.revokeObjectURL(url);}catch{}}ownerUrls.delete(owner);for(const task of [...queue,...running.values()].map(x=>x.task||x).filter(t=>t.owner===owner))cancelTask(task,'owner-disposed');for(const [key,id] of latestByKey)if(key.startsWith(`${owner}::`))latestByKey.delete(key);}
  function pump(){
    const limit=concurrencyLimit();
    while(running.size<limit&&queue.length){
      const task=queue.shift();if(!task||task.state==='cancelled')continue;
      const defs=owners.get(task.owner),def=defs?.get(task.task);if(!def){note(task,'failed','task-not-declared');task.reject(new Error(`Task is not declared by ${task.owner}: ${task.task}`));continue;}
      let worker;try{worker=new Worker(def.workerUrl,{name:`dkds:${task.owner}:${task.task}`});}catch(err){note(task,'failed',err?.message||err);task.reject(err);continue;}
      running.set(task.id,{task,worker});note(task,'running');
      worker.onmessage=event=>{
        const msg=event?.data||{};if(!running.has(task.id))return;
        const latest=latestByKey.get(task.latestKey);const stale=task.latest&&latest!==task.id;
        try{worker.terminate();}catch{}running.delete(task.id);
        if(stale){note(task,'cancelled');task.reject(cancellationError('stale-generation'));pump();return;}
        if(msg.type==='error'){const err=new Error(msg.error||'Task failed.');if(msg.stack)err.stack=msg.stack;note(task,'failed',err.message);task.reject(err);pump();return;}
        if(msg.type==='result'){
          note(task,'completed');
          try{if(typeof task.publish==='function')task.publish(msg.result,Object.freeze({id:task.id,generation:task.generation,key:task.key}));task.resolve(msg.result);}catch(err){note(task,'failed',err?.message||err);task.reject(err);}
          pump();
        }
      };
      worker.onerror=event=>{if(!running.has(task.id))return;try{worker.terminate();}catch{}running.delete(task.id);const err=new Error(event?.message||'Worker task failed.');note(task,'failed',err.message);task.reject(err);pump();};
      try{worker.postMessage({type:'run',taskId:task.task,generation:task.generation,input:task.input});}
      catch(err){try{worker.terminate();}catch{}running.delete(task.id);note(task,'failed',err?.message||err);task.reject(err);pump();}
    }
  }
  function submit(owner,taskId,input,options={}){
    owner=String(owner||'').trim();taskId=String(taskId||'').trim();const defs=owners.get(owner);if(!defs?.has(taskId))throw new Error(`Task is not declared by ${owner}: ${taskId}`);
    const key=String(options.key||taskId),latest=options.latest!==false,latestKey=`${owner}::${key}`;
    const suppliedGeneration=Number(options.generation);
    const generation=Number.isFinite(suppliedGeneration)&&suppliedGeneration>0?suppliedGeneration:++generationSeq;
    const id=`task-${Date.now().toString(36)}-${(++seq).toString(36)}`;
    let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});
    const task={id,owner,task:taskId,key,latestKey,generation,input,publish:options.publish,latest,state:'queued',createdAt:Date.now(),updatedAt:Date.now(),resolve,reject,cancelReason:'',lastError:''};
    if(latest){const previous=latestByKey.get(latestKey);latestByKey.set(latestKey,id);if(previous){const old=queue.find(x=>x.id===previous)||running.get(previous)?.task;if(old)cancelTask(old,'superseded');}}
    queue.push(task);note(task,'queued');pump();
    return Object.freeze({id,generation,get state(){return task.state;},promise,cancel:reason=>cancelTask(task,reason||'caller')});
  }
  function createScope(owner,definitions,baseUrl){registerOwner(owner,definitions,baseUrl);return Object.freeze({version:VERSION,submit:(task,input,options)=>submit(owner,task,input,options),cancelAll:reason=>{let n=0;for(const row of [...queue,...[...running.values()].map(x=>x.task)])if(row.owner===owner&&cancelTask(row,reason||'scope-cancel'))n++;return n;},snapshot:()=>snapshot(owner),dispose:()=>disposeOwner(owner)});}
  function snapshot(owner=''){const filter=t=>!owner||t.owner===owner;return Object.freeze({version:VERSION,host:hostKind(),limit:concurrencyLimit(),hardwareConcurrency:hardware(),deviceMemory:memory(),queued:queue.filter(filter).length,running:[...running.values()].map(x=>x.task).filter(filter).length,recent:history.filter(filter).slice(-40)});}
  globalThis.DKDSTasks=Object.freeze({version:VERSION,createScope,registerOwner,disposeOwner,submit,snapshot,concurrencyLimit});
})();
