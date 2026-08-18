(() => {
  const state = {
    host:null,
    filter:'all',
    query:'',
    busy:new Set(),
    bound:false
  };

  const $ = selector => document.querySelector(selector);

  const BUILTIN_DISPLAY = {
    'builtin.workspace-safeguards': {
      name:'工作区保护',
      description:'自适应顶部导航、增量导入结果保护和同名数据提醒。'
    },
    'builtin.resonance-workbench': {
      name:'共振分析工作台',
      description:'共振 I–V、寻峰、曲线检查、组图、物理机制、峰间距和栅压分析工作区。'
    },
    'builtin.data-center': {
      name:'数据中心',
      description:'标准数据模型、公式派生列、可配置工作流、参数面板与图表预览。'
    },
    'builtin.flexible-import': {
      name:'灵活数据导入',
      description:'面向 CSV、TXT、DAT 等实验数据的编码、分隔符、列映射和单位识别。'
    },
    'builtin.resonance-detector-robust': {
      name:'稳健共振寻峰',
      description:'面向共振 I–V 数据的稳健多证据寻峰算法。'
    },
    'builtin.ter-analysis': {
      name:'TER 分析',
      description:'同一 Vd 下的 TER 矩阵、热图、极值与最佳读出偏压分析。'
    },
    'builtin.pulse-analysis': {
      name:'脉冲 / 读取分析',
      description:'批量脉冲与读取瞬态数据提取、比较和导出。'
    }
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  function displayMeta(plugin) {
    const mapped=BUILTIN_DISPLAY[plugin?.id]||null;
    return {
      name:mapped?.name || plugin?.name || plugin?.id || '未命名插件',
      description:mapped?.description || plugin?.description || '未提供插件说明。'
    };
  }

  function statusMeta(plugin) {
    if (plugin.status === 'error') return {label:'加载错误', className:'error'};
    if (plugin.active) return {label:'已启用', className:'active'};
    if (!plugin.enabled) return {label:'已停用', className:'disabled'};
    return {label:'待加载', className:'available'};
  }

  function capabilityLabel(capability) {
    const map={
      'ui.page':'分析页面',
      'ui.panel':'功能面板',
      'ui.styles':'界面样式',
      'ui.activity':'顶级工作区',
      'ui.sidebar':'侧栏界面',
      'ui.inspector':'检查器',
      'ui.group-charts':'组图',
      'ui.groupCharts':'组图',
      'ui.groupViews':'组图视图',
      'ui.mainViews':'主视图',
      'ui.selectionMenus':'选区菜单',
      'ui.mainOverlays':'主图叠加层',
      'ui.shortcuts':'快捷键',
      'ui.topWorkspaces':'TOP 工作区契约',
      'ui.prime':'PRIME 功能',
      'ui.sub':'SUB 功能',
      'ui.main-tools':'主图工具',
      'ui.status-bar':'底部状态栏',
      'ui.top-workspace':'TOP 工作区',
      'ui.prime':'PRIME 功能',
      'ui.sub':'SUB 功能',
      'data.importer':'数据导入',
      'data.import':'数据导入',
      'data.inspector':'数据检查',
      'data.model':'标准数据模型',
      'data.formula':'公式派生列',
      'analysis.resonance':'共振分析',
      'analysis.ter':'TER 分析',
      'analysis.pulse':'脉冲分析',
      'analysis.peak-detector':'寻峰算法',
      'chart.trend':'趋势图',
      'chart.heatmap':'热图',
      'chart.timeseries':'时序图',
      'chart.renderer':'图形渲染',
      'workflow.processor':'数据处理器',
      'workflow.analyzer':'分析器',
      'workflow.recipe':'工作流配方',
      'workspace.integrity':'工作区完整性',
      'system.runtime-status':'运行状态',
      'lan.web-status':'网页版状态',
      'project.slice':'工程状态'
    };
    return map[capability] || capability;
  }

  function contributionKindLabel(kind){
    const map={
      'ui.activities':'顶级工作区',
      'ui.pages':'分析页面',
      'ui.panels':'功能面板',
      'ui.statusItems':'状态栏项目',
      'ui.styles':'界面样式',
      'ui.sidebar':'侧栏区域',
      'ui.inspectors':'检查器',
      'ui.groupCharts':'组图',
      'ui.groupViews':'组图视图',
      'ui.mainViews':'主视图',
      'ui.selectionMenus':'选区菜单',
      'ui.mainOverlays':'主图叠加层',
      'ui.shortcuts':'快捷键',
      'workflow.processors':'数据处理器',
      'workflow.analyzers':'分析器',
      'workflow.recipes':'工作流配方',
      'charts.renderers':'图表渲染器',
      'data.importers':'数据导入器',
      'analysis.providers':'分析提供者',
      'peak.detectors':'寻峰算法',
      'commands':'命令'
    };
    return map[kind]||kind;
  }

  function contributionText(counts={}) {
    const entries=Object.entries(counts).filter(([,count])=>count>0);
    if(!entries.length)return '当前无已注册贡献';
    return entries.map(([kind,count])=>`${contributionKindLabel(kind)} × ${count}`).join(' · ');
  }

  function filteredPlugins() {
    const plugins=window.DKDSPlugins?.manager?.list?.()||[];
    const q=state.query.trim().toLowerCase();
    return plugins.filter(plugin=>{
      if(state.filter==='active'&&!plugin.active)return false;
      if(state.filter==='disabled'&&plugin.enabled)return false;
      if(state.filter==='error'&&plugin.status!=='error')return false;
      if(!q)return true;
      const display=displayMeta(plugin);
      const hay=[display.name,display.description,plugin.name,plugin.id,plugin.description,...(plugin.capabilities||[]),(plugin.capabilities||[]).map(capabilityLabel).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function scheduleViewportRepair(){
    requestAnimationFrame(()=>{
      state.host?.syncAnalysisPageViewport?.();
      requestAnimationFrame(()=>{state.host?.syncAnalysisPageViewport?.();clampManagerScroll(pluginManagerScroller());});
    });
  }

  function pluginManagerScroller(){
    return $('#pluginManagerPage .analysis-page-body')||$('#pluginManagerList')?.closest?.('.analysis-page-body')||null;
  }

  function captureManagerScroll(anchorPluginId=''){
    const scroller=pluginManagerScroller();
    if(!scroller)return null;
    const rect=scroller.getBoundingClientRect();
    let anchor=null;
    if(anchorPluginId){
      const safe=window.CSS?.escape?CSS.escape(anchorPluginId):String(anchorPluginId).replace(/["\\]/g,'\\$&');
      anchor=document.querySelector(`#pluginManagerList .plugin-manager-card[data-plugin-id="${safe}"]`);
    }
    if(!anchor){
      const cards=[...document.querySelectorAll('#pluginManagerList .plugin-manager-card')];
      anchor=cards.find(card=>card.getBoundingClientRect().bottom>rect.top+4)||cards[0]||null;
    }
    return {
      scroller,
      top:scroller.scrollTop,
      left:scroller.scrollLeft,
      anchorPluginId:anchor?.dataset?.pluginId||anchorPluginId||'',
      anchorOffset:anchor?anchor.getBoundingClientRect().top-rect.top:null
    };
  }

  function clampManagerScroll(scroller){
    if(!scroller)return;
    const maxTop=Math.max(0,scroller.scrollHeight-scroller.clientHeight);
    if(scroller.scrollTop>maxTop)scroller.scrollTop=maxTop;
    if(scroller.scrollTop<0)scroller.scrollTop=0;
  }

  // Plugin lifecycle changes can rebuild the complete manager grid and, in
  // Chromium, a later scroll-anchor/layout pass can restore the old scroll
  // position *after* our first repair frame.  Hold the manager at the top for
  // several animation frames after enable/disable/reload so a removed or
  // resized card can never leave the viewport parked below the real content.
  function settleManagerAtTop(frames=8){
    const scroller=pluginManagerScroller();
    if(!scroller)return;
    let remaining=Math.max(1,Number(frames)||1);
    const step=()=>{
      if(!scroller.isConnected)return;
      scroller.scrollTop=0;
      scroller.scrollLeft=0;
      clampManagerScroll(scroller);
      if(--remaining>0)requestAnimationFrame(step);
    };
    step();
  }

  function restoreManagerScroll(snapshot,{top=false,anchorPluginId=''}={}){
    if(!snapshot?.scroller)return;
    const apply=()=>{
      const scroller=snapshot.scroller;
      if(top){
        scroller.scrollTop=0;
      }else{
        const wanted=anchorPluginId||snapshot.anchorPluginId;
        let anchored=false;
        if(wanted&&Number.isFinite(snapshot.anchorOffset)){
          const safe=window.CSS?.escape?CSS.escape(wanted):String(wanted).replace(/["\\]/g,'\\$&');
          const card=document.querySelector(`#pluginManagerList .plugin-manager-card[data-plugin-id="${safe}"]`);
          if(card){
            const scrollerRect=scroller.getBoundingClientRect();
            const delta=card.getBoundingClientRect().top-scrollerRect.top-snapshot.anchorOffset;
            if(Number.isFinite(delta)){scroller.scrollTop+=delta;anchored=true;}
          }
        }
        if(!anchored)scroller.scrollTop=snapshot.top;
      }
      scroller.scrollLeft=snapshot.left;
      clampManagerScroll(scroller);
    };
    apply();
    requestAnimationFrame(()=>{apply();requestAnimationFrame(apply);});
  }


  function renderSummary(all) {
    const total=all.length;
    const active=all.filter(p=>p.active).length;
    const disabled=all.filter(p=>!p.enabled).length;
    const errors=all.filter(p=>p.status==='error').length;
    const external=all.filter(p=>p.source==='external').length;
    const rows=[['全部插件',total],['已启用',active],['已停用',disabled],['本地安装',external],['错误',errors]];
    const host=$('#pluginManagerSummary');
    if(!host)return;
    host.innerHTML=rows.map(([label,value],index)=>`<div class="plugin-manager-stat ${index===4&&value?'has-error':''}"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join('');
  }

  function renderList(options={}) {
    const list=$('#pluginManagerList');
    if(!list)return;
    const anchorPluginId=String(options.anchorPluginId||'');
    const scrollSnapshot=captureManagerScroll(anchorPluginId);
    const resetScroll=options.scroll==='top';
    const all=window.DKDSPlugins?.manager?.list?.()||[];
    renderSummary(all);
    const installSupported=!!window.DKDSPlugins?.external?.available?.();
    const installBtn=$('#pluginManagerInstallBtn');if(installBtn){installBtn.disabled=!installSupported;installBtn.title=installSupported?'安装 .dkplugin 本地插件包':'当前运行环境不允许安装可执行插件包';}
    const folderBtn=$('#pluginManagerOpenFolderBtn');if(folderBtn)folderBtn.disabled=!installSupported;
    const externalErrors=window.DKDSPlugins?.external?.errors?.()||[];
    const note=$('#pluginManagerNote');
    if(note)note.innerHTML=externalErrors.length
      ? `<strong>本地插件加载警告：</strong>${externalErrors.map(row=>`${escapeHtml(row.file)}：${escapeHtml(row.error)}`).join('<br>')}`
      : '停用插件只移除其功能入口和运行时贡献，不会删除保存在工程中的插件数据；再次启用时会恢复当前工程的对应状态。桌面版可安装本地 <code>.dkplugin</code> 插件包。';
    const plugins=filteredPlugins();
    $('#pluginManagerVisibleCount').textContent=`显示 ${plugins.length} / ${all.length}`;

    if(!plugins.length){
      list.innerHTML='<div class="plugin-manager-empty">没有符合当前筛选条件的插件。</div>';
      restoreManagerScroll(scrollSnapshot,{top:resetScroll,anchorPluginId});
      if(resetScroll)settleManagerAtTop();
      scheduleViewportRepair();
      return;
    }

    list.innerHTML='';
    for(const plugin of plugins){
      const busy=state.busy.has(plugin.id);
      const status=statusMeta(plugin);
      const display=displayMeta(plugin);
      const card=document.createElement('article');
      card.className=`plugin-manager-card status-${status.className}`;
      card.dataset.pluginId=plugin.id;
      const caps=(plugin.capabilities||[]).map(cap=>`<span class="plugin-capability-chip">${escapeHtml(capabilityLabel(cap))}</span>`).join('');
      const source=plugin.source==='builtin'?'内置插件':plugin.source==='external'?'本地安装':escapeHtml(plugin.source||'插件');
      const actionLabel=plugin.status==='error'?'重试':plugin.active?'重新加载':'加载';
      const localizedCaps=(plugin.capabilities||[]).map(capabilityLabel).join('、')||'—';
      card.innerHTML=`
        <div class="plugin-card-head">
          ${plugin.workspaceRole==='top'
            ? `<button class="plugin-card-icon plugin-super-selector ${plugin.isSuper?'selected':''}" type="button" aria-pressed="${plugin.isSuper?'true':'false'}" title="${plugin.isSuper?'当前主界面（SUPER）':'设为主界面（SUPER）'}" ${(!plugin.active||busy||!plugin.topContractReady)?'disabled':''}>${escapeHtml(plugin.workspaceIcon||'⌂')}<span class="plugin-super-home-mark">⌂</span></button>`
            : `<div class="plugin-card-icon" aria-hidden="true">${escapeHtml(display.name.slice(0,1).toUpperCase())}</div>`}
          <div class="plugin-card-title-wrap">
            <div class="plugin-card-title-line">
              <h3>${escapeHtml(display.name)}</h3>
              <span class="plugin-status-badge ${status.className}">${status.label}</span>
              ${plugin.workspaceRole==='top'?`<span class="plugin-role-badge top">TOP</span>`:''}
              ${plugin.isSuper?`<span class="plugin-role-badge super">SUPER</span>`:''}
            </div>
            <div class="plugin-card-id">${escapeHtml(plugin.id)} · v${escapeHtml(plugin.version||'?')}</div>
          </div>
          <div class="plugin-card-switches">
            <label class="plugin-enable-switch" title="${plugin.isSuper?'当前 SUPER 不能直接停用，请先选择另一个 TOP 作为主界面':'启用或停用此插件'}">
              <input class="plugin-enable-input" type="checkbox" ${plugin.enabled?'checked':''} ${(busy||plugin.isSuper)?'disabled':''}>
              <span class="plugin-switch-track"><span class="plugin-switch-thumb"></span></span>
              <span class="plugin-switch-label">${plugin.enabled?'启用':'停用'}</span>
            </label>
            ${plugin.hasWindow?`<label class="plugin-prewarm-switch" title="预热会在后台提前创建该插件窗口，打开更快，但会增加内存占用。">
              <input class="plugin-prewarm-input" type="checkbox" ${plugin.prewarmEnabled?'checked':''} ${busy?'disabled':''}>
              <span class="plugin-prewarm-box" aria-hidden="true"></span>
              <span>预热</span>
            </label>`:''}
          </div>
        </div>
        <div class="plugin-card-body">
          <p class="plugin-card-description">${escapeHtml(display.description)}</p>
          <div class="plugin-capability-row">${caps||'<span class="plugin-capability-chip muted">未声明能力</span>'}</div>
          ${plugin.error?`<div class="plugin-error-box"><strong>错误：</strong>${escapeHtml(plugin.error)}</div>`:''}
        </div>
        <div class="plugin-card-footer">
          <div class="plugin-card-meta">
            <span>${source}</span>
            <span>插件 API ${escapeHtml(plugin.apiVersion||'?')}</span>
            <span>优先级 ${Number(plugin.order)||100}</span>
          </div>
          <div class="plugin-card-actions">
            <button class="plugin-details-btn" type="button">详情</button>
            <button class="plugin-reload-btn" type="button" ${(!plugin.enabled||busy)?'disabled':''}>${busy?'处理中…':actionLabel}</button>
            ${plugin.source==='external'?`<button class="plugin-uninstall-btn danger-soft" type="button" ${busy?'disabled':''}>卸载</button>`:''}
          </div>
        </div>
        <div class="plugin-card-details hidden">
          <div><strong>注册贡献：</strong>${escapeHtml(contributionText(plugin.contributionCounts))}</div>
          <div><strong>启用来源：</strong>${plugin.preference===undefined?(plugin.enabled?'由插件默认设置启用':'由插件默认设置停用'):'已由用户设置覆盖'}</div>
          ${plugin.hasWindow?`<div><strong>窗口预热：</strong>${plugin.prewarmEnabled?'已开启':'已关闭'} · ${plugin.prewarmPreference===undefined?'插件默认值':'用户设置'}（预热仅影响启动速度与内存，不影响插件功能）</div>`:''}
          <div><strong>技术能力：</strong>${escapeHtml(localizedCaps)}</div>
          ${plugin.workspaceRole==='top'?`<div><strong>工作区角色：</strong>${plugin.isSuper?'SUPER（当前主界面）':'TOP（独立工作区）'} · TOP 契约 ${plugin.topContractReady?'完整':'缺失'} · PRIME ${plugin.primeCount||0} · SUB ${plugin.subCount||0}</div>`:''}
        </div>`;

      const superSelector=card.querySelector('.plugin-super-selector');
      if(superSelector)superSelector.onclick=async()=>{
        if(plugin.isSuper||!plugin.active||!plugin.topContractReady||state.busy.has(plugin.id))return;
        state.busy.add(plugin.id);renderList({anchorPluginId:plugin.id});
        try{
          await window.DKDSPlugins.manager.setSuper(plugin.id);
          state.host?.setStatus?.(`${display.name} 已设为 SUPER 主界面；其他 TOP 保持独立窗口。`);
        }catch(err){state.host?.setStatus?.(`设置主界面失败：${err.message}`);}
        finally{state.busy.delete(plugin.id);renderList({anchorPluginId:plugin.id});}
      };

      const toggle=card.querySelector('.plugin-enable-input');
      toggle.onchange=async()=>{
        state.busy.add(plugin.id);
        renderList({anchorPluginId:plugin.id});
        try{
          await window.DKDSPlugins.manager.setEnabled(plugin.id,toggle.checked);
        }catch(err){
          state.host?.setStatus?.(`插件 ${display.name} 状态修改失败：${err.message}`);
        }finally{
          state.busy.delete(plugin.id);
          renderList({scroll:'top'});
        }
      };

      const prewarmToggle=card.querySelector('.plugin-prewarm-input');
      if(prewarmToggle)prewarmToggle.onchange=()=>{
        try{
          window.DKDSPlugins.manager.setPrewarm(plugin.id,prewarmToggle.checked);
          renderList({anchorPluginId:plugin.id});
        }catch(err){
          state.host?.setStatus?.(`插件 ${display.name} 预热设置失败：${err.message}`);
          renderList({anchorPluginId:plugin.id});
        }
      };

      card.querySelector('.plugin-reload-btn').onclick=async()=>{
        if(!plugin.enabled)return;
        state.busy.add(plugin.id);
        renderList({anchorPluginId:plugin.id});
        try{
          if(plugin.active)await window.DKDSPlugins.manager.reload(plugin.id);
          else await window.DKDSPlugins.manager.enable(plugin.id);
        }catch(err){
          state.host?.setStatus?.(`插件 ${display.name} 加载失败：${err.message}`);
        }finally{
          state.busy.delete(plugin.id);
          // Plugin lifecycle changes can remove/rebuild cards and alter their
          // heights. Always return the manager to a valid top-aligned viewport
          // rather than preserving a now-invalid bottom scroll anchor.
          renderList({scroll:'top'});
        }
      };

      const uninstall=card.querySelector('.plugin-uninstall-btn');
      if(uninstall)uninstall.onclick=async()=>{
        if(!window.confirm(`卸载本地插件 ${display.name}？\n\n不会删除工程中已保存的 ${plugin.id} 数据；重新安装同 ID 插件后仍可恢复。`))return;
        state.busy.add(plugin.id);renderList({anchorPluginId:plugin.id});
        try{await window.DKDSPlugins.external.uninstall(plugin.id);}
        catch(err){state.host?.setStatus?.(`卸载插件失败：${err.message}`);}
        finally{state.busy.delete(plugin.id);renderList({anchorPluginId:plugin.id});}
      };

      card.querySelector('.plugin-details-btn').onclick=()=>{
        const details=card.querySelector('.plugin-card-details');
        details.classList.toggle('hidden');
        card.querySelector('.plugin-details-btn').textContent=details.classList.contains('hidden')?'详情':'收起';
      };
      list.appendChild(card);
    }
    restoreManagerScroll(scrollSnapshot,{top:resetScroll,anchorPluginId});
    if(resetScroll)settleManagerAtTop();
    scheduleViewportRepair();
  }

  async function copyDiagnostics(){
    const text=JSON.stringify(window.DKDSPlugins?.diagnostics?.()||{},null,2);
    try{
      if(window.electronAPI?.copyText)await window.electronAPI.copyText(text);
      else await navigator.clipboard.writeText(text);
      state.host?.setStatus?.('插件诊断信息已复制到剪贴板。');
    }catch(err){
      state.host?.setStatus?.(`复制插件诊断失败：${err.message}`);
    }
  }

  function openManager(){
    state.host?.openAnalysisPage?.('pluginManagerPage');
    const scroller=pluginManagerScroller();
    if(scroller)scroller.scrollTop=0;
    renderList({scroll:'top'});
    settleManagerAtTop();
  }

  function bind(){
    if(state.bound)return;
    state.bound=true;
    $('#pluginManagerBtn').onclick=openManager;
    $('#pluginManagerSearch').oninput=e=>{state.query=e.target.value||'';renderList({scroll:'top'});};
    $('#pluginManagerFilter').onchange=e=>{state.filter=e.target.value||'all';renderList({scroll:'top'});};
    $('#pluginManagerRefreshBtn').onclick=renderList;
    $('#pluginManagerInstallBtn').onclick=async()=>{
      try{
        const installed=await window.DKDSPlugins.external.install();
        if(installed)state.host?.setStatus?.(`插件 ${displayMeta(installed).name} 已安装并载入。`);
      }catch(err){state.host?.setStatus?.(`安装插件失败：${err.message}`);}
      renderList();
    };
    $('#pluginManagerOpenFolderBtn').onclick=async()=>{try{await window.DKDSPlugins.external.openFolder();}catch(err){state.host?.setStatus?.(`打开插件目录失败：${err.message}`);}};
    $('#pluginManagerDiagnosticsBtn').onclick=copyDiagnostics;
    $('#pluginManagerResetBtn').onclick=async()=>{
      if(!window.confirm('恢复所有插件的默认启用状态与默认预热设置？不会删除插件工程数据。'))return;
      try{
        await window.DKDSPlugins.manager.resetPreferences();
        state.host?.setStatus?.('插件启用状态与预热设置已恢复默认。');
      }catch(err){
        state.host?.setStatus?.(`恢复插件默认状态失败：${err.message}`);
      }
      renderList();
    };

    // A plugin state transition changes card geometry and may also mutate the
    // shell.  Always rebuild from a known top-aligned viewport.  This is more
    // deterministic than preserving a stale card anchor across a lifecycle
    // transition and fixes the large blank lower viewport seen after disabling
    // or closing a plugin.
    const renderAfterLifecycleChange=()=>renderList({scroll:'top'});
    window.DKDSPlugins?.events?.on?.('plugin:manager-changed',renderAfterLifecycleChange);
    window.DKDSPlugins?.events?.on?.('plugin:state-changed',renderAfterLifecycleChange);
    window.DKDSPlugins?.events?.on?.('plugins:ready',renderAfterLifecycleChange);
  }

  window.DKDSPluginManagerUI={
    configure(host){state.host=host||{};bind();renderList();},
    render:renderList,
    open:openManager
  };
})();