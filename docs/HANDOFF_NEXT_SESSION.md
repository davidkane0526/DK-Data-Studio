
# Next Session Handoff — v3.32.0

## Repository identity

- Local working branch: `main`
- This archive contains reconstructed local Git history only; no remote repository is required or assumed.
- Current delivery: `v3.32.0`
- v3.32.0: replaces resize feedback with frame-coalesced Core scheduling; adds plugin-registered typed data/result definitions plus compact typed Interaction/Selection state; separates Sticky from Dock; restores TER R–V sticky inspection and mature Resonance main/trend/inspector/group linkage while reducing selection-time Plotly rerenders.
- v3.31.2: fixed the Resonance shared feature-runtime bootstrap (`clone` and the other runtime helpers are now explicit module dependencies); repaired the Core ContextMenu capture bug that removed menus before item clicks, which restores TER layout and per-chart placement commands; explicit TER grid layouts are now authoritative and portable placements synchronously notify AnalysisWorkbench regions.
- v3.31.1: repaired the Windows dependency/build pipeline: shared node_modules is now an immutable package-signature cache, npm no longer reifies through a project Junction, Electron binary installation is separated from npm package extraction, and official-source network failures can retry through a configurable mirror.
- v3.31.0: completed AnalysisWorkbench v4 outer-geometry ownership, one PRIMARY/PRIME/SUB view tree across SUPER/TOP, Capability Runtime v2 query/require/watch semantics, and the shared Resonance runtime composition.
- v3.30.0: unified Core Analysis Workbench with PRIMARY / PRIME / SUB semantics, managed responsive grids and lifecycle-owned dock/floating regions; cross-renderer Capability Runtime; TER/Pulse/Data Center migration to the shared workbench; Resonance TOP migration to the same semantic workbench and provider catalog.
- Cache/toolchain fix in v3.27.1: `cachePathMode=derived` makes the selected shared cache root authoritative; npm/pnpm/Electron/electron-builder/Gradle bindings and stale node_modules Junction rebinding are verified by tooling tests.
- Product name: **DK Data Studio**
- Installable plugin package extension: **`.dkplugin`**

Continue from the checked-out local `main` in this archive unless the user explicitly requests a new branch. Do not access a remote repository without permission.

## v3.32 architecture baseline

- Plugin API: **1.7.0**. UI infrastructure: **5.0.0**. Capability Runtime remains **2.x**.
- `src/core/ui-infrastructure.js` owns AnalysisWorkbench, PRIMARY/PRIME/SUB composition, portable/pinnable/sticky views, managed grids, split sizing, frame-coalesced resize scheduling, shortcuts, context menus, chart lifecycle, plugin-owned data-type registration and typed Interaction/Selection runtime.
- Selection state is intentionally schema-light: plugins register domain types with `ctx.data.types.register(...)`; types may inherit from multiple generic parents such as `data.sweep`, `data.point` and `result.analysis`. Large domain objects should project to compact `id/ref/value` selections rather than copying raw arrays into interaction state.
- `src/core/capability-runtime.js` is the generic provider catalog. Dedicated TOP renderers import a serializable snapshot and invoke remote-safe provider methods through the main process. Do not load a second full `app.js` to obtain providers.
- Complex plugins should keep `plugin.js`, `super-layout.js` and `window-runtime.js` thin. Scientific state belongs in Controller; reusable presentation belongs in Shared Views; event/render behavior belongs in Feature Runtime.
- TER: PRIMARY = TER matrix/max analysis; PRIME = linked R–V inspector. Grid columns are Core-owned.
- Pulse: PRIMARY = file/protocol/result analysis; PRIME = raw waveform diagnostic.
- Data Center: PRIMARY = artifacts/formula/workflow; PRIME = chart preview.
- Resonance: PRIMARY = 共振分析; PRIME = 曲线检查 / 组图分析; SUB = 物理机制 / 峰间距 / 栅压分析. Detector providers must come from the shared detector/capability registry, not a TOP-only hard-coded list.
- Project format stays self-contained and backward compatible. Never remove embedded source `text` or parsed `points` merely to reduce runtime memory.
- Regression guards: `test-analysis-workbench-architecture.js`, `test-top-plugin-architecture.js`, `test-resonance-shared-architecture.js`, `test-project-format.js`.


## v3.27 current continuation: plugin-neutral UI infrastructure

