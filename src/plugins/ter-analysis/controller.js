(() => {
  function create(ctx,options={}){
    const refs=ctx.ui.selection.refs,entityRef=(id,extra={})=>refs.normalize({entityId:String(id||''),...extra});
    for(const [id,spec] of [
      ['ter.matrix-point',{title:'TER 矩阵点',parents:['data.point','science.ter.value'],kind:'result',key:v=>v?.id||`${v?.vg??''}:${v?.vd??''}`,selection:v=>{const id=v?.id||`${v?.vg??''}:${v?.vd??''}`;return {id,ref:entityRef(id,{vg:v?.vg,vd:v?.vd}),meta:{axis:v?.axis||''}};}}],
      ['ter.max-point',{title:'TER 极值点',parent:'ter.matrix-point',kind:'result',key:v=>v?.id||`${v?.axis||''}:${v?.vg??''}:${v?.vd??''}`,selection:v=>{const id=v?.id||`${v?.axis||''}:${v?.vg??''}:${v?.vd??''}`;return {id,ref:entityRef(id,{axis:v?.axis||'',vg:v?.vg,vd:v?.vd})};}}],
      ['ter.rv-point',{title:'R–V 联动点',parents:['data.point','science.transport.resistance'],kind:'result',key:v=>v?.id||`${v?.vg??''}:${v?.vd??''}:${v?.direction??''}`,selection:v=>{const id=v?.id||`${v?.vg??''}:${v?.vd??''}:${v?.direction??''}`;return {id,ref:entityRef(id,{vg:v?.vg,vd:v?.vd,direction:v?.direction})};}}],
      ['ter.matrix-result',{title:'TER 矩阵结果',parents:['result.analysis','science.ter.matrix'],kind:'result',key:v=>v?.id||'ter-matrix',selection:v=>{const id=v?.id||'ter-matrix',artifactId=v?.artifactId;return {id,ref:artifactId?refs.artifact(artifactId):entityRef(id,{resultId:id})};}}]
    ]){if(!ctx.data.types.get(id))ctx.data.types.register(id,spec);}
    const interaction=ctx.ui.interaction?.create?.('ter',{selection:{multiple:true,defaultType:'ter.matrix-point'},defaultType:'ter.matrix-point'});const selection=interaction?.selection||ctx.ui.selection.model('ter:selection',{multiple:true,defaultType:'ter.matrix-point'});
    const service=options.service;
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
