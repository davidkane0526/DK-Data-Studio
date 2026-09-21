# DK Data Studio Plugin SDK 1.51.44
SDK 1.51.44 makes **Unit-first composition the default official authoring path**. New/generated Workspace, TOP and Tool plugins should start from `ctx.ui.unitTemplates` and named Unit/Layout variants; the reference templates no longer ship private layout CSS or hand-written page HTML. `ctx.ui.workspaceSurface` remains a supported lower-level Plugin API 1.19 primitive for advanced infrastructure work, not the default template path. Unit Templates remain 2.5.38 with 41 Units / 73 Layout recipes.

SDK 1.51.43 / Unit Templates 2.5.38 establishes one Mobile companion outer-geometry contract for every semantic `companion-right` / `companion-bottom`: Workspace `SplitController` state is the only user/default size preference and resolves the bounded final size from the actual Workspace frame; shared Mobile CSS only consumes that resolved track token, and the allocated Surface owns its internal scrolling/reflow. Unit `detailGeometry`, intrinsic constraints, `scrollHeight`, descendant overflow and Unit observers no longer feed back into right/bottom track allocation. Mobile split persistence uses one Core-owned schema rather than per-profile generations. Parameter Drawer intrinsic-width fitting remains a separate overlay contract and continues to consume Unit inline constraints without affecting scientific companions.

SDK 1.51.37 / Unit Templates 2.5.33 historically added live companion block-fit together with Drawer changes. The companion block-fit portion is retired by SDK 1.51.43; the Drawer scrollbar/drag contracts remain.

SDK 1.51.36 / Unit Templates 2.5.32 historically allowed Unit minima to participate in Mobile companion allocation. SDK 1.51.43 retires that outer-allocation effect: those values remain Unit-internal geometry only.

SDK 1.51.35 / Unit Templates 2.5.31 closes Mobile parameter Surface geometry ownership. Parameter Drawers have a 25% live-page hard floor; real Unit intrinsic constraints may raise that floor, parameter legends follow the assigned Drawer width instead of widening it, and Presenter publishes one Drawer-occupancy value for companion lanes. The existing Core-owned 6 px parameter PRIME outer inset remains unchanged.

SDK 1.51.33 / Unit Templates 2.5.29 introduced the shared Unit geometry-constraint registry. Under the current 1.51.43 contract, Presenter consumes that registry for parameter-Drawer intrinsic width only; scientific companion outer tracks are Workspace-owned and do not consume Unit content constraints. `units.geometryOwnershipPolicy` remains the read-only authoring policy surface.


SDK 1.51.32 / Unit Templates 2.5.28 historically connected PlotGroup block constraints to Mobile scientific lanes. That outer coupling is retired by 1.51.43; `primaryScroll` and Unit-internal responsive behavior remain unchanged. The public surface remains 41 Units / 73 Layout recipes.
SDK 1.51.29 / Unit Templates 2.5.25 makes PRIMARY right/inline-end breathing room a Workspace Unit contract: Unit-owned 12 px by default, with explicit content-owned mode for source-faithful presentations that already own the inset. Generic Core dock slots remain edge-to-edge, so the rule cannot reintroduce global page padding.
SDK 1.51.27 / Unit Templates 2.5.23 keeps the 41-Unit / 73-Layout public surface and closes two generic fill-chain gaps: created SplitPane regions are now canonical min-size-safe fill hosts, and Panel `sizing:'fill'` propagates assigned height from the Material shell into its dedicated body. Vth consumes these contracts without private height CSS; parameter-card source geometry remains explicit public Unit geometry.

SDK 1.51.19 / Unit Templates 2.5.15 makes Unit adoption additive rather than destructive: decorator/adoptive Units preserve the existing structural Unit identity/variant and record their own role separately. Repeated ParameterForm destroy/remount therefore preserves a host Layout identity.

SDK 1.51.18 / Unit Templates 2.5.14 extends the same single-owner model to SplitPane: adopted Layout Units may explicitly select `layoutOwner:'host'` so accepted responsive outer geometry remains host-owned while Core alone owns split gestures, persisted size and the split-size token. Layout `responsiveTarget` and ParameterForm `layoutOwner:'host'` remain available.

