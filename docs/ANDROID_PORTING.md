# React Native Android implementation

## 1. Current implementation

The `plugin` branch now contains an installable Android project source under `mobile/`.

Architecture:

```text
React Native / Expo native shell
        ↓
react-native-webview
        ↓
offline Android asset bundle
        ↓
DK Data Studio renderer + plugins
        ↓
shared src/science/* engine
```

This is not a remote-control client. After building, the Android app loads its own packaged assets and can work offline.

## 2. Why a hybrid React Native shell

The mature application has complex D3 scientific SVG/canvas interaction, multi-panel scientific dashboards and a large tested browser renderer. Rewriting all visual interaction as unrelated native charts would immediately fork the product and scientific behavior.

React Native therefore owns native platform concerns while WebView hosts the shared scientific workspace. Native screens can be introduced progressively later without changing scientific algorithms.

The design follows the useful boundary demonstrated by mature open-source
mobile applications rather than embedding an entire desktop shell unchanged:
Joplin shares its library/renderer packages while mobile owns navigation and
native screens; Mattermost separates durable application state from ephemeral
UI/navigation state; Element X separates presentation state/events from its
navigation nodes. React Native WebView's documented `postMessage` channel is
the platform boundary. References:

- https://github.com/laurent22/joplin/tree/dev/packages/app-mobile
- https://github.com/mattermost/mattermost-mobile/blob/main/CLAUDE.md
- https://github.com/element-hq/element-x-android/blob/develop/docs/_developer_onboarding.md
- https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md

## 2.1 Mobile Host architecture

```text
React Native navigation / Android services
        ↕ dkds.mobile-host.v1 (request, response, state event)
Core Mobile Host Adapter
        ↕ activity + PluginWorkspace contracts
Core plugin registry / project / workflow / scientific renderer
        ↕
first-party plugins + src/science/*
```

React Native sends typed `navigate`, `surface`, `action`, `command`, `panel` and `back`
requests. Every request has an id and receives success/error acknowledgement.
Native code must not inject JavaScript that locates and clicks a desktop DOM
button. Native file/clipboard/share operations remain a separate host-service
channel used by `web-bridge.js`.

Core remains the sole owner of project state, plugin lifecycle, algorithm locks
and scientific results. React Native stores only transient route/sheet/loading
state.

## 2.2 Desktop-to-Android mapping

| Desktop contract | Android presentation |
| --- | --- |
| SUPER/TOP main or dedicated window | one full-screen workspace route; TOP is activated with `presentation: mobile` and never opens an Electron window |
| PRIMARY main region | default graph-first surface |
| PRIMARY left dataset/parameter region | native-triggered drawer; hidden by default so it cannot squeeze the graph |
| PRIME inspector/group/raw/chart preview | keep the plugin/user's inline/left/right/bottom/float placement; portrait converts left/right to side sheets, while landscape restores the requested grid position; every surface remains listed in the native workspace sheet |
| SUB physics/spacing/gate analysis | secondary workspace route with Android back to PRIMARY |
| Data Center system activity | full-screen system workspace route, not a desktop popup |
| project tabs | native project switcher/actions; desktop tab strip is not rendered on the phone |
| plugin `ctx.ui.actions` toolbar actions | projected by Core into the native **操作** sheet; action ids and menu item ids are invoked directly, so TER calculation and plugin-defined SDK actions do not depend on a visible desktop button |
| renderer-owned chart/export menus | touch bottom-sheet presentation inside the shared renderer |

Input mapping:

| Desktop input | Android input |
| --- | --- |
| click | tap |
| right click / Ctrl-click | long press or explicit action sheet command |
| hover | tap focus, pinned tooltip or selected scientific entity |
| wheel zoom/pan | pinch / one-finger pan through the Core interaction profile |
| draggable splitter | predefined drawer/bottom-panel states |
| Escape / window close | Android system back through the Core route stack |

## 3. Current mobile toolchain

`mobile/package.json` targets:
- Expo SDK 57;
- React 19.2.3;
- React Native 0.86.2;
- react-native-webview 13.16.1;
- Expo DocumentPicker / Clipboard / FileSystem / Sharing.

Use Node 22.13+ for SDK 57.

For local Android compilation install:
- JDK 21（DKDS 也兼容可用的 JDK 17+，默认与其他项目共享 JDK 21）;
- Android Studio;
- Android SDK Platform 36 / Android 16;
- platform-tools / adb;
- `ANDROID_HOME`.

`android-build` can provision the pinned Platform 36, Build-Tools 36.0.0, NDK
27.1.12297006 and CMake 3.22.1 through the discovered official `sdkmanager`.
`android-check` remains diagnostic-only. Set
`DKDS_DISABLE_ANDROID_SDK_INSTALL=1` when automatic component installation is
not permitted on a workstation.

## 4. Offline asset packaging and repository hygiene

