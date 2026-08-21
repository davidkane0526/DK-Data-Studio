(() => {
  const $ = s => document.querySelector(s);
  const mainSvg = d3.select('#mainPlot');
  const status = $('#statusBarMessage') || $('#statusBar');
  const primePortableState = new Map();

  const TREND_COLUMNS_PREFERENCE_KEY='dkds.ui.trendColumns.v1';
  function loadTrendColumnsPreference(){
    try{
      const raw=localStorage.getItem(TREND_COLUMNS_PREFERENCE_KEY);
      if(raw==='auto')return 'auto';
      const n=Number(raw);
      if(Number.isFinite(n)&&n>=1&&n<=6)return Math.round(n);
    }catch{}
    return 3;
  }
  function saveTrendColumnsPreference(value){
    try{localStorage.setItem(TREND_COLUMNS_PREFERENCE_KEY,String(value));}catch{}
  }

  const state = {
    datasets: [],
    artifactStore:window.DKDSData.createStore(),
    projectPath:null,
    trendColumns:loadTrendColumnsPreference(),
    zoomChart:null,
    groupPanelMode:'docked',
    groupPanelCollapsed:false,
    groupPanelDockHeight:360,
    groupPanelFloatRect:null,
    inspectorPanelMode:'right',
    inspectorDockWidth:390,
    inspectorFloatRect:null,
    mainLayout:{raf:null,lastWidth:0,lastHeight:0,renderToken:0},
    mainView:{xDomain:null,yDomain:null,mode:'select'},
    projectTabs:[],
    activeProjectTabId:null,
    projectTabSeq:0
  };

  let importDraft={
    files:[],
    activePath:null,
    loading:false,
    fileDialogOpen:false
  };

  function importActiveItem(){
    return importDraft.files.find(f=>f.path===importDraft.activePath)||null;
  }

  function flexibleImportProvider(){
    const provider=window.DKDSPlugins?.registry?.find?.('data.importers',value=>value?.id==='flexible-text');
    if(!provider)throw new Error('Flexible Text Import 插件未启用。');
    return provider;
  }

  function setStatus(t){ status.textContent = t; }
  let updateStatusState=null;

  function formatBytes(n){
    const v=Number(n)||0;
    if(v<=0)return '0 B';
    const units=['B','KB','MB','GB'];
    let x=v,i=0;
    while(x>=1024&&i<units.length-1){x/=1024;i++;}
    return `${x.toFixed(i?1:0)} ${units[i]}`;
  }

  function formatUpdateTime(value){
    if(!value)return '—';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':d.toLocaleString();
  }

  function renderUpdateStatus(status){
    if(!status)return;
    updateStatusState=status;

    const phase=status.phase||'idle';
    const dot=$('#updatePhaseDot');
    if(dot)dot.className=`update-phase-dot ${phase}`;

    const titles={
      idle:'等待更新服务',
      discovering:'正在发现服务器',
      connected:'已连接更新服务',
      checking:'正在检查版本',
      available:'发现新版本',
      'available-dev':'发现新版本（当前模式不安装）',
      downloading:'正在下载更新',
      downloaded:'更新已就绪',
      'up-to-date':'已是最新版本',
      error:'更新异常',
      disabled:'更新已禁用'
    };
    $('#updateStatusTitle').textContent=titles[phase]||phase;
    $('#updateStatusMessage').textContent=status.message||'—';
    $('#updateCurrentVersion').textContent=status.currentVersion||'—';
    $('#updateAvailableVersion').textContent=status.availableVersion||status.downloadedVersion||'—';
    $('#updateServerDisplay').textContent=status.serverUrl
      ? `${status.serverName?status.serverName+' · ':''}${status.serverUrl}`
      : '尚未发现';
    $('#updateIntegrityState').textContent='electron-updater SHA512';
    $('#updateRuntimeMode').textContent=status.isPackaged
      ? (status.isPortable?'Portable（仅发现）':'Setup 安装版（可自动更新）')
      : '开发版（不执行安装）';
    $('#updateLastCheck').textContent=formatUpdateTime(status.lastCheckAt);

    const progress=Math.max(0,Math.min(100,Number(status.progress)||0));
    $('#updateProgressBar').style.width=`${progress}%`;
    $('#updateProgressText').textContent=phase==='downloading'
      ? `${progress.toFixed(1)}%`
      : (phase==='downloaded'?'100%':'');
    $('#updateProgressText').title=status.total
      ? `${formatBytes(status.transferred)} / ${formatBytes(status.total)}`
      : '';

    const badge=$('#updateBadge');
    if(badge){
      badge.classList.remove('hidden','ready','downloading');
      if(phase==='downloaded')badge.classList.add('ready');
      else if(phase==='downloading'||phase==='checking')badge.classList.add('downloading');
      else if(['available','available-dev','error'].includes(phase)){}
      else badge.classList.add('hidden');
    }

    $('#updateDownloadBtn').classList.toggle('hidden',!(phase==='available'&&status.canApply));
    $('#updateInstallBtn').classList.toggle('hidden',!(phase==='downloaded'&&status.canApply));
  }

  async function loadUpdateSettingsIntoPanel(){
    const settings=await window.electronAPI.updateGetSettings();
    if(!settings)return;
    $('#updateServerUrlInput').value=settings.serverUrl||'';
    $('#updateAutoDiscover').checked=settings.autoDiscover!==false;
    $('#updateAutoDownload').checked=settings.autoDownload!==false;
  }

  async function initializeUpdateUi(){
    if(!window.electronAPI?.updateGetStatus)return;
    try{
      const current=await window.electronAPI.updateGetStatus();
      renderUpdateStatus(current);
      await loadUpdateSettingsIntoPanel();
    }catch{}
    window.electronAPI.onUpdateStatus?.(next=>renderUpdateStatus(next));
  }

  let lanWebStatusState=null;
  let lanWebSelectedBaseUrl='';
  let lanWebQrRenderToken=0;

  function normalizeLanWebBaseUrl(url){
    const s=String(url||'').trim();
    if(!s)return '';
    return s.endsWith('/')?s:`${s}/`;
  }

  function lanWebShareUrl(status=lanWebStatusState){
    const base=normalizeLanWebBaseUrl(lanWebSelectedBaseUrl);
    if(!base||!status?.running)return '';
    if(status.noKey||!status.key)return base;
    try{
      const u=new URL(base);
      u.searchParams.set('key',String(status.key));
      return u.toString();
    }catch{
      return `${base}${base.includes('?')?'&':'?'}key=${encodeURIComponent(String(status.key))}`;
    }
  }

  function chooseDefaultLanWebUrl(status){
    const list=(status?.urls||[]).map(normalizeLanWebBaseUrl).filter(Boolean);
    if(lanWebSelectedBaseUrl&&list.includes(normalizeLanWebBaseUrl(lanWebSelectedBaseUrl))){
      return normalizeLanWebBaseUrl(lanWebSelectedBaseUrl);
    }
    if(list.length)return list[0];
    return status?.running&&status?.localhostUrl?normalizeLanWebBaseUrl(status.localhostUrl):'';
  }

  async function renderLanWebQr(status=lanWebStatusState){
    const img=$('#lanWebQrImage');
    const placeholder=$('#lanWebQrPlaceholder');
    const selected=$('#lanWebSelectedUrl');
    const hint=$('#lanWebQrHint');
    const badge=$('#lanWebQrModeBadge');
    const security=$('#lanWebQrSecurityText');
    if(!img||!placeholder||!selected)return;

    const shareUrl=lanWebShareUrl(status);
    selected.textContent=shareUrl||'—';
    selected.title=shareUrl||'';

    const ready=!!(status?.running&&shareUrl);
    $('#lanWebCopyShareLinkBtn').disabled=!ready;
    $('#lanWebCopyBaseUrlBtn').disabled=!ready;
    $('#lanWebRefreshQrBtn').disabled=!ready;

    if(!ready){
      img.classList.add('hidden');
      img.removeAttribute('src');
      placeholder.classList.remove('hidden');
      placeholder.querySelector('small').textContent=status?.running?'请选择一个可用地址':'服务启动后显示';
      hint.textContent='启动服务后自动生成二维码。';
      badge.textContent=status?.running?'等待地址':'等待服务';
      badge.className='lan-web-mode-badge';
      security.textContent='启用 Key 时，二维码会把本次 4 位 Key 一并带入链接，扫码后自动配对；Key 更新后旧二维码立即失效。';
      return;
    }

    hint.textContent=status.noKey
      ? '二维码对应当前选中的局域网地址，扫码后直接进入网页版。'
      : '二维码已经包含本次 4 位 Key，扫码后会自动配对并直接进入网页版。';
    badge.textContent=status.noKey?'免 Key 直连':'QR 自动配对';
    badge.className=`lan-web-mode-badge ready ${status.noKey?'':'key'}`;
    security.textContent=status.noKey
      ? '当前为免 Key 模式：任何能访问该局域网地址的设备都可直接进入网页版。'
      : '二维码内含本次临时配对 Key。重新生成 Key 或重启网页版服务后，旧二维码中的 Key 将失效。';

    const token=++lanWebQrRenderToken;
    placeholder.classList.remove('hidden');
    placeholder.querySelector('small').textContent='正在生成二维码…';
    img.classList.add('hidden');

    try{
      const dataUrl=await window.electronAPI.lanWebMakeQr({text:shareUrl});
      if(token!==lanWebQrRenderToken)return;
      if(!dataUrl)throw new Error('QR renderer unavailable');
      img.src=dataUrl;
      img.classList.remove('hidden');
      placeholder.classList.add('hidden');
    }catch(err){
      if(token!==lanWebQrRenderToken)return;
      img.classList.add('hidden');
      placeholder.classList.remove('hidden');
      placeholder.querySelector('small').textContent=`二维码生成失败：${err?.message||err}`;
    }
  }

  function renderLanWebStatus(status){
    if(!status)return;
    lanWebStatusState=status;
    const running=!!status.running;
    const dot=$('#lanWebStatusDot');
    if(dot)dot.className=`lan-web-dot ${running?'running':'stopped'}`;
    $('#lanWebStatusTitle').textContent=running?'网页版服务运行中':'网页版服务未启动';
    $('#lanWebStatusText').textContent=status.error
      ? `启动失败：${status.error}`
      : running
        ? (status.noKey?'当前无需 Key，局域网设备可直接进入。':'浏览器可手动输入 4 位 Key，也可直接扫描右侧二维码自动配对。')
        : '启动后，同一局域网中的电脑、平板和手机可直接使用浏览器运行完整分析界面。';

    $('#lanWebKey').textContent=status.noKey?'无需 Key':(status.key||'----');
    $('#lanWebKeyHint').textContent=status.noKey
      ? '当前不需要配对 Key；二维码和复制链接均为普通局域网地址。'
      : '二维码会自动携带本次 Key；手动输入普通地址时仍可使用此 Key 配对。';
    $('#lanWebClientCount').textContent=String(status.pairedClients||0);

    const list=(status.urls?.length?status.urls:(running&&status.localhostUrl?[status.localhostUrl]:[]))
      .map(normalizeLanWebBaseUrl)
      .filter(Boolean);
    lanWebSelectedBaseUrl=chooseDefaultLanWebUrl({...status,urls:list});

    const urls=$('#lanWebUrls');
    urls.innerHTML='';
    if(!list.length){
      urls.innerHTML='<div class="lan-web-empty-address">服务启动后显示可用局域网地址</div>';
    }else{
      for(const url of list){
        const b=document.createElement('button');
        b.type='button';
        b.className=`lan-web-url-chip ${url===lanWebSelectedBaseUrl?'selected':''}`;
        b.textContent=url;
        b.title='选择这个地址生成二维码';
        b.onclick=()=>{
          lanWebSelectedBaseUrl=url;
          renderLanWebStatus(lanWebStatusState);
        };
        urls.appendChild(b);
      }
    }

    $('#lanWebStopBtn').disabled=!running;
    $('#lanWebNewKeyBtn').disabled=!!status.noKey||!running;
    $('#lanWebApplyBtn').textContent=running?'应用并刷新':'应用并启动';
    window.DKDSPlugins?.events?.emit?.('lanweb:status',status);
    void renderLanWebQr(status);
  }

  async function loadLanWebSettings(){
    if(!window.electronAPI?.lanWebGetSettings)return;
    const s=await window.electronAPI.lanWebGetSettings();
    if(!s)return;
    $('#lanWebEnabled').checked=!!s.enabled;
    $('#lanWebNoKey').checked=!!s.noKey;
    $('#lanWebPort').value=Number(s.port)||45910;
  }

  async function initializeLanWebUi(){
    if(!window.electronAPI?.lanWebGetStatus)return;
    try{
      await loadLanWebSettings();
      renderLanWebStatus(await window.electronAPI.lanWebGetStatus());
    }catch{}
    window.electronAPI.onLanWebStatus?.(status=>renderLanWebStatus(status));
  }

  async function showLanWebPanel(){
    if(window.electronAPI?.isWebClient)return false;
    const panel=$('#lanWebPanel');
    if(!panel)return false;
    panel.classList.remove('hidden');
    try{
      await loadLanWebSettings();
      renderLanWebStatus(await window.electronAPI.lanWebGetStatus());
    }catch(err){setStatus(`读取局域网网页版状态失败：${err?.message||err}`);}
    return true;
  }

  function hideLanWebPanel({announce=true}={}){
    const panel=$('#lanWebPanel');
    if(!panel)return false;
    panel.classList.add('hidden');
    if(announce)setStatus('局域网网页版面板已隐藏到状态栏；点击状态栏“网页版”即可恢复。');
    return true;
  }

  function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function csvCell(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
  function safeName(s){ return String(s).replace(/[\\/:*?"<>|]/g,'_'); }
  async function copyTextToClipboard(text,label='数据'){
    const ok=await window.electronAPI.copyText(String(text??''));
    if(ok)setStatus(`${label}已复制到剪贴板。`);
    return ok;
  }

  // ------------------------------------------------------------------
  // Multi-project tabs
  // ------------------------------------------------------------------
  function projectBaseName(path){
    let raw=String(path||'').split(/[\\/]/).pop()||'';
    try{raw=decodeURIComponent(raw);}catch{}
    return raw.replace(/\.dkds\.json$/i,'').replace(/\.json$/i,'')||'项目';
  }

  function blankProjectTab(title=null){
    const n=++state.projectTabSeq;
    return {
      id:`project-tab-${Date.now()}-${n}-${Math.random().toString(36).slice(2,7)}`,
      title:title||`项目 ${n}`,
      datasets:[],
      artifactStore:window.DKDSData.createStore(),
      importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false},
      pluginState:{},
      projectPath:null,
      trendColumns:loadTrendColumnsPreference(),
      groupPanelMode:'docked',
      groupPanelCollapsed:false,
      groupPanelDockHeight:360,
      groupPanelFloatRect:null,
      inspectorPanelMode:'right',
      inspectorDockWidth:390,
      inspectorFloatRect:null,
      mainView:{xDomain:null,yDomain:null,mode:'select'}
    };
  }

  function activeProjectTab(){
    return state.projectTabs.find(t=>t.id===state.activeProjectTabId)||null;
  }

  function captureActiveProjectTab(){
    const t=activeProjectTab();
    if(!t)return;
    if(state.inspectorPanelMode==='floating')captureInspectorFloatRect();
    t.datasets=state.datasets;
    t.artifactStore=state.artifactStore;
    t.importDraft=importDraft;
    t.projectPath=state.projectPath;
    t.trendColumns=state.trendColumns;
    t.groupPanelMode=state.groupPanelMode;
    t.groupPanelCollapsed=state.groupPanelCollapsed;
    t.groupPanelDockHeight=state.groupPanelDockHeight;
    t.groupPanelFloatRect=state.groupPanelFloatRect;
    t.inspectorPanelMode=state.inspectorPanelMode;
    t.inspectorDockWidth=state.inspectorDockWidth;
    t.inspectorFloatRect=state.inspectorFloatRect;
    t.pluginState=window.DKDSPlugins?.project?.serialize?.(t.pluginState||{})||t.pluginState||{};
    t.mainView={...state.mainView,
      xDomain:state.mainView.xDomain?state.mainView.xDomain.slice():null,
      yDomain:state.mainView.yDomain?state.mainView.yDomain.slice():null};
    if(state.projectPath)t.title=projectBaseName(state.projectPath);
  }

  function mountProjectTab(t){
    state.datasets=t.datasets||[];
    state.artifactStore=t.artifactStore||window.DKDSData.createStore();
    t.artifactStore=state.artifactStore;
    syncDatasetArtifacts({emit:false});
    importDraft=t.importDraft||{files:[],activePath:null,loading:false,fileDialogOpen:false};
    t.importDraft=importDraft;
    state.projectPath=t.projectPath||null;
    state.trendColumns=t.trendColumns||loadTrendColumnsPreference();
    state.groupPanelMode=t.groupPanelMode||'docked';
    state.groupPanelCollapsed=!!t.groupPanelCollapsed;
    state.groupPanelDockHeight=Number(t.groupPanelDockHeight)||360;
    state.groupPanelFloatRect=t.groupPanelFloatRect||null;
    state.inspectorPanelMode=t.inspectorPanelMode||'right';
    state.inspectorDockWidth=Number(t.inspectorDockWidth)||390;
    state.inspectorFloatRect=t.inspectorFloatRect||null;
    state.mainView={
      xDomain:t.mainView?.xDomain?t.mainView.xDomain.slice():null,
      yDomain:t.mainView?.yDomain?t.mainView.yDomain.slice():null,
      mode:t.mainView?.mode||'select'
    };
    state.zoomChart=null;
    if(window.DKDSPlugins?.project?.restore)window.DKDSPlugins.project.restore(t.pluginState||{});
  }

  function createProjectTab(title=null,activate=true){
    captureActiveProjectTab();
    const t=blankProjectTab(title);
    state.projectTabs.push(t);
    if(activate){
      state.activeProjectTabId=t.id;
      mountProjectTab(t);
      clearMainView(false);
      renderAll();
      applyGroupPanelLayout();
      applyInspectorPanelLayout();
    }
    renderProjectTabs();
    if(activate)setTimeout(()=>prewarmDedicatedPluginWindows(),0);
    return t;
  }

  function switchProjectTab(id){
    if(id===state.activeProjectTabId)return;
    captureActiveProjectTab();
    const t=state.projectTabs.find(q=>q.id===id);
    if(!t)return;
    state.activeProjectTabId=id;
    mountProjectTab(t);
    renderProjectTabs();
    renderAll();
    applyGroupPanelLayout();
    applyInspectorPanelLayout();
    scheduleMainPlotRelayout();
    refreshOpenAnalysisPage();
    setStatus(`已切换到独立项目：${t.title}`);
    setTimeout(()=>prewarmDedicatedPluginWindows(),0);
  }

  function closeProjectTab(id){
    const t=state.projectTabs.find(q=>q.id===id);
    if(!t)return;
    if(state.projectTabs.length===1){
      const ok=!t.datasets.length||window.confirm('当前是最后一个项目标签页。清空当前项目？');
      if(!ok)return;
      window.electronAPI?.disposeProjectActivityWindows?.(id);
      captureActiveProjectTab();
      const fresh=blankProjectTab('项目 1');
      fresh.id=t.id;
      state.projectTabs=[fresh];
      state.activeProjectTabId=fresh.id;
      mountProjectTab(fresh);
      renderProjectTabs();renderAll();applyGroupPanelLayout();applyInspectorPanelLayout();
      return;
    }
    const hadData=t.datasets.length;
    if(hadData&&!window.confirm(`关闭“${t.title}”？未保存修改不会自动写入磁盘。`))return;
    window.electronAPI?.disposeProjectActivityWindows?.(id);
    const idx=state.projectTabs.findIndex(q=>q.id===id);
    const wasActive=id===state.activeProjectTabId;
    state.projectTabs.splice(idx,1);
    if(wasActive){
      const next=state.projectTabs[Math.max(0,idx-1)]||state.projectTabs[0];
      state.activeProjectTabId=next.id;
      mountProjectTab(next);
      renderAll();applyGroupPanelLayout();scheduleMainPlotRelayout();
    }
    renderProjectTabs();
  }

  function renderProjectTabs(){
    const host=$('#projectTabs');
    if(!host)return;
    captureActiveProjectTab();
    host.innerHTML='';
    for(const t of state.projectTabs){
      const el=document.createElement('div');
      el.className=`project-tab ${t.id===state.activeProjectTabId?'active':''}`;
      el.dataset.tabId=t.id;
      el.title=t.projectPath||t.title;
      el.innerHTML=`<span class="project-tab-title">${escapeHtml(t.title)}</span><button class="project-tab-close" title="关闭项目">×</button>`;
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
  }

  function renderDatasetList(){
    window.DKDSPlugins?.events?.emit?.('sidebar:data-render',{context:pluginUiContext()});
  }

  function humanFileSize(bytes){
    const n=Number(bytes)||0;
    if(n<1024)return `${n} B`;
    if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(1)} MB`;
  }

  function importResolvedLayout(item){
    const layout=item?.settings?.layout||'auto';
    if(layout!=='auto')return layout;
    return item?.inspection?.suggestedLayout||'single';
  }

  function importLayoutName(layout){
    return {
      single:'单组 V/I',
      sharedX:'共享 V + 多个 I',
      paired:'V/I 成对多列',
      auto:'自动'
    }[layout]||layout;
  }

  function importDelimiterName(d){
    return {
      comma:'逗号',
      tab:'Tab',
      semicolon:'分号',
      whitespace:'空白',
      pipe:'竖线',
      auto:'自动'
    }[d]||d;
  }

  async function readImportItemText(item,force=false){
    if(!item)return;
    const requested=item.settings?.encoding||'auto';
    if(!force&&item.text&&item.loadedEncodingRequest===requested)return;
    item.loading=true;
    item.error='';
    renderImportFileList();
    try{
      const result=await window.electronAPI.readDataText({path:item.path,encoding:requested});
      item.text=result.text;
      item.detectedEncoding=result.encoding;
      item.loadedEncodingRequest=requested;
      item.size=result.size;
      item.loading=false;
      recomputeImportItem(item,!item.mappingTouched);
    }catch(err){
      item.loading=false;
      item.error=err?.message||String(err);
    }
  }

  function recomputeImportItem(item,initializeMapping=false){
    if(!item?.text)return;
    try{
      item.inspection=flexibleImportProvider().inspect({
        name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding
      },item.settings);
      item.error='';

      if(initializeMapping||!item.mappingTouched){
        item.settings.xCol=item.inspection.suggestedX;
        item.settings.yCol=item.inspection.suggestedYCols[0]??Math.min(1,item.inspection.headers.length-1);
        item.settings.yCols=item.inspection.suggestedYCols.slice();
        item.settings.pairStart=0;
      }

      const max=Math.max(0,item.inspection.headers.length-1);
      item.settings.xCol=Math.min(Math.max(0,Number(item.settings.xCol)||0),max);
      item.settings.yCol=Math.min(Math.max(0,Number(item.settings.yCol)||0),max);
      item.settings.pairStart=Math.min(Math.max(0,Number(item.settings.pairStart)||0),max);
      item.settings.yCols=(item.settings.yCols||[]).filter(c=>c>=0&&c<=max&&c!==item.settings.xCol);
    }catch(err){
      item.error=err?.message||String(err);
      item.inspection=null;
    }
  }

  async function addImportFiles(){
    if(importDraft.fileDialogOpen)return;
    importDraft.fileDialogOpen=true;
    let metas=[];
    try{
      metas=await window.electronAPI.openDataFiles();
    }finally{
      importDraft.fileDialogOpen=false;
    }
    if(!metas?.length)return;

    for(const meta of metas){
      let item=importDraft.files.find(f=>f.path===meta.path);
      if(!item){
        item={
          ...meta,
          checked:true,
          text:'',
          detectedEncoding:'',
          loadedEncodingRequest:'',
          settings:flexibleImportProvider().defaultOptions(),
          inspection:null,
          mappingTouched:false,
          loading:false,
          error:''
        };
        importDraft.files.push(item);
      }
    }
    if(!importDraft.activePath)importDraft.activePath=metas[0].path;

    // Read sequentially to keep the UI responsive for many small instrument files.
    for(const meta of metas){
      const item=importDraft.files.find(f=>f.path===meta.path);
      await readImportItemText(item);
    }
    renderImportWorkbench();
  }

  function openImportWorkbench(){
    $('#importPanel').classList.remove('hidden');
    renderImportWorkbench();
  }

  function closeImportWorkbench(){
    $('#importPanel').classList.add('hidden');
  }

  function renderImportFileList(){
    const host=$('#importFileList');
    if(!host)return;
    host.innerHTML='';
    for(const item of importDraft.files){
      const el=document.createElement('div');
      el.className=`import-file-item ${item.path===importDraft.activePath?'active':''} ${item.error?'error':''}`;
      const ins=item.inspection;
      const layout=ins?importResolvedLayout(item):'—';
      el.innerHTML=`
        <div class="import-file-top">
          <input type="checkbox" ${item.checked?'checked':''}>
          <div class="import-file-name" title="${escapeHtml(item.path)}">${escapeHtml(item.name)}</div>
        </div>
        <div class="import-file-meta">
          ${item.loading?'读取中…':
            item.error?escapeHtml(item.error):
            `${humanFileSize(item.size)} · ${escapeHtml(item.detectedEncoding||item.settings.encoding)} · ${ins?.headers?.length||0} 列 · ${ins?.rowCount||0} 行 · ${escapeHtml(importLayoutName(layout))}`}
        </div>`;
      el.querySelector('input').onclick=e=>{
        e.stopPropagation();
        item.checked=e.target.checked;
        renderImportGlobalSummary();
      };
      el.onclick=()=>{
        importDraft.activePath=item.path;
        renderImportWorkbench();
      };
      host.appendChild(el);
    }
  }

  function importColumnOptions(item,selected){
    const headers=item?.inspection?.headers||[];
    return headers.map((h,i)=>`<option value="${i}" ${i===Number(selected)?'selected':''}>${i+1}: ${escapeHtml(h)}</option>`).join('');
  }

  function renderImportYColumns(item){
    const host=$('#importYColumns');
    if(!host)return;
    host.innerHTML='';
    const ins=item.inspection;
    if(!ins)return;
    const selected=new Set(item.settings.yCols||[]);
    for(const c of ins.columns){
      if(c.index===Number(item.settings.xCol))continue;
      const label=document.createElement('label');
      label.className='import-y-column';
      label.title=`数值率 ${(c.numericFraction*100).toFixed(0)}%`;
      label.innerHTML=`<input type="checkbox" value="${c.index}" ${selected.has(c.index)?'checked':''}><span>${c.index+1}: ${escapeHtml(c.header)}</span>`;
      label.querySelector('input').onchange=()=>{
        const values=[...host.querySelectorAll('input:checked')].map(x=>Number(x.value));
        item.settings.yCols=values;
        item.mappingTouched=true;
        renderImportSeriesVgRows(item);
        renderImportPreview(item);
        renderImportGlobalSummary();
      };
      host.appendChild(label);
    }
  }

  function importSeriesColumns(item){
    const ins=item?.inspection;
    if(!ins)return [];
    const layout=importResolvedLayout(item);
    if(layout==='single'){
      const c=Number(item.settings.yCol);
      return Number.isFinite(c)&&c>=0&&c<ins.headers.length?[c]:[];
    }
    if(layout==='sharedX'){
      return [...new Set(item.settings.yCols||[])]
        .map(Number).filter(c=>Number.isFinite(c)&&c>=0&&c<ins.headers.length&&c!==Number(item.settings.xCol));
    }
    if(layout==='paired'){
      const out=[];
      const start=Math.max(0,Number(item.settings.pairStart)||0);
      for(let c=start;c+1<ins.headers.length;c+=2)out.push(c+1);
      return out;
    }
    return [];
  }

  function inferredImportVg(item,col){
    const s=item?.settings||{};
    const header=item?.inspection?.headers?.[col]||'';
    if(s.vgMode==='manual')return Number.isFinite(Number(s.manualVg))?Number(s.manualVg):NaN;
    const provider=flexibleImportProvider();
    if(s.vgMode==='filename')return provider.parseVg(item.name,item.text);
    if(s.vgMode==='header')return provider.parseVgFromHeader(header);
    const h=provider.parseVgFromHeader(header);
    return Number.isFinite(h)?h:provider.parseVg(item.name,item.text);
  }

  function renderImportSeriesVgRows(item){
    const host=$('#importSeriesVgRows');
    if(!host)return;
    host.innerHTML='';
    if(!item?.inspection)return;

    const cols=importSeriesColumns(item);
    const overrides=item.settings.vgOverrides||{};
    if(!cols.length){
      host.innerHTML='<div class="import-diagnosis">当前列映射没有可生成的数据组。</div>';
      return;
    }

    cols.forEach((col,index)=>{
      const header=item.inspection.headers[col]||`Col ${col+1}`;
      const inferred=inferredImportVg(item,col);
      const hasOverride=Object.prototype.hasOwnProperty.call(overrides,String(col))&&Number.isFinite(Number(overrides[String(col)]));
      const row=document.createElement('div');
      row.className='import-series-vg-row';
      row.innerHTML=`
        <div class="import-series-vg-label" title="${escapeHtml(header)}">
          ${index+1}. 列 ${col+1}: ${escapeHtml(header)}
          <span class="import-diagnosis">${Number.isFinite(inferred)?` · 自动 ${inferred} V`:' · 自动未知'}</span>
        </div>
        <label class="import-series-vg-input-wrap">
          <input class="import-series-vg-input" type="number" step="any"
            value="${hasOverride?Number(overrides[String(col)]):''}"
            placeholder="${Number.isFinite(inferred)?inferred:'?'}" data-col="${col}">
          <span>V</span>
        </label>`;
      const input=row.querySelector('input');
      input.onchange=()=>{
        const raw=input.value.trim();
        const next={...(item.settings.vgOverrides||{})};
        if(raw==='')delete next[String(col)];
        else{
          const n=Number(raw);
          if(!Number.isFinite(n)){
            input.value=hasOverride?String(overrides[String(col)]):'';
            setStatus('每列 Vg 必须是有效数字，或留空使用自动识别。');
            return;
          }
          next[String(col)]=n;
        }
        item.settings.vgOverrides=next;
        item.mappingTouched=true;
        renderImportSeriesVgRows(item);
        renderImportPreview(item);
        renderImportGlobalSummary();
      };
      host.appendChild(row);
    });
  }

  function renderImportPreview(item){
    const ins=item?.inspection;
    if(!ins){
      $('#importPreviewSummary').innerHTML='';
      $('#importPreviewTable').innerHTML='<tbody><tr><td>无法解析预览</td></tr></tbody>';
      return;
    }

    const layout=importResolvedLayout(item);
    let seriesEstimate=1;
    if(layout==='sharedX')seriesEstimate=(item.settings.yCols||[]).length;
    if(layout==='paired')seriesEstimate=Math.max(0,Math.floor((ins.headers.length-(item.settings.pairStart||0))/2));

    $('#importPreviewSummary').innerHTML=[
      `检测编码 ${item.detectedEncoding||item.settings.encoding}`,
      `分隔符 ${importDelimiterName(ins.delimiter)}`,
      `${ins.headers.length} 列`,
      `${ins.rowCount} 个有效数值行`,
      `起始源文件行 ${ins.dataStartSourceLine??'—'}`,
      `排列 ${importLayoutName(layout)}`,
      `预计生成 ${seriesEstimate} 条数据`
    ].map(t=>`<span class="import-preview-chip">${escapeHtml(t)}</span>`).join('');

    const headers=ins.headers;
    const rows=ins.previewRows.slice(0,40);
    $('#importPreviewTable').innerHTML=`
      <thead><tr><th>源行</th>${headers.map((h,i)=>`<th>${i+1}: ${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.sourceLine}</td>${r.values.map(v=>
        Number.isFinite(v)?`<td>${gateFmt(v,6)}</td>`:'<td class="import-nan">—</td>'
      ).join('')}</tr>`).join('')}</tbody>`;

    $('#importAutoDiagnosis').textContent=
      `自动建议：${importLayoutName(ins.suggestedLayout)}；X=${ins.suggestedX+1}；Y=${ins.suggestedYCols.map(v=>v+1).join(', ')||'—'}`;
  }

  function renderImportEditor(){
    const item=importActiveItem();
    $('#importNoFile').classList.toggle('hidden',!!item);
    $('#importEditor').classList.toggle('hidden',!item);
    if(!item)return;

    const s=item.settings;
    $('#importEncoding').value=s.encoding||'auto';
    $('#importSkipRows').value=s.skipRows||0;
    $('#importEndRow').value=s.endRow||0;
    $('#importDelimiter').value=s.delimiter||'auto';
    $('#importHeaderMode').value=s.headerMode||'auto';
    $('#importDecimal').value=s.decimalSeparator||'auto';
    $('#importCommentPrefix').value=s.commentPrefix||'auto';
    $('#importLayout').value=s.layout||'auto';
    $('#importVoltageUnit').value=s.voltageUnit||'auto';
    $('#importCurrentUnit').value=s.currentUnit||'auto';
    $('#importVgMode').value=s.vgMode||'auto';
    $('#importManualVg').value=Number.isFinite(Number(s.manualVg))?s.manualVg:'';

    const options=importColumnOptions(item,s.xCol);
    $('#importXCol').innerHTML=options;
    $('#importYCol').innerHTML=importColumnOptions(item,s.yCol);
    $('#importPairStart').innerHTML=importColumnOptions(item,s.pairStart);

    const layout=importResolvedLayout(item);
    $('#importYSingleWrap').classList.toggle('hidden',layout!=='single');
    $('#importYMultiWrap').classList.toggle('hidden',layout!=='sharedX');
    $('#importPairStartWrap').classList.toggle('hidden',layout!=='paired');
    $('#importManualVgWrap').classList.toggle('hidden',s.vgMode!=='manual');

    renderImportYColumns(item);
    renderImportSeriesVgRows(item);
    renderImportPreview(item);
  }

  function renderImportGlobalSummary(){
    const checked=importDraft.files.filter(f=>f.checked);
    let series=0,errors=0;
    for(const item of checked){
      if(item.error||!item.inspection){errors++;continue;}
      const layout=importResolvedLayout(item);
      if(layout==='single')series+=1;
      else if(layout==='sharedX')series+=(item.settings.yCols||[]).length;
      else if(layout==='paired')series+=Math.max(0,Math.floor((item.inspection.headers.length-(item.settings.pairStart||0))/2));
    }
    $('#importGlobalSummary').textContent=
      `${checked.length}/${importDraft.files.length} 个文件已勾选 · 预计生成 ${series} 条 I–V 数据${errors?` · ${errors} 个文件需检查`:''}`;
    $('#importCommitBtn').disabled=!checked.length||checked.every(f=>f.error||!f.inspection);
  }

  function renderImportWorkbench(){
    renderImportFileList();
    renderImportEditor();
    renderImportGlobalSummary();
  }

  async function updateImportSetting(key,value,{reload=false,mapping=false}={}){
    const item=importActiveItem();
    if(!item)return;
    item.settings[key]=value;
    if(mapping)item.mappingTouched=true;

    if(reload){
      await readImportItemText(item,true);
    }else{
      recomputeImportItem(item,false);
    }
    renderImportWorkbench();
  }

  async function applyCurrentImportSettingsToAll(){
    const current=importActiveItem();
    if(!current)return;
    const template=JSON.parse(JSON.stringify(current.settings));
    for(const item of importDraft.files){
      if(item.path===current.path)continue;
      item.settings={...template};
      item.mappingTouched=current.mappingTouched;
      await readImportItemText(item,true);
      recomputeImportItem(item,false);
    }
    renderImportWorkbench();
    setStatus('已将当前导入设置应用到全部待导入文件；每个文件重新生成了预览。');
  }

  async function resetCurrentImportAuto(){
    const item=importActiveItem();
    if(!item)return;
    item.settings=flexibleImportProvider().defaultOptions();
    item.mappingTouched=false;
    await readImportItemText(item,true);
    recomputeImportItem(item,true);
    renderImportWorkbench();
  }

  async function commitImportWorkbench(){
    const selected=importDraft.files.filter(f=>f.checked);
    if(!selected.length)return;

    $('#importCommitBtn').disabled=true;
    importDraft.loading=true;
    try{
      const parsed=[];
      const reports=[];
      for(const item of selected){
        await readImportItemText(item);
        if(item.error)continue;
        const result=flexibleImportProvider().parse({
          name:item.name,path:item.path,text:item.text,encoding:item.detectedEncoding
        },item.settings);
        if(result.datasets.length){
          parsed.push(...result.datasets);
          reports.push(`${item.name}: ${result.datasets.length}`);
        }
      }

      if(!parsed.length){
        setStatus('没有生成可导入的数据。请检查列映射、跳行、编码或分隔符设置。');
        return;
      }

      const sourcePaths=new Set(selected.map(f=>f.path));
      state.datasets=state.datasets.filter(d=>!sourcePaths.has(d.sourcePath||d.path));
      for(const ds of parsed){
        ds.importedAt=ds.importedAt||new Date().toISOString();
        ds.dataProvenance=Array.isArray(ds.dataProvenance)?ds.dataProvenance:[];
        state.datasets.push(ds);
      }

      syncDatasetArtifacts();
      clearMainView(false);
      renderAll();
      refreshOpenAnalysisPage();

      const tab=activeProjectTab();
      if(tab&&!state.projectPath&&state.datasets.length){
        tab.title=state.datasets.length===1?state.datasets[0].name:`数据组 (${state.datasets.length})`;
        captureActiveProjectTab();
        renderProjectTabs();
      }

      // A successful import ends the import session. Keeping the previous
      // pending-file draft caused reopening the panel to look like a second
      // automatic import and triggered duplicate/replacement warnings before
      // the user selected any files.
      importDraft.files=[];
      importDraft.activePath=null;
      closeImportWorkbench();
      setStatus(
        `导入完成：${selected.length} 个源文件生成 ${parsed.length} 组数据。`
        + ` ${reports.join('；')}`
      );
    }finally{
      importDraft.loading=false;
      $('#importCommitBtn').disabled=false;
    }
  }

  async function importFiles(){
    openImportWorkbench();
  }

  function syncDatasetArtifacts({emit=true}={}){
    if(!state.artifactStore)state.artifactStore=window.DKDSData.createStore();
    window.DKDSData.syncLegacyDatasetArtifacts(state.artifactStore,state.datasets);
    const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;
    if(emit)window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{artifacts:state.artifactStore.list()});
    return state.artifactStore;
  }

  function artifactHostApi(){
    const emit=payload=>window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',payload);
    const api={
      list:options=>state.artifactStore?.list?.(options)||[],
      revision:kind=>state.artifactStore?.revision?.(kind)||0,
      get:id=>state.artifactStore?.get?.(id)||null,
      parents:id=>state.artifactStore?.parents?.(id)||[],
      children:id=>state.artifactStore?.children?.(id)||[],
      lineage:id=>state.artifactStore?.lineage?.(id)||null,
      add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);emit({type:'add',artifact:state.artifactStore.get(id)});return id;},
      upsert:artifact=>{const id=state.artifactStore.upsert(artifact);emit({type:'upsert',artifact:state.artifactStore.get(id)});return id;},
      publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)emit({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},
      batch:fn=>{const events=[];const batchApi={...api,add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);events.push({type:'add',artifact:state.artifactStore.get(id)});return id;},upsert:artifact=>{const id=state.artifactStore.upsert(artifact);events.push({type:'upsert',artifact:state.artifactStore.get(id)});return id;},publish:(artifact,options={})=>{const result=state.artifactStore.publish?.(artifact,options)||{id:state.artifactStore.upsert(artifact),changed:true};if(result.changed)events.push({type:'publish',artifact:state.artifactStore.get(result.id)});return result;},remove:id=>{const ok=state.artifactStore.remove(id);if(ok)events.push({type:'remove',id});return ok;}};const result=state.artifactStore.batch?state.artifactStore.batch(()=>fn?.(batchApi)):fn?.(batchApi);if(events.length)emit({type:'batch',events});return result;},
      remove:id=>{const ok=state.artifactStore.remove(id);if(ok)emit({type:'remove',id});return ok;},
      syncLegacy:()=>syncDatasetArtifacts(),
      serialize:()=>window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false})
    };return api;
  }

  function pluginUiContext(){
    return {
      activityId:window.DKDSPlugins?.activities?.active?.()||null,
      state,
      projectPath:state.projectPath,
      datasets:state.datasets,
      artifacts:state.artifactStore,
      platform:window.DKDSPlatform?.profile||null
    };
  }

  function activeMainViewProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const providers=window.DKDSPlugins?.registry?.values?.('ui.mainViews')||[];
    return providers
      .filter(p=>!p.activity||!activityId||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
  }

  function measureMainPlot(){
    const wrap=$('#mainPlotWrap');
    if(!wrap)return null;
    const rect=wrap.getBoundingClientRect();
    const width=Math.round(rect.width),height=Math.round(rect.height);
    return width>8&&height>8?{width,height}:null;
  }

  function renderEmptyMainView(message='当前工作区没有提供主图视图'){
    const legend=$('#mainLegendBar');if(legend)legend.replaceChildren();
    const svg=$('#mainPlot');if(!svg)return;
    svg.replaceChildren();
    const size=measureMainPlot();if(!size)return;
    svg.setAttribute('width',String(size.width));
    svg.setAttribute('height',String(size.height));
    svg.removeAttribute('viewBox');
    const text=document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x',String(size.width/2));text.setAttribute('y',String(size.height/2));
    text.setAttribute('text-anchor','middle');text.setAttribute('class','empty-main-view');text.textContent=message;
    svg.appendChild(text);
  }

  function renderMainPlot(){
    const provider=activeMainViewProvider();
    if(!provider?.render){renderEmptyMainView();return;}
    try{
      provider.render({container:$('#mainPlotWrap'),svg:mainSvg,state,context:pluginUiContext(),activityId:window.DKDSPlugins?.activities?.active?.()||null});
    }catch(err){
      console.error(`[DKDS main view:${provider.id}]`,err);
      renderEmptyMainView(`主图插件 ${provider.title||provider.id} 渲染失败`);
    }
  }

  function scheduleMainPlotRelayout(){
    if(state.mainLayout.raf)cancelAnimationFrame(state.mainLayout.raf);
    state.mainLayout.raf=requestAnimationFrame(()=>{state.mainLayout.raf=null;renderMainPlot();});
  }

  function clearMainView(render=true){
    state.mainView={xDomain:null,yDomain:null,mode:'select'};
    if(render)renderMainPlot();
  }

  function resetMainView(){
    clearMainView(true);
    window.DKDSPlugins?.events?.emit?.('main-view:reset',{activityId:window.DKDSPlugins?.activities?.active?.()||null});
  }

  function updateMainModeButtons(){}

  function renderAll(){
    renderProjectTabs();
    renderDatasetList();
    renderMainPlot();
    renderInspector();
    renderTrendPanel();
    window.DKDSPlugins?.events?.emit?.('workspace:render',{context:pluginUiContext()});
  }

  function activeInspectorProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const providers=(window.DKDSPlugins?.registry?.values?.('ui.inspectors')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0));
    const context=pluginUiContext();
    return providers.find(p=>{
      try{return typeof p.supports==='function'?p.supports(context)!==false:true;}catch{return false;}
    })||null;
  }

  function renderInspector(){
    const host=$('#inspectorBody');
    if(!host)return;
    const provider=activeInspectorProvider();
    const header=$('#inspectorPanelHeaderTitle');
    if(header)header.textContent=provider?.panelTitle||provider?.title||'检查器';
    if(!provider){
      host.innerHTML='<div class="empty-state">当前工作区没有提供检查器。</div>';
      return;
    }
    try{
      provider.render({container:host,context:pluginUiContext()});
    }catch(err){
      console.error('[DKDS inspector provider]',err);
      host.innerHTML=`<div class="empty-state">检查器插件渲染失败：${escapeHtml(err.message)}</div>`;
    }
  }


  let analysisViewportFrame=0;
  let analysisViewportFollowupFrame=0;

  function getAnalysisViewportHeight(){
    return Math.max(1,Math.round(
      window.visualViewport?.height
      || window.innerHeight
      || document.documentElement.clientHeight
      || 1
    ));
  }

  function measureAnalysisPageTop(){
    const viewportHeight=getAnalysisViewportHeight();
    const shellParts=[document.querySelector('.topbar'),document.querySelector('.project-tabs-bar')];
    let bottom=0;
    for(const el of shellParts){
      if(!el||getComputedStyle(el).display==='none')continue;
      const rect=el.getBoundingClientRect();
      if(Number.isFinite(rect.bottom))bottom=Math.max(bottom,rect.bottom);
    }
    const fallback=92;
    const measured=bottom>0?Math.round(bottom):fallback;
    return Math.max(0,Math.min(measured,Math.max(0,viewportHeight-120)));
  }

  function applyAnalysisPageViewport(){
    analysisViewportFrame=0;
    const root=document.documentElement;
    const viewportHeight=getAnalysisViewportHeight();
    const top=measureAnalysisPageTop();
    root.style.setProperty('--dkds-viewport-height',`${viewportHeight}px`);
    root.style.setProperty('--dkds-analysis-page-top',`${top}px`);
  }

  function syncAnalysisPageViewport(){
    if(analysisViewportFrame)cancelAnimationFrame(analysisViewportFrame);
    if(analysisViewportFollowupFrame)cancelAnimationFrame(analysisViewportFollowupFrame);
    analysisViewportFrame=requestAnimationFrame(()=>{
      applyAnalysisPageViewport();
      // Plugin enable/disable can mutate the command shell in the same frame.
      // Measure once more after layout settles so an open analysis page never
      // keeps a stale, shortened scroll viewport.
      analysisViewportFollowupFrame=requestAnimationFrame(()=>{
        analysisViewportFollowupFrame=0;
        applyAnalysisPageViewport();
      });
    });
  }

  window.visualViewport?.addEventListener?.('resize',syncAnalysisPageViewport,{passive:true});

  // Keep fixed analysis pages anchored to the live command shell. Plugin
  // enable/disable and SUPER switches can reflow the toolbar several frames
  // after the originating event; a persistent observer is more reliable than
  // one-off scroll/view-height corrections.
  let analysisShellResizeObserver=null;
  function bindAnalysisShellViewportObserver(){
    analysisShellResizeObserver?.disconnect?.();
    if(!window.ResizeObserver)return;
    analysisShellResizeObserver=new ResizeObserver(()=>syncAnalysisPageViewport());
    for(const selector of ['.topbar','.project-tabs-bar','#activityBar','#primaryActivityBar']){
      const el=document.querySelector(selector);if(el)analysisShellResizeObserver.observe(el);
    }
  }
  queueMicrotask(bindAnalysisShellViewportObserver);

  const SUPER_LEFT_STORAGE_KEY='dkds.workspace.super.left-fraction.v1';
  let superLeftFraction=0.20;
  let superDividerBound=false;

  function currentSuperLayoutBounds(){
    const left=window.DKDSPlugins?.workspace?.super?.()?.contract?.layout?.left||{};
    const min=Number(left.minFraction);
    const max=Number(left.maxFraction);
    const preferred=Number(left.defaultFraction);
    return {
      min:Number.isFinite(min)?Math.max(.10,Math.min(.35,min)):.14,
      max:Number.isFinite(max)?Math.max(.25,Math.min(.50,max)):.42,
      preferred:Number.isFinite(preferred)?preferred:.20
    };
  }

  function readSuperLeftFraction(){
    let value=NaN;
    try{value=Number(localStorage.getItem(SUPER_LEFT_STORAGE_KEY));}catch{}
    const bounds=currentSuperLayoutBounds();
    if(!Number.isFinite(value))value=bounds.preferred;
    return Math.max(bounds.min,Math.min(bounds.max,value));
  }

  function applySuperLeftFraction(value,{persist=false}={}){
    const bounds=currentSuperLayoutBounds();
    superLeftFraction=Math.max(bounds.min,Math.min(bounds.max,Number(value)||bounds.preferred));
    document.documentElement.style.setProperty('--dkds-super-left-width',`${(superLeftFraction*100).toFixed(3)}vw`);
    if(persist){try{localStorage.setItem(SUPER_LEFT_STORAGE_KEY,String(superLeftFraction));}catch{}}
    syncSuperWorkspaceDivider();
    window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'super-divider',fraction:superLeftFraction});
    scheduleMainPlotRelayout();
  }

  function visibleAnalysisPage(){
    return [...document.querySelectorAll('.analysis-page')].find(el=>!el.classList.contains('hidden'))||null;
  }

  function syncSuperWorkspaceDivider(){
    const divider=$('#superWorkspaceDivider');
    if(!divider)return;
    const state=window.DKDSPlugins?.workspace?.super?.()||{};
    const page=visibleAnalysisPage();
    const superPage=page&&page.classList.contains('super-workspace-root-page');
    const blocked=page&&!superPage;
    divider.classList.toggle('hidden',!state.available||blocked);
    if(!state.available||blocked)return;
    const tabs=document.querySelector('.project-tabs-bar');
    const header=superPage?page.querySelector('.analysis-page-header'):null;
    const top=Math.ceil((header?.getBoundingClientRect?.().bottom)||(tabs?.getBoundingClientRect?.().bottom)||92);
    divider.style.setProperty('--dkds-super-divider-top',`${top}px`);
  }

  function clearSuperWorkspaceComposition(){
    document.querySelectorAll('.dkds-super-composed-root').forEach(el=>el.classList.remove('dkds-super-composed-root'));
    document.querySelectorAll('.dkds-super-slot-left,.dkds-super-slot-main,.dkds-super-slot-sticky,.dkds-super-slot-span,.dkds-super-slot-stack').forEach(el=>{
      el.classList.remove('dkds-super-slot-left','dkds-super-slot-main','dkds-super-slot-sticky','dkds-super-slot-span','dkds-super-slot-stack');
      delete el.dataset.dkdsSuperSlot;
    });
    document.querySelectorAll('.dkds-super-flatten').forEach(el=>el.classList.remove('dkds-super-flatten'));
  }

  function superContractScope(region={}){
    const pageId=String(region?.pageId||'').trim();
    return (pageId&&document.getElementById(pageId))||document;
  }

  function querySuperContractSelectors(region={}){
    const selectors=Array.isArray(region?.selectors)?region.selectors:[region?.selector,region?.mount];
    const scope=superContractScope(region);
    const out=[];
    for(const raw of selectors){
      const selector=String(raw||'').trim();
      if(!selector)continue;
      try{
        for(const element of scope.querySelectorAll(selector))if(!out.includes(element))out.push(element);
      }catch(err){console.warn(`[DKDS SUPER] invalid selector ${selector}`,err);}
    }
    return out;
  }

  function querySuperRoot(contract={}){
    const layout=contract?.layout||{};
    const selector=String(layout?.root?.selector||'').trim();
    if(!selector)return null;
    const scope=superContractScope(layout.left||layout.main||{});
    try{return scope.querySelector(selector)||document.querySelector(selector);}catch{return null;}
  }

  function applySuperWorkspaceComposition(contract={}){
    clearSuperWorkspaceComposition();
    const layout=contract?.layout||{};
    const mode=String(layout.mode||'split');
    document.body.dataset.superLayoutMode=mode;
    if(mode==='native')return true;

    const left=querySuperContractSelectors(layout.left||{});
    const main=querySuperContractSelectors(layout.main||{});
    const root=querySuperRoot(contract);
    if(!root||!left.length||!main.length){
      console.warn('[DKDS SUPER] incomplete runtime composition target',contract?.pluginId||'',{root:!!root,left:left.length,main:main.length});
      return false;
    }
    root.classList.add('dkds-super-composed-root');
    const mark=(elements,slot,region)=>{
      for(const element of elements){
        if(!root.contains(element))continue;
        element.classList.add(slot==='left'?'dkds-super-slot-left':'dkds-super-slot-main');
        element.dataset.dkdsSuperSlot=slot;
        if(region?.sticky)element.classList.add('dkds-super-slot-sticky');
        if(region?.spanRows)element.classList.add('dkds-super-slot-span');
        if(region?.stack)element.classList.add('dkds-super-slot-stack');
      }
    };
    mark(left,'left',layout.left||{});
    mark(main,'main',layout.main||{});
    const scope=superContractScope(layout.left||layout.main||{});
    for(const raw of (Array.isArray(layout.flatten)?layout.flatten:[])){
      const selector=String(raw||'').trim();
      if(!selector)continue;
      try{for(const element of scope.querySelectorAll(selector))if(root.contains(element))element.classList.add('dkds-super-flatten');}catch{}
    }
    return true;
  }

  function primePortableKey(contribution={}){
    return `${String(contribution.pluginId||'')}:${String(contribution.id||'')}`;
  }

  function resolvePrimePortableTarget(contribution={}){
    const raw=String(contribution.target||'').trim();
    if(!raw)return null;
    if(raw.startsWith('#')||raw.startsWith('.')||raw.startsWith('[')){
      try{return document.querySelector(raw);}catch{return null;}
    }
    return document.getElementById(raw)||(()=>{try{return document.querySelector(raw);}catch{return null;}})();
  }

  function refreshPrimeDockSlots(){
    const right=$('#primeRightDockSlot');
    const bottom=$('#primeBottomDockSlot');
    if(right)right.classList.toggle('active',[...right.children].some(node=>!node.classList.contains('hidden')));
    if(bottom)bottom.classList.toggle('active',[...bottom.children].some(node=>!node.classList.contains('hidden')));
    scheduleMainPlotRelayout();
  }

  function rememberPortablePrime(contribution,node){
    const key=primePortableKey(contribution);
    if(!primePortableState.has(key)){
      primePortableState.set(key,{
        key,pluginId:String(contribution.pluginId||''),node,
        parent:node.parentNode||null,next:node.nextSibling||null
      });
    }
    return primePortableState.get(key);
  }

  function resetPortablePrimeClasses(node){
    if(!node)return;
    node.classList.remove('dkds-prime-portable','dkds-prime-docked-right','dkds-prime-docked-bottom','dkds-prime-floating');
    delete node.dataset.dkdsPrimePlacement;
  }

  function restorePortablePrime(entry){
    if(!entry?.node)return;
    const {node,parent,next}=entry;
    resetPortablePrimeClasses(node);
    if(parent?.isConnected){
      if(next?.parentNode===parent)parent.insertBefore(node,next);
      else parent.appendChild(node);
    }
  }

  function restorePortablePrimesExcept(pluginId=''){
    for(const [key,entry] of [...primePortableState]){
      if(pluginId&&entry.pluginId===pluginId)continue;
      restorePortablePrime(entry);
      primePortableState.delete(key);
    }
    refreshPrimeDockSlots();
  }

  function placePrimeContribution(contribution={},placement){
    const next=String(placement||'').trim().toLowerCase();
    if(!contribution.portable)throw new Error(`PRIME ${contribution.pluginId||''}/${contribution.id||''} 必须提供 placement adapter，或声明 portable:true。`);
    const node=resolvePrimePortableTarget(contribution);
    if(!node)throw new Error(`找不到 PRIME UI：${contribution.target||contribution.id||''}`);
    const entry=rememberPortablePrime(contribution,node);
    const right=$('#primeRightDockSlot');
    const bottom=$('#primeBottomDockSlot');
    const appRoot=$('#app');
    if(!right||!bottom||!appRoot)return false;

    resetPortablePrimeClasses(node);
    node.classList.add('dkds-prime-portable');
    node.dataset.dkdsPrimePlacement=next;
    if(next==='right'){
      right.appendChild(node);
      node.classList.add('dkds-prime-docked-right');
    }else if(next==='bottom'){
      bottom.appendChild(node);
      node.classList.add('dkds-prime-docked-bottom');
    }else if(next==='float'){
      appRoot.appendChild(node);
      node.classList.add('dkds-prime-floating');
      if(node.querySelector?.('.drag-handle')&&!node.dataset.dkdsPrimeDragBound){
        makeFloating(node);
        node.dataset.dkdsPrimeDragBound='1';
      }
    }else{
      restorePortablePrime(entry);
      throw new Error(`不支持的 PRIME placement: ${next}`);
    }
    refreshPrimeDockSlots();
    return true;
  }

  function superWorkspaceRootPageId(contract={}){
    const layout=contract?.layout||{};
    const explicit=String(layout.rootPageId||layout.pageId||'').trim();
    if(explicit)return explicit;
    const left=String(layout.left?.pageId||'').trim();
    const main=String(layout.main?.pageId||'').trim();
    if(left&&main&&left!==main){
      console.warn('[DKDS SUPER] left/main pageId mismatch; using main page as root',{left,main,pluginId:contract?.pluginId||''});
      return main;
    }
    if(main||left)return main||left;
    // Native PluginWorkspace contracts identify their root by selector instead
    // of the legacy split-layout pageId. Resolve that selector back to its
    // owning analysis page so system navigation (Plugin Manager -> SUB/PRIME)
    // can restore the active SUPER before invoking the plugin command.
    const rootSelector=String(layout.root?.selector||layout.rootSelector||'').trim();
    if(rootSelector){
      try{
        const root=document.querySelector(rootSelector);
        const page=root?.closest?.('.analysis-page');
        if(page?.id)return page.id;
      }catch(err){console.warn('[DKDS SUPER] invalid native root selector',rootSelector,err);}
      const match=rootSelector.match(/^#([A-Za-z_][\w:.-]*)/);
      if(match?.[1]&&document.getElementById(match[1])?.classList?.contains('analysis-page'))return match[1];
    }
    return '';
  }

  function applySuperWorkspace(superState){
    const state=superState||window.DKDSPlugins?.workspace?.super?.()||{};
    restorePortablePrimesExcept(String(state.pluginId||''));
    const activity=String(state.activityId||'');
    document.body.dataset.superActivity=activity;
    document.body.dataset.superPlugin=String(state.pluginId||'');
    document.body.classList.toggle('super-unconfigured',!state.available);
    const rootPageId=superWorkspaceRootPageId(state.contract||{});
    document.querySelectorAll('.analysis-page').forEach(page=>{
      const belongsToSuper=!!activity&&page.dataset.pluginActivity===activity;
      const isRoot=belongsToSuper&&!!rootPageId&&page.id===rootPageId;
      page.classList.toggle('super-workspace-page',belongsToSuper);
      page.classList.toggle('super-workspace-root-page',isRoot);
    });
    applySuperWorkspaceComposition(state.contract||{});
    applySuperLeftFraction(readSuperLeftFraction());
    requestAnimationFrame(syncSuperWorkspaceDivider);
  }

  function showNoSuperWorkspace(){
    restorePortablePrimesExcept('');
    clearSuperWorkspaceComposition();
    document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!=='superWorkspaceEmpty'));
    document.body.classList.add('super-unconfigured');
    syncAnalysisPageViewport();
    syncSuperWorkspaceDivider();
  }

  function bindSuperWorkspaceDivider(){
    if(superDividerBound)return;
    superDividerBound=true;
    const divider=$('#superWorkspaceDivider');
    if(!divider)return;
    const setFromClientX=(clientX,persist=false)=>{
      const width=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
      applySuperLeftFraction(clientX/width,{persist});
    };
    divider.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      divider.setPointerCapture?.(event.pointerId);
      document.body.classList.add('super-divider-dragging');
      const move=e=>setFromClientX(e.clientX,false);
      const up=e=>{
        divider.releasePointerCapture?.(event.pointerId);
        document.removeEventListener('pointermove',move,true);
        document.removeEventListener('pointerup',up,true);
        document.body.classList.remove('super-divider-dragging');
        setFromClientX(e.clientX,true);
      };
      document.addEventListener('pointermove',move,true);
      document.addEventListener('pointerup',up,true);
      event.preventDefault();
    });
    divider.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
      const bounds=currentSuperLayoutBounds();
      if(event.key==='Home')applySuperLeftFraction(bounds.preferred,{persist:true});
      else applySuperLeftFraction(superLeftFraction+(event.key==='ArrowRight'?.01:-.01),{persist:true});
      event.preventDefault();
    });
    $('#superEmptyOpenManagerBtn')?.addEventListener('click',()=>{
      openAnalysisPage('pluginManagerPage');
      window.DKDSPluginManagerUI?.render?.();
    });
  }

  function refreshOpenAnalysisPage(){
    const page=[...document.querySelectorAll('.analysis-page')].find(el=>!el.classList.contains('hidden'));
    if(page)window.DKDSPlugins?.events?.emit?.('analysis:refresh',{id:page.id});
  }

  function openAnalysisPage(id){
    syncAnalysisPageViewport();
    document.querySelectorAll('.analysis-page').forEach(page=>page.classList.toggle('hidden',page.id!==id));
    window.DKDSPlugins?.events?.emit?.('analysis:opened',{id});
    syncAnalysisPageViewport();
    syncSuperWorkspaceDivider();
    scheduleMainPlotRelayout();
  }

  function ensurePluginWorkspaceVisible(activityId){
    const activity=String(activityId||'');
    const superState=window.DKDSPlugins?.workspace?.super?.();
    if(!activity||!superState?.available||String(superState.activityId||'')!==activity)return false;
    const rootPageId=superWorkspaceRootPageId(superState.contract||{});
    if(!rootPageId)return false;
    const root=$('#'+rootPageId);
    const visible=[...document.querySelectorAll('.analysis-page')].find(page=>!page.classList.contains('hidden'));
    if(visible?.id===rootPageId)return true;
    openAnalysisPage(rootPageId);
    return !!root&&!root.classList.contains('hidden');
  }

  function closeAnalysisPage(id){
    const page=$('#'+id);
    if(page?.classList.contains('super-workspace-root-page'))return false;
    if(page)page.classList.add('hidden');
    window.DKDSPlugins?.events?.emit?.('analysis:closed',{id});
    const superState=window.DKDSPlugins?.workspace?.super?.();
    if(superState?.available){
      queueMicrotask(()=>window.DKDSPlugins?.activities?.set?.(superState.activityId));
    }
    syncSuperWorkspaceDivider();
    scheduleMainPlotRelayout();
    return true;
  }

  function showMainWorkspace(){
    document.querySelectorAll('.analysis-page').forEach(page=>page.classList.add('hidden'));
    scheduleMainPlotRelayout();
    renderAll();
    syncSuperWorkspaceDivider();
  }

  async function savePlotlyImage(plotId,defaultName,format){
    const data=await Plotly.toImage(plotId,{format,width:1500,height:950,scale:format==='png'?2:1});
    if(format==='svg'){
      const raw=data.split(',')[1]||'';
      const content=decodeURIComponent(raw);
      return window.electronAPI.saveText({defaultName:`${defaultName}.svg`,content,filters:[{name:'SVG',extensions:['svg']}]});
    }
    const base64=data.split(',')[1]||'';
    return window.electronAPI.saveBase64({defaultName:`${defaultName}.png`,base64,filters:[{name:'PNG',extensions:['png']}]});
  }

  function activeGroupChartProviders(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const context=pluginUiContext();
    return (window.DKDSPlugins?.registry?.values?.('ui.groupCharts')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .filter(p=>{
        try{return typeof p.supports==='function'?p.supports(context)!==false:true;}catch{return false;}
      })
      .sort((a,b)=>(Number(a.order)||100)-(Number(b.order)||100));
  }

  function activeGroupViewProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    return (window.DKDSPlugins?.registry?.values?.('ui.groupViews')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
  }

  function traceColor(trace){
    return trace?.line?.color || trace?.marker?.color || '#64748b';
  }

  function renderSubplotLegend(host,traces){
    if(!host)return;
    if(!traces.length){host.innerHTML='<span class="muted">无可显示序列</span>';return;}
    host.innerHTML=traces.map(t=>{
      const c=traceColor(t),reverse=t?.line?.dash==='dash';
      return `<span class="trend-legend-chip"><i class="trend-legend-line ${reverse?'reverse':''}" style="color:${c}"></i><span>${escapeHtml(t.name||'')}</span></span>`;
    }).join('');
  }

  function resolvedTrendColumns(){
    const host=$('#trendGrid');
    const panel=$('#groupPanel');
    const count=Math.max(1,activeGroupChartProviders().length);
    if(state.trendColumns!=='auto'){
      const n=Math.max(1,Math.min(6,Number(state.trendColumns)||1));
      return Math.min(n,count);
    }
    const bodyWidth=Math.max(300,host?.parentElement?.clientWidth || panel?.clientWidth || 880);
    const maxByWidth=Math.max(1,Math.min(count,Math.floor(bodyWidth/300)));
    for(let c=maxByWidth;c>=1;c--)if(count%c===0)return c;
    return maxByWidth;
  }

  function updateTrendLayout(resizePlots=true){
    const grid=$('#trendGrid');
    if(!grid)return;
    const cols=resolvedTrendColumns();
    grid.style.setProperty('--trend-cols',String(cols));
    const gridWidth=Math.max(280,grid.clientWidth || grid.parentElement?.clientWidth || 800);
    const gap=12;
    const cardWidth=Math.max(160,(gridWidth-gap*(cols-1))/cols);
    const plotHeight=Math.max(220,Math.min(390,Math.round(cardWidth*0.62)));
    grid.style.setProperty('--trend-plot-height',`${plotHeight}px`);
    document.querySelectorAll('[data-trend-cols]').forEach(b=>{
      b.classList.toggle('active',String(b.dataset.trendCols)===String(state.trendColumns));
    });
    if(resizePlots){
      requestAnimationFrame(()=>{
        document.querySelectorAll('.trend-plot').forEach(plot=>{try{Plotly.Plots.resize(plot);}catch{}});
      });
    }
  }

  function setTrendColumns(value){
    state.trendColumns=value==='auto'?'auto':Math.max(1,Math.min(6,Number(value)||1));
    saveTrendColumnsPreference(state.trendColumns);
    const tab=activeProjectTab();if(tab)tab.trendColumns=state.trendColumns;
    updateTrendLayout(true);
    setStatus(`组图排列：${state.trendColumns==='auto'?'自动':`每行 ${state.trendColumns} 个`}`);
  }

  function bindPluginGroupPointClick(plot,provider,result){
    if(!plot||typeof plot.on!=='function')return;
    try{plot.removeAllListeners?.('plotly_click');}catch{}
    plot.on('plotly_click',ev=>{
      try{provider.onPointClick?.({event:ev,point:ev?.points?.[0],result,context:pluginUiContext()});}
      catch(err){console.error('[DKDS group point click]',err);}
    });
  }

  function renderTrendPanel(){
    const host=$('#trendGrid');
    if(!host)return;
    host.innerHTML='';
    const providers=activeGroupChartProviders();
    const view=activeGroupViewProvider();
    const context=pluginUiContext();
    const panelHeader=$('#groupPanelHeaderTitle');
    if(panelHeader)panelHeader.textContent=view?.panelTitle||view?.label||'组图';
    const title=$('#groupPanelTitle');
    if(title){
      try{title.textContent=view?.title?.(context)||view?.label||'组图';}
      catch{title.textContent='组图';}
    }

    if(!providers.length){
      host.innerHTML='<div class="empty-state">当前工作区没有提供组图类型。插件可以注册自己的数据模型、图形和导出方式。</div>';
      updateTrendLayout(false);
      return;
    }

    for(const provider of providers){
      let result;
      try{result=provider.build({context,host:window.DKDSPlugins?.host})||{};}
      catch(err){
        console.error(`[DKDS group chart:${provider.id}]`,err);
        result={title:provider.title||provider.name||provider.id,unit:'',traces:[],error:err.message};
      }

      const titleText=result.title||provider.title||provider.name||provider.id;
      const unit=result.unit||provider.unit||'';
      const card=document.createElement('div');
      card.className='trend-card';
      card.dataset.groupChartId=provider.id;
      card.innerHTML=`
        <div class="trend-card-header">
          <span>${escapeHtml(titleText)}</span>
          <span class="trend-header-actions">
            <button type="button" class="trend-csv-btn">CSV</button>
            <button type="button" class="trend-copy-btn copy-btn">复制</button>
          </span>
        </div>
        <div class="trend-plot"></div>
        <div class="trend-card-legend"></div>`;
      host.appendChild(card);
      const plot=card.querySelector('.trend-plot');
      const legend=card.querySelector('.trend-card-legend');
      const traces=Array.isArray(result.traces)?result.traces:[];

      if(result.error){
        plot.innerHTML=`<div class="empty-state">${escapeHtml(result.error)}</div>`;
      }else{
        renderSubplotLegend(legend,traces);
        const layout={
          margin:{l:60,r:14,t:14,b:48},
          xaxis:{title:result.xTitle||'Vg (V)',gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:unit,gridcolor:'#edf0f5',automargin:true},
          showlegend:false,hovermode:'closest',dragmode:'zoom',autosize:true,
          ...(result.layout||{})
        };
        const config={displayModeBar:false,responsive:true,doubleClick:'reset',...(result.config||{})};
        Plotly.newPlot(plot,traces,layout,config).then(()=>bindPluginGroupPointClick(plot,provider,result));
      }

      card.addEventListener('dblclick',event=>{
        if(event.target.closest('button')||!traces.length)return;
        openZoomChart(titleText,unit,traces,provider,result);
      });
      card.querySelector('.trend-csv-btn').onclick=event=>{
        event.stopPropagation();
        const text=typeof result.csvText==='function'?result.csvText():result.csvText;
        if(text)window.electronAPI.saveText({defaultName:`${safeName(titleText)}.csv`,content:text,filters:[{name:'CSV',extensions:['csv']}]});
      };
      card.querySelector('.trend-copy-btn').onclick=event=>{
        event.stopPropagation();
        const text=typeof result.csvText==='function'?result.csvText():result.csvText;
        if(text)copyTextToClipboard(text,`${titleText} CSV`);
      };
    }
    updateTrendLayout(true);
  }


  function openZoomChart(title,unit,traces,provider=null,result=null){
    state.zoomChart={title,unit,traces}; $('#zoomPanelTitle').textContent=title; $('#zoomPanel').classList.remove('hidden');
    const layout={
      margin:{l:78,r:145,t:42,b:62},xaxis:{title:'Vg (V)',automargin:true},yaxis:{title:unit,automargin:true},
      legend:{orientation:'v',x:1.02,xanchor:'left',y:1},hovermode:'closest',dragmode:'zoom',uirevision:`zoom-${title}`
    };
    const config={
      responsive:true,displaylogo:false,displayModeBar:true,scrollZoom:true,doubleClick:'reset+autosize',
      modeBarButtonsToAdd:['select2d','lasso2d'],toImageButtonOptions:{format:'svg',filename:safeName(title),width:1400,height:900}
    };
    Plotly.newPlot('zoomPlot',traces,layout,config).then(()=>{
      if(provider)bindPluginGroupPointClick($('#zoomPlot'),provider,result||{});
      requestAnimationFrame(()=>{try{Plotly.Plots.resize($('#zoomPlot'));}catch{}});
    });
  }

  function zoomCsvText(){
    if(!state.zoomChart)return '';
    const rows=['series,Vg,value'];
    for(const t of state.zoomChart.traces)for(let i=0;i<t.x.length;i++)rows.push([csvCell(t.name),t.x[i],t.y[i]].join(','));
    return rows.join('\n');
  }

  function currentMainViewCsvText(){
    const provider=activeMainViewProvider();
    if(provider?.csvText){
      try{return String(provider.csvText({state,context:pluginUiContext()})||'');}
      catch(err){setStatus(`主图数据导出失败：${err.message}`);return '';}
    }
    return '';
  }

  async function exportCurrentMainCsv(){
    const provider=activeMainViewProvider();
    if(provider?.exportCsv)return provider.exportCsv({state,context:pluginUiContext()});
    const text=currentMainViewCsvText();
    if(!text){setStatus('当前主图插件没有提供数据导出。');return false;}
    const name=provider?.exportBaseName||'main_view_data';
    return window.electronAPI.saveText({defaultName:`${safeName(name)}.csv`,content:text,filters:[{name:'CSV',extensions:['csv']}]});
  }

  async function exportCurrentMainSvg(){
    const provider=activeMainViewProvider();
    if(provider?.exportSvg)return provider.exportSvg({state,context:pluginUiContext()});
    setStatus('当前主图插件没有提供 SVG 导出。');
    return false;
  }

  async function exportCurrentMainPng(){
    const provider=activeMainViewProvider();
    if(provider?.exportPng)return provider.exportPng({state,context:pluginUiContext()});
    setStatus('当前主图插件没有提供 PNG 导出。');
    return false;
  }


  function makeProject(){
    return {
      format:'dk-data-studio-project',
      schemaVersion:2,
      version:'3.58.0',
      datasets:state.datasets.map(d=>({
        name:d.name,path:d.path,text:d.text,vg:d.vg,
        sourcePath:d.sourcePath||d.path,
        sourceName:d.sourceName||d.name,
        encoding:d.encoding||'',
        importedAt:d.importedAt||null,
        dataProvenance:d.dataProvenance||[],
        importSpec:d.importSpec||null,
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
        out.push({...source,sourcePath:source.sourcePath||source.path,sourceName:source.sourceName||source.name,points:source.points.map((point,index)=>({...point,index}))});
        continue;
      }
      if(!source?.text)continue;
      try{
        const provider=flexibleImportProvider();
        const parsed=provider.parse({name:source.name,path:source.path,text:source.text,encoding:source.encoding||'auto'},provider.defaultOptions?.()||{});
        for(const dataset of (parsed?.datasets||[]))out.push({...dataset,sourcePath:source.sourcePath||source.path,sourceName:source.sourceName||source.name});
      }catch(err){console.warn('[DKDS project dataset restore]',err);}
    }
    return out;
  }

  function loadProjectIntoActive(pr,path){
    state.datasets=canonicalProjectDatasets(pr);
    state.projectPath=path||null;
    state.artifactStore=window.DKDSData.restoreStore(pr.dataModel||{schema:1,artifacts:[]});
    const artifactTab=activeProjectTab();
    if(artifactTab)artifactTab.artifactStore=state.artifactStore;
    syncDatasetArtifacts({emit:false});

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

  async function openProject(){
    const r=await window.electronAPI.openProject();
    if(!r)return;

    captureActiveProjectTab();
    const tab=blankProjectTab(projectBaseName(r.path));
    state.projectTabs.push(tab);
    state.activeProjectTabId=tab.id;
    mountProjectTab(tab);

    loadProjectIntoActive(r.project,r.path);
    tab.title=projectBaseName(r.path);
    captureActiveProjectTab();

    renderProjectTabs();
    renderAll();
    applyGroupPanelLayout();
    applyInspectorPanelLayout();
    scheduleMainPlotRelayout();
    setStatus(`已在新标签页打开工程：${r.path}`);
  }


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
      $('#groupDockBtn').title='将组图恢复为可拖动悬浮窗口';
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
      $('#groupDockBtn').title='将组图停靠到主图下方，使主图自动上移';
    }

    panel.classList.toggle('collapsed',state.groupPanelCollapsed);
    $('#groupMinimizeBtn').textContent=state.groupPanelCollapsed?'展开':'缩小';
    $('#groupMinimizeBtn').title=state.groupPanelCollapsed?'展开组图面板':'将组图缩小为标题栏';

    requestAnimationFrame(()=>{
      scheduleMainPlotRelayout();
      if(!state.groupPanelCollapsed&&!panel.classList.contains('hidden'))updateTrendLayout(true);
    });
  }

  function setGroupPrimePlacement(placement){
    const next=String(placement||'').trim().toLowerCase();
    if(next==='bottom')state.groupPanelMode='docked';
    else if(next==='float')state.groupPanelMode='floating';
    else return false;
    applyGroupPanelLayout();
    return true;
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
      $('#inspectorDockBtn').title='将曲线检查器恢复为可拖动悬浮窗口';
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
      $('#inspectorDockBtn').title='将曲线检查器嵌入主图右侧';
    }

    requestAnimationFrame(()=>scheduleMainPlotRelayout());
  }

  function setInspectorPrimePlacement(placement){
    const next=String(placement||'').trim().toLowerCase();
    if(next==='right')state.inspectorPanelMode='right';
    else if(next==='float')state.inspectorPanelMode='floating';
    else return false;
    applyInspectorPanelLayout();
    return true;
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

  function showInspectorPanel(bringToFront=false){
    const panel=$('#inspectorPanel');
    if(!panel)return;
    panel.classList.remove('hidden');
    if(state.inspectorPanelMode==='right'){
      applyInspectorPanelLayout();
    }else if(bringToFront){
      panel.style.zIndex='220';
    }
  }

  function toggleInspectorVisibility(){
    const panel=$('#inspectorPanel');
    if(!panel)return;
    panel.classList.toggle('hidden');
    if(state.inspectorPanelMode==='right'){
      const slot=$('#inspectorDockSlot');
      const visible=!panel.classList.contains('hidden');
      slot.classList.toggle('active',visible);
      slot.style.width=visible?`${Math.max(300,state.inspectorDockWidth)}px`:'0px';
      scheduleMainPlotRelayout();
    }
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
    const head=panel.querySelector('.drag-handle');let dragging=false,dx=0,dy=0;
    head.addEventListener('mousedown',e=>{if(e.target.closest('button')||panel.classList.contains('docked')||panel.classList.contains('docked-right'))return;const r=panel.getBoundingClientRect();panel.style.transform='none';panel.style.left=`${r.left}px`;panel.style.top=`${r.top}px`;panel.style.right='auto';panel.style.bottom='auto';dragging=true;dx=e.clientX-r.left;dy=e.clientY-r.top;e.preventDefault();});
    window.addEventListener('mousemove',e=>{if(!dragging)return;panel.style.left=`${Math.max(0,e.clientX-dx)}px`;panel.style.top=`${Math.max(58,e.clientY-dy)}px`;});
    window.addEventListener('mouseup',()=>{
      if(dragging){
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
  $('#openBtn').onclick=importFiles; $('#openProjectBtn').onclick=openProject; $('#saveProjectBtn').onclick=saveProject;
  $('#inspectorDockBtn').onclick=toggleInspectorDock;
  $('#importChooseFilesBtn').onclick=addImportFiles;
  $('#importCloseBtn').onclick=closeImportWorkbench;
  $('#importCancelBtn').onclick=closeImportWorkbench;
  $('#importCommitBtn').onclick=commitImportWorkbench;
  $('#importCheckAllBtn').onclick=()=>{importDraft.files.forEach(f=>f.checked=true);renderImportWorkbench();};
  $('#importUncheckAllBtn').onclick=()=>{importDraft.files.forEach(f=>f.checked=false);renderImportWorkbench();};
  $('#importRemoveBtn').onclick=()=>{
    const active=importActiveItem();
    if(!active)return;
    importDraft.files=importDraft.files.filter(f=>f.path!==active.path);
    importDraft.activePath=importDraft.files[0]?.path||null;
    renderImportWorkbench();
  };
  $('#importResetAutoBtn').onclick=resetCurrentImportAuto;
  $('#importApplyAllBtn').onclick=applyCurrentImportSettingsToAll;

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
    renderImportWorkbench();
  };
  $('#importXCol').onchange=e=>{
    const item=importActiveItem();if(!item)return;
    item.settings.xCol=Number(e.target.value);item.mappingTouched=true;
    item.settings.yCols=(item.settings.yCols||[]).filter(c=>c!==item.settings.xCol);
    renderImportWorkbench();
  };
  $('#importYCol').onchange=e=>updateImportSetting('yCol',Number(e.target.value),{mapping:true});
  $('#importPairStart').onchange=e=>updateImportSetting('pairStart',Number(e.target.value),{mapping:true});
  $('#importVoltageUnit').onchange=e=>updateImportSetting('voltageUnit',e.target.value,{mapping:true});
  $('#importCurrentUnit').onchange=e=>updateImportSetting('currentUnit',e.target.value,{mapping:true});
  $('#importVgMode').onchange=e=>updateImportSetting('vgMode',e.target.value,{mapping:true});
  $('#importManualVg').onchange=e=>updateImportSetting('manualVg',e.target.value===''?null:Number(e.target.value),{mapping:true});
  $('#importYAllBtn').onclick=()=>{
    const item=importActiveItem();if(!item?.inspection)return;
    item.settings.yCols=item.inspection.columns
      .filter(c=>c.index!==Number(item.settings.xCol)&&c.numericFraction>=.5)
      .map(c=>c.index);
    item.mappingTouched=true;
    renderImportWorkbench();
  };
  $('#importYNoneBtn').onclick=()=>{
    const item=importActiveItem();if(!item)return;
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
    $('#lanWebNewKeyBtn').disabled=pendingNoKey||!lanWebStatusState?.running;
    $('#lanWebKeyHint').textContent=pendingNoKey
      ? '应用设置后将关闭 Key；局域网设备可直接访问。'
      : '应用设置后启用 4 位 Key；二维码可自动携带 Key 完成配对。';
  };
  $('#lanWebStopBtn').onclick=async()=>{
    const status=await window.electronAPI.lanWebStop();
    $('#lanWebEnabled').checked=false;
    renderLanWebStatus(status);
  };
  $('#lanWebNewKeyBtn').onclick=async()=>{
    renderLanWebStatus(await window.electronAPI.lanWebRegenerateKey());
  };
  $('#lanWebCopyBaseUrlBtn').onclick=()=>{
    const url=normalizeLanWebBaseUrl(lanWebSelectedBaseUrl);
    if(url)copyTextToClipboard(url,'网页版局域网地址');
  };
  $('#lanWebCopyShareLinkBtn').onclick=()=>{
    const url=lanWebShareUrl();
    if(url)copyTextToClipboard(url,'网页版扫码链接');
  };
  $('#lanWebRefreshQrBtn').onclick=()=>{
    void renderLanWebQr(lanWebStatusState);
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
  const systemUndo=()=>{const edit=window.DKDSPlugins?.edit;if(edit?.activePlugin?.()&&edit.supports?.('undo'))return edit.invoke('undo');setStatus('当前工作区没有可撤销的编辑。');return false;};
  const systemDeselect=()=>{const edit=window.DKDSPlugins?.edit;if(edit?.activePlugin?.()&&edit.supports?.('deselect'))return edit.invoke('deselect');setStatus('当前工作区没有活动选择。');return false;};
  $('#undoBtn').onclick=systemUndo; $('#deselectBtn').onclick=systemDeselect;

  document.querySelectorAll('.analysis-page-close').forEach(b=>b.onclick=()=>closeAnalysisPage(b.dataset.analysisTarget));


  $('#groupDockBtn').onclick=toggleGroupDock;
  $('#groupMinimizeBtn').onclick=toggleGroupMinimize;
  document.querySelectorAll('[data-trend-cols]').forEach(b=>{
    b.onclick=()=>setTrendColumns(b.dataset.trendCols);
  });



  $('#exportMainCsvBtn').onclick=exportCurrentMainCsv;
  $('#copyMainCsvBtn').onclick=()=>{const text=currentMainViewCsvText();if(text)copyTextToClipboard(text,'当前主图数据');else setStatus('当前主图插件没有提供可复制的数据。');};
  $('#exportMainSvgBtn').onclick=exportCurrentMainSvg;
  $('#exportMainPngBtn').onclick=exportCurrentMainPng;
  $('#zoomExportCsv').onclick=()=>{
    if(!state.zoomChart)return;
    window.electronAPI.saveText({defaultName:`${safeName(state.zoomChart.title)}.csv`,content:zoomCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  };
  $('#zoomCopyCsv').onclick=()=>{if(state.zoomChart)copyTextToClipboard(zoomCsvText(),`${state.zoomChart.title} CSV`);};
  $('#zoomExportSvg').onclick=()=>{if(!state.zoomChart)return;Plotly.toImage('zoomPlot',{format:'svg',width:1200,height:800}).then(data=>{const content=decodeURIComponent(data.split(',')[1]);window.electronAPI.saveText({defaultName:`${safeName(state.zoomChart.title)}.svg`,content,filters:[{name:'SVG',extensions:['svg']}]});});};

  window.addEventListener('keydown',e=>{
    if(isTypingTarget(e.target))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveProject();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){e.preventDefault();openProject();return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){e.preventDefault();createProjectTab(null,true);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();systemUndo();return;}
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
    syncSuperWorkspaceDivider();
    scheduleMainPlotRelayout();
    updateTrendLayout(true);
    try{if(!$('#zoomPanel').classList.contains('hidden'))Plotly.Plots.resize($('#zoomPlot'));}catch{}
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
          try{Plotly.Plots.resize($('#zoomPlot'));}catch{}
        }
      }
    });
    panelObserver.observe($('#groupPanel'));
    panelObserver.observe($('#inspectorPanel'));
    panelObserver.observe($('#zoomPanel'));
  }

  async function publishCapabilitySnapshot(){
    if(!window.electronAPI?.publishCapabilitySnapshot)return null;
    const snapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
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
    const capabilitySnapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
    return window.electronAPI.openActivityWindow({
      activityId,
      projectTabId:tab.id,
      title:tab.title,
      projectPath:state.projectPath,
      project:makeProject(),
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
      const capabilitySnapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
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
      if(artifactsChanged)window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{
        type:'merge',pluginId,activityId:payload.activityId||'',artifacts:state.artifactStore.list()
      });
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
      appVersion:'3.58.0',
      platform:window.DKDSPlatform,
      isAuxiliaryWindow:false,
      isWebClient:!!window.electronAPI?.isWebClient,
      getRuntimeStatus:()=>window.electronAPI?.getRuntimeStatus?.(),
      getLanWebStatus:()=>lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),
      openLanWebPanel:showLanWebPanel,
      hideLanWebPanel,
      openActivityWindow:openPluginActivityWindow,
      prepareSuperTransition:preparePluginSuperTransition,
      closeCurrentWindow:()=>window.electronAPI?.closeCurrentWindow?.(),
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
      savePlotlyImage,
      makeFloating,
      artifacts:artifactHostApi(),
      services:{runtime:Object.freeze({getStatus:()=>window.electronAPI?.getRuntimeStatus?.()}),lanWeb:Object.freeze({getStatus:()=>lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),openPanel:showLanWebPanel,hidePanel:hideLanWebPanel})}
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
})();
