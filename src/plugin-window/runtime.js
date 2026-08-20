(() => {
  const $ = selector => document.querySelector(selector);
  const statusEl = $('#statusBarMessage') || $('#statusBar');
  const errorEl = $('#pluginWindowError');
  const errorTextEl = $('#pluginWindowErrorText');

  const DEPENDENCY_SCRIPTS = Object.freeze({
    plotly:'../../node_modules/plotly.js-dist-min/plotly.min.js',
    d3:'../../node_modules/d3/dist/d3.min.js',
    'science-common':'../science/common.js',
    'science-import':'../science/import.js',
    'science-presets':'../science/presets.js',
    'science-peaks':'../science/peaks.js',
    'science-identity':'../science/identity.js',
    'science-physics':'../science/physics.js',
    'science-gate':'../science/gate.js',
    'science-pulse':'../science/pulse.js',
    'science-ter':'../science/ter.js',
    'data-model':'../core/data-model.js',
    'entity-runtime':'../core/entity-runtime.js',
    'formula-engine':'../core/formula-engine.js',
    'parameter-schema':'../core/parameter-schema.js',
    'workflow-engine':'../core/workflow-engine.js',
    platform:'../core/platform.js',
    'state-store':'../core/state-store.js',
    'io-runtime':'../core/io-runtime.js',
    'chart-runtime':'../core/chart-runtime.js',
    'scientific-plot-runtime':'../core/scientific-plot-runtime.js',
    'component-runtime':'../core/component-runtime.js',
    'data-flow-runtime':'../core/data-flow-runtime.js',
    'service-runtime':'../core/service-runtime.js',
    'plugin-contract-runtime':'../core/plugin-contract-runtime.js',
    'plugin-module-runtime':'../core/plugin-module-runtime.js',
    'ui-infrastructure':'../core/ui-infrastructure.js',
    'capability-runtime':'../core/capability-runtime.js',
    'plugin-kernel':'../core/plugin-kernel.js'
  });

  let bootstrap = null;
  let project = {};
  let artifactStore = null;
  let pluginRuntime = null;
  let ready = false;
  let snapshotTimer = null;
  let roleTransitionSnapshotTaken = false;
  let artifactUpserts = new Map();
  let artifactRemovals = new Set();

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = String(el.tagName || '').toLowerCase();
    return ['input','textarea','select'].includes(tag) || !!el.isContentEditable;
  }

  // Dedicated TOP windows do not load the main shell toolbar, but system edit
  // semantics must remain host-invariant. Route the same keyboard operations
  // through the active-plugin Edit Contract instead of reimplementing them in
  // each plugin header.
  window.addEventListener('keydown', event => {
    if (isTypingTarget(event.target)) return;
    const edit = window.DKDSPlugins?.edit;
    if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'z') {
      if (edit?.supports?.('undo')) { event.preventDefault(); edit.invoke('undo'); }
      return;
    }
    if (event.key === 'Escape' && edit?.supports?.('deselect')) {
      event.preventDefault(); edit.invoke('deselect');
    }
  });

  function clone(value) {
    if (value === undefined) return undefined;
    try { return structuredClone(value); }
    catch { return JSON.parse(JSON.stringify(value)); }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = String(text || '');
  }

  function showStartupError(err) {
    const message = err?.message || String(err || '未知错误');
    if (errorTextEl) errorTextEl.textContent = message;
    errorEl?.classList.remove('hidden');
    setStatus(`启动失败：${message}`);
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

  function loadInlineScript(source,label) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.async=false;
      script.dataset.dkdsExternalWindow=label;
      script.textContent=`${String(source||'')}\n//# sourceURL=dkds-window-plugin://${encodeURIComponent(label)}`;
      let runtimeError=null;
      const onError=event=>{runtimeError=event?.error||new Error(event?.message||`外部插件窗口脚本失败：${label}`);};
      window.addEventListener('error',onError);
      try{document.head.appendChild(script);}catch(err){runtimeError=err;}
      finally{window.removeEventListener('error',onError);script.remove();}
      if(runtimeError)reject(runtimeError);else resolve(label);
    });
  }

  function loadInlineStyle(source,label) {
    const style=document.createElement('style');
    style.dataset.dkdsExternalWindowStyle=label;
    style.textContent=String(source||'');
    document.head.appendChild(style);
    return style;
  }

  function externalPackageFile(spec,fileName) {
    const source=spec?.packageFiles?.[fileName];
    if(typeof source!=='string')throw new Error(`外部插件窗口文件缺失：${fileName}`);
    return source;
  }

  async function loadDependencies(spec) {
    const requested = Array.isArray(spec?.dependencies) ? spec.dependencies : [];
    const ordered = [];
    for (const id of requested) {
      const key = String(id || '').trim();
      if (!DEPENDENCY_SCRIPTS[key]) throw new Error(`插件窗口依赖未受支持：${key || '(empty)'}`);
      if (!ordered.includes(key) && key !== 'plugin-kernel') ordered.push(key);
    }
    if (!ordered.includes('platform')) ordered.push('platform');
    if (!ordered.includes('state-store')) ordered.push('state-store');
    for(const id of ['entity-runtime','io-runtime','chart-runtime','scientific-plot-runtime','component-runtime','data-flow-runtime','service-runtime','plugin-contract-runtime','plugin-module-runtime'])if(!ordered.includes(id))ordered.push(id);
    if (!ordered.includes('ui-infrastructure')) ordered.push('ui-infrastructure');
    if (!ordered.includes('capability-runtime')) ordered.push('capability-runtime');
    ordered.push('plugin-kernel');

    for (const id of ordered) await loadScript(DEPENDENCY_SCRIPTS[id]);
    if (window.DKDSScience) window.Analysis = window.DKDSScience;
    if (!window.DKDSPlugins) throw new Error('插件内核未加载。');
    window.DKDSUI?.host?.configure?.({
      root:'#app',
      activity:()=>window.DKDSPlugins?.activities?.active?.()||String(bootstrap?.pluginWindow?.activity||''),
      status:setStatus,
      zones:{overlay:'#app',main:'#app',left:'#pluginWindowLeftDock',right:'#pluginWindowRightDock',bottom:'#pluginWindowBottomDock'}
    });
    window.DKDSCapabilities?.importRemote?.(bootstrap?.capabilitySnapshot||null, payload=>window.electronAPI?.invokeOwnerCapability?.(payload));
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
    // Root project datasets remain the compatibility persistence source for
    // imported text data. They are deliberately excluded from dataModel when
    // serialized because their Artifact representation is transient. Rebuild
    // those adapters here so TOP windows observe the same live data contract as
    // the main renderer instead of receiving an empty Artifact Store.
    if (artifactStore && window.DKDSData?.syncLegacyDatasetArtifacts && Array.isArray(project.datasets)) {
      try { window.DKDSData.syncLegacyDatasetArtifacts(artifactStore,project.datasets); }
      catch (err) { console.warn('[DKDS plugin window legacy artifact bridge]', err); }
    }
    artifactUpserts = new Map();
    artifactRemovals = new Set();
  }

  function recordArtifactChange(payload={}) {
    const type=String(payload.type||'');
    if(type==='batch'){
      for(const entry of payload.events||payload.changes||[])recordArtifactChange(entry);
      return;
    }
    if((type==='add'||type==='upsert')&&payload.artifact?.id){
      artifactRemovals.delete(String(payload.artifact.id));
      artifactUpserts.set(String(payload.artifact.id),clone(payload.artifact));
    }else if(type==='remove'&&payload.id){
      const id=String(payload.id);
      artifactUpserts.delete(id);
      artifactRemovals.add(id);
    }else if(type==='clear'){
      for(const id of payload.ids||[]){
        artifactUpserts.delete(String(id));
        artifactRemovals.add(String(id));
      }
    }
  }

  function artifactDeltaPayload() {
    return {
      upserts:[...artifactUpserts.values()].map(clone),
      removedIds:[...artifactRemovals]
    };
  }

  function emitArtifactsChanged(payload={}) {
    recordArtifactChange(payload);
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed', payload);
    scheduleSnapshot();
  }

  const artifactsApi = {
    list: options => artifactStore?.list?.(options) || [],
    get: id => artifactStore?.get?.(id) || null,
    parents: id => artifactStore?.parents?.(id) || [],
    children: id => artifactStore?.children?.(id) || [],
    lineage: id => artifactStore?.lineage?.(id) || null,
    add(artifact, options) {
      if (!artifactStore) throw new Error('当前插件窗口未加载数据对象存储。');
      const id = artifactStore.add(artifact, options);
      emitArtifactsChanged({type:'add', artifact:artifactStore.get(id)});
      return id;
    },
    upsert(artifact) {
      if (!artifactStore) throw new Error('当前插件窗口未加载数据对象存储。');
      const id = artifactStore.upsert(artifact);
      emitArtifactsChanged({type:'upsert', artifact:artifactStore.get(id)});
      return id;
    },
    publish(artifact, options={}) {
      if (!artifactStore) throw new Error('当前插件窗口未加载数据对象存储。');
      const result=artifactStore.publish?.(artifact,options)||{id:artifactStore.upsert(artifact),changed:true};
      if(result.changed)emitArtifactsChanged({type:'publish',artifact:artifactStore.get(result.id)});
      return result;
    },
    batch(fn) {
      if (!artifactStore) throw new Error('当前插件窗口未加载数据对象存储。');
      const events=[];
      const batchApi={...artifactsApi,add(artifact,options){const id=artifactStore.add(artifact,options);events.push({type:'add',artifact:artifactStore.get(id)});return id;},upsert(artifact){const id=artifactStore.upsert(artifact);events.push({type:'upsert',artifact:artifactStore.get(id)});return id;},publish(artifact,options={}){const result=artifactStore.publish?.(artifact,options)||{id:artifactStore.upsert(artifact),changed:true};if(result.changed)events.push({type:'publish',artifact:artifactStore.get(result.id)});return result;},remove(id){const ok=artifactStore.remove(id);if(ok)events.push({type:'remove',id});return ok;}};
      const result=artifactStore.batch?artifactStore.batch(()=>fn?.(batchApi)):fn?.(batchApi);if(events.length)emitArtifactsChanged({type:'batch',events});return result;
    },
    remove(id) {
      const ok = artifactStore?.remove?.(id) || false;
      if (ok) emitArtifactsChanged({type:'remove', id});
      return ok;
    },
    clear() {
      const ids=(artifactStore?.list?.({includeTransient:true})||[]).map(a=>a.id).filter(Boolean);
      artifactStore?.clear?.();
      emitArtifactsChanged({type:'clear',ids});
    },
    syncLegacy() {
      // Dedicated plugin windows consume the canonical project snapshot. They
      // never rebuild data objects by launching a second full workspace.
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
      window.DKDSPlugins?.events?.emit?.('analysis:opened', {id:target});
      window.DKDSPlugins?.events?.emit?.('analysis:refresh', {id:target});
      requestAnimationFrame(() => window.DKDSPlugins?.events?.emit?.('layout:resize', {reason:'page-open'}));
    }
    return !!page;
  }

  function closeAnalysisPage() {
    pushSnapshot(true);
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

  function buildSnapshotPayload(final=false) {
    if (!bootstrap) return null;
    const persistence=bootstrap?.pluginWindow?.persistence||'project';
    if(persistence!=='project')return null;
    syncProjectFromWindow();
    const pluginId=String(bootstrap?.pluginWindow?.pluginId||'');
    return {
      project:clone(project),
      pluginState:pluginId ? clone(project.plugins?.[pluginId] ?? null) : null,
      artifactDelta:artifactDeltaPayload(),
      final:!!final
    };
  }

  function pushSnapshot(final=false) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
    if (!bootstrap || bootstrap.prewarm === true || roleTransitionSnapshotTaken || !window.electronAPI?.pushActivityProjectSnapshot) return;
    try {
      const payload=buildSnapshotPayload(final);
      if(payload)window.electronAPI.pushActivityProjectSnapshot(payload);
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
      appVersion:'3.46.1',
      platform:window.DKDSPlatform,
      isAuxiliaryWindow:true,
      closeCurrentWindow:closeAnalysisPage,
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
      services:{}
    };
  }

  async function loadTargetPlugin() {
    const spec = bootstrap?.pluginWindow;
    document.body.dataset.pluginId=String(spec?.pluginId||'');
    const packagedSource=spec?.source==='external'||spec?.source==='override';
    if (!spec?.entry || (!packagedSource&&!spec?.pluginFolder)) throw new Error('插件窗口缺少入口信息。');

    // Load only the dependencies declared by this top-level plugin. The old
    // host loaded Plotly + all science/workflow modules for every window.
    await loadDependencies(spec);
    restoreArtifactStore();

    // Optional plugin-local support scripts make a dedicated plugin
    // self-contained: adding a new analysis does not require extending the
    // host's shared dependency allowlist for its private implementation.
    const loadedExternalScripts=new Set();
    const loadTargetScript=async file=>{
      if(packagedSource){
        if(loadedExternalScripts.has(file))return;
        await loadInlineScript(externalPackageFile(spec,file),`${spec.pluginId}/${file}`);
        loadedExternalScripts.add(file);
      }else await loadScript(pluginUrl(file));
    };
    for(const file of (spec.scripts||[]))await loadTargetScript(file);

    if (spec.runtime) await loadTargetScript(spec.runtime);

    const host = baseHost();
    const windowRuntime=window.DKDSPluginModules?.get?.(String(spec.pluginId||''),'window-runtime') || window.DKDSPluginWindowRuntime;
    if (windowRuntime?.create) {
      pluginRuntime = await windowRuntime.create({
        project,
        bootstrap:clone(bootstrap),
        setStatus,
        scheduleSnapshot,
        copyTextToClipboard,
        savePlotlyImage,
        artifacts:artifactsApi
      });
      if (pluginRuntime?.serviceName && pluginRuntime?.service) {
        window.DKDSServices?.register?.(String(spec.pluginId||'plugin-window'),pluginRuntime.serviceName,pluginRuntime.service,{replace:true,metadata:{scope:'dedicated-window'}});
      }
    }

    window.DKDSPlugins.configure(host);
    if(packagedSource){
      for(const file of (spec.styles||[]))loadInlineStyle(externalPackageFile(spec,file),`${spec.pluginId}/${file}`);
      for(const file of (spec.packageScripts||[spec.entry]))await loadTargetScript(file);
    }else{
      await loadScript(pluginUrl(spec.entry));
    }

    await window.DKDSPlugins.activateAll();
    const targetPluginState=window.DKDSPlugins?.manager?.get?.(String(spec.pluginId||''))||null;
    if(targetPluginState && !targetPluginState.active){
      const activationError=String(targetPluginState.error||'').trim();
      throw new Error(activationError
        ? `插件激活失败：${spec.pluginId} · ${activationError}`
        : `插件激活失败：${spec.pluginId}`);
    }
    // Mount legacy/base project data first, then let namespaced plugin slices
    // override it. This makes plugin project state canonical without breaking
    // older project files that only contain root-level analysis fields.
    await pluginRuntime?.setProject?.(project);
    await window.DKDSPlugins.project.restore(project.plugins || {}, project);

    const opened = await window.DKDSPlugins.activities.set(bootstrap.activityId);
    if (!opened) {
      const state=window.DKDSPlugins?.manager?.get?.(String(spec.pluginId||''))||targetPluginState;
      const activationError=String(state?.error||'').trim();
      throw new Error(activationError
        ? `插件工作区不可用：${bootstrap.activityId} · ${activationError}`
        : `插件没有注册工作区：${bootstrap.activityId}`);
    }

    ready = true;
    setStatus(`${spec.title || bootstrap.activityId} 已就绪`);
    requestAnimationFrame(() => window.DKDSPlugins.events.emit('layout:resize',{reason:'initial'}));
    window.electronAPI?.markActivityWindowReady?.();
  }

  async function replaceProjectFromBootstrap(nextBootstrap) {
    if (!nextBootstrap?.project) return;
    const sameProject = bootstrap?.projectDigest
      && bootstrap.projectDigest === nextBootstrap.projectDigest
      && bootstrap.projectPath === nextBootstrap.projectPath;
    bootstrap = nextBootstrap;
    window.DKDSCapabilities?.importRemote?.(bootstrap?.capabilitySnapshot||null, payload=>window.electronAPI?.invokeOwnerCapability?.(payload));
    if (sameProject) {
      // Typical prewarm -> first-open transition: dependencies, plugin DOM,
      // Plotly and the project are already mounted. Only the lifecycle flag
      // changed, so do not restore/re-render the project a second time.
      setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} 已就绪`);
      return;
    }
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
      document.title = `DK Data Studio · ${bootstrap.pluginWindow.title || bootstrap.activityId || '插件'}`;

      window.electronAPI?.onActivityBootstrapChanged?.(async () => {
        const next = await window.electronAPI?.getActivityWindowBootstrap?.();
        if (next) await replaceProjectFromBootstrap(next);
      });
      window.electronAPI?.onActivityWillHide?.(() => pushSnapshot(true));
      window.electronAPI?.onActivityRoleSnapshotRequest?.(request=>{
        const requestId=String(request?.requestId||'');
        if(!requestId)return;
        let snapshot=null;
        try{snapshot=buildSnapshotPayload(true);roleTransitionSnapshotTaken=true;}catch(err){console.warn('[DKDS plugin window role snapshot]',err);}
        window.electronAPI?.respondActivityRoleSnapshot?.({requestId,snapshot});
      });
      window.electronAPI?.onActivityWillShow?.(() => {
        requestAnimationFrame(() => {
          window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show'});
          requestAnimationFrame(() => window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show-settled'}));
        });
      });

      window.addEventListener('resize', () => {
        if (ready) window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});
      });
      window.addEventListener('beforeunload', () => pushSnapshot(true));

      await loadTargetPlugin();
    } catch (err) {
      console.error('[DKDS plugin window startup]', err);
      showStartupError(err);
      window.electronAPI?.markActivityWindowFailed?.({
        activityId:String(bootstrap?.activityId||''),
        pluginId:String(bootstrap?.pluginWindow?.pluginId||''),
        error:err?.stack||err?.message||String(err||'插件独立窗口启动失败。')
      });
    }
  }

  start();
})();
