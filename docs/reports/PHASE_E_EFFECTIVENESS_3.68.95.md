# Phase E Runtime Effectiveness Closure — DKDS 3.68.95 WIP

## Purpose

3.68.95 does not add another Phase E interaction capability. It audits whether the contracts introduced in 3.68.88–3.68.94 are actually consumed by first-party analysis runtimes, and repairs real end-to-end regressions reported during manual use.

The audit was triggered by three observed failures:

1. TER heatmap selection did not actually drive the all-Vg R–V view, and R–V interaction no longer dimmed unrelated scans or emphasized the exact selected Vds point.
2. Resonance group plots visibly repainted one peak/curve at a time while asynchronous metrics and resonant-TER labels completed.
3. Overall memory did not visibly fall despite the preceding data-runtime work.

The observations were valid. Earlier Phase E tests proved the Core contracts in isolation, but did not sufficiently execute the complete TER first-party state machine or quantify the Resonance duplicate object layer.

## TER heatmap ↔ R–V end-to-end repair

### Failure mechanism

The primary TER heatmap had two selection owners in one pointer action. ScientificPlot first emitted the correct reference-only `data.sweep` Selection, then the plugin's legacy click handler published `ter.matrix-point`, overwriting the canonical source-scan Selection. In the reverse direction, R–V could emit a stable sweep reference, but TER's existing `selectedTerPoint` state—which controls scan isolation and exact-point markers—did not subscribe to canonical Selection.

### Repair

- `ter-analysis/selection-link-runtime.js` is the plugin-owned adapter between canonical source-scan references and TER's domain-local Vg/Vds state.
- Main and transformed TER heatmaps carry stable source-scan references.
- Heatmap plugin click handling updates only local precise point state with `publish:false`; it cannot overwrite the Core source-scan Selection.
- TER subscribes to its canonical Interaction Selection and maps a `data.sweep` reference back to the existing R–V isolation/highlight state.
- R–V uses stable series selection, then restores the exact clicked Vds only as plugin-local presentation state.
- Unrelated R–V groups are dimmed to opacity `0.035`; the selected group uses width `3.4`, and the exact selected point plus vertical Vds guide is restored.
- The canonical subscription is disposed with the plugin runtime.

### Executable end-to-end regression

`tests/test-v36895-ter-feature-runtime-end-to-end.js` mounts the real TER feature runtime, renders the real primary heatmap and R–V specifications, and simulates the Core-then-plugin click order. It verifies:

- stable heatmap source-scan references;
- heatmap plugin click cannot overwrite canonical Selection;
- only the selected R–V scan pair remains emphasized;
- exact forward/reverse resistance markers and the selected Vds guide are produced;
- reverse R–V selection maps back correctly;
- deactivation releases the canonical Selection subscription.

This test is part of `test`, `check`, and `mobile` manifests.

## Resonance incremental repaint repair

Two real per-job invalidation paths were found:

- peak metrics emitted a global reactive invalidation after each asynchronous peak result;
- resonant-TER label tasks called the group redraw callback after each asynchronous label result.

Both now settle as waves. A wave may contain many jobs, but group rendering is invalidated once when the current pending set reaches zero. Ordinary `render()` also no longer republishes every derived sweep/peak Artifact when its derived-state signature is unchanged.

This targets visible incremental repaint and transient array/GC churn rather than hiding the loading animation.

## Resonance long-lived data retention

Before 3.68.95 the same source transport data could remain resident as:

1. Artifact Store typed column backing;
2. a full Resonance `dataset.points` object-per-row copy;
3. sweep point objects;
4. transient derived sweep Artifacts.

`resonance-workbench/feature-data-runtime.js` now owns source-table materialization. Full dataset point objects exist only while constructing sweeps or when an analysis explicitly requires a rematerialized full input. Long-lived Resonance dataset state is a metadata catalog. Artifact listing also filters `kind:'data.table'` before transport projection, avoiding materialization of irrelevant transient matrices/sweeps.

## Reproducible retention benchmark

Tool: `node tools/benchmark/resonance-retention.js 100000 5`

The benchmark uses the same current Store and sweep builder in isolated child processes. The only variable is whether the full source `dataset.points` layer remains long-lived after sweeps have been built.

Five-sample medians on the current execution host:

| Metric | Old retention | Metadata-only long-lived dataset | Reduction |
| --- | ---: | ---: | ---: |
| JS `heapUsed` | 33.130 MiB | 20.126 MiB | 39.252% |
| Process RSS | 112.453 MiB | 110.883 MiB | 1.396% |
| Long-lived source dataset points | 100,000 | 0 | 100% for this duplicate layer |
| Sweep points | 99,998 | 99,998 | unchanged |
| Store typed bytes | 1,600,000 | 1,600,000 | unchanged |

The result is deliberately narrow. It demonstrates that the duplicate JS object layer is actually removed. It does **not** mean total Electron memory falls by 39%. V8 and the native allocator can retain already-committed pages after objects are released, so RSS can remain nearly unchanged. Renderer/GPU/native caches and other Electron processes are outside this isolated benchmark.

A 300,000-point new-path smoke run also completes successfully. The sweep-bound implementation now scans values in O(N) rather than expanding a large array into `Math.min/Math.max`, so this path no longer depends on JavaScript argument-stack capacity.

Raw benchmark output: `docs/reports/PHASE_E_RESONANCE_RETENTION_3.68.95.json`.

## Desktop memory reporting

Desktop status now prefers Electron process **private bytes** for an additive application-owned total. Per-process working set remains diagnostic only. Working-set values may contain shared pages and therefore should not be summed across Electron processes as though every page were private to DK Data Studio.

This changes the reporting semantics; it does not manufacture a lower memory number.

## Architecture boundaries retained

- No second global event bus.
- No second Selection store.
- No new SDK or Plugin API capability; SDK remains 1.44.0, Plugin API remains 1.19.0.
- TER domain mapping stays plugin-owned; Core remains domain-blind.
- Resonance source materialization is split into `feature-data-runtime.js` instead of growing the main feature runtime beyond the 48 KiB module boundary.
- Current module sizes remain under the existing 49,152-byte hard boundary; the boundary was not raised.

## Verification status

After the new TER end-to-end test was added to all main manifests:

- `npm test`: 361/361 PASS
- `npm run check`: 368/368 PASS
- `npm run mobile:test`: 87/87 PASS
- Hard Visual Invariants: 87/87 PASS
- Architecture Hygiene: PASS
- Native Analysis strict audit: 0 violations in all six first-party analysis runtimes
- authored CSS: 45 files / 0 `!important`

SDK Harness, Scientific parity, Renderer and Performance suites were also run after the runtime repairs and passed. The existing 1M-point display-sampling path remains within the current performance budget.

Automated verification still does not substitute for Windows Electron/Android device acceptance. In particular, system-level memory should be evaluated with the corrected private-byte metric and with a stable workload/settling interval rather than expecting RSS to immediately track JavaScript object release.
