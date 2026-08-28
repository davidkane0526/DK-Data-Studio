'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

const release=json('package.json').version;
assert.match(release,/^3\.64\.\d+$/,'visual contract closure must run on the 3.64 release line');
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.20.0');
assert.equal(contract.pluginApiVersion,'1.18.0');
assert.equal(contract.minimumAppVersion,'3.64.0');


const app=read('src/generated/runtime/app.js'),index=read('src/index.html'),pluginWindow=read('src/plugin-window/runtime.js');
assert(app.includes(`version:'${release}'`)&&app.includes(`appVersion:'${release}'`),'Main renderer version metadata must match the release version.');
assert(index.includes(`<span class="version">v${release}</span>`),'Visible shell version must match the release version.');
assert(pluginWindow.includes(`appVersion:'${release}'`),'Dedicated plugin windows must report the release version.');

const chart=read('src/core/scientific/chart-runtime.js');
for(const token of [
  "const VERSION='2.0.0'",'function legendEntriesFor','function traceLegendGroup',
  'legendgroup:','function applyPlotLegendFocus','restyle(el','function ensurePlotPresentationHost',
  'legendBaselineVisibility','legendSelectedKey','function renderPlotLegend'
])assert(chart.includes(token),`Scientific Plot closure missing ${token}`);
assert(chart.indexOf('ensurePlotPresentationHost(el);')<chart.indexOf('renderPlotLegend(el,state);'),'Plot host positioning must be established before Core legend rendering.');
assert(!chart.includes('dw<12&&dh<12'),'Resize stabilization must not depend on the old geometry feedback threshold.');
assert(chart.includes("preferredRenderer:'d3'")&&chart.includes('singleBackend:true'),'Scientific renderer must remain D3-only.');

const presentation=read('src/core/scientific/plot-presentation-runtime.js');
assert(presentation.includes('stable-single-series-slot'),'Shared presentation solver must preserve transient legend geometry.');

const css=readCoreCss(root);
for(const token of ['.dkds-plot-legend-row','Scientific Presentation Contract 1.0','.dkds-scientific-chart-host'])assert(css.includes(token),`Plot CSS closure missing ${token}`);
assert(/\.dkds-plot-legend\.dkds-scientific-auto-legend\s*\{[^}]*overflow:hidden/s.test(css),'Core legend must remain clipped/auto-managed rather than expose a permanent horizontal scrollbar.');
assert(!css.includes('.system-core-tools-group>.menu-anchor>.toolbar-btn:hover,.system-core-tools-group>.toolbar-btn:hover{background:#fff'),'System Core hover must not paint white in dark mode.');

const modern=readCoreCss(root);
for(const token of [
  'transform:none','body.dkds-modern-ui .import-workbench',
  'body.dkds-modern-ui .dkds-analysis-nav-btn','body.dkds-modern-ui .plugin-status-item::before',
  'background:#29313e','body.dkds-modern-ui button:hover:not(:disabled)'
])assert(modern.includes(token),`Theme closure missing ${token}`);
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(componentAppearance.includes('.activity-tab')&&componentAppearance.includes('--dkui-component-tab-surface-active')&&componentAppearance.includes('--dkui-component-tab-indicator'),'Theme Component Appearance must be the single semantic paint owner for Activity selected/active chrome.');
assert(!read('src/styles/presentation/shell.css').match(/activity-tab[^\{]*\.active[^\{]*\{[^}]*box-shadow/i),'Shell presentation must not paint Activity selected chrome.');

const readme=read('sdk/README.md');
for(const token of ['scoped to its own surface host','at most two balanced rows','`legendgroup`','does not visibly twitch'])assert(readme.includes(token),`SDK visual contract docs missing ${token}`);
console.log('v3.61.38 visual contract closure OK');
