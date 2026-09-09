# DK Data Studio Plugin SDK 1.28.0


## Managed Grid / GroupArea Layout Contract (SDK 1.28)

SDK 1.28 publishes the Core managed-grid and GroupArea contracts through typed `ctx.ui.grid.create(...)` and `workbench.grid(...)` APIs. Plugins provide column preferences; Core owns final grid geometry, responsive width clamping, and optional Native Mobile orientation adaptation.

For the common portrait policy, use an explicit strategy object rather than a private boolean:

```js
const grid = workbench.grid(host, {
  columns: 3,
  responsive: true,
  minItemWidth: 260,
  orientationPolicy: {
    mode: 'portrait-offset',
    offset: -1,
    minColumns: 1
  }
});
```

`orientationPolicy` is opt-in, generic, and not tied to GroupArea or any specific plugin. If the plugin stores independent portrait/landscape user preferences, provide them through `preferredColumns({ orientation })`; Core still computes the final effective count. Use `grid.getAppliedColumns()` for the actual current count shown in UI.

See [`GRID_LAYOUT.md`](./GRID_LAYOUT.md) for exact grid resolution and [`GROUP_AREA.md`](./GROUP_AREA.md) for the formal multi-plot GroupArea contract.


## Platform Presentation Authoring Contract (SDK 1.25)

SDK 1.25 keeps **one Plugin API 1.19.0** and makes platform presentation an explicit authoring decision. Do not create `ctx.ui.desktop` / `ctx.ui.mobile` business APIs. Shared data, state, algorithms, commands and semantic surfaces stay in the ordinary plugin runtime; only presentation assets may be selected per host.

Every UI-owning plugin authored against SDK 1.25 must declare both `platformPresentation.desktop` and `platformPresentation.mobile` in `plugin.json`:

```json
{
  "styles": ["plugin.css"],
  "platformPresentation": {
    "desktop": { "mode": "shared" },
    "mobile": {
      "mode": "custom",
      "styles": ["mobile.css"],
      "scripts": ["mobile-presentation.js"]
    }
  }
}
```

The supported modes are:

- `shared`: the shared plugin presentation is intentionally sufficient on this platform.
- `adaptive`: the plugin exposes semantic surfaces and relies on the Core platform Presenter to adapt their placement/interaction. No platform-only files may be declared.
- `custom`: the plugin supplies platform-only presentation CSS and/or scripts while continuing to use the same Plugin API and shared domain runtime.

Shared `manifest.styles` are loaded in `@layer dkds.plugin`. Platform-only styles are loaded **only for the active host** in the later `@layer dkds.plugin-platform`, before Core structure/presentation/theme layers. This lets a mobile presentation replace shared plugin geometry without specificity escalation or `!important`, while Desktop never consumes Mobile CSS. The same host selection applies to platform-only scripts.

For every current UI package, omission of either Desktop or Mobile policy is a validation error. The host does not infer policy for older packages: a package must satisfy the current manifest contract before it can load. Theme plugins do not use `platformPresentation`; they are governed by the exact current Theme Contract 3.10.0.

See [`PLATFORM_PRESENTATION.md`](./PLATFORM_PRESENTATION.md) for the complete authoring and packaging contract.

## Plugin API 1.19 Presentation cutover

Plugin API 1.19 is a breaking workspace-presentation boundary. `PRIMARY` represents exactly one semantic main surface. `leftNode` and `leftHtml` are removed from `DKDSPluginWorkspacePrimarySpec`, and PRIMARY mount callbacks expose only `main`, `root`, `workbench`, and `scope`. Independently placeable controls or inspectors must be registered as PRIME surfaces and declared in `ctx.ui.topWorkspace.register(...)` with a platform-neutral `presentationRole`. Every TOP PRIMARY/PRIME/SUB declaration must include a valid `presentationRole`. A `data-control` PRIME maps to the same constrained-platform control slot regardless of whether the plugin labels it `参数`, `数据`, or another domain-appropriate name. A parameter/settings control may additionally declare `presentationPurpose: 'parameters'`; its Portable `semanticKind` remains `panel`.

There is one current presentation path. Packages must declare Plugin API `1.19.0` exactly; other Plugin API versions are rejected before activation. No Desktop-geometry bridge or alternate Mobile runtime path exists.


## Theme Contract 3.10

