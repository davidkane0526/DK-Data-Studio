'use strict';
const {$, state, status}=require('./context');
const {copyTextToClipboard, hideLanWebPanel, pushArtifactDeltaToActivityWindows, setStatus, showLanWebPanel, snapshotArtifactRows}=require('./foundation');
let deps=null;
function configure(next){deps=next;return module.exports;}
const activeProjectTab=(...args)=>deps.projectTabs.activeProjectTab(...args);
const captureActiveProjectTab=(...args)=>deps.projectTabs.captureActiveProjectTab(...args);
const closeProjectTab=(...args)=>deps.projectTabs.closeProjectTab(...args);
const createProjectTab=(...args)=>deps.projectTabs.createProjectTab(...args);
const switchProjectTab=(...args)=>deps.projectTabs.switchProjectTab(...args);
const dataConsumerTargets=(...args)=>deps.imports.dataConsumerTargets(...args);
const decodeImportSeed=(...args)=>deps.imports.decodeImportSeed(...args);
const openDirectoryAuto=(...args)=>deps.imports.openDirectoryAuto(...args);
const openFilesAuto=(...args)=>deps.imports.openFilesAuto(...args);
const openImportWorkbench=(...args)=>deps.imports.openImportWorkbench(...args);
const artifactHostApi=(...args)=>deps.artifacts.artifactHostApi(...args);
const dataSourceHostApi=(...args)=>deps.artifacts.dataSourceHostApi(...args);
const importFiles=(...args)=>deps.artifacts.importFiles(...args);
const projectHistoryHostApi=(...args)=>deps.artifacts.projectHistoryHostApi(...args);
const applySuperWorkspace=(...args)=>deps.workspace.applySuperWorkspace(...args);
const closeAnalysisPage=(...args)=>deps.workspace.closeAnalysisPage(...args);
const ensurePluginWorkspaceVisible=(...args)=>deps.workspace.ensurePluginWorkspaceVisible(...args);
const openAnalysisPage=(...args)=>deps.workspace.openAnalysisPage(...args);
const placePrimeContribution=(...args)=>deps.workspace.placePrimeContribution(...args);
const renderAll=(...args)=>deps.workspace.renderAll(...args);
const scheduleMainPlotRelayout=(...args)=>deps.workspace.scheduleMainPlotRelayout(...args);
const showMainWorkspace=(...args)=>deps.workspace.showMainWorkspace(...args);
const showNoSuperWorkspace=(...args)=>deps.workspace.showNoSuperWorkspace(...args);
const syncAnalysisPageViewport=(...args)=>deps.workspace.syncAnalysisPageViewport(...args);
const saveChartImage=(...args)=>deps.scientific.saveChartImage(...args);
const makeProject=(...args)=>deps.projects.makeProject(...args);
const openProject=(...args)=>deps.projects.openProject(...args);
const openProjectBase64=(...args)=>deps.projects.openProjectBase64(...args);
const saveProject=(...args)=>deps.projects.saveProject(...args);
const applyGroupPanelLayout=(...args)=>deps.docks.applyGroupPanelLayout(...args);
const applyInspectorPanelLayout=(...args)=>deps.docks.applyInspectorPanelLayout(...args);
const makeFloating=(...args)=>deps.docks.makeFloating(...args);
const systemHistorySnapshotSync=(...args)=>deps.docks.systemHistorySnapshotSync(...args);
const systemRedo=(...args)=>deps.docks.systemRedo(...args);
const systemUndo=(...args)=>deps.docks.systemUndo(...args);

function capabilitySnapshotForWindows(){
  const snapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
  if(!snapshot||!Array.isArray(snapshot.providers))return snapshot;
  const sourceSnapshot={
    schema:1,
    sources:dataSourceHostApi().list(),
    targets:dataConsumerTargets()
  };
  const baseRevision=Number(snapshot.revision)||0;
  const sourceHashText=window.DKDSData?.hashString?.(JSON.stringify(sourceSnapshot))||'0';
  const sourceRevision=Number.parseInt(String(sourceHashText),36)>>>0;
  return {
    ...snapshot,
    revision:baseRevision*4294967296+sourceRevision,
    providers:snapshot.providers.map(row=>String(row?.id||'')==='core.data-sources'
      ? {...row,metadata:{...(row.metadata||{}),syncSnapshot:sourceSnapshot}}
      : row)
  };
}

