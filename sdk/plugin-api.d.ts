export type DKDSDisposable = { dispose?(): void } | (() => void) | void;
export type DKDSPluginInstance = { deactivate?(): void | Promise<void> };
export type DKDSAlgorithmRef = { category: string; id: string; version?: string };
export type DKDSSelectionSnapshot = { schema:number; revision:number; items:any[]; focus:any; ranges:any[]; context:Record<string,unknown>; source:any };
export interface DKDSDataSourceDescriptor { path:string; name:string; sourcePath:string; sourceName:string; vg:number|null; points:number; excluded?:boolean; assignments?:string[]; artifactId:string; kind?:string; semanticType?:string; importerId?:string }
export interface DKDSDataSourceTarget { id:string; label:string; icon:string; order:number }
export interface DKDSDataSourceRef { path?:string; sourcePath?:string; artifactId?:string }
export interface DKDSDataSourcesCapability { list(options?:{consumer?:string;pluginId?:string}):Promise<DKDSDataSourceDescriptor[]>|DKDSDataSourceDescriptor[]; targets?():DKDSDataSourceTarget[]; detach?(ref:DKDSDataSourceRef|string):Promise<any>|any; setAssignments?(ref:DKDSDataSourceRef|string,pluginIds:string[]):Promise<any>|any; rename(ref:DKDSDataSourceRef|string,label:string):Promise<any>|any; setExcluded(ref:DKDSDataSourceRef|string,value?:boolean):Promise<any>|any; remove(refs:DKDSDataSourceRef[]|DKDSDataSourceRef):Promise<{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]}>|{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]} }
export interface DKDSManifest {
  id:string; name:string; version:string; apiVersion:'1.10.0'|'1.11.0'|'1.12.0'|'1.13.0'; entry?:string; enabled?:boolean; order?:number; description?:string; icon?:string;
  pluginType?:'foundation'|'data'|'algorithm'|'workbench'|'task'|'extension'|'developer';
  requiresCore:string[]; capabilities?:string[]; source?:string;
  workspace?:{role:'top';activity:string;icon?:string;title?:string;defaultSuper?:boolean};
  data?:{accepts?:string[];produces?:string[]};
  window?:{activity:string;title?:string;runtime?:string;scripts?:string[];dependencies?:string[];prewarm?:boolean;reuse?:boolean;persistence?:'project'|'memory'|'none';width?:number;height?:number;minWidth?:number;minHeight?:number};
  algorithmProvider?:boolean; algorithmCategories?:string[];
  algorithmProvides?:Array<{category:string;id:string;version:string;title?:string}>;
  compatibility?:{app?:string;pluginApi?:string};
  pluginDependencies?:Array<{id:string;range:string;optional?:boolean}>;
}
export interface DKDSStateStore<T=any>{get():T;snapshot():T;patch(patch:Partial<T>|((value:T)=>Partial<T>)):T;set(value:T):T;restore(value:T,options?:any):T;reset(options?:any):T;subscribe?(fn:(value:T)=>void):()=>void;dispose?():void}

export interface DKDSTableColumnState { widths:Record<string,number>; hidden:Record<string,boolean>; sort:{key:string;direction:'asc'|'desc'}|null }
export interface DKDSTableSurface {
  readonly table:HTMLTableElement; refresh():boolean; setData(columns:any[],rows:any[]):boolean; renderData():boolean;
  setColumnWidth(column:number|string,width:number,options?:any):number|false; autoSizeColumn(column:number|string,options?:any):number|false; autoSizeAll():DKDSTableColumnState;
  resetColumn(column:number|string,options?:any):boolean; resetColumns():boolean; setColumnVisible(column:number|string,visible?:boolean,options?:any):boolean; showAllColumns():boolean; visibleColumnKeys():string[];
  sort(column:number|string,direction?:'asc'|'desc'|'none'|'toggle',options?:any):string|false; clearSort():boolean; visibleTableText(options?:{includeHeader?:boolean}):string; copyVisibleTable(options?:{includeHeader?:boolean}):boolean; resetState(options?:{persist?:boolean}):DKDSTableColumnState; columnState():DKDSTableColumnState; restoreColumnState(value:Partial<DKDSTableColumnState>,options?:any):DKDSTableColumnState; dispose():void;
}
export interface DKDSTableRuntime {
  mount(id:string,container:any,spec?:any):DKDSTableSurface|null; bind(id:string,table:any,spec?:any):DKDSTableSurface|null; hydrate(root?:any,spec?:any):DKDSTableSurface[]; observe(root?:any,spec?:any):()=>void; get(idOrElement:any):DKDSTableSurface|null;
}


