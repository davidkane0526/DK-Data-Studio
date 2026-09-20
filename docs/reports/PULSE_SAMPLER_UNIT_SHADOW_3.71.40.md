# Pulse Sampler Tool Unit Shadow — v3.71.40

## Scope

This stage starts the Pulse Sampler Tool Unit migration without replacing the production presentation or duplicating its scientific/domain runtime.

Production remains owned by `src/plugins/pulse-sampler-tool/`:

- pulse generation and segment composition;
- project slice/state;
- scoped source selection;
- steady-state extraction task;
- table/plot data preparation;
- export/copy commands;
- dedicated Tool-window lifecycle.

The new authoring proof is `examples/sdk151-unit-pulse-sampler-shadow/`. It is disabled by default and exists only to prove that the accepted Pulse Sampler presentation can be reconstructed with the current public Unit contract before any production cutover.

## Unit reconstruction

The shadow uses the existing 41 public Units only. No new Unit type and no Pulse-specific Unit were added.

Reconstructed surfaces:

1. Page + page header + workspace.
2. Permanently titleless `data-control` parameter PRIME.
3. Vd / Vs / Vg channel tabs.
4. Eight pulse parameter fields.
5. Four primary pulse actions.
6. Added-segment toolbar + segment table.
7. Merged waveform ScientificPlot + table.
8. Sampling source/column/trim controls.
9. Result X/Y controls + copy/export actions.
10. Result ScientificPlot + table.

Reusable accepted Layout recipes are used for the detail geometry:

- `stack-comfortable`;
- `form-grid-2`;
- `action-grid-4`;
- `control-label-row`;
- `segment-bar`;
- `analysis-control-grid`;
- `result-control-grid`;
- `result-grid-asymmetric`.

The shadow contains no CSS. Component appearance, field/action chrome, surfaces, headers, tables and scientific plots therefore remain Core/Unit owned.

## Seven-layer parity status

`parity.json` records the current stage:

- Function: pass-boundary. Every production interaction boundary is represented; production algorithms/tasks are intentionally not duplicated.
- Structure: pass.
- Geometry: pass.
- Style: pass with zero shadow CSS.
- Interaction: pass-boundary.
- Responsive: pass through public Unit recipes.
- Mobile: pass at semantic composition level; Presenter remains the platform owner.

`productionReplaced` remains `false`.

## Why production is not cut over yet

Pulse Sampler Tool is still a monolithic production owner in which state, numerical behavior, window lifecycle and presentation are closely adjacent. Replacing its presentation immediately would repeat the failure pattern exposed during the Data Center migration.

The next stage must first connect the Unit shadow to the existing production state/action owner in a live side-by-side acceptance path. The shadow must consume the same model/results and route actions back to the same owner. Only after live function/state/geometry parity is proven should production presentation be replaced.

## Data Center inset adjustment in the same release

The bounded preview row-count right inset was reduced exactly 50%, from `40px` to `20px`, at the existing Unit Layout owner. No Data Center CSS override was added.

## Validation

- Test manifest: 457 / 457 PASS (executed in original-order bounded ranges after the normal runner hit the environment time limit).
- Check coverage: 464 / 464 PASS coverage: 453 shared cases + 4 test-only cases + 11 check-only cases all executed.
- Mobile: 103 / 103 PASS.
- Clean-source Mobile after deleting `src/generated`: 103 / 103 PASS.
- Performance suite: PASS.
- SDK suite: PASS.
- SDK Harness: PASS.
- Scientific parity: PASS.
- Hard Visual Invariants: 87 / 87 PASS.
- Architecture Hygiene: PASS.
- Unit runtime/style ownership: 4 current production Unit presentations, 81 Layout mounts, 1 SplitPane, 0 violations.
- Unit semantic/cascade audit: 73 recipes / 58 shorthand-sensitive, 0 violations.
- Native Analysis strict audit: all tracked counts 0, including Pulse Sampler Tool.
- Plugin Boundary: 0.
- Plugin manifests/packages: 17 / 17 PASS.
