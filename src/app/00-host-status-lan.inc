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
    fileDialogOpen:false,
    targets:null,
    scope:null,
    selectionAnchorPath:null,
    columnFieldFilter:''
  };

  function importActiveItem(){
    return importDraft.files.find(f=>f.path===importDraft.activePath)||null;
  }

  function importProviders(){
    return (window.DKDSPlugins?.registry?.values?.('data.importers')||[]).filter(Boolean)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0)||String(a.name||a.id).localeCompare(String(b.name||b.id)));
  }

  function importScope(){
    const scope=importDraft?.scope;
    return scope&&scope.mode==='scoped'?scope:null;
  }

  function importAcceptedTypes(){
    const scope=importScope();
    return Array.isArray(scope?.accepts)?scope.accepts.map(String).filter(Boolean):[];
  }

  function availableImportProviders(){
    const rows=importProviders(),accepted=importAcceptedTypes();
    if(!importScope()||!accepted.length)return rows;
    return rows.filter(provider=>{
      const outputs=Array.isArray(provider?.outputTypes)?provider.outputTypes.map(String):[];
      return outputs.some(type=>accepted.includes(type));
    });
  }

  function importProvider(id=''){
    const key=String(id||'').trim();
    const rows=availableImportProviders();
    return rows.find(provider=>String(provider.id)===key)||rows.find(provider=>provider.id==='flexible-text')||rows[0]||null;
  }

  function flexibleImportProvider(){
    const provider=importProvider('flexible-text');
    if(!provider||provider.id!=='flexible-text')throw new Error('Flexible Text Import 插件未启用。');
    return provider;
  }

  function fileExtension(name=''){
    const match=String(name||'').toLowerCase().match(/\.([^.\/]+)$/);return match?match[1]:'';
  }

  function chooseImportProvider(meta={},targets=ensureImportTargets()){
    const ext=fileExtension(meta?.name||meta?.path||'');
    const context={targets:Array.isArray(targets)?targets.map(String):[]};
    const scored=availableImportProviders().map(provider=>{
      const extensions=Array.isArray(provider.extensions)?provider.extensions.map(x=>String(x).toLowerCase()):[];
      const preferred=Array.isArray(provider.preferredConsumers)?provider.preferredConsumers.map(String):[];
      const outputs=Array.isArray(provider.outputTypes)?provider.outputTypes.map(String):[];
      const targetAccepts=dataConsumerTargets().filter(row=>context.targets.includes(row.id)).flatMap(row=>row.accepts||[]);
      let score=Number(provider.priority)||0;
      if(ext&&extensions.includes(ext))score+=40;
      if(preferred.some(id=>context.targets.includes(id)))score+=500;
      if(outputs.some(type=>targetAccepts.includes(type)))score+=250;
      try{if(typeof provider.score==='function')score+=Number(provider.score(meta,context))||0;}catch{}
      return {provider,score};
    }).sort((a,b)=>b.score-a.score);
    return scored[0]?.provider||null;
  }

  function providerForImportItem(item){
    return importProvider(item?.importerId)||chooseImportProvider(item||{},ensureImportTargets());
  }

  function setStatus(t){
    status.textContent=t;
    window.dispatchEvent(new CustomEvent('dkds:status-changed',{detail:{message:String(t||'')}}));
  }

  function pushArtifactDeltaToActivityWindows(artifactDelta,reason='artifact-change',options={}){
    const upserts=Array.isArray(artifactDelta?.upserts)?artifactDelta.upserts.filter(row=>row?.id):[];
    const removedIds=Array.isArray(artifactDelta?.removedIds)?artifactDelta.removedIds.map(String).filter(Boolean):[];
    if(!upserts.length&&!removedIds.length)return false;
    const tab=activeProjectTab();
    if(!tab?.id||!window.electronAPI?.pushActivityArtifactDelta)return false;
    try{
      window.electronAPI.pushActivityArtifactDelta({projectTabId:tab.id,reason,excludeActivityId:String(options?.excludeActivityId||''),artifactDelta:{upserts,removedIds}});
      return true;
    }catch(err){console.warn('[DKDS owner artifact broadcast]',err);return false;}
  }

  function snapshotArtifactRows(){
    return state.artifactStore?.list?.({includeTransient:true})||[];
  }

  function diffArtifactRows(beforeRows=[],afterRows=snapshotArtifactRows()){
    const before=new Map((beforeRows||[]).filter(row=>row?.id).map(row=>[String(row.id),row]));
    const after=new Map((afterRows||[]).filter(row=>row?.id).map(row=>[String(row.id),row]));
    const upserts=[];
    for(const [id,row] of after){
      const prior=before.get(id);
      const changed=!prior||window.DKDSData?.fingerprintArtifact?.(prior)!==window.DKDSData?.fingerprintArtifact?.(row);
      if(changed)upserts.push(row);
    }
    const removedIds=[...before.keys()].filter(id=>!after.has(id));
    return {upserts,removedIds};
  }

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

    if(status?.localOnly){
      img.classList.add('hidden');
      img.removeAttribute('src');
      placeholder.classList.remove('hidden');
      placeholder.querySelector('small').textContent=status?.running?'仅限本机浏览器':'启动后可在本机浏览器打开';
      hint.textContent='Android 安装包使用本机回环地址，不向局域网暴露服务。';
      badge.textContent='本机回环';
      badge.className='lan-web-mode-badge ready';
      security.textContent='该地址只允许当前 Android 设备访问；网页版在系统浏览器中独立运行，不复用原生壳窗口。';
      return;
    }

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
    const localOnly=!!status.localOnly;
    const panel=$('#lanWebPanel');
    panel?.classList.toggle('native-local-only',localOnly);
    const title=panel?.querySelector('.lan-web-panel-title>span');
    const subtitle=panel?.querySelector('.lan-web-panel-title>small');
    if(title)title.textContent=localOnly?'本机独立网页版':'局域网网页版';
    if(subtitle)subtitle.textContent=localOnly?'在 Android 系统浏览器中运行完整网页版':'手机 / 平板 / 其他电脑扫码或输入地址即可访问';
    $('#lanWebStatusTitle').textContent=localOnly?(running?'本机网页版运行中':'本机网页版未启动'):(running?'网页版服务运行中':'网页版服务未启动');
    $('#lanWebStatusText').textContent=status.error
      ? `启动失败：${status.error}`
      : localOnly
        ? (running?'可随时在系统浏览器中打开独立网页版。':'启动后可在系统浏览器中打开独立网页版。')
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
    $('#lanWebOpenBtn').classList.toggle('hidden',!localOnly);
    $('#lanWebOpenBtn').disabled=!running;
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

  function floatingSafeBounds(panel){
    const margin=10;
    const shellBottom=Math.max(
      58,
      ...['.topbar','.project-tabs-bar','.global-commandbar'].map(selector=>{
        const el=document.querySelector(selector);
        if(!el||el.classList?.contains('hidden'))return 0;
        const r=el.getBoundingClientRect();
        return Number.isFinite(r.bottom)?r.bottom:0;
      })
    );
    const statusTop=$('#statusBar')?.getBoundingClientRect?.().top||window.innerHeight;
    return {left:margin,top:Math.ceil(shellBottom+margin),right:Math.max(margin,window.innerWidth-margin),bottom:Math.max(shellBottom+margin,statusTop-margin)};
  }

  function ensureFloatingPanelVisible(panel,{preferCenter=false}={}){
    if(!panel)return false;
    const bounds=floatingSafeBounds(panel);
    const rect=panel.getBoundingClientRect();
    const width=Math.min(rect.width||panel.offsetWidth||720,Math.max(320,bounds.right-bounds.left));
    const height=Math.min(rect.height||panel.offsetHeight||520,Math.max(220,bounds.bottom-bounds.top));
    const maxLeft=Math.max(bounds.left,bounds.right-width);
    const maxTop=Math.max(bounds.top,bounds.bottom-height);
    const fullyVisible=rect.left>=bounds.left&&rect.top>=bounds.top&&rect.right<=bounds.right&&rect.bottom<=bounds.bottom;
    if(fullyVisible&&!preferCenter)return true;
    const desiredLeft=preferCenter?(bounds.left+Math.max(0,(bounds.right-bounds.left-width)/2)):rect.left;
    const desiredTop=preferCenter?(bounds.top+Math.max(0,(bounds.bottom-bounds.top-height)/2)):rect.top;
    panel.style.transform='none';
    panel.style.right='auto';panel.style.bottom='auto';
    panel.style.left=`${Math.round(Math.min(maxLeft,Math.max(bounds.left,Number.isFinite(desiredLeft)?desiredLeft:bounds.left)))}px`;
    panel.style.top=`${Math.round(Math.min(maxTop,Math.max(bounds.top,Number.isFinite(desiredTop)?desiredTop:bounds.top)))}px`;
    return true;
  }

  async function showLanWebPanel(){
    if(window.electronAPI?.isWebClient)return false;
    const panel=$('#lanWebPanel');
    if(!panel)return false;
    panel.classList.remove('hidden');
    // Dedicated service panels must never reopen underneath the shell toolbar.
    // Respect a user-moved position while it is still visible; otherwise restore
    // a centered, fully reachable position inside the current work area.
    requestAnimationFrame(()=>ensureFloatingPanelVisible(panel,{preferCenter:panel.dataset.dkdsUserMoved!=='1'}));
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
