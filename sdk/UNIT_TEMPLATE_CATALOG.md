# DK Data Studio Unit Template Catalog

Spec version: **2.5.38**

This file is generated from `src/core/ui/modules/composition/unit-template-spec.js`. Do not hand-edit it.

## Global contract

- Existing native plugin source and authored CSS are reference assets, not migration targets for SDK development.
- Unit Templates may reuse accepted canonical classes and Core runtimes, but may not create a second visual owner.
- Plugin composition is free. A shared unit is not free to redefine its radius, button geometry, spacing, chrome completeness or mandatory interaction semantics.
- Presets are compositions of public Unit Templates only. A preset may not own private DOM/CSS/runtime behavior.
- Native-plugin blueprints describe the target unit vocabulary for future 1:1 migration; nonvisual providers use the `provider` unit.

## Geometry ownership policy

Policy: **single-writer-bounded-configuration-v1** (1.0.5)

- Plugin role: `bounded-configuration` — choose only bounded Unit parameters; never write competing Surface geometry.
- Unit role: `intrinsic-constraint-and-internal-layout` — own intrinsic geometry, responsive state and the constraints derived from accepted parameters.
- Presenter role: `outer-surface-allocation` — resolve only the final outer Surface allocation from Unit constraints plus real platform availability.
- User geometry persistence: `preference-only` — a preference is clamped by the current contract and never becomes an owner.

Bounded plugin tunables: `published Layout variant`, `accepted Layout geometry`, `accepted responsive geometry/breakpoints`, `non-parameter PRIME detailGeometry.contentInsetPx`, `PRIME detailGeometry.minContentInlinePx/minContentBlockPx`, `PlotView detailGeometry.contentAspectRatio`, `PlotView detailGeometry.contentMinHeightPx/contentMaxHeightPx`, `PlotGroup columns/preferredColumns/minItemWidth/density/gap`, `Workspace accepted rail/detail geometry`

Immutable ownership: `final Surface frame width/height`, `platform placement and projection`, `canonical control hit geometry`, `canonical paint/typography/state/accessibility`, `runtime style-writer ownership`, `parameter PRIME outer content inset`, `internal scroll extent cannot own outer Surface allocation`, `Presenter measurement cannot replay projected Surface root Layout geometry`

## Frozen metric groups

### typography

| Metric | Value |
|---|---:|
| `bodyPx` | 12.5 |
| `labelPx` | 12 |
| `metaPx` | 11 |
| `titlePx` | 13.5 |
| `sectionPx` | 14 |
Source files: `src/styles/structure/metrics.css`, `src/styles/structure/sdk-semantic-surfaces.css`
Selectors: `:root`, `.dkds-surface-title`, `.dkds-meta`

### workspace

| Metric | Value |
|---|---:|
| `sidebarPx` | 260 |
| `panelGapPx` | 8 |
| `toolGapPx` | 4 |
| `canvasResizerTrackPx` | 7 |
Source files: `src/styles/structure/metrics.css`, `src/styles/structure/plugin-workspace.css`
Selectors: `:root`, `.dkds-plugin-canvas-frame`

### pageHeader

| Metric | Value |
|---|---:|
| `pageMinHeightPx` | 64 |
| `pagePadBlockPx` | 13 |
| `pagePadInlinePx` | 20 |
| `pageGapPx` | 20 |
| `pageTitleLineHeight` | 1.3 |
| `actionHeightPx` | 30 |
| `actionGapPx` | 8 |
| `superMinHeightPx` | 42 |
| `superPadBlockPx` | 6 |
| `superPadInlinePx` | 12 |
| `superGapPx` | 10 |
| `compactButtonMinHeightPx` | 34 |
| `compactButtonPadBlockPx` | 5 |
| `compactButtonPadInlinePx` | 11 |
Source files: `src/styles/structure/analysis-shell.css`, `src/styles/structure/plugin-workspace.css`, `src/styles/structure/schema-and-plugin-ui.css`
Selectors: `.analysis-page-header`, `.super-workspace-root-page>.analysis-page-header`, `.analysis-page-header>button`

### surface

| Metric | Value |
|---|---:|
| `visualRadiusPx` | 9 |
| `visualRadiusSmallPx` | 7 |
| `workspacePanelRadiusPx` | 8 |
| `uiPanelRadiusPx` | 10 |
| `padInlinePx` | 10 |
| `padBlockPx` | 8 |
| `gapPx` | 8 |
| `parameterPrimeInsetPx` | 6 |
| `mobileCompanionInsetPx` | 6 |
Source files: `src/styles/structure/metrics.css`, `src/styles/theme/material-renderer.css`
Selectors: `:root`, `.dkds-surface.dkds-material-role-surface`, `.dkds-floating-surface.dkds-material-role-floating`

### control

| Metric | Value |
|---|---:|
| `heightPx` | 32 |
| `padInlinePx` | 9 |
| `uiHeightPx` | 34 |
| `uiRadiusPx` | 8 |
| `actionGapPx` | 6 |
Source files: `src/styles/structure/metrics.css`, `src/styles/structure/super-top-contract.css`
Selectors: `:root`, `.dkds-action-button`

### action

| Metric | Value |
|---|---:|
| `minWidthPx` | 30 |
| `padInlinePx` | 10 |
| `gapPx` | 6 |
| `regularHeightPx` | 32 |
| `regularPadBlockPx` | 4 |
| `headerDefaultHeightPx` | 26 |
| `headerIconWidthPx` | 26 |
| `headerPlacementMinWidthPx` | 34 |
| `headerPlotMinWidthPx` | 30 |
| `headerPadInlinePx` | 8 |
Source files: `src/styles/structure/super-top-contract.css`, `src/styles/structure/desktop-chrome-geometry.css`
Selectors: `.dkds-action-button`, `[data-dkds-action-density="regular"] .dkds-action-button`, `.dkds-portable-icon-action`, `.dkds-portable-placement-trigger`, `.dkds-plot-view-action`

### header

| Metric | Value |
|---|---:|
| `padBlockPx` | 7 |
| `padInlinePx` | 10 |
| `gapPx` | 8 |
| `actionHeightPx` | 26 |
| `actionGapPx` | 3 |
| `iconActionWidthPx` | 26 |
| `placementMinWidthPx` | 34 |
| `plotActionMinWidthPx` | 30 |
| `stackedPadBlockPx` | 10 |
| `stackedPadInlinePx` | 12 |
| `stackedColumnGapPx` | 12 |
| `stackedRowGapPx` | 3 |
| `stackedCompactBreakpointPx` | 980 |
| `stackedCompactPadBlockPx` | 9 |
| `stackedCompactPadInlinePx` | 10 |
| `stackedCompactGapPx` | 7 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/structure/desktop-chrome-geometry.css`
Selectors: `.dkds-surface-header`, `.dkds-content-header`, `.dkds-surface-header.dkds-surface-header-stacked`, `.dkds-surface-actions`

### field

| Metric | Value |
|---|---:|
| `minHeightPx` | 32 |
| `padBlockPx` | 5 |
| `padInlinePx` | 8 |
| `radiusPx` | 7 |
| `gapPx` | 4 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/structure/metrics.css`
Selectors: `.dkds-field`, `.dkds-field-control`, `:root`

### check

| Metric | Value |
|---|---:|
| `gapPx` | 7 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`
Selectors: `.dkds-check`

### chip

| Metric | Value |
|---|---:|
| `minHeightPx` | 22 |
| `padBlockPx` | 2 |
| `padInlinePx` | 7 |
| `gapPx` | 5 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`
Selectors: `.dkds-chip`

### note

| Metric | Value |
|---|---:|
| `padBlockPx` | 7 |
| `padInlinePx` | 9 |
| `fontPx` | 11 |
| `lineHeight` | 1.5 |
| `radiusPx` | 7 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-note`

### message

| Metric | Value |
|---|---:|
| `maxWidthPercent` | 90 |
| `padBlockPx` | 8 |
| `padInlinePx` | 10 |
| `fontPx` | 12.5 |
| `lineHeight` | 1.55 |
| `metaFontPx` | 11 |
| `metaMarginBottomPx` | 3 |
| `radiusPx` | 11 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-message`, `.dkds-message-meta`

### summary

| Metric | Value |
|---|---:|
| `rowGapPx` | 8 |
| `rowMarginTopPx` | 8 |
| `rowMarginBottomPx` | 12 |
| `stripGapPx` | 6 |
| `stripMarginTopPx` | 6 |
| `stripMarginBottomPx` | 10 |
| `stripPadBlockPx` | 1 |
| `chipPadBlockPx` | 4 |
| `chipPadInlinePx` | 7 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`
Selectors: `.dkds-summary-row`, `.dkds-summary-strip`, `.dkds-summary-chip`

### divider

| Metric | Value |
|---|---:|
| `thicknessPx` | 1 |
Source files: `src/styles/presentation/shell.css`
Selectors: `.dkds-divider`
Runtime note: core.unit-template.display owns 1px orientation geometry because accepted CSS owns paint only

### emptyState

| Metric | Value |
|---|---:|
| `padPx` | 18 |
Source files: `src/styles/structure/analysis-shell.css`
Selectors: `.empty-state`

### metric

| Metric | Value |
|---|---:|
| `padBlockPx` | 8 |
| `padInlinePx` | 10 |
| `labelFontPx` | 11 |
| `labelMarginBottomPx` | 3 |
| `valueFontPx` | 13.5 |
| `radiusPx` | 9 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-metric`, `.dkds-metric>span:first-child`, `.dkds-metric>strong`

### list

| Metric | Value |
|---|---:|
| `itemRadiusPx` | 7 |
| `scrollOwner` | self |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-list`, `.dkds-list-item`

### floatingChrome

| Metric | Value |
|---|---:|
| `insetPx` | 3 |
Source files: `src/styles/structure/desktop-chrome-geometry.css`
Selectors: `[data-dkds-floating-chrome].dkds-integrated-action-group`

### plotGroupHeader

| Metric | Value |
|---|---:|
| `heightPx` | 28 |
| `padInlinePx` | 8 |
| `gapPx` | 6 |
| `actionHeightPx` | 22 |
Source files: `src/styles/structure/plugin-workspace.css`
Selectors: `[data-dkds-unit-plot-group-prime]`
Runtime note: accepted plot-group header values are preserved by the Unit PlotGroup builder

### plotGroup

| Metric | Value |
|---|---:|
| `compactGapPx` | 10 |
| `regularGapPx` | 12 |
| `comfortableGapPx` | 14 |
Source files: `src/core/ui/modules/composition/unit-template-scientific.js`
Selectors: `GROUP_DENSITIES`
Runtime note: 10/12/14 are public semantic densities owned by the generic PlotGroup Unit contract

### table

| Metric | Value |
|---|---:|
| `fontPx` | 11 |
| `canonicalCellPadBlockPx` | 7 |
| `canonicalCellPadInlinePx` | 8 |
| `headPadBlockPx` | 7 |
| `headPadInlinePx` | 9 |
| `cellPadBlockPx` | 6 |
| `cellPadInlinePx` | 9 |
| `compactFontPx` | 10 |
| `compactCellPadBlockPx` | 4 |
| `compactCellPadInlinePx` | 7 |
| `resizerHitPx` | 8 |
| `resizerLinePx` | 1 |
| `wrapRadiusPx` | 7 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-table`, `.dkds-table th`, `.dkds-table th,.dkds-table td`, `.dkds-table-wrap`

### legend

| Metric | Value |
|---|---:|
| `gapPx` | 5 |
| `padBlockPx` | 3 |
| `padInlinePx` | 4 |
| `rowHeightPx` | 19 |
| `itemHeightPx` | 18 |
| `itemPadInlinePx` | 2 |
| `swatchWidthPx` | 13 |
| `selectedSwatchWidthPx` | 18 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/structure/analysis-workbench.css`
Selectors: `.dkds-legend-item`, `canonical scientific legend layout`

### splitHandle

| Metric | Value |
|---|---:|
| `hitPx` | 8 |
| `lineLongPx` | 44 |
| `lineThicknessPx` | 2 |
| `lineInsetPx` | 3 |
Source files: `src/styles/structure/super-top-contract.css`
Selectors: `.dkds-split-handle[data-axis="y"]`, `.dkds-split-handle[data-axis="x"]`, `.dkds-split-handle::after`

### meter

| Metric | Value |
|---|---:|
| `heightPx` | 3 |
| `marginTopPx` | 6 |
| `radiusPx` | 99 |
| `minPercent` | 0 |
| `maxPercent` | 100 |
Source files: `src/styles/presentation/plugin-chrome.css`, `src/styles/theme/contract.css`
Selectors: `.dkds-memory-meter`, `.dkds-memory-meter>span`
Runtime note: Unit Meter adopts the accepted thin meter silhouette; semantic use is not limited to memory.

### dialog

| Metric | Value |
|---|---:|
| `overlayPadPx` | 22 |
| `mobileBreakpointPx` | 620 |
| `mobileOverlayPadPx` | 12 |
| `widthPx` | 540 |
| `viewportInlineReservePx` | 36 |
| `maxHeightPx` | 720 |
| `viewportBlockReservePx` | 44 |
| `headerIconTrackPx` | 34 |
| `headerCloseTrackPx` | 30 |
| `headerGapPx` | 10 |
| `headerPadTopPx` | 16 |
| `headerPadInlinePx` | 17 |
| `headerPadBottomPx` | 13 |
| `iconPx` | 32 |
| `iconRadiusPx` | 9 |
| `titleFontPx` | 14 |
| `titleLineHeight` | 1.35 |
| `subtitleFontPx` | 10 |
| `subtitleLineHeight` | 1.45 |
| `closePx` | 29 |
| `bodyPadTopPx` | 15 |
| `bodyPadInlinePx` | 17 |
| `bodyPadBottomPx` | 16 |
| `messageFontPx` | 11 |
| `messageLineHeight` | 1.65 |
| `metaLabelMinPx` | 92 |
| `metaRowGapPx` | 7 |
| `metaColumnGapPx` | 12 |
| `metaMarginTopPx` | 14 |
| `metaPadBlockPx` | 11 |
| `metaPadInlinePx` | 12 |
| `metaFontPx` | 10 |
| `metaLineHeight` | 1.45 |
| `metaRadiusPx` | 10 |
| `detailsMarginTopPx` | 12 |
| `detailsRadiusPx` | 9 |
| `detailsSummaryPadBlockPx` | 8 |
| `detailsSummaryPadInlinePx` | 10 |
| `detailsPrePadTopPx` | 9 |
| `detailsPrePadInlinePx` | 10 |
| `detailsPrePadBottomPx` | 11 |
| `detailsPreMaxHeightPx` | 190 |
| `detailsPreFontPx` | 9 |
| `detailsPreLineHeight` | 1.55 |
| `footerActionHeightPx` | 32 |
| `footerActionPadBlockPx` | 6 |
| `footerActionPadInlinePx` | 13 |
| `footerGapPx` | 8 |
| `footerPadBlockPx` | 11 |
| `footerPadInlinePx` | 16 |
| `fieldHeightPx` | 34 |
| `fieldPadBlockPx` | 6 |
| `fieldPadInlinePx` | 9 |
| `fieldGapPx` | 6 |
| `fieldMarginTopPx` | 13 |
| `fieldFontPx` | 10 |
Source files: `src/styles/structure/workbench-components.css`, `src/styles/presentation/dialogs.css`
Selectors: `.dkds-dialog-overlay`, `.dkds-dialog`, `.dkds-dialog-header`, `.dkds-dialog-body`, `.dkds-dialog-footer`, `.dkds-dialog-field`

### menu

| Metric | Value |
|---|---:|
| `contextMinWidthPx` | 180 |
| `contextMaxWidthPx` | 320 |
| `contextViewportReservePx` | 12 |
| `contextPadPx` | 5 |
| `contextGapPx` | 2 |
| `commandMaxWidthPx` | 360 |
| `commandViewportPercent` | 90 |
| `separatorPx` | 1 |
| `separatorMarginBlockPx` | 4 |
| `separatorMarginInlinePx` | 2 |
| `mobileRadiusPx` | 16 |
| `mobilePadPx` | 8 |
| `mobileItemMinHeightPx` | 46 |
| `mobileMaxHeightVh` | 72 |
Source files: `src/styles/structure/workbench-components.css`, `src/styles/structure/schema-and-plugin-ui.css`, `src/styles/platform/native-client-shell.css`
Selectors: `.dkds-context-menu`, `.command-menu`, `.command-menu-separator`, `html[data-dkds-host="mobile"].react-native-client .command-menu`

### popover

| Metric | Value |
|---|---:|
| `headerMinHeightPx` | 42 |
| `headerPadTopPx` | 7 |
| `headerPadRightPx` | 8 |
| `headerPadBottomPx` | 7 |
| `headerPadLeftPx` | 11 |
| `headerGapPx` | 8 |
| `bodyPadPx` | 8 |
| `bodyGapPx` | 9 |
| `profileOptionMinHeightPx` | 32 |
| `themeWidthPx` | 310 |
| `themeMaxHeightPx` | 480 |
| `viewportInlineReservePx` | 16 |
| `viewportBlockReservePx` | 92 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`
Selectors: `.dkds-fixed-popover-header`, `.dkds-theme-panel`, `.dkds-theme-panel-body`

### status

| Metric | Value |
|---|---:|
| `padBlockPx` | 7 |
| `padInlinePx` | 9 |
| `fontPx` | 11 |
| `lineHeight` | 1.45 |
| `radiusPx` | 7 |
| `dotPx` | 8 |
Source files: `src/styles/structure/sdk-semantic-surfaces.css`, `src/styles/presentation/shell.css`
Selectors: `.dkds-status`, `.dkds-status-dot`

### statusBar

| Metric | Value |
|---|---:|
| `gapPx` | 8 |
| `padLeftPx` | 9 |
| `padRightPx` | 14 |
| `commandHeightPx` | 20 |
| `zoneHeightPx` | 18 |
| `zoneGapPx` | 8 |
| `itemHeightPx` | 18 |
| `itemPadInlinePx` | 7 |
| `itemRadiusPx` | 6 |
Source files: `src/styles/presentation/control-status.css`
Selectors: `#statusBar.statusbar`, `.statusbar-command-cluster`, `.statusbar-plugin-zone`, `.plugin-status-item`

### portable

| Metric | Value |
|---|---:|
| `headerHeightPx` | 32 |
| `collapsedHeaderHeightPx` | 36 |
| `headerPadLeftPx` | 10 |
| `headerPadRightPx` | 7 |
| `headerActionHeightPx` | 22 |
| `baseMinWidthPx` | 260 |
| `baseMinHeightPx` | 100 |
| `floatingMinWidthPx` | 300 |
| `floatingMinHeightPx` | 180 |
| `floatingViewportInlineReservePx` | 12 |
| `floatingViewportBlockReservePx` | 42 |
| `resizeHitPx` | 36 |
| `resizeOuterPx` | 18 |
| `resizeInnerPx` | 15 |
| `historyActionPx` | 26 |
Source files: `src/styles/structure/super-top-contract.css`, `src/styles/structure/desktop-chrome-geometry.css`
Selectors: `.dkds-portable-view`, `.dkds-portable-header`, `.dkds-portable-view.is-floating`, `.dkds-panel-close-button`

### acceptedScientific

