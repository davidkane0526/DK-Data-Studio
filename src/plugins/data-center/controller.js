(() => {
  function create(ctx,options={}){
    const D=ctx.data.model,refs=ctx.ui.selection.refs;
    const entityRef=(id,extra={})=>refs.normalize({entityId:String(id||''),...extra});
    const artifactRef=(id,extra={})=>refs.artifact(String(id||''),{extra});
    for(const [id,spec] of [
      ['data-center.artifact',{title:'数据对象',parent:'data.artifact',kind:'data',key:v=>v?.id||v?.path||v?.name,selection:v=>{const id=v?.id||v?.path||v?.name;return {id,ref:v?.id?artifactRef(v.id):entityRef(id,{path:v?.path||''}),meta:{label:v?.name||id}};}}],
      ['data-center.table',{title:'数据表',parents:['data-center.artifact','data.series'],kind:'data',key:v=>v?.id||v?.name,selection:v=>{const id=v?.id||v?.name;return {id,ref:v?.id?artifactRef(v.id):entityRef(id),meta:{label:v?.name||id}};}}],
      ['data-center.column',{title:'数据列',parent:'data.series',kind:'data',key:v=>v?.id||`${v?.tableId||''}:${v?.name||''}`,selection:v=>{const id=v?.id||`${v?.tableId||''}:${v?.name||''}`,artifactId=v?.tableId||v?.artifactId,seriesId=v?.id||v?.key||v?.name;return {id,ref:artifactId&&seriesId?refs.series(artifactId,seriesId,{extra:{columnId:String(seriesId)}}):entityRef(id,{columnId:String(seriesId||'')}),meta:{label:v?.name||seriesId||id,unit:v?.unit||'',role:v?.role||''}};}}],
      ['data-center.derived-column',{title:'公式派生列',parents:['data-center.column','result.analysis'],kind:'result',key:v=>v?.id||`${v?.tableId||''}:${v?.name||''}`,selection:v=>{const id=v?.id||`${v?.tableId||''}:${v?.name||''}`,artifactId=v?.tableId||v?.artifactId,seriesId=v?.id||v?.key||v?.name;return {id,ref:artifactId&&seriesId?refs.series(artifactId,seriesId,{extra:{columnId:String(seriesId)}}):entityRef(id,{columnId:String(seriesId||'')}),meta:{label:v?.name||seriesId||id,unit:v?.unit||'',role:v?.role||''}};}}],
      ['data-center.workflow-result',{title:'工作流结果',parent:'result.analysis',kind:'result',key:v=>v?.id||v?.artifactId,selection:v=>{const artifactId=v?.artifactId||v?.id;return {id:artifactId,ref:artifactRef(artifactId),meta:{label:v?.name||artifactId}};}}]
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
      id:'builtin.data-center',interaction,selection,store,
      getState:()=>store.get(),snapshot:()=>store.snapshot(),
      update(mutator,meta={}){return store.update(mutator,meta);},
      patch(delta,meta={}){return store.patch(delta,meta);},
      getSelection:()=>selection.get(),
      select(value,meta={}){
        const type=String(meta.type||value?.selectionType||value?.type||'data-center.artifact');
        const id=String(value?.id||value?.artifactId||value?.path||value?.name||'');if(!id)throw new Error(`Data Center selection requires a stable id for ${type}.`);
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
