'use strict';
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const read=rel=>fs.readFileSync(rel,'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
const example='examples/sdk151-unit-vth-shadow';
const source=read(path.join(example,'plugin.js'));
const parity=json(path.join(example,'parity.json'));
const manifest=json(path.join(example,'plugin.json'));
const native=read('src/plugins/transfer-vth-lab/plugin.js');
const nativeCss=read('src/plugins/transfer-vth-lab/plugin.css');
const nativeUnit=read('src/plugins/transfer-vth-lab/unit-presentation.js');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['transfer-vth-lab'];

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Vth shadow must reconstruct from the existing 41 Units, not create a Vth-specific Unit.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY);
assert.strictEqual(parity.productionReplaced,true,'Vth Unit reconstruction is now the accepted production presentation.');
assert.strictEqual(parity.productionCutoverVersion,'3.71.53','Vth production Unit cutover version must stay explicit.');
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[]);
assert.deepStrictEqual(parity.unitContract.filledVariants,[],'Vth must not invent a new Unit variant when the 41-Unit catalog is already expressive.');
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY);
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`Vth shadow ${layer} parity is not closed: ${row.status}`);

assert.deepStrictEqual(manifest.pluginDependencies,[{id:'com.dkds.transfer-vth-lab'}],'Vth shadow must name the existing production owner explicitly.');
assert(manifest.requiresCore.includes('ui.unit-templates')&&manifest.requiresCore.includes('ui.top-workspace')&&manifest.requiresCore.includes('services'),'Vth shadow must declare Unit/Templates, services and semantic TOP workspace dependencies.');
assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'Vth Unit shadow must ship no CSS.');
assert(source.includes('ctx.ui.unitTemplates'),'Vth shadow must use the public Unit facade.');
assert(!/\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'Vth shadow must not establish a private visual/style owner.');
assert(!/dkds-vth-|transfer-vth-lab-page/.test(source),'Vth shadow must not copy production private visual hooks.');
assert(!/isNativeClient|isMobile|matchMedia|window\.innerWidth/.test(source),'Vth shadow must not branch executable composition by platform.');

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.panel.create','units.panel.detached','units.header.create','units.toolbar.create','units.field.create','units.check.create','units.chip.create','units.note.create','units.metric.create','units.table.mount','units.prime.build','units.scientificPlot.create','units.splitPane.create'])assert(source.includes(call),`Vth shadow missing real Unit composition call: ${call}`);
for(const variant of ['stack-comfortable','fill-rows','metric-grid','plot-card-fill','plot-card-header','scroll-pane'])assert(source.includes(`variant:'${variant}'`),`Vth shadow missing reusable layout recipe ${variant}`);
assert(source.includes("variant:'fixed-titleless'")&&source.includes("presentationRole:'data-control'")&&source.includes("presentationPurpose:'parameters'")&&source.includes("placements:['left']"),'Vth data-control PRIME must be the fixed, titleless parameter/data-control surface used by the accepted production composition.');
assert(source.includes("presentationRole:'scientific-primary'")&&source.includes("primaryScroll:'contained'"),'Vth primary must preserve the contained scientific workspace contract.');
assert(source.includes("defaultSize:180")&&source.includes("min:140")&&source.includes("reserve:300")&&source.includes("reflowBelow:920")&&source.includes("resizeTarget:'second'"),'Vth Unit SplitPane must preserve the accepted bottom-results geometry and responsive reflow.');
assert.strictEqual((source.match(/units\.metric\.create/g)||[]).length,1,'Metric reconstruction should use one loop-backed Unit call, not private metric markup.');
for(const label of ['Vth','扫描段','R²','拟合点数','目标电流 / A','拟合下限 / A','拟合上限 / A','使用 |I|','对数显示','显示全部曲线'])assert(source.includes(label),`Vth shadow missing accepted visible label: ${label}`);

