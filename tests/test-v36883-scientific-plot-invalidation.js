'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const renderer=read('src/core/scientific/d3-chart-renderer.js');
const charts=read('src/core/scientific/chart-runtime.js');
const plot=read('src/core/scientific/plot-runtime.js');

function sliceBetween(source,startToken,endToken){
  const start=source.indexOf(startToken),end=source.indexOf(endToken,start+startToken.length);
  assert(start>=0&&end>start,`Unable to isolate ${startToken}`);
  return source.slice(start,end);
}

const selectionPath=sliceBetween(renderer,'function selectionOverlay','function paintTheme');
assert(selectionPath.includes("emitInvalidation(state,'selectionOverlay')"),'D3 selection path must publish an explicit selection-overlay invalidation.');
assert(!selectionPath.includes('render(state'),'Selection-only invalidation must not enter the structural D3 render path.');
assert(!selectionPath.includes("selectAll('*').remove()"),'Selection-only invalidation must not replace SVG structure.');
assert(selectionPath.includes('state.selectionOverlays.set')&&selectionPath.includes('applyTraceOverlay'),'Selection focus must be retained as an overlay independent from source trace data.');

const themePath=sliceBetween(renderer,'function paintTheme','function render(state');
assert(themePath.includes("emitInvalidation(state,'themePaint')"),'Theme changes must publish a theme-paint invalidation.');
assert(!themePath.includes('render(state'),'Theme paint must not rebuild scientific geometry/data.');
assert(themePath.includes("selectAll('.dkds-d3-plot-bg')")&&themePath.includes("selectAll('.dkds-d3-axis')"),'Theme paint must update existing plot and axis nodes in place.');

const renderPath=sliceBetween(renderer,'function render(state','function react(target');
assert(renderPath.includes("invalidation==='data'")&&renderPath.includes("emitInvalidation(state,invalidation==='data'?'data':'geometry')"),'Structural renderer must distinguish data and geometry invalidations.');
assert(renderer.includes("return Promise.resolve(render(state,'data'))")&&renderer.includes("const result=render(state,'geometry')")&&renderer.includes("render(state,'geometry');return true"),'React, relayout and resize must route through explicit data/geometry paths.');
assert(renderer.includes("state.selectionOverlays.clear();return Promise.resolve(render(state,'data'))"),'A new data payload must clear stale selection overlays before remapping them.');

const themeRefresh=sliceBetween(charts,'function refreshRenderedTheme','const ThemeRuntime=globalThis.DKDSTheme');
assert(themeRefresh.includes('themePaint(el)')&&!themeRefresh.includes('resize?.(el)')&&!themeRefresh.includes('renderDisplay('),'Theme revision must repaint existing charts without geometry/data reconstruction.');
assert(charts.includes("ThemeRuntime.subscribeRevision('core.scientific-chart',refreshRenderedTheme,{consumer:'computed-style'})"),'Scientific charts must use selective Theme revision instead of the broad Theme event.');
assert(charts.includes('function selectionOverlay(target,update,traces)')&&charts.includes('function themePaint(target)'),'Chart facade must expose separate internal invalidation routes to ScientificPlot.');
assert(plot.includes('this.chart.selectionOverlay(this.target,update,[ti])')&&!sliceBetween(plot,'applySelection(snapshot)','pin(id,meta').includes('this.chart.restyle(this.target,update'),'Linked Selection must use the overlay route rather than renderer restyle.');

