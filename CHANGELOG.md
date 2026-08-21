# v3.58.2 — TOP ScientificPlot, Resonance Group Trends & Source Data Lifecycle

- Fixed TER dedicated TOP calculation failure `charts.scalarField is not a function`. The TER window runtime now injects the same managed `ScientificPlot` surface used by plugin feature code, so ordinary traces and scalar fields share one renderer contract in TOP and SUPER.
- Fixed blank Resonance group charts when the optional peak-metrics provider had not yet returned FWHM/amplitude/area. Peak-family construction now always preserves canonical peak identity, Vpk and Ipk; optional metrics merge later instead of gating the whole series.
- Added a generic `core.data-sources` lifecycle capability. Imported source datasets remain project/host-owned and are projected into the Artifact Store; Data Center consumes the public capability instead of mutating host state.
- Data Center now exposes `移除源数据` for directly imported DataTable sources. Removing a source also removes Artifact lineage descendants derived from that source, while unrelated sources remain intact. Resonance/TER data lists remain analysis visibility/selection surfaces rather than owning source lifetime.
- Added regressions that dynamically verify TER TOP receives `scalarField()`, Resonance Vpk/Ipk trends survive pending metric computation, and source removal updates project datasets plus Artifact lineage.
- Automation Runner 1.14.0 adds `Project source data lifecycle`, raising the development suite to 32 cases and verifying the registered `core.data-sources` capability plus isolated source/lineage removal without modifying the open project.

# v3.58.1 — Import Workbench Regression Fix

- Fixed a v3.58.0 regression where the import preview still referenced the removed Gate-analysis formatter, aborting workbench rendering before the selected-file summary refreshed.
- The import preview now uses a host-neutral numeric formatter.
- Selected/total file count is rendered immediately after files are chosen and before sequential parsing begins.
- Global import selection summary now renders before the editor/preview so its state is independent of preview rendering.
- Added a dedicated import-workbench regression test to the normal `npm test` and `npm run check` gates.

# v3.58.0 — Host Neutralization & Canonical Plugin-Owned Project State

- Removed the historical Resonance/Peak/FWHM/TER/Gate/Pulse/Sweep implementation and domain state from `src/app.js`; the main host now owns only generic project, Artifact, plugin lifecycle, UI, I/O and platform responsibilities.
- Upgraded the project format to schema v2. Current saves keep domain persistence under `plugins[pluginId]`; historical domain root fields are stripped from the canonical project.
- Made `src/core/project-format.js` the single legacy-project migration boundary. Old root fields are migrated once into first-party plugin slices during parse/canonicalization.
- Removed `legacyProject` from Plugin Kernel runtime restoration and from Resonance, TER and Pulse project-slice restore paths. Missing slices now mean reset/fresh state; runtime code never consumes an old project root.
- Removed compatibility/full-host TOP mode. TOP windows are dedicated plugin renderers only, with plugin-slice + Artifact-delta synchronization for project persistence.
- Removed dead host domain adapters and cross-plugin private-state coupling. Resonance Gate owns the TER parameters it requires through the public algorithm contract; TER no longer consumes Resonance scan-visibility state.
- Added v3.58 Host Neutralization regressions that enforce a generic project root, dedicated-only TOP lifecycle, plugin-owned domain state and absence of scientific domain concepts from the main host.
- Preserved v3.57 standalone SDK compatibility; this release does not add a new scientific algorithm or change numerical definitions.

# v3.57.0 — Standalone Plugin SDK & Host-Independent Plugin Runtime

