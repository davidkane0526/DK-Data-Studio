# DK Data Studio v3.41.3 Verification

## Scope

This patch changes only the shared Core PlotView export trigger presentation. Plugin behavior and the v1.8 Core-first architecture remain unchanged.

## Changes

- The generic chart-data/image trigger now uses the exact same Core chrome class as the chart-position trigger.
- The v3.41.2 pill background, label, badge and special shadow states are removed.
- The main glyph is now an outline file icon rendered with `currentColor`, 12 px geometry and a restrained 1.35 px stroke.
- The same small caret, spacing, button dimensions and hover behavior as chart position are retained.
- CSV, copy, SVG and PNG menu actions are unchanged.

## Verification

- `node --check src/core/ui-infrastructure.js`: PASS.
- `node scripts/test-plot-view-foundation.js`: PASS.
- `npm run check`: PASS, including science parity, plugin boundaries and first-party plugin lifecycle checks.
- The PlotView regression checks now require the export trigger to reuse `dkds-portable-placement-trigger` and require the Core-owned file glyph.

## Version

Application/runtime/resonance release version: `3.41.3`. Plugin API remains `1.8.0`.
