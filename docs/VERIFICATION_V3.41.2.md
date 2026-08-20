# DK Data Studio v3.41.2 Verification

## Scope

This patch keeps the v3.41 Core-first plugin architecture and changes only the shared Core PlotView button presentation. No plugin receives a private export implementation.

## Changes

- Core `PlotView` keeps the unified export menu, but the trigger is restyled into a cleaner pill button with a dedicated icon badge and readable label.
- The existing chart-position breadcrumb remains separate and unchanged.
- Plugin/domain-specific chart actions remain visible as independent actions.

## Verification

- `npm run check`: PASS.
- `npm test`: PASS.
- `node --check src/core/ui-infrastructure.js`: PASS.
- Visual inspection of the Core PlotView button markup/CSS confirmed the trigger now renders as a polished pill button with icon badge, label and active/open state feedback while preserving the same four export actions.
- `npm run dist` reached build preparation but the current server has no `electron-builder` installation, so Windows packaging could not be completed in this environment.

## Version

Application/runtime/resonance release version: `3.41.2`. Plugin API remains `1.8.0`.
