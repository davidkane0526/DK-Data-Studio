'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS,VISUAL_PARITY}=require('../tools/sdk/native-blueprints');

const example='examples/sdk151-unit-ter-shadow';
const source=fs.readFileSync(path.join(example,'plugin.js'),'utf8');
const parity=JSON.parse(fs.readFileSync(path.join(example,'parity.json'),'utf8'));
const nativeViews=fs.readFileSync('src/plugins/ter-analysis/unit-presentation.js','utf8');
const nativeRuntime=fs.readFileSync('src/plugins/ter-analysis/feature-runtime.js','utf8');
const blueprint=NATIVE_PLUGIN_BLUEPRINTS['ter-analysis'];

const manifest=JSON.parse(fs.readFileSync(path.join(example,'plugin.json'),'utf8'));
assert(manifest.requiresCore.includes('services'),'TER live shadow must declare the existing services Core contract.');
assert.deepStrictEqual(manifest.pluginDependencies,[{id:'builtin.ter-analysis'}],'TER live shadow must declare the production owner as an explicit plugin dependency.');
assert(source.includes("ctx.services?.domain?.connect?.('builtin.ter-analysis/live')"),'TER live shadow must connect to the production domain adapter instead of constructing a second service.');
assert(source.includes('liveDomain.invoke(id,payload)'),'TER shadow actions must route through the production domain owner when connected.');
assert(source.includes('numericDigest(result)')&&source.includes('result?.terMaxByVg||[]')&&source.includes('result?.terMaxByVd||[]'),'TER live shadow must mirror authoritative numeric result state for parity inspection.');

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'real reconstruction must refine the existing 41-Unit contract, not create a 42nd Unit for TER.');
assert(UNIT_CATALOG.note.variants.includes('meta'),'Note Unit must expose standalone meta text discovered by TER reconstruction.');
assert.deepStrictEqual(blueprint.parity,VISUAL_PARITY,'TER blueprint must still target all seven parity layers.');
assert.strictEqual(parity.productionReplaced,false,'shadow reconstruction must never replace production TER.');
assert.deepStrictEqual(Object.keys(parity.layers),VISUAL_PARITY,'shadow parity file must cover the same seven dimensions as the native dossier.');
for(const [layer,row] of Object.entries(parity.layers))assert(/^pass/.test(row.status),`TER shadow ${layer} parity is not closed: ${row.status}`);
assert.deepStrictEqual(parity.unitContract.missingUnitTypes,[],'TER migration should not introduce a TER-specific Unit type.');
assert.deepStrictEqual(parity.unitContract.filledVariants,['note:meta'],'the only Unit contract fill discovered by the first TER shadow must remain explicit.');

assert(!fs.readdirSync(example).some(name=>name.endsWith('.css')),'TER Unit shadow must not ship CSS.');
assert(source.includes('ctx.ui.unitTemplates'),'TER shadow must use the public Unit facade.');
assert(!/scientificWorkbench|accepted-scientific-v1/.test(source),'TER shadow must prove free Unit composition rather than hiding behind a whole-workbench preset.');
assert(!/\.className\s*=|\.style\.|ctx\.ui\.styles\.|dom\.style\(|dom\.token\(/.test(source),'TER shadow must not establish a private visual/style owner.');
for(const token of ['ter-workspace-shell','ter-workspace-left','ter-workspace-main','ter-chart-grid','heatmap-square-card','ter-resistance-card','ter-card-title-row','ter-layout-controls','heatmap-display-controls'])assert(!source.includes(token),`TER shadow copied native private visual token: ${token}`);

for(const call of ['units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.layout.apply','units.panel.create','units.header.create','units.action.create','units.actionRow.create','units.field.create','units.check.create','units.note.create','units.summary.create','units.parameterForm.mount','units.table.mount','units.prime.build','units.plotGroup.create','plotGroup.adoptPlot','units.scientificPlot.create'])assert(source.includes(call),`TER shadow missing real Unit composition call: ${call}`);
assert(source.includes("variant:'meta'"),'TER shadow must consume the newly filled Note meta variant rather than writing .dkds-meta directly.');
assert(source.includes("'resistance-card'")&&source.includes("'card-title-row'")&&source.includes("'square-plot'"),'TER special plot anatomy must be expressed through published layout recipes.');
for(const geometry of ["minWidth:'118px',width:'135px'","minWidth:'105px',width:'112px'","width:'min(860px,100%)'","width:'min(760px,100%)'"])assert(source.includes(geometry),`TER shadow missing accepted native geometry: ${geometry}`);

const plotCalls=[...source.matchAll(/makePlot\(\{id:/g)].length;
assert.strictEqual(plotCalls,7,'TER shadow must reconstruct all seven native plot cards.');
for(const title of parity.plotTitles)assert(source.includes(title),`TER shadow missing plot title: ${title}`);
for(const title of parity.plotTitles){const stable=title.split(' · ')[0];assert(nativeViews.includes(stable)||nativeRuntime.includes(stable),`parity title not grounded in native TER: ${title}`);}

for(const [action,nativeMethod] of Object.entries(parity.functionMap)){
  assert(source.includes(nativeMethod),`shadow action ${action} is not mapped to native boundary ${nativeMethod}`);
}
for(const nativeMethod of ['autoParameters','calculate','applyDisplay','resetDisplay','setOnlyFullyVisible','exportLong','copyLong','exportMatrix','copyMatrix','setTransformSettings'])assert(nativeRuntime.includes(nativeMethod)||nativeViews.includes(nativeMethod),`native TER no longer exposes expected boundary ${nativeMethod}`);

const foundation=fs.readFileSync('src/core/ui/modules/composition/unit-template-foundation.js','utf8');
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
assert(foundation.includes("variant==='meta'?'dkds-meta':'dkds-note'"),'Note meta variant must delegate to the already accepted Core dkds-meta style owner.');
assert(dts.includes("DKDSUnitNoteVariant='normal'|'meta'|'warning'|'danger'"),'TypeScript surface must publish Note meta variant.');

for(const command of ['validate','test-runtime','test-layout']){
  const result=spawnSync(process.execPath,['sdk/tools/dkds-plugin.js',command,example],{encoding:'utf8',timeout:120000});
  assert.strictEqual(result.status,0,`${command} failed\n${result.stdout||''}\n${result.stderr||''}`);
}
console.log('SDK 1.51.5 TER Unit-only shadow + live domain parity PASS');
