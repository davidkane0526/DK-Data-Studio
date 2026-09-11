const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('src/generated/runtime/ui-infrastructure.js');
const peaks=read('src/science/peaks.js');
const terScience=read('src/science/ter.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const terView=read('src/plugins/ter-analysis/shared-views.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const resonancePeak=read('src/plugins/resonance-workbench/feature-peak-runtime.js');
const resonanceTask=read('src/plugins/resonance-detector-robust/resonance-task.js');
const resonanceMainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');

assert(ui.includes("kind==='range'")&&ui.includes('dkds-scientific-baseline-line')&&ui.includes('onManipulationReset'),
  'FWHM analysis-window presentation must be expressed through the generic Core range-manipulation capability');
assert(peaks.includes('function peakAnalysisWindow')&&peaks.includes('function baselineForWindow')&&peaks.includes('fwhmLeft')&&peaks.includes('fwhmRight'),
  'baseline-corrected FWHM must live in shared Science Runtime');
assert(resonancePeak.includes("category:'peak-metrics'")&&resonancePeak.includes("pipeline.register('peaks.metrics'")&&resonanceTask.includes("op==='metrics-batch'")&&resonanceTask.includes('A.peakMetrics(row?.peak,row?.sweep)')&&resonanceMainPlot.includes('analysisLeft')&&resonanceMainPlot.includes('analysisRight'),
  'Resonance Peak runtime must consume Task-Runner-backed shared FWHM algorithm providers (including the bounded batched worker path) while the main-plot owner exposes only domain mapping');
assert(terScience.includes('function computeSweepScalarField')&&terScience.includes('transformSweep(sweep,type,transformOptions)'),
  'transformed Vg-Vd matrix must reuse shared transformSweep science');
assert(terService.includes('A.computeSweepScalarField')&&terService.includes('serialize:()=>({schema:3')&&terService.includes('transform:cloneSerializable(transform)')&&terFeature.includes("ctx.project.registerSlice('workspace'"),
  'TER service must own transformed-matrix domain state and persist it only through the plugin workspace slice');
assert(terFeature.includes("const CHART_COUNT=7")&&terFeature.includes("plotId:'terTransformHeatmapPlot'")&&terFeature.includes('ctx.parameters.render'),
  'TER transformed heatmap must be integrated into the seven-card dashboard using Core Parameter Schema');
assert(terFeature.includes('ctx.ui.scientificPlot.react')&&terFeature.includes('ensurePlotViews()'),
  'TER transformed heatmap must render/export through Core chart/PlotView infrastructure');
assert(!terView.includes('id="terTransformType"')&&!terView.includes('id="terTransformDirection"'),
  'TER view must not reintroduce plugin-private transform select controls');
console.log('FWHM + transformed TER heatmap Core-ownership architecture checks passed.');
