const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const app=read('src/app.js');
const css=read('src/style.css');
const kernel=read('src/core/plugin-kernel.js');
const manager=read('src/core/plugin-manager-ui.js');
const ui=read('src/core/ui-infrastructure.js');

const plugins={
  resonance:{folder:'resonance-workbench',root:'resonance'},
  ter:{folder:'ter-analysis',root:'terMaxPage'},
  pulse:{folder:'pulse-analysis',root:'pulseAnalysisPage'},
  dataCenter:{folder:'data-center',root:'builtin-data-center-data-center-page'}
};
for(const [name,{folder}] of Object.entries(plugins)){
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  const scripts=manifest.scripts||[manifest.entry||'plugin.js'];
  const combined=scripts.map(file=>read(`src/plugins/${folder}/${file}`)).join('\n');
  assert(manifest.workspace?.role==='top',`${name}: every first-level scientific workspace must use the same TOP contract.`);
  assert(combined.includes('ctx.ui.topWorkspace.register'),`${name}: missing generic TOP workspace registration.`);
  assert(manifest.window?.activity,`${name}: TOP must declare its independent-window activity in manifest.window.`);
}

assert(app.includes('function superWorkspaceRootPageId(contract={})'),'main shell must derive SUPER root from the generic TOP contract.');
assert(app.includes("page.classList.toggle('super-workspace-root-page',isRoot)"),'SUPER root class must be contract-driven for every plugin.');
assert(app.includes("if(page?.classList.contains('super-workspace-root-page'))return false"),'only the root of the current SUPER may reject close; plugin SUB pages must remain returnable.');
assert(css.includes('.analysis-page.super-workspace-root-page .analysis-page-close'),'only the SUPER root close button may be hidden.');
assert(css.includes('.import-panel-overlay')&&css.includes('z-index:1500'),'global import workbench must overlay any SUPER analysis surface.');
assert(!kernel.includes("const migration='builtin.resonance-workbench'"),'core SUPER initialization must not hard-code resonance or any other domain plugin.');
assert(JSON.parse(read('src/plugins/resonance-workbench/plugin.json')).workspace?.defaultSuper===true,'the preferred initial SUPER must be declared by the plugin manifest, not by core.');
assert(kernel.includes("const opened=await host?.openActivityWindow?.(spec.id)"),'non-SUPER TOP navigation must use the generic independent-window host.');
assert(kernel.includes("if(mode==='split'&&(!layout.left||!layout.main))"),'split TOP workspaces must require left/main regions.');
assert(kernel.includes("if(mode==='native'&&!rootSelector)"),'native TOP workspaces must validate a root selector without requiring split regions.');
const pluginWindowRuntime=read('src/plugin-window/runtime.js');
assert(pluginWindowRuntime.indexOf('window.DKDSPluginWindowRuntime = null')<pluginWindowRuntime.indexOf('for(const file of (spec.scripts||[]))'),'dedicated host must clear the runtime factory before support scripts, never after them.');
const pulseDedicated=read('src/plugins/pulse-analysis/analysis-service.js');
const pulseTopAdapter=read('src/plugins/pulse-analysis/window-runtime.js');
assert(pulseDedicated.includes('window.DKDSPulseAnalysisService'),'Pulse support script must publish the service factory consumed by its thin TOP adapter.');
assert(pulseTopAdapter.includes('window.DKDSPulseAnalysisService'),'Pulse TOP adapter and support service must share one explicit runtime contract.');
assert(kernel.includes('打开失败'),'window-open failures must be surfaced instead of silently leaving another plugin UI visible.');
assert(manager.includes('resetManagerScrollChain')&&manager.includes('settleManagerAtTop(frames=12)'),'plugin manager must repair late Chromium scroll anchoring after lifecycle changes.');
assert(ui.includes('dkds-portable-placement-trigger')&&ui.includes('new ContextMenu(this.owner)'),'portable charts must expose compact breadcrumb placement through core context menus.');
assert(ui.includes("placementIcons={home:'◫',left:'←'")&&ui.includes("right:'→',bottom:'↓',float:'↗'"),'portable chart trigger/menu must expose the compact ◫ ← → ↓ ↗ placement grammar.');
assert(ui.includes('createPortableZones()')&&ui.includes('portable(id,node,spec={})'),'core Workbench must own dedicated local portable zones and a portable() API.');

