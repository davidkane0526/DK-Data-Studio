# Code quality audit — v3.69.4 Final Archive

## Release decision

v3.69.4 is the long-term source archive baseline after the Phase A–E execution sequence. It retains the Legacy-Free Cut, the single current Plugin API/runtime contract, Artifact-only live data model, domain-neutral Core ownership and the single historical-project compatibility gateway. Phase E remains formally frozen at v3.69.0; v3.69.1–v3.69.4 are bounded maintenance repairs only.

## Completed

- Authored Core is grouped by responsibility under `src/core/{data,project,scientific,plugins,ui,theme,services,host,performance,workflow,recipes}`. `src/core/` root implementation files are forbidden.
- Legacy `base/modern` CSS layering is removed and replaced by explicit Cascade Layers: `foundation < plugin < structure < presentation < theme < platform < window`.
- Authored renderer CSS now contains **0 `!important` declarations** across Core styles, first-party `plugin.css`, mobile CSS and dedicated plugin-window CSS.
- `scripts/validate-styles.js` validates brace/string/comment balance, rejects `!important`, rejects legacy specificity directories and rejects domain-plugin identities in Core styles.
- Core and mobile styles are domain-neutral; plugin geometry remains manifest-owned.
- Stale generated copies under `src/app.js`, `src/core/plugin-kernel.js` and `src/core/ui-infrastructure.js` are removed. Disposable runtime compositions live only under `src/generated/runtime/` and are Git-ignored.
- Regression tests enforce the modular-Core root, cascade order, zero-`!important` rule and generated-artifact boundary.
- UI Infrastructure is authored as 25 CommonJS modules and Plugin Kernel as 15 CommonJS modules. Neither subsystem contains authored `.inc` implementation fragments.
- `composition.json` now declares importable module IDs/paths plus a runtime entry. The generator rejects duplicate, missing or >48 KiB modules and deterministically bundles them for the classic renderer.
- The former 46.7 KiB `analysis-workbench.css` has been split into `analysis-workbench.css`, `plugin-workspace.css` and `workbench-components.css`, preserving rule order while making ownership easier to inspect.

- Electron `desktop/main.js` is now a composition/IPC entry below **48 KiB**. Appearance, plugin package/history/LAN update, auxiliary-window lifecycle/diagnostics, packaged expiry and Agent secret/HTTP responsibilities live in `desktop/main-modules/`; each module is independently resolvable and below the same 48 KiB boundary.
- TER feature utilities and CSV serializers are isolated in `feature-utils.js`, returning `feature-runtime.js` below **48 KiB** without changing its controller/view contract.
- SDK documentation metadata is release-gated: `sdk/README.md` must advertise the exact `sdk/contract.json` SDK version.
- Repository handoff has two intended forms: **Dev Repo** keeps `.git` after `git gc --prune=now`; **Source Release** contains tracked source only and may be created with `git archive`. Generated runtimes, dependency folders and build outputs remain excluded from both.
- Resonance feature context stage 1 remains intact: `feature-context.js` provides live state accessors, `feature-group-runtime.js` owns group-card/PlotView/render-key state, and `feature-analysis-runtime.js` owns physics/spacing/Gate results and pipeline installation.
- Resonance interaction stage 2 is complete. `feature-selection-runtime.js` owns sweep/peak/range selection and keyboard selection commands; `feature-peak-runtime.js` owns detector/metric providers and metric cache state; `feature-inspector-runtime.js` owns Inspector rendering/edit entry points; `feature-main-plot-runtime.js` owns ScientificCurveSurface direct manipulation/range-menu state; and `feature-controls-runtime.js` owns dataset/visibility/transform controls. The coordinating `feature-runtime.js` is now **below 48 KiB**.
- Automation diagnostics is now split by responsibility: `automation-smoke-cases.js` owns executable smoke-case implementations, while `automation-test-runtime.js` owns runner lifecycle, report assembly/persistence and UI binding. Both are below **48 KiB**, so the previous 80 KiB exception is removed and there are now **zero oversized authored JavaScript modules** under `src/` and `desktop/`.
- Shell navigation now has one structural/behavioral owner. `shell-navigation.css` exclusively owns the command-bar/activity geometry, while `shell-navigation.js` owns secondary-activity overflow/reflow. `workspace-safeguards` is again limited to import safeguards, and plugin-manager typography has moved back to `schema-and-plugin-ui.css`. Structure geometry now has one semantic owner per selector across files. `validate-styles.js` rejects shell-navigation geometry outside its owner, any Structure paint/color declaration, and cross-file semantic ownership duplication.
- Runtime failure ownership is now explicit. Strict `pluginType` validation remains mandatory for real plugin manifests, while Core/ownerless Activity and menu contributions are guarded before plugin classification. Theme popovers override enclosing Chrome ownership. Automation reports separate Core Theme, Plugin Runtime, External Packages, Scientific Data Contracts foundation, Algorithm Provider, Resonance Workbench and TER Workbench responsibilities.
- Integration diagnostics live under `src/diagnostics/`. Historical project/data conversion lives only in `src/project-importers/compatibility-gateway.js`; `src/migrations/` is removed and current runtime code is forbidden from depending on it.
- Presentation ownership is now explicit rather than debt-budgeted. `workspace-theme-boundary.css` is removed; `control-status.css`, `shell.css`, `scientific.css`, `analysis.css`, `dialogs.css`, `import-workbench.css`, `plugin-devtools.css`, `plugin-chrome.css` and `connectivity.css` each have a single semantic responsibility. Cross-file exact and Theme/host-normalized semantic selector ownership are both **0 duplicates**. Structure is paint-free and has **0 literal colors**. The validator also rejects same-selector/same-property late rewrites, so cascade hotfix blocks cannot silently return.

