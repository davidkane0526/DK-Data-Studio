# SDK TOP Workspace Example

Reference template for a **true TOP workbench** in Plugin API 1.16.

A TOP is not created by `pluginType: "workbench"` alone. The four parts must agree:

1. `workspace.role: "top"` and `workspace.activity` in `plugin.json`.
2. A dedicated `window` whose `activity` matches the workspace activity.
3. `ctx.ui.activities.add({ openMode: "window", ... })` at runtime.
4. `ctx.ui.topWorkspace.register(...)` for the shared TOP/SUPER layout contract.

Core owns the workbench import action. Declare `data.accepts`, include the `workbench-import` slot, and read assigned project data through `ctx.data.sources` / `ctx.data.artifacts`.

For scientific charts, use `ctx.ui.pluginWorkspace.create(..., { primaryScroll: "safe" })`. Keep plugin-owned roots flexible (`min-width:0; min-height:100%`), use `minmax(0, 1fr)` for flexible chart rows, and give the plot target only a reasonable preferred `min-height`. Do not take ownership of the host viewport with `100vh`/root `height:100%`, and do not clip semantic UI with `overflow:hidden/clip`; API 1.16 validation rejects those patterns and Core provides a runtime overflow fallback.

Validate/package:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/top-workspace-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/top-workspace-plugin sdk-top-example.dkplugin
```
