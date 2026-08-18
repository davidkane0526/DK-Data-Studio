# Changelog
## 3.23.0 continuation — toolbar outline alignment / LAN icon polish

- Replaced the LAN Web minimize em dash with a compact 11 × 2 px drawn glyph while retaining the existing 32 × 30 px click target.
- Matched the outer height and corner radius of `编辑操作`, `导出数据`, and `软件管理` to the outlined group containing `导入数据 / 读取项目 / 保存项目`.
- Extended static UI regression checks for both shell contracts.

## 3.23.0 continuation — shell layering / control-size polish

- Raised the LAN Web management surface above SUPER/TOP workspace splitters so the adjustable SUPER divider can no longer draw through the floating panel at particular saved divider positions.
- Normalized the LAN Web minimize and close controls to the same 32 × 30 px hit area, with matching hover geometry and a restrained destructive hover state for close.
- Matched the `编辑操作` command width to the adjacent import/open/save commands instead of inheriting the wider generic dropdown minimum.
- Added static UI regression checks for these shell-level contracts.

## 3.23.0 continuation — unified status bar / Save As / LAN status

- Added a global bottom status bar that remains outside the active SUPER/TOP workspace. Plugins can contribute ordered left/right status items through `ctx.ui.statusBar.add(...)`, including clickable icons, labels and state styling.
- Added built-in `builtin.status-monitor`, showing runtime type, live memory usage and LAN Web status. The LAN status item restores the LAN Web panel when clicked on desktop.
- LAN Web management can now be minimized to the status bar without stopping the server; status changes are emitted through the plugin event bus.
- Project Save now asks `保存当前 / 另存为 / 取消` without adding another toolbar button. Desktop Save As always selects a new destination and then makes it the current project path.
- Web and desktop still serialize the same complete project JSON. Web uses a retained File System Access handle for true overwrite where the browser permits it; ordinary LAN HTTP pages fall back to downloading the same project JSON because browsers cannot silently overwrite an arbitrary client file.
- Added runtime-memory bridge support and `scripts/test-statusbar-project-save.js` regression coverage.

## 3.23.0 — SUPER / TOP / PRIME / SUB workspace contract
- 新增通用 PRIME placement manager：`right / bottom / float`、adapter/portable 两种模式、当前 SUPER 作用域与本机 placement 记忆。

- Added an explicit, single SUPER main-workspace selection persisted as a local UI preference. Invalid/unavailable saved SUPER selections no longer fall back to the next plugin.
- TOP is now a real plugin contract: only enabled/active TOP plugins with complete left/main workspace regions can be promoted to SUPER. The current SUPER cannot be disabled or uninstalled until another TOP is selected.
- Added generic `split` / `native` TOP layout contracts with semantic `root`, `left`, `main` and `flatten` regions. Core SUPER composition no longer contains Data Center / TER / Pulse activity-name CSS whitelists.
- Added PRIME (`float/right/bottom`) and SUB registries so optional dockable tools and self-owned pages are distinct from required TOP workspace regions.
- Non-SUPER TOP plugins use the same manifest-driven independent-window prewarm/hide/reuse lifecycle; resonance uses compatibility mode when it is not SUPER. The active SUPER is excluded from background prewarming.
- Added an adjustable SUPER left/main divider with per-machine width persistence.
- Plugin Manager TOP icons now act as explicit SUPER selectors and expose TOP contract / PRIME / SUB diagnostics.
- Removed the selected-workspace blue bottom underline and normalized top command controls to a 34 px height.
- Added `scripts/test-super-workspace.js` regression coverage.

## 3.22.2 — plugin-manager viewport lifecycle hotfix

- Fixed the plugin manager scroll viewport becoming truncated after disabling, re-enabling, or reloading plugins.
- Analysis pages now bind their height to the live visual viewport and the measured topbar + project-tab stack instead of relying on a stale fixed geometry.
- Plugin lifecycle, plugin-manager rerender, window resize, and visual-viewport resize all trigger a two-frame layout resync after DOM/style contributions settle.
- Hardened `.analysis-page-body` as a zero-basis flex scroll region so list/card growth cannot shrink the usable scroll viewport.
- Added a regression check for the analysis-page viewport contract.

