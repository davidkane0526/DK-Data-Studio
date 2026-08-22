# DK Data Studio Plugin SDK 1.15

This directory is a **standalone plugin-development kit**. A plugin developer does not need the DK Data Studio source tree.

## Requirements

- Node.js 18 or newer for validation/packaging.
- DK Data Studio 3.61.12 or newer for the full Plugin API 1.15 contract. Plugin API 1.10–1.14 packages remain load-compatible where their declared requirements are available.

## Create a plugin

Copy one template directory and change the plugin id/name/version.

```text
sdk/templates/workspace-plugin/     full UI/workbench example
sdk/templates/algorithm-provider/   versioned scientific algorithm example
sdk/templates/tool-plugin/           lightweight tool / top Tools-menu example
```

The public runtime entry is `DKDSPlugins.define(manifest, activate)`. New plugins target `apiVersion: "1.15.0"`, declare every Core surface they use in `requiresCore`, and declare a `pluginType` (`foundation`, `data`, `algorithm`, `workbench`, `task`, `tool`, `extension`, or `developer`) for Plugin Manager grouping.

## Algorithm plugins

Yes. Algorithm plugins are a first-class SDK type. Use `pluginType: "algorithm"`, declare `algorithmProvider: true`, `algorithmCategories`, and machine-readable `algorithmProvides`, then register implementations through `ctx.analysis.algorithms.register(...)`. Algorithms should not own workbench UI; compatible workbench/task plugins resolve and invoke them through the versioned Algorithm Registry. See `sdk/templates/algorithm-provider/`.

详细规范与示例另见 [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md)。

## Tool plugins (Plugin API 1.15)

Use `pluginType: "tool"` for lightweight reusable utilities that do not need a dedicated analysis workbench. Core owns the top-level **工具** button. A tool plugin registers Commands and contributes one or more menu actions through `ctx.ui.menus.add(...)`; for a `tool` plugin the default menu is automatically `tools`, so the plugin must not add its own top-level shell button.

```js
ctx.commands.register('com.example.tool.run', () => {
  // utility logic
});
ctx.ui.menus.add({ id:'run', label:'示例工具', command:'com.example.tool.run' });
```

A tool may use public data/artifact, table, chart, settings, clipboard, or service APIs as declared in `requiresCore`, but it must not bypass Core lifecycle or create private global menus. See `sdk/templates/tool-plugin/`.

## Core display-scale interaction

All Core-owned XY/scatter/curve plots support **double-click the Y axis or left Y-label region → toggle linear/log display**. Log mode renders a view-only `|Y|` projection; it does not mutate source Artifacts, plugin-domain data, pipeline inputs, project persistence, or CSV/data exports. `Y = 0` remains in the source data but cannot be rendered on a logarithmic axis. For heatmaps/scalar fields, the same display contract applies to the **Z/color scale** instead: double-click the colorbar/right color-scale region to toggle a view-only `log10(|Z|)` color mapping while X/Y coordinates stay unchanged. Plugins should not implement duplicate axis/colorbar scale handlers or bypass the Core chart/surface runtimes.

## Validate

```bash
node sdk/tools/dkds-plugin.js validate path/to/my-plugin
```

Validation checks the manifest, referenced files, runtime-manifest parity, declared Core requirements and forbidden infrastructure bypasses.

## Package

```bash
node sdk/tools/dkds-plugin.js package path/to/my-plugin my-plugin.dkplugin
```

Install the resulting `.dkplugin` from DK Data Studio's Plugin Manager.

## Public contract

- `plugin-manifest.schema.json` — machine-readable manifest contract.
- `plugin-api.d.ts` — editor/TypeScript declarations for `DKDSPlugins` and `ctx`.
- `contract.json` — SDK/API/package versions.

Plugins own domain logic, domain state, domain types and domain views. Core owns application infrastructure: project persistence, I/O, artifacts, entities, selection, workspace layout, chart lifecycle, scheduling and plugin lifecycle.

For direct scientific curve interaction, use `ctx.ui.scientificPlot.create(...)`. Core owns pointer-rate geometry editing, snapping, range/zoom gestures and focus styling through domain-neutral **manipulators**. Declare `getManipulators()` with `point`, `axis`, or `range` primitives and persist domain changes only from `onManipulationCommit`. A peak position, threshold line, fit/integration interval, crop range, baseline control, or FWHM analysis window is a plugin-domain interpretation of these same Core primitives; plugins must not implement private D3 drag loops or introduce feature-named handle contracts.

Example:

