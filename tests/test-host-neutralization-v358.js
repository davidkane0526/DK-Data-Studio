'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const app=read('src/generated/runtime/app.js');
const projectPersistence=read('src/app/modules/project-persistence.js');
const pluginHost=read('src/app/modules/dedicated-plugin-windows.js');
const format=read('src/core/project/format.js');
const gateway=read('src/project-importers/compatibility-gateway.js');

const makeStart=projectPersistence.indexOf('function makeProject(){');
const makeEnd=projectPersistence.indexOf('let projectSaveChoicePromise',makeStart);
assert(makeStart>=0&&makeEnd>makeStart,'makeProject source not found.');
const make=projectPersistence.slice(makeStart,makeEnd);
for(const token of [
  'scanVisibility:','peaks:','peakCategories:','algorithms:','physicsShowLabels:',
  'spacingSettings:','gateAnalysisSettings:','transformPreviewByDataset:',
  'terMaxSettings:','terHeatmapDisplay:','terMaxResult:','pulseAnalysis:'
])assert(!make.includes(token),`Canonical Core project output contains domain field ${token}`);
assert(make.includes("format:'dk-data-studio-project'")&&make.includes('schemaVersion:3'),'Core must emit canonical project schema v3.');
assert(make.includes('dataModel:')&&make.includes('plugins:')&&make.includes('host:{'),'Canonical project must persist generic data model + plugin + host namespaces.');
assert(make.includes('panelLayout:{'),'Generic panel layout must live under the host namespace.');

const configStart=pluginHost.indexOf('window.DKDSPlugins.configure({');
const configEnd=pluginHost.indexOf('\n  });',configStart);
assert(configStart>=0&&configEnd>configStart,'plugin host configure source not found.');
const config=pluginHost.slice(configStart,configEnd);
for(const token of ['resonanceHostApi','terHostApi','pulseHostApi','panels:{','getState:()=>state'])assert(!config.includes(token),`Host configure must not expose historical domain surface ${token}`);
for(const token of ['function resonanceHostApi','function terHostApi','function pulseHostApi'])assert(!app.includes(token),`Dead host domain adapter must be removed: ${token}`);

const forbiddenHostDomain=/\b(peaks?|fwhm|ter|maxter|gateAnalysis|pulseAnalysis|scanVisibility|detectorSettings|physicsShowLabels|spacingSettings|resonance|sweep)\b/i;
assert(!forbiddenHostDomain.test(app),'src/generated/runtime/app.js must remain scientifically domain-neutral.');
for(const token of ['window.Analysis','runDetection','rebuildSweeps','mergeCompatibilityActivityProject'])assert(!app.includes(token),`Host must not retain removed historical science/runtime path ${token}`);
const main=read('desktop/main.js');
const windowManager=read('desktop/plugin-window-manager.js');
for(const token of ['legacyRenderer','compatibilityRenderer','hostRendererFallback','fullHostRenderer'])assert(!windowManager.includes(token),`TOP window manager must not expose historical renderer fallback ${token}.`);

const kernel=read('src/generated/runtime/plugin-kernel.js');
assert(!kernel.includes('legacyProject'),'Plugin Kernel must not carry historical project-root migration state; Project Compatibility Gateway is the single compatibility boundary.');
for(const rel of [
  'src/plugins/resonance-workbench/feature-runtime.js',
  'src/plugins/resonance-workbench/view-components.js',
  'src/plugins/ter-analysis/analysis-service.js',
  'src/plugins/ter-analysis/feature-runtime.js',
  'src/plugins/pulse-analysis/feature-runtime.js'
]) assert(!read(rel).includes('legacyProject'),`${rel} must restore canonical plugin slices without root-project fallbacks.`);
assert(!main.includes('aux=')&&!main.includes('src/index.html?'),'Main process must not reload the full host renderer as a historical TOP fallback.');

assert(format.includes('const SCHEMA_VERSION=3'),'Project format must declare schema v3.');
assert(format.includes('registerCompatibilityImporter'),'Core Project Format must expose a generic compatibility-importer registry.');
for(const token of ['DOMAIN_ROOT_FIELDS','scanVisibility','terMaxSettings','pulseAnalysis'])assert(!format.includes(token),`Core Project Format must remain domain-neutral and must not own ${token}.`);
assert(gateway.includes('DOMAIN_ROOT_FIELDS'),'Historical domain roots must live only in the external Project Compatibility Gateway.');
assert(gateway.includes("plugins['builtin.resonance-workbench']")&&gateway.includes("plugins['builtin.ter-analysis']")&&gateway.includes("plugins['builtin.pulse-analysis']"),'Compatibility Gateway must terminate historical domain migration in plugin namespaces outside Core.');
assert(!fs.existsSync(path.join(root,'src/migrations')),'Runtime src/migrations tree must be removed after the Legacy-Free Cut.');

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

const terService=read('src/plugins/ter-analysis/analysis-service.js');
for(const token of ['target.terMaxSettings','target.terHeatmapDisplay','target.terTransformSettings','target.terAlgorithmRef','target.terMaxResult'])assert(!terService.includes(token),`TER dedicated runtime must not write historical project-root field ${token}.`);
assert(terService.includes("target.plugins['builtin.ter-analysis']")&&terService.includes('plugin.workspace=service.serialize()'),'TER dedicated runtime must synchronize only its canonical plugin slice.');

console.log('v3.62 Host Neutralization OK: canonical schema v3 is generic, compatibility is external, domain state is plugin-owned, and runtime migrations are absent.');
