# DK Data Studio v3.61.3 Verification

## Regression scope

- Peak dragging stays on the Core geometric fast path and no longer implicitly changes curve selection/focus after release.
- Semantic color-scale caching prevents drag/focus renders from needlessly notifying plugin legend logic.
- FWHM editing commits a complete `[left, right]` analysis window atomically, so moving either handle alone produces a valid saved manual window.
- Dedicated-window hidden prewarm is runtime-only: it may warm declared heavy runtime dependencies but does not restore project state, activate an analysis activity, calculate or render project results.
- TER retains a single explicit calculation action. Persisted result restoration is distinguished from recomputation.
- Plugin Manager uses explicit capability categories rather than grouping only by built-in/user source.
- Public SDK declares the ScientificCurveSurface marker/window commit contract used by first-party plugins.
- First-party boundary verification rejects raw D3/Plotly/DOM/timer/host interaction paths inside plugins.

## Required automated verification

```bash
npm run check
npm test
npm run performance:test
npm run reactive:test
npm run sdk:test
npm run table-surface:test
npm run host-neutralization:test
node scripts/check-plugin-boundaries.js
node scripts/validate-plugins.js
git diff --check
```

## Manual acceptance focus

1. Drag a resonance peak repeatedly without clicking it: the visible curve set/legend must not collapse from all curves to the selected curve during or immediately after the gesture.
2. Drag only the left FWHM analysis handle and release, then repeat with only the right handle. Either side must persist independently without a snap-back caused by an incomplete saved window.
3. Leave the application running, then open TER for the first time. Hidden prewarm must not have calculated TER or rendered project results; the renderer/Plotly runtime should already be warm.
4. Open Plugin Manager and verify capability sections are explicit (基座/系统、数据、算法、工作台、任务/扩展 as applicable) and source is shown as secondary metadata rather than the primary grouping.
5. Build an SDK workspace plugin using `ScientificCurveSurface` commit callbacks without direct D3/Plotly/DOM code; interaction behavior should come from Core.