```js
const surface = ctx.ui.scientificPlot.create(svg, {
  getCurves: () => curves,
  getMarkers: () => annotations,
  getManipulators: () => [
    { id:'cursor', kind:'axis', axis:'x', geometry:{value:cursorX} },
    { id:'fit-window', kind:'range', axis:'x', geometry:{start:fitLeft,end:fitRight}, constraints:{minSpan:0.01} },
    { id:'control-point', kind:'point', targetId:'annotation-1', geometry:{x:pointX,y:pointY}, snap:{kind:'curve',curveId:'curve-1'} }
  ],
  onManipulationCommit: ({manipulator,geometry}) => {
    // Map generic geometry to your plugin's own domain state here.
  }
});
```

The deprecated marker/FWHM-named callbacks remain only as a compatibility adapter and are not the reference architecture for new plugins.


### Workbench navigation, icons and scoped project data

Plugin API 1.13 treats a `pluginType: "workbench"` page with no explicit TOP/SUPPORT workspace role as a standalone primary activity by default. `ctx.ui.pages.add(...)` therefore creates a top-level activity instead of a contextual button unless the plugin explicitly requests `presentation: "toolbar"`. An explicit manifest/page icon is optional; Core supplies a stable category default icon.

Use `ctx.data.sources` for imported project sources. Workbench plugins receive a scoped read view automatically, so `list()` returns only sources assigned to that workbench. Physical data remains canonical and is stored once; assignments are many-to-many. Import/Data Center own assignment changes, avoiding one importer per analysis plugin and avoiding unrelated workbench data pollution.

`ctx.ui.scientificPlot.create(target, spec)` accepts either an SVG element or an ordinary container. For a normal container Core creates and owns the internal SVG, sizing and lifecycle. Plugins should not create private D3/SVG interaction infrastructure.

### Interaction Behavior

Input policy is a separate Core contract from scientific geometry. Use `ctx.ui.interactionBehaviors` to declare how normalized gestures map to intents or Commands. Plugin code should not own raw keyboard listeners, private right-click menus, or feature-specific box-selection branches.

The stable Interaction Behavior gesture vocabulary introduced in Plugin API 1.12 is `click`, `double-click`, `context`, `drag`, `box`, `wheel`, and `key`. Keyboard bindings use a complete normalized chord such as `Ctrl+Z`, `Ctrl+ArrowLeft`, or `Shift+ArrowLeft`. Context actions are rendered by Core, and a scientific surface resolves direct manipulation before selection/background gestures.

```js
ctx.commands.register('sample.reset-range', () => {
  // Commit plugin-domain state here.
});

ctx.ui.interactionBehaviors.create('sample-keys', {
  activity: 'sample',
  bindings: [
    { gesture:'key', target:'keyboard', chord:'Ctrl+R', command:'sample.reset-range' }
  ]
});

const surface = ctx.ui.scientificPlot.create(svg, {
  interactionBehavior: {
    bindings: [
      { gesture:'context', target:'marker', button:'secondary', contextActions: ({marker}) => [
        { id:'remove', label:'删除', command:'sample.remove-marker' }
      ]},
      { gesture:'box', target:'background', modifiers:['ctrl'], intent:'zoom-box', priority:20 },
      { gesture:'box', target:'background', intent:'select-region' }
    ]
  }
});
```

The intended execution path is **Input → Interaction Binding → Intent / Command → domain transaction**. Toolbar buttons, menus, keyboard shortcuts, and context actions should converge on the same registered Command when they perform the same semantic operation.

Persistent plugin state must be registered through `ctx.project.registerSlice(...)`. `restore` receives only the plugin's canonical namespaced slice; old application root fields are migrated by DK Data Studio before plugin runtime starts. A missing slice is fresh/reset state, not a signal to inspect the project root.

Do not use application source files or private globals from a plugin. If a feature cannot be implemented through this SDK, that is a missing public Core contract and should be added to the SDK/Core rather than worked around by importing application source.

For a windowed activity that must reflect the **exact live project Artifact Store** at open/reuse time, Core supports the generic live-hydration contract. Declare it in the machine-readable window manifest and, when the activity is registered dynamically, mirror it on the Activity spec:

```json
{
  "window": {
    "activity": "data-inspector",
    "artifactHydration": "live"
  }
}
```

```js
ctx.ui.activities.add({
  id: 'data-inspector',
  label: '数据检查',
  openMode: 'window',
  artifactHydration: 'live'
});
```

`artifactHydration: 'live'` is intentionally opt-in because it transfers the canonical live Artifact snapshot, including transient legacy adapters, into that activity renderer. Core reconciles that snapshot with self-contained legacy `project.datasets`, so an empty or incomplete live snapshot cannot erase recoverable legacy source data. Reused live-hydration windows also refresh when only the Artifact digest changes, without remounting the plugin. Ordinary analysis TOP windows should normally keep project hydration and rely on Artifact delta synchronization instead of requesting a full live snapshot. Plugins must not parse legacy project roots inside the activity window.