- Added a standalone `sdk/` that can be distributed without the DK Data Studio source tree. It contains Plugin API 1.8 declarations, the manifest schema, an independent validator/packager and workspace/algorithm templates.
- Added an SDK conformance gate that copies the SDK outside the repository, validates/packages both templates there, then feeds the resulting `.dkplugin` files into the application's real package normalizer.
- Removed host-provided Resonance/TER/Pulse domain services from `DKDSPlugins.configure(...)`. First-party analysis plugins now use their own runtime in SUPER and plugin-owned namespaced services in dedicated TOP renderers.
- Updated the external detector example and package documentation from the obsolete API 1.2 sample to Plugin API 1.8.
- Extended the manifest schema with explicit `scripts` and `styles` contracts.
- Kept backward project migration code for now, but marked the remaining `app.js` domain-state/project-root compatibility layer as the next architecture debt rather than expanding security or permission infrastructure.

# v3.56.0 — Shared Scientific Scalar Fields & Resonance Feature Maps

- Upgraded `DKDSScientificPlot` to v2.2.0 with the shared `scalarField()` surface. Core now owns heatmap axes/units, colorbar metadata, diverging `zmid`, hover defaults, viewport/export behavior and renderer lifecycle; plugins provide typed scalar-field data instead of managing Plotly heatmap lifecycle themselves.
- Migrated the TER primary heatmap and selectable transport-transform heatmap to the shared Scientific Scalar Field surface without changing TER/transform numerical definitions or interaction semantics.
- Added canonical `resonance.feature-field` as a `science.scalar-field` subtype and extended the Resonance `gate-analysis` Pipeline to publish a second typed matrix Artifact alongside the existing gate-analysis result.
- Resonance gate analysis now provides an all-accepted-peak cross-curve feature map over Vg × peak-family/scan-direction with selectable peak position, FWHM, amplitude, Prominence, area, local baseline and |Ipk/Ibg| metrics; forward/reverse/all direction filters are supported.
- Feature-map cells retain their originating peak IDs. Clicking a populated cell publishes the real `resonance.peak` Selection and opens the existing Inspector instead of creating a heatmap-only pseudo-selection.
- Cross-curve feature computation is data-first and can derive peak-family series directly from visible accepted peaks when no UI controller is attached, so Pipeline/headless execution does not depend on page state.
- Added feature-field CSV export and a transient typed matrix Artifact with peak-set lineage plus the exact peak-metrics algorithm reference used to derive FWHM/baseline/amplitude/area values.
- Automation Runner 1.11.0 adds `Scientific Scalar Field & resonance feature field`; development Electron now contains 30 cases.
- Peak/FWHM, Transport/TER Algorithm Provider versions remain unchanged because this release does not change their numerical definitions.

# v3.55.0 — Algorithm Package Catalog, Compatibility & Recovery

- Added Algorithm Package Catalog 1.0.0. Provider manifests can publish exact `algorithmProvides` entries (`category + id + version`) so missing project-locked algorithms can be located without executing unknown plugin code.
- Added package compatibility contracts: `compatibility.app`, `compatibility.pluginApi`, and `pluginDependencies` version ranges. The same evaluator is used by Catalog lookup, local install/update, LAN update, installed external/override loading, and history rollback.
- Added `ctx.analysis.algorithms.locate()` and `recover()`. Recovery reloads/enables a compatible current Provider or rolls an external Provider package back to a compatible archived package, then verifies the exact requested algorithm version was actually restored.
- TER and Resonance now keep missing exact algorithm locks visible and provide explicit locate/recover controls. They never silently replace a missing locked algorithm with a newer default.
- Built-in Standard Resonance Algorithms package is v2.2.0 and Standard Transport Algorithms package is v1.1.0 to publish catalog/compatibility metadata; their scientific algorithm versions remain 1.0.0 because numerical definitions did not change.
- Plugin Manager Provider details expose the offline algorithm-package index and declared compatibility ranges.
- Automation Runner 1.10.0 adds `Algorithm Package Catalog & compatibility`; the development Electron suite now contains 29 cases.
- Scientific numerical definitions, Lazy Plotly scheduling, TOP provider routing and project data formats are unchanged.

# v3.54.0 — Algorithm Version Management & Provider Rollback

