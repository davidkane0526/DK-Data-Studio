'use strict';
const {$, state}=require('./context');
const {escapeHtml, projectBaseName, setStatus}=require('./foundation');
let deps=null;
function configure(next){deps=next;return module.exports;}
const clearMainView=(...args)=>deps.workspace.clearMainView(...args);
const refreshOpenAnalysisPage=(...args)=>deps.workspace.refreshOpenAnalysisPage(...args);
const renderAll=(...args)=>deps.workspace.renderAll(...args);
const scheduleMainPlotRelayout=(...args)=>deps.workspace.scheduleMainPlotRelayout(...args);
const makeProject=(...args)=>deps.projects.makeProject(...args);
const saveProject=(...args)=>deps.projects.saveProject(...args);
const prewarmDedicatedPluginWindows=(...args)=>deps.windows.prewarmDedicatedPluginWindows(...args);

function blankProjectTab(title=null){
  const n=++state.projectTabSeq;
  return {
    id:`project-tab-${Date.now()}-${n}-${Math.random().toString(36).slice(2,7)}`,
    title:title||`项目 ${n}`,
    artifactStore:window.DKDSData.createStore(),
    importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false,targets:null,selectionAnchorPath:null,columnFieldFilter:''},
    pluginState:{},
    projectPath:null,
    mainView:{xDomain:null,yDomain:null,mode:'select'},
    history:window.DKDSProjectHistory?.create?.({limit:80})||null,
    dirty:false,
    lastSavedFingerprint:null,
    autosavedAt:0
  };
}

function activeProjectTab(){
  return state.projectTabs.find(t=>t.id===state.activeProjectTabId)||null;
}

function activeProjectHistory(){
  const tab=activeProjectTab();if(!tab)return null;
  if(!tab.history)tab.history=window.DKDSProjectHistory?.create?.({limit:80})||null;
  return tab.history;
}
function projectHistorySnapshot(){return activeProjectHistory()?.snapshot?.()||{canUndo:false,canRedo:false,undoLabel:'',redoLabel:'',past:[],future:[]};}
const projectDirtyTimers=new Map();
function projectFingerprint(project){
  let text='';try{text=window.DKDSProjectFormat?.serializeProject?.(project)||JSON.stringify(project||{});}catch{text=JSON.stringify(project||{});}
  let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `${text.length}:${(hash>>>0).toString(16)}`;
}
function markProjectClean(tab,project=null){if(!tab)return;const snapshot=project||(tab.id===state.activeProjectTabId?makeProject():null);if(snapshot)tab.lastSavedFingerprint=projectFingerprint(snapshot);tab.dirty=false;tab.autosavedAt=Date.now();}
async function refreshProjectDirty(tab=activeProjectTab()){
  if(!tab||tab.id!==state.activeProjectTabId)return false;
  const fingerprint=projectFingerprint(makeProject());
  if(tab.lastSavedFingerprint===null){tab.lastSavedFingerprint=fingerprint;return false;}
  const changed=tab.dirty!==(fingerprint!==tab.lastSavedFingerprint);
  tab.dirty=fingerprint!==tab.lastSavedFingerprint;
  return changed;
}
function scheduleProjectDirtyCheck(tab=activeProjectTab()){
  if(!tab)return;const old=projectDirtyTimers.get(tab.id);if(old)clearTimeout(old);
  const timer=setTimeout(()=>{projectDirtyTimers.delete(tab.id);void refreshProjectDirty(tab).then(changed=>{if(changed)renderProjectTabs();});},1800);
  projectDirtyTimers.set(tab.id,timer);
}
function notifySystemHistory(reason='change',detail={}){try{window.dispatchEvent(new CustomEvent('dkds:history-changed',{detail:{scope:'project',reason,at:Date.now(),...detail}}));}catch{}}
function recordProjectHistory(entry){const ok=activeProjectHistory()?.record?.(entry)||false;if(ok){const tab=activeProjectTab();if(tab)tab.dirty=true;scheduleProjectDirtyCheck(tab);notifySystemHistory('record',{label:String(entry?.label||'项目修改')});}return ok;}
async function undoProjectHistory(){const history=activeProjectHistory();if(!history?.canUndo?.())return false;const label=history.snapshot?.().undoLabel||'项目修改';const ok=await history.undo();if(ok){const tab=activeProjectTab();if(tab)tab.dirty=true;scheduleProjectDirtyCheck(tab);notifySystemHistory('undo',{label});setStatus(`已撤销：${label}`);}return ok;}
async function redoProjectHistory(){const history=activeProjectHistory();if(!history?.canRedo?.())return false;const label=history.snapshot?.().redoLabel||'项目修改';const ok=await history.redo();if(ok){const tab=activeProjectTab();if(tab)tab.dirty=true;scheduleProjectDirtyCheck(tab);notifySystemHistory('redo',{label});setStatus(`已重做：${label}`);}return ok;}

