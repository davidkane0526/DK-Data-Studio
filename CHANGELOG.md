# v3.41.3 — Plot export trigger aligned with chart-position chrome

- Removes the v3.41.2 pill/label treatment from the Core `PlotView` export trigger.
- Reuses the exact `dkds-portable-placement-trigger` chrome used by the chart-position control, so size, spacing, transparent background, hover state and caret are identical.
- Replaces the previous download arrow with a restrained outline file glyph whose size and stroke weight match the neighboring chart-position icon.
- Keeps CSV / copy / SVG / PNG behavior and menu structure unchanged.

# v3.41.2 — Polished PlotView export trigger

- Refines the Core `PlotView` export trigger into a cleaner, more polished pill button with a soft icon badge, clearer visual hierarchy and active/open state feedback.
- Keeps the export actions unified under the same Core menu and does not reintroduce per-plugin private export buttons.
- Leaves the existing chart-position breadcrumb and all plugin functionality unchanged.

# v3.41.1 — Compact chart export breadcrumb and responsive toolbar menu repair

- Collapses the Core `PlotView` generic CSV / copy / SVG / PNG controls into one compact export breadcrumb beside the existing chart-position breadcrumb. Domain-specific chart actions remain separate and plugins do not gain private export UI.
- Routes the responsive top command bar's “更多功能” popup through the Core viewport-level `ContextMenu`, so it is no longer clipped by the narrow commandbar's `overflow:hidden` container.
- Adds `ContextMenu.onClose` lifecycle synchronization for `aria-expanded` state and reuses the same action/error lifecycle for chart dropdown actions.
- Adds architecture regression guards that prevent plugins/Core PlotView from reverting to four per-chart generic export buttons or the clipped inline overflow menu.
- Keeps Plugin API v1.8 unchanged; this is a backward-compatible Core UI patch.

# v3.38.0 — Stable portable home slots, functional group layout menu and contextual exports

- Replaces PortableView's fragile `nextSibling` home restoration with a stable Core Home Anchor. A group subplot restored after floating/docking now returns to its original grid slot even if neighboring subplots have also moved.
- Fixes Resonance Group's “每行：自动” control so it opens the Core ContextMenu reliably, reflects persisted Auto/1–6 state, and exposes explicit “自动排列 / 每行 N 个子图” choices.
- Makes the shell `导出数据` menu contextual to the active plugin workspace. Export contributions are activity-scoped and the menu shows the current workspace instead of exposing a fixed generic main-plot vocabulary.
- Rewrites Resonance export labels around the actual `共振 I–V 主图` and peak data.
- Adds system export contributions for Pulse/Read (raw waveform, read-current plot/data, pulse-current plot/data, summary), TER (heatmap, R–V linkage, TER_Max–Vg/Vd) and Data Center (current DataTable, chart preview, provenance).
- Bumps Core UI Infrastructure to 6.2 and the GRS-derived Plugin Workspace Design System contract to 1.2 with stable home slots and contextual export semantics.
- Adds source-level regression guards plus a real Linux Chromium/Playwright runtime check for Home Anchor ordering and Core ContextMenu item activation.
- Extends the release version tool so package/index, renderer project version, dedicated TOP runtime version and built-in Resonance release version are updated together instead of drifting across files.

# v3.37.0 — Workspace ordering, runtime reliability and portable-view semantics

- Audits the shared PluginWorkspace responsibility boundaries instead of adding plugin-local fixes. PRIMARY now has explicit `contained` and `auto` scroll modes: Resonance keeps a contained interaction canvas, while TER, Pulse and Data Center own vertically scrollable long workspaces.
- Treats the control/data rail versus scientific canvas as a semantic split, not a fixed 1/5:4/5 ratio. Fixed scientific docking remains canvas-relative, while the rail stays resizable.
- Splits portable floating into two Core modes. `float` is a managed scientific-canvas float that may snap to canvas docks; `global` is a whole-plugin free float that may cross the control/science boundary and never edge-snaps into a scientific dock.
- Makes same-zone docks stack rather than overlap. Two PRIME/child views sent to the same bottom/left/right dock are laid out sequentially and remain scrollable.
- Moves SUB views out of the scientific-canvas layer. Physics mechanism, peak spacing and gate analysis now open as full independent plugin pages with their own scrolling while preserving the same SUPER/TOP controller/runtime.
- Adds Core PortableView close/collapse lifecycle and automatic chart resize. Resonance Group/Inspector close buttons and Group collapse now use the same lifecycle; Plotly descendants receive resize on dock/float/resize changes.
- Rebuilds Resonance group analysis around stable child PortableViews and live visible/accepted-peak data. Open group charts update with current main-plot visibility/selection through `Plotly.react` without destroying placement state; each card exposes a compact aligned header and whole-interface floating.
- Consolidates Group layout controls into one header; per-row column count is exposed through the header menu instead of a second toolbar row.
- Turns the shell's “编辑操作” into an active-plugin edit contract. Undo/deselect are routed to the current plugin first and are no longer duplicated beside PRIME/SUB commands in Resonance.
- Removes implementation/debug wording from user-facing Resonance UI.
- Fixes Pulse repeat-analysis instability in the scientific core: optional `null`/blank sample-range values were incorrectly converted to numeric zero. Failed reruns now preserve the last valid result, and a later valid rerun clears the stale error.
- Adds browser geometry/event validation for TER scrolling, dock stacking, two floating scopes, SUB scrolling, PortableView close/collapse and chart resize, plus real Pulse service repeatability regressions.

