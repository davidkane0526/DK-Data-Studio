(() => {
  const Shared=window.DKDSPluginModules.require('builtin.resonance-workbench','workbench-shared');
  if(!Shared)throw new Error('Resonance shared Controller layer is not loaded.');
  const {PRESENTATION_LAYOUT}=Shared;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mountUnified(ctx,controller,{mode='top',adapter={}}={}){
    const R=controller.service;
    const dom=ctx.ui.dom;
    const isTop=mode==='top'||ctx.runtime.isAuxiliaryWindow;
    ctx.ui.activities.add({id:'resonance',label:'共振分析',contextLabel:'共振分析',icon:'∿',order:10,default:true,primary:true,openMode:'window',description:'共振曲线、峰位与物理分析',onActivate:()=>{ctx.workspace.openPage('resonanceDedicatedPage');controller.render();}});
    const unitPresentation=ctx.modules.require('unit-presentation');
    if(!unitPresentation?.mount)throw new Error('Resonance Unit presentation is unavailable.');
    const presentation=unitPresentation.mount(ctx,controller,{mode});
    const page=presentation.page,wb=presentation.workbench,settingsSurface=presentation.settingsSurface;
    R.bindUi?.(page);R.setUiRuntime?.(ctx.ui);R.setCommandRuntime?.(ctx.commands);R.setEntityRuntime?.(ctx.data.entities);R.setPipelineRuntime?.(ctx.data.pipeline);R.setAlgorithmRuntime?.(ctx.analysis.algorithms);R.setDataSourceRuntime?.(ctx.data.sources);R.setDetectorRuntime?.({list:()=>{const rows=ctx.analysis.algorithms?.list?.({category:'peak-detector'})||[];return rows.map(row=>{const ref=`${row.id}@${row.version}`;return {...row,id:ref,algorithmId:row.id,name:row.title,shortName:row.metadata?.shortName||row.title,presets:row.metadata?.presets||[],detect:(sweep,settings,options={})=>ctx.analysis.algorithms.run({id:row.id,version:row.version,category:'peak-detector'},sweep,{...options,parameters:settings||{}})};});}});
    let detectorParamPanel=null;
    const detectorSelect=dom.query('#reswinDetectorSelect',page),detectorNote=dom.query('#reswinDetectorDescription',page),detectorParamHost=dom.query('#reswinDetectorParams',page),detectorRecover=dom.query('#reswinRecoverDetector',page);
    const metricSelect=dom.query('#reswinMetricAlgorithmSelect',page),metricNote=dom.query('#reswinMetricAlgorithmDescription',page),metricRecover=dom.query('#reswinRecoverMetricAlgorithm',page);
    let detectorRows=[],detectorSaved='',detectorMissing=false,metricRows=[],metricSaved='',metricMissing=false;
    const recoverLockedAlgorithm=async(category,ref,button,rerender)=>{if(!ref||typeof ctx.analysis.algorithms?.recover!=='function')return;button.disabled=true;try{const catalog=await ctx.analysis.algorithms.locate?.({category,id:String(ref).split('@')[0],version:String(ref).includes('@')?String(ref).slice(String(ref).lastIndexOf('@')+1):''});const ready=(catalog?.candidates||[]).filter(row=>row.ready&&row.recoverable);if(!ready.length){ctx.status.set((catalog?.candidates||[]).length?`已定位到包含 ${ref} 的算法包，但缺少当前合同要求的插件依赖。`:`未在当前已安装插件包中找到 ${ref}。`);return;}const restored=await ctx.analysis.algorithms.recover({category,id:String(ref).split('@')[0],version:String(ref).slice(String(ref).lastIndexOf('@')+1)},ready[0]);ctx.status.set(`已恢复算法 ${restored.id}@${restored.version}。`);rerender?.();}catch(err){ctx.status.set(`恢复算法失败：${err.message}`);}finally{button.disabled=false;}};
    const renderDetectorActive=()=>{if(!detectorSelect)return;const row=detectorRows.find(item=>String(item.id)===detectorSelect.value);if(detectorNote)detectorNote.textContent=detectorMissing&&!row?`工程锁定的寻峰算法缺失：${detectorSaved}`:(row?`${row.description||'寻峰算法'} · ${row.algorithmId}@${row.version}`:'选择当前使用的寻峰算法。');detectorParamPanel?.dispose?.();detectorParamPanel=null;if(detectorParamHost)dom.replace(detectorParamHost);if(row?.parameterSchema&&detectorParamHost&&ctx.parameters?.render){const ws=R.getState?.()?.workspace||{},value=ws.detectorSettings?.[row.id]||ws.detectorSettings?.[row.algorithmId]||ws.algorithms||{};detectorParamPanel=ctx.parameters.render(detectorParamHost,row.parameterSchema,{value,onChange:next=>R.setDetectorSettings?.(row.id,next)});}};
    const renderDetectorPicker=()=>{if(!detectorSelect)return;detectorRows=(ctx.analysis.algorithms?.list?.({category:'peak-detector'})||[]).map(row=>({...row,id:`${row.id}@${row.version}`,algorithmId:row.id,shortName:row.metadata?.shortName||row.title,name:row.title,presets:row.metadata?.presets||[]}));const state=R.getState?.();detectorSaved=String(state?.workspace?.activeDetector||'');const diagnostic=detectorSaved.includes('@')?ctx.analysis.algorithms?.diagnose?.(detectorSaved,{category:'peak-detector'}):null;detectorMissing=diagnostic?.status==='missing-version'||diagnostic?.status==='missing-algorithm';const current=detectorMissing?detectorSaved:String(detectorRows.find(row=>row.id===detectorSaved||row.algorithmId===detectorSaved)?.id||detectorRows.find(row=>row.default)?.id||detectorRows[0]?.id||'');dom.html(detectorSelect,(detectorMissing?`<option value="${esc(detectorSaved)}">缺失版本 · ${esc(detectorSaved)}</option>`:'')+detectorRows.map(row=>`<option value="${esc(row.id)}">${esc(row.shortName||row.name||row.id)} · v${esc(row.version||'')}</option>`).join(''));if(current)detectorSelect.value=current;if(detectorRecover)detectorRecover.classList.toggle('hidden',!detectorMissing);renderDetectorActive();};
    if(detectorSelect)dom.on(detectorSelect,'change',()=>{if(detectorMissing&&detectorSelect.value===detectorSaved)return;R.setActiveDetector?.(detectorSelect.value);renderDetectorActive();});
    if(detectorRecover)dom.on(detectorRecover,'click',()=>recoverLockedAlgorithm('peak-detector',detectorSaved,detectorRecover,renderDetectorPicker));
    renderDetectorPicker();
    const renderMetricAlgorithmPicker=()=>{if(!metricSelect)return;metricRows=ctx.analysis.algorithms?.list?.({category:'peak-metrics'})||[];const state=R.getState?.();metricSaved=String(state?.workspace?.activeMetricAlgorithm||'');const diagnostic=metricSaved.includes('@')?ctx.analysis.algorithms?.diagnose?.(metricSaved,{category:'peak-metrics'}):null;metricMissing=diagnostic?.status==='missing-version'||diagnostic?.status==='missing-algorithm';const matched=metricRows.find(row=>`${row.id}@${row.version}`===metricSaved||row.id===metricSaved),current=metricMissing?metricSaved:String(matched?`${matched.id}@${matched.version}`:(metricRows.find(row=>row.default)?`${metricRows.find(row=>row.default).id}@${metricRows.find(row=>row.default).version}`:(metricRows[0]?`${metricRows[0].id}@${metricRows[0].version}`:'')));dom.html(metricSelect,(metricMissing?`<option value="${esc(metricSaved)}">缺失版本 · ${esc(metricSaved)}</option>`:'')+metricRows.map(row=>`<option value="${esc(`${row.id}@${row.version}`)}">${esc(row.metadata?.shortName||row.title||row.id)} · v${esc(row.version)}</option>`).join(''));if(current)metricSelect.value=current;if(metricRecover)metricRecover.classList.toggle('hidden',!metricMissing);const active=metricRows.find(row=>`${row.id}@${row.version}`===metricSelect.value);if(metricNote)metricNote.textContent=metricMissing&&!active?`工程锁定的峰宽算法缺失：${metricSaved}`:(active?`${active.description||'峰度量算法'} · ${active.id}@${active.version}`:'未发现峰度量算法插件。');};
    if(metricSelect)dom.on(metricSelect,'change',()=>{if(metricMissing&&metricSelect.value===metricSaved)return;R.setActiveMetricAlgorithm?.(metricSelect.value);const row=metricRows.find(item=>`${item.id}@${item.version}`===metricSelect.value);if(metricNote)metricNote.textContent=row?`${row.description||'峰度量算法'} · ${row.id}@${row.version}`:'';});
    if(metricRecover)dom.on(metricRecover,'click',()=>recoverLockedAlgorithm('peak-metrics',metricSaved,metricRecover,renderMetricAlgorithmPicker));
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

    // Production composition is now owned by Unit Templates. Domain runtime only binds behavior/data.
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
    const primeIdFor=kind=>kind==='data'?'data-control':kind==='inspect'?'curve-inspector':'group-analysis';
    const togglePanel=(kind,force)=>{const id=primeIdFor(kind),row=wb.primes?.get?.(id);if(force===false){wb.closePrime(id);return;}if(force===true||!row?.mounted){wb.openPrime(id);if(kind==='inspect')R.renderInspection?.();else if(kind==='group')R.renderGroup?.();}else wb.closePrime(id);};
    dom.on(page,'click',event=>{
      const button=event.target?.closest?.('button,[data-respar-panel]');if(!button||!page.contains(button))return;
      if(button.dataset.resparPanel){togglePanel(button.dataset.resparPanel);return;}
      if(button.dataset.resparLock==='1'){R.lockSelectedPeaks?.(true);return;}
      if(button.dataset.resparLock==='0'){R.lockSelectedPeaks?.(false);return;}
      switch(button.id){
        case 'resparSortPeakOrder':R.sortPeakOrderByVd?.();break;
        case 'resparTogglePhysics':R.togglePhysicsLabels?.();break;
        case 'resparResetView':R.resetMainView?.();break;
        case 'resparRangeDetect':R.detectSelectedRange?.();break;
        case 'resparRangeDelete':R.deleteSelectedRangePeaks?.();break;
        case 'resparRangeLock':R.setSelectedRangeLocked?.(true);break;
        case 'resparRangeUnlock':R.setSelectedRangeLocked?.(false);break;
        case 'resparRangeApplyIdentity':R.applySelectedRangeIdentity?.(dom.query('#resparRangeOrder',page)?.value,dom.query('#resparRangeLabel',page)?.value);break;
        case 'resparRangeClose':R.clearSelectedRange?.();break;
      }
    });
    const exportItems=()=>[
      {id:'main-svg',label:'共振 I–V 主图 · SVG',onInvoke:()=>R.exportMainSvg?.()},
      {id:'main-png',label:'共振 I–V 主图 · PNG',onInvoke:()=>R.exportMainPng?.()},
      {id:'main-csv',label:'共振 I–V 主图数据 · CSV',onInvoke:()=>R.exportMainCsv?.()},
      {id:'main-copy',label:'复制共振 I–V 主图数据',nativeCopy:'clipboard',onInvoke:()=>R.copyMainCsv?.()},
      {type:'separator'},
      {id:'peaks-csv',label:'峰参数 CSV',onInvoke:()=>R.exportPeaks?.()},
      {id:'peaks-copy',label:'复制峰参数',nativeCopy:'clipboard',onInvoke:()=>R.copyPeaks?.()}
    ];
    const localActions=[
      {id:'export',label:'导出',menu:true,items:exportItems},
      {id:'settings',label:'设置',onInvoke:()=>settingsSurface?.open?.()}
    ];
    const pageHeader=presentation.header?.element||dom.query('.resonance-window-header',page),headerActions=presentation.header?.actions||dom.query('#reswinHeaderActions',page);
    if(isTop){pageHeader?.classList.remove('hidden');if(headerActions)ctx.ui.actions?.mount?.(headerActions,{activity:'resonance',actions:localActions});}
    else{
      pageHeader?.classList.add('hidden');
      ctx.ui.toolbar.add({id:'res-settings',label:'设置',activity:'resonance',section:'UTILITY',order:980,priority:10,onClick:()=>settingsSurface?.open?.()});
      const hasMainExport=()=>{const state=R.getState?.()||{};return Array.isArray(state.selectedSweep?.points)&&state.selectedSweep.points.length>0;};
      const hasPeakExport=()=>{const state=R.getState?.()||{};return Array.isArray(state.workspace?.peaks)&&state.workspace.peaks.length>0;};
      const menuRows=[['res-export-main-svg','共振 I–V 主图 · SVG',10,()=>R.exportMainSvg?.(),hasMainExport],['res-export-main-png','共振 I–V 主图 · PNG',20,()=>R.exportMainPng?.(),hasMainExport],['res-export-main-csv','共振 I–V 主图数据 · CSV',30,()=>R.exportMainCsv?.(),hasMainExport],['res-export-main-copy','复制共振 I–V 主图数据',40,()=>R.copyMainCsv?.(),hasMainExport],['res-export-peaks','峰参数 CSV',60,()=>R.exportPeaks?.(),hasPeakExport],['res-export-peaks-copy','复制峰参数',70,()=>R.copyPeaks?.(),hasPeakExport]];
      for(const [id,label,order,onClick,availability] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'resonance',order,onClick,availability,nativeCopy:id.endsWith('-copy')?'clipboard':undefined});
    }
    ctx.ui.topWorkspace.register({id:'resonance',activity:'resonance',label:'共振分析',icon:'∿',layout:{mode:'native',root:{selector:'#resonanceDedicatedPage .dkds-plugin-workbench-root'},primary:PRESENTATION_LAYOUT.primary,prime:PRESENTATION_LAYOUT.prime,sub:PRESENTATION_LAYOUT.sub}});
    ctx.project.registerSlice('workspace',{serialize:()=>controller.serialize(),restore:data=>controller.restore(data),reset:()=>controller.reset()});ctx.events.on('analysis:refresh',({id})=>{if(id==='resonanceDedicatedPage')controller.render();});ctx.events.on('data:artifacts-changed',()=>R.refreshData?.());ctx.events.on('layout:resize',()=>controller.resize());controller.render();adapter?.resize?.();return {controller,workbench:wb,mode,presentation};
  }

  function mountTop(ctx,controller){return mountUnified(ctx,controller,{mode:'top'});}


  window.DKDSPluginModules.define('builtin.resonance-workbench','view-components',Object.freeze({mountUnified,mountTop}));
})();
