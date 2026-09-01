# DK Data Studio v3.67.12 — R7O WIP Import Focus / Compact Centering Handoff

STATUS: **WIP / Windows Electron visual acceptance still required**

## Baseline / continuation rule

- Current clean development baseline: **v3.67.12 / R7O**.
- Continue from the R7O ZIP delivered with this handoff. Do not fall back to R7N/R7M/R7L.
- Do not access the user's GitHub repository.
- Every subsequent testable development ZIP should advance the application patch version unless the user explicitly asks otherwise. Plugin versions remain independent.
- Preserve the project rule: Core owns reusable UI semantics/appearance, plugins own domain layout/content only; no screenshot-specific CSS patches or `!important`.

## User feedback that triggered R7O

Windows screenshot from R7N showed two unresolved issues:

1. **参数** still appeared horizontally off-center.
2. **导入** still showed a persistent bright blue halo/shadow even though the user repeatedly requested no persistent idle glow on this segmented primary action.

## Root causes confirmed in source

### 1. Compact Presenter command was genuinely asymmetric

`参数 / 检查 / 组图` use `.dkds-presentation-command[data-dkds-presentation-compact="true"]`.

R7N correctly assigned a 48 px compact hit box and zero padding, but a later rule with the same specificity:

```css
.plugin-context-toolbar .plugin-toolbar-btn.plugin-section-start
```

re-applied `padding-left:11px` after the compact rule. `参数` is also a `plugin-section-start`, so its final content box was left=11 px / right=0 px. The earlier flex centering fix could therefore never visually center the label.

R7O keeps the semantic section margin/separator but explicitly neutralizes one-sided padding for compact presentation commands after that rule. The compact command uses the full 34 px line box with centered text.

### 2. ToolbarAction focus contract misused a shadow token as an outline color

Core had:

```css
outline:2px solid var(--dkui-focus)
```

but `--dkui-focus` is a complete box-shadow value (`0 0 0 ...`), not a CSS color. This declaration is invalid as an `outline-color` source and can leave Chromium's own focus appearance in control.

R7O changes generic ToolbarAction keyboard focus to a valid accent-derived color outline.

For `.dkds-segmented-command-group`, child buttons explicitly own **no focus outline and no focus box-shadow**. Keyboard focus is represented only on the shared group silhouette using `:has(...:focus-visible)`. The `导入` primary child therefore cannot retain its own persistent blue halo.

## Files changed for the fix

- `src/styles/structure/shell-navigation.css`
  - compact Presenter commands use `line-height:34px; text-align:center`
  - compact + `plugin-section-start` explicitly resets left/right padding to 0
- `src/styles/theme/component-appearance.css`
  - correct valid ToolbarAction focus outline
  - segmented child focus has `outline:none; box-shadow:none`
  - shared segmented group owns keyboard focus silhouette
- `tools/quality/visual-invariants.js`
  - Hard Visual Invariants **62 -> 63**
  - HARD-63 protects both Windows regressions
- `tests/test-v36712-r7o-import-focus-compact-centering.js`
  - dedicated regression contract
- `tests/test-v3622-ui-layout-log-theme.js`
  - historical focus test updated to validate the corrected focus contract instead of preserving the invalid token use
- `tests/test-v36711-r7n-shell-command-correction.js`
  - historical R7N gate made patch-forward compatible and updated for the corrected compact line box
- `tests/test-v36710-visual-closure.js`
  - historical closure test recognizes HARD-63
- `tests/manifest.js`
  - adds R7O regression test
- application version sources / README / CHANGELOG updated by the normal patch-version path

## Version

Application version: **3.67.12**

The application patch was advanced from 3.67.11 using the repository's normal `npm run version:patch` flow. Built-in/external plugin versions were not bumped as a side effect.

## Validation completed

Code-side validation after the R7O changes:

- `npm test` -> **230 / 230 PASS**
- `npm run check` -> **237 / 237 PASS**
- `npm run mobile:test` -> **12 / 12 PASS**
- `npm run sdk:harness` -> PASS
- `npm run science:parity` -> PASS
- `npm run renderer:test` -> PASS
- `npm run plugin-manager:test` -> PASS
- Hard Visual Invariants -> **63 / 63 PASS**
- Style architecture -> **44 authored CSS / 0 `!important`**
- Plugin manifests/packages -> **17 PASS**

The intentional negative-path plugin activation messages in the test suite remain expected test output, not failures.

## Windows acceptance still required

R7O remains WIP until the user checks the actual Windows Electron result. Verify specifically:

1. **参数** label is visually centered inside its 48 px button.
2. **导入** has no persistent child blue halo/shadow in idle state across Default / Thin Glass / Aurora.
3. Mouse click must not leave a private Import glow.
4. Keyboard focus may show a restrained focus indication on the **whole segmented group**, not around only Import.
5. Re-run `npm run visual:closure:windows` if possible and attach the new JSON report if any computed-style failure remains.

## Packaging / hygiene

- Current root contains only this R7O handoff; the R7N transient handoff was removed.
- Temporary Chromium probe file was removed.
- No `node_modules` is included in the delivery ZIP.
- `.git` remains in the Dev Repo for clean continuation.
- Do not claim Final Freeze until Windows Electron visual acceptance is confirmed.