## 3.22.0 UI refinement (local development snapshot)

- Replaced the multi-curve brand mark with a compact single-resonance spike and regenerated Windows/Android icon assets.
- Unified Windows app identity (`DK Data Studio`, executable name and AppUserModelID).
- Clarified top-level plugin navigation versus contextual secondary commands with responsive density modes.
- Standardized the desktop/plugin typography scale and refined borders, shadows, radii, states, cards and tables.


## 3.22.0 — shared Windows toolchain + compact application identity

- Added a compact DK Data Studio app mark and wired it into Electron windows, Windows packaging, the desktop header and Expo Android icons.
- Added cross-project `DK_TOOL_ROOT` / `DK_CACHE_ROOT` discovery. On this workstation `D:\Code` is auto-detected when `D:\Code\NodeJs` exists.
- Node, JDK, Android SDK, npm cache, pnpm store, Electron cache, electron-builder cache and Gradle cache can now be reused by DKDS and PyDroid instead of being downloaded per project.
- Automatic JDK fallback now provisions shared Eclipse Temurin JDK 21 under `DK_TOOL_ROOT\Java\temurin-21\current`.
- Added `DKDS.cmd toolchain` and a GUI card that reports every shared tool/cache location.
- Android metadata advanced to `0.4.0` / versionCode `6`.

## 3.21.2 — managed Android JDK + strict environment gating

- Fixed `Check-AndroidEnvironment` returning a truthy array when diagnostic native-command stdout (for example `node --version`) leaked into the PowerShell pipeline; failed checks now stop the build reliably.
- Added automatic per-user Eclipse Temurin JDK 17 provisioning from the official Adoptium stable binary API when no complete JDK is installed.
- Managed JDK downloads are SHA-256 verified and stored outside the repository under `%LOCALAPPDATA%\DKDataStudio\toolchains\temurin-17\current`.
- Existing `JAVA_HOME` / PATH / Android Studio JBR installations still take priority over the managed JDK.
- Android release signing now calls the resolved JDK `keytool` directly. Installing an already-built APK no longer requires Java.
- Android app metadata advanced to `0.3.1` / versionCode `5`.

## 3.21.1 — Windows Android environment hotfix

- Fixed `android-check` crashing under Windows PowerShell 5.1 because `$home` collided case-insensitively with the read-only automatic variable `$HOME`.
- Reworked Java/JDK discovery to use non-reserved variable names and a pipeline-clean candidate array.
- Prevented Java discovery from leaking collection-operation return values into the function result.
- Added regression guards against writing to PowerShell read-only/automatic variables in Windows tooling.

## 3.21.0 — DK Data Studio UI / plugin surfaces / auxiliary windows

- Renamed the application to **DK Data Studio** and standardized installable plugin packages on `.dkplugin`.
- Enlarged and regrouped the desktop command shell; resonance Activity and resonance-specific commands now share one visual group.
- Added plugin-owned `ui.selectionMenus` for box-selection actions and moved the final hard-coded main-view reset action into the resonance plugin.
- Persisted group-chart columns as a machine UI preference so opening/importing projects cannot reset the layout to one chart per row.
- Import command now opens the workbench only; the native file picker opens only from the explicit “导入文件” action.
- Data Center, TER and Pulse Activities now default to separate Electron BrowserWindows and synchronize their project snapshot on close.
- Android release build auto-discovers the SDK/adb and Android Studio JBR/JDK from environment, standard locations and Windows install metadata.
- Release APK remains `mobile-dist/DK-Data-Studio.apk`; Android metadata is `0.3.0`, versionCode `4`, package `com.dk.datastudio`.
- Added v3.21 regression checks for the plugin-owned selection menu, auxiliary windows, persisted layout, explicit import picker and Android environment discovery.

## plugin branch — 3.20.0-plugin.3

- Android toolbox now builds the release variant with `assembleRelease` and a dedicated persistent local release signing identity.
- Final Android artifact is normalized to `mobile-dist/DK-Data-Studio.apk`.
- Connected-device runs use Expo's `--variant release`, and the direct mobile npm workflow matches it.
- EAS production output is now APK instead of app bundle.
- Android app version advanced to `0.2.1` / versionCode `3` for clean replacement installs.
- Windows tooling regression tests now guard the release-only APK workflow.

