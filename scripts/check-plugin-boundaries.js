const fs=require('fs');
const path=require('path');

function read(path){return fs.readFileSync(path,'utf8');}
function fail(msg){console.error(`PLUGIN BOUNDARY ERROR: ${msg}`);process.exitCode=2;}

const html=read('./src/index.html');
const app=read('./src/app.js');
const kernel=read('./src/core/plugin-kernel.js');
const resonanceManifest=JSON.parse(read('./src/plugins/resonance-workbench/plugin.json'));
const resonance=(resonanceManifest.scripts||[resonanceManifest.entry||'plugin.js']).map(file=>read(`./src/plugins/resonance-workbench/${file}`)).join('\n');
const detector=read('./src/plugins/resonance-detector-robust/plugin.js');
const pulse=read('./src/plugins/pulse-analysis/plugin.js');
const ter=read('./src/plugins/ter-analysis/plugin.js');

const forbiddenCoreHtml=[
  ['智能寻峰','resonance peak UI'],
  ['手动操作','resonance manual-operation help'],
  ['id="rangeActionMenu"','resonance range overlay'],
  ['id="gateAnalysisPage"','resonance gate page'],
  ['id="spacingPage"','resonance spacing page'],
  ['id="physicsPanel"','resonance physics panel'],
  ['dataset-vg-input','resonance dataset metadata UI'],
  ['id="pulseAnalysisPage"','pulse analysis page'],
  ['id="terMaxPage"','TER analysis page']
];
for(const [token,label] of forbiddenCoreHtml){
  if(html.includes(token))fail(`${label} must be contributed by a plugin, not hard-coded in src/index.html`);
}

for(const token of ['data-plugin-sidebar','data-plugin-main-tools','id="activityBar"','id="pluginToolbarAnalysis"']){
  if(!html.includes(token))fail(`generic workspace mount missing: ${token}`);
}
for(const token of ["'ui.mainViews'","'ui.inspectors'","'ui.groupCharts'","'ui.groupViews'","'ui.selectionMenus'","'ui.shortcuts'","'ui.topWorkspaces'","'ui.prime'","'ui.sub'","'peak.detectors'"]){
  if(!kernel.includes(token))fail(`plugin kernel registry missing: ${token}`);
}
for(const token of ['mainViews:','selectionMenus:','mainOverlays:','inspectors:','groupCharts:','sidebar:','activities:','topWorkspace:','prime:','sub:']){
  if(!kernel.includes(token))fail(`plugin API extension missing: ${token}`);
}

if(!app.includes("registry?.values?.('ui.mainViews')"))fail('core main canvas must resolve its renderer from ui.mainViews');
if(!app.includes("detectPeaksViaProvider(sw"))fail('resonance detection must route through a detector provider');
if(app.includes('function renderPhysicsPanel(){'))fail('physics panel renderer must not remain in core app.js');
const resizeStart=app.indexOf("window.addEventListener('resize'");
const resizeEnd=app.indexOf('if(window.ResizeObserver)',resizeStart);
const resizeBlock=resizeStart>=0&&resizeEnd>resizeStart?app.slice(resizeStart,resizeEnd):'';
for(const token of ['gateResonancePlot','spacingPlot','terHeatmapPlot','pulseRawPlot']){
  if(resizeBlock.includes(token))fail(`core resize handler must not know domain plot id: ${token}`);
}
if(app.includes("if(e.key==='p'||e.key==='P')"))fail('resonance physics shortcut must be owned by its plugin, not core app.js');
if(app.includes("if(e.key==='l'||e.key==='L')"))fail('resonance lock shortcut must be owned by its plugin, not core app.js');
if(resonance.includes('function renderRobustChannels'))fail('workbench must not special-case the built-in detector settings UI');

for(const token of [
  "ctx.ui.activities.add",
  "ctx.ui.sidebar.add",
  "ctx.ui.mainViews.register",
  "ctx.ui.shortcuts.add",
  "ctx.ui.selectionMenus.register",
  "ctx.ui.inspectors.register",
  "ctx.ui.groupCharts.register",
  "ctx.ui.groupViews.register",
  "ctx.ui.panels.add",
  "ctx.ui.pages.add"
]){
  if(!resonance.includes(token))fail(`resonance workbench missing plugin-owned UI contribution: ${token}`);
}

if(!detector.includes("ctx.analysis.detectors.register('robust-ricker-v1'"))fail('robust detector must be an independent detector plugin');
if(!detector.includes('renderSettings({container,settings,onChange})'))fail('detector plugin must own its algorithm-specific settings UI');
if(!detector.includes('evidence'))fail('detector plugin must provide evidence/marker metadata');

if(!pulse.includes("pageId:'pulseAnalysisPage'")||!pulse.includes('html:pageHtml'))fail('pulse analysis page must be created and owned by the pulse plugin');
if(!ter.includes("pageId:'terMaxPage'")||!ter.includes('html:pageHtml'))fail('TER analysis page must be created and owned by the TER plugin');
if(!resonance.includes('ctx.ui.topWorkspace.register'))fail('resonance must register a TOP workspace contract');
if(!pulse.includes('ctx.ui.topWorkspace.register'))fail('pulse must register a TOP workspace contract');
if(!ter.includes('ctx.ui.topWorkspace.register'))fail('TER must register a TOP workspace contract');
if(!app.includes('applySuperWorkspaceComposition'))fail('core shell must compose SUPER from generic TOP semantic slots');
for(const token of ['#pulseAnalysisPage.super-workspace-page','#terMaxPage.super-workspace-page','#builtin-data-center-data-center-page.super-workspace-page']){
  if(read('./src/style.css').includes(token))fail(`core SUPER CSS must not hard-code built-in TOP selector: ${token}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log('Plugin boundary check OK: core shell is generic and resonance UI is plugin-owned.');
