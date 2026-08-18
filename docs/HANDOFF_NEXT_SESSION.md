# Next Session Handoff — v3.22.1

## Repository identity

- Stable baseline branch: `main`
- Stable baseline tag: `v3.14.0-main-baseline`
- Active development branch: `plugin`
- Current delivery: `v3.22.1`
- Product name: **DK Data Studio**
- Installable plugin package extension: **`.dkplugin`**

Continue new product work from `plugin`, not from `main`.

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

- `window.prewarm` defaults to `true`.
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

Top-level analysis plugins can declare `openMode:'window'`. From the main Electron window they open dedicated BrowserWindows and leave the main Activity on resonance. Their header action is `关闭窗口`, never `返回主图`. The current Data Center, TER and Pulse plugins all use this generic contract.

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
