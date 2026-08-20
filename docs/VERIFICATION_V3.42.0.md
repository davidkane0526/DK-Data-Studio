# DK Data Studio v3.42.0 Verification

## Scope

v3.42.0 completes the first four Core-first consolidation goals after v3.41: canonical scientific Entity identity/state, a shared ScientificPlot lifecycle, lineaged scientific Artifacts, and removal of remaining first-party plugin-owned interaction/chart infrastructure.

Plugin API remains `1.8.0`. The new `data.entities`, `ui.scientific-plot` and Artifact-lineage surfaces are additive/backward-compatible Core capabilities; built-in plugins consume the stronger contract without forcing existing v1.8 external plugins to migrate.

## 1. Entity Registry and linked interaction

- Stable Entity IDs represent datasets, sweeps, peaks, matrices, points and other scientific objects.
- Parent/child relations allow a focused child to resolve to the nearest displayed ancestor (for example Peak → Sweep → Dataset).
- `visible`, `focused`, `selected`, `locked`, `hidden` and `disabled` are distinct states; focus never filters scientific visibility.
- Interaction channels project focus/selection into the Entity Registry, and disposing one channel removes only that channel's contribution.
- Identical Entity upserts are deduplicated. Bulk registration is transaction/batch-aware.
- Artifact-backed entities survive plugin disposal under `core.data`; later plugin domain enrichment is preserved across Artifact refreshes.

## 2. ScientificPlot

- Core owns Plotly `plotly_click` lifecycle; repeated render/attach does not accumulate plugin listeners.
- Trace- and point-level Entity mappings drive shared Interaction selection.
- Core applies related focus emphasis/dimming and restores base trace/marker styles when focus clears.
- Core owns Plotly react/attach, resize, restyle/relayout compatibility, purge and image export.
- Core ScientificCurveSurface consumes the same Interaction + Entity graph for D3/SVG curve/marker focus and selection.
- Resonance trend/inspection/group/main views no longer need plugin-private focus restyling.

## 3. Artifact/Data Model v2

- Every derived Artifact can declare lineage parents, role, producer, operation and parameters.
- The store exposes parent/child/ancestor/descendant lineage queries.
- `publish()` suppresses semantically identical results; `batch()` collapses multi-result updates into one aggregate event.
- Standard `data.transform` and `result.matrix` factories are available.
- Artifact lineage is projected into the Entity relationship graph automatically.
- Legacy Artifact/project data without lineage is normalized during rehydrate and remains loadable.

## 4. First-party plugin migration / boundary

- Resonance: Dataset → Sweep → Peak identity is registered in Core; Sweep/PeakSet Artifacts carry lineage; Plotly trend/group selection and D3 curve/marker focus are Core-owned.
- TER: scientific plots use ScientificPlot; Raw → TER Matrix / Transform Matrix → Maxima analysis is published with lineage.
- Pulse: analysis charts, resize and image export use ScientificPlot.
- Data Center: Artifact list selection uses the Core linked-selection view and explicitly declares `data.entities`.
- Static first-party boundaries reject private Plotly listeners, `ctx.ui.charts` bypasses, private `scrollIntoView`, raw DOM/observer/scheduler infrastructure and other previously centralized ownership.

## Real legacy-project regression

The supplied `K3-18-21.21-demo.json` is loaded as a real legacy `graphene-resonance-studio-project` (`schemaVersion: 1`) rather than converted into synthetic test data. The regression verifies:

- 21 datasets;
- 42 sweeps: 21 forward + 21 reverse;
- 93 saved peaks;
- 156 Dataset/Sweep/Peak entities;
- TER grid: 21 Vg × 200 Vd = 4,200 records;
- six transforms: raw, detrend, dI/dV, dln|I|/dV, dV/dI and resistance;
- legacy Dataset → Core Artifact → compatibility projection point-by-point V/I equality;
- transform and TER numerical parity after the Core roundtrip;
- Peak → Sweep → Dataset entity focus projection;
- Raw → Sweep → PeakSet Artifact lineage;
- project serialize → reopen preserves dataset and saved-peak counts;
- repeated scientific publication is semantically deduplicated.

## Release verification commands

The release is accepted only after the following complete successfully on the final versioned tree:

- `npm run check`;
- `npm test`;
- `npm run real-project:test -- <legacy-project.json>`;
- `git diff --check`;
- Plugin API/runtime-manifest validation;
- scientific-engine parity and TER Python reference parity;
- ZIP extraction + Git branch/HEAD/clean-tree/version verification.

`npm run dist` is also attempted. If the cloud image still lacks `electron-builder`, this is documented as an environment limitation and is not reported as a successful Windows distributable build.

## Versions

- Application / Resonance: `3.42.0`
- TER: `3.2.0`
- Pulse: `2.9.0`
- Data Center: `1.9.0`
- Plugin API: `1.8.0`
