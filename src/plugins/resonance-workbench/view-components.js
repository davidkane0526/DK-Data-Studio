(() => {
  const Shared=window.DKDSPluginModules.require('builtin.resonance-workbench','workbench-shared');
  if(!Shared)throw new Error('Resonance shared Controller layer is not loaded.');
  const {VIEW_CATALOG}=Shared;

  const byId=id=>VIEW_CATALOG.find(view=>view.id===id)||null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function superGatePageHtml(){return `<div class="analysis-page-header">
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
<span class="analysis-inline-formula dkds-chip">n<sub>g</sub> = C<sub>g</sub>(V<sub>g</sub>−V<sub>CNP</sub>)/e</span>
</div>
<div class="analysis-note gate-analysis-note">
          两条 ridge 应尽量选择同一扫描方向，并由你根据独立证据决定是否可称为 AB/BA。
          页面内部使用 A/B 中性命名。V<sub>0</sub>=(V<sub>B</sub>+V<sub>A</sub>)/2，
          δ=(V<sub>B</sub>−V<sub>A</sub>)/2；用于可分辨度时采用 |δ|。
          峰宽 w 默认使用 HWHM。回滞页显示的是同一峰标签的正/反扫峰位差 ΔV<sub>R</sub>，
          <b>不把它自动当作 coercive voltage V<sub>c</sub></b>。
        </div>
<div class="dkds-summary-row" id="gateAnalysisSummary"></div>
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
<div class="gate-analysis-report dkds-surface" id="gateAnalysisReport"></div>
<h3 class="analysis-section-title">派生数据</h3>
<div class="analysis-table-wrap gate-analysis-table-wrap">
<table class="analysis-table dkds-table" id="gateAnalysisTable"></table>
</div>
</div>`;}

  function superSpacingPageHtml(){return `<div class="analysis-page-header">
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
</div>
<div class="analysis-note">
          下拉框中的“正扫·峰1”和“反扫·峰1”是两个独立序列。仅在两个序列具有相同 Vg 数据点时计算间距。
        </div>
<div class="analysis-large-plot" id="spacingPlot"></div>
<div class="analysis-table-wrap dkds-table-wrap">
<table class="analysis-table dkds-table" id="spacingTable"></table>
</div>
</div>`;}

  function transformOptionsHtml(ctx){const rows=ctx?.data?.transforms?.list?.({supportsScalarField:true})?.filter?.(row=>row?.public!==false&&(!row.tags?.length||row.tags.includes('transport')))||[];const source=rows.length?rows:[{id:'raw',title:'原始 I–V'},{id:'detrend',title:'去背景 I−Ibg'},{id:'didv',title:'dI/dV'},{id:'d2idv2',title:'d²I/dV²'},{id:'dlog',title:'d ln|I|/dV'},{id:'dvdi',title:'dV/dI'},{id:'resistance',title:'R=|V/I|'}];return source.map(row=>`<option value="${esc(row.id)}">${esc(row.title||row.label||row.id)}</option>`).join('');}

  function topPageHtml(ctx=null){
    return `
      <div class="analysis-page-header resonance-window-header">
        <div><h2>共振分析</h2></div>
        <div id="reswinHeaderActions" class="respar-header-actions dkds-toolbar" aria-label="共振分析命令"></div>
      </div>
      <div class="analysis-page-body resonance-dedicated-body">
        <div class="resonance-parity-root">
          <section class="respar-primary dkds-surface" data-reswin-view-panel="main">
            <aside class="respar-left-panel">
              <section>
                <h3>数据列表</h3>
                <div class="respar-scan-global dkds-mode-group" role="group" aria-label="扫描可见性模式">
                  <button id="reswinShowAll">全部扫描</button><button id="reswinShowForward">仅正扫</button>
                  <button id="reswinShowReverse">仅反扫</button><button id="reswinHideAll">全不选</button>
                </div>
                <select id="reswinSweepSelect" class="hidden" aria-hidden="true" tabindex="-1"></select>
                <div id="reswinDatasetList" class="respar-dataset-list dkds-list"></div>
              </section>
              <section>
                <h3>智能寻峰</h3>
                <div id="reswinDetectorDescription" class="respar-note dkds-note">自动融合原始 I–V 与辅助通道；最终峰位始终回到原始采样点。</div>
                <label class="respar-select-label dkds-field">寻峰算法<select id="reswinDetectorSelect"></select></label><button id="reswinRecoverDetector" type="button" class="wide hidden">定位/恢复缺失寻峰算法</button>
                <label class="respar-select-label dkds-field">峰宽/基线算法<select id="reswinMetricAlgorithmSelect"></select></label><button id="reswinRecoverMetricAlgorithm" type="button" class="wide hidden">定位/恢复缺失峰宽算法</button>
                <div id="reswinMetricAlgorithmDescription" class="respar-note dkds-note">FWHM、峰高、面积与局部基线由可版本化算法插件计算。</div>
                <div class="respar-preset-row"><label>预设<select id="reswinPreset"><option value="strict">可靠</option><option value="balanced">平衡</option><option value="sensitive">灵敏</option></select></label></div>
                <details class="respar-advanced"><summary>高级设置（一般不用改）</summary><div id="reswinDetectorParams"></div></details>
                <div class="respar-detect-actions"><button id="reswinDetectSelected" class="primary">当前扫描寻峰</button><button id="reswinDetectAll">全部可见寻峰</button></div>
                <button id="reswinSortPeaks" class="wide">跨 Vg 智能整理峰序</button>
                <div id="reswinPeakLegend" class="respar-peak-legend dkds-toolbar dkds-surface-muted" data-dkds-legend></div>
              </section>
              <section>
                <h3>显示</h3>
                <label><input id="reswinShowRejected" type="checkbox"> 显示不采纳峰</label>
                <label><input id="reswinShowWidth" type="checkbox"> 显示选中峰宽</label>
                <label><input id="reswinShowPoints" type="checkbox"> 显示峰位点</label>
                <label><input id="reswinPhysicsLabels" type="checkbox"> 主图标注物理类型</label>
                <label class="respar-select-label dkds-field">辅助视图<select id="reswinTransform">${transformOptionsHtml(ctx)}</select></label>
              </section>
              <section>
                <h3>手动操作</h3>
                <div class="respar-hint">Ctrl / Shift + 左键点击曲线：新增峰<br>Ctrl / Shift + 右键点击峰点：删除峰<br>直接拖框：选择峰并打开区域操作<br>Ctrl + 拖框：框选缩放<br>拖峰点：吸附到当前曲线真实采样点<br>拖分析窗口手柄：调整局部基线 / FWHM 自动计算范围<br>L / Shift+L：锁定 / 解锁所选峰<br>滚轮：围绕鼠标缩放<br>双击主图：恢复全部范围<br>↑/↓：切换曲线；←/→：移动峰</div>
              </section>
            </aside>
            <main class="respar-main-area">
              <div class="respar-main-workspace">
                <div class="respar-plot-wrap" id="resparMainPlotWrap" data-dkds-plot-scope>
                  <div class="respar-main-plot-header">
                    <div class="respar-main-tools dkds-toolbar dkds-floating-surface">
                      <button type="button" data-respar-lock="1">锁定所选</button>
                      <button type="button" data-respar-lock="0">解锁所选</button>
                      <button type="button" id="resparSortPeakOrder">智能峰序</button>
                      <button type="button" id="resparTogglePhysics">物理标记</button>
                      <button type="button" id="resparResetView">重新居中</button>
                    </div>
                    <div id="resparMainLegend" class="respar-main-legend dkds-scroll-x-compact dkds-toolbar dkds-surface" data-dkds-legend></div>
                  </div>
                  <svg id="reswinMainPlot" class="respar-main-svg"></svg>
                  <div id="resparRangeMenu" class="respar-range-menu command-menu hidden" data-dkds-menu-behavior="rich">
                    <div id="resparRangeSummary" class="respar-range-summary">已框选区域</div>
                    <div class="respar-range-grid"><button id="resparRangeDetect" class="dkds-action-button primary">局部寻峰</button><button id="resparRangeDelete" class="dkds-action-button danger-soft">删除框选峰</button><button id="resparRangeLock" class="dkds-action-button">锁定框选峰</button><button id="resparRangeUnlock" class="dkds-action-button">解锁框选峰</button></div>
                    <div class="respar-range-identity"><div>统一峰序 / 峰标签</div><select id="resparRangeOrder"></select><input id="resparRangeLabel" type="text" placeholder="类别标签，例如 峰3 / AB"><button id="resparRangeApplyIdentity" class="dkds-action-button">应用到框选峰</button></div>
                    <div class="respar-range-footer"><span>峰位始终落在原始 I–V 采样点</span><button id="resparRangeClose" class="dkds-action-button">关闭</button></div>
                  </div>
                  <div id="resparHoverTip" class="respar-hover-tip dkds-tooltip hidden"></div>
                </div>
              </div>
              <div class="respar-status-row"><div id="reswinSummary" class="respar-summary" data-dkds-mobile-summary></div></div>
            </main>
          </section>

          <div id="resparInspectorPanel" class="respar-floating-panel respar-inspector-panel dkds-floating-surface hidden">
            <div class="respar-floating-header dkds-surface-header"><span>曲线检查器</span><div class="dkds-integrated-action-group"><button data-respar-close="inspect" class="respar-panel-close" title="关闭">×</button></div></div>
            <div class="respar-floating-body"><div id="reswinInspectorBody" class="respar-inspector-body"></div></div>
          </div>

          <div id="resparGroupPanel" class="respar-floating-panel respar-group-panel dkds-floating-surface hidden">
            <div class="respar-floating-header dkds-surface-header"><span>组图面板 <small id="reswinGroupContext" class="respar-group-context"></small></span><div class="dkds-integrated-action-group"><span data-respar-group-cols-menu-host></span><button data-respar-collapse="group" title="缩小">−</button><button data-respar-close="group" class="respar-panel-close" title="关闭">×</button></div></div>
            <div class="respar-floating-body">
              <div id="reswinGroupGrid" class="reswin-group-grid"></div>
            </div>
          </div>

          <section class="respar-derived hidden" data-reswin-view-panel="physics">
            <div class="respar-derived-header dkds-surface-header"><h3>物理机制分析</h3><button data-reswin-view="main">返回主图</button></div>
            <div id="reswinPhysicsSummary" class="reswin-physics-summary"></div><div class="reswin-two-col" data-dkds-mobile-stack><div class="analysis-chart-card"><div class="analysis-chart-title">稳定 ridge：V0 与有效分裂 δ</div><div id="reswinPhysicsPlot" class="analysis-chart reswin-medium-plot"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">物理机制判据</div><div id="reswinPhysicsModel" class="reswin-report"></div></div></div><div class="analysis-table-wrap dkds-table-wrap"><table id="reswinPhysicsTable" class="analysis-table dkds-table"></table></div>
          </section>
          <section class="respar-derived hidden" data-reswin-view-panel="spacing">
            <div class="respar-derived-header dkds-surface-header"><h3>两峰间距分析</h3><button data-reswin-view="main">返回主图</button></div><div class="analysis-control-card reswin-spacing-controls"><label>峰序列 A<select id="reswinSpacingA"></select></label><label>峰序列 B<select id="reswinSpacingB"></select></label><label>显示<select id="reswinSpacingMode"><option value="abs">|VB − VA|</option><option value="signed">VB − VA</option></select></label><button id="reswinSpacingExport">分析数据 CSV</button></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰间距随 Vg 变化</div><div id="reswinSpacingPlot" class="analysis-chart reswin-medium-plot"></div></div><div class="analysis-table-wrap dkds-table-wrap"><table id="reswinSpacingTable" class="analysis-table dkds-table"></table></div>
          </section>
          <section class="respar-derived hidden" data-reswin-view-panel="gate">
            <div class="respar-derived-header dkds-surface-header"><h3>栅压物理分析</h3><button data-reswin-view="main">返回主图</button></div>
            <div class="analysis-control-card reswin-gate-controls dkds-inline-form-row"><label>ridge A<select id="reswinGateA"></select></label><label>ridge B<select id="reswinGateB"></select></label><label>回滞峰<select id="reswinGateHysteresis"></select></label><label>峰宽<select id="reswinGateWidth"><option value="hwhm">HWHM</option><option value="fwhm">FWHM</option></select></label><label>特征场<select id="reswinGateFeatureMetric"><option value="v">峰位 V_R</option><option value="fwhm">FWHM</option><option value="amplitude">峰高</option><option value="prominence">Prominence</option><option value="area">峰面积</option><option value="baseline">局域基线</option><option value="peakToBg">峰/背景比</option></select></label><label>特征场扫描<select id="reswinGateFeatureDirection"><option value="all">正扫 + 反扫</option><option value="forward">仅正扫</option><option value="reverse">仅反扫</option></select></label><label class="inline-check"><input id="reswinGateUseDensity" type="checkbox">换算 n<sub>g</sub></label><label>Cg (F/m²)<input id="reswinGateCg" type="number" step="any"></label><label>V<sub>CNP</sub> (V)<input id="reswinGateCnp" type="number" step="any"></label><button id="reswinGateRun" class="primary">刷新分析</button><button id="reswinGateExportCsv">数据 CSV</button><button id="reswinGateFeatureExport">特征场 CSV</button><button id="reswinGateExportReport">报告</button></div>
            <div id="reswinGateSummary" class="dkds-summary-row reswin-summary"></div><div class="reswin-gate-grid" data-dkds-mobile-stack><div class="analysis-chart-card"><div class="analysis-chart-title">共振 ridge</div><div id="reswinGateRidges" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">共振中心 V0</div><div id="reswinGateV0" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">有效分裂 δ</div><div id="reswinGateDelta" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰宽与 |δ|/w</div><div id="reswinGateWidthPlot" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">TERmax</div><div id="reswinGateTer" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">最佳读出偏压 Vd*</div><div id="reswinGateVStar" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">正反扫回滞</div><div id="reswinGateHysteresisPlot" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰高与有效权重</div><div id="reswinGateAmplitude" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">TERmax vs |δ|/w</div><div id="reswinGateTerCorrelation" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">Vd* vs V0</div><div id="reswinGateReadoutCorrelation" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">局域背景与峰/背景比</div><div id="reswinGateBackground" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">载流子浓度依赖（可选）</div><div id="reswinGateDensity" class="analysis-chart"></div></div><div class="analysis-chart-card reswin-feature-field-card"><div class="analysis-chart-title"><span id="reswinGateFeatureFieldTitle">跨曲线特征场</span></div><div id="reswinGateFeatureFieldMeta" class="respar-note dkds-note"></div><div id="reswinGateFeatureField" class="analysis-chart reswin-feature-field-plot"></div></div></div><div id="reswinGateReport" class="reswin-report"></div><div class="analysis-table-wrap dkds-table-wrap"><table id="reswinGateTable" class="analysis-table dkds-table"></table></div>
          </section>
        </div>
      </div>`;
  }



  function mountUnified(ctx,controller,{mode='top',adapter={}}={}){
    const R=controller.service;
    const isTop=mode==='top'||ctx.runtime.isAuxiliaryWindow;
    ctx.ui.activities.add({id:'resonance',label:'共振分析',contextLabel:'共振分析',icon:'∿',order:10,default:true,primary:true,openMode:'window',description:'共振曲线、峰位与物理分析',onActivate:()=>{ctx.workspace.openPage('resonanceDedicatedPage');controller.render();}});
    const page=ctx.ui.pages.add({id:'resonance-dedicated',pageId:'resonanceDedicatedPage',activity:'resonance',toolbar:false,label:'共振分析',order:10,html:topPageHtml(ctx),onOpen:()=>controller.render()});
    R.bindUi?.(page);R.setUiRuntime?.(ctx.ui);R.setCommandRuntime?.(ctx.commands);R.setEntityRuntime?.(ctx.data.entities);R.setPipelineRuntime?.(ctx.data.pipeline);R.setAlgorithmRuntime?.(ctx.analysis.algorithms);R.setDataSourceRuntime?.(ctx.data.sources);R.setDetectorRuntime?.({list:()=>{const rows=ctx.analysis.algorithms?.list?.({category:'peak-detector'})||[];return rows.map(row=>{const ref=`${row.id}@${row.version}`;return {...row,id:ref,algorithmId:row.id,name:row.title,shortName:row.metadata?.shortName||row.title,presets:row.metadata?.presets||[],detect:(sweep,settings,options={})=>ctx.analysis.algorithms.run({id:row.id,version:row.version,category:'peak-detector'},sweep,{...options,parameters:settings||{}})};});}});
    let detectorParamPanel=null;
    const recoverLockedAlgorithm=async(category,ref,button,rerender)=>{if(!ref||typeof ctx.analysis.algorithms?.recover!=='function')return;button.disabled=true;try{const catalog=await ctx.analysis.algorithms.locate?.({category,id:String(ref).split('@')[0],version:String(ref).includes('@')?String(ref).slice(String(ref).lastIndexOf('@')+1):''});const compatible=(catalog?.candidates||[]).filter(row=>row.compatible&&row.recoverable);if(!compatible.length){ctx.status.set((catalog?.candidates||[]).length?`已定位到包含 ${ref} 的算法包，但当前环境不兼容。`:`未在当前包或插件历史中找到 ${ref}。`);return;}const restored=await ctx.analysis.algorithms.recover({category,id:String(ref).split('@')[0],version:String(ref).slice(String(ref).lastIndexOf('@')+1)},compatible[0]);ctx.status.set(`已恢复算法 ${restored.id}@${restored.version}。`);rerender?.();}catch(err){ctx.status.set(`恢复算法失败：${err.message}`);}finally{button.disabled=false;}};
    const renderDetectorPicker=()=>{const select=page.querySelector('#reswinDetectorSelect'),note=page.querySelector('#reswinDetectorDescription'),paramHost=page.querySelector('#reswinDetectorParams'),recover=page.querySelector('#reswinRecoverDetector');if(!select)return;const rows=(ctx.analysis.algorithms?.list?.({category:'peak-detector'})||[]).map(row=>({...row,id:`${row.id}@${row.version}`,algorithmId:row.id,shortName:row.metadata?.shortName||row.title,name:row.title,presets:row.metadata?.presets||[]})),state=R.getState?.(),saved=String(state?.workspace?.activeDetector||''),diagnostic=saved.includes('@')?ctx.analysis.algorithms?.diagnose?.(saved,{category:'peak-detector'}):null,missing=diagnostic?.status==='missing-version'||diagnostic?.status==='missing-algorithm',current=missing?saved:String(rows.find(row=>row.id===saved||row.algorithmId===saved)?.id||rows.find(row=>row.default)?.id||rows[0]?.id||'');select.innerHTML=(missing?`<option value="${esc(saved)}">缺失版本 · ${esc(saved)}</option>`:'')+rows.map(row=>`<option value="${String(row.id).replace(/"/g,'&quot;')}">${String(row.shortName||row.name||row.id)} · v${String(row.version||'')}</option>`).join('');if(current)select.value=current;if(recover){recover.classList.toggle('hidden',!missing);recover.onclick=()=>recoverLockedAlgorithm('peak-detector',saved,recover,renderDetectorPicker);}const renderActive=()=>{const row=rows.find(item=>String(item.id)===select.value);if(note)note.textContent=missing&&!row?`工程锁定的寻峰算法缺失：${saved}`:(row?`${row.description||'寻峰算法'} · ${row.algorithmId}@${row.version}`:'选择当前使用的寻峰算法。');detectorParamPanel?.dispose?.();detectorParamPanel=null;if(paramHost)paramHost.replaceChildren();if(row?.parameterSchema&&paramHost&&ctx.parameters?.render){const ws=R.getState?.()?.workspace||{},value=ws.detectorSettings?.[row.id]||ws.detectorSettings?.[row.algorithmId]||ws.algorithms||{};detectorParamPanel=ctx.parameters.render(paramHost,row.parameterSchema,{value,onChange:next=>R.setDetectorSettings?.(row.id,next)});}};select.onchange=()=>{if(missing&&select.value===saved)return;R.setActiveDetector?.(select.value);renderActive();};renderActive();};
    renderDetectorPicker();
    const renderMetricAlgorithmPicker=()=>{const select=page.querySelector('#reswinMetricAlgorithmSelect'),note=page.querySelector('#reswinMetricAlgorithmDescription'),recover=page.querySelector('#reswinRecoverMetricAlgorithm');if(!select)return;const rows=ctx.analysis.algorithms?.list?.({category:'peak-metrics'})||[],state=R.getState?.(),saved=String(state?.workspace?.activeMetricAlgorithm||''),diagnostic=saved.includes('@')?ctx.analysis.algorithms?.diagnose?.(saved,{category:'peak-metrics'}):null,missing=diagnostic?.status==='missing-version'||diagnostic?.status==='missing-algorithm',matched=rows.find(row=>`${row.id}@${row.version}`===saved||row.id===saved),current=missing?saved:String(matched?`${matched.id}@${matched.version}`:(rows.find(row=>row.default)?`${rows.find(row=>row.default).id}@${rows.find(row=>row.default).version}`:(rows[0]?`${rows[0].id}@${rows[0].version}`:'')));select.innerHTML=(missing?`<option value="${esc(saved)}">缺失版本 · ${esc(saved)}</option>`:'')+rows.map(row=>`<option value="${esc(`${row.id}@${row.version}`)}">${esc(row.metadata?.shortName||row.title||row.id)} · v${esc(row.version)}</option>`).join('');if(current)select.value=current;if(recover){recover.classList.toggle('hidden',!missing);recover.onclick=()=>recoverLockedAlgorithm('peak-metrics',saved,recover,renderMetricAlgorithmPicker);}const active=rows.find(row=>`${row.id}@${row.version}`===select.value);if(note)note.textContent=missing&&!active?`工程锁定的峰宽算法缺失：${saved}`:(active?`${active.description||'峰度量算法'} · ${active.id}@${active.version}`:'未发现峰度量算法插件。');select.onchange=()=>{if(missing&&select.value===saved)return;R.setActiveMetricAlgorithm?.(select.value);const row=rows.find(item=>`${item.id}@${item.version}`===select.value);if(note)note.textContent=row?`${row.description||'峰度量算法'} · ${row.id}@${row.version}`:'';};};
    renderMetricAlgorithmPicker();ctx.events.on('plugin:manager-changed',()=>{renderDetectorPicker();renderMetricAlgorithmPicker();});ctx.capabilities?.watch?.(event=>{if(event?.kind==='analysis.algorithm'||event?.reason==='remote-import'){renderDetectorPicker();renderMetricAlgorithmPicker();}});

    const resonanceCommands=[
      ['builtin.resonance.undo',()=>R.undoLastAction?.()],
      ['builtin.resonance.redo',()=>R.redoLastAction?.()],
      ['builtin.resonance.sweep-up',()=>R.switchSelectedSweep?.(-1)],['builtin.resonance.sweep-down',()=>R.switchSelectedSweep?.(1)],
      ['builtin.resonance.peak-left',()=>R.moveSelectedPeakBy?.(-1)],['builtin.resonance.peak-right',()=>R.moveSelectedPeakBy?.(1)],
      ['builtin.resonance.peak-left-fast',()=>R.moveSelectedPeakBy?.(-5)],['builtin.resonance.peak-right-fast',()=>R.moveSelectedPeakBy?.(5)],
      ['builtin.resonance.select-prev',()=>R.selectAdjacentPeak?.(-1)],['builtin.resonance.select-next',()=>R.selectAdjacentPeak?.(1)],
      ['builtin.resonance.lock',()=>R.lockSelectedPeaks?.(true)],['builtin.resonance.unlock',()=>R.lockSelectedPeaks?.(false)],
      ['builtin.resonance.delete',()=>R.deleteSelectedPeaks?.()],['builtin.resonance.deselect',()=>R.clearSelection?.()],['builtin.resonance.physics-labels',()=>R.togglePhysicsLabels?.()],
      ['builtin.resonance.add-point',payload=>{const sw=payload?.curve?.source;if(!sw)return false;R.selectSweep?.(sw.id,{source:'resonance-interaction-add'});R.addManualPeak?.(Number(payload.x));R.openInspector?.();return true;}],
      ['builtin.resonance.delete-target-peak',payload=>{const p=payload?.marker?.source;if(!p)return false;if(p.locked){ctx.status.set('该峰位已锁定。');return false;}R.selectPeak?.(p.id,{source:'resonance-context-delete'});return R.deleteSelectedPeaks?.();}],
      ['builtin.resonance.toggle-target-lock',payload=>{const p=payload?.marker?.source;if(!p)return false;R.selectPeak?.(p.id,{source:'resonance-context-lock'});return R.lockSelectedPeaks?.(!p.locked); }]
    ];
    for(const [id,handler] of resonanceCommands)ctx.commands.register(id,handler);
    ctx.ui.interactionBehaviors.create('resonance-keyboard',{activity:'resonance',bindings:[
      ['ArrowUp','builtin.resonance.sweep-up'],['ArrowDown','builtin.resonance.sweep-down'],
      ['ArrowLeft','builtin.resonance.peak-left'],['ArrowRight','builtin.resonance.peak-right'],['Shift+ArrowLeft','builtin.resonance.peak-left-fast'],['Shift+ArrowRight','builtin.resonance.peak-right-fast'],
      ['Ctrl+ArrowLeft','builtin.resonance.select-prev'],['Ctrl+ArrowRight','builtin.resonance.select-next'],['Escape','builtin.resonance.deselect'],['L','builtin.resonance.lock'],['Shift+L','builtin.resonance.unlock'],['Delete','builtin.resonance.delete'],['P','builtin.resonance.physics-labels']
    ].map(([chord,command],index)=>({id:`resonance-key-${index}`,gesture:'key',target:'keyboard',chord,command,priority:250}))});

    const body=page.querySelector('.resonance-dedicated-body'),parity=page.querySelector('.resonance-parity-root');
    if(!body||!parity)throw new Error('Resonance parity DOM is incomplete.');
    parity.remove();body.replaceChildren();body.classList.add('dkds-unified-workbench-body');const host=ctx.ui.dom.create('div');host.className='dkds-plugin-workbench-root resonance-parity-host';body.appendChild(host);
    const workspaceFactory=ctx.ui.workspaceSurface;
    if(!workspaceFactory?.create)throw new Error('PluginWorkspace Core capability is unavailable.');
    const settingsSurface=ctx.ui.settings?.get?.('defaults')||null;
    const pluginDefaults=settingsSurface?.get?.()||{};
    const allowedPlacements=new Set(['float','global','left','right','bottom']);
    const inspectDefault=allowedPlacements.has(String(pluginDefaults.inspectPlacement||''))?String(pluginDefaults.inspectPlacement):'right';
    const groupDefault=allowedPlacements.has(String(pluginDefaults.groupPlacement||''))?String(pluginDefaults.groupPlacement):'bottom';
    const wb=workspaceFactory.create(host,{header:false,activity:'resonance',hostMode:isTop?'top':'super',primaryScroll:'contained',leftWidth:280,leftMin:230,canvasLeftWidth:360,canvasRightWidth:390,canvasBottomHeight:360});
    const primaryShell=parity.querySelector('.respar-primary'),leftPanel=primaryShell?.querySelector('.respar-left-panel'),mainArea=primaryShell?.querySelector('.respar-main-area');
    const inspector=parity.querySelector('#resparInspectorPanel'),group=parity.querySelector('#resparGroupPanel');
    const subNodes={physics:parity.querySelector('[data-reswin-view-panel="physics"]'),spacing:parity.querySelector('[data-reswin-view-panel="spacing"]'),gate:parity.querySelector('[data-reswin-view-panel="gate"]')};
    if(!leftPanel||!mainArea)throw new Error('Resonance GRS primary layout is incomplete.');
    leftPanel.remove();mainArea.remove();
    wb.compose({
      primary:{id:'main',label:'共振分析',scroll:'contained',leftNode:leftPanel,mainNode:mainArea},
      primes:[
        {id:'curve-inspector',label:'检查',existingNode:inspector,defaultPlacement:inspectDefault,placements:['float','global','left','right','bottom'],stateVersion:'workspace-v2',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="inspect"]',mount:({container})=>{container.classList.remove('hidden');R.renderInspection?.();},onPlacementChanged:()=>controller.resize?.()},
        {id:'group-analysis',label:'组图',existingNode:group,defaultPlacement:groupDefault,placements:['float','global','left','right','bottom'],stateVersion:'workspace-v2',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="group"]',collapseSelector:'[data-respar-collapse="group"]',actionHost:'[data-respar-group-cols-menu-host]',actions:[{
          id:'group-columns',menu:true,order:10,
          label:()=>{const value=String(R.getGroupColumns?.()||'auto');return `每行：${value==='auto'?'自动':value}`;},
          title:'设置每行子图数量',
          items:()=>{const current=String(R.getGroupColumns?.()||'auto');return ['auto','1','2','3','4','5','6'].map(value=>({id:`group-cols-${value}`,icon:current===value?'✓':'',label:value==='auto'?'自动排列':`每行 ${value} 个子图`,onInvoke:()=>{R.setGroupColumns?.(value);const row=wb.primes?.get?.('group-analysis');row?.actionGroup?.render?.();}}));}
        }],mount:({container})=>{container.classList.remove('hidden');R.renderGroup?.();},onClose:()=>R.closeGroupViews?.(),onPlacementChanged:()=>controller.resize?.()}
      ],
      subs:[
        {id:'physics',label:'物理机制',existingNode:subNodes.physics,onShow:({container})=>{container.classList.remove('hidden');R.renderPhysics?.();}},
        {id:'spacing',label:'峰间距',existingNode:subNodes.spacing,onShow:({container})=>{container.classList.remove('hidden');R.renderSpacing?.();}},
        {id:'gate-analysis',label:'栅压分析',existingNode:subNodes.gate,onShow:({container})=>{container.classList.remove('hidden');R.renderGate?.();}}
      ]
    });
    const showMain=()=>wb.showPrimary();
    const navigate=view=>{
      if(view==='main'){showMain();R.renderMain?.();return;}
      if(view==='inspect'){showMain();const row=wb.primes?.get?.('curve-inspector');if(!row?.mounted)wb.openPrime('curve-inspector');R.renderInspection?.();return;}
      if(view==='group'){showMain();const row=wb.primes?.get?.('group-analysis');if(!row?.mounted)wb.openPrime('group-analysis');R.renderGroup?.();return;}
      if(view==='physics'){wb.openSub('physics');return;}
      if(view==='spacing'){wb.openSub('spacing');return;}
      if(view==='gate'){wb.openSub('gate-analysis');return;}
    };
    R.setWorkspaceNavigator?.(navigate);
    R.setWorkspaceRuntime?.({portable:(id,node,spec)=>wb.portable(id,node,spec),workbench:wb});
    // PlotView chrome is now hydrated by PluginWorkspace whenever a PRIMARY,
    // PRIME or SUB surface becomes connected. Detached SUB pages no longer
    // need plugin-side one-shot DOM scans.
    wb.setNavigationPresentation?.('host');
    ctx.ui.edit?.register?.({id:'resonance',order:10,canUndo:()=>R.historyState?.().canUndo===true,canRedo:()=>R.historyState?.().canRedo===true,historyState:()=>R.historyState?.()||null,undo:()=>ctx.commands.run('builtin.resonance.undo'),redo:()=>ctx.commands.run('builtin.resonance.redo'),deselect:()=>ctx.commands.run('builtin.resonance.deselect')});
    const primeIdFor=kind=>kind==='inspect'?'curve-inspector':'group-analysis';
    const togglePanel=(kind,force)=>{const id=primeIdFor(kind),row=wb.primes?.get?.(id);if(force===false){wb.closePrime(id);return;}if(force===true||!row?.mounted){wb.openPrime(id);kind==='inspect'?R.renderInspection?.():R.renderGroup?.();}else wb.closePrime(id);};
    page.querySelectorAll('[data-respar-panel]').forEach(btn=>btn.onclick=()=>togglePanel(btn.dataset.resparPanel));
    page.querySelector('[data-respar-lock="1"]')?.addEventListener('click',()=>R.lockSelectedPeaks?.(true));page.querySelector('[data-respar-lock="0"]')?.addEventListener('click',()=>R.lockSelectedPeaks?.(false));page.querySelector('#resparSortPeakOrder')?.addEventListener('click',()=>R.sortPeakOrderByVd?.());page.querySelector('#resparTogglePhysics')?.addEventListener('click',()=>R.togglePhysicsLabels?.());page.querySelector('#resparResetView')?.addEventListener('click',()=>R.resetMainView?.());
    page.querySelector('#resparRangeDetect')?.addEventListener('click',()=>R.detectSelectedRange?.());page.querySelector('#resparRangeDelete')?.addEventListener('click',()=>R.deleteSelectedRangePeaks?.());page.querySelector('#resparRangeLock')?.addEventListener('click',()=>R.setSelectedRangeLocked?.(true));page.querySelector('#resparRangeUnlock')?.addEventListener('click',()=>R.setSelectedRangeLocked?.(false));page.querySelector('#resparRangeApplyIdentity')?.addEventListener('click',()=>R.applySelectedRangeIdentity?.(page.querySelector('#resparRangeOrder')?.value,page.querySelector('#resparRangeLabel')?.value));page.querySelector('#resparRangeClose')?.addEventListener('click',()=>R.clearSelectedRange?.());
    const exportItems=()=>[
      {id:'main-svg',label:'共振 I–V 主图 · SVG',onInvoke:()=>R.exportMainSvg?.()},
      {id:'main-png',label:'共振 I–V 主图 · PNG',onInvoke:()=>R.exportMainPng?.()},
      {id:'main-csv',label:'共振 I–V 主图数据 · CSV',onInvoke:()=>R.exportMainCsv?.()},
      {id:'main-copy',label:'复制共振 I–V 主图数据',onInvoke:()=>R.copyMainCsv?.()},
      {type:'separator'},
      {id:'peaks-csv',label:'峰参数 CSV',onInvoke:()=>R.exportPeaks?.()},
      {id:'peaks-copy',label:'复制峰参数',onInvoke:()=>R.copyPeaks?.()}
    ];
    const localActions=[
      {id:'inspect',label:'检查',onInvoke:()=>togglePanel('inspect')},{id:'group',label:'组图',onInvoke:()=>togglePanel('group')},
      {type:'separator'},{id:'physics',label:'物理机制',onInvoke:()=>navigate('physics')},{id:'spacing',label:'峰间距',onInvoke:()=>navigate('spacing')},{id:'gate',label:'栅压分析',onInvoke:()=>navigate('gate')},
      {type:'separator'},{id:'export',label:'导出',menu:true,items:exportItems},{id:'settings',label:'设置',onInvoke:()=>settingsSurface?.open?.()},
      ...(isTop?[{id:'close',label:'关闭窗口',onInvoke:()=>ctx.workspace.closeCurrentWindow?.()}]:[])
    ];
    const pageHeader=page.querySelector('.resonance-window-header'),headerActions=page.querySelector('#reswinHeaderActions');
    if(isTop){pageHeader?.classList.remove('hidden');if(headerActions)ctx.ui.actions?.mount?.(headerActions,{activity:'resonance',actions:localActions});}
    else{
      pageHeader?.classList.add('hidden');
      const toolbarActions=[
        ['res-inspect','检查','PRIME',40,()=>togglePanel('inspect')],['res-group','组图','PRIME',50,()=>togglePanel('group')],
        ['res-physics','物理机制','SUB',70,()=>navigate('physics')],['res-spacing','峰间距','SUB',80,()=>navigate('spacing')],['res-gate','栅压分析','SUB',90,()=>navigate('gate')],
        ['res-settings','设置','SUB',110,()=>settingsSurface?.open?.()]
      ];
      for(const [id,label,section,order,onClick] of toolbarActions)ctx.ui.toolbar.add({id,label,activity:'resonance',section,order,priority:section==='PRIME'?20:10,onClick});
      const menuRows=[['res-export-main-svg','共振 I–V 主图 · SVG',10,()=>R.exportMainSvg?.()],['res-export-main-png','共振 I–V 主图 · PNG',20,()=>R.exportMainPng?.()],['res-export-main-csv','共振 I–V 主图数据 · CSV',30,()=>R.exportMainCsv?.()],['res-export-main-copy','复制共振 I–V 主图数据',40,()=>R.copyMainCsv?.()],['res-export-peaks','峰参数 CSV',60,()=>R.exportPeaks?.()],['res-export-peaks-copy','复制峰参数',70,()=>R.copyPeaks?.()]];
      for(const [id,label,order,onClick] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'resonance',order,onClick});
    }
    ctx.ui.topWorkspace.register({id:'resonance',activity:'resonance',label:'共振分析',icon:'∿',layout:{mode:'native',root:{selector:'#resonanceDedicatedPage .dkds-plugin-workbench-root'},primary:{id:'main'},prime:[{id:'curve-inspector'},{id:'group-analysis'}],sub:[{id:'physics'},{id:'spacing'},{id:'gate-analysis'}]}});
    ctx.project.registerSlice('workspace',{serialize:()=>controller.serialize(),restore:data=>controller.restore(data),reset:()=>controller.reset()});ctx.events.on('analysis:refresh',({id})=>{if(id==='resonanceDedicatedPage')controller.render();});ctx.events.on('data:artifacts-changed',()=>R.refreshData?.());ctx.events.on('layout:resize',()=>controller.resize());controller.render();adapter?.resize?.();return {controller,workbench:wb,mode};
  }

  function mountTop(ctx,controller){return mountUnified(ctx,controller,{mode:'top'});}

  function create(controller){
    if(!controller)throw new Error('Resonance View components require a shared controller.');
    const components=Object.fromEntries(VIEW_CATALOG.map(view=>[view.id,Object.freeze({...view})]));
    components.inspect=Object.freeze({...components.inspect,superPanelTitle:'共振检查器'});
    components.group=Object.freeze({...components.group,superPanelTitle:'共振组图'});
    components.physics=Object.freeze({...components.physics,superPanelTitle:'物理机制'});
    components.spacing=Object.freeze({...components.spacing,superPageHtml:superSpacingPageHtml});
    components.gate=Object.freeze({...components.gate,superPageHtml:superGatePageHtml});
    return Object.freeze({controller,catalog:VIEW_CATALOG,byId:id=>components[id]||null,...components,topPageHtml});
  }

  window.DKDSPluginModules.define('builtin.resonance-workbench','view-components',Object.freeze({
    VIEW_CATALOG,byId,create,topPageHtml,mountUnified,mountTop,superGatePageHtml,superSpacingPageHtml
  }));
})();
