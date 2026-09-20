# DK Data Studio Plugin API v1.19

Plugin API 1.19 is the **Core-first, Legacy-Free contract** for DK Data Studio v3.67.5+. A plugin owns domain definitions, scientific algorithms, domain state and view content; Core owns application infrastructure such as file access, canonical Artifacts, scientific-plot lifecycle, DOM/component primitives, workspace geometry, selection/interaction, persistence, services and dedicated-window lifecycle.

Analysis workbenches declare accepted semantic data through `manifest.data.accepts`. Core owns the standard import action and centralized Import Workbench. Plugins may provide an empty `data-dkds-slot="workbench-import"` placement slot, but must not implement a second file picker or importer UI.

Plugin API 1.19 is a deliberate breaking boundary. The host accepts API `1.19.0`; earlier runtime/API compatibility adapters are not part of the current contract. Historical **project files** remain supported separately through the Project Compatibility Gateway before plugin runtime starts.

For external plugin development, the distributable `sdk/` directory is the supported development surface. It contains TypeScript declarations, the manifest schema, templates and the standalone validator/packager. New packages must target API `1.19.0` and declare only the Core capabilities they actually consume. Repository-local `npm run plugin:*` commands are maintainer conveniences, not SDK dependencies.

The runtime entry point is `window.DKDSPlugins`. A plugin registers once:

```js
DKDSPlugins.define(manifest, async ctx => {
  // register domain contributions with Core
  return { deactivate() {} };
});
```

## 1. Manifest and machine contract

`plugin.json` for a new plugin must target API `1.19.0` and declare every Core surface it consumes in `requiresCore`.

```json
{
  "id": "com.example.spectroscopy",
  "name": "Spectroscopy",
  "version": "1.0.0",
  "pluginType": "workbench",
  "apiVersion": "1.19.0",
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

`pluginType` controls the Plugin Manager information architecture and should be declared explicitly by new packages: `foundation`, `data`, `algorithm`, `workbench`, `task`, `extension`, or `developer`. It is descriptive metadata only; privileges still come exclusively from `requiresCore` and registered capabilities.

Plugin IDs are permanent once project files persist state under them.

## 1.1 Bundled baseline and same-ID updates

A plugin ID is stable identity, not an installation-location identity. A plugin shipped in the application is the **bundled baseline** for that ID. On Desktop, a `.dkplugin` with the **same ID** may update that baseline when all of the following are true:

- the package passes the same Plugin API / manifest / layout validation as any external package;
- it declares Plugin API `1.19.0` exactly and satisfies the current manifest/Core requirement contract;
- its semantic plugin version is **strictly newer than the current effective version**.

Core installs such a package as a **managed override** in the user-data `plugin-overrides` layer. The application installation directory is never modified. Because a bundled plugin may already be running when the user installs an update, managed overrides activate on the next application start rather than hot-replacing executing first-party code. The current installed override is the only override package considered; removing it makes the bundled package active again.

If a later DK Data Studio release ships the same or a newer bundled version, that bundled baseline automatically wins over a stale override. This keeps exported/upgraded plugins useful without turning the application bundle into mutable state. Unknown IDs in the reserved `builtin.*` namespace are still rejected; stable first-party IDs outside that prefix are governed by actual bundled membership, not name heuristics.

The bundled source and exported `.dkplugin` paths are intentionally held to the **same package contract**. Release validation packages and normalizes every bundled plugin through Plugin API 1.19, so first-party code cannot rely on CSS/layout patterns that an SDK package would fail.

## 2. Ownership boundary

**Core owns:**

- desktop/web file dialogs, text/binary reads, save/export, clipboard and image export;
- canonical Artifact/Data Model, lineage/provenance graph and typed data-flow registries;
- canonical Entity Registry for identity/relationship/state projection (`visible / focused / selected / locked / hidden / disabled`);
- D3 scientific rendering through the vendor-neutral ScientificPlot API, including focus styling, chart lifecycle, resize, purge and export;
- DOM creation/query helpers, persistent listener/observer cleanup, animation-frame/timer scheduling and declarative component primitives;
- runtime style ownership, including CSS inline writes, SVG paint attributes (`fill`, `stroke`, `opacity`, etc.) and dynamic SVG presentation attributes (`display`, `visibility`, `pointer-events`, `cursor`); `ctx.ui.dom.style()` and `ctx.ui.dom.attr()` route managed writes through the same Style Ownership Gate, while scientific/data geometry (`x`, `y`, `cx`, `cy`, `d`, `transform`, scale-derived coordinates) remains renderer-owned geometry;
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
raw renderer-vendor globals such as window.d3
window.d3
private renderer event listeners or listener cleanup
private scrollIntoView focus/reveal logic
ctx.ui.scientificPlot (the only public scientific chart runtime)
raw document.querySelector/createElement...
new ResizeObserver / new MutationObserver
requestAnimationFrame / setTimeout / setInterval / queueMicrotask
ctx.registry.add(...)
window.DKDSMyPluginSomething = ...
DKDSHostRecipes.*
```

