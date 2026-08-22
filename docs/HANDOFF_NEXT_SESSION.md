# Next Session Handoff — v3.61.29 SDK / Plugin Host hardening

## Baseline

- Application: `3.61.29`; this release moves recurring plugin-layout failures into explicit SDK/Host guarantees rather than plugin-specific repair.
- Runtime/scientific behavior baseline: scientific algorithms and canonical data semantics remain unchanged from the v3.61.22+ stabilized line.
- Current branch: `feat/v3.61.29-sdk-host-hardening`.
- Public Plugin API / standalone SDK: **`1.16.0`**, minimum app `3.61.29`; API 1.10–1.15 packages remain load-compatible.
- Architecture phase: **release candidate / stabilization**. New abstractions should be added only when a demonstrated defect cannot be solved by the existing public contract.

## v3.61.29 SDK / Host contract

- New TOP/Tool workspaces default to `primaryScroll: "safe"`. Core owns the outer reachable viewport and runs a Layout Guard over Primary content. If semantic plugin UI is actually clipped by `overflow:hidden/clip`, the affected axis is recovered to scrolling.
- ScientificCurveSurface `minWidth/minHeight` are preferred geometry, not a silent rendering gate. Core attempts a preferred-height recovery and renders compactly above hard safety minima; a small but usable container must not become a toolbar-only blank plot.
- API 1.16 standalone validation and in-app package installation share `sdk/layout-contract.js`. New packages are rejected for Core-owned shell selectors, semantic clipping, plugin-owned viewport height (`100vh`) and positive-pixel `minmax(...,1fr)` scientific rows.
- The SDK templates are the canonical authoring path. They must never teach patterns that API 1.16 rejects.
- First-party plugins have no boundary exceptions. `builtin.status-monitor` now uses `ctx.ui.dom` for DOM creation, EventTargets and timers; `node scripts/check-plugin-boundaries.js` returns zero violations.
- `Transfer Vth Lab 3.0.2` is the external TOP reference for API 1.16 safe layout.
- Required release gates `npm test` and `npm run check` both passed end-to-end on this branch.

## Core architecture

Canonical path:

`Importer -> typed Artifact -> assignment -> scoped Data Source -> workbench -> derived Artifact/provenance`

Core owns Project Format, Artifact Store, Provenance/lineage, Data Sources, Data Types, Selection/Entity, Project History, Import Workbench, Interaction, ScientificPlot, TableSurface, Capability Runtime, TOP/SUPER/Tool hosting and Plugin Kernel.

Shared scientific infrastructure owns Reactive, Pipeline, Transform Registry, Scalar Field and Algorithm Registry/version management. Replaceable numerical algorithms are versioned Algorithm Providers. Domain plugins consume those contracts.

## Compatibility baseline

- Project Format performs one-way migration from old root/domain fields into canonical plugin/data state.
- The main shell must stay domain-neutral; do not add Resonance/TER/Vth special cases to `app.js`.
- Old self-contained data may remain in Data Center while assignments decide whether an analysis workbench consumes it.
- Resonance legacy saved peaks may reconcile stale sweep identity only when the stored ID no longer exists; valid identities/results must not be rewritten.

## Window/data baseline

- Dedicated TOP windows must see the same Artifact/Data Source contracts as the main renderer.
- `ctx.data.sources.list()` / `targets()` remain synchronous reads even across dedicated-window capability transport; writes remain IPC-backed asynchronous operations.
- TOP prewarm must not hydrate large project data until real open unless the activity contract explicitly requires it.
- Tool Workspace currently shares TOP lifecycle and differs primarily by host entry classification.

## Interaction/history baseline

- Plugin-specific fine-grained history may handle local editing first.
- Project-level user commands fall back to unified Project History (`Ctrl/Cmd+Z`, redo variants).
- Background/derived Artifact mutations do not automatically become history entries.
- Core ScientificPlot owns generic D3/Plotly interaction chrome; plugins should not reimplement it unless exposing a genuinely domain-specific interaction.

## External plugin baseline

- Transfer Vth Lab 3.0.2 is the current API 1.16 external TOP authoring reference; API 1.15 remains a compatibility fixture, not the template for new code.
- New TOPs use `workspace.role=top`, a dedicated `window`, `openMode=window`, `topWorkspace.register()` and Core-owned import/scoped data.
- ScientificPlot/D3 and Plotly runtime dependencies must be declared by dedicated plugins and are validated by the SDK.

## Repository reproducibility

GitHub-ready reproducibility requires committed `/package-lock.json` and `/mobile/package-lock.json`. After they are generated, clean CI should use `npm ci`. Run `npm install` only when intentionally updating dependencies and commit the lockfile change together with `package.json`.

## Required gates before delivery

- `npm run check`
- `npm test`
- `npm run sdk:test`
- `npm run performance:test`
- `npm run host-neutralization:test`
- `node scripts/check-plugin-boundaries.js`
- `node scripts/validate-plugins.js`
- `git diff --check`

For old-project bugs, prefer the in-app Electron automation cases (`project.data-center-live`, `project.resonance-live`, etc.) over synthetic model-only evidence.
