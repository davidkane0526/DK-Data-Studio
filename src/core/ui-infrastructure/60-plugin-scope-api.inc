  class PluginScope {
    constructor(owner,options={}){
      this.owner=String(owner||'anonymous');this.options=options;this.cleanups=[];this.portables=new Map();this.layouts=[];this.charts=[];this.workbenches=[];
      this.shortcuts={
        register:(id,spec)=>this.track(shortcutHub.register(this.owner,id,spec)),
        add:spec=>this.track(shortcutHub.register(this.owner,spec?.id||`shortcut-${this.cleanups.length}`,spec||{})),
        chord:normalizeChord
      };
      this.actionGroups=new Set();
      this.actions={mount:(container,spec)=>{
        const group=new ActionGroup(this.owner,container,spec);this.actionGroups.add(group);
        this.track(()=>this.actionGroups.delete(group));return this.trackObject(group);
      }};
      this.interactions={bind:(target,spec)=>this.trackObject(new InteractionBinding(this.owner,target,spec))};
      this.menus={create:spec=>this.trackObject(new ContextMenu(this.owner,spec)),open:(spec={})=>{const menu=this.trackObject(new ContextMenu(this.owner,spec));menu.open(spec);return menu;}};
      this.entities=window.DKDSEntities?.createScope?.(this.owner)||null;
      this.series=new SeriesRegistry(this.owner);this.legendGroups=new Map();this.layoutSolver=new ActiveLayoutSolver(this);this.tooltipService=new TooltipService(this);this.cleanups.push(()=>this.tooltipService.dispose());
      this.legends={group:(id='default',spec={})=>{const key=String(id||'default');if(!this.legendGroups.has(key))this.legendGroups.set(key,this.trackObject(new LegendGroup(this,key,spec)));return this.legendGroups.get(key);},get:id=>this.legendGroups.get(String(id||'default'))||null};
      this.groupPlots={create:(container,spec={})=>this.trackObject(new GroupPlot(this,container,spec))};
      this.tooltips={show:spec=>this.tooltipService.show(spec),hide:()=>this.tooltipService.hide(),bind:(target,spec)=>this.track(this.tooltipService.bind(target,spec))};
      this.selectionChannels=new Map();this.selectionModels=new Map();this.interactionRuntimes=new Map();this.interactionBehaviorProfiles=new Map();
      this.selection={
        channel:(id,initial=null)=>{const key=String(id);if(!this.selectionChannels.has(key))this.selectionChannels.set(key,this.trackObject(new SelectionChannel(this.owner,key,initial)));return this.selectionChannels.get(key);},
        model:(id,spec={})=>{const key=String(id);if(!this.selectionModels.has(key))this.selectionModels.set(key,this.trackObject(new SelectionModel(this.owner,key,spec)));return this.selectionModels.get(key);},
        accepts:(type,accepted)=>dataTypeRegistry.accepts(type,accepted),
        observe:(fn,options={})=>{if(typeof fn!=='function')return()=>{};const handler=event=>{const detail=event?.detail||{};if(options.owner&&detail.owner!==options.owner)return;const types=Array.isArray(options.types)?options.types:(options.type?[options.type]:[]);if(types.length&&!((detail.snapshot?.items||[]).some(item=>dataTypeRegistry.accepts(item.type,types))))return;fn(detail.snapshot,detail.meta||{},detail);};window.addEventListener('dkds:selection-changed',handler);const off=()=>window.removeEventListener('dkds:selection-changed',handler);this.track(off);return off;}
      };
      this.interactionRuntime={create:(id,spec={})=>{const key=String(id||'interaction');if(!this.interactionRuntimes.has(key))this.interactionRuntimes.set(key,this.trackObject(new InteractionRuntime(this,key,spec)));return this.interactionRuntimes.get(key);},get:id=>this.interactionRuntimes.get(String(id||''))||null};
      this.interactionBehaviors={create:(id,spec={})=>{const key=String(id||`behavior-${this.interactionBehaviorProfiles.size+1}`);const existing=this.interactionBehaviorProfiles.get(key);if(existing){existing.spec={...spec};existing.setBindings(spec.bindings||[]);return existing;}const profile=this.trackObject(new InteractionBehaviorProfile(this,key,spec));this.interactionBehaviorProfiles.set(key,profile);return profile;},compile:(spec={})=>this.trackObject(new InteractionBehaviorProfile(this,`surface-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,spec)),get:id=>this.interactionBehaviorProfiles.get(String(id||''))||null,gestures:INPUT_GESTURES,intents:CORE_INTERACTION_INTENTS};
      this.resizeScheduler=new ResizeScheduler(this);
      this.layout={create:(root,spec)=>{const obj=new WorkspaceLayout(this,root,spec);this.layouts.push(obj);return this.trackObject(obj);},split:spec=>this.trackObject(new SplitController(this,spec)),solve:spec=>this.layoutSolver.solve(spec)};
      this.panels={create:(id,node,spec={})=>{const obj=new PortableView(this,id,node,spec);this.portables.set(String(id),obj);return this.trackObject(obj);},get:id=>this.portables.get(String(id))||null};
      this.chartsApi={mount:(container,spec)=>{const obj=new ChartSurface(this,container,spec);this.charts.push(obj);return this.trackObject(obj);}};
      this.plotViewRegistry=new PlotViewRegistry(this);this.cleanups.push(()=>this.plotViewRegistry.dispose());
      this.plotViews={bind:(id,card,spec={})=>this.plotViewRegistry.bind(id,card,spec),hydrate:(root,spec={})=>this.plotViewRegistry.hydrate(root,spec),observe:(root,spec={})=>this.plotViewRegistry.observe(root,spec),get:id=>this.plotViewRegistry.get(id)};
      this.tables={
        mount:(id,container,spec={})=>globalTableSurfaceRegistry.mount(id,container,{...spec,owner:this.owner}),
        bind:(id,table,spec={})=>globalTableSurfaceRegistry.bind(id,table,{...spec,owner:this.owner}),
        hydrate:(root,spec={})=>globalTableSurfaceRegistry.hydrate(root,{...spec,owner:this.owner}),
        observe:(root,spec={})=>this.track(globalTableSurfaceRegistry.observe(root,{...spec,owner:this.owner})),
        get:value=>globalTableSurfaceRegistry.get(value)
      };
      this.settingsRegistry=new SettingsRegistry(this);this.cleanups.push(()=>this.settingsRegistry.dispose());
      this.settings={define:(id,spec={})=>this.settingsRegistry.define(id,spec),get:(id='defaults')=>this.settingsRegistry.get(id)};
      this.views={mount:(container,spec)=>this.trackObject(new ViewHost(this,container,spec))};
      this.workbench={create:(root,spec)=>{const obj=new Workbench(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);}};
      const createPluginWorkspace=(root,spec)=>{const obj=new PluginWorkspace(this,root,spec);this.workbenches.push(obj);return this.trackObject(obj);};
      this.pluginWorkspace={create:createPluginWorkspace};
      this.analysisWorkbench={create:createPluginWorkspace};
      this.scientificRenderer=window.DKDSScientificPlot?.createScope?.(this.owner)||null;if(this.scientificRenderer)this.cleanups.push(()=>this.scientificRenderer.dispose?.());
      this.scientificPlot={
        create:(target,spec={})=>this.trackObject(new ScientificCurveSurface(this,target,spec)),
        createRenderer:(target,spec={})=>this.scientificRenderer?.create?.(target,spec)||null,
        attach:(target,spec={})=>this.scientificRenderer?.attach?.(target,spec)||null,
        react:(target,data=[],layout={},config={},spec={})=>this.scientificRenderer?.react?.(target,data,layout,config,spec)||window.DKDSCharts?.react?.(target,data,layout,config),
        scalarField:(target,field={},options={})=>this.scientificRenderer?.scalarField?.(target,field,options)||null,
        get:target=>this.scientificRenderer?.get?.(target)||null,
        controller:(target,name)=>this.scientificRenderer?.controller?.(target,name)||null,
        resize:target=>this.scientificRenderer?.resize?.(target)||window.DKDSCharts?.resize?.(target),
        restyle:(target,update,traces)=>this.scientificRenderer?.restyle?.(target,update,traces)||window.DKDSCharts?.restyle?.(target,update,traces),
        relayout:(target,update)=>this.scientificRenderer?.relayout?.(target,update)||window.DKDSCharts?.relayout?.(target,update),
        viewport:target=>this.scientificRenderer?.viewport?.(target)||null,
        setViewport:(target,state,meta={})=>this.scientificRenderer?.setViewport?.(target,state,meta)||false,
        resetViewport:(target,meta={})=>this.scientificRenderer?.resetViewport?.(target,meta)||false,
        pin:(target,id,meta={})=>this.scientificRenderer?.pin?.(target,id,meta)||false,
        unpin:(target,id,meta={})=>this.scientificRenderer?.unpin?.(target,id,meta)||false,
        pins:target=>this.scientificRenderer?.pins?.(target)||[],
        stats:target=>this.scientificRenderer?.stats?.(target)||null,
        legendMetrics:target=>this.scientificRenderer?.legendMetrics?.(target)||window.DKDSCharts?.legendMetrics?.(target)||null,
        suspend:(target,options={})=>this.scientificRenderer?.get?.(target)?.suspend?.(options)||false,
        resume:(target,options={})=>this.scientificRenderer?.get?.(target)?.resume?.(options)||false,
        lifecycleState:()=>this.scientificRenderer?.lifecycleState?.()||null,
        saveImage:(target,baseName,format='svg',options={})=>this.scientificRenderer?.saveImage?.(target,baseName,format,options)||window.DKDSCharts?.saveImage?.(target,baseName,format,options),
        purge:target=>this.scientificRenderer?.purge?.(target)||window.DKDSCharts?.purge?.(target)
      };
      this.grid={create:(container,spec)=>this.trackObject(new GridController(this,container,spec))};
      this.dataTypes={register:(id,spec)=>dataTypeRegistry.register(this.owner,id,spec),get:id=>dataTypeRegistry.get(id),list:q=>dataTypeRegistry.list(q),isA:(id,parent)=>dataTypeRegistry.isA(id,parent),accepts:(id,accepted)=>dataTypeRegistry.accepts(id,accepted),compatible:(a,b)=>dataTypeRegistry.compatible(a,b),lineage:id=>dataTypeRegistry.lineage(id),infer:(value,q)=>dataTypeRegistry.infer(value,q),describe:(id,value)=>dataTypeRegistry.describe(id,value),projectSelection:(id,value,context)=>dataTypeRegistry.projectSelection(id,value,context),resolve:(id,item,context)=>dataTypeRegistry.resolve(id,item,context),validate:()=>dataTypeRegistry.validate()};
    }
    track(cleanup){if(typeof cleanup==='function')this.cleanups.push(cleanup);return cleanup;}
    trackObject(obj){if(obj?.dispose)this.cleanups.push(()=>obj.dispose());return obj;}
    emitResize(payload={}){this.resizeScheduler?.request?.(payload,{emit:true});}
    requestChartResize(payload={}){this.resizeScheduler?.request?.(payload,{emit:false});}
    async lifecycle(state,options={}){
      const value=String(state||'').toLowerCase();
      if(value==='hidden'||value==='suspended'){this.resizeScheduler?.suspend?.();const plots=await this.scientificRenderer?.lifecycle?.('hidden',{purgeManaged:true,...options});return {owner:this.owner,state:'hidden',resize:this.resizeScheduler?.state?.()||null,plots:plots||[]};}
      if(value==='visible'||value==='active'||value==='resumed'){const plots=await this.scientificRenderer?.lifecycle?.('visible',{resize:false,...options});this.resizeScheduler?.resume?.();this.requestChartResize({reason:options.reason||'lifecycle-resume'});return {owner:this.owner,state:'visible',resize:this.resizeScheduler?.state?.()||null,plots:plots||[]};}
      return {owner:this.owner,state:value||'active',resize:this.resizeScheduler?.state?.()||null,plots:this.scientificRenderer?.lifecycleState?.()||null};
    }
    dispose(){this.resizeScheduler?.dispose?.();const rows=this.cleanups.splice(0).reverse();rows.forEach(cleanupCall);shortcutHub.removeOwner(this.owner);dataTypeRegistry.unregisterOwner(this.owner);this.portables.clear();this.legendGroups.clear();this.series.clear();this.selectionChannels.clear();this.selectionModels.clear();this.interactionRuntimes.clear();this.interactionBehaviorProfiles.clear();this.layouts=[];this.charts=[];this.workbenches=[];}
  }

  function configureHost(options={}){
    if(options.root!==undefined)hostState.root=resolveElement(options.root)||hostState.root;
    if(typeof options.activity==='function')hostState.activity=options.activity;
    if(typeof options.status==='function')hostState.status=options.status;
    if(options.storagePrefix)hostState.storagePrefix=String(options.storagePrefix);
    if(options.zones&&typeof options.zones==='object'){
      for(const [name,target] of Object.entries(options.zones)){const el=resolveElement(target);if(el)hostState.zones.set(name,el);}
    }
    if(!hostState.zones.has('overlay')&&hostState.root)hostState.zones.set('overlay',hostState.root);
    return api.host.snapshot();
  }

  function createScope(owner,options={}){
    const id=String(owner||'anonymous');
    const scope=new PluginScope(id,options);
    if(!scopes.has(id))scopes.set(id,new Set());
    scopes.get(id).add(scope);
    scope.track(()=>{scopes.get(id)?.delete(scope);if(!scopes.get(id)?.size)scopes.delete(id);});
    return scope;
  }

  const api={
    version:VERSION,
    host:{
      configure:configureHost,
      zone:name=>hostState.zones.get(String(name))||null,
      snapshot:()=>({root:hostState.root,zones:Object.fromEntries([...hostState.zones].map(([k,v])=>[k,v])),activity:hostState.activity?.()||''})
    },
    shortcuts:{register:(owner,id,spec)=>shortcutHub.register(owner,id,spec),normalizeChord,eventChord},
    createScope,
    workspaces:{
      actions(activity=''){
        const target=String(activity||'');const rows=[];
        for(const group of scopes.values())for(const scope of group)for(const workbench of (scope.workbenches||[])){
          if(!(workbench instanceof PluginWorkspace)||String(workbench.spec?.activity||'')!==target)continue;
          for(const action of workbench.navigationActions?.()||[])rows.push({id:String(action.id||''),label:String(action.label||action.id||''),active:!!action.active?.()});
        }
        return rows;
      },
      invoke(activity,id){
        const target=String(activity||''),actionId=String(id||'');
        for(const group of scopes.values())for(const scope of group)for(const workbench of (scope.workbenches||[])){
          if(!(workbench instanceof PluginWorkspace)||String(workbench.spec?.activity||'')!==target)continue;
          const action=(workbench.navigationActions?.()||[]).find(row=>String(row.id)===actionId);
          if(action){action.onInvoke?.();workbench.resize?.('mobile-navigation');return true;}
        }
        return false;
      }
    },
    actions:{
      list(activity=''){
        const target=String(activity||''),rows=[];
        for(const group of scopes.values())for(const scope of group)for(const actionGroup of (scope.actionGroups||[])){
          if(String(actionGroup.spec?.activity||'')!==target)continue;
          for(const action of actionGroup.mobileActions?.()||[])rows.push({...action,owner:scope.owner});
        }
        return rows;
      },
      invoke(activity,id,itemId=''){
        const target=String(activity||'');
        for(const group of scopes.values())for(const scope of group)for(const actionGroup of (scope.actionGroups||[])){
          if(String(actionGroup.spec?.activity||'')!==target)continue;
          if(actionGroup.invokeMobile?.(id,itemId))return true;
        }
        return false;
      }
    },
    tables:{mount:(id,container,spec={})=>globalTableSurfaceRegistry.mount(id,container,spec),bind:(id,table,spec={})=>globalTableSurfaceRegistry.bind(id,table,spec),hydrate:(root,spec={})=>globalTableSurfaceRegistry.hydrate(root,spec),observe:(root,spec={})=>globalTableSurfaceRegistry.observe(root,spec),get:value=>globalTableSurfaceRegistry.get(value)},
    dialogs:{show:spec=>dialogService.show(spec),alert:spec=>dialogService.alert(spec),confirm:spec=>dialogService.confirm(spec),prompt:spec=>dialogService.prompt(spec),closeAll:()=>dialogService.closeAll()},
    dataTypes:{register:(owner,id,spec)=>dataTypeRegistry.register(owner,id,spec),unregister:id=>dataTypeRegistry.unregister(id),resolveId:id=>dataTypeRegistry.resolveId(id),get:id=>dataTypeRegistry.get(id),list:q=>dataTypeRegistry.list(q),lineage:id=>dataTypeRegistry.lineage(id),isA:(id,parent)=>dataTypeRegistry.isA(id,parent),accepts:(id,accepted)=>dataTypeRegistry.accepts(id,accepted),compatible:(a,b)=>dataTypeRegistry.compatible(a,b),infer:(value,q)=>dataTypeRegistry.infer(value,q),describe:(id,value)=>dataTypeRegistry.describe(id,value),normalize:(id,value,ctx)=>dataTypeRegistry.normalize(id,value,ctx),projectSelection:(id,value,ctx)=>dataTypeRegistry.projectSelection(id,value,ctx),resolve:(id,item,ctx)=>dataTypeRegistry.resolve(id,item,ctx),validate:()=>dataTypeRegistry.validate()},
    async lifecycle(state,options={}){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push(await scope.lifecycle?.(state,options));return {state:String(state||''),scopes:rows.length,rows};},
    lifecycleSnapshot(){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push({owner:scope.owner,resize:scope.resizeScheduler?.state?.()||null,plots:scope.scientificRenderer?.lifecycleState?.()||null});return {scopes:rows.length,rows};},
    diagnostics(){const rows=[];for(const group of scopes.values())for(const scope of group)rows.push({owner:scope.owner,series:scope.series?.snapshot?.()||null,legendGroups:[...scope.legendGroups.values()].map(x=>x.snapshot()),workbenches:(scope.workbenches||[]).map(x=>x.layoutDiagnostics?.()).filter(Boolean),tables:[...new Set(globalTableSurfaceRegistry.rows.values())].filter(x=>x.owner===scope.owner).length,plots:scope.scientificRenderer?.lifecycleState?.()||null});return Object.freeze({version:VERSION,scopes:rows.length,rows:Object.freeze(rows)});},
    disposeOwner(owner){for(const scope of [...(scopes.get(String(owner))||[])])scope.dispose();shortcutHub.removeOwner(String(owner));window.DKDSEntities?.registry?.removeOwner?.(String(owner));window.DKDSScientificPlot?.disposeOwner?.(String(owner));},
    ActionGroup,InteractionBinding,InteractionBehaviorProfile,SelectionChannel,SelectionModel,InteractionRuntime,SelectionViewBinding,HorizontalWheelScroller,DataTypeRegistry,SeriesRegistry,LegendGroup,ActiveLayoutSolver,TooltipService,GroupPlot,ResizeScheduler,ContextMenu,SplitController,WorkspaceLayout,PortableView,ChartSurface,PlotView,PlotViewRegistry,DialogService,SettingsSurface,SettingsRegistry,TableSurface,TableSurfaceRegistry,TableView,TableViewRegistry,ScientificCurveSurface,ViewHost,Workbench,GridController,AnalysisWorkbench,PluginWorkspace,
    util:{resolveElement,isTypingTarget,esc}
  };
  window.DKDSUI=Object.freeze(api);
})();
