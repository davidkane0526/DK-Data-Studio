const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const manifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
const entry=read('src/plugins/resonance-workbench/plugin.js');
const shared=read('src/plugins/resonance-workbench/workbench-shared.js');
const unitPresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
const views=read('src/plugins/resonance-workbench/view-components.js');
const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
const featureContext=read('src/plugins/resonance-workbench/feature-context.js');
const dataFeature=read('src/plugins/resonance-workbench/feature-data-runtime.js');
const terFeatureRuntime=read('src/plugins/resonance-workbench/feature-ter-runtime.js');
const groupFeature=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const analysisFeature=read('src/plugins/resonance-workbench/feature-analysis-runtime.js');
const peakFeature=read('src/plugins/resonance-workbench/feature-peak-runtime.js');
const selectionFeature=read('src/plugins/resonance-workbench/feature-selection-runtime.js');
const inspectorProjection=read('src/plugins/resonance-workbench/inspector-detail-projection.js');
const inspectorFeature=read('src/plugins/resonance-workbench/feature-inspector-runtime.js');
const markerProjection=read('src/plugins/resonance-workbench/main-marker-projection.js');
const mainPlotFeature=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
const controlsFeature=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
const domainAdapter=read('src/plugins/resonance-workbench/domain-adapter.js');
const featureLayers=[feature,featureContext,dataFeature,terFeatureRuntime,groupFeature,analysisFeature,peakFeature,selectionFeature,inspectorProjection,inspectorFeature,markerProjection,mainPlotFeature,controlsFeature].join('\n');
const superLayout=read('src/plugins/resonance-workbench/super-layout.js');
const runtime=read('src/plugins/resonance-workbench/window-runtime.js');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const generated=read('src/generated/plugin-index.js');

