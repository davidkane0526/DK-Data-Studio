(() => {
  DKDSPlugins.define({id:'builtin.pulse-analysis',name:'Pulse / Read Analysis',version:'2.7.0',apiVersion:'1.7.0',description:'Pulse/read Controller + Shared Views + Feature Runtime using common workbench infrastructure.',source:'builtin',order:140,capabilities:["ui.activity", "ui.page", "analysis.pulse", "project.slice", "chart.timeseries", "ui.top-workspace", "ui.infrastructure", "ui.portable", "ui.dynamic-actions", "ui.shortcuts", "ui.workbench", "ui.selection", "ui.context-menu", "ui.split", "ui.chart-surface",'ui.analysis-workbench','ui.primary','ui.prime','ui.sub','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','ui.plugin-workspace'],workspace:{role:'top',activity:'pulse',icon:'▥',title:'脉冲分析'}},async ctx=>{
    const C=window.DKDSPulseController,V=window.DKDSPulseSharedViews;if(!C||!V)throw new Error('Pulse / Read Analysis shared Controller/View layer not loaded.');
    let ownedRuntime=null;
    let service=ctx.host?.pulse;
    if(!ctx.host.isAuxiliaryWindow&&window.DKDSPulseAnalysisService?.create){
      ownedRuntime=await window.DKDSPulseAnalysisService.create({
        host:ctx.host,
        setStatus:ctx.host.setStatus||(()=>{}),
        copyTextToClipboard:ctx.host.copyTextToClipboard||(()=>{}),
        savePlotlyImage:ctx.host.savePlotlyImage||(()=>{}),
        scheduleSnapshot:()=>ctx.host.captureActiveProjectTab?.()
      });
      service=ownedRuntime?.service||service;
    }
    const controller=C.create(ctx,{service});const views=V.create(controller);
    const adapter=window.DKDSPulseSuperLayout;if(!adapter?.mount)throw new Error('Pulse / Read Analysis layout adapter unavailable.');
    const runtime=await adapter.mount(ctx,controller,views);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();ownedRuntime?.dispose?.();}}};
  });
})();
