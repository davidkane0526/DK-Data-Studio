# DK Data Studio v3.67.10 · Visual / Theme / Performance Recovery R7H WIP

## Status

**Windows visual/performance acceptance remains reopened. Do not tag or publish v3.67.10 from this tree yet.**

R4 proved that a stronger declarative Theme Contract alone does not guarantee a good product result. Windows screenshots showed flatter Theme expression than the accepted older builds, and the user reported significant lag. R5 addresses both failures in Core while keeping Theme Providers expressive.

## Architecture retained

- Plugin API: **1.19.0**
- SDK: **1.24.0**
- Theme Contract: **3.10.0**
- Component Appearance: **3.0.0**
- Material Renderer: **3.10.0**
- Automation Runner: **1.33.0**
- Core resolves Component Context (`standalone/grouped`), nearest Material Role, and Material Context (`compact/panel/dialog/workspace-modal`) before final paint.
- Theme Providers declare bounded appearance/depth/effects; Core remains the sole final paint/composition owner.
- Theme Providers may not query Core DOM or inject selector-owned application paint.

## R5 performance recovery

The R4 runtime had three broad mutation-driven Theme paths: Semantic Registry, Component Appearance and Material Renderer. Class churn from D3/SVG plots could enter those paths even though curve/point classes are not Theme structure. Material Context assignment could also rewrite the same dataset value and create avoidable mutation work.

R5 changes:

- Semantic/Material observers ignore non-HTML SVG mutations.
- Material class observation is prefiltered to classes relevant to Material semantics.
- Material Context dataset writes are idempotent.
- Material assignment roots are ancestor-collapsed and batched.
- Component Appearance recomposition is requestAnimationFrame-batched and root-collapsed.
- Runtime performance counters are exposed by Material Renderer, Semantic UI and Component Appearance.
- Automation case `ui.theme-runtime-performance` samples idle Theme activity after settling and fails if Material/Component queues continue churning.

This is a Core runtime fix; no scientific plugin receives a performance patch.

## R5 Theme-expression recovery

R4 had two visual problems: Thin Glass had lost much of its component palette and therefore fell back toward Core Default; Aurora had intentionally softened selected/group fills during the earlier ownership recovery. In addition, Aurora effect tokens such as header gradients and ambient/accent/edge glow were accepted by the Theme profile but largely not consumed by Material Renderer.

R5 changes:

- **Thin Glass 1.12.1** restores its own light/dark ToolbarGroup and ToolbarAction states, with contextual floating/grouped depth through Theme 3.10.
- **Aurora Pop 2.3.1** restores stronger violet selected states and lavender/emerald group identity while retaining contextual composition.
- Core Material Renderer consumes controlled Theme overlays for chrome/sidebar/elevated/popover/floating roles: header gradient, ambient tint, accent glow and edge glow.
- Theme `glowIntensity` is converted from the normalized 0..1 contract value to the CSS percentage required by `color-mix`.
- Core Default remains on the same Theme 3.10 pipeline; themes differ by provider declarations rather than alternative DOM/CSS ownership.
- Import Workbench remains semantic **elevated + workspace-modal**.

## Code-side checkpoint · 2026-08-31

- `npm test` -> **225/225 PASS**
- `npm run check` -> **233/233 PASS**
- `npm run mobile:test` -> **12/12 PASS**
- `npm run sdk:harness` -> **PASS**
- `npm run science:parity` -> **PASS**
- `npm run renderer:test` -> **PASS**
- `npm run plugin-manager:test` -> **PASS**
- Hard Visual Invariants -> **49/49 PASS**
- Style architecture -> **44 authored CSS files / 0 `!important`**
- Plugin manifests/packages -> **17 PASS**

The deliberately thrown plugin activation/duplicate errors in test logs remain negative-path fixtures, not suite failures.

## Required Windows R5 acceptance

Run:

```powershell
npm run visual:closure:windows
```

The report must be from **Automation Runner 1.33.0** / **appVersion 3.67.10**, with zero failures. Required cases include:

