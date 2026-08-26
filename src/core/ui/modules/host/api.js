'use strict';
const {VERSION, scopes, hostState, esc, resolveElement, isTypingTarget, eventChord, normalizeChord, shortcutHub}=require('../foundation/shortcuts');
const {SelectionChannel, DataTypeRegistry, dataTypeRegistry, SelectionModel, InteractionRuntime}=require('../selection/data-interaction');
const {HorizontalWheelScroller, SelectionViewBinding}=require('../selection/view-binding');
const {SeriesRegistry, LegendGroup, ActiveLayoutSolver, ResizeScheduler}=require('../series/layout');
const {ContextMenu, ActionGroup, InteractionBinding}=require('../interaction/context-actions');
const {InteractionBehaviorProfile}=require('../interaction/behavior');
const {PortableView}=require('../layout/portable-view');
const {SplitController, WorkspaceLayout}=require('../layout/workspace');
const {ChartSurface, PlotView, PlotViewRegistry}=require('../plot-view/chart');
const {ViewHost, Workbench}=require('../workbench/base');
const {GridController}=require('../grid/controller');
const {DialogService, dialogService, SettingsSurface, SettingsRegistry}=require('../dialog/settings');
const {TableSurface, TableSurfaceRegistry, TableView, TableViewRegistry, globalTableSurfaceRegistry}=require('../table/surfaces');
const {TooltipService, GroupPlot}=require('../tooltip/group-plot');
const {ScientificCurveSurface}=require('../scientific-curve/surface');
const {AnalysisWorkbench}=require('../workbench/analysis');
const {PluginWorkspace}=require('../workbench/plugin');
const {PluginScope}=require('../scope/plugin-scope');


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

module.exports=Object.freeze({configureHost, createScope, api});
