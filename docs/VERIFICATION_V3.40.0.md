# DK Data Studio v3.40.0 verification

## Scope

This release closes the remaining split ownership between plugin code and Core view infrastructure.

- `PluginWorkspace` owns live automatic PlotView hydration for connected PRIMARY / PRIME / SUB content.
- PlotView selectors are strictly local to the owning chart card; no document-wide fallback is allowed for reusable chrome.
- PRIME-owned charts cannot receive a second PortableView/position control.
- standard close/collapse chrome is Core-owned and uses `×`, `−` and `+`.
- PortableView layers are explicit: canvas float is below whole-workspace global float; active floats are raised on focus/drag.
- bottom-dock collapsed-only state returns unused space to PRIMARY.
- Resonance group column layout is a Core PRIME ActionGroup and is mounted at PRIME lifecycle time.
- built-in plugin-specific generic image controls that duplicate PlotView are removed/guarded.

## Automated verification

- `npm test`
- `npm run check`
- `scripts/test-plot-view-foundation.js`
- `scripts/test-workspace-order-runtime-audit.js`
- science parity
- plugin-boundary checks
- TER live Artifact integration
- Pulse repeatability

## Linux Chromium runtime verification

A Linux Chromium run loads the production `src/style.css` and `src/core/ui-infrastructure.js` and exercises the real Core workspace lifecycle. The synthetic scientific workspace intentionally delays SUB connection to reproduce the failure mode seen in the application.

Observed results:

- every connected PRIMARY standard plot received exactly one standard control set: position + CSV + copy + SVG + PNG;
- every delayed SUB standard plot received the same controls after connection without plugin-side rebinding;
- Resonance group `每行` ActionGroup menu opened successfully;
- collapse icon changed `− → +`, expand restored `+ → −`, and close remained `×`;
- collapsing the only bottom-dock occupant increased available center height from roughly 534 px to 799 px;
- whole-workspace global float z-index was 2401, above ordinary/docked group content;
- reusable plot action hosts stayed local and did not accumulate controls from neighboring cards;
- no browser page JavaScript errors were emitted.

Screenshot: `v340_visual/view-contract.png`.