function classList(){const values=new Set();return {add:(...rows)=>rows.forEach(row=>values.add(row)),remove:(...rows)=>rows.forEach(row=>values.delete(row)),toggle(row,on){if(on===undefined)on=!values.has(row);on?values.add(row):values.delete(row);return on;},contains:row=>values.has(row)};}
const target={nodeType:1,id:'phase-d-plot',dataset:{},classList:classList(),data:[],layout:{},_context:{},handlers:new Map(),domHandlers:new Map(),on(name,fn){this.handlers.set(name,fn);},removeListener(name,fn){if(this.handlers.get(name)===fn)this.handlers.delete(name);},addEventListener(name,fn){this.domHandlers.set(name,fn);},removeEventListener(name,fn){if(this.domHandlers.get(name)===fn)this.domHandlers.delete(name);}};
const calls={react:0,selection:0,theme:0,restyle:0,resize:0};
const chartScope={
  tooltipTheme:{bgcolor:'#fff',bordercolor:'#ddd',align:'left',font:{color:'#111',size:12}},
  async react(t,data,layout,config){calls.react+=1;t.data=structuredClone(data);t.layout=structuredClone(layout);t._context={...(config||{})};},
  selectionOverlay(){calls.selection+=1;return true;},
  themePaint(){calls.theme+=1;return true;},
  restyle(){calls.restyle+=1;return true;},
  relayout(){return true;},resize(){calls.resize+=1;return true;},purge(){target.data=[];return true;},
  bind(t,name,handler){t.handlers.set(name,handler);return()=>t.handlers.delete(name);},
  selectLegendForTrace(){return true;},clearLegendSelection(){return true;},adoptDisplayScale(){return true;}
};
const entities=new Map();
const entityScope={upsert(row){const value={...row};entities.set(value.id,value);return value;},get:id=>entities.get(id)||null,related:(a,b)=>a===b};
const context={console,structuredClone,document:{getElementById:id=>id===target.id?target:null,querySelector:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},DKDSCharts:{createScope:()=>chartScope,resize:()=>true,purge:()=>true,tooltipTheme:chartScope.tooltipTheme},DKDSEntities:{createScope:()=>entityScope}};
context.window=context;context.globalThis=context;vm.createContext(context);vm.runInContext(plot,context,{filename:'plot-runtime.js'});
let selectionListener=null;
const interaction={subscribe(fn,{immediate=false}={}){selectionListener=fn;if(immediate)fn({items:[],focus:null},{reason:'subscribe'});return()=>{selectionListener=null;};},select(){},clear(){}};

(async()=>{
  const scope=context.DKDSScientificPlot.createScope('phase-d');
  await scope.react(target,[
    {x:[0,1],y:[1,2],mode:'lines+markers',line:{width:2},marker:{size:6},entityId:'trace:A'},
    {x:[0,1],y:[2,3],mode:'lines+markers',line:{width:2},marker:{size:6},entityId:'trace:B'}
  ],{}, {},{interaction,traceEntity:trace=>({id:trace.entityId,type:'data.series'})});
  assert.strictEqual(calls.react,1);
  const dataIdentity=target.data;
  const dataSnapshot=JSON.stringify(target.data);
  const selectionBefore=calls.selection;
  selectionListener({items:[{id:'trace:A'}],focus:{id:'trace:A'}},{reason:'phase-d-selection'});
  assert(calls.selection>selectionBefore,'Selection update must reach the dedicated overlay route.');
  assert.strictEqual(calls.react,1,'Selection update must not schedule another scientific data render.');
  assert.strictEqual(calls.restyle,0,'Selection update must not use the data restyle path.');
  assert.strictEqual(target.data,dataIdentity,'Selection overlay must preserve the renderer data-array identity.');
  assert.strictEqual(JSON.stringify(target.data),dataSnapshot,'Selection overlay must not mutate source trace data.');

  const themeBefore=calls.theme;
  target.dataset.dkdsTooltipTheme='';
  chartScope.tooltipTheme={bgcolor:'#111',bordercolor:'#333',align:'left',font:{color:'#eee',size:12}};
  const view=scope.get(target);
  view.applyTooltipTheme();
  assert(calls.theme>themeBefore,'Tooltip/Theme refresh must reach themePaint.');
  assert.strictEqual(calls.react,1,'Theme paint must not rerun scientific data rendering.');
  assert.strictEqual(target.data,dataIdentity,'Theme paint must preserve renderer data identity.');
  scope.dispose();
  console.log('v3.68.83 ScientificPlot data/geometry/theme/selection invalidation split PASS');
})().catch(err=>{console.error(err);process.exit(1);});
