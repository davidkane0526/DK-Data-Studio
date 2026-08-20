(() => {
  const A = window.Analysis;
  const $ = s => document.querySelector(s);
  const mainSvg = d3.select('#mainPlot');
  const tip = $('#hoverTip');
  const status = $('#statusBarMessage') || $('#statusBar');
  const AUX_ACTIVITY_ID = new URLSearchParams(window.location.search).get('aux') || '';
  const IS_AUXILIARY_WINDOW = !!AUX_ACTIVITY_ID;
  let auxiliaryBootstrapState = null;
  const primePortableState = new Map();

  // v2.4: high-separation categorical palettes. Forward stays cool, reverse stays warm,
  // but adjacent peak orders are deliberately farther apart in hue/lightness.
  const COOL = ['#0057D9','#00A6A6','#6D28D9','#0EA5E9','#1E3A8A','#14B8A6','#7C3AED','#0369A1','#22D3EE','#4338CA','#0F766E','#60A5FA'];
  const WARM = ['#D7191C','#FF7A00','#C2185B','#F2B705','#8B1E3F','#F4511E','#E11D48','#CA8A04','#FF3D00','#A21CAF','#B91C1C','#FB923C'];
  const ALG_GLYPHS = {
    raw:'●',snr:'◆',diff:'▲',detrend:'■',curvature:'✚',matched:'◎',
    dlog:'⬢',dvdi:'◇',resistance:'▼',manual:'★'
  };
  const algNames = {
    raw:'原始 I–V 峰',
    snr:'原始 I–V 局部 SNR',
    diff:'dI/dV 异常',
    detrend:'去背景 Shoulder',
    curvature:'d²I/dV² 曲率',
    matched:'多尺度匹配滤波',
    dlog:'d ln|I|/dV',
    dvdi:'dV/dI',
    resistance:'R=|V/I|',
    manual:'手动'
  };
  const TRANSFORM_OPTIONS = [
    ['raw','原始 I–V'],
    ['detrend','去背景 I−Ibg'],
    ['didv','dI/dV'],
    ['d2idv2','d²I/dV²'],
    ['dlog','d ln|I|/dV'],
    ['dvdi','dV/dI'],
    ['resistance','R=|V/I|']
  ];

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
    // Active project state. Only one project is mounted into these fields at a time.
    datasets: [],
    sweeps: [],
    peaks: [],
    peakCategories: [],
    scanVisibility: new Map(),
    selectedSweepId: null,
    selectedPeakId: null,
    selectedPeakIds: new Set(),
    algorithms: {...A.preset('balanced'),_detectorId:'robust-ricker-v1'},
    peakDisplay:{showRejected:false,showWidth:true,showPoints:true},
    undo: [],
    zoomChart: null,
    trendColumns: loadTrendColumnsPreference(),
    projectPath: null,
    groupPanelMode: 'docked',
    groupPanelCollapsed: false,
    groupPanelDockHeight: 360,
    groupPanelFloatRect: null,
    inspectorPanelMode:'right',
    inspectorDockWidth:390,
    inspectorFloatRect:null,
    physicsShowLabels: true,
    spacingSettings:{seriesA:'',seriesB:'',mode:'abs'},
    spacingResult:[],
    terMaxSettings:{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false},
    terHeatmapDisplay:{colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null},
    terMaxResult:null,
    gateAnalysisSettings:{seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0},
    gateAnalysisResult:null,
    transformPreviewByDataset:new Map(),
    artifactStore:window.DKDSData.createStore(),
    mainRangeSelection:null,
    mainRangeDrag:null,
    mainLayout: {raf:null,lastWidth:0,lastHeight:0,renderToken:0},
    mainView: {xDomain:null,yDomain:null,mode:'select'},

    // Multi-project manager. Each tab owns an isolated copy/reference set of all
    // project data, peaks, visibility, undo history and UI state.
    projectTabs: [],
    activeProjectTabId: null,
    projectTabSeq: 0
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
    const pluginProvider=window.DKDSPlugins?.registry?.find?.(
      'data.importers',
      value=>value?.id==='flexible-text'
    );
    return pluginProvider||{
      id:'legacy-flexible-text',
      inspect:(file,options)=>A.inspectDataText(file,options),
      parse:(file,options)=>A.parseFlexibleData(file,options),
      defaultOptions:()=>A.defaultImportOptions(),
      normalizeOptions:options=>A.normalizeImportOptions(options)
    };
  }

  function createPulseAnalysisState(){
    return {
      files:[],
      activeId:null,
      dialogOpen:false,
      resultScope:'checked'
    };
  }

  let pulseAnalysisState=createPulseAnalysisState();

  function pulseActiveItem(){
    return pulseAnalysisState.files.find(f=>f.id===pulseAnalysisState.activeId)||null;
  }

  function pulseCheckedItems(){
    return pulseAnalysisState.files.filter(f=>f.checked);
  }

  function pulseVisibleResultItems(){
    const active=pulseActiveItem();
    if(pulseAnalysisState.resultScope==='active'){
      return active?.result?[active]:[];
    }
    return pulseAnalysisState.files.filter(f=>f.checked&&f.result);
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

  function sweepById(id){ return state.sweeps.find(s => s.id === id); }
  function peakById(id){ return state.peaks.find(p => p.id === id); }
  function selectedSweep(){ return sweepById(state.selectedSweepId); }
  function selectedPeak(){ return peakById(state.selectedPeakId); }
  function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function csvCell(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
  function safeName(s){ return String(s).replace(/[\\/:*?"<>|]/g,'_'); }
  async function copyTextToClipboard(text,label='数据'){
    const ok=await window.electronAPI.copyText(String(text??''));
    if(ok)setStatus(`${label}已复制到剪贴板，可直接粘贴到 Origin / Excel / 文本编辑器。`);
    return ok;
  }

  function formatI(i){ const a=Math.abs(i); if(a>=1e-3)return `${(i*1e3).toFixed(3)} mA`; if(a>=1e-6)return `${(i*1e6).toFixed(3)} μA`; if(a>=1e-9)return `${(i*1e9).toFixed(3)} nA`; return `${(i*1e12).toFixed(2)} pA`; }
  function directionName(d){ return d>0?'正扫':'反扫'; }
  function defaultPeakLabel(order){ return `峰${Math.max(1,Number(order)||1)}`; }
  function categoryForOrder(order){
    const n=Math.max(1,Math.round(Number(order)||1));
    return state.peakCategories.find(c=>Number(c.order)===n) || {order:n,label:defaultPeakLabel(n)};
  }
  function categoryLabel(order){ return categoryForOrder(order).label || defaultPeakLabel(order); }
  function peakLabel(p){ return categoryLabel(p.peakOrder); }
  function seriesName(p){ return `${directionName(p.direction)}·${peakLabel(p)}`; }

  function ensurePeakCategories(){
    const byOrder=new Map(state.peakCategories.map(c=>[Number(c.order),{order:Number(c.order),label:String(c.label||defaultPeakLabel(c.order))}]));
    for(const p of state.peaks){
      const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
      if(!byOrder.has(order)) byOrder.set(order,{order,label:(p.peakLabel&&!/^自动-/.test(p.peakLabel))?p.peakLabel:defaultPeakLabel(order)});
    }
    state.peakCategories=[...byOrder.values()].sort((a,b)=>a.order-b.order);
  }
  function addPeakCategory(){
    ensurePeakCategories();
    const order=Math.max(0,...state.peakCategories.map(c=>Number(c.order)||0))+1;
    const c={order,label:defaultPeakLabel(order)};
    state.peakCategories.push(c);
    return c;
  }

  function ensureVisibility(path){
    if(!state.scanVisibility.has(path)) state.scanVisibility.set(path,{forward:true,reverse:true});
    return state.scanVisibility.get(path);
  }
  function isSweepVisible(sw){
    const v=ensureVisibility(sw.datasetPath);
    return sw.direction>0 ? !!v.forward : !!v.reverse;
  }
  function visibleSweepIds(){ return state.sweeps.filter(isSweepVisible).map(s=>s.id); }
  function validateSelection(){
    const sw=selectedSweep();
    if(sw && !isSweepVisible(sw)){ state.selectedSweepId=null; state.selectedPeakId=null; }
    const p=selectedPeak();
    if(p){ const ps=sweepById(p.sweepId); if(!ps || !isSweepVisible(ps)) state.selectedPeakId=null; }
  }

  function normalizedDetectionSettings(settings){
    const mode=['strict','balanced','sensitive'].includes(settings?._preset)?settings._preset:'balanced';
    const base=A.preset(mode);
    const out={...base,_preset:settings?._preset||mode,_detectorId:settings?._detectorId||'robust-ricker-v1',_detectorSettings:{...(settings?._detectorSettings||{})}};
    for(const key of ['raw','snr','diff','detrend','curvature','dlog','dvdi','resistance']){
      out[key]={...(base[key]||{}),...(settings?.[key]||{})};
    }
    return out;
  }

  function currentDetectionPreset(){
    return normalizedDetectionSettings(state.algorithms)._preset;
  }

  function peakDetectorProviders(){
    return window.DKDSPlugins?.registry?.values?.('peak.detectors')||[];
  }

  function activePeakDetector(){
    const providers=peakDetectorProviders();
    const wanted=state.algorithms?._detectorId||'robust-ricker-v1';
    const selected=providers.find(p=>p.id===wanted)
      || providers.find(p=>p.default===true)
      || providers[0]
      || null;
    if(selected)return selected;

    // The plugin branch must not silently resurrect a disabled detector.
    // This fallback exists only for extreme compatibility when the plugin
    // runtime itself is unavailable.
    if(!window.DKDSPlugins){
      return {
        id:'legacy-robust-ricker',
        name:'内置兼容寻峰',
        detect:(sweep,settings,options)=>A.detectPeaks(sweep,settings,options),
        presets:['strict','balanced','sensitive']
      };
    }
    return null;
  }

  function detectorSettingsFor(provider){
    const normalized=normalizedDetectionSettings(state.algorithms);
    if(!provider||provider.id==='robust-ricker-v1'||provider.id==='legacy-robust-ricker')return normalized;
    const saved=normalized._detectorSettings?.[provider.id];
    if(saved)return JSON.parse(JSON.stringify(saved));
    if(typeof provider.defaultSettings==='function')return provider.defaultSettings();
    return JSON.parse(JSON.stringify(provider.defaultSettings||{}));
  }

  function detectPeaksViaProvider(sw,options={}){
    const provider=activePeakDetector();
    if(!provider)throw new Error('没有启用的寻峰算法插件。请在“插件”中启用一个 peak.detectors 插件。');
    const settings=detectorSettingsFor(provider);
    if(typeof provider.detect!=='function')throw new Error(`寻峰插件 ${provider.name||provider.id} 没有实现 detect()。`);
    const result=provider.detect(sw,settings,options);
    if(!Array.isArray(result))throw new Error(`寻峰插件 ${provider.name||provider.id} 未返回峰数组。`);
    for(const peak of result){
      if(!peak||typeof peak!=='object')continue;
      peak.detectorId=peak.detectorId||provider.id;
      peak.detectorVersion=peak.detectorVersion||provider.version||'';
      const evidence=provider.evidence?.[peak.primaryAlgorithm]
        ||(provider.channels||[]).find(x=>x.key===peak.primaryAlgorithm)
        ||null;
      if(evidence&&!peak.detectorEvidence){
        peak.detectorEvidence={
          label:evidence.label||peak.primaryAlgorithm||'',
          glyph:evidence.glyph||'●',
          symbol:evidence.symbol||'circle'
        };
      }
    }
    return result;
  }

  function transformName(type){
    return TRANSFORM_OPTIONS.find(([k])=>k===type)?.[1]||'原始 I–V';
  }

  function transformForDataset(path){
    return state.transformPreviewByDataset.get(path)||'raw';
  }

  function colorForPeakOrder(order,direction){
    const n=Math.max(1,Math.round(Number(order)||1));
    const palette=direction>0?COOL:WARM;
    return palette[(n-1)%palette.length];
  }
  function peakAutoColor(p){ return colorForPeakOrder(p.peakOrder,p.direction); }
  // v2.4 single source of truth: main plot + all parameter panels use this exact mapping.
  function peakColor(p){ return colorForPeakOrder(p.peakOrder,p.direction); }
  function pairedTerColors(order){ return {forward:colorForPeakOrder(order,1),reverse:colorForPeakOrder(order,-1)}; }

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
      sweeps:[],
      peaks:[],
      peakCategories:[],
      scanVisibility:new Map(),
      selectedSweepId:null,
      selectedPeakId:null,
      selectedPeakIds:new Set(),
      algorithms:{...A.preset('balanced'),_detectorId:'robust-ricker-v1'},
      peakDisplay:{showRejected:false,showWidth:true,showPoints:true},
      undo:[],
      trendColumns:loadTrendColumnsPreference(),
      projectPath:null,
      groupPanelMode:'docked',
      groupPanelCollapsed:false,
      groupPanelDockHeight:360,
      groupPanelFloatRect:null,
      inspectorPanelMode:'right',
      inspectorDockWidth:390,
      inspectorFloatRect:null,
      physicsShowLabels:true,
      spacingSettings:{seriesA:'',seriesB:'',mode:'abs'},
      spacingResult:[],
      terMaxSettings:{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false},
      terHeatmapDisplay:{colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null},
      terMaxResult:null,
      gateAnalysisSettings:{seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0},
      gateAnalysisResult:null,
      transformPreviewByDataset:new Map(),
      artifactStore:window.DKDSData.createStore(),
      importDraft:{files:[],activePath:null,loading:false,fileDialogOpen:false},
      pulseAnalysisState:createPulseAnalysisState(),
      pluginState:{},
      pendingAuxProject:null,
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
    t.sweeps=state.sweeps;
    t.peaks=state.peaks;
    t.peakCategories=state.peakCategories;
    t.scanVisibility=state.scanVisibility;
    t.selectedSweepId=state.selectedSweepId;
    t.selectedPeakId=state.selectedPeakId;
    t.selectedPeakIds=state.selectedPeakIds;
    t.algorithms=state.algorithms;
    t.peakDisplay={...state.peakDisplay};
    t.undo=state.undo;
    t.trendColumns=state.trendColumns;
    t.projectPath=state.projectPath;
    t.groupPanelMode=state.groupPanelMode;
    t.groupPanelCollapsed=state.groupPanelCollapsed;
    t.groupPanelDockHeight=state.groupPanelDockHeight;
    t.groupPanelFloatRect=state.groupPanelFloatRect;
    t.inspectorPanelMode=state.inspectorPanelMode;
    t.inspectorDockWidth=state.inspectorDockWidth;
    t.inspectorFloatRect=state.inspectorFloatRect;
    t.physicsShowLabels=state.physicsShowLabels;
    t.spacingSettings={...state.spacingSettings};
    t.spacingResult=state.spacingResult;
    t.terMaxSettings={...state.terMaxSettings};
    t.terHeatmapDisplay={...state.terHeatmapDisplay};
    t.terMaxResult=state.terMaxResult;
    t.gateAnalysisSettings={...state.gateAnalysisSettings};
    t.gateAnalysisResult=state.gateAnalysisResult;
    t.transformPreviewByDataset=new Map(state.transformPreviewByDataset);
    t.artifactStore=state.artifactStore;
    t.importDraft=importDraft;
    t.pulseAnalysisState=pulseAnalysisState;
    t.pluginState=window.DKDSPlugins?.project?.serialize?.(t.pluginState||{})||t.pluginState||{};
    t.mainView={...state.mainView,
      xDomain:state.mainView.xDomain?state.mainView.xDomain.slice():null,
      yDomain:state.mainView.yDomain?state.mainView.yDomain.slice():null};
    if(state.projectPath)t.title=projectBaseName(state.projectPath);
  }

  function mountProjectTab(t){
    state.datasets=t.datasets;
    state.sweeps=t.sweeps;
    state.peaks=t.peaks;
    state.peakCategories=t.peakCategories;
    state.scanVisibility=t.scanVisibility instanceof Map?t.scanVisibility:new Map(t.scanVisibility||[]);
    state.selectedSweepId=t.selectedSweepId||null;
    state.selectedPeakId=t.selectedPeakId||null;
    state.selectedPeakIds=t.selectedPeakIds instanceof Set?t.selectedPeakIds:new Set(t.selectedPeakIds||[]);
    state.algorithms=normalizedDetectionSettings(t.algorithms||{...A.preset('balanced'),_detectorId:'robust-ricker-v1'});
    state.peakDisplay={showRejected:false,showWidth:true,showPoints:true,...(t.peakDisplay||{})};
    state.undo=t.undo||[];
    state.trendColumns=loadTrendColumnsPreference();
    state.projectPath=t.projectPath||null;
    state.groupPanelMode=t.groupPanelMode||'docked';
    state.groupPanelCollapsed=!!t.groupPanelCollapsed;
    state.groupPanelDockHeight=Number(t.groupPanelDockHeight)||360;
    state.groupPanelFloatRect=t.groupPanelFloatRect||null;
    state.inspectorPanelMode=t.inspectorPanelMode||'right';
    state.inspectorDockWidth=Number(t.inspectorDockWidth)||390;
    state.inspectorFloatRect=t.inspectorFloatRect||null;
    state.physicsShowLabels=t.physicsShowLabels!==false;
    state.spacingSettings={...(t.spacingSettings||{seriesA:'',seriesB:'',mode:'abs'})};
    state.spacingResult=t.spacingResult||[];
    state.terMaxSettings={...(t.terMaxSettings||{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false})};
    state.terHeatmapDisplay={...(t.terHeatmapDisplay||{colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null})};
    state.terMaxResult=t.terMaxResult||null;
    state.gateAnalysisSettings={...(t.gateAnalysisSettings||{seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0})};
    state.gateAnalysisResult=t.gateAnalysisResult||null;
    state.transformPreviewByDataset=t.transformPreviewByDataset instanceof Map?t.transformPreviewByDataset:new Map(t.transformPreviewByDataset||[]);
    state.artifactStore=t.artifactStore||window.DKDSData.createStore();
    t.artifactStore=state.artifactStore;
    syncLegacyArtifacts({emit:false});
    importDraft=t.importDraft||{files:[],activePath:null,loading:false,fileDialogOpen:false};
    t.importDraft=importDraft;
    pulseAnalysisState=t.pulseAnalysisState||createPulseAnalysisState();
    t.pulseAnalysisState=pulseAnalysisState;
    state.mainView={
      xDomain:t.mainView?.xDomain?t.mainView.xDomain.slice():null,
      yDomain:t.mainView?.yDomain?t.mainView.yDomain.slice():null,
      mode:t.mainView?.mode||'select'
    };
    state.zoomChart=null;
    state.mainRangeSelection=null;
    state.mainRangeDrag=null;
    closeRangeActionMenu();
    syncPhysicsLabelControls();

    // Every project tab owns an isolated snapshot for every registered plugin,
    // not only the historical built-in pulse workspace.
    if(window.DKDSPlugins?.project?.restore){
      // Give every plugin the newly mounted tab's project root as migration/reset
      // context. A missing plugin slice must never mean "keep the previous tab's
      // controller state".
      const tabProject=makeProject();tabProject.plugins=t.pluginState||{};
      window.DKDSPlugins.project.restore(t.pluginState||{},tabProject);
    }
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
    if(t.pendingAuxProject){
      const pending=t.pendingAuxProject;
      t.pendingAuxProject=null;
      loadProjectIntoActive(pending.project,t.projectPath);
      captureActiveProjectTab();
    }
    if($('#showPhysicsLabels'))$('#showPhysicsLabels').checked=state.physicsShowLabels;
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
      const ok=(!t.datasets.length&&!t.peaks.length)||window.confirm('当前是最后一个项目标签页。清空当前项目？');
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
    const hadData=t.datasets.length||t.peaks.length;
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

  // ------------------------------------------------------------------
  // Conservative physical-mechanism analysis
  // ------------------------------------------------------------------
  const PHYSICS_TYPES=A.PHYSICS_TYPES;

  function physicalAnalysis(){
    return A.analyzePhysicalFamilies({
      peaks:state.peaks,
      sweepById,
      peakMetrics:A.peakMetrics,
      labelForOrder:categoryLabel
    });
  }


  const symbolHexagon={
    draw(context,size){
      const r=Math.sqrt(Math.max(size,1)/(3*Math.sqrt(3)/2));
      context.moveTo(r,0);
      for(let k=1;k<6;k++){
        const a=k*Math.PI/3;
        context.lineTo(r*Math.cos(a),r*Math.sin(a));
      }
      context.closePath();
    }
  };
  const symbolKite={
    draw(context,size){
      const r=Math.sqrt(Math.max(size,1));
      context.moveTo(0,-.82*r);
      context.lineTo(.62*r,0);
      context.lineTo(0,.82*r);
      context.lineTo(-.38*r,0);
      context.closePath();
    }
  };
  const symbolTriangleDown={
    draw(context,size){
      const h=Math.sqrt(Math.max(size,1)*4/Math.sqrt(3));
      const r=h/Math.sqrt(3);
      context.moveTo(0,r);
      context.lineTo(-h/2,-r/2);
      context.lineTo(h/2,-r/2);
      context.closePath();
    }
  };

  const NAMED_D3_SYMBOLS={
    circle:d3.symbolCircle,
    diamond:d3.symbolDiamond,
    triangle:d3.symbolTriangle,
    square:d3.symbolSquare,
    cross:d3.symbolCross,
    hexagon:symbolHexagon,
    kite:symbolKite,
    'triangle-down':symbolTriangleDown,
    star:d3.symbolStar
  };

  function detectorProviderById(id){
    const providers=peakDetectorProviders();
    return providers.find(p=>p.id===id)||null;
  }

  function algorithmMetaForPeak(p){
    if(!p)return {key:'unknown',label:'未知证据',glyph:'●',symbol:'circle'};
    if(p.primaryAlgorithm==='manual'){
      return {key:'manual',label:'手动',glyph:'★',symbol:'star'};
    }
    const provider=detectorProviderById(p.detectorId)
      ||activePeakDetector()
      ||peakDetectorProviders()[0]
      ||null;
    const evidence=p.detectorEvidence
      ||provider?.evidence?.[p.primaryAlgorithm]
      ||(provider?.channels||[]).find(x=>x.key===p.primaryAlgorithm)
      ||null;
    return {
      key:p.primaryAlgorithm||'unknown',
      label:evidence?.label||algNames[p.primaryAlgorithm]||p.primaryAlgorithm||'未知证据',
      glyph:evidence?.glyph||ALG_GLYPHS[p.primaryAlgorithm]||'●',
      symbol:evidence?.symbol||A.ALG_SYMBOLS[p.primaryAlgorithm]||'circle'
    };
  }

  function d3SymbolTypeForPeak(p){
    const provider=detectorProviderById(p?.detectorId);
    if(provider&&typeof provider.markerSymbol==='function'){
      try{
        const custom=provider.markerSymbol(p);
        if(typeof custom==='function'||custom?.draw)return custom;
        if(typeof custom==='string'&&NAMED_D3_SYMBOLS[custom])return NAMED_D3_SYMBOLS[custom];
      }catch(err){console.error(`[DKDS detector marker:${provider.id}]`,err);}
    }
    return NAMED_D3_SYMBOLS[algorithmMetaForPeak(p).symbol]||d3.symbolCircle;
  }
  function markerPath(p,selected=false){
    return d3.symbol().type(d3SymbolTypeForPeak(p)).size(selected?180:105)();
  }

  function snapshot(label){
    state.undo.push({
      label,
      peaks: JSON.parse(JSON.stringify(state.peaks)),
      peakCategories: JSON.parse(JSON.stringify(state.peakCategories)),
      scanVisibility: [...state.scanVisibility.entries()].map(([k,v])=>[k,{...v}]),
      datasetVgs: state.datasets.map(d=>[d.path,Number.isFinite(d.vg)?d.vg:null]),
      selectedSweepId: state.selectedSweepId,
      selectedPeakId: state.selectedPeakId,
      selectedPeakIds: [...state.selectedPeakIds]
    });
    if(state.undo.length>100) state.undo.shift();
  }
  function undo(){
    const u=state.undo.pop();
    if(!u)return;
    state.peaks=u.peaks;
    state.peakCategories=u.peakCategories||[];
    state.scanVisibility=new Map(u.scanVisibility);
    if(Array.isArray(u.datasetVgs)){
      const vgMap=new Map(u.datasetVgs);
      for(const d of state.datasets){
        if(vgMap.has(d.path))d.vg=vgMap.get(d.path)===null?NaN:Number(vgMap.get(d.path));
      }
      for(const sw of state.sweeps){
        const d=state.datasets.find(q=>q.path===sw.datasetPath);
        if(d)sw.vg=d.vg;
      }
      for(const p of state.peaks){
        const d=state.datasets.find(q=>q.path===p.datasetPath);
        if(d)p.vg=d.vg;
      }
    }
    state.selectedSweepId=u.selectedSweepId;
    state.selectedPeakId=u.selectedPeakId;
    state.selectedPeakIds=new Set(u.selectedPeakIds||[]);
    renderAll();
    setStatus(`已回退：${u.label}`);
  }
  function deselect(){ closeRangeActionMenu(); state.selectedPeakId=null; state.selectedSweepId=null; state.selectedPeakIds.clear(); renderAll(); }

  function measureMainPlot(){
    const wrap=$('#mainPlotWrap');
    if(!wrap)return null;
    const rect=wrap.getBoundingClientRect();
    const width=Math.round(rect.width);
    const height=Math.round(rect.height);

    // Do not invent a 300px fallback while CSS grid is between layouts.
    // A fabricated temporary aspect ratio is exactly what caused the chart
    // to appear centered in the lower-right / lower part of the SVG.
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<240||height<160){
      return null;
    }
    return {width,height};
  }

  function scheduleMainPlotRelayout({resetDomains=false,statusText=null}={}){
    if(resetDomains){
      state.mainView.xDomain=null;
      state.mainView.yDomain=null;
      state.mainView.mode='select';
      updateMainModeButtons();
    }

    if(state.mainLayout.raf!==null){
      cancelAnimationFrame(state.mainLayout.raf);
      state.mainLayout.raf=null;
    }

    // Two animation frames: first lets grid/docking styles settle, second
    // measures the final content box and draws into that exact box.
    state.mainLayout.raf=requestAnimationFrame(()=>{
      state.mainLayout.raf=requestAnimationFrame(()=>{
        state.mainLayout.raf=null;
        renderMainPlot();
        if(statusText)setStatus(statusText);
      });
    });
  }

  function clearMainView(render=false){
    state.mainView.xDomain=null;
    state.mainView.yDomain=null;
    state.mainView.mode='select';
    updateMainModeButtons();
    if(render)renderMainPlot();
  }
  function syncPhysicsLabelControls(){
    const checked=state.physicsShowLabels!==false;
    const box=$('#showPhysicsLabels');
    const btn=$('#togglePhysicsLabelsBtn');
    if(box)box.checked=checked;
    if(btn){
      btn.classList.toggle('active',checked);
      btn.textContent=checked?'物理标记':'物理标记(关)';
    }
  }

  function togglePhysicsLabels(){
    state.physicsShowLabels=!state.physicsShowLabels;
    syncPhysicsLabelControls();
    captureActiveProjectTab();
    renderMainPlot();
    setStatus(`物理类型文字标记已${state.physicsShowLabels?'显示':'隐藏'}（P 可切换）。`);
  }

  function updateMainModeButtons(){
    const select=$('#mainSelectModeBtn'),zoom=$('#mainBoxZoomBtn'),peaks=$('#mainPeakSelectBtn');
    if(select)select.classList.toggle('active',state.mainView.mode==='select');
    if(zoom)zoom.classList.toggle('active',state.mainView.mode==='boxzoom');
    if(peaks)peaks.classList.toggle('active',state.mainView.mode==='peakselect');
  }
  function setMainMode(mode){
    state.mainView.mode=mode;
    updateMainModeButtons();
    renderMainPlot();
    if(mode==='boxzoom')setStatus('框选放大：在主图中拖出矩形区域；Esc 可取消。');
    else if(mode==='peakselect')setStatus('框选峰：拖矩形选择多个可见峰位点；随后可“锁定所选/解锁所选”。');
    else setStatus('选择模式：点击曲线/峰点，峰点仅在所属曲线被选中时可拖动。');
  }
  function resetMainView(){
    const provider=activeMainViewProvider();
    if(provider?.reset){
      try{return provider.reset({state,container:$('#mainPlotWrap'),svg:mainSvg});}
      catch(err){console.error(`[DKDS main view reset:${provider.id}]`,err);}
    }
    if(!window.DKDSPlugins)return resetResonanceMainView();
    if(provider?.render)return renderMainPlot();
  }

  function resetResonanceMainView(){
    clearMainView(false);

    // Remove stale geometry immediately, then redraw only after the CSS
    // layout has settled. This resets BOTH data domains and SVG geometry.
    mainSvg
      .attr('viewBox',null)
      .attr('preserveAspectRatio',null)
      .attr('width',null)
      .attr('height',null)
      .style('width',null)
      .style('height',null)
      .style('left','0px')
      .style('top','0px')
      .style('transform','none');
    scheduleMainPlotRelayout({
      resetDomains:false,
      statusText:'主图已重新测量画布、重新居中并适应全部当前可见数据。'
    });
  }
  function isTypingTarget(el){
    if(!el)return false;
    const tag=String(el.tagName||'').toLowerCase();
    return ['input','textarea','select'].includes(tag)||el.isContentEditable;
  }
  function orderedVisibleSweeps(){
    return state.sweeps.filter(isSweepVisible).slice().sort((a,b)=>{
      const av=Number.isFinite(a.vg)?a.vg:0,bv=Number.isFinite(b.vg)?b.vg:0;
      if(av!==bv)return av-bv;
      if(a.direction!==b.direction)return b.direction-a.direction; // 正扫在前
      return String(a.id).localeCompare(String(b.id));
    });
  }
  function peakIsInsideCurrentView(p){
    if(!p)return false;
    const xd=state.mainView.xDomain;
    const yd=state.mainView.yDomain;
    if(xd){
      const lo=Math.min(xd[0],xd[1]),hi=Math.max(xd[0],xd[1]);
      if(p.v<lo||p.v>hi)return false;
    }
    if(yd){
      const lo=Math.min(yd[0],yd[1]),hi=Math.max(yd[0],yd[1]);
      if(p.i<lo||p.i>hi)return false;
    }
    return true;
  }

  function visiblePeaksForSweepInCurrentView(sw){
    if(!sw||!state.peakDisplay.showPoints)return []
    const showRejected=!!state.peakDisplay.showRejected;
    return state.peaks
      .filter(p=>p.sweepId===sw.id)
      .filter(p=>p.accepted||showRejected)
      .filter(peakIsInsideCurrentView);
  }

  function autoSelectSinglePeakInCurrentView(sw){
    const candidates=visiblePeaksForSweepInCurrentView(sw);
    if(candidates.length===1){
      const p=candidates[0];
      state.selectedPeakId=p.id;
      state.selectedPeakIds=new Set([p.id]);
      return p;
    }
    state.selectedPeakId=null;
    state.selectedPeakIds.clear();
    return null;
  }

  function switchSelectedSweep(delta){
    const arr=orderedVisibleSweeps();
    if(!arr.length)return;
    let idx=arr.findIndex(sw=>sw.id===state.selectedSweepId);
    if(idx<0)idx=delta>0?-1:0;
    idx=(idx+delta+arr.length)%arr.length;
    state.selectedSweepId=arr[idx].id;
    const autoPeak=autoSelectSinglePeakInCurrentView(arr[idx]);
    renderDatasetList();renderMainPlot();renderInspector();scheduleTrendRender(70);
    if(autoPeak){
      setStatus(`已切换曲线：Vg=${arr[idx].vg} V · ${directionName(arr[idx].direction)}；当前视野仅 1 个峰，已自动选中 ${peakLabel(autoPeak)}，可直接 ←/→ 移动。`);
    }else{
      const n=visiblePeaksForSweepInCurrentView(arr[idx]).length;
      setStatus(`已切换曲线：Vg=${arr[idx].vg} V · ${directionName(arr[idx].direction)}；当前视野有 ${n} 个峰（仅 1 个时会自动选中）。`);
    }
  }
  function shiftPeakWidthWithCenter(p,deltaV,sw){
    const lo=Math.min(...sw.points.map(q=>q.v)),hi=Math.max(...sw.points.map(q=>q.v));
    if(Number.isFinite(p.widthLeft))p.widthLeft=Math.max(lo,Math.min(hi,p.widthLeft+deltaV));
    if(Number.isFinite(p.widthRight))p.widthRight=Math.max(lo,Math.min(hi,p.widthRight+deltaV));
  }
  function movePeakToIndex(p,sw,index){
    const idx=Math.max(0,Math.min(sw.points.length-1,index));
    const pt=sw.points[idx],oldV=p.v;
    p.index=idx;p.v=pt.v;p.i=pt.i;p.manual=true;
    shiftPeakWidthWithCenter(p,p.v-oldV,sw);
  }
  function moveSelectedPeakBy(stepCount){
    const p=selectedPeak();
    if(!p)return false;
    const sw=sweepById(p.sweepId);
    if(!sw||state.selectedSweepId!==p.sweepId)return false;
    if(p.locked){setStatus('该峰位已锁定，无法用方向键移动。');return true;}
    snapshot('方向键移动峰位');
    const current=Number.isFinite(p.index)?p.index:A.nearestIndex(sw.points.map(q=>q.v),p.v);
    movePeakToIndex(p,sw,current+stepCount);
    renderMainPlot();renderInspector();scheduleTrendRender(90);
    setStatus(`峰位移动至 Vd=${p.v.toFixed(6)} V（←/→ 每次 1 点，Shift+←/→ 每次 5 点；Ctrl+←/→ 切换峰）`);
    return true;
  }

  function selectAdjacentPeak(delta){
    let sw=selectedSweep();
    const current=selectedPeak();

    if(!sw && current)sw=sweepById(current.sweepId);
    if(!sw){
      setStatus('请先选中一条曲线或一个峰。');
      return false;
    }

    const peaks=state.peaks
      .filter(p=>p.sweepId===sw.id&&p.accepted)
      .sort((a,b)=>a.v-b.v);

    if(!peaks.length){
      setStatus('当前曲线没有已采纳峰。');
      return false;
    }

    let idx=current&&current.sweepId===sw.id?peaks.findIndex(p=>p.id===current.id):-1;
    if(idx<0)idx=delta>0?-1:0;
    idx=Math.max(0,Math.min(peaks.length-1,idx+delta));
    const p=peaks[idx];

    state.selectedSweepId=sw.id;
    state.selectedPeakId=p.id;
    state.selectedPeakIds=new Set([p.id]);
    closeRangeActionMenu();
    renderAll();
    setStatus(`已选中 ${directionName(p.direction)} · ${peakLabel(p)}：Vd=${p.v.toFixed(6)} V（Ctrl+←/→ 切换峰，←/→ 移动峰位）`);
    return true;
  }

  function deleteSelectedPeaks(reason='删除所选峰'){
    const ids=selectedPeakIdSet();
    if(!ids.size){
      setStatus('当前没有选中的峰。');
      return 0;
    }
    snapshot(reason);
    const before=state.peaks.length;
    state.peaks=state.peaks.filter(p=>!ids.has(p.id));
    const count=before-state.peaks.length;
    state.selectedPeakIds.clear();
    state.selectedPeakId=null;
    state.spacingResult=[];
    state.gateAnalysisResult=null;
    closeRangeActionMenu();
    renderAll();
    refreshOpenAnalysisPage();
    setStatus(`已删除 ${count} 个峰（Ctrl+Z 可回退）。`);
    return count;
  }

  function selectedPeakIdSet(){
    if(state.selectedPeakIds.size)return new Set(state.selectedPeakIds);
    if(state.selectedPeakId)return new Set([state.selectedPeakId]);
    return new Set();
  }

  function lockSelectedPeaks(locked){
    const ids=selectedPeakIdSet();
    if(!ids.size){
      setStatus('没有选中的峰。先点击一个峰，或直接在主图拖框选择多个峰。');
      return;
    }
    snapshot(locked?'锁定多个峰':'解锁多个峰');
    let count=0;
    for(const p of state.peaks){
      if(ids.has(p.id)){p.locked=locked;count++;}
    }
    renderAll();
    setStatus(`${locked?'已锁定':'已解锁'} ${count} 个峰。${locked?'重新寻峰不会改变这些峰的位置、峰宽和类别。':''}`);
  }

  let trendRenderTimer=null;
  function scheduleTrendRender(delay=100){
    clearTimeout(trendRenderTimer);
    trendRenderTimer=setTimeout(()=>renderTrendPanel(),delay);
  }


  function setDatasetVisibility(path,mode,value){
    const v=ensureVisibility(path);
    if(mode==='all'){ v.forward=value; v.reverse=value; }
    else if(mode==='forward') v.forward=value;
    else if(mode==='reverse') v.reverse=value;
    validateSelection();
    clearMainView(false);
  }
  function setAllVisibility(mode){
    snapshot('修改扫描显示');
    for(const ds of state.datasets){
      const v=ensureVisibility(ds.path);
      if(mode==='all'){v.forward=true;v.reverse=true;}
      else if(mode==='forward'){v.forward=true;v.reverse=false;}
      else if(mode==='reverse'){v.forward=false;v.reverse=true;}
      else {v.forward=false;v.reverse=false;}
    }
    validateSelection(); clearMainView(false); renderAll();
  }

  function updateDatasetVg(ds,value){
    const next=String(value??'').trim()===''?NaN:Number(value);
    if(String(value??'').trim()!==''&&!Number.isFinite(next)){
      setStatus('Vg 必须是有效数字，或留空表示未知。');
      renderDatasetList();
      return false;
    }
    const old=ds.vg;
    const same=(Number.isNaN(old)&&Number.isNaN(next))||old===next;
    if(same)return true;

    snapshot('修改数据 Vg');
    ds.vg=next;
    ds.dataProvenance=Array.isArray(ds.dataProvenance)?ds.dataProvenance:[];
    ds.dataProvenance.push(window.DKDSData.provenanceStep({
      type:'manual',label:'Set dataset Vg',providerId:'dataset.set-vg',pluginId:'builtin.resonance-workbench',version:'3.19',manual:true,
      parameters:{old:Number.isFinite(old)?old:null,value:Number.isFinite(next)?next:null},inputs:[ds.path],note:'User-edited gate-voltage metadata in the dataset list.'
    }));

    for(const sw of state.sweeps){
      if(sw.datasetPath===ds.path)sw.vg=next;
    }
    for(const p of state.peaks){
      if(p.datasetPath===ds.path)p.vg=next;
    }

    state.spacingResult=[];
    state.terMaxResult=null;
    state.gateAnalysisResult=null;
    syncLegacyArtifacts();
    renderAll();
    refreshOpenAnalysisPage();
    setStatus(`已将 ${ds.name} 的 Vg 标记为 ${Number.isFinite(next)?`${next} V`:'未知'}。`);
    return true;
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
    if(s.vgMode==='filename')return A.parseVg(item.name,item.text);
    if(s.vgMode==='header')return A.parseVgFromImportHeader(header);
    const h=A.parseVgFromImportHeader(header);
    return Number.isFinite(h)?h:A.parseVg(item.name,item.text);
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

      snapshot('导入数据');
      const sourcePaths=new Set(selected.map(f=>f.path));
      const oldDatasetPaths=new Set(
        state.datasets
          .filter(d=>sourcePaths.has(d.sourcePath||d.path))
          .map(d=>d.path)
      );

      state.datasets=state.datasets.filter(d=>!sourcePaths.has(d.sourcePath||d.path));
      state.peaks=state.peaks.filter(p=>!oldDatasetPaths.has(p.datasetPath));
      for(const oldPath of oldDatasetPaths){
        state.scanVisibility.delete(oldPath);
        state.transformPreviewByDataset.delete(oldPath);
      }

      for(const ds of parsed){
        ds.importedAt=ds.importedAt||new Date().toISOString();
        ds.dataProvenance=Array.isArray(ds.dataProvenance)?ds.dataProvenance:[];
        state.datasets.push(ds);
        state.scanVisibility.set(ds.path,{forward:true,reverse:true});
      }

      rebuildSweeps();
      syncLegacyArtifacts();
      state.spacingResult=[];
      state.terMaxResult=null;
      state.gateAnalysisResult=null;
      clearMainView(false);
      runDetection(false);
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
        `导入完成：${selected.length} 个源文件生成 ${parsed.length} 组数据、${state.sweeps.length} 条完整扫描。`
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

  function syncLegacyArtifacts({emit=true}={}){
    if(!state.artifactStore)state.artifactStore=window.DKDSData.createStore();
    window.DKDSData.syncLegacyDatasetArtifacts(state.artifactStore,state.datasets);
    const tab=activeProjectTab();if(tab)tab.artifactStore=state.artifactStore;
    if(emit)window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{artifacts:state.artifactStore.list()});
    return state.artifactStore;
  }

  function artifactHostApi(){
    return {
      list:options=>state.artifactStore?.list?.(options)||[],
      get:id=>state.artifactStore?.get?.(id)||null,
      add:(artifact,options)=>{const id=state.artifactStore.add(artifact,options);window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'add',artifact:state.artifactStore.get(id)});return id;},
      upsert:artifact=>{const id=state.artifactStore.upsert(artifact);window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'upsert',artifact:state.artifactStore.get(id)});return id;},
      remove:id=>{const ok=state.artifactStore.remove(id);if(ok)window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'remove',id});return ok;},
      syncLegacy:()=>syncLegacyArtifacts(),
      serialize:()=>window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false})
    };
  }

  function rebuildSweeps(){
    state.sweeps=state.datasets.flatMap(ds=>A.buildSweeps(ds));
    state.datasets.forEach(ds=>ensureVisibility(ds.path));
  }

  function assignAutoPeakMetadata(sw,detected){
    detected.sort((a,b)=>a.v-b.v);
    detected.forEach((p,i)=>{
      p.peakOrder=i+1;
      p.peakLabel=defaultPeakLabel(i+1);
      p.customColor=null;
    });
    return detected;
  }
  function normalizePeakMetadata(){
    for(const sw of state.sweeps){
      const arr=state.peaks.filter(p=>p.sweepId===sw.id).sort((a,b)=>a.v-b.v);
      arr.forEach((p,i)=>{
        if(!Number.isFinite(Number(p.peakOrder))) p.peakOrder=i+1;
      });
    }
    ensurePeakCategories();
    for(const p of state.peaks){
      p.peakOrder=Math.max(1,Math.round(Number(p.peakOrder)||1));
      p.peakLabel=categoryLabel(p.peakOrder);
      p.customColor=null; // legacy arbitrary colors are intentionally disabled in v2.4
    }
  }
  function smartAssignPeakOrders({withSnapshot=true,render=true,referenceSweepId=null,status=true}={}){
    const sweeps=state.sweeps.filter(isSweepVisible);
    const rows=sweeps.map(sw=>({
      sw,
      peaks:state.peaks.filter(p=>p.sweepId===sw.id&&p.accepted).sort((a,b)=>a.v-b.v)
    })).filter(r=>r.peaks.length);

    if(!rows.length){
      if(status)setStatus('当前没有可用于智能峰序的已采纳峰。');
      return {changed:0,K:0};
    }

    let minimumK=0;
    for(const p of state.peaks.filter(p=>p.accepted&&(p.orderAnchor||p.locked))){
      minimumK=Math.max(minimumK,Math.max(1,Math.round(Number(p.peakOrder)||1)));
    }

    const requested=referenceSweepId||state.selectedSweepId;
    const requestedSw=requested?sweepById(requested):null;
    const solution=A.solvePeakTracks(rows,{requestedSweep:requestedSw,minimumK});

    if(withSnapshot)snapshot('跨 Vg 智能峰序排序');

    let changed=0,assigned=0;
    for(const row of rows){
      const tracks=solution.assignments.get(row.sw.id);
      if(!tracks)continue;
      row.peaks.forEach((p,j)=>{
        const order=tracks[j]+1;
        if(Number(p.peakOrder)!==order)changed++;
        p.peakOrder=order;
        p.peakLabel=categoryLabel(order);
        p.customColor=null;
        assigned++;
      });
    }

    while(state.peakCategories.length<solution.K)addPeakCategory();
    ensurePeakCategories();
    for(const p of state.peaks){
      if(Number.isFinite(Number(p.peakOrder)))p.peakLabel=categoryLabel(p.peakOrder);
    }

    state.spacingResult=[];
    state.gateAnalysisResult=null;

    if(render){
      renderAll();
      refreshOpenAnalysisPage();
    }
    if(status){
      setStatus(
        `跨 Vg 智能峰序完成：建立 ${solution.K} 条峰轨迹，处理 ${assigned} 个峰，更新 ${changed} 个序号。`
        + `缺失峰会保留编号空位，不会把后面的峰整体前移。峰位/峰宽/锁定状态未改变。`
      );
    }
    return {changed,...solution};
  }


  function changePeakOrderWithCascade(p,newOrder){
    const oldOrder=Math.max(1,Math.round(Number(p.peakOrder)||1));
    newOrder=Math.max(1,Math.round(Number(newOrder)||1));

    const arr=state.peaks
      .filter(q=>q.sweepId===p.sweepId&&q.accepted)
      .sort((a,b)=>a.v-b.v);
    const idx=arr.findIndex(q=>q.id===p.id);
    if(idx<0)return;

    p.peakOrder=newOrder;
    p.orderAnchor=true;
    p.manual=true;

    // Maintain physically ordered labels while preserving intentional gaps.
    // Example: [1,2,3,4], user corrects the second peak 2 -> 3 because peak 2
    // is actually missing. The right side becomes [4,5], giving [1,3,4,5]
    // rather than incorrectly swapping old 3 back to 2.
    let previous=newOrder;
    for(let j=idx+1;j<arr.length;j++){
      const q=arr[j];
      let o=Math.max(1,Math.round(Number(q.peakOrder)||previous+1));
      if(o<=previous)o=previous+1;
      q.peakOrder=o;
      previous=o;
    }

    let next=newOrder;
    for(let j=idx-1;j>=0;j--){
      const q=arr[j];
      let o=Math.max(1,Math.round(Number(q.peakOrder)||Math.max(1,next-1)));
      if(o>=next)o=next-1;
      if(o<1){
        // If the requested label leaves no room on the left, shift the whole
        // current curve upward minimally rather than creating order 0.
        const shift=1-o;
        for(const z of arr)z.peakOrder=Math.max(1,Math.round(Number(z.peakOrder)||1)+shift);
        p.peakOrder=newOrder+shift;
        newOrder=p.peakOrder;
        break;
      }
      q.peakOrder=o;
      next=o;
    }

    ensurePeakCategories();
    const maxOrder=Math.max(...arr.map(q=>Math.max(1,Math.round(Number(q.peakOrder)||1))));
    while(state.peakCategories.length<maxOrder)addPeakCategory();
    for(const q of arr)q.peakLabel=categoryLabel(q.peakOrder);

    // The edited point is a hard anchor. Re-infer the rest of the tracks
    // across gate voltage while preserving gaps and locked anchors.
    smartAssignPeakOrders({withSnapshot:false,render:false,referenceSweepId:p.sweepId,status:false});

    if(oldOrder!==newOrder){
      state.spacingResult=[];
      state.gateAnalysisResult=null;
    }
  }

  function sortPeakOrderByVd(){
    smartAssignPeakOrders({withSnapshot:true,render:true,referenceSweepId:state.selectedSweepId,status:true});
  }


  function runDetection(withSnapshot=true){
    const provider=activePeakDetector();
    if(!provider){
      setStatus('没有启用的寻峰算法插件。请打开“插件”并启用一个寻峰算法。');
      return false;
    }
    if(withSnapshot)snapshot('重新寻峰');

    // Manual peaks always persist. Any locked peak (including an automatic
    // peak) is also immutable across re-detection.
    const preserved=state.peaks.filter(p=>p.manual||p.locked);
    const auto=[];

    for(const sw of state.sweeps){
      const fixed=preserved.filter(p=>p.sweepId===sw.id);
      const tol=Math.max(0.035,2*(sw.step||0.01));
      let det=detectPeaksViaProvider(sw)
        .filter(p=>!fixed.some(q=>Math.abs(q.v-p.v)<=tol))
        .sort((a,b)=>a.v-b.v);

      // Temporary local orders are only seeds. A cross-Vg assignment below
      // resolves missing peaks without renumbering later physical ridges.
      const used=new Set(fixed.map(p=>Math.max(1,Math.round(Number(p.peakOrder)||1))));
      let next=1;
      for(const p of det){
        while(used.has(next))next++;
        p.peakOrder=next;
        p.peakLabel=defaultPeakLabel(next);
        p.customColor=null;
        p.orderAnchor=false;
        used.add(next);
        next++;
      }
      auto.push(...det);
    }

    state.peaks=[...preserved,...auto];
    normalizePeakMetadata();
    smartAssignPeakOrders({withSnapshot:false,render:false,referenceSweepId:state.selectedSweepId,status:false});

    // Remove stale multi-selection IDs that no longer exist.
    const live=new Set(state.peaks.map(p=>p.id));
    state.selectedPeakIds=new Set([...state.selectedPeakIds].filter(id=>live.has(id)));
    if(state.selectedPeakId&&!live.has(state.selectedPeakId))state.selectedPeakId=null;

    state.spacingResult=[];
    state.gateAnalysisResult=null;
    renderAll();
    refreshOpenAnalysisPage();
    const lockedCount=preserved.filter(p=>p.locked).length;
    const avgConfidence=auto.length?auto.reduce((s,p)=>s+(Number(p.confidence)||0),0)/auto.length:0;
    setStatus(`智能寻峰完成（${provider.shortName||provider.name||provider.id}）：新增/更新 ${auto.length} 个候选，保留 ${lockedCount} 个锁定峰；所有自动峰位均已回投影到原始 I–V 采样点。平均置信度 ${(avgConfidence*100).toFixed(0)}%。`);
    return true;
  }

  function peakInsideRange(p,range){
    if(!p||!range)return false;
    return p.v>=range.vMin&&p.v<=range.vMax&&p.i>=range.iMin&&p.i<=range.iMax;
  }

  function rangeTargetSweeps(range=state.mainRangeSelection){
    const scopeId=range?.scopeSweepId||null;
    const sw=scopeId?sweepById(scopeId):null;
    if(sw&&isSweepVisible(sw))return [sw];
    return state.sweeps.filter(isSweepVisible);
  }

  function closeRangeActionMenu(){
    const menu=$('#selectionActionMenu');
    if(menu)menu.classList.add('hidden');
    state.mainRangeSelection=null;
    try{mainSvg.selectAll('.persisted-range-box').remove();}catch{}
  }

  function selectPeaksInRange(range){
    const ids=[];
    for(const p of state.peaks){
      const sw=sweepById(p.sweepId);
      if(!sw||!isSweepVisible(sw))continue;
      if(!p.accepted&&!state.peakDisplay.showRejected)continue;
      if(peakInsideRange(p,range))ids.push(p.id);
    }
    state.selectedPeakIds=new Set(ids);

    if(ids.length===1){
      const p=peakById(ids[0]);
      state.selectedPeakId=p?.id||null;
      state.selectedSweepId=p?.sweepId||state.selectedSweepId;
    }else{
      state.selectedPeakId=null;
      const sweepIds=[...new Set(ids.map(id=>peakById(id)?.sweepId).filter(Boolean))];
      if(sweepIds.length===1)state.selectedSweepId=sweepIds[0];
    }
    return ids;
  }

  function applyUnifiedPeakIdentityToSelection(orderValue,labelValue){
    const ids=selectedPeakIdSet();
    if(!ids.size){
      setStatus('框选区域中没有峰可统一设置。');
      return;
    }
    const order=Math.max(1,Math.round(Number(orderValue)||1));
    const label=String(labelValue||'').trim()||categoryLabel(order);

    snapshot('统一框选峰序与标签');

    while(state.peakCategories.length<order)addPeakCategory();
    let category=state.peakCategories.find(c=>Number(c.order)===order);
    if(!category){
      category={order,label};
      state.peakCategories.push(category);
    }
    category.label=label;

    let count=0;
    for(const id of ids){
      const p=peakById(id);
      if(!p)continue;
      p.peakOrder=order;
      p.peakLabel=label;
      p.orderAnchor=true;
      p.manual=true;
      p.customColor=null;
      count++;
    }

    // Category labels are category-wide by design.
    for(const p of state.peaks.filter(p=>Number(p.peakOrder)===order))p.peakLabel=label;
    ensurePeakCategories();
    state.spacingResult=[];
    state.gateAnalysisResult=null;
    closeRangeActionMenu();
    renderAll();
    refreshOpenAnalysisPage();
    setStatus(`已将 ${count} 个框选峰统一设为 峰序 ${order} / 标签“${label}”；这些点作为跨 Vg 峰轨迹 anchor。`);
  }

  function activeSelectionMenuProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    return (window.DKDSPlugins?.registry?.values?.('ui.selectionMenus')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
  }

  function openRangeActionMenu(range,clientX,clientY){
    // Selection geometry belongs to the canvas host; all visible actions and
    // labels belong to the active plugin through ui.selectionMenus.
    const scopeSweepId=state.selectedSweepId||null;
    state.mainRangeSelection={...range,scopeSweepId};
    const ids=selectPeaksInRange(range);
    const targets=rangeTargetSweeps(state.mainRangeSelection);
    const wrap=$('#mainPlotWrap');
    const menu=$('#selectionActionMenu');
    const provider=activeSelectionMenuProvider();
    if(!menu||!provider){
      menu?.classList.add('hidden');
      renderMainPlot();renderInspector();renderDatasetList();
      return;
    }

    ensurePeakCategories();
    const selectedPeaks=ids.map(id=>peakById(id)).filter(Boolean);
    const firstOrder=Math.max(1,Math.round(Number(selectedPeaks[0]?.peakOrder)||1));
    const maxOrder=Math.max(firstOrder,...state.peakCategories.map(c=>Number(c.order)||0),1);
    while(state.peakCategories.length<maxOrder)addPeakCategory();
    const selectedSweepBeforeBox=scopeSweepId?sweepById(scopeSweepId):null;
    const scopeText=selectedSweepBeforeBox
      ? `当前凸显曲线：Vg=${selectedSweepBeforeBox.vg} V · ${directionName(selectedSweepBeforeBox.direction)}`
      : `全部 ${targets.length} 条可见曲线`;

    menu.innerHTML='';
    try{
      provider.render?.({
        container:menu,
        selection:{
          range:{...range},
          peakIds:ids.slice(),
          peakCount:ids.length,
          targetSweepIds:targets.map(sw=>sw.id),
          targetCount:targets.length,
          scopeSweepId,
          scopeText,
          firstOrder,
          categories:state.peakCategories.map(c=>({...c}))
        },
        context:pluginUiContext(),
        host:window.DKDSPlugins?.host
      });
    }catch(err){
      console.error(`[DKDS selection menu:${provider.id}]`,err);
      menu.innerHTML=`<div class="range-action-summary">插件菜单渲染失败：${escapeHtml(err.message||String(err))}</div>`;
    }
    menu.classList.remove('hidden');
    const wr=wrap.getBoundingClientRect();
    requestAnimationFrame(()=>{
      const mr=menu.getBoundingClientRect();
      const left=Math.max(6,Math.min(wr.width-mr.width-6,clientX-wr.left+8));
      const top=Math.max(52,Math.min(wr.height-mr.height-6,clientY-wr.top+8));
      menu.style.left=`${left}px`;
      menu.style.top=`${top}px`;
    });

    renderMainPlot();
    renderInspector();
    renderDatasetList();
  }

  function runLocalDetectionInRange(){
    const range=state.mainRangeSelection;
    if(!range){
      setStatus('当前没有框选区域。直接在主图拖框后选择“局部寻峰”。');
      return;
    }

    const targets=rangeTargetSweeps(range);
    if(!targets.length){
      setStatus('当前没有可进行局部寻峰的曲线。');
      return;
    }

    const provider=activePeakDetector();
    if(!provider){
      setStatus('没有启用的寻峰算法插件，无法执行局部寻峰。');
      return false;
    }

    snapshot('框选区域局部寻峰');

    const targetIds=new Set(targets.map(sw=>sw.id));
    const oldPeaks=state.peaks.slice();

    // Outside the rectangle is untouched. Manual/locked peaks inside the
    // rectangle are also immutable.
    const preserved=oldPeaks.filter(p=>
      !targetIds.has(p.sweepId) ||
      !peakInsideRange(p,range) ||
      p.manual ||
      p.locked
    );

    const found=[];
    for(const sw of targets){
      const fixed=preserved.filter(p=>p.sweepId===sw.id);
      const oldInside=oldPeaks.filter(p=>p.sweepId===sw.id&&peakInsideRange(p,range));
      const tol=Math.max(0.030,2*Math.abs(sw.step||0.01));

      let det=detectPeaksViaProvider(sw,{range})
        .filter(p=>!fixed.some(q=>Math.abs(q.v-p.v)<=tol))
        .sort((a,b)=>a.v-b.v);

      // If an old unlocked auto peak existed nearby, use its order only as a
      // seed. The cross-Vg tracker below decides the final physical identity.
      for(const p of det){
        const old=oldInside
          .filter(q=>Number.isFinite(Number(q.peakOrder)))
          .sort((a,b)=>Math.abs(a.v-p.v)-Math.abs(b.v-p.v))[0];
        if(old&&Math.abs(old.v-p.v)<=Math.max(0.08,4*Math.abs(sw.step||0.01))){
          p.peakOrder=old.peakOrder;
          p.peakLabel=categoryLabel(old.peakOrder);
        }else{
          p.peakOrder=null;
          p.peakLabel='';
        }
        p.orderAnchor=false;
      }
      found.push(...det);
    }

    state.peaks=[...preserved,...found];
    normalizePeakMetadata();
    smartAssignPeakOrders({
      withSnapshot:false,
      render:false,
      referenceSweepId:state.selectedSweepId,
      status:false
    });

    const newIds=found.map(p=>p.id);
    state.selectedPeakIds=new Set(newIds);
    if(newIds.length===1){
      state.selectedPeakId=newIds[0];
      state.selectedSweepId=peakById(newIds[0])?.sweepId||state.selectedSweepId;
    }else{
      state.selectedPeakId=null;
    }

    state.spacingResult=[];
    state.gateAnalysisResult=null;
    closeRangeActionMenu();
    renderAll();
    refreshOpenAnalysisPage();

    const avg=found.length?found.reduce((s,p)=>s+(Number(p.confidence)||0),0)/found.length:0;
    setStatus(
      `局部寻峰完成：仅重新分析框选区域，得到 ${found.length} 个自动峰；`
      + `框外、手动峰和锁定峰未改变。平均置信度 ${(avg*100).toFixed(0)}%。`
    );
  }

  function renderAll(){
    validateSelection();
    renderProjectTabs();
    renderDatasetList();
    renderMainPlot();
    renderInspector();
    renderTrendPanel();
    window.DKDSPlugins?.events?.emit?.('workspace:render',{context:pluginUiContext()});
  }

  function selectSweepFromMain(sw,{openInspector=true}={}){
    if(!sw)return false;
    closeRangeActionMenu();
    state.selectedSweepId=sw.id;
    state.selectedPeakId=null;
    state.selectedPeakIds.clear();
    if(openInspector)showInspectorPanel();
    renderAll();
    return true;
  }

  function nearestSweepAtPixel(px,py,x,y,visibleSweeps,maxDistancePx=16){
    if(!visibleSweeps?.length)return null;
    const targetV=x.invert(px);
    let best=null;
    for(const sw of visibleSweeps){
      const xs=sw.points.map(p=>p.v);
      const idx=A.nearestIndex(xs,targetV);
      for(let j=Math.max(0,idx-2);j<=Math.min(sw.points.length-1,idx+2);j++){
        const p=sw.points[j];
        const dx=x(p.v)-px,dy=y(p.i)-py;
        const dist=Math.hypot(dx,dy);
        if(!best||dist<best.distance)best={sw,point:p,index:j,distance:dist};
      }
    }
    return best&&best.distance<=maxDistancePx?best:null;
  }

  function handleCurveClick(event,sw,x){
    event.stopPropagation();
    closeRangeActionMenu();
    if(event.ctrlKey){
      event.preventDefault();
      state.selectedSweepId=sw.id;
      state.selectedPeakId=null;
      state.selectedPeakIds.clear();
      addManualPeak(sw,d3.pointer(event,mainSvg.node())[0],x);
      showInspectorPanel();
      return;
    }
    selectSweepFromMain(sw,{openInspector:true});
  }

  function scaleDomainAround(domain,center,factor,minSpan=1e-12){
    const lo=center+(domain[0]-center)*factor;
    const hi=center+(domain[1]-center)*factor;
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||Math.abs(hi-lo)<minSpan)return domain.slice();
    return [lo,hi];
  }

  function renderMainLegend(curveColor){
    const host=$('#mainLegendBar');
    if(!host)return;
    host.innerHTML='';
    const visible=state.datasets.filter(d=>{
      const v=ensureVisibility(d.path);
      return v.forward||v.reverse;
    });
    const current=selectedSweep();
    const selectedPath=current?.datasetPath||null;

    for(const ds of visible){
      const vis=ensureVisibility(ds.path);
      const sws=state.sweeps.filter(s=>s.datasetPath===ds.path&&isSweepVisible(s));
      const preferred=current?.datasetPath===ds.path
        ? current
        : (sws.find(s=>s.direction>0)||sws[0]);
      const chip=document.createElement('button');
      chip.type='button';
      chip.className='main-legend-chip';
      if(selectedPath===ds.path)chip.setAttribute('aria-current','true');
      const color=curveColor(Number.isFinite(ds.vg)?ds.vg:0);
      const dirClass=preferred?.direction<0?'reverse':'';
      chip.innerHTML=`<i class="main-legend-line ${dirClass}" style="color:${color}"></i><span>${Number.isFinite(ds.vg)?ds.vg:'?'} V</span>`;
      chip.title=`${ds.name}${preferred?` · ${directionName(preferred.direction)}`:''}`;
      chip.onclick=e=>{
        e.stopPropagation();
        if(preferred)selectSweepFromMain(preferred,{openInspector:true});
      };
      host.appendChild(chip);
    }
  }

  function activeMainViewProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const providers=window.DKDSPlugins?.registry?.values?.('ui.mainViews')||[];
    return providers
      .filter(p=>!p.activity||!activityId||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
  }

  function renderEmptyMainView(message='当前工作区没有提供主图视图'){
    const host=$('#mainLegendBar');
    if(host)host.innerHTML='';
    try{
      mainSvg.on('click',null).on('dblclick',null).on('wheel.mainzoom',null);
      mainSvg.selectAll('*').remove();
      const size=measureMainPlot();
      if(size){
        mainSvg.attr('viewBox',null).attr('preserveAspectRatio',null)
          .attr('width',size.width).attr('height',size.height)
          .style('width',`${size.width}px`).style('height',`${size.height}px`);
        mainSvg.append('text')
          .attr('x',size.width/2).attr('y',size.height/2)
          .attr('text-anchor','middle').attr('class','empty-main-view')
          .text(message);
      }
    }catch{}
  }

  function renderMainPlot(){
    const provider=activeMainViewProvider();
    if(provider?.render){
      try{
        return provider.render({
          container:$('#mainPlotWrap'),
          svg:mainSvg,
          state,
          activityId:window.DKDSPlugins?.activities?.active?.()||null
        });
      }catch(err){
        console.error(`[DKDS main view:${provider.id}]`,err);
        renderEmptyMainView(`主图插件 ${provider.title||provider.id} 渲染失败`);
        return;
      }
    }
    if(!window.DKDSPlugins)return renderResonanceMainPlot();
    renderEmptyMainView();
  }

  function renderResonanceMainPlot(){
    const wrap=$('#mainPlotWrap');
    const size=measureMainPlot();

    // During docking/undocking Electron can briefly report zero height.
    // Never draw against that transient state; wait for the next stable frame.
    if(!size){
      scheduleMainPlotRelayout();
      return;
    }

    const {width,height}=size;
    state.mainLayout.lastWidth=width;
    state.mainLayout.lastHeight=height;
    state.mainLayout.renderToken+=1;

    mainSvg.on('click',null).on('dblclick',null).on('wheel.mainzoom',null);

    // v2.8: do NOT use viewBox at all.
    // The SVG viewport and D3 user coordinates are both the measured CSS
    // pixels of mainPlotWrap. This removes the entire class of stale-viewBox
    // / aspect-ratio / letterboxing bugs that previously pushed the chart
    // into the lower-right corner.
    mainSvg
      .attr('viewBox',null)
      .attr('preserveAspectRatio',null)
      .attr('width',width)
      .attr('height',height)
      .style('position','absolute')
      .style('left','0px')
      .style('top','0px')
      .style('right','auto')
      .style('bottom','auto')
      .style('width',`${width}px`)
      .style('height',`${height}px`)
      .style('margin','0')
      .style('padding','0')
      .style('transform','none');

    mainSvg.selectAll('*').remove();
    updateMainModeButtons();

    const visibleSweeps=state.sweeps.filter(isSweepVisible);
    if(!visibleSweeps.length){
      if($('#mainLegendBar'))$('#mainLegendBar').innerHTML='';
      mainSvg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('fill','#6b7280').text('请勾选要显示的正扫/反扫数据');
      return;
    }

    const margin={top:78,right:30,bottom:50,left:78};
    const innerW=Math.max(50,width-margin.left-margin.right),innerH=Math.max(50,height-margin.top-margin.bottom);
    const xs=visibleSweeps.flatMap(s=>s.points.map(p=>p.v));
    const ys=visibleSweeps.flatMap(s=>s.points.map(p=>p.i));
    const fullX=d3.extent(xs);
    let [fy0,fy1]=d3.extent(ys); const ypad=(fy1-fy0||1)*.06; const fullY=[fy0-ypad,fy1+ypad];

    let xDomain=state.mainView.xDomain?state.mainView.xDomain.slice():d3.scaleLinear().domain(fullX).nice().domain();
    let yDomain=state.mainView.yDomain?state.mainView.yDomain.slice():d3.scaleLinear().domain(fullY).nice().domain();
    if(!xDomain.every(Number.isFinite)||xDomain[0]===xDomain[1])xDomain=fullX.slice();
    if(!yDomain.every(Number.isFinite)||yDomain[0]===yDomain[1])yDomain=fullY.slice();

    const x=d3.scaleLinear().domain(xDomain).range([margin.left,margin.left+innerW]);
    const y=d3.scaleLinear().domain(yDomain).range([margin.top+innerH,margin.top]);
    state.mainPlotContext={margin,innerW,innerH,width,height,x,y,clipId:'mainDataClip'};

    const defs=mainSvg.append('defs');
    defs.append('clipPath').attr('id','mainDataClip').append('rect')
      .attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH);

    const plotBg=mainSvg.append('rect').attr('x',margin.left).attr('y',margin.top).attr('width',innerW).attr('height',innerH)
      .attr('fill','#fff').attr('stroke','#edf0f5')
      .style('cursor','crosshair')
      .on('dblclick',event=>{ if(!event.ctrlKey)resetMainView(); });

    mainSvg.append('g').attr('class','axis').attr('transform',`translate(0,${margin.top+innerH})`).call(d3.axisBottom(x));
    mainSvg.append('g').attr('class','axis').attr('transform',`translate(${margin.left},0)`).call(d3.axisLeft(y).tickFormat(v=>{const a=Math.abs(v);return a>=1e-6?`${(v*1e6).toFixed(1)}μA`:a>=1e-9?`${(v*1e9).toFixed(1)}nA`:`${(v*1e12).toFixed(0)}pA`;}));
    mainSvg.append('text').attr('x',margin.left+innerW/2).attr('y',height-10).attr('text-anchor','middle').text('Vd (V)');
    mainSvg.append('text').attr('transform',`translate(18,${margin.top+innerH/2}) rotate(-90)`).attr('text-anchor','middle').text('I (A)');

    const vgValues=state.datasets.map(d=>Number.isFinite(d.vg)?d.vg:0);
    let vgExtent=d3.extent(vgValues); if(vgExtent[0]===vgExtent[1])vgExtent=[vgExtent[0]-1,vgExtent[1]+1];
    const curveColor=d3.scaleSequential(d3.interpolateTurbo).domain(vgExtent);
    const line=d3.line().defined(d=>Number.isFinite(d.v)&&Number.isFinite(d.i)).x(d=>x(d.v)).y(d=>y(d.i));
    const hasSelection=!!state.selectedSweepId;
    const dataLayer=mainSvg.append('g').attr('clip-path','url(#mainDataClip)');

    for(const sw of visibleSweeps){
      const selected=sw.id===state.selectedSweepId;
      const c=curveColor(Number.isFinite(sw.vg)?sw.vg:0);
      dataLayer.append('path').datum(sw.points)
        .attr('class',`curve ${hasSelection&&!selected?'dimmed':''}`)
        .attr('d',line).attr('stroke',c)
        .attr('stroke-width',selected?3.0:1.25)
        .attr('stroke-dasharray',sw.direction<0?'7 4':null)
        .attr('opacity',hasSelection?(selected?1:.10):.74)
        .style('pointer-events','none');

      dataLayer.append('path').datum(sw.points)
        .attr('class','curve-hit')
        .attr('d',line)
        .on('click',event=>handleCurveClick(event,sw,x))
        .on('dblclick',event=>{
          event.preventDefault();
          event.stopPropagation();
          selectSweepFromMain(sw,{openInspector:true});
        });
    }

    renderMainLegend(curveColor);

    if(state.peakDisplay.showPoints){
      const peakData=state.peaks.filter(p=>{
        const sw=sweepById(p.sweepId);
        return sw&&isSweepVisible(sw)&&(p.accepted||state.peakDisplay.showRejected);
      });
      const marks=dataLayer.append('g').selectAll('path.peak-point').data(peakData,d=>d.id).join('path')
        .attr('class',d=>`peak-point ${d.locked?'locked':''} ${state.selectedPeakIds.has(d.id)?'multi-selected':''} ${d.sweepId===state.selectedSweepId?'editable':'inactive'} ${hasSelection&&d.sweepId!==state.selectedSweepId?'dimmed':''}`)
        .attr('d',d=>markerPath(d,d.id===state.selectedPeakId||state.selectedPeakIds.has(d.id)))
        .attr('transform',d=>`translate(${x(d.v)},${y(d.i)})`)
        .attr('fill',d=>peakColor(d))
        .attr('stroke',d=>state.selectedPeakIds.has(d.id)?'#111827':(d.accepted?'#fff':'#6b7280'))
        .attr('stroke-width',d=>(d.id===state.selectedPeakId||state.selectedPeakIds.has(d.id))?3.2:1.8)
        .attr('opacity',d=>{
          let op=d.accepted?.98:.34;
          if(hasSelection&&d.sweepId!==state.selectedSweepId)op*=.11;
          return op;
        })
        .style('pointer-events','none');

      // Separate display marker from a larger mouse target. This lets one
      // element reliably support click/double-click/drag at the same time.
      const peakHits=dataLayer.append('g').selectAll('circle.peak-hit-target').data(peakData,d=>d.id).join('circle')
        .attr('class',d=>`peak-hit-target ${d.locked?'locked':''} ${d.sweepId===state.selectedSweepId?'editable':''}`)
        .attr('cx',d=>x(d.v)).attr('cy',d=>y(d.i))
        .attr('r',d=>{
          const base=window.DKDSPlatform?.profile?.interaction?.peakHitRadiusPx||10;
          return (d.id===state.selectedPeakId||state.selectedPeakIds.has(d.id))?base+2:base;
        })
        .on('click',(event,d)=>{
          event.stopPropagation();
          closeRangeActionMenu();
          state.selectedSweepId=d.sweepId;
          state.selectedPeakId=d.id;
          state.selectedPeakIds=new Set([d.id]);
          showInspectorPanel();
          renderAll();
          setStatus(`已选中 ${directionName(d.direction)} · ${peakLabel(d)}；可直接用 ←/→ 移动，Ctrl+←/→ 切换峰。`);
        })
        .on('dblclick',(event,d)=>{
          event.preventDefault();
          event.stopPropagation();
          state.selectedSweepId=d.sweepId;
          state.selectedPeakId=d.id;
          state.selectedPeakIds=new Set([d.id]);
          showInspectorPanel(true);
          renderAll();
          setStatus(`已打开曲线检查器：${directionName(d.direction)} · ${peakLabel(d)}`);
        })
        .on('contextmenu',(event,d)=>{
          if(!event.ctrlKey)return;
          event.preventDefault();
          event.stopPropagation();
          snapshot('Ctrl+右键删除峰');
          state.peaks=state.peaks.filter(q=>q.id!==d.id);
          state.selectedPeakIds.delete(d.id);
          if(state.selectedPeakId===d.id)state.selectedPeakId=null;
          state.selectedSweepId=d.sweepId;
          renderAll();
          setStatus(`已删除 ${directionName(d.direction)} · ${peakLabel(d)}（Ctrl+Z 可回退）`);
        })
        .on('mouseenter',(event,d)=>showPeakTip(event,d))
        .on('mousemove',moveTip)
        .on('mouseleave',hideTip);

      peakHits.call(d3.drag().clickDistance(window.DKDSPlatform?.profile?.interaction?.dragThresholdPx||7)
        .filter(event=>event.button===0&&!event.ctrlKey)
        .on('start',(event,d)=>{
          if(d.locked)return;
          state.selectedSweepId=d.sweepId;
          state.selectedPeakId=d.id;
          state.selectedPeakIds=new Set([d.id]);
          showInspectorPanel();
          snapshot('移动峰位');
        })
        .on('drag',(event,d)=>{
          if(d.locked)return;
          const sw=sweepById(d.sweepId);
          if(!sw)return;
          const target=x.invert(event.x);
          const idx=A.nearestIndex(sw.points.map(p=>p.v),target);
          movePeakToIndex(d,sw,idx);
          peakHits.filter(q=>q.id===d.id).attr('cx',x(d.v)).attr('cy',y(d.i));
          marks.filter(q=>q.id===d.id).attr('transform',`translate(${x(d.v)},${y(d.i)})`);
          renderInspector();
        })
        .on('end',(event,d)=>{
          if(!d.locked)renderAll();
        }));

      if(state.physicsShowLabels){
        const ph=physicalAnalysis();
        const typeColor={R:'#167d4a',H:'#7c3aed',D:'#d97706',X:'#b91c1c',Q:'#64748b'};
        dataLayer.append('g').selectAll('text.physics-type-label')
          .data(peakData.filter(p=>p.accepted),d=>d.id)
          .join('text')
          .attr('class',d=>`physics-type-label ${hasSelection&&d.sweepId!==state.selectedSweepId?'dimmed':''}`)
          .attr('x',d=>x(d.v)+8)
          .attr('y',d=>y(d.i)-8)
          .attr('opacity',d=>hasSelection?(d.sweepId===state.selectedSweepId?1:.08):.92)
          .attr('fill',d=>typeColor[ph.peakMap.get(d.id)?.code||'Q'])
          .text(d=>{
            const code=ph.peakMap.get(d.id)?.code||'Q';
            return code==='Q'?'?':code;
          });
      }
    }

    const sp=selectedPeak();
    if(sp&&state.peakDisplay.showWidth&&sp.accepted){
      const sw=sweepById(sp.sweepId); if(sw&&isSweepVisible(sw))drawWidthOverlay(sp,sw,x,y,{margin,innerW,innerH,clipId:'mainDataClip'});
    }

    // v3.7: direct box interaction. No mode button is required.
    // Plain drag = select a physical plot region and open an action menu.
    // Ctrl + drag = zoom. A simple background click deselects.
    plotBg.on('pointerdown',event=>{
      if(event.button!==0)return;
      closeRangeActionMenu();

      const node=plotBg.node();
      const [px,py]=d3.pointer(event,mainSvg.node());
      const sx=Math.max(margin.left,Math.min(margin.left+innerW,px));
      const sy=Math.max(margin.top,Math.min(margin.top+innerH,py));
      const zoom=!!event.ctrlKey;

      state.mainRangeDrag={
        pointerId:event.pointerId,
        sx,sy,
        ex:sx,ey:sy,
        zoom,
        moved:false,
        clientX:event.clientX,
        clientY:event.clientY
      };

      try{node.setPointerCapture(event.pointerId);}catch{}
      event.preventDefault();
    });

    plotBg.on('pointermove',event=>{
      const drag=state.mainRangeDrag;
      if(!drag||drag.pointerId!==event.pointerId)return;

      const [px,py]=d3.pointer(event,mainSvg.node());
      drag.ex=Math.max(margin.left,Math.min(margin.left+innerW,px));
      drag.ey=Math.max(margin.top,Math.min(margin.top+innerH,py));
      drag.clientX=event.clientX;
      drag.clientY=event.clientY;
      drag.moved=drag.moved||Math.hypot(drag.ex-drag.sx,drag.ey-drag.sy)>=5;

      mainSvg.selectAll('.direct-interaction-box').remove();
      mainSvg.append('rect')
        .attr('class',`direct-interaction-box ${drag.zoom?'direct-zoom-box':'direct-range-box'}`)
        .attr('x',Math.min(drag.sx,drag.ex))
        .attr('y',Math.min(drag.sy,drag.ey))
        .attr('width',Math.abs(drag.ex-drag.sx))
        .attr('height',Math.abs(drag.ey-drag.sy));

      event.preventDefault();
    });

    const finishRangeDrag=event=>{
      const drag=state.mainRangeDrag;
      if(!drag||drag.pointerId!==event.pointerId)return;
      state.mainRangeDrag=null;
      mainSvg.selectAll('.direct-interaction-box').remove();
      try{plotBg.node().releasePointerCapture(event.pointerId);}catch{}

      if(!drag.moved){
        const nearby=nearestSweepAtPixel(drag.sx,drag.sy,x,y,visibleSweeps,window.DKDSPlatform?.profile?.interaction?.nearestCurvePx||18);
        if(nearby){
          if(drag.zoom){
            state.selectedSweepId=nearby.sw.id;
            state.selectedPeakId=null;
            state.selectedPeakIds.clear();
            addManualPeak(nearby.sw,drag.sx,x);
            showInspectorPanel();
          }else{
            selectSweepFromMain(nearby.sw,{openInspector:true});
          }
        }else if(!drag.zoom){
          deselect();
        }else{
          setStatus('Ctrl+点击未找到足够近的曲线；请靠近曲线点击，或 Ctrl+拖框进行缩放。');
        }
        return;
      }

      const sx0=Math.min(drag.sx,drag.ex),sx1=Math.max(drag.sx,drag.ex);
      const sy0=Math.min(drag.sy,drag.ey),sy1=Math.max(drag.sy,drag.ey);
      if(Math.abs(sx1-sx0)<6||Math.abs(sy1-sy0)<6)return;

      if(drag.zoom){
        state.mainView.xDomain=[x.invert(sx0),x.invert(sx1)].sort((a,b)=>a-b);
        state.mainView.yDomain=[y.invert(sy1),y.invert(sy0)].sort((a,b)=>a-b);
        state.mainView.mode='select';
        renderMainPlot();
        setStatus('Ctrl+框选缩放完成。直接拖框用于局部寻峰/删除/锁定；R 恢复全部数据。');
        return;
      }

      const range={
        vMin:Math.min(x.invert(sx0),x.invert(sx1)),
        vMax:Math.max(x.invert(sx0),x.invert(sx1)),
        iMin:Math.min(y.invert(sy0),y.invert(sy1)),
        iMax:Math.max(y.invert(sy0),y.invert(sy1))
      };
      openRangeActionMenu(range,drag.clientX,drag.clientY);
      setStatus('已框选区域。请选择局部寻峰、删除框选峰、锁定或解锁；按 Esc/点击背景可关闭。');
    };

    plotBg.on('pointerup',finishRangeDrag);
    plotBg.on('pointercancel',event=>{
      if(state.mainRangeDrag?.pointerId===event.pointerId){
        state.mainRangeDrag=null;
        mainSvg.selectAll('.direct-interaction-box').remove();
      }
    });

    // Mouse wheel zooms both axes around the pointer position. This is
    // independent of the Ctrl+box zoom gesture.
    mainSvg.on('wheel.mainzoom',event=>{
      const [px,py]=d3.pointer(event,mainSvg.node());
      if(px<margin.left||px>margin.left+innerW||py<margin.top||py>margin.top+innerH)return;
      event.preventDefault();
      event.stopPropagation();
      closeRangeActionMenu();

      const dy=Math.max(-220,Math.min(220,Number(event.deltaY)||0));
      const factor=Math.max(.72,Math.min(1.38,Math.exp(dy*.00145)));
      const cx=x.invert(px),cy=y.invert(py);
      const minX=Math.max(1e-12,Math.abs(fullX[1]-fullX[0])*1e-6);
      const minY=Math.max(1e-30,Math.abs(fullY[1]-fullY[0])*1e-6);
      state.mainView.xDomain=scaleDomainAround(xDomain,cx,factor,minX);
      state.mainView.yDomain=scaleDomainAround(yDomain,cy,factor,minY);
      state.mainView.mode='select';
      renderMainPlot();
    });

    if(state.mainRangeSelection){
      const rr=state.mainRangeSelection;
      const rx0=x(Math.max(xDomain[0],rr.vMin));
      const rx1=x(Math.min(xDomain[1],rr.vMax));
      const ry0=y(Math.min(yDomain[1],rr.iMax));
      const ry1=y(Math.max(yDomain[0],rr.iMin));
      if(Number.isFinite(rx0)&&Number.isFinite(rx1)&&Number.isFinite(ry0)&&Number.isFinite(ry1)){
        mainSvg.append('rect')
          .attr('class','persisted-range-box direct-range-box')
          .attr('x',Math.min(rx0,rx1))
          .attr('y',Math.min(ry0,ry1))
          .attr('width',Math.abs(rx1-rx0))
          .attr('height',Math.abs(ry1-ry0));
      }
    }

    // Geometry watchdog. If Electron/Chromium completes another grid reflow
    // after this render, redraw using the new box instead of leaving a stale
    // viewBox centered inside a larger SVG viewport.
    requestAnimationFrame(()=>{
      const now=measureMainPlot();
      const wrapRect=wrap.getBoundingClientRect();
      const svgRect=mainSvg.node()?.getBoundingClientRect();
      if(!now||!svgRect)return;

      const sizeChanged=Math.abs(now.width-width)>2||Math.abs(now.height-height)>2;
      const shifted=Math.abs(svgRect.left-wrapRect.left)>2||Math.abs(svgRect.top-wrapRect.top)>2;
      const svgSizeWrong=Math.abs(svgRect.width-wrapRect.width)>2||Math.abs(svgRect.height-wrapRect.height)>2;

      if(sizeChanged||shifted||svgSizeWrong){
        // Force exact origin before the deferred redraw.
        mainSvg
          .style('left','0px')
          .style('top','0px')
          .style('width',`${Math.round(wrapRect.width)}px`)
          .style('height',`${Math.round(wrapRect.height)}px`)
          .style('transform','none')
          .attr('viewBox',null);
        scheduleMainPlotRelayout();
      }
    });
  }

  function showPeakTip(event,p){
    const sw=sweepById(p.sweepId); const m=A.peakMetrics(p,sw);
    tip.innerHTML=`<b>${escapeHtml(seriesName(p))}</b><br>
      峰序=${p.peakOrder} · 标签=${escapeHtml(peakLabel(p))}<br>
      Vg=${p.vg} V · ${directionName(p.direction)}<br>
      Vpk=${p.v.toFixed(5)} V<br>I=${formatI(p.i)}<br>
      FWHM=${m.fwhm.toFixed(5)} V<br>Amplitude=${formatI(m.amplitude)}<br>
      Area=${m.area.toExponential(3)} A·V<br>
      形状算法=${escapeHtml(p.algorithms?.join(', ')||'manual')}<br>
      主算法=${escapeHtml(p.primaryAlgorithm||'manual')} · 状态=${p.accepted?'采纳':'不采纳'}`;
    tip.classList.remove('hidden'); moveTip(event);
  }
  function moveTip(event){ const r=$('#mainPlotWrap').getBoundingClientRect(); tip.style.left=`${event.clientX-r.left+12}px`; tip.style.top=`${event.clientY-r.top+12}px`; }
  function hideTip(){ tip.classList.add('hidden'); }

  function drawWidthOverlay(p,sw,x,y,plot){
    const c=peakColor(p),left=Math.min(p.widthLeft,p.widthRight),right=Math.max(p.widthLeft,p.widthRight);
    const band=mainSvg.append('g').attr('clip-path',`url(#${plot.clipId})`);
    band.append('rect').attr('class','width-band').attr('x',x(left)).attr('width',Math.max(2,x(right)-x(left))).attr('y',plot.margin.top).attr('height',plot.innerH).attr('fill',c);
    const m=A.peakMetrics(p,sw),half=Math.sign(p.i||1)*(Math.abs(p.i)-m.amplitude/2);
    band.append('line').attr('class','width-line').attr('x1',x(left)).attr('x2',x(right)).attr('y1',y(half)).attr('y2',y(half)).attr('stroke',c).attr('stroke-width',1.5);
    for(const side of ['left','right']){
      const xv=side==='left'?left:right;
      const h=band.append('circle').attr('class','width-handle').attr('cx',x(xv)).attr('cy',y(half)).attr('r',6).attr('fill','#fff').attr('stroke',c).attr('stroke-width',2);
      h.on('click',event=>event.stopPropagation())
        .on('dblclick',event=>{event.preventDefault();event.stopPropagation();})
        .call(d3.drag().clickDistance(5)
        .on('start',()=>{if(state.selectedSweepId===p.sweepId)snapshot('修改峰宽');})
        .on('drag',event=>{
          if(state.selectedSweepId!==p.sweepId)return;
          const target=x.invert(event.x),idx=A.nearestIndex(sw.points.map(q=>q.v),target),snap=sw.points[idx].v;
          if(side==='left')p.widthLeft=Math.min(snap,p.v); else p.widthRight=Math.max(snap,p.v);
          p.manual=true; renderMainPlot(); renderInspector();
        })
        .on('end',()=>renderTrendPanel()));
    }
  }

  function nextPeakOrder(sw){
    const orders=state.peaks.filter(p=>p.sweepId===sw.id).map(p=>Number(p.peakOrder)||0);
    return Math.max(0,...orders)+1;
  }
  function addManualPeak(sw,pixelX,x){
    snapshot('新增手动峰');
    const target=x.invert(pixelX),idx=A.nearestIndex(sw.points.map(p=>p.v),target),pt=sw.points[idx],w=estimateManualWidth(sw,idx);
    const order=nextPeakOrder(sw);
    const p={
      id:`${sw.id}::manual::${Date.now()}`,sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,
      index:idx,v:pt.v,i:pt.i,accepted:true,manual:true,locked:false,algorithms:['manual'],primaryAlgorithm:'manual',
      widthLeft:w.left,widthRight:w.right,fwhm:w.fwhm,peakOrder:order,peakLabel:defaultPeakLabel(order),customColor:null
    };
    state.peaks.push(p);state.selectedSweepId=sw.id;state.selectedPeakId=p.id;renderAll();
    setStatus(`已新增 ${directionName(sw.direction)} · ${peakLabel(p)}：Vd=${p.v.toFixed(6)} V（Ctrl+右键点击峰点可删除）`);
  }
  function estimateManualWidth(sw,idx){const dx=sw.step||.01;return{left:sw.points[Math.max(0,idx-3)].v,right:sw.points[Math.min(sw.points.length-1,idx+3)].v,fwhm:6*dx};}

  function pluginUiContext(){
    return {
      activityId:window.DKDSPlugins?.activities?.active?.()||null,
      state,
      selectedSweep:selectedSweep(),
      selectedPeak:selectedPeak(),
      selectedPeakIds:new Set(state.selectedPeakIds),
      platform:window.DKDSPlatform?.profile||null
    };
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


  // Group-panel resonant TER is intentionally different from the full TER_max page.
  // For each peak family, resonance coordinates from BOTH scan directions are
  // candidate Vd values. At each candidate, forward/reverse raw sweeps are
  // evaluated at the SAME Vd; the largest resonance-associated TER is plotted.
  // Therefore a resonance visible only in reverse scan is not silently omitted.

  // ------------------------------------------------------------------
  // Peak-spacing page
  // ------------------------------------------------------------------
  function activeProjectTitle(){
    return activeProjectTab()?.title || '当前项目';
  }

  function acceptedSeriesOptions(){
    const seen=new Map();
    for(const p of state.peaks.filter(p=>p.accepted)){
      const key=`${p.direction}::${peakLabel(p)}`;
      if(!seen.has(key)){
        seen.set(key,{
          key,direction:p.direction,label:peakLabel(p),
          order:Number(p.peakOrder)||1,
          name:`${directionName(p.direction)}·${peakLabel(p)}`
        });
      }
    }
    return [...seen.values()].sort((a,b)=>
      a.direction===b.direction?(a.order-b.order):(b.direction-a.direction)
    );
  }

  function chooseRepresentativePeak(list){
    return list.slice().sort((a,b)=>
      Number(b.locked)-Number(a.locked) ||
      Number(b.manual)-Number(a.manual) ||
      (Number(b.score)||0)-(Number(a.score)||0)
    )[0] || null;
  }

  function computeSpacingResult(keyA,keyB){
    const [dirAS,labelA]=String(keyA||'').split('::');
    const [dirBS,labelB]=String(keyB||'').split('::');
    const dirA=Number(dirAS),dirB=Number(dirBS);
    if(!labelA||!labelB)return [];

    const a=state.peaks.filter(p=>p.accepted&&p.direction===dirA&&peakLabel(p)===labelA);
    const b=state.peaks.filter(p=>p.accepted&&p.direction===dirB&&peakLabel(p)===labelB);
    const vgs=[...new Set(a.map(p=>p.vg).filter(v=>b.some(q=>q.vg===v)))].sort((x,y)=>x-y);
    const out=[];
    for(const vg of vgs){
      const pa=chooseRepresentativePeak(a.filter(p=>p.vg===vg));
      const pb=chooseRepresentativePeak(b.filter(p=>p.vg===vg));
      if(!pa||!pb)continue;
      out.push({
        vg,
        vA:pa.v,vB:pb.v,
        deltaV:pb.v-pa.v,
        spacing:Math.abs(pb.v-pa.v),
        labelA:`${directionName(dirA)}·${labelA}`,
        labelB:`${directionName(dirB)}·${labelB}`,
        idA:pa.id,idB:pb.id
      });
    }
    return out;
  }

  function populateSpacingSelectors(){
    const opts=acceptedSeriesOptions();
    const aSel=$('#spacingSeriesA'),bSel=$('#spacingSeriesB');
    if(!aSel||!bSel)return;
    const oldA=state.spacingSettings.seriesA,oldB=state.spacingSettings.seriesB;
    const markup=opts.map(o=>`<option value="${escapeHtml(o.key)}">${escapeHtml(o.name)}</option>`).join('');
    aSel.innerHTML=markup;bSel.innerHTML=markup;

    const valid=new Set(opts.map(o=>o.key));
    let a=valid.has(oldA)?oldA:(opts[0]?.key||'');
    let b=valid.has(oldB)?oldB:(opts.find(o=>o.key!==a)?.key||a);
    state.spacingSettings.seriesA=a;
    state.spacingSettings.seriesB=b;
    aSel.value=a;bSel.value=b;
    $('#spacingMode').value=state.spacingSettings.mode||'abs';
  }

  function renderSpacingPage(){
    const host=$('#spacingPlot');
    if(!host)return;
    $('#spacingProjectName').textContent=`项目：${activeProjectTitle()}`;
    populateSpacingSelectors();

    const {seriesA,seriesB,mode}=state.spacingSettings;
    const data=computeSpacingResult(seriesA,seriesB);
    state.spacingResult=data;

    const yKey=mode==='signed'?'deltaV':'spacing';
    const yTitle=mode==='signed'?'VB − VA (V)':'|VB − VA| (V)';
    const aName=$('#spacingSeriesA').selectedOptions[0]?.textContent||'峰 A';
    const bName=$('#spacingSeriesB').selectedOptions[0]?.textContent||'峰 B';

    Plotly.newPlot(host,[{
      x:data.map(d=>d.vg),
      y:data.map(d=>d[yKey]),
      mode:'lines+markers',
      name:`${aName} ↔ ${bName}`,
      line:{width:2},
      marker:{size:8},
      customdata:data.map(d=>[d.vA,d.vB,d.deltaV,d.spacing]),
      hovertemplate:'Vg=%{x}<br>VA=%{customdata[0]:.5g} V<br>VB=%{customdata[1]:.5g} V<br>VB−VA=%{customdata[2]:.5g} V<br>|ΔV|=%{customdata[3]:.5g} V<extra></extra>'
    }],{
      margin:{l:72,r:24,t:42,b:62},
      title:{text:`峰间距：${aName} 与 ${bName}`,font:{size:14}},
      xaxis:{title:'Vg (V)',gridcolor:'#edf0f5',automargin:true},
      yaxis:{title:yTitle,gridcolor:'#edf0f5',automargin:true},
      hovermode:'closest',
      dragmode:'zoom',
      autosize:true
    },{
      responsive:true,scrollZoom:true,displaylogo:false,
      modeBarButtonsToAdd:['select2d','lasso2d'],
      toImageButtonOptions:{format:'png',filename:'peak_spacing',scale:2}
    });

    const table=$('#spacingTable');
    table.innerHTML=`
      <thead><tr><th>Vg (V)</th><th>${escapeHtml(aName)} Vpk (V)</th><th>${escapeHtml(bName)} Vpk (V)</th><th>VB−VA (V)</th><th>|ΔV| (V)</th></tr></thead>
      <tbody>${data.map(d=>`<tr><td>${d.vg}</td><td>${d.vA.toFixed(6)}</td><td>${d.vB.toFixed(6)}</td><td>${d.deltaV.toFixed(6)}</td><td>${d.spacing.toFixed(6)}</td></tr>`).join('')}</tbody>`;
    captureActiveProjectTab();
  }

  function spacingCsvText(){
    const data=state.spacingResult||[];
    const rows=['Vg_V,series_A,V_A_V,series_B,V_B_V,delta_V_B_minus_A_V,absolute_spacing_V'];
    for(const d of data)rows.push([d.vg,csvCell(d.labelA),d.vA,csvCell(d.labelB),d.vB,d.deltaV,d.spacing].join(','));
    return rows.join('\n');
  }
  async function exportSpacingCsv(){
    await window.electronAPI.saveText({defaultName:'peak_spacing_vs_Vg.csv',content:spacingCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }

  // ------------------------------------------------------------------
  // TER_max page
  // ------------------------------------------------------------------
  function terDatasetsForCurrentSettings(){
    if(!state.terMaxSettings.onlyFullyVisible)return state.datasets.slice();
    return state.datasets.filter(ds=>{
      const vis=state.scanVisibility.get(ds.path);
      return !!vis?.forward&&!!vis?.reverse;
    });
  }

  function syncTerInputsFromState(){
    const s=state.terMaxSettings;
    const set=(id,v)=>{$('#'+id).value=(v===null||v===undefined||!Number.isFinite(Number(v)))?'':String(v);};
    set('terVmin',s.vmin);set('terVmax',s.vmax);set('terVstep',s.vstep);set('terTolerance',s.tolerance);
    $('#terCurrentFloor').value=String(s.currentFloor??1e-15);
    $('#terOnlyFullyVisible').checked=!!s.onlyFullyVisible;
  }

  function readTerInputsToState(){
    const num=id=>{
      const raw=$('#'+id).value.trim();
      if(raw==='')return null;
      const v=Number(raw);
      return Number.isFinite(v)?v:null;
    };
    state.terMaxSettings={
      vmin:num('terVmin'),
      vmax:num('terVmax'),
      vstep:num('terVstep'),
      tolerance:num('terTolerance'),
      currentFloor:num('terCurrentFloor')??1e-15,
      onlyFullyVisible:!!$('#terOnlyFullyVisible').checked
    };
    return state.terMaxSettings;
  }

  function autoTerParameters(){
    const datasets=terDatasetsForCurrentSettings();
    try{
      const d=A.detectTerVoltageParameters(datasets);
      state.terMaxSettings.vmin=d.vmin;
      state.terMaxSettings.vmax=d.vmax;
      state.terMaxSettings.vstep=d.vstep;
      state.terMaxSettings.tolerance=d.vstep/20;
      state.terMaxSettings.currentFloor=state.terMaxSettings.currentFloor||1e-15;
      syncTerInputsFromState();
      setStatus(`TER 参数已自动检测：Vds ${d.vmin} ~ ${d.vmax} V，step=${d.vstep} V，tolerance=${d.vstep/20} V。`);
    }catch(err){
      setStatus(`TER 参数检测失败：${err.message}`);
    }
  }

  function computeTerMaxPage(){
    readTerInputsToState();
    const datasets=terDatasetsForCurrentSettings();
    try{
      const result=A.computeTerMatrix(datasets,state.terMaxSettings);
      state.terMaxResult=result;
      // Write resolved auto/default values back to controls/settings.
      state.terMaxSettings={
        ...state.terMaxSettings,
        vmin:result.used.vmin,vmax:result.used.vmax,vstep:result.used.vstep,
        tolerance:result.used.tolerance,currentFloor:result.used.currentFloor
      };
      syncTerInputsFromState();
      renderTerMaxResult();
      captureActiveProjectTab();
      setStatus(`TER 热图计算完成：${result.vgs.length} 个 Vg × ${result.targets.length} 个非零 Vd；已生成 TER_Max–Vg 与 TER_Max–Vd。`);
    }catch(err){
      state.terMaxResult=null;
      $('#terSummary').innerHTML=`<span class="ter-summary-chip">计算失败：${escapeHtml(err.message)}</span>`;
      setStatus(`TER_max 计算失败：${err.message}`);
    }
  }

  function readOptionalPositive(id){
    const raw=$('#'+id)?.value?.trim?.()??'';
    if(raw==='')return null;
    const v=Number(raw);
    return Number.isFinite(v)&&v>0?v:null;
  }

  function readOptionalNumber(id){
    const raw=$('#'+id)?.value?.trim?.()??'';
    if(raw==='')return null;
    const v=Number(raw);
    return Number.isFinite(v)?v:null;
  }

  function syncTerHeatmapControls(){
    const h=state.terHeatmapDisplay||{};
    $('#terColorScale').value=h.colorscale||'Viridis';
    const set=(id,v)=>{$('#'+id).value=(v===null||v===undefined||!Number.isFinite(Number(v)))?'':String(v);};
    set('terColorMin',h.zmin);
    set('terColorMax',h.zmax);
    set('terColorTick',h.colorDtick);
    set('terXTick',h.xDtick);
    set('terYTick',h.yDtick);
  }

  function readTerHeatmapControls(){
    state.terHeatmapDisplay={
      colorscale:$('#terColorScale').value||'Viridis',
      zmin:readOptionalNumber('terColorMin'),
      zmax:readOptionalNumber('terColorMax'),
      colorDtick:readOptionalPositive('terColorTick'),
      xDtick:readOptionalPositive('terXTick'),
      yDtick:readOptionalPositive('terYTick')
    };
    if(Number.isFinite(state.terHeatmapDisplay.zmin)&&Number.isFinite(state.terHeatmapDisplay.zmax)
       && state.terHeatmapDisplay.zmax<=state.terHeatmapDisplay.zmin){
      const tmp=state.terHeatmapDisplay.zmin;
      state.terHeatmapDisplay.zmin=state.terHeatmapDisplay.zmax;
      state.terHeatmapDisplay.zmax=tmp;
    }
    captureActiveProjectTab();
  }

  function resetTerHeatmapDisplay(){
    state.terHeatmapDisplay={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
    syncTerHeatmapControls();
    if(state.terMaxResult)renderTerMaxResult();
    captureActiveProjectTab();
    setStatus('TER 热图色阶和坐标刻度已恢复自动。');
  }

  function renderTerMaxPage(){
    $('#terMaxProjectName').textContent=`项目：${activeProjectTitle()}`;
    syncTerInputsFromState();
    syncTerHeatmapControls();
    if(state.terMaxResult)renderTerMaxResult();
    else{
      $('#terSummary').innerHTML='<span class="ter-summary-chip">尚未计算 TER_max</span>';
      ['terHeatmapPlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot'].forEach(id=>Plotly.purge($('#'+id)));
      $('#terMaxVgTable').innerHTML='';
      $('#terMaxVdTable').innerHTML='';
    }
  }

  function renderTerMaxResult(){
    const r=state.terMaxResult;
    if(!r)return;
    $('#terSummary').innerHTML=[
      `Vg 数：${r.vgs.length}`,
      `Vds 点：${r.targets.length}`,
      `缺失 TER：${r.missing}`,
      `Vds：${r.used.vmin} ~ ${r.used.vmax} V`,
      `step=${r.used.vstep} V`,
      `tolerance=${r.used.tolerance} V`,
      `current floor=${r.used.currentFloor} A`
    ].map(t=>`<span class="ter-summary-chip">${escapeHtml(t)}</span>`).join('');

    const hd=state.terHeatmapDisplay||{};
    const finiteTer=r.matrix.flat().filter(Number.isFinite);
    const autoMin=finiteTer.length?Math.min(...finiteTer):0;
    const autoMax=finiteTer.length?Math.max(...finiteTer):1;
    const zmin=Number.isFinite(hd.zmin)?hd.zmin:autoMin;
    const zmax=Number.isFinite(hd.zmax)?hd.zmax:autoMax;

    const heatTrace={
      x:r.targets,y:r.vgs,z:r.matrix,
      type:'heatmap',
      colorscale:hd.colorscale||'Viridis',
      zmin,zmax,
      zsmooth:false,
      colorbar:{
        title:{text:'TER (%)',side:'right'},
        thickness:18,
        len:.86,
        y:.5,
        yanchor:'middle',
        tickmode:hd.colorDtick?'linear':'auto',
        dtick:hd.colorDtick||undefined
      },
      hovertemplate:'Vg=%{y}<br>Vds=%{x}<br>TER=%{z:.4g}%<extra></extra>'
    };

    Plotly.newPlot('terHeatmapPlot',[heatTrace],{
      margin:{l:76,r:96,t:26,b:66},
      xaxis:{
        title:'Vds (V)',automargin:true,
        tickmode:hd.xDtick?'linear':'auto',
        dtick:hd.xDtick||undefined,
        constrain:'domain'
      },
      yaxis:{
        title:'Vg (V)',automargin:true,
        tickmode:hd.yDtick?'linear':'auto',
        dtick:hd.yDtick||undefined,
        autorange:true,
        constrain:'domain'
      },
      dragmode:'zoom',
      autosize:true
    },{
      responsive:true,scrollZoom:true,displaylogo:false,
      modeBarButtonsToAdd:['select2d'],
      toImageButtonOptions:{format:'png',filename:'TER_heatmap',width:1200,height:1200,scale:2}
    });

    const maxVg=r.terMaxByVg||r.terMax||[];
    const maxVd=r.terMaxByVd||[];

    Plotly.newPlot('terMaxVgPlot',[{
      x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),
      mode:'lines+markers',
      line:{width:2},marker:{size:8},
      customdata:maxVg.map(d=>[d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown]),
      hovertemplate:'Vg=%{x}<br>TER_Max–Vg=%{y:.5g}%<br>Vd@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<extra></extra>'
    }],{
      margin:{l:72,r:20,t:20,b:60},
      xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},
      yaxis:{title:'TER_Max–Vg (%)',gridcolor:'#edf0f5'},
      dragmode:'zoom',autosize:true
    },{responsive:true,scrollZoom:true,displaylogo:false});

    Plotly.newPlot('terMaxVgArgPlot',[{
      x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),
      mode:'lines+markers',
      line:{width:2},marker:{size:8},
      customdata:maxVg.map(d=>d.terMax),
      hovertemplate:'Vg=%{x}<br>Vd@TER_Max–Vg=%{y:.5g} V<br>TER_Max=%{customdata:.5g}%<extra></extra>'
    }],{
      margin:{l:72,r:20,t:20,b:60},
      xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},
      yaxis:{title:'Vd @ TER_Max–Vg (V)',gridcolor:'#edf0f5'},
      dragmode:'zoom',autosize:true
    },{responsive:true,scrollZoom:true,displaylogo:false});

    Plotly.newPlot('terMaxVdPlot',[{
      x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),
      mode:'lines+markers',
      line:{width:2},marker:{size:7},
      customdata:maxVd.map(d=>[d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown]),
      hovertemplate:'Vd=%{x}<br>TER_Max–Vd=%{y:.5g}%<br>Vg@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<extra></extra>'
    }],{
      margin:{l:72,r:20,t:20,b:60},
      xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},
      yaxis:{title:'TER_Max–Vd (%)',gridcolor:'#edf0f5'},
      dragmode:'zoom',autosize:true
    },{responsive:true,scrollZoom:true,displaylogo:false});

    Plotly.newPlot('terMaxVdArgPlot',[{
      x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.vgAtMax),
      mode:'lines+markers',
      line:{width:2},marker:{size:7},
      customdata:maxVd.map(d=>d.terMax),
      hovertemplate:'Vd=%{x}<br>Vg@TER_Max–Vd=%{y:.5g} V<br>TER_Max=%{customdata:.5g}%<extra></extra>'
    }],{
      margin:{l:72,r:20,t:20,b:60},
      xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},
      yaxis:{title:'Vg @ TER_Max–Vd (V)',gridcolor:'#edf0f5'},
      dragmode:'zoom',autosize:true
    },{responsive:true,scrollZoom:true,displaylogo:false});

    $('#terMaxVgTable').innerHTML=`
      <thead><tr><th>Vg (V)</th><th>TER_Max–Vg (%)</th><th>Vd@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th></tr></thead>
      <tbody>${maxVg.map(d=>`<tr><td>${d.vg}</td><td>${d.terMax.toPrecision(7)}</td><td>${d.vdsAtMax}</td><td>${d.iUp.toExponential(6)}</td><td>${d.iDown.toExponential(6)}</td><td>${d.rUp.toExponential(6)}</td><td>${d.rDown.toExponential(6)}</td></tr>`).join('')}</tbody>`;

    $('#terMaxVdTable').innerHTML=`
      <thead><tr><th>Vd (V)</th><th>TER_Max–Vd (%)</th><th>Vg@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th></tr></thead>
      <tbody>${maxVd.map(d=>`<tr><td>${d.vds}</td><td>${d.terMax.toPrecision(7)}</td><td>${d.vgAtMax}</td><td>${d.iUp.toExponential(6)}</td><td>${d.iDown.toExponential(6)}</td><td>${d.rUp.toExponential(6)}</td><td>${d.rDown.toExponential(6)}</td></tr>`).join('')}</tbody>`;
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
    if(IS_AUXILIARY_WINDOW)return 0;
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
    if(!window.ResizeObserver||IS_AUXILIARY_WINDOW)return;
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
    divider.classList.toggle('hidden',!state.available||blocked||IS_AUXILIARY_WINDOW);
    if(!state.available||blocked||IS_AUXILIARY_WINDOW)return;
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
    if(IS_AUXILIARY_WINDOW)return true;
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
    if(!IS_AUXILIARY_WINDOW&&superState?.available){
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

  function pulseColumnOptions(ins,selected,{optional=false,optionalLabel='未记录'}={}){
    const options=(ins?.headers||[]).map((h,i)=>
      `<option value="${i}" ${Number(selected)===i?'selected':''}>${i+1}: ${escapeHtml(h)}</option>`
    ).join('');
    return optional
      ? `<option value="-1" ${Number(selected)<0?'selected':''}>— ${escapeHtml(optionalLabel)} —</option>${options}`
      : options;
  }

  function guessPulseColumn(ins,kind){
    const hs=(ins?.headers||[]).map(h=>String(h||'').toLowerCase());
    if(kind==='time'){
      const j=hs.findIndex(h=>/time|时间/.test(h));
      return j>=0?j:-1;
    }
    if(kind==='current'){
      let j=hs.findIndex(h=>/\bid\b|current|(^|[^a-z])i(?:\W|$)/.test(h));
      return j>=0?j:Math.min(1,Math.max(0,hs.length-1));
    }
    if(kind==='voltage'){
      let j=hs.findIndex(h=>/\bvd\b|\bvds\b|voltage|bias/.test(h));
      if(j<0)j=hs.findIndex(h=>/(^|[^a-z])v(?:\W|$)/.test(h)&&!/vg|gate/.test(h));
      return j;
    }
    return -1;
  }

  function pulseIsFiniteValue(value){
    return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  }

  function pulseNullableNumber(value){
    if(value===null||value===undefined||String(value).trim()==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function defaultPulseItemSettings(ins,name=''){
    const inferred=A.inferPulseProtocolFromName?.(name)||{};
    const timeCol=guessPulseColumn(ins,'time');
    const currentCol=guessPulseColumn(ins,'current');
    const voltageCol=guessPulseColumn(ins,'voltage');
    return {
      segmentationMode:'auto',
      timeCol,
      currentCol,
      voltageCol,
      cycleSamples:0,
      cycleOffsetSamples:0,
      writeStartSample:null,
      writeEndSample:null,
      readStartSample:null,
      readEndSample:null,
      writeDuration:pulseNullableNumber(inferred.writeDuration),
      readDuration:pulseNullableNumber(inferred.readDuration),
      sampleInterval:null,
      phaseOrder:'write-read',
      readVoltage:pulseNullableNumber(inferred.readVoltage),
      pulseVoltage:pulseNullableNumber(inferred.pulseVoltage),
      blockSamples:0,
      windowStartFraction:.25,
      windowEndFraction:.75,
      readPairMode:'after'
    };
  }

  function pulseItemLabel(item){
    return String(item?.label||item?.name||'Pulse data').trim()||'Pulse data';
  }

  function pulseSafeFileName(label){
    return String(label||'pulse')
      .trim()
      .replace(/[\\/:*?"<>|]+/g,'_')
      .replace(/\s+/g,'_')
      .slice(0,80)||'pulse';
  }

  function pulseModeName(mode){
    return ({cycle:'按周期点数',timing:'按时间协议',waveform:'按记录电压',legacy:'旧版等点数',auto:'自动'})[mode]||'旧版等点数';
  }

  function pulseFiniteText(value,{digits=6,suffix=''}={}){
    if(!pulseIsFiniteValue(value))return '—';
    const n=Number(value);
    return `${n.toPrecision(digits)}${suffix}`;
  }

  function pulseResultMode(result){
    return result?.segmentationMode||'legacy';
  }

  function makePulseItem(meta,data){
    const inspection=A.inspectDataText({
      name:meta.name,path:meta.path,text:data.text,encoding:data.encoding
    },A.defaultImportOptions());
    return {
      id:`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
      path:meta.path,
      name:meta.name,
      size:meta.size||data.size||0,
      label:String(meta.name||'').replace(/\.[^.]+$/,''),
      checked:true,
      text:data.text,
      encoding:data.encoding,
      inspection,
      settings:defaultPulseItemSettings(inspection,meta.name),
      result:null,
      error:'',
      loading:false,
      analyzedAt:null
    };
  }

  function renderPulseFileList(){
    const host=$('#pulseFileList');
    if(!host)return;
    host.innerHTML='';

    if(!pulseAnalysisState.files.length){
      host.innerHTML='<div class="pulse-file-empty">尚未添加脉冲数据文件</div>';
    }

    for(const item of pulseAnalysisState.files){
      const active=item.id===pulseAnalysisState.activeId;
      const el=document.createElement('div');
      el.className=`pulse-batch-file-item ${active?'active':''} ${item.error?'error':''}`;
      const rv=pulseNullableNumber(item.result?.readVoltage);
      const resultMeta=item.result
        ? `${pulseModeName(pulseResultMode(item.result))} · ${rv!==null?`读取≈${rv.toFixed(4)} V`:'未记录读取电压'} · ${item.result.points.length} 组`
        : item.error
          ? item.error
          : item.loading?'读取中…':'待分析';
      el.innerHTML=`
        <div class="pulse-batch-file-main">
          <input class="pulse-file-check" type="checkbox" ${item.checked?'checked':''}>
          <div class="pulse-batch-file-text">
            <div class="pulse-batch-file-label" title="${escapeHtml(pulseItemLabel(item))}">${escapeHtml(pulseItemLabel(item))}</div>
            <div class="pulse-batch-file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
          </div>
          <span class="pulse-file-state ${item.result?'done':item.error?'bad':''}">${item.result?'已分析':item.error?'错误':'待处理'}</span>
        </div>
        <div class="pulse-batch-file-meta">${escapeHtml(resultMeta)}</div>`;

      el.querySelector('.pulse-file-check').onclick=e=>{
        e.stopPropagation();
        item.checked=e.target.checked;
        renderPulseFileList();
        renderPulseComparison();
      };
      el.onclick=()=>{
        pulseAnalysisState.activeId=item.id;
        renderPulseBatchUi();
      };
      host.appendChild(el);
    }

    const checked=pulseCheckedItems();
    const analyzed=checked.filter(f=>f.result).length;
    const errors=checked.filter(f=>f.error).length;
    $('#pulseBatchFileSummary').textContent=
      `${pulseAnalysisState.files.length} 个文件 · ${checked.length} 个勾选 · ${analyzed} 个已分析${errors?` · ${errors} 个错误`:''}`;
    $('#pulseAnalyzeCheckedBtn').disabled=!checked.length;
    $('#pulseRemoveFilesBtn').disabled=!checked.length;
  }

  function renderPulseActiveEditor(){
    const item=pulseActiveItem();
    $('#pulseNoActiveFile').classList.toggle('hidden',!!item);
    $('#pulseActiveEditor').classList.toggle('hidden',!item);
    $('#pulseAnalyzeCurrentBtn').disabled=!item;
    if(!item)return;

    const s={...defaultPulseItemSettings(item.inspection,item.name),...(item.settings||{})};
    item.settings=s;
    $('#pulseActiveFileName').textContent=item.name;
    $('#pulseActiveFileMeta').textContent=
      `${item.inspection?.rowCount||0} 个有效数据行 · ${item.inspection?.headers?.length||0} 列 · ${item.encoding||'auto'}`
      + (item.result?` · 最近分析 ${item.result.points.length} 个脉冲/读取对`:'');
    $('#pulseSeriesLabel').value=pulseItemLabel(item);

    $('#pulseSegmentationMode').value=s.segmentationMode||'auto';
    $('#pulseTimeCol').innerHTML=pulseColumnOptions(item.inspection,s.timeCol,{optional:true,optionalLabel:'未记录时间'});
    $('#pulseCurrentCol').innerHTML=pulseColumnOptions(item.inspection,s.currentCol);
    $('#pulseVoltageCol').innerHTML=pulseColumnOptions(item.inspection,s.voltageCol,{optional:true,optionalLabel:'未记录电压'});
    const cycleEstimate=A.estimatePulseCycleSamples?.(item.inspection,{currentCol:Number(s.currentCol),voltageCol:Number(s.voltageCol)})||0;
    $('#pulseCycleSamples').value=Number(s.cycleSamples)||0;
    $('#pulseCycleSamples').placeholder=cycleEstimate>1?`0 = 自动（≈${cycleEstimate}）`:'0 = 自动';
    $('#pulseCycleOffsetSamples').value=Math.max(0,Math.round(Number(s.cycleOffsetSamples)||0));
    $('#pulseWriteStartSample').value=pulseIsFiniteValue(s.writeStartSample)?String(Math.round(Number(s.writeStartSample))):'';
    $('#pulseWriteEndSample').value=pulseIsFiniteValue(s.writeEndSample)?String(Math.round(Number(s.writeEndSample))):'';
    $('#pulseReadStartSample').value=pulseIsFiniteValue(s.readStartSample)?String(Math.round(Number(s.readStartSample))):'';
    $('#pulseReadEndSample').value=pulseIsFiniteValue(s.readEndSample)?String(Math.round(Number(s.readEndSample))):'';
    $('#pulseWriteDuration').value=pulseIsFiniteValue(s.writeDuration)?String(s.writeDuration):'';
    $('#pulseReadDuration').value=pulseIsFiniteValue(s.readDuration)?String(s.readDuration):'';
    $('#pulseSampleInterval').value=pulseIsFiniteValue(s.sampleInterval)?String(s.sampleInterval):'';
    $('#pulsePhaseOrder').value=s.phaseOrder||'write-read';
    $('#pulseReadVoltageFallback').value=pulseIsFiniteValue(s.readVoltage)?String(s.readVoltage):'';
    $('#pulsePulseVoltageFallback').value=pulseIsFiniteValue(s.pulseVoltage)?String(s.pulseVoltage):'';
    $('#pulseBlockSamples').value=Number(s.blockSamples)||0;
    $('#pulseWindowStart').value=Math.round((Number(s.windowStartFraction)||.25)*100);
    $('#pulseWindowEnd').value=Math.round((Number(s.windowEndFraction)||.75)*100);
    $('#pulseReadPairMode').value=s.readPairMode||'after';

    renderPulseActiveSummary();
  }

  function renderPulseActiveSummary(){
    const item=pulseActiveItem();
    const r=item?.result;
    if(!item){
      $('#pulseSummary').innerHTML='<span class="pulse-summary-placeholder">请选择文件。</span>';
      return;
    }
    if(item.error&&!r){
      $('#pulseSummary').innerHTML=`<span class="pulse-summary-error">${escapeHtml(item.error)}</span>`;
      return;
    }
    if(!r){
      $('#pulseSummary').innerHTML='<span class="pulse-summary-placeholder">当前文件尚未分析。</span>';
      return;
    }

    const rows=[
      ['分段方式',pulseModeName(pulseResultMode(r))],
      ['读取电压',pulseIsFiniteValue(r.readVoltage)?`${Number(r.readVoltage).toFixed(6)} V`:'未记录 / 未指定'],
      ['脉冲/读取对',String(r.points.length)],
      ['稳态窗口',`${(r.windowStartFraction*100).toFixed(0)}–${(r.windowEndFraction*100).toFixed(0)}%`]
    ];
    if(r.protocol?.cycleSamples>1)rows.splice(1,0,['周期点数',String(r.protocol.cycleSamples)]);
    if(r.protocol?.writeDuration>0)rows.splice(1,0,['写入宽度',`${r.protocol.writeDuration} s`]);
    if(r.protocol?.readDuration>0)rows.splice(2,0,['读取宽度',`${r.protocol.readDuration} s`]);
    if(pulseIsFiniteValue(r.blockSamples))rows.splice(1,0,['平台点数',String(r.blockSamples)]);
    $('#pulseSummary').innerHTML=rows.map(([k,v])=>`
      <span class="pulse-stat-chip"><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></span>
    `).join('');
  }

  function syncPulseEditorToActive(){
    const item=pulseActiveItem();
    if(!item)return null;
    const start=Math.max(0,Math.min(95,Number($('#pulseWindowStart').value)||25));
    const end=Math.max(start+1,Math.min(100,Number($('#pulseWindowEnd').value)||75));
    item.label=String($('#pulseSeriesLabel').value||item.label||item.name).trim()||item.name;
    item.settings={
      segmentationMode:$('#pulseSegmentationMode').value||'auto',
      timeCol:Number($('#pulseTimeCol').value),
      currentCol:Number($('#pulseCurrentCol').value),
      voltageCol:Number($('#pulseVoltageCol').value),
      cycleSamples:Math.max(0,Math.round(Number($('#pulseCycleSamples').value)||0)),
      cycleOffsetSamples:Math.max(0,Math.round(Number($('#pulseCycleOffsetSamples').value)||0)),
      writeStartSample:pulseNullableNumber($('#pulseWriteStartSample').value),
      writeEndSample:pulseNullableNumber($('#pulseWriteEndSample').value),
      readStartSample:pulseNullableNumber($('#pulseReadStartSample').value),
      readEndSample:pulseNullableNumber($('#pulseReadEndSample').value),
      writeDuration:pulseNullableNumber($('#pulseWriteDuration').value),
      readDuration:pulseNullableNumber($('#pulseReadDuration').value),
      sampleInterval:pulseNullableNumber($('#pulseSampleInterval').value),
      phaseOrder:$('#pulsePhaseOrder').value||'write-read',
      readVoltage:pulseNullableNumber($('#pulseReadVoltageFallback').value),
      pulseVoltage:pulseNullableNumber($('#pulsePulseVoltageFallback').value),
      blockSamples:Math.max(0,Math.round(Number($('#pulseBlockSamples').value)||0)),
      windowStartFraction:start/100,
      windowEndFraction:end/100,
      readPairMode:$('#pulseReadPairMode').value||'after'
    };
    return item;
  }

  async function addPulseAnalysisFiles(){
    if(pulseAnalysisState.dialogOpen)return;
    pulseAnalysisState.dialogOpen=true;
    let metas=[];
    try{
      metas=await window.electronAPI.openDataFiles();
    }finally{
      pulseAnalysisState.dialogOpen=false;
    }
    if(!metas?.length)return;

    const existingPaths=new Set(pulseAnalysisState.files.map(f=>f.path));
    let added=0;
    for(const meta of metas){
      if(existingPaths.has(meta.path))continue;
      try{
        const data=await window.electronAPI.readDataText({path:meta.path,encoding:'auto'});
        const item=makePulseItem(meta,data);
        pulseAnalysisState.files.push(item);
        existingPaths.add(meta.path);
        added++;
        if(!pulseAnalysisState.activeId)pulseAnalysisState.activeId=item.id;
      }catch(err){
        pulseAnalysisState.files.push({
          id:`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
          path:meta.path,name:meta.name,size:meta.size||0,
          label:String(meta.name||'').replace(/\.[^.]+$/,''),
          checked:true,text:'',encoding:'',inspection:null,
          settings:{},result:null,error:err?.message||String(err),loading:false
        });
      }
    }

    renderPulseBatchUi();
    if(added)setStatus(`已加入 ${added} 个脉冲数据文件；支持记录电压、仅电流，以及不同写入/读取脉宽。`);
  }

  function removeCheckedPulseFiles(){
    const removeIds=new Set(pulseAnalysisState.files.filter(f=>f.checked).map(f=>f.id));
    if(!removeIds.size)return;
    pulseAnalysisState.files=pulseAnalysisState.files.filter(f=>!removeIds.has(f.id));
    if(removeIds.has(pulseAnalysisState.activeId)){
      pulseAnalysisState.activeId=pulseAnalysisState.files[0]?.id||null;
    }
    renderPulseBatchUi();
    setStatus(`已从脉冲分析工作区移除 ${removeIds.size} 个文件。`);
  }

  function applyPulseSettingsToChecked(){
    const active=syncPulseEditorToActive();
    if(!active)return;
    const template={...active.settings};
    let count=0;
    for(const item of pulseCheckedItems()){
      if(item.id===active.id)continue;
      item.settings={...template};
      item.result=null;
      item.error='';
      count++;
    }
    renderPulseBatchUi();
    setStatus(`已将当前提取设置复制到 ${count} 个其他勾选文件；请重新批量分析。`);
  }

  function pulseAnalysisOptionsForItem(item){
    const s={...defaultPulseItemSettings(item.inspection,item.name),...(item.settings||{})};
    return {
      segmentationMode:s.segmentationMode||'auto',
      timeCol:Number(s.timeCol),
      currentCol:Number(s.currentCol),
      voltageCol:Number(s.voltageCol),
      cycleSamples:Math.max(0,Math.round(Number(s.cycleSamples)||0)),
      cycleOffsetSamples:Math.max(0,Math.round(Number(s.cycleOffsetSamples)||0)),
      writeStartSample:pulseNullableNumber(s.writeStartSample),
      writeEndSample:pulseNullableNumber(s.writeEndSample),
      readStartSample:pulseNullableNumber(s.readStartSample),
      readEndSample:pulseNullableNumber(s.readEndSample),
      writeDuration:pulseNullableNumber(s.writeDuration),
      readDuration:pulseNullableNumber(s.readDuration),
      sampleInterval:pulseNullableNumber(s.sampleInterval),
      phaseOrder:s.phaseOrder||'write-read',
      readVoltage:pulseNullableNumber(s.readVoltage),
      pulseVoltage:pulseNullableNumber(s.pulseVoltage),
      blockSamples:Math.max(0,Math.round(Number(s.blockSamples)||0)),
      windowStartFraction:Number.isFinite(Number(s.windowStartFraction))?Number(s.windowStartFraction):.25,
      windowEndFraction:Number.isFinite(Number(s.windowEndFraction))?Number(s.windowEndFraction):.75,
      readPairMode:s.readPairMode||'after'
    };
  }

  function analyzePulseItem(item){
    if(!item?.text||!item.inspection){
      item.error=item?.error||'文件内容不可用。';
      item.result=null;
      return false;
    }
    try{
      const r=A.analyzePulseReadData({
        name:item.name,path:item.path,text:item.text,encoding:item.encoding
      },pulseAnalysisOptionsForItem(item));
      item.result=r;
      item.error='';
      item.analyzedAt=new Date().toISOString();
      return true;
    }catch(err){
      item.result=null;
      item.error=err?.message||String(err);
      return false;
    }
  }

  function analyzeCurrentPulseFile(){
    const item=syncPulseEditorToActive();
    if(!item){
      setStatus('请先选择一个脉冲数据文件。');
      return;
    }
    const ok=analyzePulseItem(item);
    renderPulseBatchUi();
    if(ok){
      const rv=pulseNullableNumber(item.result.readVoltage);
      setStatus(`已分析 ${pulseItemLabel(item)}：${item.result.points.length} 个脉冲/读取对 · ${pulseModeName(pulseResultMode(item.result))}${rv!==null?` · Vread≈${rv.toFixed(4)} V`:''}。`);
    }else setStatus(`脉冲分析失败：${item.error}`);
  }

  async function analyzeCheckedPulseFiles(){
    syncPulseEditorToActive();
    const items=pulseCheckedItems();
    if(!items.length){
      setStatus('没有勾选需要分析的脉冲文件。');
      return;
    }
    let ok=0,fail=0,done=0;
    for(const item of items){
      item.loading=true;
      renderPulseFileList();
      setStatus(`批量脉冲分析：${done+1}/${items.length} · ${pulseItemLabel(item)}`);
      await new Promise(resolve=>setTimeout(resolve,0));
      if(analyzePulseItem(item))ok++;else fail++;
      item.loading=false;
      done++;
      renderPulseFileList();
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    renderPulseBatchUi();
    setStatus(`批量脉冲分析完成：${ok} 个成功${fail?`，${fail} 个失败`:''}。`);
  }

  function currentPlotScale(values){
    const max=Math.max(0,...values.map(v=>Math.abs(v)).filter(Number.isFinite));
    if(max>=1)return {factor:1,unit:'A'};
    if(max>=1e-3)return {factor:1e3,unit:'mA'};
    if(max>=1e-6)return {factor:1e6,unit:'µA'};
    if(max>=1e-9)return {factor:1e9,unit:'nA'};
    return {factor:1e12,unit:'pA'};
  }

  function pulseBaseLayout(yTitle,showLegend=false,xTitle='脉冲电压 (V)'){
    return {
      margin:{l:78,r:24,t:showLegend?48:26,b:64},
      xaxis:{
        title:xTitle,gridcolor:'#edf0f5',zerolinecolor:'#cfd7e5',
        automargin:true,showline:true,linecolor:'#cfd7e5'
      },
      yaxis:{
        title:yTitle,gridcolor:'#edf0f5',zerolinecolor:'#cfd7e5',
        automargin:true,showline:true,linecolor:'#cfd7e5'
      },
      hovermode:'closest',
      showlegend:showLegend,
      legend:{orientation:'h',x:0,y:1.08,yanchor:'bottom'},
      dragmode:'zoom',
      autosize:true,
      paper_bgcolor:'#fff',
      plot_bgcolor:'#fff'
    };
  }

  function emptyPulsePlot(plotId,message){
    Plotly.react(plotId,[],{
      margin:{l:25,r:25,t:25,b:25},
      xaxis:{visible:false},yaxis:{visible:false},
      annotations:[{
        text:message,x:.5,y:.5,xref:'paper',yref:'paper',
        showarrow:false,font:{size:13,color:'#98a2b3'}
      }],
      paper_bgcolor:'#fff',plot_bgcolor:'#fff'
    },{responsive:true,displaylogo:false,displayModeBar:false});
  }

  function renderPulseRawPlot(){
    const item=pulseActiveItem();
    const r=item?.result;
    $('#pulseRawSubtitle').textContent=item
      ? `${pulseItemLabel(item)} · ${item.name}。${r&&!(r.raw.voltage||[]).some(Number.isFinite)?'该文件未记录电压，仅显示电流–时间波形。':'原始波形只显示当前文件。'}`
      : '原始波形只显示当前文件，避免多个瞬态文件叠加后无法判断分段质量。';

    if(!r){
      emptyPulsePlot('pulseRawPlot',item?'当前文件尚未分析':'请选择左侧文件');
      return;
    }

    const scale=currentPlotScale(r.raw.current);
    const hasVoltage=(r.raw.voltage||[]).some(Number.isFinite);
    const cleanPlotConfig={responsive:true,displaylogo:false,displayModeBar:false,scrollZoom:true,doubleClick:'reset'};
    if(!hasVoltage){
      Plotly.react('pulseRawPlot',[{
        x:r.raw.time,y:r.raw.current.map(v=>v*scale.factor),mode:'lines',name:'Id',line:{width:1.2},
        hovertemplate:`Time=%{x:.7g}<br>Id=%{y:.7g} ${scale.unit}<extra>Id</extra>`
      }],{
        margin:{l:82,r:34,t:42,b:66},
        xaxis:{title:'Time',gridcolor:'#edf0f5',automargin:true,showline:true,linecolor:'#cfd7e5'},
        yaxis:{title:`Id (${scale.unit})`,gridcolor:'#edf0f5',automargin:true,showline:true,linecolor:'#cfd7e5'},
        hovermode:'x unified',dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
      },cleanPlotConfig);
      return;
    }

    Plotly.react('pulseRawPlot',[
      {
        x:r.raw.time,y:r.raw.voltage,mode:'lines',name:'Vd',line:{width:1.25},yaxis:'y',
        hovertemplate:'Time=%{x:.7g}<br>Vd=%{y:.7g} V<extra>Vd</extra>'
      },
      {
        x:r.raw.time,y:r.raw.current.map(v=>v*scale.factor),mode:'lines',name:'Id',line:{width:1.15},yaxis:'y2',
        hovertemplate:`Time=%{x:.7g}<br>Id=%{y:.7g} ${scale.unit}<extra>Id</extra>`
      }
    ],{
      margin:{l:82,r:34,t:54,b:66},
      xaxis:{title:'Time',anchor:'y2',gridcolor:'#edf0f5',zerolinecolor:'#cfd7e5',automargin:true,showline:true,linecolor:'#cfd7e5'},
      yaxis:{title:'Vd (V)',domain:[0.57,1],gridcolor:'#edf0f5',zerolinecolor:'#cfd7e5',automargin:true,showline:true,linecolor:'#cfd7e5'},
      yaxis2:{title:`Id (${scale.unit})`,domain:[0,0.42],gridcolor:'#edf0f5',zerolinecolor:'#cfd7e5',automargin:true,showline:true,linecolor:'#cfd7e5'},
      legend:{orientation:'h',x:0,xanchor:'left',y:1.10,yanchor:'bottom'},
      hovermode:'x unified',dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
    },cleanPlotConfig);
  }

  function renderPulseComparison(){
    const items=pulseVisibleResultItems();
    $('#pulseComparedSummary').textContent=`${items.length} 个已分析文件正在显示`;
    if(!items.length){
      emptyPulsePlot('pulseReadPlot','没有可显示的已分析文件');
      emptyPulsePlot('pulsePulsePlot','没有可显示的已分析文件');
      renderPulseResultTable();
      return;
    }

    const allCurrents=[];
    for(const item of items)allCurrents.push(...item.result.points.map(p=>p.readCurrent),...item.result.points.map(p=>p.pulseCurrent));
    const scale=currentPlotScale(allCurrents);
    const showLegend=items.length>1;
    const useVoltageX=items.every(item=>item.result.points.every(p=>pulseIsFiniteValue(p.pulseVoltage)));
    const xTitle=useVoltageX?'脉冲电压 (V)':'脉冲序号';
    const xValue=p=>useVoltageX?Number(p.pulseVoltage):(Number(p.sequence)||Number(p.index)+1);
    const readTraces=[];
    const pulseTraces=[];

    for(const item of items){
      const pts=item.result.points;
      const name=pulseItemLabel(item);
      readTraces.push({
        x:pts.map(xValue),
        y:pts.map(p=>p.readCurrent*scale.factor),
        mode:'lines+markers',name,marker:{size:6},line:{width:1.7},
        text:pts.map(p=>`Vread=${pulseIsFiniteValue(p.readVoltage)?Number(p.readVoltage).toPrecision(6)+' V':'未记录'}<br>Vpulse=${pulseIsFiniteValue(p.pulseVoltage)?Number(p.pulseVoltage).toPrecision(6)+' V':'未记录'}`),
        hovertemplate:`${escapeHtml(name)}<br>${useVoltageX?'Vpulse':'Pulse #'}=%{x}<br>Iread=%{y:.6g} ${scale.unit}<br>%{text}<extra></extra>`
      });
      pulseTraces.push({
        x:pts.map(xValue),
        y:pts.map(p=>p.pulseCurrent*scale.factor),
        mode:'lines+markers',name,marker:{size:6},line:{width:1.7},
        text:pts.map(p=>`Vpulse=${pulseIsFiniteValue(p.pulseVoltage)?Number(p.pulseVoltage).toPrecision(6)+' V':'未记录'}`),
        hovertemplate:`${escapeHtml(name)}<br>${useVoltageX?'Vpulse':'Pulse #'}=%{x}<br>Ipulse=%{y:.6g} ${scale.unit}<br>%{text}<extra></extra>`
      });
    }

    const config={responsive:true,displaylogo:false,displayModeBar:false,scrollZoom:true,doubleClick:'reset'};
    Plotly.react('pulseReadPlot',readTraces,pulseBaseLayout(`读取电流 (${scale.unit})`,showLegend,xTitle),config);
    Plotly.react('pulsePulsePlot',pulseTraces,pulseBaseLayout(`脉冲电流 (${scale.unit})`,showLegend,xTitle),config);
    renderPulseResultTable();

    requestAnimationFrame(()=>{
      for(const id of ['pulseReadPlot','pulsePulsePlot']){
        try{Plotly.Plots.resize($('#'+id));}catch{}
      }
    });
  }

  function pulseTableNumber(value,kind='number'){
    if(!pulseIsFiniteValue(value))return '';
    const n=Number(value);
    return kind==='current'?n.toExponential(8):n.toPrecision(9);
  }

  function renderPulseResultTable(){
    const items=pulseVisibleResultItems();
    const rows=[];
    for(const item of items)for(const d of item.result.points)rows.push({item,d});

    $('#pulseResultMeta').textContent=items.length
      ? `当前显示 ${items.length} 个文件、${rows.length} 个脉冲/读取对。未记录的电压保持为空，不会伪造数值。`
      : '没有可显示的已分析结果。';

    $('#pulseResultTable').innerHTML=`
      <thead><tr>
        <th>标签</th><th>源文件</th><th>#</th><th>分段</th>
        <th>Vpulse (V)</th><th>Ipulse (A)</th>
        <th>Vread (V)</th><th>Iread (A)</th>
        <th>Pulse time</th><th>Read time</th>
        <th>Pulse block</th><th>Read block</th>
      </tr></thead>
      <tbody>${rows.map(({item,d})=>`<tr>
        <td class="pulse-table-label">${escapeHtml(pulseItemLabel(item))}</td>
        <td class="pulse-table-source">${escapeHtml(item.name)}</td>
        <td>${d.sequence??d.index+1}</td>
        <td>${escapeHtml(pulseModeName(pulseResultMode(item.result)))}</td>
        <td>${pulseTableNumber(d.pulseVoltage)}</td>
        <td>${pulseTableNumber(d.pulseCurrent,'current')}</td>
        <td>${pulseTableNumber(d.readVoltage)}</td>
        <td>${pulseTableNumber(d.readCurrent,'current')}</td>
        <td>${pulseTableNumber(d.pulseTime)}</td>
        <td>${pulseTableNumber(d.readTime)}</td>
        <td>${d.pulseBlockIndex??''}</td>
        <td>${d.readBlockIndex??''}</td>
      </tr>`).join('')}</tbody>`;
  }

  function renderPulseBatchUi(){
    renderPulseFileList();
    renderPulseActiveEditor();
    $('#pulseResultScope').value=pulseAnalysisState.resultScope||'checked';
    renderPulseRawPlot();
    renderPulseComparison();
    requestAnimationFrame(()=>{
      for(const id of ['pulseRawPlot','pulseReadPlot','pulsePulsePlot']){
        try{Plotly.Plots.resize($('#'+id));}catch{}
      }
    });
  }

  function renderPulseAnalysisResult(){renderPulseBatchUi();}

  function pulseCsvValue(value){return pulseIsFiniteValue(value)?String(Number(value)):'';}

  function pulseReadCsvText(){
    const items=pulseVisibleResultItems();
    const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,read_voltage_V,read_current_A,read_time,read_block'];
    for(const item of items){
      for(const d of item.result.points)rows.push([
        csvCell(pulseItemLabel(item)),csvCell(item.name),d.sequence??d.index+1,pulseResultMode(item.result),
        pulseCsvValue(d.pulseVoltage),pulseCsvValue(d.readVoltage),pulseCsvValue(d.readCurrent),pulseCsvValue(d.readTime),d.readBlockIndex??''
      ].join(','));
    }
    return rows.join('\n');
  }

  function pulsePulseCsvText(){
    const items=pulseVisibleResultItems();
    const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,pulse_current_A,pulse_time,pulse_block'];
    for(const item of items){
      for(const d of item.result.points)rows.push([
        csvCell(pulseItemLabel(item)),csvCell(item.name),d.sequence??d.index+1,pulseResultMode(item.result),
        pulseCsvValue(d.pulseVoltage),pulseCsvValue(d.pulseCurrent),pulseCsvValue(d.pulseTime),d.pulseBlockIndex??''
      ].join(','));
    }
    return rows.join('\n');
  }

  function pulseRawCsvText(){
    const item=pulseActiveItem();
    const r=item?.result;
    if(!r)return '';
    const rows=['label,source_file,index,time,voltage_V,current_A'];
    const n=Math.max(r.raw.time.length,(r.raw.voltage||[]).length,r.raw.current.length);
    for(let i=0;i<n;i++)rows.push([
      csvCell(pulseItemLabel(item)),csvCell(item.name),i,
      pulseCsvValue(r.raw.time[i]),pulseCsvValue(r.raw.voltage?.[i]),pulseCsvValue(r.raw.current[i])
    ].join(','));
    return rows.join('\n');
  }

  function pulseResultCsvText(){
    const items=pulseVisibleResultItems();
    const rows=['label,source_file,index,segmentation_mode,pulse_voltage_V,pulse_current_A,read_voltage_V,read_current_A,pulse_time,read_time,pulse_block,read_block'];
    for(const item of items){
      for(const d of item.result.points)rows.push([
        csvCell(pulseItemLabel(item)),csvCell(item.name),d.sequence??d.index+1,pulseResultMode(item.result),
        pulseCsvValue(d.pulseVoltage),pulseCsvValue(d.pulseCurrent),pulseCsvValue(d.readVoltage),pulseCsvValue(d.readCurrent),
        pulseCsvValue(d.pulseTime),pulseCsvValue(d.readTime),d.pulseBlockIndex??'',d.readBlockIndex??''
      ].join(','));
    }
    return rows.join('\n');
  }

  async function exportPulseCsv(defaultName,content){
    if(!content)return;
    await window.electronAPI.saveText({defaultName,content,filters:[{name:'CSV',extensions:['csv']}]});
  }

  async function exportPulsePlotImage(plotId,baseName,format){
    if(!pulseVisibleResultItems().length&&plotId!=='pulseRawPlot')return;
    if(plotId==='pulseRawPlot'&&!pulseActiveItem()?.result)return;
    await savePlotlyImage(plotId,baseName,format);
  }


  function terLongCsvText(){
    const r=state.terMaxResult;if(!r)return '';
    const rows=['Vg_V,Vds_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,TER_percent,source_file'];
    for(const d of r.records)rows.push([d.vg,d.vds,d.iUp,d.iDown,d.rUp,d.rDown,d.ter,csvCell(d.sourceFile)].join(','));
    return rows.join('\n');
  }
  async function exportTerLong(){
    if(!state.terMaxResult)return;
    await window.electronAPI.saveText({defaultName:'TER_long.csv',content:terLongCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function terMatrixCsvText(){
    const r=state.terMaxResult;if(!r)return '';
    const rows=[['Vg_V',...r.targets].join(',')];
    r.vgs.forEach((vg,i)=>rows.push([vg,...r.matrix[i].map(v=>Number.isFinite(v)?v:'')].join(',')));
    return rows.join('\n');
  }
  async function exportTerMatrix(){
    if(!state.terMaxResult)return;
    await window.electronAPI.saveText({defaultName:'TER_matrix.csv',content:terMatrixCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function terMaxVgCsvText(){
    const r=state.terMaxResult;if(!r)return '';
    const rows=['Vg_V,TER_Max_Vg_percent,Vd_at_max_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,source_file'];
    for(const d of (r.terMaxByVg||r.terMax||[]))rows.push([d.vg,d.terMax,d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown,csvCell(d.sourceFile)].join(','));
    return rows.join('\n');
  }
  async function exportTerMaxVg(){
    if(!state.terMaxResult)return;
    await window.electronAPI.saveText({defaultName:'TER_Max-Vg.csv',content:terMaxVgCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function terMaxVdCsvText(){
    const r=state.terMaxResult;if(!r)return '';
    const rows=['Vd_V,TER_Max_Vd_percent,Vg_at_max_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,source_file'];
    for(const d of (r.terMaxByVd||[]))rows.push([d.vds,d.terMax,d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown,csvCell(d.sourceFile)].join(','));
    return rows.join('\n');
  }
  async function exportTerMaxVd(){
    if(!state.terMaxResult)return;
    await window.electronAPI.saveText({defaultName:'TER_Max-Vd.csv',content:terMaxVdCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }


  // ------------------------------------------------------------------
  // Gate-voltage physical analysis dashboard
  // ------------------------------------------------------------------
  function gateSeriesRows(key){
    const [dirS,label]=String(key||'').split('::');
    const direction=Number(dirS);
    if(!label||!Number.isFinite(direction))return [];
    const grouped=new Map();
    for(const p of state.peaks.filter(p=>p.accepted&&p.direction===direction&&peakLabel(p)===label)){
      if(!grouped.has(p.vg))grouped.set(p.vg,[]);
      grouped.get(p.vg).push(p);
    }
    const rows=[];
    for(const [vg,list] of grouped){
      const p=chooseRepresentativePeak(list);
      const sw=sweepById(p?.sweepId);
      if(!p||!sw)continue;
      const m=A.peakMetrics(p,sw);
      rows.push({
        vg,peak:p,
        v:p.v,i:p.i,
        fwhm:m.fwhm,
        hwhm:m.fwhm/2,
        amplitude:m.amplitude,
        baseline:m.baseline,
        area:m.area,
        prominence:Number(p.prominence),
        peakToBg:m.baseline>0?Math.abs(p.i)/m.baseline:NaN
      });
    }
    return rows.sort((a,b)=>a.vg-b.vg);
  }

  function gateOptionByKey(key){
    return acceptedSeriesOptions().find(o=>o.key===key)||null;
  }

  function gateDefaultSeries(){
    const opts=acceptedSeriesOptions();
    if(!opts.length)return {a:'',b:''};
    for(const direction of [1,-1]){
      const same=opts.filter(o=>o.direction===direction);
      if(same.length>=2)return {a:same[0].key,b:same[1].key};
    }
    return {a:opts[0]?.key||'',b:opts.find(o=>o.key!==opts[0]?.key)?.key||opts[0]?.key||''};
  }

  function gateHysteresisLabels(){
    const labels=[...new Set(state.peaks.filter(p=>p.accepted).map(p=>peakLabel(p)))];
    return labels.filter(label=>{
      const ps=state.peaks.filter(p=>p.accepted&&peakLabel(p)===label);
      return ps.some(p=>p.direction>0)&&ps.some(p=>p.direction<0);
    });
  }

  function populateGateAnalysisControls(){
    const opts=acceptedSeriesOptions();
    const markup=opts.map(o=>`<option value="${escapeHtml(o.key)}">${escapeHtml(o.name)}</option>`).join('');
    $('#gateSeriesA').innerHTML=markup;
    $('#gateSeriesB').innerHTML=markup;

    const valid=new Set(opts.map(o=>o.key));
    const defaults=gateDefaultSeries();
    if(!valid.has(state.gateAnalysisSettings.seriesA))state.gateAnalysisSettings.seriesA=defaults.a;
    if(!valid.has(state.gateAnalysisSettings.seriesB)||state.gateAnalysisSettings.seriesB===state.gateAnalysisSettings.seriesA){
      state.gateAnalysisSettings.seriesB=defaults.b;
    }
    $('#gateSeriesA').value=state.gateAnalysisSettings.seriesA;
    $('#gateSeriesB').value=state.gateAnalysisSettings.seriesB;

    const hLabels=gateHysteresisLabels();
    $('#gateHysteresisLabel').innerHTML=hLabels.map(label=>`<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join('');
    if(!hLabels.includes(state.gateAnalysisSettings.hysteresisLabel)){
      const aLabel=gateOptionByKey(state.gateAnalysisSettings.seriesA)?.label;
      state.gateAnalysisSettings.hysteresisLabel=hLabels.includes(aLabel)?aLabel:(hLabels[0]||'');
    }
    $('#gateHysteresisLabel').value=state.gateAnalysisSettings.hysteresisLabel;
    $('#gateWidthMode').value=state.gateAnalysisSettings.widthMode||'hwhm';
    $('#gateUseCarrierDensity').checked=!!state.gateAnalysisSettings.useCarrierDensity;
    $('#gateCg').value=Number.isFinite(Number(state.gateAnalysisSettings.cg))?state.gateAnalysisSettings.cg:'';
    $('#gateCnp').value=Number.isFinite(Number(state.gateAnalysisSettings.cnp))?state.gateAnalysisSettings.cnp:0;
  }

  function readGateAnalysisControls(){
    const num=id=>{
      const raw=$('#'+id).value.trim();
      if(raw==='')return null;
      const v=Number(raw);
      return Number.isFinite(v)?v:null;
    };
    state.gateAnalysisSettings={
      seriesA:$('#gateSeriesA').value||'',
      seriesB:$('#gateSeriesB').value||'',
      hysteresisLabel:$('#gateHysteresisLabel').value||'',
      widthMode:$('#gateWidthMode').value||'hwhm',
      useCarrierDensity:!!$('#gateUseCarrierDensity').checked,
      cg:num('gateCg'),
      cnp:num('gateCnp')??0
    };
  }


  function gateHysteresisRows(label){
    if(!label)return [];
    const up=gateSeriesRows(`1::${label}`),down=gateSeriesRows(`-1::${label}`);
    const u=new Map(up.map(r=>[String(r.vg),r]));
    const d=new Map(down.map(r=>[String(r.vg),r]));
    return [...u.keys()].filter(k=>d.has(k)).map(k=>{
      const a=u.get(k),b=d.get(k);
      return {
        vg:a.vg,
        forwardV:a.v,
        reverseV:b.v,
        deltaVR:a.v-b.v,
        absDeltaVR:Math.abs(a.v-b.v)
      };
    }).sort((a,b)=>a.vg-b.vg);
  }

  function ensureGateTerResult(){
    if(state.terMaxResult)return state.terMaxResult;
    try{
      const result=A.computeTerMatrix(terDatasetsForCurrentSettings(),state.terMaxSettings||{});
      state.terMaxResult=result;
      state.terMaxSettings={
        ...state.terMaxSettings,
        vmin:result.used.vmin,vmax:result.used.vmax,vstep:result.used.vstep,
        tolerance:result.used.tolerance,currentFloor:result.used.currentFloor
      };
      return result;
    }catch{
      return null;
    }
  }

  function computeGateAnalysis(){
    readGateAnalysisControls();
    const s=state.gateAnalysisSettings;
    const Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);
    const terResult=ensureGateTerResult();
    const terByVg=terResult?.terMaxByVg||terResult?.terMax||[];
    const rows=A.pairGateSeries(Arows,Brows,terByVg,s);
    const hysteresis=gateHysteresisRows(s.hysteresisLabel);
    const summary=A.summarizeGateRows(rows,hysteresis);

    const result={
      settings:{...s},
      seriesA:gateOptionByKey(s.seriesA),
      seriesB:gateOptionByKey(s.seriesB),
      Arows,Brows,rows,hysteresis,
      terResult,
      fits:summary.fits,
      correlations:summary.correlations
    };
    state.gateAnalysisResult=result;
    return result;
  }

  function gatePlotBase(xTitle,yTitle){
    return {
      margin:{l:72,r:28,t:24,b:60},
      xaxis:{title:xTitle,gridcolor:'#edf0f5',automargin:true},
      yaxis:{title:yTitle,gridcolor:'#edf0f5',automargin:true},
      hovermode:'closest',
      dragmode:'zoom',
      autosize:true,
      legend:{orientation:'h',y:-.20,x:0}
    };
  }

  function gatePlotConfig(name){
    return {
      responsive:true,scrollZoom:true,displaylogo:false,
      toImageButtonOptions:{format:'png',filename:name,width:1400,height:900,scale:2}
    };
  }

  function gateCorrelationStrength(r){
    if(!Number.isFinite(r))return '数据不足';
    const a=Math.abs(r);
    if(a>=.7)return '较强';
    if(a>=.4)return '中等';
    return '较弱';
  }

  function gateFmt(v,d=4){
    if(!Number.isFinite(Number(v)))return '—';
    const n=Number(v);
    if(Math.abs(n)>=1e4|| (Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);
    return n.toFixed(d);
  }

  function renderGateAnalysis(){
    $('#gateAnalysisProjectName').textContent=`项目：${activeProjectTitle()}`;
    populateGateAnalysisControls();
    const r=computeGateAnalysis();
    const rows=r.rows;
    const aName=r.seriesA?.name||'ridge A',bName=r.seriesB?.name||'ridge B';
    const colorA=r.seriesA?colorForPeakOrder(r.seriesA.order,r.seriesA.direction):COOL[0];
    const colorB=r.seriesB?colorForPeakOrder(r.seriesB.order,r.seriesB.direction):COOL[1];

    $('#gateAnalysisSummary').innerHTML=[
      `共同 Vg 点：${rows.length}`,
      `ridge A：${aName}`,
      `ridge B：${bName}`,
      `TER_Max–Vg：${r.terResult?'可用':'未能计算'}`,
      `回滞标签：${r.settings.hysteresisLabel||'无'}`
    ].map(t=>`<span class="ter-summary-chip">${escapeHtml(t)}</span>`).join('');

    Plotly.newPlot('gateResonancePlot',[
      {x:r.Arows.map(d=>d.vg),y:r.Arows.map(d=>d.v),mode:'lines+markers',name:aName,line:{color:colorA,width:2},marker:{color:colorA,size:7}},
      {x:r.Brows.map(d=>d.vg),y:r.Brows.map(d=>d.v),mode:'lines+markers',name:bName,line:{color:colorB,width:2},marker:{color:colorB,size:7}}
    ],gatePlotBase('Vg (V)','V_R (V)'),gatePlotConfig('gate_resonance_ridges'));

    Plotly.newPlot('gateV0Plot',[{
      x:rows.map(d=>d.vg),y:rows.map(d=>d.V0),mode:'lines+markers',name:'V0',marker:{size:7}
    }],gatePlotBase('Vg (V)','V0 (V)'),gatePlotConfig('V0_vs_Vg'));

    Plotly.newPlot('gateDeltaPlot',[
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.delta),mode:'lines+markers',name:'δ=(VB−VA)/2',marker:{size:7}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.absDelta),mode:'lines+markers',name:'|δ|',line:{dash:'dot'},marker:{size:6}}
    ],gatePlotBase('Vg (V)','δ (V)'),gatePlotConfig('delta_vs_Vg'));

    const widthMode=r.settings.widthMode==='fwhm'?'fwhm':'hwhm';
    const widthLabel=widthMode==='fwhm'?'FWHM':'HWHM';
    Plotly.newPlot('gateWidthPlot',[
      {x:rows.map(d=>d.vg),y:rows.map(d=>d[`${widthMode}A`]),mode:'lines+markers',name:`${widthLabel} A`,line:{color:colorA},marker:{size:6}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d[`${widthMode}B`]),mode:'lines+markers',name:`${widthLabel} B`,line:{color:colorB},marker:{size:6}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.deltaOverW),mode:'lines+markers',name:'|δ|/w_eff',yaxis:'y2',line:{dash:'dash'},marker:{size:6}}
    ],{
      ...gatePlotBase('Vg (V)',`${widthLabel} (V)`),
      yaxis2:{title:'|δ|/w_eff',overlaying:'y',side:'right',showgrid:false},
      margin:{l:72,r:72,t:24,b:60}
    },gatePlotConfig('width_and_delta_over_w'));

    const terRows=rows.filter(d=>Number.isFinite(d.terMax));
    Plotly.newPlot('gateTerMaxPlot',[{
      x:terRows.map(d=>d.vg),y:terRows.map(d=>d.terMax),mode:'lines+markers',name:'TER_max',marker:{size:7}
    }],gatePlotBase('Vg (V)','TER_max (%)'),gatePlotConfig('TERmax_vs_Vg'));

    Plotly.newPlot('gateVdStarPlot',[{
      x:terRows.map(d=>d.vg),y:terRows.map(d=>d.vStar),mode:'lines+markers',name:'Vd*',marker:{size:7}
    }],gatePlotBase('Vg (V)','Vd* (V)'),gatePlotConfig('Vd_star_vs_Vg'));

    const hy=r.hysteresis;
    Plotly.newPlot('gateHysteresisPlot',[
      {x:hy.map(d=>d.vg),y:hy.map(d=>d.forwardV),mode:'lines+markers',name:'正扫 V_R'},
      {x:hy.map(d=>d.vg),y:hy.map(d=>d.reverseV),mode:'lines+markers',name:'反扫 V_R'},
      {x:hy.map(d=>d.vg),y:hy.map(d=>d.absDeltaVR),mode:'lines+markers',name:'|ΔV_R|',yaxis:'y2',line:{dash:'dash'}}
    ],{
      ...gatePlotBase('Vg (V)','V_R (V)'),
      yaxis2:{title:'|ΔV_R| (V)',overlaying:'y',side:'right',showgrid:false},
      margin:{l:72,r:72,t:24,b:60}
    },gatePlotConfig('scan_hysteresis_vs_Vg'));

    const corrTer=rows.filter(d=>Number.isFinite(d.deltaOverW)&&Number.isFinite(d.terMax));
    Plotly.newPlot('gateTerCorrelationPlot',[{
      x:corrTer.map(d=>d.deltaOverW),y:corrTer.map(d=>d.terMax),
      mode:'markers+text',text:corrTer.map(d=>`${d.vg}V`),textposition:'top center',
      name:'data',marker:{size:9}
    }],gatePlotBase('|δ|/w_eff','TER_max (%)'),gatePlotConfig('TERmax_vs_delta_over_w'));

    const corrV=rows.filter(d=>Number.isFinite(d.V0)&&Number.isFinite(d.vStar));
    Plotly.newPlot('gateReadoutCorrelationPlot',[{
      x:corrV.map(d=>d.V0),y:corrV.map(d=>d.vStar),
      mode:'markers+text',text:corrV.map(d=>`${d.vg}V`),textposition:'top center',
      name:'data',marker:{size:9}
    }],gatePlotBase('V0 (V)','Vd* (V)'),gatePlotConfig('Vd_star_vs_V0'));

    Plotly.newPlot('gateAmplitudePlot',[
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeA),mode:'lines+markers',name:'A_A',line:{color:colorA}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeB),mode:'lines+markers',name:'A_B',line:{color:colorB}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.etaEff),mode:'lines+markers',name:'η_eff=A_A/(A_A+A_B)',yaxis:'y2',line:{dash:'dash'}}
    ],{
      ...gatePlotBase('Vg (V)','峰高 A (A)'),
      yaxis:{title:'峰高 A (A)',gridcolor:'#edf0f5',type:'log'},
      yaxis2:{title:'η_eff',overlaying:'y',side:'right',range:[0,1],showgrid:false},
      margin:{l:82,r:72,t:24,b:60}
    },gatePlotConfig('amplitude_and_effective_weight'));

    Plotly.newPlot('gateBackgroundPlot',[
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.baselineA),mode:'lines+markers',name:'局域背景 A',line:{color:colorA}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.baselineB),mode:'lines+markers',name:'局域背景 B',line:{color:colorB}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.peakToBgA),mode:'lines+markers',name:'|Ipk|/Ibg A',yaxis:'y2',line:{dash:'dash'}},
      {x:rows.map(d=>d.vg),y:rows.map(d=>d.peakToBgB),mode:'lines+markers',name:'|Ipk|/Ibg B',yaxis:'y2',line:{dash:'dot'}}
    ],{
      ...gatePlotBase('Vg (V)','局域背景电流 (A)'),
      yaxis:{title:'局域背景电流 (A)',gridcolor:'#edf0f5',type:'log'},
      yaxis2:{title:'|Ipk| / Ibg',overlaying:'y',side:'right',showgrid:false},
      margin:{l:82,r:72,t:24,b:60}
    },gatePlotConfig('background_and_peak_to_background'));

    const densityCard=$('.gate-density-card');
    if(r.settings.useCarrierDensity&&Number.isFinite(Number(r.settings.cg))&&Number(r.settings.cg)>0){
      densityCard.classList.remove('disabled');
      const nr=rows.filter(d=>Number.isFinite(d.ng_cm2));
      Plotly.newPlot('gateDensityPlot',[
        {x:nr.map(d=>d.ng_cm2),y:nr.map(d=>d.absDelta),mode:'lines+markers',name:'|δ|',marker:{size:7}},
        {x:nr.filter(d=>Number.isFinite(d.terMax)).map(d=>d.ng_cm2),y:nr.filter(d=>Number.isFinite(d.terMax)).map(d=>d.terMax),mode:'lines+markers',name:'TER_max',yaxis:'y2',marker:{size:7}}
      ],{
        ...gatePlotBase('n_g (cm⁻²)','|δ| (V)'),
        xaxis:{title:'n_g (cm⁻²)',gridcolor:'#edf0f5',exponentformat:'e'},
        yaxis2:{title:'TER_max (%)',overlaying:'y',side:'right',showgrid:false},
        margin:{l:82,r:72,t:24,b:60}
      },gatePlotConfig('delta_TER_vs_carrier_density'));
    }else{
      densityCard.classList.add('disabled');
      Plotly.purge($('#gateDensityPlot'));
      $('#gateDensityPlot').innerHTML='<div class="empty-state">填写 Cg 和 VCNP 并启用 n_g 后绘制。此转换仅为单栅电容近似。</div>';
    }

    renderGateAnalysisReport(r);
    renderGateAnalysisTable(r);
    captureActiveProjectTab();
  }

  function renderGateAnalysisReport(r){
    const rows=r.rows;
    const report=$('#gateAnalysisReport');
    if(!rows.length){
      report.innerHTML='<div class="empty-state">两条所选 ridge 没有共同的 Vg 点，无法生成物理分析。</div>';
      return;
    }
    const vgMin=Math.min(...rows.map(d=>d.vg)),vgMax=Math.max(...rows.map(d=>d.vg));
    const v0Fit=r.fits.V0,deltaFit=r.fits.deltaAbs,terFit=r.fits.terMax;
    const rTer=r.correlations.terVsDeltaOverW;
    const rRead=r.correlations.vStarVsV0;
    const deltaVals=rows.map(d=>d.absDelta).filter(Number.isFinite);
    const ratioVals=rows.map(d=>d.deltaOverW).filter(Number.isFinite);
    const etaVals=rows.map(d=>d.etaEff).filter(Number.isFinite);
    const terVals=rows.map(d=>d.terMax).filter(Number.isFinite);

    const range=a=>a.length?[Math.min(...a),Math.max(...a)]:[NaN,NaN];
    const [dMin,dMax]=range(deltaVals),[qMin,qMax]=range(ratioVals),[etaMin,etaMax]=range(etaVals),[terMin,terMax]=range(terVals);

    const section=(badge,badgeClass,title,body,metrics=[])=>`
      <div class="gate-report-section">
        <div class="gate-report-title"><span class="gate-report-badge ${badgeClass}">${escapeHtml(badge)}</span>${escapeHtml(title)}</div>
        ${metrics.length?`<div class="gate-report-metrics">${metrics.map(m=>`<span class="gate-report-metric">${escapeHtml(m)}</span>`).join('')}</div>`:''}
        <div>${body}</div>
      </div>`;

    const parts=[];
    parts.push(section('数据','numeric','分析范围',
      `当前报告基于两条已采纳 ridge 的共同栅压点。所有“峰位、峰宽、峰高”均来自当前软件中已确认的峰；TER_max 来自同一 Vd 下正/反扫电阻 TER 矩阵。`,
      [`Vg=${gateFmt(vgMin)} ~ ${gateFmt(vgMax)} V`,`共同点 n=${rows.length}`]));

    parts.push(section('V0','numeric','共模能带/静电漂移',
      v0Fit
        ? `V0 对 Vg 的线性斜率为 ${gateFmt(v0Fit.slope,6)} V/V，R²=${gateFmt(v0Fit.r2,3)}。这个量首先反映两条所选共振轨迹的共同平移；它可以与普通静电势、graphene 化学势/掺杂变化相关，但仅凭 V0(Vg) 不能把原因唯一归结为某一种机制。`
        : `V0 数据点不足，暂时不能评估其栅压趋势。`,
      v0Fit?[`dV0/dVg=${gateFmt(v0Fit.slope,6)}`,`R²=${gateFmt(v0Fit.r2,3)}`]:[]));

    parts.push(section('δ','numeric','有效共振分裂',
      deltaFit
        ? `|δ| 的范围为 ${gateFmt(dMin)} ~ ${gateFmt(dMax)} V，对 Vg 的线性斜率为 ${gateFmt(deltaFit.slope,6)} V/V。若两条 ridge 的物理归属确实对应两个铁电状态，这个量可作为“有效共振分裂”随栅压变化的实验指标；它不是裸极化电压，也不是 coercive voltage。`
        : `有效分裂数据不足。`,
      [`|δ| range=${gateFmt(dMin)}~${gateFmt(dMax)} V`,deltaFit?`d|δ|/dVg=${gateFmt(deltaFit.slope,6)}`:''] .filter(Boolean)));

    parts.push(section('|δ|/w','numeric','共振可分辨度',
      `程序使用两峰平均 HWHM 定义 w_eff，并计算 |δ|/w_eff。当前范围为 ${gateFmt(qMin)} ~ ${gateFmt(qMax)}。这个比值下降时，即使 |δ| 没有明显减小，也可能因为峰展宽而使 resonant TER 的可分辨度下降。`,
      [`|δ|/w=${gateFmt(qMin)}~${gateFmt(qMax)}`]));

    if(Number.isFinite(rTer)){
      parts.push(section(Math.abs(rTer)>=.4?'关联':'弱关联',Math.abs(rTer)>=.4?'support':'caution','TER_max 与 |δ|/w',
        `在 ${rows.filter(d=>Number.isFinite(d.terMax)&&Number.isFinite(d.deltaOverW)).length} 个共同数据点上，Pearson r=${gateFmt(rTer,3)}，属于${gateCorrelationStrength(rTer)}相关。该相关性可以检验“TER 由分裂/峰宽相对尺度控制”的假设，但相关本身不证明因果；局域背景、有效权重和动态切换仍可能同时参与。`,
        [`r=${gateFmt(rTer,3)}`,`TER_max range=${gateFmt(terMin,2)}~${gateFmt(terMax,2)} %`]));
    }else{
      parts.push(section('缺失','missing','TER_max 与 |δ|/w','当前没有足够的 TER_max 与峰宽共同数据点，无法做相关性判断。'));
    }

    if(Number.isFinite(rRead)){
      parts.push(section(Math.abs(rRead)>=.4?'关联':'弱关联',Math.abs(rRead)>=.4?'support':'caution','最佳读出偏压与 V0',
        `Vd* 与 V0 的 Pearson r=${gateFmt(rRead,3)}，属于${gateCorrelationStrength(rRead)}相关。若 Vd* 主要跟随 V0，说明最佳读出窗口的漂移与共模能带平移具有一致趋势；仍需同时检查 |Vd*−V0|，不能由 Vd* 的绝对位置单独判断铁电作用变强或变弱。`,
        [`r=${gateFmt(rRead,3)}`]));
    }else{
      parts.push(section('缺失','missing','最佳读出偏压与 V0','没有足够共同数据点用于 Vd*–V0 相关分析。'));
    }

    parts.push(section('权重','caution','峰高与有效电学权重',
      `η_eff=A_A/(A_A+A_B) 的当前范围为 ${gateFmt(etaMin,3)} ~ ${gateFmt(etaMax,3)}。它只被作为“有效电学权重”指标，不直接等同于 AB/BA 畴面积，因为局域透射率本身也可能随 Vg 改变。`,
      [`η_eff=${gateFmt(etaMin,3)}~${gateFmt(etaMax,3)}`]));

    if(r.hysteresis.length){
      const hVals=r.hysteresis.map(d=>d.absDeltaVR).filter(Number.isFinite);
      const [hMin,hMax]=range(hVals);
      parts.push(section('回滞','caution','扫描历史依赖',
        `所选标签“${escapeHtml(r.settings.hysteresisLabel)}”的正/反扫峰位差 |ΔV_R| 范围为 ${gateFmt(hMin)} ~ ${gateFmt(hMax)} V。该量表征扫描历史依赖/峰位回滞，但不是 Vc+、Vc− 或真正的铁电 switching voltage。`,
        [`|ΔV_R|=${gateFmt(hMin)}~${gateFmt(hMax)} V`]));
    }else{
      parts.push(section('缺失','missing','扫描历史依赖','当前所选峰标签没有足够的正/反扫共同 Vg 点。'));
    }

    parts.push(section('Vc','missing','切换电压 / step 分析',
      `当前工程没有独立的“switching step / jump”对象或人工 Vc 标注，因此本页面不从共振峰位置伪造 Vc+、Vc− 或 ΔV_H。要研究畴壁解钉扎和切换能垒，应在后续加入独立 step 标注/锁定功能后再绘制 V_step(Vg)、ΔI_step(Vg) 和 Vc±(Vg)。`));

    if(r.settings.useCarrierDensity&&Number.isFinite(Number(r.settings.cg))&&Number(r.settings.cg)>0){
      parts.push(section('n_g','caution','载流子浓度近似',
        `已使用 n_g=C_g(V_g−V_CNP)/e 做单栅电容换算。该结果适合做 δ(n_g)、TER_max(n_g) 的一阶展示，但上下 graphene 的实际电荷密度可能不同，严格机制解释仍需要双层 graphene 的自洽静电/量子电容模型。`));
    }

    report.innerHTML=parts.join('');
  }

  function renderGateAnalysisTable(r){
    const rows=r.rows;
    $('#gateAnalysisTable').innerHTML=`
      <thead><tr>
        <th>Vg</th><th>V_A</th><th>V_B</th><th>V0</th><th>δ</th><th>|δ|</th>
        <th>HWHM_A</th><th>HWHM_B</th><th>|δ|/w_eff</th>
        <th>A_A</th><th>A_B</th><th>η_eff</th>
        <th>Ibg_A</th><th>Ibg_B</th><th>|Ipk|/Ibg_A</th><th>|Ipk|/Ibg_B</th>
        <th>TER_max</th><th>Vd*</th><th>n_g (cm⁻²)</th>
      </tr></thead>
      <tbody>${rows.map(d=>`<tr>
        <td>${gateFmt(d.vg)}</td><td>${gateFmt(d.vA,6)}</td><td>${gateFmt(d.vB,6)}</td>
        <td>${gateFmt(d.V0,6)}</td><td>${gateFmt(d.delta,6)}</td><td>${gateFmt(d.absDelta,6)}</td>
        <td>${gateFmt(d.hwhmA,6)}</td><td>${gateFmt(d.hwhmB,6)}</td><td>${gateFmt(d.deltaOverW,5)}</td>
        <td>${gateFmt(d.amplitudeA,6)}</td><td>${gateFmt(d.amplitudeB,6)}</td><td>${gateFmt(d.etaEff,5)}</td>
        <td>${gateFmt(d.baselineA,6)}</td><td>${gateFmt(d.baselineB,6)}</td>
        <td>${gateFmt(d.peakToBgA,5)}</td><td>${gateFmt(d.peakToBgB,5)}</td>
        <td>${gateFmt(d.terMax,5)}</td><td>${gateFmt(d.vStar,6)}</td><td>${gateFmt(d.ng_cm2,4)}</td>
      </tr>`).join('')}</tbody>`;
  }

  function gateAnalysisCsv(){
    const r=state.gateAnalysisResult;if(!r)return '';
    const cols=[
      'Vg_V','V_A_V','V_B_V','V0_V','delta_signed_V','delta_abs_V',
      'FWHM_A_V','FWHM_B_V','HWHM_A_V','HWHM_B_V','w_eff_HWHM_V','delta_over_w',
      'Ipk_A_A','Ipk_B_A','amplitude_A_A','amplitude_B_A','amplitude_ratio_A_over_B','eta_eff',
      'local_background_A_A','local_background_B_A','peak_to_background_A','peak_to_background_B',
      'TER_max_percent','Vd_at_TER_max_V','ng_cm-2'
    ];
    const lines=[cols.join(',')];
    for(const d of r.rows){
      lines.push([
        d.vg,d.vA,d.vB,d.V0,d.delta,d.absDelta,d.fwhmA,d.fwhmB,d.hwhmA,d.hwhmB,d.hwhmEff,d.deltaOverW,
        d.iA,d.iB,d.amplitudeA,d.amplitudeB,d.amplitudeRatio,d.etaEff,d.baselineA,d.baselineB,d.peakToBgA,d.peakToBgB,
        d.terMax,d.vStar,d.ng_cm2
      ].map(v=>Number.isFinite(Number(v))?v:'').join(','));
    }
    return lines.join('\n');
  }

  function gateReportMarkdown(){
    const r=state.gateAnalysisResult;
    if(!r)return '# 栅压物理分析\n\n暂无分析结果。\n';
    const rows=r.rows;
    const f=r.fits,c=r.correlations;
    const lines=[
      '# 栅压物理分析报告',
      '',
      `- 项目：${activeProjectTitle()}`,
      `- ridge A：${r.seriesA?.name||'—'}`,
      `- ridge B：${r.seriesB?.name||'—'}`,
      `- 共同 Vg 数据点：${rows.length}`,
      '',
      '## 1. 共振中心 V0',
      f.V0?`V0(Vg) 线性斜率 = ${gateFmt(f.V0.slope,7)} V/V，R² = ${gateFmt(f.V0.r2,4)}。`:'数据不足。',
      '',
      '## 2. 有效分裂 δ',
      f.deltaAbs?`|δ|(Vg) 线性斜率 = ${gateFmt(f.deltaAbs.slope,7)} V/V。δ=(VB−VA)/2；用于可分辨度时使用 |δ|。`:'数据不足。',
      '',
      '## 3. 峰宽与可分辨度',
      'w_eff 使用两峰 HWHM 的平均值，分析量为 |δ|/w_eff。',
      '',
      '## 4. TER_max 关联',
      Number.isFinite(c.terVsDeltaOverW)?`Pearson r[TER_max, |δ|/w] = ${gateFmt(c.terVsDeltaOverW,4)}（${gateCorrelationStrength(c.terVsDeltaOverW)}相关）。`:'共同数据不足。',
      '',
      '## 5. 最佳读出偏压',
      Number.isFinite(c.vStarVsV0)?`Pearson r[Vd*, V0] = ${gateFmt(c.vStarVsV0,4)}（${gateCorrelationStrength(c.vStarVsV0)}相关）。`:'共同数据不足。',
      '',
      '## 6. 峰高/有效权重',
      'η_eff=A_A/(A_A+A_B) 仅作为有效电学权重，不直接等同于畴面积。',
      '',
      '## 7. 回滞与切换',
      `当前回滞标签：${r.settings.hysteresisLabel||'—'}。ΔV_R 仅代表正/反扫峰位差，不自动等同于 coercive voltage。`,
      '当前软件尚无独立 switching-step / Vc 标注，因此本报告不伪造 Vc+、Vc− 或 ΔV_H。',
      '',
      '## 8. 载流子浓度',
      r.settings.useCarrierDensity&&Number.isFinite(Number(r.settings.cg))&&Number(r.settings.cg)>0
        ? `使用 n_g=C_g(V_g−V_CNP)/e 的单栅电容近似；Cg=${r.settings.cg} F/m²，V_CNP=${r.settings.cnp} V。`
        : '未启用 n_g 换算。',
      '',
      '## 解释边界',
      '- V0 的变化首先是共模轨迹平移，不唯一对应某一种掺杂或静电机制。',
      '- δ 是有效共振分裂，不是裸极化电压、势垒差或 coercive voltage。',
      '- TER_max 与 |δ|/w 的相关性可以支持或削弱某个机制假设，但不能单独证明因果。',
      '- 峰高比/η_eff 不能直接当作 AB/BA 畴面积比例。',
      '- 真正的 Vc/step 分析需要独立切换点标注。',
      ''
    ];
    return lines.join('\n');
  }

  async function exportGateAnalysisCsv(){
    if(!state.gateAnalysisResult)renderGateAnalysis();
    await window.electronAPI.saveText({
      defaultName:'gate_physics_analysis.csv',
      content:gateAnalysisCsv(),
      filters:[{name:'CSV',extensions:['csv']}]
    });
  }

  async function exportGateAnalysisReport(){
    if(!state.gateAnalysisResult)renderGateAnalysis();
    await window.electronAPI.saveText({
      defaultName:'gate_physics_analysis_report.md',
      content:gateReportMarkdown(),
      filters:[{name:'Markdown',extensions:['md']},{name:'Text',extensions:['txt']}]
    });
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

  function renderSubplotLegend(host,traces,mode='series'){
    if(!host)return;
    if(!traces.length){
      host.innerHTML='<span class="muted">无可显示序列</span>';
      return;
    }
    host.innerHTML=traces.map(t=>{
      const c=traceColor(t);
      const reverse=t?.line?.dash==='dash';
      const glyph=mode==='paired'
        ? `<span class="ter-pair-glyph"><i class="trend-legend-dot" style="background:${t._forwardColor||c}"></i><i class="trend-legend-dot ring" style="border-color:${t._reverseColor||c}"></i></span>`
        : `<i class="trend-legend-line ${reverse?'reverse':''}" style="color:${c}"></i>`;
      return `<span class="trend-legend-chip">${glyph}<span>${escapeHtml(t.name||'')}</span></span>`;
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
        renderSubplotLegend(legend,traces,result.legendMode||'series');
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

  function trendCsvText(title,key,model){
    const rows=key==='ter_peak'
      ? ['series,label,direction,Vg,TER_percent,Vd_at_resonant_TER_V,I_forward_A,I_reverse_A,R_forward_ohm,R_reverse_ohm,anchor_direction,candidate_count']
      : ['series,label,direction,Vg,value'];
    if(key==='ter_peak'){
      for(const s of model.terSeries)for(const d of s.points)rows.push([
        csvCell(s.name),csvCell(s.label),'paired',d.vg,d.ter,d.vdAtTer,
        d.forwardI,d.reverseI,d.rUp,d.rDown,
        d.anchorDirection>0?'forward':'reverse',d.candidateCount
      ].join(','));
    }else{
      for(const s of model.series)for(const d of s.points)rows.push([csvCell(s.name),csvCell(s.label),s.direction>0?'forward':'reverse',d.vg,d[key]].join(','));
    }
    return rows.join('\n');
  }
  async function exportTrendCsv(title,key,model){
    await window.electronAPI.saveText({defaultName:`${safeName(title)}.csv`,content:trendCsvText(title,key,model),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function mainCsvText(){
    const rows=['file,Vg,scan_direction,Vd,I'];
    for(const sw of state.sweeps.filter(isSweepVisible))for(const p of sw.points)rows.push([csvCell(sw.datasetName),sw.vg,sw.direction>0?'forward':'reverse',p.v,p.i].join(','));
    return rows.join('\n');
  }
  async function exportMainCsv(){
    await window.electronAPI.saveText({defaultName:'all_visible_IV_data.csv',content:mainCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }

  function peaksCsvText(){
    const rows=['file,Vg,scan_direction,accepted,locked,peak_order,peak_label,physical_code,physical_type,marker_color,marker_shape,primary_algorithm,algorithms,confidence,projection_method,Vpk,Ipk,FWHM,amplitude,area'];
    const ph=physicalAnalysis();
    for(const p of state.peaks){
      const sw=sweepById(p.sweepId); if(!sw)continue; const m=A.peakMetrics(p,sw);
      const pr=ph.peakMap.get(p.id);
      rows.push([csvCell(sw.datasetName),p.vg,p.direction>0?'forward':'reverse',p.accepted,p.locked,p.peakOrder,csvCell(peakLabel(p)),pr?.code||'Q',csvCell(pr?.type||'待定'),peakColor(p),algorithmMetaForPeak(p).symbol,p.primaryAlgorithm,csvCell((p.supportChannels||p.algorithms||[]).join('|')),p.confidence??'',csvCell(p.projectionMethod||''),p.v,p.i,m.fwhm,m.amplitude,m.area].join(','));
    }
    return rows.join('\n');
  }
  async function exportPeaks(){
    await window.electronAPI.saveText({defaultName:'peak_parameters.csv',content:peaksCsvText(),filters:[{name:'CSV',extensions:['csv']}]});
  }
  function zoomCsvText(){
    if(!state.zoomChart)return '';
    const rows=['series,Vg,value'];
    for(const t of state.zoomChart.traces)for(let i=0;i<t.x.length;i++)rows.push([csvCell(t.name),t.x[i],t.y[i]].join(','));
    return rows.join('\n');
  }

  async function exportSvg(node,name){const clone=node.cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');const text=new XMLSerializer().serializeToString(clone);await window.electronAPI.saveText({defaultName:name,content:text,filters:[{name:'SVG',extensions:['svg']}]});}

  async function exportMainPng(){
    const svg=$('#mainPlot');
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const rect=svg.getBoundingClientRect();
    const width=Math.max(800,Math.round(rect.width||1400));
    const height=Math.max(500,Math.round(rect.height||900));
    clone.setAttribute('width',width); clone.setAttribute('height',height);
    const text=new XMLSerializer().serializeToString(clone);
    const blob=new Blob([text],{type:'image/svg+xml;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    try{
      const img=new Image();
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
      const scale=2;
      const canvas=document.createElement('canvas');
      canvas.width=width*scale;canvas.height=height*scale;
      const ctx=canvas.getContext('2d');
      ctx.scale(scale,scale);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
      const dataUrl=canvas.toDataURL('image/png');
      const base64=dataUrl.split(',')[1];
      const saved=await window.electronAPI.saveBase64({defaultName:'dk_data_main.png',base64,filters:[{name:'PNG Image',extensions:['png']}]});
      if(saved)setStatus(`主图 PNG 已导出：${saved}`);
    }finally{URL.revokeObjectURL(url);}
  }

  function currentMainViewCsvText(){
    const provider=activeMainViewProvider();
    if(provider?.csvText){
      try{return String(provider.csvText({state,context:pluginUiContext()})||'');}
      catch(err){setStatus(`主图数据导出失败：${err.message}`);return '';}
    }
    return !window.DKDSPlugins?mainCsvText():'';
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
    if(!provider&&!window.DKDSPlugins)return exportSvg($('#mainPlot'),'dk_data_main.svg');
    setStatus('当前主图插件没有提供 SVG 导出。');
    return false;
  }

  async function exportCurrentMainPng(){
    const provider=activeMainViewProvider();
    if(provider?.exportPng)return provider.exportPng({state,context:pluginUiContext()});
    if(!provider&&!window.DKDSPlugins)return exportMainPng();
    setStatus('当前主图插件没有提供 PNG 导出。');
    return false;
  }


  function cloneProjectCache(value){
    if(value===null||value===undefined)return value;
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  }

  function serializePulseAnalysisState(){
    return {
      activeId:pulseAnalysisState.activeId,
      resultScope:pulseAnalysisState.resultScope||'checked',
      files:pulseAnalysisState.files.map(item=>({
        id:item.id,
        path:item.path,
        name:item.name,
        size:item.size,
        label:item.label,
        checked:item.checked,
        text:item.text,
        encoding:item.encoding,
        settings:{...(item.settings||{})},
        analyzed:!!item.result,
        analyzedAt:item.analyzedAt||null,
        result:item.result?cloneProjectCache(item.result):null
      }))
    };
  }

  function restorePulseAnalysisState(saved){
    const restored=createPulseAnalysisState();
    if(!saved||!Array.isArray(saved.files))return restored;
    restored.resultScope=saved.resultScope==='active'?'active':'checked';

    for(const source of saved.files){
      try{
        const inspection=A.inspectDataText({
          name:source.name,path:source.path,text:source.text||'',encoding:source.encoding||'auto'
        },A.defaultImportOptions());
        const item={
          id:source.id||`pulse::${Date.now()}::${Math.random().toString(36).slice(2,8)}`,
          path:source.path||source.name,
          name:source.name||'pulse-data',
          size:Number(source.size)||0,
          label:source.label||String(source.name||'').replace(/\.[^.]+$/,''),
          checked:source.checked!==false,
          text:source.text||'',
          encoding:source.encoding||'auto',
          inspection,
          settings:{...defaultPulseItemSettings(inspection),...(source.settings||{})},
          result:source.result?cloneProjectCache(source.result):null,
          error:'',loading:false,analyzedAt:source.analyzedAt||null
        };
        if(source.analyzed&&!item.result)analyzePulseItem(item);
        restored.files.push(item);
      }catch(err){}
    }
    restored.activeId=restored.files.some(f=>f.id===saved.activeId)
      ? saved.activeId
      : restored.files[0]?.id||null;
    return restored;
  }

  function makeProject(){
    if(state.groupPanelMode==='floating')captureGroupFloatRect();
    if(state.inspectorPanelMode==='floating')captureInspectorFloatRect();
    return {
      version:'3.41.6',
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
      scanVisibility:[...state.scanVisibility.entries()],
      peaks:state.peaks,
      peakCategories:state.peakCategories,
      algorithms:state.algorithms,
      physicsShowLabels:state.physicsShowLabels,
      spacingSettings:{...state.spacingSettings},
      terMaxSettings:{...state.terMaxSettings},
      terHeatmapDisplay:{...state.terHeatmapDisplay},
      terMaxResult:state.terMaxResult?cloneProjectCache(state.terMaxResult):null,
      gateAnalysisSettings:{...state.gateAnalysisSettings},
      transformPreviewByDataset:[...state.transformPreviewByDataset.entries()],
      dataModel:window.DKDSData.serializeStore(state.artifactStore,{includeTransient:false}),
      plugins:window.DKDSPlugins?.project?.serialize?.(activeProjectTab()?.pluginState||{})||activeProjectTab()?.pluginState||{},
      panelLayout:{
        groupPanelMode:state.groupPanelMode,
        groupPanelCollapsed:state.groupPanelCollapsed,
        groupPanelDockHeight:state.groupPanelDockHeight,
        groupPanelFloatRect:state.groupPanelFloatRect,
        inspectorPanelMode:state.inspectorPanelMode,
        inspectorDockWidth:state.inspectorDockWidth,
        inspectorFloatRect:state.inspectorFloatRect
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
  function migratePeak(p){
    const q={...p};
    if(!Number.isFinite(Number(q.peakOrder))){
      const m=String(q.group||'').match(/(\d+)/); q.peakOrder=m?Number(m[1]):null;
    }
    if(!q.peakLabel){
      const old=String(q.group||'');
      q.peakLabel=(old && !old.startsWith('自动-') && old!=='手动')?old:(q.peakOrder?defaultPeakLabel(q.peakOrder):'');
    }
    q.customColor=null; // v2.4: category palette is authoritative
    return q;
  }
  function loadProjectIntoActive(pr,path){
    state.datasets=(pr.datasets||[]).flatMap(d=>{
      if(Array.isArray(d.points)&&d.points.length){
        return [{
          ...d,
          sourcePath:d.sourcePath||d.path,
          sourceName:d.sourceName||d.name,
          points:d.points.map((p,i)=>({...p,index:i}))
        }];
      }
      return [A.parseCsv({name:d.name,path:d.path,text:d.text})];
    });
    state.algorithms=normalizedDetectionSettings(pr.algorithms||A.preset('balanced'));
    rebuildSweeps();

    if(pr.scanVisibility){
      state.scanVisibility=new Map(pr.scanVisibility.map(([k,v])=>[k,{forward:!!v.forward,reverse:!!v.reverse}]));
    }else{
      const oldVisible=new Set(pr.visibleDatasets||state.datasets.map(d=>d.path));
      state.scanVisibility=new Map(state.datasets.map(d=>[d.path,{forward:oldVisible.has(d.path),reverse:oldVisible.has(d.path)}]));
    }

    state.peakCategories=(pr.peakCategories||[]).map(c=>({order:Number(c.order),label:String(c.label||defaultPeakLabel(c.order))}));
    state.peaks=(pr.peaks||[]).map(migratePeak);
    normalizePeakMetadata();
    state.trendColumns=loadTrendColumnsPreference();
    state.projectPath=path||null;
    state.physicsShowLabels=pr.physicsShowLabels!==false;
    state.spacingSettings={...(pr.spacingSettings||{seriesA:'',seriesB:'',mode:'abs'})};
    state.spacingResult=[];
    state.terMaxSettings={...(pr.terMaxSettings||{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false})};
    state.terHeatmapDisplay={...(pr.terHeatmapDisplay||{colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null})};
    state.terMaxResult=pr.terMaxResult?cloneProjectCache(pr.terMaxResult):null;
    state.gateAnalysisSettings={...(pr.gateAnalysisSettings||{seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0})};
    state.gateAnalysisResult=null;
    state.transformPreviewByDataset=new Map(pr.transformPreviewByDataset||[]);
    state.artifactStore=window.DKDSData.restoreStore(pr.dataModel||{schema:1,artifacts:[]});
    const artifactTab=activeProjectTab();
    if(artifactTab)artifactTab.artifactStore=state.artifactStore;
    syncLegacyArtifacts({emit:false});

    // Preserve plugin blobs even when their plugin is currently disabled.
    // Active plugin slices overwrite only their own namespace on the next save.
    const currentTab=activeProjectTab();
    if(currentTab)currentTab.pluginState=JSON.parse(JSON.stringify(pr.plugins||{}));

    // Plugin-owned project state. v3.14 pulseAnalysis is passed as legacyProject
    // so the pulse plugin can migrate old projects without core knowing its schema.
    if(window.DKDSPlugins?.project?.restore){
      window.DKDSPlugins.project.restore(pr.plugins||{},pr);
    }else{
      pulseAnalysisState=restorePulseAnalysisState(pr.pulseAnalysis);
      const activeTab=activeProjectTab();
      if(activeTab)activeTab.pulseAnalysisState=pulseAnalysisState;
    }

    const panelLayout=pr.panelLayout||{};
    state.groupPanelMode=panelLayout.groupPanelMode||'docked';
    state.groupPanelCollapsed=!!panelLayout.groupPanelCollapsed;
    state.groupPanelDockHeight=Number(panelLayout.groupPanelDockHeight)||360;
    state.groupPanelFloatRect=panelLayout.groupPanelFloatRect||null;
    state.inspectorPanelMode=panelLayout.inspectorPanelMode||'right';
    state.inspectorDockWidth=Number(panelLayout.inspectorDockWidth)||390;
    state.inspectorFloatRect=panelLayout.inspectorFloatRect||null;

    state.selectedPeakId=null;
    state.selectedSweepId=null;
    state.selectedPeakIds=new Set();
    state.undo=[];
    clearMainView(false);
    if($('#showPhysicsLabels'))$('#showPhysicsLabels').checked=state.physicsShowLabels;
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
  const systemUndo=()=>{const edit=window.DKDSPlugins?.edit;if(edit?.activePlugin?.()){if(edit.supports?.('undo'))return edit.invoke('undo');setStatus('当前插件没有可撤销的编辑。');return false;}return undo();};
  const systemDeselect=()=>{const edit=window.DKDSPlugins?.edit;if(edit?.activePlugin?.()){if(edit.supports?.('deselect'))return edit.invoke('deselect');setStatus('当前插件没有活动选择。');return false;}return deselect();};
  $('#undoBtn').onclick=systemUndo; $('#deselectBtn').onclick=systemDeselect;

  document.querySelectorAll('.analysis-page-close').forEach(b=>b.onclick=()=>{if(IS_AUXILIARY_WINDOW)window.electronAPI?.closeCurrentWindow?.();else closeAnalysisPage(b.dataset.analysisTarget);});


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

  function ensurePeakVisibleInMain(p){
    if(!p)return;
    if(state.mainView.xDomain){
      const [a,b]=state.mainView.xDomain;
      const lo=Math.min(a,b),hi=Math.max(a,b),span=Math.max(hi-lo,0.08);
      if(p.v<lo||p.v>hi)state.mainView.xDomain=[p.v-span/2,p.v+span/2];
    }
    if(state.mainView.yDomain){
      const [a,b]=state.mainView.yDomain;
      const lo=Math.min(a,b),hi=Math.max(a,b),span=Math.max(hi-lo,Math.abs(p.i)*0.35,1e-12);
      if(p.i<lo||p.i>hi)state.mainView.yDomain=[p.i-span/2,p.i+span/2];
    }
  }

  function focusPeakById(id){
    const p=peakById(id);
    if(!p)return false;
    closeRangeActionMenu();
    state.selectedSweepId=p.sweepId;
    state.selectedPeakId=p.id;
    state.selectedPeakIds=new Set([p.id]);
    ensurePeakVisibleInMain(p);
    showInspectorPanel();
    renderAll();
    return true;
  }

  function focusPeakFromCustomData(custom){
    if(!custom)return false;
    let id=custom.id||custom.anchorPeakId||null;
    if(!id&&(custom.forwardPeakId||custom.reversePeakId)){
      const dir=selectedSweep()?.direction;
      id=dir<0?(custom.reversePeakId||custom.forwardPeakId):(custom.forwardPeakId||custom.reversePeakId);
    }
    return id?focusPeakById(id):false;
  }

  function toggleGroupVisibility(){
    const panel=$('#groupPanel');
    if(!panel)return;
    panel.classList.toggle('hidden');
    if(state.groupPanelMode==='docked')$('#dockedGroupSlot')?.classList.toggle('active',!panel.classList.contains('hidden'));
    if(!panel.classList.contains('hidden')){
      applyGroupPanelLayout();
      requestAnimationFrame(()=>updateTrendLayout(true));
    }
  }

  function setDetectionPreset(name){
    const detectorId=state.algorithms?._detectorId||'robust-ricker-v1';
    state.algorithms={...A.preset(name),_detectorId:detectorId};
    renderAll();
  }

  function setDetectorSettings(id,settings){
    const normalized=normalizedDetectionSettings(state.algorithms);
    normalized._detectorSettings={...(normalized._detectorSettings||{}),[id]:JSON.parse(JSON.stringify(settings||{}))};
    state.algorithms=normalized;
    captureActiveProjectTab();
  }

  function setDetectorId(id){
    const exists=peakDetectorProviders().some(p=>p.id===id);
    if(!exists)throw new Error(`未找到寻峰算法插件：${id}`);
    state.algorithms={...normalizedDetectionSettings(state.algorithms),_detectorId:id};
    captureActiveProjectTab();
    window.DKDSPlugins?.events?.emit?.('resonance:detector-changed',{id});
  }

  function setPeakDisplay(key,value){
    if(!(key in state.peakDisplay))throw new Error(`Unknown peak display setting: ${key}`);
    state.peakDisplay[key]=!!value;
    renderMainPlot();
    captureActiveProjectTab();
  }

  function renamePeakCategory(p,label){
    const text=String(label||'').trim();
    if(!p||!text)return;
    snapshot('重命名峰类别');
    const c=categoryForOrder(p.peakOrder);
    const real=state.peakCategories.find(q=>Number(q.order)===Number(c.order));
    if(real)real.label=text;
    else state.peakCategories.push({order:c.order,label:text});
    for(const q of state.peaks.filter(q=>Number(q.peakOrder)===Number(c.order)))q.peakLabel=text;
    renderAll();
  }

  function assignPeakCategory(p,order){
    if(!p)return;
    snapshot('修改峰类别');
    changePeakOrderWithCascade(p,Math.max(1,Math.round(Number(order)||1)));
    p.customColor=null;
    renderAll();
  }

  function createPeakCategoryForPeak(p){
    if(!p)return null;
    snapshot('新增峰类别');
    const c=addPeakCategory();
    p.peakOrder=c.order;p.peakLabel=c.label;p.customColor=null;p.manual=true;
    renderAll();
    return c;
  }

  function togglePeakAccepted(p){
    if(!p)return;
    snapshot('修改采纳状态');p.accepted=!p.accepted;renderAll();
  }

  function togglePeakLocked(p){
    if(!p)return;
    snapshot('锁定峰位');p.locked=!p.locked;state.selectedPeakIds=new Set([p.id]);renderAll();
  }

  function deletePeakById(id){
    const p=peakById(id);
    if(!p)return;
    snapshot('删除峰');
    state.peaks=state.peaks.filter(q=>q.id!==id);
    state.selectedPeakIds.delete(id);
    if(state.selectedPeakId===id)state.selectedPeakId=null;
    renderAll();
  }

  function selectDatasetByPath(path){
    const sweeps=state.sweeps.filter(sw=>sw.datasetPath===path&&isSweepVisible(sw));
    const sw=sweeps.find(sw=>sw.direction>0)||sweeps[0];
    if(!sw)return false;
    state.selectedSweepId=sw.id;
    state.selectedPeakId=null;
    state.selectedPeakIds.clear();
    showInspectorPanel();
    renderAll();
    return true;
  }

  function setDatasetTransform(path,type){
    state.transformPreviewByDataset.set(path,type);
    const current=selectedSweep();
    let sw=current?.datasetPath===path?current:null;
    if(!sw){
      const sweeps=state.sweeps.filter(s=>s.datasetPath===path&&isSweepVisible(s));
      sw=sweeps.find(s=>s.direction>0)||sweeps[0];
    }
    if(sw){
      state.selectedSweepId=sw.id;
      state.selectedPeakId=null;
      state.selectedPeakIds.clear();
      showInspectorPanel();
      renderAll();
      setStatus(`辅助视图：${transformName(type)}。主图和峰位仍保持原始 I–V。`);
    }
    captureActiveProjectTab();
  }

  function serializeResonanceWorkspace(){
    return {
      schema:1,
      datasetMeta:(state.datasets||[]).map(d=>({path:d.path,name:d.name,vg:d.vg})),
      scanVisibility:[...(state.scanVisibility||new Map()).entries()].map(([path,value])=>[path,{forward:value?.forward!==false,reverse:value?.reverse!==false}]),
      peaks:cloneProjectCache(state.peaks||[]),
      peakCategories:cloneProjectCache(state.peakCategories||[]),
      algorithms:cloneProjectCache(state.algorithms||{}),
      activeDetector:String(state.algorithms?._detectorId||''),
      detectorSettings:cloneProjectCache(state.algorithms?._detectorSettings||{}),
      peakDisplay:cloneProjectCache(state.peakDisplay||{}),
      physicsShowLabels:state.physicsShowLabels!==false,
      spacingSettings:cloneProjectCache(state.spacingSettings||{}),
      gateAnalysisSettings:cloneProjectCache(state.gateAnalysisSettings||{}),
      transformPreviewByDataset:[...(state.transformPreviewByDataset||new Map()).entries()]
    };
  }

  function legacyResonanceWorkspace(project){
    if(!project||typeof project!=='object')return null;
    const hasLegacy=Array.isArray(project.datasets)||Array.isArray(project.peaks)||Array.isArray(project.scanVisibility);
    if(!hasLegacy)return null;
    return {
      schema:0,
      datasetMeta:(project.datasets||[]).map(d=>({path:d.path,name:d.name,vg:d.vg})),
      scanVisibility:project.scanVisibility||null,
      peaks:project.peaks||[],
      peakCategories:project.peakCategories||[],
      algorithms:project.algorithms||null,
      physicsShowLabels:project.physicsShowLabels,
      spacingSettings:project.spacingSettings||null,
      gateAnalysisSettings:project.gateAnalysisSettings||null,
      transformPreviewByDataset:project.transformPreviewByDataset||null
    };
  }

  function restoreResonanceWorkspace(data,{legacyProject}={}){
    const source=data&&typeof data==='object'?data:legacyResonanceWorkspace(legacyProject);
    if(!source)return;
    const meta=new Map((Array.isArray(source.datasetMeta)?source.datasetMeta:[]).map(row=>[String(row?.path||''),row]));
    let rebuild=false;
    for(const dataset of state.datasets||[]){
      const row=meta.get(String(dataset.path||''));
      if(!row)continue;
      if(Number.isFinite(Number(row.vg))&&Number(row.vg)!==Number(dataset.vg)){dataset.vg=Number(row.vg);rebuild=true;}
      if(row.name&&row.name!==dataset.name)dataset.name=String(row.name);
    }
    if(rebuild){rebuildSweeps();syncLegacyArtifacts();}
    if(Array.isArray(source.scanVisibility))state.scanVisibility=new Map(source.scanVisibility.map(([path,value])=>[path,{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
    if(Array.isArray(source.peakCategories))state.peakCategories=source.peakCategories.map(c=>({order:Number(c.order),label:String(c.label||defaultPeakLabel(c.order))}));
    if(Array.isArray(source.peaks))state.peaks=source.peaks.map(migratePeak);
    if(source.algorithms&&typeof source.algorithms==='object')state.algorithms=normalizedDetectionSettings(source.algorithms);
    if(source.activeDetector!==undefined)state.algorithms={...(state.algorithms||{}),_detectorId:String(source.activeDetector||'')};
    if(source.detectorSettings&&typeof source.detectorSettings==='object')state.algorithms={...(state.algorithms||{}),_detectorSettings:{...(state.algorithms?._detectorSettings||{}),...cloneProjectCache(source.detectorSettings)}};
    if(source.peakDisplay&&typeof source.peakDisplay==='object')state.peakDisplay={...(state.peakDisplay||{}),...cloneProjectCache(source.peakDisplay)};
    if(source.physicsShowLabels!==undefined)state.physicsShowLabels=source.physicsShowLabels!==false;
    if(source.spacingSettings&&typeof source.spacingSettings==='object')state.spacingSettings={...state.spacingSettings,...source.spacingSettings};
    if(source.gateAnalysisSettings&&typeof source.gateAnalysisSettings==='object')state.gateAnalysisSettings={...state.gateAnalysisSettings,...source.gateAnalysisSettings};
    if(Array.isArray(source.transformPreviewByDataset))state.transformPreviewByDataset=new Map(source.transformPreviewByDataset);
    normalizePeakMetadata();
    if($('#showPhysicsLabels'))$('#showPhysicsLabels').checked=state.physicsShowLabels;
  }

  function resetResonanceWorkspace(){
    state.scanVisibility=new Map((state.datasets||[]).map(d=>[d.path,{forward:true,reverse:true}]));
    state.peaks=[];
    state.peakCategories=[];
    state.algorithms=normalizedDetectionSettings(A.preset('balanced'));
    state.physicsShowLabels=true;
    state.spacingSettings={seriesA:'',seriesB:'',mode:'abs'};
    state.gateAnalysisSettings={seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0};
    state.transformPreviewByDataset=new Map();
    state.selectedPeakId=null;
    state.selectedPeakIds=new Set();
  }

  function resonanceHostApi(){
    return {
      serialize:serializeResonanceWorkspace,
      restore:restoreResonanceWorkspace,
      reset:resetResonanceWorkspace,
      getState:()=>state,
      selectedPeak,selectedSweep,peakById,sweepById,
      visibleSweepIds,isSweepVisible,
      setAllVisibility,setDatasetVisibility,updateDatasetVg,selectDatasetByPath,setDatasetTransform,
      directionName,formatI,peakLabel,categoryLabel,categoryForOrder,
      ensurePeakCategories,addPeakCategory,colorForPeakOrder,pairedTerColors,
      algGlyphs:ALG_GLYPHS,algNames,evidenceMeta:algorithmMetaForPeak,transformOptions:TRANSFORM_OPTIONS,
      transformName,transformForDataset,
      metrics:A.peakMetrics,
      snapshot,renderAll,renderMainPlot,renderMainPlotLegacy:renderResonanceMainPlot,
      resetMainViewLegacy:resetResonanceMainView,physicalAnalysis,
      setStatus,captureActiveProjectTab,
      runDetection,runLocalDetectionInRange,
      sortPeakOrderByVd,lockSelectedPeaks,togglePhysicsLabels,
      toggleInspectorVisibility,toggleGroupVisibility,
      focusPeakById,focusPeakFromCustomData,
      moveSelectedPeakBy,selectAdjacentPeak,switchSelectedSweep,
      deleteSelectedPeaks,hasSelectedPeaks:()=>selectedPeakIdSet().size>0,
      assignPeakCategory,renamePeakCategory,createPeakCategoryForPeak,
      togglePeakAccepted,togglePeakLocked,deletePeakById,
      setDetectionPreset,setDetectorId,setDetectorSettings,setPeakDisplay,
      detectorSettingsFor,
      detectors:peakDetectorProviders,
      activeDetector:activePeakDetector,
      mainCsvText,exportMainCsv,exportMainPng,
      exportMainSvg:()=>exportSvg($('#mainPlot'),'dk_data_main.svg'),
      peaksCsvText,exportPeaks,
      copyPeaks:()=>copyTextToClipboard(peaksCsvText(),'峰参数 CSV'),
      range:{
        localDetect:runLocalDetectionInRange,
        deleteSelected:()=>deleteSelectedPeaks('框选删除峰'),
        lockSelected:()=>{lockSelectedPeaks(true);closeRangeActionMenu();},
        unlockSelected:()=>{lockSelectedPeaks(false);closeRangeActionMenu();},
        applyIdentity:(order,label)=>applyUnifiedPeakIdentityToSelection(order,label),
        close:closeRangeActionMenu,
        categoryLabel
      },
      renderSpacingPage,spacingCsvText,exportSpacingCsv,
      renderGateAnalysis,gateAnalysisCsv,exportGateAnalysisCsv,exportGateAnalysisReport,
      savePlotlyImage,copyTextToClipboard,
      showInspectorPanel,
      selectSweepFromMain
    };
  }

  function pulseHostApi(){
    return {
      render:renderPulseAnalysisResult,
      addFiles:addPulseAnalysisFiles,
      setAllChecked(value){
        pulseAnalysisState.files.forEach(f=>f.checked=!!value);
        renderPulseBatchUi();
      },
      removeChecked:removeCheckedPulseFiles,
      analyzeCurrent:analyzeCurrentPulseFile,
      analyzeChecked:analyzeCheckedPulseFiles,
      applySettingsToChecked:applyPulseSettingsToChecked,
      syncEditor:syncPulseEditorToActive,
      refreshFileAndComparison(){
        renderPulseFileList();
        renderPulseComparison();
      },
      setResultScope(value){
        pulseAnalysisState.resultScope=value==='active'?'active':'checked';
        renderPulseComparison();
      },
      fitRaw(){
        if(!pulseActiveItem()?.result)return false;
        Plotly.relayout('pulseRawPlot',{'xaxis.autorange':true,'yaxis.autorange':true,'yaxis2.autorange':true});
        return true;
      },
      copyRaw:()=>copyTextToClipboard(pulseRawCsvText(),'当前原始脉冲波形 CSV'),
      exportRawCsv(){
        const item=pulseActiveItem();
        return exportPulseCsv(`${pulseSafeFileName(pulseItemLabel(item))}_raw_waveform.csv`,pulseRawCsvText());
      },
      exportRawSvg(){
        const item=pulseActiveItem();
        return exportPulsePlotImage('pulseRawPlot',`${pulseSafeFileName(pulseItemLabel(item))}_raw_waveform`,'svg');
      },
      exportRawPng(){
        const item=pulseActiveItem();
        return exportPulsePlotImage('pulseRawPlot',`${pulseSafeFileName(pulseItemLabel(item))}_raw_waveform`,'png');
      },
      copyRead:()=>copyTextToClipboard(pulseReadCsvText(),'可见脉冲电压-读取电流 CSV'),
      exportReadCsv:()=>exportPulseCsv('pulse_voltage_read_current_visible.csv',pulseReadCsvText()),
      exportReadSvg:()=>exportPulsePlotImage('pulseReadPlot','pulse_voltage_read_current_visible','svg'),
      exportReadPng:()=>exportPulsePlotImage('pulseReadPlot','pulse_voltage_read_current_visible','png'),
      copyPulse:()=>copyTextToClipboard(pulsePulseCsvText(),'可见脉冲电压-脉冲电流 CSV'),
      exportPulseCsv:()=>exportPulseCsv('pulse_voltage_pulse_current_visible.csv',pulsePulseCsvText()),
      exportPulseSvg:()=>exportPulsePlotImage('pulsePulsePlot','pulse_voltage_pulse_current_visible','svg'),
      exportPulsePng:()=>exportPulsePlotImage('pulsePulsePlot','pulse_voltage_pulse_current_visible','png'),
      copyResults:()=>copyTextToClipboard(pulseResultCsvText(),'可见脉冲分析结果 CSV'),
      exportResults:()=>exportPulseCsv('pulse_read_analysis_visible.csv',pulseResultCsvText()),
      serialize:()=>serializePulseAnalysisState(),
      restore:pluginRestorePulseState,
      reset:pluginResetPulseState,
      getState:()=>pulseAnalysisState
    };
  }

  function terHostApi(){
    return {
      serialize:()=>({
        schema:1,
        settings:cloneProjectCache(state.terMaxSettings||{}),
        display:cloneProjectCache(state.terHeatmapDisplay||{}),
        result:state.terMaxResult?cloneProjectCache(state.terMaxResult):null
      }),
      restore(data,{legacyProject}={}){
        const legacy=legacyProject&&typeof legacyProject==='object'?{
          settings:legacyProject.terMaxSettings,
          display:legacyProject.terHeatmapDisplay,
          result:legacyProject.terMaxResult
        }:null;
        const source=data&&typeof data==='object'?data:legacy;
        if(!source)return;
        state.terMaxSettings={...(source.settings||{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false})};
        state.terHeatmapDisplay={...(source.display||{colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null})};
        state.terMaxResult=source.result?cloneProjectCache(source.result):null;
        if($('#terMaxPage')&&!$('#terMaxPage').classList.contains('hidden'))renderTerMaxPage();
      },
      reset(){
        state.terMaxSettings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false};
        state.terHeatmapDisplay={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
        state.terMaxResult=null;
      },
      render:renderTerMaxPage,
      getState:()=>({settings:state.terMaxSettings,display:state.terHeatmapDisplay,result:state.terMaxResult}),
      autoParameters:autoTerParameters,
      calculate:computeTerMaxPage,
      applyDisplay(){
        readTerHeatmapControls();
        if(state.terMaxResult)renderTerMaxResult();
        setStatus('TER 热图显示范围/刻度已应用；TER 数值本身未改变。');
      },
      resetDisplay:resetTerHeatmapDisplay,
      setOnlyFullyVisible(value){
        state.terMaxSettings.onlyFullyVisible=!!value;
        autoTerParameters();
      },
      exportLong:exportTerLong,
      copyLong:()=>copyTextToClipboard(terLongCsvText(),'TER_long CSV'),
      exportMatrix:exportTerMatrix,
      copyMatrix:()=>copyTextToClipboard(terMatrixCsvText(),'TER_matrix CSV'),
      exportHeatmapSvg:()=>savePlotlyImage('terHeatmapPlot','TER_heatmap','svg'),
      exportHeatmapPng:()=>savePlotlyImage('terHeatmapPlot','TER_heatmap','png'),
      exportMaxVg:exportTerMaxVg,
      copyMaxVg:()=>copyTextToClipboard(terMaxVgCsvText(),'TER_Max–Vg CSV'),
      exportMaxVgSvg:()=>savePlotlyImage('terMaxVgPlot','TER_Max-Vg','svg'),
      exportMaxVgPng:()=>savePlotlyImage('terMaxVgPlot','TER_Max-Vg','png'),
      exportMaxVd:exportTerMaxVd,
      copyMaxVd:()=>copyTextToClipboard(terMaxVdCsvText(),'TER_Max–Vd CSV'),
      exportMaxVdSvg:()=>savePlotlyImage('terMaxVdPlot','TER_Max-Vd','svg'),
      exportMaxVdPng:()=>savePlotlyImage('terMaxVdPlot','TER_Max-Vd','png')
    };
  }

  function pluginTogglePhysicsPanel(){
    const panel=$('#physicsPanel');
    if(!panel)return;
    panel.classList.toggle('hidden');
    window.DKDSPlugins?.events?.emit?.('panel:toggled',{id:'physicsPanel',hidden:panel.classList.contains('hidden')});
  }

  function pluginRestorePulseState(saved){
    pulseAnalysisState=restorePulseAnalysisState(saved);
    const tab=activeProjectTab();
    if(tab)tab.pulseAnalysisState=pulseAnalysisState;
    if(!$('#pulseAnalysisPage')?.classList.contains('hidden'))renderPulseBatchUi();
  }

  function pluginResetPulseState(){
    pulseAnalysisState=createPulseAnalysisState();
    const tab=activeProjectTab();
    if(tab)tab.pulseAnalysisState=pulseAnalysisState;
  }

  async function publishCapabilitySnapshot(){
    if(IS_AUXILIARY_WINDOW||!window.electronAPI?.publishCapabilitySnapshot)return null;
    const snapshot=window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||null;
    try{return await window.electronAPI.publishCapabilitySnapshot({snapshot,revision:Number(snapshot?.revision)||0});}
    catch(err){console.warn('[DKDS capabilities:publish]',err);return null;}
  }

  async function openPluginActivityWindow(activityId){
    if(IS_AUXILIARY_WINDOW){
      return window.DKDSPlugins?.activities?.set?.(activityId);
    }
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
    if(IS_AUXILIARY_WINDOW||!window.electronAPI?.prewarmActivityWindow||!window.electronAPI?.listPluginWindows)return;
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
      window.DKDSPlugins?.project?.restorePlugin?.(pluginId,tab.pluginState,null);
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

  function mergeCompatibilityActivityProject(project,tab){
    const merged=cloneAuxSnapshot(project||{});
    // Compatibility TOPs own legacy/root workspace state (datasets, peaks,
    // resonance panels, etc.) but must never roll back newer namespaced plugin
    // caches or artifacts produced by concurrently cached dedicated TOPs.
    merged.plugins=cloneAuxSnapshot(tab?.pluginState||{});
    try{
      merged.dataModel=window.DKDSData.serializeStore(tab?.artifactStore||window.DKDSData.createStore(),{includeTransient:false});
    }catch{}
    if(tab){
      merged.terMaxSettings=cloneAuxSnapshot(tab.terMaxSettings||merged.terMaxSettings||{});
      merged.terHeatmapDisplay=cloneAuxSnapshot(tab.terHeatmapDisplay||merged.terHeatmapDisplay||{});
      merged.terMaxResult=tab.terMaxResult?cloneAuxSnapshot(tab.terMaxResult):null;
    }
    return merged;
  }

  function applyActivityProjectSnapshot(payload){
    const projectTabId=String(payload?.projectTabId||'');
    if(!projectTabId)return;
    const tab=state.projectTabs.find(t=>t.id===projectTabId);
    if(!tab)return;

    // Dedicated plugin windows merge only their own namespaced state and
    // artifact delta. This prevents two prewarmed windows with older full
    // project snapshots from overwriting each other's results.
    if(payload?.pluginId){
      applyDedicatedActivitySnapshot(payload,tab);
      return;
    }

    // Compatibility TOPs still return root/legacy workspace state. Merge it
    // against the latest tab-owned plugin/artifact caches before applying it so
    // a stale auxiliary renderer cannot roll back other independent TOPs.
    const project=payload?.project;
    if(!project)return;
    const active=projectTabId===state.activeProjectTabId;
    if(active)captureActiveProjectTab();
    const mergedProject=mergeCompatibilityActivityProject(project,tab);
    if(payload.final&&active){
      const path=tab.projectPath;
      loadProjectIntoActive(mergedProject,path);
      captureActiveProjectTab();
      renderAll();
      applyGroupPanelLayout();
      applyInspectorPanelLayout();
      scheduleMainPlotRelayout();
      setStatus(`已安全同步 ${payload.activityId||'扩展窗口'} 的主工作区修改。`);
    }else{
      tab.pendingAuxProject={project:mergedProject,activityId:payload.activityId||''};
    }
  }

  function pushAuxiliaryProjectSnapshot(final=true){
    if(!IS_AUXILIARY_WINDOW||!auxiliaryBootstrapState||!window.electronAPI?.pushActivityProjectSnapshot)return;
    try{
      captureActiveProjectTab();
      window.electronAPI.pushActivityProjectSnapshot({project:makeProject(),final});
    }catch(err){console.warn('[DKDS auxiliary snapshot]',err);}
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
      appVersion:'3.41.6',
      platform:window.DKDSPlatform,
      isAuxiliaryWindow:IS_AUXILIARY_WINDOW,
      isWebClient:!!window.electronAPI?.isWebClient,
      getRuntimeStatus:()=>window.electronAPI?.getRuntimeStatus?.(),
      getLanWebStatus:()=>lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),
      openLanWebPanel:showLanWebPanel,
      hideLanWebPanel,
      openActivityWindow:openPluginActivityWindow,
      closeCurrentWindow:()=>window.electronAPI?.closeCurrentWindow?.(),
      getState:()=>state,
      makeProject:()=>makeProject(),
      getActiveProjectTab:()=>activeProjectTab(),
      captureActiveProjectTab,
      applyResonanceWorkspace:workspace=>{restoreResonanceWorkspace(workspace,{legacyProject:makeProject()});captureActiveProjectTab();window.DKDSPlugins?.events?.emit?.('resonance:workspace-synced',{source:'plugin-runtime'});},
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
      renderSpacingPage,
      renderGateAnalysis,
      renderTerMaxPage,
      renderPulseAnalysis:renderPulseAnalysisResult,
      togglePhysicsPanel:pluginTogglePhysicsPanel,
      copyTextToClipboard,
      savePlotlyImage,
      makeFloating,
      artifacts:artifactHostApi(),
      services:{runtime:Object.freeze({getStatus:()=>window.electronAPI?.getRuntimeStatus?.()}),lanWeb:Object.freeze({getStatus:()=>lanWebStatusState||window.electronAPI?.lanWebGetStatus?.(),openPanel:showLanWebPanel,hidePanel:hideLanWebPanel}),resonance:resonanceHostApi(),pulse:pulseHostApi(),ter:terHostApi()},
      panels:{
        inspector:{toggle:toggleInspectorVisibility,show:showInspectorPanel,apply:applyInspectorPanelLayout,place:setInspectorPrimePlacement,placement:()=>state.inspectorPanelMode==='right'?'right':'float'},
        group:{toggle:toggleGroupVisibility,apply:applyGroupPanelLayout,updateLayout:updateTrendLayout,place:setGroupPrimePlacement,placement:()=>state.groupPanelMode==='docked'?'bottom':'float'}
      },
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

    await window.DKDSPlugins.loadBuiltinEntries();
    await window.DKDSPlugins.loadExternalEntries?.();
    const activated=await window.DKDSPlugins.activateAll();
    console.info('[DKDS plugins] activated',activated);
    await publishCapabilitySnapshot();
    if(!IS_AUXILIARY_WINDOW){
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

    if(IS_AUXILIARY_WINDOW){
      document.body.classList.add('auxiliary-window');
      auxiliaryBootstrapState=await window.electronAPI?.getActivityWindowBootstrap?.();
      const syncAuxiliaryMode=bootstrap=>{
        const mode=String(bootstrap?.pluginWindow?.mode||'dedicated').toLowerCase();
        document.body.dataset.auxiliaryWindowMode=mode;
        document.body.classList.toggle('auxiliary-compatibility-window',mode==='compatibility');
      };
      syncAuxiliaryMode(auxiliaryBootstrapState);
      if(auxiliaryBootstrapState?.project){
        initialTab.id=auxiliaryBootstrapState.projectTabId||initialTab.id;
        initialTab.title=auxiliaryBootstrapState.title||initialTab.title;
        state.activeProjectTabId=initialTab.id;
        loadProjectIntoActive(auxiliaryBootstrapState.project,auxiliaryBootstrapState.projectPath||null);
        captureActiveProjectTab();
      }
      window.addEventListener('beforeunload',()=>pushAuxiliaryProjectSnapshot(true));
      window.electronAPI?.onActivityWillHide?.(()=>pushAuxiliaryProjectSnapshot(true));
      window.electronAPI?.onActivityBootstrapChanged?.(async()=>{
        const next=await window.electronAPI?.getActivityWindowBootstrap?.();
        if(!next?.project)return;
        auxiliaryBootstrapState=next;
        syncAuxiliaryMode(next);
        loadProjectIntoActive(next.project,next.projectPath||null);
        captureActiveProjectTab();
        renderAll();
        window.DKDSPlugins?.activities?.set?.(next.activityId||AUX_ACTIVITY_ID);
      });
    }else{
      window.electronAPI?.onActivityProjectSnapshot?.(applyActivityProjectSnapshot);
    }

    syncPhysicsLabelControls();
    renderProjectTabs();
    updateMainModeButtons();
    renderAll();
    applyGroupPanelLayout();
    applyInspectorPanelLayout();
    if(!IS_AUXILIARY_WINDOW){
      initializeUpdateUi();
      initializeLanWebUi();
      window.electronAPI?.onPluginLanUpdate?.(info=>{
        setStatus(`插件 ${info?.name||info?.id||''} v${info?.version||'?'} 已通过局域网接收；重启软件后启用新版本。`);
      });
    }
    if(IS_AUXILIARY_WINDOW){
      await window.DKDSPlugins?.activities?.set?.(auxiliaryBootstrapState?.activityId||AUX_ACTIVITY_ID);
      window.electronAPI?.markActivityWindowReady?.();
    }else{
      prewarmDedicatedPluginWindows();
    }
    window.DKDSPlugins?.events?.emit?.('app:ready',{state,auxiliary:IS_AUXILIARY_WINDOW});
  }

  startApplication().catch(err=>{
    console.error('[DKDS startup]',err);
    setStatus(`启动失败：${err.message}`);
  });
})();