- `ui.hard-visual-invariants`
- `ui.visual-geometry-closure`
- `ui.theme-runtime-performance`
- `ui.theme-coverage`

In addition, provide real screenshots for:

1. Core Default Theme
2. Thin Glass 1.12.1
3. Aurora Pop 2.3.1

At minimum inspect topbar groups/actions, Presenter buttons, scientific floating tools, Import Workbench, dialogs/popovers and light/dark modes. Also judge interaction speed directly: scrolling, plot hover/selection, panel toggling and theme switching must be materially better than R4.

**Do not tag or publish v3.67.10 from this checkpoint until Windows visual and performance acceptance is complete.**


## R6 Windows visual-structure recovery · 2026-08-31

The next Windows screenshot review identified twelve concrete visual regressions spanning shared Core geometry and Aurora/theme expression. R6 does not handle them as page patches. It strengthens four shared contracts: non-portable utility positioning, integrated-control geometry/composition, semantic header hierarchy and incremental Theme runtime ownership.

Key R6 rules:

- Memory and Theme Picker are non-portable utility surfaces; placement controls are structurally forbidden.
- Theme Picker is anchored to the Theme status trigger.
- Presenter/file/scientific grouped actions use one group silhouette with equal inset and unified command padding.
- TER summary rows are informational content, not ToolbarGroups.
- Scientific legends do not inherit heavy Toolbar/Surface paint.
- GroupPlot/PlotView/Inspector headers keep semantic tonal-band hierarchy so themes can distinguish regions without plugin-private CSS.
- Core Default, Thin Glass and Aurora Pop consume the same Theme 3.10 semantic slots.
- Automation Runner is **1.33.0** and Hard Visual Invariants are **59/59**.

### R6 code-side checkpoint

- `npm test` -> **225/225 PASS**
- `npm run check` -> **233/233 verified PASS** (main command reached 138 before the container execution ceiling; cases 139–233 were then run independently and all 95 passed)
- `npm run mobile:test` -> **12/12 PASS**
- `npm run sdk:harness` -> **PASS**
- `npm run science:parity` -> **PASS**
- `npm run renderer:test` -> **PASS**
- `npm run plugin-manager:test` -> **PASS**
- Hard Visual Invariants -> **59/59 PASS**
- Style architecture -> **44 authored CSS / 0 `!important`**
- Plugin manifests/packages -> **17 PASS**

R6 remains WIP because the latest defects were reported from Windows Electron screenshots. A fresh Windows Runner 1.33.0 report and visual inspection are still required before Final Freeze.

## R7F code-side performance / component-state recovery · 2026-08-31

R7 resumes from the user-supplied `DK-Data-Studio-v3.67.10.zip` source baseline. The directly accessible R7D archive was not present, but the R7E mount-blocked handoff preserved the R7D task list. No GitHub access is used.

### Cold-start Theme/Semantic runtime

- Component Appearance no longer unconditionally triggers a second full Semantic document scan at startup when Semantic UI has already bootstrapped.
- Theme/profile change events now converge onto the same frame-batched appearance recomposition instead of running duplicate immediate semantic + appearance scans.
- Component Appearance dataset writes are idempotent, avoiding self-generated mutation work for unchanged component/material context metadata.
- Semantic Registry now compiles one canonical component selector and assigns newly inserted dirty subtrees in the MutationObserver batch. It no longer queues every added node as a later multi-selector root rescan.
- Performance diagnostics retain the existing strict Windows budgets. No threshold is relaxed.

### Canonical component-state fallback

A Core bug was found in Theme variant composition: when a Theme did not author a variant such as `destructive`, Component Appearance copied the Theme's base component slots into the variant CSS variables. That masked the Core semantic fallback and could make destructive/selected states look neutral or inconsistent across Themes.

R7 now writes:

- base CSS variables from the resolved base Theme row;
- variant CSS variables only from variant slots actually authored by the Theme, including role/context-scoped variants.

Therefore missing Theme variants correctly fall back to canonical Core semantics while Aurora/other Themes that explicitly author a variant retain their own expression.

