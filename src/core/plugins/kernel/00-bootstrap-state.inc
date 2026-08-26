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
