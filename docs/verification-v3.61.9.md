# DK Data Studio v3.61.9 verification

Scope: Core-owned Y-axis display scale, Plugin API 1.15 tool/algorithm contracts, plugin export, system Data Management placement, and non-disableable foundation/system plugins.

Verified gates:

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`

Dedicated regression: `scripts/test-system-tools-display-scale-v3619.js`.

Key invariants:

1. Y-axis double-click changes only the rendered linear/log scale. Source Artifacts, plugin data arrays, scientific state, and data-export payloads are not rewritten.
2. Non-positive samples remain stored and are simply not renderable on a standard logarithmic Y axis.
3. `pluginType: tool` contributions use the Core-owned top Tools menu. Tool plugins do not create shell buttons.
4. Algorithm Provider plugins remain first-class, versioned SDK plugins through `ctx.analysis.algorithms`.
5. Plugin Manager exports `.dkplugin` packages through desktop host IPC.
6. Data Center is a `foundation`/`systemCritical` system window reached from the system command bar, not an ordinary analysis activity.
7. Built-in foundation/system plugins remain enabled, cannot become SUPER, and reject disable requests even if stale user preferences exist.
