# Standard Data Model and Provenance — v3.62

## Purpose

The plugin branch no longer treats every feature-specific object as the primary data contract.

The generic contract is exposed as:

```js
window.DKDSData
```

The model is deliberately JSON-serializable so the same artifacts can be consumed by Electron, LAN Web and the React Native Android shell.

## Artifact envelope

Every standard object has:

```text
artifactVersion
id
kind
name
createdAt / updatedAt
metadata
source
provenance[]
tags[]
transient
```

`kind` is the primary type discriminator.

Current factories:

```text
data.table
  DKDSData.createTable()

data.series
  DKDSData.createSeries()

data.sweep
  DKDSData.createSweep()

data.events
  DKDSData.createEventSeries()

data.image
  DKDSData.createImageData()

result.peaks
  DKDSData.createPeakSet()

result.fit
  DKDSData.createFitResult()

result.analysis
  DKDSData.createAnalysisResult()

annotation
  DKDSData.createAnnotation()
```

Plugins may introduce additional `kind` values, but should first prefer these generic types.

## DataTable

A DataTable is the default tabular exchange type.

```js
const table = DKDSData.createTable({
  name: 'Device A',
  columns: [
    { key:'Vd', name:'Drain voltage', unit:'V', role:'x', values:[...] },
    { key:'Id', name:'Drain current', unit:'A', role:'y', values:[...] },
    { key:'Vg', name:'Gate voltage', unit:'V', role:'group', values:[...] }
  ]
});
```

Column fields:

```text
id
key        machine-facing stable identifier inside a table
name       human-facing label
unit
dimension  optional canonical physical dimension for scientific linking
quantity   optional domain quantity identifier; descriptive, not a replacement for unit
dtype
role       x / y / group / index / derived / ...
values[]
metadata
```

Factory inputs for numeric columns and `data.series` / `data.sweep` / `data.transform` / `result.matrix` axes may also be number-based TypedArrays. Core copies those inputs immediately into the current JSON-serializable Artifact representation, so changing the caller's TypedArray after factory return cannot modify the Artifact. BigInt TypedArrays are rejected because the current project Artifact format is JSON-serializable. This is an input-boundary convenience, not a zero-copy buffer contract.

`result.matrix.z` must be rectangular: its row count equals `y.length`, and every row length equals `x.length`. `validateArtifact()` and Artifact Store writes reject malformed matrices rather than accepting a shape that the renderer would interpret ambiguously.

Use `key` in recipes/formulas when possible. `name` may be localized or edited by users.

For cross-view numeric interoperability, axis compatibility is decided by `ctx.science.units`, never by `name`/label equality. `data.series`, `data.sweep` and `data.transform` may additionally carry `xDimension`, `yDimension`, `xQuantity` and `yQuantity`; `result.matrix` may also carry `valueDimension` and `valueQuantity`. Metadata-only Store reads preserve these fields so compatibility can be checked without reading full numeric payloads. Unknown units and dimension/unit conflicts fail closed.

## Artifact Store

Every project tab owns a generic Artifact Store.

Core host API exposed to plugins:

```js
ctx.data.artifacts.list()
ctx.data.artifacts.get(id)
ctx.data.artifacts.listMetadata()
ctx.data.artifacts.columnMetadata(id)
ctx.data.artifacts.readColumnRange(id, column, {start, limit})
ctx.data.artifacts.add(artifact)
ctx.data.artifacts.upsert(artifact)
ctx.data.artifacts.remove(id)
ctx.data.artifacts.lineage(id)
ctx.data.artifacts.revision(kind)
ctx.data.artifacts.artifactRevision(id)
ctx.data.artifacts.columnRevision(id, column)
ctx.data.artifacts.fingerprint(id)
```

Artifact reads are snapshots. The Store exposes no mutable internal-object handle; canonical changes must use `add`, `upsert`, `publish`, `remove` or a documented higher-level history operation so revisions, lineage and notifications remain coherent.

The Artifact Store is project-scoped, not application-global.

`artifactRevision(id)` is a monotonic change stamp local to the current Store. It advances only when that id is added, changed, removed or re-added, so an Artifact-specific view is not invalidated by changes to an unrelated object of the same `kind`. It is intentionally not serialized and must not be treated as permanent identity.

`columnRevision(id, column)` is narrower. It tracks one DataTable column payload/buffer. A trusted `transactColumn()` changes only the edited column revision while still advancing the owning Artifact revision. Unrestricted full-Artifact writes conservatively advance every DataTable column revision because Core cannot safely infer changed payloads without scanning them.

`fingerprint(id)` is the complete canonical content identity used when correctness must survive save/restore or a new Store instance. Core computes the same digest as the previous sorted canonical JSON contract while streaming JSON tokens into the hash, so large numeric payloads no longer require one additional giant JSON string. `createdAt` and `updatedAt` remain excluded; metadata, lineage, provenance and payload values remain included. `revision(kind)` retains its aggregate role for computations that genuinely depend on every Artifact of a kind.

### Store-owned Column Buffer

The first bounded Column/Buffer contract is explicit and Store-owned:

```js
const buffer=ctx.data.artifacts.columnBuffer(tableId,'Id');

ctx.data.artifacts.transactColumn(buffer,draft=>{
  for(let index=0;index<draft.length;index++)draft[index]*=gain;
},{label:'Apply calibrated gain'});
```

`columnBuffer()` returns a frozen, full-column snapshot with `owner`, `dtype`, `length`, `artifactRevision`, `bufferRevision` and frozen `values`. The snapshot carries a private Store ownership record; it cannot authorize a write in another Store. Mutating the returned values cannot mutate the source Artifact.

