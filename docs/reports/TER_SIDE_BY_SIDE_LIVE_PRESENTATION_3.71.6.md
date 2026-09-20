# TER Side-by-Side Live Presentation Acceptance — v3.71.6 WIP

## Purpose

This phase verifies the first migration candidate after the 41-Unit catalog and the shared production-domain seam were established.

The production TER presentation is **not replaced**. The production TER analysis service/controller and the Unit-only TER shadow are exercised side-by-side against the same production state/numeric owner.

The acceptance question is stricter than the earlier Unit-only reconstruction question:

> Does the Unit shell display and mutate the same live production state, tables, plot payloads and controller selection, without owning a second TER calculation or state store?

## Single-owner architecture

The authoritative runtime remains:

```text
production TER Artifact inputs
        ↓
production TER analysis-service
        ↓
production TER controller
        ↓
services.domain capability projection
       ↙                         ↘
production presentation      Unit TER shadow
```

The Unit shell does not instantiate a second analysis service, controller, algorithm provider, worker, reactive source or result store.

`src/plugins/ter-analysis/domain-adapter.js` only projects serializable production state plus whitelisted actions. Its snapshot now also projects:

- the existing controller Selection snapshot;
- the transform matrix obtained from the existing production service.

Both are projections of existing owners, not new owners.

## Differences found by live side-by-side acceptance

The earlier seven-layer shadow reconstruction was intentionally presentation-structure focused. Live comparison exposed four gaps that static reconstruction could not prove.

### 1. Reverse synchronization of visible controls

The Unit shell previously sent setting actions to production but did not continuously project production settings back into its visible fields.

v3.71.6 synchronizes the visible Unit controls from the production snapshot:

- Vds min;
- Vds max;
- Vds step;
- pairing tolerance;
- current floor;
- only-fully-visible;
- TER algorithm;
- colorscale;
- z minimum;
- z maximum;
- color tick;
- x tick;
- y tick;
- transform type/direction form.

The acceptance harness checks the shared visible values against the production controls/state.

### 2. Scientific numeric input type preservation

HTML number fields deliver text. The Unit shadow previously forwarded values such as `"2e-15"` into the production domain adapter, which could change a production scientific parameter from `number` to `string`.

The Unit boundary now normalizes numeric fields to `number | null` before invoking the shared production owner.

This is a presentation-boundary correction, not a change to production TER calculation semantics.

### 3. Full production result projection

The previous Unit shadow proved that two result-table Units could be composed, but projected only a reduced three-column subset.

The live shell now projects both complete production result tables with eight visible columns:

- independent axis (`Vg` or `Vd`);
- `TER_Max`;
- arg-max axis;
- `I_up`;
- `I_down`;
- `R_up`;
- `R_down`;
- `方式`.

Formatting follows the production presentation contract used by the acceptance fixture.

### 4. Seven plot payloads now consume the production result

The prior Unit shadow had seven real PlotView/ScientificPlot containers but did not establish live result-data projection for each surface.

v3.71.6 projects the authoritative production result into all seven Unit ScientificPlot surfaces:

1. TER(Vd,Vg) heatmap;
2. transformed Vg–Vd heatmap;
3. R–V all-Vg positive/reverse sweeps;
4. TER_Max–Vg;
5. Vd@TER_Max–Vg;
6. TER_Max–Vd;
7. Vg@TER_Max–Vd.

The transform heatmap uses the transform matrix returned by the existing production service. No transform algorithm is copied into the Unit plugin.

## Controller selection round-trip

The production controller remains the only Selection owner.

The domain snapshot projects its selection into the Unit R–V status line. The side-by-side test then:

1. selects a real TER point through the production controller;
2. verifies the Unit shell shows the corresponding `Vg/Vds` visible status;
3. invokes Unit `clear-highlight`;
4. verifies the same production controller Selection is cleared;
5. verifies the Unit visible status returns to the no-selection text.

This closes the interaction loop in both directions without a second Selection model.

## Real production numerical basis

The acceptance uses the same real production numerical chain established in v3.71.5:

- canonical Artifact Store;
- Scientific Pipeline;
- production TER algorithm provider;
- production `analysis-service.js`;
- production controller;
- production domain adapter.

Fixture result:

- **1 Vg row**;
- **40 Vd targets**;
- **39 finite TER matrix cells**.

The side-by-side presentation therefore consumes a real production TER result, not a mocked numerical object.

## Executable acceptance

Release gate:

`tests/test-sdk151-ter-side-by-side-live-presentation.js`

The test runs the real production TER service/controller/adapter and the real Unit TER shadow activation function in one deterministic host harness.

It verifies:

- **12 captured visible control contracts** used by the live comparison harness;
- two complete result tables;
- seven production-authoritative plot payloads;
- production → Unit state synchronization;
- Unit → production scientific setting mutation;
- production controller → Unit selection projection;
- Unit clear action → production controller round-trip;
- live numeric and presentation digests.

The gate is present in both `test` and `check` manifests.

## Seven-layer interpretation after v3.71.6

The four previous Unit-only reconstructions established the type/structure/style/responsive contracts. v3.71.6 adds live state and data evidence for the first cutover candidate.

| Layer | TER evidence after v3.71.6 |
|---|---|
| Function | Same production domain action owner; no duplicate TER calculation |
| Structure | Existing TER Unit-only reconstruction remains PASS |
| Geometry | Existing 477-rule/native Unit geometry gates remain PASS |
| Style | Canonical Unit/Core owners remain unchanged; authored CSS unchanged |
| Interaction | Production controller Selection and Unit actions round-trip through one owner |
| Responsive | Existing Unit/Presenter and Mobile gates remain PASS |
| Mobile | Mobile suite 103/103 PASS; no separate TER mobile business implementation |
| Live presentation data | Visible controls, full tables and seven plot payloads project from production state/result |

## What this phase does not claim

This automated acceptance is deliberately **not** described as Windows Electron pixel acceptance.

It proves live DOM/state/table/plot-payload composition and Core contract compatibility. It does not replace a final human check of Windows Electron font rasterization, GPU backdrop/filter behavior, exact pixel spacing or device-specific rendering.

No production TER presentation cutover occurs in v3.71.6.

## Validation

Final v3.71.6 source validation:

- `test`: **427 / 427 PASS**;
- `check`: **434 / 434 covered PASS** (`423` shared + `11` check-only; the 4 test-only cases are covered by the complete 427/427 `test` run);
- Mobile: **103 / 103 PASS**;
- SDK Harness: **PASS**;
- Scientific parity: **PASS**;
- Plugin Boundary: **0**;
- Hard Visual Invariants: **87 / 87 PASS**;
- Architecture Hygiene: **PASS**;
- Native Analysis strict audit: **PASS**;
- Plugin manifests/packages: **17 / 17 PASS**;
- authored CSS: **45 files / 0 `!important`**;
- production plugin/style freeze with isolated TER domain seam: **PASS**.

## Cutover readiness conclusion

TER is now ready for the **next controlled phase: production presentation cutover preparation**.

The recommended next step is not to migrate Pulse/Resonance/Data Center. Instead:

1. freeze the current side-by-side acceptance as the TER cutover guard;
2. extract the Unit TER presentation into the production TER package while retaining the same `analysis-service`, controller and domain owner;
3. keep the old production presentation available only as a short-lived verification reference during the cutover branch, not as a long-term compatibility path;
4. run the same state/numeric/presentation gates plus Windows Electron visual acceptance;
5. remove the old TER presentation only after acceptance.
