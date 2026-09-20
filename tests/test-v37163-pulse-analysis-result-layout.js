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
const unit=read('src/plugins/pulse-analysis/unit-presentation.js');
const css=read('src/plugins/pulse-analysis/plugin.css');
const mobile=read('src/plugins/pulse-analysis/mobile.css');
const shadow=read('examples/sdk151-unit-pulse-shadow/plugin.js');

const versionAtLeast=(actual,minimum)=>{
  const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);
  for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;
};
assert(versionAtLeast(pkg.version,'3.71.63'),'v3.71.63+ Pulse result-flow correction required.');
assert(Number(app.expo.android.versionCode)>=204,'Android versionCode 204+ required for the Pulse result-flow correction.');
assert(versionAtLeast(plugin.version,'2.12.3'),'Pulse Analysis 2.12.3+ required.');

// The historical 3.71.63 closure is now protected at the canonical Unit owner.
// It must never regress to a plugin CSS viewport fill or host-owned split.
for(const retired of ['height:min(940px,calc(100vh - 110px))','min-height:720px','--dkds-unit-pulse-results-table-height'])
  assert(!css.includes(retired),`Retired viewport-filling/private Pulse result geometry returned: ${retired}`);
assert(!unit.includes("id:'pulse-results-table-height-v3'")&&!unit.includes('units.splitPane.create(primaryMain'),'Pulse result/table flow must stay sequential and content-sized; no PRIMARY-filling SplitPane may return.');
assert(!unit.includes("layoutOwner:'host'"),'Pulse result flow must not return to a host/plugin-owned split geometry path.');

assert(!unit.includes('isNativeClient'),'Pulse shared Unit presentation must remain platform-neutral; Presenter/runtime owns host adaptation.');
assert(unit.includes("const stateVersion=raw?'pulse-raw-flow-v5':'pulse-result-grid-v6';"),'Pulse PlotViews need current home-state namespaces so stale PRIME/dock placements cannot survive.');
const readPlot=unit.indexOf("createPlotCard(resultGrid,{viewId:'read'");
const pulsePlot=unit.indexOf("createPlotCard(resultGrid,{viewId:'pulse'");
const tablePanel=unit.indexOf('const tablePanel=units.panel.create(visual');
assert(readPlot>=0&&pulsePlot>readPlot&&tablePanel>pulsePlot,'Both result PlotViews must be authored before the table under the shared result-flow Unit owner.');

assert(unit.includes("variant:'two-card-grid'")&&unit.includes('responsiveTarget:primaryMain'),'Pulse result columns must be owned by the Unit Layout and measured from the projected PRIMARY.');
assert(unit.includes("gridTemplateColumns:'repeat(2,minmax(0,1fr))'")&&unit.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Wide PRIMARY must keep two cards; only <=520px PRIMARY may collapse to one column.');
for(const selector of ['.pulse-results-split{','.pulse-results-visual-pane{','.pulse-results-grid{','.pulse-result-card{','.pulse-result-plot{','.pulse-results-table-card{','.pulse-table-wrap{']){
  assert(!css.includes(selector),`Pulse plugin CSS must not own Unit result geometry: ${selector}`);
  assert(!mobile.includes(selector),`Pulse Mobile CSS must not own Unit result geometry: ${selector}`);
}
assert(!/@media\s*\(max-width:(?:520|560|900)px\)[\s\S]*?\.pulse-results-grid/.test(mobile),'Mobile viewport media queries must not own Pulse result column count.');

assert(!shadow.includes('isNativeClient'),'Pulse Unit shadow must remain platform-neutral.');
assert(shadow.includes("stateVersion:'pulse-unit-shadow-results-v5'"),'Pulse Unit shadow must use the current result PlotView persistence namespace.');
assert(!shadow.includes("pulse-shadow-results-table-height-v3")&&!shadow.includes('units.splitPane.create(main'),'Pulse Unit shadow must teach the same sequential PRIMARY flow.');
assert(shadow.includes("detailGeometry:{contentMinHeightPx:320,contentMaxHeightPx:320}"),'Pulse Unit shadow must teach intrinsic result PlotView height through Unit detailGeometry.');
assert(!shadow.includes("height:'min(940px,calc(100vh - 110px))'")&&!shadow.includes("minHeight:'720px'"),'Pulse Unit shadow must not teach retired viewport-filling result geometry.');

console.log('v3.71.63 Pulse result-flow acceptance PASS under canonical Unit ownership');
