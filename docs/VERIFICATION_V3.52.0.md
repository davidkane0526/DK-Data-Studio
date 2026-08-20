# DK Data Studio v3.52.0 Verification

v3.52.0 introduces versioned Scientific Algorithm Providers. Core owns algorithm discovery, version resolution, Pipeline/provenance and host transport; replaceable scientific algorithm implementations are owned by algorithm plugins.

## Architecture assertions

- `ctx.analysis.algorithms` is a Plugin API 1.8 Core requirement and dedicated TOP dependency derivation maps it to `scientific-algorithm-runtime`.
- Algorithm identity is `category + algorithmId + algorithmVersion`. Multiple versions may coexist; exact historical versions are resolvable and executable.
- Algorithm implementations are plugin-owned. Core and Workbench code may retain stable mathematical primitives/compatibility entry points, but new replaceable algorithms must not be hard-coded there.
- `Standard Resonance Algorithms` v2.0.0 provides `robust-ricker-v1@1.0.0` and `baseline-fwhm-v1@1.0.0` from plugin-local `algorithm.js`.
- Dedicated TOP renderers use Capability Runtime to invoke the same exact Algorithm Providers as SUPER without duplicating algorithm implementation scripts in each TOP manifest.
- Stable Pipeline stages `peaks.detect` and `peaks.metrics` resolve an explicit algorithm reference, execute it, and attach exact algorithm provenance to results.
- Resonance Workbench stores/uses version-qualified detector and peak-metrics references. Legacy unversioned detector preferences resolve once to a compatible exact version; existing saved scientific results are not silently recalculated by a newer default algorithm.
- `ctx.analysis.detectors` remains a compatibility facade backed by the Algorithm Registry.
- `science.resonance.peak-set` and `science.resonance.peak-metrics` are canonical result types.

## Numerical migration parity

`test-scientific-algorithm-parity-v352.js` executes deterministic synthetic data through both the prior mature `DKDSScience` detector/FWHM definitions and the new plugin-owned implementations. Scientific peak fields and FWHM/baseline/area outputs must match exactly; only generated runtime IDs are excluded from detector comparison.

## Runtime automation

Automation Runner 1.7.0 adds `Scientific Algorithm Registry & Version Lock`. It verifies the two built-in providers, actual peak/FWHM execution, exact provenance, coexistence of multiple algorithm versions, and historical-version locking.

Expected development Electron result: 22 pass, 0 fail, 1 skip (23 total). The only expected skip is Packaged build identity. A packaged installer/portable run should reach 23 pass, 0 fail, 0 skip.

TOP coverage remains strict: discovered=4, tested=4, passed=4, failed=0, including ready→hide→reuse→show lifecycle validation.

## Source validation

Run:

```bash
npm run algorithms:test
npm run transforms:test
npm run pipeline:test
npm run performance:test
npm run science:parity
npm test
npm run check
npm run plugin:validate
git diff --check
```
