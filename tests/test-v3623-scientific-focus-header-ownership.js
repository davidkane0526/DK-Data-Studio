'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

// The selected/unselected scientific presentation has one owner: the renderer.
// CSS must not overwrite SVG opacity/width after Core has resolved selection.
const model=read('src/core/ui/modules/scientific-curve/model.js');
const render=read('src/core/ui/modules/scientific-curve/render.js');
const scientificCss=read('src/styles/presentation/scientific.css');
assert(model.includes('curveInactiveOpacity:dark?.055:.10')&&model.includes('markerOtherCurveOpacity:dark?.045:.08'),'ScientificCurveSurface must provide a stronger dark-mode selection contrast without plugin-specific styling.');
assert(render.includes('selectionVisuals=this.selectionVisuals()')&&render.includes('selectionVisuals.curveInactiveOpacity')&&render.includes('selectionVisuals.markerOtherCurveOpacity'),'ScientificCurve renderer must consume the Core selection visual contract.');
assert(!/\.dkds-scientific-curve\.is-dimmed\s*\{[^}]*opacity:/s.test(scientificCss),'CSS must not override renderer-owned dimmed curve opacity.');
assert(!/\.dkds-scientific-curve\.is-focused\s*\{[^}]*?(?:opacity|stroke-width):/s.test(scientificCss),'CSS must not override renderer-owned focused curve geometry.');
assert(!/\.dkds-scientific-marker\.is-dimmed\s*\{[^}]*opacity:/s.test(scientificCss),'CSS must not override renderer-owned marker dimming.');

// Resonance owns domain identity only; it maps that identity into the generic
// Core selection hooks instead of implementing visual focus itself.
const resonanceMain=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
assert(resonanceMain.includes("getSelectedCurveId:()=>String(live.selectedSweepId||'')")&&resonanceMain.includes("getSelectedMarkerIds:()=>live.selectedPeakId?[String(live.selectedPeakId)]:[]"),'Resonance must map its domain selection into Core ScientificCurveSurface explicitly.');

// Plot title/actions have exactly one geometry owner. Plugin aliases are allowed
// for lookup only; their CSS must not re-declare the header geometry.
const corePlotCss=read('src/styles/structure/plugin-workspace.css');
const coreGroupCss=read('src/styles/structure/sdk-semantic-surfaces.css');
const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const resonanceGroup=read('src/plugins/resonance-workbench/feature-group-runtime.js');
assert(corePlotCss.includes('.dkds-plot-view-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch')&&corePlotCss.includes('.dkds-plot-view-title{min-width:0;height:100%')&&corePlotCss.includes('.dkds-plot-view-actions{height:100%;display:flex;align-items:center;align-self:stretch'),'Core PlotView must vertically center title and actions from the same header box.');
assert(coreGroupCss.includes('.dkds-group-plot-head{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch')&&coreGroupCss.includes('.dkds-group-plot-title{min-width:0;height:100%;display:flex;align-items:center'),'Native GroupPlot must use the same centered header geometry.');
assert(resonanceGroup.includes('reswin-group-head dkds-surface-header dkds-plot-view-head')&&resonanceGroup.includes('reswin-group-title dkds-plot-view-title'),'Resonance group cards must use the canonical Core PlotView classes directly.');
for(const selector of ['.reswin-group-head{','.reswin-group-card-actions{','.reswin-group-title{','.analysis-chart-title.dkds-plot-view-head{'])assert(!resonanceCss.includes(selector),`Plugin CSS must not override Core plot-header geometry: ${selector}`);

console.log('v3.62.3 scientific focus/header ownership PASS');
