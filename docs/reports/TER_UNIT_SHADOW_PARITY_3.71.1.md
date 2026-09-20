# TER Unit-only Shadow Reconstruction — v3.71.1 WIP

## Scope

`builtin.ter-analysis` is the first native plugin selected for a real Unit-only shadow reconstruction because it is structurally rich but has a bounded surface: one control PRIME, one main analysis surface, seven related plots, one export region and two result tables.

The production plugin is **not replaced or modified**. The shadow lives only in `examples/sdk151-unit-ter-shadow/` and is used as authoring/test evidence.

## Result

The 41-Unit type catalog is sufficient for TER. No domain-specific TER Unit is required.

The real migration did expose one previously hidden contract omission: native TER uses standalone `.dkds-meta` text below the transformed heatmap title and inside the R–V card. Before this exercise, a Unit-only author had to choose between:

- `note`, which adds note-surface background/padding and therefore changes visual semantics; or
- direct `.dkds-meta` class usage, which creates a non-Unit visual dependency.

Unit Templates 2.5.1 therefore adds the **additive `note:meta` variant**. It maps to the already accepted Core `.dkds-meta` owner and does not create a new Unit type or new stylesheet.

## Seven-layer parity

| Layer | Result | Evidence |
| --- | --- | --- |
| Function | PASS at UI/domain boundary | Header actions, display actions, transform change, export intents, clear-selection intent and layout changes map to the same native TER method/intent names. Scientific math is intentionally not duplicated. |
| Structure | PASS | Page header; one semantic `data-control` PRIME; summary strip; seven PlotViews in one PlotGroup; export panel; two managed tables. |
| Geometry | PASS | Native 118/135 px TER fields, 105/112 px heatmap-display fields, 860→760 px heatmap width transition, regular 14 px PlotGroup density, square plot and resistance-card recipes are all represented through accepted Unit geometry. |
| Style | PASS after one generic contract fill | Shadow ships no CSS and writes no private visual classes/styles. `note:meta` closes the only standalone text-style gap found in TER. |
| Interaction | PASS | Canonical Action/Menu, complete PlotView position/export contract, Core ScientificPlot base interaction policy and R–V clear-selection intent are preserved. |
| Responsive | PASS | PlotGroup owns responsive columns; accepted 950 px heatmap breakpoint is expressed via Unit responsive geometry; PRIME remains semantic rather than Desktop-coordinate based. |
| Mobile | PASS | Shadow contains no Desktop/Mobile branch. `data-control` is projected by the existing adaptive Presenter contract. |

The machine-readable result is `examples/sdk151-unit-ter-shadow/parity.json` and is release-gated by `tests/test-sdk151-ter-unit-shadow-reconstruction.js`.

## What this proves about the 41-Unit contract

The first real migration validates an important distinction:

1. **No Unit type is missing for TER.** The existing composition vocabulary is broad enough to express the real plugin rather than only a simplified demo.
2. **Variant completeness matters.** A catalog can have the right Unit type but still force private class usage if a native semantic variant is missing. The `note:meta` discovery is exactly the kind of gap the shadow process is intended to expose.
3. **Geometry extraction is working.** Previously extracted native values are usable in a real reconstruction without adding TER-specific geometry exceptions.
4. **Presets are not required.** The shadow never calls `scientificWorkbench` or `accepted-scientific-v1`; it manually composes public Units, proving the Unit layer is independently usable.

## Remaining non-Unit gap

The production TER runtime creates a private stateful analysis service in its own activation scope. An ordinary parallel plugin can see the public `analysis.providers` contribution, but that provider exposes computation primitives rather than the complete stateful TER service used by all UI actions.

For that reason, the shadow validates **functional action-boundary parity** but does not run a second live copy of production TER calculation/export state. Duplicating `analysis-service.js` into the shadow would defeat the architecture goal and create a second scientific owner.

This is not a missing UI Unit. Before an eventual production migration, a generic domain-adapter/service seam should be designed if live numeric A/B execution is required.

## Freeze safety

The existing byte-freeze gate remains unchanged and passes against:

- `src/plugins`: 110 files / SHA-256 `3a03f8c6846f66f68778c683e2025a6c1c77fb294676798b42c66e7845ef910a`
- `src/styles`: 36 files / SHA-256 `59bb51d38e699772a4c383a0f0456a5b036274f07448c91275d9f4f7071dfcee`

Therefore this phase adds SDK/Core contract capability and parallel evidence without altering accepted production plugin behavior or authored styles.

## Next migration order

After TER passes real-device visual review, the recommended order is:

1. Pulse Analysis — verify parameter/form/action-heavy composition with fewer plot-specific branches.
2. Resonance Workbench — stress the accepted scientific composition, inspector and derived multi-plot surfaces.
3. Data Center — stress data-primary presentation, larger tables/browser surfaces and mixed non-scientific controls.

Each remains shadow-only until its own seven-layer parity closes.
