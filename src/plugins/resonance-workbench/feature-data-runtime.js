(() => {
  // Owns source-table materialization and the lightweight long-lived dataset
  // catalog. The Artifact Store remains the canonical owner of full columns.
  function parse({artifacts,dataModel}){
    if(!artifacts?.list||!dataModel?.transportDatasetsFromArtifacts)return [];
    return dataModel.transportDatasetsFromArtifacts(
      artifacts.list({kind:'data.table',includeTransient:true})||[],
      {consumer:'builtin.resonance-workbench'}
    );
  }
  function withWorkspaceMeta(rows=[],workspace={}){
    const meta=new Map((workspace.datasetMeta||[]).map(row=>[String(row?.path||''),row]));
    for(const dataset of rows||[]){
      const row=meta.get(String(dataset?.path||''));
      if(!row)continue;
      const value=row.vg;
      if(value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value)))dataset.vg=Number(value);
    }
    return rows;
  }
  function materialize({artifacts,dataModel,workspace}){
    return withWorkspaceMeta(parse({artifacts,dataModel}),workspace||{});
  }
  function catalog(rows=[]){
    return (rows||[]).map(dataset=>{
      if(!dataset||typeof dataset!=='object')return dataset;
      const {points:_points,...metadata}=dataset;
      return metadata;
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-data-runtime',Object.freeze({parse,withWorkspaceMeta,materialize,catalog}));
})();
