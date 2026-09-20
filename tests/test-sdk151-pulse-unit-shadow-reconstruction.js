'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION,UNIT_CONTRACTS}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const example='examples/sdk151-unit-pulse-shadow';
const source=fs.readFileSync(path.join(example,'plugin.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(example,'parity.json'),'utf8'));
const nativeViews=fs.readFileSync('src/plugins/pulse-analysis/unit-presentation.js','utf8');
const nativeRuntime=fs.readFileSync('src/plugins/pulse-analysis/feature-runtime.js','utf8');
const nativeService=fs.readFileSync('src/plugins/pulse-analysis/analysis-service.js','utf8');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['pulse-analysis'];
const dataCenterBlueprint=NATIVE_PLUGIN_BLUEPRINTS['data-center'];

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Pulse reconstruction must refine the existing 41-Unit contract, not add a Pulse-specific Unit.');
assert(UNIT_CATALOG.plotView.variants.includes('prime-contained'),'PlotView must publish nested PRIME position delegation.');
assert(UNIT_CONTRACTS.splitPane.responsive.includes('reflowBelow'),'SplitPane contract must publish responsive reflow.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY);
assert.strictEqual(parity.productionReplaced,false);
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY);
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`Pulse shadow ${layer} parity is not closed: ${row.status}`);
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[]);
assert.deepStrictEqual(parity.unitContract.filledVariants,['prime:fixed-titleless-adopt']);

assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'Pulse Unit shadow must not ship CSS.');
assert(source.includes('ctx.ui.unitTemplates'));
assert(!/scientificWorkbench|accepted-scientific-v1/.test(source),'Pulse shadow must prove free Unit composition.');
assert(!/\.className\s*=|\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'Pulse shadow must not establish a private visual/style owner.');
for(const token of ['pulse-analysis-body','pulse-batch-workspace','pulse-control-grid','pulse-results-split','pulse-results-grid','pulse-raw-card','pulse-result-card','pulse-file-list','pulse-compare-actions'])assert(!source.includes(token),`Pulse shadow copied native private visual token: ${token}`);

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.panel.create','units.header.create','units.toolbar.create','units.action.create','units.field.create','units.check.create','units.chip.create','units.note.create','units.metric.create','units.summary.create','units.emptyState.create','units.list.create','units.list.item','units.table.mount','units.prime.build','units.plotView.adopt','units.scientificPlot.create','units.legend.create','units.menu.create'])assert(source.includes(call),`Pulse shadow missing real Unit composition call: ${call}`);
assert(source.includes("variant:'fixed-titleless'")&&source.includes("presentationPurpose:'parameters'")&&source.includes('existingNode:controls')&&!source.includes("title:'脉冲文件与提取设置'"),'Pulse shadow parameter PRIME must follow the hard titleless/headerless parameter contract.');
assert(!source.includes("variant:'prime-contained'")&&!source.includes("positionOwner:'prime'"),'Pulse raw diagnostic must not create a second PRIME position owner.');
assert(source.includes("variant:'complete'"),'result PlotViews must retain the complete position/export contract.');
for(const geometry of ["width:'min(1840px,100%)'","width:'174px'"])assert(source.includes(geometry),`Pulse shadow missing accepted native geometry: ${geometry}`);
assert(source.includes("detailGeometry:{contentMinHeightPx:360,contentMaxHeightPx:360}"),'Pulse raw diagnostic must express its intrinsic height through PlotView Unit geometry.');
assert(source.includes("variant:'two-card-grid'")&&source.includes('responsiveTarget:main')&&source.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Pulse shadow result columns must use public Unit Layout responsive geometry measured from PRIMARY.');
assert(source.includes("detailGeometry:{contentMinHeightPx:320,contentMaxHeightPx:320}"),'Pulse shadow result PlotViews must use the public Unit PlotView detail-geometry contract instead of private min-height styling.');
assert(source.includes("stateVersion:'pulse-unit-shadow-results-v5'")&&source.includes("stateVersion:'pulse-unit-shadow-flow-v4'"),'Pulse shadow must teach current result/raw home-state namespaces without a SplitPane persistence namespace.');

const resultPlotCalls=[...source.matchAll(/resultPlot\('/g)].length;
assert.strictEqual(resultPlotCalls,2,'Pulse shadow must instantiate both result PlotViews.');
assert(source.includes("units.plotView.adopt('pulse-shadow-raw'"),'Pulse shadow must reconstruct the raw diagnostic PlotView.');
for(const title of parity.plotTitles){assert(source.includes(title),`Pulse shadow missing plot title: ${title}`);assert(nativeViews.includes(title),`plot title is not grounded in native Pulse: ${title}`);}
for(const [action,nativeMethod] of Object.entries(parity.functionMap)){assert(source.includes(nativeMethod),`shadow action ${action} is not mapped to native boundary ${nativeMethod}`);assert(nativeService.includes(nativeMethod)||nativeRuntime.includes(nativeMethod),`native Pulse no longer exposes ${nativeMethod}`);}

const rawRegion=blueprint.regions.find(row=>row.id==='raw-plot');
const resultRegion=blueprint.regions.find(row=>row.id==='result-plots');
assert(rawRegion&&rawRegion.variant==='complete','Pulse blueprint must encode raw diagnostic as a complete PlotView in PRIMARY flow.');
assert(resultRegion&&resultRegion.variant==='complete','Pulse result plots must remain complete PlotViews.');
assert(dataCenterBlueprint.regions.some(row=>row.id==='chart'&&row.variant==='prime-contained'),'the same generic nested PlotView contract must cover Data Center preview rather than a Pulse-only exception.');
assert(NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS['pulse-analysis'].some(row=>row.match==='pulse-raw-card'&&row.unit==='plotView'&&row.variant==='complete'),'Pulse geometry blueprint must agree that raw diagnostic is a complete PlotView in PRIMARY flow.');

const scientific=fs.readFileSync('src/core/ui/modules/composition/unit-template-scientific.js','utf8');
const behavior=fs.readFileSync('src/core/ui/modules/composition/unit-template-behavior.js','utf8');
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
assert(scientific.includes("variant==='prime-contained'")&&scientific.includes("positionOwner:'prime'")&&scientific.includes("portable:false"),'Runtime must enforce prime-contained delegated position ownership.');
assert(scientific.includes("headerMode=spec.header===false||spec.header==='none'?'none':hasAcceptedExistingChrome?'adopt':'standard'"),'canonical-header existing-node PRIME must adopt its already complete header.');
assert(behavior.includes('reflowBelow')&&behavior.includes("dkdsUnitSplitReflow='true'")&&behavior.includes("set(handle,'display','none')"),'SplitPane Runtime must perform Core-owned responsive reflow.');
assert(dts.includes("DKDSUnitPlotViewVariant='complete'|'prime-contained'"));
assert(dts.includes("reflowBelow?:DKDSUnitLayoutBreakpoint"));

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.51.12 Pulse Unit-only shadow reconstruction seven-layer parity PASS');
