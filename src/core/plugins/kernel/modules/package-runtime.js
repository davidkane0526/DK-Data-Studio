'use strict';
const {state, definitions, active, disabled, registries, externalPackages, overridePackages, overrideLoadErrors, externalLoadErrors, builtinLoadErrors}=require('./context');
const {preferenceStorageKey, prewarmPreferenceStorageKey, superPreferenceStorageKey, API_VERSION, readPreferences, preferenceFor, isDefinitionEnabled, setPreference, clearPreference, clearPrewarmPreference, definitionById, topWorkspaceRows, superState, readSuperPreference, isSuperEligibleDefinition}=require('./bootstrap');
const {setSuperPlugin, initializeSuperSelection}=require('./workspace/top');
const {assertId}=require('./registry');
const {eventOn,eventEmit,activityRows,activePluginId,invokeEditAction,supportsEditAction,editActionAvailable,editHistoryState,notifyEditHistory}=require('./events/history');
const {renderActivityBar, refreshActivityVisibility, setActiveActivity, chooseFallbackActivity}=require('./activity/shell');
const {bindShellOnce}=require('./shortcuts/menu');
const {runCommand}=require('./commands/toolbar');
const {listContributions, listProvidersWithCapabilities}=require('./contributions/typed');
const {serializeProject, restoreProject, resetProjectSlices}=require('./project/status');
const {restorePluginProjectState, activateDefinition, deactivate, pluginTypeForManifest, pluginStateRow, listPluginStates, setPluginEnabled, setPluginPrewarm, reloadPlugin, resetPluginPreferences}=require('./lifecycle');
const {pluginHostView,resetPluginHostView}=require('./host-facade');
const {addStyle}=require('./pages/panels');


  function activePresentationPlatform(){
    const declared=String(document.documentElement?.dataset?.dkdsHost||globalThis.__DKDS_HOST_KIND__||'').trim().toLowerCase();
    return declared==='mobile'?'mobile':'desktop';
  }
  function presentationAssets(manifest={}){
    const platform=activePresentationPlatform();
    const contract=globalThis.DKDSPlatformPresentationContract;
    if(!contract?.assetsFor)throw new Error('DKDSPlatformPresentationContract is unavailable.');
    return contract.assetsFor(manifest,platform);
  }
  function platformRows(row={},field,platform){
    const group=row?.[field];
    if(!group||typeof group!=='object'||Array.isArray(group))return [];
    const rows=group[platform];
    return Array.isArray(rows)?rows:[];
  }


  function removeDefinition(id){
    const index=definitions.findIndex(d=>d.manifest.id===id);
    if(index>=0)definitions.splice(index,1);
    disabled.delete(id);
  }

  const activationOrder=()=>definitions.slice().sort((a,b)=>(a.manifest.order||100)-(b.manifest.order||100));
  let deferredBuiltinRows=[];
  let builtinOverrideById=new Map();
  let builtinOverrideErrorById=new Map();
  let deferredEntryLoadPromise=null;
  let startupNeedsExternalSuper=false;
  let startupNeedsExternalTheme=false;
  let startupPreferredSuperId='';
  const builtinRowOrder=row=>Number(row?.manifest?.order)||100;
  const builtinRowType=row=>String(row?.manifest?.pluginType||'').trim().toLowerCase();
  function preferredThemePluginId(){
    try{
      const profile=String(globalThis.localStorage?.getItem?.('dkds.theme-profile.v1')||'').trim();
      if(!profile||profile==='builtin.default')return '';
      const marker=profile.lastIndexOf(':');
      return marker>0?profile.slice(0,marker):profile;
    }catch{return '';}
  }
  function builtinStartupCriticalIds(rows=[]){
    const byId=new Map(rows.map(row=>[String(row?.id||row?.manifest?.id||''),row]).filter(([id])=>id));
    const saved=String(readSuperPreference?.()||'').trim();
    const defaultSuper=[...rows].filter(row=>row?.manifest?.workspace?.defaultSuper===true)
      .sort((a,b)=>builtinRowOrder(a)-builtinRowOrder(b))[0];
    const defaultSuperId=String(defaultSuper?.id||defaultSuper?.manifest?.id||'');
    const superId=saved?(byId.has(saved)?saved:''):defaultSuperId;
    startupPreferredSuperId=saved||defaultSuperId;
    startupNeedsExternalSuper=!!saved&&!byId.has(saved);
    const ids=new Set(),themeId=preferredThemePluginId();
    startupNeedsExternalTheme=!!themeId&&!byId.has(themeId);
    for(const row of rows){
      const m=row?.manifest||{},id=String(row?.id||m.id||''),type=builtinRowType(row);
      if(!id||m.enabled===false)continue;
      if(m.systemCritical===true||type==='algorithm'||type==='theme'||id===themeId||id===superId||id==='builtin.scientific-data-contracts')ids.add(id);
    }
    const visit=id=>{const row=byId.get(id);for(const dep of row?.manifest?.pluginDependencies||[]){const depId=String(dep?.id||'').trim();if(depId&&byId.has(depId)&&!ids.has(depId)){ids.add(depId);visit(depId);}}};
    for(const id of [...ids])visit(id);
    return ids;
  }
  function startupRowId(row){return String(row?.id||row?.manifest?.id||'').trim();}
  function startupRowRank(row){
    const id=startupRowId(row),manifest=row?.manifest||{},type=builtinRowType(row),themeId=preferredThemePluginId();
    if(id&&id===themeId)return 10;
    if(manifest.systemCritical===true||type==='foundation')return 20;
    if(id==='builtin.scientific-data-contracts')return 25;
    if(type==='algorithm')return 30;
    if(id&&id===startupPreferredSuperId)return 50;
    return 35;
  }
  function startupLoadOrder(rows,critical){
    const selected=rows.filter(row=>critical.has(startupRowId(row))),byId=new Map(selected.map(row=>[startupRowId(row),row])),pending=new Set(byId.keys()),out=[];
    const compare=(a,b)=>startupRowRank(a)-startupRowRank(b)||builtinRowOrder(a)-builtinRowOrder(b)||startupRowId(a).localeCompare(startupRowId(b));
    while(pending.size){
      const ready=[...pending].map(id=>byId.get(id)).filter(row=>(row?.manifest?.pluginDependencies||[]).every(dep=>!pending.has(String(dep?.id||'').trim()))).sort(compare);
      const row=ready[0]||[...pending].map(id=>byId.get(id)).sort(compare)[0];
      pending.delete(startupRowId(row));out.push(row);
    }
    return out;
  }
  function startupThemeRows(rows=[]){
    const themeId=preferredThemePluginId();if(!themeId)return [];
    const byId=new Map(rows.map(row=>[startupRowId(row),row]).filter(([id])=>id)),ids=new Set();
    const visit=id=>{const row=byId.get(id);if(!row||ids.has(id))return;for(const dep of row?.manifest?.pluginDependencies||[])visit(String(dep?.id||'').trim());ids.add(id);};
    visit(themeId);return rows.filter(row=>ids.has(startupRowId(row)));
  }
  async function activateStartupRows(rows=[]){
    for(const row of rows){const def=definitionById(startupRowId(row));if(def&&isDefinitionEnabled(def)&&!active.has(def.manifest.id))await activateDefinition(def,{restoreCurrentProject:false});}
  }
  function startupSuperId(){
    const saved=String(readSuperPreference?.()||'').trim();
    if(saved){const row=definitionById(saved);if(row&&isDefinitionEnabled(row)&&isSuperEligibleDefinition(row))return saved;}
    return activationOrder().filter(def=>isDefinitionEnabled(def)&&isSuperEligibleDefinition(def))
      .sort((a,b)=>Number(b.manifest?.workspace?.defaultSuper===true)-Number(a.manifest?.workspace?.defaultSuper===true)||(Number(a.manifest?.order)||100)-(Number(b.manifest?.order)||100))[0]?.manifest?.id||'';
  }
  function startupCriticalIds(){
    const ids=new Set(),superId=startupSuperId(),themeId=preferredThemePluginId();
    for(const def of activationOrder()){
      if(!isDefinitionEnabled(def))continue;
      const m=def.manifest||{},type=pluginTypeForManifest(m);
      if(m.systemCritical===true||type==='algorithm'||type==='theme'||m.id===themeId||m.id===superId||m.id==='builtin.scientific-data-contracts')ids.add(m.id);
    }
    const visit=id=>{const def=definitionById(id);for(const dep of def?.manifest?.pluginDependencies||[]){const depId=String(dep?.id||'').trim();if(depId&&!ids.has(depId)){ids.add(depId);visit(depId);}}};
    for(const id of [...ids])visit(id);
    return ids;
  }
  // Background plugin completion must not depend on Chromium ever becoming
  // idle.  Theme animation, ResizeObserver work and a continuously active
  // renderer can legitimately starve requestIdleCallback for long enough that
  // the main registry remains at its first-paint subset.  Keep the first-paint
  // yield, but pair it with an independent watchdog.  The callback is guarded
  // so only one path can run it.
  const scheduleAfterFirstPaint=fn=>{
    const frame=globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,16));
    const idle=globalThis.requestIdleCallback;
    let started=false;
    const run=()=>{if(started)return;started=true;void Promise.resolve().then(fn);};
    frame(()=>{
      setTimeout(run,0);
      if(typeof idle==='function')idle(run,{timeout:180});
    });
    setTimeout(run,320);
  };
  function generatedBuiltinRows(){
    return Array.isArray(window.DKDS_BUILTIN_PLUGINS)?window.DKDS_BUILTIN_PLUGINS:[];
  }
  function missingBuiltinCatalogRows(){
    const registered=new Set(definitions.filter(def=>String(def?.packageSource||'builtin')==='builtin').map(def=>String(def?.manifest?.id||'')).filter(Boolean));
    return generatedBuiltinRows().filter(row=>{const id=startupRowId(row);return id&&!registered.has(id);});
  }
  function uniqueBuiltinRows(rows=[]){
    const out=[],seen=new Set();
    for(const row of rows){const id=startupRowId(row);if(!id||seen.has(id))continue;seen.add(id);out.push(row);}
    return out;
  }
  let deferredActivationPromise=null;
  async function completeDeferredPlugins({includeExternal=true,reason='runtime'}={}){
    if(deferredActivationPromise)return deferredActivationPromise;
    // Reconcile against the generated current catalog itself, not only the
    // mutable deferred queue. A renderer may consume/clear that queue while a
    // script silently fails to register its definition; the catalog remains
    // the authoritative first-party inventory and must make the gap repairable.
    const catalogMissing=missingBuiltinCatalogRows();
    const hasDeferred=deferredBuiltinRows.length>0||catalogMissing.length>0||activationOrder().some(def=>isDefinitionEnabled(def)&&!active.has(def.manifest.id));
    const externalPending=includeExternal&&!state.externalLoadingPromise;
    if(!hasDeferred&&!externalPending){
      eventEmit('plugins:ready',{active:[...active.keys()],deferred:false,reason});
      return [...active.keys()];
    }
    deferredActivationPromise=(async()=>{
      await loadDeferredEntries({includeExternal});
      for(const def of activationOrder()){
        if(!isDefinitionEnabled(def)||active.has(def.manifest.id))continue;
        await activateDefinition(def,{restoreCurrentProject:true});
      }
      const unresolved=missingBuiltinCatalogRows();
      // Never publish a partial first-party catalog as ready. A failed entry is
      // still visible through builtinLoadErrors and the manager refresh returns
      // an explicit failure instead of silently showing a four-plugin subset.
      if(unresolved.length){
        renderActivityBar();
        refreshActivityVisibility();
        eventEmit('plugin:manager-changed',{plugins:listPluginStates(),reason:'catalog-incomplete'});
        throw new Error(`Built-in plugin catalog incomplete: ${unresolved.map(row=>startupRowId(row)).filter(Boolean).join(', ')}`);
      }
      // Deferred workbenches, tools and Theme providers all contribute to the
      // same canonical activity/presentation registries. Refresh those views
      // only after the registry is complete; no plugin id is special-cased.
      renderActivityBar();
      refreshActivityVisibility();
      eventEmit('plugins:ready',{active:[...active.keys()],deferred:false,reason});
      eventEmit('plugin:manager-changed',{plugins:listPluginStates(),reason});
      return [...active.keys()];
    })().finally(()=>{deferredActivationPromise=null;});
    return deferredActivationPromise;
  }
  async function activateStartup(){
    if(state.host?.isAuxiliaryWindow)return window.DKDSPlugins.activateAll();
    const ordered=activationOrder(),critical=startupCriticalIds();
    for(const def of ordered){
      if(!isDefinitionEnabled(def)||active.has(def.manifest.id))continue;
      if(critical.has(def.manifest.id))await activateDefinition(def,{restoreCurrentProject:false});
    }
    const preferredId=startupPreferredSuperId||String(readSuperPreference?.()||'').trim()||startupSuperId();
    // SUPER identity is deterministic. If the selected/default SUPER does not
    // finish loading, keep that identity selected and show the neutral empty
    // host. Never guess another healthy TOP for the session: changing the main
    // workspace behind the user's back makes startup state unpredictable and
    // can hide the real plugin fault.
    await initializeSuperSelection({preferredId,persistFallback:true});
    const pendingIds=[...deferredBuiltinRows.map(row=>String(row?.id||row?.manifest?.id||'')).filter(Boolean),...ordered.filter(def=>isDefinitionEnabled(def)&&!active.has(def.manifest.id)).map(def=>def.manifest.id)];
    eventEmit('plugins:startup-ready',{active:[...active.keys()],deferred:[...new Set(pendingIds)]});
    eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    if(deferredBuiltinRows.length||ordered.some(def=>isDefinitionEnabled(def)&&!active.has(def.manifest.id))||!state.externalLoadingPromise){
      scheduleAfterFirstPaint(()=>completeDeferredPlugins({includeExternal:true,reason:'post-first-paint'}));
    }else{
      eventEmit('plugins:ready',{active:[...active.keys()],deferred:false,reason:'startup-complete'});
    }
    return [...active.keys()];
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

  function applyPackagedManifest(id,manifest={},source='external'){
    const pluginId=String(id||manifest?.id||'').trim();
    assertId(pluginId);
    if(manifest?.id&&String(manifest.id)!==pluginId)throw new Error(`Plugin package manifest id mismatch: ${manifest.id} != ${pluginId}`);
    const definition=definitionById(pluginId);
    if(!definition)throw new Error(`Plugin package did not register manifest id: ${pluginId}`);
    // plugin.json/.dkplugin manifest is the machine-readable source of truth.
    // Runtime entry files may keep a compact manifest for direct authoring, but
    // dedicated windows and the owner renderer must resolve the exact same
    // metadata before contract validation/activation.
    const contractManifest={...definition.manifest,...manifest};
    const contractCheck=window.DKDSPluginContract?.validateManifest?.(contractManifest);
    if(contractCheck&&!contractCheck.ok)throw new Error(`Plugin ${pluginId}: ${contractCheck.errors.join(' ')}`);
    definition.manifest={...contractManifest};
    definition.packageSource=String(source||'external');
    pluginTypeForManifest(definition.manifest);
    return definition;
  }

  async function loadPackagedPlugin(pkg,source='external'){
    const manifest=pkg?.manifest||{};
    assertId(manifest.id);
    if(definitionById(manifest.id))throw new Error(`Plugin id already loaded: ${manifest.id}`);
    const beforeIds=new Set(definitions.map(d=>d.manifest.id));
    try{
      const assets=presentationAssets(manifest);
      const sharedScripts=manifest.scripts?.length?manifest.scripts:[manifest.entry];
      for(const file of [...sharedScripts,...(assets.platformScripts||[])]){
        const source=pkg?.files?.[file];
        if(typeof source!=='string')throw new Error(`External plugin script missing: ${file}`);
        await loadInlinePluginScript(source,`${manifest.id}/${file}`);
      }
      const created=definitions.filter(d=>!beforeIds.has(d.manifest.id));
      const unexpected=created.filter(d=>d.manifest.id!==manifest.id);
      if(unexpected.length)throw new Error(`Plugin package ${manifest.id} registered unexpected ids: ${unexpected.map(d=>d.manifest.id).join(', ')}`);
      const definition=applyPackagedManifest(manifest.id,manifest,source);

      const sharedStyleFiles=Array.isArray(manifest.styles)?manifest.styles:[];
      const platformStyleFiles=Array.isArray(assets.platformStyles)?assets.platformStyles:[];
      if(sharedStyleFiles.length||platformStyleFiles.length){
        const originalActivate=definition.activate;
        definition.activate=async api=>{
          for(let i=0;i<sharedStyleFiles.length;i++){
            const file=sharedStyleFiles[i];
            const css=pkg?.files?.[file];
            if(typeof css!=='string')throw new Error(`External plugin stylesheet missing: ${file}`);
            api.ui.styles.add(`package-style-${i}`,css);
          }
          for(let i=0;i<platformStyleFiles.length;i++){
            const file=platformStyleFiles[i];
            const css=pkg?.files?.[file];
            if(typeof css!=='string')throw new Error(`External plugin platform stylesheet missing: ${file}`);
            addStyle(manifest.id,`package-platform-style-${i}`,css,{layer:'dkds.plugin-platform'});
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
    if(state.externalLoadingPromise)return state.externalLoadingPromise;
    state.externalLoadingPromise=(async()=>{
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
    return state.externalLoadingPromise;
  }

  async function replaceExternalPluginPackage(pkg,{statusPrefix='已安装插件'}={}){
    if(!pkg?.manifest?.id)throw new Error('插件包缺少 manifest.id。');
    const id=pkg.manifest.id;const existing=definitionById(id);
    const oldPackage=externalPackages.get(id)||pkg.previousPackage||null;
    const oldEnabled=existing?isDefinitionEnabled(existing):null;const oldPreference=preferenceFor(id);
    try{
      if(existing){if(existing.packageSource!=='external')throw new Error(`不能覆盖内置插件：${id}`);await deactivate(id,{captureProject:true});removeDefinition(id);externalPackages.delete(id);}
      const definition=await loadExternalPackage(pkg);
      if(isDefinitionEnabled(definition)){await activateDefinition(definition,{restoreCurrentProject:true});if(!active.has(id))throw new Error(disabled.get(id)||`Plugin ${id} failed to activate.`);}
      chooseFallbackActivity();eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
      state.host?.setStatus?.(`${statusPrefix} ${definition.manifest.name||id} v${definition.manifest.version||'?'}`);
      return pluginStateRow(definition);
    }catch(err){
      let rollbackError=null;
      try{removeDefinition(id);externalPackages.delete(id);disabled.delete(id);if(oldPackage){await window.electronAPI?.pluginRestorePackage?.({id,package:oldPackage});const restored=await loadExternalPackage(oldPackage);if(oldPreference===undefined)clearPreference(id);else setPreference(id,oldPreference);const shouldEnable=oldEnabled===null?isDefinitionEnabled(restored):oldEnabled;if(shouldEnable)await activateDefinition(restored,{restoreCurrentProject:true});}else{await window.electronAPI?.pluginRestorePackage?.({id,package:null});clearPreference(id);}chooseFallbackActivity();eventEmit('plugin:manager-changed',{plugins:listPluginStates()});}
      catch(rollbackFailure){rollbackError=rollbackFailure;console.error('[DKDS external plugin rollback]',rollbackFailure);externalLoadErrors.push({file:id,error:`安装失败且回滚失败：${rollbackFailure.message}`});}
      if(rollbackError){const combined=new Error(`${err?.message||err}；自动回滚失败：${rollbackError?.message||rollbackError}`);combined.dkdsDialog={tone:'error',title:'插件加载失败且自动回滚失败',message:`插件 ${id} 未能完成加载，且宿主无法自动恢复安装前状态。`,meta:[{label:'插件 ID',value:id}],detail:`加载错误：${err?.stack||err}

回滚错误：${rollbackError?.stack||rollbackError}`,detailLabel:'技术详情',detailOpen:true};throw combined;}
      throw err;
    }
  }
  function stagedOverrideState(pkg,statusPrefix='内置插件更新已安装'){
    const id=String(pkg?.manifest?.id||''),definition=definitionById(id),version=String(pkg?.manifest?.version||'?');
    state.host?.setStatus?.(`${statusPrefix} ${pkg?.manifest?.name||id} v${version}；重启 DK Data Studio 后启用。`);
    const current=definition?pluginStateRow(definition):{id,name:pkg?.manifest?.name||id,version:'',pluginType:pkg?.manifest?.pluginType||'extension',source:'builtin'};
    return {...current,pendingVersion:version,installationKind:'override',requiresRestart:true};
  }

  function pluginInstallRendererError(payload,fallback='插件安装失败。'){
    const row=payload&&typeof payload==='object'?payload:{message:String(payload||fallback)},error=new Error(String(row.message||fallback)),plugin=row.plugin||null,versionContext=row.versionContext||null;
    error.dkdsDialog={tone:'error',title:String(row.title||'插件安装失败'),message:String(row.message||fallback),meta:[plugin?.name?{label:'插件',value:`${plugin.name}${plugin.version?` v${plugin.version}`:''}`}:null,plugin?.id?{label:'插件 ID',value:plugin.id}:null,versionContext?.currentVersion?{label:'当前有效版本',value:versionContext.currentVersion}:null,versionContext?.bundledVersion?{label:'内置基线版本',value:versionContext.bundledVersion}:null].filter(Boolean),detail:String(row.code||''),detailLabel:'技术详情'};return error;
  }
  async function installExternalPlugin(){
    if(!window.electronAPI?.pluginSelectPackage||!window.electronAPI?.pluginInstallPackage||window.electronAPI?.isWebClient)throw new Error('当前运行环境不支持安装可执行插件。');
    const selection=await window.electronAPI.pluginSelectPackage();
    if(selection?.canceled)return null;
    if(!selection?.ok)throw pluginInstallRendererError(selection?.error);
    const manifest=selection.manifest||{},isBundledUpdate=selection.installationKind==='override',isUpdate=selection.exists===true;
    const dialogs=window.DKDSUI?.dialogs;if(!dialogs?.confirm)throw new Error('Core Dialog Runtime 未就绪，无法安全确认插件安装。');
    const confirmed=await dialogs.confirm({
      tone:'warning',title:isBundledUpdate?'更新内置插件':isUpdate?'更新插件':'安装插件',subtitle:isBundledUpdate?'保留发行版基线，通过版本化 Override 更新':isUpdate?'将替换当前已安装版本':'本地可执行扩展',
      message:isBundledUpdate?'该包将作为内置插件的本地更新层安装，不修改应用安装目录。重启后新版本生效；可随时在插件管理器恢复发行版内置版本。':'插件包含可执行 JavaScript，并可访问其声明的 DKDS 能力和工作区数据。请仅安装你信任或已经审查过的插件包。',
      meta:[
        {label:'插件',value:`${manifest.name||manifest.id||'未命名'} v${manifest.version||'?'}`},
        {label:'插件 ID',value:manifest.id||''},
        {label:'类型',value:manifest.pluginType||'extension'},
        {label:'Plugin API',value:manifest.apiVersion||''},
        isUpdate&&selection.previousVersion?{label:'当前有效版本',value:selection.previousVersion}:null,
        isBundledUpdate&&selection.bundledVersion?{label:'发行版内置基线',value:selection.bundledVersion}:null
      ].filter(Boolean),
      cancelLabel:'取消',confirmLabel:isBundledUpdate?'安装更新':isUpdate?'更新插件':'安装插件'
    });
    if(!confirmed){await window.electronAPI?.pluginCancelInstall?.(selection.token);return null;}
    const committed=await window.electronAPI.pluginInstallPackage(selection.token);
    if(!committed?.ok)throw pluginInstallRendererError(committed?.error);
    const pkg=committed.package;if(!pkg)return null;
    if(committed.requiresRestart||pkg.requiresRestart||committed.installationKind==='override'||pkg.installationKind==='override')return stagedOverrideState(pkg,'内置插件更新已安装');
    return replaceExternalPluginPackage(pkg,{statusPrefix:isUpdate?'已更新插件':'已安装插件'});
  }

  async function validateGeneratedPluginPackage(pkg){
    if(!window.electronAPI?.pluginValidateGeneratedPackage)throw new Error('当前运行环境不支持生成插件校验。');
    const result=await window.electronAPI.pluginValidateGeneratedPackage(pkg);
    if(!result?.ok)throw pluginInstallRendererError(result?.error,'生成插件包校验失败。');
    return result;
  }
  async function installGeneratedPluginPackage(pkg,{enable=true}={}){
    if(!window.electronAPI?.pluginInstallGeneratedPackage)throw new Error('当前运行环境不支持安装生成插件。');
    const validated=await validateGeneratedPluginPackage(pkg);
    const committed=await window.electronAPI.pluginInstallGeneratedPackage({package:validated.package||pkg,source:'studio-kernel'});
    if(!committed?.ok)throw pluginInstallRendererError(committed?.error,'生成插件安装失败。');
    const installedPackage=committed.package;
    if(committed.requiresRestart||installedPackage?.requiresRestart||committed.installationKind==='override'||installedPackage?.installationKind==='override')return stagedOverrideState(installedPackage,'内置插件生成更新已安装');
    const installedState=await replaceExternalPluginPackage(installedPackage,{statusPrefix:'已安装生成插件'});
    if(enable===false&&installedState?.id)await setPluginEnabled(installedState.id,false);
    return installedState;
  }

  async function uninstallExternalPlugin(id){
    const definition=definitionById(id);
    if(!definition)throw new Error(`Plugin not found: ${id}`);
    const source=String(definition.packageSource||'builtin');
    if(source==='override'){
      await window.electronAPI?.pluginUninstall?.(id);
      state.host?.setStatus?.(`已移除 ${definition.manifest.name||id} 的本地更新层；重启后恢复发行版内置版本。`);
      return {ok:true,id,restoredBundled:true,requiresRestart:true};
    }
    if(source!=='external')throw new Error('发行版内置基线不能卸载；安装同 ID 的更高版本 .dkplugin 可更新它。');
    if(id===state.superPluginId)throw new Error('当前 SUPER 主界面不能直接卸载。请先将另一个 TOP 插件设为主界面。');
    await deactivate(id,{captureProject:true});
    removeDefinition(id);externalPackages.delete(id);clearPreference(id);
    await window.electronAPI?.pluginUninstall?.(id);chooseFallbackActivity();eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    state.host?.setStatus?.(`已卸载插件 ${definition.manifest.name||id}；工程中的插件命名空间数据仍会保留。`);
    return {ok:true,id,requiresRestart:false};
  }

  function pluginScriptUrl(src,{retry=0}={}) {
    const raw=String(src||'');
    try{
      const url=new URL(raw,document.baseURI);
      if(retry>0)url.searchParams.set('dkds_retry',`${retry}-${Date.now()}`);
      return url.href;
    }catch{return raw;}
  }
  function loadScriptOnce(src,{retry=0}={}) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = pluginScriptUrl(src,{retry});
      script.async = false;
      script.dataset.dkdsPluginEntry = src;
      script.onload = () => resolve(src);
      script.onerror = () => {script.remove?.();reject(new Error(`Failed to load plugin entry: ${src}`));};
      document.head.appendChild(script);
    });
  }
  async function loadScript(src) {
    let firstError=null;
    for(const [retry,delay] of [[0,0],[1,60],[2,180]]){
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      try{return await loadScriptOnce(src,{retry});}
      catch(err){if(!firstError)firstError=err;}
    }
    const builtinPath=String(src||'').replace(/\\/g,'/').replace(/^\.\//,'');
    if(/^plugins\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.js$/.test(builtinPath)&&window.electronAPI?.pluginReadBuiltinScript){
      try{
        const payload=await window.electronAPI.pluginReadBuiltinScript(builtinPath);
        if(typeof payload?.text==='string')return await loadInlinePluginScript(payload.text,`builtin/${builtinPath}`);
      }catch(err){console.error('[DKDS built-in plugin source fallback]',builtinPath,err);}
    }
    throw firstError||new Error(`Failed to load plugin entry: ${src}`);
  }

  async function loadBuiltinRow(row){
    const id=String(row?.id||'');
    const overrideError=id?builtinOverrideErrorById.get(id):null;
    if(overrideError)throw new Error(`Installed override failed current-contract validation for ${id}: ${overrideError.error}`);
    const override=id?builtinOverrideById.get(id):null;
    if(override){
      try{await loadOverridePackage(override);return;}
      catch(err){
        overrideLoadErrors.push({file:id,error:err.message});
        throw new Error(`Installed override failed current-contract load for ${id}: ${err?.message||err}`);
      }
    }
    const platform=activePresentationPlatform();
    const scripts=Array.isArray(row?.scripts)&&row.scripts.length?row.scripts:[row.entry];
    const selectedPlatformScripts=platformRows(row,'platformScripts',platform);
    for(const script of [...scripts,...selectedPlatformScripts])await loadScript(script);
    let definition=id?definitionById(id):null;
    // A local <script> can report load completion without leaving the expected
    // registration behind (the Windows 3.68.39 report exposed exactly that
    // invisible state). Retry the current entry from the application source via
    // the existing secure preload reader. This is the same current bundled code,
    // not a legacy package/manifest fallback.
    if(id&&!definition&&window.electronAPI?.pluginReadBuiltinScript){
      const entry=String(row?.entry||scripts[scripts.length-1]||'').replace(/\\/g,'/').replace(/^\.\//,'');
      if(/^plugins\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.js$/.test(entry)){
        const payload=await window.electronAPI.pluginReadBuiltinScript(entry);
        if(typeof payload?.text==='string')await loadInlinePluginScript(payload.text,`builtin-reconcile/${entry}`);
        definition=definitionById(id);
      }
    }
    if(id&&!definition)throw new Error(`Built-in plugin did not register current definition after entry load: ${id}`);
    if(definition&&row?.manifest&&typeof row.manifest==='object'){definition.manifest={...definition.manifest,...row.manifest};definition.packageSource=String(row?.source||'builtin');}
    const styleSources=Array.isArray(row?.styleSources)?row.styleSources:[];
    const platformStyleSources=platformRows(row,'platformStyleSources',platform);
    if(definition&&(styleSources.length||platformStyleSources.length)){
      const originalActivate=definition.activate;
      definition.activate=async api=>{
        for(let i=0;i<styleSources.length;i++){
          const source=styleSources[i];
          if(typeof source?.css!=='string')throw new Error(`Built-in plugin stylesheet missing: ${id}/${source?.file||i}`);
          api.ui.styles.add(`builtin-style-${i}`,source.css);
        }
        for(let i=0;i<platformStyleSources.length;i++){
          const source=platformStyleSources[i];
          if(typeof source?.css!=='string')throw new Error(`Built-in plugin platform stylesheet missing: ${id}/${source?.file||i}`);
          addStyle(id,`builtin-platform-style-${i}`,source.css,{layer:'dkds.plugin-platform'});
        }
        return await originalActivate(api);
      };
    }
  }

  async function loadBuiltinRowSafe(row,phase='startup'){
    const id=startupRowId(row)||String(row?.entry||'<unknown>');
    try{
      await loadBuiltinRow(row);
      if(id&&!definitionById(id))throw new Error(`Built-in entry completed without registering current definition: ${id}`);
      return true;
    }catch(err){
      removeDefinition(id);
      const error=String(err?.message||err);builtinLoadErrors.push({id,file:String(row?.entry||id),phase,error});
      console.error(`[DKDS built-in plugin load:${phase}:${id}]`,err);
      state.host?.setStatus?.(`插件 ${row?.manifest?.name||id} 脚本加载失败：${error}`);
      return false;
    }
  }
  async function loadBuiltinEntries(entries = window.DKDS_BUILTIN_PLUGIN_ENTRIES || [], options={}) {
    if (state.loadingPromise) return state.loadingPromise;
    state.loadingPromise = (async () => {
      const generated=Array.isArray(window.DKDS_BUILTIN_PLUGINS)&&window.DKDS_BUILTIN_PLUGINS.length
        ? window.DKDS_BUILTIN_PLUGINS
        : entries.map(src=>({id:'',entry:src}));
      let overrideResult={packages:[],errors:[]};
      if(window.electronAPI?.pluginOverrideList&&!window.electronAPI?.isWebClient){
        try{overrideResult=await window.electronAPI.pluginOverrideList()||overrideResult;}
        catch(err){overrideLoadErrors.push({file:'<override directory>',error:err.message});}
      }
      for(const row of overrideResult?.errors||[])overrideLoadErrors.push(row);
      builtinOverrideById=new Map((overrideResult?.packages||[]).map(pkg=>[String(pkg?.manifest?.id||''),pkg]));
      builtinOverrideErrorById=new Map((overrideResult?.errors||[]).map(row=>[String(row?.id||''),row]).filter(([id])=>id));
      const staged=options?.startupOnly===true&&!state.host?.isAuxiliaryWindow;
      if(staged){
        const critical=builtinStartupCriticalIds(generated),ordered=startupLoadOrder(generated,critical),themeRows=startupThemeRows(ordered),themeIds=new Set(themeRows.map(startupRowId));
        deferredBuiltinRows=generated.filter(row=>!critical.has(startupRowId(row)));
        // Theme is a Core visual dependency, not a consequence of SUPER startup.
        // Load and activate the persisted Theme provider (plus its dependencies)
        // before touching the selected SUPER. A broken workbench can therefore
        // never block Theme activation or cause a late visible Theme transition.
        for(const row of themeRows)await loadBuiltinRowSafe(row,'theme-bootstrap');
        await activateStartupRows(themeRows);
        for(const row of ordered)if(!themeIds.has(startupRowId(row)))await loadBuiltinRowSafe(row,'startup');
      }else{
        deferredBuiltinRows=[];
        for(const row of generated)await loadBuiltinRowSafe(row,'full');
      }
      return definitions.length;
    })();
    return state.loadingPromise;
  }

  async function loadDeferredEntries({includeExternal=true}={}){
    if(deferredEntryLoadPromise)return deferredEntryLoadPromise;
    deferredEntryLoadPromise=(async()=>{
      // The mutable queue is only a scheduling optimization. Always union it
      // with the authoritative generated catalog gap so Refresh/ensureReady can
      // recover a renderer that incorrectly ended up with 4/17 definitions.
      const rows=uniqueBuiltinRows([...deferredBuiltinRows.splice(0),...missingBuiltinCatalogRows()]);
      for(const row of rows)await loadBuiltinRowSafe(row,'deferred-reconcile');
      if(includeExternal)await loadExternalEntries();
      return {builtin:rows.map(row=>startupRowId(row)).filter(Boolean),external:[...externalPackages.keys()],missing:missingBuiltinCatalogRows().map(startupRowId)};
    })().finally(()=>{deferredEntryLoadPromise=null;});
    return deferredEntryLoadPromise;
  }

  function currentPluginSource(manifest={}){
    const script=document.currentScript||null;
    const tagged=String(script?.dataset?.dkdsPluginEntry||script?.dataset?.dkdsExternalPlugin||'').trim();
    if(tagged)return tagged.replace(/\\/g,'/');
    const src=String(script?.getAttribute?.('src')||script?.src||'').trim();
    if(src){try{const url=new URL(src,document.baseURI);return decodeURIComponent(url.pathname||src).replace(/^\/+/, '').replace(/\\/g,'/');}catch{return src.replace(/\\/g,'/');}}
    const id=String(manifest?.id||'plugin').trim(),entry=String(manifest?.entry||'').trim();return `plugin:${id}/${entry}`;
  }

  function startupStateSnapshot(){
    const catalogMissing=missingBuiltinCatalogRows().map(row=>startupRowId(row)).filter(Boolean);
    return Object.freeze({externalThemeRequired:startupNeedsExternalTheme,externalSuperRequired:startupNeedsExternalSuper,deferredPending:!!deferredActivationPromise||!!deferredEntryLoadPromise||deferredBuiltinRows.length>0||catalogMissing.length>0,deferredBuiltin:deferredBuiltinRows.map(row=>startupRowId(row)).filter(Boolean),catalogMissing,registeredBuiltinCount:generatedBuiltinRows().length-catalogMissing.length,generatedCatalogCount:generatedBuiltinRows().length,generatedCatalogVersion:String(window.DKDS_BUILTIN_PLUGIN_INDEX_META?.appVersion||''),generatedCatalogDigest:String(window.DKDS_BUILTIN_PLUGIN_INDEX_META?.catalogDigest||''),preferredSuper:startupPreferredSuperId,active:[...active.keys()],errors:Object.freeze(builtinLoadErrors.map(row=>Object.freeze({...row})))});
  }

  window.DKDSPlugins = {
    API_VERSION,
    get host(){ return pluginHostView(); },
    define(manifest, activate) {
      if (!manifest || typeof manifest !== 'object') throw new Error('Plugin manifest is required.');
      assertId(manifest.id);
      const contractCheck=window.DKDSPluginContract?.validateManifest?.(manifest);
      if(contractCheck&&!contractCheck.ok)throw new Error(`Plugin ${manifest.id}: ${contractCheck.errors.join(' ')}`);
      pluginTypeForManifest(manifest);
      if (definitions.some(d => d.manifest.id === manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
      if (typeof activate !== 'function') throw new Error(`Plugin ${manifest.id} must provide activate(api).`);
      definitions.push({ manifest: { apiVersion: API_VERSION, order: 100, ...manifest }, activate, packageSource:'builtin', sourceIdentity:currentPluginSource(manifest) });
    },
    configure(nextHost) {
      state.host = nextHost || {};resetPluginHostView();
      window.DKDSIO?.configure?.(state.host);window.DKDSServices?.configure?.(state.host?.services);bindShellOnce();
    },
    services: {
      registerRuntime:(owner,id,service,options)=>window.DKDSServices?.register?.(owner,id,service,options),
      get:id=>window.DKDSServices?.get?.(id)||null,
      list:()=>window.DKDSServices?.list?.()||[]
    },
    loadBuiltinEntries,
    loadDeferredEntries,
    loadExternalEntries,
    ensureReady:options=>completeDeferredPlugins(options||{}),
    startupRequiresExternal:()=>startupNeedsExternalSuper||startupNeedsExternalTheme,
    async activateAll() {
      for (const def of activationOrder()) {
        if (!isDefinitionEnabled(def)) continue;
        await activateDefinition(def, { restoreCurrentProject:false });
      }
      if(state.host?.isAuxiliaryWindow)chooseFallbackActivity();
      else await initializeSuperSelection();
      eventEmit('plugins:ready', { active: [...active.keys()] });
      eventEmit('plugin:manager-changed', { plugins:listPluginStates() });
      return [...active.keys()];
    },
    activateStartup,
    startupState:startupStateSnapshot,
    deactivate,
    external: {
      available:()=>!!window.electronAPI?.pluginSelectPackage&&!!window.electronAPI?.pluginInstallPackage&&!window.electronAPI?.isWebClient,
      folderAvailable:()=>!!window.electronAPI?.pluginOpenFolder&&!window.electronAPI?.isWebClient&&!window.electronAPI?.isNativeClient,
      install:installExternalPlugin,
      validatePackage:validateGeneratedPluginPackage,
      installPackage:installGeneratedPluginPackage,
      uninstall:uninstallExternalPlugin,
      algorithmCatalog:ref=>window.electronAPI?.pluginAlgorithmCatalog?.(ref)||Promise.resolve({requested:ref,count:0,candidates:[]}),
      openFolder:()=>window.electronAPI?.pluginOpenFolder?.(),
      export:id=>window.electronAPI?.pluginExportPackage?.(id),
      installed:()=>[...externalPackages.keys()],
      errors:()=>[...overrideLoadErrors.map(row=>({...row,source:'override'})),...externalLoadErrors.map(row=>({...row,source:'external'}))]
    },
    manager: {
      list:listPluginStates,
      refresh:options=>completeDeferredPlugins({includeExternal:true,reason:'plugin-manager-refresh',...(options||{})}),
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
      setSuper:id=>setSuperPlugin(id),
      super:()=>superState()
    },
    packageRuntime:Object.freeze({
      applyManifest:(id,manifest,source)=>applyPackagedManifest(id,manifest,source)
    }),
    activities: {
      list:()=>activityRows().map(x=>({...x.value,pluginId:x.pluginId,isSuper:x.pluginId===state.superPluginId,pluginType:pluginTypeForManifest(definitionById(x.pluginId)?.manifest||{})})),
      active:()=>state.activeActivityId,
      set:(id,options={})=>setActiveActivity(id,{
        invoke:options?.invoke!==false,
        forceEmbedded:options?.forceEmbedded===true||options?.presentation==='embedded'||options?.presentation==='mobile'
      }),
      activateEmbedded:(id,options={})=>setActiveActivity(id,{invoke:options?.invoke!==false,forceEmbedded:true}),
      refresh:()=>{renderActivityBar();refreshActivityVisibility();}
    },
    statusBar: {
      list:()=>listContributions('ui.statusItems').map(row=>({pluginId:row.pluginId,id:row.id,value:row.value?.value||{}})),
      invoke:(pluginId,id,event)=>{const row=listContributions('ui.statusItems').find(row=>row.pluginId===String(pluginId)&&row.id===String(id));return row?.value?.invoke?.(event)===true;}
    },
    workspace: {
      super:()=>superState(),
      setSuper:id=>setSuperPlugin(id),
      top:()=>topWorkspaceRows().map(row=>({...row.value,pluginId:row.pluginId})),
    },
    commands: { run: runCommand },
    edit: {
      invoke:(action,payload)=>invokeEditAction(action,payload),
      supports:action=>supportsEditAction(action),
      can:action=>editActionAvailable(action),
      history:()=>editHistoryState(),
      changed:(detail={})=>notifyEditHistory(activePluginId(),detail),
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
        startup:startupStateSnapshot(),
        builtins:{errors:builtinLoadErrors.slice()},
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

module.exports=Object.freeze({removeDefinition, loadInlinePluginScript, applyPackagedManifest, loadPackagedPlugin, loadExternalPackage, loadOverridePackage, loadExternalEntries, replaceExternalPluginPackage, pluginInstallRendererError, installExternalPlugin, validateGeneratedPluginPackage, installGeneratedPluginPackage, uninstallExternalPlugin, loadScript, loadBuiltinEntries});
