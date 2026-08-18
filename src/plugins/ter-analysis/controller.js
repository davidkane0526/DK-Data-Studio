(() => {
  function create(ctx,options={}){
    const selection=ctx.ui.selection.channel('ter:selection',null);
    const service=options.service||ctx.host?.ter;
    if(!service)throw new Error('TER service is unavailable.');
    const listeners=new Set();
    const api={
      id:'builtin.ter-analysis',service,selection,
      getSelection:()=>selection.get(),
      select(value,meta={}){selection.set(value,meta);for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;},
      clearSelection(meta={}){return selection.clear(meta);},
      subscribe(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);},
      command(name,...args){const fn=service?.[name];if(typeof fn!=='function')throw new Error(`TER command is unavailable: ${name}`);return fn.apply(service,args);},
      getState(){return service?.getState?.()||{};},
      render(){return service?.render?.();},
      serialize(){return service?.serialize?.();},
      restore(...args){return service?.restore?.(...args);},
      reset(...args){return service?.reset?.(...args);},
      dispose(){listeners.clear();selection.clear({reason:'dispose'});}
    };
    // Keep the feature runtime independent from whichever host implements the
    // TER engine. Unknown domain commands are forwarded through the Controller,
    // so views never need to reach into ctx.host.ter directly.
    return new Proxy(api,{get(target,prop,receiver){
      if(Reflect.has(target,prop))return Reflect.get(target,prop,receiver);
      const value=service?.[prop];return typeof value==='function'?value.bind(service):value;
    }});
  }
  window.DKDSTERController=Object.freeze({create});
})();