Theme plugins target Theme Contract `3.10.0` exactly. Theme Contract 3.10 keeps computed-style **Render Coverage** and seven semantic Material Roles, and adds bounded Component Context, Material Context, Component × Material Role composition, and Core-rendered depth slots without giving Theme plugins DOM-selector paint ownership. Theme packages declare `pluginType: "theme"`, require `ui.theme`, and validate directly against the current Theme Contract; there is no manifest Theme range and no plugin-side capability negotiation. See [THEME_CONTRACT.md](THEME_CONTRACT.md).

This directory is a **standalone plugin-development kit**. A plugin developer does not need the DK Data Studio source tree.

## Requirements

- Node.js 18 or newer for validation/packaging.
- DK Data Studio 3.68.36 with SDK 1.28.0 / Plugin API 1.19.0 / Theme Contract 3.10.0. Packages target this exact public contract.

## Create a plugin

Copy one template directory and change the plugin id/name/version.

```text
sdk/templates/workspace-plugin/     standalone workbench activity example (not TOP)
sdk/templates/top-workspace-plugin/ true TOP + dedicated-window workbench example
sdk/templates/algorithm-provider/   versioned scientific algorithm example
sdk/templates/tool-plugin/           Tool Workspace example (TOP-equivalent lifecycle, Tools-menu entry)
```

For the complete dedicated-window contract, see [`TOP_WORKSPACES.md`](./TOP_WORKSPACES.md). Tool workspaces use the same lifecycle and are documented alongside it in [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md).

The public runtime entry is `DKDSPlugins.define(manifest, activate)`. New plugins target `apiVersion: "1.19.0"`, declare every Core surface they use in `requiresCore`, and declare a `pluginType` (`foundation`, `data`, `algorithm`, `workbench`, `task`, `tool`, `theme`, `extension`, or `developer`) for Plugin Manager grouping.

`plugin.json` and the manifest passed to `DKDSPlugins.define(...)` are the **same current contract**, not two independently versioned descriptions. The runtime manifest must include every required field, including `entry`, and must match `plugin.json` for all declared current-contract fields. `dkds-plugin.js validate` evaluates the entry and rejects missing runtime fields, unsupported fields, or package/runtime manifest drift before packaging.

### Workspace naming: manifest vs runtime

The names intentionally describe different layers: `requiresCore: ["ui.workspace"]` declares the Core dependency, `ui.plugin-workspace` is the capability label, and **`ctx.ui.workspaceSurface` is the only public executable workspace facade**. Do not infer `ctx.ui.pluginWorkspace` from the capability label; that runtime property does not exist. SDK validation and the in-app `.dkplugin` installer use the same source-contract audit and reject unknown static `ctx.ui.*` facades before activation.

## Algorithm plugins

Yes. Algorithm plugins are a first-class SDK type. Use `pluginType: "algorithm"`, declare `algorithmProvider: true`, `algorithmCategories`, and machine-readable `algorithmProvides`, then register implementations through `ctx.analysis.algorithms.register(...)`. Algorithms should not own workbench UI; current-contract workbench/task plugins resolve and invoke them through the Algorithm Registry. See `sdk/templates/algorithm-provider/`.

详细规范与示例另见 [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md)。

## Tool plugins (Plugin API 1.19)

`pluginType: "tool"` is a host category parallel to TOP workbenches. A **Tool Workspace** uses the same `workspace.role: "top"` + dedicated `window` + `ctx.ui.activities` + `ctx.ui.topWorkspace` contract as TOP; Core simply places its opener under the global **工具** button instead of the TOP activity strip. No additional Tool-only semantics are imposed yet.

Command-only tools remain supported as a lightweight form through `ctx.ui.menus.add(...)`. See [`TOOL_PLUGINS.md`](./TOOL_PLUGINS.md) and `sdk/templates/tool-plugin/`.

## Core display-scale interaction

All Core-owned XY/scatter/curve plots support **double-click the Y axis or left Y-label region → toggle linear/log display**. Log mode renders a view-only `|Y|` projection; it does not mutate source Artifacts, plugin-domain data, pipeline inputs, project persistence, or CSV/data exports. `Y = 0` remains in the source data but cannot be rendered on a logarithmic axis. For heatmaps/scalar fields, the same display contract applies to the **Z/color scale** instead: double-click the colorbar/right color-scale region to toggle a view-only `log10(|Z|)` color mapping while X/Y coordinates stay unchanged. Plugins should not implement duplicate axis/colorbar scale handlers or bypass the Core chart/surface runtimes.

