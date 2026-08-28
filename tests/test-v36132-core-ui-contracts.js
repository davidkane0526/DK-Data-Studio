'use strict';
const fs=require('fs');
const path=require('path');
const {readCoreCss}=require('./css-source');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=require(path.join(root,'package.json'));
const contract=require(path.join(root,'sdk/contract.json'));
const {inspectWorkspaceStyles}=require(path.join(root,'sdk/layout-contract.js'));

assert(/^3\.64\./.test(pkg.version),'v3.64 must retain the historical v3.61 contract baseline.');
assert(Number(contract.pluginApiVersion.split('.')[1])>=16,'Plugin API must preserve the 1.16 Core UI contract');

const ui=read('src/generated/runtime/ui-infrastructure.js');
assert(ui.includes("data-dkds-core-surface")||ui.includes("dkdsCoreSurface='table'"),'TableSurface must mark Core-owned table internals');
assert(ui.includes('applyAppearance()'),'TableSurface must own declared appearance variants');
assert(ui.includes('computeLegendLayout(width,height,curves,baseMargin)'),'D3 ScientificPlot must compute a Core legend footprint');
assert(ui.includes("interaction:'isolate'"),'D3 default legend interaction must isolate one series');
assert(ui.includes('containmentY')&&ui.includes("['hidden','clip','visible']"),'PluginWorkspace must detect visual containment overflow, not only clipping');
assert(ui.includes('risks:Object.freeze(risks)'),'PluginWorkspace diagnostics must expose predicted layout risks');

const chart=read('src/core/scientific/chart-runtime.js');
assert(/const VERSION='(?:1\.(?:[7-9]|[1-9]\d)\.\d+|[2-9]\d*\.\d+\.\d+)'/.test(chart),'Chart Runtime must publish the smart-legend revision');
assert(chart.includes('smartLegendLayout')&&chart.includes('presentation.LegendController')&&chart.includes('current.legendSoloKey'),'Core Chart Runtime must provide renderer-neutral default legend linkage.');
assert(chart.includes('legendMetrics')&&chart.includes('legendBaseLayouts'),'Core renderer facade must expose legend footprint and recompute it from the base layout.');

const scientific=read('src/core/scientific/plot-runtime.js');
assert(scientific.includes('layout:()=>view.chart?.legendMetrics'),'ScientificPlot legend controller must expose Core legend layout');
assert(scientific.includes('legendMetrics(target)'),'ScientificPlot scope must expose legend metrics');

const style=readCoreCss(root);
assert(style.includes('.dkds-table-surface-host')&&style.includes('.dkds-managed-table'),'Core TableSurface visual contract must exist');
assert(style.includes('background:var(--surface-primary,#fff);color:var(--text-primary,#1c2a43)'),'Core must own table base visual styling');
const statusBlock=style.slice(style.indexOf('#statusBar.statusbar'),style.indexOf('.workspace{',style.indexOf('#statusBar.statusbar')));
assert(statusBlock.includes('var(--surface-primary')&&statusBlock.includes('var(--border-subtle'),'Status bar must use semantic theme tokens');
const pulseStart=style.indexOf('v3.13 pulse batch workspace');
const pulseEnd=style.indexOf('v3.14 LAN web share panel',pulseStart);
const pulse=style.slice(pulseStart,pulseEnd);
assert(!/\.pulse-file-toolbar\{[\s\S]{0,260}background\s*:\s*#fff/i.test(pulse),'Pulse file toolbar must not force a light background');
assert(!/\.pulse-file-list\{[\s\S]{0,260}background\s*:\s*#fbfcfe/i.test(pulse),'Pulse file list must not force a light background');

const bad=inspectWorkspaceStyles({apiVersion:'1.18.0',pluginType:'tool',workspace:{role:'top'},styles:[{name:'plugin.css',content:'.plugin-shell table { font-size:10px }'}]});
assert(bad.errors.some(x=>x.includes('TableSurface internals')),'SDK must reject undeclared CSS penetration into Core tables');
const stripe=inspectWorkspaceStyles({apiVersion:'1.18.0',pluginType:'tool',workspace:{role:'top'},ui:{tableAppearance:{cssOverrides:['row-striping']}},styles:[{name:'plugin.css',content:'.plugin-shell .dkds-managed-table tbody tr:nth-child(even)>td { background:#eef; }'}]});
assert.equal(stripe.errors.length,0,'Explicit row-striping exception must remain available');
assert(stripe.warnings.length>0,'Direct row CSS exceptions must remain visible in validation output');

const main=read('desktop/main.js'),preload=read('desktop/preload.js'),app=read('src/generated/runtime/app.js'),status=read('src/plugins/status-monitor/plugin.js'),pluginWindow=read('src/plugin-window/runtime.js');
assert(main.includes("ipcMain.handle('system:toggleDevTools'")&&main.includes("ipcMain.handle('system:getDevToolsState'"),'Electron host must expose DevTools controls');
assert(preload.includes('toggleDevTools')&&preload.includes('getDevToolsState'),'Preload must expose DevTools controls safely');
assert(app.includes('toggleDevTools:()=>window.electronAPI?.toggleDevTools'),'Main plugin runtime service must expose DevTools');
assert(status.includes("id:'devtools'")&&status.includes("label:'DevTool'"),'Main status bar must expose DevTool');
assert(pluginWindow.includes('installHostDevToolsStatusItem'),'Dedicated plugin windows must expose DevTool too');

const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(!resonance.includes('reswin-group-legend'),'Resonance group plots must not maintain a second plugin-owned legend');
assert(!resonance.includes("showlegend:false,autosize:true"),'Resonance group plots must allow Core multi-series legends');

console.log('v3.61.32 Core UI contracts OK');
