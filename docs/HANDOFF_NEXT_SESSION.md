# Next Session Handoff — v3.61.3

## Current baseline

- Application: `3.61.3`
- Intended branch: `fix/v3.61.3-core-interaction-sdk`
- Public Plugin API / standalone SDK: `1.10.0`
- Architecture baseline remains Host Neutralization + Table/Interaction foundation + Scientific Reactive Dependency. Core owns interaction mechanics and rendering infrastructure; plugins own domain state, scientific intent and algorithm selection.

## Core direct-manipulation contract

1. `ScientificCurveSurface` owns pointer capture, curve snapping, marker geometry, FWHM handle geometry, zoom/range behavior and post-drag click suppression.
2. Pointer-rate movement is visual only. It must not mutate scientific state, change curve selection/focus, rebuild legends, or run algorithms.
3. Peak edits are committed once through `onMarkerDragCommit()` at gesture end. A marker drag must not implicitly select its curve.
4. Width/FWHM editing is an atomic full-window transaction. Core passes both `windowLeft` and `windowRight` through `onWidthWindowCommit()` even when only one handle moved.
5. Color-scale/legend notification is semantic-domain driven. Focus/highlight/drag renders must reuse the existing scale and must not notify the plugin unless the color domain actually changed.
6. Plugins must not create private D3/Plotly/DOM/timer interaction paths. First-party boundary checks reject raw `window.d3`, raw Plotly, direct DOM access, direct timers and host/Electron bridges.
7. Legacy preview callbacks remain for compatibility, but new plugins should implement commit callbacks and let Core provide the interaction loop.

## Dedicated TOP prewarm contract

- Prewarm is manifest-driven and generic; no TER-specific branch exists in Core.
- Hidden prewarm is **runtime-only**: load Core dependencies, plugin code/activation, algorithm providers and declared heavy chart runtime such as Plotly.
- Hidden prewarm must **not** restore the project, open/activate the analysis activity, calculate domain results or render project views.
- Promotion from a prewarmed hidden renderer to a real open is two-stage: send the real bootstrap, hydrate/open activity, then emit a second ready before the window is shown.
- Ordinary non-prewarmed cold-open retains non-blocking Plotly preload so light startup is not unnecessarily serialized behind chart parsing.
- Dedicated auxiliary windows use `backgroundThrottling:false` so hidden runtime warmup can actually finish before first user open.

## TER calculation semantics

- TER calculation has one first-party invocation path: the `计算 TER` action / `Ctrl+Enter` shortcut calls `T.calculate()`.
- Project restore may contain and display a previously persisted TER result. That is result restoration, not recalculation.
- Runtime-only hidden prewarm does not restore or draw persisted TER data. If a fresh project with no saved TER result executes calculation before the explicit action, treat that as a regression.

## Plugin manifest and manager categories

Built-in and external plugins use the explicit `pluginType` contract:

- `foundation` — 基座/系统能力
- `data` — 数据接入与数据管理
- `algorithm` — 科学/分析算法 Provider
- `workbench` — 交互式分析工作台
- `task` — 任务/自动化能力
- `extension` — 通用扩展
- `developer` — 开发模板/内部开发能力

`plugin.json` / packaged manifest is the machine-readable metadata source of truth. The generated built-in plugin index carries that manifest and Core merges it into the executable `plugin.js` registration before activation, matching the external package model. `plugin.js` registers executable behavior; it must not become a second independent policy database.

## SDK interaction requirement

A third-party plugin using `ctx.ui.scientificPlot.ScientificCurveSurface` must be able to obtain the same base interaction mechanics as first-party scientific plugins without copying resonance-specific code. The public declarations include:

- `DKDSScientificCurveSurfaceSpec`
- `onMarkerDragPreview`
- `onMarkerDragCommit`
- `onWidthDragPreview`
- `onWidthWindowCommit`

The plugin supplies curves/markers and domain commit handlers; Core supplies direct manipulation, snapping, visual feedback, handle editing and selection-safe gesture mechanics.

## Required validation gates

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`
- `node scripts/check-plugin-boundaries.js`
- `node scripts/validate-plugins.js`

Do not solve future interaction regressions by adding plugin-specific timers, caches, selection flags or Plotly/D3 paths. First determine which Core Surface/SDK contract is missing and fix it there.
