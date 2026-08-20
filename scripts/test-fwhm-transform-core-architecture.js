const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('src/core/ui-infrastructure.js');
const peaks=read('src/science/peaks.js');
const terScience=read('src/science/ter.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const terView=read('src/plugins/ter-analysis/shared-views.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');

assert(ui.includes('windowLeft')&&ui.includes('dkds-scientific-baseline-line')&&ui.includes('onWidthReset'),
  'FWHM analysis-window presentation must be a Core ScientificCurveSurface capability');
assert(peaks.includes('function peakAnalysisWindow')&&peaks.includes('function baselineForWindow')&&peaks.includes('fwhmLeft')&&peaks.includes('fwhmRight'),
  'baseline-corrected FWHM must live in shared Science Runtime');
assert(resonance.includes('S.peakMetrics')&&resonance.includes('analysisLeft')&&resonance.includes('analysisRight'),
  'Resonance must consume shared FWHM science and expose only domain mapping');
assert(terScience.includes('function computeSweepTransformMatrix')&&terScience.includes('transformSweep(sweep,type,transformOptions)'),
  'transformed Vg-Vd matrix must reuse shared transformSweep science');
assert(terService.includes('A.computeSweepTransformMatrix')&&terService.includes('terTransformSettings'),
  'TER service must own transformed-matrix domain state/project persistence');
assert(terFeature.includes("const CHART_COUNT=7")&&terFeature.includes("plotId:'terTransformHeatmapPlot'")&&terFeature.includes('ctx.parameters.render'),
  'TER transformed heatmap must be integrated into the seven-card dashboard using Core Parameter Schema');
assert(terFeature.includes('ctx.ui.charts.react')&&terFeature.includes('ensurePlotViews()'),
  'TER transformed heatmap must render/export through Core chart/PlotView infrastructure');
assert(!terView.includes('id="terTransformType"')&&!terView.includes('id="terTransformDirection"'),
  'TER view must not reintroduce plugin-private transform select controls');
console.log('FWHM + transformed TER heatmap Core-ownership architecture checks passed.');
