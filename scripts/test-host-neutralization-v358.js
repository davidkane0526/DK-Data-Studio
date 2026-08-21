'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const app=read('src/app.js');
const format=read('src/core/project-format.js');

const makeStart=app.indexOf('function makeProject(){');
const makeEnd=app.indexOf('\n  let projectSaveChoicePromise',makeStart);
assert(makeStart>=0&&makeEnd>makeStart,'makeProject source not found.');
const make=app.slice(makeStart,makeEnd);
for(const token of [
  'scanVisibility:','peaks:','peakCategories:','algorithms:','physicsShowLabels:',
  'spacingSettings:','gateAnalysisSettings:','transformPreviewByDataset:',
  'terMaxSettings:','terHeatmapDisplay:','terMaxResult:','pulseAnalysis:'
])assert(!make.includes(token),`Canonical Core project output contains domain field ${token}`);
assert(make.includes("format:'dk-data-studio-project'")&&make.includes('schemaVersion:2'),'Core must emit project schema v2.');
assert(make.includes('dataModel:')&&make.includes('plugins:')&&make.includes('host:{'),'Canonical project must persist generic data model + plugin + host namespaces.');
assert(make.includes('panelLayout:{'),'Generic panel layout must live under the host namespace.');

const configStart=app.indexOf('window.DKDSPlugins.configure({');
const configEnd=app.indexOf('\n    });',configStart);
assert(configStart>=0&&configEnd>configStart,'plugin host configure source not found.');
const config=app.slice(configStart,configEnd);
for(const token of ['resonanceHostApi','terHostApi','pulseHostApi','panels:{','getState:()=>state'])assert(!config.includes(token),`Host configure must not expose historical domain surface ${token}`);
for(const token of ['function resonanceHostApi','function terHostApi','function pulseHostApi'])assert(!app.includes(token),`Dead host domain adapter must be removed: ${token}`);

const forbiddenHostDomain=/\b(peaks?|fwhm|ter|maxter|gateAnalysis|pulseAnalysis|scanVisibility|detectorSettings|physicsShowLabels|spacingSettings|resonance|sweep)\b/i;
assert(!forbiddenHostDomain.test(app),'src/app.js must remain scientifically domain-neutral.');
for(const token of ['window.Analysis','runDetection','rebuildSweeps','mergeCompatibilityActivityProject'])assert(!app.includes(token),`Host must not retain removed legacy science/runtime path ${token}`);
const main=read('main.js');
const windowManager=read('plugin-window-manager.js');
assert(!/compatibility/i.test(windowManager),'TOP window manager must expose only dedicated plugin renderers.');

const kernel=read('src/core/plugin-kernel.js');
assert(!kernel.includes('legacyProject'),'Plugin Kernel must not carry historical project-root migration state; project-format is the single migration boundary.');
for(const rel of [
  'src/plugins/resonance-workbench/feature-runtime.js',
  'src/plugins/resonance-workbench/view-components.js',
  'src/plugins/ter-analysis/analysis-service.js',
  'src/plugins/ter-analysis/feature-runtime.js',
  'src/plugins/pulse-analysis/feature-runtime.js'
]) assert(!read(rel).includes('legacyProject'),`${rel} must restore canonical plugin slices without root-project fallbacks.`);
assert(!main.includes('aux=')&&!main.includes('src/index.html?'),'Main process must not reload the full host renderer as a legacy TOP fallback.');

assert(format.includes("const SCHEMA_VERSION=2"),'Project format must declare schema v2.');
assert(format.includes('DOMAIN_ROOT_FIELDS'),'Project format must centrally define legacy domain roots.');
assert(format.includes("plugins['builtin.resonance-workbench']")&&format.includes("plugins['builtin.ter-analysis']")&&format.includes("plugins['builtin.pulse-analysis']"),'Legacy migration must terminate in plugin namespaces.');

assert(app.includes("window.DKDSPlugins.project.restore(t.pluginState||{})")&&app.includes("restore?.(pr.plugins||{})"),'Live main-host restore must consume plugin slices only.');
const dedicated=read('src/plugin-window/runtime.js');
assert(dedicated.includes("window.DKDSPlugins.project.restore(project.plugins || {})"),'Dedicated TOP restore must consume plugin slices only.');
for(const rel of ['src/plugins/resonance-workbench/workbench-shared.js','src/plugins/resonance-workbench/feature-runtime.js','src/plugins/ter-analysis/analysis-service.js','src/plugins/ter-analysis/plugin.js']){
  const source=read(rel);
  assert(!/\bproject\.(?:scanVisibility|peaks|peakCategories|algorithms|physicsShowLabels|spacingSettings|gateAnalysisSettings|terMaxSettings|terHeatmapDisplay|terMaxResult|pulseAnalysis)\b/.test(source),`${rel} must not consume domain state from the canonical project root.`);
}

for(const [rel,needle] of [
  ['src/plugins/resonance-workbench/view-components.js',"ctx.project.registerSlice('workspace'"],
  ['src/plugins/ter-analysis/feature-runtime.js',"ctx.project.registerSlice('workspace'"],
  ['src/plugins/pulse-analysis/feature-runtime.js',"ctx.project.registerSlice('workspace'"]
])assert(read(rel).includes(needle),`${rel} must own its project state through a plugin slice.`);

console.log('v3.58 Host Neutralization OK: canonical project root is generic, domain state is plugin-owned, dead host domain adapters are absent.');
