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

const infra=read('src/core/ui-infrastructure.js');
for(const token of ['class SeriesRegistry','class LegendGroup','class ActiveLayoutSolver','class GroupPlot','class TooltipService','series=new SeriesRegistry','groupPlots={create','layoutSolver.solve'])assert(infra.includes(token),`Core UI contract missing ${token}`);
assert(infra.includes("placement=horizontalFits?'top'")||infra.includes("placement=topFits?'top'"),'D3 legend auto-placement must prefer top');
assert(infra.includes("'is-top','is-bottom','is-right','is-left'"),'D3 legend must support all Core placements');
assert(infra.includes('dataset.dkdsTableTone')&&infra.includes('dataset.dkdsTableEmphasis'),'TableSurface must own semantic tone/emphasis');

const chart=read('src/core/chart-runtime.js');
for(const token of ["const VERSION='1.8.0'",'normalizedLegendData','compactLegendLabel',"placement=topFits?'top'",'next.modebar='])assert(chart.includes(token),`Chart runtime missing ${token}`);
assert(chart.includes('Math.ceil(reserve)+46'),'bottom Plotly legend must reserve x-axis-title clearance');

const kernel=read('src/core/plugin-kernel.js');
assert(kernel.includes("const API_VERSION = '1.17.0'"));
for(const token of ['history: Object.freeze','series: infrastructureScope?.series','legends: infrastructureScope?.legends','groupPlots: infrastructureScope?.groupPlots','tooltips: infrastructureScope?.tooltips',"name:'DK Data Studio Design System'","version:'1.17'"])assert(kernel.includes(token),`Plugin API missing ${token}`);

const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
assert(resonance.includes("legend:false,margin:{top:62"),'Resonance must declare that its domain-owned main legend suppresses the generic Core legend');
assert(!resonance.includes('reswin-group-legend'),'Resonance must not own a duplicate group legend');

const devtools=read('src/core/plugin-devtools.js');
for(const token of ['Plugin DevTools','Surface','布局','Series','History','Boundary','DKDSUI?.diagnostics','core.project-history'])assert(devtools.includes(token),`Plugin DevTools missing ${token}`);
const modern=read('src/ui-modern.css');
assert(modern.includes('Modern shell owns the default control palette'),'Modern theme must provide a generic button palette rather than plugin-by-plugin dark overrides');
assert(modern.includes('.dkds-plugin-devtools-window'),'App-native Plugin DevTools must be styled by the Design System');

const types=read('sdk/plugin-api.d.ts');
for(const token of ["readonly apiVersion:'1.17.0'",'DKDSSeriesRegistry','DKDSLegendGroup','DKDSActiveLayoutSolver','DKDSGroupPlot','DKDSTooltipRuntime','DKDSProjectHistoryRuntime','DKDSDesignSystem'])assert(types.includes(token),`SDK types missing ${token}`);
const schema=json('sdk/plugin-manifest.schema.json');
for(const req of ['history','ui.series','ui.legend-groups','ui.group-plots','ui.tooltips','ui.design-system'])assert(schema.properties.requiresCore.items.enum.includes(req),`Manifest schema missing ${req}`);
console.log('v3.61.34 SDK 1.17 Core UI Contract Completion OK');
