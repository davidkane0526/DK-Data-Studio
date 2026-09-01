# DK Data Studio v3.67.16 — R7S Property Ownership Audit — WIP Handoff

## Status

**WIP / not final release.**

This checkpoint continues the R7 property-ownership cleanup from v3.67.15 / R7R. Code-side architecture and regression gates pass, but Windows Electron rendered acceptance is still authoritative for final UI closure. Do not label this Final Freeze until the user has validated the actual Windows UI.

## Source baseline

- Previous clean baseline: **v3.67.15 / R7R Extended Property Ownership Audit**
- Current application version: **3.67.16**
- Current branch: `fix/v3.67.16-r7s`
- GitHub: **the user's GitHub repository was not accessed**
- Development rule: Theme supplies visual values; Core Theme renderers own standard-component paint; Core Structure owns geometry; plugins own domain layout/content rather than Core chrome.

## Why R7S exists

R7P–R7R moved Shell commands, activity/project tabs, status actions, portable/header actions, scientific floating chrome, generic field density and PortableView placement away from source-order-dependent CSS. R7S continues the same audit for the remaining high-risk standard-component families where multiple Structure selectors could still compete for final geometry or where Theme feature CSS could become a second Core paint owner.

The target is **not** “no CSS cascade”. Light/dark state, hover/active state and responsive state still need controlled value changes. The target is: **one final property owner per standard component property, with contexts feeding bounded CSS custom-property slots instead of re-declaring the final property.**

## Completed in R7S

### 1. Settings / dialog field density ownership

Files:
- `src/styles/structure/schema-and-plugin-ui.css`
- `src/styles/structure/workbench-components.css`

Changes:
- Generic field selectors now explicitly exclude `.dkds-settings-field` and `.dkds-dialog-field` descendants.
- Settings fields expose and consume:
  - `--dkds-settings-field-height`
  - `--dkds-settings-field-padding-block`
  - `--dkds-settings-field-padding-inline`
- Dialog fields expose and consume:
  - `--dkds-dialog-field-height`
  - `--dkds-dialog-field-padding-block`
  - `--dkds-dialog-field-padding-inline`
- Specialized settings/dialog fields no longer simultaneously inherit a competing generic input/select density owner.

### 2. Managed-table density ownership

File:
- `src/styles/structure/workbench-components.css`

Changes:
- `.dkds-managed-table` owns table density slots for font size, header/cell padding and resizer geometry.
- Compact table density changes the slots only; it no longer rewrites final `td/th` padding.
- Table header/body cells remain the single final padding owners.
- Column resizer hit width and seam width are slot-driven.

### 3. Scientific legend density ownership

Files:
- `src/styles/structure/workbench-components.css`
- `src/styles/structure/sdk-semantic-surfaces.css`

Changes:
- `.dkds-scientific-auto-legend` owns final legend gap/padding.
- Plot legend specialization and top/bottom placement now modify `--dkds-legend-*` slots instead of directly redefining `padding`/`gap`.
- Row/item height and item padding are slot-driven.

### 4. Collapsed PortableView header ownership

Files:
- `src/styles/structure/super-top-contract.css`
- `src/styles/structure/analysis-workbench.css`
- `src/styles/structure/workbench-components.css`

Changes:
- PortableView owns `--dkds-portable-header-height` and `--dkds-analysis-prime-head-min-height`.
- Collapsed state changes those parent slots rather than directly rewriting descendant header `min-height`.
- The historical collapsed-header direct override in `workbench-components.css` was removed.

### 5. Splitter / resizer geometry is state-invariant

Files:
- `src/styles/structure/analysis-workbench.css`
- `src/styles/structure/plugin-workspace.css`
- `src/styles/structure/workbench-components.css`

Changes:
- AnalysisWorkbench splitters use explicit track/seam slots.
- Plugin canvas splitters/resizers use explicit track/seam/hit-size slots.
- Hover / focus / dragging no longer move or widen/narrow the structural seam or hit target.
- Interaction state is therefore paint-only rather than geometry-changing.
- Removed the old bottom-resizer hover/focus/drag pseudo-element rule that changed top/height.

This is important for both visual consistency and pointer feel: a separator no longer changes its physical hit geometry while the pointer is already interacting with it.

### 6. Theme standard-component paint ownership gate

File:
- `scripts/validate-styles.js`

