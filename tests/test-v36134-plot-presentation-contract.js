'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

{const [major,minor]=json('package.json').version.split('.').map(Number);assert(major===3&&minor>=64,'Current App must remain on or beyond the v3.64 historical contract baseline.');}
const contract=json('sdk/contract.json');
assert.equal(contract.sdkVersion,'1.28.0','SDK 1.20.0+ cutover is required');
assert.equal(contract.pluginApiVersion,'1.19.0');
assert.equal(contract.minimumAppVersion,'3.68.36','SDK minimum host must include the Theme 3.10 contextual-composition baseline.');

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
const semantic=read('src/core/theme/semantic-registry.js');
const componentAppearance=read('src/styles/theme/component-appearance.css');
assert(semantic.includes("selector:'button:not(.dkds-field-control),.toolbar-btn,.plugin-toolbar-btn")&&componentAppearance.includes('[data-dkds-component-identity="toolbarAction"]'),'Shell menu triggers must enter canonical ToolbarAction appearance instead of receiving a dark-mode paint patch.');
assert(!modern.includes('html[data-dkds-theme="dark"] body.dkds-modern-ui .topbar .menu-trigger'),'Dark shell menu-trigger paint override must not return.');
assert(semantic.includes('.trend-card,.analysis-chart-card'),'Scientific cards must be registered as Core semantic Material surfaces.');
assert(!semantic.includes('.trend-card-legend'),'Trend Card legend must remain transparent child content instead of creating a nested Material surface.');
assert(!/\.trend-card\s*\{[^}]*(?:background|border-color|box-shadow)\s*:/s.test(read('src/styles/presentation/scientific.css')),'Scientific Presentation CSS must not repaint the Trend Card Material surface.');
assert(!/js-plotly|dkds-plotly/i.test(modern),'Modern theme must contain no vendor-specific scientific renderer chrome.');

const types=read('sdk/plugin-api.d.ts');
assert(types.includes("placement?:'auto'|'top'|'bottom'|'right'|'left'"),'SDK legend placement vocabulary must match the Core solver.');
const readme=read('sdk/README.md');
assert(readme.includes('top-first')&&readme.includes('Core HTML legend')&&readme.includes('D3'),'SDK docs must describe Core-owned D3 scientific presentation.');
console.log('v3.61.34 unified scientific plot presentation contract retained');
