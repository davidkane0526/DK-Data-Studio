# DK Data Studio v3.67.17 — R7T Property Ownership Diagnostics — WIP Handoff

## Status

**WIP / not final release.**

This checkpoint continues the R7 property-ownership cleanup from v3.67.16 / R7S. Code-side architecture and regression gates pass, but Windows Electron rendered acceptance remains authoritative for final visual closure. Do not label this Final Freeze until the real Windows UI has been revalidated.

## Source baseline

- Previous clean baseline: **v3.67.16 / R7S Property Ownership Audit**
- Current application version: **3.67.17**
- Current branch: `fix/v3.67.17-r7t`
- GitHub: **the user's GitHub repository was not accessed**
- Architecture rule: Theme Providers own visual values; Core Component Appearance / Material Renderer own final standard-component paint; Core Structure owns final geometry; contexts feed bounded slots instead of competing for final properties; plugins own domain layout/content rather than Core chrome.

## Why R7T exists

R7P–R7S removed source-order-dependent geometry from the main Shell command, activity/project tab, status, PortableView, field, table, legend and splitter families. R7T closes four remaining high-risk paths:

1. generic global `button/input/select` fallbacks still intersecting specialized Core controls;
2. legacy `.floating-panel` / `.group-panel` / `.inspector-panel` geometry remaining active after a surface becomes a `PortableView`;
3. interactive motion being cancelled or redefined by late Presentation selectors;
4. lack of a runtime diagnostic that can show where an element's final computed properties actually came from.

The goal remains **one semantic owner for each final standard-component property**, not the elimination of CSS cascade itself.

## Completed in R7T

### 1. Generic button fallback no longer owns specialized Core actions

File:
- `src/styles/structure/schema-and-plugin-ui.css`

Changes:
- The generic button content-box fallback now explicitly excludes canonical/specialized Core owners, including:
  - Toolbar/Header actions
  - Plugin Manager actions
  - Settings/Dialog actions
  - command-menu actions
  - Scientific floating navigation
- Generic buttons consume bounded `--dkds-generic-button-*` slots rather than acting as an invisible second min-height/padding owner for every button in the application.
- Plugin Manager toolbar/card/theme actions now own explicit slot-driven hit geometry.

### 2. Generic field fallback no longer overlaps Plugin Manager fields

File:
- `src/styles/structure/schema-and-plugin-ui.css`

Changes:
- Generic `input/select/textarea` density explicitly excludes Plugin Manager descendants.
- Plugin Manager fields therefore no longer depend on a generic baseline followed by a later local override.

### 3. Settings/Dialog actions own their own hit geometry

File:
- `src/styles/structure/workbench-components.css`

Changes:
- Settings header close action owns `--dkds-settings-header-action-size`.
- Settings footer actions own `--dkds-settings-footer-action-*` slots.
- Dialog actions own `--dkds-dialog-action-*` slots.
- These standard components no longer rely on generic `button` min-height/padding before local correction.

### 4. Legacy FloatingPanel and PortableView geometry are mutually exclusive

Files:
- `src/styles/structure/schema-and-plugin-ui.css`
- `src/styles/structure/workbench-components.css`
- `src/styles/structure/workspace-interaction.css`

Changes:
- Legacy `.floating-panel`, `.group-panel` and `.inspector-panel` placement rules explicitly use `:not(.dkds-portable-view)`.
- Legacy docked/collapsed/responsive generic-panel geometry follows the same exclusion.
- Once a target becomes a `PortableView`, the legacy position/width/height/resize/overflow owner is no longer eligible to match it.
- This removes a major class of dual geometry ownership where the final result previously depended on specificity/source order.

### 5. Standard control motion has one Core owner

File:
- `src/styles/theme/contract.css`

Changes:
- Hover/active/focus motion for standard controls is centralized in the Theme Contract motion recipe.
- Standard controls remain geometrically stationary: hover/active/focus do not translate or scale the control silhouette.
- Command-menu/popover surfaces are stationary and do not animate into position.
- Menu items explicitly remain `transform:none` during hover/active/focus.
- Theme may tune motion timing values, but Presentation no longer owns transform counter-rules.

Removed redundant late transform ownership from:
- `src/styles/presentation/shell.css`
- `src/styles/presentation/dialogs.css`
- `src/styles/presentation/plugin-chrome.css`
- `src/styles/presentation/analysis.css`
- `src/styles/presentation/scientific.css`

### 6. Computed ownership diagnostic added

File:
- `src/core/theme/debug-runtime.js`

Theme Debug runtime advanced to **2.3.0** and now exposes:

```js
DKDSThemeDebug.traceOwnership(element[, properties])
```

Default traced properties include:
- `height`
- `min-height`
- four padding sides
- `background-color`
- `background-image`
- `border-color`
- `box-shadow`
- `transform`

