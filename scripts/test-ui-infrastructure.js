const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const ui=read('src/core/ui-infrastructure.js');
const kernel=read('src/core/plugin-kernel.js');
const windowManager=read('plugin-window-manager.js');
const resonanceSuper=read('src/plugins/resonance-workbench/super-layout.js');
const resonanceTop=read('src/plugins/resonance-workbench/window-runtime.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const ter=read('src/plugins/ter-analysis/plugin.js');
const pulse=read('src/plugins/pulse-analysis/plugin.js');
const dataCenter=read('src/plugins/data-center/plugin.js');

for(const symbol of ['PortableView','ActionGroup','InteractionBinding','SelectionChannel','ContextMenu','SplitController','ChartSurface','ViewHost','Workbench']){
  assert(ui.includes(`class ${symbol}`),`core UI infrastructure must expose ${symbol}`);
}
assert(ui.includes("pin(placement='right')"),'portable views must expose pin placement');
assert(ui.includes('class SplitController')&&ui.includes('split:spec=>this.trackObject(new SplitController'),'core must provide persisted resizable split infrastructure');
assert(ui.includes("this.allowed.includes('right')")&&ui.includes("this.allowed.includes('bottom')"),'floating views must support edge docking/snap');
assert(kernel.includes("const API_VERSION = '1.4.0'"),'plugin API must be v1.4.0');
for(const api of ['layout: infrastructureScope?.layout','actions: infrastructureScope?.actions','portable: infrastructureScope?.panels','charts: infrastructureScope?.chartsApi','interactions: infrastructureScope?.interactions','contextMenus: infrastructureScope?.menus','selection: infrastructureScope?.selection','views: infrastructureScope?.views','workbench: infrastructureScope?.workbench']){
  assert(kernel.includes(api),`kernel missing UI API: ${api}`);
}
assert(kernel.includes('state: {')&&kernel.includes('projectSlice'),'kernel must provide lifecycle-owned state/project persistence');
assert(windowManager.includes("'ui-infrastructure'")&&windowManager.includes("'state-store'"),'dedicated plugin windows must allow common UI/state infrastructure');

for(const [name,adapter] of [['SUPER',resonanceSuper],['TOP',resonanceTop]]){
  assert(adapter.split(/\r?\n/).length<45,`${name} resonance adapter must remain thin`);
  for(const forbidden of ['Plotly.','computeTerMatrix','detectPeaks','renderGate','renderPhysics','innerHTML=`'])assert(!adapter.includes(forbidden),`${name} adapter contains feature logic: ${forbidden}`);
}
assert(resonanceFeature.includes('mountSuper')&&resonanceFeature.includes('createTop'),'feature runtime must own both host feature paths');
for(const [name,src] of [['TER',ter],['Pulse',pulse],['Data Center',dataCenter]]){
  assert(src.includes('ctx.ui.portable.create'),`${name} must use core portable view infrastructure`);
  assert(/ctx\.ui\.actions\?\.mount\?\.|ctx\.ui\.actions\.mount/.test(src),`${name} must use core dynamic action infrastructure`);
}
assert(!ter.includes("window.addEventListener('keydown'"),'TER must not own a global keydown listener');
assert(dataCenter.includes('ctx.state.create')&&dataCenter.includes("projectSlice:'workspace'"),'Data Center must use core state/project infrastructure');
console.log('UI infrastructure architecture checks passed.');
