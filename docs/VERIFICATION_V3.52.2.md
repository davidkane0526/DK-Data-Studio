# DK Data Studio v3.52.2 Verification

v3.52.2 removes Plotly parse/evaluation from the blocking dedicated-TOP startup path. The plugin manifest still declares the Plotly capability, but `DKDSCharts` owns one lazy loader promise and loads the bundle on first real chart use.

## Required source checks

- `npm run plotly-lazy:test`
- `npm test`
- `npm run check`
- `npm run science:parity`
- `npm run ter:parity`

## Built-app automation target

Development Electron is expected to report 24 pass / 0 fail / 1 skip / 25 total; the only skip should be Packaged build identity. A packaged installer/portable build should report 25 pass / 0 fail / 0 skip.

For each dedicated TOP, `TOP startup phase profiling` must show no physical `plotly` dependency in `renderer.dependencies`, while `TOP lazy Plotly runtime contract` must show `declared: true` for the current four chart-based TOP plugins. `chartRuntime.status` may be `idle`, `loading`, or `ready` depending on whether the plugin requested a chart before the ready signal; the key requirement is that Plotly no longer blocks readiness.

The report should continue to require 4 discovered / 4 tested / 4 passed / 0 failed TOP renderers and the existing ready -> hide -> reuse -> show lifecycle.
