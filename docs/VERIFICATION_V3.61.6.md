# DK Data Studio v3.61.6 Verification

## Release identity

- Application: `3.61.6`
- Public Plugin API / standalone SDK: `1.13.0`
- Branch: `refactor/v3.61.6-data-routing-sdk`
- Compatibility: Plugin API `1.10.0`, `1.11.0`, and `1.12.0` packages remain load-compatible when their declared Core requirements are available.

## Standalone workbench and visual contract

- A `pluginType: workbench` plugin that registers a page without an explicit TOP/SUPPORT workspace role now becomes a primary Activity by default. It enters another workbench's contextual toolbar only when it explicitly declares `presentation: toolbar`.
- Plugin icon metadata is optional. Core supplies a stable default icon from `foundation / data / algorithm / workbench / task / extension / developer`; manifest/workspace/page icons remain overrides.
- `ctx.ui.scientificPlot.create(target, spec)` accepts an ordinary container. Core owns the internal SVG, sizing, ResizeObserver and disposal, so third-party plugins do not depend on D3/SVG implementation details. Hidden/unlaid-out plots wait for layout instead of running a private frame retry loop.

The user-provided `Transfer Curve Vth Lab 1.0.0` package was used as an external compatibility audit. Its Plugin API 1.10 `workbench` page, normal DIV plot target, legacy `core.data-sources` access, and legacy marker-drag callback are all covered by Core compatibility paths; no Vth-specific branch was added.

## Shared data architecture

The canonical import path is now:

`Importer Provider -> typed Data Artifact -> assignment -> scoped workbench view`

- Physical imported data is stored once. `metadata.dataAssignments` records zero, one or multiple consumers.
- `ctx.data.sources` is automatically scoped for workbench plugins. `list()` and `ctx.data.artifacts.list/get()` exclude source artifacts assigned only to other workbenches.
- `ctx.data.importWorkbench.open()` is the public workbench entry into the single Host import UI. Import Workbench exposes a multi-select “数据用途” chooser and defaults to the active workbench. No selected target means Data Center only.
- Data Center remains one global source catalog with usage filtering/reassignment; it does not duplicate data into one tab/store per plugin.
- Legacy project datasets without assignment metadata are interpreted as wildcard `*` for backward compatibility. Explicit Vth/Pulse-only assignments remain hidden from Resonance fallback paths.

## Importer Provider migration

- `builtin.flexible-import` advertises `science.transport.iv` while retaining legacy dataset storage compatibility.
- New `builtin.pulse-import` owns Pulse text recognition/parsing and emits `science.pulse.trace` DataTable Artifacts. It does not own a file picker, workbench UI, or a second raw-source copy.
- `builtin.pulse-analysis` delegates Add Data to Import Workbench and consumes scoped `science.pulse.trace` artifacts. Removing a Pulse source detaches the Pulse assignment instead of deleting shared physical data.
- TER and Resonance Pipeline consumers explicitly accept `science.transport.iv` while retaining `data.table` compatibility. TER live Artifact integration verifies typed transport input through to canonical `science.ter.matrix` output.

## Interaction completion

Plugin API 1.13 carries forward the v3.61.5 Interaction Behavior model and adds generic DOM delegation. Data Center and Resonance dataset-list context actions use Core `context` gesture delegation; first-party plugin boundary checks reject plugin-owned raw `contextmenu` infrastructure.

## Automated gates

The final working tree passed:

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`

The main gates include `test-sdk-workbench-data-routing-v3616.js`, `test-shared-importer-runtime-v3616.js`, TER live Artifact integration, Plugin Boundary, SDK packaging, Pulse repeatability, scientific parity and project-format compatibility. The negative activation/duplicate-registration cases intentionally print errors while their suites pass.

## Regression rules

1. Workbenches consume typed/scoped data; they do not own file dialogs or global project source lists.
2. File-format knowledge belongs in Importer Providers, not analysis workbenches.
3. A new analysis plugin declares accepted semantic types and uses `ctx.data.sources` / `ctx.data.importWorkbench`; it does not require a new Host importer UI.
4. Surface rendering/interaction remains Core-owned. External plugins should not need to know that ScientificCurveSurface currently uses SVG/D3.
5. Do not special-case Vth, Pulse, Resonance, TER, or any future workbench in Core routing. Add or extend generic contracts instead.
