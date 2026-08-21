# DK Data Studio Plugin API v1.8

Plugin API v1.8 defines a **Core-first contract**: a plugin owns domain definitions, scientific algorithms, domain state and view content, but it does not own application infrastructure. File access, import/export routing, canonical Artifacts, the Entity graph, scientific-plot lifecycle, performance/cache lifecycle, DOM lifecycle, component primitives, workspace geometry, selection, interaction, project persistence, services, capabilities and dedicated-window lifecycle are supplied by Core.

Starting with DK Data Studio v3.42, API 1.8 gains backward-compatible Core surfaces for Entity identity, Artifact lineage and ScientificPlot. The API version remains `1.8.0` so existing v1.8 plugins continue to load unchanged; new plugins should consume the stronger surfaces instead of older compatibility shortcuts.

For external plugin development, the distributable `sdk/` directory is the supported development surface. It contains this public contract as TypeScript declarations, the manifest schema, templates and a zero-dependency validator/packager. A plugin author does not need the DK Data Studio source tree to create, validate or package a new API 1.8 plugin. Repository-local `npm run plugin:*` commands are maintainer conveniences, not SDK dependencies.

The runtime entry point is `window.DKDSPlugins`. A plugin registers once:

```js
DKDSPlugins.define(manifest, async ctx => {
  // register domain contributions with Core
  return { deactivate() {} };
});
```

## 1. Manifest and machine contract

`plugin.json` must target API `1.8.0` and declare every Core surface it consumes in `requiresCore`.

```json
{
  "id": "com.example.spectroscopy",
  "name": "Spectroscopy",
  "version": "1.0.0",
  "apiVersion": "1.8.0",
  "entry": "plugin.js",
  "scripts": ["model.js", "analysis.js", "views.js", "plugin.js"],
  "requiresCore": [
    "io", "data.flow", "data.artifacts", "data.entities", "data.types",
    "charts", "ui.dom", "ui.workspace", "ui.actions",
    "state", "project", "status", "modules"
  ]
}
```

The authoritative schema is `docs/plugin-manifest.schema.json`. `npm run plugin:validate` verifies IDs/files, Core requirement names, runtime-manifest parity and statically detectable undeclared Core usage. `npm run check` additionally runs architecture boundary checks.

Plugin IDs are permanent once project files persist state under them.

## 2. Ownership boundary

**Core owns:**

- desktop/web file dialogs, text/binary reads, save/export, clipboard and image export;
- canonical Artifact/Data Model, lineage/provenance graph and typed data-flow registries;
- canonical Entity Registry for identity/relationship/state projection (`visible / focused / selected / locked / hidden / disabled`);
- Plotly/D3 access through ScientificPlot, including focus styling, chart lifecycle, resize, purge and export;
- DOM creation/query helpers, persistent listener/observer cleanup, animation-frame/timer scheduling and declarative component primitives;
- PRIMARY / PRIME / SUB workspaces, Grid, portable/dock/floating surfaces, z-order and resize propagation;
- actions, shortcuts, menus, status bar, typed selection and Interaction Runtime;
- project slices, state-store lifecycle and dedicated TOP window synchronization;
- service, capability, analysis-provider, detector, workflow and plugin-module registries;
- host recipes for reusable shell/application behaviors.

**Plugins own only domain concerns:**

- scientific algorithms and parameters;
- domain commands and state transitions;
- domain data/result type definitions;
- domain-specific view content and ViewModels;
- declarative registration of importers/exporters/analyzers/providers/workflows;
- mapping domain views into Core workspace roles.

A plugin must not create a second docking/window manager, chart manager, file bridge, selection bus, provider registry or global module namespace.

## 3. Forbidden first-party/new-plugin patterns

New code must not use these infrastructure shortcuts:

