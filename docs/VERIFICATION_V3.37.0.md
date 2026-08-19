# v3.37.0 verification — workspace ordering and runtime reliability

## Automated project checks

`npm test` and `npm run check` pass with the v3.37 contracts enabled. Coverage includes plugin boundaries, science parity, live Artifact/TER integration, SUPER/TOP workspace invariance, PortableView lifecycle, Pulse science and plugin-service repeatability.

New guards:

- `scripts/test-workspace-order-runtime-audit.js`
- `scripts/test-pulse-service-repeatability.js`

## Linux Chromium runtime geometry/event audit

System Chromium was run under Playwright using the production `src/style.css`, `src/core/ui-infrastructure.js` and TER shared-view markup. The test does not rely only on static source inspection. Because the delivery intentionally has no `node_modules`, Plotly itself is represented only by a resize-count stub in this geometry test; numerical/plotting contracts are separately exercised by Node project tests.

Observed runtime checks:

- TER auto PRIMARY: `clientHeight=259`, `scrollHeight=3330`, `scrollTop=360`; long content is reachable.
- Two views sent to one bottom dock occupy sequential vertical ranges rather than overlapping.
- Canvas `float` and whole-plugin `global` use distinct overlays.
- Dragging a `global` float to the bottom does not snap it into the bottom scientific dock.
- Portable collapse and restore both execute.
- Opening SUB hides the canvas; SUB has independent scrolling (`clientHeight=331`, `scrollHeight=620`, `scrollTop=180`).
- Workspace resize invokes default Plotly-descendant resize handling.
- A global float can cross the scientific-canvas/control-rail boundary.
- Dedicated TOP-window Ctrl+Z/Escape are routed through the same active-plugin Edit Contract even though the main shell toolbar is not loaded.
- Resonance Group and Inspector close actions dispose/hide their PortableViews.
- No browser JavaScript errors were reported.

Screenshot artifact generated outside the repository: `v337_visual/workspace-ordering.png`.

## Pulse repeat-analysis

The real science implementation plus plugin `analysis-service.js` is run in a VM regression:

1. Restore a legacy periodic file with automatic cycle length and no saved result; analysis succeeds.
2. Force an invalid cycle and rerun; the previous valid result is preserved and an error is recorded.
3. Return to automatic cycle and rerun; analysis succeeds again and clears the stale error.

The science regression additionally confirms explicit `null` optional sample bounds stay unset rather than coercing to zero.

## Resonance group portable-layout audit

A second Chromium geometry/event harness loads the production global CSS, Core UI infrastructure and the exact Resonance injected workspace styles. It confirms:

- Group header remains one row (`36 px`).
- Child chart headers keep their placement/CSV/copy controls inside the header (`42 px` measured in the harness).
- A bottom-docked Group starts at the scientific-canvas edge (`group.left=295`, control rail right edge `288`) rather than covering the control rail.
- A child chart moved to `global` is reparented to the outer analysis overlay, can cross the scientific-canvas boundary, and triggers default descendant-plot resize on geometry changes.
- Group collapse/restore and close lifecycle execute through Core PortableView.
