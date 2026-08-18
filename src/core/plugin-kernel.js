(() => {
  const definitions = [];
  const active = new Map();
  const disabled = new Map();
  const registries = new Map();
  const projectSlices = new Map();
  const cleanupByPlugin = new Map();
  const eventListeners = new Map();
  const preferenceStorageKey = 'dkds.plugin.preferences.v1';
  const superPreferenceStorageKey = 'dkds.workspace.super.v1';
  const primePlacementStorageKey = 'dkds.workspace.prime-placement.v1';
  let preferences = null;
  let host = null;
  let loadingPromise = null;
  let externalLoadingPromise = null;
  const externalPackages = new Map();
  const externalLoadErrors = [];
  let activeActivityId = null;
  let superPluginId = null;
  let superSelectionInitialized = false;
  let primePlacements = null;
  let shellBound = false;
  let shellResizeObserver = null;

  const API_VERSION = '1.3.0';

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

  function isDefinitionEnabled(definition) {
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

  function definitionById(id) {
    return definitions.find(d => d.manifest.id === id) || null;
  }

  function workspaceMeta(manifest={}) {
    const raw=manifest?.workspace&&typeof manifest.workspace==='object'?manifest.workspace:{};
    const role=String(raw.role||'').trim().toLowerCase();
    return {
      role:role==='top'?'top':role==='support'?'support':'',
      activity:String(raw.activity||'').trim(),
      icon:String(raw.icon||'').trim(),
      title:String(raw.title||manifest.name||manifest.id||'').trim()
    };
  }

  function isTopDefinition(definition) {
    return workspaceMeta(definition?.manifest).role==='top';
  }

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
    if(!layout.left||!layout.main)throw new Error(`TOP workspace ${pluginId} must declare both layout.left and layout.main regions.`);
    const mode=String(layout.mode||'split').trim().toLowerCase();
    if(!['split','native'].includes(mode))throw new Error(`TOP workspace ${pluginId} has unsupported layout mode: ${mode}`);
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
    const flatten=Object.freeze((Array.isArray(layout.flatten)?layout.flatten:[]).map(String).map(x=>x.trim()).filter(Boolean));
    return Object.freeze({
      id:String(spec.id||activity),
      activity,
      label:String(spec.label||definition.manifest.name||activity),
      icon:String(spec.icon||workspaceMeta(definition.manifest).icon||''),
      layout:Object.freeze({
        mode,
        root:Object.freeze({...root,selector:rootSelector}),
        left:normalizeRegion(layout.left,'left'),
        main:normalizeRegion(layout.main,'main'),
        flatten,
        prime:Object.freeze(Array.isArray(layout.prime)?layout.prime.map(row=>Object.freeze({...row})):[])
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
    if(ok)await applySuperPrimePlacements();
    eventEmit('super:changed',superState());
    return ok;
  }

  async function setSuperPlugin(pluginId,{persist=true,invoke=true}={}) {
    const id=String(pluginId||'').trim();
    if(!id)throw new Error('必须选择一个 TOP 插件作为主界面。');
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    if(!isTopDefinition(definition))throw new Error(`插件 ${definition.manifest.name||id} 不是 TOP 插件，不能提升为 SUPER。`);
    if(!isDefinitionEnabled(definition)||!active.has(id))throw new Error(`请先启用插件 ${definition.manifest.name||id}。`);
    if(!topWorkspaceForPlugin(id))throw new Error(`插件 ${definition.manifest.name||id} 未注册完整 TOP 工作区契约。`);
    const previous=superPluginId;
    superPluginId=id;
    superSelectionInitialized=true;
    if(persist)writeSuperPreference(id);
    await activateSuperWorkspace({invoke});
    renderActivityBar();
    eventEmit('super:selection-changed',{previous,pluginId:id,state:superState()});
    eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    return superState();
  }

  async function initializeSuperSelection() {
    if(host?.isAuxiliaryWindow)return false;
    const saved=readSuperPreference();
    superSelectionInitialized=true;
    if(saved!==undefined){
      superPluginId=saved&&topDefinitionReady(saved)?saved:null;
      return activateSuperWorkspace({invoke:true});
    }
    // One-time migration from pre-SUPER builds. Resonance remains the initial
    // main surface only when it is actually available; after a user selects a
    // SUPER we never silently fall back to the next plugin.
    const migration='builtin.resonance-workbench';
    if(topDefinitionReady(migration)){
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

  function eventEmit(name, payload) {
    for (const row of eventListeners.get(name) || []) {
      try { row.fn(payload); } catch (err) { console.error(`[DKDS event:${name}]`, err); }
    }
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
    const rows=activityRows();
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
      button.onclick=()=>{
        const nonSuperTop=spec.role==='top'&&row.pluginId!==superPluginId&&!host?.isAuxiliaryWindow;
        if(nonSuperTop||(spec.openMode==='window'&&!host?.isAuxiliaryWindow&&row.pluginId!==superPluginId)){
          host?.openActivityWindow?.(spec.id);
          return;
        }
        setActiveActivity(spec.id,{invoke:true});
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
    const value={id,label:id,order:100,...spec,id,pluginId,role};
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

  function addMenuItem(pluginId,spec) {
    const mount=document.querySelector(`[data-plugin-menu="${spec.menu||'export'}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${spec.menu||'export'}`);
    const button=createScopedButton(pluginId,spec,`[data-plugin-menu="${spec.menu||'export'}"]`,'plugin-menu-item');
    button.addEventListener('click',()=>button.closest('.command-menu')?.classList.add('hidden'));
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

  function reflowContextToolbar() {
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
    toggle(overflowBtn,overflowMenu);
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
      if(!event.target.closest('.context-overflow-anchor'))overflowMenu?.classList.add('hidden');
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

  function restoreProject(data={}, legacyProject=null) {
    for (const [pluginId, slices] of projectSlices) {
      const pluginData = data?.[pluginId] || {};
      for (const [key, hooks] of slices) {
        if (typeof hooks.restore !== 'function') continue;
        try { hooks.restore(pluginData?.[key], { pluginData, legacyProject }); }
        catch (err) { console.error(`[DKDS plugin project restore:${pluginId}/${key}]`, err); }
      }
    }
    eventEmit('project:restored', { data, legacyProject });
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

  function addPage(pluginId, spec) {
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
    page.dataset.pluginActivity = spec.activity || page.dataset.pluginActivity || '';

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

    if (spec.toolbar !== false) {
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
    return Object.freeze({
      apiVersion: API_VERSION,
      manifest: Object.freeze({ ...definition.manifest }),
      host,
      platform: window.DKDSPlatform,
      events: {
        on: (name, fn) => addCleanup(pluginId, eventOn(name, fn, pluginId)),
        emit: eventEmit
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
      project: {
        registerSlice: (key, hooks) => registerProjectSlice(pluginId, key, hooks)
      },
      data: {
        model: window.DKDSData,
        formula: window.DKDSFormula,
        artifacts: {
          list: options => host?.artifacts?.list?.(options) || [],
          get: id => host?.artifacts?.get?.(id) || null,
          add: (artifact, options) => host?.artifacts?.add?.(artifact, options),
          upsert: artifact => host?.artifacts?.upsert?.(artifact),
          remove: id => host?.artifacts?.remove?.(id),
          syncLegacy: () => host?.artifacts?.syncLegacy?.()
        }
      },
      workflow: {
        run: (recipe, options) => window.DKDSWorkflow.run(recipe, options),
        buildSequentialRecipe: spec => window.DKDSWorkflow.buildSequentialRecipe(spec),
        processors: {
          register: (id, spec) => registerTypedContribution(pluginId, 'workflow.processors', id, window.DKDSWorkflow.normalizeProvider('processor', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
          list: () => listContributions('workflow.processors').map(x=>x.value)
        },
        analyzers: {
          register: (id, spec) => registerTypedContribution(pluginId, 'workflow.analyzers', id, window.DKDSWorkflow.normalizeProvider('analyzer', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
          list: () => listContributions('workflow.analyzers').map(x=>x.value)
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
        register: (id, spec) => registerTypedContribution(pluginId, 'charts.renderers', id, window.DKDSWorkflow.normalizeProvider('chart', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
        list: () => listContributions('charts.renderers').map(x=>x.value)
      },
      analysis: {
        detectors: {
          register: (id, spec) => registerTypedContribution(pluginId, 'peak.detectors', id, {id,...spec,pluginId,version:spec?.version||definition.manifest.version||'1.0.0'}),
          list: () => listContributions('peak.detectors').map(x=>x.value)
        }
      },
      parameters: {
        render: (container, schema, options) => window.DKDSParameters.render(container, schema, options),
        validate: (schema, values, context) => window.DKDSParameters.validate(schema, values, context),
        defaults: (schema, initial) => window.DKDSParameters.defaultValues(schema, initial)
      },
      ui: {
        activities: {
          add: spec => registerActivity(pluginId, spec.id, spec),
          activate: id => setActiveActivity(id,{invoke:true}),
          active: () => activeActivityId
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
          add: spec => registerContribution(pluginId,'ui.shortcuts',spec.id,{order:100,priority:0,...spec,id:spec.id,pluginId})
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
  }

  function restorePluginProjectState(pluginId, data={}, legacyProject=null) {
    const slices = projectSlices.get(pluginId);
    if (!slices) return;
    const pluginData = data?.[pluginId] || {};
    for (const [key, hooks] of slices) {
      if (typeof hooks.restore !== 'function') continue;
      try { hooks.restore(pluginData?.[key], { pluginData, legacyProject }); }
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
      const instance = await definition.activate(api);
      active.set(manifest.id, { manifest, instance: instance || null });
      if (restoreCurrentProject) {
        const tab = host?.getActiveProjectTab?.();
        restorePluginProjectState(manifest.id, tab?.pluginState || {}, null);
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
      capabilities:Array.isArray(m.capabilities)?m.capabilities.slice():[],
      contributionCounts,
      preference:preferenceFor(m.id),
      workspaceRole:workspace.role,
      workspaceActivity:workspace.activity||topContract?.activity||'',
      workspaceIcon:workspace.icon||topContract?.icon||'',
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
    if(superPluginId)preferences[superPluginId]=true;
    writePreferences();
    for (const definition of definitions) {
      const shouldEnable = definition.manifest.id===superPluginId ? true : definition.manifest.enabled !== false;
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

  async function loadExternalPackage(pkg){
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
      definition.manifest={...definition.manifest,...manifest,source:'external'};

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
      externalPackages.set(manifest.id,pkg);
      return definition;
    }catch(err){
      for(const d of definitions.slice()){
        if(!beforeIds.has(d.manifest.id))removeDefinition(d.manifest.id);
      }
      throw err;
    }
  }

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
        try{const def=await loadExternalPackage(pkg);loaded.push(def.manifest.id);}
        catch(err){externalLoadErrors.push({file:pkg?.manifest?.id||'<package>',error:err.message});console.error('[DKDS external plugin]',err);}
      }
      return loaded;
    })();
    return externalLoadingPromise;
  }

  async function installExternalPlugin(){
    if(!window.electronAPI?.pluginInstallPackage||window.electronAPI?.isWebClient)throw new Error('当前运行环境不支持安装可执行插件。');
    const pkg=await window.electronAPI.pluginInstallPackage();
    if(!pkg)return null;
    const id=pkg.manifest.id;
    const existing=definitionById(id);
    const oldPackage=externalPackages.get(id)||pkg.previousPackage||null;
    const oldEnabled=existing?isDefinitionEnabled(existing):null;
    const oldPreference=preferenceFor(id);

    try{
      if(existing){
        if(existing.manifest.source!=='external')throw new Error(`不能覆盖内置插件：${id}`);
        await deactivate(id,{captureProject:true});
        removeDefinition(id);
        externalPackages.delete(id);
      }
      const definition=await loadExternalPackage(pkg);
      if(isDefinitionEnabled(definition)){
        const result=await activateDefinition(definition,{restoreCurrentProject:true});
        void result;
        if(!active.has(id))throw new Error(disabled.get(id)||`Plugin ${id} failed to activate.`);
      }
      chooseFallbackActivity();
      eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      host?.setStatus?.(`已安装插件 ${definition.manifest.name||id} v${definition.manifest.version||'?'}`);
      return pluginStateRow(definition);
    }catch(err){
      // Runtime activation is part of installation. If a new/update package
      // cannot load, restore the previous package on disk and in memory so a
      // broken plugin update cannot leave the application without its old plugin.
      try{
        removeDefinition(id);
        externalPackages.delete(id);
        disabled.delete(id);
        if(oldPackage){
          await window.electronAPI?.pluginRestorePackage?.({id,package:oldPackage});
          const restored=await loadExternalPackage(oldPackage);
          if(oldPreference===undefined)clearPreference(id);else setPreference(id,oldPreference);
          const shouldEnable=oldEnabled===null?isDefinitionEnabled(restored):oldEnabled;
          if(shouldEnable)await activateDefinition(restored,{restoreCurrentProject:true});
        }else{
          await window.electronAPI?.pluginRestorePackage?.({id,package:null});
          clearPreference(id);
        }
        chooseFallbackActivity();
        eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      }catch(rollbackError){
        console.error('[DKDS external plugin rollback]',rollbackError);
        externalLoadErrors.push({file:id,error:`安装失败且回滚失败：${rollbackError.message}`});
      }
      throw err;
    }
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
      for (const src of entries) await loadScript(src);
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
      if (definitions.some(d => d.manifest.id === manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
      if (typeof activate !== 'function') throw new Error(`Plugin ${manifest.id} must provide activate(api).`);
      definitions.push({ manifest: { apiVersion: API_VERSION, order: 100, ...manifest }, activate });
    },
    configure(nextHost) { host = nextHost || {}; bindShellOnce(); },
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
      openFolder:()=>window.electronAPI?.pluginOpenFolder?.(),
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
      resetPreferences:resetPluginPreferences,
      clearPreference(id){ clearPreference(id); return this.get(id); },
      storageKey:preferenceStorageKey,
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
        registries: Object.fromEntries([...registries].map(([k,v])=>[k,[...v.values()].map(x=>({pluginId:x.pluginId,id:x.id}))]))
      };
    }
  };

  window.DKDSWorkflow?.configure?.({
    getProvider(kind,id){
      const rows=listContributions(kind);
      const exact=rows.find(row=>row.value?.id===id||row.id===id);
      return exact?.value||null;
    },
    listProviders(kind){ return listContributions(kind).map(row=>row.value); },
    emit:eventEmit
  });
})();
