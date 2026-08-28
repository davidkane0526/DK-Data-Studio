'use strict';
const {$, state, status}=require('./context');
const {copyTextToClipboard, ensureFloatingPanelVisible, floatingSafeBounds, hideLanWebPanel, importActiveItem, importProvider, lanWebShareUrl, loadLanWebSettings, loadUpdateSettingsIntoPanel, normalizeLanWebBaseUrl, renderLanWebQr, renderLanWebStatus, renderUpdateStatus, safeName, setStatus, showLanWebPanel}=require('./foundation');
let deps=null;
function configure(next){deps=next;return module.exports;}
const activeProjectTab=(...args)=>deps.projectTabs.activeProjectTab(...args);
const createProjectTab=(...args)=>deps.projectTabs.createProjectTab(...args);
const projectHistorySnapshot=(...args)=>deps.projectTabs.projectHistorySnapshot(...args);
const redoProjectHistory=(...args)=>deps.projectTabs.redoProjectHistory(...args);
const undoProjectHistory=(...args)=>deps.projectTabs.undoProjectHistory(...args);
const addImportFiles=(...args)=>deps.imports.addImportFiles(...args);
const applyCurrentImportSettingsToAll=(...args)=>deps.imports.applyCurrentImportSettingsToAll(...args);
const applyImportColumnFieldFilter=(...args)=>deps.imports.applyImportColumnFieldFilter(...args);
const closeImportWorkbench=(...args)=>deps.imports.closeImportWorkbench(...args);
const commitImportWorkbench=(...args)=>deps.imports.commitImportWorkbench(...args);
const handleImportListShortcut=(...args)=>deps.imports.handleImportListShortcut(...args);
const invertImportChecked=(...args)=>deps.imports.invertImportChecked(...args);
const readImportItemText=(...args)=>deps.imports.readImportItemText(...args);
const recomputeImportItem=(...args)=>deps.imports.recomputeImportItem(...args);
const renderImportWorkbench=(...args)=>deps.imports.renderImportWorkbench(...args);
const resetCurrentImportAuto=(...args)=>deps.imports.resetCurrentImportAuto(...args);
const updateImportSetting=(...args)=>deps.imports.updateImportSetting(...args);
const importFiles=(...args)=>deps.artifacts.importFiles(...args);
const closeAnalysisPage=(...args)=>deps.workspace.closeAnalysisPage(...args);
const resetMainView=(...args)=>deps.workspace.resetMainView(...args);
const scheduleMainPlotRelayout=(...args)=>deps.workspace.scheduleMainPlotRelayout(...args);
const syncAnalysisPageViewport=(...args)=>deps.workspace.syncAnalysisPageViewport(...args);
const setTrendColumns=(...args)=>deps.scientific.setTrendColumns(...args);
const updateTrendLayout=(...args)=>deps.scientific.updateTrendLayout(...args);
const zoomCsvText=(...args)=>deps.scientific.zoomCsvText(...args);
const openProject=(...args)=>deps.projects.openProject(...args);
const saveProject=(...args)=>deps.projects.saveProject(...args);
const openPluginActivityWindow=(...args)=>deps.windows.openPluginActivityWindow(...args);

function captureGroupFloatRect(){
  const panel=$('#groupPanel');
  if(!panel||panel.classList.contains('docked'))return;
  const r=panel.getBoundingClientRect();
  state.groupPanelFloatRect={left:r.left,top:r.top,width:r.width,height:Math.max(220,r.height)};
}

