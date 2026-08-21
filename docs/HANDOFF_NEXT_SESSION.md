# Next Session Handoff — v3.59.0

## Current baseline

- Application: `3.59.0`
- Branch: `feat/v3.59-interaction-foundation`
- Architecture baseline: v3.58 Host Neutralization remains intact. Core/Host is domain-neutral, domain persistence is plugin-owned, and TOP renderers are dedicated-only.
- Public Plugin API / standalone SDK: `1.9.0`. API 1.9 adds `ui.table` / `ctx.ui.tables` and `ui.settings` / `ctx.ui.settings`; compatible API 1.8 packages remain loadable.

## v3.59 foundation

1. `TableSurface` is the canonical table infrastructure. Normal `<table>` elements are auto-enhanced unless `data-dkds-table="off"`; explicit SDK consumers use `ctx.ui.tables.bind()` or `mount()`. Core owns column resize/auto-size, sorting, hide/show, copy operations, state restore and dynamic-table lifecycle.
2. `SettingsSurface` is the canonical plugin-default preference surface. Plugin defaults are user preferences, not scientific project data. Resonance uses it for Inspector/Group default placement and group columns.
3. Scientific chart UX is renderer-neutral at the contract level. D3 remains appropriate for editable interaction canvases and Plotly for standard result/heatmap rendering; tooltip and viewport/tool affordances are Core-owned.
4. `Ctrl+S` is a Core project shortcut in main and dedicated TOP windows. Plugins must not take ownership of ordinary application shortcuts.
5. Imported source lifetime remains Host-owned through `core.data-sources`. Data Center and Resonance source rows use the same rename/exclude/remove capability; plugin-local dataset metadata must not overwrite canonical source labels.
6. Plugin Manager visually separates system/built-in plugins from user-installed plugins.

## Resonance interaction fixes in this baseline

- Global/local peak detection records an undoable workspace edit.
- Range selection and local detection use both X and Y bounds.
- Peak marker drag has a movement threshold and robust nearest-point lookup.
- Peak movement invalidates peak-metric/physics/group render state so dependent group views update.
- Source rows expose the generic rename/exclude/remove context menu without owning source lifetime.

## Validation gates

- `npm run check`
- `npm test`
- `npm run table-surface:test`
- `npm run data-source-lifecycle:test`
- `npm run sdk:test`
- `npm run host-neutralization:test`
- `git diff --check`
- Built-in Automation Test Center: `UI / Table -> Unified TableSurface interaction contract`

Do not reimplement table basics, plugin-default settings, standard project shortcuts, scientific viewport controls or imported-source lifetime inside individual plugins. Extend a generic Core contract only when an actual plugin requirement is missing.
