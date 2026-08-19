# v3.36.0 verification — GRS canvas docking, project isolation and performance

## Automated checks

- `npm test`
- `npm run check`
- `node scripts/test-plugin-workspace-foundation.js`
- `node scripts/test-resonance-shared-architecture.js`
- `node scripts/test-plugin-manager.js`
- `node scripts/test-ter-live-artifact-integration.js`

The v3.36 regression guards cover inner scientific-canvas docking, SUPER/TOP host-invariant workspace composition, versioned portable placement, project-tab slice reset/migration, GRS data/inspector/range presentation contracts, visible-sweep auto-fit and high-frequency marker/FWHM drag fast paths.

## Linux Chromium geometry / visual validation

The production `src/style.css`, `src/core/ui-infrastructure.js`, Resonance shared view definitions and GRS-derived `TOP_STYLES` were loaded in system Chromium on Linux. A real `PluginWorkspace` was composed from the production Resonance left rail/main/Inspector/Group nodes.

At a 1440 px viewport the measured regions were approximately:

- outer control rail: x=8, width=280 px, right edge=288 px;
- scientific canvas: x=295, width=1137 px;
- Resonance main scientific plot wrap: x=295, width=1137 px, height=511 px (non-zero fill);
- Group PRIME docked bottom: x=295, width=1137 px;
- Inspector PRIME floating: x=1012, width=390 px.

A representative Group subplot was then moved through the real Core `PortableView` to `left`. Its measured x position was 295 px, exactly the scientific-canvas left edge and to the right of the 288 px control-rail edge. This verifies that “left” means chart-area left rather than application/control-column left.

Browser page errors during this geometry run: 0.

Two independent floating Core portable panels were also opened at the same default origin. Collision avoidance moved the second panel below the first (`y=59` vs `y=249` in a 1200×700 harness), with no overlap; drag bounds keep the complete panel inside the scientific canvas.

## Performance change verified in architecture tests

- marker drag no longer performs a full `ScientificCurveSurface.render()` on every pointer move;
- FWHM width drag updates the band/handles directly and commits a full render on drag end;
- Resonance Inspector refresh is deferred until peak/FWHM drag end;
- Group charts use `Plotly.react` rather than repeated `newPlot`;
- Resonance host-resize requests a coalesced scientific-surface render instead of synchronously rebuilding the SVG.
