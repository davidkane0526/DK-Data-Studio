'use strict';
const {state, definitions, active, disabled, registries, externalPackages, overridePackages, overrideLoadErrors, externalLoadErrors}=require('./context');
const {preferenceStorageKey, prewarmPreferenceStorageKey, superPreferenceStorageKey, primePlacementStorageKey, API_VERSION, readPreferences, preferenceFor, isDefinitionEnabled, setPreference, clearPreference, clearPrewarmPreference, definitionById, topWorkspaceRows, superState, readSuperPreference, isSuperEligibleDefinition}=require('./bootstrap');
const {primePlacementFor, placePrimeContribution, setSuperPlugin, initializeSuperSelection}=require('./workspace/top');
const {assertId}=require('./registry');
const {eventOn,eventEmit,activityRows,activePluginId,invokeEditAction,supportsEditAction,editActionAvailable,editHistoryState,notifyEditHistory}=require('./events/history');
const {renderActivityBar, refreshActivityVisibility, setActiveActivity, chooseFallbackActivity}=require('./activity/shell');
const {bindShellOnce}=require('./shortcuts/menu');
const {runCommand}=require('./commands/toolbar');
const {listContributions, listProvidersWithCapabilities}=require('./contributions/typed');
const {serializeProject, restoreProject, resetProjectSlices}=require('./project/status');
const {restorePluginProjectState, activateDefinition, deactivate, pluginTypeForManifest, pluginStateRow, listPluginStates, setPluginEnabled, setPluginPrewarm, reloadPlugin, resetPluginPreferences}=require('./lifecycle');


  function removeDefinition(id){
    const index=definitions.findIndex(d=>d.manifest.id===id);
    if(index>=0)definitions.splice(index,1);
    disabled.delete(id);
  }

  const activationOrder=()=>definitions.slice().sort((a,b)=>(a.manifest.order||100)-(b.manifest.order||100));
  let deferredBuiltinRows=[];
  let builtinOverrideById=new Map();
  let deferredEntryLoadPromise=null;
  let startupNeedsExternalSuper=false;
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
    const superId=(saved&&byId.has(saved)?saved:String(defaultSuper?.id||defaultSuper?.manifest?.id||''));
    startupNeedsExternalSuper=!!saved&&!byId.has(saved);
    const ids=new Set(),themeId=preferredThemePluginId();
    for(const row of rows){
      const m=row?.manifest||{},id=String(row?.id||m.id||''),type=builtinRowType(row);
      if(!id||m.enabled===false)continue;
      if(m.systemCritical===true||type==='algorithm'||id===themeId||id===superId||id==='builtin.scientific-data-contracts')ids.add(id);
    }
    const visit=id=>{const row=byId.get(id);for(const dep of row?.manifest?.pluginDependencies||[]){const depId=String(dep?.id||'').trim();if(depId&&byId.has(depId)&&!ids.has(depId)){ids.add(depId);visit(depId);}}};
    for(const id of [...ids])visit(id);
    return ids;
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
      if(m.systemCritical===true||type==='algorithm'||m.id===themeId||m.id===superId||m.id==='builtin.scientific-data-contracts')ids.add(m.id);
    }
    const visit=id=>{const def=definitionById(id);for(const dep of def?.manifest?.pluginDependencies||[]){const depId=String(dep?.id||'').trim();if(depId&&!ids.has(depId)){ids.add(depId);visit(depId);}}};
    for(const id of [...ids])visit(id);
    return ids;
  }
  const scheduleAfterFirstPaint=fn=>{
    const idle=globalThis.requestIdleCallback||((cb)=>setTimeout(()=>cb({didTimeout:true,timeRemaining:()=>0}),0));
    const frame=globalThis.requestAnimationFrame||((cb)=>setTimeout(cb,16));
    frame(()=>idle(fn,{timeout:120}));
  };
  let deferredActivationPromise=null;
  async function activateStartup(){
    if(state.host?.isAuxiliaryWindow)return window.DKDSPlugins.activateAll();
    const ordered=activationOrder(),critical=startupCriticalIds();
    for(const def of ordered){
      if(!isDefinitionEnabled(def)||active.has(def.manifest.id))continue;
      if(critical.has(def.manifest.id))await activateDefinition(def,{restoreCurrentProject:false});
    }
    await initializeSuperSelection();
    const pendingIds=[...deferredBuiltinRows.map(row=>String(row?.id||row?.manifest?.id||'')).filter(Boolean),...ordered.filter(def=>isDefinitionEnabled(def)&&!active.has(def.manifest.id)).map(def=>def.manifest.id)];
    eventEmit('plugins:startup-ready',{active:[...active.keys()],deferred:[...new Set(pendingIds)]});
    eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
    if((deferredBuiltinRows.length||ordered.some(def=>isDefinitionEnabled(def)&&!active.has(def.manifest.id)))&&!deferredActivationPromise){
      deferredActivationPromise=new Promise(resolve=>scheduleAfterFirstPaint(async()=>{
        await window.DKDSPlugins.loadDeferredEntries?.({includeExternal:true});
        for(const def of activationOrder()){
          if(!isDefinitionEnabled(def)||active.has(def.manifest.id))continue;
          await activateDefinition(def,{restoreCurrentProject:true});
        }
        eventEmit('plugins:ready',{active:[...active.keys()],deferred:false});
        eventEmit('plugin:manager-changed',{plugins:listPluginStates()});
        resolve([...active.keys()]);
      })).finally(()=>{deferredActivationPromise=null;});
    }else if(!deferredBuiltinRows.length){
      eventEmit('plugins:ready',{active:[...active.keys()],deferred:false});
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
    definition.manifest={...definition.manifest,...manifest,source:String(source||definition.manifest?.source||'external')};
    const contractCheck=window.DKDSPluginContract?.validateManifest?.(definition.manifest);
    if(contractCheck&&!contractCheck.ok)throw new Error(`Plugin ${pluginId}: ${contractCheck.errors.join(' ')}`);
    pluginTypeForManifest(definition.manifest);
    return definition;
  }

  async function loadPackagedPlugin(pkg,source='external'){
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
      const definition=applyPackagedManifest(manifest.id,manifest,source);

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
        const packageId=String(pkg?.manifest?.id||'').trim();
        const packagedBuiltin=packageId?definitionById(packageId):null;
        if(packagedBuiltin?.manifest?.source==='builtin'){
          // The shipped built-in is the authoritative implementation for this id.
          // Ignore stale user-installed copies before API compatibility evaluation.
          continue;
        }
        try{if(pkg?.compatibilityStatus?.compatible===false)throw new Error(`插件与当前环境不兼容：${(pkg.compatibilityStatus.issues||[]).map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ')}`);const def=await loadExternalPackage(pkg);loaded.push(def.manifest.id);}
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
      if(existing){if(existing.manifest.source!=='external')throw new Error(`不能覆盖内置插件：${id}`);await deactivate(id,{captureProject:true});removeDefinition(id);externalPackages.delete(id);}
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

  async function rollbackExternalPlugin(id,token){
    if(!window.electronAPI?.pluginRollbackVersion||window.electronAPI?.isWebClient)throw new Error('当前运行环境不支持插件版本回退。');
    const pkg=await window.electronAPI.pluginRollbackVersion({id,token});if(!pkg)return null;
    if(pkg.requiresRestart||pkg.installationKind==='override')return stagedOverrideState(pkg,'内置插件历史版本已安装');
    return replaceExternalPluginPackage(pkg,{statusPrefix:'已回退插件'});
  }
  function pluginInstallRendererError(payload,fallback='插件安装失败。'){
    const row=payload&&typeof payload==='object'?payload:{message:String(payload||fallback)};
    const error=new Error(String(row.message||fallback));
    const compatibility=row.compatibility||null,plugin=row.plugin||null,versionContext=row.versionContext||null;
    const issueText=Array.isArray(compatibility?.issues)?compatibility.issues.map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required}（当前 ${issue.actual||'missing'}）`:`${issue.kind} ${issue.required}（当前 ${issue.actual||'unknown'}）`).join('\n'):'';
    error.dkdsDialog={
      tone:'error',title:String(row.title||'插件安装失败'),message:String(row.message||fallback),
      meta:[
        plugin?.name?{label:'插件',value:`${plugin.name}${plugin.version?` v${plugin.version}`:''}`} : null,
        plugin?.id?{label:'插件 ID',value:plugin.id}:null,
        compatibility?.requiredPluginApi?{label:'要求 Plugin API',value:compatibility.requiredPluginApi}:null,
        compatibility?.pluginApiVersion?{label:'当前 Plugin API',value:compatibility.pluginApiVersion}:null,
        compatibility?.requiredApp?{label:'要求应用版本',value:compatibility.requiredApp}:null,
        compatibility?.appVersion?{label:'当前应用版本',value:compatibility.appVersion}:null,
        versionContext?.currentVersion?{label:'当前有效版本',value:versionContext.currentVersion}:null,
        versionContext?.bundledVersion?{label:'内置基线版本',value:versionContext.bundledVersion}:null
      ].filter(Boolean),
      detail:issueText||String(row.code||''),detailLabel:'兼容性 / 技术详情'
    };
    return error;
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
        {label:'Plugin API',value:selection.compatibility?.requiredPluginApi||manifest.compatibility?.pluginApi||manifest.apiVersion||'*'},
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
    const source=String(definition.manifest.source||'');
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

  async function loadBuiltinRow(row){
    const id=String(row?.id||'');
    const override=id?builtinOverrideById.get(id):null;
    if(override){
      try{if(override?.compatibilityStatus?.compatible===false)throw new Error(`override 与当前环境不兼容：${(override.compatibilityStatus.issues||[]).map(issue=>issue.kind==='plugin-dependency'?`${issue.id} ${issue.required} (current ${issue.actual||'missing'})`:`${issue.kind} ${issue.required} (current ${issue.actual||'unknown'})`).join('; ')}`);await loadOverridePackage(override);return;}
      catch(err){overrideLoadErrors.push({file:id,error:err.message});console.error('[DKDS built-in plugin override fallback]',id,err);}
    }
    const scripts=Array.isArray(row?.scripts)&&row.scripts.length?row.scripts:[row.entry];
    for(const script of scripts)await loadScript(script);
    const definition=id?definitionById(id):null;
    if(definition&&row?.manifest&&typeof row.manifest==='object')definition.manifest={...definition.manifest,...row.manifest,source:'builtin'};
    const styleSources=Array.isArray(row?.styleSources)?row.styleSources:[];
    if(definition&&styleSources.length){
      const originalActivate=definition.activate;
      definition.activate=async api=>{
        for(let i=0;i<styleSources.length;i++){
          const source=styleSources[i];
          if(typeof source?.css!=='string')throw new Error(`Built-in plugin stylesheet missing: ${id}/${source?.file||i}`);
          api.ui.styles.add(`builtin-style-${i}`,source.css);
        }
        return await originalActivate(api);
      };
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
      const staged=options?.startupOnly===true&&!state.host?.isAuxiliaryWindow;
      if(staged){
        const critical=builtinStartupCriticalIds(generated);
        deferredBuiltinRows=generated.filter(row=>!critical.has(String(row?.id||row?.manifest?.id||'')));
        for(const row of generated.filter(row=>critical.has(String(row?.id||row?.manifest?.id||''))))await loadBuiltinRow(row);
      }else{
        deferredBuiltinRows=[];
        for(const row of generated)await loadBuiltinRow(row);
      }
      return definitions.length;
    })();
    return state.loadingPromise;
  }

  async function loadDeferredEntries({includeExternal=true}={}){
    if(deferredEntryLoadPromise)return deferredEntryLoadPromise;
    deferredEntryLoadPromise=(async()=>{
      const rows=deferredBuiltinRows.splice(0);
      for(const row of rows)await loadBuiltinRow(row);
      if(includeExternal)await loadExternalEntries();
      return {builtin:rows.map(row=>String(row?.id||row?.manifest?.id||'')).filter(Boolean),external:[...externalPackages.keys()]};
    })().finally(()=>{deferredEntryLoadPromise=null;});
    return deferredEntryLoadPromise;
  }

  window.DKDSPlugins = {
    API_VERSION,
    get host(){ return state.host; },
    define(manifest, activate) {
      if (!manifest || typeof manifest !== 'object') throw new Error('Plugin manifest is required.');
      assertId(manifest.id);
      const contractCheck=window.DKDSPluginContract?.validateManifest?.(manifest);
      if(contractCheck&&!contractCheck.ok)throw new Error(`Plugin ${manifest.id}: ${contractCheck.errors.join(' ')}`);
      pluginTypeForManifest(manifest);
      if (definitions.some(d => d.manifest.id === manifest.id)) throw new Error(`Duplicate plugin id: ${manifest.id}`);
      if (typeof activate !== 'function') throw new Error(`Plugin ${manifest.id} must provide activate(api).`);
      definitions.push({ manifest: { apiVersion: API_VERSION, order: 100, ...manifest }, activate });
    },
    configure(nextHost) { state.host = nextHost || {}; window.DKDSIO?.configure?.(state.host); window.DKDSServices?.configure?.(state.host?.services); bindShellOnce(); },
    services: {
      registerRuntime:(owner,id,service,options)=>window.DKDSServices?.register?.(owner,id,service,options),
      get:id=>window.DKDSServices?.get?.(id)||null,
      list:()=>window.DKDSServices?.list?.()||[]
    },
    loadBuiltinEntries,
    loadDeferredEntries,
    loadExternalEntries,
    startupRequiresExternal:()=>startupNeedsExternalSuper,
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
    startupState:()=>Object.freeze({deferredPending:!!deferredActivationPromise||!!deferredEntryLoadPromise||deferredBuiltinRows.length>0,deferredBuiltin:deferredBuiltinRows.map(row=>String(row?.id||row?.manifest?.id||'')).filter(Boolean),active:[...active.keys()]}),
    deactivate,
    external: {
      available:()=>!!window.electronAPI?.pluginSelectPackage&&!!window.electronAPI?.pluginInstallPackage&&!window.electronAPI?.isWebClient,
      install:installExternalPlugin,
      validatePackage:validateGeneratedPluginPackage,
      installPackage:installGeneratedPluginPackage,
      uninstall:uninstallExternalPlugin,
      history:id=>window.electronAPI?.pluginHistoryList?.(id)||Promise.resolve([]),
      algorithmCatalog:ref=>window.electronAPI?.pluginAlgorithmCatalog?.(ref)||Promise.resolve({requested:ref,count:0,candidates:[]}),
      rollback:rollbackExternalPlugin,
      openFolder:()=>window.electronAPI?.pluginOpenFolder?.(),
      export:id=>window.electronAPI?.pluginExportPackage?.(id),
      installed:()=>[...externalPackages.keys()],
      errors:()=>[...overrideLoadErrors.map(row=>({...row,source:'override'})),...externalLoadErrors.map(row=>({...row,source:'external'}))]
    },
    manager: {
      list:listPluginStates,
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
      primePlacementStorageKey,
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
      invoke:(pluginId,id)=>{const row=listContributions('ui.statusItems').find(row=>row.pluginId===String(pluginId)&&row.id===String(id));return row?.value?.invoke?.()===true;}
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

module.exports=Object.freeze({removeDefinition, loadInlinePluginScript, applyPackagedManifest, loadPackagedPlugin, loadExternalPackage, loadOverridePackage, loadExternalEntries, replaceExternalPluginPackage, rollbackExternalPlugin, pluginInstallRendererError, installExternalPlugin, validateGeneratedPluginPackage, installGeneratedPluginPackage, uninstallExternalPlugin, loadScript, loadBuiltinEntries});
