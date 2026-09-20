(() => {
  function create(spec={}){
    const D=spec.model,artifactsStore=spec.artifacts;
    if(!D||!artifactsStore)throw new Error('Data Center domain runtime requires data model and Artifact Store.');
    const clone=value=>D.deepClone?D.deepClone(value):structuredClone(value);
    const listeners=new Set();const notify=(reason='state',detail=null)=>{const event={type:'domain',reason:String(reason||'state'),detail};for(const fn of [...listeners])try{fn(event);}catch{}return event;};const subscribe=fn=>{if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn);};
    const artifactRow=a=>{
      if(!a)return null;const sum=D.summarize(a);return {id:String(a.id||''),name:String(a.name||a.id||''),kind:String(a.kind||''),artifactRevision:Number(a.artifactRevision)||0,rowCount:Number(a.rowCount)||0,provenanceCount:Number(a.provenanceCount??sum?.provenance)||0,excluded:!!spec.isExcluded?.(a),assignments:spec.artifactAssignments?.(a)||null,usage:String(spec.assignmentSummary?.(a)||''),origin:String(spec.artifactOrigin?.(a)||''),fields:spec.artifactFields?.(a)||[],summary:sum};
    };
    const preview=meta=>{
      if(!meta)return null;
      if(meta.kind==='data.table'){
        const columns=artifactsStore.columnMetadata(meta.id)||[],n=Math.min(Number(meta.rowCount)||0,18),ranges=n?columns.map(column=>artifactsStore.readColumnRange(meta.id,column.id,{start:0,limit:n})):columns.map(()=>null);
        const rows=Array.from({length:n},(_,index)=>{const row={__index:index+1};for(let c=0;c<columns.length;c++){const key=String(columns[c]?.id||columns[c]?.key||columns[c]?.name||`column-${c}`);row[key]=ranges[c]?.values?.[index];}return row;});
        return {kind:'table',artifactId:String(meta.id),totalRows:Number(meta.rowCount)||0,rows,columns:columns.map((column,index)=>({id:String(column?.id||column?.key||column?.name||`column-${index}`),name:String(column?.name||column?.key||column?.id||`column-${index}`),unit:String(column?.unit||''),role:String(column?.role||'')}))};
      }
      const artifact=spec.activeArtifact?.();
      if(artifact?.kind==='result.analysis'){
        const table=artifact.tables?.[0],raw=Array.isArray(table?.rows)?table.rows:[],rows=raw.slice(0,18),keys=rows.length?Object.keys(rows[0]):[];
        return {kind:'analysis-table',artifactId:String(meta.id),totalRows:raw.length,columns:keys.map(key=>({id:String(key),name:String(key),unit:'',role:''})),rows:clone(rows),summary:clone(artifact.summary||{})};
      }
      return {kind:'summary',artifactId:String(meta.id),totalRows:0,columns:[],rows:[],summary:clone(D.summarize(artifact||meta))};
    };
    const snapshot=()=>{
      const state=spec.getState?.()||{},meta=spec.activeMeta?.()||null,artifact=spec.activeArtifact?.()||null,output=spec.currentOutputArtifact?.()||null,providerRows=spec.chartProviders?.()||[],filters=spec.getFilters?.()||{};
      const formulaState=spec.formulaState?.()||{},workflowStatus=spec.getWorkflowStatus?.()||{state:'idle',text:'尚未运行。'},providerOptions=spec.workflowProviderOptions?.()||{processors:[],analyzers:[]};
      return {schema:1,state:clone(state),view:{activeTool:String(spec.getActiveTool?.()||'formula')},filters:{assignment:String(filters.assignment||'all'),lineage:String(filters.lineage||'all'),field:String(filters.field||'')},filterOptions:{assignmentTargets:(spec.assignmentTargets?.()||[]).map(row=>({id:String(row.id),label:String(row.label||row.name||row.id),icon:String(row.icon||'')})),fields:(spec.availableFields?.()||[]).map(row=>({field:String(row.field||row),count:Number(row.count)||1}))},multiSelectMode:!!spec.getMultiSelect?.(),artifacts:(spec.visibleArtifacts?.()||[]).map(artifactRow).filter(Boolean),active:meta?{...artifactRow(meta),preview:preview(meta)}:null,selection:spec.controller?.getSelection?.()||null,formula:{enabled:artifact?.kind==='data.table',refs:Array.isArray(formulaState.refs)?clone(formulaState.refs):[],value:formulaState.value?clone(formulaState.value):null,lastOutputArtifactId:String(spec.lastExecution?.()?.outputs?.result?.id||'')},workflow:{recipeName:String(state.recipeName||''),steps:(state.steps||[]).map(step=>clone(spec.workflowStepView?.(step)||step)),savedRecipes:clone(state.savedRecipes||[]),providerOptions:clone(providerOptions),status:{state:String(workflowStatus.state||'idle'),text:String(workflowStatus.text||'')},lastExecution:spec.lastExecution?.()?{id:String(spec.lastExecution()?.id||''),status:String(spec.lastExecution()?.status||'done'),outputArtifactId:String(output?.id||'')}:null},provenance:clone(artifact?.provenance||[]),chart:{provider:String(state.chart?.provider||''),parameters:clone(state.chart?.parameters||{}),providers:providerRows.map(row=>({id:String(row.id),name:String(row.name||row.id),inputKinds:Array.isArray(row.inputKinds)?row.inputKinds.map(String):[]})),artifactId:String(output?.id||''),artifactRevision:Number(output?.artifactRevision)||0}};
    };
    const action=(id,payload)=>{const fn=spec.actions?.[id];if(typeof fn!=='function')throw new Error(`Data Center domain action unavailable: ${id}`);const result=fn(payload);if(result&&typeof result.then==='function')return result.then(value=>{notify(`action:${id}`,payload);return value;});notify(`action:${id}`,payload);return result;};
    const actions=Object.freeze({
      refresh:p=>action('refresh',p),setFilters:p=>action('setFilters',p),setMultiSelect:p=>action('setMultiSelect',p),activateArtifact:p=>action('activateArtifact',p),selectAll:p=>action('selectAll',p),invertSelection:p=>action('invertSelection',p),clearSelection:p=>action('clearSelection',p),toggleArtifactSelection:p=>action('toggleArtifactSelection',p),renameArtifact:p=>action('renameArtifact',p),setArtifactAssignments:p=>action('setArtifactAssignments',p),toggleAssignmentForArtifacts:p=>action('toggleAssignmentForArtifacts',p),setArtifactsExcluded:p=>action('setArtifactsExcluded',p),deleteArtifacts:p=>action('deleteArtifacts',p),exportActiveTableCsv:p=>action('exportActiveTableCsv',p),switchTab:p=>action('switchTab',p),setFormulaParameters:p=>action('setFormulaParameters',p),deriveFormula:p=>action('deriveFormula',p),setRecipeName:p=>action('setRecipeName',p),addStep:p=>action('addStep',p),setStepParameters:p=>action('setStepParameters',p),moveStep:p=>action('moveStep',p),removeStep:p=>action('removeStep',p),runWorkflow:p=>action('runWorkflow',p),saveRecipe:p=>action('saveRecipe',p),loadRecipe:p=>action('loadRecipe',p),copyProvenance:p=>action('copyProvenance',p),setChartProvider:p=>action('setChartProvider',p),setChartParameters:p=>action('setChartParameters',p)
    });
    return Object.freeze({snapshot,actions,subscribe,notify});
  }
  window.DKDSPluginModules.define('builtin.data-center','domain-runtime',Object.freeze({create}));
})();
