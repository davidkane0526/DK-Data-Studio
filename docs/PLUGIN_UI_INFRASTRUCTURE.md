# DK Data Studio Plugin UI Infrastructure — Plugin API v1.8 / UI Core v6.3

## Design boundary

DK Data Studio core owns the mechanics that every scientific plugin needs. Plugins own domain state, domain calculations and domain-specific view descriptions.

Core owns:

- workspace regions and responsive layout;
- portable/pinnable/floating panels and persistent placement;
- Plotly surface lifecycle and resize;
- dynamic action/button groups;
- activity-aware shortcuts;
- mouse / pointer / wheel / context-menu bindings;
- typed Interaction/Selection runtime and plugin-owned data/result type registry;
- common context menus;
- View/Controller mounting lifecycle;
- plugin state stores, project-slice persistence and migration;
- Data Model, Formula, Workflow, Parameter Schema and project portability.

Plugins should not reimplement those mechanisms.


## Unified AnalysisWorkbench v5

Complex analysis plugins must mount their content through `ctx.ui.analysisSurface.create(...)` and call `compose({primary, primes, subs})`. Core owns the outer frame and does **not** rewrite the plugin's internal DOM layout.

```js
const wb=ctx.ui.analysisSurface.create(host,{header:false,activity:'example'});
wb.compose({
  primary:{id:'main',label:'主分析',leftNode:controls,mainNode:main},
  primes:[{id:'inspector',label:'检查器',defaultPlacement:'right',mount:mountInspector}],
  subs:[{id:'physics',label:'物理分析',keepLeft:true,mount:mountPhysics}]
});
```

`PRIMARY` is the persistent main task. `PRIME` is a high-frequency auxiliary surface that can be inline/sticky/right/bottom/float. `SUB` is a full derived analysis that temporarily occupies the main area. The same view tree is used inside SUPER and dedicated TOP windows.

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
  placements: ['home', 'sticky', 'left', 'right', 'bottom', 'float']
});

panel.place('sticky'); // remains in its home scroll layout and sticks while scrolling
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

## Plugin-registered data types and typed interaction

Core deliberately does not prescribe one scientific data schema. Plugins register types and relationships:

```js
ctx.data.types.register('example.spectrum', {
  parent:'data.series', kind:'data', key:v=>v.id,
  selection:v=>({id:v.id, ref:{artifactId:v.id}, value:{id:v.id,name:v.name}})
});
ctx.data.types.register('example.fit', {
  parents:['result.analysis','data.point'], kind:'result', key:v=>v.id
});
```

Multiple parents are supported. This lets processed data participate in more than one semantic family without Core knowing the domain. Registered types may also define `normalize`, `describe`, `match`, compact `selection` projection and optional `resolve` hooks. Cross-plugin type ids are owner-protected and cannot be silently overwritten.

Create one interaction runtime for a scientific workbench:

```js
const interaction=ctx.ui.interaction.create('analysis',{
  selection:{multiple:true,defaultType:'example.spectrum'}
});
interaction.bind('inspector',{
  types:['result.analysis','data.series'],
  onSelection:(selection,meta)=>renderInspector(selection,meta)
});
```

A Selection document contains heterogeneous `items`, one `focus`, typed `ranges`, `context` and `source`. Consumers can bind to an exact type, any registered parent type, role or kind. `interaction.region(...)` atomically publishes a box/lasso range together with the selected raw or processed items.

### Linked selection views

Do not make charts, legends and data lists keep independent `selected` state. Register every visual projection of the same semantic entity with the Core interaction runtime:

```js
const datasetKey = selection => String(selection?.focus?.ref?.datasetPath || selection?.focus?.value?.datasetPath || '');
interaction.bindView('dataset-list', listElement, {
  selector:'.dataset-row', itemVariant:'row',
  itemKey:el=>el.dataset.datasetPath,
  focusKey:datasetKey,
  revealFocus:true
});
interaction.bindView('legend', legendElement, {
  selector:'.legend-chip', itemVariant:'chip',
  itemKey:el=>el.dataset.datasetPath,
  focusKey:datasetKey,
  dimOthers:true, revealFocus:true,
  horizontalWheel:true, hideScrollbar:true
});
```

Core owns `dkds-selection-focused / selected / dimmed`, focus reveal and DOM-mutation refresh. A plugin only declares how one domain entity maps to a view item. Clicking a chart, legend or list should publish to the **same** `InteractionRuntime`; subscribers and linked views then synchronize automatically. This is required for complex plugins and prevents a chart from showing one focused curve while its legend/list still indicates another.

For horizontally overflowing legend/tab strips, prefer `horizontalWheel:true`. Core hides the scrollbar and converts a normal mouse wheel over the strip into horizontal scrolling; plugins must not add private scrollbar CSS or wheel handlers.

**Keep selection state compact.** Selection is an interaction document, not a second data store. Large arrays, tables and raw sweep points remain in the canonical artifact/project/plugin store; a data type should project them to `id + ref + small preview value`, and resolve the ref only when a consumer really needs the complete object.

## Sticky versus Dock

`sticky` is intentionally different from `right` / `bottom` docking. A sticky view remains in its home layout and follows its own scroll container. Docking reparents the view into a workbench region and changes main-surface geometry. TER's R–V inspector is the reference use case.

## Resize scheduling

