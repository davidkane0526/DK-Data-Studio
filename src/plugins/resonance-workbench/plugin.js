(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'2.6.0',
    apiVersion:'1.4.0',
    description:'Resonance workbench composed from plugin-owned shared Controller and View components; SUPER and TOP only adapt presentation/layout.',
    source:'builtin',
    order:100,
    capabilities:['ui.activity','ui.sidebar','ui.inspector','ui.group-charts','ui.main-tools','analysis.resonance','chart.trend','ui.top-workspace','ui.prime','ui.sub','ui.infrastructure','ui.views'],
    workspace:{role:'top',activity:'resonance',icon:'∿',title:'共振分析'}
  }, async ctx => {
    const shared=window.DKDSResonanceWorkbenchShared;
    if(!shared)throw new Error('Resonance shared workbench layer is not loaded.');
    const service=ctx.host?.resonance;
    if(!service)throw new Error('Resonance service is unavailable.');
    const controller=shared.createController(service,{
      mode:ctx.host.isAuxiliaryWindow?'top':'super',
      science:window.DKDSScience,
      host:ctx.host
    });
    const views=window.DKDSResonanceViewComponents;
    if(!views)throw new Error('Resonance shared View layer is not loaded.');
    if(ctx.host.isAuxiliaryWindow)return views.mountTop(ctx,controller);
    const layout=window.DKDSResonanceSuperLayout;
    if(!layout?.mount)throw new Error('Resonance SUPER layout adapter is not loaded.');
    return layout.mount(ctx,controller);
  });
})();
