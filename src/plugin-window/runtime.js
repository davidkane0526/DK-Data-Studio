(() => {
  const $ = selector => document.querySelector(selector);
  const statusEl = $('#statusBar');
  const loadingText = $('#pluginWindowLoadingText');

  let bootstrap = null;
  let project = {};
  let artifactStore = null;
  let pluginRuntime = null;
  let ready = false;
  let snapshotTimer = null;

  function clone(value) {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch { return JSON.parse(JSON.stringify(value)); }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = String(text || '');
  }

  function setLoading(text) {
    if (loadingText) loadingText.textContent = String(text || '');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve(src);
      script.onerror = () => reject(new Error(`无法加载插件窗口脚本：${src}`));
      document.head.appendChild(script);
    });
  }

  function safeSegment(value) {
    const s = String(value || '').trim();
    if (!/^[A-Za-z0-9._-]+$/.test(s) || s === '.' || s === '..') {
      throw new Error(`非法插件路径：${s || '(empty)'}`);
    }
    return s;
  }

  function pluginUrl(fileName) {
    const folder = safeSegment(bootstrap?.pluginWindow?.pluginFolder);
    const file = String(fileName || '').trim();
    if (!file || file.includes('/') || file.includes('\\') || file === '.' || file === '..') {
      throw new Error(`非法插件入口：${file || '(empty)'}`);
    }
    return new URL(`../plugins/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`, location.href).href;
  }

  function ensureProjectShape(next) {
    const p = clone(next || {});
    if (!p || typeof p !== 'object') return { plugins:{}, dataModel:{schema:1,artifacts:[]} };
    if (!p.plugins || typeof p.plugins !== 'object') p.plugins = {};
    if (!p.dataModel || typeof p.dataModel !== 'object') p.dataModel = { schema:1, artifacts:[] };
    return p;
  }

  function restoreArtifactStore() {
    artifactStore = window.DKDSData?.restoreStore
      ? window.DKDSData.restoreStore(project.dataModel || { schema:1, artifacts:[] })
      : null;
  }

  function emitArtifactsChanged(payload={}) {
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed', payload);
    scheduleSnapshot();
  }

  const artifactsApi = {
    list: options => artifactStore?.list?.(options) || [],
    get: id => artifactStore?.get?.(id) || null,
    add(artifact, options) {
      const id = artifactStore.add(artifact, options);
      emitArtifactsChanged({type:'add', artifact:artifactStore.get(id)});
      return id;
    },
    upsert(artifact) {
      const id = artifactStore.upsert(artifact);
      emitArtifactsChanged({type:'upsert', artifact:artifactStore.get(id)});
      return id;
    },
    remove(id) {
      const ok = artifactStore?.remove?.(id) || false;
      if (ok) emitArtifactsChanged({type:'remove', id});
      return ok;
    },
    clear() {
      artifactStore?.clear?.();
      emitArtifactsChanged({type:'clear'});
    },
    syncLegacy() {
      // Main project snapshots already contain the canonical dataModel. A
      // dedicated plugin renderer must never regenerate artifacts from a
      // second copy of the full workspace; it simply refreshes its local view.
      emitArtifactsChanged({type:'refresh'});
      return artifactStore;
    }
  };

  function openAnalysisPage(id) {
    const target = String(id || '');
    document.querySelectorAll('.analysis-page').forEach(page => {
      page.classList.toggle('hidden', page.id !== target);
    });
    const page = document.getElementById(target);
    if (page) {
      document.body.classList.add('ready');
      window.DKDSPlugins?.events?.emit?.('analysis:opened', {id:target});
      window.DKDSPlugins?.events?.emit?.('analysis:refresh', {id:target});
      requestAnimationFrame(() => window.DKDSPlugins?.events?.emit?.('layout:resize', {reason:'page-open'}));
    }
    return !!page;
  }

  function closeAnalysisPage() {
    return window.electronAPI?.closeCurrentWindow?.();
  }

  async function copyTextToClipboard(text, label='文本') {
    const value = String(text ?? '');
    if (!value) return false;
    const ok = await window.electronAPI?.copyText?.(value);
    if (ok) setStatus(`${label}已复制。`);
    return !!ok;
  }

  async function savePlotlyImage(plotId, defaultName, format='png') {
    if (!window.Plotly) throw new Error('Plotly 尚未加载。');
    const data = await Plotly.toImage(plotId, {
      format,
      width:1500,
      height:950,
      scale:format === 'png' ? 2 : 1
    });
    if (format === 'svg') {
      const content = decodeURIComponent(data.split(',')[1] || '');
      return window.electronAPI.saveText({
        defaultName:`${defaultName}.svg`,
        content,
        filters:[{name:'SVG',extensions:['svg']}]
      });
    }
    const base64 = data.split(',')[1] || '';
    return window.electronAPI.saveBase64({
      defaultName:`${defaultName}.png`,
      base64,
      filters:[{name:'PNG',extensions:['png']}]
    });
  }

  function syncProjectFromWindow() {
    if (!project || typeof project !== 'object') project = {};
    try {
      project.plugins = window.DKDSPlugins?.project?.serialize?.(project.plugins || {}) || project.plugins || {};
    } catch (err) {
      console.warn('[DKDS plugin window] plugin serialization failed', err);
    }
    if (artifactStore && window.DKDSData?.serializeStore) {
      project.dataModel = window.DKDSData.serializeStore(artifactStore, {includeTransient:false});
    }
    try { pluginRuntime?.syncProject?.(project); }
    catch (err) { console.warn('[DKDS plugin window] runtime sync failed', err); }
    return project;
  }

  function pushSnapshot(final=false) {
    if (!bootstrap || !window.electronAPI?.pushActivityProjectSnapshot) return;
    try {
      syncProjectFromWindow();
      window.electronAPI.pushActivityProjectSnapshot({project:clone(project), final:!!final});
    } catch (err) {
      console.warn('[DKDS plugin window snapshot]', err);
    }
  }

  function scheduleSnapshot() {
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => pushSnapshot(false), 120);
  }

  function baseHost() {
    return {
      appVersion:'3.22.0',
      platform:window.DKDSPlatform,
      isAuxiliaryWindow:true,
      closeCurrentWindow:()=>window.electronAPI?.closeCurrentWindow?.(),
      openActivityWindow:()=>false,
      getState:()=>pluginRuntime?.getState?.() || project,
      getActiveProjectTab:()=>({id:bootstrap?.projectTabId||'plugin-window', title:bootstrap?.title||'', pluginState:project.plugins||{}}),
      captureActiveProjectTab:scheduleSnapshot,
      setStatus,
      renderAll:()=>pluginRuntime?.render?.(),
      scheduleMainPlotRelayout:()=>window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'plugin-window'}),
      openAnalysisPage,
      closeAnalysisPage,
      showMainWorkspace:()=>false,
      copyTextToClipboard,
      savePlotlyImage,
      makeFloating:()=>{},
      artifacts:artifactsApi,
      panels:{},
      resonance:{},
      pulse:null,
      ter:null
    };
  }

  async function loadTargetPlugin() {
    const spec = bootstrap?.pluginWindow;
    if (!spec?.pluginFolder || !spec?.entry) throw new Error('插件窗口缺少入口信息。');

    window.DKDSPluginWindowRuntime = null;
    if (spec.runtime) {
      setLoading('正在加载插件运行层…');
      await loadScript(pluginUrl(spec.runtime));
    }

    const host = baseHost();
    if (window.DKDSPluginWindowRuntime?.create) {
      pluginRuntime = await window.DKDSPluginWindowRuntime.create({
        host,
        project,
        bootstrap:clone(bootstrap),
        setStatus,
        scheduleSnapshot,
        copyTextToClipboard,
        savePlotlyImage
      });
      if (pluginRuntime?.serviceName && pluginRuntime?.service) {
        host[pluginRuntime.serviceName] = pluginRuntime.service;
      }
    }

    window.DKDSPlugins.configure(host);

    setLoading(`正在加载 ${spec.title || bootstrap.activityId || '插件'}…`);
    await loadScript(pluginUrl(spec.entry));

    await window.DKDSPlugins.activateAll();
    await window.DKDSPlugins.project.restore(project.plugins || {}, project);
    await pluginRuntime?.setProject?.(project);

    const opened = await window.DKDSPlugins.activities.set(bootstrap.activityId);
    if (!opened) throw new Error(`插件没有注册工作区：${bootstrap.activityId}`);

    ready = true;
    document.body.classList.add('ready');
    setStatus(`${spec.title || bootstrap.activityId} 已就绪`);
    requestAnimationFrame(() => window.DKDSPlugins.events.emit('layout:resize',{reason:'initial'}));
  }

  async function replaceProjectFromBootstrap(nextBootstrap) {
    if (!nextBootstrap?.project) return;
    bootstrap = nextBootstrap;
    project = ensureProjectShape(nextBootstrap.project);
    restoreArtifactStore();
    try {
      await pluginRuntime?.setProject?.(project);
      await window.DKDSPlugins?.project?.restore?.(project.plugins || {}, project);
      await window.DKDSPlugins?.activities?.set?.(bootstrap.activityId);
      window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'replace'});
      window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'project-replace'});
      setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} · 项目已同步`);
    } catch (err) {
      console.error('[DKDS plugin window project replace]',err);
      setStatus(`项目同步失败：${err.message}`);
    }
  }

  async function start() {
    try {
      bootstrap = await window.electronAPI?.getActivityWindowBootstrap?.();
      if (!bootstrap?.project) throw new Error('没有收到主窗口项目快照。');
      if (!bootstrap?.pluginWindow) throw new Error('当前插件没有独立窗口定义。');

      project = ensureProjectShape(bootstrap.project);
      restoreArtifactStore();
      document.title = `DK Data Studio · ${bootstrap.pluginWindow.title || bootstrap.activityId || '插件'}`;

      window.electronAPI?.onActivityBootstrapChanged?.(async () => {
        const next = await window.electronAPI?.getActivityWindowBootstrap?.();
        if (next) await replaceProjectFromBootstrap(next);
      });

      window.addEventListener('resize', () => {
        if (ready) window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});
      });
      window.addEventListener('beforeunload', () => pushSnapshot(true));

      await loadTargetPlugin();
    } catch (err) {
      console.error('[DKDS plugin window startup]', err);
      document.body.classList.add('failed');
      setLoading(`插件窗口启动失败：${err.message}`);
      setStatus(`启动失败：${err.message}`);
    }
  }

  start();
})();