- `src/plugins/resonance-workbench/plugin.js` is intentionally a thin dispatcher. Do not move domain UI back into it.
- `workbench-shared.js` is the canonical plugin-owned Controller layer shared by SUPER and dedicated TOP. It owns the six-view catalog, workspace normalization, controller facade, trend/group ViewModel and peak-spacing ViewModel. `view-components.js` is the shared View layer and owns reusable feature descriptors/templates plus TOP composition.
- `super-layout.js` is the SUPER presentation/layout adapter. `window-runtime.js` is the dedicated TOP runtime adapter. Both must consume the shared Controller/View layers instead of implementing a second schema, analytical ViewModel, or mature spacing/gate feature template.
- Built-in plugin manifests can now declare ordered `scripts`; the generated plugin index and plugin kernel load those scripts in order. This is generic infrastructure and must remain plugin-name agnostic.
- Resonance main scripts are `workbench-shared.js → view-components.js → super-layout.js → plugin.js`; dedicated TOP loads both shared Controller and View layers through `window.scripts` before `window-runtime.js`.
- Project serialization remains unchanged/self-contained. Do not trade project portability for runtime memory savings.
- Regression guard: `node scripts/test-resonance-shared-architecture.js` plus the existing SUPER/TOP and plugin-window tests.

## v3.25 current continuation: stable Plugin Manager + full dedicated Resonance TOP

- Plugin Manager lifecycle events now always rerender with a top reset and `settleManagerAtTop()` clamps the real `.analysis-page-body` scroll container for multiple animation frames. This is intentional: plugin enable/disable/reload can rebuild contribution DOM after the first layout frame, so a single `scrollTop=0` is insufficient on Chromium.
- Resonance remains `mode: dedicated`. Do not reintroduce the old compatibility renderer. The dedicated UI now owns six functional views: main, curve inspection, group analysis, physics, peak spacing and gate analysis.
- `src/plugins/resonance-workbench/window-runtime.js` is the independent runtime. Keep TOP functionality in parity with the major SUPER analysis domains; shared science modules should be reused instead of loading `src/app.js`.
- Project portability remains non-negotiable: saved projects continue embedding raw text plus parsed points and plugin state so another machine can work without source data files.
- Regression guards: `node scripts/test-plugin-manager.js`, `node scripts/test-analysis-page-viewport.js`, `node scripts/test-plugin-windows.js`.

## v3.24 current continuation: memory, dedicated resonance, portable projects

- Built-in independent TOP windows explicitly default `window.prewarm` to `false`. Plugin Manager exposes a persisted per-plugin prewarm override through `DKDSPlugins.manager.setPrewarm(...)`. Generic third-party manifests that omit the field still inherit the host default.
- Resonance TOP is now dedicated and uses `src/plugins/resonance-workbench/window-runtime.js`; do not return it to compatibility/full-`app.js` mode. Its project state is stored under `plugins["builtin.resonance-workbench"].workspace`, with legacy root fields kept/restored for compatibility.
- `src/core/project-format.js` is the shared desktop/web project parser/serializer. Do not remove embedded dataset `text` or `points`: project portability without source files is a required contract.
- TER v2.1 adopts Python-reference grid/tolerance semantics and linked R–V/layout/export enhancements from the provided Graphene Resonance Studio, while keeping DKDS plugin architecture. Regression guard: `node scripts/test-ter-python-reference.js`.
- Plugin lifecycle changes deliberately top-align Plugin Manager after enable/disable/reload. `.analysis-page` fills via fixed `top` + `bottom`, not a stale calculated height.
- Regression guards: `node scripts/test-project-format.js`, `node scripts/test-plugin-manager.js`, `node scripts/test-plugin-windows.js`, `node scripts/test-analysis-page-viewport.js`.

## Current continuation: global status bar / project Save As / LAN Web state

- The shell now owns one fixed global bottom status bar. Do not put plugin status text back inside `.main-area`; use `ctx.ui.statusBar.add(...)` for optional plugin contributions.
- `builtin.status-monitor` registers runtime type, live memory use and LAN Web state on the right side. Clicking the LAN item on desktop restores the LAN Web panel.
- Hiding/minimizing the LAN Web panel is UI-only and does **not** stop the LAN server or discovery services.
- Project Save always presents `保存当前 / 另存为 / 取消`. Desktop `saveAs` forces the native Save dialog; subsequent Save-current operations use the newly selected path.
- Desktop and Web serialize the same `makeProject()` payload. A secure browser with File System Access can retain a writable file handle and overwrite it. A normal `http://LAN_IP:PORT` browser page cannot silently overwrite arbitrary client files, so it falls back to a same-name JSON download. Do not claim this browser sandbox limitation can be removed by renderer code.
- Regression guard: `node scripts/test-statusbar-project-save.js`.

## v3.23 SUPER/TOP workspace architecture

