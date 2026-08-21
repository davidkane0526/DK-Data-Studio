export type DKDSDisposable = { dispose?(): void } | (() => void) | void;
export type DKDSPluginInstance = { deactivate?(): void | Promise<void> };
export type DKDSAlgorithmRef = { category: string; id: string; version?: string };
export type DKDSSelectionSnapshot = { schema:number; revision:number; items:any[]; focus:any; ranges:any[]; context:Record<string,unknown>; source:any };
export interface DKDSDataSourceDescriptor { path:string; name:string; sourcePath:string; sourceName:string; vg:number|null; points:number; excluded?:boolean; artifactId:string }
export interface DKDSDataSourcesCapability { list():Promise<DKDSDataSourceDescriptor[]>; rename(ref:{path?:string;sourcePath?:string}|string,label:string):Promise<any>; setExcluded(ref:{path?:string;sourcePath?:string}|string,value?:boolean):Promise<any>; remove(refs:Array<{path?:string;sourcePath?:string}>|{path?:string;sourcePath?:string}):Promise<{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]}> }
export interface DKDSManifest {
  id:string; name:string; version:string; apiVersion:'1.9.0'; entry?:string; enabled?:boolean; order?:number; description?:string;
  requiresCore:string[]; capabilities?:string[]; source?:string;
  workspace?:{role:'top';activity:string;icon?:string;title?:string;defaultSuper?:boolean};
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

export interface DKDSPluginContext {
  readonly apiVersion:'1.9.0'; readonly manifest:Readonly<DKDSManifest>;
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
    model:any; formula:any; flow:any;
    importers:{register(id:string,spec:any):any;list():any[]}; exporters:any; transformers:any; analyzers:any;
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
    scientificPlot:any; plotViews:any; tables:DKDSTableRuntime; settings:DKDSSettingsRuntime; selection:any; interaction:any; interactions:any; contextMenus:any;
    analysisWorkbench:any; pluginWorkspace:any; workspaceSurface:any; analysisSurface:any; grid:any; portable:any; layout:any; actions:any;
    activities:{add(spec:any):any;activate(id:string):any;active():string};
    topWorkspace:{register(spec:any):any;isSuper():boolean}; prime:any; sub:any; toolbar:any; statusBar:any; mainTools:any; menus:any; sidebar:any; inspectors:any; groupCharts:any; groupViews:any; mainViews:any; selectionMenus:any; mainOverlays:any; shortcuts:any;
    pages:{add(spec:any):HTMLElement}; panels:any; styles:any; edit:any; designSystem:any
  };
}
export interface DKDSPluginRegistry { define(manifest:DKDSManifest,activate:(ctx:DKDSPluginContext)=>DKDSPluginInstance|Promise<DKDSPluginInstance>|void|Promise<void>):void }
declare global { const DKDSPlugins:DKDSPluginRegistry; interface Window { DKDSPlugins:DKDSPluginRegistry } }
