# Workspace / UI Plugin API v1.2

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
  onActivate: () => ctx.host.showMainWorkspace()
});
```

Activities replace the old pattern of adding every feature as another permanent top-toolbar button.

The shell automatically:
- keeps the current activity visible;
- moves excess activities into `工作区 ▾`;
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

The existing resonance D3 implementation is retained as a mature compatibility renderer, but it is activated only through `builtin.resonance-workbench`'s `ui.mainViews` contribution.

A new scientific plugin can therefore replace the main view without editing core.

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

## 7. Main-view overlays

Context menus, box-selection menus and plot-local controls belong to the plugin:

```js
ctx.ui.mainOverlays.add({
  id: 'range-actions',
  activity: 'my-workspace',
  elementId: 'myRangeMenu',
  className: 'range-action-menu hidden',
  html: `...`,
  onMount({ element }) {
    // bind plugin-owned behavior
  }
});
```

The resonance range menu is implemented this way. It is no longer core HTML.

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
  version: '2.0.0',
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
.grs-size-compact
.grs-size-medium
.grs-size-large
.grs-pointer-coarse
.grs-orientation-portrait
.grs-orientation-landscape
```

Do not make hover, right-click or Ctrl modifiers the only route to an operation.

## 14. Boundary rule

For a domain workflow, these must be plugin-owned:

```text
activity
sidebar
algorithm selector/settings
main-view renderer registration
plot-local context UI
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

Peak detectors and other algorithm providers must be discovered from registries rather than hard-coded ids. Desktop `.grsplugin` packages can add stronger algorithms at runtime. See `PLUGIN_PACKAGES.md`. The surrounding workbench owns workflow/UI semantics, while the detector plugin owns its algorithm, parameter UI/schema, presets and evidence metadata.