# v3.36.0 — GRS parity, canvas-local docking and interaction performance

- Refines the GRS-derived Plugin Workspace Design System around an explicit control/science split: the left control rail occupies roughly one fifth of the workspace while fixed PRIME/SUB/subplot docking targets the inner scientific canvas on the right. Manual floating remains flexible and snaps inside the scientific canvas.
- Reworks Core `PluginWorkspace` with canvas-local left/right/bottom/overlay zones. Resonance group analysis now docks below the main plot without spanning the data rail, and TER/other portable child plots dock to the chart-side left rather than the outer application left column.
- Makes portable placement persistence versioned and host-invariant. SUPER and TOP use the same internal workspace state; PRIME/SUB controls are projected to the host toolbar when Resonance is SUPER and stay local when it is an independent TOP.
- Restores GRS-like Resonance data-list, Vg editor, auxiliary-channel row, Curve Inspector and range-action menu presentation while retaining the shared Core workspace/interaction implementation.
- Adds current-visible-data auto-fit for the Resonance main plot. Hiding/showing sweeps refits the scientific view without changing the stable full-dataset color domain.
- Makes each Resonance group subplot a Core portable view with home/left/right/bottom/float placement, so individual derived plots can be arranged independently like TER subplots.
- Consolidates Resonance export commands into one semantic Export menu. When plugin-owned export contributions are active, the shell hides obsolete duplicate main-plot export commands.
- Fixes cross-project leakage when creating/switching tabs: a plugin with no slice in the newly selected project is reset or rebuilt only from that project's root data, never from the previous tab's in-memory controller state.
- Removes high-frequency interaction redraws introduced during the v3.35 extraction. Marker drag and FWHM drag update SVG geometry directly during pointer movement and commit a full render only on drag end; group charts use `Plotly.react`; host resize requests are frame-coalesced rather than synchronously rebuilding the Resonance SVG.
- Adds regression guards for project-root migration, inner-canvas docking, portable subplot placement, GRS parity controls, SUPER/TOP action projection, stable color-domain fitting, and drag performance boundaries.

# v3.35.0 — GRS-derived PluginWorkspace foundation

- Promotes the Graphene Resonance Studio workspace model into Core `PluginWorkspace` rather than treating Resonance as a UI exception.
- Adds Core `ScientificCurveSurface` for Turbo curve coloring, direction dash semantics, direct selection, modifier-click actions, range selection, Ctrl box zoom, wheel zoom, double-click reset, draggable snapped markers, modifier-right-click actions, and editable width handles.
- Resonance now supplies domain data/commands to Core scientific-plot hooks instead of owning low-level D3 interaction plumbing.
- SUPER and TOP mount one host-invariant Resonance `PluginWorkspace`; host mode is metadata only.
- Data Center, TER and Pulse shared views now prefer the same `PluginWorkspace` API.
- Adds `scripts/test-plugin-workspace-foundation.js` and updates plugin-boundary tests to enforce that reusable GRS interaction mechanics stay in Core.

# v3.34.0 — Shared plugin visual contract and GRS-parity Resonance rebuild

- Added a Core-level plugin visual contract for non-Resonance AnalysisWorkbench surfaces: 12.5 px body text, 12 px labels, 11 px minimum auxiliary text, 13.5–14 px section/title text, and 32 px controls. Action/tool rows are single-row-first and scroll horizontally only when the host is genuinely too narrow.
- Migrated Data Center, TER, Pulse/Read, plugin-manager and safeguard surfaces to consume the shared visual tokens instead of carrying independent 8–10 px historical typography.
- Rebuilt Resonance View/Interaction Runtime against the uploaded legacy Graphene Resonance Studio reference rather than the v3.25 Plotly presentation. The main interaction plot is again D3/SVG with Vg→Turbo continuous curve color, dashed reverse sweeps, and cool/warm peak-family colors.
- Restored the reference direct interactions in the shared runtime: modifier-click manual peaks, modifier-right-click deletion, peak dragging with raw-sample snapping, FWHM handle dragging, box range actions, Ctrl+box zoom, pointer-centered wheel zoom, double-click reset, Ctrl+Z undo and Escape deselection.
- Restored floating/dockable Curve Inspector and Group Analysis while keeping placement, dragging, docking and persistence Core-owned through AnalysisWorkbench/PortableView. SUPER and independent TOP mount the same parity root and therefore keep the same plot/layout behavior when the plugin is demoted from SUPER.
- Added D3 to the generic dedicated-plugin dependency loader/allowlist so a TOP window does not lose the renderer that is already present in the main window.
- Fixed the GRS main workspace height contract after migration to AnalysisWorkbench; the chart grid now fills the available primary surface instead of collapsing to zero height.
- Added plugin visual-contract and strengthened Resonance architecture regressions; refreshed historical tests that encoded superseded v3.25/legacy toolbar assumptions.
- Validated Data Center, TER, Pulse and Resonance layouts in Linux Chromium, including computed font/control sizes, single-row action bars, non-zero main-chart geometry and the reference curve/peak color semantics.

