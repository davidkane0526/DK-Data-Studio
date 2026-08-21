(() => {
  DKDSPlugins.define({
    id:'builtin.ter-analysis',name:'TER Analysis',version:'3.10.0',apiVersion:'1.8.0',requiresCore:["runtime","events","status","io","science","performance","services","modules","project","workspace","data.artifacts","data.types","data.pipeline","data.transforms","analysis.providers","analysis.algorithms","charts","parameters","ui.dom","ui.workspace","ui.plot-views","ui.actions","ui.selection","ui.interaction","ui.menus","ui.activities","ui.top-workspace","ui.shortcuts","ui.pages","ui.styles","ui.portable","ui.scientific-plot"],
    algorithmCategories:['transport-transform','transport-scalar-field','ter-analysis'],
    description:'TER Controller + Shared Views + Feature Runtime built on DKDS workbench infrastructure.',source:'builtin',order:120,
    capabilities:["ui.activity", "ui.page", "analysis.ter", "chart.heatmap", "chart.transformed-heatmap", "chart.resistance-voltage", "ui.linked-selection", "ui.sticky-inspector", "ui.chart-layout", "ui.keyboard-adjustment", "chart.export", "ui.top-workspace", "ui.infrastructure", "ui.portable", "ui.dynamic-actions", "ui.shortcuts", "ui.workbench", "ui.selection", "ui.context-menu", "ui.split", "ui.chart-surface",'ui.analysis-workbench','ui.primary','ui.prime','ui.sub','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','data.artifacts','data.pipeline','ui.plugin-workspace','ui.scientific-plot'],
    workspace:{role:'top',activity:'ter',icon:'▧',title:'TER分析'}
  },async ctx=>{
    const C=ctx.modules.require('controller'),V=ctx.modules.require('shared-views'),analysisService=ctx.modules.require('analysis-service');
    let ownedRuntime=null;
    let service=ctx.services?.get?.('ter');
    if(!ctx.runtime.isAuxiliaryWindow&&analysisService?.create){
      ownedRuntime=await analysisService.create({
        project:ctx.project.create?.()||{},
        bootstrap:{title:ctx.project.current?.()?.title||'当前项目'},
        getVisibility:()=>ctx.project.create?.()?.scanVisibility||[],
        artifacts:ctx.data.artifacts,
        setStatus:ctx.status.set,
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        savePlotlyImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        scheduleSnapshot:()=>ctx.project.capture?.(),
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,performance:ctx.performance,pipeline:ctx.data.pipeline,transforms:ctx.data.transforms,algorithms:ctx.analysis.algorithms
      });
      service=ownedRuntime?.service||service;
    }
    const controller=C.create(ctx,{service});const views=V.create(controller);
    const adapter=ctx.modules.require('super-layout');
    const runtime=await adapter.mount(ctx,controller,views);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();ownedRuntime?.dispose?.();}}};
  });
})();
