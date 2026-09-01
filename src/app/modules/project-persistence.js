'use strict';
const {$, loadTrendColumnsPreference, state}=require('./context');
const {diffArtifactRows, projectBaseName, pushArtifactDeltaToActivityWindows, setStatus, snapshotArtifactRows}=require('./foundation');
let deps=null;
function configure(next){deps=next;return module.exports;}
const activeProjectHistory=(...args)=>deps.projectTabs.activeProjectHistory(...args);
const activeProjectTab=(...args)=>deps.projectTabs.activeProjectTab(...args);
const blankProjectTab=(...args)=>deps.projectTabs.blankProjectTab(...args);
const captureActiveProjectTab=(...args)=>deps.projectTabs.captureActiveProjectTab(...args);
const markProjectClean=(...args)=>deps.projectTabs.markProjectClean(...args);
const mountProjectTab=(...args)=>deps.projectTabs.mountProjectTab(...args);
const renderProjectTabs=(...args)=>deps.projectTabs.renderProjectTabs(...args);
const base64ImportBytes=(...args)=>deps.imports.base64ImportBytes(...args);
const clearMainView=(...args)=>deps.workspace.clearMainView(...args);
const renderAll=(...args)=>deps.workspace.renderAll(...args);
const scheduleMainPlotRelayout=(...args)=>deps.workspace.scheduleMainPlotRelayout(...args);
const applyGroupPanelLayout=(...args)=>deps.docks.applyGroupPanelLayout(...args);
const applyInspectorPanelLayout=(...args)=>deps.docks.applyInspectorPanelLayout(...args);

function makeProject(){
  return {
    format:'dk-data-studio-project',
    schemaVersion:3,
    version:'3.67.15',
    dataModel:window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false}),
    plugins:window.DKDSPlugins?.project?.serialize?.(activeProjectTab()?.pluginState||{})||activeProjectTab()?.pluginState||{},
    host:{
      trendColumns:state.trendColumns,
      panelLayout:{
        groupPanelMode:state.groupPanelMode,
        groupPanelCollapsed:state.groupPanelCollapsed,
        groupPanelDockHeight:state.groupPanelDockHeight,
        groupPanelFloatRect:state.groupPanelFloatRect,
        inspectorPanelMode:state.inspectorPanelMode,
        inspectorDockWidth:state.inspectorDockWidth,
        inspectorFloatRect:state.inspectorFloatRect
      }
    }
  };
}

let projectSaveChoicePromise=null;
function chooseProjectSaveMode(){
  if(projectSaveChoicePromise)return projectSaveChoicePromise;
  const dialog=$('#projectSaveChoiceDialog');
  if(!dialog)return Promise.resolve('current');
  const currentBtn=$('#projectSaveCurrentBtn');
  const saveAsBtn=$('#projectSaveAsBtn');
  const cancelBtn=$('#projectSaveCancelBtn');
  const hint=$('#projectSaveChoiceHint');
  const currentName=state.projectPath?projectBaseName(state.projectPath):'';
  if(window.electronAPI?.isWebClient){
    hint.textContent=currentName
      ? `当前工程：${currentName}。网页版工程内容与桌面版一致；浏览器允许原位写入时会直接覆盖，否则保存当前会下载同名工程文件。`
      : '网页版工程内容与桌面版一致；首次保存会选择文件位置，普通 HTTP 局域网页在浏览器限制下可能改为下载工程文件。';
  }else{
    hint.textContent=currentName
      ? `当前工程：${currentName}。保存当前会覆盖此文件；另存为会创建新工程文件并切换到新路径。`
      : '当前工程尚未保存过。选择“保存当前”时会先要求选择保存位置。';
  }
  dialog.classList.remove('hidden');
  projectSaveChoicePromise=new Promise(resolve=>{
    let settled=false;
    const finish=mode=>{
      if(settled)return;settled=true;
      dialog.classList.add('hidden');
      window.removeEventListener('keydown',onKey,true);
      projectSaveChoicePromise=null;
      resolve(mode);
    };
    const onKey=e=>{
      if(e.key==='Escape'){e.preventDefault();finish('cancel');}
      else if(e.key==='Enter'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();finish('current');}
    };
    currentBtn.onclick=()=>finish('current');
    saveAsBtn.onclick=()=>finish('saveAs');
    cancelBtn.onclick=()=>finish('cancel');
    dialog.onclick=e=>{if(e.target===dialog)finish('cancel');};
    window.addEventListener('keydown',onKey,true);
    requestAnimationFrame(()=>currentBtn.focus());
  });
  return projectSaveChoicePromise;
}

