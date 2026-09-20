'use strict';
const {$, state, status}=require('./context');
const {createOwner}=require('./style-gate');
const style=createOwner('app.floating-docks','runtime-floating-docks');
const {copyTextToClipboard, ensureFloatingPanelVisible, floatingSafeBounds, hideLanWebPanel, importActiveItem, importProvider, lanWebShareUrl, loadLanWebSettings, loadUpdateSettingsIntoPanel, normalizeLanWebBaseUrl, renderLanWebQr, renderLanWebStatus, renderUpdateStatus, setStatus, showLanWebPanel}=require('./foundation');
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
const openImportWorkbench=(...args)=>deps.imports.openImportWorkbench(...args);
const closeAnalysisPage=(...args)=>deps.workspace.closeAnalysisPage(...args);
const resetMainView=(...args)=>deps.workspace.resetMainView(...args);
const scheduleMainPlotRelayout=(...args)=>deps.workspace.scheduleMainPlotRelayout(...args);
const syncAnalysisPageViewport=(...args)=>deps.workspace.syncAnalysisPageViewport(...args);
const saveProject=(...args)=>deps.projects.saveProject(...args);
const openPluginActivityWindow=(...args)=>deps.windows.openPluginActivityWindow(...args);
const isTypingTarget=target=>{
  if(!target)return false;
  const tag=String(target.tagName||'').toLowerCase();
  return ['input','textarea','select'].includes(tag)||target.isContentEditable===true;
};

function makeFloating(panel){
  const head=panel.querySelector('.drag-handle');if(!head)return;let drag=null;
  style.set(head,'touch-action','none',{component:'floating-panel-header'});head.dataset.dkdsTouchGestureOwner='floating-panel-drag';
  head.addEventListener('pointerdown',e=>{if((e.button!==undefined&&e.button!==0)||e.target.closest('button')||panel.classList.contains('docked')||panel.classList.contains('docked-right'))return;const r=panel.getBoundingClientRect();style.patch(panel,{transform:'none',left:`${r.left}px`,top:`${r.top}px`,right:'auto',bottom:'auto'},{component:'floating-panel'});drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};head.setPointerCapture?.(e.pointerId);e.preventDefault();});
  window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const bounds=floatingSafeBounds(panel),r=panel.getBoundingClientRect(),maxLeft=Math.max(bounds.left,bounds.right-r.width),maxTop=Math.max(bounds.top,bounds.bottom-r.height);style.patch(panel,{left:`${Math.min(maxLeft,Math.max(bounds.left,e.clientX-drag.dx))}px`,top:`${Math.min(maxTop,Math.max(bounds.top,e.clientY-drag.dy))}px`},{component:'floating-panel'});if(e.cancelable)e.preventDefault();},{passive:false});
  const finish=e=>{
    if(!drag||(e?.pointerId!==undefined&&e.pointerId!==drag.id))return;
    head.releasePointerCapture?.(drag.id);
    panel.dataset.dkdsUserMoved='1';
    ensureFloatingPanelVisible(panel);
    drag=null;
  };
  window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);
}
document.querySelectorAll('.floating-panel').forEach(makeFloating);
document.querySelectorAll('.panel-close').forEach(b=>b.onclick=()=>{
  const panel=$('#'+b.dataset.target);panel.classList.add('hidden');
  if(b.dataset.target==='lanWebPanel')setStatus('局域网网页版面板已隐藏到状态栏；服务状态不受影响。');
});

// Controls
$('#openBtn').onclick=()=>openImportWorkbench(); $('#saveProjectBtn').onclick=saveProject;
const dataCenterSystemBtn=$('#dataCenterSystemBtn');if(dataCenterSystemBtn)dataCenterSystemBtn.onclick=()=>openPluginActivityWindow('data-center');
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
const stepLanWebPort=delta=>{
  const input=$('#lanWebPort');if(!input)return;
  const min=Number(input.min)||1024,max=Number(input.max)||65535,current=Number(input.value);
  const next=Math.max(min,Math.min(max,(Number.isFinite(current)?current:45910)+Number(delta||0)));
  input.value=String(next);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();
};
$('#lanWebPortUp').onclick=()=>stepLanWebPort(1);
$('#lanWebPortDown').onclick=()=>stepLanWebPort(-1);
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
    globalThis.DKDSMaterialSurface?.apply?.(panel,'elevated');
    ensureFloatingPanelVisible(panel);
    await loadUpdateSettingsIntoPanel();
    renderUpdateStatus(await window.electronAPI.updateGetStatus());
    ensureFloatingPanelVisible(panel);
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



window.addEventListener('keydown',e=>{
  if(isTypingTarget(e.target))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openImportWorkbench();return;}
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
  window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});
});

if(window.ResizeObserver){
  const mainObserver=new ResizeObserver(()=>scheduleMainPlotRelayout());
  for(const target of [$('#mainPlotWrap'),$('.main-area'),$('.workspace'),$('#mainWorkspace')])if(target)mainObserver.observe(target);
}

module.exports=Object.freeze({configure, makeFloating, dataCenterSystemBtn, historyRowTime, normalizeEditHistory, activeEditHistorySnapshot, activeEditHistorySnapshotSync, historyCandidate, systemHistorySnapshotSync, runSystemHistory, systemUndo, systemRedo, systemDeselect, showProjectHistory});
