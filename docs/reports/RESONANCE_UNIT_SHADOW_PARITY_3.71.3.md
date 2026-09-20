# Resonance Workbench Unit-only Shadow Reconstruction — v3.71.3 WIP

## Scope

`builtin.resonance-workbench` is the third native plugin reconstructed in parallel from the public Unit Templates contract. It is the first reconstruction intended to stress the full accepted scientific composition rather than a single-purpose analysis page.

Production Resonance is **not replaced or modified**. The shadow lives under `examples/sdk151-unit-resonance-shadow/`; production plugin source and authored CSS remain under the existing byte-freeze gate.

## Result

The catalog remains **41 Unit types**. No Resonance-specific Unit and no 42nd Unit were required.

The real reconstruction did expose three generic omissions inside existing Unit types:

1. **`section:disclosure`** — Resonance detector settings contain a real inline `<details>/<summary>` disclosure. A static section cannot reproduce the same ownership without plugin-authored disclosure DOM/behavior. The Section Unit now exposes `disclosure`, implemented with native details/summary semantics and existing Core surface/header appearance.
2. **Anchored Popover positioning** — the range-selection command surface must appear at the selected region / pointer location. Popover already owned material and outside-dismiss behavior but exposed no public anchor/point positioning. `popover.create(...)` now accepts `anchor`, `point`, `placement` and `offset`, while Core owns viewport-clamped `left/top` through StyleGate and exposes `reposition(...)` for a moving anchor/selection.
3. **Interactive picker semantics** — `popover:picker` now defaults to `role="dialog"` and derives an accessible name from `title` unless explicitly supplied. This closes the production range-action panel's dialog semantics without giving plugins raw ARIA/chrome ownership.

These are generic composition/accessibility additions. None checks a Resonance plugin id.

## accepted-scientific-v1 audit

The shadow deliberately **does not call** `ctx.ui.scientificWorkbench` or `units.compositions.acceptedScientificV1`.

Instead it manually creates the same PRIMARY anatomy through public Units:

- `layout:accepted-main-area`
- `layout:accepted-main-workspace`
- `layout:accepted-plot-wrap`
- `layout:accepted-main-header`
- `floatingChrome:accepted-main`
- `legend:accepted-main`
- `layout:accepted-main-plot`
- `status:accepted-summary`
- `layout:accepted-summary`

Data-control, inspector and group surfaces likewise use the same public `prime` / `plotGroup` Unit builders used by the preset. `unit-template-presets.js` remains data-only and may call only public Unit facade methods. Therefore `accepted-scientific-v1` remains a mature example/preset, not a parallel renderer.

## Seven-layer parity

| Layer | Result | Evidence |
| --- | --- | --- |
| Function | PASS at UI/domain boundary | Scan visibility, detector selection/settings, detection, peak ordering, range operations, peak manipulation, inspector/group/derived rendering and export intents map to production method boundaries. The shadow does not copy production numerical/stateful services. |
| Structure | PASS | One accepted scientific PRIMARY, one fixed data-control PRIME, one movable inspector PRIME, one accepted PlotGroup PRIME with six complete child PlotViews, and three SUB surfaces for physics, spacing and gate analysis. |
| Geometry | PASS | Workspace `280/230`, main chrome `34` with accepted inset geometry, inspector `390×560`, group `880×620`, accepted `12px` regular group density and all local responsive recipes come from Core metrics/Unit Layout. |
| Style | PASS | Shadow contains no CSS, no `.respar-*` / `.reswin-*` visual class copy and no direct `.style` / style-service writes. |
| Interaction | PASS after generic contract fill | Mandatory scientific bindings remain Core-owned. Shadow adds only non-conflicting shift/context/drag/key domain bindings. Range actions use the new anchored Core Popover instead of plugin left/top positioning. |
| Responsive | PASS | PRIMARY recipes, inspector/group Portable behavior, PlotGroup auto columns and derived responsive grids are Unit/Core-owned. No shadow media query exists. |
| Mobile | PASS | Semantic `data-control`, `inspector`, `scientific-secondary` and SUB roles are projected by Presenter. Shadow has no Desktop/Mobile executable branch. |

