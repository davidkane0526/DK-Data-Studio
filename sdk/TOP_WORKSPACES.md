# TOP Workspaces — Plugin API 1.19

> **Default authoring path (SDK 1.51.44): Unit-first.** Register the TOP lifecycle with Activity/TopWorkspace as described below, but compose the actual Page/Header/Layout/Workspace/PRIMARY/PRIME/SUB tree through `ctx.ui.unitTemplates`. Start from `sdk/templates/top-workspace-plugin/`. The lower-level `ctx.ui.workspaceSurface` facade remains public for advanced infrastructure cases and existing Plugin API 1.19 consumers; it is no longer the default template pattern.

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
    primary: {
      id: 'main',
      role: 'analysis-primary',
      presentationRole: 'scientific-primary',
      priority: 100,
      collapsible: false
    },
    prime: [],
    sub: []
  }
});
```

Core owns host selection. A normal TOP opens in its reusable dedicated window. When promoted to SUPER, the same activity and workspace implementation is embedded in the main shell. Do not maintain separate TOP and SUPER implementations.

### Platform-neutral Presentation semantics

`topWorkspace.layout` describes **semantic UI roles**, not Desktop coordinates. The same declaration is consumed by `DesktopPresenter` and `MobilePresenter`; plugins must not branch into `ctx.ui.desktop` / `ctx.ui.mobile`.

Use `presentationRole` on `primary`, `prime`, and `sub` surface declarations when the host needs to understand the surface's semantic importance:

- `scientific-primary`: the principal scientific visualization/work area;
- `data-primary`: the principal data-management work area;
- `utility-primary`: the principal utility/tool work area;
- `data-control`: controls that operate on the main data/scientific surface;
- `inspector`: contextual inspection/editing of the current selection;
- `scientific-secondary`: supporting scientific view that may become a route/sheet on constrained platforms.

`priority` is a relative ordering/retention hint. `collapsible` tells a Presenter whether the surface may be represented in a compact form. These fields do **not** prescribe `left`, `right`, or `bottom`; platform geometry belongs to the Presenter. Live `workspaceSurface` state is merged with this registered contract, so a surface keeps its semantic role even after mounting. `placement`, `placements`, and `defaultPlacement` are therefore invalid inside `ctx.ui.topWorkspace.register(...)`. Put Desktop docking choices only on the live `PluginWorkspace.registerPrime/registerSub` surface that realizes the semantic contract.

A `data-control` PRIME is the shared semantic abstraction for data/parameter controls. A constrained-platform Presenter may project that role into its fixed control slot, but the role does **not** rewrite the live Desktop PRIME placements: an accepted multi-placement data-control remains multi-placement unless the plugin explicitly declares `fixed:true`. The plugin-provided `label` is preserved, so the same semantic slot may read `参数` for an analysis parameter panel or `数据` for Data Center. When the control is specifically a parameter/settings surface, declare `presentationPurpose: 'parameters'` on both the live PRIME and the matching TOP contract row as optional functional metadata. Do **not** encode that meaning as `semanticKind: 'parameters'`: `semanticKind` remains bounded to `panel | inspector`.

```js
ctx.ui.topWorkspace.register({
  id:'my-analysis',
  activity:'my-analysis',
  layout:{
    mode:'native',
    root:{selector:'#myAnalysisPage .dkds-plugin-workspace'},
    primary:{id:'main', role:'analysis-primary', presentationRole:'scientific-primary', priority:100, collapsible:false},
    prime:[{id:'inspector', presentationRole:'inspector', priority:80, collapsible:true}],
    sub:[{id:'detail', presentationRole:'scientific-secondary', priority:60, collapsible:true}]
  }
});
```

`workspace.role` is the current workspace identity/host contract; `presentationRole` is the cross-platform semantic surface contract. They describe different dimensions and neither is a compatibility alias for the other.

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

## 3. Advanced low-level bounded scientific layout

A plot that fills the TOP viewport must have a bounded height chain. The reference pattern is:


> **Runtime facade:** `ui.workspace` is the manifest requirement and `ui.plugin-workspace` is a capability label. Plugin code must call `ctx.ui.workspaceSurface`; `ctx.ui.pluginWorkspace` is not a Plugin API 1.19 runtime property and is rejected during SDK/package validation.

```js
const workspace = ctx.ui.workspaceSurface.create(host, {
  activity: 'my-analysis',
  primaryScroll: 'safe'
});
workspace.mountPrimary({
  id: 'main',
  scroll: 'safe',
  mainNode
});
```

```css
.my-workbench,
.my-main {
  width: 100%;
  min-width: 0;
  min-height: 100%;
}
.my-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
}
.my-plot-card,
.my-plot {
  min-width: 0;
  min-height: 220px;
}
```

Do not set `height:100%`/`100vh` on the plugin root to take ownership of the host viewport, and do not use `overflow:hidden/clip` on semantic workspace/card/content containers. `primaryScroll: "safe"` gives the plugin a bounded Core-owned Primary viewport with one Core scrollbar. Plugin content may be taller than that viewport, but must not enlarge the host. Use flexible plugin roots (`min-height:0`) and `align-content:start` for compact auto-row form/card grids; use `auto` only when document-flow growth is intentional, and `contained` only for intentionally bounded full-viewport layouts. Use the bounded, read-only `layoutDiagnostics()` result during development; Core does not rewrite an unsafe plugin subtree at runtime.

Plugin API 1.19 makes PRIMARY exactly one semantic main surface. Use `mountPrimary({mainNode})` or `mountPrimary({mount:({main})=>...})`. A control/parameter rail or inspector is a separate PRIME surface with an explicit `presentationRole` such as `data-control` or `inspector`; Desktop and Mobile Presenters then place the same semantic object independently. `leftNode` and `leftHtml` are removed from the public contract. A plugin may still compose domain-specific grids inside `mainNode`. Where adjacent panes inside plugin-owned content need user-controlled allocation, use the Core persisted splitter (`ctx.ui.layout.split`). For movable dialogs or floating domain surfaces, use `ctx.ui.layout.move({id,target,handle,bounds})`; Core owns pointer capture, viewport bounds and persisted position.

Avoid this pattern for a fill-height/responsive plot:

```css
/* Wrong: parent height is intrinsic while the plot asks to consume 1fr
   with a positive intrinsic minimum. ResizeObserver can feed the new
   child height back into the parent and grow indefinitely. */
