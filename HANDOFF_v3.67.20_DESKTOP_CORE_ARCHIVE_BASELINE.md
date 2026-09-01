# DK Data Studio v3.67.20 — Desktop/Core Archive Baseline Handoff

## Status

**Archive-ready Desktop/Core baseline for Mobile development.**

This supersedes the v3.67.19 archive candidate.

## Current contracts

- App: **3.67.20**
- SDK: **1.24.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- Project Schema: **v3**

No SDK/Theme public contract changed in this patch.

## Final pre-Mobile correction

The floating scientific plot toolbar drag affordance is now a native `button type="button"` in both Core scientific navigation implementations, with the same canonical `toolbarAction / quiet` identity as zoom-in / zoom-out / home.

This fixes the all-theme hover mismatch caused by the old role-simulated span path. Drag CSS owns only cursor/layout semantics; Theme paint is entirely shared with sibling ToolbarActions.

HARD-81 and the v3.67.20 regression prevent the span-specific path from returning. Windows visual diagnostics also require the drag element to remain a native button.

## Frozen architecture

Keep unchanged during Mobile UI work:

`Core Registry / State -> Core Presentation Model -> DesktopPresenter | MobilePresenter`

`Desktop Mouse/Keyboard | Mobile Gesture -> Interaction Intent -> Core`

Rules:

- no `ctx.ui.desktop` / `ctx.ui.mobile` split;
- no Mobile Host DOM/CSS reverse-reading;
- TOP presentation declarations remain semantic-only;
- Core owns standard components/material/appearance;
- plugins own domain content/layout;
- do not solve Mobile layout issues by reopening Desktop/Core ownership.

## Mobile next step

Before significant Mobile feature work, decompose `mobile/src/Shell.tsx` without changing behavior or Presenter contracts. Keep one shared Core/Plugin API; do not create Mobile copies of plugins.

## Validation

- `npm test`: **236/236 PASS**
- `npm run check`: **244/244 PASS** (continuous runner timed out after case 110; exact manifest 111–244 resumed and all passed)
- Mobile: **12/12 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Renderer: **PASS**
- Plugin Manager: **PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **81/81 PASS**
- authored CSS: **44 / 0 `!important`**

See `docs/DESKTOP_CORE_ARCHIVE_AUDIT_3.67.20.md` for the full archive audit.

## Continuation

Use the v3.67.20 archive ZIP as the only Mobile-development baseline. Do not fall back to older R7 packages. Do not access the user's GitHub repository unless explicitly requested later.