# v3.33.0 — Resonance v3.25 parity and canonical live data flow

- Rebased Resonance presentation behavior on the v3.25.0 interaction baseline while retaining the shared SUPER/TOP feature runtime. Plotly curve, trend and group-series colors again follow the v3.25 default trace sequence instead of architecture-added peak-category coloring.
- Restored direct v3.25 peak interaction on the shared Plotly surface: Shift+left-click adds a snapped manual peak, Ctrl+right-click deletes the hovered peak (Shift+right-click remains accepted), and unlocked peaks can be dragged with sample-point snapping.
- Unified imported source data behind a live Artifact/legacy compatibility bridge. Main renderer, Data Center, TER, Resonance and dedicated TOP windows now observe the same imported dataset state without persisting duplicate transient artifacts.
- Fixed TER using an activation-time `makeProject()` dataset snapshot. TER now reads current canonical artifacts on each calculation and uses live scan visibility when available.
- Fixed Resonance using an activation-time dataset snapshot. Artifact changes rebuild its dataset/sweep view in place without recreating the plugin.
- Fixed dedicated TOP windows restoring an empty Artifact Store for imported legacy datasets by hydrating transient adapters from root project data after project restore.
- Fixed a completed import session retaining its previous pending files, which made reopening Import look like an automatic re-import and could immediately trigger duplicate/replacement warnings.
- Added live data-bridge regression coverage and verified the Resonance UI with real Chromium + Plotly rendering on Linux; TER matrix calculation was also exercised against the canonical Artifact path.

# v3.32.0 — Typed interaction runtime, resize performance and scientific UI parity

- Reworked resize dispatch at both plugin-scope and plugin-kernel levels. `layout:resize` is now frame-coalesced, recursive resize emissions are rejected, and visible Plotly surfaces resize at most once per frame instead of participating in feedback loops.
- Added a plugin-owned `DataTypeRegistry` + typed `InteractionRuntime`. Plugins can register raw data, derived data and analysis-result types with multiple inheritance, identity/description hooks, compact selection projections and optional ref resolvers.
- Selection documents now carry heterogeneous typed items, focus, ranges and context. Large tables/sweeps/results can stay in the canonical artifact/project store while interaction state carries compact `id/ref/value` projections.
- Added atomic region selection for ranges plus heterogeneous selected results, and view bindings that can consume a type, parent type, role or kind without hard-coding scientific schemas into Core.
- Split sticky/pinned scrolling from real docking. Portable views now support `sticky` as a home-layout state; TER's linked R–V inspector defaults to sticky and can still be moved right/bottom/floating.
- Restored Resonance linked scientific interaction around one shared typed selection: main I–V, trend, curve inspector and group plots synchronize sweep/peak focus and multi-selection; range selection drives local detection/lock/unlock/category/delete actions.
- Restored the richer Resonance data navigator (all/forward/reverse/none, per-dataset Vg, per-direction visibility and auxiliary transform), detector/provider parameter UI, peak-category legend, physics labels and editing shortcuts. SUPER and TOP continue to mount the same PRIMARY/PRIME/SUB view tree.
- Reduced selection-time plotting cost: Resonance now restyles existing main/trend/group traces for selection changes instead of rebuilding them, caches physical-family analysis, and no longer rerenders group plots on resize.
- Upgraded Plugin API to 1.7.0 and UI Infrastructure to 5.0.0; invalidated stale portable-layout state with `dkds.ui.layout.v6`.

# v3.31.2 — Resonance bootstrap and interactive workbench controls

- Fixed Resonance Workbench failing to load with `clone is not defined` after the shared Controller/View extraction. The feature runtime now declares its shared science/runtime helpers explicitly and the same bootstrap is used by SUPER and TOP.
- Fixed a Core `ContextMenu` capture-phase bug: the menu previously closed on the pointer-down of its own items, so item `click` handlers never ran. This was the root cause of TER's Layout menu and portable chart-position menus appearing but doing nothing.
- `ActionGroup` now owns declarative menu items instead of forcing plugins to manually open context menus. TER's Layout control uses that common path.
- `PortableView` now reports placement changes to `AnalysisWorkbench`; local right/bottom regions and managed grids are synchronized immediately after docking/restoring/floating instead of relying only on MutationObserver timing.
- TER explicit layouts (3×2, 2×3, 1×6, 6×1) are authoritative rather than silently clamped by responsive grid heuristics.
- Added a runtime bootstrap regression test for Resonance and strengthened UI-infrastructure tests for context-menu item activation and portable placement dispatch.