Use the typed Core APIs below. `ctx.host` is not part of Plugin API 1.19; host-private state must never be accessed by plugins.

## 4. Core requirement catalog

The exact list is machine-readable through `DKDSPluginContract.requirements` and the manifest schema. Main groups are:

- runtime/lifecycle: `runtime`, `events`, `status`, `state`, `project`, `workspace`;
- base services: `io`, `science`, `performance`, `services`, `modules`, `recipes`, `capabilities`, `parameters`;
- data: `data.flow`, `data.pipeline`, `data.transforms`, `data.reactive`, `data.artifacts`, `data.entities`, `data.types`, `data.model`, `data.formula`;
- analysis/workflow: `workflow`, `analysis.providers`, `analysis.algorithms`;
- visualization: `charts`, `charts.providers`;
- UI: `ui.dom`, `ui.components`, `ui.workspace`, `ui.scientific-plot`, `ui.plot-views`, `ui.actions`, `ui.selection`, `ui.interaction`, `ui.menus`, `ui.context-menus`, `ui.activities`, `ui.top-workspace`, `ui.toolbar`, `ui.status-bar`, `ui.shortcuts`, `ui.pages`, `ui.styles`, `ui.theme`, `ui.portable`, `ui.edit`, `ui.table`, `ui.settings`, `ui.dialogs`.

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
  parseArtifacts(file, options) { return parseInstrumentX(file, options); },
  createStreamParser(file, options, inspection) {
    if (!supportsStreaming(file)) return null;
    const parser = createInstrumentLineParser(file, options, inspection);
    return {
      async pushLines(lines, meta) { await parser.push(lines, meta); },
      async finish(meta) { return parser.finish(meta); }
    };
  }
});

