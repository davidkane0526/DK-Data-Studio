# DK Data Studio v3.61.1 Verification

## Regression fixed

The v3.61.0 Cartesian Plotly migration used the correct npm package but the wrong browser entry filename (`plotly.min.js`). The actual Cartesian distribution entry is `plotly-cartesian.min.js`. Because both the main renderer and dedicated TOP runtime referenced the nonexistent file, all Plotly-backed views could remain blank while calculations still completed.

## Corrected runtime paths

- `src/index.html`
- `src/core/chart-runtime.js`
- `src/plugin-window/runtime.js`
- `mobile/scripts/sync-web-assets.js`

All now reference `plotly.js-cartesian-dist-min/plotly-cartesian.min.js`.

## Gates

- `npm run check` — PASS
- `npm test` — PASS
- `npm run performance:test` — PASS
- `node scripts/test-plotly-cartesian-entry-v3611.js` — PASS
- `git diff --check` — PASS

The v3.61 FWHM drag and multi-view scheduling performance changes remain enabled.