- Upgraded Scientific Algorithm Runtime to v1.1.0 with explicit `versions()`, persisted new-analysis version preferences, `lock()` for exact project references, and `diagnose()` for `available` / `missing-version` / `missing-algorithm` states.
- Algorithm preferences affect only versionless resolution for new analysis. Any project/result reference that already includes an algorithm version remains exact and is never silently redirected to a newer default.
- TER and Resonance peak-detector/FWHM consumers now preserve missing exact versions and surface available alternatives instead of silently switching algorithms. Legacy versionless references are resolved once and then locked.
- Plugin Manager Algorithm Provider details now expose registered algorithm families and a per-family default-version selector for new analyses.
- External `.dkplugin` updates now archive the previous package under the application plugin-history store. External plugin cards expose Version History and can roll back to an archived package; the package being replaced during rollback is archived in turn.
- Package-level history is single-active-package by plugin ID. Scientific-version coexistence remains an Algorithm Registry concern: providers may register multiple `algorithmId@version` implementations simultaneously.
- Automation Runner 1.9.0 adds a real algorithm default/lock/missing-version case. Development Electron now contains 28 cases.
- Added v3.54 tests covering Core version preferences/locks, consumer no-silent-upgrade behavior, external package history/rollback plumbing and automation-report coverage.

# v3.53.0 — Versioned Transport / Scalar-Field / TER Algorithm Providers

- Added `builtin.standard-transport-algorithms` v1.0.0 as a local, versioned Algorithm Plugin owning the concrete numerical implementations of raw/detrend/dI/dV/d²I/dV²/dln|I|/dV/dV/dI/R transforms, generic Vg–Vd scalar-field projection, and the standard TER high/low-resistance-ratio formula.
- Upgraded Scientific Transform Runtime to v1.1.0: Core still owns stable transform descriptors, semantic types and `transform.<id>` / `scalar-field.<id>` Pipeline contracts, while numerical execution resolves exact `transport-*` / `scalar-field` Algorithm Providers before using legacy Core compatibility fallbacks.
- Added category-driven local Algorithm Provider loading for dedicated TOP windows. Workbenches declare `algorithmCategories`; the host discovers matching built-in/override/external providers, merges their Core requirements and loads provider scripts before the target plugin. There are no target-plugin/provider-id whitelists.
- TER now requires `analysis.algorithms`, locks `ter.high-low-ratio@1.0.0` in project settings/provenance, exposes a versioned TER-algorithm selector, and invalidates stale TER results when the selected algorithm changes.
- Resonance gate analysis now consumes the same versioned TER provider; Resonance and TER transforms consume the same transport/scalar-field providers through the Core Transform Registry.
- Marked Standard Resonance Algorithms v2.1.0 as a locally executable provider so independent TOP renderers can run peak detector/FWHM providers without remote round-trips while preserving exact provider identity.
- Added deterministic v3.53 parity tests proving all seven transport transforms, generic scalar-field output and TER matrix/maxima match the previous mature scientific implementation.
- Automation Runner 1.8.0 adds real `Transport / Scalar Field / TER Algorithm Providers` and `TOP local Algorithm Provider routing` cases and exports provider provenance/routing coverage. Development Electron now contains 27 cases.
- `src/science/*` transform/TER entry points remain reference/compatibility APIs for old projects and parity tests; replaceable scientific numerical authority belongs to versioned Algorithm Plugins.

# v3.52.2 — Lazy Plotly TOP Startup

- Moved dedicated-TOP Plotly from a blocking physical script dependency to the Core Chart Runtime lazy loader while preserving `plotly` as the plugin's resolved logical dependency.
- Upgraded `DKDSCharts` to v1.2.0 with one shared `ensurePlotly()` promise, runtime state/diagnostics, contract-aware loading and lazy image-export support.
- Dedicated TOP startup profiles now include the Chart Runtime state and must show no eager `plotly` dependency before the ready signal.
- Migrated remaining Core UI `Plotly.react` / `Plotly.toImage` / Plotly resize ownership to `DKDSCharts`, so plugin/UI code does not bypass renderer lifecycle control.
- Automation Runner 1.7.2 adds a real `TOP lazy Plotly runtime contract` check and exports `coverage.performance.topLazyPlotly`. The default desktop suite now contains 25 cases.
- This patch changes renderer startup scheduling only; Scientific Pipeline, Transform Registry, Algorithm Providers, TER/FWHM definitions and scientific numerical results are unchanged.

