# DK Data Studio v3.61.10 verification

> Superseded behavior note (v3.61.11): the v3.61.10 heatmap-Y logarithmic interpretation in item 4 was incorrect. Heatmaps now keep X/Y coordinates unchanged and apply logarithmic display to the Z/color scale (`log10(|Z|)`). v3.61.11 also adds authoritative live Artifact hydration for Data Center.

Scope: universal Core display-scale behavior, absolute-value logarithmic view projection, legacy-project Artifact synchronization into already-open TOP/Data Center windows, system command grouping, and concise Edit labeling.

Verified gates:

- `npm run check`
- `npm test`
- `npm run performance:test`
- `npm run reactive:test`
- `npm run sdk:test`
- `npm run table-surface:test`
- `npm run host-neutralization:test`
- `git diff --check`

Dedicated regression: `scripts/test-universal-display-and-legacy-data-v36110.js` plus the updated `scripts/test-system-tools-display-scale-v3619.js`.

Key invariants:

1. Plotly charts owned by the host, ScientificPlot, PlotView, Data Center, TER and numeric scalar-field/heatmap consumers all pass through the base Core Chart Runtime; first-party plugins do not gain a special display-scale path.
2. ScientificCurveSurface uses the same display rule for D3 interactive curves. Double-clicking the Y axis or the left Y-label region toggles linear/log display.
3. Log mode is a view-only `|Y|` projection. Signed source arrays, Artifacts, plugin state, project persistence and CSV/data exports remain unchanged. `Y = 0` remains stored but is not drawable on a logarithmic axis.
4. Numeric heatmap Y coordinates use the same absolute-value logarithmic display projection. Category/date Y axes stay unchanged because they have no mathematical log-axis interpretation.
5. Legacy project restore rebuilds transient legacy DataTable Artifacts and publishes one complete Artifact delta to already-open Data Center/TOP windows; no Data Center-specific reload or project-format special case is required.
6. Data Management and Tools are rendered inside one system-command visual group; the Tools trigger has no nested border/shadow.
7. The top Edit menu is labeled `编辑`, and the Data Center object action is also labeled `编辑`.
8. Plugin API remains `1.15.0`; the current standalone SDK contract requires DK Data Studio `3.61.10` for the full universal display behavior.
