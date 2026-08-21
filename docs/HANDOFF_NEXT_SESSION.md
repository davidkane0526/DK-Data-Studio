# Next Session Handoff — v3.58.2

## Current baseline

- Application: `3.58.2`
- Branch: `fix/v3.58.2-runtime-data-lifecycle`
- Architecture baseline: v3.58 Host Neutralization remains intact. Core/Host is domain-neutral; first-party scientific state is plugin-owned; TOP renderers are dedicated-only.
- Plugin SDK: v1.8.0 remains the public plugin development surface.

## v3.58.2 fixes

1. TER dedicated TOP now injects managed `ScientificPlot` into its analysis service. This fixes `charts.scalarField is not a function` without adding a TER-specific Host path.
2. Resonance peak-family/group trend construction no longer requires optional peak-metrics completion. Vpk/Ipk and peak identity remain available immediately; FWHM/amplitude/area merge when available.
3. Imported source datasets have an explicit lifecycle. The project Host owns canonical source datasets and mirrors them as `legacy-dataset` DataTable Artifacts. `core.data-sources` exposes generic list/remove operations, and Data Center is the canonical UI for source removal. Removing a source also removes its Artifact lineage descendants.

## Ownership rule

- Host/project: imported source lifetime.
- Artifact Store: typed projections and derived lineage.
- Data Center: source-management UI.
- Analysis plugin data lists: visibility/selection/analysis participation only; do not own source deletion.

## Validation gates

- `npm run check`
- `npm test`
- `npm run data-source-lifecycle:test`
- `npm run sdk:test`
- `npm run host-neutralization:test`
- `git diff --check`
- Built-in Automation Test Center: `Data Contract -> Project source data lifecycle`

Do not fix future plugin errors by reintroducing scientific domain code into `src/app.js`. Add or extend a generic Core contract only when a real plugin requires it.
