export type DKDSDisposable = { dispose?(): void } | (() => void) | void;
export type DKDSPlatformPresentationMode = 'shared'|'adaptive'|'custom';
export interface DKDSPlatformPresentationPolicy { mode:DKDSPlatformPresentationMode; styles?:string[]; scripts?:string[] }
export interface DKDSPlatformPresentationContract { desktop:DKDSPlatformPresentationPolicy; mobile:DKDSPlatformPresentationPolicy }
export type DKDSPluginInstance = { deactivate?(): void | Promise<void> };

export type DKDSTaskState='queued'|'running'|'completed'|'failed'|'cancelled';
export interface DKDSTaskSubmitOptions<T=any>{ key?:string; latest?:boolean; generation?:number; publish?:(result:T,meta:{id:string;generation:number;key:string})=>void }
export interface DKDSTaskHandle<T=any>{ readonly id:string; readonly generation:number; readonly state:DKDSTaskState; readonly promise:Promise<T>; cancel(reason?:string):boolean }
export interface DKDSTaskRuntime { readonly version:string; submit<TInput=any,TResult=any>(taskId:string,input:TInput,options?:DKDSTaskSubmitOptions<TResult>):DKDSTaskHandle<TResult>; cancelAll(reason?:string):number; snapshot():any; dispose():void }
export interface DKDSManifestTask { id:string; entry:string }