## Validate

```bash
node sdk/tools/dkds-plugin.js validate path/to/my-plugin
```

Validation checks the manifest, referenced files, runtime-manifest parity, declared Core requirements and forbidden infrastructure bypasses. For Plugin API 1.19 workspaces it also lints CSS/layout ownership: Core shell selectors, semantic `overflow:hidden/clip`, and viewport-height ownership are rejected before packaging. Positive-pixel `minmax(...,1fr)` rows are release-blocking in scientific/workspace-critical regions and reported as warnings in ordinary internal grids, so the validator stays strict where blank/clipped scientific UI can occur without over-constraining normal plugin layout.

## Package

```bash
node sdk/tools/dkds-plugin.js package path/to/my-plugin my-plugin.dkplugin
```

Install the resulting `.dkplugin` from DK Data Studio's Plugin Manager.

If a package uses the same stable ID as a bundled plugin, it is accepted only as a **strictly newer package that satisfies the current contract exactly**. The user package is stored separately and activates on restart. Removing that installed update makes the bundled package active again; this is package installation state, not an API/version compatibility path. Invalid or non-current packages are rejected rather than translated or loaded through another runtime.

## Public contract

- `plugin-manifest.schema.json` — machine-readable manifest contract.
- `plugin-api.d.ts` — editor/TypeScript declarations for `DKDSPlugins` and `ctx`.
- `contract.json` — SDK/API/package versions.
- `GRID_LAYOUT.md` — public managed-grid, responsive columns and Native Mobile orientation-policy contract.
- `GROUP_AREA.md` — public multi-plot GroupArea contract, child PlotView placement/sticky semantics, and titled/titleless composition.

Plugins own domain logic, domain state, domain types and domain views. Core owns application infrastructure: project persistence, I/O, artifacts, entities, selection, workspace layout, chart lifecycle, scheduling and plugin lifecycle.

### Scientific presentation contract (SDK 1.18.0)

The Core D3 scientific renderer is a rendering engine only. Core owns one shared **Scientific Presentation** layer for automatic legend placement, two-row packing, per-surface legend scope, curve-to-legend focus, reversible legend isolation, compact draggable navigation tools, and semantic light/dark styling. A plugin should declare series identity/labels/groups and data; it should not implement its own generic legend packing or renderer chrome.

Top/bottom legends use the full surface-chrome width rather than the inner axis rectangle. Dynamic multi-series plots keep a stable legend footprint across transient trace-count changes, so a temporary `2 → 1 → 2` update does not resize the plotting area. `dkdsNavigationTools:false` disables the Core navigation strip when a scientific surface intentionally needs no navigation tools.

Clicking a rendered curve focuses its corresponding Core legend entry. Clicking a legend entry isolates its semantic series/`legendgroup`; clicking the same entry again restores the baseline visibility of all series. Horizontal legend chrome is capped at two compact rows and does not expose a permanent horizontal scrollbar.

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

`onManipulationPreview` is the pointer-rate visual path. Persist scientific/project state only from `onManipulationCommit`; map the generic manipulator id/kind and committed geometry to domain operations.


### Workbench navigation, icons and scoped project data

`pluginType: "workbench"` describes a UI/analysis plugin category; it does **not** make the plugin a TOP. A workbench with no explicit `workspace.role: "top"` is a standalone activity hosted by the main shell and does not own a dedicated TOP window. Use `sdk/templates/workspace-plugin/` for that simpler case.

A **true TOP workbench** must keep four contracts aligned:

1. Manifest: `workspace.role: "top"` with a stable `workspace.activity`.
2. Manifest: a dedicated `window` whose `activity` exactly matches `workspace.activity`.
3. Runtime: `ctx.ui.activities.add({ id: <activity>, openMode: "window", ... })`.
4. Runtime: `ctx.ui.topWorkspace.register({ activity: <activity>, ... })`.

Core then gives the plugin the same host semantics as built-in TOPs: normally it opens in a reusable dedicated window; when promoted to SUPER, the same activity/layout is embedded in the main shell instead of creating a second implementation. Plugin API 1.19 validation rejects incomplete or mismatched TOP contracts. Start from `sdk/templates/top-workspace-plugin/`.