ctx.data.transformers.register('normalize', { run:({value}) => normalize(value) });
ctx.data.analyzers.register('fit', { run:({value,settings}) => fit(value, settings) });
ctx.data.exporters.register('fit.csv', { run:({value}) => toCsv(value) });
```

For large text files, `createStreamParser(...)` is the preferred importer path. Core owns the opaque file token, fixed-size chunk reads, host-specific in-flight budget, cancellation, text decoding and line framing. The importer only receives bounded line batches through `pushLines()`. `await pushLines(...)` is the backpressure boundary: Core will not advance unbounded data into the importer while it is still processing the current batch. `finish(...)` returns the same canonical `{artifacts, inspection}` result as `parseArtifacts(...)`. Return `null` for formats that require full-container parsing (for example a non-streaming JSON container); the host then uses the normal `parseArtifacts` path. Plugins must not open native file descriptors or create their own read-ahead queues.

`ctx.data.artifacts` is the canonical live project data source. Plugin API 1.19 does not expose or consume `project.datasets`; historical dataset arrays are converted to canonical DataTable Artifacts by the Project Compatibility Gateway before plugin runtime starts.

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

Numeric factory inputs may be ordinary arrays or number-based TypedArrays. Core immediately copies TypedArrays into the current serializable Artifact shape; BigInt TypedArrays are rejected at the factory boundary:

```js
const series = ctx.data.model.createSeries({
  id:'measurement:preview',
  x:new Float64Array([0, 0.5, 1]),
  y:new Float64Array([1.2, 1.8, 2.1])
});
```

This does not expose zero-copy mutable storage. Artifact Store reads remain detached snapshots, and malformed matrix shapes are rejected on Store write.

For an explicit numeric column edit, use the Store-owned Column Buffer transaction instead of mutating an Artifact returned by `get()`:

```js
const buffer=ctx.data.artifacts.columnBuffer(tableId,'signal');
ctx.data.artifacts.transactColumn(buffer,draft=>{
  draft[0]=0;
},{label:'Zero first sample'});
```

The read is a frozen copy and its Store/Artifact/column ownership is verified at commit. Transactions are synchronous and fixed-length; stale, foreign, failed, async or dtype-invalid writes do not publish. Supported dtypes are `number`, `float64`, `float32`, `int32`, `uint32`, `int16`, `uint16`, `int8` and `uint8`, with no implicit float32 rounding or integer clamping.

For read-only structure and bounded preview work, do not create a full Column Buffer:

```js
const rows=ctx.data.artifacts.listMetadata({kind:'data.table'});
const columns=ctx.data.artifacts.columnMetadata(tableId);
const preview=ctx.data.artifacts.readColumnRange(tableId,'signal',{start:0,limit:2048});
```

`listMetadata()` and `columnMetadata()` omit column values. `readColumnRange()` requires a finite integer `limit` and Core caps one call at 65536 cells; it returns `start/end/totalLength/artifactRevision/bufferRevision` with a detached immutable values slice. Use `ctx.data.artifacts.columnRevision(id, column)` when only the current payload-local invalidation stamp is needed. Default complete `get/list` behavior is unchanged. See `sdk/DATA_ARTIFACT_ACCESS.md` for the full contract.

History-dependent analysis must use explicit acquisition metadata rather than UI/source enumeration order. Canonical fields live at `artifact.metadata.acquisition` (`runId`, `sequenceIndex`, `timestamp`, optional `parentSequenceIndex`, `provenance`). Lightweight metadata/source reads retain those fields, and source consumers can request deterministic ordering directly:

```js
const order=ctx.data.sources.acquisitionOrder({artifactIds});
// [{artifactId,runId,sequenceIndex,timestamp,parentSequenceIndex?,provenance}]
```

The shared Import Workbench preserves source-provided acquisition fields. If `sequenceIndex` is absent, it assigns a deterministic index within that multi-file import batch and marks it `provenance:'import-batch'`. Do not infer a physical run across distinct `runId` values. See `sdk/ACQUISITION_ORDER.md`.

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

## 8. Scientific reactive dependencies

Use `ctx.data.reactive` when one scientific edit can invalidate derived results or multiple views. Plugins declare **what depends on what**; Core owns revisioning, transaction batching, dependency propagation, frame scheduling and stale async-result rejection. Do not encode scientific consistency as a chain of manual `renderX()` calls.

```js
const reactive = ctx.data.reactive;

reactive.derive('fit.metrics', {
  dependsOn:['fit.geometry','fit.algorithm'],
  compute:()=>computeMetrics(currentFit)
});

reactive.effect('fit.group-view', {
  dependsOn:['fit.metrics','fit.visibility'],
  scheduler:'frame',
  effect:()=>renderGroupView(reactive.value('fit.metrics'))
});

reactive.transact('move-fit-marker', tx=>{
  updateFitMarker(nextPosition);
  tx.touch('fit.geometry');
});
```

For asynchronous work, use a reactive derived node or `runLatest()`. Results whose dependency signature is no longer current are rejected rather than being allowed to overwrite a newer state. A drag, edit or algorithm switch should therefore publish semantic state changes once; dependent tables, inspectors and plots observe the same revision instead of maintaining unrelated plugin-local revision counters.

Range-selection tools must also declare their semantic target. A geometric rectangle may target an Entity type such as `science.resonance.peak`; it must not silently degrade into selecting every raw curve sample inside the same X interval.

### Core Task Runner progress

Worker-backed CPU work uses `ctx.tasks`; plugins do not create private Worker pools. A task worker may publish bounded progress through the worker context without gaining DOM/UI access:

```js
self.DKDSTaskDefinition={
  run(input,context){
    context.reportProgress({stage:'fit',completed:3,total:20,label:'Fitting'});
    return result;
  }
};

