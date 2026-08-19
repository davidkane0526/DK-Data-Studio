# AI Plugin Development Guide — Plugin API v1.8

This guide is intended to let another AI implement a complex DK Data Studio plugin without inventing host-specific infrastructure.

## 1. Non-negotiable architecture rule

**If a capability is generic enough to be reused by another plugin, it belongs to Core.** A plugin may define domain algorithms, domain data types, domain state and domain view content, but it consumes application mechanisms only through Plugin API v1.8.

Before writing code, search `docs/PLUGIN_API.md`, `src/plugins/_template`, the manifest schema and existing Core registries. If the needed generic mechanism is missing, add it to Core first, document it, add a machine check, then consume it from the plugin.

Never solve missing architecture with a plugin-local patch.

## 2. Classify the requested feature

### Import/export format
Register `ctx.data.importers/exporters`. Core owns dialogs, reads, saves and clipboard via `ctx.io`.

### Analysis algorithm
Keep the pure algorithm in a plugin support module and expose it through `ctx.analysis.providers`, `ctx.analysis.detectors`, `ctx.workflow.*` or `ctx.capabilities` depending on its role.

### Scientific workspace
Use Core AnalysisWorkbench with PRIMARY / PRIME / SUB, Core PlotViews, Core Actions and Core Interaction Runtime. Do not build another pane/dock/window framework.

### Generic infrastructure
If multiple unrelated plugins could need it (file bridge, drag/resize, worker queue, chart export, typed selection, responsive grid, service discovery), implement it in `src/core/` and expose it through `ctx`.

## 3. Start from the template

Copy `src/plugins/_template` to `src/plugins/<folder>`. Choose a permanent reverse-domain or project-qualified ID. Set API `1.8.0` and list exact Core dependencies in `requiresCore`.

`plugin.json` and the runtime manifest inside `plugin.js` must contain identical `requiresCore` arrays. Validation enforces this.

## 4. Recommended complex-plugin file layout

```text
my-plugin/
  plugin.json              # machine contract
  plugin.js                # thin composition/registration entry
  model.js                 # domain model / pure state helpers
  analysis.js              # pure scientific algorithms
  controller.js            # domain commands and state transitions
  shared-views.js          # domain view content mapped to Core surfaces
  feature-runtime.js       # shared SUPER/TOP feature composition
  super-layout.js          # thin SUPER adapter only
  window-runtime.js        # thin TOP adapter only
  style.css                # domain-specific visual tokens only
  README.md
```

Support files register into `DKDSPluginModules`; they do not export `window.DKDSMyPlugin...` globals. `plugin.js` obtains them through `ctx.modules.require(...)`.

## 5. Build the data contract before UI

Define:

```text
canonical inputs
→ validation/normalization
→ pure domain algorithm
→ serializable result
→ registered domain data/result type
→ UI projection
```

Do not read calculation settings from arbitrary Core DOM. Do not make Plotly traces the canonical result. Do not store a second copy of imported data when Artifacts already owns it.

For large data, selection carries IDs/references/previews, not full arrays.

## 6. Register data flow

Example importer:

```js
ctx.data.importers.register('vendor-x',{
  extensions:['csv','txt'],
  async run(input,options){
    const parsed=parseVendorX(input.text,options);
    return parsed.map(toArtifact);
  }
});
```

Example transform/analyzer/exporter:

```js
ctx.data.transformers.register('baseline-correct',{run:({value,settings})=>baseline(value,settings)});
ctx.data.analyzers.register('lorentz-fit',{run:({value,settings})=>fitLorentz(value,settings)});
ctx.data.exporters.register('fit.csv',{run:({value})=>fitCsv(value)});
```

Use `ctx.data.model` and `ctx.data.formula` for standard table/column operations. Use `ctx.science` for shared mature scientific primitives.

## 7. Define domain types and interaction

Register raw/derived/result types with stable IDs and parent types. Then create one Core interaction context for linked plots/tables/inspectors.

```js
ctx.data.types.register('raman.peak',{parents:['result.analysis','data.point'],kind:'result',key:p=>p.id,selection:p=>({id:p.id,ref:{peakId:p.id},value:{x:p.x,width:p.width}})});
const interaction=ctx.ui.interaction.create('raman',{selection:{multiple:true,defaultType:'raman.peak'}});
```

Views bind to semantic types, not each other's DOM IDs.

## 8. Build UI only from Core mechanisms

Core owns the page/workbench, placement, resize, charts, generic controls and lifecycle. Plugins provide domain content.

