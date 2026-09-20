const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const ui=read('src/generated/runtime/ui-infrastructure.js');
const css=readCoreCss(root);
const cssCompact=css.replace(/\s*\{/g,'{');
const kernel=read('src/generated/runtime/plugin-kernel.js');
const resonancePresentation=read('src/plugins/resonance-workbench/unit-presentation.js');
const resonanceFeature=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceMainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');

for(const token of ['class PluginWorkspace extends AnalysisWorkbench','class ScientificCurveSurface','this.pluginWorkspace={create:createPluginWorkspace}','this.scientificPlot={']){
  assert(ui.includes(token),`Core PluginWorkspace foundation missing ${token}`);
}
for(const token of ['workspaceSurface:','scientificPlot: infrastructureScope?.scientificPlot',"name:'DK Data Studio Design System'","version:'1.19'",'const tokens=Object.freeze','const roles=Object.freeze','const capabilities=Object.freeze','hostInvariant:true']){
  assert(kernel.includes(token),`Plugin API missing shared workspace/design-system capability: ${token}`);
}
for(const token of ['.dkds-plugin-workspace{','.dkds-scientific-curve-surface{','.dkds-scientific-curve-hit{','.dkds-scientific-marker-hit{','.dkds-scientific-direct-box.is-zoom{','.dkds-direct-handle{']){
  assert(cssCompact.includes(token),`Shared GRS-derived design/interaction style missing ${token}`);
}
assert(ui.includes('d3.scaleSequential(d3.interpolateTurbo)'),'ScientificCurveSurface must provide the reference continuous Turbo curve palette.');
assert(ui.includes("Number(curve.direction)<0?'7 4':null"),'ScientificCurveSurface must provide reverse-direction dash semantics.');
assert(ui.includes('onRangeSelect')&&ui.includes('getManipulators')&&ui.includes('onManipulationPreview')&&ui.includes('onManipulationCommit')&&ui.includes('interactionBehavior'),'ScientificCurveSurface must expose range/manipulation hooks and consume the shared Interaction Behavior policy.');
assert(ui.includes('wheel.dkdssci')&&ui.includes("routeInteraction('box','background'")&&ui.includes("routeInteraction('double-click','background'")&&ui.includes("intent==='zoom-box'"),'ScientificCurveSurface must own gesture geometry while zoom/box/reset semantics are resolved by Interaction Behavior.');
assert(ui.includes('getColorDomainValues')&&ui.includes('onWheelZoomStart'),'ScientificCurveSurface must preserve stable color domains and expose pre-wheel semantic hooks.');
assert(ui.includes('setInteraction(interaction)')&&ui.includes('closestInSet')&&ui.includes('this.selectEntity('),'ScientificCurveSurface must consume Core Entity/Interaction state and provide automatic entity selection for declarative curves/markers.');

assert(resonancePresentation.includes('ctx.ui.unitTemplates')&&resonancePresentation.includes('units.workspace.create'),'Resonance production presentation must consume the Unit workspace facade backed by the single public workspace runtime.');
assert(resonancePresentation.includes("hostMode:isTop?'top':'super'"),'SUPER/TOP may only annotate the host mode; they must mount the same internal workspace.');
assert(resonanceFeature.includes('uiRuntime?.scientificPlot'),'Resonance must consume Core ScientificCurveSurface.');
assert(resonanceMainPlot.includes('interaction:live.interactionRuntime')&&resonanceMainPlot.includes('entityId:String(sw.id)'),'Resonance main D3 surface must declare entity identity to Core through the main-plot adapter rather than privately restyle selection.');
assert(!resonanceFeature.includes('charts.restyle(')&&!resonanceMainPlot.includes('charts.restyle('),'Resonance must not own Plotly selection restyling; Core ScientificPlot owns focus visuals.');
assert(resonanceMainPlot.includes('getColorDomainValues:()=>live.datasets.map'),'Resonance must keep the GRS color mapping stable against visibility changes through the Core color-domain contract.');
assert(resonanceMainPlot.includes('onWheelZoomStart:()=>clearRangeMenu({keepSelection:true})'),'Resonance domain UI must use the Core wheel lifecycle hook through the main-plot adapter rather than private wheel plumbing.');
for(const forbidden of ['d3.drag().clickDistance(7)','wheel.resmain','rangeDrag={pointerId']){
  assert(!resonanceFeature.includes(forbidden)&&!resonanceMainPlot.includes(forbidden),`Resonance retained base interaction plumbing: ${forbidden}`);
}
const terUnits=read('src/plugins/ter-analysis/unit-presentation.js');
assert(terUnits.includes('ctx.ui.unitTemplates')&&terUnits.includes('units.workspace.create'),'ter-analysis formal production presentation must consume the public Unit workspace facade.');
const pulseViews=read('src/plugins/pulse-analysis/unit-presentation.js');
assert(pulseViews.includes('ctx.ui.unitTemplates')&&pulseViews.includes('units.workspace.create'),'pulse-analysis production presentation must consume the Unit workspace facade backed by the single workspace runtime.');
const dataCenterUnits=read('src/plugins/data-center/unit-presentation.js');
assert(dataCenterUnits.includes('ctx.ui.unitTemplates')&&dataCenterUnits.includes('units.workspace.create')&&dataCenterUnits.includes('workbench.compose'),
  'Data Center production cutover must consume the same public Unit workspace composition on Desktop and Mobile.');


// v3.36 canvas-local docking / performance invariants.
for(const token of ['installCanvasDocking(spec)', 'dkds-plugin-canvas-frame', "['left','right','bottom','overlay','main'].includes(key)", 'stateVersion']){
  assert(ui.includes(token),`PluginWorkspace canvas docking missing ${token}`);
}
for(const token of ['.dkds-plugin-canvas-frame{','.dkds-plugin-canvas-left{','.dkds-plugin-canvas-right{','.dkds-plugin-canvas-bottom{','.dkds-plugin-canvas-overlay{']){
  assert(cssCompact.includes(token),`PluginWorkspace canvas docking style missing ${token}`);
}
assert(css.includes('.dkds-plugin-canvas-center>.dkds-analysis-primary-host>*{flex:1 1 auto'),'PluginWorkspace primary main node must fill the scientific canvas instead of collapsing to content height.');

assert(ui.includes('avoidFloatOverlap()')&&ui.includes('collisionGap'),'PortableView must keep manually floated scientific panels inside the canvas and avoid accidental overlap.');
assert(ui.includes('state.zoneWidth-state.width')&&ui.includes('state.zoneHeight-state.height'),'Floating drag must keep the full panel inside the scientific canvas using pointerdown-captured geometry instead of allowing most of it to leave the workspace.');
assert(ui.includes("emitManipulation('preview',payload)")&&ui.includes('this.updateMarkerVisual(marker,{x:nx,y:ny})')&&ui.includes("emitManipulation('commit'")&&!ui.includes("this.render('marker-drag')"),'Point manipulation must stay Core-owned: preview geometry in place, then commit once at gesture end.');
assert(ui.includes("kind==='range'")&&ui.includes('dkds-direct-range-band')&&!ui.includes("this.requestRender('width-drag');"),'Range manipulation must update handle/band geometry in-place and defer full SVG rebuilding until drag end.');
assert(resonanceMainPlot.includes('getManipulators:()=>manipulators()')&&resonanceMainPlot.includes("action:'peak-position'")&&resonanceMainPlot.includes('onManipulationCommit:')&&resonanceMainPlot.includes("reason:'peak-position-edit'")&&resonanceFeature.includes("reactiveRuntime.effect('resonance.view.inspector'"),'Peak movement must be a plugin-domain mapping of the generic Core manipulation commit; dependent inspector refresh is owned by the dependency runtime.');
assert(resonanceFeature.includes('scientificReact')&&resonanceFeature.includes('uiRuntime?.scientificPlot'),'Derived/group plots must reuse graph objects through the Core ScientificPlot runtime rather than recreate them privately.');

console.log('GRS-derived PluginWorkspace + ScientificCurveSurface foundation checks passed.');
