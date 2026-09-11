# Phase D ScientificPlot invalidation split — 3.68.83

## Goal

Phase D step 1 separates scientific rendering invalidation by semantic cause so that Selection and Theme changes no longer perform a data replacement or whole-SVG rebuild.

## Previous behavior

Before 3.68.83, the D3 backend routed `react`, `restyle`, `relayout`, `resize`, Linked Selection styling and Theme refresh through the same structural `render()` path. That path recreated the SVG contents with `selectAll('*').remove()`. A focus-only Selection update therefore paid essentially the same structural cost as replacing scientific data, and Theme changes were indirectly treated as resize/full-render work.

## 3.68.83 ownership

The Core now distinguishes four invalidation classes:

- **Data** — `react()` replaces authoritative scientific data and performs a structural render. General data-mutating `restyle()` remains on this class for the existing plugin-facing contract.
- **Geometry** — `relayout()` and `resize()` update layout/viewport geometry. A structural geometry render may rebuild nodes, but does not claim a data replacement.
- **Theme paint** — Core theme refresh repaints existing plot/background/grid/axis/default trace/marker/colorbar presentation in place. It does not call `resize()` or the structural D3 render path.
- **Selection overlay** — Linked Selection focus updates existing trace/marker opacity, stroke width and marker geometry in place. The overlay is stored independently from source trace data and is reapplied after a later structural data/geometry render when appropriate.

The invalidation type remains Core-owned. 3.68.83 does not add an SDK knob that lets plugins claim an invalidation class.

## Correctness invariants

1. Selection-only updates do not mutate or replace `target.data`.
2. Selection-only updates do not enter `render(state)` and do not execute `selectAll('*').remove()`.
3. Theme-only refresh does not route through `resize()` or full scientific render.
4. A data `react()` clears stale overlay state; ScientificPlot mapping/selection reconciliation can then project the current selection again.
5. Geometry rebuilds reapply an active stored selection overlay so resizing does not silently erase selection focus.
6. General plugin-facing `restyle()` semantics remain unchanged; only the Core-owned Linked Selection path uses the dedicated overlay operation.

## Regression coverage

`tests/test-v36883-scientific-plot-invalidation.js` checks both source-level route ownership and executable behavior. It verifies that a Linked Selection update leaves the scientific data object identity and serialized content unchanged while avoiding a second `react()`, and that Theme paint likewise leaves data untouched.

The test is included in `test`, `check`, `mobile` and `performance:test` suites.

## Release verification

For the 3.68.83 candidate:

- `npm test`: 349/349 PASS
- `npm run check`: 356/356 PASS
- `npm run mobile:test`: 75/75 PASS
- SDK Test: PASS
- SDK Harness: PASS
- Scientific parity: PASS
- Performance suite: PASS
- Hard Visual Invariants: 87/87 PASS
- Architecture Hygiene: PASS
- Native Analysis strict audit: PASS, orphan=0
- Plugin Boundary: 0

## Module-size note

`chart-runtime.js` remains below the existing 48 KiB authored-module ceiling but is close to it. Further Phase D behavior should prefer dedicated owners rather than adding unrelated responsibilities to that module.

## Next step

Phase D step 2 should build on these separated invalidation paths: reuse stable SVG nodes keyed by `seriesId`, then add viewport-first display sampling that preserves endpoints, extrema, NaN gaps, scan segments and source-row identity. Sampling must remain display-only and must never alter scientific calculation or full-resolution export data.
