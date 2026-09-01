# DK Data Studio v3.67.10 — R7K WIP UI / Startup / Drag Closure Handoff

## Status

**WIP — Windows Electron final acceptance is still required.**

This repository is the complete clean development source continuation point after R7J. The round is intentionally not marked Final because the user must verify the rendered Windows Electron UI and rerun `npm run visual:closure:windows`.

Do not access the user's GitHub repository. Continue from this ZIP/source tree only.

## User-reported R7J regressions addressed in R7K

1. Thin Glass curve-inspector header still looked like Aurora.
2. A blank strip appeared immediately above the bottom status bar.
3. Default-theme buttons moved upward on hover while other themes did not.
4. GroupPlot height dragging remained visually laggy / not following the pointer.
5. Source/dev UI cold startup still felt approximately 3–4 seconds.

The user's latest Windows Automation 1.33 report was **44 PASS / 1 FAIL / 4 SKIP**. The sole fail was:

`Neutral Theme semantic header retained a stale gradient: floating-header ... = linear-gradient(...transparent...)`

Theme Coverage and idle mutation budget were already PASS, so R7K targets the remaining computed-style leak rather than adding another selector override.

## R7K changes

### 1. Theme effect ownership: neutral themes now compute no gradient layer

Root cause: `material-renderer.css` always authored `--dkds-material-theme-overlay` as a transparent linear-gradient for chrome. Even though visually transparent, Windows computed style still reported a gradient, so neutral themes retained a stale Theme effect identity.

Changed:

- `src/styles/theme/material-renderer.css`
  - neutral `.dkds-material-role-chrome` now owns `--dkds-material-theme-overlay:none`
  - only `html[data-dkds-theme-header-effect="true"]` composes the Theme header gradient

This is a semantic/effect-scope fix, not a Default/Thin-Glass patch.

### 2. Thin Glass inspector header no longer uses Aurora-like teal

Root cause: Thin Glass itself explicitly authored teal inspector-header component tokens, so the screenshot was not merely stale Aurora state.

Changed `src/plugins/thin-glass-theme/plugin.js`:

- light inspector header: neutral blue-gray glass (`rgba(239,245,251,.58)`, `#243247`, blue indicator)
- dark inspector header: neutral blue-gray glass (`rgba(26,36,54,.58)`, `#E7EDF5`, blue indicator)

Aurora remains free to own its colorful header treatment; Thin Glass no longer mimics it.

### 3. Removed the 4 px dead strip above the status bar

Root cause: desktop workspace height subtracted `96px` for top chrome even though the current topbar is 52 px and project-tabs row is 40 px = 92 px.

Changed:

- `src/styles/structure/metrics.css`
  - added `--dkds-shell-top-height:92px`
- `src/styles/structure/shell-navigation.css`
  - workspace height now subtracts the semantic shell-top variable + statusbar height

This removes the fixed 4 px empty band without theme-specific paint.

### 4. Default-theme button hover no longer jumps upward

Root cause: base/Default theme still used `--dkui-hover-lift:-1px`; Thin Glass and Aurora already set it to zero.

Changed `src/styles/presentation/shell.css`:

- Default/base `--dkui-hover-lift:0px`

No theme now changes toolbar button geometry on hover.

### 5. GroupPlot splitter drag restored to real-time geometry without real-time chart redraw

R7I/R7J used a ghost-divider preview: pointer movement only translated the separator, while the actual panel size changed on pointer-up. This reduced resize work but made the panel itself feel delayed and “not跟手”.

R7K restores the older correct interaction architecture:

- pointermove is rAF-coalesced
- **actual panel geometry is updated every frame**
- preview apply uses `{persist:false, emit:false, notify:false}`
- `html.dkds-split-drag-active` freezes expensive resize/layout consumers during the drag
- AnalysisWorkbench now checks drag-active **before** `syncRegions()`
- chart / PlotView / GroupPlot / PortableView resize paths remain frozen while dragging
- pointerup persists and emits one authoritative resize/update

Changed:

- `src/core/ui/modules/layout/workspace.js`
- `src/core/ui/modules/workbench/analysis.js`
- corresponding R7 tests / Hard Visual Invariants

The goal is explicit: **panel follows pointer; charts redraw once after release**.

### 6. Startup: remove two more pre-first-paint costs

R7J staged non-current plugin loading/activation but normal source startup still paid two unrelated costs.

#### 6.1 Heavy diagnostics / SDK authoring files are no longer parser-blocking

Normal `src/index.html` no longer eagerly parses:

