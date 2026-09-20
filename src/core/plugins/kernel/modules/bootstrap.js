'use strict';
const {state,definitions,active}=require('./context');
const {listContributions}=require('./registry');
const {pluginTypeOf}=require('./manifest');

  const preferenceStorageKey = 'dkds.plugin.state.preferences.v1';
  const prewarmPreferenceStorageKey = 'dkds.plugin.prewarm.v2';
  const superPreferenceStorageKey = 'dkds.workspace.super.v1';

  const API_VERSION = '1.19.0';

  function readPreferences() {
    if (state.preferences) return state.preferences;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(preferenceStorageKey) || '{}') || {};
    } catch {}
    state.preferences = saved && typeof saved === 'object' ? saved : {};
    return state.preferences;
  }

  function writePreferences() {
    try { localStorage.setItem(preferenceStorageKey, JSON.stringify(readPreferences())); } catch {}
  }

  function preferenceFor(id) {
    const value = readPreferences()[id];
    return typeof value === 'boolean' ? value : undefined;
  }

  function isSystemLockedDefinition(definition) {
    if(!definition?.manifest)return false;const manifest=definition.manifest;return String(definition.packageSource||'builtin')==='builtin'&&(pluginTypeOf(manifest)==='foundation'||manifest.systemCritical===true);
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
    if (state.prewarmPreferences) return state.prewarmPreferences;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(prewarmPreferenceStorageKey) || '{}') || {}; } catch {}
    state.prewarmPreferences = saved && typeof saved === 'object' ? saved : {};
    return state.prewarmPreferences;
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
    return explicit||DEFAULT_PLUGIN_ICONS[pluginTypeOf(manifest)]||'⬡';
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
    return listContributions('ui.activities').find(row=>row.pluginId===pluginId&&row.value?.role==='top')?.value?.id||'';
  }

  function superState() {
    const definition=state.superPluginId?definitionById(state.superPluginId):null;
    const contract=state.superPluginId?topWorkspaceForPlugin(state.superPluginId):null;
    const activityId=state.superPluginId?topActivityIdForPlugin(state.superPluginId):'';
    return {
      pluginId:state.superPluginId||'',
      activityId,
      configured:!!state.superPluginId,
      available:!!(definition&&active.has(state.superPluginId)&&contract&&activityId),
      contract:contract||null
    };
  }

module.exports=Object.freeze({preferenceStorageKey, prewarmPreferenceStorageKey, superPreferenceStorageKey, API_VERSION, readPreferences, writePreferences, preferenceFor, isSystemLockedDefinition, isDefinitionEnabled, setPreference, clearPreference, readPrewarmPreferences, writePrewarmPreferences, prewarmPreferenceFor, defaultPrewarmFor, isPrewarmEnabled, setPrewarmPreference, clearPrewarmPreference, definitionById, DEFAULT_PLUGIN_ICONS, defaultPluginIcon, workspaceMeta, isTopDefinition, isSuperEligibleDefinition, readSuperPreference, writeSuperPreference, topWorkspaceRows, topWorkspaceForPlugin, topActivityIdForPlugin, superState});
