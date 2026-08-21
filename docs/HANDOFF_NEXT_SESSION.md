# Next Session Handoff — v3.60.0

## Current baseline

- Application: `3.60.0`
- Branch: `feat/v3.60-scientific-reactive-foundation`
- Architecture baseline: v3.58 Host Neutralization and v3.59 Table/Interaction foundation remain intact. Host/Core stays domain-neutral; first-party scientific state lives in plugins; TOP renderers are dedicated-only.
- Public Plugin API / standalone SDK: `1.10.0`. API 1.10 adds `data.reactive` / `ctx.data.reactive`. API 1.9 TableSurface/SettingsSurface remains unchanged and compatible 1.x packages continue to load when requirements are available.

## v3.60 scientific reactive foundation

1. `Scientific Reactive Runtime` is the canonical mechanism for scientific state changes that invalidate derived data or multiple views. Plugins declare semantic dependency nodes; Core owns revisioning, transaction batching, dependency propagation, frame scheduling and stale async-result rejection.
2. Plugins should not encode consistency as chains such as `clearCache(); renderA(); renderB(); renderC();`. A user edit touches semantic nodes once, and dependent derived/effect nodes update from the same revision.
3. Resonance is the first migration sample: peak geometry, FWHM analysis window, metric results and dependent views use reactive nodes. Peak-metric async work uses latest-result semantics.
4. TER is the second migration sample: analysis service owns computation/state only; Feature Runtime is the single ScientificPlot owner. Selection changes update an existing R–V topology with lightweight `restyle/relayout` rather than full trace rebuilds.
5. Range selection must declare the intended semantic target. Resonance selects Peak markers/entities from an X/Y rectangle rather than all raw samples intersecting the same X span.
6. D3 and Plotly remain renderer choices below the common ScientificPlot/Selection/Reactive contracts. Do not force a scientific domain plugin to implement separate state-consistency logic for each renderer.
7. Dedicated TOP keeps Plotly non-blocking at startup, then Core performs an idle warmup when `plotly` is a declared dependency. Do not reintroduce eager blocking script loading or plugin-specific Plotly warmup code.

## Validation gates

- `npm run check`
- `npm test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`
- Built-in Automation Test Center: `Data Contract / Scientific Reactive Dependency`

Do not restore plugin-local manual refresh chains merely to satisfy an obsolete test. Tests should verify dependency declarations, single view ownership, revision propagation and stale-result rejection. Extend the Reactive Runtime only when an actual first-party/external plugin requirement demonstrates a missing generic mechanism.
