(() => {
  // Resonance feature runtime: all functional rendering/event binding lives here.
  // Keep every runtime helper local to this module. During the v3.31 shared
  // View/Controller extraction these helpers were accidentally left behind in
  // the old dedicated-window closure, which made the plugin fail at first use
  // with `clone is not defined`. SUPER and TOP now execute the exact same
  // explicit helper prelude.
  const Shared=window.DKDSPluginModules.require('builtin.resonance-workbench','workbench-shared');
  const S=window.DKDSScience;
  const D=window.DKDSData;
  const FeatureContext=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-context');
  const GroupRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-group-runtime');
  const AnalysisRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-analysis-runtime');
  const PeakRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-peak-runtime');
  const SelectionRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-selection-runtime');
  const InspectorRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-inspector-runtime');
  const MainPlotRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-main-plot-runtime');
  const ControlsRuntime=window.DKDSPluginModules.require('builtin.resonance-workbench','feature-controls-runtime');
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';
  const csvCell=value=>{const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
  const fmt=(value,digits=5)=>{const n=Number(value);if(!Number.isFinite(n))return '—';if(Math.abs(n)>=1e4||(Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);return n.toFixed(digits);};
  if(!Shared)throw new Error('Resonance shared workbench layer is unavailable.');
  if(!S)throw new Error('Resonance science runtime is unavailable.');
  if(!FeatureContext||!GroupRuntime||!AnalysisRuntime||!PeakRuntime||!SelectionRuntime||!InspectorRuntime||!MainPlotRuntime||!ControlsRuntime)throw new Error('Resonance feature sub-runtimes are unavailable.');
  // SUPER/TOP adapters are intentionally limited to container/lifecycle mapping.
  async function mountSuper(ctx,controller,adapter={}){
    const views=window.DKDSPluginModules.get('builtin.resonance-workbench','view-components');
    if(!views?.mountUnified)throw new Error('Resonance unified View runtime is unavailable.');
    return views.mountUnified(ctx,controller,{mode:'super',adapter});
  }

  const defaultWorkspace=(project={})=>Shared.defaultWorkspace(project,S);
  const normalizeWorkspace=(raw,project={})=>Shared.normalizeWorkspace(raw,project,S);

  function parseDatasets(project={},artifacts=null){
    if(!artifacts?.list||!D?.transportDatasetsFromArtifacts)return [];
    return D.transportDatasetsFromArtifacts(artifacts.list({includeTransient:true})||[],{consumer:'builtin.resonance-workbench'});
  }


  async function createTop({project:initialProject,artifacts,setStatus,scheduleSnapshot:persistSnapshot,historyChanged=detail=>window.DKDSPlugins?.edit?.changed?.(detail),copyTextToClipboard,saveChartImage,io=window.DKDSIO,charts=window.DKDSCharts,dom=window.DKDSComponents?.createScope?.('builtin.resonance-workbench')||null,performance=null,pipeline=null,transforms=null,algorithms=null,reactive=null,adapter={}}){
      const $=selector=>dom?.query?.(selector)||null;
      const $$=selector=>dom?.all?.(selector)||[];
      let project=clone(initialProject||{});
      let datasets=[];
      let sweeps=[];
      let workspace={};
      let uiBound=false;
      let currentView='main';
      let sharedController=null;
      let workspaceNavigator=null;
      let algorithmRuntime=algorithms||null;
      let pipelineRuntime=pipeline||null;
      let resizeRaf=0;
      let uiRuntime=null;
      let commandRuntime=null;
      let entityRuntime=null;
      let workspaceRuntime=null;
      let selectionRuntime=null;
      let inspectorRuntime=null;
      let mainPlotRuntime=null;
      let peakRuntime=null;
      let controlsRuntime=null;
      const registeredEntityIds=new Set();
      let runtimeDefaults={groupColumns:'auto'};
      let reactiveRuntime=reactive||null;
      let reactiveViewsInstalled=false;
      const featureContext=FeatureContext.create({
        live:{
          workspace:()=>workspace,project:()=>project,datasets:()=>datasets,sweeps:()=>sweeps,
          selectedPeakId:()=>selectionRuntime?.selectedPeakId||'',selectedSweepId:()=>selectionRuntime?.selectedSweepId||'',selectedRange:()=>selectionRuntime?.selectedRange||null,
          interactionRuntime:()=>selectionRuntime?.interactionRuntime()||null,interactionSelection:()=>selectionRuntime?.interactionSelection()||null,sharedController:()=>sharedController,
          workspaceNavigator:()=>workspaceNavigator,
          algorithmRuntime:()=>algorithmRuntime,pipelineRuntime:()=>pipelineRuntime,reactiveRuntime:()=>reactiveRuntime,
          uiRuntime:()=>uiRuntime,workspaceRuntime:()=>workspaceRuntime,peakMetricRevision:()=>peakRuntime?.revision?.()||0
        },
        services:{$,dom,charts,artifacts,performance,S,D,transforms,setStatus,copyTextToClipboard},
        actions:{
          groupSeries,peakMetrics,selectedPeak,selectedSweep,visibleSweeps,visibleSweepIds,visibilityMap,isVisible,peakLabel,colorForPeakOrder,
          scientificReact,peakPointEntity,peakById,publishPeakSelection,publishSweepSelection,publishRangeSelection,peaksInRange,resize,sweepById,category,
          datasetEntityId,renderControls,renderSummary,ensureMainSurface,renderInspection,renderTrend,renderLinkedSelection,
          updateGroupContext,isUiBound,normalizeCategories,invalidatePhysics,physicalAnalysis,render,scheduleSnapshot,commitPeakMetricEdit,
          clearMainRangeMenu,renderMainPlot,selectedSweep,selectedPeak,assignPeakCategory,createPeakCategoryForPeak,
          renameSelectedCategory,updatePeak,deletePeak,currentTransform,peakColor,clearRangeState:()=>selectionRuntime?.clearRangeState(),
          setRangeState:range=>selectionRuntime?.setRangeState(range),clearSelectionIds:options=>selectionRuntime?.clearIds(options),
          assignDetectedOrders,commitWorkspaceEdit,setSelectedPeakId:value=>selectionRuntime?.setSelectedPeakId(value),rebuild,refreshData
        },
        utils:{esc,fmt,csvCell,finite,directionName,clone}
      });
      const groupRuntime=GroupRuntime.create(featureContext);
      const analysisRuntime=AnalysisRuntime.create(featureContext);
      peakRuntime=PeakRuntime.create(featureContext);
      selectionRuntime=SelectionRuntime.create(featureContext);
      inspectorRuntime=InspectorRuntime.create(featureContext);
      mainPlotRuntime=MainPlotRuntime.create(featureContext);
      controlsRuntime=ControlsRuntime.create(featureContext);
      function renderGroup(){return groupRuntime.render();}
      function disposeGroupViews(){return groupRuntime.dispose();}
      function physicalAnalysis(){return analysisRuntime.physicalAnalysis();}
      function renderPhysics(){return analysisRuntime.renderPhysics();}
      function renderSpacing(){return analysisRuntime.renderSpacing();}
      function spacingCsv(){return analysisRuntime.spacingCsv();}
      function renderGate(){return analysisRuntime.renderGate();}
      function gateCsv(){return analysisRuntime.gateCsv();}
      function gateReportText(){return analysisRuntime.gateReportText();}
      function gateFeatureFieldCsv(field){return analysisRuntime.gateFeatureFieldCsv(field);}
      function invalidatePhysics(){return analysisRuntime.invalidatePhysics();}
      function updateGroupContext(){const node=$('#reswinGroupContext');if(node)node.textContent=groupRuntime.contextText?.()||'';}
      function isUiBound(){return uiBound;}

      function reactiveTouch(keys,meta={}){try{return reactiveRuntime?.touch?.(keys,meta)||null;}catch(err){console.warn('[resonance reactive touch]',err);return null;}}
      function installReactiveViews(){
        if(reactiveViewsInstalled||!reactiveRuntime?.effect)return;reactiveViewsInstalled=true;
        reactiveRuntime.effect('resonance.view.main',{dependsOn:['resonance.peak.geometry','resonance.peak.metrics','resonance.visibility'],scheduler:'frame',effect:()=>{if($('#reswinMainPlot')?.offsetParent!==null)ensureMainSurface()?.requestRender?.('reactive');}});
        reactiveRuntime.effect('resonance.view.inspector',{dependsOn:['resonance.peak.geometry','resonance.peak.metrics','resonance.peak.identity','resonance.selection'],scheduler:'frame',effect:()=>{if($('#reswinInspectorBody')?.offsetParent!==null)renderInspection();}});
        reactiveRuntime.effect('resonance.view.group',{dependsOn:['resonance.peak.geometry','resonance.peak.metrics','resonance.peak.identity','resonance.visibility','resonance.group.settings'],scheduler:'frame',effect:()=>{if($('#resparGroupPanel')?.offsetParent!==null){groupRuntime.invalidate();renderGroup();}}});
      }
      let undoStack=[],redoStack=[];
      let committedWorkspace=null;
      const workspaceFingerprint=value=>{try{return JSON.stringify(value);}catch{return '';}};
      const historyRow=(snapshot,label='共振编辑')=>({snapshot:clone(snapshot),label:String(label||'共振编辑'),createdAt:Date.now()});
      const trimHistory=rows=>{if(rows.length>80)rows.splice(0,rows.length-80);};
      function resetUndoHistory(){undoStack=[];redoStack=[];committedWorkspace=clone(workspace);historyChanged({reason:'reset'});}
      function pushUndo(snapshot,label='共振编辑'){
        if(!snapshot)return false;undoStack.push(historyRow(snapshot,label));trimHistory(undoStack);redoStack=[];historyChanged({reason:'record',label});return true;
      }
      function scheduleSnapshot({recordHistory=true,label='共振编辑'}={}){
        const current=clone(workspace);
        if(recordHistory&&committedWorkspace&&workspaceFingerprint(committedWorkspace)!==workspaceFingerprint(current))pushUndo(committedWorkspace,label);
        committedWorkspace=current;persistSnapshot?.();
      }
      function commitWorkspaceEdit(previous,label='共振编辑'){
        const before=clone(previous),current=clone(workspace);
        if(before&&workspaceFingerprint(before)!==workspaceFingerprint(current))pushUndo(before,label);
        committedWorkspace=current;persistSnapshot?.();return true;
      }
      function applyHistoryWorkspace(next,source){
        workspace=normalizeWorkspace(next,project);committedWorkspace=clone(workspace);currentView=workspace.activeView||'main';analysisRuntime.invalidatePhysics();selectionRuntime?.clearIds();rebuild();
        selectionRuntime?.interactionSelection()?.clear?.({source});render();persistSnapshot?.();return true;
      }
      function undoLastAction(){
        const entry=undoStack.pop();if(!entry){setStatus('没有可回退的共振编辑。');return false;}
        redoStack.push(historyRow(workspace,entry.label));trimHistory(redoStack);applyHistoryWorkspace(entry.snapshot,'resonance-undo');historyChanged({reason:'undo',label:entry.label});setStatus(`已撤销：${entry.label}`);return true;
      }
      function redoLastAction(){
        const entry=redoStack.pop();if(!entry){setStatus('没有可重做的共振编辑。');return false;}
        undoStack.push(historyRow(workspace,entry.label));trimHistory(undoStack);applyHistoryWorkspace(entry.snapshot,'resonance-redo');historyChanged({reason:'redo',label:entry.label});setStatus(`已重做：${entry.label}`);return true;
      }
      function historyState(){
        const publicRows=rows=>rows.map(row=>({label:row.label,createdAt:row.createdAt,scope:'workspace',source:'builtin.resonance-workbench'}));
        return {canUndo:undoStack.length>0,canRedo:redoStack.length>0,undoLabel:undoStack.at(-1)?.label||'',redoLabel:redoStack.at(-1)?.label||'',past:publicRows(undoStack),future:publicRows(redoStack),scope:'workspace',source:'builtin.resonance-workbench'};
      }

      function pluginSliceFromProject(p){return Shared.pluginSliceFromProject(p);}
      function sweepById(id){return sweeps.find(sw=>sw.id===id)||null;}
      function peakById(id){return (workspace.peaks||[]).find(p=>p.id===id)||null;}

      function datasetEntityId(path){return `resonance.dataset:${String(path||'')}`;}
      function syncEntities(){
        const entities=entityRuntime;if(!entities?.upsert)return false;const live=new Set();
        entities.transact?.(()=>{
          for(const ds of datasets){const id=datasetEntityId(ds.path);live.add(id);entities.upsert({id,type:'resonance.dataset',label:ds.name||ds.path,ref:{datasetPath:ds.path},value:{path:ds.path,name:ds.name,vg:ds.vg},metadata:{vg:ds.vg,sourcePath:ds.sourcePath||''},visible:true,hidden:false});}
          for(const sw of sweeps){live.add(String(sw.id));const visible=isVisible(sw);entities.upsert({id:String(sw.id),type:'resonance.sweep',label:`${sw.datasetName||sw.datasetPath} · ${directionName(sw.direction)}`,parents:[datasetEntityId(sw.datasetPath)],ref:{sweepId:sw.id,datasetPath:sw.datasetPath},value:{id:sw.id,datasetPath:sw.datasetPath,datasetName:sw.datasetName,vg:sw.vg,direction:sw.direction},metadata:{vg:sw.vg,direction:sw.direction},visible,hidden:!visible});}
          for(const peak of workspace.peaks||[]){live.add(String(peak.id));const sw=sweepById(peak.sweepId),visible=!!sw&&isVisible(sw)&&peak.accepted!==false;entities.upsert({id:String(peak.id),type:'resonance.peak',label:peakLabel(peak),parents:[String(peak.sweepId||'')],ref:{peakId:peak.id,sweepId:peak.sweepId,datasetPath:peak.datasetPath},value:{id:peak.id,sweepId:peak.sweepId,datasetPath:peak.datasetPath,vg:peak.vg,direction:peak.direction,v:peak.v,i:peak.i,peakOrder:peak.peakOrder,peakLabel:peakLabel(peak)},metadata:{accepted:peak.accepted!==false,manual:!!peak.manual},visible,hidden:!visible,locked:!!peak.locked});}
        });
        for(const id of [...registeredEntityIds])if(!live.has(id))entities.remove?.(id);registeredEntityIds.clear();for(const id of live)registeredEntityIds.add(id);return true;
      }
      function syncDerivedArtifacts(){
        if(!artifacts?.publish||!D?.createSweep||!D?.createPeakSet)return false;const sourceRows=artifacts.list?.({includeTransient:true})||[];const rawByPath=new Map(sourceRows.filter(a=>a?.kind==='data.table'&&String(a?.semanticType||'')==='science.transport.iv').map(a=>[String(a?.metadata?.seriesPath||a.id),a.id]));
        const publishAll=api=>{for(const sw of sweeps){const parentId=rawByPath.get(String(sw.datasetPath||''))||'';api.publish(D.createSweep({id:String(sw.id),name:`${sw.datasetName||'Sweep'} · ${directionName(sw.direction)}`,x:(sw.points||[]).map(p=>p.v),y:(sw.points||[]).map(p=>p.i),xName:'Vd',yName:'Id',xUnit:'V',yUnit:'A',direction:sw.direction,scanAxis:'Vd',transient:true,metadata:{datasetPath:sw.datasetPath,vg:sw.vg},lineage:{parents:parentId?[parentId]:[],role:'sweep',producer:'builtin.resonance-workbench',operation:'split-sweep'}}));const peaks=(workspace.peaks||[]).filter(p=>String(p.sweepId)===String(sw.id));api.publish(D.createPeakSet({id:`resonance.peaks:${sw.id}`,name:`${sw.datasetName||'Sweep'} · 峰`,peaks,transient:true,metadata:{sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,algorithmRef:workspace.activeDetector||'',metricAlgorithmRef:workspace.activeMetricAlgorithm||''},lineage:{parents:[String(sw.id)],role:'analysis',producer:'builtin.resonance-workbench',operation:'peak-detection',parameters:{algorithmRef:workspace.activeDetector||'',settings:workspace.detectorSettings?.[workspace.activeDetector]||workspace.algorithms||{},metricAlgorithmRef:workspace.activeMetricAlgorithm||''}}}));}};
        if(artifacts.batch)artifacts.batch(publishAll);else publishAll(artifacts);return true;
      }

      function scientificReact(target,traces,layout,config={},spec={}){
        const runtime=uiRuntime?.scientificPlot;if(runtime?.react)return runtime.react(target,traces,layout,config,{interaction:selectionRuntime?.interactionRuntime()||null,source:'resonance-plot',...spec});
        return charts?.react?.(target,traces,layout,config);
      }
      function peakPointEntity({customdata}){const id=String(customdata?.[0]||'');const p=peakById(id);return p?{id:String(p.id),type:'resonance.peak',parents:[String(p.sweepId||'')],label:peakLabel(p),ref:{peakId:p.id,sweepId:p.sweepId,datasetPath:p.datasetPath},value:{id:p.id,sweepId:p.sweepId,datasetPath:p.datasetPath,vg:p.vg,direction:p.direction,v:p.v,i:p.i}}:null;}

      function bindLinkedSelectionViews(){return selectionRuntime?.bindLinkedSelectionViews()||false;}
      function renderLinkedSelection(options){return selectionRuntime?.renderLinkedSelection(options);}
      function publishSweepSelection(sw,source='resonance-main'){return selectionRuntime?.publishSweepSelection(sw,source)||false;}
      function publishPeakSelection(p,source='resonance-main',options={}){return selectionRuntime?.publishPeakSelection(p,source,options)||false;}
      function publishRangeSelection(range,source='resonance-main'){return selectionRuntime?.publishRangeSelection(range,source)||false;}
      function peaksInRange(range){return selectionRuntime?.peaksInRange(range)||[];}
      function setRangeLocked(value){return selectionRuntime?.setRangeLocked(value);}
      function applyRangeIdentity(order,label=''){return selectionRuntime?.applyRangeIdentity(order,label)||false;}
      function deleteRangePeaks(){return selectionRuntime?.deleteRangePeaks();}

      function installAlgorithmPipeline(){return peakRuntime?.installPipeline?.()||false;}
      async function detectRange(range=selectionRuntime?.selectedRange){return peakRuntime?.detectRange?.(range);}
      function peakMetrics(p){return peakRuntime?.peakMetrics?.(p)||S.peakMetrics?.(p,sweepById(p?.sweepId))||null;}
      function commitPeakMetricEdit(p,options={}){return peakRuntime?.commitPeakMetricEdit?.(p,options)||peakMetrics(p);}
      function scheduleMetricRefresh(rows=[]){return peakRuntime?.scheduleMetricRefresh?.(rows);}


      function applyWorkspaceToDatasets(){
        const meta=new Map((workspace.datasetMeta||[]).map(row=>[String(row?.path||''),row]));
        for(const d of datasets){
          const row=meta.get(String(d.path||''));
          if(!row)continue;
          if(finite(row.vg))d.vg=Number(row.vg);
        }
      }

      function normalizedDatasetPath(value){return String(value||'').replace(/\\/g,'/').toLowerCase();}
      function savedSweepDatasetPath(peak){
        const direct=String(peak?.datasetPath||'');if(direct)return direct;
        return String(peak?.sweepId||'').replace(/::(?:up|down)::\d+$/i,'');
      }
      function sweepMatchScore(peak,sw){
        const points=sw?.points||[];if(!points.length)return Number.POSITIVE_INFINITY;
        const pv=Number(peak?.v),pi=Number(peak?.i);
        let best=Number.POSITIVE_INFINITY;
        for(const point of points){
          const dv=Number.isFinite(pv)?Math.abs(Number(point.v)-pv):0;
          const di=Number.isFinite(pi)&&Number.isFinite(Number(point.i))?Math.abs(Number(point.i)-pi):0;
          const score=dv+Math.min(di,1)*1e-6;if(score<best)best=score;
        }
        return best;
      }
      function reconcileSavedPeakSweeps(){
        const byId=new Map(sweeps.map(sw=>[String(sw.id),sw]));
        const byPathDirection=new Map();
        for(const sw of sweeps){
          const key=`${normalizedDatasetPath(sw.datasetPath)}::${Number(sw.direction)>0?1:-1}`;
          const rows=byPathDirection.get(key)||[];rows.push(sw);byPathDirection.set(key,rows);
        }
        let repaired=0,unresolved=0;
        for(const peak of workspace.peaks||[]){
          const exact=byId.get(String(peak?.sweepId||''));
          if(exact){
            peak.datasetPath=exact.datasetPath;peak.direction=exact.direction;
            if(Number.isFinite(Number(exact.vg)))peak.vg=Number(exact.vg);
            continue;
          }
          const datasetPath=savedSweepDatasetPath(peak),direction=Number(peak?.direction)>0?1:-1;
          const candidates=byPathDirection.get(`${normalizedDatasetPath(datasetPath)}::${direction}`)||[];
          if(!candidates.length){unresolved+=1;continue;}
          const chosen=candidates.length===1?candidates[0]:candidates.slice().sort((a,b)=>sweepMatchScore(peak,a)-sweepMatchScore(peak,b)||String(a.id).localeCompare(String(b.id)))[0];
          if(!chosen){unresolved+=1;continue;}
          peak.sweepId=chosen.id;peak.datasetPath=chosen.datasetPath;peak.direction=chosen.direction;
          if(Number.isFinite(Number(chosen.vg)))peak.vg=Number(chosen.vg);
          repaired+=1;
        }
        return {repaired,unresolved,total:(workspace.peaks||[]).length};
      }

      function rebuild(){
        datasets=parseDatasets(project,artifacts);
        applyWorkspaceToDatasets();
        sweeps=[];
        for(const dataset of datasets){
          if(dataset?.excluded===true)continue;
          try{sweeps.push(...(S.buildSweeps?.(dataset)||[]));}catch(err){console.warn('[resonance window buildSweeps]',dataset?.name,err);}
        }
        const peakIdentity=reconcileSavedPeakSweeps();
        if(peakIdentity.repaired)console.info('[resonance peak identity repair]',peakIdentity);
        selectionRuntime?.reconcileAfterRebuild();
        syncEntities();syncDerivedArtifacts();
      }

      function refreshData(){
        rebuild();controlsRuntime?.fitVisibleData?.('data-refresh');
        if($('#reswinMainPlot'))render();
        return datasets.length;
      }

      function visibilityMap(){
        const map=new Map((workspace.scanVisibility||[]).map(([path,value])=>[String(path),{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
        for(const d of datasets){const path=String(d.path);if(!map.has(path))map.set(path,{forward:true,reverse:true});}
        return map;
      }
      function isVisible(sw){
        if(!sw)return false;
        const row=visibilityMap().get(String(sw.datasetPath))||{forward:true,reverse:true};
        return sw.direction>0?row.forward!==false:row.reverse!==false;
      }
      function visibleSweeps(){return sweeps.filter(isVisible);}
      function visibleSweepIds(){return visibleSweeps().map(sw=>sw.id);}
      function selectedSweep(){return sweeps.find(sw=>sw.id===selectionRuntime?.selectedSweepId)||visibleSweeps()[0]||sweeps[0]||null;}
      function selectedPeak(){return peakById(selectionRuntime?.selectedPeakId);}

      function normalizeCategories(){
        const by=new Map();
        for(const c of workspace.peakCategories||[]){
          const order=Math.max(1,Math.round(Number(c?.order)||1));
          if(!by.has(order))by.set(order,{order,label:String(c?.label||`峰${order}`)});
        }
        for(const p of workspace.peaks||[]){
          const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
          if(!by.has(order))by.set(order,{order,label:String(p.peakLabel||`峰${order}`)});
          p.peakOrder=order;
          p.peakLabel=String(p.peakLabel||by.get(order).label);
          if(p.accepted===undefined)p.accepted=true;
          if(p.manual===undefined)p.manual=false;
          if(p.locked===undefined)p.locked=false;
        }
        workspace.peakCategories=[...by.values()].sort((a,b)=>a.order-b.order);
      }
      function category(order){
        normalizeCategories();
        const n=Math.max(1,Math.round(Number(order)||1));
        return workspace.peakCategories.find(c=>Number(c.order)===n)||{order:n,label:`峰${n}`};
      }
      function peakLabel(p){return String(p?.peakLabel||category(p?.peakOrder||1).label||`峰${p?.peakOrder||1}`);}
      const COOL=['#0057D9','#00A6A6','#6D28D9','#0EA5E9','#1E3A8A','#14B8A6','#7C3AED','#0369A1','#22D3EE','#4338CA','#0F766E','#60A5FA'];
      const WARM=['#D7191C','#FF7A00','#C2185B','#F2B705','#8B1E3F','#F4511E','#E11D48','#CA8A04','#FF3D00','#A21CAF','#B91C1C','#FB923C'];
      function colorForPeakOrder(order,direction){const n=Math.max(1,Math.round(Number(order)||1));const palette=direction>0?COOL:WARM;return palette[(n-1)%palette.length];}
      function assignPeakCategory(p,order){if(!p)return;const n=Math.max(1,Math.round(Number(order)||1));const c=category(n);p.peakOrder=n;p.peakLabel=c.label;p.manual=true;normalizeCategories();render();scheduleSnapshot();}
      function createPeakCategoryForPeak(p){if(!p)return null;normalizeCategories();const n=Math.max(0,...workspace.peakCategories.map(c=>Number(c.order)||0))+1;const c={order:n,label:`峰${n}`};workspace.peakCategories.push(c);p.peakOrder=n;p.peakLabel=c.label;p.manual=true;render();scheduleSnapshot();return c;}
      function renamePeakCategory(p,label){if(!p)return;selectionRuntime?.setSelectedPeakId(p.id);renameSelectedCategory(label);}

      function currentTransform(sw){return controlsRuntime?.currentTransform(sw)||'raw';}
      function setTransform(type){return controlsRuntime?.setTransform(type);}
      function setAllVisibility(value){return controlsRuntime?.setAllVisibility(value);}
      function setPreset(name){return controlsRuntime?.setPreset(name);}
      function renderControls(){return controlsRuntime?.render();}


      function assignDetectedOrders(rows){
        const ordered=rows.slice().sort((a,b)=>Number(a.v)-Number(b.v));
        ordered.forEach((peak,index)=>{const order=index+1,c=category(order);peak.peakOrder=order;peak.peakLabel=c.label;});
        normalizeCategories();
        return ordered;
      }
      async function runDetection(scope='selected'){return peakRuntime?.runDetection?.(scope);}


      function addManualPeak(v){
        const sw=selectedSweep();if(!sw||!sw.points?.length||!finite(v))return;
        let best=sw.points[0],bestIndex=0,bestDist=Math.abs(Number(best.v)-Number(v));
        sw.points.forEach((p,index)=>{const dist=Math.abs(Number(p.v)-Number(v));if(dist<bestDist){best=p;bestIndex=index;bestDist=dist;}});
        const existing=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id);
        const order=Math.max(1,...existing.map(p=>Number(p.peakOrder)||0))+1;
        const c=category(order),leftIndex=Math.max(0,bestIndex-3),rightIndex=Math.min(sw.points.length-1,bestIndex+3);
        const widthLeft=Number(sw.points[leftIndex]?.v),widthRight=Number(sw.points[rightIndex]?.v);
        const peak={
          id:`${sw.id}::manual::${Date.now()}::${Math.random().toString(36).slice(2,7)}`,
          sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,
          index:bestIndex,v:best.v,i:best.i,accepted:true,manual:true,locked:false,
          algorithms:['manual'],primaryAlgorithm:'manual',score:1,confidence:1,
          widthLeft,widthRight,fwhm:Math.abs(widthRight-widthLeft),peakOrder:order,peakLabel:c.label,customColor:null
        };
        workspace.peaks.push(peak);normalizeCategories();selectionRuntime?.setSelectedPeakId(peak.id);
        render();scheduleSnapshot({label:'添加手动峰'});setStatus(`已在 Vd=${Number(best.v).toPrecision(6)} V 添加手动峰。`);
      }

      function updatePeak(id,patch){
        const peak=peakById(id);if(!peak)return;
        Object.assign(peak,patch||{});normalizeCategories();render();scheduleSnapshot();
      }
      function deletePeak(id){
        workspace.peaks=(workspace.peaks||[]).filter(p=>p.id!==id);
        if(selectionRuntime?.selectedPeakId===id)selectionRuntime?.setSelectedPeakId('');
        render();scheduleSnapshot();
      }
      function renameSelectedCategory(label){
        const p=selectedPeak();if(!p)return;
        const next=String(label||'').trim();if(!next)return;
        const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
        const c=workspace.peakCategories.find(row=>Number(row.order)===order)||{order,label:next};
        if(!workspace.peakCategories.includes(c))workspace.peakCategories.push(c);
        c.label=next;
        for(const peak of workspace.peaks||[])if(Number(peak.peakOrder)===order)peak.peakLabel=next;
        normalizeCategories();render();scheduleSnapshot();
      }

      function sortPeakOrderByVd(){
        const rows=visibleSweeps().map(sw=>({sw,peaks:(workspace.peaks||[]).filter(p=>p.sweepId===sw.id&&p.accepted!==false).sort((a,b)=>a.v-b.v)})).filter(r=>r.peaks.length);
        if(!rows.length)return;
        try{
          const solved=S.solvePeakTracks?.(rows,{requestedSweep:selectedSweep()});
          if(solved?.assignments){
            for(const row of rows){
              const tracks=solved.assignments.get(row.sw.id);if(!tracks)continue;
              row.peaks.forEach((p,j)=>{const k=tracks[j];if(k===undefined)return;const order=k+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
            }
          }else{
            for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
          }
        }catch{
          for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
        }
        normalizeCategories();render();scheduleSnapshot({label:'智能整理峰序'});setStatus('已按跨 Vg 峰轨迹重新整理峰序。');
      }


      function peakColor(p){return mainPlotRuntime?.peakColor(p)||p?.customColor||colorForPeakOrder(p?.peakOrder||1,p?.direction||1);}
      function clearMainRangeMenu(options){return mainPlotRuntime?.clearRangeMenu(options);}
      function ensureMainSurface(){return mainPlotRuntime?.ensure()||null;}
      function resetMainView(){return mainPlotRuntime?.reset()||false;}
      function renderMainPlot(){return mainPlotRuntime?.render();}


      function groupSeries(){
        if(!sharedController)return [];
        return sharedController.buildTrendModel().series.map(sr=>({...sr,peaks:sr.points.map(row=>row._peak).filter(Boolean)}));
      }

      function renderTrend(){
        const plot=$('#reswinTrendPlot');if(!plot||!charts)return;
        const traces=groupSeries().map(sr=>({x:sr.peaks.map(p=>p.vg),y:sr.peaks.map(p=>p.v),mode:'lines+markers',name:sr.name,line:{color:sr.color,dash:sr.direction<0?'dash':'solid'},marker:{color:sr.color,size:7,line:{width:1}},customdata:sr.peaks.map(p=>[p.id,p.sweepId]),hovertemplate:'Vg=%{x}<br>Vpk=%{y:.6g} V<extra></extra>'}));
        scientificReact(plot,traces,{margin:{l:62,r:20,t:36,b:50},xaxis:{title:'Vg (V)'},yaxis:{title:'Vpk (V)'},legend:{orientation:'h',y:-.2},autosize:true},{responsive:true,displaylogo:false},{pointEntity:peakPointEntity,onEntitySelect:({entity,event})=>{const p=peakById(entity?.id);if(p)publishPeakSelection(p,'resonance-trend',{openInspector:true,additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
      }




      function renderInspection(){return inspectorRuntime?.render();}


      function renderSummary(){const el=$('#reswinSummary');if(el)el.innerHTML=`<span>数据 ${datasets.length}</span><span>扫描 ${sweeps.length}</span><span>可见 ${visibleSweeps().length}</span><span>峰 ${(workspace.peaks||[]).length}</span><span>手动 ${(workspace.peaks||[]).filter(p=>p.manual).length}</span>`;}
      function renderMain(){renderControls();renderSummary();renderMainPlot();renderTrend();}
      function renderView(){
        currentView=workspace.activeView||currentView||'main';
        if(workspaceNavigator){
          if(currentView==='main')renderMain();
          else if(currentView==='inspect'){renderControls();renderInspection();}
          else if(currentView==='group')renderGroup();
          else if(currentView==='physics')renderPhysics();
          else if(currentView==='spacing')renderSpacing();
          else if(currentView==='gate')renderGate();
          return;
        }
        $$('.reswin-view').forEach(el=>el.classList.toggle('active',el.dataset.reswinViewPanel===currentView));
        $$('[data-reswin-view]').forEach(el=>el.classList.toggle('active',el.dataset.reswinView===currentView));
        if(currentView==='main')renderMain();
        else if(currentView==='inspect'){renderControls();renderInspection();}
        else if(currentView==='group')renderGroup();
        else if(currentView==='physics')renderPhysics();
        else if(currentView==='spacing')renderSpacing();
        else if(currentView==='gate')renderGate();
      }
      function setView(view){if(!['main','inspect','group','physics','spacing','gate'].includes(String(view)))return;workspace.activeView=String(view);currentView=workspace.activeView;if(workspaceNavigator)workspaceNavigator(currentView);else renderView();scheduleSnapshot();}
      function render(){normalizeCategories();syncEntities();syncDerivedArtifacts();if(workspaceNavigator){renderMain();if(currentView!=='main')workspaceNavigator(currentView);if($('#resparGroupPanel')?.offsetParent!==null&&currentView!=='group')renderGroup();}else renderView();}
      function resize(){
        if(resizeRaf)return;resizeRaf=dom.frame(()=>{resizeRaf=0;if($('#reswinMainPlot')?.offsetParent!==null)renderMainPlot();$$('.analysis-chart,.reswin-group-plot').filter(el=>el.offsetParent!==null).forEach(el=>{try{charts.resize(el);}catch{}});});
      }

      function peaksCsv(){const rows=['dataset,vg,direction,peak_order,peak_label,vpk,i,accepted,manual,locked'];for(const p of workspace.peaks||[])rows.push([p.datasetPath,p.vg,directionName(p.direction),p.peakOrder,peakLabel(p),p.v,p.i,p.accepted!==false,p.manual===true,p.locked===true].map(csvCell).join(','));return rows.join('\n');}
      function mainCsv(){const sw=selectedSweep();if(!sw)return '';return ['Vd,I',...(sw.points||[]).map(p=>`${p.v},${p.i}`)].join('\n');}

      async function exportMainSvg(){
        const svg=$('#reswinMainPlot');if(!svg)return false;const serializer=new XMLSerializer(),source=serializer.serializeToString(svg),content=`<?xml version="1.0" encoding="UTF-8"?>\n${source}`;await io.saveText({defaultName:'resonance_iv.svg',content,filters:[{name:'SVG',extensions:['svg']}]});return true;
      }
      async function exportMainPng(){
        const svg=$('#reswinMainPlot');if(!svg)return false;await io.svg.savePng(svg,'resonance_iv.png',{scale:2});return true;
      }

      function bindUi(page){
        if(uiBound||!page)return;uiBound=true;
        page.querySelectorAll('[data-reswin-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.reswinView));
        page.querySelector('#reswinSweepSelect')?.addEventListener('change',e=>{const sw=sweepById(e.target.value);if(sw)publishSweepSelection(sw,'resonance-toolbar');});
        page.querySelector('#reswinInspectSweepSelect')?.addEventListener('change',e=>{const sw=sweepById(e.target.value);if(sw)publishSweepSelection(sw,'resonance-inspector');});
        page.querySelector('#reswinTransform').onchange=e=>setTransform(e.target.value);
        page.querySelector('#reswinPreset').onchange=e=>setPreset(e.target.value);
        page.querySelector('#reswinDetectSelected').onclick=()=>runDetection('selected');
        page.querySelector('#reswinDetectAll').onclick=()=>runDetection('all');
        page.querySelector('#reswinSortPeaks').onclick=sortPeakOrderByVd;
        for(const [id,key] of [['reswinShowRejected','showRejected'],['reswinShowWidth','showWidth'],['reswinShowPoints','showPoints']])page.querySelector('#'+id)?.addEventListener('change',e=>{workspace.peakDisplay={...(workspace.peakDisplay||{}),[key]:!!e.target.checked};renderMainPlot();scheduleSnapshot();});
        page.querySelector('#reswinPhysicsLabels')?.addEventListener('change',e=>{workspace.physicsShowLabels=!!e.target.checked;renderMainPlot();scheduleSnapshot();});
        page.querySelector('#reswinShowAll').onclick=()=>setAllVisibility('all');
        page.querySelector('#reswinShowForward')?.addEventListener('click',()=>setAllVisibility('forward'));
        page.querySelector('#reswinShowReverse')?.addEventListener('click',()=>setAllVisibility('reverse'));
        page.querySelector('#reswinHideAll').onclick=()=>setAllVisibility('none');
        page.querySelector('#reswinExportMainCsv')?.addEventListener('click',()=>io.saveCsv(mainCsv(),'resonance_iv.csv') );
        page.querySelector('#reswinExportMainSvg')?.addEventListener('click',()=>exportMainSvg());
        page.querySelector('#reswinExportMainPng')?.addEventListener('click',()=>exportMainPng());
        page.querySelector('#reswinCopyMain')?.addEventListener('click',()=>copyTextToClipboard(mainCsv(),'主图 CSV'));
        page.querySelector('#reswinUndo')?.addEventListener('click',()=>{if(commandRuntime?.run)return commandRuntime.run('builtin.resonance.undo');return undoLastAction();});
        page.querySelector('#reswinDeselect')?.addEventListener('click',()=>clearSelection());
        page.querySelector('#reswinExportPeaks')?.addEventListener('click',()=>io.saveCsv(peaksCsv(),'resonance_peaks.csv') );
        page.querySelector('#reswinCopyPeaks')?.addEventListener('click',()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'));
        page.querySelector('#reswinApplyPeakLabel')?.addEventListener('click',()=>renameSelectedCategory(page.querySelector('#reswinPeakLabelInput')?.value));
        page.querySelector('#reswinDeletePeak')?.addEventListener('click',()=>{const p=selectedPeak();if(p)deletePeak(p.id);});
        for(const id of ['reswinSpacingA','reswinSpacingB','reswinSpacingMode'])page.querySelector('#'+id).onchange=()=>{workspace.spacingSettings={seriesA:$('#reswinSpacingA').value,seriesB:$('#reswinSpacingB').value,mode:$('#reswinSpacingMode').value};renderSpacing();scheduleSnapshot();};
        page.querySelector('#reswinSpacingExport').onclick=()=>io.saveCsv(spacingCsv(),'resonance_peak_spacing.csv');
        page.querySelector('#reswinGateRun').onclick=()=>{renderGate();scheduleSnapshot();};
        for(const id of ['reswinGateFeatureMetric','reswinGateFeatureDirection'])page.querySelector('#'+id)?.addEventListener('change',()=>{analysisRuntime.readGate?.();renderGate();scheduleSnapshot();});
        page.querySelector('#reswinGateExportCsv').onclick=()=>io.saveCsv(gateCsv(),'gate_physics_analysis.csv');
        page.querySelector('#reswinGateFeatureExport')?.addEventListener('click',()=>io.saveCsv(gateFeatureFieldCsv(),'resonance_feature_field.csv'));
        page.querySelector('#reswinGateExportReport').onclick=()=>io.saveText({defaultName:'gate_physics_analysis_report.md',content:gateReportText(),filters:[{name:'Markdown',extensions:['md']},{name:'Text',extensions:['txt']}]});
        bindLinkedSelectionViews();
      }

      function switchSelectedSweep(step){return selectionRuntime?.switchSelectedSweep(step)||false;}
      function moveSelectedPeakBy(step){return selectionRuntime?.moveSelectedPeakBy(step)||false;}
      function selectAdjacentPeak(step){return selectionRuntime?.selectAdjacentPeak(step)||false;}
      function lockSelectedPeaks(value=true){return selectionRuntime?.lockSelectedPeaks(value)||false;}
      function deleteSelectedPeaks(){return selectionRuntime?.deleteSelectedPeaks()||false;}
      function clearSelectedRange(){return selectionRuntime?.clearSelectedRange()||false;}
      function clearSelection(){return selectionRuntime?.clearSelection()||false;}
      function togglePhysicsLabels(){workspace.physicsShowLabels=workspace.physicsShowLabels===false;renderControls();renderMainPlot();scheduleSnapshot();return workspace.physicsShowLabels;}

      const service={
        serialize:()=>clone(workspace),
        selectedSweep,selectedPeak,sweepById,peakById,visibleSweepIds,
        directionName,peakLabel,colorForPeakOrder,assignPeakCategory,createPeakCategoryForPeak,renamePeakCategory,metrics:peakMetrics,
        restore(data){workspace=normalizeWorkspace(data,project);currentView=workspace.activeView||'main';rebuild();resetUndoHistory();if($('#reswinMainPlot'))render();},
        reset(){workspace=defaultWorkspace(project);workspace.groupColumns=runtimeDefaults.groupColumns||'auto';currentView='main';rebuild();render();scheduleSnapshot();},
        render,resize,bindUi,setView,refreshData,
        renderMain,renderInspection,renderGroup,renderPhysics,renderSpacing,renderGate,getGateFeatureField:()=>clone(analysisRuntime.getGateFeatureField()),gateFeatureFieldCsv,
        getGroupColumns:()=>String(workspace.groupColumns||'auto'),setGroupColumns(value){const next=['auto','1','2','3','4','5','6'].includes(String(value))?String(value):'auto';workspace.groupColumns=next;reactiveTouch('resonance.group.settings',{reason:'group-columns'});scheduleSnapshot();return next;},closeGroupViews:disposeGroupViews,
        setUserDefaults(value={},options={}){const groupColumns=['auto','1','2','3','4','5','6'].includes(String(value?.groupColumns))?String(value.groupColumns):'auto';runtimeDefaults={...runtimeDefaults,...clone(value||{}),groupColumns};const saved=pluginSliceFromProject(project);if(options.applyCurrent===true||saved?.groupColumns===undefined){workspace.groupColumns=groupColumns;groupRuntime.invalidate();if($('#resparGroupPanel')?.offsetParent!==null)renderGroup();}return clone(runtimeDefaults);},
        setWorkspaceNavigator(fn){workspaceNavigator=typeof fn==='function'?fn:null;},
        openInspector(){workspaceNavigator?.('inspect');return true;},
        setWorkspaceRuntime(runtime){workspaceRuntime=runtime||null;},
        setUiRuntime(runtime){uiRuntime=runtime||null;controlsRuntime?.uiRuntimeChanged?.();mainPlotRuntime?.dispose?.();installReactiveViews();syncDerivedArtifacts();},
        setCommandRuntime(runtime){commandRuntime=runtime||null;},
        setEntityRuntime(runtime){entityRuntime=runtime||null;syncEntities();},
        setDetectorRuntime(runtime){peakRuntime?.setDetectorRuntime?.(runtime);},
        setAlgorithmRuntime(runtime){algorithmRuntime=runtime||null;peakRuntime?.resetPipeline?.();scheduleMetricRefresh(workspace.peaks||[]);},
        setPipelineRuntime(runtime){pipelineRuntime=runtime||null;peakRuntime?.resetPipeline?.();analysisRuntime.installPipeline();},
        setInteractionRuntime(runtime={}){selectionRuntime?.setInteractionRuntime(runtime);},
        setDataSourceRuntime(runtime){controlsRuntime?.setDataSourceRuntime?.(runtime);},
        selection:()=>selectionRuntime?.selection()||null,
        selectPeak:(id,options={})=>{const p=peakById(id);return p?publishPeakSelection(p,options.source||'resonance-api',options):false;},
        selectSweep:(id,options={})=>{const sw=sweepById(id);return sw?publishSweepSelection(sw,options.source||'resonance-api'):false;},
        selectRange:(range,options={})=>publishRangeSelection(range,options.source||'resonance-api'),
        setActiveDetector(id){workspace.activeDetector=String(id||'');renderControls();scheduleSnapshot();},
        setActiveMetricAlgorithm(id){workspace.activeMetricAlgorithm=String(id||'');peakRuntime?.resetMetricCache?.({reason:'metric-algorithm'});scheduleMetricRefresh(workspace.peaks||[]);renderControls();scheduleSnapshot();},
        setDetectorSettings(id,value){const key=String(id||workspace.activeDetector||'');if(!key)return;workspace.detectorSettings={...(workspace.detectorSettings||{}),[key]:clone(value||{})};scheduleSnapshot();},
        setPeakDisplay(key,value){workspace.peakDisplay={...(workspace.peakDisplay||{}),[String(key)]:!!value};renderMainPlot();scheduleSnapshot();},
        switchSelectedSweep,moveSelectedPeakBy,selectAdjacentPeak,lockSelectedPeaks,deleteSelectedPeaks,clearSelectedRange,clearSelection,undoLastAction,redoLastAction,historyState,togglePhysicsLabels,
        setTransform,setPreset,runDetection,addManualPeak,sortPeakOrderByVd,setAllVisibility,
        exportPeaks:()=>io.saveCsv(peaksCsv(),'resonance_peaks.csv'),
        copyPeaks:()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'),
        exportMainCsv:()=>io.saveCsv(mainCsv(),'resonance_iv.csv'),
        copyMainCsv:()=>copyTextToClipboard(mainCsv(),'主图 CSV'),
        exportMainSvg,exportMainPng,
        resetMainView,detectSelectedRange:()=>detectRange(selectionRuntime?.selectedRange),deleteSelectedRangePeaks:()=>deleteRangePeaks(),setSelectedRangeLocked:value=>setRangeLocked(value),applySelectedRangeIdentity:(order,label)=>applyRangeIdentity(order,label),
        getState:()=>{const analysis=analysisRuntime.getState();return {workspace,datasets,sweeps,selectedSweep:selectedSweep(),selectedPeak:selectedPeak(),activeView:currentView,spacingResult:analysis.spacingResult,gateResult:analysis.gateResult};},
        getGroupDiagnostics(){const visibleIds=new Set(visibleSweepIds().map(String)),matched=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleIds.has(String(p.sweepId))),unresolved=(workspace.peaks||[]).filter(p=>p.accepted!==false&&!sweeps.some(sw=>String(sw.id)===String(p.sweepId)));const series=groupSeries();return {datasets:datasets.length,sweeps:sweeps.length,visibleSweeps:visibleIds.size,peaks:(workspace.peaks||[]).length,matchedPeaks:matched.length,unresolvedPeaks:unresolved.length,series:series.length,seriesPoints:series.reduce((n,row)=>n+(row.peaks?.length||0),0)};}
      };
      sharedController=Shared.createController(service,{mode:'top-runtime',science:S});

      function setProject(next){project=clone(next||{});const saved=pluginSliceFromProject(project);workspace=normalizeWorkspace(saved,project);if(saved?.groupColumns===undefined)workspace.groupColumns=runtimeDefaults.groupColumns||'auto';currentView=workspace.activeView||'main';rebuild();resetUndoHistory();if($('#reswinMainPlot'))render();}
      await setProject(project);
      return {
        serviceName:'builtin.resonance-workbench.runtime',service,render,resize,setProject,
        syncProject(target){target.plugins=target.plugins&&typeof target.plugins==='object'?target.plugins:{};const plugin=target.plugins['builtin.resonance-workbench']&&typeof target.plugins['builtin.resonance-workbench']==='object'?target.plugins['builtin.resonance-workbench']:{};plugin.workspace=clone(workspace);target.plugins['builtin.resonance-workbench']=plugin;},
        getState:service.getState
      };
  }

  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-runtime',Object.freeze({mountSuper,createTop}));
})();