- page: `ctx.ui.pages.add`;
- workspace: `ctx.ui.analysisWorkbench` / `workspaceSurface`;
- PRIMARY/PRIME/SUB: Workbench registration;
- generic controls: `ctx.ui.components.mount` and `ctx.parameters.render`;
- persistent DOM listeners/observers/timers: `ctx.ui.dom`;
- charts: `ctx.ui.charts` and `ctx.ui.plotViews`;
- actions: `ctx.ui.actions`;
- menus: `ctx.ui.menus` / `ctx.ui.contextMenus`;
- shortcuts: `ctx.ui.shortcuts`;
- selection: `ctx.ui.interaction`;
- status: `ctx.status.set`.

A plugin-specific panel may contain scientific labels/controls/results, but its docking, floating, drag, z-order, responsive sizing, lifecycle and chart export are Core responsibilities.

## 9. SUPER/TOP parity rule

A complex top-level plugin has exactly one domain implementation. SUPER and TOP adapters map the same Controller/View/Feature modules into different host containers.

Adapter rules:

```text
allowed: container mapping, host lifecycle, snapshot/service wiring
forbidden: scientific calculation, chart construction, duplicated ViewModels, domain event logic
```

If SUPER and TOP need different scientific code, the architecture is wrong.

## 10. Internal modules vs services vs capabilities

Use the correct registry:

- `ctx.modules`: private package composition between files of the same plugin;
- `ctx.services`: runtime service lookup supplied by Core/host;
- `ctx.capabilities`: behavior that another plugin or dedicated renderer may discover/invoke;
- `ctx.analysis.providers/detectors`: typed scientific provider catalogs;
- `ctx.workflow.*`: reusable processing graph nodes.

Do not use a private global as a registry.

## 11. Project persistence

Use `ctx.state.create(...,{projectSlice})` for simple plugin state. Use `ctx.project.registerSlice` for complex serialization/migration. Keep UI placement preferences separate from scientific project results when possible.

Dedicated windows synchronize namespaced plugin slices and artifact deltas. Do not replace the whole project from a TOP window.

## 12. Performance rules

- Keep canonical large arrays in Artifacts/services, not Selection.
- Coalesce visual resize/render work with Core scheduling.
- Use Core chart `react/resize/purge`; never construct parallel chart lifecycles.
- Avoid re-rendering hidden views on every event.
- Dispose service subscriptions/listeners through Core scopes.
- Prefer event delegation or stable Core bindings for frequently rebuilt rows.
- Keep pure computation separate so it can later move to workers without changing UI.
- Do not split a large file merely by line count; split at stable dependency/lifecycle seams.

## 13. Patch-integration rule

When you find code whose purpose is “fix this host edge case for plugin X”, ask whether it is domain behavior or generic host behavior.

- domain behavior → move into the plugin's model/controller/algorithm;
- generic shell/layout/import/lifecycle behavior → move into Core service/runtime/recipe;
- duplicated SUPER/TOP behavior → move into shared plugin feature modules;
- private utility registry → replace with a typed Core registry.

A patch is not complete until its ownership is explicit and a regression test prevents it returning to the wrong layer.

## 14. Required tests for a complex plugin

At minimum:

1. manifest/schema validation;
2. boundary scan;
3. pure algorithm tests using generated deterministic data;
4. importer/exporter round-trip if applicable;
5. project serialize/restore test;
6. SUPER/TOP shared-module architecture test if it has a dedicated window;
7. interaction/selection test for linked views;
8. chart/export smoke test through Core APIs;
9. visual regression or same-layout comparison for mature migrated UI;
10. `npm run check`.

For modifications to mature scientific engines, compare output against a preserved Git baseline, not merely against a newly generated expected value.

## 15. Validation loop

```bash
npm run plugin:index
npm run plugin:validate
node scripts/check-plugin-boundaries.js
npm run check
```

The boundary checker rejects direct Electron, raw Plotly, raw document infrastructure access, private observers/schedulers, `ctx.host`, untyped generic registries, private DKDS globals and direct host-recipe access.

## 16. Completion checklist

A plugin is ready only when:

- every Core dependency is declared;
- no host/core source file contains plugin-specific UI or algorithm branches merely to support it;
- no plugin owns generic infrastructure;
- no private global/module registry exists;
- SUPER/TOP share domain implementation;
- data/import/export/chart/UI lifecycle all route through Core;
- generated-data and project regression tests pass;
- existing UI/function behavior is unchanged unless the product requirement explicitly asked to change it.
