(() => {
  const definitions = [];
  const active = new Map();
  const disabled = new Map();
  const registries = new Map();
  const projectSlices = new Map();
  const cleanupByPlugin = new Map();
  const eventListeners = new Map();
  const preferenceStorageKey = 'grs.plugin.preferences.v1';
  let preferences = null;
  let host = null;
  let loadingPromise = null;

  const API_VERSION = '1.1.0';

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
      try { row.fn(payload); } catch (err) { console.error(`[GRS event:${name}]`, err); }
    }
  }

  function addCleanup(pluginId, fn) {
    if (typeof fn !== 'function') return fn;
    if (!cleanupByPlugin.has(pluginId)) cleanupByPlugin.set(pluginId, []);
    cleanupByPlugin.get(pluginId).push(fn);
    return fn;
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

    button.addEventListener('click', async event => {
      try {
        if (spec.onClick) await spec.onClick(event);
        else if (spec.command) await runCommand(spec.command, { event });
      } catch (err) {
        console.error(`[GRS plugin toolbar:${pluginId}]`, err);
        host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });

    const siblings = [...mount.querySelectorAll('.plugin-toolbar-btn')];
    const before = siblings.find(el => Number(el.dataset.pluginOrder || 100) > Number(spec.order || 100));
    mount.insertBefore(button, before || null);
    addCleanup(pluginId, () => button.remove());
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
    'analysis.providers'
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
        catch (err) { console.error(`[GRS plugin project serialize:${pluginId}/${key}]`, err); }
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
        catch (err) { console.error(`[GRS plugin project restore:${pluginId}/${key}]`, err); }
      }
    }
    eventEmit('project:restored', { data, legacyProject });
  }

  function resetProjectSlices() {
    for (const [pluginId, slices] of projectSlices) {
      for (const [key, hooks] of slices) {
        if (typeof hooks.reset !== 'function') continue;
        try { hooks.reset(); }
        catch (err) { console.error(`[GRS plugin project reset:${pluginId}/${key}]`, err); }
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

    for (const close of page.querySelectorAll('.analysis-page-close')) {
      if (close.dataset.grsPluginCloseBound === '1') continue;
      close.dataset.grsPluginCloseBound = '1';
      close.addEventListener('click', () => host?.closeAnalysisPage?.(page.id));
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
        order: spec.order || 100,
        command: commandId
      });
    }
    return page;
  }

  function addPanelToggle(pluginId, spec) {
    const panel = document.getElementById(spec.panelId);
    if (!panel) throw new Error(`Plugin panel not found: ${spec.panelId}`);
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
      order: spec.order || 100,
      command: commandId
    });
  }

  function createApi(definition) {
    const pluginId = definition.manifest.id;
    return Object.freeze({
      apiVersion: API_VERSION,
      manifest: Object.freeze({ ...definition.manifest }),
      host,
      platform: window.GRSPlatform,
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
        model: window.GRSData,
        formula: window.GRSFormula,
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
        run: (recipe, options) => window.GRSWorkflow.run(recipe, options),
        buildSequentialRecipe: spec => window.GRSWorkflow.buildSequentialRecipe(spec),
        processors: {
          register: (id, spec) => registerTypedContribution(pluginId, 'workflow.processors', id, window.GRSWorkflow.normalizeProvider('processor', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
          list: () => listContributions('workflow.processors').map(x=>x.value)
        },
        analyzers: {
          register: (id, spec) => registerTypedContribution(pluginId, 'workflow.analyzers', id, window.GRSWorkflow.normalizeProvider('analyzer', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
          list: () => listContributions('workflow.analyzers').map(x=>x.value)
        },
        recipes: {
          register: (id, recipe) => {
            const value={...recipe,id:recipe?.id||id,pluginId,pluginVersion:definition.manifest.version||'1.0.0'};
            const check=window.GRSWorkflow.validateRecipe(value);
            if(!check.ok)throw new Error(`Recipe ${id}: ${check.errors.join(' ')}`);
            return registerTypedContribution(pluginId, 'workflow.recipes', id, value);
          },
          list: () => listContributions('workflow.recipes').map(x=>x.value)
        }
      },
      charts: {
        register: (id, spec) => registerTypedContribution(pluginId, 'charts.renderers', id, window.GRSWorkflow.normalizeProvider('chart', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'})),
        list: () => listContributions('charts.renderers').map(x=>x.value)
      },
      parameters: {
        render: (container, schema, options) => window.GRSParameters.render(container, schema, options),
        validate: (schema, values, context) => window.GRSParameters.validate(schema, values, context),
        defaults: (schema, initial) => window.GRSParameters.defaultValues(schema, initial)
      },
      ui: {
        toolbar: {
          add: spec => createToolbarButton(pluginId, spec)
        },
        pages: {
          add: spec => addPage(pluginId, spec)
        },
        panels: {
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
      catch (err) { console.error(`[GRS plugin project restore:${pluginId}/${key}]`, err); }
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
      console.error(`[GRS plugin activation:${manifest.id}]`, err);
      host?.setStatus?.(`插件 ${manifest.name || manifest.id} 加载失败：${err.message}`);
      eventEmit('plugin:state-changed', { id:manifest.id, reason:'error', error:err.message });
      return null;
    }
  }

  async function deactivate(id, { captureProject=true }={}) {
    const row = active.get(id);
    if (!row) return;
    if (captureProject) {
      try { host?.captureActiveProjectTab?.(); } catch (err) { console.error('[GRS plugin capture before deactivate]', err); }
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
    return {
      ...m,
      enabled,
      active:isActive,
      status,
      error,
      source:m.source || 'builtin',
      capabilities:Array.isArray(m.capabilities)?m.capabilities.slice():[],
      contributionCounts,
      preference:preferenceFor(m.id)
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
    host?.setStatus?.(`插件 ${definition.manifest.name || id} 已重新加载。`);
    eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
    return result;
  }

  async function resetPluginPreferences() {
    preferences = {};
    writePreferences();
    for (const definition of definitions) {
      const shouldEnable = definition.manifest.enabled !== false;
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

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.dataset.grsPluginEntry = src;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`Failed to load plugin entry: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadBuiltinEntries(entries = window.GRS_BUILTIN_PLUGIN_ENTRIES || []) {
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      for (const src of entries) await loadScript(src);
      return definitions.length;
    })();
    return loadingPromise;
  }

  window.GRSPlugins = {
    API_VERSION,
    define(manifest, activate) {
      if (!manifest || typeof manifest !== 'object') throw new Error('Plugin manifest is required.');
      assertId(manifest.id);
      if (definitions.some(d => d.manifest.id === manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
      if (typeof activate !== 'function') throw new Error(`Plugin ${manifest.id} must provide activate(api).`);
      definitions.push({ manifest: { apiVersion: API_VERSION, order: 100, ...manifest }, activate });
    },
    configure(nextHost) { host = nextHost || {}; },
    loadBuiltinEntries,
    async activateAll() {
      for (const def of definitions.slice().sort((a,b)=>(a.manifest.order||100)-(b.manifest.order||100))) {
        if (!isDefinitionEnabled(def)) continue;
        await activateDefinition(def, { restoreCurrentProject:false });
      }
      eventEmit('plugins:ready', { active: [...active.keys()] });
      eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
      return [...active.keys()];
    },
    deactivate,
    manager: {
      list:listPluginStates,
      get:id=>{ const def=definitionById(id); return def?pluginStateRow(def):null; },
      setEnabled:setPluginEnabled,
      enable:id=>setPluginEnabled(id,true),
      disable:id=>setPluginEnabled(id,false),
      reload:reloadPlugin,
      resetPreferences:resetPluginPreferences,
      clearPreference(id){ clearPreference(id); return this.get(id); },
      storageKey:preferenceStorageKey
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
        registries: Object.fromEntries([...registries].map(([k,v])=>[k,[...v.values()].map(x=>({pluginId:x.pluginId,id:x.id}))]))
      };
    }
  };

  window.GRSWorkflow?.configure?.({
    getProvider(kind,id){
      const rows=listContributions(kind);
      const exact=rows.find(row=>row.value?.id===id||row.id===id);
      return exact?.value||null;
    },
    listProviders(kind){ return listContributions(kind).map(row=>row.value); },
    emit:eventEmit
  });
})();
