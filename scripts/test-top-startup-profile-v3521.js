const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {readBuiltinPluginWindows,normalizeDependencies}=require('../plugin-window-manager');
const runtime=read('src/plugin-window/runtime.js');
const preload=read('preload.js');
const main=read('main.js');
const automation=read('src/core/automation-test-runtime.js');

const domains=['scientific-pipeline-runtime','scientific-transform-runtime','scientific-algorithm-runtime'];
assert(runtime.includes("for(const id of ['entity-runtime','io-runtime','chart-runtime','performance-runtime','scientific-plot-runtime','component-runtime','data-flow-runtime','service-runtime','plugin-contract-runtime','plugin-module-runtime'])"),'Dedicated TOP stable infrastructure list changed unexpectedly.');
for(const id of domains)assert(!runtime.includes(`'data-flow-runtime','${id}`),`${id} must not be part of the unconditional TOP host runtime list.`);
assert(runtime.includes("measure(id,()=>loadScript(DEPENDENCY_SCRIPTS[id]),startupProfile.dependencies"),'Dedicated renderer must profile each dependency load.');
assert(runtime.includes("measure('plugins-activate'")&&runtime.includes("measure('activity-open'")&&runtime.includes('startupProfile.totalMs'),'Dedicated renderer must profile activation and workspace open phases.');
assert(preload.includes("markActivityWindowReady: payload => ipcRenderer.send('windows:activityReady', payload || {})"),'Startup profile must cross preload IPC with the ready signal.');
assert(main.includes('auxiliaryStartupProfiles')&&main.includes('profile.renderer=payload.startupProfile'),'Main process must retain renderer startup profiles.');
assert(main.includes('navigationMs')&&main.includes('createToReadyMs'),'Main process startup profile must include navigation and create-to-ready timing.');

const derived=normalizeDependencies([],['data.pipeline','data.transforms','analysis.algorithms']);
for(const id of domains)assert(derived.includes(id),`requiresCore must still derive ${id}.`);
const windows=readBuiltinPluginWindows(root);
const expected={
  'data-center':[],
  'pulse':[],
  'ter':['scientific-pipeline-runtime','scientific-transform-runtime'],
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
