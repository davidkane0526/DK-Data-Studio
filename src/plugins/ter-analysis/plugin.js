(() => {
  DKDSPlugins.define({
    id:'builtin.ter-analysis',name:'TER Analysis',version:'2.5.0',apiVersion:'1.5.0',
    description:'TER Controller + Shared Views + Feature Runtime built on DKDS workbench infrastructure.',source:'builtin',order:120,
    capabilities:["ui.activity", "ui.page", "analysis.ter", "chart.heatmap", "chart.resistance-voltage", "ui.linked-selection", "ui.sticky-inspector", "ui.chart-layout", "ui.keyboard-adjustment", "chart.export", "ui.top-workspace", "ui.infrastructure", "ui.portable", "ui.dynamic-actions", "ui.shortcuts", "ui.workbench", "ui.selection", "ui.context-menu", "ui.split", "ui.chart-surface",'ui.analysis-workbench','ui.primary','ui.prime','ui.sub','runtime.capabilities'],
    workspace:{role:'top',activity:'ter',icon:'▧',title:'TER分析'}
  },async ctx=>{
    const C=window.DKDSTERController,V=window.DKDSTERSharedViews;
    if(!C||!V)throw new Error('TER Analysis shared Controller/View layer not loaded.');
    const controller=C.create(ctx);const views=V.create(controller);
    const adapter=window.DKDSTERSuperLayout;if(!adapter?.mount)throw new Error('TER Analysis layout adapter unavailable.');
    const runtime=await adapter.mount(ctx,controller,views);
    return {...runtime,deactivate(){try{runtime?.deactivate?.();}finally{controller.dispose?.();}}};
  });
})();