function captureActiveProjectTab(){
  const t=activeProjectTab();
  if(!t)return;
  t.artifactStore=state.artifactStore;
  t.importDraft=state.importDraft;
  t.projectPath=state.projectPath;
  t.pluginState=window.DKDSPlugins?.project?.serialize?.(t.pluginState||{})||t.pluginState||{};
  t.mainView={...state.mainView,
    xDomain:state.mainView.xDomain?state.mainView.xDomain.slice():null,
    yDomain:state.mainView.yDomain?state.mainView.yDomain.slice():null};
  if(state.projectPath)t.title=projectBaseName(state.projectPath);
  scheduleProjectDirtyCheck(t);
}

function mountProjectTab(t){
  if(!t.history)t.history=window.DKDSProjectHistory?.create?.({limit:80})||null;
  state.artifactStore=t.artifactStore||window.DKDSData.createStore();
  t.artifactStore=state.artifactStore;
  state.importDraft=t.importDraft||{files:[],activePath:null,loading:false,fileDialogOpen:false,targets:null,scope:null,selectionAnchorPath:null,columnFieldFilter:''};
  if(!Object.prototype.hasOwnProperty.call(state.importDraft,'targets'))state.importDraft.targets=null;
  if(!Object.prototype.hasOwnProperty.call(state.importDraft,'selectionAnchorPath'))state.importDraft.selectionAnchorPath=null;
  if(typeof state.importDraft.columnFieldFilter!=='string')state.importDraft.columnFieldFilter='';
  delete state.importDraft.columnTagFilter;
  state.importDraft.scope=null;
  t.importDraft=state.importDraft;
  state.projectPath=t.projectPath||null;
  state.mainView={
    xDomain:t.mainView?.xDomain?t.mainView.xDomain.slice():null,
    yDomain:t.mainView?.yDomain?t.mainView.yDomain.slice():null,
    mode:t.mainView?.mode||'select'
  };
  if(window.DKDSPlugins?.project?.restore)window.DKDSPlugins.project.restore(t.pluginState||{});
  setTimeout(()=>{if(t.id===state.activeProjectTabId&&t.lastSavedFingerprint===null&&!t.dirty){try{t.lastSavedFingerprint=projectFingerprint(makeProject());}catch{}}},0);
}

function createProjectTab(title=null,activate=true){
  captureActiveProjectTab();void refreshProjectDirty(activeProjectTab());
  const t=blankProjectTab(title);
  state.projectTabs.push(t);
  if(activate){
    state.activeProjectTabId=t.id;
    mountProjectTab(t);
    clearMainView(false);
    renderAll();
  }
  renderProjectTabs();
  if(activate)setTimeout(()=>prewarmDedicatedPluginWindows(),0);
  return t;
}

function switchProjectTab(id){
  if(id===state.activeProjectTabId)return;
  captureActiveProjectTab();void refreshProjectDirty(activeProjectTab());
  const t=state.projectTabs.find(q=>q.id===id);
  if(!t)return;
  state.activeProjectTabId=id;
  mountProjectTab(t);
  renderProjectTabs();
  renderAll();
  scheduleMainPlotRelayout();
  refreshOpenAnalysisPage();
  setStatus(`已切换到独立项目：${t.title}`);
  setTimeout(()=>prewarmDedicatedPluginWindows(),0);
}