assert((manifest.scripts||[]).join(',')==='workbench-shared.js,unit-presentation.js,view-components.js,feature-context.js,feature-data-runtime.js,feature-ter-runtime.js,feature-group-runtime.js,feature-analysis-runtime.js,feature-peak-runtime.js,feature-selection-runtime.js,inspector-detail-projection.js,feature-inspector-runtime.js,main-marker-projection.js,feature-main-plot-runtime.js,feature-controls-runtime.js,feature-runtime.js,super-layout.js,domain-adapter.js,plugin.js','Resonance main renderer must load Controller, shared Views, dedicated data owner, feature runtimes, SUPER adapter, then thin entry.');
assert((manifest.window?.scripts||[]).join(',')==='workbench-shared.js,unit-presentation.js,view-components.js,feature-context.js,feature-data-runtime.js,feature-ter-runtime.js,feature-group-runtime.js,feature-analysis-runtime.js,feature-peak-runtime.js,feature-selection-runtime.js,inspector-detail-projection.js,feature-inspector-runtime.js,main-marker-projection.js,feature-main-plot-runtime.js,feature-controls-runtime.js,feature-runtime.js','Resonance TOP must load the same Controller/View/data/feature layers; runtime is only a host adapter.');
assert(manifest.scripts.includes('domain-adapter.js')&&!(manifest.window?.scripts||[]).includes('domain-adapter.js'),'Only the production-owning main host may publish the dependency-scoped live Domain Adapter.');
assert(domainAdapter.includes("ctx.services.domain.provide('live'")&&!/createTop|createController/.test(domainAdapter),'Resonance Domain Adapter must remain a thin projection over the single production service owner.');
assert(mainPlotFeature.includes("require('builtin.resonance-workbench','main-marker-projection')")&&domainAdapter.includes("require('builtin.resonance-workbench','main-marker-projection')"),'Accepted main plot and Domain Adapter must share one marker projection module.');
assert(inspectorFeature.includes("require('builtin.resonance-workbench','inspector-detail-projection')")&&domainAdapter.includes("require('builtin.resonance-workbench','inspector-detail-projection')"),'Accepted Inspector and Domain Adapter must share one detail projection module.');
assert(!/(querySelector|querySelectorAll|addEventListener|innerHTML\s*=|window\.DKDS)/.test(entry),'Resonance plugin entry must stay orchestration-only and consume SDK/module contracts instead of owning DOM or host globals.');
assert(entry.includes('shared.createController')&&entry.includes('views.mountTop')&&entry.includes('layout.mount'),'Resonance entry must dispatch through shared Controller/View layers.');
assert(!entry.includes('reswinMainPlot')&&!entry.includes('gateAnalysisPage'),'Thin entry must not contain feature-specific markup.');
for(const token of ['VIEW_CATALOG','createController','normalizeWorkspace','buildTrendModel','computeSpacingRows'])assert(shared.includes(token),`Shared Controller layer missing ${token}.`);
assert(!shared.includes('reswinMainPlot')&&!shared.includes('gateAnalysisPage'),'Controller layer must not own renderer markup.');
for(const token of ['mountUnified','mountTop',"ctx.modules.require('unit-presentation')"])assert(views.includes(token),`Shared View behavior layer missing ${token}.`);
for(const token of ['units.workspace.create','units.prime.build','units.scientificPlot.create','wb.compose'])assert(unitPresentation.includes(token),`Resonance Unit presentation missing ${token}.`);
const resonanceManifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
assert(Array.isArray(resonanceManifest.styles)&&resonanceManifest.styles.includes('plugin.css'),'Resonance domain CSS must be manifest-owned.');
assert(!resonanceManifest.requiresCore.includes('ui.styles'),'Resonance must not inject static CSS through ui.styles.');
for(const label of ['共振分析','曲线检查','组图分析','物理机制','峰间距','栅压分析'])assert(shared.includes(label),`Canonical view catalog missing ${label}.`);
for(const [name,adapter] of [['SUPER',superLayout],['TOP',runtime]]){
  assert(adapter.split(/\r?\n/).length<45,`${name} adapter must remain host-only.`);
  for(const forbidden of ['Plotly.','detectPeaks','computeTerMatrix','buildTrendModel','computeSpacingRows','gateAnalysisPage','reswinMainPlot'])assert(!adapter.includes(forbidden),`${name} adapter regained feature logic: ${forbidden}`);
}
assert(superLayout.includes("mode:'super'")&&superLayout.includes("root:ctx.ui.dom.query('#app')")&&superLayout.includes("reason:'resonance-super-adapter'"),'SUPER adapter may only select the common workbench host and resize lifecycle.');
assert(runtime.includes("mode:'top'")&&runtime.includes("root:dom?.query?.('#app')")&&runtime.includes("DKDSPluginModules.define('builtin.resonance-workbench','window-runtime'"),'TOP adapter may only map dedicated-window host surfaces through Core Module Registry.');
for(const token of ['mountSuper','createTop','Shared.normalizeWorkspace','Shared.pluginSliceFromProject','sharedController.buildTrendModel()','sharedController?.computeSpacingRows','DKDSPluginModules'])assert(featureLayers.includes(token),`Resonance feature module graph missing shared behavior: ${token}.`);
assert(unitPresentation.includes('resparInspectorPanel')&&unitPresentation.includes('resparGroupPanel')&&!unitPresentation.includes('data-respar-dock="inspect"')&&!unitPresentation.includes('data-respar-dock="group"'),'Unit presentation must own the reference inspector/group surfaces while placement chrome comes only from Core PortableView.');
assert(unitPresentation.includes('wb.compose')&&unitPresentation.includes('existingNode:ins.panel')&&unitPresentation.includes('existingNode:grp.panel')&&unitPresentation.includes("stateVersion:'workspace-v5'"),'GRS-parity PRIME surfaces must be Unit-composed and placement-persisted without changing the accepted state namespace.');
assert(!views.includes('workspaceSurface.create')&&unitPresentation.includes('units.workspace.create')&&unitPresentation.includes("hostMode:isTop?'top':'super'"),'Resonance must mount the same Unit Workspace for SUPER and TOP; behavior code may not retain a second composition owner.');
assert(views.includes('R.setEntityRuntime?.(ctx.data.entities)')&&feature.includes('setEntityRuntime(runtime)')&&!feature.includes('uiRuntime?.entities'),'Resonance domain identity must consume the formal ctx.data.entities contract instead of treating entities as plugin-private UI state.');
assert(unitPresentation.includes("presentationRole:'data-control'")&&unitPresentation.includes("presentationPurpose:'parameters'")&&unitPresentation.includes('existingNode:dataNode')&&unitPresentation.includes("groupDefault")&&unitPresentation.includes(":'bottom'"),'GRS-derived control rail must be a titleless Unit data-control PRIME; group PRIME keeps bottom as its fallback default while settings may override it.');
assert(views.includes("id:'export',label:'导出',menu:true")&&views.includes("ctx.ui.menus.add({id,menu:'export'"),'TOP must expose one local Export menu while SUPER contributes the same export actions to the host menu.');
assert(!views.includes("['res-inspect','检查','PRIME'")&&!views.includes("['res-group','组图','PRIME'")&&views.includes("ctx.ui.toolbar.add({id:'res-settings'"),'SUPER surface navigation must be Presenter-owned; Resonance may keep command-only Settings/Export contributions.');
assert(!views.includes('const makeDraggable'),'Resonance parity must not reimplement draggable/docking infrastructure inside the plugin.');
assert((manifest.window?.dependencies||[]).includes('scientific-renderer'),'Dedicated TOP must declare the renderer-neutral Core scientific renderer; D3 is a Core implementation detail.');
assert(!views.includes("id:'undo',label:'↶'")&&!views.includes("id:'deselect',label:'取消'")&&unitPresentation.includes('resparRangeApplyIdentity'),'Undo/deselect are system edit operations and must not be duplicated as resonance PRIME/SUB commands.');
assert(feature.includes('undoLastAction')&&feature.includes('applyRangeIdentity')&&feature.includes('applySelectedRangeIdentity'),'Shared feature runtime must own undo and range peak identity operations.');
assert(views.includes("ctx.ui.edit?.register?.")&&views.includes("undo:()=>ctx.commands.run('builtin.resonance.undo')")&&views.includes("deselect:()=>ctx.commands.run('builtin.resonance.deselect')"),'Resonance system edit actions must converge on the same Command Registry used by Interaction Behavior.');
assert(!feature.includes('ctx.ui.sidebar.add')&&!feature.includes('ctx.ui.inspectors')&&!feature.includes('ctx.ui.groupViews'),'Feature runtime must not retain the legacy SUPER-only UI composition.');
assert(feature.includes('publishPeakSelection')&&feature.includes('publishSweepSelection')&&feature.includes('publishRangeSelection'),'Resonance feature runtime must use one shared interaction path for main/inspector/group/trend.');
assert(featureLayers.includes('pointEntity:peakPointEntity')&&featureLayers.includes('onEntitySelect')&&featureLayers.includes("'resonance-trend'")&&featureLayers.includes("'resonance-group'")&&!featureLayers.includes('updateGroupHighlights')&&!featureLayers.includes('charts.restyle('),'Resonance trend/group views must delegate peak focus styling and selection to Core ScientificPlot instead of private restyle logic.');
assert(selectionFeature.includes('selectRegion')&&selectionFeature.includes('peaksInRange')&&selectionFeature.includes('applyRangeIdentity')&&selectionFeature.includes('setRangeLocked'),'Resonance range selection must preserve multi-peak operations without the retired duplicate range menu path.');
const ui=read('src/generated/runtime/ui-infrastructure.js');
assert(ui.includes('d3.scaleSequential(d3.interpolateTurbo)')&&ui.includes("Number(curve.direction)<0?'7 4':null"),'Core ScientificCurveSurface must own the GRS Turbo palette and reverse-direction dash semantics.');
assert(ui.includes('d3.drag().clickDistance(7)')&&ui.includes("routeInteraction('context','marker'")&&ui.includes('getManipulators')&&ui.includes('emitManipulation'),'Core ScientificCurveSurface must own domain-neutral direct manipulation while right-click policy resolves through Interaction Behavior.');
assert(mainPlotFeature.includes("gesture:'click',target:'curve',modifiers:['shift'],command:'builtin.resonance.add-point'")&&views.includes("['builtin.resonance.add-point',payload=>"),'Modified curve-click semantics must be declared by the main-plot Interaction Behavior adapter and execute through a plugin Command.');
assert(ui.includes("gesture:'box',target:'background',modifiers:['ctrl'],intent:'zoom-box'")&&ui.includes('wheel.dkdssci')&&ui.includes('scaleDomainAround'),'Box and wheel geometry remain Core capabilities while their semantics are declared by Interaction Behavior.');
assert(ui.includes('dkds-direct-range-handle')&&ui.includes("kind==='range'")&&mainPlotFeature.includes("action:'analysis-window'")&&mainPlotFeature.includes('onManipulationCommit')&&!featureLayers.includes('onWidthWindowCommit'),'Core must own generic range manipulators while the Resonance main-plot adapter maps resulting geometry to its analysis-window/FWHM domain state.');
assert(mainPlotFeature.includes('live.uiRuntime?.scientificPlot')&&!featureLayers.includes('d3.drag().clickDistance(7)')&&!featureLayers.includes('wheel.resmain'),'Resonance main-plot adapter must consume Core ScientificCurveSurface rather than retain a private D3 interaction implementation.');
assert(controlsFeature.includes('fitVisibleData')&&controlsFeature.includes('actions.ensureMainSurface()?.fitToData?.')&&controlsFeature.includes("fitVisibleData('visibility')")&&controlsFeature.includes("fitVisibleData('visibility-all')"),'Visibility changes must auto-fit the main plot to the currently visible sweeps through Core ScientificCurveSurface from the control-rail owner.');
assert(controlsFeature.includes('respar-dataset-item')&&controlsFeature.includes('respar-dataset-vg')&&controlsFeature.includes('respar-dataset-transform'),'Resonance Control Rail must own the GRS-derived compact dataset row structure.');
assert(groupFeature.includes('groupGridController?.adoptPlot?.(`resonance-group:${key}`')&&groupFeature.includes("placements:['home','left','right','bottom','float','global']"),'Every group subplot must be semantically adopted by Core PlotGroup → PlotView while preserving the accepted card/header DOM and whole-interface free float.');
assert(featureLayers.includes("line:{color:sr.color,dash:sr.direction<0?'dash':'solid'}")&&featureLayers.includes('marker:{color:sr.color'),'Group/trend traces must preserve reference peak-family cool/warm color semantics.');
assert(shared.includes('registerDataTypes'),'Resonance must register domain data/result types through the shared plugin contract.');

