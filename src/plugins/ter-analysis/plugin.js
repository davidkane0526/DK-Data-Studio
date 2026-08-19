(() => {
  DKDSPlugins.define({
    id:'builtin.ter-analysis',name:'TER Analysis',version:'2.7.1',apiVersion:'1.6.0',
    description:'TER Controller + Shared Views + Feature Runtime built on DKDS workbench infrastructure.',source:'builtin',order:120,
    capabilities:["ui.activity", "ui.page", "analysis.ter", "chart.heatmap", "chart.resistance-voltage", "ui.linked-selection", "ui.sticky-inspector", "ui.chart-layout", "ui.keyboard-adjustment", "chart.export", "ui.top-workspace", "ui.infrastructure", "ui.portable", "ui.dynamic-actions", "ui.shortcuts", "ui.workbench", "ui.selection", "ui.context-menu", "ui.split", "ui.chart-surface",'ui.analysis-workbench','ui.primary','ui.prime','ui.sub','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2'],
    workspace:{role:'top',activity:'ter',icon:'▧',title:'TER分析'}
  },async ctx=>{
    const C=window.DKDSTERController,V=window.DKDSTERSharedViews;
    if(!C||!V)throw new Error('TER Analysis shared Controller/View layer not loaded.');
    let ownedRuntime=null;
    let service=ctx.host?.ter;
    if(!ctx.host.isAuxiliaryWindow&&window.DKDSTERAnalysisService?.create){
      ownedRuntime=await window.DKDSTERAnalysisService.create({
        host:ctx.host,
        project:ctx.host.makeProject?.()||{},
        bootstrap:{title:ctx.host.getActiveProjectTab?.()?.title||'当前项目'},
        setStatus:ctx.host.setStatus||(()=>{}),
        copyTextToClipboard:ctx.host.copyTextToClipboard||(()=>{}),
        savePlotlyImage:ctx.host.savePlotlyImage||(()=>{}),
        scheduleSnapshot:()=>ctx.host.captureActiveProjectTab?.()
      });
      service=ownedRuntime?.service||service;
    }
    const controller=C.create(ctx,{service});const views=V.create(controller);
    const adapter=window.DKDSTERSuperLayout;if(!adapter?.mount)throw new Error('TER Analysis layout adapter unavailable.');
    const runtime=await adapter.mount(ctx,controller,views);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();ownedRuntime?.dispose?.();}}};
  });
})();