The supported Windows entry point stages `mobile/` under
`D:\PyDroidTemp\builds\dk-data-studio-work\mobile` (or the configured external
cache root) before running the asset sync and Expo prebuild. The source repository
therefore never receives generated native projects, dependencies, or web bundles.

Inside that disposable build workspace the tool runs:

```bash
cd mobile
npm run sync:web
```

The script snapshots the repository `src/` tree and D3 scientific renderer assets into:

```text
D:\PyDroidTemp\builds\dk-data-studio-work\mobile\assets\web\
```

During `expo prebuild`, `withDkdsWebAssets.js` copies that directory to:

```text
android/app/src/main/assets/dkds/
```

React Native WebView opens:

```text
file:///android_asset/dkds/index.html?reactNative=1
```

Therefore every Android build snapshots exactly the current plugin renderer/science engine.

## 5. Native I/O bridge

The renderer keeps using the existing `window.electronAPI` abstraction. In a React Native WebView, `web-bridge.js` detects `window.ReactNativeWebView` and delegates native operations through `postMessage`.

Implemented native operations:

### File opening

The `DkdsNativeHost` module launches Android Storage Access Framework with `ACTION_OPEN_DOCUMENT`. Multiple files and third-party/cloud document providers are supported. Persistable provider URIs are returned as opaque native handles; bytes are read only when the shared renderer requests a specific file. `expo-document-picker` remains a compatibility fallback and copies its result to cache before an immediate fallback read.

This supports:
- normal data import;
- multiple pulse files;
- project JSON opening.

### Clipboard

`expo-clipboard` handles CSV/text copying.

### Export/save/share

Projects and exports use `ACTION_CREATE_DOCUMENT`; later project saves write the same persistable URI without reopening a picker. If the custom native host is unavailable, `expo-file-system` writes a temporary cache file and `expo-sharing` opens the Android share/save target. The temporary file is removed after sharing for:
- CSV;
- project JSON;
- SVG;
- PNG.

## 6. Build an APK on Windows

From repository root, run:

```text
DKDS.cmd android-build
```

It performs:

```text
stage mobile source under D:\PyDroidTemp
reuse external shared node_modules
run mobile architecture tests and React Native TypeScript checking
create/reuse the persistent local release signing identity
npm run sync:web
expo prebuild --platform android (incremental external native workspace by default)
gradlew assembleRelease --no-daemon --max-workers=4 -PreactNativeArchitectures=arm64-v8a
verify required offline runtime assets and print APK size/SHA-256
```

On Windows, `--no-daemon` alone is not sufficient to prevent a disposable Gradle JVM. If the client JVM does not match `org.gradle.jvmargs`, Gradle creates a single-use daemon. The DKDS toolbox therefore reads the generated `android/gradle.properties`, aligns the client `JAVA_OPTS` with the requested build JVM (including immutable wrapper settings), and sets `org.gradle.daemon=false`. This avoids the nested Java launch that can be blocked by Windows security policy with `CreateProcess error=5`, while preserving the configured proxy and shared `GRADLE_USER_HOME`.

Local signing is stored outside the repository at `%LOCALAPPDATA%\DKDataStudio\android-signing`. Back up that directory if future local APKs must update the same installed app. Migrating from an older differently signed build requires one uninstall/reinstall (`adb uninstall com.dk.datastudio`), which removes the old app data.

The generated `android/` project and its Gradle/CMake/Metro intermediates are retained only in the validated external staging workspace, so ordinary source-only rebuilds are incremental while the repository stays clean. Set `DKDS_ANDROID_CLEAN=1` for one invocation when an Expo/native configuration change requires a cold prebuild; the tool then deletes and recreates only the external staged Android project.

Output:

```text
D:\PyDroidTemp\builds\dk-data-studio\DK-Data-Studio.apk
```

Install it with:

```text
DKDS.cmd android-install
```

or manually:

```bash
adb install -r D:\PyDroidTemp\builds\dk-data-studio\DK-Data-Studio.apk
```

For an attached phone/emulator with live native compilation:

```text
DKDS.cmd android-run
```

## 7. EAS APK alternative

`mobile/eas.json` configures the `production` profile to output an APK. EAS manages its own production signing credentials.

After installing/logging in to EAS CLI:

```bash
cd mobile
npm install
npm run sync:web
eas build --platform android --profile production
```

## 8. Native shell and touch model

React Native owns the compact command shell: project/status header, portrait
bottom navigation, landscape rail, plugin activity sheet, project actions,
Android back handling, app lifecycle and renderer recovery. Plugin activities
are read from the Core registry rather than hard-coded into the native shell.

`src/core/host/platform.js` automatically supplies coarse-pointer/mobile interaction sizes.

On touch devices the current renderer increases:
- button/input targets;
- curve hit width;
- nearest-curve tolerance;
- peak hit radius;
- drag threshold.