SDK 1.51.16 / Unit Templates 2.5.12 exposed PlotGroup orientation through the public runtime/Unit facade and made orientation-specific column commits immediately reflow the existing GroupArea through `setColumns(...)`.
SDK 1.51.15 / Unit Templates 2.5.11 closes portable Header / PortableView action-host ownership and runtime-delegated ScientificPlot target ownership. Explicit source-parity action hosts are no longer wrapped in a second portable-control identity, and delegated plots keep their authored structural identity until the canonical renderer attaches. The catalog remains 41 Units.
SDK 1.51.14 / Unit Templates 2.5.10 adds namespace-aware Layout Unit creation (`namespace:'svg'`) so source-parity compositions can create real SVG hosts without plugin-side DOM bypasses. The catalog remains 41 Units.
SDK 1.51.13 / Unit Templates 2.5.9 moves file-toolbar responsive collapse out of the generic recipe and into explicit Unit `responsiveGeometry` detail. Pulse Analysis declares its accepted 310 px threshold, preventing a Unit default from changing the native parameter-panel height and button anatomy. The catalog remains 41 Units.

## Task progress and acquisition order

SDK 1.48 adds Core-throttled worker progress via `context.reportProgress(...)` / `handle.onProgress(...)` and explicit history-order metadata via `artifact.metadata.acquisition` plus `ctx.data.sources.acquisitionOrder(...)`. See [`TASK_RUNNER.md`](./TASK_RUNNER.md) and [`ACQUISITION_ORDER.md`](./ACQUISITION_ORDER.md).


## Validated domain commands
Phase E reference-only Selection and stable cross-view identities: [`REFERENCE_SELECTION.md`](REFERENCE_SELECTION.md).
Cross-view table/curve and heatmap/source-scan adapters: [`CROSS_VIEW_SELECTION.md`](CROSS_VIEW_SELECTION.md).
Scientific dimension/unit compatibility for linked numeric state: [`SCIENTIFIC_UNITS.md`](SCIENTIFIC_UNITS.md).
Scientific viewport linking with explicit quantity/unit conversion: [`VIEWPORT_LINKING.md`](VIEWPORT_LINKING.md).
Bounded legend visibility linking by stable series reference: [`LEGEND_LINKING.md`](LEGEND_LINKING.md).

SDK 1.37 provides one validated command path for UI, scripts, AI/MCP and replayable recipes. Plugins that use domain metadata/history/replay require `execution.commands`; Core records input Artifact revisions/fingerprints, exact algorithm/provider identity, parameters, status and output references. See [`DOMAIN_COMMANDS.md`](./DOMAIN_COMMANDS.md).


## Streaming import

Large text importers can implement `createStreamParser(file, options, inspection)`. Core supplies bounded decoded line batches and owns file tokens, cancellation and backpressure; importers return the same canonical Artifact result from `finish(meta)`. See [`STREAMING_IMPORT.md`](./STREAMING_IMPORT.md).


## Bounded Core tasks

CPU-heavy plugin work must use the Core-owned task runner instead of creating `Worker` instances directly. Declare every worker in `plugin.json` and require `execution.tasks`:

```json
{
  "requiresCore": ["execution.tasks"],
  "tasks": [{"id":"analyze","entry":"analyze-task.js"}]
}
```

Submit through `ctx.tasks.submit(...)`. Core owns the worker pool, queue, cancellation, and latest-generation protection. The same `key` defaults to latest-wins: a newer submission cancels an older queued/running task, and a stale generation cannot invoke `publish`.

```js
const job=ctx.tasks.submit('analyze',input,{key:'main-analysis',latest:true});
const result=await job.promise;
```

A task entry defines `self.DKDSTaskDefinition = { run(input, context) { ... } }`. Task modules must be pure compute workers: no DOM, Electron bridge, private worker pools, project mutation, or direct UI publication.


## Precise DataTable buffer invalidation (SDK 1.36)

SDK 1.36 adds one payload-local revision per DataTable column:

```js
const xRevision=ctx.data.artifacts.columnRevision(tableId,'x');
const page=ctx.data.artifacts.readColumnRange(tableId,'x',{start:0,limit:2048});
console.assert(page.bufferRevision===xRevision);
```

`artifactRevision(id)` still advances for every owning Artifact write. `bufferRevision` / `columnRevision()` is narrower: a trusted `transactColumn()` on Y advances Y plus the Artifact revision, but does not invalidate X. Full unrestricted `upsert()`/`publish()` remains conservative and invalidates all DataTable buffers without scanning large payloads to infer what changed.

