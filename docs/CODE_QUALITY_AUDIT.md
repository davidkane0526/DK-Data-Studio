# Code quality audit — v3.61.85

## Release decision

v3.61.85 continues the v3.61.84 structural cleanup. No new product capability is introduced. This checkpoint removes a substantial Core/domain CSS ownership leak and converts several first-party workspaces from runtime-injected styling to the same manifest-owned stylesheet path used by packaged plugins.

## Changes completed

- Electron host, tests, Theme runtime, generated bundles and release-history organization from v3.61.84 remain canonical.
- First-party static domain CSS now uses `manifest.styles` and the normal plugin stylesheet lifecycle. Connectivity Center, Data Center, Pulse Analysis, Resonance Workbench and TER Analysis own their domain geometry in `plugin.css`.
- Plugin styles occupy one deterministic cascade slot: after base Core structure and before `ui-modern.css` / Theme-Material chrome. Built-in activation order no longer grants a late-CSS privilege.
- Core authored CSS no longer contains `.ter-*`, `.pulse-*`, `.dc-*`, `.respar-*`, `.reswin-*` or the corresponding domain page IDs. AnalysisWorkbench regions use semantic Core classes instead.
- Core ScientificPlot navigation detects legends and plot scopes through `data-dkds-legend` / `data-dkds-plot-scope`; it no longer names Resonance legend implementations.
- Mobile summary observation uses `data-dkds-mobile-summary` instead of hard-coded Resonance/TER element IDs.
- Resonance no longer injects `TOP_STYLES` at runtime or requests `ui.styles` solely for static CSS. Data Center, TER and Connectivity static CSS injection paths were removed as well.
- Historical regression tests that required domain selectors inside Core or depended on exact CSS serialization were rewritten around semantic ownership/behavior.
- A v3.61.85 CSS-ownership gate prevents migrated domain selectors from returning to Core and fixes the new CSS-debt ceiling.

## Measured debt

- Authored Core CSS now contains **1492** `!important` declarations, down from **1597** at v3.61.84.
- `src/styles/modern/` contains **651**, down from **663**.
- This is meaningful reduction, but the totals remain high. They are now hard upper bounds in regression tests and must not grow.
- Domain plugin CSS still contains some legacy geometry-level `!important` declarations and dense selectors. Those should be simplified only when the corresponding workspace can be behaviorally verified; moving theme paint into plugins is not an acceptable way to reduce Core counts.

## Remaining debt

1. Base CSS still contains older generic selector stacks and specificity that force the modern layer to use `!important`. The next cleanup should consolidate semantic controls/surfaces at their owning base rule rather than append another modern override.
2. Some first-party plugin CSS is mechanically dense because it was extracted from historical inline templates. Formatting and selector simplification can continue, but plugin CSS must remain geometry/data-semantic only; Core keeps color, Material, typography scale and shared control chrome.
3. Some long-lived tests still assert implementation strings. v3.61.85 corrected the ones that blocked this ownership migration; remaining ones should be converted only when their owning subsystem is touched, not mass-weakened.
4. Windows Electron/GPU visual validation remains a separate release gate. Source/contract tests cannot prove backdrop-filter, font rasterization or exact visual alignment.

## Non-negotiable repository rules

- Core/Theme CSS must not name domain-plugin selectors or page IDs.
- First-party and packaged plugins use the same `manifest.styles` lifecycle; static CSS must not be injected with `ctx.ui.styles.add`.
- Plugin CSS owns domain geometry, not host theme/material paint.
- Do not create release-numbered source/CSS files or append versioned hotfix blocks.
- Generated runtime bundles and derived assets remain untracked.
- When several workspaces need one behavior, add/use a semantic Core/SDK contract instead of enumerating known plugin selectors.

Run `npm run check` before each release checkpoint and `npm run clean:generated` before clean-source packaging.