| Metric | Value |
|---|---:|
| `leftWidthPx` | 280 |
| `leftMinPx` | 230 |
| `canvasLeftWidthPx` | 360 |
| `canvasRightWidthPx` | 390 |
| `canvasBottomHeightPx` | 360 |
| `dataControlInsetPx` | 12 |
| `panelBodyInsetPx` | 10 |
| `groupGapPx` | 12 |
| `mainChromeHeightPx` | 34 |
| `mainChromeLeftPx` | 82 |
| `mainChromeRightPx` | 18 |
| `mainChromeTopPx` | 8 |
| `inspectorWidthPx` | 390 |
| `inspectorHeightPx` | 560 |
| `groupWidthPx` | 880 |
| `groupHeightPx` | 620 |
Source files: `src/core/ui/modules/composition/unit-template-presets.js`, `src/core/ui/modules/composition/scientific.js`
Selectors: `accepted-scientific-v1`, `REFERENCE_PROFILE_GEOMETRY`
Runtime note: frozen generic reference-composition signature; preset is composed only from public Unit Templates

## Published layout recipes

Layout recipes are Core-owned geometry distilled from accepted native-plugin layouts. Plugins choose a named recipe; arbitrary CSS geometry is not part of the Unit Template contract.

| Recipe | Base geometry | Responsive rules |
|---|---|---|
| `identity` |  | — |
| `stack` | display=flex, flexDirection=column, gapPx=8, minWidth=0, minHeight=0 | — |
| `stack-compact` | display=flex, flexDirection=column, gapPx=4, minWidth=0, minHeight=0 | — |
| `stack-comfortable` | display=flex, flexDirection=column, gapPx=14, minWidth=0, minHeight=0 | — |
| `row` | display=flex, flexDirection=row, alignItems=center, gapPx=7, minWidth=0 | — |
| `row-wrap` | display=flex, flexDirection=row, alignItems=center, flexWrap=wrap, gapPx=7, minWidth=0 | — |
| `row-between` | display=flex, flexDirection=row, alignItems=center, justifyContent=space-between, gapPx=8, minWidth=0 | — |
| `fill-rows` | display=grid, gridTemplateRows=auto minmax(0,1fr), gapPx=0, minWidth=0, minHeight=0 | — |
| `header-body-footer` | display=grid, gridTemplateRows=auto minmax(0,1fr) auto, gapPx=0, minWidth=0, minHeight=0 | — |
| `browser-rows` | display=grid, gridTemplateRows=auto auto minmax(0,1fr) auto, gapPx=0, minWidth=0, minHeight=0 | — |
| `sidebar-main-compact` | display=grid, gridTemplateColumns=235px minmax(0,1fr), gapPx=0, minWidth=0, minHeight=0 | ≤760px: gridTemplateColumns=150px minmax(0,1fr) |
| `sidebar-main-standard` | display=grid, gridTemplateColumns=260px minmax(0,1fr), gapPx=8, minWidth=0, minHeight=0 | ≤620px: gridTemplateColumns=minmax(0,1fr) |
| `sidebar-main-wide` | display=grid, gridTemplateColumns=290px minmax(0,1fr), gapPx=12, minWidth=0, minHeight=0 | ≤1000px: gridTemplateColumns=230px minmax(0,1fr) |
| `form-grid` | display=grid, gridTemplateColumns=repeat(2,minmax(128px,1fr)), rowGapPx=8, columnGapPx=9, alignItems=end, minWidth=0 | ≤310px: gridTemplateColumns=minmax(0,1fr) / ≥680px: gridTemplateColumns=repeat(3,minmax(128px,1fr)) / ≥920px: gridTemplateColumns=repeat(4,minmax(128px,1fr)) |
| `form-grid-2` | display=grid, gridTemplateColumns=repeat(2,minmax(128px,1fr)), rowGapPx=8, columnGapPx=9, alignItems=end, minWidth=0 | ≤310px: gridTemplateColumns=minmax(0,1fr) |
| `form-grid-4` | display=grid, gridTemplateColumns=repeat(4,minmax(128px,1fr)), rowGapPx=6, columnGapPx=8, alignItems=end, minWidth=0 | ≤620px: gridTemplateColumns=repeat(2,minmax(128px,1fr)) / ≤310px: gridTemplateColumns=minmax(0,1fr) |
| `action-grid-2` | display=grid, gridTemplateColumns=repeat(2,minmax(0,1fr)), gapPx=5, minWidth=0 | — |
| `action-grid-4` | display=grid, gridTemplateColumns=repeat(4,minmax(0,1fr)), gapPx=7, minWidth=0 | ≤280px: gridTemplateColumns=repeat(2,minmax(0,1fr)) |
| `metric-grid` | display=grid, gridTemplateColumns=repeat(4,minmax(0,1fr)), gapPx=8, minWidth=0 | ≤620px: gridTemplateColumns=repeat(2,minmax(0,1fr)) / ≤310px: gridTemplateColumns=minmax(0,1fr) |
| `two-card-grid` | display=grid, gridTemplateColumns=repeat(2,minmax(0,1fr)), gapPx=14, minWidth=0 | ≤680px: gridTemplateColumns=minmax(0,1fr), gapPx=8 |
| `key-value-compact` | display=grid, gridTemplateColumns=110px minmax(0,1fr), rowGapPx=4, columnGapPx=8, minWidth=0 | — |
| `key-value-standard` | display=grid, gridTemplateColumns=130px minmax(0,1fr), rowGapPx=4, columnGapPx=8, minWidth=0 | — |
| `label-value-wide` | display=grid, gridTemplateColumns=120px minmax(0,1fr), columnGapPx=10, rowGapPx=0, minWidth=0 | — |
| `inline-range` | display=grid, gridTemplateColumns=minmax(0,1fr) auto minmax(0,1fr), gapPx=5, alignItems=center, minWidth=0 | — |
| `split-results` | display=grid, gridTemplateRows=minmax(0,1fr) 8px var(--dkds-unit-results-height,180px), minWidth=0, minHeight=0 | ≤920px: display=flex, flexDirection=column, gridTemplateRows=none, gapPx=8 |
| `scroll-pane` | display=block, overflow=auto, minWidth=0, minHeight=0 | — |
| `sticky-stack` | display=flex, flexDirection=column, gapPx=8, minWidth=0, minHeight=0, position=sticky, topPx=0 | — |
| `tool-sidebar-main` | display=grid, gridTemplateColumns=minmax(360px,420px) minmax(0,1fr), rowGapPx=12, columnGapPx=12, minWidth=0, minHeight=0 | ≤760px: gridTemplateColumns=minmax(0,1fr) |
| `connection-grid` | display=grid, gridTemplateColumns=repeat(6,minmax(80px,1fr)), gapPx=7, minWidth=0 | ≤620px: gridTemplateColumns=repeat(4,minmax(0,1fr)) / ≤460px: gridTemplateColumns=repeat(3,minmax(0,1fr)) / ≤310px: gridTemplateColumns=repeat(2,minmax(0,1fr)) |
| `chat-rows` | display=grid, gridTemplateRows=46px minmax(0,1fr) auto auto, gapPx=0, minWidth=0, minHeight=0 | — |
| `compose-row` | display=grid, gridTemplateColumns=minmax(0,1fr) 34px, gapPx=7, minWidth=0 | — |
| `list-row-file` | display=grid, gridTemplateColumns=34px minmax(170px,1fr) 90px 105px, columnGapPx=8, alignItems=center, minWidth=0 | ≤760px: gridTemplateColumns=30px minmax(120px,1fr) 70px |
| `list-row-selectable` | display=grid, gridTemplateColumns=22px minmax(0,1fr), gapPx=6, alignItems=start, minWidth=0 | — |
| `content-actions` | display=grid, gridTemplateColumns=minmax(0,1fr) auto, gapPx=8, alignItems=center, minWidth=0 | — |
| `active-file-head` | display=grid, gridTemplateColumns=minmax(0,1fr) minmax(220px,330px), gapPx=14, alignItems=end, minWidth=0 | ≤460px: gridTemplateColumns=minmax(0,1fr) |
| `overlay-center` | position=fixed, inset=0, display=flex, alignItems=center, justifyContent=center, paddingPx=24 | ≤760px: paddingPx=8 |
| `service-window` | display=grid, gridTemplateRows=48px minmax(0,1fr) auto, minWidth=0, minHeight=0, overflow=hidden | — |
| `settings-window` | display=grid, gridTemplateRows=48px minmax(0,1fr), minWidth=0, minHeight=0, overflow=hidden | — |
| `scroll-stack` | display=flex, flexDirection=column, gapPx=9, overflow=auto, minWidth=0, minHeight=0, paddingPx=12 | — |
| `wrap-strip` | display=flex, flexWrap=wrap, gapPx=5, minWidth=0 | — |
| `mention-row` | display=grid, gridTemplateColumns=54px minmax(0,1fr), gapPx=7, minWidth=0 | — |
| `artifact-list` | overflow=auto, paddingPx=7, minHeightPx=180, minWidth=0 | — |
| `artifact-row` | display=grid, gridTemplateColumns=minmax(0,1fr), alignItems=start, width=100%, paddingPx=8, marginBottomPx=6, minWidth=0 | — |
| `artifact-row-selectable` | display=grid, gridTemplateColumns=auto minmax(0,1fr), gapPx=8, alignItems=start, width=100%, paddingPx=8, marginBottomPx=6, minWidth=0 | — |
| `primary-flow` | display=grid, gridTemplateColumns=minmax(0,1fr), gridTemplateAreas="source" "tool" "chart", gapPx=10, minWidth=0 | ≥1180px: gridTemplateColumns=minmax(360px,520px) minmax(520px,1fr), gridTemplateAreas="source source" "tool chart", alignItems=start |
| `formula-grid` | display=grid, gridTemplateColumns=minmax(112px,.72fr) minmax(210px,1.3fr) minmax(90px,.5fr) minmax(118px,.64fr), rowGapPx=4, columnGapPx=6, alignItems=start, minWidth=0 | ≤620px: gridTemplateColumns=repeat(2,minmax(0,1fr)) |
| `toolbar-bottom` | display=flex, alignItems=end, gapPx=7, padding=9px 12px, minWidth=0, flexWrap=wrap | — |
| `workflow-step-head` | display=flex, alignItems=center, justifyContent=space-between, gapPx=8, minWidth=0 | — |
| `provenance-list` | overflow=auto, padding=10px 12px, maxHeightPx=430, minWidth=0 | — |
| `provenance-row` | display=grid, gridTemplateColumns=120px minmax(0,1fr), gapPx=10, padding=8px 0, minWidth=0 | — |
| `surface-header-stack` | display=grid, gridTemplateColumns=minmax(0,1fr), alignItems=start, gapPx=6, minWidth=0 | — |
| `toolbar-wrap` | display=flex, alignItems=center, justifyContent=flex-start, flexWrap=wrap, gapPx=5, minWidth=0 | — |
| `file-toolbar` | display=flex, gapPx=7, marginTopPx=9, padding=8px 10px, minWidth=0 | — |
| `batch-file-row` | display=grid, gridTemplateColumns=18px minmax(0,1fr) auto, alignItems=start, gapPx=6, minWidth=0 | — |
| `compare-actions` | display=flex, alignItems=center, justifyContent=flex-end, flexWrap=wrap, gapPx=8, minWidth=0 | — |
| `control-label-row` | display=grid, gridTemplateColumns=1fr auto, alignItems=center, gapPx=6, minWidth=0 | — |
| `segment-bar` | display=flex, alignItems=center, justifyContent=space-between, gapPx=8, padding=6px 10px 4px, minWidth=0 | — |
| `analysis-control-grid` | display=grid, gridTemplateColumns=minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr), gapPx=7, alignItems=end, minWidth=0 | ≤1120px: gridTemplateColumns=repeat(4,minmax(0,1fr)) / ≤840px: gridTemplateColumns=repeat(3,minmax(0,1fr)) / ≤620px: gridTemplateColumns=repeat(2,minmax(0,1fr)) |
| `result-control-grid` | display=grid, gridTemplateColumns=repeat(2,minmax(180px,1fr)) repeat(2,minmax(132px,.62fr)), gapPx=7, alignItems=end, minWidth=0 | ≤1120px: gridTemplateColumns=repeat(4,minmax(0,1fr)) / ≤620px: gridTemplateColumns=repeat(2,minmax(0,1fr)) |
| `result-grid-asymmetric` | display=grid, gridTemplateColumns=minmax(0,1.25fr) minmax(320px,.75fr), gapPx=10, minWidth=0, minHeightPx=300 | ≤1120px: gridTemplateColumns=minmax(0,1fr), gridTemplateRows=300px 260px |
| `dataset-row` | display=grid, gridTemplateColumns=22px minmax(0,1fr), gapPx=6, paddingPx=7, alignItems=start, minWidth=0 | — |
| `dataset-transform-row` | display=grid, gridTemplateColumns=auto minmax(0,1fr), gapPx=5, alignItems=center, marginTopPx=5, minWidth=0 | — |
| `inspector-section` | paddingBottomPx=10, marginBottomPx=10, minWidth=0 | — |
| `palette-grid` | display=grid, gridTemplateColumns=repeat(2,minmax(0,1fr)), gapPx=6, margin=8px 0, minWidth=0 | — |
| `responsive-two-column` | display=grid, gridTemplateColumns=repeat(2,minmax(0,1fr)), gapPx=12, minWidth=0 | ≤680px: gridTemplateColumns=minmax(0,1fr) |
| `gate-controls` | display=flex, alignItems=end, gapPx=9, flexWrap=nowrap, minWidth=0 | ≤1250px: flexWrap=wrap |
| `plot-card-fill` | display=grid, gridTemplateRows=auto minmax(0,1fr), minWidth=0, minHeightPx=220, overflow=hidden | — |
| `plot-card-header` | display=flex, alignItems=center, justifyContent=space-between, gapPx=8, padding=7px 10px, minWidth=0 | — |
| `square-plot` | width=100%, height=auto, minHeight=0, aspectRatio=1 / 1 | — |
| `resistance-card` | display=grid, gridTemplateRows=auto auto auto minmax(320px,1fr), minWidth=0, minHeight=0, height=auto | — |
| `portable-resistance-card` | display=grid, gridTemplateRows=auto auto auto minmax(0,1fr), minWidth=0, minHeight=0 | — |
| `card-title-row` | display=flex, alignItems=center, justifyContent=space-between, gapPx=8, padding=5px 8px 5px 10px, minHeightPx=38, minWidth=0, boxSizing=border-box | — |
| `empty-centered` | display=flex, alignItems=center, justifyContent=center, paddingPx=20, minHeightPx=150, minWidth=0 | — |

## Accepted geometry vocabulary

Layout geometry is Core-owned and restricted to **48 properties / 387 accepted values** distilled from frozen native-plugin geometry. Arbitrary CSS values are rejected at runtime.

Accepted responsive breakpoints: `310px`, `460px`, `520px`, `620px`, `680px`, `720px`, `760px`, `900px`, `920px`, `950px`, `980px`, `1000px`, `1050px`, `1120px`, `1180px`, `1250px`

