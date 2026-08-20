# Performance Runtime

DK Data Studio v3.47 introduced a shared, observable performance layer. v3.48 adds cache budgets and lifecycle ownership so performance improvements cannot grow renderer memory without an explicit Core policy. The goal remains to eliminate repeated scientific and renderer work without changing numerical definitions or lowering plotting fidelity.

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
