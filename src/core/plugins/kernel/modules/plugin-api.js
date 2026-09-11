'use strict';
const {state, active}=require('./context');
const {API_VERSION, isDefinitionEnabled, definitionById, defaultPluginIcon, workspaceMeta}=require('./bootstrap');
const {registerTopWorkspace}=require('./workspace/top');
const {getRegistry,addCleanup}=require('./registry');
const {eventOn,eventEmitNow,eventEmit,invokeEditAction,notifyEditHistory}=require('./events/history');
const {setActiveActivity}=require('./activity/shell');
const {registerActivity, addSidebarSection, addMainOverlay, addMainTool, addMenuItem}=require('./contributions/ui');
const {createToolbarButton, registerCommand, runCommand, commandGet, commandList, commandHistory, replayCommand, registerContribution}=require('./commands/toolbar');
const {registerTypedContribution, listContributions, registerProviderCapability, listProvidersWithCapabilities}=require('./contributions/typed');
const {addStatusBarItem, registerProjectSlice}=require('./project/status');
const {addStyle, addPage, addPanel, addPanelToggle}=require('./pages/panels');
const {deactivate, setPluginEnabled, reloadPlugin}=require('./lifecycle');
const {replaceExternalPluginPackage}=require('./package-runtime');
const {requirePluginType}=require('./manifest');
const {pluginHostView}=require('./host-facade');
  function createApi(definition) {
    const pluginId = definition.manifest.id;
    const componentSource=String(definition.sourceIdentity||definition.manifest?.entry||`plugin:${pluginId}/plugin.js`).trim();
    const pluginType=requirePluginType(definition.manifest);
    const projectDataVisibility=pluginType==='workbench'&&String(definition.manifest?.data?.visibility||'').trim().toLowerCase()==='project';
    const dataAssignmentsMatch=(artifact)=>{
      if(pluginType!=='workbench'||projectDataVisibility)return true;
      const raw=artifact?.metadata?.dataAssignments;
      if(!Array.isArray(raw))return true;
      const rows=raw.map(String);return rows.includes('*')||rows.includes(pluginId);
    };
    const sourceCapability=()=>{
      // data.sources has a synchronous read contract. In the owner renderer the
      // provider is local even though it is exportable (`remote:true`), so use a
      // direct local proxy for list()/targets(). Dedicated plugin windows have no
      // local provider and continue to use the synchronized snapshot facade below.
      const localBase=window.DKDSCapabilities?.localProxy?.('core.data-sources')||null;
      const base=localBase||window.DKDSCapabilities?.proxy?.('core.data-sources')||null;if(!base)return null;
      const descriptor=window.DKDSCapabilities?.get?.('core.data-sources')||null;
      const syncSnapshot=!localBase&&descriptor?.remote===true&&descriptor?.metadata?.syncSnapshot&&typeof descriptor.metadata.syncSnapshot==='object'
        ? descriptor.metadata.syncSnapshot
        : null;
      const syncBase=syncSnapshot?new Proxy(base,{get(target,prop,receiver){
        if(prop==='list')return options=>{
          const rows=Array.isArray(syncSnapshot.sources)?syncSnapshot.sources:[];
          const query=options&&typeof options==='object'?options:{};
          const consumer=String(query.consumer||query.pluginId||'').trim();
          return rows.filter(row=>{
            if(!consumer)return true;
            const assignments=Array.isArray(row?.assignments)?row.assignments.map(String):['*'];
            return assignments.includes('*')||assignments.includes(consumer);
          }).map(row=>({...row,assignments:Array.isArray(row?.assignments)?[...row.assignments]:row?.assignments}));
        };
        if(prop==='targets')return ()=>Array.isArray(syncSnapshot.targets)?syncSnapshot.targets.map(row=>({...row,accepts:Array.isArray(row?.accepts)?[...row.accepts]:[]})):[];
        const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;
      }}):base;
      // A project-visibility workbench is an explicit read-only browser of the
      // canonical project Artifact graph (Data Center / gallery-like tooling),
      // not an analysis consumer.  It must not inherit consumer assignment
      // filtering merely because its UI happens to be a workbench.
      if(pluginType!=='workbench'||projectDataVisibility)return syncBase;
      return new Proxy(syncBase,{get(target,prop,receiver){
        if(prop==='list')return options=>target.list?.({...((options&&typeof options==='object')?options:{}),consumer:pluginId})||[];
        if(prop==='setAssignments')return undefined;
        if(prop==='detach')return ref=>{
          const rows=target.list?.({consumer:pluginId})||[];const row=rows.find(item=>String(item?.artifactId||item?.path||'')===String(ref?.artifactId||ref?.path||ref||'')||String(item?.sourcePath||'')===String(ref?.sourcePath||''));if(!row)return {updated:false};
          const targets=target.targets?.()||[];const current=Array.isArray(row.assignments)?row.assignments.map(String):[];const expanded=current.includes('*')?targets.map(item=>String(item.id)):current;return target.setAssignments?.({artifactId:row.artifactId,path:row.path,sourcePath:row.sourcePath},expanded.filter(id=>id!==pluginId));
        };
        const value=Reflect.get(target,prop,receiver);return typeof value==='function'?value.bind(target):value;
      }});
    };
    const commandArtifactAccess=Object.freeze({
      visible:id=>{const row=(state.host?.artifacts?.listMetadata?.({id,includeTransient:true})||[]).find(item=>String(item?.id)===String(id));return !!row&&dataAssignmentsMatch(row);},
      artifactRevision:id=>state.host?.artifacts?.artifactRevision?.(id)||0,
      fingerprint:id=>state.host?.artifacts?.fingerprint?.(id)||''
    });
    const infrastructureScope = window.DKDSUI?.createScope?.(pluginId, { host:pluginHostView(), events:{ emit:eventEmitNow }, commands:{ run:runCommand } }) || null;
    const ioScope = window.DKDSIO?.createScope?.(pluginId) || null;
    const chartScope = window.DKDSCharts?.createScope?.(pluginId) || null;
    const componentScope = window.DKDSComponents?.createScope?.(pluginId,{root:document,source:componentSource}) || null;
    const dataFlowScope = window.DKDSDataFlow?.createScope?.(pluginId) || null;
    const scientificReactiveScope = window.DKDSScientificReactive?.createScope?.(pluginId) || null;
    const scientificPipelineScope = window.DKDSScientificPipeline?.createScope?.(pluginId) || null;
    const scientificTransformScope = window.DKDSScientificTransforms?.createScope?.(pluginId) || null;
    const scientificAlgorithmScope = window.DKDSScientificAlgorithms?.createScope?.(pluginId) || null;
    const serviceScope = window.DKDSServices?.createScope?.(pluginId) || null;
    const moduleScope = window.DKDSPluginModules?.createScope?.(pluginId) || null;
    const taskBaseUrl=(()=>{try{const source=String(definition.sourceIdentity||definition.manifest?.entry||'').trim();const absolute=new URL(source,document.baseURI);return new URL('.',absolute).href;}catch{return document.baseURI;}})();
    const taskDefinitions=(definition.manifest?.tasks||[]).map(row=>({...row,...(typeof definition.taskSources?.[row.entry]==='string'?{source:definition.taskSources[row.entry]}:{}),...(Array.isArray(row.imports)?{importSources:Object.fromEntries(row.imports.map(file=>[file,definition.taskSources?.[file]]).filter(([,text])=>typeof text==='string'))}:{}),...(Array.isArray(definition.taskCoreSources?.[row.id])?{preludeSources:definition.taskCoreSources[row.id].map(item=>({file:String(item?.file||''),source:String(item?.source||'')}))}:{})}));
    const taskScope = window.DKDSTasks?.createScope?.(pluginId,taskDefinitions,taskBaseUrl) || null;
    const performanceCall=(method,args)=>{const fn=window.DKDSPerformance?.[method];if(typeof fn!=='function')throw new Error(`Performance Runtime method is unavailable: ${method}`);return fn.apply(window.DKDSPerformance,args);};
    if (infrastructureScope) addCleanup(pluginId, () => infrastructureScope.dispose());
    if (componentScope) addCleanup(pluginId, () => componentScope.dispose?.());
    if (ioScope) addCleanup(pluginId, () => window.DKDSIO?.disposeOwner?.(pluginId));
    if (chartScope) addCleanup(pluginId, () => window.DKDSCharts?.disposeOwner?.(pluginId));
    if (dataFlowScope) addCleanup(pluginId, () => window.DKDSDataFlow?.removeOwner?.(pluginId));
    if (scientificReactiveScope) addCleanup(pluginId, () => window.DKDSScientificReactive?.removeOwner?.(pluginId));
    if (scientificPipelineScope) addCleanup(pluginId, () => window.DKDSScientificPipeline?.removeOwner?.(pluginId));
    if (scientificTransformScope) addCleanup(pluginId, () => window.DKDSScientificTransforms?.removeOwner?.(pluginId));
    if (scientificAlgorithmScope) addCleanup(pluginId, () => window.DKDSScientificAlgorithms?.removeOwner?.(pluginId));
    if (scientificTransformScope && scientificPipelineScope && (definition.manifest.requiresCore||[]).includes('data.transforms')) scientificTransformScope.installPipeline?.(scientificPipelineScope);
    if (serviceScope) addCleanup(pluginId, () => window.DKDSServices?.removeOwner?.(pluginId));
    if (taskScope) addCleanup(pluginId, () => taskScope.dispose?.());
    if (window.DKDSPerformance) addCleanup(pluginId, () => window.DKDSPerformance?.trimPrefix?.(`${pluginId}.`,{targetEntries:0,dropWeak:true,reason:'plugin-deactivate'}));
    const normalizeShortcutSpec = spec => {
      const row={order:100,priority:0,...(spec||{}),id:spec?.id};
      const chord=String(row.chord||row.key||row.shortcut||'').trim();
      if(!row.match&&chord&&window.DKDSUI?.shortcuts){
        const normalized=window.DKDSUI.shortcuts.normalizeChord(chord);
        row.match=event=>window.DKDSUI.shortcuts.eventChord(event)===normalized;
      }
      return row;
    };
    const algorithmList=(query={})=>{
      const q=typeof query==='string'?{category:query}:query||{};
      const local=(window.DKDSScientificAlgorithms?.list?.(q)||[]).map(row=>({...row,remote:false,run:(input,options={})=>window.DKDSScientificAlgorithms.run({id:row.id,version:row.version,category:row.category},input,options)}));
      const keys=new Set(local.map(row=>`${row.category}::${row.id}@${row.version}`));
      for(const cap of (window.DKDSCapabilities?.list?.('analysis.algorithm')||[])){
        const meta=cap.metadata||{},id=String(meta.id||meta.algorithmId||''),version=String(meta.version||meta.algorithmVersion||cap.version||'1.0.0'),category=String(meta.category||'');
        if(!id||!category)continue;
        const key=`${category}::${id}@${version}`;if(keys.has(key))continue;
        if(q.category&&category!==String(q.category))continue;if(q.id&&id!==String(q.id))continue;if(q.version&&version!==String(q.version))continue;
        const proxy=window.DKDSCapabilities.proxy(cap.id);
        local.push({id,algorithmId:id,version,algorithmVersion:version,category,owner:cap.owner,title:meta.title||meta.name||cap.title||id,description:meta.description||'',default:meta.default===true,priority:Number(meta.priority)||Number(cap.priority)||0,inputTypes:meta.inputTypes||[],outputTypes:meta.outputTypes||[],parameterSchema:meta.parameterSchema||null,tags:meta.tags||[],metadata:meta.metadata||{},remote:true,run:(input,options={})=>proxy.run(input,options),defaultSettings:cap.methods?.includes?.('defaultSettings')?(()=>proxy.defaultSettings()):undefined,getPreset:cap.methods?.includes?.('getPreset')?((name)=>proxy.getPreset(name)):undefined,migrateParameters:cap.methods?.includes?.('migrateParameters')?((value,fromVersion)=>proxy.migrateParameters(value,fromVersion)):undefined});
        keys.add(key);
      }
      const cmp=window.DKDSScientificAlgorithms?.compareVersion||(()=>0);
      return local.sort((a,b)=>(Number(b.default)-Number(a.default))||((Number(b.priority)||0)-(Number(a.priority)||0))||cmp(b.version,a.version)||String(a.title).localeCompare(String(b.title)));
    };
    const algorithmResolve=(ref,query={})=>{
      const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref||''),version:'',category:String(query.category||'')};
      return algorithmList(query).find(row=>(!wanted.category||row.category===wanted.category)&&(!wanted.id||row.id===wanted.id)&&(!wanted.version||row.version===wanted.version))||null;
    };
    const registerAlgorithm=(id,spec={})=>{
      if(!scientificAlgorithmScope)throw new Error('Scientific Algorithm Runtime unavailable.');
      const version=String(spec.version||definition.manifest.version||'1.0.0'),category=String(spec.category||'').trim();
      const descriptor=scientificAlgorithmScope.register(id,{...spec,version});
      if(window.DKDSCapabilities&&typeof (spec.run||spec.compute||spec.detect)==='function'){
        const capId=`analysis.algorithm:${category}:${id}@${version}`,methods={run:spec.run||spec.compute||spec.detect};
        if(typeof spec.defaultSettings==='function')methods.defaultSettings=spec.defaultSettings;if(typeof spec.getPreset==='function')methods.getPreset=spec.getPreset;if(typeof spec.migrateParameters==='function')methods.migrateParameters=spec.migrateParameters;
        window.DKDSCapabilities.register(pluginId,capId,{kind:'analysis.algorithm',title:spec.title||spec.name||id,version,remote:true,priority:Number(spec.priority)||0,tags:spec.tags||[],metadata:{id,version,category,title:spec.title||spec.name||id,description:spec.description||'',default:spec.default===true,priority:Number(spec.priority)||0,inputTypes:spec.inputTypes||spec.inputType||[],outputTypes:spec.outputTypes||spec.outputType||[],parameterSchema:spec.parameterSchema||null,tags:spec.tags||[],metadata:spec.metadata||{},pluginId},methods});
        addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(capId));
      }
      return descriptor;
    };
    const runAlgorithm=(ref,input,options={})=>{const row=algorithmResolve(ref,options);if(!row)throw new Error(`Scientific algorithm unavailable: ${typeof ref==='string'?ref:JSON.stringify(ref)}`);return row.run(input,{...options,parameters:options.parameters||{}});};
    const algorithmVersions=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};return algorithmList({category:wanted.category,id:wanted.id,owner:query.owner});};
    const diagnoseAlgorithm=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};const family=algorithmVersions(wanted,query),exact=wanted.version?family.find(row=>row.version===wanted.version):null,resolved=algorithmResolve(wanted,query);let status='available';if(wanted.version&&!exact)status=family.length?'missing-version':'missing-algorithm';else if(!wanted.version&&!resolved)status='missing-algorithm';return Object.freeze({status,available:status==='available',requested:Object.freeze({...wanted}),resolved:resolved?Object.freeze({category:resolved.category,id:resolved.id,version:resolved.version,owner:resolved.owner}):null,preferredVersion:wanted.category&&wanted.id?window.DKDSScientificAlgorithms?.preferred?.(wanted.category,wanted.id)||'':'',alternatives:Object.freeze(family.map(row=>Object.freeze({category:row.category,id:row.id,version:row.version,owner:row.owner,title:row.title,default:row.default})))});};
    const lockAlgorithm=(ref,query={})=>{const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref,query)||{id:String(ref?.id||ref||''),version:'',category:String(query.category||ref?.category||'')};if(wanted.version)return Object.freeze({category:wanted.category,id:wanted.id,version:wanted.version});const row=algorithmResolve(wanted,query);return Object.freeze({category:row?.category||wanted.category,id:row?.id||wanted.id,version:row?.version||''});};
    const locateAlgorithmPackage=async(ref)=>{if(!window.electronAPI?.pluginAlgorithmCatalog||window.electronAPI?.isWebClient)return {requested:window.DKDSScientificAlgorithms?.normalizeRef?.(ref)||ref,count:0,candidates:[]};return await window.electronAPI.pluginAlgorithmCatalog(ref);};
    const recoverAlgorithmPackage=async(ref,candidate=null)=>{
      const catalog=await locateAlgorithmPackage(ref),choice=candidate||catalog?.candidates?.find?.(row=>row.ready&&row.recoverable);if(!choice)throw new Error('未找到满足当前合同的算法 Provider 包。');
      const pluginId=String(choice.pluginId||'');
      {
        let def=definitionById(pluginId);
        if(!def&&choice.source==='external'&&window.electronAPI?.pluginExternalList){const result=await window.electronAPI.pluginExternalList();const pkg=(result?.packages||[]).find(row=>String(row?.manifest?.id||'')===pluginId);if(pkg)await replaceExternalPluginPackage(pkg,{statusPrefix:'已恢复算法 Provider'});def=definitionById(pluginId);}
        if(!def)throw new Error(`算法 Provider 未载入：${pluginId}`);
        if(!isDefinitionEnabled(def))await setPluginEnabled(pluginId,true);else await reloadPlugin(pluginId);
      }
      const wanted=window.DKDSScientificAlgorithms?.normalizeRef?.(ref)||ref,row=algorithmResolve(wanted,{category:wanted?.category||''});if(!row||wanted?.version&&row.version!==wanted.version)throw new Error(`恢复后仍未找到算法：${wanted?.id||''}@${wanted?.version||''}`);return row;
    };
    let apiRef=null;
    const api=Object.freeze({
      apiVersion: API_VERSION,
      contract: Object.freeze({version:window.DKDSPluginContract?.VERSION||'',requirements:window.DKDSPluginContract?.requirements||[]}),
      manifest: Object.freeze({ ...definition.manifest }),
      runtime: Object.freeze({
        appVersion:String(state.host?.appVersion||''),
        isAuxiliaryWindow:!!state.host?.isAuxiliaryWindow,
        isWebClient:!!state.host?.isWebClient
      }),
      status: Object.freeze({set:text=>state.host?.setStatus?.(String(text??''))}),
      events: {
        on: (name, fn) => addCleanup(pluginId, eventOn(name, fn, pluginId)),
        emit: (name, payload) => {
          if (name === 'layout:resize' && infrastructureScope) {
            if (state.layoutResizeDispatching) return false;
            infrastructureScope.emitResize(payload || {});
            return true;
          }
          return eventEmit(name, payload);
        }
      },
      commands: {
        register: (id, handler, meta) => registerCommand(pluginId, id, handler, meta, definition.manifest.version, commandArtifactAccess),
        run: runCommand,
        get: id => commandGet(id),
        list: () => commandList(),
        history: query => commandHistory({...((query&&typeof query==='object')?query:{}),pluginId}),
        replay: (executionId, options={}) => replayCommand(executionId, {...options,requesterPluginId:pluginId})
      },
      registry: {
        add: (kind, id, value) => registerTypedContribution(pluginId, kind, id, value),
        list: kind => listContributions(kind),
        own: kind => listContributions(kind).filter(x => x.pluginId === pluginId)
      },
      capabilities: {
        register(id,spec={}) {
          if(!window.DKDSCapabilities?.register)throw new Error('Capability Runtime is unavailable.');
          const value=window.DKDSCapabilities.register(pluginId,id,{...spec,owner:pluginId,version:spec.version||definition.manifest.version||'1.0.0'});
          addCleanup(pluginId,()=>window.DKDSCapabilities?.unregister?.(id));
          return value;
        },
        get:id=>window.DKDSCapabilities?.get?.(id)||null,
        require:(id,options)=>window.DKDSCapabilities?.require?.(id,options),
        proxy:id=>window.DKDSCapabilities?.proxy?.(id)||null,
        list:query=>window.DKDSCapabilities?.list?.(query)||[],
        invoke:(id,method,...args)=>window.DKDSCapabilities?.invoke?.(id,method,...args),
        watch:(fn,options={})=>{
          if(!window.DKDSCapabilities?.subscribe)return ()=>{};
          const off=window.DKDSCapabilities.subscribe(fn,options);
          addCleanup(pluginId,off);
          return off;
        },
        snapshot:()=>window.DKDSCapabilities?.snapshot?.({remoteOnly:true})||{schema:2,providers:[]}
      },
      project: {
        registerSlice: (key, hooks) => registerProjectSlice(pluginId, key, hooks),
        current:()=>state.host?.getActiveProjectTab?.()||null,
        create:()=>state.host?.makeProject?.()||{},
        capture:()=>state.host?.captureActiveProjectTab?.()
      },
      history: Object.freeze({
        state:()=>window.DKDSCapabilities?.invoke?.('core.project-history','state'),
        undo:()=>window.DKDSCapabilities?.invoke?.('core.project-history','undo'),
        redo:()=>window.DKDSCapabilities?.invoke?.('core.project-history','redo'),
        commitArtifactMutation:(payload={})=>window.DKDSCapabilities?.invoke?.('core.project-history','commitArtifactMutation',payload)
      }),
      workspace: Object.freeze({
        openPage:id=>state.host?.openAnalysisPage?.(id),
        closeCurrentWindow:()=>state.host?.closeCurrentWindow?.(),
        isAuxiliary:()=>!!state.host?.isAuxiliaryWindow
      }),
      io: ioScope,
      science: window.DKDSScience || null,
      performance: Object.freeze({
        memoWeak:(namespace,target,key,compute,options={})=>performanceCall('memoWeak',[`${pluginId}.${String(namespace||'core')}`,target,key,compute,options]),
        memo:(namespace,key,compute,options={})=>performanceCall('memo',[`${pluginId}.${String(namespace||'core')}`,key,compute,options]),
        stage:(namespace,revision,parameterKey,compute,options={})=>performanceCall('stage',[`${pluginId}.${String(namespace||'core')}`,revision,parameterKey,compute,options]),
        configure:(namespace,spec={})=>performanceCall('configure',[`${pluginId}.${String(namespace||'core')}`,spec]),
        trim:(namespace,options={})=>performanceCall('trim',[`${pluginId}.${String(namespace||'core')}`,options]),
        trimAll:(options={})=>performanceCall('trimPrefix',[`${pluginId}.`,options]),
        snapshot:()=>performanceCall('snapshot',[`${pluginId}.`]),
        measure:(namespace,fn)=>performanceCall('measure',[`${pluginId}.${String(namespace||'core')}`,fn]),
        skip:(namespace,count=1)=>performanceCall('skip',[`${pluginId}.${String(namespace||'core')}`,count]),
        metric:namespace=>performanceCall('metric',[`${pluginId}.${String(namespace||'core')}`])
      }),
      services: serviceScope,
      tasks: taskScope,
      modules: moduleScope,
      recipes: Object.freeze({
        use:(id,options={})=>{
          if(!window.DKDSHostRecipes?.use)throw new Error('Core Host Recipe Runtime is unavailable.');
          return window.DKDSHostRecipes.use(id,apiRef,options);
        },
        list:()=>window.DKDSHostRecipes?.list?.()||[]
      }),
      state: {
        create(initial={}, options={}) {
          if(!window.DKDSState?.create)throw new Error('DKDS state-store infrastructure is unavailable.');
          const store=window.DKDSState.create(initial, options);
          addCleanup(pluginId,()=>store.dispose?.());
          const slice=String(options.projectSlice||'').trim();
          if(slice){
            registerProjectSlice(pluginId,slice,{
              serialize:()=>typeof options.serialize==='function'?options.serialize(store.get(),store):store.snapshot(),
              restore:(data,context)=>{
                const next=typeof options.migrate==='function'?options.migrate(data,context,store):data;
                store.restore(next===undefined?initial:next,{reason:'project-restore'});
              },
              reset:()=>store.reset({reason:'project-reset'})
            });
          }
          return store;
        }
      },
      data: {
        model: window.DKDSData,
        formula: window.DKDSFormula,
        sources:Object.freeze({
          list:options=>sourceCapability()?.list?.(options)||[],
          targets:()=>sourceCapability()?.targets?.()||[],
          detach:pluginType==='workbench'?ref=>sourceCapability()?.detach?.(ref):undefined,
          setAssignments:pluginType==='data'||pluginType==='foundation'?(ref,ids)=>sourceCapability()?.setAssignments?.(ref,ids):undefined,
          rename:pluginType==='data'||pluginType==='foundation'?(ref,label)=>sourceCapability()?.rename?.(ref,label):undefined,
          setExcluded:pluginType==='data'||pluginType==='foundation'?(ref,value)=>sourceCapability()?.setExcluded?.(ref,value):undefined,
          remove:pluginType==='data'||pluginType==='foundation'?refs=>sourceCapability()?.remove?.(refs):undefined
        }),
        importWorkbench:Object.freeze({
          open:(options={})=>{
            const row=options&&typeof options==='object'?options:{};
            const accepts=Array.isArray(definition?.manifest?.data?.accepts)?definition.manifest.data.accepts.map(String):[];
            return state.host?.openImportWorkbench?.({...row,...(pluginType==='workbench'?{mode:'scoped',consumerId:pluginId,consumerLabel:String(workspaceMeta(definition.manifest).title||definition.manifest.name||pluginId),consumerIcon:String(workspaceMeta(definition.manifest).icon||defaultPluginIcon(definition.manifest)),accepts,targets:[pluginId]}:{})});
          }
        }),
        flow: dataFlowScope,
        transforms: scientificTransformScope ? Object.freeze({
          version:scientificTransformScope.version,
          register:(id,spec)=>scientificTransformScope.register(id,spec),
          unregister:id=>scientificTransformScope.unregister(id),
          get:id=>scientificTransformScope.get(id),
          resolve:value=>scientificTransformScope.resolve(value),
          list:q=>scientificTransformScope.list(q),
          runCurve:(id,input,options={})=>scientificTransformScope.runCurve(id,input,options),
          runScalarField:(id,input,options={})=>scientificTransformScope.runScalarField(id,input,options),
          curveStageId:id=>scientificTransformScope.curveStageId(id),
          fieldStageId:id=>scientificTransformScope.fieldStageId(id)
        }) : null,
        reactive: scientificReactiveScope || null,
        pipeline: scientificPipelineScope ? Object.freeze({
          version:scientificPipelineScope.version,
          register:(id,spec)=>scientificPipelineScope.register(id,spec),
          unregister:id=>scientificPipelineScope.unregister(id),
          get:id=>scientificPipelineScope.get(id),
          list:q=>scientificPipelineScope.list(q),
          run:(id,input,options={})=>scientificPipelineScope.run(id,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          runSync:(id,input,options={})=>scientificPipelineScope.runSync(id,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          runPlan:(plan,input,options={})=>scientificPipelineScope.runPlan(plan,input,{...options,artifacts:options.artifacts||apiRef?.data?.artifacts,dataTypes:options.dataTypes||apiRef?.data?.types,performance:options.performance||apiRef?.performance,selectionModel:options.selectionModel}),
          snapshot:()=>scientificPipelineScope.snapshot()
        }) : null,
        importers: Object.freeze({
          register:(id,spec={})=>{
            const value={id,...spec,pluginId,version:spec.version||definition.manifest.version||'1.0.0'};
            registerTypedContribution(pluginId,'data.importers',id,value);
            window.DKDSDataFlow?.register?.(pluginId,'importer',id,{...spec,run:spec.run||spec.parse||spec.parseArtifacts});
            return value;
          },
          list:()=>listContributions('data.importers').map(row=>row.value)
        }),
        exporters: dataFlowScope?.exporters || null,
        transformers: dataFlowScope?.transformers || null,
        analyzers: dataFlowScope?.analyzers || null,
        types: infrastructureScope?.dataTypes || Object.freeze({
          register:(id,spec)=>window.DKDSUI?.dataTypes?.register?.(pluginId,id,spec),
          get:id=>window.DKDSUI?.dataTypes?.get?.(id)||null,
          list:q=>window.DKDSUI?.dataTypes?.list?.(q)||[],
          isA:(id,parent)=>window.DKDSUI?.dataTypes?.isA?.(id,parent)||false,
          infer:(value,q)=>window.DKDSUI?.dataTypes?.infer?.(value,q)||null,
          describe:(id,value)=>window.DKDSUI?.dataTypes?.describe?.(id,value)||'',
          projectSelection:(id,value,context)=>window.DKDSUI?.dataTypes?.projectSelection?.(id,value,context)||{value},
          resolve:(id,item,context)=>window.DKDSUI?.dataTypes?.resolve?.(id,item,context)
        }),
        artifacts: {
          list: options => {const rows=(state.host?.artifacts?.list?.(options)||[]).filter(dataAssignmentsMatch);infrastructureScope?.entities?.projectArtifacts?.(rows);return rows;},
          listMetadata: options => (state.host?.artifacts?.listMetadata?.(options)||[]).filter(dataAssignmentsMatch),
          revision: kind => state.host?.artifacts?.revision?.(kind)||0,
          artifactRevision: id => state.host?.artifacts?.artifactRevision?.(id)||0,
          columnRevision: (id, ref) => {const row=(state.host?.artifacts?.listMetadata?.({id,includeTransient:true})||[]).find(item=>String(item?.id)===String(id));return !row||!dataAssignmentsMatch(row)?0:state.host?.artifacts?.columnRevision?.(id,ref)||0;},
          fingerprint: id => state.host?.artifacts?.fingerprint?.(id)||'',
          get: id => {const row=state.host?.artifacts?.get?.(id)||null;if(row&&!dataAssignmentsMatch(row))return null;if(row)infrastructureScope?.entities?.projectArtifact?.(row);return row;},
          columnMetadata: id => {const row=(state.host?.artifacts?.listMetadata?.({id,includeTransient:true})||[]).find(item=>String(item?.id)===String(id));return !row||!dataAssignmentsMatch(row)?null:state.host?.artifacts?.columnMetadata?.(id)||null;},
          readColumnRange: (id, ref, options) => {const row=(state.host?.artifacts?.listMetadata?.({id,includeTransient:true})||[]).find(item=>String(item?.id)===String(id));return !row||!dataAssignmentsMatch(row)?null:state.host?.artifacts?.readColumnRange?.(id,ref,options)||null;},
          columnBuffer: (id, ref) => {const row=(state.host?.artifacts?.listMetadata?.({id,includeTransient:true})||[]).find(item=>String(item?.id)===String(id));return !row||!dataAssignmentsMatch(row)?null:state.host?.artifacts?.columnBuffer?.(id,ref)||null;},
          transactColumn: (buffer, mutate, options={}) => state.host?.artifacts?.transactColumn?.(buffer,mutate,options),
          add: (artifact, options) => {const result=state.host?.artifacts?.add?.(artifact, options);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          upsert: artifact => {const result=state.host?.artifacts?.upsert?.(artifact);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          publish: (artifact, options={}) => {const result=state.host?.artifacts?.publish?.(artifact, options) || state.host?.artifacts?.upsert?.(artifact);infrastructureScope?.entities?.projectArtifact?.(artifact);return result;},
          batch: fn => state.host?.artifacts?.batch?.(batchApi=>fn?.(Object.freeze({...batchApi,projectArtifact:artifact=>infrastructureScope?.entities?.projectArtifact?.(artifact)}))) || fn?.(state.host?.artifacts),
          lineage: id => state.host?.artifacts?.lineage?.(id) || null,
          children: id => state.host?.artifacts?.children?.(id) || [],
          parents: id => state.host?.artifacts?.parents?.(id) || [],
          remove: id => state.host?.artifacts?.remove?.(id),
        },
        entities: infrastructureScope?.entities || Object.freeze({
          upsert: entity => window.DKDSEntities?.registry?.upsert?.(entity,{owner:pluginId}),
          get: id => window.DKDSEntities?.registry?.get?.(id)||null,
          list: q => window.DKDSEntities?.registry?.list?.(q)||[],
          children: (id,options) => window.DKDSEntities?.registry?.childrenOf?.(id,options)||[],
          ancestors: (id,options) => window.DKDSEntities?.registry?.ancestorsOf?.(id,options)||[],
          related: (a,b) => window.DKDSEntities?.registry?.isRelated?.(a,b)||false,
          setState: (id,patch,meta) => window.DKDSEntities?.registry?.setState?.(id,patch,meta)
        })
      },
      workflow: {
        run: (recipe, options) => window.DKDSWorkflow.run(recipe, options),
        buildSequentialRecipe: spec => window.DKDSWorkflow.buildSequentialRecipe(spec),
        processors: {
          register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('processor', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'workflow.processors',id,value);registerProviderCapability(pluginId,'workflow.processors',id,value);return value;},
          list: () => listProvidersWithCapabilities('workflow.processors')
        },
        analyzers: {
          register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('analyzer', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'workflow.analyzers',id,value);registerProviderCapability(pluginId,'workflow.analyzers',id,value);return value;},
          list: () => listProvidersWithCapabilities('workflow.analyzers')
        },
        recipes: {
          register: (id, recipe) => {
            const value={...recipe,id:recipe?.id||id,pluginId,pluginVersion:definition.manifest.version||'1.0.0'};
            const check=window.DKDSWorkflow.validateRecipe(value);
            if(!check.ok)throw new Error(`Recipe ${id}: ${check.errors.join(' ')}`);
            return registerTypedContribution(pluginId, 'workflow.recipes', id, value);
          },
          list: () => listContributions('workflow.recipes').map(x=>x.value)
        }
      },
      charts: {
        register: (id, spec) => {const value=window.DKDSWorkflow.normalizeProvider('chart', id, {...spec, pluginId, version:spec?.version||definition.manifest.version||'1.0.0'});registerTypedContribution(pluginId,'charts.renderers',id,value);registerProviderCapability(pluginId,'charts.renderers',id,value);return value;},
        list: () => listProvidersWithCapabilities('charts.renderers')
      },
      analysis: {
        providers: Object.freeze({
          register:(id,spec={})=>registerTypedContribution(pluginId,'analysis.providers',id,{id,...spec,pluginId,version:spec.version||definition.manifest.version||'1.0.0'}),
          list:()=>listContributions('analysis.providers').map(row=>row.value),
          get:id=>getRegistry('analysis.providers').get(String(id||''))?.value||null
        }),
        algorithms: scientificAlgorithmScope ? Object.freeze({
          version:scientificAlgorithmScope.version,
          register:registerAlgorithm,
          unregister:(id,version,category)=>scientificAlgorithmScope.unregister(id,version,category),
          list:algorithmList,
          resolve:algorithmResolve,
          versions:algorithmVersions,
          diagnose:diagnoseAlgorithm,
          lock:lockAlgorithm,
          run:runAlgorithm,
          provenance:(ref,query={})=>{const row=algorithmResolve(ref,query);return row?Object.freeze({pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title}):null;},
          preferred:(category,id)=>window.DKDSScientificAlgorithms?.preferred?.(category,id)||'',
          setPreferred:(ref,query={})=>window.DKDSScientificAlgorithms?.setPreferred?.(ref,query)||null,
          clearPreferred:(category,id)=>window.DKDSScientificAlgorithms?.clearPreferred?.(category,id)||false,
          locate:locateAlgorithmPackage,
          recover:recoverAlgorithmPackage,
          snapshot:()=>window.DKDSScientificAlgorithms?.snapshot?.()||{version:'',count:0,algorithms:[]}
        }) : null,
      },
      parameters: {
        render: (container, schema, options) => window.DKDSParameters.render(container, schema, options),
        validate: (schema, values, context) => window.DKDSParameters.validate(schema, values, context),
        defaults: (schema, initial) => window.DKDSParameters.defaultValues(schema, initial)
      },
      ui: {
        // Plugin-neutral UI infrastructure. These primitives are available in
        // both the main SUPER state.host and dedicated TOP windows, so feature code
        // never needs to own drag/dock/shortcut/resize plumbing.
        infrastructure: infrastructureScope,
        layout: infrastructureScope?.layout || null,
        actions: infrastructureScope?.actions || null,
        portable: infrastructureScope?.panels || null,
        charts: Object.freeze({...(infrastructureScope?.chartsApi||{}),...(chartScope||{})}),
        dom: componentScope,
        components: Object.freeze({
          mount:(container,spec,context)=>componentScope?.mount?.(container,spec,context)||window.DKDSComponents?.mount?.(container,spec,{...(context||{}),owner:pluginId,source:componentSource}),
          escape:value=>window.DKDSComponents?.escape?.(value)??String(value??''),
          action:spec=>window.DKDSComponents?.action?.(spec)||null,
          actionGroup:spec=>window.DKDSComponents?.actionGroup?.(spec)||null,
          tabs:spec=>window.DKDSComponents?.tabs?.(spec)||null,
          surfaceHeader:spec=>window.DKDSComponents?.surfaceHeader?.(spec)||null,
          field:spec=>window.DKDSComponents?.field?.(spec)||null,
          hydrate:root=>window.DKDSComponents?.hydrate?.(root)||null
        }),
        plotViews: infrastructureScope?.plotViews || null,
        tables: infrastructureScope?.tables || null,
        settings: infrastructureScope?.settings || null,
        dialogs: window.DKDSUI?.dialogs || null,
        interactions: infrastructureScope?.interactions || null,
        interaction: infrastructureScope?.interactionRuntime || null,
        interactionBehaviors: infrastructureScope?.interactionBehaviors || null,
        contextMenus: infrastructureScope?.menus || null,
        selection: infrastructureScope?.selection || null,
        views: infrastructureScope?.views || null,
        workspaceSurface: infrastructureScope?.pluginWorkspace ? Object.freeze({
          create:(root,spec)=>infrastructureScope.pluginWorkspace.create(root,spec),
          compose:(root,spec={})=>{
            const wb=infrastructureScope.pluginWorkspace.create(root,spec);
            wb.compose?.(spec);
            return wb;
          },
          roles:Object.freeze({PRIMARY:'primary',PRIME:'prime',SUB:'sub'})
        }) : null,
        scientificPlot: infrastructureScope?.scientificPlot || null,
        series: infrastructureScope?.series || null,
        legends: infrastructureScope?.legends || null,
        groupPlots: infrastructureScope?.groupPlots || null,
        groupArea: infrastructureScope?.groupArea || null,
        tooltips: infrastructureScope?.tooltips || null,
        entities: infrastructureScope?.entities || null,
        designSystem: (()=>{
          const tokens=Object.freeze({surfacePrimary:'--surface-primary',surfaceSecondary:'--surface-secondary',surfaceElevated:'--surface-elevated',surfaceHover:'--surface-hover',borderSubtle:'--border-subtle',borderStrong:'--border-strong',textPrimary:'--text-primary',textSecondary:'--text-secondary',textTertiary:'--text-tertiary',accentPrimary:'--accent-primary',accentSoft:'--accent-soft',success:'--status-success',warning:'--status-warning',danger:'--status-danger'});
          const roles=Object.freeze({surface:'surfacePrimary',panel:'surfaceSecondary',floating:'surfaceElevated',text:'textPrimary',muted:'textSecondary',border:'borderSubtle',accent:'accentPrimary'});
          const capabilities=Object.freeze({hostInvariant:true,canvasDocking:true,contextualExports:true,stableHomeSlots:true,standardPlotViews:true,strongViewContract:true,layeredFloating:true,autoPlotHydration:true,coreIO:true,coreCharts:true,scopedDOM:true,declarativeComponents:true,dataFlowRuntime:true,linkedSelectionViews:true,horizontalWheelStrips:true,entityRuntime:true,scientificPlotRuntime:true,tableViewRuntime:true,artifactLineage:true,stableSeriesRegistry:true,legendGroups:true,groupPlots:true,groupArea:true,activeLayoutSolver:true,semanticTables:true,coreTooltips:true,projectHistory:true,semanticVisualPrimitives:true,canonicalComponentFactories:true,firstPartyVisualGate:true,themePluginReady:true});
          const classes=Object.freeze({surface:'dkds-surface',surfaceMuted:'dkds-surface-muted',surfaceElevated:'dkds-surface-elevated',surfaceHeader:'dkds-surface-header',surfaceHeading:'dkds-surface-heading',surfaceActions:'dkds-surface-actions',surfaceTabs:'dkds-surface-tabs',surfaceTitle:'dkds-surface-title',toolbar:'dkds-toolbar',actionRow:'dkds-action-row',field:'dkds-field',check:'dkds-check',chip:'dkds-chip',list:'dkds-list',listItem:'dkds-list-item',metric:'dkds-metric',tableWrap:'dkds-table-wrap',table:'dkds-table',note:'dkds-note',status:'dkds-status',overlay:'dkds-overlay',dialog:'dkds-dialog-shell',iconButton:'dkds-icon-button',message:'dkds-message',messageMeta:'dkds-message-meta',floating:'dkds-floating-surface',meta:'dkds-meta'});
          return Object.freeze({name:'DK Data Studio Design System',version:'1.19',tokens,roles,classes,capabilities,className:(...names)=>names.flatMap(name=>String(classes[String(name)]||name||'').split(/\s+/)).filter(Boolean).join(' '),token:name=>tokens[String(name)]||'',cssVar:(name,fallback='')=>{const token=tokens[String(name)]||String(name||'');return token?`var(${token}${fallback?`, ${fallback}`:''})`:String(fallback||'');}});
        })(),
        grid: infrastructureScope?.grid || null,
        activities: {
          add: spec => registerActivity(pluginId, spec.id, spec),
          activate: id => setActiveActivity(id,{invoke:true}),
          active: () => state.activeActivityId
        },
        edit: {
          register: spec => {const row=spec&&typeof spec==='object'?spec:{};const id=String(row.id||'default');return registerTypedContribution(pluginId,'ui.editActions',id,{...row,id,pluginId});},
          invoke: (action,payload) => invokeEditAction(action,payload),
          changed: detail => notifyEditHistory(pluginId,detail)
        },
        topWorkspace: {
          register: spec => registerTopWorkspace(pluginId,spec),
          isSuper: () => state.superPluginId===pluginId
        },
        toolbar: {
          add: spec => createToolbarButton(pluginId, spec)
        },
        statusBar: {
          add: spec => addStatusBarItem(pluginId, spec),
          own: () => listContributions('ui.statusItems').filter(row=>row.pluginId===pluginId).map(row=>row.value)
        },
        mainTools: {
          add: spec => addMainTool(pluginId,spec)
        },
        menus: {
          add: spec => addMenuItem(pluginId,spec)
        },
        sidebar: {
          add: spec => addSidebarSection(pluginId,spec)
        },
        inspectors: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.inspectors',id,{id,...spec,pluginId})
        },
        groupCharts: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.groupCharts',id,{id,...spec,pluginId})
        },
        groupViews: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.groupViews',id,{id,...spec,pluginId})
        },
        mainViews: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.mainViews',id,{id,...spec,pluginId})
        },
        selectionMenus: {
          register: (id,spec) => registerTypedContribution(pluginId,'ui.selectionMenus',id,{id,...spec,pluginId})
        },
        mainOverlays: {
          add: spec => addMainOverlay(pluginId,spec)
        },
        shortcuts: {
          add: spec => {
            const row=normalizeShortcutSpec(spec);
            return registerContribution(pluginId,'ui.shortcuts',row.id,{...row,pluginId});
          },
          chord: value => window.DKDSUI?.shortcuts?.normalizeChord?.(value) || String(value||'')
        },
        pages: {
          add: spec => addPage(pluginId, spec)
        },
        panels: {
          add: spec => addPanel(pluginId,spec),
          addToggle: spec => addPanelToggle(pluginId, spec)
        },
        styles: {
          add: (id, cssText) => addStyle(pluginId, id, cssText)
        },
        theme: Object.freeze({
          contractVersion: window.DKDSTheme?.contractVersion||window.DKDSTheme?.version||'0.0.0',
          register: (id, spec={}) => {
            const localId=String(id||'').trim();
            if(!localId) throw new Error('Theme id required.');
            const themeId=`${pluginId}:${localId}`;
            const handle=window.DKDSTheme?.registerProfile?.(themeId,{...spec,owner:pluginId});
            addCleanup(pluginId,()=>{try{window.DKDSTheme?.unregisterProfile?.(themeId);}catch{}});
            return handle||Object.freeze({id:themeId});
          },
          activate: id => window.DKDSTheme?.setProfile?.(String(id||'').includes(':')?String(id):`${pluginId}:${String(id||'')}`),
          current: () => ({mode:window.DKDSTheme?.current?.()||'light',profile:window.DKDSTheme?.profile?.()||'builtin.default'}),
          list: () => window.DKDSTheme?.listProfiles?.()||[],
          tokens: () => window.DKDSTheme?.tokens?.()||{},
          materialRoles: () => window.DKDSTheme?.materialRoles?.()||[],
          materials: platform => window.DKDSTheme?.materials?.(platform)||{base:{},roles:{}},
          appearanceRoles: () => window.DKDSTheme?.appearanceRoles?.()||{roles:{},components:{}},
          appearanceComponents: () => window.DKDSTheme?.appearanceComponents?.()||{},
          consumption: () => window.DKDSTheme?.consumption?.()||{version:'0.0.0',components:{}},
          scientific: () => window.DKDSTheme?.scientific?.()||{seriesPalette:[],mode:'fallback-only',precedence:[]},
          recipePolicy: id => window.DKDSTheme?.recipePolicy?.(String(id||'').includes(':')?String(id):`${pluginId}:${String(id||'')}`)||{},
          settings: id => window.DKDSTheme?.settings?.(String(id||'').includes(':')?String(id):`${pluginId}:${String(id||'')}`)||[],
          setSetting: (id,key,value) => window.DKDSTheme?.setSetting?.(String(id||'').includes(':')?String(id):`${pluginId}:${String(id||'')}`,key,value),
          resetSettings: id => window.DKDSTheme?.resetSettings?.(String(id||'').includes(':')?String(id):`${pluginId}:${String(id||'')}`),
          platformUnits: () => window.DKDSTheme?.platformUnits?.()||{},
          coverage: () => window.DKDSTheme?.coverage?.()||{summary:{ok:false}}
        })
      }
    });
    apiRef=api;
    return api;
  }
module.exports=Object.freeze({createApi});
