# v3.67.10 — R7H Runtime / Visual Recovery WIP

- Clean the development root: retire duplicated R7F/R7G transient handoff/status files; one current handoff now owns continuation state. Architecture/freeze documents remain because they are still referenced design history, not transient runtime notes.
- Fix stale SUPER preference recovery in the Core plugin kernel. A saved TOP id that is missing, disabled, or no longer contract-ready now migrates to the current valid default SUPER instead of intentionally leaving the Desktop in an empty PRIMARY/PRIME shell. Valid persisted SUPER choices still win.
- Correct dark disabled ToolbarAction contrast by removing Core's second `opacity:.56` attenuation on top of Theme `disabledText`; Theme providers still own the disabled color.
- Restrict integrated-child flattening to containers that actually own a shared command silhouette. Generic `grouped` context remains semantic/layout metadata and no longer implies that status/activity controls must lose their own border/depth.
- R7 Theme/Semantic startup deduplication and Split/GroupPlot preview→single-commit performance work remain in place. Code-side validation: `npm test` 226/226 PASS, `npm run check` 234/234 PASS, Hard Visual Invariants 61/61, 44 authored CSS / 0 `!important`. Windows Electron visual/performance acceptance remains open.

# v3.67.10 — Desktop Visual Closure · Theme Provider Recovery WIP

- **R5 Theme + Performance Recovery:** R4 Windows screenshots remained visually flatter than the accepted older themes and the user reported significant interaction lag, so visual acceptance stays reopened. Core Theme observers now ignore D3/SVG class churn, Material Context writes are idempotent, Material/Component assignment roots are batched/collapsed, and Automation Runner **1.32.0** adds `ui.theme-runtime-performance` to fail on idle recomposition churn.
- Restore provider expression through Theme Contract 3.10 rather than selector paint: Thin Glass **1.12.1** regains distinct contextual control/group states; Aurora Pop **2.3.1** restores stronger violet/lavender/emerald identity. Material Renderer now consumes bounded provider effects including header gradient, ambient tint, accent glow and edge glow, with normalized glow intensity projected as valid CSS percentages.
- R5 code-side gates: `npm test` **225/225**, `npm run check` **233/233**, Mobile **12/12**, Hard Visual Invariants **49/49**, SDK Harness / Scientific parity / D3 Renderer / Plugin Manager PASS, 44 authored CSS files / 0 `!important`. **Windows R5 screenshots and subjective interaction-speed acceptance are still required; this is not a Final Freeze.**

- **Release reopened after Windows screenshot review.** The R2 Automation 1.29 result (47 PASS / 0 FAIL) proved Core Material ownership was machine-correct, but did not catch visually excessive Theme Provider composition. The previous Final Freeze audit is retained only as historical evidence and is explicitly superseded until R3 visual acceptance.
- Recover bundled Theme Providers without reopening Platform Presentation Architecture: Thin Glass **1.11.0** keeps Plugin API 1.19 while restoring the accepted 1.9 optical rhythm and dropping private ToolbarGroup/ToolbarAction palettes; Aurora Pop **2.2.4** keeps its violet/emerald identity while flattening non-primary group/selected command paint.
- Represent Presenter panel visibility commands as soft `active` toggles rather than `selected` navigation, suppress per-action shadow/halo inside integrated topbar groups, and classify the near-fullscreen Import Workbench as a clear modal Surface rather than a giant elevated glass panel.
- Advance Windows diagnostics to Automation Runner **1.30.0** and make the R3 verifier require measured Presenter command geometry and integrated topbar depth ownership. R2 1.29 reports can no longer authorize this recovery. Current source gates: `npm test` **224/224**, `npm run check` **232/232**, Mobile **12/12**, Hard Visual Invariants **43/43**, SDK/Scientific/D3/Plugin Manager PASS, 44 authored CSS files / 0 `!important`. Windows R3 screenshot acceptance is still required before final tagging.
- Complete the post-v3.67.9 Desktop visual-ownership closure without reopening the frozen platform-neutral Presentation Contract. Structure owns geometry, Component Appearance owns canonical controls, and Material Renderer owns semantic Surface/Chrome paint; Presentation no longer carries fallback card, toolbar, dialog, plugin-manager, import, LAN, scientific or shell palettes that duplicate those owners.
- Close the remaining Material/component overlap found by Windows Electron acceptance. A toolbar group that is itself a semantic Material owner now contributes component tokens without directly repainting background/border/shadow, preventing the Resonance Main Plot Tools Thin Glass surface from being overwritten by theme component paint.
- Make nested page/chart headers explicitly parent-owned Material chrome and make Theme Coverage fail closed on real optical failures: opaque self repaint, large unmanaged opaque child coverage, broken Material, renderer failure, appearance failure or low-contrast controls. Opaque ancestors remain diagnostic context only.
- Extend the hard visual gate to **38 invariants**, including parent-owned header semantics, floating-toolbar Material composition, canonical button geometry, exact 2 px selection halo, transparent inspector dock host, non-portable Theme picker and single-owner Surface/Component paint.
- Add Automation Runner **1.29.0** visual geometry checks and a fail-closed Windows Visual Closure release verifier. The explicit `npm run visual:closure:windows` path runs the full check suite, Electron diagnostics, JSON report generation and report verification with deterministic process exit.
- Fix the Windows-only Core/plugin ownership test path comparison so the canonical Project Format compatibility gateway is evaluated identically on POSIX and Windows. External incompatible overrides remain errors unless a healthy bundled plugin with the same ID is demonstrably active, in which case diagnostics preserve a fallback warning instead of masking the bundled release.
- Windows Electron 43.4.0 R2 acceptance: **47 PASS / 0 FAIL / 1 expected development-mode SKIP**. `ui.hard-visual-invariants`, `ui.visual-geometry-closure`, `ui.theme-material-renderer`, `ui.theme-coverage` and `plugins.external-packages` all PASS; Theme Coverage reports `brokenMaterial=0`, `occludedMaterial=0`, `rendererOk=true`, `appearanceOk=true`, `lowContrastControls=0`, with light/dark contrast checks clean. The sole SKIP is packaged-build identity because the acceptance run used source/development Electron rather than NSIS/portable resources.
- Final source freeze validation: `npm test` **223/223 PASS**, `npm run check` **231/231 PASS**, Mobile **12/12 PASS**, Hard Visual Invariants **38/38 PASS**, SDK Harness PASS, Scientific parity PASS, D3 single-backend PASS, Plugin Manager PASS, 17/17 plugin manifests/packages, and 44 authored CSS files / 0 `!important`. The formal audit is `docs/VISUAL_CLOSURE_FINAL_FREEZE_AUDIT_3.67.10.md`. No Desktop/Mobile split Plugin API, page-level mobile fallback, new scientific capability or domain-specific Core visual selector is introduced.

# v3.67.9 — Desktop Visual Acceptance Closure

- Correct the v3.67.8 workspace regression against the established Resonance layout: the left Data List rail persists through the bottom row, while Group Plot starts after that rail and spans the scientific center through the far-right inspector column. The v3.67.8 regression assertion that encoded a full-width-under-data-list bottom surface is replaced rather than patched around.
- Put both scientific floating navigation implementations on one runtime contract. Generic ChartRuntime and ScientificCurve now share the same `dkds-integrated-action-group` / floating Material role and the same quiet `ToolbarAction` semantics, so one theme cannot render two different plot toolbars. Hover hit regions are softly rounded and borderless.
- Make Portable/header chrome quiet by construction: injected placement, collapse and close controls plus header ActionGroup commands consume the same quiet component variant, 24 px hit height, 8 px radius and 9 px horizontal breathing room.
- Fix the main plot command/legend geometry mathematically rather than optically: both outer shells are 34 px border-boxes with equal 3 px insets around 26 px controls. The stale 40 px legend minimum that overrode the intended height is removed.
- Normalize Presenter surface commands (**参数 / 检查 / 组图**) to one 34 px centered control geometry and remove the narrower first-button padding exception.
- Define a 38 px Desktop shell visual envelope around 34 px actions. Primary activity, file-command and system-command groups all consume that envelope, while selected/primary action halo is explicitly 2 px and centered, making the outer outline and action-shadow envelope equal by construction.
- Strengthen fixed-popover semantics. The Theme picker declares both no-portable and no-portable-chrome; `PortableView` recognizes those semantics before creating chrome, pins such a surface to `home`, and CSS removes any stale portable control residue.
- Add v3.67.9 visual-acceptance regression coverage for the nine screenshot findings. Final source validation: `npm test` 219/219 PASS, `npm run check` 227/227 PASS, Mobile 12/12 PASS, SDK Harness PASS, Scientific parity PASS, 43 authored CSS files / 0 `!important`.

# v3.67.8 — Desktop Chrome Coherence

- Keep the frozen v3.67 platform-neutral Presentation Architecture unchanged and correct the remaining Desktop-only chrome regressions below it.
- Make the Theme chooser an anchored fixed popover with an explicit no-portable-chrome contract. It no longer receives the PortableView placement/location button that belongs to movable workbench surfaces.
- Extend the shared `dkds-panel-close-button` contract to PortableView, LAN/SMB/AI, Theme/Memory, settings/dialog, DevTools and legacy shell panels. Geometry, glyph sizing and neutral/danger hover treatment now come from one Core presentation rule instead of panel-specific close CSS.
- Refine header-owned actions used by Group Plot and Curve Inspector: 24 px compact hit regions, 6 px rounded hover geometry, 7 px horizontal breathing room and 2 px action spacing. Placement, row-count, collapse and close affordances therefore remain integrated with the title bar without hard rectangular hover blocks touching their labels.
- Revert the v3.67.7 Desktop grid experiment after visual validation. The bottom scientific-secondary dock again spans the complete left/center/right canvas width, so the Curve Inspector does not vertically occupy the bottom row and Group Plot can extend to the far right.
- Define one top-shell vertical rhythm: 34 px action height inside a 40 px visual envelope. File commands and the Data Management / Tools / Software Management outer groups consume the same 40 px outline height, while primary and selected actions use the same centered optical shadow depth.
- Add a v3.67.8 regression gate covering fixed Theme popover semantics, full-width bottom docking, rounded header hover geometry, shared close controls and the canonical shell height contract.

# v3.67.7 — Desktop Presentation Polish & Project Cleanup

- Keep the v3.67 platform-neutral Presentation Contract frozen while correcting Desktop presentation regressions below it. Plugin canvas dock slots are now layout-only; the docked surface itself owns Material paint, eliminating the nested background seen on inspectors and other translucent surfaces.
- Restore the established desktop hierarchy: left/right control rails span the full workspace height while the scientific bottom dock remains under the center canvas. Resonance Data List therefore no longer sits above a full-width Group Plot band.
- Add an internal `PortableView` chrome switch for fixed Desktop rails. Resonance **参数** is fixed to the left rail without injected placement arrows, while inspector/group portable controls remain unchanged.
- Make Presenter-generated PRIME/SUB navigation sort ahead of plugin utility actions and move Resonance **设置** to the trailing utility position. The old **数据 / 参数** host label is shortened to **参数**.
- Refine desktop command chrome: shorter/more separated section divider, compact 30 px window controls, no tall hover shadow, and centered primary/selected topbar shadow depth.
- Add one Core `dkds-panel-close-button` contract and migrate Theme, Memory, Plugin DevTools, LAN Web and AI Agent headers to it, removing their conflicting local close-button geometry.
- Clean-source packaging remains based on tracked source plus Git metadata. Generated runtime bundles and generated brand/mobile assets are ignored build products and are removed from the delivered Dev Repo after validation; Git object storage is compacted before packaging.

# v3.67.6 — Platform Presentation Final Freeze Audit

- Freeze Presentation ownership after the v3.67 migration. Core semantic surfaces now carry only identity, role, priority, collapsibility and active state; Desktop `placement / placements / defaultPlacement` no longer cross the Core Presentation Model or in-memory workspace action projection.
- Centralize Presentation role values in one Core contract module consumed by both TOP validation and the Presentation Model, removing duplicated role allow-lists.
- Make `ctx.ui.topWorkspace.register(...)` strictly semantic: SDK types no longer expose placement fields and Runtime rejects Desktop placement metadata in TOP Surface declarations. Actual docking remains on the live `PluginWorkspace` PRIME/SUB implementation.
- Remove stale `ui.prime / ui.sub` capability claims from first-party plugins and the built-in template. The already-public low-level facades remain callable for Plugin API 1.19 compatibility, but they are not a second Workspace composition path and are no longer recommended for new TOP/SUPER UI.
- Replace the stale pre-v1.19 SUPER/TOP document with the frozen `native + PRIMARY/PRIME/SUB + presentationRole` contract. No new Presentation capability, platform Plugin API branch, Mobile DOM inference or page-level CSS fallback is introduced.

# v3.67.5 — Plugin API 1.19 Presentation Cutover

- Make Plugin API **1.19.0** an exact compatibility boundary across Core activation, desktop/mobile package validation, SDK schemas and diagnostics. Plugin API 1.18 packages now fail explicitly and must be migrated instead of entering a hidden presentation fallback.
- Remove PRIMARY-left composition from the public/runtime contract. `mountPrimary()` is main-only, rejects `leftNode` / `leftHtml`, and its PRIMARY mount callback exposes only `workbench / scope / main / root`.
- Require every TOP PRIMARY/PRIME/SUB surface to declare an explicit semantic `presentationRole`. Secondary controls and inspectors must be real semantic surfaces rather than Desktop layout structure smuggled through PRIMARY.
- Delete `native-legacy-workspace.css` and remove the old `workspace.panel.toggle` / Mobile `panel` request / fallback data-parameter drawer path. Mobile presentation now comes only from Presenter `main / sheet / rail / route` projection.
- Keep a single Plugin API and shared scientific/domain implementation; no `ctx.ui.desktop` / `ctx.ui.mobile` facade is introduced.

# v3.67.4 — Platform Presentation / Legacy Consumer Audit

- Add `DKDSPresentation.audit()` and stable Presentation issue codes so incomplete TOP contracts are observable instead of inferred from screenshots or DOM. A PRIMARY that still hides a rail in `leftNode` / `leftHtml` is explicitly reported as `primary-left-composition` and cannot be misclassified as semantic-complete.
- Migrate the remaining first-party PRIMARY-left consumers: TER parameters and Transfer Vth Lab data/threshold controls are now explicit auto-open PRIME `data-control` surfaces. Their TopWorkspace contracts expose the same semantic surfaces; first-party TOP `leftNode` usage is now zero.
- Keep the 44-line legacy mobile fallback deliberately isolated for Plugin API 1.18 external compatibility. The repository cannot prove installed third-party `.dkplugin` packages no longer use the historically supported `leftNode` form, so deleting that bridge would be a public compatibility break rather than an ownership cleanup.
- Update Plugin API / SDK guidance: new cross-platform TOP rails must be semantic `data-control` surfaces; `leftNode` is compatibility-only for TOP presentation. No platform-specific Plugin API is introduced.
- Release validation: `npm test` **214/214 PASS**; `npm run check` **222/222 PASS** (continued from the same manifest after the execution-time limit); Mobile **10/10 PASS**; SDK Harness **PASS**; Scientific parity **PASS**; Plugin Boundary **0**; authored CSS **44 files / 0 `!important`**.

# v3.67.3 — Platform Presentation Architecture / Phase 4

- Replace the monolithic `mobile.css` page override sheet with an import-only platform entrypoint. React Native/WebView shell rules, Presenter-driven workspace geometry, and the explicit legacy fallback now have separate ownership modules; shared `touch.css` no longer carries a second React Native page-layout implementation.
- Add a downstream-only Mobile Web Surface Presenter. It consumes `MobilePresenter` output and projects stable workspace surface identity to `main / sheet / rail / route` DOM attributes without reading Desktop placement, dock classes, computed style, or page geometry.
- Mark AnalysisWorkbench surface hosts with stable activity/surface identity and distinguish explicitly declared presentation roles from compatibility-inferred roles. Only workspaces with a complete semantic Presentation Contract opt into Presenter-driven mobile geometry.
- Restrict mobile workspace CSS to geometry and visibility. Core Theme/Material Renderer remains the sole owner of surface background, border and shadow paint; a Phase 4 regression gate prevents platform CSS from repainting semantic or legacy Material Role surfaces.
- Keep the old PRIMARY-left/canvas dock translation only behind explicit `data-dkds-mobile-workspace-mode="legacy"` for incomplete/non-migrated workspaces. Resonance and the already-migrated first-party TOP contracts use the semantic path and no longer infer mobile presentation from Desktop placement.
- Preserve one Plugin API, one scientific renderer and one domain implementation. No `ctx.ui.desktop` / `ctx.ui.mobile`, no Resonance mobile fork, no opportunistic UI fixes. Release validation: `npm test` **213/213 PASS**, `npm run check` **221/221 PASS** (continued from the same manifest after the execution-time limit), Mobile **9/9 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, Plugin Boundary **0**, authored CSS **44 files / 0 `!important`**.

# v3.67.2 — Platform Presentation Architecture / Phase 3

- Migrate Resonance Workbench as the first complete multi-surface reference consumer of the platform-neutral Presentation Contract. Promote its data/parameter rail to a real `data-control` surface and declare scientific primary, inspector and scientific-secondary roles once in the shared Resonance contract.
- Add active-workspace surface projection to `DesktopPresenter` and let the Desktop Presentation Shell render PRIME/SUB surface navigation through the shared Interaction Intent. Resonance no longer duplicates Check/Group/Physics/Spacing/Gate host-toolbar registrations.
- Make the native Mobile shell consume Presenter `region` / `navigation` metadata. Semantic data-control/inspector surfaces map to portrait sheets or landscape rails while scientific-secondary surfaces map to routes; the legacy left-panel command remains only for unmigrated workspaces.
- Make workspace surface invocation accept stable `surfaceId` as well as the internal action id, publish workspace-presentation changes from `PluginWorkspace`, and prevent Mobile PRIME toggles from pushing stale routes after a panel closes.
- Keep one Plugin API and one Resonance implementation. Phase 3 intentionally leaves `mobile.css` cleanup to Phase 4.

# v3.67.1 — Platform Presentation Architecture / Phase 2

- Make the Desktop activity shell consume `DesktopPresenter.navigation` instead of recomputing primary/secondary/tool grouping inside Plugin Kernel. Registration, activation and dedicated-window lifecycle remain Kernel-owned; platform composition now belongs to the Desktop Presentation Shell.
- Merge live `PluginWorkspace` surfaces with `ctx.ui.topWorkspace.register(...)` declarations by stable surface identity so mounted runtime state cannot erase semantic presentation roles, priority, collapsibility or not-yet-mounted contract surfaces.
- Add platform-neutral `data-primary` and `utility-primary` roles alongside `scientific-primary`, `data-control`, `inspector` and `scientific-secondary`. Desktop and Mobile map these roles downstream without introducing `ctx.ui.desktop` / `ctx.ui.mobile`.
- Add explicit Presentation metadata to Data Center, TER, Pulse Analysis, Pulse Sampler Tool and Transfer Vth Lab, plus SDK templates/types. Resonance is intentionally left unchanged for the Phase 3 reference migration.
- Route Desktop navigation activation through the shared Interaction Intent and `DesktopMouseKeyboardAdapter`; main-shell and dedicated TOP windows reuse the same Presenter-backed renderer.
- Add a v3.67.1 architecture gate that runs without DOM state and verifies contract/runtime merging, Desktop navigation slots, auxiliary-window behavior and Mobile surface projection.

# v3.66.9 — Import / SMB / Window Chrome Closure

- Add the existing DK Data Studio JSON project format to the unified native import picker and rename the workbench action to **导入数据/项目** while retaining automatic project/data classification.
- Add a Core-owned foreground overlay tier so SMB opened from the Import Workbench renders above its parent modal instead of behind it. Connectivity Center no longer owns overlay z-index.
- Repaint SMB through Core Connectivity Presentation as one flat dialog with distinct header, sidebar, file-list, credential and footer regions. The file list returns to the primary surface instead of exposing the dim overlay as a large gray field.
- Keep disabled primary actions on a softened primary surface with a white label, restoring the intended contrast for **导入勾选文件** and other canonical primary commands.
- Restore the accepted light mint/teal active ToolbarAction treatment in Aurora Pop and advance the bundled Theme to **2.2.3**. Selected mode controls remain violet.
- Restore Resonance scan-scope controls as canonical standalone actions and use selected-mode semantics for the 2×2 **全部扫描 / 仅正扫 / 仅反扫 / 全不选** group. Resonance Workbench advances to **3.61.13**.
- Make the primary Electron window frameless and move minimize / maximize / close into the Core top bar. Window chrome is implemented as a dedicated App module plus narrow preload/main IPC, with Core-owned drag geometry.
- Connectivity Center advances to **1.2.7** and adds a v3.66.9 regression gate covering project filters, modal stacking, SMB zoning, action contrast, Resonance mode controls, Aurora active color and custom window chrome.

# v3.66.8 — Import Typography & Compact Command Composition

- Restore the Core typography scale inside the Import Workbench. Historical 8.5–10 px literals in target hints, file metadata, selection hints, column filtering and footer summaries are replaced by shared `--ui-font-size` / `--ui-font-small` tokens, so the large import surface no longer contains disproportionately tiny text.
- Make ordinary Import Workbench actions explicitly consume the Core standalone `toolbarAction` appearance. Close, cancel and file-selection actions no longer fall through to the transparent integrated-action default.
- Reintroduce the split-command interaction as a reusable Core component rather than a page patch: **导入数据** and its source caret form one primary surface, while the caret hit region is reduced to 18 px. SMB remains a provider inside the workbench.
- Compact the Data Management / Tools / Software Management command group by removing the legacy 82 px minimum width and all internal divider pseudo-elements. The three actions remain one shared group surface and size naturally to their labels.
- Add a v3.66.8 regression gate for import typography tokens, explicit action semantics, the one-piece split import command, and separator-free compact system commands.

# v3.66.7 — Import Workbench Source Placement Correction

- Correct the v3.66.6 file-command hierarchy: the top-level **导入** command now opens the shared Data Import Workbench instead of launching a file picker or exposing source providers beside the shell command. **保存 / 导出** remain the only peer file tasks in the top command group.
- Move the source-provider trigger into the Import Workbench, directly beside **导入数据**. The primary button chooses local/system files; the compact adjacent trigger hosts plugin-provided sources such as SMB. SMB is therefore a source of the import workflow, not a fourth top-level file command.
- Preserve the Import Workbench routing context when a provider such as SMB returns files. Existing scoped consumer/target selections are no longer reset merely because the source changed, so source choice does not alter the post-import workflow.
- Route provider-returned JSON through the same Core project/data classification used by local import. DKDS project payloads open as projects; ordinary files remain in the Data Import Workbench.
- Remove the legacy 72 px minimum width from the shell file-command buttons. **导入 / 保存 / 导出** now size to their two-character labels with compact horizontal padding, reducing the command-group footprint without changing the shared ToolbarGroup ownership.
- Make Ctrl/Cmd+O follow the same hierarchy as clicking **导入**: it opens the Import Workbench rather than bypassing it.
- Add a v3.66.7 regression gate protecting source placement, compact shell geometry, workbench-local provider routing and automatic project/data classification. Release validation: `npm test` **206/206 PASS**, `npm run check` **214/214 PASS**, SDK Harness **PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.66.6 — UI Integration Ownership Closure

- Flatten Connectivity Center SMB composition into one dialog surface. The outer dialog keeps its radius, while the path strip, credentials region and footer are no longer nested `Surface` / `Toolbar` / `ActionRow` cards with independent rounded outlines; muted region color and spacing now carry internal hierarchy. Connectivity Center advances to **1.2.6**.
- Fix header actions such as Pulse `分析当前` and Vth `刷新数据 / 适应视图 / 默认设置` at the Core semantic layer. Separated ActionGroups and Core page actions explicitly declare canonical `toolbarAction` identity plus `standalone` layout; Component Appearance supplies their neutral control paint. Presentation no longer maintains a second page-specific action paint path.
- Keep integrated disabled actions visually in-family. The generic native disabled surface can no longer turn Pulse `从脉冲分析移除` into an unrelated filled capsule; disabled canonical toolbar actions retain their own surface/border/shadow and express unavailability through foreground/opacity. Pulse Analysis also increases spacing between its file description and action row and advances to **2.10.8**.
- Remove duplicate surface ownership from Resonance portable PRIME views. Curve Inspector and Group Plot no longer predeclare `dkds-floating-surface` before `PortableView` assigns their semantic surface, eliminating the visible extra backing layer. Resonance Workbench advances to **3.61.12**.
- Rework file commands around user intent rather than source. The top command group is now **导入 / 保存 / 导出**. `导入` directly opens the Core auto-classifying path, which detects DKDS project JSON versus ordinary data; a compact independent source trigger exposes local/system and plugin providers such as SMB. SMB therefore remains an import source rather than a competing top-level project task. Ctrl+O follows the same auto-classification path.
- Move contextual Export into the same file-command group and preserve its active-workspace availability logic with the shortened `导出` label. Remove the old separate `读取项目` shell command and the `open-project` provider mount.
- Group **数据管理 / 工具 / 软件管理** inside one canonical system `toolbarGroup` so the existing shared outer outline belongs to the group once instead of three unrelated controls.
- Preserve the v3.66.5 Aurora Pop light emerald palette (`#08A77A` interaction fill / `#16C995` accent with white labels); this release does not re-darken or fork the Theme color axis.
- Strengthen regression coverage so flat SMB composition, canonical standalone header actions, unified file IA, automatic project/data classification, single-owner Resonance portable surfaces and grouped system commands cannot silently drift back. Release validation: `npm test` **205/205 PASS**, `npm run check` **213/213 PASS**, SDK Harness **PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.66.5 — Aurora Light Emerald Refinement