## plugin branch — 3.20.0-plugin.2

- fixed Windows PowerShell command argument forwarding so `npm install`, `npm start`, checks, tests, builds, Android and update actions receive their arguments correctly;
- replaced fragile WinForms absolute-coordinate construction with a responsive card layout compatible with Windows PowerShell 5.1;
- added explicit dependency repair and desktop-tooling diagnostics actions to both CLI and GUI;
- added Windows-tooling regression checks to `npm run check` and `npm test`;
- kept the PowerShell sources UTF-8 with BOM so Chinese UI text is decoded correctly by Windows PowerShell 5.1.

## plugin branch — 3.19.0-plugin.1

- introduced Activity + context-toolbar shell with automatic overflow;
- moved resonance sidebar/range menu/physics/gate/spacing UI ownership into `builtin.resonance-workbench`;
- made the central main view, inspector and group subplot system provider-driven;
- extracted mature robust resonance peak finding into independent `builtin.resonance-detector-robust`;
- added detector-owned parameter UI, presets and evidence-marker metadata;
- removed permanent manual-operation instructions and main-plot shortcut hint;
- moved TER and Pulse page markup/event bindings out of core HTML into their plugins;
- added Plugin Workspace/UI API v1.2 and strict architecture-boundary checks.
- added semantic context-toolbar groups and priority-aware overflow so plugin growth does not create a single long command strip;
- added trusted desktop `.dkplugin` install/update/uninstall support with rollback on failed plugin updates;
- added an installable external resonance-detector SDK example and package documentation.

## plugin branch — 3.18.0-plugin.1

- standard Data Model + Artifact Store + Provenance;
- Processor / Analyzer / Chart / Recipe Plugin API v1.1;
- Workflow / Recipe execution engine;
- schema-driven parameter forms;
- safe Formula / Derived Column engine;
- built-in Data Center customization workspace.

## plugin branch — 3.17.0-plugin.1

- added core Plugin Manager UI;
- added persistent enable/disable/reload lifecycle;
- added activation-error retry and partial-activation rollback;
- preserved disabled plugin project state across save/load;
- added plugin diagnostics copy and restore-default actions;
- added touch/responsive Plugin Manager layout;
- added dedicated plugin-manager lifecycle regression tests.

## plugin branch — 3.16.0-plugin.1

- rewrote the mature numerical/scientific engine into `src/science/*` modules;
- reduced `src/analysis.js` to a compatibility facade;
- moved smart cross-Vg peak identity, physical-family classification and gate-analysis mathematics out of the UI controller;
- added parity tests that compare rewritten workflows against the preserved `main` v3.14 implementation;
- added an Expo SDK 57 / React Native 0.86.2 Android shell;
- added offline Android asset packaging of the same plugin renderer/science engine;
- added native Android document picking, clipboard, CSV/JSON/SVG/PNG save/share bridge;
- added Windows debug APK build/install scripts and EAS APK profile.

## plugin branch — 3.15.0-plugin.1

- initialized Git history with preserved v3.14 `main`;
- created `plugin` branch;
- added Plugin API v1;
- added generated built-in plugin discovery;
- added flexible-import, resonance-workbench, TER, and pulse built-in plugins;
- migrated pulse workspace persistence to plugin project slices with v3.14 migration;
- routed flexible importer through plugin registry;
- moved domain toolbar entry points to plugin contributions;
- added runtime platform/touch profile;
- added compact/medium/large responsive foundations;
- added AI plugin-development and Android porting documentation.

## plugin branch — 3.20.0-plugin.1

- collapsed the two-row desktop command shell into one adaptive command row;
- retained Activity and plugin-action priority overflow instead of wrapping;
- normalized UI typography/control density using semantic CSS tokens;
- consolidated Windows CMD workflows into `DKDS.cmd` and `DKDS_GUI.cmd`;
- added the WinForms developer toolbox and one PowerShell task backend;
- moved LAN update service under `services/update-server/` and update defaults under `config/`;
- organized practical guides/releases under `docs/`;
- added project-structure, development and next-session handoff documentation.