Store lineage indexing is also incremental in 3.68.79: add/upsert/remove updates only changed parent→child edges instead of rebuilding the complete lineage index after every write.

## Lightweight metadata and bounded range reads (SDK 1.33)

SDK 1.33 adds read paths that avoid cloning complete numeric payloads when a plugin only needs table structure or a bounded window:

```js
const artifacts=ctx.data.artifacts.listMetadata({kind:'data.table'});
const columns=ctx.data.artifacts.columnMetadata(tableId);
const page=ctx.data.artifacts.readColumnRange(tableId,'signal',{start:0,limit:2048});
```

`listMetadata()` preserves Artifact identity, dimensions, source/lineage fields, assignment metadata and lightweight column descriptors, but it omits numeric payload arrays and full provenance steps while retaining `provenanceCount` / `provenanceTypes`. `columnMetadata(id)` enumerates DataTable columns without `values`. `readColumnRange()` requires an explicit finite `limit`; Core rejects values above `65536`, never interprets an omitted limit as “read all”, and returns `start`, `end`, `totalLength`, `artifactRevision` and `bufferRevision` so callers can choose Artifact-wide or payload-local stale detection.

The returned values are detached immutable snapshots. The canonical Store remains unchanged, scientific export stays full resolution, and default `get/list` behavior is intentionally unchanged. Use `columnBuffer()` only when a full-column transactional mutation is actually required.

## Store-owned Column Buffer contract (SDK 1.32)

SDK 1.32 adds an explicit, copy-backed full-column transaction without changing the default Artifact shape or `get/list` behavior:

```js
const buffer=ctx.data.artifacts.columnBuffer(tableId,'signal');
ctx.data.artifacts.transactColumn(buffer,draft=>{
  for(let index=0;index<draft.length;index++)draft[index]-=offset;
},{label:'Subtract offset'});
```

The snapshot is immutable and bound to its Store, Artifact, column and expected buffer revision. A successful synchronous fixed-length transaction validates the declared numeric dtype and publishes once; a no-op publishes nothing, while stale/foreign snapshots, callback failure, async mutation and precision/range violations leave the source unchanged. The current slice keeps persisted `values[]` as the single source of truth and retains exact current-project JSON round trips. SDK 1.36 adds per-column buffer revisions: precise column transactions advance only the changed buffer, while unrestricted full-Artifact writes conservatively invalidate every table buffer without scanning payloads to infer changes.

## Artifact identity and invalidation contract (SDK 1.31)

SDK 1.31 types the complete `ctx.data.artifacts` facade and separates one-Artifact invalidation from aggregate and persistent identity. Use the narrowest identity that matches the computation:

```js
const artifact=ctx.data.artifacts.get(artifactId);
const renderKey=JSON.stringify({
  id:artifact.id,
  revision:ctx.data.artifacts.artifactRevision(artifact.id),
  xColumn,
  yColumn
});

ctx.ui.scientificPlot.react(plot,traces,layout,config,{renderKey});
```

`artifactRevision(id)` is a fast Store-local monotonic change stamp and does not change when an unrelated Artifact is edited. `revision(kind)` remains the aggregate signal for work over a whole kind. `fingerprint(id)` covers the complete canonical Artifact and remains stable through save/restore; use it when a Store-local revision is insufficient. Revisions are not serialized and are never permanent Artifact identity.

## Deterministic layout contract (SDK 1.30)

SDK 1.30 documents the canonical split state and bounded workspace diagnostics. Core retains preferred size/ratio, placement and collapse intent separately from the current viewport-clamped size. A hidden surface or orientation change cannot overwrite user intent, and Native Mobile limits are resolved inside the same `SplitController` used by Desktop.

```js
const split=ctx.ui.layout.split({
  id:'results-height',container:frame,handle:resizeHandle,target:results,
  axis:'y',defaultSize:320,min:180,reserve:240
});
const state=split.stateSnapshot(); // preferredSize and effectiveSize are distinct
```

Every registered workspace region has an explicit scroll policy. `workbench.layoutDiagnostics({limit:12})` performs a bounded, read-only inspection of those regions only; Core no longer scans and rewrites the whole plugin subtree during normal resize or mutation flow.


