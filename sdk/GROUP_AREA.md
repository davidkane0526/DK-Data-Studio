# GroupArea — SDK 1.28

`GroupArea` is the Core-owned semantic region for a related set of scientific PlotViews. It is a **layout region**, not a domain component: the region may sit inside a titled panel (Resonance) or be titleless (TER), and Core never knows the scientific meaning of its children.

## Create a GroupArea

Inside a PluginWorkspace:

```js
const area = workbench.groupArea(host, {
  columns: 3,
  maxColumns: 6,
  minItemWidth: 260,
  responsive: true
});
```

Outside a PluginWorkspace, use the scoped runtime:

```js
const area = ctx.ui.groupArea.create(host, {
  columns: 3,
  responsive: true
});
```

Declare `"ui.group-area"` in `requiresCore`.

## What Core owns

A GroupArea is a managed grid with an explicit semantic identity. Core owns:

- final row/column geometry and responsive width clamping;
- the current effective column count (`getAppliedColumns()`);
- optional Native Mobile `orientationPolicy`;
- GroupArea-only **current scroll-region sticky** placement for child PlotViews;
- sticky sibling avoidance, including the out-of-flow sticky rail;
- lifecycle/resize integration with PluginWorkspace.

The plugin owns only domain content, requested column preferences, titles/labels and scientific data. A plugin must not write `grid-template-columns`, `grid-auto-*`, `display`, `gap`, or alignment properties on the GroupArea host.

## Child PlotViews

Bind ordinary PlotViews as children. Their normal placements remain the same as any other plot (`home`, `left`, `right`, `bottom`, `float`, `global`). Core automatically exposes `sticky` only when the PlotView home is inside a GroupArea. Do not add a plugin-specific sticky option.

## Titles are optional

GroupArea does not create an outer header. These are equally valid:

- Resonance: a titled “组图面板” containing a GroupArea.
- TER: a titleless multi-plot workspace whose plot cards are the GroupArea children.

This is deliberate: GroupArea describes the relationship between plots, not the chrome around them.

## Orientation adaptation

`orientationPolicy` is optional and independent of GroupArea semantics. For example:

```js
workbench.groupArea(host,{
  columns:4,
  responsive:true,
  orientationPolicy:{mode:'portrait-offset',offset:-1,minColumns:1},
  preferredColumns:({orientation})=>orientation==='portrait'?portraitPreference:landscapePreference
});
```

See `GRID_LAYOUT.md` for the exact resolution order.

## Current contract boundary

`GroupArea` is the only public way to request GroupArea semantics. Use `ctx.ui.groupArea.create(...)` or `PluginWorkspace.groupArea(...)`; plain managed grids remain ordinary grids. There is no alternate flag or migration path in plugin runtime. Historical project-state conversion, when needed, happens before plugin activation through the Project Compatibility Gateway.

