# Data Center Unit-only Shadow Reconstruction — v3.71.4 WIP

## Scope

`builtin.data-center` is the fourth native plugin reconstructed in parallel from the public Unit Templates contract. It is the first reconstruction centered on a non-scientific-first `data-primary` workbench rather than a scientific analysis page.

Production Data Center is **not replaced or modified**. The shadow lives under `examples/sdk151-unit-data-center-shadow/`; production plugin source and authored CSS remain protected by the existing byte-freeze gate.

## Result

The catalog remains **41 Unit types**. No Data Center-specific Unit and no 42nd Unit were required.

The real reconstruction exposed one reusable interaction omission inside an existing Unit and one stale authoring-evidence mismatch:

1. **Interactive Chip semantics** — production Data Center formula references (`Vd`, `Id`, `Vg`) are native buttons styled as canonical chips. The previous Chip Unit was display-only. `chip.create(...,{ onInvoke })` now renders a native `button` while retaining the same Core-owned Chip geometry/paint; passive Chips remain display spans. This is generic and does not check a Data Center plugin id.
2. **Chart geometry dossier correction** — the public Unit blueprint already classified the chart preview as `plotView:prime-contained`, but the geometry blueprint still said `plotView:complete`. Production code proves the outer `scientific-secondary` PRIME is the position owner and the inner PlotView binds with `portable:false`. The geometry dossier is corrected to `prime-contained`.

The production `dc-ref-chip` also uses `padding:3px 6px`. The shadow preserves that accepted geometry through `units.layout.apply(...)`; no private `.dc-ref-chip` selector is copied.

## Seven-layer parity

| Layer | Result | Evidence |
| --- | --- | --- |
| Function | PASS at UI/domain boundary | Refresh, artifact assignment/selection, rename/exclude/delete, formula derivation, workflow steps/run/save/load, provenance, chart controls/rendering, tabs and export intents map to production Data Center method boundaries. |
| Structure | PASS | One `data-primary` PRIMARY, one `data-control` artifact-browser PRIME and one `scientific-secondary` chart-preview PRIME are composed entirely from public Units. |
| Geometry | PASS after dossier correction | Sidebar/list/filter/action/form/workflow/provenance recipes are already public. The chart PlotView is corrected to `prime-contained`; formula-reference chips preserve native `3px 6px` padding through accepted Unit Layout geometry. |
| Style | PASS | Shadow contains no CSS, no copied `.dc-*` visual selector and no direct `.style` / style-service paint owner. |
| Interaction | PASS after generic contract fill | Tabs, selection actions, context menu, dialogs, workflow controls and PlotView exports are Core-owned; formula references use the generic interactive Chip contract. |
| Responsive | PASS | `sidebar-main-wide`, `primary-flow`, `formula-grid`, `form-grid-4` and auto-fit parameter forms own reflow without shadow media CSS. |
| Mobile | PASS | `data-control` and `scientific-secondary` surfaces are Presenter-projected. The shadow contains no executable Desktop/Mobile branch. |

Machine-readable evidence: `examples/sdk151-unit-data-center-shadow/parity.json`.

## Data-primary / bounded-data coverage

The shadow reconstructs the production data-workbench anatomy through existing Units:

- artifact browser and multi-selection command group;
- assignment / lineage / field filters;
- bounded table preview of **18 rows** rather than materializing the full 12,800-row sample;
- formula / derived-column parameter form;
- invokable formula-reference Chips;
- workflow recipe toolbar, step list and step parameter form;
- provenance rows;
- rename/delete dialogs and data context menu;
- managed chart parameter form;
- `scientific-secondary` chart PRIME with an inner `plotView:prime-contained` ScientificPlot.

This validates that the same Unit layer covers data-oriented workbenches and scientific surfaces without a Data Center-specific Core composition path.

## Interactive Chip contract

A display-only chip remains a non-interactive span. When `onInvoke` is supplied, Core owns the semantic transition to a native button:

```js
units.chip.create(host, {
  variant: 'quiet',
  text: 'Vd',
  onInvoke: () => useReference('Vd')
});
```

The plugin still owns only label, semantic variant and command intent. Core owns element semantics, keyboard activation, canonical Chip paint and geometry. The contract prevents both common wrong implementations:

- reimplementing a chip as a private button with copied pill CSS;
- using an ordinary Action Unit and therefore changing the accepted chip geometry.

## Position ownership confirmation

Data Center independently confirms the generic pattern discovered during Pulse reconstruction:

```text
chart-preview PRIME = single movable position owner
        ↓
inner PlotView = title/export/scientific-content owner
        ↓
portable:false / plotView:prime-contained
```

This proves `plotView:prime-contained` is a reusable composition contract rather than a Pulse-specific exception.

## Remaining non-Unit gap

Production Data Center constructs its controller/store, canonical artifact selection runtime and workflow execution state inside the production activation scope. A parallel ordinary plugin must not copy those private owners simply to claim full live parity.

Function parity is therefore measured at the UI/domain-action boundary. If simultaneous production-vs-Unit live state/numeric A/B is required before cutover, add a **generic domain-adapter/service seam**. Do not add Data Center-specific UI Units or duplicate the production controller.

## Four-shadow conclusion

All four deliberately different native shadows now close without adding a Unit type:

- **TER** — scientific analysis page; required `note:meta`.
- **Pulse** — batch/form/split/scientific composition; required nested position ownership, canonical-header adoption and responsive SplitPane reflow.
- **Resonance** — most complex accepted scientific workbench; required disclosure and anchored rich Popover semantics, and proved `accepted-scientific-v1` is only public-Unit composition.
- **Data Center** — non-scientific-first data workbench; required interactive Chip semantics and confirmed PRIME-contained chart ownership.

Together with the generated reconstruction census for all 18 native plugin directories, this is sufficient evidence to treat the current **41-Unit catalog as type-complete for the present native-plugin set**. This does not claim that every future feature can never require a new Unit. It means future migration work should no longer expand the catalog merely because a production plugin looks different; new Unit types require new cross-plugin semantic evidence.

The next architectural risk is domain/service reuse, not UI type coverage.

## Final validation

The final v3.71.4 source state was validated after the Data Center shadow and interactive Chip contract changes:

- `test` manifest: **424 / 424 PASS**. The long suite was executed in original manifest order in bounded segments after the environment command time limit; one README SDK-version metadata mismatch was corrected and rerun successfully.
- `check` manifest coverage: **431 / 431 PASS** — all `check` entries are covered by the completed test set plus all **11 check-only** cases.
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

The release remains WIP because these shadows are migration evidence, not a production cutover, and full simultaneous live domain execution still requires the generic service seam described above.
