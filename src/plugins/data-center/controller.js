(() => {
  function create(ctx,options={}){
    const D=ctx.data.model;
    for(const [id,spec] of [
      ['data-center.artifact',{title:'数据对象',parent:'data.artifact',kind:'data',key:v=>v?.id||v?.path||v?.name,selection:v=>({id:v?.id||v?.path||v?.name,ref:{artifactId:v?.id||''},value:{id:v?.id,kind:v?.kind,name:v?.name,rowCount:v?.rowCount,columnCount:v?.columns?.length}})}],
      ['data-center.table',{title:'数据表',parents:['data-center.artifact','data.series'],kind:'data',key:v=>v?.id||v?.name,selection:v=>({id:v?.id||v?.name,ref:{artifactId:v?.id||''},value:{id:v?.id,kind:v?.kind||'data.table',name:v?.name,rowCount:v?.rowCount,columnCount:v?.columns?.length,columns:(v?.columns||[]).map(c=>({key:c.key,name:c.name,unit:c.unit,role:c.role}))}})}],
      ['data-center.column',{title:'数据列',parent:'data.series',kind:'data',key:v=>v?.id||`${v?.tableId||''}:${v?.name||''}`,selection:v=>({id:v?.id||`${v?.tableId||''}:${v?.name||''}`,ref:{artifactId:v?.tableId||v?.artifactId||'',column:v?.key||v?.name||''},value:{id:v?.id,tableId:v?.tableId,key:v?.key,name:v?.name,unit:v?.unit,role:v?.role}})}],
      ['data-center.derived-column',{title:'公式派生列',parents:['data-center.column','result.analysis'],kind:'result',key:v=>v?.id||`${v?.tableId||''}:${v?.name||''}`,selection:v=>({id:v?.id||`${v?.tableId||''}:${v?.name||''}`,ref:{artifactId:v?.tableId||v?.artifactId||'',column:v?.key||v?.name||''},value:{id:v?.id,tableId:v?.tableId,key:v?.key,name:v?.name,unit:v?.unit,role:v?.role,formula:v?.formula}})}],
      ['data-center.workflow-result',{title:'工作流结果',parent:'result.analysis',kind:'result',key:v=>v?.id||v?.artifactId,selection:v=>({id:v?.id||v?.artifactId,ref:{artifactId:v?.artifactId||v?.id||''},value:{id:v?.id,artifactId:v?.artifactId,name:v?.name,kind:v?.kind,summary:v?.summary}})}]
    ])if(!ctx.data.types.get(id))ctx.data.types.register(id,spec);
    const interaction=ctx.ui.interaction?.create?.('data-center',{selection:{multiple:true,defaultType:'data-center.artifact'},defaultType:'data-center.artifact'});const selection=interaction?.selection||ctx.ui.selection.model('data-center:selection',{multiple:true,defaultType:'data-center.artifact'});
    const listeners=new Set();
    const initialState={schema:1,activeArtifactId:null,recipeName:'我的工作流',steps:[],savedRecipes:[],chart:{provider:'xy-line',parameters:{mode:'lines+markers'}}};
    const store=ctx.state.create(initialState,{
      projectSlice:'workspace',
      migrate(data){
        const d=data&&typeof data==='object'?data:{};
        return {schema:1,activeArtifactId:d.activeArtifactId||null,recipeName:d.recipeName||'我的工作流',steps:D.deepClone(d.steps||[]),savedRecipes:D.deepClone(d.savedRecipes||[]),chart:D.deepClone(d.chart||initialState.chart)};
      },
      serialize(value){return {schema:1,activeArtifactId:value.activeArtifactId,recipeName:value.recipeName,steps:D.deepClone(value.steps),savedRecipes:D.deepClone(value.savedRecipes),chart:D.deepClone(value.chart)};}
    });
    const api={
      id:'builtin.data-center',selection,store,
      getState:()=>store.get(),snapshot:()=>store.snapshot(),
      update(mutator,meta={}){return store.update(mutator,meta);},
      patch(delta,meta={}){return store.patch(delta,meta);},
      getSelection:()=>selection.get(),
      select(value,meta={}){
        const type=String(meta.type||value?.selectionType||value?.type||'data-center.artifact');
        const id=String(value?.id||value?.artifactId||value?.path||value?.name||`${type}:${Date.now()}`);
        selection.select({type,id,value},{...meta,source:meta.source||'data-center'});
        for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;
      },
      clearSelection(meta={}){return selection.clear(meta);},
      subscribe(fn,options={}){
        if(typeof fn!=='function')return()=>{};
        const offState=store.subscribe((value,meta)=>fn({state:value,selection:selection.get()},meta,api),options);
        listeners.add(fn);
        return ()=>{offState?.();listeners.delete(fn);};
      },
      dispose(){listeners.clear();selection.clear({reason:'dispose'});}
    };
    return api;
  }
  window.DKDSPluginModules.define('builtin.data-center','controller',Object.freeze({create}));
})();