## Data and cache correctness contract (SDK 1.29)

SDK 1.29 documents TypedArray input normalization, strict rectangular matrix validation, detached Artifact reads and single-execution performance callbacks. It retains Plugin API 1.19.0; this is an additive SDK authoring contract, not a compatibility path.



## Unit Templates 2.5 (SDK 1.51)

SDK 1.51 promotes `ctx.ui.unitTemplates` to the single reusable UI composition layer. Unit Templates 2.5 is split into Foundation, Scientific, Behavior, State and Composition/Preset owners and exposes 41 generated catalog units plus per-Unit anatomy/slot/responsive/accessibility/invariant/extension/forbidden contracts from one Core-owned specification. Existing accepted plugin/Core UI is the template source: plugins may freely compose units into different layouts, while the anatomy, canonical classes, geometry tokens, action variants, chrome completeness and base interaction policy of each unit remain Core-owned. `accepted-scientific-v1` is now only a mature preset composed through the same public Unit facade available to third-party plugins; it owns no parallel renderer. Existing built-in plugin source and authored styles remain byte-frozen. See `UNIT_TEMPLATES.md`, generated `UNIT_TEMPLATE_CATALOG.md`, `native-plugin-reconstruction-blueprints.json`, `native-plugin-state-census.json`, `examples/sdk151-unit-resonance-parity/` and `examples/sdk150-unit-composition/`. Native-plugin reconstruction/state/geometry/service/presentation blueprints are SDK-authoring artifacts only; they are deliberately excluded from the runtime UI composition so Core remains domain-blind. Unit Layout additionally exposes a Core-owned accepted geometry vocabulary and accepted responsive breakpoints so frozen native-plugin geometry can be rebuilt exactly without allowing arbitrary plugin CSS writes.

SDK 1.51.3 completes the third real shadow migration, Resonance Workbench, under `examples/sdk151-unit-resonance-shadow/`. TER, Pulse and Resonance all remain parallel evidence only: production native source/styles are unchanged. The catalog remains 41 Units; Resonance required only generic `section:disclosure` and Core-owned viewport-clamped Popover anchor/point positioning with picker dialog semantics. The shadow also verifies that `accepted-scientific-v1` can be reconstructed manually from the same public Units instead of relying on a preset-private renderer.


## Domain Adapter live migration seam

SDK 1.51.5 introduced `ctx.services.domain` as a strict facade on the existing owner-scoped Service Runtime. `provide()` publishes detached state snapshots plus an explicit action whitelist; `connect()` requires a declared `pluginDependencies` edge by default and never exposes the raw production service object. Consumer subscriptions are lifecycle-scoped and provider deactivation invalidates connected handles. See `DOMAIN_ADAPTERS.md`.

SDK 1.51.12 makes accepted detail geometry an explicit **Unit-owned authoring contract** instead of allowing Unit compositions to leak raw Workbench/PlotView geometry fields. `prime.detailGeometry.contentInsetPx` owns exact accepted parameter-panel inset; `plotView.detailGeometry` owns accepted scientific content aspect ratio and min/max content height. Unit Templates validate these values and translate them into the existing generic execution services. The Core workbench/PlotView services remain domain-blind and the catalog remains 41 Units. Unit Templates 2.5.8 also adds source-parity Header anatomy (`stacked`, optional actions host and `plot-minimal`) plus Field `controlOnly` composition, allowing Pulse Analysis production presentation to be reconstructed through Units without raw plugin-control markup or a second visual owner. Pulse retains its accepted stylesheet and business/rendering owners.

SDK 1.51.10 changes the reconstruction rule from "Unit defaults define the final plugin appearance" to **source parity first**. A Unit owns only the shared minimum contract—semantics, owner boundaries, lifecycle, accessibility and mandatory structure. A plugin may explicitly retain accepted detail parameters such as widths, gaps, local flow/grid geometry and responsive thresholds when those parameters are required to reproduce the accepted native implementation 1:1. These differences remain explicit plugin parameters until all native plugins have completed reconstruction and the project can classify them as shared defaults, plugin-tunable details or immutable hard contracts. Parameter-purpose PRIME surfaces are an immediate hard exception: they never own a title/header bar.

