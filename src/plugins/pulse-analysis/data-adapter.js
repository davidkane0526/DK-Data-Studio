(() => {
  function dataColumns(artifact){
    return (Array.isArray(artifact?.columns)?artifact.columns:[]).filter(column=>
      column?.key!=='sourceLine'&&String(column?.role||'')!=='index'
    );
  }

  function hasFiniteNumericData(artifact){
    if(artifact?.kind!=='data.table')return false;
    for(const column of dataColumns(artifact)){
      const values=column?.values;
      if(!values||typeof values.length!=='number')continue;
      const limit=Math.min(Number(values.length)||0,128);
      for(let index=0;index<limit;index++){
        const value=values[index];
        if(value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value)))return true;
      }
    }
    return false;
  }

  function isPulseSemantic(artifact){
    return String(artifact?.semanticType||'')==='science.pulse.trace'||
      String(artifact?.metadata?.sourceFormat||'')==='pulse-text';
  }

  function projectArtifact(artifact){
    if(!artifact||artifact.kind!=='data.table')return null;
    if(isPulseSemantic(artifact))return artifact;
    if(!hasFiniteNumericData(artifact))return null;
    return {
      ...artifact,
      semanticType:'science.pulse.trace',
      metadata:{
        ...(artifact.metadata||{}),
        pulseInputProjection:{
          kind:'assigned-data-table',
          sourceSemanticType:String(artifact.semanticType||'data.table')
        }
      }
    };
  }

  function create(artifacts){
    if(!artifacts)return artifacts;
    return Object.freeze({
      list(options={}){
        const rows=artifacts.list?.(options)||[];
        return rows.map(projectArtifact).filter(Boolean);
      },
      get(id){
        return projectArtifact(artifacts.get?.(id)||null);
      }
    });
  }

  window.DKDSPluginModules.define('builtin.pulse-analysis','data-adapter',Object.freeze({create}));
})();
