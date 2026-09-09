# SDK Standalone Workbench Example

This template is a **standalone workbench activity**, not a TOP and not a dedicated window. `pluginType: "workbench"` describes the plugin category only.

Use `sdk/templates/top-workspace-plugin/` when the plugin must be a true TOP that normally opens in its own window and can be promoted to SUPER.

Validate/package with `sdk/tools/dkds-plugin.js`.

## Optional responsive multi-plot grid

When the workbench contains a Core-managed multi-plot region, use `workbench.grid(...)` instead of owning `grid-template-columns` in plugin CSS. SDK 1.28 exposes the full typed Grid contract:

```js
const grid = wb.grid(host, {
  columns: 3,
  maxColumns: 6,
  minItemWidth: 260,
  responsive: true,
  orientationPolicy: {
    mode: 'portrait-offset',
    offset: -1,
    minColumns: 1
  }
});
```

The orientation policy is optional and applies only on Native Mobile. See `sdk/GRID_LAYOUT.md` before using `preferredColumns`, and `sdk/GROUP_AREA.md` for multi-plot GroupArea composition.
