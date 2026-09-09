# DK Data Studio v3.68.66 WIP — Save Cancel Destructive Theme Variant

## Baseline
- Input baseline: v3.68.65 WIP.
- App version: 3.68.66.
- Plugin API: 1.19.0.
- SDK: 1.28.0.
- Theme Contract: 3.10.0.

## This round
The redesigned Save Project dialog already used canonical Theme-filled actions, but its Cancel action was still the ordinary `secondary` variant. The requested visual reference is the red soft-destructive action used by the Resonance range-selection menu (`删除框选峰`).

### Save dialog action mapping
- 保存当前 → `primary`
- 另存为 → `secondary`
- 取消 → **`destructive` + `danger-soft`**

The Cancel action now deliberately consumes the same Core destructive toolbar-action contract as the range-selection destructive affordance. No project-save-specific red/hex/RGBA paint was added: each Theme owns destructive surface, hover, text and border values.

### Regression protection
Updated the active project-save regression coverage to require:
- `#projectSaveCancelBtn` to retain `danger-soft`;
- persistent `data-dkds-component-variant="destructive"`;
- the shared Core destructive action appearance contract to remain available;
- the range-selection delete action to remain the visual-semantic reference.

## Acceptance target
On Desktop, the Save Project dialog's Cancel button should read as the same red soft-destructive family used by the range-selection menu while adapting to Default / Thin Glass / Aurora Pop and light/dark Theme profiles.

## Verification
- Project-save dialog regression: PASS.
- Hard Visual Invariants: 87 PASS.
- Architecture Hygiene: PASS; style collisions=0, semantic owner violations=0, style-gate violations=0, authored `!important`=0.
- Native Analysis strict audit: PASS.
- `npm test` bootstrap/build stages passed and the updated save-dialog regression passed before the environment command window timed out later in the unrelated 325-case suite; no full-suite pass is claimed for this tiny follow-up.

## WIP reason
The semantic/style ownership change is deterministic and tested, but final pixel-level acceptance remains on the user's Windows Electron environment and active Theme profiles.
