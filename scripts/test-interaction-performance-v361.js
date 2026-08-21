const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const ui=read('src/core/ui-infrastructure.js');
const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const ter=read('src/plugins/ter-analysis/feature-runtime.js');
const terService=read('src/plugins/ter-analysis/analysis-service.js');
const scientificPlot=read('src/core/scientific-plot-runtime.js');
const topRuntime=read('src/plugin-window/runtime.js');
const mainProcess=read('main.js');
const resonanceView=read('src/plugins/resonance-workbench/view-components.js');
const terManifest=JSON.parse(read('src/plugins/ter-analysis/plugin.json'));
const pkg=JSON.parse(read('package.json'));

const rangeStart=ui.indexOf("if(kind==='range')");
const rangeEnd=ui.indexOf("}else if(kind==='axis')",rangeStart);
assert(rangeStart>0&&rangeEnd>rangeStart,'ScientificCurveSurface generic range manipulation implementation missing.');
const rangeLoop=ui.slice(rangeStart,rangeEnd);
assert(!rangeLoop.includes('getMarkerWidth?.('),'Generic range drag must not re-enter expensive feature presentation/metric getters on every pointer move.');
assert(rangeLoop.includes('redraw()')&&rangeLoop.includes("emitManipulation('preview'")&&rangeLoop.includes("emitManipulation('commit'"),'Range manipulation must use Core-owned lightweight geometry preview and one semantic commit.');
assert(ui.includes("emitManipulation('commit'")&&ui.includes("kind==='point'"),'ScientificCurveSurface must expose one generic semantic commit for point/range/axis editing.');
assert(ui.includes('this.markerClickSuppressUntil.set(String(marker.id)')&&ui.includes('this.markerClickSuppressUntil.get(id)'),'Core point manipulation attached to a marker must suppress the synthetic post-drag click so dragging cannot accidentally change selection/legend focus.');
assert(ui.includes('this.colorScaleState={key:')&&ui.includes('this.colorScaleState?.key===colorScaleKey'),'ScientificCurveSurface must cache color scale/legend semantics across unrelated renders.');
assert(resonance.includes('const sweepVoltageBoundsCache=new WeakMap()')&&resonance.includes('bounds=sweepVoltageBounds(sw)'),'Resonance analysis-window commit must cache sweep voltage bounds.');
assert(ui.includes('this.pointOrderCache=new WeakMap()')&&ui.includes('let order=this.pointOrderCache.get(points)'),'ScientificCurveSurface must cache curve-order metadata so snapped manipulation does not rescan every sample on pointermove.');
assert(ui.includes('markerNodes=new Map()')&&ui.includes('last.markerNodes?.get?.(id)'),'ScientificCurveSurface point manipulation must update cached marker nodes directly instead of selecting/filtering all markers on every pointermove.');
assert(resonance.includes('function commitPeakMetricEdit')&&resonance.includes('invalidatePeakMetric(p,{geometry,reason,refresh:false})'),'Interactive scientific commits must avoid creating an async metric placeholder before authoritative redraw.');
assert(resonance.includes('getManipulators:()=>mainSurfaceManipulators()')&&resonance.includes("action:'peak-position'")&&resonance.includes('onManipulationCommit')&&!resonance.includes('onMarkerDragCommit:'),'Resonance must consume the generic Core manipulation API instead of a peak/marker-named drag contract.');
assert(!resonance.includes("publishPeakSelection(p,'resonance-peak-drag")&&!resonance.includes("publishPeakSelection(p,'resonance-main-drag"),'Dragging a point manipulator must not mutate Selection/focus or dim unrelated curves.');
assert(resonance.includes("action:'analysis-window'")&&resonance.includes('p.analysisLeft=left;p.analysisRight=right;p.analysisManual=true')&&!resonance.includes('onWidthWindowCommit:'),'FWHM analysis-window editing must be a domain mapping of a generic atomic range commit.');
assert(resonance.includes("commitPeakMetricEdit(p,{reason:'analysis-window-edit'})"),'Analysis-window manipulation end must synchronously commit the current window when the provider supports sync metrics.');
assert(resonance.includes('rawWindowLeft=Number(p.analysisLeft)')&&resonance.includes('rawWindowRight=Number(p.analysisRight)'),'Manual FWHM handles must remain authoritative while an asynchronous metric provider is pending.');
assert(resonanceView.includes("['resonance-undo','Ctrl+Z'")&&resonanceView.includes('R.undoLastAction?.();return true;'),'Resonance Ctrl+Z must use the same plugin-owned undo operation as the UI undo button.');
assert(terManifest.window?.prewarm===true,'TER must opt into the generic dedicated-window runtime prewarm contract.');
assert((ter.match(/T\.calculate\(\)/g)||[]).length===1&&ter.includes("label:'计算 TER'")&&ter.includes('onInvoke:()=>T.calculate()'),'TER calculation must have exactly one feature-runtime trigger: the explicit Calculate TER action/shortcut.');
assert(!/calculate\s*\(\s*\)\s*;/.test(terService.replace(/function calculate\(\)[\s\S]*?\n      }/,'CULLED')),'TER analysis service must not invoke calculate() as a restore/render side effect.');
const prewarmStart=topRuntime.indexOf('if(bootstrap.prewarm===true)');
const prewarmEnd=topRuntime.indexOf('}else{',prewarmStart);
const prewarmBranch=topRuntime.slice(prewarmStart,prewarmEnd);
assert(prewarmStart>0&&prewarmBranch.includes("await measure('declared-chart-prewarm',()=>ensureDeclaredChartWarm())")&&prewarmBranch.includes("startupProfile.prewarmMode='runtime-only'")&&!prewarmBranch.includes('hydrateProjectAndOpenActivity'),'Dedicated TOP prewarm must warm Core/plugin/chart runtimes without restoring project state, opening the analysis activity, calculating or drawing domain results.');
assert(mainProcess.includes('const promoteFromPrewarm = cachedBootstrap?.prewarm === true')&&mainProcess.includes('auxiliaryReady.delete(previous.webContents.id)')&&mainProcess.includes('auxiliaryPendingShow.add(previous.webContents.id)'),'First open after runtime-only prewarm must wait for project hydration/activity mount before showing the window.');

assert(scientificPlot.includes("const VERSION='2.3.0'")&&scientificPlot.includes('const renderQueue=new Map()'),'ScientificPlot v2.3 must own the multi-view render scheduler.');
assert(scientificPlot.includes('renderPriority')&&scientificPlot.includes('scheduleRender(this.renderScheduleKey'),'ScientificPlot render priority must be enforced by Core.');
assert(ter.includes("renderPriority:'frame'")&&ter.includes("renderPriority:'idle'"),'TER must declare view render priorities instead of manually timing Plotly calls.');
assert(pkg.dependencies['plotly.js-cartesian-dist-min']&&!pkg.dependencies['plotly.js-dist-min'],'Desktop runtime must use the Cartesian Plotly bundle.');

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
  console.log('v3.61.4 Core interaction/render performance and runtime-only prewarm checks passed.');
})().catch(err=>{console.error(err);process.exit(1);});
