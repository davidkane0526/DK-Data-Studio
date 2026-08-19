# DK Data Studio Plugin API v1.8

Plugin API v1.8 defines a **Core-first contract**: a plugin owns domain definitions, scientific algorithms, domain state and view content, but it does not own application infrastructure. File access, import/export routing, charts, DOM lifecycle, component primitives, workspace geometry, selection, interaction, project persistence, services, capabilities and dedicated-window lifecycle are supplied by Core.

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
    "io", "data.flow", "data.artifacts", "data.types",
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
- canonical Artifact/Data Model and typed data-flow registries;
- Plotly/D3 access, chart lifecycle, resize and purge;
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
- base services: `io`, `science`, `services`, `modules`, `recipes`, `capabilities`, `parameters`;
- data: `data.flow`, `data.artifacts`, `data.types`, `data.model`, `data.formula`;
- analysis/workflow: `workflow`, `analysis.providers`, `analysis.detectors`;
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

## 6. Domain data types and selection

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

Keep selection payloads compact. Large arrays stay in Artifacts/project/service state.

## 7. Charts

All Plotly interaction goes through `ctx.ui.charts` / `ctx.ui.plotViews`:

```js
await ctx.ui.charts.react(plot, traces, layout, config);
ctx.ui.charts.resize(plot);
await ctx.ui.charts.saveImage(plot, 'fit_result', 'png');

ctx.ui.plotViews.bind('fit:main', card, {
  plot,
  header:'.analysis-chart-title',
  fileStem:()=>`fit_${sampleId}`
});
```

A reusable chart **provider** is registered with `ctx.charts.register(...)`; a plugin must not create its own renderer registry.

## 8. DOM, components and scheduling

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

## 9. Workspaces and view roles

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

## 10. Actions, shortcuts and interaction

```js
ctx.ui.actions.mount(actionsHost,{actions:[
  {id:'run',label:'运行',shortcut:'Ctrl+Enter',onInvoke:run}
]});
ctx.ui.shortcuts.add({id:'delete-peak',chord:'Delete',activity:'my-analysis',handler:deletePeak});

const interaction=ctx.ui.interaction.create('analysis',{selection:{multiple:true}});
interaction.bind('inspector',{types:['result.analysis'],onSelection:renderInspector});
```

Core owns keyboard routing and selection lifecycle. Plugins only describe domain behavior.

## 11. Project/state/service/module contracts

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

## 12. Analysis providers, detectors and workflows

```js
ctx.analysis.providers.register('my.analysis',{name:'My analysis',run});
ctx.analysis.detectors.register('my.detector',{name:'Detector',parameterSchema,detect});
ctx.workflow.processors.register('my.processor',{name:'Processor',inputKinds:['data.table'],outputKinds:['data.table'],parameterSchema,run});
```

Parameter UI is schema-driven. A detector/provider should not ship its own settings-widget framework.

## 13. Dedicated TOP windows

A top-level plugin declares `workspace.role="top"` and a `window` contract in `plugin.json`. The dedicated renderer loads only Core dependencies and that plugin's declared support files. `window-runtime.js` is a thin lifecycle/service adapter; domain algorithms and domain rendering stay in shared modules used by SUPER and TOP alike.

`window-runtime.js` must be registered as the plugin's `window-runtime` Core module. It must not duplicate feature logic.

## 14. Validation commands

Run before delivery:

```bash
npm run plugin:index
npm run plugin:validate
node scripts/check-plugin-boundaries.js
npm run check
```

For changes to mature scientific algorithms also run `npm run science:parity` against a preserved baseline. See `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md` for the full development workflow.
