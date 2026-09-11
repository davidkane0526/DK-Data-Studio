# Managed Grid Layout Contract — SDK 1.28

SDK 1.28 publishes the Core `GridController` contract used by multi-plot and other responsive plugin grids. The intent is to let plugins declare **layout preferences** while Core remains the single owner of final grid geometry.

Use either:

```js
const grid = ctx.ui.grid.create(host, spec);
```

or, inside a PluginWorkspace:

```js
const grid = workbench.grid(host, spec);
```

Both return the same `DKDSGridController` contract.

## Basic responsive grid

```js
const grid = workbench.grid(host, {
  columns: 3,
  maxColumns: 6,
  minItemWidth: 260,
  responsive: true
});
```

`columns` is the requested/default count. With `responsive:true`, Core may reduce that request when the container cannot satisfy `minItemWidth`. Plugins must not write `grid-template-columns`, `grid-auto-*`, `display`, `gap`, or alignment geometry onto a Core-managed grid host. Core owns the final CSS grid geometry.

Use:

```js
grid.getColumns();        // configured base request
grid.getAppliedColumns(); // current effective count after all Core clamps
grid.getOrientation();    // Native Mobile physical orientation; Desktop/Web => landscape
```

## Native Mobile orientation policy

Orientation behavior is **opt-in**. It is not enabled for every grid and it is not tied to any plugin identity.

For the common policy “portrait uses one fewer column than landscape”, declare:

```js
const grid = workbench.grid(host, {
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

Semantics of `mode:'portrait-offset'`:

- It applies only on the Native Mobile host.
- Desktop/Web are unaffected and report `landscape`.
- If portrait has no explicit `preferredColumns` result, Core derives the portrait request from the most recent **effective landscape column count** plus `offset`.
- `offset` defaults to `-1`.
- `minColumns` defaults to `1`.
- The derived request is still subject to `maxColumns` and the normal responsive width clamp.
- Returning to landscape does not persist a portrait-derived value into plugin state. Landscape is resolved independently from the plugin's landscape preference/default.

This is a generic Grid policy. A Resonance-style GroupArea may opt in, a TER-style GroupArea may choose not to, and a non-GroupArea grid may also opt in when the same behavior is appropriate.

## Independent portrait/landscape user preferences

If a plugin allows the user to select different column counts by orientation, keep that preference in plugin/project state and expose it to Core through `preferredColumns`:

```js
const grid = workbench.grid(host, {
  columns: 3,
  maxColumns: 6,
  minItemWidth: 260,
  responsive: true,
  orientationPolicy: {
    mode: 'portrait-offset',
    offset: -1,
    minColumns: 1
  },
  preferredColumns: ({ orientation }) => {
    const value = orientation === 'portrait'
      ? workspace.columnsPortrait
      : workspace.columnsLandscape;
    return value === 'auto' ? null : Number(value);
  }
});
```

The callback returns a **requested** count, not a forced final count. Core still owns the final effective count and may reduce it to fit the available width.

Returning `null`, `undefined`, or `'auto'` means “no explicit preference for this orientation”. In portrait, Core may then apply `orientationPolicy`; otherwise it falls back to `columns`.

### Resolution order

For each layout pass Core resolves columns in this order:

1. Call `preferredColumns` for the current orientation. A finite positive value wins as the requested count.
2. If the current host is Native Mobile portrait and no explicit value was returned, apply `orientationPolicy` when present.
3. Otherwise use `columns`.
4. Clamp to `maxColumns`.
5. If `responsive:true`, reduce further when needed to satisfy `minItemWidth` for the current container width.
6. Publish the result through `getAppliedColumns()` and `data-dkds-grid-columns`.

The callback should be cheap and side-effect free because it can run from ResizeObserver-driven layout passes. Persist user choices in plugin state before calling `grid.apply()`; do not mutate project state from inside `preferredColumns`.

## GroupArea relationship

`GroupArea` is orthogonal to orientation behavior. Create it through `workbench.groupArea(...)` or `ctx.ui.groupArea.create(...)`:

```js
const area = workbench.groupArea(host, {
  columns: 3,
  responsive: true
});
```

`GroupArea` marks a managed multi-plot region whose child PlotViews may receive the **current scroll-region sticky** placement. It does not automatically enable orientation adaptation. See `GROUP_AREA.md`.

Therefore these are separate decisions:

- `GroupArea` — child placement/sticky semantics.
- `orientationPolicy` — optional Native Mobile column derivation.
- `responsive:true` — width-based Core column clamp.

A plugin should combine only the behaviors it actually needs.

## What plugins must not do

Do not recreate Core grid behavior with plugin CSS or private host checks:

```css
/* Wrong on a Core-managed grid host */
.my-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
```

Do not branch on `react-native-client`, viewport orientation, or Core DOM internals merely to choose a managed-grid column count. Declare the generic policy instead. If a layout cannot be expressed through `DKDSGridSpec`, treat that as a missing SDK contract rather than adding a first-party-only workaround.