export interface DKDSPluginHost {
  readonly appVersion:string; readonly isAuxiliaryWindow:boolean; readonly isWebClient:boolean;
  setStatus?(text:string):any; getRuntimeStatus?():any; getLanWebStatus?():any; openLanWebPanel?():any; hideLanWebPanel?():any;
  openImportWorkbench?(options?:any):any; makeProject?():any; getActiveProjectTab?():any; captureActiveProjectTab?():any;
  copyTextToClipboard?(text:string):any; saveChartImage?(...args:any[]):any;
}
export interface DKDSRuntimeReleaseRequest { activityId?:string; projectTabId?:string; pid?:number }
export interface DKDSRuntimeReleaseResult { readonly released:number; readonly activityId:string; readonly projectTabId:string; readonly pid:number }
export interface DKDSRuntimeService { getStatus():any|Promise<any>; getDevToolsState?():any|Promise<any>; toggleDevTools?():any|Promise<any>; releaseActivityWindow?(request?:DKDSRuntimeReleaseRequest):DKDSRuntimeReleaseResult|Promise<DKDSRuntimeReleaseResult> }
export interface DKDSServiceRegistry { get(id:'runtime'):DKDSRuntimeService|undefined; require(id:'runtime'):DKDSRuntimeService; get(id:string):any; require(id:string):any; list():any[]; register(id:string,service:any,options?:any):any }
export type DKDSAlgorithmRef = { category: string; id: string; version?: string };
export interface DKDSScientificDimensionDescriptor { readonly id:string; readonly key:string; readonly vector:readonly number[]; readonly known:true }
export interface DKDSScientificUnitDescriptor { readonly symbol:string; readonly canonical:string; readonly dimension:string; readonly dimensionKey:string; readonly vector:readonly number[]; readonly scale:number; readonly offset:number; readonly affine:true; readonly input:string; readonly known:true }
export interface DKDSScientificAxisSpec { name?:string; role?:string; quantity?:string; unit?:string; dimension?:string|DKDSScientificDimensionDescriptor }
export interface DKDSScientificAxisDescriptor { readonly known:boolean; readonly reason:string; readonly dimension:string; readonly dimensionKey:string; readonly unit:string; readonly unitSymbol:string; readonly scale?:number; readonly offset?:number; readonly quantity:string; readonly name:string; readonly role:string }
export interface DKDSScientificAxisCompatibility { readonly compatible:boolean; readonly reason:string; readonly dimension?:string; readonly source:DKDSScientificAxisDescriptor; readonly target:DKDSScientificAxisDescriptor; readonly conversion?:Readonly<{scale:number;offset:number;identity:boolean}> }
export interface DKDSScientificUnitRuntime {
  readonly version:string; readonly bases:readonly string[];
  axis(spec?:DKDSScientificAxisSpec|string):DKDSScientificAxisDescriptor; column(column:any):DKDSScientificAxisDescriptor; artifactAxis(artifact:any,axis?:'x'|'y'|'z'|'value'|string):DKDSScientificAxisDescriptor;
  unit(value:string):DKDSScientificUnitDescriptor|null; dimension(value:string|DKDSScientificDimensionDescriptor):DKDSScientificDimensionDescriptor|null;
  normalizeUnit(value:string):string; normalizeDimension(value:any):string; compatibility(source:DKDSScientificAxisSpec|string,target:DKDSScientificAxisSpec|string):DKDSScientificAxisCompatibility; compatible(source:DKDSScientificAxisSpec|string,target:DKDSScientificAxisSpec|string):boolean;
  convert(value:number,fromUnit:string,toUnit:string):number; convertAxisValue(value:number,source:DKDSScientificAxisSpec|string,target:DKDSScientificAxisSpec|string):number; convertAxisRange(range:readonly [number,number],source:DKDSScientificAxisSpec|string,target:DKDSScientificAxisSpec|string):readonly [number,number];
}
export interface DKDSScienceRuntime { readonly units:DKDSScientificUnitRuntime; [key:string]:any }
export interface DKDSSelectionReference { artifactId?:string; seriesId?:string; rowId?:string; entityId?:string; columnId?:string; artifactRevision?:number; range?:Record<string,unknown>; [key:string]:unknown }
export interface DKDSSelectionItem { readonly type:string; readonly id:string; readonly role:string; readonly ref:DKDSSelectionReference; readonly meta:Record<string,unknown> }
export interface DKDSSelectionSnapshot { readonly schema:2; readonly revision:number; readonly items:DKDSSelectionItem[]; readonly focus:DKDSSelectionItem|null; readonly ranges:DKDSSelectionItem[]; readonly context:Record<string,unknown>; readonly source:any }
export interface DKDSSelectionReferences {
  readonly version:string; readonly limits:Readonly<{items:number;ranges:number;refKeys:number;metaKeys:number;array:number;string:number;depth:number}>;
  normalize(ref:DKDSSelectionReference):DKDSSelectionReference; identity(ref:DKDSSelectionReference):string; sourceRowKey(ref:DKDSSelectionReference):string; sameSourceRow(a:DKDSSelectionReference,b:DKDSSelectionReference):boolean;
  artifact(artifactId:string,options?:{artifactRevision?:number;extra?:Record<string,unknown>}):DKDSSelectionReference;
  series(artifactId:string,seriesId:string,options?:{artifactRevision?:number;extra?:Record<string,unknown>}):DKDSSelectionReference;
  row(artifactId:string,rowId:string,options?:{seriesId?:string;artifactRevision?:number;extra?:Record<string,unknown>}):DKDSSelectionReference;
  range(sourceRef:DKDSSelectionReference,bounds:Record<string,unknown>,options?:{artifactRevision?:number}):DKDSSelectionReference;
}
export interface DKDSInteractionTransaction {
  readonly schema:'dkds.interaction-transaction.v1'; readonly transactionId:string; readonly projectId:string; readonly linkGroup:string;
  readonly originOwner:string; readonly originScopeId:string; readonly originRuntimeId:string;
  readonly sourceOwner:string; readonly sourceScopeId:string; readonly sourceRuntimeId:string; readonly remote:boolean;
}
export interface DKDSInteractionTransactionContract {
  readonly schema:'dkds.interaction-transaction.v1';
  readonly limits:Readonly<{seen:number;id:number;linkGroup:number;projectId:number;scopeId:number;runtimeId:number;owner:number}>;
}
export interface DKDSSelectionScopeIdentity { readonly owner:string; readonly scopeId:string; readonly projectId:string }
export interface DKDSSelectionObserveOptions { owner?:string; excludeOwner?:string; excludeScopeId?:string; excludeRuntimeId?:string; projectId?:string|(()=>string); sameProject?:boolean; linkGroup?:string; type?:string; types?:string[] }
export interface DKDSSelectionModel { select(input:any,options?:any):DKDSSelectionSnapshot; selectMany(inputs:any[],options?:any):DKDSSelectionSnapshot; setRange(range:any,options?:any):DKDSSelectionSnapshot; selectRegion(range:any,inputs?:any[],options?:any):DKDSSelectionSnapshot; clearRange(options?:any):DKDSSelectionSnapshot; setContext(context?:Record<string,unknown>,options?:any):DKDSSelectionSnapshot; clear(options?:any):DKDSSelectionSnapshot; get():DKDSSelectionSnapshot; items(type?:string):DKDSSelectionItem[]; focus():DKDSSelectionItem|null; restore(snapshot:DKDSSelectionSnapshot,meta?:any):DKDSSelectionSnapshot; subscribe(fn:(snapshot:DKDSSelectionSnapshot,meta:any,model:DKDSSelectionModel)=>void,options?:{immediate?:boolean}):()=>void; dispose():void }
export interface DKDSSelectionRuntime { readonly refs:DKDSSelectionReferences; readonly transactions:DKDSInteractionTransactionContract; scope():DKDSSelectionScopeIdentity; model(id:string,spec?:any):DKDSSelectionModel; channel(id:string,initial?:any):any; accepts(type:string,accepted:any):boolean; observe(fn:(snapshot:DKDSSelectionSnapshot,meta:any,detail:any)=>void,options?:DKDSSelectionObserveOptions):()=>void }
export interface DKDSInteractionLinkOptions { acceptTypes?:string[]; types?:string[]; source?:string }
export interface DKDSLinkedInteractionStateResult<T=Record<string,unknown>> { readonly state:T; readonly transaction:DKDSInteractionTransaction }
export interface DKDSLinkedInteractionStateOptions { transaction?:DKDSInteractionTransaction; linkGroup?:string; source?:string; reason?:string; rebroadcast?:boolean; [key:string]:any }
export interface DKDSInteractionRuntimeSpec { defaultType?:string; acceptTypes?:string[]; linkGroup?:string; autoLink?:boolean; linkOptions?:DKDSInteractionLinkOptions; selection?:any; selectionSpec?:any; [key:string]:any }
export interface DKDSInteractionRuntimeInstance {
  readonly selection:DKDSSelectionModel; readonly scopeId:string; readonly id:string; readonly owner:string; linkGroup:string;
  currentProjectId():string; transactionMeta(meta?:any,options?:{create?:boolean;remote?:boolean}):DKDSInteractionTransaction; hasSeenTransaction(id:string):boolean;
  scientificUnits():DKDSScientificUnitRuntime|null; axisCompatibility(sourceAxis:DKDSScientificAxisSpec|string,targetAxis:DKDSScientificAxisSpec|string):DKDSScientificAxisCompatibility; canLinkAxes(sourceAxis:DKDSScientificAxisSpec|string,targetAxis:DKDSScientificAxisSpec|string):boolean; convertAxisValue(value:number,sourceAxis:DKDSScientificAxisSpec|string,targetAxis:DKDSScientificAxisSpec|string):number; convertAxisRange(range:readonly [number,number],sourceAxis:DKDSScientificAxisSpec|string,targetAxis:DKDSScientificAxisSpec|string):readonly [number,number];
  selectRef(ref:DKDSSelectionReference,options?:any):DKDSSelectionSnapshot; select(value:any,options?:any):DKDSSelectionSnapshot; selectMany(values?:any[],options?:any):DKDSSelectionSnapshot; range(value:any,options?:any):DKDSSelectionSnapshot; region(value:any,items?:any[],options?:any):DKDSSelectionSnapshot; context(value:Record<string,unknown>,options?:any):DKDSSelectionSnapshot; clear(options?:any):DKDSSelectionSnapshot;
  importSelection(snapshot:DKDSSelectionSnapshot,options?:any):DKDSSelectionSnapshot; applyRemoteSelection(snapshot:DKDSSelectionSnapshot,options:{transaction:DKDSInteractionTransaction;linkGroup?:string;acceptTypes?:string[];source?:string}):DKDSSelectionSnapshot;
  link(group?:string,options?:DKDSInteractionLinkOptions):()=>void; unlinkAll():void;
  publishState<T extends Record<string,unknown>>(channel:string,state:T,options?:DKDSLinkedInteractionStateOptions):DKDSLinkedInteractionStateResult<T>; applyRemoteState<T extends Record<string,unknown>>(channel:string,state:T,options:{transaction:DKDSInteractionTransaction;linkGroup?:string;source?:string;[key:string]:any}):T|null; subscribeState<T=Record<string,unknown>>(channel:string,fn:(state:T,meta:any,runtime:DKDSInteractionRuntimeInstance)=>void):()=>void; linkState(channel:string,group?:string,options?:DKDSInteractionLinkOptions):()=>void; unlinkStateAll():void;
  get():DKDSSelectionSnapshot; items(type?:string):DKDSSelectionItem[]; focus():DKDSSelectionItem|null; resolve(item?:DKDSSelectionItem|null,context?:any):any; subscribe(fn:(snapshot:DKDSSelectionSnapshot,meta:any)=>void,options?:{immediate?:boolean}):()=>void; bind(id:string,spec?:any):()=>void; bindView(id:string,target:any,spec?:any):any; dispose():void
}
export interface DKDSInteractionRuntime { create(id:string,spec?:DKDSInteractionRuntimeSpec):DKDSInteractionRuntimeInstance; get(id:string):DKDSInteractionRuntimeInstance|null }
export type DKDSNumericSequence = readonly number[]|ArrayLike<number>;
export type DKDSColumnBufferDtype = 'number'|'float64'|'float32'|'int32'|'uint32'|'int16'|'uint16'|'int8'|'uint8';
export interface DKDSColumnBufferOwner { readonly artifactId:string; readonly columnId:string; readonly columnKey:string }
export interface DKDSColumnBufferSnapshot {
  readonly version:1; readonly owner:Readonly<DKDSColumnBufferOwner>; readonly dtype:DKDSColumnBufferDtype;
  readonly length:number; readonly artifactRevision:number; readonly bufferRevision:number; readonly values:readonly number[];
}
export interface DKDSColumnTransactionOptions { label?:string; /** Main-project hosts record one undo entry unless explicitly disabled. */ history?:boolean }
export interface DKDSColumnTransactionResult { changed:boolean; artifactId:string; columnId:string; artifactRevision:number; bufferRevision:number; buffer:DKDSColumnBufferSnapshot; label?:string }
export interface DKDSColumnMetadata { readonly artifactId:string; readonly artifactRevision:number; readonly bufferRevision:number; readonly id:string; readonly key:string; readonly name:string; readonly unit:string; readonly dimension?:string; readonly quantity?:string; readonly dtype:string; readonly role:string; readonly length:number; readonly metadata:Record<string,unknown> }
export interface DKDSArtifactMetadata { readonly artifactVersion?:number; readonly schemaVersion?:number; readonly id:string; readonly kind:string; readonly name:string; readonly semanticType:string; readonly createdAt:string; readonly updatedAt:string; readonly transient:boolean; readonly tags:readonly string[]; readonly source:Record<string,unknown>; readonly metadata:Record<string,unknown>; readonly lineage:any; readonly provenanceCount:number; readonly provenanceTypes:readonly string[]; readonly artifactRevision:number; readonly rowCount?:number; readonly length?:number; readonly shape?:readonly [number,number]; readonly columns?:readonly DKDSColumnMetadata[]; readonly xName?:string; readonly yName?:string; readonly valueName?:string; readonly xUnit?:string; readonly yUnit?:string; readonly valueUnit?:string; readonly xDimension?:string; readonly yDimension?:string; readonly valueDimension?:string; readonly xQuantity?:string; readonly yQuantity?:string; readonly valueQuantity?:string }
export interface DKDSColumnRangeSnapshot { readonly version:1; readonly owner:Readonly<DKDSColumnBufferOwner>; readonly dtype:string; readonly start:number; readonly end:number; readonly length:number; readonly totalLength:number; readonly artifactRevision:number; readonly bufferRevision:number; readonly values:readonly unknown[] }
export interface DKDSColumnRangeOptions { start?:number; /** Required, finite, 1..65536. */ limit:number }
export interface DKDSDataModelRuntime {
  readonly COLUMN_BUFFER_VERSION:1; readonly COLUMN_RANGE_VERSION:1; readonly MAX_COLUMN_RANGE_VALUES:65536; readonly COLUMN_BUFFER_DTYPES:readonly DKDSColumnBufferDtype[];
  /** Numeric factory inputs may be arrays or TypedArrays. Core copies them into the current serializable Artifact representation. */
  createSeries(spec:{id?:string;name?:string;x:DKDSNumericSequence;y:DKDSNumericSequence;[key:string]:any}):any;
  createSweep(spec:{id?:string;name?:string;x:DKDSNumericSequence;y:DKDSNumericSequence;[key:string]:any}):any;
  createTransform(spec:{id?:string;name?:string;x:DKDSNumericSequence;y:DKDSNumericSequence;[key:string]:any}):any;
  createTable(spec:{id?:string;name?:string;columns:Array<{key:string;values:readonly any[]|ArrayLike<number>;[key:string]:any}>;[key:string]:any}):any;
  createMatrix(spec:{id?:string;name?:string;x:DKDSNumericSequence;y:DKDSNumericSequence;z:ArrayLike<DKDSNumericSequence>;[key:string]:any}):any;
  validateArtifact(value:any):{ok:boolean;errors:string[]};
  isArtifact(value:any):boolean; column(table:any,ref:any):any; columnValues(table:any,ref:any):any[]; seriesId(table:any,ref:any):string; rowId(table:any,index:number):string; rows(table:any,options?:{start?:number;limit?:number;includeRowId?:boolean}):Record<string,any>[]; summarize?(artifact:any):any; deepClone?<T=any>(value:T):T;
}
export interface DKDSDataSourceDescriptor { path:string; name:string; sourcePath:string; sourceName:string; vg:number|null; points:number; excluded?:boolean; assignments?:string[]; artifactId:string; kind?:string; semanticType?:string; importerId?:string }
export interface DKDSDataSourceTarget { id:string; label:string; icon:string; order:number }
export interface DKDSDataSourceRef { path?:string; sourcePath?:string; artifactId?:string }
export interface DKDSDataSourcesCapability { list(options?:{consumer?:string;pluginId?:string}):DKDSDataSourceDescriptor[]; targets?():DKDSDataSourceTarget[]; detach?(ref:DKDSDataSourceRef|string):Promise<any>|any; setAssignments?(ref:DKDSDataSourceRef|string,pluginIds:string[]):Promise<any>|any; rename(ref:DKDSDataSourceRef|string,label:string):Promise<any>|any; setExcluded(ref:DKDSDataSourceRef|string,value?:boolean):Promise<any>|any; remove(refs:DKDSDataSourceRef[]|DKDSDataSourceRef):Promise<{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]}>|{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]} }
export interface DKDSArtifactStore {
  list(options?:{kind?:string|null;includeTransient?:boolean;parent?:string|null}):any[];
  /** Metadata-only Artifact enumeration. Numeric payload arrays and full provenance steps are not copied. */ listMetadata(options?:{id?:string|null;kind?:string|null;includeTransient?:boolean;parent?:string|null}):DKDSArtifactMetadata[];
  get(id:string):any|null; add(artifact:any,options?:{replace?:boolean}):string; upsert(artifact:any):string;
  publish(artifact:any,options?:{dedupe?:boolean}):{id:string;changed:boolean;artifact:any}; remove(id:string):boolean;
  /** Lightweight DataTable column descriptors without values. */ columnMetadata(id:string):readonly DKDSColumnMetadata[]|null;
  /** Explicit bounded immutable read. limit is required and may not exceed 65536 values. */ readColumnRange(id:string,column:string|number,options:DKDSColumnRangeOptions):DKDSColumnRangeSnapshot|null;
  /** Full-column immutable snapshot for transactional mutation workflows. Prefer readColumnRange for bounded reads. */
  columnBuffer(id:string,column:string|number):DKDSColumnBufferSnapshot|null;
  /** Atomic, synchronous, fixed-length write. The snapshot proves Store/Artifact/column ownership and expected revision. */
  transactColumn(buffer:DKDSColumnBufferSnapshot,mutate:(draft:number[],context:Readonly<Omit<DKDSColumnBufferSnapshot,'version'|'values'>>)=>void,options?:DKDSColumnTransactionOptions):DKDSColumnTransactionResult;
  batch<T>(fn:(artifacts:DKDSArtifactStore)=>T):T; parents(id:string):any[]; children(id:string):any[]; lineage(id:string):any;
  /** Store-wide when omitted, or kind-local when provided. */ revision(kind?:string):number;
  /** Store-local monotonic change stamp for one Artifact id; it is not persisted identity. */ artifactRevision(id:string):number;
  /** Store-local payload stamp for one DataTable column. Precise transactions on other columns do not change it; unrestricted whole-Artifact writes conservatively may. */ columnRevision(id:string,column:string|number):number;
  /** Complete canonical content identity, stable across save/restore. */ fingerprint(id:string):string;
}
export interface DKDSManifest {
  id:string; name:string; version:string; apiVersion:'1.19.0'; entry:string; scripts?:string[]; styles?:string[]; enabled?:boolean; order?:number; description?:string; systemCritical?:boolean;
  /** SDK 1.25 authoring contract: one shared Plugin API with explicit Desktop/Mobile presentation policy. */
  platformPresentation?:DKDSPlatformPresentationContract;
  /** `tool` may use the same workspace.role='top' lifecycle as a TOP; Core groups its opener under the Tools menu. */
  pluginType:'foundation'|'data'|'algorithm'|'workbench'|'task'|'tool'|'theme'|'extension'|'developer';
  ui?:{tableAppearance?:{cssOverrides?:Array<'row-striping'|'row-state'>}};
  requiresCore:string[]; capabilities?:string[]; source?:string;
  workspace?:{role:'top';activity:string;icon?:string;title?:string;defaultSuper?:boolean};
  data?:{accepts?:string[];produces?:string[]};
  window?:{activity:string;title?:string;runtime?:string;scripts?:string[];dependencies?:string[];prewarm?:boolean;reuse?:boolean;persistence?:'project'|'memory'|'none';artifactHydration?:'project'|'live';width?:number;height?:number;minWidth?:number;minHeight?:number};
  algorithmProvider?:boolean; algorithmCategories?:string[];
  algorithmProvides?:Array<{category:string;id:string;version:string;title?:string}>;
  pluginDependencies?:Array<{id:string}>;
  /** Worker entry points are declarative and executed only through ctx.tasks. */ tasks?:DKDSManifestTask[];
}
export interface DKDSStateStore<T=any>{get():T;snapshot():T;patch(patch:Partial<T>|((value:T)=>Partial<T>)):T;set(value:T):T;restore(value:T,options?:any):T;reset(options?:any):T;subscribe?(fn:(value:T)=>void):()=>void;dispose?():void}