async function publishCapabilitySnapshot(){
  if(!window.electronAPI?.publishCapabilitySnapshot)return null;
  const snapshot=capabilitySnapshotForWindows();
  try{return await window.electronAPI.publishCapabilitySnapshot({snapshot,revision:Number(snapshot?.revision)||0});}
  catch(err){console.warn('[DKDS capabilities:publish]',err);return null;}
}

async function openPluginActivityWindow(activityId){
  const tab=activeProjectTab();
  if(!tab)return false;
  captureActiveProjectTab();
  if(!window.electronAPI?.openActivityWindow){
    return window.DKDSPlugins?.activities?.set?.(activityId);
  }
  // The renderer activity list and the main-process dedicated-window list are
  // independent registries. Preflight the machine window contract so a Tool
  // menu entry can never fail as an unexplained no-op when only the renderer
  // contribution exists.
  if(window.electronAPI?.listPluginWindows){
    const configured=await window.electronAPI.listPluginWindows()||[];
    const contract=configured.find(row=>String(row?.activity||'')===String(activityId||''));
    if(!contract)throw new Error(`独立工作区契约未注册：${activityId}`);
  }
  const capabilitySnapshot=capabilitySnapshotForWindows();
  const activitySpec=(window.DKDSPlugins?.activities?.list?.()||[]).find(row=>String(row?.id||'')===String(activityId||''))||null;
  // Live Artifact hydration is a host/window lifecycle contract, so accept it
  // from either the runtime Activity spec or the machine-readable window
  // manifest. The latter keeps system buttons reliable even if they are used
  // before an activity contribution has finished mounting. No activity id is
  // special-cased here.
  const pluginWindowSpec=(window.DKDSPlugins?.manager?.list?.()||[]).find(row=>String(row?.window?.activity||'')===String(activityId||''))?.window||null;
  const artifactHydration=String(activitySpec?.artifactHydration||pluginWindowSpec?.artifactHydration||'');
  const artifactSnapshot=artifactHydration==='live'?snapshotArtifactRows():null;
  return window.electronAPI.openActivityWindow({
    activityId,
    projectTabId:tab.id,
    title:tab.title,
    projectPath:state.projectPath,
    project:makeProject(),
    artifactSnapshot,
    capabilitySnapshot,
    capabilityRevision:Number(capabilitySnapshot?.revision)||0
  });
}

let dedicatedPrewarmToken=0;

async function prewarmDedicatedPluginWindows(){
  if(!window.electronAPI?.prewarmActivityWindow||!window.electronAPI?.listPluginWindows)return;
  const token=++dedicatedPrewarmToken;
  let specs=[];
  try{specs=await window.electronAPI.listPluginWindows()||[];}
  catch(err){console.warn('[DKDS prewarm:list]',err);return;}
  if(token!==dedicatedPrewarmToken)return;

  // Only prewarm activities that are both enabled in the renderer plugin
  // registry and declared as dedicated windows by their manifest. No core
  // activity-name whitelist is allowed here.
  const enabledActivities=new Set((window.DKDSPlugins?.activities?.list?.()||[])
    .filter(activity=>activity?.openMode==='window'&&activity?.isSuper!==true)
    .map(activity=>String(activity.id||''))
    .filter(Boolean));
  const pluginRows=window.DKDSPlugins?.manager?.list?.()||[];
  const prewarmByPlugin=new Map(pluginRows.map(row=>[String(row.id||''),row.prewarmEnabled===true]));
  const prewarmActivities=new Set(specs
    .filter(spec=>enabledActivities.has(String(spec?.activity||''))&&prewarmByPlugin.get(String(spec?.pluginId||''))===true)
    .map(spec=>String(spec.activity||''))
    .filter(Boolean));
  if(window.electronAPI?.syncPluginActivityWindows){
    try{await window.electronAPI.syncPluginActivityWindows({enabled:[...enabledActivities],prewarm:[...prewarmActivities]});}
    catch(err){console.warn('[DKDS plugin-window sync]',err);}
    if(token!==dedicatedPrewarmToken)return;
  }
  const activities=[...prewarmActivities];
  if(!activities.length)return;

  const run=(index)=>{
    if(token!==dedicatedPrewarmToken||index>=activities.length)return;
    const tab=activeProjectTab();
    if(!tab)return;
    captureActiveProjectTab();
    const activityId=activities[index];
    const capabilitySnapshot=capabilitySnapshotForWindows();
    const payload={
      activityId,
      projectTabId:tab.id,
      title:tab.title,
      projectPath:state.projectPath,
      project:makeProject(),
      capabilitySnapshot,
      capabilityRevision:Number(capabilitySnapshot?.revision)||0
    };
    Promise.resolve(window.electronAPI.prewarmActivityWindow(payload)).catch(err=>{
      console.warn(`[DKDS prewarm:${activityId}]`,err);
    }).finally(()=>{
      if(token===dedicatedPrewarmToken&&index+1<activities.length)setTimeout(()=>run(index+1),120);
    });
  };
  const kick=()=>setTimeout(()=>run(0),60);
  if(typeof requestIdleCallback==='function')requestIdleCallback(kick,{timeout:450});
  else setTimeout(kick,220);
}

