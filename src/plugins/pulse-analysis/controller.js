(() => {
  function create(ctx,options={}){
    for(const [id,spec] of [
      ['pulse.file',{title:'脉冲数据文件',parent:'data.artifact',kind:'data',key:v=>v?.id||v?.path||v?.name,selection:v=>({id:v?.id||v?.path||v?.name,ref:{fileId:v?.id||'',path:v?.path||''},value:{id:v?.id,name:v?.name,label:v?.label,path:v?.path,status:v?.status}})}],
      ['pulse.protocol',{title:'脉冲协议',parent:'core.entity',kind:'protocol',key:v=>v?.id||v?.name,selection:v=>({id:v?.id||v?.name,value:{id:v?.id,name:v?.name,mode:v?.mode}})}],
      ['pulse.read-point',{title:'读取电流点',parent:'data.point',kind:'result',key:v=>v?.id||`${v?.fileId||''}:${v?.index??''}:read`,selection:v=>({id:v?.id,ref:{fileId:v?.fileId,index:v?.index,series:'read'},value:{id:v?.id,fileId:v?.fileId,index:v?.index,x:v?.x,time:v?.time,current:v?.current,value:v?.value}})}],
      ['pulse.pulse-point',{title:'脉冲电流点',parent:'data.point',kind:'result',key:v=>v?.id||`${v?.fileId||''}:${v?.index??''}:pulse`,selection:v=>({id:v?.id,ref:{fileId:v?.fileId,index:v?.index,series:'pulse'},value:{id:v?.id,fileId:v?.fileId,index:v?.index,x:v?.x,time:v?.time,current:v?.current,value:v?.value}})}],
      ['pulse.analysis-result',{title:'脉冲分析结果',parent:'result.analysis',kind:'result',key:v=>v?.id||v?.fileId,selection:v=>({id:v?.id||v?.fileId,ref:{fileId:v?.fileId||v?.id},value:{id:v?.id,fileId:v?.fileId,label:v?.label,summary:v?.summary}})}]
    ])if(!ctx.data.types.get(id))ctx.data.types.register(id,spec);
    const interaction=ctx.ui.interaction?.create?.('pulse',{selection:{multiple:true,defaultType:'pulse.file'},defaultType:'pulse.file'});const selection=interaction?.selection||ctx.ui.selection.model('pulse:selection',{multiple:true,defaultType:'pulse.file'});
    const service=options.service||ctx.services?.get?.('pulse');
    if(!service)throw new Error('Pulse analysis service is unavailable.');
    const listeners=new Set();
    const api={
      id:'builtin.pulse-analysis',service,selection,
      getSelection:()=>selection.get(),
      select(value,meta={}){
        const type=String(meta.type||value?.selectionType||value?.type||'pulse.file');
        const id=String(value?.id||value?.fileId||value?.path||value?.name||`${type}:${Date.now()}`);
        selection.select({type,id,value},{...meta,source:meta.source||'pulse'});
        for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;
      },
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
  window.DKDSPluginModules.define('builtin.pulse-analysis','controller',Object.freeze({create}));
})();
