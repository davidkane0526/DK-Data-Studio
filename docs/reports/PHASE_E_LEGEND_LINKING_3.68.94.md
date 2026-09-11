# Phase E — Legend visibility linking (3.68.94)

## Goal

Provide cross-view legend visibility interoperability on the existing Entity / Selection / Interaction architecture without introducing a second global event bus or storing legend state in Selection.

## Ownership

`src/core/scientific/legend-link-runtime.js` is the single Core owner for:

- `dkds.legend-visibility-state.v1` envelope construction;
- stable series-reference projection;
- bounded target validation;
- linked legend apply/publish orchestration.

It does not own transport and does not call `addEventListener`, `dispatchEvent`, or create `EventTarget`. Transport remains in the existing Interaction Runtime.

## Identity

Cross-view legend targets are stable series references:

```text
artifactId + seriesId
```

`artifactRevision` may travel as a snapshot condition but is excluded from permanent reference identity. Display label, color, renderer legend key and trace index are not cross-view identities.

## State contract

The linked document is bounded and semantic:

```text
schema: dkds.legend-visibility-state.v1
sourceViewId
revision
mode: isolate | restore
targets: stable series references (max 24)
```

Core intentionally does not serialize a full renderer visibility array. Current legend interaction is isolate/restore, and remote `restore` restores the receiving view's own baseline visibility.

## Transport and loop suppression

```text
legend action
 -> Scientific Legend Link owner
 -> InteractionRuntime.publishState('legend', ...)
 -> existing dkds:selection-changed bridge
 -> same-project linked runtime
 -> applyRemoteState('legend', ...)
 -> Scientific Legend Link owner
 -> renderer-neutral Chart Runtime visibility apply
```

The existing project-scoped transaction ID is preserved. Remote apply is local-only and cannot rebroadcast the same transaction, so A→B→A terminates.

## First-party adoption

Data Center `xy-line` multi-series charts opt in with a deterministic artifact-scoped legend group and already expose stable DataTable series identities.

## Non-goals

- no legend-specific global event;
- no second selection or legend store;
- no coupling to viewport state;
- no label-based series matching;
- no unbounded visibility arrays;
- no change to plots that do not opt in.
