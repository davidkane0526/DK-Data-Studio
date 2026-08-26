'use strict';
const {$, state}=require('./context');
const {initializeLanWebUi, initializeUpdateUi, setStatus}=require('./foundation');
const blankProjectTab=(...args)=>require('./project-tabs-history').blankProjectTab(...args);
const mountProjectTab=(...args)=>require('./project-tabs-history').mountProjectTab(...args);
const renderProjectTabs=(...args)=>require('./project-tabs-history').renderProjectTabs(...args);
const switchProjectTab=(...args)=>require('./project-tabs-history').switchProjectTab(...args);
const openImportWorkbench=(...args)=>require('./import-workbench').openImportWorkbench(...args);
const applySuperWorkspace=(...args)=>require('./workspace-super-shell').applySuperWorkspace(...args);
const bindSuperWorkspaceDivider=(...args)=>require('./workspace-super-shell').bindSuperWorkspaceDivider(...args);
const renderAll=(...args)=>require('./workspace-super-shell').renderAll(...args);
const syncAnalysisPageViewport=(...args)=>require('./workspace-super-shell').syncAnalysisPageViewport(...args);
const updateMainModeButtons=(...args)=>require('./workspace-super-shell').updateMainModeButtons(...args);
const saveProject=(...args)=>require('./project-persistence').saveProject(...args);
const applyGroupPanelLayout=(...args)=>require('./floating-docks').applyGroupPanelLayout(...args);
const applyInspectorPanelLayout=(...args)=>require('./floating-docks').applyInspectorPanelLayout(...args);
const applyActivityProjectSnapshot=(...args)=>require('./dedicated-plugin-windows').applyActivityProjectSnapshot(...args);
const initializePluginArchitecture=(...args)=>require('./dedicated-plugin-windows').initializePluginArchitecture(...args);
const prewarmDedicatedPluginWindows=(...args)=>require('./dedicated-plugin-windows').prewarmDedicatedPluginWindows(...args);

async function startApplication(){
  await initializePluginArchitecture();
  bindSuperWorkspaceDivider();
  applySuperWorkspace(window.DKDSPlugins?.workspace?.super?.());
  syncAnalysisPageViewport();

  // Start with exactly one isolated project after plugin slices are ready.
  const initialTab=blankProjectTab('项目 1');
  state.projectTabs.push(initialTab);
  state.activeProjectTabId=initialTab.id;
  mountProjectTab(initialTab);

  window.electronAPI?.onOwnerProjectSaveRequest?.(payload=>{applyActivityProjectSnapshot(payload);saveProject();});
  window.electronAPI?.onOwnerImportWorkbenchRequest?.(payload=>{
    const tabId=String(payload?.projectTabId||'');
    if(tabId&&tabId!==state.activeProjectTabId&&state.projectTabs.some(tab=>tab.id===tabId))switchProjectTab(tabId);
    openImportWorkbench(payload?.options&&typeof payload.options==='object'?payload.options:{});
  });
  window.electronAPI?.onActivityProjectSnapshot?.(applyActivityProjectSnapshot);
  window.electronAPI?.onActivityWindowFailed?.(payload=>{
    const activity=String(payload?.activityId||'插件工作区');
    const error=String(payload?.error||'独立窗口启动失败。').split('\n')[0];
    setStatus(`工作区 ${activity} 打开失败：${error}`);
    console.error('[DKDS activity-window startup]',payload);
  });

  renderProjectTabs();
  updateMainModeButtons();
  renderAll();
  applyGroupPanelLayout();
  applyInspectorPanelLayout();
  initializeUpdateUi();
  initializeLanWebUi();
  window.electronAPI?.onPluginLanUpdate?.(info=>{
    setStatus(`插件 ${info?.name||info?.id||''} v${info?.version||'?'} 已通过局域网接收；重启软件后启用新版本。`);
  });
  prewarmDedicatedPluginWindows();
  window.DKDSPlugins?.events?.emit?.('app:ready',{state,auxiliary:false});
}

startApplication().catch(err=>{
  console.error('[DKDS startup]',err);
  setStatus(`启动失败：${err.message}`);
});

module.exports=Object.freeze({startApplication});
