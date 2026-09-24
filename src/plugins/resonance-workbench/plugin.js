(() => {
  DKDSPlugins.define({"id":"builtin.resonance-workbench","name":"Resonance Workbench","version":"3.63.11","apiVersion":"1.19.0","requiresCore":["runtime","events","status","io","science","performance","services","modules","capabilities","project","workspace","parameters","data.artifacts","data.sources","data.entities","data.types","data.reactive","data.pipeline","data.transforms","analysis.algorithms","charts","ui.dom","ui.workspace","ui.group-area","ui.actions","ui.selection","ui.interaction","ui.interaction-behavior","ui.menus","ui.context-menus","ui.activities","ui.top-workspace","ui.toolbar","ui.status-bar","ui.pages","ui.edit","ui.plot-views","ui.scientific-plot","ui.unit-templates","ui.series","ui.settings","ui.dialogs","data.model","execution.tasks"],"entry":"plugin.js","enabled":true,"order":100,"description":"Reference PluginWorkspace implementation: GRS-parity resonance semantics on Core ScientificCurveSurface; SUPER and TOP mount the same host-invariant workspace.","capabilities":["ui.activity","ui.sidebar","ui.inspector","ui.group-charts","ui.main-tools","analysis.resonance","chart.trend","ui.selection-menu","ui.top-workspace","ui.views","ui.interaction","ui.interaction-behavior","data.types","data.artifacts","data.sources","data.pipeline","ui.plugin-workspace","ui.scientific-plot","ui.settings","ui.status-bar","ui.group-area"],"workspace":{"role":"top","activity":"resonance","icon":"∿","title":"共振分析","defaultSuper":true},"window":{"activity":"resonance","title":"共振分析","width":1480,"height":940,"minWidth":920,"minHeight":650,"prewarm":false,"reuse":true,"persistence":"project","runtime":"window-runtime.js","dependencies":["data-model","scientific-renderer","science-common","science-presets","science-import","science-peaks","science-identity","science-physics","science-gate","science-ter","platform","ui-infrastructure","plugin-kernel"],"scripts":["workbench-shared.js","unit-presentation.js","view-components.js","feature-context.js","feature-data-runtime.js","feature-ter-runtime.js","feature-group-runtime.js","feature-analysis-runtime.js","feature-peak-runtime.js","feature-selection-runtime.js","feature-inspector-runtime.js","feature-main-plot-runtime.js","feature-controls-runtime.js","feature-runtime.js"]},"scripts":["workbench-shared.js","unit-presentation.js","view-components.js","feature-context.js","feature-data-runtime.js","feature-ter-runtime.js","feature-group-runtime.js","feature-analysis-runtime.js","feature-peak-runtime.js","feature-selection-runtime.js","feature-inspector-runtime.js","feature-main-plot-runtime.js","feature-controls-runtime.js","feature-runtime.js","super-layout.js","domain-adapter.js","plugin.js"],"algorithmCategories":["peak-detector","peak-metrics","transport-transform","transport-scalar-field","ter-analysis"],"pluginType":"workbench","data":{"accepts":["science.transport.iv"]},"styles":["plugin.css"],"pluginDependencies":[{"id":"builtin.scientific-data-contracts"}],"platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"custom","styles":["mobile.css"]}},"tasks":[{"id":"resonant-ter","entry":"resonant-ter-task.js","imports":["task-core.js"]}]}, async ctx => {
    const shared=ctx.modules.require('workbench-shared');
    // Domain types live with the shared feature contract, not with the shell.
    shared.registerDataTypes?.(ctx);
    const interactionRuntime=ctx.ui.interaction?.create?.('resonance',{selection:{multiple:true,defaultType:'resonance.peak'},defaultType:'resonance.peak'});
    const interactionSelection=interactionRuntime?.selection||ctx.ui.selection.model('resonance:interaction',{multiple:true,defaultType:'resonance.peak'});
    let runtime=null,service=null;const presentationSummaryItem=ctx.ui.statusBar.add({id:'main-summary',side:'left',order:1,label:'',hidden:true,disabled:true,presentationOnly:true,activity:'resonance',className:'resonance-presentation-summary'});
    const setPresentationSummary=value=>{const label=String(value||'').trim();presentationSummaryItem.update({label,hidden:!label,disabled:true});};
    if(ctx.runtime.isAuxiliaryWindow){
      service=ctx.services.require('builtin.resonance-workbench.runtime');
    }else{
      const feature=ctx.modules.require('feature-runtime');
      runtime=await feature.createTop({
        project:ctx.project.create?.()||{},
        artifacts:ctx.data.artifacts,isNativeClient:ctx.runtime.isNativeClient===true,
        setStatus:ctx.status.set,setPresentationSummary,
        scheduleSnapshot:()=>ctx.project.capture?.(),historyChanged:detail=>ctx.ui.edit?.changed?.(detail),
        science:ctx.science,dataModel:ctx.data.model,
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        saveChartImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,performance:ctx.performance,pipeline:ctx.data.pipeline,transforms:ctx.data.transforms,algorithms:ctx.analysis.algorithms,reactive:ctx.data.reactive,series:ctx.ui.series,dialogs:ctx.ui.dialogs,
        adapter:{mode:'super',root:ctx.ui.dom.query('#app')}
      });
      service=runtime.service;
    }
    if(!service)throw new Error('Resonance service is unavailable.');
    const pluginSettings=ctx.ui.settings?.define?.('defaults',{
      title:'共振分析默认设置',description:'仅保存插件级默认布局，不改变科学算法或工程数据。',
      defaults:{inspectPlacement:'right',groupPlacement:'bottom',groupColumns:'auto'},
      fields:[
        {id:'inspectPlacement',label:'“检查”默认位置',type:'select',options:[{value:'right',label:'右侧'},{value:'left',label:'左侧'},{value:'bottom',label:'底部'},{value:'float',label:'窗口内悬浮'},{value:'global',label:'全局悬浮'}]},
        {id:'groupPlacement',label:'“组图”默认位置',type:'select',options:[{value:'bottom',label:'底部'},{value:'right',label:'右侧'},{value:'left',label:'左侧'},{value:'float',label:'窗口内悬浮'},{value:'global',label:'全局悬浮'}]},
        {id:'groupColumns',label:'组图每行列数',type:'select',options:['auto','1','2','3','4','5','6'].map(value=>({value,label:value==='auto'?'自动':`${value} 列`}))}
      ],onApply:value=>service.setUserDefaults?.(value,{applyCurrent:true})
    });
    service.setUserDefaults?.(pluginSettings?.get?.()||{},{applyCurrent:false});
    service.setInteractionRuntime?.({runtime:interactionRuntime,selection:interactionSelection,dataTypes:ctx.data.types,contextMenus:ctx.ui.contextMenus});
    const controller=shared.createController(service,{
      mode:ctx.runtime.isAuxiliaryWindow?'top':'super',
      science:ctx.science
    });
    /* DOMAIN_ADAPTER_SEAM_BEGIN */
    if(!ctx.runtime.isAuxiliaryWindow)ctx.modules.require('domain-adapter')?.provide?.(ctx,service);
    /* DOMAIN_ADAPTER_SEAM_END */
    const views=ctx.modules.require('view-components');
    if(ctx.runtime.isAuxiliaryWindow)return views.mountTop(ctx,controller);
    const layout=ctx.modules.require('super-layout');
    return layout.mount(ctx,controller);
  });
})();