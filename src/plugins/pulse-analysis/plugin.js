(() => {
  DKDSPlugins.define({id:'builtin.pulse-analysis',pluginType:'workbench',name:'Pulse / Read Analysis',version:'2.10.0',apiVersion:'1.13.0',requiresCore:["runtime","events","status","io","science","services","modules","project","workspace","data.types","data.artifacts","data.sources","data.importers","data.import-workbench","analysis.providers","charts","ui.dom","ui.workspace","ui.plot-views","ui.actions","ui.selection","ui.interaction","ui.menus","ui.activities","ui.top-workspace","ui.pages","ui.portable","ui.scientific-plot"],description:'Pulse/read Controller + Shared Views + Feature Runtime using common workbench infrastructure.',source:'builtin',order:140,capabilities:["ui.activity", "ui.page", "analysis.pulse", "project.slice", "chart.timeseries", "ui.top-workspace", "ui.infrastructure", "ui.portable", "ui.dynamic-actions", "ui.shortcuts", "ui.workbench", "ui.selection", "ui.context-menu", "ui.split", "ui.chart-surface",'ui.analysis-workbench','ui.primary','ui.prime','ui.sub','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','data.sources','data.import-workbench','ui.plugin-workspace','ui.scientific-plot'],workspace:{role:'top',activity:'pulse',icon:'▥',title:'脉冲分析'},data:{accepts:['science.pulse.trace']}},async ctx=>{
    const C=ctx.modules.require('controller'),V=ctx.modules.require('shared-views'),analysisService=ctx.modules.require('analysis-service');
    let ownedRuntime=null;
    let service=null;
    if(ctx.runtime.isAuxiliaryWindow){
      service=ctx.services.require('builtin.pulse-analysis.runtime');
    }else if(analysisService?.create){
      const migrateLegacySource=source=>{
        const provider=ctx.data.importers?.list?.().find(row=>row?.id==='pulse-text');if(!provider?.parseArtifacts||!source?.text)return null;
        const parsed=provider.parseArtifacts({name:source.name,path:source.path,text:source.text,encoding:source.encoding||'auto'},provider.defaultOptions?.()||{});
        const artifact=parsed?.artifacts?.[0];if(!artifact)return null;
        artifact.metadata={...(artifact.metadata||{}),importedSource:true,importerId:'pulse-text',dataAssignments:['builtin.pulse-analysis']};
        ctx.data.artifacts.upsert(artifact);return artifact;
      };
      ownedRuntime=await analysisService.create({
        setStatus:ctx.status.set,
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        savePlotlyImage:(plotId,baseName,format)=>ctx.ui.scientificPlot.saveImage(plotId,baseName,format),
        scheduleSnapshot:()=>ctx.project.capture?.(),
        io:ctx.io,charts:ctx.ui.scientificPlot,dom:ctx.ui.dom,artifacts:ctx.data.artifacts,
        openImportWorkbench:options=>ctx.data.importWorkbench?.open?.(options||{}),
        detachSource:ref=>ctx.data.sources?.detach?.(ref),
        migrateLegacySource
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
