# DK Data Studio v3.67.19 — Desktop/Core Archive Audit

## Archive decision

**ARCHIVE-READY as the Desktop/Core development baseline for the next Mobile phase.**

This is not a claim that every Windows visual detail is a final product release. Historical Desktop Visual Closure documentation remains explicitly reopened for rendered Windows acceptance. The archive decision means the current source hierarchy, ownership contracts, public SDK boundary and cross-platform Presentation architecture are coherent enough to freeze as the source baseline while Mobile development proceeds on top of them.

## Public contract baseline

- Application: **3.67.19**
- SDK: **1.24.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- Project Schema: **v3**

`sdk/contract.json`, `sdk/README.md`, `README_CN.md`, `docs/BRANCHING.md` and the SDK tests agree on this baseline. No newer SDK contract exists in this repository. All first-party plugin manifests use Plugin API 1.19.0; built-in Theme providers target Theme Contract 3.10.0.

## Architecture audit

### 1. Core / plugin boundary

The current source keeps business-domain work in first-party plugins while Core owns infrastructure, shared state, data contracts, scientific rendering/runtime, UI semantic contracts, component appearance and platform presentation.

Existing gates confirm:
- Plugin Boundary = 0.
- Core domain-specific visual ownership remains rejected.
- Plugin visual CSS is limited to domain layout/content rather than Core chrome.
- Generic controls do not silently reclaim specialized Core control ownership.

### 2. Platform Presentation boundary

The v3.67 architecture remains intact:

`Core Registry / State -> Core Presentation Model -> DesktopPresenter | MobilePresenter`

Input remains:

`Desktop Mouse/Keyboard Adapter | Mobile Gesture Adapter -> Interaction Intent -> Core`

Key frozen properties:
- Presentation roles come from one Core contract.
- Platform-neutral TOP declarations do not carry Desktop placement metadata.
- Mobile Host consumes Presenter/Core Registry state instead of reading Desktop DOM/CSS state.
- No `ctx.ui.desktop` / `ctx.ui.mobile` Plugin API fork exists.
- PRIMARY is one semantic main surface; PRIME/SUB are explicit semantic surfaces.

### 3. CSS ownership

`src/core.css` has explicit cascade layers:

- foundation
- plugin
- structure
- presentation
- theme
- platform
- window
- utility

Current authored CSS validation:
- **44 authored CSS files**
- **0 `!important`**
- layered ownership active
- Hard Visual Invariants: **80/80 PASS**

`src/mobile.css` is no longer a monolithic mobile override sheet. It contains only two platform-owned imports: native shell geometry and Presenter-driven native workspace presentation.

### 4. Module hierarchy / size

Repository/module architecture gates pass: importable module graphs, generated-runtime boundaries, local mutable-state ownership and <=48 KiB authored module policy remain active.

Largest relevant authored files at this checkpoint:
- `src/styles/theme/component-appearance.css`: **48,428 B**
- `mobile/src/Shell.tsx`: **47,572 B**
- `src/plugins/ter-analysis/feature-runtime.js`: **47,412 B**
- `src/plugins/resonance-workbench/feature-runtime.js`: **47,048 B**
- `src/plugin-window/runtime.js`: **46,684 B**

These remain under the 48 KiB architecture ceiling, but two are now close enough that future growth should not continue in-place without decomposition.

## Important Mobile-phase recommendation

The Desktop/Core baseline should now be frozen. The first Mobile implementation task should be **modularizing `mobile/src/Shell.tsx` before adding significant new features**.

`Shell.tsx` is currently 47,572 B and already mixes:
- Presenter state types
- theme/palette projection
- header/navigation
- project/history/actions sheets
- native service controls
- responsive layout
- React Native styles

Recommended split, without changing the Core contract:

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

This should be a **Mobile Presenter/React Native implementation cleanup only**. Do not reopen Core Presentation Model or create platform-specific Plugin APIs unless a genuinely missing cross-platform semantic capability is demonstrated.

`component-appearance.css` is also close to the size ceiling, but it still represents one coherent Core appearance owner. It should not be split merely for line count during the Mobile phase because careless source splitting can reintroduce cascade/source-order ownership. Split it only by stable component families if it needs material new growth.

## R7V final correction included before archive

The archive contains the corrected R7V implementation:
- persistent segmented shell groups share ToolbarGroup-owned hover/active/selected slots;
- Import has no persistent primary fill;
- Theme boot snapshot restores the saved profile before authored CSS first paint;
- when a saved built-in Theme plugin is startup-critical but not registered yet, Core preserves the matching boot snapshot instead of immediately overwriting it with `builtin.default`.

A v3.67.19 regression test protects the bootstrap and segmented-hover contracts.

## Validation

Completed on the archive source:

- `npm test`: **235/235 PASS**
- `npm run check`: **243/243 PASS**
  - the environment timed out during the first continuous runner after case 118;
  - cases 119–243 were resumed from the exact same manifest in order;
  - no case was skipped and all remaining cases passed.
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- Plugin manifests/packages: **17 PASS**
- Plugin Boundary: **0**
- Hard Visual Invariants: **80/80 PASS**
- authored CSS: **44 files / 0 `!important`**

A full Expo TypeScript typecheck was not executed because `mobile/node_modules` is intentionally absent from the clean repository. Running the host-global `tsc` without Expo/React Native dependencies is not a valid typecheck and reports missing package/base-config errors. The Mobile architecture/runtime test suite is green; the next Mobile development environment should install the `mobile/package.json` dependencies and run `npm run typecheck` before feature work.

## Repository hygiene

For the archive package:
- retain `.git`;
- retain deterministic source/generated development artifacts expected by current workflows;
- exclude `node_modules`, mobile `android/ios`, caches, temporary screenshots/harness artifacts and previous root WIP handoffs;
- keep this audit under `docs/` and one current root handoff only.

## Freeze rule for next phase

Treat v3.67.19 as the **Desktop/Core archive baseline**. Mobile work may modify the Mobile Presenter implementation, gesture adapters, native shell and native service adapters. It should not modify the frozen Core/Plugin/Theme/Presentation contracts merely to solve mobile layout issues.
