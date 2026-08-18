(() => {
  DKDSPlugins.define({
    id:'builtin.ter-analysis',
    name:'TER Analysis',
    version:'2.0.0',
    apiVersion:'1.3.0',
    description:'Same-Vd TER matrix and extrema workspace with plugin-owned UI.',
    source:'builtin',
    order:120,
    capabilities:['ui.activity','ui.page','analysis.ter','chart.heatmap']
  }, async ctx => {
    const h=ctx.host;
    const T=h.ter;
    const pageHtml="\n      <div class=\"analysis-page-header\">\n        <div>\n          <h2>TER 热图 / TER_Max 分析</h2>\n          <div id=\"terMaxProjectName\" class=\"analysis-subtitle\">当前项目</div>\n        </div>\n        <button class=\"analysis-page-close\" data-analysis-target=\"terMaxPage\">关闭窗口</button>\n      </div>\n      <div class=\"analysis-page-body\">\n        <div class=\"analysis-control-card ter-controls\">\n          <label>Vds min (V)<input id=\"terVmin\" type=\"number\" step=\"any\"></label>\n          <label>Vds max (V)<input id=\"terVmax\" type=\"number\" step=\"any\"></label>\n          <label>Vds step (V)<input id=\"terVstep\" type=\"number\" step=\"any\"></label>\n          <label>配对容差 (V)<input id=\"terTolerance\" type=\"number\" step=\"any\"></label>\n          <label>电流下限 (A)<input id=\"terCurrentFloor\" type=\"number\" step=\"any\" value=\"1e-15\"></label>\n          <label class=\"inline-check\"><input id=\"terOnlyFullyVisible\" type=\"checkbox\">仅使用正反扫均显示的数据文件</label>\n          <button id=\"terAutoParamsBtn\">自动参数</button>\n          <button id=\"terCalculateBtn\" class=\"primary\">计算 TER_max</button>\n        </div>\n\n        <div class=\"analysis-note\">\n          TER 热图中的每个像素都对应一个实际 (Vd, Vg) 组合：在相同 Vd 下配对正扫/反扫，\n          R=|Vd/I|，TER=(Rhigh−Rlow)/Rlow×100%。TER_Max–Vg 是固定 Vg 后沿 Vd 方向取最大值；\n          TER_Max–Vd 是固定 Vd 后沿 Vg 方向取最大值。\n        </div>\n\n        <div class=\"analysis-control-card heatmap-display-controls\">\n          <strong>热图显示</strong>\n          <label>色图\n            <select id=\"terColorScale\">\n              <option value=\"Viridis\">Viridis</option>\n              <option value=\"Turbo\">Turbo</option>\n              <option value=\"Cividis\">Cividis</option>\n              <option value=\"Jet\">Jet</option>\n              <option value=\"Hot\">Hot</option>\n            </select>\n          </label>\n          <label>色阶最小 (%)\n            <input id=\"terColorMin\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>色阶最大 (%)\n            <input id=\"terColorMax\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>色阶刻度 (%)\n            <input id=\"terColorTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>Vds 刻度 (V)\n            <input id=\"terXTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>Vg 刻度 (V)\n            <input id=\"terYTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <button id=\"terApplyDisplayBtn\">应用显示</button>\n          <button id=\"terResetDisplayBtn\">自动色阶/刻度</button>\n        </div>\n        <div id=\"terSummary\" class=\"ter-summary\"></div>\n\n        <div class=\"ter-chart-grid\">\n          <div class=\"analysis-chart-card heatmap-square-card\">\n            <div class=\"analysis-chart-title\">TER(Vd, Vg) 全组合热图</div>\n            <div id=\"terHeatmapPlot\" class=\"analysis-chart ter-heatmap-square\"></div>\n          </div>\n\n          <div class=\"ter-reduction-grid\">\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">TER_Max–Vg：max over Vd</div>\n              <div id=\"terMaxVgPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">Vd@TER_Max–Vg</div>\n              <div id=\"terMaxVgArgPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">TER_Max–Vd：max over Vg</div>\n              <div id=\"terMaxVdPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">Vg@TER_Max–Vd</div>\n              <div id=\"terMaxVdArgPlot\" class=\"analysis-chart\"></div>\n            </div>\n          </div>\n        </div>\n\n        <div class=\"analysis-control-card export-card\">\n          <strong>热图/矩阵导出</strong>\n          <button id=\"terExportLongBtn\">TER_long.csv</button>\n          <button id=\"terCopyLongBtn\" class=\"copy-btn\">复制 long</button>\n          <button id=\"terExportMatrixBtn\">TER_matrix.csv</button>\n          <button id=\"terCopyMatrixBtn\" class=\"copy-btn\">复制 matrix</button>\n          <button id=\"terExportHeatmapSvgBtn\">热图 SVG</button>\n          <button id=\"terExportHeatmapPngBtn\">热图 PNG</button>\n        </div>\n\n        <div class=\"analysis-control-card export-card\">\n          <strong>TER_Max–Vg</strong>\n          <button id=\"terExportMaxVgBtn\">数据 CSV</button>\n          <button id=\"terCopyMaxVgBtn\" class=\"copy-btn\">复制数据</button>\n          <button id=\"terExportMaxVgSvgBtn\">图形 SVG</button>\n          <button id=\"terExportMaxVgPngBtn\">图形 PNG</button>\n          <strong>TER_Max–Vd</strong>\n          <button id=\"terExportMaxVdBtn\">数据 CSV</button>\n          <button id=\"terCopyMaxVdBtn\" class=\"copy-btn\">复制数据</button>\n          <button id=\"terExportMaxVdSvgBtn\">图形 SVG</button>\n          <button id=\"terExportMaxVdPngBtn\">图形 PNG</button>\n        </div>\n\n        <h3 class=\"analysis-section-title\">TER_Max–Vg 数据</h3>\n        <div class=\"analysis-table-wrap\">\n          <table id=\"terMaxVgTable\" class=\"analysis-table\"></table>\n        </div>\n\n        <h3 class=\"analysis-section-title\">TER_Max–Vd 数据</h3>\n        <div class=\"analysis-table-wrap\">\n          <table id=\"terMaxVdTable\" class=\"analysis-table\"></table>\n        </div>\n      </div>\n    ";

    ctx.ui.activities.add({
      id:'ter',label:'TER分析',contextLabel:'TER 分析',icon:'▧',order:30,openMode:'window',
      description:'同 Vd TER 矩阵与极值分析',
      onActivate:()=>{h.openAnalysisPage('terMaxPage');T.render();}
    });

    const page=ctx.ui.pages.add({
      id:'ter-max',
      pageId:'terMaxPage',
      activity:'ter',
      toolbar:false,
      label:'TER_max',
      order:50,
      html:pageHtml,
      onOpen:()=>T.render()
    });

    page.querySelector('#terAutoParamsBtn').onclick=()=>T.autoParameters();
    page.querySelector('#terCalculateBtn').onclick=()=>T.calculate();
    page.querySelector('#terApplyDisplayBtn').onclick=()=>T.applyDisplay();
    page.querySelector('#terResetDisplayBtn').onclick=()=>T.resetDisplay();
    page.querySelector('#terOnlyFullyVisible').onchange=e=>T.setOnlyFullyVisible(e.target.checked);

    page.querySelector('#terExportLongBtn').onclick=()=>T.exportLong();
    page.querySelector('#terCopyLongBtn').onclick=()=>T.copyLong();
    page.querySelector('#terExportMatrixBtn').onclick=()=>T.exportMatrix();
    page.querySelector('#terCopyMatrixBtn').onclick=()=>T.copyMatrix();
    page.querySelector('#terExportHeatmapSvgBtn').onclick=()=>T.exportHeatmapSvg();
    page.querySelector('#terExportHeatmapPngBtn').onclick=()=>T.exportHeatmapPng();

    page.querySelector('#terExportMaxVgBtn').onclick=()=>T.exportMaxVg();
    page.querySelector('#terCopyMaxVgBtn').onclick=()=>T.copyMaxVg();
    page.querySelector('#terExportMaxVgSvgBtn').onclick=()=>T.exportMaxVgSvg();
    page.querySelector('#terExportMaxVgPngBtn').onclick=()=>T.exportMaxVgPng();

    page.querySelector('#terExportMaxVdBtn').onclick=()=>T.exportMaxVd();
    page.querySelector('#terCopyMaxVdBtn').onclick=()=>T.copyMaxVd();
    page.querySelector('#terExportMaxVdSvgBtn').onclick=()=>T.exportMaxVdSvg();
    page.querySelector('#terExportMaxVdPngBtn').onclick=()=>T.exportMaxVdPng();

    ctx.events.on('analysis:refresh',({id})=>{if(id==='terMaxPage')T.render();});

    // Dedicated-window persistence is namespaced by plugin. This slice is the
    // canonical TER cache; legacy root-level TER fields are migration input.
    ctx.project.registerSlice('workspace',{
      serialize:()=>T.serialize(),
      restore:(data,{legacyProject})=>T.restore(data,{legacyProject}),
      reset:()=>T.reset()
    });

    ctx.events.on('layout:resize',()=>{
      for(const id of ['terHeatmapPlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
        const el=document.getElementById(id);
        if(el&&el.offsetParent!==null){try{Plotly.Plots.resize(el);}catch{}}
      }
    });

    ctx.registry.add('analysis.providers','ter',{
      id:'ter',
      name:'Same-Vd TER',
      computeMatrix:window.DKDSScience.computeTerMatrix,
      computeResonant:window.DKDSScience.computeResonantTerForLabel
    });
    return {};
  });
})();