Use `ctx.data.sources` for imported project sources. Workbench plugins receive a scoped read view automatically, so `list()` and `targets()` are synchronous reads in every host, including dedicated TOP windows. Physical data remains canonical and is stored once; assignments are many-to-many. Import/Data Center own assignment changes, avoiding one importer per analysis plugin and avoiding unrelated workbench data pollution.

#### Bounded scientific layout

Viewport-owned scientific charts must live in a bounded layout. Prefer the default `primaryScroll: "safe"` (or declare it explicitly). In `safe` mode Core owns a **fixed Primary viewport and its scrollbar**: plugin content may be taller than the viewport, but it must not enlarge the host or move the scroll owner upward into the window. Keep the plugin root flexible (`width:100%; min-width:0; min-height:0`); Core provides the viewport floor. Use `primaryScroll:"auto"` only for a page that intentionally participates in document-flow growth, and `primaryScroll:"contained"` only for a true full-viewport surface that intentionally forbids host scrolling. Grid rows that own a contained chart should normally use `minmax(0, 1fr)`.

Do **not** combine an intrinsic-height/auto-sized parent with `minmax(<positive px>, 1fr)` and a responsive scientific plot. A plot resize can then increase the parent's intrinsic size, which triggers another ResizeObserver pass and produces a self-growing chart. Likewise, a compact form/card grid made only of `auto` rows will distribute spare height when the card is stretched by a taller sibling unless it declares `align-content:start`; this is the common cause of large blank vertical gaps in two-column Tool layouts. SDK validation reports these risky patterns. At runtime Core also runs a Layout Guard preflight on size/mutation changes. It records actual scroll overflow **and child visual containment overflow** before applying recovery; unsafe `hidden`, `clip`, or `visible` semantic regions are contained with local scrolling instead of clipping or painting through their parent card. `PluginWorkspace.layoutDiagnostics()` exposes both `risks` and `guarded` rows so a developer can see what Core predicted and what it recovered.

`ctx.ui.scientificPlot.create(target, spec)` accepts either an SVG element or an ordinary container. For a normal container Core creates and owns the internal SVG, sizing and lifecycle. Plugins should not create private D3/SVG interaction infrastructure.

#### Core-owned multi-series legends

A scientific plot with two or more named/labeled series gets an interactive Core legend by default. Use `label`/`name` on curves or renderer-neutral trace objects. Every legend is **scoped to its own surface host**: adjacent cards never share or overlap an accidental common legend. Core chooses a compact external **top-first** placement and packs horizontal legends into at most two balanced rows. The legend chrome does not expose a permanent horizontal scrollbar; labels are compacted within the surface and side placement is reserved for genuinely wide layouts. Bottom placement keeps explicit X-axis-title clearance. the Core scientific renderer use the same Core HTML legend presentation, so typography and click-to-isolate behavior are consistent. Once a surface has become multi-series, Core keeps the reserved legend footprint stable across transient trace-count updates so the plot does not visibly twitch.

Default interaction is single-series isolation: click a legend item to focus that series; click the focused item again to restore all series. `legendgroup` is treated as one semantic series group, so a visible forward-scan legend entry can isolate its paired hidden-from-legend reverse trace at the same time. Interactive scientific surfaces use the compact, draggable Core `＋ / − / ⌂` navigation strip; use `dkdsNavigationTools:false` only when the scientific surface intentionally needs no navigation tools. A plugin can opt out of the Core legend (`legend:false` / `showlegend:false`) or request `top`, `bottom`, `left`, or `right`; engine-native legend chrome is not part of the supported Core presentation contract. For adjacent domain controls that need to know the reserved footprint, use `surface.legendLayout()` or `ctx.ui.scientificPlot.legendMetrics(target)`. These return placement, row count, size and reserve information.

### Interaction Behavior

Input policy is a separate Core contract from scientific geometry. Use `ctx.ui.interactionBehaviors` to declare how normalized gestures map to intents or Commands. Plugin code should not own raw keyboard listeners, private right-click menus, or feature-specific box-selection branches.