function applyGroupPanelLayout(){
  const panel=$('#groupPanel');
  const slot=$('#dockedGroupSlot');
  const appRoot=$('#app');
  if(!panel||!slot||!appRoot)return;

  if(state.groupPanelMode==='docked'){
    if(panel.parentElement!==slot)slot.appendChild(panel);
    slot.classList.toggle('active',!panel.classList.contains('hidden'));
    panel.classList.add('docked');
    panel.style.left='';panel.style.right='';panel.style.top='';panel.style.bottom='';panel.style.transform='';
    panel.style.width='';
    panel.style.height=state.groupPanelCollapsed?'38px':`${state.groupPanelDockHeight}px`;
    $('#groupDockBtn').textContent='恢复悬浮';
    $('#groupDockBtn')?.setAttribute('aria-label','将组图恢复为可拖动悬浮窗口');
  }else{
    slot.classList.remove('active');
    if(panel.parentElement!==appRoot)appRoot.appendChild(panel);
    panel.classList.remove('docked');
    const r=state.groupPanelFloatRect;
    panel.style.transform='none';
    if(r){
      panel.style.left=`${Math.max(0,r.left)}px`;panel.style.top=`${Math.max(58,r.top)}px`;
      panel.style.right='auto';panel.style.bottom='auto';panel.style.width=`${Math.max(480,r.width)}px`;
      panel.style.height=state.groupPanelCollapsed?'38px':`${Math.max(260,r.height)}px`;
    }else{
      panel.style.left='auto';panel.style.top='auto';panel.style.right='24px';panel.style.bottom='36px';panel.style.width='880px';panel.style.height=state.groupPanelCollapsed?'38px':'620px';
    }
    $('#groupDockBtn').textContent='停靠底部';
    $('#groupDockBtn')?.setAttribute('aria-label','将组图停靠到主图下方，使主图自动上移');
  }

  panel.classList.toggle('collapsed',state.groupPanelCollapsed);
  $('#groupMinimizeBtn').textContent=state.groupPanelCollapsed?'展开':'缩小';
  $('#groupMinimizeBtn')?.setAttribute('aria-label',state.groupPanelCollapsed?'展开组图面板':'将组图缩小为标题栏');

  requestAnimationFrame(()=>{
    scheduleMainPlotRelayout();
    if(!state.groupPanelCollapsed&&!panel.classList.contains('hidden'))updateTrendLayout(true);
  });
}

function toggleGroupDock(){
  const panel=$('#groupPanel');
  if(state.groupPanelMode==='floating'){
    captureGroupFloatRect();
    state.groupPanelMode='docked';
    state.groupPanelCollapsed=false;
    panel.classList.remove('hidden');
    setStatus('组图已停靠到底部；主图已自动上移。拖动组图上边缘可调整高度。');
  }else{
    state.groupPanelMode='floating';
    setStatus('组图已恢复为悬浮面板。');
  }
  applyGroupPanelLayout();
}

function toggleGroupMinimize(){
  const panel=$('#groupPanel');
  if(!state.groupPanelCollapsed){
    if(state.groupPanelMode==='docked')state.groupPanelDockHeight=Math.max(180,panel.getBoundingClientRect().height);
    else captureGroupFloatRect();
  }
  state.groupPanelCollapsed=!state.groupPanelCollapsed;
  applyGroupPanelLayout();
}

function setupDockResizer(){
  const handle=$('#groupDockResizer');
  let active=false,startY=0,startH=0;
  handle.addEventListener('mousedown',e=>{
    if(state.groupPanelMode!=='docked'||state.groupPanelCollapsed)return;
    active=true;startY=e.clientY;startH=$('#groupPanel').getBoundingClientRect().height;e.preventDefault();e.stopPropagation();
  });
  window.addEventListener('mousemove',e=>{
    if(!active)return;
    const area=$('.main-area');
    const maxH=Math.max(220,Math.floor(area.getBoundingClientRect().height*0.72));
    // Dragging the top edge upward increases panel height.
    state.groupPanelDockHeight=Math.max(180,Math.min(maxH,startH+(startY-e.clientY)));
    $('#groupPanel').style.height=`${state.groupPanelDockHeight}px`;
    scheduleMainPlotRelayout();
    updateTrendLayout(true);
  });
  window.addEventListener('mouseup',()=>{active=false;});
}

function captureInspectorFloatRect(){
  const panel=$('#inspectorPanel');
  if(!panel||panel.classList.contains('docked-right'))return;
  const r=panel.getBoundingClientRect();
  state.inspectorFloatRect={
    left:r.left,top:r.top,
    width:Math.max(320,r.width),
    height:Math.max(260,r.height)
  };
}