# v3.31.1 — Shared dependency cache and resilient Electron install

- Reworked Windows dependency installation so npm never reifies through the project `node_modules` Junction. Shared dependencies are installed into immutable package-signature cache entries under the configured node_modules root, then the project is linked only after the cache entry is complete.
- npm package extraction now uses `--ignore-scripts`; Electron's binary installer runs separately and validates `dist\electron.exe`, so a failed binary download cannot leave a cache entry marked ready.
- Electron binary download retries automatically and, in `auto` mode, falls back to the configurable binary mirror after an official-source timeout/reset. The selected `electron_config_cache` / `ELECTRON_CACHE` remains authoritative.
- Windows packaging retries once with the same binary-mirror fallback if electron-builder binary downloads fail.
- Existing local/partial `node_modules` trees left by older builds are replaced by the shared immutable cache Junction instead of being silently kept.

# v3.31.0 — Complete unified analysis runtime

- Upgraded Core UI infrastructure to AnalysisWorkbench v4 and Plugin API 1.6. The workbench now exclusively owns outer left/main/right/bottom/overlay geometry and never rewrites plugin-owned Grid/Flex layouts.
- Completed semantic PRIMARY / PRIME / SUB composition with independent left/right/bottom splitters, workbench-local floating coordinates, surface parking/restoration, lifecycle cleanup and unified navigation.
- Upgraded Capability Runtime to v2 with metadata queries, tags/priority, `require`, proxies, revision tracking and change subscriptions; dedicated TOP windows continue to invoke main-renderer capabilities through the generic IPC bridge.
- Migrated Resonance SUPER and TOP to the same shared runtime composition. Curve inspection and group analysis are PRIME surfaces; physics, peak spacing and gate-voltage analysis are SUB surfaces. SUPER/TOP adapters contain host mapping/lifecycle only.
- Migrated TER, Pulse / Read and Data Center shared views to the same `AnalysisWorkbench.compose()` contract. TER linked R–V, Pulse raw-waveform diagnostics and Data Center chart preview remain PRIME surfaces rather than competing layout systems.
- Invalidated transitional UI placement data with layout namespace v5 so stale v3.29/v3.30 dock coordinates cannot corrupt the new workbench geometry.
- Kept project serialization self-contained and backward-compatible: source text/parsed data and plugin project slices remain portable without original CSV/TXT/DAT files.

# v3.30.0 — Unified Analysis Workbench + Capability Runtime

- Added the Core-owned `AnalysisWorkbench` with explicit PRIMARY / PRIME / SUB semantics, responsive left rail, right/bottom docking, floating overlay, managed chart grids and lifecycle-owned resize handling.
- Added a renderer-to-renderer Capability Runtime bridge so dedicated TOP windows can consume enabled detector/workflow/chart/service providers without loading a second copy of the complete application.
- Migrated TER, Pulse / Read and Data Center away from the transitional existing-DOM Workbench. Their shared views now mount one PRIMARY surface and use Core PRIME surfaces for R–V inspection, raw-waveform diagnosis and chart preview.
- Migrated Resonance TOP navigation to the same semantic workbench: curve inspection and group analysis are PRIME surfaces; physical mechanism, peak spacing and gate analysis are SUB surfaces. Detector providers and parameter schemas are supplied through the capability registry.
- TER chart columns are now controlled by Core `GridController`, preventing the plugin from mixing DOM movement with a second grid-layout implementation.
- Upgraded Plugin API to 1.5.0 and UI infrastructure to 3.0.0; invalidated old transitional UI placement cache with the v4 layout namespace.
- Project serialization remains self-contained and backward compatible; this refactor changes UI composition, not scientific project portability.

# v3.29.0 — Dedicated TOP runtime and portable workbench repair

- Fix generic native TOP validation so dedicated Resonance windows no longer require split-only `left/main` regions.
- Fix Pulse TOP startup contract: the support script now exports `DKDSPulseDedicatedService`, while the thin runtime adapter owns `DKDSPluginWindowRuntime`; the host clears stale runtime factories before support scripts load.
- Upgrade core UI infrastructure to v2.3 with isolated Workbench-local portable docking shelves, preventing charts from being reparented into plugin data/control regions.
- Restore the compact chart placement grammar `◫ / ← / → / ↓ / ↗` behind a single dropdown trigger; placement chrome can now mount inside an existing chart action cluster.
- Rebuild TER as a flat six-chart grid, make R–V a first-class static chart, move layout choices into the header menu, and reset obsolete v2 portable-layout persistence.
- Repair Data Center chart toolbar composition and Pulse/Data Center/TER portable placement through the new local Workbench docking API.
- Refine floating panel header actions so dock/minimize/close affordances use lightweight borderless chrome.

# v3.28.0 — Generic TOP/SUPER repair and shared plugin runtimes

