# Code quality audit — v3.61.87

## Release decision

v3.61.87 continues the structural cleanup without intentionally adding product behavior. The focus is finer Core source boundaries, deterministic runtime composition and smaller stylesheet ownership units.

## Completed

- Authored Core is grouped by responsibility under `src/core/{data,project,scientific,plugins,ui,theme,services,host,performance,workflow,diagnostics,recipes}`. `src/core/` root implementation files are forbidden.
- Legacy `base/modern` CSS layering is removed and replaced by explicit Cascade Layers: `foundation < plugin < structure < presentation < theme < platform < window`.
- Authored renderer CSS now contains **0 `!important` declarations** across Core styles, first-party `plugin.css`, mobile CSS and dedicated plugin-window CSS.
- `scripts/validate-styles.js` validates brace/string/comment balance, rejects `!important`, rejects legacy specificity directories and rejects domain-plugin identities in Core styles.
- Core and mobile styles are domain-neutral; plugin geometry remains manifest-owned.
- Stale generated copies under `src/app.js`, `src/core/plugin-kernel.js` and `src/core/ui-infrastructure.js` are removed. Disposable runtime compositions live only under `src/generated/runtime/` and are Git-ignored.
- Regression tests enforce the modular-Core root, cascade order, zero-`!important` rule and generated-artifact boundary.
- UI Infrastructure is authored as 23 responsibility fragments instead of 7 coarse fragments; Plugin Kernel is authored as 13 responsibility fragments instead of 6. The regenerated runtime byte stream is unchanged by the split.
- Runtime closure composition order is now explicit in `composition.json` manifests. The generator rejects duplicate, missing, stray or >48 KiB composition fragments instead of relying on filename sorting alone.
- The former 46.7 KiB `analysis-workbench.css` has been split into `analysis-workbench.css`, `plugin-workspace.css` and `workbench-components.css`, preserving rule order while making ownership easier to inspect.

## Measured debt

The previous v3.61.85 CSS debt was 1492 Core `!important` declarations plus 651 in the former modern layer. That debt is now **0** in authored renderer CSS. The old base/modern specificity split no longer exists.

This does not mean the stylesheet is finished. Dense selectors and historical duplication remain in some modules, but they can now be reduced without fighting a second specificity layer.

## Remaining debt

1. **Plugin Kernel and UI Infrastructure are still shared-closure compositions, not true importable modules.** Their source boundaries and ordering are now explicit and bounded, but the final step remains migration of shared lexical state into independently loadable services/modules.
2. **Application composition still uses ordered `.inc` fragments.** Its order is now explicit in `src/app/composition.json`, but the application shell should migrate only after the Core closure migration proves stable.
3. **The largest remaining Core closure bodies are concentrated rather than scattered.** `ScientificCurveSurface.render()` and `createApi()` are cohesive but still dense. They should be decomposed by real subsystem boundaries, not by arbitrary line-count surgery.
4. **Some selectors remain dense.** Zero `!important` prevents further override escalation, but duplicated semantic rules should continue to be merged into one owner when touched.
5. **Visual validation remains separate.** Source and regression tests cannot prove exact Electron font rendering, GPU blur, backdrop-filter or final alignment.

## Non-negotiable rules

- No `!important` in authored renderer CSS or runtime-injected CSS.
- No `base/modern` specificity directories.
- No domain-plugin selector identities in Core/Theme/mobile Core styles.
- No implementation files directly under `src/core/`.
- Generated runtime artifacts remain untracked and reproducible.
- Do not append release-numbered hotfix blocks; edit the owning semantic module.

Run `npm run check` before release and `npm run clean:generated` before creating a Lean Source handoff.
