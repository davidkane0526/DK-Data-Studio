const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const plot=read('src/core/scientific-plot-runtime.js');
const ui=read('src/core/ui-infrastructure.js');
const runtime=read('src/plugin-window/runtime.js');
const main=read('main.js');
const kernel=read('src/core/plugin-kernel.js');
const automation=read('src/core/automation-test-runtime.js');

assert(plot.includes("const VERSION='2.1.0'"),'ScientificPlot v2.1.0 must own renderer lifecycle.');
for(const token of ['async suspend(options={})','async resume(options={})','rendererPurges','resumeRenders','purgeManaged'])assert(plot.includes(token),`ScientificPlot lifecycle token missing: ${token}`);
assert(plot.includes('view.dispose?.({purge:true})'),'ScientificPlot scope disposal must purge managed renderer resources.');
assert(plot.includes('async function lifecycle(state,options={})')&&plot.includes('function snapshot()'),'ScientificPlot must expose Core-wide lifecycle/snapshot surfaces.');

for(const token of ['suspend(){if(this.disposed||this.suspended)','resume(){if(this.disposed||!this.suspended)','async lifecycle(state,options={})','lifecycleSnapshot()'])assert(ui.includes(token),`UI lifecycle token missing: ${token}`);
assert(ui.includes("window.DKDSPerformance?.skip?.('ui.suspended-resize')"),'Suspended ResizeScheduler work must be observable as skipped work.');

assert(runtime.includes("DKDSUI?.lifecycle?.('hidden'")&&runtime.includes("DKDSUI?.lifecycle?.('visible'"),'Dedicated TOP runtime must route hide/show through Core UI lifecycle.');
assert(runtime.includes("DKDSPerformance?.lifecycle?.('hidden'"),'TOP hide must still contract Core scientific caches after UI suspension.');

assert(main.includes('diagnosticRendererLifecycleSnapshot')&&main.includes('lifecycleSnapshotSuspended'),'Real Electron diagnostics must inspect renderer lifecycle state.');
assert(main.includes('hideDedicatedAuxiliaryWindow(win)')&&main.includes('reused:reopened?.reused===true'),'Real TOP automation must exercise hide/reuse, not readiness only.');

assert(kernel.includes("trimPrefix?.(`${pluginId}.`,{targetEntries:0,dropWeak:true,reason:'plugin-deactivate'})"),'Plugin deactivation must release its Core performance namespace.');

const automationVersion=(automation.match(/const VERSION='(\d+)\.(\d+)\.(\d+)'/)||[]).slice(1).map(Number);
assert(automationVersion.length===3&&(automationVersion[0]>1||(automationVersion[0]===1&&automationVersion[1]>=4)),'Automation runner must preserve v1.4+ resource lifecycle coverage.');
assert(automation.includes("'performance.resources'")&&automation.includes('Renderer & resource lifecycle'),'Built-app automation must exercise renderer/resource lifecycle.');
assert(automation.includes('out?.lifecycle?.tested&&out?.lifecycle?.ok'),'TOP automation must require hide/reuse lifecycle success for every renderer.');
console.log('v3.49 Core UI/renderer resource lifecycle architecture checks passed.');