- Correct Aurora Pop light-mode secondary/active interaction color at the Theme source instead of compensating in Core. The previous `#008B97` / `#00818C` pair was a deep cyan-teal and was the main reason filled actions looked heavy in light mode.
- Replace that axis with a brighter emerald palette: the filled action state is **#08A77A**, the high-energy accent is **#16C995**, hover/border/indicator/soft surfaces derive from the same palette, and filled active/secondary actions keep white labels.
- Centralize the light interaction axis in one `LIGHT_EMERALD` Theme palette. Tabs, toolbar actions, active menu/chip states, inspector accents, field indicators and controlled edge effects consume that palette instead of repeating unrelated hard-coded cyan values. Core Component Appearance remains unchanged and remains the sole renderer.
- Leave the scientific series palette unchanged; this release changes UI interaction semantics only, not plotted-data colors. Aurora Pop advances to **2.2.2**.
- Add a v3.66.5 regression gate preventing the old deep cyan-teal action fills from returning and protecting single-palette ownership.

# v3.66.4 — UI Feedback Closure & I/O Source Choice

- Fix Core PlotView title alignment generically by resetting native heading margins inside `dkds-plot-view-title`. Pulse Analysis and any future plugin may use `h3`/`strong`/`span` titles without shifting or clipping the shared 28 px title bar. No Pulse-only positional override is added.
- Remove automatic Vth demo hydration. An empty project now opens the Vth workbench with no synthetic curve; the bundled demo remains available only through the explicit “示例” action. Source refresh and artifact changes always reflect the real assigned project data. Transfer Vth Lab advances to **3.0.5**.
- Close the remaining canonical Tab double-state path: selected/active Tabs use one Theme-authored fill/border state and no additional inset underline. Data Center Formula/Workflow/Provenance and Plugin DevTools therefore share the same Core Tab paint. Plugin DevTools also stops privately clearing Tab background/border/shadow in Presentation. Hard Visual invariant 04/07 now reject those regressions.
- Remove the LAN Web capability chips (`数据导入 / 寻峰 / TER / …`). They were non-interactive descriptive labels rather than commands and duplicated functionality already exposed by the application.
- Replace the Theme Inspector text `×` with a centered vector close glyph so its optical position no longer depends on platform font metrics.
- Lighten Aurora Pop light-mode active/secondary cyan from the reverted deep teal to **#008B97** while retaining white labels and Theme-only token ownership. Aurora Pop advances to **2.2.1**.
- Remove the separate Import/Open Project caret buttons and the decorative export chevron. `导入数据`, `读取项目` and `导出数据` now use the same single-trigger popup pattern: invoking either command first opens the standard source menu, where local/system and plugin-contributed sources such as SMB are selected. The generic menu alignment contract replaces the obsolete split-command CSS.
- Add a **SMB** item to the bottom status bar through the Connectivity plugin; clicking it opens the SMB browser directly. SMB remains plugin-owned and Core does not acquire SMB-specific logic. Connectivity Center advances to **1.2.5**.
- Add the v3.66.4 feedback regression gate covering all eight reported cases. Release-source validation: `npm test` **203/203 PASS**, `npm run check` **211/211 PASS**, SDK Harness **PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**, `git diff --check` **PASS**.

# v3.66.3 — Component State Ownership Audit

- Complete a cross-workbench audit of stateful actions, tabs and selectable menu/list rows after the v3.66.2 Aurora regression fix. Data Center, Resonance scan modes, Theme mode controls, Plugin Manager actions and Core Plugin DevTools now enter the same Component Identity → Theme token → Component Appearance pipeline instead of relying on page/context paint.
- Expand the Core Semantic Registry for shared mode groups, integrated action groups, selectable `role=option` / list / context rows, SUPER selectors and conventional `.secondary` actions. Explicit Core component identity/variant ownership is preserved through runtime hydration so generic inference cannot overwrite a declared semantic state.
- Remove remaining active/selected paint from Presentation, Material Renderer and integrated-header composition. Context may still own geometry/material integration, but canonical `toolbarAction`, `tab` and `menuItem` state color, border, foreground and state shadow have one paint owner: `theme/component-appearance.css`.
- Migrate Plugin DevTools navigation from a private `.active` visual rule to real `tablist` / `tab` / `aria-selected` semantics, closing a latent case where removal of duplicated CSS would otherwise remove its selected-state feedback.
- Repair two additional semantic drifts found by the audit: project tabs return to `selected` / `aria-selected` Tab semantics instead of the later `active` shortcut, and Plugin Manager status badges use canonical Chip `success` / `warning` / `danger` tones instead of Presentation-owned status paint. LAN address selection rows now use the shared List/MenuItem selection path while retaining only their domain-specific radio marker geometry.
- Add Hard Visual invariant 07. Release validation now rejects action/tab state paint outside Component Appearance in both Core styles and first-party plugin CSS, rejects location-specific repaint of canonical component identities, and requires the shared semantic routing used by the audited controls. No Data Center- or Aurora-page-specific CSS patch is introduced.
- Release-source validation: `npm test` **202/202 PASS**, `npm run check` **210/210 PASS**, SDK Harness **PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**, `git diff --check` **PASS**.

# v3.66.2 — Aurora Action-State Regression Fix

- Fix the regression introduced when v3.66.0 froze the older v3.65.3 visual baseline: Core once again consumes Theme-authored `active` / `selected` variants for canonical `toolbarAction` and `tab` components instead of exposing variant tokens that the CSS renderer does not actually use.
- Restore Aurora Pop light-mode filled interaction states to high-contrast white labels: active/secondary commands use teal, selected commands/tabs use violet, and primary actions remain violet. Aurora Pop advances to **2.2.0** without adding plugin CSS or page-specific selectors.
- Keep Surface Header tab groups geometrically integrated with the parent title bar, but stop flattening their selected state into bare text plus an underline. The selected tab now uses the same Core-rendered Theme component paint as every other canonical tab.
- Replace the historical regression assertion that explicitly locked Aurora to dark text on light cyan states with tests that protect real variant consumption and the white-label interaction contract. No Plugin API, SDK, or Theme Contract version change is required.

# v3.66.1 — Context-aware Export Availability

- Add a Core-owned synchronous availability contract to `ctx.ui.menus.add(...)`; menu actions are re-evaluated against current activity/project/artifact state when the menu opens and on shared context changes.
- Export registration no longer means export availability. Empty workspaces keep their export capability registered but show `当前工作区没有可导出内容` instead of stale actions that would fail.
- Migrate Data Center, Resonance, TER and Pulse export contributions to real data/result availability. No plugin-specific shell filtering is introduced.
- Upgrade SDK to **1.22.1** and app to **3.66.1**; Plugin API remains **1.18.0** and Theme Contract remains **3.9.0**.

# v3.66.0 — Visual Contract Finalization 2

- Freeze the accepted v3.65.3 global visual result (plus the later dark emphasized-action white-label readability rule) as the visual baseline while finalizing ownership instead of patching individual pages.
- Upgrade Core ComponentRuntime to 2.0 and make `action`, `actionGroup`, `tabs`, `surfaceHeader`, `field` and `hydrate` the canonical standard UI factories. The same factories are exposed through `ctx.ui.components`; SDK advances to **1.22.0** while Plugin API remains **1.18.0** and Theme Contract remains **3.9.0**.
- Add one reusable SDK/Core visual ownership audit. First-party style builds and external plugin package validation now reject plugin-owned application paint and redefinition of standard Core control/header geometry. This turns button/header consistency into a build contract rather than a screenshot-by-screenshot review task.
- Strengthen the visual audit with source-aware alias tracking: if a plugin-specific class is attached to a Core `SurfaceHeader`, action, or field, that alias is also forbidden from re-owning Core geometry. Dynamic plugin DOM is auto-hydrated by ComponentRuntime through a batched MutationObserver so identity cannot depend on page-specific manual calls.
- Move shared SurfaceHeader heading-stack geometry into Core Structure. Pulse Analysis migrates its header heading/action composition onto Core `dkds-surface-heading-stack` / `dkds-surface-actions` and advances to **2.10.6**; its plugin stylesheet no longer owns standard SurfaceHeader padding, height or title line-height.
- Remove remaining alias-level header geometry from Connectivity Center, Data Center and Resonance portable panels. Connectivity Center advances to **1.2.4**, Data Center to **1.15.1**, Resonance Workbench to **3.61.10**; Resonance portable headers now consume the Core portable/header geometry directly.
- Add Hard Visual invariant 06 and a v3.66.0 release gate: all first-party plugin styles must report zero visual-ownership violations and the public SDK validator must enforce the same rule.
- Release-source validation: `npm test` **200/200 PASS**, `npm run check` **208/208 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.65.9 — Theme Action Contrast, Header Integration & Movable Inspector

- Keep the accepted v3.65.3 global visual baseline while fixing the remaining Core ownership gaps exposed by Data Center. No Data Center-specific Theme selector or private visual mode is introduced.
- Add one Core dark-theme action readability policy: filled/active `toolbarAction` and active/selected `tab` labels render white across Theme profiles, while themes continue to own surface, border and indicator colors. This removes inconsistent dark-mode label colors between Resonance, Data Center and other first-party workbenches.
- Make Surface Header command integration wrapper-depth independent. `dkds-surface-actions -> dkds-plot-view-actions` and equivalent nested Core command groups now consume the parent header Material directly instead of drawing a second rounded capsule. Primary header actions keep their filled appearance; non-primary PlotView/header actions remain compact hit regions.
- Make selected/active tabs inside a Surface Header visually belong to the title bar: the state is expressed through the semantic indicator rather than a nested filled capsule.
- Upgrade Theme Inspector runtime to 2.2.0 with Pointer Events drag movement from its header, viewport clamping, touch-safe pointer capture and session-scoped position persistence. DevTool pause/resume/close ownership from v3.65.3 is preserved.
- Update hard visual invariants so title-bar action ownership remains valid through generic Core layout wrappers, and fix historical version gates that incorrectly rejected legitimate later patch versions.
- Release-source validation: `npm test` **199/199 PASS**, `npm run check` **207/207 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

## 3.65.7

- Recovered Core header-command geometry after the v3.65.6 edge-flattening regression: header backgrounds remain shared, while actions keep compact 26 px hit regions, spacing, rounded corners and non-wrapping labels.
- Removed negative header-padding consumption and `display: contents` command flattening so Data Center/PlotView controls no longer collapse into raw text or full-height color slabs.
- Restored restrained Aurora Pop selected-state surfaces while retaining high-contrast white-label active/primary actions; Aurora Pop is now 2.1.1.
- Preserved project-tab `selected` semantics separately from active analysis/workspace actions and added a dedicated v3.65.7 regression gate.

# v3.65.6 — Header Command Strip & Selected Tab Semantics

- Fix the v3.65.5 Data Center regression where right-side header controls still appeared as nested capsules instead of belonging to the title bar. Core now exposes an explicit `dkds-header-command-strip` that consumes the section header edge padding, stretches through the header height, and flattens nested ActionGroup / SegmentedControl shells into layout-only subgroups.
- Make PlotView actions consume the same Core Header Command Strip contract, so scientific/chart title-bar commands use one integrated edge chrome rather than a second rounded control floating inside the header.
- Correct Data Center tab state ownership: the selected Formula / Workflow / Provenance tab now uses `selected` + `aria-selected` instead of overloading `active`. Data Center advances to **1.14.2**.
- Correct project-tab state semantics across desktop and mobile host integration. The current project tab is now a standard `role=tab` + `aria-selected=true` + `selected` component, removing the v3.65.5 mixed cyan active surface + violet selected indicator regression.
- Make Theme Component Appearance actually consume variant-specific `active` / `selected` surface, text, border and indicator tokens for `tab` and `toolbarAction`, so a theme-authored state is resolved as one coherent appearance instead of mixing generic and variant slots.
- Update historical tests to validate the canonical selected-tab and Header Command Strip contracts instead of requiring legacy `.active` project tabs or nested ActionGroup class strings. Add a dedicated v3.65.6 regression gate to both `test` and `check`.
- Release-source validation: `npm test` **200/200 PASS**, `npm run check` **208/208 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.65.5 — Command Identity & Header Integration

- Remove the redundant Data Center Chart Provider selector when only one compatible provider exists. When multiple providers are registered, the choice is exposed through the shared Core ActionGroup menu in the chart header instead of a native field that visually conflicts with neighboring placement/plot commands. Automatic preview remains the render path, so the redundant manual “绘制” command is removed.
- Separate AnalysisWorkbench command semantics: the current PRIMARY/SUB workspace uses `active`, while mounted PRIME tools use `selected` + `aria-pressed`. Theme component resolution can therefore distinguish “currently active workspace” from “mounted auxiliary surface” instead of painting both as the same state.
- Replace the remaining first-party `accent-soft` page-button usage with registered Theme variants. Data Center no longer declares a private page button class, Pulse Analysis advances to **2.10.5**, and reusable colored active/selected/primary controls keep Theme-owned white foregrounds rather than plugin-authored text colors.
- Upgrade bundled Aurora Pop to **2.1.0**. Active controls use filled teal, selected/primary controls use filled violet, and both light/dark profiles use white labels with AA contrast for the canonical active/selected fills. No plugin CSS or page selector is added.
- Move Data Center Formula, Workflow and Provenance header commands onto Core ActionGroup hosts. Header command strips are edge-to-edge segments of the parent MaterialSurface rather than nested capsules, so `生成派生列`, Provider/placement and PlotView actions visually fuse with the title bar. Data Center advances to **1.14.1**.
- Keep semantically different controls structurally different: selected tabs remain tabs and primary actions remain actions, but their color/foreground/state ownership now comes from the same Theme component system.
- Add a v3.65.5 regression gate for Provider visibility, ActionGroup header ownership, AnalysisWorkbench active/selected identity, removal of first-party `accent-soft`, Aurora white-label contrast, and bundled plugin version parity.
- Release-source validation: `npm test` **199/199 PASS**, `npm run check` **207/207 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.65.4 — Data Center Core UI Contracts

- Replace the remaining Data Center-local header/action composition with reusable Core `dkds-section-header` geometry. Section titles stay single-line, explanatory copy moves to the existing Core tooltip contract, and right-edge actions use the integrated header action host instead of forming a second toolbar.
- Add Core filter/segmented/mini-action geometry primitives (`dkds-filter-stack`, `dkds-filter-row`, `dkds-bulk-action-row`, `dkds-segmented-control`, `dkds-mini-action`) and make their Theme component identity explicit. Data Center consumes these contracts rather than owning generic control chrome.
- Upgrade ParameterSchema `multiselect` / `columns` from permanently expanded native listboxes to a compact Core dropdown trigger backed by the themed ContextMenu/SelectPopup infrastructure. Multi-selection remains array-valued, supports persistent selection without closing after every choice, and keeps standard `input` / `change` events for plugin logic.
- Refine Data Center data/filter composition: increase the default data pane width, separate filtering from bulk selection actions, use standard `role=tab` / `aria-selected` semantics, and remove the persistent Shift/Ctrl instruction from the layout in favor of the Core tooltip. Data Center advances to **1.14.0**.
- Correct the generic chart preview header: keep only `通用图形预览` as the visible one-line title, move provider explanation to tooltip, and integrate Provider / draw controls at the far right of the title bar.
- Replace the project-tab Unicode plus glyph with a centered SVG mini-action and reduce the desktop outline footprint; React Native retains its larger touch-target override.
- Update historical visual-contract tests to validate the new canonical Core ownership instead of requiring the former `dkds-toolbar`, expanded multi-select, or `aria-pressed` implementation details. Add a dedicated v3.65.4 regression gate and include it in both `test` and `check`.
- Release-source validation: `npm test` **198/198 PASS**, `npm run check` **206/206 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.65.3 — Developer Overlay Ownership

- Fix the Theme Inspector / Plugin DevTools interaction regression introduced when the real-page Theme Inspector moved into DevTool. Theme Inspector no longer uses a maximum integer z-index; Plugin DevTools owns the higher developer-overlay layer.
- Add explicit Theme Inspector `pause(owner)` / `resume(owner)` lifecycle. Opening Plugin DevTools pauses the Theme Inspector HUD and its page click/pointer interception, and closing DevTools restores inspection only when it is still enabled.
- When Theme Inspector is active, reopening Plugin DevTools enters the Theme tab directly so the inspection session can be stopped without fighting the inspection overlay.
- Give Theme Inspector two direct exit paths: a themed `×` control in the HUD and `Esc` to exit the inspector. Pin/unpin remains click-owned instead of overloading Escape.
- Give Plugin DevTools three explicit close paths: header `×`, backdrop click and `Esc`. Its keyboard listener is installed only while DevTools is open.
- Add a v3.65.3 regression gate for developer-overlay stacking, Theme Inspector pause/resume, direct exit controls and DevTools close behavior.
- Release-source validation: `npm test` **197/197 PASS**, `npm run check` **205/205 PASS**, mobile source tests **5/5 PASS**, plugin manifests/packages **17/17 PASS**, authored CSS **0 `!important`**.

# v3.64.1 — Mobile Layout & Gesture Contract Restoration

- Restore the React Native shell rule accidentally broken by the v3.62 modular cleanup. `topbar`, project tabs, the desktop `#mainWorkspace`, and `#superWorkspaceDivider` are again hidden as one complete native-client rule; the dangling selector that exposed desktop chrome on Android is removed.
- Add explicit Core touch-gesture ownership through `data-dkds-touch-gesture-owner`. ScientificPlot, mobile drawer resizing, portable floating resize, SplitController and MovableSurface now reserve their pointer sequences so the global held-swipe keyboard gesture cannot steal direct manipulation.
- Preserve scientific mobile box selection and box zoom on the existing Core Pointer Events path with pointer capture. The scientific surface remains `touch-action:none`, and the default `select-region` / Ctrl `zoom-box` behavior stays renderer-owned rather than moving into plugins.
- Preserve mobile panel sizing semantics: the data/parameter drawer keeps edge-drag width resizing, docked PRIME surfaces keep title-hold resize, and floating PRIME/global surfaces keep their dedicated touch resize handle. Mobile-aware split limits remain owned by Core.
- Convert the remaining app-owned group-dock, inspector-dock and legacy floating-panel drag paths from mouse-only events to Pointer Events with pointer capture, so mouse, touch and pen share the same implementation instead of relying on synthetic mouse events.
- Make application release versioning automatic by default: `node scripts/set-version.js` or `npm run version:patch` now advances the current patch version when no explicit version is supplied. This release advances the App from **3.64.0** to **3.64.1** and the React Native package from **0.8.11** to **0.8.12** with Android `versionCode` **23**.
- Add a dedicated v3.64.1 mobile regression gate covering the native-shell CSS rule, gesture arbitration, drawer/PRIME/split/movable resizing, scientific box selection, Pointer Events migration and automatic version bump behavior.
- Release-source validation: `npm test` **191/191 PASS**, `npm run check` **199/199 PASS**, mobile source tests **4/4 PASS**, plugin manifests/packages **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, authored CSS **0 `!important`**.

# v3.64.0 — Theme Contract 3.8 / SDK 1.20 Component Appearance

- Advance the standalone SDK to **1.20.0** and Theme Contract to **3.8.0** while keeping Plugin API **1.18.0**. Theme 3.8 adds bounded Component Appearance semantics without allowing arbitrary CSS, selectors, DOM mutation, component layout, spacing, sizing, positioning or z-index control.
- Add `appearance.components` for the Core-owned semantic component set: `tab`, `toolbarAction`, `toolbarGroup`, `panelHeader`, `inspectorHeader`, `menuItem`, `chip`, `statusBar`, `floatingChrome`, and `field`. Themes may provide only the finite appearance slots `surface / surfaceHover / surfaceActive / surfaceSelected / text / textSoft / textActive / textSelected / border / borderHover / borderActive / indicator`; Core remains the sole owner of component identity and state detection.
- Add the read-only Theme Consumption Contract. `ctx.ui.theme.consumption()` exposes the Core component-slot mapping and `ctx.ui.theme.appearanceComponents()` exposes active authored overrides so Theme authors can distinguish a missing Theme value from a Core component that is not consuming the contract.
- Expand Theme Coverage to **3.0.0** with Component Appearance, interaction-state and semantic-color coverage plus `AUTHORED_BUT_UNUSED` diagnostics, while retaining Material ownership, computed control-contrast and plugin visual-boundary checks. Theme Debug now reports component/state/slot/path/resolved variable/source alongside Material-role diagnostics.
- Replace the former optical-only Theme Test surface with a bounded Design System Component Gallery covering light/dark Material roles, tabs, toolbar actions/groups, panel and inspector headers, fields, menu/context-menu items, chips, semantic info/success/warning/danger states, status bar, floating chrome, Tooltip/Popover, ScientificPlot/legend and Table samples.
- Formalize the scientific fallback palette as `scientific.mode: "fallback-only"` with machine-readable precedence: explicit user color > plugin/domain explicit color > project-saved color > Theme fallback > Core default. Themes cannot replace explicit scientific colors.
- Preserve the spatial Role Appearance contract introduced in 3.7 as a deliberately small `surface / border / text` layer. Component interaction appearance lives in `appearance.components`; Material recipes remain Core-owned optical composition (`clear / thin-glass / soft-glass / liquid-glass`). `materialTintOpacity` remains semantic **base-material fill**, not an accent tint, and Core readability floors remain authoritative.
- Preserve additive Theme compatibility. Theme 3.8 advertises supported contract capability IDs from the maintained 3.x baseline (`contract:3.6.0`, `contract:3.7.0`, `contract:3.8.0`) while rejecting future/different-major IDs. The existing third-party Aurora Pop 1.2.0 / Theme 3.7 source validates unchanged under SDK 1.20, proving that the 3.8 capability cutover does not force a source rewrite.
- Upgrade Thin Glass to **1.10.0** / Theme Contract **^3.8.0** and update the official Theme template to demonstrate Component Appearance and the 3.8 scientific precedence contract without profile-identity branches in Core.
- Close the Pulse Analysis PlotView title-bar ownership regression. Pulse Analysis advances to **2.10.4**; its scientific plot headers now contain only the main title plus the canonical Core action slot. Long explanatory subtitle text is removed from plot headers, and plugin CSS no longer owns PlotView header/action geometry.
- Update current SDK/TOP/Tool documentation to the **1.20.0 / Theme 3.8** authoring baseline while retaining historical CHANGELOG records unchanged.
- Release-source validation: `npm test` **189/189 PASS**, `npm run check` **197/197 PASS**, plugin manifests/packages **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, mobile source tests **3/3 PASS**, Core/Plugin ownership **PASS**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**, standalone Thin Glass/Theme-template SDK validation **PASS**, Aurora Pop 1.2.0 Theme 3.7 compatibility validation **PASS**.

# v3.63.1 — Dedicated Theme / UI Host & Android Asset Contract Closure

- Remove the remaining SUPER/Dedicated TOP theme asymmetry. Dedicated plugin windows now load the same effective bundled, managed-override and external Theme providers before plugin activation, so TER, Pulse, Vth, Data Center and Tool windows consume the selected Theme Profile instead of silently falling back to `builtin.default` while only light/dark appearance state continued to work.
- Make built-in dedicated TOP renderers load each plugin's declared `manifest.styles` through the same plugin style layer used by packaged `.dkplugin` windows. This restores the domain-owned Pulse/Vth/TER layouts that existed in plugin CSS but were previously skipped by the built-in dedicated-window path.
- Complete Core Popover Material coverage for the generic context/overflow menu and D3 scientific tooltip path. Context-menu rows no longer repaint an opaque control surface over the themed popover, and D3 tooltips can consume Thin Glass or any third-party Theme material in dedicated TOP windows.
- Replace the Activity-tab browser `title` tooltip with the Core declarative tooltip service (`data-dkds-tooltip`). The visible "主界面 · …" help is now rendered through the same themed tooltip surface rather than the browser/OS native tooltip. The delegated tooltip runtime is lifecycle-safe and becomes a no-op in non-DOM test hosts.
- Add the Core-owned `ctx.ui.layout.move(...)` movable-surface primitive and use it for SMB and AI/MCP dialogs. Plugins declare target/handle/bounds only; pointer capture, viewport clamping, persisted position and double-click reset remain Core responsibilities. No plugin-local drag scheduler or pointer lifecycle is introduced.
- Restore Vth's intended plugin-owned visual layout in dedicated mode and add a Core persisted vertical splitter between the scientific plot and results table so users can resize the two high-value regions without plugin-local resize code. Vth advances to **3.0.4**; Connectivity Center advances to **1.2.3**.
- Replace the stale Android APK runtime-asset path list with one shared `mobile/runtime-assets.json` consumed by both `mobile/scripts/sync-web-assets.js` and the Windows APK artifact validator. The canonical modular paths are now `core/host/mobile-host-runtime.js` and `core/host/mobile-plugin-package.js`; the previous post-build check still expected their pre-modular `core/` locations even after Gradle had produced the APK successfully.
- Add v3.63.1 regression coverage for dedicated Theme provider/style parity, Core Popover/tooltip ownership, native-tooltip removal, movable SMB dialogs, Vth plot/table resizing, and shared Android runtime-asset validation.
- Keep SDK **1.19.0**, Plugin API **1.18.0** and Theme Contract **3.7.0** unchanged. This release makes all dedicated hosts consume those existing contracts consistently; it does not add arbitrary Theme CSS/DOM access or a second plugin runtime facade.
- Release-source validation: `npm test` **188/188 PASS**, `npm run check` **196/196 PASS**, plugin manifests/packages **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, mobile source tests **3/3 PASS**, Plugin Boundary **0**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**.

