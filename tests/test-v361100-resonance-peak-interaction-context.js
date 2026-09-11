'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const bytes=rel=>fs.statSync(path.join(root,rel)).size;
const semver=value=>String(value||'').split('.').map(Number);
const atLeast=(value,target)=>{const a=semver(value),b=semver(target);for(let i=0;i<3;i++){const d=(a[i]||0)-(b[i]||0);if(d)return d>0;}return true;};

assert(atLeast(json('package.json').version,'3.61.100'),'Host must retain the v3.61.100 Resonance peak-interaction modularization baseline.');

const manifest=json('src/plugins/resonance-workbench/plugin.json');
const modules=[
  'feature-context.js','feature-ter-runtime.js','feature-group-runtime.js','feature-analysis-runtime.js','feature-peak-runtime.js',
  'feature-selection-runtime.js','feature-inspector-runtime.js','feature-main-plot-runtime.js','feature-controls-runtime.js','feature-runtime.js'
];
for(const [name,rows] of [['SUPER',manifest.scripts||[]],['TOP',manifest.window?.scripts||[]]]){
  const indexes=modules.map(item=>rows.indexOf(item));
  assert(indexes.every(i=>i>=0),`${name} Resonance path must load every feature module.`);
  assert(indexes.every((value,i)=>i===0||indexes[i-1]<value),`${name} Resonance feature modules must load in dependency order before the coordinator.`);
}

const rel={
  main:'src/plugins/resonance-workbench/feature-runtime.js',
  peak:'src/plugins/resonance-workbench/feature-peak-runtime.js',
  selection:'src/plugins/resonance-workbench/feature-selection-runtime.js',
  inspector:'src/plugins/resonance-workbench/feature-inspector-runtime.js',
  plot:'src/plugins/resonance-workbench/feature-main-plot-runtime.js',
  controls:'src/plugins/resonance-workbench/feature-controls-runtime.js'
};
const limit=48*1024;
for(const file of Object.values(rel))assert(bytes(file)<=limit,`${file} must remain within the 48 KiB authored-module boundary (got ${bytes(file)} B).`);

const main=read(rel.main),peak=read(rel.peak),selection=read(rel.selection),inspector=read(rel.inspector),plot=read(rel.plot),controls=read(rel.controls);
for(const token of [
  "let selectedSweepId=''","let selectedPeakId=''","let selectedPeakIds=new Set()","let selectedRange=null",
  'let interactionRuntime=null','let interactionSelection=null','let detectorRuntime=null','let peakMetricCache=new Map()',
  'let mainSurface=null','let dataSourcesRuntime=null','let datasetContextBehavior=null'
]) assert(!main.includes(token),`Resonance coordinator must not reclaim extracted mutable state: ${token}`);

for(const token of ["let selectedSweepId=''","let selectedPeakId=''","let selectedPeakIds=new Set()","let selectedRange=null",'let interactionRuntime=null','let interactionSelection=null'])
  assert(selection.includes(token),`Selection runtime must own ${token}.`);
for(const token of ['publishPeakSelection','publishRangeSelection','moveSelectedPeakBy','lockSelectedPeaks','deleteSelectedPeaks','applyInteractionSelection'])
  assert(selection.includes(token),`Selection runtime contract missing ${token}.`);

for(const token of ['let detectorRuntime=null','let peakMetricCache=new Map(),metricEpoch=0','runDetection','detectRange','peakMetrics','commitPeakMetricEdit'])
  assert(peak.includes(token),`Peak runtime must own ${token}.`);
for(const token of ['function render()','reswinInspectorBody','analysisLeft','analysisRight'])
  assert(inspector.includes(token),`Inspector runtime must own ${token}.`);
for(const token of ['let mainSurface=null','showRangeMenu','manipulators','ensure','clearRangeMenu'])
  assert(plot.includes(token),`Main-plot runtime must own ${token}.`);
for(const token of ['let dataSourcesRuntime=null','let datasetContextBehavior=null','datasetRowsHtml','setVisibility','setAllVisibility'])
  assert(controls.includes(token),`Controls runtime must own ${token}.`);

for(const token of [
  "PeakRuntime.create(featureContext)","SelectionRuntime.create(featureContext)","InspectorRuntime.create(featureContext)",
  "MainPlotRuntime.create(featureContext)","ControlsRuntime.create(featureContext)",
  'selectionRuntime?.moveSelectedPeakBy(step)','peakRuntime?.runDetection?.(scope)','mainPlotRuntime?.render()','inspectorRuntime?.render()','controlsRuntime?.render()'
]) assert(main.includes(token),`Coordinator must delegate through the extracted owner: ${token}`);

const audit=read('docs/CODE_QUALITY_AUDIT.md');
assert(audit.includes('feature-selection-runtime.js')&&audit.includes('feature-main-plot-runtime.js'),'Code-quality audit must document the Resonance interaction extraction.');
assert(audit.includes('below 48 KiB')||audit.includes('48 KiB'),'Code-quality audit must record the bounded Resonance coordinator outcome.');

console.log(`v3.61.100 Resonance peak-interaction context PASS: coordinator=${bytes(rel.main)} B, selection=${bytes(rel.selection)} B, peak=${bytes(rel.peak)} B, inspector=${bytes(rel.inspector)} B, plot=${bytes(rel.plot)} B, controls=${bytes(rel.controls)} B.`);
