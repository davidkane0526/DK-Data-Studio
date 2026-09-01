# DK Data Studio v3.67.19 — Desktop/Core Archive Baseline Handoff

## Status

**Archive-ready Desktop/Core baseline for Mobile development.**

This baseline is intended to be preserved before beginning the next Mobile phase. It is not a declaration that historical Windows rendered Visual Closure is permanently final; the source/architecture baseline is frozen while rendered UI acceptance remains an independent release concern.

## Current contracts

- App: **3.67.19**
- SDK: **1.24.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- Project Schema: **v3**

The repository contains no newer SDK contract. First-party plugins are on Plugin API 1.19.0 and Theme providers consume Theme Contract 3.10.0.

## Architecture freeze

Keep this chain unchanged during Mobile UI work:

`Core Registry / State -> Core Presentation Model -> DesktopPresenter | MobilePresenter`

`Desktop Mouse/Keyboard | Mobile Gesture -> Interaction Intent -> Core`

Rules:
- no `ctx.ui.desktop` / `ctx.ui.mobile` split;
- no Mobile Host DOM/CSS reverse-reading;
- TOP presentation declarations remain semantic-only;
- Core owns standard components/material/appearance; plugins own domain content/layout;
- do not solve mobile layout problems by reopening Desktop/Core ownership.

## Mobile next step

Before adding substantial Mobile features, split `mobile/src/Shell.tsx` (currently 47,572 B) into types/model, theme palette, header/navigation, sheets, service adapters and styles. Keep behavior and Presenter contracts unchanged during that decomposition.

Do **not** rewrite plugins for Mobile. Reuse the same Core Registry, data/science runtime, Plugin API and semantic Presentation surfaces.

## Validation at archive

- `npm test`: **235/235 PASS**
- `npm run check`: **243/243 PASS** (runner timeout after 118; exact manifest cases 119–243 resumed and all passed)
- Mobile: **12/12 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Renderer: **PASS**
- Plugin Manager: **PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **80/80 PASS**
- authored CSS: **44 / 0 `!important`**

See `docs/DESKTOP_CORE_ARCHIVE_AUDIT_3.67.19.md` for the full audit and Mobile split recommendation.

## R7V included

The baseline includes the final R7V source correction:
- grouped shell hover/active/selected paint uses ToolbarGroup-owned slots;
- Import has no persistent primary fill;
- cold-start Theme snapshot is restored before CSS first paint;
- a pending saved Theme profile snapshot is preserved until its startup-critical Theme plugin registers.

## Continuation

Use the archive ZIP produced from this tree as the only baseline for the Mobile phase. Do not fall back to older R7 packages. Do not access the user's GitHub repository unless explicitly requested later.
