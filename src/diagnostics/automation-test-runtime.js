(() => {
  if (window.DKDSAutomationTests) return;

  const VERSION='1.28.0';
  const state={host:null,running:false,results:[],latest:null,reportPath:'',bound:false,consoleEvents:[],coverage:{}};
  const $=selector=>document.querySelector(selector);
  const now=()=>performance?.now?.()||Date.now();
  const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return value;}}};

  function sanitizeText(value){
    return String(value??'')
      .replace(/([A-Za-z]:\\Users\\)[^\\\s]+/gi,'$1<user>')
      .replace(/(\/Users\/)[^/\s]+/g,'$1<user>')
      .replace(/(\/home\/)[^/\s]+/g,'$1<user>');
  }

  function captureRuntimeErrors(){
    if(window.__DKDS_AUTOMATION_ERROR_CAPTURED__)return;
    window.__DKDS_AUTOMATION_ERROR_CAPTURED__=true;
    const push=(kind,message,stack='')=>{
      state.consoleEvents.push({time:new Date().toISOString(),kind,message:sanitizeText(message),stack:sanitizeText(stack)});
      if(state.consoleEvents.length>100)state.consoleEvents.splice(0,state.consoleEvents.length-100);
    };
    window.addEventListener('error',event=>push('error',event?.message||event?.error?.message||'window error',event?.error?.stack||''));
    window.addEventListener('unhandledrejection',event=>push('unhandledrejection',event?.reason?.message||event?.reason||'unhandled rejection',event?.reason?.stack||''));
  }
  captureRuntimeErrors();

  function assert(condition,message){if(!condition)throw new Error(message||'Assertion failed.');}

  async function runCase(id,title,group,fn,{skip=false,skipReason=''}={}){
    const started=now();
    const row={id,title,group,status:'running',durationMs:0,detail:'',data:null};
    state.results.push(row);renderResults();
    if(skip){row.status='skip';row.detail=skipReason||'Skipped';row.durationMs=Math.round(now()-started);renderResults();return row;}
    try{
      const out=await fn();
      row.status='pass';
      if(typeof out==='string')row.detail=out;
      else if(out!==undefined)row.data=clone(out);
    }catch(err){
      row.status='fail';row.detail=sanitizeText(err?.message||String(err));
      const diagnostic=err?.data!==undefined?clone(err.data):null;
      row.data=diagnostic&&typeof diagnostic==='object'?{...diagnostic,...(err?.stack?{stack:sanitizeText(err.stack)}:{})}:(err?.stack?{stack:sanitizeText(err.stack)}:diagnostic);
    }
    row.durationMs=Math.round(now()-started);renderResults();return row;
  }

  function enabledTopActivities(){
    const diag=window.DKDSPlugins?.diagnostics?.()||{};
    // A TOP smoke test must create a fresh independent renderer. Requiring an
    // already-open window (`hasWindow`) silently skipped every TOP in a normal
    // clean session, producing a misleading all-green report. The eligibility
    // contract is the enabled/active TOP workspace plus a resolvable activity.
    return (diag.plugins||[])
      .filter(row=>row?.enabled&&row?.active&&row?.workspaceRole==='top'&&row?.workspaceActivity&&row?.topContractReady!==false)
      .map(row=>({pluginId:row.id,activityId:row.workspaceActivity,name:row.name||row.id,isSuper:!!row.isSuper,hadWindow:!!row.hasWindow,algorithmCategories:Array.isArray(row.algorithmCategories)?row.algorithmCategories.slice():[]}));
  }

  const smokeCases=window.DKDSAutomationSmokeCases;
  if(!smokeCases)throw new Error('Automation smoke-case module unavailable.');
  const {rendererPlotSmoke,scientificPlotInteractionSmoke,tableSurfaceSmoke,interactionRenderSchedulingSmoke,performanceCacheSmoke,performanceLifecycleSmoke,performanceResourceLifecycleSmoke,selectionContractSmoke,projectHistoryContractSmoke,dataSourceLifecycleSmoke,artifactRoundTripSmoke,scientificPipelineSmoke,scientificTransformRegistrySmoke,scientificScalarFieldSmoke,scientificAlgorithmRegistrySmoke,scientificAlgorithmVersionManagementSmoke,scientificAlgorithmPackageCatalogSmoke,scientificTransportAlgorithmProvidersSmoke,scientificReactiveSmoke,scienceTransformSmoke,projectFormatSmoke,dataTypeSmoke,pluginContractSmoke,pluginSmoke,externalPluginPackageSmoke}=smokeCases;

  async function runAll(){
    if(state.running)return state.latest;
    state.running=true;state.results=[];state.reportPath='';state.coverage={};render();
    const startedAt=new Date().toISOString();const errorStart=state.consoleEvents.length;
    let environment={};
    try{environment=await (window.electronAPI?.diagnosticsGetEnvironment?.()||window.electronAPI?.getRuntimeStatus?.()||Promise.resolve({runtime:'unknown'}));}catch(err){environment={runtime:'unknown',error:sanitizeText(err.message)};}

    await runCase('runtime.package-mode','Packaged build identity','Environment',async()=>({runtime:environment.runtime||'unknown',isPackaged:environment.isPackaged===true,appVersion:environment.appVersion||''}),{skip:environment.runtime==='desktop'&&environment.isPackaged===false,skipReason:'当前是 Electron 开发/源码运行形态；Core 测试仍会继续，但安装包/portable 的最终资源布局尚未被本次日志覆盖。'});
    await runCase('runtime.core','Core Runtime','Core',async()=>{
      const names=['DKDSData','DKDSEntities','DKDSUI','DKDSPerformance','DKDSScientificPlot','DKDSComponents','DKDSDataFlow','DKDSScientificReactive','DKDSScientificPipeline','DKDSScientificTransforms','DKDSScientificAlgorithms','DKDSPluginContract','DKDSCapabilities','DKDSPlugins'];
      const missing=names.filter(name=>!window[name]);assert(!missing.length,`Missing runtime globals: ${missing.join(', ')}`);return {globals:names.length};
    });
    await runCase('runtime.shell','Application Shell DOM','Core',async()=>{
      for(const id of ['app','activityBar','mainWorkspace','statusBar','manageMenu','pluginManagerPage','automationTestPage'])assert(document.getElementById(id),`Missing shell element #${id}`);return {viewport:[window.innerWidth,window.innerHeight],devicePixelRatio:window.devicePixelRatio||1};
    });
    await runCase('ui.theme-material-renderer','Theme Material Renderer · computed style','UI / Theme',async()=>{
      const caps=window.DKDSTheme?.rendererCapabilities?.();assert(caps?.version==='3.6.0'&&caps?.renderer?.backdropBlur===true,'Material Renderer 3.6 backdrop capability unavailable.');
      assert(window.DKDSTheme?.contractVersion==='3.6.0','Theme Contract 3.6 unavailable.');assert(window.DKDSTheme?.supports?.('contract.materialBlur')===true,'Theme contract materialBlur capability unavailable.');assert(window.DKDSTheme?.supports?.('renderer.recipes.thin-glass')===true,'Thin Glass renderer capability unavailable.');
      const thin=window.DKDSThemeMaterialRenderer?.probeRecipe?.('thin-glass','popover');assert(thin?.status==='REAL_MATERIAL'&&thin?.recipe==='thin-glass',`Thin Glass probe ${thin?.status||'none'} / ${thin?.recipe||'none'}`);assert(/blur\(/.test(thin.backdropFilter||''),`Thin Glass did not compute backdrop blur: ${thin.backdropFilter||'none'}`);assert(!thin.edgeBackdropFilter&&!thin.specularBackground,'Thin Glass must not use Liquid optical layers.');
      const liquid=window.DKDSThemeMaterialRenderer?.probeRecipe?.('liquid-glass','popover');assert(liquid?.opticalStatus==='REAL_LIQUID_MATERIAL','Liquid Glass renderer regression.');
      state.coverage.themeMaterialRenderer={caps,thin,liquid};return state.coverage.themeMaterialRenderer;
    });
    await runCase('ui.theme-coverage','Theme Coverage Contract','UI / Theme',async()=>{
      const Theme=window.DKDSTheme,Coverage=window.DKDSThemeCoverage;
      const originalMode=Theme?.current?.()||'light',contrastModes=[];
      const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      try{
        for(const mode of ['light','dark']){
          if(Theme?.current?.()!==mode){Theme?.set?.(mode);await settle();}
          const contrast=Coverage?.contrast?.()||{checked:0,issues:[{text:'Theme contrast runtime unavailable'}],ok:false};
          contrastModes.push({mode,checked:contrast.checked||0,issues:contrast.issues||[],ok:contrast.ok===true});
        }
      }finally{
        if(Theme?.current?.()!==originalMode){Theme?.set?.(originalMode);await settle();}
      }
      const report=Theme?.coverage?.();assert(report?.contractVersion==='3.6.0','Theme Coverage Runtime / Contract 3.5 unavailable.');
      const partial=report.summary?.partial||0,unmanaged=report.summary?.unmanaged||0,broken=report.summary?.brokenMaterial||0,lowContrast=contrastModes.reduce((n,row)=>n+(row.issues?.length||0),0);
      if(partial||unmanaged||broken||lowContrast){const err=new Error(`Core Theme coverage incomplete: partial=${partial} unmanaged=${unmanaged} brokenMaterial=${broken} lowContrastControls=${lowContrast}`);err.data={responsibility:'core.theme',summary:{...report.summary,lowContrastControls:lowContrast},contrast:report.contrast||null,contrastModes,areas:(report.core||[]).filter(row=>['partial','unmanaged'].includes(row.status)||row.brokenMaterial>0).map(row=>({id:row.id,label:row.label,role:row.role,count:row.count,managed:row.managed,status:row.status,renderStatus:row.renderStatus,brokenMaterial:row.brokenMaterial,render:row.render}))};throw err;}
      return {...report,contrastModes};
    });
    await runCase('ui.import-workbench','Import workbench selection & preview','UI / Import',async()=>{
      const smoke=window.DKDSAutomationHost?.runImportWorkbenchSmoke;
      assert(typeof smoke==='function','Host import-workbench automation smoke is unavailable.');
      return await smoke();
    });
    await runCase('plugins.activation','Plugin activation & registry','Plugins / Runtime',pluginSmoke);
    await runCase('plugins.external-packages','External plugin package conflicts','Plugins / External',externalPluginPackageSmoke);
    await runCase('plugin.resonance-contract','Resonance Workbench integration contract','Plugins / Resonance',()=>pluginContractSmoke('builtin.resonance-workbench'));
    await runCase('plugin.ter-contract','TER Analysis integration contract','Plugins / TER',()=>pluginContractSmoke('builtin.ter-analysis'));
    await runCase('types.contract','Scientific Data Contracts foundation','Data Contract / Foundation',dataTypeSmoke);
    await runCase('selection.contract','Typed Selection Contract','Data Contract',selectionContractSmoke);
    await runCase('artifacts.roundtrip','Artifact Store & lineage round-trip','Data Contract',artifactRoundTripSmoke);
    await runCase('data.sources.lifecycle','Project source data lifecycle','Data Contract',dataSourceLifecycleSmoke);
    await runCase('project.history','Unified project undo / redo contract','Data Contract',projectHistoryContractSmoke);
    await runCase('reactive.contract','Scientific Reactive Dependency','Data Contract',scientificReactiveSmoke);
    await runCase('pipeline.contract','Scientific Data Pipeline','Data Contract',scientificPipelineSmoke);
    await runCase('transforms.registry','Scientific Transform Registry & Scalar Field','Data Contract',scientificTransformRegistrySmoke);
    await runCase('scalar-field.shared','Core Scientific Scalar Field renderer','Data Contract / Core',scientificScalarFieldSmoke);
    await runCase('algorithms.registry','Scientific Algorithm Registry & Version Lock','Data Contract',scientificAlgorithmRegistrySmoke);
    await runCase('algorithms.version-management','Algorithm default / lock / missing-version management','Data Contract',scientificAlgorithmVersionManagementSmoke);
    await runCase('algorithms.package-catalog','Algorithm Package Catalog & compatibility','Data Contract',scientificAlgorithmPackageCatalogSmoke);
    await runCase('algorithms.transport-ter','Transport / Scalar Field / TER Algorithm Providers','Data Contract',scientificTransportAlgorithmProvidersSmoke);
    await runCase('project.roundtrip','Project format round-trip','Project',projectFormatSmoke);
    await runCase('science.transforms','Scientific transform smoke','Science',scienceTransformSmoke);
    await runCase('plot.renderer','Core D3 renderer smoke','UI / Plot',rendererPlotSmoke);
    await runCase('plot.interactions','ScientificPlot shared interaction controllers','UI / Plot',scientificPlotInteractionSmoke);
    await runCase('table.surface','Unified TableSurface interaction contract','UI / Table',tableSurfaceSmoke);
    await runCase('performance.render-scheduling','Scientific multi-view render scheduling','Performance',interactionRenderSchedulingSmoke);
    await runCase('performance.cache','Performance cache & render dedupe','Performance',performanceCacheSmoke);
    await runCase('performance.lifecycle','Performance cache policy & lifecycle trim','Performance',performanceLifecycleSmoke);
    await runCase('performance.resources','Renderer & resource lifecycle','Performance',performanceResourceLifecycleSmoke);

    const currentProjectPayload=window.DKDSAutomationHost?.currentProjectWindowSmokePayload?.()||null;
    const currentProjectSummary=currentProjectPayload?.summary||null;
    const resonanceWorkspace=currentProjectPayload?.project?.plugins?.['builtin.resonance-workbench']?.workspace||null;
    const resonancePeaks=Array.isArray(resonanceWorkspace?.peaks)?resonanceWorkspace.peaks:[];
    if(resonancePeaks.length&&window.DKDSScience?.buildSweeps){
      await runCase('project.resonance-groups','Current project → Resonance group-data integrity','Project / Science',async()=>{
        const datasets=window.DKDSData?.transportDatasetsFromArtifacts?.(currentProjectPayload?.project?.dataModel?.artifacts||[],{consumer:'builtin.resonance-workbench'})||[];
        const sweeps=[];for(const dataset of datasets){try{sweeps.push(...(window.DKDSScience.buildSweeps(dataset)||[]));}catch{}}
        const byId=new Map(sweeps.map(row=>[String(row.id),row]));
        const visibility=new Map((resonanceWorkspace.scanVisibility||[]).map(([path,value])=>[String(path),{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
        const visibleSweeps=sweeps.filter(sw=>{const row=visibility.get(String(sw.datasetPath));return row?(Number(sw.direction)>0?row.forward!==false:row.reverse!==false):true;});
        const visibleIds=new Set(visibleSweeps.map(row=>String(row.id)));
        const accepted=resonancePeaks.filter(row=>row?.accepted!==false);
        const unresolved=accepted.filter(row=>!byId.has(String(row?.sweepId||'')));
        const visibleAccepted=accepted.filter(row=>visibleIds.has(String(row?.sweepId||'')));
        if(visibleAccepted.length){
          const Shared=window.DKDSPluginModules?.get?.('builtin.resonance-workbench','workbench-shared');
          if(Shared?.createController){
            const service={
              getState:()=>({workspace:resonanceWorkspace,datasets,sweeps,peaks:resonancePeaks}),
              visibleSweepIds:()=>[...visibleIds],sweepById:id=>byId.get(String(id))||null,
              peakLabel:peak=>String(peak?.peakLabel||`峰${Math.max(1,Math.round(Number(peak?.peakOrder)||1))}`),
              directionName:dir=>Number(dir)>0?'正扫':'反扫',
              metrics:(peak)=>({vg:Number(peak?.vg),v:Number(peak?.v),i:Number(peak?.i)})
            };
            const model=Shared.createController(service,{science:window.DKDSScience}).buildTrendModel();
            assert(Array.isArray(model?.series)&&model.series.length>0,`Resonance group model is empty despite ${visibleAccepted.length} visible accepted peak(s).`);
            return {datasets:datasets.length,sweeps:sweeps.length,peaks:accepted.length,unresolvedSavedPeaks:unresolved.length,visiblePeaks:visibleAccepted.length,groupSeries:model.series.length,groupPoints:model.series.reduce((sum,row)=>sum+(row.points?.length||0),0)};
          }
        }
        return {datasets:datasets.length,sweeps:sweeps.length,peaks:accepted.length,unresolvedSavedPeaks:unresolved.length,visiblePeaks:visibleAccepted.length,groupSeries:visibleAccepted.length?null:0,groupPoints:visibleAccepted.length?null:0};
      });
    }else{
      await runCase('project.resonance-groups','Current project → Resonance group-data integrity','Project / Science',async()=>{}, {skip:true,skipReason:'当前工程没有已保存共振峰，无需执行组图完整性检查。'});
    }
    if(window.electronAPI?.diagnosticsRunActivitySmoke&&resonancePeaks.length&&currentProjectPayload?.project){
      await runCase('project.resonance-live','Current project → live Resonance restore','Project / Electron',async()=>{
        const capabilitySnapshot=currentProjectPayload.capabilitySnapshot||window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
        const out=await window.electronAPI.diagnosticsRunActivitySmoke({
          activityId:'resonance',project:currentProjectPayload.project,artifactSnapshot:currentProjectPayload.artifactSnapshot,
          capabilitySnapshot,capabilityRevision:Number(capabilitySnapshot?.revision)||0
        });
        assert(out?.ok,`Resonance current-project smoke failed: ${out?.error||'renderer did not reach ready'}`);
        const actual=out?.rendererData?.resonanceGroupDiagnostics||null;
        assert(actual,`Resonance dedicated renderer did not expose live group diagnostics.`);
        assert(Number(actual.unresolvedPeaks)===0,`Live Resonance runtime still has orphaned saved peaks. unresolved=${actual.unresolvedPeaks}/${actual.peaks}`);
        assert(Number(actual.matchedPeaks)>0,`Live Resonance runtime restored ${actual.peaks||0} peak(s) but matched none to visible rebuilt sweeps.`);
        assert(Number(actual.series)>0&&Number(actual.seriesPoints)>0,`Live Resonance runtime group model is empty. matched=${actual.matchedPeaks||0} series=${actual.series||0}`);
        return {renderer:clone(actual),durationMs:Number(out.durationMs)||0};
      });
    }else{
      await runCase('project.resonance-live','Current project → live Resonance restore','Project / Electron',async()=>{}, {skip:true,skipReason:'当前工程没有已保存共振峰或当前环境无法启动独立 Resonance renderer。'});
    }
    if(window.electronAPI?.diagnosticsRunActivitySmoke&&currentProjectSummary&&Number(currentProjectSummary.artifactCount)>0){
      await runCase('project.data-center-live','Current project → Data Center live hydration','Project / Electron',async()=>{
        const capabilitySnapshot=currentProjectPayload.capabilitySnapshot||window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
        const out=await window.electronAPI.diagnosticsRunActivitySmoke({
          activityId:'data-center',
          project:currentProjectPayload.project,
          artifactSnapshot:currentProjectPayload.artifactSnapshot,
          capabilitySnapshot,
          capabilityRevision:Number(capabilitySnapshot?.revision)||0
        });
        assert(out?.ok,`Data Center current-project smoke failed: ${out?.error||'renderer did not reach ready'}`);
        const actual=out?.rendererData||{};
        const expected=currentProjectSummary;
        assert(actual.projectHydrated===true&&actual.activityOpened===true,'Data Center renderer reached ready without a hydrated/open project lifecycle.');
        assert(Number(actual.projectDatasetCount)===Number(expected.datasetCount),`Data Center project dataset count mismatch. expected=${expected.datasetCount} actual=${actual.projectDatasetCount}`);
        assert(Number(actual.artifactCount)===Number(expected.artifactCount),`Data Center Artifact Store mismatch. expected=${expected.artifactCount} actual=${actual.artifactCount}`);
        assert(Number(actual.dataTableCount)===Number(expected.dataTableCount),`Data Center DataTable count mismatch. expected=${expected.dataTableCount} actual=${actual.dataTableCount}`);
        assert(Number(actual.totalTableRows)===Number(expected.totalTableRows),`Data Center row count mismatch. expected=${expected.totalTableRows} actual=${actual.totalTableRows}`);
        assert(Number(actual.renderedArtifactRows)===Number(expected.artifactCount),`Data Center UI did not render every hydrated Artifact row. expected=${expected.artifactCount} actual=${actual.renderedArtifactRows}`);
        if(Number(expected.dataTableCount)>0){
          assert(actual.dataCenterChartRuntimeReady===true,`Data Center chart runtime did not reach ready. status=${actual.dataCenterChartRuntimeStatus||'unknown'} error=${actual.dataCenterChartRuntimeError||''}`);
          assert(Number(actual.dataCenterChartTraceCount)>0,`Data Center chart preview did not render any scientific trace. provider=${actual.dataCenterChartProvider||'none'}`);
        }
        return {expected:clone(expected),renderer:clone(actual),configuredPrewarm:out.configuredPrewarm===true,durationMs:Number(out.durationMs)||0};
      });
    }else{
      await runCase('project.data-center-live','Current project → Data Center live hydration','Project / Electron',async()=>{}, {skip:true,skipReason:'当前工程没有数据对象，无法执行真实工程 Data Center hydration；普通 TOP renderer 测试仍会继续。'});
    }

    const tops=enabledTopActivities();let testedTopCount=0,passedTopCount=0;const topOutcomes=[];
    if(window.electronAPI?.diagnosticsRunActivitySmoke){
      if(!tops.length)await runCase('top.none','TOP independent renderer discovery','TOP / Electron',async()=>{throw new Error('No enabled TOP activity was discovered; this would leave the independent renderer path untested.');});
      for(const top of tops){
        const row=await runCase(`top.${top.activityId}`,`TOP renderer · ${top.name||top.pluginId}`,'TOP / Electron',async()=>{
          testedTopCount+=1;const capabilitySnapshot=currentProjectPayload?.capabilitySnapshot||window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;const out=await window.electronAPI.diagnosticsRunActivitySmoke({activityId:top.activityId,capabilitySnapshot,capabilityRevision:Number(capabilitySnapshot?.revision)||0});
          if(!out?.ok){const error=new Error(`${out?.pluginId||top.pluginId}: ${out?.error||'TOP smoke failed.'}`);error.data=out;throw error;}assert(out?.lifecycle?.tested&&out?.lifecycle?.ok,`${out?.pluginId||top.pluginId}: TOP hide/reuse lifecycle failed.`);assert(out?.rendererData?.themeRenderer?.renderer?.backdropBlur===true&&out?.rendererData?.themeRenderer?.recipes?.['thin-glass']===true,`${out?.pluginId||top.pluginId}: dedicated TOP Thin Glass material renderer capability missing.`);const materialStatus=String(out?.rendererData?.themeMaterialProbe?.status||'');assert(!['BROKEN_MATERIAL_RENDERER','BROKEN_OPTICAL_RENDERER','ROLE_MISSING','RECIPE_MISSING','BACKDROP_FILTER_NONE','ENGINE_UNSUPPORTED'].includes(materialStatus),`${out?.pluginId||top.pluginId}: dedicated TOP material probe failed (${materialStatus||'missing'}).`);return {...out,isSuper:top.isSuper,hadWindow:top.hadWindow,algorithmCategories:top.algorithmCategories};
        });
        if(row.status==='pass')passedTopCount+=1;
        topOutcomes.push({pluginId:top.pluginId,activityId:top.activityId,status:row.status,detail:row.detail||''});
      }
      await runCase('top.coverage','TOP renderer coverage','TOP / Electron',async()=>{
        assert(testedTopCount===tops.length,`Only ${testedTopCount}/${tops.length} TOP renderers were exercised.`);
        assert(passedTopCount===tops.length,`${tops.length-passedTopCount}/${tops.length} TOP renderer(s) failed readiness.`);
        return {discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:tops.length-passedTopCount,activities:tops.map(row=>row.activityId)};
      });
      const topCoverageComplete=testedTopCount===tops.length&&passedTopCount===tops.length;
      const topDependencySkip={skip:!topCoverageComplete,skipReason:`TOP readiness incomplete (${passedTopCount}/${tops.length}); dependent profiler was not evaluated.`};
      await runCase('top.startup-profile','TOP startup phase profiling','TOP / Performance',async()=>{
        const rows=state.results.filter(row=>row.id?.startsWith?.('top.')&&!['top.coverage','top.startup-profile'].includes(row.id)&&row.status==='pass');
        assert(rows.length===tops.length,`Startup profiler only received ${rows.length}/${tops.length} successful TOP rows.`);
        const domainRuntimes=['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime'];
        const profiles=rows.map(row=>{
          const profile=row.data?.startupProfile,renderer=profile?.renderer,main=profile?.main||{};
          assert(renderer&&/^1\.(0|1)\.0$/.test(String(renderer.version||'')),`${row.id}: renderer startup profile missing.`);
          assert(Number.isFinite(Number(renderer.totalMs))&&renderer.totalMs>=0,`${row.id}: renderer startup total is invalid.`);
          assert(Array.isArray(renderer.dependencies)&&renderer.dependencies.length>0,`${row.id}: dependency phase timings missing.`);
          const loaded=new Set(renderer.dependencies.map(item=>String(item?.name||'')));
          const declared=new Set((row.data?.dependencies||[]).map(String));
          for(const runtime of domainRuntimes)assert(loaded.has(runtime)===declared.has(runtime),`${row.id}: ${runtime} load did not follow the resolved Core contract.`);
          const chartRuntime=renderer.chartRuntime||null;
          assert(chartRuntime&&chartRuntime.version===window.DKDSCharts?.VERSION,`${row.id}: Core Chart Runtime lazy-loader snapshot missing or stale. expected=${window.DKDSCharts?.VERSION||'unknown'} actual=${chartRuntime?.version||'missing'}`);
          assert(chartRuntime.preferredRenderer==='d3'&&chartRuntime.renderer==='d3',`${row.id}: D3 must be the only scientific renderer.`);
          assert(chartRuntime.singleBackend===true,`${row.id}: scientific chart runtime must report a single backend.`);
          assert(!declared.has('d3'),`${row.id}: plugin contract must remain renderer-vendor neutral.`);
          return {activityId:row.data?.activityId||row.id.slice(4),pluginId:row.data?.pluginId||'',readyMs:Number(row.data?.durationMs)||0,rendererTotalMs:Number(renderer.totalMs)||0,navigationMs:Number(main.navigationMs)||0,createToReadyMs:Number(main.createToReadyMs)||0,dependencyCount:Number(renderer.dependencyCount)||renderer.dependencies.length,scriptCount:Number(renderer.scriptCount)||renderer.scripts?.length||0,domainRuntimes:domainRuntimes.filter(id=>loaded.has(id)),algorithmProviders:clone(renderer.algorithmProviders||[]),chartRuntime:clone(chartRuntime),phases:(renderer.phases||[]).map(item=>({name:item.name,durationMs:item.durationMs})),slowDependencies:renderer.dependencies.slice().sort((a,b)=>(Number(b.durationMs)||0)-(Number(a.durationMs)||0)).slice(0,5).map(item=>({name:item.name,durationMs:item.durationMs}))};
        });
        return {profiles};
      },topDependencySkip);
      await runCase('top.d3-single-backend','TOP D3 single-backend runtime contract','TOP / Performance',async()=>{
        const rows=state.results.filter(row=>row.id?.startsWith?.('top.')&&!['top.coverage','top.startup-profile','top.d3-single-backend'].includes(row.id)&&row.status==='pass');
        const profiles=rows.map(row=>{
          const renderer=row.data?.startupProfile?.renderer||{},declared=new Set((row.data?.dependencies||[]).map(String)),chart=renderer.chartRuntime||{};
          assert(chart.version===window.DKDSCharts?.VERSION,`${row.id}: Chart Runtime state missing or stale. expected=${window.DKDSCharts?.VERSION||'unknown'} actual=${chart?.version||'missing'}`);
          assert(chart.preferredRenderer==='d3'&&chart.renderer==='d3'&&chart.singleBackend===true,`${row.id}: dedicated scientific charts must use the D3 singleton backend.`);
          assert(!declared.has('d3'),`${row.id}: plugin dependency declaration must remain vendor-neutral.`);
          return {activityId:row.data?.activityId||row.id.slice(4),renderer:chart.renderer||'',ready:!!chart.ready,d3Ready:!!chart.d3Ready,singleBackend:chart.singleBackend===true};
        });
        assert(profiles.length===tops.length,`D3 single-backend profiler only received ${profiles.length}/${tops.length} TOP rows.`);
        return {profiles};
      },topDependencySkip);
      await runCase('top.algorithm-providers','TOP local Algorithm Provider routing','TOP / Performance',async()=>{
        const diag=window.DKDSPlugins?.diagnostics?.()||{};
        const availableProviders=(diag.plugins||[]).filter(row=>row?.enabled&&row?.algorithmProvider===true&&Array.isArray(row?.algorithmCategories)&&row.algorithmCategories.length);
        const profiles=tops.map(top=>{
          const result=state.results.find(row=>row.id===`top.${top.activityId}`&&row.status==='pass');
          assert(result,`top.${top.activityId}: successful TOP result missing for provider routing.`);
          const targetCategories=new Set((top.algorithmCategories||[]).map(String));
          const loaded=result.data?.startupProfile?.renderer?.algorithmProviders||[];
          const expected=availableProviders.filter(provider=>(provider.algorithmCategories||[]).some(category=>targetCategories.has(String(category)))).map(provider=>String(provider.id)).sort();
          const actual=loaded.map(provider=>String(provider.pluginId||'')).filter(Boolean).sort();
          assert(JSON.stringify(actual)===JSON.stringify(expected),`top.${top.activityId}: local Algorithm Providers do not match declared algorithm categories. expected=${expected.join(',')} actual=${actual.join(',')}`);
          for(const provider of loaded)assert((provider.categories||[]).some(category=>targetCategories.has(String(category))),`top.${top.activityId}: loaded unrelated Algorithm Provider ${provider.pluginId}.`);
          return {activityId:top.activityId,pluginId:top.pluginId,categories:[...targetCategories],expectedProviders:expected,loadedProviders:loaded.map(provider=>({pluginId:provider.pluginId,version:provider.version,categories:[...(provider.categories||[])],source:provider.source||''}))};
        });
        return {profiles};
      },topDependencySkip);
    }else{
      await runCase('top.unsupported','TOP independent renderer smoke','TOP / Electron',async()=>{}, {skip:true,skipReason:'当前运行环境没有 Electron 独立窗口测试接口。'});
    }

    const runtimeErrors=state.consoleEvents.slice(errorStart);
    await runCase('runtime.errors','Unhandled runtime errors during test','Runtime Log',async()=>{assert(!runtimeErrors.length,`${runtimeErrors.length} unhandled runtime error(s) captured during test.`);return {count:runtimeErrors.length};});

    const finishedAt=new Date().toISOString();
    const counts={pass:state.results.filter(r=>r.status==='pass').length,fail:state.results.filter(r=>r.status==='fail').length,skip:state.results.filter(r=>r.status==='skip').length,total:state.results.length};
    const pluginDiag=window.DKDSPlugins?.diagnostics?.()||{};
    // Deliberately exclude project contents, imported experimental values and
    // file paths. The report is safe to send for debugging without exporting
    // the user's scientific data.
    const topReadyMs=state.results.filter(row=>row.id?.startsWith?.('top.')&&row.id!=='top.coverage'&&row.status==='pass'&&Number.isFinite(Number(row.data?.durationMs))).map(row=>Number(row.data.durationMs));
    const performanceSnapshot=window.DKDSPerformance?.snapshot?.()||null;
    let postEnvironment=environment;try{postEnvironment=await (window.electronAPI?.diagnosticsGetEnvironment?.()||Promise.resolve(environment));}catch{}
    const startMemory=environment?.memory||{},endMemory=postEnvironment?.memory||{};
    const memoryTrend={startWorkingSetBytes:Number(startMemory.workingSetBytes)||0,endWorkingSetBytes:Number(endMemory.workingSetBytes)||0,workingSetDeltaBytes:(Number(endMemory.workingSetBytes)||0)-(Number(startMemory.workingSetBytes)||0),startPrivateBytes:Number(startMemory.privateBytes)||0,endPrivateBytes:Number(endMemory.privateBytes)||0,privateDeltaBytes:(Number(endMemory.privateBytes)||0)-(Number(startMemory.privateBytes)||0),startProcessCount:Number(environment?.processCount)||0,endProcessCount:Number(postEnvironment?.processCount)||0};
    const report={schema:1,kind:'dkds.automation-test-report',runnerVersion:VERSION,appVersion:document.querySelector('.version')?.textContent?.replace(/^v/,'')||'',startedAt,finishedAt,counts,environment,results:clone(state.results),runtimeErrors:clone(runtimeErrors),coverage:{topRenderers:{discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:Math.max(0,tops.length-passedTopCount),activities:tops.map(row=>({pluginId:row.pluginId,activityId:row.activityId,isSuper:row.isSuper,hadWindow:row.hadWindow})),outcomes:topOutcomes},scientificPlotControllers:[...(window.DKDSScientificPlot?.CONTROLLERS||[])],scientificReactive:clone(state.results.find(row=>row.id==='reactive.contract')?.data||null),scientificPipeline:clone(state.results.find(row=>row.id==='pipeline.contract')?.data||null),scientificTransforms:clone(state.results.find(row=>row.id==='transforms.registry')?.data||null),scientificScalarField:clone(state.results.find(row=>row.id==='scalar-field.shared')?.data||null),scientificAlgorithms:clone(state.results.find(row=>row.id==='algorithms.registry')?.data||null),scientificAlgorithmVersionManagement:clone(state.results.find(row=>row.id==='algorithms.version-management')?.data||null),scientificAlgorithmPackageCatalog:clone(state.results.find(row=>row.id==='algorithms.package-catalog')?.data||null),scientificTransportAlgorithms:clone(state.results.find(row=>row.id==='algorithms.transport-ter')?.data||null),performance:{runtime:performanceSnapshot,topReadyMs,topReadyAverageMs:topReadyMs.length?topReadyMs.reduce((sum,value)=>sum+value,0)/topReadyMs.length:null,topStartupProfiles:clone(state.results.find(row=>row.id==='top.startup-profile')?.data?.profiles||[]),topD3SingleBackend:clone(state.results.find(row=>row.id==='top.d3-single-backend')?.data?.profiles||[]),topAlgorithmProviders:clone(state.results.find(row=>row.id==='top.algorithm-providers')?.data?.profiles||[]),memoryTrend,resourceLifecycle:clone(state.results.find(row=>row.id==='performance.resources')?.data||null)}},plugins:{apiVersion:pluginDiag.apiVersion,plugins:(pluginDiag.plugins||[]).map(row=>({id:row.id,name:row.name,version:row.version,status:row.status,enabled:row.enabled,active:row.active,workspaceRole:row.workspaceRole,workspaceActivity:row.workspaceActivity,topContractReady:row.topContractReady,isSuper:row.isSuper,hasWindow:row.hasWindow,algorithmProvider:row.algorithmProvider===true,algorithmCategories:Array.isArray(row.algorithmCategories)?row.algorithmCategories.slice():[]})),externalErrors:pluginDiag.external?.errors||[],overrideErrors:pluginDiag.overrides?.errors||[]},dataTypes:{count:window.DKDSUI?.dataTypes?.list?.().length||0,validation:window.DKDSUI?.dataTypes?.validate?.()||null}};
    state.latest=report;
    try{
      if(window.electronAPI?.diagnosticsWriteAutomationReport){
        const saved=await window.electronAPI.diagnosticsWriteAutomationReport(report);state.reportPath=saved?.path||'';report.saved=saved||null;
      }else if(window.electronAPI?.saveText){
        const name=`dkds-automation-${report.appVersion||'runtime'}-${finishedAt.replace(/[:.]/g,'-')}.json`;
        await window.electronAPI.saveText({defaultName:name,content:JSON.stringify(report,null,2)});report.saved={name,portable:true};
      }
    }catch(err){report.saveError=sanitizeText(err?.message||String(err));}
    state.running=false;render();
    state.host?.setStatus?.(counts.fail?`自动化测试完成：${counts.fail} 项失败。请发送测试日志。`:`自动化测试通过：${counts.pass} 项通过${counts.skip?`，${counts.skip} 项跳过`:''}。`);
    return report;
  }

  function badge(status){return status==='pass'?'通过':status==='fail'?'失败':status==='skip'?'跳过':'运行中';}
  function renderResults(){
    const host=$('#automationTestResults');if(!host)return;
    if(!state.results.length){host.innerHTML='<div class="automation-empty">尚未运行测试。</div>';return;}
    host.innerHTML=state.results.map(row=>`<div class="automation-test-row ${row.status}"><span class="automation-test-status">${badge(row.status)}</span><div class="automation-test-main"><strong>${escapeHtml(row.title)}</strong><span>${escapeHtml(row.group)} · ${row.durationMs||0} ms</span>${row.detail?`<small>${escapeHtml(row.detail)}</small>`:''}</div></div>`).join('');
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function render(){
    renderResults();
    const run=$('#automationTestRunBtn');if(run){run.disabled=state.running;run.textContent=state.running?'正在运行…':'运行全部自动化测试';}
    const summary=$('#automationTestSummary');if(summary){const c=state.latest?.counts;summary.textContent=state.running?'正在执行真实运行时检查，包括已启用 TOP 的独立窗口启动。':c?`最近结果：${c.pass} 通过 · ${c.fail} 失败 · ${c.skip} 跳过 · 共 ${c.total} 项`:'测试不会读取或导出当前工程中的实验数据。';}
    const path=$('#automationTestLogPath');if(path)path.textContent=state.reportPath?`日志已自动保存：${sanitizeText(state.reportPath)}`:(state.latest?'日志已生成。浏览器 / Android 模式下由系统保存对话框接管。':'');
    const copy=$('#automationTestCopyBtn');if(copy)copy.disabled=!state.latest;
    const folder=$('#automationTestFolderBtn');if(folder)folder.disabled=!window.electronAPI?.diagnosticsOpenFolder;
  }

  async function copyLatest(){if(!state.latest)return false;const text=JSON.stringify(state.latest,null,2);await (window.electronAPI?.copyText?.(text)||navigator.clipboard.writeText(text));state.host?.setStatus?.('自动化测试日志已复制。');return true;}
  async function openFolder(){if(!window.electronAPI?.diagnosticsOpenFolder)return false;await window.electronAPI.diagnosticsOpenFolder();return true;}
  function open(){state.host?.openAnalysisPage?.('automationTestPage');render();}

  function bind(){
    if(state.bound)return;state.bound=true;
    $('#automationTestBtn')?.addEventListener('click',open);
    $('#automationTestRunBtn')?.addEventListener('click',()=>void runAll());
    $('#automationTestCopyBtn')?.addEventListener('click',()=>void copyLatest());
    $('#automationTestFolderBtn')?.addEventListener('click',()=>void openFolder());
  }
  function configure(host={}){state.host=host||{};bind();render();return api;}

  const api=Object.freeze({VERSION,configure,open,run:runAll,latest:()=>clone(state.latest),results:()=>clone(state.results),render});
  window.DKDSAutomationTests=api;
})();
