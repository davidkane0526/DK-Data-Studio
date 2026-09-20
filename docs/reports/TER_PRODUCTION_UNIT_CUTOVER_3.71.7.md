# TER Formal Production Unit Cutover — v3.71.7 WIP

## Purpose

v3.71.7 performs the first **formal native-plugin production cutover** onto the 41-Unit composition contract.

The candidate is TER Analysis because v3.71.1–v3.71.6 already established, in order:

1. Unit-only shadow reconstruction;
2. shared production-domain ownership;
3. exact production numeric parity;
4. side-by-side live presentation acceptance.

The cutover changes only the production **presentation/composition owner**. The production TER analysis service, controller, domain adapter, task path, selection-link runtime, scientific algorithms and numerical results remain the same owners.

## Production ownership after cutover

```text
Artifact / Scientific Pipeline
          ↓
TER analysis-service          ← unchanged single numerical/state owner
          ↓
TER controller                ← unchanged single interaction/selection owner
          ↓
feature-runtime               ← unchanged scientific behavior/render binding
          ↓
unit-presentation             ← NEW production presentation owner
          ↓
41 public Unit Templates
```

There is no legacy presentation fallback and no second TER state/controller/calculation path.

## Removed production presentation owners

The formal cutover deletes:

- `src/plugins/ter-analysis/plugin.css`;
- `src/plugins/ter-analysis/shared-views.js`.

The production manifest now has:

- `styles: []`;
- `unit-presentation.js` in both SUPER and dedicated-window script lists;
- explicit `ui.unit-templates` and `ui.table` requirements/capabilities.

The old files are not kept dormant and are not hidden behind a compatibility flag.

## New production presentation

`src/plugins/ter-analysis/unit-presentation.js` builds the current TER UI from public Unit factories only:

- analysis Page + PageHeader;
- canonical header actions (`自动参数 / 计算 TER / 布局`);
- standard Workspace;
- `data-control` PRIME for parameters/display/transform controls;
- comfortable PlotGroup;
- seven PlotViews;
- seven ScientificPlot surfaces;
- square heatmap geometry;
- R–V special accepted card geometry;
- export surface;
- two managed result tables;
- ParameterForm for transform settings.

The Unit catalog remains **41 types**. No TER-specific Core branch or 42nd Unit was added.

## Behavior ownership retained

`feature-runtime.js` continues to own TER behavior and scientific rendering, but it no longer creates a competing presentation.

It now fails closed unless the Unit presentation supplies:

- the PlotViews;
- transform ParameterForm;
- managed result tables;
- Workbench/PlotGroup handles.

The existing runtime still owns:

- TER heatmap rendering;
- transformed heatmap rendering;
- R–V rendering and linked selection;
- four TER_Max/arg-max reduction plots;
- marker/wheel adjustment;
- keyboard adjustment;
- domain focus policy;
- contextual exports;
- project slice behavior;
- reactive refresh and selection linking.

Result tables are projected through managed Unit Table surfaces instead of direct table `innerHTML` construction.

## Preserved side-by-side acceptance guard

The v3.71.6 gate remains active after production cutover:

`tests/test-sdk151-ter-side-by-side-live-presentation.js`

It still validates the production domain owner against the Unit shell using the real TER numerical stack:

- live visible-state projection;
- complete two-table payloads;
- seven plot payloads;
- controller selection round-trip;
- real 1 Vg × 40 Vd TER result;
- 39 finite matrix cells.

The v3.71.5 exact live numeric test also remains active.

## Historical gate migration

The full release run identified historical tests that encoded the old presentation **file location** rather than the actual invariant. Those tests were not bypassed or removed.

They were re-pointed to the new authoritative owner while keeping their semantic requirements:

- TER calculate remains explicit `primary`;
- dedicated titlebar still receives Auto/Calculate/Layout actions;
- GroupArea/PlotGroup remains canonical;
- PRIMARY remains scrollable;
- PlotViews retain whole-workspace `global` placement;
- TER remains domain-neutral from Core CSS;
- dedicated TER still receives Theme Providers;
- private TER CSS must now be absent rather than present;
- `shared-views.js` must now be absent rather than loaded.

This converts the old gates into regression protection for the Unit-only production contract instead of resurrecting deleted owners.

## Freeze boundary

The cutover freeze test now separates TER presentation/wiring from stable domain code.

Outside the explicitly migrated TER presentation/wiring set, TER files remain byte-frozen. In particular the following owners are unchanged by the cutover:

- `analysis-service.js`;
- `controller.js`;
- `domain-adapter.js`;
- `feature-utils.js`;
- `selection-link-runtime.js`;
- task sources;
- dedicated window runtime.

All non-TER built-in plugin assets remain byte-frozen against the v3.71.6 baseline, and Core authored styles remain unchanged.

## Validation

Final v3.71.7 source validation:

- `test`: **428 / 428 PASS** in manifest order, completed in bounded sequential slices with no skipped cases;
- `check`: **435 / 435 covered PASS**;
  - **424** shared with `test`;
  - **11 / 11** check-only PASS;
  - **4** test-only cases covered by the complete 428/428 test run;
- Mobile: **103 / 103 PASS**;
- SDK Harness: **PASS**;
- Scientific parity: **PASS**;
- Plugin Boundary: **0**;
- Hard Visual Invariants: **87 / 87 PASS**;
- Architecture Hygiene: **PASS**;
- Native Analysis strict audit: **PASS** (`lifecycle/dialog/observer/timer/host-global/orphan = 0`);
- Plugin manifests/packages: **17 / 17 PASS**;
- authored CSS: **44 files / 0 `!important`**;
- TER production Unit cutover gate: **PASS**;
- v3.71.6 side-by-side live presentation guard: **PASS**;
- v3.71.5 real production numeric guard: **PASS**.

## Acceptance boundary

This is a **formal source/runtime production cutover**, but not a claim of completed Windows Electron pixel approval.

Automated validation proves:

- production owner singularity;
- state/numeric parity;
- interaction behavior;
- table/plot payloads;
- Unit composition ownership;
- responsive/Mobile contracts;
- absence of the old presentation owners.

Windows font rasterization, exact GPU material rendering, exact pixel spacing and user-perceived drag/resize feel still require real Windows Electron visual acceptance.

## Next step

Do **not** immediately cut over Pulse, Resonance or Data Center.

Recommended next phase:

1. run TER on the real Windows Electron build with representative project data;
2. visually compare parameter PRIME, heatmaps, R–V, TER_Max plots, result tables, PlotView placement/export and mobile projection against the accepted pre-cutover appearance;
3. fix only genuine Unit/Core contract gaps, not TER-private CSS;
4. once Windows visual acceptance passes, mark TER migration as production-accepted;
5. then use Pulse as the second controlled production Unit migration.