# v3.63.0 — Theme Contract 3.7 / SDK 1.19 Semantic Appearance

- Advance the standalone SDK to **1.19.0** and Theme Contract to **3.7.0** while keeping Plugin API **1.18.0**. This release expands theme authoring semantics without adding a second plugin runtime facade or opening arbitrary CSS/DOM access.
- Add constrained role-specific appearance for the seven Core Material Roles (`chrome / sidebar / surface / elevated / popover / control / floating`). Themes may optionally override only `surface / border / text`; omitted values inherit the existing base appearance tokens. Core remains the sole owner of component-to-role assignment and DOM/selectors.
- Add semantic appearance tokens for `accentAlt`, `success / warning / danger / info` and soft variants, plus distinct `selection`, `active`, and `disabled` surfaces/text/borders so Core controls no longer reconstruct every state from the primary accent.
- Add optional Theme-owned `scientific.seriesPalette` as a **fallback only**. Explicit user/plugin scientific colors always win; Theme palette is used only for automatic SeriesRegistry assignment before the Core default palette.
- Make Control and Popover rendering consume their resolved role appearance, project active role/scientific snapshots to the mobile host bridge, and remove remaining dark-mode presentation paint that bypassed semantic active/disabled tokens.
- Upgrade the first-party Thin Glass Theme to **1.9.0** / Theme Contract **^3.7.0** and update the official Theme SDK template to demonstrate role appearance, semantic states, alternate accent, and scientific palette without theme-identity special cases.
- Add a Theme 3.7 regression profile with Aurora-like semantic separation but no Aurora identity in Core, proving independent Chrome/Sidebar/Elevated/Popover/Floating appearance and explicit scientific-color precedence.
- Update Automation Center Theme smoke to require the actual **3.7.0** runtime/renderer contract so real Electron validation cannot falsely reject the new release after source tests pass.
- Keep Theme settings single-target in 3.7. Multi-token derived presets remain intentionally deferred until appearance precedence is fully stabilized. Arbitrary Theme CSS, selectors and DOM mutation remain forbidden.
- Unify Theme registration-source validation between the standalone SDK CLI and in-app package ingestion. Direct `ctx.ui.theme.register(...)`, stable `ctx.ui.theme` aliases and register destructuring are recognized consistently; Thin Glass 1.9.0 and the official Theme template both pass the same SDK 1.19 validator.
- Release-source validation: `npm test` **187/187 PASS**, `npm run check` **195/195 PASS**, bundled plugin package parity **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, Core/Plugin ownership **PASS**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**, standalone Thin Glass/Theme-template SDK validation **PASS**.

# v3.62.6 — SDK Public Facade & Override Activation Safety

- Fix the external/managed-plugin activation crash reproduced by `com.dkds.tools.pulse-sampler@1.9.0`: the package targeted Plugin API 1.18 correctly but called the non-public `ctx.ui.pluginWorkspace.create(...)`; Plugin API 1.18 exposes the single canonical runtime facade `ctx.ui.workspaceSurface.create(...)`.
- Add one shared `sdk/source-contract.js` source audit and use it from both the standalone SDK validator/packager and Desktop `.dkplugin` normalization. Unknown static `ctx.ui.*` facades are rejected before persistence/activation, while known facades also enforce their corresponding `requiresCore` declaration.
- Keep the runtime contract singular. Do **not** add a `ctx.ui.pluginWorkspace` compatibility alias: `ui.workspace` is the manifest Core requirement, `ui.plugin-workspace` is a capability label, and `ctx.ui.workspaceSurface` is the executable facade. Document this distinction in the machine-readable SDK contract, type declarations, README, TOP and Tool guides.
- Give source-contract failures the explicit `PLUGIN_SOURCE_CONTRACT` install error and suppress unrelated App/Plugin-API compatibility rows in that dialog, so a bad runtime call is not misreported as an API-version mismatch.
- Make already-installed invalid managed overrides fail closed at package ingestion. They are excluded from effective override resolution, recorded as actionable local-package errors, and the immutable bundled plugin baseline loads instead of allowing a dedicated TOP window to crash during activation. Plugin Manager local-package warnings now include override-load errors.
- Extend Automation package diagnostics to include invalid managed overrides separately from plugin activation failures.
- Add a v3.62.6 regression that reproduces the exact `ctx.ui.pluginWorkspace.create` failure, proves `ctx.ui.workspaceSurface.create` passes, verifies both SDK CLI and in-app normalization reject the bad facade, and verifies an invalid on-disk Pulse Sampler override falls back to the bundled baseline.
- Keep Plugin API/SDK **1.18.0** and Theme Contract **3.6.0** unchanged; this release completes validation of the existing public contract rather than introducing a second runtime API.
- Release-source validation: `npm test` **186/186 PASS**, `npm run check` **194/194 PASS**, bundled plugin package parity **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, Core/Plugin ownership **PASS**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**.

# v3.62.5 — Semantic Surface & Managed Plugin Override Closure

- Close the remaining Theme semantic-surface ownership gap. Core workbench Sidebar slots now own the `sidebar` Material Role and therefore consume `surfaceSidebar`; direct plugin composition roots are transparent by default instead of repainting the slot with `surfaceSoft`. Plugins may request an independent MaterialSurface only explicitly.
- Remove legacy Presentation paint that could cover Sidebar MaterialSurfaces (`.left-panel`, AnalysisWorkbench sidebars, plugin canvas sidebars and sidebar-section roots). Structural CSS keeps geometry only; Theme Material Renderer is the single base-surface paint owner.
- Extend Theme Debug/Material inspection with the resolved **base token**, resolved base color and a large opaque-child occlusion probe, so `role=sidebar` can be distinguished from a child that visually covers it with another surface.
- Replace the hard `PLUGIN_BUILTIN_CONFLICT` rule with **Bundled baseline + managed override** semantics. A same-ID `.dkplugin` whose version is strictly newer than the current effective bundled plugin may be installed into the user `plugin-overrides` layer; the immutable bundled copy remains the fallback and the update activates after restart.
- Add bundled-plugin history/rollback/restore semantics for stable IDs such as `com.dkds.tools.pulse-sampler`, not only the historical `builtin.*` namespace. Removing a managed override restores the bundled baseline; when a future application ships the same or a newer bundled version, stale overrides no longer take precedence. Unknown reserved `builtin.*` IDs remain invalid.
- Make Plugin Manager distinguish **内置基线 / 本地更新 / 本地安装**, expose **恢复内置版本** for managed overrides, and stop presenting Plugin API compatibility rows as the primary explanation for ordinary version-precedence errors.
- Make all **16 bundled plugins** pass the same Plugin API 1.18 `.dkplugin` package normalization used for external SDK packages. The release validator now packages and normalizes every bundled plugin, preventing internal runtime paths from hiding stale layout/CSS practices that an exported package would reject.
- Clean the remaining first-party package-layout debt exposed by that parity gate in Data Center, Pulse Analysis, Pulse Sampler and Resonance: remove semantic-container clipping, plugin-owned TableSurface internals and host-coupled mobile selectors rather than weakening SDK validation.
- Advance only the first-party plugins whose package-owned source changed in this release: Data Center **1.13.8**, Pulse Analysis **2.10.3**, Pulse Sampler **1.4.1**, and Resonance Workbench **3.61.9**. App versioning remains independent from plugin semantic versions.
- Keep Plugin API/SDK **1.18.0** and Theme Contract **3.6.0** unchanged. This release closes Core ownership and package-lifecycle semantics without adding a compatibility bridge to Plugin API 1.17/1.15.
- Release-source validation: `npm test` **185/185 PASS**, `npm run check` **193/193 PASS**, bundled plugin package parity **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**.

# v3.62.4 — Plot Header Runtime Composition

- Fix the remaining PlotView title/action vertical-offset regression at the actual runtime composition boundary. `PortableView` previously added the generic `dkds-surface-header` class to an already-specialized `dkds-plot-view-head`; the generic header contributes 7 px vertical padding and therefore re-entered the compact 28 px plot-header geometry after PlotView had already centered its content.
- Make `PlotView` normalize any pre-existing generic SurfaceHeader class away, and make `PortableView` preserve specialized PlotView/GroupPlot header contracts instead of re-applying generic panel-header geometry.
- Remove the redundant `dkds-surface-header` class from Resonance group cards. Plot headers remain Theme Material chrome through their dedicated Core selectors, so this does not reduce theme coverage.
- Update the v3.62.2/v3.62.3 ownership gates and add a v3.62.4 runtime-composition regression so historical tests cannot reintroduce the conflicting class combination.
- Keep Plugin API/SDK **1.18.0** and Theme Contract **3.6.0** unchanged; this is an App/Core bug fix, not a plugin-contract change.

# v3.62.3 — Scientific Focus & Plot Header Ownership

- Remove the remaining dual ownership of ScientificPlot focus styling. ScientificCurve renderer now exclusively owns selected/unselected curve and marker opacity/width; presentation CSS no longer overrides `.is-focused` / `.is-dimmed` renderer state in dark mode.
- Increase dark-mode selection separation without changing domain semantics: the active curve/peak remains fully visible while inactive curves are reduced to about **5.5%** opacity and markers on other curves to about **4.5%**. Resonance only supplies the generic selected sweep/peak IDs; Core owns the paint.
- Remove the remaining Resonance-specific GroupPlot header geometry. Resonance group cards now consume the canonical Core `dkds-plot-view-head/title/actions` contract directly, so title text and portable actions share one Core-owned vertical/horizontal alignment model.
- Correct the regression tests that had been preserving both old problems: v3.61.109 no longer requires the obsolete dark `.is-dimmed { opacity: .42 }` override, and v3.62.2 no longer requires Resonance to own `.reswin-group-head` geometry.
- Add a dedicated v3.62.3 ownership gate covering ScientificCurve focus opacity, Resonance selection-ID mapping, canonical PlotView/GroupPlot header DOM, and absence of plugin-specific header geometry overrides.
- Keep App **3.62.3**, Plugin API/SDK **1.18.0** and Theme Contract **3.6.0** as separate release boundaries; no plugin semantic version is coupled to this App patch.
- Release-source validation: `npm test` **183/183 PASS**, `npm run check` **191/191 PASS**, plugin manifests **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, authored CSS **0 `!important`**.

# v3.62.2 — Scientific View & Plugin Layout Closure

- Make ScientificPlot selection legible without restoring the removed double-rim treatment: selected markers receive a Core-owned halo and unselected markers are gently de-emphasized only while a marker selection exists.
- Correct ScientificPlot logarithmic Y viewport behavior. Log autorange now reserves adaptive decade-space headroom, linear/log switching invalidates stale Y viewport bounds, and toolbar/wheel zoom calculations operate in log space so Y zoom remains effective instead of pinning to the original range.
- Re-center Resonance GroupPlot title/action chrome with one fixed-height grid row so title text and portable controls share the same geometric center.
- Consolidate primary action paint into the Theme Contract. Dialog and connectivity surfaces no longer repaint primary buttons independently; split-primary controls consume the same semantic border, fill, focus and depth treatment in light and dark modes. Thin Glass dark accent changes to `#2F63DB`, raising white-text contrast from the Windows report's 4.1:1 to about 5.35:1.
- Reaffirm PluginWorkspace as a lifecycle/composition contract rather than a Resonance-shaped template. `leftNode` is explicitly optional in the SDK/docs/tests; main-only PRIMARY and plugin-owned domain grids are first-class layouts.
- Restore Pulse Analysis to its domain-specific batch/file/configuration composition instead of forcing its file list into a framework sidebar. Add a persisted Core vertical splitter between result plots and the result table, with narrow/mobile layouts returning to normal document flow.
- Restore Data Center to a plugin-owned data-rail/main-content composition while keeping PRIMARY lifecycle in Core. Its data rail uses the shared persisted Core horizontal splitter rather than private drag logic.
- Add generic persisted split-handle structure/presentation ownership for plugin layouts that genuinely need user-adjustable plot/table, plot/inspector or data/main space allocation.
- Fix stale same-id first-party `.dkplugin` scanning at the main-process package boundary. Shipped first-party IDs are filtered before Plugin API normalization, so old installed Thin Glass, Pulse Sampler or Vth copies no longer create false 1.17/1.15 load warnings; genuinely external old-API packages remain rejected and no compatibility bridge is reintroduced.
- Keep App **3.62.2**, Plugin API/SDK **1.18.0** and Theme Contract **3.6.0** as separate release boundaries. Domain plugin versions advance only where their own code/visual contract changed: Data Center **1.13.7**, Pulse Analysis **2.10.2**, Resonance Workbench **3.61.8**, Thin Glass **1.8.1**.
- Release-source validation: `npm test` **182/182 PASS**, `npm run check` **190/190 PASS**, plugin manifests **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, Plugin Boundary **0**, App/Plugin Kernel SCC **0**, authored CSS **0 `!important`**.

# v3.62.1 — Runtime & Visual Ownership Closure

- Restore reliable renderer startup on the v3.62 architecture by removing the stale Application-module export and binding plugin workspaces to the canonical `ui.workspaceSurface` contract.
- Restore **Pulse Sampler Tool 1.4.0** as a first-party Plugin API 1.18 Tool (`com.dkds.tools.pulse-sampler`) with Vd/Vs/Vg waveform generation, segment composition, ScientificPlot preview and steady-state sampling workflows.
- Make packaged first-party plugins authoritative over stale user-installed packages with the same ID **before** API compatibility evaluation. Old Pulse Sampler, Thin/Liquid Glass and Vth packages therefore cannot report false external-package incompatibilities against the current host; Plugin API 1.17 compatibility is not reintroduced.
- Move Thin Glass completely out of the Core built-in profile and into the first-party Theme plugin `com.dkds.theme.liquid-glass` (**1.8.0**, Theme Contract **3.6.0**). Core retains generic Material rendering while the Theme plugin owns the profile and optical recipe policy.
- Correct Automation Center project round-trip validation to canonical **Schema v3** instead of the removed Schema v2 expectation.
- Move Resonance series/physics colors onto the Core Series Registry and semantic swatch primitives. Resonance no longer owns application palette chrome or hard-coded visual colors.
- Re-center PlotView/GroupPlot header title/action geometry, restore semantic primary/danger/neutral hierarchy in range-selection actions, and make Theme Contract the single owner of the active-selection paint. The active top-level state now uses one restrained centered halo with no extra hard 1 px rim.
- Improve dark ScientificPlot context visibility by preventing dimmed/non-focus curves from collapsing to near-invisible opacity, while keeping focus/selection semantics generic and Core-owned.
- Fix LAN Web panel stacking through the shared FloatingPanel contract: `.floating-panel` consumes `--dkds-floating-z`, while the LAN panel declares only its semantic stacking level. No higher-specificity LAN override is used.
- Refine Thin Glass optical hierarchy across popover/elevated/floating roles with restrained edge, inner-highlight and specular layers while keeping scientific content surfaces clear and avoiding heavy glow/shadow treatment.
- Separate application and plugin release ownership in `scripts/set-version.js`: an App patch release updates only App-owned version sources and never mutates Resonance, Pulse, Thin Glass, Vth or other plugin semantic versions. Add a repository-hygiene regression to prevent plugin paths from returning to the App version script.
- Establish the project-wide first engineering rule in `AGENTS.md` and `CONTRIBUTING.md`: fix the correct owner/contract, keep Core and plugin boundaries explicit, preserve single CSS ownership, and reject override layers, specificity races, compatibility bridges and silent fallbacks as fixes.
- Source/architecture validation for the release tree: `npm test` **181/181 PASS**, `npm run check` **189/189 PASS**, plugin manifests **16/16 PASS**, SDK Harness **PASS**, Scientific parity **PASS**, TER Python parity **PASS**, App/Plugin Kernel SCC **0**, Plugin Boundary **0**, authored CSS **0 `!important`**.

# v3.62.0 — Legacy-Free Cut

- Rebuild from the clean **v3.61.111** development baseline and move current project persistence to **Schema v3**: `dataModel + plugins + host` is the only canonical runtime/persistence shape.
- Replace the runtime `src/migrations/` chain with one external **Project Compatibility Gateway** under `src/project-importers/`. Historical projects are converted once at open time; Core Project Format remains domain-neutral and rejects uncanonicalized `datasets` payloads.
- Remove the persistent `state.datasets` / `project.datasets` dual path and the `syncLegacy*`, legacy-dataset adapter and legacy source lifecycle bridges. Data Center, Resonance, TER, TOP windows and Import Workbench now consume canonical Artifacts; scientific algorithms receive ephemeral transport projections from DataTable Artifacts when needed.
- Preserve the established equal-count Pulse analysis method under the explicit `equal-count` name. Historical `segmentationMode: "legacy"` values are translated only by the Compatibility Gateway. Pulse runtime source restoration is Artifact-reference-only.
- Cut Plugin API and standalone SDK to **1.18.0** and Theme Contract to **3.6.0**. First-party plugins/templates/manifests target the new contract; older plugin packages must be upgraded rather than reintroducing host compatibility branches.
- Complete the **Final Architecture Cleanup**: remove obsolete Plugin API/Theme/TOP adapters and the unused generic Workbench path; reduce App and Plugin Kernel module cycles to **0 SCCs** and remove lazy-`require()` cycle workarounds.
- Harden CSS ownership into enforceable layers: Foundation is reset-only, Structure contains **0 paint properties / 0 literal colors**, Structure and Presentation have **0 cross-file semantic selector ownership conflicts**, and late same-selector/same-property cascade rewrites are rejected by CI. The catch-all `workspace-theme-boundary.css` compatibility layer is removed.
- Keep Core and first-party plugins visually independent: Core owns shared semantic surfaces and Theme tokens, plugins own domain layout/content, Core CSS contains no plugin-identity selectors, and first-party plugin CSS contains no application paint literals or `!important`. The Vth SDK reference plugin validates with **0 layout warnings**.
- Keep the complete v3.61.111 regression inventory and migrate old fixtures to canonical semantics instead of deleting coverage. Validation: `npm test` **181/181 PASS**, `npm run check` **189/189 PASS**, SDK Harness **PASS**, TER Python parity **PASS**, scientific parity **PASS**, plugin manifests **14/14 PASS**, authored CSS **0 `!important`**.
- Fix the final renderer-startup regression found during real browser validation: remove a stale `visibleAnalysisPage` CommonJS export left behind by SUPER cleanup and bind the `ui.workspace` requirement to the canonical `ctx.ui.workspaceSurface`. Add regression guards for undeclared module exports and the canonical workspace requirement so a fully rendered-but-noninteractive shell cannot pass source tests again.

# v3.61.111 — Topbar Selection Cleanup

- Remove the historical plugin-toolbar underline pseudo-element from `platform/touch.css`; PRIME/SUB context actions such as 检查、组图、物理机制、峰间距、栅压分析与设置 no longer receive decorative bottom rules.
- Simplify the semantic selected-state shadow to one centered halo, removing the extra 1 px rim that visually stacked two selection styles on the active top-level activity button.
- Add a v3.61.111 regression gate so platform CSS cannot reintroduce plugin-toolbar underlines or a hard selection rim.

# v3.61.110 — Computed Contrast & Selection State

- Make Resonance scan-visibility commands publish a real semantic mode state (`active` + `aria-pressed`) so the currently selected visibility mode receives the same Theme-owned selected shadow as other mode controls.
- Reduce the selected Activity treatment to one centered 1 px accent rim plus a soft halo, avoiding the previous stacked-border appearance inside the shared Activity cluster.
- Remove remaining Plugin Manager light/dark hard-coded paint from presentation ownership and bind cards, summary tiles, toolbars, footer/details, empty states, controls and badges to semantic Theme tokens.
- Move final primary-button fill/foreground pairing into the Theme layer so an accent-filled primary button cannot inherit an unreadable foreground from an earlier presentation rule.
- Upgrade Theme Coverage to **2.4.0** with computed control contrast inspection for Plugin Manager controls, selected mode buttons and active Activity controls. Effective foreground/background colors are resolved from the real DOM/cascade instead of inferred only from Theme tokens.
- Automation Runner **1.28.0** now checks the active Theme Profile in both light and dark modes, restores the original mode afterward, and fails with concrete control ids/classes/colors/contrast ratios when readability falls below the gate.
- Stop Theme Coverage from double-classifying docked PortableViews as floating surfaces; the current placement/Material role remains authoritative.
- Add the v3.61.110 control-contrast/selection gate and update historical coverage-version assertions to the current semantic contract.

# v3.61.109 — Selection Semantics & Scientific Focus

- Restore the Core ScientificCurve FWHM/measurement width band while keeping width-band paint in the scientific presentation owner rather than Resonance-private CSS.
- Keep Resonance range-menu actions visually neutral, prevent peak-legend labels from wrapping internally, and strengthen dark focused-curve contrast through generic ScientificCurve focus classes.
- Introduce one centered semantic selected-mode shadow derived from the active Theme accent; Activity, Workbench, scan/preset/action and other mode controls consume the same state without offset depth.
- Keep GroupPlot legends shadow-free in every Theme Profile.
- Refine Thin Glass light/dark hierarchy with quieter divider/control edges and stronger surface-tone separation instead of bright framework lines.
- Make PortableView placement authoritative for Material role inference so a docked portable cannot remain semantically `floating` because of legacy DOM classes.
- Add the v3.61.109 selection/measurement/theme gate and relax historical visual tests that encoded obsolete exact color/shadow values rather than semantic invariants.
- Validation: `npm test` **179/179 PASS**; `npm run check` **187/187 PASS**; SDK Harness **PASS**; first-party plugin manifests **14/14 PASS**; authored CSS remains at **0 `!important`**; SDK remains **1.17.16**.

# v3.61.108 — Visual Ownership & Resize Lifecycle

- Restore Resonance range-menu semantic action styling by preventing generic command-menu paint from overriding primary/danger actions; keep the fix in shared UI semantics rather than plugin-specific button colors.
- Tighten Resonance GroupPlot geometry and make main-plot selection linkage visually explicit through the existing ScientificPlot focus controller, without adding Resonance-specific behavior to Core.
- Coalesce SplitController resize work: drag updates geometry only, plot/view ResizeObservers remain quiet during the gesture, and one resize is emitted at drag end.
- Move generic Plugin Manager desktop layout out of `platform/touch.css` into its structural owner so Theme profiles can actually control light/dark paint; platform CSS is again limited to pointer/touch adaptations.
- Rebalance the built-in Thin Glass light palette for stronger surface/text hierarchy and strengthen centered dark control shadows while preserving semantic Theme ownership.
- Reassign PortableView material roles after placement changes so docked surfaces cannot retain a stale floating role.
- Add the v3.61.108 visual/layout ownership gate and update historical Thin Glass tests to protect current readability/hierarchy invariants instead of obsolete white-surface constants.
- Validation: `npm test` **178/178 PASS**; `npm run check` **186/186 PASS**; SDK Harness **PASS**; first-party plugin manifests **14/14 PASS**; authored CSS remains at **0 `!important`**; SDK remains **1.17.16**.

# v3.61.107 — Manifest Validation Boundary

- Fix the remaining `Plugin (unknown) must declare pluginType` activation regression by moving strict plugin-type validation to the manifest ingestion boundary instead of UI/workspace consumption paths.
- Add `kernel/manifest` with separate `requirePluginType()` and non-throwing `pluginTypeOf()` responsibilities. Real plugin manifests remain strict; Shell, Workspace, Page, menu and icon rendering only consume already-validated metadata.
- Extend `DKDSPluginContract.validateManifest()` and packaged-manifest merge validation so missing/invalid `pluginType` fails immediately with the real plugin id.
- Add a v3.61.107 dynamic regression gate proving a missing type is rejected at `DKDSPlugins.define()` while a valid workbench activates normally.

# v3.61.106 — Runtime Responsibility Boundaries

