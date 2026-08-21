const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const ui=read('src/core/ui-infrastructure.js');
const css=read('src/style.css');
const kernel=read('src/core/plugin-kernel.js');
const resonanceViews=read('src/plugins/resonance-workbench/view-components.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');

for(const token of ['class PluginWorkspace extends AnalysisWorkbench','class ScientificCurveSurface','this.pluginWorkspace={create:createPluginWorkspace}','this.scientificPlot={']){
  assert(ui.includes(token),`Core PluginWorkspace foundation missing ${token}`);
}
for(const token of ['workspaceSurface:','pluginWorkspace: infrastructureScope?.pluginWorkspace','scientificPlot: infrastructureScope?.scientificPlot',"name:'GRS Plugin Workspace'",'hostInvariant:true']){
  assert(kernel.includes(token),`Plugin API missing GRS-derived base capability: ${token}`);
}
for(const token of ['.dkds-plugin-workspace{','.dkds-scientific-curve-surface{','.dkds-scientific-curve-hit{','.dkds-scientific-marker-hit{','.dkds-scientific-direct-box.is-zoom{','.dkds-scientific-width-handle{']){
  assert(css.includes(token),`Shared GRS-derived design/interaction style missing ${token}`);
}
assert(ui.includes('d3.scaleSequential(d3.interpolateTurbo)'),'ScientificCurveSurface must provide the reference continuous Turbo curve palette.');
assert(ui.includes("Number(curve.direction)<0?'7 4':null"),'ScientificCurveSurface must provide reverse-direction dash semantics.');
assert(ui.includes('onRangeSelect')&&ui.includes('onCurveModifiedClick')&&ui.includes('onMarkerDrag')&&ui.includes('onWidthDrag'),'ScientificCurveSurface must expose range, modified-click, marker-drag and width-drag semantic hooks.');
assert(ui.includes('wheel.dkdssci')&&ui.includes('rangeDrag.zoom')&&ui.includes("plotBg.on('dblclick'"),'ScientificCurveSurface must own wheel zoom, box zoom and double-click reset.');
assert(ui.includes('getColorDomainValues')&&ui.includes('onWheelZoomStart'),'ScientificCurveSurface must preserve stable color domains and expose pre-wheel semantic hooks.');
assert(ui.includes('setInteraction(interaction)')&&ui.includes('closestInSet')&&ui.includes('this.selectEntity('),'ScientificCurveSurface must consume Core Entity/Interaction state and provide automatic entity selection for declarative curves/markers.');

assert(resonanceViews.includes('ctx.ui.workspaceSurface||ctx.ui.pluginWorkspace'),'Resonance must consume the shared PluginWorkspace rather than a private shell.');
assert(resonanceViews.includes("hostMode:isTop?'top':'super'"),'SUPER/TOP may only annotate the host mode; they must mount the same internal workspace.');
assert(resonanceFeature.includes('uiRuntime?.scientificPlot'),'Resonance must consume Core ScientificCurveSurface.');
assert(resonanceFeature.includes('interaction:interactionRuntime')&&resonanceFeature.includes('entityId:String(sw.id)'),'Resonance main D3 surface must declare entity identity to Core rather than privately restyle selection.');
assert(!resonanceFeature.includes('charts.restyle('),'Resonance must not own Plotly selection restyling; Core ScientificPlot owns focus visuals.');
assert(resonanceFeature.includes('getColorDomainValues:()=>datasets.map'),'Resonance must keep the GRS color mapping stable against visibility changes through the Core color-domain contract.');
assert(resonanceFeature.includes('onWheelZoomStart:()=>clearMainRangeMenu({keepSelection:true})'),'Resonance domain UI must use the Core wheel lifecycle hook rather than private wheel plumbing.');
for(const forbidden of ['d3.drag().clickDistance(7)','wheel.resmain','rangeDrag={pointerId']){
  assert(!resonanceFeature.includes(forbidden),`Resonance retained base interaction plumbing: ${forbidden}`);
}
for(const folder of ['data-center','ter-analysis','pulse-analysis']){
  const views=read(`src/plugins/${folder}/shared-views.js`);
  assert(views.includes('ctx.ui.workspaceSurface||ctx.ui.pluginWorkspace'),`${folder} must prefer the same PluginWorkspace foundation.`);
}


// v3.36 canvas-local docking / performance invariants.
for(const token of ['installCanvasDocking(spec)', 'dkds-plugin-canvas-frame', "['left','right','bottom','overlay','main'].includes(key)", 'stateVersion']){
  assert(ui.includes(token),`PluginWorkspace canvas docking missing ${token}`);
}
for(const token of ['.dkds-plugin-canvas-frame{','.dkds-plugin-canvas-left{','.dkds-plugin-canvas-right{','.dkds-plugin-canvas-bottom{','.dkds-plugin-canvas-overlay{']){
  assert(css.includes(token),`PluginWorkspace canvas docking style missing ${token}`);
}
assert(css.includes('.dkds-plugin-canvas-center>.dkds-analysis-primary-host>*{flex:1 1 auto'),'PluginWorkspace primary main node must fill the scientific canvas instead of collapsing to content height.');

assert(ui.includes('avoidFloatOverlap()')&&ui.includes('collisionGap'),'PortableView must keep manually floated scientific panels inside the canvas and avoid accidental overlap.');
assert(ui.includes('z.width-r.width')&&ui.includes('z.height-r.height'),'Floating drag must keep the full panel inside the scientific canvas instead of allowing most of it to leave the workspace.');
assert(ui.includes("this.spec.onMarkerDrag?.")&&ui.includes('this.updateMarkerVisual(marker,point)')&&!ui.includes("this.render('marker-drag')"),'Marker dragging must update only the marker geometry and defer full SVG rebuilding until drag end.');
assert(ui.includes("data-width-side")&&!ui.includes("this.requestRender('width-drag');"),'FWHM dragging must update handle/band geometry in-place and defer full SVG rebuilding until drag end.');
assert(resonanceFeature.includes("onMarkerDragEnd")&&resonanceFeature.includes("reason:'peak-drag'")&&resonanceFeature.includes("reactiveRuntime.effect('resonance.view.inspector'"),'Peak drag must commit one reactive geometry edit; dependent inspector refresh is owned by the dependency runtime.');
assert(resonanceFeature.includes('scientificReact')&&resonanceFeature.includes('uiRuntime?.scientificPlot'),'Derived/group plots must reuse graph objects through the Core ScientificPlot runtime rather than recreate them privately.');

console.log('GRS-derived PluginWorkspace + ScientificCurveSurface foundation checks passed.');