SDK 1.51.9 closes the real-runtime TER Unit cutover layout/lifecycle regressions exposed after 3.71.8. Generic PRIME `content` is now mounted into the canonical body, generated PRIME containers are reused across close/reopen, responsive plot cards no longer claim external `height:100%`, and `scientificPlot.create(...,{renderOwner:'runtime'})` declares that the existing `ctx.ui.scientificPlot.react/scalarField` path is the single renderer/resize-observer owner. Unit Templates advance to 2.5.5 while the catalog remains fixed at 41 Units.

SDK 1.51.8 retains the first formal TER production Unit cutover and fixes Core empty-page-shell registration for Unit-only pages. Explicit `html:""` now creates the page shell; omitted `html` still requires a pre-existing page. SDK 1.51.7 completed the first formal production Unit cutover. Production TER now builds its page, data-control PRIME, seven PlotViews, PlotGroup, managed result tables, parameter/display/transform controls and export surface through `ctx.ui.unitTemplates`; the legacy `plugin.css` and `shared-views.js` presentation owners are deleted. The existing production analysis service, controller, domain adapter and feature runtime remain the single state/numeric/interaction owners. Unit Templates remain 2.5.4 / 41 Units.

SDK 1.51.6 adds TER side-by-side live presentation acceptance without changing the 41-Unit catalog. The Unit TER shell now reverse-syncs production settings/display/transform state, projects the production result into both complete result tables and all seven plot payloads, and round-trips production controller selection through the same `services.domain` owner. Numeric inputs are normalized at the Unit boundary so live state preserves production numeric types.

The first live migration harness is the TER Unit-only shadow: production TER remains the only state/numerical owner, while the Unit shell reads the same result snapshot and invokes the same production actions through `builtin.ter-analysis/live`.

SDK 1.51.4 completes the fourth real shadow migration, Data Center, under `examples/sdk151-unit-data-center-shadow/`. The same 41 Units now reconstruct a non-scientific-first `data-primary` workbench, artifact browser, bounded table preview, formula/workflow/provenance tools, dialog/menu actions and a PRIME-contained chart preview. The migration adds only generic interactive Chip semantics and corrects a stale Data Center geometry dossier from `plotView:complete` to `plotView:prime-contained`; no Data Center-specific Core path is introduced.

## Scientific Composition Contract (SDK 1.49)

SDK 1.49 adds a verified Scientific Composition layer without changing Plugin API 1.19 **and without defining a new visual language**. `ctx.ui.sections`, `ctx.ui.plotGroups`, `ctx.ui.plotViews.create(...)`, and `ctx.ui.scientificWorkbench` add semantic ownership/validation over the accepted Workspace, PlotView, GroupArea and PortableView presentation. Existing-node PRIME headers/cards/groups are adopted rather than rebuilt; `surface:'scientific-card'` is semantic; `contentInset` is opt-in; and `data-control` describes purpose rather than forcing one Desktop placement. Explicit `fixed:true` is the one-placement contract. Surface-controlled movable PRIME surfaces require `handle + controlsHost` or `chrome:'auto'`, while host-managed data-control surfaces retain their accepted placement/chrome behavior. Toolbar/menu contributions from workbench/tool plugins are activity-scoped by default. The public `accepted-scientific-v1` profile is the executable non-domain template for the accepted complex scientific workbench geometry: a third-party plugin can reproduce the same workspace/PRIME/PlotGroup layout and chrome details without copying built-in private CSS or DOM. See `examples/sdk149-reference-workbench/`; its parity is enforced in both release test manifests.

See [`SCIENTIFIC_COMPOSITION.md`](./SCIENTIFIC_COMPOSITION.md) for the full contract and the `validate`, `test-runtime`, and `test-layout` commands.

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
- DK Data Studio 3.71.25 with SDK 1.51.16 / Plugin API 1.19.0 / Theme Contract 3.10.0. Packages target this exact public contract.
- `ctx.services.require('runtime').releaseActivityWindow(...)` explicitly cold-closes a hidden reusable Desktop TOP owned by the current main window; ordinary close/hide keeps managed plots warm for fast reopen.

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
node sdk/tools/dkds-plugin.js test-runtime path/to/my-plugin
node sdk/tools/dkds-plugin.js test-layout path/to/my-plugin
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
- `UNIT_TEMPLATES.md` — SDK 1.51 / Unit Templates 2.5 composition, geometry, state/accessibility, ownership and reconstruction contracts.
- `UNIT_TEMPLATE_CATALOG.md` — generated exhaustive Unit anatomy/metrics/ownership catalog and native-plugin reconstruction blueprints.
- `SCIENTIFIC_COMPOSITION.md` — SDK 1.49 lower-level PRIME/ScientificSection/ScientificCard/PlotGroup composition and layout harness.
- `GROUP_AREA.md` — low-level GroupArea layout contract; scientific groups should normally use PlotGroup.