// TER/Pulse/Data Center are no longer monolithic plugins. Their feature logic is
// shared between SUPER and TOP hosts through a controller/view/runtime stack.
for(const folder of ['ter-analysis','pulse-analysis','data-center']){
  const entry=read(`src/plugins/${folder}/plugin.js`);
  const controller=read(`src/plugins/${folder}/controller.js`);
  const views=read(`src/plugins/${folder}/shared-views.js`);
  const feature=read(`src/plugins/${folder}/feature-runtime.js`);
  const superAdapter=read(`src/plugins/${folder}/super-layout.js`);
  assert(entry.split(/\r?\n/).length<40,`${folder}: plugin.js must be a thin composition entry.`);
  assert(controller.includes('selection.channel'),`${folder}: controller must own shared selection state.`);
  assert(folder==='data-center'?controller.includes('ctx.state.create'):controller.includes('command(name,...args)'),`${folder}: Controller must own domain state/command boundaries instead of acting as a selection-only shell.`);
  assert(views.includes('analysisSurface||ctx.ui.analysisWorkbench'),`${folder}: shared views must mount through unified AnalysisWorkbench.`);
  assert(views.includes('wb.compose'),`${folder}: shared views must compose a PRIMARY surface.`);
  assert(feature.includes('ctx.ui.charts'),`${folder}: feature runtime must consume core Chart Surface.`);
  assert(feature.includes('ctx.ui.actions'),`${folder}: feature runtime must consume core Dynamic Action Group.`);
  assert(superAdapter.split(/\r?\n/).length<30,`${folder}: SUPER adapter must contain host mapping only.`);
  for(const token of ['Plotly.','calculate','analyze','renderChart','innerHTML=`'])assert(!superAdapter.includes(token),`${folder}: SUPER adapter leaked feature logic (${token}).`);
}
const terViews=read('src/plugins/ter-analysis/shared-views.js');
const pulseViews=read('src/plugins/pulse-analysis/shared-views.js');
const dcViews=read('src/plugins/data-center/shared-views.js');
assert(!terViews.includes("right:{target:'.ter-workspace-main'}")&&!terViews.includes("bottom:{target:'.ter-workspace-main'}"),'TER must not map portable docks back into its semantic main region.');
assert(!pulseViews.includes("right:{target:'.pulse-config-card'}")&&!pulseViews.includes("bottom:{target:'.pulse-config-card'}"),'Pulse must not map portable docks back into its configuration region.');
assert(!dcViews.includes("right:{target:'.dc-main'}")&&!dcViews.includes("bottom:{target:'.dc-main'}"),'Data Center must not map portable docks back into its semantic main region.');
for(const token of ['terAutoParamsBtn','terCalculateBtn'])assert(!terViews.includes(token),`TER primary action must have one header contribution only: ${token}`);
for(const token of ['pulseAddFilesBtn','pulseAnalyzeCurrentBtn','pulseAnalyzeCheckedBtn'])assert(!pulseViews.includes(token),`Pulse primary action must have one header contribution only: ${token}`);
for(const token of ['dcRefreshArtifacts','dcRunWorkflow'])assert(!dcViews.includes(token),`Data Center primary action must have one header contribution only: ${token}`);

for(const folder of ['ter-analysis','pulse-analysis']){
  const topAdapter=read(`src/plugins/${folder}/window-runtime.js`);
  assert(topAdapter.split(/\r?\n/).length<30,`${folder}: TOP adapter must remain lifecycle/service mapping only.`);
  for(const token of ['Plotly.','calculate','analyze','renderChart','innerHTML=`'])assert(!topAdapter.includes(token),`${folder}: TOP adapter leaked feature logic (${token}).`);
}

console.log('Generic TOP/SUPER architecture and migrated plugin regression checks passed.');