async function saveProject(options={}){
  const mode=options.mode||await chooseProjectSaveMode();
  if(!mode||mode==='cancel')return null;
  const saved=await window.electronAPI.saveProject({
    mode,
    path:state.projectPath,
    defaultName:state.projectPath?`${projectBaseName(state.projectPath)}.dkds.json`:'dk_data_project.dkds.json',
    project:makeProject()
  });
  if(saved){
    state.projectPath=saved;
    const tab=activeProjectTab();
    if(tab){tab.projectPath=saved;tab.title=projectBaseName(saved);}
    captureActiveProjectTab();
    markProjectClean(tab,makeProject());
    renderProjectTabs();
    const verb=mode==='saveAs'?'工程已另存为':'工程已保存';
    const browserDownload=window.electronAPI?.isWebClient&&String(saved).startsWith('web://');
    setStatus(`${verb}：${saved}${browserDownload?'（浏览器下载模式）':''}`);
    return saved;
  }
  return null;
}
function loadProjectIntoActive(pr,path){
  activeProjectHistory()?.clear?.('project-load');
  const previousArtifacts=snapshotArtifactRows();
  state.projectPath=path||null;
  state.artifactStore=window.DKDSData.restoreStore(pr.dataModel||{schema:2,artifacts:[]});
  const artifactTab=activeProjectTab();
  if(artifactTab)artifactTab.artifactStore=state.artifactStore;
  // Project Compatibility Gateway guarantees a canonical Schema v3 payload
  // before runtime restore, so every renderer receives the same Artifact diff.
  const projectRestoreDelta=diffArtifactRows(previousArtifacts,snapshotArtifactRows());
  if(projectRestoreDelta.upserts.length||projectRestoreDelta.removedIds.length){
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'project-restore',artifactDelta:projectRestoreDelta,artifacts:snapshotArtifactRows()});
    pushArtifactDeltaToActivityWindows(projectRestoreDelta,'project-restore');
  }

  const currentTab=activeProjectTab();
  if(currentTab)currentTab.pluginState=JSON.parse(JSON.stringify(pr.plugins||{}));
  window.DKDSPlugins?.project?.restore?.(pr.plugins||{});

  const host=pr.host&&typeof pr.host==='object'?pr.host:{};
  const panelLayout=host.panelLayout&&typeof host.panelLayout==='object'?host.panelLayout:{};
  state.trendColumns=host.trendColumns||loadTrendColumnsPreference();
  state.groupPanelMode=panelLayout.groupPanelMode||'docked';
  state.groupPanelCollapsed=!!panelLayout.groupPanelCollapsed;
  state.groupPanelDockHeight=Number(panelLayout.groupPanelDockHeight)||360;
  state.groupPanelFloatRect=panelLayout.groupPanelFloatRect||null;
  state.inspectorPanelMode=panelLayout.inspectorPanelMode||'right';
  state.inspectorDockWidth=Number(panelLayout.inspectorDockWidth)||390;
  state.inspectorFloatRect=panelLayout.inspectorFloatRect||null;
  clearMainView(false);
}

function openProjectPayload(r){
  if(!r?.project)return false;
  const path=String(r.path||'remote://dk-data-project.dkds.json');
  captureActiveProjectTab();
  const tab=blankProjectTab(projectBaseName(path));
  state.projectTabs.push(tab);
  state.activeProjectTabId=tab.id;
  mountProjectTab(tab);
  loadProjectIntoActive(r.project,path);
  tab.title=projectBaseName(path);
  captureActiveProjectTab();
  markProjectClean(tab,makeProject());
  renderProjectTabs();
  renderAll();
  applyGroupPanelLayout();
  applyInspectorPanelLayout();
  scheduleMainPlotRelayout();
  setStatus(`已在新标签页打开工程：${path}`);
  return true;
}

function openProjectBase64({base64,path,name}={}){
  const bytes=base64ImportBytes(base64||'');
  if(!bytes.length)throw new Error('工程文件为空。');
  const parsed=window.DKDSProjectFormat?.parseProjectBytes?.(bytes);
  if(!parsed?.project)throw new Error('无法解析 DK Data Studio 工程文件。');
  return openProjectPayload({project:parsed.project,path:String(path||name||'remote://dk-data-project.dkds.json')});
}

async function showProjectOpenFailure(err){
  const message=String(err?.message||err||'未知错误');
  console.error('Project open failed',err);
  setStatus(`打开工程失败：${message}`);
  await window.DKDSUI?.dialogs?.alert?.({tone:'error',title:'无法打开项目',message,detail:String(err?.stack||''),detailLabel:'技术详情'});
}

async function openProject(){
  try{
    const r=await window.electronAPI.openProject();
    if(!r)return false;
    return openProjectPayload(r);
  }catch(err){
    await showProjectOpenFailure(err);
    return false;
  }
}

module.exports=Object.freeze({configure, makeProject, chooseProjectSaveMode, saveProject, loadProjectIntoActive, openProjectPayload, openProjectBase64, openProject, projectSaveChoicePromise});
