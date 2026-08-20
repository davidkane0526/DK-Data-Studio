(() => {
  if (window.DKDSAutomationTests) return;

  const VERSION='1.1.0';
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
      const view=await scope.scientificPlot.react(host,[{x:[0,1,2],y:[1,3,2],mode:'lines+markers',name:'A',entityId:'automation.plot:A'},{x:[0,1,2],y:[2,1,4],mode:'lines+markers',name:'B',entityId:'automation.plot:B'}],{width:360,height:240,margin:{l:40,r:20,t:20,b:35},showlegend:true},{displayModeBar:false,staticPlot:true},{interaction,source:'automation-scientific-plot',traceEntity:trace=>({id:trace.entityId,type:'data.series',label:trace.name}),pinPolicy:{enabled:true}});
      assert(view?.controllers,'ScientificPlot controller surface unavailable.');
      const required=['selection','legend','tooltip','focus','pin','viewport','export'];for(const name of required)assert(view.controllers[name],`ScientificPlot controller missing: ${name}`);
      view.controllers.pin.pin('automation.plot:A',{source:'automation'});assert(view.controllers.pin.has('automation.plot:A'),'Pin controller did not retain the entity.');
      view.controllers.pin.unpin('automation.plot:A',{source:'automation'});assert(!view.controllers.pin.has('automation.plot:A'),'Pin controller did not release the entity.');
      await view.controllers.viewport.set({xRange:[0.25,1.75]},{source:'automation'});const viewport=view.controllers.viewport.get();assert(Array.isArray(viewport.xRange)&&viewport.xRange.length===2,'Viewport controller did not retain the X range.');
      await view.controllers.viewport.reset({source:'automation'});assert(view.controllers.viewport.get()?.xRange===null,'Viewport reset did not restore autorange state.');
      assert(view.controllers.legend.state().length===2,'Legend controller did not expose rendered traces.');
      assert(view.controllers.tooltip.theme()?.bgcolor,'Tooltip controller did not expose the Core theme.');
      return {controllers:required,pins:view.controllers.pin.list().length,legendEntries:view.controllers.legend.state().length,viewportRevision:view.controllers.viewport.get()?.revision||0};
    }finally{try{scope.dispose?.();}catch{}try{window.Plotly?.purge?.(host);}catch{}host.remove();}
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
      const names=['DKDSData','DKDSEntities','DKDSUI','DKDSScientificPlot','DKDSComponents','DKDSDataFlow','DKDSPluginContract','DKDSCapabilities','DKDSPlugins'];
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

    const tops=enabledTopActivities();let testedTopCount=0;
    if(window.electronAPI?.diagnosticsRunActivitySmoke){
      if(!tops.length)await runCase('top.none','TOP independent renderer discovery','TOP / Electron',async()=>{throw new Error('No enabled TOP activity was discovered; this would leave the independent renderer path untested.');});
      for(const top of tops){
        await runCase(`top.${top.activityId}`,`TOP renderer · ${top.name||top.pluginId}`,'TOP / Electron',async()=>{
          testedTopCount+=1;const capabilitySnapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;const out=await window.electronAPI.diagnosticsRunActivitySmoke({activityId:top.activityId,capabilitySnapshot,capabilityRevision:Number(capabilitySnapshot?.revision)||0});
          assert(out?.ok,`${out?.pluginId||top.pluginId}: ${out?.error||'TOP smoke failed.'}`);return {...out,isSuper:top.isSuper,hadWindow:top.hadWindow};
        });
      }
      await runCase('top.coverage','TOP renderer coverage','TOP / Electron',async()=>{assert(testedTopCount===tops.length,`Only ${testedTopCount}/${tops.length} TOP renderers were exercised.`);return {discovered:tops.length,tested:testedTopCount,activities:tops.map(row=>row.activityId)};});
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
    const report={schema:1,kind:'dkds.automation-test-report',runnerVersion:VERSION,appVersion:document.querySelector('.version')?.textContent?.replace(/^v/,'')||'',startedAt,finishedAt,counts,environment,results:clone(state.results),runtimeErrors:clone(runtimeErrors),coverage:{topRenderers:{discovered:tops.length,tested:testedTopCount,activities:tops.map(row=>({pluginId:row.pluginId,activityId:row.activityId,isSuper:row.isSuper,hadWindow:row.hadWindow}))},scientificPlotControllers:[...(window.DKDSScientificPlot?.CONTROLLERS||[])]},plugins:{apiVersion:pluginDiag.apiVersion,plugins:(pluginDiag.plugins||[]).map(row=>({id:row.id,name:row.name,version:row.version,status:row.status,enabled:row.enabled,active:row.active,workspaceRole:row.workspaceRole,workspaceActivity:row.workspaceActivity,topContractReady:row.topContractReady,isSuper:row.isSuper,hasWindow:row.hasWindow})),externalErrors:pluginDiag.external?.errors||[],overrideErrors:pluginDiag.overrides?.errors||[]},dataTypes:{count:window.DKDSUI?.dataTypes?.list?.().length||0,validation:window.DKDSUI?.dataTypes?.validate?.()||null}};
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
