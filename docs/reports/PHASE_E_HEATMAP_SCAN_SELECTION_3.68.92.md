# Phase E 6.2 — Heatmap Cell ↔ Source Scan Reference Selection (3.68.92)

## Goal

Make scalar-field cells interoperate with their real source scans using the existing Entity / Selection / Interaction runtime. A heatmap cell remains a display coordinate; the selectable scientific object is the source scan identified by stable `artifactId + seriesId`.

## Core contract

- `ScientificPlot.scalarField(...)` accepts `sourceScans`, aligned one-to-one with the scalar field Y axis.
- Entries are reference-only Selection references or descriptors containing `{ref,type,role,meta}`.
- Scalar-field render setup does not enumerate `z` and does not construct per-cell Selection entities. Source descriptors are resolved lazily only when a cell is interacted with.
- D3 heatmap payloads expose exact `xIndex / yIndex` from the existing Canvas hit test. `yIndex` selects the source reference; X/Y coordinates remain presentation/domain values rather than identity.
- A selected source scan maps back to the matching heatmap Y row. The SVG overlay creates only selected-row rectangles above the Canvas raster; the matrix continues to have zero SVG cell nodes.
- The row overlay has its own bounded Core owner, `core/scientific/heatmap-selection-overlay-runtime.js`. It owns only heatmap selection geometry/paint through StyleGate; the general D3 renderer delegates to it and remains below the repository 48 KiB module boundary.
- `ScientificPlot` supports explicit `selectionTarget:'series'` for views where the scientific object is the complete source scan. Default point targeting is unchanged.

## First-party adoption

TER transformed scalar fields derive one stable source sweep reference per Vg row from the same sweep selection used by the transform. The all-Vg R–V forward/reverse traces expose the same `artifactId + sweep seriesId` references and use `selectionTarget:'series'`. Clicking a transformed heatmap cell therefore selects its actual forward or reverse scan; clicking that source scan selects the same reference and highlights the corresponding heatmap row.

The legacy TER selection-text refresh no longer writes back into the canonical Selection model, so it cannot replace a `data.sweep` Selection with a plugin-private `ter.matrix-point` after Core has applied the cross-view selection.

## Boundedness and ownership

- No second global event bus or plugin-private `EventTarget` is introduced.
- `dkds:selection-changed` remains the single cross-scope Selection bridge.
- Selection remains schema 2 and reference-only.
- Large heatmaps allocate no per-cell Entity registry and no per-cell SVG nodes for selection.
- Large regions must continue to use source-referenced `refs.range(...)`; this step does not add cell-id enumeration.
- Canvas remains the raster owner; ScientificPlot owns semantic mapping; the Heatmap Selection Overlay owner owns bounded selected-row geometry/paint; D3 composes those owners; plugins only supply domain source references.

## Next Phase E work

Viewport linking remains next. It must reuse the 3.68.89 transaction/cycle-suppression path and the 3.68.90 scientific dimension/unit compatibility contract before applying linked numeric ranges. Legend visibility linking remains after viewport linking.
