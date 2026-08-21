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

for(const symbol of ['PortableView','ActionGroup','InteractionBinding','SelectionChannel','SelectionModel','InteractionRuntime','DataTypeRegistry','ResizeScheduler','ContextMenu','SplitController','ChartSurface','PlotView','TableSurface','TableSurfaceRegistry','ViewHost','Workbench','GridController','AnalysisWorkbench']){
  assert(ui.includes(`class ${symbol}`),`core UI infrastructure must expose ${symbol}`);
}
assert(ui.includes("pin(placement='right')"),'portable views must expose pin placement');
assert(ui.includes('dkds-portable-placement-trigger')&&ui.includes('placementLongLabels'),'portable views must use one compact placement breadcrumb/menu rather than a six-button strip');
assert(ui.includes("placementIcons={home:'◫',sticky:'⌖',left:'←'")&&ui.includes("float:'↗'"),'portable placement must show ◫ at home and expose directional icons through its dropdown');
assert(ui.includes('controlsHost')&&ui.includes("controlsPlacement==='start'"),'portable chrome must be injectable into an existing chart action cluster instead of creating a competing header column');
assert(ui.includes('createPortableZones()')&&ui.includes('dkds-portable-zone'),'existing-DOM workbenches must own isolated local docking shelves');
assert(ui.includes('new ContextMenu(this.owner)'),'portable placement must use the core context-menu service');
assert(ui.includes('handleOutsidePointer(event)')&&ui.includes("this.element?.contains?.(event?.target)"),'ContextMenu must ignore pointerdown events originating inside the menu so item clicks can fire.');
assert(ui.includes('this.spec.onClose?.()'),'ContextMenu must expose a lifecycle close hook so shell/menu triggers keep aria-expanded state synchronized.');
assert(ui.includes('menuButton({icon=')&&ui.includes("this.menuButton({icon:'file'")&&ui.includes('dkds-plot-view-file-svg'),'PlotView generic export actions must use the Core-owned file-icon dropdown trigger.');
assert(!ui.includes("window.addEventListener('pointerdown',this.boundClose,true)"),'ContextMenu must not close unconditionally in pointerdown capture phase.');
assert(ui.includes("const rawItems=typeof action.items==='function'")&&ui.includes('action.menu&&Array.isArray(rawItems)'),'ActionGroup must own declarative dropdown menu items.');
assert(ui.includes('onPlacementChanged')&&ui.includes("this.resize('portable-placement')"),'AnalysisWorkbench portable views must synchronously dispatch placement changes and resync regions.');
assert(ui.includes('class SplitController')&&ui.includes('split:spec=>this.trackObject(new SplitController'),'core must provide persisted resizable split infrastructure');
assert(ui.includes("this.allowed.includes('right')")&&ui.includes("this.allowed.includes('bottom')"),'floating views must support edge docking/snap');
assert(ui.includes('spec.existing===true')&&ui.includes('mountExistingSplit'),'Workbench must be able to adapt mature existing DOM and still provide core split/layout infrastructure');
assert(kernel.includes("const API_VERSION = '1.14.0'"),'plugin API must be v1.14.0');
for(const api of ['layout: infrastructureScope?.layout','actions: infrastructureScope?.actions','portable: infrastructureScope?.panels','charts: Object.freeze({...(infrastructureScope?.chartsApi||{}),...(chartScope||{})})','plotViews: infrastructureScope?.plotViews','tables: infrastructureScope?.tables','interactions: infrastructureScope?.interactions','contextMenus: infrastructureScope?.menus','selection: infrastructureScope?.selection','interaction: infrastructureScope?.interactionRuntime','views: infrastructureScope?.views','workbench: infrastructureScope?.workbench']){
  assert(kernel.includes(api),`kernel missing UI API: ${api}`);
}
assert(kernel.includes('state: {')&&kernel.includes('projectSlice'),'kernel must provide lifecycle-owned state/project persistence');
assert(windowManager.includes("'ui-infrastructure'")&&windowManager.includes("'state-store'"),'dedicated plugin windows must allow common UI/state infrastructure');

for(const [name,adapter] of [['SUPER',resonanceSuper],['TOP',resonanceTop]]){
  assert(adapter.split(/\r?\n/).length<45,`${name} resonance adapter must remain thin`);
  for(const forbidden of ['Plotly.','computeTerMatrix','detectPeaks','renderGate','renderPhysics','innerHTML=`'])assert(!adapter.includes(forbidden),`${name} adapter contains feature logic: ${forbidden}`);
}
assert(resonanceFeature.includes('mountSuper')&&resonanceFeature.includes('createTop'),'resonance feature runtime must own both host feature paths');

const migrated={
  'TER':'ter-analysis',
  'Pulse':'pulse-analysis',
  'Data Center':'data-center'
};
for(const [name,folder] of Object.entries(migrated)){
  const entry=read(`src/plugins/${folder}/plugin.js`);
  const controller=read(`src/plugins/${folder}/controller.js`);
  const views=read(`src/plugins/${folder}/shared-views.js`);
  const feature=read(`src/plugins/${folder}/feature-runtime.js`);
  const adapter=read(`src/plugins/${folder}/super-layout.js`);
  const manifest=JSON.parse(read(`src/plugins/${folder}/plugin.json`));
  assert(entry.split(/\r?\n/).length<40,`${name} plugin.js must remain a thin composition entry`);
  assert(controller.includes('selection.model')||controller.includes('interaction?.create'),`${name} controller must use the typed core Selection/Interaction Runtime`);
  assert(views.includes('analysisSurface||ctx.ui.analysisWorkbench'),`${name} shared views must use the unified Analysis Workbench`);
  assert(views.includes('wb.compose'),`${name} must compose its semantic PRIMARY through the Analysis Workbench`);
  assert(feature.includes('ctx.ui.actions')&&(feature.includes('ctx.ui.plotViews')||feature.includes('ctx.ui.charts')),`${name} feature runtime must use dynamic actions and Core PlotView/Chart infrastructure`);
  assert(feature.includes('workbench')&&feature.includes('portable'),`${name} feature runtime must place portable views through its Workbench-local layout`);
  assert(adapter.split(/\r?\n/).length<30,`${name} SUPER adapter must remain host-only`);
  for(const forbidden of ['Plotly.','renderChart','calculate','analyze','innerHTML=`'])assert(!adapter.includes(forbidden),`${name} SUPER adapter contains feature logic: ${forbidden}`);
  const scripts=manifest.scripts||[];
  for(const required of ['controller.js','shared-views.js','feature-runtime.js','super-layout.js','plugin.js'])assert(scripts.includes(required),`${name} manifest must load ${required}`);
}
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const pulseFeature=read('src/plugins/pulse-analysis/feature-runtime.js');
const dataCenterFeature=read('src/plugins/data-center/feature-runtime.js');
const dataCenterController=read('src/plugins/data-center/controller.js');
assert(!terFeature.includes("window.addEventListener('keydown'"),'TER must not own a global keydown listener');
assert(terFeature.includes('controller?.select?.')&&terFeature.includes('controller?.clearSelection?.'),'TER linked chart selection must flow through the shared typed Selection Runtime');
assert(pulseFeature.includes("source:'pulse-file'"),'Pulse current-file selection must flow through the shared typed Selection Runtime');
assert(dataCenterController.includes('ctx.state.create')&&dataCenterController.includes("projectSlice:'workspace'"),'Data Center Controller must own core state/project infrastructure rather than its view runtime.');
console.log('UI infrastructure architecture checks passed.');