Machine-readable evidence: `examples/sdk151-unit-resonance-shadow/parity.json`.

## PlotGroup and derived-surface coverage

The group PRIME reconstructs the production six-group family: `峰位 Vpk`, `峰电流 Ipk`, `FWHM`, `峰高 A`, `峰面积 S`, `峰突出度`. Every child remains a complete PlotView, so each has one canonical plot header, export contract and its own allowed position owner even though the group itself is a movable PRIME.

The SUB reconstruction also covers the physics plot/model/table, spacing controls/plot/table and all 13 gate-analysis chart surfaces plus summary/report/table. These derived charts are normal-flow scientific plots rather than independently movable PlotViews, matching the production ownership boundary.

## Interaction parity

The Unit ScientificPlot retains `scientific-standard-v1` mandatory behavior. Resonance-specific additions are expressed as non-conflicting `interactionExtensions`, including:

- Shift-click additive curve action;
- Ctrl/Shift context action on a marker;
- marker drag manipulation;
- `L` / `Shift+L` peak lock state;
- Arrow Up/Down sweep switching;
- Arrow Left/Right peak movement.

Default range selection, Ctrl-box zoom, wheel zoom and double-click reset remain Core bindings and are not overridden.

## Blueprint correction

The native authoring blueprint previously classified `.respar-advanced` as a generic `section:controls`. Real reconstruction proves that its semantic anatomy is a disclosure. It is corrected to `section:disclosure` in unit/geometry/reconstruction blueprints.

## Remaining non-Unit gap

As with TER and Pulse, production Resonance constructs a private, stateful controller and analysis pipeline inside its activation scope. A parallel ordinary plugin cannot safely instantiate the entire production state machine as a second live controller without copying private implementation.

Function parity is therefore measured at the UI/domain-action boundary. If simultaneous live numeric A/B becomes necessary for final production migration, add a generic domain-adapter/service seam. Do not add a Resonance-specific UI Unit or copy the private controller into the shadow.

## Migration implication

Three real native shadows now support the same conclusion:

- TER: 41 Unit types sufficient; one lightweight meta variant was missing.
- Pulse: 41 Unit types sufficient; nested position ownership and responsive split composition required refinement.
- Resonance: 41 Unit types sufficient; inline disclosure and anchored rich-popover ownership required refinement.

The remaining risk is now less about missing Unit **types** and more about exact composition/state/domain seams. Data Center should be the next shadow because it stresses data-primary/browser/table/workflow composition and the already-discovered `plotView:prime-contained` pattern from a non-scientific-first workbench.
## Final validation

The final v3.71.3 source state was validated after the Resonance Unit contract changes and release-version synchronization:

- `test` manifest: **423 / 423 PASS**. The long suite was executed in manifest-order segments after the initial command time limit; two release-metadata failures exposed during continuation were corrected and their affected paths rerun successfully.
- `check` manifest coverage: **430 / 430 PASS** — the completed 423-case `test` manifest plus all **11 check-only** cases.
- Mobile: **103 / 103 PASS**.
- SDK Harness: **PASS**.
- Scientific parity: **PASS**.
- Plugin Boundary: **0**.
- Hard Visual Invariants: **87 / 87 PASS**.
- Architecture Hygiene: **PASS**.
- Native Analysis strict audit: **PASS**.
- Plugin manifests/packages: **17 / 17 PASS**.
- Authored CSS: **45 files / 0 `!important`**.
- Production plugin/style byte freeze: **PASS**.

The release remains WIP because the shadow is migration evidence, not a production cutover, and live numerical A/B still requires a generic domain-adapter/service seam.

