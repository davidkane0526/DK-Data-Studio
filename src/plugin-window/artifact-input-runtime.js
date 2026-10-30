(() => {
  if(window.DKDSPluginWindowArtifactInputs)return;

  function assignmentScoped(artifacts,manifest={},pluginId=''){
    if(!artifacts)return artifacts;
    const pluginType=String(manifest?.pluginType||'').trim().toLowerCase();
    const visibility=String(manifest?.data?.visibility||'').trim().toLowerCase();
    if(pluginType!=='workbench'||visibility==='project')return artifacts;
    const visible=artifact=>{
      if(!artifact)return false;
      const raw=artifact?.metadata?.dataAssignments;
      if(!Array.isArray(raw))return true;
      const rows=raw.map(String);
      return rows.includes('*')||rows.includes(String(pluginId||''));
    };
    return new Proxy(artifacts,{get(target,prop,receiver){
      if(prop==='list')return options=>(target.list?.(options)||[]).filter(visible);
      if(prop==='listMetadata')return options=>(target.listMetadata?.(options)||[]).filter(visible);
      if(prop==='get')return id=>{const row=target.get?.(id)||null;return visible(row)?row:null;};
      const value=Reflect.get(target,prop,receiver);
      return typeof value==='function'?value.bind(target):value;
    }});
  }

  function resolve({artifacts,manifest={},pluginId='',modules=window.DKDSPluginModules}={}){
    const scoped=assignmentScoped(artifacts,manifest,pluginId);
    const adapterId=String(manifest?.data?.adapter||'').trim();
    const adapter=adapterId?modules?.get?.(String(pluginId||''),adapterId):null;
    return adapter?.create?.(scoped)||scoped;
  }

  window.DKDSPluginWindowArtifactInputs=Object.freeze({resolve});
})();