function applyInspectorPanelLayout(){
  const panel=$('#inspectorPanel');
  const slot=$('#inspectorDockSlot');
  const appRoot=$('#app');
  if(!panel||!slot||!appRoot)return;

  if(state.inspectorPanelMode==='right'){
    if(panel.parentElement!==slot)slot.appendChild(panel);
    slot.classList.toggle('active',!panel.classList.contains('hidden'));
    slot.style.width=panel.classList.contains('hidden')?'0px':`${Math.max(300,state.inspectorDockWidth)}px`;
    panel.classList.add('docked-right');
    panel.style.left='';panel.style.right='';panel.style.top='';panel.style.bottom='';
    panel.style.transform='';panel.style.width='';panel.style.height='';
    $('#inspectorDockBtn').textContent='恢复悬浮';
    $('#inspectorDockBtn')?.setAttribute('aria-label','将曲线检查器恢复为可拖动悬浮窗口');
  }else{
    slot.classList.remove('active');
    slot.style.width='0px';
    if(panel.parentElement!==appRoot)appRoot.appendChild(panel);
    panel.classList.remove('docked-right');
    const r=state.inspectorFloatRect;
    panel.style.transform='none';
    if(r){
      panel.style.left=`${Math.max(0,r.left)}px`;
      panel.style.top=`${Math.max(58,r.top)}px`;
      panel.style.right='auto';panel.style.bottom='auto';
      panel.style.width=`${Math.max(320,r.width)}px`;
      panel.style.height=`${Math.max(260,r.height)}px`;
    }else{
      panel.style.left='auto';panel.style.top='86px';panel.style.right='24px';panel.style.bottom='auto';
      panel.style.width='390px';panel.style.height='520px';
    }
    $('#inspectorDockBtn').textContent='停靠右侧';
    $('#inspectorDockBtn')?.setAttribute('aria-label','将曲线检查器嵌入主图右侧');
  }

  requestAnimationFrame(()=>scheduleMainPlotRelayout());
}

function toggleInspectorDock(){
  const panel=$('#inspectorPanel');
  if(state.inspectorPanelMode==='floating'){
    captureInspectorFloatRect();
    state.inspectorPanelMode='right';
    panel.classList.remove('hidden');
    setStatus('曲线检查器已停靠到主图右侧；拖动其左边缘可调整宽度。');
  }else{
    state.inspectorPanelMode='floating';
    setStatus('曲线检查器已恢复为悬浮窗口。');
  }
  applyInspectorPanelLayout();
}

function setupInspectorDockResizer(){
  const handle=$('#inspectorDockResizer');
  if(!handle)return;
  let active=false,startX=0,startW=0;
  handle.addEventListener('mousedown',e=>{
    if(state.inspectorPanelMode!=='right')return;
    active=true;
    startX=e.clientX;
    startW=$('#inspectorDockSlot').getBoundingClientRect().width;
    e.preventDefault();e.stopPropagation();
  });
  window.addEventListener('mousemove',e=>{
    if(!active)return;
    const workspace=$('#mainWorkspace');
    const maxW=Math.max(340,Math.floor(workspace.getBoundingClientRect().width*.62));
    state.inspectorDockWidth=Math.max(300,Math.min(maxW,startW+(startX-e.clientX)));
    $('#inspectorDockSlot').style.width=`${state.inspectorDockWidth}px`;
    scheduleMainPlotRelayout();
  });
  window.addEventListener('mouseup',()=>{active=false;});
}