- Fixed plugin-manager lifecycle reflow/scroll anchoring so disabling/reloading a plugin cannot leave the manager visually shifted upward with a large empty region.
- Removed resonance-only SUPER assumptions: only the actual SUPER root is non-dismissible; resonance sub-pages retain their return control, while every other TOP can be promoted to SUPER through the same contract.
- Non-SUPER TOP navigation now awaits the generic independent-window host and reports open failures instead of silently leaving the previous plugin UI visible.
- Raised the global data-import workbench above SUPER analysis surfaces so import UI cannot be obscured by the currently embedded plugin.
- Replaced the six opaque portable-chart placement icons with one compact location breadcrumb/menu backed by the core ContextMenu service.
- Fixed TER portable chart placement to use its local Workbench layout, preventing charts from disappearing behind fixed analysis pages after a dock/pin action.
- Removed duplicated primary actions from TER, Pulse and Data Center bodies; primary commands now live in one dynamic header ActionGroup while contextual/export actions remain close to their content.
- Refactored TER, Pulse and Data Center into thin `plugin.js` / host adapters plus shared `controller.js`, `shared-views.js` and `feature-runtime.js` layers using Workbench, Selection Channel, Split Layout, Chart Surface and Portable View infrastructure.
- Preserved v3.27.1 shared build-cache binding behavior and project-file compatibility/self-contained data persistence.

# v3.27.1 — Shared build-cache binding fix

- Fixed Developer Toolbox cache settings so changing the shared cache root actually moves npm, pnpm, Electron, electron-builder, Gradle and shared `node_modules` to the selected directory instead of leaving stale derived paths behind.
- Added explicit derived/custom cache-path mode. The recommended default keeps all child caches under `DK_CACHE_ROOT`; advanced users can opt into per-cache custom paths.
- Bound both current Electron `electron_config_cache` and compatibility `ELECTRON_CACHE` to the selected Electron cache directory.
- `npm install` now passes the selected cache explicitly with `--cache` in addition to environment binding and `--prefer-offline`.
- pnpm now receives `pnpm_config_store_dir` / `PNPM_CONFIG_STORE_DIR`; Gradle and electron-builder continue to receive their native cache environment variables.
- Existing `node_modules` Junctions are inspected and automatically rebound when the configured shared cache location changes.
- Windows and Android builds print the effective cache paths at startup and verify that npm resolved the requested cache before continuing.

# v3.27.0 — Plugin-neutral UI/state infrastructure

- Added core `DKDSUI` infrastructure for persistent workspace regions, resizable split panes, portable/pinnable/floating scientific views, dynamic action groups, activity-scoped shortcuts, mouse/pointer bindings, context menus, linked-selection channels, Plotly surface lifecycle, View/Controller mounting and common workbench shells.
- Added lifecycle-owned `DKDSState` stores with subscriptions, migration, undo/redo support and automatic namespaced project-slice persistence. Project data remains self-contained and backward compatible.
- Resonance `super-layout.js` and `window-runtime.js` are now host-only adapters. Feature rendering/science/event behavior moved into plugin-owned `feature-runtime.js` over the shared Controller/View layers.
- Migrated TER, Pulse and Data Center to core portable plots and dynamic command groups; TER no longer installs a direct global keydown listener. Data Center now uses the core state/project store.
- Portable plots can be restored, pinned left/right/bottom, floated, resized, double-click toggled, right-click positioned and edge-snapped; placement is persisted by core. Dedicated TOP windows now expose left/right/bottom universal docking hosts.
- Plugin API advanced to v1.4.0 and the plugin template/documentation now targets infrastructure-first development.

# Changelog

## 3.26.0 — Resonance shared View/Controller architecture

- Refactored `builtin.resonance-workbench` into explicit plugin-owned shared **Controller** and **View component** layers. The plugin entry is now only a dispatcher: SUPER and dedicated TOP consume the same controller/view descriptors and differ only in presentation/layout adapters.
- Added `workbench-shared.js` as the canonical resonance Controller layer. It owns the six-view catalog, project/workspace normalization, controller facade, shared trend/group ViewModel and shared peak-spacing ViewModel. Added `view-components.js` as the shared View layer; it owns reusable feature descriptors/templates and dedicated TOP composition.
- Added `super-layout.js` as the SUPER presentation adapter. Mature SUPER panels remain available, but the adapter now consumes shared View descriptors/templates and the same shared Controller used by TOP instead of owning a second feature spine.
- Dedicated `window-runtime.js` now consumes the shared workspace schema, plugin-slice migration, trend model, accepted-series model and spacing model. It no longer keeps its own copy of `defaultWorkspace()` / `normalizeWorkspace()`.
- Built-in plugin loading now honors ordered `manifest.scripts`, matching `.dkplugin` packages. This lets a plugin own support modules without adding plugin-specific script tags to the core shell. Resonance declares `workbench-shared.js → view-components.js → super-layout.js → plugin.js`; its TOP window loads the same Controller and View layers before its dedicated runtime.
- Added `scripts/test-resonance-shared-architecture.js` to prevent the old SUPER/TOP drift from returning: the entry must stay thin, both renderers must consume the shared layer, and shared trend/spacing models are executed in isolation as a regression test.
- Project format remains unchanged and self-contained. Raw imported text, parsed points and namespaced plugin state are still preserved, so this architecture refactor does not break old project files or portability to a machine without source data.

