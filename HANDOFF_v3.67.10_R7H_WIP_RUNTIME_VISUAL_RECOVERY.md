# DK Data Studio v3.67.10 · R7H Runtime / Visual Recovery Handoff

## Status

**WIP / NOT A RELEASE / WINDOWS ELECTRON ACCEPTANCE STILL REQUIRED**

Continue from this exact tree. Do not reconstruct from an older R7 archive. The user's GitHub repository was not accessed.

## Project cleanup performed first

The root previously accumulated duplicate transient handoffs/status files from R7F and R7G. They have been removed and replaced by this single current handoff. Long-lived architecture/freeze documents under `docs/` are retained because they still document contracts referenced by tests and current code; they are not treated as transient handoff files.

The temporary `node_modules/d3` browser-test stub used only to make the container Chromium harness boot without network-installed dependencies has been removed from the deliverable tree. The project ZIP therefore contains source/repo files, not fabricated runtime dependencies.

## R7H fixes

### 1. Empty desktop after stale SUPER preference

Root cause found in `src/core/plugins/kernel/modules/workspace/top.js` and its existing test contract:

- `dkds.workspace.super.v1` was treated as authoritative even when the saved plugin id no longer existed or was no longer TOP-contract-ready.
- The old test explicitly required the app to enter `configured=false`, `activeActivity=null` instead of selecting another valid TOP.
- That behavior can leave the Desktop showing generic PRIME shells / empty canvas after an upgrade or plugin-state change.

R7H changes the rule:

- valid saved SUPER preference still wins;
- stale / missing / disabled / contract-invalid saved SUPER migrates to the current valid default SUPER;
- the migrated id is persisted, so the bad state does not return on the next start;
- current default selection remains domain-neutral and follows `workspace.defaultSuper`, order and id sorting.

The regression test now requires recovery to a usable embedded workspace rather than preserving an intentionally blank shell.

### 2. Dark disabled toolbar text was double-dimmed

`ToolbarAction:disabled` used Theme `disabledText` and then multiplied the whole control by `opacity:.56`. Aurora and Core Dark already supply a subdued disabled color, so this second attenuation made disabled top/context commands almost disappear.

R7H removes the second opacity attenuation. Theme providers continue to own the actual disabled color.

### 3. Grouped-action ownership correction

The earlier R7G generalization treated any `Component Context=grouped` action as if a visible parent command shell existed. That is not true for status bars and activity clusters, where grouping can be layout/semantic only.

Current rule:

- `.file-command-group` and `.dkds-integrated-action-group` may flatten their direct ToolbarAction children because those containers own the one visible command silhouette;
- generic grouped context alone does not erase a child action's border/depth;
- status/activity/scientific semantic grouping remains available without forcing a visual shell contract.

### 4. R7 performance work retained

The R7F changes remain:

- Theme/Semantic cold-start duplicate full-document assignment reduction;
- idempotent semantic/material metadata writes;
- requestAnimationFrame-batched Component Appearance work;
- SplitController pointer preview rather than per-event persistence;
- final size persistence / authoritative resize only on release;
- GroupPlot ResizeObserver suppression during split preview.

## Validation in this tree

- Hard Visual Invariants: **61/61 PASS**
- `npm test`: **226/226 PASS**
- `npm run check`: **234/234 PASS**
- Style architecture: **44 authored CSS / 0 `!important`**
- Plugin manifests/packages: **17 PASS**
- SUPER/TOP regression specifically verifies stale preference migration.

Expected negative-path activation logs in plugin-manager/SUPER tests are fixtures, not suite failures.

## Remaining acceptance / next work

1. Run this exact tree on Windows Electron with existing user state, specifically without manually clearing localStorage, and verify cold start now restores the Resonance SUPER instead of the empty shell shown in the latest screenshot.
2. Recheck Thin Glass range-selection popover against the accepted older visual: compact one-layer menu, rounded controls, clear destructive red depth.
3. Recheck scientific legend controls for heavy/double borders in real Electron rendering.
4. Recheck Aurora Pop dark/light topbar, disabled commands, presenter commands, statusbar and scientific controls for contrast and consistent component state.
5. Re-measure perceived cold start and GroupPlot height dragging in Electron. Static/source gates are not sufficient acceptance evidence.
6. Continue removing visual regressions at the actual Core semantic owner. Do not add Resonance/TER/Pulse page patches for shared visual behavior.

## Continuation rule

Engineering priority remains: **clean structure, no patch-style screenshot fixes, explicit Core/plugin ownership, actual rendered acceptance before calling R7 final.**
