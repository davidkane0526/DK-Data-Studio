# SDK TOP Workspace Example

Reference template for a **true TOP workbench** in Plugin API 1.15.

A TOP is not created by `pluginType: "workbench"` alone. The four parts must agree:

1. `workspace.role: "top"` and `workspace.activity` in `plugin.json`.
2. A dedicated `window` whose `activity` matches the workspace activity.
3. `ctx.ui.activities.add({ openMode: "window", ... })` at runtime.
4. `ctx.ui.topWorkspace.register(...)` for the shared TOP/SUPER layout contract.

Core owns the workbench import action. Declare `data.accepts`, include the `workbench-import` slot, and read assigned project data through `ctx.data.sources` / `ctx.data.artifacts`.

For viewport-owned scientific charts, use `ctx.ui.pluginWorkspace.create(..., { primaryScroll: "contained" })` and bounded CSS (`height:100%; min-height:0`) through every ancestor between the workspace and plot. Do not combine an intrinsic-height parent with `minmax(<px>, 1fr)` and a responsive chart; that can create a resize feedback loop.

Validate/package:

```bash
node sdk/tools/dkds-plugin.js validate sdk/templates/top-workspace-plugin
node sdk/tools/dkds-plugin.js package sdk/templates/top-workspace-plugin sdk-top-example.dkplugin
```
