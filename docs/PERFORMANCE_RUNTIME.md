# Performance Runtime

DK Data Studio v3.47 adds a shared, observable performance layer. The goal is to eliminate repeated scientific work and renderer work without changing numerical definitions or lowering plotting fidelity.

## Core API

`window.DKDSPerformance` provides:

- `memoWeak(namespace, target, key, compute, options)` — memoize derived values against an object identity plus an explicit parameter key.
- `memo(namespace, key, compute, options)` — bounded value-cache memoization.
- `measure(namespace, fn)` — record compute count and duration without caching.
- `skip(namespace, count)` — record work deliberately avoided by a higher-level cache/deduper.
- `snapshot()` — diagnostics-safe aggregate metrics. It contains counters/timings only, never project values.
- `clear()` / `resetMetrics()` — invalidate caches or counters explicitly.

Caches are an optimization only. Scientific outputs remain owned by `src/science/*` and existing reference/parity tests remain authoritative.

## Invalidation rules

A cache key must include every input that can change the result. Prefer semantic revisions over broad project revisions.

Artifact Store exposes `revision(kind)` so a computation over `data.table` can invalidate only when source tables change. Publishing an unrelated derived result must not invalidate the source-data cache.

For object-scoped science transforms, use `memoWeak` with both:

1. the immutable/source object identity;
2. a parameter key containing transform settings.

Never cache against a UI label, current tab, or viewport if those values do not define the scientific result.

## ScientificPlot render de-duplication

`ctx.ui.scientificPlot.react(..., spec)` accepts `renderKey` / `revisionKey`.

If the same Plot target receives the same non-empty render key, Core skips the expensive `Plotly.react` call while preserving event bindings and tooltip ownership. The caller is responsible for changing the render key whenever traces/layout that affect the rendered result change.

Selection/focus restyling and tooltip relayout are also de-duplicated by Core.

## v3.47 adopters

- TER input Artifact conversion, sweep reconstruction, and transformed Vg–Vd matrices.
- Resonance `transformSweep` and gate-analysis computation.
- Data Center ScientificPlot rendering.
- TER transformed heatmap and resistance plots.
- Hidden-document resize scheduling.

## Automation diagnostics

Software Management → Automation Test exports a Performance section containing:

- runtime cache hit/miss/compute/skip counters;
- skipped ScientificPlot renders;
- TOP renderer ready times and average;
- the existing environment memory/process snapshot.

Performance measurements are trend indicators for the same machine/build setup, not cross-machine pass/fail thresholds.
