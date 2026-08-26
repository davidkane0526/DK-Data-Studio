(() => {
  const definitions = [];
  const active = new Map();
  const disabled = new Map();
  const registries = new Map();
  const projectSlices = new Map();
  const cleanupByPlugin = new Map();
  const eventListeners = new Map();
  const preferenceStorageKey = 'dkds.plugin.preferences.v1';
  const prewarmPreferenceStorageKey = 'dkds.plugin.prewarm.v1';
  const superPreferenceStorageKey = 'dkds.workspace.super.v1';
  const primePlacementStorageKey = 'dkds.workspace.prime-placement.v1';
  let preferences = null;
  let prewarmPreferences = null;
  let host = null;
  let loadingPromise = null;
  let externalLoadingPromise = null;
  const externalPackages = new Map();
  const overridePackages = new Map();
  const overrideLoadErrors = [];
  const externalLoadErrors = [];
  let activeActivityId = null;
  let superPluginId = null;
  let primePlacements = null;
  let shellBound = false;
  let shellResizeObserver = null;
  let contextOverflowPopup = null;
  const commandMenuPortals = new WeakMap();

  const API_VERSION = '1.17.0';

  function readPreferences() {
    if (preferences) return preferences;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(preferenceStorageKey) || '{}') || {};
    } catch {}
    preferences = saved && typeof saved === 'object' ? saved : {};
    return preferences;
  }

  function writePreferences() {
    try { localStorage.setItem(preferenceStorageKey, JSON.stringify(readPreferences())); } catch {}
  }

  function preferenceFor(id) {
    const value = readPreferences()[id];
    return typeof value === 'boolean' ? value : undefined;
  }

  function isSystemLockedDefinition(definition) {
    const manifest=definition?.manifest||{};return String(manifest.source||'builtin')==='builtin'&&(pluginTypeForManifest(manifest)==='foundation'||manifest.systemCritical===true);
  }

  function isDefinitionEnabled(definition) {
    if(isSystemLockedDefinition(definition)) return true;
    const saved = preferenceFor(definition.manifest.id);
    return saved === undefined ? definition.manifest.enabled !== false : saved;
  }

  function setPreference(id, enabled) {
    readPreferences()[id] = !!enabled;
    writePreferences();
  }

  function clearPreference(id) {
    delete readPreferences()[id];
    writePreferences();
  }

  function readPrewarmPreferences() {
    if (prewarmPreferences) return prewarmPreferences;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(prewarmPreferenceStorageKey) || '{}') || {}; } catch {}
    prewarmPreferences = saved && typeof saved === 'object' ? saved : {};
    return prewarmPreferences;
  }

  function writePrewarmPreferences() {
    try { localStorage.setItem(prewarmPreferenceStorageKey, JSON.stringify(readPrewarmPreferences())); } catch {}
  }

  function prewarmPreferenceFor(id) {
    const value = readPrewarmPreferences()[id];
    return typeof value === 'boolean' ? value : undefined;
  }

  function defaultPrewarmFor(definition) {
    const spec=definition?.manifest?.window;
    return !!(spec&&String(spec.activity||'').trim()) && spec.prewarm !== false;
  }

  function isPrewarmEnabled(definition) {
    if(!definition?.manifest?.window?.activity)return false;
    const saved=prewarmPreferenceFor(definition.manifest.id);
    return saved===undefined?defaultPrewarmFor(definition):saved;
  }

  function setPrewarmPreference(id, enabled) {
    readPrewarmPreferences()[id]=!!enabled;
    writePrewarmPreferences();
  }

  function clearPrewarmPreference(id) {
    delete readPrewarmPreferences()[id];
    writePrewarmPreferences();
  }

  function definitionById(id) {
    return definitions.find(d => d.manifest.id === id) || null;
  }

  const DEFAULT_PLUGIN_ICONS=Object.freeze({
    foundation:'◆',data:'▦',algorithm:'ƒ',workbench:'◇',task:'✓',tool:'⌁',theme:'◐',extension:'⬡',developer:'⌘'
  });
  function defaultPluginIcon(manifest={}) {
    const explicit=String(manifest?.icon||manifest?.workspace?.icon||'').trim();
    return explicit||DEFAULT_PLUGIN_ICONS[pluginTypeForManifest(manifest)]||'⬡';
  }

  function workspaceMeta(manifest={}) {
    const raw=manifest?.workspace&&typeof manifest.workspace==='object'?manifest.workspace:{};
    const role=String(raw.role||'').trim().toLowerCase();
    return {
      role:role==='top'?'top':role==='support'?'support':'',
      activity:String(raw.activity||'').trim(),
      icon:String(raw.icon||manifest.icon||defaultPluginIcon(manifest)).trim(),
      title:String(raw.title||manifest.name||manifest.id||'').trim()
    };
  }

  function isTopDefinition(definition) {
    return workspaceMeta(definition?.manifest).role==='top';
  }
  function isSuperEligibleDefinition(definition){return isTopDefinition(definition)&&!isSystemLockedDefinition(definition);}

  function readSuperPreference() {
    try {
      const value=localStorage.getItem(superPreferenceStorageKey);
      return value===null?undefined:String(value||'').trim();
    } catch { return undefined; }
  }

  function writeSuperPreference(pluginId) {
    try { localStorage.setItem(superPreferenceStorageKey,String(pluginId||'')); } catch {}
  }

  function readPrimePlacements() {
    if(primePlacements)return primePlacements;
    let saved={};
    try { saved=JSON.parse(localStorage.getItem(primePlacementStorageKey)||'{}')||{}; } catch {}
    primePlacements=saved&&typeof saved==='object'?saved:{};
    return primePlacements;
  }

  function writePrimePlacements() {
    try { localStorage.setItem(primePlacementStorageKey,JSON.stringify(readPrimePlacements())); } catch {}
  }

  function primePlacementKey(pluginId,id) { return `${pluginId}:${id}`; }

  function topWorkspaceRows() {
    return listContributions('ui.topWorkspaces').slice();
  }

  function topWorkspaceForPlugin(pluginId) {
    return topWorkspaceRows().find(row=>row.pluginId===pluginId)?.value||null;
  }

  function topActivityIdForPlugin(pluginId) {
    const contract=topWorkspaceForPlugin(pluginId);
    if(contract?.activity)return String(contract.activity);
    const definition=definitionById(pluginId);
    const fromManifest=workspaceMeta(definition?.manifest).activity;
    if(fromManifest)return fromManifest;
    return activityRows().find(row=>row.pluginId===pluginId&&row.value?.role==='top')?.value?.id||'';
  }

  function superState() {
    const definition=superPluginId?definitionById(superPluginId):null;
    const contract=superPluginId?topWorkspaceForPlugin(superPluginId):null;
    const activityId=superPluginId?topActivityIdForPlugin(superPluginId):'';
    return {
      pluginId:superPluginId||'',
      activityId,
      configured:!!superPluginId,
      available:!!(definition&&active.has(superPluginId)&&contract&&activityId),
      contract:contract||null
    };
  }

  function validateTopWorkspaceSpec(pluginId,spec={}) {
    const definition=definitionById(pluginId);
    if(!definition||!isTopDefinition(definition))throw new Error(`Plugin ${pluginId} must declare workspace.role=top before registering a TOP workspace.`);
    const activity=String(spec.activity||workspaceMeta(definition.manifest).activity||'').trim();
    if(!activity)throw new Error(`TOP workspace ${pluginId} must declare an activity.`);
    const layout=spec.layout&&typeof spec.layout==='object'?spec.layout:{};
    const mode=String(layout.mode||'split').trim().toLowerCase();
    if(!['split','native'].includes(mode))throw new Error(`TOP workspace ${pluginId} has unsupported layout mode: ${mode}`);
    if(mode==='split'&&(!layout.left||!layout.main))throw new Error(`TOP workspace ${pluginId} split layout must declare both layout.left and layout.main regions.`);
    const normalizeRegion=(region,name)=>{
      const raw=region&&typeof region==='object'?region:{};
      const selectors=[];
      for(const value of [raw.selector,raw.mount,...(Array.isArray(raw.selectors)?raw.selectors:[])]){
        const selector=String(value||'').trim();
        if(selector&&!selectors.includes(selector))selectors.push(selector);
      }
      if(!selectors.length)throw new Error(`TOP workspace ${pluginId} layout.${name} must declare selector/mount/selectors.`);
      return Object.freeze({...raw,selectors:Object.freeze(selectors)});
    };
    const root=layout.root&&typeof layout.root==='object'?layout.root:{};
    const rootSelector=String(root.selector||layout.rootSelector||'').trim();
    if(mode==='native'&&!rootSelector)throw new Error(`TOP workspace ${pluginId} native layout must declare layout.root.selector.`);
    const left=layout.left?normalizeRegion(layout.left,'left'):null;
    const main=layout.main?normalizeRegion(layout.main,'main'):null;
    const flatten=Object.freeze((Array.isArray(layout.flatten)?layout.flatten:[]).map(String).map(x=>x.trim()).filter(Boolean));
    return Object.freeze({
      id:String(spec.id||activity),
      activity,
      label:String(spec.label||definition.manifest.name||activity),
      icon:String(spec.icon||workspaceMeta(definition.manifest).icon||''),
      layout:Object.freeze({
        mode,
        root:Object.freeze({...root,selector:rootSelector}),
        left,
        main,
        flatten,
        primary:Object.freeze(layout.primary&&typeof layout.primary==='object'?{...layout.primary}:{}),
        prime:Object.freeze(Array.isArray(layout.prime)?layout.prime.map(row=>Object.freeze({...row})):[]),
        sub:Object.freeze(Array.isArray(layout.sub)?layout.sub.map(row=>Object.freeze({...row})):[])
      }),
      pluginId
    });
  }

  function registerTopWorkspace(pluginId,spec={}) {
    if(topWorkspaceForPlugin(pluginId))throw new Error(`Plugin ${pluginId} already registered a TOP workspace.`);
    const value=validateTopWorkspaceSpec(pluginId,spec);
    registerTypedContribution(pluginId,'ui.topWorkspaces',value.id,value);
    return value;
  }

  function registerPrimeContribution(pluginId,id,spec={}) {
    const activity=String(spec.activity||topActivityIdForPlugin(pluginId)||'').trim();
    const placements=(Array.isArray(spec.placements)&&spec.placements.length?spec.placements:['float','right','bottom']).map(x=>String(x).trim().toLowerCase());
    const allowed=new Set(['float','right','bottom']);
    if(!placements.every(x=>allowed.has(x)))throw new Error(`Invalid PRIME placement for ${pluginId}/${id}.`);
    const unique=[...new Set(placements)];
    const requestedDefault=String(spec.defaultPlacement||unique[0]||'float').trim().toLowerCase();
    const defaultPlacement=unique.includes(requestedDefault)?requestedDefault:unique[0];
    const value=Object.freeze({
      ...spec,id,activity,pluginId,
      target:String(spec.target||'').trim(),
      portable:spec.portable===true,
      persistPlacement:spec.persistPlacement!==false,
      defaultPlacement,
      placements:Object.freeze(unique)
    });
    registerTypedContribution(pluginId,'ui.prime',id,value);
    return value;
  }

  function primeContribution(pluginId,id) {
    return listContributions('ui.prime').find(row=>row.pluginId===pluginId&&row.id===id)?.value||null;
  }

  function primeRowsForPlugin(pluginId) {
    return listContributions('ui.prime').filter(row=>row.pluginId===pluginId);
  }

  function primePlacementFor(pluginId,id) {
    const value=primeContribution(pluginId,id);
    if(!value)return '';
    const saved=value.persistPlacement?String(readPrimePlacements()[primePlacementKey(pluginId,id)]||'').trim().toLowerCase():'';
    if(saved&&value.placements.includes(saved))return saved;
    if(typeof value.getPlacement==='function'){
      try {
        const live=String(value.getPlacement()||'').trim().toLowerCase();
        if(value.placements.includes(live))return live;
      } catch(err){ console.warn(`[DKDS PRIME placement:${pluginId}/${id}]`,err); }
    }
    return value.defaultPlacement||value.placements[0]||'float';
  }

  async function placePrimeContribution(pluginId,id,placement,{persist=true,reason='user'}={}) {
    const value=primeContribution(pluginId,id);
    if(!value)throw new Error(`PRIME contribution not found: ${pluginId}/${id}`);
    const next=String(placement||'').trim().toLowerCase();
    if(!value.placements.includes(next))throw new Error(`PRIME ${pluginId}/${id} does not allow placement: ${next}`);
    if(!host?.isAuxiliaryWindow&&superPluginId&&superPluginId!==pluginId){
      throw new Error(`只有当前 SUPER 的 PRIME 可以放置到主界面：${pluginId}/${id}`);
    }
    let result;
    if(typeof value.place==='function')result=await value.place(next,{pluginId,id,reason,host});
    else if(typeof host?.placePrime==='function')result=await host.placePrime(value,next,{pluginId,id,reason});
    else throw new Error(`PRIME ${pluginId}/${id} 未提供 placement adapter，也没有可用的宿主 placement manager。`);
    if(result===false)throw new Error(`PRIME ${pluginId}/${id} placement adapter rejected: ${next}`);
    if(persist&&value.persistPlacement){
      readPrimePlacements()[primePlacementKey(pluginId,id)]=next;
      writePrimePlacements();
    }
    eventEmit('prime:placement-changed',{pluginId,id,placement:next,reason});
    return next;
  }

  async function applySuperPrimePlacements() {
    if(!superPluginId)return;
    for(const row of primeRowsForPlugin(superPluginId)){
      const placement=primePlacementFor(row.pluginId,row.id);
      if(!placement)continue;
      try { await placePrimeContribution(row.pluginId,row.id,placement,{persist:false,reason:'super-activate'}); }
      catch(err){ console.warn(`[DKDS PRIME apply:${row.pluginId}/${row.id}]`,err); }
    }
  }

  function registerSubContribution(pluginId,id,spec={}) {
    const activity=String(spec.activity||topActivityIdForPlugin(pluginId)||'').trim();
    return registerTypedContribution(pluginId,'ui.sub',id,Object.freeze({id,activity,...spec,pluginId}));
  }

  function topDefinitionReady(pluginId) {
    const definition=definitionById(pluginId);
    return !!(definition&&isDefinitionEnabled(definition)&&active.has(pluginId)&&topWorkspaceForPlugin(pluginId)&&topActivityIdForPlugin(pluginId));
  }

  async function activateSuperWorkspace({invoke=true}={}) {
    const current=superState();
    if(!current.available){
      activeActivityId=null;
      renderActivityBar();
      refreshActivityVisibility();
      host?.showNoSuperWorkspace?.(current);
      eventEmit('super:changed',current);
      return false;
    }
    host?.applySuperWorkspace?.(current);
    const ok=await setActiveActivity(current.activityId,{invoke,forceEmbedded:true});
    if(ok){
      await applySuperPrimePlacements();
      eventEmit('super:changed',superState());
    }
    return ok;
  }

  async function setSuperPlugin(pluginId,{persist=true,invoke=true}={}) {
    const id=String(pluginId||'').trim();
    if(!id)throw new Error('必须选择一个 TOP 插件作为主界面。');
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    if(!isTopDefinition(definition))throw new Error(`插件 ${definition.manifest.name||id} 不是 TOP 插件。`);
    if(!isSuperEligibleDefinition(definition))throw new Error(`插件 ${definition.manifest.name||id} 属于系统功能，不能设为 SUPER。`);
    if(!isDefinitionEnabled(definition)||!active.has(id))throw new Error(`请先启用插件 ${definition.manifest.name||id}。`);
    if(!topWorkspaceForPlugin(id))throw new Error(`插件 ${definition.manifest.name||id} 未注册完整 TOP 工作区契约。`);
    const previous=superPluginId;
    if(previous===id)return superState();
    const activityId=topActivityIdForPlugin(id);

    // Host-role changes are transactional. Before a TOP becomes embedded as
    // SUPER, the host must flush and retire any dedicated renderer of that
    // same plugin so two live instances can never own the same project state.
    await host?.prepareSuperTransition?.({previous,pluginId:id,activityId});

    superPluginId=id;
    try{
      const activated=await activateSuperWorkspace({invoke});
      if(!activated)throw new Error(`插件 ${definition.manifest.name||id} 的 SUPER 工作区启动失败。`);
      if(persist)writeSuperPreference(id);
      renderActivityBar();
      eventEmit('super:selection-changed',{previous,pluginId:id,state:superState()});
      eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      return superState();
    }catch(err){
      superPluginId=previous;
      if(previous&&topDefinitionReady(previous)){
        try{await activateSuperWorkspace({invoke:true});}catch(rollbackErr){console.error('[DKDS SUPER rollback]',rollbackErr);}
      }else{
        activeActivityId=null;
        renderActivityBar();
        refreshActivityVisibility();
        host?.showNoSuperWorkspace?.(superState());
      }
      throw err;
    }
  }

  async function initializeSuperSelection() {
    if(host?.isAuxiliaryWindow)return false;
    const saved=readSuperPreference();
    if(saved!==undefined){
      superPluginId=saved&&topDefinitionReady(saved)?saved:null;
      return activateSuperWorkspace({invoke:true});
    }
    // One-time migration from pre-SUPER builds. Core never names a domain
    // plugin here: TOP plugins may request the initial SUPER role through
    // manifest.workspace.defaultSuper, otherwise the first ready TOP by
    // manifest order is used. After a user selects a SUPER we never silently
    // fall back to another plugin.
    const candidates=[...definitions.values()]
      .filter(definition=>isSuperEligibleDefinition(definition)&&topDefinitionReady(definition.manifest.id))
      .sort((a,b)=>Number(b.manifest?.workspace?.defaultSuper===true)-Number(a.manifest?.workspace?.defaultSuper===true)
        ||(Number(a.manifest?.order)||100)-(Number(b.manifest?.order)||100)
        ||String(a.manifest.id).localeCompare(String(b.manifest.id)));
    const migration=candidates[0]?.manifest?.id||null;
    if(migration){
      superPluginId=migration;
      writeSuperPreference(migration);
    }else superPluginId=null;
    return activateSuperWorkspace({invoke:true});
  }
