'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');

const read=file=>fs.readFileSync(file,'utf8');
const has=(text,token,message)=>assert(text.includes(token),message||`missing ${token}`);

const exampleDir=path.join('examples','sdk149-reference-workbench');
const exampleFiles=fs.readdirSync(exampleDir);
assert(!exampleFiles.some(name=>name.toLowerCase().endsWith('.css')),'SDK reference plugin must not ship private CSS.');
const manifest=JSON.parse(read(path.join(exampleDir,'plugin.json')));
assert(!manifest.styles?.length,'SDK reference plugin manifest must not declare private styles.');
const pluginSource=read(path.join(exampleDir,'plugin.js'));
assert(!/resonance|respar|reswin/i.test(pluginSource),'SDK reference plugin must not copy Resonance-private names/classes.');
has(pluginSource,"ctx.ui.scientificWorkbench.create(root",'reference plugin must use public ScientificWorkbench API');
has(pluginSource,"profile:'accepted-scientific-v1'",'reference plugin must select the accepted public profile');
for(const template of ["template:'analysis-main'","template:'data-control'","template:'inspector'","template:'plot-group'"])has(pluginSource,template,`reference plugin missing ${template}`);
has(pluginSource,"tools:primaryTools,legend:primaryLegend",'reference plugin must exercise the public main-tools and legend slots');

const validate=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js','validate',exampleDir],{encoding:'utf8'});
assert.strictEqual(validate.status,0,`SDK reference plugin validation failed:\n${validate.stdout}\n${validate.stderr}`);
has(validate.stdout+validate.stderr,'DKDS SDK validation OK','reference plugin validator did not report success');

const core=read('src/core/ui/modules/composition/scientific.js');
const units=[read('src/core/ui/modules/composition/unit-templates.js'),read('src/core/ui/modules/composition/unit-template-presets.js'),read('src/core/ui/modules/composition/unit-template-foundation.js'),read('src/core/ui/modules/composition/unit-template-scientific.js')].join('\n');
const unitSpec=require('../src/core/ui/modules/composition/unit-template-spec');
has(core,"const REFERENCE_PROFILE='accepted-scientific-v1'");
assert(core.includes('this.scope.unitTemplates')&&core.includes('acceptedScientificV1.primary')&&core.includes('acceptedScientificV1.prime'),'accepted profile must delegate to Unit Templates');
assert(!/resonance|respar|reswin/i.test(core),'Core reference profile must be domain-blind and must not special-case Resonance.');
assert.deepStrictEqual(unitSpec.BASE_METRICS.acceptedScientific,{leftWidthPx:280,leftMinPx:230,canvasLeftWidthPx:360,canvasRightWidthPx:390,canvasBottomHeightPx:360,dataControlInsetPx:12,panelBodyInsetPx:10,groupGapPx:12,mainChromeHeightPx:34,mainChromeLeftPx:82,mainChromeRightPx:18,mainChromeTopPx:8,inspectorWidthPx:390,inspectorHeightPx:560,groupWidthPx:880,groupHeightPx:620});
for(const token of ["variant:'accepted-main-area'","variant:'accepted-main-workspace'","variant:'accepted-plot-wrap'","variant:'accepted-main-header'","variant:'accepted-main'","variant:'accepted-scientific-data-control'","variant:'accepted-scientific-inspector'","variant:'accepted-scientific'"])has(units,token,`Unit reference composition missing ${token}`);
has(units,"id:'group-columns',menu:true",'Unit PlotGroup reference header must provide the accepted column menu');
has(units,"label:()=>`每行：${String(group?.getAppliedColumns?.()",'Unit PlotGroup columns menu must report effective columns');
has(units,"label:value==='auto'?'自动排列':`每行 ${value} 个子图`",'Unit PlotGroup columns wording drifted');
has(units,"width:BASE_METRICS.acceptedScientific.groupWidthPx,height:BASE_METRICS.acceptedScientific.groupHeightPx",'Unit group bounds must use accepted metrics');
has(units,"width:BASE_METRICS.acceptedScientific.inspectorWidthPx,height:BASE_METRICS.acceptedScientific.inspectorHeightPx",'Unit inspector bounds must use accepted metrics');


