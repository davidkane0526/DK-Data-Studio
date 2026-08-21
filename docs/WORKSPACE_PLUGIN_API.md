# Workspace / UI Plugin API v1.8

This document defines how a plugin owns an entire scientific workspace without adding domain UI to `src/index.html` or `src/app.js`.

## 1. Shell model

Core owns only generic mounting surfaces:

```text
Application shell
├─ global file/edit/system commands
├─ activity switcher
├─ activity context toolbar + overflow
├─ plugin sidebar mount
├─ main-view canvas host
├─ main-view tool mount
├─ generic inspector panel
├─ generic group panel
├─ generic analysis-page host
└─ generic floating-panel host
```

A scientific plugin owns the content placed into those surfaces.

The built-in resonance workbench is the reference implementation.

## 2. Activity

Every top-level workflow should normally register one activity:

```js
ctx.ui.activities.add({
  id: 'my-workspace',
  label: 'My Data',
  contextLabel: 'My Data Analysis',
  icon: '◈',
  order: 100,
  description: '...',
  onActivate: () => ctx.workspace.openPage('my-workspace-page')
});
```

Activities replace the old pattern of adding every feature as another permanent top-toolbar button.

An activity that should live in its own desktop window can declare:

```js
ctx.ui.activities.add({
  id: 'my-analysis',
  label: '数据分析',
  openMode: 'window',
  onActivate: () => ctx.workspace.openPage('my-analysis-page')
});
```

On Electron, `openMode: 'window'` keeps the main scientific workspace intact and opens a dedicated `BrowserWindow` for that activity. In the auxiliary renderer the same activity activates normally, so the plugin does not need a second implementation. Web/mobile runtimes may fall back to an inline activity.

The shell automatically:
- keeps primary activities visible and groups their commands with them;
- moves excess secondary activities into the overflow menu;
- shows only UI contributions belonging to the active activity;
- reflows on window-size changes.

## 3. Activity context toolbar

```js
ctx.ui.toolbar.add({
  id: 'myInspector',
  activity: 'my-workspace',
  label: '检查器',
  order: 10,
  onClick: () => {}
});
```

Too many tools automatically move into `更多 ▾`.

Do not add domain buttons directly to the core toolbar.

## 4. Sidebar sections

```js
const section = ctx.ui.sidebar.add({
  id: 'datasets',
  activity: 'my-workspace',
  order: 10,
  html: `<h3>数据</h3><div class="my-list"></div>`
});
```

Multiple plugins can contribute sidebar sections. Sections are deterministically ordered by `order`.

Do not add measurement-specific sidebar markup to `src/index.html`.

## 5. Main view provider

A plugin can own the central plot/workspace canvas:

```js
ctx.ui.mainViews.register('my-main-view', {
  activity: 'my-workspace',
  priority: 100,
  title: 'My Main View',

  render({ container, svg, state, activityId }) {
    // draw
  },

  reset() {
    // fit/reset current view
  },

  csvText() {
    return 'x,y\n...';
  },

  exportSvg() {},
  exportPng() {}
});
```

The core `renderMainPlot()` is now a provider dispatcher.

The Resonance main visualization is plugin-owned rather than a Core compatibility renderer. Its Controller/View implementation is mounted by `builtin.resonance-workbench` through the same workspace/view contracts available to other plugins.

A new scientific plugin can therefore own or replace its main view without editing Core.

## 6. Main-view tools

```js
ctx.ui.mainTools.add({
  id: 'fitModel',
  activity: 'my-workspace',
  label: '拟合',
  order: 10,
  onClick: () => {}
});
```

These controls sit inside the main-plot header.

## 7. Selection menus and main-view overlays

The shell may own generic interaction geometry, but the active scientific plugin owns the actions shown for that interaction. Box/range-selection menus use the dedicated typed contribution:

```js
ctx.ui.selectionMenus.register('range-actions', {
  activity: 'my-workspace',
  priority: 100,
  render({ container, selection, context, host }) {
    container.innerHTML = `
      <button data-action="fit">局部拟合</button>
      <button data-action="delete">删除所选</button>
    `;
    // bind plugin-owned actions here
  }
});
```

Core may calculate the selection rectangle and selected item IDs, but it must not hard-code domain labels, peak operations, fit commands, or other workflow-specific actions. The resonance range menu is implemented through `ui.selectionMenus`, so another main-view plugin can replace it without editing `index.html` or `app.js`.

`ctx.ui.mainOverlays.add(...)` remains available for arbitrary plugin-owned plot-local DOM such as annotations or floating widgets that are not tied to the generic selection-menu contract:

```js
ctx.ui.mainOverlays.add({
  id: 'my-overlay',
  activity: 'my-workspace',
  elementId: 'myOverlay',
  className: 'my-overlay hidden',
  html: `...`,
  onMount({ element }) {}
});
```

## 8. Inspector provider

The right/floating inspector is a generic host. A plugin supplies content:

```js
ctx.ui.inspectors.register('my-inspector', {
  activity: 'my-workspace',
  priority: 100,
  panelTitle: '光谱检查器',

  supports(context) {
    return true;
  },

  render({ container, context }) {
    container.innerHTML = '...';
  }
});
```

The same core inspector can therefore become:
- resonance curve/peak inspector;
- Raman fit inspector;
- FET extraction inspector;
- image/pixel inspector.

## 9. Group view and chart providers

The bottom/floating group panel is generic.

A plugin can define the panel-level view:

```js
ctx.ui.groupViews.register('my-group-view', {
  activity: 'my-workspace',
  priority: 100,
  panelTitle: 'Raman 参数图',
  title(context) {
    return '当前光谱组';
  }
});
```

Each subplot is a provider:

```js
ctx.ui.groupCharts.register('peak-position', {
  activity: 'my-workspace',
  order: 10,
  title: 'Peak position',
  unit: 'cm⁻¹',

  build({ context }) {
    return {
      title: 'Peak position',
      unit: 'cm⁻¹',
      xTitle: 'Temperature (K)',
      traces: [...],
      csvText: '...',
      layout: {},
      config: {}
    };
  },

  onPointClick({ point, result, context }) {}
});
```

A chart plugin controls:
- the data model used for the subplot;
- Plotly traces;
- axis titles/units;
- layout/config;
- CSV data;
- point-click behavior.

Core only owns card layout, docking, zoom host and generic copy/export plumbing.

## 10. Detector provider

Peak-finding algorithms are independently installable contributions:

```js
ctx.analysis.detectors.register('my-detector-v2', {
  name: 'My Detector',
  version: '2.1.0',
  description: '...',
  default: false,

  presets: ['strict', 'balanced', 'sensitive'],
  defaultSettings: () => ({ ... }),

  detect(sweep, settings, options) {
    return peaks;
  }
});
```

A detector may provide a schema-generated settings UI:

```js
parameterSchema: {
  fields: [...]
}
```

or a completely custom algorithm settings UI:

```js
renderSettings({ container, settings, onChange, platform }) {
  // detector plugin owns this UI
  return { destroy() {} };
}
```

Therefore the workbench does not contain special-case UI for the built-in robust detector.

### Evidence/marker metadata

A detector can own visual semantics:

```js
evidence: {
  curvature: {
    label: 'Curvature evidence',
    glyph: '✚',
    symbol: 'cross'
  }
}
```

Supported generic symbol names include:

```text
circle
diamond
triangle
square
cross
hexagon
kite
triangle-down
star
```

A provider may also implement `markerSymbol(peak)` for advanced D3 symbol customization.

Every automatically detected peak is tagged with:

```text
detectorId
detectorVersion
```

The workbench can therefore preserve provenance and render evidence from the provider that created the peak.

If all detector plugins are disabled, the application reports that no detector is available. The plugin branch must **not** silently resurrect a built-in detector.

## 11. Activity-scoped shortcuts and layout events

Desktop keyboard behavior that belongs to a scientific workflow must be registered by that plugin:

```js
ctx.ui.shortcuts.add({
  id: 'my-edit-shortcuts',
  activity: 'my-workspace',
  priority: 100,
  match(event) {
    return event.key === 'Delete';
  },
  handler({ event }) {
    removeSelectedPoint();
  }
});
```

The shell dispatches shortcuts only for the active Activity. Plugin shortcuts run in capture phase so a domain shortcut does not also fall through into unrelated core behavior.

Do not put Raman/FET/resonance-specific keys into the global `app.js` key handler.

The core also emits:

```js
ctx.events.on('layout:resize', () => {
  Plotly.Plots.resize(myPlot);
});
```

Each plugin must resize its own canvases. Core must not contain lists such as `ramanPlot`, `terHeatmapPlot`, or `gateAnalysisPlot`.

## 12. Dynamic pages and panels

Domain pages:

```js
ctx.ui.pages.add({
  id: 'gate-analysis',
  pageId: 'gateAnalysisPage',
  activity: 'my-workspace',
  label: '分析',
  html: `...`,
  onOpen: () => {}
});
```

Floating panels:

```js
ctx.ui.panels.add({
  id: 'physics',
  panelId: 'physicsPanel',
  activity: 'my-workspace',
  label: '物理机制',
  html: `...`
});
```

The domain DOM belongs in the plugin file/folder, not in core `index.html`.