| CSS property | Accepted values |
|---|---|
| `align-content` | `start`, `stretch` |
| `align-items` | `baseline`, `center`, `end`, `flex-end`, `flex-start`, `start`, `stretch` |
| `align-self` | `center`, `end`, `flex-end`, `flex-start`, `start`, `stretch` |
| `aspect-ratio` | `1 / 1` |
| `bottom` | `44px`, `82px`, `calc(var(--dkds-statusbar-height,28px) + var(--dkds-status-popover-gap,8px))`, `var(--dkds-status-popover-gap,8px)` |
| `box-sizing` | `border-box` |
| `column-gap` | `6px`, `8px`, `9px`, `10px`, `12px` |
| `display` | `block`, `flex`, `grid`, `inline`, `inline-block`, `inline-flex`, `none` |
| `flex` | `0 0 auto`, `0 0 clamp(180px,42dvh,340px)`, `0 1 180px`, `0 1 auto`, `1`, `1 1 0`, `1 1 150px`, `1 1 180px`, `1 1 auto`, `none` |
| `flex-direction` | `column`, `row` |
| `flex-wrap` | `nowrap`, `wrap` |
| `gap` | `0px`, `2px`, `3px`, `4px`, `4px 6px`, `4px 7px`, `4px 8px`, `5px`, `5px 9px`, `6px`, `7px`, `8px`, `9px`, `9px 12px`, `10px`, `12px`, `14px` |
| `grid-area` | `chart`, `source`, `tool` |
| `grid-auto-rows` | `auto` |
| `grid-column` | `1`, `1 / -1`, `1/-1`, `2`, `2 / span 2`, `auto` |
| `grid-template-areas` | `"source source" "tool chart"`, `"source" "tool" "chart"` |
| `grid-template-columns` | `1fr`, `1fr 1fr`, `1fr auto`, `18px minmax(0,1fr) auto`, `22px minmax(0,1fr)`, `30px minmax(120px,1fr) 70px`, `34px minmax(170px,1fr) 90px 105px`, `54px minmax(0,1fr)`, `70px minmax(0,1fr)`, `110px minmax(0,1fr)`, `120px minmax(0,1fr)`, `130px minmax(0,1fr)`, `150px minmax(0,1fr)`, `230px minmax(0,1fr)`, `235px minmax(0,1fr)`, `240px minmax(0,1fr)`, `260px minmax(0,1fr)`, `280px minmax(0,1fr)`, `290px minmax(0,1fr)`, `auto minmax(0,1fr)`, `minmax(0,1.25fr) minmax(320px,.75fr)`, `minmax(0,1fr)`, `minmax(0,1fr) 34px`, `minmax(0,1fr) auto`, `minmax(0,1fr) auto auto`, `minmax(0,1fr) auto minmax(0,1fr)`, `minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)`, `minmax(0,1fr) minmax(220px,330px)`, `minmax(112px,.72fr) minmax(210px,1.3fr) minmax(90px,.5fr) minmax(118px,.64fr)`, `minmax(220px,1.45fr) repeat(4,minmax(118px,.8fr)) minmax(148px,.72fr)`, `minmax(360px,420px) minmax(0,1fr)`, `minmax(360px,520px) minmax(520px,1fr)`, `repeat(2,minmax(0,1fr))`, `repeat(2,minmax(128px,1fr))`, `repeat(2,minmax(180px,1fr)) repeat(2,minmax(132px,.62fr))`, `repeat(3,minmax(0,1fr))`, `repeat(3,minmax(128px,1fr))`, `repeat(4,minmax(0,1fr))`, `repeat(4,minmax(128px,1fr))`, `repeat(6,minmax(80px,1fr))`, `repeat(auto-fit,minmax(150px,1fr))` |
| `grid-template-rows` | `46px minmax(0,1fr) auto auto`, `48px minmax(0,1fr)`, `48px minmax(0,1fr) auto`, `300px 260px`, `auto auto`, `auto auto auto`, `auto auto auto auto`, `auto auto auto minmax(0,1fr)`, `auto auto auto minmax(320px,1fr)`, `auto auto minmax(0,1fr) auto`, `auto minmax(0,1fr)`, `auto minmax(0,1fr) auto`, `auto minmax(0,1fr) minmax(0,.58fr)`, `minmax(0,1fr) 8px 180px`, `minmax(0,1fr) 8px var(--dkds-unit-results-height,180px)`, `minmax(0,1fr) auto`, `none` |
| `height` | `0`, `8px`, `9px`, `18px`, `22px`, `25px`, `26px`, `34px`, `100%`, `210px`, `360px`, `380px`, `460px`, `560px`, `620px`, `auto`, `calc(100vh - 18px)`, `clamp(180px,42dvh,340px)`, `clamp(290px,44vh,360px)`, `clamp(360px,42vh,440px)`, `min(540px,calc(100vh - var(--dkds-statusbar-height,28px) - var(--dkds-status-popover-gap,8px) - 10px))`, `min(575px,calc(100vh - 92px))`, `min(670px,82vh)` |
| `inset` | `0`, `auto` |
| `justify-content` | `center`, `flex-end`, `flex-start`, `space-between`, `stretch` |
| `left` | `0`, `6px`, `10px`, `72px`, `82px` |
| `margin` | `0`, `0 0 7px`, `0 0 8px`, `0 0 9px`, `0 12px`, `0 14px 13px`, `0 auto`, `2px 0 0`, `5px 0 0 24px`, `6px 0`, `6px 10px 0`, `7px 0`, `7px 10px 0`, `8px 0`, `8px 0 0` |
| `margin-bottom` | `3px`, `5px`, `6px`, `7px`, `8px`, `9px`, `10px`, `12px` |
| `margin-left` | `0`, `4px`, `6px`, `auto` |
| `margin-right` | `2px`, `4px` |
| `margin-top` | `2px`, `3px`, `5px`, `6px`, `7px`, `8px`, `9px`, `10px`, `11px` |
| `max-height` | `240px`, `250px`, `300px`, `330px`, `430px`, `460px`, `520px`, `calc(100vh - 105px)`, `calc(clamp(360px,42vh,440px) + 60px)`, `clamp(180px,42dvh,340px)`, `clamp(360px,42vh,440px)`, `min(690px,88vh)`, `none` |
| `max-width` | `42%`, `100%`, `190px`, `310`, `320px`, `620`, `760`, `920`, `950px`, `1000`, `1120`, `1250`, `min(46%,260px)`, `none` |
| `min-height` | `0`, `0px`, `20px`, `22px`, `24px`, `28px`, `34px`, `36px`, `38px`, `100%`, `120px`, `140px`, `150px`, `180px`, `210px`, `220px`, `260px`, `280px`, `300px`, `320px`, `430px`, `520px`, `560px` |
| `min-width` | `0`, `42px`, `72px`, `105px`, `118px`, `128px`, `135px`, `150px`, `190px`, `320px`, `360px`, `380px`, `680`, `920`, `1180`, `auto` |
| `overflow` | `auto`, `hidden`, `visible` |
| `overflow-x` | `auto` |
| `overflow-y` | `hidden` |
| `padding` | `0`, `0 4px`, `0 4px 6px`, `0 7px`, `0 8px 8px`, `0 10px`, `0 10px 6px`, `0 12px`, `0 14px 14px`, `0 20px 4px 12px`, `2px 5px`, `3px`, `3px 6px`, `3px 7px`, `3px 7px 8px`, `3px 8px`, `4px 0`, `4px 8px`, `5px`, `5px 8px`, `5px 8px 5px 10px`, `6px 9px`, `6px 10px 4px`, `7px`, `7px 9px`, `7px 10px`, `8px`, `8px 0`, `8px 9px`, `8px 9px 9px`, `8px 10px`, `8px 10px 10px`, `9px 12px`, `9px 12px 11px`, `10px`, `10px 11px 11px`, `10px 12px`, `11px 14px 2px`, `12px`, `12px 0`, `12px 10px`, `14px`, `14px 16px`, `14px 18px 16px`, `18px`, `20px`, `24px`, `42px 18px` |
| `padding-bottom` | `6px`, `8px`, `10px`, `12px`, `34px` |
| `padding-left` | `max(18px,calc((100vw - 1840px)/2 + 18px))` |
| `padding-right` | `2px`, `max(18px,calc((100vw - 1840px)/2 + 18px))` |
| `padding-top` | `0`, `10px` |
| `place-items` | `center` |
| `position` | `absolute`, `fixed`, `relative`, `static`, `sticky` |
| `resize` | `both`, `none` |
| `right` | `6px`, `7px`, `10px`, `14px`, `18px`, `24px`, `51px` |
| `row-gap` | `0px`, `4px`, `8px`, `12px` |
| `text-overflow` | `ellipsis` |
| `top` | `0`, `0px`, `8px`, `56px`, `auto` |
| `white-space` | `nowrap`, `pre-wrap` |
| `width` | `1px`, `8px`, `9px`, `14px`, `18px`, `72px`, `76px`, `100%`, `112px`, `132px`, `135px`, `150px`, `174px`, `390px`, `auto`, `calc(100vw - 14px)`, `calc(100vw - 16px)`, `min(430px,calc(100vw - 28px))`, `min(760px,100%)`, `min(760px,calc(100vw - 32px))`, `min(860px,100%)`, `min(880px,calc(100% - 48px))`, `min(960px,92vw)`, `min(1840px,100%)` |

### Private geometry migration bridges

Legacy plugin-private geometry variables are migration evidence only. Unit Templates expose resolved public geometry; the private variable names are never part of the public geometry vocabulary.

| Private reference token | Public mechanism | Unit | Resolved values |
|---|---|---|---|
| `--dc-chart-height` | `accepted-layout-geometry` | `layout` |  |
| `--dc-chart-min-height` | `accepted-layout-geometry` | `layout` | `180px` |
| `--dc-chart-params-padding` | `accepted-layout-geometry` | `layout` | `6px 9px` |
| `--dc-main-columns` | `layout-recipe` | `layout` |  |
| `--dc-main-areas` | `layout-recipe` | `layout` |  |
| `--dc-main-gap` | `layout-recipe` | `layout` |  |
| `--dkds-field-control-min-height` | `accepted-layout-geometry` | `field` | `28px` |
| `--dkds-field-control-padding-block` | `accepted-layout-geometry` | `field` | `3px` |
| `--dkds-field-control-padding-inline` | `accepted-layout-geometry` | `field` | `7px` |
| `--dkds-grid-align-items` | `plot-group-contract` | `plotGroup` | `start`, `stretch` |
| `--dkds-grid-auto-rows` | `plot-group-contract` | `plotGroup` | `auto` |
| `--dkds-grid-gap` | `plot-group-density` | `plotGroup` | `12px`, `14px` |
| `--dkds-plot-content-flex` | `plot-view-content-geometry` | `plotView` | `1 1 0` |
| `--dkds-plot-content-height` | `plot-view-content-geometry` | `plotView` | `auto` |
| `--dkds-plot-content-min-height` | `plot-view-content-geometry` | `plotView` | `0px`, `320px` |
| `--dkds-vth-results-height` | `accepted-layout-geometry` | `layout` | `minmax(0,1fr) 8px 180px` |
| `--pulse-raw-plot-height` | `accepted-layout-geometry` | `layout` | `clamp(290px,44vh,360px)`, `clamp(360px,42vh,440px)`, `calc(clamp(360px,42vh,440px) + 60px)` |
| `--respar-main-chrome-height` | `accepted-layout-geometry` | `layout` | `34px` |

## Unit catalog

### workspace

- ID: `workspace`
- Kind: `composition`
- Owner: `core`
- Metric groups: `workspace`, `surface`
- Variants: `standard`, `accepted-scientific`
- Anatomy: `primary` → `prime` → `sub`
- Plugin owns: which units exist, unit order, domain content, source-faithful content-owned primary end inset when explicitly declared
- Core owns: workspace region geometry, portable placement arbitration, mobile projection, default 12 px PRIMARY inline-end breathing room
- Purpose: Compose PRIMARY/PRIME/SUB without prescribing plugin information architecture.
- Slots: `primary:1`, `prime:0..n`, `sub:0..n`
- Responsive: Presenter projects semantic roles; plugin must not branch executable UI by platform.
- Accessibility: Host activity title owns top-level identity when titlePolicy=host-only.
- Invariants: PRIMARY/PRIME/SUB semantic roles remain stable across Desktop and Mobile. Every Unit Workspace PRIMARY has exactly one inline-end breathing-room owner. Unit ownership defaults to 12 px; content-owned mode is valid only when the PRIMARY content root already provides the accepted inset.
- Extension points: unit presence, order, domain content, primaryEndInset mode/px
- Forbidden: plugin-owned dock arbitration, platform-specific DOM mirroring, PRIMARY with no inline-end breathing-room owner

### page

- ID: `page`
- Kind: `layout`
- Owner: `core`
- Metric groups: `workspace`
- Canonical classes: `analysis-page-body`
- Variants: `analysis`, `tool`, `data`
- Plugin owns: content
- Core owns: viewport contract
- Purpose: Viewport/body root for page-like plugin surfaces.
- Slots: `content:1`
- Responsive: Must fill the host page without adding hidden desktop-only padding.
- Accessibility: One page root per activity surface.
- Invariants: Viewport ownership remains Core.
- Extension points: domain content
- Forbidden: redefining global page inset, owning host scrollbars

### pageHeader

- ID: `page-header`
- Kind: `header`
- Owner: `core`
- Metric group: `pageHeader`
- Canonical classes: `analysis-page-header`, `dkds-plugin-header-actions`
- Variants: `host-owned`, `page-owned`
- Plugin owns: title, subtitle, domain actions
- Core owns: action geometry, host title de-duplication
- Purpose: Page-local identity and actions when Host does not already own the activity title.
- Slots: `title:1`, `subtitle:0..1`, `actions:0..n`, `close:0..1`
- Responsive: Actions may compress/overflow through Core behavior.
- Accessibility: Title is semantic heading. Close has accessible name.
- Invariants: TOP/SUPER host-owned title must not be duplicated.
- Extension points: text, domain actions
- Forbidden: private action geometry, duplicate activity title

### surface

- ID: `surface`
- Kind: `surface`
- Owner: `core`
- Metric group: `surface`
- Canonical classes: `dkds-surface`, `dkds-surface-elevated`, `dkds-floating-surface`, `dkds-surface-muted`
- Variants: `base`, `elevated`, `floating`, `muted`, `accepted-data-control`
- Plugin owns: semantic role, content
- Core owns: paint, radius, border, shadow, material
- Purpose: Canonical material surface.
- Slots: `content:1`
- Responsive: Material stays semantic while geometry follows parent layout.
- Accessibility: Surface role must not replace semantic child roles.
- Invariants: Paint/radius/border/shadow have one Core owner.
- Extension points: semantic material role
- Forbidden: plugin background/border/radius/shadow ownership

### panel

- ID: `panel`
- Kind: `surface`
- Owner: `core`
- Metric group: `surface`
- Canonical classes: `dkds-surface`
- Variants: `plain`, `headed`, `portable`, `control-card`, `plot-card`, `accepted-portable`
- Plugin owns: content, optional header state, declared sizing mode
- Core owns: surface paint, radius, header/body seam, material-shell/content-body containment
- Purpose: Canonical card/panel shell with optional standard header and body.
- Slots: `header:0..1`, `body:1`
- Responsive: Header/body seam and clipping remain stable when docked/floating. sizing=content gives the Material shell a dedicated intrinsic body so normal-flow content cannot paint beyond the shell when the panel is a flex item; sizing=fill makes the shell a column fill-container and the dedicated body consumes the remaining assigned height.
- Accessibility: Header precedes panel body when present.
- Invariants: Header is complete canonical chrome or absent. sizing=content keeps Material ownership on the shell and geometry/content ownership in a dedicated body. sizing=fill makes both the Material shell and dedicated body participate in one continuous fill chain without plugin height repair.
- Extension points: content, header content declaration, sizing=content|fill
- Forbidden: partial visual header, private radius/seam paint, plugin CSS used to repair panel/content containment

### section

- ID: `section`
- Kind: `layout`
- Owner: `core`
- Metric groups: `header`, `surface`
- Canonical classes: `dkds-surface-heading-stack`
- Variants: `workflow`, `controls`, `primary-plot`, `plot-group`, `result`, `warning`, `disclosure`
- Plugin owns: domain content, semantic role, initial disclosure state
- Core owns: flow containment, section spacing, disclosure semantics
- Purpose: Normal-flow scientific/content section inside a PRIMARY surface.
- Slots: `header:0..1`, `body:1`
- Responsive: Section remains in document flow and contains home-state children.
- Accessibility: Section title uses heading semantics when present. disclosure uses native details/summary keyboard and expanded-state semantics.
- Invariants: No negative offset into sibling sections. Home PlotView cannot escape section bounds. disclosure remains a single native disclosure owner.
- Extension points: role, domain content, initial disclosure state
- Forbidden: negative flow overlap, absolute positioning as primary layout, plugin-owned duplicate disclosure toggle

### layout

- ID: `layout`
- Kind: `layout`
- Owner: `core`
- Geometry contract: `layout-recipes`
- Canonical classes: `dkds-managed-grid`
- Variants: `identity`, `stack`, `stack-compact`, `stack-comfortable`, `row`, `row-wrap`, `row-between`, `fill-rows`, `header-body-footer`, `browser-rows`, `sidebar-main-compact`, `sidebar-main-standard`, `sidebar-main-wide`, `form-grid`, `form-grid-2`, `form-grid-4`, `action-grid-2`, `action-grid-4`, `metric-grid`, `two-card-grid`, `key-value-compact`, `key-value-standard`, `label-value-wide`, `inline-range`, `split-results`, `scroll-pane`, `sticky-stack`, `tool-sidebar-main`, `connection-grid`, `chat-rows`, `compose-row`, `list-row-file`, `list-row-selectable`, `content-actions`, `active-file-head`, `overlay-center`, `service-window`, `settings-window`, `scroll-stack`, `wrap-strip`, `mention-row`, `artifact-list`, `artifact-row`, `artifact-row-selectable`, `primary-flow`, `formula-grid`, `toolbar-bottom`, `workflow-step-head`, `provenance-list`, `provenance-row`, `surface-header-stack`, `toolbar-wrap`, `file-toolbar`, `batch-file-row`, `compare-actions`, `control-label-row`, `segment-bar`, `analysis-control-grid`, `result-control-grid`, `result-grid-asymmetric`, `dataset-row`, `dataset-transform-row`, `inspector-section`, `palette-grid`, `responsive-two-column`, `gate-controls`, `plot-card-fill`, `plot-card-header`, `square-plot`, `resistance-card`, `portable-resistance-card`, `card-title-row`, `empty-centered`, `grid`, `accepted-main-area`, `accepted-main-workspace`, `accepted-plot-wrap`, `accepted-main-header`, `accepted-main-plot`, `accepted-summary`, `accepted-group-grid`, `accepted-group-card`, `accepted-group-plot`
- Plugin owns: unit arrangement, semantic layout variant, domain content
- Core owns: canonical class mapping, responsive geometry owner, layout tokens
- Purpose: Core-owned semantic arrangement primitive distilled from accepted native-plugin geometry.
- Slots: `children:0..n`
- Responsive: Published recipes own primary grid/flex structure. Width 0/unknown preserves the base recipe rather than greedily selecting the narrowest responsive state. Optional accepted geometry parameters and responsive conditions are validated against the frozen native-plugin value vocabulary and are still written only by Core StyleGate.
- Accessibility: Layout container adds no fake semantics. Responsive reflow preserves DOM and focus order.
- Invariants: Only published variants may be used. Core is the only geometry owner for a Unit layout recipe. Geometry parameters must use accepted values. Responsive breakpoints must use accepted breakpoints. Existing plugin-private container names/custom properties never enter the public contract.
- Extension points: published recipe, accepted geometry parameters, accepted responsive geometry, child ordering, recursive Unit composition
- Forbidden: unpublished layout variant, duplicating Core grid geometry, arbitrary unaccepted geometry values, plugin-owned style writes, plugin IDs or domain names in Core recipes

### header

- ID: `header`
- Kind: `header`
- Owner: `core`
- Metric group: `header`
- Canonical classes: `dkds-surface-header`, `dkds-content-header`, `dkds-surface-heading`, `dkds-surface-heading-stack`, `dkds-surface-eyebrow`, `dkds-surface-title`, `dkds-surface-actions`, `dkds-meta`
- Variants: `panel`, `content`, `portable`, `plot`, `plot-minimal`, `section`, `accepted-portable`
- Plugin owns: title, optional eyebrow, meta text, declared title emphasis, declared meta placement, declared actions
- Core owns: height, padding, gap, title/eyebrow/meta typography, button hit geometry, paint
- Purpose: Canonical title/eyebrow/meta/action chrome for panels, plots and portable surfaces.
- Slots: `eyebrow:0..1`, `title:1`, `meta:0..1`, `actions:0..1`
- Responsive: Actions keep Core hit geometry and may overflow only through Core mechanisms. Content headers preserve the same hierarchy without panel-strip paint; title/meta may stay inline until real width pressure requires host reflow.
- Accessibility: Actions have accessible names. Title remains discoverable. Eyebrow never replaces the semantic title.
- Invariants: No visual title strip without canonical actions contract. Header text hierarchy remains Core-styled.
- Extension points: title, optional eyebrow, meta, title emphasis, meta placement, content-header variant, declared actions
- Forbidden: private title/meta typography, private button size/gap, plugin-owned header paint

### toolbar

- ID: `toolbar`
- Kind: `actions`
- Owner: `core`
- Metric group: `action`
- Canonical classes: `dkds-toolbar`, `dkds-integrated-action-group`
- Variants: `ordinary`, `header`, `floating`, `segmented`, `accepted-main`
- Plugin owns: actions, action order, semantic variants
- Core owns: action geometry, gap, hover/active paint
- Purpose: Ordered command group.
- Slots: `actions:1..n`
- Responsive: Wrap/overflow behavior belongs to declared variant.
- Accessibility: Keyboard focus follows command order.
- Invariants: All commands use canonical Action component.
- Extension points: commands, order, semantic variants
- Forbidden: private hover/active paint, ad-hoc button geometry

### action

- ID: `action`
- Kind: `action`
- Owner: `core`
- Metric group: `action`
- Canonical classes: `dkds-action-button`, `dkds-icon-button`
- Variants: `primary`, `secondary`, `quiet`, `destructive`, `selected`, `active`
- Plugin owns: label, icon, enabled/visible state, command, semantic variant
- Core owns: height, padding, radius, hover/active/selected/disabled paint, header compact geometry
- Purpose: Canonical command control.
- Slots: `label/icon:1`, `state:1`
- Responsive: Header contexts may select compact Core geometry.
- Accessibility: Accessible name required. pressed/selected state reflected semantically.
- Invariants: Variant is semantic, not a color request.
- Extension points: label, icon, command, enabled/visible/selected state
- Forbidden: hard-coded fill/text/border/shadow, private hit size

### actionRow

- ID: `action-row`
- Kind: `actions`
- Owner: `core`
- Metric group: `action`
- Canonical classes: `dkds-action-row`
- Variants: `wrap`, `nowrap`
- Plugin owns: actions
- Core owns: button geometry, gap
- Purpose: Inline row of related Actions.
- Slots: `actions:1..n`
- Responsive: Wrap/nowrap is explicit.
- Accessibility: Action order matches keyboard focus order.
- Invariants: Gap and child button geometry are Core-owned.
- Extension points: actions
- Forbidden: raw child margin as spacing system

