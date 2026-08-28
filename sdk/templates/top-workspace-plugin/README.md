# SDK TOP Workspace Example

Reference template for a **true TOP workbench** in Plugin API 1.18.

A TOP is not created by `pluginType: "workbench"` alone. The four parts must agree:

1. `workspace.role: "top"` and `workspace.activity` in `plugin.json`.
2. A dedicated `window` whose `activity` matches the workspace activity.
3. `ctx.ui.activities.add({ openMode: "window", ... })` at runtime.
4. `ctx.ui.topWorkspace.register(...)` for the shared TOP/SUPER layout contract.

Core owns the workbench import action. Declare `data.accepts`, include the `workbench-import` slot, and read assigned project data through `ctx.data.sources` / `ctx.data.artifacts`.

For scientific charts, use `ctx.ui.workspaceSurface.create(..., { primaryScroll: "safe" })`. In `safe` mode Core owns a bounded Primary viewport and its scrollbar; keep plugin roots flexible (`width:100%; min-width:0; min-height:0`) instead of chaining percentage heights. Use `minmax(0, 1fr)` only inside a genuinely bounded grid, and add `align-content:start` to form/card grids whose `auto` rows must stay compact. Use `primaryScroll:"auto"` only for intentionally document-flow pages. Do not take ownership of the host viewport with `100vh`/root `height:100%`, and do not clip semantic UI with `overflow:hidden/clip`; SDK validation flags these patterns and Core provides a runtime containment fallback.

Validate/package:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/top-workspace-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/top-workspace-plugin sdk-top-example.dkplugin
```