```text
ctx.host
window.electronAPI / electronAPI.*
Plotly.* / window.Plotly
private plotly_click listeners or listener cleanup
private scrollIntoView focus/reveal logic
ctx.ui.charts (legacy first-party bypass; use ctx.ui.scientificPlot)
raw document.querySelector/createElement...
new ResizeObserver / new MutationObserver
requestAnimationFrame / setTimeout / setInterval / queueMicrotask
ctx.registry.add(...)
window.DKDSMyPluginSomething = ...
DKDSHostRecipes.*
```

Use the typed Core APIs below. `ctx.host` remains only as a compatibility bridge for old external packages and is deliberately excluded from the v1.8 development contract.

## 4. Core requirement catalog

The exact list is machine-readable through `DKDSPluginContract.requirements` and the manifest schema. Main groups are:

- runtime/lifecycle: `runtime`, `events`, `status`, `state`, `project`, `workspace`;
- base services: `io`, `science`, `performance`, `services`, `modules`, `recipes`, `capabilities`, `parameters`;
- data: `data.flow`, `data.pipeline`, `data.transforms`, `data.artifacts`, `data.entities`, `data.types`, `data.model`, `data.formula`;
- analysis/workflow: `workflow`, `analysis.providers`, `analysis.algorithms`, `analysis.detectors`;
- visualization: `charts`, `charts.providers`;
- UI: `ui.dom`, `ui.components`, `ui.workspace`, `ui.scientific-plot`, `ui.plot-views`, `ui.actions`, `ui.selection`, `ui.interaction`, `ui.menus`, `ui.context-menus`, `ui.activities`, `ui.top-workspace`, `ui.toolbar`, `ui.status-bar`, `ui.shortcuts`, `ui.pages`, `ui.styles`, `ui.portable`, `ui.edit`.

Activation fails before plugin code runs if a declared Core requirement is unavailable.

## 5. IO and data flow

Use `ctx.io` for filesystem/clipboard/export work. Do not call Electron directly.

```js
const opened = await ctx.io.openText({ filters:[{name:'CSV',extensions:['csv']}] });
await ctx.io.saveCsv(rows, 'result.csv');
await ctx.io.saveText({defaultName:'report.md', content:report});
await ctx.io.clipboard.writeText(csvText);
```

Register typed data-flow behavior instead of adding format branches to the host:

```js
ctx.data.importers.register('instrument-x.csv', {
  extensions:['csv'],
  async run(input, options) { return parseInstrumentX(input, options); }
});

ctx.data.transformers.register('normalize', { run:({value}) => normalize(value) });
ctx.data.analyzers.register('fit', { run:({value,settings}) => fit(value, settings) });
ctx.data.exporters.register('fit.csv', { run:({value}) => toCsv(value) });
```

`ctx.data.artifacts` is the canonical live project data source. `project.datasets` is compatibility data, not a new plugin-local store.

Derived results should be published with lineage rather than copied into plugin-private caches:

```js
const sweep = ctx.data.model.createSweep({
  id:'sweep:42', x, y, direction:1, scanAxis:'Vd',
  lineage:{parents:['dataset:7'],role:'sweep',producer:'com.example.spectroscopy',operation:'split-sweep'}
});
const transformed = ctx.data.model.createTransform({
  id:'transform:42:didv', x:tx, y:ty, transform:'didv',
  lineage:{parents:[sweep.id],role:'transform',producer:'com.example.spectroscopy',operation:'didv',parameters}
});
ctx.data.artifacts.batch(api=>{
  api.publish(sweep);
  api.publish(transformed);
});
const lineage = ctx.data.artifacts.lineage(transformed.id);
```

`publish()` is content-aware and may return `{changed:false}` for an identical scientific result. `batch()` coalesces publication events so one analysis run does not trigger dozens of unrelated UI redraws.

## 6. Domain data types, entities and selection

Every scientific object that appears in more than one view should have one stable Entity ID. Artifacts, sweeps, curves, peaks, matrix points and annotations can form parent/child relationships in `ctx.data.entities`. Core projects Artifact lineage into the Entity graph automatically.

Entity state has six distinct semantics:

```text
visible   participates in the current scientific view
focused   current interaction target
selected  member of the current multi-selection
locked    domain object cannot be edited/moved/deleted
hidden    explicitly suppressed from rendering
disabled  visible UI representation is not actionable
```

Do not encode `focused` as `visible`, and do not use focus to filter scientific data. A selected peak may focus its parent Sweep/Dataset views through Entity relationships without hiding other visible data.

Register types so heterogeneous raw/derived/result data can participate in one Core selection document:

```js
ctx.data.types.register('my.fit-result', {
  title:'Fit result',
  parents:['result.analysis','data.point'],
  kind:'result',
  key:value=>value.id,
  selection:value=>({
    id:value.id,
    ref:{resultId:value.id},
    value:{x:value.x,y:value.y,quality:value.quality}
  }),
  resolve:ref=>resultStore.get(ref.resultId)
});
```

Keep selection payloads compact. Large arrays stay in Artifacts/project/service state. Register or update domain entities once, then let Core project focus into each view:

```js
ctx.data.entities.upsert({id:'dataset:7',type:'my.dataset',label:'Vg=5 V'});
ctx.data.entities.upsert({id:'sweep:42',type:'my.sweep',parents:['dataset:7'],visible:true});
ctx.data.entities.upsert({id:'peak:9',type:'my.peak',parents:['sweep:42'],locked:false});
```

Artifact-backed entities survive plugin deactivation as Core-owned data entities, so another plugin can continue to discover the data lineage.

## 7. Scientific pipeline and transform registry

Use `ctx.data.pipeline` when a scientific operation should produce a typed, reproducible derived result. The plugin supplies the domain calculation; Core owns input/output validation, cache identity, provenance, lineage, Artifact publication, typed Selection and ViewModel projection.

Reusable curve transforms must be registered through `ctx.data.transforms`, not copied into plugin-local dropdowns or `if/else` chains. Core ships the canonical transport transforms `raw`, `detrend`, `didv`, `d2idv2`, `dlog`, `dvdi` and `resistance`. A public transform automatically exposes a curve Pipeline stage `transform.<id>` and, when `supportsScalarField` is true, a 2D stage `scalar-field.<id>`.

```js
const rows = ctx.data.transforms.list({public:true, supportsScalarField:true});
const fieldStage = ctx.data.transforms.fieldStageId('didv');
const result = ctx.data.pipeline.runSync(fieldStage, sourceArtifacts, {
  parameters:{targets, vgs, direction:1}
});
```

A plugin may add a reusable domain transform without changing TER, Resonance or the host:

```js
ctx.data.transforms.register('normalized-conductance', {
  title:'Normalized conductance',
  outputType:'my.normalized-conductance',
  fieldType:'my.normalized-conductance-field',
  quantity:'conductance',
  unit:'1',
  tags:['transport','transform'],
  run:(sweep,{parameters})=>computeNormalizedConductance(sweep,parameters)
});
```

If a transform is only meaningful as a curve, set `supportsScalarField:false`. Keep numerical algorithms in shared science/domain code; the registry describes scientific semantics and execution composition rather than replacing the algorithm implementation. Plugins using this API must declare both `data.transforms` and, when executing the generated stages, `data.pipeline`. Dedicated TOP dependencies are derived from `requiresCore`; do not repeat `scientific-transform-runtime` in `window.dependencies`.

## 8. Performance and scientific cache stages

Use `ctx.performance` for reusable computation caching and measurement. Plugins declare cache identity; Core owns storage, LRU/TTL budgets, lifecycle trim and diagnostics.

```js
const result = ctx.performance.stage(
  'fit-matrix',
  ctx.data.artifacts.revision('data.table'),
  JSON.stringify({model, tolerance}),
  () => computeFitMatrix(source, {model, tolerance}),
  {limit:6}
);
```

A plugin may inspect only its own namespace through `ctx.performance.snapshot()` and may trim only its own caches through `ctx.performance.trim()` / `trimAll()`. Do not create a plugin-private memoization Map for reusable scientific stages and do not access `window.DKDSPerformance` directly. Cache identity must contain every scientific input that changes the output.

