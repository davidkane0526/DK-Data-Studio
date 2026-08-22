# Next Session Handoff — v3.61.22 repository cleanup

## Baseline

- Application: `3.61.22`; current changes are repository/documentation maintenance only.
- Runtime/scientific behavior baseline: `3.61.22`.
- Current branch: `chore/v3.61.22-repo-cleanup`.
- Public Plugin API / standalone SDK: `1.15.0`.
- Architecture phase: **feature complete / release candidate / stabilization**.
- Architecture is frozen unless a real P0/P1 issue proves a boundary is wrong.

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

- Transfer Vth Lab 3.0.1 remains the external TOP compatibility reference.
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