export interface DKDSTableColumnState { widths:Record<string,number>; hidden:Record<string,boolean>; sort:{key:string;direction:'asc'|'desc'}|null }
export interface DKDSTableSurface {
  readonly table:HTMLTableElement; refresh():boolean; setData(columns:any[],rows:any[]):boolean; renderData():boolean;
  setColumnWidth(column:number|string,width:number,options?:any):number|false; autoSizeColumn(column:number|string,options?:any):number|false; autoSizeAll():DKDSTableColumnState;
  resetColumn(column:number|string,options?:any):boolean; resetColumns():boolean; setColumnVisible(column:number|string,visible?:boolean,options?:any):boolean; showAllColumns():boolean; visibleColumnKeys():string[];
  sort(column:number|string,direction?:'asc'|'desc'|'none',options?:any):string|false; clearSort():boolean; visibleTableText(options?:{includeHeader?:boolean}):string; copyVisibleTable(options?:{includeHeader?:boolean}):boolean; resetState(options?:{persist?:boolean}):DKDSTableColumnState; columnState():DKDSTableColumnState; restoreColumnState(value:Partial<DKDSTableColumnState>,options?:any):DKDSTableColumnState; dispose():void;
}
export interface DKDSTableSelectionContext { row:HTMLTableRowElement; rowData:any; sourceIndex:number; surface:DKDSTableSurface }
export interface DKDSTableSelectionSpec { artifactId:string|((context:DKDSTableSelectionContext)=>string); seriesId?:string|((context:DKDSTableSelectionContext)=>string); rowId?:string|((context:DKDSTableSelectionContext)=>string); artifactRevision?:number|((context:DKDSTableSelectionContext)=>number|undefined); reference?:(context:DKDSTableSelectionContext)=>DKDSSelectionReference|null; type?:string; role?:string; source?:string; revealFocus?:boolean; ignore?:string; interaction?:DKDSInteractionRuntimeInstance }
export interface DKDSTableAppearance { density?:'compact'|'comfortable'|'spacious'; stripe?:'subtle'|'none'|false; tone?:'neutral'|'analysis'|'data'|'success'|'warning'|'danger'; emphasis?:'quiet'|'normal'|'strong'; colors?:{odd?:string;even?:string;hover?:string;selected?:string} }
export interface DKDSTableMountSpec { table?:any; className?:string; columns?:any[]; rows?:any[]; appearance?:DKDSTableAppearance; interaction?:DKDSInteractionRuntimeInstance; selection?:DKDSTableSelectionSpec|null; minColumnWidth?:number; maxColumnWidth?:number; sortable?:boolean; headerMenu?:boolean; cellMenu?:boolean; copyTable?:boolean; persist?:boolean; [key:string]:any }
export interface DKDSTableRuntime {
  mount(id:string,container:any,spec?:DKDSTableMountSpec):DKDSTableSurface|null; bind(id:string,table:any,spec?:DKDSTableMountSpec):DKDSTableSurface|null; hydrate(root?:any,spec?:DKDSTableMountSpec):DKDSTableSurface[]; observe(root?:any,spec?:DKDSTableMountSpec):()=>void; get(idOrElement:any):DKDSTableSurface|null;
}


export interface DKDSSettingsSurface<T=Record<string,any>> { get(key?:string):T|any; set(patch:Partial<T>,meta?:any):T; reset(meta?:any):T; subscribe(fn:(value:T,meta?:any)=>void,options?:{immediate?:boolean}):()=>void; open(options?:any):HTMLElement|null; button(container:any,options?:any):HTMLButtonElement|null; dispose():void }
export interface DKDSSettingsRuntime { define<T=Record<string,any>>(id:string,spec:{title?:string;description?:string;defaults?:Partial<T>;fields?:Array<{id:string;label?:string;description?:string;type?:'text'|'number'|'select'|'boolean'|'checkbox';options?:any[];min?:number;max?:number;step?:number}>;onApply?:(value:T,meta?:any)=>void}):DKDSSettingsSurface<T>; get(id?:string):DKDSSettingsSurface|null }


