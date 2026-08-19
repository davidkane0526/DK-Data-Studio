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


    // Raw waveform diagnostics are a PRIME surface: inline by default, but
    // the Core workbench can pin/float it without changing pulse feature code.
    const rawCard=page.querySelector('#pulseRawPlot')?.closest('.pulse-card');
    if(rawCard&&workbench?.registerPrime){
      workbench.registerPrime({id:'raw-diagnostic',label:'原始波形',title:'当前文件 · 原始波形诊断',node:rawCard,handle:'.pulse-card-heading',controlsHost:'.pulse-plot-actions',defaultPlacement:'inline',placements:['inline','right','bottom','float','global'],autoOpen:true,mount:()=>requestAnimationFrame(()=>{try{Plotly.Plots.resize(page.querySelector('#pulseRawPlot'));}catch{}})});
    }

    // Result charts stay PRIMARY portable views.
    for(const [id,title] of [
      ['pulseReadPlot','脉冲条件 → 读取电流'],
      ['pulsePulsePlot','脉冲条件 → 脉冲电流']
    ]){
      const card=page.querySelector('#'+id)?.closest('.pulse-card');
      if(!card||!ctx.ui.portable?.create)continue;
      try{
        const portableSpec={title,handle:'.pulse-card-heading',controlsHost:'.pulse-plot-actions',controlsPlacement:'start',useTargetAsWrapper:true,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home'};
        if(workbench?.portable)workbench.portable(`pulse-chart-${id}`,card,portableSpec);else ctx.ui.portable.create(`pulse-chart-${id}`,card,portableSpec);
        const plot=page.querySelector('#'+id);if(plot&&ctx.ui.charts?.mount)ctx.ui.charts.mount(plot,{});
      }catch(err){console.warn('[Pulse portable chart]',id,err);}
    }


    const rawPlot=page.querySelector('#pulseRawPlot');if(rawPlot&&ctx.ui.charts?.mount)try{ctx.ui.charts.mount(rawPlot,{});}catch(err){console.warn('[Pulse raw chart surface]',err);}

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
  }
  window.DKDSPulseFeatureRuntime=Object.freeze({mount});
})();
