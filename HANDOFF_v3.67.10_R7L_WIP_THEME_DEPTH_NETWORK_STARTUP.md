# DK Data Studio v3.67.10 — R7L WIP Theme Depth / Network Startup Handoff

## Status

**WIP / 未完成。**

R7L is a clean continuation checkpoint for the R7 rendered-UI/performance closure. Code-side regression suites pass, but Windows Electron visual/startup acceptance is still required before R7 can be declared complete.

This handoff supersedes the R7K handoff in the repository root.

## Baseline and scope

Baseline: `DK-Data-Studio-v3.67.10-WIP-R7K-UI-Startup-Drag-Closure-Clean-Dev-Repo.zip`

R7L addresses the latest Windows feedback:

1. Import must not keep a persistent bright halo in any theme.
2. Aurora dark hover depth must be coherent across segmented topbar command groups.
3. Default dark buttons need slightly clearer depth.
4. Thin Glass dark buttons may use a restrained glow.
5. Re-audit first-start latency, especially Theme startup work, and prevent networking/firewall prompts before the user actually invokes a network feature.

Hard project rules remain unchanged:

- clean ownership; no screenshot-specific plugin patching;
- Core owns shared component behavior and geometry;
- Theme providers own theme-specific tokens/effects;
- SDK/contract rules prevent first-party/third-party plugins from restyling Core-owned integrated chrome;
- no `!important`-based specificity patching;
- do not access the user's GitHub repository.

## R7L changes

### 1. Segmented command depth is now silhouette-owned

File: `src/styles/theme/component-appearance.css`

`dkds-segmented-command-group` is treated as one visual silhouette regardless of semantic hydration timing. Direct and menu-wrapped child ToolbarActions are flattened without depending on `data-dkds-component-context="grouped"` already being present.

Inside a segmented command group, child hover / active / selected states cannot draw independent `box-shadow`.

Result:

- `导入 / 保存 / 导出` remains one visual unit;
- `数据管理 / 工具 / 软件管理` remains one visual unit;
- the Import primary state can keep its fill/identity but no longer carries a persistent independent bright halo;
- hover depth cannot differ merely because one command is direct DOM and another is wrapped by a menu anchor.

### 2. Aurora Pop dark depth normalized

Files:

- `src/plugins/aurora-pop-theme/plugin.js`
- `src/plugins/aurora-pop-theme/plugin.json`
- `src/plugins/aurora-pop-theme/README.md`

Theme version: **2.3.2**.

Changes:

- light toolbar-group depth changed from a conspicuous violet halo to a neutral restrained shell shadow;
- dark ToolbarAction hover/active/selected depth uses coherent low-intensity violet/cyan theme light rather than mixed black/drop and colored glow behavior;
- grouped state depth is normalized even though segmented Core chrome now suppresses child shadows.

### 3. Default dark depth increased slightly

File: `src/core/theme/runtime.js`

Default dark ToolbarAction hover/active/selected states now receive a small cool neutral glow. This is deliberately restrained and does not restore the old hover translation/lift behavior removed in R7K.

### 4. Thin Glass dark receives a restrained cool glow

Files:

- `src/plugins/thin-glass-theme/plugin.js`
- `src/plugins/thin-glass-theme/plugin.json`
- `src/plugins/thin-glass-theme/README.md`

Theme version: **1.12.2**.

Dark ToolbarAction hover/active/selected states now use a very small cool white/blue optical glow. It remains weaker than a selected-card halo and does not make individual buttons inside Core segmented command shells look like separate cards.

### 5. Optional Theme authoring/diagnostic tooling removed from first paint

Files:

- `src/index.html`
- `src/core/host/optional-runtime-loader.js`
- `src/core/plugins/devtools.js`
- `src/core/plugins/manager-ui.js`
- `src/plugins/status-monitor/plugin.js`

The following are no longer eagerly parsed during normal first paint:

