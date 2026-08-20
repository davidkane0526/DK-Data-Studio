# DK Data Studio v3.47.0 Verification

v3.47.0 is the first performance/caching release after SUPER/TOP lifecycle, data contracts and ScientificPlot ownership were stabilized.

## Real-runtime baseline carried forward

The user-run v3.46.1 Automation Test report passed 16, failed 0 and skipped 1 (development/source mode). All four dedicated TOP renderers reached ready:

- Data Center: 608 ms
- Resonance: 696 ms
- TER: 616 ms
- Pulse: 711 ms

Average TOP ready time was about 658 ms. The final desktop environment snapshot reported a working set of about 680 MB. These values are retained as same-machine trend baselines, not hard thresholds.

## v3.47 changes verified in source

- Shared `DKDSPerformance` runtime is loaded in main and dedicated TOP renderers.
- Artifact Store exposes global and per-kind revisions for precise cache invalidation.
- `science.transformSweep` reuses object/parameter-identical transforms.
- TER caches source Artifact conversion, sweep reconstruction and transformed matrices.
- Resonance caches gate analysis against source-table revision and analysis settings.
- ScientificPlot supports explicit render revision keys and de-duplicates repeated Plotly react, focus restyle and tooltip relayout work.
- Hidden documents do not schedule redundant resize animation frames.
- Automation Test runner 1.2.0 verifies cache reuse and renderer de-duplication and exports performance metrics plus TOP-ready timing aggregates.

## Automated regression

Required before delivery:

```text
npm test
npm run check
npm run performance:test
git diff --check
```

The existing TER Python reference, scientific-engine parity, project-format, SUPER/TOP lifecycle, Plugin Boundary, Pulse and ScientificPlot tests must continue to pass.

## Expected built-runtime report

The normal desktop configuration has 18 automation cases in v3.47.0. A development/source Electron run should normally report 17 pass, 0 fail, 1 skip (packaged-build identity). A packaged installer/portable run should normally report 18 pass, 0 fail, 0 skip.

TOP coverage remains a hard requirement:

```text
discovered = 4
tested     = 4
passed     = 4
failed     = 0
```

The report should additionally contain `coverage.performance.runtime` and `coverage.performance.topReadyAverageMs`.
