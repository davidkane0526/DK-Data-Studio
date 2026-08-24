'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert.equal(json('package.json').version,'3.61.49');
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.17.6');
assert.equal(contract.pluginApiVersion,'1.17.0');
assert.equal(contract.minimumAppVersion,'3.61.39');


const app=read('src/app.js'),index=read('src/index.html'),pluginWindow=read('src/plugin-window/runtime.js');
assert(app.includes("version:'3.61.49'")&&app.includes("appVersion:'3.61.49'"),'Main renderer version metadata must match the release version.');
assert(index.includes('<span class="version">v3.61.49</span>'),'Visible shell version must match the release version.');
assert(pluginWindow.includes("appVersion:'3.61.49'"),'Dedicated plugin windows must report the release version.');

const chart=read('src/core/chart-runtime.js');
for(const token of [
  "const VERSION='2.0.0'",'function legendEntriesFor','function traceLegendGroup',
  'legendgroup:','function applyPlotLegendFocus','restyle(el','function ensurePlotPresentationHost',
  'legendBaselineVisibility','legendSelectedKey','function renderPlotLegend'
])assert(chart.includes(token),`Scientific Plot closure missing ${token}`);
assert(chart.indexOf('ensurePlotPresentationHost(el);')<chart.indexOf('renderPlotLegend(el,state);'),'Plot host positioning must be established before Core legend rendering.');
assert(!chart.includes('dw<12&&dh<12'),'Resize stabilization must not depend on the old geometry feedback threshold.');
assert(chart.includes("preferredRenderer:'d3'")&&chart.includes('singleBackend:true'),'Scientific renderer must remain D3-only.');

const presentation=read('src/core/plot-presentation-runtime.js');
assert(presentation.includes('stable-single-series-slot'),'Shared presentation solver must preserve transient legend geometry.');

const css=read('src/style.css');
for(const token of ['.dkds-plot-legend-row','Scientific Presentation Contract 1.0','.dkds-scientific-chart-host'])assert(css.includes(token),`Plot CSS closure missing ${token}`);
assert(!css.includes('overflow-x:auto!important'),'Core legend must not expose a permanent horizontal scrollbar.');
assert(!css.includes('.system-core-tools-group>.menu-anchor>.toolbar-btn:hover,.system-core-tools-group>.toolbar-btn:hover{background:#fff!important'),'System Core hover must not paint white in dark mode.');

const modern=read('src/ui-modern.css');
for(const token of [
  'v3.61.35 Core visual closure','transform:none!important','body.dkds-modern-ui .import-workbench',
  'body.dkds-modern-ui .dkds-analysis-nav-btn','body.dkds-modern-ui .plugin-status-item::before',
  'background:#29313e!important','Shell controls are flat interactive surfaces'
])assert(modern.includes(token),`Theme closure missing ${token}`);
assert(modern.includes('body.dkds-modern-ui .activity-tab.active')&&modern.includes('box-shadow:0 1px 2px rgba(33,57,112,.06)!important'),'Activity tabs must not use a white inset top rim.');

const readme=read('sdk/README.md');
for(const token of ['scoped to its own surface host','at most two balanced rows','`legendgroup`','does not visibly twitch'])assert(readme.includes(token),`SDK visual contract docs missing ${token}`);
console.log('v3.61.38 visual contract closure OK');