const resonanceView=read('src/plugins/resonance-workbench/view-components.js'),resonanceUnits=read('src/plugins/resonance-workbench/unit-presentation.js');
has(resonanceUnits,"leftWidth:280,leftMin:230,canvasLeftWidth:360,canvasRightWidth:390,canvasBottomHeight:360",'accepted Resonance workspace geometry changed');
for(const token of [
  "className:'respar-main-area'","className:'respar-main-workspace'","className:'respar-plot-wrap'",
  "className:'respar-main-plot-header'",'respar-main-tools dkds-toolbar dkds-floating-surface dkds-integrated-action-group',
  'respar-main-legend dkds-scroll-x-compact dkds-legend-strip',"className:'respar-status-row'",
  'respar-floating-header dkds-portable-header dkds-surface-header','resparGroupColsMenuHost',
  "resparCollapse='group'","resparClose='group'","resparClose='inspect'"
])has(resonanceUnits,token,`accepted Resonance Unit template missing ${token}`);
has(resonanceView,"ctx.modules.require('unit-presentation')",'Resonance behavior layer must delegate accepted geometry to Unit presentation.');

const resonanceCss=read('src/plugins/resonance-workbench/plugin.css');
const profileCss=read('src/styles/structure/plugin-workspace.css');
const cssPairs=[
  ['#resonanceDedicatedPage .respar-left-panel{min-width:0;overflow:auto;padding:12px}', '.dkds-scientific-reference-data-control{min-width:0;overflow:auto;padding:12px}'],
  ['#resonanceDedicatedPage .respar-left-panel>section{padding:10px;margin:0 0 8px;}', '.dkds-scientific-reference-data-control>section{padding:10px;margin:0 0 8px}'],
  ['#resonanceDedicatedPage .respar-main-area{position:relative;min-width:0;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto}', '.dkds-scientific-reference-main-area{position:relative;min-width:0;min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto;width:100%;height:100%}'],
  ['#resonanceDedicatedPage .respar-main-workspace{position:relative;min-width:0;min-height:0;display:grid;grid-template-columns:minmax(0,1fr);height:100%}', '.dkds-scientific-reference-main-workspace{position:relative;min-width:0;min-height:0;display:grid;grid-template-columns:minmax(0,1fr);height:100%}'],
  ['#resonanceDedicatedPage .respar-plot-wrap{position:relative;min-width:0;min-height:0;overflow:hidden}', '.dkds-scientific-reference-main-plot-wrap{position:relative;min-width:0;min-height:0;overflow:hidden}'],
  ['#resonanceDedicatedPage .respar-main-plot-header{--respar-main-chrome-height:34px;position:absolute;left:82px;right:18px;top:8px;z-index:42;display:flex;align-items:center;gap:8px;min-width:0;pointer-events:none}', '.dkds-scientific-reference-main-plot-header{--dkds-scientific-reference-main-chrome-height:34px;position:absolute;left:82px;right:18px;top:8px;z-index:42;display:flex;align-items:center;gap:8px;min-width:0;pointer-events:none}'],
  ['#resonanceDedicatedPage .respar-main-tools{flex:0 0 auto;height:var(--respar-main-chrome-height);min-height:var(--respar-main-chrome-height)}', '.dkds-scientific-reference-main-tools{flex:0 0 auto;height:var(--dkds-scientific-reference-main-chrome-height);min-height:var(--dkds-scientific-reference-main-chrome-height)}'],
  ['#resonanceDedicatedPage .respar-main-legend{min-width:0;flex:1;height:var(--respar-main-chrome-height);box-sizing:border-box;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;padding:3px 7px}', '.dkds-scientific-reference-main-legend{min-width:0;flex:1;height:var(--dkds-scientific-reference-main-chrome-height);box-sizing:border-box;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;padding:3px 7px}'],
  ['#resonanceDedicatedPage .respar-status-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:38px;padding:4px 8px}', '.dkds-scientific-reference-status-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:38px;padding:4px 8px}'],
  ['#resonanceDedicatedPage .respar-floating-panel{position:absolute;z-index:160;resize:both;min-width:320px;min-height:220px;display:grid;grid-template-rows:auto minmax(0,1fr)}', '.dkds-scientific-reference-panel{--dkds-portable-base-min-width:320px;--dkds-portable-base-min-height:220px;--dkds-portable-floating-position:absolute;--dkds-portable-floating-resize:both;z-index:160;display:grid;grid-template-rows:auto minmax(0,1fr)}'],
  ['#resonanceDedicatedPage .respar-floating-header{display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none}', '.dkds-scientific-reference-header{display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none}'],
  ['#resonanceDedicatedPage .respar-floating-header>div{display:flex;gap:5px}', '.dkds-scientific-reference-header-actions{display:flex;gap:5px}'],
  ['#resonanceDedicatedPage .respar-floating-body{min-height:0;overflow:auto;padding:10px}', '.dkds-scientific-reference-body{min-height:0;overflow:auto;padding:10px}'],
  ['#resonanceDedicatedPage .respar-group-context{margin-left:6px}', '.dkds-scientific-reference-meta{margin-left:6px}'],
  ['#resonanceDedicatedPage .reswin-group-card{min-width:0;display:grid;grid-template-rows:auto auto;align-content:start}', '.dkds-scientific-reference-group-card{min-width:0;display:grid;grid-template-rows:auto auto;align-content:start}'],
  ['#resonanceDedicatedPage .reswin-group-plot{width:100%;min-height:0}', '.dkds-scientific-reference-group-plot{width:100%;min-height:0}'],
  ['#resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-floating{min-width:360px;min-height:280px;resize:none}', '.dkds-scientific-reference-group-card.dkds-portable-view.is-floating{--dkds-portable-floating-min-width:360px;--dkds-portable-floating-min-height:280px;--dkds-portable-floating-resize:none}'],
  ['#resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-docked{min-height:300px}', '.dkds-scientific-reference-group-card.dkds-portable-view.is-docked{--dkds-portable-docked-min-height:300px}'],
  ['#resonanceDedicatedPage .reswin-group-card.dkds-portable-view.is-global-floating{min-width:380px;min-height:300px;resize:none}', '.dkds-scientific-reference-group-card.dkds-portable-view.is-global-floating{--dkds-portable-floating-min-width:380px;--dkds-portable-floating-min-height:300px;--dkds-portable-floating-resize:none}']
];
for(const [accepted,reference] of cssPairs){has(resonanceCss,accepted,`accepted Resonance CSS drifted: ${accepted}`);has(profileCss,reference,`public SDK reference CSS missing parity rule: ${reference}`);}
assert(resonanceUnits.includes("variant:'accepted-group-grid'"),'Production Resonance group grid must select the public accepted-group-grid Unit variant.');
assert(!/\.reswin-group-grid[^{}]*\{[^}]*--dkds-grid-(?:gap|align-items|auto-rows|columns)\s*:/s.test(resonanceCss),'Production Resonance CSS must not duplicate Core/Unit managed group-grid tokens.');
has(profileCss,'.dkds-scientific-reference-group-grid{--dkds-grid-gap:12px;--dkds-grid-align-items:start;width:100%}','Public accepted-scientific-v1 profile must retain the shared 12 px/start group-grid default consumed through the Unit variant.');