The Plugin API 1.19 Interaction Behavior gesture vocabulary is `click`, `double-click`, `context`, `drag`, `box`, `wheel`, and `key`. Keyboard bindings use a complete normalized chord such as `Ctrl+Z`, `Ctrl+ArrowLeft`, or `Shift+ArrowLeft`. Context actions are rendered by Core, and a scientific surface resolves direct manipulation before selection/background gestures.

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

`artifactHydration: 'live'` is intentionally opt-in because it transfers the exact canonical live Artifact snapshot into that activity renderer. Historical projects have already passed through the Project Compatibility Gateway before this point, so activity renderers never reconcile or parse a second `project.datasets` source. Reused live-hydration windows refresh when only the Artifact digest changes, without remounting the plugin. Ordinary analysis TOP windows should normally keep project hydration and rely on Artifact delta synchronization instead of requesting a full live snapshot.

## Core-owned workbench import action (Plugin API 1.19)

A `pluginType: "workbench"` plugin does **not** create its own “导入数据” button, `<input type="file">`, or file-picker flow. Core automatically contributes one standard import action for the workbench and opens the shared Import Workbench in scoped mode.

Declare the semantic data accepted by the workbench:

```json
"data": { "accepts": ["science.transport.iv"] }
```

Scoped mode locks the assignment target to the current plugin, hides the global “数据用途” selector, and only lists Importer Providers whose `outputTypes` intersect `data.accepts`. Plugin API 1.19 workbenches declare `data.accepts`; Core uses it to scope importers and assignment targets.

To choose the standard action position, the plugin may provide an **empty Core-owned slot** in its page header:

```html
<div data-dkds-slot="workbench-import"></div>
```

The plugin must not place custom content in that slot. If the slot is absent, Core inserts the action in the standard workbench header action area. In an embedded SUPER workspace, the same Core action is projected into the host contextual toolbar instead of duplicating a hidden page-header button. The global shell “导入数据” action remains the full routing mode for assigning one import to multiple workbenches.

`ctx.data.importWorkbench` is an infrastructure capability for import-oriented tools; analysis workbenches use the Core-owned import action derived from `data.accepts`.

## Project source-data lifecycle (Plugin API 1.19)

Imported file lifetime and physical storage are owned by the project host, not by an analysis workbench. A workbench reads its assigned source catalog through the scoped `ctx.data.sources` API; the visible import action itself is mounted and opened by Core:

```js
const rows = ctx.data.sources.list(); // synchronous scoped read

// Optional: remove only this workbench's assignment. The physical source remains
// available to other workbenches and Data Center.
await ctx.data.sources.detach({ artifactId: rows[0].artifactId });
```

New workbench UI must not call `ctx.data.importWorkbench.open()` directly. Declare `data.accepts` and provide the empty `workbench-import` slot (or let Core place the action automatically).

A `data` or `foundation` plugin may manage global assignments through `ctx.data.sources.setAssignments(...)`. Ordinary workbenches cannot mutate another workbench's assignment. Physical source deletion is a Data Center / host action because deletion also removes dependent Artifact lineage.

Analysis workbenches use `ctx.data.sources`; their visible import action is Core-owned. Import-oriented infrastructure tools may use `ctx.data.importWorkbench` directly.

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


### Scientific renderer dependency
Dedicated scientific workspaces declare `"scientific-renderer"`. D3 is the single Core scientific renderer; renderer vendors are not part of the Plugin API contract.

## Theme Contract 3.10 (`ui.theme`)

Theme packages target the exact current Theme Contract `3.10.0`. Declare `pluginType: "theme"` and `requiresCore: ["ui.theme"]`, then register a validated profile through `ctx.ui.theme.register(...)`. Unknown tokens, malformed colors, invalid blur/opacity/saturation/duration/scale values, invalid Component/Material contexts, and arbitrary DOM-selector paint are hard validation errors.

Themes use structured `modes.light` / `modes.dark` profiles, semantic Material Roles, Component Context, Material Context, bounded variants/effects, and optional `scientific.seriesPalette`. Scientific palette values are fallback colors only; explicit user/plugin scientific colors retain precedence. Core owns role assignment, rendering recipes, Backdrop Root handling, readability floors, selectors and final DOM paint. There is no Theme Contract range or `ctx.ui.theme.supports(...)` authoring branch.

Start from `sdk/templates/theme-profile/` and read [`THEME_CONTRACT.md`](./THEME_CONTRACT.md).