### tabs

- ID: `tabs`
- Kind: `actions`
- Owner: `core`
- Metric groups: `action`, `header`
- Canonical classes: `dkds-toolbar`, `dkds-surface-tabs`
- Variants: `standard`, `compact`
- Plugin owns: items, selection
- Core owns: tab paint, radius, state
- Purpose: Mutually exclusive content/page selector.
- Slots: `items:1..n`
- Responsive: Compact variant may reduce chrome but not state semantics.
- Accessibility: Single selected tab. Keyboard navigation follows tab semantics.
- Invariants: Selection visual is Core-owned.
- Extension points: items, selection callback
- Forbidden: private selected paint

### field

- ID: `field`
- Kind: `control`
- Owner: `core`
- Metric group: `field`
- Canonical classes: `dkds-field`, `dkds-field-control`
- Variants: `input`, `select`, `textarea`, `integrated`, `analysis-control`
- Plugin owns: label, optional unit annotation, value, options, validation, source-parity control geometry
- Core owns: semantic association, label/unit alignment and typography, default geometry/paint when the plugin does not declare accepted detail geometry
- Purpose: Labeled input/select/textarea control.
- Slots: `label:0..1`, `control:1`, `hint:0..1`
- Responsive: Labels and optional unit annotations remain compact above the control; controls preserve minimum hit geometry and use parent Layout density rather than forcing a single-column field.
- Accessibility: Label must associate with control when provided. Validation state remains semantic.
- Invariants: Field control paint and focus ring are Core-owned.
- Extension points: label, unit, value, options, validation, events
- Forbidden: private radius/focus paint, below-minimum control height

### check

- ID: `check`
- Kind: `control`
- Owner: `core`
- Metric group: `check`
- Canonical classes: `dkds-check`
- Variants: `checkbox`, `radio`, `analysis-check`
- Plugin owns: label, checked state, source-parity inline anatomy
- Core owns: native input semantics, default alignment/gap when not overridden by an accepted anatomy variant
- Purpose: Checkbox/radio choice.
- Slots: `input:1`, `label:1`
- Responsive: Inline alignment remains Core-owned.
- Accessibility: Native checkbox/radio semantics preserved.
- Invariants: Native checkbox/radio semantics are canonical.
- Extension points: checked, disabled, change callback, analysis-check source anatomy
- Forbidden: replacing native semantics with decorative div

### chip

- ID: `chip`
- Kind: `display`
- Owner: `core`
- Metric group: `chip`
- Canonical classes: `dkds-chip`
- Variants: `quiet`, `selected`, `danger`, `info`
- Plugin owns: text, semantic variant, optional invocation
- Core owns: height, padding, radius, paint, interactive element semantics
- Purpose: Compact semantic token/status, optionally invokable without changing chip geometry.
- Slots: `text:1`
- Responsive: May wrap only where parent allows.
- Accessibility: Color is not the sole signal. Invokable chips use a native button and keyboard activation.
- Invariants: Height/padding/radius are Core-owned. Interactive and display chips share the same visual grammar.
- Extension points: text, semantic variant, optional invocation
- Forbidden: private pill geometry, button-styled chip reimplementations

### note

- ID: `note`
- Kind: `display`
- Owner: `core`
- Metric group: `note`
- Canonical classes: `dkds-note`, `dkds-meta`
- Variants: `normal`, `meta`, `warning`, `danger`
- Plugin owns: content
- Core owns: padding, typography, surface semantics
- Purpose: Supplementary information, lightweight meta text or warning surface.
- Slots: `content:1`
- Responsive: Text wraps within parent.
- Accessibility: Warning/danger semantics require textual meaning.
- Invariants: Padding/typography/surface semantics are Core-owned.
- Extension points: content, semantic severity
- Forbidden: private visual warning system

### message

- ID: `message`
- Kind: `display`
- Owner: `core`
- Metric group: `message`
- Canonical classes: `dkds-message`, `dkds-message-meta`
- Variants: `user`, `assistant`, `error`
- Plugin owns: content, meta, semantic role
- Core owns: bubble geometry, padding, radius, role paint, message width
- Purpose: Canonical conversational/system message bubble.
- Slots: `meta:0..1`, `content:1`
- Responsive: Message width and wrapping follow the accepted Core message surface.
- Accessibility: Role/author is available as text; color is not the sole distinction.
- Invariants: Bubble geometry, padding and role paint are Core-owned.
- Extension points: content, meta, semantic role
- Forbidden: private message radius/padding/role paint

### summary

- ID: `summary`
- Kind: `display`
- Owner: `core`
- Metric group: `summary`
- Canonical classes: `dkds-summary-row`, `dkds-summary-strip`, `dkds-summary-chip`
- Variants: `row`, `strip`
- Plugin owns: summary items, labels, values
- Core owns: flow, gap, scroll/wrap behavior, chip geometry
- Purpose: Compact collection of result/status summary items.
- Slots: `items:0..n`
- Responsive: row wraps; strip scrolls horizontally without creating a second vertical scroll owner.
- Accessibility: Each summary item has textual meaning.
- Invariants: Gap, chip geometry and strip/row behavior are Core-owned.
- Extension points: items, row or strip variant
- Forbidden: raw plugin gap/pill geometry for canonical summary

### divider

- ID: `divider`
- Kind: `display`
- Owner: `core`
- Metric group: `divider`
- Canonical classes: `dkds-divider`
- Variants: `horizontal`, `vertical`
- Plugin owns: nothing
- Core owns: thickness, paint, orientation geometry
- Purpose: Canonical visual separator between adjacent Unit regions.
- Slots: `separator:1`
- Responsive: Orientation follows published variant.
- Accessibility: Decorative divider is aria-hidden by default.
- Invariants: Thickness and paint are Core-owned.
- Extension points: orientation
- Forbidden: plugin-owned separator paint/thickness

### emptyState

- ID: `empty-state`
- Kind: `display`
- Owner: `core`
- Metric group: `emptyState`
- Canonical classes: `empty-state`
- Variants: `standard`
- Plugin owns: message, optional domain action
- Core owns: padding, alignment, typography, muted paint
- Purpose: Canonical empty/no-data state.
- Slots: `message:1`, `action:0..1`
- Responsive: Centers or aligns within the assigned Unit region without becoming a viewport owner.
- Accessibility: Message explains the absence of content; optional action is keyboard reachable.
- Invariants: Padding, alignment and muted typography are Core-owned.
- Extension points: message, optional action
- Forbidden: private empty-state typography/padding when using this Unit

### metric

- ID: `metric`
- Kind: `display`
- Owner: `core`
- Metric group: `metric`
- Canonical classes: `dkds-metric`
- Variants: `standard`
- Plugin owns: label, value
- Core owns: padding, typography hierarchy
- Purpose: Label/value summary metric.
- Slots: `label:1`, `value:1`
- Responsive: Value remains readable and numeric alignment stable.
- Accessibility: Label precedes value in DOM.
- Invariants: Typography hierarchy and padding are Core-owned.
- Extension points: label, value
- Forbidden: private metric chrome

### list

- ID: `list`
- Kind: `collection`
- Owner: `core`
- Metric group: `list`
- Canonical classes: `dkds-list`, `dkds-list-item`
- Variants: `plain`, `selectable`, `compact`
- Plugin owns: item descriptors, selection, domain row values
- Core owns: retained list instance, atomic item materialization, leading/title/meta anatomy, scroll owner, item interaction state
- Purpose: Scrollable/selectable collection with retained identity and atomic dynamic updates.
- Slots: `items:0..n`, `item.leading?`, `item.title?`, `item.meta?`
- Responsive: List is the scroll owner when content exceeds its assigned region.
- Accessibility: Interactive items use button/selection semantics.
- Invariants: The List handle retains the concrete list instance across Presenter reparenting. setItems() materializes off-DOM and commits atomically. Selection paint, row anatomy and interaction state are Core-owned.
- Extension points: item descriptors, selection, invoke callback
- Forbidden: rediscovering a reparented list by page/global selectors, plugin-owned competing row anatomy, nested competing scroll owners without explicit composition

### componentTree

- ID: `component-tree`
- Kind: `schema-composition`
- Owner: `core`
- Metric groups: `surface`, `field`, `action`
- Variants: `schema`
- Plugin owns: component schema, domain data/context
- Core owns: canonical component rendering, component lifecycle, hydration
- Purpose: Bridge the existing canonical DKDSComponents schema renderer into Unit composition without creating a second component system.
- Slots: `componentTree:1`
- Responsive: Child components keep their own canonical responsive contracts.
- Accessibility: Accessibility semantics are supplied by canonical component definitions.
- Invariants: Unit Templates delegate to the existing Core component renderer.
- Extension points: component schema, domain context
- Forbidden: private component renderer, plugin-owned canonical component paint

### parameterForm

- ID: `parameter-form`
- Kind: `schema-composition`
- Owner: `core`
- Metric group: `field`
- Canonical classes: `schema-parameter-panel`
- Variants: `standard`, `compact`, `auto-fit`
- Plugin owns: parameter schema, values, validation/context, host outer-grid
- Core owns: field generation, control geometry, default grid, responsive auto-fit, owner validation
- Purpose: Core parameter form.
- Slots: `fields:0..n`
- Responsive: Core grid by default; layoutOwner=host delegates only the outer grid to a Layout Unit host.
- Accessibility: Core renderer supplies labels and controls.
- Invariants: Canonical fields/control geometry remain Core-owned. Exactly one outer-grid owner is active.
- Extension points: parameter schema, value, validation, onChange, layoutOwner:core|host
- Forbidden: reimplementing canonical fields, multiple outer-grid owners

### table

- ID: `table`
- Kind: `data`
- Owner: `core`
- Metric group: `table`
- Canonical classes: `dkds-table-surface-host`, `dkds-managed-table`, `dkds-table-wrap`, `dkds-table`
- Variants: `standard`, `compact`
- Plugin owns: columns, rows, formatters, sort semantics
- Core owns: cell/header geometry, resizers, sticky header, selection transport
- Purpose: Managed tabular data surface.
- Slots: `columns:1..n`, `rows:0..n`
- Responsive: Header/cell geometry and resizers stay stable under horizontal overflow.
- Accessibility: Table semantics preserved. Sortable columns expose state.
- Invariants: Column resizer hit region and sticky header are Core-owned.
- Extension points: columns, rows, formatters, sorting semantics
- Forbidden: private header/cell geometry, plugin-owned resize hit target

### prime

- ID: `prime`
- Kind: `workspace`
- Owner: `core`
- Metric groups: `surface`, `header`, `action`, `portable`
- Variants: `fixed-titleless`, `canonical-header`, `accepted-scientific-data-control`, `accepted-scientific-inspector`
- Roles: `data-control`, `inspector`, `scientific-secondary`
- Plugin owns: role, placements, domain content, header meta/actions, non-parameter detail geometry
- Core owns: portable chrome, placement control, collapse/close plumbing, header completeness, mounting content into canonical PRIME body, uniform parameter PRIME outer inset
- Purpose: Workspace companion surface (data-control/inspector/scientific-secondary).
- Slots: `header:0..1`, `body:1`
- Responsive: Presenter maps role to platform presentation without changing domain content; sizing=fill is the canonical opt-in when a PRIME must consume the remaining dock height. Non-parameter PRIME may publish bounded inline/block intrinsic minima through detailGeometry; parameter PRIME may publish inline minimum only.
- Accessibility: Movable PRIME requires discoverable canonical chrome.
- Invariants: Movable PRIME requires complete canonical header. Fixed titleless PRIME exposes no position chooser. Parameter-purpose PRIME uses the same Core-owned outer inset on desktop and mobile. Declared content is mounted into the canonical PRIME body exactly once and the generated PRIME container is reused across close/reopen.
- Extension points: role, placements, meta/actions, content, non-parameter detailGeometry, parameter minContentInlinePx
- Forbidden: ambiguous section header as drag handle, half-canonical header, plugin override of parameter PRIME outer inset, detached declared content, allocating a new generated PRIME subtree on reopen

### plotView

- ID: `plot-view`
- Kind: `scientific`
- Owner: `core`
- Metric groups: `surface`, `header`, `action`, `portable`
- Canonical classes: `analysis-chart-title`, `dkds-plot-view-head`, `dkds-plot-view-actions`
- Variants: `complete`, `prime-contained`
- Required: `title`, `header`, `position owner`, `export`
- Header contract: `required`
- Position control: `required-or-delegated`
- Export control: `required`
- Plugin owns: title, data/render content, allowed placements or declared enclosing PRIME position owner, detail geometry
- Core owns: header, single position control owner, export menu, card/chrome geometry, portable behavior
- Purpose: Complete data-plot unit around a scientific plot canvas.
- Slots: `header:1`, `title:1`, `position:1 delegated-or-owned`, `export:1`, `plot:1`
- Responsive: Card and plot body resize through Core/Portable geometry; prime-contained delegates movement to one enclosing PRIME.
- Accessibility: Title identifies plot. The single position owner and export controls have accessible names.
- Invariants: Header is mandatory. Complete PlotView owns at least two placements. prime-contained PlotView delegates position only to an enclosing movable PRIME. Export menu is mandatory.
- Extension points: title, rendered scientific content, allowed placements, enclosing PRIME position ownership, export data adapters, detailGeometry
- Forbidden: titleless PlotView, two simultaneous position owners, standalone portable=false, all exports disabled, plugin-owned plot header

### plotGroup

- ID: `plot-group`
- Kind: `scientific`
- Owner: `core`
- Metric group: `plotGroup`
- Canonical classes: `dkds-managed-grid`
- Variants: `compact`, `regular`, `comfortable`, `accepted-scientific`
- Required: `complete PlotView children`
- Header contract: `standard` or `none`
- Interaction policy: `scientific-standard-v1`
- Densities: `compact`, `regular`, `comfortable`
- Plugin owns: plots, column preference, semantic density, explicit source-parity gapPx detail
- Core owns: columns layout, default gap, group header completeness, mouse arbitration
- Purpose: Responsive collection of complete PlotViews.
- Slots: `groupHeader:0..1`, `plotViews:1..n`
- Responsive: Columns adapt from minItemWidth/preference while preserving child minimum width.
- Accessibility: Group controls are named and keyboard reachable.
- Invariants: Header is standard-complete or absent. Every scientific child is a PlotView. Base mouse/touch arbitration is fixed.
- Extension points: plots, column preference, semantic density, gapPx source-parity detail, header meta/domain actions
- Forbidden: partial group header, legacy raw gap/gapRow/gapColumn fields, fixed child height in responsive group, arbitrary scientific child

### scientificPlot

- ID: `scientific-plot`
- Kind: `scientific`
- Owner: `core`
- Geometry contract: `parent-owned-canvas`
- Canonical classes: `dkds-scientific-surface-host`, `dkds-scientific-chart-host`
- Variants: `curve`, `heatmap`, `scalar-field`
- Interaction policy: `scientific-standard-v1`
- Plugin owns: series/data, domain markers, non-conflicting domain interactions, optional declaration that an existing Core scientific runtime is the single renderer owner
- Core owns: single render-owner arbitration, base pointer/touch policy, mobile scroll-vs-box arbitration, selection transport, viewport gestures, legend/nav integration
- Purpose: Chrome-free scientific drawing/interaction canvas with exactly one Core renderer owner.
- Slots: `renderSurface:1`
- Responsive: Canvas follows parent PlotView/section geometry without claiming external responsive-grid height.
- Accessibility: Keyboard/assistive alternatives may be supplied for domain markers/actions.
- Invariants: scientific-standard-v1 base gestures cannot be replaced. Exactly one renderer owns a plot host. renderOwner:'runtime' delegates final drawing/resize observation to the existing ctx.ui.scientificPlot.react/scalarField owner and does not create a second ScientificCurveSurface.
- Extension points: data, rendering, markers, non-conflicting interaction extensions, explicit mobile box gesture, renderOwner
- Forbidden: replacing base interactionBehavior, conflicting gesture binding, dual renderer ownership, interaction extensions on a runtime-delegated plot

### legend

- ID: `legend`
- Kind: `scientific`
- Owner: `core`
- Metric group: `legend`
- Canonical classes: `dkds-scientific-auto-legend`, `dkds-plot-legend`, `dkds-legend-strip`
- Variants: `top`, `bottom`, `left`, `right`, `strip`, `accepted-main`
- Plugin owns: series labels, semantic series state
- Core owns: item geometry, scrolling, selection state paint
- Purpose: Canonical series/state legend.
- Slots: `items:0..n`
- Responsive: Legend scroll/wrap behavior follows declared placement variant.
- Accessibility: Series state is not color-only.
- Invariants: Item geometry and selected-state paint are Core-owned.
- Extension points: series labels/state
- Forbidden: private legend hit geometry

### floatingChrome

- ID: `floating-chrome`
- Kind: `actions`
- Owner: `core`
- Metric group: `floatingChrome`
- Canonical classes: `dkds-floating-surface`, `dkds-integrated-action-group`
- Variants: `scientific-nav`, `command`, `accepted-main`
- Plugin owns: declared commands
- Core owns: single silhouette, inset, action edge geometry, drag/touch behavior
- Purpose: Compact floating command silhouette.
- Slots: `actions/content:1..n`
- Responsive: Stays inside assigned plot/panel bounds; touch behavior remains Core-owned.
- Accessibility: Each command has accessible name.
- Invariants: Single silhouette; edge hover cannot overflow parent. Direct Action children are context-sized inside the chrome content box so the Core inset remains equal on all four sides.
- Extension points: commands
- Forbidden: multiple nested floating backgrounds, private drag/touch behavior

### splitHandle

- ID: `split-handle`
- Kind: `layout`
- Owner: `core`
- Metric group: `splitHandle`
- Canonical classes: `dkds-split-handle`
- Variants: `horizontal`, `vertical`
- Plugin owns: semantic split intent
- Core owns: hit region, drag behavior, touch arbitration
- Purpose: Resizable split affordance.
- Slots: `handle:1`
- Responsive: Axis controls hit geometry and cursor/touch behavior.
- Accessibility: Keyboard alternative should be provided by owning layout where applicable.
- Invariants: Hit region is Core-owned.
- Extension points: axis, semantic split intent
- Forbidden: private resize hit target

### splitPane

- ID: `split-pane`
- Kind: `layout-behavior`
- Owner: `core`
- Metric group: `splitHandle`
- Metric groups: `splitHandle`
- Canonical classes: `dkds-split-handle`
- Variants: `resizable`
- Plugin owns: which region resizes, accepted default/min/max/reserve values, optional explicit host outer-layout ownership, domain content
- Core owns: split size token, drag lifecycle, persistence, resize notifications, touch arbitration, layout-owner validation
- Purpose: Complete resizable two-region composition built on the canonical split handle and Core SplitController.
- Slots: `first:1`, `handle:1`, `second:1`
- Responsive: Core-owned layout may use reflowBelow; created split regions are canonical fill hosts so their single Unit child stretches to the allocated track. An adopted Layout Unit may instead declare layoutOwner=host so accepted Desktop/Mobile CSS is the sole outer-layout owner while Core retains the split size token and gesture state.
- Accessibility: Separator exposes orientation and remains the unique resize gesture owner.
- Invariants: Exactly one outer-layout owner exists: Core by default or an explicit Layout Unit host. Core always owns split size state/persistence. Created first/second regions fill their allocated track and provide a min-size-safe host for their Unit child. Only the canonical split handle may resize the pane.
- Extension points: axis, which region resizes, accepted size limits, accepted Core reflow breakpoint, explicit host outer-layout ownership, domain content
- Forbidden: plugin-owned pointer resize loop, Core reflow plus host-owned outer layout, second split geometry owner, private resize hit target

