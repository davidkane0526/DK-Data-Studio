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
assert(superLayout.includes("mode:'super'")&&superLayout.includes("root:document.querySelector('#app')")&&superLayout.includes("reason:'resonance-super-adapter'"),'SUPER adapter may only select the common workbench host and resize lifecycle.');
assert(runtime.includes("mode:'top'")&&runtime.includes("root:document.querySelector('#app')")&&runtime.includes('statusBar'),'TOP adapter may only map dedicated-window host surfaces.');
for(const token of ['mountSuper','createTop','Shared.normalizeWorkspace','Shared.pluginSliceFromProject','sharedController.buildTrendModel()','sharedController?.computeSpacingRows','DKDSResonanceViewComponents'])assert(feature.includes(token),`Feature runtime missing shared behavior: ${token}.`);
assert(views.includes("defaultPlacement:'right'")&&views.includes("defaultPlacement:'bottom'"),'Shared View composition must own resonance PRIME placement intent.');
assert(!feature.includes('ctx.ui.sidebar.add')&&!feature.includes('ctx.ui.inspectors')&&!feature.includes('ctx.ui.groupViews'),'Feature runtime must not retain the legacy SUPER-only UI composition.');
assert(feature.includes('publishPeakSelection')&&feature.includes('publishSweepSelection')&&feature.includes('publishRangeSelection'),'Resonance feature runtime must use one shared interaction path for main/inspector/group/trend.');
assert(feature.includes('updateGroupHighlights')&&feature.includes("'resonance-trend'")&&feature.includes("'resonance-group'"),'Resonance trend/group views must link back to the shared peak selection.');
assert(feature.includes('selectRegion')&&feature.includes('setRangeCategory'),'Resonance range selection must preserve multi-peak operations from the mature workbench.');
assert(shared.includes('registerDataTypes'),'Resonance must register domain data/result types through the shared plugin contract.');

assert(kernel.includes('row?.scripts')&&kernel.includes('for(const script of scripts)await loadScript(script)'),'Built-in plugin loader must support plugin-owned support scripts.');
assert(generated.includes('plugins/resonance-workbench/workbench-shared.js')&&generated.includes('plugins/resonance-workbench/view-components.js')&&generated.includes('plugins/resonance-workbench/feature-runtime.js')&&generated.includes('plugins/resonance-workbench/super-layout.js'),'Generated plugin index must preserve Controller/View/feature/adapter support-script order.');

// Execute the shared Controller and View component layers in isolation.
const context={window:{DKDSScience:{preset:()=>({_preset:'balanced'}),peakMetrics:(p)=>({v:p.v,i:p.i,vg:p.vg,fwhm:p.fwhm||0,amplitude:p.amplitude||0,area:p.area||0,prominence:p.prominence||0}),computeResonantTerForLabel:()=>[]}},structuredClone,console};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(shared,context,{filename:'workbench-shared.js'});
vm.runInContext(views,context,{filename:'view-components.js'});
const W=context.window.DKDSResonanceWorkbenchShared;
const V=context.window.DKDSResonanceViewComponents;
assert(W&&W.VIEW_CATALOG.length===6,'Shared Controller global must expose six canonical views.');
assert(V&&V.VIEW_CATALOG===W.VIEW_CATALOG,'Shared View layer must consume the canonical Controller view catalog instead of defining another one.');
const sweeps=[{id:'f0',direction:1,vg:0},{id:'f1',direction:1,vg:1}];
const peaks=[
  {id:'a0',sweepId:'f0',direction:1,vg:0,v:.1,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'b0',sweepId:'f0',direction:1,vg:0,v:.4,i:1,peakOrder:2,peakLabel:'B',accepted:true},
  {id:'a1',sweepId:'f1',direction:1,vg:1,v:.2,i:1,peakOrder:1,peakLabel:'A',accepted:true},
  {id:'b1',sweepId:'f1',direction:1,vg:1,v:.6,i:1,peakOrder:2,peakLabel:'B',accepted:true}
];
const service={
  getState:()=>({sweeps,peaks,datasets:[]}),
  selectedPeak:()=>null,selectedSweep:()=>null,
  visibleSweepIds:()=>sweeps.map(s=>s.id),
  sweepById:id=>sweeps.find(s=>s.id===id),
  peakLabel:p=>p.peakLabel,directionName:()=> '正扫',metrics:(p)=>({v:p.v,i:p.i,vg:p.vg,fwhm:0,amplitude:0,area:0,prominence:0})
};
const controller=W.createController(service,{science:context.window.DKDSScience});
const viewSet=V.create(controller);
assert(viewSet.catalog.length===6&&viewSet.main.label==='共振分析'&&viewSet.gate.label==='栅压分析','Both layout adapters must receive the same six shared View descriptors.');
assert(viewSet.gate.superPageHtml().includes('gateAnalysisPage')&&viewSet.spacing.superPageHtml().includes('spacingPage'),'Shared View components must own mature SUPER page templates.');
assert(viewSet.topPageHtml().includes('reswinMainPlot')&&viewSet.topPageHtml().includes('data-reswin-view-panel="gate"'),'Shared View components must compose the dedicated TOP surface.');
const trend=controller.buildTrendModel();
assert(trend.series.length===2,'Shared trend model must build both peak families from one controller state.');
const opts=controller.acceptedSeriesOptions();
const a=opts.find(o=>o.label==='A'),b=opts.find(o=>o.label==='B');
const spacing=controller.computeSpacingRows(a.key,b.key);
assert(spacing.length===2&&Math.abs(spacing[0].spacing-.3)<1e-12&&Math.abs(spacing[1].spacing-.4)<1e-12,'Shared spacing model must be deterministic and reusable by SUPER/TOP.');

console.log('Resonance shared View/Controller architecture checks passed.');
