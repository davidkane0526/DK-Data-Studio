'use strict';
const {$, loadTrendColumnsPreference, state}=require('./context');
const {diffArtifactRows, flexibleImportProvider, projectBaseName, pushArtifactDeltaToActivityWindows, setStatus, snapshotArtifactRows}=require('./foundation');
const activeProjectHistory=(...args)=>require('./project-tabs-history').activeProjectHistory(...args);
const activeProjectTab=(...args)=>require('./project-tabs-history').activeProjectTab(...args);
const blankProjectTab=(...args)=>require('./project-tabs-history').blankProjectTab(...args);
const captureActiveProjectTab=(...args)=>require('./project-tabs-history').captureActiveProjectTab(...args);
const markProjectClean=(...args)=>require('./project-tabs-history').markProjectClean(...args);
const mountProjectTab=(...args)=>require('./project-tabs-history').mountProjectTab(...args);
const renderProjectTabs=(...args)=>require('./project-tabs-history').renderProjectTabs(...args);
const base64ImportBytes=(...args)=>require('./import-workbench').base64ImportBytes(...args);
const syncDatasetArtifacts=(...args)=>require('./data-artifact-host').syncDatasetArtifacts(...args);
const clearMainView=(...args)=>require('./workspace-super-shell').clearMainView(...args);
const renderAll=(...args)=>require('./workspace-super-shell').renderAll(...args);
const scheduleMainPlotRelayout=(...args)=>require('./workspace-super-shell').scheduleMainPlotRelayout(...args);
const applyGroupPanelLayout=(...args)=>require('./floating-docks').applyGroupPanelLayout(...args);
const applyInspectorPanelLayout=(...args)=>require('./floating-docks').applyInspectorPanelLayout(...args);

function makeProject(){
  return {
    format:'dk-data-studio-project',
    schemaVersion:2,
    version:'3.61.106',
    datasets:state.datasets.map(d=>({
      name:d.name,path:d.path,text:d.text,vg:d.vg,
      sourcePath:d.sourcePath||d.path,
      sourceName:d.sourceName||d.name,
      encoding:d.encoding||'',
      importedAt:d.importedAt||null,
      dataProvenance:d.dataProvenance||[],
      importSpec:d.importSpec||null,
      assignments:Object.prototype.hasOwnProperty.call(d,'assignments')?(Array.isArray(d.assignments)?d.assignments:[]):['*'],
      points:(d.points||[]).map(p=>({
        v:p.v,i:p.i,index:p.index,sourceLine:p.sourceLine,sourceColumns:p.sourceColumns
      }))
    })),
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
function canonicalProjectDatasets(project){
  const out=[];
  for(const source of (Array.isArray(project?.datasets)?project.datasets:[])){
    if(Array.isArray(source?.points)&&source.points.length){
      out.push({...source,assignments:Object.prototype.hasOwnProperty.call(source,'assignments')?(Array.isArray(source.assignments)?source.assignments.map(String).filter(Boolean):[]):['*'],sourcePath:source.sourcePath||source.path,sourceName:source.sourceName||source.name,points:source.points.map((point,index)=>({...point,index}))});
      continue;
    }
    if(!source?.text)continue;
    try{
      const provider=flexibleImportProvider();
      // A self-contained project may keep the original multi-column text even
      // when only one signal column was adopted. Reparse with the SAVED import
      // mapping; reparsing with provider defaults can silently resurrect Ig or
      // another auxiliary channel that the user explicitly did not select.
      const savedSpec=source.importSpec&&typeof source.importSpec==='object'?source.importSpec:{};
      const options={...(provider.defaultOptions?.()||{}),...savedSpec};
      const parsed=provider.parse({name:source.sourceName||source.name,path:source.sourcePath||source.path,text:source.text,encoding:source.encoding||'auto'},options);
      const restored=parsed?.datasets||[];
      for(const dataset of restored){
        const single=restored.length===1;
        out.push({...dataset,
          name:single&&source.name?source.name:dataset.name,
          path:single&&source.path?source.path:dataset.path,
          importSpec:{...(dataset.importSpec||{}),...savedSpec},
          assignments:Object.prototype.hasOwnProperty.call(source,'assignments')?(Array.isArray(source.assignments)?source.assignments.map(String).filter(Boolean):[]):['*'],
          sourcePath:source.sourcePath||source.path,sourceName:source.sourceName||source.name
        });
      }
    }catch(err){console.warn('[DKDS project dataset restore]',err);}
  }
  return out;
}

function loadProjectIntoActive(pr,path){
  activeProjectHistory()?.clear?.('project-load');
  const previousArtifacts=snapshotArtifactRows();
  state.datasets=canonicalProjectDatasets(pr);
  state.projectPath=path||null;
  state.artifactStore=window.DKDSData.restoreStore(pr.dataModel||{schema:1,artifacts:[]});
  const artifactTab=activeProjectTab();
  if(artifactTab)artifactTab.artifactStore=state.artifactStore;
  syncDatasetArtifacts({emit:false});
  // Project restore is an Artifact transaction too. Legacy projects rebuild
  // their transient DataTable adapters from `project.datasets`; previously
  // that happened silently in the main renderer, leaving an already-open
  // Data Center/TOP renderer on the old empty snapshot. Broadcast the full
  // diff once, rather than asking each system window to special-case legacy
  // project formats or forcing a full window reload.
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

async function openProject(){
  const r=await window.electronAPI.openProject();
  if(!r)return;
  return openProjectPayload(r);
}

module.exports=Object.freeze({makeProject, chooseProjectSaveMode, saveProject, canonicalProjectDatasets, loadProjectIntoActive, openProjectPayload, openProjectBase64, openProject, projectSaveChoicePromise});