- `src/generated/sdk-authoring-reference.js`
- `src/diagnostics/automation-smoke-cases.js`
- `src/diagnostics/automation-visual-cases.js`
- `src/diagnostics/automation-test-runtime.js`

Together these are currently about **474 KB** of JS source.

Added `src/core/host/optional-runtime-loader.js`:

- `ensureSdkAuthoringReference()` loads the SDK corpus only when AI/MCP authoring actually asks for it
- `ensureAutomationRuntime()` loads Automation Test runtime only when the test UI or visual-closure mode needs it

`studio-kernel-runtime` SDK authoring handlers are async and lazily load the corpus.

Windows `visual:closure` still preloads Automation runtime before plugin architecture initialization, preserving deterministic full acceptance.

#### 6.2 `npm start` no longer rebuilds/validates the whole repository every launch

Before R7K, every `npm start` synchronously ran runtime build, style build, brand generation, SDK authoring generation, plugin-index generation and plugin validation before Electron launched.

Now:

- `prestart = node scripts/prepare-dev-start.js`
- `start = electron .`
- `prepare-dev-start.js` only creates generated groups if required artifacts are missing
- when artifacts are present, container timing is about **0.02 s** for the preparation script
- full generation/validation remains in `npm test`, `npm run check`, `dist`, etc.

For this reason the R7K delivery ZIP intentionally retains deterministic `src/generated/*` and brand assets even though Git ignores them. They are runnable generated artifacts, not authored source or cache junk.

#### 6.3 First-paint plugin set tightened from R7J

R7J still promoted every `order <= 20` plugin and every Theme plugin to first-paint criticality. That unintentionally included Flexible Import, Pulse Import and both built-in Theme providers even when Default theme was active.

R7K now makes first-paint criticality explicit:

- `builtin.workspace-safeguards` → `systemCritical:true`
- `builtin.shell-navigation` → `systemCritical:true`
- `builtin.status-monitor` → `systemCritical:true`
- existing `builtin.data-center` stays system-critical
- current SUPER + scientific contract + required algorithm providers remain critical
- only the **persisted selected Theme provider** is loaded before first paint; Default needs no plugin Theme provider
- low-order import providers no longer become critical merely because of numeric order

With Default + Resonance, the generated built-in set is now **8 critical plugins** before first paint instead of R7J's broader set; remaining built-ins load after first paint.

## Verification completed in this environment

- `npm test`: **228/228 PASS**
- `npm run check`: **236/236 PASS**
- `npm run mobile:test`: **12/12 PASS**
- `npm run sdk:harness`: PASS
- `npm run science:parity`: PASS
- `npm run renderer:test`: PASS
- `npm run plugin-manager:test`: PASS
- `npm run visual:gate`: **62/62 PASS**
- authored CSS: **44 files / 0 `!important`**
- plugin manifests/packages: **17 PASS**
- `git diff --check`: PASS before commit

Electron itself is not installed in this container. An isolated attempt to fetch Electron 43.4.0 did not complete within the environment timeout, so **do not claim Windows rendered acceptance from this environment**. Source/runtime contracts and static regression gates passed; Windows computed-style and interaction acceptance remain the user's final authority.

## Required Windows acceptance

Run normal source launch first:

```powershell
npm start
```

Check these five items in order:

1. Thin Glass → curve inspector header is neutral blue-gray, not Aurora teal.
2. No blank strip exists between workspace content and the bottom status bar.
3. Default-theme buttons do not move vertically on hover.
4. Resonance GroupPlot splitter: the real group panel follows the pointer continuously; plots should not repeatedly redraw during the drag and should settle once on release.
5. Measure perceived cold startup again. Compare from invoking `npm start` to usable UI; R7K removes the full pre-launch rebuild chain and ~474 KB of normal parser-blocking optional runtime.

Then run:

```powershell
npm run visual:closure:windows
```

Expected Theme-specific closure improvement: the previous neutral-header transparent-gradient failure should disappear. Do not mark Final unless the new Windows report and screenshots agree.

## Android log supplied with this round

The attached Android log reached and passed source contracts / mobile tests / TypeScript checks, then failed starting Gradle's Java daemon with Windows `CreateProcess error=5` (access denied). This is a Windows Java/Gradle process-permission/environment failure, not evidence of the five desktop UI regressions, and R7K intentionally does not mix a speculative Android workaround into this UI/performance closure.

## Continue rule

Maintain the project rule: **clean architecture first, no patch-style specificity escalation, Core/Theme/plugin ownership must remain explicit, and every development response must ship a complete clean ZIP plus a handoff file.**
