(() => {
  DKDSPlugins.define({"id":"builtin.ter-analysis","name":"TER Analysis","version":"3.14.8","apiVersion":"1.19.0","requiresCore":["runtime","events","status","io","science","performance","services","modules","project","workspace","data.artifacts","data.types","data.reactive","data.pipeline","data.transforms","analysis.providers","analysis.algorithms","charts","parameters","ui.dom","ui.workspace","ui.group-area","ui.plot-views","ui.actions","ui.selection","ui.interaction","ui.menus","ui.activities","ui.top-workspace","ui.shortcuts","ui.pages","ui.portable","ui.scientific-plot","data.model","execution.tasks","ui.unit-templates","ui.table"],"entry":"plugin.js","enabled":true,"order":120,"description":"TER analysis with Unit Template production presentation, shared Controller/Feature runtime, and a single production domain owner.","capabilities":["ui.activity","ui.page","analysis.ter","chart.heatmap","chart.transformed-heatmap","ui.top-workspace","chart.resistance-voltage","ui.linked-selection","ui.chart-layout","ui.keyboard-adjustment","chart.export","ui.portable","ui.shortcuts","ui.interaction","data.types","data.artifacts","data.pipeline","ui.plugin-workspace","ui.scientific-plot","ui.group-area","ui.unit-templates","ui.table"],"window":{"activity":"ter","runtime":"window-runtime.js","title":"TER 分析","width":1480,"height":940,"minWidth":920,"minHeight":650,"dependencies":["data-model","scientific-renderer","science-common","science-peaks","science-ter","parameter-schema","platform","ui-infrastructure","plugin-kernel"],"prewarm":true,"reuse":true,"persistence":"project","artifactHydration":"live","scripts":["controller.js","feature-utils.js","selection-link-runtime.js","unit-presentation.js","feature-runtime.js","analysis-service.js","super-layout.js"]},"workspace":{"role":"top","activity":"ter","icon":"▧","title":"TER 分析"},"scripts":["controller.js","analysis-service.js","feature-utils.js","selection-link-runtime.js","unit-presentation.js","feature-runtime.js","super-layout.js","domain-adapter.js","plugin.js"],"algorithmCategories":["transport-transform","transport-scalar-field","ter-analysis"],"pluginType":"workbench","styles":["plugin.css"],"pluginDependencies":[{"id":"builtin.scientific-data-contracts"}],"platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"tasks":[{"id":"resonant-ter","entry":"ter-resonant-task.js","imports":["task-core.js"]}]},async ctx=>{
    const C=ctx.modules.require('controller'),analysisService=ctx.modules.require('analysis-service');
    let ownedRuntime=null;
    let service=null;
    if(ctx.runtime.isAuxiliaryWindow){
      service=ctx.services.require('builtin.ter-analysis.runtime');
    }else if(analysisService?.create){
      ownedRuntime=await analysisService.create({
        project:ctx.project.create?.()||{},
        bootstrap:{title:ctx.project.current?.()?.title||'当前项目'},
        artifacts:ctx.data.artifacts,
        setStatus:ctx.status.set,
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        saveChartImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        scheduleSnapshot:()=>ctx.project.capture?.(),science:ctx.science,dataModel:ctx.data.model,
        io:ctx.io,dom:ctx.ui.dom,performance:ctx.performance,pipeline:ctx.data.pipeline,transforms:ctx.data.transforms,algorithms:ctx.analysis.algorithms,reactive:ctx.data.reactive
      });
      service=ownedRuntime?.service||service;
    }
    const controller=C.create(ctx,{service});
    /* DOMAIN_ADAPTER_SEAM_BEGIN */
    if(!ctx.runtime.isAuxiliaryWindow)ctx.modules.require('domain-adapter')?.provide?.(ctx,service,controller);
    /* DOMAIN_ADAPTER_SEAM_END */
    const adapter=ctx.modules.require('super-layout');
    const runtime=await adapter.mount(ctx,controller);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();ownedRuntime?.dispose?.();}}};
  });
})();
