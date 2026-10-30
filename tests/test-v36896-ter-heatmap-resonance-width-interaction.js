'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

function testHeatmapInteractionMount(){
  const previous={window:global.window,gate:global.DKDSStyleGate};
  const presentation=[],paint=[];
  const node={};
  const selection={
    attr(){return this;},
    call(fn,...args){fn(this,...args);return this;},
    each(fn){fn.call(node,null,0,[node]);return this;}
  };
  const svg={append(tag){assert.strictEqual(tag,'g');return selection;}};
  global.window=global;
  global.DKDSStyleGate={
    setPaint(_el,attribute,value){paint.push({attribute,value});if(attribute==='pointer-events')throw new Error('pointer-events is presentation, not paint');return value;},
    removePaint(){return true;},
    setPresentation(_el,attribute,value){presentation.push({attribute,value});return value;},
    removePresentation(){return true;}
  };
  try{
    const file=path.join(root,'src/core/scientific/heatmap-selection-overlay-runtime.js');
    delete global.DKDSScientificHeatmapSelection;delete require.cache[require.resolve(file)];require(file);
    assert.strictEqual(global.DKDSScientificHeatmapSelection.mount({svg}),true,'heatmap overlay mount must complete after Canvas paint');
    assert(presentation.some(row=>row.attribute==='pointer-events'&&row.value==='none'),'heatmap overlay must route pointer-events through the presentation StyleGate owner');
    assert(!paint.some(row=>row.attribute==='pointer-events'),'heatmap overlay must never send pointer-events through paint ownership');
  } finally {
    delete global.DKDSScientificHeatmapSelection;
    if(previous.window===undefined)delete global.window;else global.window=previous.window;
    if(previous.gate===undefined)delete global.DKDSStyleGate;else global.DKDSStyleGate=previous.gate;
  }
}

function loadResonanceMainRuntime(){
  const previousWindow=global.window;
  const modules=new Map();
  global.window={DKDSPluginModules:{define:(pid,id,value)=>modules.set(`${pid}/${id}`,value),get:(pid,id)=>modules.get(`${pid}/${id}`),require:(pid,id)=>modules.get(`${pid}/${id}`)}};
  try{
    const projection=path.join(root,'src/plugins/resonance-workbench/main-marker-projection.js');delete require.cache[require.resolve(projection)];require(projection);
    const file=path.join(root,'src/plugins/resonance-workbench/feature-main-plot-runtime.js');delete require.cache[require.resolve(file)];require(file);
    return modules.get('builtin.resonance-workbench/feature-main-plot-runtime');
  } finally {global.window=previousWindow;}
}

function testResonanceWidthProjection(){
  const runtime=loadResonanceMainRuntime();assert(runtime?.create,'Resonance main plot runtime must load');
  const peak={id:'p1',sweepId:'s1',v:1,i:2,widthLeft:.88,widthRight:1.12,accepted:true};
  const sweep={id:'s1',step:.01,points:[{v:.8,i:1},{v:1,i:2},{v:1.2,i:1}]};
  const plot={id:'reswinMainPlot',offsetParent:{},hasAttribute:()=>true,focus(){}};
  let captured=null,metric=null;
  const live={workspace:{peakDisplay:{showPoints:true,showWidth:true},peaks:[peak],mainView:{}},datasets:[],sweeps:[sweep],selectedPeakId:'p1',selectedSweepId:'s1',selectedRange:null,interactionSelection:{get:()=>({focus:null})},isNativeClient:()=>false,
    uiRuntime:{scientificPlot:{create(target,spec){captured=spec;return {target,render(){},dispose(){},colorScaleState:null};}}}};
  const actions={
    colorForPeakOrder:()=> '#2563eb',colorForSeries:()=> '#2563eb',sweepById:id=>String(id)==='s1'?sweep:null,peakMetrics:()=>metric,selectedPeak:()=>peak,selectedSweep:()=>sweep,
    visibleSweepIds:()=>['s1'],visibleSweeps:()=>[sweep],visibilityMap:()=>new Map(),isVisible:()=>true,physicalAnalysis:()=>({peakMap:new Map()}),peakLabel:()=> 'P1',
    datasetEntityId:x=>String(x),normalizeCategories(){},clearRangeState(){},setRangeState:x=>x,publishRangeSelection(){},peaksInRange:()=>[],clearSelectionIds(){},scheduleSnapshot(){},publishSweepSelection(){},publishPeakSelection(){},commitPeakMetricEdit(){},
  };
  const dom={on:()=>()=>{},attr(){},html(){},query(){return null;},create(){return {dataset:{},classList:{add(){},remove(){}}};},append(){},token(){},frame(fn){fn();},style(){},replace(){}};
  const context={live,services:{$:sel=>sel==='#reswinMainPlot'?plot:null,dom,setStatus(){}},actions,utils:{esc:x=>String(x),fmt:x=>String(x),finite:Number.isFinite,directionName:()=>''}};
  const feature=runtime.create(context);assert(feature.ensure(),'Resonance main ScientificCurveSurface must mount');
  const marker=captured.getMarkers()[0];assert(marker,'selected peak marker must be projected');
  const provisional=captured.getMarkerWidth(marker);
  assert(provisional,'selected peak must expose a width mask before asynchronous exact FWHM resolves when saved width exists');
  assert.strictEqual(provisional.left,.88);assert.strictEqual(provisional.right,1.12);
  assert.strictEqual(provisional.provisional,true);assert.strictEqual(provisional.measureLine,false,'provisional mask must not masquerade as an exact half-height FWHM line');

  metric={fwhmLeft:.93,fwhmRight:1.07,halfResidual:.6,baselineSlope:0,baselineIntercept:.4,analysisLeft:.82,analysisRight:1.18};
  const exact=captured.getMarkerWidth(marker);
  assert.strictEqual(exact.left,.93);assert.strictEqual(exact.right,1.07);assert.strictEqual(exact.provisional,false);assert.strictEqual(exact.measureLine,true,'valid FWHM metrics must upgrade the selected mask to an exact half-height measurement');
  assert(Number.isFinite(exact.yLeft)&&Number.isFinite(exact.yRight),'exact FWHM crossings must have finite plotted y coordinates');
  feature.dispose();
}

function testRendererContract(){
  const source=fs.readFileSync(path.join(root,'src/core/ui/modules/scientific-curve/render.js'),'utf8');
  assert(source.includes("widthSpec.provisional?' is-provisional':''"),'ScientificCurve must distinguish provisional width bands');
  assert(source.includes('if(widthSpec.measureLine!==false)'),'ScientificCurve must draw exact half-height line/crossings only for validated FWHM');
}

testHeatmapInteractionMount();
testResonanceWidthProjection();
testRendererContract();
console.log('v3.68.96 TER heatmap interaction + Resonance peak-width projection PASS');
