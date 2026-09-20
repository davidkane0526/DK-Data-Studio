# Scientific Viewport Linking — SDK 1.48.0

SDK 1.43.0 introduced opt-in scientific viewport linking on the existing `InteractionRuntime` transaction/link path. It does **not** add a viewport store, viewport-specific global event, or Selection payload. Selection and viewport state remain separate.

## Contract

A ScientificPlot can opt in through `viewportPolicy`:

```js
ctx.ui.scientificPlot.react(plot, traces, layout, config, {
  interaction,
  axisSemantics: {
    x: {
      name: 'Vds',
      unit: 'V',
      dimension: 'voltage',
      quantity: 'drain-source-voltage'
    },
    y: {
      name: 'Id',
      unit: 'A',
      dimension: 'current',
      quantity: 'current'
    }
  },
  viewportPolicy: {
    link: true,
    linkGroup: 'transport-vds',
    linkedAxes: ['x']
  }
});
```

`linkedAxes` is explicit. An axis that is not listed is never changed by linked viewport state.

## Scientific compatibility is mandatory

Before applying a numeric range, Core calls the existing Scientific Units owner. Axis labels are never used as evidence of compatibility.

Examples:

- `mV -> V`: compatible; the numeric range is converted.
- `A -> mA`: compatible; the numeric range is converted.
- `V -> A`: rejected.
- `a.u. -> V`: rejected because the source unit is unknown/non-convertible.
- two axes both labelled `Signal`, one in `V` and one in `A`: rejected.

If both source and target declare `quantity`, the quantities must also match. This prevents two different voltage quantities such as `gate-voltage` and `drain-source-voltage` from linking accidentally merely because both use volts. The author still chooses the link group explicitly.

## Scalar fields

`scalarField(...)` accepts the same scientific axis metadata directly:

```js
ctx.ui.scientificPlot.scalarField(plot, field, {
  xUnit: 'mV',
  xDimension: 'voltage',
  xQuantity: 'drain-source-voltage',
  yUnit: 'V',
  yDimension: 'voltage',
  yQuantity: 'gate-voltage',
  viewportPolicy: {
    link: true,
    linkGroup: 'transport-vds',
    linkedAxes: ['x']
  }
});
```

The scalar-field helper projects these fields into the same `axisSemantics` contract used by normal ScientificPlot views.

## One bounded Interaction bridge

Viewport state uses `dkds.viewport-state.v1` envelopes. Each envelope contains only:

- source view id;
- viewport revision;
- eligible x/y ranges;
- the scientific semantics needed to validate/convert those ranges.

The envelope is transmitted through `InteractionRuntime.publishState('viewport', ...)` and the existing project-scoped interaction transaction. The global transport remains the same existing bridge used by Selection; the event is discriminated by an internal `channel`. Plugins do not listen to that bridge directly.

The generic linked-state payload is bounded by Core. It cannot carry matrix data, long point-id arrays, or an unbounded view history.

## Cycle suppression

A local pan/zoom creates one normal interaction transaction. Remote application preserves that transaction id and does not publish it again. The same per-Runtime bounded transaction cache used by Selection therefore suppresses A -> B -> A cycles.

Programmatic linked relayout is also excluded from ScientificPlot's relayout capture path, so renderer-generated relayout events do not create a second transaction.

## Project and lifecycle isolation

The transaction resolves the active project at event time. A matching link group in a different project does not receive the viewport state. If project identity cannot be resolved, the existing Interaction Runtime fails closed per scope.

ScientificPlot disconnects its viewport state subscription when the view is reconfigured/disposed. `InteractionRuntime` reference-counts shared state links, so several plots using the same Runtime do not create duplicate global listeners.

## Autorange/reset

`null` range means autorange/reset. It is propagated only when the corresponding scientific axes are compatible. A reset does not copy a guessed numeric full-data range from the source; each target restores its own autorange.

## What viewport linking does not do

- It does not change reference-only Selection.
- It does not link legend visibility.
- It does not link y2 or arbitrary source-axis -> target-axis mappings in SDK 1.43.0.
- It does not infer compatible axes from titles such as `Vg`, `Voltage`, `Signal`, or `Current`.
- It does not create a viewport history or second shared state store.

Legend visibility linking is the next Phase E adapter and should reuse the same generic Interaction linked-state transport rather than introduce another global event path.
