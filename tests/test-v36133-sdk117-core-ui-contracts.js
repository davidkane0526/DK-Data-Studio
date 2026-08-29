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
assert.equal(contract.sdkVersion,'1.21.0','SDK must be the 1.18 Legacy-Free contract.');
assert.equal(contract.pluginApiVersion,'1.18.0');
assert.equal(contract.minimumAppVersion,'3.65.0','SDK minimum host must be the v3.65 Theme semantic-core baseline.');

const infra=read('src/generated/runtime/ui-infrastructure.js');
for(const token of ['class SeriesRegistry','class LegendGroup','class ActiveLayoutSolver','class GroupPlot','class TooltipService','series=new SeriesRegistry','groupPlots={create','layoutSolver.solve'])assert(infra.includes(token),`Core UI contract missing ${token}`);
const presentation=read('src/core/scientific/plot-presentation-runtime.js');
assert(presentation.includes("placement='top'")&&presentation.includes("requested==='auto'"),'Shared scientific legend auto-placement must prefer top.');
assert(presentation.includes("['top','bottom','right','left']"),'Shared scientific legend must support all Core placements.');
assert(infra.includes('dataset.dkdsTableTone')&&infra.includes('dataset.dkdsTableEmphasis'),'TableSurface must own semantic tone/emphasis');

const chart=read('src/core/scientific/chart-runtime.js');
for(const token of ['normalizedLegendData','compactLegendLabel','smartLegendLayout','normalizeConfig'])assert(chart.includes(token),`Chart runtime missing ${token}`);
assert(chart.includes('Math.ceil(metrics.reserve)+40'),'bottom scientific legend must reserve x-axis-title clearance.');

const kernel=read('src/generated/runtime/plugin-kernel.js');
assert(kernel.includes("const API_VERSION = '1.18.0'"));
for(const token of ['history: Object.freeze','series: infrastructureScope?.series','legends: infrastructureScope?.legends','groupPlots: infrastructureScope?.groupPlots','tooltips: infrastructureScope?.tooltips',"name:'DK Data Studio Design System'","version:'1.18'"])assert(kernel.includes(token),`Plugin API missing ${token}`);

const resonance=read('src/plugins/resonance-workbench/feature-runtime.js');
const resonanceMainPlot=read('src/plugins/resonance-workbench/feature-main-plot-runtime.js');
assert(resonanceMainPlot.includes("legend:false,margin:{top:62"),'Resonance main-plot owner must declare that its domain-owned legend suppresses the generic Core legend');
assert(!resonance.includes('reswin-group-legend'),'Resonance must not own a duplicate group legend');

const devtools=read('src/core/plugins/devtools.js');
for(const token of ['Plugin DevTools','Surface','布局','Series','History','Boundary','DKDSUI?.diagnostics','core.project-history'])assert(devtools.includes(token),`Plugin DevTools missing ${token}`);
const modern=readCoreCss(root);
assert(modern.includes('Modern shell owns the default control palette'),'Modern theme must provide a generic button palette rather than plugin-by-plugin dark overrides');
assert(modern.includes('.dkds-plugin-devtools-window'),'App-native Plugin DevTools must be styled by the Design System');

const types=read('sdk/plugin-api.d.ts');
for(const token of ["readonly apiVersion:'1.18.0'",'DKDSSeriesRegistry','DKDSLegendGroup','DKDSActiveLayoutSolver','DKDSGroupPlot','DKDSTooltipRuntime','DKDSProjectHistoryRuntime','DKDSDesignSystem'])assert(types.includes(token),`SDK types missing ${token}`);
const schema=json('sdk/plugin-manifest.schema.json');
for(const req of ['history','ui.series','ui.legend-groups','ui.group-plots','ui.tooltips','ui.design-system'])assert(schema.properties.requiresCore.items.enum.includes(req),`Manifest schema missing ${req}`);
console.log('SDK 1.18 Core UI Contract Completion retained');
