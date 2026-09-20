'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const geometryOnlyCss=css=>!/(?:^|[;{}]\s*)(?:background(?:-color)?|color|border(?:-[\w-]+)?|box-shadow|text-shadow|font(?:-family|-size|-weight)?|filter|backdrop-filter)\s*:/mi.test(css);

const manifest=json('src/plugins/ter-analysis/plugin.json');
const unit=read('src/plugins/ter-analysis/unit-presentation.js');
const css=read('src/plugins/ter-analysis/plugin.css');
const feature=read('src/plugins/ter-analysis/feature-runtime.js');
const superLayout=read('src/plugins/ter-analysis/super-layout.js');
const entry=read('src/plugins/ter-analysis/plugin.js');
const spec=require('../src/core/ui/modules/composition/unit-template-spec');

assert.strictEqual(Object.keys(spec.UNIT_CATALOG||{}).length,41,'TER source-parity reconstruction must not add a 42nd Unit type.');
assert.strictEqual(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert(Number(manifest.version.split('.').at(-1))>=0&&manifest.version.startsWith('3.14.'),'TER production Unit cutover baseline must remain on 3.14.x or later patch.');
assert.deepStrictEqual(manifest.styles,['plugin.css'],'TER must retain its accepted plugin-owned detail geometry through manifest.styles.');
assert(fs.existsSync(path.join(root,'src/plugins/ter-analysis/plugin.css')),'TER accepted geometry stylesheet must exist.');
assert.strictEqual(sha(css),'a601985b774667acb6c8d8fea9255db87537a46afe4bdecc2d07504ef7a1442b','TER geometry stylesheet must remain byte-identical to the accepted pre-cutover source.');
assert(geometryOnlyCss(css),'TER plugin.css may own source-parity geometry only, never material/theme paint.');
assert(!fs.existsSync(path.join(root,'src/plugins/ter-analysis/shared-views.js')),'Legacy TER shared-views.js must stay removed after Unit reconstruction.');
assert(manifest.scripts.includes('unit-presentation.js')&&!manifest.scripts.includes('shared-views.js'));
assert((manifest.requiresCore||[]).includes('ui.unit-templates')&&(manifest.requiresCore||[]).includes('ui.table'));

for(const token of [
  'ctx.ui.unitTemplates','units.page.create','units.pageHeader.create','units.workspace.create','units.layout.create','units.panel.create',
  'units.header.create','units.action.create','units.field.create','units.check.create','units.note.create','units.summary.create',
  'units.parameterForm.mount','units.table.bind','units.prime.build','units.plotGroup.create','units.scientificPlot.create','plotGroup.adoptPlot'
])assert(unit.includes(token),`TER production Unit presentation missing ${token}`);
for(const key of ['heatmap','transform','resistance','maxVg','maxVgArg','maxVd','maxVdArg'])assert(unit.includes(`makePlot({key:'${key}'`),`TER production Unit presentation missing PlotView ${key}`);

// Source fidelity: preserve accepted grouping, state keys and explicit plugin detail parameters.
for(const token of ['ter-workspace-left','ter-workspace-main','ter-chart-grid','ter-resistance-card-header','ter-chart-actions','heatmap-square-card','analysis-section-title','analysis-table-wrap'])assert(unit.includes(token),`TER source-parity presentation missing accepted source token ${token}`);
assert(unit.includes("variant:'plot-card'"),'TER chart cards must be produced by the Plot Card Unit while retaining accepted plugin classes.');
assert(unit.includes("variant:'analysis-control'")&&unit.includes("variant:'analysis-check'"),'TER parameter controls must use source-faithful Unit anatomy variants.');
assert(unit.includes('compact:true')&&!unit.includes('autoFit:true'),'TER transform controls must preserve the accepted compact ParameterForm behavior.');
assert(unit.includes('gapPx:14'),'TER must preserve its accepted 14 px group gap as explicit source-detail geometry.');
assert(unit.includes("density:'comfortable'"),'TER PlotGroup must preserve the accepted comfortable source density.');
assert(unit.includes('detailGeometry:{contentAspectRatio:1,contentMinHeightPx:80,contentMaxHeightPx:860}'),'TER heatmaps must express accepted square geometry through the Unit PlotView detail-geometry contract.');
assert(unit.includes("stateVersion:'ter-plot-view-v3'"),'TER must preserve the accepted PlotView persistence key.');
assert(unit.includes("stateVersion:'presentation-v1'"),'TER must preserve the accepted data-control persistence key.');
assert(!unit.includes('layoutStateVersion')&&!unit.includes('leftWidth:')&&!unit.includes('leftMin:')&&!unit.includes('leftReserve:'),'TER Unit reconstruction must not reset accepted workbench/split geometry with new defaults.');
assert(unit.includes('existingNode:controls')&&unit.includes("variant:'fixed-titleless'")&&!unit.includes('detailGeometry:{contentInsetPx:12}')&&!unit.includes('content:controls'),'TER parameter PRIME must adopt the accepted controls node directly while Core supplies the uniform parameter outer inset.');
assert(!unit.includes("title:'TER 参数与显示'"),'Parameter PRIME must never carry a titlebar title.');
assert(unit.includes("presentationPurpose:'parameters'")&&unit.includes("label:'参数'"),'TER parameter surface must remain a semantic parameters PRIME.');
assert(unit.includes("renderOwner:'runtime'"),'TER must retain the single production scientific renderer owner.');
assert(unit.includes("actionsTagName:'div'")&&unit.includes("titleClassName:'ter-card-title-text'")&&unit.includes("actionsClassName:'ter-chart-actions'"),'R–V header anatomy must preserve the accepted source detail.');
assert(unit.includes("accessibleTitle:'全部 Vg 的电阻–电压（R–V）正扫 / 反扫'"));
assert(!unit.includes('ctx.ui.styles.add(')&&!unit.includes('.style.')&&!unit.includes('style='),'TER Unit JS must not establish a second CSS/inline geometry owner.');

for(const cssToken of ['min-width:118px;width:135px','min-width:105px;width:112px','width:min(860px,100%)','width:min(760px,100%)','--dkds-grid-gap:14px','grid-template-rows:auto auto auto minmax(320px,1fr)','min-height:38px'])assert(css.replace(/\s+/g,'').includes(cssToken.replace(/\s+/g,'')),`Accepted TER detail geometry missing: ${cssToken}`);

assert(!feature.includes('sharedViews')&&!feature.includes('shared-views')&&!feature.includes('ctx.ui.plotViews.bind'),'Feature runtime must consume Unit-owned PlotViews and contain behavior/scientific rendering only.');
assert(feature.includes("if(!presentation?.plotViews?.size)throw new Error('TER Unit presentation did not provide PlotViews.')"));
assert(feature.includes('presentation?.tableVg?.setData?.')&&feature.includes('presentation?.tableVd?.setData?.'));
for(const behavior of ['renderTerHeatmap','renderReductionPlots','renderResistanceBase','applyResistanceSelection','bindKeyboardAdjuster','selectionLink'])assert(feature.includes(behavior),`TER behavior cutover lost ${behavior}`);
assert(superLayout.includes("get('builtin.ter-analysis','unit-presentation')")&&superLayout.includes("feature.mount(ctx,controller,{mode:'unit',unitPresentation"));
assert(entry.split(/\r?\n/).length<40,'TER plugin.js must remain a thin composition entry.');
assert((entry.match(/analysisService\.create/g)||[]).length===1&&(entry.match(/C\.create/g)||[]).length===1,'TER must retain exactly one service/controller owner.');

console.log('SDK 1.51.11 TER production source parity PASS: 41 Units + Unit-owned accepted detail geometry + titleless parameters.');
