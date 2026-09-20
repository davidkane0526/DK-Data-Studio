# Acquisition-order metadata — SDK 1.48.0

History-dependent physics must not interpret UI order, source enumeration order, object insertion order, or file-name sorting as instrument acquisition order. SDK 1.48 defines one explicit lightweight acquisition contract for imported source Artifacts.

Canonical metadata lives at `artifact.metadata.acquisition`:

```ts
interface DKDSAcquisitionMetadata {
  runId?: string;
  sequenceIndex?: number;        // non-negative integer
  timestamp?: string;
  parentSequenceIndex?: number;  // optional branch/history parent
  provenance?: 'source'|'import-batch'|'unknown';
}
```

Importers should preserve instrument-provided fields whenever they are available. The shared Import Workbench also accepts equivalent acquisition metadata exposed by the importer on the source/file descriptor or Artifact and canonicalizes it into `metadata.acquisition`.

For a multi-file import batch, if an imported Artifact does not provide an explicit `sequenceIndex`, Core assigns a deterministic zero-based index in the exact selected-file order and each importer's emitted Artifact order. That assigned order is marked `provenance:'import-batch'`. An importer-provided sequence is retained and defaults to `provenance:'source'` when no provenance is supplied.

The metadata-only Artifact API retains these fields explicitly:

```js
const rows=ctx.data.artifacts.listMetadata({kind:'data.table'});
console.log(rows[0]?.acquisition);
```

`ctx.data.sources.list()` also exposes the lightweight `acquisition` descriptor. For history-aware algorithms, prefer the convenience API:

```js
const order=ctx.data.sources.acquisitionOrder({artifactIds});
// [{artifactId, runId, sequenceIndex, timestamp, parentSequenceIndex?, provenance}]
```

The returned rows are deterministic and do not depend on UI/source enumeration order. They are ordered by `runId`, then known `sequenceIndex`, then parseable `timestamp`, then `artifactId` as a final deterministic tie-breaker. A consumer that requires one continuous physical history should select one `runId`; DK Data Studio does not infer continuity across different runs.

If a source lacks acquisition metadata and was not imported through the shared Import Workbench, `sequenceIndex` is `null` and `provenance` is `unknown`. History-dependent models should fail closed or request explicit ordering instead of silently treating the current UI order as acquisition order.
