'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Module=require('module');
const root=path.resolve(__dirname,'..');
process.env.NODE_PATH=[path.join(root,'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const audit=require('../tools/quality/unit-runtime-style-ownership');
const report=audit.audit();
assert.strictEqual(report.plugins,6,'All six production Unit migrations must be audited.');
assert.strictEqual(report.layouts,102,'Production Unit Layout census changed; review the cross-layer ownership gate instead of silently changing coverage.');
assert.strictEqual(report.splits,1,'Production SplitPane census changed; review ownership coverage.');
assert.deepStrictEqual(report.reports.map(row=>row.plugin).sort(),['data-center','pulse-analysis','pulse-sampler-tool','resonance-workbench','ter-analysis','transfer-vth-lab'],'Cross-layer gate must cover every production Unit presentation.');
assert.strictEqual(report.violations.length,0,audit.format(report));

const dc=read('src/plugins/data-center/unit-presentation.js'),dcCss=read('src/plugins/data-center/plugin.css');
assert(dc.includes("variant:'formula-grid',responsiveTarget:formulaPanel.element"),'Data Center formula outer grid must be Unit-owned.');
assert(dc.includes("className:'dc-chart-params',geometry:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)'"),'Data Center chart outer grid must be Unit-owned.');
assert(!dcCss.includes('#dcFormulaParams .schema-parameter-panel{display:grid')&&!dcCss.includes('.dc-chart-params.schema-parameter-panel.auto-fit.compact{'),'Data Center CSS must not duplicate ParameterForm outer-grid geometry.');

const sampler=read('src/plugins/pulse-sampler-tool/unit-presentation.js');
assert(!sampler.includes("variant:'control-label-row'"),'Pulse Sampler must use canonical Field label/unit anatomy instead of a redundant Layout mount.');
assert(sampler.includes('units.field.create(host,{label,unit'),'Pulse Sampler labels/units must be rendered by the public Field Unit.');

const pulse=read('src/plugins/pulse-analysis/unit-presentation.js'),pulseCss=read('src/plugins/pulse-analysis/plugin.css'),pulseMobile=read('src/plugins/pulse-analysis/mobile.css');
assert(pulse.includes("variant:'file-toolbar',className:'pulse-file-toolbar dkds-toolbar'")&&!pulse.includes("className:'pulse-file-toolbar dkds-toolbar',responsiveTarget:controls"),'Pulse file toolbar must keep one horizontal Unit owner and contribute live intrinsic width instead of a private Drawer breakpoint.');
assert(pulse.includes("variant:'active-file-head',className:'pulse-active-file-head',responsiveTarget:controls,geometry:{padding:'11px 14px 2px'}"),'Pulse active-file head must express accepted detail through the generic Layout Unit.');
assert(pulse.includes("variant:'form-grid-2',className:'pulse-control-grid'")&&!pulse.includes("variant:'identity',className:'pulse-control-grid'"),'Pulse parameter grid must use the canonical form-grid-2 recipe so Unit Layout remains the single density owner.');
assert(pulse.includes("variant:'two-card-grid',className:'pulse-results-grid'")&&pulse.includes('responsiveTarget:primaryMain'),'Pulse result grid must use one generic Unit Layout owner measured from projected PRIMARY width.');
assert(!pulse.includes('units.splitPane.create(primaryMain')&&!pulse.includes("trackToken:'--dkds-unit-results-height'"),'Pulse result/table/raw regions must remain one content-sized PRIMARY flow rather than a persisted SplitPane.');
assert(pulse.includes("detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}"),'Pulse PlotView intrinsic result/raw height must terminate at the public Unit detailGeometry boundary.');
assert(!pulseCss.includes('.pulse-results-split{')&&!pulseCss.includes('.pulse-results-grid{'),'Pulse plugin CSS must not duplicate Unit result-flow geometry.');
assert(!pulseMobile.includes('.pulse-results-split{')&&!pulseMobile.includes('.pulse-results-grid{'),'Mobile platform CSS must not become a second Pulse result reflow owner.');

const spec=require('../src/core/ui/modules/composition/unit-template-spec');
const versionAtLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return true;};
assert(versionAtLeast(spec.UNIT_TEMPLATE_SPEC_VERSION,'2.5.38'),'Unit Templates 2.5.38+ required.');
assert.strictEqual(Object.keys(spec.UNIT_CATALOG).length,41,'Owner closure must not add Unit_for_xxx special cases.');
const behavior=read('src/core/ui/modules/composition/unit-template-behavior.js'),dts=read('sdk/plugin-api.d.ts');
assert(behavior.includes("UNIT_SPLIT_PANE_HOST_LAYOUT_REQUIRES_LAYOUT_UNIT")&&behavior.includes("UNIT_SPLIT_PANE_HOST_LAYOUT_REFLOW_FORBIDDEN"),'SplitPane host ownership must be validated generically.');
assert(dts.includes("layoutOwner?:'core'|'host'")&&dts.includes("forbidden when layoutOwner='host'"),'SDK types must document the mutually exclusive split-layout owner contract.');
for(const rel of ['src/core/ui/modules/composition/unit-template-behavior.js','src/core/ui/modules/composition/unit-template-layout.js','src/core/ui/modules/composition/unit-template-foundation.js'])assert(!/(data-center|pulse-analysis|pulse-sampler-tool|resonance-workbench|ter-analysis|transfer-vth-lab|\.dc-|\.pulse-|\.ps-|\.ter-|\.vth-|\.respar|\.reswin)/i.test(read(rel)),`${rel} must remain domain blind.`);
console.log('v3.71.34+ Unit cross-layer ownership audit PASS');
