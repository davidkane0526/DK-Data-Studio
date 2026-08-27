(() => {
  if (window.DKDSAutomationSmokeCases) return;

  function assert(condition,message){if(!condition)throw new Error(message||'Assertion failed.');}

  async function rendererPlotSmoke(){
    const charts=window.DKDSCharts;assert(charts?.react,'Core scientific renderer unavailable.');
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:360px;height:240px;pointer-events:none;';
    document.body.appendChild(host);
    try{
      await charts.react(host,[{x:[0,1,2],y:[1,3,2],mode:'lines+markers',name:'smoke'}],{width:360,height:240,margin:{l:40,r:20,t:20,b:35}},{staticPlot:true,dkdsRenderer:'d3'});
      assert(charts.rendererFor?.(host)==='d3','First-party renderer smoke must execute through D3.');
      assert(host.querySelector('svg.dkds-d3-chart-svg'),'D3 did not create a rendered scientific graph.');
      return {renderer:'d3',svgCount:host.querySelectorAll('svg').length};
    }finally{
      try{charts.purge?.(host);}catch{}
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
    }finally{try{scope.dispose?.();}catch{}try{window.DKDSCharts?.purge?.(host);}catch{}host.remove();}
  }

  async function tableSurfaceSmoke(){
    const ui=window.DKDSUI;assert(ui?.createScope,'Core UI infrastructure unavailable.');
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:720px;height:320px;pointer-events:none;';
    host.innerHTML='<table id="automationTable"><thead><tr><th>Name</th><th>Value</th><th>Note</th></tr></thead><tbody><tr><td>C</td><td>30</td><td>third</td></tr><tr><td>A</td><td>10</td><td>first</td></tr><tr><td>B</td><td>20</td><td>second</td></tr></tbody></table><div id="automationMountedTable"></div>';
    document.body.appendChild(host);const scope=ui.createScope('core.automation-table-surface');
    try{
      const table=host.querySelector('#automationTable'),surface=scope.tables.bind('automation-table',table,{persist:false});assert(surface,'TableSurface bind failed.');assert(table.classList.contains('dkds-managed-table'),'TableSurface did not mark the table as managed.');assert(table.querySelectorAll('.dkds-table-column-resizer').length===3,'Column resizers were not installed on every header.');
      const width=surface.setColumnWidth(1,180,{persist:false});assert(width===180,'Column width API did not retain the requested width.');assert(table.querySelector('thead th:nth-child(2)').style.width==='180px','Column width was not applied to the header.');assert(table.querySelector('tbody td:nth-child(2)').style.width==='180px','Column width was not applied to body cells.');
      const autoWidth=surface.autoSizeColumn(0,{persist:false});assert(Number(autoWidth)>=56,'Auto-size did not return a valid column width.');
      surface.sort(1,'asc',{persist:false});assert(table.querySelector('tbody tr td:nth-child(2)').textContent.trim()==='10','Ascending table sort failed.');surface.sort(1,'desc',{persist:false});assert(table.querySelector('tbody tr td:nth-child(2)').textContent.trim()==='30','Descending table sort failed.');surface.clearSort();assert(table.querySelector('tbody tr td:first-child').textContent.trim()==='C','Clearing sort did not restore the original DOM order.');
      assert(surface.setColumnVisible(2,false,{persist:false}),'Column hide failed.');assert(table.querySelector('thead th:nth-child(3)').classList.contains('dkds-table-column-hidden'),'Hidden-column state was not projected to the DOM.');surface.showAllColumns();assert(!table.querySelector('thead th:nth-child(3)').classList.contains('dkds-table-column-hidden'),'Show-all columns did not restore the hidden column.');
      const mounted=scope.tables.mount('automation-mounted',host.querySelector('#automationMountedTable'),{persist:false,columns:[{key:'vg',label:'Vg',unit:'V'},{key:'value',label:'Value'}],rows:[{vg:-5,value:2},{vg:5,value:1}]});assert(mounted?.table?.querySelectorAll('tbody tr').length===2,'TableSurface mount did not render data rows.');assert(mounted.table.querySelector('thead th').textContent.includes('Vg'),'TableSurface mount did not render column metadata.');
      const rawHost=document.createElement('div');rawHost.innerHTML='<table id="automationAutoTable"><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';document.body.appendChild(rawHost);await Promise.resolve();await new Promise(resolve=>requestAnimationFrame(()=>resolve()));const autoTable=rawHost.querySelector('table');assert(autoTable.classList.contains('dkds-managed-table'),'Document-level TableSurface observer did not auto-enhance a newly inserted table.');assert(autoTable.querySelectorAll('.dkds-table-column-resizer').length===2,'Auto-enhanced table did not receive column resize handles.');rawHost.remove();
      const saved=surface.columnState();surface.setColumnVisible('Name',false,{persist:false});assert(surface.visibleColumnKeys().length===2,'TableSurface key-based visibility did not update visible columns.');surface.restoreColumnState(saved,{persist:false});assert(!table.querySelector('thead th:first-child').classList.contains('dkds-table-column-hidden'),'TableSurface state restore did not restore column visibility.');assert(surface.visibleTableText().includes('Name\tValue\tNote'),'TableSurface visible-table serialization is unavailable.');surface.resetState({persist:false});
      return {version:ui.version,resizers:table.querySelectorAll('.dkds-table-column-resizer').length,columnState:surface.columnState(),mountedRows:mounted.table.querySelectorAll('tbody tr').length,autoHydration:true,operations:['resize','auto-size','sort','hide/show','copy menu','state','mount/bind','auto-hydrate']};
    }finally{try{scope.dispose?.();}catch{}host.remove();}
  }

  async function interactionRenderSchedulingSmoke(){
    const P=window.DKDSScientificPlot;assert(P?.createScope,'ScientificPlot runtime unavailable.');
    const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:-10000px;width:640px;height:260px;pointer-events:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    const framePlot=document.createElement('div'),idlePlot=document.createElement('div');framePlot.style.height='220px';idlePlot.style.height='220px';host.append(framePlot,idlePlot);document.body.appendChild(host);
    const scope=P.createScope('core.automation-render-scheduler'),completion=[];
    try{
      const traces=[{x:[0,1,2],y:[0,1,0],type:'scatter',mode:'lines+markers'}],layout={margin:{l:24,r:12,t:12,b:24},showlegend:false},config={responsive:false,displayModeBar:false};
      const frame=scope.react(framePlot,traces,layout,config,{source:'automation-render-frame',renderKey:'automation-frame-v1',renderPriority:'frame'}).then(()=>completion.push('frame'));
      const idle=scope.react(idlePlot,traces,layout,config,{source:'automation-render-idle',renderKey:'automation-idle-v1',renderPriority:'idle'}).then(()=>completion.push('idle'));
      await Promise.all([frame,idle]);
      assert(completion.join(',')==='frame,idle',`ScientificPlot priority order is not deterministic: ${completion.join(',')}`);
      assert(framePlot?.data?.length===1&&idlePlot?.data?.length===1,'Scheduled ScientificPlot views did not render.');
      const frameStats=scope.stats(framePlot),idleStats=scope.stats(idlePlot);
      assert(frameStats?.reacts===1&&idleStats?.reacts===1,'Scheduled ScientificPlot render accounting is incorrect.');
      return {version:P.VERSION,completion:[...completion],frameReacts:frameStats.reacts,idleReacts:idleStats.reacts,policy:'one-heavy-view-per-animation-frame'};
    }finally{try{scope.dispose?.();}catch{}host.remove();}
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

  async function projectHistoryContractSmoke(){
    const cap=window.DKDSCapabilities?.get?.('core.project-history');
    assert(cap&&['state','undo','redo','commitArtifactMutation'].every(method=>cap.methods?.includes?.(method)),'core.project-history capability is incomplete.');
    const snapshot=await window.DKDSCapabilities.invoke('core.project-history','state');
    assert(snapshot&&typeof snapshot.canUndo==='boolean'&&typeof snapshot.canRedo==='boolean','Project history state is unavailable.');
    return {version:String(cap.version||''),canUndo:snapshot.canUndo,canRedo:snapshot.canRedo,undoLabel:String(snapshot.undoLabel||''),redoLabel:String(snapshot.redoLabel||'')};
  }

  async function dataSourceLifecycleSmoke(){
    const D=window.DKDSData,cap=window.DKDSCapabilities?.get?.('core.data-sources');
    assert(D?.createStore&&D?.removeLegacyDatasets,'Data source lifecycle primitive unavailable.');
    assert(cap&&['list','rename','setExcluded','remove'].every(method=>cap.methods?.includes?.(method)),'core.data-sources lifecycle capability is incomplete.');
    const sources=await window.DKDSCapabilities.invoke('core.data-sources','list');
    assert(Array.isArray(sources),'core.data-sources.list() did not return a source list.');
    const datasets=[{path:'automation-a.csv',name:'automation-a.csv',points:[{v:0,i:1},{v:1,i:2}]},{path:'automation-b.csv',name:'automation-b.csv',points:[{v:0,i:3},{v:1,i:4}]}];
    const store=D.createStore();D.syncLegacyDatasetArtifacts(store,datasets);
    const rootA=store.list({includeTransient:true}).find(row=>row.metadata?.legacyDatasetPath==='automation-a.csv');
    const rootB=store.list({includeTransient:true}).find(row=>row.metadata?.legacyDatasetPath==='automation-b.csv');
    const derived=D.derive(rootA,{id:'automation:derived-a',kind:'data.transform',name:'derived-a',x:[0,1],y:[1,2],metadata:{}});store.upsert(derived);
    const result=D.removeLegacyDatasets(store,datasets,[{path:'automation-a.csv'}]);
    assert(result.datasets.length===1&&result.datasets[0].path==='automation-b.csv','Source removal changed the wrong canonical dataset.');
    assert(!store.get(rootA.id)&&!store.get(derived.id)&&!!store.get(rootB.id),'Source removal did not preserve lineage/source isolation.');
    return {registered:true,projectSourceCount:sources.length,syntheticRemoved:result.removed.length,syntheticRemaining:result.datasets.length,derivedRemoved:result.removedArtifactIds.includes('automation:derived-a')};
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
    const T=window.DKDSScientificTransforms,D=window.DKDSData;
    assert(T?.list&&T?.runCurve&&T?.runScalarField,'Scientific Transform Registry unavailable.');
    const rows=T.list({public:true});const ids=rows.map(row=>row.id);
    for(const id of ['raw','detrend','didv','d2idv2','dlog','dvdi','resistance'])assert(ids.includes(id),`Missing canonical transform: ${id}`);
    const make=(id,vg,scale)=>D.createSweep({id,name:id,semanticType:'science.iv.raw',x:[-0.2,-0.1,0,0.1,0.2],y:[-2,-1,0.2,1.4,2.2].map(v=>v*1e-9*scale),xUnit:'V',yUnit:'A',direction:1,scanAxis:'Vd',metadata:{vg}});
    const a=make('automation:transform-a',0,1),b=make('automation:transform-b',1,1.2);
    const curve=T.runCurve('didv',a);assert(curve.semanticType==='science.transport.didv'&&curve.points.length===a.x.length,'Canonical curve transform failed.');
    const field=T.runScalarField('didv',[a,b],{targets:[-0.2,0,0.2],vgs:[0,1],direction:1,tolerance:.03});
    assert(field.semanticType==='science.transport.conductance-field'&&field.matrix.length===2&&field.matrix[0].length===3,'Canonical scalar-field projection failed.');
    return {version:T.VERSION,owner:'builtin.standard-transport-algorithms',registered:rows.length,curveType:curve.semanticType,fieldType:field.semanticType,fieldShape:[field.vgs.length,field.targets.length]};
  }

  function scientificScalarFieldSmoke(){
    const P=window.DKDSScientificPlot;
    assert(P?.scalarFieldSpec,'Shared Scientific Scalar Field runtime unavailable.');
    const field={x:[0,1],y:['row-1','row-2'],z:[[-.12,.08],[-.05,.15]],xName:'X',yName:'Group',xUnit:'a.u.',valueName:'Value',valueUnit:'a.u.',semanticType:'science.scalar-field'};
    const spec=P.scalarFieldSpec(field,{diverging:true,renderKey:'automation-scalar-field-v1'});
    assert(spec?.traces?.[0]?.type==='heatmap','Shared scalar-field projection did not create a heatmap trace.');
    assert(spec.traces[0].zmid===0&&spec.traces[0].reversescale===true,'Diverging scalar-field defaults are incorrect.');
    assert(spec.traces[0].colorbar?.title?.text==='Value (a.u.)','Scalar-field colorbar metadata is incomplete.');
    return {version:P.VERSION,owner:'core.scientific-plot',traceType:spec.traces[0].type,diverging:spec.traces[0].zmid===0};
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


  async function scientificAlgorithmPackageCatalogSmoke(){
    assert(window.electronAPI?.pluginAlgorithmCatalog,'Algorithm Package Catalog bridge unavailable.');
    const peak=await window.electronAPI.pluginAlgorithmCatalog({category:'peak-metrics',id:'baseline-fwhm-v1',version:'1.0.0'});
    const peakCandidate=(peak?.candidates||[]).find(row=>row.source==='builtin'&&row.pluginId==='builtin.resonance-detector-robust'&&row.algorithm?.version==='1.0.0');
    assert(peakCandidate,'Catalog did not index the built-in FWHM Algorithm Provider.');assert(peakCandidate.compatible,'Built-in FWHM package is unexpectedly incompatible with this host.');
    const ter=await window.electronAPI.pluginAlgorithmCatalog({category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'});
    const terCandidate=(ter?.candidates||[]).find(row=>row.source==='builtin'&&row.pluginId==='builtin.standard-transport-algorithms'&&row.algorithm?.version==='1.0.0');
    assert(terCandidate,'Catalog did not index the built-in TER Algorithm Provider.');assert(terCandidate.compatible,'Built-in transport package is unexpectedly incompatible with this host.');
    const missing=await window.electronAPI.pluginAlgorithmCatalog({category:'peak-metrics',id:'baseline-fwhm-v1',version:'9.9.9'});assert((missing?.candidates||[]).length===0,'Catalog incorrectly matched an unavailable exact algorithm version.');
    return {appVersion:peak.appVersion,pluginApiVersion:peak.pluginApiVersion,peakPackage:{pluginId:peakCandidate.pluginId,packageVersion:peakCandidate.packageVersion,source:peakCandidate.source,compatible:peakCandidate.compatible,algorithm:peakCandidate.algorithm},terPackage:{pluginId:terCandidate.pluginId,packageVersion:terCandidate.packageVersion,source:terCandidate.source,compatible:terCandidate.compatible,algorithm:terCandidate.algorithm},missingCandidates:missing?.count||0};
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

  async function scientificReactiveSmoke(){
    const R=window.DKDSScientificReactive;assert(R?.createScope,'Scientific Reactive Runtime unavailable.');
    const scope=R.createScope('core.automation-reactive');let derives=0,effects=0;
    try{
      scope.derive('metric',{dependsOn:['peak.geometry'],compute:ctx=>{derives+=1;return ctx.revision('peak.geometry');}});
      scope.effect('view',{dependsOn:['metric'],scheduler:'microtask',effect:()=>{effects+=1;}});
      scope.transact('peak-edit',tx=>{tx.touch('peak.geometry');tx.touch('peak.geometry');});
      await Promise.resolve();await Promise.resolve();
      assert(scope.revision('peak.geometry')===1,'Reactive transaction did not coalesce duplicate touches.');
      assert(derives===1&&effects===1,'Reactive dependency graph did not propagate exactly once.');
      let releaseOld;const oldTask=scope.runLatest('metric.async',()=>new Promise(resolve=>{releaseOld=resolve;}),{dependsOn:['peak.geometry']});
      const newest=await scope.runLatest('metric.async',()=>Promise.resolve('new'),{dependsOn:['peak.geometry']});
      releaseOld('old');const stale=await oldTask;
      assert(newest.accepted===true&&newest.value==='new','Newest reactive async result was not accepted.');
      assert(stale.stale===true&&stale.accepted===false,'Stale reactive async result was not rejected.');
      const snap=scope.snapshot();return {version:snap.version,transactionRevision:scope.revision('peak.geometry'),derivedRuns:derives,effectRuns:effects,asyncStale:snap.stats.asyncStale};
    }finally{R.removeOwner?.('core.automation-reactive');}
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
    const input={version:'automation',datasets:[],peaks:[{id:'legacy-peak'}],terMaxSettings:{vmin:-1},plugins:{'builtin.resonance-workbench':{workspace:{schema:1,activeView:'main'}}},dataModel:{schema:2,artifacts:[]}};
    const text=F.serializeProject(input);const parsed=F.parseProjectBytes(new TextEncoder().encode(text)).project;
    assert(parsed?.schemaVersion===2,'Project format did not canonicalize to schema v2.');
    assert(parsed?.plugins?.['builtin.resonance-workbench'],'Plugin project slice was lost during round-trip.');
    for(const key of (F.DOMAIN_ROOT_FIELDS||[]))assert(!Object.prototype.hasOwnProperty.call(parsed,key),`Canonical project root leaked domain field ${key}.`);
    return {bytes:text.length,schemaVersion:parsed.schemaVersion,domainNeutral:true};
  }

  function dataTypeSmoke(){
    const types=window.DKDSUI?.dataTypes;assert(types,'Data Type Registry unavailable.');
    const required=['science.iv.raw','science.iv.background-removed','science.transport.didv','science.transport.d2idv2','science.transport.dlnabsidv','science.transport.dvdi','science.transport.resistance','science.transport.current-field','science.transport.background-removed-current-field','science.transport.conductance-field','science.transport.second-derivative-current-field','science.transport.log-current-slope-field','science.transport.differential-resistance-field','science.transport.resistance-field','science.resonance.peak','science.resonance.peak-set','science.resonance.peak-metrics','science.resonance.fwhm','science.ter.value','science.ter.matrix'];
    for(const id of required)assert(types.get(id),`Missing canonical scientific contract: ${id}`);
    const validation=types.validate?.()||{ok:true,errors:[]};assert(validation.ok,`Scientific Data Contracts registry invalid: ${(validation.errors||[]).join('; ')}`);
    return {owner:'builtin.scientific-data-contracts',required:required.length,registered:types.list().length,validation};
  }

  function pluginContractSmoke(pluginId){
    const diag=window.DKDSPlugins?.diagnostics?.();assert(diag,'Plugin diagnostics unavailable.');
    const row=(diag.plugins||[]).find(item=>item?.id===pluginId)||null;
    if(!row?.enabled)return {pluginId,status:'disabled',checked:false};
    if(!row?.active)return {pluginId,status:row?.status||'inactive',checked:false,deferredTo:'plugins.activation',error:row?.error||''};
    const types=window.DKDSUI?.dataTypes,pipeline=window.DKDSScientificPipeline;assert(types&&pipeline,'Plugin scientific integration runtime unavailable.');
    if(pluginId==='builtin.resonance-workbench'){
      assert(types.isA('resonance.peak','science.resonance.peak'),'Resonance Workbench type resonance.peak does not extend science.resonance.peak.');
      assert(types.isA('resonance.feature-field','science.scalar-field'),'Resonance Workbench feature-field does not extend science.scalar-field.');
      assert(pipeline.list?.({owner:pluginId}).some(item=>item.id==='transform.didv'),'Resonance Workbench transform.didv Pipeline stage is not registered.');
      const gate=pipeline.get(pluginId,'gate-analysis');assert(gate?.outputTypes?.includes?.('resonance.feature-field'),'Resonance Workbench gate-analysis does not publish resonance.feature-field.');
      return {pluginId,status:'active',checked:true,types:['resonance.peak','resonance.feature-field'],pipelines:['transform.didv','gate-analysis']};
    }
    if(pluginId==='builtin.ter-analysis'){
      assert(types.isA('ter.matrix-point','science.ter.value'),'TER Analysis type ter.matrix-point does not extend science.ter.value.');
      assert(pipeline.list?.({owner:pluginId}).some(item=>item.id==='scalar-field.didv'),'TER Analysis scalar-field.didv Pipeline stage is not registered.');
      return {pluginId,status:'active',checked:true,types:['ter.matrix-point'],pipelines:['scalar-field.didv']};
    }
    return {pluginId,status:'active',checked:false};
  }

  function pluginSmoke(){
    const diag=window.DKDSPlugins?.diagnostics?.();assert(diag,'Plugin diagnostics unavailable.');
    const failures=(diag.plugins||[]).filter(row=>row?.enabled&&row?.status==='error');
    if(failures.length){const err=new Error(`Enabled plugins with activation errors: ${failures.map(row=>row.id).join(', ')}`);err.data={responsibility:'activation-boundary',failures:failures.map(row=>({id:row.id,source:row.source||'',pluginType:row.pluginType||'',error:row.error||''}))};throw err;}
    assert((diag.active||[]).length>0,'No plugins are active.');
    return {definitions:(diag.definitions||[]).length,active:(diag.active||[]).length,disabled:Object.keys(diag.disabled||{}).length,registryKinds:Object.keys(diag.registries||{}).length};
  }

  function externalPluginPackageSmoke(){
    const diag=window.DKDSPlugins?.diagnostics?.();assert(diag,'Plugin diagnostics unavailable.');
    const errors=Array.isArray(diag.external?.errors)?diag.external.errors:[];
    if(errors.length){const err=new Error(`External plugin package errors: ${errors.map(row=>row?.file||row?.pluginId||'unknown').join(', ')}`);err.data={responsibility:'external-plugin-package',errors:errors.map(row=>({file:row?.file||'',pluginId:row?.pluginId||'',error:row?.error||String(row||'')}))};throw err;}
    return {responsibility:'external-plugin-package',errors:0};
  }


  window.DKDSAutomationSmokeCases=Object.freeze({rendererPlotSmoke,scientificPlotInteractionSmoke,tableSurfaceSmoke,interactionRenderSchedulingSmoke,performanceCacheSmoke,performanceLifecycleSmoke,performanceResourceLifecycleSmoke,selectionContractSmoke,projectHistoryContractSmoke,dataSourceLifecycleSmoke,artifactRoundTripSmoke,scientificPipelineSmoke,scientificTransformRegistrySmoke,scientificScalarFieldSmoke,scientificAlgorithmRegistrySmoke,scientificAlgorithmVersionManagementSmoke,scientificAlgorithmPackageCatalogSmoke,scientificTransportAlgorithmProvidersSmoke,scientificReactiveSmoke,scienceTransformSmoke,projectFormatSmoke,dataTypeSmoke,pluginContractSmoke,pluginSmoke,externalPluginPackageSmoke});
})();
