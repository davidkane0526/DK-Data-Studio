const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readBuiltinPluginWindows}=require('../plugin-window-manager');

const root=path.resolve(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function fail(message){console.error(`PLUGIN WINDOW ERROR: ${message}`);process.exitCode=2;}
function assert(ok,message){if(!ok)fail(message);}

const shellHtml=read('src/plugin-window/index.html');
const shellRuntime=read('src/plugin-window/runtime.js');
const shellStyle=read('src/plugin-window/style.css');
const main=read('main.js');
const preload=read('preload.js');
const manager=read('plugin-window-manager.js');
const app=read('src/app.js');
const pulseRuntime=read('src/plugins/pulse-analysis/window-runtime.js');
const terRuntime=read('src/plugins/ter-analysis/window-runtime.js');

assert(!shellHtml.includes('../app.js'),'Dedicated plugin window must not load the full src/app.js renderer.');
assert(!shellHtml.includes('plugin-index'),'Dedicated plugin window must not load the full generated plugin index.');
assert(!shellHtml.includes('正在打开插件'),'Dedicated plugin window must not show a startup/loading page.');
assert(!shellHtml.includes('plotly.min.js'),'Plugin dependencies must be loaded on demand, not statically by the shell.');
assert(!shellHtml.includes('../science/'),'Plugin science dependencies must be loaded on demand.');
assert(!shellHtml.includes('../core/plugin-kernel.js'),'Plugin kernel must be loaded on demand with the target plugin dependencies.');
assert(!shellStyle.includes('.plugin-window-loading'),'Startup loading overlay CSS must be removed.');
assert(shellRuntime.includes('DEPENDENCY_SCRIPTS'),'Dedicated runtime must have an allowlisted dependency map.');
assert(shellRuntime.includes('loadDependencies(spec)'),'Dedicated runtime must load dependencies declared by the target plugin.');
assert(shellRuntime.includes('onActivityWillHide'),'Dedicated runtime must flush its project snapshot before a cached window is hidden.');
assert(shellRuntime.includes('pushSnapshot(true);'),'Dedicated runtime must persist a final snapshot before hiding/closing.');
assert(main.includes("src', 'plugin-window', 'index.html"),'main.js must route dedicated activities to src/plugin-window/index.html.');
assert(main.includes('resolveBuiltinPluginWindow'),'main.js must resolve plugin-owned window manifests.');
assert(main.includes('hideDedicatedAuxiliaryWindow'),'Dedicated windows must be hidden instead of destroyed on normal close.');
assert(main.includes("win.on('close', event =>"),'Native title-bar close must be intercepted for cached plugin windows.');
assert(main.includes('projectSnapshotDigest'),'Cached windows must avoid renderer/project replacement when the snapshot is unchanged.');
assert(main.includes('synchronized:projectChanged'),'Reuse result must record whether a hidden renderer required project synchronization.');
assert(preload.includes('onActivityWillHide'),'preload must expose the hide/snapshot lifecycle event.');
assert(preload.includes('prewarmActivityWindow'),'preload must expose background plugin-window prewarming.');
assert(preload.includes('markActivityWindowReady'),'preload must let the dedicated renderer report readiness.');
assert(preload.includes('onActivityWillShow'),'preload must expose cached-window show/resize lifecycle events.');
assert(main.includes("ipcMain.handle('windows:prewarmActivity'"),'main process must accept background prewarm requests.');
assert(main.includes("ipcMain.on('windows:activityReady'"),'main process must gate first visible show on real plugin readiness.');
assert(main.includes('auxiliaryPendingShow'),'main process must avoid showing a blank dedicated renderer before it is ready.');
assert(main.includes("windows:disposeProjectActivities"),'closed project tabs must dispose their cached dedicated windows.');
assert(preload.includes('disposeProjectActivityWindows'),'preload must expose project-window disposal to the workspace.');
assert(app.includes('function prewarmTopLevelPluginWindows()'),'main renderer must prewarm Data Center / TER / Pulse after startup.');
assert(app.includes("const activities=['data-center','ter','pulse']"),'all three top-level plugin windows must participate in prewarming.');
assert(shellRuntime.includes('markActivityWindowReady'),'dedicated runtime must signal completion after the target plugin is mounted.');
assert(shellRuntime.includes('const sameProject = bootstrap?.projectDigest'),'prewarm -> first-open must not restore/re-render an unchanged project.');
assert(shellRuntime.includes('onActivityWillShow'),'dedicated runtime must relayout Plotly when a prewarmed/cached window becomes visible.');
assert(manager.includes('manifest?.window'),'plugin-window-manager must read manifest.window.');
assert(manager.includes('ALLOWED_WINDOW_DEPENDENCIES'),'plugin-window-manager must validate dedicated-window dependencies.');

const expected={
  'data-center':{activity:'data-center',runtime:'',deps:['plotly','data-model','formula-engine','parameter-schema','workflow-engine','platform','plugin-kernel']},
  'ter-analysis':{activity:'ter',runtime:'window-runtime.js',deps:['plotly','science-common','science-ter','platform','plugin-kernel']},
  'pulse-analysis':{activity:'pulse',runtime:'window-runtime.js',deps:['plotly','science-common','science-import','science-pulse','platform','plugin-kernel']}
};
for(const [folder,spec] of Object.entries(expected)){
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  assert(manifest.window?.activity===spec.activity,`${folder}: window.activity must be ${spec.activity}`);
  assert(JSON.stringify(manifest.window?.dependencies||[])===JSON.stringify(spec.deps),`${folder}: unexpected dedicated-window dependency set`);
  if(spec.runtime){
    assert(manifest.window?.runtime===spec.runtime,`${folder}: window.runtime must be ${spec.runtime}`);
    assert(fs.existsSync(path.join(root,'src','plugins',folder,spec.runtime)),`${folder}: runtime file missing`);
  }
  assert(Number(manifest.window?.width)>=900,`${folder}: dedicated window width is missing`);
}

const resolved=readBuiltinPluginWindows(root);
for(const spec of Object.values(expected)){
  const row=resolved.get(spec.activity);
  assert(!!row,`manager failed to resolve ${spec.activity}`);
  assert(JSON.stringify(row?.dependencies||[])===JSON.stringify(spec.deps),`${spec.activity}: resolved dependencies differ from manifest`);
}

// Persistence contract: window reuse must preserve DOM/Plotly in memory, and
// application restart must restore expensive analysis results instead of
// recomputing them from source text/datasets.
assert(pulseRuntime.includes('result:item.result ? cloneSerializable(item.result) : null'),'Pulse window project slice must persist computed result payloads.');
assert(pulseRuntime.includes('if(source.analyzed && !item.result)analyzeItem(item);'),'Pulse restore must recompute only legacy projects without cached results.');
assert(app.includes('result:item.result?cloneProjectCache(item.result):null'),'Main project serializer must persist Pulse result payloads.');
assert(app.includes('if(source.analyzed&&!item.result)analyzePulseItem(item);'),'Main Pulse restore must skip recomputation when a cached result exists.');
assert(app.includes('terMaxResult:state.terMaxResult?cloneProjectCache(state.terMaxResult):null'),'Main project serializer must persist TER result payloads.');
assert(app.includes('state.terMaxResult=pr.terMaxResult?cloneProjectCache(pr.terMaxResult):null'),'Main project loader must restore cached TER results.');
assert(terRuntime.includes('result=project.terMaxResult?cloneSerializable(project.terMaxResult):null'),'TER window runtime must restore cached TER results.');
assert(terRuntime.includes('target.terMaxResult=result?cloneSerializable(result):null'),'TER window runtime must write cached TER results back to the project.');

for(const rel of [
  'src/plugin-window/runtime.js',
  'src/plugins/pulse-analysis/window-runtime.js',
  'src/plugins/ter-analysis/window-runtime.js',
  'plugin-window-manager.js',
  'preload.js',
  'main.js',
  'src/app.js'
]){
  try{new vm.Script(read(rel),{filename:rel});}
  catch(err){fail(`${rel}: JavaScript syntax error: ${err.message}`);}
}

assert(fs.existsSync(path.join(root,'tools','windows','package-clean-project.ps1')),'clean project packaging tool is missing.');
assert(read('package.json').includes('plugin-window-manager.js'),'electron-builder files must include plugin-window-manager.js.');

if(process.exitCode)process.exit(process.exitCode);
console.log('Plugin window cache OK: no startup screen, on-demand dependencies, hide/reuse lifecycle, Pulse/TER result persistence.');
