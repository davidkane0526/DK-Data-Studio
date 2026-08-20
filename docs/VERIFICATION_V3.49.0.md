# DK Data Studio v3.49.0 Verification

v3.49.0 is the third performance-architecture release. It moves renderer/UI resource lifetime into Core so reusable TOP windows can release heavy renderer state while hidden without requiring plugin-specific cleanup code.

## Core changes

- `DKDSScientificPlot` v2.1.0 adds managed renderer suspend/resume, lifecycle snapshots, renderer purge/rebuild, and state-preserving recovery for Selection/Pin/Viewport.
- `DKDSUI` owns hidden/visible lifecycle propagation across plugin scopes and suspends `ResizeScheduler` work while a reusable TOP is hidden.
- Dedicated TOP hide/show now flows through Core UI lifecycle before cache contraction and before the normal resize settle sequence.
- `DKDSPerformance` v1.2.0 supports disposer callbacks for bounded value/stage cache entries and records resource-disposal metrics.
- Plugin deactivation automatically trims only that plugin's performance namespace to zero and resets its weak caches.
- Real Electron TOP diagnostics now exercise ready -> show -> hide -> reuse -> show, and inspect Core lifecycle state in the renderer.
- Automation Test runner v1.4.0 adds a renderer/resource lifecycle case and requires every TOP renderer to pass hide/reuse lifecycle, not merely initial ready.

## Required regression

```bash
npm test
npm run check
npm run performance:test
```

The default desktop configuration has 20 automation cases in v3.49.0. A source/development Electron run should normally report 19 pass, 0 fail, 1 skip (packaged-build identity). A packaged installer/portable run should normally report 20 pass, 0 fail, 0 skip.

TOP coverage must report:

```text
discovered = 4
tested     = 4
passed     = 4
failed     = 0
```

Each TOP result must also contain `lifecycle.tested=true` and `lifecycle.ok=true`.

The report's performance section should expose `resourceLifecycle`, cache `disposedEntries` / `disposeErrors`, same-run memory trend, and TOP ready time. These are same-machine trend diagnostics, not cross-machine pass/fail thresholds.
