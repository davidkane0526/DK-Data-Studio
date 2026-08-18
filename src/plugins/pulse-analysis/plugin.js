(() => {
  DKDSPlugins.define({
    id:'builtin.pulse-analysis',
    name:'Pulse / Read Analysis',
    version:'2.1.0',
    apiVersion:'1.3.0',
    description:'Batch pulse/read transient extraction with waveform, timing-protocol and current-only support.',
    source:'builtin',
    order:140,
    capabilities:['ui.activity','ui.page','analysis.pulse','project.slice','chart.timeseries']
  }, async ctx => {
    const h=ctx.host;
    const P=h.pulse;
    const pageHtml=`
      <div class="analysis-page-header pulse-page-header">
        <div>
          <h2>脉冲 / 读取电流分析</h2>
          <div class="analysis-subtitle">支持读写脉宽不同、仅记录电流、记录电压波形和旧版等点数数据；每个文件独立保存协议参数。</div>
        </div>
        <button class="analysis-page-close" data-analysis-target="pulseAnalysisPage">关闭窗口</button>
      </div>

      <div class="analysis-page-body pulse-analysis-body">
        <div class="pulse-batch-workspace">
          <aside class="pulse-card pulse-file-manager-card">
            <div class="pulse-card-heading pulse-file-manager-heading">
              <div>
                <h3>脉冲数据文件</h3>
                <p>勾选决定是否参与批量分析和叠加比较；点击文件切换当前编辑对象。</p>
              </div>
              <button id="pulseAddFilesBtn" class="primary">添加文件</button>
            </div>
            <div class="pulse-file-toolbar">
              <button id="pulseCheckAllBtn">全选</button>
              <button id="pulseUncheckAllBtn">全不选</button>
              <button id="pulseRemoveFilesBtn">移除勾选</button>
            </div>
            <div id="pulseFileList" class="pulse-file-list"><div class="pulse-file-empty">尚未添加脉冲数据文件</div></div>
            <div id="pulseBatchFileSummary" class="pulse-file-summary">0 个文件</div>
          </aside>

          <section class="pulse-card pulse-config-card">
            <div class="pulse-card-heading">
              <div>
                <h3>当前文件与提取设置</h3>
                <p>“自动”会优先使用明确的时间协议；无协议但有电压时保持旧版兼容。仅电流数据请填写写入/读取宽度。</p>
              </div>
              <div class="pulse-current-file-actions">
                <button id="pulseAnalyzeCurrentBtn">分析当前文件</button>
                <button id="pulseAnalyzeCheckedBtn" class="primary">分析全部勾选文件</button>
              </div>
            </div>

            <div id="pulseNoActiveFile" class="pulse-current-empty">从左侧添加并选择一个文件。</div>

            <div id="pulseActiveEditor" class="hidden">
              <div class="pulse-active-file-head">
                <div>
                  <div class="pulse-active-path" id="pulseActiveFileName">—</div>
                  <div class="pulse-active-meta" id="pulseActiveFileMeta">—</div>
                </div>
                <label class="pulse-label-edit">显示标签
                  <input id="pulseSeriesLabel" type="text" placeholder="例如 read=0.5 V / Device A">
                </label>
              </div>

              <div class="pulse-control-grid">
                <label>分段方式
                  <select id="pulseSegmentationMode">
                    <option value="auto">自动（推荐）</option>
                    <option value="cycle">按周期点数</option>
                    <option value="timing">按时间协议</option>
                    <option value="waveform">按记录电压平台</option>
                    <option value="legacy">旧版等点数平台</option>
                  </select>
                </label>
                <label>时间列
                  <select id="pulseTimeCol"></select>
                </label>
                <label>电流列
                  <select id="pulseCurrentCol"></select>
                </label>
                <label>记录电压列
                  <select id="pulseVoltageCol"></select>
                </label>

                <label>每周期点数
                  <input id="pulseCycleSamples" type="number" min="0" step="1" placeholder="0 = 自动，例如 300">
                </label>
                <label>首周期偏移点数
                  <input id="pulseCycleOffsetSamples" type="number" min="0" step="1" value="0">
                </label>
                <label>写入统计区间（点）
                  <div class="pulse-inline-range"><input id="pulseWriteStartSample" type="number" min="0" step="1" placeholder="自动"><span>–</span><input id="pulseWriteEndSample" type="number" min="1" step="1" placeholder="自动"></div>
                </label>
                <label>读取统计区间（点）
                  <div class="pulse-inline-range"><input id="pulseReadStartSample" type="number" min="0" step="1" placeholder="自动"><span>–</span><input id="pulseReadEndSample" type="number" min="1" step="1" placeholder="自动"></div>
                </label>

                <label>写入宽度 (s)
                  <input id="pulseWriteDuration" type="number" min="0" step="any" placeholder="例如 0.1">
                </label>
                <label>读取宽度 (s)
                  <input id="pulseReadDuration" type="number" min="0" step="any" placeholder="例如 1">
                </label>
                <label>相位顺序
                  <select id="pulsePhaseOrder">
                    <option value="write-read">写入 → 读取</option>
                    <option value="read-write">读取 → 写入</option>
                  </select>
                </label>
                <label>采样间隔 (s，可选)
                  <input id="pulseSampleInterval" type="number" min="0" step="any" placeholder="仅无时间列时需要">
                </label>

                <label>读取电压 (V，可选)
                  <input id="pulseReadVoltageFallback" type="number" step="any" placeholder="未记录电压时可填写">
                </label>
                <label>写入电压 (V，可选)
                  <input id="pulsePulseVoltageFallback" type="number" step="any" placeholder="未知时留空，横轴用序号">
                </label>
                <label>旧版每个平台点数
                  <input id="pulseBlockSamples" type="number" min="0" step="1" value="0" title="仅旧版等点数模式使用；0 = 自动识别">
                </label>
                <label>旧版读取平台配对
                  <select id="pulseReadPairMode">
                    <option value="after">脉冲后的读取平台</option>
                    <option value="before">脉冲前的读取平台</option>
                  </select>
                </label>

                <label>稳态窗口起点 (%)
                  <input id="pulseWindowStart" type="number" min="0" max="95" step="1" value="25">
                </label>
                <label>稳态窗口终点 (%)
                  <input id="pulseWindowEnd" type="number" min="5" max="100" step="1" value="75">
                </label>
                <div class="pulse-analyze-cell">
                  <button id="pulseApplySettingsBtn">当前设置应用到勾选文件</button>
                </div>
              </div>

              <div class="pulse-protocol-hint">
                周期数据可直接使用“每周期点数”。例如你的 DataDeal 脚本 <code>segs=300</code> 对应每周期 300 点；若只想统计周期内 105–115 点，可把读取统计区间设为 105–115。留空时会结合电压跳变或读写宽度比例自动确定相位。文件名也可携带 <code>t=0.1s read=0.1 1s</code> 等时间协议。
              </div>
              <div id="pulseSummary" class="pulse-summary pulse-summary-grid">
                <span class="pulse-summary-placeholder">当前文件尚未分析。</span>
              </div>
            </div>
          </section>
        </div>

        <section class="pulse-card pulse-raw-card">
          <div class="pulse-card-heading pulse-plot-heading">
            <div>
              <h3>当前文件 · 原始波形诊断</h3>
              <p id="pulseRawSubtitle">有记录电压时显示电压/电流双轨；仅电流文件只显示电流–时间波形。</p>
            </div>
            <div class="pulse-plot-actions">
              <button id="pulseRawFitBtn">适应全部</button>
              <button id="pulseRawCopyBtn" class="copy-btn">复制数据</button>
              <button id="pulseRawExportBtn">导出 CSV</button>
              <button id="pulseRawSvgBtn">导出 SVG</button>
              <button id="pulseRawPngBtn">导出 PNG</button>
            </div>
          </div>
          <div id="pulseRawPlot" class="pulse-raw-plot pulse-plot-surface"></div>
        </section>

        <section class="pulse-card pulse-compare-toolbar-card">
          <div class="pulse-compare-toolbar">
            <div><strong>结果比较</strong><span>有脉冲电压时使用电压横轴；未记录/未指定时自动改用脉冲序号。</span></div>
            <label>显示范围
              <select id="pulseResultScope"><option value="checked">全部勾选文件</option><option value="active">仅当前文件</option></select>
            </label>
            <div id="pulseComparedSummary" class="pulse-compared-summary">0 个已分析文件</div>
          </div>
        </section>

        <div class="pulse-results-grid">
          <section class="pulse-card pulse-result-card">
            <div class="pulse-card-heading pulse-plot-heading">
              <div><h3>脉冲条件 → 读取电流</h3><p>优先按脉冲电压比较；电压未知时按脉冲序号显示，不虚构电压。</p></div>
              <div class="pulse-plot-actions">
                <button id="pulseReadCopyBtn" class="copy-btn">复制可见数据</button><button id="pulseReadExportBtn">导出 CSV</button>
                <button id="pulseReadSvgBtn">导出 SVG</button><button id="pulseReadPngBtn">导出 PNG</button>
              </div>
            </div>
            <div id="pulseReadPlot" class="pulse-result-plot pulse-plot-surface"></div>
          </section>

          <section class="pulse-card pulse-result-card">
            <div class="pulse-card-heading pulse-plot-heading">
              <div><h3>脉冲条件 → 脉冲电流</h3><p>支持不同写入/读取宽度；仅电流文件同样可提取并比较。</p></div>
              <div class="pulse-plot-actions">
                <button id="pulsePulseCopyBtn" class="copy-btn">复制可见数据</button><button id="pulsePulseExportBtn">导出 CSV</button>
                <button id="pulsePulseSvgBtn">导出 SVG</button><button id="pulsePulsePngBtn">导出 PNG</button>
              </div>
            </div>
            <div id="pulsePulsePlot" class="pulse-result-plot pulse-plot-surface"></div>
          </section>
        </div>

        <section class="pulse-card pulse-results-table-card">
          <div class="pulse-card-heading pulse-table-heading">
            <div><h3>批量提取结果</h3><p id="pulseResultMeta">未知电压保持为空；CSV 不会用 0 或其他数值替代未记录电压。</p></div>
            <div class="pulse-table-actions"><button id="pulseCopyCsvBtn" class="copy-btn">复制可见结果</button><button id="pulseExportCsvBtn">导出可见 CSV</button></div>
          </div>
          <div class="pulse-table-wrap"><table id="pulseResultTable" class="physics-table pulse-result-table"></table></div>
        </section>
      </div>`;

    ctx.ui.activities.add({
      id:'pulse',label:'脉冲分析',contextLabel:'脉冲 / 读取分析',icon:'▥',order:40,primary:true,openMode:'window',
      description:'多文件脉冲 / 读取瞬态分析',
      onActivate:()=>{h.openAnalysisPage('pulseAnalysisPage');P.render();}
    });

    const page=ctx.ui.pages.add({
      id:'pulse-analysis',pageId:'pulseAnalysisPage',activity:'pulse',toolbar:false,
      label:'脉冲分析',buttonClass:'accent-soft',order:60,html:pageHtml,onOpen:()=>P.render()
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
    for(const id of [
      'pulseSegmentationMode','pulseTimeCol','pulseCurrentCol','pulseVoltageCol',
      'pulseCycleSamples','pulseCycleOffsetSamples','pulseWriteStartSample','pulseWriteEndSample',
      'pulseReadStartSample','pulseReadEndSample','pulseWriteDuration','pulseReadDuration',
      'pulseSampleInterval','pulsePhaseOrder','pulseReadVoltageFallback','pulsePulseVoltageFallback',
      'pulseBlockSamples','pulseWindowStart','pulseWindowEnd','pulseReadPairMode'
    ])page.querySelector('#'+id).onchange=()=>P.syncEditor();
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
      restore:(data,{legacyProject})=>P.restore(data ?? legacyProject?.pulseAnalysis ?? null),
      reset:()=>P.reset()
    });

    ctx.registry.add('analysis.providers','pulse-read',{
      id:'pulse-read',name:'Pulse / read transient extraction',analyze:window.DKDSScience.analyzePulseReadData
    });
    return {};
  });
})();