### movableWindow

- ID: `movable-window`
- Kind: `overlay-behavior`
- Owner: `core`
- Metric group: `dialog`
- Metric groups: `dialog`, `header`, `action`
- Canonical classes: `dkds-dialog-shell`, `dkds-movable-surface`, `dkds-movable-handle`
- Variants: `utility`, `dialog`
- Plugin owns: domain content, accepted bounds, title/actions
- Core owns: pointer drag, bounds clamp, persistence, reset behavior, touch arbitration
- Purpose: Bounded draggable utility/dialog window behavior for surfaces that are movable but are not dockable PortableViews.
- Slots: `handle:1`, `body:1`
- Responsive: Core clamps the surface inside its declared bounds and re-clamps on viewport resize.
- Accessibility: The drag handle remains distinct from interactive controls.
- Invariants: Core is the only pointer-drag owner. Interactive controls inside the handle do not start drag.
- Extension points: title/actions, domain body, accepted bounds, persistence
- Forbidden: plugin-owned pointer drag loop, using MovableWindow as a replacement for dockable PortableView

### meter

- ID: `meter`
- Kind: `display-behavior`
- Owner: `core`
- Metric group: `meter`
- Canonical classes: `dkds-memory-meter`
- Variants: `thin`
- Plugin owns: semantic value, label/value text
- Core owns: clamping, ratio geometry, ARIA progress semantics, paint
- Purpose: Canonical bounded ratio/progress meter with Core-owned value-to-geometry mapping.
- Slots: `track:1`, `fill:1`
- Responsive: Fill ratio changes without changing surrounding layout.
- Accessibility: Exposes progressbar role and min/max/current value.
- Invariants: Value is clamped by Core. Plugin never writes fill width directly.
- Extension points: value, range, aria value text
- Forbidden: ctx.ui.dom.style width updates for canonical meter, plugin-owned meter paint

### dialog

- ID: `dialog`
- Kind: `overlay`
- Owner: `core`
- Metric group: `dialog`
- Canonical classes: `dkds-overlay`, `dkds-dialog-shell`
- Variants: `standard`, `confirm`, `settings`
- Plugin owns: title, content, actions
- Core owns: overlay, surface, button variants, focus/escape behavior
- Purpose: Modal/non-modal dialog surface using shared Dialog runtime.
- Slots: `title:1`, `content:1`, `actions:0..n`
- Responsive: Core constrains overlay and panel to viewport.
- Accessibility: Focus management and Escape behavior are Core-owned.
- Invariants: Actions use semantic primary/secondary/destructive variants.
- Extension points: content, actions
- Forbidden: private overlay/focus trap

### menu

- ID: `menu`
- Kind: `overlay`
- Owner: `core`
- Metric group: `menu`
- Variants: `context`, `dropdown`, `command`
- Plugin owns: items, commands, domain grouping
- Core owns: surface, item geometry, keyboard/pointer dismissal
- Purpose: Command/context/dropdown menu.
- Slots: `items:1..n`
- Responsive: Core positions within screen bounds and handles dismissal.
- Accessibility: Keyboard/pointer selection semantics are Core-owned.
- Invariants: Menu item geometry/dismissal are Core-owned.
- Extension points: items, grouping, commands
- Forbidden: private menu surface or dismissal loop

### popover

- ID: `popover`
- Kind: `overlay`
- Owner: `core`
- Metric group: `popover`
- Canonical classes: `dkds-floating-surface`
- Variants: `status`, `service`, `picker`
- Plugin owns: content, anchor or point intent
- Core owns: surface material, screen bounds, dismissal, anchored positioning
- Purpose: Non-portable floating informational/control surface.
- Slots: `header:0..1`, `body:1`
- Responsive: Core constrains to screen, tracks an optional anchor/point and dismisses on outside interaction when enabled.
- Accessibility: Close control is named when present.
- Invariants: Popover must not masquerade as PortableView. Core owns final viewport-clamped coordinates.
- Extension points: content, header, anchor, point, placement
- Forbidden: portable chrome, plugin-owned left/top positioning, offscreen positioning

### status

- ID: `status`
- Kind: `shell`
- Owner: `core`
- Metric group: `status`
- Canonical classes: `dkds-chip`, `dkds-status`, `dkds-status-dot`
- Variants: `compact`, `text`, `dot`, `row`, `accepted-summary`
- Plugin owns: status value, label
- Core owns: statusbar projection, overflow priority, visual grammar
- Purpose: Compact state/status presentation and status-bar contribution.
- Slots: `indicator:0..1`, `label/content:1`
- Responsive: Status bar projection obeys Core overflow priority.
- Accessibility: State has textual equivalent.
- Invariants: Statusbar overflow ordering remains Host-owned.
- Extension points: label, state, priority
- Forbidden: plugin-owned global statusbar layout

### portable

- ID: `portable`
- Kind: `workspace`
- Owner: `core`
- Metric group: `portable`
- Canonical classes: `dkds-portable-view`, `dkds-portable-header`, `dkds-portable-controls`, `dkds-portable-resize-handle`
- Variants: `docked`, `floating`, `global`, `sticky`
- Plugin owns: allowed placements, initial bounds
- Core owns: drag, resize, placement, history, chrome, z-order
- Purpose: Core-managed movable/resizable/dockable surface behavior.
- Slots: `header/handle:1`, `content:1`, `controls:1`
- Responsive: Dock/floating/global geometry is arbitrated by Core and projected on Mobile.
- Accessibility: Move/close/placement controls remain discoverable.
- Invariants: Drag/resize/placement/history/z-order have one Core owner.
- Extension points: placements, initial bounds, state version
- Forbidden: plugin-owned drag/resize engine, second placement owner

### provider

- ID: `provider`
- Kind: `nonvisual`
- Owner: `plugin`
- Variants: `data`, `algorithm`, `theme`, `foundation`
- Plugin owns: domain service
- Core owns: nothing
- Purpose: Nonvisual data/algorithm/theme/foundation service.
- Slots: `service:1`
- Responsive: Not applicable.
- Invariants: Provider must not create UI as a side effect unless it separately contributes a visual Unit.
- Extension points: domain service contract
- Forbidden: hidden visual ownership

## Unit state and accessibility contract

State spec version: **1.0.0**

Plugins update semantic state through the Unit state controller; Core reflects native properties, ARIA and accepted canonical classes.

| State | Type | Reflection | Rule |
|---|---|---|---|
| `visible` | `boolean` | `hidden`, `aria-hidden` | visible=false sets hidden and aria-hidden=true; visible=true removes aria-hidden and hidden. |
| `enabled` | `boolean` | `disabled`, `aria-disabled` | enabled=false disables native controls and exposes aria-disabled=true. |
| `selected` | `boolean` | `aria-selected`, `class:selected` | Selection state uses aria-selected and canonical selected class. |
| `pressed` | `boolean` | `aria-pressed`, `class:active` | Toggle-action state uses aria-pressed and the accepted active class. |
| `checked` | `boolean` | `checked`, `aria-checked` | Checkable controls synchronize native checked and aria-checked when role requires it. |
| `expanded` | `boolean` | `aria-expanded` | Disclosure/menu state uses aria-expanded. |
| `busy` | `boolean` | `aria-busy`, `data-busy` | Busy state uses aria-busy and data-busy; it does not invent paint. |
| `readonly` | `boolean` | `readOnly`, `aria-readonly` | Readonly state synchronizes native property and aria-readonly. |
| `required` | `boolean` | `required`, `aria-required` | Required state synchronizes native property and aria-required. |
| `current` | `boolean|string` | `aria-current` | Current/focused navigation state uses aria-current; false removes it. |
| `invalid` | `boolean|string` | `aria-invalid` | Validation state uses aria-invalid; false removes it. |
| `loading` | `boolean` | `data-loading`, `aria-busy` | Loading is a semantic alias for busy plus data-loading. |

### Per-unit state policies