## 3.25.0 — plugin-manager viewport hardening / full Resonance TOP parity

- Fixed the remaining Plugin Manager blank-area jump by treating plugin lifecycle rerenders as top-reset transactions and repeatedly clamping the real scroll container through late Chromium layout/scroll-anchor frames. Empty filter results use the same repair path.
- Expanded the dedicated Resonance TOP renderer from the v3.24 minimal extraction to a full plugin-owned workbench with main I–V/peak editing, curve inspection, grouped plots, physical-family analysis, peak spacing and gate-dependent analysis.
- Resonance remains a true dedicated plugin renderer and does not fall back to a second full `src/app.js` instance. SUPER and TOP now expose the same major analysis domains while keeping their own presentation shells.
- Added `science-ter` to the Resonance dedicated dependency contract so gate-dependent TER analysis stays inside the plugin window.
- Project files remain self-contained and backward-compatible; no dataset `text` or parsed `points` fields are removed by these runtime/UI changes.

## 3.24.0 — user-controlled prewarm / dedicated resonance / robust self-contained projects

- Plugin Manager now exposes a per-plugin **预热** preference. Built-in independent windows default to off to reduce idle Electron renderer memory; users can opt in per plugin.
- Resonance Analysis no longer uses the compatibility full-app renderer for TOP windows. It now owns a dedicated runtime and namespaced project slice like TER / Pulse, while the SUPER workspace keeps the mature integrated resonance surface.
- Project I/O now shares one parser/serializer across desktop and web, supports BOM/UTF-16 project files, preserves legacy plugin fields, and continues embedding both raw imported text and parsed points so projects remain portable without the original source files.
- Plugin-manager lifecycle mutations reset to a valid top-aligned viewport and analysis pages use top/bottom constraints instead of stale calculated heights, preventing the large blank area after disabling/reloading plugins.
- TER adopts the verified Python-reference voltage grid/automatic tolerance semantics plus linked R–V inspection, chart-layout and export interactions without importing the reference application's legacy architecture.

- Carries forward the v3.23 toolbar/LAN polish; plugin-manager enable/disable/reload now deliberately resets to a valid top-aligned viewport instead of preserving a stale bottom scroll anchor.
## 3.23.0 continuation — toolbar outline alignment / LAN icon polish

- Replaced the LAN Web minimize em dash with a compact 11 × 2 px drawn glyph while retaining the existing 32 × 30 px click target.
- Matched the outer height and corner radius of `编辑操作`, `导出数据`, and `软件管理` to the outlined group containing `导入数据 / 读取项目 / 保存项目`.
- Extended static UI regression checks for both shell contracts.

## 3.23.0 continuation — shell layering / control-size polish

- Raised the LAN Web management surface above SUPER/TOP workspace splitters so the adjustable SUPER divider can no longer draw through the floating panel at particular saved divider positions.
- Normalized the LAN Web minimize and close controls to the same 32 × 30 px hit area, with matching hover geometry and a restrained destructive hover state for close.
- Matched the `编辑操作` command width to the adjacent import/open/save commands instead of inheriting the wider generic dropdown minimum.
- Added static UI regression checks for these shell-level contracts.

## 3.23.0 continuation — unified status bar / Save As / LAN status

- Added a global bottom status bar that remains outside the active SUPER/TOP workspace. Plugins can contribute ordered left/right status items through `ctx.ui.statusBar.add(...)`, including clickable icons, labels and state styling.
- Added built-in `builtin.status-monitor`, showing runtime type, live memory usage and LAN Web status. The LAN status item restores the LAN Web panel when clicked on desktop.
- LAN Web management can now be minimized to the status bar without stopping the server; status changes are emitted through the plugin event bus.
- Project Save now asks `保存当前 / 另存为 / 取消` without adding another toolbar button. Desktop Save As always selects a new destination and then makes it the current project path.
- Web and desktop still serialize the same complete project JSON. Web uses a retained File System Access handle for true overwrite where the browser permits it; ordinary LAN HTTP pages fall back to downloading the same project JSON because browsers cannot silently overwrite an arbitrary client file.
- Added runtime-memory bridge support and `scripts/test-statusbar-project-save.js` regression coverage.

## 3.23.0 — SUPER / TOP / PRIME / SUB workspace contract
- 新增通用 PRIME placement manager：`right / bottom / float`、adapter/portable 两种模式、当前 SUPER 作用域与本机 placement 记忆。

