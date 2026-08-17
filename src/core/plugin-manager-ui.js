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
      'ui.main-tools':'主图工具',
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
      'project.slice':'工程状态'
    };
    return map[capability] || capability;
  }

  function contributionKindLabel(kind){
    const map={
      'ui.activities':'顶级工作区',
      'ui.pages':'分析页面',
      'ui.panels':'功能面板',
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

  function renderList() {
    const list=$('#pluginManagerList');
    if(!list)return;
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
          <div class="plugin-card-icon" aria-hidden="true">${escapeHtml(display.name.slice(0,1).toUpperCase())}</div>
          <div class="plugin-card-title-wrap">
            <div class="plugin-card-title-line">
              <h3>${escapeHtml(display.name)}</h3>
              <span class="plugin-status-badge ${status.className}">${status.label}</span>
            </div>
            <div class="plugin-card-id">${escapeHtml(plugin.id)} · v${escapeHtml(plugin.version||'?')}</div>
          </div>
          <label class="plugin-enable-switch" title="启用或停用此插件">
            <input class="plugin-enable-input" type="checkbox" ${plugin.enabled?'checked':''} ${busy?'disabled':''}>
            <span class="plugin-switch-track"><span class="plugin-switch-thumb"></span></span>
            <span class="plugin-switch-label">${plugin.enabled?'启用':'停用'}</span>
          </label>
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
          <div><strong>技术能力：</strong>${escapeHtml(localizedCaps)}</div>
        </div>`;

      const toggle=card.querySelector('.plugin-enable-input');
      toggle.onchange=async()=>{
        state.busy.add(plugin.id);
        renderList();
        try{
          await window.DKDSPlugins.manager.setEnabled(plugin.id,toggle.checked);
        }catch(err){
          state.host?.setStatus?.(`插件 ${display.name} 状态修改失败：${err.message}`);
        }finally{
          state.busy.delete(plugin.id);
          renderList();
        }
      };

      card.querySelector('.plugin-reload-btn').onclick=async()=>{
        if(!plugin.enabled)return;
        state.busy.add(plugin.id);
        renderList();
        try{
          if(plugin.active)await window.DKDSPlugins.manager.reload(plugin.id);
          else await window.DKDSPlugins.manager.enable(plugin.id);
        }catch(err){
          state.host?.setStatus?.(`插件 ${display.name} 加载失败：${err.message}`);
        }finally{
          state.busy.delete(plugin.id);
          renderList();
        }
      };

      const uninstall=card.querySelector('.plugin-uninstall-btn');
      if(uninstall)uninstall.onclick=async()=>{
        if(!window.confirm(`卸载本地插件 ${display.name}？\n\n不会删除工程中已保存的 ${plugin.id} 数据；重新安装同 ID 插件后仍可恢复。`))return;
        state.busy.add(plugin.id);renderList();
        try{await window.DKDSPlugins.external.uninstall(plugin.id);}
        catch(err){state.host?.setStatus?.(`卸载插件失败：${err.message}`);}
        finally{state.busy.delete(plugin.id);renderList();}
      };

      card.querySelector('.plugin-details-btn').onclick=()=>{
        const details=card.querySelector('.plugin-card-details');
        details.classList.toggle('hidden');
        card.querySelector('.plugin-details-btn').textContent=details.classList.contains('hidden')?'详情':'收起';
      };
      list.appendChild(card);
    }
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

  function bind(){
    if(state.bound)return;
    state.bound=true;
    $('#pluginManagerBtn').onclick=()=>{
      state.host?.openAnalysisPage?.('pluginManagerPage');
      renderList();
    };
    $('#pluginManagerSearch').oninput=e=>{state.query=e.target.value||'';renderList();};
    $('#pluginManagerFilter').onchange=e=>{state.filter=e.target.value||'all';renderList();};
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
      if(!window.confirm('恢复所有插件的默认启用状态？不会删除插件工程数据。'))return;
      try{
        await window.DKDSPlugins.manager.resetPreferences();
        state.host?.setStatus?.('插件启用状态已恢复默认。');
      }catch(err){
        state.host?.setStatus?.(`恢复插件默认状态失败：${err.message}`);
      }
      renderList();
    };

    window.DKDSPlugins?.events?.on?.('plugin:manager-changed',renderList);
    window.DKDSPlugins?.events?.on?.('plugin:state-changed',renderList);
    window.DKDSPlugins?.events?.on?.('plugins:ready',renderList);
  }

  window.DKDSPluginManagerUI={
    configure(host){state.host=host||{};bind();renderList();},
    render:renderList,
    open(){state.host?.openAnalysisPage?.('pluginManagerPage');renderList();}
  };
})();