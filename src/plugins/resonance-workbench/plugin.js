(() => {
  DKDSPlugins.define({
    id:'builtin.resonance-workbench',
    name:'Resonance Workbench',
    version:'3.41.2',
    apiVersion:'1.8.0',requiresCore:["runtime","events","status","io","science","services","modules","capabilities","project","workspace","parameters","data.artifacts","data.types","analysis.detectors","charts","ui.dom","ui.workspace","ui.actions","ui.selection","ui.interaction","ui.menus","ui.context-menus","ui.activities","ui.top-workspace","ui.toolbar","ui.shortcuts","ui.pages","ui.styles","ui.edit"],
    description:'Reference PluginWorkspace implementation: GRS parity on Core ScientificCurveSurface with host-invariant SUPER/TOP composition.',
    source:'builtin',
    order:100,
    capabilities:['ui.activity','ui.sidebar','ui.inspector','ui.group-charts','ui.main-tools','analysis.resonance','chart.trend','ui.top-workspace','ui.prime','ui.sub','ui.infrastructure','ui.views','ui.analysis-workbench','ui.primary','runtime.capabilities','ui.analysis-surface','runtime.capabilities.v2','ui.interaction','data.types','data.artifacts','ui.plugin-workspace','ui.scientific-plot'],
    workspace:{role:'top',activity:'resonance',icon:'∿',title:'共振分析'}
  }, async ctx => {
    const shared=ctx.modules.require('workbench-shared');
    // Domain types live with the shared feature contract, not with the shell.
    shared.registerDataTypes?.(ctx);
    const interactionRuntime=ctx.ui.interaction?.create?.('resonance',{selection:{multiple:true,defaultType:'resonance.peak'},defaultType:'resonance.peak'});
    const interactionSelection=interactionRuntime?.selection||ctx.ui.selection.model('resonance:interaction',{multiple:true,defaultType:'resonance.peak'});
    let runtime=null;
    const hostResonance=ctx.services?.get?.('resonance');
    let service=hostResonance;
    if(!ctx.runtime.isAuxiliaryWindow){
      const feature=ctx.modules.require('feature-runtime');
      runtime=await feature.createTop({
        project:ctx.project.create?.()||{},
        artifacts:ctx.data.artifacts,
        setStatus:ctx.status.set,
        scheduleSnapshot:()=>{const workspace=runtime?.service?.serialize?.();if(workspace)hostResonance?.restore?.(workspace,{legacyProject:ctx.project.create?.()||{}});ctx.project.capture?.();},
        copyTextToClipboard:text=>ctx.io.clipboard.writeText(text),
        savePlotlyImage:(plotId,baseName,format)=>ctx.ui.charts.saveImage(plotId,baseName,format),
        io:ctx.io,charts:ctx.ui.charts,dom:ctx.ui.dom,
        adapter:{mode:'super',root:ctx.ui.dom.query('#app')}
      });
      service=runtime.service;
    }
    if(!service)throw new Error('Resonance service is unavailable.');
    service.setInteractionRuntime?.({runtime:interactionRuntime,selection:interactionSelection,dataTypes:ctx.data.types,contextMenus:ctx.ui.contextMenus});
    const controller=shared.createController(service,{
      mode:ctx.runtime.isAuxiliaryWindow?'top':'super',
      science:ctx.science
    });
    const views=ctx.modules.require('view-components');
    if(ctx.runtime.isAuxiliaryWindow)return views.mountTop(ctx,controller);
    const layout=ctx.modules.require('super-layout');
    return layout.mount(ctx,controller);
  });
})();
