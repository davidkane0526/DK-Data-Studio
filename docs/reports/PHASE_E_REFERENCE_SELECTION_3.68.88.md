# Phase E — Stable References and Reference-only Selection (3.68.88 WIP)

## Scope

This patch implements Phase E steps 1–3 only. It extends the existing Entity, Selection and Interaction runtimes; it does not create a second global event bus and it does not yet implement link-group transactions, linked-axis unit conversion, or the concrete table/curve/heatmap/viewport/legend link adapters.

## Identity contract

Core now exposes one reference contract through `selectionReferences` and `ctx.ui.selection.refs`.

- `artifactId` identifies the canonical Artifact.
- `seriesId` identifies a stable source series within an Artifact. DataTable column `id` is the canonical column/series identity.
- `rowId` identifies the source row. DataTable exposes `rowId(table,index)` and preserves explicit imported row ids when present; otherwise it derives `row:<source-index>` without materializing a second row store.
- `artifactRevision` is an expected Store snapshot condition. It can travel on a reference but is deliberately excluded from permanent `referenceIdentity`.

Scientific display sampling now carries `rowId` beside the original source point index. Viewport sampling therefore changes only display density, not the source identity of retained points.

## Selection schema 2

Selection items now contain only `type`, stable `id`, `role`, `ref` and bounded `meta`. Raw/source `value` may be accepted as an input to type normalization/projection, but it is never stored in the Selection document. Data-type selection projections returning `value` fail the current contract.

There is no random fallback identity. An item must supply a stable id, a registered type key, or a canonical reference identity.

Core enforces bounded interaction documents: at most 2048 selected items, 32 ranges, bounded metadata/reference depth and field counts. Large region selections must refer to their source and bounds; embedded `pointIds`, `rowIds`, `indices`, `items` or `points` arrays are rejected.

## Existing runtime path only

Cross-scope publication still uses the existing `dkds:selection-changed` bridge emitted by `InteractionRuntime` and observed by `PluginScope.selection.observe`. No alternate event name or second dispatcher was added. Existing scope disposal remains responsible for listener cleanup, and selected references continue to project into the existing Entity Registry.

## First-party migration

Data Center, Resonance, TER, Pulse and the SDK template were migrated away from Selection preview values. Scientific Plot entity selection is reference-only. Resonance range selection now publishes a stable source reference and no longer stores a potentially growing curve-id context array.

## Verification intent

The dedicated 3.68.88 regression covers deterministic identities across runtime instances and Artifact revisions, ref-only storage/resolution, bounded selection/range behavior, use of the single existing global selection event, observer cleanup, Entity synchronization, stable DataTable series/row identity, and row-id preservation through scientific display resampling and reordered/filtered projections.
