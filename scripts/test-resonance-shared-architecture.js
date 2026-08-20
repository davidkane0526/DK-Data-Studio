const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}

const manifest=JSON.parse(read('src/plugins/resonance-workbench/plugin.json'));
const entry=read('src/plugins/resonance-workbench/plugin.js');
const shared=read('src/plugins/resonance-workbench/workbench-shared.js');
const views=read('src/plugins/resonance-workbench/view-components.js');
const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
const superLayout=read('src/plugins/resonance-workbench/super-layout.js');
const runtime=read('src/plugins/resonance-workbench/window-runtime.js');
const kernel=read('src/core/plugin-kernel.js');
const generated=read('src/plugins/plugin-index.generated.js');

assert((manifest.scripts||[]).join(',')==='workbench-shared.js,view-components.js,feature-runtime.js,super-layout.js,plugin.js','Resonance main renderer must load Controller, shared Views, feature runtime, SUPER adapter, then thin entry.');
assert((manifest.window?.scripts||[]).join(',')==='workbench-shared.js,view-components.js,feature-runtime.js','Resonance TOP must load the same Controller/View/feature layers; runtime is only a host adapter.');
assert(entry.split(/\r?\n/).length<60,'Resonance plugin entry must stay a thin layout dispatcher.');
assert(entry.includes('shared.createController')&&entry.includes('views.mountTop')&&entry.includes('layout.mount'),'Resonance entry must dispatch through shared Controller/View layers.');
assert(!entry.includes('reswinMainPlot')&&!entry.includes('gateAnalysisPage'),'Thin entry must not contain feature-specific markup.');
for(const token of ['VIEW_CATALOG','createController','normalizeWorkspace','buildTrendModel','computeSpacingRows'])assert(shared.includes(token),`Shared Controller layer missing ${token}.`);
assert(!shared.includes('reswinMainPlot')&&!shared.includes('gateAnalysisPage'),'Controller layer must not own renderer markup.');
for(const token of ['topPageHtml','TOP_STYLES','mountUnified','mountTop','superGatePageHtml','superSpacingPageHtml','function create(controller)'])assert(views.includes(token),`Shared View component layer missing ${token}.`);
for(const label of ['共振分析','曲线检查','组图分析','物理机制','峰间距','栅压分析'])assert(shared.includes(label),`Canonical view catalog missing ${label}.`);
for(const [name,adapter] of [['SUPER',superLayout],['TOP',runtime]]){
  assert(adapter.split(/\r?\n/).length<45,`${name} adapter must remain host-only.`);
  for(const forbidden of ['Plotly.','detectPeaks','computeTerMatrix','buildTrendModel','computeSpacingRows','gateAnalysisPage','reswinMainPlot'])assert(!adapter.includes(forbidden),`${name} adapter regained feature logic: ${forbidden}`);
}
assert(superLayout.includes("mode:'super'")&&superLayout.includes("root:ctx.ui.dom.query('#app')")&&superLayout.includes("reason:'resonance-super-adapter'"),'SUPER adapter may only select the common workbench host and resize lifecycle.');
assert(runtime.includes("mode:'top'")&&runtime.includes("root:dom?.query?.('#app')")&&runtime.includes("DKDSPluginModules.define('builtin.resonance-workbench','window-runtime'"),'TOP adapter may only map dedicated-window host surfaces through Core Module Registry.');
for(const token of ['mountSuper','createTop','Shared.normalizeWorkspace','Shared.pluginSliceFromProject','sharedController.buildTrendModel()','sharedController?.computeSpacingRows','DKDSPluginModules'])assert(feature.includes(token),`Feature runtime missing shared behavior: ${token}.`);
assert(views.includes('resparInspectorPanel')&&views.includes('resparGroupPanel')&&!views.includes('data-respar-dock="inspect"')&&!views.includes('data-respar-dock="group"'),'Shared View composition must own the reference inspector/group surfaces while placement chrome comes only from Core PortableView.');
assert(views.includes('wb.compose')&&views.includes('existingNode:inspector')&&views.includes('existingNode:group')&&views.includes("stateVersion:'workspace-v2'"),'GRS-parity PRIME surfaces must be hosted and placement-persisted by the shared PluginWorkspace/PortableView system.');
assert(views.includes('ctx.ui.workspaceSurface||ctx.ui.pluginWorkspace')&&views.includes("hostMode:isTop?'top':'super'"),'Resonance must mount the same PluginWorkspace for SUPER and TOP; host mode may not select a different internal view.');
assert(views.includes('leftNode:leftPanel,mainNode:mainArea')&&views.includes("defaultPlacement:'bottom'"),'GRS-derived control rail and scientific canvas must be expressed through PluginWorkspace composition without imposing a fixed width ratio; group PRIME defaults below the chart canvas.');
assert(views.includes("id:'export',label:'导出',menu:true")&&views.includes("ctx.ui.menus.add({id,menu:'export'"),'TOP must expose one local Export menu while SUPER contributes the same export actions to the host menu.');
assert(views.includes("['res-inspect','检查','PRIME'")&&views.includes("['res-group','组图','PRIME'"),'SUPER must present resonance PRIME commands in the host top command bar rather than duplicate in-plugin navigation.');
assert(!views.includes('const makeDraggable'),'Resonance parity must not reimplement draggable/docking infrastructure inside the plugin.');
assert((manifest.window?.dependencies||[]).includes('d3'),'Dedicated TOP must explicitly declare D3 because the shared main interaction renderer depends on it.');
assert(!views.includes("id:'undo',label:'↶'")&&!views.includes("id:'deselect',label:'取消'")&&views.includes('resparRangeApplyIdentity'),'Undo/deselect are system edit operations and must not be duplicated as resonance PRIME/SUB commands.');
assert(feature.includes('undoLastAction')&&feature.includes('applyRangeIdentity')&&feature.includes('applySelectedRangeIdentity'),'Shared feature runtime must own undo and range peak identity operations.');
assert(views.includes("ctx.ui.edit?.register?.")&&views.includes("undo:()=>{R.undoLastAction?.();return true;}")&&views.includes("deselect:()=>{R.clearSelection?.();return true;}"),'Resonance must register undo/deselect through the system active-plugin edit contract.');
assert(!feature.includes('ctx.ui.sidebar.add')&&!feature.includes('ctx.ui.inspectors')&&!feature.includes('ctx.ui.groupViews'),'Feature runtime must not retain the legacy SUPER-only UI composition.');
assert(feature.includes('publishPeakSelection')&&feature.includes('publishSweepSelection')&&feature.includes('publishRangeSelection'),'Resonance feature runtime must use one shared interaction path for main/inspector/group/trend.');
assert(feature.includes('updateGroupHighlights')&&feature.includes("'resonance-trend'")&&feature.includes("'resonance-group'"),'Resonance trend/group views must link back to the shared peak selection.');
assert(feature.includes('selectRegion')&&feature.includes('setRangeCategory'),'Resonance range selection must preserve multi-peak operations from the mature workbench.');
const ui=read('src/core/ui-infrastructure.js');
assert(ui.includes('d3.scaleSequential(d3.interpolateTurbo)')&&ui.includes("Number(curve.direction)<0?'7 4':null"),'Core ScientificCurveSurface must own the GRS Turbo palette and reverse-direction dash semantics.');
assert(ui.includes('d3.drag().clickDistance(7)')&&ui.includes(".on('contextmenu'")&&ui.includes('onMarkerDrag'),'Core ScientificCurveSurface must own direct marker drag and modifier+right-click delete interaction.');
assert(ui.includes('event.ctrlKey||event.shiftKey')&&feature.includes('onCurveModifiedClick')&&feature.includes('addManualPeak(Number(x))'),'Core must detect modified direct curve clicks while Resonance supplies only the add-peak domain action.');
assert(ui.includes('rangeDrag.zoom')&&ui.includes('wheel.dkdssci')&&ui.includes('scaleDomainAround'),'Direct box zoom and wheel zoom must be Core ScientificCurveSurface capabilities.');
assert(ui.includes('dkds-scientific-width-handle')&&feature.includes('onWidthDrag')&&feature.includes('widthLeft')&&feature.includes('widthRight'),'Core must own editable width handles while Resonance supplies peak-width semantics.');
assert(feature.includes('uiRuntime?.scientificPlot')&&!feature.includes('d3.drag().clickDistance(7)')&&!feature.includes('wheel.resmain'),'Resonance must consume Core ScientificCurveSurface rather than retain a private D3 interaction implementation.');
assert(feature.includes('fitVisibleData')&&feature.includes('mainSurface?.fitToData?.')&&feature.includes("fitVisibleData('visibility')")&&feature.includes("fitVisibleData('visibility-all')"),'Visibility changes must auto-fit the main plot to the currently visible sweeps through Core ScientificCurveSurface.');
assert(feature.includes('respar-dataset-item')&&feature.includes('respar-dataset-vg')&&feature.includes('respar-dataset-transform'),'Resonance dataset rows must use the GRS-derived compact data-list structure.');
assert(feature.includes('uiRuntime?.plotViews?.bind?.(`resonance-group:${key}`')&&feature.includes("placements:['home','left','right','bottom','global']"),'Every group subplot must consume Core PlotView, remain independently portable, and support whole-interface free float.');
assert(feature.includes("line:{color:sr.color,dash:sr.direction<0?'dash':'solid'}")&&feature.includes('marker:{color:sr.color'),'Group/trend traces must preserve reference peak-family cool/warm color semantics.');
assert(shared.includes('registerDataTypes'),'Resonance must register domain data/result types through the shared plugin contract.');

