# DK Data Studio v3.67.13 — R7P Style Ownership Closure — WIP Handoff

## Status

WIP. Code-side ownership and regression gates pass, but Windows Electron visual acceptance is still required before declaring the R7 visual/performance track final.

## Why R7P exists

The R7O Windows feedback exposed that the compact Presenter command (`参数`) was not really protected by the architecture. A generic semantic modifier (`plugin-section-start`) loaded later in the same Structure layer could re-add one-sided padding. R7O fixed the symptom with a later, more specific counter-rule, which was still source-order dependent.

R7P removes that pattern instead of adding another patch.

## Style ownership model

See `docs/STYLE_OWNERSHIP_CONTRACT.md`.

- **Theme Provider** owns visual values only: surfaces, colors, borders, depth, radii, material recipes, motion and bounded component appearance slots.
- **Core Component Appearance / Material Renderer** owns the final selectors that paint standard Core components from those Theme values.
- **Core Structure** owns geometry only: layout, size, padding, gap, alignment, overflow and hit boxes.
- **Presentation** maps application semantics to shared Core roles/components; it must not create a second private paint implementation for standard Core components.
- **Plugin CSS** owns domain-specific layout/scientific marks, not Core application chrome.

The important rule is **property ownership, not load-order ownership**. Theme is the unique source of Theme values, but Theme plugins intentionally do not own arbitrary DOM selectors or layout geometry.

## R7P implementation

### 1. Shared command content-box geometry is slot based

`src/styles/structure/shell-navigation.css`

`.toolbar-btn` is now the single content-box property owner for shared commands:

- `height: var(--dkds-command-height,34px)`
- `min-height: var(--dkds-command-height,34px)`
- `padding-block: var(--dkds-command-padding-block,5px)`
- `padding-inline: var(--dkds-command-padding-inline,10px)`
- `line-height: var(--dkds-command-line-height,20px)`

Contexts modify bounded slots instead of rewriting those properties.

### 2. Compact Presenter commands no longer need a specificity repair

`参数 / 检查 / 组图` compact commands set:

- `--dkds-command-padding-block: 0px`
- `--dkds-command-padding-inline: 0px`
- `--dkds-command-line-height: 34px`
- exact `48px` width/min/max width

Because the compact values live on the button itself, inherited responsive toolbar padding cannot override them regardless of source order.

### 3. `plugin-section-start` cannot modify the command content box

Visible toolbar and overflow-menu `plugin-section-start` rules now own only external section spacing and separator composition (`margin`, pseudo-element placement). They no longer write `padding-top`, `padding-left`, height or line-height.

This removes the exact class of bug where adding a semantic section marker shifts a compact button label.

### 4. Responsive shell sizing uses slots

Responsive file/system toolbar rules set `--dkds-command-padding-inline` rather than later `padding-left/right` declarations. Segmented groups also set the same bounded command padding slot.

### 5. Release gate now rejects this architecture regression

`scripts/validate-styles.js` now rejects shared toolbar command state/section modifiers that directly rewrite:

- padding / padding-*;
- height / min-height / max-height;
- line-height.

Modifiers such as `plugin-section-start`, active/selected/hover/focus command state must compose via Core slots instead of a later content-box rule.

Hard Visual Invariants advanced to **64** and now document/check the property-level Style Ownership Contract.

### 6. Historical regression tests were updated by capability, not weakened

Older tests that encoded direct `padding-left:11px`, `padding-left/right:9px`, or the R7O compensating selector were updated to assert the new canonical slot behavior and to reject content-box writes from `plugin-section-start`.

The historical visual behavior remains guarded; only the obsolete implementation detail was removed.

## Version

Application version advanced from **3.67.12 → 3.67.13**.

Plugin versions, Plugin API, SDK and Theme Contract remain independently versioned:

- Plugin API: 1.19.0
- SDK: 1.24.0
- Theme Contract: 3.10.0

No plugin version was changed merely because the application patch advanced.

## Validation

Code-side validation after the R7P refactor:

- `npm test`: **230/230 PASS**
- `npm run check`: **237/237 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: PASS
- `npm run science:parity`: PASS
- `npm run renderer:test`: PASS
- `npm run plugin-manager:test`: PASS
- Hard Visual Invariants: **64/64 PASS**
- authored CSS: **44 files / 0 `!important`**
- Plugin manifests/packages: **17 PASS**

Expected negative plugin-manager test errors still appear in logs and are intentional fixtures; the suite itself passes.

## What this does and does not prove

R7P structurally closes the **shared command content-box post-order override class**. It also keeps the existing exact-selector, semantic-selector, paint/geometry and plugin ownership gates.

It does **not** mean CSS stops cascading. Intentional responsive states, Theme modes and interaction states still change values. The release criterion is that those changes flow through an explicit owner/slot, not through competing selectors that rely on which rule is later.

It also does not claim every possible component in the entire product can never expose a new ownership ambiguity. If another standard Core component is found with two semantic owners writing the same property, the correct response is to migrate that component to the same slot/property-owner model and extend the validator, not append a hotfix block.

## Next Windows acceptance

Use this R7P package as the only baseline. Verify especially:

1. `参数 / 检查 / 组图` centering at normal and narrower desktop widths.
2. Topbar command sizing at widths around the 1450px / 1160px responsive thresholds.
3. No visual regression to File/System segmented groups.
4. Existing R7O focus/Import behavior remains intact.
5. Run `npm run visual:closure:windows` and retain the JSON report if any computed-style failure remains.

## Repository policy

No access to the user's GitHub repository was performed. The ZIP is the development handoff source of truth for the next round.
