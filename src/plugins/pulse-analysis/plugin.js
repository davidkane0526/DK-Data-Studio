(() => {
  DKDSPlugins.define({id:'builtin.pulse-analysis',pluginType:'workbench',name:'Pulse / Read Analysis',version:'2.10.6',apiVersion:'1.18.0',requiresCore:["runtime","events","status","io","science","services","modules","project","workspace","data.types","data.artifacts","data.sources","data.importers","analysis.providers","charts","ui.dom","ui.workspace","ui.plot-views","ui.actions","ui.selection","ui.interaction","ui.menus","ui.activities","ui.top-workspace","ui.pages","ui.portable","ui.scientific-plot"],pluginDependencies:[{id:'builtin.scientific-data-contracts',range:'^1.0.0'}],
    description:'Pulse/read Controller + Shared Views + Feature Runtime using common workbench infrastructure.',source:'builtin',order:140,capabilities:["ui.activity", "ui.page", "analysis.pulse", "project.slice", "chart.timeseries", "ui.top-workspace",  "ui.portable",  "ui.shortcuts",  "ui.selection", "ui.context-menu",  'ui.prime','ui.sub','ui.interaction','data.types','data.sources','ui.plugin-workspace','ui.scientific-plot'],workspace:{role:'top',activity:'pulse',icon:'▥',title:'脉冲分析'},data:{accepts:['science.pulse.trace']}},async ctx=>{
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
        scheduleSnapshot:()=>ctx.project.capture?.(),
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,artifacts:ctx.data.artifacts,
        detachSource:ref=>ctx.data.sources?.detach?.(ref)
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
