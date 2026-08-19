# DK Data Studio v3.41.0 Architecture Verification

## Scope

This verification covers the `dev` branch created from the preserved `refactor/v3.40-strong-view-contract-layering` baseline (`ef8e157`). The objective of v3.41.0 is architectural rather than visual: infrastructure capabilities are owned by Core, while plugins retain only domain declarations, algorithms, data mappings, and view composition registered through Core contracts.

No GitHub access or push was used for this work.

## Version and branch

- Baseline: `refactor/v3.40-strong-view-contract-layering`
- Baseline version: `3.40.0`
- Development branch: `dev`
- Delivery version: `3.41.0`
- Visible shell version: `v3.41.0`
- Plugin API: `1.8.0`

## Core ownership introduced in v3.41

The following cross-cutting capabilities are now explicit Core runtimes instead of plugin-owned infrastructure:

- `DKDSIO`: file open/read/save, clipboard, CSV/SVG/PNG export primitives and scoped cleanup.
- `DKDSCharts`: Plotly/D3 access, chart resize/export/binding and scoped cleanup.
- `DKDSComponents`: scoped DOM operations, declarative mounting, event/observer ownership, animation frames, timeouts, intervals, and microtasks.
- `DKDSDataFlow`: typed importer/exporter/transformer/analyzer registries and execution.
- `DKDSServices`: generic host/service registry; first-party plugins no longer depend on domain-specific `host.resonance`, `host.ter`, or `host.pulse` fields.
- `DKDSPluginModules`: per-plugin internal module registry. Complex plugins no longer publish private `window.DKDS...` infrastructure globals.
- `DKDSPluginContract`: API v1.8 requirement catalog and activation-time capability validation.
- `DKDSHostRecipes`: Core-owned reusable host recipes. Shell navigation and workspace safeguards were moved from patch-like plugin implementations into Core recipes.

Core also owns workspace structure, scientific plot/view primitives, actions, interaction, selection, menus, context menus, toolbar/status-bar/activity/page/style contributions, project/state/data/artifact/type/workflow plumbing, and parameter-schema rendering.

A plugin may still contain domain-specific algorithms and domain view declarations because those are the plugin's subject-matter definition. It must not implement its own platform bridge, chart engine, file I/O, lifecycle scheduler, generic component system, layout framework, host patch, persistence transport, or unmanaged global module. Domain UI is composed through Core-provided surfaces and registered into the Core workspace.

## Machine-enforced plugin boundary

`scripts/check-plugin-boundaries.js` now rejects first-party plugin code that bypasses Core with:

- direct `electronAPI` access;
- executable direct `Plotly.*` calls;
- direct document-level DOM construction/query infrastructure;
- private `ResizeObserver` / `MutationObserver` ownership;
- raw `requestAnimationFrame`, `setTimeout`, `setInterval`, or `queueMicrotask` scheduling;
- `ctx.host` access;
- private `window.DKDS... =` module publication;
- direct `DKDSHostRecipes` use;
- generic registry insertion where a typed Core API exists.

The final boundary audit passes with all first-party plugin infrastructure routed through Core API v1.8.

## Manifest/API contract enforcement

Every built-in plugin now declares `requiresCore` in both `plugin.json` and its runtime manifest. `scripts/validate-plugins.js` checks three layers together:

1. the manifest schema;
2. the runtime `DKDSPlugins.define(...)` declaration;
3. Core APIs actually referenced by the plugin source.

A plugin that uses an undeclared Core surface fails validation. This makes the documentation executable enough for another AI or developer to discover mistakes before runtime.

The canonical requirement vocabulary is defined in `docs/plugin-manifest.schema.json` and implemented by `src/core/plugin-contract-runtime.js`.

## Regression tests

### Full architecture and functional check

Command:

```text
npm run check
```

Result: **PASS**.

Coverage includes Core contract/data-flow tests, project structure, UI and plugin visual contracts, workspace/order/layout contracts, PlotView, status/project save, SUPER/TOP/PRIME/SUB behavior, resonance runtime architecture, interaction runtime, Analysis Workbench, plugin lifecycle, external `.dkplugin` packages, Data Model/Provenance/Workflow/Schema/Formula, live artifacts, TER, project format, Pulse, auxiliary windows, workspace safeguards, Windows LAN discovery, and Windows tooling.

### Legacy/full product suite

Command:

```text
npm test
```

Result: **PASS**.

Historical assertions that previously expected plugin-owned settings UI or API v1.7 were migrated to the v1.8 Core-first contract instead of restoring obsolete compatibility behavior.

### JavaScript/project consistency