`transactColumn()` is synchronous, atomic and fixed-length. It creates a private draft, validates every committed value against the declared dtype, and performs one Store upsert only after the callback returns successfully. A thrown callback, an async callback, a length change, a dtype/precision violation, a foreign snapshot or a stale buffer revision leaves the source unchanged. A no-op does not advance revisions or emit an event. Main-project direct transactions record one semantic undo entry unless `{history:false}` is explicit.

Supported numeric dtypes are `number`, `float64`, `float32`, `int32`, `uint32`, `int16`, `uint16`, `int8` and `uint8`. `float32` and integer commits must already be exactly representable; Core does not silently round or clamp. Public and persisted Artifacts continue to use the existing JSON Array representation. Inside the project-scoped Store, dense exact numeric payloads may use Store-owned typed physical backing to reduce resident memory. That backing is never returned directly: full reads, events, undo/save snapshots, exports, Column Buffer snapshots and bounded ranges materialize ordinary Arrays. `NaN` retains the existing `null`-on-disk / `NaN`-on-rehydrate rule, and `-0`/canonical fingerprint semantics are preserved in memory.


### Physical numeric backing

From 3.68.82, the Store can compact long-lived dense numeric payloads without changing the Artifact schema. Eligible payloads are DataTable numeric columns, x/y sequences of `data.series` / `data.sweep` / `data.transform`, and `result.matrix` x/y plus each rectangular z row. `number`/`float64` use Float64 physical storage; explicitly narrower/integer dtypes are used only when every value is already exactly valid for that dtype. Sparse, mixed-type or invalid-for-dtype sequences stay as ordinary Arrays rather than being rounded, clamped or densified.

This is a physical Store implementation detail, not a new SDK data type. `get()` and `list()` deliberately materialize complete ordinary Arrays for compatibility. Consumers that do not need a full payload should continue to prefer `listMetadata()`, `columnMetadata()` and `readColumnRange()` so the Store does not have to materialize a large compatibility snapshot.

### Lightweight metadata and bounded range reads

Structure-only and viewport/preview consumers should not hydrate an entire numeric payload first:

```js
const tables=ctx.data.artifacts.listMetadata({kind:'data.table'});
const columns=ctx.data.artifacts.columnMetadata(tableId);
const window=ctx.data.artifacts.readColumnRange(tableId,'Id',{start:0,limit:2048});
```

`listMetadata()` omits numeric payload arrays and full provenance steps while retaining Artifact identity, dimensions, source/lineage fields, assignment metadata, `provenanceCount`, unique `provenanceTypes` and lightweight DataTable column descriptors. `columnMetadata()` returns column descriptors without `values`. Both are detached snapshots.

`readColumnRange()` requires an explicit integer `limit` from 1 through 65536. It returns only that detached slice together with `start`, `end`, `totalLength`, owner metadata, `artifactRevision` and `bufferRevision`. It never treats an omitted limit as an unbounded read, and it copies only cells inside the requested range. Consumers that page one column across multiple reads can compare `bufferRevision` to reject mixed payload versions; use `artifactRevision` when table-level metadata also matters.

Lineage indexing is maintained incrementally by changed parent→child edges. Store batches no longer rebuild the complete lineage index after each add/upsert/remove. The default complete `get()` / `list()` contract, project schema and full-resolution scientific export remain unchanged.

### Canonical scientific source data

Studio 3.62 does not maintain a second `datasets` store. Imported transport data is persisted as `data.table` Artifacts, normally with `semanticType: "science.transport.iv"`, source metadata and `metadata.dataAssignments`.

Scientific algorithms that still operate most naturally on `{path, vg, points}` transport series receive an **ephemeral projection** from the canonical table rather than a mirrored persistent object:

```text
canonical data.table Artifact
    ↓
DKDSData.transportDatasetFromTable()
    ↓
ephemeral scientific transport view
```

`DKDSData.transportDatasetsFromArtifacts()` applies assignment scoping and produces these views for consumers such as Resonance and TER. The projection is never saved as a second project data source.

Historical project files are handled before runtime restore by `src/project-importers/compatibility-gateway.js`. That gateway materializes historical dataset arrays once into persistent canonical DataTable Artifacts and then removes the old fields.

## Project JSON

Schema v3 projects persist generic artifacts under `dataModel` and plugin/host state in separate namespaces:

```json
{
  "dataModel": {
    "schema": 2,
    "artifacts": []
  }
}
```

Feature-specific state must still use plugin namespaces under `plugins`.

Do not put feature-specific fields inside `dataModel`.

## Provenance

Every transformation should preserve how a result was produced.

A provenance step contains:

```text
id
timestamp
type
label
providerId
pluginId
version
parameters
inputs[]
outputs[]
manual
note
source
environment
```

Example:

```json
{
  "type": "formula",
  "label": "Derived column: Resistance",
  "providerId": "formula.derived-column",
  "pluginId": "builtin.data-center",
  "version": "1.0.0",
  "parameters": {
    "formula": "abs(Vd / Id)",
    "unit": "Ω"
  },
  "inputs": ["legacy-table:abc123"],
  "outputs": ["data-table:..."],
  "manual": false
}
```

The Workflow Engine also stamps:

```text
environment.executionId
environment.nodeId
```

so a result can be traced to one concrete workflow execution.

## Scientific rule

Never mutate the source artifact merely to make a chart convenient.

Preferred pattern:

```text
source artifact
    ↓
derive()
    ↓
new artifact + provenance step
```

This makes project reconstruction and manuscript result auditing possible.