### Dynamic menu availability (SDK 1.22.1)

`ctx.ui.menus.add(...)` supports a synchronous `availability` contract. Use it for commands whose real executability depends on the current project, data, analysis result, or selection rather than merely on whether a plugin registered an export capability. Core re-evaluates availability when the menu opens and after project/artifact/activity changes.

```js
ctx.ui.menus.add({
  id: 'export-current',
  menu: 'export',
  label: '当前数据 · CSV',
  availability: () => currentRows.length > 0,
  onClick: () => exportCurrentCsv()
});
```

The callback may return `boolean` or `{ visible, enabled, reason }`. Unavailable items should normally be hidden (`false` or `{visible:false}`) instead of exposing actions that can only fail. Availability must be synchronous; Core reports an invalid availability contract instead of silently treating it as available.

### Canonical Core UI components and visual ownership (SDK 1.22.1)

`ctx.ui.components` is the canonical construction path for standard application chrome. It exposes `action()`, `actionGroup()`, `tabs()`, `surfaceHeader()`, `field()` and `hydrate()` in addition to `mount()`. Plugins declare content, commands, semantic variants and domain layout; Core owns button/header/field geometry and Theme owns paint.
Property ownership is strict: Theme profiles provide visual values, Core Theme renderers own the standard-component paint selectors, and Core Structure owns geometry. Context/state modifiers must use the shared component slots rather than add later padding/height overrides; CSS source order is not a supported customization mechanism.

Non-theme plugin stylesheets are validated by the SDK visual ownership gate. Plugin CSS may not repaint application chrome or redefine standard Core control/header geometry. Size the surrounding domain layout instead. Scientific series/mark styling and domain geometry remain plugin-owned where they carry scientific meaning.
The validator is source-aware: a plugin-specific class attached to a Core header/action/field is treated as an alias of that Core component, so the alias cannot silently override the Core geometry. ComponentRuntime also auto-hydrates dynamically inserted current-contract DOM so Component Identity remains consistent for runtime-created markup.


### Integrated scientific floating chrome is one silhouette (SDK 1.24.0 hard rule)

Scientific/data plots use Core-owned floating navigation chrome (`.dkds-scientific-nav-tools`). The drag handle, zoom-in, zoom-out, home, and any future Core plot actions are **one physical control group**, not a row of independent rounded buttons.

Hard contract:

- the floating container owns the only outer border, radius, material and depth;
- child actions may receive semantic hover/active fills, but Core suppresses child border/radius/shadow so they remain visually fused;
- plugins/themes may choose semantic `floatingChrome` / `toolbarAction` tokens, but may not target the DOM to recreate separate button cards;
- plugin CSS that changes `gap`, padding, height, radius, shadow, overflow or other integrated-chrome geometry is rejected by the SDK visual ownership validator.

This rule applies to every Theme. Aurora may be more expressive in color/material, but it must still render plot navigation as one integrated silhouette.


### Shared surface-header composition (SDK 1.21.2)

`ctx.ui.designSystem.classes` now exposes `surfaceHeading`, `surfaceActions`, and `surfaceTabs`. These are Core-owned structure classes for a single-line header title plus right-aligned controls; Theme Component Appearance continues to own paint. `ParameterSchema` `multiselect` / `columns` fields now use the shared themed popup by default; use field-level `presentation: "listbox"` only when a permanently expanded list is genuinely required.

### PlotView responsive scientific geometry (SDK 1.21.1)

`ctx.ui.plotViews.bind(...)` can declare `contentAspectRatio`, `contentMinHeight`, and `contentMaxHeight`. Core derives the scientific content height from the actual plot width for home/sticky/docked layouts and leaves explicit floating-window bounds under user control. Use this instead of plugin-local fixed chart heights when a group of plots must keep a stable landscape shape.

### Status-bar icon color policy (SDK 1.21.1)

Status-bar icons inherit the active Theme `statusBar` text appearance by default. A status contribution that represents a runtime state can opt into `colorPolicy: 'semantic'`; Core then maps semantic states such as `running`, `stopped`, `checking`, `starting`, `waiting`, `done`, `ready`, `mcp`, `warn`, and `error` to Theme semantic colors. Labels remain Theme-uniform so the status bar stays a single visual command row.
