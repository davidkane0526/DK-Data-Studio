'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const unitSpec=read('src/core/ui/modules/composition/unit-template-spec.js');
const unitFoundation=read('src/core/ui/modules/composition/unit-template-foundation.js');
const unitPresentation=read('src/plugins/pulse-analysis/unit-presentation.js');
const sharedViews=read('src/plugins/pulse-analysis/shared-views.js');
const feature=read('src/plugins/pulse-analysis/feature-runtime.js');
const manifest=json('src/plugins/pulse-analysis/plugin.json');
const pluginEntry=read('src/plugins/pulse-analysis/plugin.js');
const dts=read('sdk/plugin-api.d.ts');

assert(unitSpec.includes("UNIT_TEMPLATE_SPEC_VERSION='2.5.38'"),'Pulse production cutover must use Unit Templates 2.5.38.');
const spec=require(path.join(root,'src/core/ui/modules/composition/unit-template-spec.js'));
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'Pulse source parity must not invent a 42nd Unit.');
assert(manifest.requiresCore?.includes('ui.unit-templates'),'Pulse production manifest must explicitly require Unit Templates.');
for(const scripts of [manifest.scripts,manifest.window?.scripts]){
  const u=scripts.indexOf('unit-presentation.js'),v=scripts.indexOf('shared-views.js');
  assert(u>=0&&v>=0&&u<v,'Pulse Unit presentation must load before its thin shared-view delegator in every host.');
}
assert(pluginEntry.includes('\"unit-presentation.js\"')&&pluginEntry.includes('\"shared-views.js\"'),'Pulse inlined manifest must stay synchronized with plugin.json.');
assert(!sharedViews.includes('PAGE_HTML')&&!sharedViews.includes('workspaceSurface.create')&&sharedViews.includes("get('builtin.pulse-analysis','unit-presentation')"),'Pulse shared-views must be a thin compatibility/delegation layer, not a second presentation owner.');

for(const token of ['ctx.ui.unitTemplates','units.workspace.create','units.pageHeader.create','units.prime.build','units.plotView.adopt','units.scientificPlot.create','units.table.bind','workbench.compose'])
  assert(unitPresentation.includes(token),`Pulse production Unit reconstruction missing ${token}.`);
assert(unitPresentation.includes("variant:'fixed-titleless'")&&unitPresentation.includes("presentationRole:'data-control'")&&unitPresentation.includes("presentationPurpose:'parameters'")&&unitPresentation.includes("existingNode:controls"),'Pulse parameter PRIME must be titleless and Unit-owned while preserving the accepted content node.');
assert(unitPresentation.includes("variant:'plot-minimal'")&&unitPresentation.includes("actionsClassName:'pulse-plot-actions'"),'Pulse accepted PlotView header anatomy must be expressed by a reusable Unit Header variant rather than raw HTML.');
assert(unitPresentation.includes("controlOnly:true"),'Pulse compound range controls must use Unit Field control-only anatomy instead of raw plugin controls.');

