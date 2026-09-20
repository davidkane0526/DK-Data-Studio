'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pkg=JSON.parse(read('package.json'));
const atLeast=(v,min)=>{const a=v.split('.').map(Number),b=min.split('.').map(Number);for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return true;};
assert(atLeast(pkg.version,'3.68.45'));

const index=read('src/index.html');
for(const id of ['inspectorPanel','groupPanel','zoomPanel'])assert(!index.includes(`id="${id}"`),`Retired app-owned root panel #${id} must not remain in the shell DOM.`);

const startup=read('src/app/modules/startup.js');
assert(!startup.includes('applyInspectorPanelLayout')&&!startup.includes('applyGroupPanelLayout'),'Startup must not revive retired app-owned inspector/group docking paths.');

const docks=read('src/app/modules/floating-docks.js');
for(const token of ['inspectorPanel','groupPanel','inspectorDockSlot','dockedGroupSlot','applyInspectorPanelLayout','applyGroupPanelLayout','toggleInspectorDock','toggleGroupDock'])assert(!docks.includes(token),`Floating-docks must not retain legacy panel token ${token}.`);

const shell=read('src/app/modules/workspace-super-shell.js');
assert(!shell.includes('renderInspector()')&&!shell.includes('renderTrendPanel()')&&!shell.includes('activeInspectorProvider'),'Main shell must not render a second app-owned inspector/group layer below PluginWorkspace.');

const context=read('src/app/modules/context.js');
for(const token of ['inspectorPanelMode','inspectorDockWidth','inspectorFloatRect','groupPanelMode','groupPanelCollapsed','groupPanelDockHeight','groupPanelFloatRect','trendColumns','zoomChart'])assert(!context.includes(token),`Current host state must not retain retired ${token}.`);

const persistence=read('src/app/modules/project-persistence.js');
assert(!persistence.includes('panelLayout')&&!persistence.includes('trendColumns'),'Current project host serialization must not own retired inspector/group presentation state.');

const resonance=read('src/plugins/resonance-workbench/unit-presentation.js');
assert(resonance.includes("id:'curve-inspector'")&&resonance.includes("id:'group-analysis'")&&resonance.includes('units.prime.build'),'Resonance inspector/group must remain Unit-backed PluginWorkspace PRIME surfaces after removing the duplicate app-owned layer.');

console.log('v3.68.45 retired legacy root inspector/group/zoom panel stack PASS.');