- SUPER is a single explicit local main-interface selection; never restore “pick the next TOP” fallback behavior.
- TOP plugins register `ctx.ui.topWorkspace` with semantic LEFT/MAIN regions. Core composition must stay plugin-name agnostic.
- PRIME and SUB are distinct optional UI contribution classes.
- Non-SUPER TOPs remain independent windows; the active SUPER is never prewarmed as a duplicate window.
- Current SUPER cannot be disabled/uninstalled until another valid TOP is selected.
- Full contract: `docs/SUPER_TOP_WORKSPACE_CONTRACT_CN.md`.
- Regression guard: `node scripts/test-super-workspace.js`.

## v3.22.2 plugin-manager viewport hotfix

- Main-window analysis pages now derive their usable height from the current visual viewport and the measured bottom edge of the topbar/project-tab stack.
- Plugin enable/disable/reload and plugin-manager rerender schedule a two-frame viewport resync so CSS/DOM contribution changes cannot leave a stale shortened scroll area.
- `.analysis-page-body` is a zero-basis flex scroll region (`flex:1 1 0%; min-height:0; height:0`) to prevent long card/list content from shrinking the viewport.
- Dedicated plugin analysis pages fill the usable window with top/bottom constraints and are not coupled to stale main-window shell heights.
- Regression guard: `node scripts/test-analysis-page-viewport.js` runs in both `npm test` and `npm run check`.

## v3.22 local UI / identity refinement

This delivery is a **complete project snapshot**, not a patch. It intentionally preserves the v3.22 prewarm/window-cache/Windows-tooling work already present in the working tree.

- Brand: `assets/dkds-mark.svg` and `scripts/generate-brand-assets.js` now use one narrow resonance spike with a single apex marker. `npm run brand:assets` regenerates Windows PNG/ICO plus Android icon/adaptive-icon; the ICO contains 16/32/48/64/128/256 px entries.
- Windows identity: keep `productName = DK Data Studio`, `appId = com.dk.datastudio`, `win.executableName = DK Data Studio`, `app.setName(APP_NAME)` and Windows `app.setAppUserModelId(APP_ID)` aligned.
- Navigation hierarchy: `resonance`, `data-center`, `ter`, and `pulse` are first-level plugin activities. Commands belonging to the active plugin are second-level contextual actions. `builtin.shell-navigation` applies `roomy / balanced / compact` density according to available header width and lets the existing overflow logic move secondary actions to “更多功能”.
- Typography: the shared scale is defined in the final `v3.22 unified typography + light visual polish` block in `src/style.css`; dedicated plugin windows inherit it through `src/plugin-window/style.css`. Avoid plugin-local 8–9 px body text unless it is genuinely tertiary metadata.
- Visual system: use lighter borders, restrained shadows, consistent 7–10 px radii, 30–34 px control heights, visible focus states and subdued selected/hover surfaces.

Regression guard: `node scripts/test-ui-polish.js` is included in both `npm test` and `npm run check`.

### Dedicated-window lifecycle is generic

The current working tree no longer uses a `Data Center / TER / Pulse` window whitelist. Every enabled built-in or installed `.dkplugin` that declares `manifest.window` and registers an `openMode:'window'` activity participates in the same lifecycle.

- Generic manifests that omit `window.prewarm` default to `true`, but DKDS built-in TOP plugins explicitly ship with `prewarm:false`; the user preference in Plugin Manager is authoritative.
- `window.reuse` defaults to `true`; normal close hides the renderer and reopening reuses its DOM/Plotly/in-memory state.
- `window.persistence` defaults to `project`. Restart-safe results belong in `ctx.project.registerSlice(...)` and/or the artifact store.
- Dedicated snapshots merge only the owning plugin namespace plus artifact deltas, preventing stale prewarmed windows from overwriting each other.
- `window.scripts` allows plugin-local support code without adding private modules to the host dependency list; installed `.dkplugin` window runtime/scripts/styles use the same dedicated renderer.
- External plugin updates carry a package revision so a cached old renderer is destroyed instead of reusing stale code.
- `openMode:'window'` defaults to first-level navigation unless `primary:false` is explicit.

`TER` now uses the same namespaced project-slice cache contract as Pulse and Data Center, while still migrating older root-level TER fields.

Do not reintroduce activity-name lists in `src/app.js`, `main.js`, or `src/plugins/shell-navigation/plugin.js`. `scripts/test-plugin-windows.js` includes a synthetic future-plugin regression test.

## v3.21 user-visible behavior

### Main shell

The desktop header is a single, larger adaptive row. The primary resonance Activity and resonance-owned commands are one visual group; auxiliary Activities remain separate. Do not shrink controls back to the v3.20 compact scale unless a real small-screen breakpoint requires it.

```text
DK Data Studio | Import/Project | Edit | [Resonance + resonance commands] | Auxiliary Activities | Export | Manage
```

### Plugin-owned plot interaction

