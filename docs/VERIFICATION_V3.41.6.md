# DK Data Studio v3.41.6 Verification

## Scope

This release extends the v3.41 Core-first architecture without adding plugin-private infrastructure. It fixes linked-view reveal behavior, unifies tooltip presentation, and absorbs the supplied GRS v3.17.2 FWHM and transformed Vg–Vd heatmap capabilities into shared Core/Science services.

## Core interaction and visual behavior

- Linked selection remains one shared focus document across curves, legends and data lists.
- Rebuilt linked-view DOM nodes are revealed even when the focus key itself did not change.
- Horizontal linked views reveal locally and convert ordinary wheel motion into horizontal navigation without showing native scrollbar chrome.
- Focused data-list rows use a uniform light-blue Core highlight with no left accent strip.
- Plotly and custom D3/SVG tooltips share one neutral-dark, slightly translucent Core theme.

## FWHM

- Shared Science Runtime owns local baseline fitting and FWHM crossing calculation.
- Constant/linear local baselines are selected from the analysis window.
- Half-height crossings are interpolated from the baseline-corrected curve.
- Draggable handles now change the analysis window; they no longer directly define FWHM.
- Core `ScientificCurveSurface` owns analysis-window handles, baseline line and measured FWHM presentation.

## TER transformed heatmap

- Shared TER science builds a transformed Vg–Vd matrix using the same target grid/source-file selection as TER.
- `raw`, `detrend`, `didv`, `dlog`, `dvdi` and `resistance` reuse shared `transformSweep()`.
- Forward/reverse sweeps are explicit and separate.
- Core Parameter Schema owns transform controls; Core Chart Runtime/PlotView owns render/export/portable behavior.
- TER project persistence stores selected transform type and direction.
- Seven TER cards use a 3×3 default grid.

## Automated verification

- `npm run check`: PASS.
- `npm test`: PASS.
- Rebuilt linked-view focus/reveal regression: PASS.
- Core Plotly/custom tooltip theme regression: PASS.
- Tilted-baseline synthetic Gaussian FWHM regression: PASS.
- Forward/reverse transformed-matrix and duplicate-Vg source preference regression: PASS.
- TER Python reference parity: PASS.
- Mature scientific-engine parity: PASS.
- First-party plugin boundary checks: PASS.
- `git diff --check`: PASS.

The current cloud environment blocks local `file:` / `data:` Chromium navigation, so no post-change local-page screenshot is claimed as visual evidence. Interaction behavior is validated through executable Core runtime tests and numerical behavior through generated-data/reference tests.

## Version

Application version: `3.41.6`. TER plugin version: `3.1.0`. Plugin API remains `1.8.0`.
