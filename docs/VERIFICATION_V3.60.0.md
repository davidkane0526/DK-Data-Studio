# DK Data Studio v3.60.0 Verification

## Scope

This release verifies the Scientific Reactive Dependency foundation and the first Resonance/TER migrations without weakening Host Neutralization, TableSurface or scientific numerical parity.

## Required gates

- `npm run check` — complete architecture/science/plugin regression suite.
- `npm test` — complete runtime/unit regression suite.
- `npm run reactive:test` — Scientific Reactive Runtime plus Resonance/TER integration contract.
- `npm run sdk:test` — standalone Plugin SDK copied outside the source tree and used to validate/package plugins.
- `npm run table-surface:test` — v3.59 shared table foundation remains intact.
- `npm run host-neutralization:test` — Core remains domain-neutral and legacy domain state does not return to Host.
- `git diff --check` — whitespace/integrity gate.

## Reactive Runtime acceptance

The Core runtime must demonstrate:

- repeated touches inside one transaction coalesce into one semantic revision;
- derived nodes rerun only when declared dependency revisions change;
- frame effects collapse intermediate pointer/edit states and consume the current dependency snapshot;
- `runLatest()` and asynchronous derived nodes reject results computed against stale dependency signatures;
- one owner obtains one canonical reactive scope and disposal removes owner-local registrations;
- runtime diagnostics expose revisions, entries and stale/accepted async counts without exposing plugin-private domain state.

## Resonance acceptance

- FWHM-window changes invalidate peak metric input immediately at edit commit.
- Peak metric completion publishes a metric revision independently of a later peak move; FWHM/group views therefore cannot lag one edit behind.
- Direct peak moves touch geometry once on commit rather than forcing dependent scientific calculations on every pointermove.
- Box/local selection retains both X and Y bounds and declares a Peak marker/entity target. Raw sampled curve points are not substituted for Peak selection.
- Older asynchronous peak-metric work cannot overwrite a metric computed after a newer geometry/window revision.

## TER acceptance

- TER `analysis-service` contains no Plotly/ScientificPlot renderer ownership.
- The plugin Feature Runtime owns one ScientificPlot scope in both SUPER and TOP operation.
- Result topology changes may rebuild heatmap/R–V traces; ordinary selection changes must use lightweight styling/relayout rather than reconstructing the complete multi-trace R–V plot.
- Click handlers are registered through the canonical ScientificPlot render contract rather than post-render private listener rebinding.
- Plotly remains outside the blocking dedicated-TOP dependency phase, but a declared renderer is scheduled for Core-owned idle warmup after the ready signal so first scientific rendering does not pay the cold-load cost.

## Plugin API / SDK acceptance

- Core reports Plugin API `1.10.0`.
- `data.reactive` is a declared Core requirement and `ctx.data.reactive` is typed by the standalone SDK.
- API 1.10 manifest validation accepts multi-digit minor versions; the old single-digit-minor regular-expression limitation is removed.
- The SDK contract, manifest schema, templates and documentation consistently target API `1.10.0` / application `3.60.0`.

## Built-in Automation Runner

Runner `1.16.0` includes `reactive.contract / Scientific Reactive Dependency`. The runtime smoke test executes a real transaction, derived dependency, view effect and competing asynchronous tasks, and verifies that only the newest result is accepted.