- Fix a Core Plugin Host regression introduced by strict `pluginType` enforcement: Activity and menu rendering now guard ownerless/Core contributions before plugin classification, while real plugin manifests remain strictly required to declare `pluginType`.
- Fix Core Theme material-role precedence so semantic popovers remain `popover` surfaces even when mounted inside toolbar/Chrome containers; Theme Coverage no longer reports those menus as partially managed Chrome.
- Split automation responsibility reporting into Plugin Runtime, External Plugin Packages, Scientific Data Contracts foundation, Algorithm Provider, Core Scalar Field renderer, Resonance Workbench and TER Workbench checks. Plugin-owned types/Pipeline stages are no longer reported as Core failures.
- Report external `.dkplugin` conflicts independently from built-in plugin activation, so an installed package ID collision cannot be confused with a Core host/runtime failure.
- Add the v3.61.106 runtime-responsibility regression gate and update historical automation tests to protect the current owner boundaries instead of the former mixed diagnostics.
- Validation: source test suite **176/176 PASS**; release check suite **184/184 PASS**; Plugin Boundary=0; scientific Python/JS parity PASS; SDK Harness PASS; first-party plugin manifests **14/14 PASS**; authored CSS remains at 0 `!important`.

# v3.61.105 — Core / Plugin Ownership Boundary

- Move integration diagnostics out of `src/core` into `src/diagnostics`; Core no longer owns domain-aware automation diagnostics.
- Add `builtin.scientific-data-contracts` as a foundation plugin for shared transport, pulse, resonance and TER semantic data types.
- Move standard transport transform definitions from Core into `builtin.standard-transport-algorithms`; Core retains only generic transform registry/pipeline mechanics.
- Require explicit `pluginType` in runtime manifests and remove Plugin Manager hard-coded first-party display metadata.
- Neutralize Core provenance defaults and update architecture tests to protect the new ownership direction rather than historical coupling.
- Remove the legacy `Analysis` global / `src/analysis.js` facade; `DKDSScience` and `src/science/index.js` are the only current scientific entry points.

# v3.61.104 — Scientific Surface Ownership

- Consolidate `trend-card`, `analysis-chart-card`, GroupPlot card/header paint and trend legend paint into `scientific.css`; remove the previous three-stage paint chain through `control-status.css`, `shell.css` and `workspace-theme-boundary.css`.
- Make scientific card colors fully semantic in dark mode by removing hard-coded card/header aliases from `plugin-chrome.css`; the default dark palette remains equivalent while theme profiles can now supply the surface tokens without being shadowed by higher-specificity dark selectors.
- Make `floating-panel` and `floating-header` presentation paint shell-owned. Floating panel geometry remains in foundation/structure, its perimeter stays visually quiet, and header paint resolves from semantic surface tokens.
- Reduce exact duplicate selectors across the five primary presentation modules from **55 to 42**, and cross-file ownership edges from **58 to 42**.
- Extend `validate-styles.js` with scientific-surface and floating-surface ownership gates; add the v3.61.104 regression gate while retaining the earlier scientific plot and floating-panel visual contracts.
- Validation: `npm test` **174/174 PASS**; `npm run check` **182/182 PASS**; SDK Harness **PASS**; Plugin Boundary=0; scientific Python/JS parity PASS; authored CSS remains at 0 `!important`; SDK remains **1.17.16**.

# v3.61.103 — Presentation Ownership Consolidation

- Consolidate AnalysisWorkbench navigation state into `control-status.css`; `plugin-chrome.css` and `workspace-theme-boundary.css` no longer repaint `.dkds-analysis-nav-btn` after its semantic owner.
- Consolidate status-bar chrome and plugin status states into `control-status.css`, preserving the integrated borderless command cluster and removing a dead pseudo-separator rule that remained hidden by the existing `display:none` contract.
- Move generic shell hover/motion ownership out of `scientific.css` and the late workspace-theme closure into `shell.css`. Hover remains geometry-stable, flat shell controls retain their current no-shadow treatment, and selected Activity shadows retain the accepted light/dark appearance.
- Reduce exact duplicate presentation selectors across `control-status.css`, `plugin-chrome.css`, `scientific.css`, `shell.css` and `workspace-theme-boundary.css` from **91 to 55**, with cross-file ownership edges reduced to **58**.
- Extend `validate-styles.js` with presentation-owner enforcement and monotonic debt ceilings; add the v3.61.103 presentation ownership regression gate.
- Validation: `npm test` **173/173 PASS**; `npm run check` **181/181 PASS**; SDK Harness **PASS**; Plugin Boundary=0; scientific Python/JS parity PASS; authored CSS remains at 0 `!important`.

# v3.61.102 — Shell Navigation Ownership

- Move secondary Activity overflow/reflow out of `workspace-safeguards.js` and into the actual `shell-navigation.js` owner, preserving activity order, active-item priority, More-menu behavior and resize/mutation refreshes.
- Consolidate `workspace-commandbar`, `primary-activity-cluster`, `primary-activity-bar`, `activity-switcher`, `activity-bar`, `context-commandbar` and `plugin-context-toolbar` structure geometry into `shell-navigation.css`; remove the competing copies from `schema-and-plugin-ui.css` and `workspace-safeguards.css`.
- Move plugin-manager typography out of shell navigation and back to `schema-and-plugin-ui.css`, matching responsibility boundaries.
- Add style-architecture gates that reject shell-navigation geometry outside its owner and reject plugin-manager selectors inside shell navigation. Structure-layer duplicated selectors drop from **89 to 73**, and cross-file ownership edges from **100 to 78**.
- Add the v3.61.102 shell-navigation ownership regression gate and update the visual-contract test to follow the real plugin-manager style owner.

# v3.61.101 — Automation Diagnostics Modules

- Split the last oversized authored Core JavaScript module by separating Automation Test Center smoke-case implementations into `src/diagnostics/automation-smoke-cases.js` while keeping runner lifecycle, result collection, report persistence and UI binding in `automation-test-runtime.js`.
- Preserve the existing runtime behavior through one immutable `DKDSAutomationSmokeCases` contract loaded before the runner; historical automation regression tests now follow the real case owner instead of assuming every diagnostic implementation lives in one file.
- Remove the temporary 80 KiB diagnostics exception from the repository hygiene gate. **All authored JavaScript under `src/` and `desktop/` is now bounded to 48 KiB per module.**
- Add the v3.61.101 diagnostics modularization gate covering script order, ownership and the 48 KiB boundary. The runner protocol version remains unchanged because the split does not alter report semantics.

# v3.61.100 — Resonance Peak Interaction Modules

- Complete Resonance feature-context stage 2 by extracting peak detector/metric ownership into `feature-peak-runtime.js`, sweep/peak/range selection and keyboard commands into `feature-selection-runtime.js`, Inspector rendering/edit entry points into `feature-inspector-runtime.js`, ScientificCurveSurface direct manipulation/range-menu state into `feature-main-plot-runtime.js`, and dataset/visibility/transform controls into `feature-controls-runtime.js`.
- Keep all extracted responsibilities on the existing live `feature-context.js` boundary so project/workspace/runtime changes are observed dynamically rather than captured as stale initialization snapshots.
- Reduce the coordinating `feature-runtime.js` from about 104 KiB at the start of stage 2 to **48,760 bytes**, bringing it and every new Resonance feature module below the 48 KiB authored-module boundary while preserving the existing public service contract.
- Preserve legacy project peak reconciliation, FWHM/metric invalidation, Ctrl+Z/redo history, keyboard peak movement, box/range selection, linked selection, group charts, Gate/physics analysis and TOP/SUPER loading paths through delegation rather than duplicate implementations.
- Add the v3.61.100 Resonance peak-interaction architecture gate to lock module loading order, mutable-state ownership and the 48 KiB boundary.
- Validation: `npm test` 170/170 PASS; `npm run check` 178/178 PASS; Plugin Boundary=0; scientific Python/JS parity PASS; SDK Harness PASS; authored CSS remains at 0 `!important`.

# v3.61.99 — Resonance Feature Context / Analysis Modules

- Introduce an explicit Resonance `feature-context.js` with live getters so extracted feature responsibilities observe current project/workspace/runtime state instead of sharing the `createTop()` lexical closure.
- Extract group-chart ownership into `feature-group-runtime.js`, including group cards, PlotView/portable handles, group render keys, CSV export and the no-peak group state.
- Extract physics, peak-spacing and Gate analysis into `feature-analysis-runtime.js`, including their caches/results, Gate feature-field export and dynamic pipeline installation.
- Reduce `feature-runtime.js` from about 138 KiB to about 102 KiB while keeping the existing public Resonance service and legacy project/group-series behavior. Tighten its temporary large-module ceiling from 144 KiB to 108 KiB; all new extracted modules remain below 48 KiB.
- Update static architecture tests to follow the new real owners instead of requiring analysis/group implementation text to remain in the coordinator. Add the v3.61.99 feature-context regression gate to prevent extracted state from flowing back into the main closure.


# v3.61.98 — Repository Hygiene / Main-Process Modules

- Synchronize the Plugin SDK README title with the current SDK **1.17.16** contract and add a metadata consistency release gate.
- Refactor the Electron main process into importable responsibility modules for Appearance, plugin package/history/LAN update, auxiliary window lifecycle/diagnostics, packaged expiry and Agent secret/HTTP handling. `desktop/main.js` is now below the 48 KiB composition-entry boundary.
- Extract TER numerical/layout/CSV helpers into `feature-utils.js`, returning the TER feature runtime below the 48 KiB authored-module boundary without changing public plugin behavior.
- Add a repository large-module audit: new >48 KiB authored JS modules are rejected; the remaining Resonance feature context and Automation diagnostics runtime are explicitly bounded temporary exceptions.
- Define compact handoff policy: Dev Repo retains Git history after garbage collection; Source Release uses tracked-source archiving and excludes generated/dependency/build artifacts.


# v3.61.97 — Status Bar Rhythm / Theme Appearance Geometry

- Increased the bottom-right status-command rhythm from 6 px to 8 px and reserved a 14 px right safe area on the shared status bar, moving the Theme / Memory / DevTool / Web / AI cluster slightly left without giving AI a plugin-specific margin.
- Fixed the Theme panel appearance segmented control so the selected Light/Dark accent segment uses a 7 px inset radius inside the 9 px outer track, eliminating the rectangular blue block inside a rounded border.
- Added a v3.61.97 geometry regression covering status-bar right inset, inter-command spacing, outer/inner appearance radii and token-owned active accent paint.
- Validation: `npm test` 167/167 PASS; `npm run check` 175/175 PASS; SDK Harness PASS; Plugin Boundary=0; 33 authored CSS files with 0 `!important`.
- The supplied v3.61.96 desktop automation report is otherwise healthy (41 pass / 1 fail / 1 skip, no runtime errors, Resonance and Data Center live hydration pass); the remaining Theme Coverage `partial=2` diagnostic is tracked separately from this geometry-only release.

# v3.61.96 — Header Action Separation / Theme Coverage Ownership

- Fixed the remaining TER/Pulse dedicated-window header collision by changing plugin header ActionGroups from one integrated segmented capsule into separated peer controls. Each action now owns an independent Core control surface, uses an 8 px inter-button gap, and keeps its label atomic with `flex: 0 0 auto` plus `min-width: max-content`.
- Kept the header lane itself shrinkable and horizontally scrollable so a genuinely narrow window scrolls the action lane instead of compressing labels or invading the fixed `关闭窗口` control. The same Core contract is consumed by both Pulse and TER; no plugin-specific spacing patch was added.
- Tightened Theme Coverage ownership after the v3.61.95 desktop report reached 41 pass / 1 fail / 1 skip. LAN Web is now counted only as an elevated surface, Update Panel only as a floating surface, and SUPER/main workspace nodes are included in the Core surface-role assignment that coverage already expects.
- Added the v3.61.96 regression gate for separated header actions, atomic labels, close-button isolation, Pulse/TER Core reuse and non-overlapping Theme Coverage areas.
- Validation: `npm test` 166/166 PASS; `npm run check` complete coverage 174/174 PASS (1–117 main run, 118–174 continuation after the outer execution timeout); SDK Harness PASS; Plugin Boundary=0; scientific Python/JS parity PASS; 33 authored CSS files with 0 `!important`.

# v3.61.95 — Visual Rhythm / Plot Theme / Group-State Recovery

- Restored bounded, single-line analysis header action geometry so long TER actions scroll instead of overlapping the dedicated-window close action; AnalysisWorkbench navigation rows now remain horizontal instead of stacking labels such as `TER 分析` / `R–V 联动`.
- Integrated group-plot title actions directly into Core surface-header chrome from first paint, increased right-side status-bar contribution spacing to 6 px, and normalized AnalysisWorkbench input/select/textarea geometry so Thin Glass controls share one Core-owned field contract.
- Fixed Theme/Material diagnostics exposed by the v3.61.94 desktop automation report: Automation Runner initializes coverage state before Theme probes, Theme Coverage 2.3 understands delegated semantic/chrome/parent Material ownership, and ScientificPlot exposes the active Core tooltip theme without overwriting caller hover-color metadata.
- Added an explicit Resonance group empty-state when there are genuinely no accepted visible peaks, instead of rendering misleading empty Vpk/Ipk/FWHM axes. Legacy root `peaks` / `scanVisibility` migration and old-project group-series generation remain executable regression requirements; saved peaks are not fabricated for peakless projects.
- Added the v3.61.95 visual/plot/theme regression covering header/nav geometry, title-action integration, status rhythm, Thin Glass fields, Material ownership, Tooltip theme exposure, Automation coverage initialization and Resonance peakless group state.
- Automation Runner advances to 1.26.0; Theme Coverage advances to 2.3.0. Validation covers all 165 `npm test` cases and all 173 `npm run check` cases (completed in segmented runs because the outer execution window timed out), plus SDK Harness PASS, Plugin Boundary=0, scientific Python/JS parity PASS and 33 authored CSS files with 0 `!important`.

# v3.61.94 — UI Lifecycle / Visual Ownership Recovery

- Fixed UI surfaces that could appear by themselves or refuse to close, including the memory breakdown panel and dedicated-plugin error overlay. Visibility is now single-owned by a final paint-free `dkds.utility` cascade layer; all component-specific `.hidden { display:none }` patches were removed and style validation forbids them from returning.
- Restored semantic control paint ownership. The Material Renderer no longer repaints `.primary`, `.strong`, `.danger-soft`, `.accent-soft`, active/selected controls, or top-bar toolbar/activity controls as generic Material controls, fixing unreadable action text and toolbar-style drift.
- Restored resonance-workbench control geometry: scan/detection button grids no longer also claim the generic flex action-row contract, the range-selection popover is explicitly a rich control popover, and subplot actions are integrated into the subplot title chrome from first paint.
- Integrated the memory-panel close action into its surface header and increased right-side status-bar contribution spacing from 1 px to 4 px.
- Kept Data Center and Automation Test Center on their existing real runtime paths: dedicated-window error state starts hidden, Data Center hydration/window lifecycle tests pass, and the authored Automation Center `运行全部自动化测试` action remains wired to `runAll()`.
- Added the v3.61.94 UI lifecycle/visual-contract regression and tightened the style validator so visibility, semantic control paint, rich-popover behavior, resonance layout ownership, subplot chrome and automation action wiring cannot silently regress.
- Validation: `npm test` 164/164 PASS; `npm run check` complete coverage 172/172 PASS; SDK Harness PASS; Plugin Boundary=0; 33 authored CSS files with 0 `!important`.

# v3.61.93 — Workbench Hydration / Visual Contract Recovery

- Fixed the blank PRIMARY content regression where Data Center could restore 105 data objects and Resonance could restore VG groups while their main table/plot region was effectively invisible. The canonical AnalysisWorkbench uses five grid columns (left / resizer / main / resizer / right), but `super-top-contract.css` still contained an obsolete three-column compatibility block that reassigned `.dkds-analysis-main` to column 2, collapsing the real main canvas into the 7 px left-resizer column.
- Removed the duplicate AnalysisWorkbench geometry, typography and control ownership from SUPER/TOP chrome. `analysis-workbench.css` and `plugin-workspace.css` are again the single owners of Workbench layout; reusable PRIME/sticky rules were moved into their canonical Workbench component styles instead of being deleted.
- Replaced the v3.61.92 global top-priority `dkds.state` visibility layer with the original foundation `.hidden` fallback plus targeted structural hidden rules. The project-save backdrop and Import Workbench helper note now explicitly hide at the same structural priority as their active `display:grid/flex` declarations, avoiding both the startup modal lock and global visibility side effects.
- Added a Workbench hydration/visual regression contract that forbids SUPER/TOP from re-owning AnalysisWorkbench grid geometry and verifies Data Center/Resonance both compose their PRIMARY main nodes through PluginWorkspace. Style validation now rejects a global `dkds.state` layer and legacy AnalysisWorkbench geometry in SUPER/TOP CSS.
- Browser computed-style validation with Chromium confirms a 1200 px Workbench now resolves to 280 px left rail + 7 px resizer + 897 px PRIMARY/main content, instead of the previous 7 px main region; the project-save backdrop and conditional Import helper remain hidden when inactive.
- Validation: `npm test` 163/163 PASS; `npm run check` 171/171 PASS; Chromium Workbench/Data Center computed-style smoke PASS; authored CSS remains at 0 `!important`.

# v3.61.92 — Renderer Interactivity / Visibility-State Fix

- Fixed the startup-wide click lock where the project-save backdrop was visible before the save workflow had opened it.
- Moved the global `.hidden { display: none; }` contract out of the low-priority foundation layer into a dedicated highest-priority `dkds.state` cascade layer. Structural `display:grid/flex` rules can no longer override hidden interaction state.
- The same state ownership now protects conditional Import Workbench controls and other initially hidden renderer surfaces from equivalent cascade-layer regressions.
- Extended style validation to require explicit visibility-state ownership and forbid moving global `.hidden` back into foundation.
- Added the v3.61.92 renderer interactivity regression gate covering startup save-modal visibility and event-driven save invocation.
- Validation: `npm test` 162/162 PASS; `npm run check` 170/170 PASS; authored CSS remains at 0 `!important`.

# v3.61.91 — Application Module Export Contract

- Fix the v3.61.89 Application-shell migration regression where `src/app/modules/import-workbench.js` retained an empty CommonJS export object even though Foundation, Startup, Data Artifact Host, Floating Docks, Dedicated Windows, Project Persistence and Workspace Shell consume its public functions. This caused renderer startup to stop at `dataConsumerTargets is not a function` after the Electron main-process fix in v3.61.90.
- Restore the complete Import Workbench cross-module contract (`dataConsumerTargets`, scoped import opening, directory/file import helpers, dataset-list rendering, import settings/actions and byte decoding) instead of patching only the first failing symbol.
- Add an Application CommonJS export-contract regression that scans every declared Application module and verifies direct, destructured and namespace local `require()` symbol use against the target module's explicit exports. The current graph checks 226 cross-module symbol uses and prevents a module migration from shipping with resolvable paths but missing exports.
- Update architecture/code-quality documentation to reflect that Application, UI Infrastructure and Plugin Kernel all use importable CommonJS module graphs with zero authored `.inc` implementations.

# v3.61.90 — Electron Startup Dependency Resolution

- Fix the Electron main-process project-format import after the Core project module moved to `src/core/project/format.js`; v3.61.89 could fail before creating a window because `desktop/main.js` still referenced the removed pre-refactor location.
- Add a recursive main-process local-module resolution regression that starts from `desktop/main.js` and rejects unresolved relative CommonJS dependencies before release.
- Keep release metadata synchronized by teaching `set-version.js` to update the current README version marker and checking it against `package.json`.

# v3.61.89 — Importable Application Shell

- Migrate the Application shell from ordered `.inc` composition to 12 real CommonJS modules plus an explicit runtime entry, leaving UI Infrastructure, Plugin Kernel and Application with zero authored `.inc` implementations.
- Centralize Application mutable state in an explicit context owner and replace composition-order coupling with explicit or lazy module imports.
- Update release/test tooling to consume the Application module graph rather than deleted composition fragments, with a dedicated v3.61.89 architecture regression.

# v3.61.88 — Importable Core Runtime Modules

- Migrate UI Infrastructure from authored `.inc` shared-closure fragments to 25 real CommonJS modules plus an explicit `ui/runtime` entry. ScientificCurveSurface is composed from an importable base class, navigation mixin and render mixin instead of a three-file open class body.
- Migrate Plugin Kernel from authored `.inc` shared-closure fragments to 15 real CommonJS modules plus an explicit `kernel/runtime` entry. Mutable kernel ownership (`host`, SUPER/activity identity, preference caches, package-loading promises and resize dispatch state) now lives in `kernel/modules/context.js` rather than implicit cross-file lexical variables.
- Remove all authored `.inc` implementation files from `src/core/ui/composition/` and `src/core/plugins/kernel/`. Their `composition.json` files now declare only importable modules and entry modules.
- Extend `generate-runtime-compositions.js` with a bounded CommonJS module runtime so the classic renderer continues to receive deterministic generated scripts while authored Core remains independently importable and testable.
- Preserve the 48 KiB source boundary for both legacy application composition fragments and new importable runtime modules; the largest current Core runtime module remains below the limit.
- Update structural regression tests so they validate reproducible module graphs instead of requiring the old lexical source shape. Full `npm test` passes after the migration.

# v3.61.87 — Composition Boundary Cleanup

- Split UI Infrastructure authored composition from 7 coarse fragments into 23 responsibility-focused fragments and Plugin Kernel from 6 into 13, while preserving the generated runtime byte stream exactly.
- Replace implicit filename-sort composition with explicit local `composition.json` manifests for UI Infrastructure, Plugin Kernel and application composition. The generator now rejects duplicate, missing, stray and oversized (>48 KiB) fragments.
- Split the 46.7 KiB Analysis Workbench structural stylesheet into AnalysisWorkbench shell, PluginWorkspace contract and shared workbench-component ownership files without changing rule order or cascade layer.
- Keep the zero-`!important`, no-`base/modern`, plugin-neutral Core styling rules from v3.61.86 and add regression coverage for bounded composition/source ownership.
- This remains a structural cleanup release: no intentional scientific, project-format or plugin behavior change.

# v3.61.86 — Modular Core & Cascade Ownership

- Reorganize authored Core under responsibility directories (`data / project / scientific / plugins / ui / theme / services / host / performance / workflow / diagnostics / recipes`) and forbid implementation files at `src/core/` root. Legacy generated `src/core/plugin-kernel.js` and `src/core/ui-infrastructure.js` are removed from authored source.
- Replace the historical `base/modern` specificity stack with explicit Cascade Layers: `foundation < plugin < structure < presentation < theme < platform < window`. Core CSS is now imported through `src/core.css`; CSS generation by concatenation is removed.
- Remove `!important` from all authored renderer CSS, including Core styles, first-party plugin styles, mobile styles and dedicated-window styles. `scripts/validate-styles.js` rejects new `!important`, malformed CSS structure, legacy specificity directories and domain-plugin identities inside Core styles.
- Keep first-party domain geometry in manifest-owned `plugin.css` while Core/Theme retains semantic control, typography, Material and chrome ownership. Mobile and Core styles are domain-neutral.
- Add v3.61.86 architecture regression gates for modular Core organization, zero-`!important` CSS, explicit cascade order, generated-artifact boundaries and plugin-neutral styling.
- Remove stale generated runtime copies from authored source and keep disposable runtime compositions only under `src/generated/runtime/`, excluded from Git and reproducible by `npm run runtime:build`.
- Update architecture/project-structure/code-quality documentation to reflect the current responsibility layout and the remaining build-time composition debt instead of the obsolete base/modern or monolithic-Core descriptions.

# v3.61.85 — CSS Ownership Reduction

- Move first-party static domain layout for Connectivity Center, Data Center, Pulse Analysis, Resonance Workbench and TER Analysis into manifest-owned `plugin.css` files; remove runtime static-style injection and first-party style privileges.
- Give built-in and packaged plugin styles one deterministic cascade slot between base Core structure and modern/Theme chrome, so plugin activation order cannot become a theme override mechanism.
- Remove TER/Pulse/Data Center/Resonance selectors from Core authored CSS. AnalysisWorkbench, mobile summary observation, ScientificPlot legend collision handling and portable-view layout now consume semantic Core markers instead of plugin identities.
- Remove Resonance `TOP_STYLES` and migrate remaining Resonance dock/PRIME/gate geometry into plugin-owned layout while keeping Material, colors, borders and shared control appearance Core-owned.
- Correct regression tests that protected historical selector placement or exact CSS punctuation rather than the semantic contract. Add a CSS-ownership gate preventing domain selectors and runtime static CSS from returning to Core.
- Reduce Core authored `!important` debt from 1597 to 1492, and modern-layer debt from 663 to 651, with both new values enforced as non-regression ceilings.

## 3.65.2