function makeFloating(panel){
  const head=panel.querySelector('.drag-handle');if(!head)return;let dragging=false,dx=0,dy=0;
  head.addEventListener('mousedown',e=>{if(e.target.closest('button')||panel.classList.contains('docked')||panel.classList.contains('docked-right'))return;const r=panel.getBoundingClientRect();panel.style.transform='none';panel.style.left=`${r.left}px`;panel.style.top=`${r.top}px`;panel.style.right='auto';panel.style.bottom='auto';dragging=true;dx=e.clientX-r.left;dy=e.clientY-r.top;e.preventDefault();});
  window.addEventListener('mousemove',e=>{if(!dragging)return;const bounds=floatingSafeBounds(panel),r=panel.getBoundingClientRect(),maxLeft=Math.max(bounds.left,bounds.right-r.width),maxTop=Math.max(bounds.top,bounds.bottom-r.height);panel.style.left=`${Math.min(maxLeft,Math.max(bounds.left,e.clientX-dx))}px`;panel.style.top=`${Math.min(maxTop,Math.max(bounds.top,e.clientY-dy))}px`;});
  window.addEventListener('mouseup',()=>{
    if(dragging){
      panel.dataset.dkdsUserMoved='1';
      ensureFloatingPanelVisible(panel);
      if(panel.id==='inspectorPanel')captureInspectorFloatRect();
      if(panel.id==='groupPanel')captureGroupFloatRect();
    }
    dragging=false;
  });
}
document.querySelectorAll('.floating-panel').forEach(makeFloating);
setupDockResizer();
setupInspectorDockResizer();
document.querySelectorAll('.panel-close').forEach(b=>b.onclick=()=>{
  const panel=$('#'+b.dataset.target);panel.classList.add('hidden');
  if(b.dataset.target==='lanWebPanel')setStatus('局域网网页版面板已隐藏到状态栏；服务状态不受影响。');
  if(b.dataset.target==='groupPanel')$('#dockedGroupSlot').classList.remove('active');
  if(b.dataset.target==='inspectorPanel'){
    $('#inspectorDockSlot').classList.remove('active');
    $('#inspectorDockSlot').style.width='0px';
    scheduleMainPlotRelayout();
  }
});

// Controls
$('#openBtn').onclick=importFiles; $('#openLocalImportMenuBtn').onclick=importFiles; $('#openProjectBtn').onclick=openProject; $('#openLocalProjectMenuBtn').onclick=openProject; $('#saveProjectBtn').onclick=saveProject;
const dataCenterSystemBtn=$('#dataCenterSystemBtn');if(dataCenterSystemBtn)dataCenterSystemBtn.onclick=()=>openPluginActivityWindow('data-center');
$('#inspectorDockBtn').onclick=toggleInspectorDock;
$('#importChooseFilesBtn').onclick=addImportFiles;
$('#importCloseBtn').onclick=closeImportWorkbench;
$('#importCancelBtn').onclick=closeImportWorkbench;
$('#importCommitBtn').onclick=commitImportWorkbench;
$('#importCheckAllBtn').onclick=()=>{state.importDraft.files.forEach(f=>f.checked=true);renderImportWorkbench();};
$('#importInvertBtn').onclick=invertImportChecked;
$('#importUncheckAllBtn').onclick=()=>{state.importDraft.files.forEach(f=>f.checked=false);renderImportWorkbench();};
$('#importFileList')?.addEventListener('keydown',handleImportListShortcut);
$('#importRemoveBtn').onclick=()=>{
  const active=importActiveItem();
  if(!active)return;
  state.importDraft.files=state.importDraft.files.filter(f=>f.path!==active.path);
  if(state.importDraft.selectionAnchorPath===active.path)state.importDraft.selectionAnchorPath=null;
  state.importDraft.activePath=state.importDraft.files[0]?.path||null;
  renderImportWorkbench();
};
$('#importResetAutoBtn').onclick=resetCurrentImportAuto;
$('#importApplyAllBtn').onclick=applyCurrentImportSettingsToAll;

