const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const {normalizeDependencies,resolveBuiltinPluginWindow}=require('../plugin-window-manager');

const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
assert(resonanceManifest.requiresCore.includes('parameters'),'Resonance must declare the parameter Core contract it uses.');
assert(!resonanceManifest.window.dependencies.includes('parameter-schema'),'Regression fixture: Resonance should not need to duplicate requiresCore.parameters in window.dependencies.');
const resonanceWindow=resolveBuiltinPluginWindow(root,'resonance');
assert(resonanceWindow,'Resonance dedicated TOP window must resolve.');
assert(resonanceWindow.dependencies.includes('parameter-schema'),'requiresCore.parameters must automatically materialize parameter-schema in the dedicated TOP renderer.');
assert(resonanceWindow.dependencies.indexOf('parameter-schema')<resonanceWindow.dependencies.length,'Derived parameter dependency must be part of the resolved window contract.');

const derived=normalizeDependencies([],['parameters','data.model','data.formula','workflow','state']);
for(const dependency of ['parameter-schema','data-model','formula-engine','workflow-engine','state-store']){
  assert(derived.includes(dependency),`requiresCore must derive ${dependency} for dedicated TOP windows.`);
}
assert(derived.includes('platform')&&derived.includes('plugin-kernel'),'All dedicated TOP windows must still receive the generic host/kernel floor.');

const runtime=read('src/plugin-window/runtime.js');
const main=read('main.js');
const preload=read('preload.js');
const app=read('src/app.js');
assert(runtime.includes("'parameter-schema':'../core/parameter-schema.js'"),'Dedicated runtime allowlist must include parameter-schema.');
assert(runtime.includes('window.electronAPI?.markActivityWindowFailed?.'),'Dedicated startup catch must report failure to the main process.');
assert(main.includes('const auxiliaryFailures = new Map()'),'Main process must retain explicit failed-window state.');
assert(main.includes("ipcMain.on('windows:activityFailed'"),'Main process must receive dedicated startup failures.');
assert(main.includes('if(auxiliaryPendingShow.has(id))')&&main.includes('win.show();win.focus();'),'A user-requested failed TOP must become visible instead of failing behind show:false.');
assert(main.includes('const failure=auxiliaryFailures.get(previous.webContents.id)'),'Reopening a failed cached TOP must surface the existing failure instead of waiting forever for ready.');
assert(preload.includes('onActivityWindowFailed'),'Failure state must reach the owner renderer.');
assert(app.includes('onActivityWindowFailed?.(payload=>'),'Main renderer must surface TOP startup failure in the host status area.');

console.log('TOP host-transition / dedicated-window lifecycle regression checks passed.');
