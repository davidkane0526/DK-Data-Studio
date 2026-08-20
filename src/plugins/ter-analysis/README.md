# TER Analysis

Plugin id: `builtin.ter-analysis`

Same-Vd TER matrix, extrema, linked R–V inspection and selectable transformed-data heatmap. The plugin consumes shared `DKDSScience` algorithms and Core UI/runtime services; it does not own a parallel chart, parameter, export or interaction framework.

## Selectable Vg–Vd transformed-data heatmap

The second heatmap uses the exact Vg/Vd target grid and source-file choice already established by TER analysis. Shared Science Runtime provides `computeSweepTransformMatrix()` and reuses the same `transformSweep()` implementation used by resonance analysis. Available transforms are raw I–V, detrended I−Ibg, dI/dV, d ln|I|/dV, dV/dI and R=|V/I|. Forward and reverse sweeps are selected explicitly and are never mixed. Missing unmatched Vd samples stay missing.

The controls are generated through Core Parameter Schema. Rendering, responsive resize, CSV/copy/SVG/PNG actions and portable placement are supplied by Core Chart Runtime / PlotView. Clicking a transformed heatmap cell uses the same linked TER selection path as the ordinary TER heatmap and R–V inspector. The selected transform/direction is stored in the TER project slice.

## Dashboard layout

The TER dashboard now contains seven chart cards: TER heatmap, transformed Vg–Vd heatmap, all-Vg R–V, TER_Max–Vg, Vd@TER_Max–Vg, TER_Max–Vd and Vg@TER_Max–Vd. Default layout is 3×3, with responsive Core grid behavior for narrower workspaces.

## Scientific ownership

TER numerical definitions remain in `src/science/ter.js`. The transformed matrix is also a shared scientific primitive rather than plugin-local numerical code. A preserved historical implementation is used only for parity/migration tests, not as the runtime engine.