# v3.52.1 — Selective TOP Runtime Loading & Startup Profiling

- Fixed a dedicated-TOP startup regression where v3.50+ Scientific Pipeline, Transform and Algorithm runtimes were appended to every TOP renderer even when the plugin did not declare those Core contracts. Data Center and Pulse no longer pay for unused scientific domain runtimes; TER loads Pipeline + Transform, while Resonance loads Pipeline + Transform + Algorithm through `requiresCore` derivation.
- Added renderer startup phase profiling for bootstrap, dependency scripts, plugin support/runtime/entry scripts, plugin activation, project restore and activity open. Main-process diagnostics also record BrowserWindow creation, navigation and create-to-ready time.
- Automation Runner 1.7.1 adds `TOP startup phase profiling`, validates that real renderer domain-runtime loads exactly match resolved plugin contracts, and exports per-TOP slow dependencies/phases for version-to-version diagnosis. Startup profiles are also attached to failed TOP diagnostics so first-failure timing is preserved.
- No scientific algorithm, transform, TER or FWHM definitions were changed in this patch.

# v3.52.0 — Versioned Scientific Algorithm Providers

- Added `src/core/scientific-algorithm-runtime.js`, a Core registry/resolver whose stable scientific algorithm identity is `category + algorithmId + algorithmVersion`; multiple versions can coexist and exact historical versions can be resolved and executed.
- Added Plugin API 1.8 `analysis.algorithms` and automatic dedicated-TOP `scientific-algorithm-runtime` dependency derivation. Algorithm implementations remain plugin-owned while SUPER/TOP discover and invoke the same providers.
- Algorithm Providers are also exported through Capability Runtime, allowing dedicated TOP renderers to invoke version-locked algorithms without embedding implementation scripts into every analysis window.
- Converted `builtin.resonance-detector-robust` into the `Standard Resonance Algorithms` plugin v2.0.0. Its robust multi-channel/Ricker peak detector and local-baseline FWHM/peak-metrics implementation now live in plugin-local `algorithm.js`, rather than being owned by Resonance Workbench.
- Registered `robust-ricker-v1@1.0.0` (`peak-detector`) and `baseline-fwhm-v1@1.0.0` (`peak-metrics`) with input/output semantic types, parameter schema/metadata, exact provenance and independent version identity.
- Added stable Scientific Data Pipeline bridges `peaks.detect` and `peaks.metrics`; Pipeline execution resolves the selected Algorithm Provider and records the exact provider identity in produced peak/metric metadata and PeakSet lineage.
- Resonance Workbench detector and peak-metrics/FWHM selectors now enumerate Algorithm Providers and display explicit algorithm versions. Legacy detector IDs are resolved to an exact compatible version on first use instead of silently following future defaults.
- Retained `ctx.analysis.detectors` and `DKDSScience` peak entry points as migration/compatibility facades; new replaceable algorithms must register through `ctx.analysis.algorithms` rather than being hard-coded into Core or a Workbench plugin.
- Added canonical `science.resonance.peak-set` and `science.resonance.peak-metrics` types.
- Automation Runner 1.7.0 adds Scientific Algorithm Registry/version-lock coverage, including real built-in detector/FWHM execution and multiple-version coexistence. The default desktop suite now contains 23 cases.
- Added v3.52 registry/integration tests plus deterministic migration-parity checks proving the plugin-owned detector and FWHM definitions match the prior mature implementation (excluding non-scientific generated IDs).

# v3.51.0 — Core Scientific Transform Registry and generic Scalar Fields

