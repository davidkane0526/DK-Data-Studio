# Phase E — Scientific dimension and unit compatibility (3.68.90 WIP)

## Scope

Phase E step 5 adds the scientific compatibility gate required before numeric cross-view state can be linked. It extends the existing Core/SDK surface and does **not** implement viewport/axis propagation itself. The existing `dkds:selection-changed` Interaction/Selection path remains the only cross-scope event path.

## Single ownership

`src/core/scientific/unit-runtime.js` is the only unit normalization/conversion owner. It is loaded before UI Infrastructure in both the main host and dedicated plugin windows and is exposed through the existing `ctx.science.units` facade. `InteractionRuntime` delegates compatibility and conversion to this owner rather than copying a conversion table.

The runtime provides:

- normalized physical dimension descriptors;
- known unit descriptors with scale/offset to a canonical SI representation;
- semantic `axis(...)`, `column(...)` and `artifactAxis(...)` helpers;
- `compatibility(source,target)` / `compatible(source,target)`;
- numeric `convert(...)`, `convertAxisValue(...)` and `convertAxisRange(...)`.

## Compatibility rules

Compatibility is proven from physical dimension plus a known numeric conversion. Labels, titles, column names and display strings are ignored. Therefore `mV` and `V` are compatible even with different labels, while `V` and `A` remain incompatible even under the same label.

Unknown or unsafe units fail closed. Current examples include `a.u.`, `arb.` and `dB`; they are not guessed to be dimensionless. An explicit dimension that conflicts with its unit is rejected. A physical dimension without a known numeric unit is also insufficient for numeric conversion.

The current conversion model is affine (`target = source * scale + offset`) and covers SI-prefix conversion, common electrical/materials compound units and offset temperature conversion such as `°C ↔ K`. Compound forms tested include `A/cm² ↔ A/m²`, `V/µm ↔ V/m`, `Ω cm ↔ Ω·m` and `S/cm ↔ S/m`. Angles follow the SI treatment as dimensionless quantities; the optional `angle` semantic id does not introduce a non-SI eighth base dimension.


## Artifact metadata

Canonical Data Artifacts preserve optional scientific semantics without changing existing artifacts that omit them:

- DataTable columns: `dimension`, `quantity`;
- Series/Sweep/Transform axes: `xDimension`, `yDimension`, `xQuantity`, `yQuantity`;
- Matrix axes/value: the corresponding x/y fields plus `valueDimension`, `valueQuantity`.

Metadata-only Artifact/column snapshots retain these fields, allowing adapters to decide compatibility without reading full numeric payloads.

## Interaction boundary

`InteractionRuntime` adds only delegating helpers:

- `axisCompatibility(...)`;
- `canLinkAxes(...)`;
- `convertAxisValue(...)`;
- `convertAxisRange(...)`.

These helpers do not dispatch events. Transaction/link-group behavior from 3.68.89 is unchanged. If the Scientific Units runtime is unavailable, compatibility fails closed.

## SDK

SDK 1.40.0 types `DKDSScientificUnitRuntime`, scientific axis descriptors/decisions, Artifact scientific metadata and the Interaction delegation helpers. `sdk/SCIENTIFIC_UNITS.md` is included in the packaged SDK authoring corpus. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.

## Phase boundary

Step 5 deliberately stops before concrete linked-view adapters. Phase E step 6 remains ordered as:

1. table ↔ curve selection;
2. heatmap cell ↔ source scan;
3. viewport linking, guarded by this unit contract;
4. legend visibility linking.

This sequencing prevents viewport synchronization from being built on axis-label heuristics or plugin-private conversion rules.