const handle=ctx.tasks.submit('fit',input,{key:'fit'});
const off=handle.onProgress(progress=>updateProgressUI(progress));
const result=await handle.promise;
off();
```

Core normalizes and coalesces progress, suppresses stale latest-wins generations, and stops delivery immediately on cancellation. `handle.progress` exposes the most recently delivered snapshot. See `sdk/TASK_RUNNER.md`.

## 9. Performance and scientific cache stages

Use `ctx.performance` for reusable computation caching and measurement. Plugins declare cache identity; Core owns storage, LRU/TTL budgets, lifecycle trim and diagnostics.

```js
const result = ctx.performance.stage(
  'fit-matrix',
  ctx.data.artifacts.artifactRevision(source.id),
  JSON.stringify({model, tolerance}),
  () => computeFitMatrix(source, {model, tolerance}),
  {limit:6}
);
```

Use `columnRevision(id, column)` for work owned by one DataTable payload, `artifactRevision(id)` for work owned by the complete known Artifact, `revision(kind)` for an aggregate over every current Artifact of that kind, and `fingerprint(id)` when the cache identity must remain valid across project save/restore. Artifact revisions are Store-local change stamps and are intentionally not persisted.

A plugin may inspect only its own namespace through `ctx.performance.snapshot()` and may trim only its own caches through `ctx.performance.trim()` / `trimAll()`. Do not create a plugin-private memoization Map for reusable scientific stages and do not access `window.DKDSPerformance` directly. Cache identity must contain every scientific input that changes the output.

Performance callbacks are invoked at most once per facade call. `null` and `undefined` remain valid results. Fulfilled Promise entries become resolved cache values; rejected Promise entries are evicted so a later call can retry.

## 10. Scientific plots

First-party and new plugins use `ctx.ui.scientificPlot` for all scientific interaction. Do not bind renderer-private events and do not manually restyle focused series.

ScientificPlot example:

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

For matrix/scalar-field results, use the same runtime rather than creating a plugin-private heatmap renderer:

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

When a trace/point Entity is focused, ScientificPlot automatically emphasizes the related trace/point and dims unrelated visible data. A click automatically enters the shared `InteractionRuntime`. Existing Core-managed scientific graphs may be adopted with `attach()`.

For Core `ScientificCurveSurface` (D3/SVG), declare `interaction` and stable `entityId` values on curves/markers. The surface derives the focused parent curve through the Entity graph and owns the same focus styling. Core also owns snapping, direct-manipulation geometry, post-drag click suppression, zoom/range gestures and range/window handles. Describe editable geometry through `getManipulators()`. Use `onManipulationPreview` only for pointer-rate visual feedback and persist domain/project state from the one-shot `onManipulationCommit` payload. A `range` manipulator always commits the complete `{start,end}` geometry even when only one handle moved. Domain callbacks remain optional for commands such as “open inspector” or “create manual peak”.

Use `ctx.ui.plotViews.bind(...)` for generic chart chrome, placement and CSV/image export:

```js
ctx.ui.plotViews.bind('fit:main', card, {
  plot, header:'.analysis-chart-title', fileStem:()=>`fit_${sampleId}`
});
```

A reusable chart **provider** is registered with `ctx.charts.register(...)`; plugins must not create renderer registries or bypass `ctx.ui.scientificPlot` for scientific presentation.

## 11. DOM, components and scheduling

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

## 12. Workspaces and view roles

SUPER and dedicated TOP are hosting modes of the same plugin UI. The semantic model is:

- **PRIMARY**: persistent main scientific work surface;
- **PRIME**: auxiliary high-frequency view, placeable inline/right/bottom/float/global through Core;
- **SUB**: full derived analysis that temporarily replaces PRIMARY and can return.

```js
const wb=ctx.ui.workspaceSurface.create(root,{header:false,activity:'my-analysis'});
wb.mountPrimary({ id:'main', label:'主界面', mainNode });
wb.registerPrime({ id:'inspector', label:'检查', semanticKind:'inspector', defaultPlacement:'right', placements:['inline','right','bottom','float'] });
wb.registerSub({ id:'physics', label:'物理分析', mount:({container})=>{/* domain content */} });
```

In Plugin API 1.19, `PRIMARY` is exactly one semantic main surface. `leftNode` and `leftHtml` are not public API. Keep domain-specific file lists, batch controls, plots and result tables inside `mainNode` when they are part of one main task; register any independently placeable control rail or inspector as a PRIME surface with `presentationRole`. If adjacent panes inside plugin-owned content need user-controlled space allocation, use `ctx.ui.layout.split(...)` rather than implementing a plugin-local resizer.

Core split layout keeps user intent separate from current geometry. `preferredSize`, `preferredRatio`, placement and collapse intent are retained while `effectiveSize` is resolved against the current viewport and platform profile. A hidden or transiently zero-sized surface therefore cannot erase its preferred size. Native Mobile limits are resolved inside the same `SplitController`; plugins must not patch controller methods or add orientation branches. `stateSnapshot()` exposes the current intent/effective result for diagnostics.

Every Core workspace region has an explicit scroll policy: `chain`, `contain`, `viewport` or `none`. `PluginWorkspace.layoutDiagnostics({limit})` inspects only the registered region set on demand and never rewrites plugin content. Plugins must fix an unsafe semantic container in their own layout instead of depending on a full-subtree runtime recovery scan.

`semanticKind` is a bounded Core semantic declaration for persistent PRIME/Portable surfaces. Use `inspector` only for a true persistent inspector; ordinary auxiliary panels use the default `panel`. Core converts this declaration into Component Identity and Material Role ownership. Plugins and themes cannot invent additional semantic kinds, selectors, or Material roles.

`presentationPurpose` is orthogonal to `semanticKind`. Every `data-control` PRIME is eligible for the same constrained-platform fixed control affordance, and its plugin-provided label is preserved (`参数`, `数据`, etc.). Use `presentationPurpose: 'parameters'` only to describe a parameter/settings surface. Keep its `semanticKind` as `panel`; `parameters` is functional metadata, not a Portable/Material kind.

Do not implement plugin-local drag/dock/floating/z-index logic. Use Workbench/Portable/PlotView APIs.

### Tooltip ownership

Core Chart Runtime owns the visual tooltip theme for ScientificPlot charts, and Core `.dkds-tooltip` owns the matching custom surface tooltip appearance. Plugins may define semantic hover content and formatting, but must not define independent tooltip background colors, opacity, borders, shadows or typography.

## 13. Actions, shortcuts and interaction

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

### Scientific axis compatibility

Before any cross-view adapter propagates numeric axis state, prove physical compatibility through the single Core Scientific Units owner. Axis titles, labels, column names and display strings are never compatibility evidence.

```js
const sourceAxis={unit:'mV',dimension:'voltage'};
const targetAxis={unit:'V',dimension:'voltage'};
const decision=ctx.science.units.compatibility(sourceAxis,targetAxis);
if(decision.compatible){
  const targetRange=interaction.convertAxisRange(sourceRange,sourceAxis,targetAxis);
}
```

`ctx.science.units` owns unit parsing and conversion. `InteractionRuntime.axisCompatibility(...)`, `canLinkAxes(...)`, `convertAxisValue(...)` and `convertAxisRange(...)` delegate to that owner and must not contain plugin/domain conversion tables. Unknown units, missing physical units and explicit dimension/unit conflicts fail closed. `a.u.` and `dB` are not silently treated as dimensionless. Supported conversions include SI-prefix scaling, common compound electrical units and affine conversions such as `°C ↔ K`.

Artifacts may carry optional semantic axis metadata (`dimension`, `quantity`, `xDimension`, `yDimension`, `valueDimension` and matching quantity fields) in addition to unit strings. These fields describe semantics; they do not replace the requirement for a known numeric unit when numeric state must be converted. Phase E 3.68.90 adds only this compatibility/conversion contract; it does not yet make plot viewports link automatically.

## 14. Project/state/service/module contracts

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

### Runtime service lifecycle control

`ctx.services.require('runtime')` exposes host runtime diagnostics and, on Desktop, explicit teardown of hidden reusable plugin windows. Hiding a reusable TOP is a warm-cache operation: managed scientific plots remain mounted so reopening does not deliberately regenerate them. Use `releaseActivityWindow(...)` only when the user explicitly chooses to reclaim a hidden renderer's process memory. The host only releases hidden child windows owned by the requesting main renderer; visible or foreign windows fail closed.

```js
const runtime = ctx.services.require('runtime');
const result = await runtime.releaseActivityWindow?.({ activityId, projectTabId, pid });
// result.released === 1 means the hidden renderer was actually closed.
```

A released activity performs a cold start the next time it is opened. Plugins must not call Electron IPC directly to emulate this lifecycle.

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

External plugin packages are single-active by plugin id. Scientific-version coexistence is represented only by multiple exact algorithm versions registered by the current active provider package; package history is not an execution source.

### Algorithm package catalog and recovery

Algorithm Provider packages publish a metadata-only catalog in the current manifest so Core can identify which exact algorithms the **currently installed package** can provide without executing candidate JavaScript:

```json
{
  "algorithmProvider": true,
  "algorithmCategories": ["peak-metrics"],
  "algorithmProvides": [
    {"category":"peak-metrics","id":"baseline-fwhm-v1","version":"1.0.0","title":"局部基线 FWHM"}
  ],
  "pluginDependencies": [
    {"id":"other.provider"}
  ]
}
```

`algorithmProvides` is an exact package catalog, not a substitute for runtime `register()`. Each entry belongs to a declared `algorithmCategories` value and uses an exact algorithm version. Package dependencies are current package IDs only. Candidate discovery is limited to providers installed under the current contract.

A consumer with a missing exact project lock may use `ctx.analysis.algorithms.locate(ref)` to inspect current installed providers and `recover(ref, candidate)` to enable/reload a current provider where supported. Recovery preserves the original `{category,id,version}` lock and verifies that the exact algorithm version registered successfully. It never substitutes another algorithm version.

Peak detectors are ordinary versioned Scientific Algorithms. Register them through `ctx.analysis.algorithms` with `category:'peak-detector'`; there is no detector-specific compatibility registry.

```js
ctx.analysis.algorithms.register('my.detector',{
  category:'peak-detector',
  inputTypes:['science.iv.raw'],
  outputTypes:['science.resonance.peak'],
  run(input,{parameters}){ return detect(input,parameters); }
});
```


## 15. Analysis providers, algorithms and workflows

```js
ctx.analysis.providers.register('my.analysis',{name:'My analysis',run});
ctx.analysis.algorithms.register('my.detector',{category:'peak-detector',version:'1.0.0',title:'Detector',parameterSchema,run});

