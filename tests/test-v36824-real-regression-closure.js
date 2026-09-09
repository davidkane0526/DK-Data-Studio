'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const feature=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(feature.includes('setSelectedSweepId:value=>selectionRuntime?.setSelectedSweepId(value)'),
  'Resonance FeatureContext must expose SelectionRuntime.setSelectedSweepId to controls; otherwise hide-all aborts before UI/chart sync.');

const views=read('src/plugins/resonance-workbench/view-components.js');
for(const id of ['reswinShowAll','reswinShowForward','reswinShowReverse','reswinHideAll']){
  const start=views.indexOf(`id="${id}"`);assert(start>=0,`missing ${id}`);
  const end=views.indexOf('>',start);const tag=views.slice(start,end);
  assert(tag.includes('data-dkds-component-identity="toolbarAction"'),`${id} must use canonical toolbarAction`);
  assert(!tag.includes('data-dkds-component-variant="quiet"'),`${id} must not use quiet variant because quiet selected surface is transparent`);
}

const controlsSource=read('src/plugins/resonance-workbench/feature-controls-runtime.js');
let moduleFactory=null;
const sandbox={window:{DKDSPluginModules:{define(pluginId,moduleId,value){if(pluginId==='builtin.resonance-workbench'&&moduleId==='feature-controls-runtime')moduleFactory=value;}}},console};
vm.runInNewContext(controlsSource,sandbox,{filename:'feature-controls-runtime.js'});
assert(moduleFactory?.create,'failed to load Resonance controls module');

function fakeButton(){
  const classes=new Set(),attrs=new Map();
  return {classList:{add(...xs){xs.forEach(x=>classes.add(x));},remove(...xs){xs.forEach(x=>classes.delete(x));},toggle(x,force){if(force===undefined){if(classes.has(x)){classes.delete(x);return false;}classes.add(x);return true;}force?classes.add(x):classes.delete(x);return !!force;},contains:x=>classes.has(x)},setAttribute:(k,v)=>attrs.set(k,String(v)),removeAttribute:k=>attrs.delete(k),getAttribute:k=>attrs.get(k)||null};
}
const buttons={
  '#reswinShowAll':fakeButton(),'#reswinShowForward':fakeButton(),'#reswinShowReverse':fakeButton(),'#reswinHideAll':fakeButton()
};
const live={
  datasets:[{path:'a'},{path:'b'}],
  sweeps:[{id:'a:f',datasetPath:'a',direction:1},{id:'a:r',datasetPath:'a',direction:-1},{id:'b:f',datasetPath:'b',direction:1},{id:'b:r',datasetPath:'b',direction:-1}],
  workspace:{scanVisibility:[],mainView:{},algorithms:{},peakDisplay:{},peaks:[],peakCategories:[]}
};
let selectedSweepId='a:f',visibilityPaints=0,fitCalls=0;
const visibilityMap=()=>new Map(live.workspace.scanVisibility||[]);
const actions={
  visibilityMap,
  isVisible(sw){if(!sw)return false;const row=visibilityMap().get(String(sw.datasetPath))||{forward:true,reverse:true};return Number(sw.direction)>0?row.forward!==false:row.reverse!==false;},
  selectedSweep(){return live.sweeps.find(sw=>sw.id===selectedSweepId)||null;},
  setSelectedSweepId(value){selectedSweepId=String(value||'');return selectedSweepId;},
  visibleSweeps(){return live.sweeps.filter(sw=>actions.isVisible(sw));},
  ensureMainSurface(){return {fitToData(){fitCalls++;}};},
  visibilityChanged(){visibilityPaints++;},scheduleSnapshot(){},datasetEntityId:path=>path,colorForPeakOrder(){return '#000';},renderLinkedSelection(){},rebuild(){},refreshData(){}
};
const runtime=moduleFactory.create({
  live,
  services:{$:selector=>buttons[selector]||null,dom:{},dialogs:{},transforms:null,S:{preset:()=>({})},setStatus(){}},
  actions,
  utils:{esc:v=>String(v??''),finite:v=>Number.isFinite(Number(v)),directionName:v=>String(v)}
});

assert.doesNotThrow(()=>runtime.setAllVisibility('none'),'hide-all must execute through the real controls runtime without missing action errors');
assert.strictEqual(selectedSweepId,'','hide-all must clear a selected sweep that is no longer visible');
for(const row of visibilityMap().values()){assert.strictEqual(row.forward,false);assert.strictEqual(row.reverse,false);}
assert(buttons['#reswinHideAll'].classList.contains('selected'),'hide-all button must immediately paint selected');
assert(!buttons['#reswinShowAll'].classList.contains('selected'),'show-all button must immediately clear selected');
assert.strictEqual(buttons['#reswinHideAll'].getAttribute('aria-pressed'),'true');
assert(visibilityPaints>0,'hide-all must request immediate visibility paint');
assert(fitCalls>0,'hide-all must update main-surface visibility/fit immediately');

const plotView=read('src/core/ui/modules/plot-view/chart.js');
assert(plotView.includes("explicit=!key.startsWith('auto:')")&&plotView.includes("String(view.id||'').startsWith('auto:')")&&plotView.includes('this.byCard.delete(node);view.dispose?.();view=null;'),
  'Explicit PlotView binding must replace an earlier auto-hydrated view on the same card, preventing TER placement-state aliasing.');

const portable=read('src/core/ui/modules/layout/portable-view.js');
assert(portable.includes("const platform=document.documentElement?.dataset?.dkdsHost==='mobile'?'mobile.m3':'desktop'")&&portable.includes('`${hostState.storagePrefix}.${platform}.${this.owner}.${this.id}'), 'PortableView persistence must keep Desktop state isolated while Mobile advances its namespace to flush stale geometry.');
assert(portable.includes('const activeScrollport=bindScrollport()')&&portable.includes('bindScrollport();update();settle();'),
  'Sticky plots must re-resolve their scrollport after final layout instead of freezing the pre-layout scroll container.');

const nativeCss=read('src/styles/platform/native-workspace-presentation.css');
assert(/dkds-plot-view:is\(\.is-floating,\.is-global-floating\)[^{]*\{[^}]*resize:none/.test(nativeCss),
  'Mobile floating PlotViews must disable the browser/native resize corner so only the integrated DKDS handle is visible.');

console.log('v3.68.25 real regression closure PASS: hide-all executes and clears selection/paint immediately; mode fill is canonical; TER PlotView IDs cannot alias auto hydration; sticky rebind and native resize-corner suppression are present.');
