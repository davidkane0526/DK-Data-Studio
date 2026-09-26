(() => {
  async function mount(ctx,controller=null,views=null,adapter={}){
    const dom=ctx.ui.dom;
    const P=controller;
    const sharedViews=views||window.DKDSPluginModules.get('builtin.pulse-analysis','shared-views')?.create?.(controller)||null;
    let workbench=null;
    const pageHtml=sharedViews?.pageHtml?.()||'';

    ctx.ui.activities.add({
      id:'pulse',label:'脉冲分析',contextLabel:'脉冲 / 读取分析',icon:'▥',order:40,primary:true,openMode:'window',
      description:'多文件脉冲 / 读取瞬态分析',
      onActivate:()=>{ctx.workspace.openPage('pulseAnalysisPage');P.render();}
    });

    const page=ctx.ui.pages.add({
      id:'pulse-analysis',pageId:'pulseAnalysisPage',activity:'pulse',toolbar:false,
      label:'脉冲分析',buttonClass:'primary',order:60,html:pageHtml,onOpen:()=>P.render()
    });

    const presentation=sharedViews?.attach?.(ctx,page)||null;
    workbench=presentation?.workbench||null;

    ctx.ui.topWorkspace.register({
      id:'pulse',activity:'pulse',label:'脉冲分析',icon:'▥',
      layout:{
        mode:'native',root:{selector:'#pulseAnalysisPage .dkds-plugin-workbench-root'},
        primary:{id:'main',role:'analysis-primary',presentationRole:'scientific-primary',priority:100,collapsible:false},prime:[{id:'data-control',label:'参数',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:92,collapsible:true}],sub:[]
      }
    });



    const fileList=dom.query('#pulseFileList',page);
    dom.on(fileList,'click',event=>{
      const row=event.target?.closest?.('.pulse-batch-file-item'),fileId=row?.dataset?.fileId;if(!fileId)return;
      if(event.target?.matches?.('.pulse-file-check')){event.stopPropagation();P.setFileChecked(fileId,event.target.checked);return;}
      P.setActiveFile(fileId);dom.microtask(()=>{const st=P.getState?.();const item=st?.files?.find?.(f=>f.id===st.activeId)||null;controller?.select?.(item?{id:item.id,name:item.name,label:item.label}:null,{source:'pulse-file'});});
    });
    dom.on(dom.query('#pulseCheckAllBtn',page),'click',()=>P.setAllChecked(true));
    dom.on(dom.query('#pulseUncheckAllBtn',page),'click',()=>P.setAllChecked(false));
    dom.on(dom.query('#pulseRemoveFilesBtn',page),'click',()=>P.removeChecked());
    dom.on(dom.query('#pulseAnalyzeCurrentBtn',page),'click',()=>P.analyzeCurrent());
    dom.on(dom.query('#pulseAnalyzeCheckedBtn',page),'click',()=>P.analyzeChecked());
    dom.on(dom.query('#pulseApplySettingsBtn',page),'click',()=>P.applySettingsToChecked());

    dom.on(dom.query('#pulseSeriesLabel',page),'change',()=>{const item=P.syncEditor();if(item)P.refreshFileAndComparison();});
    for(const id of [
      'pulseSegmentationMode','pulseTimeCol','pulseCurrentCol','pulseVoltageCol',
      'pulseCycleSamples','pulseCycleOffsetSamples','pulseWriteStartSample','pulseWriteEndSample',
      'pulseReadStartSample','pulseReadEndSample','pulseWriteDuration','pulseReadDuration',
      'pulseSampleInterval','pulsePhaseOrder','pulseReadVoltageFallback','pulsePulseVoltageFallback',
      'pulseBlockSamples','pulseWindowStart','pulseWindowEnd','pulseReadPairMode'
    ])dom.on(dom.query('#'+id,page),'change',()=>P.syncEditor());
    dom.on(dom.query('#pulseResultScope',page),'change',event=>P.setResultScope(event.target.value));
    dom.on(dom.query('#pulseCopyCsvBtn',page),'click',()=>P.copyResults());
    dom.on(dom.query('#pulseExportCsvBtn',page),'click',()=>P.exportResults());


    if(!ctx.runtime.isAuxiliaryWindow&&ctx.ui.menus?.add){
      const activeResultAvailable=()=>{const state=P.getState?.()||{},active=state.files?.find?.(row=>row.id===state.activeId);return !!active?.result;};
      const visibleResultsAvailable=()=>{const state=P.getState?.()||{},files=Array.isArray(state.files)?state.files:[];if(state.resultScope==='active'){const active=files.find(row=>row.id===state.activeId);return !!active?.result;}return files.some(row=>row.checked&&row.result);};
      const menuRows=[
        ['pulse-export-raw-csv','当前文件 · 原始波形数据 CSV',10,()=>P.exportRawCsv(),activeResultAvailable],
        ['pulse-export-raw-svg','当前文件 · 原始波形 SVG',20,()=>P.exportRawSvg(),activeResultAvailable],
        ['pulse-export-raw-png','当前文件 · 原始波形 PNG',30,()=>P.exportRawPng(),activeResultAvailable],
        ['pulse-export-read-csv','当前可见结果 · 读取电流 CSV',50,()=>P.exportReadCsv(),visibleResultsAvailable],
        ['pulse-export-read-svg','当前可见结果 · 读取电流图 SVG',60,()=>P.exportReadSvg(),visibleResultsAvailable],
        ['pulse-export-read-png','当前可见结果 · 读取电流图 PNG',70,()=>P.exportReadPng(),visibleResultsAvailable],
        ['pulse-export-pulse-csv','当前可见结果 · 脉冲电流 CSV',90,()=>P.exportPulseCsv(),visibleResultsAvailable],
        ['pulse-export-pulse-svg','当前可见结果 · 脉冲电流图 SVG',100,()=>P.exportPulseSvg(),visibleResultsAvailable],
        ['pulse-export-pulse-png','当前可见结果 · 脉冲电流图 PNG',110,()=>P.exportPulsePng(),visibleResultsAvailable],
        ['pulse-export-summary-csv','当前可见结果 · 分析汇总 CSV',130,()=>P.exportResults(),visibleResultsAvailable]
      ];
      for(const [id,label,order,onClick,availability] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'pulse',order,onClick,availability});
    }

    ctx.events.on('analysis:refresh',({id})=>{if(id==='pulseAnalysisPage')P.render();});
    ctx.events.on('data:artifacts-changed',()=>P.refreshSources?.());
    ctx.events.on('layout:resize',()=>{
      for(const id of ['pulseRawPlot','pulseReadPlot','pulsePulsePlot']){
        const el=dom.query('#'+id);
        if(el&&el.offsetParent!==null){try{ctx.ui.scientificPlot.resize(el);}catch{}}
      }
    });

    ctx.project.registerSlice('workspace',{
      serialize:()=>P.serialize(),
      restore:data=>P.restore(data ?? null),
      reset:()=>P.reset()
    });

    ctx.analysis.providers.register('pulse-read',{
      id:'pulse-read',name:'Pulse / read transient extraction',
      analyze:(file,options={})=>ctx.tasks.submit('analyze-pulse-read',{file,options,inspection:null},{key:`provider:${String(file?.path||file?.name||'pulse-read')}`,latest:true}).promise
    });
    return {deactivate(){presentation?.dispose?.();}};
  }
  window.DKDSPluginModules.define('builtin.pulse-analysis','feature-runtime',Object.freeze({mount}));
})();
