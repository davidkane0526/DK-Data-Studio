(() => {
  if (window.DKDSAutomationTests) return;

  const VERSION='1.4.0';
  const state={host:null,running:false,results:[],latest:null,reportPath:'',bound:false,consoleEvents:[]};
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
      row.data=err?.stack?{stack:sanitizeText(err.stack)}:null;
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
      .map(row=>({pluginId:row.id,activityId:row.workspaceActivity,name:row.name||row.id,isSuper:!!row.isSuper,hadWindow:!!row.hasWindow}));
  }

  async function rendererPlotSmoke(){
    if(!window.Plotly?.react)throw new Error('Plotly runtime unavailable.');
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:360px;height:240px;pointer-events:none;';
    document.body.appendChild(host);
    try{
      await window.Plotly.react(host,[{x:[0,1,2],y:[1,3,2],mode:'lines+markers',name:'smoke'}],{width:360,height:240,margin:{l:40,r:20,t:20,b:35}},{displayModeBar:false,staticPlot:true});
      assert(host.querySelector('.plot-container,svg.main-svg'),'Plotly did not create a rendered graph.');
      return {svgCount:host.querySelectorAll('svg').length};
    }finally{
      try{window.Plotly.purge?.(host);}catch{}
      host.remove();
    }
  }

  async function scientificPlotInteractionSmoke(){
    const ui=window.DKDSUI;assert(ui?.createScope,'Core UI infrastructure unavailable.');
    const host=document.createElement('div');host.id=`automationScientificPlot-${Date.now()}`;host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:360px;height:240px;pointer-events:none;';document.body.appendChild(host);
    const scope=ui.createScope('core.automation-scientific-plot');
    try{
      const interaction=scope.interactionRuntime.create('plot',{selection:{multiple:true,defaultType:'data.series'},defaultType:'data.series'});
      const plotData=[{x:[0,1,2],y:[1,3,2],mode:'lines+markers',name:'A',entityId:'automation.plot:A'},{x:[0,1,2],y:[2,1,4],mode:'lines+markers',name:'B',entityId:'automation.plot:B'}];
      const plotLayout={width:360,height:240,margin:{l:40,r:20,t:20,b:35},showlegend:true};
      const plotSpec={interaction,source:'automation-scientific-plot',renderKey:'automation-static-v1',traceEntity:trace=>({id:trace.entityId,type:'data.series',label:trace.name}),pinPolicy:{enabled:true}};
      const view=await scope.scientificPlot.react(host,plotData,plotLayout,{displayModeBar:false,staticPlot:true},plotSpec);
      await scope.scientificPlot.react(host,plotData,plotLayout,{displayModeBar:false,staticPlot:true},plotSpec);
      const renderStats=scope.scientificPlot.stats(host);assert(renderStats?.skippedReacts>=1,'ScientificPlot did not skip an unchanged renderKey.');
      assert(view?.controllers,'ScientificPlot controller surface unavailable.');
      const required=['selection','legend','tooltip','focus','pin','viewport','export'];for(const name of required)assert(view.controllers[name],`ScientificPlot controller missing: ${name}`);
      view.controllers.pin.pin('automation.plot:A',{source:'automation'});assert(view.controllers.pin.has('automation.plot:A'),'Pin controller did not retain the entity.');
      view.controllers.pin.unpin('automation.plot:A',{source:'automation'});assert(!view.controllers.pin.has('automation.plot:A'),'Pin controller did not release the entity.');
      await view.controllers.viewport.set({xRange:[0.25,1.75]},{source:'automation'});const viewport=view.controllers.viewport.get();assert(Array.isArray(viewport.xRange)&&viewport.xRange.length===2,'Viewport controller did not retain the X range.');
      await view.controllers.viewport.reset({source:'automation'});assert(view.controllers.viewport.get()?.xRange===null,'Viewport reset did not restore autorange state.');
      assert(view.controllers.legend.state().length===2,'Legend controller did not expose rendered traces.');
      assert(view.controllers.tooltip.theme()?.bgcolor,'Tooltip controller did not expose the Core theme.');
      return {controllers:required,pins:view.controllers.pin.list().length,legendEntries:view.controllers.legend.state().length,viewportRevision:view.controllers.viewport.get()?.revision||0,renderStats};
    }finally{try{scope.dispose?.();}catch{}try{window.Plotly?.purge?.(host);}catch{}host.remove();}
  }

  function performanceCacheSmoke(){
    const perf=window.DKDSPerformance;assert(perf?.memo&&perf?.snapshot,'Performance Runtime unavailable.');
    perf.clear('automation.memo');perf.resetMetrics('automation.memo');let calls=0;
    const first=perf.memo('automation.memo','same-input',()=>{calls+=1;return {value:42};},{limit:4});
    const second=perf.memo('automation.memo','same-input',()=>{calls+=1;return {value:99};},{limit:4});
    assert(calls===1,'Memo cache recomputed an unchanged input.');assert(first?.value===42&&second?.value===42,'Memo cache did not preserve the cached result.');
    const row=perf.snapshot().namespaces.find(item=>item.namespace==='automation.memo');assert(row?.hits>=1&&row?.misses>=1,'Performance cache metrics are incomplete.');
    return {hits:row.hits,misses:row.misses,computes:row.computes,hitRate:row.hitRate};
  }

  function performanceLifecycleSmoke(){
    const perf=window.DKDSPerformance;assert(perf?.stage&&perf?.configure&&perf?.trim,'Performance lifecycle API unavailable.');
    const ns='automation.lifecycle';perf.clear(ns);perf.resetMetrics(ns);
    const configured=perf.configure(ns,{limit:3,ttlMs:0});assert(configured.limit===3,'Namespace cache policy was not applied.');
    let calls=0;for(let i=0;i<4;i++)perf.stage(ns,`rev-${i}`,'params',()=>{calls+=1;return {i};});
    assert(calls===4,'Stage cache did not compute each distinct source revision.');
    const before=perf.metric(ns);assert(before.entries===3&&before.evictions>=1,'LRU entry budget did not evict the oldest stage result.');
    const trimmed=perf.trim(ns,{targetEntries:1,reason:'automation'});const after=perf.metric(ns);
    assert(trimmed.removed===2&&after.entries===1,'Explicit cache trim did not reduce the namespace to its target budget.');
    assert(after.trims>=1&&after.trimmedEntries>=2,'Trim metrics were not recorded.');
    return {policy:configured,entriesBefore:before.entries,entriesAfter:after.entries,evictions:after.evictions,trims:after.trims,trimmedEntries:after.trimmedEntries};
  }

  async function performanceResourceLifecycleSmoke(){
    const perf=window.DKDSPerformance,ui=window.DKDSUI;assert(perf?.memo&&ui?.createScope,'Resource lifecycle runtime unavailable.');
    const ns='automation.resource-dispose';perf.clear(ns);perf.resetMetrics(ns);perf.configure(ns,{limit:1,ttlMs:0});
    const disposed=[];const dispose=(value,meta)=>disposed.push({id:value?.id||'',reason:meta?.reason||''});
    perf.memo(ns,'a',()=>({id:'a'}),{dispose});perf.memo(ns,'b',()=>({id:'b'}),{dispose});
    assert(disposed.some(row=>row.id==='a'&&row.reason==='lru'),'Cache eviction did not dispose the released resource.');
    perf.trim(ns,{targetEntries:0,reason:'automation-trim'});const metric=perf.metric(ns);
    assert(disposed.some(row=>row.id==='b'&&row.reason==='automation-trim'),'Cache trim did not dispose the retained resource.');
    assert(metric.disposedEntries>=2&&!metric.disposeErrors,'Resource disposal metrics are incomplete.');

    const host=document.createElement('div');host.id=`automationResourcePlot-${Date.now()}`;host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:360px;height:240px;pointer-events:none;';document.body.appendChild(host);
    const scope=ui.createScope('core.automation-resource-lifecycle');
    try{
      const interaction=scope.interactionRuntime.create('plot',{selection:{multiple:true,defaultType:'data.series'},defaultType:'data.series'});
      const data=[{x:[0,1,2],y:[1,2,1],mode:'lines+markers',name:'A',entityId:'automation.resource:A'},{x:[0,1,2],y:[2,1,3],mode:'lines+markers',name:'B',entityId:'automation.resource:B'}];
      const spec={interaction,renderKey:'automation-resource-v1',traceEntity:trace=>({id:trace.entityId,type:'data.series',label:trace.name}),pinPolicy:{enabled:true}};
      const view=await scope.scientificPlot.react(host,data,{width:360,height:240,margin:{l:40,r:20,t:20,b:35}},{displayModeBar:false,staticPlot:true},spec);
      view.controllers.pin.pin('automation.resource:A',{source:'automation'});await view.controllers.viewport.set({xRange:[0.2,1.8]},{source:'automation'});
      const before=view.lifecycleState();await view.suspend({purgeManaged:true,reason:'automation'});const hidden=view.lifecycleState();
      assert(hidden.suspended&&hidden.purged,'Managed ScientificPlot renderer was not purged during suspend.');assert(view.controllers.pin.has('automation.resource:A'),'Pin state was lost during renderer suspend.');
      await view.resume({reason:'automation'});const visible=view.lifecycleState();const viewport=view.controllers.viewport.get();
      assert(!visible.suspended&&!visible.purged&&visible.traceCount===2,'ScientificPlot renderer did not rebuild after resume.');assert(view.controllers.pin.has('automation.resource:A'),'Pin state was lost after renderer resume.');assert(Array.isArray(viewport.xRange)&&viewport.xRange[0]===0.2&&viewport.xRange[1]===1.8,'Viewport state was lost across renderer lifecycle.');
      await scope.lifecycle('hidden',{reason:'automation-scope'});const scopeHidden=scope.resizeScheduler?.state?.()||null;assert(scopeHidden?.suspended===true,'ResizeScheduler did not suspend with the UI scope.');
      await scope.lifecycle('visible',{reason:'automation-scope'});const scopeVisible=scope.resizeScheduler?.state?.()||null;assert(scopeVisible?.suspended===false,'ResizeScheduler did not resume with the UI scope.');
      const stats=view.performance();assert(stats.rendererPurges>=2&&stats.resumeRenders>=2,'ScientificPlot lifecycle metrics did not record renderer release/rebuild.');
      return {disposedEntries:metric.disposedEntries,disposeErrors:metric.disposeErrors,before,hidden,visible,resize:{hidden:scopeHidden,visible:scopeVisible},plotStats:stats};
    }finally{try{scope.dispose?.();}catch{}host.remove();perf.clear(ns);}
  }

  function selectionContractSmoke(){
    const ui=window.DKDSUI;assert(ui?.createScope,'Core UI infrastructure unavailable.');
    const scope=ui.createScope('core.automation-test');
    try{
      if(!ui.dataTypes.get('automation.synthetic-peak'))scope.dataTypes.register('automation.synthetic-peak',{title:'Synthetic peak',parent:'science.resonance.peak',kind:'result',key:v=>v.id});
      const source=scope.interactionRuntime.create('source',{selection:{multiple:true,defaultType:'automation.synthetic-peak'},defaultType:'automation.synthetic-peak'});
      const sink=scope.interactionRuntime.create('sink',{selection:{multiple:true,defaultType:'core.entity'},acceptTypes:['science.resonance.peak']});
      source.select({id:'p1',v:0.25,i:1e-9},{type:'automation.synthetic-peak'});
      const snapshot=source.get();
      assert(snapshot.focus?.type==='automation.synthetic-peak','Typed selection focus was not preserved.');
      assert(sink.accepts(snapshot.focus),'Canonical selection compatibility rejected a subtype.');
      sink.importSelection(snapshot,{acceptTypes:['science.resonance.peak']});
      assert(sink.get().focus?.id==='p1','Selection import did not preserve the selected entity.');
      return {sourceType:snapshot.focus.type,canonical:'science.resonance.peak'};
    }finally{scope.dispose?.();}
  }

  function artifactRoundTripSmoke(){
    const D=window.DKDSData;assert(D?.createStore&&D?.createSweep,'Data Model runtime unavailable.');
    const sweep=D.createSweep({id:'automation:sweep',name:'smoke',x:[0,0.1,0.2],y:[1e-9,2e-9,1.5e-9],xUnit:'V',yUnit:'A',direction:1});
    const transformed=D.createTransform({id:'automation:didv',name:'dI/dV',x:[0,0.1,0.2],y:[1e-8,2e-8,1e-8],xUnit:'V',yUnit:'A/V',transform:'didv',parents:[sweep.id]});
    const store=D.createStore([sweep,transformed]);
    const serialized=D.serializeStore(store,{includeTransient:true});
    const restored=D.restoreStore(serialized);
    assert(restored.size()===2,'Artifact Store round-trip changed artifact count.');
    assert(restored.parents(transformed.id)[0]?.id===sweep.id,'Artifact lineage was not restored.');
    return {artifacts:restored.size(),lineageParent:sweep.id};
  }

  function scienceTransformSmoke(){
    const science=window.DKDSScience;assert(science?.transformSweep,'Science transform runtime unavailable.');
    const points=[];for(let k=0;k<=40;k++){const v=-1+k*0.05;points.push({v,i:2e-9*v+8e-9*Math.exp(-(((v-.2)/.12)**2))});}
    const sweep={points};
    const keys=['raw','detrend','didv','d2idv2','dlog','dvdi','resistance'];
    const summary={};
    for(const key of keys){const out=science.transformSweep(sweep,key);const values=(out?.points||[]).map(point=>Number(point?.y));const finiteCount=values.filter(Number.isFinite).length;assert(out&&values.length===points.length&&finiteCount>=Math.max(3,Math.floor(points.length*.5)),`Transform ${key} returned invalid data.`);summary[key]={points:values.length,finite:finiteCount};}
    return summary;
  }

  function projectFormatSmoke(){
    const F=window.DKDSProjectFormat;assert(F?.serializeProject&&F?.parseProjectBytes,'Project format runtime unavailable.');
    const input={version:'automation',datasets:[],plugins:{'builtin.resonance-workbench':{workspace:{schema:1,activeView:'main'}}},dataModel:{schema:2,artifacts:[]}};
    const text=F.serializeProject(input);const parsed=F.parseProjectBytes(new TextEncoder().encode(text)).project;
    assert(parsed?.plugins?.['builtin.resonance-workbench'],'Plugin project slice was lost during round-trip.');
    return {bytes:text.length};
  }

  function dataTypeSmoke(){
    const types=window.DKDSUI?.dataTypes;assert(types,'Data Type Registry unavailable.');
    const required=['science.iv.raw','science.iv.background-removed','science.transport.didv','science.transport.d2idv2','science.transport.dlnabsidv','science.transport.dvdi','science.transport.resistance','science.resonance.peak','science.resonance.fwhm','science.ter.value','science.ter.matrix'];
    for(const id of required)assert(types.get(id),`Missing canonical data type: ${id}`);
    assert(types.isA('resonance.peak','science.resonance.peak'),'Resonance peak is not compatible with canonical resonance peak.');
    assert(types.isA('ter.matrix-point','science.ter.value'),'TER point is not compatible with canonical TER value.');
    const validation=types.validate?.()||{ok:true,errors:[]};assert(validation.ok,`Data Type Registry invalid: ${(validation.errors||[]).join('; ')}`);
    return {required:required.length,registered:types.list().length,validation};
  }

  function pluginSmoke(){
    const diag=window.DKDSPlugins?.diagnostics?.();assert(diag,'Plugin diagnostics unavailable.');
    const failures=(diag.plugins||[]).filter(row=>row?.enabled&&row?.status==='error');
    assert(!failures.length,`Enabled plugins with errors: ${failures.map(row=>row.id).join(', ')}`);
    assert((diag.active||[]).length>0,'No plugins are active.');
    return {definitions:(diag.definitions||[]).length,active:(diag.active||[]).length,disabled:Object.keys(diag.disabled||{}).length,registryKinds:Object.keys(diag.registries||{}).length};
  }

  async function runAll(){
    if(state.running)return state.latest;
    state.running=true;state.results=[];state.reportPath='';render();
    const startedAt=new Date().toISOString();const errorStart=state.consoleEvents.length;
    let environment={};
    try{environment=await (window.electronAPI?.diagnosticsGetEnvironment?.()||window.electronAPI?.getRuntimeStatus?.()||Promise.resolve({runtime:'unknown'}));}catch(err){environment={runtime:'unknown',error:sanitizeText(err.message)};}

    await runCase('runtime.package-mode','Packaged build identity','Environment',async()=>({runtime:environment.runtime||'unknown',isPackaged:environment.isPackaged===true,appVersion:environment.appVersion||''}),{skip:environment.runtime==='desktop'&&environment.isPackaged===false,skipReason:'当前是 Electron 开发/源码运行形态；Core 测试仍会继续，但安装包/portable 的最终资源布局尚未被本次日志覆盖。'});
    await runCase('runtime.core','Core Runtime','Core',async()=>{
      const names=['DKDSData','DKDSEntities','DKDSUI','DKDSPerformance','DKDSScientificPlot','DKDSComponents','DKDSDataFlow','DKDSPluginContract','DKDSCapabilities','DKDSPlugins'];
      const missing=names.filter(name=>!window[name]);assert(!missing.length,`Missing runtime globals: ${missing.join(', ')}`);return {globals:names.length};
    });
    await runCase('runtime.shell','Application Shell DOM','Core',async()=>{
      for(const id of ['app','activityBar','mainWorkspace','statusBar','manageMenu','pluginManagerPage','automationTestPage'])assert(document.getElementById(id),`Missing shell element #${id}`);return {viewport:[window.innerWidth,window.innerHeight],devicePixelRatio:window.devicePixelRatio||1};
    });
    await runCase('plugins.activation','Plugin activation & registry','Plugins',pluginSmoke);
    await runCase('types.contract','Scientific Data Type Registry','Data Contract',dataTypeSmoke);
    await runCase('selection.contract','Typed Selection Contract','Data Contract',selectionContractSmoke);
    await runCase('artifacts.roundtrip','Artifact Store & lineage round-trip','Data Contract',artifactRoundTripSmoke);
    await runCase('project.roundtrip','Project format round-trip','Project',projectFormatSmoke);
    await runCase('science.transforms','Scientific transform smoke','Science',scienceTransformSmoke);
    await runCase('plot.renderer','Plotly real renderer smoke','UI / Plot',rendererPlotSmoke);
    await runCase('plot.interactions','ScientificPlot shared interaction controllers','UI / Plot',scientificPlotInteractionSmoke);
    await runCase('performance.cache','Performance cache & render dedupe','Performance',performanceCacheSmoke);
    await runCase('performance.lifecycle','Performance cache policy & lifecycle trim','Performance',performanceLifecycleSmoke);
    await runCase('performance.resources','Renderer & resource lifecycle','Performance',performanceResourceLifecycleSmoke);

    const tops=enabledTopActivities();let testedTopCount=0,passedTopCount=0;const topOutcomes=[];
    if(window.electronAPI?.diagnosticsRunActivitySmoke){
      if(!tops.length)await runCase('top.none','TOP independent renderer discovery','TOP / Electron',async()=>{throw new Error('No enabled TOP activity was discovered; this would leave the independent renderer path untested.');});
      for(const top of tops){
        const row=await runCase(`top.${top.activityId}`,`TOP renderer · ${top.name||top.pluginId}`,'TOP / Electron',async()=>{
          testedTopCount+=1;const capabilitySnapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;const out=await window.electronAPI.diagnosticsRunActivitySmoke({activityId:top.activityId,capabilitySnapshot,capabilityRevision:Number(capabilitySnapshot?.revision)||0});
          assert(out?.ok,`${out?.pluginId||top.pluginId}: ${out?.error||'TOP smoke failed.'}`);assert(out?.lifecycle?.tested&&out?.lifecycle?.ok,`${out?.pluginId||top.pluginId}: TOP hide/reuse lifecycle failed.`);return {...out,isSuper:top.isSuper,hadWindow:top.hadWindow};
        });
        if(row.status==='pass')passedTopCount+=1;
        topOutcomes.push({pluginId:top.pluginId,activityId:top.activityId,status:row.status,detail:row.detail||''});
      }
      await runCase('top.coverage','TOP renderer coverage','TOP / Electron',async()=>{
        assert(testedTopCount===tops.length,`Only ${testedTopCount}/${tops.length} TOP renderers were exercised.`);
        assert(passedTopCount===tops.length,`${tops.length-passedTopCount}/${tops.length} TOP renderer(s) failed readiness.`);
        return {discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:tops.length-passedTopCount,activities:tops.map(row=>row.activityId)};
      });
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
    const report={schema:1,kind:'dkds.automation-test-report',runnerVersion:VERSION,appVersion:document.querySelector('.version')?.textContent?.replace(/^v/,'')||'',startedAt,finishedAt,counts,environment,results:clone(state.results),runtimeErrors:clone(runtimeErrors),coverage:{topRenderers:{discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:Math.max(0,tops.length-passedTopCount),activities:tops.map(row=>({pluginId:row.pluginId,activityId:row.activityId,isSuper:row.isSuper,hadWindow:row.hadWindow})),outcomes:topOutcomes},scientificPlotControllers:[...(window.DKDSScientificPlot?.CONTROLLERS||[])],performance:{runtime:performanceSnapshot,topReadyMs,topReadyAverageMs:topReadyMs.length?topReadyMs.reduce((sum,value)=>sum+value,0)/topReadyMs.length:null,memoryTrend,resourceLifecycle:clone(state.results.find(row=>row.id==='performance.resources')?.data||null)}},plugins:{apiVersion:pluginDiag.apiVersion,plugins:(pluginDiag.plugins||[]).map(row=>({id:row.id,name:row.name,version:row.version,status:row.status,enabled:row.enabled,active:row.active,workspaceRole:row.workspaceRole,workspaceActivity:row.workspaceActivity,topContractReady:row.topContractReady,isSuper:row.isSuper,hasWindow:row.hasWindow})),externalErrors:pluginDiag.external?.errors||[],overrideErrors:pluginDiag.overrides?.errors||[]},dataTypes:{count:window.DKDSUI?.dataTypes?.list?.().length||0,validation:window.DKDSUI?.dataTypes?.validate?.()||null}};
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