## 13. Responsive/touch rules

UI plugins must assume:
- toolbar items may overflow;
- sidebar width changes;
- inspector can dock or float;
- group panel can dock or float;
- pointer can be coarse;
- phone layout can be single-column.

Use:

```js
ctx.platform.profile
```

and CSS classes:

```text
.dkds-size-compact
.dkds-size-medium
.dkds-size-large
.dkds-pointer-coarse
.dkds-orientation-portrait
.dkds-orientation-landscape
```

Do not make hover, right-click or Ctrl modifiers the only route to an operation.

## 14. Boundary rule

For a domain workflow, these must be plugin-owned:

```text
activity
sidebar
algorithm selector/settings
main-view renderer registration
plot-local context UI / `ui.selectionMenus`
inspector
group view
group chart types
domain pages
domain floating panels
domain export actions
```

Core may contain compatibility implementation services while an old mature workflow is being migrated, but core must not decide when or how domain UI appears.

Run:

```bash
npm run check
```

The `check-plugin-boundaries.js` test prevents resonance UI from leaking back into core HTML.


## 15. Context toolbar grouping and priority

Activity context commands are not a flat global toolbar. A plugin may declare:

```js
ctx.ui.toolbar.add({
  id: 'fit',
  activity: 'raman',
  section: '分析',
  priority: 80,
  order: 30,
  label: '拟合',
  onClick() {}
});
```

`section` provides a visual grouping boundary. `priority` determines which actions remain directly visible when horizontal space is insufficient; lower-priority actions move into the context overflow menu first. `order` controls normal visual ordering.

This makes toolbar growth scale with plugins without returning to a single long Origin-like command strip.

## 16. Installable algorithm providers

Peak detectors and other algorithm providers must be discovered from registries rather than hard-coded ids. Desktop `.dkplugin` packages can add stronger algorithms at runtime. See `PLUGIN_PACKAGES.md`. The surrounding workbench owns workflow/UI semantics, while the detector plugin owns its algorithm, parameter UI/schema, presets and evidence metadata.


## AnalysisWorkbench v5 / Typed Interaction / Capability Runtime v2

Plugin API 1.8 standardizes complex analysis plugins on `ctx.ui.analysisSurface.create(...)` + `compose({primary, primes, subs})`. SUPER and TOP must compose the same Controller/Shared Views/Feature Runtime tree; host adapters only map lifecycle and window boundaries.

Capabilities may be discovered with `ctx.capabilities.list(query)`, required by id/method contract with `ctx.capabilities.require(...)`, proxied/invoked across dedicated TOP renderers, and observed with `ctx.capabilities.watch(...)`. Core owns docking, sticky/floating placement, split geometry, typed interaction selection, frame-coalesced chart resize, shortcuts and context menus; plugins own scientific state, calculations and view content.

## v3.35 host-invariant PluginWorkspace

The built-in Resonance workspace is now the design-system reference rather than an exception. Shared scientific UI uses `PluginWorkspace`; reusable direct curve manipulation uses `ScientificCurveSurface`. A plugin promoted/demoted between SUPER and TOP must preserve the same PRIMARY/PRIME/SUB composition, plot appearance, data access and interaction capabilities. Only outer host controls may differ. See `PLUGIN_WORKSPACE_DESIGN_SYSTEM.md`.

## v3.36 scientific-canvas placement

`PluginWorkspace` resolves fixed portable placements against its inner scientific canvas. Use normal portable placements (`home`, `left`, `right`, `bottom`, `float`); plugins should not calculate application-level coordinates. Use `stateVersion` when a plugin changes placement geometry semantics so obsolete saved coordinates are not restored.

A plugin may project PRIME/SUB commands to the SUPER host toolbar while using the same semantic actions locally in TOP. This must not create a second view implementation.


## v3.37 workspace/floating/edit contracts

- `PluginWorkspace.create(..., { primaryScroll: 'contained' | 'auto' })` defines PRIMARY viewport ownership. A PRIMARY entry may also declare `scroll`.
- Portable placement `float` is scientific-canvas managed and edge-snappable; `global` is whole-plugin free floating and never auto-snaps to canvas docks.
- Portable specs may provide `closeSelector`, `onClose`, `collapseSelector`, `collapseLabel` and `expandLabel`; Core owns the lifecycle and chart resize notifications.
- Multiple views assigned to one fixed dock are stacked by Core rather than sharing absolute coordinates.
- SUB pages are composed outside the scientific canvas and receive an independent scrolling page region.
- `ctx.ui.edit.register({ id, order, undo, deselect, ... })` supplies system Edit behavior for the active plugin. Shell Undo/Escape first dispatch through this contract.
