# DK Data Studio v3.67.20 — Desktop/Core Archive Audit

## Archive decision

**ARCHIVE-READY as the Desktop/Core baseline for the Mobile phase.**

v3.67.20 supersedes the v3.67.19 archive candidate because it closes one final Core scientific-chrome inconsistency found during Windows review: the floating plot toolbar drag affordance was implemented as a role-simulated `span`, while sibling zoom/home actions were native buttons. Even though both declared the same Theme identity, the different native element path allowed hover rendering to diverge.

This archive decision freezes source hierarchy, ownership contracts, SDK boundary and the cross-platform Presentation architecture. Historical Windows rendered Visual Closure remains an independent release acceptance concern.

## Current public contract baseline

- Application: **3.67.20**
- SDK: **1.24.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- Project Schema: **v3**

No public SDK/Theme contract was changed by v3.67.20. The repository contains no newer SDK contract than 1.24.0 / Plugin API 1.19.0 / Theme Contract 3.10.0.

## Architecture status

### Core / Plugin boundary

The current split remains coherent:

- Core owns data/state contracts, scientific runtimes/rendering, Theme/material/component appearance, shared UI semantics and platform Presentation.
- Plugins own domain behavior/content/layout and consume public Core contracts.
- Plugin Boundary remains **0**.
- Core domain-specific visual ownership remains prohibited.
- authored CSS remains **44 files / 0 `!important`**.

### Platform Presentation boundary

Frozen path:

`Core Registry / State -> Core Presentation Model -> DesktopPresenter | MobilePresenter`

Input path:

`Desktop Mouse/Keyboard Adapter | Mobile Gesture Adapter -> Interaction Intent -> Core`

Still true:

- no `ctx.ui.desktop` / `ctx.ui.mobile` Plugin API fork;
- Mobile Host does not reverse-read Desktop DOM/CSS state;
- TOP declarations remain semantic rather than Desktop-coordinate contracts;
- PRIMARY / PRIME / SUB remain semantic Presentation surfaces.

## v3.67.20 final scientific floating-chrome correction

### Root cause

Scientific plot navigation had two independent creation paths:

- `src/core/ui/modules/scientific-curve/navigation.js`
- `src/core/scientific/chart-runtime.js`

In both, zoom/home actions were native `<button>` elements, while the drag affordance used:

`<span role="button" tabindex="0">`

Both carried `toolbarAction / quiet`, but the drag span could miss native-button/integrated-child behavior owned elsewhere in Core. This created the all-theme hover discrepancy reported in the Windows UI.

### Correction

Both navigation paths now construct the drag affordance as:

`<button type="button" class="dkds-scientific-nav-drag">`

It keeps exactly the same:

- `data-dkds-component-identity="toolbarAction"`
- `data-dkds-component-variant="quiet"`
- drag pointer capture
- double-click reset
- Home/Escape reset
- 25 × 24 px geometry
- fused zero-radius / zero-child-shadow composition

`.dkds-scientific-nav-drag` Theme CSS remains semantic-only: display/cursor. It does not own background, border, shadow or text color, so all Theme paint comes from the same ToolbarAction path as zoom/home siblings.

### Regression protection

Hard Visual Invariants increased **80 -> 81**.

HARD-81 requires:

- drag affordance is a native button in both scientific navigation implementations;
- the historical span path cannot return;
- drag semantics CSS cannot independently paint background/border/shadow/color;
- Windows visual diagnostics require `drag.tagName === 'BUTTON'`.

New regression:

- `tests/test-v36720-r7w-scientific-drag-hover-parity.js`

A headless Chromium computed-style fixture using the real Core CSS plus Aurora-dark action tokens confirmed drag/zoom hover parity for background, border, shadow, text color, radius and **25 × 24 px** geometry.

## Module / repository hierarchy

Structural and repository gates remain green. No new layering or ownership path was introduced by this patch.

The main Mobile-phase caution is unchanged: `mobile/src/Shell.tsx` is near the 48 KiB authored-module ceiling and should be decomposed before major Mobile feature work. Do this as a behavior-preserving Mobile implementation refactor without reopening the Core Presentation contract.

Recommended split remains:

```text
mobile/src/
  model/
    shell-types.ts
    presentation.ts
  theme/
    palette.ts
  components/
    NativeHeader.tsx
    SurfaceNavigation.tsx
    StatusBar.tsx
  sheets/
    ProjectsSheet.tsx
    ActivitiesSheet.tsx
    ActionsSheet.tsx
    HistorySheet.tsx
    MoreSheet.tsx
  services/
    native-web-service.ts
  styles/
    shell-styles.ts
  Shell.tsx
```

## Validation

Completed on v3.67.20 source:

- `npm test`: **236/236 PASS**
- `npm run check`: **244/244 PASS**
  - continuous runner reached the environment time limit after case 110;
  - exact same manifest cases 111–244 were resumed in order;
  - no case was skipped and all passed.
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- Plugin manifests/packages: **17 PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **81/81 PASS**
- authored CSS: **44 files / 0 `!important`**
- `git diff --check`: **PASS**
- `git fsck`: **PASS**

## Archive rule

Treat **v3.67.20** as the Desktop/Core archive baseline for the Mobile phase. The v3.67.19 archive candidate is superseded.

Mobile layout/gesture/native-shell work should remain in Mobile Presenter / React Native / Gesture Adapter / Native Service Adapter layers unless a genuinely missing cross-platform semantic capability is demonstrated.
