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
    const nav=VIEW_CATALOG.map((v,i)=>`<button type="button" class="${i===0?'active':''}" data-reswin-view="${v.id}">${v.label}</button>`).join('');
    return `
        <div class="analysis-page-header resonance-window-header">
          <div class="reswin-title-block">
            <h2>共振分析</h2>
            <div class="analysis-subtitle">独立 TOP 插件窗口 · 完整共振工作区 · 工程数据来自自包含项目快照</div>
          </div>
          <nav class="reswin-nav" aria-label="共振分析功能">${nav}</nav>
          <button class="analysis-page-close" id="reswinCloseBtn">关闭窗口</button>
        </div>
        <div class="analysis-page-body resonance-dedicated-body">
          <section class="reswin-view active" data-reswin-view-panel="main">
            <div class="reswin-shell">
              <aside class="reswin-sidebar">
                <div class="analysis-control-card reswin-control-stack">
                  <strong>数据与扫描</strong>
                  <label>当前扫描<select id="reswinSweepSelect"></select></label>
                  <label>辅助视图<select id="reswinTransform">
                    <option value="raw">原始 I–V</option><option value="detrend">去背景</option><option value="didv">dI/dV</option>
                    <option value="d2idv2">d²I/dV²</option><option value="dlog">d ln|I|/dV</option><option value="dvdi">dV/dI</option><option value="resistance">R=|V/I|</option>
                  </select></label>
                  <div class="reswin-button-row"><button id="reswinShowAll">全部显示</button><button id="reswinHideAll">全部隐藏</button></div>
                </div>
                <div class="analysis-control-card reswin-control-stack">
                  <strong>寻峰</strong>
                  <label>预设<select id="reswinPreset"><option value="strict">严格</option><option value="balanced">平衡</option><option value="sensitive">灵敏</option></select></label>
                  <div class="reswin-button-row"><button id="reswinDetectSelected" class="primary">当前扫描寻峰</button><button id="reswinDetectAll">全部可见寻峰</button></div>
                  <button id="reswinSortPeaks">跨 Vg 智能整理峰序</button>
                  <div class="analysis-note compact">Shift + 左键点击曲线：在最近原始采样点添加手动峰。点击峰位后可在“曲线检查”中编辑。</div>
                </div>
                <div class="analysis-control-card reswin-control-stack reswin-datasets-card"><strong>数据文件</strong><div id="reswinDatasetList"></div></div>
              </aside>
              <main class="reswin-main">
                <div id="reswinSummary" class="ter-summary reswin-summary"></div>
                <div class="analysis-chart-card"><div class="analysis-chart-title">共振 I–V / 峰位</div><div id="reswinMainPlot" class="analysis-chart reswin-main-plot"></div></div>
                <div class="analysis-control-card export-card reswin-export"><strong>导出</strong><button id="reswinExportMainCsv">I–V CSV</button><button id="reswinExportMainSvg">主图 SVG</button><button id="reswinExportMainPng">主图 PNG</button><button id="reswinExportPeaks">峰参数 CSV</button><button id="reswinCopyPeaks" class="copy-btn">复制峰参数</button></div>
                <div class="analysis-chart-card"><div class="analysis-chart-title">峰轨迹 Vpk(Vg)</div><div id="reswinTrendPlot" class="analysis-chart reswin-trend-plot"></div></div>
              </main>
            </div>
          </section>

          <section class="reswin-view" data-reswin-view-panel="inspect">
            <div class="reswin-inspect-grid">
              <div class="reswin-inspect-column">
                <div class="analysis-control-card reswin-control-stack"><strong>当前对象</strong><div id="reswinInspectorSummary" class="reswin-kv"></div></div>
                <div class="analysis-control-card reswin-control-stack"><strong>峰类别</strong><label>类别标签<input id="reswinPeakLabelInput" type="text"></label><div class="reswin-button-row"><button id="reswinApplyPeakLabel">重命名类别</button><button id="reswinDeletePeak" class="danger-soft">删除选中峰</button></div></div>
                <div class="analysis-control-card reswin-control-stack"><strong>扫描选择</strong><label>当前扫描<select id="reswinInspectSweepSelect"></select></label></div>
              </div>
              <div class="reswin-inspect-main">
                <div class="analysis-chart-card"><div class="analysis-chart-title">辅助变换 / 候选核对</div><div id="reswinInspectPlot" class="analysis-chart reswin-inspect-plot"></div></div>
                <h3 class="analysis-section-title">当前扫描峰位</h3><div class="analysis-table-wrap"><table id="reswinPeakTable" class="analysis-table"></table></div>
              </div>
            </div>
          </section>

          <section class="reswin-view" data-reswin-view-panel="group">
            <div class="analysis-control-card reswin-group-controls"><strong>组图排列</strong><button data-reswin-cols="auto" class="active">自动</button><button data-reswin-cols="1">1 列</button><button data-reswin-cols="2">2 列</button><button data-reswin-cols="3">3 列</button><button data-reswin-cols="4">4 列</button></div>
            <div id="reswinGroupGrid" class="reswin-group-grid"></div>
          </section>

          <section class="reswin-view" data-reswin-view-panel="physics">
            <div id="reswinPhysicsSummary" class="reswin-physics-summary"></div>
            <div class="reswin-two-col">
              <div class="analysis-chart-card"><div class="analysis-chart-title">稳定 ridge：V0 与有效分裂 δ</div><div id="reswinPhysicsPlot" class="analysis-chart reswin-medium-plot"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">物理机制判据</div><div id="reswinPhysicsModel" class="reswin-report"></div></div>
            </div>
            <h3 class="analysis-section-title">峰族判定</h3><div class="analysis-table-wrap"><table id="reswinPhysicsTable" class="analysis-table"></table></div>
          </section>

          <section class="reswin-view" data-reswin-view-panel="spacing">
            <div class="analysis-control-card reswin-spacing-controls"><label>峰序列 A<select id="reswinSpacingA"></select></label><label>峰序列 B<select id="reswinSpacingB"></select></label><label>显示<select id="reswinSpacingMode"><option value="abs">|VB − VA|</option><option value="signed">VB − VA</option></select></label><button id="reswinSpacingExport">导出 CSV</button></div>
            <div class="analysis-chart-card"><div class="analysis-chart-title">峰间距随 Vg 变化</div><div id="reswinSpacingPlot" class="analysis-chart reswin-medium-plot"></div></div>
            <div class="analysis-table-wrap"><table id="reswinSpacingTable" class="analysis-table"></table></div>
          </section>

          <section class="reswin-view" data-reswin-view-panel="gate">
            <div class="analysis-control-card reswin-gate-controls">
              <label>ridge A<select id="reswinGateA"></select></label><label>ridge B<select id="reswinGateB"></select></label>
              <label>回滞峰<select id="reswinGateHysteresis"></select></label><label>峰宽<select id="reswinGateWidth"><option value="hwhm">HWHM</option><option value="fwhm">FWHM</option></select></label>
              <label class="inline-check"><input id="reswinGateUseDensity" type="checkbox">换算 n<sub>g</sub></label><label>Cg (F/m²)<input id="reswinGateCg" type="number" step="any"></label><label>V<sub>CNP</sub> (V)<input id="reswinGateCnp" type="number" step="any"></label>
              <button id="reswinGateRun" class="primary">刷新分析</button><button id="reswinGateExportCsv">数据 CSV</button><button id="reswinGateExportReport">报告</button>
            </div>
            <div id="reswinGateSummary" class="ter-summary reswin-summary"></div>
            <div class="reswin-gate-grid">
              <div class="analysis-chart-card"><div class="analysis-chart-title">共振 ridge</div><div id="reswinGateRidges" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">共振中心 V0</div><div id="reswinGateV0" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">有效分裂 δ</div><div id="reswinGateDelta" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">峰宽与 |δ|/w</div><div id="reswinGateWidthPlot" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">TERmax</div><div id="reswinGateTer" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">最佳读出偏压 Vd*</div><div id="reswinGateVStar" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">正反扫回滞</div><div id="reswinGateHysteresisPlot" class="analysis-chart"></div></div>
              <div class="analysis-chart-card"><div class="analysis-chart-title">峰高与有效权重</div><div id="reswinGateAmplitude" class="analysis-chart"></div></div>
            </div>
            <div id="reswinGateReport" class="reswin-report"></div>
            <div class="analysis-table-wrap"><table id="reswinGateTable" class="analysis-table"></table></div>
          </section>
        </div>`;
  }

  const TOP_STYLES=`
        #resonanceDedicatedPage .resonance-window-header{align-items:center;gap:12px;flex-wrap:nowrap}
        #resonanceDedicatedPage .reswin-title-block{min-width:210px;flex:0 1 auto}
        #resonanceDedicatedPage .reswin-nav{display:flex;align-items:center;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
        #resonanceDedicatedPage .reswin-nav::-webkit-scrollbar{display:none}
        #resonanceDedicatedPage .reswin-nav button{height:32px;min-width:max-content;padding:4px 10px;border-color:transparent;background:transparent}
        #resonanceDedicatedPage .reswin-nav button.active{border-color:#bfd0ff;background:#eef3ff;color:#234fc4}
        #resonanceDedicatedPage .reswin-view{display:none;min-width:0}
        #resonanceDedicatedPage .reswin-view.active{display:block}
        #resonanceDedicatedPage .reswin-shell{display:grid;grid-template-columns:minmax(250px,20%) minmax(0,1fr);gap:12px;align-items:start}
        #resonanceDedicatedPage .reswin-sidebar{min-width:0;display:flex;flex-direction:column;gap:10px;position:sticky;top:0}
        #resonanceDedicatedPage .reswin-control-stack{display:flex;flex-direction:column;align-items:stretch;margin:0;gap:8px}
        #resonanceDedicatedPage .reswin-control-stack label{display:flex;flex-direction:column;align-items:stretch;gap:4px;font-size:9px;color:#667085}
        #resonanceDedicatedPage .reswin-control-stack select,#resonanceDedicatedPage .reswin-control-stack input{width:100%;min-width:0}
        #resonanceDedicatedPage .reswin-button-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}
        #resonanceDedicatedPage .reswin-datasets-card{max-height:48vh;overflow:auto}
        #resonanceDedicatedPage .reswin-dataset{display:grid;grid-template-columns:minmax(0,1fr) 74px;gap:5px 7px;padding:8px 0;border-top:1px solid #edf0f5}
        #resonanceDedicatedPage .reswin-dataset:first-child{border-top:0}
        #resonanceDedicatedPage .reswin-dataset-title{grid-column:1/-1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;font-weight:700;color:#344054}
        #resonanceDedicatedPage .reswin-dataset label{margin:0}
        #resonanceDedicatedPage .reswin-check{flex-direction:row!important;align-items:center!important;justify-content:flex-start!important}
        #resonanceDedicatedPage .reswin-check input{width:auto!important}
        #resonanceDedicatedPage .reswin-main{min-width:0;display:flex;flex-direction:column;gap:10px}
        #resonanceDedicatedPage .reswin-summary{display:flex;flex-wrap:wrap;gap:8px}
        #resonanceDedicatedPage .reswin-summary span{padding:4px 8px;border:1px solid #dfe5ef;border-radius:999px;background:#fff;color:#566176;font-size:9px}
        #resonanceDedicatedPage .reswin-main-plot{height:clamp(430px,55vh,680px)}
        #resonanceDedicatedPage .reswin-trend-plot{height:360px}
        #resonanceDedicatedPage .reswin-inspect-grid{display:grid;grid-template-columns:minmax(260px,28%) minmax(0,1fr);gap:12px;align-items:start}
        #resonanceDedicatedPage .reswin-inspect-column{display:flex;flex-direction:column;gap:10px;position:sticky;top:0}
        #resonanceDedicatedPage .reswin-inspect-main{min-width:0;display:flex;flex-direction:column;gap:10px}
        #resonanceDedicatedPage .reswin-inspect-plot{height:430px}
        #resonanceDedicatedPage .reswin-kv{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;font-size:9px;line-height:1.45}
        #resonanceDedicatedPage .reswin-kv b{color:#667085;font-weight:600}
        #resonanceDedicatedPage #reswinPeakTable tr.selected{background:#eef3ff}
        #resonanceDedicatedPage .analysis-note.compact{margin:0;padding:7px 8px;font-size:8.5px}
        #resonanceDedicatedPage .reswin-group-controls{align-items:center}
        #resonanceDedicatedPage .reswin-group-controls button.active{border-color:#7c9cff;background:#eef3ff;color:#234fc4}
        #resonanceDedicatedPage .reswin-group-grid{display:grid;grid-template-columns:repeat(var(--reswin-group-cols,2),minmax(0,1fr));gap:12px}
        #resonanceDedicatedPage .reswin-group-card{min-width:0;border:1px solid #dfe5ef;border-radius:10px;background:#fff;overflow:hidden}
        #resonanceDedicatedPage .reswin-group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid #edf0f5;font-size:10px;font-weight:700}
        #resonanceDedicatedPage .reswin-group-plot{height:var(--reswin-group-height,300px)}
        #resonanceDedicatedPage .reswin-two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
        #resonanceDedicatedPage .reswin-medium-plot{height:420px}
        #resonanceDedicatedPage .reswin-physics-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
        #resonanceDedicatedPage .reswin-physics-summary>div{padding:12px;border:1px solid #dfe5ef;border-radius:10px;background:#fff}
        #resonanceDedicatedPage .reswin-report{padding:12px 14px;border:1px solid #dfe5ef;border-radius:10px;background:#fff;color:#4f5b6f;font-size:10px;line-height:1.7;white-space:normal}
        #resonanceDedicatedPage .reswin-gate-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}
        #resonanceDedicatedPage .reswin-gate-grid .analysis-chart{height:330px}
        #resonanceDedicatedPage .reswin-spacing-controls,#resonanceDedicatedPage .reswin-gate-controls{align-items:end}
        @media(max-width:1050px){#resonanceDedicatedPage .resonance-window-header{flex-wrap:wrap}#resonanceDedicatedPage .reswin-nav{order:3;width:100%}#resonanceDedicatedPage .reswin-shell,#resonanceDedicatedPage .reswin-inspect-grid{grid-template-columns:1fr}#resonanceDedicatedPage .reswin-sidebar,#resonanceDedicatedPage .reswin-inspect-column{position:static}#resonanceDedicatedPage .reswin-datasets-card{max-height:none}#resonanceDedicatedPage .reswin-two-col,#resonanceDedicatedPage .reswin-gate-grid{grid-template-columns:1fr}}
      `;

  function mountTop(ctx,controller){
    const h=ctx.host;
    const R=controller.service;
    ctx.ui.styles.add('resonance-dedicated',TOP_STYLES);
    ctx.ui.activities.add({id:'resonance',label:'共振分析',contextLabel:'共振分析',icon:'∿',order:10,default:true,primary:true,openMode:'window',description:'完整共振 I–V 独立插件工作区',onActivate:()=>{h.openAnalysisPage('resonanceDedicatedPage');controller.render();}});
    const page=ctx.ui.pages.add({id:'resonance-dedicated',pageId:'resonanceDedicatedPage',activity:'resonance',toolbar:false,label:'共振分析',order:10,html:topPageHtml(),onOpen:()=>controller.render()});
    ctx.ui.topWorkspace.register({id:'resonance',activity:'resonance',label:'共振分析',icon:'∿',layout:{mode:'native',root:{selector:'#resonanceDedicatedPage'},prime:[]}});
    ctx.project.registerSlice('workspace',{serialize:()=>controller.serialize(),restore:(data,{legacyProject})=>controller.restore(data,{legacyProject}),reset:()=>controller.reset()});
    page.querySelector('#reswinCloseBtn').onclick=()=>h.closeCurrentWindow?.();
    R.bindUi?.(page);
    ctx.events.on('analysis:refresh',({id})=>{if(id==='resonanceDedicatedPage')controller.render();});
    ctx.events.on('layout:resize',()=>controller.resize());
    return {controller};
  }

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
    VIEW_CATALOG,byId,create,topPageHtml,TOP_STYLES,mountTop,superGatePageHtml,superSpacingPageHtml
  });
})();