const controlRegion=blueprint.regions.find(row=>row.id==='controls');
assert(controlRegion&&controlRegion.unit==='prime'&&controlRegion.variant==='fixed-titleless','Vth authoring blueprint must reflect the source-faithful titleless data-control PRIME.');
assert.deepStrictEqual(controlRegion.placements,['left'],'Vth data-control is fixed-left in the current accepted production source.');
for(const id of ['data-center','pulse-analysis','pulse-sampler-tool','ter-analysis']){
  const row=NATIVE_PLUGIN_BLUEPRINTS[id].regions.find(region=>['objects','controls'].includes(region.id)&&region.role==='data-control');
  assert(row&&row.variant==='fixed-titleless',`${id} blueprint must not teach a generated titlebar for a production titleless data-control PRIME.`);
}

for(const [intent,liveAction] of Object.entries(parity.functionMap)){
  assert(source.includes(liveAction),`shadow intent ${intent} is not mapped to live-domain action ${liveAction}`);
}
assert(source.includes("ctx.services?.domain?.connect?.('com.dkds.transfer-vth-lab/live')"),'Vth shadow must connect through the dependency-gated production live-domain seam.');
assert(source.includes('syncLiveState')&&source.includes('numericDigest')&&source.includes('presentationDigest'),'Vth shadow must expose explicit live numeric/presentation parity evidence.');
for(const command of ['com.dkds.transfer-vth-lab.refresh','com.dkds.transfer-vth-lab.demo','com.dkds.transfer-vth-lab.fit-view','com.dkds.transfer-vth-lab.reset-window'])assert(native.includes(command),`production Vth no longer exposes expected command ${command}`);
for(const token of ['targetCurrent','lowCurrent','highCurrent','absoluteCurrent','logY','showAllCurves','selectedCurveId'])assert(native.includes(token),`production Vth no longer exposes expected state boundary ${token}`);

assert(native.includes("ctx.modules.require('unit-presentation')"),'Production Vth controller must delegate presentation to the reviewed Unit module.');
assert(nativeUnit.includes("units.prime.build")&&nativeUnit.includes("variant:'fixed-titleless'"),'Production Vth Unit presentation must preserve the titleless data-control PRIME.');
assert(nativeUnit.includes("units.splitPane.create")&&nativeUnit.includes("defaultSize:180")&&nativeUnit.includes("min:140")&&nativeUnit.includes("reserve:300")&&nativeUnit.includes("reflowBelow:920"),'Production Vth Unit presentation must preserve reviewed split geometry.');
assert.strictEqual(sha('src/plugins/transfer-vth-lab/live-domain.js'),'1ffa1fda16b3c4b710b325689bdb507e2b5b7155f34823d0d3949374fc4acf68','Vth live-domain owner helper changed unexpectedly.');
assert.strictEqual(sha('src/plugins/transfer-vth-lab/domain-adapter.js'),'bf8cb24e1180af7723fd67b31392b8c1aad8fc366813e624881c4ddcbf956cb7','Vth dependency-gated domain adapter changed unexpectedly.');
assert(!nativeCss.includes('@container vth-primary')&&!nativeCss.includes('.dkds-vth-results-splitter{display:none}'),'Retired Vth CSS must not preserve a private narrow-layout override that conflicts with the Unit SplitPane.');
assert.strictEqual(sha('src/plugins/transfer-vth-lab/analysis-runtime.js'),'236fd11a5490ab7745585033935a428059d654c9874cd21803a04141f2713b3d','Vth live-parity seam must not modify the production numerical runtime.');
assert.strictEqual(sha('src/plugins/transfer-vth-lab/vth-task.js'),'cc2230b56d9f0fad8f040d70dd50bc27b29585e4ec47c9cde9b1e65672246cb1','Vth live-parity seam must not modify the production task entry.');
assert(nativeCss.includes('--dkds-vth-results-height:180px')&&!nativeCss.includes('@container vth-primary'),'Retired Vth CSS may retain neutral historical tokens but must not own responsive breakpoint geometry after Unit cutover.');

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
assert.strictEqual(parity.remainingNonUnitGap,'None. Production presentation is cut over to the validated Unit composition while state, Task, algorithm and numerical-result ownership remain unchanged.');
console.log('SDK 1.51 Vth Unit production-cutover seven-layer parity PASS');