- Added an explicit, single SUPER main-workspace selection persisted as a local UI preference. Invalid/unavailable saved SUPER selections no longer fall back to the next plugin.
- TOP is now a real plugin contract: only enabled/active TOP plugins with complete left/main workspace regions can be promoted to SUPER. The current SUPER cannot be disabled or uninstalled until another TOP is selected.
- Added generic `split` / `native` TOP layout contracts with semantic `root`, `left`, `main` and `flatten` regions. Core SUPER composition no longer contains Data Center / TER / Pulse activity-name CSS whitelists.
- Added PRIME (`float/right/bottom`) and SUB registries so optional dockable tools and self-owned pages are distinct from required TOP workspace regions.
- Non-SUPER TOP plugins use the same manifest-driven independent-window prewarm/hide/reuse lifecycle; resonance uses compatibility mode when it is not SUPER. The active SUPER is excluded from background prewarming.
- Added an adjustable SUPER left/main divider with per-machine width persistence.
- Plugin Manager TOP icons now act as explicit SUPER selectors and expose TOP contract / PRIME / SUB diagnostics.
- Removed the selected-workspace blue bottom underline and normalized top command controls to a 34 px height.
- Added `scripts/test-super-workspace.js` regression coverage.

## 3.22.2 — plugin-manager viewport lifecycle hotfix

- Fixed the plugin manager scroll viewport becoming truncated after disabling, re-enabling, or reloading plugins.
- Analysis pages now bind their height to the live visual viewport and the measured topbar + project-tab stack instead of relying on a stale fixed geometry.
- Plugin lifecycle, plugin-manager rerender, window resize, and visual-viewport resize all trigger a two-frame layout resync after DOM/style contributions settle.
- Hardened `.analysis-page-body` as a zero-basis flex scroll region so list/card growth cannot shrink the usable scroll viewport.
- Added a regression check for the analysis-page viewport contract.

## 3.22.0 UI refinement (local development snapshot)

- Replaced the multi-curve brand mark with a compact single-resonance spike and regenerated Windows/Android icon assets.
- Unified Windows app identity (`DK Data Studio`, executable name and AppUserModelID).
- Clarified top-level plugin navigation versus contextual secondary commands with responsive density modes.
- Standardized the desktop/plugin typography scale and refined borders, shadows, radii, states, cards and tables.


## 3.22.0 — shared Windows toolchain + compact application identity

- Added a compact DK Data Studio app mark and wired it into Electron windows, Windows packaging, the desktop header and Expo Android icons.
- Added cross-project `DK_TOOL_ROOT` / `DK_CACHE_ROOT` discovery. On this workstation `D:\Code` is auto-detected when `D:\Code\NodeJs` exists.
- Node, JDK, Android SDK, npm cache, pnpm store, Electron cache, electron-builder cache and Gradle cache can now be reused by DKDS and PyDroid instead of being downloaded per project.
- Automatic JDK fallback now provisions shared Eclipse Temurin JDK 21 under `DK_TOOL_ROOT\Java\temurin-21\current`.
- Added `DKDS.cmd toolchain` and a GUI card that reports every shared tool/cache location.
- Android metadata advanced to `0.4.0` / versionCode `6`.

## 3.21.2 — managed Android JDK + strict environment gating

- Fixed `Check-AndroidEnvironment` returning a truthy array when diagnostic native-command stdout (for example `node --version`) leaked into the PowerShell pipeline; failed checks now stop the build reliably.
- Added automatic per-user Eclipse Temurin JDK 17 provisioning from the official Adoptium stable binary API when no complete JDK is installed.
- Managed JDK downloads are SHA-256 verified and stored outside the repository under `%LOCALAPPDATA%\DKDataStudio\toolchains\temurin-17\current`.
- Existing `JAVA_HOME` / PATH / Android Studio JBR installations still take priority over the managed JDK.
- Android release signing now calls the resolved JDK `keytool` directly. Installing an already-built APK no longer requires Java.
- Android app metadata advanced to `0.3.1` / versionCode `5`.

## 3.21.1 — Windows Android environment hotfix

- Fixed `android-check` crashing under Windows PowerShell 5.1 because `$home` collided case-insensitively with the read-only automatic variable `$HOME`.
- Reworked Java/JDK discovery to use non-reserved variable names and a pipeline-clean candidate array.
- Prevented Java discovery from leaking collection-operation return values into the function result.
- Added regression guards against writing to PowerShell read-only/automatic variables in Windows tooling.

## 3.21.0 — DK Data Studio UI / plugin surfaces / auxiliary windows

- Renamed the application to **DK Data Studio** and standardized installable plugin packages on `.dkplugin`.
- Enlarged and regrouped the desktop command shell; resonance Activity and resonance-specific commands now share one visual group.
- Added plugin-owned `ui.selectionMenus` for box-selection actions and moved the final hard-coded main-view reset action into the resonance plugin.
- Persisted group-chart columns as a machine UI preference so opening/importing projects cannot reset the layout to one chart per row.
- Import command now opens the workbench only; the native file picker opens only from the explicit “导入文件” action.
- Data Center, TER and Pulse Activities now default to separate Electron BrowserWindows and synchronize their project snapshot on close.
- Android release build auto-discovers the SDK/adb and Android Studio JBR/JDK from environment, standard locations and Windows install metadata.
- Release APK remains `mobile-dist/DK-Data-Studio.apk`; Android metadata is `0.3.0`, versionCode `4`, package `com.dk.datastudio`.
- Added v3.21 regression checks for the plugin-owned selection menu, auxiliary windows, persisted layout, explicit import picker and Android environment discovery.

