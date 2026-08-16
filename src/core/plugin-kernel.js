(() => {
  const definitions = [];
  const active = new Map();
  const disabled = new Map();
  const registries = new Map();
  const projectSlices = new Map();
  const cleanupByPlugin = new Map();
  const eventListeners = new Map();
  let host = null;
  let loadingPromise = null;

  const API_VERSION = '1.0.0';

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
    reg.set(key, { pluginId, id, value });
    return addCleanup(pluginId, () => reg.delete(key));
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

  function serializeProject() {
    const out = {};
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
        add: (kind, id, value) => registerContribution(pluginId, kind, id, value),
        list: kind => listContributions(kind),
        own: kind => listContributions(kind).filter(x => x.pluginId === pluginId)
      },
      project: {
        registerSlice: (key, hooks) => registerProjectSlice(pluginId, key, hooks)
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

  async function activateDefinition(definition) {
    const { manifest } = definition;
    if (active.has(manifest.id)) return active.get(manifest.id);
    if (manifest.apiVersion && !String(manifest.apiVersion).startsWith('1.')) {
      disabled.set(manifest.id, `Unsupported plugin API ${manifest.apiVersion}`);
      return null;
    }
    const api = createApi(definition);
    try {
      const instance = await definition.activate(api);
      active.set(manifest.id, { manifest, instance: instance || null });
      eventEmit('plugin:activated', { id: manifest.id, manifest });
      return instance || null;
    } catch (err) {
      disabled.set(manifest.id, err.message);
      console.error(`[GRS plugin activation:${manifest.id}]`, err);
      host?.setStatus?.(`插件 ${manifest.name || manifest.id} 加载失败：${err.message}`);
      return null;
    }
  }

  async function deactivate(id) {
    const row = active.get(id);
    if (!row) return;
    try { await row.instance?.deactivate?.(); } catch (err) { console.error(err); }
    for (const fn of (cleanupByPlugin.get(id) || []).reverse()) {
      try { fn(); } catch (err) { console.error(err); }
    }
    cleanupByPlugin.delete(id);
    active.delete(id);
    eventEmit('plugin:deactivated', { id });
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
        await activateDefinition(def);
      }
      eventEmit('plugins:ready', { active: [...active.keys()] });
      return [...active.keys()];
    },
    deactivate,
    commands: { run: runCommand },
    registry: {
      list: listContributions,
      values: kind => listContributions(kind).map(x => x.value),
      find: (kind, predicate) => listContributions(kind).find(x => predicate(x.value, x))?.value || null
    },
    project: {
      serialize: serializeProject,
      restore: restoreProject,
      reset: resetProjectSlices
    },
    events: { on: eventOn, emit: eventEmit },
    diagnostics() {
      return {
        apiVersion: API_VERSION,
        definitions: definitions.map(d => d.manifest),
        active: [...active.values()].map(x => x.manifest),
        disabled: Object.fromEntries(disabled),
        registries: Object.fromEntries([...registries].map(([k,v])=>[k,[...v.values()].map(x=>({pluginId:x.pluginId,id:x.id}))]))
      };
    }
  };
})();
