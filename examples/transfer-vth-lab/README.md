# Transfer Curve Vth Lab 3.0.1 3.0.0

A Plugin API 1.15 external TOP workbench reference implementation.

- Declares `workspace.role = top` and a matching dedicated `window` contract.
- Registers one `ctx.ui.topWorkspace` contract so TOP and SUPER share the same implementation.
- Uses Core-owned scoped import through `data.accepts`; the plugin creates no file picker.
- Reads only `ctx.data.sources.list()` assignments for `com.dkds.transfer-vth-lab`.
- Uses `PluginWorkspace` with `primaryScroll: "contained"` and a bounded plot grid, preventing intrinsic-height / scientific-surface resize feedback loops.
- Uses `ScientificPlot` for plotting and the Algorithm Registry for Vth extraction.

- The log-current checkbox selects the Core ScientificPlot display scale (`yScaleType: "log"`); the plugin does not pre-transform data with a private `log10()` view.


## 3.0.1

- Dedicated TOP declares the D3 runtime required by `ctx.ui.scientificPlot.create(...)`.
- Core-owned import is forwarded from the dedicated window to the owner project window.
- Raw numeric controls follow the host field visual contract.
