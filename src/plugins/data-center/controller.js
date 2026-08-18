(() => {
  function create(ctx,options={}){
    const D=ctx.data.model;
    const selection=ctx.ui.selection.channel('data-center:selection',null);
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
      select(value,meta={}){selection.set(value,meta);for(const fn of [...listeners])try{fn(value,meta);}catch{}return value;},
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
  window.DKDSDataCenterController=Object.freeze({create});
})();