The diagnostic reports:
- the browser's final computed value;
- matching stylesheet / selector / declaration candidates;
- inline declarations;
- canonical architecture owner labels:
  - geometry: `Core Structure`
  - paint: `Core Component Appearance / Material Renderer`

It is **on-demand only** and does not add normal startup or pointermove work unless Theme tooling is explicitly loaded/enabled.

If Theme tooling has not yet been loaded:

```js
await window.DKDSOptionalRuntime.ensureThemeTooling();
const report = window.DKDSThemeDebug.traceOwnership(
  document.querySelector('#someElement')
);
console.log(report);
```

This is intended for the next Windows UI regression: instead of guessing which later stylesheet won, inspect the actual final property and all matching declaration sources.

### 7. Style validator expanded

File:
- `scripts/validate-styles.js`

R7T adds build-time rejection for:
- generic button fallbacks reclaiming Plugin Manager / Settings / Dialog / Scientific floating action geometry;
- generic field fallbacks reclaiming Plugin Manager field density;
- legacy FloatingPanel/group/inspector geometry matching a `PortableView`;
- Presentation files owning interactive button transforms;
- Theme files outside the canonical Theme motion contract owning standard-control interactive transforms.

### 8. Hard Visual Invariants expanded

File:
- `tools/quality/visual-invariants.js`

Hard gate increased from **75 → 79**:
- HARD-76: generic fallback vs specialized Core action ownership
- HARD-77: legacy FloatingPanel vs PortableView geometry isolation
- HARD-78: single standard-control motion owner
- HARD-79: computed ownership diagnostic availability

### 9. New R7T regression test

New file:
- `tests/test-v36717-r7t-property-ownership-diagnostics.js`

It is included in both normal `test` and `check` manifests.

### 10. Historical test governance cleanup

Several older tests correctly protected behavior but were coupled to obsolete implementation locations/versions. They were updated to remain capability-based:

- `tests/test-ui-polish.js`
  - accepts the canonical legacy `.floating-panel:not(.dkds-portable-view)` geometry selector.
- `tests/test-v36136-scientific-presentation-architecture.js`
  - validates the centralized Theme stationary-motion contract instead of requiring a historical Presentation selector.
- `tests/test-v361103-presentation-ownership.js`
  - validates Theme Contract as the single stationary-control motion owner.
- `tests/test-v36183-stationary-menu-motion.js`
  - validates menu/menu-item stationary behavior in the Theme motion contract rather than the retired Presentation owner.
- `tests/test-v3659-theme-action-header-inspector.js`
  - treats Theme Debug 2.3+ as compatible while preserving the movable, session-positioned Inspector capability.

The historical v3.67.10 visual-closure test continues to require the current patch identity in `CHANGELOG.md`, so this R7T delivery has an explicit v3.67.17 changelog entry while retaining the historical Desktop Visual Closure record.

### 11. Version progression

Application version advanced:

**3.67.16 → 3.67.17**

Application-owned version strings were updated. Built-in plugin versions remain independently versioned.

## Validation completed

Code-side gates all pass:

- `npm test`: **233/233 PASS**
- `npm run check`: **241/241 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- `npm run plugin:validate`: **17 plugin packages PASS**
- Hard Visual Invariants: **79/79 PASS**
- authored CSS: **44 files / 0 `!important`**
- `git diff --check`: **PASS**
- `git fsck`: **PASS**

Expected negative-fixture logs from Plugin Manager/SUPER tests may appear during full runs; those cases intentionally exercise activation failure/duplicate-contribution/error handling and the suites pass.

## Repository hygiene for delivery

The clean delivery ZIP should retain `.git` and deterministic generated runtime files used by the fast development-start path, while excluding:
- `node_modules`
- caches
- temporary screenshots
- temporary browser/test harness artifacts
- obsolete R7 handoff files

Only this R7T handoff should remain at the project root.

## What remains / recommended next work

R7T is **not Final Freeze**. Recommended continuation:

1. Run Windows Electron acceptance on the current clean package, especially the historically problematic Import command halo, compact Presenter centering, theme switching, status/header actions, floating scientific chrome and GroupPlot drag.
2. When a rendered discrepancy appears, use `DKDSThemeDebug.traceOwnership(...)` to capture the actual `height/padding/background/border/shadow/transform` provenance before changing CSS.
3. Continue property-owner migration only where the computed trace demonstrates real duplicate ownership. Avoid adding higher-specificity correction selectors.
4. Audit any remaining feature-specific Theme paint that targets standard Core semantics indirectly through non-identity selectors; keep final standard-component paint in Component Appearance / Material Renderer.
5. Keep startup and GroupPlot drag performance separate from style ownership. If latency remains, profile actual startup/resize phases rather than using CSS workarounds.

## Continuation rule

Use this **v3.67.17 / R7T clean ZIP** as the only source baseline for the next round. Do not roll back to older R7 packages. Do not access the user's GitHub repository. Increment the application patch version for the next testable delivery.
