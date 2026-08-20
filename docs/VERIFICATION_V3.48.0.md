# DK Data Studio v3.48.0 Verification

v3.48.0 is the second performance-architecture release. It moves cache ownership from plugin-local implementation details into a bounded Core lifecycle contract.

## Real-runtime baseline carried forward

The user-run v3.47.0 Automation Test report passed 17, failed 0 and skipped 1 in development/source mode. All four dedicated TOP renderers reached ready, with an average reported ready time of 678.75 ms.

The same v3.47.0 run started with a working set of 998,920,192 bytes and its final desktop-environment snapshot reported 921,161,728 bytes. Because memory decreased during that run while remaining higher than an earlier separate run, cross-run absolute memory alone is not a reliable leak signal. v3.48 therefore records start/end memory and process-count deltas inside one automation run.

These values are trend baselines for the same machine/runtime only, not pass/fail thresholds.

## v3.48 architecture requirements

- `DKDSPerformance` v1.1.0 owns namespace limits, TTL, LRU eviction, trim and weak-cache lifecycle resets.
- Plugin code uses namespaced `ctx.performance.stage()` for declarative stage caching and cannot mutate another plugin's cache namespace.
- TER datasets, sweep reconstruction and transform matrices use Core stages; no plugin-private transform cache remains.
- Resonance gate computation uses the same stage contract.
- Hidden reusable TOP renderers contract their cache working set through Core lifecycle policy; final renderer close clears local caches.
- Cache policy changes must never alter TER/science numerical definitions or reduce plotting fidelity.
- Automation Test runner 1.3.0 verifies stage budgets and trim behavior and reports same-run memory trend.

## Automated regression

Required before delivery:

```text
npm test
npm run check
npm run performance:test
git diff --check
```

The existing TER Python reference, scientific-engine parity, project-format, SUPER/TOP lifecycle, Plugin Boundary, Pulse, ScientificPlot and v3.47 performance tests must continue to pass.

## Expected built-runtime report

The normal desktop configuration has 19 automation cases in v3.48.0. A development/source Electron run should normally report 18 pass, 0 fail, 1 skip (packaged-build identity). A packaged installer/portable run should normally report 19 pass, 0 fail, 0 skip.

TOP coverage remains a hard requirement:

```text
discovered = 4
tested     = 4
passed     = 4
failed     = 0
```

The report should additionally contain:

```text
coverage.performance.runtime.version = 1.1.0
coverage.performance.memoryTrend
performance.lifecycle = pass
```

Memory deltas are diagnostic trends, not hard thresholds. A non-zero delta alone must not fail the suite; repeated same-machine regressions across versions should guide investigation.
