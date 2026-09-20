'use strict';
const assert=require('assert');
const fs=require('fs');
const crypto=require('crypto');
const read=file=>fs.readFileSync(file,'utf8');
const manifest=JSON.parse(read('src/plugins/pulse-sampler-tool/plugin.json'));
const plugin=read('src/plugins/pulse-sampler-tool/plugin.js');
const units=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
const parity=JSON.parse(read('examples/sdk151-unit-pulse-sampler-shadow/parity.json'));
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION}=require('../src/core/ui/modules/composition/unit-template-spec');
assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Pulse Sampler production cutover must not add a Pulse-specific Unit.');
assert(Number(manifest.version.split('.').at(-1))>=19,'Pulse Sampler production Unit cutover must remain on the accepted 1.9.19+ line.');
assert((manifest.requiresCore||[]).includes('ui.unit-templates')&&(manifest.capabilities||[]).includes('ui.unit-templates'));
assert.deepStrictEqual(manifest.scripts.slice(0,4),['live-domain.js','domain-adapter.js','unit-presentation.js','plugin.js']);
assert.deepStrictEqual(manifest.styles,[],'legacy Pulse Sampler plugin.css must be detached from production runtime after Unit cutover.');
assert.strictEqual(manifest.platformPresentation?.desktop?.mode,'shared');
assert.strictEqual(manifest.platformPresentation?.mobile?.mode,'adaptive','Mobile must consume the same Unit composition through Presenter semantics.');
for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.panel.detached','units.panel.create','units.header.create','units.tabs.create','units.layout.create','units.layout.apply','units.field.create','units.action.create','units.table.mount','units.scientificPlot.create','units.prime.build'])assert(units.includes(call),`Pulse Sampler production Unit composition missing ${call}`);
for(const variant of ['stack-comfortable','form-grid-2','action-grid-4','segment-bar','analysis-control-grid','result-control-grid','result-grid-asymmetric','fixed-titleless'])assert(units.includes(`variant:'${variant}'`),`Pulse Sampler production composition missing accepted Unit recipe ${variant}`);
assert(units.includes("presentationRole:'data-control'")&&units.includes("presentationPurpose:'parameters'")&&units.includes("placements:['left']"),'parameter PRIME must remain fixed/titleless data-control.');
assert.strictEqual((units.match(/units\.scientificPlot\.create/g)||[]).length,2);
assert.strictEqual((units.match(/units\.table\.mount/g)||[]).length,3);
for(const forbidden of ['pulse-sampler-shell','ps-designer','ps-param-grid','ps-analysis-controls','ps-result-controls','ps-result-grid','ctx.ui.dom.html(shell'])assert(!plugin.includes(forbidden),`legacy production DOM hook survived cutover: ${forbidden}`);
for(const forbidden of ['function pulseGenerator','function concatSegments','function mergeChannels','function inferSampleStep','ctx.tasks.submit'])assert(!units.includes(forbidden),`presentation module duplicated production scientific/task owner: ${forbidden}`);
for(const token of ['function pulseGenerator','function concatSegments','function mergeChannels','function inferSampleStep',"ctx.tasks.submit('extract-steady-state'",'ctx.project.registerSlice',"LiveDomain.create({",'snapshot:liveSnapshot'])assert(plugin.includes(token),`production owner moved or disappeared during presentation-only cutover: ${token}`);
assert(plugin.includes("UnitPresentation.mount(ctx,page,{actions:liveDomain.actions,snapshot:liveSnapshot})"),'production Unit presentation must receive the existing live-domain action owner instead of creating another state/action path.');
assert.strictEqual(parity.productionReplaced,true);
assert.strictEqual(parity.cutover?.status,'production-unit-cutover-complete-visual-pending');
assert.strictEqual(parity.cutover?.frozen,false,'production Unit must not be frozen before Windows Electron + Mobile visual acceptance.');
assert.strictEqual(parity.cutover?.domainOwnerPreserved,true);assert.strictEqual(parity.cutover?.taskOwnerPreserved,true);assert.strictEqual(parity.cutover?.resultOwnerPreserved,true);
for(const [rel,expected] of [
 ['live-domain.js','a982b457b702b79d957f029cf2a403f9b180c5bd443f4172faf71f630f074d56'],
 ['domain-adapter.js','a7b7c038970dc10a3c530dd098167d03dc3796d1789792c7c1215bd4430e21ac'],
 ['steady-state-task.js','1132645c3509c04ec7ab11183cb6eebef9d5b678734a5b27700dcad27f5084d5']
]){
 const actual=crypto.createHash('sha256').update(fs.readFileSync(`src/plugins/pulse-sampler-tool/${rel}`)).digest('hex');
 assert.strictEqual(actual,expected,`Pulse Sampler non-presentation owner changed during Unit cutover: ${rel}`);
}
const ownerAudit=require('../tools/quality/unit-runtime-style-ownership').audit();
assert.strictEqual(ownerAudit.violations.filter(row=>row.plugin==='pulse-sampler-tool').length,0,'Pulse Sampler Unit production presentation must remain single-owner.');
console.log('v3.71.42 Pulse Sampler production Unit presentation cutover PASS');