- Added `src/core/scientific-transform-runtime.js`, a plugin-scoped registry for reusable scientific curve transforms and scalar-field projections.
- Added Plugin API 1.8 `data.transforms` with automatic dedicated-TOP `scientific-transform-runtime` dependency derivation; plugins do not duplicate the Core module in `window.dependencies`.
- Registered canonical `raw`, `detrend`, `didv`, `d2idv2`, `dlog`, `dvdi`, and `resistance` transport transforms with semantic types, units, quantity metadata and color-divergence policy.
- Public transforms automatically expose Scientific Data Pipeline stages `transform.<id>` and `scalar-field.<id>` when scalar-field projection is supported.
- Generalized shared TER science from `computeSweepTransformMatrix` to `computeSweepScalarField` while retaining the old API as a compatibility wrapper and preserving numerical definitions.
- Migrated TER transform heatmap choices/execution to the registry and generic scalar-field Pipeline stages; d²I/dV² is now available through the same discoverable contract rather than a TER-specific branch.
- Migrated Resonance auxiliary transform choices and curve transformation to the same Core registry.
- Added canonical scalar-field data types for current, background-removed current, conductance, second derivative, log-current slope, differential resistance and resistance.
- Automation Runner 1.6.0 adds real Scientific Transform Registry/scalar-field coverage; the default desktop suite now contains 22 cases.
- Added v3.51 unit/integration tests and documentation for transform registration, Pipeline bridging and plugin ownership rules.

# v3.50.0 — Core Scientific Data Pipeline

- Added `src/core/scientific-pipeline-runtime.js` with plugin-scoped synchronous/asynchronous scientific stages, typed inputs/outputs, parameter-aware caching, provenance/lineage, Artifact publication, typed Selection projection and presentation ViewModels.
- Added the explicit Plugin API 1.8 `data.pipeline` requirement and automatic dedicated-TOP dependency derivation.
- Artifact envelopes now preserve an optional non-empty `semanticType` without changing the serialized shape of legacy untyped Artifacts.
- Migrated TER matrix and transformed scalar-field derivations to the Core pipeline while retaining the existing scientific numerical implementations.
- Migrated Resonance gate-dependent analysis to the Core pipeline and registered the canonical `resonance.gate-analysis` result type.
- Automation Runner 1.5.0 adds a real Scientific Data Pipeline smoke test; the default desktop suite now contains 21 cases.
- Added v3.50 pipeline unit/integration tests and upgraded TER live-Artifact integration to require a typed pipeline-produced matrix.

# v3.49.0 — Core renderer and UI resource lifecycle

- Adds ScientificPlot v2.1 suspend/resume so Core-managed Plotly renderers can release DOM/event resources while reusable TOP windows are hidden and rebuild with Selection, Pin and Viewport state preserved.
- Adds Core UI lifecycle propagation and ResizeScheduler suspension; hidden TOPs no longer accumulate resize work.
- Adds Performance Runtime v1.2 resource disposers and automatic per-plugin cache release on plugin deactivation.
- Extends real Electron automation from initial TOP readiness to ready -> hide -> reuse -> show lifecycle validation for every TOP.
- Automation Test runner v1.4 adds renderer/resource lifecycle coverage and disposal diagnostics; normal desktop coverage is now 20 cases.
- Keeps scientific definitions and numerical precision unchanged.

# v3.48.0 — Cache lifecycle budgets and declarative scientific stages