New rule:
- Theme CSS may provide feature UI and visual values, but selectors targeting Core `data-dkds-component-identity` cannot become a second final paint owner.
- For standard Core component identities, final Theme paint selectors are restricted to:
  - `component-appearance.css`
  - `material-renderer.css`

This converts the intended architecture into a build-time rule: Theme Settings/Gallery/diagnostics cannot accidentally take ownership of Core component paint.

### 7. Style validator expanded

`scripts/validate-styles.js` now rejects regressions including:
- Settings/Dialog specialized field density being overridden outside the canonical owner.
- Managed-table context rules directly rewriting protected density properties.
- Scientific legend contexts directly rewriting final padding/gap instead of slots.
- Collapsed PortableView descendant header rules directly rewriting protected geometry.
- Splitter/resizer hover/focus/drag states changing protected geometry.
- Non-renderer Theme files painting standard Core component identities.

### 8. Style ownership documentation updated

File:
- `docs/STYLE_OWNERSHIP_CONTRACT.md`

The contract now documents the R7S slots and owner rules for:
- settings/dialog fields
- managed tables
- scientific legends
- portable collapsed headers
- analysis/plugin splitters and resizers
- Theme standard-component paint ownership

### 9. Hard Visual Invariants expanded

File:
- `tools/quality/visual-invariants.js`

Hard gate increased from **69 → 75**:
- HARD-70: Settings/Dialog field density ownership
- HARD-71: Managed-table density slots
- HARD-72: Scientific legend density slots
- HARD-73: Collapsed PortableView header slots
- HARD-74: Splitter/resizer state-invariant geometry
- HARD-75: Theme component paint ownership gate

### 10. New R7S regression test

New file:
- `tests/test-v36716-r7s-property-ownership-audit.js`

It is included in both the normal `test` and `check` manifests.

### 11. Historical test governance cleanup

Two historical tests had implementation details frozen too tightly:
- `tests/test-v36172-material-role-ui-coherence.js`
  - now validates the resizer seam slot contract rather than requiring a literal `1px` grid-row implementation.
- `tests/test-v36710-visual-closure.js`
  - now treats 69 hard invariants as the historical lower-bound capability rather than requiring the current count to remain exactly 69 forever.

Also confirmed the earlier R7O regression for **Import persistent halo removal / compact command centering** remains included in both main test chains.

### 12. Version progression

Application version advanced:

**3.67.15 → 3.67.16**

Application-owned version strings were updated. Built-in plugin versions remain independently versioned.

## Validation completed

Code-side gates all pass:

- `npm test`: **232/232 PASS**
- `npm run check`: **240/240 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- `npm run plugin:validate`: **17 plugin packages PASS**
- Hard Visual Invariants: **75/75 PASS**
- `git diff --check`: **PASS**
- `git fsck`: **PASS**

Expected negative-fixture logs from Plugin Manager tests may appear during the test run; those cases intentionally verify activation failure/duplicate-contribution handling and the suite passes.

## Repository hygiene for delivery

The delivery ZIP should retain `.git` and the deterministic generated runtime files needed for the fast development-start path, while excluding:
- `node_modules`
- caches
- temporary screenshots
- browser/test harness artifacts
- obsolete R7 handoff files

Only this R7S handoff should remain at the project root.

## What remains / recommended next work

R7S is **not Final Freeze**. Recommended continuation:

1. Continue a property-ownership audit for any remaining generic global button/input rules that can still overlap Plugin Manager, Settings or dialog action variants.
2. Audit legacy `.floating-panel` / generic panel geometry against the newer PortableView contract and remove obsolete parallel geometry owners where safe.
3. Audit motion ownership (`hover-lift`, press-scale, transforms) so Theme may tune motion values without state selectors being able to alter protected layout geometry.
4. Add/report a computed-style ownership diagnostic that can enumerate the final geometry/paint owner for representative semantic components, making source-order regressions easier to detect before screenshots.
5. Re-run Windows Electron rendered acceptance after this architecture series, especially the historically problematic Import command, compact Presenter commands, status actions, scientific floating chrome, legends/tables, splitters and theme switching.
6. Keep startup and GroupPlot drag performance feedback separate from CSS ownership if Windows still reports perceptible latency; profile the actual runtime path rather than adding style exceptions.

## Continuation rule

Use this R7S clean ZIP as the only source baseline for the next round. Do not roll back to older R7 packages. Do not access the user's GitHub repository. Increment the application patch version for the next testable delivery.
