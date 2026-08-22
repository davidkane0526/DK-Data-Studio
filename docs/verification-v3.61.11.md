# DK Data Studio v3.61.11 verification

Scope: corrected logarithmic display semantics, heatmap Z/color-scale projection, decade-only Y labels, and authoritative Data Center hydration for legacy projects.

## Contracts

1. XY/scatter/curve plots use a view-only `abs(Y)` projection with logarithmic Y scale; source values remain unchanged.
2. Logarithmic Y axes label powers of ten only. ScientificCurveSurface uses explicit decade tick values; Plotly uses `dtick = 1`.
3. Heatmaps/scalar fields keep X/Y coordinates unchanged. Their logarithmic display projects `log10(abs(Z))` into the color mapping and labels the colorbar with original absolute Z magnitudes.
4. ScientificPlot does not own a raw double-click handler; base `DKDSCharts` owns Plotly display-scale hit testing and emits `dkds:display-scale-changed`.
5. Data Center requests `artifactHydration: live`. Its dedicated renderer prefers the owner live Artifact snapshot over independent legacy reconstruction, while old hosts retain `project.datasets` fallback compatibility.
6. Live Artifact hydration is opt-in per activity, avoiding a duplicate full snapshot payload for TER/Pulse and other heavy TOP windows that do not request it.

## Gates

- `node scripts/test-log-z-and-legacy-bootstrap-v36111.js`
- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`
