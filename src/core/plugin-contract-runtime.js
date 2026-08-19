(() => {
  if(window.DKDSPluginContract)return;
  const VERSION='1.0.0';
  const API_VERSION='1.8.0';
  const REQUIREMENTS=Object.freeze({
    'runtime':api=>!!api?.runtime,
    'events':api=>!!api?.events,
    'status':api=>!!api?.status,
    'io':api=>!!api?.io,
    'science':api=>!!api?.science,
    'services':api=>!!api?.services,
    'modules':api=>!!api?.modules,
    'recipes':api=>!!api?.recipes,
    'capabilities':api=>!!api?.capabilities,
    'state':api=>!!api?.state,
    'project':api=>!!api?.project,
    'workspace':api=>!!api?.workspace,
    'parameters':api=>!!api?.parameters,
    'data.flow':api=>!!api?.data?.flow,
    'data.artifacts':api=>!!api?.data?.artifacts,
    'data.types':api=>!!api?.data?.types,
    'data.model':api=>!!api?.data?.model,
    'data.formula':api=>!!api?.data?.formula,
    'workflow':api=>!!api?.workflow,
    'analysis.providers':api=>!!api?.analysis?.providers,
    'analysis.detectors':api=>!!api?.analysis?.detectors,
    'charts':api=>!!api?.ui?.charts,
    'charts.providers':api=>!!api?.charts,
    'ui.dom':api=>!!api?.ui?.dom,
    'ui.components':api=>!!api?.ui?.components,
    'ui.workspace':api=>!!api?.ui?.pluginWorkspace,
    'ui.scientific-plot':api=>!!api?.ui?.scientificPlot,
    'ui.plot-views':api=>!!api?.ui?.plotViews,
    'ui.actions':api=>!!api?.ui?.actions,
    'ui.selection':api=>!!api?.ui?.selection,
    'ui.interaction':api=>!!api?.ui?.interaction,
    'ui.menus':api=>!!api?.ui?.menus,
    'ui.context-menus':api=>!!api?.ui?.contextMenus,
    'ui.activities':api=>!!api?.ui?.activities,
    'ui.top-workspace':api=>!!api?.ui?.topWorkspace,
    'ui.toolbar':api=>!!api?.ui?.toolbar,
    'ui.status-bar':api=>!!api?.ui?.statusBar,
    'ui.shortcuts':api=>!!api?.ui?.shortcuts,
    'ui.pages':api=>!!api?.ui?.pages,
    'ui.styles':api=>!!api?.ui?.styles,
    'ui.portable':api=>!!api?.ui?.portable,
    'ui.edit':api=>!!api?.ui?.edit
  });
  const ids=Object.freeze(Object.keys(REQUIREMENTS));
  const normalize=list=>[...new Set((Array.isArray(list)?list:[]).map(v=>String(v||'').trim()).filter(Boolean))];
  function validateManifest(manifest={}){
    const errors=[];
    const requested=normalize(manifest.requiresCore);
    for(const id of requested)if(!REQUIREMENTS[id])errors.push(`Unknown Core requirement: ${id}`);
    const api=String(manifest.apiVersion||API_VERSION);
    if(!/^1\.(?:[0-8])(?:\.\d+)?$/.test(api))errors.push(`Unsupported Plugin API: ${api}`);
    return Object.freeze({ok:errors.length===0,errors:Object.freeze(errors),requirements:Object.freeze(requested)});
  }
  function assertApi(api,manifest={}){
    const manifestCheck=validateManifest(manifest);
    if(!manifestCheck.ok)throw new Error(manifestCheck.errors.join(' '));
    const missing=manifestCheck.requirements.filter(id=>!REQUIREMENTS[id]?.(api));
    if(missing.length)throw new Error(`Missing Core plugin requirements: ${missing.join(', ')}`);
    return true;
  }
  window.DKDSPluginContract=Object.freeze({VERSION,API_VERSION,requirements:ids,validateManifest,assertApi});
})();
