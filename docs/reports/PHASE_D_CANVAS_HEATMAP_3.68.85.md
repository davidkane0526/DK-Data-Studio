# Phase D Step 3 — Canvas Heatmap — 3.68.85 WIP

## Scope

Phase D step 3 removes per-cell SVG heatmap nodes without changing ScientificPlot, Artifact, calculation or export-data semantics.

## Ownership

- `src/core/scientific/heatmap-canvas-runtime.js` owns matrix raster analysis, Canvas drawing, raster reuse, exact cell hit testing and raster export layer.
- `src/core/scientific/d3-chart-renderer.js` composes the raster with SVG axes, labels, colorbar, annotations and the interaction overlay.
- The Canvas owner loads before D3 in both the main host and Dedicated TOP.

## Rendering contract

For a regular matrix grid, Core builds one detached pixel buffer with `ImageData`, uploads it once, then composites it into the visible Canvas with one `drawImage()` call. This reduces draw-call count from one draw per matrix cell to one raster composition. Irregular/nonuniform grids keep the exact `fillRect()` fallback.

The visible DOM contains one heatmap Canvas and zero SVG cell rectangles. The SVG overlay retains pointer events and maps screen coordinates back to the exact source `(xi, yi, value)` through the Canvas owner's band index.

## Invalidation

Raster content identity is matrix object identity + a Core-computed colorscale key. If both are unchanged:

- Theme-only background changes recompose the retained raster.
- Geometry-only resize/relayout recomposes the same raster into the new bands.
- Matrix or colorscale changes rebuild the raster pixels.

This extends the Phase D step-1 invalidation split to the raster layer.

## Representative Chromium measurement

Synthetic 500×500 matrix, regular grid, headless Chromium in the current container:

| Path | Median |
| --- | ---: |
| Previous per-cell Canvas `fillRect()` render | ~233.8 ms |
| ImageData cold raster | ~36.5 ms |
| Theme-only raster reuse | ~0.1 ms |
| Geometry-only raster reuse | ~0.3 ms |

These are environment-specific trend measurements, not Windows/Android GPU guarantees.

## WebGL decision

WebGL is deferred. Canvas 2D meets the current 500×500 target after raster reuse, while WebGL would add GPU context recovery, texture lifetime, driver variance and mobile resource pressure. Reconsider only with measured matrices/workloads that exceed the Canvas budget.

## Scientific integrity

- Matrix values remain full resolution.
- Hit testing reports original row/column identity.
- Data export remains full-resolution Artifact data.
- SVG/PNG visual export composes the retained raster under the SVG presentation layer.
- No public SDK capability or second heatmap data model is introduced.
