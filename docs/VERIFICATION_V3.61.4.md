# DK Data Studio v3.61.4 Verification

## Release scope

- App version: `3.61.4`
- Plugin API / standalone SDK: `1.11.0`
- Development branch: `refactor/v3.61.4-generic-direct-manipulation`
- Goal: move scientific direct manipulation out of peak/FWHM-specific contracts and into reusable Core/SDK primitives.

## Architecture verified

`ScientificCurveSurface` exposes domain-neutral `getManipulators()` declarations:

- `point` — movable point/control anchor, optionally attached to a rendered marker and optionally snapped to a curve.
- `axis` — movable x/y cursor, threshold, reference or boundary line.
- `range` — editable x/y interval with two boundaries and optional constraints.

Core owns pointer capture, pointer-rate geometry updates, curve snapping, constraints, click suppression after drag, preview/commit separation and final authoritative rendering. Plugins map generic committed geometry to domain state through `onManipulationCommit`.

The resonance workbench is the reference migration: peak position uses a `point` manipulator and the FWHM analysis window uses a `range` manipulator. It contains no first-party `onMarkerDrag*` or `onWidth*` drag callbacks. FWHM width rendering remains a scientific measurement presentation; its handles are no longer an FWHM-specific interaction contract.

Plugin API 1.10 feature-named marker/width callbacks remain load-compatible only through a Core adapter when `getManipulators()` is absent. New SDK templates and documentation target Plugin API 1.11.0.

## Validation gates

The release candidate must pass:

```text
npm run check
npm test
npm run performance:test
npm run reactive:test
npm run sdk:test
npm run table-surface:test
npm run host-neutralization:test
git diff --check
```

Focused generic-interaction gates:

```text
node scripts/test-generic-direct-manipulation-v3614.js
node scripts/test-plugin-sdk-v357.js
node scripts/test-core-plugin-contract-v18.js
node scripts/check-plugin-boundaries.js
node scripts/validate-plugins.js
```

## Compatibility policy

- New plugins should declare `apiVersion: "1.11.0"` and use generic manipulators.
- Existing Plugin API 1.10 packages remain accepted where their declared Core requirements are available.
- Plugins must not bypass the public surface with private D3/Plotly drag loops or host internals.
- Adding a new domain interaction such as a threshold line, integration window, crop range or baseline control should normally require only a new manipulator declaration, not a new Core feature-named callback.