- Upgrades Core `DKDSPerformance` to v1.1.0 with namespace policies, LRU entry budgets, optional TTL expiry, explicit trim operations, scoped snapshots, and lifecycle-aware weak-cache resets.
- Adds the declarative `performance.stage(namespace, sourceRevision, parameterKey, compute)` contract so plugins describe scientific cache identity while Core owns storage and eviction mechanics.
- Extends plugin `ctx.performance` with namespaced stage/configure/trim/snapshot APIs; plugins remain isolated from global cache state.
- Migrates TER dataset adaptation, sweep reconstruction, and transformed-matrix caching from plugin-private Maps to shared Core stages without changing TER numerical definitions.
- Migrates Resonance gate-analysis caching to the same shared stage contract while preserving existing render revision keys.
- Dedicated reusable TOP renderers now shrink bounded value caches and reset weak scientific caches when hidden; final close clears renderer-local caches.
- Automation Test runner 1.3.0 adds cache-policy/lifecycle validation and same-run working-set/private-memory/process-count trends instead of comparing unrelated process snapshots.
- Adds v3.48 budget/lifecycle architecture tests while preserving v3.47 cache regressions, TER Python parity, scientific-engine parity, Plugin Boundary, and SUPER/TOP lifecycle coverage.

# v3.47.0 — Observable scientific caching and render de-duplication

- Adds Core `DKDSPerformance`, a bounded observable memoization/measurement runtime shared by the main renderer and dedicated TOP renderers.
- Adds Artifact Store global/per-kind revisions so source-data caches invalidate on relevant Artifact changes instead of every derived publication.
- Memoizes repeated `transformSweep` work by sweep identity and transform parameters without changing the shared science implementation or numerical definitions.
- Caches TER Artifact conversion, sweep reconstruction and transformed Vg–Vd matrix computation; parameter/source revisions invalidate the appropriate layer.
- Caches Resonance gate-analysis computation against source-table revisions, accepted peaks and gate/TER settings.
- Adds ScientificPlot render revision keys and de-duplicates identical `Plotly.react`, Selection focus restyle and tooltip relayout work.
- Suppresses hidden-document resize animation frames until the window is visible again.
- Extends the built-in Automation Test runner to 1.2.0 with cache/render-dedupe smoke tests, Performance Runtime metrics and TOP ready-time aggregates.
- Adds v3.47 performance cache/integration regressions while preserving TER Python parity, scientific-engine parity and plugin boundaries.

# v3.46.1 — Pulse TOP renderer hotfix and strict TOP readiness coverage

- Fixed Pulse TOP startup on an empty project after the header actions migrated to Core ActionGroup and the legacy `#pulseAnalyzeCurrentBtn` DOM id disappeared.
- Dedicated TOP startup now surfaces the target plugin activation error instead of masking it as a missing workspace.
- Automation TOP coverage now distinguishes discovered, exercised and successfully-ready renderers and fails coverage when any TOP fails.
- Added a Pulse empty-state dedicated-renderer regression test.

# v3.46.0 — ScientificPlot shared interaction controllers and real TOP automation coverage

- Promoted Plotly ScientificPlot to a shared controller surface for Selection, Legend, Tooltip, Focus, Pin, Viewport, and Export.
- Kept existing `ctx.ui.scientificPlot.react/attach/saveImage` APIs compatible while making the common interaction lifecycle automatic for migrated analysis plugins.
- Preserved viewport state across ScientificPlot rerenders and exposed explicit viewport/pin/controller APIs through the plugin UI scope.
- Unified tooltip enforcement for both freshly rendered and attached Plotly graphs.
- Fixed the built-in Automation Test Center bug that silently skipped every TOP renderer when no TOP window was already open. TOP discovery now follows the enabled/active TOP workspace contract instead of `hasWindow`.
- Added explicit TOP coverage results and report metadata; the default desktop configuration now exercises Data Center, Pulse, Resonance, and TER through real independent Electron renderers.
- Added packaged-build identity reporting so development Electron runs are clearly distinguished from installer/portable validation.
- Extended TOP diagnostic records with renderer process id, resolved dependencies, runtime scripts, and persistence mode.
- Added v3.46 regression tests for ScientificPlot controllers, analysis-plugin adoption, Automation Test TOP coverage, event de-duplication, pin state, viewport state, and export delegation.

# v3.45.0 — Canonical scientific data contracts and built-in automation test center

