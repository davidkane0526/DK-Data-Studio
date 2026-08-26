'use strict';
const {state, definitions, active, disabled, registries, projectSlices, cleanupByPlugin}=require('./context');
const {writePreferences, preferenceFor, isSystemLockedDefinition, isDefinitionEnabled, setPreference, writePrewarmPreferences, prewarmPreferenceFor, defaultPrewarmFor, isPrewarmEnabled, setPrewarmPreference, definitionById, defaultPluginIcon, workspaceMeta, topWorkspaceForPlugin}=require('./bootstrap');
const {activateSuperWorkspace}=require('./workspace/top');
const {getRegistry, eventEmit}=require('./events/history');
const {createApi}=require('./plugin-api');

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
        const tab = state.host?.getActiveProjectTab?.();
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
      state.host?.setStatus?.(`插件 ${manifest.name || manifest.id} 加载失败：${err.message}`);
      eventEmit('plugin:state-changed', { id:manifest.id, reason:'error', error:err.message });
      return null;
    }
  }

  async function deactivate(id, { captureProject=true }={}) {
    const row = active.get(id);
    if (!row) return;
    if (captureProject) {
      try { state.host?.captureActiveProjectTab?.(); } catch (err) { console.error('[DKDS plugin capture before deactivate]', err); }
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
    const allowed=new Set(['foundation','data','algorithm','workbench','task','tool','theme','extension','developer']);
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
      isSuper:m.id===state.superPluginId,
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
    if(!next&&id===state.superPluginId)throw new Error('当前 SUPER 主界面不能直接停用。请先将另一个 TOP 插件设为主界面。');
    setPreference(id, next);

    if (!next) {
      await deactivate(id, { captureProject:true });
      disabled.delete(id);
      state.host?.setStatus?.(`插件 ${definition.manifest.name || id} 已停用。设置会在下次启动继续生效。`);
    } else {
      const result = await activateDefinition(definition, { restoreCurrentProject:true });
      if (!active.has(id)) throw new Error(disabled.get(id) || `Plugin ${id} failed to activate.`);
      state.host?.setStatus?.(`插件 ${definition.manifest.name || id} 已启用。`);
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
    state.host?.setStatus?.(`插件 ${definition.manifest.name||id} 的窗口预热已${next?'开启':'关闭'}。`);
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
    if(id===state.superPluginId)await activateSuperWorkspace({invoke:true});
    state.host?.setStatus?.(`插件 ${definition.manifest.name || id} 已重新加载。`);
    eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
    return result;
  }

  async function resetPluginPreferences() {
    state.preferences = {};
    state.prewarmPreferences = {};
    if(state.superPluginId)state.preferences[state.superPluginId]=true;
    writePreferences();
    writePrewarmPreferences();
    for (const definition of definitions) {
      const shouldEnable = isSystemLockedDefinition(definition) || definition.manifest.id===state.superPluginId ? true : definition.manifest.enabled !== false;
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

module.exports=Object.freeze({restorePluginProjectState, activateDefinition, deactivate, pluginTypeForManifest, pluginStateRow, listPluginStates, setPluginEnabled, setPluginPrewarm, reloadPlugin, resetPluginPreferences});
