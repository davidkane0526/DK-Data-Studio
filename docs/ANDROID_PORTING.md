# Android / Touch / Responsive Porting Plan

## 1. Important platform fact

Electron is the desktop shell for Windows/macOS/Linux. Android should not be implemented by attempting to package Electron itself.

The renderer is already web technology and the application already has a LAN/browser mode. The intended mobile path is therefore:

```text
shared web renderer + shared plugin analysis
                ↓
         platform adapter
        /                \
Electron desktop      Android shell
                     (Capacitor/WebView)
```

Capacitor is a suitable future shell because it is designed to place web-first applications in Android/iOS native containers while exposing native functionality through plugins.

## 2. What must stay portable

Plugins should contain:
- pure JavaScript analysis;
- DOM/Plotly/D3 UI;
- plugin state;
- no direct Node `fs`;
- no direct Electron import.

Native/runtime operations go through a bridge.

Current bridges:
- Electron: `preload.js`
- browser/LAN: `src/web-bridge.js`
- future Android: `src/platform/android-bridge.js` or Capacitor services

The desired API surface is conceptual:

```text
files.open()
files.readText()
files.save()
clipboard.write()
project.open()
project.save()
share()
permissions()
```

Plugins should not care which runtime implements those operations.

## 3. Responsive profiles already introduced

`src/core/platform.js` emits:

```text
large / medium / compact
portrait / landscape
fine / coarse pointer
web / electron
android flag
```

CSS classes are added to `<html>`.

Do not create a separate phone HTML page unless a workflow truly requires it.

## 4. Touch interaction principles

Existing desktop shortcuts remain valuable but cannot be the only path.

### Curve selection

Desktop:
- pointer within approximately 14–18 px.

Touch:
- larger invisible hit path (~24 px);
- nearest-curve tolerance (~28 px);
- selected curve becomes visually stronger.

### Peak selection

Desktop:
- small visual point, enlarged invisible hit circle.

Touch:
- larger hit circle;
- tap selects;
- drag moves;
- long press should become the replacement for Ctrl/right-click contextual actions.

### Box selection and zoom

Current desktop:
- drag = range action;
- Ctrl+drag = zoom.

Future touch:
- one-finger drag on empty plot should default to pan or selection based on visible tool state;
- two-finger pinch = zoom;
- explicit “区域操作” action should be available;
- long press can open the range/point context menu.

Modifier keys must not be required on Android.

## 5. Layout strategy

### Large desktop

```text
left controls | main plot | docked inspector
                    ↓
                 group plots
```

### Medium tablet / landscape

```text
narrow controls | main plot
optional inspector overlay/drawer
bottom group panel
```

### Compact portrait

The current plugin branch uses a staged layout foundation:

```text
top toolbar (horizontal scroll)
project tabs
controls region
main graph region
```

Docked inspector becomes an overlay/drawer instead of consuming permanent width.

Long analysis pages become single-column.

### Compact landscape

Controls become a narrow left rail and graph gets priority.

## 6. Minimum touch targets

Use the platform profile rather than hard-coded values.

The plugin branch currently increases:
- buttons/inputs on coarse pointers;
- curve hit width;
- nearest curve tolerance;
- peak hit radius;
- drag threshold.

Plugins should use `ctx.platform.profile.interaction`.

## 7. Charts

Plotly/D3 charts must:
- use responsive width/height;
- never assume hover;
- provide visible export/data actions;
- support pinch/scroll zoom only as an enhancement;
- expose a reset/fit button;
- avoid legends that cover data;
- switch multi-column grids to one column in compact portrait.

For a dense scientific dashboard on phone, prefer:
- one primary chart;
- tabs/chips for secondary quantities;
- bottom-sheet controls;
- separate full-screen chart detail.

Do not squeeze six desktop subplots into six tiny phone cards.

## 8. Android file workflow

Expected future Android implementation:
1. system document picker;
2. content URI access;
3. bridge returns text/bytes to plugin/core;
4. exports use Android share/save document flow.

Do not build plugins around Windows paths.

Current web-client synthetic paths (`webfile://...`) demonstrate why source identity should be opaque.

## 9. Performance

Mobile has tighter memory limits.

Future work:
- move heavy analysis to Web Workers;
- downsample only for display, never for scientific calculations;
- virtualize long tables/file lists;
- lazily render hidden Plotly pages;
- purge Plotly figures when plugin pages close if memory becomes an issue.

## 10. Recommended Android implementation phases

### Phase A
Make every built-in plugin work in browser mode without Electron-only assumptions.

### Phase B
Add a Capacitor Android shell and bridge:
- file open/save;
- clipboard/share;
- app lifecycle;
- orientation;
- storage.

### Phase C
Add touch-native gestures:
- long press;
- pinch zoom;
- drawers/bottom sheets;
- haptic feedback where appropriate.

### Phase D
Device testing matrix:
- small portrait phone;
- large portrait phone;
- landscape phone;
- 8–11" tablet portrait/landscape;
- stylus if available.

## 11. Do not fork scientific logic for Android

There should not be:

```text
desktop peak algorithm
android peak algorithm
web peak algorithm
```

There should be one plugin analysis implementation with platform-specific interaction and I/O adapters.
