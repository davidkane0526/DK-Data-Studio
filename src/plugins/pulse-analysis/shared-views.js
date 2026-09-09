(() => {
  const PAGE_HTML=`
      <div class="analysis-page-header pulse-page-header">
        <div>
          <h2>脉冲 / 读取电流分析</h2>
        </div>
        <button class="analysis-page-close" data-analysis-target="pulseAnalysisPage">关闭窗口</button>
      </div>

      <div class="analysis-page-body pulse-analysis-body">
        <div class="pulse-batch-workspace">
          <aside class="pulse-card pulse-file-manager-card dkds-surface">
            <div class="pulse-card-heading dkds-surface-header dkds-surface-header-stacked pulse-file-manager-heading">
              <div class="dkds-surface-heading-stack">
                <h3>脉冲数据文件</h3>
                <p>勾选决定是否参与批量分析和叠加比较；点击文件切换当前编辑对象。</p>
              </div>
            </div>
            <div class="pulse-file-toolbar dkds-toolbar">
              <button id="pulseCheckAllBtn">全选</button>
              <button id="pulseUncheckAllBtn">全不选</button>
              <button id="pulseRemoveFilesBtn">从脉冲分析移除</button>
            </div>
            <div id="pulseFileList" class="pulse-file-list dkds-list"><div class="pulse-file-empty">尚未添加脉冲数据文件</div></div>
            <div id="pulseBatchFileSummary" class="pulse-file-summary dkds-meta">0 个文件</div>
          </aside>

          <section class="pulse-card pulse-config-card dkds-surface">
            <div class="pulse-card-heading dkds-surface-header dkds-surface-header-stacked">
              <div class="dkds-surface-heading-stack">
                <h3>当前文件与提取设置</h3>
                <p>“自动”会优先使用明确的时间协议；无协议但有电压时使用等点数分段。仅电流数据请填写写入/读取宽度。</p>
              </div>
              <div class="pulse-current-file-actions dkds-surface-actions">
              </div>
            </div>

            <div id="pulseNoActiveFile" class="pulse-current-empty">从左侧添加并选择一个文件。</div>

            <div id="pulseActiveEditor" class="hidden">
              <div class="pulse-active-file-head">
                <div>
                  <div class="pulse-active-path" id="pulseActiveFileName">—</div>
                  <div class="pulse-active-meta" id="pulseActiveFileMeta">—</div>
                </div>
                <label class="pulse-label-edit dkds-field">显示标签
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
                    <option value="equal-count">等点数分段</option>
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
                <label>每个平台点数
                  <input id="pulseBlockSamples" type="number" min="0" step="1" value="0" title="仅等点数分段模式使用；0 = 自动识别">
                </label>
                <label>读取平台配对
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

              <div class="pulse-protocol-hint dkds-note">
                周期数据可直接使用“每周期点数”。例如你的 DataDeal 脚本 <code>segs=300</code> 对应每周期 300 点；若只想统计周期内 105–115 点，可把读取统计区间设为 105–115。留空时会结合电压跳变或读写宽度比例自动确定相位。文件名也可携带 <code>t=0.1s read=0.1 1s</code> 等时间协议。
              </div>
              <div id="pulseSummary" class="pulse-summary pulse-summary-grid">
                <span class="pulse-summary-placeholder dkds-note">当前文件尚未分析。</span>
              </div>
            </div>
          </section>
        </div>

        <section class="pulse-card pulse-raw-card dkds-surface">
          <div class="pulse-card-heading pulse-plot-heading" data-dkds-plot-header>
            <h3 class="dkds-plot-view-title">当前文件 · 原始波形诊断</h3>
            <div class="pulse-plot-actions"></div>
          </div>
          <div id="pulseRawPlot" class="pulse-raw-plot pulse-plot-surface" data-scientific-plot></div>
        </section>

        <div class="pulse-results-split">
          <div class="pulse-results-visual-pane">
            <section class="pulse-card pulse-compare-toolbar-card dkds-surface">
              <div class="pulse-card-heading dkds-surface-header dkds-surface-header-stacked pulse-compare-toolbar" data-dkds-mobile-density="compact">
                <div class="dkds-surface-heading-stack"><h3>结果比较</h3><p>有脉冲电压时使用电压横轴；未记录/未指定时自动改用脉冲序号。</p></div>
                <div class="pulse-compare-actions dkds-surface-actions">
                  <label class="pulse-scope-action"><span>显示范围</span><select id="pulseResultScope"><option value="checked">全部勾选文件</option><option value="active">仅当前文件</option></select></label>
                  <div id="pulseComparedSummary" class="pulse-compared-summary dkds-chip">0 个已分析文件</div>
                </div>
              </div>
            </section>

            <div class="pulse-results-grid">
          <section class="pulse-card pulse-result-card dkds-surface">
            <div class="pulse-card-heading pulse-plot-heading" data-dkds-plot-header>
              <h3 class="dkds-plot-view-title">脉冲条件 → 读取电流</h3>
              <div class="pulse-plot-actions"></div>
            </div>
            <div id="pulseReadPlot" class="pulse-result-plot pulse-plot-surface" data-scientific-plot></div>
          </section>

          <section class="pulse-card pulse-result-card dkds-surface">
            <div class="pulse-card-heading pulse-plot-heading" data-dkds-plot-header>
              <h3 class="dkds-plot-view-title">脉冲条件 → 脉冲电流</h3>
              <div class="pulse-plot-actions"></div>
            </div>
            <div id="pulsePulsePlot" class="pulse-result-plot pulse-plot-surface" data-scientific-plot></div>
          </section>
            </div>
          </div>
          <div class="dkds-split-handle pulse-results-splitter" data-axis="y" role="separator" aria-orientation="horizontal" title="拖动调整结果图与数据表高度；双击复位"></div>

          <section class="pulse-card pulse-results-table-card dkds-surface">
          <div class="pulse-card-heading dkds-surface-header dkds-surface-header-stacked pulse-table-heading">
            <div class="dkds-surface-heading-stack"><h3>批量提取结果</h3><p id="pulseResultMeta">未知电压保持为空；CSV 不会用 0 或其他数值替代未记录电压。</p></div>
            <div class="pulse-table-actions dkds-surface-actions"><button id="pulseCopyCsvBtn" class="copy-btn" data-dkds-native-copy="clipboard">复制可见结果</button><button id="pulseExportCsvBtn" data-dkds-native-save="export">导出可见 CSV</button></div>
          </div>
            <div class="pulse-table-wrap dkds-table-wrap"><table id="pulseResultTable" class="pulse-result-table dkds-table"></table></div>
          </section>
        </div>
      </div>`;

  function attach(ctx,page){
    const body=ctx.ui.dom.query('.pulse-analysis-body',page);if(!body)return null;
    const batch=ctx.ui.dom.query('.pulse-batch-workspace',body);
    const fileManager=ctx.ui.dom.query('.pulse-file-manager-card',batch);
    const config=ctx.ui.dom.query('.pulse-config-card',batch);
    const primaryNodes=[...body.children].filter(node=>node!==batch);
    for(const node of [...body.children])node.remove();
    body.classList.add('dkds-unified-workbench-body');
    const host=ctx.ui.dom.create('div');host.className='dkds-plugin-workbench-root';body.appendChild(host);
    const wb=ctx.ui.workspaceSurface.create(host,{header:false,activity:'pulse',primaryScroll:'auto',leftWidth:390,leftMin:300,leftReserve:640,resizableRight:false,resizableBottom:false});
    const primaryMain=ctx.ui.dom.create('div');primaryMain.className='pulse-primary-surface';primaryMain.append(...primaryNodes);
    const controls=ctx.ui.dom.create('div');controls.className='pulse-control-rail';
    if(fileManager)controls.appendChild(fileManager);
    if(config)controls.appendChild(config);
    wb.compose({
      primary:{id:'main',label:'脉冲分析',scroll:'auto',mainNode:primaryMain},
      primes:[{id:'data-control',label:'参数',title:'脉冲文件与提取设置',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:92,collapsible:true,chrome:false,existingNode:controls,autoOpen:true,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'presentation-v1',mount:({container})=>container.classList.remove('hidden')}]
    });
    const split=ctx.ui.dom.query('.pulse-results-split',primaryMain),handle=ctx.ui.dom.query('.pulse-results-splitter',primaryMain),visual=ctx.ui.dom.query('.pulse-results-visual-pane',primaryMain);
    if(split&&handle&&visual)ctx.ui.layout.split({id:'pulse-results-height',container:split,handle,target:visual,axis:'y',cssVar:'--pulse-results-visual-height',defaultSize:540,min:380,reserve:220});
    return wb;
  }
  function create(controller){return Object.freeze({controller,pageHtml:()=>PAGE_HTML,attach});}
  window.DKDSPluginModules.define('builtin.pulse-analysis','shared-views',Object.freeze({create}));
})();
