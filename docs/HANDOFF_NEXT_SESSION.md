# Next Session Handoff — v3.36.0

## Current checkout

- Local working branch: `refactor/v3.36-workspace-docking-grs-parity`
- Current delivery: `v3.36.0`
- `main` remains the local v3.32.0 baseline until an explicit merge is requested.
- Do not access or modify a remote repository unless the user explicitly asks.

## Architecture checkpoint

GRS remains the mother design for the common DKDS Plugin Workspace Design System, but Resonance is not an exception. Reusable interaction/layout capabilities live in Core.

v3.36 adds the missing geometry semantics:

- roughly left 1/5 = plugin control/data rail;
- roughly right 4/5 = scientific canvas;
- fixed PRIME/SUB/subplot left/right/bottom positions are relative to the scientific canvas;
- manual floating is flexible inside the scientific canvas with snapping;
- SUPER projects PRIME/SUB commands into the host top toolbar, while TOP renders the same semantic commands in its window header;
- internal Workspace/View/Controller/Artifact/Selection behavior is host-invariant.

Resonance Group is a bottom scientific-canvas PRIME by default and no longer spans the data rail. Individual group cards are Core portable views. TER receives the same chart-area docking semantics through PluginWorkspace.

Project-tab switching now resets absent plugin slices against the selected project's root instead of retaining the previous tab's controller state.

Performance work in v3.36 removes full SVG/Inspector redraws from marker/FWHM pointer-move loops and uses `Plotly.react` for Resonance group charts.

## Validation

Before delivery, rerun:

```bash
npm test
npm run check
node scripts/test-plugin-workspace-foundation.js
node scripts/test-resonance-shared-architecture.js
node scripts/test-plugin-manager.js
node scripts/test-ter-live-artifact-integration.js
```

Linux Chromium validation details are in `docs/VERIFICATION_V3.36.0.md`.
