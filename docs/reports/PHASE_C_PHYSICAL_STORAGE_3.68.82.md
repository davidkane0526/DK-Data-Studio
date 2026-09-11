# Phase C — Physical Artifact Storage (3.68.82 WIP)

## Scope

3.68.82 closes the planned Phase C storage work by changing only the project-scoped Artifact Store physical representation. The public Artifact schema, SDK payload types and project JSON remain ordinary Arrays. No calculation or export is downsampled.

Eligible dense numeric sequences are stored internally in exact typed backing: DataTable numeric columns, series/sweep/transform x/y, and matrix x/y plus z rows. Sparse/mixed values and sequences that are not exactly valid for their declared narrow/integer dtype remain Arrays.

## Contract invariants

- `get()` / `list()` / Store events return detached ordinary Arrays.
- save/restore and undo snapshots keep the existing JSON representation.
- `readColumnRange()` and `columnBuffer()` remain ordinary immutable Array snapshots.
- `transactColumn()` keeps fixed-length, dtype-validation and per-buffer revision semantics.
- NaN, -0 and infinities are preserved in memory; existing JSON NaN rehydrate behavior is unchanged.
- canonical fingerprints hash typed backing as the same logical JSON numeric sequence, so storage representation does not change identity/dedupe.

## Same-machine memory measurements

Three independent process runs per row; values below are medians. These are development-environment trend measurements, not portable pass/fail limits.

| Scenario | 3.68.81 resident heap | 3.68.82 resident heap | 3.68.81 RSS Δ | 3.68.82 RSS Δ |
| --- | ---: | ---: | ---: | ---: |
| 1M-row DataTable, 2 Float64 columns | 76.33 MiB | **30.58 MiB** | 228.23 MiB | **160.47 MiB** |
| 1M-point `data.series` x/y | 76.33 MiB | **30.57 MiB** | 156.62 MiB | **81.25 MiB** |
| 500×500 `result.matrix` | 7.76 MiB | **2.11 MiB** | 36.66 MiB | **18.75 MiB** |

For the 1M-point series, materializing one complete compatibility `get()` snapshot retained about 45.76 MiB additional heap in 3.68.81 versus about 22.20 MiB in 3.68.82 on the same environment. Full reads are still intentionally expensive relative to bounded reads; metadata/range APIs remain the preferred path for previews and viewport consumers.

## Design decision

This patch deliberately does not introduce a public TypedArray Artifact type, SharedArrayBuffer, mmap layer, chunk object graph or alternate persistence model. A contiguous typed backing is sufficient to remove a large fraction of long-lived JS Array overhead while preserving the existing contracts. Further physical changes should be measurement-driven rather than adding a second data model speculatively.