function cloneAuxSnapshot(value){
  if(value===undefined)return undefined;
  try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
}

function applyArtifactDeltaToTab(tab,delta){
  if(!tab||!delta)return false;
  if(!tab.artifactStore)tab.artifactStore=window.DKDSData.createStore();
  let changed=false;
  for(const artifact of (Array.isArray(delta.upserts)?delta.upserts:[])){
    if(!artifact?.id)continue;
    try{tab.artifactStore.upsert(artifact);changed=true;}catch(err){console.warn('[DKDS artifact merge:upsert]',err);}
  }
  for(const id of (Array.isArray(delta.removedIds)?delta.removedIds:[])){
    try{changed=tab.artifactStore.remove(id)||changed;}catch(err){console.warn('[DKDS artifact merge:remove]',err);}
  }
  return changed;
}

function applyDedicatedActivitySnapshot(payload,tab){
  const pluginId=String(payload?.pluginId||'').trim();
  if(!pluginId||payload?.persistence==='none'||payload?.persistence==='memory')return false;
  const active=tab.id===state.activeProjectTabId;
  if(active)captureActiveProjectTab();

  tab.pluginState=tab.pluginState&&typeof tab.pluginState==='object'?tab.pluginState:{};
  if(payload.pluginState!==undefined&&payload.pluginState!==null){
    tab.pluginState[pluginId]=cloneAuxSnapshot(payload.pluginState);
  }
  const artifactsChanged=applyArtifactDeltaToTab(tab,payload.artifactDelta);

  if(active){
    state.artifactStore=tab.artifactStore;
    window.DKDSPlugins?.project?.restorePlugin?.(pluginId,tab.pluginState);
    if(artifactsChanged){
      window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{
        type:'merge',pluginId,activityId:payload.activityId||'',artifactDelta:payload.artifactDelta||null,artifacts:state.artifactStore.list()
      });
      pushArtifactDeltaToActivityWindows(payload.artifactDelta||{},'activity-merge',{excludeActivityId:String(payload.activityId||'')});
    }
    captureActiveProjectTab();
    if(payload.final){
      renderAll();
      applyGroupPanelLayout();
      applyInspectorPanelLayout();
      scheduleMainPlotRelayout();
      setStatus(`已同步 ${payload.activityId||pluginId} 的插件状态与结果缓存。`);
    }
  }
  return true;
}

function applyActivityProjectSnapshot(payload){
  const projectTabId=String(payload?.projectTabId||'');
  if(!projectTabId)return;
  const tab=state.projectTabs.find(t=>t.id===projectTabId);
  if(!tab||!payload?.pluginId)return;
  applyDedicatedActivitySnapshot(payload,tab);
}

async function preparePluginSuperTransition(change={}){
  if(!window.electronAPI?.prepareSuperTransition)return {snapshots:[],closed:0};
  const activityId=String(change?.activityId||'').trim();
  if(!activityId)return {snapshots:[],closed:0};
  const result=await window.electronAPI.prepareSuperTransition({activityId,pluginId:String(change?.pluginId||'')});
  for(const snapshot of (result?.snapshots||[]))applyActivityProjectSnapshot(snapshot);
  return result||{snapshots:[],closed:0};
}