ctx.workflow.processors.register('my.processor',{name:'Processor',inputKinds:['data.table'],outputKinds:['data.table'],parameterSchema,run});
```

Parameter UI is schema-driven. A detector/provider should not ship its own settings-widget framework.

## 16. Dedicated TOP windows

A top-level plugin declares `workspace.role="top"` and a `window` contract in `plugin.json`. The dedicated renderer loads only Core dependencies and that plugin's declared support files. `window-runtime.js` is a thin lifecycle/service adapter; domain algorithms and domain rendering stay in shared modules used by SUPER and TOP alike.

`ctx.ui.topWorkspace.register(...)` is also the platform-neutral Presentation contract for TOP surfaces. Declare `presentationRole` (`scientific-primary`, `data-primary`, `utility-primary`, `data-control`, `inspector`, or `scientific-secondary`) plus optional `priority` / `collapsible` metadata on `primary`, `prime`, and `sub` surfaces when Core needs their semantic role. Do not encode Desktop geometry into these fields and do not create platform branches such as `ctx.ui.desktop` or `ctx.ui.mobile`. Desktop and Mobile Presenters consume the same declaration and choose platform geometry downstream. For TOP workspaces, every independently placeable semantic region must be declared as its own PRIMARY/PRIME/SUB surface. `leftNode` / `leftHtml` no longer exist in Plugin API 1.19; use a PRIME `data-control` or `inspector` surface instead.

Mounted `ctx.ui.workspaceSurface` state is runtime state, not a second contract. Core merges it with the registered TOP declaration by surface id so live placement/activation can change without losing semantic Presentation metadata.

`window-runtime.js` must be registered as the plugin's `window-runtime` Core module. It must not duplicate feature logic.

## 17. Validation commands

Run before delivery:

```bash
npm run plugin:index
npm run plugin:validate
node tests/check-plugin-boundaries.js
npm run check
```

For changes to mature scientific algorithms also run `npm run science:parity` against a preserved baseline. See `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md` for the full development workflow.

### Managed tables and plugin defaults

Normal application/plugin tables are automatically enhanced by Core unless they opt out with `data-dkds-table="off"`. For explicit lifecycle/state control, declare `ui.table` and use `ctx.ui.tables`:

```js
const table = ctx.ui.tables.bind('results', root.querySelector('table'), {persist:true});
table.autoSizeAll();
table.setSort('value','asc');
table.setColumnVisible('notes', false);
await table.copyVisibleTable();
```

`ctx.ui.tables.mount(...)` can also render a table from semantic column/row definitions. Column width, visibility and sort state belong to TableSurface; plugins should not install private header draggers or global table observers. Anonymous transient tables are intentionally not persisted by default.

Declare `ui.settings` and use `ctx.ui.settings` for user defaults such as preferred view placement or default column count:

```js
const settings = ctx.ui.settings.define('defaults', {
  title:'Plugin defaults',
  defaults:{placement:'right'},
  fields:[{id:'placement',label:'Default placement',type:'select',options:['left','right','bottom']}]
});
const value = settings.get();
```

Plugin settings are user preferences. Scientific results and project-domain state still belong in the plugin project slice / Artifact model rather than SettingsSurface.
### Core Dialog Runtime

插件需要阻断式提示或确认时声明 `ui.dialogs` 并使用 `ctx.ui.dialogs`。不要调用 `window.alert / confirm / prompt`，这样亮暗主题、层级、键盘交互和窗口行为由 Core 统一管理。

```js
const ok = await ctx.ui.dialogs.confirm({
  tone:'warning',
  title:'确认操作',
  message:'该操作会修改当前插件数据。',
  confirmLabel:'继续'
});
```

`alert()`、`confirm()` 和 `prompt()` 都返回 Promise；弹窗 DOM 与视觉由宿主拥有。

### Theme profiles (`ctx.ui.theme`)

Theme Contract 3.9 将主题作为第一类 `pluginType: "theme"`。主题插件必须声明 `requiresCore: ["ui.theme"]`，通过 `ctx.ui.theme.register(id,{modes:{light:{...},dark:{...}},material:{...},motion:{...}})` 注册 profile，并可由插件中心或 `ctx.ui.theme.activate(id)` 激活。

外观 token 保留 `canvas / surface / surfaceSoft / surfaceElevated / surfaceSidebar / control* / text* / accent* / shadow* / radius*` 等基础语义，并在 Theme 3.8 新增 `accentAlt*`、`success / warning / danger / info` 与 `*Soft`、`selectionSurface / selectionText / selectionBorder`、`activeSurface / activeText`、`disabledSurface / disabledText`。Motion token 包括 `motionFast`, `motionNormal`, `motionSlow`, `easeStandard`, `easeEmphasized`, `hoverLift`, `pressScale`。

Theme 3.8 还允许 `appearance.roles.chrome|sidebar|surface|elevated|popover|control|floating` 对各 Material Role 仅覆盖 `surface / border / text`，以及可选 `scientific.seriesPalette` 作为自动科学序列配色的 fallback。显式用户/插件科学颜色始终优先于 Theme palette。

主题只拥有语义视觉和受控动效，不拥有 Core/其他插件的布局或 DOM。`prefers-reduced-motion: reduce` 始终优先于主题 motion。结构分区应依靠 surface 色差和间距，`divider` 只用于必要结构线，输入框/按钮使用独立 `controlBorder`。


Theme Contract 3.9 material tokens: `materialBlur`, `materialBlurStrong`, `materialSaturation`, `materialTintOpacity`, `specularHighlight`, `innerHighlight`, `glassEdge`, `materialNoiseOpacity`. Core owns material selectors/recipes; Theme plugins only provide token values. `materialTintOpacity` is a historical name: for translucent recipes it is the semantic base-surface fill opacity (0..1), not an accent-color tint percentage. Core applies recipe-level readability floors and identical composition rules to built-in and SDK Theme profiles.

### Table ↔ curve reference selection (3.68.91)

SDK 1.41.0 adds the first concrete Phase E cross-view adapter. `ctx.ui.tables.bind(..., {interaction, selection:{artifactId,...}})` routes row activation through the existing `InteractionRuntime.bindView()` path. A table row projects by `artifactId + rowId`; a plotted point retains exact `artifactId + seriesId + rowId`. `ctx.ui.scientificPlot` can derive point references from trace `artifactId`, `seriesId` and optional `rowIds`, while `ScientificCurveSurface` opts in with `selectionTarget:'point'`. This does not add another Selection event or make viewports link automatically. See `sdk/CROSS_VIEW_SELECTION.md`.

### Heatmap cell ↔ source scan reference selection (3.68.92)

SDK 1.42.0 extends `ctx.ui.scientificPlot.scalarField(...)` with `sourceScans`, a Y-axis-aligned list of stable Selection references. Core resolves a cell to its scientific source scan lazily from the renderer's `yIndex`; heatmap coordinates are not promoted to permanent identity. Selected scans project back to bounded row overlays over the existing Canvas raster, so a large matrix still creates zero per-cell SVG Selection nodes. Source-scan curves may opt into `selectionTarget:'series'`; the default remains point targeting. TER transformed heatmap ↔ all-Vg R–V is the first-party adoption. See `sdk/CROSS_VIEW_SELECTION.md`.

### Scientific viewport linking (3.68.93)

SDK 1.43.0 adds opt-in ScientificPlot viewport linking through `viewportPolicy` plus explicit scientific `axisSemantics`. Viewport envelopes use `dkds.viewport-state.v1` on the existing project-scoped Interaction bridge as `channel:'viewport'`; they are not Selection documents and do not mutate Selection schema 2. Each linked axis independently passes Core Scientific Units quantity/dimension/unit compatibility and is converted into the target unit before apply. Unknown units and explicit quantity mismatches fail closed. Remote viewport state preserves the original transaction and is not rebroadcast, so the existing A→B→A cycle suppression applies. See `sdk/VIEWPORT_LINKING.md`.



## Portable / PRIME dock sizing

`panels.create` and `registerPrime` accept `sizing: 'content' | 'fill'`.
The default `content` retains intrinsic card height. `fill` consumes the remaining
height of its bounded dock, shares space with other fill panels, and ignores saved
intrinsic card height. Short docks scroll instead of clipping controls. This policy
applies only while docked; floating windows and mobile drawer/companion projection
retain their existing platform sizing. Invalid values throw. No frame polling or
geometry measurement is needed. Core owns the Portable root's flex layout; place
plugin grids inside a separate content node, and make table hosts scroll there.

```js
workbench.registerPrime({
  id: 'parameters', label: '参数', existingNode: parameterPanel,
  sizing: 'fill', chrome: false, defaultPlacement: 'left', placements: ['left']
});
```
