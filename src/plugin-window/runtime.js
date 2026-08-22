(() => {
  const STARTUP_PROFILE_VERSION='1.1.0';
  const startupStartedAt=performance.now();
  const startupProfile={version:STARTUP_PROFILE_VERSION,startedAt:0,totalMs:0,phases:[],dependencies:[],scripts:[]};
  const roundMs=value=>Math.round(Number(value||0)*10)/10;
  const measure=async(name,fn,bucket=startupProfile.phases,meta={})=>{const started=performance.now();try{return await fn();}finally{bucket.push({name,...meta,startMs:roundMs(started-startupStartedAt),durationMs:roundMs(performance.now()-started)});}};
  const measureSync=(name,fn,bucket=startupProfile.phases,meta={})=>{const started=performance.now();try{return fn();}finally{bucket.push({name,...meta,startMs:roundMs(started-startupStartedAt),durationMs:roundMs(performance.now()-started)});}};
  const $ = selector => document.querySelector(selector);
  const statusEl = $('#statusBarMessage') || $('#statusBar');
  const errorEl = $('#pluginWindowError');
  const errorTextEl = $('#pluginWindowErrorText');

  const DEPENDENCY_SCRIPTS = Object.freeze({
    plotly:'../../node_modules/plotly.js-cartesian-dist-min/plotly-cartesian.min.js',
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
    'performance-runtime':'../core/performance-runtime.js',
    'scientific-plot-runtime':'../core/scientific-plot-runtime.js',
    'component-runtime':'../core/component-runtime.js',
    'data-flow-runtime':'../core/data-flow-runtime.js',
    'scientific-reactive-runtime':'../core/scientific-reactive-runtime.js',
    'scientific-pipeline-runtime':'../core/scientific-pipeline-runtime.js',
    'scientific-transform-runtime':'../core/scientific-transform-runtime.js',
    'scientific-algorithm-runtime':'../core/scientific-algorithm-runtime.js',
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
  let projectHydrated = false;
  let activityOpened = false;
  let plotlyRequested = false;
  let snapshotTimer = null;
  let roleTransitionSnapshotTaken = false;
  let artifactUpserts = new Map();
  let artifactRemovals = new Set();
  let artifactStorePrimedForBootstrap = false;

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
    if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 's') {
      event.preventDefault();
      const payload=buildSnapshotPayload(true);
      if(window.electronAPI?.requestOwnerProjectSave)window.electronAPI.requestOwnerProjectSave(payload||{});
      else pushSnapshot(true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        if (edit?.supports?.('redo')) edit.invoke('redo');
        else void window.DKDSCapabilities?.invoke?.('core.project-history','redo');
      } else if (edit?.supports?.('undo')) edit.invoke('undo');
      else void window.DKDSCapabilities?.invoke?.('core.project-history','undo');
      return;
    }
    if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'y') {
      event.preventDefault();
      if (edit?.supports?.('redo')) edit.invoke('redo');
      else void window.DKDSCapabilities?.invoke?.('core.project-history','redo');
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
    const requestedPlotly=requested.map(id=>String(id||'').trim()).includes('plotly');
    plotlyRequested=requestedPlotly;
    const ordered = [];
    for (const id of requested) {
      const key = String(id || '').trim();
      if (!DEPENDENCY_SCRIPTS[key]) throw new Error(`插件窗口依赖未受支持：${key || '(empty)'}`);
      // Plotly is a large renderer runtime (~0.6 s parse/eval on the reference
      // Windows machine). Keep the logical dependency contract, but let the
      // Core Chart Runtime load it once on first actual chart use instead of
      // blocking every dedicated TOP's first interactive frame.
      if (key==='plotly') continue;
      if (!ordered.includes(key) && key !== 'plugin-kernel') ordered.push(key);
    }
    if (!ordered.includes('platform')) ordered.push('platform');
    if (!ordered.includes('state-store')) ordered.push('state-store');
    // Stable host infrastructure remains available to every dedicated TOP, but
    // domain runtimes added by v3.50+ must only load when requiresCore/window
    // dependencies requested them. Loading Pipeline/Transform/Algorithm in every
    // TOP made unrelated Data Center/Pulse windows pay the cost of new science
    // features and caused startup time to grow as the platform evolved.
    for(const id of ['entity-runtime','io-runtime','chart-runtime','performance-runtime','scientific-plot-runtime','component-runtime','data-flow-runtime','service-runtime','plugin-contract-runtime','plugin-module-runtime'])if(!ordered.includes(id))ordered.push(id);
    if (!ordered.includes('ui-infrastructure')) ordered.push('ui-infrastructure');
    if (!ordered.includes('capability-runtime')) ordered.push('capability-runtime');
    ordered.push('plugin-kernel');

    for (const id of ordered) await measure(id,()=>loadScript(DEPENDENCY_SCRIPTS[id]),startupProfile.dependencies,{src:DEPENDENCY_SCRIPTS[id]});
    window.DKDSCharts?.configureRuntime?.({plotlyAllowed:requestedPlotly,plotlySource:new URL(DEPENDENCY_SCRIPTS.plotly,location.href).href,host:'dedicated-top'});
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

  function beginDeclaredChartPreload() {
    if (!plotlyRequested || !window.DKDSCharts?.ensurePlotly) return;
    // Start the renderer request as soon as the lightweight Core dependencies
    // are mounted, but deliberately do not await it. Plugin support scripts,
    // project restore and activity mounting can proceed while the async script
    // request is in flight. This closes the v3.60 gap where activity-open could
    // request the first TER plot before the post-ready idle warmup even began.
    void Promise.resolve(window.DKDSCharts.ensurePlotly({reason:'startup-parallel-preload'}))
      .catch(err => console.warn('[DKDS plugin window Plotly parallel preload]', err));
  }

  function scheduleDeclaredChartWarmup() {
    if (!plotlyRequested || !window.DKDSCharts?.ensurePlotly) return;
    const warm = () => {
      void Promise.resolve(window.DKDSCharts.ensurePlotly({reason:'idle-preload'}))
        .catch(err => console.warn('[DKDS plugin window Plotly idle preload]', err));
    };
    // Post-ready warmup remains as a fallback/reuse point. In the normal path
    // it simply reuses the preload promise (or the ready renderer) and adds no
    // second script. Ordinary cold-open readiness remains non-blocking; a
    // manifest-declared runtime-only prewarm explicitly awaits the same promise.
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warm,{timeout:350});
    else setTimeout(warm,120);
  }

  function safeSegment(value) {
    const s = String(value || '').trim();
    if (!/^[A-Za-z0-9._-]+$/.test(s) || s === '.' || s === '..') {
      throw new Error(`非法插件路径：${s || '(empty)'}`);
    }
    return s;
  }

  function pluginUrl(fileName, pluginFolder=null) {
    const folder = safeSegment(pluginFolder||bootstrap?.pluginWindow?.pluginFolder);
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
    const liveSnapshot=Array.isArray(bootstrap?.artifactSnapshot)?bootstrap.artifactSnapshot:null;
    artifactStore = window.DKDSData?.restoreStore
      ? window.DKDSData.restoreStore(liveSnapshot!==null?{schema:2,artifacts:liveSnapshot}:(project.dataModel || { schema:1, artifacts:[] }))
      : null;
    // Live snapshots and legacy project datasets are complementary inputs.
    // The live snapshot is authoritative for canonical/persisted Artifacts,
    // while project.datasets is still the self-contained source for transient
    // legacy DataTable adapters. Never treat an empty (or incomplete) live
    // snapshot as a reason to skip that compatibility bridge: doing so leaves
    // Data Center empty even though the same project still renders in the main
    // Resonance workbench. Stable legacy artifact ids make this merge idempotent.
    if (artifactStore && window.DKDSData?.syncLegacyDatasetArtifacts && Array.isArray(project.datasets)) {
      try { window.DKDSData.syncLegacyDatasetArtifacts(artifactStore,project.datasets); }
      catch (err) { console.warn('[DKDS plugin window legacy artifact bridge]', err); }
    }
    artifactUpserts = new Map();
    artifactRemovals = new Set();
    return artifactStore;
  }

  function primeArtifactStoreForRuntime() {
    // Plugin window runtimes and plugin activation are allowed to consult the
    // Artifact API immediately. Previously `artifactStore` did not exist until
    // after window-runtime creation + plugin activation, which made the contract
    // timing-dependent (Resonance could throw, while Data Center silently mounted
    // against an empty store). Runtime-only prewarm still receives an empty Store
    // so it does not hydrate domain data or defeat the prewarm performance policy.
    if (bootstrap?.prewarm === true) {
      artifactStore = window.DKDSData?.restoreStore
        ? window.DKDSData.restoreStore({schema:2,artifacts:[]})
        : null;
      artifactUpserts = new Map();
      artifactRemovals = new Set();
      artifactStorePrimedForBootstrap = false;
      return artifactStore;
    }
    restoreArtifactStore();
    artifactStorePrimedForBootstrap = true;
    return artifactStore;
  }

  function pluginWindowDiagnosticSnapshot() {
    const rows=artifactStore?.list?.({includeTransient:true})||[];
    const tables=rows.filter(row=>row?.kind==='data.table');
    const visiblePage=[...document.querySelectorAll?.('.analysis-page:not(.hidden)')||[]][0]||null;
    const dataCenterList=document.querySelector?.('#dcArtifactList')||null;
    const dataCenterChart=document.querySelector?.('#dcChart')||null;
    const dataCenterChartRuntime=window.DKDSCharts?.runtimeState?.()||null;
    const sourceDescriptor=window.DKDSCapabilities?.get?.('core.data-sources')||null;
    const sourceSync=sourceDescriptor?.metadata?.syncSnapshot&&typeof sourceDescriptor.metadata.syncSnapshot==='object'?sourceDescriptor.metadata.syncSnapshot:null;
    return {
      projectHydrated:!!projectHydrated,
      activityOpened:!!activityOpened,
      prewarm:bootstrap?.prewarm===true,
      projectDatasetCount:Array.isArray(project?.datasets)?project.datasets.length:0,
      projectDataModelCount:Array.isArray(project?.dataModel?.artifacts)?project.dataModel.artifacts.length:0,
      artifactCount:rows.length,
      dataTableCount:tables.length,
      transientArtifactCount:rows.filter(row=>row?.transient===true).length,
      totalTableRows:tables.reduce((sum,row)=>sum+(Number(row?.rowCount)||0),0),
      activeActivityId:String(window.DKDSPlugins?.activities?.active?.()||''),
      visiblePageId:String(visiblePage?.id||''),
      renderedArtifactRows:Number(dataCenterList?.querySelectorAll?.('.dc-artifact-item')?.length)||0,
      dataCenterCountText:String(document.querySelector?.('#dcArtifactCount')?.textContent||''),
      dataCenterChartTraceCount:Array.isArray(dataCenterChart?.data)?dataCenterChart.data.length:0,
      dataCenterChartSvgCount:Number(dataCenterChart?.querySelectorAll?.('.main-svg')?.length)||0,
      dataCenterChartProvider:String(document.querySelector?.('#dcChartProvider')?.value||''),
      dataCenterChartRuntimeReady:dataCenterChartRuntime?.ready===true,
      dataCenterChartRuntimeStatus:String(dataCenterChartRuntime?.status||''),
      dataCenterChartRuntimeError:String(dataCenterChartRuntime?.error||''),
      dataSourceSyncSnapshot:!!sourceSync,
      dataSourceSourceCount:Array.isArray(sourceSync?.sources)?sourceSync.sources.length:0,
      dataSourceTargetCount:Array.isArray(sourceSync?.targets)?sourceSync.targets.length:0
    };
  }
  window.DKDSPluginWindowDiagnostics=Object.freeze({snapshot:pluginWindowDiagnosticSnapshot});

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

  function applyOwnerArtifactDelta(payload={}) {
    if (!projectHydrated || !artifactStore) return false;
    const delta=payload?.artifactDelta&&typeof payload.artifactDelta==='object'?payload.artifactDelta:null;
    if(!delta)return false;
    let changed=false;
    const upserts=Array.isArray(delta.upserts)?delta.upserts:[];
    const removedIds=Array.isArray(delta.removedIds)?delta.removedIds:[];
    artifactStore.batch?.(()=>{
      for(const artifact of upserts){
        if(!artifact?.id)continue;
        try{artifactStore.upsert(artifact);changed=true;}catch(err){console.warn('[DKDS owner artifact sync:upsert]',err);}
      }
      for(const id of removedIds){
        try{changed=artifactStore.remove(String(id))||changed;}catch(err){console.warn('[DKDS owner artifact sync:remove]',err);}
      }
    });
    if(changed){
      // Owner-originated changes are already canonical in the main project. Do
      // not record them as local plugin-window deltas or echo them back.
      window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{
        type:'owner-sync',
        reason:String(payload?.reason||'owner-artifact-change'),
        artifactDelta:{upserts:upserts.map(clone),removedIds:[...removedIds]},
        artifacts:artifactStore.list?.({includeTransient:true})||[]
      });
    }
    return changed;
  }

  const artifactsApi = {
    list: options => artifactStore?.list?.(options) || [],
    revision: kind => artifactStore?.revision?.(kind) || 0,
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
    const data = await window.DKDSCharts.toImage(plotId, {
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
      appVersion:'3.61.20',
      platform:window.DKDSPlatform,
      isAuxiliaryWindow:true,
      closeCurrentWindow:closeAnalysisPage,
      openActivityWindow:()=>false,
      openImportWorkbench:options=>{
        if(!window.electronAPI?.requestOwnerImportWorkbench)return false;
        window.electronAPI.requestOwnerImportWorkbench({options:clone(options||{})});
        setStatus('已在主窗口打开数据导入工作台。');
        return true;
      },
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

  async function hydrateProjectAndOpenActivity(nextProject,{reason='project-hydrate'}={}) {
    project=ensureProjectShape(nextProject||{});
    if (reason==='initial' && artifactStorePrimedForBootstrap && artifactStore) {
      measureSync(`${reason}:artifact-store`,()=>artifactStore);
    } else {
      measureSync(`${reason}:artifact-store`,()=>restoreArtifactStore());
    }
    artifactStorePrimedForBootstrap=false;
    await measure(`${reason}:plugin-project-set`,()=>pluginRuntime?.setProject?.(project));
    await measure(`${reason}:project-restore`,()=>window.DKDSPlugins.project.restore(project.plugins || {}));
    projectHydrated=true;
    const opened=await measure(`${reason}:activity-open`,()=>window.DKDSPlugins.activities.set(bootstrap.activityId));
    if(!opened){
      const state=window.DKDSPlugins?.manager?.get?.(String(bootstrap?.pluginWindow?.pluginId||''))||null;
      const activationError=String(state?.error||'').trim();
      throw new Error(activationError?`插件工作区不可用：${bootstrap.activityId} · ${activationError}`:`插件没有注册工作区：${bootstrap.activityId}`);
    }
    activityOpened=true;
    window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{type:'replace'});
    window.DKDSPlugins?.events?.emit?.('layout:resize',{reason});
    return true;
  }

  async function ensureDeclaredChartWarm() {
    if(!plotlyRequested||!window.DKDSCharts?.ensurePlotly)return false;
    await window.DKDSCharts.ensurePlotly({reason:'dedicated-prewarm-runtime'});
    return true;
  }

  async function loadTargetPlugin() {
    const spec = bootstrap?.pluginWindow;
    document.body.dataset.pluginId=String(spec?.pluginId||'');
    const packagedSource=spec?.source==='external'||spec?.source==='override';
    if (!spec?.entry || (!packagedSource&&!spec?.pluginFolder)) throw new Error('插件窗口缺少入口信息。');

    // Load only the dependencies declared by this top-level plugin. The old
    // host loaded Plotly + all science/workflow modules for every window.
    await measure('dependencies',()=>loadDependencies(spec));
    beginDeclaredChartPreload();
    measureSync('artifact-store-prime',()=>primeArtifactStoreForRuntime());

    // Optional plugin-local support scripts make a dedicated plugin
    // self-contained: adding a new analysis does not require extending the
    // host's shared dependency allowlist for its private implementation.
    const loadedExternalScripts=new Set();
    const loadTargetScript=async(file,kind='support')=>measure(file,async()=>{
      if(packagedSource){
        if(loadedExternalScripts.has(file))return;
        await loadInlineScript(externalPackageFile(spec,file),`${spec.pluginId}/${file}`);
        loadedExternalScripts.add(file);
      }else await loadScript(pluginUrl(file));
    },startupProfile.scripts,{kind});
    const loadedProviderScripts=new Set();
    const loadProviderScript=async(provider,file)=>measure(`${provider.pluginId}:${file}`,async()=>{
      const token=`${provider.pluginId}::${file}`;if(loadedProviderScripts.has(token))return;
      if(provider.source==='external'||provider.source==='override')await loadInlineScript(externalPackageFile(provider,file),`${provider.pluginId}/${file}`);
      else await loadScript(pluginUrl(file,provider.pluginFolder));
      loadedProviderScripts.add(token);
    },startupProfile.scripts,{kind:'algorithm-provider',providerId:provider.pluginId});
    for(const file of (spec.scripts||[]))await loadTargetScript(file,'support');

    if (spec.runtime) await loadTargetScript(spec.runtime,'window-runtime');

    const host = baseHost();
    const windowRuntime=window.DKDSPluginModules?.get?.(String(spec.pluginId||''),'window-runtime') || window.DKDSPluginWindowRuntime;
    if (windowRuntime?.create) {
      pluginRuntime = await measure('window-runtime-create',()=>windowRuntime.create({
        project,
        bootstrap:clone(bootstrap),
        setStatus,
        scheduleSnapshot,
        copyTextToClipboard,
        savePlotlyImage,
        artifacts:artifactsApi
      }));
      if (pluginRuntime?.serviceName && pluginRuntime?.service) {
        window.DKDSServices?.register?.(String(spec.pluginId||'plugin-window'),pluginRuntime.serviceName,pluginRuntime.service,{replace:true,metadata:{scope:'dedicated-window'}});
      }
    }

    window.DKDSPlugins.configure(host);
    for(const provider of (spec.algorithmProviders||[])){
      for(const file of (provider.scripts||[]))await loadProviderScript(provider,file);
    }
    if(packagedSource){
      for(const file of (spec.styles||[]))loadInlineStyle(externalPackageFile(spec,file),`${spec.pluginId}/${file}`);
      for(const file of (spec.packageScripts||[spec.entry]))await loadTargetScript(file,file===spec.entry?'entry':'package');
    }else{
      await loadTargetScript(spec.entry,'entry');
    }

    await measure('plugins-activate',()=>window.DKDSPlugins.activateAll());
    for(const provider of (spec.algorithmProviders||[])){
      const state=window.DKDSPlugins?.manager?.get?.(String(provider.pluginId||''))||null;
      if(!state?.active){const error=String(state?.error||'').trim();throw new Error(error?`算法 Provider 激活失败：${provider.pluginId} · ${error}`:`算法 Provider 激活失败：${provider.pluginId}`);}
    }
    const targetPluginState=window.DKDSPlugins?.manager?.get?.(String(spec.pluginId||''))||null;
    if(targetPluginState && !targetPluginState.active){
      const activationError=String(targetPluginState.error||'').trim();
      throw new Error(activationError
        ? `插件激活失败：${spec.pluginId} · ${activationError}`
        : `插件激活失败：${spec.pluginId}`);
    }
    // Prewarm is intentionally runtime-only. Hidden dedicated windows load Core,
    // Plugin SDK/runtime code, algorithm providers and declared chart runtimes,
    // but they do not restore domain project slices, activate an analysis page,
    // calculate results or render charts. First user open performs the project
    // hydration behind the still-hidden window and is shown only after that step.
    if(bootstrap.prewarm===true){
      await measure('declared-chart-prewarm',()=>ensureDeclaredChartWarm());
      startupProfile.prewarmMode='runtime-only';
      projectHydrated=false;activityOpened=false;
    }else{
      await hydrateProjectAndOpenActivity(project,{reason:'initial'});
      startupProfile.prewarmMode='full-open';
    }

    ready = true;
    setStatus(`${spec.title || bootstrap.activityId} 已就绪`);
    requestAnimationFrame(() => window.DKDSPlugins.events.emit('layout:resize',{reason:'initial'}));
    startupProfile.totalMs=roundMs(performance.now()-startupStartedAt);
    startupProfile.pluginId=String(spec.pluginId||'');
    startupProfile.activityId=String(bootstrap.activityId||'');
    startupProfile.dependencyCount=startupProfile.dependencies.length;
    startupProfile.scriptCount=startupProfile.scripts.length;
    startupProfile.algorithmProviders=(spec.algorithmProviders||[]).map(provider=>({pluginId:provider.pluginId,version:provider.version,categories:[...(provider.algorithmCategories||[])],source:provider.source}));
    startupProfile.chartRuntime=window.DKDSCharts?.runtimeState?.()||null;
    window.electronAPI?.markActivityWindowReady?.({startupProfile});
    scheduleDeclaredChartWarmup();
  }

  async function replaceProjectFromBootstrap(nextBootstrap) {
    if (!nextBootstrap?.project) return;
    const previousBootstrap=bootstrap;
    const sameProject = previousBootstrap?.projectDigest
      && previousBootstrap.projectDigest === nextBootstrap.projectDigest
      && previousBootstrap.projectPath === nextBootstrap.projectPath;
    const liveArtifactsChanged = String(previousBootstrap?.artifactDigest||'') !== String(nextBootstrap?.artifactDigest||'');
    const promoteFromPrewarm=previousBootstrap?.prewarm===true&&nextBootstrap.prewarm!==true;
    bootstrap = nextBootstrap;
    window.DKDSCapabilities?.importRemote?.(bootstrap?.capabilitySnapshot||null, payload=>window.electronAPI?.invokeOwnerCapability?.(payload));
    try {
      if(promoteFromPrewarm||!projectHydrated||!activityOpened){
        await hydrateProjectAndOpenActivity(nextBootstrap.project,{reason:promoteFromPrewarm?'prewarm-open':'project-hydrate'});
        setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} 已就绪`);
        // Main keeps a runtime-only prewarmed window hidden until this second
        // readiness signal, so users never see a half-hydrated analysis page.
        window.electronAPI?.markActivityWindowReady?.({startupProfile:{...startupProfile,prewarmMode:'hydrated-open'}});
        return;
      }
      if(sameProject&&liveArtifactsChanged&&Array.isArray(nextBootstrap.artifactSnapshot)){
        // Reused live-hydration windows must consume a new full owner snapshot
        // even when the serialized project itself is unchanged. This repairs
        // missed/transient deltas without reloading plugin code or remounting the
        // activity. The Artifact API closes over `artifactStore`, so replacing
        // the store here is immediately visible to Data Center and other live
        // consumers after the change event below.
        project=ensureProjectShape(nextBootstrap.project);
        restoreArtifactStore();
        window.DKDSPlugins?.events?.emit?.('data:artifacts-changed',{
          type:'owner-live-replace',reason:'bootstrap-artifact-refresh',
          artifacts:artifactStore?.list?.({includeTransient:true})||[]
        });
        setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} · 数据已同步`);
        return;
      }
      if(sameProject){setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} 已就绪`);return;}
      await hydrateProjectAndOpenActivity(nextBootstrap.project,{reason:'project-replace'});
      setStatus(`${bootstrap.pluginWindow?.title || bootstrap.activityId} · 项目已同步`);
    } catch (err) {
      console.error('[DKDS plugin window project replace]',err);
      setStatus(`项目同步失败：${err.message}`);
      if(promoteFromPrewarm)window.electronAPI?.markActivityWindowFailed?.({activityId:String(bootstrap?.activityId||''),pluginId:String(bootstrap?.pluginWindow?.pluginId||''),error:err?.stack||err?.message||String(err),startupProfile});
    }
  }

  async function start() {
    try {
      bootstrap = await measure('bootstrap',()=>window.electronAPI?.getActivityWindowBootstrap?.());
      if (!bootstrap?.project) throw new Error('没有收到主窗口项目快照。');
      if (!bootstrap?.pluginWindow) throw new Error('当前插件没有独立窗口定义。');

      project = ensureProjectShape(bootstrap.project);
      document.title = `DK Data Studio · ${bootstrap.pluginWindow.title || bootstrap.activityId || '插件'}`;

      window.electronAPI?.onActivityBootstrapChanged?.(async () => {
        const next = await window.electronAPI?.getActivityWindowBootstrap?.();
        if (next) await replaceProjectFromBootstrap(next);
      });
      window.electronAPI?.onOwnerArtifactDelta?.(payload => {
        if(String(payload?.projectTabId||'')!==String(bootstrap?.projectTabId||''))return;
        applyOwnerArtifactDelta(payload);
      });
      window.electronAPI?.onActivityWillHide?.(() => {
        pushSnapshot(true);
        // TOP reuse is a Core resource lifecycle, not a plugin-specific optimization.
        // Suspend generic UI schedulers and release managed Plotly renderer state
        // before contracting scientific caches. Domain state/Selection/Viewport stay
        // in the shared Controller/View model and are restored on show.
        void Promise.resolve(window.DKDSUI?.lifecycle?.('hidden',{reason:'top-window-hide'})).catch(err=>console.warn('[DKDS plugin window UI suspend]',err)).finally(()=>{
          window.DKDSPerformance?.lifecycle?.('hidden',{retainRatio:0.25,dropWeak:true,reason:'top-window-hide'});
        });
      });
      window.electronAPI?.onActivityRoleSnapshotRequest?.(request=>{
        const requestId=String(request?.requestId||'');
        if(!requestId)return;
        let snapshot=null;
        try{snapshot=buildSnapshotPayload(true);roleTransitionSnapshotTaken=true;}catch(err){console.warn('[DKDS plugin window role snapshot]',err);}
        window.electronAPI?.respondActivityRoleSnapshot?.({requestId,snapshot});
      });
      window.electronAPI?.onActivityWillShow?.(() => {
        void Promise.resolve(window.DKDSUI?.lifecycle?.('visible',{reason:'top-window-show'})).catch(err=>console.warn('[DKDS plugin window UI resume]',err)).finally(()=>{
          requestAnimationFrame(() => {
            window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show'});
            requestAnimationFrame(() => window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window-show-settled'}));
          });
        });
      });

      window.addEventListener('resize', () => {
        if (ready) window.DKDSPlugins?.events?.emit?.('layout:resize',{reason:'window'});
      });
      window.addEventListener('beforeunload', () => {
        pushSnapshot(true);
        window.DKDSPerformance?.clear?.();
      });

      await loadTargetPlugin();
    } catch (err) {
      console.error('[DKDS plugin window startup]', err);
      showStartupError(err);
      startupProfile.totalMs=roundMs(performance.now()-startupStartedAt);
      startupProfile.pluginId=String(bootstrap?.pluginWindow?.pluginId||'');
      startupProfile.activityId=String(bootstrap?.activityId||'');
      startupProfile.dependencyCount=startupProfile.dependencies.length;
      startupProfile.scriptCount=startupProfile.scripts.length;
      startupProfile.chartRuntime=window.DKDSCharts?.runtimeState?.()||null;
      window.electronAPI?.markActivityWindowFailed?.({
        activityId:String(bootstrap?.activityId||''),
        pluginId:String(bootstrap?.pluginWindow?.pluginId||''),
        error:err?.stack||err?.message||String(err||'插件独立窗口启动失败。'),
        startupProfile
      });
    }
  }

  start();
})();
