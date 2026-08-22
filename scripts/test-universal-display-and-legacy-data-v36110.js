'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
function assert(v,m){if(!v)throw new Error(m);}

(async()=>{
assert(json('package.json').version==='3.61.14','Application version must be 3.61.14.');
const chart=read('src/core/chart-runtime.js');
assert(chart.includes('displayScaleStates')&&chart.includes('isYAxisInteraction')&&chart.includes('left+12'),'Core chart runtime must treat the whole left Y-label region as the display-scale interaction target.');
assert(chart.includes('next.y=trace.y.map(absNumber)'),'Core Plotly display projection must use |Y| in log display without rewriting source data.');
assert(chart.includes('Array.isArray(layout.shapes)')&&chart.includes('Array.isArray(layout.annotations)'),'View-only log projection must keep Plotly overlays aligned with |Y| display values.');
let captured=null;const plot={nodeType:1,dataset:{},addEventListener(){},removeEventListener(){},dispatchEvent(){}};
const fakeWindow={Plotly:{react(el,data,layout,config){captured={el,data,layout,config};return Promise.resolve(true);}}};
const fakeDocument={currentScript:{src:'file:///tmp/src/core/chart-runtime.js'},getElementById:id=>id==='plot'?plot:null,querySelector:()=>null};
const context={window:fakeWindow,document:fakeDocument,console,Promise,WeakMap,Map,Set,URL,performance:{now:()=>0},structuredClone:global.structuredClone,CustomEvent:function(){}};context.globalThis=context;fakeWindow.window=fakeWindow;fakeWindow.document=fakeDocument;vm.createContext(context);vm.runInContext(chart,context,{filename:'chart-runtime.js'});
const sourceY=[-10,-1,0,2];await fakeWindow.DKDSCharts.react('plot',[{type:'scatter',y:sourceY}],{yaxis:{type:'linear'}},{});await fakeWindow.DKDSCharts.toggleYAxisDisplay('plot');
assert(JSON.stringify(captured.data[0].y)===JSON.stringify([10,1,0,2]),'Log display must render absolute Y values.');
assert(JSON.stringify(sourceY)===JSON.stringify([-10,-1,0,2]),'Display projection must not mutate source Y data.');
assert(captured.layout.yaxis.type==='log','Toggle must switch only the display axis to log.');
const heatY=[-2,-.5,1],heatZ=[[1],[2],[3]];await fakeWindow.DKDSCharts.react('plot',[{type:'heatmap',y:heatY,z:heatZ}],{yaxis:{type:'linear'}},{});assert(JSON.stringify(captured.data[0].y)===JSON.stringify(heatY),'Heatmap coordinate Y must remain unchanged; heatmap logarithmic display belongs to Z/color scale.');assert(JSON.stringify(heatZ)===JSON.stringify([[1],[2],[3]]),'Heatmap source Z values must remain unchanged in linear mode.');
const surface=read('src/core/ui-infrastructure.js');
assert(surface.includes('yDisplayValue(value)')&&surface.includes("this.displayYAxisType==='log'?Math.abs(n):n"),'ScientificCurveSurface must use an absolute-value display projection in log mode.');
assert(surface.includes('dkds-scientific-y-axis-hit'),'ScientificCurveSurface must expose a left-label hit region, not only tick text.');
const app=read('src/app.js');
assert(!/\bPlotly\.(?:newPlot|react|Plots\.resize|toImage)/.test(app),'Host-owned plots must go through the shared chart runtime instead of bypassing universal display behavior.');
assert(app.includes("window.DKDSCharts.react(plot,traces,layout,config)")&&app.includes("window.DKDSCharts.react('zoomPlot',traces,layout,config)"),'Legacy host group/zoom charts must use the same Core chart runtime.');
assert(app.includes('const previousArtifacts=snapshotArtifactRows()')&&app.includes("pushArtifactDeltaToActivityWindows(projectRestoreDelta,'project-restore')"),'Project restore must broadcast the rebuilt Artifact transaction to already-open Data Center/TOP windows.');
const dc=read('src/plugins/data-center/shared-views.js');
assert(dc.includes('id="dcDataActionsBtn" type="button" disabled>编辑 ▾</button>'),'Data Center action button must be named 编辑.');
const index=read('src/index.html'),css=read('src/style.css');
assert(index.includes('system-core-tools-group')&&css.includes('.system-core-tools-group>.menu-anchor>.toolbar-btn'),'Data Management and Tools must render as one shared visual group.');
assert(index.includes('id="editMenuBtn"')&&index.includes('>编辑 ▾</button>'),'Top Edit menu label must be concise: 编辑.');
assert(css.includes('border:0!important')&&css.includes('box-shadow:none!important'),'Tools must not keep a second nested border/shadow inside the system group.');
console.log('v3.61.12 universal display + legacy project Data Center checks passed.');
})().catch(err=>{console.error(err);process.exit(2);});
