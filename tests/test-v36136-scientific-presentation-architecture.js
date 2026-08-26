'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.87');
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.17.16');
assert.equal(contract.pluginApiVersion,'1.17.0');
assert.equal(contract.minimumAppVersion,'3.61.39');

const presentation=read('src/core/scientific/plot-presentation-runtime.js');
const chart=read('src/core/scientific/chart-runtime.js');
const plot=read('src/core/scientific/plot-runtime.js');
const ui=read('src/generated/runtime/ui-infrastructure.js');
const css=readCoreCss(root);
const modern=readCoreCss(root);
const index=read('src/index.html');
const dedicated=read('src/plugin-window/runtime.js');

assert(index.indexOf('core/scientific/plot-presentation-runtime.js') < index.indexOf('core/scientific/chart-runtime.js'),'Presentation runtime must load before Chart Runtime.');
assert(dedicated.includes("'plot-presentation-runtime':'../core/scientific/plot-presentation-runtime.js'")&&dedicated.indexOf("'plot-presentation-runtime'")<dedicated.indexOf("'chart-runtime'"),'Dedicated windows must load the shared presentation runtime before charts.');
assert(chart.includes("const VERSION='2.0.0'")&&chart.includes('const presentation=window.DKDSPlotPresentation'),'Core chart facade must consume the shared presentation runtime as a D3-only backend.');
assert(ui.includes("const VERSION = '7.1.0'")&&ui.includes('const plotPresentation = window.DKDSPlotPresentation || null'),'Core UI surfaces must consume the same presentation runtime.');
assert(plot.includes("const VERSION='2.5.0'")&&plot.includes('selectLegendForTrace'),'ScientificPlot selection must bridge curve selection to Core legend focus.');
assert(chart.includes('legendBaselineVisibility')&&chart.includes('legendSelectedKey'),'Plot legend must preserve baseline visibility separately from selection.');
assert(chart.includes("explicitOff=source.dkdsNavigationTools===false")&&!chart.includes("source.displayModeBar===false||source.dkdsNavigationTools===false"),'Legacy displayModeBar:false must not disable Core navigation.');
assert(chart.includes('const restoring=current.legendSoloKey===key')&&chart.includes("current.legendSoloKey=restoring?'':key")&&chart.includes('current.legendSelectedKey=current.legendSoloKey'),'Second legend click must restore baseline visibility and clear legend-only focus.');
assert(chart.includes('function installPlotLegendSelection')&&ui.includes("this.legendSelectedId=String(curve?.id||'')"),'Core D3 surfaces must highlight legend entries when a curve is selected.');
assert(!chart.includes('function packedLegendRows')&&!ui.includes('function packedLegendRowCount'),'Engine runtimes must not keep duplicate legend packing algorithms.');
assert(presentation.includes('class LegendController')&&presentation.includes('function solveLegend'),'Legend rendering and placement must have one shared implementation.');
assert(presentation.includes('this.buttonMap=new Map()')&&presentation.includes('line.appendChild(button)')&&presentation.includes('host.replaceChildren(fragment)'),'Legend controls must be stable semantic nodes that are reparented instead of recreated across solver updates.');
assert(presentation.includes("reason:'stable-single-series-slot'"),'Dynamic plots must preserve legend geometry across transient single-series states.');
assert(css.includes('Scientific Presentation Contract 1.0')&&css.includes('opacity:0')&&css.includes('pointer-events:none'),'Floating scientific toolbar must auto-hide without entering layout flow.');
assert(!css.includes('opacity:.64'),'Permanent visible plot toolbar regression must be removed.');
assert(/\.dkds-plot-legend\.dkds-scientific-auto-legend\s*\{[^}]*overflow:hidden/s.test(css),'Horizontal legend scrollbar must not be forced visible.');
assert(css.includes('.dkds-plot-legend-item.is-selected')&&css.includes('width:18px'),'Legend selection must use restrained swatch emphasis rather than a blue chip.');
assert(css.includes('.dkds-plot-view-head')&&css.includes('height:28px'),'Standard plot title bars must use compact Core geometry.');
assert(modern.includes('body.dkds-modern-ui button:hover:not(:disabled)')&&modern.includes('transform:none'),'Modern hover states must not move buttons.');

// Execute the pure shared layout solver without a browser dependency.
const context={window:{},console};vm.createContext(context);vm.runInContext(presentation,context);
const api=context.window.DKDSPlotPresentation;assert(api&&api.VERSION==='1.1.0');
let solved=api.solveLegend({entries:[{key:'a',label:'原始 I–V'},{key:'b',label:'原始峰位投影'}],width:260,height:220,placement:'auto'});
assert.equal(solved.placement,'top');assert.equal(solved.rows,1,'Two compact labels should share one row on a narrow auxiliary plot.');
solved=api.solveLegend({entries:Array.from({length:8},(_,i)=>({key:String(i),label:`Vg=${-40+i*5} V`})),width:450,height:320,placement:'auto'});
assert(solved.rows<=2,'Crowded horizontal legends are capped at two rows.');
const previous={enabled:true,placement:'top',count:2,rows:1,width:430,height:26,reserve:26,containerWidth:450,signature:'a|b'};
solved=api.solveLegend({entries:[{key:'a',label:'Vd'}],width:452,height:320,previous,stabilize:true});
assert.equal(solved.reason,'stable-single-series-slot');assert.equal(solved.reserve,26,'Transient series-count changes must not resize plot geometry.');

console.log('v3.61.38 shared scientific presentation architecture OK');
