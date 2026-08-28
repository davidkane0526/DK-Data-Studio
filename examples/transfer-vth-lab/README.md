# Transfer Curve Vth Lab 3.0.2

A Plugin API 1.18 external TOP workbench reference implementation.

- Declares `workspace.role = top` and a matching dedicated `window` contract.
- Registers one `ctx.ui.topWorkspace` contract so TOP and SUPER share the same implementation.
- Uses Core-owned scoped import through `data.accepts`; the plugin creates no file picker.
- Reads only `ctx.data.sources.list()` assignments for `com.dkds.transfer-vth-lab`.
- Uses `PluginWorkspace` with `primaryScroll: "safe"` and Host-safe scrolling with a flexible `minmax(0, 1fr)` plot grid. Core can recover overflow instead of silently clipping plugin content.
- Uses `ScientificPlot` for plotting and the Algorithm Registry for Vth extraction.

- The log-current checkbox selects the Core ScientificPlot display scale (`yScaleType: "log"`); the plugin does not pre-transform data with a private `log10()` view.


## 3.0.2

- Uses the Plugin API 1.18 layout-safety contract: `primaryScroll: "safe"`, no workspace `overflow:hidden`, and no plugin-owned viewport clipping.
- ScientificPlot sizing is Host-owned; the plugin no longer sets a private minimum that can conflict with its grid container.

## 3.0.1

- Dedicated TOP declares the D3 runtime required by `ctx.ui.scientificPlot.create(...)`.
- Core-owned import is forwarded from the dedicated window to the owner project window.
- Raw numeric controls follow the host field visual contract.
