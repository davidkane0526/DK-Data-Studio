'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const {UNIT_TEMPLATE_SPEC_VERSION,BASE_METRICS,UNIT_CATALOG,ACCEPTED_SCIENTIFIC_SIGNATURE}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
const pluginDirs=fs.readdirSync('src/plugins').filter(name=>fs.statSync(path.join('src/plugins',name)).isDirectory()).sort();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_BLUEPRINTS).sort(),pluginDirs,'Every native plugin must have a Unit Template migration blueprint.');
for(const [plugin,blueprint] of Object.entries(NATIVE_PLUGIN_BLUEPRINTS)){
  assert(Array.isArray(blueprint.units)&&blueprint.units.length,`${plugin} blueprint must declare units.`);
  for(const unit of blueprint.units)assert(UNIT_CATALOG[unit],`${plugin} references unknown Unit Template: ${unit}`);
}
for(const unit of ['workspace','page','pageHeader','surface','panel','section','header','toolbar','actionRow','tabs','field','check','chip','note','metric','list','componentTree','parameterForm','table','prime','plotView','plotGroup','scientificPlot','legend','floatingChrome','splitHandle','splitPane','movableWindow','meter','dialog','menu','popover','status','portable','provider'])assert(UNIT_CATALOG[unit],`catalog missing ${unit}`);
assert.deepStrictEqual({surface:BASE_METRICS.surface.visualRadiusPx,control:BASE_METRICS.control.heightPx,headerAction:BASE_METRICS.header.actionHeightPx,field:BASE_METRICS.field.minHeightPx,groupRegular:BASE_METRICS.plotGroup.regularGapPx}, {surface:9,control:32,headerAction:26,field:32,groupRegular:12});
assert.strictEqual(ACCEPTED_SCIENTIFIC_SIGNATURE.groupDensity,'regular');
assert(ACCEPTED_SCIENTIFIC_SIGNATURE.units.every(unit=>UNIT_CATALOG[unit]),'accepted scientific signature must be composed only from catalog units');
const metricsCss=fs.readFileSync('src/styles/structure/metrics.css','utf8'),geometryCss=fs.readFileSync('src/styles/structure/desktop-chrome-geometry.css','utf8'),componentsCss=fs.readFileSync('src/styles/structure/workbench-components.css','utf8'),semanticCss=fs.readFileSync('src/styles/structure/sdk-semantic-surfaces.css','utf8');
for(const token of ['--plugin-control-height:32px','--plugin-action-gap:6px','--dkds-visual-radius:9px','--dkds-visual-gap:8px'])assert(metricsCss.includes(token),`catalog metric drift: ${token}`);
for(const token of ['--dkds-header-action-height,26px','width:26px;min-width:26px;max-width:26px','min-width:34px','min-width:30px'])assert(geometryCss.includes(token),`header geometry drift: ${token}`);
for(const token of ['min-height:28px','height:28px','padding:0 8px','gap:6px'])assert(semanticCss.includes(token),`unit geometry drift: ${token}`);assert(componentsCss.includes('--dkds-table-resizer-hit-width:8px'),'table geometry drift');
console.log('SDK 1.51 native Unit Template census/catalog PASS');
