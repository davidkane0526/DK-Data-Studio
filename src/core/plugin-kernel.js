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
  let superSelectionInitialized = false;
  let primePlacements = null;
  let shellBound = false;
  let shellResizeObserver = null;
  let contextOverflowPopup = null;

  const API_VERSION = '1.15.0';

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
    foundation:'◆',data:'▦',algorithm:'ƒ',workbench:'◇',task:'✓',tool:'⌁',extension:'⬡',developer:'⌘'
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
    superSelectionInitialized=true;
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
    superSelectionInitialized=true;
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

  function assertId(id, what='id') {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(String(id || ''))) {
      throw new Error(`Invalid plugin ${what}: ${id}`);
    }
  }

  function getRegistry(kind) {
    if (!registries.has(kind)) registries.set(kind, new Map());
    return registries.get(kind);
  }

  function eventOn(name, fn, owner) {
    if (!eventListeners.has(name)) eventListeners.set(name, new Set());
    const row = { fn, owner };
    eventListeners.get(name).add(row);
    return () => eventListeners.get(name)?.delete(row);
  }

  let layoutResizePending = null;
  let layoutResizeFrame = 0;
  let layoutResizeDispatching = false;

  function eventEmitNow(name, payload) {
    const isLayout = name === 'layout:resize';
    const previousDispatching = layoutResizeDispatching;
    if (isLayout) layoutResizeDispatching = true;
    try {
      for (const row of eventListeners.get(name) || []) {
        try { row.fn(payload); } catch (err) { console.error(`[DKDS event:${name}]`, err); }
      }
    } finally {
      if (isLayout) layoutResizeDispatching = previousDispatching;
    }
  }

  function eventEmit(name, payload) {
    if (name !== 'layout:resize') return eventEmitNow(name, payload);
    // layout:resize is a frame signal, not a synchronous command. Window
    // resize, splitters, grids and Plotly ResizeObservers may all report the
    // same geometry change. Coalesce them globally and reject recursive
    // layout notifications from listeners so a plugin can never create a
    // frame-by-frame feedback loop.
    if (layoutResizeDispatching) return false;
    layoutResizePending = { ...(layoutResizePending || {}), ...(payload || {}) };
    if (layoutResizeFrame) return true;
    const raf = globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16));
    layoutResizeFrame = raf(() => {
      layoutResizeFrame = 0;
      const next = layoutResizePending || {};
      layoutResizePending = null;
      eventEmitNow('layout:resize', next);
    });
    return true;
  }

  function addCleanup(pluginId, fn) {
    if (typeof fn !== 'function') return fn;
    if (!cleanupByPlugin.has(pluginId)) cleanupByPlugin.set(pluginId, []);
    cleanupByPlugin.get(pluginId).push(fn);
    return fn;
  }

  function activityRows() {
    return listContributions('ui.activities')
      .slice()
      .sort((a,b)=>(Number(a.value?.order)||100)-(Number(b.value?.order)||100)
        || String(a.value?.label||a.id).localeCompare(String(b.value?.label||b.id)));
  }

  function activeActivity() {
    return activityRows().find(row=>row.value?.id===activeActivityId)?.value || null;
  }

  function activePluginId() {
    return activityRows().find(row=>row.value?.id===activeActivityId)?.pluginId || superPluginId || '';
  }

  function invokeEditAction(action,payload={}) {
    const name=String(action||'').trim();if(!name)return false;
    const pluginId=activePluginId();
    const rows=listContributions('ui.editActions').filter(row=>row.pluginId===pluginId).sort((a,b)=>(Number(a.value?.order)||100)-(Number(b.value?.order)||100));
    for(const row of rows){const fn=row.value?.[name]||row.value?.actions?.[name];if(typeof fn!=='function')continue;try{return fn({action:name,payload,host,pluginId,activityId:activeActivityId})!==false;}catch(err){console.error(`[DKDS edit:${pluginId}:${name}]`,err);return false;}}
    return false;
  }

  function supportsEditAction(action) {
    const name=String(action||'').trim(),pluginId=activePluginId();if(!name||!pluginId)return false;
    return listContributions('ui.editActions').some(row=>row.pluginId===pluginId&&typeof (row.value?.[name]||row.value?.actions?.[name])==='function');
  }

  function reflowActivities(){
    const bar=document.querySelector('#activityBar');
    const menu=document.querySelector('#activityMoreMenu');
    const more=document.querySelector('#activityMoreBtn');
    const wrap=document.querySelector('.activity-switcher');
    if(!bar||!menu||!more||!wrap)return;

    for(const btn of [...menu.querySelectorAll('.activity-tab')])bar.appendChild(btn);
    const buttons=[...bar.querySelectorAll('.activity-tab')];
    buttons.sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100));
    buttons.forEach(b=>bar.appendChild(b));
    menu.classList.add('hidden');
    more.classList.add('hidden');

    const width=Math.max(0,wrap.getBoundingClientRect().width);
    if(!width||buttons.length<=1)return;
    const reserve=92;
    const max=Math.max(150,width-reserve);
    let used=0;
    const measured=buttons.map(b=>Math.ceil(b.getBoundingClientRect().width)+4);
    for(let i=0;i<buttons.length;i++)used+=measured[i];
    if(used<=width)return;

    more.classList.remove('hidden');
    used=0;
    // Always keep the active activity visible when possible.
    const activeBtn=buttons.find(b=>b.dataset.activityId===activeActivityId);
    const ordered=buttons.filter(b=>b!==activeBtn);
    if(activeBtn)ordered.unshift(activeBtn);
    const keep=new Set();
    for(const b of ordered){
      const idx=buttons.indexOf(b),w=measured[idx];
      if(used+w<=max||keep.size===0){keep.add(b);used+=w;}
    }
    for(const b of buttons)if(!keep.has(b))menu.appendChild(b);
  }

  function renderActivityBar() {
    const mount=document.querySelector('#activityBar');
    const primaryMount=document.querySelector('#primaryActivityBar');
    const overflow=document.querySelector('#activityMoreMenu');
    if(!mount)return;
    const rows=activityRows().filter(row=>String(row.value?.navigation||'')!=='system');
    mount.innerHTML='';
    if(primaryMount)primaryMount.innerHTML='';
    if(overflow)overflow.innerHTML='';
    for(const row of rows){
      const spec=row.value||{};
      const button=document.createElement('button');
      button.type='button';
      button.className='activity-tab';
      button.dataset.activityId=spec.id;
      button.dataset.pluginId=row.pluginId;
      button.dataset.activityOrder=String(Number(spec.order)||100);
      button.dataset.activityRole=spec.role||'';
      button.classList.toggle('top-workspace-tab',spec.role==='top');
      button.classList.toggle('super-workspace-tab',row.pluginId===superPluginId);
      button.title=(row.pluginId===superPluginId?'主界面 · ':'')+(spec.title||spec.description||spec.label||spec.id);
      const icon=spec.icon?`<span class="activity-icon" aria-hidden="true">${spec.icon}</span>`:'';
      button.innerHTML=`${icon}<span class="activity-label">${spec.label||spec.id}</span>`;
      button.classList.toggle('active',spec.id===activeActivityId);
      button.onclick=async()=>{
        const nonSuperTop=spec.role==='top'&&row.pluginId!==superPluginId&&!host?.isAuxiliaryWindow;
        if(nonSuperTop||(spec.openMode==='window'&&!host?.isAuxiliaryWindow&&row.pluginId!==superPluginId)){
          try{
            const opened=await host?.openActivityWindow?.(spec.id);
            if(opened===false)host?.setStatus?.(`工作区 ${spec.label||spec.id} 未能打开。`);
          }catch(err){
            console.error(`[DKDS activity-window:${spec.id}]`,err);
            host?.setStatus?.(`工作区 ${spec.label||spec.id} 打开失败：${err.message||err}`);
          }
          return;
        }
        try{await setActiveActivity(spec.id,{invoke:true});}
        catch(err){console.error(`[DKDS activity:${spec.id}]`,err);host?.setStatus?.(`工作区 ${spec.label||spec.id} 打开失败：${err.message||err}`);}
      };
      const target=(spec.primary&&primaryMount)?primaryMount:mount;
      target.appendChild(button);
    }
    queueMicrotask(reflowActivities);
  }

  function sortContributions(hostEl,selector='[data-plugin-order]') {
    if(!hostEl)return;
    const rows=[...hostEl.children].filter(el=>el.matches?.(selector));
    rows.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)
      ||String(a.id||'').localeCompare(String(b.id||'')));
    for(const row of rows)hostEl.appendChild(row);
  }

  function sortButtons(hostEl) {
    sortContributions(hostEl,'.plugin-toolbar-btn,.plugin-main-tool-btn,.plugin-menu-item');
  }

  function refreshExportMenuPresentation(){
    const pluginMenu=document.querySelector('#pluginExportMenu');
    const visiblePluginItems=[...(pluginMenu?.querySelectorAll('.plugin-menu-item')||[])].filter(el=>!el.classList.contains('plugin-activity-hidden')&&!el.classList.contains('hidden'));
    const hasPluginExport=visiblePluginItems.length>0;
    document.querySelectorAll('[data-legacy-plot-export]').forEach(el=>el.classList.toggle('hidden',hasPluginExport));
    const active=activeActivity();
    let context=pluginMenu?.querySelector?.('[data-plugin-export-context]')||null;
    if(hasPluginExport&&pluginMenu){
      if(!context){context=document.createElement('div');context.className='plugin-export-context';context.dataset.pluginExportContext='1';pluginMenu.prepend(context);}
      context.textContent=`当前：${active?.contextLabel||active?.label||'当前插件'}`;
      context.classList.remove('hidden');
    }else context?.classList?.add('hidden');
    const trigger=document.querySelector('#exportMenuBtn');if(trigger){trigger.textContent='导出数据 ▾';trigger.title=hasPluginExport?`导出 ${active?.contextLabel||active?.label||'当前插件'} 的数据或图形`:'导出当前数据或图形';}
  }


  function refreshToolMenuPresentation(){
    const menu=document.querySelector('#pluginToolsMenu');
    const trigger=document.querySelector('#toolsMenuBtn');
    if(!menu||!trigger)return;
    const items=[...menu.querySelectorAll('.plugin-menu-item')].filter(el=>!el.classList.contains('hidden'));
    trigger.disabled=items.length===0;
    trigger.title=items.length?`打开工具（${items.length}）`:'当前没有已启用的工具插件';
    let empty=menu.querySelector('[data-tools-empty]');
    if(!items.length){if(!empty){empty=document.createElement('div');empty.dataset.toolsEmpty='1';empty.className='command-menu-empty';empty.textContent='当前没有已启用的工具';menu.appendChild(empty);}empty.classList.remove('hidden');}
    else empty?.classList?.add('hidden');
  }

  function refreshActivityVisibility() {
    const id=activeActivityId;
    document.querySelectorAll('[data-plugin-activity]').forEach(el=>{
      const own=el.dataset.pluginActivity||'';
      el.classList.toggle('plugin-activity-hidden',!!own&&!!id&&own!==id);
    });
    const title=document.querySelector('#activityContextTitle');
    const active=activeActivity();
    if(document?.body){
      document.body.dataset.superPlugin=superPluginId||'';
      document.body.dataset.superActivity=superPluginId?topActivityIdForPlugin(superPluginId):'';
      document.body.classList.toggle('super-unconfigured',!superPluginId);
    }
    if(title)title.textContent=active?.contextLabel||active?.label||'工作区';
    document.querySelectorAll('#activityBar .activity-tab,#primaryActivityBar .activity-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.activityId===id));
    reflowContextToolbar();
    refreshExportMenuPresentation();
    refreshToolMenuPresentation();
    eventEmit('activity:changed',{id,activity:active});
  }

  async function setActiveActivity(id,{invoke=true,forceEmbedded=false}={}) {
    const row=activityRows().find(x=>x.value?.id===id);
    if(!row) return false;
    const top=row.value?.role==='top'||isTopDefinition(definitionById(row.pluginId));
    if(top&&!forceEmbedded&&!host?.isAuxiliaryWindow&&row.pluginId!==superPluginId){
      await host?.openActivityWindow?.(id);
      return 'window';
    }
    activeActivityId=id;
    renderActivityBar();
    refreshActivityVisibility();
    host?.applySuperWorkspace?.(superState());
    if(invoke){
      try { await row.value?.onActivate?.({id,host,pluginId:row.pluginId,super:row.pluginId===superPluginId}); }
      catch(err){
        console.error(`[DKDS activity:${id}]`,err);
        host?.setStatus?.(`工作区 ${row.value?.label||id} 打开失败：${err.message}`);
        return false;
      }
    }
    return true;
  }

  function chooseFallbackActivity() {
    const rows=activityRows();
    if(host?.isAuxiliaryWindow){
      if(activeActivityId&&rows.some(r=>r.value?.id===activeActivityId))return activeActivityId;
      const preferred=rows.find(r=>r.value?.default===true)||rows[0]||null;
      activeActivityId=preferred?.value?.id||null;
      renderActivityBar();
      refreshActivityVisibility();
      return activeActivityId;
    }
    const current=superState();
    if(current.available){
      activeActivityId=current.activityId;
      renderActivityBar();
      refreshActivityVisibility();
      return activeActivityId;
    }
    activeActivityId=null;
    renderActivityBar();
    refreshActivityVisibility();
    host?.showNoSuperWorkspace?.(current);
    return null;
  }

  function registerActivity(pluginId,id,spec={}) {
    const definition=definitionById(pluginId);
    const meta=workspaceMeta(definition?.manifest);
    const role=String(spec.role||((meta.role==='top'&&(!meta.activity||meta.activity===id))?'top':'')).trim().toLowerCase();
    const value={id,label:id,order:100,icon:defaultPluginIcon(definition?.manifest),...spec,id,pluginId,role};
    // TOP plugins are always first-class workspace tabs. Whether a TOP opens
    // embedded or in its independent window is decided by the SUPER state.
    if(value.primary===undefined&&(role==='top'||value.openMode==='window'))value.primary=true;
    registerTypedContribution(pluginId,'ui.activities',id,value);
    addCleanup(pluginId,()=>{
      if(activeActivityId===id){
        activeActivityId=null;
        queueMicrotask(()=>chooseFallbackActivity());
      }else{
        renderActivityBar();
        refreshActivityVisibility();
      }
    });
    renderActivityBar();
    return value;
  }

  function sidebarHost() {
    return document.querySelector('[data-plugin-sidebar]')||document.querySelector('#pluginSidebarSections');
  }

  function addSidebarSection(pluginId,spec={}) {
    const mount=sidebarHost();
    if(!mount)throw new Error('Plugin sidebar mount not found.');
    const section=document.createElement('section');
    section.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-sidebar`;
    section.className=`plugin-sidebar-section ${spec.className||''}`.trim();
    section.dataset.pluginId=pluginId;
    section.dataset.pluginActivity=spec.activity||'';
    section.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)section.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    else if(spec.title)section.innerHTML=`<h3>${String(spec.title)}</h3>`;
    mount.appendChild(section);
    sortContributions(mount,'.plugin-sidebar-section');
    addCleanup(pluginId,()=>section.remove());
    spec.onMount?.({section,host});
    refreshActivityVisibility();
    return section;
  }

  function addMainOverlay(pluginId,spec={}) {
    const mount=document.querySelector(spec.mountSelector||'#mainPlotWrap');
    if(!mount)throw new Error(`Plugin main overlay mount not found: ${spec.mountSelector||'#mainPlotWrap'}`);
    const element=document.createElement(spec.tagName||'div');
    element.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-overlay`;
    element.className=`plugin-main-overlay ${spec.className||''}`.trim();
    element.dataset.pluginId=pluginId;
    element.dataset.pluginActivity=spec.activity||'';
    element.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)element.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    mount.appendChild(element);
    registerContribution(pluginId,'ui.mainOverlays',spec.id,{id:spec.id,element,activity:spec.activity||'',pluginId});
    addCleanup(pluginId,()=>element.remove());
    spec.onMount?.({element,host});
    refreshActivityVisibility();
    return element;
  }

  function createScopedButton(pluginId,spec,mountSelector,className) {
    const mount=document.querySelector(mountSelector);
    if(!mount)throw new Error(`Plugin mount not found: ${mountSelector}`);
    const button=document.createElement('button');
    button.type='button';
    button.id=spec.id||`${pluginId}__${spec.command||spec.label}`;
    button.className=className;
    button.textContent=spec.label||spec.id||pluginId;
    button.title=spec.title||'';
    button.dataset.pluginId=pluginId;
    button.dataset.pluginOrder=String(Number(spec.order)||100);
    button.dataset.pluginActivity=spec.activity||'';
    button.addEventListener('click',async event=>{
      try{
        if(spec.onClick)await spec.onClick(event);
        else if(spec.command)await runCommand(spec.command,{event});
      }catch(err){
        console.error(`[DKDS plugin action:${pluginId}]`,err);
        host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });
    mount.appendChild(button);
    sortButtons(mount);
    addCleanup(pluginId,()=>button.remove());
    refreshActivityVisibility();
    return button;
  }

  function addMainTool(pluginId,spec) {
    return createScopedButton(pluginId,spec,'[data-plugin-main-tools]','plugin-main-tool-btn');
  }

  function addMenuItem(pluginId,spec={}) {
    const definition=definitionById(pluginId);const defaultMenu=pluginTypeForManifest(definition?.manifest||{})==='tool'?'tools':'export';
    const menu=String(spec.menu||defaultMenu);
    const mount=document.querySelector(`[data-plugin-menu="${menu}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${menu}`);
    const button=createScopedButton(pluginId,{...spec,menu},`[data-plugin-menu="${menu}"]`,'plugin-menu-item');
    button.addEventListener('click',()=>button.closest('.command-menu')?.classList.add('hidden'));
    const refresh=()=>{refreshExportMenuPresentation();refreshToolMenuPresentation();};
    queueMicrotask(refresh);addCleanup(pluginId,()=>queueMicrotask(refresh));
    return button;
  }

  function markToolbarSections(hostEl){
    if(!hostEl)return;
    const buttons=[...hostEl.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    let lastSection=null;
    for(const button of buttons){
      const section=button.dataset.pluginSection||'';
      const isStart=!!section&&section!==lastSection;
      button.classList.toggle('plugin-section-start',isStart);
      if(section)button.title=button.title||section;
      lastSection=section||lastSection;
    }
  }

  function closeContextOverflowPopup(){
    contextOverflowPopup?.dispose?.();
    contextOverflowPopup=null;
    document.querySelector('#contextOverflowBtn')?.setAttribute('aria-expanded','false');
  }

  function contextOverflowItems(container){
    const buttons=[...container.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(button=>!button.classList.contains('plugin-activity-hidden'));
    const items=[];
    let lastSection='';
    for(const button of buttons){
      const section=String(button.dataset.pluginSection||'');
      if(items.length&&section&&lastSection&&section!==lastSection)items.push({type:'separator'});
      items.push({
        id:button.id||`overflow-${items.length}`,
        label:String(button.textContent||button.title||'功能').trim(),
        enabled:()=>!button.disabled,
        onInvoke:()=>button.click()
      });
      if(section)lastSection=section;
    }
    return items;
  }

  function openContextOverflowPopup(button,container){
    if(!button||!container)return;
    closeContextOverflowPopup();
    const items=contextOverflowItems(container);
    if(!items.length)return;
    document.querySelectorAll('.command-menu').forEach(menu=>menu.classList.add('hidden'));
    document.querySelectorAll('[aria-expanded="true"]').forEach(node=>{if(node!==button)node.setAttribute('aria-expanded','false');});
    const Menu=window.DKDSUI?.ContextMenu;
    if(!Menu){container.classList.remove('hidden');button.setAttribute('aria-expanded','true');return;}
    const rect=button.getBoundingClientRect();
    const menu=contextOverflowPopup=new Menu('core.shell',{onClose:()=>{button.setAttribute('aria-expanded','false');if(contextOverflowPopup===menu)contextOverflowPopup=null;}});
    button.setAttribute('aria-expanded','true');
    menu.open({x:Math.max(6,rect.right-184),y:rect.bottom+4,items});
  }

  function reflowContextToolbar() {
    closeContextOverflowPopup();
    const toolbar=document.querySelector('#pluginToolbarAnalysis');
    const overflow=document.querySelector('#contextOverflowMenu');
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const row=document.querySelector('.context-commandbar');
    if(!toolbar||!overflow||!overflowBtn||!row)return;

    // Return previous overflow items before measuring. Reflow must be stable
    // after resize, plugin activation, activity switches, and font changes.
    for(const child of [...overflow.querySelectorAll('.plugin-toolbar-btn')])toolbar.appendChild(child);
    sortButtons(toolbar);
    overflow.classList.add('hidden');
    overflowBtn.classList.add('hidden');

    const visible=[...toolbar.querySelectorAll('.plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    if(!visible.length){markToolbarSections(toolbar);return;}

    const available=Math.max(90,row.getBoundingClientRect().width);
    const widths=new Map(visible.map(b=>[b,Math.ceil(b.getBoundingClientRect().width)+3]));
    const total=visible.reduce((sum,b)=>sum+(widths.get(b)||0),0);
    if(total<=available){markToolbarSections(toolbar);return;}

    overflowBtn.classList.remove('hidden');
    const overflowWidth=Math.ceil(overflowBtn.getBoundingClientRect().width)||52;
    const target=Math.max(54,available-overflowWidth-4);

    // Priority decides which actions survive on the single-row command bar.
    // DOM/order still decides their final left-to-right sequence.
    const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)
      ||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
    const keep=new Set();
    let used=0;
    for(const b of ranked){
      const w=widths.get(b)||0;
      if(used+w<=target || keep.size===0){keep.add(b);used+=w;}
    }

    for(const b of visible)if(!keep.has(b))overflow.appendChild(b);
    if(!overflow.children.length)overflowBtn.classList.add('hidden');
    markToolbarSections(toolbar);
    markToolbarSections(overflow);
  }

  function isTypingTarget(target){
    if(!target)return false;
    const tag=String(target.tagName||'').toLowerCase();
    return ['input','textarea','select'].includes(tag)||!!target.isContentEditable;
  }

  function dispatchPluginShortcut(event){
    if(!event||event.defaultPrevented)return false;
    const rows=listContributions('ui.shortcuts')
      .filter(row=>!row.value?.activity||row.value.activity===activeActivityId)
      .sort((a,b)=>(Number(b.value?.priority)||0)-(Number(a.value?.priority)||0)||(Number(a.value?.order)||100)-(Number(b.value?.order)||100));
    for(const row of rows){
      const spec=row.value||{};
      if(isTypingTarget(event.target)&&!spec.allowTyping)continue;
      let match=false;
      try{match=typeof spec.match==='function'?!!spec.match(event,{host,activityId:activeActivityId,pluginId:row.pluginId}):false;}
      catch(err){console.error(`[DKDS shortcut match:${row.pluginId}/${row.id}]`,err);continue;}
      if(!match)continue;
      try{
        const handled=spec.handler?.({event,host,activityId:activeActivityId,pluginId:row.pluginId})!==false;
        if(handled){
          event.preventDefault?.();
          event.stopImmediatePropagation?.();
          event.stopPropagation?.();
          return true;
        }
      }catch(err){
        console.error(`[DKDS shortcut:${row.pluginId}/${row.id}]`,err);
        host?.setStatus?.(`插件快捷键执行失败：${err.message}`);
        event.preventDefault?.();
        event.stopImmediatePropagation?.();
        return true;
      }
    }
    return false;
  }

  function bindShellOnce() {
    if(shellBound)return;
    shellBound=true;
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const overflowMenu=document.querySelector('#contextOverflowMenu');
    const activityMoreBtn=document.querySelector('#activityMoreBtn');
    const activityMoreMenu=document.querySelector('#activityMoreMenu');
    const toggle=(button,menu)=>{
      if(!button||!menu)return;
      button.addEventListener('click',event=>{
        event.stopPropagation();
        const willOpen=menu.classList.contains('hidden');
        document.querySelectorAll('.command-menu').forEach(m=>{if(m!==menu)m.classList.add('hidden');});
        document.querySelectorAll('[aria-expanded="true"]').forEach(b=>{if(b!==button)b.setAttribute('aria-expanded','false');});
        menu.classList.toggle('hidden',!willOpen);
        button.setAttribute('aria-expanded',willOpen?'true':'false');
      });
    };

    // Ordinary shell menus declare their target in HTML, keeping the shell
    // extensible without hard-coding one JavaScript branch per menu.
    document.querySelectorAll('[data-menu-target]').forEach(button=>{
      const menu=document.getElementById(button.dataset.menuTarget||'');
      toggle(button,menu);
    });
    if(overflowBtn&&overflowMenu){
      overflowBtn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openContextOverflowPopup(overflowBtn,overflowMenu);});
    }
    toggle(activityMoreBtn,activityMoreMenu);

    document.querySelectorAll('.menu-anchor .command-menu').forEach(menu=>{
      menu.addEventListener('click',event=>{
        if(event.target.closest('button')&&!event.target.closest('[data-menu-target]')){
          menu.classList.add('hidden');
          menu.closest('.menu-anchor')?.querySelector('[aria-expanded]')?.setAttribute('aria-expanded','false');
        }
      });
    });

    window.addEventListener?.('keydown',dispatchPluginShortcut,{capture:true});
    document.addEventListener?.('click',event=>{
      if(!event.target.closest('.menu-anchor')){
        document.querySelectorAll('.menu-anchor .command-menu').forEach(m=>m.classList.add('hidden'));
        document.querySelectorAll('.menu-anchor [aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
      }
      if(!event.target.closest('.context-overflow-anchor')&&!event.target.closest('.dkds-context-menu'))closeContextOverflowPopup();
      if(!event.target.closest('.activity-more-anchor'))activityMoreMenu?.classList.add('hidden');
    });
    if(window.ResizeObserver){
      shellResizeObserver=new ResizeObserver(()=>{reflowContextToolbar();reflowActivities();});
      const context=document.querySelector('.context-commandbar');
      const activity=document.querySelector('.activity-switcher');
      const topbar=document.querySelector('.topbar-primary');
      if(context)shellResizeObserver.observe(context);
      if(activity)shellResizeObserver.observe(activity);
      if(topbar)shellResizeObserver.observe(topbar);
    }else{
      window.addEventListener?.('resize',()=>{reflowContextToolbar();reflowActivities();},{passive:true});
    }
  }

  function toolbarHost(group) {
    return document.querySelector(`[data-plugin-toolbar="${group}"]`)
      || document.querySelector('#pluginToolbarAnalysis')
      || null;
  }

  function createToolbarButton(pluginId, spec) {
    const group = spec.group || 'analysis';
    const mount = toolbarHost(group);
    if (!mount) throw new Error(`Toolbar mount not found: ${group}`);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = spec.id || `${pluginId}__${spec.command || spec.label}`;
    button.className = `toolbar-btn plugin-toolbar-btn ${spec.className || ''}`.trim();
    button.textContent = spec.label || spec.id || pluginId;
    button.title = spec.title || '';
    button.dataset.pluginId = pluginId;
    button.dataset.pluginOrder = String(Number(spec.order) || 100);
    button.dataset.pluginPriority = String(Number(spec.priority) || 0);
    button.dataset.pluginSection = String(spec.section || '');
    button.dataset.pluginActivity = spec.activity || '';

    button.addEventListener('click', async event => {
      try {
        // System toolbar commands operate on the active SUPER workspace. If a
        // transient system page such as Plugin Manager is covering it, restore
        // the plugin root first; the command can then open its PRIME/SUB view.
        if(spec.activity)host?.ensurePluginWorkspaceVisible?.(spec.activity);
        if (spec.onClick) await spec.onClick(event);
        else if (spec.command) await runCommand(spec.command, { event });
      } catch (err) {
        console.error(`[DKDS plugin toolbar:${pluginId}]`, err);
        host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });

    const siblings = [...mount.querySelectorAll('.plugin-toolbar-btn')];
    const before = siblings.find(el => Number(el.dataset.pluginOrder || 100) > Number(spec.order || 100));
    mount.insertBefore(button, before || null);
    addCleanup(pluginId, () => button.remove());
    refreshActivityVisibility();
    queueMicrotask(reflowContextToolbar);
    return button;
  }

  function registerCommand(pluginId, id, handler, meta={}) {
    assertId(id, 'command id');
    const reg = getRegistry('commands');
    if (reg.has(id)) throw new Error(`Command already registered: ${id}`);
    reg.set(id, { id, handler, meta, pluginId });
    return addCleanup(pluginId, () => reg.delete(id));
  }

  async function runCommand(id, args={}) {
    const cmd = getRegistry('commands').get(id);
    if (!cmd) throw new Error(`Command not found: ${id}`);
    return await cmd.handler(args);
  }

  function registerContribution(pluginId, kind, id, value) {
    assertId(kind, 'registry kind');
    assertId(id, 'contribution id');
    const reg = getRegistry(kind);
    const key = `${pluginId}:${id}`;
    if (reg.has(key)) throw new Error(`Contribution already registered: ${kind}/${pluginId}:${id}`);
    reg.set(key, { pluginId, id, value });
    return addCleanup(pluginId, () => reg.delete(key));
  }

  const globallyUniqueRegistryKinds = new Set([
    'workflow.processors',
    'workflow.analyzers',
    'workflow.recipes',
    'charts.renderers',
    'data.importers',
    'analysis.providers',
    'peak.detectors',
    'ui.activities',
    'ui.inspectors',
    'ui.groupCharts',
    'ui.groupViews',
    'ui.mainViews',
    'ui.topWorkspaces'
  ]);

  function registerTypedContribution(pluginId, kind, id, value) {
    if (globallyUniqueRegistryKinds.has(kind)) {
      const existing = [...getRegistry(kind).values()].find(row => row.id === id);
      if (existing) {
        throw new Error(`Contribution id must be unique in ${kind}: ${id} is already owned by ${existing.pluginId}`);
      }
    }
    return registerContribution(pluginId, kind, id, value);
  }

  function listContributions(kind) {
    return [...getRegistry(kind).values()];
  }

  function providerCapabilityKind(kind){
    return kind==='workflow.processors'?'workflow.processor':kind==='workflow.analyzers'?'workflow.analyzer':kind==='charts.renderers'?'chart.renderer':'';
  }

  function registerProviderCapability(pluginId,kind,id,value){
    const capKind=providerCapabilityKind(kind);if(!capKind||!window.DKDSCapabilities)return;
    const methods={};
    if(typeof value?.run==='function')methods.run=value.run;
    if(typeof value?.buildSpec==='function')methods.buildSpec=value.buildSpec;
    if(!Object.keys(methods).length)return;
    const capId=`${capKind}:${id}`;
    window.DKDSCapabilities.register(pluginId,capId,{
      kind:capKind,title:value.name||id,version:value.version||'1.0.0',remote:true,
      metadata:{id,name:value.name||id,description:value.description||'',inputKinds:value.inputKinds||[],outputKinds:value.outputKinds||[],parameterSchema:value.parameterSchema||{fields:[]},pluginId},
      methods
    });
    addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(capId));
  }

  function capabilityBackedProviders(kind){
    const capKind=providerCapabilityKind(kind);if(!capKind)return [];
    return (window.DKDSCapabilities?.list?.(capKind)||[]).map(cap=>{
      const meta=cap.metadata||{};const id=String(meta.id||cap.id.split(':').slice(1).join(':'));
      const proxy=window.DKDSCapabilities.proxy(cap.id);
      const value={id,name:meta.name||cap.title,description:meta.description||'',version:cap.version||'1.0.0',pluginId:meta.pluginId||cap.owner,inputKinds:meta.inputKinds||[],outputKinds:meta.outputKinds||[],parameterSchema:meta.parameterSchema||{fields:[]},remote:true};
      if(cap.methods?.includes?.('run'))value.run=(payload)=>proxy.run(payload);
      if(cap.methods?.includes?.('buildSpec'))value.buildSpec=(payload)=>proxy.buildSpec(payload);
      return value;
    });
  }

  function listProvidersWithCapabilities(kind){
    const local=listContributions(kind).map(row=>row.value);const seen=new Set(local.map(row=>String(row.id)));
    for(const value of capabilityBackedProviders(kind))if(!seen.has(String(value.id))){local.push(value);seen.add(String(value.id));}
    return local;
  }

  function statusBarZone(side='right') {
    const normalized=String(side||'right').toLowerCase()==='left'?'left':'right';
    return document.querySelector(normalized==='left'?'#statusBarPluginLeft':'#statusBarPluginRight');
  }

  function addStatusBarItem(pluginId,spec={}) {
    const id=String(spec.id||'').trim();
    assertId(id,'status item id');
    let current={order:100,side:'right',icon:'',label:'',title:'',state:'',hidden:false,disabled:false,className:'',...spec,id};
    const button=document.createElement('button');
    button.type='button';
    button.className='plugin-status-item';
    button.dataset.pluginId=pluginId;
    button.dataset.pluginStatusId=id;
    const icon=document.createElement('span');
    icon.className='plugin-status-icon';
    icon.setAttribute('aria-hidden','true');
    const label=document.createElement('span');
    label.className='plugin-status-label';
    button.append(icon,label);
    let clickHandler=typeof current.onClick==='function'?current.onClick:null;

    const moveToZone=()=>{
      const zone=statusBarZone(current.side);
      if(!zone)return false;
      if(button.parentElement!==zone)zone.appendChild(button);
      sortContributions(zone,'.plugin-status-item');
      return true;
    };
    const apply=patch=>{
      if(patch&&typeof patch==='object')current={...current,...patch,id};
      clickHandler=typeof current.onClick==='function'?current.onClick:null;
      button.dataset.pluginOrder=String(Number(current.order)||100);
      button.dataset.state=String(current.state||'');
      button.className=`plugin-status-item ${current.className||''} ${clickHandler?'':'passive'}`.trim();
      button.classList.toggle('hidden',!!current.hidden);
      button.disabled=!!current.disabled;
      button.title=String(current.title||current.label||'');
      icon.textContent=String(current.icon||'');
      icon.classList.toggle('hidden',!current.icon);
      label.textContent=String(current.label??'');
      label.classList.toggle('hidden',current.label===undefined||current.label===null||String(current.label)==='');
      moveToZone();
      return controller;
    };
    button.addEventListener('click',event=>{
      if(button.disabled||typeof clickHandler!=='function')return;
      try{clickHandler({event,element:button,pluginId,id,host});}
      catch(err){console.error(`[DKDS status bar:${pluginId}/${id}]`,err);}
    });
    const controller={
      id,pluginId,element:button,
      update:patch=>apply(patch),
      remove:()=>button.remove(),
      get value(){return {...current};}
    };
    registerContribution(pluginId,'ui.statusItems',id,controller);
    addCleanup(pluginId,()=>button.remove());
    apply(current);
    return controller;
  }

  function registerProjectSlice(pluginId, key, hooks) {
    assertId(key, 'project slice key');
    if (!projectSlices.has(pluginId)) projectSlices.set(pluginId, new Map());
    const map = projectSlices.get(pluginId);
    map.set(key, hooks || {});
    return addCleanup(pluginId, () => map.delete(key));
  }

  function serializeProject(base={}) {
    let out = {};
    try { out = JSON.parse(JSON.stringify(base || {})); } catch { out = {}; }
    for (const [pluginId, slices] of projectSlices) {
      const pluginData = {};
      for (const [key, hooks] of slices) {
        if (typeof hooks.serialize !== 'function') continue;
        try { pluginData[key] = hooks.serialize(); }
        catch (err) { console.error(`[DKDS plugin project serialize:${pluginId}/${key}]`, err); }
      }
      if (Object.keys(pluginData).length) out[pluginId] = pluginData;
    }
    return out;
  }

  function restoreProject(data={}) {
    // Project-format migration resolves historical root fields before the plugin
    // kernel sees a project. Runtime restoration therefore consumes namespaced
    // plugin slices only; a missing slice is a fresh/reset state.
    for (const pluginId of projectSlices.keys()) restorePluginProjectState(pluginId, data);
    eventEmit('project:restored', { data });
  }

  function resetProjectSlices() {
    for (const [pluginId, slices] of projectSlices) {
      for (const [key, hooks] of slices) {
        if (typeof hooks.reset !== 'function') continue;
        try { hooks.reset(); }
        catch (err) { console.error(`[DKDS plugin project reset:${pluginId}/${key}]`, err); }
      }
    }
  }

  function addStyle(pluginId, id, cssText) {
    const el = document.createElement('style');
    el.dataset.pluginId = pluginId;
    el.dataset.pluginStyle = id;
    el.textContent = String(cssText || '');
    document.head.appendChild(el);
    return addCleanup(pluginId, () => el.remove());
  }

  function workbenchImportMeta(manifest={}){
    if(pluginTypeForManifest(manifest)!=='workbench')return null;
    const accepts=Array.isArray(manifest?.data?.accepts)?manifest.data.accepts.map(String).filter(Boolean):[];
    return {accepts,label:String(workspaceMeta(manifest).title||manifest.name||manifest.id||'当前工作台'),icon:String(workspaceMeta(manifest).icon||defaultPluginIcon(manifest))};
  }

  function mountWorkbenchImportAction(pluginId,page,pageActivity,manifest,spec={}){
    const meta=workbenchImportMeta(manifest);if(!meta||!page)return null;
    const commandId=`${pluginId}.${String(spec.id||'workbench')}.core-import-data`;
    registerCommand(pluginId,commandId,()=>host?.openImportWorkbench?.({mode:'scoped',consumerId:pluginId,consumerLabel:meta.label,consumerIcon:meta.icon,accepts:meta.accepts,source:'workbench-action'}));
    const embeddedSuper=isTopDefinition(manifest)&&superPluginId===pluginId;
    if(embeddedSuper&&pageActivity){
      return createToolbarButton(pluginId,{id:`${String(spec.id||'workbench')}-core-import`,label:'导入数据',title:`导入到 ${meta.label}`,icon:'⇩',activity:pageActivity,section:'DATA',order:0,priority:100,command:commandId,className:'dkds-core-import-action'});
    }
    const header=page.querySelector('.analysis-page-header');
    if(!header){
      if(pageActivity){
        return createToolbarButton(pluginId,{id:`${String(spec.id||'workbench')}-core-import`,label:'导入数据',title:`导入到 ${meta.label}`,icon:'⇩',activity:pageActivity,section:'DATA',order:0,priority:100,command:commandId,className:'dkds-core-import-action'});
      }
      return null;
    }
    let slot=page.querySelector('[data-dkds-slot="workbench-import"]');
    if(!slot){
      slot=document.createElement('div');slot.dataset.dkdsSlot='workbench-import';
      const pluginActions=header.querySelector('.dkds-plugin-header-actions');
      const close=header.querySelector('.analysis-page-close');
      if(pluginActions)header.insertBefore(slot,pluginActions);else if(close)header.insertBefore(slot,close);else header.appendChild(slot);
    }
    slot.classList.add('dkds-core-workbench-import-slot');slot.replaceChildren();
    const button=document.createElement('button');button.type='button';button.className='dkds-core-import-action';button.dataset.dkdsCoreAction='workbench-import';button.title=`导入到 ${meta.label}`;button.textContent='导入数据';button.onclick=()=>runCommand(commandId,{source:'workbench-import-action'});slot.appendChild(button);
    return button;
  }

  function addPage(pluginId, spec) {
    const definition=definitionById(pluginId),manifest=definition?.manifest||{};
    let page = spec.pageId ? document.getElementById(spec.pageId) : null;
    if (!page && spec.html) {
      page = document.createElement('section');
      page.id = spec.pageId || `${pluginId.replace(/[.]/g,'-')}-${spec.id}-page`;
      page.className = `analysis-page hidden plugin-analysis-page ${spec.className || ''}`.trim();
      page.dataset.pluginId = pluginId;
      page.innerHTML = spec.html;
      document.querySelector('#app')?.appendChild(page);
      addCleanup(pluginId, () => page.remove());
    }
    if (!page) throw new Error(`Plugin page not found: ${spec.pageId || spec.id}`);
    const standaloneWorkbench=pluginTypeForManifest(manifest)==='workbench'&&!workspaceMeta(manifest).role&&!spec.activity&&spec.presentation!=='toolbar'&&spec.primary!==false;
    const pageActivity=String(spec.activity||(standaloneWorkbench?spec.activityId||spec.id:'')||page.dataset.pluginActivity||'');
    page.dataset.pluginActivity = pageActivity;
    mountWorkbenchImportAction(pluginId,page,pageActivity,manifest,spec);

    for (const close of page.querySelectorAll('.analysis-page-close')) {
      if (close.dataset.dkdsPluginCloseBound === '1') continue;
      close.dataset.dkdsPluginCloseBound = '1';
      close.addEventListener('click', () => {
        if(host?.isAuxiliaryWindow)host?.closeCurrentWindow?.();
        else host?.closeAnalysisPage?.(page.id);
      });
    }

    registerContribution(pluginId, 'ui.pages', spec.id, {
      ...spec,
      pageId: page.id,
      element: page
    });
    addCleanup(pluginId, () => page.classList.add('hidden'));

    if (standaloneWorkbench) {
      const commandId = `${pluginId}.${spec.id}.open`;
      registerCommand(pluginId, commandId, async () => {
        host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host });
      });
      registerActivity(pluginId,pageActivity,{
        label:spec.label||manifest.name||spec.id,
        title:spec.title||manifest.description||'',
        icon:String(spec.icon||defaultPluginIcon(manifest)),
        order:Number(spec.order??manifest.order??100),
        primary:true,
        description:String(spec.description||manifest.description||''),
        onActivate:()=>runCommand(commandId,{source:'activity'})
      });
    } else if (spec.toolbar !== false) {
      const commandId = `${pluginId}.${spec.id}.open`;
      registerCommand(pluginId, commandId, async () => {
        host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host });
      });
      createToolbarButton(pluginId, {
        id: spec.buttonId,
        label: spec.label || spec.id,
        title: spec.title || '',
        className: spec.buttonClass || '',
        group: spec.group || 'analysis',
        activity: spec.activity || '',
        order: spec.order || 100,
        priority: spec.priority || 0,
        section: spec.section || '',
        command: commandId
      });
    }
    return page;
  }

  function addPanel(pluginId,spec={}) {
    let panel=spec.panelId?document.getElementById(spec.panelId):null;
    let created=false;
    if(!panel){
      panel=document.createElement('div');
      panel.id=spec.panelId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-panel`;
      panel.className=`floating-panel hidden ${spec.className||''}`.trim();
      panel.dataset.pluginId=pluginId;
      panel.dataset.pluginActivity=spec.activity||'';
      panel.innerHTML=`
        <div class="floating-header drag-handle">
          <span>${spec.label||spec.id||pluginId}</span>
          <div class="panel-header-actions">
            ${spec.headerActionsHtml||''}
            <button class="panel-close" type="button" aria-label="关闭">×</button>
          </div>
        </div>
        <div class="floating-body ${spec.bodyClass||''}">${spec.html||''}</div>`;
      document.querySelector('#app')?.appendChild(panel);
      created=true;
      panel.querySelector('.panel-close')?.addEventListener('click',()=>panel.classList.add('hidden'));
      host?.makeFloating?.(panel);
      addCleanup(pluginId,()=>panel.remove());
    }
    panel.dataset.pluginActivity=spec.activity||panel.dataset.pluginActivity||'';
    registerContribution(pluginId,'ui.panels',spec.id,{...spec,panelId:panel.id,element:panel});
    if(spec.toolbar!==false){
      const commandId=`${pluginId}.${spec.id}.toggle`;
      registerCommand(pluginId,commandId,async()=>{
        panel.classList.toggle('hidden');
        if(!panel.classList.contains('hidden'))await spec.onOpen?.({panel,host});
      });
      createToolbarButton(pluginId,{
        id:spec.buttonId,label:spec.toolbarLabel||spec.label||spec.id,title:spec.title||'',
        className:spec.buttonClass||'',group:spec.group||'analysis',activity:spec.activity||'',
        order:spec.order||100,priority:spec.priority||0,section:spec.section||'',command:commandId
      });
    }
    spec.onMount?.({panel,created,host});
    refreshActivityVisibility();
    return panel;
  }

  function addPanelToggle(pluginId, spec) {
    const panel = document.getElementById(spec.panelId);
    if (!panel) throw new Error(`Plugin panel not found: ${spec.panelId}`);
    panel.dataset.pluginActivity = spec.activity || panel.dataset.pluginActivity || '';
    const commandId = `${pluginId}.${spec.id}.toggle`;
    addCleanup(pluginId, () => panel.classList.add('hidden'));
    registerCommand(pluginId, commandId, () => {
      if (spec.toggle) return spec.toggle({ panel, host });
      panel.classList.toggle('hidden');
    });
    return createToolbarButton(pluginId, {
      id: spec.buttonId,
      label: spec.label,
      title: spec.title,
      className: spec.buttonClass,
      group: spec.group || 'analysis',
      activity: spec.activity || '',
      order: spec.order || 100,
      priority: spec.priority || 0,
      section: spec.section || '',
      command: commandId
    });
  }

  function createApi(definition) {
    const pluginId = definition.manifest.id;
    const pluginType=pluginTypeForManifest(definition.manifest);
    const dataAssignmentsMatch=(artifact)=>{
      if(pluginType!=='workbench')return true;
      const raw=artifact?.metadata?.dataAssignments;
      if(!Array.isArray(raw))return true;
      const rows=raw.map(String);return rows.includes('*')||rows.includes(pluginId);
    };
    const sourceCapability=()=>{
      const base=window.DKDSCapabilities?.proxy?.('core.data-sources')||null;if(!base)return null;
      if(pluginType!=='workbench')return base;
      return new Proxy(base,{get(target,prop,receiver){
        if(prop==='list')return options=>target.list?.({...((options&&typeof options==='object')?options:{}),consumer:pluginId})||[];
        if(prop==='setAssignments')return undefined;
        if(prop==='detach')return ref=>{
          const rows=target.list?.({consumer:pluginId})||[];const row=rows.find(item=>String(item?.artifactId||item?.path||'')===String(ref?.artifactId||ref?.path||ref||'')||String(item?.sourcePath||'')===String(ref?.sourcePath||''));if(!row)return {updated:false};
          const targets=target.targets?.()||[];const current=Array.isArray(row.assignments)?row.assignments.map(String):[];const expanded=current.includes('*')?targets.map(item=>String(item.id)):current;return target.setAssignments?.({artifactId:row.artifactId,path:row.path,sourcePath:row.sourcePath},expanded.filter(id=>id!==pluginId));
        };
        const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;
      }});
    };
    const infrastructureScope = window.DKDSUI?.createScope?.(pluginId, { host, events:{ emit:eventEmitNow }, commands:{ run:runCommand } }) || null;
    const ioScope = window.DKDSIO?.createScope?.(pluginId) || null;
    const chartScope = window.DKDSCharts?.createScope?.(pluginId) || null;
    const componentScope = window.DKDSComponents?.createScope?.(pluginId,{root:document}) || null;
    const dataFlowScope = window.DKDSDataFlow?.createScope?.(pluginId) || null;
    const scientificReactiveScope = window.DKDSScientificReactive?.createScope?.(pluginId) || null;
    const scientificPipelineScope = window.DKDSScientificPipeline?.createScope?.(pluginId) || null;
    const scientificTransformScope = window.DKDSScientificTransforms?.createScope?.(pluginId) || null;
    const scientificAlgorithmScope = window.DKDSScientificAlgorithms?.createScope?.(pluginId) || null;
    const serviceScope = window.DKDSServices?.createScope?.(pluginId) || null;
    const moduleScope = window.DKDSPluginModules?.createScope?.(pluginId) || null;
    if (infrastructureScope) addCleanup(pluginId, () => infrastructureScope.dispose());
    if (componentScope) addCleanup(pluginId, () => componentScope.dispose?.());
    if (ioScope) addCleanup(pluginId, () => window.DKDSIO?.disposeOwner?.(pluginId));
    if (chartScope) addCleanup(pluginId, () => window.DKDSCharts?.disposeOwner?.(pluginId));
    if (dataFlowScope) addCleanup(pluginId, () => window.DKDSDataFlow?.removeOwner?.(pluginId));
    if (scientificReactiveScope) addCleanup(pluginId, () => window.DKDSScientificReactive?.removeOwner?.(pluginId));
    if (scientificPipelineScope) addCleanup(pluginId, () => window.DKDSScientificPipeline?.removeOwner?.(pluginId));
    if (scientificTransformScope) addCleanup(pluginId, () => window.DKDSScientificTransforms?.removeOwner?.(pluginId));
    if (scientificAlgorithmScope) addCleanup(pluginId, () => window.DKDSScientificAlgorithms?.removeOwner?.(pluginId));
    if (scientificTransformScope && scientificPipelineScope && (definition.manifest.requiresCore||[]).includes('data.transforms')) scientificTransformScope.installPipeline?.(scientificPipelineScope);
    if (serviceScope) addCleanup(pluginId, () => window.DKDSServices?.removeOwner?.(pluginId));
    if (window.DKDSPerformance) addCleanup(pluginId, () => window.DKDSPerformance?.trimPrefix?.(`${pluginId}.`,{targetEntries:0,dropWeak:true,reason:'plugin-deactivate'}));
    const normalizeShortcutSpec = spec => {
      const row={order:100,priority:0,...(spec||{}),id:spec?.id};
      const chord=String(row.chord||row.key||row.shortcut||'').trim();
      if(!row.match&&chord&&window.DKDSUI?.shortcuts){
        const normalized=window.DKDSUI.shortcuts.normalizeChord(chord);
        row.match=event=>window.DKDSUI.shortcuts.eventChord(event)===normalized;
      }
      return row;
    };
    const algorithmList=(query={})=>{
      const q=typeof query==='string'?{category:query}:query||{};
      const local=(window.DKDSScientificAlgorithms?.list?.(q)||[]).map(row=>({...row,remote:false,run:(input,options={})=>window.DKDSScientificAlgorithms.run({id:row.id,version:row.version,category:row.category},input,options)}));
      const keys=new Set(local.map(row=>`${row.category}::${row.id}@${row.version}`));
      for(const cap of (window.DKDSCapabilities?.list?.('analysis.algorithm')||[])){
        const meta=cap.metadata||{},id=String(meta.id||meta.algorithmId||''),version=String(meta.version||meta.algorithmVersion||cap.version||'1.0.0'),category=String(meta.category||'');
        if(!id||!category)continue;
        const key=`${category}::${id}@${version}`;if(keys.has(key))continue;
        if(q.category&&category!==String(q.category))continue;if(q.id&&id!==String(q.id))continue;if(q.version&&version!==String(q.version))continue;
        const proxy=window.DKDSCapabilities.proxy(cap.id);
        local.push({id,algorithmId:id,version,algorithmVersion:version,category,owner:cap.owner,title:meta.title||meta.name||cap.title||id,description:meta.description||'',default:meta.default===true,priority:Number(meta.priority)||Number(cap.priority)||0,inputTypes:meta.inputTypes||[],outputTypes:meta.outputTypes||[],parameterSchema:meta.parameterSchema||null,tags:meta.tags||[],metadata:meta.metadata||{},remote:true,run:(input,options={})=>proxy.run(input,options),defaultSettings:cap.methods?.includes?.('defaultSettings')?(()=>proxy.defaultSettings()):undefined,getPreset:cap.methods?.includes?.('getPreset')?((name)=>proxy.getPreset(name)):undefined,migrateParameters:cap.methods?.includes?.('migrateParameters')?((value,fromVersion)=>proxy.migrateParameters(value,fromVersion)):undefined});
        keys.add(key);
      }
      const cmp=window.DKDSScientificAlgorithms?.compareVersion||(()=>0);
      return local.sort((a,b)=>(Number(b.default)-Number(a.default))||((Number(b.priority)||0)-(Number(a.priority)||0))||cmp(b.version,a.version)||String(a.title).localeCompare(String(b.title)));
    };
    const algorithmResolve=(ref,query={})=>{
      const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref||''),version:'',category:String(query.category||'')};
      return algorithmList(query).find(row=>(!wanted.category||row.category===wanted.category)&&(!wanted.id||row.id===wanted.id)&&(!wanted.version||row.version===wanted.version))||null;
    };
    const registerAlgorithm=(id,spec={})=>{
      if(!scientificAlgorithmScope)throw new Error('Scientific Algorithm Runtime unavailable.');
      const version=String(spec.version||definition.manifest.version||'1.0.0'),category=String(spec.category||'').trim();
      const descriptor=scientificAlgorithmScope.register(id,{...spec,version});
      if(window.DKDSCapabilities&&typeof (spec.run||spec.compute||spec.detect)==='function'){
        const capId=`analysis.algorithm:${category}:${id}@${version}`,methods={run:spec.run||spec.compute||spec.detect};
        if(typeof spec.defaultSettings==='function')methods.defaultSettings=spec.defaultSettings;if(typeof spec.getPreset==='function')methods.getPreset=spec.getPreset;if(typeof spec.migrateParameters==='function')methods.migrateParameters=spec.migrateParameters;
        window.DKDSCapabilities.register(pluginId,capId,{kind:'analysis.algorithm',title:spec.title||spec.name||id,version,remote:true,priority:Number(spec.priority)||0,tags:spec.tags||[],metadata:{id,version,category,title:spec.title||spec.name||id,description:spec.description||'',default:spec.default===true,priority:Number(spec.priority)||0,inputTypes:spec.inputTypes||spec.inputType||[],outputTypes:spec.outputTypes||spec.outputType||[],parameterSchema:spec.parameterSchema||null,tags:spec.tags||[],metadata:spec.metadata||{},pluginId},methods});
        addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(capId));
      }
      return descriptor;
    };
    const runAlgorithm=(ref,input,options={})=>{const row=algorithmResolve(ref,options);if(!row)throw new Error(`Scientific algorithm unavailable: ${typeof ref==='string'?ref:JSON.stringify(ref)}`);return row.run(input,{...options,parameters:options.parameters||{}});};
    const algorithmVersions=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};return algorithmList({category:wanted.category,id:wanted.id,owner:query.owner});};
    const diagnoseAlgorithm=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};const family=algorithmVersions(wanted,query),exact=wanted.version?family.find(row=>row.version===wanted.version):null,resolved=algorithmResolve(wanted,query);let status='available';if(wanted.version&&!exact)status=family.length?'missing-version':'missing-algorithm';else if(!wanted.version&&!resolved)status='missing-algorithm';return Object.freeze({status,available:status==='available',requested:Object.freeze({...wanted}),resolved:resolved?Object.freeze({category:resolved.category,id:resolved.id,version:resolved.version,owner:resolved.owner}):null,preferredVersion:wanted.category&&wanted.id?window.DKDSScientificAlgorithms?.preferred?.(wanted.category,wanted.id)||'':'',alternatives:Object.freeze(family.map(row=>Object.freeze({category:row.category,id:row.id,version:row.version,owner:row.owner,title:row.title,default:row.default})))});};
    const lockAlgorithm=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};if(wanted.version)return Object.freeze({category:wanted.category,id:wanted.id,version:wanted.version});const row=algorithmResolve(wanted,query);return Object.freeze({category:row?.category||wanted.category,id:row?.id||wanted.id,version:row?.version||''});};
    const locateAlgorithmPackage=async(ref)=>{if(!window.electronAPI?.pluginAlgorithmCatalog||window.electronAPI?.isWebClient)return {requested:window.DKDSScientificAlgorithms?.normalizeRef?.(ref)||ref,count:0,candidates:[]};return await window.electronAPI.pluginAlgorithmCatalog(ref);};
    const recoverAlgorithmPackage=async(ref,candidate=null)=>{
      const catalog=await locateAlgorithmPackage(ref),choice=candidate||catalog?.candidates?.find?.(row=>row.compatible&&row.recoverable);if(!choice)throw new Error('未找到兼容的算法 Provider 包。');
      const pluginId=String(choice.pluginId||'');
      if(choice.source==='history'){await rollbackExternalPlugin(pluginId,choice.token);}
      else {
        let def=definitionById(pluginId);
        if(!def&&choice.source==='external'&&window.electronAPI?.pluginExternalList){const result=await window.electronAPI.pluginExternalList();const pkg=(result?.packages||[]).find(row=>String(row?.manifest?.id||'')===pluginId);if(pkg)await replaceExternalPluginPackage(pkg,{statusPrefix:'已恢复算法 Provider'});def=definitionById(pluginId);}
        if(!def)throw new Error(`算法 Provider 未载入：${pluginId}`);
        if(!isDefinitionEnabled(def))await setPluginEnabled(pluginId,true);else await reloadPlugin(pluginId);
      }
      const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref)||ref,row=algorithmResolve(wanted,{category:wanted?.category||''});if(!row||wanted?.version&&row.version!==wanted.version)throw new Error(`恢复后仍未找到算法：${wanted?.id||''}@${wanted?.version||''}`);return row;
    };
    let apiRef=null;
    const api=Object.freeze({
      apiVersion: API_VERSION,
      contract: Object.freeze({version:window.DKDSPluginContract?.VERSION||'',requirements:window.DKDSPluginContract?.requirements||[]}),
      manifest: Object.freeze({ ...definition.manifest }),
      host,
      platform: window.DKDSPlatform,
      runtime: Object.freeze({
        appVersion:String(host?.appVersion||''),
        isAuxiliaryWindow:!!host?.isAuxiliaryWindow,
        isWebClient:!!host?.isWebClient
      }),
      status: Object.freeze({set:text=>host?.setStatus?.(String(text??''))}),
      events: {
        on: (name, fn) => addCleanup(pluginId, eventOn(name, fn, pluginId)),
        emit: (name, payload) => {
          if (name === 'layout:resize' && infrastructureScope) {
            if (layoutResizeDispatching) return false;
            infrastructureScope.emitResize(payload || {});
            return true;
          }
          return eventEmit(name, payload);
        }
      },
      commands: {
        register: (id, handler, meta) => registerCommand(pluginId, id, handler, meta),
        run: runCommand,
        get: id => getRegistry('commands').get(id) || null
      },
      registry: {
        add: (kind, id, value) => registerTypedContribution(pluginId, kind, id, value),
        list: kind => listContributions(kind),
        own: kind => listContributions(kind).filter(x => x.pluginId === pluginId)
      },
      capabilities: {
        register(id,spec={}) {
          if(!window.DKDSCapabilities?.register)throw new Error('Capability Runtime is unavailable.');
          const value=window.DKDSCapabilities.register(pluginId,id,{...spec,owner:pluginId,version:spec.version||definition.manifest.version||'1.0.0'});
          addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(id));
          return value;
        },
        get:id=>window.DKDSCapabilities?.get?.(id)||null,
        require:(id,options)=>window.DKDSCapabilities?.require?.(id,options),
        proxy:id=>String(id)==='core.data-sources'?sourceCapability():(window.DKDSCapabilities?.proxy?.(id)||null),
        list:query=>window.DKDSCapabilities?.list?.(query)||[],
        invoke:(id,method,...args)=>window.DKDSCapabilities?.invoke?.(id,method,...args),
        watch:(fn,options={})=>{
          if(!window.DKDSCapabilities?.subscribe)return ()=>{};
          const off=window.DKDSCapabilities.subscribe(fn,options);
          addCleanup(pluginId,off);
          return off;
        },
        snapshot:()=>window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||{schema:2,providers:[]}
      },
      project: {
        registerSlice: (key, hooks) => registerProjectSlice(pluginId, key, hooks),
        current:()=>host?.getActiveProjectTab?.()||null,
        create:()=>host?.makeProject?.()||{},
        capture:()=>host?.captureActiveProjectTab?.()
      },
      workspace: Object.freeze({
        openPage:id=>host?.openAnalysisPage?.(id),
        closeCurrentWindow:()=>host?.closeCurrentWindow?.(),
        isAuxiliary:()=>!!host?.isAuxiliaryWindow
      }),
      io: ioScope,
      science: window.DKDSScience || window.Analysis || null,
      performance: Object.freeze({
        memoWeak:(namespace,target,key,compute,options={})=>window.DKDSPerformance?.memoWeak?.(`${pluginId}.${String(namespace||'core')}`,target,key,compute,options)??compute?.(),
        memo:(namespace,key,compute,options={})=>window.DKDSPerformance?.memo?.(`${pluginId}.${String(namespace||'core')}`,key,compute,options)??compute?.(),
        stage:(namespace,revision,parameterKey,compute,options={})=>window.DKDSPerformance?.stage?.(`${pluginId}.${String(namespace||'core')}`,revision,parameterKey,compute,options)??compute?.(),
        configure:(namespace,spec={})=>window.DKDSPerformance?.configure?.(`${pluginId}.${String(namespace||'core')}`,spec)||null,
        trim:(namespace,options={})=>window.DKDSPerformance?.trim?.(`${pluginId}.${String(namespace||'core')}`,options)||null,
        trimAll:(options={})=>window.DKDSPerformance?.trimPrefix?.(`${pluginId}.`,options)||null,
        snapshot:()=>window.DKDSPerformance?.snapshot?.(`${pluginId}.`)||null,
        measure:(namespace,fn)=>window.DKDSPerformance?.measure?.(`${pluginId}.${String(namespace||'core')}`,fn)??fn?.(),
        skip:(namespace,count=1)=>window.DKDSPerformance?.skip?.(`${pluginId}.${String(namespace||'core')}`,count),
        metric:namespace=>window.DKDSPerformance?.metric?.(`${pluginId}.${String(namespace||'core')}`)||null
      }),
      services: serviceScope,
      modules: moduleScope,
      recipes: Object.freeze({
        use:(id,options={})=>{
          if(!window.DKDSHostRecipes?.use)throw new Error('Core Host Recipe Runtime is unavailable.');
          return window.DKDSHostRecipes.use(id,apiRef,options);
        },
        list:()=>window.DKDSHostRecipes?.list?.()||[]
      }),
      state: {
        create(initial={}, options={}) {
          if(!window.DKDSState?.create)throw new Error('DKDS state-store infrastructure is unavailable.');
          const store=window.DKDSState.create(initial, options);
          addCleanup(pluginId,()=>store.dispose?.());
          const slice=String(options.projectSlice||'').trim();
          if(slice){
            registerProjectSlice(pluginId,slice,{
              serialize:()=>typeof options.serialize==='function'?options.serialize(store.get(),store):store.snapshot(),
              restore:(data,context)=>{
                const next=typeof options.migrate==='function'?options.migrate(data,context,store):data;
                store.restore(next===undefined?initial:next,{reason:'project-restore'});
              },
              reset:()=>store.reset({reason:'project-reset'})
            });
          }
          return store;
        }
      },
      data: {
        model: window.DKDSData,
        formula: window.DKDSFormula,
        sources:Object.freeze({
          list:options=>sourceCapability()?.list?.(options)||[],
          targets:()=>sourceCapability()?.targets?.()||[],
          detach:pluginType==='workbench'?ref=>sourceCapability()?.detach?.(ref):undefined,
          setAssignments:pluginType==='data'||pluginType==='foundation'?(ref,ids)=>sourceCapability()?.setAssignments?.(ref,ids):undefined
        }),
        importWorkbench:Object.freeze({
          open:(options={})=>{
            const row=options&&typeof options==='object'?options:{};
            const accepts=Array.isArray(definition?.manifest?.data?.accepts)?definition.manifest.data.accepts.map(String):[];
            return host?.openImportWorkbench?.({...row,...(pluginType==='workbench'?{mode:'scoped',consumerId:pluginId,consumerLabel:String(workspaceMeta(definition.manifest).title||definition.manifest.name||pluginId),consumerIcon:String(workspaceMeta(definition.manifest).icon||defaultPluginIcon(definition.manifest)),accepts,targets:[pluginId]}:{})});
          }
        }),
        flow: dataFlowScope,
        transforms: scientificTransformScope ? Object.freeze({
          version:scientificTransformScope.version,
          register:(id,spec)=>scientificTransformScope.register(id,spec),
          unregister:id=>scientificTransformScope.unregister(id),
          get:id=>scientificTransformScope.get(id),
          resolve:value=>scientificTransformScope.resolve(value),
          list:q=>scientificTransformScope.list(q),
          runCurve:(id,input,options={})=>scientificTransformScope.runCurve(id,input,options),
          runScalarField:(id,input,options={})=>scientificTransformScope.runScalarField(id,input,options),
          curveStageId:id=>scientificTransformScope.curveStageId(id),
          fieldStageId:id=>scientificTransformScope.fieldStageId(id)
        }) : null,
        reactive: scientificReactiveScope || null,
        pipeline: scientificPipelineScope ? Object.freeze({
          version:scientificPipelineScope.version,
          register:(id,spec)=>scientificPipelineScope.register(id,spec),
          unregister:id=>scientificPipelineScope.unregister(id),
          get:id=>scientificPipelineScope.get(id),
          list:q=>scientificPipelineScope.list(q),
          run:(id,input,options={})=>scientificPipelineScope.run(id,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          runSync:(id,input,options={})=>scientificPipelineScope.runSync(id,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          runPlan:(plan,input,options={})=>scientificPipelineScope.runPlan(plan,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          snapshot:()=>scientificPipelineScope.snapshot()
        }) : null,
        importers: Object.freeze({
          register:(id,spec={})=>{
            const value={id,...spec,pluginId,version:spec.version||definition.manifest.version||'1.0.0'};
            registerTypedContribution(pluginId,'data.importers',id,value);
            window.DKDSDataFlow?.register?.(pluginId,'importer',id,{...spec,run:spec.run||spec.parse||spec.parseArtifacts});
            return value;
          },
          list:()=>listContributions('data.importers').map(row=>row.value)
        }),
        exporters: dataFlowScope?.exporters || null,
        transformers: dataFlowScope?.transformers || null,
        analyzers: dataFlowScope?.analyzers || null,
        types: infrastructureScope?.dataTypes || Object.freeze({
          register:(id,spec)=>window.DKDSUI?.dataTypes?.register?.(pluginId,id,spec),
          get:id=>window.DKDSUI?.dataTypes?.get?.(id)||null,
          list:q=>window.DKDSUI?.dataTypes?.list?.(q)||[],
          isA:(id,parent)=>window.DKDSUI?.dataTypes?.isA?.(id,parent)||false,
          infer:(value,q)=>window.DKDSUI?.dataTypes?.infer?.(value,q)||null,
          describe:(id,value)=>window.DKDSUI?.dataTypes?.describe?.(id,value)||'',
          projectSelection:(id,value,context)=>window.DKDSUI?.dataTypes?.projectSelection?.(id,value,context)||{value},
          resolve:(id,item,context)=>window.DKDSUI?.dataTypes?.resolve?.(id,item,context)
        }),
        artifacts: {
          list: options => {const rows=(host?.artifacts?.list?.(options)||[]).filter(dataAssignmentsMatch);infrastructureScope?.entities?.projectArtifacts?.(rows);return rows;},
          revision: kind => host?.artifacts?.revision?.(kind)||0,
          fingerprint: id => host?.artifacts?.fingerprint?.(id)||'',
          get: id => {const row=host?.artifacts?.get?.(id)||null;if(row&&!dataAssignmentsMatch(row))return null;if(row)infrastructureScope?.entities?.projectArtifact?.(row);return row;},
          add: (artifact, options) => {const result=host?.artifacts?.add?.(artifact, options);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          upsert: artifact => {const result=host?.artifacts?.upsert?.(artifact);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          publish: (artifact, options={}) => {const result=host?.artifacts?.publish?.(artifact, options) || host?.artifacts?.upsert?.(artifact);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          batch: fn => host?.artifacts?.batch?.(batchApi=>fn?.(Object.freeze({...batchApi,projectArtifact:artifact=>infrastructureScope?.entities?.projectArtifact?.(artifact)}))) || fn?.(host?.artifacts),
          lineage: id => host?.artifacts?.lineage?.(id) || null,
          children: id => host?.artifacts?.children?.(id) || [],
          parents: id => host?.artifacts?.parents?.(id) || [],
          remove: id => host?.artifacts?.remove?.(id),
          syncLegacy: () => {const store=host?.artifacts?.syncLegacy?.();const rows=host?.artifacts?.list?.({includeTransient:true})||[];infrastructureScope?.entities?.projectArtifacts?.(rows);return store;}
        },
        entities: infrastructureScope?.entities || Object.freeze({
          upsert: entity => window.DKDSEntities?.registry?.upsert?.(entity,{owner:pluginId}),
          get: id => window.DKDSEntities?.registry?.get?.(id)||null,
          list: q => window.DKDSEntities?.registry?.list?.(q)||[],
          children: (id,options) => window.DKDSEntities?.registry?.childrenOf?.(id,options)||[],
          ancestors: (id,options) => window.DKDSEntities?.registry?.ancestorsOf?.(id,options)||[],
          related: (a,b) => window.DKDSEntities?.registry?.isRelated?.(a,b)||false,
          setState: (id,patch,meta) => window.DKDSEntities?.registry?.setState?.(id,patch,meta)
        })
      },
      workflow: {
        run: (recipe, options) => window.DKDSWorkflow.run(recipe, options),
        buildSequentialRecipe: spec => window.DKDSWorkflow.buildSequentialRecipe(spec),
        processors: {
          register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('processor', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'workflow.processors',id,value);registerProviderCapability(pluginId,'workflow.processors',id,value);return value;},
          list: () => listProvidersWithCapabilities('workflow.processors')
        },
        analyzers: {
          register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('analyzer', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'workflow.analyzers',id,value);registerProviderCapability(pluginId,'workflow.analyzers',id,value);return value;},
          list: () => listProvidersWithCapabilities('workflow.analyzers')
        },
        recipes: {
          register: (id, recipe) => {
            const value={...recipe,id:recipe?.id||id,pluginId,pluginVersion:definition.manifest.version||'1.0.0'};
            const check=window.DKDSWorkflow.validateRecipe(value);
            if(!check.ok)throw new Error(`Recipe ${id}: ${check.errors.join(' ')}`);
            return registerTypedContribution(pluginId, 'workflow.recipes', id, value);
          },
          list: () => listContributions('workflow.recipes').map(x=>x.value)
        }
      },
      charts: {
        register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('chart', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'charts.renderers',id,value);registerProviderCapability(pluginId,'charts.renderers',id,value);return value;},
        list: () => listProvidersWithCapabilities('charts.renderers')
      },
      analysis: {
        providers: Object.freeze({
          register:(id,spec={})=>registerTypedContribution(pluginId,'analysis.providers',id,{id,...spec,pluginId,version:spec.version||definition.manifest.version||'1.0.0'}),
          list:()=>listContributions('analysis.providers').map(row=>row.value),
          get:id=>getRegistry('analysis.providers').get(String(id||''))?.value||null
        }),
        algorithms: scientificAlgorithmScope ? Object.freeze({
          version:scientificAlgorithmScope.version,
          register:registerAlgorithm,
          unregister:(id,version,category)=>scientificAlgorithmScope.unregister(id,version,category),
          list:algorithmList,
          resolve:algorithmResolve,
          versions:algorithmVersions,
          diagnose:diagnoseAlgorithm,
          lock:lockAlgorithm,
          run:runAlgorithm,
          provenance:(ref,query={})=>{const row=algorithmResolve(ref,query);return row?Object.freeze({pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title}):null;},
          preferred:(category,id)=>window.DKDSScientificAlgorithms?.preferred?.(category,id)||'',
          setPreferred:(ref,query={})=>window.DKDSScientificAlgorithms?.setPreferred?.(ref,query)||null,
          clearPreferred:(category,id)=>window.DKDSScientificAlgorithms?.clearPreferred?.(category,id)||false,
          locate:locateAlgorithmPackage,
          recover:recoverAlgorithmPackage,
          snapshot:()=>window.DKDSScientificAlgorithms?.snapshot?.()||{version:'',count:0,algorithms:[]}
        }) : null,
        detectors: {
          // Compatibility facade: detector providers are now versioned Scientific Algorithms.
          register: (id, spec={}) => {
            const descriptor=registerAlgorithm(id,{...spec,category:'peak-detector',run:spec.run||spec.detect,inputTypes:spec.inputTypes||['science.iv.raw'],outputTypes:spec.outputTypes||['science.resonance.peak']});
            return {...descriptor,name:spec.name||spec.title||id,shortName:spec.shortName||'',presets:spec.presets||[],detect:(input,settings,options={})=>runAlgorithm({id,version:descriptor.version,category:'peak-detector'},input,{...options,parameters:settings||{}}),getPreset:spec.getPreset,defaultSettings:spec.defaultSettings};
          },
          list: () => algorithmList({category:'peak-detector'}).map(row=>({...row,name:row.title,shortName:row.metadata?.shortName||row.title,description:row.description,presets:row.metadata?.presets||[],detect:(input,settings,options={})=>row.run(input,{...options,parameters:settings||{}})}))
        }
      },
      parameters: {
        render: (container, schema, options) => window.DKDSParameters.render(container, schema, options),
        validate: (schema, values, context) => window.DKDSParameters.validate(schema, values, context),
        defaults: (schema, initial) => window.DKDSParameters.defaultValues(schema, initial)
      },
      ui: {
        // Plugin-neutral UI infrastructure. These primitives are available in
        // both the main SUPER host and dedicated TOP windows, so feature code
        // never needs to own drag/dock/shortcut/resize plumbing.
        infrastructure: infrastructureScope,
        layout: infrastructureScope?.layout || null,
        actions: infrastructureScope?.actions || null,
        portable: infrastructureScope?.panels || null,
        charts: Object.freeze({...(infrastructureScope?.chartsApi||{}),...(chartScope||{})}),
        dom: componentScope,
        components: Object.freeze({
          mount:(container,spec,context)=>window.DKDSComponents?.mount?.(container,spec,context),
          escape:value=>window.DKDSComponents?.escape?.(value)??String(value??'')
        }),
        plotViews: infrastructureScope?.plotViews || null,
        tables: infrastructureScope?.tables || null,
        settings: infrastructureScope?.settings || null,
        interactions: infrastructureScope?.interactions || null,
        interaction: infrastructureScope?.interactionRuntime || null,
        interactionBehaviors: infrastructureScope?.interactionBehaviors || null,
        contextMenus: infrastructureScope?.menus || null,
        selection: infrastructureScope?.selection || null,
        views: infrastructureScope?.views || null,
        workbench: infrastructureScope?.workbench || null,
        pluginWorkspace: infrastructureScope?.pluginWorkspace || infrastructureScope?.analysisWorkbench || null,
        analysisWorkbench: infrastructureScope?.pluginWorkspace || infrastructureScope?.analysisWorkbench || null,
        workspaceSurface: (infrastructureScope?.pluginWorkspace||infrastructureScope?.analysisWorkbench) ? Object.freeze({
          create:(root,spec)=> (infrastructureScope.pluginWorkspace||infrastructureScope.analysisWorkbench).create(root,spec),
          compose:(root,spec={})=>{
            const wb=(infrastructureScope.pluginWorkspace||infrastructureScope.analysisWorkbench).create(root,spec);
            wb.compose?.(spec);
            return wb;
          },
          roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})
        }) : null,
        analysisSurface: (infrastructureScope?.pluginWorkspace||infrastructureScope?.analysisWorkbench) ? Object.freeze({
          create:(root,spec)=> (infrastructureScope.pluginWorkspace||infrastructureScope.analysisWorkbench).create(root,spec),
          compose:(root,spec={})=>{
            const wb=(infrastructureScope.pluginWorkspace||infrastructureScope.analysisWorkbench).create(root,spec);
            wb.compose?.(spec);
            return wb;
          },
          roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})
        }) : null,
        scientificPlot: infrastructureScope?.scientificPlot || null,
        entities: infrastructureScope?.entities || null,
        designSystem: Object.freeze({name:'GRS Plugin Workspace',version:'1.6',hostInvariant:true,canvasDocking:true,contextualExports:true,stableHomeSlots:true,standardPlotViews:true,strongViewContract:true,layeredFloating:true,autoPlotHydration:true,coreIO:true,coreCharts:true,scopedDOM:true,declarativeComponents:true,dataFlowRuntime:true,linkedSelectionViews:true,horizontalWheelStrips:true,entityRuntime:true,scientificPlotRuntime:true,tableViewRuntime:true,artifactLineage:true}),
        grid: infrastructureScope?.grid || null,
        activities: {
          add: spec => registerActivity(pluginId, spec.id, spec),
          activate: id => setActiveActivity(id,{invoke:true}),
          active: () => activeActivityId
        },
        edit: {
          register: spec => {const row=spec&&typeof spec==='object'?spec:{};const id=String(row.id||'default');return registerTypedContribution(pluginId,'ui.editActions',id,{...row,id,pluginId});},
          invoke: (action,payload) => invokeEditAction(action,payload)
        },
        topWorkspace: {
          register: spec => registerTopWorkspace(pluginId,spec),
          isSuper: () => superPluginId===pluginId
        },
        prime: {
          register: (id,spec) => registerPrimeContribution(pluginId,id,spec),
          place: (id,placement,options) => placePrimeContribution(pluginId,id,placement,options),
          placement: id => primePlacementFor(pluginId,id)
        },
        sub: {
          register: (id,spec) => registerSubContribution(pluginId,id,spec)
        },
        toolbar: {
          add: spec => createToolbarButton(pluginId, spec)
        },
        statusBar: {
          add: spec => addStatusBarItem(pluginId, spec),
          own: () => listContributions('ui.statusItems').filter(row=>row.pluginId===pluginId).map(row=>row.value)
        },
        mainTools: {
          add: spec => addMainTool(pluginId,spec)
        },
        menus: {
          add: spec => addMenuItem(pluginId,spec)
        },
        sidebar: {
          add: spec => addSidebarSection(pluginId,spec)
        },
        inspectors: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.inspectors',id,{id,...spec,pluginId})
        },
        groupCharts: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.groupCharts',id,{id,...spec,pluginId})
        },
        groupViews: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.groupViews',id,{id,...spec,pluginId})
        },
        mainViews: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.mainViews',id,{id,...spec,pluginId})
        },
        selectionMenus: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.selectionMenus',id,{id,...spec,pluginId})
        },
        mainOverlays: {
          add: spec => addMainOverlay(pluginId,spec)
        },
        shortcuts: {
          add: spec => {
            const row=normalizeShortcutSpec(spec);
            return registerContribution(pluginId,'ui.shortcuts',row.id,{...row,pluginId});
          },
          chord: value => window.DKDSUI?.shortcuts?.normalizeChord?.(value) || String(value||'')
        },
        pages: {
          add: spec => addPage(pluginId, spec)
        },
        panels: {
          add: spec => addPanel(pluginId,spec),
          addToggle: spec => addPanelToggle(pluginId, spec)
        },
        styles: {
          add: (id, cssText) => addStyle(pluginId, id, cssText)
        }
      }
    });
    apiRef=api;
    return api;
  }

  function restorePluginProjectState(pluginId, data={}) {
    const slices = projectSlices.get(pluginId);
    if (!slices) return;
    const pluginData = data?.[pluginId] || {};
    for (const [key, hooks] of slices) {
      const hasSlice = Object.prototype.hasOwnProperty.call(pluginData, key);
      try {
        // Missing plugin slices represent fresh project state. Historical root
        // fields are migrated by project-format before reaching this layer.
        if (!hasSlice) {
          hooks.reset?.({ pluginData, reason:'missing-project-slice' });
          continue;
        }
        if (typeof hooks.restore === 'function') hooks.restore(pluginData?.[key], { pluginData });
      }
      catch (err) { console.error(`[DKDS plugin project restore:${pluginId}/${key}]`, err); }
    }
  }

  async function activateDefinition(definition, { restoreCurrentProject=true }={}) {
    const { manifest } = definition;
    if (active.has(manifest.id)) return active.get(manifest.id)?.instance || null;
    if (manifest.apiVersion && !String(manifest.apiVersion).startsWith('1.')) {
      disabled.set(manifest.id, `Unsupported plugin API ${manifest.apiVersion}`);
      eventEmit('plugin:state-changed', { id:manifest.id, reason:'api-version' });
      return null;
    }
    disabled.delete(manifest.id);
    const api = createApi(definition);
    try {
      window.DKDSPluginContract?.assertApi?.(api,manifest);
      // Project the already-loaded project data into the Core Entity graph before
      // plugin activation. Plugins can therefore bind views to canonical artifact
      // IDs immediately instead of rebuilding identity maps during mount.
      try { api.data?.artifacts?.list?.({includeTransient:true}); }
      catch (err) { console.warn(`[DKDS entity bootstrap:${manifest.id}]`,err); }
      const instance = await definition.activate(api);
      active.set(manifest.id, { manifest, instance: instance || null });
      if (restoreCurrentProject) {
        const tab = host?.getActiveProjectTab?.();
        restorePluginProjectState(manifest.id, tab?.pluginState || {});
      }
      eventEmit('plugin:activated', { id: manifest.id, manifest });
      eventEmit('plugin:state-changed', { id:manifest.id, reason:'activated' });
      return instance || null;
    } catch (err) {
      // Roll back partial registrations so a later Retry/Reload starts cleanly.
      for (const fn of (cleanupByPlugin.get(manifest.id) || []).reverse()) {
        try { fn(); } catch (cleanupError) { console.error(cleanupError); }
      }
      cleanupByPlugin.delete(manifest.id);
      active.delete(manifest.id);
      disabled.set(manifest.id, err.message);
      console.error(`[DKDS plugin activation:${manifest.id}]`, err);
      host?.setStatus?.(`插件 ${manifest.name || manifest.id} 加载失败：${err.message}`);
      eventEmit('plugin:state-changed', { id:manifest.id, reason:'error', error:err.message });
      return null;
    }
  }

  async function deactivate(id, { captureProject=true }={}) {
    const row = active.get(id);
    if (!row) return;
    if (captureProject) {
      try { host?.captureActiveProjectTab?.(); } catch (err) { console.error('[DKDS plugin capture before deactivate]', err); }
    }
    try { await row.instance?.deactivate?.(); } catch (err) { console.error(err); }
    for (const fn of (cleanupByPlugin.get(id) || []).reverse()) {
      try { fn(); } catch (err) { console.error(err); }
    }
    cleanupByPlugin.delete(id);
    active.delete(id);
    eventEmit('plugin:deactivated', { id });
    eventEmit('plugin:state-changed', { id, reason:'deactivated' });
  }

  function pluginTypeForManifest(manifest={}) {
    const declared=String(manifest?.pluginType||'').trim().toLowerCase();
    const allowed=new Set(['foundation','data','algorithm','workbench','task','tool','extension','developer']);
    if(allowed.has(declared))return declared;
    // Backward compatibility for older external packages that predate pluginType.
    // New SDK packages should declare it explicitly; inference is only a safe UI fallback.
    const caps=Array.isArray(manifest?.capabilities)?manifest.capabilities:[];
    if(manifest?.algorithmProvider===true||caps.some(cap=>String(cap).startsWith('analysis.algorithm')))return 'algorithm';
    if(caps.some(cap=>String(cap).startsWith('data.import')||String(cap)==='data.model'||String(cap)==='data.formula'))return 'data';
    if(manifest?.workspace?.role==='top')return 'workbench';
    return manifest?.source==='builtin'?'foundation':'extension';
  }

  function pluginStateRow(definition) {
    const m = definition.manifest;
    const enabled = isDefinitionEnabled(definition);
    const isActive = active.has(m.id);
    const error = disabled.get(m.id) || '';
    const status = error ? 'error' : isActive ? 'active' : enabled ? 'available' : 'disabled';
    const contributionCounts = {};
    for (const [kind, reg] of registries) {
      const count = [...reg.values()].filter(row => row.pluginId === m.id).length;
      if (count) contributionCounts[kind] = count;
    }
    const workspace=workspaceMeta(m);
    const topContract=topWorkspaceForPlugin(m.id);
    const primeCount=[...getRegistry('ui.prime').values()].filter(row=>row.pluginId===m.id).length;
    const subCount=[...getRegistry('ui.sub').values()].filter(row=>row.pluginId===m.id).length;
    return {
      ...m,
      enabled,
      active:isActive,
      status,
      error,
      source:m.source || 'builtin',
      pluginType:pluginTypeForManifest(m),
      systemLocked:isSystemLockedDefinition(definition),
      capabilities:Array.isArray(m.capabilities)?m.capabilities.slice():[],
      contributionCounts,
      preference:preferenceFor(m.id),
      hasWindow:!!(m.window&&String(m.window.activity||'').trim()),
      prewarmDefault:defaultPrewarmFor(definition),
      prewarmPreference:prewarmPreferenceFor(m.id),
      prewarmEnabled:isPrewarmEnabled(definition),
      workspaceRole:workspace.role,
      workspaceActivity:workspace.activity||topContract?.activity||'',
      workspaceIcon:workspace.icon||topContract?.icon||defaultPluginIcon(m),
      workspaceTitle:workspace.title||m.name||m.id,
      icon:defaultPluginIcon(m),
      topContractReady:workspace.role==='top'?!!topContract:false,
      isSuper:m.id===superPluginId,
      primeCount,
      subCount
    };
  }

  function listPluginStates() {
    return definitions
      .slice()
      .sort((a,b)=>(a.manifest.order||100)-(b.manifest.order||100)||String(a.manifest.name||a.manifest.id).localeCompare(String(b.manifest.name||b.manifest.id)))
      .map(pluginStateRow);
  }

  async function setPluginEnabled(id, enabled) {
    const definition = definitionById(id);
    if (!definition) throw new Error(`Plugin not found: ${id}`);
    const next = !!enabled;
    if(!next&&isSystemLockedDefinition(definition))throw new Error('系统与基座插件是应用运行所必需的，不能停用。');
    if(!next&&id===superPluginId)throw new Error('当前 SUPER 主界面不能直接停用。请先将另一个 TOP 插件设为主界面。');
    setPreference(id, next);

    if (!next) {
      await deactivate(id, { captureProject:true });
      disabled.delete(id);
      host?.setStatus?.(`插件 ${definition.manifest.name || id} 已停用。设置会在下次启动继续生效。`);
    } else {
      const result = await activateDefinition(definition, { restoreCurrentProject:true });
      if (!active.has(id)) throw new Error(disabled.get(id) || `Plugin ${id} failed to activate.`);
      host?.setStatus?.(`插件 ${definition.manifest.name || id} 已启用。`);
      void result;
    }
    eventEmit('plugin:preference-changed', { id, enabled:next });
    eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
    return pluginStateRow(definition);
  }

  function setPluginPrewarm(id, enabled) {
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    if(!definition.manifest?.window?.activity)throw new Error(`插件 ${id} 没有独立窗口，不能设置预热。`);
    const next=!!enabled;
    setPrewarmPreference(id,next);
    host?.setStatus?.(`插件 ${definition.manifest.name||id} 的窗口预热已${next?'开启':'关闭'}。`);
    eventEmit('plugin:prewarm-changed',{id,enabled:next});
    eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    return pluginStateRow(definition);
  }

  async function reloadPlugin(id) {
    const definition = definitionById(id);
    if (!definition) throw new Error(`Plugin not found: ${id}`);
    if (!isDefinitionEnabled(definition)) throw new Error(`Plugin ${id} is disabled.`);
    await deactivate(id, { captureProject:true });
    const result = await activateDefinition(definition, { restoreCurrentProject:true });
    if (!active.has(id)) throw new Error(disabled.get(id) || `Plugin ${id} failed to reload.`);
    if(id===superPluginId)await activateSuperWorkspace({invoke:true});
    host?.setStatus?.(`插件 ${definition.manifest.name || id} 已重新加载。`);
    eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
    return result;
  }

  async function resetPluginPreferences() {
    preferences = {};
    prewarmPreferences = {};
    if(superPluginId)preferences[superPluginId]=true;
    writePreferences();
    writePrewarmPreferences();
    for (const definition of definitions) {
      const shouldEnable = isSystemLockedDefinition(definition) || definition.manifest.id===superPluginId ? true : definition.manifest.enabled !== false;
      if (shouldEnable && !active.has(definition.manifest.id)) {
        await activateDefinition(definition, { restoreCurrentProject:true });
      } else if (!shouldEnable && active.has(definition.manifest.id)) {
        await deactivate(definition.manifest.id, { captureProject:true });
        disabled.delete(definition.manifest.id);
      } else if (!shouldEnable) {
        disabled.delete(definition.manifest.id);
      }
    }
    eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
    return listPluginStates();
  }

  function removeDefinition(id){
    const index=definitions.findIndex(d=>d.manifest.id===id);
    if(index>=0)definitions.splice(index,1);
    disabled.delete(id);
  }

  function loadInlinePluginScript(source,label){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.async=false;
      script.dataset.dkdsExternalPlugin=label;
      script.textContent=`${String(source||'')}\n//# sourceURL=dkds-plugin://${encodeURIComponent(label)}`;
      let runtimeError=null;
      const onError=event=>{runtimeError=event?.error||new Error(event?.message||`External plugin script failed: ${label}`);};
      window.addEventListener?.('error',onError);
      try{document.head.appendChild(script);}
      catch(err){runtimeError=err;}
      finally{window.removeEventListener?.('error',onError);script.remove?.();}
      if(runtimeError)reject(runtimeError);else resolve(label);
    });
  }

  async function loadPackagedPlugin(pkg,source='external'){
    const manifest=pkg?.manifest||{};
    assertId(manifest.id);
    if(definitionById(manifest.id))throw new Error(`Plugin id already loaded: ${manifest.id}`);
    const beforeIds=new Set(definitions.map(d=>d.manifest.id));
    try{
      for(const file of (manifest.scripts?.length?manifest.scripts:[manifest.entry||'plugin.js'])){
        const source=pkg?.files?.[file];
        if(typeof source!=='string')throw new Error(`External plugin script missing: ${file}`);
        await loadInlinePluginScript(source,`${manifest.id}/${file}`);
      }
      const created=definitions.filter(d=>!beforeIds.has(d.manifest.id));
      const unexpected=created.filter(d=>d.manifest.id!==manifest.id);
      if(unexpected.length)throw new Error(`Plugin package ${manifest.id} registered unexpected ids: ${unexpected.map(d=>d.manifest.id).join(', ')}`);
      const definition=definitionById(manifest.id);
      if(!definition)throw new Error(`Plugin package did not register manifest id: ${manifest.id}`);
      definition.manifest={...definition.manifest,...manifest,source};

      const styleFiles=Array.isArray(manifest.styles)?manifest.styles:[];
      if(styleFiles.length){
        const originalActivate=definition.activate;
        definition.activate=async api=>{
          for(let i=0;i<styleFiles.length;i++){
            const file=styleFiles[i];
            const css=pkg?.files?.[file];
            if(typeof css!=='string')throw new Error(`External plugin stylesheet missing: ${file}`);
            api.ui.styles.add(`package-style-${i}`,css);
          }
          return await originalActivate(api);
        };
      }
      if(source==='override')overridePackages.set(manifest.id,pkg);
      else externalPackages.set(manifest.id,pkg);
      return definition;
    }catch(err){
      for(const d of definitions.slice()){
        if(!beforeIds.has(d.manifest.id))removeDefinition(d.manifest.id);
      }
      throw err;
    }
  }

  async function loadExternalPackage(pkg){return loadPackagedPlugin(pkg,'external');}
  async function loadOverridePackage(pkg){return loadPackagedPlugin(pkg,'override');}

  async function loadExternalEntries(){
    if(externalLoadingPromise)return externalLoadingPromise;
    externalLoadingPromise=(async()=>{
      if(!window.electronAPI?.pluginExternalList||window.electronAPI?.isWebClient)return [];
      let result;
      try{result=await window.electronAPI.pluginExternalList();}
      catch(err){externalLoadErrors.push({file:'<external directory>',error:err.message});return [];}
      for(const row of result?.errors||[])externalLoadErrors.push(row);
      const loaded=[];
      for(const pkg of result?.packages||[]){
        try{if(pkg?.compatibilityStatus?.compatible===false)throw new Error(`插件与当前环境不兼容：${(pkg.compatibilityStatus.issues||[]).map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ')}`);const def=await loadExternalPackage(pkg);loaded.push(def.manifest.id);}
        catch(err){externalLoadErrors.push({file:pkg?.manifest?.id||'<package>',error:err.message});console.error('[DKDS external plugin]',err);}
      }
      return loaded;
    })();
    return externalLoadingPromise;
  }

  async function replaceExternalPluginPackage(pkg,{statusPrefix='已安装插件'}={}){
    if(!pkg?.manifest?.id)throw new Error('插件包缺少 manifest.id。');
    const id=pkg.manifest.id;const existing=definitionById(id);
    const oldPackage=externalPackages.get(id)||pkg.previousPackage||null;
    const oldEnabled=existing?isDefinitionEnabled(existing):null;const oldPreference=preferenceFor(id);
    try{
      if(existing){if(existing.manifest.source!=='external')throw new Error(`不能覆盖内置插件：${id}`);await deactivate(id,{captureProject:true});removeDefinition(id);externalPackages.delete(id);}
      const definition=await loadExternalPackage(pkg);
      if(isDefinitionEnabled(definition)){await activateDefinition(definition,{restoreCurrentProject:true});if(!active.has(id))throw new Error(disabled.get(id)||`Plugin ${id} failed to activate.`);}
      chooseFallbackActivity();eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      host?.setStatus?.(`${statusPrefix} ${definition.manifest.name||id} v${definition.manifest.version||'?'}`);
      return pluginStateRow(definition);
    }catch(err){
      try{removeDefinition(id);externalPackages.delete(id);disabled.delete(id);if(oldPackage){await window.electronAPI?.pluginRestorePackage?.({id,package:oldPackage});const restored=await loadExternalPackage(oldPackage);if(oldPreference===undefined)clearPreference(id);else setPreference(id,oldPreference);const shouldEnable=oldEnabled===null?isDefinitionEnabled(restored):oldEnabled;if(shouldEnable)await activateDefinition(restored,{restoreCurrentProject:true});}else{await window.electronAPI?.pluginRestorePackage?.({id,package:null});clearPreference(id);}chooseFallbackActivity();eventEmit('plugin:manager-changed',{plugins:listPluginStates()});}
      catch(rollbackError){console.error('[DKDS external plugin rollback]',rollbackError);externalLoadErrors.push({file:id,error:`安装失败且回滚失败：${rollbackError.message}`});}
      throw err;
    }
  }
  async function rollbackExternalPlugin(id,token){
    if(!window.electronAPI?.pluginRollbackVersion||window.electronAPI?.isWebClient)throw new Error('当前运行环境不支持插件版本回退。');
    const pkg=await window.electronAPI.pluginRollbackVersion({id,token});if(!pkg)return null;
    return replaceExternalPluginPackage(pkg,{statusPrefix:'已回退插件'});
  }
  async function installExternalPlugin(){
    if(!window.electronAPI?.pluginInstallPackage||window.electronAPI?.isWebClient)throw new Error('当前运行环境不支持安装可执行插件。');
    const pkg=await window.electronAPI.pluginInstallPackage();if(!pkg)return null;
    return replaceExternalPluginPackage(pkg,{statusPrefix:'已安装插件'});
  }

  async function uninstallExternalPlugin(id){
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    if(definition.manifest.source!=='external')throw new Error('内置插件不能卸载；可以在插件管理器中停用。');
    if(id===superPluginId)throw new Error('当前 SUPER 主界面不能直接卸载。请先将另一个 TOP 插件设为主界面。');
    await deactivate(id,{captureProject:true});
    removeDefinition(id);
    externalPackages.delete(id);
    clearPreference(id);
    await window.electronAPI?.pluginUninstall?.(id);
    chooseFallbackActivity();
    eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    host?.setStatus?.(`已卸载插件 ${definition.manifest.name||id}；工程中的插件命名空间数据仍会保留。`);
    return true;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.dkdsPluginEntry = src;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`Failed to load plugin entry: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadBuiltinEntries(entries = window.DKDS_BUILTIN_PLUGIN_ENTRIES || []) {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      const generated=Array.isArray(window.DKDS_BUILTIN_PLUGINS)&&window.DKDS_BUILTIN_PLUGINS.length
        ? window.DKDS_BUILTIN_PLUGINS
        : entries.map(src=>({id:'',entry:src}));
      let overrideResult={packages:[],errors:[]};
      if(window.electronAPI?.pluginOverrideList&&!window.electronAPI?.isWebClient){
        try{overrideResult=await window.electronAPI.pluginOverrideList()||overrideResult;}
        catch(err){overrideLoadErrors.push({file:'<override directory>',error:err.message});}
      }
      for(const row of overrideResult?.errors||[])overrideLoadErrors.push(row);
      const byId=new Map((overrideResult?.packages||[]).map(pkg=>[String(pkg?.manifest?.id||''),pkg]));
      for (const row of generated) {
        const id=String(row?.id||'');
        const override=id?byId.get(id):null;
        if(override){
          try{if(override?.compatibilityStatus?.compatible===false)throw new Error(`override 与当前环境不兼容：${(override.compatibilityStatus.issues||[]).map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ')}`);await loadOverridePackage(override);continue;}
          catch(err){
            overrideLoadErrors.push({file:id,error:err.message});
            console.error('[DKDS built-in plugin override fallback]',id,err);
          }
        }
        const scripts=Array.isArray(row?.scripts)&&row.scripts.length?row.scripts:[row.entry];
        for(const script of scripts)await loadScript(script);
        // Built-ins and .dkplugin packages use the same two-layer manifest model:
        // plugin.js registers executable behavior, while plugin.json is the
        // machine-readable source of truth for window/category/package metadata.
        // Merge it before activation so Plugin Manager and Core lifecycle never
        // depend on hand-duplicated runtime-only fields.
        const definition=id?definitionById(id):null;
        if(definition&&row?.manifest&&typeof row.manifest==='object')definition.manifest={...definition.manifest,...row.manifest,source:'builtin'};
      }
      return definitions.length;
    })();
    return loadingPromise;
  }

  window.DKDSPlugins = {
    API_VERSION,
    get host(){ return host; },
    define(manifest, activate) {
      if (!manifest || typeof manifest !== 'object') throw new Error('Plugin manifest is required.');
      assertId(manifest.id);
      const contractCheck=window.DKDSPluginContract?.validateManifest?.(manifest);
      if(contractCheck&&!contractCheck.ok)throw new Error(`Plugin ${manifest.id}: ${contractCheck.errors.join(' ')}`);
      if (definitions.some(d => d.manifest.id === manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
      if (typeof activate !== 'function') throw new Error(`Plugin ${manifest.id} must provide activate(api).`);
      definitions.push({ manifest: { apiVersion: API_VERSION, order: 100, ...manifest }, activate });
    },
    configure(nextHost) { host = nextHost || {}; window.DKDSIO?.configure?.(host); window.DKDSServices?.configure?.(host?.services); bindShellOnce(); },
    services: {
      registerRuntime:(owner,id,service,options)=>window.DKDSServices?.register?.(owner,id,service,options),
      get:id=>window.DKDSServices?.get?.(id)||null,
      list:()=>window.DKDSServices?.list?.()||[]
    },
    loadBuiltinEntries,
    loadExternalEntries,
    async activateAll() {
      for (const def of definitions.slice().sort((a,b)=>(a.manifest.order||100)-(b.manifest.order||100))) {
        if (!isDefinitionEnabled(def)) continue;
        await activateDefinition(def, { restoreCurrentProject:false });
      }
      if(host?.isAuxiliaryWindow)chooseFallbackActivity();
      else await initializeSuperSelection();
      eventEmit('plugins:ready', { active: [...active.keys()] });
      eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
      return [...active.keys()];
    },
    deactivate,
    external: {
      available:()=>!!window.electronAPI?.pluginInstallPackage&&!window.electronAPI?.isWebClient,
      install:installExternalPlugin,
      uninstall:uninstallExternalPlugin,
      history:id=>window.electronAPI?.pluginHistoryList?.(id)||Promise.resolve([]),
      algorithmCatalog:ref=>window.electronAPI?.pluginAlgorithmCatalog?.(ref)||Promise.resolve({requested:ref,count:0,candidates:[]}),
      rollback:rollbackExternalPlugin,
      openFolder:()=>window.electronAPI?.pluginOpenFolder?.(),
      export:id=>window.electronAPI?.pluginExportPackage?.(id),
      installed:()=>[...externalPackages.keys()],
      errors:()=>externalLoadErrors.slice()
    },
    manager: {
      list:listPluginStates,
      get:id=>{ const def=definitionById(id); return def?pluginStateRow(def):null; },
      setEnabled:setPluginEnabled,
      enable:id=>setPluginEnabled(id,true),
      disable:id=>setPluginEnabled(id,false),
      reload:reloadPlugin,
      setPrewarm:setPluginPrewarm,
      resetPreferences:resetPluginPreferences,
      clearPreference(id){ clearPreference(id); return this.get(id); },
      clearPrewarmPreference(id){ clearPrewarmPreference(id); return this.get(id); },
      storageKey:preferenceStorageKey,
      prewarmStorageKey:prewarmPreferenceStorageKey,
      superStorageKey:superPreferenceStorageKey,
      primePlacementStorageKey,
      setSuper:id=>setSuperPlugin(id),
      super:()=>superState()
    },
    activities: {
      list:()=>activityRows().map(x=>({...x.value,pluginId:x.pluginId,isSuper:x.pluginId===superPluginId})),
      active:()=>activeActivityId,
      set:id=>setActiveActivity(id,{invoke:true}),
      refresh:()=>{renderActivityBar();refreshActivityVisibility();}
    },
    statusBar: {
      list:()=>listContributions('ui.statusItems').map(row=>({pluginId:row.pluginId,id:row.id,value:row.value?.value||{}}))
    },
    workspace: {
      super:()=>superState(),
      setSuper:id=>setSuperPlugin(id),
      top:()=>topWorkspaceRows().map(row=>({...row.value,pluginId:row.pluginId})),
      prime:()=>listContributions('ui.prime').map(row=>({...row.value,pluginId:row.pluginId,placement:primePlacementFor(row.pluginId,row.id)})),
      placePrime:(pluginId,id,placement,options)=>placePrimeContribution(pluginId,id,placement,options),
      primePlacement:(pluginId,id)=>primePlacementFor(pluginId,id),
      sub:()=>listContributions('ui.sub').map(row=>({...row.value,pluginId:row.pluginId}))
    },
    commands: { run: runCommand },
    edit: {
      invoke:(action,payload)=>invokeEditAction(action,payload),
      supports:action=>supportsEditAction(action),
      activePlugin:()=>activePluginId(),
      providers:()=>listContributions('ui.editActions').map(row=>({pluginId:row.pluginId,id:row.id}))
    },
    registry: {
      list: listContributions,
      values: kind => listContributions(kind).map(x => x.value),
      find: (kind, predicate) => listContributions(kind).find(x => predicate(x.value, x))?.value || null
    },
    project: {
      serialize: serializeProject,
      restore: restoreProject,
      restorePlugin: restorePluginProjectState,
      reset: resetProjectSlices
    },
    events: { on: eventOn, emit: eventEmit },
    diagnostics() {
      return {
        apiVersion: API_VERSION,
        definitions: definitions.map(d => d.manifest),
        plugins:listPluginStates(),
        active: [...active.values()].map(x => x.manifest),
        disabled: Object.fromEntries(disabled),
        preferences:{...readPreferences()},
        workspace:{super:superState(),superStorageKey:superPreferenceStorageKey},
        external:{installed:[...externalPackages.keys()],errors:externalLoadErrors.slice()},
        overrides:{installed:[...overridePackages.keys()],errors:overrideLoadErrors.slice()},
        registries: Object.fromEntries([...registries].map(([k,v])=>[k,[...v.values()].map(x=>({pluginId:x.pluginId,id:x.id}))]))
      };
    }
  };

  window.DKDSWorkflow?.configure?.({
    getProvider(kind,id){
      return listProvidersWithCapabilities(kind).find(value=>String(value?.id)===String(id))||null;
    },
    listProviders(kind){ return listProvidersWithCapabilities(kind); },
    emit:eventEmit
  });
})();
