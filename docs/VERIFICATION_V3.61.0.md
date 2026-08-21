# DK Data Studio v3.61.0 Verification

## Scope

This release optimizes two observed interactive bottlenecks without changing scientific definitions: FWHM-window drag latency and the time-to-first-useful-view when TER creates several Plotly views. Plugin API remains `1.10.0`.

## Required repository gates

Run from the project root:

```text
npm run check
npm test
npm run performance:test
npm run reactive:test
npm run sdk:test
npm run table-surface:test
npm run host-neutralization:test
git diff --check
```

All must pass.

## FWHM interaction contract

- `ScientificCurveSurface` width-handle pointermove must not invoke `getMarkerWidth()`.
- Drag movement updates only the preview geometry and plugin raw analysis-window coordinates.
- `onWidthDragEnd` performs the authoritative scientific invalidation/transaction exactly after an actual movement.
- Resonance uses cached sweep voltage bounds instead of rebuilding a numeric array on every pointer event.
- The existing FWHM numerical/parity gates remain authoritative; this release changes scheduling, not the FWHM definition.

## Multi-view Plotly contract

- `ScientificPlot 2.3.0` provides one Core render queue for non-immediate views.
- `frame` work precedes `idle` work; only one queued heavy view begins per animation frame.
- Queued renders for the same view are coalesced and stale request post-processing is rejected by view revision.
- TER's primary scalar field remains immediate, R–V is frame priority, and secondary transform/reduction plots are idle priority.
- Linked TER selection continues to use `restyle/relayout`, not full topology rebuilds.

## Renderer distribution

- Desktop and mobile dependencies reference `plotly.js-cartesian-dist-min`, not `plotly.js-dist-min`.
- `src/index.html`, Core Chart Runtime, dedicated TOP runtime and mobile asset sync all resolve the Cartesian minified bundle.
- Dedicated TOP must call the non-awaited Core Plotly preload before `activity-open`, while renderer readiness remains independent of Plotly completion. Post-ready idle warmup may reuse/retry the same loader promise.

## In-app automation

Automation Runner `1.17.0` adds `Performance / Scientific multi-view render scheduling`. It creates two real Plotly views through `ScientificPlot`, schedules them as `frame` and `idle`, and requires deterministic frame-before-idle completion with one successful render each.

The development/source runtime can still skip only the packaged-build identity case; installer/portable resource layout requires a packaged run.
