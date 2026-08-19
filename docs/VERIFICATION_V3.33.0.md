# v3.33.0 verification — Resonance parity and canonical data flow

## Architectural findings

The failures were not treated as independent plugin bugs.

1. Imported legacy datasets are persisted once in the project root. Their `data.table` Artifact representation is intentionally transient, so a dedicated TOP renderer that restored only `project.dataModel` received no imported dataset artifacts. The base plugin-window runtime now reconstructs those transient adapters from `project.datasets` after restore.
2. TER and Resonance both captured `makeProject()` during activation. Normal imports performed after activation therefore left the plugin-owned runtime with an old dataset snapshot. Both services now read the current shared Artifact Store on demand, with `project.datasets` only as a compatibility fallback.
3. A completed import kept `importDraft.files` and `activePath`. Reopening Import therefore displayed the previous pending files and duplicate detection could fire before the user selected anything. A successful import now terminates and clears that import session.

## Resonance v3.25 compatibility target

The shared feature/View implementation remains the single implementation for SUPER and TOP. Host adapters only map container/lifecycle behavior, so lowering Resonance to TOP does not swap to a second renderer.

The v3.25 presentation contract is preserved for scientific traces: the main forward/reverse sweeps, peak trace, trend series and group/TER series use Plotly's default trace sequence instead of architecture-added category recoloring. Direct peak interactions include Shift+left-click manual-peak insertion, Ctrl+right-click deletion and drag-to-move with raw-sample snapping. Existing typed selection, range operations, PRIME/SUB composition and detector-provider infrastructure remain available.

## Automated verification

- `npm test` — passed.
- `npm run check` — passed, including plugin-boundary checks and science parity checks.
- `test-live-data-bridge.js` — verifies transient Artifact hydration, pruning, legacy round-trip, live TER source selection and Resonance refresh without plugin recreation.
- `test-ter-live-artifact-integration.js` — runs the real TER service against synthetic forward/reverse data supplied only through the live Artifact Store and produces a finite `1 Vg × 40 Vd` matrix.
- Resonance architecture regression tests lock the shared SUPER/TOP View/Controller contract, v3.25 default trace palette and direct peak gestures.
- Import safeguard regression checks require a successful import to clear the pending import session before closing the panel.

## Linux runtime verification

The workbench was executed in a real Linux graphical session using Xvfb + system Chromium with the project JavaScript and local Plotly runtime. A synthetic two-direction resonance dataset was supplied through the same Artifact bridge used by the application.

Observed result: `1` dataset, `2` sweeps, `2` detected peaks, no page JavaScript errors. Shift+left-click increased the peak count from `2` to `3`; Ctrl+right-click reduced it to `2`; dragging moved a peak from `Vd=-0.42 V` to the nearest raw sample at `Vd=-0.30 V`. The two sweep traces retained Plotly's default blue/orange sequence and the peak trace retained the corresponding default third-series color.

Electron dependencies were not downloaded on the server because outbound package-network access was unavailable during this run. This did not block runtime verification: the same renderer JavaScript, DOM, Plotly plotting and pointer/click interactions were executed in Chromium under Xvfb rather than inferred from source inspection alone.
