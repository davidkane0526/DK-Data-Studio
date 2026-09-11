'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..'),read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const plotSource=read('src/core/scientific/plot-runtime.js');
const rendererSource=read('src/core/scientific/d3-chart-renderer.js');
const overlaySource=read('src/core/scientific/heatmap-selection-overlay-runtime.js');
const indexSource=read('src/index.html');
const dedicatedSource=read('src/plugin-window/runtime.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const terFeature=read('src/plugins/ter-analysis/feature-runtime.js');
const interactionSource=read('src/core/ui/modules/selection/data-interaction.js');
const sdk=read('sdk/plugin-api.d.ts');
const refs=require('../src/core/ui/modules/selection/data-interaction').selectionReferences;

for(const token of ['sourceScans','heatmapSourceDescriptor(point)','heatmapSelectedRows(trace,snapshot)','const n=(isHeatmap||seriesTarget)?0','heatmap.rows'])assert(plotSource.includes(token),`ScientificPlot heatmap→source-scan mapping missing: ${token}`);
assert(!plotSource.includes('trace?.z?.flat'),'ScientificPlot must not enumerate every heatmap cell to construct Selection entities.');
for(const token of ['heatmapSvgCells:0',"'heatmap.rows'",'HeatmapSelection.apply','HeatmapSelection.eventPoint'])assert(rendererSource.includes(token),`D3 heatmap bounded source-row projection missing: ${token}`);
for(const token of ['xIndex:xi,yIndex:yi','dkds-d3-heatmap-selection-layer','rect.dkds-d3-heatmap-selection',"patch?.['heatmap.rows']",'StyleGate.setPaint','StyleGate.setPresentation',"selectionPresentation,'pointer-events','none'"])assert(overlaySource.includes(token),`Heatmap selection overlay owner missing: ${token}`);
assert(indexSource.indexOf('heatmap-canvas-runtime.js')<indexSource.indexOf('heatmap-selection-overlay-runtime.js')&&indexSource.indexOf('heatmap-selection-overlay-runtime.js')<indexSource.indexOf('d3-chart-renderer.js'),'Main host must load Canvas → bounded heatmap selection overlay → D3 renderer.');
assert(dedicatedSource.includes("'heatmap-selection-overlay-runtime':'../core/scientific/heatmap-selection-overlay-runtime.js'")&&dedicatedSource.indexOf("'heatmap-canvas-runtime','heatmap-selection-overlay-runtime','d3-chart-renderer'")>=0,'Dedicated TOP must load the same heatmap selection overlay owner before D3.');
assert(!rendererSource.includes('dkds-d3-heatmap-cell'),'heatmap source selection must not create one SVG node per heatmap cell.');
for(const token of ['function sourceScanReference(','sourceScanReference,transformCsv','sourceScans=(matrix.vgs||[]).map','sourceScanType:\'data.sweep\'','publish:false','sourceTraceIdentity(group.vg,group.sourceFile,1)','sourceTraceIdentity(group.vg,group.sourceFile,-1)'])assert((terService+terFeature).includes(token),`TER first-party source-scan adoption missing: ${token}`);
assert(!terFeature.includes("window.addEventListener('dkds:selection-changed'")&&!terFeature.includes('new EventTarget('),'TER must reuse the existing InteractionRuntime rather than create a private cross-view bus.');
assert(interactionSource.includes("const INTERACTION_BRIDGE_EVENT='dkds:selection-changed'")&&!/dkds:(?:viewport|axis|interaction)-changed/.test(interactionSource),'the canonical cross-scope Interaction bridge must remain the single existing event name.');
assert(sdk.includes('DKDSScientificScalarFieldSourceScan')&&sdk.includes('sourceScans?:readonly')&&sdk.includes('DKDSScientificScalarFieldSpec')&&sdk.includes("selectionTarget?:'point'|'series'"),'SDK must publish the heatmap source-scan and source-view targeting contract.');

// Execute the real ScientificPlot mapping using a minimal renderer facade.
global.window=global;global.document={getElementById:()=>null,querySelector:()=>null};window.DKDSUI={selectionReferences:refs};
const handlers=new Map(),overlays=[],entities=new Map();
window.DKDSEntities={createScope:()=>({upsert(row){entities.set(row.id,row);return row;},get(id){return entities.get(id)||null;},related(a,b){return a===b;}})};
window.DKDSCharts={createScope(){return this;},react(target,data,layout,config){target.data=data;target.layout=layout;target._context=config;return target;},bind(_target,name,fn){handlers.set(name,fn);return()=>handlers.delete(name);},selectionOverlay(_target,update,traces){overlays.push({update,traces});},adoptDisplayScale(){},tooltipTheme:{},themePaint(){},relayout(){},selectLegendForTrace(){},clearLegendSelection(){},displayScaleState(){return null;}};
require('../src/core/scientific/plot-runtime.js');
const target={nodeType:1,id:'phase-e-heatmap',dataset:{},data:[],layout:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},removeEventListener(){}};
let subscriber=null,selected=null;const interaction={subscribe(fn,{immediate}={}){subscriber=fn;if(immediate)fn(null,{reason:'subscribe'});return()=>{};},select(value,options){selected={value,options};return value;},get(){return null;}};
const sourceA=refs.series('artifact-A','scan:up:1'),sourceB=refs.series('artifact-B','scan:up:1');
(async()=>{
  const scope=window.DKDSScientificPlot.createScope('phase-e-heatmap-test');
  await scope.scalarField(target,{x:[0,.5,1],y:[-1,1],z:[[1,2,3],[4,5,6]],xName:'Vds',yName:'Vg',sourceScans:[{ref:sourceA,type:'data.sweep',role:'source-scan'},{ref:sourceB,type:'data.sweep',role:'source-scan'}],sourceScanType:'data.sweep'},{interaction,source:'phase-e-heatmap-test'});
  assert.strictEqual(entities.size,0,'scalar-field render must not pre-create source entities for every cell or row.');
  handlers.get('dkds_chart_click')({points:[{curveNumber:0,pointNumber:4,xIndex:1,yIndex:1,x:.5,y:1,z:5}],event:{}});
  assert(selected,'heatmap cell click must publish Selection through the existing interaction runtime.');
  assert.strictEqual(selected.value.type,'data.sweep','heatmap cell selection must resolve to the scientific source scan type.');
  assert.deepStrictEqual(selected.value.ref,sourceB,'heatmap cell selection must carry the stable source scan reference, not cell coordinates as identity.');
  assert(!('value' in selected.value),'heatmap Selection must remain reference-only.');
  assert.strictEqual(entities.size,1,'source entity must be created lazily only when a cell needs it.');

  overlays.length=0;const item={type:'data.sweep',id:refs.identity(sourceA),role:'source-scan',ref:sourceA,meta:{}};
  subscriber({schema:2,revision:1,items:[item],focus:item,ranges:[],context:{},source:'source-scan-view'},{});
  assert.strictEqual(overlays.length,1,'source scan selection must update the heatmap through the existing Selection subscription.');
  assert.deepStrictEqual(overlays[0].update['heatmap.rows'],[[0]],'matching source scan must highlight only its heatmap row.');

  overlays.length=0;const itemB={type:'data.sweep',id:refs.identity(sourceB),role:'source-scan',ref:sourceB,meta:{}};
  subscriber({schema:2,revision:2,items:[itemB],focus:itemB,ranges:[],context:{},source:'source-scan-view'},{});
  assert.deepStrictEqual(overlays[0].update['heatmap.rows'],[[1]],'a different source scan must map to its own heatmap row.');

  // A source-scan curve can explicitly target the series so any curve point selects
  // the same scan reference rather than manufacturing a cell/point identity.
  const scanTarget={nodeType:1,id:'phase-e-source-scan',dataset:{},data:[],layout:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},removeEventListener(){}};
  selected=null;await scope.react(scanTarget,[{artifactId:'artifact-A',seriesId:'scan:up:1',entityType:'data.sweep',x:[0,.5,1],y:[3,4,5],mode:'lines'}],{}, {},{interaction,selectionTarget:'series',source:'phase-e-source-scan'});
  handlers.get('dkds_chart_click')({points:[{curveNumber:0,pointNumber:2,x:1,y:5}],event:{}});
  assert.deepStrictEqual(selected.value.ref,sourceA,'source scan view must publish its stable series reference when selectionTarget=series.');
  assert.strictEqual(selected.value.type,'data.sweep','source scan view must preserve the scientific entity type.');
  console.log('Phase E 6.2 heatmap cell↔source-scan reference selection checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
