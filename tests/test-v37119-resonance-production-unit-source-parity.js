'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=rel=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex');

const spec=require(path.join(root,'src/core/ui/modules/composition/unit-template-spec.js'));
const unit=read('src/plugins/resonance-workbench/unit-presentation.js');
const views=read('src/plugins/resonance-workbench/view-components.js');
const group=read('src/plugins/resonance-workbench/feature-group-runtime.js');
const manifest=json('src/plugins/resonance-workbench/plugin.json');
const pluginEntry=read('src/plugins/resonance-workbench/plugin.js');

assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38','Resonance production cutover must use the already-proven Unit Templates 2.5.38 contract.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG||{}).length,41,'Resonance source parity must not invent a 42nd Unit.');
for(const cap of ['ui.unit-templates','ui.plot-views','ui.scientific-plot'])assert(manifest.requiresCore?.includes(cap),`Resonance production manifest missing ${cap}.`);
for(const scripts of [manifest.scripts,manifest.window?.scripts]){
  const u=scripts.indexOf('unit-presentation.js'),v=scripts.indexOf('view-components.js');
  assert(u>=0&&v>=0&&u<v,'Resonance Unit presentation must load before the thin behavior/view delegator in every host.');
}
assert(pluginEntry.includes('"unit-presentation.js"')&&pluginEntry.includes('"view-components.js"'),'Resonance embedded manifest must stay synchronized with plugin.json.');
assert(views.includes("ctx.modules.require('unit-presentation')")&&views.includes('unitPresentation.mount(ctx,controller,{mode})'),'Resonance behavior owner must delegate production composition to Unit Templates.');
assert(!views.includes('topPageHtml')&&!views.includes('workspaceSurface.create')&&!views.includes('resonance-parity-root'),'The old raw HTML/workspace presentation owner must be removed, not kept as a second path.');

for(const token of ['units.pageHeader.create','units.page.create','units.workspace.create','units.layout.create','units.field.create','units.check.create','units.action.create','units.list.create','units.legend.create','units.prime.build','units.scientificPlot.create','units.table.bind','wb.compose'])
  assert(unit.includes(token),`Resonance production Unit reconstruction missing ${token}.`);