has(resonanceCss,'@media(max-width:1050px){#resonanceDedicatedPage .respar-primary{grid-template-columns:240px minmax(0,1fr)}#resonanceDedicatedPage .respar-main-plot-header{left:72px;right:10px}', 'accepted 1050px header geometry changed');
has(profileCss,'@media(max-width:1050px){.dkds-plugin-workspace[data-dkds-scientific-profile="accepted-scientific-v1"] .dkds-scientific-reference-main-plot-header{left:72px;right:10px}}','public SDK reference missing accepted 1050px header geometry');
has(resonanceCss,'@media(max-width:980px){.respar-main-plot-header{left:6px;right:6px;max-width:none;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none}', 'accepted compact header geometry changed');
has(profileCss,'@media(max-width:980px){.dkds-plugin-workspace[data-dkds-scientific-profile="accepted-scientific-v1"] .dkds-scientific-reference-main-plot-header{left:6px;right:6px;max-width:none;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scrollbar-width:none}', 'public SDK reference missing accepted compact header geometry');

// Inspector must not acquire an empty action-host: Unit Template creates one only for declared actions.
assert(units.includes("actionHost:Array.isArray(spec.headerActions)&&spec.headerActions.length"),'accepted inspector action host must remain conditional');

console.log('SDK 1.49 non-domain reference-plugin parity PASS');
