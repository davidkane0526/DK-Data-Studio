(() => {
  const VERSION='2.0.0';
  function noop(){}
  function create(options={}){
    const limit=Math.max(1,Number(options.limit)||100);
    const past=[],future=[],listeners=new Set();
    let applying=false,revision=0,lastError='';
    const publicRow=row=>row?({id:row.id,label:row.label,scope:row.scope,source:row.source,metadata:row.metadata,createdAt:row.createdAt,updatedAt:row.updatedAt,sequence:row.sequence}):null;
    const emit=(reason,entry=null)=>{revision+=1;const snapshot=api.snapshot();for(const fn of listeners){try{fn(snapshot,{reason,entry:publicRow(entry)});}catch(err){console.error('[DKDS project history]',err);}}};
    const normalize=entry=>{
      if(!entry||typeof entry!=='object')throw new Error('History entry must be an object.');
      if(typeof entry.undo!=='function'||typeof entry.redo!=='function')throw new Error('History entry requires undo() and redo().');
      const now=Date.now();
      return {
        id:String(entry.id||`history:${now}:${Math.random().toString(36).slice(2,8)}`),
        label:String(entry.label||'项目修改'),
        scope:String(entry.scope||entry.metadata?.scope||'project'),
        source:String(entry.source||entry.metadata?.source||'core'),
        undo:entry.undo,redo:entry.redo,
        metadata:entry.metadata&&typeof entry.metadata==='object'?{...entry.metadata}:{},
        createdAt:Number(entry.createdAt)||now,updatedAt:now,sequence:revision+1
      };
    };
    const trim=rows=>{if(rows.length>limit)rows.splice(0,rows.length-limit);};
    const run=async(direction)=>{
      const source=direction==='undo'?past:future,target=direction==='undo'?future:past;
      if(applying||!source.length)return false;
      const entry=source[source.length-1];applying=true;lastError='';emit(`${direction}:start`,entry);
      try{
        const result=await Promise.resolve(direction==='undo'?entry.undo():entry.redo());
        if(result===false){emit(`${direction}:rejected`,entry);return false;}
        source.pop();entry.updatedAt=Date.now();target.push(entry);trim(target);emit(direction,entry);return true;
      }catch(err){lastError=String(err?.message||err||'History operation failed.');emit(`${direction}:error`,entry);throw err;}
      finally{applying=false;emit(`${direction}:settled`,entry);}
    };
    const api={
      version:VERSION,
      record(entry){
        if(applying)return false;
        const row=normalize(entry);past.push(row);trim(past);future.length=0;lastError='';emit('record',row);return row.id;
      },
      undo:()=>run('undo'),redo:()=>run('redo'),
      canUndo:()=>!applying&&past.length>0,canRedo:()=>!applying&&future.length>0,
      clear(reason='clear'){if(applying)return false;past.length=0;future.length=0;lastError='';emit(reason);return true;},
      isApplying:()=>applying,
      snapshot:()=>({
        version:VERSION,revision,limit,applying,lastError,
        canUndo:!applying&&past.length>0,canRedo:!applying&&future.length>0,
        past:past.map(publicRow),future:future.map(publicRow),
        undoLabel:past.at(-1)?.label||'',redoLabel:future.at(-1)?.label||'',
        undoEntry:publicRow(past.at(-1)),redoEntry:publicRow(future.at(-1))
      }),
      subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return noop;listeners.add(fn);if(immediate)fn(api.snapshot(),{reason:'subscribe',entry:null});return()=>listeners.delete(fn);}
    };
    return Object.freeze(api);
  }
  window.DKDSProjectHistory=Object.freeze({VERSION,create});
})();
