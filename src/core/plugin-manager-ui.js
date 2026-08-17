(() => {
  const state = {
    host:null,
    filter:'all',
    query:'',
    busy:new Set(),
    bound:false
  };

  const $ = selector => document.querySelector(selector);

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
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
      'data.importer':'数据导入',
      'data.inspector':'数据检查',
      'analysis.resonance':'共振分析',
      'analysis.ter':'TER 分析',
      'analysis.pulse':'脉冲分析',
      'analysis.peak-detector':'寻峰算法',
      'ui.activity':'工作区',
      'ui.sidebar':'侧栏 UI',
      'ui.inspector':'检查器',
      'ui.group-charts':'组图',
      'ui.main-tools':'主图工具',
      'chart.trend':'趋势图',
      'chart.heatmap':'热图',
      'chart.timeseries':'时序图',
      'chart.renderer':'图形渲染',
      'data.model':'标准数据模型',
      'data.formula':'公式派生列',
      'workflow.processor':'数据处理器',
      'workflow.analyzer':'分析器',
      'workflow.recipe':'Recipe / 工作流',
      'project.slice':'工程状态'
    };
    return map[capability] || capability;
  }

  function contributionText(counts={}) {
    const entries=Object.entries(counts).filter(([,count])=>count>0);
    if(!entries.length)return '当前无已注册贡献';
    return entries.map(([kind,count])=>`${kind} × ${count}`).join(' · ');
  }

  function filteredPlugins() {
    const plugins=window.DKDSPlugins?.manager?.list?.()||[];
    const q=state.query.trim().toLowerCase();
    return plugins.filter(plugin=>{
      if(state.filter==='active'&&!plugin.active)return false;
      if(state.filter==='disabled'&&plugin.enabled)return false;
      if(state.filter==='error'&&plugin.status!=='error')return false;
      if(!q)return true;
      const hay=[plugin.name,plugin.id,plugin.description,...(plugin.capabilities||[])].join(' ').toLowerCase();
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
      const card=document.createElement('article');
      card.className=`plugin-manager-card status-${status.className}`;
      card.dataset.pluginId=plugin.id;
      const caps=(plugin.capabilities||[]).map(cap=>`<span class="plugin-capability-chip">${escapeHtml(capabilityLabel(cap))}</span>`).join('');
      const source=plugin.source==='builtin'?'内置插件':plugin.source==='external'?'本地安装':escapeHtml(plugin.source||'插件');
      const actionLabel=plugin.status==='error'?'重试':plugin.active?'重新加载':'加载';
      card.innerHTML=`
        <div class="plugin-card-head">
          <div class="plugin-card-icon" aria-hidden="true">${escapeHtml((plugin.name||plugin.id).slice(0,1).toUpperCase())}</div>
          <div class="plugin-card-title-wrap">
            <div class="plugin-card-title-line">
              <h3>${escapeHtml(plugin.name||plugin.id)}</h3>
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
          <p class="plugin-card-description">${escapeHtml(plugin.description||'未提供插件说明。')}</p>
          <div class="plugin-capability-row">${caps||'<span class="plugin-capability-chip muted">未声明能力</span>'}</div>
          ${plugin.error?`<div class="plugin-error-box"><strong>错误：</strong>${escapeHtml(plugin.error)}</div>`:''}
        </div>
        <div class="plugin-card-footer">
          <div class="plugin-card-meta">
            <span>${source}</span>
            <span>API ${escapeHtml(plugin.apiVersion||'?')}</span>
            <span>Order ${Number(plugin.order)||100}</span>
          </div>
          <div class="plugin-card-actions">
            <button class="plugin-details-btn" type="button">详情</button>
            <button class="plugin-reload-btn" type="button" ${(!plugin.enabled||busy)?'disabled':''}>${busy?'处理中…':actionLabel}</button>
            ${plugin.source==='external'?`<button class="plugin-uninstall-btn danger-soft" type="button" ${busy?'disabled':''}>卸载</button>`:''}
          </div>
        </div>
        <div class="plugin-card-details hidden">
          <div><strong>贡献：</strong>${escapeHtml(contributionText(plugin.contributionCounts))}</div>
          <div><strong>默认状态：</strong>${plugin.preference===undefined?(plugin.enabled?'由 manifest 启用':'由 manifest 停用'):'已由用户覆盖'}</div>
          <div><strong>Capabilities：</strong>${escapeHtml((plugin.capabilities||[]).join(', ')||'—')}</div>
        </div>`;

      const toggle=card.querySelector('.plugin-enable-input');
      toggle.onchange=async()=>{
        state.busy.add(plugin.id);
        renderList();
        try{
          await window.DKDSPlugins.manager.setEnabled(plugin.id,toggle.checked);
        }catch(err){
          state.host?.setStatus?.(`插件 ${plugin.name||plugin.id} 状态修改失败：${err.message}`);
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
          state.host?.setStatus?.(`插件 ${plugin.name||plugin.id} 加载失败：${err.message}`);
        }finally{
          state.busy.delete(plugin.id);
          renderList();
        }
      };

      const uninstall=card.querySelector('.plugin-uninstall-btn');
      if(uninstall)uninstall.onclick=async()=>{
        if(!window.confirm(`卸载本地插件 ${plugin.name||plugin.id}？\n\n不会删除工程中已保存的 ${plugin.id} 数据；重新安装同 ID 插件后仍可恢复。`))return;
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
        if(installed)state.host?.setStatus?.(`插件 ${installed.name||installed.id} 已安装并载入。`);
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
