# Reference-only Selection and linked transactions — SDK 1.48.0

DK Data Studio Phase E extends the existing Entity, Selection and Interaction runtimes. It does not add a second global event bus.

## Stable identity

Use `ctx.ui.selection.refs` to create references:

```js
const refs=ctx.ui.selection.refs;
const artifact=refs.artifact(artifactId,{artifactRevision});
const series=refs.series(artifactId,seriesId);
const row=refs.row(artifactId,rowId,{seriesId});
```

`artifactId`, `seriesId` and source `rowId` define semantic identity. `artifactRevision` is an optimistic snapshot condition and does not participate in `refs.identity(ref)`.

For DataTable Artifacts, `ctx.data.model.seriesId(table,columnRef)` returns the stable column id and `ctx.data.model.rowId(table,index)` returns the stable source-row id. If the imported table supplies explicit `rowIds`, Core preserves them. Otherwise row identity is derived as `row:<source-index>` without allocating a string array for every row.

## Selection document

A persisted/published Selection item has this shape:

```js
{
  type:'example.point',
  id:'...',
  role:'point',
  ref:{artifactId,seriesId,rowId},
  meta:{label:'optional bounded presentation metadata'}
}
```

`value` is not part of Selection schema 2. Data type `selection(...)` projections that return `value` fail the current contract. Consumers that need source data resolve through the reference or the owning Artifact/service.

`InteractionRuntime.selectRef(ref, options)` derives a deterministic item id from the reference when no explicit id is supplied.

## Bounded ranges

Do not publish large arrays of selected point or row ids. Publish the source plus bounds:

```js
interaction.region({min:x0,max:x1}, [], {
  rangeType:'data.range',
  sourceRef:refs.series(artifactId,seriesId)
});
```

Core rejects oversized item sets, oversized context/reference metadata, and range payloads that embed point/row/index arrays. This keeps cross-view interaction cost bounded independently of dataset size.

## Interaction transactions and link groups

SDK 1.39 adds transaction metadata to the existing `InteractionRuntime` / `dkds:selection-changed` path. It does **not** persist transaction data inside Selection schema 2.

Create linked runtimes explicitly:

```js
const interaction=ctx.ui.interaction.create('main-selection',{
  selection:{multiple:true,defaultType:'data.series'}
});
const unlink=interaction.link('analysis-selection',{
  acceptTypes:['data.series','data.point']
});
```

Every local Interaction change receives one transaction envelope in callback `meta.transaction`:

```js
{
  schema:'dkds.interaction-transaction.v1',
  transactionId:'tx:...',
  projectId:'...',
  linkGroup:'analysis-selection',
  originOwner:'producer.plugin',
  originScopeId:'producer.plugin#1',
  originRuntimeId:'main-selection',
  sourceOwner:'producer.plugin',
  sourceScopeId:'producer.plugin#1',
  sourceRuntimeId:'main-selection',
  remote:false
}
```

`origin*` remains unchanged for the life of the transaction. `source*` identifies the Runtime currently applying it. A linked remote application sets `remote:true`.

Link groups are project-scoped. The current project identity is resolved when the event is emitted/observed, so a long-lived plugin scope cannot carry a link from one project into another after a project switch. `ctx.ui.selection.scope()` exposes the current `{owner, scopeId, projectId}` for diagnostics.

`interaction.link(...)` listens on the existing Selection bridge and applies matching state through `applyRemoteSelection(...)`. Remote application preserves the incoming `transactionId`, is deduplicated before mutation, and is emitted locally to the Runtime's bindings/subscribers **without rebroadcasting the global Selection event**. Therefore A→B→A terminates at A.

For custom adapters, preserve the transaction explicitly:

```js
const off=ctx.ui.selection.observe((snapshot,meta,detail)=>{
  target.applyRemoteSelection(snapshot,{
    transaction:detail.transaction,
    linkGroup:'analysis-selection'
  });
},{linkGroup:'analysis-selection'});
```

Do not call a normal local `select*()` method when applying remote state. That creates a new local transaction by design. `applyRemoteSelection(...)` is the remote-state boundary.

Each Interaction Runtime keeps a bounded recent-transaction set (currently 256 ids), so cycle suppression cannot grow with session length. Plugin/scope disposal removes link observers through the existing lifecycle.

## Cross-scope propagation

The existing `dkds:selection-changed` bridge remains the single cross-scope Selection event. `ctx.ui.selection.observe(...)` supports `linkGroup`, `projectId`, `sameProject`, and scope/runtime exclusion filters; same-project filtering is enabled by default when transaction project metadata is present.

Scientific dimension/unit compatibility is provided by `ctx.science.units` in SDK 1.40.0. Table↔curve reference selection is implemented in SDK 1.41.0. SDK 1.42.0 adds heatmap-cell↔source-scan selection through Y-aligned scalar-field source references and explicit series targeting for source-scan plots. SDK 1.43.0 adds viewport linking as a **separate bounded Interaction state channel on the existing bridge**; SDK 1.44.0 adds bounded legend visibility linking on a separate `legend` channel using stable `artifactId / seriesId` targets. Selection schema 2 remains unchanged by both.