assert(kernel.includes('row?.scripts')&&kernel.includes('for(const script of scripts)await loadScript(script)'),'Built-in plugin loader must support plugin-owned support scripts.');
assert(generated.includes('plugins/resonance-workbench/workbench-shared.js')&&generated.includes('plugins/resonance-workbench/view-components.js')&&generated.includes('plugins/resonance-workbench/feature-runtime.js')&&generated.includes('plugins/resonance-workbench/super-layout.js'),'Generated plugin index must preserve Controller/View/feature/adapter support-script order.');

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
assert(V&&V.VIEW_CATALOG===W.VIEW_CATALOG,'Shared View layer must consume the canonical Controller view catalog instead of defining another one.');
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
const viewSet=V.create(controller);
assert(viewSet.catalog.length===6&&viewSet.main.label==='共振分析'&&viewSet.gate.label==='栅压分析','Both layout adapters must receive the same six shared View descriptors.');
assert(viewSet.gate.superPageHtml().includes('gateAnalysisPage')&&viewSet.spacing.superPageHtml().includes('spacingPage'),'Shared View components must own mature SUPER page templates.');
assert(viewSet.topPageHtml().includes('reswinMainPlot')&&viewSet.topPageHtml().includes('resparInspectorPanel')&&viewSet.topPageHtml().includes('resparGroupPanel')&&viewSet.topPageHtml().includes('data-reswin-view-panel="gate"'),'Shared View components must compose one GRS-parity surface for SUPER and TOP.');
const trend=controller.buildTrendModel();
assert(trend.series.length===4&&trend.series.some(s=>s.direction>0)&&trend.series.some(s=>s.direction<0),'Shared trend model must project every visible forward/reverse peak family even when one forward sweep is focused.');
const opts=controller.acceptedSeriesOptions();
const a=opts.find(o=>o.label==='A'&&o.direction>0),b=opts.find(o=>o.label==='B'&&o.direction>0);
const spacing=controller.computeSpacingRows(a.key,b.key);
assert(spacing.length===2&&Math.abs(spacing[0].spacing-.3)<1e-12&&Math.abs(spacing[1].spacing-.4)<1e-12,'Shared spacing model must be deterministic and reusable by SUPER/TOP.');

console.log('Resonance shared View/Controller architecture checks passed.');