- Restored the full Theme 3.9 bootstrap in dedicated TOP windows by loading the canonical Semantic Registry before Material Renderer, so Data Center, TER, Pulse, Vth and other TOP workspaces consume the same Theme/Material system as the main shell.
- Moved the real-UI Theme Inspector into Plugin DevTools and removed the hidden Ctrl+Alt+T entry path.
- Reclassified status-bar commands as integrated Status Bar hit regions instead of Toolbar Actions; hover no longer creates a separate capsule/shadow.
- Fixed automation diagnostics for the semantic resolver object contract and actionable-control contrast coverage.
- Added Aurora Pop 2.0 as a bundled Theme 3.9 baseline with contrast-safe violet primary actions and no theme CSS injection.

## v3.61.84 — Repository consolidation and ownership cleanup

- Reorganize Electron host files under `desktop/`, all executable regression tests under `tests/`, Theme runtime under `src/core/theme/`, and generated app/Core/CSS bundles under authored composition directories. Root host shims and test scripts in `scripts/` are removed.
- Make generated runtime bundles, plugin/SDK indexes and derived PNG icon copies reproducible build products rather than tracked source. `npm run clean:generated` now restores a lean source tree; start/test/check/dist regenerate everything they require.
- Consolidate status-bar chrome ownership into one semantic block and remove the late status-command override stack. Integrated commands remain hit regions of their parent chrome rather than nested material surfaces.
- Remove release-numbered Theme/Material source commentary and the obsolete `95-theme-material-contract-31.css` compatibility shell. Theme/Material ownership files are now named by responsibility, not historical release.
- Correct brittle regression tests that asserted version-era comments instead of semantic behavior, and add `test-v36184-repository-hygiene.js` to enforce generated-artifact, source-filename, domain-boundary and patch-debt rules.
- Freeze current authored CSS override debt as an upper bound (**1597** `!important` declarations total, **663** in the modern layer) so subsequent work must hold or reduce it rather than append another override layer.
- Remove 50 obsolete per-version verification notes plus stale v3.41/handoff/local-history documents; `CHANGELOG.md` is the single release-history source and `docs/CODE_QUALITY_AUDIT.md` records remaining debt.
- Merge the one-use build-info generator into `prepare-build.js`, keeping `scripts/` limited to build/maintenance tools.
- Preserve the v3.61.83 stationary-menu contract and Theme/Material behavior; this release is an architecture/repository cleanup checkpoint, not a new visual redesign.

## v3.61.83 — Stationary menu motion contract

- Removed geometric entrance motion from Core command menus/popovers. Menus now appear at their resolved anchor position instead of translating into place.
- Removed hover/press vertical translation from command-menu and tool-workspace menu items; menu interaction changes paint only, never geometry.
- Added a Core regression contract so future theme or Material changes cannot reintroduce fly-up/fly-down menu motion.

## v3.61.82 — Chrome ownership closure & deterministic glass controls

- Fix the v3.61.81 chrome integration regression at the Material Renderer boundary: status-bar commands, PlotView/FWHM actions, panel/trend actions and other integrated hit regions no longer receive a nested `control` Material Role when they live inside a `chrome` owner. The initial semantic scan now includes explicit material-role nodes and integrated containers, so legacy role classes are removed before the first interaction rather than only after a mutation.
- Remove stale hard-coded `dkds-material-role-control` markers from Core chrome action-group markup. Header/right-side icons and bottom status commands are now layout/hit regions owned by their parent title/status surface.
- Flatten form controls inside every translucent recipe (`thin-glass / soft-glass / liquid-glass`) with a low-opacity semantic fill and no inset shadow, so SDK-authored glass themes and the built-in profile share one Core control depth model.
- Make the Theme light/dark segmented state deterministic from the root appearance as well as ARIA state, preventing white text on a clear/light segment during profile registration or appearance synchronization.
- Keep export-menu context metadata transparent inside the popover material, removing the remaining hard-coded-looking light strip in dark mode.
- Broadcast the user's `preferredProfile` separately from the temporary `activeProfile`, so plugin reload/fallback cannot propagate `builtin.default` to another window and appear to switch the user's Theme.
- Retune built-in Thin Glass toward the SDK 1.7.0 optical reference with compact 10/13 px radii and clearer but still restrained surface separation; large LAN Web and AI Agent/MCP windows remain Thin Glass elevated surfaces.

## v3.61.81 — Theme chrome ownership & profile stability

- Make integrated actions a semantic property of Core `chrome` material owners rather than a list of specific header classes. PlotView/FWHM header actions and bottom status commands are layout-only hit regions inside their parent chrome, with no idle card background, border, shadow or separator.
- Tokenize the analysis/export menu context row so dark mode cannot inherit a hard-coded light strip. Theme mode segmented controls now have an explicit semantic active state with accent fill and readable foreground in both light and dark appearances.
- Align built-in Thin Glass with the public SDK Thin Glass visual family: translucent semantic base surfaces plus 6/8/10 px role blur, while retaining shallow Core-owned shadows and recipe-driven composition. LAN Web and AI Agent/MCP remain large Thin Glass elevated surfaces.
- Separate the user's preferred Theme Profile from the currently available effective profile. Temporary plugin deactivation/unregister now falls back only in memory and no longer overwrites the saved Theme choice; re-registering the profile restores it automatically.
- Make an existing renderer-saved light/dark preference authoritative during the Electron startup appearance handshake, preventing stale host appearance state from silently switching the Theme.
- Upgrade SDK authoring baseline to **1.17.16** while keeping Plugin API **1.17.0** and Theme Contract **3.5.0**.

## v3.61.80 — Recipe-owned glass Core + SDK authoring correction

- Remove the remaining `builtin.thin-glass` identity branches from Material Renderer composition and shell popover handling. Built-in and SDK Theme profiles now receive the same Core behavior whenever they select the same `thin-glass / soft-glass / liquid-glass` recipe.
- Make command-menu Backdrop Root escape recipe-driven instead of profile-driven while retaining the v3.61.79 shell-menu ownership boundary, so plugin-owned range/box-selection menus are not globally closed.
- Correct the historical `materialTintOpacity` implementation/documentation mismatch: it is semantic base-material fill opacity, not an accent-color tint percentage. All glass recipes now consume the same effective fill-opacity pipeline.
- Add Core readability floors for translucent roles (`chrome` 58%, `sidebar/elevated` 62%, `popover` 78%, `floating` 58%) so externally authored glass themes cannot accidentally collapse transient UI into unreadable transparency.
- Fix integrated command groups reusing material fill opacity as accent tint, which could turn the entire light/dark Theme switch blue. Glass Theme switches now keep a neutral group and accent only the selected segment.
- Make form fields inside translucent material owners one flat Core semantic family; legacy inset/recessed paint is suppressed only under glass recipes, preserving the clear/default theme contract.
- Retune built-in Thin Glass toward a visible frosted material without the nearly opaque v3.61.79 regression: stronger blur, moderate role fill, shallower shadows, and greater light-mode canvas/surface/sidebar separation. LAN Web and AI Agent/MCP remain large Thin Glass `elevated` surfaces.
- Upgrade SDK authoring baseline to **1.17.15** while keeping Plugin API **1.17.0** and Theme Contract **3.5.0**. The official Theme template now uses readable glass values, documents fill semantics, and the SDK validator warns when authored glass opacity falls below Core floors.

## v3.61.79 — Thin Glass isolation + selection-menu ownership fix

- Restored the built-in default theme visual contract changed unintentionally in v3.61.78. Thin Glass-specific composition overrides are now strictly scoped to `builtin.thin-glass`.
- Restored default ActionGroup, PlotView, resonance floating-tool and panel-header material classes; Thin Glass flattens nested hit regions through profile-scoped CSS instead of rewriting shared markup.
- Limited command-menu body portals to the Thin Glass profile. The default theme keeps its original in-place dropdown behavior.
- Fixed the resonance box-selection menu disappearing after drag selection: shell menu cleanup now closes only shell-owned menus instead of every `.command-menu` in the document.
- LAN Web and AI Agent/MCP remain large Thin Glass surfaces under the Thin Glass profile.

## v3.61.76 — Renderer Startup Safety


## 3.61.78

- Thin Glass large elevated windows (including LAN Web and AI Agent/MCP) now remain true glass surfaces while their internal header/body layers inherit one parent backdrop capture.
- Command menus are portaled to a body-level popover layer so Chromium can blur the workspace instead of being trapped by a glass parent Backdrop Root.
- Material-role assignment has one authority in Core runtime; role CSS now only consumes semantic roles.
- Integrated action/status controls are hit regions inside the parent material rather than nested control surfaces, improving icon/text contrast and visual fusion.
- Reduced Thin Glass shadows and raised light/dark tint coverage to prevent transparent/readability regressions.

- Move automatic Material Role assignment out of the `MutationObserver` microtask. Class/subtree changes are queued and coalesced on animation frames, preventing observer-driven DOM writes from starving the renderer event loop.
- Defer the first full semantic-role pass until after the first browser paint. The static shell can render even if later theme/material diagnostics encounter pathological DOM churn.
- Make runtime role/optical class updates idempotent and ignore Material Renderer-owned class-only mutations when deciding whether semantic reclassification is required.
- Stabilize Liquid Glass optical positioning anchors so an anchor is not removed merely because the anchor itself changed computed positioning.
- Add a v3.61.76 startup-safety regression contract covering queued observer updates, first-paint gating, static-shell presence and optical-anchor stability.

## v3.61.75 — Thin Glass Material Architecture

- Upgrade Theme Contract to **3.5.0** and SDK to **1.17.14** while keeping Plugin API **1.17.0**. Add the independent Core `thin-glass` Material Recipe alongside `clear / soft-glass / liquid-glass`; unknown recipes are rejected rather than silently downgraded.
- Add built-in **Thin Glass** profile using low Gaussian backdrop blur and low tint: chrome/sidebar 6 px, elevated/floating 8 px, popover 10 px, while scientific/data surfaces and ordinary controls remain clear. Thin Glass explicitly disables refraction, displacement, chromatic aberration, noise, dynamic specular and optical pseudo layers.
- Formalize Core `MaterialSurface`: Core decides Material Role, the active Theme decides the role-to-recipe policy, and the single Core Material Renderer owns backdrop/filter/background material paint. Explicit MaterialSurface roles cannot be overwritten by runtime inference.
- Complete Material Role coverage for application chrome/status, sidebars/inspectors, PluginWorkspace/Dedicated Workspace, Settings, Plugin Manager, Automation Test, Data Center/Core scientific surfaces, dialogs, menus/tooltips and ScientificPlot floating chrome. Layout wrappers that would occlude backdrop sampling are transparent.
- Add development Theme Debug (`Ctrl+Alt+T`) and hard Render Coverage diagnostics for `ROLE_MISSING`, `RECIPE_MISSING`, `BACKDROP_FILTER_NONE`, `OPAQUE_PARENT_OCCLUSION` and `ENGINE_UNSUPPORTED`. Opaque-parent material failures now make coverage fail rather than merely warn.
- Remove remaining first-party plugin-owned backdrop filters and legacy Core material paint from Resonance range menus, Connectivity overlays, D3 tooltip hosts, ScientificPlot floating chrome, topbar/sidebar/statusbar and legacy command/settings shells. First-party plugins may keep domain layout/data-semantic color only; material paint is Core-owned.
- Preserve overlay scrim blur as a modal-background effect rather than a MaterialSurface recipe. The renderer never uses `filter: blur()` on UI content.

## v3.61.74 — Theme Profile Policy, Adjustable Parameters & Optical Memory Discipline

- Upgrade Theme Contract to **3.4.0** and SDK to **1.17.13** while keeping Plugin API **1.17.0**. Optical recipes are now owned by the active Theme Profile instead of being globally forced by Core. The built-in DK Data Studio profile explicitly maps all seven material roles to `clear`, so ordinary/default UI no longer becomes translucent just because the Optical Renderer is installed.
- Add declarative Theme settings. Theme plugins may publish bounded `range` / `number` / `select` parameters targeting semantic tokens, motion, material values or per-role recipes; Core validates and persists values and renders the settings UI. Theme plugins still cannot inject arbitrary CSS or custom settings DOM.
- Adapt both Plugin Manager and the bottom **主题** picker to the same Core Theme Settings surface. Profiles with settings expose a **参数** action; profiles without settings remain read-only except for profile/light-dark selection.
- Reduce Optical Renderer memory/compositor overhead: remove persistent `will-change: backdrop-filter`, bound transform promotion to active pointer interaction, and replace whole-document role rescans on every mutation with incremental changed-node/subtree assignment.
- Advance Optical Material Renderer to **3.5.0**. Renderer policy is resolved through `DKDSTheme.recipePolicy()`; legacy Theme 3.2/3.3 glass-family profiles without explicit recipes remain load-compatible, while Theme 3.4 profiles can explicitly select `clear / soft-glass / liquid-glass` per material role.
- Publish Liquid Glass **1.3.0** as a Theme 3.4 example: it explicitly opts popover/floating into liquid-glass and exposes Core-rendered controls for blur, saturation, tint and popover/floating recipe selection.

## v3.61.73 — Optical Material Renderer 3.4

- Theme Contract remains 3.3.0; SDK 1.17.12 decouples semantic material roles from Core-owned clear / soft-glass / liquid-glass recipes.
- Popover/floating materials now use a clearer center, masked strong-blur optical edge, bounded lens offset/scale and directional pointer-responsive specular highlight.
- Scientific/content surfaces and ordinary controls default to clear; chrome/sidebar/elevated use soft glass.
- Render Coverage and automation now verify the liquid edge layer and report BROKEN_OPTICAL_RENDERER.
- Reduced-motion disables dynamic optical displacement.

## 3.61.73 — Material Role Coverage & Scientific UI Coherence
- Finalize Core semantic Material Role assignment across application pages, PluginWorkspace canvas/sidebars, settings bodies/dialogs, dedicated TOP workspaces, portable/docked/floating tool panels and Core chrome without plugin-identity selectors. Theme Contract stays at 3.3.0; SDK advances to 1.17.11.
- Fix the Material Renderer cascade that repainted integrated command-cluster child buttons as independent material controls. ScientificPlot navigation and header action groups now have one parent material object; child hit regions stay transparent.
- Make plot legends label-like rather than pill controls. Resonance uses the public `dkds-legend-item` primitive and the renderer explicitly excludes legend items from control-material paint.
- Simplify Resonance inspector content into one host surface and remove the duplicate curve-level “跨 Vg 智能整理峰序” action; the main-plot “智能峰序” command remains the single entry for the same operation.
- Remove the PluginWorkspace bottom-dock decorative gap by reducing the structural split seam to 1 px while preserving a 7 px resize hit target.
- Add a Core-derived popover/tooltip foreground contrast guard (target contrast >= 4.5) and Render Coverage status `LOW_CONTRAST_MATERIAL`, preventing light material + light tooltip text or dark material + dark text.

## 3.61.71 — Theme Renderer Verification
- Theme Contract 3.3 separates contract capabilities from real renderer capabilities, adds computed-style material coverage, a single material renderer recipe, optical blur harness, and dedicated TOP renderer diagnostics.

# 3.61.71 — Integrated Command Chrome & Status Theme Picker

- Replace independent header/plot action cards with a Core integrated command-cluster contract: one material shell, shared radius/background/shadow, and internal hit regions with no per-button card shadow or hover lift.
- Apply the fused command contract to ScientificPlot navigation, PlotView/FWHM headers, portable controls, floating panel headers, Resonance inspector/group headers, and Core trend-card actions without plugin-specific visual ownership.
- Remove the permanent desktop runtime identity control from the bottom status bar. Replace the old appearance/runtime pair with a single **主题** command that opens a Core-themed profile picker with installed Theme Profiles and light/dark selection.
- Status Monitor now declares `ui.theme`; Theme switching remains within Theme Contract 3.2 and does not permit theme plugins to split integrated command chrome into independent buttons.

# 3.61.69 — Theme Contract 3.2

- Theme validator now executes Theme Profile registration and rejects unknown tokens and invalid material/motion values.
- SDK compatibility ranges are parsed as semver; Theme templates declare app and Theme Contract minimums.
- `ctx.ui.theme.contractVersion` and `supports()` expose Theme Contract capability independently from Plugin API.
- Canonical mode structure is `modes.<mode>.tokens/motion/material`; legacy 3.1 flat mode values remain compatible with documented precedence.
- Adds semantic material roles: chrome, sidebar, surface, elevated, popover, control and floating.
- Adds platform-neutral numeric material/motion units and documents Web px / Android dp projection plus deterministic material composition.
- Adds Core Theme Test Gallery with side-by-side light/dark component coverage.
- Adds Theme Coverage Contract (`ctx.ui.theme.coverage()`), runtime plugin visual auditing, and SDK warnings for hard-coded plugin chrome that bypasses semantic tokens/material roles.
- Core material role mapping now covers app chrome, sidebars, workspaces, tables/cards, dialogs, menus/tooltips, controls, ScientificPlot chrome and floating surfaces.

# v3.61.68 — Theme Contract 3.1 / Material Tokens

- Upgrade Core Theme Runtime to **3.1.0** and standalone SDK to **1.17.8** while keeping Plugin API **1.17.0**.
- Add bounded material tokens: `materialBlur`, `materialBlurStrong`, `materialSaturation`, `materialTintOpacity`, `specularHighlight`, `innerHighlight`, `glassEdge`, and `materialNoiseOpacity`. Theme profiles may supply them in a shared `material` block; light/dark mode maps may override them.
- Core owns the material recipes (`dkds-material`, strong blur and noise recipes) and applies the contract to existing glass-like shell chrome. Theme plugins still cannot inject arbitrary CSS or choose host DOM targets.
- Extend SDK TypeScript declarations, authoring template/docs and regression coverage for Theme Contract 3.1 material authoring.

# v3.61.67 — Theme Contract 3.0 / First-class Theme Plugins

- Close the remaining dark-theme leak in Automation Test Center. Its notice/log surfaces no longer fall back through the undefined legacy `--surface-soft` variable to `#f4f7fb`; all automation surfaces and status states now consume semantic Core tokens.
- Upgrade Theme Runtime from 2.0 to **Theme Contract 3.0**. Theme Profiles now own a bounded semantic appearance contract plus Core-controlled motion tokens (`motionFast`, `motionNormal`, `motionSlow`, standard/emphasized easing, hover lift and press scale). Core retains animation recipes and automatically neutralizes motion under `prefers-reduced-motion`.
- Add a final semantic closure layer so shell chrome, project tabs, toolbars, sidebars, status bar, dialogs, Plugin Manager and common surfaces are rebound to `--dkui-*` tokens rather than being trapped behind historical hard-coded modern-theme colors.
- Introduce first-class `pluginType: "theme"` across Core, Desktop package validation, Mobile package validation and SDK schemas. Theme plugins must declare `ui.theme`, cannot own workspaces/windows or Algorithm Providers, and cannot ship arbitrary CSS / request `ui.styles`; appearance and motion must go through Theme Contract tokens.
- Adapt Plugin Manager with a Theme category/filter, theme count, registered-profile selector, current-profile status and explicit “应用主题” action. Installing/enabling a theme registers profiles but does not silently activate them.
- Upgrade standalone SDK to **1.17.7** while keeping Plugin API **1.17.0**. Types, manifest schema, authoring docs, validator and `sdk/templates/theme-profile` now cover Theme Contract 3.0 and bounded motion authoring.
- Add `test-v36167-theme-contract-3.js` regression coverage for Theme Runtime 3.0, automation surfaces, theme package routing, Plugin Manager integration, SDK authoring and arbitrary-CSS rejection.

# v3.61.66 — Project Tab Polish, Self-Provider Routing & Forensics Removal

- Normalize the project-tab close action as a Core icon button instead of a generic control: transparent idle state, no shadow, fixed 24×24 square geometry and a true circular neutral hover/active surface. This removes the accidental color split inside active project tabs.
- Preserve a TOP's own `algorithmProvider` identity in the dedicated-window spec and report/validate the target plugin's self-registered algorithms in the renderer startup profile without loading the target plugin script twice. This fixes Transfer Vth Lab `transfer-curve` provider routing in automation.
- Remove the temporary `ProjectExitForensics` and detached watchdog modules after two clean shutdown investigations showed the Downloads project still present after Electron exit. Keep permanent ProjectFileSafety, recovery copies, safe project writes and disabled auto-install-on-quit behavior.
- Studio updates to **3.61.66**. SDK and Plugin API remain unchanged.

## 3.61.65 — TOP Window Reuse Race / Exit Diagnostics Accessibility

- Fix a real dedicated-TOP reuse race exposed by the Windows automation report. A BrowserWindow committed to real close is now removed from the Core reuse registry **before** asynchronous `BrowserWindow.close()`, so the immediately following TOP test/open cannot reuse a renderer that is already closing.
- Back-to-back TOP diagnostics now wait for the previous dedicated renderer's `closed` event before proceeding. This addresses the Data Center result where `created.reused=true` was followed immediately by `alive=false / visible=false`.
- Keep the recycle-bin investigation isolated as temporary diagnostics. `project-exit-forensics.jsonl` now lives in the normal `userData/diagnostics/` directory and the automation environment reports its exact path. The module remains marked for full removal after the project-file incident is conclusively identified.
- The supplied v3.61.64 exit-forensics run did **not** reproduce deletion: the tracked Downloads project remained present through Electron exit and the entire 20 s watchdog interval, with no recycle-bin metadata match.
- Add `test-v36165-top-window-reuse-race.js` to prevent a closing dedicated window from re-entering the reuse path.

## 3.61.64 — Exit File Forensics / Automation Diagnostics

- Added a **temporary**, isolated exit-file forensic module for the reproducible Downloads-project recycle-bin incident. It records `window-all-closed`, `before-quit`, `will-quit`, `quit`, `process-exit`, updater/service shutdown actions and exact tracked-file states. A detached 20 s watchdog survives the Electron parent long enough to detect post-exit disappearance and, on Windows, matches `$Recycle.Bin/$I*` metadata back to the original project path. This module is explicitly marked for removal once the incident is identified.
- Kept v3.61.63 project recovery/safe-write and `autoInstallOnAppQuit=false` protections unchanged.
- Fixed Automation Runner's stale `ScientificPlot === 2.3.0` assertion. Runtime 2.5.0 is now exercised by behavior rather than rejected by version string.
- Replaced fixed 100/80 ms TOP lifecycle sleeps with deterministic Core suspended/resumed contract polling. Failed TOP diagnostics now retain lifecycle snapshots and wait timings. Dependent startup/D3/provider profilers skip when TOP coverage is incomplete instead of generating cascaded failures.
- Automation Runner is now 1.25.0.

## v3.61.63 — Project File Safety

- Normal application quit no longer triggers automatic NSIS update installation. Updates may still download automatically, but installation is explicit only.
- Desktop project open now snapshots the exact source file into `userData/project-recovery/` without modifying the original path.
- Project save now writes through `ProjectFileSafety`: same-directory temp write + fsync + parse validation + atomic rename, with a recovery snapshot outside the source directory.
- `before-quit` checkpoints every opened native project and records a local `project-file-audit.jsonl` trail.
- Explicit update installation is refused if any currently tracked project lives inside the application install tree.
- Added a regression that opens an old project under a simulated Downloads folder, saves it and closes the app boundary while asserting that the original file remains present and recoverable.

## v3.61.62 — Neutral Selection & Plot Focus Frame

- Removed the browser focus outline around focused ScientificCurveSurface plots while retaining keyboard focus for resonance peak nudging.
- Added semantic Core selection surface/border tokens. Dark-mode selected rows now use restrained translucent white rather than blue accent fill.
- Added `test-v36162-neutral-selection-plot-focus.js` regression coverage.

## v3.61.61 — Visual State Coverage & Resonance Keyboard Restore

- Fix dark-mode linked-selection surfaces at the Core level. Focused/selected dataset rows no longer mix against hard-coded white or `#eef3ff`; they now consume `accentSoft`, semantic text and theme-aware border tokens. Scrollbar and legacy selected-row fallbacks are likewise tokenized.
- Unify active button states through Core semantic containers (`dkds-toolbar`, `dkds-action-row`, `dkds-surface-header`, `dkds-analysis-workbench`) and synchronize Data Center tabs with `aria-pressed`, removing the dark-mode mismatch between `.active` and ARIA state.
- Remove the bright perimeter rule from floating utility windows and normalize LAN Web controls, inputs, header actions and QR surroundings through Core theme surfaces. Only the QR raster itself retains white paper for scanner reliability.
- Restore Resonance arrow-key peak movement by transferring keyboard focus to the scientific plot after curve/peak selection. Input controls keep normal arrow-key editing; once a peak is selected, Left/Right moves one sample and Shift+Left/Right keeps the fast step behavior.
- Make reused Interaction Behavior profiles refresh their specification/bindings instead of silently retaining stale handlers after remount.
- Add `test-v36161-visual-state-keyboard-regression.js`, including an executable Core ShortcutHub → InteractionBehavior → resonance command path check, plus visual-state assertions for selection, active controls and floating panels.

## v3.61.60 — Structural Organization

