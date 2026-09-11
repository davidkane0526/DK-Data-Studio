# Phase E 6.1 — Table ↔ Curve Reference Selection (3.68.91)

## Scope

This step implements the first concrete cross-view Selection adapter on top of the existing Entity / Selection / Interaction Runtime. It does not add a global event bus, Selection store, viewport link, heatmap link or plugin-private observer path.

## Contract

- Exact scientific point identity: `artifactId + seriesId + rowId`.
- Table-row projection: `artifactId + rowId` through `selectionReferences.sourceRowKey()`.
- The projection key is not a replacement for permanent identity.
- TableSurface binds rows through the existing `InteractionRuntime.bindView()` / `SelectionViewBinding` path.
- ScientificPlot automatically materializes reference-only point Entities when traces expose source artifact/series identity.
- ScientificCurveSurface supports the same mapping with explicit `selectionTarget:'point'`; existing series click semantics remain the default.
- Broad row Selection activates the matching source row across visible series. Exact series+row Selection remains limited to that series.

## First-party adoption

Data Center XY charts now publish `artifactId`, canonical `seriesId`, optional explicit `rowIds`, and Artifact revision on traces. Its table preview exposes canonical row ids and binds to the same Data Center InteractionRuntime. It does not register a `dkds:selection-changed` listener.

## Performance / ownership

The adapter stores references only. It does not construct a second dataset, copy row objects, or maintain a plugin-local selection mirror. ScientificPlot keeps one point-reference array aligned with already-rendered points; TableSurface delegates DOM state to the existing SelectionViewBinding. ScientificCurveSurface compiles exact point identities and broad source-row projections into bounded `Set` indexes once per render, so selected-point lookup stays O(1) per rendered point rather than O(points × selection-items).