$('#importProvider').onchange=async e=>{
  const item=importActiveItem();if(!item)return;
  const provider=importProvider(e.target.value);if(!provider)return;
  item.importerId=provider.id;item.importerTouched=true;item.settings=provider.defaultOptions?.()||{};item.mappingTouched=false;
  await readImportItemText(item,true);recomputeImportItem(item,true);renderImportWorkbench();
};
$('#importEncoding').onchange=e=>updateImportSetting('encoding',e.target.value,{reload:true});
$('#importSkipRows').onchange=e=>updateImportSetting('skipRows',Math.max(0,Number(e.target.value)||0));
$('#importEndRow').onchange=e=>updateImportSetting('endRow',Math.max(0,Number(e.target.value)||0));
$('#importDelimiter').onchange=e=>updateImportSetting('delimiter',e.target.value);
$('#importHeaderMode').onchange=e=>updateImportSetting('headerMode',e.target.value);
$('#importDecimal').onchange=e=>updateImportSetting('decimalSeparator',e.target.value);
$('#importCommentPrefix').onchange=e=>updateImportSetting('commentPrefix',e.target.value.trim()||'auto');
$('#importLayout').onchange=e=>{
  const item=importActiveItem();
  if(!item)return;
  item.settings.layout=e.target.value;
  item.mappingTouched=true;
  if(item.settings.layout==='sharedX'&&!item.settings.yCols.length){
    item.settings.yCols=(item.inspection?.suggestedYCols||[]).slice();
  }
  if(state.importDraft.columnFieldFilter)applyImportColumnFieldFilter(item);
  renderImportWorkbench();
};
$('#importXCol').onchange=e=>{
  const item=importActiveItem();if(!item)return;
  item.settings.xCol=Number(e.target.value);item.mappingTouched=true;
  item.settings.yCols=(item.settings.yCols||[]).filter(c=>c!==item.settings.xCol);
  if(state.importDraft.columnFieldFilter)applyImportColumnFieldFilter(item);
  renderImportWorkbench();
};
$('#importYCol').onchange=e=>{state.importDraft.columnFieldFilter='';updateImportSetting('yCol',Number(e.target.value),{mapping:true});};
$('#importPairStart').onchange=e=>updateImportSetting('pairStart',Number(e.target.value),{mapping:true});
$('#importVoltageUnit').onchange=e=>updateImportSetting('voltageUnit',e.target.value,{mapping:true});
$('#importCurrentUnit').onchange=e=>updateImportSetting('currentUnit',e.target.value,{mapping:true});
$('#importVgMode').onchange=e=>updateImportSetting('vgMode',e.target.value,{mapping:true});
$('#importManualVg').onchange=e=>updateImportSetting('manualVg',e.target.value===''?null:Number(e.target.value),{mapping:true});
$('#importYAllBtn').onclick=()=>{
  const item=importActiveItem();if(!item?.inspection)return;state.importDraft.columnFieldFilter='';
  item.settings.yCols=item.inspection.columns
    .filter(c=>c.index!==Number(item.settings.xCol)&&c.numericFraction>=.5)
    .map(c=>c.index);
  item.mappingTouched=true;
  renderImportWorkbench();
};
$('#importYNoneBtn').onclick=()=>{
  const item=importActiveItem();if(!item)return;state.importDraft.columnFieldFilter='';
  item.settings.yCols=[];item.mappingTouched=true;renderImportWorkbench();
};

$('#lanWebBtn').onclick=async()=>{
  if(window.electronAPI?.isWebClient)return;
  const panel=$('#lanWebPanel');
  if(panel.classList.contains('hidden'))await showLanWebPanel();
  else hideLanWebPanel({announce:false});
};
$('#lanWebMinimizeBtn').onclick=()=>hideLanWebPanel();
$('#lanWebApplyBtn').onclick=async()=>{
  const status=await window.electronAPI.lanWebSetSettings({
    enabled:$('#lanWebEnabled').checked,
    noKey:$('#lanWebNoKey').checked,
    port:Number($('#lanWebPort').value)||45910
  });
  renderLanWebStatus(status);
  await loadLanWebSettings();
};
$('#lanWebEnabled').onchange=()=>{};
$('#lanWebNoKey').onchange=()=>{
  const pendingNoKey=$('#lanWebNoKey').checked;
  $('#lanWebNewKeyBtn').disabled=pendingNoKey||!state.lanWebStatusState?.running;
  $('#lanWebKeyHint').textContent=pendingNoKey
    ? '应用设置后将关闭 Key；局域网设备可直接访问。'
    : '应用设置后启用 4 位 Key；二维码可自动携带 Key 完成配对。';
};
$('#lanWebStopBtn').onclick=async()=>{
  const status=await window.electronAPI.lanWebStop();
  $('#lanWebEnabled').checked=false;
  renderLanWebStatus(status);
};
$('#lanWebOpenBtn').onclick=async()=>{
  await window.electronAPI.lanWebOpen?.();
  renderLanWebStatus(await window.electronAPI.lanWebGetStatus());
};
$('#lanWebNewKeyBtn').onclick=async()=>{
  renderLanWebStatus(await window.electronAPI.lanWebRegenerateKey());
};
$('#lanWebCopyBaseUrlBtn').onclick=()=>{
  const url=normalizeLanWebBaseUrl(state.lanWebSelectedBaseUrl);
  if(url)copyTextToClipboard(url,'网页版局域网地址');
};
$('#lanWebCopyShareLinkBtn').onclick=()=>{
  const url=lanWebShareUrl();
  if(url)copyTextToClipboard(url,'网页版扫码链接');
};
$('#lanWebRefreshQrBtn').onclick=()=>{
  void renderLanWebQr(state.lanWebStatusState);
};

