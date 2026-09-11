# Artifact metadata and bounded column access

DK Data Studio 3.68.81 / SDK 1.36 provides lightweight/bounded DataTable access plus column-local buffer revisions for precise invalidation.

## Metadata-only Artifact listing

```js
const rows=ctx.data.artifacts.listMetadata({
  kind:'data.table',
  includeTransient:true
});
```

Each descriptor keeps Artifact identity and lightweight structural information such as `id`, `kind`, `name`, `semanticType`, dimensions, Store-local `artifactRevision`, source/lineage fields, assignment metadata and DataTable column descriptors. Numeric payload arrays are not included, and full provenance steps are omitted; `provenanceCount` and lightweight unique `provenanceTypes` are retained for list/filter UI.

The snapshot is detached from the canonical Store. Mutating nested metadata in the returned descriptor cannot change source data.

## Column metadata

```js
const columns=ctx.data.artifacts.columnMetadata(tableId);
```

A column descriptor contains `id`, `key`, `name`, `unit`, `dtype`, `role`, `length`, column `metadata`, `artifactId`, `artifactRevision` and `bufferRevision`. It never contains `values`. `bufferRevision` changes when Core knows that column payload/interpretation changed; it is narrower than the owning Artifact revision.

Use this API for column pickers, schema inspection, field menus and other structure-only UI.

## Bounded range reads

```js
const page=ctx.data.artifacts.readColumnRange(
  tableId,
  'signal',
  {start:4096,limit:2048}
);
```

The returned immutable snapshot contains:

```text
version
owner.artifactId / columnId / columnKey
dtype
start / end
length
totalLength
artifactRevision
bufferRevision
values[]
```

`limit` is mandatory. It must be an integer from `1` through `65536`. Core rejects omitted, infinite, fractional, negative or oversized bounds rather than interpreting them as a request for the whole column. `start` defaults to `0`, must be a non-negative integer, and is clamped to the end of the source column for empty-tail reads.

Range cost scales with the requested slice. Core does not scan or copy values outside that slice. Values are detached from the canonical Store; object-valued cells are cloned inside the requested range.

`artifactRevision` is the Store-local version of the complete owning Artifact. `bufferRevision` is the Store-local version of the selected column payload. For viewport/pagination work that depends only on one column, compare `bufferRevision`; metadata edits or precise transactions on another column need not invalidate that work. Use `artifactRevision` when non-column Artifact metadata also affects the result.

## Choosing the correct API

Use `listMetadata()` for Artifact discovery, `columnMetadata()` for table structure, and `readColumnRange()` for preview/pagination/viewport work. `columnRevision(id, column)` reads the current payload-local stamp without copying values. Use `get()` only when the complete Artifact is actually required. Use `columnBuffer()` only when a full-column transactional mutation is required.

`transactColumn()` is the trusted precise-write boundary: committing Y advances Y `bufferRevision` and the owning `artifactRevision`, but leaves X `bufferRevision` unchanged. In contrast, unrestricted `upsert()`/`publish()` can replace arbitrary payloads, so Core conservatively advances all DataTable buffer revisions without performing an O(N) payload comparison. This avoids turning revision bookkeeping into a large-data scan.

These methods do not change project persistence, full-resolution export, default `get/list`, or the Column Buffer transaction contract.
