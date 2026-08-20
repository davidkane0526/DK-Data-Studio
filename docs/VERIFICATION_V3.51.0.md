# DK Data Studio v3.51.0 Verification

v3.51.0 adds the Core Scientific Transform Registry and generic scalar-field projection on top of the v3.50 Scientific Data Pipeline.

## Architecture assertions

- `ctx.data.transforms` is a Plugin API 1.8 Core requirement and dedicated TOP dependency derivation maps it to `scientific-transform-runtime`.
- Canonical built-ins are `raw`, `detrend`, `didv`, `d2idv2`, `dlog`, `dvdi`, and `resistance`.
- Every public transform obtains `transform.<id>`; scalar-field-capable transforms also obtain `scalar-field.<id>`.
- Curve/scalar-field outputs use canonical semantic types, pipeline provenance/lineage, typed Artifact publication and ViewModel projection.
- TER transform choices are registry-driven and its transform heatmap executes the dynamic scalar-field stage. `d²I/dV²` therefore becomes available without a TER-specific branch.
- Resonance auxiliary transform choices and curve transforms consume the same registry.
- The legacy `computeSweepTransformMatrix` entry remains as a compatibility wrapper around generic `computeSweepScalarField`; scientific numerical definitions are unchanged.

## Runtime automation

Automation Runner 1.6.0 adds `Scientific Transform Registry & Scalar Field`. It verifies all seven built-ins, a real dI/dV curve transform, a Vg–Vd scalar field, canonical semantic types, and that TER/Resonance dedicated pipeline scopes contain the generated transform stages.

Expected development Electron result: 21 pass, 0 fail, 1 skip (22 total). The only expected skip is Packaged build identity. A packaged installer/portable run should reach 22 pass, 0 fail, 0 skip.

TOP coverage remains strict: discovered=4, tested=4, passed=4, failed=0, including ready→hide→reuse→show lifecycle validation.

## Source validation

Run:

```bash
npm run transforms:test
npm run pipeline:test
npm run performance:test
npm test
npm run check
npm run plugin:validate
git diff --check
```
