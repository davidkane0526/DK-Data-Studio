# DK Data Studio v3.41.1 Verification

## Scope

This patch keeps the v3.41 Core-first plugin architecture and changes only shared Core UI infrastructure. No plugin receives a private export or responsive-menu implementation.

## Changes

- Core `PlotView` now exposes one compact export breadcrumb containing Data CSV, Copy Data, SVG and PNG.
- The existing chart-position breadcrumb remains separate and unchanged.
- Plugin/domain-specific chart actions remain visible as independent actions.
- The shell's responsive `更多功能` trigger now opens a body-level Core `ContextMenu`, avoiding clipping by the commandbar at narrow widths.
- `ContextMenu` now has an `onClose` lifecycle hook so trigger accessibility state is synchronized.

## Verification

- `npm run check`: PASS.
- `npm test`: PASS.
- Chromium/Xvfb CDP runtime check: PlotView export dropdown rendered with four entries and its Copy action dispatched through the original Core handler.
- Chromium/Xvfb CDP narrow-shell check: responsive overflow menu was attached to `BODY`, remained visible outside an `overflow:hidden` commandbar, and dispatched the original toolbar action.
- Visual inspection confirmed the export trigger uses the same compact icon + caret geometry as the chart-position breadcrumb.
- `npm run dist` reached build preparation but the current server has no `electron-builder` installation, so Windows packaging could not be completed in this environment.

## Version

Application/runtime/resonance release version: `3.41.1`. Plugin API remains `1.8.0`.
