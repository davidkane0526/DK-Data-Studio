# Performance Runtime

DK Data Studio v3.47 introduced a shared, observable performance layer. v3.48 added cache budgets and lifecycle ownership. v3.49 extends that policy to renderer/UI resources so reusable windows can release expensive renderer state while hidden without plugin-specific cleanup. The goal remains to eliminate repeated scientific and renderer work without changing numerical definitions or lowering plotting fidelity.

## Core API

`window.DKDSPerformance` provides:

- `memoWeak(namespace, target, key, compute, options)` — memoize derived values against an object identity plus an explicit parameter key.
- `memo(namespace, key, compute, options)` — bounded value-cache memoization.
- `stage(namespace, sourceRevision, parameterKey, compute, options)` — declarative scientific-stage cache keyed by the source revision and every parameter that changes the output.
- `configure(namespace, policy)` / `policy(namespace)` — declare/read namespace cache budgets (`limit`, optional `ttlMs`).
- `trim(namespace, options)` / `trimPrefix()` / `trimAll()` — actively reduce retained value-cache entries; optional `dropWeak` resets object-scoped weak caches.
- `lifecycle(state, options)` — apply Core lifecycle policy such as hidden/suspended renderer cache contraction.
- `measure(namespace, fn)` — record compute count and duration without caching.
- `skip(namespace, count)` — record work deliberately avoided by a higher-level cache/deduper.
- `snapshot(prefix)` — diagnostics-safe aggregate metrics, policy, eviction/expiry/trim counters and optional namespace-prefix filtering. It contains counters/timings only, never project values.
- `clear()` / `resetMetrics()` — invalidate caches or counters explicitly.
- Bounded value/stage entries may provide `options.dispose(value, meta)`; Core invokes it when an entry is evicted, expired, trimmed or cleared and records disposal diagnostics. Use this for cached resource wrappers, not ordinary immutable numeric arrays.

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

## Declarative stage rule (v3.48+)

Plugins should not build private Maps merely to memoize scientific results. For a reusable computation, pass Core:

1. a semantic stage namespace;
2. the source Artifact/data revision;
3. a parameter key containing every setting that changes the result;
4. the pure compute callback.

Core owns LRU/TTL/trim behavior. A project restore or explicit domain reset may trim that plugin's namespace, but plugins must not clear another plugin's caches.

Dedicated TOP renderers are reusable and therefore can live much longer than one visible session. When a TOP is hidden, the host asks Performance Runtime to retain only a small hot value-cache set and reset weak object caches. This is a memory-lifecycle policy, not a scientific-definition change.

## v3.47/v3.48 adopters

- TER input Artifact conversion, sweep reconstruction, and transformed Vg–Vd matrices; v3.48 routes these through Core stage caches.
- Resonance `transformSweep` and gate-analysis computation; v3.48 routes gate analysis through Core stage caches.
- Data Center ScientificPlot rendering.
- TER transformed heatmap and resistance plots.
- Hidden-document resize scheduling.

## Automation diagnostics

Software Management → Automation Test exports a Performance section containing:

- runtime cache hit/miss/compute/skip plus eviction/expiration/trim counters;
- skipped ScientificPlot renders;
- TOP renderer ready times and average;
- start/end working-set, private-memory, and process-count trend from the same automation run.

Performance measurements are trend indicators for the same machine/build setup, not cross-machine pass/fail thresholds.


## UI / renderer lifecycle (v3.49+)

Performance caching and renderer lifetime are separate Core policies. `DKDSUI.lifecycle()` propagates hidden/visible state through plugin UI scopes. Hidden scopes suspend their `ResizeScheduler` and ask Core ScientificPlot to suspend managed Plotly renderers. Managed renderers may purge Plotly DOM/event state while retaining the plugin's declarative render spec plus Core Selection/Pin/Viewport state. On resume, Core rebuilds the renderer before the normal layout settle sequence.

Plugins must not implement their own TOP hide/show Plotly cleanup. If a plugin renders through `ctx.ui.scientificPlot.react`, it receives this behavior automatically. `attach()` views that Core cannot safely reconstruct remain attached rather than being purged.

Plugin deactivation trims only that plugin's `ctx.performance` namespace to zero, so cached plugin closures/resources cannot survive a full deactivation.


## Interaction and multi-view scheduling (v3.61+)

High-frequency UI feedback and scientific recomputation are separate workloads. Interactive D3 edit surfaces should update only lightweight geometry while a pointer is moving, then commit one semantic scientific edit at gesture end. In particular, FWHM-window dragging must not call the authoritative FWHM/peak-metric getter on every pointermove.

`ScientificPlot` now owns a small render scheduler for plugins that create several expensive Plotly views at once. A view may declare `renderPriority` as `immediate`, `frame`, or `idle`:

- `immediate`: the primary result, executed without queueing.
- `frame`: important secondary views, one queued heavy view per animation frame.
- `idle`: background/secondary analysis views; lower priority than queued frame work.

Requests are coalesced per managed view. A newer queued render replaces the not-yet-executed work for that view, and the view's request revision prevents stale post-render bookkeeping from becoming authoritative. Plugins may choose relative priority, but must not implement their own chart timers or renderer queues.

The desktop and mobile builds use the Plotly Cartesian distribution while the built-in standard views require only Cartesian scatter/heatmap traces. Dedicated TOP starts a non-awaited Core preload immediately after lightweight dependencies are ready, before activity-open can demand the first chart; readiness still never awaits Plotly and the post-ready idle warmup simply reuses or retries the same loader.
