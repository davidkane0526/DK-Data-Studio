(() => {
  GRSPlugins.define({
    id:'builtin.ter-analysis',
    name:'TER Analysis',
    version:'1.0.0',
    apiVersion:'1.0.0',
    order:120,
    capabilities:['ui.page','analysis.ter','chart.heatmap']
  }, async ctx => {
    ctx.ui.pages.add({
      id:'ter-max',
      buttonId:'openTerMaxPageBtn',
      pageId:'terMaxPage',
      label:'TER_max',
      order:50,
      onOpen:()=>ctx.host.renderTerMaxPage()
    });

    ctx.registry.add('analysis.providers','ter',{
      id:'ter',
      name:'Same-Vd TER',
      computeMatrix:window.Analysis.computeTerMatrix,
      computeResonant:window.Analysis.computeResonantTerForLabel
    });
    return {};
  });
})();