| Unit | Allowed states | Required accessibility | Keyboard owner |
|---|---|---|---|
| `action` | `visible`, `enabled`, `selected`, `pressed`, `busy` | `aria-label` | `native-button` |
| `tabs` | `visible`, `enabled`, `selected` | `role=tablist/tab`, `aria-selected` | `native-button-current` |
| `field` | `visible`, `enabled`, `readonly`, `required`, `invalid`, `busy` | `associated label or aria-label` | `native-field` |
| `check` | `visible`, `enabled`, `checked`, `required`, `invalid` | `native checkbox/radio or aria-checked` | `native-check` |
| `menu` | `visible`, `enabled`, `selected`, `expanded` | `role=menu/menuitem or listbox/option` | `menu-roving` |
| `dialog` | `visible`, `busy` | `dialog semantics`, `named title`, `focus lifecycle` | `escape-dismiss` |
| `popover` | `visible`, `expanded`, `busy` | `named trigger/control when interactive` | `outside-dismiss-current` |
| `portable` | `visible`, `expanded`, `busy` | `named placement/close controls` | `core-portable` |
| `prime` | `visible`, `expanded`, `busy` | `canonical header controls when movable` | `core-portable` |
| `plotView` | `visible`, `busy`, `selected`, `current` | `named title`, `named position/export actions` | `core-plot-view` |
| `plotGroup` | `visible`, `busy`, `expanded` | `complete canonical group chrome when headed` | `core-plot-group` |
| `list` | `visible`, `selected`, `current`, `busy` | `selection semantics when selectable` | `selection-model` |
| `table` | `visible`, `selected`, `current`, `busy` | `table semantics` | `core-table` |
| `status` | `visible`, `busy`, `current` | `textual state equivalent` | `none` |
| `meter` | `visible`, `busy` | `role=progressbar`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` | `none` |
| `componentTree` | `visible`, `enabled`, `selected`, `expanded`, `busy`, `readonly`, `required`, `invalid` | `component-defined canonical semantics` | `component-runtime` |
| `parameterForm` | `visible`, `enabled`, `busy`, `readonly`, `required`, `invalid` | `field labels/validation semantics` | `native-field` |

### Accessibility policies

#### action

- Roles: `button`
- Every icon-only action has aria-label.
- Toggle actions reflect aria-pressed.
- Disabled uses native disabled and aria-disabled where needed.

#### tabs

- Roles: `tablist`, `tab`
- Selected tab reflects aria-selected.
- Keyboard navigation remains Core-owned.

#### menu

- Roles: `menu`, `menuitem`, `listbox`, `option`
- Trigger exposes aria-haspopup and aria-expanded.
- Escape/outside dismissal is Core-owned.
- Listbox options expose aria-selected.

#### dialog

- Roles: `dialog`, `alertdialog`
- Dialog is named.
- Focus lifecycle and Escape dismissal are Core-owned.

#### meter

- Roles: `progressbar`
- Current/min/max values are exposed.

#### splitPane

- Roles: `separator`
- Separator exposes orientation and remains the sole resize gesture owner.

#### status

- Roles: none
- Visual state has textual equivalent; no live-region role is implied unless the owning runtime already provides one.

#### selection

- Roles: `option`, `row`, `tab`, `application-owned selectable`
- Selected/current state is exposed with aria-selected/aria-current where applicable.

Allowed ARIA attributes: `aria-label`, `aria-modal`, `aria-orientation`, `aria-haspopup`, `aria-multiselectable`

Allowed tabindex values: `-1`, `0`

Keyboard vocabulary: `Enter`, `Escape`, `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Tab`, `Home`, `End`, ` `

### Native state/accessibility census

This census is generated from frozen native plugin source and is migration evidence for dynamic state, ARIA and keyboard semantics.

| Native plugin | State mutations | Role/tabindex semantics | Other ARIA semantics | Keyboard tokens |
|---|---:|---:|---:|---:|
| `_template` | 0 | 0 | 0 | 0 |
| `aurora-pop-theme` | 0 | 0 | 0 | 0 |
| `connectivity-center` | 11 | 2 | 8 | 2 |
| `data-center` | 20 | 2 | 1 | 1 |
| `flexible-import` | 0 | 0 | 0 | 0 |
| `pulse-analysis` | 8 | 0 | 0 | 0 |
| `pulse-import` | 0 | 0 | 0 | 0 |
| `pulse-sampler-tool` | 1 | 0 | 0 | 0 |
| `resonance-detector-robust` | 0 | 0 | 0 | 0 |
| `resonance-workbench` | 36 | 3 | 6 | 5 |
| `scientific-data-contracts` | 0 | 0 | 0 | 0 |
| `shell-navigation` | 0 | 0 | 0 | 0 |
| `standard-transport-algorithms` | 0 | 0 | 0 | 0 |
| `status-monitor` | 10 | 4 | 5 | 1 |
| `ter-analysis` | 5 | 0 | 0 | 0 |
| `thin-glass-theme` | 0 | 0 | 0 | 0 |
| `transfer-vth-lab` | 1 | 1 | 1 | 0 |
| `workspace-safeguards` | 0 | 0 | 0 | 0 |

## Canonical chrome/anatomy policies

These policies define mandatory Core chrome. Domain actions may fill only the declared extension slots; they cannot replace mandatory Core actions.

### plotViewComplete

- Unit: `plotView`
- Header: `required`
- Mandatory Core actions: `placement` → `export`
- Logical action order: `placement` → `export` → `domain-actions`
- header is always present
- placement control is always present because a PlotView is movable
- export menu is always present and contains at least one export/copy action
- plugin actions may extend but may not replace Core placement/export actions

### plotGroupStandard

- Unit: `plotGroup`
- Header: `standard`
- Mandatory Core actions: `placement` → `columns` → `collapse` → `close`
- Logical action order: `placement` → `columns` → `domain-actions` → `collapse` → `close`
- standard group header is complete; partial group chrome is forbidden
- columns control is Core-owned
- placement/collapse/close are Core-owned
- every child is a complete PlotView

### plotGroupTitleless

- Unit: `plotGroup`
- Header: `none`
- Mandatory Core actions: none
- Logical action order: none
- titleless group is fixed to exactly one placement
- titleless group exposes no placement/collapse/close chrome

### movableInspector

- Unit: `prime`
- Role: `inspector`
- Header: `required`
- Mandatory Core actions: `placement` → `close`
- Optional Core actions: `collapse`
- Logical action order: `placement` → `domain-actions` → `collapse?` → `close`
- movable inspector uses canonical header
- close is always discoverable

### movableDataControl

- Unit: `prime`
- Role: `data-control`
- Header: `required`
- Mandatory Core actions: `placement` → `close`
- Optional Core actions: `collapse`
- Logical action order: `placement` → `domain-actions` → `collapse?` → `close`
- movable data-control uses canonical header

### fixedDataControl

- Unit: `prime`
- Role: `data-control`
- Header: `optional`
- Mandatory Core actions: none
- Logical action order: none
- single-placement fixed data-control never exposes a placement chooser

### scientificSecondary

- Unit: `prime`
- Role: `scientific-secondary`
- Header: `required`
- Mandatory Core actions: `placement` → `collapse` → `close`
- Logical action order: `placement` → `domain-actions` → `collapse` → `close`
- scientific-secondary canonical header is complete

### portable

- Unit: `portable`
- Header: `required-when-chrome`
- Mandatory Core actions: `placement`
- Optional Core actions: `collapse`, `close`
- placement is injected only when more than one placement is available
- drag/resize/placement have one Core owner

## Structural primitive policies

| Native primitive | Unit | Factory | Rule |
|---|---|---|---|
| `button` | `action` | `action.create` | Every ordinary interactive button is expressible as an Action Unit or as a mandatory Core chrome action. |
| `input` | `field` | `field.create` | Text/number/range inputs use Field; checkbox/radio inputs use Check. |
| `select` | `field` | `field.create` | Select controls use Field/select or schema ParameterForm. |
| `textarea` | `field` | `field.create` | Textarea controls use Field/textarea. |
| `checkbox` | `check` | `check.create` | Checkbox/radio geometry and alignment are Core-owned. |
| `table` | `table` | `table.mount` | Data tables use the managed Table Unit. |
| `header` | `header` | `header.create` | Panel/section/portable headers use Header unless a stronger Unit creates its header. |
| `surface` | `surface` | `surface.create` | Canonical material surfaces use Surface/Panel. |
| `plot` | `scientificPlot` | `scientificPlot.create` | Chrome-free plot canvas is ScientificPlot; complete data figure is PlotView. |
| `status` | `status` | `status.create/status.contribute` | Local/global status presentation uses Status. |

## Presentation role policies

| Role | Native/Mobile region | Navigation |
|---|---|---|
| `scientific-primary` | `main` | `primary` |
| `data-primary` | `main` | `primary` |
| `utility-primary` | `main` | `primary` |
| `data-control` | `drawer` | `context` |
| `inspector` | `companion-right` | `context` |
| `scientific-secondary` | `companion-bottom` / data-primary: `workspace-inline` | `context-or-secondary` |

### Native presentation blueprints

#### _template

- No visual presentation contribution.

#### aurora-pop-theme

- No visual presentation contribution.

#### connectivity-center

- Host contribution `status` `smb-browser`: `right` / order 31
- Host contribution `status` `ai-agent`: `right` / order 32

#### data-center

- Surface `main`: `primary` / `data-primary` / priority 100
- Surface `data-control`: `prime` / `data-control` / priority 94 / collapsible
- Surface `chart-preview`: `prime` / `scientific-secondary` / priority 60 / collapsible

#### flexible-import

- No visual presentation contribution.

#### pulse-analysis

- Surface `main`: `primary` / `scientific-primary` / priority 100
- Surface `data-control`: `prime` / `data-control` / priority 92 / collapsible

#### pulse-import

- No visual presentation contribution.

#### pulse-sampler-tool

- Surface `main`: `primary` / `utility-primary` / priority 100
- Surface `parameters`: `prime` / `data-control` / priority 96 / collapsible

#### resonance-detector-robust

- No visual presentation contribution.

#### resonance-workbench

- Surface `main`: `primary` / `scientific-primary` / priority 100
- Surface `data-control`: `prime` / `data-control` / priority 95 / collapsible
- Surface `curve-inspector`: `prime` / `inspector` / priority 90 / collapsible
- Surface `group-analysis`: `prime` / `scientific-secondary` / priority 70 / collapsible
- Surface `physics`: `sub` / `scientific-secondary` / priority 60 / collapsible
- Surface `spacing`: `sub` / `scientific-secondary` / priority 50 / collapsible
- Surface `gate-analysis`: `sub` / `scientific-secondary` / priority 40 / collapsible
- Host contribution `status` `main-summary`: `left` / order 1
- Host contribution `toolbar` `res-settings`: `UTILITY` / order 980

#### scientific-data-contracts

- No visual presentation contribution.

#### shell-navigation

- No visual presentation contribution.

#### standard-transport-algorithms

- No visual presentation contribution.

#### status-monitor

- Host contribution `status` `theme`: `right` / order 10
- Host contribution `status` `memory`: `right` / order 20
- Host contribution `status` `devtools`: `right` / order 25
- Host contribution `status` `lan-web`: `right` / order 30

#### ter-analysis

- Surface `main`: `primary` / `scientific-primary` / priority 100
- Surface `data-control`: `prime` / `data-control` / priority 90 / collapsible

#### thin-glass-theme

- No visual presentation contribution.

#### transfer-vth-lab

- Surface `vth-main`: `primary` / `scientific-primary` / priority 100
- Surface `data-control`: `prime` / `data-control` / priority 90 / collapsible

#### workspace-safeguards

- No visual presentation contribution.

## Accepted scientific preset signature

The `accepted-scientific-v1` preset is a public composition example built only from Unit Templates.

- Units: `workspace`, `layout`, `surface`, `panel`, `header`, `toolbar`, `action`, `prime`, `plotView`, `plotGroup`, `scientificPlot`, `legend`, `floatingChrome`, `portable`, `status`
- Group density: `regular`
- Plot interaction: `scientific-standard-v1`
- PRIME order: `data-control` → `inspector` → `scientific-secondary`

## Native plugin migration blueprints

| Native plugin | Kind | Required Unit vocabulary | Parity target |
|---|---|---|---|
| `_template` | `developer` | `page`, `pageHeader`, `workspace`, `layout`, `panel`, `header`, `toolbar`, `action`, `field`, `actionRow`, `componentTree`, `prime`, `scientificPlot` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `aurora-pop-theme` | `theme-provider` | `provider` | `function` |
| `connectivity-center` | `foundation-ui` | `layout`, `status`, `popover`, `surface`, `section`, `header`, `toolbar`, `action`, `field`, `check`, `chip`, `note`, `message`, `divider`, `emptyState`, `list`, `dialog`, `menu`, `movableWindow` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `data-center` | `data-workbench` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `section`, `header`, `toolbar`, `action`, `actionRow`, `tabs`, `field`, `check`, `chip`, `note`, `summary`, `emptyState`, `metric`, `list`, `parameterForm`, `table`, `prime`, `plotView`, `scientificPlot`, `dialog`, `menu`, `portable`, `splitHandle`, `status` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `flexible-import` | `data-provider` | `provider` | `function` |
| `pulse-analysis` | `scientific-workbench` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `header`, `toolbar`, `action`, `actionRow`, `field`, `check`, `chip`, `note`, `metric`, `summary`, `emptyState`, `list`, `table`, `prime`, `plotView`, `scientificPlot`, `legend`, `portable`, `menu` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `pulse-import` | `data-provider` | `provider` | `function` |
| `pulse-sampler-tool` | `scientific-tool` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `header`, `toolbar`, `action`, `actionRow`, `tabs`, `field`, `chip`, `note`, `table`, `scientificPlot`, `prime` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `resonance-detector-robust` | `algorithm-provider` | `provider` | `function` |
| `resonance-workbench` | `scientific-workbench` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `section`, `header`, `toolbar`, `action`, `actionRow`, `field`, `check`, `chip`, `note`, `metric`, `summary`, `divider`, `emptyState`, `list`, `parameterForm`, `table`, `prime`, `plotView`, `plotGroup`, `scientificPlot`, `legend`, `floatingChrome`, `portable`, `dialog`, `menu`, `popover`, `status` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `scientific-data-contracts` | `foundation-provider` | `provider` | `function` |
| `shell-navigation` | `shell-provider` | `provider` | `function` |
| `standard-transport-algorithms` | `algorithm-provider` | `provider` | `function` |
| `status-monitor` | `foundation-ui` | `layout`, `status`, `popover`, `surface`, `header`, `toolbar`, `action`, `chip`, `list`, `meter` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `ter-analysis` | `scientific-workbench` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `header`, `toolbar`, `action`, `actionRow`, `field`, `check`, `chip`, `note`, `summary`, `parameterForm`, `table`, `prime`, `plotView`, `plotGroup`, `scientificPlot`, `legend`, `portable`, `menu` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `thin-glass-theme` | `theme-provider` | `provider` | `function` |
| `transfer-vth-lab` | `scientific-workbench` | `page`, `pageHeader`, `workspace`, `layout`, `surface`, `panel`, `section`, `header`, `toolbar`, `action`, `actionRow`, `field`, `check`, `chip`, `note`, `metric`, `table`, `prime`, `scientificPlot`, `splitHandle`, `splitPane` | `function`, `structure`, `geometry`, `style`, `interaction`, `responsive`, `mobile` |
| `workspace-safeguards` | `foundation-provider` | `provider` | `function` |

### Native region recipes

#### _template

- `page` → `page` / `analysis` (role=activity-root)
- `header` → `pageHeader` / `page-owned` (role=activity-header)
- `workspace` → `workspace` / `standard` (role=workspace)
- `component-content` → `componentTree` / `schema` (role=domain-content)
- `controls` → `prime` / `canonical-header` (role=data-control)
- `main` → `scientificPlot` / `curve` (role=scientific-primary)

#### aurora-pop-theme

- `theme` → `provider` / `theme` (role=theme-provider)

#### connectivity-center

- `status-entry` → `status` / `compact` (role=statusbar)
- `smb-window` → `movableWindow` / `dialog` (role=service-window)
- `assistant-settings-window-move` → `movableWindow` / `dialog` (role=assistant-settings)
- `service-popover` → `popover` / `service` (role=service-control)
- `service-overlay` → `layout` / `overlay-center` (role=service-overlay)
- `service-window` → `layout` / `service-window` (role=service-window)
- `service-split` → `layout` / `sidebar-main-compact` (role=service-browser)
- `browser-rows` → `layout` / `browser-rows` (role=service-browser-body)
- `file-row` → `layout` / `list-row-file` (role=file-browser-row)
- `assistant-settings-window` → `layout` / `settings-window` (role=assistant-settings)
- `assistant-message-stack` → `layout` / `scroll-stack` (role=assistant-messages)
- `assistant-reference-strip` → `layout` / `wrap-strip` (role=assistant-references)
- `assistant-mention-row` → `layout` / `mention-row` (role=assistant-mentions)
- `connection-grid` → `layout` / `connection-grid` (role=connection-form)
- `ai-form-grid` → `layout` / `form-grid-2` (role=settings-form)
- `chat-rows` → `layout` / `chat-rows` (role=assistant-chat)
- `compose-row` → `layout` / `compose-row` (role=assistant-compose)
- `messages` → `message` / `assistant` (role=assistant-message)
- `divider` → `divider` / `horizontal` (role=service-separator)
- `empty` → `emptyState` / `standard` (role=service-empty)
- `service-list` → `list` / `selectable` (role=connections)
- `connection-fields` → `field` / `integrated` (role=connection-form)
- `service-actions` → `toolbar` / `ordinary` (role=commands)
- `service-menu` → `menu` / `dropdown` (role=provider-menu)

#### data-center

- `page` → `page` / `data` (role=activity-root)
- `header` → `pageHeader` / `page-owned` (role=activity-header)
- `workspace` → `workspace` / `standard` (role=data-workspace)
- `desktop-split` → `layout` / `sidebar-main-wide` (role=data-browser)
- `artifact-list` → `layout` / `artifact-list` (role=artifact-list)
- `artifact-row` → `layout` / `artifact-row` (role=artifact-row)
- `primary-flow` → `layout` / `primary-flow` (role=primary-flow)
- `filter-grid` → `layout` / `form-grid-2` (role=filters)
- `selection-grid` → `layout` / `action-grid-4` (role=selection-actions)
- `preview-fields` → `parameterForm` / `auto-fit` (role=chart-parameters)
- `parameter-forms` → `parameterForm` / `auto-fit` (role=workflow-parameters)
- `formula-grid` → `layout` / `formula-grid` (role=formula-parameters)
- `workflow-toolbar` → `layout` / `toolbar-bottom` (role=workflow-toolbar)
- `workflow-step-head` → `layout` / `workflow-step-head` (role=workflow-step-header)
- `provenance-list` → `layout` / `provenance-list` (role=provenance-list)
- `provenance-row` → `layout` / `provenance-row` (role=provenance)
- `source-actions` → `layout` / `toolbar-wrap` (role=source-actions)
- `summary` → `summary` / `strip` (role=data-summary)
- `empty` → `emptyState` / `standard` (role=data-empty)
- `objects` → `prime` / `fixed-titleless` (role=data-control, placements=left)
- `chart-preview` → `prime` / `canonical-header` (role=scientific-secondary)
- `chart` → `plotView` / `prime-contained` (role=data-preview)
- `table` → `table` / `standard` (role=data-preview)
- `workflow` → `list` / `plain` (role=recipe-steps)
- `dialogs` → `dialog` / `standard` (role=workflow-dialogs)
- `context` → `menu` / `context` (role=data-context)

#### flexible-import

- `import` → `provider` / `data` (role=data-provider)

#### pulse-analysis

- `page` → `page` / `analysis` (role=activity-root)
- `header` → `pageHeader` / `page-owned` (role=activity-header)
- `workspace` → `workspace` / `standard` (role=scientific-workspace)
- `primary-stack` → `layout` / `stack-comfortable` (role=primary-flow)
- `control-grid` → `layout` / `form-grid` (role=parameter-grid)
- `inline-range` → `layout` / `inline-range` (role=range-control)
- `result-cards` → `layout` / `two-card-grid` (role=results-plots)
- `file-head` → `layout` / `active-file-head` (role=active-file)
- `file-toolbar` → `layout` / `file-toolbar` (role=file-toolbar)
- `file-list` → `layout` / `artifact-list` (role=file-list)
- `file-item` → `layout` / `list-row-selectable` (role=file-list-item)
- `batch-file-row` → `layout` / `batch-file-row` (role=file-item-content)
- `compare-actions` → `layout` / `compare-actions` (role=compare-actions)
- `result-visual-stack` → `layout` / `stack` (role=results-visual)
- `summary` → `summary` / `row` (role=analysis-summary)
- `empty` → `emptyState` / `standard` (role=file-empty)
- `controls` → `prime` / `fixed-titleless` (role=data-control, placements=left/global/right/bottom)
- `raw-plot` → `plotView` / `complete` (role=raw-diagnostic-plot)
- `result-plots` → `plotView` / `complete` (role=pulse-result-plots)
- `canvas` → `scientificPlot` / `curve` (role=pulse-plot-canvas)
- `legend` → `legend` / `strip` (role=series-legend)
- `menu` → `menu` / `dropdown` (role=plot-actions)

#### pulse-import

- `import` → `provider` / `data` (role=data-provider)

#### pulse-sampler-tool

- `page` → `page` / `tool` (role=activity-root)
- `header` → `pageHeader` / `page-owned` (role=activity-header)
- `workspace` → `workspace` / `standard` (role=tool-workspace)
- `shell` → `layout` / `tool-sidebar-main` (role=tool-shell)
- `designer-stack` → `layout` / `stack-comfortable` (role=designer)
- `card-header` → `header` / `panel` (role=tool-card-header)
- `parameter-grid` → `layout` / `form-grid-2` (role=parameter-grid)
- `label-control` → `layout` / `control-label-row` (role=label-control)
- `segment-bar` → `layout` / `segment-bar` (role=segment-bar)
- `wave-rows` → `layout` / `fill-rows` (role=waveform-region)
- `analysis-controls` → `layout` / `analysis-control-grid` (role=analysis-controls)
- `result-controls` → `layout` / `result-control-grid` (role=result-controls)
- `result-grid` → `layout` / `result-grid-asymmetric` (role=result-grid)
- `controls` → `prime` / `fixed-titleless` (role=data-control, placements=left)
- `plot` → `scientificPlot` / `curve` (role=waveform)
- `results` → `table` / `standard` (role=sampling-results)

#### resonance-detector-robust

- `detector` → `provider` / `algorithm` (role=algorithm-provider)

#### resonance-workbench

- `workspace` → `workspace` / `accepted-scientific` (role=scientific-workspace)
- `primary-layout` → `layout` / `accepted-main-area` (role=scientific-primary)
- `dataset-row` → `layout` / `dataset-row` (role=dataset-row)
- `dataset-transform` → `layout` / `dataset-transform-row` (role=dataset-transform)
- `detector-parameters` → `parameterForm` / `standard` (role=detector-parameters)
- `advanced-settings` → `section` / `disclosure` (role=detector-advanced)
- `inspector-kv` → `layout` / `key-value-standard` (role=inspector-values)
- `inspector-section` → `layout` / `inspector-section` (role=inspector-section)
- `choice-grid` → `layout` / `palette-grid` (role=classification-choices)
- `result-grid` → `layout` / `responsive-two-column` (role=derived-results)
- `gate-controls` → `layout` / `gate-controls` (role=gate-controls)
- `inspector-actions` → `layout` / `action-grid-2` (role=inspector-actions)
- `derived-grid` → `layout` / `two-card-grid` (role=derived-results)
- `summary-row` → `summary` / `row` (role=derived-summary)
- `empty` → `emptyState` / `standard` (role=group-empty)
- `main-tools` → `floatingChrome` / `accepted-main` (role=plot-tools)
- `legend` → `legend` / `accepted-main` (role=series-legend)
- `parameters` → `prime` / `accepted-scientific-data-control` (role=data-control, placements=left)
- `inspector` → `prime` / `accepted-scientific-inspector` (role=inspector, placements=global/right/bottom/float)
- `group` → `plotGroup` / `accepted-scientific` (role=scientific-secondary, header=standard, density=regular)
- `group-plots` → `plotView` / `complete` (role=group-child)
- `plot-canvas` → `scientificPlot` / `curve` (role=plot-canvas)
- `status` → `status` / `accepted-summary` (role=summary)
- `dialogs` → `dialog` / `standard` (role=domain-dialogs)
- `menus` → `menu` / `context` (role=domain-context)

#### scientific-data-contracts

- `contracts` → `provider` / `foundation` (role=foundation-provider)

#### shell-navigation

- `navigation` → `provider` / `foundation` (role=shell-provider)

#### standard-transport-algorithms

- `algorithms` → `provider` / `algorithm` (role=algorithm-provider)

#### status-monitor

- `status` → `status` / `compact` (role=statusbar)
- `memory-meter` → `meter` / `thin` (role=memory-usage)
- `status-row` → `layout` / `row` (role=status-content)
- `memory` → `popover` / `status` (role=memory-popover)
- `theme` → `popover` / `picker` (role=theme-popover)
- `list` → `list` / `compact` (role=memory-components)
- `actions` → `toolbar` / `header` (role=popover-actions)

#### ter-analysis

- `workspace` → `workspace` / `standard` (role=scientific-workspace)
- `control-row` → `layout` / `row-wrap` (role=analysis-controls)
- `transform-parameters` → `parameterForm` / `standard` (role=transform-parameters)
- `resistance-card` → `layout` / `resistance-card` (role=resistance-card)
- `plot-header` → `layout` / `card-title-row` (role=plot-header)
- `heatmap-square` → `layout` / `square-plot` (role=heatmap-canvas)
- `summary` → `summary` / `strip` (role=ter-summary)
- `controls` → `prime` / `fixed-titleless` (role=data-control, placements=left/global/right/bottom)
- `group` → `plotGroup` / `comfortable` (role=scientific-secondary, header=standard, density=comfortable)
- `plots` → `plotView` / `complete` (role=group-child)
- `canvas` → `scientificPlot` / `heatmap` (role=plot-canvas)
- `legend` → `legend` / `strip` (role=plot-legend)
- `menu` → `menu` / `dropdown` (role=plot-actions)

#### thin-glass-theme

- `theme` → `provider` / `theme` (role=theme-provider)

#### transfer-vth-lab

- `page` → `page` / `analysis` (role=activity-root)
- `header` → `pageHeader` / `page-owned` (role=activity-header)
- `workspace` → `workspace` / `standard` (role=scientific-workspace)
- `sidebar-stack` → `layout` / `stack-comfortable` (role=controls-layout)
- `main-rows` → `layout` / `fill-rows` (role=main-layout)
- `metric-grid` → `layout` / `metric-grid` (role=results-summary)
- `result-split` → `layout` / `split-results` (role=results-layout)
- `controls` → `prime` / `fixed-titleless` (role=data-control, placements=left)
- `plot` → `panel` / `plot-card` (role=primary-plot)
- `canvas` → `scientificPlot` / `curve` (role=plot-canvas)
- `metrics` → `metric` / `standard` (role=results-summary)
- `results` → `table` / `standard` (role=results-table)
- `split` → `splitHandle` / `horizontal` (role=results-split)
- `results-split-controller` → `splitPane` / `resizable` (role=results-layout)

#### workspace-safeguards

- `safeguards` → `provider` / `foundation` (role=foundation-provider)


## Native structural control census

This census is generated directly from the frozen native plugin source. It is reconstruction evidence, not a second runtime implementation.

| Native plugin | Buttons | Fields | Selects | Checks | Tables |
|---|---:|---:|---:|---:|---:|
| `_template` | 0 | 0 | 0 | 0 | 0 |
| `aurora-pop-theme` | 0 | 0 | 0 | 0 | 0 |
| `connectivity-center` | 22 | 10 | 2 | 2 | 0 |
| `data-center` | 3 | 0 | 0 | 0 | 0 |
| `flexible-import` | 0 | 0 | 0 | 0 | 0 |
| `pulse-analysis` | 0 | 0 | 0 | 1 | 0 |
| `pulse-import` | 0 | 0 | 0 | 0 | 0 |
| `pulse-sampler-tool` | 0 | 0 | 0 | 0 | 0 |
| `resonance-detector-robust` | 0 | 0 | 0 | 0 | 0 |
| `resonance-workbench` | 8 | 3 | 1 | 3 | 0 |
| `scientific-data-contracts` | 0 | 0 | 0 | 0 | 0 |
| `shell-navigation` | 0 | 0 | 0 | 0 | 0 |
| `standard-transport-algorithms` | 0 | 0 | 0 | 0 | 0 |
| `status-monitor` | 7 | 0 | 0 | 0 | 0 |
| `ter-analysis` | 0 | 0 | 0 | 0 | 0 |
| `thin-glass-theme` | 0 | 0 | 0 | 0 | 0 |
| `transfer-vth-lab` | 0 | 0 | 0 | 0 | 0 |
| `workspace-safeguards` | 0 | 0 | 0 | 0 | 0 |


## Native private-geometry migration census

Every geometry-bearing rule in the frozen native plugin CSS must map to a public Unit or public layout recipe before that plugin can be migrated without copying private geometry.

| Native plugin | Geometry mappings |
|---|---:|
| `connectivity-center` | 40 |
| `data-center` | 41 |
| `pulse-analysis` | 43 |
| `resonance-workbench` | 52 |
| `ter-analysis` | 22 |
| `transfer-vth-lab` | 18 |

### Geometry mapping details

#### connectivity-center

- `dksvc-overlay` → `layout` / `overlay-center` (role=`service-overlay`, mechanism=`recipe+accepted-geometry`)
- `dksvc-(?:window|head|sub|close)` → `popover` / `service` (role=`service-window`, mechanism=`unit+accepted-geometry`)
- `dksmb-window` → `layout` / `service-window` (role=`file-service-window`, mechanism=`recipe+accepted-geometry`)
- `dksmb-layout` → `layout` / `sidebar-main-compact` (role=`file-service-layout`, mechanism=`recipe+accepted-geometry`)
- `dksmb-nav-title` → `layout` / `row-between` (role=`navigation-header`, mechanism=`recipe+accepted-geometry`)
- `dksmb-nav-row` → `list` / `selectable` (role=`navigation-item`, mechanism=`unit+accepted-geometry`)
- `dksmb-nav` → `layout` / `scroll-pane` (role=`navigation-scroll`, mechanism=`recipe+accepted-geometry`)
- `dksmb-browser` → `layout` / `browser-rows` (role=`browser-body`, mechanism=`recipe+accepted-geometry`)
- `dksmb-toolbar` → `toolbar` / `ordinary` (role=`browser-toolbar`, mechanism=`unit+accepted-geometry`)
- `dksmb-(?:btn|primary)` → `action` / `secondary` (role=`browser-action`, mechanism=`unit+accepted-geometry`)
- `dksmb-path` → `field` / `integrated` (role=`path-field`, mechanism=`unit+accepted-geometry`)
- `dksmb-(?:list-head|row)` → `layout` / `list-row-file` (role=`file-row`, mechanism=`recipe+accepted-geometry`)
- `dksmb-list` → `layout` / `scroll-pane` (role=`file-list`, mechanism=`recipe+accepted-geometry`)
- `dksmb-(?:name|foot-note)` → `list` / `plain` (role=`truncate-content`, mechanism=`unit+accepted-geometry`)
- `dksmb-empty` → `emptyState` / `standard` (role=`empty`, mechanism=`unit+accepted-geometry`)
- `dksmb-connection` → `layout` / `connection-grid` (role=`connection-form`, mechanism=`recipe+accepted-geometry`)
- `dksmb-guest` → `layout` / `row` (role=`guest-option`, mechanism=`recipe+accepted-geometry`)
- `dksmb-foot` → `layout` / `row-between` (role=`footer`, mechanism=`recipe+accepted-geometry`)
- `dkai-window` → `layout` / `settings-window` (role=`assistant-settings-window`, mechanism=`recipe+accepted-geometry`)
- `dkai-settings-body` → `layout` / `scroll-pane` (role=`settings-scroll`, mechanism=`recipe+accepted-geometry`)
- `dkai-section(?:-title)?` → `section` / `controls` (role=`settings-section`, mechanism=`unit+accepted-geometry`)
- `dkai-grid` → `layout` / `form-grid-2` (role=`settings-grid`, mechanism=`recipe+accepted-geometry`)
- `dkai-field` → `field` / `integrated` (role=`settings-field`, mechanism=`unit+accepted-geometry`)
- `dkai-actions` → `toolbar` / `ordinary` (role=`settings-actions`, mechanism=`unit+accepted-geometry`)
- `dkai-(?:statusline|mcp-state)` → `status` / `compact` (role=`assistant-status`, mechanism=`unit+accepted-geometry`)
- `dkai-help` → `note` / `normal` (role=`help`, mechanism=`unit+accepted-geometry`)
- `dkai-chat$` → `layout` / `chat-rows` (role=`assistant-chat`, mechanism=`recipe+accepted-geometry`)
- `dkai-chat-head` → `header` / `panel` (role=`assistant-chat-header`, mechanism=`unit+accepted-geometry`)
- `dkai-chat-dot` → `status` / `dot` (role=`assistant-state`, mechanism=`unit+accepted-geometry`)
- `dkai-messages` → `layout` / `scroll-stack` (role=`message-scroll`, mechanism=`recipe+accepted-geometry`)
- `dkai-msg(?:-meta)?` → `message` / `assistant` (role=`message`, mechanism=`unit+accepted-geometry`)
- `dkai-refbar` → `layout` / `wrap-strip` (role=`reference-strip`, mechanism=`recipe+accepted-geometry`)
- `dkai-ref$` → `chip` / `quiet` (role=`reference`, mechanism=`unit+accepted-geometry`)
- `dkai-compose$` → `surface` / `base` (role=`compose-surface`, mechanism=`unit+accepted-geometry`)
- `dkai-compose-row` → `layout` / `compose-row` (role=`compose-row`, mechanism=`recipe+accepted-geometry`)
- `dkai-input` → `field` / `textarea` (role=`compose-input`, mechanism=`unit+accepted-geometry`)
- `dkai-send` → `action` / `primary` (role=`send`, mechanism=`unit+accepted-geometry`)
- `dkai-compose-hint` → `note` / `normal` (role=`compose-hint`, mechanism=`unit+accepted-geometry`)
- `dkai-mentions` → `popover` / `service` (role=`mention-picker`, mechanism=`unit+accepted-geometry`)
- `dkai-mention(?:-label|-detail)?` → `layout` / `mention-row` (role=`mention-row`, mechanism=`recipe+accepted-geometry`)

#### data-center

- `data-center-body` → `layout` / `sidebar-main-wide` (role=`data-workspace`, mechanism=`recipe+accepted-geometry`)
- `dc-card` → `panel` / `plain` (role=`data-card`, mechanism=`unit+accepted-geometry`)
- `dc-artifact-pane` → `layout` / `sticky-stack` (role=`artifact-pane`, mechanism=`recipe+accepted-geometry`)
- `dc-chart-provider` → `surface` / `base` (role=`chart-provider`, mechanism=`unit+accepted-geometry`)
- `dcPlotViewActions` → `toolbar` / `header` (role=`plot-actions`, mechanism=`unit+accepted-geometry`)
- `dc-assignment-filter` → `field` / `select` (role=`assignment-filter`, mechanism=`unit+accepted-geometry`)
- `dc-filter-stack` → `layout` / `stack` (role=`filter-stack`, mechanism=`recipe+accepted-geometry`)
- `dc-filter-row` → `layout` / `form-grid-2` (role=`filter-row`, mechanism=`recipe+accepted-geometry`)
- `dc-field-filter` → `field` / `integrated` (role=`filter-field`, mechanism=`unit+accepted-geometry`)
- `dc-selection-tools` → `layout` / `action-grid-4` (role=`selection-actions`, mechanism=`recipe+accepted-geometry`)
- `dc-artifact-list` → `layout` / `artifact-list` (role=`artifact-list`, mechanism=`recipe+accepted-geometry`)
- `dc-artifact-item` → `layout` / `artifact-row` (role=`artifact-row`, mechanism=`recipe+accepted-geometry`)
- `dc-artifact-(?:copy|name|meta|check)` → `list` / `selectable` (role=`artifact-item-content`, mechanism=`unit+accepted-geometry`)
- `dc-main` → `layout` / `primary-flow` (role=`primary-flow`, mechanism=`recipe+accepted-geometry`)
- `dc-source-preview` → `panel` / `headed` (role=`source-preview`, mechanism=`unit+accepted-geometry`)
- `dc-table-preview` → `layout` / `scroll-pane` (role=`table-preview`, mechanism=`recipe+accepted-geometry`)
- `dc-json-preview` → `note` / `normal` (role=`json-preview`, mechanism=`unit+accepted-geometry`)
- `dc-preview-table` → `table` / `standard` (role=`preview-table`, mechanism=`unit+accepted-geometry`)
- `dc-tool-pane` → `section` / `controls` (role=`tool-pane`, mechanism=`unit+accepted-geometry`)
- `dc-chart-pane` → `plotView` / `prime-contained` (role=`chart-preview`, mechanism=`unit+accepted-geometry`)
- `dc-chart(?:$|[^-])` → `scientificPlot` / `curve` (role=`chart-canvas`, mechanism=`unit+accepted-geometry`)
- `dc-chart-params` → `parameterForm` / `auto-fit` (role=`chart-parameter-grid`, mechanism=`unit+accepted-geometry`)
- `schema-param-field|dkds-field-control` → `field` / `integrated` (role=`schema-field`, mechanism=`unit+accepted-geometry`)
- `dcFormulaParams` → `layout` / `formula-grid` (role=`formula-grid`, mechanism=`recipe+accepted-geometry`)
- `schema-parameter-panel|schema-param-help` → `section` / `controls` (role=`schema-panel`, mechanism=`unit+accepted-geometry`)
- `dc-inline-actions` → `layout` / `row` (role=`inline-actions`, mechanism=`recipe+accepted-geometry`)
- `dc-formula-refs` → `layout` / `wrap-strip` (role=`formula-reference-strip`, mechanism=`recipe+accepted-geometry`)
- `dc-ref-chip` → `chip` / `quiet` (role=`formula-reference`, mechanism=`unit+accepted-geometry`)
- `dc-recipe-bar|dc-add-step` → `layout` / `toolbar-bottom` (role=`workflow-toolbar`, mechanism=`recipe+accepted-geometry`)
- `dc-workflow-steps` → `list` / `plain` (role=`workflow-steps`, mechanism=`unit+accepted-geometry`)
- `dc-step-card` → `panel` / `plain` (role=`workflow-step`, mechanism=`unit+accepted-geometry`)
- `dc-step-head` → `layout` / `workflow-step-head` (role=`workflow-step-header`, mechanism=`recipe+accepted-geometry`)
- `dc-step-actions` → `toolbar` / `header` (role=`workflow-step-actions`, mechanism=`unit+accepted-geometry`)
- `dc-step-params` → `section` / `controls` (role=`workflow-step-parameters`, mechanism=`unit+accepted-geometry`)
- `dc-workflow-status` → `status` / `text` (role=`workflow-status`, mechanism=`unit+accepted-geometry`)
- `dc-provenance-list` → `layout` / `provenance-list` (role=`provenance-list`, mechanism=`recipe+accepted-geometry`)
- `dc-prov-item` → `layout` / `provenance-row` (role=`provenance-row`, mechanism=`recipe+accepted-geometry`)
- `dc-prov-main` → `list` / `plain` (role=`provenance-content`, mechanism=`unit+accepted-geometry`)
- `dc-source-actions` → `layout` / `toolbar-wrap` (role=`source-actions`, mechanism=`recipe+accepted-geometry`)
- `dc-tabs` → `tabs` / `standard` (role=`source-tabs`, mechanism=`unit+accepted-geometry`)
- `dkds-surface-heading|dkds-meta` → `header` / `panel` (role=`source-header-content`, mechanism=`unit+accepted-geometry`)

#### pulse-analysis

- `pulse-analysis-body` → `layout` / `stack-comfortable` (role=`analysis-flow`, mechanism=`recipe+accepted-geometry`)
- `pulse-page-header` → `pageHeader` / `page-owned` (role=`activity-header`, mechanism=`unit+accepted-geometry`)
- `pulse-(?:card|config-card)` → `panel` / `plain` (role=`analysis-card`, mechanism=`unit+accepted-geometry`)
- `pulse-control-rail` → `layout` / `stack-comfortable` (role=`control-rail`, mechanism=`recipe+accepted-geometry`)
- `pulse-control-grid` → `layout` / `form-grid` (role=`control-grid`, mechanism=`recipe+accepted-geometry`)
- `pulse-inline-range` → `layout` / `inline-range` (role=`range`, mechanism=`recipe+accepted-geometry`)
- `pulse-analyze-cell` → `layout` / `row` (role=`analyze-action`, mechanism=`recipe+accepted-geometry`)
- `pulse-summary(?:-grid|-placeholder|-error)?` → `summary` / `row` (role=`summary`, mechanism=`unit+accepted-geometry`)
- `pulse-stat-chip` → `metric` / `standard` (role=`summary-metric`, mechanism=`unit+accepted-geometry`)
- `pulse-plot-heading` → `header` / `plot` (role=`plot-heading`, mechanism=`unit+accepted-geometry`)
- `pulse-plot-surface` → `scientificPlot` / `curve` (role=`plot-canvas`, mechanism=`unit+accepted-geometry`)
- `pulse-raw-card` → `plotView` / `complete` (role=`raw-plot`, mechanism=`unit+accepted-geometry`)
- `pulse-raw-plot` → `scientificPlot` / `curve` (role=`raw-canvas`, mechanism=`unit+accepted-geometry`)
- `pulse-results-grid` → `layout` / `two-card-grid` (role=`results-grid`, mechanism=`recipe+accepted-geometry`)
- `pulse-result-card` → `panel` / `plot-card` (role=`result-card`, mechanism=`unit+accepted-geometry`)
- `pulse-result-plot` → `scientificPlot` / `curve` (role=`result-canvas`, mechanism=`unit+accepted-geometry`)
- `pulse-table-heading` → `header` / `panel` (role=`table-header`, mechanism=`unit+accepted-geometry`)
- `pulse-table-actions` → `toolbar` / `header` (role=`table-actions`, mechanism=`unit+accepted-geometry`)
- `pulse-table-wrap` → `layout` / `scroll-pane` (role=`result-table-scroll`, mechanism=`recipe+accepted-geometry`)
- `pulse-result-table` → `table` / `standard` (role=`result-table`, mechanism=`unit+accepted-geometry`)
- `pulse-file-manager-card` → `panel` / `headed` (role=`file-manager`, mechanism=`unit+accepted-geometry`)
- `pulse-file-manager-heading` → `header` / `panel` (role=`file-manager-header`, mechanism=`unit+accepted-geometry`)
- `pulse-file-toolbar` → `layout` / `file-toolbar` (role=`file-toolbar`, mechanism=`recipe+accepted-geometry`)
- `pulse-file-list` → `layout` / `artifact-list` (role=`file-list`, mechanism=`recipe+accepted-geometry`)
- `pulse-file-empty|pulse-current-empty` → `layout` / `empty-centered` (role=`empty`, mechanism=`recipe+accepted-geometry`)
- `pulse-batch-file-item` → `list` / `selectable` (role=`file-item`, mechanism=`unit+accepted-geometry`)
- `pulse-batch-file-main` → `layout` / `batch-file-row` (role=`file-item-main`, mechanism=`recipe+accepted-geometry`)
- `pulse-file-check` → `check` / `checkbox` (role=`file-select`, mechanism=`unit+accepted-geometry`)
- `pulse-batch-file-(?:text|label|name|meta)` → `list` / `plain` (role=`file-content`, mechanism=`unit+accepted-geometry`)
- `pulse-file-state` → `chip` / `quiet` (role=`file-state`, mechanism=`unit+accepted-geometry`)
- `pulse-file-summary` → `summary` / `strip` (role=`file-summary`, mechanism=`unit+accepted-geometry`)
- `pulse-current-file-actions` → `toolbar` / `header` (role=`current-file-actions`, mechanism=`unit+accepted-geometry`)
- `pulse-active-file-head` → `layout` / `active-file-head` (role=`active-file`, mechanism=`recipe+accepted-geometry`)
- `pulse-active-(?:path|meta)` → `list` / `plain` (role=`active-file-content`, mechanism=`unit+accepted-geometry`)
- `pulse-label-edit` → `field` / `integrated` (role=`label-editor`, mechanism=`unit+accepted-geometry`)
- `pulse-compare-toolbar-card` → `panel` / `plain` (role=`compare-toolbar`, mechanism=`unit+accepted-geometry`)
- `pulse-compare-actions` → `layout` / `compare-actions` (role=`compare-actions`, mechanism=`recipe+accepted-geometry`)
- `pulse-scope-action` → `layout` / `row` (role=`scope-action`, mechanism=`recipe+accepted-geometry`)
- `pulse-compared-summary` → `summary` / `strip` (role=`compare-summary`, mechanism=`unit+accepted-geometry`)
- `pulse-table-(?:label|source)` → `table` / `standard` (role=`table-cell`, mechanism=`unit+accepted-geometry`)
- `pulse-primary-surface` → `layout` / `stack` (role=`primary-surface`, mechanism=`recipe+accepted-geometry`)
- `pulse-results-visual-pane` → `layout` / `stack` (role=`results-visual`, mechanism=`recipe+accepted-geometry`)
- `pulse-results-table-card` → `panel` / `headed` (role=`results-table`, mechanism=`unit+accepted-geometry`)

#### resonance-workbench

- `resonance-dedicated-body|resonance-parity-root` → `workspace` / `accepted-scientific` (role=`accepted-workspace`, mechanism=`unit+accepted-geometry`)
- `respar-header-actions` → `toolbar` / `header` (role=`header-actions`, mechanism=`unit+accepted-geometry`)
- `respar-header-divider` → `divider` / `vertical` (role=`header-divider`, mechanism=`unit+accepted-geometry`)
- `respar-primary` → `layout` / `accepted-main-area` (role=`primary-layout`, mechanism=`recipe+accepted-geometry`)
- `respar-left-panel` → `prime` / `accepted-scientific-data-control` (role=`data-control`, mechanism=`unit+accepted-geometry`)
- `respar-scan-global|respar-detect-actions` → `layout` / `action-grid-2` (role=`action-grid`, mechanism=`recipe+accepted-geometry`)
- `respar-select-label|respar-inspect-controls|respar-label-editor` → `field` / `integrated` (role=`field-stack`, mechanism=`unit+accepted-geometry`)
- `respar-dataset-list` → `layout` / `scroll-pane` (role=`dataset-list`, mechanism=`recipe+accepted-geometry`)
- `reswin-dataset|respar-dataset-item` → `layout` / `dataset-row` (role=`dataset-row`, mechanism=`recipe+accepted-geometry`)
- `respar-dataset-(?:content|title)` → `list` / `plain` (role=`dataset-content`, mechanism=`unit+accepted-geometry`)
- `reswin-vg|reswin-dataset-transform|respar-dataset-vg` → `field` / `integrated` (role=`dataset-field`, mechanism=`unit+accepted-geometry`)
- `reswin-transform-row|respar-dataset-transform` → `layout` / `dataset-transform-row` (role=`dataset-transform`, mechanism=`recipe+accepted-geometry`)
- `respar-note` → `note` / `normal` (role=`note`, mechanism=`unit+accepted-geometry`)
- `respar-preset-row|respar-scan-toggle|respar-inspector-row` → `layout` / `row` (role=`inline-row`, mechanism=`recipe+accepted-geometry`)
- `respar-advanced` → `section` / `disclosure` (role=`advanced-section`, mechanism=`unit+accepted-geometry`)
- `respar-peak-legend` → `legend` / `strip` (role=`peak-legend`, mechanism=`unit+accepted-geometry`)
- `respar-peak-hit|respar-peak-point|category-pair-swatch` → `legend` / `strip` (role=`legend-mark`, mechanism=`unit+accepted-geometry`)
- `respar-main-area|respar-main-workspace|respar-plot-wrap` → `layout` / `accepted-main-workspace` (role=`main-workspace`, mechanism=`recipe+accepted-geometry`)
- `respar-main-plot-header` → `layout` / `accepted-main-header` (role=`main-plot-header`, mechanism=`recipe+accepted-geometry`)
- `respar-main-tools` → `floatingChrome` / `accepted-main` (role=`plot-tools`, mechanism=`unit+accepted-geometry`)
- `respar-main-legend|respar-legend-chip|respar-legend-line` → `legend` / `accepted-main` (role=`main-legend`, mechanism=`unit+accepted-geometry`)
- `respar-main-svg` → `scientificPlot` / `curve` (role=`main-plot`, mechanism=`unit+accepted-geometry`)
- `respar-status-row|respar-summary|respar-export-row` → `status` / `accepted-summary` (role=`status-summary`, mechanism=`unit+accepted-geometry`)
- `respar-hover-tip` → `popover` / `status` (role=`plot-tooltip`, mechanism=`unit+accepted-geometry`)
- `respar-(?:floating-panel|inspector-panel|group-panel|floating-header|floating-body|group-context)` → `portable` / `floating` (role=`portable-panel`, mechanism=`unit+accepted-geometry`)
- `respar-inspect-controls` → `layout` / `stack` (role=`inspector-controls`, mechanism=`recipe+accepted-geometry`)
- `reswin-kv|respar-inspector-kv` → `layout` / `key-value-standard` (role=`inspector-values`, mechanism=`recipe+accepted-geometry`)
- `respar-inline-actions` → `toolbar` / `ordinary` (role=`inspector-actions`, mechanism=`unit+accepted-geometry`)
- `respar-inspect-plot` → `scientificPlot` / `curve` (role=`inspector-plot`, mechanism=`unit+accepted-geometry`)
- `respar-group-toolbar|respar-group-cols` → `toolbar` / `header` (role=`group-toolbar`, mechanism=`unit+accepted-geometry`)
- `reswin-group-grid` → `plotGroup` / `accepted-scientific` (role=`group-grid`, mechanism=`unit+accepted-geometry`)
- `reswin-group-empty` → `emptyState` / `standard` (role=`group-empty`, mechanism=`unit+accepted-geometry`)
- `reswin-group-card` → `plotView` / `complete` (role=`group-plot`, mechanism=`unit+accepted-geometry`)
- `reswin-group-plot` → `scientificPlot` / `curve` (role=`group-canvas`, mechanism=`unit+accepted-geometry`)
- `respar-derived|respar-derived-header` → `section` / `result` (role=`derived-results`, mechanism=`unit+accepted-geometry`)
- `reswin-two-col|reswin-gate-grid|gate-analysis-grid` → `layout` / `responsive-two-column` (role=`result-grid`, mechanism=`recipe+accepted-geometry`)
- `reswin-medium-plot|reswin-feature-field-plot|gate-analysis-grid .analysis-chart` → `scientificPlot` / `curve` (role=`result-plot`, mechanism=`unit+accepted-geometry`)
- `reswin-feature-field-card` → `panel` / `plot-card` (role=`feature-card`, mechanism=`unit+accepted-geometry`)
- `reswin-report|gate-analysis-report` → `note` / `normal` (role=`report`, mechanism=`unit+accepted-geometry`)
- `reswin-gate-controls|gate-density-controls|gate-analysis-controls` → `layout` / `gate-controls` (role=`gate-controls`, mechanism=`recipe+accepted-geometry`)
- `respar-inspector-section|respar-inspector-transform` → `layout` / `inspector-section` (role=`inspector-section`, mechanism=`recipe+accepted-geometry`)
- `respar-inspector-hint` → `note` / `normal` (role=`inspector-hint`, mechanism=`unit+accepted-geometry`)
- `respar-inspector-action-grid` → `layout` / `action-grid-2` (role=`inspector-actions`, mechanism=`recipe+accepted-geometry`)
- `respar-peak-class-grid|resonance-detector-picker` → `layout` / `key-value-compact` (role=`classification-grid`, mechanism=`recipe+accepted-geometry`)
- `peak-category-palette|resonance-display-grid` → `layout` / `palette-grid` (role=`choice-grid`, mechanism=`recipe+accepted-geometry`)
- `peak-category-choice` → `check` / `radio` (role=`choice`, mechanism=`unit+accepted-geometry`)
- `analysis-inline-formula` → `note` / `normal` (role=`formula`, mechanism=`unit+accepted-geometry`)
- `gate-report-metrics` → `summary` / `row` (role=`report-metrics`, mechanism=`unit+accepted-geometry`)
- `gate-analysis-table-wrap` → `table` / `standard` (role=`result-table`, mechanism=`unit+accepted-geometry`)
- `reswin-spacing-controls` → `layout` / `form-grid` (role=`spacing-controls`, mechanism=`recipe+accepted-geometry`)
- `analysis-chart-card|analysis-table-wrap` → `panel` / `plot-card` (role=`result-surface`, mechanism=`unit+accepted-geometry`)
- `respar-data-list-title` → `header` / `section` (role=`data-list-title`, mechanism=`unit+accepted-geometry`)

#### ter-analysis

- `ter-workspace-main` → `layout` / `stack` (role=`primary-container`, mechanism=`recipe+accepted-geometry`)
- `ter-chart-grid` → `plotGroup` / `comfortable` (role=`scientific-group`, mechanism=`unit+accepted-geometry`)
- `heatmap-square-card` → `plotView` / `complete` (role=`heatmap-card`, mechanism=`unit+accepted-geometry`)
- `ter-resistance-card$` → `layout` / `resistance-card` (role=`resistance-card`, mechanism=`recipe+accepted-geometry`)
- `ter-resistance-card.dkds-portable-view` → `layout` / `portable-resistance-card` (role=`portable-resistance-card`, mechanism=`recipe+accepted-geometry`)
- `ter-card-title-row|ter-resistance-card-header` → `layout` / `card-title-row` (role=`plot-header`, mechanism=`recipe+accepted-geometry`)
- `ter-card-title-text` → `header` / `plot` (role=`plot-title`, mechanism=`unit+accepted-geometry`)
- `ter-chart-actions` → `toolbar` / `header` (role=`plot-actions`, mechanism=`unit+accepted-geometry`)
- `ter-chart-actions button|ter-resistance-card-header button` → `action` / `secondary` (role=`plot-action`, mechanism=`unit+accepted-geometry`)
- `ter-resistance-hint` → `note` / `meta` (role=`resistance-hint`, mechanism=`unit+accepted-geometry`)
- `ter-resistance-selection` → `summary` / `strip` (role=`resistance-selection`, mechanism=`unit+accepted-geometry`)
- `ter-layout-controls` → `layout` / `row-wrap` (role=`layout-controls`, mechanism=`recipe+accepted-geometry`)
- `ter-layout-controls strong` → `layout` / `row` (role=`layout-label`, mechanism=`recipe+accepted-geometry`)
- `ter-layout-controls label` → `layout` / `row` (role=`layout-field-row`, mechanism=`recipe+accepted-geometry`)
- `ter-layout-controls select` → `field` / `select` (role=`layout-select`, mechanism=`unit+accepted-geometry`)
- `ter-sticky-check` → `check` / `checkbox` (role=`sticky-option`, mechanism=`unit+accepted-geometry`)
- `ter-sticky-check input` → `check` / `checkbox` (role=`sticky-input`, mechanism=`unit+accepted-geometry`)
- `ter-heatmap-square` → `layout` / `square-plot` (role=`heatmap-canvas`, mechanism=`recipe+accepted-geometry`)
- `analysis-control-card.ter-controls input` → `field` / `analysis-control` (role=`parameter-field`, mechanism=`unit+accepted-geometry`)
- `heatmap-display-controls` → `layout` / `row-wrap` (role=`heatmap-controls`, mechanism=`recipe+accepted-geometry`)
- `heatmap-display-controls strong` → `layout` / `row` (role=`heatmap-control-label`, mechanism=`recipe+accepted-geometry`)
- `heatmap-display-controls select|heatmap-display-controls input` → `field` / `analysis-control` (role=`heatmap-control`, mechanism=`unit+accepted-geometry`)

#### transfer-vth-lab

- `dkds-vth-page-body|dkds-vth-workbench` → `workspace` / `standard` (role=`scientific-workspace`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-sidebar` → `layout` / `stack-comfortable` (role=`controls-stack`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-card$` → `panel` / `plain` (role=`card`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-card-body` → `section` / `controls` (role=`card-body`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-card-head|dkds-vth-card h3` → `header` / `panel` (role=`card-header`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-field` → `field` / `integrated` (role=`field`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-check` → `check` / `checkbox` (role=`check`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-hint` → `note` / `normal` (role=`hint`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-source-badge` → `chip` / `quiet` (role=`source-badge`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-main` → `layout` / `fill-rows` (role=`main`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-metrics` → `layout` / `metric-grid` (role=`metrics`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-metric` → `metric` / `standard` (role=`metric`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-content-split` → `layout` / `split-results` (role=`results-split`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-plot-card` → `layout` / `plot-card-fill` (role=`plot-card`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-plot-head` → `layout` / `plot-card-header` (role=`plot-header`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-plot-target` → `scientificPlot` / `curve` (role=`plot-canvas`, mechanism=`unit+accepted-geometry`)
- `dkds-vth-results-host` → `layout` / `scroll-pane` (role=`results-scroll`, mechanism=`recipe+accepted-geometry`)
- `dkds-vth-results-splitter` → `splitHandle` / `horizontal` (role=`splitter`, mechanism=`unit+accepted-geometry`)


## Core behavior service catalog

Unit Templates own reusable visual/composition units. Domain state and host/runtime behavior continue to use formal Core services. Every native plugin service dependency is inventoried so future Unit migration never reimplements a Core service privately.

| Service | Kind | Purpose |
|---|---|---|
| `activities` | `host-contribution` | Register host activities; visual chrome remains Host-owned. |
| `pages` | `host-contribution` | Register page/activity renderers. |
| `topWorkspace` | `presentation-contract` | Publish platform-neutral PRIMARY/PRIME/SUB semantics. |
| `unitTemplates` | `composition-service` | Strict Unit Template composition facade for canonical visual Units. |
| `workspaceSurface` | `workspace-runtime` | Create plugin workspace composition runtime. |
| `toolbar` | `host-contribution` | Register activity/global toolbar commands. |
| `statusBar` | `host-contribution` | Register status-bar contributions and priorities. |
| `menus` | `command-service` | Register/open menus; canonical Menu Unit owns visual menu composition. |
| `contextMenus` | `command-service` | Context-menu command routing. |
| `actions` | `command-service` | Mount canonical action groups. |
| `components` | `schema-service` | Mount schema-driven Core components. |
| `dom` | `lifecycle-dom-service` | Scoped DOM lookup/events/timers; not a visual styling API. |
| `layout` | `layout-service` | Low-level Core layout behavior. New visual compositions use Unit Templates. |
| `portable` | `portable-service` | Dock/float/global surface behavior; Unit portable wraps this service. |
| `plotViews` | `scientific-service` | PlotView lifecycle/export/portable behavior; Unit plotView is the strict composition facade. |
| `plotGroups` | `scientific-service` | PlotGroup runtime; Unit plotGroup is the strict composition facade. |
| `scientificPlot` | `scientific-service` | Scientific renderer and surface lifecycle. |
| `tables` | `data-service` | Managed table surfaces. |
| `selection` | `interaction-service` | Typed selection channels/models/reference projection. |
| `series` | `scientific-service` | Series registry and metadata. |
| `interaction` | `interaction-service` | Interaction runtime/facade. |
| `interactionBehaviors` | `interaction-service` | Declarative input intent profiles. |
| `shortcuts` | `interaction-service` | Scoped keyboard shortcuts. |
| `settings` | `state-service` | Typed plugin settings/defaults. |
| `edit` | `state-service` | Undo/edit transactions. |
| `dialogs` | `overlay-service` | Dialog lifecycle; Unit dialog owns canonical visual composition. |
| `theme` | `theme-service` | Theme provider/registration APIs; plugins must not own Core paint. |
| `parameters` | `schema-service` | Schema-driven parameter defaults/validation/rendering; visual rendering migrates through Unit parameterForm. |

### Formal retained Core service methods

Every direct native call that is not a Unit migration must appear here. This closes the third-path loophole.

| Method | Kind | Rule |
|---|---|---|
| `activities.add` | `host-contribution` | Activity identity/navigation contribution remains a Host service. |
| `pages.add` | `host-contribution` | Page lifecycle registration remains a Host service; page contents use Units. |
| `topWorkspace.register` | `presentation-contract` | Platform-neutral surface semantics remain a Core presentation service. |
| `theme.register` | `theme-provider` | Theme providers remain formal Core services. |
| `selection.model` | `state-service` | Selection models are behavior/state, not visual composition. |
| `selection.refs` | `state-service` | Selection references are behavior/state, not visual composition. |
| `series.register` | `scientific-service` | Series registration remains scientific state infrastructure. |
| `settings.define` | `state-service` | Typed settings remain Core state infrastructure. |
| `shortcuts.add` | `interaction-service` | Keyboard command binding remains a Core interaction service. |
| `interaction.create` | `interaction-service` | Interaction routing remains a Core behavior service. |
| `interactionBehaviors.create` | `interaction-service` | Behavior profiles remain Core interaction infrastructure. |
| `parameters.defaults` | `schema-service` | Parameter defaults are schema/state; visual rendering uses parameterForm Unit. |
| `scientificPlot.get` | `scientific-runtime` | Runtime lookup remains Core scientific behavior. |
| `scientificPlot.react` | `scientific-runtime` | Data/render update remains Core scientific behavior after Unit creation. |
| `scientificPlot.restyle` | `scientific-runtime` | Trace update remains Core scientific behavior after Unit creation. |
| `scientificPlot.relayout` | `scientific-runtime` | Viewport/layout update remains Core scientific behavior after Unit creation. |
| `scientificPlot.resize` | `scientific-runtime` | Renderer resize remains Core scientific behavior. |
| `scientificPlot.saveImage` | `scientific-runtime` | Scientific export operation remains Core behavior; PlotView exposes canonical UI. |
| `scientificPlot.purge` | `scientific-runtime` | Renderer lifecycle cleanup remains Core behavior. |
| `scientificPlot.scalarField` | `scientific-runtime` | Scientific data renderer remains Core behavior. |
| `dom.root` | `domain-content-helper` | Scoped root lookup is allowed; it may not become a visual owner. |
| `dom.query` | `domain-content-helper` | Scoped lookup is allowed; canonical units must still be created through Unit Templates. |
| `dom.all` | `domain-content-helper` | Scoped lookup is allowed; canonical units must still be created through Unit Templates. |
| `dom.create` | `domain-content-helper` | May create domain-content nodes only; canonical buttons/fields/headers/surfaces use Unit Templates. |
| `dom.append` | `domain-content-helper` | May attach domain content into Unit slots; not a layout/paint owner. |
| `dom.html` | `domain-content-helper` | May render domain-specific inner content; canonical UI anatomy may not be bypassed. |
| `dom.on` | `lifecycle-helper` | Scoped event cleanup remains Core lifecycle infrastructure. |
| `dom.frame` | `lifecycle-helper` | Frame scheduling is nonvisual lifecycle infrastructure. |
| `dom.timeout` | `lifecycle-helper` | Timer lifecycle is nonvisual infrastructure. |
| `dom.interval` | `lifecycle-helper` | Timer lifecycle is nonvisual infrastructure. |


### Native plugin service blueprints

#### _template

- Services: `actions`, `components`, `dom`, `interaction`, `interactionBehaviors`, `pages`, `workspaceSurface`
- Migration: `workspaceSurface.create` → Unit `workspace` × 1
- Migration: `actions.mount` → Unit `actionRow` × 1
- Migration: `components.mount` → Unit `componentTree` × 2

#### aurora-pop-theme

- Services: `theme`

#### connectivity-center

- Services: `dom`, `layout`, `menus`, `statusBar`
- Migration: `layout.move` → Unit `movableWindow` × 2
- Migration: `menus.add` → Unit `menu` × 2
- Migration: `statusBar.add` → Unit `status` × 2

#### data-center

- Services: `activities`, `contextMenus`, `dialogs`, `dom`, `interaction`, `interactionBehaviors`, `menus`, `pages`, `parameters`, `scientificPlot`, `selection`, `topWorkspace`, `unitTemplates`
- Migration: `menus.add` → Unit `menu` × 1
- Migration: `dialogs.confirm` → Unit `dialog` × 1
- Migration: `dialogs.prompt` → Unit `dialog` × 1
- Migration: `parameters.render` → Unit `parameterForm` × 1

#### flexible-import

- Services: none

#### pulse-analysis

- Services: `activities`, `dom`, `interaction`, `menus`, `pages`, `portable`, `scientificPlot`, `selection`, `topWorkspace`, `unitTemplates`
- Migration: `menus.add` → Unit `menu` × 1
- Migration: `portable.create` → Unit `portable` × 1

#### pulse-import

- Services: none

#### pulse-sampler-tool

- Services: `activities`, `dom`, `pages`, `topWorkspace`, `unitTemplates`

#### resonance-detector-robust

- Services: none

#### resonance-workbench

- Services: `actions`, `activities`, `contextMenus`, `dialogs`, `dom`, `edit`, `interaction`, `interactionBehaviors`, `menus`, `pages`, `scientificPlot`, `selection`, `series`, `settings`, `statusBar`, `toolbar`, `topWorkspace`, `unitTemplates`, `parameters`
- Migration: `toolbar.add` → Unit `toolbar` × 1
- Migration: `statusBar.add` → Unit `status` × 1
- Migration: `menus.add` → Unit `menu` × 1
- Migration: `parameters.render` → Unit `parameterForm` × 1

#### scientific-data-contracts

- Services: none

#### shell-navigation

- Services: none

#### standard-transport-algorithms

- Services: none

#### status-monitor

- Services: `dom`, `statusBar`
- Migration: `statusBar.add` → Unit `status` × 4
- Migration: `dom.style` → Unit `meter` × 1

#### ter-analysis

- Services: `activities`, `dom`, `interaction`, `menus`, `pages`, `portable`, `scientificPlot`, `selection`, `shortcuts`, `topWorkspace`, `unitTemplates`
- Migration: `menus.add` → Unit `menu` × 1
- Migration: `portable.create` → Unit `portable` × 1

#### thin-glass-theme

- Services: `theme`

#### transfer-vth-lab

- Services: `activities`, `dom`, `interactionBehaviors`, `pages`, `settings`, `topWorkspace`, `unitTemplates`

#### workspace-safeguards

- Services: none

### Visual service migration map

- `ctx.ui.workspaceSurface.create` → `workspace`
- `ctx.ui.toolbar.add` → `toolbar`
- `ctx.ui.statusBar.add` → `status`
- `ctx.ui.menus.add` → `menu`
- `ctx.ui.actions.mount` → `actionRow`
- `ctx.ui.components.mount` → `componentTree`
- `ctx.ui.dialogs.confirm` → `dialog`
- `ctx.ui.dialogs.prompt` → `dialog`
- `ctx.ui.layout.move` → `movableWindow`
- `ctx.ui.layout.split` → `splitPane`
- `ctx.ui.dom.style` → `meter`
- `ctx.ui.portable.create` → `portable`
- `ctx.ui.plotViews.bind` → `plotView`
- `ctx.ui.plotGroups.create` → `plotGroup`
- `ctx.ui.scientificPlot.create` → `scientificPlot`
- `ctx.ui.tables.mount` → `table`
- `ctx.parameters.render` → `parameterForm`


## Scientific hard invariants

- `plotView`: a Unit PlotView is a complete data-plot unit. Header, title, movable position control and export affordance are mandatory.
- `plotGroup`: every scientific child is a complete Unit PlotView. Group header is either complete standard chrome or completely absent; no partial header is legal.
- `plotGroup`: row/column spacing is selected only through semantic density. Raw plugin-owned gap values are rejected.
- `scientificPlot`: base `scientific-standard-v1` gestures are Core-owned. Plugins may add only non-conflicting domain interactions.
- `portable`: drag, resize, placement, history and z-order remain Core-owned even when Unit Templates request accepted initial geometry.