async function closeProjectTab(id){
  let t=state.projectTabs.find(q=>q.id===id);if(!t)return false;
  if(t.id===state.activeProjectTabId){captureActiveProjectTab();const project=makeProject(),fp=projectFingerprint(project);if(t.lastSavedFingerprint!==null&&fp!==t.lastSavedFingerprint)t.dirty=true;}
  const pendingBeforePrompt=projectDirtyTimers.get(t.id);if(pendingBeforePrompt){clearTimeout(pendingBeforePrompt);projectDirtyTimers.delete(t.id);}
  const hasContent=!!((t.artifactStore?.size?.()||0)||t.dirty||t.projectPath);
  let action='delete';
  if(window.DKDSUI?.dialogs?.show){
    const actions=t.dirty
      ?[{id:'cancel',label:'取消'},{id:'discard',label:'不保存删除',kind:'danger'},{id:'save',label:'保存后删除',kind:'primary',autofocus:true}]
      :[{id:'cancel',label:'取消'},{id:'delete',label:'删除标签',kind:'danger',autofocus:true}];
    action=await window.DKDSUI.dialogs.show({tone:t.dirty?'warning':'info',title:'删除项目标签？',subtitle:t.title,message:t.dirty?'当前项目还有未保存修改。建议先保存，再删除项目标签。':hasContent?'项目已保存或没有检测到未保存修改。删除标签不会删除磁盘上的工程文件。':'当前项目为空。确认删除此标签？',actions,defaultAction:t.dirty?'save':'delete',cancelAction:'cancel'});
  }else if(!window.confirm(`删除“${t.title}”项目标签？${t.dirty?' 当前有未保存修改。':''}`))action='cancel';
  if(action==='cancel'||action==='dismiss'){scheduleProjectDirtyCheck(t);return false;}
  if(action==='save'){
    if(t.id!==state.activeProjectTabId)switchProjectTab(t.id);
    const saved=await saveProject({mode:t.projectPath?'current':undefined});if(!saved)return false;
    t=activeProjectTab()||t;
  }
  const pending=projectDirtyTimers.get(t.id);if(pending){clearTimeout(pending);projectDirtyTimers.delete(t.id);}
  window.electronAPI?.disposeProjectActivityWindows?.(id);
  if(state.projectTabs.length===1){
    const fresh=blankProjectTab('项目 1');fresh.id=t.id;state.projectTabs=[fresh];state.activeProjectTabId=fresh.id;mountProjectTab(fresh);renderProjectTabs();renderAll();return true;
  }
  const idx=state.projectTabs.findIndex(q=>q.id===id),wasActive=id===state.activeProjectTabId;state.projectTabs.splice(idx,1);
  if(wasActive){const next=state.projectTabs[Math.max(0,idx-1)]||state.projectTabs[0];state.activeProjectTabId=next.id;mountProjectTab(next);renderAll();scheduleMainPlotRelayout();}
  renderProjectTabs();return true;
}

function renderProjectTabs(){
  const host=$('#projectTabs');
  if(!host)return;
  captureActiveProjectTab();
  host.innerHTML='';
  for(const t of state.projectTabs){
    const selected=t.id===state.activeProjectTabId;
    const el=document.createElement('div');
    el.className=`project-tab${selected?' selected':''}`;
    el.dataset.tabId=t.id;
    el.setAttribute('role','tab');
    el.setAttribute('aria-selected',selected?'true':'false');
    el.tabIndex=selected?0:-1;
    el.title=t.projectPath||t.title;
    el.innerHTML=`<span class="project-tab-title">${escapeHtml(t.title)}</span><button class="project-tab-close quiet" title="关闭项目">×</button>`;
    el.onclick=e=>{
      if(e.target.closest('.project-tab-close'))return;
      switchProjectTab(t.id);
    };
    el.querySelector('.project-tab-close').onclick=e=>{
      e.stopPropagation();
      closeProjectTab(t.id);
    };
    host.appendChild(el);
  }
  const active=activeProjectTab();
  const persistent=$('#statusBarPersistent'),separator=$('#statusBarPersistentSeparator');
  const projectLabel=active?.title?`项目：${active.title}`:'';
  if(persistent)persistent.textContent=projectLabel;
  if(separator)separator.classList.toggle('hidden',!projectLabel);
  window.dispatchEvent(new CustomEvent('dkds:project-changed',{detail:{id:active?.id||'',title:active?.title||''}}));
}

module.exports=Object.freeze({configure, blankProjectTab, activeProjectTab, activeProjectHistory, projectHistorySnapshot, projectFingerprint, markProjectClean, refreshProjectDirty, scheduleProjectDirtyCheck, notifySystemHistory, recordProjectHistory, undoProjectHistory, redoProjectHistory, captureActiveProjectTab, mountProjectTab, createProjectTab, switchProjectTab, closeProjectTab, renderProjectTabs, projectDirtyTimers});
