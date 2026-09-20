# Transfer Curve Vth Lab Unit-only Shadow Reconstruction — v3.71.51 WIP

## Scope

After the real Windows acceptance of Pulse Sampler, the next native-plugin Unit reconstruction target is **Transfer Curve Vth Lab** (`com.dkds.transfer-vth-lab`). It is the next remaining first-party scientific workbench without a production `unit-presentation.js` owner.

This phase is intentionally a **parallel Unit-only shadow reconstruction**. Production Vth remains untouched and continues to own its algorithm registration, state/project slice, scoped data sources, task execution, ScientificPlot interactions and result table.

## Why Vth is the next target

Vth stresses a combination not yet used as the active migration target:

- a fixed-left titleless `data-control` PRIME;
- source selection + numerical extraction parameters;
- four summary metrics;
- one interactive scientific curve plot;
- a vertically resizable result table below the plot;
- responsive 4→2→1 metric density and 920 px plot/results reflow;
- dedicated TOP-window presentation.

This makes it a compact but high-value test of whether the current 41-Unit vocabulary can replace the remaining hand-built DOM/CSS scientific workbench without adding a Vth-specific abstraction.

## Result

The Vth shadow is implemented under:

`examples/sdk151-unit-vth-shadow/`

It uses only public Units and ships **no CSS**. The catalog remains **41 Unit types / Unit Templates 2.5.22**. No new Unit type or runtime variant was needed.

### Public Unit composition

The shadow uses:

- `page` + `pageHeader`;
- `workspace`;
- `layout:stack-comfortable` for the control stack;
- headed `panel` surfaces for **数据** and **阈值提取**;
- `field`, `check`, `chip`, `note`, `toolbar`;
- a **fixed-titleless** `data-control` PRIME;
- `layout:fill-rows` + `metric-grid`;
- a content/body-separated `panel` for the plot card;
- `scientificPlot:curve`;
- `table:standard`;
- `splitPane:resizable` for the plot/results split.

Accepted source geometry is preserved through public Unit parameters rather than copied Vth CSS:

- left data-control width: **300 px**;
- main row gap: **10 px**;
- result-table baseline height: **180 px**;
- result-table minimum: **140 px**;
- plot reserve: **300 px**;
- responsive split reflow: **920 px**.

## Unit/SDK authoring correction discovered by the reconstruction

The runtime Unit contract itself was sufficient, but the generated native-plugin Unit blueprint still described several already-migrated data-control PRIMEs as `canonical-header`, even though the accepted production source uses titleless/chrome-less data-control surfaces.

The blueprint source has therefore been corrected so the following current first-party data-control PRIMEs teach **`fixed-titleless`** rather than a generated header:

- Data Center;
- Pulse Analysis;
- Pulse Sampler Tool;
- TER Analysis;
- Transfer Curve Vth Lab.

This is an authoring-evidence correction, not a new Unit type or new presentation path. It also aligns the generated dossier with the permanent rule that parameter/data-control surfaces do not gain a second titlebar merely because they are mounted as PRIMEs.

## Seven-layer parity

| Layer | Result | Evidence |
| --- | --- | --- |
| Function | PASS at UI/domain boundary | Visible controls map to the existing production command/state boundaries; no second Vth algorithm/store/task exists. |
| Structure | PASS | One scientific-primary PRIMARY + one titleless data-control PRIME + metrics + plot + results table. |
| Geometry | PASS | Existing public recipes plus accepted detail values express the current Vth layout. |
| Style | PASS | Shadow has no CSS and no `dkds-vth-*` visual hooks. |
| Interaction | PASS at Unit boundary | Fields/checks/actions, separator semantics, plot lifecycle and split drag are Core/Unit-owned. |
| Responsive | PASS | `metric-grid` owns 4→2→1 density; SplitPane owns 920 px stacked reflow. |
| Mobile | PASS | Same semantic surfaces are Presenter-projected; no platform branch in the shadow. |

Machine-readable evidence: `examples/sdk151-unit-vth-shadow/parity.json`.

## Production freeze evidence

The shadow phase does not modify production Vth:

- `plugin.js` SHA-256 `d58c55f592f4c0c865fa81190869c66695119e5856c2d44df1f53f19924ee875`
- `plugin.css` SHA-256 `b56cb70582da3102ee4d057349715db8707762d8702f377b660ebb3c5632d7ee`
- `analysis-runtime.js` SHA-256 `236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d`
- `vth-task.js` SHA-256 `cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1`

## Next stage

Do **not** cut production Vth over yet. The next stage should add a dependency-gated production Vth domain/service seam so the Unit shadow and production presentation can consume the same state, scoped curves, analysis results and interactions side-by-side. That seam must reuse the existing production owners and must not create a second Vth store, threshold algorithm or task.
