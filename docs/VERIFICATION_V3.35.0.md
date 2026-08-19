# v3.35.0 verification — GRS-derived PluginWorkspace foundation

## Architecture

- Core UI infrastructure version: 6.0.0.
- Preferred workspace: `PluginWorkspace` / `ctx.ui.workspaceSurface`.
- Direct scientific curve interaction: `ScientificCurveSurface` / `ctx.ui.scientificPlot`.
- Resonance SUPER/TOP use the same `mountUnified()` and same `PluginWorkspace`; `hostMode` is metadata only.
- Data Center, TER and Pulse prefer the same PluginWorkspace API.

## Resonance capability extraction

The following mechanics moved from private Resonance D3 plumbing into Core `ScientificCurveSurface`:

- Vg/value continuous Turbo curve color scale;
- reverse-direction dashed curve semantics;
- curve hit testing and selection;
- Ctrl/Shift modified direct curve action;
- direct rectangular range selection;
- Ctrl rectangular zoom;
- wheel zoom around pointer;
- double-click reset;
- draggable snapped markers;
- modifier + right-click marker action;
- editable width/FWHM handles.

Resonance still owns scientific meaning: sweeps, peaks, detector calls, peak identity, physical labels, peak-width calculation and project state.

## Automated verification

- `npm test`: pass.
- `npm run check`: pass after plugin-boundary migration.
- `scripts/test-plugin-workspace-foundation.js` enforces Core ownership of shared workspace/plot interaction and blocks private Resonance reimplementation.
- TER live Artifact integration remains 1 Vg × 40 Vd in regression data.
- science parity remains unchanged for parse/sweep/transform/peak/TER/pulse calculations.

## Linux Chromium interaction verification

The Core workspace and plot primitives were also exercised in a real Chromium renderer on Linux rather than only inspected statically. The browser loaded the production `src/core/ui-infrastructure.js` and production `src/style.css`; because the clean source archive intentionally contains no `node_modules` and the environment could not download npm packages, a test-only D3 API compatibility layer was injected outside the repository. It is not part of the product or delivery ZIP.

Observed result:

- SUPER and TOP `PluginWorkspace` instances rendered the same PRIMARY DOM and the same 775 × 300 internal geometry; only `data-host-mode` differed.
- `ScientificCurveSurface` rendered two real SVG curve paths with independent Turbo colors and the reverse trace retained `stroke-dasharray="7 4"`.
- the explicit color domain remained `[-5, 5]`, proving visibility changes do not remap the GRS color semantics.
- synthetic browser pointer input reached modifier curve click, snapped marker drag, Ctrl box zoom, wheel zoom and double-click reset.
- view lifecycle reasons observed: `box-zoom`, `wheel`, `reset`; wheel pre-hook fired; no page/console errors were produced.

This verifies the host-invariant Core event/DOM path independently from the static architecture tests.
