export type DKDSDisposable = { dispose?(): void } | (() => void) | void;
export type DKDSPlatformPresentationMode = 'shared'|'adaptive'|'custom';
export interface DKDSPlatformPresentationPolicy { mode:DKDSPlatformPresentationMode; styles?:string[]; scripts?:string[] }
export interface DKDSPlatformPresentationContract { desktop:DKDSPlatformPresentationPolicy; mobile:DKDSPlatformPresentationPolicy }
export type DKDSPluginInstance = { deactivate?(): void | Promise<void> };

export type DKDSTaskState='queued'|'running'|'completed'|'failed'|'cancelled';
export interface DKDSTaskProgress { readonly fraction?:number; readonly stage?:string; readonly label?:string; readonly completed?:number; readonly total?:number }
export interface DKDSTaskSubmitOptions<T=any>{ key?:string; latest?:boolean; generation?:number; publish?:(result:T,meta:{id:string;generation:number;key:string})=>void }
export interface DKDSTaskHandle<T=any>{ readonly id:string; readonly generation:number; readonly state:DKDSTaskState; readonly progress:DKDSTaskProgress|null; readonly promise:Promise<T>; cancel(reason?:string):boolean; onProgress(listener:(progress:DKDSTaskProgress)=>void):()=>void }
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
export interface DKDSDomainAdapterDescriptor { readonly ref:string; readonly id:string; readonly owner:string; readonly version:string; readonly title:string; readonly access:'dependency'|'public'|string; readonly actions:readonly string[]; readonly revision:number }
export interface DKDSDomainAdapterSnapshot<T=any> { readonly descriptor:DKDSDomainAdapterDescriptor; readonly state:T }
export interface DKDSDomainAdapterEvent { readonly type:string; readonly reason:string; readonly revision:number; readonly ref:string; readonly owner:string; readonly detail:any }
export interface DKDSDomainAdapterProviderSpec<TState=any> { version?:string; title?:string; access?:'dependency'|'public'; snapshot:()=>TState; actions?:Record<string,(payload:any,context:Readonly<{consumerId:string;owner:string;ref:string;action:string}>)=>any|Promise<any>>; subscribe?:(listener:(event?:any)=>void)=>void|(()=>void) }
export interface DKDSDomainAdapterConnection<TState=any> { readonly ref:string; descriptor():DKDSDomainAdapterDescriptor; snapshot():DKDSDomainAdapterSnapshot<TState>; invoke<TResult=any>(action:string,payload?:any):Promise<TResult>; subscribe(listener:(event:DKDSDomainAdapterEvent)=>void,options?:{immediate?:boolean}):()=>void; available():boolean }
export interface DKDSDomainAdapterRegistry { provide<TState=any>(id:string,spec:DKDSDomainAdapterProviderSpec<TState>):DKDSDomainAdapterDescriptor&{dispose():boolean}; connect<TState=any>(ref:string):DKDSDomainAdapterConnection<TState>; list():DKDSDomainAdapterDescriptor[] }
export interface DKDSServiceRegistry { get(id:'runtime'):DKDSRuntimeService|undefined; require(id:'runtime'):DKDSRuntimeService; get(id:string):any; require(id:string):any; list():any[]; register(id:string,service:any,options?:any):any; readonly domain:DKDSDomainAdapterRegistry }
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
export type DKDSAcquisitionProvenance='source'|'import-batch'|'unknown';
export interface DKDSAcquisitionMetadata { readonly runId?:string; readonly sequenceIndex?:number; readonly timestamp?:string; readonly parentSequenceIndex?:number; readonly provenance?:DKDSAcquisitionProvenance }
export interface DKDSAcquisitionOrderRow { readonly artifactId:string; readonly runId:string; readonly sequenceIndex:number|null; readonly timestamp:string; readonly parentSequenceIndex?:number; readonly provenance:DKDSAcquisitionProvenance }
export interface DKDSArtifactMetadata { readonly acquisition?:Readonly<DKDSAcquisitionMetadata>; readonly artifactVersion?:number; readonly schemaVersion?:number; readonly id:string; readonly kind:string; readonly name:string; readonly semanticType:string; readonly createdAt:string; readonly updatedAt:string; readonly transient:boolean; readonly tags:readonly string[]; readonly source:Record<string,unknown>; readonly metadata:Record<string,unknown>; readonly lineage:any; readonly provenanceCount:number; readonly provenanceTypes:readonly string[]; readonly artifactRevision:number; readonly rowCount?:number; readonly length?:number; readonly shape?:readonly [number,number]; readonly columns?:readonly DKDSColumnMetadata[]; readonly xName?:string; readonly yName?:string; readonly valueName?:string; readonly xUnit?:string; readonly yUnit?:string; readonly valueUnit?:string; readonly xDimension?:string; readonly yDimension?:string; readonly valueDimension?:string; readonly xQuantity?:string; readonly yQuantity?:string; readonly valueQuantity?:string }
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
  normalizeAcquisition?(value:any,options?:{provenance?:DKDSAcquisitionProvenance}):DKDSAcquisitionMetadata; acquisitionMetadata?(artifact:any):DKDSAcquisitionMetadata;
}
export interface DKDSDataSourceDescriptor { path:string; name:string; sourcePath:string; sourceName:string; vg:number|null; points:number; excluded?:boolean; assignments?:string[]; artifactId:string; kind?:string; semanticType?:string; importerId?:string; acquisition?:Readonly<DKDSAcquisitionMetadata> }
export interface DKDSDataSourceTarget { id:string; label:string; icon:string; order:number }
export interface DKDSDataSourceRef { path?:string; sourcePath?:string; artifactId?:string }
export interface DKDSDataSourcesCapability { list(options?:{consumer?:string;pluginId?:string}):DKDSDataSourceDescriptor[]; acquisitionOrder(options?:{artifactIds?:string[]}):DKDSAcquisitionOrderRow[]; targets?():DKDSDataSourceTarget[]; detach?(ref:DKDSDataSourceRef|string):Promise<any>|any; setAssignments?(ref:DKDSDataSourceRef|string,pluginIds:string[]):Promise<any>|any; rename(ref:DKDSDataSourceRef|string,label:string):Promise<any>|any; setExcluded(ref:DKDSDataSourceRef|string,value?:boolean):Promise<any>|any; remove(refs:DKDSDataSourceRef[]|DKDSDataSourceRef):Promise<{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]}>|{removed:Array<{path:string;name:string;sourcePath:string}>;removedArtifactIds:string[];sources:DKDSDataSourceDescriptor[]} }
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
  primaryScroll?:'safe'|'auto'|'contained'; leftWidth?:number; leftMin?:number; leftReserve?:number; rightWidth?:number; rightMin?:number; rightReserve?:number; bottomHeight?:number; bottomMin?:number; bottomReserve?:number; resizableLeft?:boolean; resizableRight?:boolean; resizableBottom?:boolean; /** Changes the persisted split-layout key when a presentation architecture intentionally resets accepted default geometry. */ layoutStateVersion?:string; canvasLeftWidth?:number; canvasLeftMin?:number; canvasLeftReserve?:number; canvasRightWidth?:number; canvasRightMin?:number; canvasRightReserve?:number; canvasBottomHeight?:number; canvasBottomMin?:number; canvasBottomReserve?:number;
}
export interface DKDSPluginWorkspaceMountContext { workbench:DKDSPluginWorkspace; scope:any; main:HTMLElement; root:HTMLElement }
export type DKDSTitlePolicy='preserve'|'host-only'|'page-only'|'both'|'auto';
export interface DKDSPluginWorkspacePrimarySpec { id:string; label?:string; /** 'auto' preserves the accepted page chrome by default; explicit host/page policies are opt-in. */ titlePolicy?:DKDSTitlePolicy; /** PRIMARY is exactly one semantic main surface in Plugin API 1.19. Register controls/inspectors as PRIME surfaces. */ mainNode?:any; mainHtml?:string|(()=>string); /** Same bounded/growing semantics as create().primaryScroll. */ scroll?:'safe'|'auto'|'contained'; scrollMode?:'safe'|'auto'|'contained'; mount?:(context:DKDSPluginWorkspaceMountContext)=>void|(()=>void) }
/** Stable Core-owned semantic kinds for persistent PRIME/Portable surfaces. Themes never define new values. */
export type DKDSSemanticSurfaceKind='panel'|'inspector';
/** Functional purpose is orthogonal to Portable/Material semanticKind and cross-platform presentationRole. */
export type DKDSPresentationSurfacePurpose='parameters';
export type DKDSPresentationSurfaceRole='scientific-primary'|'data-primary'|'utility-primary'|'data-control'|'inspector'|'scientific-secondary';
export interface DKDSHeaderControlSpec { kind:'columns'; label?:string; values?:Array<string|number>; value?:string|number|(()=>string|number); onChange?:(value:string,context:any)=>void }
export interface DKDSPluginWorkspacePrimeHeaderSpec { /** Existing-node PRIME defaults to adopt so SDK semantics do not rebuild an already accepted header. */ mode?:'adopt'|'generated'; title?:string|(()=>string); meta?:string|(()=>string); metaSelector?:Element|string; metaPlacement?:'inline'|'after-title'; actions?:any[]; controls?:DKDSHeaderControlSpec[]; showPlacement?:'auto'|boolean; showCollapse?:'auto'|boolean; showClose?:'auto'|boolean }
export interface DKDSPluginWorkspacePrimeSpec {
  id:string; label?:string; title?:string; order?:number; autoOpen?:boolean;
  semanticKind?:DKDSSemanticSurfaceKind; presentationPurpose?:DKDSPresentationSurfacePurpose; presentationRole?:DKDSPresentationSurfaceRole; priority?:number; collapsible?:boolean;
  /** Placements preserve the plugin's accepted presentation behavior. One declared placement means fixed placement; `fixed:true` explicitly requires exactly one placement. */
  placements?:Array<'inline'|'home'|'left'|'right'|'bottom'|'main'|'float'|'global'>; defaultPlacement?:'inline'|'home'|'left'|'right'|'bottom'|'main'|'float'|'global'; fixed?:boolean;
  /** data-control defaults to host-managed placement; inspector/scientific-secondary default to surface chrome. */
  placementControl?:'host'|'surface'|'none';
  /** fill consumes the remaining dock height; content (default) uses intrinsic height. Floating and mobile projection keep their own sizing. */
  sizing?:'content'|'fill'; /** Opt-in only; omitted means preserve the existing accepted content geometry. */ contentInset?:'none'|'compact'|'standard'|'comfortable';
  existingNode?:Element; node?:Element|string; inlineHost?:Element|string;
  /** false is valid for fixed PRIME. 'auto' asks Core to wrap a movable existingNode in canonical PRIME chrome. */
  chrome?:boolean|'auto';
  /** Surface-controlled movable existingNode PRIME requires both handle and controlsHost unless chrome:'auto' is used. Host-managed data-control may intentionally be chrome-less. */
  handle?:Element|string; controlsHost?:Element|string; controlsPlacement?:'start'|'end'; useTargetAsWrapper?:boolean; stateVersion?:number|string; initialBounds?:{width?:number;height?:number}; defaultFloatingBounds?:{left?:number;top?:number}|((context:{placement:string;zoneRect:any;rect:any;portable:any})=>{left?:number;top?:number});
  closeSelector?:string; collapseSelector?:string; actions?:any[]; actionHost?:Element|string; actionsHost?:Element|string; header?:false|DKDSPluginWorkspacePrimeHeaderSpec;
  mount?:(context:{workbench:DKDSPluginWorkspace;scope:any;container:HTMLElement;panel:HTMLElement;slots:any})=>void|(()=>void); onPlacementChanged?:(info:any)=>void; onClose?:(info:any)=>void; onCollapse?:(info:any)=>void;
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
  plot?:Element|string; header?:Element|string|false; actionsHost?:Element|string|false;
  title?:string; titleHtml?:string; titleless?:boolean; surface?:'scientific-card'; render?:(plotHost:HTMLElement,view:DKDSPlotView)=>void; fileStem?:string|((view:DKDSPlotView)=>string);
  csv?:boolean|((view:DKDSPlotView)=>string); copy?:boolean; images?:boolean; portable?:boolean;
  /** One declared placement is fixed and has no position chooser; multiple placements expose the Core chooser. */
  placements?:Array<'home'|'sticky'|'float'|'global'|'left'|'right'|'bottom'>; defaultPlacement?:string; stateVersion?:string; snap?:boolean;
  contentAspectRatio?:number; contentMinHeight?:number; contentMaxHeight?:number;
  [key:string]:any;
}
export interface DKDSPlotView { readonly id:string; readonly card:Element; readonly plot:Element; configure(spec?:DKDSPlotViewSpec):DKDSPlotView; resize(reason?:string):DKDSPlotView; dispose():void; }
export interface DKDSPlotViewRuntime { create(id:string,host:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView; bind(id:string,card:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView; hydrate(root:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView[]; observe(root:Element|string,spec?:DKDSPlotViewSpec):()=>void; get(id:string):DKDSPlotView|null; }

export interface DKDSGroupPlot { setItems(items:any[]):DKDSGroupPlot; layout():any; setColumns(value:number|'auto'):any; setDensity(value:DKDSGroupPlotDensity):any; diagnostics():any; dispose():void }

export type DKDSScientificDensity='compact'|'regular'|'comfortable';
export type DKDSScientificSectionRole='workflow'|'primary-plot'|'plot-group'|'result'|'warning'|'controls';
export interface DKDSScientificSectionSpec { id:string; role:DKDSScientificSectionRole; title?:string; subtitle?:string; density?:DKDSScientificDensity; kind?:string; node?:Element|string; plot?:DKDSPlotViewSpec&{id?:string}; group?:DKDSPlotGroupSpec; plots?:DKDSPlotGroupItemSpec[] }
export interface DKDSScientificSection { readonly element:HTMLElement; readonly body:HTMLElement; setContent(node:Element|string):Element|null; append(node:Element|string):Element|null; dispose():void }
export interface DKDSScientificSectionRuntime { create(host:Element|string,spec:DKDSScientificSectionSpec):DKDSScientificSection }
export interface DKDSPlotGroupItemSpec extends DKDSPlotViewSpec { id:string; title?:string }
export type DKDSScientificWorkbenchProfile='accepted-scientific-v1';
export interface DKDSPlotGroupSpec extends DKDSGroupAreaSpec { id?:string; density?:DKDSScientificDensity; /** Opt-in public visual profile. Existing/adopted cards are never restyled. */ profile?:DKDSScientificWorkbenchProfile }
export interface DKDSPlotGroupRuntimeController { addPlot(spec:DKDSPlotGroupItemSpec):DKDSPlotView; adoptPlot(id:string,card:Element|string,spec?:DKDSPlotViewSpec):DKDSPlotView; removePlot(id:string):boolean; setColumns(value:number|'auto'):number; getColumns():number; getColumnPreference():'auto'|string; getAppliedColumns():number; getOrientation():DKDSGridOrientation; validate():ReadonlyArray<{code:string;id?:string}>; dispose():void }
export interface DKDSPlotGroupRuntime { create(host:Element|string,spec?:DKDSPlotGroupSpec):DKDSPlotGroupRuntimeController }
export interface DKDSScientificReferencePrimeSpec extends DKDSPluginWorkspacePrimeSpec {
  /** Public templates extracted from the accepted 3.70.5 scientific workbench. No Resonance-private class is required. */
  template?:'data-control'|'inspector'|'plot-group'; content?:Element|string; meta?:string|(()=>string); group?:DKDSPlotGroupSpec; plots?:DKDSPlotGroupItemSpec[]; onGroupReady?:(group:DKDSPlotGroupRuntimeController,context:any)=>void;
}
export interface DKDSScientificWorkbenchPrimarySpec { id?:string;label?:string;scroll?:'safe'|'auto'|'contained';titlePolicy?:DKDSTitlePolicy;mainNode?:Element|string;sections?:DKDSScientificSectionSpec[]; /** accepted-scientific-v1 builds the accepted main plot/header/status geometry. */ template?:'analysis-main'; tools?:Element|string|Array<Element|string>; legend?:Element|string|Array<Element|string>; content?:Element|string; status?:string|(()=>string) }
export interface DKDSScientificWorkbenchSpec { id:string; activity?:string; profile?:DKDSScientificWorkbenchProfile; workspace?:DKDSPluginWorkspaceCreateSpec; primary:DKDSScientificWorkbenchPrimarySpec; primes?:Array<DKDSPluginWorkspacePrimeSpec|DKDSScientificReferencePrimeSpec>; subs?:any[] }
export interface DKDSScientificWorkbenchRuntime { readonly profiles:Readonly<{acceptedScientificV1:Readonly<{id:'accepted-scientific-v1';geometry:Readonly<{leftWidth:280;leftMin:230;canvasLeftWidth:360;canvasRightWidth:390;canvasBottomHeight:360;primaryScroll:'contained';dataControlInset:12;panelBodyInset:10;groupGap:12}>}>}>; create(root:Element|string,spec:DKDSScientificWorkbenchSpec):DKDSPluginWorkspace }
export type DKDSUnitTemplateGroupDensity='compact'|'regular'|'comfortable';
export type DKDSUnitTemplatePrimeHeader='standard'|'none';
export type DKDSUnitPlotViewVariant='complete'|'prime-contained';
export type DKDSUnitTemplateId='workspace'|'page'|'pageHeader'|'surface'|'panel'|'section'|'layout'|'header'|'toolbar'|'action'|'actionRow'|'tabs'|'field'|'check'|'chip'|'note'|'message'|'summary'|'divider'|'emptyState'|'metric'|'list'|'componentTree'|'parameterForm'|'table'|'prime'|'plotView'|'plotGroup'|'scientificPlot'|'legend'|'floatingChrome'|'splitHandle'|'splitPane'|'movableWindow'|'meter'|'dialog'|'menu'|'popover'|'status'|'portable'|'provider';
export type DKDSUnitWorkspaceVariant='standard'|'accepted-scientific';
export type DKDSUnitPageVariant='analysis'|'tool'|'data';
export type DKDSUnitPageHeaderVariant='host-owned'|'page-owned';
export type DKDSUnitSurfaceVariant='base'|'elevated'|'floating'|'muted'|'accepted-data-control';
export type DKDSUnitPanelVariant='plain'|'headed'|'portable'|'control-card'|'plot-card'|'accepted-portable';
export type DKDSUnitSectionVariant='workflow'|'controls'|'primary-plot'|'plot-group'|'result'|'warning'|'disclosure';
export type DKDSUnitLayoutVariant='identity'|'stack'|'stack-compact'|'stack-comfortable'|'row'|'row-wrap'|'row-between'|'fill-rows'|'header-body-footer'|'browser-rows'|'sidebar-main-compact'|'sidebar-main-standard'|'sidebar-main-wide'|'form-grid'|'form-grid-2'|'form-grid-4'|'action-grid-2'|'action-grid-4'|'metric-grid'|'two-card-grid'|'key-value-compact'|'key-value-standard'|'label-value-wide'|'inline-range'|'split-results'|'scroll-pane'|'sticky-stack'|'tool-sidebar-main'|'connection-grid'|'chat-rows'|'compose-row'|'list-row-file'|'list-row-selectable'|'content-actions'|'active-file-head'|'overlay-center'|'service-window'|'settings-window'|'scroll-stack'|'wrap-strip'|'mention-row'|'artifact-list'|'artifact-row'|'artifact-row-selectable'|'primary-flow'|'formula-grid'|'toolbar-bottom'|'workflow-step-head'|'provenance-list'|'provenance-row'|'surface-header-stack'|'toolbar-wrap'|'file-toolbar'|'batch-file-row'|'compare-actions'|'control-label-row'|'segment-bar'|'analysis-control-grid'|'result-control-grid'|'result-grid-asymmetric'|'dataset-row'|'dataset-transform-row'|'inspector-section'|'palette-grid'|'responsive-two-column'|'gate-controls'|'plot-card-fill'|'plot-card-header'|'square-plot'|'resistance-card'|'portable-resistance-card'|'card-title-row'|'empty-centered'|'grid'|'accepted-main-area'|'accepted-main-workspace'|'accepted-plot-wrap'|'accepted-main-header'|'accepted-main-plot'|'accepted-summary'|'accepted-group-grid'|'accepted-group-card'|'accepted-group-plot';
export type DKDSUnitHeaderVariant='panel'|'content'|'portable'|'plot'|'plot-minimal'|'section'|'accepted-portable';
export type DKDSUnitToolbarVariant='ordinary'|'header'|'floating'|'segmented'|'accepted-main';
export type DKDSUnitActionVariant='primary'|'secondary'|'quiet'|'destructive'|'selected'|'active';
export type DKDSUnitActionRowVariant='wrap'|'nowrap';
export type DKDSUnitTabsVariant='standard'|'compact';
export type DKDSUnitFieldVariant='input'|'select'|'textarea'|'integrated'|'analysis-control';
export type DKDSUnitCheckVariant='checkbox'|'radio'|'analysis-check';
export type DKDSUnitChipVariant='quiet'|'selected'|'danger'|'info';
export type DKDSUnitNoteVariant='normal'|'meta'|'warning'|'danger';
export type DKDSUnitMessageVariant='user'|'assistant'|'error';
export type DKDSUnitSummaryVariant='row'|'strip';
export type DKDSUnitDividerVariant='horizontal'|'vertical';
export type DKDSUnitEmptyStateVariant='standard';
export type DKDSUnitListVariant='plain'|'selectable'|'compact';
export type DKDSUnitComponentTreeVariant='schema';
export type DKDSUnitParameterFormVariant='standard'|'compact'|'auto-fit';
export type DKDSUnitLegendVariant='top'|'bottom'|'left'|'right'|'strip'|'accepted-main';
export type DKDSUnitFloatingChromeVariant='scientific-nav'|'command'|'accepted-main';
export type DKDSUnitSplitPaneVariant='resizable';
export type DKDSUnitMovableWindowVariant='utility'|'dialog';
export type DKDSUnitMeterVariant='thin';
export type DKDSUnitDialogVariant='standard'|'confirm'|'settings';
export type DKDSUnitMenuVariant='context'|'dropdown'|'command';
export type DKDSUnitPopoverVariant='status'|'service'|'picker';
export type DKDSUnitStatusVariant='compact'|'text'|'dot'|'row'|'accepted-summary';
export type DKDSUnitPortableVariant='docked'|'floating'|'global'|'sticky';
export type DKDSUnitProviderVariant='data'|'algorithm'|'theme'|'foundation';
export interface DKDSUnitWorkspacePrimaryEndInsetSpec { /** Unit-owned by default; use content only when the PRIMARY content root already owns the accepted right/end inset. */ mode?:'unit'|'content'; /** Unit-owned inset in px. Omitted => 12; accepted range 8..32. Ignored for content-owned mode. */ px?:number }
export interface DKDSUnitWorkspaceSpec extends DKDSPluginWorkspaceCreateSpec { variant?:DKDSUnitWorkspaceVariant; /** Every Unit workspace PRIMARY has one inline-end breathing-room owner. Defaults to {mode:'unit',px:12}. */ primaryEndInset?:DKDSUnitWorkspacePrimaryEndInsetSpec }
export interface DKDSUnitSurfaceSpec { tagName?:string;variant?:DKDSUnitSurfaceVariant;role?:string;className?:string;dataset?:Record<string,any>;content?:Element|string|Array<Element|string> }
export interface DKDSUnitPanelSpec { tagName?:string;variant?:DKDSUnitPanelVariant;role?:string;header?:boolean;sizing?:'content'|'fill';headerKind?:'panel'|'plot'|'portable'|'section';headerVariant?:DKDSUnitHeaderVariant;title?:string;meta?:string|(()=>string);actions?:any[];content?:Element|string|Array<Element|string>;className?:string;bodyClassName?:string;dataset?:Record<string,any> }
export interface DKDSUnitPageSpec { tagName?:string;variant?:DKDSUnitPageVariant;className?:string;content?:Element|string|Array<Element|string> }
export interface DKDSUnitSectionSpec { tagName?:string;variant?:DKDSUnitSectionVariant;role?:DKDSUnitSectionVariant;title?:string;titleMode?:'header'|'heading';titleTag?:string;titleClassName?:string;anatomy?:'container'|'siblings';actions?:any[];content?:Element|string|Array<Element|string>;className?:string;bodyClassName?:string;open?:boolean;onToggle?:(context:{event:Event;open:boolean;section:HTMLDetailsElement})=>void }
export type DKDSUnitLayoutBreakpoint=310|460|520|620|680|720|760|900|920|950|980|1000|1050|1120|1180|1250;
export interface DKDSUnitLayoutGeometry {
  display?:string;position?:string;inset?:string;top?:string;right?:string;bottom?:string;left?:string;
  width?:string;minWidth?:string;maxWidth?:string;height?:string;minHeight?:string;maxHeight?:string;
  overflow?:string;overflowX?:string;overflowY?:string;resize?:string;boxSizing?:string;aspectRatio?:string;
  padding?:string;paddingTop?:string;paddingRight?:string;paddingBottom?:string;paddingLeft?:string;
  margin?:string;marginTop?:string;marginRight?:string;marginBottom?:string;marginLeft?:string;
  gap?:string;rowGap?:string;columnGap?:string;
  flex?:string;flexDirection?:string;flexWrap?:string;alignItems?:string;alignContent?:string;alignSelf?:string;justifyContent?:string;justifySelf?:string;placeItems?:string;
  gridTemplateColumns?:string;gridTemplateRows?:string;gridTemplateAreas?:string;gridAutoRows?:string;gridAutoFlow?:string;gridArea?:string;gridColumn?:string;gridRow?:string;
  whiteSpace?:string;textOverflow?:string;
}
export interface DKDSUnitLayoutResponsiveGeometry { minWidth?:DKDSUnitLayoutBreakpoint;maxWidth?:DKDSUnitLayoutBreakpoint;geometry:DKDSUnitLayoutGeometry }
export interface DKDSUnitLayoutSpec { variant?:DKDSUnitLayoutVariant;tagName?:string;namespace?:'svg'|'html'|string;className?:string;content?:Element|string|Array<Element|string>;geometry?:DKDSUnitLayoutGeometry;responsiveGeometry?:readonly DKDSUnitLayoutResponsiveGeometry[];responsiveTarget?:Element|string }
export interface DKDSUnitHeaderSpec { tagName?:string;kind?:'panel'|'plot'|'portable'|'section';variant?:DKDSUnitHeaderVariant;title?:string;titleTag?:string;titleClassName?:string|false;titleWrapperTagName?:string;titleWrapperClassName?:string;stacked?:boolean;eyebrow?:string;eyebrowTag?:string;eyebrowClassName?:string;titleEmphasis?:'standard'|'prominent'|'compact';subtitle?:string;subtitleTag?:string;subtitleClassName?:string;meta?:string|(()=>string);metaTag?:string;metaClassName?:string;metaPlacement?:'inline'|'title-inline'|'trailing';actions?:any[]|false;actionsTagName?:string;actionsClassName?:string;integratedActions?:boolean;activity?:string;actionHost?:boolean;actionHostClassName?:string;collapse?:boolean;close?:boolean;className?:string;dataset?:Record<string,any> }
export interface DKDSUnitToolbarSpec { variant?:DKDSUnitToolbarVariant;activity?:string;actions?:any[];content?:Element|string|Array<Element|string>;className?:string }
export interface DKDSUnitActionRowSpec { variant?:DKDSUnitActionRowVariant;activity?:string;actions?:any[];content?:Element|string|Array<Element|string>;className?:string }
export interface DKDSUnitFieldHandle { readonly element:HTMLElement; readonly label:HTMLElement|null; readonly labelRow?:HTMLElement|null; readonly unit?:HTMLElement|null; readonly control:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement; readonly hint?:HTMLElement|null; setOptions(options?:any[],update?:{value?:any;preserve?:boolean}):string }
export interface DKDSUnitFieldSpec { variant?:DKDSUnitFieldVariant;kind?:'input'|'select'|'textarea';layout?:'integrated';controlOnly?:boolean;label?:string|false;unit?:string;value?:any;options?:any[];hint?:string;inputType?:string;id?:string;name?:string;placeholder?:string;min?:number|string;max?:number|string;step?:number|string;autocomplete?:string;inputMode?:string;disabled?:boolean;required?:boolean;multiple?:boolean;readOnly?:boolean;className?:string;controlClassName?:string;dataset?:Record<string,any>;controlDataset?:Record<string,any>;attributes?:Record<string,any>;onInput?:(event:any)=>void;onChange?:(event:any)=>void;onFocus?:(event:any)=>void;onBlur?:(event:any)=>void }
export interface DKDSUnitCheckSpec { variant?:DKDSUnitCheckVariant;kind?:DKDSUnitCheckVariant;label?:string;checked?:boolean;disabled?:boolean;name?:string;value?:any;className?:string;dataset?:Record<string,any>;onChange?:(event:any)=>void }
export interface DKDSUnitChipSpec { variant?:DKDSUnitChipVariant;text?:string;label?:string;tagName?:string;className?:string;interactive?:boolean;disabled?:boolean;onInvoke?:(detail:{event:any;chip:HTMLElement;spec:DKDSUnitChipSpec})=>void }
export interface DKDSUnitNoteSpec { variant?:DKDSUnitNoteVariant;text?:string;html?:string;tagName?:string;className?:string }
export interface DKDSUnitMessageSpec { variant?:DKDSUnitMessageVariant;tagName?:string;meta?:string;text?:string;content?:Element|string|Array<Element|string>;className?:string;dataset?:Record<string,any> }
export interface DKDSUnitSummarySpec { variant?:DKDSUnitSummaryVariant;tagName?:string;items?:Array<{text?:string;label?:string;value?:string|number;variant?:DKDSUnitChipVariant}>;content?:Element|string|Array<Element|string>;className?:string;dataset?:Record<string,any> }
export interface DKDSUnitDividerSpec { variant?:DKDSUnitDividerVariant }
export interface DKDSUnitEmptyStateSpec { variant?:DKDSUnitEmptyStateVariant;tagName?:string;message?:string;text?:string;content?:Element|string|Array<Element|string>;action?:any;activity?:string;className?:string;dataset?:Record<string,any> }
export interface DKDSUnitListItemSpec { tagName?:string;className?:string;selectable?:boolean;role?:string;selected?:boolean;disabled?:boolean;dataset?:Record<string,unknown>;attributes?:Record<string,unknown>;ariaLabel?:string;leading?:Node|string|number;leadingClassName?:string;title?:string|number;titleClassName?:string;meta?:string|number;metaClassName?:string;content?:unknown;contentClassName?:string;onInvoke?:(payload:{event:Event;item:HTMLElement;spec:DKDSUnitListItemSpec})=>void }
export interface DKDSUnitListSpec { variant?:DKDSUnitListVariant;items?:DKDSUnitListItemSpec[];tagName?:string;className?:string }
export interface DKDSUnitListHandle { readonly element:HTMLElement; item(spec?:DKDSUnitListItemSpec):HTMLElement; items():HTMLElement[]; setItems(items?:DKDSUnitListItemSpec[]):readonly HTMLElement[] }
export interface DKDSUnitTableSpec extends DKDSTableMountSpec { variant?:'standard'|'compact' }
export interface DKDSUnitLegendSpec { variant?:DKDSUnitLegendVariant;content?:Element|string|Array<Element|string>;className?:string }
export interface DKDSUnitStatusSpec { variant?:DKDSUnitStatusVariant;text?:string;state?:string;content?:Element|string|Array<Element|string>;className?:string;dataset?:Record<string,any> }
export interface DKDSUnitFloatingChromeSpec extends DKDSUnitToolbarSpec { variant?:DKDSUnitFloatingChromeVariant }
export interface DKDSUnitSplitHandleSpec { variant?:'horizontal'|'vertical';axis?:'horizontal'|'vertical';className?:string }
export type DKDSUnitPopoverPlacement='point'|'bottom-start'|'bottom-end'|'top-start'|'top-end'|'right-start'|'left-start';
export interface DKDSUnitPopoverPoint { x?:number;y?:number;clientX?:number;clientY?:number }
export interface DKDSUnitPopoverSpec { variant?:DKDSUnitPopoverVariant;tagName?:string;title?:string;meta?:string|(()=>string);actions?:any[];content?:Element|string|Array<Element|string>;header?:boolean;close?:boolean;dismissOnOutside?:boolean;className?:string;bodyClassName?:string;role?:'dialog'|'group'|'status';ariaLabel?:string;anchor?:Element|string;point?:DKDSUnitPopoverPoint;placement?:DKDSUnitPopoverPlacement;offset?:number;onClose?:()=>void }
export interface DKDSUnitPanelHandle { readonly element:HTMLElement; readonly header:any; readonly body:HTMLElement }
export interface DKDSUnitHeaderHandle { readonly element:HTMLElement; readonly title:HTMLElement; readonly titleWrapper:HTMLElement|null; readonly eyebrow:HTMLElement|null; readonly subtitle:HTMLElement|null; readonly meta:HTMLElement|null; readonly actions:HTMLElement|null; readonly actionHost:HTMLElement|null; readonly actionGroup:any }
export interface DKDSUnitToolbarHandle { readonly element:HTMLElement; readonly actionGroup:any }
export interface DKDSUnitComponentTreeContext { variant?:DKDSUnitComponentTreeVariant; [key:string]:any }
export interface DKDSUnitParameterFormOptions { compact?:boolean; autoFit?:boolean; layoutOwner?:'core'|'host'; value?:Record<string,any>; context?:any; onChange?:(value:any)=>void; [key:string]:any }
export interface DKDSUnitMeterSpec { variant?:DKDSUnitMeterVariant; value?:number; min?:number; max?:number; valueText?:string|((value:number,percent:number)=>string); className?:string; dataset?:Record<string,any>; fill?:Element|string }
export interface DKDSUnitMeterHandle { readonly element:HTMLElement; readonly fill:HTMLElement; readonly min:number; readonly max:number; readonly value:number; setValue(value:number):number }
export interface DKDSUnitMovableWindowSpec { id:string; variant?:DKDSUnitMovableWindowVariant; title?:string; meta?:string|(()=>string); actions?:any[]; actionHost?:boolean; close?:boolean; header?:boolean; role?:string; target?:Element|string; handle?:Element|string; bounds?:Element|string; container?:Element|string; persist?:boolean; resetOnDoubleClick?:boolean; content?:Element|string|Array<Element|string>; className?:string; headerClassName?:string; bodyClassName?:string; dataset?:Record<string,any> }
export interface DKDSUnitMovableWindowHandle { readonly element:HTMLElement; readonly handle:HTMLElement; readonly controller:any; readonly position:Readonly<{x:number;y:number}>; reset(options?:any):any; clamp(options?:any):any; dispose():void }
export interface DKDSUnitSplitPaneSpec { id:string; variant?:DKDSUnitSplitPaneVariant; axis?:'x'|'y'; resizeTarget?:'first'|'second'; reverse?:boolean; defaultSize?:number; min?:number; max?:number|null; reserve?:number; mobileStateScope?:boolean; /** Core is the default outer-layout owner. `host` is allowed only when adopting a Layout Unit host; then host CSS owns display/grid/flex/reflow while Core remains the unique split-size/gesture owner. */ layoutOwner?:'core'|'host'; /** Core-owned responsive reflow; forbidden when layoutOwner='host'. */ reflowBelow?:DKDSUnitLayoutBreakpoint; trackToken?:`--dkds-unit-${string}`; container?:Element|string; target?:Element|string; handle?:Element|string; first?:Element|string|Array<Element|string>; second?:Element|string|Array<Element|string>; className?:string; firstClassName?:string; secondClassName?:string; handleClassName?:string }
export interface DKDSUnitSplitPaneHandle { readonly element:HTMLElement; readonly container:HTMLElement; readonly target:HTMLElement; readonly handle:HTMLElement; readonly controller:any; readonly first?:HTMLElement; readonly second?:HTMLElement; setSize(value:number,options?:any):any; reset():any; collapse(value:boolean,options?:any):any; state():any; dispose():void }
export interface DKDSFormalCoreServiceMethodDescriptor { readonly kind:string; readonly rule:string }
export interface DKDSCoreServiceDescriptor { readonly kind:string; readonly public:boolean; readonly purpose:string; readonly migration?:Readonly<Record<string,DKDSUnitTemplateId>>; readonly forbiddenVisualMethods?:readonly string[] }
export interface DKDSNativePluginServiceMigration { readonly from:string; readonly to:DKDSUnitTemplateId; readonly count:number }
export interface DKDSNativePluginServiceBlueprint { readonly services:readonly string[]; readonly migrations:readonly DKDSNativePluginServiceMigration[] }
export interface DKDSUnitPrimeDetailGeometry { /** Accepted outer inset for non-parameter PRIME surfaces only. Parameter-purpose PRIME uses the uniform Core-owned metric and rejects plugin overrides. */ contentInsetPx?:number; /** Minimum usable PRIME content-box inline size. It is an intrinsic constraint consumed by the Presenter, never a direct Drawer-width write. */ minContentInlinePx?:number; /** Minimum usable PRIME content-box block size for non-parameter companion surfaces. Parameter-purpose PRIME rejects this field. */ minContentBlockPx?:number }
export interface DKDSUnitPrimeSpec extends Omit<DKDSPluginWorkspacePrimeSpec,'contentInset'> { role?:'data-control'|'inspector'|'scientific-secondary'; variant?:'accepted-scientific-data-control'|'accepted-scientific-inspector'|'fixed-titleless'|'canonical-header'; header?:DKDSUnitTemplatePrimeHeader|false; meta?:string|(()=>string); headerActions?:any[]; closable?:boolean; /** Explicit plugin accepted-source geometry, validated and applied by Unit Templates. */ detailGeometry?:DKDSUnitPrimeDetailGeometry; /** Mounted exactly once into the canonical PRIME body. */ content?:Element|string|Array<Element|string> }
export interface DKDSUnitPlotViewDetailGeometry { /** Scientific content width:height ratio. */ contentAspectRatio?:number; /** Accepted source lower/upper content-height bounds in CSS px. */ contentMinHeightPx?:number; contentMaxHeightPx?:number }
export interface DKDSStrictPlotViewSpec extends Omit<DKDSPlotViewSpec,'contentAspectRatio'|'contentMinHeight'|'contentMaxHeight'> {
  /** complete owns movement; prime-contained delegates movement to exactly one enclosing movable PRIME while retaining title/header/export. */
  title:string; variant?:DKDSUnitPlotViewVariant; titleless?:false; header?:Element|string; portable?:boolean; positionOwner?:'prime'; placements?:Array<'home'|'left'|'right'|'bottom'|'float'|'global'>; /** Explicit plugin accepted-source plot geometry, validated by Unit Templates and executed by the shared PlotView service. */ detailGeometry?:DKDSUnitPlotViewDetailGeometry;
}
export interface DKDSUnitPlotGroupSpec extends Omit<DKDSPlotGroupSpec,'profile'> {
  /** Semantic density supplies the Core default gap. */
  density?:DKDSUnitTemplateGroupDensity;
  /** Explicit accepted plugin detail gap used during 1:1 source reconstruction; Core still owns grid behavior/lifecycle. */
  gapPx?:number;
}
export interface DKDSUnitPlotGroupController {
  readonly raw:DKDSPlotGroupRuntimeController; readonly host:HTMLElement; readonly density:DKDSUnitTemplateGroupDensity; readonly interactionPolicy:'scientific-standard-v1';
  addPlot(spec:DKDSPlotGroupItemSpec & {title:string}):DKDSPlotView; adoptPlot(id:string,card:Element|string,spec:DKDSStrictPlotViewSpec):DKDSPlotView; removePlot(id:string):boolean;
  setColumns(value:number|'auto'):number; getColumns():number; getAppliedColumns():number; getOrientation():DKDSGridOrientation; getColumnPreference():'auto'|string; validate():ReadonlyArray<{code:string;id?:string}>;
  createScientificPlot(target:any,spec?:DKDSUnitScientificPlotSpec):DKDSUnitScientificPlotHandle; dispose():void;
}
export interface DKDSUnitPlotGroupPrimeSpec extends Omit<DKDSPluginWorkspacePrimeSpec,'header'|'mount'|'presentationRole'> {
  title:string; variant?:'accepted-scientific'|'compact'|'regular'|'comfortable'; header?:DKDSUnitTemplatePrimeHeader|false; meta?:string|(()=>string); density?:DKDSUnitTemplateGroupDensity; group?:DKDSUnitPlotGroupSpec; plots?:Array<DKDSPlotGroupItemSpec&{title:string}>; headerActions?:any[];
  mount?:(context:{workbench:DKDSPluginWorkspace;scope:any;container:HTMLElement;panel:HTMLElement;slots:any;group:DKDSUnitPlotGroupController;groupHost:HTMLElement})=>void|(()=>void);
  onGroupReady?:(group:DKDSUnitPlotGroupController,context:any)=>void;
}
export interface DKDSUnitScientificPlotSpec extends Omit<DKDSScientificCurveSurfaceSpec,'interactionBehavior'> {
  /** `unit` creates the canonical ScientificCurveSurface. `runtime` delegates final drawing/resize observation to an existing ctx.ui.scientificPlot.react/scalarField owner, preventing a second renderer on the same plot host. */
  renderOwner?:'unit'|'runtime';
  /** Domain interactions may extend the fixed base policy but may not replace an existing base gesture/target/modifier binding. Runtime-delegated plots may not declare a second interaction owner. */
  interactionExtensions?:DKDSInteractionBehaviorBinding[]; onIntent?:(context:any)=>boolean|void;
  /** Touch/pen box capture is opt-in on mobile so ordinary scientific plots remain vertically scrollable. Desktop box gestures keep the fixed scientific-standard-v1 policy. */
  mobileBoxGesture?:'none'|'select-region'|'zoom-box';
}
export interface DKDSUnitDelegatedScientificPlotHandle { readonly target:HTMLElement; readonly renderOwner:'runtime'; dispose():void }
export type DKDSUnitScientificPlotHandle=DKDSScientificCurveSurface|DKDSUnitDelegatedScientificPlotHandle;
export interface DKDSUnitTemplateMetricCatalog { readonly [group:string]:Readonly<Record<string,number|string>> }
export interface DKDSUnitTemplateMetricProvenance { readonly files:readonly string[]; readonly selectors:readonly string[]; readonly runtime?:string }
export interface DKDSUnitPresetStep { readonly id:string; readonly unit:DKDSUnitTemplateId; readonly method:string; readonly parent:string|null; readonly spec:Readonly<Record<string,unknown>>; readonly contentFrom?:string; readonly textFrom?:string }
export interface DKDSUnitPresetDefinition { readonly id:string; readonly primary:readonly DKDSUnitPresetStep[]; readonly primeTemplates:Readonly<Record<string,Readonly<{unit:DKDSUnitTemplateId;method:string;variant:string}>>> }
export interface DKDSUnitTemplateContract { readonly purpose:string; readonly slots:readonly string[]; readonly responsive:string; readonly accessibility:readonly string[]; readonly invariants:readonly string[]; readonly extensionPoints:readonly string[]; readonly forbidden:readonly string[] }
export interface DKDSNativePluginUnitRegion { readonly id:string; readonly unit:DKDSUnitTemplateId; readonly variant:string; readonly role:string; readonly placements?:readonly string[]; readonly header?:string; readonly density?:DKDSUnitTemplateGroupDensity }
export interface DKDSNativePluginUnitBlueprint { readonly kind:string; readonly units:readonly DKDSUnitTemplateId[]; readonly regions:readonly DKDSNativePluginUnitRegion[]; readonly parity:readonly ('function'|'structure'|'geometry'|'style'|'interaction'|'responsive'|'mobile')[] }
export interface DKDSNativePluginGeometryMapping { readonly match:string; readonly unit:DKDSUnitTemplateId; readonly variant:string; readonly role:string; readonly mechanism:string }
export interface DKDSUnitChromePolicy { readonly unit:DKDSUnitTemplateId; readonly variant?:string; readonly role?:string; readonly header?:string; readonly title?:string; readonly meta?:string; readonly coreActions?:readonly string[]; readonly optionalCoreActions?:readonly string[]; readonly logicalOrder?:readonly string[]; readonly domainActions?:string; readonly invariants?:readonly string[] }
export interface DKDSUnitStructuralPrimitivePolicy { readonly unit:DKDSUnitTemplateId; readonly factory:string; readonly rule:string }
export interface DKDSPresentationUnitPolicy { readonly kind:string; readonly mobileRegion:string; readonly dataPrimaryMobileRegion?:string; readonly navigation:string }
export interface DKDSNativePluginPresentationSurfaceBlueprint { readonly id:string; readonly kind:'primary'|'prime'|'sub'; readonly role:string; readonly priority:number; readonly collapsible:boolean; readonly embedded?:boolean }
export interface DKDSNativePluginHostContributionBlueprint { readonly kind:'status'|'toolbar'; readonly id:string; readonly side:string; readonly order:number; readonly activity?:string; readonly priority?:number; readonly presentationOnly?:boolean }
export interface DKDSNativePluginPresentationBlueprint { readonly surfaces:readonly DKDSNativePluginPresentationSurfaceBlueprint[]; readonly contributions:readonly DKDSNativePluginHostContributionBlueprint[] }

export type DKDSUnitStateChannel='visible'|'enabled'|'selected'|'pressed'|'checked'|'expanded'|'busy'|'readonly'|'required'|'current'|'invalid'|'loading';
export interface DKDSUnitStateChannelDescriptor { readonly type:'boolean'|'boolean|string'; readonly reflect:readonly string[]; readonly rule:string }
export interface DKDSUnitStatePolicy { readonly allowed:readonly DKDSUnitStateChannel[]; readonly requiredA11y:readonly string[]; readonly keyboard:string }
export interface DKDSUnitAccessibilityPolicy { readonly roles:readonly string[]; readonly requirements:readonly string[] }
export interface DKDSUnitStateController { readonly unit:string; set(target:Element|{element:Element},name:DKDSUnitStateChannel,value:any):Element; apply(target:Element|{element:Element},states:Partial<Record<DKDSUnitStateChannel,any>>):Element; policy():DKDSUnitStatePolicy|null }
export interface DKDSNativePluginStateBlueprint { readonly channels:readonly DKDSUnitStateChannel[]; readonly roles:readonly string[]; readonly tabIndex:readonly number[]; readonly aria:readonly string[]; readonly keys:readonly string[]; readonly counts:Readonly<{states:number;roles:number;a11y:number;keyboard:number;unmapped:number}> }
export interface DKDSUnitGeometryOwnershipPolicy {
  readonly version:'1.0.3';
  readonly principle:'single-writer-bounded-configuration-v1';
  readonly roles:Readonly<{plugin:'bounded-configuration';unit:'intrinsic-constraint-and-internal-layout';presenter:'outer-surface-allocation';userPreference:'preference-only'}>;
  readonly immutable:readonly string[];
  readonly boundedTunables:readonly string[];
  readonly constraintAxes:Readonly<{inline:Readonly<{unitPublishes:string;presenterResolves:string}>;block:Readonly<{unitPublishes:string;presenterResolves:string}>}>;
}
export interface DKDSUnitResponsiveDensityPrinciple { readonly id:'compact-first-single-last-v1'; readonly rule:string; readonly unknownWidth:'preserve-base'; readonly singleColumnMaxWidthPx:number; readonly maxColumnDropPerBreakpoint:number; readonly pluginMayTune:readonly string[]; readonly coreLocked:readonly string[] }
export type DKDSUnitResponsiveDensityMode='presenter-projected'|'host-fill'|'overflow-aware'|'parent-sized'|'normal-flow'|'responsive-density-owner'|'inline-preserving'|'fixed-hit'|'wrap-declared'|'parent-grid'|'inline-control'|'intrinsic'|'flow'|'bounded-flow'|'wrap-or-scroll'|'centered-flow'|'scroll-owner'|'schema-owned'|'auto-fit-density'|'horizontal-overflow'|'presenter-and-fill'|'parent-resize'|'adaptive-columns'|'parent-canvas'|'bounded-overlay'|'intrinsic-hit'|'bounded-reflow'|'viewport-bounded'|'overflow-priority'|'dock-or-float'|'nonvisual';
export interface DKDSUnitTemplateRuntime {
  readonly version:'2.5.38'; readonly catalog:Readonly<Record<DKDSUnitTemplateId,any>>; readonly responsiveDensityPrinciple:DKDSUnitResponsiveDensityPrinciple; readonly responsiveDensityAudit:Readonly<Record<DKDSUnitTemplateId,DKDSUnitResponsiveDensityMode>>; readonly geometryOwnershipPolicy:DKDSUnitGeometryOwnershipPolicy; readonly contracts:Readonly<Record<DKDSUnitTemplateId,DKDSUnitTemplateContract>>; readonly metrics:DKDSUnitTemplateMetricCatalog; readonly metricProvenance:Readonly<Record<string,DKDSUnitTemplateMetricProvenance>>; readonly presets:Readonly<Record<string,DKDSUnitPresetDefinition>>; readonly layoutRecipes:Readonly<Partial<Record<DKDSUnitLayoutVariant,Readonly<Record<string,unknown>>>>>; readonly serviceCatalog:Readonly<Record<string,DKDSCoreServiceDescriptor>>; readonly formalServiceMethods:Readonly<Record<string,DKDSFormalCoreServiceMethodDescriptor>>; readonly visualServiceMigrations:Readonly<Record<string,DKDSUnitTemplateId>>; readonly chromePolicies:Readonly<Record<string,DKDSUnitChromePolicy>>; readonly structuralPrimitivePolicies:Readonly<Record<string,DKDSUnitStructuralPrimitivePolicy>>; readonly presentationRolePolicies:Readonly<Record<string,DKDSPresentationUnitPolicy>>; readonly stateSpecVersion:'1.0.0'; readonly stateChannels:Readonly<Record<DKDSUnitStateChannel,DKDSUnitStateChannelDescriptor>>; readonly statePolicies:Readonly<Record<string,DKDSUnitStatePolicy>>; readonly accessibilityPolicies:Readonly<Record<string,DKDSUnitAccessibilityPolicy>>; readonly accessibilityAttributes:Readonly<Record<string,string>>; readonly accessibilityRoles:readonly string[]; readonly accessibilityTabIndex:readonly (-1|0)[]; readonly keyboardKeys:readonly string[]; readonly layoutGeometryValues:Readonly<Record<string,readonly string[]>>; readonly layoutBreakpoints:readonly DKDSUnitLayoutBreakpoint[];
  readonly interactions:Readonly<{policy:'scientific-standard-v1';mandatory:readonly any[]}>;
  readonly workspace:{create(root:Element|string,spec?:DKDSUnitWorkspaceSpec):DKDSPluginWorkspace;compose(root:Element|string,spec?:DKDSUnitWorkspaceSpec&{primary?:any;primes?:any[];subs?:any[]}):DKDSPluginWorkspace};
  readonly surface:{create(host:Element|string,spec?:DKDSUnitSurfaceSpec):HTMLElement;detached(spec?:any):HTMLElement};
  readonly panel:{create(host:Element|string,spec?:DKDSUnitPanelSpec):DKDSUnitPanelHandle;detached(spec?:any):DKDSUnitPanelHandle};
  readonly page:{create(host:Element|string,spec?:DKDSUnitPageSpec):Readonly<{element:HTMLElement}>};
  readonly pageHeader:{create(host:Element|string,spec?:{tagName?:string;variant?:DKDSUnitPageHeaderVariant;title?:string;subtitle?:string;actions?:any[];activity?:string;content?:Element|string|Array<Element|string>;close?:boolean;closeLabel?:string;closeTitle?:string;onClose?:(context:any)=>void;className?:string;dataset?:Record<string,any>}):Readonly<{element:HTMLElement;title:HTMLElement;subtitle:HTMLElement|null;actions:HTMLElement;actionGroup:any;close:HTMLButtonElement|null}>};
  readonly section:{create(host:Element|string,spec?:DKDSUnitSectionSpec):Readonly<{element:HTMLElement;header:any;body:HTMLElement}>};
  readonly header:{create(host:Element|string,spec?:DKDSUnitHeaderSpec):DKDSUnitHeaderHandle};
  readonly toolbar:{create(host:Element|string,spec?:DKDSUnitToolbarSpec):DKDSUnitToolbarHandle;contribute(spec?:any):any};
  readonly action:{create(host:Element|string,spec:{id?:string;label?:string|(()=>string);icon?:string;variant?:DKDSUnitActionVariant;enabled?:boolean|(()=>boolean);visible?:boolean|(()=>boolean);onInvoke?:(context:any)=>any;handler?:(context:any)=>any;menu?:boolean;items?:any[]|((context:any)=>any[]);activity?:string;integrated?:boolean;direct?:boolean;title?:string;nativeSave?:string;nativeCopy?:string;className?:string}):Readonly<{element:HTMLElement;button?:HTMLButtonElement;actionGroup:any;id:string}>};
  readonly actionRow:{create(host:Element|string,spec?:DKDSUnitActionRowSpec):DKDSUnitToolbarHandle};
  readonly tabs:{create(host:Element|string,spec?:any):Readonly<{element:HTMLElement;tabs:any}>};
  readonly field:{create(host:Element|string,spec?:DKDSUnitFieldSpec):DKDSUnitFieldHandle};
  readonly check:{create(host:Element|string,spec?:DKDSUnitCheckSpec):Readonly<{element:HTMLElement;input:HTMLInputElement;label:HTMLElement}>};
  readonly chip:{create(host:Element|string,spec?:DKDSUnitChipSpec):HTMLElement}; readonly note:{create(host:Element|string,spec?:DKDSUnitNoteSpec):HTMLElement};
  readonly message:{create(host:Element|string,spec?:DKDSUnitMessageSpec):Readonly<{element:HTMLElement;meta:HTMLElement|null}>}; readonly summary:{create(host:Element|string,spec?:DKDSUnitSummarySpec):Readonly<{element:HTMLElement}>};
  readonly divider:{create(host:Element|string,spec?:DKDSUnitDividerSpec):HTMLElement}; readonly emptyState:{create(host:Element|string,spec?:DKDSUnitEmptyStateSpec):Readonly<{element:HTMLElement}>};
  readonly metric:{create(host:Element|string,spec?:any):Readonly<{element:HTMLElement;label:HTMLElement;value:HTMLElement}>};
  readonly list:{create(host:Element|string,spec?:DKDSUnitListSpec):DKDSUnitListHandle;item(host:Element|string,spec?:DKDSUnitListItemSpec):HTMLElement};
  readonly componentTree:{mount(host:Element|string,spec?:any,context?:DKDSUnitComponentTreeContext):any};
  readonly parameterForm:{mount(host:Element|string,schema?:any,options?:DKDSUnitParameterFormOptions):any};
  readonly legend:{create(host:Element|string,spec?:DKDSUnitLegendSpec):HTMLElement}; readonly status:{create(host:Element|string,spec?:DKDSUnitStatusSpec):HTMLElement;contribute(spec?:any):any};
  readonly floatingChrome:{create(host:Element|string,spec?:DKDSUnitFloatingChromeSpec):DKDSUnitToolbarHandle}; readonly splitHandle:{create(host:Element|string,spec?:DKDSUnitSplitHandleSpec):HTMLElement};
  readonly splitPane:{create(host:Element|string,spec:DKDSUnitSplitPaneSpec):DKDSUnitSplitPaneHandle;adopt(spec:DKDSUnitSplitPaneSpec):DKDSUnitSplitPaneHandle};
  readonly movableWindow:{create(host:Element|string|null,spec:DKDSUnitMovableWindowSpec):DKDSUnitMovableWindowHandle;adopt(target:Element|string,spec:DKDSUnitMovableWindowSpec):DKDSUnitMovableWindowHandle};
  readonly meter:{create(host:Element|string,spec?:DKDSUnitMeterSpec):DKDSUnitMeterHandle;adopt(target:Element|string,spec?:DKDSUnitMeterSpec):DKDSUnitMeterHandle};
  readonly layout:{create(host:Element|string|null,spec?:DKDSUnitLayoutSpec):HTMLElement;apply(target:Element|string,spec?:DKDSUnitLayoutSpec):HTMLElement;readonly recipes:Readonly<Partial<Record<DKDSUnitLayoutVariant,Readonly<Record<string,unknown>>>>>;readonly geometryValues:Readonly<Record<string,readonly string[]>>;readonly breakpoints:readonly DKDSUnitLayoutBreakpoint[]};
  readonly dialog:{open(spec?:any):any;confirm(spec?:any):any;prompt(spec?:any):any}; readonly menu:{create(spec?:any):any;open(spec?:any):any;contribute(spec?:any):any};
  readonly popover:{create(host:Element|string|null,spec?:DKDSUnitPopoverSpec):Readonly<{element:HTMLElement;header:any;body:HTMLElement;close:()=>void;reposition:(patch?:Partial<DKDSUnitPopoverSpec>)=>HTMLElement}>;detached(spec?:DKDSUnitPopoverSpec):Readonly<{element:HTMLElement;header:any;body:HTMLElement;close:()=>void;reposition:(patch?:Partial<DKDSUnitPopoverSpec>)=>HTMLElement}>};
  readonly portable:{create(id:string,node:Element|string,spec?:any):any;get(id:string):any};
  readonly prime:{build(spec:DKDSUnitPrimeSpec):DKDSPluginWorkspacePrimeSpec;register(workbench:DKDSPluginWorkspace,spec:DKDSUnitPrimeSpec):any};
  readonly plotView:{create(id:string,host:Element|string,spec:DKDSStrictPlotViewSpec):DKDSPlotView;adopt(id:string,card:Element|string,spec:DKDSStrictPlotViewSpec):DKDSPlotView};
  readonly plotGroup:{create(host:Element|string,spec?:DKDSUnitPlotGroupSpec):DKDSUnitPlotGroupController;buildPrime(spec:DKDSUnitPlotGroupPrimeSpec):DKDSPluginWorkspacePrimeSpec;registerPrime(workbench:DKDSPluginWorkspace,spec:DKDSUnitPlotGroupPrimeSpec):any;densities:Readonly<Record<DKDSUnitTemplateGroupDensity,Readonly<{id:DKDSUnitTemplateGroupDensity;gap:number;source:string}>>>};
  readonly scientificPlot:{create(target:any,spec?:DKDSUnitScientificPlotSpec):DKDSUnitScientificPlotHandle;policy:'scientific-standard-v1'};
  readonly table:{mount(id:string,container:any,spec?:DKDSUnitTableSpec):DKDSTableSurface|null;bind(id:string,table:any,spec?:DKDSUnitTableSpec):DKDSTableSurface|null};
  readonly provider:{describe(kind?:DKDSUnitProviderVariant,spec?:Record<string,any>&{variant?:DKDSUnitProviderVariant}):Readonly<Record<string,any>>};
  readonly state:{for(unit:DKDSUnitTemplateId|string):DKDSUnitStateController;set(target:Element|{element:Element},name:DKDSUnitStateChannel,value:any,options?:{unit?:DKDSUnitTemplateId|string}):Element;apply(target:Element|{element:Element},states:Partial<Record<DKDSUnitStateChannel,any>>,options?:{unit?:DKDSUnitTemplateId|string}):Element};
  readonly compositions:{readonly acceptedScientificV1:Readonly<{signature:any;primary(spec?:DKDSScientificWorkbenchPrimarySpec):HTMLElement;prime(spec?:DKDSScientificReferencePrimeSpec):DKDSPluginWorkspacePrimeSpec}>};
}
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
    scientificPlot:DKDSScientificPlotRuntime; sections:DKDSScientificSectionRuntime; plotGroups:DKDSPlotGroupRuntime; scientificWorkbench:DKDSScientificWorkbenchRuntime; unitTemplates:DKDSUnitTemplateRuntime; series:DKDSSeriesRegistry; legends:{group(id?:string,spec?:any):DKDSLegendGroup;get(id:string):DKDSLegendGroup|null}; groupPlots:{create(container:Element|string,spec?:any):DKDSGroupPlot}; groupArea:DKDSGroupAreaRuntime; tooltips:DKDSTooltipRuntime; plotViews:DKDSPlotViewRuntime; tables:DKDSTableRuntime; settings:DKDSSettingsRuntime; dialogs:DKDSDialogRuntime; selection:DKDSSelectionRuntime; interaction:DKDSInteractionRuntime; interactions:any; interactionBehaviors:DKDSInteractionBehaviorRuntime; contextMenus:any;
    /** Canonical runtime facade for manifest requirement `ui.workspace` / capability label `ui.plugin-workspace`. There is intentionally no `ctx.ui.pluginWorkspace`. */
    workspaceSurface:DKDSPluginWorkspaceRuntime & {compose(root:any,spec?:DKDSPluginWorkspaceCreateSpec):DKDSPluginWorkspace;roles:Readonly<{PRIMARY:'primary';PRIME:'prime';SUB:'sub'}>;}; grid:DKDSGridRuntime; portable:any; layout:{split(spec:DKDSSplitSpec):DKDSSplitController;move(spec:DKDSMovableSurfaceSpec):DKDSMovableSurface;solve(spec:Parameters<DKDSActiveLayoutSolver['solve']>[0]):ReturnType<DKDSActiveLayoutSolver['solve']>;[key:string]:any}; actions:any;
    activities:{add(spec:DKDSActivitySpec):any;activate(id:string):any;active():string};
    topWorkspace:DKDSTopWorkspaceRuntime; toolbar:any; statusBar:DKDSStatusBarRuntime; mainTools:any; menus:DKDSMenusRuntime; sidebar:any; inspectors:any; groupCharts:any; groupViews:any; mainViews:any; selectionMenus:any; mainOverlays:any; shortcuts:any;
    pages:{add(spec:{id:string;pageId?:string;html?:string;label?:string;title?:string;description?:string;icon?:string;order?:number;primary?:boolean;presentation?:'activity'|'toolbar';toolbar?:boolean;className?:string;activity?:string;activityId?:string;onOpen?:(context:any)=>any}):HTMLElement}; panels:any; styles:any; theme:DKDSThemeCapability; edit:DKDSEditRuntime; designSystem:DKDSDesignSystem
  };
}
export interface DKDSPluginRegistry { define(manifest:DKDSManifest,activate:(ctx:DKDSPluginContext)=>DKDSPluginInstance|Promise<DKDSPluginInstance>|void|Promise<void>):void }
declare global { const DKDSPlugins:DKDSPluginRegistry; interface Window { DKDSPlugins:DKDSPluginRegistry } }
