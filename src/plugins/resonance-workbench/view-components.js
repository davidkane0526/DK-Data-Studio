(() => {
  const Shared=window.DKDSResonanceWorkbenchShared;
  if(!Shared)throw new Error('Resonance shared Controller layer is not loaded.');
  const {VIEW_CATALOG}=Shared;

  const byId=id=>VIEW_CATALOG.find(view=>view.id===id)||null;

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
</div>`;}

  function topPageHtml(){
    return `
      <div class="analysis-page-header resonance-window-header">
        <div><h2>共振分析</h2></div>
        <div id="reswinHeaderActions" class="respar-header-actions" aria-label="共振分析命令"></div>
      </div>
      <div class="analysis-page-body resonance-dedicated-body">
        <div class="resonance-parity-root">
          <section class="respar-primary" data-reswin-view-panel="main">
            <aside class="respar-left-panel">
              <section>
                <h3>数据列表</h3>
                <div class="respar-scan-global">
                  <button id="reswinShowAll">全部扫描</button><button id="reswinShowForward">仅正扫</button>
                  <button id="reswinShowReverse">仅反扫</button><button id="reswinHideAll">全不选</button>
                </div>
                <select id="reswinSweepSelect" class="hidden" aria-hidden="true" tabindex="-1"></select>
                <div id="reswinDatasetList" class="respar-dataset-list"></div>
              </section>
              <section>
                <h3>智能寻峰</h3>
                <div id="reswinDetectorDescription" class="respar-note">自动融合原始 I–V 与辅助通道；最终峰位始终回到原始采样点。</div>
                <label class="respar-select-label">寻峰算法<select id="reswinDetectorSelect"></select></label>
                <div class="respar-preset-row"><label>预设<select id="reswinPreset"><option value="strict">可靠</option><option value="balanced">平衡</option><option value="sensitive">灵敏</option></select></label></div>
                <details class="respar-advanced"><summary>高级设置（一般不用改）</summary><div id="reswinDetectorParams"></div></details>
                <div class="respar-detect-actions"><button id="reswinDetectSelected" class="primary">当前扫描寻峰</button><button id="reswinDetectAll">全部可见寻峰</button></div>
                <button id="reswinSortPeaks" class="wide">跨 Vg 智能整理峰序</button>
                <div id="reswinPeakLegend" class="respar-peak-legend"></div>
              </section>
              <section>
                <h3>显示</h3>
                <label><input id="reswinShowRejected" type="checkbox"> 显示不采纳峰</label>
                <label><input id="reswinShowWidth" type="checkbox"> 显示选中峰宽</label>
                <label><input id="reswinShowPoints" type="checkbox"> 显示峰位点</label>
                <label><input id="reswinPhysicsLabels" type="checkbox"> 主图标注物理类型</label>
                <label class="respar-select-label">辅助视图<select id="reswinTransform"><option value="raw">原始 I–V</option><option value="detrend">去背景 I−Ibg</option><option value="didv">dI/dV</option><option value="d2idv2">d²I/dV²</option><option value="dlog">d ln|I|/dV</option><option value="dvdi">dV/dI</option><option value="resistance">R=|V/I|</option></select></label>
              </section>
              <section>
                <h3>手动操作</h3>
                <div class="respar-hint">Ctrl / Shift + 左键点击曲线：新增峰<br>Ctrl / Shift + 右键点击峰点：删除峰<br>直接拖框：选择峰并打开区域操作<br>Ctrl + 拖框：框选缩放<br>拖峰点：吸附到当前曲线真实采样点<br>拖宽度手柄：修改 FWHM<br>L / Shift+L：锁定 / 解锁所选峰<br>滚轮：围绕鼠标缩放<br>双击主图：恢复全部范围<br>↑/↓：切换曲线；←/→：移动峰</div>
              </section>
            </aside>
            <main class="respar-main-area">
              <div class="respar-main-workspace">
                <div class="respar-plot-wrap" id="resparMainPlotWrap">
                  <div class="respar-main-plot-header">
                    <div class="respar-main-tools">
                      <button type="button" data-respar-lock="1">锁定所选</button>
                      <button type="button" data-respar-lock="0">解锁所选</button>
                      <button type="button" id="resparSortPeakOrder">智能峰序</button>
                      <button type="button" id="resparTogglePhysics">物理标记</button>
                      <button type="button" id="resparResetView">重新居中</button>
                    </div>
                    <div id="resparMainLegend" class="respar-main-legend"></div>
                  </div>
                  <svg id="reswinMainPlot" class="respar-main-svg"></svg>
                  <div id="resparRangeMenu" class="respar-range-menu hidden">
                    <div id="resparRangeSummary" class="respar-range-summary">已框选区域</div>
                    <div class="respar-range-grid"><button id="resparRangeDetect" class="primary">局部寻峰</button><button id="resparRangeDelete" class="danger-soft">删除框选峰</button><button id="resparRangeLock">锁定框选峰</button><button id="resparRangeUnlock">解锁框选峰</button></div>
                    <div class="respar-range-identity"><div>统一峰序 / 峰标签</div><select id="resparRangeOrder"></select><input id="resparRangeLabel" type="text" placeholder="类别标签，例如 峰3 / AB"><button id="resparRangeApplyIdentity">应用到框选峰</button></div>
                    <div class="respar-range-footer"><span>峰位始终落在原始 I–V 采样点</span><button id="resparRangeClose">关闭</button></div>
                  </div>
                  <div id="resparHoverTip" class="respar-hover-tip hidden"></div>
                </div>
              </div>
              <div class="respar-status-row"><div id="reswinSummary" class="respar-summary"></div></div>
            </main>
          </section>

          <div id="resparInspectorPanel" class="respar-floating-panel respar-inspector-panel hidden">
            <div class="respar-floating-header"><span>曲线检查器</span><div><button data-respar-close="inspect" class="respar-panel-close" title="关闭">×</button></div></div>
            <div class="respar-floating-body"><div id="reswinInspectorBody" class="respar-inspector-body"></div></div>
          </div>

          <div id="resparGroupPanel" class="respar-floating-panel respar-group-panel hidden">
            <div class="respar-floating-header"><span>组图面板 <small id="reswinGroupContext" class="respar-group-context"></small></span><div><button type="button" data-respar-group-cols-menu title="设置每行子图数量">每行：自动 ▾</button><button data-respar-collapse="group">缩小</button><button data-respar-close="group" class="respar-panel-close" title="关闭">×</button></div></div>
            <div class="respar-floating-body">
              <div id="reswinGroupGrid" class="reswin-group-grid"></div>
            </div>
          </div>

          <section class="respar-derived hidden" data-reswin-view-panel="physics">
            <div class="respar-derived-header"><h3>物理机制分析</h3><button data-reswin-view="main">返回主图</button></div>
            <div id="reswinPhysicsSummary" class="reswin-physics-summary"></div><div class="reswin-two-col"><div class="analysis-chart-card"><div class="analysis-chart-title">稳定 ridge：V0 与有效分裂 δ</div><div id="reswinPhysicsPlot" class="analysis-chart reswin-medium-plot"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">物理机制判据</div><div id="reswinPhysicsModel" class="reswin-report"></div></div></div><div class="analysis-table-wrap"><table id="reswinPhysicsTable" class="analysis-table"></table></div>
          </section>
          <section class="respar-derived hidden" data-reswin-view-panel="spacing">
            <div class="respar-derived-header"><h3>两峰间距分析</h3><button data-reswin-view="main">返回主图</button></div><div class="analysis-control-card reswin-spacing-controls"><label>峰序列 A<select id="reswinSpacingA"></select></label><label>峰序列 B<select id="reswinSpacingB"></select></label><label>显示<select id="reswinSpacingMode"><option value="abs">|VB − VA|</option><option value="signed">VB − VA</option></select></label><button id="reswinSpacingExport">导出 CSV</button></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰间距随 Vg 变化</div><div id="reswinSpacingPlot" class="analysis-chart reswin-medium-plot"></div></div><div class="analysis-table-wrap"><table id="reswinSpacingTable" class="analysis-table"></table></div>
          </section>
          <section class="respar-derived hidden" data-reswin-view-panel="gate">
            <div class="respar-derived-header"><h3>栅压物理分析</h3><button data-reswin-view="main">返回主图</button></div>
            <div class="analysis-control-card reswin-gate-controls"><label>ridge A<select id="reswinGateA"></select></label><label>ridge B<select id="reswinGateB"></select></label><label>回滞峰<select id="reswinGateHysteresis"></select></label><label>峰宽<select id="reswinGateWidth"><option value="hwhm">HWHM</option><option value="fwhm">FWHM</option></select></label><label class="inline-check"><input id="reswinGateUseDensity" type="checkbox">换算 n<sub>g</sub></label><label>Cg (F/m²)<input id="reswinGateCg" type="number" step="any"></label><label>V<sub>CNP</sub> (V)<input id="reswinGateCnp" type="number" step="any"></label><button id="reswinGateRun" class="primary">刷新分析</button><button id="reswinGateExportCsv">数据 CSV</button><button id="reswinGateExportReport">报告</button></div>
            <div id="reswinGateSummary" class="ter-summary reswin-summary"></div><div class="reswin-gate-grid"><div class="analysis-chart-card"><div class="analysis-chart-title">共振 ridge</div><div id="reswinGateRidges" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">共振中心 V0</div><div id="reswinGateV0" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">有效分裂 δ</div><div id="reswinGateDelta" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰宽与 |δ|/w</div><div id="reswinGateWidthPlot" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">TERmax</div><div id="reswinGateTer" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">最佳读出偏压 Vd*</div><div id="reswinGateVStar" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">正反扫回滞</div><div id="reswinGateHysteresisPlot" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">峰高与有效权重</div><div id="reswinGateAmplitude" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">TERmax vs |δ|/w</div><div id="reswinGateTerCorrelation" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">Vd* vs V0</div><div id="reswinGateReadoutCorrelation" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">局域背景与峰/背景比</div><div id="reswinGateBackground" class="analysis-chart"></div></div><div class="analysis-chart-card"><div class="analysis-chart-title">载流子浓度依赖（可选）</div><div id="reswinGateDensity" class="analysis-chart"></div></div></div><div id="reswinGateReport" class="reswin-report"></div><div class="analysis-table-wrap"><table id="reswinGateTable" class="analysis-table"></table></div>
          </section>
        </div>
      </div>`;
  }

  const TOP_STYLES=`
    #resonanceDedicatedPage .resonance-dedicated-body{padding:0!important;overflow:hidden!important;background:#f5f7fb}
    #resonanceDedicatedPage .resonance-parity-root{position:relative;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:#f5f7fb;font-size:12px}
    #resonanceDedicatedPage .respar-header-actions{display:flex;align-items:center;gap:5px;flex-wrap:nowrap;overflow-x:auto}#resonanceDedicatedPage .respar-header-divider{width:1px;height:22px;background:#dfe4ec;flex:0 0 auto}
    #resonanceDedicatedPage .respar-primary{width:100%;height:100%;min-width:0;min-height:0;display:grid;grid-template-columns:280px minmax(0,1fr);background:#fff}
    #resonanceDedicatedPage .respar-left-panel{min-width:0;overflow:auto;padding:12px;background:#fff;border-right:1px solid #d9deea}
    #resonanceDedicatedPage .respar-left-panel section{border-bottom:1px solid #edf0f6;padding-bottom:12px;margin-bottom:12px}
    #resonanceDedicatedPage .respar-left-panel h3{font-size:14px;margin:0 0 8px;color:#273244}
    #resonanceDedicatedPage .respar-left-panel label{font-size:12px;color:#4b5563}
    #resonanceDedicatedPage .respar-scan-global{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:7px}
    #resonanceDedicatedPage .respar-scan-global button{width:100%;padding:4px 7px;font-size:12px}
    #resonanceDedicatedPage .respar-select-label{display:flex;flex-direction:column;gap:4px;margin:6px 0}
    #resonanceDedicatedPage .respar-select-label select{width:100%;height:30px}
    #resonanceDedicatedPage .respar-dataset-list{display:flex;flex-direction:column;gap:4px;max-height:300px;overflow:auto;margin-top:6px}
    #resonanceDedicatedPage .reswin-dataset{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:5px;padding:7px;border:1px solid transparent;border-radius:7px;background:#fff;cursor:pointer}
    #resonanceDedicatedPage .reswin-dataset:hover{background:#f7f8fc}#resonanceDedicatedPage .reswin-dataset.selected{border-color:#9db2ff;background:#eef2ff}
    #resonanceDedicatedPage .reswin-dataset-title{grid-column:1/-1;min-width:0}#resonanceDedicatedPage .reswin-dataset-title label{font-weight:600;color:#334155}
    #resonanceDedicatedPage .reswin-dataset>label:not(.reswin-dataset-title){font-size:11px}#resonanceDedicatedPage .reswin-vg{width:72px;height:25px;padding:2px 5px}#resonanceDedicatedPage .reswin-transform-row{grid-column:1/-1;display:flex;align-items:center;gap:5px}#resonanceDedicatedPage .reswin-dataset-transform{flex:1;min-width:0;height:26px}
    #resonanceDedicatedPage .respar-note,#resonanceDedicatedPage .respar-hint{font-size:11px;line-height:1.6;color:#6b7280}#resonanceDedicatedPage .respar-note{padding:7px;background:#f7f9fc;border:1px solid #e5e9f0;border-radius:7px}
    #resonanceDedicatedPage .respar-preset-row label{display:flex;align-items:center;gap:7px}#resonanceDedicatedPage .respar-preset-row select{flex:1;height:29px}#resonanceDedicatedPage .respar-advanced{margin-top:7px}#resonanceDedicatedPage .respar-advanced summary{font-size:11px;color:#667085;cursor:pointer;padding:4px 0}
    #resonanceDedicatedPage .respar-detect-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:7px}#resonanceDedicatedPage .respar-detect-actions button{padding:5px 7px;font-size:11px}
    #resonanceDedicatedPage .respar-peak-legend{margin-top:8px;padding:7px;border:1px solid #e5e7eb;border-radius:7px;background:#fafbfe;font-size:11px;display:flex;flex-wrap:wrap;gap:5px 9px}#resonanceDedicatedPage .respar-peak-legend span{display:inline-flex;align-items:center;gap:4px}#resonanceDedicatedPage .respar-peak-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}
    #resonanceDedicatedPage .respar-main-area{position:relative;min-width:0;min-height:0;overflow:hidden;display:grid;grid-template-rows:minmax(0,1fr) auto;background:#fff}
    #resonanceDedicatedPage .respar-main-workspace{position:relative;min-width:0;min-height:0;overflow:hidden;background:#fff;display:grid;grid-template-columns:minmax(0,1fr);height:100%}#resonanceDedicatedPage .respar-plot-wrap{position:relative;min-width:0;min-height:0;overflow:hidden;background:#fff}
    #resonanceDedicatedPage .respar-main-plot-header{position:absolute;left:82px;right:18px;top:8px;z-index:42;display:flex;align-items:center;gap:8px;min-width:0;pointer-events:none}#resonanceDedicatedPage .respar-main-plot-header>*{pointer-events:auto}
    #resonanceDedicatedPage .respar-main-tools{display:flex;gap:4px;padding:4px;background:rgba(255,255,255,.94);border:1px solid #d9deea;border-radius:8px;box-shadow:0 2px 8px rgba(15,23,42,.08);flex:0 0 auto}#resonanceDedicatedPage .respar-main-tools button{min-height:0;padding:4px 8px;font-size:11px;background:#fff;border:1px solid #d7dce7;border-radius:6px}
    #resonanceDedicatedPage .respar-main-legend{min-width:0;flex:1;height:36px;display:flex;align-items:center;gap:5px;overflow-x:auto;white-space:nowrap;padding:3px 5px;border:1px solid #d9deea;border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 2px 8px rgba(15,23,42,.06)}
    #resonanceDedicatedPage .respar-legend-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;height:26px;padding:3px 7px;border:1px solid #e1e6ef;border-radius:6px;background:#fff;color:#475569;font-size:10px}#resonanceDedicatedPage .respar-legend-chip.selected{font-weight:750;border-color:#6f8ff2;background:#eef3ff}#resonanceDedicatedPage .respar-legend-chip.dimmed{opacity:.16}#resonanceDedicatedPage .respar-legend-line{width:18px;height:0;border-top:3px solid currentColor}#resonanceDedicatedPage .respar-legend-line.reverse{border-top-style:dashed}
    #resonanceDedicatedPage .respar-main-svg{position:absolute;left:0;top:0;width:100%;height:100%;display:block;overflow:hidden}#resonanceDedicatedPage .respar-axis path,#resonanceDedicatedPage .respar-axis line{stroke:#aeb6c8}#resonanceDedicatedPage .respar-axis text{fill:#576176;font-size:11px}#resonanceDedicatedPage .respar-curve-hit{fill:none;stroke:transparent;stroke-width:14px;pointer-events:stroke;cursor:pointer}#resonanceDedicatedPage .respar-peak-hit{fill:transparent;stroke:none;pointer-events:all;cursor:pointer}#resonanceDedicatedPage .respar-peak-hit.editable{cursor:grab}
    #resonanceDedicatedPage .respar-axis-title{font-size:12px;fill:#374151;font-weight:520}#resonanceDedicatedPage .respar-peak-point{pointer-events:none}#resonanceDedicatedPage .respar-peak-point.dimmed{opacity:.12}#resonanceDedicatedPage .respar-physics-label{font-size:11px;font-weight:750;pointer-events:none}#resonanceDedicatedPage .respar-width-band{opacity:.075;pointer-events:none}#resonanceDedicatedPage .respar-width-line{stroke-width:1.5;pointer-events:none}#resonanceDedicatedPage .respar-width-handle{cursor:ew-resize;pointer-events:all}#resonanceDedicatedPage .respar-direct-box{pointer-events:none;stroke-width:1.4}#resonanceDedicatedPage .respar-direct-box.range{fill:rgba(58,96,246,.08);stroke:#3a60f6;stroke-dasharray:5 3}#resonanceDedicatedPage .respar-direct-box.zoom{fill:rgba(124,58,237,.07);stroke:#7c3aed;stroke-dasharray:3 3}#resonanceDedicatedPage .respar-persisted-range{fill:rgba(58,96,246,.04);stroke:#3a60f6;stroke-width:1;stroke-dasharray:5 4;pointer-events:none}
    #resonanceDedicatedPage .respar-status-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:38px;padding:4px 8px;border-top:1px solid #edf0f4;background:#fbfcfe}#resonanceDedicatedPage .respar-summary{display:flex;gap:10px;font-size:11px;color:#667085;white-space:nowrap;overflow:hidden}#resonanceDedicatedPage .respar-export-row{display:flex;gap:4px;flex:0 0 auto}#resonanceDedicatedPage .respar-export-row button{min-height:28px;padding:3px 7px;font-size:11px}
    #resonanceDedicatedPage .respar-hover-tip{position:absolute;z-index:80;pointer-events:none;background:rgba(17,24,39,.94);color:#fff;padding:8px 10px;border-radius:7px;font-size:12px;line-height:1.5;max-width:320px;box-shadow:0 12px 30px rgba(15,23,42,.18)}
    #resonanceDedicatedPage .respar-range-menu{position:absolute;z-index:90;width:290px;padding:8px;background:#fff;border:1px solid #d7deea;border-radius:9px;box-shadow:0 12px 30px rgba(15,23,42,.16)}#resonanceDedicatedPage .respar-range-summary{font-size:11px;font-weight:650;color:#475467;margin-bottom:6px}#resonanceDedicatedPage .respar-range-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}#resonanceDedicatedPage .respar-range-grid button{font-size:11px;padding:4px 6px}#resonanceDedicatedPage .respar-range-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:1px solid #edf0f5;margin-top:7px;padding-top:6px;font-size:10px;color:#7a8495}
    #resonanceDedicatedPage .respar-range-identity{display:grid;grid-template-columns:1fr;gap:5px;margin-top:7px;padding-top:7px;border-top:1px solid #edf0f5;font-size:11px;color:#667085}#resonanceDedicatedPage .respar-range-identity select,#resonanceDedicatedPage .respar-range-identity input,#resonanceDedicatedPage .respar-range-identity button{width:100%;min-height:28px;font-size:11px}#resonanceDedicatedPage .respar-floating-panel{position:absolute;z-index:160;background:#fff;border:1px solid #d9deea;border-radius:10px;box-shadow:0 14px 40px rgba(20,30,60,.16);resize:both;overflow:hidden;min-width:320px;min-height:220px}#resonanceDedicatedPage .respar-inspector-panel{right:24px;top:56px;width:390px;height:560px}#resonanceDedicatedPage .respar-group-panel{right:24px;bottom:44px;width:min(880px,calc(100% - 48px));height:620px}#resonanceDedicatedPage .respar-floating-header{height:36px;display:flex;align-items:center;justify-content:space-between;padding:0 9px;background:#f7f8fb;border-bottom:1px solid #d9deea;font-weight:650;cursor:move;user-select:none}#resonanceDedicatedPage .respar-floating-header>div{display:flex;gap:5px}#resonanceDedicatedPage .respar-floating-header button{min-height:0;padding:3px 7px;font-size:11px}#resonanceDedicatedPage .respar-panel-close{border:none;background:transparent;font-size:18px!important}#resonanceDedicatedPage .respar-floating-body{height:calc(100% - 36px);overflow:auto;padding:10px}#resonanceDedicatedPage .respar-group-panel.collapsed{height:36px!important;min-height:36px!important;resize:none!important}#resonanceDedicatedPage .respar-group-panel.collapsed .respar-floating-body{display:none}
    #resonanceDedicatedPage .respar-inspect-controls{display:flex;flex-direction:column;gap:7px}#resonanceDedicatedPage .respar-inspect-controls>label{display:flex;flex-direction:column;gap:3px;font-size:11px}#resonanceDedicatedPage .reswin-kv{display:grid;grid-template-columns:110px minmax(0,1fr);gap:4px 8px;font-size:11px}#resonanceDedicatedPage .respar-inline-actions,#resonanceDedicatedPage .respar-label-editor{display:flex;gap:6px;align-items:flex-end;margin:7px 0}#resonanceDedicatedPage .respar-label-editor label{flex:1;display:flex;flex-direction:column;gap:3px;font-size:11px}#resonanceDedicatedPage .respar-inspect-plot{height:210px;min-height:180px}
    #resonanceDedicatedPage .respar-group-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:8px;margin-bottom:10px;border-bottom:1px solid #edf0f5;font-size:11px;color:#64748b;position:sticky;top:0;background:#fff;z-index:3}#resonanceDedicatedPage .respar-group-cols{display:flex;align-items:center;gap:4px}#resonanceDedicatedPage .respar-group-cols button{min-height:0;padding:3px 7px;font-size:11px}#resonanceDedicatedPage .respar-group-cols button.active{background:#e8efff;border-color:#7c9cff;color:#2147b7;font-weight:650}
    #resonanceDedicatedPage .reswin-group-grid{--reswin-group-cols:3;display:grid;grid-template-columns:repeat(var(--reswin-group-cols),minmax(0,1fr));gap:12px;align-items:start;width:100%}#resonanceDedicatedPage .reswin-group-card{border:1px solid #d9deea;border-radius:8px;overflow:hidden;background:#fff;min-width:0;display:grid;grid-template-rows:auto minmax(210px,var(--reswin-group-height,240px)) auto}#resonanceDedicatedPage .reswin-group-head{min-height:34px;height:auto;padding:5px 8px;box-sizing:border-box;font-size:12px;font-weight:650;background:#fafbfe;display:flex;justify-content:space-between;align-items:center;gap:8px}#resonanceDedicatedPage .reswin-group-head button{min-height:24px;height:24px;box-sizing:border-box;padding:2px 6px;font-size:11px;display:inline-flex;align-items:center;justify-content:center}#resonanceDedicatedPage .reswin-group-legend{display:flex;flex-wrap:wrap;gap:5px 12px;padding:7px 8px 8px;border-top:1px solid #edf0f5;font-size:11px;color:#475569}
    #resonanceDedicatedPage .respar-derived{position:absolute;inset:0;z-index:130;background:#f5f7fb;overflow:auto;padding:12px}#resonanceDedicatedPage .respar-derived-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}#resonanceDedicatedPage .respar-derived-header h3{margin:0;font-size:17px}#resonanceDedicatedPage .reswin-two-col,#resonanceDedicatedPage .reswin-gate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}#resonanceDedicatedPage .reswin-medium-plot{height:380px}#resonanceDedicatedPage .reswin-report{padding:12px;font-size:12px;line-height:1.65;color:#475467}
    /* v3.36: exact GRS-derived data/inspector/range visual language */
    #resonanceDedicatedPage .respar-dataset-list{display:flex;flex-direction:column;gap:4px;max-height:330px;overflow:auto;margin-top:6px}
    #resonanceDedicatedPage .respar-dataset-item{display:grid;grid-template-columns:22px minmax(0,1fr);gap:6px;padding:7px;border-radius:7px;border:1px solid transparent;cursor:pointer;background:#fff}
    #resonanceDedicatedPage .respar-dataset-item:hover{background:#f7f8fc}#resonanceDedicatedPage .respar-dataset-item.selected{border-color:#9db2ff;background:#eef2ff}#resonanceDedicatedPage .respar-dataset-item>.reswin-master{align-self:start;margin-top:2px}
    #resonanceDedicatedPage .respar-dataset-content{min-width:0}#resonanceDedicatedPage .respar-dataset-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;color:#25324a}
    #resonanceDedicatedPage .respar-dataset-vg{display:flex;align-items:center;gap:4px;margin-top:3px;color:#667085;font-size:11px}
    #resonanceDedicatedPage .respar-dataset-vg input{width:76px;height:24px;padding:2px 5px;border:1px solid #d7ddea;border-radius:5px;color:#334155;background:#fff;font-size:11px;box-shadow:none}
    #resonanceDedicatedPage .respar-dataset-vg input:focus{outline:2px solid rgba(49,94,251,.16);border-color:#7795ed}
    #resonanceDedicatedPage .respar-scan-toggle{display:flex;gap:12px;margin-top:5px;font-size:11px;color:#4b5563}#resonanceDedicatedPage .respar-scan-toggle label{display:flex;align-items:center;gap:4px;cursor:pointer}
    #resonanceDedicatedPage .respar-dataset-transform{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:5px;margin-top:5px;font-size:10px;color:#64748b}#resonanceDedicatedPage .respar-dataset-transform select{min-width:0;width:100%;height:24px;padding:2px 4px;border:1px solid #d9deea;border-radius:5px;background:#fff;color:#475569;font-size:10px}
    #resonanceDedicatedPage .respar-range-menu{position:absolute;z-index:150;width:260px;padding:8px;border:1px solid #cfd8e6;border-radius:9px;background:rgba(255,255,255,.98);box-shadow:0 10px 30px rgba(29,41,57,.16);backdrop-filter:blur(4px)}
    #resonanceDedicatedPage .respar-range-summary{font-size:11px;font-weight:700;color:#344054;padding:2px 3px 7px;margin:0}#resonanceDedicatedPage .respar-range-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}#resonanceDedicatedPage .respar-range-grid button{min-height:29px;font-size:11px}
    #resonanceDedicatedPage .respar-range-footer{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-top:7px;padding-top:6px;border-top:1px solid #edf0f5;font-size:9px;color:#7a8497}
    #resonanceDedicatedPage .respar-range-identity{margin-top:7px;padding-top:7px;border-top:1px solid #edf0f5;display:grid;grid-template-columns:86px minmax(0,1fr);gap:5px;font-size:10px;color:#475467}
    #resonanceDedicatedPage .respar-range-identity>div{grid-column:1/-1;font-size:10px;font-weight:750}#resonanceDedicatedPage .respar-range-identity select,#resonanceDedicatedPage .respar-range-identity input{min-width:0;width:auto;height:29px;border:1px solid #d4dce8;border-radius:5px;padding:3px 6px;font-size:10px;background:#fff}#resonanceDedicatedPage .respar-range-identity button{grid-column:1/-1;min-height:29px;font-size:11px}
    #resonanceDedicatedPage .respar-inspector-body{font-size:12px;color:#25324a}#resonanceDedicatedPage .respar-inspector-section{border-bottom:1px solid #edf0f6;padding-bottom:10px;margin-bottom:10px}#resonanceDedicatedPage .respar-inspector-section h4{margin:0 0 7px;font-size:13px}
    #resonanceDedicatedPage .respar-inspector-kv{display:grid;grid-template-columns:130px minmax(0,1fr);gap:4px 8px;font-size:12px}#resonanceDedicatedPage .respar-inspector-kv .k{color:#667085}
    #resonanceDedicatedPage .respar-inspector-hint{font-size:12px;line-height:1.7;color:#667085;margin-bottom:7px}
    #resonanceDedicatedPage .respar-inspector-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
    #resonanceDedicatedPage .respar-peak-class-grid{display:grid;grid-template-columns:110px minmax(0,1fr);gap:7px;margin-top:8px}#resonanceDedicatedPage .respar-peak-class-grid label{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#667085;min-width:0}#resonanceDedicatedPage .respar-peak-class-grid input{min-width:0;width:100%;height:auto;border:1px solid #d9deea;border-radius:6px;padding:5px;color:#25324a;background:#fff;font-size:11px;box-shadow:none}
    #resonanceDedicatedPage .respar-inspector-row{display:flex;align-items:center;gap:6px;margin-top:7px}#resonanceDedicatedPage .respar-inspector-row button{font-size:11px}
    #resonanceDedicatedPage .respar-inspector-transform{margin-top:10px;border-top:1px solid #edf0f6;padding-top:10px}#resonanceDedicatedPage .respar-inspect-plot{height:210px;min-height:180px}
    #resonanceDedicatedPage .peak-category-palette{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px 0}#resonanceDedicatedPage .peak-category-choice{display:flex;align-items:center;gap:7px;justify-content:flex-start;padding:6px 8px;min-width:0;font-size:11px}#resonanceDedicatedPage .peak-category-choice.selected{background:#eef4ff;border-color:#668cff;box-shadow:inset 0 0 0 1px #668cff}#resonanceDedicatedPage .category-pair-swatch{display:inline-flex;align-items:center;gap:2px;flex:0 0 auto}#resonanceDedicatedPage .category-pair-swatch i{display:block;width:14px!important;height:18px!important;border-radius:5px!important;box-shadow:0 0 0 1px #cfd5df!important}
    #resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-floating{min-width:360px!important;min-height:280px!important;resize:both!important}
    #resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-docked{min-height:300px!important}
    #resonanceDedicatedPage .hidden{display:none!important}

    #resonanceDedicatedPage .respar-group-context{font-size:10px;font-weight:500;color:#7b8497;margin-left:6px}
    #resonanceDedicatedPage .reswin-group-card-actions{display:flex;align-items:center;gap:3px;white-space:nowrap;min-width:0;flex:0 0 auto}
    #resonanceDedicatedPage .reswin-group-card-actions>.dkds-portable-controls{display:flex;align-items:center;gap:2px;margin:0;padding:0;flex:0 0 auto}
    #resonanceDedicatedPage .reswin-group-card-actions .dkds-portable-placement-trigger{min-width:28px;height:24px;padding:2px 5px}
    #resonanceDedicatedPage .reswin-group-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #resonanceDedicatedPage .reswin-group-legend-item{display:inline-flex;align-items:center;gap:4px;min-width:0}
    #resonanceDedicatedPage .reswin-group-legend-item i{width:10px;height:3px;border-radius:2px;display:inline-block;flex:0 0 auto}
    #resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-global-floating{min-width:380px!important;min-height:300px!important;resize:both!important}

    @media(max-width:1050px){#resonanceDedicatedPage .respar-primary{grid-template-columns:240px minmax(0,1fr)}#resonanceDedicatedPage .respar-main-plot-header{left:72px;right:10px}#resonanceDedicatedPage .reswin-two-col,#resonanceDedicatedPage .reswin-gate-grid{grid-template-columns:1fr}}
  `;

  function mountUnified(ctx,controller,{mode='top',adapter={}}={}){
    const h=ctx.host,R=controller.service;
    ctx.ui.styles.add('resonance-grs-parity',TOP_STYLES);
    const isTop=mode==='top'||ctx.host.isAuxiliaryWindow;
    ctx.ui.activities.add({id:'resonance',label:'共振分析',contextLabel:'共振分析',icon:'∿',order:10,default:true,primary:true,openMode:'window',description:'共振曲线、峰位与物理分析',onActivate:()=>{h.openAnalysisPage('resonanceDedicatedPage');controller.render();}});
    const page=ctx.ui.pages.add({id:'resonance-dedicated',pageId:'resonanceDedicatedPage',activity:'resonance',toolbar:false,label:'共振分析',order:10,html:topPageHtml(),onOpen:()=>controller.render()});
    R.bindUi?.(page);R.setUiRuntime?.(ctx.ui);R.setDetectorRuntime?.({list:()=>ctx.analysis.detectors.list()});
    let detectorParamPanel=null;
    const renderDetectorPicker=()=>{const select=page.querySelector('#reswinDetectorSelect'),note=page.querySelector('#reswinDetectorDescription'),paramHost=page.querySelector('#reswinDetectorParams');if(!select)return;const rows=ctx.analysis.detectors.list(),state=R.getState?.(),current=String(state?.workspace?.activeDetector||rows.find(row=>row.default)?.id||rows[0]?.id||'');select.innerHTML=rows.map(row=>`<option value="${String(row.id).replace(/"/g,'&quot;')}">${String(row.shortName||row.name||row.id)}</option>`).join('');if(rows.some(row=>String(row.id)===current))select.value=current;const renderActive=()=>{const row=rows.find(item=>String(item.id)===select.value);if(note)note.textContent=row?.description||'选择当前使用的寻峰算法。';detectorParamPanel?.dispose?.();detectorParamPanel=null;if(paramHost)paramHost.replaceChildren();if(row?.parameterSchema&&paramHost&&ctx.parameters?.render){const ws=R.getState?.()?.workspace||{},value=ws.detectorSettings?.[row.id]||ws.algorithms||{};detectorParamPanel=ctx.parameters.render(paramHost,row.parameterSchema,{value,onChange:next=>R.setDetectorSettings?.(row.id,next)});}};select.onchange=()=>{R.setActiveDetector?.(select.value);renderActive();};renderActive();};
    renderDetectorPicker();ctx.events.on('plugin:manager-changed',renderDetectorPicker);ctx.capabilities?.watch?.(event=>{if(event?.kind==='analysis.detector'||event?.reason==='remote-import')renderDetectorPicker();});

    for(const [id,key,handler] of [['resonance-sweep-up','ArrowUp',()=>R.switchSelectedSweep?.(-1)],['resonance-sweep-down','ArrowDown',()=>R.switchSelectedSweep?.(1)],['resonance-peak-left','ArrowLeft',()=>R.moveSelectedPeakBy?.(-1)],['resonance-peak-right','ArrowRight',()=>R.moveSelectedPeakBy?.(1)],['resonance-peak-left-fast','Shift+ArrowLeft',()=>R.moveSelectedPeakBy?.(-5)],['resonance-peak-right-fast','Shift+ArrowRight',()=>R.moveSelectedPeakBy?.(5)],['resonance-select-prev','Ctrl+ArrowLeft',()=>R.selectAdjacentPeak?.(-1)],['resonance-select-next','Ctrl+ArrowRight',()=>R.selectAdjacentPeak?.(1)],['resonance-lock','L',()=>R.lockSelectedPeaks?.(true)],['resonance-unlock','Shift+L',()=>R.lockSelectedPeaks?.(false)],['resonance-delete','Delete',()=>R.deleteSelectedPeaks?.()],['resonance-physics-labels','P',()=>R.togglePhysicsLabels?.()]])ctx.ui.shortcuts.add({id,activity:'resonance',key,priority:250,handler});

    const body=page.querySelector('.resonance-dedicated-body'),parity=page.querySelector('.resonance-parity-root');
    if(!body||!parity)throw new Error('Resonance parity DOM is incomplete.');
    parity.remove();body.replaceChildren();body.classList.add('dkds-unified-workbench-body');const host=document.createElement('div');host.className='dkds-plugin-workbench-root resonance-parity-host';body.appendChild(host);
    const workspaceFactory=ctx.ui.workspaceSurface||ctx.ui.pluginWorkspace||ctx.ui.analysisSurface||ctx.ui.analysisWorkbench;
    if(!workspaceFactory?.create)throw new Error('PluginWorkspace Core capability is unavailable.');
    const wb=workspaceFactory.create(host,{header:false,activity:'resonance',hostMode:isTop?'top':'super',primaryScroll:'contained',leftWidth:280,leftMin:230,canvasLeftWidth:360,canvasRightWidth:390,canvasBottomHeight:360});
    const primaryShell=parity.querySelector('.respar-primary'),leftPanel=primaryShell?.querySelector('.respar-left-panel'),mainArea=primaryShell?.querySelector('.respar-main-area');
    const inspector=parity.querySelector('#resparInspectorPanel'),group=parity.querySelector('#resparGroupPanel');
    const subNodes={physics:parity.querySelector('[data-reswin-view-panel="physics"]'),spacing:parity.querySelector('[data-reswin-view-panel="spacing"]'),gate:parity.querySelector('[data-reswin-view-panel="gate"]')};
    if(!leftPanel||!mainArea)throw new Error('Resonance GRS primary layout is incomplete.');
    leftPanel.remove();mainArea.remove();
    wb.compose({
      primary:{id:'main',label:'共振分析',scroll:'contained',leftNode:leftPanel,mainNode:mainArea},
      primes:[
        {id:'curve-inspector',label:'检查',existingNode:inspector,defaultPlacement:'float',placements:['float','global','left','right','bottom'],stateVersion:'workspace-v2',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="inspect"]',mount:({container})=>{container.classList.remove('hidden');R.renderInspection?.();},onPlacementChanged:()=>controller.resize?.()},
        {id:'group-analysis',label:'组图',existingNode:group,defaultPlacement:'bottom',placements:['float','global','left','right','bottom'],stateVersion:'workspace-v2',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="group"]',collapseSelector:'[data-respar-collapse="group"]',collapseLabel:'缩小',expandLabel:'展开',mount:({container})=>{container.classList.remove('hidden');R.renderGroup?.();},onClose:()=>R.closeGroupViews?.(),onPlacementChanged:()=>controller.resize?.()}
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
    wb.setNavigationPresentation?.('host');
    ctx.ui.edit?.register?.({id:'resonance',order:10,undo:()=>{R.undoLastAction?.();return true;},deselect:()=>{R.clearSelection?.();return true;}});
    const groupColsBtn=page.querySelector('[data-respar-group-cols-menu]');
    if(groupColsBtn){
      const syncGroupColsLabel=()=>{const value=String(R.getGroupColumns?.()||'auto');groupColsBtn.textContent=`每行：${value==='auto'?'自动':value} ▾`;};
      syncGroupColsLabel();
      groupColsBtn.onclick=event=>{
      event.preventDefault();event.stopPropagation();
      const current=String(R.getGroupColumns?.()||'auto');
      const rect=groupColsBtn.getBoundingClientRect();
      const values=['auto','1','2','3','4','5','6'];
      const items=values.map(value=>({
        id:`group-cols-${value}`,
        icon:current===value?'✓':'',
        label:value==='auto'?'自动排列':`每行 ${value} 个子图`,
        onInvoke:()=>{R.setGroupColumns?.(value);syncGroupColsLabel();}
      }));
      const menu=ctx.ui.contextMenus?.open?.({x:rect.left,y:rect.bottom+4,items});
      if(!menu)ctx.host?.setStatus?.('组图布局菜单当前不可用。');
      };
    }
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
      {type:'separator'},{id:'export',label:'导出',menu:true,items:exportItems},
      ...(isTop?[{id:'close',label:'关闭窗口',onInvoke:()=>h.closeCurrentWindow?.()}]:[])
    ];
    const pageHeader=page.querySelector('.resonance-window-header'),headerActions=page.querySelector('#reswinHeaderActions');
    if(isTop){pageHeader?.classList.remove('hidden');if(headerActions)ctx.ui.actions?.mount?.(headerActions,{activity:'resonance',actions:localActions});}
    else{
      pageHeader?.classList.add('hidden');
      const toolbarActions=[
        ['res-inspect','检查','PRIME',40,()=>togglePanel('inspect')],['res-group','组图','PRIME',50,()=>togglePanel('group')],
        ['res-physics','物理机制','SUB',70,()=>navigate('physics')],['res-spacing','峰间距','SUB',80,()=>navigate('spacing')],['res-gate','栅压分析','SUB',90,()=>navigate('gate')]
      ];
      for(const [id,label,section,order,onClick] of toolbarActions)ctx.ui.toolbar.add({id,label,activity:'resonance',section,order,priority:section==='PRIME'?20:10,onClick});
      const menuRows=[['res-export-main-svg','共振 I–V 主图 · SVG',10,()=>R.exportMainSvg?.()],['res-export-main-png','共振 I–V 主图 · PNG',20,()=>R.exportMainPng?.()],['res-export-main-csv','共振 I–V 主图数据 · CSV',30,()=>R.exportMainCsv?.()],['res-export-main-copy','复制共振 I–V 主图数据',40,()=>R.copyMainCsv?.()],['res-export-peaks','峰参数 CSV',60,()=>R.exportPeaks?.()],['res-export-peaks-copy','复制峰参数',70,()=>R.copyPeaks?.()]];
      for(const [id,label,order,onClick] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'resonance',order,onClick});
    }
    ctx.ui.topWorkspace.register({id:'resonance',activity:'resonance',label:'共振分析',icon:'∿',layout:{mode:'native',root:{selector:'#resonanceDedicatedPage .dkds-plugin-workbench-root'},primary:{id:'main'},prime:[{id:'curve-inspector'},{id:'group-analysis'}],sub:[{id:'physics'},{id:'spacing'},{id:'gate-analysis'}]}});
    ctx.project.registerSlice('workspace',{serialize:()=>controller.serialize(),restore:(data,{legacyProject})=>controller.restore(data,{legacyProject}),reset:()=>controller.reset()});ctx.events.on('analysis:refresh',({id})=>{if(id==='resonanceDedicatedPage')controller.render();});ctx.events.on('data:artifacts-changed',()=>R.refreshData?.());ctx.events.on('layout:resize',()=>controller.resize());controller.render();adapter?.resize?.();return {controller,workbench:wb,mode};
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
    return Object.freeze({controller,catalog:VIEW_CATALOG,byId:id=>components[id]||null,...components,topPageHtml,topStyles:TOP_STYLES});
  }

  window.DKDSResonanceViewComponents=Object.freeze({
    VIEW_CATALOG,byId,create,topPageHtml,TOP_STYLES,mountUnified,mountTop,superGatePageHtml,superSpacingPageHtml
  });
})();
