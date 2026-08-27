# Code quality audit — v3.61.105

## Release decision

v3.61.104 completes the next presentation-ownership pass by making scientific card paint and floating utility chrome single-owned. The focus remains explicit responsibility ownership, semantic themeability, bounded modules and behavior-preserving consolidation rather than mechanical file splitting.

## Completed

- Authored Core is grouped by responsibility under `src/core/{data,project,scientific,plugins,ui,theme,services,host,performance,workflow,diagnostics,recipes}`. `src/core/` root implementation files are forbidden.
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
- Shell navigation now has one structural/behavioral owner. `shell-navigation.css` exclusively owns the command-bar/activity geometry, while `shell-navigation.js` owns secondary-activity overflow/reflow. `workspace-safeguards` is again limited to import safeguards, and plugin-manager typography has moved back to `schema-and-plugin-ui.css`. Structure-layer duplicated selectors fell from **89 to 73**, with cross-file ownership edges reduced from **100 to 78**. `validate-styles.js` now rejects shell-navigation geometry outside its owner.
- Presentation state ownership is now narrower. `control-status.css` exclusively owns AnalysisWorkbench navigation and status-bar/plugin-status state; `shell.css` owns generic shell hover/motion; `scientific.css` no longer carries global shell-control hover rules; and `workspace-theme-boundary.css` no longer acts as a late nav/status/shell-control patch layer. The card/surface pass now gives `scientific.css` sole presentation ownership of `trend-card`, `analysis-chart-card` and GroupPlot card/header/legend paint, while `shell.css` solely owns `floating-panel` / `floating-header` paint. Exact duplicate selectors across the five main presentation modules have fallen from **91 to 42**, with cross-file ownership edges reduced to **42**. `validate-styles.js` enforces these owners and treats 42/42 as monotonic debt ceilings.

## Measured debt

The previous v3.61.85 CSS debt was 1492 Core `!important` declarations plus 651 in the former modern layer. That debt is now **0** in authored renderer CSS. The old base/modern specificity split no longer exists.

This does not mean the stylesheet is finished. Dense selectors and historical duplication remain in some modules, but they can now be reduced without fighting a second specificity layer.

## Remaining debt

1. **Application module-boundary regressions must remain release-gated.** The Application shell is now an importable CommonJS graph with zero authored `.inc` fragments. Both local path resolution and consumed exported symbols are checked so file moves or incomplete `module.exports` objects fail before runtime.
2. **The classic renderer still consumes generated single-script runtime artifacts.** This is now only a packaging compatibility layer; authored Core no longer depends on shared lexical composition.
3. **Resonance is modularized but still has orchestration density.** The coordinator is now below the 48 KiB authored-module boundary and no longer owns group, analysis, selection, detector/metric, Inspector, main-plot or dataset-control mutable state. Remaining work should target only clearly separable orchestration responsibilities such as project reconciliation/entity publication/history if they grow; do not split further merely to reduce line count or replace explicit context with a giant service locator.
4. **Remaining presentation debt is now concentrated in broader shell/analysis aliases.** Card/surface paint is single-owned, but historical selectors for topbar/project-tabs, generic form controls, analysis page headers and a few dialog/import aliases still cross presentation modules. Continue only where one semantic owner is unambiguous; do not collapse intentionally distinct structure/theme roles merely to reduce the duplicate counter.
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