## plugin branch — 3.20.0-plugin.3

- Android toolbox now builds the release variant with `assembleRelease` and a dedicated persistent local release signing identity.
- Final Android artifact is normalized to `mobile-dist/DK-Data-Studio.apk`.
- Connected-device runs use Expo's `--variant release`, and the direct mobile npm workflow matches it.
- EAS production output is now APK instead of app bundle.
- Android app version advanced to `0.2.1` / versionCode `3` for clean replacement installs.
- Windows tooling regression tests now guard the release-only APK workflow.

## plugin branch — 3.20.0-plugin.2

- fixed Windows PowerShell command argument forwarding so `npm install`, `npm start`, checks, tests, builds, Android and update actions receive their arguments correctly;
- replaced fragile WinForms absolute-coordinate construction with a responsive card layout compatible with Windows PowerShell 5.1;
- added explicit dependency repair and desktop-tooling diagnostics actions to both CLI and GUI;
- added Windows-tooling regression checks to `npm run check` and `npm test`;
- kept the PowerShell sources UTF-8 with BOM so Chinese UI text is decoded correctly by Windows PowerShell 5.1.

## plugin branch — 3.19.0-plugin.1

- introduced Activity + context-toolbar shell with automatic overflow;
- moved resonance sidebar/range menu/physics/gate/spacing UI ownership into `builtin.resonance-workbench`;
- made the central main view, inspector and group subplot system provider-driven;
- extracted mature robust resonance peak finding into independent `builtin.resonance-detector-robust`;
- added detector-owned parameter UI, presets and evidence-marker metadata;
- removed permanent manual-operation instructions and main-plot shortcut hint;
- moved TER and Pulse page markup/event bindings out of core HTML into their plugins;
- added Plugin Workspace/UI API v1.2 and strict architecture-boundary checks.
- added semantic context-toolbar groups and priority-aware overflow so plugin growth does not create a single long command strip;
- added trusted desktop `.dkplugin` install/update/uninstall support with rollback on failed plugin updates;
- added an installable external resonance-detector SDK example and package documentation.

## plugin branch — 3.18.0-plugin.1

- standard Data Model + Artifact Store + Provenance;
- Processor / Analyzer / Chart / Recipe Plugin API v1.1;
- Workflow / Recipe execution engine;
- schema-driven parameter forms;
- safe Formula / Derived Column engine;
- built-in Data Center customization workspace.

## plugin branch — 3.17.0-plugin.1

- added core Plugin Manager UI;
- added persistent enable/disable/reload lifecycle;
- added activation-error retry and partial-activation rollback;
- preserved disabled plugin project state across save/load;
- added plugin diagnostics copy and restore-default actions;
- added touch/responsive Plugin Manager layout;
- added dedicated plugin-manager lifecycle regression tests.

## plugin branch — 3.16.0-plugin.1

- rewrote the mature numerical/scientific engine into `src/science/*` modules;
- reduced `src/analysis.js` to a compatibility facade;
- moved smart cross-Vg peak identity, physical-family classification and gate-analysis mathematics out of the UI controller;
- added parity tests that compare rewritten workflows against the preserved `main` v3.14 implementation;
- added an Expo SDK 57 / React Native 0.86.2 Android shell;
- added offline Android asset packaging of the same plugin renderer/science engine;
- added native Android document picking, clipboard, CSV/JSON/SVG/PNG save/share bridge;
- added Windows debug APK build/install scripts and EAS APK profile.

## plugin branch — 3.15.0-plugin.1

- initialized Git history with preserved v3.14 `main`;
- created `plugin` branch;
- added Plugin API v1;
- added generated built-in plugin discovery;
- added flexible-import, resonance-workbench, TER, and pulse built-in plugins;
- migrated pulse workspace persistence to plugin project slices with v3.14 migration;
- routed flexible importer through plugin registry;
- moved domain toolbar entry points to plugin contributions;
- added runtime platform/touch profile;
- added compact/medium/large responsive foundations;
- added AI plugin-development and Android porting documentation.

## plugin branch — 3.20.0-plugin.1

- collapsed the two-row desktop command shell into one adaptive command row;
- retained Activity and plugin-action priority overflow instead of wrapping;
- normalized UI typography/control density using semantic CSS tokens;
- consolidated Windows CMD workflows into `DKDS.cmd` and `DKDS_GUI.cmd`;
- added the WinForms developer toolbox and one PowerShell task backend;
- moved LAN update service under `services/update-server/` and update defaults under `config/`;
- organized practical guides/releases under `docs/`;
- added project-structure, development and next-session handoff documentation.