- Theme Settings UI;
- Theme Coverage runtime;
- Theme Debug Inspector runtime;
- Theme Gallery/test-gallery runtime.

They are loaded through `DKDSOptionalRuntime.ensureThemeTooling()` only when a Theme tool/inspector/gallery is actually opened. Windows automation/visual closure explicitly loads them before its full-coverage checks, so diagnostics are not weakened.

This does **not** defer the Core Theme renderer/runtime required to paint the selected theme, and it does **not** defer a persisted non-default Theme Provider that is required before first paint. Therefore R7L does not claim that Theme loading was the only source of the observed Windows startup delay; it only removes Theme tooling that was provably unnecessary for first paint.

### 6. Fresh startup no longer binds updater networking

File: `desktop/update-client.js`

Previous behavior:

- desktop startup constructed the update client;
- `start()` immediately restarted networking;
- auto-discovery bound a UDP socket to `0.0.0.0` and joined multicast;
- Windows could therefore show a network/firewall prompt before the user had requested any network action.

R7L behavior:

- fresh state defaults to `networkConsent: false`;
- updater `start()` initializes state only and does not bind UDP/WebSocket when network consent has not been established;
- the first explicit **检查更新** invokes `ensureNetworkActive('manual-check')`, starts networking, and persists consent;
- explicitly configuring an update server is also treated as intentional network use;
- later launches may resume update networking only after this explicit use has been persisted;
- disabling/stopping the updater tears down active networking.

Other network features keep their own opt-in ownership: LAN Web is not auto-enabled on fresh state; SMB/MCP/network-service access occurs when those features are invoked.

## Validation completed

Code-side validation for R7L:

- `npm run visual:gate` — PASS, Hard Visual Invariants **62/62**
- `npm test` — **229/229 PASS**
- `npm run check` — **237/237 PASS**
- `npm run mobile:test` — **12/12 PASS**
- `npm run sdk:harness` — PASS
- `npm run renderer:test` — PASS
- `npm run plugin-manager:test` — PASS
- plugin manifests/packages — **17 PASS**
- authored CSS — **44 files / 0 !important**
- `node --check` for changed runtime/client files — PASS
- `git diff --check` — PASS

Generated runtime artifacts are retained in the delivery ZIP because the fast `npm start` path expects ready generated output and they avoid rebuilding on every launch. `node_modules`, dist output, caches, temporary browser harness files and test screenshots are not delivered.

## Windows Electron acceptance still required

Do not call R7L Final until the Windows Electron build is checked for all of the following:

1. All themes: Import has no independent persistent bright halo; the top-left three-command control reads as one shell.
2. Aurora dark: hover behavior across Import/Save/Export and Data Management/Tools/Software Management is visually coherent.
3. Default dark: activity/navigation buttons have slightly stronger but still restrained depth and do not move vertically.
4. Thin Glass dark: activity/navigation buttons have a subtle optical glow without becoming separate glowing cards.
5. Fresh user/update state: launching DK Data Studio does not produce an updater-triggered Windows firewall/network prompt. The first manual update/network action may legitimately trigger OS network permission UI.
6. Re-measure cold-start/first-paint time. R7L removed optional Theme tooling from first paint, but further profiling may still be needed if the real Windows first paint remains in the 3–4 s range.
7. Re-run `npm run visual:closure:windows` and attach the JSON report if any case fails.

## If R7L still starts slowly

Next investigation should instrument timestamp marks rather than continue speculative CSS/Theme edits. Measure at least:

- Electron main process start;
- `BrowserWindow` creation;
- `did-start-loading` / DOMContentLoaded / first rAF;
- Theme Provider ready;
- Core Presentation Registry ready;
- current SUPER mount ready;
- first scientific renderer construction;
- deferred plugin script load start/end.

The goal is to identify the longest blocking interval on the user's Windows runtime before moving any additional code out of the critical path.

## Current repository state

R7L should be delivered as a clean local Git checkpoint. No user GitHub access is required or permitted for this handoff.
