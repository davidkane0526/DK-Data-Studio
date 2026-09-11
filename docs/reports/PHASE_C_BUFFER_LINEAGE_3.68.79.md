# Phase C Buffer Revision + Lineage Benchmark — 3.68.79 WIP

Same-host comparison against the clean 3.68.78 Data Store implementation. Setup is excluded from each timed operation. These figures are trend evidence, not release thresholds.

| Operation (1000 artifacts/edges, 5 samples) | 3.68.78 median | 3.68.79 median | Speedup | Median reduction |
|---|---:|---:|---:|---:|
| Create lineage chain | 140.523 ms | 33.398 ms | 4.21× | 76.2% |
| Batch re-parent 1000 children | 143.119 ms | 37.849 ms | 3.78× | 73.6% |

Correctness checks confirm final parent/child edges and ancestor traversal. The 3.68.79 run additionally confirms Artifact revision advancement, unchanged X-column buffer revision during a trusted Y-only transaction, Y revision advancement, and continued validity of the pre-existing X buffer transaction.

The implementation deliberately does **not** scan whole column payloads to infer changes on unrestricted `upsert()` / `publish()` calls. Those writes conservatively invalidate DataTable column buffers. Precise per-column invalidation is used only when Core has a trusted changed-column boundary such as `transactColumn()`.