`git diff --check` passes. The final project check sees the required Core architecture/docs/toolbox layout and all expected JavaScript sources.

## Scientific numerical parity

The scientific parity test was run explicitly against the preserved pre-refactor Git baseline rather than only testing the new tree against itself:

```text
DKDS_PARITY_BASELINE_REF=refactor/v3.40-strong-view-contract-layering \
  node scripts/verify-science-parity.js
```

Result: **PASS** for all representative mature workflows:

- `parseCsv`
- `buildSweeps`
- `transformSweep:dlog`
- `detectPeaks`
- `computeTerMatrix`
- `analyzePulseReadData`

This verifies that the architecture migration does not alter the established numerical results on the covered workflows.

Additional generated-data tests also pass:

- Core data-flow importer/transformer/exporter round trip using generated numeric data;
- TER live-artifact integration using a generated sweep (`1 Vg × 40 Vd`);
- Pulse periodic, unequal-width, current-only, filename-protocol and repeatability cases.

## Visual parity

The cloud environment provides Chromium but blocks direct `file://` and local navigation by policy. It also lacks a locally installed Electron runtime. Therefore the baseline and current shell were rendered with the same Chromium engine by injecting each revision's real `src/index.html` and real `src/style.css` into the same 1600 × 1000 viewport.

Verification results:

- Baseline and v3.41 `style.css` SHA-256 are identical:
  `95f6926b5b400d600ee3b5a194ce4f41db11b3aea99dd7ffbc8d0359395f6d6f`
- Screenshot size: `1600 × 1000` (`1,600,000` pixels).
- Different pixels: **43**.
- Difference bounding box: **x=179..184, y=22..29**.
- The changed area is only the title-bar version text (`v3.40.0` → `v3.41.0`).

The baseline/current screenshots were also inspected visually. Shell layout, spacing, controls, floating-panel geometry, and stacking are unchanged.

Dynamic plugin UI behavior is additionally guarded by the repository's plugin visual/workspace/viewport/SUPER/TOP contract tests, all of which pass. A full packaged Electron visual launch could not be performed on this server for the build-tool reason below.

## Build/debug status on the cloud server

`npm run dist` was invoked after the version bump. The build preparation stages completed successfully:

- brand assets;
- plugin index generation;
- plugin validation;
- packaged-build metadata preparation.

Packaging then stopped because `electron-builder` is not installed in the server environment and `node_modules` is absent. The project declares `electron-builder ^26.15.7`, but dependency installation attempts in this environment timed out, so no installer was fabricated or claimed as successful.

This limitation affects creation of an Electron distributable, not the source-project verification above. The requested deliverable is the complete source project ZIP with `.git`.

## Large-file and performance audit

The refactor intentionally splits by stable responsibility boundary rather than mechanically breaking every large source file into small fragments.

Key observations:

- `app.js` remains a mature host orchestration file, but no longer needs a new top-level domain host field for every plugin.
- `plugin-kernel.js` grows moderately because the public API is now explicit and typed; cross-cutting implementations themselves were extracted into dedicated Core runtimes.
- `ui-infrastructure.js` is deliberately unchanged to protect existing UI behavior.
- large Resonance/TER/Pulse/Data Center domain runtime files retain domain algorithms/view composition, while their I/O, chart, lifecycle, host-service, scheduling and module infrastructure has moved to Core.

Performance/lifecycle changes include scoped cleanup for Core resources and immediate removal of completed one-shot frame/timeout cleanup closures. This avoids accumulating stale cleanup callbacks in long-running plugin sessions.

Future safe decomposition seams are documented in `docs/ARCHITECTURE_V3.41.md`; the current refactor avoids high-risk cosmetic file splitting that would weaken regression confidence without improving ownership.

## Documentation for plugin authors and AI agents

The following documents define the v1.8 contract:

- `docs/PLUGIN_API.md`
- `docs/AI_PLUGIN_DEVELOPMENT_GUIDE.md`
- `docs/plugin-manifest.schema.json`
- `docs/ARCHITECTURE_V3.41.md`
- `docs/ANALYSIS_WORKBENCH_ARCHITECTURE.md`
- `docs/WORKSPACE_PLUGIN_API.md`
- `docs/PLUGIN_WORKSPACE_DESIGN_SYSTEM.md`

The plugin template under `src/plugins/_template/` is also updated to API v1.8 and demonstrates explicit Core requirements and Core-owned workspace/data/action/state composition.

## Delivery rule

The `dev` branch contains the v3.41.0 architecture work. No GitHub remote was accessed and no push was performed. The delivery archive must include the complete `.git` directory so the branch and history remain available after extraction.
