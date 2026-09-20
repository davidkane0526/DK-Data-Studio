# TER R–V Source-Anatomy Fix — v3.71.11 WIP

## Windows acceptance trigger

The real Windows Electron screenshot showed three first-row TER cards. The first two heatmap cards rendered, while the third `R–V 全 Vg · 正扫 / 反扫` card retained only its header, explanatory hint and the initial `尚未选择 TER 数据点。` status. No R–V chart was drawn.

## Root cause

The production feature runtime intentionally resolves the accepted R–V card with `#terResistanceCard` before it performs any R–V rendering or selection-status update. The Unit source-parity reconstruction preserved the plot id (`terResistancePlot`) and selection-status id (`terResistanceSelection`) but omitted the accepted card id itself. `ensureResistanceCard()` therefore returned `null` and `renderResistanceBase()` failed closed at its first guard.

The initial status text in the screenshot is consistent with this exact early-return path: once `renderResistanceBase()` runs successfully, that text is replaced by the calculated/no-result or all-Vg status.

## Fix

`src/plugins/ter-analysis/unit-presentation.js` now restores `id="terResistanceCard"` on the Unit-composed resistance card. This is a presentation/source-anatomy repair only. The production analysis service, controller, numeric pipeline, feature runtime and scientific renderer remain unchanged and singular. Core remains domain-blind.

The existing v3.71.10 source-parity gate now asserts that the accepted card id remains present.

## First-two-card overlap observation

The screenshot does not show the first two card boxes geometrically overlapping; they remain separated by the accepted PlotGroup gap. Their layered/overlap impression is amplified by equal-row stretching, the square heatmap plot body and adjacent card/material shadows while the R–V member of the same row is structurally incomplete. v3.71.11 deliberately does **not** change the accepted TER geometry stylesheet or its 14 px gap. The R–V anatomy is restored first, then Windows Electron should be compared again before any geometry parameter is changed.

## Contract versions

- App: 3.71.11 WIP
- SDK: 1.51.10 (unchanged)
- Plugin API: 1.19.0 (unchanged)
- Unit Templates: 2.5.6 / 41 Units (unchanged)
- Theme Contract: 3.10.0 (unchanged)
- Android versionCode: 152
