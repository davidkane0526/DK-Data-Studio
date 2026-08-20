# DK Data Studio v3.50.0 Verification

v3.50.0 introduces the Core Scientific Data Pipeline. The pipeline is a plugin-agnostic execution contract that carries scientific data from typed input Artifacts through transforms/analysis into typed output Artifacts, provenance/lineage, Selection projections and presentation ViewModels.

## Architectural acceptance

- `src/core/scientific-pipeline-runtime.js` is loaded by the main renderer and every dedicated TOP renderer.
- Plugin API 1.8 exposes `ctx.data.pipeline`; plugins that use it must declare `requiresCore: ["data.pipeline"]`.
- `requiresCore.data.pipeline` automatically derives the `scientific-pipeline-runtime` TOP dependency. Plugins do not duplicate this Core dependency in `window.dependencies`.
- Pipeline stages support synchronous `runSync()` and asynchronous `run()` execution.
- Stages declare input/output semantic types, kinds, parameters, cache budget, projection and selection semantics.
- Core automatically adds `semanticType`, provenance and Artifact lineage to stage outputs.
- Artifact Store round-trips preserve non-empty `semanticType` while legacy Artifacts remain shape-compatible.
- Stage caching uses source Artifact fingerprints/revisions plus parameters and is provided by the shared Performance Runtime.
- Owner cleanup removes registered pipeline stages when a plugin deactivates.

## First real adopters

### TER Analysis 3.5.0

- TER matrix calculation executes through `ter-matrix`.
- Transformed Vg–Vd scalar fields execute through `transform-matrix`.
- The TER matrix stage publishes `science.ter.matrix` and exposes a typed Selection projection and heatmap ViewModel.
- Existing `Analysis.computeTerMatrix` and `Analysis.computeSweepTransformMatrix` numerical implementations are unchanged.

### Resonance Workbench 3.50.0

- Gate-dependent resonance analysis executes through `gate-analysis`.
- The stage publishes a transient `resonance.gate-analysis` result with source-data lineage and a reusable series ViewModel.
- Existing gate/TER scientific algorithms are unchanged.

## Built-app automation

Automation Runner 1.5.0 adds `Scientific Data Pipeline`. It creates a synthetic typed I–V Artifact, executes the pipeline twice, verifies cache reuse, published semantic type, provenance, lineage, typed Selection and ViewModel projection.

The default desktop configuration now has 21 automation cases. A source/development Electron run should normally report **20 pass, 0 fail, 1 skip** (packaged-build identity). A packaged installer/portable run should normally report **21 pass, 0 fail, 0 skip**.

TOP coverage remains strict: discovered = tested = passed = 4 and failed = 0, including ready → hide → reuse → show lifecycle validation.

## Source verification

Run:

```text
npm run pipeline:test
npm test
npm run check
```

TER Python reference parity, project format compatibility, plugin boundary checks, ScientificPlot/resource lifecycle tests and TOP lifecycle tests must remain green.