- Upgrades the Core Data Type Registry from plugin-local labels to canonical scientific semantics for raw/background-removed I–V, derivatives, dI/dV, d²I/dV², dln|I|/dV, dV/dI, resistance, resonance peaks/FWHM and TER values/matrices.
- Adds parent-type compatibility, aliases, lineage queries, metadata, validation and inheritance-cycle detection so plugins can exchange typed scientific objects without knowing each other's private IDs.
- Extends the shared Interaction Runtime with typed Selection acceptance/import and cross-plugin selection observation through canonical parent types.
- Maps Resonance and TER private selection/data types onto the canonical scientific taxonomy while preserving their plugin-specific identities and project compatibility.
- Adds Software Management → Automation Test, a built-runtime acceptance center that checks Core globals, plugin activation, scientific data/Selection contracts, Artifact lineage, project serialization, science transforms and a real Plotly render.
- On desktop, the test center launches every enabled TOP activity in an isolated blank project using the real Electron independent-renderer path, waits for ready/failed, records crash/startup reasons, then destroys the diagnostic window.
- Automation reports are saved as structured JSON under the application diagnostics directory and deliberately exclude active project contents, imported experimental values and dataset file paths.
- Adds source regressions for the canonical Data Type / Selection contract and for the automation-test-center architecture.

# v3.44.0 — Transactional SUPER/TOP host-role switching

- Made TOP → SUPER promotion an explicit host transaction instead of relying on delayed prewarm cleanup.
- Added a final auxiliary role-transition snapshot handshake before retiring a promoted TOP renderer.
- Main renderer now merges the returned project/plugin/artifact state before embedding the new SUPER.
- Suppressed duplicate unload snapshots after a successful role snapshot to prevent late stale-state rollback.
- Added activation rollback: a failing SUPER restores the previous SUPER and leaves the persisted preference unchanged.
- Added renderer-crash invalidation so a crashed TOP is removed from the reuse cache and rebuilt on reopen.
- Extended SUPER/TOP and dedicated-window regression tests for transition barriers, rollback, snapshot handoff, and crash recovery.

# v3.43.0 — Host-invariant TOP lifecycle hardening

- Fixed Resonance Workbench failing to open after it is demoted from SUPER to TOP.
- Made `requiresCore` the canonical source for dedicated-window Core infrastructure dependencies; `parameters`, `data.model`, `data.formula`, `workflow`, and `state` now derive their required renderer modules automatically.
- Added explicit dedicated-window startup failure reporting. User-requested failed TOP windows are surfaced instead of remaining invisible behind `show:false`, and the owner window receives a status error.
- Added regression coverage for SUPER/TOP host transitions and the Resonance parameter-schema dependency path.

# v3.42.0 — Unified Entity, ScientificPlot and Artifact lineage runtime

- Adds the Core Entity Runtime as the canonical identity/state graph for scientific objects across charts, legends, data lists, inspectors and derived analysis views. Entities have stable IDs, parent/child relations and distinct `visible / focused / selected / locked / hidden / disabled` semantics.
- Projects shared Interaction Runtime selections into the Entity graph, including parent projection such as Peak → Sweep → Dataset, while keeping focus independent from scientific visibility.
- Adds the Core ScientificPlot Runtime for Plotly and extends Core ScientificCurveSurface for D3/SVG entity-aware interaction. Plugins declare trace/point/curve/marker Entity IDs; Core owns Plotly listeners, focus emphasis/dimming, lifecycle, resize, purge and image export.
- Upgrades the Core Artifact/Data Model to v2 with lineage (`parents`, role, producer, operation, parameters), relation queries, batched publication and semantic deduplication. Adds standard Transform and Matrix artifact factories.
- Automatically projects live Artifacts into the Entity graph and preserves plugin-enriched domain entity types across Artifact refreshes and plugin deactivation/reactivation.
- Migrates Resonance, TER, Pulse and Data Center away from remaining plugin-private Plotly selection/lifecycle or list-focus plumbing. Resonance publishes Dataset/Sweep/PeakSet relationships; TER publishes Raw → TER/Transform Matrix → Maxima lineage.
- Formalizes `data.entities` as a backward-compatible Plugin API v1.8 Core requirement. Plugin API stays `1.8.0`; existing v1.8 plugins remain loadable while new plugins can opt into Entity/ScientificPlot/lineage surfaces.
- Strengthens first-party plugin boundary checks to reject private `plotly_click` listeners, private focus `scrollIntoView`, legacy `ctx.ui.charts` bypasses and other infrastructure ownership leaks.
- Adds executable v3.42 Entity/ScientificPlot regression suites and a real legacy-project regression covering 21 datasets, 42 sweeps, 93 saved peaks, 4,200 TER cells, six transforms, project save/reopen and Artifact/Entity lineage parity.