assert(unit.includes("variant:'fixed-titleless'")&&unit.includes("presentationRole:'data-control'")&&unit.includes("presentationPurpose:'parameters'")&&unit.includes('existingNode:dataNode')&&!unit.includes("minContentInlinePx:361"),'Resonance data/parameter control rail must be titleless and must not own a private parameter Drawer minimum width.');
assert(!unit.includes("title:'共振参数")&&!unit.includes('canonical-header\',presentationRole:\'data-control'),'Resonance parameter/data-control PRIME must not generate a private titlebar.');
assert(unit.includes("stateVersion:'workspace-v4'")&&((unit.match(/stateVersion:'workspace-v5'/g)||[]).length>=2),'Resonance production cutover must preserve accepted PRIME persistence namespaces.');
assert(unit.includes("hostMode:isTop?'top':'super'")&&unit.includes('leftWidth:280,leftMin:230,canvasLeftWidth:360,canvasRightWidth:390,canvasBottomHeight:360'),'The same accepted workspace geometry must be declared through the Unit Workspace for TOP and SUPER.');
assert(!/\.style\s*[.=\[]/.test(unit),'Resonance Unit production composition must not bypass StyleGate with direct plugin style writes.');

const acceptedIds=[
  'reswinHeaderActions','reswinShowAll','reswinShowForward','reswinShowReverse','reswinHideAll','reswinSweepSelect','reswinDatasetList',
  'reswinDetectorDescription','reswinDetectorSelect','reswinRecoverDetector','reswinMetricAlgorithmSelect','reswinRecoverMetricAlgorithm','reswinMetricAlgorithmDescription','reswinPreset','reswinDetectorParams','reswinDetectSelected','reswinDetectAll','reswinSortPeaks','reswinPeakLegend',
  'reswinShowRejected','reswinShowWidth','reswinShowPoints','reswinPhysicsLabels','reswinTransform',
  'resparMainPlotWrap','resparMainLegend','reswinMainPlot','resparRangeMenu','resparRangeSummary','resparRangeDetect','resparRangeDelete','resparRangeLock','resparRangeUnlock','resparRangeOrder','resparRangeLabel','resparRangeApplyIdentity','resparRangeClose','resparHoverTip','reswinSummary',
  'resparInspectorPanel','reswinInspectorBody','resparGroupPanel','reswinGroupContext','reswinGroupGrid',
  'reswinPhysicsSummary','reswinPhysicsPlot','reswinPhysicsModel','reswinPhysicsTable','reswinSpacingA','reswinSpacingB','reswinSpacingMode','reswinSpacingExport','reswinSpacingPlot','reswinSpacingTable',
  'reswinGateA','reswinGateB','reswinGateHysteresis','reswinGateWidth','reswinGateFeatureMetric','reswinGateFeatureDirection','reswinGateUseDensity','reswinGateCg','reswinGateCnp','reswinGateRun','reswinGateExportCsv','reswinGateFeatureExport','reswinGateExportReport','reswinGateSummary','reswinGateRidges','reswinGateV0','reswinGateDelta','reswinGateWidthPlot','reswinGateTer','reswinGateVStar','reswinGateHysteresisPlot','reswinGateAmplitude','reswinGateTerCorrelation','reswinGateReadoutCorrelation','reswinGateBackground','reswinGateDensity','reswinGateFeatureFieldTitle','reswinGateFeatureFieldMeta','reswinGateFeatureField','reswinGateReport','reswinGateTable'
];
for(const id of acceptedIds)assert(unit.includes(id),`Resonance Unit production anatomy dropped accepted id: ${id}`);
const acceptedClasses=['respar-left-panel','respar-data-list-title','respar-scan-global','respar-dataset-list','respar-select-label','respar-note','respar-preset-row','respar-advanced','respar-detect-actions','respar-peak-legend','respar-main-area','respar-main-workspace','respar-plot-wrap','respar-main-plot-header','respar-main-tools','respar-main-legend','respar-main-svg','respar-status-row','respar-summary','respar-floating-panel','respar-inspector-panel','respar-group-panel','respar-floating-header','respar-floating-body','respar-inspector-body','reswin-group-grid','respar-derived','respar-derived-header','reswin-two-col','reswin-gate-grid','reswin-gate-controls','reswin-feature-field-card','reswin-feature-field-plot','reswin-report'];
for(const className of acceptedClasses)assert(unit.includes(className),`Resonance Unit production anatomy dropped accepted private geometry hook: ${className}`);

assert(group.includes('live.uiRuntime?.unitTemplates?.plotGroup')&&!group.includes('live.uiRuntime?.plotGroups'),'Dynamic Resonance group composition must now consume the strict Unit PlotGroup facade, not the raw Core composition service.');
assert(group.includes("detailGeometry:{contentAspectRatio:1.65,contentMinHeightPx:160,contentMaxHeightPx:226}")&&!group.includes('contentAspectRatio:1.65,contentMinHeight:160'),'Group child accepted geometry must flow through Unit PlotView detailGeometry.');
assert(group.includes("unitTemplates?.scientificPlot?.create?.(plot,{variant:'curve'")&&group.includes("renderOwner:'runtime'"),'Dynamic group plots must declare one Unit ScientificPlot lifecycle while retaining the accepted runtime renderer owner.');

assert(!/container-name:resonance-parameters-mobile;padding:10px/.test(read('src/plugins/resonance-workbench/mobile.css')),'Resonance Mobile CSS must not remain a second PRIME outer-inset owner.');
assert.strictEqual(sha('src/plugins/resonance-workbench/plugin.css'),'dfa8e25f1463431420432ea95a64a81351eb9195c7986885ba507d61b80363c5','Resonance production Unit CSS must preserve accepted geometry except the reviewed v3.71.91 Mobile-region exclusion that removes Desktop floating/docked ownership from projected companions.');
assert.strictEqual(sha('src/plugins/resonance-workbench/mobile.css'),'853c639753657813d6e27a4c30e8d33320d869b0b5703b40b6797e15fed79ccf','Resonance mobile source may change only for the reviewed PRIME inset ownership migration.');
assert.strictEqual(sha('src/plugins/resonance-workbench/workbench-shared.js'),'fe49fa74d2ef018c5558c0098bb10fea5e449b6e8a0ca246151fb12a2577321b','Shared Resonance controller/domain contract must remain byte-frozen during presentation cutover.');
assert.strictEqual(sha('src/plugins/resonance-workbench/task-core.js'),'9f6ceda742c2ae0523161ae66d268ef324059f9e8e3219a839702fa3ce439da8','Resonance task/numeric core must remain byte-frozen during presentation cutover.');
assert.strictEqual(sha('src/plugins/resonance-workbench/resonant-ter-task.js'),'cc201a6a30baf8dcfacad903d9bc7a9c417dd40dc55c56a485f3bc6afb831e44','Resonance TER task must remain byte-frozen during presentation cutover.');

console.log('v3.71.19 Resonance production Unit source-parity cutover contract PASS');
