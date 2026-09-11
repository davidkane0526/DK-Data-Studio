# DKDS Phase C lightweight metadata + bounded column access — 3.68.78

## Scope

This slice keeps the canonical JSON Artifact representation and default `get/list` contract unchanged. It adds three read-only Store paths for consumers that do not need a complete payload:

- `listMetadata(options)` — Artifact metadata/shape enumeration without numeric payload arrays or full provenance steps;
- `columnMetadata(tableId)` — DataTable column descriptors without `values`;
- `readColumnRange(tableId, column, {start, limit})` — detached immutable bounded column slice with explicit `start/end/totalLength/artifactRevision`.

`limit` is mandatory and capped at **65536** values. An omitted, infinite, fractional, negative or oversized bound fails instead of becoming an accidental whole-column read. Range copying touches only the returned slice; it does not scan unrequested values. Numeric dtype validation remains a Column Buffer mutation concern, not the complete source column.

## 1M-point checkpoint

Same-host Node measurement, 3 samples, explicit GC, one table with two 1M-point numeric columns; bounded range is 2048 values. These are trend measurements, not release thresholds.

| Operation | Median | p95 | Peak heap delta |
| --- | ---: | ---: | ---: |
| Default `list()` full Artifact clone | 207.913 ms | 208.671 ms | 30.525 MiB |
| `listMetadata()` | 0.170 ms | 0.475 ms | 0.023 MiB |
| `columnBuffer()` full 1M-column snapshot | 185.016 ms | 193.167 ms | 7.647 MiB |
| `readColumnRange(..., limit:2048)` | 0.230 ms | 0.449 ms | 0.103 MiB |

At this checkpoint the metadata list is about **1223×** faster than cloning the full Artifact, while the 2048-value range read is about **804×** faster than a full-column snapshot. The more important architectural result is bounded allocation: the new range path scales with requested `limit`, not source-column length.

## Consumer migration

The Studio Kernel/MCP `data.artifacts.list` path now uses metadata-only listing. DataTable `data.artifacts.preview` builds its bounded rows from column metadata + range reads rather than calling full `get()`. New `data.artifacts.columns` and `data.artifacts.column-range` tools expose the same bounded contract to AI/MCP.

Plugin facades in the main window and dedicated windows expose the same SDK methods. Workbench assignment visibility remains enforced before a plugin can enumerate/read a column. Data Center 1.15.19 uses one metadata catalog per Store revision for artifact navigation and reads only the first 18 visible rows per column for its table preview; mutation/workflow paths still hydrate a complete Artifact when they genuinely require one.

## Boundary deliberately retained

- Default `get()` and `list()` still return detached complete Artifacts.
- `columnBuffer()` remains the full-column transactional mutation snapshot.
- Persistence schema stays 2 and full scientific export remains unchanged.
- No TypedArray storage conversion, per-buffer revision, worker pool or chunked file IO is added here.
- Per-buffer revisions / changed-lineage batching remain Phase C step 6.