$('#updateBtn').onclick=async()=>{
  const panel=$('#updatePanel');
  panel.classList.toggle('hidden');
  if(!panel.classList.contains('hidden')){
    await loadUpdateSettingsIntoPanel();
    renderUpdateStatus(await window.electronAPI.updateGetStatus());
  }
};
$('#updateCheckNowBtn').onclick=async()=>{
  $('#updateCheckNowBtn').disabled=true;
  try{await window.electronAPI.updateCheckNow();}finally{$('#updateCheckNowBtn').disabled=false;}
};
$('#updateDownloadBtn').onclick=async()=>{
  $('#updateDownloadBtn').disabled=true;
  try{await window.electronAPI.updateDownloadNow();}finally{$('#updateDownloadBtn').disabled=false;}
};
$('#updateInstallBtn').onclick=async()=>{
  const ok=window.confirm('建议先保存当前工程。点击“确定”后将尝试保存当前项目，然后立即重启安装已下载更新。');
  if(!ok)return;
  const saved=await saveProject();
  if(!saved && !state.projectPath){
    const continueWithoutSave=window.confirm('当前项目未保存。仍然立即重启安装更新？');
    if(!continueWithoutSave)return;
  }
  await window.electronAPI.updateInstallNow();
};
$('#updateSaveSettingsBtn').onclick=async()=>{
  const settings=await window.electronAPI.updateSetSettings({
    serverUrl:$('#updateServerUrlInput').value.trim(),
    autoDiscover:$('#updateAutoDiscover').checked,
    autoDownload:$('#updateAutoDownload').checked
  });
  if(settings){
    $('#updateServerUrlInput').value=settings.serverUrl||'';
    setStatus(settings.serverUrl?'更新服务器设置已保存。':'已恢复局域网自动发现更新服务器。');
  }
};

