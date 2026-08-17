(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'2.1.0',
    apiVersion:'1.3.0',
    description:'Complete resonance workspace UI: data navigator, detector controls, inspector, group charts, ridge/physics tools and exports.',
    source:'builtin',
    order:100,
    capabilities:['ui.activity','ui.sidebar','ui.inspector','ui.group-charts','ui.main-tools','analysis.resonance','chart.trend']
  }, async ctx => {
    const h=ctx.host;
    const R=h.resonance;
    const S=window.DKDSScience;
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let detectorParamPanel=null;
    const gatePageHtml=`<div class="analysis-page-header">
<div>
<h2>栅压物理分析</h2>
<div class="analysis-subtitle" id="gateAnalysisProjectName">当前项目</div>
</div>
<button class="analysis-page-close" data-analysis-target="gateAnalysisPage">返回主图</button>
</div>
<div class="analysis-page-body gate-analysis-body">
<div class="analysis-control-card gate-analysis-controls">
<label>共振 ridge A
            <select id="gateSeriesA"></select>
</label>
<label>共振 ridge B
            <select id="gateSeriesB"></select>
</label>
<label>回滞峰标签
            <select id="gateHysteresisLabel"></select>
</label>
<label>宽度显示
            <select id="gateWidthMode">
<option value="hwhm">HWHM = FWHM/2</option>
<option value="fwhm">FWHM</option>
</select>
</label>
<button class="primary" id="gateAnalysisRefreshBtn">计算 / 刷新</button>
<button id="gateAnalysisExportCsvBtn">导出分析数据 CSV</button>
<button class="copy-btn" id="gateAnalysisCopyCsvBtn">复制分析数据</button>
<button id="gateAnalysisExportReportBtn">导出报告 Markdown</button>
</div>
<div class="analysis-control-card gate-density-controls">
<strong>可选：栅压 → 载流子浓度</strong>
<label class="inline-check">
<input id="gateUseCarrierDensity" type="checkbox"/>
            启用 n<sub>g</sub>
</label>
<label>C<sub>g</sub> (F/m²)
            <input id="gateCg" placeholder="例如 1.0e-4" step="any" type="number"/>
</label>
<label>V<sub>CNP</sub> (V)
            <input id="gateCnp" placeholder="0" step="any" type="number"/>
</label>
<span class="analysis-inline-formula">n<sub>g</sub> = C<sub>g</sub>(V<sub>g</sub>−V<sub>CNP</sub>)/e</span>
</div>
<div class="analysis-note gate-analysis-note">
          两条 ridge 应尽量选择同一扫描方向，并由你根据独立证据决定是否可称为 AB/BA。
          页面内部使用 A/B 中性命名。V<sub>0</sub>=(V<sub>B</sub>+V<sub>A</sub>)/2，
          δ=(V<sub>B</sub>−V<sub>A</sub>)/2；用于可分辨度时采用 |δ|。
          峰宽 w 默认使用 HWHM。回滞页显示的是同一峰标签的正/反扫峰位差 ΔV<sub>R</sub>，
          <b>不把它自动当作 coercive voltage V<sub>c</sub></b>。
        </div>
<div class="ter-summary" id="gateAnalysisSummary"></div>
<div class="gate-analysis-grid">
<div class="analysis-chart-card">
<div class="analysis-chart-title">1. 共振轨迹 V<sub>R,A</sub>(V<sub>g</sub>) / V<sub>R,B</sub>(V<sub>g</sub>)</div>
<div class="analysis-chart" id="gateResonancePlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">2. 共振中心 V<sub>0</sub>(V<sub>g</sub>)</div>
<div class="analysis-chart" id="gateV0Plot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">3. 有效分裂 δ(V<sub>g</sub>)</div>
<div class="analysis-chart" id="gateDeltaPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">4. 峰宽与 |δ|/w</div>
<div class="analysis-chart" id="gateWidthPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">5. TER<sub>max</sub>(V<sub>g</sub>)</div>
<div class="analysis-chart" id="gateTerMaxPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">6. 最佳读出偏压 V<sub>d</sub><sup>*</sup>(V<sub>g</sub>)</div>
<div class="analysis-chart" id="gateVdStarPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">7. 正/反扫峰位回滞（不是 V<sub>c</sub>）</div>
<div class="analysis-chart" id="gateHysteresisPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">8. TER<sub>max</sub> vs |δ|/w</div>
<div class="analysis-chart" id="gateTerCorrelationPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">9. V<sub>d</sub><sup>*</sup> vs V<sub>0</sub></div>
<div class="analysis-chart" id="gateReadoutCorrelationPlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">10. 峰高与有效电学权重</div>
<div class="analysis-chart" id="gateAmplitudePlot"></div>
</div>
<div class="analysis-chart-card">
<div class="analysis-chart-title">11. 局域背景与峰/背景比</div>
<div class="analysis-chart" id="gateBackgroundPlot"></div>
</div>
<div class="analysis-chart-card gate-density-card">
<div class="analysis-chart-title">12. 可选：δ(n<sub>g</sub>) 与 TER<sub>max</sub>(n<sub>g</sub>)</div>
<div class="analysis-chart" id="gateDensityPlot"></div>
</div>
</div>
<h3 class="analysis-section-title">自动分析报告</h3>
<div class="gate-analysis-report" id="gateAnalysisReport"></div>
<h3 class="analysis-section-title">派生数据</h3>
<div class="analysis-table-wrap gate-analysis-table-wrap">
<table class="analysis-table" id="gateAnalysisTable"></table>
</div>
</div>`;
    const spacingPageHtml=`<div class="analysis-page-header">
<div>
<h2>两峰间距分析</h2>
<div class="analysis-subtitle" id="spacingProjectName">当前项目</div>
</div>
<button class="analysis-page-close" data-analysis-target="spacingPage">返回主图</button>
</div>
<div class="analysis-page-body">
<div class="analysis-control-card">
<label>峰 A
            <select id="spacingSeriesA"></select>
</label>
<label>峰 B
            <select id="spacingSeriesB"></select>
</label>
<label>显示
            <select id="spacingMode">
<option value="abs">绝对间距 |VB−VA|</option>
<option value="signed">有符号差 VB−VA</option>
</select>
</label>
<button class="primary" id="spacingRefreshBtn">计算 / 刷新</button>
<button id="spacingExportCsvBtn">导出 CSV</button>
<button class="copy-btn" id="spacingCopyCsvBtn">复制数据</button>
<button id="spacingExportSvgBtn">导出 SVG</button>
<button id="spacingExportPngBtn">导出 PNG</button>
</div>
<div class="analysis-note">
          下拉框中的“正扫·峰1”和“反扫·峰1”是两个独立序列。仅在两个序列具有相同 Vg 数据点时计算间距。
        </div>
<div class="analysis-large-plot" id="spacingPlot"></div>
<div class="analysis-table-wrap">
<table class="analysis-table" id="spacingTable"></table>
</div>
</div>`;

    ctx.ui.activities.add({
      id:'resonance',label:'共振分析',contextLabel:'共振分析',icon:'∿',order:10,default:true,primary:true,
      description:'共振 I–V、峰轨迹、TER 与栅压依赖工作区',
      onActivate:()=>h.showMainWorkspace()
    });

    // The main scientific canvas is also a plugin contribution. Core owns the
    // canvas host, while this plugin owns the resonance-specific renderer.
    ctx.ui.mainViews.register('resonance-main',{
      activity:'resonance',priority:100,title:'共振 I–V',exportBaseName:'dk_data_main',
      render:()=>R.renderMainPlotLegacy(),
      reset:()=>R.resetMainViewLegacy(),
      csvText:()=>R.mainCsvText(),
      exportCsv:()=>R.exportMainCsv(),
      exportSvg:()=>R.exportMainSvg(),
      exportPng:()=>R.exportMainPng()
    });

    // The canvas host owns rectangle geometry; the active plugin owns every
    // command, label and control shown for that selection.
    ctx.ui.selectionMenus.register('resonance-range',{
      activity:'resonance',priority:100,
      render:({container,selection})=>{
        const disabled=selection.peakCount?'':' disabled';
        container.innerHTML=`<div class="range-action-summary">Vd ${selection.range.vMin.toFixed(4)} ~ ${selection.range.vMax.toFixed(4)} V · 框内 ${selection.peakCount} 个峰 · 局部寻峰作用于${esc(selection.scopeText)}</div>
          <div class="range-action-grid">
            <button data-range-action="detect" class="primary">局部寻峰</button>
            <button data-range-action="delete" class="danger-soft"${disabled}>删除框选峰</button>
            <button data-range-action="lock"${disabled}>锁定框选峰</button>
            <button data-range-action="unlock"${disabled}>解锁框选峰</button>
          </div>
          <div class="range-unify-identity">
            <div class="range-unify-title">统一峰序 / 峰标签</div>
            <select data-range-order title="将全部框选峰设置为同一峰类别"${disabled}>${selection.categories.map(c=>`<option value="${c.order}" ${Number(c.order)===selection.firstOrder?'selected':''}>${c.order} · ${esc(c.label||R.range.categoryLabel(c.order))}</option>`).join('')}</select>
            <input data-range-label type="text" value="${esc(R.range.categoryLabel(selection.firstOrder))}" placeholder="类别标签，例如 峰3 / AB"${disabled}>
            <button data-range-action="identity"${disabled}>应用到框选峰</button>
          </div>
          <div class="range-action-footer"><span>峰位仍落在原始 I–V 采样点</span><button data-range-action="close">关闭</button></div>`;
        const order=container.querySelector('[data-range-order]');
        const label=container.querySelector('[data-range-label]');
        order?.addEventListener('change',()=>{label.value=R.range.categoryLabel(Number(order.value)||1);});
        container.querySelector('[data-range-action="detect"]')?.addEventListener('click',()=>R.range.localDetect());
        container.querySelector('[data-range-action="delete"]')?.addEventListener('click',()=>R.range.deleteSelected());
        container.querySelector('[data-range-action="lock"]')?.addEventListener('click',()=>R.range.lockSelected());
        container.querySelector('[data-range-action="unlock"]')?.addEventListener('click',()=>R.range.unlockSelected());
        container.querySelector('[data-range-action="identity"]')?.addEventListener('click',()=>R.range.applyIdentity(Number(order?.value)||1,label?.value||''));
        container.querySelector('[data-range-action="close"]')?.addEventListener('click',()=>R.range.close());
      }
    });

    // ----------------------------
    // Plugin-owned data navigator
    // ----------------------------
    const dataSection=ctx.ui.sidebar.add({
      id:'datasets',activity:'resonance',order:10,
      html:`<h3>数据列表</h3>
        <div class="row compact scan-global-buttons">
          <button data-action="all">全部扫描</button><button data-action="forward">仅正扫</button>
          <button data-action="reverse">仅反扫</button><button data-action="none">全不选</button>
        </div>
        <div class="plugin-dataset-list dataset-list"></div>`
    });
    dataSection.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>R.setAllVisibility(btn.dataset.action));

    function renderDataSection(){
      const state=R.getState();
      const host=dataSection.querySelector('.plugin-dataset-list');
      if(!host)return;
      host.innerHTML='';
      if(!state.datasets.length){host.innerHTML='<div class="empty-state compact-empty">导入数据后显示</div>';return;}
      for(const ds of state.datasets){
        const item=document.createElement('div');
        item.className='dataset-item';
        if(state.sweeps.some(sw=>sw.datasetPath===ds.path&&sw.id===state.selectedSweepId))item.classList.add('selected');
        const vis=state.scanVisibility.get(ds.path)||{forward:true,reverse:true};
        const hasF=state.sweeps.some(sw=>sw.datasetPath===ds.path&&sw.direction>0);
        const hasR=state.sweeps.some(sw=>sw.datasetPath===ds.path&&sw.direction<0);
        item.innerHTML=`
          <input class="dataset-master" type="checkbox">
          <div class="dataset-content">
            <div class="dataset-title">${esc(ds.name)}</div>
            <label class="dataset-vg-edit" title="该元数据属于共振工作流，不是通用 DataTable 的固定字段">
              <span>Vg</span><input class="dataset-vg-input" type="number" step="any" value="${Number.isFinite(ds.vg)?ds.vg:''}" placeholder="?"><span>V</span>
            </label>
            <div class="scan-toggle-row">
              <label><input class="scan-forward" type="checkbox" ${vis.forward?'checked':''} ${hasF?'':'disabled'}> 正扫</label>
              <label><input class="scan-reverse" type="checkbox" ${vis.reverse?'checked':''} ${hasR?'':'disabled'}> 反扫</label>
            </div>
            <div class="dataset-transform-row" title="仅用于共振检查器中的辅助视图">
              <span>辅助</span><select class="transform-preview">${R.transformOptions.map(([key,name])=>`<option value="${key}" ${R.transformForDataset(ds.path)===key?'selected':''}>${esc(name)}</option>`).join('')}</select>
            </div>
          </div>`;
        const master=item.querySelector('.dataset-master');
        master.checked=vis.forward&&vis.reverse; master.indeterminate=vis.forward!==vis.reverse;
        master.onclick=e=>{e.stopPropagation();R.snapshot('修改数据显示');R.setDatasetVisibility(ds.path,'all',e.target.checked);R.renderAll();};
        const vg=item.querySelector('.dataset-vg-input');
        vg.onclick=e=>e.stopPropagation();vg.onkeydown=e=>e.stopPropagation();vg.onchange=e=>{e.stopPropagation();R.updateDatasetVg(ds,e.target.value);};
        item.querySelector('.scan-forward').onclick=e=>{e.stopPropagation();R.snapshot('修改正扫显示');R.setDatasetVisibility(ds.path,'forward',e.target.checked);R.renderAll();};
        item.querySelector('.scan-reverse').onclick=e=>{e.stopPropagation();R.snapshot('修改反扫显示');R.setDatasetVisibility(ds.path,'reverse',e.target.checked);R.renderAll();};
        item.querySelector('.transform-preview').onchange=e=>{e.stopPropagation();R.setDatasetTransform(ds.path,e.target.value);};
        item.onclick=e=>{if(e.target.closest('input,label,button,select'))return;R.selectDatasetByPath(ds.path);};
        host.appendChild(item);
      }
    }

    // ----------------------------
    // Plugin-owned peak/detector UI
    // ----------------------------
    const peakSection=ctx.ui.sidebar.add({
      id:'peak-detection',activity:'resonance',order:20,
      html:`<div class="plugin-section-title"><h3>智能寻峰</h3><span class="plugin-owned-badge">插件</span></div>
        <label class="resonance-detector-picker">寻峰算法<select id="resonanceDetectorSelect"></select></label>
        <div id="resonanceDetectorDescription" class="smart-detection-note compact-note"></div>
        <div id="resonancePresetRow" class="preset-row smart-preset-row"></div>
        <button id="resonanceRunDetection" class="primary wide">智能寻峰 / 补峰</button>
        <details class="advanced-peak-settings"><summary>算法参数</summary><div id="resonanceAlgorithmControls"></div></details>
        <div id="resonancePeakColorLegend" class="peak-color-legend"></div>`
    });

    const displaySection=ctx.ui.sidebar.add({
      id:'display',activity:'resonance',order:30,
      html:`<h3>共振显示</h3><div class="resonance-display-grid">
        <label><input type="checkbox" data-display="showRejected"> 显示不采纳峰</label>
        <label><input type="checkbox" data-display="showWidth"> 显示选中峰宽</label>
        <label><input type="checkbox" data-display="showPoints"> 显示峰位点</label>
        <label><input type="checkbox" id="showPhysicsLabels"> 主图标注物理类型</label>
      </div>`
    });

    function renderPeakLegend(){
      const host=peakSection.querySelector('#resonancePeakColorLegend');
      R.ensurePeakCategories();
      const state=R.getState();
      const orders=state.peakCategories.length?state.peakCategories.map(c=>c.order):[1];
      host.innerHTML=`<div class="legend-title">颜色 = 峰类别/峰序；形状 = 寻峰证据</div>
        <div class="peak-color-rows"><div><b>正扫</b> ${orders.map(k=>`<span class="peak-order-chip"><i style="background:${R.colorForPeakOrder(k,1)}"></i>${esc(R.categoryLabel(k))}</span>`).join('')}</div>
        <div><b>反扫</b> ${orders.map(k=>`<span class="peak-order-chip"><i style="background:${R.colorForPeakOrder(k,-1)}"></i>${esc(R.categoryLabel(k))}</span>`).join('')}</div></div>`;
    }


    function renderDetectorUi(rebuildParams=true){
      const providers=R.detectors();
      const state=R.getState();
      const select=peakSection.querySelector('#resonanceDetectorSelect');
      select.innerHTML=providers.map(p=>`<option value="${esc(p.id)}">${esc(p.shortName||p.name||p.id)}</option>`).join('');
      const active=R.activeDetector();
      if(active)select.value=active.id;
      select.disabled=!providers.length;
      peakSection.querySelector('#resonanceRunDetection').disabled=!active;
      peakSection.querySelector('#resonanceDetectorDescription').innerHTML=active?`${esc(active.description||active.name||active.id)}<br><b>最终峰位必须由算法输出可追溯的原始数据坐标。</b>`:'没有已启用的寻峰算法插件。请在插件管理器中启用一个 peak.detectors 提供者。';
      const presetHost=peakSection.querySelector('#resonancePresetRow');
      const presets=active?.presets||[];
      presetHost.innerHTML=presets.map(name=>`<button data-preset="${name}" class="${state.algorithms._preset===name?'active':''}">${name==='strict'?'可靠':name==='balanced'?'平衡':name==='sensitive'?'灵敏':esc(name)}</button>`).join('');
      presetHost.classList.toggle('hidden',!presets.length);
      presetHost.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{if(!active)return;R.setDetectionPreset(btn.dataset.preset);R.setDetectorId(active.id);renderDetectorUi(true);R.setStatus(`寻峰预设已切换为“${btn.textContent.trim()}”。`);});
      if(!rebuildParams)return;
      const host=peakSection.querySelector('#resonanceAlgorithmControls');
      detectorParamPanel?.destroy?.();detectorParamPanel=null;
      if(active?.renderSettings){
        detectorParamPanel=active.renderSettings({
          container:host,
          settings:R.detectorSettingsFor(active),
          onChange:value=>R.setDetectorSettings(active.id,value),
          platform:ctx.platform?.profile||null
        })||null;
      }else if(active?.parameterSchema){
        detectorParamPanel=ctx.parameters.render(host,active.parameterSchema,{value:R.detectorSettingsFor(active),onChange:value=>R.setDetectorSettings(active.id,value)});
      }else host.innerHTML='<div class="empty-state compact-empty">该算法没有可调参数。</div>';
    }

    peakSection.querySelector('#resonanceDetectorSelect').onchange=e=>{R.setDetectorId(e.target.value);renderDetectorUi(true);};
    peakSection.querySelector('#resonanceRunDetection').onclick=()=>R.runDetection(true);
    displaySection.querySelectorAll('[data-display]').forEach(el=>el.onchange=e=>R.setPeakDisplay(e.target.dataset.display,e.target.checked));
    displaySection.querySelector('#showPhysicsLabels').onchange=e=>{const state=R.getState();state.physicsShowLabels=!!e.target.checked;R.captureActiveProjectTab();R.renderMainPlot();};

    function syncSidebarState(){
      const state=R.getState();
      renderDataSection();renderDetectorUi(false);renderPeakLegend();
      displaySection.querySelectorAll('[data-display]').forEach(el=>el.checked=!!state.peakDisplay[el.dataset.display]);
      displaySection.querySelector('#showPhysicsLabels').checked=!!state.physicsShowLabels;
      const btn=document.getElementById('resonancePhysicsLabelsTool');if(btn)btn.classList.toggle('active',!!state.physicsShowLabels);
    }

    function renderPhysicsPanel(){
      const host=document.querySelector('#physicsBody');
      if(!host)return;
      const state=R.getState();
      const ph=R.physicalAnalysis();
      const types=S.PHYSICS_TYPES||{};
      if(!state.peaks.length){
        host.innerHTML='<div class="empty-state">尚无峰位。先寻峰/人工确认峰位后再进行机制分析。</div>';
        return;
      }
      const codes=['R','H','D','X','Q'].map(code=>
        `<span class="physics-code"><span class="physics-badge ${code}">${code==='Q'?'?':code}</span>${esc(types[code]?.name||code)}</span>`
      ).join('');
      const rows=ph.families.map(f=>`
        <tr><td>${esc(f.label)}</td><td><span class="physics-badge ${f.code}">${f.code==='Q'?'?':f.code}</span> ${esc(f.type)}</td>
        <td>${f.forwardCount}</td><td>${f.reverseCount}</td>
        <td>${Number.isFinite(f.medianDelta)?f.medianDelta.toFixed(4):'—'}</td>
        <td>${Number.isFinite(f.medianWidth)?f.medianWidth.toFixed(4):'—'}</td></tr>`).join('');
      const vd=ph.v0Delta?.length?`
        <div class="inspector-section"><h4>两主 ridge 的 V0 / δ（基于已确认峰位）</h4>
        <table class="physics-table"><thead><tr><th>Vg</th><th>V0</th><th>δ</th></tr></thead>
        <tbody>${ph.v0Delta.slice(0,24).map(r=>`<tr><td>${r.vg}</td><td>${r.V0.toFixed(4)} V</td><td>${r.delta.toFixed(4)} V</td></tr>`).join('')}</tbody></table></div>`:'';
      host.innerHTML=`
        <div class="physics-model-card"><div class="physics-model-title">${esc(ph.modelTitle)}</div><div>${esc(ph.modelText)}</div></div>
        <div class="physics-code-list">${codes}</div>
        <div class="physics-note">自动分类只使用峰轨迹的跨 Vg 连续性、正反扫共同出现情况、峰位差与峰宽等实验量。
        “D”仅表示动态/切换候选，不等价于已证明畴壁切换；“X”也不等价于已证明有限转角。</div>
        <table class="physics-table"><thead><tr><th>峰标签</th><th>物理类型</th><th>正扫 Vg 点</th><th>反扫 Vg 点</th><th>中位 ΔV</th><th>中位 FWHM</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6">暂无可分析峰族</td></tr>'}</tbody></table>${vd}`;
    }

    // ----------------------------
    // Context tools and plugin pages
    // ----------------------------
    ctx.ui.toolbar.add({id:'toggleInspectorBtn',activity:'resonance',section:'视图',priority:100,label:'曲线检查',order:10,onClick:()=>R.toggleInspectorVisibility()});
    ctx.ui.toolbar.add({id:'toggleGroupBtn',activity:'resonance',section:'视图',priority:95,label:'组图分析',order:20,onClick:()=>R.toggleGroupVisibility()});

    const physicsPanel=ctx.ui.panels.add({
      id:'physics',panelId:'physicsPanel',activity:'resonance',section:'分析',priority:70,label:'物理机制',toolbarLabel:'物理机制',order:30,
      className:'physics-panel',html:'<div id="physicsBody"><div class="empty-state">导入并确认峰位后自动分析</div></div>',
      headerActionsHtml:'<button id="refreshPhysicsBtn" type="button">刷新</button>',
      onOpen:()=>renderPhysicsPanel()
    });
    physicsPanel.querySelector('#refreshPhysicsBtn').onclick=()=>{renderPhysicsPanel();R.renderMainPlot();R.setStatus('物理机制分析已根据当前已采纳峰刷新。');};

    const spacingPage=ctx.ui.pages.add({
      id:'spacing',buttonId:'openSpacingPageBtn',pageId:'spacingPage',activity:'resonance',section:'分析',priority:60,label:'峰间分析',order:40,
      html:spacingPageHtml,onOpen:()=>R.renderSpacingPage()
    });
    spacingPage.querySelector('#spacingSeriesA').onchange=e=>{R.getState().spacingSettings.seriesA=e.target.value;R.renderSpacingPage();};
    spacingPage.querySelector('#spacingSeriesB').onchange=e=>{R.getState().spacingSettings.seriesB=e.target.value;R.renderSpacingPage();};
    spacingPage.querySelector('#spacingMode').onchange=e=>{R.getState().spacingSettings.mode=e.target.value;R.renderSpacingPage();};
    spacingPage.querySelector('#spacingRefreshBtn').onclick=()=>R.renderSpacingPage();
    spacingPage.querySelector('#spacingExportCsvBtn').onclick=()=>R.exportSpacingCsv();
    spacingPage.querySelector('#spacingCopyCsvBtn').onclick=()=>R.copyTextToClipboard(R.spacingCsvText(),'峰间距 CSV');
    spacingPage.querySelector('#spacingExportSvgBtn').onclick=()=>R.savePlotlyImage('spacingPlot','peak_spacing_vs_Vg','svg');
    spacingPage.querySelector('#spacingExportPngBtn').onclick=()=>R.savePlotlyImage('spacingPlot','peak_spacing_vs_Vg','png');

    const gatePage=ctx.ui.pages.add({
      id:'gate-analysis',buttonId:'openGateAnalysisPageBtn',pageId:'gateAnalysisPage',activity:'resonance',section:'分析',priority:65,label:'栅压分析',order:50,
      html:gatePageHtml,onOpen:()=>R.renderGateAnalysis()
    });
    gatePage.querySelector('#gateSeriesA').onchange=e=>{R.getState().gateAnalysisSettings.seriesA=e.target.value;R.renderGateAnalysis();};
    gatePage.querySelector('#gateSeriesB').onchange=e=>{R.getState().gateAnalysisSettings.seriesB=e.target.value;R.renderGateAnalysis();};
    gatePage.querySelector('#gateHysteresisLabel').onchange=e=>{R.getState().gateAnalysisSettings.hysteresisLabel=e.target.value;R.renderGateAnalysis();};
    gatePage.querySelector('#gateWidthMode').onchange=e=>{R.getState().gateAnalysisSettings.widthMode=e.target.value;R.renderGateAnalysis();};
    gatePage.querySelector('#gateUseCarrierDensity').onchange=e=>{R.getState().gateAnalysisSettings.useCarrierDensity=!!e.target.checked;R.renderGateAnalysis();};
    gatePage.querySelector('#gateCg').onchange=()=>R.renderGateAnalysis();
    gatePage.querySelector('#gateCnp').onchange=()=>R.renderGateAnalysis();
    gatePage.querySelector('#gateAnalysisRefreshBtn').onclick=()=>R.renderGateAnalysis();
    gatePage.querySelector('#gateAnalysisExportCsvBtn').onclick=()=>R.exportGateAnalysisCsv();
    gatePage.querySelector('#gateAnalysisCopyCsvBtn').onclick=()=>{R.renderGateAnalysis();R.copyTextToClipboard(R.gateAnalysisCsv(),'栅压分析 CSV');};
    gatePage.querySelector('#gateAnalysisExportReportBtn').onclick=()=>R.exportGateAnalysisReport();

    ctx.ui.mainTools.add({id:'resonanceLockTool',activity:'resonance',label:'锁定所选',title:'锁定框选/选中的峰 (L)',order:10,onClick:()=>R.lockSelectedPeaks(true)});
    ctx.ui.mainTools.add({id:'resonanceUnlockTool',activity:'resonance',label:'解除锁定',title:'解锁框选/选中的峰 (Shift+L)',order:20,onClick:()=>R.lockSelectedPeaks(false)});
    ctx.ui.mainTools.add({id:'resonanceSortTool',activity:'resonance',label:'智能峰序',title:'跨 Vg 保持 ridge 编号并允许缺峰',order:30,onClick:()=>R.sortPeakOrderByVd()});
    ctx.ui.mainTools.add({id:'resonancePhysicsLabelsTool',activity:'resonance',label:'物理标记',title:'显示/隐藏物理类型文字标记 (P)',order:40,onClick:()=>R.togglePhysicsLabels()});
    ctx.ui.mainTools.add({id:'resonanceResetViewTool',activity:'resonance',label:'适应视图',title:'恢复完整主图范围 (R)',order:50,onClick:()=>R.resetMainViewLegacy()});


    // Desktop shortcuts belong to this scientific workspace. Core keeps only
    // universal project/file shortcuts and generic reset/deselect behavior.
    ctx.ui.shortcuts.add({
      id:'resonance-editing-shortcuts',activity:'resonance',priority:200,
      match:e=>{
        const key=String(e.key||'');
        if(key==='Escape'){
          const menu=document.querySelector('#selectionActionMenu');
          return !!menu&&!menu.classList.contains('hidden');
        }
        if(key==='l'||key==='L'||key==='p'||key==='P')return true;
        if((e.ctrlKey||e.metaKey)&&(key==='ArrowLeft'||key==='ArrowRight'))return true;
        if((key==='Delete'||key==='Backspace')&&R.hasSelectedPeaks())return true;
        if(key==='ArrowUp'||key==='ArrowDown')return true;
        if((key==='ArrowLeft'||key==='ArrowRight')&&R.selectedPeak())return true;
        return false;
      },
      handler:({event:e})=>{
        const key=String(e.key||'');
        if(key==='Escape'){R.range.close();R.renderMainPlot();return;}
        if(key==='l'||key==='L'){R.lockSelectedPeaks(!e.shiftKey);return;}
        if(key==='p'||key==='P'){R.togglePhysicsLabels();return;}
        if((e.ctrlKey||e.metaKey)&&key==='ArrowLeft'){R.selectAdjacentPeak(-1);return;}
        if((e.ctrlKey||e.metaKey)&&key==='ArrowRight'){R.selectAdjacentPeak(1);return;}
        if(key==='Delete'||key==='Backspace'){R.deleteSelectedPeaks('键盘删除所选峰');return;}
        if(key==='ArrowUp'){R.switchSelectedSweep(-1);return;}
        if(key==='ArrowDown'){R.switchSelectedSweep(1);return;}
        if(key==='ArrowLeft'){R.moveSelectedPeakBy(e.shiftKey?-5:-1);return;}
        if(key==='ArrowRight'){R.moveSelectedPeakBy(e.shiftKey?5:1);return;}
        return false;
      }
    });

    ctx.ui.menus.add({id:'exportPeakParameters',menu:'export',activity:'resonance',label:'峰参数 CSV',order:20,onClick:()=>R.exportPeaks()});
    ctx.ui.menus.add({id:'copyPeakParameters',menu:'export',activity:'resonance',label:'复制峰参数',order:30,onClick:()=>R.copyPeaks()});

    // ----------------------------
    // Plugin-owned curve/peak inspector
    // ----------------------------
    function transformPreviewMarkup(sw){
      if(!sw)return '';
      const type=R.transformForDataset(sw.datasetPath);
      return `<div class="transform-preview-wrap"><div class="transform-preview-head"><b>辅助变换：${esc(R.transformName(type))}</b><span>候选核对</span></div><div class="plugin-transform-preview transform-preview-plot"></div><div class="transform-preview-note">最终 Vd 始终对应原始 I–V 真实采样点。</div></div>`;
    }
    function renderTransformPlot(container,sw){
      const el=container.querySelector('.plugin-transform-preview');if(!el||!sw)return;
      const type=R.transformForDataset(sw.datasetPath);const t=S.transformSweep(sw,type);const finite=t.points.filter(p=>Number.isFinite(p.y));const state=R.getState();const peaks=state.peaks.filter(p=>p.sweepId===sw.id&&p.accepted);
      const traces=[{x:finite.map(p=>p.v),y:finite.map(p=>p.y),mode:'lines',name:t.label,line:{width:1.7},hovertemplate:`Vd=%{x:.6g} V<br>${t.label}=%{y:.5g}<extra></extra>`}];
      if(peaks.length){const nearestY=p=>t.points[S.nearestIndex(t.points.map(q=>q.v),p.v)]?.y;traces.push({x:peaks.map(p=>p.v),y:peaks.map(nearestY),mode:'markers',name:'原始 I–V 峰位投影',marker:{size:8,symbol:'circle-open'},text:peaks.map(p=>R.peakLabel(p)),hovertemplate:'%{text}<br>Vpk(raw)=%{x:.6g} V<extra></extra>'});}
      Plotly.react(el,traces,{margin:{l:58,r:14,t:10,b:42},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5',automargin:true},yaxis:{title:t.unit||'',gridcolor:'#edf0f5',automargin:true,exponentformat:'e'},showlegend:false,hovermode:'closest',dragmode:'zoom',autosize:true},{responsive:true,displaylogo:false,displayModeBar:false,scrollZoom:true,doubleClick:'reset'});
    }
    ctx.ui.inspectors.register('resonance-inspector',{
      activity:'resonance',priority:100,panelTitle:'共振检查器',
      render({container}){
        const p=R.selectedPeak(),sw=R.selectedSweep();
        if(p){
          const psw=R.sweepById(p.sweepId),m=R.metrics(p,psw);R.ensurePeakCategories();const state=R.getState();
          const categoryButtons=state.peakCategories.map(c=>`<button type="button" class="peak-category-choice ${Number(c.order)===Number(p.peakOrder)?'selected':''}" data-cat="${c.order}"><span class="category-pair-swatch"><i class="cool" style="background:${R.colorForPeakOrder(c.order,1)}"></i><i class="warm" style="background:${R.colorForPeakOrder(c.order,-1)}"></i></span><span>${esc(c.label)}</span></button>`).join('');
          container.innerHTML=`<div class="inspector-section"><h4>选中峰</h4><div class="kv"><div class="k">文件</div><div>${esc(psw.datasetName)}</div><div class="k">Vg</div><div>${p.vg} V</div><div class="k">扫描</div><div>${R.directionName(p.direction)}</div><div class="k">Vpk</div><div>${p.v.toFixed(6)} V</div><div class="k">Ipk</div><div>${R.formatI(p.i)}</div><div class="k">FWHM</div><div>${m.fwhm.toFixed(6)} V</div><div class="k">Amplitude</div><div>${R.formatI(m.amplitude)}</div><div class="k">Area</div><div>${m.area.toExponential(4)} A·V</div><div class="k">寻峰证据</div><div>${R.evidenceMeta(p).glyph} ${esc((p.supportChannels||p.algorithms||[]).map(k=>R.evidenceMeta({...p,primaryAlgorithm:k}).label).join('、')||'手动')}</div><div class="k">置信度</div><div>${Number.isFinite(Number(p.confidence))?(Number(p.confidence)*100).toFixed(0)+'%':'—'}</div><div class="k">状态</div><div>${p.accepted?'采纳':'不采纳'}${p.locked?' · 已锁定':''}</div></div></div>
          <div class="inspector-section"><h4>峰类别 / 峰标签</h4><div class="peak-category-palette">${categoryButtons}</div><div class="row compact"><button data-add-cat>＋ 新增类别</button></div><div class="peak-class-grid category-rename-grid"><label>当前类别<input value="峰${Number(p.peakOrder)||1}" disabled></label><label>类别标签<input data-cat-label value="${esc(R.peakLabel(p))}"></label></div><div class="row compact"><button data-rename-cat>重命名当前类别</button></div></div>
          <div class="action-grid"><button data-accept>${p.accepted?'不采纳':'恢复采纳'}</button><button data-lock>${p.locked?'解除锁定':'锁定峰位'}</button><button data-delete>删除峰</button><button data-curve>选中所属曲线</button></div>${transformPreviewMarkup(psw)}`;
          container.querySelectorAll('[data-cat]').forEach(btn=>btn.onclick=()=>R.assignPeakCategory(p,btn.dataset.cat));
          container.querySelector('[data-add-cat]').onclick=()=>R.createPeakCategoryForPeak(p);
          container.querySelector('[data-rename-cat]').onclick=()=>R.renamePeakCategory(p,container.querySelector('[data-cat-label]').value);
          container.querySelector('[data-accept]').onclick=()=>R.togglePeakAccepted(p);
          container.querySelector('[data-lock]').onclick=()=>R.togglePeakLocked(p);
          container.querySelector('[data-delete]').onclick=()=>R.deletePeakById(p.id);
          container.querySelector('[data-curve]').onclick=()=>R.selectSweepFromMain(psw,{openInspector:true});
          requestAnimationFrame(()=>renderTransformPlot(container,psw));return;
        }
        if(sw){
          const state=R.getState();const peaks=state.peaks.filter(p=>p.sweepId===sw.id).sort((a,b)=>a.v-b.v);const tags=peaks.map(p=>`${esc(R.peakLabel(p))} (${R.evidenceMeta(p).glyph})`).join('、')||'无';
          container.innerHTML=`<div class="inspector-section"><h4>选中曲线</h4><div class="kv"><div class="k">文件</div><div>${esc(sw.datasetName)}</div><div class="k">Vg</div><div>${sw.vg} V</div><div class="k">扫描方向</div><div>${R.directionName(sw.direction)}</div><div class="k">电压范围</div><div>${sw.points[0].v.toFixed(3)} ~ ${sw.points.at(-1).v.toFixed(3)} V</div><div class="k">数据点</div><div>${sw.points.length}</div><div class="k">峰位点</div><div>${peaks.length}（采纳 ${peaks.filter(p=>p.accepted).length}）</div><div class="k">峰标签</div><div>${tags}</div></div></div><div class="row compact"><button data-sort>跨 Vg 智能整理峰序</button></div>${transformPreviewMarkup(sw)}`;
          container.querySelector('[data-sort]').onclick=()=>R.sortPeakOrderByVd();requestAnimationFrame(()=>renderTransformPlot(container,sw));return;
        }
        container.innerHTML='<div class="empty-state">点击曲线或峰位点查看详细信息</div>';
      }
    });

    // ----------------------------
    // Plugin-owned group plot model and plot types
    // ----------------------------
    function trendModel(){
      const state=R.getState(),p=R.selectedPeak(),sw=R.selectedSweep();const visibleIds=new Set(R.visibleSweepIds());const accepted=state.peaks.filter(q=>q.accepted&&visibleIds.has(q.sweepId));let wanted=[];
      if(p)wanted=[{direction:p.direction,label:R.peakLabel(p)}];
      else if(sw){const labels=[...new Set(state.peaks.filter(q=>q.accepted&&q.sweepId===sw.id).map(q=>R.peakLabel(q)))];wanted=labels.map(label=>({direction:sw.direction,label}));}
      else{const seen=new Set();for(const q of accepted){const key=`${q.direction}::${R.peakLabel(q)}`;if(!seen.has(key)){seen.add(key);wanted.push({direction:q.direction,label:R.peakLabel(q)});}}}
      const series=[];for(const w of wanted){const pts=accepted.filter(q=>q.direction===w.direction&&R.peakLabel(q)===w.label).map(q=>{const ss=R.sweepById(q.sweepId);return ss?R.metrics(q,ss):null;}).filter(Boolean).sort((a,b)=>a.vg-b.vg);if(!pts.length)continue;const repr=pts[0];series.push({key:`${w.direction}::${w.label}`,name:`${R.directionName(w.direction)}·${w.label}`,direction:w.direction,label:w.label,order:Number(repr.peakOrder)||1,color:R.colorForPeakOrder(repr.peakOrder,w.direction),points:pts});}
      const labels=p?[R.peakLabel(p)]:[...new Set(accepted.map(q=>R.peakLabel(q)))];const terSeries=[];for(const label of labels){const reps=accepted.filter(q=>R.peakLabel(q)===label),order=reps.length?Number(reps[0].peakOrder)||1:1,data=S.computeResonantTerForLabel(state.peaks,state.sweeps,label,[...visibleIds]),pair=R.pairedTerColors(order);if(data.length)terSeries.push({name:`共振TER·${label}`,label,order,forwardColor:pair.forward,reverseColor:pair.reverse,points:data});}
      return {series,terSeries,p,sw};
    }
    ctx.ui.groupViews.register('resonance-group',{activity:'resonance',priority:100,panelTitle:'共振组图',title(){const m=trendModel();return m.p?`峰：${R.directionName(m.p.direction)}·${R.peakLabel(m.p)}`:m.sw?`曲线：Vg=${m.sw.vg} V ${R.directionName(m.sw.direction)}`:'全部可见共振数据';}});
    const chartDefs=[['v','峰位 Vpk','V'],['i','峰电流 Ipk','A'],['fwhm','FWHM','V'],['amplitude','峰高 A','A'],['area','峰面积 S','A·V'],['prominence','Prominence','A']];
    for(const [key,title,unit] of chartDefs){
      ctx.ui.groupCharts.register(`resonance-${key}`,{activity:'resonance',order:chartDefs.findIndex(d=>d[0]===key)+10,title,unit,build(){const m=trendModel();const traces=m.series.map(sr=>({x:sr.points.map(d=>d.vg),y:sr.points.map(d=>d[key]??NaN),name:sr.name,mode:'lines+markers',line:{color:sr.color,dash:sr.direction>0?'solid':'dash',width:2},marker:{color:sr.color,size:7},customdata:sr.points,hovertemplate:`Vg=%{x}<br>${title}=%{y}<extra>${sr.name}</extra>`}));const rows=['series,label,direction,Vg,value'];for(const sr of m.series)for(const d of sr.points)rows.push([sr.name,sr.label,sr.direction>0?'forward':'reverse',d.vg,d[key]].map(v=>String(v).includes(',')?`"${String(v).replace(/"/g,'""')}"`:v).join(','));return {title,unit,traces,csvText:rows.join('\n')};},onPointClick({point}){if(point?.customdata)R.focusPeakFromCustomData(point.customdata);}});
    }
    ctx.ui.groupCharts.register('resonance-ter',{activity:'resonance',order:80,title:'共振位 TER（双向候选）',unit:'%',build(){const m=trendModel();const traces=m.terSeries.map(sr=>({x:sr.points.map(d=>d.vg),y:sr.points.map(d=>d.ter),name:sr.name,mode:'lines+markers',line:{color:sr.forwardColor,width:2},marker:{color:sr.forwardColor,size:8,line:{color:sr.reverseColor,width:3}},_forwardColor:sr.forwardColor,_reverseColor:sr.reverseColor,customdata:sr.points,hovertemplate:`Vg=%{x}<br>TER=%{y:.3g}%<br>Vd*=%{customdata.vdAtTer:.5g} V<extra>${sr.name}</extra>`}));const rows=['series,label,Vg,TER_percent,Vd_at_TER_V,I_forward_A,I_reverse_A'];for(const sr of m.terSeries)for(const d of sr.points)rows.push([sr.name,sr.label,d.vg,d.ter,d.vdAtTer,d.forwardI,d.reverseI].join(','));return {title:'共振位 TER（双向候选）',unit:'%',legendMode:'paired',traces,csvText:rows.join('\n')};},onPointClick({point}){if(point?.customdata)R.focusPeakFromCustomData(point.customdata);}});

    ctx.registry.add('analysis.providers','resonance',{id:'resonance',name:'Resonant tunneling / peak-ridge analysis',buildSweeps:S.buildSweeps,metrics:S.peakMetrics,identity:S.solvePeakTracks,physics:S.analyzePhysicalFamilies});
    ctx.registry.add('chart.themes','resonance-default',{id:'resonance-default',label:'Resonance default',semantics:{forward:'cool',reverse:'warm',peakCategory:'categorical'}});

    ctx.events.on('analysis:refresh',({id})=>{
      if(id==='spacingPage')R.renderSpacingPage();
      if(id==='gateAnalysisPage')R.renderGateAnalysis();
    });
    ctx.events.on('sidebar:data-render',renderDataSection);
    ctx.events.on('layout:resize',()=>{
      for(const id of ['gateResonancePlot','gateV0Plot','gateDeltaPlot','gateWidthPlot','gateTerMaxPlot','gateVdStarPlot','gateHysteresisPlot','gateTerCorrelationPlot','gateReadoutCorrelationPlot','gateAmplitudePlot','gateBackgroundPlot','gateDensityPlot','spacingPlot']){
        const el=document.getElementById(id);
        if(el&&el.offsetParent!==null){try{Plotly.Plots.resize(el);}catch{}}
      }
    });
    ctx.events.on('workspace:render',({context})=>{
      if(context?.activityId!=='resonance')return;
      syncSidebarState();
      const panel=document.querySelector('#physicsPanel');
      if(panel&&!panel.classList.contains('hidden'))renderPhysicsPanel();
    });
    ctx.events.on('resonance:detector-changed',()=>renderDetectorUi(true));
    ctx.events.on('plugin:manager-changed',()=>renderDetectorUi(true));
    ctx.events.on('activity:changed',({id})=>{if(id==='resonance')syncSidebarState();});
    syncSidebarState();

    return {deactivate(){detectorParamPanel?.destroy?.();}};
  });
})();
