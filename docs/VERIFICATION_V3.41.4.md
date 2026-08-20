# DK Data Studio v3.41.4 Verification

## Scope

This patch keeps Plugin API v1.8 and the Core-first architecture. Selection chrome and compact horizontal scrolling are Core defaults/utilities; Resonance retains only domain selection/projection logic.

## Fixes

- Native checkbox/radio selected state now inherits `var(--accent)` from Core.
- Resonance `buildTrendModel()` now projects all visible accepted forward and reverse peak families regardless of the currently focused sweep or peak.
- Resonance main legend no longer fades non-focused but visible datasets.
- Legend Vg labels use significant-digit formatting, so `0.000`, `5.000`, `-5.000`, and `10.5000` render as `0`, `5`, `-5`, and `10.5`.
- Resonance legend opts into the Core compact horizontal-scroll utility (`3 px` WebKit scrollbar with no native arrow buttons).

## Verification

- `npm run check`: PASS.
- `npm test`: PASS.
- Resonance shared-controller regression: a focused forward sweep with both directions visible produces forward and reverse group/trend series.
- Scientific engine parity: PASS as part of `npm run check`.
- Chromium CDP computed `accent-color` for a checked Core checkbox as `rgb(49, 94, 251)`.
- Chromium visual inspection confirmed the compact horizontal strip is substantially lighter than the previous native-width scrollbar.
- `git diff --check`: PASS.

## Version

Application/runtime/resonance release version: `3.41.4`. Plugin API remains `1.8.0`.