async function initializePluginArchitecture(){
  if(!window.DKDSPlugins)return;

  window.DKDSUI?.host?.configure?.({
    root:'#app',
    activity:()=>window.DKDSPlugins?.activities?.active?.()||'',
    status:setStatus,
    zones:{
      overlay:'#app',
      main:'#mainWorkspace',
      left:'#pluginSidebarSections',
      right:'#primeRightDockSlot',
      bottom:'#primeBottomDockSlot'
    }
  });

  window.DKDSPlugins.configure({
    appVersion:'3.67.2',
    platform:window.DKDSPlatform,
    isAuxiliaryWindow:false,
    isWebClient:!!window.electronAPI?.isWebClient,
    isNativeClient:!!window.electronAPI?.isNativeClient,
    renderActivityNavigation:()=>window.DKDSDesktopPresentationShell?.renderNavigation?.({isAuxiliaryWindow:false}),
    getRuntimeStatus:()=>window.electronAPI?.getRuntimeStatus?.(),
    getLanWebStatus:()=>state.lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),
    openLanWebPanel:showLanWebPanel,
    hideLanWebPanel,
    openActivityWindow:openPluginActivityWindow,
    prepareSuperTransition:preparePluginSuperTransition,
    closeCurrentWindow:()=>window.electronAPI?.closeCurrentWindow?.(),
    openImportWorkbench:options=>openImportWorkbench(options||{}),
    makeProject:()=>makeProject(),
    getActiveProjectTab:()=>activeProjectTab(),
    captureActiveProjectTab,
    setStatus,
    renderAll,
    scheduleMainPlotRelayout,
    syncAnalysisPageViewport,
    openAnalysisPage,
    closeAnalysisPage,
    ensurePluginWorkspaceVisible,
    showMainWorkspace,
    applySuperWorkspace,
    showNoSuperWorkspace,
    placePrime:placePrimeContribution,
    copyTextToClipboard,
    saveChartImage,
    makeFloating,
    artifacts:artifactHostApi(),
    services:{runtime:Object.freeze({getStatus:()=>window.electronAPI?.getRuntimeStatus?.(),getDevToolsState:()=>window.electronAPI?.getDevToolsState?.(),toggleDevTools:()=>window.electronAPI?.toggleDevTools?.()}),lanWeb:Object.freeze({getStatus:()=>state.lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),openPanel:showLanWebPanel,hidePanel:hideLanWebPanel}),connectivity:window.DKDSConnectivity}
  });

  // Platform presentation state is owned by Core registries and app state, not by
  // the desktop DOM. Desktop and mobile presenters consume this same model.
  window.DKDSPresentation?.configure?.({
    projectSnapshot:()=>{
      const active=activeProjectTab();
      const projects=(state.projectTabs||[]).map(tab=>({id:String(tab.id),title:String(tab.title||'未命名项目'),active:tab.id===state.activeProjectTabId,dirty:!!tab.dirty}));
      return {ready:!!active,activeProjectId:String(active?.id||''),title:String(active?.title||'DK Data Studio'),projects};
    },
    historySnapshot:()=>systemHistorySnapshotSync()
  });

  // Android invokes stable Core commands through the Mobile Host Adapter.
  // The native shell consumes the Mobile Presenter and never locates or clicks desktop renderer nodes.
  window.DKDSMobileHost?.configure?.({
    importFiles:()=>importFiles(),
    openAnyFiles:()=>openFilesAuto(),
    openAnyDirectory:()=>openDirectoryAuto(),
    openProject:()=>openProject(),
    saveProject:()=>saveProject(),
    newProject:()=>createProjectTab(null,true),
    switchProject:id=>switchProjectTab(id),
    closeProject:id=>closeProjectTab(id),
    undo:()=>systemUndo(),
    redo:()=>systemRedo(),
    openPluginManager:()=>{openAnalysisPage('pluginManagerPage');window.DKDSPluginManagerUI?.render?.();return true;}
  });

  const connectivitySnapshot=()=>{
    if(window.DKDSMobileHost?.snapshot)return window.DKDSMobileHost.snapshot();
    if(window.DKDSPresentation?.present)return window.DKDSPresentation.present('mobile',{protocol:3,canGoBack:false});
    throw new Error('Core Presentation Model unavailable.');
  };
  const connectivityInvoke=async(method,payload={})=>{
    if(window.DKDSMobileHost?.invoke)return window.DKDSMobileHost.invoke(method,payload);
    if(method==='navigate')return window.DKDSPlugins?.activities?.activateEmbedded?.(String(payload.activityId||payload.id||''),{invoke:true});
    if(method==='action')return window.DKDSUI?.actions?.invoke?.(String(payload.activityId||window.DKDSPlugins?.activities?.active?.()||''),String(payload.id||''),String(payload.itemId||''));
    if(method==='surface')return window.DKDSUI?.workspaces?.invoke?.(String(payload.activityId||window.DKDSPlugins?.activities?.active?.()||''),String(payload.id||''));
    if(method==='command'&&payload.id==='project.undo')return systemUndo();
    if(method==='command'&&payload.id==='project.redo')return systemRedo();
    throw new Error(`Unsupported Studio Core control: ${method}`);
  };
  window.DKDSConnectivity?.configure?.({snapshot:connectivitySnapshot,invoke:connectivityInvoke});

  const kernelArtifactApi=()=>artifactHostApi();
  const kernelArtifactUpsert=(artifact,label='AI 修改数据对象')=>{
    if(!artifact?.id)throw new Error('Artifact id is required.');
    const api=kernelArtifactApi(),previous=api.get(artifact.id),next=window.DKDSData.deepClone(artifact);
    const before=previous?{upserts:[window.DKDSData.deepClone(previous)],removedIds:[]}:{upserts:[],removedIds:[String(artifact.id)]};
    const after={upserts:[next],removedIds:[]};
    projectHistoryHostApi().commitArtifactMutation({label,before,after});
    return api.get(artifact.id);
  };
  const kernelArtifactRemove=(id,label='AI 删除数据对象')=>{
    const api=kernelArtifactApi(),previous=api.get(id);if(!previous)return false;
    projectHistoryHostApi().commitArtifactMutation({label,before:{upserts:[window.DKDSData.deepClone(previous)],removedIds:[]},after:{upserts:[],removedIds:[String(id)]}});return true;
  };
  const boundedPlotValue=(value,limit=240)=>{
    if(Array.isArray(value)){if(value.length>limit)return value.slice(0,limit).map(v=>boundedPlotValue(v,limit));return value.map(v=>boundedPlotValue(v,limit));}
    if(value&&typeof value==='object'){const out={};for(const [key,val] of Object.entries(value)){if(['_context','_fullData','_fullLayout'].includes(key))continue;out[key]=boundedPlotValue(val,limit);}return out;}
    return value;
  };
  const kernelPlotInspect=({limit=20}={})=>[...document.querySelectorAll('[data-dkds-chart-renderer="d3"]')].slice(0,Math.max(1,Math.min(50,Number(limit)||20))).map((el,index)=>({
    id:el.id||`plot-${index+1}`,title:String(el.layout?.title?.text||el.layout?.title||el.closest?.('.trend-card,.floating-panel')?.querySelector?.('.trend-card-header,.drag-handle')?.textContent||'' ).trim(),
    traces:boundedPlotValue(el.data||[]),layout:boundedPlotValue(el.layout||{}),renderer:'d3',visible:el.getClientRects().length>0,
    size:{width:Math.round(el.getBoundingClientRect().width),height:Math.round(el.getBoundingClientRect().height)}
  }));
  const kernelPlotPanel=()=>{
    let panel=document.getElementById('dkdsKernelPlotPanel');if(panel)return panel;
    panel=document.createElement('section');panel.id='dkdsKernelPlotPanel';panel.className='floating-panel dkds-kernel-plot-panel';panel.style.cssText='position:fixed;left:12vw;top:15vh;width:min(720px,72vw);height:min(520px,68vh);z-index:820;resize:both;overflow:hidden;min-width:320px;min-height:240px;';
    panel.innerHTML='<div class="drag-handle"><strong>AI Plot</strong><button type="button" class="panel-close" aria-label="关闭">×</button></div><div class="dkds-kernel-plot" style="height:calc(100% - 42px);min-height:0"></div>';
    document.body.appendChild(panel);panel.querySelector('.panel-close').onclick=()=>panel.classList.add('hidden');makeFloating(panel);return panel;
  };
  const kernelPlotRender=async args=>{const traces=Array.isArray(args?.traces)?window.DKDSData.deepClone(args.traces):[];if(!traces.length)throw new Error('No plottable traces were supplied.');const panel=kernelPlotPanel();panel.classList.remove('hidden');panel.querySelector('.drag-handle strong').textContent=String(args?.title||'AI Plot');const target=panel.querySelector('.dkds-kernel-plot');const layout={autosize:true,margin:{l:64,r:24,t:34,b:54},showlegend:true,hovermode:'closest',...(args?.layout||{})};await window.DKDSCharts.react(target,traces,layout,{responsive:true,displayModeBar:true,scrollZoom:true,doubleClick:'reset'});return {ok:true,id:panel.id,traceCount:traces.length};};
  const kernelRuntimeStatus=async()=>({host:await window.electronAPI?.getRuntimeStatus?.(),charts:window.DKDSCharts?.runtimeState?.()||null,performance:window.DKDSPerformance?.snapshot?.()||null,plugins:window.DKDSPlugins?.diagnostics?.()||null,kernel:window.DKDSKernel?.describe?.()||null});
  window.DKDSKernel?.configure?.({
    projectSnapshot:connectivitySnapshot,
    projectList:()=> (state.projectTabs||[]).map(tab=>({id:String(tab.id),title:String(tab.title||'未命名项目'),active:tab.id===state.activeProjectTabId,dirty:!!tab.dirty})),
    projectSwitch:id=>switchProjectTab(String(id||'')),projectNew:args=>createProjectTab(String(args?.title||'').trim()||null,true),projectOpen:()=>openProject(),projectSave:()=>saveProject(),
    historyState:()=>systemHistorySnapshotSync(),historyUndo:()=>systemUndo(),historyRedo:()=>systemRedo(),artifacts:kernelArtifactApi,artifactUpsert:kernelArtifactUpsert,artifactRemove:kernelArtifactRemove,
    plotInspect:kernelPlotInspect,plotRender:kernelPlotRender,plotClose:()=>{document.getElementById('dkdsKernelPlotPanel')?.classList.add('hidden');return true;},
    pluginList:()=>window.DKDSPlugins?.manager?.list?.()||[],pluginValidate:pkg=>window.DKDSPlugins?.external?.validatePackage?.(pkg),pluginInstallGenerated:(pkg,options)=>window.DKDSPlugins?.external?.installPackage?.(pkg,options),pluginSetEnabled:(id,enabled)=>window.DKDSPlugins?.manager?.setEnabled?.(id,enabled),pluginUninstall:id=>window.DKDSPlugins?.external?.uninstall?.(id),
    files:()=>window.DKDSConnectivity?.files,smb:()=>window.DKDSConnectivity?.smb,runtimeStatus:kernelRuntimeStatus,automationRun:()=>window.DKDSAutomationTests?.run?.()
  });
  window.DKDSMcpRuntime?.configure?.({kernel:window.DKDSKernel});

  window.DKDSCapabilities?.register?.('core','core.data-sources',{
    kind:'service',title:'Project Data Sources',version:'1.0.0',remote:true,
    methods:dataSourceHostApi()
  });
  window.DKDSCapabilities?.register?.('core','core.project-history',{
    kind:'service',title:'Project Edit History',version:'1.0.0',remote:true,
    methods:projectHistoryHostApi()
  });
  window.DKDSCapabilities?.register?.('core','core.project-loader',{
    kind:'service',title:'Project Loader',version:'1.0.0',remote:false,
    methods:{
      openBase64:payload=>openProjectBase64(payload||{}),
      isProjectBase64:payload=>{
        try{const decoded=decodeImportSeed({base64:String(payload?.base64||''),encoding:'auto'});return !!window.DKDSProjectFormat?.isProjectLike?.(JSON.parse(decoded.text));}
        catch{return false;}
      }
    }
  });
  window.DKDSCapabilities?.register?.('core','core.ai-context',{
    kind:'service',title:'AI Mention Context',version:'1.0.0',remote:false,
    methods:{
      catalog:async()=>{
        const artifacts=await window.DKDSKernel?.call?.('data.artifacts.list',{includeTransient:true})||[];
        const plots=await window.DKDSKernel?.call?.('plot.inspect',{limit:50})||[];
        const results=artifacts.filter(row=>String(row.kind||'')==='result'||String(row.kind||'').startsWith('result.')||String(row.semanticType||'').startsWith('result.'));
        return {artifacts,plots,results};
      },
      resolve:async refs=>{
        const plots=await window.DKDSKernel?.call?.('plot.inspect',{limit:50})||[],out=[];
        for(const ref of (Array.isArray(refs)?refs:[]).slice(0,8)){
          const type=String(ref?.type||'artifact'),id=String(ref?.id||'');if(!id)continue;
          if(type==='plot'){const row=plots.find(plot=>String(plot.id)===id);if(row)out.push({type,id,label:String(ref?.label||row.title||id),plot:row});continue;}
          const summary=(await window.DKDSKernel?.call?.('data.artifacts.list',{includeTransient:true})||[]).find(row=>String(row.id)===id);
          if(!summary)continue;
          const [preview,stats,lineage]=await Promise.all([
            window.DKDSKernel?.call?.('data.artifacts.preview',{id,limit:120}),
            window.DKDSKernel?.call?.('data.artifacts.stats',{id}),
            window.DKDSKernel?.call?.('data.artifacts.lineage',{id})
          ]);
          out.push({type,id,label:String(ref?.label||summary.name||id),summary,preview,stats,lineage});
        }
        return out;
      }
    }
  });

  window.electronAPI?.onCapabilityInvokeRequest?.(async request=>{
    const requestId=String(request?.requestId||'');
    if(!requestId)return;
    try{
      const result=await window.DKDSCapabilities?.invoke?.(request.id,request.method,...(Array.isArray(request.args)?request.args:[]));
      window.electronAPI?.respondCapabilityInvoke?.({requestId,ok:true,result});
    }catch(err){
      window.electronAPI?.respondCapabilityInvoke?.({requestId,ok:false,error:err?.message||String(err)});
    }
  });

  window.DKDSPluginManagerUI?.configure?.({
    openAnalysisPage,
    closeAnalysisPage,
    syncAnalysisPageViewport,
    setStatus
  });

  window.DKDSAutomationTests?.configure?.({
    openAnalysisPage,
    closeAnalysisPage,
    syncAnalysisPageViewport,
    setStatus
  });

  await window.DKDSPlugins.loadBuiltinEntries();
  await window.DKDSPlugins.loadExternalEntries?.();
  const activated=await window.DKDSPlugins.activateAll();
  console.info('[DKDS plugins] activated',activated);
  await publishCapabilitySnapshot();
  let capabilityPublishTimer=null;
  window.addEventListener('dkds:capabilities-changed',()=>{clearTimeout(capabilityPublishTimer);capabilityPublishTimer=setTimeout(()=>publishCapabilitySnapshot(),0);});
  window.DKDSPlugins.events.on('plugin:state-changed',()=>{
    syncAnalysisPageViewport();
    setTimeout(()=>{publishCapabilitySnapshot();prewarmDedicatedPluginWindows();},0);
  });
  window.DKDSPlugins.events.on('plugin:manager-changed',()=>{syncAnalysisPageViewport();setTimeout(()=>publishCapabilitySnapshot(),0);});
  window.DKDSPlugins.events.on('plugin:prewarm-changed',()=>setTimeout(()=>prewarmDedicatedPluginWindows(),0));
  window.DKDSPlugins.events.on('super:selection-changed',()=>{
    applySuperWorkspace(window.DKDSPlugins.workspace.super());
    syncAnalysisPageViewport();
    setTimeout(()=>prewarmDedicatedPluginWindows(),0);
  });
  window.DKDSPlugins.events.on('super:changed',()=>applySuperWorkspace(window.DKDSPlugins.workspace.super()));
}

module.exports=Object.freeze({configure, capabilitySnapshotForWindows, publishCapabilitySnapshot, openPluginActivityWindow, prewarmDedicatedPluginWindows, cloneAuxSnapshot, applyArtifactDeltaToTab, applyDedicatedActivitySnapshot, applyActivityProjectSnapshot, preparePluginSuperTransition, initializePluginArchitecture, dedicatedPrewarmToken});
