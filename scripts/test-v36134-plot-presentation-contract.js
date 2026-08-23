'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.34');
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.17.1');
assert.equal(contract.pluginApiVersion,'1.17.0');
assert.equal(contract.minimumAppVersion,'3.61.34');

const chart=read('src/core/chart-runtime.js');
for(const token of [
  'function packedLegendRows',
  "current.autoplace===false",
  "rows<=2",
  'function plotlyRenderLayout',
  "next.showlegend=false",
  'dkds-plotly-auto-legend',
  'button.dataset.seriesKey',
  "current.legendSoloKey=current.legendSoloKey===key?'':key",
  'function installPlotNavigation',
  'dkds-plotly-nav-tools',
  'next.__dkdsNavigationTools=!staticPlot&&!explicitOff',
  'next.displayModeBar=false',
  'dw<12&&dh<12'
])assert(chart.includes(token),`Plot presentation contract missing ${token}`);
assert(!chart.includes("displayModeBar:'hover'"),'Core must not force Plotly native modebar back on.');

const infra=read('src/core/ui-infrastructure.js');
for(const token of ['function packedLegendRowCount',"rows<=Math.min(2,options.maxRows)",'margin.top=Math.max(margin.top,legendMetrics.reserve+8)'])assert(infra.includes(token),`D3 presentation contract missing ${token}`);
assert(!infra.includes("margin.top+=legendMetrics.reserve"),'D3 must not double-count top legend reserve.');

const css=read('src/style.css'),modern=read('src/ui-modern.css');
assert(css.includes('.dkds-plotly-surface-host'),'Plotly must expose Core-owned host chrome.');
assert(css.includes('.dkds-plotly-auto-legend'),'Plotly must use the shared HTML legend presentation.');
assert(css.includes('opacity:.64!important'),'Navigation chrome must remain geometrically stable instead of popping in/out on hover.');
assert(css.includes('[data-primary-scroll="safe"] .dkds-analysis-primary-host')&&css.includes('height:auto!important'),'safe PluginWorkspace must allow semantic Primary content to grow.');
assert(modern.includes('html[data-dkds-theme="dark"] body.dkds-modern-ui .topbar .menu-trigger')&&modern.includes('background:transparent!important'),'Dark shell menu triggers must not inherit legacy white paint.');
assert(modern.includes('semantic structural bridge'),'Legacy scientific card borders/surfaces must resolve through semantic theme tokens.');
assert(!modern.includes('.js-plotly-plot .plotly .modebar'),'Modern theme must not patch generated Plotly modebar DOM.');

const types=read('sdk/plugin-api.d.ts');
assert(types.includes("placement?:'auto'|'top'|'bottom'|'right'|'left'"),'SDK legend placement vocabulary must match the Core solver.');
const readme=read('sdk/README.md');
assert(readme.includes('top-first')&&readme.includes("same Core HTML legend presentation")&&readme.includes("native modebar is suppressed"),'SDK docs must describe unified D3/Plotly presentation.');
console.log('v3.61.34 unified scientific plot presentation contract OK');
