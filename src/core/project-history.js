(() => {
  const VERSION='1.0.0';
  function noop(){}
  function create(options={}){
    const limit=Math.max(1,Number(options.limit)||80);
    const past=[],future=[],listeners=new Set();
    let applying=false;
    const emit=(reason,entry=null)=>{const snapshot=api.snapshot();for(const fn of listeners){try{fn(snapshot,{reason,entry});}catch(err){console.error('[DKDS project history]',err);}}};
    const normalize=entry=>{
      if(!entry||typeof entry!=='object')throw new Error('History entry must be an object.');
      if(typeof entry.undo!=='function'||typeof entry.redo!=='function')throw new Error('History entry requires undo() and redo().');
      return {id:String(entry.id||`history:${Date.now()}:${Math.random().toString(36).slice(2,8)}`),label:String(entry.label||'项目修改'),undo:entry.undo,redo:entry.redo,metadata:entry.metadata&&typeof entry.metadata==='object'?entry.metadata:{},createdAt:Date.now()};
    };
    const run=async(direction)=>{
      const source=direction==='undo'?past:future,target=direction==='undo'?future:past;
      if(applying||!source.length)return false;
      const entry=source.pop();applying=true;
      try{
        const result=await Promise.resolve(direction==='undo'?entry.undo():entry.redo());
        if(result===false){source.push(entry);return false;}
        target.push(entry);if(target.length>limit)target.splice(0,target.length-limit);emit(direction,entry);return true;
      }catch(err){source.push(entry);throw err;}
      finally{applying=false;}
    };
    const api={
      version:VERSION,
      record(entry){if(applying)return false;const row=normalize(entry);past.push(row);if(past.length>limit)past.splice(0,past.length-limit);future.length=0;emit('record',row);return row.id;},
      undo:()=>run('undo'),
      redo:()=>run('redo'),
      canUndo:()=>past.length>0,
      canRedo:()=>future.length>0,
      clear(reason='clear'){past.length=0;future.length=0;emit(reason);return true;},
      isApplying:()=>applying,
      snapshot:()=>({version:VERSION,canUndo:past.length>0,canRedo:future.length>0,past:past.map(row=>({id:row.id,label:row.label,metadata:row.metadata,createdAt:row.createdAt})),future:future.map(row=>({id:row.id,label:row.label,metadata:row.metadata,createdAt:row.createdAt})),undoLabel:past.at(-1)?.label||'',redoLabel:future.at(-1)?.label||''}),
      subscribe(fn,{immediate=false}={}){if(typeof fn!=='function')return noop;listeners.add(fn);if(immediate)fn(api.snapshot(),{reason:'subscribe'});return()=>listeners.delete(fn);}
    };
    return Object.freeze(api);
  }
  window.DKDSProjectHistory=Object.freeze({VERSION,create});
})();
