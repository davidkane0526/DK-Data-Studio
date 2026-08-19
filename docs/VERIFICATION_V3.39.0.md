# DK Data Studio v3.39.0 verification

## Scope

- Core `PlotView` is the standard scientific data-figure contract.
- Resonance SUB/group charts, TER charts, Pulse raw/read/pulse charts and Data Center preview use it.
- Generic location / CSV / copy / SVG / PNG / resize chrome is no longer plugin-owned.
- Resonance gate-voltage controls use the shared inline scientific form row so `V_CNP (V)` stays on one label line when horizontal room exists.
- Resonance group columns use Core ActionGroup/ContextMenu.
- Native `PluginWorkspace` SUPER roots resolve from `layout.root.selector`, so invoking a top PRIME/SUB command while Plugin Manager is open restores the SUPER page first.

## Automated verification

- `npm test`
- `npm run check`
- `scripts/test-plot-view-foundation.js`
- TER live Artifact integration
- Pulse repeatability
- science parity and plugin-boundary checks

## Browser geometry/interaction check

A Linux Chromium run loads the production `style.css` and `ui-infrastructure.js` into a browser page and verifies:

- `V_CNP (V)` text fragments remain on one visual label line;
- PlotView automatically exposes location + CSV + copy + SVG + PNG;
- the shared ActionGroup group-layout menu opens and remains interactive;
- no page JavaScript error is produced.