## 9. Scientific plots

First-party and new plugins use `ctx.ui.scientificPlot` for Plotly/D3 scientific interaction. Do not bind `plotly_click` yourself and do not manually restyle focused traces.

Plotly example:

```js
await ctx.ui.scientificPlot.react(plot, traces, layout, config, {
  interaction,
  source:'fit-result',
  traceEntity:trace=>trace.entityId,
  pointEntity:({customdata})=>customdata?.entityId
});
ctx.ui.scientificPlot.resize(plot);
await ctx.ui.scientificPlot.saveImage(plot,'fit_result','png');
```

For matrix/scalar-field results, use the same runtime rather than creating a plugin-private Plotly heatmap:

```js
await ctx.ui.scientificPlot.scalarField(plot, {
  x: field.x, y: field.y, z: field.z,
  xName:'Vd', yName:'Vg', valueName:'dI/dV',
  xUnit:'V', yUnit:'V', valueUnit:'A/V',
  semanticType:'science.transport.conductance-field'
}, {
  diverging:false,
  source:'conductance-field',
  renderKey:artifact.fingerprint
});
```

`scalarField()` owns heatmap colorbar/axis metadata, diverging `zmid`, hover defaults, ScientificPlot viewport/export/lifecycle and managed rendering. The plugin owns the scientific matrix and optional domain mapping from a cell to a real Entity/Selection.

When a trace/point Entity is focused, ScientificPlot automatically emphasizes the related trace/point and dims unrelated visible data. A click automatically enters the shared `InteractionRuntime`. Existing rendered Plotly graphs may be adopted with `attach()`.

For Core `ScientificCurveSurface` (D3/SVG), declare `interaction` and stable `entityId` values on curves/markers. The surface derives the focused parent curve through the Entity graph and owns the same focus styling. Domain callbacks remain optional for special commands such as “open inspector” or “create manual peak”.

Use `ctx.ui.plotViews.bind(...)` for generic chart chrome, placement and CSV/image export:

```js
ctx.ui.plotViews.bind('fit:main', card, {
  plot, header:'.analysis-chart-title', fileStem:()=>`fit_${sampleId}`
});
```

A reusable chart **provider** is still registered with `ctx.charts.register(...)`; a plugin must not create its own renderer registry. `ctx.ui.charts` is retained only as a compatibility path and must not be used by new first-party code.

## 10. DOM, components and scheduling

Use the plugin-scoped DOM runtime for infrastructure-facing DOM work:

```js
const dom=ctx.ui.dom;
const host=dom.query('.my-host', page);
const button=dom.create('button',{text:'Run'});
dom.append(host,button);
dom.on(button,'click',run);
dom.observe(host,onResize,{resize:true});
dom.frame(render);
dom.timeout(refresh,100);
const stop=dom.interval(poll,1500);
```

All registered listeners/observers/timers are disposed with the plugin scope. Completed `frame()` and `timeout()` jobs remove their cleanup records immediately to avoid long-session closure accumulation.

For generic controls use `ctx.ui.components.mount(...)` or `ctx.parameters.render(...)` rather than creating a plugin-local UI framework.

## 11. Workspaces and view roles

SUPER and dedicated TOP are hosting modes of the same plugin UI. The semantic model is:

- **PRIMARY**: persistent main scientific work surface;
- **PRIME**: auxiliary high-frequency view, placeable inline/right/bottom/float/global through Core;
- **SUB**: full derived analysis that temporarily replaces PRIMARY and can return.

```js
const wb=ctx.ui.analysisWorkbench.create(root,{header:false,activity:'my-analysis'});
wb.mountPrimary({ id:'main', label:'主界面', mount:({left,main})=>{/* domain content */} });
wb.registerPrime({ id:'inspector', label:'检查', defaultPlacement:'right', placements:['inline','right','bottom','float'] });
wb.registerSub({ id:'physics', label:'物理分析', mount:({container})=>{/* domain content */} });
```

