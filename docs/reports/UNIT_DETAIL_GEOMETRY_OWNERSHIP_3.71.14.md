# Unit Detail Geometry Ownership — v3.71.14 WIP

## Purpose

v3.71.13 restored the accepted TER parameter inset and heatmap geometry, but the plugin reached those generic behaviors by passing lower-level Workbench/PlotView options through Unit composition. That reproduced the accepted result while leaving the ownership boundary weaker than intended.

v3.71.14 moves those accepted-detail declarations into Unit Templates themselves. The plugin still owns its accepted numeric detail; Unit Templates own the contract, validation, lifecycle, and translation to generic execution services.

## Ownership model

```text
accepted native source
        ↓
plugin accepted detail values
        ↓
Unit Templates detailGeometry contract
        ↓
generic Workbench / PlotView execution service
```

Core execution services do not receive or understand the plugin-facing `detailGeometry` object.

### PRIME parameter geometry

Unit authoring uses:

```js
detailGeometry: {
  contentInsetPx: 12
}
```

`units.prime` validates this value, owns the final geometry write through the Unit runtime, and removes the owned write on lifecycle cleanup. Raw `contentInset` is rejected at the Unit authoring boundary.

TER keeps its accepted parameter node directly and remains permanently titleless/headerless:

```js
variant: 'fixed-titleless',
presentationPurpose: 'parameters',
existingNode: controls,
detailGeometry: { contentInsetPx: 12 }
```

### PlotView scientific content geometry

Unit authoring uses:

```js
detailGeometry: {
  contentAspectRatio: 1,
  contentMinHeightPx: 80,
  contentMaxHeightPx: 860
}
```

`units.plotView` validates these values and translates them to the existing generic PlotView geometry service. Raw `contentAspectRatio`, `contentMinHeight`, and `contentMaxHeight` are rejected when authoring through Unit Templates.

Direct lower-level Workbench/PlotView APIs remain generic and unchanged.

## Core boundary proof

The public Unit detail object is terminated in:

- `src/core/ui/modules/composition/unit-template-scientific.js`

The generic execution services remain byte-identical to v3.71.13:

- `src/core/ui/modules/workbench/analysis.js`
- `src/core/ui/modules/plot-view/chart.js`

Neither module contains `detailGeometry` and neither knows TER or any other plugin identity.

No 42nd Unit was added. The catalog remains 41 types.

## TER accepted source preservation

`src/plugins/ter-analysis/plugin.css` remains byte-identical to the accepted source.

SHA-256:

`a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b`

The v3.71.13 host-projection fixes are retained:

- main TOP/SUPER shell uses the global `导入` route and does not gain contextual `导入数据`;
- dedicated TER retains local `导入数据`;
- long plugin names are never intentionally clipped; complete low-priority plugin buttons enter `更多功能` when required.

## Contract versions

- App: 3.71.14 WIP
- SDK: 1.51.11
- Plugin API: 1.19.0
- Unit Templates: 2.5.7
- Unit catalog: 41 types
- Theme Contract: 3.10.0
- Android versionCode: 155

## Verification

Final-source verification:

- test manifest: 434 / 434 PASS
- check coverage: 441 / 441 PASS
  - 430 shared with test
  - 11 check-only cases executed separately
  - 4 test-only cases passed
- Mobile: 103 / 103 PASS
- Performance suite: PASS
- SDK Harness: PASS
- Scientific parity: PASS
- Hard Visual Invariants: 87 / 87 PASS
- Architecture Hygiene: PASS
- Native Analysis strict audit: all tracked violations 0
- Plugin Boundary: 0
- Style Ownership strict: 0 cross-file collisions
- Style Ownership Gate strict: 0 violations
- plugin manifests/packages: 17 / 17 PASS
- authored `!important`: 0

## Acceptance status

No Windows Electron build of v3.71.13 is required before continuing. v3.71.14 supersedes it because it preserves the same intended source-parity behavior while correcting the ownership boundary.

Windows Electron remains the final visual acceptance environment for pixel/GPU/font confirmation, but it is no longer the primary detector for these Unit geometry contracts: the Unit-owned inset, Unit-owned plot sizing, host-correct import projection, and whole-button overflow are all executable release gates.
