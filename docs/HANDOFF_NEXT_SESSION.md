# Next Session Handoff — v3.21.1

## Repository identity

- Stable baseline branch: `main`
- Stable baseline tag: `v3.14.0-main-baseline`
- Active development branch: `plugin`
- Current delivery: `v3.21.1`
- Product name: **DK Data Studio**
- Installable plugin package extension: **`.dkplugin`**

Continue new product work from `plugin`, not from `main`.

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

`数据中心`, `TER分析`, and `脉冲分析` declare `openMode:'window'`. From the main Electron window they open dedicated BrowserWindows and leave the main Activity on resonance. Their header action is `关闭窗口`, never `返回主图`.

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
- JDK through `JAVA_HOME`, `JDK_HOME`, `STUDIO_JDK`, PATH, Android Studio `jbr`, common JDK vendors, and Windows uninstall/JDK registry metadata.

Java is still physically required because Gradle itself needs a JDK. If no JDK/JBR exists anywhere, the environment check should explain that rather than pretending APK compilation can proceed.

Android metadata: app `0.3.0`, versionCode `4`, package `com.dk.datastudio`.

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
