'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const pkg=json('package.json');
const app=json('mobile/app.json');
const plugin=json('src/plugins/pulse-analysis/plugin.json');
const css=read('src/plugins/pulse-analysis/plugin.css');
const mobile=read('src/plugins/pulse-analysis/mobile.css');
const unit=read('src/plugins/pulse-analysis/unit-presentation.js');
const plotView=read('src/core/ui/modules/plot-view/chart.js');
const unitDocs=read('sdk/UNIT_TEMPLATES.md');

const versionAtLeast=(actual,minimum)=>{
  const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;
};
assert(versionAtLeast(pkg.version,'3.71.64'),'v3.71.64+ Pulse intrinsic Mobile result-flow correction required.');
assert(Number(app.expo.android.versionCode)>=205,'Android versionCode 205+ required.');
assert(versionAtLeast(plugin.version,'2.12.4'),'Pulse Analysis 2.12.4+ required.');

// v3.71.64 proved the renderer needs intrinsic scientific content height. The
// permanent owner is now the existing Unit PlotView detailGeometry contract,
// not a Pulse CSS custom-property workaround.
assert(unit.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Pulse result/raw PlotViews must declare intrinsic content height at the Unit boundary.');
assert(plotView.includes('const rawMin=Number(this.spec.contentMinHeight),rawMax=Number(this.spec.contentMaxHeight)'),'Generic PlotView execution must honor Unit-translated content min/max geometry without requiring an aspect ratio.');
assert(plotView.includes('if(!(ratio>0)&&!hasMin&&!hasMax)'),'Standalone contentMinHeight/contentMaxHeight must be a valid generic PlotView execution path.');
assert(unitDocs.includes('contentMinHeightPx'),'The public Unit authoring contract must continue documenting PlotView content minimum geometry.');

// PRIMARY projected width is consumed by the Unit Layout through an explicit
// responsiveTarget. No plugin CSS container/media query owns result columns.
assert(unit.includes("variant:'two-card-grid'")&&unit.includes('responsiveTarget:primaryMain'),'Projected PRIMARY width must drive Unit result-grid responsiveness.');
assert(unit.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Only <=520px projected PRIMARY may collapse result plots to one column.');
for(const source of [css,mobile])for(const selector of ['.pulse-results-split{','.pulse-results-grid{','.pulse-result-card{','.pulse-result-plot{','.pulse-results-table-card{','.pulse-table-wrap{'])
  assert(!source.includes(selector),`Pulse authored CSS must not re-own Unit result-flow geometry: ${selector}`);
assert(!css.includes('--dkds-plot-content-min-height:320px'),'The retired plugin-CSS PlotView geometry workaround must not return.');

// The table and raw diagnostic follow the result plots in one normal PRIMARY flow.
// Mobile receives the same composition; only Unit responsive width changes the result grid.
const readPlot=unit.indexOf("createPlotCard(resultGrid,{viewId:'read'");
const pulsePlot=unit.indexOf("createPlotCard(resultGrid,{viewId:'pulse'");
const tablePanel=unit.indexOf('const tablePanel=units.panel.create(visual');
const rawPlot=unit.indexOf("createPlotCard(visual,{viewId:'raw'");
assert(readPlot>=0&&pulsePlot>readPlot&&tablePanel>pulsePlot&&rawPlot>tablePanel,'Result plots, table, and raw diagnostic must be authored in canonical sequential PRIMARY order.');
assert(!unit.includes('units.splitPane.create(primaryMain'),'Mobile vertical flow must be the same content-sized PRIMARY flow, not a viewport-filling SplitPane.');

console.log('v3.71.67 Pulse intrinsic sequential result-flow acceptance PASS under Unit PlotView/Layout ownership');