// Accepted post-attach Pulse anatomy is frozen independently from Unit implementation details.
// These ids are the feature/controller interaction contract; these private classes are the
// stable identity hooks used by the controller/test boundary. Result geometry itself must
// stay in Unit recipes/detailGeometry rather than return to plugin-private CSS.
const acceptedIds=['pulseCheckAllBtn','pulseUncheckAllBtn','pulseRemoveFilesBtn','pulseFileList','pulseBatchFileSummary','pulseNoActiveFile','pulseActiveEditor','pulseActiveFileName','pulseActiveFileMeta','pulseSeriesLabel','pulseSegmentationMode','pulseTimeCol','pulseCurrentCol','pulseVoltageCol','pulseCycleSamples','pulseCycleOffsetSamples','pulseWriteStartSample','pulseWriteEndSample','pulseReadStartSample','pulseReadEndSample','pulseWriteDuration','pulseReadDuration','pulsePhaseOrder','pulseSampleInterval','pulseReadVoltageFallback','pulsePulseVoltageFallback','pulseBlockSamples','pulseReadPairMode','pulseWindowStart','pulseWindowEnd','pulseApplySettingsBtn','pulseSummary','pulseRawPlot','pulseResultScope','pulseComparedSummary','pulseReadPlot','pulsePulsePlot','pulseResultMeta','pulseCopyCsvBtn','pulseExportCsvBtn','pulseResultTable'];
for(const id of acceptedIds)assert(unitPresentation.includes(id),`Pulse Unit production anatomy dropped accepted id: ${id}`);
const acceptedPrivateClasses=['pulse-active-file-head','pulse-active-meta','pulse-active-path','pulse-analysis-body','pulse-analyze-cell','pulse-card','pulse-card-heading','pulse-compare-actions','pulse-compare-toolbar','pulse-compare-toolbar-card','pulse-compared-summary','pulse-config-card','pulse-control-grid','pulse-current-empty','pulse-current-file-actions','pulse-file-empty','pulse-file-list','pulse-file-manager-card','pulse-file-manager-heading','pulse-file-summary','pulse-file-toolbar','pulse-inline-range','pulse-label-edit','pulse-page-header','pulse-plot-actions','pulse-plot-heading','pulse-plot-surface','pulse-protocol-hint','pulse-raw-card','pulse-raw-plot','pulse-result-card','pulse-result-plot','pulse-result-table','pulse-results-grid','pulse-results-table-card','pulse-results-visual-pane','pulse-scope-action','pulse-summary','pulse-summary-grid','pulse-summary-placeholder','pulse-table-actions','pulse-table-heading','pulse-table-wrap'];
for(const className of acceptedPrivateClasses)assert(unitPresentation.includes(className),`Pulse Unit production anatomy dropped accepted private geometry hook: ${className}`);
assert(!unitPresentation.includes("variant:'prime-contained',positionOwner:'prime'")&&!unitPresentation.includes("id:'pulse-results-table-height-v3'"),'Pulse PRIMARY must not turn raw diagnostics or result/table flow into a movable PRIME/SplitPane.');
assert(unitPresentation.includes("createPlotCard(visual,{viewId:'raw'")&&unitPresentation.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Raw diagnostic must be the final complete PlotView in the same sequential PRIMARY visual flow.');
assert(unitPresentation.includes("variant:'two-card-grid'")&&unitPresentation.includes("responsiveTarget:primaryMain")&&unitPresentation.includes("maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}"),'Pulse result columns must be Unit Layout responsive geometry measured from the projected PRIMARY.');
assert(unitPresentation.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Pulse PlotViews must express intrinsic scientific content height through the public Unit detailGeometry contract.');
assert.strictEqual((unitPresentation.match(/renderOwner:'runtime'/g)||[]).length,1,'One generic createPlotCard path must declare runtime scientific rendering for all three Pulse plots.');
assert.strictEqual((unitPresentation.match(/createPlotCard\(resultGrid/g)||[]).length,2,'Pulse must create exactly two result PlotViews from the accepted result grid.');
assert.strictEqual((unitPresentation.match(/createPlotCard\(visual/g)||[]).length,1,'Pulse must create exactly one raw diagnostic PlotView as the final item of the PRIMARY visual flow.');
assert(!feature.includes('ctx.ui.plotViews.bind'),'Pulse feature runtime must not remain a second PlotView composition owner after Unit cutover.');
assert(!feature.includes('workbench.registerPrime'),'Pulse feature runtime must not remain a second PRIME composition owner after Unit cutover.');
assert(feature.includes('sharedViews?.attach?.(ctx,page)')&&feature.includes('presentation?.dispose?.()'),'Feature runtime must consume and dispose the Unit presentation through the existing controller/view boundary.');

const pulseCss=read('src/plugins/pulse-analysis/plugin.css');
const pulseMobileCss=read('src/plugins/pulse-analysis/mobile.css');
for(const selector of ['.pulse-results-split{','.pulse-results-grid{','.pulse-result-card{','.pulse-result-plot{','.pulse-results-table-card{','.pulse-table-wrap{']){
  assert(!pulseCss.includes(selector),`Pulse plugin CSS must not own Unit result-flow geometry: ${selector}`);
  assert(!pulseMobileCss.includes(selector),`Pulse Mobile CSS must not become a second Unit result-flow geometry owner: ${selector}`);
}
assert(!pulseCss.includes('min-height:720px'),'Pulse production CSS must not preserve the retired empty-result minimum height.');
assert(!pulseCss.includes('.pulse-control-grid{\n  padding:10px 11px 11px;\n  display:grid;'),'Pulse CSS must not duplicate form-grid geometry already owned by the Unit recipe.');
assert(unitSpec.includes("'plot-minimal'")&&unitFoundation.includes("'plot-minimal':'dkds-plot-view-head'"),'The source-faithful minimal PlotView header must be a generic Unit capability.');
assert(unitFoundation.includes('spec.actions!==false')&&unitFoundation.includes('if(actions)header.appendChild(actions)'),'Unit Header must support source-faithful omission of an unused action host.');
assert(unitFoundation.includes('controlOnly=spec.controlOnly===true')&&dts.includes('controlOnly?:boolean'),'Unit Field control-only anatomy must be implemented and exposed in the SDK contract.');
assert(dts.includes("'plot-minimal'")&&dts.includes("version:'2.5.38'"),'SDK types must expose the current Unit source-parity capabilities/version.');

console.log('v3.71.16 Pulse production Unit source-parity reconstruction PASS');