# v3.41.6 — Linked-view reveal, unified tooltips, FWHM science and transformed TER heatmap

- Makes Core linked-selection reveal remount-safe: rebuilt legends/lists automatically reveal the still-focused entity, and horizontal views reveal by local scrolling without moving the outer page.
- Simplifies Core focused-row styling to a uniform light-blue highlight without the previous left accent strip.
- Centralizes Plotly and custom D3/SVG tooltip visuals in Core with one slightly translucent neutral-dark theme; plugins supply content only.
- Absorbs the supplied GRS v3.17.2 FWHM model into shared Science Runtime: local constant/linear baseline selection, interpolated half-height crossings and analysis-window semantics replace draggable endpoints as the FWHM definition.
- Extends Core `ScientificCurveSurface` with a generic analysis-window/baseline/FWHM-crossing presentation so scientific plugins do not implement private measurement handles.
- Absorbs the supplied selectable Vg–Vd transformed heatmap into shared TER science and the TER plugin using Core Parameter Schema, Chart Runtime, PlotView, linked selection and project state.
- Expands the TER dashboard to seven charts with a 3×3 default layout while preserving existing TER definitions and Python-reference parity.
- Adds regression coverage for rebuilt linked views, Core tooltip theming, tilted-baseline FWHM and forward/reverse transformed matrices.

# v3.41.5 — Core linked-selection views and wheel-driven legend navigation

- Adds Core `SelectionViewBinding` to project one Interaction Runtime focus/selection document into legends, data lists and other semantic views without plugin-local selected-state styling.
- Adds Core `HorizontalWheelScroller`: overflowing horizontal strips can hide scrollbar chrome and translate an ordinary mouse wheel into horizontal scrolling while the pointer is over the strip.
- Restores Resonance linked focus semantics without reintroducing the v3.41.4 visibility bug: all visible forward/reverse sweeps remain plotted, while one focused sweep is emphasized and the corresponding legend/data-list representation follows it.
- Resonance legend and data list now register dataset projections with the shared Interaction Runtime. Selecting a curve, peak, legend item or dataset row updates the same focus document; the legend dims non-focused entries and the data list automatically reveals and marks the focused dataset in Core accent blue.
- Removes Resonance-private legend/list selection CSS. Focus, selected, dimmed, reveal and horizontal-scroll behavior are now platform-owned defaults.
- Advances the GRS Plugin Workspace design-system contract to 1.5 with `linkedSelectionViews` and `horizontalWheelStrips` capabilities.

# v3.41.4 — Visible-series group projection and Core selection polish

- Makes checkbox/radio selected state use the Core accent blue by default across the application and plugin windows.
- Fixes Resonance group/trend projection so every visible accepted forward/reverse peak family is included; the focused sweep/peak no longer acts as an accidental direction filter.
- Separates Resonance legend visibility from interaction focus: visible datasets are no longer dimmed simply because one sweep is focused.
- Formats legend Vg values without meaningless trailing zeros while retaining meaningful decimal precision.
- Adds the Core `dkds-scroll-x-compact` utility for light horizontal legend/tab scrolling and removes bulky native scrollbar arrow buttons.
- Adds regressions proving that a focused forward sweep cannot suppress visible reverse trend series.

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
