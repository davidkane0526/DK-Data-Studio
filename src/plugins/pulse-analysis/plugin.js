(() => {
  DKDSPlugins.define({"id":"builtin.pulse-analysis","name":"Pulse / Read Analysis","version":"2.12.13","apiVersion":"1.19.0","requiresCore":["runtime","events","status","io","science","services","modules","project","workspace","data.types","data.artifacts","data.sources","data.importers","analysis.providers","charts","ui.dom","ui.workspace","ui.unit-templates","ui.plot-views","ui.actions","ui.selection","ui.interaction","ui.menus","ui.activities","ui.top-workspace","ui.pages","ui.portable","ui.scientific-plot","execution.tasks"],"entry":"plugin.js","enabled":true,"order":140,"description":"Pulse/read analysis using shared Controller/View/Feature runtime and core workbench infrastructure.","capabilities":["ui.activity","ui.page","analysis.pulse","project.slice","chart.timeseries","ui.top-workspace","ui.portable","ui.shortcuts","ui.selection","ui.context-menu","ui.interaction","data.types","data.sources","ui.plugin-workspace","ui.scientific-plot"],"window":{"activity":"pulse","runtime":"window-runtime.js","title":"脉冲分析","width":1480,"height":940,"minWidth":920,"minHeight":650,"dependencies":["scientific-renderer","science-common","science-import","science-pulse","platform","ui-infrastructure","plugin-kernel"],"prewarm":false,"reuse":true,"persistence":"project","scripts":["controller.js","unit-presentation.js","shared-views.js","feature-runtime.js","analysis-service.js","super-layout.js"]},"workspace":{"role":"top","activity":"pulse","icon":"▥","title":"脉冲分析"},"scripts":["controller.js","unit-presentation.js","shared-views.js","analysis-service.js","feature-runtime.js","super-layout.js","plugin.js"],"pluginType":"workbench","data":{"accepts":["science.pulse.trace"]},"styles":["plugin.css"],"pluginDependencies":[{"id":"builtin.scientific-data-contracts"}],"platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"custom","styles":["mobile.css"]}},"tasks":[{"id":"analyze-pulse-read","entry":"pulse-analysis-task.js","imports":["task-core.js"]}]},async ctx=>{
    const C=ctx.modules.require('controller'),V=ctx.modules.require('shared-views'),analysisService=ctx.modules.require('analysis-service');
    let ownedRuntime=null;
    let service=null;
    if(ctx.runtime.isAuxiliaryWindow){
      service=ctx.services.require('builtin.pulse-analysis.runtime');
    }else if(analysisService?.create){
      ownedRuntime=await analysisService.create({
        setStatus:ctx.status.set,
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        saveChartImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        scheduleSnapshot:()=>ctx.project.capture?.(),science:ctx.science,
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,artifacts:ctx.data.artifacts,
        detachSource:ref=>ctx.data.sources?.detach?.(ref),tasks:ctx.tasks
      });
      service=ownedRuntime?.service||service;
      service?.refreshSources?.();
    }
    const controller=C.create(ctx,{service});const views=V.create(controller);
    const adapter=ctx.modules.require('super-layout');
    const runtime=await adapter.mount(ctx,controller,views);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();ownedRuntime?.dispose?.();}}};
  });
})();
