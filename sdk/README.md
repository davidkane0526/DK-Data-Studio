# DK Data Studio Plugin SDK 1.17.0

This directory is a **standalone plugin-development kit**. A plugin developer does not need the DK Data Studio source tree.

## Requirements

- Node.js 18 or newer for validation/packaging.
- DK Data Studio 3.61.33 or newer for the complete SDK 1.17.0 host guarantees. Plugin API 1.10–1.16 packages remain load-compatible where their declared requirements are available.

## Create a plugin

Copy one template directory and change the plugin id/name/version.

```text
sdk/templates/workspace-plugin/     standalone workbench activity example (not TOP)
sdk/templates/top-workspace-plugin/ true TOP + dedicated-window workbench example
sdk/templates/algorithm-provider/   versioned scientific algorithm example
sdk/templates/tool-plugin/           Tool Workspace example (TOP-equivalent lifecycle, Tools-menu entry)
```

For the complete dedicated-window contract, see [`TOP_WORKSPACES.md`](./TOP_WORKSPACES.md). Tool workspaces use the same lifecycle and are documented alongside it in [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md).

The public runtime entry is `DKDSPlugins.define(manifest, activate)`. New plugins target `apiVersion: "1.17.0"`, declare every Core surface they use in `requiresCore`, and declare a `pluginType` (`foundation`, `data`, `algorithm`, `workbench`, `task`, `tool`, `extension`, or `developer`) for Plugin Manager grouping.

## Algorithm plugins

Yes. Algorithm plugins are a first-class SDK type. Use `pluginType: "algorithm"`, declare `algorithmProvider: true`, `algorithmCategories`, and machine-readable `algorithmProvides`, then register implementations through `ctx.analysis.algorithms.register(...)`. Algorithms should not own workbench UI; compatible workbench/task plugins resolve and invoke them through the versioned Algorithm Registry. See `sdk/templates/algorithm-provider/`.

详细规范与示例另见 [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md)。

## Tool plugins (Plugin API 1.16)

`pluginType: "tool"` is a host category parallel to TOP workbenches. A **Tool Workspace** uses the same `workspace.role: "top"` + dedicated `window` + `ctx.ui.activities` + `ctx.ui.topWorkspace` contract as TOP; Core simply places its opener under the global **工具** button instead of the TOP activity strip. No additional Tool-only semantics are imposed yet.

Command-only tools remain supported as a lightweight form through `ctx.ui.menus.add(...)`. See [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md) and `sdk/templates/tool-plugin/`.

## Core display-scale interaction

All Core-owned XY/scatter/curve plots support **double-click the Y axis or left Y-label region → toggle linear/log display**. Log mode renders a view-only `|Y|` projection; it does not mutate source Artifacts, plugin-domain data, pipeline inputs, project persistence, or CSV/data exports. `Y = 0` remains in the source data but cannot be rendered on a logarithmic axis. For heatmaps/scalar fields, the same display contract applies to the **Z/color scale** instead: double-click the colorbar/right color-scale region to toggle a view-only `log10(|Z|)` color mapping while X/Y coordinates stay unchanged. Plugins should not implement duplicate axis/colorbar scale handlers or bypass the Core chart/surface runtimes.

## Validate

```bash
node sdk/tools/dkds-plugin.js validate path/to/my-plugin
```

Validation checks the manifest, referenced files, runtime-manifest parity, declared Core requirements and forbidden infrastructure bypasses. For Plugin API 1.16 workspaces it also lints CSS/layout ownership: Core shell selectors, semantic `overflow:hidden/clip`, and viewport-height ownership are rejected before packaging. Positive-pixel `minmax(...,1fr)` rows are release-blocking in scientific/workspace-critical regions and reported as warnings in ordinary internal grids, so the validator stays strict where blank/clipped scientific UI can occur without over-constraining normal plugin layout.

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

`pluginType: "workbench"` describes a UI/analysis plugin category; it does **not** make the plugin a TOP. A workbench with no explicit `workspace.role: "top"` is a standalone activity hosted by the main shell and does not own a dedicated TOP window. Use `sdk/templates/workspace-plugin/` for that simpler case.

A **true TOP workbench** must keep four contracts aligned:

1. Manifest: `workspace.role: "top"` with a stable `workspace.activity`.
2. Manifest: a dedicated `window` whose `activity` exactly matches `workspace.activity`.
3. Runtime: `ctx.ui.activities.add({ id: <activity>, openMode: "window", ... })`.
4. Runtime: `ctx.ui.topWorkspace.register({ activity: <activity>, ... })`.

