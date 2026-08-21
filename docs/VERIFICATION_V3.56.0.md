# DK Data Studio v3.56.0 Verification

## Scope

v3.56.0 returns to scientific functionality after the algorithm-infrastructure series. It adds one shared Core scalar-field rendering surface, migrates TER heatmaps to it, and extends Resonance gate analysis with a typed cross-curve peak/FWHM feature matrix. Scientific numerical algorithms and Algorithm Provider versions do not change.

## Versions

- Application: `3.56.0`
- Resonance Workbench: `3.56.0`
- TER Analysis: `3.10.0`
- ScientificPlot: `2.2.0`
- Scientific Pipeline: `1.0.0`
- Scientific Transform Runtime: `1.1.0`
- Scientific Algorithm Runtime: `1.1.0`
- Standard Resonance Algorithms package: `2.2.0` (scientific algorithms remain `1.0.0`)
- Standard Transport Algorithms package: `1.1.0` (scientific algorithms remain `1.0.0`)
- Automation Runner: `1.11.0`

## Required contracts

1. `ctx.ui.scientificPlot.scalarField()` is the shared renderer for typed scalar-field matrices. Plugins must not own duplicate Plotly heatmap lifecycle/hover/export infrastructure.
2. TER primary and transform heatmaps consume the shared scalar-field surface while retaining existing scientific values and interactions.
3. `resonance.feature-field` is registered as a subtype of `science.scalar-field`.
4. Resonance `gate-analysis` declares `resonance.gate-analysis` and `resonance.feature-field` as its two Pipeline outputs and may publish both in one transaction.
5. The Resonance feature field covers all visible accepted peak families and supports peak position, FWHM, amplitude, Prominence, area, local baseline and peak/background metrics with forward/reverse/all filtering.
6. Every populated feature-field cell retains the originating peak ID; click projection selects the real `resonance.peak` and can open the existing Inspector.
7. Cross-curve feature-field computation is data-first: no UI controller is required to enumerate accepted peak families.
8. The feature-field Artifact carries peak-set lineage, metric/direction parameters and the exact peak-metrics algorithm reference.
9. Existing A/B gate-series plots, TER results, FWHM definitions, Transform Provider values, Algorithm Package Catalog and TOP lifecycle behavior remain backward compatible.

## Expected built-app automation

Development Electron: `29 pass / 0 fail / 1 skip / 30 total`; the only skip is packaged-build identity.

Packaged installer/portable: `30 pass / 0 fail / 0 skip`.

The new case is `Scientific Scalar Field & resonance feature field`. It must verify ScientificPlot 2.2 scalar-field projection, diverging defaults, the `resonance.feature-field → science.scalar-field` type relationship and the real Resonance `gate-analysis` Pipeline output declaration.

TOP coverage remains 4/4. Lazy Plotly and Algorithm Provider routing remain unchanged.

## Source verification

```bash
npm run scientific-plot:test
npm run automation-center:test
npm test
npm run check
npm run performance:test
npm run plugin:validate
git diff --check
```
