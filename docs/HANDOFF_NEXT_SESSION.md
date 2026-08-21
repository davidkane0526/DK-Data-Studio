# Next Session Handoff — v3.61.4

## Current baseline

- Application: `3.61.4`
- Branch: `refactor/v3.61.4-generic-direct-manipulation`
- Public Plugin API / standalone SDK: `1.11.0`
- Plugin API `1.10.0` packages remain accepted for compatibility.
- Core owns interaction mechanics and rendering infrastructure; plugins own domain state, scientific meaning and algorithm selection.

## Generic direct-manipulation contract

`ScientificCurveSurface` no longer treats peak dragging or FWHM handles as first-class SDK concepts. New plugins declare domain-neutral manipulators through `getManipulators()`:

- `point` — movable point/control anchor, optionally attached to a marker and optionally snapped to a curve.
- `axis` — movable X or Y cursor/threshold/reference line.
- `range` — editable X or Y interval with atomic `{start,end}` geometry, optional bounds, minimum span and contained anchor constraints.

Core owns pointer capture, snapping, temporary SVG geometry, marker fast-path movement, click suppression and gesture lifecycle. Pointer-rate updates use `onManipulationPreview`; domain/project state is normally persisted only in `onManipulationCommit`. `onManipulationReset` handles domain-specific reset semantics.

A plugin may interpret the same primitives as peak position, threshold, fit interval, integration interval, crop range, baseline controls, FWHM analysis window, or other domain concepts. Do not add a new Core callback merely because a new scientific feature needs a draggable point/line/range.

The v1.10 marker/FWHM-named hooks remain only as compatibility adapters inside Core. First-party reference plugins must not consume them.

## Resonance reference mapping

- Peak move: generic `point` manipulator attached to the rendered peak marker and snapped to its sweep.
- FWHM analysis window: generic X `range` manipulator constrained to contain the peak center.
- FWHM baseline/half-height/crossings: presentation only through `getMarkerWidth`; measurement presentation no longer owns the draggable handles.
- Resonance maps generic commit geometry back into its own reactive scientific state and metric invalidation.

## Interaction invariants

1. Pointer-rate manipulation must not change Selection/focus, rebuild legends, run scientific algorithms, or publish project state.
2. Semantic commit occurs once at gesture end.
3. A range commit always contains the complete geometry, not one endpoint.
4. Snapping and geometric constraints are Core responsibilities when expressible through the public manipulator contract.
5. Plugins must not create private D3/Plotly/DOM/timer pointer loops. If a needed primitive is missing, extend Core/SDK generically.

## Dedicated TOP prewarm contract

- Prewarm is manifest-driven and runtime-only.
- Hidden prewarm loads Core/plugin/algorithm/chart runtimes, including declared Plotly, without project restore, activity opening, domain calculation or project-result drawing.
- Promotion to real open hydrates the project/activity and waits for the real ready signal before showing the window.

## Required validation gates

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `node scripts/test-generic-direct-manipulation-v3614.js`
- `node scripts/check-plugin-boundaries.js`
- `node scripts/validate-plugins.js`
- `git diff --check`