Plugins own domain logic, domain state, domain types and domain views. Core owns application infrastructure: project persistence, I/O, artifacts, entities, selection, workspace layout, chart lifecycle, scheduling and plugin lifecycle.

### Scientific presentation contract (SDK 1.18.0)

The Core D3 scientific renderer is a rendering engine only. Core owns one shared **Scientific Presentation** layer for automatic legend placement, two-row packing, per-surface legend scope, curve-to-legend focus, reversible legend isolation, compact draggable navigation tools, and semantic light/dark styling. A plugin should declare series identity/labels/groups and data; it should not implement its own generic legend packing or renderer chrome.

Top/bottom legends use the full surface-chrome width rather than the inner axis rectangle. Dynamic multi-series plots keep a stable legend footprint across transient trace-count changes, so a temporary `2 → 1 → 2` update does not resize the plotting area. `dkdsNavigationTools:false` disables the Core navigation strip when a scientific surface intentionally needs no navigation tools.

Clicking a rendered curve focuses its corresponding Core legend entry. Clicking a legend entry isolates its semantic series/`legendgroup`; clicking the same entry again restores the baseline visibility of all series. Horizontal legend chrome is capped at two compact rows and does not expose a permanent horizontal scrollbar.

For direct scientific curve interaction, use `ctx.ui.scientificPlot.create(...)`. Core owns pointer-rate geometry editing, snapping, range/zoom gestures and focus styling through domain-neutral **manipulators**. Declare `getManipulators()` with `point`, `axis`, or `range` primitives and persist domain changes only from `onManipulationCommit`. A peak position, threshold line, fit/integration interval, crop range, baseline control, or FWHM analysis window is a plugin-domain interpretation of these same Core primitives; plugins must not implement private D3 drag loops or introduce feature-named handle contracts.

When a scientific view must own a richer domain-specific selection presentation, set `focusPolicy:{enabled:false}` (or `controllers:{focus:{enabled:false}}`). This disables only Core generic focus paint; the view remains attached to the same `InteractionRuntime`, so canonical Selection, viewport linking and legend linking continue to work. Do not unsubscribe from Interaction or create a private selection bus merely to avoid competing visual owners.

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

Do **not** combine an intrinsic-height/auto-sized parent with `minmax(<positive px>, 1fr)` and a responsive scientific plot. A plot resize can then increase the parent's intrinsic size, which triggers another ResizeObserver pass and produces a self-growing chart. Likewise, a compact form/card grid made only of `auto` rows will distribute spare height when the card is stretched by a taller sibling unless it declares `align-content:start`; this is the common cause of large blank vertical gaps in two-column Tool layouts. SDK validation reports these risky patterns. `PluginWorkspace.layoutDiagnostics()` may be called explicitly to inspect a bounded list of registered regions. It reports risks without rewriting plugin content; the plugin must correct the owning semantic container.

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

Numeric factory inputs may be arrays or number-based TypedArrays. Core copies the input into the current serializable Artifact and validates matrix shape before Store publication. BigInt TypedArrays are rejected because the project format is JSON-serializable:

```js
const curve = ctx.data.model.createSeries({
  id:'example:curve',
  x:new Float64Array([0, 1, 2]),
  y:new Float64Array([4, 5, 6])
});
ctx.data.artifacts.publish(curve);
```

Do not mutate objects returned by `get()` and expect the Store to change; publish an explicit updated Artifact instead.

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

插件设置是**用户默认偏好**；当前工程已经保存的布局/分析状态仍由插件自己的 project slice 决定。对于会直接改变当前视图呈现的状态（例如坐标轴显示方式、当前曲线可见性、Plot viewport），不要混入“新工程默认分析参数”；此类状态应继续由 project/view state 拥有。若插件在同一激活周期内支持“新建/重置工程”，reset 时应重新读取 `settings.get()`，不要永久缓存激活瞬间的默认快照。


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