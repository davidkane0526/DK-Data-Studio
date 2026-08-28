'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

assert(/^3\.63\./.test(json('package.json').version),'v3.63 must retain the historical v3.61 contract baseline.');
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.19.0','SDK 1.19.0+ cutover is required');
assert.equal(contract.pluginApiVersion,'1.18.0');
assert.equal(contract.minimumAppVersion,'3.63.0','SDK minimum host must be the v3.63 Theme/SDK cutover baseline.');

const presentation=read('src/core/scientific/plot-presentation-runtime.js');
const chart=read('src/core/scientific/chart-runtime.js');
for(const token of ['class LegendController','function solveLegend','function splitRows'])assert(presentation.includes(token),`Shared presentation contract missing ${token}`);
for(const token of ['function rendererLayout',"next.showlegend=false",'function renderPlotLegend','function installPlotNavigation','next.__dkdsNavigationTools=!staticPlot&&!explicitOff'])assert(chart.includes(token),`Plot presentation contract missing ${token}`);
assert(chart.includes("preferredRenderer:'d3'")&&chart.includes('singleBackend:true'),'Core must retain the unified presentation contract on the single D3 backend.');

const infra=read('src/generated/runtime/ui-infrastructure.js');
for(const token of ['plotPresentation.solveLegend','legendController=new plotPresentation.LegendController','margin.top=Math.max(margin.top,legendMetrics.reserve+8)'])assert(infra.includes(token),`D3 presentation contract missing ${token}`);
assert(!infra.includes("margin.top+=legendMetrics.reserve"),'D3 must not double-count top legend reserve.');

const css=readCoreCss(root),modern=readCoreCss(root);
assert(css.includes('.dkds-scientific-chart-host'),'Scientific renderer must expose Core-owned host chrome.');
assert(css.includes('.dkds-plot-legend.dkds-scientific-auto-legend'),'D3 must use the shared HTML legend presentation.');
assert(css.includes('opacity:0')&&css.includes('pointer-events:none'),'Navigation chrome must auto-hide without participating in layout.');
assert(css.includes('[data-primary-scroll="safe"] .dkds-analysis-primary-host')&&css.includes('height:100%')&&css.includes('overflow:auto'),'safe PluginWorkspace must retain a bounded Core-owned Primary scroll viewport.');
assert(modern.includes('html[data-dkds-theme="dark"] body.dkds-modern-ui .topbar .menu-trigger')&&modern.includes('background:transparent'),'Dark shell menu triggers must not inherit legacy white paint.');
assert(modern.includes('.trend-card')&&modern.includes('background:var(--surface-primary)')&&modern.includes('border-color:var(--border-subtle)'),'Legacy scientific card borders/surfaces must resolve through semantic theme tokens.');
assert(!/js-plotly|dkds-plotly/i.test(modern),'Modern theme must contain no vendor-specific scientific renderer chrome.');

const types=read('sdk/plugin-api.d.ts');
assert(types.includes("placement?:'auto'|'top'|'bottom'|'right'|'left'"),'SDK legend placement vocabulary must match the Core solver.');
const readme=read('sdk/README.md');
assert(readme.includes('top-first')&&readme.includes('Core HTML legend')&&readme.includes('D3'),'SDK docs must describe Core-owned D3 scientific presentation.');
console.log('v3.61.34 unified scientific plot presentation contract retained');
