# Next Session Handoff — v3.38.0

## Current checkout

- Local working branch: `refactor/v3.38-portable-home-contextual-export`
- Current delivery: `v3.38.0`
- `main` remains the local v3.32.0 baseline until an explicit merge is requested.
- Do not access or modify a remote repository unless the user explicitly asks.

## Architecture checkpoint

GRS remains the mother design for the common DKDS Plugin Workspace Design System, but Resonance is not a special shell. Shared geometry, portable views, chart resize, direct scientific interaction and host command routing belong to Core.

The control/data rail and scientific canvas are a **semantic separation, not a fixed 1/5:4/5 ratio**. The rail remains resizable. Fixed scientific left/right/bottom positions are canvas-relative.

Portable views now have two distinct floating meanings:

- `float`: managed scientific-canvas floating; can snap to scientific left/right/bottom docks;
- `global`: whole-plugin free floating; can cross the control/science boundary and never auto-snaps into scientific docks.

Same-zone dock placements stack sequentially instead of overlapping. SUB pages are siblings of the scientific canvas and may use the whole plugin content area with independent scrolling. SUPER/TOP still mount the same internal Workspace/View/Controller tree.

PRIMARY scrolling is explicit:

- Resonance: `contained` interactive scientific canvas;
- TER, Pulse and Data Center: `auto` long-workspace scrolling.

The system “编辑操作” menu is now an active-plugin contract. Resonance registers undo/deselect there rather than duplicating those operations in PRIME/SUB command presentation. Dedicated TOP windows route Ctrl+Z/Escape through the same contract even though they do not load the main shell toolbar.

Resonance Group uses stable child PortableViews and live visible/accepted-peak data. Group refresh uses `Plotly.react`, preserves child placement, has one compact header, and each child can use whole-interface free floating. Core PortableView owns close/collapse and automatic chart resize.

Pulse repeat-analysis reliability was fixed in the science core: `null`/blank optional sample ranges no longer coerce to zero. A failed rerun preserves the last valid result; a later successful rerun replaces it and clears the error.


## v3.38 delta

PortableView `home` now means the original semantic slot, not “append back to the current home container”. Core leaves a stable Home Anchor at construction, so Resonance group child plots return to the exact original sequence after any combination of dock/global-float moves.

Resonance Group's `每行` control uses the Core ContextMenu and supports Auto/1–6 columns. Its label is synchronized from persisted workspace state.

The system `导出数据` menu is activity-contextual. Resonance, Pulse, TER and Data Center register semantic export targets; switching the active SUPER workspace changes the visible submenu automatically. Generic words such as `主图` are not used for Pulse/TER/Data Center.

Linux Chromium runtime verification is documented in `docs/VERIFICATION_V3.38.0.md`.

## Validation

Before delivery/future merge, rerun:

```bash
npm test
npm run check
node scripts/test-workspace-order-runtime-audit.js
node scripts/test-pulse-service-repeatability.js
node scripts/test-resonance-shared-architecture.js
node scripts/test-ter-live-artifact-integration.js
```

Linux Chromium runtime geometry/event verification is documented in `docs/VERIFICATION_V3.38.0.md`.