Menu/legend items also now own an explicit canonical 1 px rounded border geometry and component shadow variables. This removes browser-default thick/square button framing while keeping selected state readable.

### Split / GroupPlot drag performance

- `SplitController` pointer movement is now preview-only and requestAnimationFrame-coalesced.
- Shared chart resize scheduling is suspended while the split is actively dragged.
- Split state is persisted once on release, followed by one authoritative `split-end` resize request through the shared scheduler.
- Core `GroupPlot` ignores ResizeObserver callbacks while `dkds-split-drag-active` is set, matching the existing PlotView/ScientificCurve split-drag suppression contract.
- No Resonance-only performance patch is introduced.

### Regression protection and code-side validation

New regression: `tests/test-v36710-r7-theme-resize-performance.js` is included in both `test` and `check` manifests.

After the final R7F source changes:

- `npm run visual:gate`: **59/59 PASS**
- `npm run performance:test`: **PASS**
- `npm test`: **226/226 PASS**
- `npm run check`: **234/234 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: **PASS**
- `npm run science:parity`: **PASS**
- `npm run renderer:test`: **PASS**
- `npm run plugin-manager:test`: **PASS**
- authored CSS remains **44 files / 0 `!important`**

The first R7 `npm test` exposed one stale recovery-test assertion that still required Automation Runner 1.32.0 while the source/runtime and recovery document were already at 1.33.0. The stale assertion and the remaining old 1.32 acceptance sentence were updated to 1.33.0; no old runtime implementation was restored.

### Still WIP / Windows acceptance required

Do **not** tag or publish this tree yet. The current container cannot prove the user-reported Windows Electron interaction/visual result. A fresh Windows source-mode run must still verify:

- `ui.theme-runtime-performance` settles within the existing budgets (`material/appearance/semantic assignCalls <= 8`, flush budgets unchanged);
- cold-start perceived latency is improved;
- GroupPlot/bottom-group height dragging is responsive and does not recompute scientific plots during preview;
- Thin Glass range-selection menu has the intended compact component styling and destructive red feedback;
- legend controls no longer show the heavy square browser/button border;
- joined controls remain one silhouette without double paint;
- Aurora gradients/selected/hover expression remains intact;
- topbar/statusbar action language remains coherent across Core Default, Thin Glass and Aurora Pop.

## R7H runtime-state / rendered-visual recovery · 2026-09-01

Windows validation exposed that passing source/style gates was not sufficient: the application could still start into a largely empty generic PRIME shell and Aurora dark disabled commands could become nearly unreadable. R7H therefore reopens runtime-state acceptance rather than adding more page-specific CSS.

- A persisted `dkds.workspace.super.v1` is now treated as a recoverable preference. If it references a missing, disabled or contract-invalid TOP, Core migrates to the current valid default SUPER instead of intentionally keeping an empty shell. Valid saved choices still win.
- Disabled ToolbarActions no longer receive a second global opacity attenuation on top of the Theme provider's `disabledText`; this removes the dark-theme double dimming seen in Windows screenshots.
- R7G's overly broad grouped-action flattening is corrected. Only containers that visibly own a shared command silhouette (`.file-command-group` / `.dkds-integrated-action-group`) flatten direct child action chrome. Semantic/layout `grouped` context alone is not a visual-shell contract.
- The R7 Theme-runtime and split-drag performance work remains intact.

Current code-side validation after the R7H changes:

- Hard Visual Invariants: **61/61 PASS**
- `npm test`: **226/226 PASS**
- `npm run check`: **234/234 PASS**
- Mobile: **12/12 PASS**
- SDK Harness: **PASS**
- Scientific parity: **PASS**
- Renderer tests: **PASS**
- Plugin Manager tests: **PASS**
- authored CSS: **44 files / 0 `!important`**

R7H is still **WIP** until this exact source tree is run on Windows Electron with the user's existing persisted state and the reported blank-workspace, Thin Glass menu/legend, Aurora top/status bar and split-drag behavior are visually accepted.
