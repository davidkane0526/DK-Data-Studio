(() => {
  function create(spec={}){
    const listeners=new Set();
    const clone=value=>{
      if(value===undefined)return undefined;
      try{return structuredClone(value);}catch{}
      return JSON.parse(JSON.stringify(value));
    };
    const notify=(reason='state',detail=null)=>{
      const event=Object.freeze({type:'domain',reason:String(reason||'state'),detail:clone(detail)});
      for(const fn of [...listeners])try{fn(event);}catch{}
      return event;
    };
    const subscribe=fn=>{
      if(typeof fn!=='function')return()=>{};
      listeners.add(fn);
      return()=>listeners.delete(fn);
    };
    const snapshot=()=>clone(spec.snapshot?.()||{});
    const actions={};
    for(const [id,handler] of Object.entries(spec.actions&&typeof spec.actions==='object'?spec.actions:{})){
      if(typeof handler!=='function')continue;
      actions[id]=payload=>{
        const result=handler(clone(payload));
        if(result&&typeof result.then==='function')return result.then(value=>{notify(`action:${id}`,payload);return value;});
        notify(`action:${id}`,payload);
        return result;
      };
    }
    return Object.freeze({snapshot,subscribe,notify,actions:Object.freeze(actions)});
  }
  window.DKDSPluginModules.define('com.dkds.transfer-vth-lab','live-domain',Object.freeze({create}));
})();
