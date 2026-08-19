# DK Data Studio Plugin UI Infrastructure — Plugin API v1.6 / UI Core v4.0

## Design boundary

DK Data Studio core owns the mechanics that every scientific plugin needs. Plugins own domain state, domain calculations and domain-specific view descriptions.

Core owns:

- workspace regions and responsive layout;
- portable/pinnable/floating panels and persistent placement;
- Plotly surface lifecycle and resize;
- dynamic action/button groups;
- activity-aware shortcuts;
- mouse / pointer / wheel / context-menu bindings;
- linked-selection channels between views;
- common context menus;
- View/Controller mounting lifecycle;
- plugin state stores, project-slice persistence and migration;
- Data Model, Formula, Workflow, Parameter Schema and project portability.

Plugins should not reimplement those mechanisms.


## Unified AnalysisWorkbench v4

Complex analysis plugins must mount their content through `ctx.ui.analysisSurface.create(...)` and call `compose({primary, primes, subs})`. Core owns the outer frame and does **not** rewrite the plugin's internal DOM layout.

```js
const wb=ctx.ui.analysisSurface.create(host,{header:false,activity:'example'});
wb.compose({
  primary:{id:'main',label:'主分析',leftNode:controls,mainNode:main},
  primes:[{id:'inspector',label:'检查器',defaultPlacement:'right',mount:mountInspector}],
  subs:[{id:'physics',label:'物理分析',keepLeft:true,mount:mountPhysics}]
});
```

`PRIMARY` is the persistent main task. `PRIME` is a high-frequency auxiliary surface that can be inline/right/bottom/float. `SUB` is a full derived analysis that temporarily occupies the main area. The same view tree is used inside SUPER and dedicated TOP windows.

Right/bottom docking is real layout geometry: docking a PRIME reduces the main surface rather than overlaying it. Floating coordinates are local to the workbench overlay. Split sizes and portable placement are UI preferences, not scientific project state.

## Capability Runtime v2

Plugins register portable providers with `ctx.capabilities.register`. Other plugins can use `list(query)`, `require(id, options)`, `proxy(id)`, `invoke(...)`, and `watch(...)`. Dedicated TOP windows receive provider snapshots and invoke main-renderer providers over the generic IPC bridge, so detector/workflow/chart/service capabilities do not need a second implementation in the TOP renderer.

## Resizable workspace splits

Core also owns persisted split panes. A plugin supplies only the container, handle and target:

```js
ctx.ui.layout.split({
  id:'controls-main', container:root, handle:divider, target:leftPane,
  axis:'x', min:220, defaultSize:340, reserve:420
});
```

Double-click resets the divider. Resize and persistence behavior are core-owned.

## Portable scientific views

Any existing chart/card can be registered without changing its home DOM structure:

```js
const panel = ctx.ui.portable.create('result-map', card, {
  title: 'Result map',
  useTargetAsWrapper: true,
  handle: '.analysis-chart-title',
  placements: ['home', 'left', 'right', 'bottom', 'float']
});

panel.float();
panel.pin('right');
```

Placement and floating bounds are persisted by core. Floating panels can be dragged, resized, and optionally snap to an allowed dock edge.

## Dynamic action groups

```js
const actions = ctx.ui.actions.mount(container, {
  activity: 'my-analysis',
  actions: [
    { id:'run', label:'运行', shortcut:'Ctrl+Enter', onInvoke:run },
    { id:'export', label:'导出', enabled:()=>hasResult(), onInvoke:exportResult }
  ]
});

actions.update({ hasResult:true });
```

Buttons and keyboard shortcuts use one command description instead of separate UI and keydown implementations.

## Mouse / pointer input

```js
ctx.ui.interactions.bind(plot, {
  click: ({event,mods}) => {},
  doubleClick: ({event,mods}) => {},
  contextMenu: ({event,mods}) => {},
  wheel: ({event,mods}) => {},
  drag: { start(){}, move(){}, end(){} }
});
```

Plugins should not install permanent global mouse listeners merely to implement a local plot interaction.

## Linked selections

```js
const selection = ctx.ui.selection.channel('active-peak');
selection.subscribe(value => updateInspector(value));
selection.set({datasetId, peakIndex});
```

This is intended for linked plots, tables and inspectors inside one plugin.

## State and project persistence

```js
const store = ctx.state.create(initialState, {
  projectSlice: 'workspace',
  migrate(data) { return migrateOldProjectState(data); }
});
```

The core handles activation cleanup and project restore/reset. Project files remain self-contained: dataset source text and parsed values are still saved by the host project format, so a project can be opened on another computer without the original CSV/TXT/DAT files.

## View / Controller boundary

Recommended complex-plugin structure:

```text
plugin/
  controller.js       domain state + commands + ViewModels
  views.js            domain view components
  feature-runtime.js  connects shared views to core infrastructure
  super-layout.js     maps SUPER host containers only
  window-runtime.js   maps TOP window containers/lifecycle only
  plugin.js           registration only
```

`super-layout.js` and `window-runtime.js` must not contain Plotly traces, science calculations, domain HTML templates, peak/TER logic, or feature-specific event handlers.

## Host adapters

SUPER and TOP are presentation hosts, not separate product implementations. Their adapters may provide only:

- root/container mapping;
- window close/focus lifecycle;
- resize notification;
- host-specific status surface.

Feature behavior must remain in plugin Controller/View/feature-runtime layers.

## v3.28 migration baseline

The built-in first-level analysis plugins now follow the same host contract:

- `resonance-workbench`
- `ter-analysis`
- `pulse-analysis`
- `data-center`

Core does not identify resonance (or any other domain plugin) when selecting or rendering a SUPER. A plugin may declare `workspace.defaultSuper: true`; otherwise the generic TOP ordering decides the one-time initial selection.

TER, Pulse and Data Center use the same split:

```text
controller.js       shared state / selection / domain command boundary
shared-views.js     reusable plugin-owned DOM + Workbench mapping
feature-runtime.js  feature wiring, scientific interactions and rendering
super-layout.js     SUPER host adapter only
window-runtime.js   TOP service/lifecycle adapter only (when required)
plugin.js           registration/composition only
```

Primary commands must be declared once with `ctx.ui.actions`; do not duplicate the same action in a page header and again inside the body. Contextual/export commands may remain beside the data they affect.

Portable plot placement is rendered by Core. Plugins declare allowed placements and a controls host; Core owns the placement menu, restoration, docking/floating mechanics, split geometry and persistence. Plugins must not implement a second docking manager.

A TOP promoted to SUPER must behave identically to every other TOP. Core derives the single non-dismissible SUPER root from the registered TOP contract. Plugin-owned derived/SUB pages remain dismissible so controls such as `返回主图` continue to work.