## Core-owned workbench import action (Plugin API 1.14)

A `pluginType: "workbench"` plugin does **not** create its own “导入数据” button, `<input type="file">`, or file-picker flow. Core automatically contributes one standard import action for the workbench and opens the shared Import Workbench in scoped mode.

Declare the semantic data accepted by the workbench:

```json
"data": { "accepts": ["science.transport.iv"] }
```

Scoped mode locks the assignment target to the current plugin, hides the global “数据用途” selector, and only lists Importer Providers whose `outputTypes` intersect `data.accepts`. Legacy workbenches without `data.accepts` still receive the standard action for compatibility, but new Plugin API 1.14 workbenches should always declare accepted types.

To choose the standard action position, the plugin may provide an **empty Core-owned slot** in its page header:

```html
<div data-dkds-slot="workbench-import"></div>
```

The plugin must not place custom content in that slot. If the slot is absent, Core inserts the action in the standard workbench header action area. In an embedded SUPER workspace, the same Core action is projected into the host contextual toolbar instead of duplicating a hidden page-header button. The global shell “导入数据” action remains the full routing mode for assigning one import to multiple workbenches.

`ctx.data.importWorkbench` remains available for older packages and non-workbench infrastructure, but new Plugin API 1.14 workbench UI should not invoke it directly.

## Project source-data lifecycle (Plugin API 1.13)

Imported file lifetime and physical storage are owned by the project host, not by an analysis workbench. A workbench reads its assigned source catalog through the scoped `ctx.data.sources` API and opens the centralized importer through `ctx.data.importWorkbench`:

```js
const rows = ctx.data.sources.list();

// Open the shared Import Workbench with this workbench preselected as consumer.
ctx.data.importWorkbench.open();

// Remove only this workbench's assignment; the physical source remains available
// to other workbenches and Data Center.
ctx.data.sources.detach({ artifactId: rows[0].artifactId });
```

A `data` or `foundation` plugin may manage global assignments through `ctx.data.sources.setAssignments(...)`. Ordinary workbenches cannot mutate another workbench's assignment. Physical source deletion is a Data Center / host action because deletion also removes dependent Artifact lineage.

`ctx.capabilities.proxy('core.data-sources')` remains a compatibility facade for older Plugin API packages. New Plugin API 1.14 workbenches use `ctx.data.sources`; their visible import action is Core-owned. `ctx.data.importWorkbench` remains a compatibility/infrastructure API.

### Canonical DataTable shape

A `data.table` Artifact is columnar. Plugins must not assume imported project data exposes private `points`, `rows`, `records` or application-specific dataset arrays. Read `artifact.columns`, or request a row projection only when needed:

```js
const table = ctx.data.artifacts.get(source.artifactId);
const rows = ctx.data.model.rows(table);
```

Columnar storage is the canonical project representation; `ctx.data.model.rows(table)` is a convenience projection and should not be cached as a second copy of the source data.

## Unified TableSurface (DK Data Studio 3.59+)

Data/scientific tables are a Core UI surface just like plots. Existing `<table>` elements are enhanced automatically unless they set `data-dkds-table="off"`; plugins can also bind or create them explicitly through `ctx.ui.tables`.

```js
const table = ctx.ui.tables.mount('summary-table', container, {
  columns: [
    { key: 'vg', label: 'Vg', unit: 'V' },
    { key: 'value', label: 'Value' }
  ],
  rows
});
```

The shared surface owns column resize, double-click auto-size, sorting, header actions, column hide/restore, cell/row copy, persisted column state and lifecycle. Plugins should not implement separate column-resize/sort/context-menu code for ordinary data tables. `bind(id, table)` adapts an existing DOM table; `mount(id, container, spec)` creates one through the same runtime.


## Plugin settings (DK Data Studio 3.59+)

插件需要保存“新工程/新窗口默认值”时使用 `ctx.ui.settings`，不要把用户偏好塞进 Core 或工程根字段。设置按插件 ID 独立持久化，并可通过统一设置对话框编辑。

```js
const settings = ctx.ui.settings.define('defaults', {
  title: '插件默认设置',
  defaults: { placement: 'right', columns: 'auto' },
  fields: [
    { id: 'placement', label: '默认位置', type: 'select', options: ['left', 'right'] },
    { id: 'columns', label: '每行列数', type: 'select', options: ['auto', '2', '3'] }
  ],
  onApply: value => service.setUserDefaults(value)
});

settings.open();
```

插件设置是**用户默认偏好**；当前工程已经保存的布局/分析状态仍由插件自己的 project slice 决定。
