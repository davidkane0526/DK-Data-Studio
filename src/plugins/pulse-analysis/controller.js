(() => {
  function create(ctx,options={}){
    const selection=ctx.ui.selection.channel('pulse:selection',null);
    const service=options.service||ctx.host?.pulse;
    if(!service)throw new Error('Pulse analysis service is unavailable.');
    const listeners=new Set();
    const api={
      id:'builtin.pulse-analysis',service,selection,
      getSelection:()=>selection.get(),
      select(value,meta={}){selection.set(value,meta);for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;},
      clearSelection(meta={}){return selection.clear(meta);},
      subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
      command(name,...args){const fn=service?.[name];if(typeof fn!=='function')throw new Error(`Pulse command is unavailable: ${name}`);return fn.apply(service,args);},
      getState(){return service?.getState?.()||{};},
      render(){return service?.render?.();},
      serialize(){return service?.serialize?.();},
      restore(...args){return service?.restore?.(...args);},
      reset(...args){return service?.reset?.(...args);},
      dispose(){listeners.clear();selection.clear({reason:'dispose'});}
    };
    return new Proxy(api,{get(target,prop,receiver){
      if(Reflect.has(target,prop))return Reflect.get(target,prop,receiver);
      const value=service?.[prop];return typeof value==='function'?value.bind(service):value;
    }});
  }
  window.DKDSPulseController=Object.freeze({create});
})();
