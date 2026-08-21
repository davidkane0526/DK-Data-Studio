# DK Data Studio v3.58.2 Verification

## Target regressions

- TER dedicated TOP calculation must receive a chart contract containing `scalarField()`.
- Resonance Vpk/Ipk group series must remain populated while optional peak-metrics results are pending.
- Removing one imported source must remove its canonical project dataset, source DataTable projection and lineage descendants without removing unrelated source datasets.

## Automated gates

```text
npm run check
npm test
npm run data-source-lifecycle:test
npm run sdk:test
npm run host-neutralization:test
git diff --check
```

## Built-in automation

Automation Runner `1.14.0` adds `Data Contract -> Project source data lifecycle`. A normal development run should now contain 32 cases before packaged-build-only skips are considered.

## Manual acceptance

1. Import the same multi-Vg dataset used for the reported regression.
2. Open TER TOP and calculate TER; the TER(Vd,Vg) heatmap and linked R-V curves must render without `charts.scalarField` errors.
3. Open Resonance group analysis; Vpk and Ipk plots must populate as soon as accepted peaks exist. FWHM and other metric plots may populate after their provider calculation, but must not blank Vpk/Ipk.
4. Open Data Center, select a directly imported source DataTable, click `移除源数据`, and confirm it disappears from the project and analysis plugins after refresh. Other imported files must remain.
