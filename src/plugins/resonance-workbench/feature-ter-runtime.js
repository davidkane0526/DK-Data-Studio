(() => {
  function create({tasks,getWorkspace,getSweeps,peakLabel,onResolved,onError=console.warn}){
    let revision=0;
    const cache=new Map(),jobs=new Map();
    let waveDirty=false;
    function keyFor(label,visibleIds){
      const ids=[...(visibleIds||[])].map(String).sort(),visible=new Set(ids),workspace=getWorkspace?.()||{};
      const peakKey=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visible.has(String(p.sweepId))&&peakLabel(p)===String(label)).map(p=>[p.id,p.sweepId,p.v,p.i,p.vg,p.direction,p.peakOrder,p.peakLabel].join(':')).join('|');
      return `${revision}::${String(label)}::${ids.join(',')}::${peakKey}`;
    }
    function get(label,visibleIds=[]){
      const key=keyFor(label,visibleIds);
      if(cache.has(key))return cache.get(key);
      if(!jobs.has(key)&&tasks?.submit){
        const ids=[...(visibleIds||[])].map(String).sort(),workspace=getWorkspace?.()||{};
        const job=tasks.submit('resonant-ter',{peaks:workspace.peaks||[],sweeps:getSweeps?.()||[],label:String(label),visibleSweepIds:ids},{key:`resonant-ter:${String(label)}`,latest:true});
        jobs.set(key,job);
        job.promise.then(value=>{cache.set(key,Array.isArray(value)?value:[]);waveDirty=true;}).catch(err=>{if(err?.name!=='AbortError')onError?.('[resonance resonant TER task]',err);}).finally(()=>{jobs.delete(key);if(!jobs.size&&waveDirty){waveDirty=false;onResolved?.();}});
      }
      return [];
    }
    function invalidate(){revision+=1;cache.clear();waveDirty=false;for(const job of jobs.values())job?.cancel?.('resonance-data-changed');jobs.clear();}
    function dispose(){waveDirty=false;for(const job of jobs.values())job?.cancel?.('resonance-feature-dispose');jobs.clear();cache.clear();}
    return Object.freeze({get,invalidate,dispose});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-ter-runtime',Object.freeze({create}));
})();
