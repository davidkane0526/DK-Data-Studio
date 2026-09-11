# Scientific Legend Visibility Linking — SDK 1.47.0

SDK 1.44.0 adds opt-in cross-view legend visibility linking on the existing `InteractionRuntime` transaction/link path. It does **not** add a legend store, a `dkds:legend-changed` event, or any legend state to Selection schema 2.

## Opt in explicitly

```js
ctx.ui.scientificPlot.react(host, traces, layout, config, {
  interaction,
  legendPolicy: {
    link: true,
    linkGroup: `artifact:${artifact.id}:legend`
  }
});
```

Plots remain local unless `legendPolicy.link === true`. `linkGroup` is project-scoped through the existing Interaction transaction contract.

## Stable target identity

A linked legend target must resolve to a stable series reference:

```text
artifactId + seriesId
```

Artifact revision may be present as a snapshot condition but is not part of permanent series identity. Display labels, legend text, colors, trace indices, and renderer-generated keys are never cross-view identities.

For ordinary DataTable-backed traces, provide the same trace metadata already used by table↔curve Selection:

```js
{
  artifactId: artifact.id,
  artifactRevision,
  seriesId: ctx.data.model.seriesId(artifact, column.key),
  name: column.name
}
```

Two views may use different labels or trace ordering and still link correctly. Two traces with the same label but different `seriesId` values do not link.

## Bounded state

The linked envelope is `dkds.legend-visibility-state.v1` and contains only:

```text
sourceViewId
revision
mode: isolate | restore
targets: stable series references
```

Current Core legend interaction is isolate/restore, so the linked state mirrors that semantic rather than serializing renderer state or entire visibility arrays. A single action may reference at most **24** stable series targets. Larger groups fail closed; do not enumerate unbounded traces.

`restore` means “restore this target view's own baseline visibility”, not “copy the source renderer's full trace visibility array”. This preserves local renderer/layout details while keeping the semantic action consistent.

## Transaction and lifecycle rules

Legend linking reuses the generic bounded Interaction state transport introduced for viewport linking:

```text
legend action
  -> Core Legend Link owner
  -> InteractionRuntime.publishState('legend', ...)
  -> existing dkds:selection-changed bridge, channel:'legend'
  -> same-project linked InteractionRuntime
  -> Core Legend Link apply
```

The original transaction id is preserved on remote apply. Remote state is never rebroadcast, so A→B→A loops terminate. Plugin/scope disposal releases the link subscription.

Selection, viewport, and legend visibility are separate state channels. A legend visibility action does not mutate Selection or viewport ranges.

## Fail-closed cases

Core ignores or refuses linkage when:

- `legendPolicy.link` is not enabled;
- no stable `artifactId / seriesId` reference exists;
- the target series does not exist in the receiving view;
- the link group belongs to another project;
- the target set exceeds the bounded limit;
- the state schema/mode is unsupported.

Do not add plugin-owned global listeners for legend linking. Use the ScientificPlot policy and existing Interaction Runtime.
