# Phase E Scientific Viewport Linking — DKDS 3.68.93 WIP

## Scope

This step adds bounded scientific viewport linking on top of the existing Entity / Selection / Interaction architecture. It does **not** create a second global event bus, does not place viewport state in Selection schema 2, and does not implement legend visibility linking.

## Ownership

- `src/core/scientific/viewport-link-runtime.js` is the only scientific viewport-link owner.
- `InteractionRuntime` owns generic bounded linked-state transport and reuses the existing `dkds:selection-changed` cross-scope bridge with explicit channel discrimination.
- `Scientific Units` remains the only dimension/unit compatibility and conversion owner.
- `ScientificPlot` only exposes viewport state, applies relayout and delegates publish/apply to the viewport-link owner.

## Contract

A participating plot explicitly declares `viewportPolicy.link=true`, a `linkGroup`, linked axes, and scientific axis semantics. The bounded envelope schema is `dkds.viewport-state.v1` and contains only a source view id, revision, and linked-axis ranges plus scientific descriptors. It contains no Artifact payload, point lists, Selection document or history.

For each axis independently, Core requires compatible scientific dimension/unit semantics and rejects explicit quantity mismatches. Compatible numeric ranges are converted into the target unit before apply. Unknown units fail closed. `null` means autorange/reset.

## Transaction and lifecycle rules

Viewport state uses the same project-scoped Interaction transaction metadata as linked Selection. Remote state preserves the transaction id, is deduplicated before mutation and is never rebroadcast. Project identity is resolved at event time. Runtime/scope disposal removes linked-state subscriptions. Generic linked-state payloads and arrays are bounded.

## First-party adoption

TER uses link group `ter-vds-viewport` across the main TER heatmap, transformed heatmap and all-Vg R–V view. Only the X axis is linked and declared as drain-source voltage. The heatmap Y axis is gate voltage while R–V Y is resistance, so Y remains independent by contract.

## Non-goals

- No viewport-specific `dkds:*changed` event.
- No second viewport store or Selection schema change.
- No axis-label inference.
- No arbitrary y2/multi-axis mapping in this step.
- No legend visibility linking yet.

## Acceptance

The 3.68.93 regression verifies same-runtime sibling propagation, cross-scope same-project propagation, mV↔V and A↔mA conversion, project isolation, quantity mismatch and unknown-unit fail-closed behavior, autorange propagation, transaction deduplication, bounded payloads, dynamic project switching, lifecycle cleanup, Selection non-mutation, and absence of a second global event name.