- Box geometry remains core canvas infrastructure.
- Visible box-selection commands are supplied by the active plugin through `ui.selectionMenus`.
- Main-plot action buttons are supplied by `ui.mainTools`; even “适应视图” is resonance-plugin owned.
- Do not reintroduce resonance-specific menu markup into `src/index.html`.

### Group chart layout

`dkds.ui.trendColumns.v1` is a local UI preference. Its fallback is 3 columns. Opening a project, importing data, creating a project tab or switching tabs must not overwrite that preference from project data.

### Import behavior

`导入数据` opens the import workbench only. The OS file picker must open only when the user explicitly presses `导入文件`.

### Auxiliary analysis windows

Top-level analysis plugins can declare `openMode:'window'`. In v3.23, every **non-SUPER TOP** opens an independent BrowserWindow while the explicitly selected SUPER remains embedded in the main window. Their header action is `关闭窗口`, never `返回主图`. Resonance can also use this lifecycle through `mode:'compatibility'` when it is not SUPER.

The auxiliary renderer receives the current project snapshot and sends the updated project snapshot back on close. If the corresponding project tab is inactive, the snapshot is stored and applied when that tab is activated.

## Android release APK

Android remains release-only from user-facing tooling:

```text
DKDS.cmd android-check
DKDS.cmd android-build
DKDS.cmd android-install
DKDS.cmd android-run
```

Final APK:

```text
mobile-dist\DK-Data-Studio.apk
```

Local signing identity:

```text
%LOCALAPPDATA%\DKDataStudio\android-signing
```

`tools/windows/dkds-tools.ps1` now auto-discovers:

- Android SDK through `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and standard `%LOCALAPPDATA%\Android\Sdk`;
- `adb.exe` from SDK `platform-tools` even when it is not on `PATH`;
- JDK through `JAVA_HOME`, `JDK_HOME`, `STUDIO_JDK`, PATH, Android Studio `jbr`, common JDK vendors, and Windows uninstall/JDK registry metadata;
- both DKDS and PyDroid now prefer the shared `DK_TOOL_ROOT` / `DK_CACHE_ROOT`; on this workstation `D:\Code` is auto-detected from `D:\Code\NodeJs`.
- if no complete JDK is present, DKDS downloads and SHA-256 verifies shared Eclipse Temurin JDK 21 under `DK_TOOL_ROOT\Java\temurin-21\current`, so later projects can reuse it.
- Electron/electron-builder/Gradle remain project-versioned; only their large binary/download caches are shared under `DK_CACHE_ROOT`.

`Invoke-Step` must remain pipeline-clean (`| Out-Host`) so diagnostic command output cannot turn a `$false` environment result into a truthy PowerShell array. `android-install` does not require Java and must not download a JDK.

Android metadata: app `0.4.0`, versionCode `6`, package `com.dk.datastudio`.

## Windows toolbox rules inherited from v3.20

Root launchers remain only:

```text
DKDS.cmd
DKDS_GUI.cmd
```

Backend: `tools/windows/dkds-tools.ps1`
GUI: `tools/windows/dkds-gui.ps1`

Do not use PowerShell automatic `$Args` as a formal parameter. Keep the scripts UTF-8 with BOM for Windows PowerShell 5.1. Keep the responsive Flow/Table WinForms layout.

## Architecture status

Core remains plugin-first. Shared scientific logic stays in `src/science/` and is shared by Electron/Web/Android. Mature resonance UI is plugin-native: Activity, sidebar, main view, main tools, selection menu, detector providers, inspector, group charts, pages/panels and exports.

## Before coding in a new session

Read in this order:

1. `AGENTS.md`
2. `docs/HANDOFF_NEXT_SESSION.md`
3. `docs/ARCHITECTURE.md`
4. `docs/PROJECT_STRUCTURE.md`
5. `docs/DEVELOPMENT_GUIDE.md`
6. `docs/PLUGIN_API.md` and `docs/WORKSPACE_PLUGIN_API.md` for UI/plugin changes

Then run:

```bat
DKDS.cmd check
DKDS.cmd test
```

Both commands must pass before delivery.

## v3.30 architecture baseline

- Core `AnalysisWorkbench` is the required composition layer for first-party analysis plugins. PRIMARY / PRIME / SUB semantics are explicit.
- `Capability Runtime` bridges serializable plugin providers into dedicated TOP windows through main/preload IPC.
- TER, Pulse and Data Center shared views mount PRIMARY through the unified workbench; their high-frequency auxiliary views are PRIME.
- Resonance TOP uses PRIME for curve inspection/group analysis and SUB for physics/spacing/gate analysis; its detector registry comes from capabilities.
- Do not reintroduce plugin-owned docking/split/window managers or `existing:true` Workbench composition for these plugins.
- Project files remain self-contained; UI layout persistence is separate from scientific project data.