`layout:resize` is a frame signal, not a synchronous command. Core coalesces resize sources and refuses recursive layout emissions while dispatching one. Plugins should resize visible custom canvases in response, but must never emit another `layout:resize` from that listener. `ctx.ui.charts` surfaces are resized by Core automatically.

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
## v3.34 plugin visual contract

Built-in analysis plugins share a visual contract at the workbench boundary. New plugin UI should consume these Core tokens rather than inventing a private type scale:

```css
--plugin-font-body: 12.5px;
--plugin-font-label: 12px;
--plugin-font-meta: 11px;
--plugin-font-title: 13.5px;
--plugin-font-section: 14px;
--plugin-control-height: 32px;
--plugin-control-pad-x: 9px;
--plugin-action-gap: 6px;
```

Rules:

- Ordinary plugin body text is 12.5 px; form labels are 12 px. Auxiliary/meta/help text must not fall below 11 px in normal desktop layouts.
- Buttons and compact form controls use a 32 px minimum height and inherit the shared plugin font.
- Toolbars and action clusters are **single-row-first** (`flex-wrap: nowrap`). If the host is truly narrower than the action set, the row may scroll/overflow horizontally or move low-priority commands into a Core ActionGroup menu; it must not wrap early into two or three rows while usable horizontal space remains.
- Plugin-owned historical CSS may define older values for legacy/non-workbench pages, but a current `AnalysisWorkbench` surface is normalized by the shared contract. New built-ins should use the variables directly.
- A parity surface may intentionally opt out only when reproducing an externally defined product UI. The exception must be scoped to a deterministic plugin identity (for dedicated windows `body[data-plugin-id]`) rather than broad selectors. Resonance is the current reference exception because its UI intentionally reproduces the supplied Graphene Resonance Studio workspace.
- Renderer dependencies are part of the TOP contract. If a shared View uses D3, Plotly or another renderer, declare it in `plugin.json.window.dependencies`; the generic window host must load it rather than relying on libraries that happen to exist in the main renderer.

The visual contract belongs to UI infrastructure. Do not solve inconsistent typography or premature toolbar wrapping by adding per-plugin `!important` patches unless the plugin is deliberately implementing a documented parity surface.

## v3.35 GRS-derived base capabilities

Core UI infrastructure v6 adds `PluginWorkspace` and `ScientificCurveSurface`. `PluginWorkspace` retains the semantic AnalysisWorkbench contract but is now the preferred name and reference design system. `ScientificCurveSurface` extracts reusable GRS main-plot interaction (Turbo palette, directional dashes, direct selection, range/zoom, wheel zoom, marker drag, width handles) so measurement plugins provide domain callbacks instead of duplicating pointer/D3 plumbing.

## v3.36 canvas-local portable views and drag fast paths

The GRS-derived `PluginWorkspace` now owns an inner scientific-canvas frame with local left/right/bottom/overlay zones. This is the canonical docking coordinate space for scientific PRIME/SUB/child plots. `PortableView.stateVersion` can invalidate obsolete geometry persistence.

`ScientificCurveSurface` marker/FWHM drag paths update the affected SVG geometry directly during pointer movement and defer expensive complete rendering to drag completion or an animation-frame request.


## v3.37 workspace/floating/edit contracts

- `PluginWorkspace.create(..., { primaryScroll: 'contained' | 'auto' })` defines PRIMARY viewport ownership. A PRIMARY entry may also declare `scroll`.
- Portable placement `float` is scientific-canvas managed and edge-snappable; `global` is whole-plugin free floating and never auto-snaps to canvas docks.
- Portable specs may provide `closeSelector`, `onClose`, `collapseSelector`, `collapseLabel` and `expandLabel`; Core owns the lifecycle and chart resize notifications.
- Multiple views assigned to one fixed dock are stacked by Core rather than sharing absolute coordinates.
- SUB pages are composed outside the scientific canvas and receive an independent scrolling page region.
- `ctx.ui.edit.register({ id, order, undo, deselect, ... })` supplies system Edit behavior for the active plugin. Shell Undo/Escape first dispatch through this contract.
## v3.40 automatic PlotView lifecycle and layered PortableView

`PluginWorkspace` automatically observes its connected view tree and hydrates standard scientific figure cards through the Core `PlotViewRegistry`. Plugins no longer need one-shot `querySelectorAll(...).bind(...)` passes for generic plot capabilities. This matters for PRIME/SUB content because those nodes can be detached at plugin initialization and connected only later.

`PlotViewRegistry.bind()` is idempotent, and generic chrome is resolved strictly within the owning card. Standard capabilities are position, CSV, copy, SVG, PNG and resize. A PRIME-owned figure does not receive a second PortableView/position control. Plugins may provide domain actions such as TER `清除高亮`, but these are composed next to rather than replacing Core figure chrome.

PortableView has a Core layer policy: fixed dock < canvas float < global float < context menu/modal. Global free-floating views can cross the control/science boundary and are raised on focus/drag; they must not be hidden below group docks. Close/collapse actions use the shared icon chrome and collapsed dock geometry returns unused space to PRIMARY.

Architecture guards in `scripts/test-plot-view-foundation.js` treat plugin-private generic SVG/PNG/location chrome, document-wide PlotView action-host fallback, and one-shot SUB PlotView scans as regressions.
