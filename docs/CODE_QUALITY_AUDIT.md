# Code quality audit — v3.61.98

## Release decision

v3.61.98 extends the importable-module cleanup into the Electron main process and release handoff. The focus remains explicit ownership, bounded authored modules, deterministic generated runtimes and compact repository delivery without deleting tests or source history.

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

## Measured debt

The previous v3.61.85 CSS debt was 1492 Core `!important` declarations plus 651 in the former modern layer. That debt is now **0** in authored renderer CSS. The old base/modern specificity split no longer exists.

This does not mean the stylesheet is finished. Dense selectors and historical duplication remain in some modules, but they can now be reduced without fighting a second specificity layer.

## Remaining debt

1. **Application module-boundary regressions must remain release-gated.** The Application shell is now an importable CommonJS graph with zero authored `.inc` fragments. Both local path resolution and consumed exported symbols are checked so file moves or incomplete `module.exports` objects fail before runtime.
2. **The classic renderer still consumes generated single-script runtime artifacts.** This is now only a packaging compatibility layer; authored Core no longer depends on shared lexical composition.
3. **Resonance feature context is the remaining large authored runtime.** `src/plugins/resonance-workbench/feature-runtime.js` is still about 135 KiB because one `createTop()` closure owns project state, selection, peak editing, group plots, physics, spacing and gate analysis. The next safe step is an explicit **Resonance feature context** with live state accessors, followed by extraction of analysis panels. Do not mechanically split the closure into files backed by a giant service locator.
4. **Automation diagnostics is intentionally dense but bounded.** `src/core/diagnostics/automation-test-runtime.js` remains above 48 KiB and is temporarily capped at 80 KiB while test-case groups are separated from the runner lifecycle.
5. **Some selectors remain dense.** Zero `!important` prevents further override escalation, but duplicated semantic rules should continue to be merged into one owner when touched.
6. **Visual validation remains separate.** Source and regression tests cannot prove exact Electron font rendering, GPU blur, backdrop-filter or final alignment.

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
