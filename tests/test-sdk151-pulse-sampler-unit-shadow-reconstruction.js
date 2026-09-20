'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const example='examples/sdk151-unit-pulse-sampler-shadow';
const source=fs.readFileSync(path.join(example,'plugin.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(example,'parity.json'),'utf8'));
const native=fs.readFileSync('src/plugins/pulse-sampler-tool/plugin.js','utf8')+'\n'+fs.readFileSync('src/plugins/pulse-sampler-tool/unit-presentation.js','utf8');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['pulse-sampler-tool'];

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Pulse Sampler shadow must use the existing 41 Units.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY);
assert.strictEqual(parity.productionReplaced,true,'Pulse Sampler shadow dossier must record the later accepted production Unit cutover.');
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY);
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`Pulse Sampler ${layer} parity not closed: ${row.status}`);
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[]);
assert.strictEqual(parity.unitContract.unitCount,41);
assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'Pulse Sampler Unit shadow must not ship private CSS.');
assert(source.includes('ctx.ui.unitTemplates'));
assert(source.includes("variant:'content',eyebrow:'PULSE DESIGNER'")&&source.includes("unit:'V'")&&source.includes("sizing:'fill'"),'Pulse Sampler shadow must exercise the same generic Header/Field/PRIME capabilities as production.');
assert(!source.includes("variant:'control-label-row'"),'Pulse Sampler shadow must not retain the obsolete label-row workaround.');

assert(!/\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'Pulse Sampler Unit shadow must not establish a private style owner.');
for(const token of ['pulse-sampler-shell','ps-designer','ps-param-grid','ps-analysis-controls','ps-result-controls','ps-result-grid','ps-segment-bar'])assert(!source.includes(`className:'${token}`),`Pulse Sampler shadow copied native private geometry hook: ${token}`);

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.panel.detached','units.panel.create','units.header.create','units.tabs.create','units.layout.create','units.layout.apply','units.field.create','units.action.create','units.table.mount','units.scientificPlot.create','units.prime.build'])assert(source.includes(call),`Pulse Sampler shadow missing Unit call: ${call}`);
for(const variant of ['stack-comfortable','form-grid-2','action-grid-4','segment-bar','analysis-control-grid','result-control-grid','result-grid-asymmetric'])assert(source.includes(`variant:'${variant}'`),`Pulse Sampler shadow missing reusable layout recipe ${variant}`);
assert(source.includes("variant:'fixed-titleless'")&&source.includes("presentationRole:'data-control'")&&source.includes("presentationPurpose:'parameters'")&&source.includes('existingNode:designer.element'),'Pulse Sampler parameter PRIME must be titleless and semantic.');
assert.strictEqual((source.match(/units\.scientificPlot\.create/g)||[]).length,2,'Pulse Sampler shadow must reconstruct waveform and result plots.');
assert.strictEqual((source.match(/units\.table\.mount/g)||[]).length,3,'Pulse Sampler shadow must reconstruct segment, waveform and result tables.');
for(const title of parity.plotTitles){assert(source.includes(title),`shadow missing plot title ${title}`);assert(native.includes(title),`native Pulse Sampler missing grounded plot title ${title}`);}
for(const [action,nativeBoundary] of Object.entries(parity.functionMap)){assert(source.includes(action),`shadow missing action ${action}`);assert(native.includes(nativeBoundary),`native Pulse Sampler no longer exposes boundary ${nativeBoundary}`);}
const regionIds=new Set((blueprint.regions||[]).map(row=>row.id));
for(const id of ['parameter-grid','analysis-controls','result-controls','result-grid','controls','plot','results'])assert(regionIds.has(id),`Pulse Sampler blueprint missing ${id}`);
const geometry=NATIVE_PLUGIN_GEOMETRY_BLUEPRINTS['pulse-sampler-tool']||[];
assert.deepStrictEqual(geometry,[],'After production Unit cutover Pulse Sampler must own no private plugin.css geometry blueprint.');
for(const variant of ['analysis-control-grid','result-control-grid','result-grid-asymmetric'])assert(native.includes(`variant:'${variant}'`),`Production Pulse Sampler Unit presentation must ground ${variant} directly after private CSS retirement.`);

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.51 Pulse Sampler Tool Unit-only shadow seven-layer parity PASS');
