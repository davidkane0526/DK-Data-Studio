# 3.71.121 WIP — Desktop shell density + Pulse Data Center routing/batch

- Desktop project-tab shell density is reduced by exactly 20% through the Desktop Host owner: strip 40→32 px, tab 34→27.2 px, close action 20→16 px and new-project action height 33→26.4 px. Desktop shell-top occupancy follows from 92→84 px; shared and Native Mobile contracts are unchanged.
- Desktop shared ScientificPlot floating navigation keeps its accepted 25.2 px height while its horizontal item width is reduced 20% from 25.2→20.16 px; horizontal chrome padding is reduced proportionally. Shared Core and Native Mobile geometry remain independent.
- Pulse Analysis 2.12.14 accepts generic `data.table` routing in addition to `science.pulse.trace`. Core `dataAssignments` remains the visibility boundary; a plugin-local read-only data adapter projects assigned numeric DataTables into Pulse-readable inputs without mutating canonical Artifacts or changing the byte-frozen analysis service.
- Pulse keeps batch execution as the existing single Header-owned `分析勾选` primary action, which runs the checked-file `analyzeChecked()` Task Runner path. The parameter PRIME remains data/configuration-only and does not duplicate primary actions.
- App/Desktop/Mobile identity advances to 3.71.121 / Android versionCode 261. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.120 WIP — Primary titlebar close direct shutdown

- The primary Desktop window's renderer `windows:closeCurrent` command now enters the shared shutdown coordinator directly. It no longer calls `BrowserWindow.close()` first and depends on the native close event to infer application shutdown.
- Dedicated/reusable plugin windows keep their existing close/hide behavior; this change only clarifies Main Window ownership.
- Windows CI now exercises the exact preload/renderer `closeCurrentWindow()` route used by the custom titlebar close button, in addition to the existing native WM_CLOSE and Portable process-tree tests.
- App/Desktop/Mobile identity advances to 3.71.120 / Android versionCode 260. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.119 WIP — Packaged Windows process-tree exit gate

- Adds a bounded Main Process shutdown drain deadline. A stuck auxiliary window, network socket or service promise can no longer keep the Desktop process alive indefinitely; cleanup owners run concurrently and the final auxiliary assertion has its own shorter bound.
- LAN Update Client now has a shutdown state gate so in-flight probes, WebSocket reconnects, UDP discovery callbacks and periodic checks cannot recreate transports after stop begins.
- LAN SSDP/mDNS discovery now uses a lifecycle epoch. Network-change work that started before shutdown cannot publish or recreate sockets after the epoch is invalidated.
- Windows CI now launches the actual packaged win-unpacked runtime and Portable EXE, sends the normal main-window close request, tracks the complete descendant process lineage, and fails with PID/parent/path/command-line diagnostics if any process remains after the exit deadline.
- App/Desktop/Mobile identity advances to 3.71.119 / Android versionCode 259. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.118 WIP — Deterministic Desktop process exit

- Fixes the remaining Desktop shutdown gap after 3.71.117: auxiliary BrowserWindows are now drained to their real `closed` state instead of merely receiving `close()`.
- LAN updater shutdown is asynchronous and waits for the UDP discovery socket to close; its WebSocket is terminated during final application shutdown. LAN SSDP/mDNS discovery also waits for both datagram sockets to close.
- After project safety, auxiliary windows, LAN Web, MCP, updater transports, pending host requests and SMB-owned child processes are drained, Main Process commits termination with Electron `app.exit(0)`. This avoids re-entering the cancellable BrowserWindow close chain through `app.quit()` after cleanup is already complete.
- App/Desktop/Mobile identity advances to 3.71.118 / Android versionCode 258. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.117 WIP — Desktop Plugin Manager single-row + coordinated shutdown

- Desktop Plugin Manager toolbar now has six explicit single-row slots for search, status, type, Install Plugin, Python/Jupyter authoring and Plugin Folder. The search cell is the only flexible column and action labels remain non-wrapping; Native Mobile keeps its separate responsive projection rules.
- Added a Main Process shutdown coordinator that owns the full Desktop application lifetime. Primary-window close and Electron before-quit now drain background resources before the final quit instead of fire-and-forget cleanup.
- LAN Web and MCP HTTP shutdown closes idle/active connections and is awaited. In-flight SMB PowerShell/nbtstat child processes are tracked by the SMB service and terminated during application shutdown. Pending host capability/MCP requests are rejected and timers cleared as part of the same lifecycle.
- App/Desktop/Mobile identity advances to 3.71.117 / Android versionCode 257. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.116 WIP — Desktop scientific chrome density + Resonance default companions

- Desktop shared scientific floating navigation buttons are reduced exactly 10% from 28 × 28 px to 25.2 × 25.2 px through the Desktop Host geometry contract; the shared Core 28 × 28 baseline and Native Mobile 22.5 × 20.4 touch geometry remain unchanged.
- Resonance Desktop now auto-opens the canonical curve-inspector and group-analysis PRIME surfaces. Native Mobile default visibility is unchanged.
- Generic PRIME autoOpen no longer reapplies defaultPlacement after PortableView has restored a persisted user placement, so default-open companions still respect the user's saved docking choice.
- Synchronized application/runtime/Desktop/Mobile/project-envelope identity at 3.71.116 and Android versionCode 256. SDK remains 1.51.76; Plugin API remains 1.19.0; Unit Templates remain 2.5.38.

# 3.71.115 WIP — Data Center Mobile filter-row acceptance

- Data Center Mobile keeps the hierarchy and field filters in one two-column row across every valid Drawer width; the obsolete ultra-narrow one-column fallback is retired.
- Updated the relevant historical regression gates to the accepted two-column contract without changing Core, Presenter, Unit Templates, scientific algorithms, or plugin domain logic.
- Synchronized application, Mobile, visible shell, project-envelope, plugin-window, README and Android release identity to 3.71.115 / versionCode 255.
- Unit Templates remain 2.5.38 with 41 public Units and 73 Layout recipes; Plugin API remains 1.19.0 and SDK remains 1.51.45.

# 3.71.114 WIP — Unit maturity freeze / production CSS ownership closure

- Froze Unit Templates at 2.5.38 with 41 public Units and 73 Layout recipes; no plugin-specific Unit or Presenter branch was added.
- Added production CSS-dependency auditing and retired duplicate managed PlotGroup/PlotView, parameter-density and responsive geometry ownership from production plugin styles. Vth production presentation is CSS-free; TER/Resonance/Pulse/Data Center retain only bounded source/domain detail where still required.
- Preserved one composition owner across the six production UI plugins and kept Core/Presenter domain-blind. Historical byte-level style locks that conflicted with reviewed Unit ownership were replaced by semantic ownership/parity gates while scientific algorithms, tasks and domain runtimes remain independently frozen.
- Tightened Unit-first SDK authoring: official Workspace/TOP templates expose the Core-owned import slot through Unit composition, the single-page Tool template no longer teaches a redundant PRIMARY navigation label, and TOP authoring documentation explicitly preserves the Plugin API 1.19 main-only PRIMARY / PRIME / SUB boundary.
- Full architecture freeze verification is performed through the complete project check plus Windows/Android CI. Plugin API remains 1.19.0 and Unit Templates remain 2.5.38.

# 3.71.105 WIP — retained Unit List identity across Presenter reparent

- Added a retained Unit List handle with atomic `setItems()` / `items()` and Core-owned ListItem `leading / title / meta` anatomy. Dynamic collections now update the concrete Unit instance instead of rediscovering DOM after Presenter reparenting.
- Data Center now retains the Unit List returned by its production Unit presentation. Project-restored metadata is submitted as bounded item descriptors; the runtime no longer queries `#dcArtifactList` from the old page/global tree after the data-control PRIME moves into the Mobile Drawer.
- Data Center remains metadata-first for catalog rendering; full Artifact payloads are read only for scientific preview/actions.
- App 3.71.105 / Data Center 1.15.37 / SDK 1.51.43 / Unit Templates 2.5.38 / Android versionCode 245.

# 3.71.104 WIP — Data Center Unit-list materialization + Mobile Drawer popup containment

- Data Center artifact rows now materialize through the canonical Unit ListItem contract in an off-DOM stage and commit atomically. One malformed restored metadata record degrades only that row instead of aborting the full catalog after the already-computed object count has been displayed.
- Selectable Unit ListItems synchronously publish the Core `menuItem` component identity, so normal/selected text and surface appearance do not depend on a later mutation-hydration pass.
- Mobile Drawer outside-tap handling now understands logical transient descendants. A ContextMenu/select popup anchored inside the active Drawer remains part of that Drawer even when the popup DOM is portaled under `document.body`; tapping an option no longer toggles the parameter Drawer closed.
- The interaction fix is domain-blind and uses the transient registry anchor relationship rather than plugin IDs or control-specific exceptions. Data Center keeps bounded metadata for catalog paint and full Artifact loading only for operations that require scientific data.
- Added executable regression coverage for atomic Unit-list rendering and portaled popup containment while preserving genuine outside-tap dismissal. SDK 1.51.42 / Unit Templates 2.5.37 remain unchanged.

# 3.71.103 WIP — Mobile orientation reflow + Data Center portrait recovery

- Mobile Presenter now re-runs Drawer intrinsic width fitting whenever an existing projected Drawer is reprojected after viewport/orientation changes. Persisted width remains a user preference, but the live minimum-reasonable-width contract is recomputed so a landscape-to-portrait transition cannot leave parameter controls or non-wrapping actions in an unusably narrow Drawer.
- Unit SplitPane narrow-layout reflow is now axis-aware. Only horizontal (`axis:x`) splits may collapse to a vertical stack at `reflowBelow`; vertical (`axis:y`) scientific/result splits remain a resizable top/bottom grid, preserving the Vth drag seam and allowing the result region to consume the remaining visible block extent in portrait.
- Data Center Mobile keeps its source preview full-width and formula/derived-column tools beside Generic Chart Preview at ordinary portrait widths. The two-column composition now collapses only below 420 CSS px instead of the former 680 px tablet threshold.
- Mobile auto-flow PRIMARY hosts are geometry/scroll owners only and no longer paint a second Material background/shadow behind child Unit Panels. This removes the false horizontal shadow edge that could appear midway through long Data Center content while preserving child-panel material ownership.
- Data Center artifact catalogs are explicitly invalidated on artifact changes and project restore/reset. List rendering consumes bounded metadata snapshots directly rather than projecting them as full Artifacts, so replacing the Artifact Store with the same numeric revision cannot leave a correct object count with an empty sidebar. Full Artifacts remain loaded only for operations that require scientific data.
- Added executable orientation/restore regression coverage, including same-revision Store replacement, Drawer refit, vertical SplitPane preservation, portrait Data Center two-column composition and current Material ownership. Obsolete whole-file CSS SHA gates were replaced by semantic ownership/runtime checks where they blocked legitimate responsive fixes.

# 3.71.102 WIP — Mobile companion projection-shell ownership

- Fixed the real final-DOM cause of the Resonance Mobile Curve Inspector / GroupArea height regression. Mobile Presenter created a `.dkds-mobile-surface-frame` but, for non-Drawer companions, could leave the live Surface beside that frame in the same flex slot. The empty frame and the real Surface were therefore two `flex:1` siblings and split the available companion block size roughly in half.
- Non-Drawer projection now enforces one physical hierarchy: `slot -> mobile surface frame -> live Surface`. Stable projection validation additionally requires `frame.contains(surface)`, so an empty frame plus sibling Surface cannot enter the no-mutation fast path.
- The fix is Core Presenter-only and domain-blind: no Resonance/TER/Pulse/Vth/Data Center branch, plugin CSS override, Unit recipe change, scientific algorithm change, or new height ratio was added.
- Real Chromium validation uses the actual `PluginWorkspace -> PortableView -> Mobile Presenter` runtime. After 200 ms, the right lane/frame/Inspector are all 133 x 441 px and the bottom lane/frame/Group are all 390 x 252 px, with exactly one frame child per slot and both live Surfaces contained by their frames.
- Historical Desktop Visual Closure remains unchanged and non-authoritative for Android pixel acceptance; Desktop presentation code is not modified by this patch.

# 3.71.101 WIP — Mobile semantic-home companion ownership

- Fixed a persisted-state split in Mobile scientific presentation: an Inspector explicitly returned to `right`, or a scientific-secondary Group explicitly returned to `bottom`, now resolves to the same Presenter-owned semantic companion lane as a fresh default state. Historical gesture source no longer selects a second geometry contract for the same visible placement.
- Genuine alternate user placements remain PortableView-owned (`Inspector -> bottom`, `Group -> right`, float/global), preserving placement freedom without allowing canonical home lanes to fork by history.
- The repair is domain-blind and changes no Resonance plugin source/CSS, Unit recipe, scientific algorithm, Desktop split geometry or Plugin API. Historical Desktop Visual Closure remains history only; Android visual acceptance is still required.

# 3.71.100 WIP — Mobile companion SplitController single-owner geometry

- Fixed the remaining Mobile scientific companion height/width regression without any Resonance-specific branch. PluginWorkspace right/bottom companions now have proportional Mobile defaults resolved against the actual Workspace extent (`34%` Inspector lane, `36%` Group lane) while Desktop keeps its established authored pixel geometry.
- Removed the second Mobile CSS geometry owner. Native workspace CSS now consumes the final `SplitController` tokens directly instead of applying an additional `vw/vh` clamp over them. User resizing, rotation and reopen therefore resolve through one state path.
- Mobile companion splits no longer mix their proportional policy with the former fixed `320/240px` reserve caps. Mobile compactability is expressed at the generic Workspace split contract; Unit content remains internal to the allocated shell.
- Advanced the Core Mobile split persistence schema to `workspace-owned-v2` so stale right/bottom sizes produced by the previous dual-owner model cannot keep contaminating the corrected geometry on real devices. Desktop split state is untouched.
- Kept Mobile resize interaction single-owned by the visible Workspace seam. Desktop held-title compatibility remains, but touch clients do not install a second resize gesture.
- Presenter remains content-independent and domain-blind: no Unit descendant measurement, Resonance/TER/Pulse/Vth identity, profile allocator or plugin-local Mobile geometry was added. Historical Desktop Visual Closure remains unchanged.

# 3.71.99 WIP — Universal Mobile companion workspace ownership

- Removed the profile-specific `accepted-scientific` Mobile outer-geometry path. Every semantic `companion-right` / `companion-bottom` now uses one framework contract: Workspace `SplitController` preference -> live viewport bound -> CSS track.
- Removed companion content-driven geometry negotiation from `MobileWebSurfacePresenter`: Unit minima, `scrollHeight`, descendant overflow, ResizeObserver/MutationObserver content feedback and profile allocators cannot write Mobile right/bottom tracks. Unit detail geometry remains internal to the allocated Surface.
- Replaced per-profile Mobile split generations with one Core-owned `MOBILE_SPLIT_STATE_SCHEMA=workspace-owned-v1`, isolating Mobile from Desktop without plugin/profile-specific migration keys.
- Preserved the parameter Drawer as a separate overlay contract; its Unit-intrinsic minimum-width solver does not participate in scientific companion allocation.
- Removed the obsolete `mobile-scientific-workspace-allocation` composition module. `mobile-web-surface.js` is materially smaller and no longer owns companion content geometry.
- No plugin identity branch or Resonance/TER-specific geometry rule was introduced. Historical Desktop Visual Closure remains history only; this WIP requires real Android acceptance.

# 3.71.98 WIP — Mobile companion restoration and Drawer-close isolation

- TER parameter Drawer close no longer passes through companion resync. Releasing a non-companion frame cannot schedule scientific Grid/Unit/chart resize, eliminating the close-time heatmap repaint chain.
- `accepted-scientific-v1` no longer uses the redundant JavaScript shadow track allocator. Workspace split state + Mobile CSS are the single outer-geometry writer.
- Restored the stable 3.71.60 accepted-scientific viewport bounds (`46vw / 58vh`) and scroll-safe companion projection boundary instead of the later `46% / 58% + overflow:hidden` clipping contract.
- Added a Mobile-only `accepted-scientific-v2` split-state generation so stale right/bottom sizes written by the broken Mobile geometry series are invalidated once without touching Desktop or parameter Drawer state.
- No TER/Resonance plugin-ID geometry branches were added.

# 3.71.97 WIP — accepted-scientific workspace-owned Mobile allocation

- Restored the stable outer-geometry ownership model for `accepted-scientific-v1`: right/bottom companion tracks consume only Workspace defaults, user split preference and the live scientific canvas bounds. Unit intrinsic/content geometry remains internal to each Surface.
- The Resonance-compatible scientific path bypasses companion content ResizeObserver/MutationObserver negotiation entirely. No `scrollHeight`, Unit minimum, Drawer width or projected-root lifecycle can feed back into the outer right/bottom tracks.
- Removed the 3.71.96 projection-integrity style guard. Projection lifecycle keeps only a detach observer so a parked PRIME can retire its empty Drawer frame immediately; projected-root style is no longer watched or reasserted.
- The cutover is profile-based (`accepted-scientific-v1`), not plugin-identity based. Other plugin workspaces retain their existing 3.71.96 behavior. Parameter Drawer geometry, single-row parameter Header, final-table fill, safe insets and Material flattening are unchanged.

# 3.71.96 WIP — Mobile projection integrity / immediate Drawer retirement

- Mobile Presenter now treats projected Surface outer geometry as a live invariant instead of a one-time mount normalization. Scientific companion roots are explicit `height:100%` flex children, and a root-style MutationObserver reasserts only Presenter-owned outer geometry if a later Unit/Portable lifecycle rewrites it.
- A projected PRIME/companion moved out of its Mobile frame is detected in the same DOM microtask and its obsolete frame is retired immediately. This removes the transient blank Drawer shell seen when TER parameters close before the next Presentation snapshot.
- The projection guard ignores ordinary descendant chart DOM mutations; it reacts only to projected-root style changes or actual root detachment, preserving render performance.
- No plugin identity branch, Resonance-specific size, TER-specific close path, Drawer occupancy token or Desktop geometry change was introduced. Historical Desktop Visual Closure records remain unchanged; this patch is Mobile-only.
- Chromium runtime evidence uses the generated `ui-infrastructure.js`: a 260 px Resonance-style companion root remains 260 px after a forced `height:auto` rewrite, and moving a projected PRIME to parking removes its frame before the next Presentation snapshot.

# 3.71.95 WIP — Mobile companion root fill / parameter final-table fill / Material depth

- Fixed the actual projected-root fill chain for Mobile scientific companions. Right/bottom Presenter frames are explicit flex shells and the projected Surface root consumes the complete frame; the existing internal Inspector/Group body remains the only scroll owner. No Resonance card sizing or domain-specific Core branch was added.
- Restored parameter PRIME fill-height while projected into the Mobile Drawer. The Drawer content host now allocates a `minmax(0,1fr)` content track plus the terminal safe row, allowing existing Unit `fill-rows` layouts such as Pulse Sampler to expand their final data table to the bottom of the current visible Drawer.
- Restored the Material single-depth contract through the Drawer scroll/content wrappers. Projected parameter PRIME roots are transparent, borderless and shadowless inside the outer Drawer Material, removing the visible inner background edge/layer.
- Kept the accepted parameter Header unchanged: Vd/Vs/Vg remain in the original single-row structure.
- Real Chromium layout evidence on final authored CSS: at a 744×420 scientific viewport, Inspector/Group roots exactly consume their Presenter frames and their internal bodies scroll independently; in a 330×808 parameter Drawer fixture, the final fill-row table extends to the PRIME bottom and the projected PRIME computes `box-shadow:none`. Android hardware remains the release acceptance authority.

# 3.71.94 WIP — Mobile final-visible geometry / single-row parameter Header

- 3.71.92 and 3.71.93 are treated as failed Android visual candidates. Final Chromium layout showed that preserving two 220 px companion shell minima plus the 7 px seam required 471 px inside a 420 px scientific canvas, so GroupArea was necessarily pushed below the visible workspace.
- Mobile scientific companions now fit both outer shells inside the live canvas when the comfortable minima cannot coexist. Curve Inspector and GroupArea keep their frames visible; each Unit's internal scroll body owns content overflow. The scientific canvas itself no longer grows merely to preserve those comfortable shell minima.
- Parameter Header anatomy is preserved as the accepted single-row UI. The generic narrow-Drawer compact-stack fallback explicitly excludes `presentationPurpose=parameters`; Vd/Vs/Vg remain on the same row and intrinsic constraints raise the Drawer minimum instead of changing Header structure. No Pulse-specific Mobile CSS or fixed device-width threshold was added.
- Parameter breathing room is enforced at the final Drawer clipping boundary. A shared Drawer content wrapper owns the physical 6 px top/inline safe inset and a real scroll-end node owns the 6 px bottom extent; descendant overflow beyond the projected PRIME is measured so the terminal breathing room remains after the actual content. The overall Drawer scrollbar remains hidden.
- Active Mobile-projected Surface roots remain Presenter-owned for outer geometry; generic Unit reflow may settle managed descendants but cannot replay a pre-projection root recipe such as `height:100%`.
- Extracted pure Mobile Presenter geometry helpers into `mobile-web-surface-geometry.js` to keep the Presenter below the repository 48 KiB module limit without weakening the architecture gate.

## 3.71.93 WIP — Mobile effective geometry closure

- Fixed the projected-PRIME double-writer path: Drawer measurement settles descendant Units without replaying root Layout geometry such as `height:100%`.
- Separated hard block minimum from explicit preferred block size, so accepted Workspace preferences remain effective unless a real descendant Unit publishes a preference.
- Scientific companion hard minima now create vertical canvas scroll extent on short viewports instead of being silently clipped by `overflow:hidden`.
- Header Unit publishes live composite heading/actions inline geometry, covering nested Pulse Sampler Vd/Vs/Vg tabs without plugin-specific width constants.
- Desktop Visual Closure history and desktop presentation ownership remain unchanged.

# v3.71.92 WIP

- Fixed Mobile scientific companion ownership: internal Unit scrollHeight no longer feeds Presenter outer block allocation; right companions consume only published Unit inline/block constraints.
- Restored parameter PRIME as the sole four-side 6 px content-inset owner; removed Presenter bottom-padding handoff and terminal scroll spacer.
- Tabs intrinsic containment now targets the real atomic Tabs component; Drawer fitting also enforces ordinary Unit content against the PRIME end inset.
- Parameter Drawer remains a top-layer overlay, keeps the overall scrollbar hidden, and preserves the RAF-only width drag hot path.

# 3.71.91 WIP — Mobile top-layer parameter overlay / intrinsic + scroll ownership closure

- Parameter Drawer is now a true top-layer Mobile overlay. Opening or resizing parameters no longer publishes Drawer occupancy into the scientific canvas, no longer reduces the right companion track, and no longer shifts/narrows the bottom GroupArea. Inspector/Group keep their Presenter allocations underneath the Drawer; the Drawer overlay/frame renders above scientific panels.
- Right/bottom companion projection shells are geometry-only (`overflow:hidden`). Resonance Desktop floating/docked width/height rules are explicitly excluded while a surface carries a Mobile presentation region, leaving exactly one internal Inspector/Group scroll owner.
- Parameter scroll-end spacing is now physical scroll extent rather than an assumed PRIME box padding: the projected parameter PRIME hands off its 6 px block-end inset to a real Presenter-owned terminal spacer after the PRIME. This preserves the same visible 6 px bottom breathing room even when plugin content contains `height:100%` / fill children.
- Tabs publish a generic hard inline intrinsic constraint through Unit Templates. Drawer fitting also checks published-target containment against the parameter PRIME content edge, so complete Vd/Vs/Vg anatomy can widen the Drawer instead of being clipped by `overflow-x:hidden`. An already-open Drawer refits when Unit inline constraints change.
- Drawer width persistence advances to generation v19. The 25% live-page floor remains a lower bound only; legends remain width followers and never own parameter width. Width dragging stays RAF-only on the move path and no longer drives companion occupancy/reflow because the Drawer and companions are geometrically independent.
- Overall Mobile parameter-list scrollbar remains hidden while touch/wheel scrolling remains active. Core still contains no TER/Resonance/Pulse/Vth identity branch. App **3.71.91 WIP**; Android `versionCode` **231**; SDK **1.51.38**; Unit Templates **2.5.34**; Plugin API **1.19.0**; Resonance **3.63.8**.

# 3.71.90 WIP — Mobile companion live-fit / parameter Drawer scroll + drag closure

- Parameter Drawer keeps one Presenter-owned vertical gesture-scroll viewport but removes its overall right scrollbar on Mobile (`scrollbar-width:none` / hidden WebKit scrollbar). The parameter PRIME remains the sole four-side content-inset owner at 6 px; projected parameter content now keeps natural block height so the 6 px bottom inset is visible at the end of the list instead of being swallowed by a forced viewport-height minimum.
- Drawer resize hot path is animation-frame coalesced. Pointer/touch move now writes only the Drawer width and the Presenter occupancy token; managed Grid / Unit / scientific-chart reflow is deferred until gesture end, avoiding full companion/chart resize work on every move.
- Companion right/bottom projection shells are no longer outer scroll owners. Their slots keep one 6 px Presenter safe inset and the projected Unit owns internal scrolling. Stale slot/frame scroll offsets are cleared only when entering a companion region, preventing a previous shell scroll position from clipping the newly projected Inspector/Group surface.
- Generic companion block negotiation now combines published hard Unit minima with live preferred size from canonical internal vertical scroll owners. Presenter observes both DOM mutations and Unit geometry resize, so text wrapping, Grid column changes and scientific-plot resize can renegotiate Inspector/Group height after first open rather than freezing the initial measurement.
- No Resonance/TER/Pulse/Vth identity was added to Core geometry code. App **3.71.90 WIP**; Android `versionCode` **230**; SDK **1.51.37**; Unit Templates **2.5.33**; Plugin API **1.19.0**.

# 3.71.89 WIP — Mobile companion safe-area / visible parameter trailing inset

- Fixed the remaining real-device parameter trailing-edge failure without adding a second content-inset owner. The Mobile Drawer scroll host now reserves a **3 px Presenter-owned scrollbar chrome lane** on the trailing edge; parameter-purpose PRIME still owns the only content inset (**6 px on all four sides**), so Android/WebView overlay scrollbar chrome can no longer visually consume the right inset.
- Active right/bottom companion Surfaces now participate in sibling allocation only through generic Unit intrinsic constraints. `MobileWebSurfacePresenter` bounds the Drawer by the largest active companion inline minimum and reconciles an already-open Drawer when a companion becomes visible; no Resonance/plugin identity is interpreted by Core.
- Resonance Curve Inspector migrates its accepted 320 px inline / 220 px block minimum into `PRIME.detailGeometry`; Resonance Group PRIME publishes a 220 px block minimum, while the generic GroupArea controller publishes its `minItemWidth` as a one-item inline constraint. These are constraints, not Mobile width/height writes.
- Bottom companions now use a **real uncovered viewport** (`margin-inline-start` from the Presenter-owned Drawer occupancy) instead of full-width layout plus inner padding. Drawer occupancy changes schedule generic managed-Grid/scientific-plot reflow so GroupArea recomputes columns against the actually visible width.
- The active right companion block minimum feeds the Mobile primary-track reserve, preventing a bottom GroupArea from starving Curve Inspector below its accepted block minimum when the viewport can satisfy both. Added bounded non-parameter `PRIME.detailGeometry.minContentBlockPx` to the Unit/SDK contract; parameter PRIME explicitly rejects it.
- App **3.71.89 WIP**; Android `versionCode` **229**; SDK **1.51.36**; Unit Templates **2.5.32**; Plugin API **1.19.0**; Resonance **3.63.7**.

# 3.71.88 WIP — Mobile parameter Surface width / legend / companion closure

- Mobile parameter Drawers now have one product-level hard lower bound: **25% of the live page/viewport width**. This is a minimum only; the final first-open width still comes from the live Unit intrinsic-constraint resolver and may grow when real controls require it. Persisted widths remain preferences and move to Drawer generation v18.
- Resonance no longer declares `minContentInlinePx:361` for its parameter PRIME. Parameter-purpose legends are excluded from inline intrinsic-width ownership and instead follow the assigned Drawer: at most three rows, adapting to two/one rows as space grows, with horizontal overflow and hidden scrollbar when three rows are insufficient. Resonance plugin CSS no longer owns legend flow.
- Pulse Analysis no longer owns a 310/260 px parameter-width breakpoint. Its narrow form keeps a fluid two-column accepted Unit layout, while the horizontal file toolbar contributes only its real live `scrollWidth` through the shared intrinsic-overflow solver. The Drawer therefore shrinks until actual action content—not a magic plugin threshold—requires more room.
- Pulse Designer parameter content headers may wrap under width pressure; compact tabs keep their real intrinsic width, the Drawer scroll viewport reserves a stable scrollbar gutter, and the 12 px resize hit target now straddles the outer Drawer edge (`right:-6px`) instead of covering the inner parameter inset. This prevents the trailing `Vg` tab from being clipped even after the user widens the Drawer.
- Mobile Presenter publishes one `--dkds-mobile-drawer-occupied` token from the final Drawer allocation. Right companion tracks subtract that occupancy, and bottom companions receive matching leading space while the Drawer is open, preventing Resonance Curve Inspector / GroupArea from being hidden underneath the fixed parameter Surface.
- App **3.71.88 WIP**; Android `versionCode` **228**; SDK **1.51.35**; Unit Templates **2.5.31**; Plugin API **1.19.0**. Pulse Analysis **2.12.12**, Resonance **3.63.6**.

# 3.71.87 WIP — Uniform parameter PRIME inset / TER desktop spacing correction

- Parameter-purpose PRIME outer spacing is now a single Core-owned contract on both Desktop and Mobile: **6 px on all four sides** from `BASE_METRICS.surface.parameterPrimeInsetPx`.
- TER no longer owns a private 12 px parameter PRIME inset; its outer blank area is reduced by exactly **50%**. Pulse Sampler's former 14 px and Resonance's former 10 px parameter outer inset overrides are also removed so every parameter list follows the same rule.
- Pulse Analysis and Vth, which previously had no plugin-specific outer inset declaration, now receive the same canonical 6 px spacing automatically. Internal Panel/Section padding remains independent and may still differ when it belongs to the inner Unit anatomy.
- Parameter plugins may still compose Units freely and may declare accepted `minContentInlinePx`, responsive/layout detail, Panel anatomy and other documented tunables, but `presentationPurpose:'parameters'` now rejects `detailGeometry.contentInsetPx` to prevent a second outer-spacing owner. Non-parameter PRIME surfaces retain bounded `contentInsetPx`.
- App **3.71.87 WIP**; Android `versionCode` **227**; SDK **1.51.34**; Unit Templates **2.5.30**; Plugin API **1.19.0**. TER **3.14.8**, Pulse Sampler **1.9.31**, Resonance **3.63.5**.

# 3.71.86 WIP — Unit geometry constraint registry / bounded configuration policy

- Added one generic `unit-geometry-constraints` subsystem for both inline and block axes. Layout, PRIME and PlotGroup/GroupArea publish Unit-owned intrinsic constraints; Mobile Presenter consumes generic resolvers only.
- Mobile Presenter no longer interprets Layout-private recipe markers/reflow hooks or Unit-private constraint properties to allocate a Surface. Generic Unit reflow/constraint interpretation stays behind the composition boundary.
- Formalized `single-writer-bounded-configuration-v1`: plugins keep composition freedom through explicitly accepted Unit variants/detail/responsive geometry, while Units remain the sole internal geometry writers and Presenter remains the sole final outer-Surface allocator. Persisted user geometry is preference-only.
- Exposed read-only `units.geometryOwnershipPolicy` through the SDK and generated Unit reference so third-party authors can distinguish immutable ownership from bounded tunables. No plugin-specific Core branch or private Mobile CSS was added.
- App **3.71.86 WIP**; Android `versionCode` **226**; SDK **1.51.33**; Unit Templates **2.5.29**; Plugin API **1.19.0** unchanged.

# 3.71.85 WIP — Mobile block-axis single owner / PRIMARY scroll ownership

- GroupArea/PlotGroup now publishes live Unit block constraints. One complete row is the minimum; all current rows at accepted PlotView aspect/min/max geometry are the preferred block size.
- Mobile Presenter consumes only the generic Unit block contract and owns the final `companion-bottom` lane. The historical semantic `58vh / 680px` cap is removed; available viewport space and a real PRIMARY reserve form the final clamp.
- Mobile bottom drag writes `--dkds-mobile-user-bottom-track` as a preference only. PortableView no longer applies its own `620px / .72` final cap.
- PlotGroup Unit adoption publishes accepted PlotView detail geometry before re-solving the block contract, so Resonance/TER and future scientific groups share the same path with no plugin identity in Core.
- Mobile platform CSS no longer makes every `.dkds-plugin-canvas-center` an `overflow:auto` owner. Only Workspace `primaryScroll:'auto'` grants that outer scroll viewport; contained Vth-style workspaces remain internally scroll-owned.
- App **3.71.85 WIP**; Android `versionCode` **225**; SDK **1.51.32**; Unit Templates **2.5.28**; Plugin API **1.19.0** unchanged.

# 3.71.84 WIP — Mobile geometry single-owner / Unit intrinsic minimum Phase 1

- Replaced the Mobile parameter Drawer's Presenter-owned width heuristics with a Unit-constraint resolver. `MobileWebSurfacePresenter` no longer imports Layout recipes, knows `form-grid-2`, estimates plugin button/title text, or invents a generic two-column pixel target.
- `LayoutUnitRuntime` now publishes the real local inline constraint implied by its responsive states and always evaluates those states against the **actual allocated width**. Removed the native-Drawer fake-width path that could let Core see ~311 px while plugin `responsiveGeometry` / CSS saw a smaller real width.
- Added bounded PRIME `detailGeometry.minContentInlinePx`. A plugin may declare an accepted content minimum, but the PRIME Unit owns the inset and publishes one total Surface constraint; the plugin does not write Drawer width. Resonance migrates its accepted parameter composition to this contract.
- Drawer saved width is now strictly a user preference. On every open the live Unit tree recomputes its minimum, then the saved preference is clamped to that minimum and the current viewport. Drawer persistence advances to `dkds.mobile.drawer-width.v17.*`.
- Removed the Drawer scroll viewport's extra 6 px content padding. The projected PRIME/Surface is the sole outer content-inset owner; nested Panel padding remains internal Panel geometry. This removes the previous Drawer + PRIME + Panel triple-inset stack.
- Mobile `.dkds-analysis-main` no longer owns a second scroll container, eliminating one source of right-side scrollbar/gutter geometry competing with the Unit workspace scroll owners. The existing Unit Workspace PRIMARY end-inset contract is intentionally unchanged in this Phase 1 WIP and will be reviewed separately against the Vth real-device screenshot.
- Context menus/select popups now have one Core registry and a real toggle-close path. Mobile semantic projection dismisses open transient menus before a Surface is hidden/reprojected, preventing a popup layer from surviving after its owning menu/surface has closed.
- Added executable acceptance for the new ownership model: canonical `form-grid-2` publishes 311 px as its last-resort boundary; a nested 311 px local minimum behind a 12 px PRIME inset resolves to a 335 px Drawer without any Presenter knowledge of the inset/recipe; PRIME content minima are consumed as constraints rather than width writes.
- This phase deliberately does **not** claim closure of Resonance bottom-companion clipping or the remaining Vth PRIMARY right-side inset. Those are the block-axis / PRIMARY-edge ownership phase, not another inline-width patch.
- App **3.71.84 WIP**; Android `versionCode` **224**; SDK **1.51.31**; Unit Templates **2.5.27**; Plugin API **1.19.0** unchanged; Resonance Workbench **3.63.4**.

# 3.71.83 WIP — TER live Artifact hydration regression fix

- Fixed the v3.71.82 regression where TER opened with `当前项目没有可用于 TER_max 的数据。` even though the active project contained valid transport data.
- Root cause: v3.71.82 correctly made the dedicated-window project envelope data-empty for performance, but TER itself did not declare `artifactHydration:'live'`; therefore the real open path sent neither `project.dataModel` rows nor an `artifactSnapshot`.
- TER now declares live Artifact hydration in the machine manifest, embedded runtime manifest, and runtime Activity contract. The first-open path continues to avoid `captureActiveProjectTab()` / `makeProject()` and keeps `project.dataModel` empty; scientific data arrives only through the live Artifact snapshot/revision channel.
- Strengthened the existing v3.71.82 hot-path regression test to read the real TER manifest instead of mocking a `live` hydration contract that production did not actually have. No new broad gate was added.
- TER Analysis **3.14.7**; App **3.71.83**; Android `versionCode` **223**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.82 WIP — TER click-path serialization removal + reusable-hide isolation

- Removed synchronous full-project `captureActiveProjectTab()` and `makeProject()` from the dedicated TER open path. First open now sends a lightweight project envelope containing only the TER plugin slice; scientific data travels through the existing live Artifact snapshot/capability path.
- Runtime-only dedicated prewarm no longer captures or serializes the active project. It receives an empty project envelope and warms renderer/Core/plugin/chart code only.
- Advanced the plugin prewarm preference namespace to `dkds.plugin.prewarm.v2` so stale WIP-era TER `prewarm:false` values cannot silently keep the first TER renderer cold.
- Added an Artifact Store revision token to dedicated-window bootstrap. The Electron main process uses that token instead of JSON-stringifying and SHA1-hashing the complete live Artifact snapshot on every open/promotion.
- Reusable TOP close/hide now flushes only the target plugin state: no Artifact recovery delta, no full project snapshot and no owner-side `captureActiveProjectTab()`. Real `beforeunload` still retains the full recovery snapshot path.
- The dedicated activity snapshot merger no longer serializes the whole owner project before/after applying a plugin-window state update. Genuine live Artifact changes still use the normal targeted Artifact event path.
- Added executable `test-v37182-ter-window-hotpath.js` that fails if TER open/prewarm calls full-project serialization, if hide carries artifacts/full project, or if the owner hide merge wakes global data listeners.
- TER Analysis **3.14.6**; App **3.71.82**; Android `versionCode` **222**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.80 WIP — TER first-open prewarm + close isolation

- Restored `builtin.ter-analysis` dedicated-window `prewarm:true`. Historical accepted behavior used runtime-only TER prewarm so the hidden renderer warms Core/plugin/chart runtimes without project restore, TER calculation or chart drawing; later stale performance gates had incorrectly frozen `prewarm:false`, reintroducing first-click cold-start latency. Explicit user prewarm opt-out remains supported by the existing Plugin Manager preference layer.
- Corrected dedicated-window final snapshot merge semantics. Activity windows already push Artifact deltas live, but their final recovery snapshot can contain the same accumulated upserts. The owner previously used unconditional `upsert()`, marked every replay as changed, emitted global `data:artifacts-changed`, and therefore caused Resonance to refresh all data plots when TER was merely closed. Artifact replay is now deduplicated through the canonical store `publish(...,{dedupe:true})` path.
- Removed unconditional `renderAll()` + `scheduleMainPlotRelayout()` from `payload.final`. Final snapshot delivery is a persistence boundary, not a global visual invalidation. Genuine new Artifact changes still emit the normal data event exactly when data actually changed.
- Embedded analysis-page close now restores the active SUPER with `{invoke:false,forceEmbedded:true}` instead of invoking its `onActivate`/domain render path again.
- Cleaned the two stale gates responsible for preserving the TER regression: the unrelated v3.67.10 theme/split gate no longer owns TER prewarm policy, while the interaction-performance gate now verifies the useful contract: TER opts into **runtime-only** prewarm and that prewarm branch remains domain-inert until a real open. Added an executable v3.71.80 close-isolation test using the real Artifact store and real dedicated snapshot merge.
- TER Analysis **3.14.5**; App **3.71.80**; Android `versionCode` **220**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged. Android compilation still runs no automatic pre-build tests/typecheck/Gradle-help preflight.

# 3.71.79 WIP — Mobile Drawer + Desktop regression rollback

- Mobile parameter Drawer minimum now preserves two actual canonical parameter tracks (128 px × 2 + fixed 9 px Unit gap) while controls remain shrinkable. Native Drawer Unit reflow keeps two-column recipes active without changing Desktop breakpoints.
- Drawer inner inset is equal on all four sides and reduced from 10 px to 6 px; native scrollbar is back on the physical right edge with no extra outside inset.
- Core mobile table surfaces (`dkds-table-surface-host` / `dkds-table-wrap` / `analysis-table-wrap`) keep a 160 px empty-body minimum so an empty table cannot collapse to only its header.
- Restored Desktop `PluginWorkspace` and `SplitController` sources byte-for-byte to the 3.71.69 accepted baseline. Reverted the shared TER parameter layout and shared Unit synchronous reflow changes that were introduced only for Mobile work. The only TER parameter composition change is now guarded by `ctx.runtime.isNativeClient===true`.
- Resonance committed box selection now explicitly requests main-surface repaint so the selected region/highlight persists after the transient drag overlay disappears.
- SMB service dialog opts into a generic `dim` overlay effect that keeps the dim layer but disables background optical blur.
- Android build path still runs no pre-build tests/typecheck/Gradle-help preflight.
- App **3.71.79**, Android `versionCode` **219**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.78 WIP — Mobile Drawer two-column minimum / equal inset / left-edge scrollbar

- Corrected the v3.71.77 minimum-width rule: the Drawer may no longer shrink into the canonical one-column parameter state. The parent-owned minimum is now derived from the actual Unit recipes. `form-grid` / `form-grid-2` switch to one column at `<=310px`, so the semantic content floor is `311px`; the final frame also reserves the canonical equal content inset, 1px frame borders and the native scrollbar width. On the 744 CSS px acceptance fixture the ordinary result is **336 CSS px**. This is a Unit-derived result, not a `vw`/percentage target.
- Button sizing now protects a **pair** of visible actions, not only the widest individual button. A normal parameter/action composition can therefore remain at least two-up; ordinary Input/Select values still do not own Drawer width. Title text remains non-compressible.
- Replaced the old direct-node Drawer scroll ownership with a dedicated `.dkds-mobile-drawer-scroll` viewport. The frame itself has **zero padding**. The scroll viewport owns one identical padding value on **top/right/bottom/left**, so the four outer content insets are the same.
- The dedicated scroll viewport uses RTL only at the scroll-owner boundary to place the vertical scrollbar on the **physical left edge** of the Drawer. The projected parameter surface immediately restores `direction:ltr`, so parameter content/order stays normal. Because the frame itself has no padding, there is no blank strip between the panel edge and scrollbar.
- Scrollbar Material paint moved to the real `.dkds-mobile-drawer-scroll` owner. The projected plugin surface no longer creates a second Drawer scrollbar.
- Drawer persistence advances to `v15.<activityId>:<surfaceId>` so v14 widths that were allowed to resolve to a single-column-capable minimum cannot reopen. Curve Inspector geometry remains untouched.
- The active Drawer acceptance now verifies the actual two-column Unit transition, usable width after padding/border/scrollbar reserves, complete button/title text, the dedicated scroll-host runtime structure, four-side equal inset ownership and left-edge scrollbar direction. `mobile:layout:acceptance` and `styles:build` pass.
- App **3.71.78**, Android `versionCode` **218**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.77 WIP — Mobile Drawer readable compact width / symmetric inset

- Corrected the over-correction introduced by 3.71.76: parent-owned Drawer sizing was compact but could collapse ordinary controls too aggressively. The compact semantic track now reuses the established Workspace density and resolves to about 244 CSS px for ordinary parameter content on the 744 CSS px acceptance viewport, without using viewport percentages.
- All visible Drawer button labels are now non-compressible, not only primary/fill actions. Unit rows may reflow, but the button itself keeps its complete text. Semantic Drawer titles are also non-compressible. Ordinary input/select values remain shrinkable and cannot widen the panel.
- Removed visible buttons from the generic shrinkable-control normalization pass. Fixed Unit gaps/padding remain untouched.
- Added real symmetric Drawer frame inline inset using the canonical `--dkds-visual-pad-x` token, so the right breathing room matches the left while the resize handle stays on the outer edge.
- Drawer persistence advances to `v14.<activityId>:<surfaceId>` so the too-narrow v13 widths cannot reopen. Curve Inspector ownership/width is unchanged in this round.
- Replaced the active Drawer acceptance with `test-v37177-mobile-drawer-readable-width.js`, which executes the real Presenter and checks readable compact width, long ordinary values, all button labels, titles, fixed spacing, symmetric inset, and v14 persistence. `mobile:layout:acceptance` passes.
- App **3.71.77**, Android `versionCode` **217**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.75 WIP — Mobile Drawer hard-constraint correction

- Real-device v3.71.74 disproved persistence-scope as the complete root cause: ordinary field/check labels were still hard single-line width owners, so long labels could force every compact candidate to fail and return full available width.
- Drawer width ownership now excludes ordinary field/check labels and generic role-button wrappers. Labels may wrap; input/select values do not own panel width.
- Fixed Unit gaps/padding remain untouched. Real structural/control boundary overflow and actual Action button text clipping remain hard constraints.
- Drawer persistence advances to `v12.<activityId>:<surfaceId>` so v11 full-width results cannot reopen.
- Curve Inspector remains independent at Mobile 304 px / Desktop 390 px.
- Replaced the stale gate that required field labels to own width with behavior checks matching the actual user contract.
- App **3.71.75**, Android `versionCode` **216**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.74 WIP — Mobile compact Drawer state isolation / Curve Inspector width correction

- Fixed the actual cross-plugin cause of the "all parameter panels reopen nearly full-page" regression. Every first-party parameter surface uses the semantic id `data-control`; v3.71.73 persisted Drawer width only by `surfaceId`, so one wide/failed/user-dragged `dkds.mobile.drawer-width.v10.data-control` value was reused by Resonance, TER, Vth and every other plugin. Drawer persistence is now **activity/workspace scoped** (`v11.<activityId>:<surfaceId>`), so one plugin can no longer widen another, and all failed/shared v10 widths are automatically invalidated.
- Kept the minimum-width definition content-first and non-greedy: shrinkable fields/inputs/selects/wrappers may contract and Unit layouts may drop columns, while canonical Surface padding, Unit/control gaps, required labels/structure and complete primary/fill action text remain non-compressible. The fitter still uses the first valid responsive composition rather than a viewport percentage or binary-search assumption.
- Expanded Drawer normalization to structural wrappers as well as individual controls. Fixed Desktop-authored intrinsic widths are capped to the assigned Drawer track instead of being allowed to make the parent wider; the fitter still never rewrites `gap`, `row-gap`, `column-gap` or padding.
- Curve Inspector remains independent from the Drawer fitter. On native Mobile only, the canonical right-track first-open size is now **304 px instead of 390 px** for Resonance's accepted geometry (about **22% narrower**), while Desktop remains 390 px. Mobile right-split persistence moves to `compact-right-v1` so an older 390 px Mobile preference cannot immediately restore the wider Inspector. Seam dragging/persistence remains owned by the existing SplitController.
- Added `test-v37174-mobile-compact-surface-geometry.js`, which executes workspace-scoped persistence isolation, non-greedy control writes without spacing compression, the non-monotonic first-valid Drawer solver, and the real Mobile right-track resolver. This is a targeted runtime acceptance, not a regex/visual gate and not a claim of Android pixel acceptance.
- Android build behavior is unchanged from 3.71.71: APK compilation still performs no automatic test/typecheck/Gradle-help preflight.
- App **3.71.74**, Android `versionCode` **215**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.73 WIP — Mobile Drawer minimum-width correction / Inspector rollback / acceptance cleanup

- Rolled the Resonance Curve Inspector back out of the parameter-Drawer width experiment. The Mobile Presenter no longer calls any content-fit solver for `companion-right`, no longer writes a runtime Inspector minimum/default, and no longer changes the canonical right SplitController from Drawer measurement. The right split and PortableView Mobile state contract are restored to their pre-`content-fit-v2` / `mobile.m4` forms.
- Replaced the Drawer binary-search fitter with an ascending **first-valid responsive composition** search. Responsive layouts are not monotonic: a narrower width can become valid when a Unit drops a column, so binary search could incorrectly skip the compact valid interval and select a nearly full-page width.
- Corrected the non-greedy control rule. Input/select/field geometry may shrink with the Drawer and may reflow through Unit recipes, but the fitter no longer assigns `width:100%` to shrinkable controls. Ordinary values/options do not own panel width.
- Made spacing explicitly non-compressible. The Drawer fitter never writes `gap`, `row-gap` or `column-gap`, and Mobile Drawer CSS no longer replaces canonical Unit/action/label spacing with smaller values. Unit padding/gaps, required labels/structure, and complete primary/fill action text are part of the true minimum-width constraint.
- Advanced parameter-Drawer persistence to `dkds.mobile.drawer-width.v10.*` so widths learned by the failed greedy/binary-search generations cannot reopen. This affects Drawer state only; Inspector placement/width state is intentionally not versioned by this task.
- Preserved Pulse Sampler's 3+3 tablet composition and Pulse Analysis's single sequential result flow from 3.71.72. Historical Pulse tests were corrected to the current shared `visual` flow owner instead of reverting production composition to satisfy stale expectations.
- Removed the legacy regex/static **visual gate** from automatic `test`, `check`, `dist` and runtime automation paths. The source checker remains only as optional `visual:static-audit`; it is no longer accepted as proof that a layout is visually correct. The remaining Mobile layout acceptance executes the real Drawer solver, a deliberately non-monotonic responsive case, Inspector ownership rules and the Pulse flow contracts. Style ownership checks are reported as audits, not visual acceptance.
- The v3.71.72 browser-style acceptance claim is explicitly **not carried forward as evidence**. Real-device feedback disproved that release, and the current environment cannot provide trustworthy Android/WebView visual acceptance. This WIP reports only executable contract/runtime acceptance plus source rollback parity; final UI acceptance remains the user's Android device.
- Android build behavior from 3.71.71 is unchanged: APK compilation still has no automatic `mobile:test`, `typecheck` or Gradle `help` preflight.
- App **3.71.73**, Android `versionCode` **214**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.72 WIP — Mobile semantic width solver / hierarchy root-cause correction

- Reworked the Mobile Drawer/Inspector width solver after real-device feedback showed 3.71.70 had not fixed the visible regressions. The concrete root cause was that candidate widths were measured synchronously while Unit responsive reflow was deferred to `ResizeObserver`, so the probe could measure stale desktop/tablet column geometry and widen the surface even though the Unit would have collapsed at that width.
- `LayoutUnitRuntime` now exposes an internal synchronous reflow hook for an already-mounted Unit layout. `MobileWebSurfacePresenter` invokes nested Unit reflow twice, parent-first, for every width candidate before checking overflow. `ResizeObserver` remains the ordinary runtime listener; the hook only closes the synchronous measurement race.
- Made Mobile width probing explicitly non-greedy. Projected text/select/field/action controls are normalized to `min-width:0`, `max-width:100%` and bounded field width while measured. Ordinary field values/options no longer own the panel width. Primary/action text and explicit structural readability groups remain hard width requirements, so a compact surface cannot win by clipping an important filled button.
- Drawer persistence advanced to `dkds.mobile.drawer-width.v9.*`. The Mobile right split now uses a `content-fit-v2` state generation, and PortableView Mobile placement state advanced to `mobile.m4`. These invalidate the stale Mobile-only widths/placements that could restore the broken geometry after the new solver ran; Desktop persistence is unchanged.
- Resonance Curve Inspector keeps a single Presenter-owned companion hierarchy for ordinary right/bottom placement. Its canonical key/value metadata group is marked as a structural width-critical group, allowing the compact inspector to grow only as far as that real structure requires rather than using the Desktop split width.
- Resonance/TER parameter Drawers no longer let Desktop intrinsic input/select widths greedily determine the surface. TER continues to use the existing `form-grid-2` Unit and can collapse to one column before asking for more panel width. No TER/Resonance private Mobile width was added.
- Pulse Sampler extraction composition is now explicitly three equal tracks at normal tablet/landscape widths, yielding the requested **3 + 3** arrangement. It reflows to two tracks only at `<=620px` local width and one track only at `<=310px`.
- Pulse Analysis now puts comparison controls, both bounded result PlotViews, result table, and raw diagnostic under the same sequential `visual` flow owner. Combined with the new Mobile PortableView state generation, stale persisted placement can no longer resurrect the overlapping/out-of-order composition.
- Two independent verification methods were used for the reported regressions: executable source/runtime regression audits, plus a real headless Chromium layout pass using the generated UI runtime and the actual project/plugin CSS at a 744×496 CSS viewport. The Chromium pass resolved a representative TER Drawer to 122 CSS px with no primary-action clipping, a Resonance parameter/data Drawer to 156 CSS px, a Resonance Inspector to 198 CSS px with exactly one portable header, Pulse Sampler to 3 equal tracks at 700 px / 2 tracks at 600 px, and a strictly non-overlapping Pulse result order. These are browser measurements, not a claim of Android-device pixel acceptance.
- Preserved the 3.71.71 Android build policy: `android-build` / `android-run` still perform no automatic `mobile:test`, TypeScript typecheck, or Gradle `help` preflight before APK compilation.
- App **3.71.72**, Android `versionCode` **213**, Resonance Workbench **3.63.4**, Pulse Analysis **2.12.11**, Pulse Sampler Tool **1.9.30**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26**, TER Analysis **3.14.4** unchanged.

# 3.71.71 WIP — Android direct compile path without pre-build tests

- Removed the Android source-check phase from both `DKDS.cmd android-build` and `DKDS.cmd android-run`. They no longer invoke `npm run mobile:test` or `npm run typecheck` before APK compilation.
- Removed the separate Gradle `help --no-daemon --info` no-fork preflight. The shared Gradle owner now configures the existing direct no-daemon JVM/agent settings and proceeds directly to `assembleRelease`.
- Removed the GitHub Android workflow's pre-build TypeScript type-check step so local and CI Android release builds follow the same direct-build policy.
- Kept only build prerequisites before compilation: JDK/Android SDK discovery/provisioning, dependency availability, release-signing setup, offline asset generation and Expo native project generation. These are required to invoke the build rather than regression tests.
- Kept post-build APK verification, required runtime-asset checks and SHA-256 reporting. These run only after `assembleRelease` has produced an APK.
- Updated Android documentation and stale tooling regression expectations so the old mandatory preflight/tests cannot be reintroduced as part of the build path. Manual `mobile:test` / `typecheck` commands remain available outside the APK build flow.
- App **3.71.71**, Android `versionCode` **212**. SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26** unchanged.

# 3.71.70 WIP — Mobile non-greedy width + Inspector/Pulse regression correction

- Corrected the previous minimum-width model: the ordinary PortableView **260 px** minimum is no longer reused as the automatic Mobile Drawer/Inspector target. The Presenter now starts from a compact Unit-metric probe floor (three minimum actions + action gaps + Surface inline inset) and grows only when the reflowed DOM reports real overflow. This probe floor is not a visible target or viewport heuristic.
- Advanced Drawer persistence to `dkds.mobile.drawer-width.v8.*` so widths saved while 260 px was incorrectly treated as the semantic minimum cannot return. No `vw`, `420px`, or tablet-percentage first-open owner was added.
- Made projected Mobile fields explicitly shrinkable (`min-width:0`, bounded width) while preserving non-wrapping primary/action text for the overflow probe. Desktop plugin widths remain untouched.
- Fixed semantic Inspector ownership: a user side/bottom dock no longer causes `inspector` / `scientific-secondary` surfaces to escape the Mobile Presenter and re-enter legacy full-width flow. Only explicit `float` / `global` / `sticky` overlay intent suspends semantic projection.
- TER parameter controls now use the existing Unit `form-grid-2` layout, with long algorithm/check rows spanning the grid. This lets the control composition collapse before requesting a wider Drawer instead of letting TER desktop field widths greedily determine Mobile panel width.
- Pulse Sampler keeps the shared `analysis-control-grid` Unit but adds plugin-declared responsive detail geometry: compact workspace width uses **three equal tracks per row**, with the existing true-narrow two-column fallback. No Mobile-only CSS special case was added.
- Pulse Analysis now keeps compare controls, both bounded result PlotViews, and the result table under the same normal-flow Unit owner before the raw diagnostic. This removes the sibling-flow seam that allowed portable plot rendering to overlap the following section on Mobile.
- Added `test-v37170-mobile-density-regression.js` and corrected historical gates that incorrectly protected the retired 260 px semantic Drawer floor / v7 width generation. The historical **Desktop Visual Closure** remains explicit history; this correction does not claim new Desktop pixel acceptance.
- No new Unit or public API: SDK **1.51.30**, Plugin API **1.19.0**, Unit Templates **2.5.26 / 41 Units / 73 Layout recipes**. App **3.71.70**, TER **3.14.4**, Pulse Sampler Tool **1.9.29**, Pulse Analysis **2.12.10**, Android `versionCode` **211**.
- Still **WIP** until the same Android device confirms the reported screenshots. Each reported regression is covered by two independent checks in this round: executable/runtime regression plus a separate ownership/source/manifest gate.

# 3.71.69 WIP — Unit-aware minimum reasonable width + Mobile layout regression closure

- Replaced the interim viewport-percentage Drawer/Inspector sizing experiment with one generic **minimum reasonable width** solver in `MobileWebSurfacePresenter`. First-open width now starts from the shared Unit portable readability/touch floor, lets the projected Unit/container-query layout actually reflow, measures canonical field/action/header overflow, and binary-searches the smallest non-overflowing width up to the real available surface width. No `32vw`, `30vw`, or `420px` first-open rule participates in this path.
- Unified Mobile right-inspector geometry with the existing Core `SplitController`. The Presenter computes only the content-derived runtime minimum/default, while the canonical `--dkds-plugin-canvas-right-width` split track remains the single final width owner. A saved user seam width is preserved only when it is at least the current content-derived minimum. The projected companion stays hidden during the probe, avoiding a first-frame flash of the Desktop default width.
- Advanced Drawer persistence to `dkds.mobile.drawer-width.v7.*`, intentionally isolating widths saved by the retired percentage/cap generations. Manual resize remains supported and is clamped by the current content-derived minimum plus the actual available workspace width.
- Kept Pulse Sampler on the existing `analysis-control-grid` Unit recipe. `工程数据` no longer claims a whole row; the existing 6→4→3→2 responsive stages therefore recompose all six extraction items according to local Unit width instead of leaving `提取稳态电流` alone because one field greedily spans the grid.
- Rebuilt Pulse Analysis comparison composition with the existing Unit Header/Note contracts: `结果比较` and the file-scope selector/actions share one non-stacked Header row, while explanatory text is a sibling Unit Note.
- Kept Pulse result flow Unit-owned: both result cards have bounded Layout flow boxes matched to their PlotView detail geometry, and the table body remains a bounded `scroll-pane`. Mobile/plugin CSS do not re-own the result grid/card/table geometry.
- Updated the Mobile regression gate to execute the width solver and `LayoutUnitRuntime`, including a high-DPI-like 744 CSS px viewport fixture where simple content resolves to the shared 260 px Unit floor and genuinely wider content grows only to its measured requirement instead of an arbitrary tablet cap.
- Cleaned stale regression expectations that explicitly protected the retired 32vw/420px/30vw behavior. SDK native-state blueprint metadata was also resynchronized with the current Pulse Analysis source census (8 state occurrences) rather than weakening the census gate.
- No new Unit or public API was introduced: Unit Templates remain **2.5.26 / 41 Units / 73 Layout recipes**, SDK **1.51.30**, Plugin API **1.19.0**. App **3.71.69**, Pulse Analysis **2.12.9**, Pulse Sampler Tool **1.9.28**, Resonance Workbench **3.63.3**, Android `versionCode` **210**.
- This remains **WIP** pending real Android/Desktop visual acceptance of the reported screenshots; automated layout/runtime gates do not substitute for that acceptance.

# 3.71.68 WIP — Pulse bounded PlotView + visible empty table body

- Fixed the real-device Pulse PRIMARY runaway-height path exposed after the sequential Unit cutover. Home-state result PlotViews were only given a minimum content height; an autosizing scientific renderer could therefore keep increasing rendered content height while the normal-flow parent remained unconstrained. Production and Unit-only shadow now declare both Unit `contentMinHeightPx` and `contentMaxHeightPx` (320 px for result plots, 360 px for raw diagnostic), so the home viewport is bounded while dock/float placements still release that geometry to their container owner.
- Moved renderer overflow containment into Layout Unit geometry (`overflow:hidden`) for the Pulse plot canvas instead of plugin-private CSS. This prevents oversized renderer descendants from extending document scroll height outside the Unit-owned PlotView viewport.
- Removed `fill-rows` from the Pulse result-table panel. The table is content-driven again and its scroll body is explicitly bounded through Layout Unit geometry (`min-height:180px`, `max-height:330px`), avoiding both a PRIMARY-filling table and the opposite failure where an empty table collapses to only its header row.
- Added a semantic Unit empty state below the table header: empty results now show a compact visible body with “暂无可显示的已分析结果”; real rows hide that empty state.
- Advanced PlotView persistence namespaces to `pulse-result-grid-v5` / `pulse-raw-flow-v4` (shadow v4/v3) so stale geometry from the failed layout line cannot be restored.
- Added `test-v37168-pulse-bounded-primary-flow.js`, including runtime checks that 32 repeated PlotView resize cycles retain the 320 px min/max home viewport, dock placement releases both constraints, and the 180–330 px table Layout geometry is accepted/executed.
- No new Unit/API: Unit Templates remain **2.5.26 / 41 Units / 73 Layout recipes**, SDK **1.51.30**, Plugin API **1.19.0**. The historical **Desktop Visual Closure** record remains history only; this WIP still requires the user's real Desktop/Android visual acceptance.
- App **3.71.68**, Pulse Analysis **2.12.8**, Android `versionCode` **209**.

# 3.71.67 WIP — Pulse sequential PRIMARY Unit composition correction

- Reverted the incorrect Pulse composition model introduced across 3.71.63–3.71.66: result comparison, two result PlotViews, result table, and raw diagnostic now form one content-sized PRIMARY sequence instead of a PRIMARY-filling SplitPane plus a separate raw-diagnostic PRIME.
- Removed the raw-diagnostic PRIME from the TOP semantic contract. The raw diagnostic remains a complete PlotView in PRIMARY and keeps normal home/left/right/bottom/float/global placement through PlotView itself.
- Removed Pulse result SplitPane ownership and persistence. The result table now follows the two result plots directly in document flow, eliminating the mechanism that could create large blank Desktop regions or allow raw diagnostic to consume the workspace.
- Production and SDK Pulse Unit-only shadow now teach the same composition: one data-control PRIME and one sequential scientific PRIMARY flow.
- Updated native Unit/Presentation/Geometry blueprints and regenerated SDK reference JSON so the formal Unit dossier matches production rather than preserving the regressed PRIME/SplitPane model.
- Existing Unit catalog remains 41 Units / 73 Layout recipes; SDK remains 1.51.30; Unit Templates remain 2.5.26; Plugin API remains 1.19.0.
- App 3.71.67, Pulse Analysis 2.12.7, Android versionCode 208.

# 3.71.66 WIP — Pulse Unit responsive table geometry validation fix

- Fixed the startup/runtime failure `UNIT_LAYOUT_GEOMETRY_VALUE_FORBIDDEN: responsive[0]:max-height:360px` introduced by v3.71.65.
- Root cause: Pulse Unit presentation declared a new `Layout(responsiveGeometry)` value `maxHeight: 360px`, but `360px` is not part of the current property-specific accepted `max-height` Unit vocabulary. The v3.71.65 tests exercised the grid/PlotView/SplitPane path but did not execute this table-wrap Layout declaration.
- Kept the Unit contract strict instead of weakening validation or adding an unproven value. The responsive table-wrap cap now uses the already accepted `330px` geometry value.
- No plugin CSS fallback and no Mobile special case were added. Pulse result-flow ownership remains Unit Layout + PlotView + SplitPane.
- App **3.71.66**, Pulse Analysis **2.12.6**, Android `versionCode` **207**. SDK remains **1.51.30**, Unit Templates remain **2.5.26 / 41 Units / 73 Layout recipes**, Plugin API remains **1.19.0**.

# 3.71.65 WIP — Pulse result flow Unit ownership correction

- Move Pulse result-flow geometry out of plugin/mobile CSS and into the existing Unit composition contracts: Layout `two-card-grid`, PlotView `detailGeometry.contentMinHeightPx`, and Core-owned SplitPane `reflowBelow`.
- Keep projected PRIMARY width as the responsive target: two result plots stay side-by-side until the PRIMARY itself is `<=520px`; narrow Mobile reflow is owned by the generic SplitPane rather than a viewport media query.
- Close the generic PlotView execution gap so already-public Unit `contentMinHeightPx` / `contentMaxHeightPx` work without requiring `contentAspectRatio`; moved/docked/floating views still release home-only content geometry to their container owner.
- Update the Unit-only Pulse shadow to the same contracts and add a runtime regression that executes PlotView detail geometry, Layout responsiveness, and SplitPane reflow instead of checking CSS strings only.
- No new Unit or public API: SDK remains **1.51.30**, Unit Templates remain **2.5.26 / 41 Units / 73 Layout recipes**, Plugin API remains **1.19.0**. App **3.71.65**, Pulse Analysis **2.12.5**, Android `versionCode` **206**.
- **Desktop Visual Closure** history remains frozen as historical evidence; this WIP changes Unit-owned result composition and still requires real Desktop/Android visual acceptance.

# 3.71.64 WIP — Pulse Mobile intrinsic result-flow ownership correction

- Fixed the remaining Mobile Pulse result overlap by moving result split/grid/card/plot/table geometry to the Pulse PRIMARY content owner instead of `mobile.css`.
- The projected `.pulse-primary-surface` is now its own inline-size container, so side-by-side versus single-column layout follows the actual Presenter-provided PRIMARY width after Mobile projection.
- Pulse result PlotViews now use the public `--dkds-plot-content-*` geometry contract. This survives Core Structure cascade ownership and keeps each card's layout box large enough for its rendered scientific content, preventing table-header/actions from being painted underneath the plots.
- Mobile platform CSS no longer declares Pulse result split/grid/card/plot/table geometry; Mobile Presenter remains responsible only for semantic region placement and available width.
- Desktop Visual Closure remains frozen: this Mobile ownership correction does not alter Desktop platform presentation/runtime contracts.
- Added the v3.71.64 regression gate; App **3.71.64**, Pulse Analysis **2.12.4**, Plugin API **1.19.0**, SDK **1.51.30**, Unit Templates **2.5.26**, Android `versionCode` **205**.

# 3.71.63 WIP — Pulse result-flow and persisted-placement correction

- Corrected Desktop Pulse result flow at the source: removed the obsolete 720 px / viewport-height owner. SplitPane now persists only the compact result-table track through the canonical `--dkds-unit-results-height` token.
- Corrected Native Mobile persisted result placement with the fresh `pulse-result-grid-v3` PlotView namespace, preventing stale portable/dock state from removing a result card from its home grid. The shared Unit presentation remains platform-neutral.
- Wide/tablet result lanes explicitly keep two columns and collapse only at `<=520px`; plot/card intrinsic minimums keep empty-state annotations inside their own card.
- Retired obsolete Pulse viewport-fill values from the accepted Unit geometry vocabulary. SDK is **1.51.30**, Unit Templates **2.5.26**, with the public catalog unchanged at **41 Units / 73 Layout recipes**.
- Added the v3.71.63 regression gate for intrinsic flow, bounded table ownership, platform-neutral presentation, fresh PlotView persistence, and narrow-lane collapse.
- App **3.71.63**, Pulse Analysis **2.12.3**, Plugin API **1.19.0**, Android `versionCode` **204**. This remains WIP pending real-device visual acceptance.

# 3.71.62 WIP — superseded Pulse Analysis result-layout attempt

- Fixed the Desktop Pulse Analysis result split so the persisted resize track belongs to the **batch result table** rather than the plot region. The old layout stretched an empty table panel through the remaining fixed workspace height, producing the large blank area before the raw-diagnostic PRIME. The new host-owned SplitPane uses `pulse-results-table-height-v2` with a compact 220 px default table track while the two result plots consume the flexible region.
- Fixed Native Mobile Pulse result cards on tablet-class widths. The generic `auto-fit` two-card grid is no longer overridden to one column at `max-width:900px`; only truly narrow widths (`<=560px`) collapse to one column, so the two scientific result plots remain side-by-side on the wide Mobile viewport shown in the reported screenshot.
- Fixed empty-result renderer containment without clipping semantic UI. Mobile result cards now grow with a real 260 px plot floor instead of forcing a too-short fixed renderer box, preventing Plotly empty-state annotations from escaping into the following panel/header.
- Updated the public Pulse Unit shadow example to teach the same corrected SplitPane ownership (`resizeTarget:'second'`) and new persistence/token namespace. No new Unit type or public Unit API was required; Unit Templates remain **2.5.25 / 41 Units / 73 Layout recipes** and SDK remains **1.51.29**.
- App **3.71.62**, Pulse Analysis **2.12.2**, Plugin API **1.19.0**, Android `versionCode` **203**. The frozen **Desktop Visual Closure** archive remains historical evidence only; this WIP is a bounded Pulse layout correction.

# 3.71.61 WIP — Native Mobile host-owned page identity + compact parameter drawer

- Native Mobile now suppresses plugin-local `.analysis-page-header` at any depth, not only direct children of `.analysis-page`. This closes the Pulse Sampler nested Unit pageHeader leak and makes the rule platform-wide: plugin identity belongs to the native host/top bar; plugin content begins directly at the workspace. Plugin Manager and Automation Test remain explicit system-page exceptions.
- Parameter/data-control Drawer auto-fit now separates **automatic fit ceiling** from **manual resize ceiling**. Wide tablets auto-fit at no more than **460 px** (about 32% narrower than the prior ~680 px Resonance case), while users may still drag wider to **680 px** when desired.
- Narrow phones preserve the earlier anti-clipping guarantee: if a genuinely width-critical control would clip, automatic fit may grow toward the phone viewport. Responsive child Units still reflow locally instead of forcing tablet drawers to full width.
- Drawer persistence key advances to `dkds.mobile.drawer-width.v3.*`, so obsolete over-wide v2 saved widths cannot resurrect the regression. New manual widths continue to persist.
- Replaced two obsolete whole-tree CSS SHA release gates with semantic Core invariants; legitimate Core-owned platform fixes are now protected by explicit Mobile title/scroll/ownership checks rather than unrelated byte freezes.
- App **3.71.61**, SDK **1.51.29**, Unit Templates **2.5.25 / 41 Units / 73 Layout recipes**, Plugin API **1.19.0**, Android `versionCode` **202**.

# 3.71.60 WIP — Resonance Mobile explicit box selection + canonical blank-clear

- Restored Mobile Resonance main-plot box selection by explicitly declaring `mobileBoxGesture:'select-region'` on the production ScientificPlot. This uses the v3.71.57 opt-in contract exactly as intended: plots that do not declare a Mobile box gesture remain scroll-first (`pan-y`), while the Resonance main plot genuinely requires range selection and therefore takes touch drag ownership.
- Fixed blank-area tap after curve/peak highlighting. The main-plot adapter now delegates `onClearSelection` to the canonical Resonance selection owner instead of partially clearing local ids plus the shared selection model. Canonical clear removes sweep/peak/range selection, updates linked views/controls, and exits highlight mode consistently.
- Kept the generic ScientificPlot default unchanged. No Core fallback infers box capture from callbacks, and no global touch handler was restored; Mobile gesture ownership remains explicit per plot.
- Added `test-v37160-resonance-mobile-box-and-clear-selection.js` with integration checks plus behavioral intent resolution for touch box → `select-region` and background tap → `clear-selection`.
- App **3.71.60**, Resonance Workbench **3.63.3**, SDK **1.51.29**, Unit Templates **2.5.25 / 41 Units / 73 Layout recipes**, Plugin API **1.19.0**, Android `versionCode` **201**.

# 3.71.59 WIP — Unit Workspace PRIMARY right/end-inset ownership

- Promoted the repeatedly accepted plugin right-side breathing room into the public **Unit Workspace** contract instead of leaving it as optional plugin composition detail. Every Unit Workspace PRIMARY now has exactly one inline-end inset owner.
- New workspaces default to a Unit-owned **12 px** right/inline-end inset. `primaryEndInset:{mode:'content'}` is available only when a source-faithful primary content root already owns the accepted inset, preventing double padding. Unit-owned custom values are intentionally restrained to **8–32 px**.
- Vth and Resonance consume the Unit default automatically. Data Center, TER, Pulse Sampler and Pulse Analysis explicitly declare content-owned mode because their accepted production content already owns the right inset.
- Generic Core dock/main slots remain `padding:0`; this does **not** restore the old global page whitespace regression. The responsibility belongs to Unit Workspace composition, not Core docking geometry.
- Added `test-v37159-unit-workspace-primary-end-inset.js` and extended SDK types/docs/contracts. The Unit catalog remains **41 Units / 73 Layout recipes**.
- App **3.71.59**, SDK **1.51.29**, Unit Templates **2.5.25**, Plugin API **1.19.0**, Android `versionCode` **200**. The frozen **Desktop Visual Closure** history remains explicit and is not used as evidence for this new Unit contract.

# 3.71.58 WIP — Unit FloatingChrome equal-inset + Vth layout-owner correction

- Fixed the Mobile accepted-main action strip at the **Unit FloatingChrome owner**. The regression was not text alignment: direct `action-v2` children retained the Field/coarse-touch minimum control height inside a fixed-height FloatingChrome, consuming the intended inner inset. FloatingChrome now context-scopes the Unit control height to its own content box, restoring equal top/right/bottom/left spacing between the buttons and the outer outline. The ineffective v3.71.57 mobile-only centering shim is removed.
- Fixed the missing spacing above the Vth **转移曲线** header. The Vth Unit cutover created `fill-rows` and then rebound the same node through `Layout.apply(... identity ...)`; the second binding cleared the recipe's `display:grid` / row geometry, so `gap:10px` no longer had any effect. Recipe and accepted geometry are now composed in one Unit binding.
- Removed the same destructive post-creation `identity` rebinding from Vth control/result hosts and from the SplitPane outer node. SplitPane remains the sole owner of its outer geometry; the SDK Vth shadow mirrors production composition.
- No new public Unit API was added. This is a correction to existing Unit invariants, so SDK remains **1.51.28** and Unit Templates remain **2.5.24 / 41 Units / 73 Layout recipes**.
- App **3.71.58**, Plugin API **1.19.0**, Transfer Curve Vth Lab **3.3.4**, Android `versionCode` **199**. The frozen **Desktop Visual Closure** history remains unchanged.

## 3.71.57 WIP — Vth settings visibility + Mobile scientific touch arbitration

- Fixed Core SettingsSurface overlay stacking in dedicated plugin windows by explicitly using the foreground overlay stack; Vth “默认设置” is visible again without plugin-private dialog CSS.
- Fixed Mobile accepted-main Unit floatingChrome action alignment so text actions such as Resonance “锁定所选 / 解锁所选 / 智能峰序 / 物理标记 / 重新居中” are vertically and horizontally centered.
- Unit Templates 2.5.24 / SDK 1.51.28 add explicit `mobileBoxGesture: none | select-region | zoom-box` for ScientificPlot. Touch/pen defaults to scroll handoff; a plot captures drag-box gestures only when explicitly declared.
- Desktop `scientific-standard-v1` interaction policy remains unchanged. Vth keeps Desktop Shift range selection but does not opt into Mobile box capture, so Mobile touch drag scrolls naturally.
- Mobile scrollbar/scroll-relay contracts from 3.71.53 remain unchanged.

# v3.71.56 WIP — Vth default-settings semantics closure

- App **3.71.56**, SDK **1.51.27**, Unit Templates **2.5.23 / 41 Units / 73 Layout recipes**, Plugin API **1.19.0**, Transfer Curve Vth Lab **3.3.3**, Android `versionCode` **197**.
- Vth `默认设置` now remains a true **new/reset project default** surface. Saving defaults never mutates the active project state, plot viewport, visibility, scale, Unit geometry or theme/material appearance.
- Removed presentation-only `logY` and `showAllCurves` from the persisted default-settings surface. They remain ordinary project/view state and are no longer able to make “default settings” appear to restyle the workspace.
- Fixed stale default capture: the Vth project slice now resolves `settings.get()` at each new/reset/restore baseline instead of freezing one startup snapshot for the lifetime of the plugin instance.
- Restored explicit Core-status feedback after settings save/reset and restored the source-faithful settings description clarifying that the current project is unchanged.
- Existing legacy stored `logY/showAllCurves` keys are ignored by the new analysis-default resolver, so old preferences cannot leak back into presentation defaults.

# v3.71.55 WIP — Vth Unit source-faithful controls + fill-chain closure

- Fixed the production Vth parameter PRIME without restoring private CSS: **数据** remains a canonical headed Panel, both card bodies consume public Unit `stack` geometry with the accepted **10 px inset / 8 px vertical rhythm**, the explanatory note uses the lightweight meta Unit, and **阈值提取** returns to the accepted content-heading anatomy instead of a second painted title strip.
- Unit Templates **2.5.23** closes the generic vertical fill chain. Created `SplitPane` first/second regions are canonical single-track fill hosts, while `Panel.sizing:'fill'` now makes the Material shell a column fill-container and its body `flex:1 1 auto; min-height:0`. A Plot Panel therefore fills the entire split track above the results table instead of stopping at intrinsic plot height.
- Updated the Vth SDK shadow to the same public Unit composition. No Vth private CSS, second layout engine, algorithm/state/task/result owner, or Vth-specific Unit was introduced.
- App **3.71.55**, SDK **1.51.27**, Unit Templates **2.5.23 / 41 Units / 73 Layout recipes**, Plugin API **1.19.0**, Transfer Curve Vth Lab **3.3.2**, Android `versionCode` **196**.

# v3.71.54 WIP — Vth Unit ScientificPlot interaction-policy hotfix

- Fixed production Transfer Curve Vth Lab activation error `UNIT_SCIENTIFIC_INTERACTION_POLICY_FIXED`.
- Root cause: the v3.71.53 cutover correctly routed the plot through `units.scientificPlot.create(...)` but still passed the legacy direct-runtime `interactionBehavior` object. Unit ScientificPlot intentionally forbids replacing `scientific-standard-v1`.
- Vth now uses the public `interactionExtensions` contract only for its non-conflicting Shift+box region selection. Ctrl+box zoom is no longer duplicated because it is already a mandatory Core binding in `scientific-standard-v1`.
- The Unit fixed-policy guard remains unchanged; the plugin was corrected instead of weakening Unit semantics.
- Added a regression gate that verifies the production Vth source cannot reintroduce `interactionBehavior` and that Core continues to own mandatory Ctrl+box zoom.


# v3.71.53 WIP — Vth production Unit cutover + Mobile scroll/chrome closure

- Cut over **Transfer Curve Vth Lab** production presentation to the validated Unit composition. Production state, `analysis-runtime.js`, `vth-task.js`, numerical-result ownership, live-domain and domain adapter remain the single scientific owners; retired `plugin.css` is no longer loaded by the production manifest.
- Added the production `unit-presentation.js` built from the existing public Unit catalog: titleless fixed-left data-control PRIME, source/extraction panels, four metrics, ScientificPlot, result Table and the accepted vertical SplitPane geometry. No Vth-specific Unit or private replacement stylesheet was added.
- Corrected generic Mobile ScientificPlot navigation chrome so the floating `⋮ / + / − / ⌂` controls center their glyphs on both axes through Core geometry rather than plugin-specific offsets.
- Standardized Mobile WebView scrollbars to a shared **3 px** Core geometry token across plugin scroll regions. Theme/paint ownership remains unchanged.
- Reinforced Mobile vertical nested-scroll relay for workspace regions, Table surfaces, Unit Lists/ScrollPane and explicit `chain/viewport` policies. Horizontal overscroll stays contained; the active Drawer remains the terminal vertical scroll owner so relay does not leak into the obscured page.
- Updated SDK native service/state/reconstruction blueprints and historical gates for the sixth production Unit migration. Unit Templates remain **2.5.22 / 41 Units / 73 Layout recipes**.
- Existing **Desktop Visual Closure** history remains explicit; this WIP adds a Vth presentation cutover and generic Mobile fixes without reopening the frozen desktop architecture.
- App **3.71.53**, SDK **1.51.26**, Unit Templates **2.5.22**, Plugin API **1.19.0**, Transfer Curve Vth Lab **3.3.0**, Android `versionCode` **194**.

# v3.71.52 WIP — Vth live-domain + side-by-side live presentation parity

- Added the smallest dependency-gated production **Transfer Curve Vth Lab live-domain seam** at `com.dkds.transfer-vth-lab/live`. It projects the existing production state/task/result owner through `ctx.services.domain`; it does not create a second Vth store, algorithm, task runner, controller or numerical-result owner.
- Upgraded `examples/sdk151-unit-vth-shadow/` to **1.1.0 live shadow**. Its titleless data-control PRIME, fields, checks, four metrics, ScientificPlot and result Table now consume the same production owner and round-trip curve selection, extraction parameters, manual fit window and plot view back into production state.
- Added real numeric and side-by-side acceptance gates. The side-by-side test activates the actual production Vth plugin and the actual Unit shadow against two assigned curves, then compares production snapshot vs shadow controls/metrics/table/plot and verifies two-way interaction round-trips.
- Production Vth presentation is **not cut over yet**. `analysis-runtime.js`, `vth-task.js` and `plugin.css` remain byte-frozen; only the thin production entry/manifest plus `live-domain.js` / `domain-adapter.js` were opened for this bounded seam. No Vth-specific Unit or private shadow CSS was added; Unit Templates remain **2.5.22 / 41 Units**.
- Updated historical migration-freeze and Vth package-order tests so they protect the current boundary instead of incorrectly treating the intentionally opened Vth seam as unrelated mutation. Existing **Desktop Visual Closure** history remains explicit and is not used as evidence for this new Vth live-parity stage.
- App **3.71.52**, SDK **1.51.26**, Unit Templates **2.5.22 / 41 Units**, Plugin API **1.19.0**, Transfer Curve Vth Lab **3.2.2**, Android `versionCode` **193**.

# v3.71.51 WIP — Pulse acceptance + Vth Unit shadow reconstruction

- Recorded the real Windows Electron acceptance of the Pulse Sampler v3.71.50 production Unit presentation. Pulse Sampler is no longer the active migration target; its production domain/task owners remain byte-frozen and future changes are maintenance-only unless a new defect is demonstrated.
- Started the next native-plugin migration with a **Transfer Curve Vth Lab Unit-only shadow reconstruction** under `examples/sdk151-unit-vth-shadow/`. Production Vth source, CSS, numerical runtime and task entry remain byte-identical.
- Reconstructed the Vth titleless data-control PRIME, source/extraction controls, four metrics, curve ScientificPlot, result Table and vertical result SplitPane using the existing **41 Units / Unit Templates 2.5.22**. No Vth-specific Unit or private shadow CSS was added.
- Preserved accepted Vth geometry through public Unit/detail parameters: 300 px control rail, 10 px primary gap, 180 px result baseline, 140 px minimum, 300 px plot reserve and 920 px responsive split reflow.
- Corrected stale native Unit authoring blueprints so current titleless Data Center / Pulse / Pulse Sampler / TER / Vth data-control PRIMEs no longer teach a generated `canonical-header`. Runtime Unit behavior is unchanged; this is a source-faithful SDK dossier correction.
- App **3.71.51**, SDK **1.51.26**, Unit Templates **2.5.22 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **192**.

# v3.71.50 WIP — Unit Panel shell/body containment

- 修复 public **Panel Unit** 的结构缺口：`header:false` 时，Panel 过去把 Material shell 本身直接当作 body，导致插件为了布局把 Grid/Flex/min-height 写到 Material shell；当该 shell 同时处于可收缩父布局中时，外框/阴影可能先收缩而正常流子内容继续向下绘制，形成“Panel 没有裹住内容”的视觉错误。
- Unit Templates **2.5.22** 新增通用 `Panel.sizing: 'content' | 'fill'`。声明 sizing 的 Panel 始终拥有独立 `data-dkds-unit-panel-body`，Material shell 与内容/几何 body 分离。`content` 使用 `flex:0 0 auto` 保证外框按内容固有高度完整包裹，`fill` 保留可填充/可收缩语义。
- Pulse Sampler 的 **测量数据提取** 与 **三路合并波形** 均迁移到 `sizing:'content'`，所有 Layout、Header、Plot、Table 都挂载到 `.body`；`RESULT / 读写电流映射 / Plot / Table` 因而是同一 Material Panel body 的真实后代，不再是仅靠视觉顺序拼接的 sibling。
- 同步修改 SDK 合同、类型、Unit 文档、生成目录与 shadow reconstruction 示例。没有新增 Pulse 私有 CSS、私有 Unit 或 Core 业务选择器；41 Unit catalog 不变。
- 保持 Pulse `live-domain.js`、`domain-adapter.js`、`steady-state-task.js` 三个 production scientific/domain/task owner 字节不变。
- 保留既有 **Desktop Visual Closure** 历史；本轮仅推进通用 Unit Panel containment，Windows Electron 像素级结果仍需实机确认后再冻结 Pulse。
- App **3.71.50**, SDK **1.51.26**, Unit Templates **2.5.22 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.27**, Android `versionCode` **191**。

# v3.71.49 WIP

- 修复 Pulse Sampler “测量数据提取”在受限高度下 RESULT 标题覆盖 X/Y/复制/导出控件。根因是 v3.71.48 把外层与命令区切换到 `stack`/`stack-compact` 后引入 `min-height:0` + flex shrink；子控件仍按固有高度绘制，后续 RESULT sibling 却按被压缩的 flex box 排版。
- 保持单一 Material Panel，不恢复嵌套 Panel/阴影；仅将 Sampling 外层改回四个 `auto` Grid 行、命令区改为两个 `auto` Grid 行。
- 恢复公共 Unit geometry vocabulary 中先前已存在的 `grid-template-rows: auto auto auto auto`，Unit Templates 仍为 2.5.21。
- Pulse Sampler Tool 1.9.26；App 3.71.49；Android versionCode 190。

## v3.71.48 WIP — Surface containment, local responsive ownership and primary inset closure

- Corrected Pulse Sampler **测量数据提取** ownership: Sampling command controls and **读写电流映射** plot/table now live under one Material Panel; the internal command block is a geometry-only Unit Layout, so there is no nested/orphan shadow layer.
- Corrected Pulse responsive ownership: extraction/result grids now measure their **actual local allocated width** instead of the entire Workspace. This makes the public 6→4→3→2 Unit recipe reflow before actions such as **提取稳态电流** can cross the Panel boundary.
- Corrected Data Center preview ownership: the bounded preview table now uses `Table.bind()` inside the existing source Panel instead of mounting a second Table Surface, removing the standalone shadow around **预览前 n / total 行**.
- Restored Data Center source-faithful primary content inset through public Unit geometry and stretched the wide formula/chart grid row so the two Panels share one bottom edge.
- Restored TER primary right-side breathing room through the plugin's public Unit primary geometry rather than reintroducing Core dock padding. Data Center and TER therefore remain domain-owned compositions while Core stays domain blind.
- Retired the now-unused accepted geometry value `grid-template-rows:auto auto auto auto` after the Pulse Sampling Panel moved to content-sized Unit Stack composition. No new Unit, compatibility path, private Pulse CSS or Core business selector was added.
- Rewrote historical tests that had accidentally frozen the broken nested-shadow/workspace-width behavior. New v3.71.48 gates protect **single Material ownership, local responsive measurement, Data Center preview binding, paired-row alignment, and plugin-owned primary insets**.
- Preserved the frozen **Desktop Visual Closure** history and all Pulse production scientific/domain/task/result owners byte-identically.
- App **3.71.48**, SDK **1.51.25**, Unit Templates **2.5.21 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.25**, Data Center **1.15.34**, TER **3.14.3**, Android `versionCode` **189**.

## v3.71.47 WIP — Unit minimum-width, containment and TER cold-start closure

- Enforced a content-derived density floor for parameter/data-control drawers so saved or dragged widths cannot cross below the usable multi-column Unit threshold while viewport space remains. This preserves the existing restrained Workspace `leftMin` contract instead of using child wrapping as a substitute for a legal rail width.
- Kept Desktop split geometry source-faithful: Pulse continues to declare `leftWidth:540 / leftMin:520 / leftReserve:520`, and Core still resolves saved undersized split state to the declared minimum.
- Repaired Pulse Panel containment: merged waveform Plot+Table and Sampling/Result content now remain inside their owning Unit Panels, with width/max-width/min-width ownership explicit and no orphan shadow surface below the parent panel.
- Made direct Unit Actions canonical field-height peers so extraction/export buttons align with controls rather than expanding to label+control stack height.
- Rebuilt TER heatmap-display controls on the public two-column Field Unit anatomy, aligning paired controls without legacy analysis-control geometry.
- Deferred full Material semantic assignment for detached Unit Panel/Surface composition until connection, removing synchronous semantic work from plot-heavy TER cold startup while retaining Core material ownership.
- Preserved the frozen **Desktop Visual Closure** history and the 41-Unit `compact-first-single-last-v1` density contract.
- App **3.71.47**, SDK **1.51.25**, Unit Templates **2.5.21 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.24**, Android `versionCode` **188**.

## v3.71.46 WIP — Pulse source-faithful Workspace, renderer and responsive ownership closure

- Restored the accepted Pulse Sampler Workspace geometry through public Workspace Unit parameters: `leftWidth:540`, `leftMin:520`, `leftReserve:520`. The parameter PRIME can no longer be squeezed to the generic 280 px default and accidentally force tabs, two-column fields and four actions into compact fallbacks.
- Added a new persisted split-layout namespace for the corrected Pulse Workspace and a runtime clamp regression: an older 360 px saved left rail now resolves to the declared 520 px minimum. Parameter PRIME minimum width is documented as a restrained public Workspace/Unit contract; child responsive fallbacks may not substitute for violating it.
- Corrected Pulse scientific presentation ownership after the legacy DOM/CSS cutover. Waveform/result ScientificPlot Units now own the single presentation renderer and consume the unchanged production live-domain projection; the invalid lifecycle-only `renderOwner:'runtime'` path was removed because no legacy renderer remains.
- Restored the accepted responsive owner: Sampling/result control grids and result layout now measure the whole Workspace, matching the former workspace container-query semantics instead of greedily collapsing from a narrower local grid.
- Fixed the public Tabs Unit wrapper so its direct tablist is explicitly non-wrapping and compact Tabs remain intrinsic-width. This is a generic Unit correction, not Pulse CSS.
- Restored accepted PRIME semantics (`embedded:true`, `presentation-v3`) while retaining titleless `data-control` ownership and the existing public Unit composition.
- Added a permanent v3.71.46 source-faithful parity gate covering Workspace rail geometry, real Unit ScientificPlot rendering, Workspace-owned responsive decisions, non-wrapping Tabs and the frozen scientific/domain/task owners.
- App **3.71.46**, SDK **1.51.24**, Unit Templates **2.5.20 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.23**, Android `versionCode` **187**.

## v3.71.45 WIP — Pulse basic visual parity + deterministic Unit material ownership

- Closed the remaining basic Pulse Sampler presentation regressions against the accepted pre-cutover source: compact Vd/Vs/Vg selectors now reuse the accepted toolbar-action silhouette, ordinary parameter-width action groups remain four columns until genuinely tiny widths, the segment header is again a canonical ordinary Toolbar with centered content, and Pulse panels/sampling command surfaces explicitly acquire the Core surface Material Role and shadow.
- Corrected the public `action-grid-4` Unit default from an over-eager 380 px collapse to a last-resort 280 px 4→2 transition, consistent with `compact-first-single-last-v1`. This is a generic Unit default, not a Pulse private breakpoint.
- Added deterministic Material ownership to public Panel/Surface Units so shadow/fill no longer depends on a later semantic scanner. Paint remains wholly Core/Theme-owned.
- Added a permanent Pulse basic visual-parity regression contract covering compact selector size/radius/active paint, four-action density, segment-bar structure/alignment, semantic surface/shadow ownership, and the prohibition on Pulse private CSS.
- Kept Pulse `live-domain.js`, `domain-adapter.js`, and `steady-state-task.js` byte-identical. No state, algorithm, Task, result, or plugin-specific geometry owner was added.
- Preserved the frozen **Desktop Visual Closure** history; current production Unit presentation remains WIP until platform-specific final acceptance, while the basic geometry/material parity above is now machine-gated and is no longer delegated to manual Windows inspection.
- App **3.71.45**, SDK **1.51.23**, Unit Templates **2.5.19 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.22**, Android `versionCode` **186**.

## v3.71.44 WIP — 41-Unit responsive density audit + Pulse parity closure

- Promoted `compact-first-single-last-v1` to an executable responsive-density contract covering all **41 public Units** and all **73 Layout recipes**. Unknown width preserves base geometry; density-oriented grids keep useful columns until real compact thresholds; progressive recipes reduce columns in stages; ordinary single-column layouts are last-resort only.
- Added the permanent `unit:density` gate and published the same contract through SDK types/reference so external plugins can distinguish Core-locked behavior from accepted plugin-tunable breakpoints/geometry.
- Extended the public Header Unit with a non-painted `content` variant plus title-inline/trailing metadata, and Field with Core-owned label/unit anatomy. These are generic Unit capabilities, not Pulse-specific CSS.
- Repaired Pulse Sampler source parity only through public Unit parameters: two-column parameter fields, four-action row, title/meta/tabs hierarchy, canonical label/unit rows, stretch-to-fill segment table, content-style main section headers, compact Sampling controls, and progressive 6→4→3→2 density behavior.
- Kept Pulse `live-domain.js`, `domain-adapter.js`, and `steady-state-task.js` byte-identical. No second production state, algorithm, Task, result, or geometry owner was added.
- Preserved the frozen **Desktop Visual Closure** history while advancing the domain-blind Core style baseline only for public Unit content-header/Field anatomy and compact-first ParameterForm density.
- App **3.71.44**, SDK **1.51.22**, Unit Templates **2.5.18 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.21**, Android `versionCode` **185**.

## v3.71.43 WIP — Non-greedy Unit composition + Pulse presentation parity repair

- Fixed a generic Unit Layout greediness bug: detached/unmeasured compositions with width `0` now preserve the base recipe instead of immediately selecting every narrow `maxWidth` patch. Responsive collapse begins only after a real container width is known.
- Tightened the default public Unit form/action recipes so useful two-column and four-column layouts remain compact at normal panel widths and collapse only at genuinely compact widths. This is a Unit default-quality correction, not a Pulse-only exception.
- Extended the public Header Unit with Core-styled `eyebrow`, `titleEmphasis` and `metaPlacement` parameters. Plugins may declare these accepted details while Core remains the single typography/paint owner.
- Reconstructed Pulse Sampler production presentation parity using only public Unit parameters: restored title hierarchy, 14 px content inset, two-column pulse fields, four-action row, stretchable segment table, merged-waveform vertical allocation, sampling/result hierarchy and stretch behavior. No Pulse-specific CSS or Pulse-specific Unit was added.
- Kept Pulse live-domain, domain adapter and steady-state Task byte-identical. Production state, generation/merge algorithms, Task execution and result ownership remain unchanged.
- Advanced the generic authored-style baseline only for the new public Unit Header hierarchy while preserving the frozen **Desktop Visual Closure** history and domain-blind Core ownership.
- App **3.71.43**, SDK **1.51.21**, Unit Templates **2.5.17 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.20**, Android `versionCode` **184**.

## v3.71.42 WIP — Pulse Sampler production Unit cutover

- Replaced the built-in Pulse Sampler Tool legacy production DOM/CSS presentation with the previously accepted public-Unit composition. The production presentation now mounts from `src/plugins/pulse-sampler-tool/unit-presentation.js` and consumes the same live-domain snapshot/actions established in v3.71.41.
- Kept production domain/state/scientific ownership unchanged: `live-domain.js`, `domain-adapter.js`, `steady-state-task.js`, pulse generation/merge logic, project state, extraction Task path and result owner remain the sole production owners.
- Retired the legacy Pulse Sampler `plugin.css` and `mobile.css` completely. Desktop/Mobile composition is now platform-neutral Unit composition plus the existing Presenter semantics; no Pulse-specific Unit or second geometry owner was added.
- Preserved the accepted titleless `data-control` parameter PRIME, segment table, three-channel waveform plot/table, extraction controls, result plot/table and responsive Unit layout recipes.
- Updated native geometry provenance and historical regression gates so they protect the current Unit contracts rather than requiring retired Pulse CSS. The Unit catalog remains **41 types** and Unit Templates remains **2.5.16**.
- Preserved the frozen **Desktop Visual Closure** history while reopening real Windows Electron/device visual acceptance for this production cutover.
- App **3.71.42**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Pulse Sampler Tool **1.9.19**, Android `versionCode` **183**.

## v3.71.41 WIP — Pulse Sampler live Unit side-by-side acceptance

- Connected the disabled Pulse Sampler Unit shadow to a single production live domain projection at `com.dkds.tools.pulse-sampler/live`. The production plugin remains the only state, pulse-generation, sampling-task and numerical-result owner; the Unit shadow contains no duplicate pulse generator, merge pipeline, extraction task or project state store.
- Refactored production Pulse Sampler UI commands to invoke the same model-first live actions used by the side-by-side Unit shell. Channel selection, parameter edits, preview generation, segment mutation, sampling controls, extraction, result projection, copy and export therefore have one execution path rather than UI-only and Unit-only variants.
- Added production snapshots for channel parameters/segments, merged waveform display projection, scoped source metadata, analysis controls and extracted result presentation. The Unit shell subscribes to that projection and mirrors fields, tables and both scientific plots without owning scientific computation.
- Guarded extraction-result rendering for an unmounted production page so domain actions remain valid when the live Unit shell is active independently of the legacy production view.
- Added executable live side-by-side acceptance covering real domain-service dependency checks, production→Unit projection, Unit→production action round trips, direct production notifications and stale-result clearing. Production presentation is **not replaced** in this stage.
- Preserved the frozen **Desktop Visual Closure** history and the current Unit ownership/cascade contracts; no Pulse-specific Unit, Core selector, shadow CSS, compatibility shim or second geometry owner was introduced.
- App **3.71.41**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.33**, Pulse Sampler Tool **1.9.18**, Android `versionCode` **182**.

## v3.71.40 WIP — Data Center inset tuning + Pulse Sampler Unit shadow

- Reduced the Data Center bounded-preview row-count right inset from **40 px to 20 px**, exactly halving the accepted Unit-owned spacing while keeping the row aligned and free of plugin CSS overrides.
- Started the **Pulse Sampler Tool** Unit migration as a disabled, non-production Unit-only shadow under `examples/sdk151-unit-pulse-sampler-shadow/`. Production Pulse Sampler runtime/domain owners remain untouched in this stage.
- Reconstructed the Pulse Sampler presentation from the existing **41 public Units** and generic accepted recipes only: titleless parameter PRIME, Vd/Vs/Vg tabs, pulse parameter fields/actions, segment table, waveform plot/table, sampling/result controls, result plot/table. No Pulse-specific Unit and no shadow CSS were added.
- Added seven-layer parity metadata and executable SDK validation/runtime/layout coverage for the Pulse Sampler shadow. The next stage is live side-by-side wiring to the existing production Pulse domain owner before any production presentation cutover.
- Preserved the **Desktop Visual Closure** history while keeping Unit ownership/cascade gates as the active evidence for current presentation changes.
- App **3.71.40**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.33**, Android `versionCode` **181**.

## 3.71.39

- Removed Data Center implementation/architecture explanatory tooltips from production UI. End users no longer see internal concepts such as Chart Provider replacement rules, plugin extensibility notes, or Core/Unit behavior explanations.
- Preserved useful operational labels and accessibility text; only implementation-facing explanatory copy was removed.
- Updated regression coverage so Data Center production presentation rejects reintroduction of `data-dkds-tooltip` implementation notes.

## v3.71.38 WIP — Unit Semantic Cascade Re-audit

- Re-audited the archived v3.71.28–v3.71.36 Unit sources for the two newly exposed failure classes instead of treating the Data Center screenshot as a one-page bug. The old unsafe CSSOM shorthand loop existed in every directly audited snapshot; Data Center and Pulse had live shorthand-sensitive Layout mounts, while Resonance and TER did not use that exact path.
- Confirmed Pulse was also exposed to the old shorthand bug through four production mounts (`inline-range`, `file-toolbar`, `active-file-head`, and accepted control-form padding). The generic v3.71.37 runtime repair now restores those values as well; no Pulse-specific patch was added.
- Re-audited semantic Field proxies across Desktop and Mobile. Data Center is currently the only production Unit plugin with `columns`/popup-multiselect schemas (4 fields), but Mobile also had generic drawer padding and compact-density tag selectors that could diverge a button-backed Field proxy from native selects. Both now consume/exclude canonical `.dkds-field-control` semantics correctly.
- Added `unit-semantic-cascade-audit` as a permanent Architecture Hygiene gate. It covers all five shorthand families, all **73** Layout recipes (**58 shorthand-sensitive**), all **4** production Unit presentations, generic Field-proxy leakage, and the production exposure census.
- Corrected the Unit ownership source census from **82** to **81** real Layout mounts: the old parser counted the Resonance local `layout(...)` helper definition as a mount. No runtime layout was removed.
- Corrected stale SDK prose that advertised unpublished `Unit Templates 2.5.17 / SDK 1.51.21`; the actual public contract remains **Unit Templates 2.5.16 / SDK 1.51.20 / 41 Units**.
- App **3.71.38**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.31**, Android `versionCode` **179**.

## v3.71.37 WIP — Field Proxy + Unit CSSOM Shorthand Closure

- Fixed canonical Field proxy geometry leaking through the generic AnalysisWorkbench button rule; popup multi-selects now consume only Field geometry.
- Fixed Unit Layout CSSOM shorthand reconciliation so longhand cleanup can no longer erase declared padding/margin/inset/overflow/gap values.
- Added regression coverage for the exact preview-count right inset and Field-proxy ownership path.
- App **3.71.37**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.31**, Android `versionCode` **178**.

## v3.71.36 WIP — Canonical Field Parity + Data Center Preview Spacing Closure

- Attempted to normalize native select and popup-multiselect Field geometry, remove the accidental boolean disclosure caret, restore chart-control spacing, and increase the preview-count right inset through generic Unit geometry.
- Removed direct Data Center Mobile rendered height ownership for canonical Field controls in favor of the shared Field density token.
- The subsequent Windows screenshot proved two closures were incomplete: the `Y 列` proxy still consumed AnalysisWorkbench generic button geometry, and Unit Layout CSSOM cleanup erased the declared preview padding after writing it. These are corrected in v3.71.37.
- App **3.71.36**, SDK **1.51.20**, Unit Templates **2.5.16 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.30**, Android `versionCode` **177**.

## v3.71.35 WIP — Unit Adoptive-Role Composability + Data Center Remount Recovery

- Fixed a generic Unit composability bug: adoptive/decorator Units no longer overwrite an existing structural `data-dkds-unit-template` / variant.
- `ParameterForm layoutOwner:'host'` now survives repeated destroy/remount cycles on the same Layout Unit; this restores Data Center formula controls that disappeared after the first domain rerender.
- Extended the same additive-role rule to Workspace, ComponentTree, **Layout.apply**, Portable, Meter, MovableWindow, PlotView, PlotGroup and ScientificPlot adoption paths; SplitPane behavior now preserves the host structural Layout variant. A Unit that decorates/adopts an existing Unit may add a role but may not erase the structural role/variant.
- Data Center preview row-count note now keeps a clearly visible 28 px right inset through the Unit Layout owner; no plugin CSS override was added.
- Historical review of 3.71.28–3.71.34 confirmed the same identity-clobber class in ParameterForm, Layout.apply/bind, SplitPane and scientific adoption paths. It was mostly latent before 3.71.33; 3.71.33–3.71.34 made the Formula case user-visible because host-owned ParameterForm validation required the Layout identity on every remount.
- App **3.71.35**, SDK **1.51.19**, Unit Templates **2.5.15 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.29**, Android `versionCode` **176**.

# DK Data Studio Changelog

## v3.71.34 WIP — Unit Cross-Layer Ownership Audit and Closure

- Re-audited every production Unit presentation from the ownership boundary upward instead of continuing Data Center screenshot-specific patches. The active production set remains exactly **TER / Pulse / Resonance / Data Center**, with **41 public Units** and no `Unit_for_xxx` special cases.
- Added a permanent runtime-Unit ↔ authored-plugin-CSS geometry gate. It resolves every literal Unit Layout class/recipe, explicit `geometry` / `responsiveGeometry`, SplitPane runtime geometry and PRIME detail inset against the plugin's `plugin.css` / `mobile.css`, then rejects any rendered property that has two geometry owners.
- Historical re-audit with the new gate proves the problem pre-dated the latest Data Center fixes: v3.71.28–v3.71.31 each contain **130** cross-layer conflicts (**65 Data Center + 65 Pulse**); v3.71.32 contains **127** (**62 Data Center + 65 Pulse**). Those older releases passed the previous style gate because it did not compare Unit runtime geometry writes against authored plugin CSS on the same rendered element.
- Current production sources are reduced to **0 cross-layer Unit/CSS geometry conflicts** across **82 Unit Layout mounts + 1 SplitPane mount**. Resonance and TER are included in the same audit and remain at zero; Data Center and Pulse were the two affected production migrations.
- Converted duplicate ownership into explicit mutually-exclusive generic contracts rather than specificity overrides: Layout supports a semantic `responsiveTarget`; ParameterForm supports `layoutOwner:'core'|'host'`; SplitPane supports `layoutOwner:'core'|'host'` with host mode rejecting Core reflow. Host-owned geometry must consume Core state tokens instead of creating a second runtime geometry writer.
- Restored Data Center source-parity structure by removing Unit wrappers/recipes that changed the accepted `.dc-main` direct Grid-item relationship. Formula / Workflow / Provenance and chart placement therefore consume the accepted plugin-owned workspace geometry without a second Unit grid owner.
- Moved the bounded-preview right inset into the generic Unit Layout declaration rather than adding another Data Center CSS override. Canonical select/multi-select disclosure remains Core-owned.
- Pulse was found to have the same class of duplicate ownership from its v3.71.16 production Unit cutover. Its accepted Desktop/Mobile split geometry is now host-owned and consumes the Core persisted split-size token; file toolbar, active-file head and parameter-grid accepted detail are Unit-owned with plugin CSS duplicates removed.
- Updated historical tests that incorrectly required Pulse spacing to remain in plugin CSS: the same accepted `7px` gap / `9px` top rhythm is now protected at the canonical `file-toolbar` Unit recipe owner.
- Desktop Visual Closure history remains explicit, but it is not treated as evidence that a later Unit migration has single ownership; the new cross-layer gate is now the active evidence for this specific failure class.
- App **3.71.34**, SDK **1.51.18**, Unit Templates **2.5.14 / 41 Units**, Plugin API **1.19.0**, Data Center **1.15.28**, Pulse Analysis **2.12.1**, Android `versionCode` **175**.

## v3.71.32 WIP — Data Center chart-row parity and preview inset

- Removed the competing Unit `form-grid-4` runtime owner from the Data Center chart-parameter host. The host is now an identity mount point and the existing ParameterSchema auto-fit contract is again the single responsive grid owner, restoring four chart controls to one row at the same real panel width.
- Updated the Data Center Unit shadow and SDK native blueprints to describe the preview controls as `parameterForm:auto-fit`, not as a second responsive layout grid.
- Moved the bounded preview row-count note into a Unit-owned right-aligned row with a 10 px horizontal inset, so `预览前 n / total 行` no longer touches the right edge.
- Preserved the accepted Data Center `plugin.css` / `mobile.css` byte-for-byte and kept Core/Theme visual behavior unchanged.
- Advanced stale authored-style freeze hashes to the already-accepted v3.71.31 canonical select/multi-select Field parity baseline; no new style file changed in v3.71.32.
- Desktop Visual Closure history remains intact; this WIP still requires final Windows Electron visual acceptance.

# v3.71.31 WIP — Canonical Select / Multi-Select Field Parity

- Fixed the recurring Data Center X/Y selector mismatch at the actual Core owner. `X 列` is a native single `<select>` while `Y 列` (`type:'columns'`) is a popup multi-select proxy implemented as a `<button>`. Both already carried canonical Field identity, but the single-select still used the browser-native arrow/line box while the proxy used a text `⌄` caret and button line box. That left two physical appearance paths under one semantic Field contract.
- Core Component Appearance now gives every canonical Field select and the multi-select proxy one disclosure indicator, one font/line-box recipe and `appearance:none`; the legacy proxy text caret is hidden. The existing `--dkds-field-control-*` geometry slots remain the only density contract. No Data Center-specific CSS patch was added.
- The accepted native Mobile exact compact-control geometry remains in the platform owner; Desktop no longer depends on browser-native select chrome to happen to match the proxy.
- Added `test-v37131-parameter-select-proxy-parity.js` and retained the historical **Desktop Visual Closure** record as history only, not as an active whole-file SHA gate.
- Runtime Chromium computed evidence for the actual X/Y shapes: both are **26 px** high, `2/26/2/6 px` padding, `12 px / 13.8 px` font/line-height, `7 px` radius, identical border, identical canonical disclosure background, and `appearance:none`.
- App **3.71.31**, Data Center **1.15.25**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **172**.

# v3.71.30 WIP — Data Center Real-Host Parity Closure

- Fixed the production Data Center render-abort chain introduced during the Unit cutover. Formula reference chips now use the public `quiet` Chip variant with independent `interactive:true` semantics instead of the nonexistent `interactive` visual variant, so `renderFormula()` no longer throws before chart-control and chart-preview rendering.
- Fixed duplicate `通用图形预览` titles by preserving the canonical Unit Plot header title class. PlotView now adopts the existing Unit title instead of inserting a fallback second title.
- Fixed the Desktop artifact filters remaining vertically stacked after v3.71.29. The detached data-control PRIME no longer makes a pre-mount width decision from `0px`; its accepted two-column geometry is unconditional on Desktop, while the existing mounted Mobile `@container` query retains the genuine ultra-narrow one-column fallback.
- Preserved the existing chart PRIME inline/dock/float/global placement contract, titleless data-control PRIME, production domain owners, accepted Data Center detail CSS and the frozen **Desktop Visual Closure** architecture baseline. No Core, SDK, Unit catalog or Theme contract capability was added.
- Added executable regression coverage for the invalid-chip render abort, duplicate PlotView title, detached zero-width filter reflow, chart auto-open/inline placement and mounted Mobile narrow fallback.
- App **3.71.30**, Data Center **1.15.25**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **171**.

# v3.71.29 WIP — Data Center Production Visual Parity Repair

- Restored the accepted Data Center artifact-rail geometry after the production Unit cutover. The generic `form-grid-2` / `action-grid-4` responsive recipes were correctly reusable but too aggressive for this already-approved narrow rail, so the production Unit declaration now supplies accepted detail geometry: two filter columns and one four-action selection row, with only an explicit ultra-narrow filter fallback.
- Restored the missing chart preview by making the `scientific-secondary` chart PRIME open on first composition and return to the authored `.dc-main` inline host. This repopulates the existing `"tool chart"` grid instead of leaving its right-hand track empty.
- Removed the duplicate Desktop workbench navigation chrome (`数据` / `图形预览`) by declaring the Data Center PluginWorkspace navigation hidden. Semantic `data-control` / `scientific-secondary` surfaces remain registered through the existing production contracts for Mobile/Presenter projection.
- No Core, SDK, Unit catalog, Theme contract, Data Center `plugin.css`, `mobile.css`, controller, selection, command, workflow, provenance or chart-domain owner was changed. This remains downstream of the frozen **Desktop Visual Closure** architecture baseline.
- Added an executable regression that proves accepted Unit detail geometry overrides generic narrow-width recipes and guards chart auto-open + inline-host + navigation behavior.
- App **3.71.29**, Data Center **1.15.24**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **170**.

# v3.71.28 WIP — Data Center Production Unit Presentation Cutover

- Data Center production presentation/composition is now owned by `unit-presentation.js`; the existing production Artifact/Selection/Formula/Workflow/Provenance/Chart owners remain unchanged.
- The production page is reconstructed from the existing 41 Unit Templates: page/header/workspace, titleless data-control PRIME, bounded Unit Table preview, Formula/Workflow/Provenance surfaces, and a PRIME-owned scientific chart PlotView.
- Removed the obsolete Data Center Mobile-only presentation runtime. Desktop and Mobile now share the same Unit composition, while accepted `mobile.css` remains the plugin-specific responsive detail stylesheet.
- `shared-views.js` is reduced to a thin adapter into the Unit production presentation; `feature-runtime.js` no longer owns raw preview-table/formula-chip/chart-PRIME composition.
- App **3.71.28**, Data Center **1.15.23**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **169**.
- `examples/sdk151-unit-data-center-shadow` remains as historical side-by-side evidence and now records `productionReplaced:true`.

# v3.71.27 WIP — Data Center Side-by-Side Live Presentation Acceptance

- Advanced Data Center from the v3.71.26 live-domain seam into executable side-by-side presentation acceptance without replacing the production Data Center UI. The Unit shadow and accepted production presentation now consume the same Artifact Store, Selection, formula, Workflow/Recipe, provenance and Chart Provider owners.
- Reworked the SDK Unit shadow from static samples into a live presentation consumer: artifact catalog/selection, 18-row bounded table preview, formula refs/parameters, Workflow steps/status, provenance, chart provider/parameters and empty/running/error states now project from production state. Visible Unit actions round-trip through the dependency-gated `builtin.data-center/live` owner.
- Unit chart presentation delegates actual drawing to the same registered production Chart Provider and same Artifact object instead of copying chart arrays. Direct production artifact/tab/workflow changes automatically project back into the Unit shadow through the live subscription.
- Split side-by-side/domain wiring into `live-domain-bridge.js` so Data Center `feature-runtime.js` remains below the 48 KiB repository module ceiling; the ceiling was not relaxed. `domain-runtime.js` stays serializable/bounded and `chart-runtime.js` remains the Chart Provider lifecycle owner.
- The shadow remains `productionReplaced:false`. Live side-by-side presentation is accepted at the executable owner/state boundary; the next migration step is Data Center production Unit presentation cutover, not another Unit expansion. Accepted Data Center CSS/controller/selection/command/mobile owners remain frozen.
- App **3.71.27**, Data Center **1.15.22**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **168**.

# v3.71.26 WIP — Data Center Live Domain / Unit Shadow Integration

- Entered Data Center production Unit source-parity reconstruction at the user's explicit direction while leaving the v3.71.25 Resonance source untouched. This phase does **not** replace Data Center production presentation.
- Connected the existing Unit-only Data Center shadow to the same production Artifact Store, selection, workflow/recipe, provenance and chart state through the generic dependency-gated `ctx.services.domain` seam. The live projection remains bounded to an 18-row table preview and exposes only whitelisted production actions.
- Split Data Center chart-provider presentation into `chart-runtime.js` and serializable live projection/action bridging into `domain-runtime.js`, keeping the existing `feature-runtime.js` below the 48 KiB module boundary without weakening repository hygiene.
- Preserved Artifact-local revision identity, lazy source-row identity, linked table/curve selection, linked legend visibility, compact auto-fit chart parameters and stale-chart cleanup under their new formal owners. Historical Phase E gates now verify those owners instead of assuming every chart concern lives in `feature-runtime.js`.
- The Data Center shadow remains `productionReplaced:false`. Next phase is live side-by-side presentation acceptance before any production Unit cutover. This work remains downstream of the frozen **Desktop Visual Closure** architecture baseline and does not reopen its visual ownership rules.
- App **3.71.26**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **167**.

# v3.71.25 WIP — Resonance Immediate Group Columns + Range Text + Global History Closure

- Fixed Resonance Group column controls to commit through the live Unit PlotGroup `setColumns(...)` owner, so choosing 每行 1–6/自动 immediately reapplies GroupArea instead of waiting for a later scientific render/update.
- Published `PlotGroup.getOrientation()` through Core, Unit Templates, TypeScript and GroupArea authoring docs. Orientation-specific Resonance preferences now use the resolved GroupArea orientation instead of an implicit landscape fallback.
- Fixed the Resonance Unit text helper to use the public DOM factory `text` option. Accepted range-selection heading/footer text and other text-only section headings are restored without changing accepted range-menu CSS.
- Fixed the global Desktop shortcut router by defining its typing-target guard before the window keydown listener. Ctrl/Cmd+Z and Ctrl/Cmd+Y can now reach unified system history when focus is not inside an editable control.
- No PlotView/subplot resize-handle styles were changed. The accepted child-plot handle appearance remains byte-stable relative to v3.71.24.
- App **3.71.25**, SDK **1.51.16**, Unit Templates **2.5.12 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **166**.

# v3.71.24 WIP — Resonance Main/Group Runtime Closure + TER First-Start Dedup

- Resonance production Unit PRIMARY now consumes the accepted scientific layout variants (`accepted-main-area/workspace/plot-wrap/header/plot/summary`) and the accepted-scientific Workspace variant activates the `accepted-scientific-v1` profile on the real workbench shell.
- Group column menu commits synchronously reflow the existing GroupArea; it no longer waits for a later data refresh/update before the visible column count changes.
- Hidden/parked Resonance Group panels retain invalidation but no longer repaint from settled peak metrics or async Resonance TER completion while invisible.
- TER first activation keeps `page.onOpen` as the presentation synchronization owner and coalesces the immediately-following `analysis:refresh`, preventing duplicate control/table synchronization on startup.
- App **3.71.24**, SDK **1.51.15**, Unit Templates **2.5.11 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **165**.

# v3.71.23 WIP — Resonance Windows Runtime Recovery

- Fixed the real Resonance Group PRIME failure exposed by Windows Electron. The Unit reconstruction incorrectly leaked the content semantic `plot-group` into the outer PortableView PRIME, while PortableView intentionally accepts panel/inspector surface semantics. Group mount therefore rendered scientific child plots and then threw before placement chrome, drag binding, resize ownership and action-group wiring could install. The outer Group PRIME is again the accepted generic `panel`; PlotGroup semantics remain on the group content Unit.
- Restored the complete accepted Group floating lifecycle without a Resonance-specific Core branch: placement + columns + collapse + close chrome can finish mounting, titlebar pointer drag moves the floating panel, and the Core resize handle owns outer-panel resizing. PortableView explicitly suppresses browser-native `resize` while its Core handle is installed, so Chromium cannot expose the native diagonal grip underneath an incomplete PRIME.
- The child PlotView resize-handle presentation is deliberately unchanged. `sdk-semantic-surfaces.css` and `plugin-chrome.css` remain byte-identical to v3.71.22, so this patch does not reintroduce or redesign any folded-corner/child-plot handle effect.
- Tightened Resonance main-plot attachment: the runtime ScientificCurveSurface receives the exact parent of the Unit-created SVG instead of resolving a global selector again. The v3.71.21 false-positive renderer gate was corrected: it no longer uses an empty curve plus an `onEmpty` fake path, and now sends finite Resonance sweep data through the real main-plot adapter while asserting the Unit SVG target and exact container contract.
- Corrected the production freeze gate to classify `feature-main-plot-runtime.js` as presentation/scientific attachment wiring rather than a frozen domain/numerical owner. The remaining Resonance controller/domain/task baseline is still byte-frozen, including the five files called out by the current handoff.
- This remains a bounded source-parity recovery after the frozen **Desktop Visual Closure** baseline. Resonance is still **NOT Windows accepted** until the actual Electron host confirms the main scientific curve and complete Group floating chrome/drag/resize behavior. Data Center reconstruction remains blocked.
- App **3.71.23**, SDK **1.51.15**, Unit Templates **2.5.11 / 41 Units**, Plugin API **1.19.0**, Android `versionCode` **164**.

# v3.71.22 WIP — Windows Developer Toolbox Storage Diagnostic Fix

- Fixed the shared dependency installer preflight on Windows PowerShell 5.1 / StrictMode. PowerShell unwraps a populated `Nullable[Int64]` parameter to `Int64`; `Format-StorageBytes` incorrectly read `$Bytes.Value`, so a low-space preflight crashed with “property Value not found” instead of reporting the actual cache-space problem.
- Storage formatting now normalizes the non-null input with `[Int64]$Bytes` and never dereferences `.Value`. The existing 512 MiB safety threshold is unchanged. If the shared dependency cache drive is below the threshold, Toolbox now reports the staging path, actual remaining capacity, and the cache-path action to take.
- Added a Windows tooling regression gate that rejects reintroduction of `.Value` in the storage formatter. No Resonance/Unit/Core presentation behavior changed; SDK remains **1.51.15**, Unit Templates **2.5.11 / 41 Units**, Plugin API **1.19.0**.
- App **3.71.22**, Android `versionCode` **163**. Resonance remains pending the same Windows Electron source-parity acceptance defined by v3.71.21.

# v3.71.21 WIP — Resonance Runtime Interaction Source-Parity Closure

- Corrected generic portable Header ownership exposed by the Resonance Group PRIME reconstruction. When a Unit-authored portable Header explicitly adopts an accepted action container (`actionsClassName` + `integratedActions:false`), Header no longer pre-creates a `dkds-portable-controls` owner. PortableView is again the single placement-control owner, eliminating the nested two-layer controls structure while preserving the accepted Group action order.
- Restored the accepted Group PRIME runtime action chain without Resonance-specific Core branches: columns action host, collapse/expand, close callback and PortableView placement control all operate through the existing Workbench/PortableView owners. A new runtime interaction gate mounts the real Header + PortableView path, clicks controls, verifies placement/state transitions, and exercises close/re-place lifecycle.
- Tightened delegated ScientificPlot ownership. `renderOwner:'runtime'` records Unit lifecycle semantics but no longer mutates the accepted SVG target with a generic chart-host class before the real renderer attaches. A runtime gate creates the real SVG through Layout, attaches the canonical ScientificCurveSurface to that exact node, and verifies a completed visible SVG draw lifecycle.
- Resonance accepted paint/geometry CSS and numerical/domain owners remain byte-frozen; no plugin-specific Core selector or branch was added. Unit Templates advance to **2.5.11**, SDK to **1.51.15**, catalog remains **41 Units**.
- App **3.71.21**, Plugin API **1.19.0**, Android `versionCode` **162**. Windows Electron visual acceptance is still required before Resonance can be marked accepted.

# v3.71.20 WIP — Resonance Runtime Source-Parity Closure

- Fixed the blank Resonance main plot exposed by Windows Electron after the v3.71.19 Unit production cutover. Unit Layout now creates non-HTML primitives in an explicitly declared DOM namespace; the accepted `#reswinMainPlot` declares `namespace:'svg'` and therefore becomes a real SVG element rather than an HTML-namespace lookalike.
- Fixed populated Resonance Group PRIME opening. Dynamic PlotGroup adoption now passes the accepted card title required by the strict Unit PlotView contract instead of throwing `UNIT_PLOTVIEW_TITLE_REQUIRED` during mount.
- Unit Templates advance to **2.5.10** and SDK to **1.51.14**. The Layout Unit publishes generic namespace selection; the catalog remains **41 Units** and no Resonance identity/special case is added to Core.
- Added an executable runtime source-parity gate covering real Unit SVG namespace creation and strict Group PlotView title resolution, closing the test gap that allowed v3.71.19 source-level parity to pass while runtime presentation was broken.
- App **3.71.20**, Plugin API **1.19.0**, Android `versionCode` **161**.

# v3.71.19 WIP — Resonance Production Unit Source-Parity Reconstruction

- Reconstructed the production Resonance Workbench presentation through current Unit Templates while preserving the accepted plugin geometry stylesheet, domain/controller/runtime owners, scientific algorithms, task pipeline and existing state namespaces.
- `unit-presentation.js` now owns the Resonance data-control PRIME, scientific PRIMARY, curve inspector, group analysis PRIME, physics/spacing/gate SUB views, accepted headers, controls, tables, PlotViews and scientific plot hosts. `view-components.js` remains the behavior/binding owner and delegates composition to the Unit presentation.
- Resonance parameter/data controls remain a permanently titleless `data-control` PRIME. Inspector/group placement stays platform-neutral (`right` / `bottom` accepted defaults with Presenter-owned Mobile mapping), and group child plots preserve accepted landscape detail geometry through the PlotView Unit contract.
- Preserved the accepted Resonance `plugin.css` / `mobile.css` presentation baseline and the frozen Desktop Visual Closure ownership boundaries; no Resonance identity or plugin-specific geometry was added to Core.
- Migrated historical regression gates that still inspected the retired raw presentation owner so they now verify the production Unit owner without weakening the original semantics (mode controls, range menu, PRIME close lifecycle, PlotView/GroupArea composition, header actions, scalar-field controls, data-control rail and platform-neutral placement).
- App **3.71.19**. Plugin API remains **1.19.0**; SDK remains **1.51.13**; Unit Templates remain **2.5.9 / 41 Units**. Final source validation: test **439/439**, check coverage **446/446**, Mobile **103/103**, Performance **PASS**, SDK suite/Harness **PASS**, Scientific parity **PASS**, Hard Visual Invariants **87/87**, Architecture Hygiene **PASS**, Plugin Boundary **0**, strict style ownership/gate **0 violations**, plugin manifests/packages **17/17**. Clean-source bootstrap/package verification is recorded in the handoff.

# v3.71.18 WIP — Activity-Scoped Toolbar Visibility Closure

- Fixed a generic Core shell regression where activity-scoped toolbar contributions could remain visible after another TOP plugin became SUPER/main. The runtime had already marked the old contribution with `plugin-activity-hidden`, but the more-specific shell layout rule `.plugin-context-toolbar .plugin-toolbar-btn { display:inline-flex; }` overrode the canonical hidden state.
- The visible shell geometry now explicitly excludes `.plugin-activity-hidden`; the context-overflow/fallback lane follows the same rule so responsive reparenting cannot resurrect an inactive command. This fixes the stale Resonance **设置** button without adding Resonance identity or special-case logic to Core.
- This is a bounded Core shell bugfix after the frozen Desktop Visual Closure baseline, not a Unit/SDK expansion. TER/Pulse accepted plugin CSS stays byte-frozen; SDK remains **1.51.13**, Unit Templates remain **2.5.9 / 41 Units**, Plugin API remains **1.19.0**, Theme Contract remains **3.10.0**.
- App **3.71.18**, Android `versionCode` **159**.

# v3.71.17 WIP — Pulse Parameter Source-Parity + Overflow Dismissal Closure

- Fixed the Pulse Analysis parameter PRIME source-parity regression exposed by Windows Electron: the generic Unit `file-toolbar` recipe had inherited a `<=520 px` column collapse that does not belong to the accepted Pulse source, so the three file actions stacked vertically and increased the file card / parameter panel height by roughly two extra button rows.
- Unit Templates **2.5.9** removes that plugin-derived breakpoint from the generic `file-toolbar` recipe. Pulse now declares its accepted **310 px** collapse explicitly through Unit `responsiveGeometry`; the accepted Pulse `plugin.css` remains unchanged and the 41-Unit catalog is unchanged.
- Fixed the Desktop `更多功能` dismissal path. Core ContextMenu now treats a declared anchor as part of the interaction boundary, so a second trigger click reaches the real toggle instead of the capture-phase outside handler closing and the click immediately reopening a fresh menu.
- While the context overflow popup is open, the main topbar temporarily switches from Electron `app-region:drag` to `no-drag`, allowing a click on otherwise draggable blank topbar space to dismiss the menu. Normal window dragging is restored immediately on close.
- This patch does not reopen Desktop Visual Closure ownership or add plugin identity to Core. It corrects generic Unit responsive-detail ownership and generic shell-menu interaction semantics only.
- App **3.71.17**, SDK **1.51.13**, Unit Templates **2.5.9**, Plugin API **1.19.0**, Theme Contract **3.10.0**, Android `versionCode` **158**.

# v3.71.16 WIP — Pulse Production Unit Source-Parity + Context Overflow Closure

- Pulse Analysis production presentation is reconstructed through current Unit Templates while preserving the existing analysis service, controller, numerical pipeline, accepted state namespaces and exact accepted `plugin.css` bytes.
- Unit Templates 2.5.8 adds generic source-parity Header anatomy (`stacked`, optional actions host, `plot-minimal`) and Field `controlOnly` composition required to reproduce accepted Pulse DOM without raw plugin control markup. The catalog remains 41 Units.
- The Pulse data-control PRIME remains permanently titleless; result/raw PlotViews, result SplitPane and table are now Unit-owned composition while runtime scientific rendering remains the single render owner.
- Fixed the Desktop `更多功能` double-layer/dismissal regression: `#contextOverflowMenu` is now a hidden membership store only, while the visible dropdown is owned by one transient Core ContextMenu. Closing the popup also collapses the fallback store.
- App **3.71.16**, SDK **1.51.12**, Unit Templates **2.5.8**, Plugin API **1.19.0**, Android `versionCode` **157**.
- Pulse accepted interaction ids and private geometry hooks are now executable source-parity invariants, so dropping a control/plot target or a byte-frozen CSS hook fails before manual screenshot review. The Pulse SDK shadow was also corrected to the permanent titleless parameter-PRIME rule.
- Final production-source validation: test manifest **436/436**, check coverage **443/443**, Mobile **103/103**, Performance **PASS**, SDK Harness **PASS**, Scientific parity **PASS**, Hard Visual Invariants **87/87**, Architecture Hygiene **PASS**, Plugin Boundary **0**, style ownership/gate **0 violations**, plugin manifests/packages **17/17**.

# v3.71.15 WIP — Main Shell Import Projection Closure

- Fixed the duplicate main-shell **导入数据** regression introduced while restoring dedicated TOP-window import actions. `isTopDefinition()` accepts a registered plugin definition, but `pages/panels.js` passed a raw manifest, so every TOP workbench was misclassified as non-TOP and could register a contextual import action in the shared main shell.
- Main-shell TOP/SUPER workbenches now classify `definitionById(pluginId)` and therefore use only the single global **导入** route. Dedicated plugin windows keep the Core-owned local **导入数据** action and its accepted titlebar order.
- Strengthened the runtime regression to reject the wrong argument shape and exercised TER, Resonance, Pulse and Vth TOP workbenches together; none may create a main-shell contextual import action. The historical static gate was also corrected so it can no longer protect the broken `isTopDefinition(manifest)` call.
- No Unit, SDK, Theme, PlotView, Workbench geometry or authored CSS change. SDK remains **1.51.11**, Unit Templates **2.5.7 / 41 Units**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- App advances to **3.71.15** and Android `versionCode` to **156**.

# v3.71.14 WIP — Unit Detail Geometry Ownership

- Moved TER parameter inset and heatmap content sizing behind explicit Unit Template detail-geometry contracts instead of leaking raw lower-level Workbench/PlotView options through Unit composition.
- Added `prime.detailGeometry.contentInsetPx`; Unit Templates validate and own the accepted parameter-panel padding write. Unit-authored PRIME now rejects raw `contentInset`.
- Added `plotView.detailGeometry.contentAspectRatio/contentMinHeightPx/contentMaxHeightPx`; Unit Templates validate these values and translate them into the existing generic PlotView execution service. Unit-authored PlotView rejects raw lower-level content geometry fields.
- TER production now uses `variant:'fixed-titleless'` + `detailGeometry:{contentInsetPx:12}` for its parameter PRIME and Unit PlotView detail geometry for square heatmaps. Accepted `plugin.css` remains byte-identical.
- Core `AnalysisWorkbench` and Core `PlotView` receive no plugin accepted-detail object and no TER/SFeRT identity. The Unit facade terminates the plugin detail contract before invoking those generic services.
- Unit Templates advance to **2.5.7**, SDK to **1.51.11**, Plugin API remains **1.19.0**, Unit catalog remains **41 types**, Android `versionCode` advances to **155**.
- Added executable release-gate coverage proving PRIME inset lifecycle cleanup, PlotView detail mapping, rejection of raw Core geometry through Unit authoring, and absence of `detailGeometry` leakage into Core execution modules.

# v3.71.13 WIP — TER Source-Parity Runtime Closure

- Closed the four Windows source-parity regressions found after the TER Unit cutover without adding a TER-specific Core path or expanding the public SDK/Unit catalog.
- Restored the accepted TER parameter-panel outer inset through the existing generic PRIME `contentInset:'comfortable'` contract while continuing to adopt the accepted titleless `ter-workspace-left` node directly. The accepted TER geometry stylesheet remains byte-identical.
- Restored accepted heatmap/data-plot proportions through PlotView's existing `contentAspectRatio` content-geometry contract, so square TER heatmaps re-acquire their post-layout width before rendering instead of keeping the smaller generic plot height.
- Corrected Core import projection by host: TOP/SUPER workbenches in the main shell use only the global **导入** route, while a dedicated plugin window receives the Core-owned **导入数据** action locally after its Unit-composed header exists.
- Extended the existing **更多功能** overflow owner so complete primary plugin activity buttons enter the menu when the primary lane is short. Plugin names are never shrunk or left partially clipped; lower-priority context commands are sacrificed before primary activities and the active activity is retained longest.
- Kept Desktop Visual Closure/Core style ownership frozen: no authored Core CSS byte change, no new Core service/API, no new Unit, no TER selector in Core, SDK remains **1.51.10**, Unit Templates remain **2.5.6 / 41 Units**, Plugin API remains **1.19.0**.
- Added executable v3.71.13 regression evidence for the 12 px accepted parameter inset/anatomy, post-layout square plot geometry, host-correct import projection, and whole-button primary overflow.
- App advances to **3.71.13** and Android `versionCode` to **154**.

# v3.71.12 WIP — Scientific Plot Material / TER Startup Ownership Fix

- Fixed the remaining TER layered/two-shadow appearance at its generic Unit owner. `renderOwner:'runtime'` ScientificPlot targets were incorrectly tagged `dkds-scientific-surface-host`, so Semantic Material treated the inner drawing host as a second `surface` inside the PlotView/card that already owned the Material surface. Delegated Unit plots now use renderer-neutral `dkds-scientific-chart-host` identity and no longer receive a second Material background/shadow/backdrop recipe.
- Kept the scientific renderer paper/plot background unchanged. The plot paper remains opaque for scientific contrast/source parity, but it is no longer a second Material card and therefore is not a second drop-shadow owner.
- Reduced TER restored-project startup work without changing scientific results: Activity activation no longer calls `T.render()` in addition to the page `onOpen` owner, linked-data refresh no longer reapplies unchanged PlotGroup geometry, frame-priority R–V selection styling waits for the base render promise, and the primary TER heatmap now uses the existing `frame` render priority so the page can paint before the expensive scalar field.
- Added runtime regression evidence proving one initial layout application, one seven-plot resize pass per refresh, one R–V base render schedule, and no duplicate activation render; added a Material ownership gate proving runtime-delegated plot content cannot reclaim `dkds-scientific-surface-host`.
- Performance suite, TER-focused test/check suites, Mobile TER/scientific subsets, Hard Visual Invariants, Architecture Hygiene, strict Native Analysis audit and strict Style Ownership all pass on the final source. Windows Electron pixel acceptance remains WIP until the same client is rechecked.
- Desktop Visual Closure history remains preserved; this patch changes the owning Unit/TER runtime contracts rather than re-opening the frozen Desktop presentation architecture.
- App advances to **3.71.12** and Android `versionCode` to **153**. Public SDK remains **1.51.10**, Unit Templates remain **2.5.6 / 41 Units**, Plugin API remains **1.19.0**.

# v3.71.11 WIP — TER R–V Source-Anatomy Fix

- Fixed the real Windows TER regression where the third `R–V 全 Vg · 正扫 / 反扫` card rendered its header/status but no scientific plot.
- Root cause: the Unit production composition omitted the accepted `id="terResistanceCard"`, while the existing production feature runtime intentionally resolves that card before rendering. The renderer therefore failed closed before drawing R–V or updating the selection status.
- Restored that stable accepted source id on the Unit-composed resistance card. No TER-specific branch was added to Core and no second runtime/render owner was introduced.
- Extended the v3.71.10 source-parity contract so future Unit reconstruction cannot silently drop the R–V card owner id again.
- Kept the accepted TER geometry stylesheet byte-identical, including its 14 px PlotGroup gap and responsive sizing. The apparent first-row overlap is not addressed by arbitrary spacing/paint changes before the restored R–V anatomy is rechecked in Windows Electron.
- App advances to **3.71.11** and Android `versionCode` to **152**. Public SDK remains **1.51.10**, Unit Templates remain **2.5.6 / 41 Units**, Plugin API remains **1.19.0**.

# v3.71.10 WIP — Native Source-Parity Reconstruction

- Reframed Unit Templates as the shared minimum contract rather than a mandatory final plugin layout. Plugins may retain explicit accepted detail geometry while Core continues to own semantics, lifecycle, accessibility, material/theme paint and single-owner boundaries.
- TER source parity now follows the accepted pre-cutover source directly: restored its geometry-only manifest stylesheet, accepted control/header/table anatomy, 14 px PlotGroup gap, compact transform form, `presentation-v1` data-control state and `ter-plot-view-v3` PlotView state.
- Parameter-purpose PRIME surfaces are now a hard titleless/headerless contract. Header/chrome declarations are rejected; TER adopts the source parameter node directly instead of wrapping it in a new Unit titlebar.
- Unit Templates advance to **2.5.6**, SDK to **1.51.10**, Android `versionCode` remains **151**, and the Unit catalog remains **41 types**.

# v3.71.9 WIP — TER Unit Cutover Layout/Lifecycle Fix

- Treat the real Windows Electron report after v3.71.8 as a release-blocking regression: the TER data-control PRIME rendered only its shell/header, most scientific cards were absent/unstable, and the cutover introduced concrete renderer/observer retention risks.
- Fixed the generic PRIME contract so `prime.build({content})` mounts that content into the canonical PRIME body. The fix is Core-generic and not keyed to TER.
- Reuse generated PRIME containers after close/reopen instead of allocating a new parked subtree for each reopen, closing a real DOM-retention lifecycle bug.
- Added ScientificPlot render-owner arbitration. `renderOwner:'runtime'` lets a Unit-composed plot delegate final drawing/resize observation to the existing `ctx.ui.scientificPlot.react/scalarField` runtime; it does not create a second ScientificCurveSurface/SVG/ResizeObserver and rejects a second interaction owner.
- Production TER now uses `renderOwner:'runtime'` for its seven Unit scientific plot hosts while the existing feature runtime remains the single scientific renderer/interaction owner.
- Removed `height:100%` from the generic `plot-card-fill` responsive layout recipe and from TER/TER-shadow non-heatmap plot geometry, preventing cyclic sizing of PlotGroup auto rows.
- Added a v3.71.9 regression gate covering PRIME content mounting, generated PRIME reuse, single scientific renderer ownership, delegated-interaction rejection, responsive card height ownership, SDK type publication, Unit Templates 2.5.5 and the unchanged 41-Unit catalog.
- SDK advances to **1.51.9**, Unit Templates to **2.5.5**, Android `versionCode` to **150**; the Unit catalog remains **41 types**.

# v3.71.8 WIP — Empty Unit Page Shell Fix

- Fixed the TER production Unit startup failure `Plugin page not found: terMaxPage` introduced by the formal v3.71.7 cutover.
- Root cause: Core `ui.pages.add()` tested `spec.html` by truthiness, so the intentional Unit-only request `html:''` was treated as if no page body had been supplied and the page shell was never created.
- Core page registration now distinguishes an explicitly provided `html` property from an omitted one: `html:''` creates a genuinely empty page shell for Unit composition, while omitting `html` still requires a pre-existing page and preserves the old adoption contract.
- The fix is domain-blind and propagates through the generated Plugin Kernel to both the main shell and dedicated plugin windows; TER receives no plugin-id exception or fake whitespace placeholder.
- Added a runtime regression test that executes the real `addPage()` implementation and verifies both sides of the contract.
- TER production presentation, analysis service, controller, domain adapter, scientific feature runtime, 41-Unit catalog and Unit Templates 2.5.4 remain unchanged.
- SDK advances to **1.51.8**; Android `versionCode` advances to **149**.

# v3.71.7 WIP — TER Formal Production Unit Cutover

- Formally cut over the production TER presentation to public Unit Templates after the v3.71.6 side-by-side live acceptance.
- Production TER now builds its page/header, data-control PRIME, parameter/display/transform controls, comfortable PlotGroup, seven PlotViews, scientific surfaces, export surface and two managed result tables through the Unit facade.
- Deleted the legacy TER `plugin.css` and `shared-views.js`; the production manifest loads no private stylesheet and no compatibility presentation path remains.
- Kept the production `analysis-service`, controller, domain adapter, task path, selection-link runtime and scientific feature runtime as the single business/numeric/interaction owners; no second TER state store or calculation pipeline was introduced.
- Preserved linked heatmap↔R–V selection, reduction plots, marker/wheel adjustment, domain focus, PlotView placement/export and responsive GroupArea behavior through the existing production feature runtime.
- Replaced raw HTML result-table rendering with managed Unit Table projection and made the feature runtime fail closed when the Unit PlotView/ParameterForm owners are absent.
- Reframed historical TER visual/layout gates around the formal Unit-only production contract instead of restoring deleted private presentation files.
- Unit Templates remain **2.5.4 / 41 Units**; SDK advances to **1.51.7**; Android `versionCode` advances to **148**.

# v3.71.6 WIP — TER Side-by-Side Live Presentation Acceptance

- Kept Unit Templates at **2.5.4 / 41 Units** and did not cut over the production TER UI.
- Added a release-gated side-by-side live presentation acceptance that runs the real production TER analysis service/controller/domain adapter and the real Unit TER shadow against the same production state/numeric owner.
- Unit TER controls now reverse-sync production settings, display, algorithm and transform state; numeric Unit inputs normalize to `number|null` at the presentation boundary so the shared production state cannot be polluted with string-valued scientific parameters.
- Unit TER now projects the production result into the complete two 8-column result tables and all seven scientific plot payloads instead of validating containers only. No TER calculation is duplicated in the Unit shell.
- Production controller selection is projected through the domain snapshot into the Unit resistance status, and Unit `clear-highlight` round-trips to the same production controller.
- The side-by-side fixture verifies 12 visible controls, two complete result tables, seven plot payloads and the same real 1 Vg × 40 Vd TER result used by the production service.
- Extended the TER live adapter snapshot with controller selection and production-derived transform matrix projection; the adapter remains a capability projection over the existing production owners and creates no second service/controller/algorithm pipeline.
- SDK advances to **1.51.6**; Android `versionCode` advances to **147**.

# v3.71.5 WIP — Domain Adapter Live Migration Readiness

- Kept Unit Templates at **2.5.4 / 41 Units**; this phase adds no UI Unit type or visual exception.
- Added dependency-scoped `ctx.services.domain` over the existing Core Service Runtime: detached snapshots, explicit action whitelist, provider state notifications, consumer lifecycle cleanup and provider invalidation.
- Production TER now publishes one audited additive `builtin.ter-analysis/live` adapter around its existing service; the provider is isolated in `domain-adapter.js`, while `plugin.js` remains a 29-line thin composition entry. No second controller, analysis-service or numerical pipeline is created.
- TER Unit-only shadow declares an explicit dependency on production TER, connects to the same domain owner, invokes live production actions and mirrors the authoritative TER_Max state/tables through detached snapshots.
- Added real production numerical parity coverage: the actual TER analysis service + Artifact Store + Scientific Pipeline are driven through the domain consumer seam; adapter result, production result and shadow snapshot must match exactly (fixture: 1 Vg × 40 Vd, 39 finite matrix cells).
- The legacy production byte-freeze remains active outside the audited TER adapter wiring; removing the marked loader seam and manifest entry must reproduce the exact v3.71.4 TER entry/manifest bytes, while the isolated adapter is separately checked against second-owner creation.
- SDK advances to **1.51.5**; Android `versionCode` advances to **146**.

# v3.71.4 WIP — Data Center Unit-only Shadow Reconstruction

- Added the fourth parallel Unit-only native-plugin shadow reconstruction for Data Center without replacing or editing the production Data Center plugin.
- Kept the Unit catalog at 41 types and advanced Unit Templates to 2.5.4.
- Added generic interactive Chip semantics: a Chip with `onInvoke` is rendered as a native button while retaining canonical Chip geometry/paint; passive Chips remain display spans.
- Reconstructed the `data-primary` workbench, `data-control` artifact browser PRIME, bounded 18-row table preview, formula/workflow/provenance tools, dialogs/context menu, and `scientific-secondary` chart-preview PRIME through public Units only.
- Corrected the stale Data Center geometry dossier from `plotView:complete` to `plotView:prime-contained`, matching the production outer PRIME + inner `portable:false` PlotView ownership.
- The fourth real migration closes without adding any Data Center-specific Unit or Core branch. Production native plugin source and authored styles remain byte-frozen.
- SDK advances to 1.51.4; Android `versionCode` advances to 145.

# v3.71.3 WIP — Resonance Unit-only Shadow Reconstruction

- Added the third parallel Unit-only native-plugin shadow reconstruction for Resonance Workbench without replacing or editing the production Resonance plugin.
- Kept the Unit catalog at 41 types and advanced Unit Templates to 2.5.3.
- Added generic `section:disclosure` semantics using native details/summary accessibility and Core-owned open-state reflection.
- Extended the existing Popover Unit with Core-owned viewport-clamped anchor/point positioning, `reposition(...)`, and picker dialog semantics; plugins continue to own only domain content and anchor intent.
- Reconstructed the accepted scientific PRIMARY, data-control PRIME, inspector PRIME, six-plot PlotGroup, Physics/Spacing/Gate SUB surfaces, rich selected-range action popover, and domain interaction extensions from public Unit Templates only.
- Audited `accepted-scientific-v1` as a data-only composition of the same public Unit facade; no alternate renderer or preset-private runtime path was added.
- Corrected the Resonance authoring/geometry blueprint for the native advanced-settings disclosure.
- Production native plugin source and authored styles remain byte-frozen.
- SDK advances to 1.51.3; Android `versionCode` advances to 144.

# v3.71.2 WIP — Pulse Unit-only Shadow Reconstruction

- Added the second real native-plugin shadow reconstruction under `examples/sdk151-unit-pulse-shadow/`; production Pulse Analysis remains unchanged.
- Kept the Unit catalog at 41 types and advanced Unit Templates to 2.5.2.
- Added generic `plotView:prime-contained` for PlotViews whose single position owner is an enclosing movable PRIME.
- `prime:canonical-header` now adopts an existing complete header when `existingNode + handle + controlsHost` are supplied, preventing duplicate PRIME/PlotView chrome.
- Added `splitPane.reflowBelow` on accepted breakpoints while preserving the same Core SplitController.
- Corrected Pulse authoring blueprints for horizontal split orientation and PRIME-owned raw PlotView; Data Center chart preview now uses the same generic nested PlotView contract.
- Added seven-layer Pulse parity evidence and a release-gated reconstruction test.

# 3.71.1 — WIP / TER Unit-only Shadow Reconstruction

- Add the first real **Unit-only shadow reconstruction** for native `builtin.ter-analysis` under `examples/sdk151-unit-ter-shadow/`. It is parallel authoring/test evidence only and never replaces the production TER plugin.
- Rebuild the TER page header, semantic `data-control` PRIME, parameter/display/transform controls, summary strip, seven PlotViews in one responsive PlotGroup, square heatmaps, the special R–V card, export actions and two managed result tables through public Unit Templates with **zero shadow CSS**.
- Compare all seven parity layers: function boundary, structure, geometry, style, interaction, responsive behavior and Mobile presentation. Scientific calculations stay owned by production TER; the shadow maps the same domain intents without duplicating TER math or mutating production state.
- Real reconstruction finds one reusable contract omission: standalone native `.dkds-meta` hint text could not be expressed without private class usage. Unit Templates **2.5.1** adds the additive `note:meta` variant, delegating to the existing Core `.dkds-meta` owner. The catalog remains **41 Units**; no TER-specific Unit is added.
- Advance SDK to **1.51.1** and app to **3.71.1 WIP**. Existing native plugin source and authored styles remain protected by the same byte-level freeze baseline.
- Record the remaining non-Unit migration boundary: ordinary parallel plugins cannot reuse the full stateful native TER service. Full numeric side-by-side shadow execution therefore needs a future generic domain-adapter seam; it is not a reason to add UI Units or copy TER business logic.
- Android `versionCode` advances to **142**.

# 3.71.0 — WIP / SDK 1.51 Unit Template Reconstruction Contract
- Native reconstruction blueprints are authoring-only SDK migration evidence and are excluded from runtime Core; Core remains domain-blind while the 18-plugin reconstruction dossiers remain fully generated and release-gated.

- Advance SDK to **1.51.0** while keeping Plugin API **1.19.0** and Theme Contract **3.10.0**. Current native plugins remain byte-frozen reference assets; this phase expands Core/SDK/tests/docs only.
- Upgrade Unit Templates to **2.5.0** and formalize a **41-unit** catalog. `accepted-scientific-v1` is a pure preset definition composed exclusively through the same public Unit factories available to third-party plugins.
- Expand reconstruction evidence for all **18 native plugin directories** across Unit regions, geometry, structural primitives, Core services, platform presentation, dynamic state/accessibility and source-provenance censuses.
- Add Core-owned accepted geometry vocabulary, responsive breakpoints and migration bridges so frozen private plugin geometry can be expressed without copying plugin-private CSS or introducing a second visual owner.
- Add dynamic behavior Units for Meter, MovableWindow and SplitPane, plus schema-level ComponentTree/ParameterForm Units and detailed metric provenance for the accepted design system.
- Formalize canonical chrome/anatomy policies for PlotView, PlotGroup and movable PRIME surfaces; mandatory Core actions cannot be replaced by plugin lookalike headers.
- Add Unit State Controller with 12 semantic channels (`visible/enabled/selected/pressed/checked/expanded/busy/readonly/required/current/invalid/loading`), per-Unit state policies, accessibility/keyboard vocabulary and native state blueprints.
- Native state census currently records **90 state expressions, 17 role/tabindex semantics, 26 other ARIA semantics and 9 keyboard points**, all mapped to public state/accessibility contracts with **0 unmapped state channels**.
- Add a unified reconstruction dossier per native plugin combining Unit, Geometry, Structure, Service, Presentation and State evidence.
- Existing native plugin source and authored CSS remain protected by the 3.70.8 byte-level freeze gate.
- Android `versionCode` advances to **141**.

# 3.70.9 — WIP / SDK 1.50 Unit Template Composition

- Advance the SDK to **1.50.0** while keeping Plugin API **1.19.0** and Theme Contract **3.10.0**. SDK 1.50 is additive: it introduces unit-level composition without changing or migrating any existing built-in plugin implementation.
- Add public `ctx.ui.unitTemplates` and Core requirement `ui.unit-templates`. The formal unit catalog covers Panel, Header, Toolbar, PRIME, PlotView, PlotGroup, ScientificPlot and Table so new plugins can freely compose layouts rather than adopting a whole-workbench shape.
- Keep `accepted-scientific-v1` only as an optional SDK 1.49 example preset. SDK 1.50's canonical design-system layer is unit based; plugins may arrange, omit and combine units independently.
- Make strict Unit PlotView a complete data-plot unit: a non-empty title/header is mandatory, portable position control is mandatory, at least two placements are required, and canonical export capability cannot be disabled completely. `ScientificPlot` remains the lower-level plot canvas primitive.
- Make Unit PlotGroup header **complete or absent**. A standard header is Core-generated with title/meta, `每行:N` layout control, placement, collapse and close. A headerless PlotGroup PRIME must be fixed/non-movable. PlotGroup children route through strict PlotView units.
- Move PlotGroup spacing into semantic Core-owned densities extracted from accepted existing layouts: `compact=10 px`, `regular=12 px`, `comfortable=14 px`. Unit Template consumers cannot supply raw row/column gap values. Existing built-in plugin spacing remains byte-for-byte unchanged.
- Add fixed base scientific interaction policy `scientific-standard-v1`: standard selection, reset, box selection/zoom and wheel-zoom bindings are mandatory. Plugins may add only non-conflicting domain interaction extensions; they cannot replace the baseline policy through Unit Templates.
- Add `examples/sdk150-unit-composition/` as a non-Resonance, zero-private-CSS example with a layout intentionally different from Resonance. It demonstrates that identical units retain accepted visual/interaction grammar while the overall workbench composition remains free.
- Add release gates for SDK 1.50 strict-unit behavior, example runtime/layout execution, and byte-level freezing of all pre-existing built-in plugin files and authored styles. The 3.70.8 baseline remains **110 plugin files / SHA-256 `3a03f8c6846f66f68778c683e2025a6c1c77fb294676798b42c66e7845ef910a`** and **36 style files / SHA-256 `59bb51d38e699772a4c383a0f0456a5b036274f07448c91275d9f4f7071dfcee`**.
- Require all current SDK 1.50 gates in both `npm test` and `npm run check` so release validation cannot omit the new unit contract.
- Android `versionCode` advances to **140**.

# 3.70.8 — WIP / SDK 1.49 accepted-visual-template parity

- Correct the SDK 1.49 composition direction: the accepted 3.70.5 built-in presentation is the reference template. A semantic migration that changes existing chrome, spacing, placements, radii or Theme appearance is now treated as an SDK contract regression.
- Remove SDK 1.49 visual ownership introduced by the 3.70.6/3.70.7 WIP implementation. `scientific-card`, PlotGroup density, ScientificSection and PRIME content-inset markers no longer add a second CSS paint/spacing layer by default.
- Make `surface:'scientific-card'` semantic-only for adopted views. Newly created scientific cards reuse the established `analysis-chart-card / analysis-chart-title / analysis-chart` DOM/classes instead of a new `.dkds-scientific-card` visual system.
- Make PlotGroup an ownership/composition layer over the existing GroupArea/PlotView system. `adoptPlot(...)` preserves existing card DOM and plugin-requested managed-grid spacing; Resonance remains 12 px and TER remains 14 px rather than being normalized to 10 px.
- Restore the accepted Resonance group/inspector header structure and controls (`context`, group-column ActionGroup, collapse, close) and have SDK 1.49 adopt that canonical header instead of regenerating a different select/button header.
- Correct PRIME semantics: `presentationRole:'data-control'` describes purpose, not Desktop docking. Resonance retains its accepted fixed-left control surface; TER, Pulse and Data Center retain their accepted multi-placement data-control behavior. `fixed:true` is the explicit one-placement contract.
- Existing-node PRIME headers default to `header.mode:'adopt'`; `contentInset` is opt-in; surface-controlled movable inspector/scientific-secondary PRIME surfaces still require explicit canonical chrome, while host-managed data-control retains the accepted handle/chrome behavior.
- Restore the exact accepted Aurora disabled-action tokens/appearance and generic disabled-contrast audit behavior instead of changing Theme paint to satisfy a new SDK gate.
- Add `test-sdk149-visual-template-parity.js` to both `npm test` and `npm run check` so future SDK composition work cannot silently become a visual redesign.
- Add public `accepted-scientific-v1` to `ctx.ui.scientificWorkbench`: this is the non-domain executable reference profile extracted from the accepted 3.70.5 Resonance composition. It exposes the accepted primary chrome, left data-control, movable inspector, scientific-secondary PlotGroup, panel insets, GroupArea geometry, Portable bounds and responsive offsets through public SDK contracts rather than Resonance-private selectors.
- Add `examples/sdk149-reference-workbench/` (`Scientific Reference Studio`) as a zero-CSS, non-Resonance SDK example. It contains no `respar-*`, `reswin-*` or Resonance-private DOM/class dependency and uses only public SDK 1.49 APIs, while receiving the accepted `context + 每行:N + placement/collapse/close` group header, PlotView cards, tools/legend slots and workspace geometry.
- Add `test-sdk149-reference-plugin-parity.js` to both release manifests. The gate validates the non-domain example, rejects private Resonance coupling, and compares the public profile against the accepted 3.70.5 composition geometry/details. `dkds-plugin validate`, `test-runtime` and `test-layout` all execute this reference as an ordinary third-party plugin; layout covers 64 canonical surface/viewport cases.
- Android `versionCode` advances to **139**. SDK remains **1.49.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.70.7 — WIP / Scientific Composition Validation Closure

Second-pass delivery audit for SDK 1.49.0 / Plugin API 1.19.0. This patch does not add a compatibility layer or change the scientific-domain boundary; it closes validation and built-in migration gaps found while rechecking 3.70.6.

- Require explicit `presentationRole` for direct `registerPrime(...)` composition and migrate the remaining Pulse Analysis, Data Center and SDK template PRIME declarations.
- Require direct scientific `PlotView.bind(...)` sites to opt into the Core-owned `scientific-card` surface; migrate remaining built-in direct binds.
- Expand composition lint for fixed/movable PRIME semantics, canonical inspector/header ownership, duplicate scientific-secondary embedding, PlotGroup layout controls, direct PlotView surfaces, canonical paint/radius/seam ownership and ScientificSection negative-flow offsets.
- Strengthen PlotGroup runtime ownership: reject duplicate group owners and responsive fixed-height children.
- Expand Desktop/Mobile layout harness to 8 Surface combinations × 4 Desktop sizes plus 8 combinations × 4 Mobile sizes (64 scenarios), with browser measurements for overlap, escape, action clipping, placement controls, group minimum width and vertical whitespace.
- Require the current Scientific Composition gate set in both `npm test` and `npm run check`, with a manifest-drift regression test.
- Correct the stale README release banner and synchronize SDK 1.49 documentation/type declarations.
- Android `versionCode`: **138**.


# 3.70.6 — WIP / SDK 1.49 Scientific Composition Contract

- Advance the public SDK to **1.49.0** while keeping Plugin API **1.19.0** and Theme Contract **3.10.0**. This is an additive Scientific Composition contract, not a compatibility layer or Plugin API semantic break.
- Bring `DKDSPluginWorkspacePrimeSpec` into parity with Runtime, including canonical chrome/header controls, `chrome`, `handle`, `controlsHost`, `controlsPlacement`, `useTargetAsWrapper`, collapse/placement callbacks and semantic `contentInset`.
- Make movable `existingNode` PRIME surfaces explicit: plugins provide a canonical handle/control host or request Core-generated chrome; Core no longer guesses an arbitrary `.dkds-surface-header` as whole-window chrome. Fixed `data-control` PRIME surfaces use one placement and expose no position chooser.
- Add Core-owned **ScientificSection**, **ScientificCard/PlotSurface**, **PlotGroup**, and declarative **ScientificWorkbench** composition. PlotGroup creates or adopts canonical PlotViews over GroupArea so header/action/export/placement behavior, spacing and scientific-card paint remain Core-owned.
- Add canonical PRIME header metadata/actions/controls, including PlotGroup column controls; add semantic content inset/density plus frozen workspace/section/group spacing and surface-radius tokens.
- Scope ordinary workbench toolbar/menu contributions to the active activity by default so inactive analysis activities cannot leak stale commands into the host toolbar.
- Add composition lint and Desktop/Mobile layout harness coverage for movable PRIME chrome, fixed data-control behavior, PlotGroup membership/responsive geometry, section overlap, card ownership, theme disabled-action contrast, and external TOP task materialization parity.
- Migrate built-in **Resonance Workbench**, **TER Analysis**, **Pulse Analysis**, and the relevant Data Center/mobile control surface to the current composition contract. Resonance Group plots now use PlotGroup-created canonical PlotViews and its Group PRIME consumes Core header meta/column/placement/collapse/close controls.
- Update SDK docs/templates/reference examples and historical regression expectations to the public Core-owned composition contract; keep the authored JS 48 KiB module boundary intact without relaxing hygiene gates.
- Preserve the frozen **Desktop Visual Closure** history and existing platform-presentation ownership. No plugin-id Core special case, legacy alias, fallback layout shim, old/new dual composition path, or domain scientific model is introduced.
- Android `versionCode` advances to **137**.

# 3.70.5 — WIP / Resonance dedicated Worker + interaction stability

- Fix Resonance derived group cards (**FWHM / 峰高 A / 峰面积 S**) becoming blank after the workbench moved fully onto the ordinary dedicated plugin-host path. The dedicated plugin-window CSP allowed `blob:` in `default-src` but kept a stricter `script-src`; Chromium Worker policy falls back to `script-src` when `worker-src` is absent, so Core Task Runtime's source-composed Blob Worker was blocked at execution time even though v3.70.4 correctly transported all task bytes. The host now explicitly permits **Blob Workers only** via `worker-src blob:`; no arbitrary file/network Worker URL loading is opened.
- Break the derived-metric failure storm. A failed peak-metric signature is now latched instead of being resubmitted on every reactive/group render; an explicit provider/data invalidation or `scheduleMetricRefresh()` clears that latch and may retry once. This prevents persistent Worker failure from becoming `task failure → metric settled → reactive render → same task again`.
- Keep raw GroupArea metrics independent from the derived-metric Worker. Vpk, Ipk and prominence are projected directly from peak data; only FWHM / amplitude / area request the peak-metrics provider.
- Stabilize the main legend under curve selection. Dataset legend DOM is retained when its semantic rows/colors are unchanged, legend row identity no longer follows the currently selected sweep, and legend activation now publishes the dataset entity it actually represents instead of bouncing through a sweep selection first.
- Add a v3.70.5 regression gate covering explicit dedicated-window Blob-Worker CSP, failed-metric retry bounding/recovery, raw-vs-derived GroupArea isolation, semantic legend DOM reuse and dataset-level legend selection.
- Browser proof was additionally run against the actual Core Task Runtime with the dedicated-window CSP: a source-composed Blob Worker executes successfully under the new policy.
- Preserve the frozen **Desktop Visual Closure** / 3.69.4 archive boundary. This is a dedicated-host/runtime and Resonance interaction correction, not a reopening of Core Presentation ownership.
- Android `versionCode` advances to **136**. SDK remains **1.48.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.70.4 — WIP / built-in dedicated Task source parity

- Fix first-party analysis plugins failing only in dedicated Electron windows with `Task source bytes are required by the current runtime`. The failure affected built-in task owners/providers because dedicated-window bootstrap carried scripts/styles but not the generated task entry/import bytes used by the owner renderer.
- Add one shared Node-side `buildBuiltinTaskSourceBundle()` implementation used by both `scripts/generate-plugin-index.js` and `desktop/plugin-window-manager.js`, so owner and dedicated renderers receive byte-identical built-in task entry/import sources and canonical Core task preludes.
- Extend the canonical Core `applyPackage(...)` operation to accept internal task-Core-source transport metadata. Normal built-in startup now also routes through the same operation instead of assigning `taskSources` / `taskCoreSources` through a separate path.
- Dedicated plugin windows now call the same package materialization step for **all** target/theme/algorithm providers, including trusted first-party built-ins, before `activateAll()`. External/override packages continue to use packaged file bytes; built-ins use only trusted task bytes prepared by the main process. No arbitrary Worker file URL fallback is introduced.
- Add a first-party dedicated Task parity gate that scans every current built-in dedicated window and its providers, compares dedicated task bytes/Core preludes against the generated owner catalog, reproduces the exact `builtin.standard-transport-algorithms/transport-compute` path, and executes the transported task/import bytes.
- Preserve v3.70.3 host-chrome failure containment: plugin activation errors still cannot cover the Core titlebar or window controls.
- Android `versionCode` advances to **135**. SDK remains **1.48.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.70.3 — WIP / dedicated plugin-window failure chrome survival

- Keep the Core-owned dedicated-window titlebar alive when plugin activation/startup fails. The startup error surface now occupies only the workspace grid tracks instead of a viewport-fixed overlay that covered the title/minimize/maximize/close row.
- Configure the dedicated window title immediately after bootstrap resolution and before waiting for later runtime/plugin activation, so a plugin failure still leaves the plugin/window identity visible.
- Keep minimize, maximize/restore, and close IPC binding independent of plugin activation; no plugin error path may replace or hide host chrome.
- Add a dedicated regression gate that forbids the old full-viewport startup-error overlay, requires the permanent titlebar/window-control DOM, checks title configuration ordering, and protects independent Core window-control binding.
- Android `versionCode` advances to **134**. SDK remains **1.48.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.70.2 — WIP / packaged TOP Task dedicated-window parity

- Fix external packaged TOP workbenches that declare `execution.tasks`: dedicated plugin windows now materialize task entry/import bytes through the same Core package operation as the owner renderer before `activateAll()`.
- Replace the drifting manifest-only dedicated path with one internal `applyPackage(id, manifest, source, files)` operation backed by canonical `materializeTaskSources(manifest, files)`.
- Keep Task Runtime strict: worker source bytes remain mandatory and no arbitrary Worker file-URL loading is introduced. Generated built-in `taskCoreSources` remain preserved and are still composed ahead of task imports/entry by the current Task Runtime.
- Apply the same packaged-definition operation to external/override Theme and Algorithm Providers loaded inside dedicated windows, so package metadata/source parity cannot drift by renderer role.
- Add a real external TOP+Task package fixture with one task entry and one import. Regression coverage validates/packages it through the SDK CLI, activates it in owner and dedicated Plugin Kernel contexts, executes the imported task, verifies cancel/latest-wins, and proves reload/uninstall revoke task Blob URLs.
- Extend the detached SDK Harness with the TOP+Task package smoke. Static package validation is no longer the only gate for this path.
- Preserve the frozen **Desktop Visual Closure** / Phase A–E archive history from 3.69.4; this is a host-runtime parity fix on the 3.70.x WIP line, not a reopening of Presentation or visual ownership architecture.
- Android `versionCode` advances to **133**. SDK remains **1.48.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.70.1 — WIP / Task Runner progress + acquisition-order metadata

- Continue the post-archive 3.70.x feature line from the frozen 3.69.4 baseline without reopening the Phase A–E interoperability architecture. **Desktop Visual Closure history remains preserved.**
- Advance the public SDK to **1.48.0** while keeping Plugin API **1.19.0** and Theme Contract **3.10.0**.
- Add real bounded Task Runner progress. Worker task code can call `context.reportProgress({fraction,stage,label,completed,total})`; the submitting renderer observes it through `handle.onProgress(...)` and `handle.progress`. Core normalizes payloads, coalesces/throttles delivery to roughly 20 Hz, flushes the last pending update before a successful result, drops stale latest-wins generations, and stops progress delivery immediately on cancellation. Workers still have no UI/DOM access.
- Add canonical acquisition metadata under `artifact.metadata.acquisition`: `runId`, `sequenceIndex`, `timestamp`, optional `parentSequenceIndex`, and `provenance`. The shared Import Workbench preserves source-provided ordering and assigns deterministic `sequenceIndex` values for missing order within one multi-file import batch, following selected-file order and importer-emitted Artifact order.
- Extend lightweight metadata/source descriptors with acquisition fields and add synchronous `ctx.data.sources.acquisitionOrder({artifactIds})`. Dedicated plugin windows receive the same synchronized acquisition-order snapshot; history-dependent algorithms therefore do not need to reinterpret UI/source enumeration order.
- Add `sdk/ACQUISITION_ORDER.md`, update `sdk/TASK_RUNNER.md`, SDK types/contract/authoring export, and regression coverage. The Plugin Manager SDK export now packages the current **SDK 1.48.0** documentation and types.
- Android `versionCode` advances to **132**.

# 3.70.0 — WIP / Export current SDK from Plugin Manager

- Start the explicit post-archive 3.70.x feature line from the frozen 3.69.4 baseline; the Phase E interoperability contract remains frozen.
- Add **导出SDK** immediately to the left of **复制诊断** in Plugin Manager. The control uses the existing explicit native export-intent gate.
- `sdk:authoring` now deterministically builds `src/generated/dkds-sdk-export.zip` from the complete public `sdk/` tree plus the selected public authoring guides. The archive includes `AI_START_HERE.md` and `SDK_MANIFEST.json` with SDK/API versions, file sizes and SHA-256 hashes.
- Electron owns the native save dialog and copies the generated archive from the packaged application. LAN Web downloads the same ZIP; Android uses the existing native document export path. No second SDK contract or compatibility representation is introduced.
- The generated SDK ZIP remains untracked/cleanable and is rebuilt by dev start, tests, distribution builds and Mobile web-asset sync.

# 3.69.4 — Final Archive / Android self-contained scientific Worker transport

- Continue the bounded post-Phase-E maintenance line without reopening the formal **Phase E 3.69.0** interoperability contract. No new Interaction channel, public Plugin API/SDK capability, compatibility alias, plugin-private Worker pool, or main-thread scientific fallback is introduced.
- Correct the remaining Android-only derived-metric failure below the 3.69.3 transport layer. The previous Blob Worker still executed `importScripts(blob:...)`, and the Resonance `task-core.js` then conditionally imported canonical science modules from `file:///android_asset/...`; both nested Worker import paths remain WebView-sensitive.
- Replace nested Worker imports with one **self-contained Core-owned Worker blob** per task definition. Canonical Core science sources, plugin task imports, the task entry, and the bounded Task Runner message loop are concatenated before Worker creation; runtime messages now carry only task input/generation metadata and never module/import/app-base URLs.
- Add an internal build-only `@dkds-core-task-source` directive for built-in task adapters. `scripts/generate-plugin-index.js` resolves each declared `science/*.js` dependency to the exact authoritative Core source bytes and embeds them into the generated built-in catalog. Plugin manifests and the public SDK remain unchanged.
- Remove `DKDSTaskAppBase` / nested `importScripts()` from the built-in Resonance, TER, Pulse Analysis and Resonance Workbench task adapters. If a canonical prelude is missing, the task now fails explicitly instead of silently depending on Android asset URL loading.
- Advance Core Task Runtime to **1.1.0** and retain the existing bounded queue, Mobile concurrency=1, latest-generation cancellation, owner disposal, 3.69.2 peak-metric batching, 3.69.3 stable metric identity/epoch isolation, and fail-fast dispatch cleanup. Task history now retains bounded failure text for diagnostics.
- Add an Android-equivalent executable regression that composes the actual canonical `science/common.js` + `science/presets.js` + Resonance task/provider code into one Worker source, forbids all nested `importScripts` / `file:///android_asset` references, executes `metrics-batch`, and requires finite FWHM / peak height / area.
- Android `versionCode` advances to **130**. SDK remains **1.47.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- **Desktop Visual Closure history remains preserved.** On 2026-09-11 the project owner confirmed on the real Android device that Resonance FWHM / peak height / peak area populate correctly; this closes the final device-acceptance boundary for the 3.69.4 archive.
- Final automated validation before archive metadata cleanup: `npm test` **374/374 PASS**; `npm run check` **381/381 PASS**; Mobile **100/100 PASS**; clean-source Mobile bootstrap **100/100 PASS**; Performance, SDK, SDK Harness and Scientific parity all PASS; Hard Visual Invariants **87 PASS**; Plugin manifests/packages **17/17 PASS**; authored CSS **45 files / 0 `!important`**. Final archive-pass validation is recorded in `HANDOFF_3.69.4_FINAL_ARCHIVE.md` and `FINAL_ARCHITECTURE_FREEZE_3.69.4.md`.

# 3.69.3 WIP — Resonance Mobile derived-metric transport / identity closure

- Continue the bounded post-Phase-E maintenance line without reopening the formal **Phase E 3.69.0** interoperability contract. No new Interaction channel, public SDK capability, compatibility alias, private Worker pool, or main-thread scientific fallback is introduced.
- Fix the remaining Android-only blank **FWHM / peak-height / peak-area** path below the 3.69.2 batching layer. Built-in Task Runner jobs now carry the exact generated task/import source bytes and execute through one Core-owned **Blob Worker bootstrap**, so Mobile no longer depends on `file:///android_asset/...` Worker/importScripts transport for scientific task modules. Heavy analysis remains inside the Core Task Runner.
- Make Resonance peak-metric caching follow stable peak identity rather than JavaScript object identity. The cache is a bounded **1024-entry** map keyed by peak id and validated by the existing metric signature; project/data rebuilds advance a metric epoch, discard stale in-flight results, and prevent cross-project/workspace leakage after state rematerialization.
- Give the GroupArea a single coalesced settled-metric render owner. A metric wave invalidates the data projection before checking whether the panel is currently mounted, and one frame-scheduled render is reused by both the direct wave notification and Scientific Reactive effect.
- Harden the Core Task Runner against synchronous Worker `postMessage` / structured-clone failures: the worker is terminated, the running slot is released, the task rejects, and the queue continues instead of leaving a permanently pending blank analysis surface.
- Preserve 3.69.2 bounded peak-metric batching: the same-turn requests remain capped at **128 items per worker task**, and the scientific `baseline-fwhm-v1@1.0.0` algorithm itself is unchanged.
- Add executable regression coverage for stable-id cache reuse across rematerialized peak objects, project-epoch stale-result rejection, generated built-in task source transport, Blob Worker dispatch, synchronous dispatch failure cleanup, and the existing 59→1 bounded metric batch.
- Android `versionCode` advances to **129**. Resonance Workbench advances to **3.63.2**; SDK remains **1.47.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- **Desktop Visual Closure history remains preserved.** Real Android device population of the three previously blank derived-metric cards remains the final acceptance boundary, so this build remains WIP until device verification.

# 3.69.2 WIP — Resonance Mobile derived-metric Worker batching

- Apply a bounded post-freeze correction without reopening the formal **Phase E 3.69.0** contract. No Interaction channel, public SDK capability, compatibility alias, private Worker, or main-thread scientific fallback is added.
- Fix the remaining Mobile Resonance GroupArea blank FWHM / peak-height / peak-area charts at the producer rather than adding another repaint patch. These three views depend on the asynchronous `peak-metrics` provider, while prominence is already stored on each peak; with roughly 59 peaks, the Mobile Task Runner's concurrency limit of one previously serialized 59 newly-created Worker tasks before the group-wide settled-wave redraw could occur.
- Keep all heavy analysis under the Core Task Runner, but coalesce same-turn peak-metric requests inside the replaceable Algorithm Provider into bounded batches of at most **128** items. One `resonance-compute` Worker task now evaluates an ordered `metrics-batch`, then resolves each original provider promise with its corresponding FWHM / amplitude / area result. Detector execution is unchanged.
- Remove the obsolete individual `metrics` worker operation so peak metrics retain one execution contract instead of parallel old/new paths. Existing v3.69.1 settled-wave invalidation remains responsible only for final reprojection after the batched producer completes.
- Executable regression coverage issues **59** real provider requests and requires exactly **1** Core Task submission with ordered complete results; an independent worker-side test verifies batch mapping. Scientific algorithm parity remains protected by the existing parity suite.
- Android `versionCode` advances to **128**. SDK remains **1.47.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- **Desktop Visual Closure history remains preserved.** Android real-device rendering remains the final acceptance boundary, so this correction remains WIP until the user's device confirms the formerly blank plots populate.

# 3.69.1 WIP — Mobile post-Phase-E regression correction

- Apply a bounded post-freeze maintenance patch without reopening the formal **Phase E 3.69.0** interoperability contract. No Interaction channel, public SDK capability, compatibility path, or plugin-specific Core branch is added.
- Repair Resonance Mobile GroupArea metric reprojection: group invalidation is no longer skipped while the panel is temporarily hidden/reparented, and the render fingerprint includes a wave-batched **settled metric revision** so FWHM/amplitude/area/prominence plots cannot retain a pre-metric blank render after async metrics finish. The revision advances once per settled metric wave, preserving the 3.68.95 anti-incremental-repaint performance contract.
- Keep Data Center Mobile `多选 / 全选 / 反选 / 清除` in one four-column row. The Mobile owner no longer overrides the canonical four-action geometry back to three columns.
- Repair Native Mobile floating PlotView drag responsiveness through the shared `NativeTouchDrag` input abstraction. Touch motion is coalesced to one `requestAnimationFrame` compositor `translate3d()` preview; geometry is captured once at gesture start; live bounds are arithmetic-only; final left/top persistence, snap and overlap repair occur on release. Desktop PointerEvent dragging remains unchanged.
- Update historical regression tests whose exact source expectations encoded the superseded three-column Data Center row or pre-native-touch PortableView implementation, while retaining their geometry/performance ownership assertions.
- Android `versionCode` advances to **127**. SDK remains **1.47.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- **Desktop Visual Closure history remains preserved.** Automated and Chromium-computed evidence are required before delivery, while real Android device visual/touch acceptance remains pending; therefore this build remains WIP.

# 3.69.0 — Phase E Formal Freeze

- Promote the audited 3.68.104 Final Integration baseline to the formal **Phase E Freeze**. This release changes release identity and freeze status; it does not add another Interaction channel, public SDK capability, compatibility path, or plugin-specific Core branch.
- Freeze Selection / Viewport / Legend transaction isolation at `projectId + channel + linkGroup + transactionId`, preserving exact duplicate/cycle suppression without cross-channel, cross-project or cross-group false suppression.
- Freeze plugin lifecycle semantics: warm-hide suspends Interaction transport while retaining reusable refs; unload disposes interaction/state-link/listener/transaction state; cold release distinguishes requested, confirmed released and pending windows.
- Freeze stable identity semantics through table sorting/filtering and scientific display sampling, including lazy `rowIdAt(index)` resolution without a duplicate full-length identity array.
- Freeze bounded linked-view fan-out: shared channel/group bridge subscriptions remain ref-counted, teardown returns refs/listeners to zero, and transaction history remains bounded to 256 entries per runtime.
- Preserve the 3.68.104 Mobile parameter-drawer content-fit correction so `Vd / Vs / Vg` width-critical controls can grow to measured content without greedily occupying the full viewport.
- Repair historical regression tests that incorrectly hard-coded the active application to the 3.68 patch line; they now assert semantic version floors so the formal 3.69.0 freeze can be validated without weakening the covered behavior.
- Android `versionCode` advances to **126**. SDK remains **1.47.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- **Desktop Visual Closure history remains preserved.** Phase E is now frozen; future interoperability expansion requires an explicit post-freeze phase/reopen rather than extending this contract silently.

# 3.68.104 WIP — Phase E Final Integration / Freeze Audit

- Repair Mobile parameter-drawer minimum sizing from device evidence: content-fit now measures both control geometry and intrinsic text overflow, and may exceed the old 88vw/480 px compact ceiling only when a width-critical control actually requires it. On a 436 px viewport the regression model resolves the Pulse Vd/Vs/Vg row to 404 px instead of clipping Vg.
- Isolate Selection / Viewport / Legend transaction dedupe by `projectId + channel + linkGroup + transactionId`; identical transaction IDs can no longer suppress another channel, another project, or another link group.
- Add InteractionRuntime lifecycle quiescence to plugin warm-hide/resume and include it in Dedicated TOP lifecycle diagnostics. Plugin unload still disposes UI scopes/subscriptions in reverse cleanup order; cold release now reports only windows that actually reach `closed`, with requested/pending counts.
- Preserve source-row identity through table sort/filter/rerender with WeakMap-backed object identity and immutable hydrated-row source indices. Scientific display sampling accepts lazy `rowIdAt` resolution; Data Center uses it when an Artifact does not already carry `rowIds`, avoiding a duplicate full-size identity array.
- Stress the linked-state fan-out contract: many linked views share one global bridge listener per channel/group, local listener sets cleanly release, and mixed transaction history remains bounded to the existing 256-entry per-runtime cap.
- No new global Interaction bus, public Plugin API, SDK capability, compatibility path, or plugin-specific Core branch is introduced. SDK remains 1.47.0 / Plugin API 1.19.0. Pulse Sampler is 1.9.17.
- Desktop Visual Closure history remains preserved. Automated freeze-audit gates pass; Windows/Android device visual acceptance remains required before declaring Phase E formally frozen.

# 3.68.103 WIP — Memory alignment and parameter dock sizing

- Memory values retain fixed geometry across hover/focus and center against the full row.
- Core Portable/PRIME sizing adds content/fill; Pulse content layout has a separate owner and consumes the dock remainder.
- SDK 1.47.0 / minimum app 3.68.103; type, guides, example and author reference updated.
- Actual Windows/Android visual acceptance remains pending. Continue Phase E Final Integration / Freeze Audit after acceptance.

# 3.68.102 WIP

- Correct Pulse Sampler parameter-rail geometry from device validation: the parameter PRIME now requests 540 px default / 520 px minimum width, marks its own parameter surface, and consumes the full available dock height so the joined-segment table receives the remaining vertical space.
- Give the “已加入片段” header a real content inset instead of pressing against the left edge.
- Override the generic Core toolbar flex geometry only for the Pulse-owned command row and distribute “生成预览 / 加入序列 / 清空通道 / 导出合并 CSV” across four equal tracks, eliminating right-side dead space and intrinsic overflow.
- Keep Memory rows in their original name/right-value composition while using one stable right-side value lane: idle `xx MB` remains right-aligned; on a releasable row hover/focus, the destructive soft-fill “释放” action and `xx MB` participate in one centered group without a permanent third column.
- This remains a bounded pre-freeze device-validation correction. No Phase E capability/channel is added; the main task remains Phase E Final Integration / Freeze Audit. Desktop Visual Closure history remains preserved.
- App version **3.68.102**, Android `versionCode` **123**; SDK remains **1.46.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. Pulse Sampler **1.9.15**, Status Monitor **1.3.5**.

# 3.68.101 WIP

- Preserve the pre-3.68.100 Memory panel row composition: component name on the left and one fixed right-aligned private-memory value column. Hidden-plugin cold release no longer occupies a permanent third column; its destructive soft-fill action appears immediately to the left of `xx MB` only while the releasable row is hovered or keyboard-focused.
- Keep release-button motion under the single Core Motion owner (`src/styles/motion/recipes.css`) instead of authoring transitions in Presentation CSS.
- Repair Pulse Sampler parameter-rail height adoption without depending on the semantic PRIME dataset marker being attached to the exact PortableView node. A docked `.ps-designer` now consumes the full available rail height and the joined-segment table receives the remaining `1fr` track; the outer parameter surface remains scroll-safe rather than clipping semantic UI.
- This is a bounded device-validation correction only. Phase E remains frozen for new capability work and the main task returns to Phase E Final Integration / Freeze Audit after this patch.
- Desktop Visual Closure history remains preserved. App version 3.68.101, Android versionCode 122; SDK remains 1.46.0, Plugin API 1.19.0, Theme Contract 3.10.0.

# 3.68.100 WIP

- Inserted pre-freeze bug/UI closure only; the main roadmap remains Phase E Final Integration / Freeze Audit.
- Data Center explicit multi-select now uses additive toggle semantics, so touch/mouse checkbox selection accumulates instead of replacing the prior item while Desktop Ctrl/Cmd/Shift/right-click behavior remains intact.
- Hidden-plugin memory rows remove the explanatory banner and use independent aligned private-memory/action columns; working-set diagnostics remain per-process only because working sets include shared pages.
- Pulse Sampler parameters are physically parked when the PRIME starts closed, preventing the parameter DOM from remaining in PRIMARY; the joined-segment table host consumes available panel height without styling Core TableSurface internals.
- Import Workbench default/light presentation removes the radial grey haze, reduces overlay dimming, and raises the modal material fill floor while keeping one semantic elevated surface.
- Desktop Visual Closure history remains preserved; this patch changes no Theme ownership or Phase E interaction contract.
- App version 3.68.100, Android versionCode 121; SDK remains 1.46.0, Plugin API 1.19.0, Theme Contract 3.10.0.

# 3.68.99 WIP

## Inserted bug/UI closure before Phase E Final Integration / Freeze Audit

- Refine the Default Import Workbench without adding a second opaque sheet: rebalance the source rail, strengthen header/footer hierarchy, give selected destination chips a clear Core-themed state, and keep the empty workspace focus subtle. Desktop Visual Closure history remains preserved; this is a bounded presentation repair, not a reopening of the frozen Desktop presentation architecture.
- Repair TER heatmap presentation by honoring `showgrid:false` in the D3 axis renderer and disabling X/Y grid paint on both TER matrix views, preventing pale grid seams from crossing raster cells.
- Repair TER exact R–V marker persistence at the Scientific Display boundary: cached trace analysis now invalidates when `x/y` backing references change, so marker traces that start empty and are later restyled to a selected point enter the renderer correctly.
- Rebalance Pulse Sampler dedicated-window composition: the parameter PRIME requests a practical intrinsic width, extracting parameters collapses the obsolete first shell grid column, Merged Waveform consumes the remaining primary workspace, and the segment header no longer presses its trailing action against the panel edge.
- Make hidden dedicated plugin windows a real warm-cache lifecycle: hide preserves managed ScientificPlot renderers instead of purging and rebuilding them; add an explicit cold-release path that only closes hidden child renderers owned by the requesting main window. The Memory panel exposes this release action and reports additive private bytes while explaining that working sets include shared pages and must not be summed across processes.
- Add Data Center explicit multi-select mode for touch: a `多选` action reveals left-side checkboxes and ordinary taps toggle the existing canonical Selection set. Mobile long-press/context actions operate on the selected set, while Desktop Ctrl/Cmd, Shift and right-click selection remain available. No second selection store is introduced.
- Split dedicated-window lifecycle wiring into `src/plugin-window/lifecycle.js`; `plugin-window/runtime.js` returns below the existing 48 KiB module budget without raising the limit.
- SDK advances to 1.46.0 / minimum app 3.68.99 for the generic hidden-window `releaseActivityWindow()` runtime service contract; Plugin API remains 1.19.0 and Theme Contract remains 3.10.0. Android versionCode advances to 120.
- This patch is an inserted bug/UI batch only. After device acceptance, development returns to the existing Phase E Final Integration / Freeze Audit plan.

# 3.68.98 WIP

## TER marker persistence + pointer-anchored wheel zoom

- Fix a Chart Runtime state split exposed by TER device validation: renderer `restyle()` changed the live D3 traces but did not update the canonical display-state `sourceData`, so a later resize/display rerender restored the original empty TER marker traces. `restyle()` now synchronizes the canonical display data after the renderer mutation.
- Apply the same canonical-state rule to `relayout()`, so user viewport changes are not silently replaced by stale display layout on a later rerender.
- Keep TER R–V exact forward/reverse marker traces as domain-owned presentation; the existing canonical Selection and paired-curve isolation remain unchanged.
- Change D3 wheel zoom from plot-center scaling to mouse/data-coordinate anchored scaling. X, Y and Y2 ranges shrink/expand around the pointer location; log axes anchor in log coordinate space. The behavior applies to both scatter/curve and heatmap views.
- Preserve scroll chaining: wheel capture still occurs only inside the actual plot rectangle, so panel/title/axis margins continue to scroll the surrounding workspace.
- Add executable regression coverage that restyles an initially empty TER marker trace, forces a display rerender, and verifies the marker plus relayout range survive; also verify left/right and log-axis mouse-anchor zoom math.
- Keep SDK 1.45.0, Plugin API 1.19.0 and Theme Contract 3.10.0; this patch changes Core runtime behavior but adds no new public capability surface. Android versionCode advances to 119.
- Desktop Visual Closure history remains preserved; this patch does not reopen the frozen Desktop presentation architecture.

# 3.68.97 WIP

- Fix TER selection visual ownership after device validation: TER primary heatmap, transformed heatmap and R–V keep the same canonical Interaction/Selection transport but opt out of Core generic focus paint so the plugin-owned exact Vg/Vds presentation is not overwritten.
- Remove the incorrect full-row blue heatmap focus rectangle for TER domain selection while preserving heatmap hit/tooltip/click behavior.
- Preserve both forward and reverse R–V curves as the selected Vg/source pair and keep the two exact selected resistance markers visible; Core no longer reapplies a direction-specific series focus overlay after TER restyles.
- Add executable ScientificPlot focus-owner regression plus TER feature-runtime assertions so this competing-owner failure is covered by the main test/check/mobile manifests.
- SDK 1.45.0 formalizes `focusPolicy.enabled` / `controllers.focus.enabled` for scientific views with richer domain-owned selection paint; Plugin API remains 1.19.0 and Theme Contract remains 3.10.0. Android versionCode advances to 118.
- Desktop Visual Closure history remains preserved; this patch changes interaction visual ownership only and does not reopen the frozen Desktop presentation architecture.

# 3.68.96 WIP

## Phase E real-interaction regression repair

- Fix the TER Canvas heatmap interaction layer: `pointer-events` is a StyleGate presentation attribute, not paint. The previous owner mismatch threw after the raster was visible but before the D3 hit rectangle/tooltip layer was mounted, producing a visible but completely non-interactive heatmap.
- Route all four TER reduction/maxima plots through canonical `data.sweep` point entities (`artifactId + seriesId`) before the plugin preserves its exact local Vds point. Clicking TER_Max–Vg, Vd@TER_Max–Vg, TER_Max–Vd or Vg@TER_Max–Vd now drives the same R–V source-group isolation and exact forward/reverse marker path as the heatmap.
- Apply TER local R–V selection presentation synchronously on direct chart clicks instead of deferring the only visible effect through a later reactive frame.
- Repair Resonance selected-peak width projection. Exact FWHM still requires valid half-height crossings, but an existing detector/saved `widthLeft/right` now renders immediately as a provisional width band rather than disappearing while asynchronous metrics are pending. Once valid FWHM metrics resolve, the band upgrades to the exact half-height line/crossings.
- Add a targeted `resonance.peak.metric-focus` invalidation when the selected peak's metric resolves, so its main-plot mask/inspector updates immediately without undoing the 3.68.95 batch-only group redraw policy.
- Add executable regressions for the real Heatmap overlay StyleGate mount path, all four TER reduction-plot source-scan projections, TER reduction→R–V emphasis, and Resonance provisional→exact width projection.
- Keep SDK 1.44.0, Plugin API 1.19.0 and Theme Contract 3.10.0; this is a first-party/runtime bugfix, not a public capability change. Android versionCode advances to 117.

# 3.68.95 WIP

## Phase E runtime effectiveness closure

- Repair the first-party TER end-to-end selection path: the primary TER heatmap now carries stable source-scan references without overwriting canonical `data.sweep` Selection, R–V curve interaction restores the exact local Vds marker, and TER consumes canonical sweep Selection back into its existing curve-isolation/highlight state.
- Add a dedicated plugin-owned `ter-analysis/selection-link-runtime.js` for source-scan projection/matching. It reuses Core reference-only Selection and Interaction transactions; no plugin-private global event bus or second Selection store is introduced.
- Batch Resonance peak-metric and resonant-TER asynchronous completion waves so a group view invalidates once after the current wave settles instead of visibly redrawing once per peak/series.
- Stop republishing Resonance derived sweep/peak Artifacts on ordinary renders when the derived state signature is unchanged.
- Add `resonance-workbench/feature-data-runtime.js` as the source-table materialization owner. Full source point objects are temporary during sweep construction; the long-lived dataset catalog retains metadata only and full inputs are rematerialized on demand for analyses that require them. Artifact queries filter `kind:'data.table'` before transport projection so transient sweeps/matrices are not materialized and discarded.
- Replace `Math.min(...largeArray)` / `Math.max(...largeArray)` sweep-bound discovery with bounded O(N) scans, avoiding argument-stack overflow on large imported scans.
- Correct Desktop memory reporting to prefer additive Electron process private bytes; working-set values remain diagnostic because directly summing them double-counts shared pages.
- Add a real TER Feature Runtime end-to-end regression to the main test/check/mobile manifests; it executes Heatmap → canonical source-scan Selection → R–V isolation/point markers and the reverse R–V interaction path instead of only testing Core helpers.
- Add a reproducible Resonance retention benchmark/report. On the current host, five-sample 100k-point medians remove about 39.25% of JS heap for the targeted duplicate source-point layer while RSS changes only about 1.40%; this is explicitly not presented as a whole-Electron 39% memory reduction.
- Keep SDK 1.44.0, Plugin API 1.19.0 and Theme Contract 3.10.0: this patch repairs runtime adoption/effectiveness rather than adding a new public capability contract. Android versionCode advances to 116.

# 3.68.94 WIP

## Phase E bounded legend visibility linking

- Add a dedicated `scientific/legend-link-runtime.js` Core owner for opt-in cross-view legend visibility linkage; it owns only bounded legend envelope/reference projection and delegates transport to the existing Interaction Runtime.
- Reuse the existing `dkds:selection-changed` bridge with `channel:'legend'`; no `dkds:legend-changed`, second event bus, legend store, or Selection/viewport mutation is introduced.
- Identify linked series only by stable `artifactId + seriesId` references. Artifact revision is a snapshot condition; labels, colors, renderer legend keys and trace indices remain local presentation details.
- Mirror current Core legend semantics as compact `isolate / restore` state instead of serializing full renderer visibility arrays. A linked action is capped at 24 stable targets and fails closed when a stable series reference is unavailable.
- Preserve project-scoped transaction metadata, same-transaction cycle suppression, remote no-rebroadcast and disposal cleanup from the existing generic linked-state transport.
- Keep ScientificPlot linkage opt-in through `legendPolicy`; Data Center multi-series charts provide the first first-party stable-series adoption.
- SDK advances to 1.44.0, minimum app 3.68.94; Plugin API stays 1.19.0 and Theme Contract stays 3.10.0. Android versionCode advances to 115.

# v3.68.93 WIP — Phase E Scientific Viewport Linking

- Added one dedicated Core scientific viewport-link owner. ScientificPlot linkage is opt-in through `viewportPolicy`; viewport state remains independent of reference-only Selection schema 2.
- Reused the existing `dkds:selection-changed` cross-scope Interaction bridge as a bounded channel-multiplexed transport. `channel:'viewport'` carries `dkds.viewport-state.v1`; no `dkds:viewport-changed`/axis event or second global event bus was added.
- Generic Interaction linked-state transport now reuses project-scoped transaction metadata, bounded transaction deduplication, dynamic project resolution and remote no-rebroadcast cycle suppression from linked Selection.
- Linked X/Y axes are evaluated independently through the Core Scientific Units owner. Explicit quantity mismatch or unknown/incompatible units fail closed; compatible ranges are converted into the target unit before apply, including affine conversions.
- ScientificPlot suppresses programmatic linked relayout feedback and propagates autorange/reset as bounded `null` axis ranges rather than inventing numeric domains.
- TER main TER heatmap, transformed heatmap and all-Vg R–V are the first-party adoption through `ter-vds-viewport`: only X=Vds links, while heatmap Y=Vg and R–V Y=Ω remain independent.
- SDK 1.43.0 / minimum app 3.68.93 / Android versionCode 114. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.

# v3.68.92 WIP — Phase E 6.2 Heatmap Cell ↔ Source Scan Selection

- ScientificPlot scalar fields now accept Y-aligned `sourceScans` references. Heatmap cells lazily resolve their row's stable source scan only on interaction; render setup does not create per-cell or per-row Selection entities.
- Heatmap source selection stays reference-only: a cell selects the real `data.sweep` `artifactId + seriesId`, while cell x/y coordinates remain presentation coordinates rather than permanent identity.
- D3/Canvas heatmaps keep the raster architecture unchanged. Selected source scans are shown by bounded row-level SVG overlays; the raster still creates zero SVG cell nodes and no matrix-sized Selection payload.
- The bounded row-selection overlay is isolated in `core/scientific/heatmap-selection-overlay-runtime.js`; the generic D3 renderer stays below the repository 48 KiB module boundary, and Main/Dedicated hosts load Canvas → selection overlay → D3 in one explicit order.
- ScientificPlot adds explicit `selectionTarget:'series'` for source-scan views. Default behavior remains point selection, preserving the 3.68.91 table↔curve contract.
- TER transformed heatmaps are the first-party adoption. Each Vg row maps to the exact forward/reverse source sweep; the all-Vg R–V traces consume the same references, and legacy TER text refresh no longer rewrites canonical Selection state.
- SDK 1.42.0 / minimum app 3.68.92 / Android versionCode 113. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.

# v3.68.91 WIP — Phase E 6.1 Table ↔ Curve Reference Selection

- Added canonical source-row projection helpers while preserving exact artifact/series/row point identity.
- TableSurface now binds row Selection through the existing InteractionRuntime/SelectionViewBinding path.
- ScientificPlot derives reference-only point identities from table-backed traces and projects broad row Selection across visible series.
- ScientificCurveSurface supports explicit `selectionTarget: point` without changing existing default series-click behavior.
- Data Center XY chart and preview table are the first-party end-to-end adoption; no plugin-private Selection listener or second event bus was added.
- SDK 1.41.0 / minimum app 3.68.91 / Android versionCode 112.

# 3.68.90 WIP

## Phase E scientific dimension / unit compatibility

- Add one platform-neutral Core Scientific Units owner at `src/core/scientific/unit-runtime.js`; linked scientific views can now prove physical dimension compatibility without comparing axis labels or display strings.
- Normalize supported SI prefixes, common electrical/scientific compound units and explicit affine conversions such as `°C ↔ K`; conversions expose deterministic scale/offset metadata and numeric value/range helpers.
- Fail closed for unknown/nonlinear display units such as `a.u.` and `dB`, missing physical units, or explicit dimension/unit conflicts. Equal labels never override a physical mismatch.
- Preserve optional `dimension` and `quantity` metadata on DataTable columns, Series axes and Matrix x/y/value axes, including metadata-only Artifact snapshots. Existing Artifacts without these fields remain unchanged.
- Expose the same owner through existing `ctx.science.units`; InteractionRuntime delegates `axisCompatibility`, `canLinkAxes`, `convertAxisValue` and `convertAxisRange` to it. No second event bus or unit conversion table is added to Selection/Interaction.
- SDK 1.40.0 documents and types the Scientific Units contract. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0. Android versionCode advances to 111.

# 3.68.89 WIP

## Phase E project-scoped Interaction transactions

- Extend the existing Interaction/Selection propagation path with `dkds.interaction-transaction.v1` metadata: transaction id, current project, explicit link group, immutable origin owner/scope/runtime and current applying source owner/scope/runtime. No second global event bus is added.
- Add explicit per-PluginScope `scopeId` and dynamically resolve project identity at event time so long-lived plugins cannot retain link-group state across project switches.
- Add `InteractionRuntime.link(...)` and `applyRemoteSelection(...)`. Remote linked state preserves the originating transaction, applies to local bindings/subscribers with `remote:true`, and never rebroadcasts the global Selection event.
- Add bounded per-Runtime transaction deduplication (256 recent ids), suppressing duplicate application and A→B→A cycles before Selection mutation.
- Extend `ctx.ui.selection.observe(...)` with project/link-group/scope filtering while retaining `dkds:selection-changed` as the only cross-scope Selection event. Plugin/scope disposal removes all link subscriptions.
- SDK 1.39.0 documents linked transactions and cycle suppression. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0. Android versionCode advances to 110.

# 3.68.88 WIP

## Phase E stable cross-view identity + reference-only Selection

- Extend the existing Entity / Selection / Interaction Runtime path with one canonical `ctx.ui.selection.refs` contract for stable `artifactId`, `seriesId` and source `rowId` references. No second global Selection event bus is introduced; cross-scope propagation remains on `dkds:selection-changed`.
- Selection schema 2 is reference-only: stored items contain `type/id/role/ref/meta`, data-type projections returning `value` fail the current contract, and random fallback selection ids are removed.
- Treat `artifactRevision` only as an expected snapshot condition; canonical reference identity deliberately ignores revision changes.
- Bound interaction documents and source-reference region selections. Oversized point sets, context/reference payloads and embedded point/row/index arrays are rejected instead of becoming unbounded Selection state.
- Expose DataTable `seriesId(...)` / source `rowId(...)` helpers and preserve explicit imported row ids. Scientific display sampling carries source `rowId` through viewport sampling and reordered/filtered projections.
- Migrate Data Center, Resonance, TER, Pulse, Scientific Plot and the SDK template away from Selection preview values. Resonance ranges now refer to the source sweep and no longer publish growing curve-id context arrays.
- SDK 1.38.0 documents the reference-only Selection contract. Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.
- Preserve the existing **Desktop Visual Closure** ownership/history; this Phase E patch changes data interaction identity/contracts rather than Desktop presentation geometry or Theme paint. Android versionCode advances to 109.

# 3.68.87 WIP

## Phase D validated domain-command path

- Add a Core-owned Domain Command Runtime behind the existing command registry so plugin/UI invocations, Studio Kernel scripts and MCP calls execute through one validated path instead of separate automation entry points.
- Replayable command records capture canonical arguments, input Artifact ids with Store-local `artifactRevision` plus persistence fingerprint, exact command/plugin/algorithm/provider versions, normalized parameters, execution source/status/timing, output Artifact references and replay lineage.
- Replay is opt-in and fail-closed: the owning plugin must still expose the same command version, replayable algorithm identity must be exact-versioned, and input Artifact revisions must still match unless an explicit trusted caller disables the revision check.
- SDK 1.37.0 formalizes `ctx.commands` domain-command metadata, discovery, history and replay. Non-UI callers may execute only explicitly validated domain commands; legacy UI commands retain their original payload semantics and are not exposed through Kernel/MCP discovery.
- Add real first-party consumers: Data Center formula-derived-column execution and Transfer Vth constant-current analysis both use replayable domain commands. Vth canonicalizes current UI defaults/manual fit window before execution so replay does not re-read mutable UI state.
- Preserve the existing **Desktop Visual Closure** ownership/history; this patch changes command validation/provenance/automation infrastructure rather than Desktop presentation, Theme paint or scientific rendering geometry. Android versionCode advances to 108.

# 3.68.86 WIP

## Phase D selective Theme revision

- Add a Core-owned selective Theme revision channel for `raster` and `computed-style` consumers only; ordinary DOM paint consumers are explicitly rejected from revision subscription.
- Scientific Chart now consumes the selective Theme revision channel instead of the broad `dkds:theme-changed` event. Canvas/raster consumers can use the same bounded channel without creating a second Theme event bus.
- Remove broad Theme repaint listeners from Component Appearance and Material Renderer. Active Theme mode/profile/setting transactions synchronously project Core visual composition once before publishing the semantic Theme event, while ordinary DOM continues to consume CSS variables.
- Active Theme setting/reset/profile-refresh changes publish a frame-coalesced revision; inactive-profile settings do not repaint the active application or advance the active Theme revision.
- Retain only semantic broad Theme bridges for Status Monitor state text and the Mobile Host native-shell snapshot; these do not participate in DOM/raster paint invalidation.
- Preserve the existing **Desktop Visual Closure** ownership/history; this patch narrows Theme invalidation ownership without changing Desktop presentation geometry, the public Theme Contract 3.10.0, or SDK 1.36.0. Android versionCode advances to 107.

# 3.68.85 WIP

## Phase D Canvas heatmap raster owner

- Add a dedicated `scientific/heatmap-canvas-runtime.js` owner; large heatmap cells render into one Canvas raster while SVG remains responsible for axes, labels, colorbar, annotations and the lightweight interaction overlay.
- A 500×500 matrix now creates **0 SVG cell nodes**. Hit testing maps Canvas coordinates back to exact source matrix `(xi, yi, z)` identity, and export composition embeds the raster layer under the SVG presentation layer.
- Regular heatmap grids use one detached ImageData raster buffer plus one `drawImage()` composition instead of 250k Canvas `fillRect()` calls. Irregular grids retain the precise fillRect fallback.
- Separate raster-content invalidation from composition: unchanged matrix + colorscale reuses the resident raster for Theme background repaint and geometry resize/relayout. Representative headless Chromium measurements for a 500×500 matrix are ~36.5 ms cold raster, ~0.1 ms Theme-only repaint and ~0.3 ms geometry-only recomposition.
- Canvas 2D is therefore retained as the current heatmap backend; WebGL is intentionally deferred because measured Canvas performance is sufficient without adding GPU-context/texture lifecycle complexity.
- Public ScientificPlot/SDK/Artifact contracts remain unchanged. Android versionCode advances to 106.

# 3.68.84 WIP

## Phase D stable SVG identity + viewport-first display sampling

- Add a dedicated Core Scientific Display Runtime for stable `seriesId` identity, cached scan-segment analysis, axis summaries and bounded display sampling.
- Reuse D3 trace groups by stable series key and marker nodes by original source `pointIndex`; ordinary data/geometry renders no longer force every trace/marker node to be recreated.
- Add viewport-first min/max bucket sampling for large scatter/line traces while preserving source endpoints, segment-local extrema, NaN gaps, scan-direction boundaries and original source-row identity.
- Keep `target.data`, Artifact storage, calculations and data export full resolution; only the SVG display projection is sampled. Hover/click lookup now searches the bounded display projection and reports original source indices.
- Replace full-array axis flatten/spread extrema on numeric Cartesian traces with cached Core axis summaries so 1M-point viewport relayout does not rescan or spread the full payload.
- Preserve the existing **Desktop Visual Closure** ownership/history; this patch changes scientific rendering/data projection rather than Desktop presentation or Theme ownership. Android versionCode advances to 105.

# 3.68.83 WIP

## Phase D ScientificPlot invalidation split

- Split Core ScientificPlot/D3 invalidation into explicit **data**, **geometry**, **Theme-paint**, and **selection-overlay** paths.
- Linked Selection focus no longer mutates trace data or rebuilds the SVG tree; Core updates existing line/marker opacity, width, and marker geometry in place.
- Theme changes repaint existing plot/grid/axis/trace/colorbar nodes without routing through resize or full scientific-data rendering.
- `react()` remains the authoritative data replacement path; `relayout()` and `resize()` are explicit geometry invalidations. Existing plugin-facing ScientificPlot and Artifact contracts are unchanged.
- Preserve the existing **Desktop Visual Closure** ownership/history; this patch changes scientific renderer invalidation behavior rather than Desktop presentation geometry or Theme ownership. Android versionCode advances to 104.

# 3.68.82 WIP

## Phase C physical Artifact storage closure

- Dense exact numeric scientific payloads now use Store-owned typed physical backing while public/persisted Artifacts remain ordinary Arrays.
- Covers numeric DataTable columns, series/sweep/transform x/y and matrix axes/rows.
- Sparse, mixed or dtype-inexact sequences stay on lossless Array backing; no silent Float32/integer coercion.
- Canonical fingerprint, NaN/-0 behavior, range reads, Column Buffer transactions, undo/save/restore and full-resolution export semantics remain unchanged.
- Adds physical-storage regression coverage and same-machine resident-memory measurements; Android versionCode advances to 103.

# 3.68.81 WIP

## 3.68.81 WIP — Analysis Task Runner adoption + Phase C tokenized streaming import

- Migrate first-party heavy analysis paths in Pulse, Vth, Resonance and TER to the Core-managed Task Runner. Algorithm-provider execution remains replaceable/versioned while plugins no longer own private Worker pools or heavy synchronous fallback implementations.
- Add manifest task `imports` so worker tasks reuse packaged pure-compute modules without duplicating algorithms; unify application export, CLI packaging and validation around one referenced-plugin-asset contract.
- Fix Pulse async restore ordering so legacy analyzed entries without cached results are resubmitted only after the current Artifact-backed state has been hydrated; stale detached items can no longer receive the restored result.
- Add tokenized native file read sessions, Core-owned 256 KiB chunks, Desktop <=2 / Mobile <=1 in-flight reads, AbortSignal cancellation, streaming TextDecoder line framing and consumer-await backpressure.
- Add optional SDK 1.36.0 `createStreamParser()` importer sessions. Flexible Import and Pulse Text Import consume line batches incrementally; Import Workbench preview is bounded to 384 KiB and full streaming import does not mutate the Artifact Store until parsing completes.
- Replace Android per-chunk reopen+skip with persistent SAF read-session tokens and route Android folder imports through the same tokenized reader instead of materializing every file as whole-file Base64 in the WebView.
- Refactor Flexible Import streaming accumulation from point objects to final column arrays. The local 250k-row/7.6 MB benchmark reduced parser peak heap from about 225 MiB to 48.9 MiB and peak RSS from about 258 MiB to 79.6 MiB while preserving parsed values; measurements are trend evidence, not portable release thresholds.
- Replace spread-based large-array extrema aggregation that could overflow the JS call stack on large files with linear accumulation.
- Extract Resonance resonant-TER task orchestration into its own feature runtime so the main coordinator remains under the 48 KiB authored-module boundary.
- Preserve Desktop Visual Closure ownership and Theme paint/geometry contracts; this patch changes execution and import/data-processing infrastructure rather than Desktop presentation. Android versionCode advances to 102.

# 3.68.80 WIP

## 3.68.80 WIP — Phase C bounded Core task runner

- Add a Core-owned bounded task scheduler for plugin CPU work, with Desktop concurrency derived from hardware/memory budget and Mobile fixed at one worker.
- Add latest-generation cancellation and stale-publication protection; superseded running work is terminated rather than allowed to finish on the UI path.
- Add SDK 1.35.0 `ctx.tasks` plus manifest-declared task workers and `execution.tasks`; first-party and external `.dkplugin` packages use the same worker contract.
- Migrate Pulse Sampler steady-state extraction to the managed worker path and remove the duplicate synchronous main-thread implementation.
- Preserve prior Desktop Visual Closure ownership and presentation contracts; this iteration changes execution/data-processing infrastructure only, not UI geometry or Theme paint.
- Advance Android versionCode to 101 for the 3.68.80 Mobile package.

# 3.68.79 WIP

## 3.68.79 WIP — Phase C precise buffer invalidation + incremental lineage index

- Add Store-local `columnRevision(id, column)` plus `bufferRevision` on column metadata, bounded ranges and transactional Column Buffer snapshots.
- Make `transactColumn()` stale-check against the edited buffer revision rather than the whole Artifact revision. A Y-only transaction no longer invalidates a valid X snapshot; the owning `artifactRevision` still advances exactly as before.
- Keep unrestricted full-Artifact writes conservative and fast: `add/upsert/publish/remove` invalidate the affected table buffers without scanning million-point payloads to guess which values changed.
- Replace full `childrenIndex` rebuilds on every Store write with incremental parent→child edge updates. Same-host 1000-artifact benchmark: lineage-chain creation drops from 140.523 ms to 33.398 ms median and 1000-child batch re-parent from 143.119 ms to 37.849 ms median; these are trend measurements, not portable release thresholds.
- Expose the precise revision lookup through main-window, Plugin API and dedicated-window facades; publish SDK 1.34.0 / minimum app 3.68.79 while keeping Plugin API 1.19.0 and Theme Contract 3.10.0 unchanged. Android versionCode is 100.

## 3.68.78 WIP — Phase C lightweight metadata + bounded range reads

- Add Store `listMetadata()` and `columnMetadata()` snapshots that preserve Artifact/table structure without copying numeric payload arrays or full provenance steps.
- Add explicit `readColumnRange(id, column, {start, limit})`; `limit` is mandatory, capped at 65536, and cost scales with the requested slice rather than full-column length.
- Expose the same contract through main-window, dedicated-window and Plugin API facades while retaining workbench data-assignment visibility filtering.
- Migrate Studio Kernel/MCP Artifact listing and DataTable preview to metadata/range reads; add `data.artifacts.columns` and `data.artifacts.column-range`. Data Center now also caches one lightweight catalog per Store revision and renders its 18-row table preview from bounded column ranges instead of cloning every Artifact payload.
- Publish SDK 1.33.0 types, author documentation and packaged reference. Plugin API remains 1.19.0, Theme Contract remains 3.10.0, Data Center is 1.15.19, Android versionCode is 99.
- 1M-point local checkpoint: full `list()` 207.913 ms / 30.525 MiB peak heap delta vs metadata list 0.170 ms / 0.023 MiB; full-column snapshot 185.016 ms / 7.647 MiB vs 2048-value bounded range 0.230 ms / 0.103 MiB. These are trend measurements, not release thresholds.

# 3.68.77 WIP

## 3.68.77 WIP — Phase C Store-owned Column Buffer

- Add a Store-owned full-column Buffer snapshot with explicit numeric dtype, immutable `values`, stable Artifact/column owner metadata and private Store ownership proof. Snapshots from another Store or an older revision cannot authorize a write.
- Add synchronous fixed-length `transactColumn()` writes. Successful edits validate exact dtype representability and publish once; no-op, thrown, async, stale, foreign, length-changing and out-of-range writes leave the canonical Artifact unchanged.
- Route the same API through the main window, dedicated plugin windows and Plugin API facade. Direct main-project transactions record one semantic history entry, with runtime-verified undo/redo restoration.
- Preserve the current serializable `values[]` representation and project schema as the single source of truth. JSON save/restore and fingerprint identity are verified; default `get/list`, scientific export, Desktop/Mobile presentation and all existing consumers are unchanged.
- Publish SDK 1.32.0 runtime types, author guidance and example while keeping Plugin API 1.19.0 and Theme Contract 3.10.0 unchanged. Data Center stays 1.15.18; Android versionCode is 98.
- Metadata-only listing, explicit range reads, per-buffer revisions and physical buffer storage remain the next bounded Phase C work. Real Windows Electron and Android visual/device acceptance remain WIP; this iteration contains no presentation change.

## 3.68.76 WIP — Phase C Artifact identity

- Replace whole-payload `canonicalize → JSON.stringify → hash` allocation with an equivalent bounded canonical stream. The digest remains byte-for-byte compatible with the previous contract, including sorted keys, nested timestamp exclusion, metadata, lineage, provenance, NaN/Infinity/null and -0 semantics.
- Add Store-local `artifactRevision(id)` change stamps for one-Artifact invalidation while retaining `revision(kind)` for aggregate work and `fingerprint(id)` for save/restore-stable content identity. Revisions are not persisted; remove/re-add invalidates the same id.
- Move Data Center ScientificPlot render de-duplication from kind-global revision to the active Artifact revision, so changing an unrelated `data.table` no longer redraws the current preview.
- Publish SDK 1.31.0 runtime types, author guidance and example without changing Plugin API 1.19.0 or Theme Contract 3.10.0. Data Center is 1.15.18; Android versionCode is 97.
- Add deterministic canonical/parity/persistence/invalidation tests and a reproducible 100k/1M identity benchmark. Buffer/Column storage remains the next Phase C step.
- Desktop Visual Closure history and the 3.68.71–3.68.75 interaction fixes remain unchanged. Real Windows Electron and Android visual/device acceptance remain WIP; no static suite is treated as device acceptance.

## 3.68.75 WIP — Data Center floating inset ownership

- Fixed Data Center chart-preview parameter-row inset disappearing after PortableView reparenting.
- Moved chart-preview geometry tokens from `.dc-main` to the movable `.dc-chart-pane`, so home/float/global placements preserve the same content padding.
- Added a fallback inset and mirrored the ownership correction in the native/mobile presentation.
- No new drag-time geometry reads were introduced.

## 3.68.74 WIP — Data Center preview layout stability

- Data Center generic preview: remove `contain:size` from the inline chart host. The explicit fixed height/max-height/flex contract remains the single home-layout size owner, while `contain:layout paint` prevents child layout/paint from escaping without removing the chart from the parent PortableView intrinsic height calculation. This fixes the regression where the preview controls remained visible but the chart itself was clipped away.
- Keep the generic preview parameter row on one stable four-track geometry across home/floating/global placements. Floating changes panel geometry only; it no longer reorders the embedded X/Y/mode/legend controls.
- Floating/global Data Center preview makes only the chart body flexible (`flex:1 1 0`), so the title and parameter row stay fixed while the plot fills the remaining user-sized viewport.
- Desktop Visual Closure history remains preserved; this patch changes only Data Center-owned layout and does not reopen Core Presentation ownership.

## 3.68.73 WIP — Floating Drag Performance / Data Center Preview Bounds

- Remove the v3.68.72 live drag-handle `getBoundingClientRect()` recovery path. PortableView now snapshots the floating-zone rectangle and panel geometry once at pointer-down; pointer-move performs coordinate math and style writes only, with no `getBoundingClientRect()` or floating-zone geometry reads in the hot drag path. The v3.68.72 zone-local to viewport translation remains intact, so dedicated-window titlebar protection no longer depends on per-frame layout measurement.
- Bound the Data Center inline Generic Preview to one explicit Core-consumed chart height. The home preview now uses the same height as `max-height` and flex basis, clips descendant overflow, and applies `contain:size layout`, preventing renderer/SVG intrinsic size from feeding back into its host block size during intermittent ResizeObserver/render timing. Docked and floating preview modes remain separately resizable.
- Add regression coverage that rejects per-pointer-move layout reads in PortableView and requires a bounded Data Center home preview. Phase C remains paused while interaction/visual stabilization is being accepted on Windows Electron and Android. Desktop Visual Closure remains WIP pending real-device verification.

## 3.68.72 WIP — Dedicated Floating Drag-Handle Recovery

- Fix the remaining dedicated-window PortableView regression exposed by Windows Electron: floating geometry is persisted in workspace-zone coordinates, but a generic fixed-position fallback consumes viewport coordinates. When the dedicated workspace begins below the native 52 px titlebar, writing the saved zone-local `top` directly can place the floating panel header underneath native chrome while leaving only chart parameters/content visible.
- PortableView now resolves its live positioning mode and translates zone-local coordinates into viewport coordinates only when the floating surface is actually `position: fixed`; absolute workspace overlays remain unchanged.
- Add a geometry invariant that checks the actual drag-handle rectangle after restore, collision resolution and live drag. If host/layout state would leave the handle above the live floating zone, Core moves the whole floating surface back into the draggable region.
- Keep the fix entirely host/domain blind. No Data Center, Resonance, TER, Pulse or dedicated-window selector/ID is added to Core PortableView. Phase C remains paused. Desktop Visual Closure still requires Windows/Electron confirmation.

## 3.68.71 WIP — Interaction Stabilization Before Phase C

- Protect floating/global PortableView geometry from entering the owning analysis-page header. The Core computes a generic top exclusion boundary from the live page/header geometry and applies it during restore, drag and collision resolution; no Data Center-specific placement rule was added.
- Make Data Center multi-selection authoritative for context actions. Right-clicking an already-selected data object preserves the complete selection, and batch-capable assignment, exclusion/restoration and deletion actions execute across the selected set. Selection/gesture ownership was split into the dedicated `artifact-selection` plugin module to keep the feature runtime below the 48 KiB module boundary.
- Intercept Ctrl/Cmd+A while the pointer/focus event is in the Data Object pane so it selects all visible data objects instead of browser text. Data-object rows suppress WebView/browser text selection and touch callout, preventing Mobile long-press from highlighting labels.
- Fix Mobile parameter-drawer dismissal at the Presenter-frame boundary. Pointer sequences that begin anywhere inside the active drawer frame, especially form controls, remain inside the drawer; only a true outside press or the explicit close swipe may dismiss it.
- Close viewport-anchored ContextMenu/select popups and shell command menus after their owning page scrolls, while preserving scrolling inside the popup itself.
- Phase C Store/Artifact/Pipeline implementation remains paused in this stabilization patch. The v3.68.70 fingerprint/revision measurements and next-step plan are unchanged. Desktop Visual Closure and Android device acceptance remain WIP pending real-device verification.

## 3.68.70 WIP — Phase C Fingerprint/Revision Design Spike

- Add an isolated, repeatable comparison of the current full JSON Artifact fingerprint, the kind-global Store revision lookup and a low-allocation numeric payload digest across 100k- and 1M-point curves.
- Record median/p95 timing, peak heap/RSS deltas and correctness-boundary checks in `docs/reports/PHASE_C_FINGERPRINT_3.68.70.{json,md}`.
- Confirm the optimization direction without changing Store, Artifact, SDK, save/restore or `get/list` contracts: full JSON fingerprinting is the dominant large-curve cost; kind-global revisions over-invalidate unrelated artifacts; the numeric prototype is not a drop-in identity because it omits metadata, lineage and provenance.
- Keep the next implementation bounded to a complete artifact-local revision plus full canonical digest design, followed by collision, metadata, persistence and cache-invalidation tests. Desktop/Mobile visual acceptance remains WIP.

## 3.68.69 WIP — Phase C Performance Baseline

- Add an isolated, repeatable benchmark runner for 100k/1M-point curves, 500×500 matrices, 1000 small Artifacts and 20 Core-scheduled plots.
- Record median, p95, blocking time, phase timing, peak heap/RSS deltas and the current contract's statically traced full-payload copy passes. Each scenario runs in a fresh Node process with explicit GC between samples.
- Add a deterministic smoke contract to `check` and `test`; the full baseline is written to `docs/reports/PHASE_C_BASELINE_3.68.69.{json,md}`.
- Keep the Artifact representation, `get/list` contract and scientific definitions unchanged. The baseline identifies the next owner-level optimization target without silently changing precision or persistence semantics.

## 3.68.68 WIP — Deterministic Core Layout State

- Add a pure Core layout resolver that separates preferred size/ratio, placement and collapse intent from viewport-clamped effective geometry.
- Preserve user split intent across transient hidden/zero-sized states and Mobile orientation changes; reopening restores the preferred size within current bounds.
- Move Native Mobile overlay limits and frozen drag geometry into the canonical `SplitController`, retiring the runtime method-replacement module.
- Synchronize closed region tracks and resize handles through controller state, while continuing to apply only one Core-owned CSS track token per split.
- Give registered workbench regions explicit scroll policies and replace automatic PRIMARY subtree recovery scans with bounded, read-only, on-demand diagnostics.
- Publish SDK 1.30.0 types and author guidance for split state and layout diagnostics. Desktop presentation geometry and paint remain unchanged; device visual acceptance remains WIP.

## 3.68.67 WIP — Core Data and Cache Correctness

- Accept ordinary numeric TypedArrays at Data Model factory boundaries by copying them into the canonical JSON-serializable Artifact representation; reject BigInt TypedArrays and non-rectangular matrices explicitly.
- Remove the mutable Artifact Store escape hatch so reads remain detached and canonical mutations retain revision/provenance ownership.
- Correct Pipeline cache identity and lifecycle across owners, exact stage versions, stage replacement, in-flight Promise sharing, fulfilled async values and rejected retries.
- Route the plugin performance facade through Core exactly once for every result, including valid `null` and `undefined` values, and fail explicitly when the required runtime is absent.
- Publish SDK 1.29.0 types, examples and documentation for these behaviors. Desktop Visual Closure remains WIP; no presentation geometry or paint changed in this patch.

## 3.68.66 WIP — Save Cancel Destructive Theme Variant

- Change the Save Project dialog's `取消` action from the ordinary Theme `secondary` variant to the same `danger-soft` / `destructive` action family used by the Resonance range-selection delete control.
- Keep red fill fully Theme-owned: no project-save-specific red, HEX or RGBA paint was introduced. Default, Thin Glass, Aurora Pop and third-party themes resolve the destructive surface/text/border through the canonical Component Appearance contract.
- Preserve the other save actions unchanged: 保存当前 = `primary`, 另存为 = `secondary`.
- Update the active save-dialog regression so future patches cannot silently normalize Cancel back to secondary styling.

## 3.68.65 WIP — Project Save Dialog Visual Integration

- Rebuilt the desktop project-save chooser on the canonical Core dialog shell used by refined settings/service surfaces.
- Added a compact current-project summary, keyboard hints, a proper header close action, and responsive geometry without introducing a second material owner.
- Save Current uses the Theme `primary` Action variant; Save As and Cancel use the Theme `secondary` Action variant. All three footer actions therefore keep visible Theme-owned fill across appearance profiles instead of falling back to bare text buttons.
- Removed the legacy project-save-specific backdrop/icon/text paint so Material Renderer + Component Appearance remain the only optical owners.

## 3.68.64 WIP — Native Mobile Vertical Scroll Chaining

- Fix nested Mobile workspace scroll trapping. Core `safe` Primary regions and layout-recovery scrollers previously used `overscroll-behavior: contain` on native Mobile, so a continuing upward/downward touch gesture stopped when the local panel reached its boundary instead of handing off to the next scrollable workspace ancestor.
- Add an explicit Presenter-platform vertical chaining contract for the main analysis scroller, scientific canvas center, Primary host, SUB host, dock lanes and canonical table scrollers. These regions now use `overscroll-behavior-y: auto` on native Mobile while retaining local horizontal containment.
- Change PluginWorkspace layout recovery to preserve vertical chaining on both Desktop and Mobile instead of reintroducing Mobile-only containment through an inline runtime style.
- Keep transient overlays isolated: parameter drawers, menus and other overlay-owned scrollers retain their containment so an overlay cannot accidentally scroll the page behind it.
- No Pulse-specific selector or touchmove polling/listener was added. The fix stays in Core/Presenter scroll ownership and uses browser/WebView native nested-scroll behavior.
- Desktop Visual Closure remains WIP pending Windows/Electron pixel acceptance.

## 3.68.63 WIP — Persistent Primary Action Semantics / More Translucent Smaller Resize Corner

- Fix the remaining important-action fill regression at the actual semantic-hydration boundary. v3.68.62 successfully projected `variant: primary`, but dedicated titlebar / ActionGroup / plugin-toolbar buttons authored that variant with module-specific owners. Semantic UI only treats `core-component` as persistent explicit semantics, so a later hydration pass could normalize the variant to `core-runtime` and then erase it. All Core-created plugin actions now use the canonical persistent component owner, keeping TER `计算 TER`, Pulse `分析勾选`, Data Center `运行工作流` and other primary actions Theme-filled after repeated hydration.
- Strengthen the visual invariant so future releases fail if plugin-toolbar, ActionGroup or dedicated-titlebar variants stop using persistent Core component semantics.
- Reduce only the visible PortableView resize affordance from 21/18 px to **18/15 px**, preserving the 36×36 transparent hit target, clipped silhouette and ~3 px edge relationship.
- Fix the missing transparency from v3.68.62. The handle was Theme-colored, but the consumed `floatingChrome` slots are intentionally opaque in the builtin profiles. The handle now derives hue from those active Theme slots and mixes them with `transparent` (58% outer / 44% inner; 68% active), so light/dark and custom themes still own color while Core supplies the flat alpha treatment. No backdrop blur, panel-surface inner plane, gradient or fold-depth effect is reintroduced.
- Desktop Visual Closure remains WIP pending Windows/Electron pixel acceptance.

## 3.68.62 WIP — Primary Action Projection / Smaller Theme-Owned Resize Corner

- Fix the actual TER `计算 TER` fill regression in dedicated plugin windows. The ActionGroup registry now preserves the authored semantic `variant`, the Presentation model carries it, and dedicated titlebar proxies consume it instead of rebuilding every plugin action as `quiet`. This fixes the root projection loss rather than adding a TER-specific style.
- Preserve the same primary-action semantics in the Native presenter and overflow sheet, so important first-party actions retain Theme accent fill when the Presenter relocates them.
- Reduce the floating PlotView resize-corner visible geometry from 24/21 px to **21/18 px** while keeping the invisible 36×36 px interaction target and the accepted clipped silhouette.
- Keep resize-corner material Theme-owned through `floatingChrome`. Theme-defined translucency/tone is allowed; the handle itself still forbids backdrop blur, surface-colored fold planes, gradients and hard-coded profile paint, avoiding the old folded-page depth cue.
- Desktop Visual Closure remains WIP pending Windows/Electron pixel acceptance.

## 3.68.61 WIP — Theme-Owned Action/Handle Material / AI Status / Vth Live Resize / Theme Header Settings

- Restyle AI Agent and MCP runtime states as quiet Core chips inside their action rows. Status text now has bounded padding, ellipsis and title mirroring instead of sitting unstyled against the right panel edge.
- Make important first-party plugin actions explicitly request the canonical `primary` component variant. Builtin Default, Thin Glass and Aurora Pop now provide Theme-owned primary ToolbarAction fills for light/dark modes, so actions such as TER `计算 TER` receive the active Theme material instead of a generic fallback.
- Fix a Core scientific-layout invalidation gap exposed by Vth. `ScientificCurveSurface` instances are now tracked by PluginScope and participate in the existing post-split ResizeScheduler flush, so changing the lower results-pane height immediately re-renders/clamps the Vth plot without requiring manual Refresh.
- Preserve the accepted PortableView resize-handle geometry (36 px transparent hit target; 24/21 px clipped visible layers), but move visible color ownership fully into the Theme Contract `floatingChrome` appearance slots. Presentation no longer defines portable-corner color tokens or fixed RGBA material; light/dark/profile-specific color differences come from the active Theme.
- Move the Theme parameter control out of the bottom appearance row into the Theme panel titlebar as the canonical settings gear. It opens the active Theme settings and stays hidden when the selected Theme declares no configurable parameters.
- Android versionCode advanced to 88. Desktop Visual Closure remains WIP pending Windows/Electron pixel acceptance.

## 3.68.60 WIP — Desktop Visual Closure / Mobile Pulse Layout / Import Classification

- Preserved the accepted flat two-tone floating resize-handle silhouette while scaling visible geometry from 28/25 px to 24/21 px; the 36 px hit target is unchanged. Handle colors now derive from Theme accent roles with separate light/dark mixtures instead of fixed RGB literals.
- Reflowed AI Agent / MCP settings to an overflow-safe responsive grid. MCP state is now part of the action row instead of a standalone line, with long runtime addresses ellipsized and exposed via title text.
- Made the default desktop file filter show both DKDS JSON projects and supported text data without an extra filter click. JSON is classified by content; non-project tabular JSON now has a real importer supporting common object-array, 2D-array, rows/data/records/points/values, and column-array shapes.
- Rebuilt Pulse Analysis mobile result composition into deterministic semantic-lane layout: stable two-column result plots on wide/landscape mobile, one column on narrow screens, no contradictory split display declarations.
- Moved Pulse “显示范围” and analyzed-file summary into the right side of the canonical “结果比较” title bar, matching other titlebar action clusters.

## 3.68.59 WIP — Flat Same-Family Portable Resize Material / Desktop Visual Closure

- Keep the accepted 3.68.52 resize-handle geometry exactly: 36×36 transparent hit target, 28×28 clipped outer triangle and 25×25 clipped inner triangle, leaving the existing ~3 px diagonal band.
- Fix the persistent folded-page appearance at its actual material source. The inner triangle no longer derives from `--dkui-surface-elevated`, and neither visible triangle uses `backdrop-filter`.
- Restore both visible layers to one cyan/blue hue family, using only shade/alpha differences. Default/light uses softened `rgba(0,142,197,.62)` outer and `rgba(6,105,150,.66)` inner; dark mode strengthens alpha without changing the hue family.
- Hover/focus/drag only strengthen the existing outer triangle. The 36×36 rectangular interaction target remains fully transparent and never receives background, border or shadow paint.
- Rebase all historical PortableView handle regressions that were still protecting the rejected edge/glass/surface-blur material. HARD-86 now explicitly forbids backdrop blur, surface/elevated inner material and the retired `corner-glass/corner-blur` tokens.
- Desktop and Mobile continue to share one Core geometry/paint owner. Android versionCode advanced to 86.
- Desktop Visual Closure remains WIP pending Windows/Electron pixel acceptance.

## 3.68.58 WIP — Portable Resize Edge/Glass Material Correction / Desktop Visual Closure

- Restored the exact 3.68.52 resize-corner geometry: 36×36 transparent hit target, 28×28 clipped outer layer and 25×25 clipped inner layer.
- Reinterpreted the 28 px layer as only the narrow exposed diagonal edge; the 25 px inner layer now carries the theme-derived near-surface glass material.
- Hover/focus/drag may strengthen only the narrow outer edge. The rectangular hit target remains transparent in every state.
- Removed the rejected single full-triangle fill model introduced after 3.68.52.
- Desktop and Mobile continue to share the same Core geometry and paint owner.

## 3.68.57 WIP — Single-Plane Portable Resize Corner / Desktop Visual Closure

- Fix the actual folded-page regression: the 36×36 PortableView resize node remains an invisible rectangular hit target, while all visible paint is now confined to one 28×28 bottom-right triangle through `clip-path`.
- Remove the nested 25×25 `::after` paint plane and retire the dual `outer/inner` material tokens. Applying translucent paint and backdrop blur independently to two nested clipped layers created two composited visual planes and therefore the persistent page-fold appearance.
- Keep the accepted 3.68.52 outer silhouette, but refine only one same-plane material layer with theme-derived translucent tint and restrained 4 px backdrop blur. Hover/focus/drag strengthen this same clipped layer and never paint the rectangular hit target.
- Add HARD-86 and release regressions that reject any nested `::after` fold plane, rectangular hover paint, dual outer/inner material contract, or handle-local visible gradient. Desktop and Mobile continue to share one Core owner.
- Desktop Visual Closure remains WIP pending Windows/Electron visual acceptance.

## 3.68.56 WIP — Restore 3.68.52 Portable Handle Geometry / Theme Material Only

- Restore the **exact accepted v3.68.52 PortableView resize-handle silhouette**: one 36×36 invisible hit target with the shared 28×28 outer and 25×25 inner bottom-right triangles. The 3.68.53–3.68.55 geometry experiments are retired.
- Confirm the mismatch was **not a second runtime CSS owner**. Current source has one Structure geometry owner and one Presentation paint owner; Mobile only controls visibility and does not repaint `::before/::after`.
- Remove the actual residual regression mechanism: older regression tests had been rewritten to forbid the 3.68.52 triangle and therefore actively protected the rejected 3.68.55 shape. Those rejected-design gates are removed/rebased so the accepted 3.68.52 geometry is now the protected contract.
- Refine only material, not silhouette: replace hard-coded cyan with theme-derived translucent outer/inner material, add restrained 5 px backdrop blur, and keep hover/drag limited to a modest outer-material emphasis. No added fold crease, border flap, diagonal slash, gradient, or glow.
- Desktop and Mobile continue to share one Core PortableView handle owner. Android versionCode advanced to 83.
- Desktop Visual Closure remains WIP pending the user's Windows/Electron visual acceptance.

## 3.68.55 WIP — Flat Corner-Glass Resize Handle / Desktop Visual Closure

- Remove the large filled triangular PortableView resize surface and the edge-to-edge diagonal crease. Both geometries continued to read as a folded page even after the nested triangle was removed.
- Keep the 36×36 invisible resize hit target, but reduce the visible affordance to an 18×18 flat theme-glass patch attached to the true bottom-right panel corner.
- Replace the long crease with a single 9×1 px short diagonal resize cue. No `clip-path`, filled triangle, gradient, glow, or fold-shadow remains.
- Theme owns tint, boundary, grip contrast and 6 px backdrop blur; hover/drag only slightly strengthens the same flat patch.
- Desktop and Mobile continue to consume one Core PortableView handle with no plugin/platform paint fork.
- Update superseded handle regressions and add a 3.68.55 gate that rejects triangular page-fold geometry. Android versionCode advanced to 82.

## 3.68.54 WIP — Portable Handle No-Page-Fold / Desktop Visual Closure

- Remove the nested filled 27×27 inner triangle from the shared floating PlotView resize handle. That second filled plane was the direct cause of the visible page-turn/page-fold effect reported on the dark theme.
- Keep the 36×36 interaction target and the existing 28×28 bottom-right corner footprint, but render only one translucent same-plane corner material.
- Re-purpose the second pseudo-element as an approximately 1 px diagonal separator strip instead of another filled triangle. This preserves a clear boundary without implying a lifted flap.
- Replace `outer/inner` fold-plane Theme tokens with `surface/surface-active/divider` semantics. Color difference, transparency and the local 5 px blur still derive from the active Theme; gradients and glow remain absent in normal/hover/drag states.
- Desktop and Mobile continue to consume exactly the same Core PortableView handle; no platform/plugin-specific paint fork was added.
- Add a release regression that explicitly forbids the old nested 27×27 triangle and old `inner/outer` tokens so the page-fold visual cannot silently return.
- Android versionCode advanced to 81 because the shared Core handle also serves floating Mobile PlotViews.

## 3.68.53 WIP — Desktop Vth / Action Density / Theme Glass Handle / Desktop Visual Closure

- Fix Import Workbench canonical actions that were visually undersized because the workbench used `dkds-action-button` while omitting the existing Core `regular` action-density request. The Import Workbench now explicitly consumes the shared 32 px regular action geometry; no new private button size is introduced.
- Recompose Transfer Vth Lab as a bounded `primaryScroll: contained` scientific workspace. The plot row is now `minmax(0,1fr)` and automatically consumes all vertical space above the results table.
- Reverse the Vth vertical split ownership: the persisted splitter now resizes the bottom results row (`--dkds-vth-results-height`) instead of freezing the plot to a fixed pixel height. This preserves manual resizing while making plot auto-fill the default.
- Normalize the Vth `数据` surface: the fixed-left data-control PRIME disables redundant PortableView chrome, its title no longer inherits the card-body bottom margin, and fixed one-placement PortableViews no longer inject an empty controls group.
- Replace the hard-coded cyan floating resize corner with theme-derived semantic glass paint. The 36×36 hit area and 28×28 outer footprint remain, while the inner layer becomes 27×27 for a restrained 1 px rim; color, transparency, 5 px backdrop blur, focus and active state now derive from current Theme tokens. No gradient is used.
- Desktop performance audit found no new global hot-loop in the 3.68.52 handle-only patch; the performance suite remains the release guard. This patch additionally removes empty fixed-panel PortableView chrome DOM rather than adding polling or observers.
- Android versionCode advanced to 80 because the shared Core resize affordance also serves floating Mobile PlotViews.

## 3.68.52 WIP — Exact HTML Portable Handle Reference / Desktop Visual Closure

- Replaced the previously interpreted PortableView resize-corner styling with the exact handle geometry and palette from the user-provided HTML reference.
- Shared Desktop/Mobile Core geometry is now 36×36 hit area, 28×28 outer triangle and 25×25 inner triangle, all anchored at the bottom-right corner.
- Light and dark outer/active/inner RGBA values match the reference exactly; Theme owns those values as semantic tokens while Presentation consumes them without private hard-coded paint.
- Hover, focus and drag change only the outer triangle as in the reference; the exact 140 ms background transition is owned by Motion, and focus-visible uses the reference inset highlight.
- The resize handle remains one Core owner on Desktop and Mobile; Mobile has no private ::before/::after paint fork.
- Android versionCode advanced to 79. The 3.68.51 Mobile SDK runtime packaging fix and zero obsolete compatibility layers remain intact.

## 3.68.51 WIP — Mobile Plugin Runtime Contract Packaging

- Fix Android/WebView first-party plugin registration failure caused by omitting the current `sdk/platform-presentation-contract.js` runtime from `mobile/assets/web/sdk/`.
- Mobile sync now packages the exact three current SDK runtime contracts referenced by `src/index.html`: Platform Presentation, Theme Contract, and Theme Coverage Contract.
- Add an explicit declaration/package consistency check so future SDK runtime additions cannot silently disappear from Android assets, while retired compatibility modules remain excluded.
- Preserve the 3.68.50 reference-matched Core PortableView corner-handle work and the single historical project-file migration boundary.
- Android versionCode advanced to 78. No legacy semver/plugin compatibility path was restored.

## 3.68.50 WIP — Portable Handle Reference-Match

- Retain the shared 6 px separator track between every dedicated self-drawn titlebar and plugin content surface.
- Retain the Vth / Pulse first-row top-alignment corrections from 3.68.49.
- Keep Core PortableView as the only floating resize owner: browser-native `resize:both` stays disabled and Resonance does not re-enable it.
- Repaint the shared bottom-right resize handle to match the user reference more closely: a larger integrated corner wedge with one diagonal crease line, replacing the earlier detached-style interpretation and retiring the old inner 5×5 triangle.
- Keep the Android/web sync current-contract fix: no `sdk/semver-compat.js` copy path.
- Android versionCode advanced to 77. No legacy plugin/SDK compatibility path was restored.

## 3.68.48 WIP — Dedicated Titlebar Right Cluster / Full Empty-Area Drag

- Reworked the shared dedicated-plugin titlebar geometry to `title/version | draggable spacer | plugin actions | Core actions | window controls`, keeping registered actions adjacent to the minimize/maximize/close cluster instead of starting immediately beside the plugin title.
- Added a title/version divider and retained the existing plugin/Core action divider.
- Removed `no-drag` ownership from action-zone containers and from command-bar whitespace; only actual interactive controls opt out of Electron dragging, so every unused titlebar region can move the window.
- Added runtime diagnostics and Electron smoke coverage for action-to-window-control proximity.

## 3.68.47 WIP — Dedicated Titlebar Registry Presentation / Desktop Visual Closure

- Dedicated plugin windows now present current plugin actions from `DKDSUI.actions` and Core workspace surfaces from `DKDSUI.workspaces` directly in the self-drawn titlebar, matching the main shell presentation model instead of reparenting live page DOM.
- TER dedicated chrome restores `自动参数 / 计算 TER / 布局`, while Core `导入数据 / 参数` actions are presented after the titlebar divider.
- Body-level PluginWorkspace navigation is suppressed in dedicated windows so there is no second toolbar row.
- Electron dedicated-window diagnostics fail closed when any registered plugin action, Core workspace surface, or required import action is missing from the titlebar.
- Resonance no longer duplicates Core-owned workspace surface navigation in its plugin-owned action group.

## 3.68.46 WIP — Dedicated Window Content / Self-drawn Chrome Runtime Closure

- Fix the shared dedicated-plugin-window host used by Data Center, Pulse Analysis, Pulse Sampler, Resonance, TER and Transfer Vth Lab: Core chrome no longer uses a body-wide MutationObserver that reparents live PluginWorkspace nodes while the workspace is still being constructed.
- Adopt plugin actions/import/navigation only after the target activity has mounted and its visible page has been validated; AnalysisWorkbench keeps canonical navigation references so post-mount host presentation cannot detach Core from its own nav controls.
- Harden frameless window chrome with a right-anchored command track, explicit no-drag interactive zones, Core IPC readiness checks and click/double-click isolation for minimize/maximize/close.
- Extend dedicated-window diagnostics so a renderer cannot report ready with collapsed page/body/workbench geometry, dead self-drawn controls or a command bar detached from the right window edge.
- Preserve Plugin API 1.19.0 / SDK 1.28.0 current-contract behavior; no legacy manifest/API/window fallback is restored.

## 3.68.45 WIP — Legacy Root Panel Retirement / Desktop Visual Closure

- Remove the obsolete app-owned `#inspectorPanel`, `#groupPanel`, and `#zoomPanel` shell surfaces that survived after Resonance migrated to PluginWorkspace PRIME surfaces. This eliminates the duplicate unthemed curve-inspector strip under the main plugin.
- Retire the associated shell docking/layout/render state and keep current inspector/group ownership exclusively in Resonance PluginWorkspace / Core PortableView.
- Historical `trendColumns` is consumed only at the Project Compatibility Gateway and mapped to current Resonance `groupColumns`; obsolete historical panel geometry is intentionally dropped instead of reintroduced at runtime.
- Preserve the current **Desktop Visual Closure** ownership boundary and Plugin API 1.19.0; no runtime compatibility layer, shim, alias, or fallback is restored.

## 3.68.44 WIP — Desktop Visual Closure / unified plugin window chrome

- Unified dedicated plugin windows under the Core frameless titlebar and one-row action contract: plugin-specific actions, separator, then Core workspace actions.
- Removed redundant same-name PRIMARY actions and the TER R–V visibility linkage; fixed Vth Data as a single-placement PRIME surface.
- Split status-bar persistent project identity from updating status, and moved plugin version identity into dedicated window chrome.
- Moved Plugin Manager refresh/count into summary cards and restored the page-level right-edge scrollbar.
- Replaced Desktop/Mobile floating resize marks with one Core-owned compact glass-corner handle.
- No legacy Plugin API or runtime compatibility layer was restored.
- Mobile/Expo remains on app version **3.68.44** and Android `versionCode` advances to **75** because the shared floating resize affordance changed on Mobile.

# 3.68.41 WIP

- Migrated all 17 bundled plugins so the runtime manifest passed to `DKDSPlugins.define(...)` exactly matches each current Plugin API 1.19 `plugin.json`, including the required `entry` field.
- Fixed stale bundled plugin version metadata for Connectivity Center, Shell Navigation, and Workspace Safeguards without adding compatibility aliases.
- Strengthened bundled and public SDK validation: runtime manifests are evaluated, unsupported fields are rejected, every required field is enforced, and all current manifest fields must match `plugin.json`.
- Updated SDK templates and the external detector example to the same exact current manifest contract; removed the stale example-only `source` manifest field.
- Strengthened the Core Plugin Contract regression gate so a packaged manifest/runtime manifest drift cannot pass CI again.
- `set-version.js` now keeps Desktop and Mobile source version identities synchronized.

# 3.68.40 WIP

- Repair the second Windows Electron plugin-registry failure exposed by the 3.68.39 diagnostics: the generated catalog contained 17 current built-ins while the live registry had only 4 definitions and the mutable deferred queue was already empty.
- Make the generated first-party catalog the authoritative convergence source. `ensureReady()` / Plugin Manager Refresh now reconcile missing catalog rows even when `deferredBuiltinRows` has already been consumed or cleared.
- Require every built-in script load to leave the expected current definition registered. A successful `<script>` load event without registration is now treated as a real load failure instead of silently dropping the plugin from the registry.
- On Windows source/Electron runs, retry that same current bundled entry through the existing preload source reader when a local script load completes without registration. This is a deterministic current-source retry, not a legacy manifest/package fallback.
- Never emit `plugins:ready` for an incomplete first-party catalog. Startup diagnostics now expose `catalogMissing` and `registeredBuiltinCount`, and Automation rejects the exact 4/17 state directly.
- Preserve Plugin API **1.19.0**, SDK **1.28.0**, Theme Contract **3.10.0**, and the single historical project-file migration boundary; no retired plugin compatibility field, alias, shim, semver bridge, or fallback package contract was restored.
- Desktop Visual Closure remains an explicit acceptance boundary until the repaired 3.68.40 source is rerun on Windows Electron with the user's Theme/GPU environment.

# 3.68.39 WIP

- Repair plugin startup convergence after Windows Electron exposed a four-definition partial registry: deferred current-contract plugins now complete through one idempotent lifecycle path with a macrotask/watchdog fallback instead of relying only on renderer idleness.
- Make Plugin Manager **Refresh** complete the staged Plugin Kernel registry and refresh activity navigation; opening Plugin Manager also opportunistically completes a partial first-paint catalog.
- Prevent overlay upgrades from reusing stale generated renderer artifacts: dev-start now compares generated runtime compositions and the plugin index against the current declared source graph before Electron launches.
- Add generated plugin-index identity (`appVersion`, catalog count, SHA-256 catalog digest) and startup diagnostics so partial/stale catalogs are directly observable.
- Add an Automation startup-convergence gate that completes the current plugin catalog before Import/Algorithm/TOP diagnostics and rejects a generated catalog whose identity does not match the running app, preventing misleading partial-registry green reports.
- Preserve the current Theme Contract and persisted profile restoration; no retired plugin manifest fields, compatibility shims, aliases, or fallback package contracts were reintroduced.
- Desktop Visual Closure history remains an explicit acceptance boundary; Windows Electron must still be rerun after this WIP source fix before visual acceptance is claimed.

# 3.68.38 WIP

- Keep package provenance (`builtin` / `external` / `override`) outside the Plugin Manifest contract; generated built-in manifests no longer receive a host-only `source` field.
- Refresh scanning removes bundled-ID packages from the external plugin directory and removes retired/non-current or non-newer built-in overrides instead of translating or loading them through compatibility paths.
- Preserve fail-closed behavior for genuinely invalid current-contract overrides and third-party packages.
- Update Desktop automation shell/visual probes to the current SUPER + AnalysisWorkbench semantic DOM instead of retired `#mainWorkspace` / `#inspectorDockSlot` assumptions.

# 3.68.37 WIP

- Fix Windows dependency repair/install failures that surfaced as npm `TAR_ENTRY_ERROR` / `EBADF` followed by `ENOSPC: no space left on device` in the shared dependency staging area.
- Separate the ordinary Desktop runtime/development dependency set from the packaging-only toolchain: `electron-builder` is no longer installed into every shared Desktop `node_modules`; Windows distribution packaging invokes the exact current `electron-builder` **26.15.7** on demand.
- Preserve Electron 43.4.x as the only direct Desktop development dependency required for normal launch/test work, reducing shared dependency extraction size and temporary disk pressure.
- Before building a shared dependency cache entry, remove only `.staging-*` directories whose owning installer PID is no longer alive; active concurrent staging directories are left untouched.
- Add a 512 MiB preflight floor for the selected dependency staging volume and inspect the current npm debug log after install failure. `ENOSPC` now becomes an actionable Developer Toolbox cache-space error instead of an opaque cascade of tar write failures.
- Keep shared npm/Electron/electron-builder caches and binary mirror behavior unchanged; this is a current-toolchain storage fix, not a compatibility path.
- Advance app/mobile to **3.68.37**, Android `versionCode` **71**; SDK remains **1.28.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# 3.68.36 WIP

- Complete the post-handoff release-gate pass without changing the application/API version: full `check` 312/312, Mobile 57/57, Performance, SDK, SDK Harness, plugin/package and TER/scientific parity gates pass on the current-contract-only source.
- Remove the final retired TER top-level result alias from the preserved scientific parity fixture. `verify-science-parity.js` now compares canonical `terMaxByVg` / `terMaxByVd` results directly instead of deleting a historical `terMax` field before comparison.
- Extend Current Contract Audit to reject TER compatibility normalization inside scientific parity fixtures/tests. The only remaining code path allowed to understand the historical top-level `result.terMax` shape is the Project Compatibility Gateway.
- Remove legacy/forward-compatibility execution paths from the plugin/runtime/SDK surface. Historical **project-file reading/migration is the only retained compatibility boundary**.
- Remove Plugin API/SDK semver compatibility bridges, manifest compatibility ranges, old workspace facades, deprecated Grid GroupArea flags, plugin entry fallbacks, and obsolete compatibility/status negotiation. Current packages must satisfy Plugin API 1.19.0 and the current manifest contract exactly.
- Advance the public SDK to **1.28.0** and rewrite Theme/SDK authoring guidance as current-contract-only. Theme packages target Theme Contract 3.10.0 directly; there is no Theme range or plugin-side capability negotiation.
- Keep operational safety mechanisms that are not version compatibility (atomic file replacement, failed-install restoration, numerical/data fallbacks) separate from compatibility policy.
- Native Mobile GroupArea/bottom-companion visible resize seam is **1 px** while the structural/touch hit track remains wider. Add theme-aware idle/active glow to Mobile canvas splitters, generic split handles, data-control drawer grip, floating PlotView resize corner, and table column resize handles.
- Add a Current Contract Audit to Architecture Hygiene so retired compatibility surfaces cannot silently return.
- Advance app/mobile to **3.68.36**, Android `versionCode` **70**, SDK **1.28.0**; Plugin API remains **1.19.0** and Theme Contract remains **3.10.0**.

# 3.68.35 WIP

- Formalize **GroupArea** in Core and SDK 1.27.0. First-party Resonance and TER now consume `PluginWorkspace.groupArea(...)`; third-party plugins receive `ctx.ui.groupArea.create(...)` through the `ui.group-area` requirement. The previous `grid({groupArea:true})` path remains deprecated compatibility only.
- Define GroupArea as a domain-neutral related-multi-plot region: outer title chrome is optional, ordinary PlotView placement remains unchanged, and only children whose home belongs to a GroupArea receive current-scroll-region sticky placement.
- Unify Native Mobile `data-control` projection: 参数 and 数据 are the same semantic slot with plugin-provided labels. Data Center's contextual 数据 control now occupies the same fixed utility position used by parameter drawers instead of appearing in plugin navigation.
- Keep the Data Center “数据对象 / 全部用途” header on one compact row in the Mobile drawer, reducing header height without widening the drawer.
- Increase the generic Native Mobile scientific bottom-companion maximum from 46vh to 58vh, matching the existing Core split-controller maximum ratio and allowing the Resonance group panel to expand farther without a Resonance-specific Core branch.
- Preserve the 3.68.34 resize-only performance separation: GroupArea formalization adds no new observer/render loop.
- Advance app/mobile to 3.68.35, Android versionCode 69, SDK 1.27.0; Plugin API remains 1.19.0 and Theme Contract remains 3.10.0.

# 3.68.34 WIP

- Fix the cross-platform performance regression introduced by the recent GroupArea column/layout work. Resonance `layout:resize` no longer invalidates and fully re-renders all group scientific plots.
- Separate GroupArea **data invalidation** from **layout synchronization**: orientation/column changes now reflow Core Grid + resize existing charts without replaying 6–7 `scientificReact(...)` calls.
- Remove `groupGridController.apply()` from normal GroupArea data rendering and make identical `GridController.apply()` calls true no-ops using a settled layout signature, preventing redundant StyleGate writes and chart-resize scheduling.
- Add an executable v3.68.34 regression that verifies repeated identical Grid apply calls produce zero additional writes/resizes and that the Resonance resize hot path cannot call `renderGroup()`.
- Publish **SDK 1.26.0** managed-grid authoring contract without changing Plugin API 1.19.0 or Theme Contract 3.10.0. `ctx.ui.grid.create(...)` and `PluginWorkspace.grid(...)` are now typed public APIs.
- Replace private WIP Grid options (`orientationAdaptive`, `portraitColumnDelta`, `columnPreference`) with the documented generic SDK contract: `orientationPolicy:{mode:'portrait-offset', offset, minColumns}` plus optional `preferredColumns(...)`.
- Add public `GridController.getAppliedColumns()` and `getOrientation()` so first-party plugins no longer read internal fields/methods. Resonance is migrated to these public APIs and remains only an opt-in consumer; TER and other grids are unchanged unless they opt in.
- Add `sdk/GRID_LAYOUT.md`, TypeScript declarations, workspace/AI-authoring guidance, template guidance, and machine-readable SDK authoring-corpus coverage.
- Keep Core as the single owner of final managed-grid geometry; GroupArea semantics remain orthogonal to orientation adaptation.
- Preserve the current **Desktop Visual Closure** behavior and the 3.68.32 Mobile interaction fixes; this release is an SDK/API-surface cleanup rather than a Desktop visual rewrite.
- Advance Desktop/Mobile application identity to **3.68.34** while keeping Android `versionCode` **68** and SDK 1.26 minimum host **3.68.33**.

# 3.68.32 WIP

- Re-audit the five reported Mobile/Desktop issues instead of accepting the first patch at face value.
- Remove the `preserveTemplate` escape hatch from Core GridController. Resonance and TER multi-plot hosts now carry `dkds-managed-grid` from authored markup, Core exclusively owns final grid geometry, and plugins may only provide column preferences / `--dkds-grid-*` configuration tokens.
- Add orientation-aware column preference handling to Core GridController: Mobile portrait defaults to the last actual landscape column count minus one, supports an independent portrait manual override, and restores the landscape preference when rotating back. Resonance itself no longer detects Mobile/orientation.
- Extend authored semantic style ownership auditing so an alias class on a `dkds-managed-grid` host cannot reclaim `grid-template-columns`, `display`, `gap`, alignment or auto-track geometry. A deliberate probe now fails with `core-managed-grid-final-geometry`.
- Keep ScientificCurve floating navigation fully responsive during drag: each drag frame only clamps to the plot bounds, while overlap with plot-local floating chrome/legends is repaired once on release before the position is persisted.
- Correct Mobile bottom companion resize presentation: keep the large touch hit target but paint a 4 px visible guide, with the glow radius controlled separately.
- Correct D3 wheel ownership: scroll zoom is intercepted only inside the actual XY plotting rectangle. Wheel events over title bars, axes/margins or other chart-panel regions are left to the parent GroupArea scroller.
- Rework the Mobile LAN panel without creating another visual owner: the canonical Material popover now owns its radius, panel width is narrower/content-fit, the port field is shorter and centered, empty startup-address copy is removed, and the Key action is an icon-only `↻` button with accessible label “刷新 Key”.
- Keep the earlier GroupArea sticky out-of-flow rail behavior and TER placement parity intact.

# 3.68.28 WIP

Core explicit-save policy and metadata stability; Mobile companion topology and compact LAN composition; generic sticky placement eligibility and grid release. Desktop Visual Closure requires fresh runtime acceptance.

# v3.68.27 — Mobile PRIME Real Lifecycle / Single Material LAN Panel / Orientation Ownership (WIP)

- Fix the real PRIME reopen lifecycle: a closed PRIME is parked in the connected analysis parking host, and reopening now explicitly returns that persistent node to semantic home before PortableView captures geometry. This closes the Data Center chart-preview / TER R-V / Resonance inspector close→cannot-reopen failure at the shared Core owner.
- Reconcile Native PRIME open state from the real PluginWorkspace snapshot on every Mobile shell snapshot, so a missed/coalesced in-panel close event cannot leave the next top-button tap executing another close instead of reopen.
- Make Mobile Presenter release stale projection frames without resurrecting PRIME nodes that PluginWorkspace has already parked; default/legacy inspector and scientific-secondary placement remains Presenter-owned until the user explicitly moves the surface.
- Advance the Mobile PortableView persistence namespace to `mobile.m3` while leaving Desktop storage unchanged, flushing stale Mobile geometry without overwriting Desktop split/placement state.
- Make landscape semantic companion geometry orientation-owned across all Mobile width profiles; portrait remains stacked and landscape can hold a right inspector plus a bottom scientific-secondary surface without width-profile guessing.
- Retire the duplicate React Native Web Service popup and its `expo-blur` dependency. The native status action now opens the single Core `lanWebPanel`, which consumes the same Core `popover` Material role as other status popovers. Android settings/key operations remain available through explicit Native bridge requests.
- Preserve the existing **Desktop Visual Closure** ownership boundary. The lifecycle/orientation corrections are expressed at shared Core/Mobile Presenter owners rather than Desktop visual overrides.

# v3.68.26 — Mobile PRIME Lifecycle / Orientation / Thin Glass Parity · Desktop Visual Closure Preserved (WIP)

- Reconcile native Mobile PRIME open state from the live PluginWorkspace lifecycle so an in-panel close immediately clears native tracking and the next header tap reopens the surface instead of deactivating a stale state.
- Deactivate conflicting real PRIME surfaces, not only native tracking, so closed chart-preview / TER R–V / Resonance inspector frames release their semantic companion space immediately.
- Keep Resonance inspector semantics platform-neutral while Mobile Presenter maps portrait to bottom and landscape to right; make PortableView persist explicit user-placement provenance and let Mobile Presenter reclaim default/legacy inspector placement, flushing historical Mobile placement leakage without any plugin-local platform branch or Desktop reset.
- Drive compact landscape companion geometry from orientation instead of the old `min-width:520px` proxy so high-DPR landscape devices no longer fall into portrait composition.
- Align the Native Web Service Thin Glass popover with the Theme Contract popover material: preserve the 78% fill floor, use the authored role surface/tint, avoid a second dark/light BlurView tint, and reduce blur amplification.
- Preserve Desktop Visual Closure: no Desktop-only visual CSS is changed by this release.
- Advance Desktop/Mobile application identity to **3.68.26** and Android `versionCode` to **64**.

# v3.68.25 — Android Typecheck Closure (WIP)

- Fix React Native `StyleSheet.absoluteFillObject` usage in the Thin Glass Web Service popover; React Native exposes `StyleSheet.absoluteFill`, which is valid for the `BlurView` style prop.
- Advance Desktop/Mobile application identity to 3.68.25 and Android versionCode 63.
- Add a release gate so the invalid StyleSheet API cannot re-enter the mobile source.

# v3.68.24 — Resonance Visibility / Mobile Portable Closure (WIP)

- Repair Resonance hide-all runtime wiring: controls now receive SelectionRuntime.setSelectedSweepId and clear hidden selection synchronously.
- Restore canonical persistent fill for scan visibility presets by removing the transparent quiet variant.
- Rebuild the external Resonance main legend after empty-state recovery.
- Keep Vth legend at the top to return the old right-side legend strip to the plot.
- Move portrait inspector placement policy into Mobile Presenter; explicit user PortableView placements remain honored.
- Web Service Native popover consumes Theme Contract native material tokens and real expo-blur.
- Sticky PortableViews re-resolve their final scrollport after layout and resize again after settling.
- Disable browser/native floating resize corners on Mobile and keep only the integrated DKDS handle.
- Explicit PlotView binding now replaces an earlier auto-hydrated view on the same card, preventing TER placement-state aliasing.

# v3.68.22 — Desktop Visual Closure Regression + Mobile Presenter Repair (WIP)

- Restore immediate Resonance visibility updates and dataset-level dual-direction selection without the heavy full-render path.
- Preserve Desktop left/right/bottom split sizes while transient SUB routes hide the primary canvas.
- Keep Plugin Manager card edges subtle under dark Material recipes and optically realign the Desktop data-list heading.
- Repair Mobile parameter-drawer projection by preventing inherited Desktop PortableView placement from stealing DATA_CONTROL geometry.
- Keep embedded PRIME surfaces inline on Mobile, including TER R–V, and force portrait semantic companions into vertical composition.
- Synchronize Desktop/Mobile/Expo version identity and expose it at the bottom of the native project manager.
- Use top legend placement for the native Vth workbench so unused side-legend space returns to the scientific plot.

# v3.68.21 — Mobile Touch / Panel Geometry Closure (WIP)

- Correct Pulse Sampler Mobile selectors to the actual semantic `route` region so the native-only landscape two-pane layout now applies to the live Tool workspace instead of a nonexistent `main` region.
- Extend Mobile title-held PortableView resizing to sticky and explicitly docked scientific views: side/sticky surfaces resize width, bottom surfaces resize height, while floating views keep the corner-resize gesture.
- Remove conservative dead space inside floating Mobile PlotViews by making both direct plot hosts and nested scientific chart nodes consume the full remaining window content box.
- Tighten native Plugin Manager portrait cards: clamp descriptions to two lines, reduce body/details padding, and keep content-height card rows.
- Tighten the native Web Service status popover anchor so its bottom gap matches the compact status-panel rhythm.
- Add `test-v36821-mobile-touch-panel-closure.js` and update the older Pulse isolation gate to follow the current semantic Mobile region contract.
- Advance application to **3.68.21**, Mobile/Expo to **0.8.48**, Android `versionCode` to **59**. Desktop shared CSS remains unchanged by the new Mobile-only fixes.

# v3.68.20 — Mobile Geometry / Portable Interaction Closure (WIP)

- Unify native Web Service popover bottom anchor with the status-popover gap contract.
- Keep Pulse Sampler measurement extraction visible in landscape with a native-only two-pane layout.
- Replace Mobile floating PlotView resize grip with a rounded triangular depth cue; non-floating views no longer expose the corner grip.
- Make title-held resizing use width for right companions and height for bottom companions on Mobile.
- Make Data Center chart-preview surface buttons perform a real open/close lifecycle.
- Release semantic companion lanes when PortableView takes placement ownership, preventing TER phantom occupancy.
- Pack Plugin Manager cards to content height on portrait Mobile.
- Add Mobile-only overflowing plot-title auto-pan and bounded floating plot fill.

# v3.68.19 — Desktop Visual Closure / Portable Layout Reflow

- Replaced dedicated plugin-window overlay docks with real split tracks for left, right and bottom placements.
- Added host-owned dock resizers and placement reflow synchronization for PortableView.
- Corrected Data Center derived-form alignment and bounded Generic Chart home geometry.
- Rebalanced Pulse Sampler Desktop extraction/result control rows.
- Bounded Mobile Resonance primary/right/bottom companion rows and unified compact multiselect field geometry.
- Refined PortableView resize-handle geometry without moving paint ownership into plugins.

# v3.68.18 — Pulse Sampler Desktop Visual Closure

- Restored Desktop ownership for the Pulse Sampler measurement-extraction command surface.
- The multi-row sampling control region is now a neutral Core Surface instead of a `dkds-toolbar`, so shared toolbar nowrap/flex geometry can no longer collapse Desktop controls into an incoherent mixed row.
- Desktop extraction controls now use deterministic two-row grid geometry; Mobile density remains isolated in `mobile.css`.

# v3.68.17 — SMB Action Density Correction / Desktop Visual Closure

- Correct the v3.68.16 SMB button-density fix after real screenshot validation showed it had no rendered effect. The previous workaround set `--dkds-generic-button-min-height`, but canonical `.dkds-action-button` controls are intentionally excluded from the generic fallback selector, so that token was never consumed.
- Add a Core-owned semantic action-density contract: containers may request `data-dkds-action-density="regular"`, while Core remains the sole writer of the resulting action geometry (`32px` minimum height, canonical padding/line-height).
- Apply the regular density request to the SMB dialog, covering Scan / Up / Favorite / Refresh / List Shares / Cancel / Open-selected-file actions without giving the plugin direct button-geometry ownership.
- Bump Connectivity Center to **1.2.8**, application to **3.68.17**, Mobile to **0.8.44**, Android `versionCode` to **55**.
- Preserve the existing **Desktop Visual Closure** outside this explicit SMB action-density correction; no unrelated Desktop selector is changed.

# v3.68.16 — Mobile PortableView Layout Rebalance / SMB Density (WIP)

- Correct the release identity to **3.68.16** after the previous package was mistakenly zipped from a `DKDS-3.68.15-WIP` root.
- Advance Mobile package to **0.8.43** / Android `versionCode` **54**.
- Continue PortableView placement-state reflow, side-dock fill, bottom-shelf resize semantics, compact Plugin Manager cards, Pulse Sampler control density, SMB button density and Data Center multiselect geometry.

# v3.68.15 — Mobile Portrait Floating-Shelf / Responsive Workspace Closure (WIP)

- Preserve the existing **Desktop Visual Closure** while unifying Theme, Memory, LAN and AI status-triggered panel spacing through the shared `--dkds-status-popover-gap` geometry token.
- Rework compact Mobile semantic companions so PRIMARY, Inspector and secondary scientific surfaces flow in bounded rows instead of overlaying the main scientific canvas.
- Make Mobile scientific bottom placement a fixed viewport shelf with Core resize affordance, automatic chart resize, Presenter-frame release and dynamic trailing scroll reserve equal to the live shelf height.
- Repair Data Center portrait composition: formula/derived tools precede Generic Chart, X/Y/mode/legend controls share one compact adaptive row and visible X/Y controls share equal height.
- Prevent Plugin Manager portrait cards from stretching into empty viewport rows and restore Pulse Sampler multi-row extraction controls to their own Surface geometry rather than Toolbar nowrap geometry.
- Repair TER R–V portable behavior: home cards no longer force full-height grid rows; moved cards give remaining height to the plot; floated/bottom-shelf views release obsolete Mobile projection frames so invisible right-half hit blockers cannot remain.
- Advance Mobile package to **0.8.42** / Android `versionCode` **53**. App is **3.68.15**; Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0** remain unchanged.

# v3.68.14 — Android Gradle Agent-Parity / Runtime No-Fork Preflight Closure (WIP)

- Correct the v3.68.13 diagnosis after the user's second real Windows log proved immutable JVM-argument parity alone was insufficient: Gradle 9.3.1 still selected a single-use daemon and Windows again rejected the nested `java.exe` with `CreateProcess error=5`.
- Align the second independent Gradle in-process compatibility criterion: the wrapper client is not started with Gradle's instrumentation javaagent, while `DaemonParameters` requests that agent by default. The Android build now sets `org.gradle.internal.instrumentation.agent=false` only for the temporary no-daemon build context, so requested and actual agent status match without injecting Gradle-internal agent paths into the toolbox.
- Keep the v3.68.13 immutable JVM-argument parity (`JAVA_OPTS` + exact generated `org.gradle.jvmargs`) and explicit `org.gradle.daemon=false`; the agent fix complements rather than replaces memory/encoding parity.
- Add a real Gradle runtime preflight before expensive APK compilation: `gradlew help --no-daemon --max-workers=1 --info` must complete without either the single-use-daemon announcement or `Starting process 'Gradle build daemon'`. The toolbox prints PASS only after that real process contract succeeds; otherwise it stops before `assembleRelease` and surfaces the relevant daemon diagnostics.
- Remove the previous premature diagnostic wording that claimed the single-use fork was already disabled before Gradle had verified compatibility.
- Add v3.68.14 Android regression coverage and extend the general Windows tooling gate to require JVM parity, instrumentation-agent parity and the runtime no-fork preflight.
- Advance Mobile package to **0.8.41** / Android `versionCode` **52**. App is **3.68.14**; Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0** remain unchanged. Windows Android release compilation and Android real-device visual/touch acceptance remain the final authorities.

# v3.68.13 — Windows Android Gradle Direct No-Daemon Launch Closure (WIP)

- Fix the real Windows Android build failure reported after v3.68.12 source/typecheck/prebuild all passed: Gradle 9.3.1 still announced a **single-use Daemon** under `--no-daemon`, then Windows rejected the nested `java.exe` launch with `CreateProcess error=5`.
- Replace the ineffective retry that cleared proxy options and passed an empty `-Dorg.gradle.jvmargs=`. The user log proved that retry still forked the same disposable Gradle daemon and failed identically.
- Add a deterministic Gradle JVM-parity launcher. The toolbox reads generated `android/gradle.properties`, preserves React Native's requested heap/metaspace values, adds the immutable wrapper client settings (`-Xms64m`, UTF-8), gives the Gradle client that exact `JAVA_OPTS`, and overrides `org.gradle.jvmargs` to the same exact value with `org.gradle.daemon=false`. With client/build JVM requirements aligned, `--no-daemon` can execute in the existing client JVM instead of requiring a Java→Java child process.
- Preserve the configured Gradle proxy/cache environment instead of dropping proxy settings on retry; temporary `JAVA_OPTS` / `GRADLE_OPTS` changes are restored after the build.
- Add v3.68.13 Android tooling regression coverage and update the general Windows tooling gate so the old empty-jvmargs retry cannot return.
- Advance Mobile package to **0.8.40** / Android `versionCode` **51**. App is **3.68.13**; Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0** remain unchanged. Android release compilation on the user's Windows host remains the final acceptance authority.

# v3.68.12 — Mobile Portrait / Thin Glass / Native Touch Density Closure (WIP)

- Make the Mobile **Parameters** projection consume the same canonical `popover` Material role as the Theme picker, so Thin Glass blur/tint/depth matches exactly while other drawers can retain the shallower `sidebar` hierarchy.
- Fix compact portrait right/bottom companion disappearance by clearing inherited Desktop `grid-area` before the Presenter converts those slots into absolute Mobile overlays.
- Replace fragile Native catch-all touch `min-height` rules with inherited semantic density slots. Generic controls still receive the 44 px coarse-pointer target, while canonical integrated/scientific chrome keeps its own geometry owner and cannot be silently inflated. Also remove the generic button's local 30 px variable shadow that previously blocked the Native density token.
- Reduce the complete Native scientific floating chrome silhouette to **23.4 px** with **20.4 px** actions and **22.5 px** item width; the outer group owns explicit height/min-height/max-height, preventing future patches from shrinking only child buttons. Desktop scientific actions remain **28 × 28 px**.
- Restore Mobile top scientific command selection to the same canonical 26 px ToolbarAction appearance used on Desktop and forbid vertical scrolling in integrated command chrome.
- Reflow the four Resonance scan-visibility commands as a compact **2 × 2** grid in the parameter drawer without plugin-owned button paint/padding.
- Add HARD-83 plus v3.68.12 regression coverage for Native touch-density slot ownership, exact outer scientific chrome height, parameter/Theme Material parity, compact companion grid-area release and Mobile/Desktop action-state parity.
- Preserve the v3.68 **Desktop Visual Closure** ownership architecture, Plugin API **1.19.0**, SDK **1.25.0** and Theme Contract **3.10.0**. Android real-device visual/touch acceptance remains required before removing WIP status.

# v3.68.11 — Mobile Runtime Theme / Canvas Track / Compact Scientific Chrome Closure (WIP)

- Correct the v3.68.10 Theme-panel verification failure without exposing Desktop/Mobile identity to plugins. The previous helper test forced `externalStatusBar:true` directly even though the production Plugin API intentionally has no `isNativeClient` presentation flag, so the tested branch was unreachable. Status Monitor now consumes only the generic `--dkds-statusbar-height` geometry contract; Native WebView publishes that value as **0 px** because React Native owns the real status bar outside the WebView, while Desktop retains its in-renderer status-bar height.
- Fix Mobile parameter/side-panel Theme consumption at the actual Material owner. Projection frames consume their canonical Material role/recipe, while reparented live plugin content is marked as parent-owned Material composition and cannot repaint an opaque Desktop surface over the frame. The obsolete native drawer `background / border-color / box-shadow` hard-code is removed; the active Theme recipe now owns those paint properties.
- Fix the cross-plugin Mobile page right-shift that disappeared only after opening Parameters. Inactive `data-control` PRIME nodes can remain physically mounted in a Desktop left slot, so Workbench visibility now ignores `data-dkds-mobile-active="false"` and the left/right/bottom region observers also react to that attribute transition immediately instead of waiting for a child to be reparented.
- Reduce Native scientific floating controls exactly as requested from the previous 25 × 24 px target to **22.5 × 20.4 px** (width −10%, height −15%), with the integrated group inset reduced to **1.5 px** and glyph size reduced proportionally. Desktop stays on its independent 28 × 28 px contract.
- Add v3.68.11 regression coverage for the platform-neutral status-bar geometry contract, native external-statusbar Theme anchoring, single-owner projected Material composition, immediate dock-track resync and exact Mobile floating-control geometry. Historical tests now protect Desktop/Mobile ownership separation rather than freezing the superseded 25 × 24 Mobile size.
- Preserve the v3.68 **Desktop Visual Closure** ownership architecture, Plugin API **1.19.0**, SDK **1.25.0** and Theme Contract **3.10.0**. Android real-device visual/touch acceptance remains required before removing WIP status.

# v3.68.10 — Mobile Placement / Theme Material / Data Preview Closure (WIP)

- Correct native Theme picker anchoring when the React Native status bar lives outside the WebView. Mobile no longer reserves the Desktop in-WebView status-bar height a second time; the fallback sits 4 px above the WebView bottom while Desktop keeps its existing status-bar-relative anchor.
- Make Mobile projection frames consume canonical Material roles immediately. Drawer/right companion frames use `sidebar`, bottom companions use `surface`, sheets use `floating`, and Core re-runs semantic Material assignment after reparenting so parameter/companion content receives the active Theme on its first projected paint.
- Refine the Core Mobile Presenter placement policy: a `scientific-secondary` PRIME that belongs to a `data-primary` workspace remains `workspace-inline` instead of being forced to the bottom companion lane. This keeps Data Center `通用图形预览` integral to its data workspace without introducing plugin identity into Core.
- Replace the historical Mobile `display:contents` dock flattening with one stable canvas topology. Wide/expanded mobile layouts use bounded physical left/right rails and a bounded bottom strip; compact layouts convert left/right/bottom user docks into bounded overlay sheets so the primary plot is never squeezed into a sliver. Local PlotView docks and semantic companion surfaces share the same Core slots.
- Keep canonical plot-title actions inside the 30 px Mobile title strip. Generic coarse-pointer 36/44 px button sizing now excludes the compact header action contract, leaving Structure-owned 24 px action geometry authoritative; the plot header clips transient press paint to its own chrome.
- Bound floating PlotViews to the current Mobile presentation zone. Persisted float geometry is clamped only on native Mobile, and scientific plot content flexes into the remaining PortableView height instead of retaining the global 280/300 px scientific minimum and overflowing the card.
- Rework Data Center Mobile composition through plugin-owned layout tokens with a single final geometry owner. Narrow mobile orders source -> chart preview -> tool/workflow; wider tablet space keeps source full-width and places tool + chart side-by-side. The common chart therefore no longer defaults to the bottom of the data workspace.
- Preserve the v3.68 **Desktop Visual Closure** ownership architecture, Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0**, and v3.68.9 Android native side-effect intent boundary. Android real-device visual/touch acceptance and Windows Electron real-project acceptance remain required before removing WIP status.

# v3.68.9 — Mobile Native Side-Effect Intent / Plugin Manager Ownership (WIP)

- Correct the mobile `插件` command ownership. It now invokes the canonical Core `system.plugins` Plugin Manager directly. The former mixed Plugins Sheet is removed, so current-workspace surfaces/actions (`检查 / 组图 / 物理机制 / 峰间距 / 栅压分析` etc.) remain in their own header/overflow controls and are no longer presented as plugin-management content.
- Close the Android native-side-effect parity gap left by the Desktop-only Electron gates. The Native WebView bridge now uses the shared explicit `NativeUserIntent` controller for clipboard writes, exports and project Save As. Ordinary status-bar taps, chart clicks, selection and drag interactions clear/stay without native authority and therefore cannot open Android `ACTION_CREATE_DOCUMENT` or write the clipboard.
- Add a second fail-closed boundary in the React Native request router. `copyText`, `saveText` and `saveBase64` requests are rejected before `Clipboard.setStringAsync` / native document creation unless the request carries an authorized explicit intent; existing project-document direct writes remain allowed without reopening a picker.
- Preserve declared `nativeSave` / `nativeCopy` semantics through ActionGroup -> Core Presentation Model -> Mobile Host. Native-shell workspace actions mint authority only from that declared effect metadata; bottom status invocation never mints native side-effect authority. The explicit native-shell project Save command mints a one-shot `project` intent before using the shared project persistence path.
- Add v3.68.9 regression coverage for one-shot intent consumption, stale-intent clearing by ordinary plot/status input, double-boundary Android rejection, Presentation metadata preservation and the Plugin Manager-only mobile command contract.
- Preserve the v3.68 **Desktop Visual Closure** ownership architecture, Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0**, and the v3.68.8 responsive preview/FloatingChrome fixes. Android real-device interaction acceptance and Windows Electron real-project acceptance remain required before removing WIP status.

# v3.68.8 — Fluid Compact Controls / Bounded Inline Preview / Symmetric Floating Chrome (WIP)

- Correct the v3.68.7 compact `ParameterSchema` overcorrection. `compact + autoFit` no longer stops at a hard **116 px** maximum; tracks now use `minmax(96px, 1fr)`, preserving the dense 96 px minimum while distributing all spare row width equally. In real Chromium computed-layout verification, a 720 px panel produced four **171 px** tracks and a 540 px panel (75% of that width) produced four **126 px** tracks, both remaining on one row.
- Stop Data Center `通用图形预览` from behaving like an indefinitely growing document plot. The inline/home chart now has one Desktop viewport-aware owner, `height:clamp(180px, 42dvh, 340px)`, and the obsolete wide-layout **340/280 px** duplicate plus `.dkds-size-compact .dc-chart{height:360px}` override are removed. Docked/floating PlotView and native Mobile retain their independent Core/platform geometry owners.
- Correct Resonance main floating-tool geometry at the semantic root. `.respar-main-tools` now explicitly declares canonical `data-dkds-floating-chrome`; Core Structure owns a shared **3 px** symmetric FloatingChrome inset; the plugin no longer owns toolbar padding; and Component Appearance continues to flatten child ToolbarAction border/radius/shadow so one physical outline does not contain a second rounded outline. Real Chromium computed geometry measured **3/3/3/3 px** top/right/bottom/left inset and `0px` child action radius.
- Add v3.68.8 regression coverage for fluid compact tracks, viewport-bounded Data Center inline chart height, removal of competing chart-height owners, FloatingChrome semantic identity, unique Core inset ownership and flattened child actions.
- Preserve Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0**, the v3.68.4 clipboard-intent gate, v3.68.5 docking fixes, v3.68.6 measured topbar allocation and v3.68.7 Field identity correction. Windows Electron real-project visual acceptance and Android real-device acceptance remain required before removing WIP status.

# v3.68.7 — Dense Auto-Fit Controls / Multi-Select Field Identity (WIP)

- Tighten the Core `ParameterSchema` **compact + autoFit** contract from form-sized tracks to **96–116 px** content tracks. Four short chart controls now need only about **482 px of inner row width** (about 500 px including the current Data Center panel padding), so `X 列 / Y 列 / 绘图模式 / 显示图例` stays on one row well below the user's requested 75% desktop width instead of waiting for a nearly full-size Surface.
- Shrink the actual canonical `.dkds-field-control` geometry for compact auto-fit rows to **26 px minimum height**, **2 px vertical padding** and **6 px horizontal padding**. v3.68.6 only changed the fallback `--dkds-schema-field-*` variables, which do not control canonical `.dkds-field-control` elements and therefore left the visible selects much taller than intended.
- Stop the Desktop `.dkds-size-compact` bucket from forcibly collapsing `autoFit` ParameterSchema panels to one column. `autoFit` now responds to the real Surface width; ordinary non-autoFit forms still collapse through the existing compact-size rule.
- Fix the unstyled **Y 列** popup multi-select. Its proxy is intentionally a `button.dkds-field-control`, but Component hydration previously classified every button as `toolbarAction` before the Field pass. Core hydration and semantic inference now explicitly exclude `.dkds-field-control` buttons from Toolbar Action identity, allowing the proxy to receive the canonical **Field** Component Appearance like X 列 and 绘图模式.
- Add v3.68.7 regression coverage for dense track width, canonical field-control height/padding, Surface-width autoFit behavior and field-vs-toolbar semantic identity.
- Preserve Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0**, the v3.68.4 clipboard intent gate and the v3.68.5/v3.68.6 docking/navigation fixes. Windows Electron real-project visual acceptance remains required before removing WIP status.

# v3.68.6 — Measured Topbar Allocation / Core Auto-Fit Parameter Layout (WIP)

- Replace the historical fixed **300/360 px** current-context command lane with measured flex allocation. Primary activity buttons remain content-sized, while current-plugin commands consume genuine spare workspace width before any command is moved into **更多功能**.
- Keep the **更多功能** trigger content-packed directly after the retained commands instead of pushing it to the end of a stretched toolbar. Overflow decisions now use the row's real inner width plus computed button margins/gaps rather than magic width padding.
- Correct the v3.68.5 Data Center chart-form implementation: plugin CSS lives in the earlier `dkds.plugin` cascade layer and therefore could not override the later Core `dkds.structure` ParameterSchema grid. Desktop `autoFit` geometry is now a Core ParameterSchema contract. **Superseded by v3.68.7:** the initial 140–205 px compact tracks were still too wide, and the 28 px fallback variables did not size canonical `.dkds-field-control` elements.
- Add v3.68.6 regression coverage for measured topbar allocation, no fixed context-lane cap, no auto-margin More gap, and Core-owned ParameterSchema auto-fit geometry.
- Preserve the existing **Desktop Visual Closure** ownership architecture, Plugin API **1.19.0**, SDK **1.25.0**, Theme Contract **3.10.0**, and v3.68.4 explicit clipboard-intent gate. Windows Electron real-project visual acceptance remains required before removing WIP status.

# v3.68.5 — Gallery Removal / Compact Navigation / Viewport-Aware Plot Docking (WIP)

- Remove the **Spatial 3D Curve Gallery** first-party experiment completely, including its package/runtime/test registration. DK Data Studio remains one project and no alternate Gallery edition is retained.
- Change the Desktop primary-activity cluster toward content packing to remove the v3.68.3 reserved activity hole. **Superseded by v3.68.6:** the remaining fixed 300/360 px context lane still caused false overflow and visible gaps.
- Attempt to keep Data Center **通用图形预览** X/Y/mode/legend controls on one compact row. **Corrected in v3.68.6:** this plugin-layer rule could not win against the later Core structure-layer ParameterSchema grid, so the intended layout did not actually apply.
- Make Core PlotView assign a canonical plot-content identity to arbitrary plugin plot nodes. Docked and sticky scientific plots now consume the dock/visible viewport rather than retaining home-card aspect-ratio geometry.
- Make PortableView sticky placement measure the nearest vertical scrollport and publish a bounded visible-height contract. TER removes its duplicate plugin-private sticky CSS path and consumes the shared Core behavior.
- Prioritize explicitly docked PlotViews inside left/right/bottom PluginWorkspace docks and flex them into the visible dock viewport. This prevents Resonance group plots from disappearing behind pre-existing dock panels after changing position.
- Preserve Plugin API **1.19.0**, Theme Contract **3.10.0**, Style Ownership Gate boundaries and the existing **Desktop Visual Closure** ownership rules. Windows Electron real-project visual acceptance remains required before removing WIP status.

# v3.68.4 — Dedicated Window / Gallery Data / Explicit Clipboard Intent Closure (WIP)

- Fix the generic dedicated TOP activity opener so the resolved machine window contract remains in function scope; TER and Pulse no longer fail before `openActivityWindow()` when their hydration mode is project-owned rather than live.
- Project semantic Core requirement `data.artifacts` to the dedicated-window `data-model` runtime dependency. Spatial Gallery can now restore the owner Artifact snapshot before adapting canonical curves instead of receiving live rows without `DKDSData.restoreStore`.
- Advance Spatial 3D Curve Gallery to **0.1.8** and require the v3.68.4 host contract.
- Add a fail-closed, short-lived, one-shot Electron clipboard intent gate. Only controls explicitly marked as clipboard owners can authorize OS clipboard mutation; ordinary scientific-plot clicks, range selection and box selection clear or lack authority.
- Propagate explicit clipboard ownership through Core ContextMenu, ActionGroup, component actions, PlotView copy actions, table copy actions, plugin export-menu copy actions and first-party copy controls.
- Preserve Plugin API **1.19.0**, Theme Contract **3.10.0**, and the existing Desktop Visual Closure ownership rules. Windows Electron real-project acceptance remains required before removing WIP status.

# v3.68.3 — Bidirectional Artifact Sync / Stable TOP Navigation / Mobile Plugin Access (WIP)

- Make dedicated TOP Artifact synchronization bidirectional: auxiliary Artifact writes are pushed immediately to the owner project store, then rebroadcast to sibling live windows, while project snapshots remain the persistence path.
- Re-render Desktop Presentation navigation immediately after a TOP workspace contract is registered, closing the Activity-before-TopWorkspace ordering hole that could hide Transfer Vth until an unrelated later plugin rerendered the shell.
- Normalize stale Chromium horizontal scroll in the primary activity bar when all primary workspaces fit, and give context commands a stable bounded lane so closing a dedicated window cannot shift the whole primary navigation row.
- Advance Spatial 3D Curve Gallery to **0.1.7** on the experimental branch and require the v3.68.3 live-data synchronization contract.
- Keep Mobile global order **导入 / 数据 / 工作区 / 分析 / 插件**; the native Plugins sheet now contains a real installed-plugin management entry routed through Core `system.plugins`, while current-workspace overflow remains separate.
- Preserve v3.68.2 Gate fast-path and drag-performance work. Gate remains an active diagnostic rather than a normal runtime profiler.
- Advance application to **3.68.3**. Plugin API remains **1.19.0**, Theme Contract remains **3.10.0**, and Desktop Visual Closure ownership rules remain in force.

# v3.68.2 — Runtime Performance / Dedicated Artifact Hydration / Desktop UX Recovery (WIP)

- Keep Style Ownership Gate as an explicit diagnostic: normal style/paint writes stay on the direct fast path, while full ownership/runtime bypass tracking is acquired only by diagnostics.
- Reduce Theme runtime idle rescans by filtering Material Renderer and Component Appearance class mutations to material/context-significant changes; bound expensive Theme Coverage optical inspection to representative nodes.
- Make docked Group Plot height dragging CSS-only during pointer movement and commit ScientificPlot/D3 relayout once when the gesture ends.
- Restore readable Desktop ScientificPlot floating controls to 28 × 28 px while keeping Mobile geometry independent.
- Rebalance Data Center formula/derived-column workspace so the tool pane is bounded to 360–520 px on wide layouts and internally reflows through container queries.
- Strengthen Thin Glass workspace-modal/elevated optical solidity and advance the built-in Theme to 1.12.3.
- Add a real Mobile Plugins sheet instead of dispatching a dead `plugins` header action.
- Add revisioned `core.project-artifacts` owner snapshots plus dedicated-window reconciliation before mount and on focus, allowing live Spatial Gallery windows to recover the current canonical project Artifact graph without polling or private data copies.
- Preserve Transfer Vth Lab as a primary TOP activity and add Windows computed-geometry diagnostics that fail if the active Vth button is missing from `#primaryActivityBar`.
- Advance application to **3.68.2**. Plugin API remains **1.19.0** and Theme Contract remains **3.10.0**. Desktop Visual Closure ownership rules remain in force.

# v3.68.1 — Gate Hot-Path Recovery / Theme Runtime Version Coherence (WIP)

- Move Style Ownership Gate runtime bypass observation off the normal application hot path. Core ownership claims/conflict detection and build-time raw-style audits remain active, while the document-wide style/paint MutationObserver is acquired only by explicit diagnostics such as Theme Inspector and is released when diagnostics stop.
- Add runtime diagnostics for Gate audit activation/owners so performance reports can prove whether the expensive bypass watcher is active.
- Cache Material Renderer capability probes per active Theme/profile/policy instead of repeating full role/recipe DOM probes for every `renderer.*` capability query.
- Repair Material Renderer installation identity: JavaScript and authored CSS now both declare **3.11.0**. The previous 3.11.0/3.10.0 split made every material recipe report `recipeInstalled=false`, breaking Thin Glass and TOP readiness.
- Update Windows automation to accept compatible newer Component Appearance / Material Renderer revisions instead of hard-locking 3.0.0 / 3.10.0 implementation versions while Theme Contract remains 3.10.0.
- Preserve the v3.67 Desktop Visual Closure contract while restoring Thin Glass runtime material capability and reducing Gate/theme diagnostic overhead.
- Advance application to **3.68.1**. Plugin API remains **1.19.0** and Theme Contract remains **3.10.0**.

# v3.68.0 — Native Analysis SDK Refactor / Single-Owner UI Architecture (WIP)

- Refactor first-party native analysis runtimes toward the current Plugin API/SDK: explicit `ctx.science`, `ctx.data.model`, `ctx.analysis.algorithms`, `ctx.modules`, `ctx.ui.dom`, and `ctx.ui.dialogs` dependencies replace normal-runtime host globals and raw DOM lifecycle ownership.
- Split pure analysis/domain logic from UI controllers where practical, beginning with Transfer Vth and Pulse/TER services, while keeping dedicated `window-runtime.js` files as explicit host-adapter boundaries.
- Establish semantic CSS rendered-property ownership auditing so geometry/paint properties cannot be re-authored through host/theme/context selector variants or shorthand/longhand overlap. Platform layers provide configuration tokens instead of overriding final properties.
- Upgrade Theme Debug ownership diagnostics to report computed property owners, matching authored sources, inline ownership conflicts, and configuration-token provenance rather than hard-coded canonical owner labels.
- Consolidate document-wide DOM mutation observation behind the Core DOM Mutation Hub and add lifecycle regression coverage for a single observer instance.
- Remove obsolete historical gates that forced superseded implementation details back into production code; current gates protect SDK contracts, semantic ownership, lifecycle boundaries, and runtime behavior.
- Preserve the v3.67 Desktop Visual Closure intent while replacing patch-style ownership with traceable single-owner geometry/paint/motion/configuration boundaries.
- Advance application to **3.68.0**. Plugin API remains **1.19.0** while first-party plugins are migrated to the current SDK surface.
- Add an application-level **Native Save Dialog Broker** for Electron. Only one native save dialog may exist across all renderer windows at once; concurrent requests are rejected instead of queued, and runtime diagnostics expose request/source/blocked ownership.
- Harden PlotView export activation so CSV/SVG/PNG export handlers must originate from the currently open canonical export menu item; ordinary plot/card clicks cannot directly invoke export.
- Add source tracing across project, PlotView, ScientificPlot/group-panel, zoom and plugin I/O save paths, plus `test-v3680-native-save-dialog-ownership.js`.
- Correct the initial save-dialog containment fix: Electron native Save As now also requires a one-shot **explicit trusted save intent** issued by preload from a real export/project-save control. Ordinary buttons, plot clicks and other non-save interactions clear the intent, so accidental renderer calls cannot open a system save dialog.
- Make native save ownership complete by blocking Chromium renderer `will-download` on Electron; native desktop exports must use Core I/O. Migrate Pulse Sampler 1.9.10 away from a private `<a download>` path and correct native autosave so only concrete filesystem paths are writable without Save As.
- Keep `desktop/main.js` below the 48 KiB composition boundary by moving the new save-intent/download guard into `desktop/main-modules/native-save-runtime.js`.
- Repair Core workbench import mounting for dedicated plugin windows: a page-local `workbench-import` slot is authoritative, and auxiliary windows never assume the main shell `analysis` toolbar exists.
- Experimental snapshot: upgrade `com.dkds.experimental.spatial-curve-gallery` to **0.1.3**, promote **3D 画廊** to a primary workbench Activity, add an explicit **3D 演示** action, and make focus changes use real continuous X/Z/rotateY/scale/opacity spatial transitions instead of fixed-position data swapping.
- Keep five preview ScientificPlot instances plus one canonical detail ScientificPlot; curve point arrays are materialized lazily and bounded by Core Performance staging rather than pre-copying every compatible curve. Reduced Motion remains a conventional 2D horizontal gallery.
- Spatial Gallery 0.1.3 adds its own page-local Core import slot, fixing dedicated-window startup failure `Toolbar mount not found: analysis` without adding a Gallery-specific Core exception.

# v3.67.54 — Desktop Regression Root-Cause Recovery / Shared Chrome Reunification

- Restore dedicated plugin windows to the Desktop host contract before Core styles load, eliminating host-classification drift between the main shell and TOP/Tool windows.
- Rework shared scientific floating navigation geometry at the Desktop platform layer: vertical hit chrome is reduced by more than 10%, horizontal width is increased by roughly 10%, and edge actions are flush with the group boundary while Mobile touch geometry remains unchanged.
- Replace class-specific titlebar hover styling with semantic `panelHeader` / `inspectorHeader` appearance ownership so Resonance, TER, Vth, group plots and other first-party scientific surfaces consume the same hover contract.
- Restore real Desktop scroll chaining at both owners: stylesheet overscroll containment is removed from document-like vertical regions and PluginWorkspace runtime safety now keeps only horizontal containment while Desktop vertical overscroll is `auto`.
- Quarantine stale managed built-in plugin overrides whose Plugin API no longer matches the host, preserving the file for recovery while falling back to the bundled current plugin instead of emitting a permanent startup warning.
- Merge Pulse Sampler extraction controls into one semantic command surface; repair TER Portable/PlotView header reuse and floating content fill; remove the Vth plot-card scrollbar feedback source; make legacy and Unified analysis viewports edge-to-edge on all four sides, including compact Desktop where an obsolete 8 px responsive grid gap previously created phantom top/bottom whitespace around hidden dock rows.
- Audit and remove plugin-domain selectors from the Core Mobile presenter; domain plugins now annotate generic mobile width/scroll semantics explicitly. Historical tests that required the superseded nested TER toolbar/class whitelist were corrected to guard the current semantic ownership rather than force a regression.
- Desktop Visual Closure remains an ownership boundary, but this patch records user-authorized corrections at their actual shared owners rather than adding Resonance/TER-specific Core paint overrides.
- Advance application to **3.67.54**. Plugin API remains **1.19.0**.

# v3.67.53 — Desktop Plugin Loading / Scientific Chrome / Scroll Chaining

- Harden built-in plugin script loading on Desktop. Normal renderer resource loading still gets three attempts, then Electron can read the same bundled `src/plugins/.../*.js` source through a path-constrained IPC bridge and execute it through the existing canonical inline plugin loader. This directly covers the reported Resonance Workbench `feature-selection-runtime.js` load failure without adding plugin-specific loader logic.
- Make generated built-in plugin indexing fail early when a declared shared or platform JavaScript asset is missing, so incomplete clean ZIPs are rejected before runtime.
- Reduce Desktop scientific floating navigation controls to a compact **16–18 × 13–15 px** viewport-adaptive contract while preserving the independent Mobile **25 × 24 px** touch contract.
- Give compact plot/group titlebar actions a true vertical inset: **24 px** controls centered inside the **28 px** header, leaving 2 px above and below instead of letting hover paint touch the lower edge.
- Unify plot/group titlebar hover corner geometry through one **6 px** canonical radius, eliminating the clipped top-rounded/bottom-square appearance and cross-chart inconsistency.
- Restore natural Desktop vertical scroll chaining for canonical nested workspace/table regions with `overscroll-behavior-y:auto`; when a local scroller reaches its boundary, wheel input can continue into the parent/global scroller under the same pointer. Menus/popovers remain excluded.
- Preserve the frozen **Desktop Visual Closure** ownership by recording these user-authorized deltas in the existing visual-freeze owners; no new plugin-domain visual exception or `!important` override is introduced.
- Advance application to **3.67.53**. SDK remains **1.25.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.52 — Web/Mobile First-Paint + Desktop Visual Closure

- Make built-in Theme providers startup-critical so Web first paint has the selected/default Theme provider available before interactivity.
- Narrow MenuItem semantic classification so ordinary scientific data-list rows do not inherit menu focus/selection borders; preserve borderless row selection.
- Separate Desktop and Mobile scientific floating-toolbar geometry; Desktop is denser while Mobile retains its touch-oriented sizing.
- Unify plot/group/portable titlebar action height, hover surface, border, radius and elevation; constrain plot-header hover paint inside the header.
- Restore Data Center Desktop to its established static composition while SDK 1.25 loads the semantic WorkspaceSurface composition only through the Mobile platform presenter.
- Preserve plot-level placement controls on Mobile while hiding only Desktop Surface-docking controls, and align plot titles/actions through one Mobile header grid.
- Hide unsupported Plugin Manager filesystem-directory actions on Mobile/Web and tighten the native Plugin Manager toolbar layout.
- Make Mobile compact control density a Core platform semantic rather than plugin-owned control chrome.
- Stop Core Drawer geometry from erasing plugin content right inset.
- Stamp PRIME presentation roles synchronously at registration so `data-control` parameter surfaces are hidden before Mobile Presenter projection, preventing TER/Pulse parameter first-paint relocation flashes.
- Keep SDK **1.25.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.51 — Desktop/Mobile Presentation Polish

- Separate Desktop and native Mobile scientific floating-toolbar geometry. Desktop now uses compact CSS-viewport-adaptive controls; Mobile keeps its own compact native contract instead of inheriting Desktop tuning.
- Correct PlotView export-menu ownership so file/export actions no longer masquerade as portable placement controls. Group/plot titlebar actions now share one hover elevation contract while close actions retain only their semantic danger color.
- Remove Chromium native number-field spinner chrome from themed fields and suppress generic selected/focused rims on row-style data selections.
- Restore Theme picker anchoring above the bottom status item rather than overlapping status-bar commands.
- Recompose the native Plugin Manager toolbar into ordered responsive tracks and give its integrated search shell the canonical thin field outline.
- Pulse Sampler Tool 1.9.8: suppress Mobile parameter PRIME before first paint in the main route, then present it only in the semantic Drawer; improve Drawer content insets and containment.
- Advance application to **3.67.51**, Mobile to **0.8.37** / Android `versionCode` **48**. SDK remains **1.25.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.50 — Menu First-Paint / Mobile Interaction Performance Closure

- Reduce Desktop scientific floating navigation chrome from 25 × 24 px to a 22 × 21 px slot while preserving the Mobile native 25 × 24 px touch geometry. This is an explicitly requested **Desktop Visual Closure** delta expressed by the Desktop host-geometry layer; the frozen shared scientific Structure remains unchanged and Mobile re-establishes its 25 × 24 px touch geometry.
- Remove the intermittent bright rectangular rim from focused row-style selections. List rows now keep the semantic selected/focused surface without inheriting the generic focused-item border.
- Eliminate the common menu first-frame theme flash. Core `ContextMenu` and shell `command-menu` surfaces are connected paint-hidden, receive MaterialSurface plus ComponentAppearance synchronously, are positioned, and are only then revealed. The same path is shared by Desktop and Mobile.
- Fix Mobile parameter-drawer resize ownership: the right-edge resize handle is a gesture owner inside the active drawer frame, so outside-tap dismissal no longer closes the panel when resizing begins.
- Recompose the native Data Center artifact browser for compact operation from the actual drawer width. Header/filter/selection commands stay fixed, filters use two columns when space permits, metadata stays one-line, and the artifact list owns the remaining scroll height. Data Center advances to **1.15.8**.
- Reduce visible Mobile re-layout work. `MobileWebSurfacePresenter` uses idempotent inline-style writes, skips stable semantic projections, avoids repeated drawer-fit scheduling, and keeps a first-time auto-fit drawer paint-hidden until its measured width is ready.
- Coalesce native Mobile split drag geometry through a Mobile-only adapter: cache one drag-session container measurement and keep one `requestAnimationFrame` write per frame instead of repeated layout reads per raw pointer event. The frozen shared/Desktop `SplitController` remains unchanged, while expensive scientific/chart resize notifications stay suspended until commit.
- Raise the Mobile bottom scientific companion range from 44% to **58%**, reduce the primary-area reserve from 300 px to **240 px**, and raise native CSS caps to 54–58 vh/% so Group Plot can be expanded substantially farther without allowing it to consume the entire workspace.
- Add v3.67.50 regression coverage for menu first-paint staging, Desktop floating-toolbar density, row focus behavior, drawer resize-vs-dismiss arbitration, dense native Data Center layout, stable Mobile Presenter projection and coalesced split dragging.
- Advance application to **3.67.50**, Mobile to **0.8.36** / Android `versionCode` **47**. SDK stays **1.25.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.49 — SDK 1.25 Platform Presentation Authoring Contract

- Introduce **SDK 1.25.0** while keeping the single **Plugin API 1.19.0** and Theme Contract **3.10.0**. UI-owning plugins now explicitly declare Desktop and Mobile presentation policy as `shared`, `adaptive`, or `custom`; no `ctx.ui.desktop` / `ctx.ui.mobile` business APIs are introduced.
- Add a machine-readable `platformPresentation` manifest contract and standalone validator. SDK 1.25 authoring requires both platform policies for UI-owning plugins, while runtime normalization keeps pre-1.25 Plugin API 1.19 packages loadable as shared/shared for compatibility.
- Add the `dkds.plugin-platform` cascade layer between shared plugin CSS and Core structure/presentation/theme ownership. Platform-only CSS therefore overrides shared plugin geometry without selector escalation or `!important`, while Core remains the final application-chrome authority.
- Make main renderer, dedicated Electron plugin windows, built-in packaging, external `.dkplugin` normalization, generated plugin index, package export and Mobile package loading select only the active platform assets. Shared assets remain loaded once.
- Migrate first-party UI-owning plugins and official SDK templates to explicit Desktop/Mobile presentation policy. Resonance, Data Center, Pulse Analysis and Pulse Sampler move `mobile.css` out of shared `styles` into Mobile-only custom presentation assets.
- Add `sdk/PLATFORM_PRESENTATION.md`, TypeScript manifest types, schema documentation, SDK authoring corpus integration and v3.67.49 regression coverage. `MOBILE_PRESENTATION_ARCHITECTURE.md` now records SDK 1.25 as the formal authoring boundary.
- Preserve the frozen **Desktop Visual Closure** ownership: SDK 1.25 changes how plugin presentation assets are selected and layered, not Desktop component appearance tokens or scientific chrome geometry.
- Advance application to **3.67.49**, Mobile to **0.8.35** / Android `versionCode` **46**.

# v3.67.48 — Mobile Drawer Reflow / Desktop Chrome Recovery

- Fix the remaining Desktop project-tab regression reported from the real Windows host. `project-tab-close` now owns a compact 20 × 20 px hit box, is excluded from the generic 30 px button fallback, and uses a quiet 5 px rounded-square appearance instead of a detached circular disc.
- Strengthen touch-platform isolation: coarse-pointer geometry now belongs only to `data-dkds-host="mobile".react-native-client`. Touch-capable Electron/Web desktop shells therefore retain the accepted 25 × 24 px scientific navigation geometry rather than inheriting 40/44 px touch targets.
- Make projected Mobile drawers single-axis scroll surfaces. Presenter inline geometry now forces horizontal overflow hidden and disables browser resize UI; Core removes the 10 px reserved right gutter, paints the resize hit rail transparently, and explicitly clears scrollbar-corner/resizer paint. This removes the broad white right strip and bottom-right white square/tail.
- Make semantic drawer headers span the complete panel width in the Mobile platform owner and reflow their action area by drawer container width, so themed header paint reaches the right edge instead of stopping before a white strip.
- Add container-driven Resonance parameter composition: detection actions, display checkboxes, label/select rows, dataset Vg controls and transform controls reflow from the actual drawer width rather than preserving the squeezed Desktop rail.
- Add Data Center artifact-drawer container composition so purpose/filter/selection controls reflow naturally while the generic Core drawer header remains the platform geometry owner.
- Add outside-pointer dismissal for an active Mobile parameter drawer. The dismissal consumes the pointer event so controls behind the transient panel are not accidentally activated.
- Advance application to **3.67.48**, Mobile to **0.8.34** / Android `versionCode` **45**, Resonance Workbench to **3.61.18**, and Data Center to **1.15.7**. SDK remains **1.24.0** / Plugin API **1.19.0** during this acceptance patch; the proposed SDK 1.25 platform-presentation authoring contract remains the next architectural phase after real-device acceptance.

# v3.67.47 — Real-Device Mobile Layout Correction / Desktop Touch Isolation

- Correct the Desktop regression reported on a touch-capable Windows host: coarse-pointer accessibility geometry is now excluded from `data-dkds-host="desktop"`, so project tabs, close controls, toolbar actions and scientific floating buttons keep the frozen Desktop density even when Windows reports `(pointer: coarse)`. The **Desktop Visual Closure** appearance contract is preserved; this change only removes an unintended platform-style leak.
- Correct Resonance gate-analysis Mobile packing on the actual `respar-derived` route. The previous Mobile selector lost to the plugin's ID-scoped Desktop `<=1050px` rule inside the same cascade layer; the Mobile route selector now carries matching owner specificity and restores width-driven multi-column `auto-fit` composition.
- Replace the erroneous fixed 320 px Plugin Manager tracks introduced by v3.67.46 with a readable 320 px minimum plus flexible `1fr` tracks. Available row width is consumed instead of leaving a large blank region, while action groups remain no-wrap.
- Repair the older v3.67.42/v3.67.44/v3.67.46 regression assertions that encoded the fixed-width Plugin Manager mistake, and add a v3.67.47 guard for Desktop coarse-pointer isolation, real Resonance route specificity and full-row card packing.
- Advance application to **3.67.47**, Mobile to **0.8.33** / Android `versionCode` **44**, and Resonance Workbench to **3.61.17**. SDK remains **1.24.0** / Plugin API **1.19.0** in this acceptance correction; a declarative platform-presentation SDK extension is evaluated separately so the runtime API is not forked into `ctx.ui.desktop` / `ctx.ui.mobile`.

# v3.67.46 — Mobile Layout Closure / Compact Surface Recovery

- Replace the Mobile parameter drawer's monotonic/greedy content-width growth with a compact critical-control solver. Legacy oversized width persistence is isolated behind a new `v2` key, automatic fitting is capped at the compact ceiling, and manual resizing can still expand farther when the user asks for it.
- Move the parameter resize grip onto the visible right edge, restore a restrained 10 px drawer radius, and make dragging reliable through window-scoped PointerEvent handling plus the existing native TouchEvent fallback.
- Fix Resonance Mobile gate-analysis pages that were still being forced to one column by the historical Desktop `max-width:1050px` rule. Mobile route-owned CSS now auto-fits scientific cards from actual available width and uses shorter chart heights.
- Rework Plugin Manager Mobile packing to stable 320 px `auto-fill` tracks and keep metadata/actions non-breaking, preventing the compact layout from stretching cards or collapsing Chinese action labels vertically.
- Bound Mobile bottom companion resizing to 44% / 44vh and give the shared split specification a 0.44 Mobile ratio plus a 300 px primary-area reserve, so dragging cannot cover the upper work area.
- Add generic `ParameterSchema` `autoFit` support for small native forms. Data Center chart parameters opt into 150–220 px tracks and its Mobile chart preview uses a compact 200–280 px height.
- Preserve the frozen **Desktop Visual Closure** boundary: the shared `SplitController`, Resonance Desktop stylesheet, Data Center Desktop stylesheet, and other hash-frozen Desktop owners remain untouched; Mobile behavior is expressed through unfrozen Presenter/platform/plugin-mobile owners.
- Add v3.67.46 executable regression coverage including an actual simulated parameter-handle pointer drag. Application **3.67.46**, Mobile **0.8.32**, Android `versionCode` **43**, Data Center plugin **1.15.6**.

# v3.67.45 — Mobile Acceptance Closure / Desktop Perimeter Recovery

- Removed the obsolete SUPER workspace body perimeter padding explicitly authorized by the user; Desktop Visual Closure firewall remains active and this is recorded as an authorized structural delta rather than a Mobile side effect.
- Added one Core native TouchEvent drag adapter used by both scientific navigation implementations, while Desktop retains PointerEvent/coalesced-event dragging.
- Made Mobile parameter drawers square, content-fit, explicitly handle-resizable only, and thinner-scrollbar; drawer width is clamped to the measured parameter content minimum.
- Tightened the Mobile range-selection popover and removed full-sheet empty height.
- Added Presenter-marker-only Mobile density for Resonance derived grids and Pulse result grids; shared plugin views remain platform-neutral.
- Reconciled direct PRIMARY/SUB workspace navigation with the Mobile Host route stack so returning to PRIMARY cannot be re-hidden by stale SUB state.
- Tighten Mobile auto-fit density to a 240 px card/chart floor for Plugin Manager, Resonance derived charts and Pulse result charts so medium-width native viewports can actually use multiple columns.
- Enforce repository handoff hygiene: a clean development tree must contain exactly one current root `HANDOFF_*.md`; historical handoffs are removed from delivery ZIPs.
- Mobile version 0.8.31 / Android versionCode 42.

# v3.67.44 — Mobile Density / Parameter Surface Contract

- Fix Native Pulse Analysis result composition so Mobile uses normal-flow responsive cards instead of inheriting the Desktop fixed split height; available width can produce two or more result cards without overlap.
- Tighten Native Pulse Designer parameter geometry and keep tables/actions contained inside the projected parameter drawer.
- Make Plugin Manager section cards use Mobile `auto-fit` columns rather than the shared narrow-screen one-column fallback.
- Keep the parameter drawer resize grip fixed outside its scroll content, use a thin scrollbar, and separate platform geometry from Core Material paint.
- Reduce the Native range/box-selection command sheet footprint and remove its unnecessary full-height blank region.
- Restore full-range Native scientific-toolbar dragging by tracking active pointer movement at window scope while retaining the Desktop coalesced-event path.
- Reuse the existing platform-neutral Plugin API 1.19 `presentationPurpose: 'parameters'` semantic; no `ctx.ui.mobile`/`ctx.ui.desktop` API fork is introduced.
- Preserve the v3.67.40 **Desktop Visual Closure** freeze. The only Desktop visual delta in this patch is the explicitly authorized semantic elevation of parameter PRIME surfaces; all other Desktop owners remain hash-frozen.
- Advance application to **3.67.44**, Mobile to **0.8.30** / Android `versionCode` **41**.

# v3.67.43 — Desktop Isolation Recovery / Platform Firewall

- Recover the Desktop Visual Closure boundary after the v3.67.41–v3.67.42 Mobile projection work exposed a cross-platform mutation hole. The issue is fixed at ownership boundaries; no Desktop CSS compensation, spacer removal patch or negative-margin workaround is introduced.
- Decide host identity before authored CSS loads and expose it as immutable `window.__DKDS_HOST_KIND__` plus `html[data-dkds-host]`. `DKDSPlatformBoundary` treats the immutable identity as authoritative; `.react-native-client` alone can no longer promote an Electron document into Mobile behavior.
- Instantiate Desktop and Mobile Presentation shells mutually exclusively. `MobileWebSurfacePresenter` also owns a second internal guard and returns `desktop-inert` before any Desktop DOM lookup, wrapping, reparenting or geometry normalization.
- Keep `mobile.css` inactive on Desktop through `media="not all"`; Mobile enables it only from the immutable host identity. Native Core selectors additionally require both `data-dkds-host="mobile"` and `.react-native-client`.
- Separate Pulse native density rules into plugin-owned `mobile.css`; restore its shared `plugin.css` byte-for-byte to the accepted v3.67.40 Desktop baseline.
- Add an executable **Desktop Visual Closure freeze**: 57 Desktop/shared visual and geometry owners are SHA-256 pinned to the accepted v3.67.40 source. A routine Mobile patch that changes one now fails the release gate rather than silently changing the Desktop UI.
- Add the Platform Isolation Firewall architecture contract. Shared Core remains single and host-neutral; platform geometry, interaction and persistence stay outside Core. Future hardening should split generated Desktop/Mobile platform entry bundles and migrate remaining raw native-marker reads behind the shared boundary, but only under a dedicated Desktop-parity refactor.
- Advance application to **3.67.43**, Mobile to **0.8.29** / Android `versionCode` **40**.

# v3.67.42 — Mobile Interaction Density / Drawer Ownership

- Fix native parameter drawer pointer ownership: the Mobile projection frame now receives touch input, blocks the underlying scientific canvas while open, and gives the projected parameter content its own scroll container.
- Add a fixed right-edge parameter drawer resize handle with persisted native width; the handle never scrolls with parameter content.
- Tighten Mobile-only parameter controls and preserve Desktop control metrics.
- Recover dense Pulse Analysis result composition on native wide/landscape viewports; multiple result plots can share a row when they fit.
- Make Plugin Manager use responsive auto-fit cards on the native client instead of wasting wide-screen space.
- Harden both D3 scientific toolbar drag paths against Android WebView origin-jump pointer samples while leaving Desktop drag logic unchanged.
- Reduce scientific marker visual size to 78% on the native client while retaining larger invisible hit targets.
- Make native transient status messages expire after 5.2 s and hide the Resonance main-summary contribution outside its activity.
- Replace mixed-font status icons with a single thin-stroke native icon family for History/Theme/Memory/DevTool/SMB/AI/Web; AI and Web icon color follows semantic runtime state.
- Advance application to **3.67.42**, Mobile to **0.8.28** / Android `versionCode` **39**.

# v3.67.41 — Mobile Projection Stability / Parameter Surface Isolation

- Fix the Android scientific floating toolbar jumping to the plot's top-left on the first drag frame. Native-client drag now follows raw PointerEvent coordinates with a drag-start delta; the existing Desktop coalesced-event path is preserved unchanged.
- Replace direct Mobile PRIME geometry ownership with a Mobile projection frame. The frame owns drawer/companion/sheet geometry while the live plugin DOM remains the content source; any Desktop PortableView inline geometry is neutralized only while projected and restored exactly when the surface closes. This prevents plugin selector specificity from expanding the native **参数** drawer to the full viewport.
- Tighten the native **参数** command to consume only plugin-declared `presentationPurpose: parameters`. The Mobile shell no longer guesses parameter UI from a Chinese/English label regex, so it opens the plugin's declared parameter surface instead of an accidentally named control panel.
- Remove the compact-profile topology jump at the normal phone portrait/landscape boundary. Main plot + curve inspector + scientific bottom companion keep the same center/right/bottom relationship across ordinary rotation; only an explicit ultra-narrow `<=479px` safety floor stacks the composition.
- Keep SUB routes inside PluginWorkspace's existing route host instead of adding a second fixed viewport layer. This removes a generic source of plugin-panel overlap.
- Remove synthetic `window.resize` dispatches after Mobile navigation and surface activation. Real orientation/viewport resize events still republish Presenter state, but command transitions no longer force a redundant second whole-page layout cycle.
- Make `MobileWebSurfacePresenter.apply()` mutation-stable: it no longer deletes and recreates all Mobile semantic data attributes on every status/history/resize publication; unchanged live projections retain the same DOM shell.
- All presentation CSS in this patch remains rooted at `html.react-native-client`; Desktop Presenter, Desktop docking state and Desktop visual selectors are not changed. **Desktop Visual Closure** remains frozen.
- Advance application to **3.67.41**, Mobile to **0.8.27** / Android `versionCode` **38**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.40 — Resonance Scan-Mode Selected Fill Recovery

- Correct the Desktop regression introduced by the v3.67.36 Mobile closure: **全部扫描 / 仅正扫 / 仅反扫 / 全不选** are mode selectors, not momentary commands. The current global scan mode once again receives the canonical selected fill.
- Preserve the original intent of the earlier persistent-fill report: non-current modes must never keep stale fill. Every render clears legacy `active`, then applies `selected` and `aria-pressed=true` to exactly the mode represented by the current per-dataset visibility state. Mixed per-dataset visibility selects none of the four global presets.
- Keep the fix in the shared Resonance state semantics rather than adding Desktop-only CSS. Core Component Appearance already owns the selected fill for `toolbarAction`; no new plugin-specific paint or `!important` override is introduced.
- Replace the v3.67.36 historical regression assertions that incorrectly required a nonvisual `aria-current`-only state, and add an executable v3.67.40 state test covering all four modes plus mixed visibility.
- Advance application to **3.67.40** and Resonance Workbench to **3.61.16**. Mobile remains **0.8.26** / Android `versionCode` **37** because this patch does not alter the native shell. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.39 — Mobile Global Command Order Contract

- Correct the Mobile first-level text-command order to the explicit accepted sequence: **导入 / 数据 / 工作区 / 分析 / 插件**.
- Move **插件** into the same global command group instead of keeping a separate Plugin utility button beside Undo / Redo / 参数. The right-side utility group now contains only current-workspace tools such as history and the canonical 参数 entry.
- Remove the now-dead dedicated Plugin utility styles and update the active Android README so future work does not reintroduce the retired icon navigation or the incorrect order.
- Add a v3.67.39 regression gate that checks the exact five-command order, exact group membership, Plugin dispatch, and absence of a duplicate right-side Plugin button.
- Advance application to **3.67.39**, Mobile to **0.8.26** / Android `versionCode` **37**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. The v3.67.38 TER/portrait/parameter-drawer/flicker repairs remain unchanged.

# v3.67.38 — Mobile Acceptance Recovery / TER Scalar-Field Repair

- Restore the user-accepted Mobile header direction instead of continuing the v3.67.36 icon experiment: **导入 / 数据 / 分析 / 工作区** are compact theme-colored text controls, the custom black system glyph family is removed, and **插件** is a text command at the far right after Undo / Redo / 参数.
- Make the project **＋** a truly naked hit target. The visible rounded surface/rim is removed rather than merely setting `borderWidth: 0` while retaining a filled tile.
- Repair the TER transformed heatmap pipeline. A canonical transport `data.table` may contain both forward and reverse sweeps; Scientific Transform Runtime now expands the table through `transportDatasetsFromArtifacts -> DKDSScience.buildSweeps` before directional scalar-field algorithms run. This removes the all-missing `17 × 200 / 缺失 3400` failure while preserving source-file identity.
- Keep Resonance scientific PRIME surfaces as companions at every responsive width. Portrait now reflows **主图 / 曲线检查器 / 组图** vertically when those companions are open; a PRIME group panel no longer becomes a full-screen route that hides the main plot. The Mobile Host also seeds already-mounted non-parameter PRIME state once, so a persisted/open inspector is not silently lost when entering or rotating the native presentation.
- Reduce the parameter drawer to an approximately one-third viewport contract for wide/expanded windows (`33.333vw` with practical min/max bounds). Compact phones retain a usable bounded drawer rather than a full-page control surface.
- Remove the parameter/main reparent race. `MobileWebSurfacePresenter.apply()` no longer restores every projected PRIME to its Desktop parent on every status/resize/history publication; it performs idempotent live projection and restores only surfaces that are no longer desired. The drawer entrance animation is removed so state churn cannot replay a visual transition.
- Update superseded historical Mobile regression gates so they protect the accepted text-command and persistent-companion behavior rather than forcing the rejected icon-only / compact-route implementation back into the product.
- Advance application to **3.67.38**, Mobile to **0.8.25** / Android `versionCode` **36**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. **Desktop Visual Closure** remains unchanged; these changes stay in Mobile Presenter/platform ownership plus the platform-neutral scientific transform runtime.

# v3.67.37 — Parameter Surface Contract Recovery

- Fix the v3.67.36 built-in plugin load regression `Unknown PortableView semanticKind: parameters`. v3.67.36 incorrectly reused `semanticKind` for Mobile parameter-button promotion even though Plugin API 1.19 deliberately bounds Portable/Material semantic kinds to `panel | inspector`.
- Restore every first-party parameter PRIME to `semanticKind: 'panel'`. PortableView and Theme Material ownership therefore remain unchanged and bounded.
- Add an orthogonal platform-neutral `presentationPurpose: 'parameters'` contract. `presentationRole` still describes cross-platform layout importance, `semanticKind` still describes Portable/Material identity, and `presentationPurpose` describes functional meaning.
- Carry `presentationPurpose` through PluginWorkspace navigation metadata, Core host registry, PresentationModel and the React Native shell. The native fixed **参数** action consumes this purpose; Data Center's ordinary `data-control` rail is not promoted.
- Keep the existing label-based parameter detection only as a compatibility fallback for older plugins. First-party plugins no longer depend on Chinese/English label inference.
- Add v3.67.37 regression coverage that forbids `semanticKind: 'parameters'`, requires canonical purpose propagation, and keeps PortableView semantic kinds bounded to `panel` / `inspector`.
- Advance application to **3.67.37**, Mobile to **0.8.24** / Android `versionCode` **35**, Resonance Workbench to **3.61.15**, TER Analysis to **3.12.7**, Pulse / Read Analysis to **2.10.13**, Pulse Sampler to **1.9.6**, and Transfer Curve Vth Lab to **3.0.8**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.36 — Mobile Semantic Surface / UI Closure

- Desktop Visual Closure remains frozen: Mobile layout fixes stay in Presenter/platform semantics and plugin container layout rather than Desktop style overrides.
- Mobile Header system commands are icon-only and ordered Import → Data Management → Analysis → Workspace; project Add is borderless with an explicit separator after project controls.
- Plugin Management moves out of Theme UI into top native Settings; Theme panel returns to theme-only ownership.
- One canonical `data-control` surface now generates one Parameters button; duplicate plugin actions/surfaces are deduplicated and SUB routes expose a generic Main Plot return command.
- MobileWebSurfacePresenter transiently projects active PRIME surfaces into semantic right/bottom/overlay canvas slots without persisting Desktop PortableView placement.
- Native workspace platform CSS no longer imposes flex/grid display modes on plugin content; Resonance derived pages retain domain-owned layout and Parameter drawers use a substantially smaller responsive width.
- Resonance scan visibility presets are momentary commands rather than persistent selected/fill controls on both Desktop and Mobile.
- Native History and overflow controls use geometric glyphs rather than text-symbol icons.

# v3.67.35 — Android TypeScript Font Weight Recovery

- Fix the Android `tsc --noEmit` failure in `mobile/src/styles/shell-styles.ts`: React Native accepts discrete font weights, so the unsupported `fontWeight: '650'` on the Mobile History sheet action is replaced with the valid semibold `'600'`. This is a Mobile shell type/compatibility correction only and does not alter Desktop styling or Plugin Presenter ownership.
- Advance application to **3.67.35**, Mobile to **0.8.22** / Android `versionCode` **33**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. **Desktop Visual Closure** and the platform-neutral Presenter boundary remain unchanged.

# v3.67.34 — Semantic SUPER Surface Parity / Dense TOP Composition

- Continue the all-TOP-as-SUPER cleanup by moving **Pulse / Read Analysis** file/settings controls out of its scientific PRIMARY and into a semantic `data-control` PRIME. The same plugin now receives a Presenter-owned left rail on Desktop/SUPER and a drawer/sheet mapping on constrained Presenters without any Desktop/Mobile branch.
- Move the **Data Center** data-object browser/filter rail into the same semantic `data-control` PRIME contract. Remove its plugin-owned desktop splitter from PRIMARY; Presenter geometry now owns that rail just as it does for TER, Vth and Resonance.
- Make Data Center PRIMARY denser when space allows: source preview remains full-width while the active Formula/Workflow/Provenance tool and inline Chart Preview share the available primary surface at wide container sizes. If Chart Preview is moved to another PRIME placement, the main content automatically returns to one column.
- Compact Pulse scientific/result geometry while preserving the existing result-height splitter. Pulse control fields now respond to their **control Surface width**, not the global page width, so a 390 px data-control rail and a wide bottom/global placement use the same plugin implementation.
- Restore the explicit user rule that scientific cards must never overlap: TER layout choices are now preferred maximum column counts and Core `GridController` automatically reduces the effective count when the actual Surface cannot preserve the minimum card width, then restores the requested count as space returns.
- No new platform-specific plugin path is introduced. Resonance remains ordinary; Pulse, Data Center, TER, Vth and Pulse Sampler all express domain surfaces through the same Plugin API 1.19 Presentation roles. **Desktop Visual Closure** remains a hard ownership boundary.
- Advance application to **3.67.34**, Data Center to **1.15.5**, TER Analysis to **3.12.5**, and Pulse / Read Analysis to **2.10.11**. Mobile remains **0.8.21** / Android `versionCode` **32**; SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.33 — Deterministic SUPER Failure State / Container-Driven TOP Density

- Make SUPER startup identity deterministic. If the saved or manifest-selected SUPER fails to load or cannot complete its TOP contract, DK Data Studio now keeps that SUPER preference and shows the neutral **尚未指定 / 当前主界面不可用** page. It never promotes another healthy TOP as a temporary session SUPER. Users may explicitly choose a different SUPER from Plugin Management.
- Remove the former `ensureFallbackSuperReady()` / deferred healthy-TOP substitution path. First-run manifest `defaultSuper` remains the explicit default identity and is retried on later launches even when one startup attempt fails.
- Keep manual SUPER promotion transactional: if the user explicitly switches from a working SUPER to another TOP and that activation fails, the already-running previous SUPER is restored; this is rollback of a user action, not automatic startup substitution.
- Continue the all-TOP-as-SUPER density cleanup without creating plugin/platform branches. Pulse Analysis, TER, Vth Lab and Data Center now make their responsive domain-layout decisions from the width of the PluginWorkspace surface/container they actually receive, rather than the global Desktop window width. This preserves **Desktop Visual Closure** while allowing the same plugin composition to fit dedicated TOP windows, SUPER embedding and constrained Presenter surfaces.
- Remove viewport-width coupling from TER heatmap cards and use container-relative chart geometry so a scientific card cannot size itself against `100vw` when the host has already allocated other semantic surfaces.
- Advance application to **3.67.33**. Data Center advances to **1.15.4**, TER Analysis to **3.12.4**, Pulse / Read Analysis to **2.10.10**, and Transfer Curve Vth Lab to **3.0.6**. Mobile remains **0.8.21** / Android `versionCode` **32**; SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.32 — SUPER Host Neutralization / Fault Fallback / Plugin Script Recovery

- The legacy Core main/inspector/group shell is now compatibility-only and hidden by default. A failed TOP/SUPER can no longer fall through into a half-loaded domain-shaped desktop shell.
- A broken preferred SUPER now selects a healthy TOP explicitly for the current session without rewriting the saved SUPER preference.
- Built-in plugin script loading resolves against `document.baseURI` and retries the failed resource with cache-busting backoff, while never replaying scripts that already loaded successfully.
- SUPER embedding now applies generic host-role chrome rules to every TOP plugin: window-only close/import controls are suppressed in the embedded root and the native PluginWorkspace receives a dense container context. This is host-role composition, not Desktop/Mobile or plugin-specific branching.

# v3.67.31 — Desktop Overflow Ownership / Mobile History / Pulse Layout Recovery

- Restore the established Desktop **脉冲与采样处理** composition without reintroducing a Desktop/Mobile plugin branch. The plugin once again defaults to the original two-column Designer + merged-waveform layout, while named container queries adapt the same content when its actual Surface becomes narrow.
- Make Desktop context-command overflow single-pass and stable: presentation surfaces are removed from both their visible toolbar and overflow parking host before re-render, the renderer emits a local toolbar-change event instead of a global resize, and the overflow popup is preserved across ResizeObserver passes when membership is unchanged. This removes the visible open flash and the repeated **栅压分析** entries.
- Let the context toolbar shrink before its **更多功能** affordance. All plugin commands may fold into overflow when necessary; Core no longer forces one oversized command to remain visible and cover the More button at narrow widths. Secondary activity overflow reparenting is owned only by the `shell-navigation` recipe rather than both Kernel and recipe code.
- Change the Theme popover **设置** control to the same canonical square gear icon button used by AI Agent, while keeping Plugin Management behind that control.
- Remove the requested descriptive subtitle rows from **数据中心** and **脉冲 / 读取电流分析**.
- Add **历史** to the Mobile desktop-style bottom status bar. It opens the unified project/workspace operation history and routes Undo/Redo through the same system-history coordinator used on Desktop. The existing canonical status retention order remains **AI > SMB > 网页服务 > 主题 > 内存 > DevTool**; History is an additional functional item and does not invert that relative ordering.
- Delete the already-retired `SurfaceNavigation.tsx` bottom/rail navigation implementation and its unused style keys. This fixes the Android TypeScript failure caused by stale `more` navigation source instead of merely keeping dead code compiling.
- Advance application to **3.67.31**, Mobile to **0.8.21** / Android `versionCode` **32**, Status Monitor to **1.3.1**, Data Center to **1.15.3**, Pulse Analysis to **2.10.9**, and Pulse Sampler to **1.9.4**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. Desktop Visual Closure and the platform-neutral Presenter boundary remain in force.

# v3.67.30 — Developer Toolbox Console Persistence

- Fixed the Developer Toolbox **Start desktop development** action flashing and disappearing when dependency preparation or Electron startup fails.
- The GUI now launches toolbox actions with a GUI-only `-KeepConsoleOpen` mode. CLI/CI actions still return non-zero exit codes on failure, while GUI-launched failures keep the PowerShell window open so the actual error remains readable.
- Preserved Windows PowerShell 5.1 compatibility and the existing automatic dependency/Electron bootstrap path.
- Retains the v3.67.29 platform-neutral plugin boundary and fault-isolated Theme startup architecture; this patch does not change Desktop/Mobile presentation ownership.

# v3.67.29 — Platform-Neutral Plugin Boundary / Fault-Isolated Theme Startup

- Replace the temporary Resonance `resonance-native-client` isolation with an architectural boundary: supported plugin APIs and plugin callbacks no longer receive Desktop/Mobile presentation identity. A dedicated Core `pluginHostView()` exposes only platform-neutral host services while the raw host remains private to Plugin Kernel.
- Remove first-party `ctx.runtime.isNativeClient` / `ctx.platform` branches from Resonance, Pulse Sampler, Data Center and Status Monitor. Plugins publish one semantic Presentation contract; Presenters decide drawer/sheet/route/Desktop composition, while plugin content responds only to the Surface width it actually receives.
- Add generic `embedded` Presentation semantics so Pulse parameters can remain embedded in the established Desktop page while the same `data-control` Surface becomes the Mobile parameter drawer. Embedded surfaces are not duplicated in Desktop command chrome.
- Make Resonance's main summary a `presentationOnly` status contribution: it is available to Mobile/other Presenters without painting a duplicate item into the Desktop status DOM.
- Decouple built-in startup failures. Startup-critical scripts are dependency-aware and phase ordered with the persisted Theme provider ahead of the selected SUPER; one broken built-in entry is recorded and skipped instead of aborting the remaining Theme/Core startup chain.
- The SUPER is not hard-coded to Resonance. Core continues to resolve the saved/default SUPER from manifests; if that preferred TOP fails transiently, a secondary TOP can be loaded as a temporary fallback without overwriting the user's saved SUPER preference.
- Extend the Theme boot snapshot from CSS variables to resolved material, component appearance, effects, scientific settings and material recipe/context policy. While the selected Theme plugin is pending, Material Renderer and Component Appearance consume this cached resolved profile, preventing the half-default/half-custom first frame and keeping the UI coherent even if an unrelated SUPER fails to load.
- Keep Desktop Resonance's recovered two-column command geometry and theme-independent scientific focus behavior from v3.67.28. No Mobile domain selector is added to Core CSS.
- Advance React Native package to **0.8.20** and Android `versionCode` to **31**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.28 — Desktop Visual Closure Regression Recovery / Mobile Style Isolation

- Restored Resonance Desktop scan-mode and detector command geometry that was unintentionally flattened during v3.67.26 Mobile responsive composition.
- Removed the Mobile-added `dkds-action-row` wrappers from the Desktop scan/detector groups so their established two-column layout no longer gains an extra ToolbarGroup surface/fill.
- Preserved Mobile responsive packing through a plugin-owned `resonance-native-client` marker; no Core shell selector and no Desktop cascade override is used.
- Restored the Desktop inspector action grid geometry while retaining canonical Core button appearance ownership.
- Fixed the orange scientific-plot frame in Default light mode: the plot intentionally claims keyboard focus after curve/peak selection, but focus-outline suppression had accidentally been scoped to dark mode for plain `:focus`. Focus ownership remains; the browser frame is now suppressed in every theme.
- Added v3.67.28 regression coverage for Desktop/Mobile style isolation and light-theme scientific focus.

# v3.67.27 — Mobile Command Density / Overflow and Android UI Recovery

- Correct the Android shell composition from real-device feedback while preserving the frozen Desktop/Core ownership and **Desktop Visual Closure** history.
- Remove the redundant native global icon navigation row; move Workspaces / Analysis / Import / Data into the top labeled command region after the project tab, separated from plugin-owned commands by a divider.
- Generate a persistent top **参数** button from each active plugin `data-control` surface, immediately to the right of undo/redo. Parameter content stays hidden until requested and is projected as a left drawer; Pulse Designer parameter fields use responsive `auto-fit` columns rather than a fixed two-column form.
- Replace fixed plugin button-count heuristics with measured-width packing. Only plugin-owned top commands may enter the top `•••` overflow sheet; global commands and history/parameter controls are never moved into that sheet.
- Preserve the desktop-style bottom status bar and implement strict preservation priority **AI > SMB > 网页服务 > 主题 > 内存 > DevTool**. When space contracts, DevTool is folded first, then Memory, Theme, Web service, SMB, and AI last. Informational status text uses the remaining left area and auto-scrolls when it cannot fit.
- Keep DevTool represented on the native status bar, move Plugin Management into the Theme popover header as a **设置** button beside close, and anchor the Theme popover horizontally to the native Theme status control. Remove the obsolete global More sheet and duplicated Analysis-sheet surface list; standalone Data Center remains a first-level top entry instead of an Analysis-sheet item.
- Make scientific floating navigation touch-transient on Mobile, coalesce touch pointer events through `requestAnimationFrame`, and calculate drag position from the pointer-to-toolbar offset so the toolbar follows the finger across the full plot instead of moving in short increments.
- Restore rounded Mobile Inspector/Group companion geometry, move Resonance summary information into the left status-information stream on native clients, and let Group Plot reduce effective column count before cards can overlap.
- Add Data Center-owned native responsive layout rules for source header/action wrapping and narrow workspaces. Core Mobile platform CSS remains domain blind; Desktop styling is not patched.
- Advance React Native package to **0.8.18** and Android `versionCode` to **29**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.26 — Mobile Responsive Scientific Composition

- Correct the v3.67.25 Mobile direction: Mobile adaptation no longer means reducing simultaneous UI. The frozen Core semantic Presentation Model is now mapped into responsive scientific composition according to actual WebView width/orientation.
- Keep each plugin's semantic `data-control` surface as the persistent top **参数** command and project it as a temporary **left drawer** on Mobile. Desktop `autoOpen` remains Desktop-owned and does not implicitly open the Mobile drawer.
- On compact screens, Inspector remains a bottom sheet and PRIME scientific-secondary may use a route; on wide/expanded screens, Inspector becomes a right companion and PRIME scientific-secondary becomes a bottom companion so main plot + curve inspector + group plot can coexist in one workspace.
- Track PRIME visibility independently from SUB navigation in Mobile Host. Wide companions may coexist; compact sheet/route PRIME surfaces are mutually exclusive to avoid stacked overlays. Android Back closes SUB/transient surfaces and then the most recent open PRIME companion.
- Keep the native plugin command strip visible in phone/tablet landscape and make commands content-sized in one horizontal scrollable strip instead of hiding them with a fixed button-count limit. A global navigation rail is introduced only on very wide landscape layouts.
- Restore mobile-native parameter gestures through the shared Interaction Intent adapter: edge swipe opens the semantic data-control drawer and a left swipe inside it closes the drawer without introducing `ctx.ui.mobile`.
- Make Core `dkds-action-row` and inline-form rows dense/responsive in the React Native WebView projection; Resonance scan/detect/inspector controls consume those semantic rows instead of forcing full-width/two-column command geometry.
- Reconnect wide/expanded Mobile scientific companions to the existing Core `SplitController`: the right Inspector width and bottom scientific-secondary height use the same split variables/handles as the workbench, with one-pixel seams plus enlarged invisible touch hit targets.
- Keep Mobile split persistence separate from Desktop geometry (`.mobile` split state), reserve usable canvas space while resizing, and make held-title resize reuse the coalesced split preview/commit path so chart/layout work stays suspended during continuous touch drag.
- Preserve Desktop/Core and Desktop Visual Closure ownership as frozen. No Resonance-specific selector is added to Core Mobile platform CSS; SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.
- Advance React Native package to **0.8.17** and Android `versionCode` to **28**. Mobile visual/runtime acceptance remains WIP pending Android real-device validation.

# v3.67.25 — Mobile Semantic Surface Routing / Landscape Recovery

- Correct the Android landscape projection exposed by real-device screenshots: Mobile Host now forwards the live `DKDSPlatform.profile.orientation` into `MobilePresenter` and republishes when the platform profile changes, so inspector/data-control surfaces use a right rail instead of portrait bottom sheets.
- Separate Mobile route visibility from Desktop workspace mounted state. Desktop `autoOpen` PRIME surfaces may stay mounted for Desktop, but they no longer appear as implicitly active Mobile panels or create multiple simultaneously highlighted header actions.
- Add an idempotent Core `workspaces.activate(...)` path for Mobile Host navigation so opening a Mobile route never depends on Desktop toggle state; tapping the currently active PRIME closes only the Mobile route rather than mutating the Desktop-owned mounted surface.
- Make semantic `route` geometry generic for PRIME/SUB projections and suppress the Desktop portable-placement trigger inside Presenter-owned Mobile surfaces; Mobile Presenter, not Desktop dock controls, owns sheet/rail/route placement.
- Preserve one Core Presentation Model and one Plugin API. No plugin-specific mobile layout patch, `ctx.ui.mobile`, duplicated scientific logic or Theme paint override is introduced.
- Advance React Native package to **0.8.16** and Android `versionCode` to **27**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**. Desktop/Core and Desktop Visual Closure ownership remain frozen while Mobile visual acceptance stays WIP.

# v3.67.24 — Clean Mobile Test Bootstrap Fix

- Fix the clean-repository Android validation path exposed by the Windows toolbox: `npm run mobile:test` now regenerates the ignored Core runtime compositions before the Mobile architecture suite reads `src/generated/runtime/*`.
- Preserve the repository-hygiene contract that generated runtime bundles stay out of Git/clean delivery ZIPs; validation now rebuilds them from canonical composition sources instead of requiring them to be shipped.
- Add a dedicated clean-mobile bootstrap regression and extend structural/repository-hygiene gates so `mobile:test` cannot silently lose its runtime-generation prerequisite.
- Make the v3.67.23 Mobile Host Phase 2 regression release-forward rather than pinning the application/mobile checkpoint to one exact patch, matching the repository rule that historical tests validate capabilities rather than moving release identity.
- Desktop/Core and Desktop Visual Closure ownership remain frozen; SDK stays **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.23 — Mobile Host Architecture Phase 2

- Continue Mobile development without reopening the frozen Desktop/Core presentation contract or Desktop Visual Closure ownership.
- Reduce `mobile/App.tsx` from a 33.9 KiB mixed host/runtime component to a ~4 KiB composition root that only wires shell state, responsive chrome and explicit Mobile host services.
- Split the versioned Mobile Host protocol/native facade, request queue and lifecycle timing, Android file/session I/O, native request routing, semantic shell actions, LAN web-service controller, Android system lifecycle/back handling and WebView renderer/recovery into dedicated owners.
- Keep all Core Presenter / Interaction Intent routes unchanged: Mobile still consumes the Core Presentation Model and routes navigation, surfaces, actions and status requests through the acknowledged `dkds.mobile-host.v1` protocol.
- Add aggregate Mobile-host source helpers so historical architecture/theme regressions validate ownership behavior after modularization rather than freezing a monolithic `App.tsx` path.
- Add a v3.67.23 regression gate that keeps `App.tsx` under 8 KiB, keeps every authored Mobile host module below 48 KiB and blocks native file/bridge/runtime responsibilities from returning to the composition root.
- Advance the React Native package to **0.8.15** and Android `versionCode` to **26**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.22 — Mobile Shell Architecture Phase 1

- Begin Mobile development from the frozen v3.67.21 pre-Mobile baseline without reopening Desktop/Core presentation ownership.
- Split the former 47.6 KiB `mobile/src/Shell.tsx` into explicit model, Theme palette, header/navigation/status components, sheets, service UI and one style owner; keep `Shell.tsx` as a thin public barrel.
- Preserve the existing Mobile Presenter/Core Registry contract, project/history controls, plugin activity/action projection, semantic surface navigation, portrait/landscape navigation, import sheets and native web-service UI with no behavior change.
- Remove three unreferenced React Native style keys discovered during the extraction and keep every new authored Mobile shell module below the 48 KiB module ceiling.
- Add a modular Mobile-shell source helper for historical regressions and a v3.67.22 ownership gate preventing the shell facade from becoming monolithic again.
- Advance the React Native package to **0.8.14** and Android `versionCode` to **25**. SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**.

# v3.67.21 — Pre-Mobile Repository Hygiene

- Keep the v3.67.20 Desktop/Core architecture frozen while cleaning the source-delivery boundary before Mobile UI development.
- Make the clean-project packager exclude deterministic generated runtime bundles and generated launcher/browser icons; `npm start`, test/check, dist and mobile sync recreate them from canonical source.
- Make Mobile web-asset sync regenerate Core runtime compositions before copying `src/`, so a fresh clone/clean archive no longer depends on ignored generated files being present.
- Audit direct desktop and mobile dependencies: every declared direct dependency is still consumed by runtime/build/test paths, so no live dependency is removed merely to reduce archive size.
- Preserve `.git` history and all architecture/regression gates; repository size reduction comes from removing reproducible products from delivery and repacking Git storage, not deleting validation coverage or source history.
- SDK remains **1.24.0**, Plugin API **1.19.0**, Theme Contract **3.10.0**; no public contract change.

# v3.67.20 — R7W Scientific Floating Drag Hover Parity · Desktop/Core Archive Closure

- Convert the ScientificPlot floating navigation drag affordance from a role-simulated `span` into a native `button type="button"` in both ScientificCurve and generic chart-runtime navigation paths.
- Keep the drag affordance on the same canonical `toolbarAction / quiet` identity as zoom-in, zoom-out and home actions, so every Theme consumes the exact same hover/active paint path.
- Keep `.dkds-scientific-nav-drag` CSS semantic-only (layout/cursor); it may not own background, border, shadow or text color separately from ToolbarAction.
- Extend Windows visual diagnostics so the floating drag affordance must remain a native button, and add HARD-81 plus the v3.67.20 R7W regression to prevent a span-specific hover path from returning.
- Keep SDK **1.24.0**, Plugin API **1.19.0** and Theme Contract **3.10.0** unchanged; this is a Core scientific-chrome consistency fix with no public SDK change.
- This patch supersedes v3.67.19 as the recommended Desktop/Core archive baseline before Mobile UI development.

# v3.67.19 — R7V Aurora Hover / Theme Bootstrap · Desktop Visual Closure WIP

- Make both persistent segmented shell command families consume ToolbarGroup-owned hover/active/selected state slots, so plain actions and menu-trigger actions render the same transient feedback in Aurora dark mode.
- Keep segmented children borderless and shadowless in every transient state; the outer ToolbarGroup remains the sole silhouette/depth owner.
- Add a persistent theme boot snapshot (`dkds.theme-boot.v1`) containing the resolved light/dark mode, active profile identity, header-effect state and root Theme CSS variables.
- Restore that snapshot in the document head before authored styles load, preventing the first frame from painting the generic Core palette before the saved Theme profile is available.
- Preserve a matching pending-profile boot snapshot while startup-critical Theme plugins register; Core no longer overwrites the restored Aurora/Thin Glass first frame with `builtin.default` during bootstrap.
- Keep SDK **1.24.0**, Plugin API **1.19.0** and Theme Contract **3.10.0** unchanged; this patch is a Core appearance/startup correction, not a public-contract change.
- Desktop Visual Closure history remains retained; Windows cold-start/hover visual acceptance remains the final rendered check before release finalization.

# v3.67.18 — R7U Segmented Command Fill Ownership · Desktop Visual Closure WIP

- Make the persistent File and System shell command families consume the same `ToolbarGroup + dkds-segmented-command-group` outer component contract.
- Remove the historical `strong` semantic from the global **Import** command. Import / Save / Export are peer task commands; Import no longer resolves to a persistent `primary` ToolbarAction variant.
- Make segmented child ToolbarActions transparent in idle state and consume the outer ToolbarGroup text contract. The group owns the single background, border, radius and depth; child hover/pressed states remain transient.
- Add `role="group"` to the File command family and retain the System command group semantics so both command families expose one accessibility/visual silhouette.
- Extend the style validator and Hard Visual Invariants to **80** so Import cannot silently reclaim persistent primary/selected fill and both shell families cannot diverge from the shared outer contract.
- Add the v3.67.18 R7U regression and update historical tests to protect behavior rather than the obsolete `strong` implementation detail.
- Windows Electron visual acceptance remains authoritative before Final Freeze.

# v3.67.17 — R7T Property Ownership Diagnostics WIP

- Continue **Desktop Visual Closure** by removing remaining generic-control fallback overlap with Plugin Manager, Settings/Dialog actions and Scientific floating chrome. Specialized Core controls now own explicit action/field geometry slots instead of consuming generic button/input content-box defaults.
- Make legacy `.floating-panel` / `.group-panel` / `.inspector-panel` geometry mutually exclusive with `PortableView`; once a surface is portable, legacy placement selectors cannot remain a second position/size/overflow owner.
- Centralize hover/active/focus motion in the Core Theme Contract. Standard controls and command-menu items remain geometrically stationary; Presentation layers no longer cancel transforms through later `transform:none` counter-rules.
- Add `DKDSThemeDebug.traceOwnership(...)`, an on-demand computed-style provenance diagnostic for height, padding, background, border, shadow and transform. It reports final computed values plus all matching CSS declaration sources without adding normal-startup work.
- Extend `validate-styles.js` and Hard Visual Invariants to 79 so fallback/specialized overlap, legacy/PortableView dual geometry ownership, Presentation motion ownership and loss of the computed ownership diagnostic fail during development.
- Keep historical regression tests capability-based as ownership implementations move; Theme Inspector movable-HUD and stationary-menu behavior remain preserved under the newer debug/motion contracts.

# v3.67.16 — R7S Property Ownership Audit WIP

- Continue **Desktop Visual Closure** by extending Core property ownership to Settings/Dialog fields, managed-table density, Scientific legend density, collapsed PortableView headers and splitter/resizer hit geometry.
- Exclude Settings/Dialog semantic fields from the generic form baseline; dedicated controls now consume `--dkds-settings-field-*` / `--dkds-dialog-field-*` slots.
- Convert compact managed-table density to `--dkds-table-*` slot changes and keep final cell/header padding in one Structure owner.
- Convert Scientific plot-legend padding/gap specialization to `--dkds-legend-*` slots instead of later direct padding/gap rewrites.
- Move collapsed PortableView header sizing to parent slots and keep Portable/Header final height properties in their canonical owners.
- Make AnalysisWorkbench and PluginWorkspace splitter hit geometry state-invariant; hover/focus/drag may change paint but cannot move or resize the hit target.
- Add Theme paint ownership validation so Core Component Runtime identities can only be painted by Component Appearance / Material Renderer.
- Advance Hard Visual Invariants to 75 and add the R7S regression to both test/check manifests.

# v3.67.15 — R7R Extended Property Ownership Audit WIP

- Extend property-level Core ownership to Portable/header actions, Scientific floating navigation, semantic Field density and PortableView placement modes.
- Make desktop header/action height a single property owner. Close/place/history/plot subtypes feed `--dkds-header-action-height` instead of rewriting `height/min-height`.
- Move Scientific floating navigation item geometry into `sdk-semantic-surfaces.css`; the Workbench layer no longer owns a second 24/25 px button contract.
- Separate shared `dkds-field-control`, Schema-field and AnalysisWorkbench generic density owners. Global field baselines exclude those semantic owners, and pointer-coarse mode changes bounded density slots.
- Consolidate PortableView floating/docked/sticky placement geometry in `super-top-contract.css`. AnalysisWorkbench/PluginWorkspace dock/floating contexts and sticky-disabled/collapsed states now feed `--dkds-portable-*` slots only.
- Advance Hard Visual Invariants to 69 and extend `validate-styles.js` so these source-order ownership regressions fail the build.

# v3.67.14 — R7Q Property Ownership Audit WIP

- Continue **Desktop Visual Closure** by extending property-level ownership beyond ToolbarAction to Activity Tabs and Status Bar actions.
- Consolidate Activity Tab height/padding/line-height into `shell-navigation.css`; responsive and top-level contexts now feed `--dkds-activity-*` slots instead of rewriting the content box.
- Remove the earlier generic `.statusbar` height/padding owner. `#statusBar.statusbar` now owns shell status geometry through `--dkds-statusbar-*` slots, while status actions own an explicit 22px height/min-height and responsive `--dkds-status-item-*` slots.
- Remove Structure-level `button:active` geometric translation and the dependent dialog-close counter-rule. Interaction states may change paint/motion but cannot move Core control geometry.
- Consolidate Project Tab / Project Tabs Bar geometry into canonical property owners. Narrow-desktop size/padding changes now feed `--dkds-project-tab-*` / `--dkds-project-tabs-*` slots rather than mixing shorthands and later longhand overrides.
- Extend `validate-styles.js` and Hard Visual Invariants to 66 so Activity/Status content-box regressions or Structure button-state transforms fail at build time rather than reappearing through source order.

# v3.67.13 — R7P Style Ownership Closure WIP

- Replace the R7O compact-command specificity patch with property-level geometry ownership. `.toolbar-btn` is the single content-box property owner and consumes `--dkds-command-*` slots; compact/context/responsive semantics only feed those slots.
- Remove `plugin-section-start` padding rewrites in both the visible context toolbar and overflow menu. Section boundaries now own only external spacing/separator composition, so they cannot shift **参数 / 检查 / 组图** or any future compact Presenter command.
- Extend the style architecture validator: command state/section modifiers that rewrite padding, height or line-height now fail `npm run styles:build` instead of relying on CSS source order.
- Document the Style Ownership Contract explicitly: Theme Providers own visual values, Core Component Appearance / Material Renderer owns final standard-component paint selectors, Core Structure owns geometry, and plugin CSS owns domain layout rather than Core chrome.
- Advance Hard Visual Invariants to 64 and keep historical visual tests capability-based instead of freezing obsolete direct-padding implementation details.

# v3.67.12 — R7O Shell Focus / Compact Centering WIP

- Remove the persistent child focus halo from segmented shell commands. The Import primary action never owns a private idle/focus shadow; keyboard focus is expressed only on the shared group silhouette.
- Correct the ToolbarAction focus contract: `--dkui-focus` is a shadow token and is no longer misused as an `outline-color` value.
- Fix Presenter compact command centering by neutralizing the later `plugin-section-start` one-sided padding that previously shifted short labels such as **参数**.
- Add HARD-63 and a dedicated R7O regression test so both Windows regressions cannot silently return through CSS ordering.

# v3.67.10 — R7H Runtime / Visual Recovery WIP

## 3.67.11 — R7N UI correction

- Reverted the R7M over-flattened shell segmented geometry while keeping one Core appearance contract for file/system command groups.
- Default Dark active/selected commands use neutral graphite surfaces with no blue glow or persistent selected shadow.
- Compact presentation commands keep content-box centering.
- Development delivery policy now bumps the application patch version for each testable project ZIP; plugin versions remain independent.


- Clean the development root: retire duplicated R7F/R7G transient handoff/status files; one current handoff now owns continuation state. Architecture/freeze documents remain because they are still referenced design history, not transient runtime notes.
- Fix stale SUPER preference recovery in the Core plugin kernel. A saved TOP id that is missing, disabled, or no longer contract-ready now migrates to the current valid default SUPER instead of intentionally leaving the Desktop in an empty PRIMARY/PRIME shell. Valid persisted SUPER choices still win.
- Correct dark disabled ToolbarAction contrast by removing Core's second `opacity:.56` attenuation on top of Theme `disabledText`; Theme providers still own the disabled color.
- Restrict integrated-child flattening to containers that actually own a shared command silhouette. Generic `grouped` context remains semantic/layout metadata and no longer implies that status/activity controls must lose their own border/depth.
- Restore the Resonance box-selection popover to the shared Core `range-action-*` structure in both embedded SUPER and dedicated TOP. Remove duplicate dedicated-only range-menu geometry and return the canonical compact 260 px / 2×2 action layout; destructive feedback remains Core semantic paint.
- Fix scientific legend final-paint ordering: legend items are explicitly borderless, rounded and shadow-free in Component Appearance after generic MenuItem composition, so later component paint cannot reintroduce the heavy legend-button frame.
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

## 3.71.76 WIP

- Replaced Mobile parameter Drawer descendant-overflow sizing with parent-owned compact semantic sizing. The Drawer now chooses a bounded compact track first and Unit/layout/control content adapts inward, matching the accepted Desktop ownership direction.
- Ordinary input/select values and Desktop preferred widths can no longer widen the Drawer. Most ordinary control labels contribute through a robust 80th-percentile readability target; extreme values/options are treated as outliers.
- Primary/fill Action text remains a hard non-compressible width requirement. Canonical Surface padding and Unit gaps remain untouched and therefore non-compressible.
- Drawer persistence advanced to `dkds.mobile.drawer-width.v13.<activity:surface>` so widths produced by the retired DOM-overflow fitter cannot reopen.
- Removed obsolete parameter-Drawer geometry gates from active test/check/mobile manifests. Added a behavioral parent-owned-width acceptance that fails if long ordinary values drive the Drawer toward viewport width, if spacing is rewritten, if a primary action is clipped, or if whole-descendant overflow probing returns.
- Curve Inspector remains outside Drawer sizing ownership and retains its independent Mobile SplitController/PortableView path.
