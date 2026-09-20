(() => {
  if(globalThis.DKDSTasks)return;
  const VERSION='1.2.0';
  const MOBILE_LIMIT=1, DESKTOP_MIN=2, DESKTOP_MAX=4, PROGRESS_INTERVAL_MS=50;
  const owners=new Map(), ownerUrls=new Map(), queue=[], running=new Map(), latestByKey=new Map(), history=[];
  const WORKER_RUNNER_SOURCE=`'use strict';
let cancelled=false;
function normalizeProgress(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const out={};
  const fraction=Number(value.fraction);if(Number.isFinite(fraction))out.fraction=Math.max(0,Math.min(1,fraction));
  const stage=String(value.stage??'').trim();if(stage)out.stage=stage.slice(0,96);
  const label=String(value.label??'').trim();if(label)out.label=label.slice(0,160);
  const completed=Number(value.completed),total=Number(value.total);
  if(Number.isFinite(total)&&total>0)out.total=total;
  if(Number.isFinite(completed)&&completed>=0)out.completed=out.total===undefined?completed:Math.min(completed,out.total);
  if(out.fraction===undefined&&out.completed!==undefined&&out.total!==undefined)out.fraction=Math.max(0,Math.min(1,out.completed/out.total));
  return Object.keys(out).length?out:null;
}
self.onmessage=async event=>{
  const msg=event?.data||{};
  if(msg.type==='cancel'){cancelled=true;return;}
  if(msg.type!=='run')return;
  try{
    const task=self.DKDSTaskDefinition;
    if(!task||typeof task.run!=='function')throw new Error('Task module must define self.DKDSTaskDefinition.run(input, context).');
    const context=Object.freeze({
      taskId:String(msg.taskId||''),generation:Number(msg.generation)||0,isCancelled:()=>cancelled,
      reportProgress(value){
        if(cancelled)return false;
        const progress=normalizeProgress(value);if(!progress)return false;
        try{self.postMessage({type:'progress',progress});return true;}catch{return false;}
      }
    });
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
  function normalizeProgress(value){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const out={};
    const fraction=Number(value.fraction);if(Number.isFinite(fraction))out.fraction=Math.max(0,Math.min(1,fraction));
    const stage=String(value.stage??'').trim();if(stage)out.stage=stage.slice(0,96);
    const label=String(value.label??'').trim();if(label)out.label=label.slice(0,160);
    const completed=Number(value.completed),total=Number(value.total);
    if(Number.isFinite(total)&&total>0)out.total=total;
    if(Number.isFinite(completed)&&completed>=0)out.completed=out.total===undefined?completed:Math.min(completed,out.total);
    if(out.fraction===undefined&&out.completed!==undefined&&out.total!==undefined)out.fraction=Math.max(0,Math.min(1,out.completed/out.total));
    return Object.keys(out).length?Object.freeze(out):null;
  }
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
  function progressIsCurrent(task){return !!task&&task.state==='running'&&running.has(task.id)&&(!task.latest||latestByKey.get(task.latestKey)===task.id);}
  function deliverProgress(task){
    if(task.progressTimer){clearTimeout(task.progressTimer);task.progressTimer=null;}
    if(!progressIsCurrent(task)){task.pendingProgress=null;return false;}
    const progress=task.pendingProgress;if(!progress)return false;
    task.pendingProgress=null;task.progress=progress;task.progressDeliveredAt=Date.now();
    for(const listener of [...task.progressListeners]){try{listener(progress);}catch(err){console.error('[DKDS tasks progress]',err);}}
    return true;
  }
  function queueProgress(task,value){
    if(!progressIsCurrent(task))return false;
    const progress=normalizeProgress(value);if(!progress)return false;task.pendingProgress=progress;
    const elapsed=Date.now()-(task.progressDeliveredAt||0);
    if(!task.progressDeliveredAt||elapsed>=PROGRESS_INTERVAL_MS)return deliverProgress(task);
    if(!task.progressTimer)task.progressTimer=setTimeout(()=>{task.progressTimer=null;deliverProgress(task);},Math.max(0,PROGRESS_INTERVAL_MS-elapsed));
    return true;
  }
  function stopProgress(task,{flush=false,clearListeners=true}={}){
    if(!task)return;
    if(task.progressTimer){clearTimeout(task.progressTimer);task.progressTimer=null;}
    if(flush&&task.pendingProgress&&progressIsCurrent(task))deliverProgress(task);else task.pendingProgress=null;
    if(clearListeners)task.progressListeners?.clear?.();
  }
  function cancelTask(task,reason='cancelled'){
    if(!task||['completed','failed','cancelled'].includes(task.state))return false;
    task.cancelReason=String(reason||'cancelled');stopProgress(task);note(task,'cancelled');
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
        if(msg.type==='progress'){queueProgress(task,msg.progress);return;}
        const latest=latestByKey.get(task.latestKey),stale=task.latest&&latest!==task.id;
        if(stale){stopProgress(task);try{worker.terminate();}catch{}running.delete(task.id);note(task,'cancelled');task.reject(cancellationError('stale-generation'));pump();return;}
        if(msg.type==='error'){
          stopProgress(task);try{worker.terminate();}catch{}running.delete(task.id);const err=new Error(msg.error||'Task failed.');if(msg.stack)err.stack=msg.stack;note(task,'failed',err.message);task.reject(err);pump();return;
        }
        if(msg.type==='result'){
          stopProgress(task,{flush:true,clearListeners:false});try{worker.terminate();}catch{}running.delete(task.id);note(task,'completed');
          try{if(typeof task.publish==='function')task.publish(msg.result,Object.freeze({id:task.id,generation:task.generation,key:task.key}));task.resolve(msg.result);}catch(err){note(task,'failed',err?.message||err);task.reject(err);}finally{task.progressListeners.clear();}
          pump();
        }
      };
      worker.onerror=event=>{if(!running.has(task.id))return;stopProgress(task);try{worker.terminate();}catch{}running.delete(task.id);const err=new Error(event?.message||'Worker task failed.');note(task,'failed',err.message);task.reject(err);pump();};
      try{worker.postMessage({type:'run',taskId:task.task,generation:task.generation,input:task.input});}
      catch(err){stopProgress(task);try{worker.terminate();}catch{}running.delete(task.id);note(task,'failed',err?.message||err);task.reject(err);pump();}
    }
  }
  function submit(owner,taskId,input,options={}){
    owner=String(owner||'').trim();taskId=String(taskId||'').trim();const defs=owners.get(owner);if(!defs?.has(taskId))throw new Error(`Task is not declared by ${owner}: ${taskId}`);
    const key=String(options.key||taskId),latest=options.latest!==false,latestKey=`${owner}::${key}`;
    const suppliedGeneration=Number(options.generation);
    const generation=Number.isFinite(suppliedGeneration)&&suppliedGeneration>0?suppliedGeneration:++generationSeq;
    const id=`task-${Date.now().toString(36)}-${(++seq).toString(36)}`;
    let resolve,reject;const promise=new Promise((res,rej)=>{resolve=res;reject=rej;});
    const task={id,owner,task:taskId,key,latestKey,generation,input,publish:options.publish,latest,state:'queued',createdAt:Date.now(),updatedAt:Date.now(),resolve,reject,cancelReason:'',lastError:'',progress:null,pendingProgress:null,progressDeliveredAt:0,progressTimer:null,progressListeners:new Set()};
    if(latest){const previous=latestByKey.get(latestKey);latestByKey.set(latestKey,id);if(previous){const old=queue.find(x=>x.id===previous)||running.get(previous)?.task;if(old)cancelTask(old,'superseded');}}
    queue.push(task);note(task,'queued');pump();
    return Object.freeze({id,generation,get state(){return task.state;},get progress(){return task.progress;},promise,cancel:reason=>cancelTask(task,reason||'caller'),onProgress:listener=>{if(typeof listener!=='function')throw new TypeError('Task progress listener must be a function.');if(['completed','failed','cancelled'].includes(task.state))return()=>{};task.progressListeners.add(listener);return()=>task.progressListeners.delete(listener);}});
  }
  function createScope(owner,definitions,baseUrl){registerOwner(owner,definitions,baseUrl);return Object.freeze({version:VERSION,submit:(task,input,options)=>submit(owner,task,input,options),cancelAll:reason=>{let n=0;for(const row of [...queue,...[...running.values()].map(x=>x.task)])if(row.owner===owner&&cancelTask(row,reason||'scope-cancel'))n++;return n;},snapshot:()=>snapshot(owner),dispose:()=>disposeOwner(owner)});}
  function snapshot(owner=''){const filter=t=>!owner||t.owner===owner;return Object.freeze({version:VERSION,host:hostKind(),limit:concurrencyLimit(),hardwareConcurrency:hardware(),deviceMemory:memory(),queued:queue.filter(filter).length,running:[...running.values()].map(x=>x.task).filter(filter).length,recent:history.filter(filter).slice(-40)});}
  globalThis.DKDSTasks=Object.freeze({version:VERSION,createScope,registerOwner,disposeOwner,submit,snapshot,concurrencyLimit});
})();
