'use strict';
const {$, state}=require('./context');
const {initializeLanWebUi, initializeUpdateUi, setStatus}=require('./foundation');
const {blankProjectTab, mountProjectTab, renderProjectTabs, switchProjectTab}=require('./project-tabs-history');
const {openImportWorkbench}=require('./import-workbench');
const {applySuperWorkspace, bindSuperWorkspaceControls, renderAll, syncAnalysisPageViewport, updateMainModeButtons}=require('./workspace-super-shell');
const {saveProject}=require('./project-persistence');
const {applyActivityProjectSnapshot, configureAutomationTests, initializePluginArchitecture, prewarmDedicatedPluginWindows}=require('./dedicated-plugin-windows');
const {initializeWindowChrome}=require('./window-chrome');
async function startApplication(){
  void initializeWindowChrome();
  const visualClosure=new URLSearchParams(window.location.search).get('dkdsAutomation')==='visual-closure';
  if(visualClosure)await window.DKDSOptionalRuntime?.ensureAutomationRuntime?.();
  const automationButton=$('#automationTestBtn');
  automationButton?.addEventListener('click',async event=>{
    if(window.DKDSAutomationTests)return;
    event.preventDefault();event.stopImmediatePropagation();
    const runtime=await window.DKDSOptionalRuntime?.ensureAutomationRuntime?.();
    configureAutomationTests();runtime?.open?.();
  },true);
  await initializePluginArchitecture();
  bindSuperWorkspaceControls();
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
