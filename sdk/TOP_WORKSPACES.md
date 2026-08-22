# TOP Workspaces — Plugin API 1.15

This document defines the public contract for third-party analysis plugins that must behave like built-in TOP workspaces.

## 1. Workbench is not TOP

`pluginType: "workbench"` identifies the plugin category. It does not grant a dedicated window.

A true TOP has one stable activity id shared by all four declarations:

```json
{
  "pluginType": "workbench",
  "workspace": { "role": "top", "activity": "my-analysis" },
  "window": {
    "activity": "my-analysis",
    "reuse": true,
    "persistence": "project"
  }
}
```

```js
ctx.ui.activities.add({
  id: 'my-analysis',
  openMode: 'window',
  onActivate: () => ctx.workspace.openPage('myAnalysisPage')
});

ctx.ui.topWorkspace.register({
  id: 'my-analysis',
  activity: 'my-analysis',
  layout: {
    mode: 'native',
    root: { selector: '#myAnalysisPage .dkds-plugin-workspace' },
    primary: { id: 'main', role: 'analysis-primary' },
    prime: [],
    sub: []
  }
});
```

Core owns host selection. A normal TOP opens in its reusable dedicated window. When promoted to SUPER, the same activity and workspace implementation is embedded in the main shell. Do not maintain separate TOP and SUPER implementations.

## 2. Project data and Data Center

Analysis TOPs do not own file storage or a private importer. Declare semantic input types:

```json
"data": { "accepts": ["science.transport.transfer"] }
```

Use an empty Core-owned slot when you want to control the standard import action position:

```html
<div data-dkds-slot="workbench-import"></div>
```

Read assigned sources synchronously:

```js
const sources = ctx.data.sources.list();
const table = ctx.data.artifacts.get(sources[0].artifactId);
```

`ctx.data.sources.list()` and `targets()` are synchronous read contracts in both the main shell and dedicated TOP renderers. Mutations such as assignment changes remain asynchronous host operations. Physical source deletion belongs to Data Center/host infrastructure.

Use `window.artifactHydration: "live"` only when the dedicated renderer must receive the exact live Artifact snapshot at open/reuse time. The manifest value is part of the machine-readable Window Spec and does not rely on plugin activation timing.

## 3. Bounded scientific layout

A plot that fills the TOP viewport must have a bounded height chain. The reference pattern is:

```js
const workspace = ctx.ui.pluginWorkspace.create(host, {
  activity: 'my-analysis',
  primaryScroll: 'contained'
});
workspace.mountPrimary({
  id: 'main',
  scroll: 'contained',
  mainNode
});
```

```css
.my-workbench,
.my-main,
.my-plot-card,
.my-plot {
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.my-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
}
```

Avoid this pattern for a fill-height/responsive plot:

```css
/* Wrong: parent height is intrinsic while the plot asks to consume 1fr
   with a positive intrinsic minimum. ResizeObserver can feed the new
   child height back into the parent and grow indefinitely. */
.my-main { grid-template-rows: auto minmax(380px, 1fr) auto; }
```

Core coalesces resize work, but a plugin must still provide a mathematically bounded CSS layout.


### ScientificPlot runtime dependencies

Dedicated windows load only manifest-declared chart runtimes. Declare the runtime used by the public API:

- `ctx.ui.scientificPlot.create(...)` -> `"d3"` (Core `ScientificCurveSurface`);
- `ctx.ui.scientificPlot.react(...)` / `createPlotly(...)` -> `"plotly"`.

The SDK validator rejects a dedicated workspace that uses one of these APIs without its runtime dependency.

## 4. Scientific display scale

Use the Core ScientificPlot display contract instead of pre-transforming plot data solely for display:

```js
ctx.ui.scientificPlot.create(plot, {
  yScaleType: 'log',
  getCurves: () => curves
});
```

The Core log view displays `|Y|` without mutating source Artifacts. A plugin should not feed `log10(Y)` into ScientificPlot and then enable the Core log axis, which would double-transform the view.

## 5. Validation

The Plugin API 1.15 SDK validator rejects:

- a TOP workbench without `manifest.window`;
- mismatched `workspace.activity` / `window.activity`;
- missing `workspace`, `ui.activities`, or `ui.top-workspace` Core requirements;
- missing `ctx.ui.activities.add(...)` or `ctx.ui.topWorkspace.register(...)`;
- a TOP Activity that does not declare `openMode: "window"`;
- a workbench that declares a dedicated window without declaring `workspace.role: "top"`;
- workbench-owned file inputs/import UI.

Start from `sdk/templates/top-workspace-plugin/` rather than adapting the standalone workbench template by guesswork.
