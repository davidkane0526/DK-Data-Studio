'use strict';
const {cleanupCall, normalizeChord, shortcutHub}=require('../foundation/shortcuts');
const {SelectionChannel, dataTypeRegistry, SelectionModel, InteractionRuntime, selectionReferences, interactionTransactions, nextInteractionScopeId, currentProjectId}=require('../selection/data-interaction');
const {SeriesRegistry, LegendGroup, ActiveLayoutSolver, ResizeScheduler}=require('../series/layout');
const {ContextMenu, ActionGroup, InteractionBinding}=require('../interaction/context-actions');
const {INPUT_GESTURES, CORE_INTERACTION_INTENTS, InteractionBehaviorProfile}=require('../interaction/behavior');
const {PortableView}=require('../layout/portable-view');
const {SplitController, MovableSurface, WorkspaceLayout}=require('../layout/workspace');
const {ChartSurface, PlotViewRegistry}=require('../plot-view/chart');
const {ViewHost}=require('../workbench/view-host');
const {GridController,GroupAreaController}=require('../grid/controller');
const {SettingsRegistry}=require('../dialog/settings');
const {globalTableSurfaceRegistry}=require('../table/surfaces');
const {TooltipService, GroupPlot}=require('../tooltip/group-plot');
const {ScientificCurveSurface}=require('../scientific-curve/surface');
const {PluginWorkspace}=require('../workbench/plugin');

  class PluginScope {
    constructor(owner,options={}){
      this.owner=String(owner||'anonymous');this.options=options;this.scopeId=String(options.scopeId||nextInteractionScopeId(this.owner));this.cleanups=[];this.portables=new Map();this.layouts=[];this.charts=[];this.scientificCurves=new Set();this.pluginWorkspaces=[];
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
      this.groupArea={create:(container,spec={})=>this.trackObject(new GroupAreaController(this,container,spec))};
      this.tooltips={show:spec=>this.tooltipService.show(spec),hide:()=>this.tooltipService.hide(),bind:(target,spec)=>this.track(this.tooltipService.bind(target,spec))};
      this.selectionChannels=new Map();this.selectionModels=new Map();this.interactionRuntimes=new Map();this.interactionBehaviorProfiles=new Map();
      this.selection={
        refs:selectionReferences,
        transactions:interactionTransactions,
        scope:()=>Object.freeze({owner:this.owner,scopeId:this.scopeId,projectId:currentProjectId(this)}),
        channel:(id,initial=null)=>{const key=String(id);if(!this.selectionChannels.has(key))this.selectionChannels.set(key,this.trackObject(new SelectionChannel(this.owner,key,initial)));return this.selectionChannels.get(key);},
        model:(id,spec={})=>{const key=String(id);if(!this.selectionModels.has(key))this.selectionModels.set(key,this.trackObject(new SelectionModel(this.owner,key,spec)));return this.selectionModels.get(key);},
        accepts:(type,accepted)=>dataTypeRegistry.accepts(type,accepted),
        observe:(fn,options={})=>{if(typeof fn!=='function')return()=>{};const handler=event=>{const detail=event?.detail||{};if(detail.channel!=='selection')return;const tx=detail.transaction||detail.meta?.transaction||null;if(options.owner&&detail.owner!==options.owner)return;if(options.excludeOwner&&detail.owner===options.excludeOwner)return;if(options.excludeScopeId&&detail.scopeId===options.excludeScopeId&&(!options.excludeRuntimeId||detail.runtimeId===options.excludeRuntimeId))return;const requiredProject=typeof options.projectId==='function'?options.projectId():options.projectId;if(requiredProject&&String(tx?.projectId||detail.projectId||'')!==String(requiredProject))return;if(options.sameProject!==false&&tx?.projectId&&tx.projectId!==currentProjectId(this))return;const requiredGroup=String(options.linkGroup||'');if(requiredGroup&&String(tx?.linkGroup||detail.linkGroup||'')!==requiredGroup)return;const types=Array.isArray(options.types)?options.types:(options.type?[options.type]:[]);if(types.length&&!((detail.snapshot?.items||[]).some(item=>dataTypeRegistry.accepts(item.type,types)))&&!((detail.snapshot?.ranges||[]).some(item=>dataTypeRegistry.accepts(item.type,types))))return;fn(detail.snapshot,detail.meta||{},detail);};window.addEventListener('dkds:selection-changed',handler);const off=()=>window.removeEventListener('dkds:selection-changed',handler);this.track(off);return off;}
      };
      this.interactionRuntime={create:(id,spec={})=>{const key=String(id||'interaction');if(!this.interactionRuntimes.has(key))this.interactionRuntimes.set(key,this.trackObject(new InteractionRuntime(this,key,spec)));return this.interactionRuntimes.get(key);},get:id=>this.interactionRuntimes.get(String(id||''))||null};
      this.interactionBehaviors={create:(id,spec={})=>{const key=String(id||`behavior-${this.interactionBehaviorProfiles.size+1}`);const existing=this.interactionBehaviorProfiles.get(key);if(existing){existing.spec={...spec};existing.setBindings(spec.bindings||[]);return existing;}const profile=this.trackObject(new InteractionBehaviorProfile(this,key,spec));this.interactionBehaviorProfiles.set(key,profile);return profile;},compile:(spec={})=>this.trackObject(new InteractionBehaviorProfile(this,`surface-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,spec)),get:id=>this.interactionBehaviorProfiles.get(String(id||''))||null,gestures:INPUT_GESTURES,intents:CORE_INTERACTION_INTENTS};
      this.resizeScheduler=new ResizeScheduler(this);
      this.layout={create:(root,spec)=>{const obj=new WorkspaceLayout(this,root,spec);this.layouts.push(obj);return this.trackObject(obj);},split:spec=>this.trackObject(new SplitController(this,spec)),move:spec=>this.trackObject(new MovableSurface(this,spec)),solve:spec=>this.layoutSolver.solve(spec)};
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
      const createPluginWorkspace=(root,spec)=>{const obj=new PluginWorkspace(this,root,spec);this.pluginWorkspaces.push(obj);return this.trackObject(obj);};
      this.pluginWorkspace={create:createPluginWorkspace};
      this.scientificRenderer=window.DKDSScientificPlot?.createScope?.(this.owner)||null;if(this.scientificRenderer)this.cleanups.push(()=>this.scientificRenderer.dispose?.());
      this.scientificPlot={
        create:(target,spec={})=>{const surface=new ScientificCurveSurface(this,target,spec);this.scientificCurves.add(surface);this.cleanups.push(()=>{this.scientificCurves.delete(surface);surface.dispose?.();});return surface;},
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
    interactionLifecycleState(){
      const rows=[...this.interactionRuntimes.values()].map(runtime=>runtime.lifecycleState?.()).filter(Boolean);return Object.freeze({runtimes:rows.length,suspended:rows.filter(row=>row.suspended===true).length,selectionLinks:rows.reduce((sum,row)=>sum+Number(row.selectionLinks||0),0),stateLinks:rows.reduce((sum,row)=>sum+Number(row.stateLinks||0),0),stateListeners:rows.reduce((sum,row)=>sum+Number(row.stateListeners||0),0),seenTransactions:rows.reduce((sum,row)=>sum+Number(row.seenTransactions||0),0)});
    }
    setInteractionLifecycle(state){for(const runtime of this.interactionRuntimes.values())runtime.lifecycle?.(state);return this.interactionLifecycleState();}
    async lifecycle(state,options={}){
      const value=String(state||'').toLowerCase();
      if(value==='hidden'||value==='suspended'){
        const interactions=this.setInteractionLifecycle('hidden');this.resizeScheduler?.suspend?.();const plots=await this.scientificRenderer?.lifecycle?.('hidden',{purgeManaged:true,...options});return {owner:this.owner,state:'hidden',resize:this.resizeScheduler?.state?.()||null,plots:plots||[],interactions};
      }
      if(value==='visible'||value==='active'||value==='resumed'){
        const plots=await this.scientificRenderer?.lifecycle?.('visible',{resize:false,...options});this.resizeScheduler?.resume?.();this.requestChartResize({reason:options.reason||'lifecycle-resume'});const interactions=this.setInteractionLifecycle('visible');return {owner:this.owner,state:'visible',resize:this.resizeScheduler?.state?.()||null,plots:plots||[],interactions};
      }
      return {owner:this.owner,state:value||'active',resize:this.resizeScheduler?.state?.()||null,plots:this.scientificRenderer?.lifecycleState?.()||null,interactions:this.interactionLifecycleState()};
    }
    dispose(){this.resizeScheduler?.dispose?.();const rows=this.cleanups.splice(0).reverse();rows.forEach(cleanupCall);shortcutHub.removeOwner(this.owner);dataTypeRegistry.unregisterOwner(this.owner);this.portables.clear();this.legendGroups.clear();this.series.clear();this.selectionChannels.clear();this.selectionModels.clear();this.interactionRuntimes.clear();this.interactionBehaviorProfiles.clear();this.layouts=[];this.charts=[];this.scientificCurves.clear();this.pluginWorkspaces=[];}
  }

module.exports=Object.freeze({PluginScope});
