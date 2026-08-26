# Code quality audit — v3.61.86

## Release decision

v3.61.86 is a structural cleanup checkpoint. No product feature is intentionally added. The focus is removal of CSS override debt, explicit ownership and Core source organization.

## Completed

- Authored Core is grouped by responsibility under `src/core/{data,project,scientific,plugins,ui,theme,services,host,performance,workflow,diagnostics,recipes}`. `src/core/` root implementation files are forbidden.
- Legacy `base/modern` CSS layering is removed and replaced by explicit Cascade Layers: `foundation < plugin < structure < presentation < theme < platform < window`.
- Authored renderer CSS now contains **0 `!important` declarations** across Core styles, first-party `plugin.css`, mobile CSS and dedicated plugin-window CSS.
- `scripts/validate-styles.js` validates brace/string/comment balance, rejects `!important`, rejects legacy specificity directories and rejects domain-plugin identities in Core styles.
- Core and mobile styles are domain-neutral; plugin geometry remains manifest-owned.
- Stale generated copies under `src/app.js`, `src/core/plugin-kernel.js` and `src/core/ui-infrastructure.js` are removed. Disposable runtime compositions live only under `src/generated/runtime/` and are Git-ignored.
- Regression tests now enforce the modular-Core root, cascade order, zero-`!important` rule and generated-artifact boundary.

## Measured debt

The previous v3.61.85 CSS debt was 1492 Core `!important` declarations plus 651 in the former modern layer. That debt is now **0** in authored renderer CSS. The old base/modern specificity split no longer exists.

This does not mean the stylesheet is finished. Dense selectors and historical duplication remain in some modules, but they can now be reduced without fighting a second specificity layer.

## Remaining debt

1. **Plugin Kernel and UI Infrastructure are not yet true importable modules.** Their source is split by responsibility, but two historical shared-closure subsystems are still assembled at build time into untracked browser artifacts. This is materially better than one authored Core file, but it is not the final modular runtime design. Future work should migrate shared lexical state into explicit subsystem state/services and load independently addressable modules.
2. **Application composition still uses ordered `.inc` fragments.** This is outside Core but follows the same historical build-time composition model. It should be revisited only after the Core kernel/UI migration is stable.
3. **Some selectors remain dense.** Zero `!important` prevents further override escalation, but duplicated semantic rules should continue to be merged into one owner when touched.
4. **Visual validation remains separate.** Source and regression tests cannot prove exact Electron font rendering, GPU blur, backdrop-filter or final alignment.

## Non-negotiable rules

- No `!important` in authored renderer CSS or runtime-injected CSS.
- No `base/modern` specificity directories.
- No domain-plugin selector identities in Core/Theme/mobile Core styles.
- No implementation files directly under `src/core/`.
- Generated runtime artifacts remain untracked and reproducible.
- Do not append release-numbered hotfix blocks; edit the owning semantic module.

Run `npm run check` before release and `npm run clean:generated` before creating a Lean Source handoff.
