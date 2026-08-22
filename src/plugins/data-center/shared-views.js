(() => {
  const PAGE_HTML=`
        <div class="analysis-page-header data-center-header"><div><h2>数据中心</h2><div class="analysis-subtitle">标准 Data Model + Provenance + Formula + Workflow / Recipe。新场景优先组合处理步骤，而不是修改主程序。</div></div><button class="analysis-page-close">关闭窗口</button></div>
        <div class="analysis-page-body data-center-body">
          <aside class="dc-card dc-artifact-pane">
            <div class="dc-section-head"><div class="dc-section-copy"><strong>数据对象</strong><span id="dcArtifactCount">0</span></div><select id="dcAssignmentFilter" class="dc-assignment-filter" title="按分析用途筛选"><option value="all">全部用途</option></select></div>
            <div class="dc-tag-filter"><span class="dc-tag-filter-label">标签</span><div id="dcTagChips" class="dc-tag-chips"></div><button id="dcTagClearBtn" type="button" title="清除标签筛选">清除</button></div>
            <div class="dc-selection-tools" aria-label="数据对象选择工具"><span>Shift 连选 · Ctrl/Cmd 多选</span><div><button id="dcSelectAllBtn" type="button">全选</button><button id="dcInvertSelectionBtn" type="button">反选</button><button id="dcClearSelectionBtn" type="button">清除</button></div></div>
            <div id="dcArtifactList" class="dc-artifact-list" tabindex="0" aria-label="数据对象列表"></div>
          </aside>
          <main class="dc-main">
            <section class="dc-card dc-source-preview"><div class="dc-section-head"><div class="dc-section-copy"><strong id="dcActiveName">未选择数据</strong><span id="dcActiveMeta">—</span></div><div class="dc-preview-actions"><div class="dc-tabs"><button data-dc-tab="formula" class="active">公式</button><button data-dc-tab="workflow">工作流</button><button data-dc-tab="provenance">来源链</button></div><button id="dcDataActionsBtn" type="button" disabled>编辑 ▾</button></div></div><div id="dcTablePreview" class="dc-table-preview"></div></section>
            <section id="dcFormulaPane" class="dc-card dc-tool-pane"><div class="dc-tool-title"><div><strong>公式 / 派生列</strong><span>无需写插件即可添加计算列；公式不会执行任意 JavaScript。</span></div><button id="dcApplyFormula" class="primary">生成派生列</button></div><div id="dcFormulaParams"></div><div id="dcFormulaRefs" class="dc-formula-refs"></div></section>
            <section id="dcWorkflowPane" class="dc-card dc-tool-pane hidden"><div class="dc-tool-title"><div><strong>Workflow / Recipe</strong><span>按顺序组合 Processor / Analyzer；以后可由插件继续增加步骤。</span></div><div class="dc-inline-actions"><button id="dcSaveRecipe">保存 Recipe</button></div></div><div class="dc-recipe-bar"><label>名称 <input id="dcRecipeName" value="我的工作流"></label><label>已保存 <select id="dcSavedRecipe"><option value="">—</option></select></label><button id="dcLoadRecipe">载入</button></div><div class="dc-add-step"><select id="dcStepType"><option value="processor">Processor</option><option value="analyzer">Analyzer</option></select><select id="dcProviderSelect"></select><button id="dcAddStep">添加步骤</button></div><div id="dcWorkflowSteps" class="dc-workflow-steps"></div><div id="dcWorkflowStatus" class="dc-workflow-status">尚未运行。</div></section>
            <section id="dcProvenancePane" class="dc-card dc-tool-pane hidden"><div class="dc-tool-title"><div><strong>Provenance</strong><span>记录来源文件、处理器、参数、插件版本和人工/自动处理链。</span></div><button id="dcCopyProvenance">复制 JSON</button></div><div id="dcProvenanceList" class="dc-provenance-list"></div></section>
            <section class="dc-card dc-chart-pane"><div class="dc-tool-title"><div><strong>通用图形预览</strong><span>图形也是可替换的 Chart Provider。</span></div><div class="dc-chart-toolbar"><select id="dcChartProvider"></select><button id="dcRenderChart">绘制</button></div></div><div id="dcChartParams"></div><div id="dcChart" class="dc-chart"></div></section>
          </main>
        </div>`;

  function attach(ctx,page){
    const body=page?.querySelector('.data-center-body');const left=page?.querySelector('.dc-artifact-pane');const main=page?.querySelector('.dc-main');
    if(!body||!left||!main)return null;
    left.remove();main.remove();body.replaceChildren();body.classList.add('dkds-unified-workbench-body');
    const host=ctx.ui.dom.create('div');host.className='dkds-plugin-workbench-root';body.appendChild(host);
    const wb=(ctx.ui.workspaceSurface||ctx.ui.pluginWorkspace||ctx.ui.analysisSurface||ctx.ui.analysisWorkbench).create(host,{header:false,activity:'data-center',primaryScroll:'auto'});
    wb.compose({primary:{id:'main',label:'数据中心',scroll:'auto',leftNode:left,mainNode:main}});
    return wb;
  }
  function create(controller){return Object.freeze({controller,pageHtml:()=>PAGE_HTML,attach});}
  window.DKDSPluginModules.define('builtin.data-center','shared-views',Object.freeze({create}));
})();