assert(kernel.includes('row?.scripts')&&kernel.includes('selectedPlatformScripts')&&kernel.includes('for(const script of [...scripts,...selectedPlatformScripts])await loadScript(script)'),'Built-in plugin loader must support ordered shared support scripts plus host-selected platform presentation scripts.');
assert(generated.includes('plugins/resonance-workbench/workbench-shared.js')&&generated.includes('plugins/resonance-workbench/unit-presentation.js')&&generated.includes('plugins/resonance-workbench/view-components.js')&&generated.includes('plugins/resonance-workbench/feature-context.js')&&generated.includes('plugins/resonance-workbench/feature-data-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-ter-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-group-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-analysis-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-peak-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-selection-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-inspector-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-main-plot-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-controls-runtime.js')&&generated.includes('plugins/resonance-workbench/feature-runtime.js')&&generated.includes('plugins/resonance-workbench/super-layout.js')&&generated.includes('plugins/resonance-workbench/domain-adapter.js'),'Generated plugin index must preserve Controller/View/feature/domain-adapter support-script order.');

// Execute the shared Controller and View component layers in isolation.
const modules=new Map();
const moduleRuntime={
  define:(pluginId,name,value)=>{modules.set(`${pluginId}/${name}`,value);return value;},
  get:(pluginId,name)=>modules.get(`${pluginId}/${name}`)||null,
  require:(pluginId,name)=>{const value=modules.get(`${pluginId}/${name}`);if(!value)throw new Error(`missing module ${pluginId}/${name}`);return value;}
};
const context={window:{DKDSPluginModules:moduleRuntime,DKDSScience:{preset:()=>({_preset:'balanced'}),peakMetrics:(p)=>({v:p.v,i:p.i,vg:p.vg,fwhm:p.fwhm||0,amplitude:p.amplitude||0,area:p.area||0,prominence:p.prominence||0}),computeResonantTerForLabel:()=>[]}},structuredClone,console};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(shared,context,{filename:'workbench-shared.js'});
vm.runInContext(views,context,{filename:'view-components.js'});
const W=moduleRuntime.require('builtin.resonance-workbench','workbench-shared');
const V=moduleRuntime.require('builtin.resonance-workbench','view-components');
assert(W&&W.VIEW_CATALOG.length===6,'Shared Controller module must expose six canonical views.');
assert(V&&typeof V.mountUnified==='function'&&typeof V.mountTop==='function','Shared View behavior layer must expose only the common Unit-backed mount adapters.');
const sweeps=[{id:'f0',direction:1,vg:0},{id:'f1',direction:1,vg:1},{id:'r0',direction:-1,vg:0},{id:'r1',direction:-1,vg:1}];
const peaks=[
  {id:'a0',sweepId:'f0',direction:1,vg:0,v:.1,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'b0',sweepId:'f0',direction:1,vg:0,v:.4,i:1,peakOrder:2,peakLabel:'B',accepted:true},
  {id:'a1',sweepId:'f1',direction:1,vg:1,v:.2,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'b1',sweepId:'f1',direction:1,vg:1,v:.6,i:1,peakOrder:2,peakLabel:'B',accepted:true},
  {id:'ar0',sweepId:'r0',direction:-1,vg:0,v:.12,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'br0',sweepId:'r0',direction:-1,vg:0,v:.43,i:1,peakOrder:2,peakLabel:'B',accepted:true},
  {id:'ar1',sweepId:'r1',direction:-1,vg:1,v:.23,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'br1',sweepId:'r1',direction:-1,vg:1,v:.64,i:1,peakOrder:2,peakLabel:'B',accepted:true}
];
const service={
  getState:()=>({sweeps,peaks,datasets:[]}),
  selectedPeak:()=>null,selectedSweep:()=>sweeps[0],
  visibleSweepIds:()=>sweeps.map(s=>s.id),
  sweepById:id=>sweeps.find(s=>s.id===id),
  peakLabel:p=>p.peakLabel,directionName:()=> '正扫',metrics:(p)=>({v:p.v,i:p.i,vg:p.vg,fwhm:0,amplitude:0,area:0,prominence:0})
};
const controller=W.createController(service,{science:context.window.DKDSScience});
assert(W.VIEW_CATALOG.some(row=>row.id==='main'&&row.label==='共振分析')&&W.VIEW_CATALOG.some(row=>row.id==='gate'&&row.label==='栅压分析'),'Controller must retain the six shared semantic View descriptors consumed by Unit composition and Presenter routing.');
const trend=controller.buildTrendModel();
assert(trend.series.length===4&&trend.series.some(s=>s.direction>0)&&trend.series.some(s=>s.direction<0),'Shared trend model must project every visible forward/reverse peak family even when one forward sweep is focused.');
const metricsPendingService={...service,metrics:()=>null};
const metricsPendingController=W.createController(metricsPendingService,{science:context.window.DKDSScience});
const pendingTrend=metricsPendingController.buildTrendModel();
assert(pendingTrend.series.length===4&&pendingTrend.series.every(series=>series.points.length===2),'Vpk/Ipk group trends must remain available while optional peak-metrics computation is pending.');
assert(pendingTrend.series.flatMap(series=>series.points).every(point=>Number.isFinite(point.v)&&Number.isFinite(point.i)&&point._peak?.id),'Base group trend points must preserve peak identity and Vpk/Ipk without requiring FWHM metrics.');
const opts=controller.acceptedSeriesOptions();
const a=opts.find(o=>o.label==='A'&&o.direction>0),b=opts.find(o=>o.label==='B'&&o.direction>0);
const spacing=controller.computeSpacingRows(a.key,b.key);
assert(spacing.length===2&&Math.abs(spacing[0].spacing-.3)<1e-12&&Math.abs(spacing[1].spacing-.4)<1e-12,'Shared spacing model must be deterministic and reusable by SUPER/TOP.');

console.log('Resonance shared View/Controller architecture checks passed.');
