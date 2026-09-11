# DKDS Phase C Store-owned Column Buffer — 3.68.77

## Boundary

This iteration proves the ownership and mutation contract before changing physical storage or default Artifact reads:

- one project Artifact Store remains the canonical owner;
- `columnBuffer(id, column)` returns a frozen copy with explicit dtype, owner and expected Artifact revision;
- `transactColumn(buffer, mutate)` is synchronous, fixed-length and atomic;
- foreign/stale snapshots, callback failure, async callbacks, shape changes and dtype/precision violations publish nothing;
- direct main-project commits produce one undo entry;
- current JSON `values[]`, Store schema, default `get/list` and scientific export remain unchanged.

The snapshot is authorized through a private Store-local `WeakMap` entry rather than a forgeable public ID. Successful commits use the existing Store `upsert` path, so Artifact revision, kind revision, fingerprint, lineage indexes, notifications, dedicated-window deltas and persistence stay on one owner path.

## Runtime evidence

`tests/test-v36877-column-buffer-transactions.js` covers immutable reads, owner rejection, optimistic stale rejection, no-op behavior, one-event commit, rollback, synchronous-only mutation, fixed shape, strict integer dtype, unrelated-Artifact stability and JSON/fingerprint round trip.

`tests/test-v36877-column-buffer-host-history.js` executes the main-project facade and Core Project History: one commit records one semantic entry, undo restores the prior values, redo restores the committed values, and all three operations use the canonical Artifact event path.

## Full-column cost checkpoint

Same-host ad-hoc checkpoint, Node 24.19 with explicit GC, three samples per size (median):

| Numeric column | Immutable full read | One-cell full-column transaction |
| --- | ---: | ---: |
| 100k values | 19.830 ms | 89.713 ms |
| 1M values | 198.346 ms | 877.327 ms |

These are trend measurements, not release thresholds. They deliberately expose the remaining cost: the safe first contract copies and validates the complete column, and the current Store still clones the complete Artifact on commit. This iteration does not claim a large-data speedup. The next Phase C slice must add metadata-only listing plus explicit bounded range reads and update consumers before changing default `get/list`; per-buffer revisions and changed-lineage batching remain the following step.

## Compatibility and presentation

No compatibility alias, secondary buffer registry, new project schema, global TypedArray conversion or plugin-specific Core branch was added. Plugin API remains 1.19.0; the additive authoring contract is SDK 1.32.0. No Desktop/Mobile geometry or paint was changed, so static suites are not presented as real-device visual acceptance.
