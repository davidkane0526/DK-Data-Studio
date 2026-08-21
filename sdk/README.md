# DK Data Studio Plugin SDK 1.10

This directory is a **standalone plugin-development kit**. A plugin developer does not need the DK Data Studio source tree.

## Requirements

- Node.js 18 or newer for validation/packaging.
- DK Data Studio 3.60.0 or newer for the full Plugin API 1.10 contract. Older 1.x plugins remain load-compatible where their declared requirements are available.

## Create a plugin

Copy one template directory and change the plugin id/name/version.

```text
sdk/templates/workspace-plugin/     full UI/workbench example
sdk/templates/algorithm-provider/   versioned scientific algorithm example
```

The public runtime entry is `DKDSPlugins.define(manifest, activate)`. New plugins target `apiVersion: "1.10.0"`, declare every Core surface they use in `requiresCore`, and declare a `pluginType` (`foundation`, `data`, `algorithm`, `workbench`, `task`, `extension`, or `developer`) for Plugin Manager grouping.

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

For direct scientific curve interaction, use `ctx.ui.scientificPlot.create(...)`. Core owns pointer-rate marker movement, nearest-point snapping, range/zoom gestures, focus styling and width/FWHM handle geometry. Use `onMarkerDragCommit` and `onWidthWindowCommit` to persist domain changes once at gesture end; `onWidthWindowCommit` always provides both window endpoints, so plugins must not implement private one-handle drag state.

Persistent plugin state must be registered through `ctx.project.registerSlice(...)`. `restore` receives only the plugin's canonical namespaced slice; old application root fields are migrated by DK Data Studio before plugin runtime starts. A missing slice is fresh/reset state, not a signal to inspect the project root.

Do not use application source files or private globals from a plugin. If a feature cannot be implemented through this SDK, that is a missing public Core contract and should be added to the SDK/Core rather than worked around by importing application source.

## Project source-data lifecycle (DK Data Studio 3.58.2+)

Imported file lifetime is owned by the project host, not by an analysis plugin. Plugins that genuinely manage project source data can use the generic Capability Runtime:

```js
const sources = ctx.capabilities.proxy('core.data-sources');
const rows = await sources.list();
await sources.remove([{ path: rows[0].path }]);
```

`remove()` removes the canonical imported source and its dependent Artifact lineage. Analysis plugins should normally consume `ctx.data.artifacts` and keep their own data lists limited to visibility/selection/analysis state.

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
