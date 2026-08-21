(() => {
  if (window.DKDSAutomationTests) return;

  const VERSION='1.9.0';
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
      .map(row=>({pluginId:row.id,activityId:row.workspaceActivity,name:row.name||row.id,isSuper:!!row.isSuper,hadWindow:!!row.hasWindow,algorithmCategories:Array.isArray(row.algorithmCategories)?row.algorithmCategories.slice():[]}));
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

  function scientificPipelineSmoke(){
    const P=window.DKDSScientificPipeline,D=window.DKDSData,types=window.DKDSUI?.dataTypes,perf=window.DKDSPerformance;
    assert(P?.createScope&&D?.createStore&&types&&perf?.stage,'Scientific Pipeline Runtime unavailable.');
    const scope=P.createScope('core.automation-pipeline');const store=D.createStore();let computes=0;
    const source=D.createSweep({id:'automation:pipeline-source',name:'I–V',semanticType:'science.iv.raw',x:[0,0.1,0.2],y:[1e-9,2e-9,4e-9],xUnit:'V',yUnit:'A',direction:1});store.upsert(source);
    const performance={stage:(namespace,revision,key,compute,options)=>perf.stage(`automation.pipeline.${namespace}`,revision,key,compute,options)};
    try{
      scope.register('didv',{kind:'transform',inputTypes:['science.iv.raw'],outputTypes:['science.transport.didv'],outputKinds:['data.transform'],cacheLimit:2,
        run:input=>{computes+=1;const row=input[0];return D.createTransform({id:'automation:pipeline-didv',name:'dI/dV',x:row.x,y:[1e-8,2e-8,2e-8],xUnit:'V',yUnit:'A/V',transform:'didv'});},
        selection:({artifacts})=>artifacts.map(a=>({type:'science.transport.didv',id:a.id,ref:{artifactId:a.id}})),project:({artifacts})=>({kind:'curve',artifactId:artifacts[0]?.id})});
      const options={artifacts:store,dataTypes:types,performance,publish:true};const first=scope.runSync('didv',[store.get(source.id)],options);const second=scope.runSync('didv',[store.get(source.id)],options);
      assert(computes===1,'Scientific Pipeline did not cache an unchanged stage input.');assert(first.artifacts[0]?.semanticType==='science.transport.didv','Pipeline output semanticType missing.');assert(first.artifacts[0]?.lineage?.parents?.includes(source.id),'Pipeline lineage missing source artifact.');assert(first.artifacts[0]?.provenance?.some(step=>step.providerId==='didv'),'Pipeline provenance missing stage provider.');assert(store.get('automation:pipeline-didv')?.semanticType==='science.transport.didv','Published pipeline artifact lost semanticType.');assert(first.selection?.[0]?.type==='science.transport.didv'&&first.viewModel?.kind==='curve','Pipeline selection/view projection missing.');assert(second.artifacts[0]?.id===first.artifacts[0]?.id,'Pipeline cache returned a different artifact identity.');
      const snapshot=scope.snapshot();return {version:P.VERSION,stageCount:snapshot.stages.length,runs:snapshot.stages[0]?.runs||0,computes,semanticType:first.artifacts[0].semanticType,lineageParents:first.artifacts[0].lineage.parents.length,selectionType:first.selection[0].type,viewKind:first.viewModel.kind};
    }finally{P.removeOwner?.('core.automation-pipeline');perf.clear?.('automation.pipeline.pipeline.didv');}
  }

  function scientificTransformRegistrySmoke(){
    const T=window.DKDSScientificTransforms,D=window.DKDSData,P=window.DKDSScientificPipeline;
    assert(T?.list&&T?.runCurve&&T?.runScalarField,'Scientific Transform Registry unavailable.');
    const rows=T.list({public:true});const ids=rows.map(row=>row.id);
    for(const id of ['raw','detrend','didv','d2idv2','dlog','dvdi','resistance'])assert(ids.includes(id),`Missing canonical transform: ${id}`);
    const make=(id,vg,scale)=>D.createSweep({id,name:id,semanticType:'science.iv.raw',x:[-0.2,-0.1,0,0.1,0.2],y:[-2,-1,0.2,1.4,2.2].map(v=>v*1e-9*scale),xUnit:'V',yUnit:'A',direction:1,scanAxis:'Vd',metadata:{vg}});
    const a=make('automation:transform-a',0,1),b=make('automation:transform-b',1,1.2);
    const curve=T.runCurve('didv',a);assert(curve.semanticType==='science.transport.didv'&&curve.points.length===a.x.length,'Canonical curve transform failed.');
    const field=T.runScalarField('didv',[a,b],{targets:[-0.2,0,0.2],vgs:[0,1],direction:1,tolerance:.03});
    assert(field.semanticType==='science.transport.conductance-field'&&field.matrix.length===2&&field.matrix[0].length===3,'Canonical scalar-field projection failed.');
    assert(P?.list?.({owner:'builtin.ter-analysis'}).some(row=>row.id==='scalar-field.didv'),'TER did not receive Core transform Pipeline stages.');
    assert(P?.list?.({owner:'builtin.resonance-workbench'}).some(row=>row.id==='transform.didv'),'Resonance did not receive Core transform Pipeline stages.');
    return {version:T.VERSION,registered:rows.length,curveType:curve.semanticType,fieldType:field.semanticType,fieldShape:[field.vgs.length,field.targets.length],terPipeline:true,resonancePipeline:true};
  }

  function scientificAlgorithmRegistrySmoke(){
    const A=window.DKDSScientificAlgorithms,S=window.DKDSScience;assert(A?.list&&A?.resolve&&A?.run,'Scientific Algorithm Registry unavailable.');
    const detectors=A.list({category:'peak-detector'}),metrics=A.list({category:'peak-metrics'});
    const detector=detectors.find(row=>row.id==='robust-ricker-v1'&&row.version==='1.0.0');const metric=metrics.find(row=>row.id==='baseline-fwhm-v1'&&row.version==='1.0.0');
    assert(detector,'Versioned robust peak-detector algorithm plugin is unavailable.');assert(metric,'Versioned FWHM/peak-metrics algorithm plugin is unavailable.');
    const points=[];for(let k=0;k<=160;k++){const v=-.8+k*.01;const baseline=(2e-9+0.7e-9*v);const peak=9e-9*Math.exp(-0.5*((v-.18)/.075)**2);points.push({v,i:baseline+peak});}
    const sweep={id:'automation:algorithm-sweep',datasetPath:'automation',datasetName:'automation',vg:0,direction:1,step:.01,points};
    const peaks=A.run({id:'robust-ricker-v1',version:'1.0.0',category:'peak-detector'},sweep,{parameters:S.preset?.('balanced')||{}});assert(Array.isArray(peaks)&&peaks.length>=1,'Algorithm plugin peak detector did not return a peak.');
    const chosen=peaks.slice().sort((a,b)=>Math.abs(a.v-.18)-Math.abs(b.v-.18))[0];const m=A.run({id:'baseline-fwhm-v1',version:'1.0.0',category:'peak-metrics'},{peak:chosen,sweep},{parameters:{}});assert(Number.isFinite(Number(m?.fwhm))&&m.fwhm>0,'Algorithm plugin FWHM provider returned an invalid width.');
    const owner='core.automation-algorithm-versioning';try{A.register(owner,'version-probe',{category:'automation',version:'1.0.0',run:()=>1});A.register(owner,'version-probe',{category:'automation',version:'2.0.0',default:true,run:()=>2});assert(A.resolve('version-probe',{category:'automation'})?.version==='2.0.0','Algorithm resolver did not choose the configured default version.');assert(A.resolve('version-probe@1.0.0',{category:'automation'})?.version==='1.0.0','Algorithm resolver could not lock an exact historical version.');}finally{A.removeOwner(owner);}
    return {version:A.VERSION,registered:A.list().length,detector:`${detector.id}@${detector.version}`,metric:`${metric.id}@${metric.version}`,peakCount:peaks.length,fwhm:m.fwhm,provenance:A.provenance({id:metric.id,version:metric.version,category:metric.category})};
  }

  function scientificAlgorithmVersionManagementSmoke(){
    const A=window.DKDSScientificAlgorithms;assert(A?.setPreferred&&A?.preferred&&A?.diagnose&&A?.lock&&A?.versions,'Scientific Algorithm version-management API unavailable.');
    const owner='core.automation-algorithm-version-management',ref={category:'automation-version',id:'versioned-probe'};
    try{
      A.register(owner,ref.id,{category:ref.category,version:'1.0.0',run:()=>1});
      A.register(owner,ref.id,{category:ref.category,version:'2.0.0',default:true,run:()=>2});
      assert(A.resolve(ref)?.version==='2.0.0','Newest/default algorithm resolution is incorrect before user preference.');
      A.setPreferred({...ref,version:'1.0.0'});
      assert(A.preferred(ref.category,ref.id)==='1.0.0','Preferred algorithm version was not persisted in runtime state.');
      assert(A.resolve(ref)?.version==='1.0.0','Preferred version did not control versionless resolution for new analysis.');
      const locked=A.lock(ref);assert(locked.version==='1.0.0','Algorithm lock did not freeze the preferred version.');
      A.setPreferred({...ref,version:'2.0.0'});
      assert(A.resolve(ref)?.version==='2.0.0','Updated default preference did not affect new versionless resolution.');
      assert(A.resolve(locked)?.version==='1.0.0','Exact project lock was incorrectly overridden by a newer default preference.');
      const missing=A.diagnose({...ref,version:'9.0.0'});assert(missing.status==='missing-version'&&!missing.available,'Missing locked version was not diagnosed.');assert(missing.alternatives.map(row=>row.version).includes('1.0.0')&&missing.alternatives.map(row=>row.version).includes('2.0.0'),'Missing-version diagnostics did not expose available alternatives.');
      return {version:A.VERSION,preferredVersion:A.preferred(ref.category,ref.id),lockedVersion:locked.version,missingStatus:missing.status,alternatives:missing.alternatives.map(row=>row.version),coexistingVersions:A.versions(ref).map(row=>row.version)};
    }finally{A.clearPreferred?.(ref.category,ref.id);A.removeOwner(owner);}
  }


  function scientificTransportAlgorithmProvidersSmoke(){
    const A=window.DKDSScientificAlgorithms,T=window.DKDSScientificTransforms,D=window.DKDSData;
    assert(A?.list&&A?.run&&T?.runCurve&&T?.runScalarField,'Transport Algorithm Provider runtime unavailable.');
    const owner='builtin.standard-transport-algorithms';
    const providerRows=A.list({owner});
    const transformIds=['raw','detrend','didv','d2idv2','dlog','dvdi','resistance'];
    for(const id of transformIds){
      const row=A.resolve({category:'transport-transform',id:`transport.${id}`,version:'1.0.0'});
      assert(row?.owner===owner,`Missing exact transport provider transport.${id}@1.0.0.`);
    }
    const fieldProvider=A.resolve({category:'transport-scalar-field',id:'transport.scalar-field',version:'1.0.0'});
    const terProvider=A.resolve({category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'});
    assert(fieldProvider?.owner===owner,'Versioned scalar-field provider unavailable.');
    assert(terProvider?.owner===owner,'Versioned TER provider unavailable.');
    const makeSweep=(id,vg,scale=1,direction=1)=>D.createSweep({id,name:id,semanticType:'science.iv.raw',x:direction>0?[-.2,-.1,0,.1,.2]:[.2,.1,0,-.1,-.2],y:(direction>0?[-2,-1,.2,1.4,2.2]:[2.2,1.4,.2,-1,-2]).map(v=>v*1e-9*scale),xUnit:'V',yUnit:'A',direction,scanAxis:'Vd',metadata:{vg}});
    const up0=makeSweep('automation:transport-up0',0,1,1),up1=makeSweep('automation:transport-up1',1,1.2,1),down0=makeSweep('automation:transport-down0',0,1,-1),down1=makeSweep('automation:transport-down1',1,1.2,-1);
    const curve=T.runCurve('didv',up0,{parameters:{radius:1}});
    assert(curve?.algorithm?.pluginId===owner&&curve?.algorithm?.algorithmId==='transport.didv','Transform Registry did not execute the versioned transport provider.');
    const field=T.runScalarField('didv',[up0,up1],{targets:[-.2,0,.2],vgs:[0,1],direction:1,tolerance:.03});
    assert(field?.algorithm?.pluginId===owner&&field?.algorithm?.algorithmId==='transport.scalar-field','Scalar field did not execute the versioned provider.');
    const toPoints=sweep=>(sweep?.x||[]).map((v,index)=>({v:Number(v),i:Number(sweep?.y?.[index]),index}));
    const toDataset=(name,vg,up,down)=>({name,path:name,vg,points:[...toPoints(up),...toPoints(down)].map((point,index)=>({...point,index}))});
    const datasets=[toDataset('automation-ter-0',0,up0,down0),toDataset('automation-ter-1',1,up1,down1)];
    const ter=A.run({category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'},datasets,{parameters:{vmin:-.2,vmax:.2,vstep:.1,tolerance:.03,currentFloor:1e-15}});
    assert(Array.isArray(ter?.matrix)&&ter.matrix.length===2,'TER Algorithm Provider returned an invalid matrix.');
    return {owner,registered:providerRows.length,transforms:transformIds.length,curveAlgorithm:curve.algorithm,fieldAlgorithm:field.algorithm,terAlgorithm:A.provenance({category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'}),fieldShape:[field.vgs?.length||0,field.targets?.length||0],terShape:[ter.vgs?.length||0,ter.targets?.length||0]};
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
    const required=['science.iv.raw','science.iv.background-removed','science.transport.didv','science.transport.d2idv2','science.transport.dlnabsidv','science.transport.dvdi','science.transport.resistance','science.transport.current-field','science.transport.background-removed-current-field','science.transport.conductance-field','science.transport.second-derivative-current-field','science.transport.log-current-slope-field','science.transport.differential-resistance-field','science.transport.resistance-field','science.resonance.peak','science.resonance.peak-set','science.resonance.peak-metrics','science.resonance.fwhm','science.ter.value','science.ter.matrix'];
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
      const names=['DKDSData','DKDSEntities','DKDSUI','DKDSPerformance','DKDSScientificPlot','DKDSComponents','DKDSDataFlow','DKDSScientificPipeline','DKDSScientificTransforms','DKDSScientificAlgorithms','DKDSPluginContract','DKDSCapabilities','DKDSPlugins'];
      const missing=names.filter(name=>!window[name]);assert(!missing.length,`Missing runtime globals: ${missing.join(', ')}`);return {globals:names.length};
    });
    await runCase('runtime.shell','Application Shell DOM','Core',async()=>{
      for(const id of ['app','activityBar','mainWorkspace','statusBar','manageMenu','pluginManagerPage','automationTestPage'])assert(document.getElementById(id),`Missing shell element #${id}`);return {viewport:[window.innerWidth,window.innerHeight],devicePixelRatio:window.devicePixelRatio||1};
    });
    await runCase('plugins.activation','Plugin activation & registry','Plugins',pluginSmoke);
    await runCase('types.contract','Scientific Data Type Registry','Data Contract',dataTypeSmoke);
    await runCase('selection.contract','Typed Selection Contract','Data Contract',selectionContractSmoke);
    await runCase('artifacts.roundtrip','Artifact Store & lineage round-trip','Data Contract',artifactRoundTripSmoke);
    await runCase('pipeline.contract','Scientific Data Pipeline','Data Contract',scientificPipelineSmoke);
    await runCase('transforms.registry','Scientific Transform Registry & Scalar Field','Data Contract',scientificTransformRegistrySmoke);
    await runCase('algorithms.registry','Scientific Algorithm Registry & Version Lock','Data Contract',scientificAlgorithmRegistrySmoke);
    await runCase('algorithms.version-management','Algorithm default / lock / missing-version management','Data Contract',scientificAlgorithmVersionManagementSmoke);
    await runCase('algorithms.transport-ter','Transport / Scalar Field / TER Algorithm Providers','Data Contract',scientificTransportAlgorithmProvidersSmoke);
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
          assert(out?.ok,`${out?.pluginId||top.pluginId}: ${out?.error||'TOP smoke failed.'}`);assert(out?.lifecycle?.tested&&out?.lifecycle?.ok,`${out?.pluginId||top.pluginId}: TOP hide/reuse lifecycle failed.`);return {...out,isSuper:top.isSuper,hadWindow:top.hadWindow,algorithmCategories:top.algorithmCategories};
        });
        if(row.status==='pass')passedTopCount+=1;
        topOutcomes.push({pluginId:top.pluginId,activityId:top.activityId,status:row.status,detail:row.detail||''});
      }
      await runCase('top.coverage','TOP renderer coverage','TOP / Electron',async()=>{
        assert(testedTopCount===tops.length,`Only ${testedTopCount}/${tops.length} TOP renderers were exercised.`);
        assert(passedTopCount===tops.length,`${tops.length-passedTopCount}/${tops.length} TOP renderer(s) failed readiness.`);
        return {discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:tops.length-passedTopCount,activities:tops.map(row=>row.activityId)};
      });
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
          assert(!loaded.has('plotly'),`${row.id}: Plotly must not block dedicated TOP startup.`);
          const chartRuntime=renderer.chartRuntime||null;
          assert(chartRuntime&&chartRuntime.version==='1.2.0',`${row.id}: Core Chart Runtime lazy-loader snapshot missing.`);
          assert(chartRuntime.plotlyAllowed===declared.has('plotly'),`${row.id}: logical Plotly contract was not preserved by the lazy loader.`);
          return {activityId:row.data?.activityId||row.id.slice(4),pluginId:row.data?.pluginId||'',readyMs:Number(row.data?.durationMs)||0,rendererTotalMs:Number(renderer.totalMs)||0,navigationMs:Number(main.navigationMs)||0,createToReadyMs:Number(main.createToReadyMs)||0,dependencyCount:Number(renderer.dependencyCount)||renderer.dependencies.length,scriptCount:Number(renderer.scriptCount)||renderer.scripts?.length||0,domainRuntimes:domainRuntimes.filter(id=>loaded.has(id)),algorithmProviders:clone(renderer.algorithmProviders||[]),chartRuntime:clone(chartRuntime),phases:(renderer.phases||[]).map(item=>({name:item.name,durationMs:item.durationMs})),slowDependencies:renderer.dependencies.slice().sort((a,b)=>(Number(b.durationMs)||0)-(Number(a.durationMs)||0)).slice(0,5).map(item=>({name:item.name,durationMs:item.durationMs}))};
        });
        return {profiles};
      });
      await runCase('top.plotly-lazy','TOP lazy Plotly runtime contract','TOP / Performance',async()=>{
        const rows=state.results.filter(row=>row.id?.startsWith?.('top.')&&!['top.coverage','top.startup-profile','top.plotly-lazy'].includes(row.id)&&row.status==='pass');
        const profiles=rows.map(row=>{
          const renderer=row.data?.startupProfile?.renderer||{},loaded=new Set((renderer.dependencies||[]).map(item=>String(item?.name||''))),declared=new Set((row.data?.dependencies||[]).map(String)),chart=renderer.chartRuntime||{};
          assert(!loaded.has('plotly'),`${row.id}: eager Plotly dependency is still present.`);
          assert(chart.version==='1.2.0',`${row.id}: lazy Chart Runtime state missing.`);
          assert(chart.plotlyAllowed===declared.has('plotly'),`${row.id}: Plotly permission does not match resolved plugin contract.`);
          return {activityId:row.data?.activityId||row.id.slice(4),declared:declared.has('plotly'),status:chart.status||'',ready:!!chart.ready,requests:Number(chart.requests)||0,reuses:Number(chart.reuses)||0,loadDurationMs:Number(chart.loadDurationMs)||0};
        });
        assert(profiles.length===tops.length,`Lazy Plotly profiler only received ${profiles.length}/${tops.length} TOP rows.`);
        return {profiles};
      });
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
    const report={schema:1,kind:'dkds.automation-test-report',runnerVersion:VERSION,appVersion:document.querySelector('.version')?.textContent?.replace(/^v/,'')||'',startedAt,finishedAt,counts,environment,results:clone(state.results),runtimeErrors:clone(runtimeErrors),coverage:{topRenderers:{discovered:tops.length,tested:testedTopCount,passed:passedTopCount,failed:Math.max(0,tops.length-passedTopCount),activities:tops.map(row=>({pluginId:row.pluginId,activityId:row.activityId,isSuper:row.isSuper,hadWindow:row.hadWindow})),outcomes:topOutcomes},scientificPlotControllers:[...(window.DKDSScientificPlot?.CONTROLLERS||[])],scientificPipeline:clone(state.results.find(row=>row.id==='pipeline.contract')?.data||null),scientificTransforms:clone(state.results.find(row=>row.id==='transforms.registry')?.data||null),scientificAlgorithms:clone(state.results.find(row=>row.id==='algorithms.registry')?.data||null),scientificAlgorithmVersionManagement:clone(state.results.find(row=>row.id==='algorithms.version-management')?.data||null),scientificTransportAlgorithms:clone(state.results.find(row=>row.id==='algorithms.transport-ter')?.data||null),performance:{runtime:performanceSnapshot,topReadyMs,topReadyAverageMs:topReadyMs.length?topReadyMs.reduce((sum,value)=>sum+value,0)/topReadyMs.length:null,topStartupProfiles:clone(state.results.find(row=>row.id==='top.startup-profile')?.data?.profiles||[]),topLazyPlotly:clone(state.results.find(row=>row.id==='top.plotly-lazy')?.data?.profiles||[]),topAlgorithmProviders:clone(state.results.find(row=>row.id==='top.algorithm-providers')?.data?.profiles||[]),memoryTrend,resourceLifecycle:clone(state.results.find(row=>row.id==='performance.resources')?.data||null)}},plugins:{apiVersion:pluginDiag.apiVersion,plugins:(pluginDiag.plugins||[]).map(row=>({id:row.id,name:row.name,version:row.version,status:row.status,enabled:row.enabled,active:row.active,workspaceRole:row.workspaceRole,workspaceActivity:row.workspaceActivity,topContractReady:row.topContractReady,isSuper:row.isSuper,hasWindow:row.hasWindow,algorithmProvider:row.algorithmProvider===true,algorithmCategories:Array.isArray(row.algorithmCategories)?row.algorithmCategories.slice():[]})),externalErrors:pluginDiag.external?.errors||[],overrideErrors:pluginDiag.overrides?.errors||[]},dataTypes:{count:window.DKDSUI?.dataTypes?.list?.().length||0,validation:window.DKDSUI?.dataTypes?.validate?.()||null}};
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
