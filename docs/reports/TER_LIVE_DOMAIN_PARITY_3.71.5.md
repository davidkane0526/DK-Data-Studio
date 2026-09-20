# TER Live Domain Parity — v3.71.5 WIP

## Objective

Close the non-UI migration gap identified after the four Unit-only shadow reconstructions without introducing a second domain owner. The TER Unit shadow must consume the **same production TER service** for live state, actions and numerical results.

## Architecture decision

No second Domain Service Registry was created. The existing Core Service Runtime remains the single registry/lifecycle owner and now exposes a narrow `ctx.services.domain` facade.

A provider publishes only:

- a detached serializable snapshot;
- an explicit action whitelist;
- state notifications;
- descriptor/version metadata.

A consumer receives only a connection facade. It never receives the raw service object.

Cross-plugin access defaults to dependency-scoped and requires an explicit `pluginDependencies` declaration. Ordinary `ctx.services.get/require/list` cannot retrieve Domain Adapter internals.

## Lifecycle ownership

The production plugin remains the only domain owner.

- Provider deactivation removes the adapter and invalidates existing handles.
- Consumer deactivation releases its subscriptions without affecting the provider.
- The adapter does not create a second state store, controller, worker, algorithm provider, event bus, reactive source or UI owner.
- Adapter payloads/results/snapshots cross the seam as detached serializable values.

## TER production integration

TER now loads an isolated `domain-adapter.js` module. `plugin.js` remains a thin composition entry and only performs one additive loader call after the existing production `analysis-service` has been created.

The adapter wraps that existing service and exposes the migration surface:

- `calculate`
- `autoParameters`
- `reset`
- settings/display/algorithm/transform updates
- visibility/display actions
- existing TER export/copy actions

State mutation routes back through the existing production service. Calculation still executes the existing production TER algorithm/pipeline. No TER calculation was copied into the shadow.

The production-source freeze gate was narrowed rather than removed: all previous plugin/style assets remain byte-frozen, the original TER entry and manifest must be byte-recoverable after removing the explicitly audited adapter loader, and the new adapter is checked to ensure it cannot instantiate `analysis-service`.

## Shadow integration

`examples/sdk151-unit-ter-shadow` now declares:

- Core `services` capability;
- explicit dependency on `builtin.ter-analysis`;
- connection to `builtin.ter-analysis/live`.

When the provider is available, shadow actions invoke the live production owner and the shadow summary/tables project the provider snapshot/result. The Unit shell does not retain a second authoritative parameter or result state.

## Real numerical parity proof

`tests/test-sdk151-ter-live-domain-numeric.js` launches the actual production TER `analysis-service.js`, canonical Artifact Store, Scientific Pipeline and TER algorithm provider. A synthetic transport Artifact is then driven **from the shadow-side domain connection**:

`autoParameters -> calculate -> snapshot`

Observed acceptance fixture:

- Vg rows: **1**
- Vd targets: **40**
- finite TER matrix cells: **39**

The test requires exact deep equality among:

1. the result returned through `live.invoke('calculate')`;
2. `runtime.service.getState().result` from the production owner;
3. `live.snapshot().state.result` observed by the shadow.

`vgs`, `targets` and the full TER matrix must match exactly. It also mutates `currentFloor` through the shadow action facade and verifies the value on the same production service instance.

This is stronger than running two independent implementations and comparing approximate outputs: there is only one numerical implementation and one authoritative result owner.

## Security / boundary checks

- undeclared consumers are rejected;
- declared plugin dependency is required by default;
- raw service lookup cannot bypass the facade;
- snapshots are detached;
- action payload/results are serialized;
- action names are whitelisted;
- provider removal invalidates consumer handles;
- consumer removal cannot remove provider ownership.

## Unit catalog status

This phase does not add or modify a Unit type. The catalog remains **41 Units / Unit Templates 2.5.4**. Domain migration is intentionally orthogonal to UI composition.

## Acceptance status

- generic Domain Adapter lifecycle/access/action test: **PASS**;
- TER Unit shadow live-domain wiring: **PASS**;
- real production TER live numerical parity: **PASS — 1 Vg x 40 Vd / 39 finite cells**;
- production TER thin-entry architecture: **PASS**;
- production plugin/style audited freeze: **PASS**;
- Plugin Boundary: **0**;
- SDK Harness: **PASS**;
- Mobile: **103 / 103 PASS**;
- Hard Visual Invariants: **87 / 87 PASS**;
- authored CSS: **45 files / 0 `!important`**.

## Migration conclusion

The generic service seam is now sufficient to perform a Unit-shell migration while preserving one production domain owner. TER is therefore ready for the **next migration-readiness phase**: side-by-side runtime presentation/state acceptance and a narrowly scoped production cutover plan. This report does not authorize replacing the production TER shell yet.
