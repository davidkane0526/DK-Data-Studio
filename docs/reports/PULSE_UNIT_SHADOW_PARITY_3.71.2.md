# Pulse Analysis Unit-only Shadow Reconstruction — v3.71.2 WIP

## Scope

`builtin.pulse-analysis` is the second native plugin reconstructed in parallel from public Unit Templates. It was selected after TER because it stresses a different part of the contract: file/batch controls, a dense extraction form, a movable raw-diagnostic scientific surface, two independent result PlotViews, a resizable plot/table split, a managed result table and adaptive/mobile projection.

The production Pulse plugin is **not replaced or modified**. The shadow lives only in `examples/sdk151-unit-pulse-shadow/` and is authoring/test evidence.

## Result

The same **41 Unit types remain sufficient**. No Pulse-specific Unit and no 42nd Unit were required.

The real migration did expose three generic composition omissions that static catalog work had not fully closed:

1. **Nested PlotView position ownership** — production Pulse makes `raw-diagnostic` a movable `scientific-secondary` PRIME, while the PlotView inside that PRIME is deliberately created with `portable:false`. The outer PRIME already owns placement/dragging. Unit Templates previously forced every PlotView to create its own Portable owner, which would produce duplicate position controls/chrome. Unit Templates 2.5.2 adds `plotView:prime-contained`: title/header/export remain mandatory, but `positionOwner:'prime'` delegates movement to exactly one enclosing movable PRIME.
2. **Existing complete PRIME header adoption** — the raw diagnostic card already owns its accepted plot header and action host. `prime:canonical-header` previously generated a second header even when `existingNode + handle + controlsHost` described a complete accepted header. It now uses `header.mode:'adopt'` for that generic case, matching the underlying PluginWorkspace contract and avoiding a second chrome owner.
3. **Responsive SplitPane reflow** — production Pulse uses the Core split controller on desktop but at `<=980px` turns the plot/table split into vertical flow and hides the separator. `splitPane` previously documented responsive reflow but exposed no authoring parameter to express it. `reflowBelow` now accepts only published Unit breakpoints and performs the stack/hide transition in Core while retaining the same SplitController state.

These are composition semantics, not Pulse-specific visual exceptions.

## Seven-layer parity

| Layer | Result | Evidence |
| --- | --- | --- |
| Function | PASS at UI/domain boundary | File check/select/remove, current/checked analysis, apply-settings, result-scope, raw-fit, copy/export and plot-export intents map to the production service method names. The shadow detects the public `pulse-read` provider but does not duplicate extraction math. |
| Structure | PASS | One page header; one `data-control` PRIME; one movable `raw-diagnostic` PRIME; one nested raw PlotView; two complete result PlotViews; one responsive SplitPane; one managed results table; Unit-managed file list/form/summary/actions. |
| Geometry | PASS | Accepted native values are consumed through Unit Layout/Split contracts: `min(1840px,100%)`, raw plot `clamp(360px,42vh,440px)`, result plots `380px → 440px` at `980px`, result-scope width `174px`, and split `540 / min 380 / reserve 220` with `980px` reflow. |
| Style | PASS | Shadow ships no CSS, copies no `.pulse-*` visual class and performs no direct style/class ownership writes. Surface, field, list, action, header, table, plot and split appearance remains Core-owned. |
| Interaction | PASS after generic contract fill | The raw card has exactly one position owner (its PRIME); result PlotViews keep their own complete position/export contract; file/check/action/list/table interactions stay on public Unit/Core runtimes; SplitPane uses the existing Core SplitController. |
| Responsive | PASS after generic contract fill | `reflowBelow:980` closes the production plot/table stacking behavior without plugin media CSS. Existing `form-grid`, `active-file-head`, `two-card-grid`, `inline-range` and other Unit recipes continue to own local responsive geometry. |
| Mobile | PASS | Shadow contains no Desktop/Mobile branch. `data-control` and `scientific-secondary` remain semantic PRIME roles projected by Presenter; split reflow is Core-owned rather than Mobile-plugin CSS. |

The machine-readable result is `examples/sdk151-unit-pulse-shadow/parity.json` and is release-gated by `tests/test-sdk151-pulse-unit-shadow-reconstruction.js`.

## Blueprint corrections discovered by reconstruction

The shadow process also found two errors in the authoring dossier itself:

- the Pulse results separator was described as `splitHandle:vertical`, although production declares `aria-orientation="horizontal"` and uses `axis:'y'`; the blueprint is corrected to `horizontal`;
- the geometry blueprint still classified `.pulse-raw-card` as `plotView:complete`; it is corrected to `plotView:prime-contained`.

The same nested-position pattern already exists in Data Center chart preview. Its authoring blueprint is therefore also reclassified to `plotView:prime-contained`. This is intentionally a **generic correction**, not a Pulse-id special case in Runtime Core.

## Why this does not weaken strict PlotView

`prime-contained` is not an escape hatch for arbitrary `portable:false` PlotViews.

The strict contract remains:

- title required;
- accepted PlotView header required;
- export required;
- exactly one position owner required.

`complete` owns that position itself through PortableView and multiple placements. `prime-contained` may only declare `positionOwner:'prime'`; Runtime fixes its local placement to `home` and disables its own Portable owner. A standalone author cannot use this variant to create a titleless/exportless/positionless plot.

## Remaining non-Unit gap

As with TER, the production Pulse runtime creates a private stateful analysis service inside its activation scope. The public `pulse-read` provider exposes the analysis primitive, but an ordinary parallel plugin cannot invoke the complete production batch state machine and UI action service as a second live instance.

Therefore Function parity is intentionally measured at the **UI/domain action boundary**, not by copying `analysis-service.js` into the shadow. If later production migration requires simultaneous numeric A/B execution, the correct addition is a generic domain-adapter/service seam. It is not a reason to add another UI Unit.

## Freeze safety

This phase does not edit `src/plugins/pulse-analysis/**` or any authored stylesheet. The existing native plugin/style byte-freeze test remains active and passes. Unit additions are confined to generic Core composition runtime/contracts, SDK types/docs/blueprints, the parallel example and release tests.

## Migration sequence

With TER and Pulse both reconstructed without adding a Unit type, the next stress test should be **Resonance Workbench**. It should focus on accepted scientific composition, inspector/state interactions, PlotGroup/derived plots and the largest combination of existing Units. Data Center should follow to stress data-primary, browser/table/workflow and the same `prime-contained` nested PlotView ownership found here.

## Release validation

The final v3.71.2 source state passed the complete release evidence set after the shadow reconstruction:

- test manifest: **422 / 422 PASS**;
- check manifest coverage: **429 / 429 PASS** (418 overlapping test cases plus 11 check-only cases);
- Mobile: **103 / 103 PASS**;
- SDK Harness: **PASS**;
- Scientific parity: **PASS**;
- Plugin Boundary: **0**;
- Hard Visual Invariants: **87 / 87 PASS**;
- Architecture Hygiene and Native Analysis strict audit: **PASS**;
- plugin manifests/packages: **17 / 17 PASS**;
- authored CSS: **45 files / 0 `!important`**;
- production plugin/style byte freeze: **PASS**.

This evidence closes the Pulse shadow phase without changing the 41-Unit type count or modifying the production Pulse implementation.