- Move Electron/desktop host implementation out of the repository root into `desktop/` and update packaging/runtime references without host behavior changes.
- Move regression/contract tests to `tests/` and replace the oversized `package.json` test/check command chains with `tests/run.js` + explicit ordered manifests.
- Move generated Plugin Index and SDK Authoring Reference to `src/generated/`.
- Split authored `src/generated/runtime/app.js`, `src/generated/runtime/ui-infrastructure.js` and `src/generated/runtime/plugin-kernel.js` into ordered responsibility-based composition units while preserving the existing runtime bundle paths and exact bytes.
- Split Core/base and modern CSS into ordered modules; generated `style.css` / `ui-modern.css` remain byte-identical runtime bundles.
- Add a structural release gate that enforces root/desktop ownership, test separation, generated-artifact placement and bundle/source equality.

## v3.61.59 — Visual Contract Finalization

- Finalize first-party visual ownership: Pulse, Data Center, TER, Resonance, Connectivity and Vth now consume Core semantic primitives for surfaces, headers, toolbars, fields, chips, lists, metrics, tables, dialogs, status blocks, messages and floating surfaces. Plugin identity classes remain only for domain layout, state hooks and scientific semantics.
- Remove the Resonance parity visual opt-out. Resonance now inherits the same AnalysisWorkbench and dedicated TOP visual contract as every other first-party workbench; its specialized scientific composition remains plugin-owned without carrying a private theme.
- Strip plugin-owned colors, backgrounds, borders, radii, shadows, typography and private control sizing from first-party CSS and runtime-injected CSS. Core theme files are likewise prohibited from carrying visual paint under `.pulse-*`, `.dc-*`, `.ter-*`, `.respar-*`, `.reswin-*`, Connectivity or Vth identity selectors.
- Move scientific presentation defaults fully into Core: first-party ScientificPlot calls no longer pass legacy white plot backgrounds or fixed gray grid/zero-line colors. Series/category colors remain domain data semantics.
- Extend `ctx.ui.designSystem` with semantic class roles and add Core data-swatch/choice primitives so theme plugins can restyle first-party workspaces without knowing plugin identities.
- Add `test-v36159-visual-contract-finalization.js` to `npm test` and `npm run check`. The release gate now rejects reintroduced first-party visual chrome, Resonance visual exceptions and legacy hard-coded ScientificPlot presentation paint.

## v3.61.58

- Data Center: migrate the remaining assignment/purpose filter from the legacy outlined control to the Theme Contract semantic flat filter surface.
- Data Center: align breadcrumb/field filters with the same borderless semantic surface, hover and focus treatment.
- Add a release regression that prevents the legacy outlined Data Center filter from returning.

# v3.61.57 — First-party Theme Contract Hardening

- Finish the migration that Theme Contract 2.0 started: first-party Pulse, Data Center, AnalysisWorkbench, PRIME/Portable views and dedicated plugin-window docks now express section hierarchy through semantic surface contrast rather than bright structural outlines. Legacy `#dfe5ee/#edf.../#fff` splitter and panel paint is removed from the shared workspace primitives.
- Separate interaction boundaries from layout boundaries in practice, not only in tokens. Buttons are borderless semantic surface controls, while `input/select/textarea` continue to use `controlBorder/controlBorderHover`; tables/scientific axes keep their semantic lines where those lines carry data meaning.
- Make all AnalysisWorkbench and PluginCanvas splitter hit areas visually transparent while idle and reveal only `dividerActive` on hover/drag. This removes the persistent white vertical/horizontal rules visible in dark Pulse/Data Center workspaces without shrinking the resize hit target.
- Migrate Data Center's runtime-injected CSS and Pulse batch/file cards away from outlined boxes. Dedicated TOP window docks also stop restoring their own left/top divider rules after `ui-modern.css`.
- Add `test-v36157-theme-hardening.js` to the normal release gate. It checks the shared workspace primitives, Pulse/Data Center semantic surfaces, idle-transparent splitters and scans first-party plugin JavaScript for hard-coded light structural border/background paint.
- Studio updates to **3.61.57**; Mobile updates to **0.8.10** / Android versionCode **21**. SDK remains **1.17.6** and Plugin API remains **1.17.0**.

# v3.61.56 — Unified System History Coordinator

- Replace the split “project history vs. private resonance undo stack” behavior with a System History Coordinator. Project edits and active-workspace edits now expose comparable timestamps and the shell chooses the chronologically latest reversible operation, so Ctrl/Cmd+Z no longer blindly prioritizes a plugin over a newer project edit.
- Fix the Edit Contract async handling bug: a plugin returning `Promise<false>` from Undo/Redo is no longer treated as “handled”. The system now falls through to project history when a workspace has no applicable local edit.
- Extend the Edit Contract with `canUndo / canRedo / historyState` support and expose `edit.can()` / `edit.history()` from Plugin Kernel. Dedicated TOP windows use the same chronological coordinator instead of a different shortcut policy.
- Upgrade Resonance local history to true Undo + Redo with an explicit redo stack, availability state, timestamps and meaningful labels for common peak edits. The resonance keyboard behavior no longer intercepts Ctrl+Z directly; system history owns Undo/Redo routing.
- Rebuild the Operation History dialog around the combined history state. It shows project and active-workspace entries together, identifies the next Undo/Redo operation, and reports both scopes instead of incorrectly claiming the project has no history while the active workspace still has reversible edits. Mobile shell and Studio Kernel history snapshots now consume the same combined state; local/workspace history changes publish an explicit `history:changed` signal so native Undo/Redo availability refreshes immediately instead of depending on incidental DOM updates.
- Upgrade Core Project History to v2 with applying/error/revision state, safe async execution, rejected-operation stack preservation and per-entry scope/source/timing metadata.
- Studio updates to **3.61.56**; Mobile updates to **0.8.9** / Android versionCode **20**. SDK remains **1.17.6** and Plugin API remains **1.17.0**.

# v3.61.55 — Vth Built-in Workspace & Shell Control Unification

- Promote `transfer-vth-lab` from an SDK example-only package into a first-party built-in TOP workspace while preserving the same Plugin API contract. The main-process dedicated-window registry can now resolve `transfer-vth-lab`, eliminating the toolbar error “独立工作区契约未注册：transfer-vth-lab”.
- Normalize remaining legacy AnalysisWorkbench/History controls through semantic Theme Contract surfaces: TER/R–V, Data Center/图形预览 and Core dialog actions no longer use bright outlined legacy button styling in dark mode.
- Add a Core floating-panel safe-area clamp. LAN Web defaults to a centered, fully reachable work-area position below shell chrome; user-moved positions are preserved but cannot be dragged outside the visible workspace/status-bar bounds.
- Recompose the bottom status area as one shared command cluster: plugin/system status items live on a single shell surface, separator strokes are removed, and main/dedicated plugin windows use the same status-bar structure.
- Studio updates to **3.61.55**; Mobile updates to **0.8.8** / Android versionCode **19**. Built-in Vth Workbench updates to **3.0.3**. SDK remains **1.17.6** and Plugin API remains **1.17.0**.

# v3.61.54 — Theme Contract 2.0 & Surface-Hierarchy Closure

- Replace the remaining dark-mode framework lines with a semantic Theme Contract 2.0. Structural hierarchy now uses `canvas / surface / surfaceSoft / surfaceSidebar / surfaceElevated` contrast and spacing; idle splitters are visually transparent and only reveal `dividerHover` while hovered or dragged. `divider` and `controlBorder` are separate channels, so inputs/buttons remain legible without turning every panel boundary into a bright rule.
- Normalize legacy first-party controls, scrollbars, left parameter panels, PRIME/Portable/Group headers, AI/MCP settings and LAN Web chrome through the same semantic tokens. Only the actual QR raster keeps a white paper background for scanner reliability.
- Introduce Core theme profiles through `DKDSTheme` 2.0 and Plugin API `ctx.ui.theme`: theme plugins can register/activate semantic light/dark profiles without patching Core or plugin DOM. Stored third-party profiles restore when their plugin registers, and profile tokens are projected into the Android native shell so desktop/WebView/native chrome share one theme source.
- Systematically harden plot/PRIME header layout: PortableView stamps Core-owned surface-header/heading-stack classes, title/description and action controls occupy separate layout columns, and resize separators no longer cross title text.
- Extend regression coverage for Theme Contract 2.0, plugin theme registration, native token projection, quiet splitters, parameter-surface hierarchy and dark control normalization.
- Studio updates to **3.61.54**; Mobile updates to **0.8.7** / Android versionCode **18**. SDK remains **1.17.6** and Plugin API remains **1.17.0**; `ui.theme` is an additive Core capability and existing plugins require no migration.

# v3.61.53 — Dark Shell Closure & Android Palette Type Fix

- 修复桌面端 `导入数据 / 读取项目` 分段命令的下拉 caret：暗色规则不再把 primary caret 清成透明按钮，caret 宽度收紧并使用 flex 几何居中，与主文字距离更近；移动端项目 caret 同步改为同一行紧凑居中。
- 继续降低暗色模式结构线对比度：工作区侧栏、Inspector/Group dock、PRIME/Portable 面板、Canvas dock/resizer、状态栏及图例外框统一使用更弱的语义结构线；真正的输入/交互控件仍保留较强一级边界。
- 修复 Android TypeScript 构建阻断：`ProjectRow` 使用了未声明的 `Palette.surfaceHover`。Palette 现在显式声明并为明/暗主题提供该 token，`mobile:test` 增加静态契约，避免再次等到 `tsc --noEmit` 才暴露。
- Studio 更新为 **3.61.53**；Mobile 更新为 **0.8.6** / Android versionCode **17**。SDK 保持 **1.17.6**，Plugin API 保持 **1.17.0**。

# v3.61.52 — Mobile Interaction Polish, Autosave & Collision-Free Grid

- SMB 文件管理器补齐暗色主题输入/按钮样式；局域网扫描按钮增加旋转进度状态和“扫描中”反馈。
- 修正移动端 AI Agent 对话窗设置按钮与关闭按钮的标题栏对齐。
- Core PortableView 侧边固定视图的长按横向手势现在由 SplitController 真正改变停靠列宽；固定视图填满列宽并继续受 Core min/max 约束，避免“整体平移但宽度不变”。
- 项目管理移除粗糙的左滑删除动画，改为明确 `×` 删除入口；Core 删除前统一提供保存提醒。
- 新增工程空闲自动保存：已经有真实可写路径的桌面工程和 Android SAF 工程在修改停止约 1.8 s 后原位保存；未首次保存、SMB/只读来源不会触发隐藏文件选择器，而保持 dirty 状态。
- 移动端“软件管理”更名为“插件管理”，插件统计/卡片布局压缩为更适合平板/横屏的紧凑密度。
- Android 文件选择注册常用 Studio MIME 类型，优先覆盖 CSV / DAT / TXT / TSV / JSON 等文本数据和工程文件，同时保留第三方 `ACTION_GET_CONTENT` / SAF Provider。
- 移动底部状态文本移除固定 48% 宽度限制并允许自适应字号，避免左侧状态被无意义截断。
- Core GridController 新增 sticky collision avoidance：吸附图真实占用一个网格列，其他图自动重排；单列布局无法避让时自动降级为非覆盖 sticky。TER“全部 Vg 电阻-电压”因此不再需要插件专用避让补丁。
- React Native Sheet 改为更克制的 fade 过渡，项目抽屉使用 cubic easing，并降低按压态突变，减少展开/收起时的黑色分层感。

# v3.61.51 — Android File Host, LAN Web & Mobile Interaction Closure

- Align Android file selection with the supplied PyDroid Node host contract: extended selection uses `ACTION_GET_CONTENT` as the primary third-party/provider chooser; persistent SAF files retain `ACTION_OPEN_DOCUMENT`; folders use `ACTION_OPEN_DOCUMENT_TREE` / DocumentsProvider; manifest package queries advertise all supported file actions. Mobile file and SMB entry points are semantic-neutral and Core auto-detects Studio projects before routing ordinary files to Import Workbench.
- Rebuild Android LAN Web around a real LAN listener: bind `0.0.0.0`, enumerate private IPv4 addresses, expose enabled/no-key/port/key/pair-session settings, never publish `127.0.0.1` as a share address, and require an actual `/__dkds_health` HTTP probe before reporting startup success.
- Move desktop status plug-in/system controls into a far-right command cluster. Harden held-title PRIME resizing so scrollbar gutters, explicit resize handles and table resizers win over title gestures; global mobile held-swipe navigation also ignores PRIME title/resizer regions.
- Make project-tag deletion use a left-swipe reveal plus iOS-like exit/collapse animation. Simplify the mobile More panel to software management, LAN Web and appearance because file/project/history actions already live in first-class shell locations.
- Keep SDK **1.17.6** and Plugin API **1.17.0**. SMB & AI Services advances to **1.2.1**; mobile advances to **0.8.4** / Android versionCode **15**.

# v3.61.50 — SMB File Browser & AI/MCP Service UX

- Remove the desktop Connectivity Center activity/page and the Tools-menu `连接 / SMB / AI / MCP` shortcut. Desktop no longer has a generic “connection” page.
- Move SMB into the actual file workflows: `导入数据` and `读取项目` now have compact source menus, and SMB opens as a reference-project-style file manager with network discovery, server/share navigation, breadcrumbs/path, favorites, directory browsing, guest/account fields, multi-file selection and direct import/project-open actions.
- Extend the Core import workbench with preloaded remote file payloads and add a non-remote `core.project-loader` capability so SMB data/project reads still enter the canonical Studio import/project lifecycle instead of bypassing it.
- Move AI Agent / MCP settings into `软件管理` as a compact service window. Remove the artificial MCP 12-character minimum on Android; tokens are any non-empty string up to 256 characters, while the UI still recommends a random long token.
- Add a bottom-status AI service item. Clicking it opens an AI chat panel; typing `@` can reference current data artifacts, rendered data plots and plugin/analysis results. References resolve through the Core-owned `core.ai-context` capability and are delivered as structured context with stable Studio IDs, while the Agent can continue using the full Kernel tool registry for deeper reads/actions.
- Upgrade the Agent runtime with multi-turn `chat(messages)` while preserving `run(instruction)` compatibility, and persist MCP service settings separately from AI provider settings.
- Add matching Android import-source actions for system/third-party Providers, SMB data, local projects and SMB projects; mobile connectivity commands route back through Plugin Kernel rather than duplicating SMB/AI business logic in React Native.
- Keep SDK **1.17.6** and Plugin API **1.17.0**. Mobile advances to **0.8.3** / Android versionCode **14**.

# v3.61.49 — Android AppState Typecheck Fix

- Fix the Android React Native shell TypeScript failure in `mobile/App.tsx`: lifecycle publishing accepted a generic `string` and assigned it to a ref inferred as React Native `AppStateStatus`, causing `tsc --noEmit` to stop at `TS2322`. The lifecycle path now carries `AppStateStatus` explicitly from import through ref storage and `publishLifecycle`.
- Extend the no-dependency mobile architecture regression so `mobile:test` also locks the `AppStateStatus` typing contract. This catches the exact source-level regression before Expo/Gradle build preparation reaches the separate TypeScript gate.
- Keep SDK **1.17.6** and Plugin API **1.17.0** unchanged. Mobile shell metadata advances to **0.8.2** / Android versionCode **13**.

# v3.61.48 — Connectivity Center Navigation Fix

- Fix the desktop Tools-menu entry for `连接 / SMB / AI / MCP`: the v3.61.47 shortcut called `workspace.openPage()` directly while the page still carried Core's `plugin-activity-hidden` state for the previously active workspace, so the page was opened internally but remained invisible.
- Route the shortcut through `ctx.ui.activities.activate('connectivity-center')`; the Activity now owns opening `connectivityCenterPage`, keeping Core Activity visibility and page visibility synchronized.
- Add a dedicated regression that rejects any future direct Tools-menu `openPage()` path for an Activity-owned page. Connectivity Center plugin advances to **1.1.1**.
- Keep SDK **1.17.6** and Plugin API **1.17.0** unchanged. Mobile shell metadata advances to **0.8.1** / Android versionCode **12** so desktop/mobile release artifacts remain synchronized.

# v3.61.47 — Studio Kernel, Full Agent/MCP & Connectivity

- Added a shared Studio Kernel capability registry consumed by both the built-in AI Agent and MCP server.
- Exposed project/history, canonical artifacts, data preview/statistics/cleaning/formulas, plugin/Core DataFlow importers-exporters-transformers-analyzers, scientific transforms/workflows, plots, plugins, native file read/write, SMB, UI and diagnostics as stable kernel tools.
- Added dynamic deep `core.capabilities.invoke`, allowing AI/MCP to call future Core/plugin capabilities without bespoke bridges.
- Upgraded the Agent to iterative tool execution for OpenAI-compatible and Anthropic providers, with full-kernel and read-only access modes.
- Added `plugin.authoring.contract` plus generated plugin validation/install pipelines on both desktop and Android, allowing Agent/MCP to inspect the current authoring contract, generate executable `.dkplugin` packages, validate them and install them through the normal Plugin Kernel.
- Added a generated machine-readable SDK authoring corpus (SDK 1.17.6 / Plugin API 1.17.0 contract, manifest schema, TypeScript definitions, guides and official templates) exposed through `sdk.authoring.describe/files.list/search/read`; Android packages the same corpus inside its offline WebView bundle.
- Upgraded MCP to dynamically publish Kernel tools and Studio resources over Streamable HTTP, including `dkds://sdk`, `dkds://sdk/files` and `dkds://sdk/file/{path}` resource templates; increased deep-operation transport timeout.
- Added desktop SMB host and Android jcifs-ng SMB support; expanded Android SAF/DocumentsProvider directory access.
- Reduced structural divider contrast across desktop/WebView and React Native themes, normalized remaining legacy structural rules to the semantic low-contrast border token, and lowered dark-mode separator opacity further.

# v3.61.46 — Android Mobile Shell Refinement & Resume Reliability

- Keep Undo/Redo exclusively in the Android software header immediately before Data/Parameters. Remove duplicated history controls from every Portable/Plot/Plugin view and remove title-bar context-menu placement so press-hold resize can no longer summon the position menu; placement now opens only from its explicit button.
- Tighten the single active-project tab and replace the bottom project sheet with a left-side native project drawer. The drawer adds New/Open/Save shortcuts and right-swipe reveal-to-delete for project rows.
- Refine native bottom chrome with lighter typography, wider status-item spacing, translucent/blurred bottom navigation, and an Android-native process-memory bridge based on PSS instead of misleading WebView JavaScript heap size.
- Replace the desktop LAN/web-service panel on Android with a compact native popover. The Android host validates packaged web assets, binds a loopback-only `ServerSocket`, packages shared brand assets into the standalone web bundle, exposes native service status/errors, and keeps the desktop LAN status item out of the mobile shell.
- Harden Android resume: lifecycle projection is fire-and-forget, Core request timers pause while the app is backgrounded, and pending timeouts resume only after the renderer re-announces `ready`. This prevents timers frozen by Android from firing immediately when the app returns to foreground.
- Keep SDK **1.17.6** and Plugin API **1.17.0**. Mobile package advances to **0.7.1** / Android versionCode **10**; existing plugins require no migration.

# v3.61.45 — Android Native Host Build Fix

- Fix the generated `DkdsNativeHostModule.kt` health-probe request: the Expo config-plugin template previously emitted physical CR/LF characters inside a Kotlin quoted string, so `:app:compileReleaseKotlin` failed at generated line 71 with `Expecting '"'` and a cascade of `Host` / `Connection` parse errors. The generator now emits Kotlin `\r\n` escapes and a regression test validates the generated source itself.
- Make shared `node_modules` Junction rebinding non-interactive by deleting only the reparse-point link through `System.IO.Directory.Delete(path, false)`. This removes the PowerShell `项具有子项，并且未指定 Recurse` confirmation seen when the mobile dependency signature changes, without recursing into or deleting the shared cache target.
- Keep all v3.61.44 mobile-shell behavior and SDK **1.17.6** / Plugin API **1.17.0** unchanged. This release is a native build/tooling correction; no plugin migration is required.

# v3.61.44 — Native Mobile Shell & Adaptive Workspace

- Show exactly one active project tab in the Android native header; tapping it opens the project switcher. Add first-class native Undo/Redo controls before Data/Parameters.
- Replace the race-prone Mobile Host startup path with an explicit Core `ready` handshake and queued requests. Timeouts now start only after a request is actually dispatched to the renderer, removing the common false `Core request timeout` during WebView startup.
- Move the persistent mobile status strip into React Native and make bottom navigation normal-flow and shorter, so native chrome no longer overlays plugin/Data Center content. Plugin status contributions are projected dynamically from Core.
- Harden the Android loopback web version with a `/__dkds_health` probe and background startup before reporting success. Extend document selection with `ACTION_GET_CONTENT` alongside SAF so more third-party Android file managers/providers are available.
- Remove the empty Resonance summary row below the main plot and hide legacy mobile split handles that rendered as the blue portrait crosshair.
- Upgrade Core PortableView: bounded source-sized initial global floats, explicit bottom-right pointer resize handle, pointer-based floating drag, and press-hold title gestures for docked width/height resizing while preserving title double-click behavior.
- Add unified project-history Undo/Redo to Core-managed plugin view chrome and route the project-history capability through system undo/redo so active plugin edit history participates.
- Keep SDK **1.17.6** and Plugin API **1.17.0**; no plugin migration is required.

# v3.61.43 — Android Host Runtime Integration & Clean Project Snapshot

- Integrate the previously uncommitted Android / React Native host work as one coherent release snapshot: native host runtime, mobile plugin package persistence/validation, TOP/workspace action bridging, native document/file handling, responsive mobile presentation, and Android host tooling.
- Add and retain dedicated mobile architecture, host-runtime, and plugin-package regression tests; the existing full Core/SDK/plugin regression suite remains the release gate.
- Route native-client detection through `ctx.runtime.isNativeClient` instead of letting the first-party status plugin read the Electron bridge directly; strict Plugin Boundary returns to **0 violations**.
- Remove the empty ignored root `node_modules` directory from the delivery package and commit all effective source files so the delivered Git worktree is clean.
- Keep SDK **1.17.6** and Plugin API **1.17.0**; this release extends host capability without requiring existing plugins to migrate.

# v3.61.42 — Release Hygiene & Dead-Code Cleanup

- Remove unreachable and write-only production paths identified by a whole-source unused-symbol audit, including retired Resonance range-menu helpers, obsolete inspector/group placement helpers, stale TER view-model caches, unused peak-detection helper variants, and redundant SUPER/navigation state.
- Remove byte-identical/redundant CSS rules and the inactive navigation width-density mode whose runtime setter had no caller. Update the affected static regressions to protect the live replacement paths instead of preserving dead implementation details.
- Keep project/file compatibility, current D3 rendering, scientific algorithms, plugin contracts, and visible UI behavior unchanged. SDK remains **1.17.6** and Plugin API remains **1.17.0**.
- Consolidate the local Git repository to the release branches only and repack/prune object storage so the delivered `.git` stays complete but substantially smaller.

# v3.61.41 — D3 Floating Toolbar Padding & Centering Fix

- Keep the compact **20 px toolbar height** and restored **23 px button width**, while increasing the floating shell's **right padding to 4 px** so the control group no longer looks squeezed against the outer frame.
- Center the D3 navigation buttons as explicit flex boxes and clear inherited button shadow behavior so the button highlight/shadow sits visually centered inside each control.
- SDK remains **1.17.6** and Plugin API remains **1.17.0** because this is a Core presentation-only refinement and does not change the public plugin contract.

# v3.61.40 — D3 Floating Toolbar Proportion Fix

- Keep the reduced **20 px vertical height** of the default D3 floating navigation buttons, while restoring the previous **23 px button width**, **11 px drag-handle width**, and **2 px horizontal shell padding**. The toolbar is therefore shorter vertically without being compressed horizontally.
- Extend the existing D3 navigation regression to lock the toolbar aspect ratio and prevent future height adjustments from unintentionally shrinking its width.
- SDK remains **1.17.6** and Plugin API remains **1.17.0** because this is Core presentation-only polish and does not change the public plugin contract.

# v3.61.39 — Stable PluginWorkspace Viewport Contract

- Redefine `primaryScroll:"safe"` as one bounded Core-owned Primary viewport with one scrollbar. Plugin content may exceed the viewport, but it can no longer turn the PluginWorkspace or Dedicated Tool window into the scroll owner and recursively feed content height back into Host geometry.
- Remove the contradictory late CSS overrides that previously changed `safe` from bounded scrolling back into `height:auto / overflow:visible` document-flow growth. `auto` is now the only explicit document-flow mode; `contained` remains the bounded no-scroll canvas mode.
- Update standalone SDK templates and docs to use flexible `min-height:0` roots. Add layout-validator warnings for semantic `min-height:100%` chains and compact all-`auto` Grid rows without `align-content:start`, the latter being a common source of Tool cards stretching into large blank vertical gaps beside taller siblings.
- Add `test-v36139-stable-plugin-viewport.js` and include it in both full gates and SDK Harness so safe/auto/contained geometry cannot drift back into contradictory meanings.
- Publish SDK **1.17.6** while retaining Plugin API **1.17.0**; complete stable-viewport guarantees require DK Data Studio **3.61.39**.

# v3.61.38 — External Tool Dedicated-Window Contract Closure

