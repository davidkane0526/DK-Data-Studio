# GroupArea / PlotGroup — SDK 1.49

`GroupArea` is the Core-owned low-level layout region for a related set of scientific PlotViews. SDK 1.49 adds `PlotGroup` as the preferred high-level scientific composition primitive. It is a **layout region**, not a domain component: the region may sit inside a titled panel (Resonance) or be titleless (TER), and Core never knows the scientific meaning of its children.

## Prefer PlotGroup for scientific groups

```js
const group = ctx.ui.plotGroups.create(host, {
  preferredColumns: 3,
  maxColumns: 4,
  minItemWidth: 290,
  responsive: true,
  density: 'regular'
});

group.addPlot({ id:'vg:-40', title:'Vg = -40 V', render(plotHost){ /* render */ } });
```

`PlotGroup` guarantees direct canonical PlotView membership and group ownership **without introducing a new visual wrapper**. Generated plots reuse the established `analysis-chart-card / analysis-chart-title / analysis-chart` template; `adoptPlot(...)` leaves an accepted existing card DOM/style intact. Use the low-level `GroupArea` only when the plugin already owns canonical PlotView children and requires only the generic grid controller.

## Create a low-level GroupArea

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
- the current physical orientation exposed by PlotGroup/GroupArea (`getOrientation()`; Desktop/Web report `landscape`);
- optional Native Mobile `orientationPolicy`;
- GroupArea-only **current scroll-region sticky** placement for child PlotViews;
- sticky sibling avoidance, including the out-of-flow sticky rail;
- lifecycle/resize integration with PluginWorkspace.

The plugin owns domain content, requested column preferences, titles/labels and scientific data. Core owns final `grid-template-columns`, `grid-auto-*`, display and alignment geometry. Do not write raw `gap / row-gap / column-gap` on the Core GroupArea semantic host. Spacing continues to use the established Managed Grid configuration token `--dkds-grid-gap` (Core default 10 px), so accepted plugin templates such as Resonance 12 px and TER 14 px are preserved. `density` is semantic metadata and does not silently replace an existing/adopted group gap.

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

