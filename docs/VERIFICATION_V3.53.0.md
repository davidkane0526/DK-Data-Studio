# DK Data Studio v3.53.0 Verification

v3.53.0 moves replaceable transport-transform, scalar-field and TER numerical implementations behind versioned Scientific Algorithm Providers while keeping the Core Transform Registry, Scientific Pipeline, semantic types and provenance contracts stable.

## Acceptance targets

- Application version: `3.53.0`.
- Resonance Workbench: `3.53.0`.
- TER Analysis: `3.7.0`.
- Standard Resonance Algorithms: `2.1.0`.
- Standard Transport Algorithms: `1.0.0`.
- Scientific Transform Runtime: `1.1.0`.
- Automation Runner: `1.8.0`.
- Built-in plugin manifests: 10 valid definitions.

## Algorithm Provider contract

`algorithmProvider` and `algorithmCategories` are formal plugin-manifest fields. Provider plugins require `analysis.algorithms`. Dedicated TOP windows declare only the algorithm categories they consume; the host discovers matching built-in, trusted-override and external providers by category and loads their scripts before the target plugin. No target-plugin/provider-id routing table is allowed.

The standard transport provider owns exact v1 numerical implementations for:

- `transport.raw@1.0.0`
- `transport.detrend@1.0.0`
- `transport.didv@1.0.0`
- `transport.d2idv2@1.0.0`
- `transport.dlog@1.0.0`
- `transport.dvdi@1.0.0`
- `transport.resistance@1.0.0`
- `transport.scalar-field@1.0.0`
- `ter.high-low-ratio@1.0.0`

Core `src/science/*` entry points remain compatibility/reference implementations and numerical parity or fallback paths. New replaceable scientific algorithms belong to versioned Algorithm Plugins.

## Scientific parity

Run:

```text
node scripts/test-scientific-transport-algorithm-parity-v353.js
node scripts/test-scientific-transport-algorithm-integration-v353.js
```

The parity test compares all seven transport transforms point-by-point, generic scalar-field matrices, TER matrices and TER maxima against the previous mature scientific implementation.

## Built-app automation

Automation Runner 1.8.0 adds:

- `Transport / Scalar Field / TER Algorithm Providers`
- `TOP local Algorithm Provider routing`

The TOP routing case derives expected providers from `algorithmCategories` and the installed provider manifests, then compares those expectations with the provider scripts actually loaded by each independent renderer.

Expected development Electron result:

```text
26 pass
0 fail
1 skip
27 total
```

The single expected skip is `Packaged build identity`. A packaged installer/portable build should target `27 pass / 0 fail / 0 skip`.

## Regression suite

Before release run:

```text
npm test
npm run check
npm run performance:test
npm run algorithms:test
npm run transforms:test
git diff --check
```

TER Python reference parity, Scientific engine parity, Plugin Boundary, SUPER/TOP lifecycle and project-format compatibility must remain green.
