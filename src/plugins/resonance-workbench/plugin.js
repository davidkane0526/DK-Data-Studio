(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'3.39.0',
    apiVersion:'1.7.0',
    description:'Reference PluginWorkspace implementation: GRS parity on Core ScientificCurveSurface with host-invariant SUPER/TOP composition.',
    source:'builtin',
    order:100,
    capabilities:['ui.activity','ui.sidebar','ui.inspector','ui.group-charts','ui.main-tools','analysis.resonance','chart.trend','ui.top-workspace','ui.prime','ui.sub','ui.infrastructure','ui.views','ui.analysis-workbench','ui.primary','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','data.artifacts','ui.plugin-workspace','ui.scientific-plot'],
    workspace:{role:'top',activity:'resonance',icon:'∿',title:'共振分析'}
  }, async ctx => {
    const shared=window.DKDSResonanceWorkbenchShared;
    if(!shared)throw new Error('Resonance shared workbench layer is not loaded.');
    // Domain types live with the shared feature contract, not with the shell.
    shared.registerDataTypes?.(ctx);
    const interactionRuntime=ctx.ui.interaction?.create?.('resonance',{selection:{multiple:true,defaultType:'resonance.peak'},defaultType:'resonance.peak'});
    const interactionSelection=interactionRuntime?.selection||ctx.ui.selection.model('resonance:interaction',{multiple:true,defaultType:'resonance.peak'});
    let runtime=null;
    let service=ctx.host?.resonance;
    if(!ctx.host.isAuxiliaryWindow){
      const feature=window.DKDSResonanceFeatureRuntime;
      if(!feature?.createTop)throw new Error('Resonance shared feature runtime is unavailable.');
      runtime=await feature.createTop({
        host:ctx.host,
        project:ctx.host.makeProject?.()||{},
        setStatus:ctx.host.setStatus||(()=>{}),
        scheduleSnapshot:()=>{const workspace=runtime?.service?.serialize?.();if(workspace)ctx.host.applyResonanceWorkspace?.(workspace);},
        copyTextToClipboard:ctx.host.copyTextToClipboard||(()=>{}),
        savePlotlyImage:ctx.host.savePlotlyImage||(()=>{}),
        adapter:{mode:'super',root:document.querySelector('#app')}
      });
      service=runtime.service;
    }
    if(!service)throw new Error('Resonance service is unavailable.');
    service.setInteractionRuntime?.({runtime:interactionRuntime,selection:interactionSelection,dataTypes:ctx.data.types,contextMenus:ctx.ui.contextMenus});
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
