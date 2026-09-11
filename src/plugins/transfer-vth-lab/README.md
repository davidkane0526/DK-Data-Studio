# Transfer Curve Vth Lab 3.1.0

A Plugin API 1.19 external TOP workbench reference implementation.

- Declares `workspace.role = top` and a matching dedicated `window` contract.
- Registers one `ctx.ui.topWorkspace` contract so TOP and SUPER share the same implementation.
- Uses Core-owned scoped import through `data.accepts`; the plugin creates no file picker.
- Reads only `ctx.data.sources.list()` assignments for `com.dkds.transfer-vth-lab`.
- Uses the bounded `primaryScroll: "contained"` workspace contract: the result table is the local scroll owner, while ScientificPlot flex-fills all remaining primary height.
- Uses `ScientificPlot` for plotting and the Algorithm Registry for Vth extraction.

- The log-current checkbox selects the Core ScientificPlot display scale (`yScaleType: "log"`); the plugin does not pre-transform data with a private `log10()` view.


## 3.1.0

- Uses `primaryScroll: "contained"` because this workbench has an explicit internal results-table scroll owner.
- The vertical split now resizes the results row; the ScientificPlot row is `1fr` and therefore fills every remaining pixel by default.
- The fixed-left Data PRIME disables redundant PortableView chrome and uses the canonical Surface Header directly.

## 3.0.2

- Used the earlier `primaryScroll: "safe"` layout contract.
- ScientificPlot sizing was Host-owned, but the fixed pixel plot split left unused vertical space on taller desktop windows.

## 3.0.1

- Dedicated TOP declares the D3 runtime required by `ctx.ui.scientificPlot.create(...)`.
- Core-owned import is forwarded from the dedicated window to the owner project window.
- Raw numeric controls follow the host field visual contract.
