const fs=require('fs');
const vm=require('vm');
function read(p){return fs.readFileSync(p,'utf8');}
function assert(c,m){if(!c)throw new Error(m);}

const html=read('src/index.html');
const css=read('src/style.css');
const app=read('src/app.js');
const kernel=read('src/core/plugin-kernel.js');
const bridge=read('src/web-bridge.js');
const main=read('main.js');
const preload=read('preload.js');
const plugin=read('src/plugins/status-monitor/plugin.js');
const manifest=JSON.parse(read('src/plugins/status-monitor/plugin.json'));
const dedicatedHtml=read('src/plugin-window/index.html');
const dedicatedRuntime=read('src/plugin-window/runtime.js');

for(const id of ['statusBarMessage','statusBarPluginLeft','statusBarPluginRight']){
  assert(html.includes(`id="${id}"`),`unified status bar mount missing: ${id}`);
  assert(dedicatedHtml.includes(`id="${id}"`),`dedicated plugin window status bar mount missing: ${id}`);
}
assert(html.indexOf('id="statusBar"')>html.indexOf('<div class="workspace">'),'global status bar must live outside the main plot row.');
assert(css.includes('--dkds-statusbar-height:28px'),'shell must reserve a shared status-bar height.');
assert(css.includes('.plugin-status-item'),'status-bar plugin controls need a common visual contract.');

assert(kernel.includes("registerContribution(pluginId,'ui.statusItems'"),'plugin kernel must register status items generically.');
assert(kernel.includes('statusBar: {')&&kernel.includes('add: spec => addStatusBarItem(pluginId, spec)'),'plugin API must expose ui.statusBar.add().');
assert(manifest.capabilities.includes('ui.status-bar'),'status monitor must declare status-bar capability.');
assert(plugin.includes("id:'memory'")&&plugin.includes("runtimeService.getStatus"),'status plugin must show live runtime memory through Core Service Registry.');
assert(plugin.includes("id:'lan-web'")&&plugin.includes('lanService.openPanel'),'status plugin must show LAN web state and restore the panel through Core Service Registry.');

for(const id of ['projectSaveChoiceDialog','projectSaveCurrentBtn','projectSaveAsBtn','projectSaveCancelBtn']){
  assert(html.includes(`id="${id}"`),`project save choice UI missing: ${id}`);
}
assert(app.includes("mode=options.mode||await chooseProjectSaveMode()"),'save command must ask Save current / Save As / Cancel.');
assert(app.includes("mode==='saveAs'?'工程已另存为':'工程已保存'"),'save flow must distinguish Save As in status feedback.');
assert(main.includes("payload.mode === 'saveAs' ? 'saveAs' : 'current'"),'desktop save IPC must support explicit Save As.');
assert(bridge.includes('showSaveFilePicker')&&bridge.includes('writeProjectHandle'),'web save should overwrite a granted browser file handle when supported.');
assert(bridge.includes('Plain HTTP LAN pages cannot normally use File System Access API'),'web save must retain a safe download fallback for LAN HTTP pages.');

assert(html.includes('id="lanWebMinimizeBtn"'),'LAN web panel needs an explicit minimize-to-status-bar control.');
assert(app.includes('function hideLanWebPanel')&&app.includes('function showLanWebPanel'),'LAN panel must have reusable hide/restore lifecycle helpers.');
assert(app.includes('lanWeb:Object.freeze({getStatus:')&&app.includes('openPanel:showLanWebPanel'),'plugins must restore the LAN panel through the generic Core Service Registry.');
assert(app.includes("events?.emit?.('lanweb:status',status)"),'LAN state changes must be broadcast to status plugins.');

assert(main.includes("ipcMain.handle('system:getRuntimeStatus'"),'desktop runtime metrics IPC missing.');
assert(preload.includes("getRuntimeStatus: () => ipcRenderer.invoke('system:getRuntimeStatus')"),'runtime metrics IPC must be exposed through preload.');
assert(bridge.includes('getRuntimeStatus: async()=>'),'web runtime metrics fallback missing.');
assert(dedicatedRuntime.includes("const statusEl = $('#statusBarMessage') || $('#statusBar');"),'dedicated window status text must not overwrite plugin status controls.');

for(const file of [
  'main.js','preload.js','src/web-bridge.js','src/app.js','src/core/plugin-kernel.js',
  'src/core/plugin-manager-ui.js','src/plugins/status-monitor/plugin.js','src/plugin-window/runtime.js'
]){
  new vm.Script(read(file),{filename:file});
}

console.log('Unified status bar, status plugin, project Save As, and LAN minimize/restore contracts passed.');