Core then gives the plugin the same host semantics as built-in TOPs: normally it opens in a reusable dedicated window; when promoted to SUPER, the same activity/layout is embedded in the main shell instead of creating a second implementation. Plugin API 1.16 validation rejects incomplete or mismatched TOP contracts. Start from `sdk/templates/top-workspace-plugin/`.

Use `ctx.data.sources` for imported project sources. Workbench plugins receive a scoped read view automatically, so `list()` and `targets()` are synchronous reads in every host, including dedicated TOP windows. Physical data remains canonical and is stored once; assignments are many-to-many. Import/Data Center own assignment changes, avoiding one importer per analysis plugin and avoiding unrelated workbench data pollution.

#### Bounded scientific layout

Viewport-owned scientific charts must live in a bounded layout. Prefer the default `primaryScroll: "safe"` (or declare it explicitly). Core owns the outer safety scroll region and recovers semantic plugin containers that would otherwise clip real content. Every CSS ancestor between the workspace and a fill-height plot should use a definite/bounded height plus `min-height: 0`; grid rows that own a chart should normally use `minmax(0, 1fr)`.

Do **not** combine an intrinsic-height/auto-sized parent with `minmax(<positive px>, 1fr)` and a responsive scientific plot. A plot resize can then increase the parent's intrinsic size, which triggers another ResizeObserver pass and produces a self-growing chart. Plugin API 1.16 rejects this pattern in scientific/workspace-critical regions during SDK validation and warns when it appears in ordinary internal grids. At runtime Core also runs a Layout Guard preflight on size/mutation changes. It records actual scroll overflow **and child visual containment overflow** before applying recovery; unsafe `hidden`, `clip`, or `visible` semantic regions are contained with local scrolling instead of clipping or painting through their parent card. `PluginWorkspace.layoutDiagnostics()` exposes both `risks` and `guarded` rows so a developer can see what Core predicted and what it recovered.

`ctx.ui.scientificPlot.create(target, spec)` accepts either an SVG element or an ordinary container. For a normal container Core creates and owns the internal SVG, sizing and lifecycle. Plugins should not create private D3/SVG interaction infrastructure.

#### Core-owned multi-series legends

A scientific plot with two or more named/labeled series gets an interactive Core legend by default. For D3 `ScientificCurveSurface`, use `label`/`name` on curves; for Plotly use the normal trace `name`. Core chooses a compact external **bottom or right** placement from the current surface aspect ratio and estimated label footprint, reserves that footprint inside the plot's total size, and recomputes it when the plot is resized. The legend therefore does not cover data and the plugin must **not** guess an extra margin of its own.

Default interaction is single-series isolation: click a legend item to focus that series; click the focused item again to restore all series. A plugin can opt out explicitly (`legend:false` / `showlegend:false`) or provide an explicit Plotly legend position. For adjacent domain controls that need to know the reserved footprint, use `surface.legendLayout()` for D3 or `ctx.ui.scientificPlot.legendMetrics(target)` for Plotly. These return placement, row count, size and reserve information.

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

Imported file lifetime and physical storage are owned by the project host, not by an analysis workbench. A workbench reads its assigned source catalog through the scoped `ctx.data.sources` API; the visible import action itself is mounted and opened by Core:

```js
const rows = ctx.data.sources.list(); // synchronous scoped read

// Optional: remove only this workbench's assignment. The physical source remains
// available to other workbenches and Data Center.
await ctx.data.sources.detach({ artifactId: rows[0].artifactId });
```

New workbench UI must not call `ctx.data.importWorkbench.open()` directly. Declare `data.accepts` and provide the empty `workbench-import` slot (or let Core place the action automatically).

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

The **visual surface is also Core-owned**: typography, header, cell padding, borders, scrollbar container, hover/selection and theme colors come from TableSurface. Plugin CSS must not target `table/thead/tbody/tr/th/td`, `.dkds-managed-table`, or other Core TableSurface internals. Use `appearance:{density,stripe,colors}` when a domain table genuinely needs a supported variation. Rare direct row-striping/row-state CSS exceptions must be declared in `manifest.ui.tableAppearance.cssOverrides`; the validator rejects undeclared penetration into Core table internals. This keeps third-party tables visually identical to DKDS by default while still allowing explicit scientific semantics such as alternating row colors.


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


## Core Dialog Runtime

需要提示、确认或选择时，在 `requiresCore` 声明 `ui.dialogs`，使用 `ctx.ui.dialogs.alert / confirm / prompt`。不要使用浏览器原生 `alert / confirm / prompt`；Core 会统一亮暗主题、遮罩层、按钮对比度和键盘行为。
