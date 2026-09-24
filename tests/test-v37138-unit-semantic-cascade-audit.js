'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');
const cascade=require('../tools/quality/unit-semantic-cascade-audit');
const ownership=require('../tools/quality/unit-runtime-style-ownership');
const atLeast=(actual,minimum)=>{const a=String(actual).split('.').map(Number),b=String(minimum).split('.').map(Number);for(let i=0;i<3;i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false;}return true;};
assert(atLeast(pkg.version,'3.71.38'),'v3.71.38+ source required.');

const report=cascade.audit();
assert.strictEqual(report.ok,true,cascade.format(report));
assert.strictEqual(report.layoutRecipes,73,'Layout recipe census changed; review shorthand-family coverage.');
assert.strictEqual(report.shorthandSensitiveRecipes.length,58,'Shorthand-sensitive Layout recipe census changed; review CSSOM family coverage.');
assert.strictEqual(report.broadButtonGeometryViolations.length,0,'A generic tag-based button geometry rule can reach canonical Field proxy buttons.');

const byPlugin=Object.fromEntries(report.pluginExposure.map(row=>[row.plugin,row]));
assert.deepStrictEqual(Object.fromEntries(Object.entries(byPlugin).map(([id,row])=>[id,[row.layoutMounts,row.shorthandSensitiveMounts.length]])),{
  'data-center':[15,2],
  'pulse-analysis':[18,10],
  'pulse-sampler-tool':[15,9],
  'resonance-workbench':[43,2],
  'ter-analysis':[5,0],
  'transfer-vth-lab':[6,5]
},'Production Unit presentation cascade census changed; review the mount instead of silently changing coverage.');

assert.deepStrictEqual(report.proxyExposure.map(row=>[row.plugin,row.count]),[['data-center',4]],
  'Popup multi-select proxy exposure changed; review every newly exposed plugin against canonical Field geometry.');

// The runtime/style owner census must remain exact after removing the historical
// resonance helper-definition false positive from source-token counting.
const ownerReport=ownership.audit();
assert.strictEqual(ownerReport.plugins,6);
assert.strictEqual(ownerReport.layouts,102);
assert.strictEqual(ownerReport.splits,1);
assert.strictEqual(ownerReport.violations.length,0,ownership.format(ownerReport));

const mobile=fs.readFileSync(path.join(root,'src/styles/platform/native-client-shell.css'),'utf8');
assert(/data-dkds-mobile-frame-region="drawer"\]\s+:where\(button\):not\(\.dkds-field-control\)\{padding:5px 9px\}/.test(mobile),
  'Mobile drawer generic button geometry must exclude canonical Field proxies.');
assert(/data-dkds-mobile-density="compact"\]\s+\.dkds-field-control\{font-size:11px;padding-block:4px;padding-inline:7px\}/.test(mobile),
  'Mobile compact density must target canonical Field identity so select and popup proxy stay identical.');

const unitDoc=fs.readFileSync(path.join(root,'sdk/UNIT_TEMPLATES.md'),'utf8');
assert(unitDoc.includes('# Unit Templates 2.5.38 — SDK 1.51.52'));
assert(unitDoc.includes('`units.version` is `2.5.38` in SDK 1.51.52.'));
assert(!unitDoc.includes('2.5.39'),'SDK Unit documentation must not advertise a future/unpublished Unit contract.');

console.log('v3.71.38 Unit semantic/cascade audit PASS');