$('#newProjectTabBtn').onclick=()=>createProjectTab(null,true);
const historyRowTime=row=>Number(row?.updatedAt||row?.createdAt)||0;
const normalizeEditHistory=value=>{
  const row=value&&typeof value==='object'?value:{};
  return {scope:'workspace',source:String(row.source||row.pluginId||window.DKDSPlugins?.edit?.activePlugin?.()||'workspace'),canUndo:row.canUndo===true,canRedo:row.canRedo===true,undoLabel:String(row.undoLabel||row.past?.at?.(-1)?.label||''),redoLabel:String(row.redoLabel||row.future?.at?.(-1)?.label||''),past:Array.isArray(row.past)?row.past:[],future:Array.isArray(row.future)?row.future:[]};
};
const activeEditHistorySnapshot=async()=>{
  const edit=window.DKDSPlugins?.edit;if(!edit?.activePlugin?.()||typeof edit.history!=='function')return normalizeEditHistory(null);
  try{return normalizeEditHistory(await Promise.resolve(edit.history()));}catch(err){console.warn('[DKDS edit history]',err);return normalizeEditHistory(null);}
};
const activeEditHistorySnapshotSync=()=>{
  const edit=window.DKDSPlugins?.edit;if(!edit?.activePlugin?.()||typeof edit.history!=='function')return normalizeEditHistory(null);
  try{const value=edit.history();return value&&typeof value.then==='function'?normalizeEditHistory(null):normalizeEditHistory(value);}catch{return normalizeEditHistory(null);}
};
const historyCandidate=(snapshot,direction,source)=>{
  const rows=direction==='undo'?snapshot?.past:snapshot?.future,row=Array.isArray(rows)?rows.at(-1):null;
  const allowed=direction==='undo'?snapshot?.canUndo:snapshot?.canRedo;
  return allowed&&row?{source,row,time:historyRowTime(row),label:String(row.label||direction)}:null;
};
const systemHistorySnapshotSync=()=>{
  const project=projectHistorySnapshot(),workspace=activeEditHistorySnapshotSync();
  const undoCandidates=[historyCandidate(project,'undo','project'),historyCandidate(workspace,'undo','workspace')].filter(Boolean).sort((a,b)=>b.time-a.time);
  const redoCandidates=[historyCandidate(project,'redo','project'),historyCandidate(workspace,'redo','workspace')].filter(Boolean).sort((a,b)=>b.time-a.time);
  return {version:'2.0.0',project,workspace,canUndo:undoCandidates.length>0,canRedo:redoCandidates.length>0,undoLabel:undoCandidates[0]?.label||'',redoLabel:redoCandidates[0]?.label||'',undoSource:undoCandidates[0]?.source||'',redoSource:redoCandidates[0]?.source||''};
};
const runSystemHistory=async direction=>{
  const edit=window.DKDSPlugins?.edit,project=projectHistorySnapshot(),workspace=await activeEditHistorySnapshot();
  const candidates=[historyCandidate(project,direction,'project'),historyCandidate(workspace,direction,'workspace')].filter(Boolean).sort((a,b)=>b.time-a.time);
  for(const candidate of candidates){
    try{
      if(candidate.source==='workspace'&&edit?.supports?.(direction)){
        if(typeof edit.can==='function'&&edit.can(direction)===false)continue;
        const handled=await Promise.resolve(edit.invoke(direction));if(handled!==false)return true;
      }else if(candidate.source==='project'){
        const handled=direction==='undo'?await undoProjectHistory():await redoProjectHistory();if(handled)return true;
      }
    }catch(err){console.error(`[DKDS history:${direction}:${candidate.source}]`,err);setStatus(`${direction==='undo'?'撤销':'重做'}失败：${err?.message||err}`);return false;}
  }
  if(edit?.activePlugin?.()&&edit.supports?.(direction)&&!candidates.some(row=>row.source==='workspace')){
    const handled=await Promise.resolve(edit.invoke(direction));if(handled!==false)return true;
  }
  if(!candidates.some(row=>row.source==='project')){
    const handled=direction==='undo'?await undoProjectHistory():await redoProjectHistory();if(handled)return true;
  }
  setStatus(direction==='undo'?'当前工程没有可撤销的编辑。':'当前工程没有可重做的编辑。');return false;
};
const systemUndo=()=>runSystemHistory('undo');
const systemRedo=()=>runSystemHistory('redo');
const systemDeselect=()=>{const edit=window.DKDSPlugins?.edit;if(edit?.activePlugin?.()&&edit.supports?.('deselect'))return edit.invoke('deselect');setStatus('当前工作区没有活动选择。');return false;};
$('#undoBtn').onclick=()=>void systemUndo(); $('#redoBtn').onclick=()=>void systemRedo(); $('#deselectBtn').onclick=systemDeselect;
const showProjectHistory=async()=>{
  const project=projectHistorySnapshot(),workspace=await activeEditHistorySnapshot(),snapshot=systemHistorySnapshotSync();
  const rows=[];
  const pushRows=(history,scopeLabel)=>{
    for(const row of [...(history.past||[])].reverse())rows.push({kind:'past',scopeLabel,row,time:historyRowTime(row)});
    for(const row of [...(history.future||[])])rows.push({kind:'future',scopeLabel,row,time:historyRowTime(row)});
  };
  pushRows(project,'项目');pushRows(workspace,'当前工作区');rows.sort((a,b)=>b.time-a.time);
  const detail=rows.map(item=>`${item.kind==='future'?'可重做':'已执行'} · [${item.scopeLabel}] ${item.row.label}${item.time?` · ${new Date(item.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:''}`).join('\n');
  const action=await window.DKDSUI?.dialogs?.show?.({
    tone:'info',title:'操作历史',subtitle:activeProjectTab()?.title||'当前项目',
    message:rows.length?`统一历史：${project.past?.length||0} 条项目操作，${workspace.past?.length||0} 条当前工作区操作。撤销/重做按真实操作时间排序。`:'当前项目还没有可回退的操作。',
    detail,detailOpen:true,detailLabel:'历史记录',
    meta:[{label:'下一步撤销',value:snapshot.undoLabel||'—'},{label:'下一步重做',value:snapshot.redoLabel||'—'}],
    actions:[{id:'close',label:'关闭'},{id:'redo',label:'重做',kind:'secondary'},{id:'undo',label:'撤销',kind:'primary'}],
    defaultAction:snapshot.canUndo?'undo':'close'
  });
  if(action==='undo')await systemUndo();else if(action==='redo')await systemRedo();
};
$('#projectHistoryBtn').onclick=()=>void showProjectHistory();

document.querySelectorAll('.analysis-page-close').forEach(b=>b.onclick=()=>closeAnalysisPage(b.dataset.analysisTarget));


$('#groupDockBtn').onclick=toggleGroupDock;
$('#groupMinimizeBtn').onclick=toggleGroupMinimize;
document.querySelectorAll('[data-trend-cols]').forEach(b=>{
  b.onclick=()=>setTrendColumns(b.dataset.trendCols);
});



$('#zoomExportCsv').onclick=()=>{
  if(!state.zoomChart)return;
  window.electronAPI.saveText({defaultName:`${safeName(state.zoomChart.title)}.csv`,content:zoomCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
};
$('#zoomCopyCsv').onclick=()=>{if(state.zoomChart)copyTextToClipboard(zoomCsvText(),`${state.zoomChart.title} CSV`);};
$('#zoomExportSvg').onclick=()=>{if(!state.zoomChart)return;window.DKDSCharts.toImage('zoomPlot',{format:'svg',width:1200,height:800,scale:1}).then(data=>{const content=decodeURIComponent(data.split(',')[1]);window.electronAPI.saveText({defaultName:`${safeName(state.zoomChart.title)}.svg`,content,filters:[{name:'SVG',extensions:['svg']}]});});};

window.addEventListener('keydown',e=>{
  if(isTypingTarget(e.target))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openProject();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();createProjectTab(null,true);return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)void systemRedo();else void systemUndo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();void systemRedo();return;}
  if(e.key==='Escape'){
    e.preventDefault();
    if(!$('#importPanel').classList.contains('hidden')){
      closeImportWorkbench();
      return;
    }
    systemDeselect();return;
  }
  if(e.key==='r'||e.key==='R'){e.preventDefault();resetMainView();return;}
});

window.addEventListener('resize',()=>{
  syncAnalysisPageViewport();
  scheduleMainPlotRelayout();
  updateTrendLayout(true);
  try{if(!$('#zoomPanel').classList.contains('hidden'))window.DKDSCharts?.resize?.($('#zoomPlot'));}catch{}
  window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});
});

if(window.ResizeObserver){
  const mainObserver=new ResizeObserver(()=>scheduleMainPlotRelayout());
  mainObserver.observe($('#mainPlotWrap'));
  mainObserver.observe($('.main-area'));
  mainObserver.observe($('.workspace'));
  mainObserver.observe($('#dockedGroupSlot'));
  mainObserver.observe($('#inspectorDockSlot'));
  mainObserver.observe($('#mainWorkspace'));

  const panelObserver=new ResizeObserver(entries=>{
    for(const entry of entries){
      if(entry.target.id==='groupPanel')updateTrendLayout(true);
      if(entry.target.id==='inspectorPanel')scheduleMainPlotRelayout();
      if(entry.target.id==='zoomPanel'&&!entry.target.classList.contains('hidden')){
        try{window.DKDSCharts?.resize?.($('#zoomPlot'));}catch{}
      }
    }
  });
  panelObserver.observe($('#groupPanel'));
  panelObserver.observe($('#inspectorPanel'));
  panelObserver.observe($('#zoomPanel'));
}

module.exports=Object.freeze({configure, captureGroupFloatRect, applyGroupPanelLayout, toggleGroupDock, toggleGroupMinimize, setupDockResizer, captureInspectorFloatRect, applyInspectorPanelLayout, toggleInspectorDock, setupInspectorDockResizer, makeFloating, dataCenterSystemBtn, historyRowTime, normalizeEditHistory, activeEditHistorySnapshot, activeEditHistorySnapshotSync, historyCandidate, systemHistorySnapshotSync, runSystemHistory, systemUndo, systemRedo, systemDeselect, showProjectHistory});
