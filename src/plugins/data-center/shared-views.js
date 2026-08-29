(() => {
  const PAGE_HTML=`
        <div class="analysis-page-header data-center-header"><div><h2>数据中心</h2><div class="analysis-subtitle">标准 Data Model + Provenance + Formula + Workflow / Recipe。新场景优先组合处理步骤，而不是修改主程序。</div></div><button class="analysis-page-close">关闭窗口</button></div>
        <div class="analysis-page-body data-center-body">
          <aside class="dc-card dc-artifact-pane dkds-surface">
            <div class="dc-section-head dkds-surface-header dkds-section-header"><div class="dc-section-copy dkds-section-header-main"><strong class="dkds-section-title">数据对象</strong><span id="dcArtifactCount" class="dkds-meta">0</span></div><div class="dkds-section-header-actions"><select id="dcAssignmentFilter" class="dc-assignment-filter dkds-field-control" title="按分析用途筛选"><option value="all">全部用途</option></select></div></div>
            <div class="dc-filter-stack dkds-filter-stack">
              <div class="dc-data-nav dkds-filter-row"><select id="dcLineageFilter" class="dkds-field-control" title="按数据层级筛选"><option value="all">全部层级</option><option value="raw">原始数据</option><option value="derived">派生数据</option></select><select id="dcFieldFilter" class="dc-field-filter dkds-field-control" title="按实际列标题 / 数据字段筛选"><option value="">全部字段</option></select></div>
              <div class="dc-selection-tools dkds-bulk-action-row" data-dkds-tooltip="Shift 连选 · Ctrl/Cmd 多选"><div class="dc-selection-buttons dkds-segmented-control" aria-label="批量选择"><button id="dcSelectAllBtn" type="button">全选</button><button id="dcInvertSelectionBtn" type="button">反选</button><button id="dcClearSelectionBtn" type="button">清除</button></div></div>
            </div>
            <div id="dcArtifactList" class="dc-artifact-list dkds-list" tabindex="0" aria-label="数据对象列表"></div>
          </aside>
          <main class="dc-main">
            <section class="dc-card dc-source-preview dkds-surface"><div class="dc-section-head dkds-surface-header dkds-section-header"><div class="dc-section-copy dkds-section-header-main"><strong id="dcActiveName" class="dkds-section-title">未选择数据</strong><span id="dcActiveMeta" class="dkds-meta">—</span></div><div class="dc-preview-actions dkds-section-header-actions"><div class="dc-tabs dkds-segmented-control" role="tablist" aria-label="数据中心工具"><button data-dc-tab="formula" role="tab" class="active" aria-selected="true">公式</button><button data-dc-tab="workflow" role="tab" aria-selected="false">工作流</button><button data-dc-tab="provenance" role="tab" aria-selected="false">来源链</button></div><button id="dcDataActionsBtn" type="button" disabled>编辑 ▾</button></div></div><div id="dcTablePreview" class="dc-table-preview"></div></section>
            <section id="dcFormulaPane" class="dc-card dc-tool-pane dkds-surface"><div class="dc-tool-title dkds-surface-header dkds-section-header"><div class="dkds-section-header-main"><strong class="dkds-section-title" data-dkds-tooltip="无需写插件即可添加计算列；公式不会执行任意 JavaScript。">公式 / 派生列</strong></div><div class="dkds-section-header-actions dkds-integrated-action-group" data-dkds-material-integrated="true"><div id="dcFormulaActions"></div></div></div><div id="dcFormulaParams"></div><div id="dcFormulaRefs" class="dc-formula-refs"></div></section>
            <section id="dcWorkflowPane" class="dc-card dc-tool-pane dkds-surface hidden"><div class="dc-tool-title dkds-surface-header dkds-section-header"><div class="dkds-section-header-main"><strong class="dkds-section-title" data-dkds-tooltip="按顺序组合 Processor / Analyzer；可由插件继续增加步骤。">Workflow / Recipe</strong></div><div class="dc-inline-actions dkds-section-header-actions dkds-integrated-action-group" data-dkds-material-integrated="true"><div id="dcWorkflowHeaderActions"></div></div></div><div class="dc-recipe-bar dkds-action-row"><label>名称 <input id="dcRecipeName" value="我的工作流"></label><label>已保存 <select id="dcSavedRecipe"><option value="">—</option></select></label><button id="dcLoadRecipe">载入</button></div><div class="dc-add-step dkds-action-row"><select id="dcStepType"><option value="processor">Processor</option><option value="analyzer">Analyzer</option></select><select id="dcProviderSelect"></select><button id="dcAddStep">添加步骤</button></div><div id="dcWorkflowSteps" class="dc-workflow-steps"></div><div id="dcWorkflowStatus" class="dc-workflow-status dkds-status">尚未运行。</div></section>
            <section id="dcProvenancePane" class="dc-card dc-tool-pane dkds-surface hidden"><div class="dc-tool-title dkds-surface-header dkds-section-header"><div class="dkds-section-header-main"><strong class="dkds-section-title" data-dkds-tooltip="记录来源文件、处理器、参数、插件版本和人工/自动处理链。">Provenance</strong></div><div class="dkds-section-header-actions dkds-integrated-action-group" data-dkds-material-integrated="true"><div id="dcProvenanceHeaderActions"></div></div></div><div id="dcProvenanceList" class="dc-provenance-list"></div></section>
            <section class="dc-card dc-chart-pane dkds-surface"><div class="dc-tool-title dkds-surface-header dkds-section-header"><div class="dkds-section-header-main"><strong class="dkds-section-title" data-dkds-tooltip="图形由可替换的 Chart Provider 提供；只有存在多个兼容 Provider 时才显示图形类型菜单。">通用图形预览</strong></div><div class="dc-chart-toolbar dkds-section-header-actions dkds-integrated-action-group" data-dkds-material-integrated="true"><div id="dcChartDomainActions"></div></div></div><div id="dcChartParams"></div><div id="dcChart" class="dc-chart" data-scientific-plot></div></section>
          </main>
        </div>`;

  function attach(ctx,page){
    const body=page?.querySelector('.data-center-body'),left=page?.querySelector('.dc-artifact-pane'),main=page?.querySelector('.dc-main');
    if(!body||!left||!main)return null;
    left.remove();main.remove();body.replaceChildren();body.classList.add('dkds-unified-workbench-body');
    const host=ctx.ui.dom.create('div');host.className='dkds-plugin-workbench-root';body.appendChild(host);
    const wb=ctx.ui.workspaceSurface.create(host,{header:false,activity:'data-center',primaryScroll:'auto',resizableLeft:false,resizableRight:false,resizableBottom:false});
    const layout=ctx.ui.dom.create('div');layout.className='dc-native-layout';
    const divider=ctx.ui.dom.create('div');divider.className='dkds-split-handle dc-data-divider';divider.dataset.axis='x';divider.setAttribute('role','separator');divider.setAttribute('aria-orientation','vertical');divider.title='拖动调整数据列表宽度；双击复位';
    layout.append(left,divider,main);
    wb.mountPrimary({id:'main',label:'数据中心',scroll:'auto',mainNode:layout});
    ctx.ui.layout.split({id:'data-center-data-width',container:layout,handle:divider,target:left,axis:'x',cssVar:'--dc-artifact-width',defaultSize:336,min:270,reserve:620});
    return wb;
  }
  function create(controller){return Object.freeze({controller,pageHtml:()=>PAGE_HTML,attach});}
  window.DKDSPluginModules.define('builtin.data-center','shared-views',Object.freeze({create}));
})();