Do not implement plugin-local drag/dock/floating/z-index logic. Use Workbench/Portable/PlotView APIs.

### Tooltip ownership

Core Chart Runtime owns the visual tooltip theme for Plotly charts, and Core `.dkds-tooltip` owns the matching custom D3/SVG tooltip appearance. Plugins may define semantic hover content and formatting, but must not define independent tooltip background colors, opacity, borders, shadows or typography.

## 12. Actions, shortcuts and interaction

```js
ctx.ui.actions.mount(actionsHost,{actions:[
  {id:'run',label:'运行',shortcut:'Ctrl+Enter',onInvoke:run}
]});
ctx.ui.shortcuts.add({id:'delete-peak',chord:'Delete',activity:'my-analysis',handler:deletePeak});

const interaction=ctx.ui.interaction.create('analysis',{selection:{multiple:true}});
interaction.bind('inspector',{types:['result.analysis'],onSelection:renderInspector});
interaction.bindView('legend', legendHost, {
  selector:'.legend-chip',
  itemKey:el=>el.dataset.entityKey,
  focusKey:selection=>selection.focus?.ref?.datasetPath||'',
  dimOthers:true,
  revealFocus:true,
  horizontalWheel:true,
  hideScrollbar:true
});
```

Core owns keyboard routing, selection lifecycle, linked-view focus styling/reveal, Entity relationship projection and wheel-to-horizontal scrolling. Plugins only describe domain mapping and behavior. A list/legend item should expose the same Entity ID as its curve/point; `bindView(...,{entityLinked:true})` lets Core resolve a focused child Entity to the nearest displayed ancestor automatically. If the same entity appears in a chart, legend, data list and inspector, all of those views must subscribe to the same `InteractionRuntime`; they must not keep private selected/focused state. Linked-view reveal is remount-safe: if a legend/list rebuilds while the focus entity is unchanged, Core must reveal the replacement element again. Horizontal projections use local scrolling so focusing an item never shifts the outer page.

## 13. Project/state/service/module contracts

Project-local state:

```js
const store=ctx.state.create(initial,{projectSlice:'settings'});
ctx.project.registerSlice('results',{serialize,restore,reset});
```

Cross-layer service access:

```js
const service=ctx.services.require('my-service');
```

Complex plugin packages must not export private globals. Support files register into Core Module Registry:

```js
// analysis.js
window.DKDSPluginModules.define('com.example.spectroscopy','analysis',Object.freeze({fit}));

// plugin.js activation
const analysis=ctx.modules.require('analysis');
```

`modules` is packaging/internal composition; `services` is runtime service discovery; `capabilities` is cross-plugin/cross-renderer callable behavior.

## Scientific Algorithm Providers (v3.52+)

Algorithms that may evolve independently from DK Data Studio are versioned plugin providers. Core owns `DKDSScientificAlgorithms`, the Plugin API surface `ctx.analysis.algorithms`, version resolution, remote TOP transport, Pipeline composition and provenance. Core does **not** choose or silently upgrade a scientific algorithm.

An algorithm identity is the tuple:

```text
category + algorithmId + algorithmVersion
```

Multiple versions may coexist. New results should record the exact algorithm identity and parameters. Existing results are not silently recomputed when a newer version is installed.

```js
ctx.analysis.algorithms.register('my-detector', {
  category: 'peak-detector',
  version: '2.0.0',
  title: 'My Detector',
  inputTypes: ['science.iv.raw'],
  outputTypes: ['science.resonance.peak-set'],
  parameterSchema,
  run(input, {parameters}) { /* pure algorithm */ }
});
```

Dedicated TOP renderers discover algorithms through Capability Runtime, so an algorithm plugin does not need to be hard-coded into a Workbench window dependency list. Pipelines should resolve an exact algorithm version and include it in Artifact lineage/provenance.

### Algorithm version management (v3.54+)

