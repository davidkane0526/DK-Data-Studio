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
Graphene Resonance Studio renderer + plugins
        ↓
shared src/science/* engine
```

This is not a remote-control client. After building, the Android app loads its own packaged assets and can work offline.

## 2. Why a hybrid React Native shell

The mature application has complex D3/Plotly SVG/canvas interaction, multi-panel scientific dashboards and a large tested browser renderer. Rewriting all visual interaction as unrelated native charts would immediately fork the product and scientific behavior.

React Native therefore owns native platform concerns while WebView hosts the shared scientific workspace. Native screens can be introduced progressively later without changing scientific algorithms.

## 3. Current mobile toolchain

`mobile/package.json` targets:
- Expo SDK 57;
- React 19.2.3;
- React Native 0.86.2;
- react-native-webview 13.16.1;
- Expo DocumentPicker / Clipboard / FileSystem / Sharing.

Use Node 22.13+ for SDK 57.

For local Android compilation install:
- JDK 17;
- Android Studio;
- Android SDK Platform 36 / Android 16;
- platform-tools / adb;
- `ANDROID_HOME`.

## 4. Offline asset packaging

Before a native build:

```bash
cd mobile
npm run sync:web
```

The script copies the current `src/` tree and vendor D3/Plotly files into:

```text
mobile/assets/web/
```

During `expo prebuild`, `withGrsWebAssets.js` copies that directory to:

```text
android/app/src/main/assets/grs/
```

React Native WebView opens:

```text
file:///android_asset/grs/index.html?reactNative=1
```

Therefore every Android build snapshots exactly the current plugin renderer/science engine.

## 5. Native I/O bridge

The renderer keeps using the existing `window.electronAPI` abstraction. In a React Native WebView, `web-bridge.js` detects `window.ReactNativeWebView` and delegates native operations through `postMessage`.

Implemented native operations:

### File opening

`expo-document-picker` opens Android's system document UI. Multiple files are supported. Files are copied to cache and passed to the renderer as base64 bytes so the existing encoding selector/decoder still works.

This supports:
- normal data import;
- multiple pulse files;
- project JSON opening.

### Clipboard

`expo-clipboard` handles CSV/text copying.

### Export/save/share

`expo-file-system` writes export data to cache and `expo-sharing` opens the Android system share/save target for:
- CSV;
- project JSON;
- SVG;
- PNG.

## 6. Build an APK on Windows

From repository root, run:

```text
BUILD_ANDROID_DEBUG.cmd
```

It performs:

```text
mobile\npm install       (first build only)
npm run sync:web
expo prebuild --platform android --clean
gradlew assembleDebug
```

Output:

```text
mobile-dist\Graphene-Resonance-Studio-debug.apk
```

Install it with:

```text
INSTALL_ANDROID_APK.cmd
```

or manually:

```bash
adb install -r mobile-dist/Graphene-Resonance-Studio-debug.apk
```

For an attached phone/emulator with live native compilation:

```text
RUN_ANDROID_DEVICE.cmd
```

## 7. EAS APK alternative

`mobile/eas.json` contains a `preview` profile using Android APK/internal distribution.

After installing/logging in to EAS CLI:

```bash
cd mobile
npm install
npm run sync:web
eas build --platform android --profile preview
```

## 8. Touch model

`src/core/platform.js` automatically supplies coarse-pointer/mobile interaction sizes.

On touch devices the current renderer increases:
- button/input targets;
- curve hit width;
- nearest-curve tolerance;
- peak hit radius;
- drag threshold.

Desktop keyboard/mouse shortcuts remain conveniences, not the required mobile path.

Next interaction work should add explicit long-press equivalents for Ctrl/right-click actions and two-finger/pinch handling where WebView/Plotly behavior is insufficient.

## 9. Responsive layout

Profiles:

```text
large / medium / compact
portrait / landscape
fine / coarse pointer
android flag
```

Compact portrait uses a staged vertical layout. Compact landscape gives the graph priority with a narrow control rail. Docked inspector becomes an overlay/drawer instead of permanently consuming plot width.

Plugins should react to `ctx.platform.profile`, not invent their own hard-coded phone breakpoints.

## 10. Performance rules

- calculations always use full raw data;
- downsampling may be used only for rendering;
- do not make an Android-specific numerical algorithm;
- large tables should eventually be virtualized;
- expensive analysis should eventually move to Web Workers;
- hidden Plotly views can be purged/lazy-rendered if phone memory becomes a problem.

## 11. Future native React Native UI

The phase-1 shell is intentionally hybrid. The next native components worth extracting are platform/navigation concerns rather than scientific math:
- native top navigation;
- file/project browser;
- plugin manager;
- settings;
- bottom-sheet/context actions;
- Android share/save UX.

Scientific plots can remain WebView-hosted until a native replacement provides equal interaction fidelity.

## v3.18 Data Center portability

`mobile/scripts/sync-web-assets.js` copies the entire `src/` tree, so Android automatically receives:

```text
GRSData
GRSFormula
GRSParameters
GRSWorkflow
builtin.data-center
```

Do not create Android-specific Formula, Recipe or Data Model implementations.

On compact/coarse-pointer devices the generic schema renderer switches to a single-column parameter layout and expands input touch targets.
