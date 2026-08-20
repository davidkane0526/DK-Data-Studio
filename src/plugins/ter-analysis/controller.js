(() => {
  function create(ctx,options={}){
    for(const [id,spec] of [
      ['ter.matrix-point',{title:'TER 矩阵点',parents:['data.point','science.ter.value'],kind:'result',key:v=>v?.id||`${v?.vg??''}:${v?.vd??''}`,selection:v=>({id:v?.id,ref:{vg:v?.vg,vd:v?.vd},value:{id:v?.id,vg:v?.vg,vd:v?.vd,ter:v?.ter,value:v?.value,axis:v?.axis}})}],
      ['ter.max-point',{title:'TER 极值点',parent:'ter.matrix-point',kind:'result',key:v=>v?.id||`${v?.axis||''}:${v?.vg??''}:${v?.vd??''}`,selection:v=>({id:v?.id,ref:{axis:v?.axis,vg:v?.vg,vd:v?.vd},value:{id:v?.id,axis:v?.axis,vg:v?.vg,vd:v?.vd,ter:v?.ter,value:v?.value}})}],
      ['ter.rv-point',{title:'R–V 联动点',parents:['data.point','science.transport.resistance'],kind:'result',key:v=>v?.id||`${v?.vg??''}:${v?.vd??''}:${v?.direction??''}`,selection:v=>({id:v?.id,ref:{vg:v?.vg,vd:v?.vd,direction:v?.direction},value:{id:v?.id,vg:v?.vg,vd:v?.vd,direction:v?.direction,r:v?.r,value:v?.value}})}],
      ['ter.matrix-result',{title:'TER 矩阵结果',parents:['result.analysis','science.ter.matrix'],kind:'result',key:v=>v?.id||'ter-matrix',selection:v=>({id:v?.id||'ter-matrix',ref:{resultId:v?.id||'ter-matrix'},value:{id:v?.id||'ter-matrix',rows:v?.rows??v?.matrix?.length,cols:v?.cols??v?.matrix?.[0]?.length}})}]
    ]){if(!ctx.data.types.get(id))ctx.data.types.register(id,spec);}
    const interaction=ctx.ui.interaction?.create?.('ter',{selection:{multiple:true,defaultType:'ter.matrix-point'},defaultType:'ter.matrix-point'});const selection=interaction?.selection||ctx.ui.selection.model('ter:selection',{multiple:true,defaultType:'ter.matrix-point'});
    const service=options.service||ctx.services?.get?.('ter');
    if(!service)throw new Error('TER service is unavailable.');
    const listeners=new Set();
    const api={
      id:'builtin.ter-analysis',service,interaction,selection,
      getSelection:()=>selection.get(),
      select(value,meta={}){const type=String(value?.selectionType||value?.type||'ter.matrix-point');const id=String(value?.id||`${value?.vg??''}:${value?.vd??''}:${value?.axis||''}`);selection.select({type,id,value},{...meta,source:meta.source||'ter'});for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;},
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
    // so views never need to reach into ctx.services directly.
    return new Proxy(api,{get(target,prop,receiver){
      if(Reflect.has(target,prop))return Reflect.get(target,prop,receiver);
      const value=service?.[prop];return typeof value==='function'?value.bind(service):value;
    }});
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','controller',Object.freeze({create}));
})();
