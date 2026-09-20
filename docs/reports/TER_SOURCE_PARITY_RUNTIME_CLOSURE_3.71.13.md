# TER Source-Parity Runtime Closure — v3.71.13 WIP

## Scope

This round closes the four Windows Electron source-parity regressions reported after the TER Unit production cutover. The accepted pre-cutover source remains the oracle. No visual patch is derived from screenshot-only pixel tuning.

Public contracts remain unchanged:

- App: 3.71.13 WIP
- SDK: 1.51.10
- Plugin API: 1.19.0
- Unit Templates: 2.5.6
- Unit catalog: 41
- Theme Contract: 3.10.0
- Android versionCode: 154

The accepted TER geometry stylesheet remains byte-identical:

`a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b`

## 1. Parameter-panel geometry

### Regression

The Unit cutover retained the accepted field/control geometry but lost the accepted outer data-control inset, so the first control card began too close to the top/left edge and the visible parameter stack height changed.

### Closure

The TER parameter PRIME continues to adopt the accepted `ter-workspace-left` node directly:

```js
existingNode: controls
```

and now explicitly consumes the existing generic PRIME detail contract:

```js
contentInset: 'comfortable'
```

The current shared structure contract maps `comfortable` to 12 px, matching `BASE_METRICS.acceptedScientific.dataControlInsetPx = 12`.

No replacement parameter wrapper/titlebar is generated, preserving the hard contract that parameter panels are titleless/headerless.

## 2. Plot/data-graph proportions

### Regression

The accepted TER CSS still declared square heatmap content, but Unit-composed PlotView could establish generic content height before the detached card received its real post-layout width. The resulting scientific drawing area was visibly shorter than the accepted TER plot.

### Closure

TER heatmap PlotViews now express the accepted source geometry through the already-public PlotView content contract:

```js
contentAspectRatio: 1
contentMinHeight: 80
contentMaxHeight: 860
```

A dynamic regression instantiates the real PlotView class, verifies that width 0 does not invent a height, then applies a 600 px post-layout width and verifies a 600 px scientific content height.

No TER-specific branch was added to PlotView/Core.

## 3. Dedicated TER `导入数据` vs main-shell `导入`

The import action had been projected into the wrong host level after Unit page composition order changed.

Current generic rule:

- TOP/SUPER workbenches in the **main application shell** do **not** create a second workbench `导入数据` button. They use the single global `导入` task, preserving the accepted import hierarchy.
- A **dedicated auxiliary plugin window** receives the Core-owned workbench `导入数据` action locally. If the Unit page header is composed after `pages.add()`, one bounded MutationObserver waits for the canonical header, mounts the action once, then disconnects.
- Explicit page-local import slots remain authoritative for standalone SDK workbenches.

The dedicated header order remains:

`plugin/domain actions → Core 导入数据 → host/window controls`

No TER id/name is present in this Core path.

## 4. Full plugin names / `更多功能`

The accepted shell rule is now enforced behaviorally: a primary plugin activity may never be left partially visible.

Reflow first restores the complete current set and measures real lane geometry. When width is insufficient:

1. low-priority context commands move into the existing `更多功能` menu first;
2. if the primary activity lane is still clipped, complete inactive/low-priority activity buttons move into the same menu;
3. the active primary activity is retained longest;
4. labels are never width-shrunk/truncated as the escape path.

The regression fixture includes the literal long label `SFeRT 建模拟合` and requires it to move as one complete activity button.

The authored shell CSS remains byte-frozen; clipping prevention is owned by the existing generic shell runtime instead of a new CSS override.

## Core-boundary audit

This round does modify two existing generic Core owner modules because both problems are shell/host projection responsibilities:

- `pages/panels.js`: 12,153 B
- `shell/context-toolbar.js`: 8,607 B

Both remain far below the existing 48 KiB module ceiling. Relative to 3.71.11 they grew by about 4 KiB combined, but no new Core public API, service, Unit, compatibility path or domain selector was added. A domain-token scan of both changed modules returns zero TER/Resonance/SFeRT/Pulse/Vth/Data Center identities.

TER-specific geometry remains in `src/plugins/ter-analysis/unit-presentation.js` plus the byte-frozen accepted `plugin.css`.

## Regression evidence

`tests/test-v37113-source-parity-runtime-closure.js` now executes four independent closure checks:

1. accepted 12 px parameter inset and direct existing-node anatomy;
2. real PlotView post-layout 1:1 heatmap geometry;
3. host-correct import projection (main TOP no duplicate, dedicated window local import restored);
4. real topbar reflow with full plugin names and complete-button overflow.

Older tests that encoded superseded cutover assumptions were corrected to the current source-parity contract rather than forcing the implementation back to the failed Unit-only geometry.

## Final validation

All 433 current `test` manifest cases were executed in original manifest order using bounded ranges. Two historical brittle assertions were encountered, diagnosed against the newer source-parity/freeze contracts, corrected, and rerun; the final source passes every case.

- Test manifest: **433 / 433 PASS**
- Check coverage: **440 / 440 PASS**
  - 429 shared with `test`
  - 11 check-only cases executed separately
  - 4 test-only cases also passed in the test manifest
- Mobile: **103 / 103 PASS**
- Performance suite: **PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Hard Visual Invariants: **87 / 87 PASS**
- Architecture Hygiene: **PASS**
- Native Analysis strict audit: all tracked counts **0**
- Plugin manifests/packages: **17 / 17 PASS**
- Style Ownership strict: **0 cross-file collisions**
- Style Ownership Gate strict: **0 violations**
- Authored CSS: **45 files / 0 `!important`**
- Plugin Boundary: **0**
- accepted TER `plugin.css` SHA-256: unchanged

## Remaining acceptance boundary

This environment still does not prove Windows Electron font/GPU/backdrop pixel output. The four reported behaviors now have source/runtime regression evidence and no longer depend on manual memory, but the final Windows screenshot remains the external pixel-acceptance boundary before TER is declared visually closed.