.my-main { grid-template-rows: auto minmax(380px, 1fr) auto; }
```

Plugin API 1.19 validates the bounded layout before packaging. Core exposes bounded, read-only registered-region diagnostics on demand, while ScientificCurveSurface treats `minWidth/minHeight` as preferred geometry rather than a silent-render gate. Runtime resize/mutation flow does not rewrite the plugin subtree.


### ScientificPlot runtime dependencies

Dedicated windows load only manifest-declared chart runtimes. Declare the runtime used by the public API:

- 所有 `ctx.ui.scientificPlot.*` 绘图入口统一声明 `"scientific-renderer"`。
- Core 科学绘图只有一个 D3 后端；插件只声明 `scientific-renderer`，不得声明或依赖 renderer vendor。统一使用 `createRenderer(...)`。

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

The Plugin API 1.19 SDK validator rejects:

- a TOP workbench without `manifest.window`;
- mismatched `workspace.activity` / `window.activity`;
- missing `workspace`, `ui.activities`, or `ui.top-workspace` Core requirements;
- missing `ctx.ui.activities.add(...)` or `ctx.ui.topWorkspace.register(...)`;
- a TOP Activity that does not declare `openMode: "window"`;
- a workbench that declares a dedicated window without declaring `workspace.role: "top"`;
- workbench-owned file inputs/import UI.

Start from `sdk/templates/top-workspace-plugin/` rather than adapting the standalone workbench template by guesswork.

### Plugin API 1.19 layout safety

For new workspaces, `safe` is the default Primary scroll policy. The standalone validator and the application installer both reject plugin CSS that targets Core-owned workspace DOM, clips semantic UI with `overflow:hidden/clip`, owns `100vh` viewport geometry, or uses positive-pixel `minmax(...,1fr)` rows in scientific/workspace-critical regions. Ordinary internal grids receive a warning instead of a hard failure. This is intentional: a plugin should describe its domain layout while Core guarantees that content remains reachable.


## SDK 1.19+ layout/legend/table guarantees

- `PluginWorkspace` owns viewport safety and records overflow/containment risks before recovering unsafe regions with scrolling.
- Multi-series `ScientificPlot` legends are Core-owned by default; Core reserves their measured/estimated footprint and exposes legend metrics. Do not add a second plugin legend unless domain semantics genuinely require one.
- `TableSurface` owns table CSS. Style the host only; use TableSurface `appearance` for supported variations. Direct internal table CSS is a validator error unless a narrow row override is declared.