Desktop keyboard/mouse shortcuts remain conveniences, not the required mobile path.

Next interaction work should add explicit long-press equivalents for Ctrl/right-click actions and two-finger/pinch handling where WebView/Core scientific interaction is insufficient.

## 9. Responsive layout

Profiles:

```text
large / medium / compact
portrait / landscape
fine / coarse pointer
android flag
```

Compact portrait uses a staged vertical layout. Compact landscape gives the graph priority with a narrow control rail and retains PRIME left/right/bottom grid placement when space permits. Floating PRIME remains floating and is only capped to the device viewport. Pulse analysis cards use a single normal-flow column on portrait so their headers, controls and plots cannot overlap.

Plugins should react to `ctx.platform.profile`, not invent their own hard-coded phone breakpoints.

## 10. Performance rules

- calculations always use full raw data;
- downsampling may be used only for rendering;
- do not make an Android-specific numerical algorithm;
- large tables should eventually be virtualized;
- expensive analysis should eventually move to Web Workers;
- hidden ScientificPlot views can be purged/lazy-rendered if phone memory becomes a problem.

## 11. Progressive native React Native UI

The shell is intentionally hybrid. Platform navigation, project commands,
plugin activity navigation, bottom sheets and Android share/save UX are native.
The next candidates are richer native file/project browsing and settings forms,
not scientific math.

Scientific plots can remain WebView-hosted until a native replacement provides equal interaction fidelity.

## v3.18 Data Center portability

`mobile/scripts/sync-web-assets.js` copies the entire `src/` tree, so Android automatically receives:

```text
DKDSData
DKDSFormula
DKDSParameters
DKDSWorkflow
builtin.data-center
```

Do not create Android-specific Formula, Recipe or Data Model implementations.

On compact/coarse-pointer devices the generic schema renderer switches to a single-column parameter layout and expands input touch targets.

## Runtime plugin installation and SDK mapping

Android is a native host (`isNativeClient`), not a LAN Web client. Plugin Manager can select the same text-only `.dkplugin` generated by the SDK, validate its package paths/API/TOP contract, store it in the app's private IndexedDB store and load it through the same Core plugin kernel. No Android-specific source conversion is performed.

| SDK plugin shape | Android result |
| --- | --- |
| data/importer/algorithm provider with Plugin API 1.x | installs and runs through the shared Data Model/science/algorithm registry |
| standalone workbench using `ctx.ui.pages` | becomes a full-screen native activity route |
| true TOP/tool workbench with matching `workspace.activity` and `window.activity` | the desktop window contract is embedded as an Android full-screen route |
| `ctx.ui.actions` | appears in the native **操作** sheet, including menu items |
| PRIMARY/PRIME/SUB registered through PluginWorkspace | maps to the standard mobile layout and route stack |
| direct Electron/Node import, private DOM button discovery, mouse-only interaction | unsupported by design; the plugin must use Core host/platform/input services |

Executable packages retain the same trust warning as desktop and should only be installed from reviewed sources. Android currently keeps one active package per plugin id and automatically restores the previous in-memory package if an update fails during that installation transaction; the desktop version-history catalog remains desktop-specific.

The Android app includes and starts its own offline renderer, so it does not need a desktop Web server to become usable. It remains a Native Client. When the user explicitly chooses **在浏览器打开网页版**, the native host starts a separate, loopback-only HTTP service on `127.0.0.1` and opens the system browser. The service is never bound to a LAN interface, does not change the app's native-client identity, and can be stopped independently.

## Compact shell details

Portrait presentation uses one compact header row. Core project tabs and `+`
come first, followed by a divider and the active PluginWorkspace
surfaces/actions. Overflow moves into **更多**, while data/parameters stays at
the right edge. Project tabs keep their text-tab appearance instead of being
rendered as navigation icons.

The five icon-only native navigation buttons float directly above the original renderer
status bar. Core/plugin status items remain renderer-owned and clickable.
Compact Resonance and TER summaries are mirrored into the status bar instead
of taking a chart row. **更多** also exposes project-local undo/redo history.

The data/parameter drawer closes on an outside tap and persists touch-resized
width. PRIME left/right/bottom surfaces expose their Core splitters as visible
touch edges. A held upward or leftward swipe emits `ArrowUp` or `ArrowLeft` for
keyboard-oriented plugin workflows.

Android file selection uses Storage Access Framework provider URIs. Device
storage, third-party file managers and registered cloud providers can all be
shown by the system picker. Selected documents remain lazy handles until the
renderer requests bytes; interactive picker commands use a long transaction
timeout so waiting for user selection cannot produce a false Core timeout.
`expo-navigation-bar` restores sticky immersive mode whenever the app becomes
active, hiding the Android gesture/navigation indicator without consuming the
scientific viewport.
