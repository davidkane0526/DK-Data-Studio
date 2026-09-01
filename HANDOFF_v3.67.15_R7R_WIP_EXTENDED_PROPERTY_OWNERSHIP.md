# DK Data Studio v3.67.15 — R7R Extended Property Ownership Audit — WIP Handoff

## Status

**WIP / not Final Freeze.**

R7R continues the R7P/R7Q property-level style ownership cleanup. Code-side architecture and regression gates pass, but Windows Electron rendered acceptance is still required before this line can be called visually closed.

Do **not** access the user's GitHub repository. Continue from this ZIP/local repository only unless the user explicitly changes that instruction.

## Baseline and contracts

- Baseline: **v3.67.14 / R7Q Property Ownership Audit**
- Current application version: **3.67.15**
- Plugin API: **1.19.0**
- SDK: **1.24.0**
- Theme Contract: **3.10.0**
- Platform Presentation Contract remains frozen: one Core semantic model, Desktop/Mobile presenters, no Desktop geometry in plugin presentation contracts.

## Architecture rule being enforced

R7R continues the property-owner model established in R7P:

1. **Theme Provider owns visual values.**
2. **Core Component Appearance / Material Renderer owns final standard-component paint selectors.**
3. **Core Structure owns final geometry.**
4. Context/state/responsive rules may feed bounded custom-property slots, but must not silently re-own the same final geometry property later in source order.
5. Plugin CSS owns domain layout/content, not Core standard chrome geometry/paint.

The target is not “no CSS cascade”. Theme mode, hover/active state and responsive changes still use controlled cascade. The forbidden case is multiple semantic owners competing for the same final property and relying on source order/specificity to decide the result.

## R7R completed work

### 1. Portable / header action hit geometry

Canonical file: `src/styles/structure/desktop-chrome-geometry.css`

- Shared integrated/header actions now have one final hit-height owner:
  - `height: var(--dkds-header-action-height, 26px)`
  - `min-height: var(--dkds-header-action-height, 26px)`
- Close, placement, history and plot-action subtypes feed `--dkds-header-action-height` instead of rewriting the final `height/min-height` properties.
- Removed the older late close-geometry repair path that depended on source order after generic header rules.
- Existing width/content requirements remain subtype-owned where they are genuinely different (e.g. square close icon vs text placement action).

### 2. Scientific floating navigation geometry

Canonical Structure owner: `src/styles/structure/sdk-semantic-surfaces.css`

- Scientific floating navigation defines bounded slots:
  - `--dkds-scientific-nav-item-width`
  - `--dkds-scientific-nav-item-height`
  - maps its height into the shared `--dkds-header-action-height` contract.
- The duplicate 24/25 px navigation geometry in `workbench-components.css` was removed.
- Drag handle and navigation buttons now consume one scientific chrome geometry contract instead of two Structure modules competing for dimensions.
- Historical tests that asserted direct literal 26/24 px declarations were migrated to capability/slot assertions; old CSS was not restored merely to satisfy tests.

### 3. Shared Field density ownership

Files:

- `src/styles/structure/sdk-semantic-surfaces.css`
- `src/styles/structure/schema-and-plugin-ui.css`
- `src/styles/structure/analysis-workbench.css`

Changes:

- `dkds-field-control` has one semantic density owner using `--dkds-field-control-*` slots.
- Schema fields use their own `--dkds-schema-field-*` density slots.
- AnalysisWorkbench generic fields use `--dkds-workbench-field-*` slots.
- Global `input/select/textarea` baseline explicitly excludes these semantic owners, preventing two density systems from matching the same control.
- Pointer-coarse/touch mode changes bounded density slot values instead of introducing a later final `min-height/padding` owner.

### 4. PortableView floating / docked / sticky placement ownership

Canonical Structure owner: `src/styles/structure/super-top-contract.css`

- `.dkds-portable-view.is-floating`
- `.dkds-portable-view.is-docked`
- `.dkds-portable-view.is-sticky`

now own the final placement properties through `--dkds-portable-*` slots, including the relevant position/size/overflow/z-index/flex/resize contract.

Context files no longer directly re-own those final properties:

- `analysis-workbench.css`
- `plugin-workspace.css`
- `workbench-components.css`
- sticky-disabled/collapsed contexts in semantic surfaces

These contexts now feed bounded placement slots only.

This removes the previous pattern where a PortableView could match the base placement owner plus a workbench/dock/collapsed rule that later rewrote width, height, overflow or z-index.

### 5. Build-time ownership gates

`scripts/validate-styles.js` now rejects new regressions in these categories:

- Header-action subtypes directly re-owning `height/min-height`.
- Scientific floating navigation geometry being re-owned outside the canonical semantic Structure module.
- `dkds-field-control` density being re-owned outside its canonical owner.
- PortableView floating/docked/sticky contexts directly re-owning protected placement properties outside `super-top-contract.css`.

Hard Visual Invariants advanced to **69/69** with:

- HARD-67: portable/header action + scientific floating navigation ownership.
- HARD-68: shared field-density ownership.
- HARD-69: PortableView placement ownership.

### 6. Regression-test governance cleanup

- Added `tests/test-v36715-r7r-extended-property-ownership.js`.
- Updated historical Scientific Navigation / Desktop Chrome tests so they verify the current slot/property-owner contract rather than requiring obsolete literal declarations.
- Confirmed the R7O `导入` focus-halo / compact Presenter centering regression remains in the formal test/check chain; current R7R passes it.

## Validation completed

Current clean source validation:

- `npm test`: **231/231 PASS**
- `npm run check`: **239/239 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- Hard Visual Invariants: **69/69 PASS**
- Style architecture: **44 authored CSS files / 0 `!important`**
- Plugin manifests/packages: **17 PASS**
- `git diff --check`: **PASS** before checkpoint commit

Expected negative-fixture error logs from Plugin Manager/Super Workspace tests are intentional; their test suites pass.

## What R7R does NOT claim

R7R does **not** claim Windows visual completion. The user must still validate real Electron rendered results. In particular, do not infer UI correctness solely from the static gates.

The user has repeatedly observed cases where a valid source rule was still visually wrong because another final owner or computed-style path won. Continue to use Windows Electron screenshots/Automation computed styles as final evidence.

## Recommended next ownership audit

Continue the same property-owner method, not screenshot patches. Highest-value remaining candidates:

1. Dialog/settings field variants and any residual generic `button/input/select` baseline overlap.
2. Table/legend density and row/action hit-box ownership.
3. Collapsed header/action states and any remaining longhand-vs-shorthand geometry rewrites.
4. Floating/docked panel resize handles and splitter geometry where state/context rules can still compete.
5. Audit Theme paint consumers for the analogous rule: Theme Provider owns values, while one Core renderer owns each final paint property; do not let Theme-specific selectors become layout owners.

If a new screenshot regression is found, first identify the final computed property and its semantic owner. Fix the owner/slot contract and add a validator/regression gate. Do not add a later higher-specificity repair selector.

## Project hygiene

- Root should contain only this current R7R handoff, not older R7P/R7Q transient handoffs.
- `.git` is retained in the development ZIP.
- `node_modules`, build caches, temporary screenshots and temporary browser harnesses must not be included.
- Generated runtime/plugin-index/SDK authoring artifacts produced by the validated source may remain because the fast development-start path uses them and they are deterministic/rebuildable.