- Make the packaged `.dkplugin` manifest canonical in both owner and dedicated renderers. The dedicated renderer now applies the packaged manifest after evaluating package scripts and before Core contract validation/activation, removing the split-brain case where Tools navigation used package metadata while the independent window used stale runtime-embedded metadata.
- Require the target plugin id, declared Activity, TOP Workspace, and an actually visible plugin-owned page before a Dedicated Tool/TOP renderer can reach ready.
- Preflight the main-process machine window registry before opening a Tool/TOP activity so a renderer contribution without a resolvable window contract fails explicitly instead of appearing as a no-op.
- Strengthen Electron diagnostic TOP smoke: ready without the requested active Activity or visible page is now a failure, and lifecycle validation contributes to the final smoke result.
- Extend SDK Host Harness with a detached Tool package window-contract check and add the v3.61.38 external Tool host regression.
- Publish SDK **1.17.5** while retaining Plugin API **1.17.0**; complete host guarantees require DK Data Studio **3.61.38**.

# v3.61.37 — D3 Heatmap & Autorange Geometry

- Fix automatic TER/scalar-field color scaling: absent `zmin` / `zmax` remain automatic instead of being coerced to zero. Missing matrix values no longer enter the renderer as numeric zero.
- Harden D3 heatmaps with non-degenerate color domains and cell-edge axis geometry, preventing uniform-color/striped heatmaps caused by collapsed limits or center-domain clipping. First-party TER palettes (`Viridis`, `Turbo`, `Cividis`, `Jet`, `Hot`) and linear `dtick`/explicit tick controls are handled by the D3 renderer.
- Add restrained Core-owned Cartesian autorange headroom before nice ticks, so first/last data points do not sit on the plot boundary while explicit user ranges remain exact.
- Reduce the Core scientific floating navigation controls to a 20 px button height with a thinner shell.
- Publish SDK **1.17.4** while retaining Plugin API **1.17.0**. Full D3 geometry guarantees require DK Data Studio **3.61.37**.

# v3.61.36 — D3-Only Scientific Presentation Architecture

- Remove Plotly from the production renderer stack. Desktop, mobile, main-window and dedicated TOP scientific charts now route through the Core D3 renderer only; plugin manifests declare the vendor-neutral `scientific-renderer` capability and cannot select a second backend.
- Introduce one Core `PlotPresentationRuntime` for legend layout, semantic LegendGroup state, curve-to-legend selection, exact baseline restore, compact navigation chrome and light/dark presentation. D3 is responsible for scientific geometry; it no longer owns a parallel legend or toolbar contract.
- Make legend controls stable semantic DOM nodes keyed by series/LegendGroup identity. Solver-driven row changes reparent existing controls instead of recreating them, preserving pointer/focus identity and making isolate → second-click restore deterministic.
- Keep automatic legends top-first, capped at two compact rows, transparent and shadow-free. Narrow auxiliary plots use the full surface chrome width, crowded legends no longer force a permanent horizontal scrollbar, and transient `2 → 1 → 2` series updates retain a stable legend footprint.
- Restore Core navigation as a compact draggable auto-hide overlay independent of renderer-native chrome. Hidden/hover transitions change opacity only and do not participate in plot geometry.
- Compact standard PlotView headers to 28 px and keep renderer presentation entirely theme-token driven, including restrained dark-mode legends.
- Add D3 single-backend/cutover tests and a Linux Chromium/Xvfb Core presentation harness covering per-surface legends, curve-selection focus, isolate/restore, stable legend reserve, no horizontal overflow, 28 px headers and navigation auto-hide.
- Publish SDK **1.17.3** while retaining Plugin API **1.17.0**. Full D3-only presentation guarantees require DK Data Studio **3.61.36**.

# v3.61.35 — Scoped Legends, Stable Plot Geometry & Dark Theme Closure

- Fix the Core Plotly legend host ordering bug that allowed per-card legends to position against a shared ancestor and visually collapse into one misleading common legend. Every Plotly legend is now scoped to its own ScientificPlot host.
- Make Plotly legend isolation group-aware: one visible legend item controls every trace in its `legendgroup`, including paired forward/reverse traces that intentionally suppress duplicate legend entries. Legend clicks use direct Core `restyle` visibility updates rather than full Plotly re-render cycles.
- Stabilize compact-chart geometry with a sticky multi-series legend footprint and two-row horizontal packing, eliminating trace-count/ResizeObserver feedback that made pulse and TER plots visibly twitch.
- Remove hover geometry shifts and white inset rims from shell/activity controls; close the remaining hard-coded white system-tool hover leak.
- Theme the Core Import Workbench, AnalysisWorkbench navigation, Data Center host controls and status-bar separators through semantic light/dark tokens. Status items use short internal dividers instead of full-height bright borders.
- Validate the Core presentation layer in Linux Chromium/Xvfb using a browser-level visual/interaction smoke harness: per-card legend scoping, two-row packing, grouped isolation, stable legend reserve, dark Import Workbench, dark system hover and status chrome all pass.
- Publish SDK **1.17.2** while retaining Plugin API **1.17.0**. These visual-contract guarantees require DK Data Studio **3.61.35**.

# v3.61.34 — Unified Scientific Plot Presentation & Viewport Safety

- Replace Plotly's native modebar with the same compact, theme-aware, draggable `＋ / − / ⌂` Core navigation strip used by D3. Explicit `displayModeBar:false` remains a real opt-out instead of being overwritten by Core defaults.
- Move auto-managed Plotly legends out of Plotly SVG chrome into the shared Core HTML legend presentation used by D3. Top placement is preferred, compact two-row packing is favored, bottom placement reserves the X-axis title, and side placement is a fallback rather than the default.
- Make legend click-to-isolate deterministic for Plotly and D3 and keep legend geometry stable across small resize/hover changes to remove the visible reflow/twitch seen in compact cards.
- Close remaining dark-theme leaks in shell menu buttons and legacy scientific card/header/border surfaces; Plotly canvases, generated SVG containers and Core navigation chrome now resolve from semantic theme tokens.
- Correct `PluginWorkspace` `primaryScroll:"safe"` semantics so Primary content may grow while the Core canvas owns scrolling, preventing result panels from being clipped by a fixed-height host.
- Publish standalone SDK **1.17.1** while retaining Plugin API **1.17.0**; the full presentation/viewport guarantees require DK Data Studio **3.61.34**.

# v3.61.32 — Core Table, Layout, Legend & DevTool Contracts

- Make Core `TableSurface` own table typography, header/cell geometry, borders, scrolling, hover/selection and theme styling. Plugin API 1.16 packages may no longer style Core table internals directly; narrowly declared row-striping or row-state overrides remain available when genuinely needed.
- Extend the shared SDK/application layout validator and PluginWorkspace runtime guard from clipping recovery to proactive scroll and visual-containment diagnostics. Semantic plugin regions that would paint outside their parent are recovered into contained scrolling and exposed through `layoutDiagnostics().risks`.
- Add Core-owned multi-series legends to ScientificPlot/D3 and Plotly paths. Core chooses compact bottom/right placement, reserves the legend footprint in total plot geometry, supports legend/series interaction, recomputes placement on resize and exposes the computed legend metrics to plugins.
- Return Resonance group charts to the shared Core legend contract instead of maintaining a plugin-owned static legend, restoring consistent legend/curve interaction across group plots.
- Remove remaining hard-coded light Pulse-analysis and status-bar surfaces so disabled controls, file panels and bottom status chrome follow semantic light/dark theme tokens.
- Add a `DevTool` status item for the main shell and dedicated plugin windows; it toggles DevTools for the current Electron window through a Core IPC/runtime capability.
- Publish standalone SDK **1.16.1** while keeping Plugin API **1.16.0**. The SDK minimum host is `3.61.32` because the new table/layout/legend guarantees are host capabilities.
- Add `test-v36132-core-ui-contracts.js` covering Core table ownership, layout containment recovery, smart legends, dark-theme status/Pulse chrome, Resonance legend adoption and DevTool wiring.

# v3.61.31 — Plugin Compatibility Single Source & Core Dialog Runtime

- Fix external Plugin API 1.16 packages being rejected by the Electron installer because `main.js` still advertised a stale hard-coded Plugin API 1.15.0 while the SDK and renderer Core were already on 1.16.0.
- Make the Electron compatibility environment consume `sdk/contract.json` directly and include that contract in packaged application files so the installer no longer owns an independent Plugin API version constant.
- Split local plugin installation into select/validate → renderer confirmation → atomic commit. The file picker remains native, but executable-plugin confirmation and install/update errors are now renderer-owned UI.
- Add a reusable Core Dialog Runtime with light/dark-aware alert, confirm and prompt/select surfaces, structured metadata, expandable technical details, keyboard handling and restrained modern depth.
- Migrate Plugin Manager install/update, uninstall, rollback selection/confirmation and reset confirmation away from browser/Electron default dialogs. Blocking install errors always open a modal while the status bar keeps only a short audit message.
- Add `test-v36131-plugin-install-dialog.js` to prevent SDK/installer API drift and regression to native plugin-management message boxes.

# v3.61.30 — Proxy-Aware Build Tooling

- Add one build-network contract to `DKDS.cmd` / Developer Toolbox with `auto`, `inherit`, `custom` and `off` proxy modes. CLI overrides support `-Proxy`, `-ProxyMode` and `-NoProxy`; standard `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` and `NO_PROXY` remain valid.
- Propagate the effective proxy consistently to npm/npx, Electron `@electron/get`, electron-builder/Git child processes and Gradle JVM networking instead of relying on tool-specific accidental environment behavior.
- Route managed Temurin JDK downloads through the same proxy-aware PowerShell request wrapper and respect `NO_PROXY`.
- Add a persistent **Network & Proxy** page to `DKDS_GUI.cmd`; path/cache and proxy settings now merge into the same schema-3 toolbox config instead of one settings page overwriting the other.
- Redact proxy credentials from diagnostics. `DKDS.cmd network` shows the effective proxy source/mode without printing secrets.
- Support authenticated HTTP(S) proxies for PowerShell-managed downloads via `ProxyCredential`, and make `-ProxyMode off` remove stale Gradle proxy JVM properties as well as process/npm/Electron proxy variables.
- Keep the existing Electron/electron-builder mirror fallback as a fallback only; using a proxy no longer requires switching the project to a mirror.
- Extend Windows tooling regression coverage with `test-v36130-proxy-build-tooling.js`.

# v3.61.29 — SDK / Plugin Host Layout Hardening

- Promote the standalone SDK to **Plugin API 1.16.0** (minimum app `3.61.29`) while keeping Plugin API 1.10–1.15 packages load-compatible.
- Make `ScientificCurveSurface` minimum dimensions preferred geometry rather than a silent render gate. Core now attempts a host-owned minimum-height recovery and can render compactly above a hard safety floor instead of leaving a toolbar-only blank plot.
- Add `PluginWorkspace` **safe** scrolling and a runtime Layout Guard. If plugin-owned semantic UI is genuinely clipped by `overflow:hidden/clip`, Core restores the affected axis to scrolling so content remains reachable.
- Add one shared API 1.16 layout contract to both the standalone SDK validator and the application install path. New packages are rejected before activation when they style Core-owned shell DOM, clip semantic workspace UI, own the host viewport with `100vh`, or use positive-pixel `minmax(...,1fr)` scientific rows.
- Tighten public SDK typing for scoped DOM lifecycle, status-bar items, PluginWorkspace scroll policy and ScientificPlot layout diagnostics.
- Remove the remaining first-party Core Boundary exceptions: `builtin.status-monitor` now creates DOM, subscribes to window/document events and schedules auto-hide exclusively through `ctx.ui.dom`.
- Migrate the TOP/Tool templates and the external `Transfer Vth Lab 3.0.2` reference to API 1.16 safe-layout defaults. The reference implementations no longer teach root `overflow:hidden` or plugin-owned viewport geometry.
- Add `test-v36129-sdk-host-hardening.js`, including a deliberately unsafe test plugin that must fail with an explicit layout diagnostic. Full `npm test` and the stricter `npm run check` both pass with zero Plugin Boundary violations.

# v3.61.28 — Tool Window Layout & Single-Primary Navigation

- Make the top Tools dropdown content-sized and left-packed so icon/label spacing stays compact instead of inheriting shortcut-menu width.
- Auto-hide PluginWorkspace navigation when the workspace has only one Primary destination; `navigation: "always"` remains available when a plugin intentionally wants the strip.
- Remove duplicate dedicated-window status-bar reservation so AnalysisPage is the single viewport owner above the fixed 28 px status bar.
- Document the PluginWorkspace navigation policy in the SDK and update the Tool template to avoid teaching a redundant `工具` Primary label.
- Add v3.61.28 regression coverage for Tool-menu sizing, single-Primary navigation and dedicated-window viewport/status-bar geometry.
- Plugin API remains 1.15.0; the supplied Pulse Sampler 1.0.0 additionally needs a plugin-side bounded-layout correction because its 250 px waveform row is smaller than its own ScientificPlot `minHeight: 260`.

# v3.61.27 — Tool Install Sync Contract & Native Dark Window Chrome

- Fix the real external Tool install/activation failure `sources is not iterable`: `ctx.data.sources.list()` remains a synchronous SDK read in the owner renderer through a Core local capability proxy, while dedicated plugin windows continue to use the synchronous snapshot bridge.
- Synchronize Electron native window chrome with DKDS appearance through `nativeTheme.themeSource`, restore the persisted appearance before creating the first BrowserWindow, and use theme-aware BrowserWindow backgrounds for the main shell and dedicated TER/Tool windows.
- Complete the shared dark-theme boundary for legacy Analysis Workbench controls, including parameter cards, inputs/selects, notes, tables, import action bars and duplicate-warning states.
- Convert late host recipe toolbar/overflow styles from hard-coded light colors to Core semantic `surface / text / border / accent / warning / danger` tokens so they cannot override dark mode after plugin activation.
- Add executable v3.61.27 regression coverage reproducing the external Tool `for...of ctx.data.sources.list()` path and locking native-theme/persisted-appearance/theme-boundary behavior.
- Revalidate `com.dkds.tools.pulse-sampler@1.0.0` with the current SDK as a Tool + TOP + reusable dedicated-window plugin. Plugin API remains `1.15.0`; no plugin migration is required.

# v3.61.26 — Shared Plugin Theme, Reusable Window Lifecycle & Tool Contract

- Promote appearance from shell-only styling to a Core PluginWorkspace semantic token contract shared by built-in and external plugin windows, with legacy variable aliases resolving from the same light/dark source.
- Convert runtime-injected Resonance, TER and Data Center chrome to semantic Core surfaces/text/borders so high-specificity plugin CSS no longer forces white panels in dark mode.
- Make reusable TOP/Tool renderers singletons per owner + activity rather than per project tab; project changes rehydrate the existing renderer instead of creating duplicate prewarm processes.
- Prevent a later prewarm request from downgrading an already hydrated hidden reusable renderer, fixing the TER close/reopen lifecycle.
- Add project/lifecycle metadata (`预热 / 已打开 / 已隐藏`) to component-memory diagnostics so reusable plugin renderer state is explicit.
- Strengthen Tool package validation: Tool plugins must declare a TOP workspace and a dedicated window with the same activity. Plugin installation now filters to the normalized type and refreshes the top Tool menu immediately.
- Keep `builtin.pulse-import` as the intentional Data importer while validating the supplied `com.dkds.tools.pulse-sampler` as a Tool plugin; the two capabilities are distinct.
- Plugin API remains `1.15.0`; scientific algorithms and project data semantics are unchanged.

# v3.61.25 — Ordered Modern Shell, Theme & Tool Runtime

- Refine the v3.61.24 scoped visual system using the supplied Theme Lab 1.6.7 reference: cool light canvas, thin blue-gray rims, broad low-opacity ambient depth and short motion, while avoiding glossy or skeuomorphic controls.
- Establish explicit shell stacking layers so Resonance and other fixed analysis pages cannot cover the top Tools, Export Data or Software Management command groups.
- Add a persistent light/dark appearance runtime and a bottom-status-bar appearance toggle; Core Chart Runtime follows the selected application theme rather than only the operating-system preference.
- Turn the memory status item into an auto-hiding component-memory panel that lists Electron/plugin-window working-set usage by process.
- Add a host-owned selected/pressed control color contract so selected text remains legible in light and dark themes.
- Make Tool plugins first-class in Plugin Manager with visible type tags, and rebuild the top Tools menu deterministically from active TOP-role Tool activities after plugin lifecycle changes.
- Validate the supplied `com.dkds.tools.pulse-sampler@1.0.0` package against the SDK/package/window contract and its `pulse-sampler-tool` dedicated window.
- Plugin API remains `1.15.0`; no plugin migration is required.

# v3.61.24 — Scoped Modern UI Cleanup

- Remove the superseded `ui-polish.css` layer from v3.61.23 instead of stacking more override patches on top of it.
- Replace it with `ui-modern.css`, loaded only through an explicit `dkds-modern-ui` body scope in both the main shell and dedicated plugin windows.
- Eliminate all styling of Plotly-generated modebar DOM. Scientific plot typography/axis defaults remain owned by Core Chart Runtime, while CSS is limited to DKDS-owned cards, legends and navigation chrome.
- Add light/dark plot palettes inside Core Chart Runtime so scientific canvases adapt with the application theme without CSS reaching into Plotly internals.
- Rework visual depth toward a modern flat-first surface system: low-contrast borders, restrained shadows, no glossy gradients, short hover/press motion and explicit reduced-motion handling.
- Give Plugin Manager, Resonance, Data Center, TER, Pulse and shared Analysis Workbench explicit scoped surface/control rules without introducing absolute overlays or changing layout geometry.
- Protect compact Core scientific navigation controls from generic card/button depth so chart tools cannot expand into opaque overlay blocks.
- Add v3.61.24 anti-overlay regression checks that reject global button/form selectors, Plotly modebar CSS and reintroduction of the removed v3.61.23 polish layer.
- Plugin API remains `1.15.0`; no plugin migration is required.

# v3.61.23 — Unified Visual System & Scientific Chart Polish

- Add one Core-owned `src/ui-polish.css` cascade layer shared by the main shell and dedicated plugin windows, without changing existing workspace geometry or scientific/data contracts.
- Unify buttons, form fields, tabs, menus, panels, cards, tables, status chrome, plugin manager, Data Center and first-party analysis workbenches with one restrained border/radius/depth/focus language.
- Make toolbar groups carry the surrounding border/shadow while their inner commands remain visually lighter, reducing duplicated chrome and improving alignment.
- Extend Core Chart Runtime theming to shared Plotly typography, axes, grid/zero lines, plot background, legend and colorbar typography while preserving scientific trace colors and heatmap color scales.
- Restyle Plotly modebar and Core D3 navigation controls to match application chrome.
- Add short non-layout motion plus reduced-motion fallback, and responsive anti-crowding rules at narrower desktop widths.
- Add v3.61.23 visual-system regression coverage and cloud static-render checks at 1440×900, 1100×760 and 820×900 with no shell horizontal overflow.
- Plugin API remains `1.15.0`; no plugin migration is required.

# Unreleased — Repository Reproducibility & Documentation Refresh

- Repository-only maintenance release; application/scientific behavior remains the v3.61.22 runtime baseline.
- Refresh architecture, branching, project-structure and handoff documentation to the current v3.61.x Core-first plugin architecture.
- Prepare GitHub CI for deterministic lockfile-based installs (`npm ci`) once root/mobile lockfiles are present.
- Plugin API remains `1.15.0`; no plugin migration is required.

# v3.61.22 — Legacy Resonance Runtime Identity & Scoped Artifact Repair

- Fix the actual Resonance Artifact-consumer path so canonical datasets reconstructed from the shared Artifact Store still honor generic `assignments`. Legacy auxiliary channels migrated to `assignments: []` remain archived in the project/Data Center but no longer leak back into Resonance simply because an Artifact exists.
- Reconcile saved legacy peak identities only when their exact `sweepId` no longer exists after current sweep reconstruction. Matching uses the stable dataset path plus scan direction, with peak geometry as a deterministic tie-breaker; valid exact identities are never rewritten.
- Expose live Resonance group diagnostics from the plugin service (`datasets / sweeps / visibleSweeps / peaks / matchedPeaks / unresolvedPeaks / series / seriesPoints`) through dedicated-window diagnostics.
- Automation Runner 1.24.0 adds `project.resonance-live`, which sends the current project and live Artifact snapshot through a real dedicated Resonance renderer and requires all accepted saved peaks to resolve and the live group model to contain non-empty series/points. This replaces the insufficient v3.61.21 assumption that an external reconstructed trend model proves the actual renderer is healthy.
- Add an executable regression that reproduces both failures together: an adopted Id Artifact plus an unadopted Ig Artifact, and saved peaks whose old sweep identities no longer exist. The real Resonance feature runtime must exclude Ig, repair the peak identities and produce group series.
- Resonance Workbench moves to 3.61.7 and Automation Runner to 1.24.0. Plugin API remains 1.15.0; no SDK surface changes are required.

# v3.61.21 — Legacy Selection Fidelity, Data Lineage Navigation & Auto-hide D3 Chrome

- Replace Data Center semantic tag pills with compact lineage (`all / raw / derived`) navigation plus an exact field-name dropdown derived from real artifact columns/axes.
- Replace Import Workbench heuristic signal tags with an exact inspected-column dropdown; selecting `id(0.0)` preserves the X column and excludes sibling `ig(0.0)` signals.
- Restore self-contained legacy datasets with their saved `importSpec` and original dataset path instead of reparsing embedded multi-column text with current defaults.
- Preserve legacy Resonance explicit visibility/adoption semantics so auxiliary datasets retained only for project portability do not silently become visible analysis input. Recover meaningful root `peaks`, `scanVisibility`, and `trendColumns` when an intermediate namespaced workspace contains only empty placeholders.
- Keep saved `peak.sweepId` identities aligned with rebuilt sweeps and add regression/automation coverage that requires old-project Resonance group models to remain non-empty when visible accepted peaks exist.
- Auto-hide the Core D3 ScientificCurveSurface navigation toolbar on desktop until plot hover/focus/drag, while keeping touch devices usable and retaining legend collision avoidance.
- Data Center moves to 1.13.6, UI Infrastructure to 6.9.2, Automation Runner to 1.23.0. Plugin API remains 1.15.0.

# v3.61.20 — Smart Plot Chrome, Semantic Data Tags & Unified Project History

- Core D3 ScientificPlot navigation chrome now detects Core legend overlays (including legends that appear/change after render) and automatically relocates to the nearest non-overlapping position. User-dragged positions remain bounded and are re-routed only when they collide with a visible legend.
- Data Model adds internal semantic data-tag inference for common transport labels including Vd, Id, Vg, Ig, Vth, dI/dV, dV/dI, resistance and conductance. Data Center and the Core Import Workbench share the same inference rules.
- Data Center adds semantic tag filtering alongside analysis-usage filtering. Multiple selected tags use AND matching, making combinations such as `Id + Vg` deterministic.
- Core Import Workbench adds signal-column tag filtering. X columns remain preserved while filters such as `Id` select only matching Y/signal columns across the import batch; selecting multiple signal tags keeps any matching signal (OR), and manual column edits clear the semantic filter.
- Adds a Core project edit-history runtime and remote `core.project-history` capability. Data-source assignment, rename, exclude/restore, deletion, and Data Center artifact edits now participate in the same project undo/redo chain.
- Main shell and dedicated TOP windows route Ctrl/Cmd+Z to plugin-local edit history first, then the project history; Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z provide redo.
- Data Center moves to 1.13.5. Automation Runner moves to 1.22.0. Plugin API remains 1.15.0; no SDK changes are required for these Core behaviors.

# v3.61.19 — Core D3 Navigation Toolbar

- ScientificCurveSurface 的默认 D3 图形工具条改为 Core 统一的紧凑浮动控件：默认移到右上偏内侧，避免压住 X 轴区域。
- 工具条静止透明度为 85%，缩窄按钮与间距，并显著减轻阴影；悬停/聚焦时才提高可见度。
- 新增 Core 内建拖动把手：工具条只能在所属绘图区内移动，位置按图表实例本地记忆；双击把手或键盘 Home/Escape 恢复默认位置。
- 绘图区尺寸变化时会自动夹紧已保存位置，避免窗口缩放后工具条跑出可视区域。
- 此能力完全属于 Core ScientificPlot/D3 默认 UI，Plugin API 与 SDK minimumAppVersion 保持不变。

# v3.61.18 — Data Selection / Dedicated Import / Tool Workspace SDK

- Data Center clears/purges stale chart state immediately when no valid DataTable remains.
- Data Center adds Shift range selection, Ctrl/Cmd additive selection, Select All / Invert / Clear and keyboard shortcuts.
- Import Workbench adds Shift range checking, Ctrl/Cmd toggle, Ctrl/Cmd+A, Ctrl/Cmd+I and an explicit Invert action.
- Dedicated TOP windows can forward the Core-owned Import Workbench action back to the owning project window.
- Transfer Vth Lab 3.0.1 declares the D3 ScientificCurveSurface dependency and aligns raw numeric controls with host field styling.
- Tool Workspace is now documented and validated as a TOP-equivalent workspace lifecycle whose opener is grouped under the Core Tools button. Command-only Tools remain supported.
- SDK validator now checks ScientificPlot runtime dependencies for dedicated workspaces.
- Data Center moves to 1.13.4. Plugin API remains 1.15.0. Automation Runner moves to 1.21.0.

