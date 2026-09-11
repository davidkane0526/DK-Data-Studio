# Phase D Step 2 — Stable SVG Identity and Viewport-First Display Sampling (3.68.84)

## Objective and scope

3.68.84 reduces scientific SVG node churn for large line/scatter plots without changing the scientific data contract. The display layer may project a bounded subset of source points, but Artifact storage, calculations, copy/export, provenance and full-resolution reads remain unchanged.

This step intentionally does not migrate heatmaps to Canvas. Heatmap rasterization is Phase D step 3 and must remain a separate owner rather than increasing the responsibilities of `chart-runtime.js` or the D3 renderer.

## Ownership split

`src/core/scientific/display-runtime.js` owns display-only decisions:

- stable series identity resolution, prioritizing `seriesId`;
- one-time/cached trace analysis for numeric extents and scan segments;
- numeric axis summaries;
- viewport-range projection;
- bounded min/max bucket display sampling;
- preservation of source point identity.

`src/core/scientific/d3-chart-renderer.js` owns SVG projection:

- trace groups are reused by stable series key;
- line/hit nodes are reused inside the stable trace group;
- marker joins are keyed by original source `pointIndex`;
- hover/click operate on displayed points but emit the original full-resolution point identity/payload.

The public ScientificPlot, Artifact and SDK contracts are unchanged. Plugins do not select a sampling algorithm or invalidation class.

## Sampling invariants

For eligible large numeric traces, the display projection must preserve:

1. first/last endpoints of each retained segment;
2. local bucket minima and maxima;
3. explicit NaN/invalid gaps as line breaks;
4. scan-segment boundaries and direction reversals;
5. original source `pointIndex` for every displayed point;
6. source x/y/customdata lookup through the original full-resolution trace;
7. bounded display size that does not grow linearly with a million-point source curve.

Explicit segment metadata has highest priority. Automatic x-direction segmentation is accepted only for a stable, low-count reversal pattern. Pathological high-frequency/non-monotonic x falls back to bounded sampling over the full valid run rather than applying an unsafe binary-search viewport cut.

## Axis and viewport behavior

Numeric x/y/y2 autorange uses cached display-runtime axis summaries instead of repeatedly flattening complete source arrays and calling large spread operations. For monotonic scan segments, viewport selection uses binary search against the cached trace analysis, with one neighboring source point retained at the visible boundary so line continuity is not artificially clipped.

The initial analysis remains O(N) once for a new trace object. Warm viewport changes reuse that analysis and only process the visible/bounded projection. This is deliberate: correctness of extrema, gap and segment metadata is established once, then ordinary pan/zoom work is bounded.

## Stable-node behavior

A structural D3 frame rebuild may still occur for data/geometry invalidation, but matching trace groups are detached and reattached by stable `seriesId` identity rather than being recreated unconditionally. Marker nodes use original source point indices as keyed-join identities.

For a 1M-point curve with adjacent 10 V viewports shifted by 0.2 V, the synthetic benchmark observed about 92.6% overlap in displayed source-point keys. Those overlapping markers can therefore retain DOM identity across the viewport move rather than being destroyed and recreated.

## Synthetic benchmark

Command:

```bash
npm run benchmark:display-sampling
```

Representative same-process Node measurement for a 1,000,000-point trace and 1200 px plot width:

| Metric | Representative result |
| --- | ---: |
| First analysis + sample | ~66–71 ms |
| Warm full-range sample median | ~6–7 ms |
| Cached viewport sample median | ~0.56–0.63 ms |
| Full-range display points | ~2,759 / 1,000,000 |
| Display ratio | ~0.276% |
| Example viewport display points | ~1,815 |
| Example viewport source-visible points | ~10,003 |
| Adjacent viewport key reuse | ~92.6% |

These figures are trend evidence from the current container, not portable device thresholds. Windows Electron/GPU and Android visual/performance acceptance still require real-device validation.

## Regression coverage

`tests/test-v36884-stable-svg-display-sampling.js` verifies, among other constraints:

- display runtime loads before the D3 renderer in both main and dedicated plugin-window composition;
- `seriesId` has stable identity priority;
- marker joins use original source point indices;
- 100k-point projections are bounded while retaining endpoints, injected extrema and explicit NaN gaps;
- every displayed point maps back to the original x/y row;
- adjacent viewports substantially reuse source-point keys;
- scan reversal creates separate segments and retains the turning point/extrema;
- pathological noisy x cannot cause unbounded segment/DOM growth;
- cached 1M-point viewport sampling remains bounded and fast enough for the repository performance gate.

## Limitations and next step

- Heatmaps remain SVG in 3.68.84. A 500×500 heatmap can still create a large cell DOM and is explicitly deferred to Phase D step 3.
- The first analysis of a new million-point trace remains O(N); only subsequent viewport projections are cached/bounded.
- Arbitrary non-monotonic x prioritizes correctness over aggressive viewport pruning.
- Automated Core/Node/Chromium-style regression is not equivalent to real Windows Electron or Android GPU acceptance.

Phase D step 3 should introduce a dedicated Canvas heatmap owner: Canvas for raster cells, SVG for axes/labels/interaction overlays and export composition. WebGL should be considered only if measured Canvas performance is insufficient.
