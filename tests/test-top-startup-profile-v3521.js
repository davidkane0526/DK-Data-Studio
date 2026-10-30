const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {readBuiltinPluginWindows,normalizeDependencies}=require('../desktop/plugin-window-manager');
const runtime=read('src/plugin-window/runtime.js');
const preload=read('desktop/preload.js');
const main=read('desktop/main.js');
const auxiliary=read('desktop/main-modules/auxiliary-window-runtime.js');
const automation=(read('src/diagnostics/automation-test-runtime.js')+read('src/diagnostics/automation-smoke-cases.js'));

const domains=['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime'];
assert(runtime.includes("for(const id of ['scientific-unit-runtime','scientific-viewport-link-runtime','scientific-legend-link-runtime','entity-runtime','io-runtime','plot-presentation-runtime','native-touch-drag','scientific-display-runtime','heatmap-canvas-runtime','heatmap-selection-overlay-runtime','d3-chart-renderer','chart-export-runtime','chart-runtime','performance-runtime','scientific-plot-runtime','component-runtime','data-flow-runtime','service-runtime','plugin-contract-runtime','plugin-module-runtime'])"),'Dedicated TOP stable infrastructure list changed unexpectedly.');
assert(runtime.indexOf("'scientific-unit-runtime':'../core/scientific/unit-runtime.js'")<runtime.indexOf("'scientific-viewport-link-runtime':'../core/scientific/viewport-link-runtime.js'")&&runtime.indexOf("'scientific-viewport-link-runtime':'../core/scientific/viewport-link-runtime.js'")<runtime.indexOf("'scientific-legend-link-runtime':'../core/scientific/legend-link-runtime.js'")&&runtime.indexOf("'scientific-legend-link-runtime':'../core/scientific/legend-link-runtime.js'")<runtime.indexOf("'scientific-plot-runtime':'../core/scientific/plot-runtime.js'"),'Dedicated TOP must load Scientific Units before the bounded viewport-link and legend-link owners and ScientificPlot.');
assert(runtime.indexOf("'scientific-display-runtime':'../core/scientific/display-runtime.js'")<runtime.indexOf("'heatmap-canvas-runtime':'../core/scientific/heatmap-canvas-runtime.js'")&&runtime.indexOf("'heatmap-canvas-runtime':'../core/scientific/heatmap-canvas-runtime.js'")<runtime.indexOf("'heatmap-selection-overlay-runtime':'../core/scientific/heatmap-selection-overlay-runtime.js'")&&runtime.indexOf("'heatmap-selection-overlay-runtime':'../core/scientific/heatmap-selection-overlay-runtime.js'")<runtime.indexOf("'d3-chart-renderer':'../core/scientific/d3-chart-renderer.js'")&&runtime.indexOf("'d3-chart-renderer':'../core/scientific/d3-chart-renderer.js'")<runtime.indexOf("'chart-export-runtime':'../core/scientific/chart-export-runtime.js'")&&runtime.indexOf("'chart-export-runtime':'../core/scientific/chart-export-runtime.js'")<runtime.indexOf("'chart-runtime':'../core/scientific/chart-runtime.js'"),'Dedicated TOP must load Scientific Display, Canvas Heatmap, bounded Heatmap Selection, D3 and the shared Chart Export owner before Chart Runtime without a plugin-specific branch.');
for(const id of domains)assert(!runtime.includes(`'data-flow-runtime','${id}`),`${id} must not be part of the unconditional TOP host runtime list.`);
assert(runtime.includes("measure(id,()=>loadScript(DEPENDENCY_SCRIPTS[id]),startupProfile.dependencies"),'Dedicated renderer must profile each dependency load.');
assert(runtime.includes("measure('plugins-activate'")&&runtime.includes("`${reason}:activity-open`")&&runtime.includes('startupProfile.totalMs'),'Dedicated renderer must profile activation and workspace open phases.');
assert(preload.includes("markActivityWindowReady: payload => ipcRenderer.send('windows:activityReady', payload || {})"),'Startup profile must cross preload IPC with the ready signal.');
assert(auxiliary.includes('auxiliaryStartupProfiles')&&auxiliary.includes('profile.renderer=payload.startupProfile'),'Auxiliary-window runtime must retain renderer startup profiles.');
assert(auxiliary.includes('navigationMs')&&auxiliary.includes('createToReadyMs'),'Auxiliary-window runtime startup profile must include navigation and create-to-ready timing.');

const derived=normalizeDependencies([],['data.pipeline','data.transforms','analysis.algorithms']);
for(const id of domains)assert(derived.includes(id),`requiresCore must still derive ${id}.`);
const windows=readBuiltinPluginWindows(root);
const expected={
  'data-center':[],
  'pulse':[],
  'ter':['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime'],
  'resonance':['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime']
};
for(const [activity,required] of Object.entries(expected)){
  const deps=windows.get(activity)?.dependencies||[];
  for(const id of domains)assert(deps.includes(id)===required.includes(id),`${activity}: ${id} must follow requiresCore rather than global TOP loading.`);
}
const version=(automation.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/)||[]).slice(1).map(Number);
assert(version.length===3&&(version[0]>1||(version[0]===1&&(version[1]>7||(version[1]===7&&version[2]>=1)))),'Automation runner must be v1.7.1+ for startup phase profiling.');
assert(automation.includes("'top.startup-profile'")&&automation.includes('topStartupProfiles:'),'Built-app automation must validate and export TOP startup phase profiles.');
assert(automation.includes("domainRuntimes=['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime']"),'Automation must verify selective domain-runtime loading in real TOP renderers.');
console.log('v3.52.1 TOP startup profiling and selective runtime loading checks passed.');
