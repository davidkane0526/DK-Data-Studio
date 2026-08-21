(() => {
  if(window.DKDSPluginContract)return;
  const VERSION='1.0.0';
  const API_VERSION='1.13.0';
  const REQUIREMENTS=Object.freeze({
    'runtime':api=>!!api?.runtime,
    'events':api=>!!api?.events,
    'status':api=>!!api?.status,
    'io':api=>!!api?.io,
    'science':api=>!!api?.science,
    'performance':api=>!!api?.performance,
    'services':api=>!!api?.services,
    'modules':api=>!!api?.modules,
    'recipes':api=>!!api?.recipes,
    'capabilities':api=>!!api?.capabilities,
    'state':api=>!!api?.state,
    'project':api=>!!api?.project,
    'workspace':api=>!!api?.workspace,
    'parameters':api=>!!api?.parameters,
    'data.flow':api=>!!api?.data?.flow,
    'data.reactive':api=>!!api?.data?.reactive,
    'data.pipeline':api=>!!api?.data?.pipeline,
    'data.transforms':api=>!!api?.data?.transforms,
    'data.artifacts':api=>!!api?.data?.artifacts,
    'data.entities':api=>!!api?.data?.entities,
    'data.types':api=>!!api?.data?.types,
    'data.model':api=>!!api?.data?.model,
    'data.formula':api=>!!api?.data?.formula,
    'data.sources':api=>!!api?.data?.sources,
    'data.importers':api=>!!api?.data?.importers,
    'data.import-workbench':api=>!!api?.data?.importWorkbench,
    'workflow':api=>!!api?.workflow,
    'analysis.providers':api=>!!api?.analysis?.providers,
    'analysis.algorithms':api=>!!api?.analysis?.algorithms,
    'analysis.detectors':api=>!!api?.analysis?.detectors,
    'charts':api=>!!api?.ui?.charts,
    'charts.providers':api=>!!api?.charts,
    'ui.dom':api=>!!api?.ui?.dom,
    'ui.components':api=>!!api?.ui?.components,
    'ui.workspace':api=>!!api?.ui?.pluginWorkspace,
    'ui.scientific-plot':api=>!!api?.ui?.scientificPlot,
    'ui.plot-views':api=>!!api?.ui?.plotViews,
    'ui.table':api=>!!api?.ui?.tables,
    'ui.settings':api=>!!api?.ui?.settings,
    'ui.actions':api=>!!api?.ui?.actions,
    'ui.selection':api=>!!api?.ui?.selection,
    'ui.interaction':api=>!!api?.ui?.interaction,
    'ui.interaction-behavior':api=>!!api?.ui?.interactionBehaviors,
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
    if(!/^1\.(?:[0-9]+)(?:\.\d+)?$/.test(api))errors.push(`Unsupported Plugin API: ${api}`);
    const categories=normalize(manifest.algorithmCategories);
    if(manifest.algorithmCategories!==undefined&&!Array.isArray(manifest.algorithmCategories))errors.push('algorithmCategories must be an array.');
    for(const category of categories)if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(category))errors.push(`Invalid algorithm category: ${category}`);
    if(manifest.algorithmProvider!==undefined&&typeof manifest.algorithmProvider!=='boolean')errors.push('algorithmProvider must be boolean.');
    if(manifest.algorithmProvider===true&&!categories.length)errors.push('algorithmProvider requires algorithmCategories.');
    if(categories.length&&!requested.includes('analysis.algorithms'))errors.push('algorithmCategories requires Core requirement analysis.algorithms.');
    const provides=Array.isArray(manifest.algorithmProvides)?manifest.algorithmProvides:[];
    if(manifest.algorithmProvides!==undefined&&!Array.isArray(manifest.algorithmProvides))errors.push('algorithmProvides must be an array.');
    const provideKeys=new Set();
    for(const row of provides){
      const category=String(row?.category||'').trim(),id=String(row?.id||row?.algorithmId||'').trim(),version=String(row?.version||row?.algorithmVersion||'').trim();
      if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(category)||!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)||!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))errors.push(`Invalid algorithmProvides entry: ${category}/${id}@${version}`);
      if(category&&!categories.includes(category))errors.push(`algorithmProvides category not declared: ${category}`);
      const key=`${category}::${id}@${version}`;if(provideKeys.has(key))errors.push(`Duplicate algorithmProvides entry: ${key}`);provideKeys.add(key);
    }
    if(provides.length&&manifest.algorithmProvider!==true)errors.push('algorithmProvides requires algorithmProvider=true.');
    if(manifest.compatibility!==undefined&&(!manifest.compatibility||typeof manifest.compatibility!=='object'||Array.isArray(manifest.compatibility)))errors.push('compatibility must be an object.');
    const dependencies=Array.isArray(manifest.pluginDependencies)?manifest.pluginDependencies:[];
    if(manifest.pluginDependencies!==undefined&&!Array.isArray(manifest.pluginDependencies))errors.push('pluginDependencies must be an array.');
    const dependencyIds=new Set();
    for(const row of dependencies){const id=String(row?.id||'').trim(),range=String(row?.range||'').trim();if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)||!range)errors.push(`Invalid plugin dependency: ${id}@${range}`);if(dependencyIds.has(id))errors.push(`Duplicate plugin dependency: ${id}`);dependencyIds.add(id);}
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
