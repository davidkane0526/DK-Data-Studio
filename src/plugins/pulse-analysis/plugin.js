(() => {
  GRSPlugins.define({
    id:'builtin.pulse-analysis',
    name:'Pulse / Read Analysis',
    version:'1.0.0',
    apiVersion:'1.0.0',
    order:140,
    capabilities:['ui.page','analysis.pulse','project.slice','chart.timeseries']
  }, async ctx => {
    const h=ctx.host;

    ctx.ui.pages.add({
      id:'pulse-analysis',
      buttonId:'openPulseAnalysisPageBtn',
      pageId:'pulseAnalysisPage',
      label:'脉冲分析',
      buttonClass:'accent-soft',
      order:60,
      onOpen:()=>h.renderPulseAnalysis()
    });

    ctx.project.registerSlice('workspace',{
      serialize:()=>h.pulse.serialize(),
      restore:(data,{legacyProject})=>{
        const source=data ?? legacyProject?.pulseAnalysis ?? null;
        h.pulse.restore(source);
      },
      reset:()=>h.pulse.reset()
    });

    ctx.registry.add('analysis.providers','pulse-read',{
      id:'pulse-read',
      name:'Pulse / read transient extraction',
      analyze:window.Analysis.analyzePulseReadData
    });
    return {};
  });
})();