export interface DKDSScientificCurve { id:string; entityId?:string; artifactId?:string; artifactRevision?:number; seriesId?:string; rowIds?:readonly (string|number)[]; ref?:DKDSSelectionReference; /** Legend label. Defaults to name/title/id. */ label?:string; name?:string; title?:string; /** Core auto legend includes the curve unless false. */ legend?:boolean; /** Initial Core visibility. */ visible?:boolean; points:any[]; color?:string; colorValue?:number; direction?:number; dash?:string|null; opacity?:number; strokeWidth?:number; source?:any }
export interface DKDSScientificMarker { id:string; entityId?:string; curveId:string; x:number; y:number; color?:string; shape?:string; locked?:boolean; accepted?:boolean; source?:any }
export interface DKDSPlotManipulatorSnap { kind:'curve'; curveId:string }
export interface DKDSPlotManipulatorConstraints { min?:number; max?:number; contains?:number; containsGap?:number; minSpan?:number }
export interface DKDSPlotManipulatorPresentation { color?:string; band?:boolean; handlePosition?:'top'|'bottom'|'left'|'right'|number }
export type DKDSPlotManipulator =
  | { id:string; kind:'point'; targetId?:string; axis?:'x'|'y'|'xy'; geometry:{x:number;y:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any }
  | { id:string; kind:'axis'; axis:'x'|'y'; geometry:{value:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any }
  | { id:string; kind:'range'; axis:'x'|'y'; geometry:{start:number;end:number}; snap?:DKDSPlotManipulatorSnap; constraints?:DKDSPlotManipulatorConstraints; presentation?:DKDSPlotManipulatorPresentation; locked?:boolean; source?:any };
export interface DKDSPlotManipulationPayload { manipulator:DKDSPlotManipulator; handle:'point'|'value'|'start'|'end'|string; geometry:any; initialGeometry:any; curve?:DKDSScientificCurve|null; index?:number; point?:any; event:any; surface:DKDSScientificCurveSurface }
export type DKDSInteractionGesture='click'|'double-click'|'context'|'drag'|'box'|'wheel'|'key';
export type DKDSInteractionIntent='select'|'activate'|'clear-selection'|'manipulate'|'select-region'|'zoom-box'|'zoom-wheel'|'pan'|'context-menu'|'command'|'reset-view'|string;
export interface DKDSInteractionBehaviorBinding { id?:string; gesture:DKDSInteractionGesture; target?:string|string[]; targetId?:string; button?:'primary'|'middle'|'secondary'; modifiers?:Array<'ctrl'|'shift'|'alt'>|string; chord?:string; activity?:string; priority?:number; intent?:DKDSInteractionIntent; selectionMode?:'replace'|'additive'; command?:string; contextActions?:any[]|((context:any)=>any[]); when?:(context:any)=>boolean; onInvoke?:(context:any)=>boolean|void }
export interface DKDSInteractionBehaviorBindSpec { gestures?:DKDSInteractionGesture[]; selector?:string; target?:string|((context:any)=>string); targetId?:string|((context:any)=>string); button?:string|((context:any)=>string); payload?:Record<string,any>|((context:any)=>Record<string,any>); capture?:boolean; preventDefault?:boolean; stopPropagation?:boolean; beforeRoute?:(context:any)=>void; onDecision?:(context:any)=>void }
export interface DKDSInteractionBehaviorProfile { add(binding:DKDSInteractionBehaviorBinding):()=>void; setBindings(bindings:DKDSInteractionBehaviorBinding[]):this; resolve(input:any):any; route(input:any):any; bind(target:any,spec?:DKDSInteractionBehaviorBindSpec):()=>void; snapshot():any; dispose():void }
export interface DKDSInteractionBehaviorRuntime { create(id:string,spec?:{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}):DKDSInteractionBehaviorProfile; compile(spec?:{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}):DKDSInteractionBehaviorProfile; get(id:string):DKDSInteractionBehaviorProfile|null; gestures:readonly DKDSInteractionGesture[]; intents:readonly string[] }

export interface DKDSDomRuntime {
  readonly version:string; readonly owner:string;
  root(value?:any):any; query(selector:string,from?:any):any; all(selector:string,from?:any):HTMLElement[];
  create(tag:string,spec?:{className?:string;text?:string;html?:string;attrs?:Record<string,any>;dataset?:Record<string,any>}):HTMLElement;
  createNS(namespace:string,tag:string,spec?:{className?:string;text?:string;attrs?:Record<string,any>}):Element;
  html(target:any,value:any):any; text(target:any,value:any):any; replace(target:any,...nodes:any[]):any; append(target:any,...nodes:any[]):any; toggle(target:any,className:string,force?:boolean):any; style(target:any,patch?:Record<string,any>):any; attr(target:any,name:string,value?:any):any;
  on(target:EventTarget,event:string,handler:(event:any)=>void,options?:any):()=>void; delegate(target:any,event:string,selector:string,handler:(event:any,hit:HTMLElement)=>void,options?:any):()=>void;
  observe(target:any,callback:(entries:any)=>void,options?:{resize?:boolean;mutation?:boolean|MutationObserverInit}):()=>void; frame(fn:()=>void):()=>void; timeout(fn:()=>void,delay?:number):()=>void; interval(fn:()=>void,delay?:number):()=>void; microtask(fn:()=>void):void; dispose():void;
}
export interface DKDSStatusBarItemSpec { id:string; side?:'left'|'right'; order?:number; icon?:string; label?:string; title?:string; activity?:string; activityId?:string; state?:'info'|'ok'|'warn'|'error'|'running'|'stopped'|'checking'|'starting'|'waiting'|'done'|'ready'|'mcp'|string; colorPolicy?:'theme'|'semantic'; hidden?:boolean; disabled?:boolean; className?:string; onClick?:(payload:{event:Event;element:HTMLButtonElement;pluginId:string;id:string;host:DKDSPluginHost})=>void }
export interface DKDSStatusBarItem { readonly id:string; readonly pluginId:string; readonly element:HTMLButtonElement; update(patch:Partial<DKDSStatusBarItemSpec>):DKDSStatusBarItem; remove():void; readonly value:DKDSStatusBarItemSpec }
export interface DKDSStatusBarRuntime { add(spec:DKDSStatusBarItemSpec):DKDSStatusBarItem; own():DKDSStatusBarItem[] }

export interface DKDSActivitySpec { id:string; label?:string; contextLabel?:string; icon?:string; order?:number; default?:boolean; primary?:boolean; openMode?:'window'|'page'; navigation?:'primary'|'system'|'hidden'|string; artifactHydration?:'project'|'live'; description?:string; onActivate?:(context?:any)=>any }
export type DKDSGridOrientation='landscape'|'portrait';
export interface DKDSGridColumnContext {
  /** Native Mobile reports the physical orientation; Desktop/Web always report landscape. */
  orientation:DKDSGridOrientation;
  /** Current grid host width in CSS pixels before the responsive width clamp is applied. */
  width:number;
  /** Configured default column count from DKDSGridSpec.columns. */
  columns:number;
  maxColumns:number;
  minItemWidth:number;
  container:HTMLElement;
  controller:DKDSGridController;
}
export interface DKDSGridOrientationPolicy {
  /** Native-Mobile-only fallback: when portrait has no explicit preferredColumns result, derive it from the latest effective landscape count plus offset. */
  mode:'portrait-offset';
  /** Added to the landscape baseline in portrait. Defaults to -1. */
  offset?:number;
  /** Lower bound for the derived portrait request. Defaults to 1. */
  minColumns?:number;
}
export interface DKDSGridSpec {
  /** Default requested columns before responsive width clamping. */
  columns?:number;
  minItemWidth?:number;
  maxColumns?:number;
  /** When true (default), Core may reduce the requested count to fit minItemWidth. */
  responsive?:boolean;
  /** Optional Native Mobile orientation policy. It has no effect on Desktop/Web. */
  orientationPolicy?:DKDSGridOrientationPolicy;
  /** Optional per-orientation requested column count. Return null/undefined/'auto' to let Core derive/fallback. */
  preferredColumns?:(context:DKDSGridColumnContext)=>number|'auto'|null|undefined;
}
export interface DKDSGridController {
  readonly container:HTMLElement;
  apply():number;
  setColumns(value:number):number;
  /** Returns the configured base column count, not the responsive/effective count. */
  getColumns():number;
  /** Returns the currently applied count after orientation policy and width clamping. */
  getAppliedColumns():number;
  /** Native Mobile physical orientation; Desktop/Web return landscape. */
  getOrientation():DKDSGridOrientation;
  dispose():void;
}
export interface DKDSGridRuntime { create(container:Element|string,spec?:DKDSGridSpec):DKDSGridController }
/** A Core-owned multi-plot region. It is layout-only: outer titles/chrome are optional and plugin-owned content remains ordinary PlotViews. */
export interface DKDSGroupAreaSpec extends DKDSGridSpec {}
export interface DKDSGroupAreaController extends DKDSGridController { readonly kind:'group-area' }
export interface DKDSGroupAreaRuntime { create(container:Element|string,spec?:DKDSGroupAreaSpec):DKDSGroupAreaController }
export type DKDSScrollPolicy='none'|'chain'|'contain'|'viewport';
export interface DKDSLayoutStateSnapshot {
  readonly id:string; readonly axis:'x'|'y'; readonly placement:string; readonly collapsed:boolean;
  /** Unclamped user intent. Hidden/zero-sized regions never overwrite this value. */
  readonly preferredSize:number; readonly preferredRatio:number|null; readonly effectiveSize:number;
  readonly resolved:Readonly<{effectiveSize:number;total:number;min:number;max:number;visible:boolean;handleVisible:boolean;track:string;platform:'desktop'|'mobile'}>|null;
}
export interface DKDSSplitSpec {
  id?:string; container:Element|string; handle:Element|string; target?:Element|string; axis?:'x'|'y'; reverse?:boolean; cssVar?:string;
  defaultSize?:number; preferredSize?:number; preferredRatio?:number; min?:number; max?:number; reserve?:number;
  mobileOverlay?:boolean; mobileMaxRatio?:number; mobileReserve?:number; mobileStateScope?:boolean; placement?:string; collapsed?:boolean;
}
export interface DKDSSplitController {
  readonly size:number; apply(value:number,options?:{persist?:boolean;emit?:boolean;notify?:boolean}):number; applyPreferred(options?:{persist?:boolean;emit?:boolean;notify?:boolean;reason?:string}):number;
  setCollapsed(collapsed:boolean,options?:{persist?:boolean;notify?:boolean}):number; setPlacement(placement:string,options?:{persist?:boolean}):string; stateSnapshot():Readonly<DKDSLayoutStateSnapshot>; dispose():void;
}
export interface DKDSLayoutRegionDiagnostic { readonly name:string; readonly scrollPolicy:DKDSScrollPolicy|string; readonly tag:string; readonly id:string; readonly className:string; readonly overflowX:string; readonly overflowY:string; readonly clientWidth:number; readonly clientHeight:number; readonly scrollWidth:number; readonly scrollHeight:number }
export interface DKDSPluginWorkspaceCreateSpec {
  /** auto: PRIMARY is rendered as a navigation action only when SUB routes need a return path; always forces it visible; hidden suppresses workspace navigation. */
  navigation?:'auto'|'always'|'hidden';
  id?:string; activity?:string; title?:string; subtitle?:string; header?:boolean; closable?:boolean; hostMode?:'embedded'|'dedicated'|string;
  /** safe = bounded Core-owned Primary scrolling (default); auto = intentional document-flow growth; contained = bounded no-scroll canvas. */
  primaryScroll?:'safe'|'auto'|'contained'; canvasLeftWidth?:number; canvasLeftMin?:number; canvasLeftReserve?:number; canvasRightWidth?:number; canvasRightMin?:number; canvasRightReserve?:number; canvasBottomHeight?:number; canvasBottomMin?:number; canvasBottomReserve?:number;
}
export interface DKDSPluginWorkspaceMountContext { workbench:DKDSPluginWorkspace; scope:any; main:HTMLElement; root:HTMLElement }
export interface DKDSPluginWorkspacePrimarySpec { id:string; label?:string; /** PRIMARY is exactly one semantic main surface in Plugin API 1.19. Register controls/inspectors as PRIME surfaces. */ mainNode?:any; mainHtml?:string|(()=>string); /** Same bounded/growing semantics as create().primaryScroll. */ scroll?:'safe'|'auto'|'contained'; scrollMode?:'safe'|'auto'|'contained'; mount?:(context:DKDSPluginWorkspaceMountContext)=>void|(()=>void) }
/** Stable Core-owned semantic kinds for persistent PRIME/Portable surfaces. Themes never define new values. */
export type DKDSSemanticSurfaceKind='panel'|'inspector';
/** Functional purpose is orthogonal to Portable/Material semanticKind and cross-platform presentationRole. */
export type DKDSPresentationSurfacePurpose='parameters';
export type DKDSPresentationSurfaceRole='scientific-primary'|'data-primary'|'utility-primary'|'data-control'|'inspector'|'scientific-secondary';
export interface DKDSPluginWorkspacePrimeSpec {
  id:string; label?:string; title?:string; order?:number; autoOpen?:boolean;
  semanticKind?:DKDSSemanticSurfaceKind; presentationPurpose?:DKDSPresentationSurfacePurpose; presentationRole?:DKDSPresentationSurfaceRole; priority?:number; collapsible?:boolean;
  /** One declared placement means fixed placement and Core omits the position chooser; two or more placements expose the canonical chooser. */
  placements?:Array<'inline'|'home'|'left'|'right'|'bottom'|'main'|'float'|'global'>; defaultPlacement?:'inline'|'home'|'left'|'right'|'bottom'|'main'|'float'|'global';
  /** fill consumes the remaining dock height; content (default) uses intrinsic height. Floating and mobile projection keep their own sizing. */
  sizing?:'content'|'fill';
  existingNode?:any; node?:any; inlineHost?:any; useTargetAsWrapper?:boolean; handle?:any; controlsHost?:any; controlsPlacement?:'start'|'end'|string; stateVersion?:number|string;
  closeSelector?:string; collapseSelector?:string; actions?:any[]; actionHost?:any; actionsHost?:any;
  mount?:(context:any)=>void|(()=>void); onPlacementChanged?:(info:any)=>void; onClose?:(info:any)=>void; onCollapse?:(info:any)=>void;
}
export interface DKDSPluginWorkspace {
  readonly shell:HTMLElement;
  mountPrimary(spec:DKDSPluginWorkspacePrimarySpec):DKDSPluginWorkspace; registerPrime(spec:DKDSPluginWorkspacePrimeSpec):any; registerSub(spec:any):any; showPrimary():any; openPrime(id:string,placement?:string):any; openSub(id:string):any; grid(container:Element|string,spec?:DKDSGridSpec):DKDSGridController; groupArea(container:Element|string,spec?:DKDSGroupAreaSpec):DKDSGroupAreaController; setPrimaryScrollMode(mode:'safe'|'auto'|'contained'):DKDSPluginWorkspace; setHostMode(mode:string):DKDSPluginWorkspace; /** On-demand, bounded inspection of registered regions only; it performs no runtime recovery writes. */ layoutDiagnostics(options?:{limit?:number}):Readonly<{owner:string;activity:string;primaryScroll:'safe'|'auto'|'contained';regions:ReadonlyArray<DKDSLayoutRegionDiagnostic>;risks:ReadonlyArray<DKDSLayoutRegionDiagnostic>;bounded:true;primary:Readonly<{clientWidth:number;clientHeight:number;scrollWidth:number;scrollHeight:number}>}>; capabilityState():any; dispose():void;
}
export interface DKDSPluginWorkspaceRuntime { create(root:any,spec?:DKDSPluginWorkspaceCreateSpec):DKDSPluginWorkspace }
export interface DKDSTopWorkspaceSurfaceSpec { id:string; role?:string; semanticKind?:DKDSSemanticSurfaceKind; presentationPurpose?:DKDSPresentationSurfacePurpose; presentationRole:DKDSPresentationSurfaceRole; priority?:number; collapsible?:boolean }
export interface DKDSTopWorkspaceSpec {
  id:string; activity:string; label?:string; icon?:string;
  layout:{mode:'native';root:{selector:string};primary:DKDSTopWorkspaceSurfaceSpec;prime?:DKDSTopWorkspaceSurfaceSpec[];sub?:DKDSTopWorkspaceSurfaceSpec[]};
}
export interface DKDSTopWorkspaceRuntime { register(spec:DKDSTopWorkspaceSpec):any; isSuper():boolean }

export interface DKDSScientificCurveSurfaceSpec {
  container?:any; /** Preferred geometry; Core renders compactly or recovers space instead of silently blanking. */ minWidth?:number; minHeight?:number; /** Hard lower bound used only when a surface is truly too small to draw. */ hardMinWidth?:number; hardMinHeight?:number; margin?:Partial<{top:number;right:number;bottom:number;left:number}>; xTitle?:string; yTitle?:string; yScaleType?:'linear'|'log'; renderPriority?:'frame'|'idle'|string; /** Multi-series plots get a Core-owned external legend by default. Its footprint is reserved inside the total plot size. */ legend?:false|{enabled?:boolean;placement?:'auto'|'top'|'bottom'|'right'|'left';interaction?:'isolate'|'none';maxRows?:number};
  xValue?:(point:any)=>number; yValue?:(point:any)=>number; yTickFormat?:(value:number)=>string; source?:string; interaction?:any; selectionTarget?:'series'|'point'; pointReference?:(context:{curve:DKDSScientificCurve;point:any;index:number;surface:DKDSScientificCurveSurface})=>DKDSSelectionReference|null; interactionBehavior?:DKDSInteractionBehaviorProfile|{activity?:string;bindings?:DKDSInteractionBehaviorBinding[];onIntent?:(context:any)=>boolean|void}; navigationTools?:boolean;
  getCurves:()=>DKDSScientificCurve[]; getMarkers?:()=>DKDSScientificMarker[]; getManipulators?:()=>DKDSPlotManipulator[]; getColorDomainValues?:()=>number[]; colorScale?:(context:any)=>any;
  getView?:()=>{xDomain?:number[]|null;yDomain?:number[]|null}; setView?:(view:{xDomain?:number[]|null;yDomain?:number[]|null},meta?:any)=>void;
  getRangeSelection?:()=>any; rangeSelectionTarget?:string; rangeSelectionType?:string; showMarkers?:()=>boolean; showWidth?:()=>boolean; getMarkerWidth?:(marker:DKDSScientificMarker)=>any;
  onColorScale?:(scale:any,meta?:any)=>void; onLegendChange?:(payload:{soloId:string;curveId:string;visibleIds:string[];surface:DKDSScientificCurveSurface;event?:Event})=>void; onDisplayScaleChanged?:(payload:{axis:'y';type:'linear'|'log';surface:DKDSScientificCurveSurface})=>void; onCurveSelect?:(payload:any)=>void; onCurveModifiedClick?:(payload:any)=>void; onCurveDoubleClick?:(payload:any)=>void;
  onMarkerSelect?:(payload:any)=>void; onMarkerDoubleClick?:(payload:any)=>void; onMarkerDelete?:(payload:any)=>void; onLockedMarkerAction?:(payload:any)=>void; onMarkerHover?:(payload:any)=>void;
  /** Generic direct manipulation lifecycle. Preview is pointer-rate visual feedback; commit is the only normal place to persist domain/project state. */
  onManipulationStart?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationPreview?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationCommit?:(payload:DKDSPlotManipulationPayload)=>void;
  onManipulationReset?:(payload:DKDSPlotManipulationPayload)=>void;
  onRangeStart?:(payload:any)=>void; onWheelZoomStart?:(payload:any)=>void; onRangeSelect?:(payload:any)=>void; onClearSelection?:(payload:any)=>void; onReset?:(payload?:any)=>void; onEmpty?:(payload:any)=>void; afterRender?:(payload:any)=>void;
}
export interface DKDSScientificLegendMetrics { enabled:boolean; placement:'none'|'auto'|'top'|'bottom'|'right'|'left'|'explicit'|string; count:number; rows:number; width:number; height:number; reserve:number; reason?:string; soloId?:string }
export interface DKDSScientificCurveSurface { readonly target:any; layoutDiagnostics():Readonly<{status:'initial'|'ready'|'compact'|'waiting'|string;width:number;height:number;preferredMinWidth:number;preferredMinHeight:number;hardMinWidth:number;hardMinHeight:number;fallbackApplied:boolean;compact:boolean;reason:string;legend:Readonly<DKDSScientificLegendMetrics>}>; legendLayout():Readonly<DKDSScientificLegendMetrics>; render(reason?:string):boolean; requestRender(reason?:string):void; fitToData(meta?:any):boolean; resetView(meta?:any):boolean; dispose():void }
export type DKDSScientificViewportAxis = 'x'|'y';
export interface DKDSScientificViewportState { xRange?:readonly [number,number]|null; yRange?:readonly [number,number]|null; revision?:number; source?:string }
export interface DKDSScientificViewportPolicy { enabled?:boolean; persist?:boolean; preserveOnReact?:boolean; key?:string; /** Cross-view numeric range propagation is opt-in. */ link?:boolean; /** Reuses the existing project-scoped Interaction transaction/link group. */ linkGroup?:string; /** Only these axes are eligible for linkage. */ linkedAxes?:readonly DKDSScientificViewportAxis[]; /** Scientific semantics are mandatory for an axis to link; unknown/incompatible axes fail closed. */ axes?:Partial<Record<DKDSScientificViewportAxis,DKDSScientificAxisSpec>> }
export interface DKDSScientificViewportEnvelope { readonly schema:'dkds.viewport-state.v1'; readonly sourceViewId:string; readonly revision:number; readonly axes:Partial<Record<DKDSScientificViewportAxis,Readonly<{range:readonly [number,number]|null;axis:DKDSScientificAxisSpec}>>> }
export interface DKDSScientificFocusPolicy { /** Set false when the plugin owns richer domain-specific selection paint; Interaction/Selection transport stays active. */ enabled?:boolean; activeOpacity?:number; inactiveOpacity?:number; activeLineWidth?:number; inactiveLineFactor?:number; pointInactiveOpacity?:number; pointSizeBoost?:number; pointMinSize?:number }
export interface DKDSScientificLegendPolicy { enabled?:boolean; selectOnClick?:boolean; selectOnDoubleClick?:boolean; /** Cross-view legend visibility propagation is opt-in. */ link?:boolean; /** Reuses the existing project-scoped Interaction link group. */ linkGroup?:string; /** Bounded stable series targets per legend action; Core caps this at 24. */ maxLinkedTargets?:number }
export interface DKDSScientificLegendVisibilityState { readonly schema:'dkds.legend-visibility-state.v1'; readonly sourceViewId:string; readonly revision:number; readonly mode:'isolate'|'restore'; readonly targets:readonly DKDSSelectionReference[] }
export interface DKDSScientificScalarFieldSourceScan { ref:DKDSSelectionReference; id?:string; type?:string; role?:string; meta?:Record<string,unknown> }
export interface DKDSScientificScalarFieldSpec { x?:readonly any[]; targets?:readonly any[]; y?:readonly any[]; vgs?:readonly any[]; z?:readonly (readonly any[])[]; matrix?:readonly (readonly any[])[]; xName?:string; yName?:string; valueName?:string; xUnit?:string; yUnit?:string; valueUnit?:string; xDimension?:string; yDimension?:string; valueDimension?:string; xQuantity?:string; yQuantity?:string; valueQuantity?:string; unit?:string; diverging?:boolean; colorscale?:string; sourceScans?:readonly (DKDSScientificScalarFieldSourceScan|DKDSSelectionReference|null)[]; sourceScanType?:string; metadata?:Record<string,unknown>; [key:string]:any }
export interface DKDSScientificScalarFieldOptions extends DKDSScientificPlotReferenceSpec { sourceScans?:readonly (DKDSScientificScalarFieldSourceScan|DKDSSelectionReference|null)[]; sourceScanType?:string; xName?:string; yName?:string; valueName?:string; xUnit?:string; yUnit?:string; valueUnit?:string; xDimension?:string; yDimension?:string; xQuantity?:string; yQuantity?:string; colorscale?:string; [key:string]:any }
export interface DKDSScientificPlotReferenceSpec { interaction?:DKDSInteractionRuntimeInstance; selectionTarget?:'point'|'series'; pointReference?:(context:{trace:any;traceIndex:number;pointIndex:number;customdata:any},view:any)=>DKDSSelectionReference|null; pointType?:string; axisSemantics?:Partial<Record<DKDSScientificViewportAxis,DKDSScientificAxisSpec>>; viewportPolicy?:DKDSScientificViewportPolicy; legendPolicy?:DKDSScientificLegendPolicy; focusPolicy?:DKDSScientificFocusPolicy; [key:string]:any }
export interface DKDSScientificPlotRuntime {
  create(target:any,spec:DKDSScientificCurveSurfaceSpec):DKDSScientificCurveSurface; createRenderer(target:any,spec?:any):any; attach(target:any,spec?:DKDSScientificPlotReferenceSpec):any;
  react(target:any,data?:any[],layout?:any,config?:any,spec?:DKDSScientificPlotReferenceSpec):any; scalarField(target:any,field?:DKDSScientificScalarFieldSpec,options?:DKDSScientificScalarFieldOptions):any; get(target:any):any; controller(target:any,name:string):any;
  resize(target:any):any; restyle(target:any,update:any,traces?:any):any; relayout(target:any,update:any):any; viewport(target:any):DKDSScientificViewportState|null; setViewport(target:any,state:DKDSScientificViewportState,meta?:any):Promise<DKDSScientificViewportState>|false; resetViewport(target:any,meta?:any):Promise<DKDSScientificViewportState>|false;
  pin(target:any,id:string,meta?:any):boolean; unpin(target:any,id:string,meta?:any):boolean; pins(target:any):any[]; stats(target:any):any; /** Returns the Core-computed external legend footprint so adjacent plugin UI can reserve space without guessing. */ legendMetrics(target:any):DKDSScientificLegendMetrics|null; suspend(target:any,options?:any):boolean; resume(target:any,options?:any):boolean; lifecycleState():any; saveImage(target:any,baseName:string,format?:string,options?:any):any; purge(target:any):any;
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
export interface DKDSDataImportLineChunk { offset:number; bytesRead:number; totalSize:number; targetBytes:number; eof:boolean; startLine:number; endLine:number; tail?:boolean }
export interface DKDSDataImportStreamSummary { path:string; name:string; size:number; bytesRead:number; chunks:number; truncated:boolean; encoding:string; lineCount:number }
export interface DKDSDataImporterStreamParser {
  pushLines(lines:string[],meta:Readonly<DKDSDataImportLineChunk>):void|Promise<void>;
  finish(meta:Readonly<DKDSDataImportStreamSummary>):DKDSDataImporterResult|Promise<DKDSDataImporterResult>;
}
export interface DKDSDataImporterSpec {
  id?:string; name?:string; description?:string; extensions?:string[]; preferredConsumers?:string[]; outputKinds?:string[]; outputTypes?:string[];
  editor?:'flexible-iv'|'generic-table'|string; priority?:number;
  defaultOptions?:()=>any; normalizeOptions?:(value:any)=>any; inspect?:(file:any,options?:any)=>any;
  score?:(file:any,context?:DKDSDataImporterContext)=>number; estimateArtifacts?:(file:any,options?:any,inspection?:any)=>number;
  parse?:(file:any,options?:any)=>any; parseArtifacts?:(file:any,options?:any)=>DKDSDataImporterResult|Promise<DKDSDataImporterResult>;
  /** Optional bounded line-stream parser. Core owns file tokens/chunking/backpressure; returning null requests the normal full-text parseArtifacts path for that file type. */
  createStreamParser?:(file:any,options?:any,inspection?:any)=>DKDSDataImporterStreamParser|null;
}
export interface DKDSDialogMeta { label:string; value:any }
export interface DKDSDialogAction { id:string; label:string; kind?:'primary'|'secondary'|'danger'; autofocus?:boolean }
export interface DKDSDialogSpec { tone?:'info'|'warning'|'error'|'success'; title?:string; subtitle?:string; message?:string; detail?:string; detailLabel?:string; detailOpen?:boolean; meta?:DKDSDialogMeta[]; actions?:DKDSDialogAction[]; dismissible?:boolean; dismissOnBackdrop?:boolean; defaultAction?:string; cancelAction?:string; confirmLabel?:string; cancelLabel?:string; okLabel?:string; destructive?:boolean; input?:{type?:'text'|'number'|'select';label?:string;value?:any;placeholder?:string;options?:Array<any>} }
export interface DKDSDialogRuntime { show(spec?:DKDSDialogSpec):Promise<any>; alert(spec?:DKDSDialogSpec):Promise<any>; confirm(spec?:DKDSDialogSpec):Promise<boolean>; prompt(spec?:DKDSDialogSpec):Promise<string|null> }

export interface DKDSDataImportWorkbench { open(options?:{targets?:string[];importerId?:string;mode?:'scoped'|'global';consumerId?:string;consumerLabel?:string;consumerIcon?:string;accepts?:string[]}):any }
export interface DKDSDataImportersCapability { register(id:string,spec:DKDSDataImporterSpec):any; list():any[] }


export interface DKDSSeriesDescriptor { id:string; label:string; color:string; group?:string; visible?:boolean; metadata?:Record<string,unknown> }
export interface DKDSSeriesRegistry { register(spec:string|Partial<DKDSSeriesDescriptor>&Record<string,any>,index?:number):DKDSSeriesDescriptor; normalize(series?:Array<string|Partial<DKDSSeriesDescriptor>&Record<string,any>>):DKDSSeriesDescriptor[]; get(id:string):DKDSSeriesDescriptor|null; label(id:string,fallback?:string):string; color(id:string,fallback?:string):string; setVisible(id:string,visible?:boolean):boolean; list(query?:{group?:string;visible?:boolean}):DKDSSeriesDescriptor[]; snapshot():{owner:string;count:number;rows:readonly DKDSSeriesDescriptor[];series:readonly DKDSSeriesDescriptor[]}; clear():void }
export interface DKDSLegendGroup { readonly id:string; register(surface:any,series?:any[]):()=>void; setSeries(surface:any,series?:any[]):any[]; entries():any[]; setVisible(seriesId:string,visible?:boolean):boolean; isolate(seriesId?:string):string; showAll():boolean; toggle(seriesId:string):boolean; visibleIds():string[]; subscribe(fn:(snapshot:any,event:any)=>void,options?:{immediate?:boolean}):()=>void; snapshot():any; dispose():void }
export interface DKDSActiveLayoutSolver { solve(spec:{container?:Element|string;width?:number;height?:number;count?:number;columns?:number|'auto';minItemWidth?:number;minItemHeight?:number;maxColumns?:number;gap?:number;aspectRatio?:number;maxItemHeight?:number}):{columns:number;rows:number;itemWidth:number;itemHeight:number;gap:number;overflowY:boolean} }
export interface DKDSMovableSurfaceSpec { id?:string; target:Element|string; handle:Element|string; bounds?:Element|string; persist?:boolean; resetOnDoubleClick?:boolean }
export interface DKDSMovableSurface { readonly target:Element; readonly handle:Element; apply(position:{x:number;y:number},options?:{persist?:boolean;clamp?:boolean}):{x:number;y:number}; clamp(options?:{persist?:boolean}):{x:number;y:number}; reset(options?:{persist?:boolean}):{x:number;y:number}; dispose():void }
export type DKDSGroupPlotDensity = 'comfortable'|'compact';

export interface DKDSPlotViewSpec {
  plot?:Element|string; header?:Element|string; actionsHost?:Element|string;
  title?:string; titleHtml?:string; fileStem?:string|((view:DKDSPlotView)=>string);
  csv?:boolean|((view:DKDSPlotView)=>string); copy?:boolean; images?:boolean; portable?:boolean;
  /** One declared placement is fixed and has no position chooser; multiple placements expose the Core chooser. */
  placements?:Array<'home'|'sticky'|'float'|'global'|'left'|'right'|'bottom'>; defaultPlacement?:string; stateVersion?:string; snap?:boolean;
  contentAspectRatio?:number; contentMinHeight?:number; contentMaxHeight?:number;
  [key:string]:any;
}
export interface DKDSPlotView { readonly id:string; readonly card:Element; readonly plot:Element; configure(spec?:DKDSPlotViewSpec):DKDSPlotView; resize(reason?:string):DKDSPlotView; dispose():void; }
export interface DKDSPlotViewRuntime { bind(id:string,card:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView; hydrate(root:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView[]; observe(root:Element|string,spec?:DKDSPlotViewSpec):()=>void; get(id:string):DKDSPlotView|null; }

export interface DKDSGroupPlot { setItems(items:any[]):DKDSGroupPlot; layout():any; setColumns(value:number|'auto'):any; setDensity(value:DKDSGroupPlotDensity):any; diagnostics():any; dispose():void }
export interface DKDSTooltipRuntime { show(spec:{anchor?:Element|string;point?:{x?:number;y?:number;clientX?:number;clientY?:number};title?:string;text?:string;rows?:Array<{label?:string;key?:string;value:any}>}):HTMLElement; hide():void; bind(target:Element|string,spec:any):()=>void }

export interface DKDSEditHistoryEntry { label:string; createdAt?:number; updatedAt?:number; scope?:string; source?:string; metadata?:Record<string,any> }
export interface DKDSEditHistoryState { canUndo:boolean; canRedo:boolean; undoLabel?:string; redoLabel?:string; past?:DKDSEditHistoryEntry[]; future?:DKDSEditHistoryEntry[]; scope?:string; source?:string }
export interface DKDSEditContribution { id:string; order?:number; canUndo?:()=>boolean; canRedo?:()=>boolean; historyState?:()=>DKDSEditHistoryState|Promise<DKDSEditHistoryState>; undo?:()=>boolean|Promise<boolean>; redo?:()=>boolean|Promise<boolean>; deselect?:()=>boolean|Promise<boolean>; actions?:Record<string,(payload?:any)=>any> }
export interface DKDSEditRuntime { register(spec:DKDSEditContribution):any; changed(detail?:{reason?:string;[key:string]:any}):boolean }
export interface DKDSProjectHistoryRuntime { state():any; undo():Promise<any>|any; redo():Promise<any>|any; commitArtifactMutation(payload:{label?:string;before:{upserts?:any[];removedIds?:string[]};after:{upserts?:any[];removedIds?:string[]}}):Promise<any>|any }
export interface DKDSDesignSystem { readonly name:'DK Data Studio Design System'; readonly version:'1.19'; readonly tokens:Readonly<Record<string,string>>; readonly roles:Readonly<Record<string,string>>; readonly classes:Readonly<Record<string,string>>; readonly capabilities:Readonly<Record<string,boolean>>; token(name:string):string; cssVar(name:string,fallback?:string):string }

export type DKDSThemeAppearanceTokenKey = 'canvas'|'surface'|'surfaceSoft'|'surfaceHover'|'surfaceElevated'|'surfaceSidebar'|'controlBg'|'controlHover'|'divider'|'dividerHover'|'controlBorder'|'controlBorderHover'|'scrollbar'|'scrollbarHover'|'text'|'textSoft'|'muted'|'accent'|'accentHover'|'accentSoft'|'accentAlt'|'accentAltHover'|'accentAltSoft'|'focus'|'success'|'successSoft'|'warning'|'warningSoft'|'danger'|'dangerSoft'|'info'|'infoSoft'|'selectionSurface'|'selectionText'|'selectionBorder'|'activeSurface'|'activeText'|'disabledSurface'|'disabledText'|'shadow1'|'shadow2'|'shadowFloat'|'radius'|'radiusLg';
export type DKDSThemeMotionTokenKey = 'motionFast'|'motionNormal'|'motionSlow'|'easeStandard'|'easeEmphasized'|'hoverLift'|'pressScale';
export type DKDSThemeMaterialTokenKey = 'materialBlur'|'materialBlurStrong'|'materialSaturation'|'materialTintOpacity'|'specularHighlight'|'innerHighlight'|'glassEdge'|'materialNoiseOpacity';
export type DKDSThemeTokenKey = DKDSThemeAppearanceTokenKey|DKDSThemeMotionTokenKey|DKDSThemeMaterialTokenKey;
export type DKDSThemeMaterialRole = 'chrome'|'sidebar'|'surface'|'elevated'|'popover'|'control'|'floating';
export type DKDSThemeMaterialContext = 'compact'|'panel'|'dialog'|'workspace-modal';
export type DKDSThemeComponentContext = 'standalone'|'grouped';
export type DKDSThemeShadow = string;
export type DKDSThemeLogicalLength = number;
export type DKDSThemeDuration = number;
export type DKDSThemeOpacity = number;
export type DKDSThemeSaturation = number;
export type DKDSThemeScale = number;
export type DKDSThemeColor = string;
export type DKDSThemeAppearanceTokenMap = Partial<Record<DKDSThemeAppearanceTokenKey,string|number>>;
export type DKDSThemeTokenMap = Partial<Record<DKDSThemeTokenKey,string|number>>;
export interface DKDSThemeMotionSpec { motionFast?:DKDSThemeDuration; motionNormal?:DKDSThemeDuration; motionSlow?:DKDSThemeDuration; easeStandard?:string; easeEmphasized?:string; hoverLift?:DKDSThemeLogicalLength; pressScale?:DKDSThemeScale }
export interface DKDSThemeMaterialValues { materialBlur?:DKDSThemeLogicalLength; materialBlurStrong?:DKDSThemeLogicalLength; materialSaturation?:DKDSThemeSaturation; materialTintOpacity?:DKDSThemeOpacity; specularHighlight?:DKDSThemeColor; innerHighlight?:DKDSThemeColor; glassEdge?:DKDSThemeColor; materialNoiseOpacity?:DKDSThemeOpacity }
export interface DKDSThemeMaterialRoleSpec extends DKDSThemeMaterialValues { contexts?:Partial<Record<DKDSThemeMaterialContext,DKDSThemeMaterialValues>> }
export interface DKDSThemeMaterialSpec extends DKDSThemeMaterialValues { contexts?:Partial<Record<DKDSThemeMaterialContext,DKDSThemeMaterialValues>>; roles?:Partial<Record<DKDSThemeMaterialRole,DKDSThemeMaterialRoleSpec>> }
export interface DKDSThemeRoleAppearanceValues { surface?:DKDSThemeColor; border?:DKDSThemeColor; text?:DKDSThemeColor }
export type DKDSThemeAppearanceComponent = 'tab'|'toolbarAction'|'toolbarGroup'|'panelHeader'|'inspectorHeader'|'menuItem'|'chip'|'statusBar'|'floatingChrome'|'field';
export type DKDSThemeComponentVariant = 'primary'|'secondary'|'selected'|'active'|'quiet'|'destructive'|'info'|'success'|'warning'|'danger';
export interface DKDSThemeComponentAppearanceLeaf { surface?:DKDSThemeColor; surfaceHover?:DKDSThemeColor; surfaceActive?:DKDSThemeColor; surfaceSelected?:DKDSThemeColor; text?:DKDSThemeColor; textSoft?:DKDSThemeColor; textActive?:DKDSThemeColor; textSelected?:DKDSThemeColor; border?:DKDSThemeColor; borderHover?:DKDSThemeColor; borderActive?:DKDSThemeColor; indicator?:DKDSThemeColor; shadow?:DKDSThemeShadow; shadowHover?:DKDSThemeShadow; shadowActive?:DKDSThemeShadow; shadowSelected?:DKDSThemeShadow; radius?:DKDSThemeLogicalLength; variants?:Partial<Record<DKDSThemeComponentVariant,Omit<DKDSThemeComponentAppearanceLeaf,'variants'>>> }
export interface DKDSThemeComponentAppearanceValues extends DKDSThemeComponentAppearanceLeaf { contexts?:Partial<Record<DKDSThemeComponentContext,DKDSThemeComponentAppearanceLeaf>>; roles?:Partial<Record<DKDSThemeMaterialRole,DKDSThemeComponentAppearanceLeaf & {contexts?:Partial<Record<DKDSThemeComponentContext,DKDSThemeComponentAppearanceLeaf>>}>> }
export interface DKDSThemeEffectSpec { headerGradientStart?:DKDSThemeColor; headerGradientEnd?:DKDSThemeColor; accentGlow?:DKDSThemeColor; edgeGlow?:DKDSThemeColor; ambientTint?:DKDSThemeColor; glowIntensity?:DKDSThemeOpacity; glowRadius?:DKDSThemeLogicalLength; gradientDirection?:'horizontal'|'vertical'|'diagonal-down'|'diagonal-up' }
export interface DKDSThemeAppearanceSpec { roles?:Partial<Record<DKDSThemeMaterialRole,DKDSThemeRoleAppearanceValues>>; components?:Partial<Record<DKDSThemeAppearanceComponent,DKDSThemeComponentAppearanceValues>> }
export interface DKDSThemeScientificSpec { seriesPalette?:DKDSThemeColor[]; mode?:'fallback-only' }
export interface DKDSThemeModeSpec { tokens?:DKDSThemeAppearanceTokenMap; motion?:DKDSThemeMotionSpec; material?:DKDSThemeMaterialSpec; appearance?:DKDSThemeAppearanceSpec; effects?:DKDSThemeEffectSpec; scientific?:DKDSThemeScientificSpec }
export interface DKDSThemeSettingTarget { scope:'token'|'motion'|'material'|'recipe'; key?:DKDSThemeAppearanceTokenKey|DKDSThemeMotionTokenKey|DKDSThemeMaterialTokenKey; role?:DKDSThemeMaterialRole; mode?:'all'|'light'|'dark' }
export interface DKDSThemeSettingSpec { id:string; label?:string; description?:string; target:DKDSThemeSettingTarget; type?:'range'|'number'|'select'; min?:number; max?:number; step?:number; options?:Array<string|{value:string;label?:string}> }
export interface DKDSThemeProfileSpec {
  label?:string;
  modes:{light:DKDSThemeModeSpec;dark:DKDSThemeModeSpec};
  motion?:DKDSThemeMotionSpec;
  material?:DKDSThemeMaterialSpec;
  /** Optional semantic appearance overrides per Core-owned Material Role. Theme never selects DOM; Core selects the role. */
  appearance?:DKDSThemeAppearanceSpec;
  /** Optional Core-rendered bounded gradients/glows. Theme never supplies CSS selectors, filters, shadows, pseudo-elements, or keyframes. */
  effects?:DKDSThemeEffectSpec;
  /** Optional defaults for scientific presentation. Explicit plugin/user series colors always win. */
  scientific?:DKDSThemeScientificSpec;
  /** Theme-owned optical policy. builtin.default is fully clear; glass themes opt into soft/liquid recipes explicitly. */
  recipes?:Partial<Record<DKDSThemeMaterialRole,DKDSMaterialRecipe>> & { contexts?:Partial<Record<DKDSThemeMaterialContext,Partial<Record<DKDSThemeMaterialRole,DKDSMaterialRecipe>>>> };
  /** Declarative Core-rendered settings. Theme plugins never own their settings DOM. */
  settings?:DKDSThemeSettingSpec[];
  metadata?:Record<string,any>;
}
export type DKDSThemeCoverageStatus = 'NOT_PRESENT'|'MANAGED'|'PARTIAL'|'UNMANAGED'|'ROLE_MISMATCH';
export interface DKDSThemeCoverageArea { id:string; label:string; role:DKDSThemeMaterialRole; selector:string; count:number; managed:number; status:DKDSThemeCoverageStatus }
export interface DKDSThemeCoverageIssue { severity:'warning'; kind:'unmanaged-visual'; source:string; pluginId:string; selector:string; property:string; value:string; reason:string }
export type DKDSThemeMaterialRenderStatus='REAL_MATERIAL'|'MATERIAL_DISABLED'|'MATERIAL_SEMANTIC_OVERRIDE'|'ROLE_MISSING'|'RECIPE_MISSING'|'BACKDROP_FILTER_NONE'|'OPAQUE_MATERIAL_OCCLUSION'|'BROKEN_MATERIAL_RENDERER'|'BROKEN_OPTICAL_RENDERER'|'LOW_CONTRAST_MATERIAL'|'ENGINE_UNSUPPORTED';
export type DKDSMaterialRecipe='clear'|'thin-glass'|'soft-glass'|'liquid-glass';
export interface DKDSThemeRendererCapabilities { version:string; recipeInstalled:boolean; engine:{backdropFilter:boolean;webkitBackdropFilter:boolean;colorMix:boolean;radialGradient:boolean;maskImage:boolean;pointerEvents:boolean}; policy:{roleToRecipe:Record<DKDSThemeMaterialRole,DKDSMaterialRecipe>;recipes:readonly DKDSMaterialRecipe[]}; renderer:{backdropBlur:boolean;saturation:boolean;noise:boolean;glassEdge:boolean;innerHighlight:boolean;specularHighlight:boolean;webMaterial:boolean;nativeBlur:boolean;thinGlass:boolean;nonUniformBlur:boolean;edgeRefraction:boolean;dynamicSpecular:boolean;liquidGlass:boolean;materialContexts:boolean}; recipes:Record<DKDSMaterialRecipe,boolean>; roles:Record<DKDSThemeMaterialRole,boolean>; materialContexts?:readonly DKDSThemeMaterialContext[] }
export interface DKDSThemeControlContrastIssue { tag:string; id:string; className:string; text:string; foreground:string; background:string; effectiveBackground:{r:number;g:number;b:number;a:number}; ratio:number; minimum:number; disabled:boolean }
export interface DKDSThemeConsumptionSlot { path:string; fallback:string }
export interface DKDSThemeConsumptionReport { version:string; contractVersion:string; components:Partial<Record<DKDSThemeAppearanceComponent,{label:string;selector:string;slots:Record<string,DKDSThemeConsumptionSlot>}>>; semantic:Record<string,string>; scientific:{mode:'fallback-only';precedence:readonly string[]} }
export interface DKDSThemeCoverageReport { version:string; contractVersion:string; profile:string; mode:'light'|'dark'; rendererCapabilities:DKDSThemeRendererCapabilities|null; core:ReadonlyArray<DKDSThemeCoverageArea & {renderStatus:string;realMaterial:number;occludedMaterial:number;brokenMaterial:number;render:ReadonlyArray<{status:DKDSThemeMaterialRenderStatus;role:string;expectedRole:string;recipe:DKDSMaterialRecipe|string;expectedBlur:string;expectedBlurStrong?:string;expectedSaturation:string;backdropFilter:string;backgroundColor:string;occlusionSource?:''|'self'|'child';opaqueParent?:any;occludingChild?:any}>}>; appearance:{version:string;rows:ReadonlyArray<{component:DKDSThemeAppearanceComponent;label:string;count:number;managed:number;authoredSlots:string[];status:string}>;authored:ReadonlyArray<{component:string;slot:string;path:string;status:'CONSUMED'|'AUTHORED_BUT_UNUSED'}>;consumption:DKDSThemeConsumptionReport;summary:{components:number;present:number;managed:number;authoredUnused:number;ok:boolean}}; contrast:{checked:number;issues:ReadonlyArray<DKDSThemeControlContrastIssue>;ok:boolean}; plugins:{issues:ReadonlyArray<DKDSThemeCoverageIssue>;summary:{total:number;warnings:number;plugins:string[]}}; summary:{areas:number;managed:number;partial:number;unmanaged:number;realMaterial:number;brokenMaterial:number;occludedMaterial:number;componentTypes:number;presentComponentTypes:number;managedComponents:number;authoredUnused:number;appearanceOk:boolean;lowContrastControls:number;pluginIssues:number;rendererOk:boolean;ok:boolean} }
export interface DKDSThemeCapability {
  readonly contractVersion:'3.10.0';
  register(id:string,spec:DKDSThemeProfileSpec):{id:string;dispose?:()=>void};
  activate(id:string):string;
  current():{mode:'light'|'dark';profile:string};
  list():Array<{id:string;label:string;owner:string;metadata?:Record<string,any>;settings?:number;recipes?:Partial<Record<DKDSThemeMaterialRole,DKDSMaterialRecipe>>}>;
  tokens():Readonly<Record<DKDSThemeTokenKey,string>>|Record<string,string>;
  materialRoles():DKDSThemeMaterialRole[];
  materialContexts():DKDSThemeMaterialContext[];
  componentContexts():DKDSThemeComponentContext[];
  materials(platform?:'web'|'native'):{base:Readonly<Record<string,string|number>>;roles:Partial<Record<DKDSThemeMaterialRole,Readonly<Record<string,string|number>>>>;contexts?:Partial<Record<DKDSThemeMaterialContext,Readonly<Record<string,string|number>>>>;roleContexts?:Partial<Record<DKDSThemeMaterialRole,Partial<Record<DKDSThemeMaterialContext,Readonly<Record<string,string|number>>>>>};
  materialFor(role:DKDSThemeMaterialRole,context?:DKDSThemeMaterialContext,platform?:'web'|'native'):Readonly<Record<string,string|number>>;
  appearanceRoles():{roles:Partial<Record<DKDSThemeMaterialRole,Readonly<DKDSThemeRoleAppearanceValues>>>;components:Partial<Record<DKDSThemeAppearanceComponent,Readonly<DKDSThemeComponentAppearanceValues>>>};
  appearanceComponents():Partial<Record<DKDSThemeAppearanceComponent,Readonly<DKDSThemeComponentAppearanceValues>>>;
  effects():Readonly<DKDSThemeEffectSpec>;
  consumption():DKDSThemeConsumptionReport;
  scientific():{seriesPalette:readonly string[];mode:'fallback-only';precedence:readonly string[]};
  recipePolicy(id?:string):Partial<Record<DKDSThemeMaterialRole,DKDSMaterialRecipe>>;
  recipeFor(role:DKDSThemeMaterialRole,context?:DKDSThemeMaterialContext,id?:string,mode?:'light'|'dark'):DKDSMaterialRecipe;
  settings(id?:string):Array<DKDSThemeSettingSpec & {value:any}>;
  setSetting(id:string,key:string,value:any):any;
  resetSettings(id?:string):boolean;
  platformUnits():Readonly<{length:string;duration:string;opacity:string;saturation:string;scale:string}>;
  coverage():DKDSThemeCoverageReport;
}

export interface DKDSCommandArtifactRef { artifactId:string; role?:string; label?:string; artifactRevision:number; fingerprint:string }
export interface DKDSCommandAlgorithmRef { category?:string; id:string; version:string; provider?:string }
export interface DKDSDomainCommandRecord { executionId:string; source:string; command:{id:string;pluginId:string;pluginVersion:string;domain:string;title:string;version:string}; arguments:any; inputs:readonly DKDSCommandArtifactRef[]; algorithm:DKDSCommandAlgorithmRef|null; parameters:any; replayable:boolean; destructive:boolean; replayOf?:string|null; startedAt:number; completedAt:number; durationMs:number; status:'completed'|'failed'|'cancelled'; outputs:readonly DKDSCommandArtifactRef[]; error:string|null }
export interface DKDSDomainCommandMeta {
  domain:string; version:string; title?:string; description?:string; replayable?:boolean; destructive?:boolean; inputSchema?:any;
  /** Canonicalize omitted UI defaults into explicit replay arguments before execution. */
  captureArgs?:(payload:any)=>any;
  /** Return Artifact ids/refs whose revisions must be captured before execution. */
  inputs?:(payload:any)=>Array<string|{artifactId?:string;id?:string;role?:string;label?:string}>;
  /** Replayable algorithm-backed commands must return an exact version. */
  algorithm?:(payload:any)=>DKDSCommandAlgorithmRef|null;
  parameters?:(payload:any)=>any;
  outputs?:(result:any,payload:any)=>Array<string|{artifactId?:string;id?:string;role?:string;label?:string}>;
  replayArgs?:(capturedArgs:any,record:DKDSDomainCommandRecord)=>any;
}
export interface DKDSCommandRegistrationMeta { domain?:string; version?:string; title?:string; description?:string; destructive?:boolean; inputSchema?:any; domainCommand?:false|DKDSDomainCommandMeta }
export interface DKDSCommandDescriptor { id:string; pluginId:string; pluginVersion:string; domain:string; title:string; description:string; version:string; replayable:boolean; destructive:boolean; inputSchema:any }
export interface DKDSCommandsRuntime {
  register(id:string,handler:(payload?:any,execution?:{executionId:string;source:string})=>any,meta?:DKDSCommandRegistrationMeta):any;
  run(id:string,payload?:any):Promise<any>; get(id:string):DKDSCommandDescriptor|null; list():DKDSCommandDescriptor[];
  history(query?:{commandId?:string;status?:string;source?:string;limit?:number}):DKDSDomainCommandRecord[];
  replay(executionId:string,options?:{source?:string;requireRevisions?:boolean}):Promise<any>;
}

export interface DKDSMenuAvailability { visible?:boolean; enabled?:boolean; reason?:string }
export interface DKDSMenuAvailabilityContext { host:DKDSPluginHost; activityId:string|null; pluginId:string; menu:string }
export interface DKDSMenuItemSpec { id:string; menu?:string; label:string; order?:number; activity?:string; command?:string; onClick?:(event?:Event)=>any; availability?:boolean|DKDSMenuAvailability|((context:DKDSMenuAvailabilityContext)=>boolean|DKDSMenuAvailability) }
export interface DKDSMenusRuntime { add(spec:DKDSMenuItemSpec):HTMLButtonElement }

export interface DKDSPluginContext {
  readonly apiVersion:'1.19.0'; readonly manifest:Readonly<DKDSManifest>;
  readonly runtime:{appVersion:string;isAuxiliaryWindow:boolean;isWebClient:boolean};
  readonly status:{set(text:string):void};
  readonly events:{on(name:string,fn:(payload:any)=>void):()=>void;emit(name:string,payload?:any):boolean};
  readonly commands:DKDSCommandsRuntime;
  readonly history:DKDSProjectHistoryRuntime;
  readonly project:{registerSlice(key:string,hooks:{serialize?():any;restore?(data:any,context?:{pluginData:Record<string,any>}):void;reset?(context?:{pluginData?:Record<string,any>;reason?:string}):void}):any;current():any;create():any;capture():void};
  readonly workspace:{openPage(id:string):any;closeCurrentWindow():any;isAuxiliary():boolean};
  readonly io:any;
  readonly science:DKDSScienceRuntime;
  readonly tasks:DKDSTaskRuntime|null;
  /** Cache/measurement callbacks execute at most once per facade call; null and undefined are valid results. Rejected cached Promises are evicted for retry. */
  readonly performance:{memoWeak(namespace:string,target:any,key:any,compute:()=>any,options?:any):any;memo(namespace:string,key:any,compute:()=>any,options?:any):any;stage(namespace:string,revision:any,parameterKey:any,compute:()=>any,options?:any):any;configure(namespace:string,spec?:any):any;trim(namespace:string,options?:any):any;trimAll(options?:any):any;snapshot():any;measure(namespace:string,fn:()=>any):any;skip(namespace:string,count?:number):any;metric(namespace:string):any};
  readonly services:DKDSServiceRegistry;
  readonly modules:{get?(id:string):any;require(id:string):any;define?(id:string,value:any):any};
  readonly capabilities:{register(id:string,spec:any):any;get(id:string):any;require(id:string,options?:any):any;proxy(id:string):any;list(query?:any):any[];invoke(id:string,method:string,...args:any[]):any;watch(fn:(event:any)=>void,options?:any):()=>void;snapshot():any};
  readonly state:{create<T=any>(initial:T,options?:any):DKDSStateStore<T>};
  readonly data:{
    model:DKDSDataModelRuntime; formula:any; sources:DKDSDataSourcesCapability; importWorkbench:DKDSDataImportWorkbench; flow:any; reactive:DKDSReactiveRuntime;
    importers:DKDSDataImportersCapability; exporters:any; transformers:any; analyzers:any;
    pipeline:{version:string;register(id:string,spec:any):any;unregister(id:string):any;get(id:string):any;list(query?:any):any[];run(id:string,input:any,options?:any):Promise<any>;runSync(id:string,input:any,options?:any):any;runPlan(plan:any,input:any,options?:any):any;snapshot():any};
    transforms:{version:string;register(id:string,spec:any):any;unregister(id:string):any;get(id:string):any;resolve(value:any):any;list(query?:any):any[];runCurve(id:string,input:any,options?:any):any;runScalarField(id:string,input:any,options?:any):any;curveStageId(id:string):string;fieldStageId(id:string):string};
    artifacts:DKDSArtifactStore; entities:any;
    types:{register(id:string,spec:any):any;unregister?(id:string):any;get(id:string):any;list(query?:any):any[];isA(type:string,parent:string):boolean;describe(type:string,value:any):string;selection?(type:string,value:any,options?:any):any}
  };
  readonly workflow:{run(recipe:any,options?:any):any;buildSequentialRecipe(spec:any):any;processors:{register(id:string,spec:any):any;list():any[]};analyzers:{register(id:string,spec:any):any;list():any[]};recipes:{register(id:string,recipe:any):any;list():any[]}};
  readonly charts:{register(id:string,spec:any):any;list():any[]};
  readonly analysis:{
    providers:{register(id:string,spec:any):any;list():any[];get(id:string):any};
    algorithms:{version:string;register(id:string,spec:any):any;unregister(id:string,version?:string,category?:string):any;list(query?:any):any[];resolve(ref:string|DKDSAlgorithmRef,query?:any):any;versions(ref:any,query?:any):any[];diagnose(ref:any,query?:any):any;lock(ref:any,query?:any):DKDSAlgorithmRef;run(ref:any,input:any,options?:any):any;provenance(ref:any,query?:any):any;preferred(category:string,id:string):string;setPreferred(ref:any,query?:any):any;clearPreferred(category:string,id:string):any;locate(ref:any):Promise<any>;recover(ref:any,candidate?:any):Promise<any>;snapshot():any};
  };
  readonly parameters:{render(container:any,schema:any,options?:any):any;validate(schema:any,values:any,context?:any):any;defaults(schema:any,initial?:any):any};
  readonly ui:{
    dom:DKDSDomRuntime; components:{mount(container:any,spec:any,context?:any):any;escape(value:any):string;action(spec:any):HTMLButtonElement|null;actionGroup(spec:any):HTMLElement|null;tabs(spec:any):HTMLElement|null;surfaceHeader(spec:any):HTMLElement|null;field(spec:any):HTMLElement|null;hydrate(root?:any):any};
    scientificPlot:DKDSScientificPlotRuntime; series:DKDSSeriesRegistry; legends:{group(id?:string,spec?:any):DKDSLegendGroup;get(id:string):DKDSLegendGroup|null}; groupPlots:{create(container:Element|string,spec?:any):DKDSGroupPlot}; groupArea:DKDSGroupAreaRuntime; tooltips:DKDSTooltipRuntime; plotViews:DKDSPlotViewRuntime; tables:DKDSTableRuntime; settings:DKDSSettingsRuntime; dialogs:DKDSDialogRuntime; selection:DKDSSelectionRuntime; interaction:DKDSInteractionRuntime; interactions:any; interactionBehaviors:DKDSInteractionBehaviorRuntime; contextMenus:any;
    /** Canonical runtime facade for manifest requirement `ui.workspace` / capability label `ui.plugin-workspace`. There is intentionally no `ctx.ui.pluginWorkspace`. */
    workspaceSurface:DKDSPluginWorkspaceRuntime & {compose(root:any,spec?:DKDSPluginWorkspaceCreateSpec):DKDSPluginWorkspace;roles:Readonly<{PRIMARY:'primary';PRIME:'prime';SUB:'sub'}>;}; grid:DKDSGridRuntime; portable:any; layout:{split(spec:DKDSSplitSpec):DKDSSplitController;move(spec:DKDSMovableSurfaceSpec):DKDSMovableSurface;solve(spec:Parameters<DKDSActiveLayoutSolver['solve']>[0]):ReturnType<DKDSActiveLayoutSolver['solve']>;[key:string]:any}; actions:any;
    activities:{add(spec:DKDSActivitySpec):any;activate(id:string):any;active():string};
    topWorkspace:DKDSTopWorkspaceRuntime; toolbar:any; statusBar:DKDSStatusBarRuntime; mainTools:any; menus:DKDSMenusRuntime; sidebar:any; inspectors:any; groupCharts:any; groupViews:any; mainViews:any; selectionMenus:any; mainOverlays:any; shortcuts:any;
    pages:{add(spec:{id:string;pageId?:string;html?:string;label?:string;title?:string;description?:string;icon?:string;order?:number;primary?:boolean;presentation?:'activity'|'toolbar';toolbar?:boolean;className?:string;activity?:string;activityId?:string;onOpen?:(context:any)=>any}):HTMLElement}; panels:any; styles:any; theme:DKDSThemeCapability; edit:DKDSEditRuntime; designSystem:DKDSDesignSystem
  };
}
export interface DKDSPluginRegistry { define(manifest:DKDSManifest,activate:(ctx:DKDSPluginContext)=>DKDSPluginInstance|Promise<DKDSPluginInstance>|void|Promise<void>):void }
declare global { const DKDSPlugins:DKDSPluginRegistry; interface Window { DKDSPlugins:DKDSPluginRegistry } }