# v3.61.17 — External Vth TOP / SDK TOP Contract

- Rebuild the external Transfer Vth Lab reference as a real TOP workbench: manifest TOP workspace + matching dedicated window + `openMode: window` Activity + one shared `topWorkspace` layout.
- Route Vth imports through the Core-owned scoped workbench import action and consume only assigned `data.sources` / `data.artifacts`; no private file picker or plugin-local dataset copy is introduced.
- Bound the Vth scientific layout with `PluginWorkspace(primaryScroll: contained)`, `height:100%`, `min-height:0`, and `minmax(0,1fr)` chart rows, removing the intrinsic-size resize feedback that made the demo plot grow downward continuously.
- Use the Core ScientificPlot Y display scale for Vth logarithmic current display instead of a plugin-owned `log10()` pre-transform.
- Add `sdk/templates/top-workspace-plugin` and strengthen the standalone SDK validator so incomplete/mismatched TOP contracts are rejected before packaging.
- Type `PluginWorkspace` and `TopWorkspace` in `sdk/plugin-api.d.ts`, including contained primary scrolling, and publish synchronous `ctx.data.sources.list()/targets()` read semantics explicitly.
- Preserve `window.artifactHydration` in normalized built-in/external plugin Window Specs so the machine-readable manifest hydration contract actually reaches the host.
- Add executable SDK regression coverage for Vth external-window normalization, invalid TOP packages, and bounded chart-layout rules. Plugin API remains `1.15.0`.

# v3.61.16 — Data Center Chart Preview / Dependency Hygiene

- Data Center now renders the active DataTable chart preview automatically after project hydration, Artifact selection, provider changes and chart-parameter changes. The preview no longer depends on pressing the draw button after data arrives.
- Repair stale saved chart column mappings against the active DataTable. Invalid legacy X/Y keys are replaced with current role-based or fallback columns instead of leaving the preview silently invalid.
- Chart Providers now return the ScientificPlot render Promise and Data Center awaits it, so lazy Plotly load/render failures are surfaced instead of escaping synchronous try/catch.
- Current-project Electron diagnostics now verify that a hydrated Data Center with DataTables reaches a ready Chart Runtime and actually creates Plotly traces. Automation Runner moves to `1.20.0`.
- Move the development Electron line from 39 to current stable 43.4.x so Electron uses the current `@electron/get` dependency line; keep stable `electron-builder` 26.15.7 rather than forcing incompatible transitive `glob`/`rimraf` overrides solely to hide upstream install warnings.
- Add `npm run deps:trace` to print the exact installed ancestry of `inflight`, `lodash.isequal`, `rimraf`, `glob` and `boolean` on the build machine.
- Plugin API remains `1.15.0`; Data Center moves to `1.13.3`.

# v3.61.15 — Dedicated TOP Data Sources Contract Repair

- Preserve the public Plugin API contract for `ctx.data.sources.list()` and `ctx.data.sources.targets()` inside dedicated TOP renderers. Read methods remain synchronous just like the main-window implementation instead of leaking Promise semantics from the generic remote capability proxy.
- Publish a read-only `core.data-sources` catalog/target snapshot with each dedicated-window capability snapshot. Source mutations still travel through IPC asynchronously; only the documented synchronous read side is mirrored locally.
- Make capability snapshot revisions source-sensitive so already-open TOP windows receive updated source catalogs after import, assignment, rename, exclusion or removal operations.
- Automation Runner 1.19.0 routes the current-project Data Center test through the same synchronized capability snapshot used by real windows and reports source-snapshot counts from the renderer.
- Add a regression that proves the raw remote capability returns a Promise, then verifies Plugin Kernel restores synchronous `list()/targets()` semantics before a workbench receives `ctx.data.sources`. This reproduces and prevents the v3.61.14 `targets.map is not a function` failure that left Data Center with a hydrated Store but zero rendered rows.
- Plugin API remains `1.15.0`.

# v3.61.14 — TOP Project Hydration & Real Data Center Diagnostics

- Prime the Core Artifact Store before any dedicated `window-runtime.create()` or plugin activation. Cold-open TOP windows receive the current project Store immediately; runtime-only prewarm receives an intentionally empty Store and hydrates only when promoted.
- Add safe dedicated-renderer diagnostics for project dataset count, Artifact/DataTable counts, total table rows and rendered Data Center rows.
- Automation Runner 1.18.0 now sends the currently open project and live Artifact snapshot through an isolated Data Center Electron window and verifies Store/UI counts end to end.
- Make TOP diagnostics follow each plugin's configured prewarm policy instead of forcing every TOP through a synthetic empty prewarm project.
- Fix the TableSurface runtime smoke to address its real `Name / Value / Note` headers.
- Validate lazy Chart Runtime against `DKDSCharts.VERSION` instead of stale hard-coded 1.4.0.

# v3.61.13 — Data Center Runtime Mount Repair

- 修复 Data Center `feature-runtime` 在独立 TOP 窗口中调用未绑定 `dom.frame()` 导致 mount/render 生命周期中断的问题。
- Data Center 现在显式使用 Core `ctx.ui.dom` 调度器，与 TER / Pulse 等 TOP 插件保持同一宿主契约。
- 新增可执行的 Data Center runtime mount/layout smoke test；不再只依赖源码字符串与 Data Model 单测判断窗口可用性。
- 保留 v3.61.12 的 live Artifact hydration / legacy dataset 合并逻辑；本次不增加 Data Center 特例数据路径。
- 内置插件 override 改为版本优先：只有版本严格高于随应用打包的内置插件时才执行；旧版或同版 override 仅保留为诊断信息，避免升级应用后仍被用户目录中的旧插件代码覆盖。

# v3.61.12 — Data Center Live Hydration / Action Group Repair

- Fixed Data Center still showing zero objects for self-contained legacy projects when a dedicated renderer received an empty/incomplete live Artifact snapshot. Live snapshots now merge with `project.datasets` transient adapters instead of suppressing the legacy bridge.
- Fixed reused live-hydration windows ignoring a changed Artifact snapshot when the serialized project digest/path were unchanged; Artifact-digest-only changes now replace the local live store and emit one canonical refresh event without remounting the plugin.
- Added `window.artifactHydration` to the machine-readable SDK manifest contract and made the host resolve hydration from either the runtime Activity or the window manifest, removing activity-mount timing dependence without any Data Center id special-case.
- Fixed the Data Center preview action row: a broad direct-child CSS selector was forcing the tabs and “编辑” into a vertical column. Title/copy blocks are now explicit, while action controls stay in one horizontal group.
- Plugin API remains `1.15.0`.

# v3.61.11 — Correct Log Display / Heatmap Z Scale / Live Data Center Hydration

- XY/scatter/curve log display now labels only decade ticks on the Y axis, eliminating overlapping 2×/3×/... minor labels on scientific current ranges. D3 ScientificCurveSurface and Plotly charts follow the same decade-only major-label rule.
- Heatmap/scalar-field logarithmic display is corrected to the Z/color scale. X/Y coordinates remain unchanged; the view projects `log10(abs(Z))`, keeps zero hidden only in the rendered view, and preserves source matrices/project/export data. Colorbar tick labels remain in original absolute Z magnitudes.
- ScientificPlot no longer owns a private Y-axis double-click handler. The base Core Chart Runtime is the sole Plotly display-scale interaction owner; ScientificPlot only observes the resulting `dkds:display-scale-changed` event.
- Data Center activity declares generic `artifactHydration: live`. On open, the owner renderer supplies its exact live Artifact snapshot, including transient legacy DataTable adapters intentionally omitted from persisted `dataModel`. This fixes old projects whose main analysis still had data while a newly opened Data Center hydrated an empty/stale store. Heavy analysis TOP windows do not receive this extra snapshot unless they explicitly request the same activity contract.
- Plugin API remains `1.15.0`; standalone SDK minimum application version moves to `3.61.11` for the corrected universal display contract.

# v3.61.10 — Universal Display Scale / Legacy Project Data Center Consistency

- Moved Plotly display-scale interaction down to the base Core Chart Runtime so host group charts, zoom charts, Data Center charts, TER plots and ScientificPlot consumers share one display contract. ScientificCurveSurface keeps the same Core-owned behavior for D3 interactive curves.
- Introduced view-only absolute-value Y projection for ordinary XY/scatter/curve log display without mutating Artifacts, plugin state, input arrays, project persistence or data/CSV exports.
- Removed remaining host-owned raw Plotly render/resize/export paths in favor of `DKDSCharts`.
- Project restore began publishing Artifact deltas after rebuilding legacy `project.datasets` adapters for already-open TOP windows.
- Grouped Data Management and Tools into one system-command visual cluster and renamed Data Center `数据操作` to `编辑`.

# v3.61.8 — Live Artifact Sync / Scoped Workbench Data Reliability

- Main project Artifact mutations now propagate incrementally to already-open dedicated TOP renderers. Data Center, Pulse and other independent workbenches no longer require close/reopen to observe imported or reassigned data.
- Import commits publish exact Artifact deltas, including transient legacy adapters, without rehydrating or reactivating the whole plugin window.
- Source assignment/rename/exclude/remove transactions use the same owner-to-TOP delta channel.
- Plugin-window owner deltas are merged without being echoed back as local plugin changes, preventing project synchronization loops.
- SDK documentation now makes the canonical `data.table` contract explicit: DataTables are columnar (`columns[].values`); plugins needing row objects use `ctx.data.model.rows(table)` instead of assuming private `rows`/`points` shapes.

# v3.61.7 — Core-owned Workbench Import Action / SDK 1.14

- Core now supplies the standard `导入数据` action for every analysis workbench. New workbenches declare `manifest.data.accepts`; plugins no longer own duplicate import buttons or file pickers.
- Workbench-local import opens the shared Import Workbench in scoped mode: assignment is locked to the current plugin, the global target chooser is hidden, and Importer Providers are filtered by compatible `outputTypes`.
- Plugins may place an empty `data-dkds-slot="workbench-import"` marker to choose the standard action position. If no standard page header exists, Core projects the same action into the host contextual toolbar. Embedded SUPER workbenches use the contextual toolbar as well.
- The global shell Import action remains the full multi-target routing entry, so one source can still be assigned to multiple workbenches without duplication. Scoped and global entry points share the same importer/artifact/assignment pipeline.
- Pulse Analysis removes its plugin-owned “添加文件” action and consumes the Core-owned workbench import action.
- SDK validator now requires `data.accepts` for new Plugin API 1.14 workbenches and rejects workbench-owned visible Import Workbench invocation or raw `type=file` inputs. Legacy API 1.10–1.13 workbenches remain load-compatible.
- Plugin API / standalone SDK moves to `1.14.0`; application version moves to `3.61.7`.

# v3.61.6 — Scoped Workbench Data / SDK 1.13

- Standalone `pluginType: workbench` pages now become primary activities by default. External workbenches no longer fall into another plugin's contextual toolbar unless they explicitly request `presentation: toolbar`.
- Core now guarantees a default icon by plugin category; manifest/workspace/page icons remain optional overrides.
- `ScientificCurveSurface` now accepts a normal container and owns its internal SVG, fixing third-party workbenches that correctly use `ctx.ui.scientificPlot` without knowing the Core SVG implementation detail. Hidden/unlaid-out surfaces wait for ResizeObserver rather than entering a render retry loop.
- Added canonical source assignments and scoped `ctx.data.sources`: each imported source is stored once and can be assigned to multiple workbenches; workbench plugins automatically see only their assigned sources. Data Center retains the global catalog and centralized assignment editing. Legacy projects without assignment metadata use wildcard visibility for compatibility.
- Import Workbench now includes a multi-select “数据用途” target chooser. It defaults to the active workbench; choosing no workbench stores data in Data Center only. Re-importing an existing physical source preserves/merges prior usage assignments instead of silently revoking access.
- Data Center adds a usage filter and assignment actions instead of duplicating physical data into per-plugin tabs.
- Interaction Behavior now provides generic DOM delegation; Data Center and Resonance dataset list right-click behavior no longer installs raw `contextmenu` handlers.
- Plugin API / standalone SDK moves to `1.13.0`; Plugin API 1.10/1.11/1.12 packages remain compatible.

# v3.61.5 — Interaction Behavior Core / Plugin API 1.12

- Added `ctx.ui.interactionBehaviors` as a first-class Core/SDK capability. Mouse, keyboard, context-menu, box-selection and wheel policy now share the normalized `click / double-click / context / drag / box / wheel / key` gesture vocabulary.
- Split input semantics from scientific geometry. `ScientificCurveSurface` consumes Interaction Behavior, generic `point / axis / range` manipulators own editable geometry, Selection owns selected entities/ranges, and Command Registry owns semantic state changes.
- Replaced ad-hoc scientific box logic with behavior arbitration: Ctrl+box resolves to `zoom-box`, default box resolves to `select-region`, and plugins may bind a box gesture to a Command without owning pointer capture or selection-rectangle lifecycle.
- Right-click marker policy now resolves through the Core `context-menu` intent. Plugins contribute context actions/Commands; Core owns menu placement, lifecycle, keyboard dismissal and theme. Resonance uses this for lock/unlock/delete and retains Shift+right-click only as a declared high-priority command binding.
- Keyboard behavior uses exact normalized chords, so bindings such as `Ctrl+Z`, `Ctrl+ArrowLeft`, and `Shift+ArrowLeft` are distinct. Interaction Behavior routes keyboard execution through the same Command Registry used by visible actions.
- Resonance undo button and `Ctrl+Z` now converge on `builtin.resonance.undo`; the reference plugin no longer contributes a parallel `ctx.ui.shortcuts` path or feature-specific modified-click/right-click callbacks.
- Updated the standalone SDK, schemas, templates and package guide for Plugin API `1.12.0`. Plugin API 1.10 and 1.11 packages remain accepted when their declared Core requirements are available.
- Added `test-interaction-behavior-v3615.js` to the normal test/check gates to prevent mouse/keyboard/context/box policy from drifting back into first-party plugin implementations.

# v3.61.4 — Generic Direct Manipulation SDK

- Replaced feature-named scientific drag contracts with domain-neutral `ScientificCurveSurface` manipulators. Plugins can declare `point`, `axis`, and `range` geometry and receive one generic preview/commit/reset lifecycle.
- Resonance now maps peak-position editing to a generic point manipulator and FWHM analysis-window editing to a generic X-range manipulator; it no longer depends on `onMarkerDragCommit` or `onWidthWindowCommit`.
- Core owns curve snapping, axis/range constraints, attached-marker fast-path updates, synthetic-click suppression, and atomic range geometry. Feature semantics such as peak, threshold, fit/integration interval, crop window, baseline control, and FWHM remain plugin-owned.
- Width/FWHM measurement rendering is now presentation-only; editable range handles are produced by the generic manipulation layer instead of the measurement feature contract.
- Plugin API / standalone SDK advances to `1.11.0`. Manifest validation accepts both `1.10.0` and `1.11.0` packages for compatibility, while new templates target `1.11.0`.
- Added a dedicated generic-manipulation architecture gate to prevent first-party plugins from reintroducing feature-specific pointer loops or marker/FWHM-named editing APIs.

# v3.61.3 — Core Interaction Contract, Runtime-only Prewarm & Plugin Taxonomy

- ScientificCurveSurface marker dragging now stays on a Core-owned visual fast path and commits domain state once at gesture end; post-drag synthetic clicks are suppressed so dragging cannot silently alter Selection or dim unrelated curves.
- Scientific color scales/legend callbacks are cached by semantic domain, preventing geometry-only or focus renders from rebuilding plugin legends.
- FWHM analysis-window handles now commit one complete `[left, right]` edit atomically, fixing first-one-sided-drag rollback without changing the FWHM definition.
- Dedicated TOP prewarm is runtime-only: Core/plugin/algorithm/chart runtimes (including declared Plotly) are warmed while project restore, activity mount, scientific calculation and chart drawing stay off until the user opens the window.
- First real open after prewarm waits for a second hydrated-ready signal, and hidden dedicated renderers are exempt from Chromium background throttling during declared warmup.
- Plugin Manager now groups plugins by explicit SDK `pluginType`: base/system, data, algorithms, analysis workbenches, tasks/automation, extensions and developer/example.
- Built-in plugin.json metadata is merged as the machine-readable runtime source of truth, matching the external `.dkplugin` package model and exposing window/prewarm/category metadata consistently.
- SDK 1.10 declarations now expose ScientificCurveSurface direct-manipulation commit contracts to third-party plugins. First-party boundary checks now reject raw `window.d3` in addition to raw Plotly/DOM/host infrastructure.

# v3.61.2 — Interaction Hot-Path & First-Open Latency Fixes

- Routed Resonance `Ctrl+Z` through the plugin-owned shortcut contribution so keyboard undo invokes the same undo stack as the visible undo action in both SUPER and dedicated TOP hosts.
- Removed an O(n) per-pointermove sweep-order scan from `ScientificCurveSurface`; normalized curve order is now cached for the lifetime of each render, keeping ordered peak/FWHM snapping on the binary-search hot path.
- Cached rendered marker DOM nodes so peak dragging updates only the active marker and hit target rather than filtering all marker elements on every move.
- Changed interactive peak/FWHM metric commits to invalidate without installing an async placeholder first, then synchronously resolve synchronous metric providers before the authoritative end-of-drag redraw. This removes the preview-to-authoritative FWHM snap-back caused by the previous commit ordering while retaining async provider support.
- TER now opts into the existing manifest-driven dedicated-window prewarm contract. Its hidden TOP renderer can create and parse Plotly before the user's first open instead of paying renderer + Plotly cold-start latency on the click path. Users who explicitly disabled TER prewarm keep that preference.
- Added regression assertions for shortcut ownership, drag hot-path caches, synchronous FWHM commit ordering, and TER prewarm declaration.

# v3.61.1 — Plotly Cartesian Runtime Entry Fix

- Fixed the v3.61.0 regression where every Plotly-backed view rendered blank even though scientific computation completed. The Cartesian npm distribution exposes `plotly-cartesian.min.js`; v3.61.0 incorrectly retained the full-bundle filename `plotly.min.js`.
- Corrected the Cartesian runtime entry consistently in the main renderer, Core Chart Runtime, dedicated TOP runtime and mobile asset sync. This restores Resonance group charts, TER heatmaps/R–V linkage, Pulse/Data Center Plotly views and other shared ScientificPlot consumers without plugin-specific fallbacks.
- Added `test-plotly-cartesian-entry-v3611.js` to `npm test`, `npm run check` and the performance gate. The contract verifies all runtime entry points use `plotly-cartesian.min.js`, rejects the nonexistent path, and checks the installed bundle file when dependencies are present.
- Kept the v3.61 performance work intact: FWHM drag preview remains algorithm-free, ScientificPlot multi-view scheduling remains Core-owned, and dedicated TOP Plotly preload remains non-blocking.

# v3.61.0 — Interaction & Multi-View Rendering Performance

- Split D3 FWHM-window dragging into lightweight visual preview and scientific commit. Pointer-move no longer calls the expensive peak-metric/FWHM getter; the final analysis-window edit is committed once when the handle is released.
- Added a per-sweep voltage-bounds WeakMap in Resonance so high-frequency handle movement does not repeatedly allocate/map/filter the full sweep merely to clamp the preview window.
- Upgraded Core `ScientificPlot` to `2.3.0` with a generic multi-view render scheduler. Plugins may declare `immediate`, `frame`, or `idle` render priority; non-immediate heavy Plotly renders are coalesced per view and dispatched one per animation frame so the browser can paint the primary scientific result before secondary charts finish.
- TER now declares the primary TER heatmap as immediate, the large R–V view as next-frame, and transformed/reduction views as background priority. This is only a view-priority declaration; scheduling remains Core-owned.
- Replaced the full Plotly distribution with the official Cartesian distribution on desktop and mobile. DKDS currently uses Cartesian `scatter`/`heatmap` scientific traces, so unused 3D/map/network modules no longer have to be parsed for the normal plotting path.
- Kept Plotly outside the blocking dedicated-TOP dependency phase, but start a non-awaited Core preload immediately after lightweight dependencies are mounted, before plugin activity-open can request its first chart; post-ready idle warmup remains a promise-reuse fallback. The smaller Cartesian bundle further reduces preload/parse work.
- Automation Runner `1.17.0` adds a real `Scientific multi-view render scheduling` case using Plotly views and verifies deterministic frame-before-idle completion. Repository performance gates also assert the FWHM drag loop cannot re-enter `getMarkerWidth()` and that TER delegates heavy-view scheduling to Core.

# v3.60.0 — Scientific Reactive Dependency Foundation

- Promoted the public Plugin API and standalone SDK to `1.10.0` and added `ctx.data.reactive` as the canonical scientific transaction/dependency surface. Existing compatible 1.x packages remain loadable when their declared Core requirements exist.
- Added Core `Scientific Reactive Runtime 1.0.0` with owner-scoped revisions, batched transactions, derived nodes, frame/microtask effects, dependency signatures, `runLatest()` and stale asynchronous-result rejection.
- Migrated Resonance peak geometry/FWHM-window edits and peak-metric publication onto semantic reactive nodes. Dependent Inspector/group/main views observe revisions instead of relying on a fragile manual refresh order; stale peak-metric results cannot overwrite a newer edit.
- Extended range Selection with semantic targets. D3 `ScientificCurveSurface` can declare marker/entity range selection so a two-dimensional selection rectangle does not degrade into highlighting raw curve samples sharing the same X interval.
- Made TER Feature Runtime the single scientific-plot owner. The analysis service is presentation-free and the dedicated TOP runtime no longer creates a competing ScientificPlot scope.
- Split TER R–V rendering into topology rendering and lightweight selection styling. Selection changes use `restyle/relayout` for opacity, line width, selected points and Vds indicator instead of rebuilding all traces with `Plotly.react()`.
- Dedicated TOP windows still exclude Plotly from the blocking startup dependency chain, but Core now warms a declared Plotly renderer during the first idle period after the window reports ready. This keeps TOP startup fast while avoiding a cold renderer load on the user's first calculation/plot action.
- Added source/runtime regressions for scientific transaction batching, dependency propagation, stale async rejection, Resonance metric/range integration, TER single-owner rendering and lightweight selection updates.
- Automation Runner `1.16.0` adds `Scientific Reactive Dependency` to the in-app acceptance suite.

# v3.59.0 — Unified Table & Interaction Foundation

- Promoted the public Plugin API and standalone SDK to `1.9.0`. API 1.9 formally exposes the shared `TableSurface` and plugin `SettingsSurface`; API 1.8 packages remain accepted by the 1.x compatibility contract.
- Added Core `TableSurface` as the default table infrastructure. Normal application/plugin `<table>` elements are automatically enhanced unless explicitly opted out; plugins may also use `ctx.ui.tables` to mount/bind managed tables.
- `TableSurface` now owns draggable column widths, double-click/command auto-size, sort/restore-original-order, hide/restore columns, copy cell/row/visible table, stable column-state persistence, semantic column keys and targeted dynamic-DOM hydration. Transient anonymous tables do not share persistent state.
- Added Core plugin `SettingsSurface` through `ctx.ui.settings`; Resonance uses it for default Inspector/Group placement and default group-column count without moving those preferences into Host/domain state.
- Unified chart interaction defaults further: Plotly uses hover modebar, scroll zoom and reset/autosize defaults while D3 `ScientificCurveSurface` exposes matching hover navigation; shared tooltip styling uses a dark translucent DKDS surface.
- Reserved normal project Save handling at Core level for dedicated TOP windows. `Ctrl+S` is forwarded to the owning project instead of being a plugin-private shortcut.
- Data Center source actions are aligned under one action menu and source-data rows support the same `修改标签 / 排除(恢复) / 删除` lifecycle from right-click. Resonance data rows consume the same generic `core.data-sources` capability rather than owning source lifetime.
- Resonance interaction fixes: peak detection now creates an undoable edit, box/local detection uses a real two-dimensional range, marker drag distinguishes click from movement, moving a peak invalidates dependent group/metric render state, and source rename no longer gets overwritten by plugin-local metadata.
- Plugin Manager now separates built-in/system plugins from user-installed plugins.
- Automation Runner `1.15.0` adds a real DOM `Unified TableSurface interaction contract`; repository gates add `table-surface:test` and keep Host Neutralization, SDK-detached, TOP/SUPER and scientific parity checks green.

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

- Removed the historical Resonance/Peak/FWHM/TER/Gate/Pulse/Sweep implementation and domain state from `src/generated/runtime/app.js`; the main host now owns only generic project, Artifact, plugin lifecycle, UI, I/O and platform responsibilities.
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
- Resonance remains a true dedicated plugin renderer and does not fall back to a second full `src/generated/runtime/app.js` instance. SUPER and TOP now expose the same major analysis domains while keeping their own presentation shells.
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