Versionless resolution is for **new analysis only**. A user may choose a preferred version for an algorithm family with `setPreferred({category,id,version})`; `resolve({category,id})` then uses that preference. Persisted project/results should call `lock(ref)` and store the returned exact `{category,id,version}`.

```js
const chosen = ctx.analysis.algorithms.resolve({category:'ter-analysis', id:'ter.high-low-ratio'});
const locked = ctx.analysis.algorithms.lock(chosen); // persist this exact ref
const check = ctx.analysis.algorithms.diagnose(locked);
```

If `diagnose()` returns `missing-version`, the consumer must preserve the requested version and present the available alternatives. It must **not** silently replace the project lock with the current default. `versions(ref)` lists coexisting registered versions; `preferred()` / `setPreferred()` / `clearPreferred()` manage the user default for new analyses only.

External plugin packages remain single-active by plugin id. Desktop Plugin Manager keeps archived package versions for update rollback, while true scientific-version coexistence is represented by multiple algorithm versions registered by the active provider package.

### Algorithm package catalog and recovery (v3.55+)

Algorithm Provider packages should publish a metadata-only catalog in their manifest. Core can then locate an exact project-locked algorithm without executing the package:

```json
{
  "algorithmProvider": true,
  "algorithmCategories": ["peak-metrics"],
  "algorithmProvides": [
    {"category":"peak-metrics","id":"baseline-fwhm-v1","version":"1.0.0","title":"局部基线 FWHM"}
  ],
  "compatibility": {
    "app": ">=3.55.0 <4.0.0",
    "pluginApi": "^1.8.0"
  },
  "pluginDependencies": [
    {"id":"other.provider","range":"^2.0.0","optional":false}
  ]
}
```

`algorithmProvides` is an exact package catalog, not a substitute for runtime `register()`. Every entry must belong to a declared `algorithmCategories` value and use an exact semantic version. `compatibility.app`, `compatibility.pluginApi`, and package-level `pluginDependencies` are evaluated by the same Core compatibility service during catalog lookup, install/update, LAN update, startup loading and history rollback.

A consumer with a missing exact project lock may use `ctx.analysis.algorithms.locate(ref)` to list compatible current/history candidates and `recover(ref, candidate)` to restore one. Recovery must preserve the original `{category,id,version}` lock, restore/enable the package, and then verify that the exact algorithm version registered successfully. An incompatible candidate may be shown diagnostically but must not be auto-activated. Override candidates are located but are not hot-swapped into a running host.

`ctx.analysis.detectors` remains a compatibility facade for older detector plugins. New detector implementations should register `analysis.algorithms` with `category:'peak-detector'`.

## 14. Analysis providers, detectors and workflows

```js
ctx.analysis.providers.register('my.analysis',{name:'My analysis',run});
ctx.analysis.algorithms.register('my.detector',{category:'peak-detector',version:'1.0.0',title:'Detector',parameterSchema,run});

// Legacy compatibility only:
ctx.analysis.detectors.register('legacy.detector',{name:'Detector',parameterSchema,detect});
ctx.workflow.processors.register('my.processor',{name:'Processor',inputKinds:['data.table'],outputKinds:['data.table'],parameterSchema,run});
```

Parameter UI is schema-driven. A detector/provider should not ship its own settings-widget framework.

## 15. Dedicated TOP windows

A top-level plugin declares `workspace.role="top"` and a `window` contract in `plugin.json`. The dedicated renderer loads only Core dependencies and that plugin's declared support files. `window-runtime.js` is a thin lifecycle/service adapter; domain algorithms and domain rendering stay in shared modules used by SUPER and TOP alike.

`window-runtime.js` must be registered as the plugin's `window-runtime` Core module. It must not duplicate feature logic.

## 16. Validation commands

Run before delivery:

```bash
npm run plugin:index
npm run plugin:validate
node scripts/check-plugin-boundaries.js
npm run check
```

For changes to mature scientific algorithms also run `npm run science:parity` against a preserved baseline. See `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md` for the full development workflow.
