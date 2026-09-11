# Cross-view Selection adapters — SDK 1.47.0

SDK 1.41.0 added table↔curve Selection. SDK 1.42.0 adds heatmap-cell↔source-scan Selection. Both use the existing `InteractionRuntime` and reference-only Selection schema 2; neither adds another Selection store or event bus.

SDK 1.43.0 adds **viewport linking as a separate bounded Interaction state channel**, not as Selection state. SDK 1.44.0 adds legend visibility linking on the same bounded Interaction transport, using stable series references and a separate `legend` channel. Neither envelope enters Selection schema 2; see [`VIEWPORT_LINKING.md`](VIEWPORT_LINKING.md) and [`LEGEND_LINKING.md`](LEGEND_LINKING.md).

## Identity rule

Permanent point identity remains exact:

```text
artifactId + seriesId + rowId
```

A table row is a projection across series and therefore uses:

```text
artifactId + rowId
```

Use `ctx.ui.selection.refs.sourceRowKey(ref)` only for row projection. Do not replace `ctx.ui.selection.refs.identity(ref)` with the projection key when persisting or publishing a point identity.

## Bind a table

```js
ctx.ui.tables.bind('preview', tableElement, {
  interaction,
  selection: {
    artifactId: artifact.id,
    type: 'data.point',
    role: 'row',
    source: 'my-table'
  }
});
```

Each `<tbody><tr>` must expose a stable `data-row-id`, or a `selection.rowId(context)` / `selection.reference(context)` callback. Managed tables created with `rows` also recognize `row.rowId` before `row.id` and preserve the source index separately from visual sort order.

Table activation publishes only a reference. Ctrl/Cmd click uses additive Selection through the same InteractionRuntime. SelectionViewBinding owns the row visual state and accessibility attributes; plugins must not listen to `dkds:selection-changed` themselves.

## Bind ScientificPlot points

For a regular table-backed trace, provide stable source metadata:

```js
const trace = {
  x,
  y,
  artifactId: artifact.id,
  seriesId: ctx.data.model.seriesId(artifact, yColumn),
  // Optional only when the artifact owns explicit row ids.
  rowIds: artifact.rowIds
};

ctx.ui.scientificPlot.react(host, [trace], layout, config, {
  interaction,
  source: 'my-plot'
});
```

When `rowIds` is absent, the canonical DataTable identity `row:<sourceIndex>` is used. A point click publishes an exact `artifactId + seriesId + rowId` reference. A table row selection (`artifactId + rowId`) projects to every visible series at that source row. An exact point selection does not activate sibling series.

`pointReference(context)` remains available for a non-DataTable mapping. It must return a stable reference, not an embedded data payload.

## ScientificCurveSurface

The D3 ScientificCurveSurface keeps series selection as its default behavior. Opt in to point targeting:

```js
ctx.ui.scientificPlot.create(host, {
  interaction,
  selectionTarget: 'point',
  getCurves: () => [{
    id: 'current',
    artifactId: artifact.id,
    seriesId: seriesId,
    rowIds: artifact.rowIds,
    points
  }]
});
```

`pointReference({curve, point, index, surface})` may override the automatic mapping. Point targeting is explicit so existing scientific workbenches do not silently change their click semantics.

## Constraints

- No row/point payload is copied into Selection.
- No plugin-private event bridge is required or allowed for this adapter.
- `artifactRevision` may be attached as a snapshot condition but does not enter permanent identity.
- Sorting a table does not change row identity.
- Display sampling must preserve the source `rowId`; a sampled/display index is never a source identity.
- Legend and viewport linking remain separate later Phase E adapters.

## Heatmap cell ↔ source scan (SDK 1.42.0)

A scalar-field cell is a view coordinate, not a persistent scientific identity. When every heatmap row comes from one scientific scan, publish the stable source scan references parallel to the heatmap Y axis:

```js
const sourceScans=vgs.map((vg,index)=>({
  ref: ctx.ui.selection.refs.series(artifactIds[index], sweepIds[index]),
  type: 'data.sweep',
  role: 'source-scan'
}));

ctx.ui.scientificPlot.scalarField(host, {
  x: vds,
  y: vgs,
  z: matrix,
  xName: 'Vds',
  yName: 'Vg',
  sourceScans,
  sourceScanType: 'data.sweep'
}, {
  interaction,
  source: 'my-scalar-field'
});
```

`sourceScans[index]` corresponds to `y[index]`. ScientificPlot does not construct an Entity for every cell or row during render. A cell click uses the renderer-provided source Y index to resolve the matching reference lazily and publishes that real source scan through the existing InteractionRuntime. The cell's X/Y coordinates may remain in hover/domain UI, but they do not become permanent Selection identity.

When the source scan is also rendered as a curve, make the curve itself the selectable scientific object:

```js
ctx.ui.scientificPlot.react(scanHost, [{
  artifactId,
  seriesId: sweepId,
  entityType: 'data.sweep',
  x: scanX,
  y: scanY,
  mode: 'lines'
}], layout, config, {
  interaction,
  selectionTarget: 'series',
  source: 'source-scan'
});
```

`selectionTarget:'series'` is explicit. The default ScientificPlot target remains `point`, so table-backed point selection from SDK 1.41.0 is unchanged.

When a source scan is selected elsewhere, the heatmap resolves matching `sourceScans` and paints only a bounded row overlay above the Canvas raster. It never creates one SVG node per cell and never publishes matrix-sized lists of cell ids. Large region Selection must continue to use `ctx.ui.selection.refs.range(sourceRef,bounds)` rather than enumerating cells or rows.

