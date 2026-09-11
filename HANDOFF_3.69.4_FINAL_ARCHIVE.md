# DK Data Studio 3.69.4 — Final Archive Handoff

## Status

**FINAL ARCHIVE**. Phase A–E are complete. Phase E remains formally frozen at **3.69.0**; 3.69.1–3.69.4 are bounded post-freeze maintenance and do not reopen the interoperability contract.

The project owner has confirmed on the real Android device that Resonance **FWHM / 峰高 A / 峰面积 S** populate correctly in 3.69.4. The final device acceptance gate is therefore closed.

## What 3.69.4 closes

3.69.4 removes the last Android-only scientific Worker URL-loading boundary. Core composes canonical science preludes, plugin task imports/entry and the Core runner into one self-contained Worker blob. The Worker no longer performs nested `importScripts(blob:...)` or `file:///android_asset/...` imports. The bounded Core Task Runner, 3.69.2 metric batching, 3.69.3 stable metric identity/epoch isolation and fail-fast dispatch cleanup remain in force. The scientific FWHM algorithm itself is unchanged.

## Archive architecture state

- Core/plugin ownership: frozen and domain-neutral.
- Historical project compatibility: only `src/project-importers/compatibility-gateway.js`.
- Plugin API: one current runtime contract, **1.19.0**.
- SDK: **1.47.0**.
- Theme Contract: **3.10.0**.
- Phase E Interaction: Selection / Viewport / Legend remain isolated by project + channel + link group + transaction metadata on the existing bridge.
- Stable identity: retained through sorting/filtering/display sampling.
- Lifecycle: warm-hide suspends transport; unload/cold-release teardown remains deterministic.
- Linked-view memory: bridge listeners/reference counts/history remain bounded.
- Scientific execution: heavy first-party work stays in the bounded Core Task Runner; no plugin-private Worker pool or main-thread heavy fallback.
- CSS: single-owner semantic architecture, zero authored `!important`.

## Source archive policy

The final ZIP is a clean source continuation point. It excludes Git history, dependencies, generated native projects and reproducible generated runtime/index/authoring products. Required generated outputs are recreated by supported `npm`/DKDS build commands.

Exactly one current root handoff is retained: this file.

## Final validation

Final archive-pass validation completed on the exact 3.69.4 archive source:

- `npm test`: **374 / 374 PASS**.
- `npm run check`: **381 / 381 PASS**.
- `npm run mobile:test`: **100 / 100 PASS**.
- clean-source Mobile bootstrap after `npm run clean:generated`: **100 / 100 PASS**.
- `npm run performance:test`: **PASS**.
- `npm run sdk:test`: **PASS**.
- `npm run sdk:harness`: **PASS**.
- `npm run science:parity`: **PASS**.
- Hard Visual Invariants: **87 PASS**.
- Architecture Hygiene: **PASS**.
- Native Analysis strict audit: **PASS**.
- Plugin manifests/packages: **17 / 17 PASS**.
- authored renderer CSS: **45 files / 0 `!important`**.

After validation, `npm run clean:generated` removed the reproducible generated products again. Final archive hygiene confirms exactly one root `HANDOFF_*.md`, no `.git`, no `node_modules`, no generated Android/iOS project, no `mobile/assets/web`, and zero files under `src/generated/`. The longest relative file path is 65 characters, keeping the project root/archive name short for Windows continuation.

## Continue from here

Use **3.69.4** as the long-term baseline. New capability work should start an explicit **3.70.x** plan. Do not add new Phase E channels or compatibility paths to the 3.69.x archive line without an explicit reopen decision.
