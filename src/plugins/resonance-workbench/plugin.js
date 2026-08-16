(() => {
  GRSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'1.0.0',
    apiVersion:'1.0.0',
    order:100,
    capabilities:['ui.page','ui.panel','analysis.resonance','chart.trend']
  }, async ctx => {
    const h=ctx.host;

    ctx.ui.panels.addToggle({
      id:'physics',
      buttonId:'togglePhysicsBtn',
      panelId:'physicsPanel',
      label:'物理机制',
      order:20,
      toggle:()=>h.togglePhysicsPanel()
    });

    ctx.ui.pages.add({
      id:'spacing',
      buttonId:'openSpacingPageBtn',
      pageId:'spacingPage',
      label:'峰间距',
      order:30,
      onOpen:()=>h.renderSpacingPage()
    });

    ctx.ui.pages.add({
      id:'gate-analysis',
      buttonId:'openGateAnalysisPageBtn',
      pageId:'gateAnalysisPage',
      label:'栅压分析',
      buttonClass:'accent-soft',
      order:40,
      onOpen:()=>h.renderGateAnalysis()
    });

    ctx.registry.add('analysis.providers','resonance',{
      id:'resonance',
      name:'Resonant tunneling / peak-ridge analysis',
      detector:window.Analysis.detectPeaks,
      buildSweeps:window.Analysis.buildSweeps,
      metrics:window.Analysis.peakMetrics
    });

    ctx.registry.add('chart.themes','resonance-default',{
      id:'resonance-default',
      label:'Resonance default',
      semantics:{
        forward:'cool',
        reverse:'warm',
        peakCategory:'categorical'
      }
    });

    return {};
  });
})();
