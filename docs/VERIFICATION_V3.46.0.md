# DK Data Studio v3.46.0 Verification

## Scope

v3.46.0 centralizes Plotly scientific interaction behavior and closes a coverage hole found by the first real v3.45.0 in-app automation report. The v3.45.0 report passed 10/10 tests, but its TOP list was empty because discovery incorrectly required `hasWindow=true`. In a normal clean session this meant no independent TOP renderer was exercised.

## ScientificPlot contract

Every Plotly view created or adopted through `ctx.ui.scientificPlot.react()` / `attach()` receives the shared controller surface:

- `selection`
- `legend`
- `tooltip`
- `focus`
- `pin`
- `viewport`
- `export`

The controller layer owns Plotly event binding and removes those bindings on dispose. Re-rendering must not duplicate handlers. Pin state and viewport state remain attached to the managed view, and viewport ranges are reapplied after a managed re-render unless the plugin opts out.

## In-app Automation Test Center

For the default desktop configuration with Data Center, Pulse, Resonance, and TER enabled, a complete run should produce 17 results:

1. Packaged build identity
2. Core Runtime
3. Application Shell DOM
4. Plugin activation & registry
5. Scientific Data Type Registry
6. Typed Selection Contract
7. Artifact Store & lineage round-trip
8. Project format round-trip
9. Scientific transform smoke
10. Plotly real renderer smoke
11. ScientificPlot shared interaction controllers
12. TOP renderer · Data Center
13. TOP renderer · Pulse / Read Analysis
14. TOP renderer · Resonance Workbench
15. TOP renderer · TER Analysis
16. TOP renderer coverage
17. Unhandled runtime errors during test

If Electron is running from source/development mode, `Packaged build identity` is intentionally **SKIP** and the remaining tests continue. For an installed or portable build it should **PASS**.

The report now contains `coverage.topRenderers.discovered`, `coverage.topRenderers.tested`, and the activity list. For the default configuration, both discovered and tested must be 4.

## Source verification

Run:

```bash
npm test
npm run check
git diff --check
```

Required regression scripts include:

```bash
node scripts/test-scientific-plot-runtime-v342.js
node scripts/test-scientific-plot-interactions-v346.js
node scripts/test-scientific-plot-adoption-v346.js
node scripts/test-automation-test-center-v345.js
node scripts/test-automation-test-center-v346.js
node scripts/test-top-window-lifecycle.js
```

## User-side post-build verification

Open **软件管理 → 自动化测试 → 运行全部自动化测试** in the actual installer/portable build. Send the generated `dkds-automation-3.46.0-*.json` report back for analysis. No project experimental values are included in the report.
