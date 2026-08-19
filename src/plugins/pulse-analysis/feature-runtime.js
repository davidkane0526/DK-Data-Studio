(() => {
  async function mount(ctx,controller=null,views=null,adapter={}){
    const h=ctx.host;
    const P=controller;
    const sharedViews=views||window.DKDSPulseSharedViews?.create?.(controller)||null;
    let workbench=null;
    const pageHtml=sharedViews?.pageHtml?.()||'';

    ctx.ui.activities.add({
      id:'pulse',label:'脉冲分析',contextLabel:'脉冲 / 读取分析',icon:'▥',order:40,primary:true,openMode:'window',
      description:'多文件脉冲 / 读取瞬态分析',
      onActivate:()=>{h.openAnalysisPage('pulseAnalysisPage');P.render();}
    });

    const page=ctx.ui.pages.add({
      id:'pulse-analysis',pageId:'pulseAnalysisPage',activity:'pulse',toolbar:false,
      label:'脉冲分析',buttonClass:'accent-soft',order:60,html:pageHtml,onOpen:()=>P.render()
    });

    workbench=sharedViews?.attach?.(ctx,page)||null;
    const pulseHeader=page.querySelector('.analysis-page-header');
    const pulseHeaderActionsHost=document.createElement('div');
    pulseHeaderActionsHost.className='dkds-plugin-header-actions';
    pulseHeader?.querySelector('.analysis-page-close')?.before(pulseHeaderActionsHost);
    ctx.ui.actions?.mount?.(pulseHeaderActionsHost,{
      activity:'pulse',
      actions:[
        {id:'add',icon:'＋',label:'添加文件',order:10,onInvoke:()=>P.addFiles()},
        {id:'current',icon:'▶',label:'分析当前',order:20,shortcut:'Ctrl+Enter',onInvoke:()=>P.analyzeCurrent()},
        {id:'checked',icon:'▶▶',label:'分析勾选',className:'primary',order:30,shortcut:'Ctrl+Shift+Enter',onInvoke:()=>P.analyzeChecked()}
      ]
    });

    ctx.ui.topWorkspace.register({
      id:'pulse',activity:'pulse',label:'脉冲分析',icon:'▥',
      layout:{
        mode:'native',root:{selector:'#pulseAnalysisPage .dkds-plugin-workbench-root'},
        primary:{id:'main',role:'analysis-primary'},prime:[{id:'raw-diagnostic'}],sub:[]
      }
    });


    // Every scientific data figure consumes the Core PlotView contract.
    // Pulse only contributes domain actions/semantics; location, CSV/copy,
    // SVG/PNG and resize lifecycle belong to the platform.
    const pulsePlotViews=[];
    const rawCard=page.querySelector('#pulseRawPlot')?.closest('.pulse-card');
    if(rawCard&&workbench?.registerPrime){
      workbench.registerPrime({
        id:'raw-diagnostic',label:'原始波形',title:'当前文件 · 原始波形诊断',node:rawCard,
        handle:'.pulse-card-heading',controlsHost:'.pulse-plot-actions',defaultPlacement:'inline',
        placements:['inline','right','bottom','float','global'],autoOpen:true,
        mount:()=>requestAnimationFrame(()=>{try{Plotly.Plots.resize(page.querySelector('#pulseRawPlot'));}catch{}})
      });
    }
    const bindPulsePlot=(plotId,viewId,title,{prime=false,actions=[]}={})=>{
      const plot=page.querySelector('#'+plotId);
      const card=plot?.closest('.pulse-card');
      if(!plot||!card||!ctx.ui.plotViews?.bind)return null;
      const view=ctx.ui.plotViews.bind(`pulse:${viewId}`,card,{
        plot,header:'.pulse-card-heading',actionsHost:'.pulse-plot-actions',portableTitle:title,
        fileStem:()=>`pulse_${viewId}`,actions,portable:!prime,
        placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',stateVersion:'plot-view-v1',
        portableFactory:(id,node,spec)=>workbench?.portable?workbench.portable(id,node,spec):ctx.ui.portable.create(id,node,spec)
      });
      pulsePlotViews.push(view);
      return view;
    };
    bindPulsePlot('pulseRawPlot','raw','当前文件 · 原始波形诊断',{prime:true,actions:[{id:'fit',label:'适应全部',onInvoke:()=>P.fitRaw()}]});
    bindPulsePlot('pulseReadPlot','read','脉冲条件 → 读取电流');
    bindPulsePlot('pulsePulsePlot','pulse','脉冲条件 → 脉冲电流');


    page.querySelector('#pulseFileList')?.addEventListener('click',()=>queueMicrotask(()=>{const st=P.getState?.();const item=st?.files?.find?.(f=>f.id===st.activeId)||null;controller?.select?.(item?{id:item.id,name:item.name,label:item.label}:null,{source:'pulse-file'});}));
    page.querySelector('#pulseCheckAllBtn').onclick=()=>P.setAllChecked(true);
    page.querySelector('#pulseUncheckAllBtn').onclick=()=>P.setAllChecked(false);
    page.querySelector('#pulseRemoveFilesBtn').onclick=()=>P.removeChecked();
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

    page.querySelector('#pulseCopyCsvBtn').onclick=()=>P.copyResults();
    page.querySelector('#pulseExportCsvBtn').onclick=()=>P.exportResults();

    if(!h.isAuxiliaryWindow&&ctx.ui.menus?.add){
      const menuRows=[
        ['pulse-export-raw-csv','当前文件 · 原始波形数据 CSV',10,()=>P.exportRawCsv()],
        ['pulse-export-raw-svg','当前文件 · 原始波形 SVG',20,()=>P.exportRawSvg()],
        ['pulse-export-raw-png','当前文件 · 原始波形 PNG',30,()=>P.exportRawPng()],
        ['pulse-export-read-csv','当前可见结果 · 读取电流 CSV',50,()=>P.exportReadCsv()],
        ['pulse-export-read-svg','当前可见结果 · 读取电流图 SVG',60,()=>P.exportReadSvg()],
        ['pulse-export-read-png','当前可见结果 · 读取电流图 PNG',70,()=>P.exportReadPng()],
        ['pulse-export-pulse-csv','当前可见结果 · 脉冲电流 CSV',90,()=>P.exportPulseCsv()],
        ['pulse-export-pulse-svg','当前可见结果 · 脉冲电流图 SVG',100,()=>P.exportPulseSvg()],
        ['pulse-export-pulse-png','当前可见结果 · 脉冲电流图 PNG',110,()=>P.exportPulsePng()],
        ['pulse-export-summary-csv','当前可见结果 · 分析汇总 CSV',130,()=>P.exportResults()]
      ];
      for(const [id,label,order,onClick] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'pulse',order,onClick});
    }

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
    return {deactivate(){pulsePlotViews.splice(0).forEach(view=>view?.dispose?.());}};
  }
  window.DKDSPulseFeatureRuntime=Object.freeze({mount});
})();
