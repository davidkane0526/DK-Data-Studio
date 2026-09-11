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

`null` and `undefined` are valid callback results. A plugin-scoped performance facade invokes Core exactly once and returns that value unchanged; it never treats a nullish value as evidence that Core was unavailable. A missing required Performance Runtime method fails explicitly.

Promise cache entries represent shared in-flight work. On fulfillment the entry stores the resolved value, allowing a declared synchronous Pipeline stage to be read through `runSync()` after an awaited `run()`. On rejection the entry is removed, so an explicit retry performs new work rather than replaying a permanently rejected Promise.

## Invalidation rules

A cache key must include every input that can change the result. Prefer semantic revisions over broad project revisions.

Artifact Store exposes four deliberately different cache inputs:

- `artifactRevision(id)` is the Store-local change stamp for a view or computation owned by one known Artifact. Updating a different Artifact of the same kind does not change it.
- `columnRevision(id, column)` / snapshot `bufferRevision` is narrower for DataTable work that depends on one column payload. A precise transaction on another column does not change it.
- `revision(kind)` is an aggregate revision for work that genuinely depends on the complete current set of one kind.
- `fingerprint(id)` is the complete canonical content identity for correctness across save/restore or different Store instances. Its streaming implementation preserves the prior canonical digest without materializing one whole JSON string.

Do not substitute a revision for persistent identity: revision counters are Store-local and are not serialized. Publishing an unrelated derived result must not invalidate a source-data cache whose key uses the source Artifact revision.

For object-scoped science transforms, use `memoWeak` with both:

1. the immutable/source object identity;
2. a parameter key containing transform settings.

Never cache against a UI label, current tab, or viewport if those values do not define the scientific result.

## ScientificPlot render de-duplication

`ctx.ui.scientificPlot.react(..., spec)` accepts `renderKey` / `revisionKey`. For a plot derived from the complete Artifact, include `ctx.data.artifacts.artifactRevision(id)` plus every visual parameter in that key. If the plot depends only on selected DataTable columns, prefer the relevant `columnRevision(...)` values so an edit to an unrelated column does not redraw it.

If the same Plot target receives the same non-empty render key, Core skips the expensive scientific renderer update while preserving event bindings and tooltip ownership. The caller is responsible for changing the render key whenever traces/layout that affect the rendered result change.

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

Performance caching and renderer lifetime are separate Core policies. `DKDSUI.lifecycle()` propagates hidden/visible state through plugin UI scopes. Hidden scopes suspend their `ResizeScheduler` and ask Core ScientificPlot to suspend managed scientific renderers. Managed renderers may purge renderer DOM/event state while retaining the plugin's declarative render spec plus Core Selection/Pin/Viewport state. On resume, Core rebuilds the renderer before the normal layout settle sequence.

Plugins must not implement their own TOP hide/show renderer cleanup. If a plugin renders through `ctx.ui.scientificPlot.react`, it receives this behavior automatically. `attach()` views that Core cannot safely reconstruct remain attached rather than being purged.

Plugin deactivation trims only that plugin's `ctx.performance` namespace to zero, so cached plugin closures/resources cannot survive a full deactivation.


## Interaction and multi-view scheduling (v3.61+)

High-frequency UI feedback and scientific recomputation are separate workloads. Interactive D3 edit surfaces should update only lightweight geometry while a pointer is moving, then commit one semantic scientific edit at gesture end. In particular, FWHM-window dragging must not call the authoritative FWHM/peak-metric getter on every pointermove.

`ScientificPlot` now owns a small render scheduler for plugins that create several expensive scientific views at once. A view may declare `renderPriority` as `immediate`, `frame`, or `idle`:

- `immediate`: the primary result, executed without queueing.
- `frame`: important secondary views, one queued heavy view per animation frame.
- `idle`: background/secondary analysis views; lower priority than queued frame work.

Requests are coalesced per managed view. A newer queued render replaces the not-yet-executed work for that view, and the view's request revision prevents stale post-render bookkeeping from becoming authoritative. Plugins may choose relative priority, but must not implement their own chart timers or renderer queues.

Desktop and mobile use one Core D3 scientific renderer for scatter/curve/heatmap views. Dedicated TOP windows load the vendor-neutral `scientific-renderer` dependency through Core. Manifest-declared prewarm reports **runtime-only ready** without restoring project slices, opening the domain activity, calculating results, or drawing charts. On first real open the main process waits for a second hydrated-ready signal before showing the window. This keeps prewarm useful without performing hidden scientific work.