export interface DKDSSettingsSurface<T=Record<string,any>> { get(key?:string):T|any; set(patch:Partial<T>,meta?:any):T; reset(meta?:any):T; subscribe(fn:(value:T,meta?:any)=>void,options?:{immediate?:boolean}):()=>void; open(options?:any):HTMLElement|null; button(container:any,options?:any):HTMLButtonElement|null; dispose():void }
export interface DKDSSettingsRuntime { define<T=Record<string,any>>(id:string,spec:{title?:string;description?:string;defaults?:Partial<T>;fields?:Array<{id:string;label?:string;description?:string;type?:'text'|'number'|'select'|'boolean'|'checkbox';options?:any[];min?:number;max?:number;step?:number}>;onApply?:(value:T,meta?:any)=>void}):DKDSSettingsSurface<T>; get(id?:string):DKDSSettingsSurface|null }


export interface DKDSScientificCurve { id:string; entityId?:string; points:any[]; color?:string; colorValue?:number; direction?:number; dash?:string|null; opacity?:number; strokeWidth?:number; source?:any }
export interface DKDSScientificMarker { id:string; entityId?:string; curveId:string; x:number; y:number; color?:string; shape?:string; locked?:boolean; accepted?:boolean; source?:any }
export interface DKDSPlotManipulatorSnap { kind:'curve'; curveId:string }
export interface DKDSPlotManipulatorConstraints { min?:number; max?:number; contains?:number; containsGap?:number; minSpan?:number }
export interface DKDSPlotManipulatorPresentation { color?:string; band?:boolean; handlePosition?:'top'|'bottom'|'left'|'right'|number }
export type DKDSPlotManipulator =
  | { id:string; kind:'point'; targetId?:string; axis?:'x'|'y'|'xy'; geometry:{x:number;y:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any }
  | { id:string; kind:'axis'; axis:'x'|'y'; geometry:{value:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any }
  | { id:string; kind:'range'; axis:'x'|'y'; geometry:{start:number;end:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any };
export interface DKDSPlotManipulationPayload { manipulator:DKDSPlotManipulator; handle:'point'|'value'|'start'|'end'|string; geometry:any; initialGeometry:any; curve?:DKDSScientificCurve|null; index?:number; point?:any; event:any; surface:DKDSScientificCurveSurface }
/** @deprecated v1.11 compatibility only. Use DKDSPlotManipulationPayload. */
export interface DKDSScientificMarkerDragPayload { marker:DKDSScientificMarker; curve:DKDSScientificCurve|null; index:number; point:any; event:any; surface:DKDSScientificCurveSurface }
/** @deprecated v1.11 compatibility only. Use DKDSPlotManipulationPayload. */
export interface DKDSScientificWidthWindowPayload { marker:DKDSScientificMarker; side:'left'|'right'; windowLeft:number; windowRight:number; initialWindowLeft:number; initialWindowRight:number; event:any; surface:DKDSScientificCurveSurface }
export type DKDSInteractionGesture='click'|'double-click'|'context'|'drag'|'box'|'wheel'|'key';
export type DKDSInteractionIntent='select'|'activate'|'clear-selection'|'manipulate'|'select-region'|'zoom-box'|'zoom-wheel'|'pan'|'context-menu'|'command'|'reset-view'|string;
export interface DKDSInteractionBehaviorBinding { id?:string; gesture:DKDSInteractionGesture; target?:string|string[]; targetId?:string; button?:'primary'|'middle'|'secondary'; modifiers?:Array<'ctrl'|'shift'|'alt'>|string; chord?:string; activity?:string; priority?:number; intent?:DKDSInteractionIntent; selectionMode?:'replace'|'additive'|'toggle'; command?:string; contextActions?:any[]|((context:any)=>any[]); when?:(context:any)=>boolean; onInvoke?:(context:any)=>boolean|void }
export interface DKDSInteractionBehaviorBindSpec { gestures?:DKDSInteractionGesture[]; selector?:string; target?:string|((context:any)=>string); targetId?:string|((context:any)=>string); button?:string|((context:any)=>string); payload?:Record<string,any>|((context:any)=>Record<string,any>); capture?:boolean; preventDefault?:boolean; stopPropagation?:boolean; beforeRoute?:(context:any)=>void; onDecision?:(context:any)=>void }
export interface DKDSInteractionBehaviorProfile { add(binding:DKDSInteractionBehaviorBinding):()=>void; setBindings(bindings:DKDSInteractionBehaviorBinding[]):this; resolve(input:any):any; route(input:any):any; bind(target:any,spec?:DKDSInteractionBehaviorBindSpec):()=>void; snapshot():any; dispose():void }
export interface DKDSInteractionBehaviorRuntime { create(id:string,spec?:{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}):DKDSInteractionBehaviorProfile; compile(spec?:{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}):DKDSInteractionBehaviorProfile; get(id:string):DKDSInteractionBehaviorProfile|null; gestures:readonly DKDSInteractionGesture[]; intents:readonly string[] }

export interface DKDSScientificCurveSurfaceSpec {
  container?:any; minWidth?:number; minHeight?:number; margin?:Partial<{top:number;right:number;bottom:number;left:number}>; xTitle?:string; yTitle?:string;
  xValue?:(point:any)=>number; yValue?:(point:any)=>number; yTickFormat?:(value:number)=>string; source?:string; interaction?:any; interactionBehavior?:DKDSInteractionBehaviorProfile|{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}; navigationTools?:boolean;
  getCurves:()=>DKDSScientificCurve[]; getMarkers?:()=>DKDSScientificMarker[]; getManipulators?:()=>DKDSPlotManipulator[]; getColorDomainValues?:()=>number[]; colorScale?:(context:any)=>any;
  getView?:()=>{xDomain?:number[]|null;yDomain?:number[]|null}; setView?:(view:{xDomain?:number[]|null;yDomain?:number[]|null},meta?:any)=>void;
  getRangeSelection?:()=>any; rangeSelectionTarget?:string; rangeSelectionType?:string; showMarkers?:()=>boolean; showWidth?:()=>boolean; getMarkerWidth?:(marker:DKDSScientificMarker)=>any;
  onColorScale?:(scale:any,meta?:any)=>void; onCurveSelect?:(payload:any)=>void; onCurveModifiedClick?:(payload:any)=>void; onCurveDoubleClick?:(payload:any)=>void;
  onMarkerSelect?:(payload:any)=>void; onMarkerDoubleClick?:(payload:any)=>void; onMarkerDelete?:(payload:any)=>void; onLockedMarkerAction?:(payload:any)=>void; onMarkerHover?:(payload:any)=>void;
  /** Generic direct manipulation lifecycle. Preview is pointer-rate visual feedback; commit is the only normal place to persist domain/project state. */
  onManipulationStart?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationPreview?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationCommit?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationReset?:(payload:DKDSPlotManipulationPayload)=>void;
  onRangeStart?:(payload:any)=>void; onWheelZoomStart?:(payload:any)=>void; onRangeSelect?:(payload:any)=>void; onClearSelection?:(payload:any)=>void; onReset?:(payload?:any)=>void; onEmpty?:(payload:any)=>void; afterRender?:(payload:any)=>void;
  /** @deprecated v1.11 compatibility hook; declare a point manipulator and use onManipulationPreview. */ onMarkerDragPreview?:(payload:DKDSScientificMarkerDragPayload)=>void;
  /** @deprecated v1.11 compatibility hook; declare a point manipulator and use onManipulationCommit. */ onMarkerDragCommit?:(payload:DKDSScientificMarkerDragPayload)=>void;
  /** @deprecated v1.11 compatibility hook. */ onWidthDragStart?:(payload:DKDSScientificWidthWindowPayload)=>void;
  /** @deprecated v1.11 compatibility hook; declare a range manipulator. */ onWidthDragPreview?:(payload:DKDSScientificWidthWindowPayload)=>void;
  /** @deprecated v1.11 compatibility hook; declare a range manipulator and use onManipulationCommit. */ onWidthWindowCommit?:(payload:DKDSScientificWidthWindowPayload)=>void;
  /** @deprecated v1.11 compatibility hook; use onManipulationReset. */ onWidthReset?:(payload:any)=>void;
  /** @deprecated v1.10 compatibility hook. */ onMarkerDrag?:(payload:DKDSScientificMarkerDragPayload)=>void;
  /** @deprecated v1.10 compatibility hook. */ onMarkerDragEnd?:(payload:DKDSScientificMarkerDragPayload)=>void;
  /** @deprecated v1.10 compatibility hook. */ onWidthDrag?:(payload:DKDSScientificWidthWindowPayload)=>void;
  /** @deprecated v1.10 compatibility hook. */ onWidthDragEnd?:(payload:DKDSScientificWidthWindowPayload)=>void;
}
export interface DKDSScientificCurveSurface { readonly target:any; render(reason?:string):boolean; requestRender(reason?:string):void; fitToData(meta?:any):boolean; resetView(meta?:any):boolean; dispose():void }
export interface DKDSScientificPlotRuntime {
  create(target:any,spec:DKDSScientificCurveSurfaceSpec):DKDSScientificCurveSurface; createPlotly(target:any,spec?:any):any; attach(target:any,spec?:any):any;
  react(target:any,data?:any[],layout?:any,config?:any,spec?:any):any; scalarField(target:any,field?:any,options?:any):any; get(target:any):any; controller(target:any,name:string):any;
  resize(target:any):any; restyle(target:any,update:any,traces?:any):any; relayout(target:any,update:any):any; viewport(target:any):any; setViewport(target:any,state:any,meta?:any):boolean; resetViewport(target:any,meta?:any):boolean;
  pin(target:any,id:string,meta?:any):boolean; unpin(target:any,id:string,meta?:any):boolean; pins(target:any):any[]; stats(target:any):any; suspend(target:any,options?:any):boolean; resume(target:any,options?:any):boolean; lifecycleState():any; saveImage(target:any,baseName:string,format?:string,options?:any):any; purge(target:any):any;
}

export interface DKDSReactiveTaskResult<T=any>{accepted:boolean;stale:boolean;token:number;value:T}
export interface DKDSReactiveEntry { id:string; kind:'derived'|'effect'; dependsOn:readonly string[]; dispose():void }
export interface DKDSReactiveRuntime {
  readonly version:string; readonly owner:string; revision(id:string):number; value<T=any>(id:string):T|undefined; signature(ids:string[]|string):string;
  setValue<T=any>(id:string,value:T,options?:{touch?:boolean;meta?:any}):T; touch(keys:string|string[],meta?:any):any; transact<T=any>(label:string,fn:(tx:{id:number;label:string;owner:string;meta:any;touch(keys:string|string[],meta?:any):void})=>T,meta?:any):T;
  derive(id:string,spec:{dependsOn?:string[];compute:(ctx:any)=>any;immediate?:boolean;scheduler?:'microtask'|'frame';when?:(ctx:any)=>boolean}):DKDSReactiveEntry;
  effect(id:string,spec:{dependsOn?:string[];effect:(ctx:any,meta?:any)=>any;immediate?:boolean;scheduler?:'microtask'|'frame';when?:(ctx:any)=>boolean}):DKDSReactiveEntry;
  runLatest<T=any>(id:string,work:(ctx:any)=>T|Promise<T>,options?:{dependsOn?:string[];publish?:string}):Promise<DKDSReactiveTaskResult<T>>;
  flushNow():boolean; subscribe(fn:(event:any,runtime:DKDSReactiveRuntime)=>void,options?:{immediate?:boolean}):()=>void; snapshot():any;
}

export interface DKDSDataImporterContext { targets?:string[] }
export interface DKDSDataImporterResult { artifacts:any[]; inspection?:any }
export interface DKDSDataImporterSpec {
  id?:string; name?:string; description?:string; extensions?:string[]; preferredConsumers?:string[]; outputKinds?:string[]; outputTypes?:string[];
  editor?:'flexible-iv'|'generic-table'|string; storage?:'legacy-datasets'|'artifacts'; priority?:number;
  defaultOptions?:()=>any; normalizeOptions?:(value:any)=>any; inspect?:(file:any,options?:any)=>any;
  score?:(file:any,context?:DKDSDataImporterContext)=>number; estimateArtifacts?:(file:any,options?:any,inspection?:any)=>number;
  parse?:(file:any,options?:any)=>any; parseArtifacts?:(file:any,options?:any)=>DKDSDataImporterResult;
}
export interface DKDSDataImportWorkbench { open(options?:{targets?:string[];importerId?:string}):any }
export interface DKDSDataImportersCapability { register(id:string,spec:DKDSDataImporterSpec):any; list():any[] }

export interface DKDSPluginContext {
  readonly apiVersion:'1.13.0'; readonly manifest:Readonly<DKDSManifest>;
  readonly runtime:{appVersion:string;isAuxiliaryWindow:boolean;isWebClient:boolean};
  readonly status:{set(text:string):void};
  readonly events:{on(name:string,fn:(payload:any)=>void):()=>void;emit(name:string,payload?:any):boolean};
  readonly commands:{register(id:string,handler:(payload?:any)=>any,meta?:any):any;run(id:string,payload?:any):any;get(id:string):any};
  readonly project:{registerSlice(key:string,hooks:{serialize?():any;restore?(data:any,context?:{pluginData:Record<string,any>}):void;reset?(context?:{pluginData?:Record<string,any>;reason?:string}):void}):any;current():any;create():any;capture():void};
  readonly workspace:{openPage(id:string):any;closeCurrentWindow():any;isAuxiliary():boolean};
  readonly io:any;
  readonly science:any;
  readonly performance:{memoWeak(namespace:string,target:any,key:any,compute:()=>any,options?:any):any;memo(namespace:string,key:any,compute:()=>any,options?:any):any;stage(namespace:string,revision:any,parameterKey:any,compute:()=>any,options?:any):any;configure(namespace:string,spec?:any):any;trim(namespace:string,options?:any):any;trimAll(options?:any):any;snapshot():any;measure(namespace:string,fn:()=>any):any;skip(namespace:string,count?:number):any;metric(namespace:string):any};
  readonly services:{get(id:string):any;require(id:string):any;list():any[];register(id:string,service:any,options?:any):any};
  readonly modules:{get?(id:string):any;require(id:string):any;define?(id:string,value:any):any};
  readonly capabilities:{register(id:string,spec:any):any;get(id:string):any;require(id:string,options?:any):any;proxy(id:string):any;list(query?:any):any[];invoke(id:string,method:string,...args:any[]):any;watch(fn:(event:any)=>void,options?:any):()=>void;snapshot():any};
  readonly state:{create<T=any>(initial:T,options?:any):DKDSStateStore<T>};
  readonly data:{
    model:any; formula:any; sources:DKDSDataSourcesCapability; importWorkbench:DKDSDataImportWorkbench; flow:any; reactive:DKDSReactiveRuntime;
    importers:DKDSDataImportersCapability; exporters:any; transformers:any; analyzers:any;
    pipeline:{version:string;register(id:string,spec:any):any;unregister(id:string):any;get(id:string):any;list(query?:any):any[];run(id:string,input:any,options?:any):Promise<any>;runSync(id:string,input:any,options?:any):any;runPlan(plan:any,input:any,options?:any):any;snapshot():any};
    transforms:{version:string;register(id:string,spec:any):any;unregister(id:string):any;get(id:string):any;resolve(value:any):any;list(query?:any):any[];runCurve(id:string,input:any,options?:any):any;runScalarField(id:string,input:any,options?:any):any;curveStageId(id:string):string;fieldStageId(id:string):string};
    artifacts:any; entities:any;
    types:{register(id:string,spec:any):any;unregister?(id:string):any;get(id:string):any;list(query?:any):any[];isA(type:string,parent:string):boolean;describe(type:string,value:any):string;selection?(type:string,value:any,options?:any):any}
  };
  readonly workflow:{run(recipe:any,options?:any):any;buildSequentialRecipe(spec:any):any;processors:{register(id:string,spec:any):any;list():any[]};analyzers:{register(id:string,spec:any):any;list():any[]};recipes:{register(id:string,recipe:any):any;list():any[]}};
  readonly charts:{register(id:string,spec:any):any;list():any[]};
  readonly analysis:{
    providers:{register(id:string,spec:any):any;list():any[];get(id:string):any};
    algorithms:{version:string;register(id:string,spec:any):any;unregister(id:string,version?:string,category?:string):any;list(query?:any):any[];resolve(ref:string|DKDSAlgorithmRef,query?:any):any;versions(ref:any,query?:any):any[];diagnose(ref:any,query?:any):any;lock(ref:any,query?:any):DKDSAlgorithmRef;run(ref:any,input:any,options?:any):any;provenance(ref:any,query?:any):any;preferred(category:string,id:string):string;setPreferred(ref:any,query?:any):any;clearPreferred(category:string,id:string):any;locate(ref:any):Promise<any>;recover(ref:any,candidate?:any):Promise<any>;snapshot():any};
    detectors:{register(id:string,spec:any):any;list():any[]}
  };
  readonly parameters:{render(container:any,schema:any,options?:any):any;validate(schema:any,values:any,context?:any):any;defaults(schema:any,initial?:any):any};
  readonly ui:{
    dom:any; components:{mount(container:any,spec:any,context?:any):any;escape(value:any):string};
    scientificPlot:DKDSScientificPlotRuntime; plotViews:any; tables:DKDSTableRuntime; settings:DKDSSettingsRuntime; selection:any; interaction:any; interactions:any; interactionBehaviors:DKDSInteractionBehaviorRuntime; contextMenus:any;
    analysisWorkbench:any; pluginWorkspace:any; workspaceSurface:any; analysisSurface:any; grid:any; portable:any; layout:any; actions:any;
    activities:{add(spec:any):any;activate(id:string):any;active():string};
    topWorkspace:{register(spec:any):any;isSuper():boolean}; prime:any; sub:any; toolbar:any; statusBar:any; mainTools:any; menus:any; sidebar:any; inspectors:any; groupCharts:any; groupViews:any; mainViews:any; selectionMenus:any; mainOverlays:any; shortcuts:any;
    pages:{add(spec:{id:string;pageId?:string;html?:string;label?:string;title?:string;description?:string;icon?:string;order?:number;primary?:boolean;presentation?:'activity'|'toolbar';toolbar?:boolean;activity?:string;activityId?:string;onOpen?:(context:any)=>any}):HTMLElement}; panels:any; styles:any; edit:any; designSystem:any
  };
}
export interface DKDSPluginRegistry { define(manifest:DKDSManifest,activate:(ctx:DKDSPluginContext)=>DKDSPluginInstance|Promise<DKDSPluginInstance>|void|Promise<void>):void }
declare global { const DKDSPlugins:DKDSPluginRegistry; interface Window { DKDSPlugins:DKDSPluginRegistry } }
