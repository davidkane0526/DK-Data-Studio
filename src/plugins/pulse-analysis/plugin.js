(() => {
  GRSPlugins.define({
    id:'builtin.pulse-analysis',
    name:'Pulse / Read Analysis',
    version:'2.0.0',
    apiVersion:'1.2.0',
    description:'Batch pulse/read transient extraction workspace with plugin-owned UI.',
    source:'builtin',
    order:140,
    capabilities:['ui.activity','ui.page','analysis.pulse','project.slice','chart.timeseries']
  }, async ctx => {
    const h=ctx.host;
    const P=h.pulse;
    const pageHtml="\n      <div class=\"analysis-page-header pulse-page-header\">\n        <div>\n          <h2>脉冲 / 读取电流分析</h2>\n          <div class=\"analysis-subtitle\">批量导入瞬态文件；每个文件独立识别参数，可叠加比较提取结果。</div>\n        </div>\n        <button class=\"analysis-page-close\" data-analysis-target=\"pulseAnalysisPage\">返回主图</button>\n      </div>\n\n      <div class=\"analysis-page-body pulse-analysis-body\">\n\n        <div class=\"pulse-batch-workspace\">\n          <aside class=\"pulse-card pulse-file-manager-card\">\n            <div class=\"pulse-card-heading pulse-file-manager-heading\">\n              <div>\n                <h3>脉冲数据文件</h3>\n                <p>勾选决定是否参与批量分析和叠加比较；点击文件切换当前编辑对象。</p>\n              </div>\n              <button id=\"pulseAddFilesBtn\" class=\"primary\">添加文件</button>\n            </div>\n\n            <div class=\"pulse-file-toolbar\">\n              <button id=\"pulseCheckAllBtn\">全选</button>\n              <button id=\"pulseUncheckAllBtn\">全不选</button>\n              <button id=\"pulseRemoveFilesBtn\">移除勾选</button>\n            </div>\n\n            <div id=\"pulseFileList\" class=\"pulse-file-list\">\n              <div class=\"pulse-file-empty\">尚未添加脉冲数据文件</div>\n            </div>\n\n            <div id=\"pulseBatchFileSummary\" class=\"pulse-file-summary\">0 个文件</div>\n          </aside>\n\n          <section class=\"pulse-card pulse-config-card\">\n            <div class=\"pulse-card-heading\">\n              <div>\n                <h3>当前文件与提取设置</h3>\n                <p>每个文件独立保存列映射、平台长度和稳态窗口。可将当前设置复制到全部勾选文件。</p>\n              </div>\n              <div class=\"pulse-current-file-actions\">\n                <button id=\"pulseAnalyzeCurrentBtn\">分析当前文件</button>\n                <button id=\"pulseAnalyzeCheckedBtn\" class=\"primary\">分析全部勾选文件</button>\n              </div>\n            </div>\n\n            <div id=\"pulseNoActiveFile\" class=\"pulse-current-empty\">\n              从左侧添加并选择一个文件。\n            </div>\n\n            <div id=\"pulseActiveEditor\" class=\"hidden\">\n              <div class=\"pulse-active-file-head\">\n                <div>\n                  <div class=\"pulse-active-path\" id=\"pulseActiveFileName\">—</div>\n                  <div class=\"pulse-active-meta\" id=\"pulseActiveFileMeta\">—</div>\n                </div>\n                <label class=\"pulse-label-edit\">\n                  显示标签\n                  <input id=\"pulseSeriesLabel\" type=\"text\" placeholder=\"例如 read=0.5 V / Device A\">\n                </label>\n              </div>\n\n              <div class=\"pulse-control-grid\">\n                <label>时间列\n                  <select id=\"pulseTimeCol\"></select>\n                </label>\n                <label>电流列\n                  <select id=\"pulseCurrentCol\"></select>\n                </label>\n                <label>脉冲电压列\n                  <select id=\"pulseVoltageCol\"></select>\n                </label>\n                <label>每个平台点数\n                  <input id=\"pulseBlockSamples\" type=\"number\" min=\"0\" step=\"1\" value=\"0\" title=\"0 = 自动识别\">\n                </label>\n                <label>稳态窗口起点 (%)\n                  <input id=\"pulseWindowStart\" type=\"number\" min=\"0\" max=\"95\" step=\"1\" value=\"25\">\n                </label>\n                <label>稳态窗口终点 (%)\n                  <input id=\"pulseWindowEnd\" type=\"number\" min=\"5\" max=\"100\" step=\"1\" value=\"75\">\n                </label>\n                <label>读取平台配对\n                  <select id=\"pulseReadPairMode\">\n                    <option value=\"after\">脉冲后的读取平台</option>\n                    <option value=\"before\">脉冲前的读取平台</option>\n                  </select>\n                </label>\n                <div class=\"pulse-analyze-cell\">\n                  <button id=\"pulseApplySettingsBtn\">当前设置应用到勾选文件</button>\n                </div>\n              </div>\n\n              <div id=\"pulseSummary\" class=\"pulse-summary pulse-summary-grid\">\n                <span class=\"pulse-summary-placeholder\">当前文件尚未分析。</span>\n              </div>\n            </div>\n          </section>\n        </div>\n\n        <section class=\"pulse-card pulse-raw-card\">\n          <div class=\"pulse-card-heading pulse-plot-heading\">\n            <div>\n              <h3>当前文件 · 原始波形诊断</h3>\n              <p id=\"pulseRawSubtitle\">原始波形只显示当前文件，避免多个瞬态文件叠加后无法判断平台识别质量。</p>\n            </div>\n            <div class=\"pulse-plot-actions\">\n              <button id=\"pulseRawFitBtn\">适应全部</button>\n              <button id=\"pulseRawCopyBtn\" class=\"copy-btn\">复制数据</button>\n              <button id=\"pulseRawExportBtn\">导出 CSV</button>\n              <button id=\"pulseRawSvgBtn\">导出 SVG</button>\n              <button id=\"pulseRawPngBtn\">导出 PNG</button>\n            </div>\n          </div>\n          <div id=\"pulseRawPlot\" class=\"pulse-raw-plot pulse-plot-surface\"></div>\n        </section>\n\n        <section class=\"pulse-card pulse-compare-toolbar-card\">\n          <div class=\"pulse-compare-toolbar\">\n            <div>\n              <strong>结果比较</strong>\n              <span>结果图和结果表可以只看当前文件，也可以叠加全部勾选且已分析的文件。</span>\n            </div>\n            <label>显示范围\n              <select id=\"pulseResultScope\">\n                <option value=\"checked\">全部勾选文件</option>\n                <option value=\"active\">仅当前文件</option>\n              </select>\n            </label>\n            <div id=\"pulseComparedSummary\" class=\"pulse-compared-summary\">0 个已分析文件</div>\n          </div>\n        </section>\n\n        <div class=\"pulse-results-grid\">\n          <section class=\"pulse-card pulse-result-card\">\n            <div class=\"pulse-card-heading pulse-plot-heading\">\n              <div>\n                <h3>脉冲电压 → 读取电流</h3>\n                <p>多文件模式下每个文件是一条独立序列，图例使用文件显示标签。</p>\n              </div>\n              <div class=\"pulse-plot-actions\">\n                <button id=\"pulseReadCopyBtn\" class=\"copy-btn\">复制可见数据</button>\n                <button id=\"pulseReadExportBtn\">导出 CSV</button>\n                <button id=\"pulseReadSvgBtn\">导出 SVG</button>\n                <button id=\"pulseReadPngBtn\">导出 PNG</button>\n              </div>\n            </div>\n            <div id=\"pulseReadPlot\" class=\"pulse-result-plot pulse-plot-surface\"></div>\n          </section>\n\n          <section class=\"pulse-card pulse-result-card\">\n            <div class=\"pulse-card-heading pulse-plot-heading\">\n              <div>\n                <h3>脉冲电压 → 脉冲电流</h3>\n                <p>可用于比较不同读取电压、器件、循环或测试条件下的脉冲响应。</p>\n              </div>\n              <div class=\"pulse-plot-actions\">\n                <button id=\"pulsePulseCopyBtn\" class=\"copy-btn\">复制可见数据</button>\n                <button id=\"pulsePulseExportBtn\">导出 CSV</button>\n                <button id=\"pulsePulseSvgBtn\">导出 SVG</button>\n                <button id=\"pulsePulsePngBtn\">导出 PNG</button>\n              </div>\n            </div>\n            <div id=\"pulsePulsePlot\" class=\"pulse-result-plot pulse-plot-surface\"></div>\n          </section>\n        </div>\n\n        <section class=\"pulse-card pulse-results-table-card\">\n          <div class=\"pulse-card-heading pulse-table-heading\">\n            <div>\n              <h3>批量提取结果</h3>\n              <p id=\"pulseResultMeta\">结果表会加入文件标签、源文件、读取电压等字段，便于多个文件一起复制、导出和后续统计。</p>\n            </div>\n            <div class=\"pulse-table-actions\">\n              <button id=\"pulseCopyCsvBtn\" class=\"copy-btn\">复制可见结果</button>\n              <button id=\"pulseExportCsvBtn\">导出可见 CSV</button>\n            </div>\n          </div>\n          <div class=\"pulse-table-wrap\">\n            <table id=\"pulseResultTable\" class=\"physics-table pulse-result-table\"></table>\n          </div>\n        </section>\n\n      </div>\n    ";

    ctx.ui.activities.add({
      id:'pulse',label:'脉冲',contextLabel:'脉冲 / 读取分析',icon:'▥',order:40,
      description:'多文件脉冲 / 读取瞬态分析',
      onActivate:()=>{h.openAnalysisPage('pulseAnalysisPage');P.render();}
    });

    const page=ctx.ui.pages.add({
      id:'pulse-analysis',
      pageId:'pulseAnalysisPage',
      activity:'pulse',
      toolbar:false,
      label:'脉冲分析',
      buttonClass:'accent-soft',
      order:60,
      html:pageHtml,
      onOpen:()=>P.render()
    });

    page.querySelector('#pulseAddFilesBtn').onclick=()=>P.addFiles();
    page.querySelector('#pulseCheckAllBtn').onclick=()=>P.setAllChecked(true);
    page.querySelector('#pulseUncheckAllBtn').onclick=()=>P.setAllChecked(false);
    page.querySelector('#pulseRemoveFilesBtn').onclick=()=>P.removeChecked();
    page.querySelector('#pulseAnalyzeCurrentBtn').onclick=()=>P.analyzeCurrent();
    page.querySelector('#pulseAnalyzeCheckedBtn').onclick=()=>P.analyzeChecked();
    page.querySelector('#pulseApplySettingsBtn').onclick=()=>P.applySettingsToChecked();

    page.querySelector('#pulseSeriesLabel').onchange=()=>{
      const item=P.syncEditor();
      if(item)P.refreshFileAndComparison();
    };
    for(const id of ['pulseTimeCol','pulseCurrentCol','pulseVoltageCol','pulseBlockSamples','pulseWindowStart','pulseWindowEnd','pulseReadPairMode']){
      page.querySelector('#'+id).onchange=()=>P.syncEditor();
    }
    page.querySelector('#pulseResultScope').onchange=e=>P.setResultScope(e.target.value);

    page.querySelector('#pulseRawFitBtn').onclick=()=>P.fitRaw();
    page.querySelector('#pulseRawCopyBtn').onclick=()=>P.copyRaw();
    page.querySelector('#pulseRawExportBtn').onclick=()=>P.exportRawCsv();
    page.querySelector('#pulseRawSvgBtn').onclick=()=>P.exportRawSvg();
    page.querySelector('#pulseRawPngBtn').onclick=()=>P.exportRawPng();

    page.querySelector('#pulseReadCopyBtn').onclick=()=>P.copyRead();
    page.querySelector('#pulseReadExportBtn').onclick=()=>P.exportReadCsv();
    page.querySelector('#pulseReadSvgBtn').onclick=()=>P.exportReadSvg();
    page.querySelector('#pulseReadPngBtn').onclick=()=>P.exportReadPng();

    page.querySelector('#pulsePulseCopyBtn').onclick=()=>P.copyPulse();
    page.querySelector('#pulsePulseExportBtn').onclick=()=>P.exportPulseCsv();
    page.querySelector('#pulsePulseSvgBtn').onclick=()=>P.exportPulseSvg();
    page.querySelector('#pulsePulsePngBtn').onclick=()=>P.exportPulsePng();

    page.querySelector('#pulseCopyCsvBtn').onclick=()=>P.copyResults();
    page.querySelector('#pulseExportCsvBtn').onclick=()=>P.exportResults();

    ctx.events.on('analysis:refresh',({id})=>{if(id==='pulseAnalysisPage')P.render();});

    ctx.events.on('layout:resize',()=>{
      for(const id of ['pulseRawPlot','pulseReadPlot','pulsePulsePlot']){
        const el=document.getElementById(id);
        if(el&&el.offsetParent!==null){try{Plotly.Plots.resize(el);}catch{}}
      }
    });

    ctx.project.registerSlice('workspace',{
      serialize:()=>P.serialize(),
      restore:(data,{legacyProject})=>{
        const source=data ?? legacyProject?.pulseAnalysis ?? null;
        P.restore(source);
      },
      reset:()=>P.reset()
    });

    ctx.registry.add('analysis.providers','pulse-read',{
      id:'pulse-read',
      name:'Pulse / read transient extraction',
      analyze:window.GRSScience.analyzePulseReadData
    });
    return {};
  });
})();
