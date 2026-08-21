# Next Session Handoff — v3.61.1

## Current baseline

- Application: `3.61.1`
- Intended branch: `fix/v3.61.1-plotly-cartesian-entry`
- Architecture baseline: v3.58 Host Neutralization, v3.59 Table/Interaction foundation and v3.60 Scientific Reactive Dependency remain intact. Core stays domain-neutral; scientific consistency is transaction/dependency-driven rather than plugin-local refresh chains.
- Public Plugin API / standalone SDK remains `1.10.0`; v3.61 changes renderer/runtime performance, not the public plugin contract. SDK minimum application version therefore remains `3.60.0`.

## v3.61.1 runtime correction

- `plotly.js-cartesian-dist-min` must be loaded from `plotly-cartesian.min.js`. Do not use the full distribution filename `plotly.min.js` with the Cartesian package.
- Main renderer, Chart Runtime, dedicated TOP and mobile vendor sync must keep the exact same Cartesian entry contract.
- `scripts/test-plotly-cartesian-entry-v3611.js` is a required regression gate; when dependencies are installed it also asserts the actual bundle file exists.

## v3.61 performance rules

1. High-frequency pointer movement must not run scientific algorithms. D3 edit surfaces provide immediate geometric feedback during drag and commit one scientific edit when the gesture ends.
2. FWHM-window dragging must never call `getMarkerWidth()` from the pointermove loop. The metric getter may be evaluated for authoritative render state, but not for every drag event.
3. Repeated immutable/source geometry used only for clamping or lookup should be cached by source object identity when it is on an interaction hot path; do not create project-wide caches for trivial values.
4. Multiple heavy Plotly views must render through Core `ScientificPlot`. Plugins may declare relative `renderPriority` (`immediate`, `frame`, `idle`); plugins must not create their own timers/queues to serialize charts.
5. The primary user-visible result should be immediate. Secondary expensive views are frame/idle work and are coalesced by view so obsolete queued renders are replaced rather than all executed.
6. Selection/highlight remains lightweight `restyle/relayout`; do not use the render scheduler as an excuse to rebuild a full multi-trace topology for ordinary linked selection.
7. Desktop/mobile use `plotly.js-cartesian-dist-min` while DKDS only requires Cartesian scatter/heatmap Plotly traces. If a future plugin genuinely requires a trace outside that bundle, extend renderer capability loading deliberately rather than silently restoring the full bundle for every plugin.
8. Dedicated TOP starts a non-awaited Plotly preload immediately after lightweight dependency setup, before plugin activity-open, while ready still never awaits Plotly. Post-ready idle warmup remains a fallback/reuse point. Do not move Plotly back into the blocking dependency phase or add plugin-specific preload code.

## Validation gates

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`
- Built-in Automation Test Center: `Performance / Scientific multi-view render scheduling`

Performance work must be justified by a measured/identified hot path. Avoid speculative cache layers, worker abstractions, renderer pools or fallback branches unless a real first-party/external plugin workload demonstrates the need.
