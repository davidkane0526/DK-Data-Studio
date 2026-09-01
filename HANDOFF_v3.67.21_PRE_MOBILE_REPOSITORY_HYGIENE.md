# DK Data Studio v3.67.21 — Pre-Mobile Repository Hygiene Handoff

## Status

**Clean pre-Mobile development baseline candidate.**

This checkpoint starts from the archived **v3.67.20 Desktop/Core baseline** and does not reopen Desktop/Core architecture. It removes reproducible delivery weight and closes the fresh-checkout Mobile generation gap before Mobile UI work begins.

## Source baseline

- Previous archive baseline: **v3.67.20 / commit 398882b**
- Current application version: **3.67.21**
- SDK: **1.24.0**
- Plugin API: **1.19.0**
- Theme Contract: **3.10.0**
- GitHub was not modified in this checkpoint.

## Changes

1. Clean-project packaging no longer carries deterministic generated runtime/plugin/SDK-authoring bundles or generated desktop/mobile PNG copies.
2. Mobile WebView asset synchronization now regenerates Core runtime compositions before copying `src/`, making a fresh clean checkout self-contained.
3. The canonical source brand PNG was losslessly recompressed with identical pixels.
4. Direct desktop and mobile dependencies were audited. **No active direct dependency is safely removable**, so none was deleted only for size reduction.
5. Added a v3.67.21 regression guard for the audited minimal dependency sets and clean-source generation contract.
6. Removed the superseded root v3.67.20 handoff; this file is the only active root handoff.

## Important packaging rule

A clean development ZIP should keep `.git` but omit reproducible products:

- `src/generated/`
- `assets/dkds-icon.png`
- `mobile/assets/icon.png`
- `mobile/assets/adaptive-icon.png`
- `mobile/assets/web/`
- `node_modules`, `mobile/node_modules`
- native build directories, caches, dist outputs and test artifacts

`npm start`, test/check, dist, and Mobile sync recreate what they need.

## Next Mobile phase

Use this baseline and keep Desktop/Core frozen. The first Mobile task should remain a no-behavior-change modular split of `mobile/src/Shell.tsx` before additional UI capability is added. Mobile Presenter / Gesture Adapter / native shell work should consume the existing Core semantic contracts rather than creating a parallel Plugin API.

## Full audit

See `docs/PRE_MOBILE_REPOSITORY_HYGIENE_3.67.21.md` for dependency ownership, generated-artifact policy, regeneration path, size rationale and validation details.
