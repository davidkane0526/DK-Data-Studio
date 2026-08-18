(() => {
  // Resonance feature runtime: all functional rendering/event binding lives here.
  // SUPER/TOP adapters are intentionally limited to container/lifecycle mapping.
  async function mountSuper(ctx,controller,adapter={}){
    const h=ctx.host;
    const R=controller.service;
    const S=controller.science||window.DKDSScience;
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    let detectorParamPanel=null;
    const Views=window.DKDSResonanceViewComponents;
    if(!Views)throw new Error('Resonance shared View components are not loaded.');
    const viewSet=Views.create(controller);
    const gatePageHtml=viewSet.gate.superPageHtml();
    const spacingPageHtml=viewSet.spacing.superPageHtml();

    ctx.ui.activities.add({
      id:'resonance',label:viewSet.main.label,contextLabel:viewSet.main.label,icon:'∿',order:10,default:true,primary:true,openMode:'window',
      description:'共振 I–V、峰轨迹、TER 与栅压依赖工作区',
      onActivate:()=>h.showMainWorkspace()
    });

    ctx.ui.topWorkspace.register({
      id:'resonance',activity:'resonance',label:viewSet.main.label,icon:'∿',
      layout:{
        mode:'native',root:{selector:'.workspace'},
        left:{role:'data-display',mount:'#pluginSidebarSections',defaultFraction:0.20,minFraction:0.14,maxFraction:0.42},
        main:{role:'primary-data',mount:'#mainWorkspace',interaction:'plugin-owned'},
        prime:[
          {id:'curve-inspector',placements:['float','right','bottom']},
          {id:'group-analysis',placements:['float','right','bottom']}
        ]
      }
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
    ctx.ui.prime.register('curve-inspector',{activity:'resonance',label:'曲线检查',target:'inspectorPanel',placements:['right','float'],defaultPlacement:'right',persistPlacement:false,getPlacement:()=>ctx.host?.panels?.inspector?.placement?.()||'right',place:placement=>ctx.host?.panels?.inspector?.place?.(placement)});
    ctx.ui.prime.register('group-analysis',{activity:'resonance',label:'组图分析',target:'groupPanel',placements:['bottom','float'],defaultPlacement:'bottom',persistPlacement:false,getPlacement:()=>ctx.host?.panels?.group?.placement?.()||'bottom',place:placement=>ctx.host?.panels?.group?.place?.(placement)});

    const physicsPanel=ctx.ui.panels.add({
      id:'physics',panelId:'physicsPanel',activity:'resonance',section:'分析',priority:70,label:viewSet.physics.label,toolbarLabel:viewSet.physics.label,order:30,
      className:'physics-panel',html:'<div id="physicsBody"><div class="empty-state">导入并确认峰位后自动分析</div></div>',
      headerActionsHtml:'<button id="refreshPhysicsBtn" type="button">刷新</button>',
      onOpen:()=>renderPhysicsPanel()
    });
    physicsPanel.querySelector('#refreshPhysicsBtn').onclick=()=>{renderPhysicsPanel();R.renderMainPlot();R.setStatus('物理机制分析已根据当前已采纳峰刷新。');};

    const spacingPage=ctx.ui.pages.add({
      id:'spacing',buttonId:'openSpacingPageBtn',pageId:'spacingPage',activity:'resonance',section:'分析',priority:60,label:viewSet.spacing.label,order:40,
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
      id:'gate-analysis',buttonId:'openGateAnalysisPageBtn',pageId:'gateAnalysisPage',activity:'resonance',section:'分析',priority:65,label:viewSet.gate.label,order:50,
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

    ctx.ui.sub.register('physics',{activity:'resonance',label:viewSet.physics.label,kind:'panel',target:'physicsPanel'});
    ctx.ui.sub.register('spacing',{activity:'resonance',label:viewSet.spacing.label,kind:'page',target:'spacingPage'});
    ctx.ui.sub.register('gate-analysis',{activity:'resonance',label:viewSet.gate.label,kind:'page',target:'gateAnalysisPage'});

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
      activity:'resonance',priority:100,panelTitle:viewSet.inspect.superPanelTitle,
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
    function trendModel(){return controller.buildTrendModel();}
    ctx.ui.groupViews.register('resonance-group',{activity:'resonance',priority:100,panelTitle:viewSet.group.superPanelTitle,title(){const m=trendModel();return m.p?`峰：${R.directionName(m.p.direction)}·${R.peakLabel(m.p)}`:m.sw?`曲线：Vg=${m.sw.vg} V ${R.directionName(m.sw.direction)}`:'全部可见共振数据';}});
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

    ctx.project.registerSlice('workspace',{serialize:()=>R.serialize(),restore:(data,{legacyProject})=>R.restore(data,{legacyProject}),reset:()=>R.reset()});

    return {deactivate(){detectorParamPanel?.destroy?.();}};

  }

  // Dedicated TOP renderer uses the same shared Controller/View contracts and
  // host-neutral UI infrastructure. Window-runtime.js only supplies host slots.
  const S=window.DKDSScience;
  const Shared=window.DKDSResonanceWorkbenchShared;
  if(!Shared)throw new Error('Resonance shared workbench layer is not loaded before the dedicated runtime.');
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';
  const csvCell=value=>{const s=String(value??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
  const fmt=(value,digits=5)=>{const n=Number(value);if(!Number.isFinite(n))return '—';if(Math.abs(n)>=1e4||(Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);return n.toFixed(digits);};

  const defaultWorkspace=(project={})=>Shared.defaultWorkspace(project,S);
  const normalizeWorkspace=(raw,project={})=>Shared.normalizeWorkspace(raw,project,S);

  function parseDatasets(project={}){
    return (project.datasets||[]).flatMap(d=>{
      if(Array.isArray(d.points)&&d.points.length){
        return [{...clone(d),points:d.points.map((p,index)=>({...p,index:Number.isFinite(Number(p.index))?Number(p.index):index}))}];
      }
      if(typeof d.text==='string'&&d.text.trim()&&typeof S.parseCsv==='function'){
        try{return [{...S.parseCsv({name:d.name,path:d.path,text:d.text}),...clone(d)}];}catch{}
      }
      return [];
    });
  }

  async function createTop({host,project:initialProject,setStatus,scheduleSnapshot,copyTextToClipboard,savePlotlyImage,adapter={}}){
      let project=clone(initialProject||{});
      let datasets=[];
      let sweeps=[];
      let workspace={};
      let selectedSweepId='';
      let selectedPeakId='';
      let uiBound=false;
      let currentView='main';
      let spacingResult=[];
      let gateResult=null;
      let sharedController=null;

      function pluginSliceFromProject(p){return Shared.pluginSliceFromProject(p);}
      function sweepById(id){return sweeps.find(sw=>sw.id===id)||null;}
      function peakById(id){return (workspace.peaks||[]).find(p=>p.id===id)||null;}

      function applyWorkspaceToDatasets(){
        const meta=new Map((workspace.datasetMeta||[]).map(row=>[String(row?.path||''),row]));
        for(const d of datasets){
          const row=meta.get(String(d.path||''));
          if(!row)continue;
          if(finite(row.vg))d.vg=Number(row.vg);
          if(row.name)d.name=String(row.name);
        }
      }

      function rebuild(){
        datasets=parseDatasets(project);
        applyWorkspaceToDatasets();
        sweeps=[];
        for(const dataset of datasets){
          try{sweeps.push(...(S.buildSweeps?.(dataset)||[]));}catch(err){console.warn('[resonance window buildSweeps]',dataset?.name,err);}
        }
        if(!sweeps.some(sw=>sw.id===selectedSweepId))selectedSweepId=visibleSweeps()[0]?.id||sweeps[0]?.id||'';
        if(selectedPeakId&&!peakById(selectedPeakId))selectedPeakId='';
      }

      function visibilityMap(){
        const map=new Map((workspace.scanVisibility||[]).map(([path,value])=>[String(path),{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
        for(const d of datasets)if(!map.has(String(d.path)))map.set(String(d.path),{forward:true,reverse:true});
        return map;
      }
      function isVisible(sw){
        if(!sw)return false;
        const row=visibilityMap().get(String(sw.datasetPath))||{forward:true,reverse:true};
        return sw.direction>0?row.forward!==false:row.reverse!==false;
      }
      function visibleSweeps(){return sweeps.filter(isVisible);}
      function visibleSweepIds(){return visibleSweeps().map(sw=>sw.id);}
      function selectedSweep(){return sweeps.find(sw=>sw.id===selectedSweepId)||visibleSweeps()[0]||sweeps[0]||null;}
      function selectedPeak(){return peakById(selectedPeakId);}

      function normalizeCategories(){
        const by=new Map();
        for(const c of workspace.peakCategories||[]){
          const order=Math.max(1,Math.round(Number(c?.order)||1));
          if(!by.has(order))by.set(order,{order,label:String(c?.label||`峰${order}`)});
        }
        for(const p of workspace.peaks||[]){
          const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
          if(!by.has(order))by.set(order,{order,label:String(p.peakLabel||`峰${order}`)});
          p.peakOrder=order;
          p.peakLabel=String(p.peakLabel||by.get(order).label);
          if(p.accepted===undefined)p.accepted=true;
          if(p.manual===undefined)p.manual=false;
          if(p.locked===undefined)p.locked=false;
        }
        workspace.peakCategories=[...by.values()].sort((a,b)=>a.order-b.order);
      }
      function category(order){
        normalizeCategories();
        const n=Math.max(1,Math.round(Number(order)||1));
        return workspace.peakCategories.find(c=>Number(c.order)===n)||{order:n,label:`峰${n}`};
      }
      function peakLabel(p){return String(p?.peakLabel||category(p?.peakOrder||1).label||`峰${p?.peakOrder||1}`);}

      function currentTransform(sw){
        const map=new Map(workspace.transformPreviewByDataset||[]);
        return String(map.get(sw?.datasetPath)||'raw');
      }
      function setTransform(type){
        const sw=selectedSweep();if(!sw)return;
        const map=new Map(workspace.transformPreviewByDataset||[]);
        map.set(sw.datasetPath,String(type||'raw'));
        workspace.transformPreviewByDataset=[...map.entries()];
        render();scheduleSnapshot();
      }

      function setDatasetVg(path,value){
        if(!finite(value))return;
        const next=Number(value);
        const rows=workspace.datasetMeta||[];
        const row=rows.find(x=>String(x.path)===String(path));
        if(row)row.vg=next;else rows.push({path,vg:next});
        for(const d of datasets)if(String(d.path)===String(path))d.vg=next;
        rebuild();
        const vgByPath=new Map(datasets.map(d=>[String(d.path),Number(d.vg)]));
        for(const p of workspace.peaks||[])if(vgByPath.has(String(p.datasetPath)))p.vg=vgByPath.get(String(p.datasetPath));
        render();scheduleSnapshot();
      }

      function setVisibility(path,direction,value){
        const map=visibilityMap();
        const row=map.get(String(path))||{forward:true,reverse:true};
        if(direction>0)row.forward=!!value;else row.reverse=!!value;
        map.set(String(path),row);workspace.scanVisibility=[...map.entries()];
        if(!isVisible(selectedSweep()))selectedSweepId=visibleSweeps()[0]?.id||sweeps[0]?.id||'';
        render();scheduleSnapshot();
      }
      function setAllVisibility(value){
        const map=visibilityMap();
        for(const d of datasets)map.set(String(d.path),{forward:!!value,reverse:!!value});
        workspace.scanVisibility=[...map.entries()];
        if(value&&!selectedSweepId)selectedSweepId=sweeps[0]?.id||'';
        render();scheduleSnapshot();
      }

      function assignDetectedOrders(rows){
        const ordered=rows.slice().sort((a,b)=>Number(a.v)-Number(b.v));
        ordered.forEach((peak,index)=>{const order=index+1,c=category(order);peak.peakOrder=order;peak.peakLabel=c.label;});
        normalizeCategories();
        return ordered;
      }
      function setPreset(name){workspace.algorithms={...(S.preset?.(name)||workspace.algorithms||{}),_preset:String(name||'balanced')};renderControls();scheduleSnapshot();}

      function runDetection(scope='selected'){
        const targets=scope==='all'?visibleSweeps():[selectedSweep()].filter(Boolean);
        if(!targets.length){setStatus('没有可寻峰的可见扫描。');return;}
        const targetIds=new Set(targets.map(sw=>sw.id));
        const preserved=(workspace.peaks||[]).filter(p=>!targetIds.has(p.sweepId)||p.manual||p.locked);
        const added=[];
        for(const sw of targets){
          try{added.push(...assignDetectedOrders(S.detectPeaks(sw,workspace.algorithms||{},{})));}
          catch(err){console.warn('[resonance window detect]',sw.id,err);}
        }
        workspace.peaks=preserved.concat(added);normalizeCategories();selectedPeakId=added[0]?.id||selectedPeakId;
        render();scheduleSnapshot();
        setStatus(`寻峰完成：${targets.length} 条扫描，新增 ${added.length} 个自动峰。`);
      }

      function addManualPeak(v){
        const sw=selectedSweep();if(!sw||!sw.points?.length||!finite(v))return;
        let best=sw.points[0],bestIndex=0,bestDist=Math.abs(Number(best.v)-Number(v));
        sw.points.forEach((p,index)=>{const dist=Math.abs(Number(p.v)-Number(v));if(dist<bestDist){best=p;bestIndex=index;bestDist=dist;}});
        const existing=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id);
        const order=Math.max(1,...existing.map(p=>Number(p.peakOrder)||0))+1;
        const c=category(order);
        const peak={
          id:`${sw.id}::manual::${Date.now()}::${Math.random().toString(36).slice(2,7)}`,
          sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,
          index:bestIndex,v:best.v,i:best.i,accepted:true,manual:true,locked:false,
          algorithms:['manual'],primaryAlgorithm:'manual',score:1,confidence:1,
          widthLeft:best.v,widthRight:best.v,fwhm:0,peakOrder:order,peakLabel:c.label,customColor:null
        };
        workspace.peaks.push(peak);normalizeCategories();selectedPeakId=peak.id;
        render();scheduleSnapshot();setStatus(`已在 Vd=${Number(best.v).toPrecision(6)} V 添加手动峰。`);
      }

      function updatePeak(id,patch){
        const peak=peakById(id);if(!peak)return;
        Object.assign(peak,patch||{});normalizeCategories();render();scheduleSnapshot();
      }
      function deletePeak(id){
        workspace.peaks=(workspace.peaks||[]).filter(p=>p.id!==id);
        if(selectedPeakId===id)selectedPeakId='';
        render();scheduleSnapshot();
      }
      function renameSelectedCategory(label){
        const p=selectedPeak();if(!p)return;
        const next=String(label||'').trim();if(!next)return;
        const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
        const c=workspace.peakCategories.find(row=>Number(row.order)===order)||{order,label:next};
        if(!workspace.peakCategories.includes(c))workspace.peakCategories.push(c);
        c.label=next;
        for(const peak of workspace.peaks||[])if(Number(peak.peakOrder)===order)peak.peakLabel=next;
        normalizeCategories();render();scheduleSnapshot();
      }

      function sortPeakOrderByVd(){
        const rows=visibleSweeps().map(sw=>({sw,peaks:(workspace.peaks||[]).filter(p=>p.sweepId===sw.id&&p.accepted!==false).sort((a,b)=>a.v-b.v)})).filter(r=>r.peaks.length);
        if(!rows.length)return;
        try{
          const solved=S.solvePeakTracks?.(rows,{requestedSweep:selectedSweep()});
          if(solved?.assignments){
            for(const row of rows){
              const tracks=solved.assignments.get(row.sw.id);if(!tracks)continue;
              row.peaks.forEach((p,j)=>{const k=tracks[j];if(k===undefined)return;const order=k+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
            }
          }else{
            for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
          }
        }catch{
          for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
        }
        normalizeCategories();render();scheduleSnapshot();setStatus('已按跨 Vg 峰轨迹重新整理峰序。');
      }

      function datasetRowsHtml(){
        const vis=visibilityMap();
        return datasets.map(d=>{
          const row=vis.get(String(d.path))||{forward:true,reverse:true};
          return `<div class="reswin-dataset" data-dataset-path="${esc(d.path)}"><div class="reswin-dataset-title" title="${esc(d.path)}">${esc(d.name||d.path||'数据')}</div><label>Vg <input class="reswin-vg" type="number" step="any" value="${finite(d.vg)?Number(d.vg):0}"></label><label class="reswin-check"><input class="reswin-forward" type="checkbox" ${row.forward!==false?'checked':''}>正扫</label><label class="reswin-check"><input class="reswin-reverse" type="checkbox" ${row.reverse!==false?'checked':''}>反扫</label></div>`;
        }).join('')||'<div class="empty-state">工程中没有数据。</div>';
      }

      function renderControls(){
        const list=$('#reswinDatasetList');if(list){
          list.innerHTML=datasetRowsHtml();
          list.querySelectorAll('.reswin-dataset').forEach(row=>{
            const path=row.dataset.datasetPath;
            row.querySelector('.reswin-vg')?.addEventListener('change',e=>setDatasetVg(path,e.target.value));
            row.querySelector('.reswin-forward')?.addEventListener('change',e=>setVisibility(path,1,e.target.checked));
            row.querySelector('.reswin-reverse')?.addEventListener('change',e=>setVisibility(path,-1,e.target.checked));
          });
        }
        for(const id of ['reswinSweepSelect','reswinInspectSweepSelect']){
          const sweep=$("#"+id);if(!sweep)continue;
          const rows=visibleSweeps().length?visibleSweeps():sweeps;
          sweep.innerHTML=rows.map(sw=>`<option value="${esc(sw.id)}">${esc(sw.datasetName)} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}</option>`).join('');
          if(rows.some(sw=>sw.id===selectedSweepId))sweep.value=selectedSweepId;
        }
        const preset=$('#reswinPreset');if(preset)preset.value=workspace.algorithms?._preset||'balanced';
        const transform=$('#reswinTransform');if(transform)transform.value=currentTransform(selectedSweep());
      }

      function plotTraces(){
        const selected=selectedSweep(),traces=[];
        for(const sw of visibleSweeps()){
          const isSelected=sw.id===selected?.id;
          const transformed=S.transformSweep?.(sw,currentTransform(sw))||{points:sw.points.map(p=>({v:p.v,y:p.i})),label:'I',unit:'A'};
          traces.push({x:transformed.points.map(p=>p.v),y:transformed.points.map(p=>p.y),mode:'lines',name:`${sw.datasetName} · ${directionName(sw.direction)}`,line:{width:isSelected?2.6:1.1},opacity:isSelected?1:.28,hovertemplate:'Vd=%{x:.6g}<br>值=%{y:.6g}<extra></extra>'});
        }
        const visIds=new Set(visibleSweepIds());
        const peaks=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visIds.has(p.sweepId));
        if(peaks.length)traces.push({x:peaks.map(p=>p.v),y:peaks.map(p=>p.i),mode:'markers',name:'峰位',marker:{size:9,symbol:peaks.map(p=>p.manual?'diamond':'circle'),line:{width:1}},customdata:peaks.map(p=>[p.id,peakLabel(p),p.vg,directionName(p.direction)]),hovertemplate:'%{customdata[1]}<br>Vg=%{customdata[2]}<br>%{customdata[3]}<br>Vd=%{x:.6g}<extra></extra>'});
        return traces;
      }

      function bindMainPlot(){
        const plot=$('#reswinMainPlot');if(!plot||typeof plot.on!=='function')return;
        try{plot.removeAllListeners?.('plotly_click');}catch{}
        plot.on('plotly_click',event=>{
          const point=event?.points?.[0];const peakId=point?.customdata?.[0];
          if(peakId){selectedPeakId=String(peakId);renderInspection();return;}
          if(event?.event?.shiftKey&&finite(point?.x))addManualPeak(point.x);
        });
      }

      function renderMainPlot(){
        const plot=$('#reswinMainPlot');if(!plot||!window.Plotly)return;
        const sw=selectedSweep();const transform=currentTransform(sw);const label=sw?(S.transformSweep?.(sw,transform)?.label||'I–V'):'I–V';
        Plotly.react(plot,plotTraces(),{margin:{l:72,r:22,t:46,b:58},title:{text:sw?`${sw.datasetName} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}`:'共振 I–V',font:{size:14}},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5',automargin:true},yaxis:{title:label,gridcolor:'#edf0f5',automargin:true},hovermode:'closest',dragmode:'zoom',showlegend:true,legend:{orientation:'h',y:-.19},autosize:true},{responsive:true,scrollZoom:true,displaylogo:false,toImageButtonOptions:{format:'png',filename:'resonance_iv',scale:2}}).then(bindMainPlot).catch(()=>{});
      }

      function groupSeries(){
        if(!sharedController)return [];
        return sharedController.buildTrendModel().series.map(sr=>({...sr,peaks:sr.points.map(row=>row._peak).filter(Boolean)}));
      }

      function renderTrend(){
        const plot=$('#reswinTrendPlot');if(!plot||!window.Plotly)return;
        const traces=groupSeries().map(sr=>({x:sr.peaks.map(p=>p.vg),y:sr.peaks.map(p=>p.v),mode:'lines+markers',name:sr.name,customdata:sr.peaks.map(p=>[p.id]),hovertemplate:'Vg=%{x}<br>Vpk=%{y:.6g} V<extra></extra>'}));
        Plotly.react(plot,traces,{margin:{l:62,r:20,t:36,b:50},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'Vpk (V)',gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.2},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});
      }

      function peakMetrics(p){const sw=sweepById(p?.sweepId);return sw&&p?S.peakMetrics?.(p,sw):null;}
      function renderPeakTable(){
        const table=$('#reswinPeakTable');if(!table)return;
        const sw=selectedSweep();const rows=(workspace.peaks||[]).filter(p=>!sw||p.sweepId===sw.id).sort((a,b)=>Number(a.v)-Number(b.v));
        table.innerHTML=`<thead><tr><th>类别</th><th>Vpk (V)</th><th>I (A)</th><th>来源</th><th>采纳</th><th>锁定</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr data-peak-id="${esc(p.id)}" class="${p.id===selectedPeakId?'selected':''}"><td>${esc(peakLabel(p))}</td><td>${fmt(p.v,6)}</td><td>${fmt(p.i,6)}</td><td>${p.manual?'手动':'自动'}</td><td><input data-action="accept" type="checkbox" ${p.accepted!==false?'checked':''}></td><td><input data-action="lock" type="checkbox" ${p.locked?'checked':''}></td><td><button data-action="delete" class="danger-soft">删除</button></td></tr>`).join('')}</tbody>`;
        table.querySelectorAll('tbody tr').forEach(row=>{
          const id=row.dataset.peakId;
          row.onclick=e=>{if(e.target.closest('button,input'))return;selectedPeakId=id;renderInspection();};
          row.querySelector('[data-action="accept"]')?.addEventListener('change',e=>updatePeak(id,{accepted:e.target.checked}));
          row.querySelector('[data-action="lock"]')?.addEventListener('change',e=>updatePeak(id,{locked:e.target.checked}));
          row.querySelector('[data-action="delete"]')?.addEventListener('click',()=>deletePeak(id));
        });
      }

      function renderInspection(){
        const sw=selectedSweep(),p=selectedPeak(),summary=$('#reswinInspectorSummary');
        if(summary){
          if(p){
            const m=peakMetrics(p)||{};
            summary.innerHTML=`<b>文件</b><span>${esc(sw?.datasetName||'—')}</span><b>扫描</b><span>${directionName(p.direction)} · Vg=${fmt(p.vg,4)} V</span><b>类别</b><span>${esc(peakLabel(p))}</span><b>Vpk</b><span>${fmt(p.v,7)} V</span><b>Ipk</b><span>${fmt(p.i,6)} A</span><b>FWHM</b><span>${fmt(m.fwhm,7)} V</span><b>峰高</b><span>${fmt(m.amplitude,6)} A</span><b>面积</b><span>${fmt(m.area,6)} A·V</span><b>Prominence</b><span>${fmt(p.prominence,6)}</span><b>状态</b><span>${p.accepted!==false?'采纳':'未采纳'}${p.locked?' · 已锁定':''}${p.manual?' · 手动':''}</span>`;
          }else if(sw){summary.innerHTML=`<b>文件</b><span>${esc(sw.datasetName)}</span><b>Vg</b><span>${fmt(sw.vg,4)} V</span><b>扫描</b><span>${directionName(sw.direction)}</span><b>范围</b><span>${fmt(sw.points?.[0]?.v,4)} ~ ${fmt(sw.points?.at(-1)?.v,4)} V</span><b>数据点</b><span>${sw.points?.length||0}</span><b>峰</b><span>${(workspace.peaks||[]).filter(q=>q.sweepId===sw.id).length}</span>`;}
          else summary.innerHTML='<span class="empty-state">没有可检查的数据。</span>';
        }
        const labelInput=$('#reswinPeakLabelInput');if(labelInput){labelInput.value=p?peakLabel(p):'';labelInput.disabled=!p;}
        const del=$('#reswinDeletePeak');if(del)del.disabled=!p;
        renderPeakTable();
        const plot=$('#reswinInspectPlot');if(plot&&window.Plotly){
          if(!sw){Plotly.purge(plot);plot.innerHTML='<div class="empty-state">请选择扫描。</div>';return;}
          const t=S.transformSweep?.(sw,currentTransform(sw))||{points:sw.points.map(q=>({v:q.v,y:q.i})),label:'I',unit:'A'};
          const traces=[{x:t.points.map(q=>q.v),y:t.points.map(q=>q.y),mode:'lines',name:t.label,line:{width:1.8}}];
          const peaks=(workspace.peaks||[]).filter(q=>q.sweepId===sw.id&&q.accepted!==false);
          if(peaks.length){
            const xs=t.points.map(q=>q.v);
            const ys=peaks.map(q=>t.points[S.nearestIndex(xs,q.v)]?.y);
            traces.push({x:peaks.map(q=>q.v),y:ys,mode:'markers',name:'原始峰位投影',marker:{size:9,symbol:peaks.map(q=>q.manual?'diamond':'circle-open')},customdata:peaks.map(q=>[q.id]),hovertemplate:'Vpk=%{x:.6g} V<extra></extra>'});
          }
          Plotly.react(plot,traces,{margin:{l:68,r:20,t:28,b:54},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},yaxis:{title:t.label||'',gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false}).then(()=>{
            try{plot.removeAllListeners?.('plotly_click');}catch{}
            plot.on?.('plotly_click',e=>{const id=e?.points?.[0]?.customdata?.[0];if(id){selectedPeakId=String(id);renderInspection();}});
          }).catch(()=>{});
        }
      }

      function groupMetricRows(metric){
        const series=groupSeries();
        return series.map(sr=>({
          ...sr,
          rows:sr.peaks.map(p=>{const m=peakMetrics(p)||{};return {p,value:metric==='v'?p.v:metric==='i'?p.i:metric==='prominence'?Number(p.prominence):Number(m[metric])};}).filter(r=>Number.isFinite(r.value))
        })).filter(sr=>sr.rows.length);
      }
      function groupCsv(title,series){
        const rows=['series,label,direction,Vg,value'];
        for(const sr of series)for(const r of sr.rows)rows.push([sr.name,sr.label,directionName(sr.direction),r.p.vg,r.value].map(csvCell).join(','));
        return rows.join('\n');
      }
      function renderGroup(){
        const hostEl=$('#reswinGroupGrid');if(!hostEl||!window.Plotly)return;
        const defs=[['v','峰位 Vpk','V'],['i','峰电流 Ipk','A'],['fwhm','FWHM','V'],['amplitude','峰高 A','A'],['area','峰面积 S','A·V'],['prominence','Prominence','A']];
        const labels=[...new Set((workspace.peaks||[]).filter(p=>p.accepted!==false).map(peakLabel))];
        const terSeries=labels.map(label=>({label,points:S.computeResonantTerForLabel?.(workspace.peaks,sweeps,label,visibleSweepIds())||[]})).filter(x=>x.points.length);
        hostEl.innerHTML='';
        const count=defs.length+(terSeries.length?1:0);
        let cols=workspace.groupColumns==='auto'?Math.max(1,Math.min(4,Math.floor((hostEl.clientWidth||1000)/330))):Number(workspace.groupColumns)||2;
        cols=Math.min(Math.max(1,cols),Math.max(1,count));
        hostEl.style.setProperty('--reswin-group-cols',String(cols));
        const cardWidth=Math.max(220,((hostEl.clientWidth||1000)-12*(cols-1))/cols);
        hostEl.style.setProperty('--reswin-group-height',`${Math.max(230,Math.min(360,Math.round(cardWidth*.62)))}px`);
        $$('[data-reswin-cols]').forEach(b=>b.classList.toggle('active',String(b.dataset.reswinCols)===String(workspace.groupColumns)));
        for(const [metric,title,unit] of defs){
          const series=groupMetricRows(metric);
          const card=document.createElement('div');card.className='reswin-group-card';
          card.innerHTML=`<div class="reswin-group-head"><span>${esc(title)}</span><span><button type="button" data-csv>CSV</button><button type="button" data-copy>复制</button></span></div><div class="reswin-group-plot"></div>`;
          hostEl.appendChild(card);
          const plot=card.querySelector('.reswin-group-plot');
          const traces=series.map(sr=>({x:sr.rows.map(r=>r.p.vg),y:sr.rows.map(r=>r.value),mode:'lines+markers',name:sr.name,customdata:sr.rows.map(r=>[r.p.id]),hovertemplate:`Vg=%{x}<br>${title}=%{y}<extra>%{fullData.name}</extra>`}));
          Plotly.newPlot(plot,traces,{margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:unit,gridcolor:'#edf0f5'},showlegend:false,autosize:true},{responsive:true,displayModeBar:false}).then(()=>{plot.on?.('plotly_click',e=>{const id=e?.points?.[0]?.customdata?.[0];if(id){selectedPeakId=String(id);const p=peakById(id);if(p)selectedSweepId=p.sweepId;setView('inspect');}});}).catch(()=>{});
          const csv=()=>groupCsv(title,series);
          card.querySelector('[data-csv]').onclick=()=>window.electronAPI?.saveText?.({defaultName:`resonance_${metric}.csv`,content:csv(),filters:[{name:'CSV',extensions:['csv']}]});
          card.querySelector('[data-copy]').onclick=()=>copyTextToClipboard(csv(),`${title} CSV`);
        }
        if(terSeries.length){
          const card=document.createElement('div');card.className='reswin-group-card';card.innerHTML='<div class="reswin-group-head"><span>共振 TER</span></div><div class="reswin-group-plot"></div>';hostEl.appendChild(card);
          const traces=terSeries.map(sr=>({x:sr.points.map(p=>p.vg),y:sr.points.map(p=>p.ter),mode:'lines+markers',name:sr.label,hovertemplate:'Vg=%{x}<br>TER=%{y:.4g}%<extra>%{fullData.name}</extra>'}));
          Plotly.newPlot(card.querySelector('.reswin-group-plot'),traces,{margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'TER (%)',gridcolor:'#edf0f5'},showlegend:false,autosize:true},{responsive:true,displayModeBar:false}).catch(()=>{});
        }
      }

      function physicalAnalysis(){
        try{return S.analyzePhysicalFamilies?.({peaks:workspace.peaks||[],sweepById,peakMetrics:S.peakMetrics,labelForOrder:o=>category(o).label})||{families:[],modelCode:'M0',modelTitle:'数据不足',modelText:'当前稳定峰轨迹不足。',v0Delta:null};}
        catch(err){console.warn('[resonance physical analysis]',err);return {families:[],modelCode:'M0',modelTitle:'计算失败',modelText:err.message||String(err),v0Delta:null};}
      }
      function renderPhysics(){
        const r=physicalAnalysis();
        const summary=$('#reswinPhysicsSummary');if(summary)summary.innerHTML=[`模型 ${r.modelCode||'—'}`,`峰族 ${r.families?.length||0}`,`稳定双向 ${(r.families||[]).filter(f=>f.bothStable).length}`].map(t=>`<div>${esc(t)}</div>`).join('');
        const model=$('#reswinPhysicsModel');if(model)model.innerHTML=`<strong>${esc(r.modelTitle||'')}</strong><p>${esc(r.modelText||'')}</p><p>该判断来自当前已采纳峰轨迹的稳定性、正反扫差异与峰宽尺度；它是模型筛选依据，不等同于对微观机制的唯一证明。</p>`;
        const table=$('#reswinPhysicsTable');if(table)table.innerHTML=`<thead><tr><th>峰族</th><th>类型</th><th>正扫点</th><th>反扫点</th><th>共同 Vg</th><th>中位 |ΔV|</th><th>中位峰宽</th></tr></thead><tbody>${(r.families||[]).map(f=>`<tr><td>${esc(f.label||`峰${f.order}`)}</td><td>${esc(f.type||f.code||'')}</td><td>${f.forwardCount||0}</td><td>${f.reverseCount||0}</td><td>${f.commonCount||0}</td><td>${fmt(f.medianDelta,5)}</td><td>${fmt(f.medianWidth,5)}</td></tr>`).join('')}</tbody>`;
        const plot=$('#reswinPhysicsPlot');if(plot&&window.Plotly){
          const rows=Array.isArray(r.v0Delta)?r.v0Delta:[];
          const traces=rows.length?[{x:rows.map(x=>x.vg),y:rows.map(x=>x.V0),mode:'lines+markers',name:'V0'},{x:rows.map(x=>x.vg),y:rows.map(x=>x.delta),mode:'lines+markers',name:'|δ|',yaxis:'y2'}]:[];
          Plotly.react(plot,traces,{margin:{l:64,r:66,t:26,b:54},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'V0 (V)',gridcolor:'#edf0f5'},yaxis2:{title:'|δ| (V)',overlaying:'y',side:'right',showgrid:false},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});
        }
      }

      function acceptedSeriesOptions(){return sharedController?.acceptedSeriesOptions?.()||[];}
      function chooseRepresentativePeak(list){return list.slice().sort((a,b)=>Number(b.locked)-Number(a.locked)||Number(b.manual)-Number(a.manual)||(Number(b.score)||0)-(Number(a.score)||0))[0]||null;}
      function computeSpacingResult(keyA,keyB){return sharedController?.computeSpacingRows?.(keyA,keyB)||[];}
      function populateSpacing(){
        const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=workspace.spacingSettings||{};
        if(!valid.has(s.seriesA))s.seriesA=opts[0]?.key||'';
        if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=opts.find(o=>o.key!==s.seriesA)?.key||s.seriesA||'';
        workspace.spacingSettings=s;
        const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
        const a=$('#reswinSpacingA'),b=$('#reswinSpacingB');if(a){a.innerHTML=markup;a.value=s.seriesA;}if(b){b.innerHTML=markup;b.value=s.seriesB;}
        const mode=$('#reswinSpacingMode');if(mode)mode.value=s.mode||'abs';
      }
      function renderSpacing(){
        populateSpacing();const s=workspace.spacingSettings;spacingResult=computeSpacingResult(s.seriesA,s.seriesB);
        const plot=$('#reswinSpacingPlot');if(plot&&window.Plotly){const key=s.mode==='signed'?'deltaV':'spacing';Plotly.react(plot,[{x:spacingResult.map(d=>d.vg),y:spacingResult.map(d=>d[key]),mode:'lines+markers',name:'峰间距',customdata:spacingResult.map(d=>[d.vA,d.vB])}],{margin:{l:68,r:20,t:28,b:56},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:s.mode==='signed'?'VB − VA (V)':'|VB − VA| (V)',gridcolor:'#edf0f5'},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});}
        const table=$('#reswinSpacingTable');if(table)table.innerHTML=`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>VB−VA</th><th>|ΔV|</th></tr></thead><tbody>${spacingResult.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.deltaV,6)}</td><td>${fmt(d.spacing,6)}</td></tr>`).join('')}</tbody>`;
      }
      function spacingCsv(){const rows=['Vg_V,series_A,V_A_V,series_B,V_B_V,delta_V_B_minus_A_V,absolute_spacing_V'];for(const d of spacingResult)rows.push([d.vg,csvCell(d.labelA),d.vA,csvCell(d.labelB),d.vB,d.deltaV,d.spacing].join(','));return rows.join('\n');}

      function gateSeriesRows(key){
        const [dirS,label]=String(key||'').split('::'),direction=Number(dirS);if(!label||!Number.isFinite(direction))return [];
        const grouped=new Map();
        for(const p of (workspace.peaks||[]).filter(p=>p.accepted!==false&&p.direction===direction&&peakLabel(p)===label)){if(!grouped.has(String(p.vg)))grouped.set(String(p.vg),[]);grouped.get(String(p.vg)).push(p);}
        const rows=[];
        for(const list of grouped.values()){const p=chooseRepresentativePeak(list),sw=sweepById(p?.sweepId);if(!p||!sw)continue;const m=S.peakMetrics(p,sw);rows.push({vg:p.vg,peak:p,v:p.v,i:p.i,fwhm:m.fwhm,hwhm:m.fwhm/2,amplitude:m.amplitude,baseline:m.baseline,area:m.area,prominence:Number(p.prominence),peakToBg:m.baseline>0?Math.abs(p.i)/m.baseline:NaN});}
        return rows.sort((a,b)=>a.vg-b.vg);
      }
      function gateHysteresisRows(label){
        if(!label)return [];const up=gateSeriesRows(`1::${label}`),down=gateSeriesRows(`-1::${label}`),u=new Map(up.map(r=>[String(r.vg),r])),d=new Map(down.map(r=>[String(r.vg),r]));
        return [...u.keys()].filter(k=>d.has(k)).map(k=>{const a=u.get(k),b=d.get(k);return {vg:a.vg,forwardV:a.v,reverseV:b.v,deltaVR:a.v-b.v,absDeltaVR:Math.abs(a.v-b.v)};}).sort((a,b)=>a.vg-b.vg);
      }
      function gateLabels(){const labels=[...new Set((workspace.peaks||[]).filter(p=>p.accepted!==false).map(peakLabel))];return labels.filter(label=>{const ps=(workspace.peaks||[]).filter(p=>p.accepted!==false&&peakLabel(p)===label);return ps.some(p=>p.direction>0)&&ps.some(p=>p.direction<0);});}
      function populateGate(){
        const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=workspace.gateAnalysisSettings||{};
        const defaultA=opts[0]?.key||'',defaultB=opts.find(o=>o.key!==defaultA)?.key||defaultA;
        if(!valid.has(s.seriesA))s.seriesA=defaultA;if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=defaultB;
        const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
        for(const [id,value] of [['reswinGateA',s.seriesA],['reswinGateB',s.seriesB]]){const el=$('#'+id);if(el){el.innerHTML=markup;el.value=value||'';}}
        const labels=gateLabels();if(!labels.includes(s.hysteresisLabel))s.hysteresisLabel=labels[0]||'';
        const hys=$('#reswinGateHysteresis');if(hys){hys.innerHTML=labels.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join('');hys.value=s.hysteresisLabel||'';}
        const width=$('#reswinGateWidth');if(width)width.value=s.widthMode||'hwhm';
        const use=$('#reswinGateUseDensity');if(use)use.checked=!!s.useCarrierDensity;
        const cg=$('#reswinGateCg');if(cg)cg.value=finite(s.cg)?s.cg:'';
        const cnp=$('#reswinGateCnp');if(cnp)cnp.value=finite(s.cnp)?s.cnp:0;
        workspace.gateAnalysisSettings=s;
      }
      function readGate(){
        const num=id=>{const raw=$('#'+id)?.value?.trim?.()??'';if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null;};
        workspace.gateAnalysisSettings={seriesA:$('#reswinGateA')?.value||'',seriesB:$('#reswinGateB')?.value||'',hysteresisLabel:$('#reswinGateHysteresis')?.value||'',widthMode:$('#reswinGateWidth')?.value||'hwhm',useCarrierDensity:!!$('#reswinGateUseDensity')?.checked,cg:num('reswinGateCg'),cnp:num('reswinGateCnp')??0};
      }
      function gateOption(key){return acceptedSeriesOptions().find(o=>o.key===key)||null;}
      function computeGate(){
        readGate();const s=workspace.gateAnalysisSettings,Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);
        let terResult=null;try{terResult=S.computeTerMatrix?.(datasets,project.terMaxSettings||{})||null;}catch{}
        const rows=S.pairGateSeries?.(Arows,Brows,terResult?.terMaxByVg||[],s)||[];
        const hysteresis=gateHysteresisRows(s.hysteresisLabel);const summary=S.summarizeGateRows?.(rows,hysteresis)||{fits:{},correlations:{}};
        gateResult={settings:{...s},seriesA:gateOption(s.seriesA),seriesB:gateOption(s.seriesB),Arows,Brows,rows,hysteresis,terResult,fits:summary.fits||{},correlations:summary.correlations||{}};return gateResult;
      }
      function gateBase(x,y){return {margin:{l:66,r:26,t:20,b:52},xaxis:{title:x,gridcolor:'#edf0f5'},yaxis:{title:y,gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.2},autosize:true};}
      function renderGate(){
        populateGate();const r=computeGate(),rows=r.rows||[],a=r.seriesA?.name||'ridge A',b=r.seriesB?.name||'ridge B';
        const summary=$('#reswinGateSummary');if(summary)summary.innerHTML=[`共同 Vg ${rows.length}`,`A ${a}`,`B ${b}`,`TER ${r.terResult?'可用':'不可用'}`].map(t=>`<span>${esc(t)}</span>`).join('');
        const plots={
          reswinGateRidges:{traces:[{x:r.Arows.map(d=>d.vg),y:r.Arows.map(d=>d.v),mode:'lines+markers',name:a},{x:r.Brows.map(d=>d.vg),y:r.Brows.map(d=>d.v),mode:'lines+markers',name:b}],layout:gateBase('Vg (V)','V_R (V)')},
          reswinGateV0:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.V0),mode:'lines+markers',name:'V0'}],layout:gateBase('Vg (V)','V0 (V)')},
          reswinGateDelta:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.delta),mode:'lines+markers',name:'δ'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.absDelta),mode:'lines+markers',name:'|δ|',line:{dash:'dot'}}],layout:gateBase('Vg (V)','δ (V)')},
          reswinGateWidthPlot:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d[(r.settings.widthMode||'hwhm')+'A']),mode:'lines+markers',name:'宽度 A'},{x:rows.map(d=>d.vg),y:rows.map(d=>d[(r.settings.widthMode||'hwhm')+'B']),mode:'lines+markers',name:'宽度 B'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.deltaOverW),mode:'lines+markers',name:'|δ|/w',yaxis:'y2'}],layout:{...gateBase('Vg (V)',r.settings.widthMode==='fwhm'?'FWHM (V)':'HWHM (V)'),yaxis2:{title:'|δ|/w',overlaying:'y',side:'right',showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
          reswinGateTer:{traces:[{x:rows.filter(d=>Number.isFinite(d.terMax)).map(d=>d.vg),y:rows.filter(d=>Number.isFinite(d.terMax)).map(d=>d.terMax),mode:'lines+markers',name:'TERmax'}],layout:gateBase('Vg (V)','TERmax (%)')},
          reswinGateVStar:{traces:[{x:rows.filter(d=>Number.isFinite(d.vStar)).map(d=>d.vg),y:rows.filter(d=>Number.isFinite(d.vStar)).map(d=>d.vStar),mode:'lines+markers',name:'Vd*'}],layout:gateBase('Vg (V)','Vd* (V)')},
          reswinGateHysteresisPlot:{traces:[{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.forwardV),mode:'lines+markers',name:'正扫'},{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.reverseV),mode:'lines+markers',name:'反扫'},{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.absDeltaVR),mode:'lines+markers',name:'|ΔV_R|',yaxis:'y2'}],layout:{...gateBase('Vg (V)','V_R (V)'),yaxis2:{title:'|ΔV_R| (V)',overlaying:'y',side:'right',showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
          reswinGateAmplitude:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeA),mode:'lines+markers',name:'A_A'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeB),mode:'lines+markers',name:'A_B'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.etaEff),mode:'lines+markers',name:'η_eff',yaxis:'y2'}],layout:{...gateBase('Vg (V)','峰高 (A)'),yaxis2:{title:'η_eff',overlaying:'y',side:'right',range:[0,1],showgrid:false},margin:{l:66,r:64,t:20,b:52}}}
        };
        for(const [id,spec] of Object.entries(plots)){const el=$('#'+id);if(el)Plotly.react(el,spec.traces,spec.layout,{responsive:true,displaylogo:false}).catch(()=>{});}
        const report=$('#reswinGateReport');if(report){const f=r.fits||{},c=r.correlations||{};report.innerHTML=`<strong>栅压物理分析摘要</strong><p>V0 表示两条所选共振 ridge 的共模位置；δ=(VB−VA)/2 表示有效分裂。用于可分辨度比较时使用 |δ|/w。</p><p>dV0/dVg=${fmt(f.V0?.slope,6)}，R²=${fmt(f.V0?.r2,4)}；d|δ|/dVg=${fmt(f.deltaAbs?.slope,6)}；r[TERmax, |δ|/w]=${fmt(c.terVsDeltaOverW,4)}；r[Vd*, V0]=${fmt(c.vStarVsV0,4)}。</p><p>这些相关量用于检验机制假设，不把 η_eff 直接解释为畴面积，也不把正反扫峰位差直接等同于 coercive voltage。</p>`;}
        const table=$('#reswinGateTable');if(table)table.innerHTML=`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>V0</th><th>δ</th><th>|δ|/w</th><th>TERmax</th><th>Vd*</th><th>η_eff</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.V0,6)}</td><td>${fmt(d.delta,6)}</td><td>${fmt(d.deltaOverW,5)}</td><td>${fmt(d.terMax,4)}</td><td>${fmt(d.vStar,6)}</td><td>${fmt(d.etaEff,4)}</td></tr>`).join('')}</tbody>`;
      }
      function gateCsv(){const rows=['Vg,V_A,V_B,V0,delta,abs_delta,delta_over_w,TER_max,Vd_star,eta_eff'];for(const d of gateResult?.rows||[])rows.push([d.vg,d.vA,d.vB,d.V0,d.delta,d.absDelta,d.deltaOverW,d.terMax,d.vStar,d.etaEff].join(','));return rows.join('\n');}
      function gateReportText(){const r=gateResult||computeGate(),f=r.fits||{},c=r.correlations||{};return ['# 栅压物理分析报告','',`ridge A: ${r.seriesA?.name||'—'}`,`ridge B: ${r.seriesB?.name||'—'}`,`共同 Vg 点: ${r.rows?.length||0}`,'',`dV0/dVg = ${fmt(f.V0?.slope,7)} V/V`,`R²(V0) = ${fmt(f.V0?.r2,4)}`,`d|δ|/dVg = ${fmt(f.deltaAbs?.slope,7)} V/V`,`Pearson r[TERmax, |δ|/w] = ${fmt(c.terVsDeltaOverW,4)}`,`Pearson r[Vd*, V0] = ${fmt(c.vStarVsV0,4)}`,'','解释边界：V0 是共模轨迹位置；δ 是有效共振分裂；η_eff 是有效电学权重；正反扫峰位差不自动等同于 coercive voltage。'].join('\n');}

      function renderSummary(){const el=$('#reswinSummary');if(el)el.innerHTML=`<span>数据 ${datasets.length}</span><span>扫描 ${sweeps.length}</span><span>可见 ${visibleSweeps().length}</span><span>峰 ${(workspace.peaks||[]).length}</span><span>手动 ${(workspace.peaks||[]).filter(p=>p.manual).length}</span>`;}
      function renderMain(){renderControls();renderSummary();renderMainPlot();renderTrend();}
      function renderView(){
        currentView=workspace.activeView||currentView||'main';
        $$('.reswin-view').forEach(el=>el.classList.toggle('active',el.dataset.reswinViewPanel===currentView));
        $$('[data-reswin-view]').forEach(el=>el.classList.toggle('active',el.dataset.reswinView===currentView));
        if(currentView==='main')renderMain();
        else if(currentView==='inspect'){renderControls();renderInspection();}
        else if(currentView==='group')renderGroup();
        else if(currentView==='physics')renderPhysics();
        else if(currentView==='spacing')renderSpacing();
        else if(currentView==='gate')renderGate();
      }
      function setView(view){if(!['main','inspect','group','physics','spacing','gate'].includes(String(view)))return;workspace.activeView=String(view);currentView=workspace.activeView;renderView();scheduleSnapshot();}
      function render(){normalizeCategories();renderView();}
      function resize(){requestAnimationFrame(()=>{$$('.analysis-chart,.reswin-group-plot').filter(el=>el.offsetParent!==null).forEach(el=>{try{Plotly.Plots.resize(el);}catch{}});if(currentView==='group')renderGroup();});}

      function peaksCsv(){const rows=['dataset,vg,direction,peak_order,peak_label,vpk,i,accepted,manual,locked'];for(const p of workspace.peaks||[])rows.push([p.datasetPath,p.vg,directionName(p.direction),p.peakOrder,peakLabel(p),p.v,p.i,p.accepted!==false,p.manual===true,p.locked===true].map(csvCell).join(','));return rows.join('\n');}
      function mainCsv(){const sw=selectedSweep();if(!sw)return '';return ['Vd,I',...(sw.points||[]).map(p=>`${p.v},${p.i}`)].join('\n');}

      function bindUi(page){
        if(uiBound||!page)return;uiBound=true;
        page.querySelectorAll('[data-reswin-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.reswinView));
        page.querySelector('#reswinSweepSelect').onchange=e=>{selectedSweepId=e.target.value;selectedPeakId='';render();};
        page.querySelector('#reswinInspectSweepSelect').onchange=e=>{selectedSweepId=e.target.value;selectedPeakId='';renderInspection();renderPeakTable();};
        page.querySelector('#reswinTransform').onchange=e=>setTransform(e.target.value);
        page.querySelector('#reswinPreset').onchange=e=>setPreset(e.target.value);
        page.querySelector('#reswinDetectSelected').onclick=()=>runDetection('selected');
        page.querySelector('#reswinDetectAll').onclick=()=>runDetection('all');
        page.querySelector('#reswinSortPeaks').onclick=sortPeakOrderByVd;
        page.querySelector('#reswinShowAll').onclick=()=>setAllVisibility(true);
        page.querySelector('#reswinHideAll').onclick=()=>setAllVisibility(false);
        page.querySelector('#reswinExportMainCsv').onclick=()=>window.electronAPI?.saveText?.({defaultName:'resonance_iv.csv',content:mainCsv(),filters:[{name:'CSV',extensions:['csv']}]});
        page.querySelector('#reswinExportMainSvg').onclick=()=>savePlotlyImage('reswinMainPlot','resonance_iv','svg');
        page.querySelector('#reswinExportMainPng').onclick=()=>savePlotlyImage('reswinMainPlot','resonance_iv','png');
        page.querySelector('#reswinExportPeaks').onclick=()=>window.electronAPI?.saveText?.({defaultName:'resonance_peaks.csv',content:peaksCsv(),filters:[{name:'CSV',extensions:['csv']}]});
        page.querySelector('#reswinCopyPeaks').onclick=()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV');
        page.querySelector('#reswinApplyPeakLabel').onclick=()=>renameSelectedCategory(page.querySelector('#reswinPeakLabelInput').value);
        page.querySelector('#reswinDeletePeak').onclick=()=>{const p=selectedPeak();if(p)deletePeak(p.id);};
        page.querySelectorAll('[data-reswin-cols]').forEach(btn=>btn.onclick=()=>{workspace.groupColumns=btn.dataset.reswinCols;renderGroup();scheduleSnapshot();});
        for(const id of ['reswinSpacingA','reswinSpacingB','reswinSpacingMode'])page.querySelector('#'+id).onchange=()=>{workspace.spacingSettings={seriesA:$('#reswinSpacingA').value,seriesB:$('#reswinSpacingB').value,mode:$('#reswinSpacingMode').value};renderSpacing();scheduleSnapshot();};
        page.querySelector('#reswinSpacingExport').onclick=()=>window.electronAPI?.saveText?.({defaultName:'resonance_peak_spacing.csv',content:spacingCsv(),filters:[{name:'CSV',extensions:['csv']}]});
        page.querySelector('#reswinGateRun').onclick=()=>{renderGate();scheduleSnapshot();};
        page.querySelector('#reswinGateExportCsv').onclick=()=>window.electronAPI?.saveText?.({defaultName:'gate_physics_analysis.csv',content:gateCsv(),filters:[{name:'CSV',extensions:['csv']}]});
        page.querySelector('#reswinGateExportReport').onclick=()=>window.electronAPI?.saveText?.({defaultName:'gate_physics_analysis_report.md',content:gateReportText(),filters:[{name:'Markdown',extensions:['md']},{name:'Text',extensions:['txt']}]});
      }

      const service={
        serialize:()=>clone(workspace),
        selectedSweep,selectedPeak,sweepById,peakById,visibleSweepIds,
        directionName,peakLabel,metrics:peakMetrics,
        restore(data,{legacyProject}={}){workspace=normalizeWorkspace(data,legacyProject||project);currentView=workspace.activeView||'main';rebuild();if($('#reswinMainPlot'))render();},
        reset(){workspace=defaultWorkspace(project);currentView='main';rebuild();render();scheduleSnapshot();},
        render,resize,bindUi,setView,
        selectSweep(id){selectedSweepId=String(id||'');selectedPeakId='';render();},
        setTransform,setPreset,runDetection,addManualPeak,sortPeakOrderByVd,setAllVisibility,
        exportPeaks:()=>window.electronAPI?.saveText?.({defaultName:'resonance_peaks.csv',content:peaksCsv(),filters:[{name:'CSV',extensions:['csv']}]}),
        copyPeaks:()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'),
        exportMainCsv:()=>window.electronAPI?.saveText?.({defaultName:'resonance_iv.csv',content:mainCsv(),filters:[{name:'CSV',extensions:['csv']}]}),
        exportMainSvg:()=>savePlotlyImage('reswinMainPlot','resonance_iv','svg'),
        exportMainPng:()=>savePlotlyImage('reswinMainPlot','resonance_iv','png'),
        getState:()=>({workspace,datasets,sweeps,selectedSweep:selectedSweep(),selectedPeak:selectedPeak(),activeView:currentView,spacingResult,gateResult})
      };
      sharedController=Shared.createController(service,{mode:'top-runtime',science:S,host});

      function setProject(next){project=clone(next||{});workspace=normalizeWorkspace(pluginSliceFromProject(project),project);currentView=workspace.activeView||'main';rebuild();if($('#reswinMainPlot'))render();}
      await setProject(project);
      return {
        serviceName:'resonance',service,render,resize,setProject,
        syncProject(target){target.plugins=target.plugins&&typeof target.plugins==='object'?target.plugins:{};const plugin=target.plugins['builtin.resonance-workbench']&&typeof target.plugins['builtin.resonance-workbench']==='object'?target.plugins['builtin.resonance-workbench']:{};plugin.workspace=clone(workspace);target.plugins['builtin.resonance-workbench']=plugin;},
        getState:service.getState
      };
  }

  window.DKDSResonanceFeatureRuntime=Object.freeze({mountSuper,createTop});
})();