## Measured debt

The previous v3.61.85 CSS debt was 1492 Core `!important` declarations plus 651 in the former modern layer. That debt is now **0** in authored renderer CSS. The old base/modern specificity split no longer exists.

The remaining stylesheet complexity is ordinary component breadth rather than a second specificity/compatibility layer. Release gates prevent cross-file semantic ownership duplication and same-selector property rewrites from accumulating again.

## Remaining debt

1. **Application module-boundary regressions must remain release-gated.** The Application shell is now an importable CommonJS graph with zero authored `.inc` fragments. Both local path resolution and consumed exported symbols are checked so file moves or incomplete `module.exports` objects fail before runtime.
2. **The classic renderer still consumes generated single-script runtime artifacts.** This is now only a packaging compatibility layer; authored Core no longer depends on shared lexical composition.
3. **Resonance is modularized but still has orchestration density.** The coordinator is now below the 48 KiB authored-module boundary and no longer owns group, analysis, selection, detector/metric, Inspector, main-plot or dataset-control mutable state. Remaining work should target only clearly separable orchestration responsibilities such as project reconciliation/entity publication/history if they grow; do not split further merely to reduce line count or replace explicit context with a giant service locator.
4. **Visual ownership is release-gated.** Foundation is reset-only; Core Structure owns geometry; Theme Providers supply visual values; Core Component Appearance / Material Renderer is the final standard-component paint selector owner; first-party plugin CSS owns domain layout/state without application colors. Shared component modifiers feed property slots instead of rewriting the same geometry later. See `STYLE_OWNERSHIP_CONTRACT.md`.
5. **Visual validation remains separate.** Source and regression tests cannot prove exact Electron font rendering, GPU blur, backdrop-filter or final alignment.

## Non-negotiable rules

- No `!important` in authored renderer CSS or runtime-injected CSS.
- No `base/modern` specificity directories.
- No domain-plugin selector identities in Core/Theme/mobile Core styles.
- No implementation files directly under `src/core/`.
- Generated runtime artifacts remain untracked and reproducible.
- Do not append release-numbered hotfix blocks; edit the owning semantic module.

Run `npm run check` before release and `npm run clean:generated` before creating a Lean Source handoff.

## Repository handoff

Before creating a **Dev Repo** handoff, run `npm run clean:generated`, require a clean working tree, then run `git gc --prune=now`. Git history is retained; only loose/redundant object storage is compacted.

For a **Source Release** without Git history, use a tracked-source archive such as:

```bash
git archive --format=zip --prefix=DK-Data-Studio-vX.Y.Z-Source/ -o DK-Data-Studio-vX.Y.Z-Source.zip HEAD
```

Do not delete tests, fixtures, SDK material or source modules merely to reduce ZIP size.

- SplitController drag lifecycle is now geometry-first: pointer moves do not emit resize, Core plot/workbench observers suppress reflow during the gesture, and one resize notification is emitted on release.
- Plugin Manager common layout is structure-owned; `platform/touch.css` contains only coarse-pointer adaptations, allowing every Theme profile to control Plugin Manager paint consistently.
- Resonance GroupPlot compactness and selection emphasis are plugin-owned, while Thin Glass contrast/shadow hierarchy remains profile-owned.

## v3.69.4 final archive closure

The archive review re-confirms the intended clean-source boundary:

- all Phase A–E implementation work is complete;
- Phase E is formally frozen at v3.69.0 and is not reopened by v3.69.1–v3.69.4 maintenance;
- public versions are App 3.69.4 / Plugin API 1.19.0 / SDK 1.47.0 / Theme Contract 3.10.0;
- Android versionCode is 130;
- first-party package validation covers 17 plugin packages;
- authored renderer CSS contains 45 files and 0 `!important`;
- generated runtime/index/authoring outputs are reproducible and are removed from the final source archive;
- `node_modules`, generated Android/iOS projects and Git metadata are excluded from the source archive;
- the project owner confirmed the v3.69.4 Android Resonance FWHM / peak-height / peak-area repair on real hardware.

The archive is intended as a stable continuation point. New feature/capability work should branch into v3.70.x rather than accumulating feature work on the frozen 3.69.x archive line.

