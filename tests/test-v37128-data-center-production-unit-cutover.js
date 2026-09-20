'use strict';
const assert=require('assert');
const fs=require('fs');
const crypto=require('crypto');
const read=file=>fs.readFileSync(file,'utf8');
const manifest=JSON.parse(read('src/plugins/data-center/plugin.json'));
const units=read('src/plugins/data-center/unit-presentation.js');
const adapter=read('src/plugins/data-center/shared-views.js');
const feature=read('src/plugins/data-center/feature-runtime.js');
const parity=JSON.parse(read('examples/sdk151-unit-data-center-shadow/parity.json'));
const {UNIT_CATALOG,UNIT_TEMPLATE_SPEC_VERSION}=require('../src/core/ui/modules/composition/unit-template-spec');

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.strictEqual(Object.keys(UNIT_CATALOG).length,41,'Data Center production cutover must not add a plugin-specific Unit.');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(manifest.version,'1.15.23'),'Data Center production Unit cutover requires plugin 1.15.23+.');
assert((manifest.requiresCore||[]).includes('ui.unit-templates')&&(manifest.capabilities||[]).includes('ui.unit-templates'));
assert((manifest.scripts||[]).indexOf('unit-presentation.js')>=0&&(manifest.scripts||[]).indexOf('unit-presentation.js')<(manifest.scripts||[]).indexOf('shared-views.js'),'Unit production presentation must load before its thin adapter.');
assert.strictEqual(manifest.platformPresentation?.desktop?.mode,'shared');
assert.strictEqual(manifest.platformPresentation?.mobile?.mode,'custom');
assert.deepStrictEqual(manifest.platformPresentation?.mobile?.scripts||[],[],'obsolete Mobile presentation runtime must stay removed.');
assert((manifest.platformPresentation?.mobile?.styles||[]).includes('mobile.css'),'accepted plugin-specific responsive CSS must remain available on Mobile.');
assert(!fs.existsSync('src/plugins/data-center/mobile-presentation.js'),'production cutover must remove the dead Mobile-only presentation source.');

for(const call of ['units.pageHeader.create','units.page.create','units.workspace.create','units.layout.create','units.panel.detached','units.panel.create','units.header.create','units.action.create','units.field.create','units.list.create','units.table.bind','units.prime.build','units.plotView.adopt','units.scientificPlot.create','units.parameterForm.mount','units.chip.create']){
  assert(units.includes(call),`production Data Center Unit composition missing ${call}`);
}
assert(units.includes("variant:'fixed-titleless'")&&units.includes("presentationRole:'data-control'")&&units.includes("placements:['left']"),'data-control PRIME must remain titleless/fixed and expose no placement chooser.');
assert(units.includes("presentationRole:'data-primary'")&&units.includes("primaryScroll:'auto'"),'PRIMARY must remain the scrollable data workspace.');
assert(units.includes("id:'chart-preview'")&&units.includes("presentationRole:'scientific-secondary'")&&units.includes("variant:'prime-contained'")&&units.includes("positionOwner:'prime'"),'chart preview must remain PRIME-owned scientific-secondary presentation.');
assert(units.includes("Array.from")===false,'production presentation must not synthesize shadow/demo rows.');

for(const id of ['dcArtifactCount','dcAssignmentFilter','dcLineageFilter','dcFieldFilter','dcMultiSelectBtn','dcSelectAllBtn','dcInvertSelectionBtn','dcClearSelectionBtn','dcArtifactList','dcActiveName','dcActiveMeta','dcDataActionsBtn','dcTablePreview','dcFormulaPane','dcApplyFormula','dcFormulaParams','dcFormulaRefs','dcWorkflowPane','dcSaveRecipe','dcRecipeName','dcSavedRecipe','dcLoadRecipe','dcStepType','dcProviderSelect','dcAddStep','dcWorkflowSteps','dcWorkflowStatus','dcProvenancePane','dcCopyProvenance','dcProvenanceList','dcChartProvider','dcPlotViewActions','dcChartParams','dcChart']) assert(units.includes(id),`accepted Data Center anatomy missing ${id}`);
for(const cls of ['data-center-body','dc-card dc-artifact-pane','dc-section-head','dc-filter-stack','dc-selection-tools','dc-artifact-list','dc-main','dc-card dc-source-preview','dc-source-actions','dc-table-preview','dc-card dc-tool-pane','dc-formula-refs','dc-workflow-steps','dc-provenance-list','dc-card dc-chart-pane','dc-chart-toolbar','dc-chart-params','dc-chart']) assert(units.includes(cls),`accepted plugin geometry hook missing ${cls}`);

assert(adapter.includes("DKDSPluginModules.get('builtin.data-center','unit-presentation')")&&adapter.includes('presentation.mount(ctx,page,controller,handlers)'),'shared-views must be a thin behavior-to-Unit adapter only.');
for(const forbidden of ['ctx.ui.plotViews.bind','workbench.registerPrime','<button class="dc-ref-chip','<table class="dc-preview-table','ctx.parameters.render(']) assert(!feature.includes(forbidden),`feature runtime retained presentation ownership: ${forbidden}`);
for(const method of ['presentation.showPreviewTable','presentation.showPreviewEmpty','presentation.showPreviewJson','presentation.renderFormulaRefs','presentation.mountParameterForm','presentation.workbench']) assert(feature.includes(method),`feature runtime must delegate presentation responsibility through ${method}`);
assert.strictEqual(parity.productionReplaced,true,'shadow evidence must record the completed production cutover.');
assert(parity.cutover?.status?.includes('production-unit')&&parity.cutover?.domainOwnerPreserved===true,'parity dossier must record production Unit cutover without domain replacement.');

// Responsive presentation CSS is intentionally contract-tested rather than SHA-frozen;
// preserving a whole-file hash would block legitimate Unit-owned mobile layout fixes.
const mobileCss=read('src/plugins/data-center/mobile.css');
assert(mobileCss.includes('.dc-main')&&mobileCss.includes('--dc-main-columns')&&mobileCss.includes('--dc-main-areas'),'Data Center accepted responsive layout contract must remain explicit.');
for(const [rel,expected] of [['controller.js','8b63f932cd97c6657e03b671fd6239de82f162a9b7b0d08942cb9147575aff8f'],['artifact-selection.js','92ee60f53de971a91bdbdd07fb2fbe2bd159300eb19757172279946f4883f6a8'],['command-runtime.js','bb3a89ded0c2997ccba4a2b881910fb567addb7302c3a2e2a495a80fff81d795']]){
  const actual=crypto.createHash('sha256').update(fs.readFileSync(`src/plugins/data-center/${rel}`)).digest('hex');
  assert.strictEqual(actual,expected,`Data Center accepted non-presentation owner changed during cutover: ${rel}`);
}
const ownerAudit=require('../tools/quality/unit-runtime-style-ownership').audit();
assert.strictEqual(ownerAudit.violations.filter(row=>row.plugin==='data-center').length,0,'Data Center presentation geometry must remain single-owner across Unit runtime and authored CSS.');
console.log('v3.71.28 Data Center production Unit presentation cutover PASS');
