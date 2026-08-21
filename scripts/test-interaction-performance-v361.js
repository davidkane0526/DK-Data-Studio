const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const ui=read('src/core/ui-infrastructure.js');
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
const scientificPlot=read('src/core/scientific-plot-runtime.js');
const topRuntime=read('src/plugin-window/runtime.js');
const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const terManifest=JSON.parse(read('src/plugins/ter-analysis/plugin.json'));
const pkg=JSON.parse(read('package.json'));

const widthStart=ui.indexOf("this.spec.onWidthDrag?.({marker:selectedMarker");
const widthEnd=ui.indexOf(".on('end',event=>{if(!widthDragMoved)return;this.spec.onWidthDragEnd",widthStart);
assert(widthStart>0&&widthEnd>widthStart,'ScientificCurveSurface width drag implementation missing.');
const widthLoop=ui.slice(widthStart,widthEnd);
assert(!widthLoop.includes('getMarkerWidth?.('),'FWHM/width drag must not re-enter expensive metric getters on every pointer move.');
assert(widthLoop.includes('previewX')&&widthLoop.includes('windowLeft=nl;windowRight=nr'),'Width drag must use Core-owned lightweight geometry preview.');
assert(resonance.includes('const sweepVoltageBoundsCache=new WeakMap()')&&resonance.includes('bounds=sweepVoltageBounds(sw)'),'Resonance width drag must cache sweep voltage bounds instead of rescanning every pointer move.');
assert(ui.includes('this.pointOrderCache=new WeakMap()')&&ui.includes('let order=this.pointOrderCache.get(points)'),'ScientificCurveSurface must cache curve-order metadata so ordered drag snapping does not rescan every sample on pointermove.');
assert(ui.includes('markerNodes=new Map()')&&ui.includes('last.markerNodes?.get?.(id)'),'ScientificCurveSurface marker drag must update cached marker nodes directly instead of selecting/filtering all markers on every pointermove.');
assert(resonance.includes('function commitPeakMetricEdit')&&resonance.includes('invalidatePeakMetric(p,{geometry,reason,refresh:false})'),'Interactive peak/FWHM commits must avoid creating an async metric placeholder before authoritative redraw.');
assert(resonance.includes("commitPeakMetricEdit(p,{reason:'fwhm-window-drag'})"),'FWHM drag end must synchronously commit the current analysis window when the provider supports sync metrics.');
assert(resonance.includes('rawWindowLeft=Number(p.analysisLeft)')&&resonance.includes('rawWindowRight=Number(p.analysisRight)'),'Manual FWHM handles must remain authoritative while an asynchronous metric provider is pending.');
assert(resonanceView.includes("['resonance-undo','Ctrl+Z'")&&resonanceView.includes('R.undoLastAction?.();return true;'),'Resonance Ctrl+Z must use the same plugin-owned undo operation as the UI undo button.');
assert(terManifest.window?.prewarm===true,'TER must opt into the generic dedicated-window prewarm contract so Plotly/renderer cold start does not sit on first-open latency.');

assert(scientificPlot.includes("const VERSION='2.3.0'")&&scientificPlot.includes('const renderQueue=new Map()'),'ScientificPlot v2.3 must own the multi-view render scheduler.');
assert(scientificPlot.includes('renderPriority')&&scientificPlot.includes('scheduleRender(this.renderScheduleKey'),'ScientificPlot render priority must be enforced by Core.');
assert(ter.includes("renderPriority:'frame'")&&ter.includes("renderPriority:'idle'"),'TER must declare view render priorities instead of manually timing Plotly calls.');
assert(pkg.dependencies['plotly.js-cartesian-dist-min']&&!pkg.dependencies['plotly.js-dist-min'],'Desktop runtime must use the Cartesian Plotly bundle.');
assert(topRuntime.includes('beginDeclaredChartPreload')&&topRuntime.includes("startup-parallel-preload")&&topRuntime.indexOf('beginDeclaredChartPreload();')<topRuntime.indexOf("measure('activity-open'"),'Dedicated TOP must begin the non-awaited Plotly preload before activity-open can request the first chart.');

function classList(){return {add(){},remove(){}};}
const targets=new Map();
for(const id of ['a','b'])targets.set(id,{nodeType:1,id,dataset:{},classList:classList(),data:[],handlers:new Map(),on(name,fn){this.handlers.set(name,fn);},removeListener(){}});
const calls=[];
const chartScope={async react(target,data){calls.push(target.id);target.data=data;},resize(){return true;},purge(){},restyle(){},relayout(){}};
const frames=[];
const context={console,structuredClone,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},cancelAnimationFrame(){},document:{getElementById:id=>targets.get(id)||null,querySelector:()=>null},DKDSCharts:{createScope:()=>chartScope,resize(){},purge(){}}};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(read('src/core/entity-runtime.js'),context);vm.runInContext(scientificPlot,context);

(async()=>{
  const scope=context.DKDSScientificPlot.createScope('perf');
  const pa=scope.react(targets.get('a'),[{x:[1],y:[1]}],{}, {},{renderPriority:'frame',renderKey:'a1'});
  const pb=scope.react(targets.get('b'),[{x:[1],y:[2]}],{}, {},{renderPriority:'idle',renderKey:'b1'});
  assert.deepStrictEqual(calls,[],'Deferred scientific views must not block the current browser turn.');
  assert(frames.length>=1,'Render scheduler must request a browser frame.');
  frames.shift()(0);await new Promise(resolve=>setImmediate(resolve));
  assert.deepStrictEqual(calls,['a'],'Frame-priority view must render before idle/background views.');
  assert(frames.length>=1,'Background view must be scheduled in a later frame so the first chart can paint.');
  frames.shift()(16);await Promise.all([pa,pb]);
  assert.deepStrictEqual(calls,['a','b'],'Queued views must complete deterministically one per frame.');
  scope.dispose();
  console.log('v3.61/v3.61.2 interaction/render performance checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
