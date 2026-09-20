'use strict';
const assert=require('assert');
const path=require('path');const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const {UNIT_CATALOG,UNIT_CHROME_POLICIES,STRUCTURAL_PRIMITIVE_POLICIES}=require('../src/core/ui/modules/composition/unit-template-spec');
const {scanAll,STRUCTURE_UNIT_MAP}=require('../tools/sdk/native-structure-census');
const all=scanAll();
assert.strictEqual(Object.keys(all).length,18,'all native plugin directories must be structurally inventoried');
for(const [primitive,row] of Object.entries(STRUCTURAL_PRIMITIVE_POLICIES))assert(UNIT_CATALOG[row.unit],`structural primitive ${primitive} maps to missing Unit ${row.unit}`);
for(const [primitive,unit] of Object.entries(STRUCTURE_UNIT_MAP))assert(UNIT_CATALOG[unit],`scanner primitive ${primitive} maps to missing Unit ${unit}`);
let counts={buttons:0,fields:0,selects:0,checks:0,tables:0};
for(const [id,row] of Object.entries(all)){
  counts.buttons+=row.counts.buttons;counts.fields+=row.counts.inputs+row.counts.textareas;counts.selects+=row.counts.selects;counts.checks+=row.counts.checks;counts.tables+=row.counts.tables;
  for(const button of row.buttons)assert(button.file&&button.line>0,`${id} button inventory must preserve source provenance`);
  for(const field of [...row.inputs,...row.selects,...row.textareas,...row.checks])assert(field.file&&field.line>0,`${id} field inventory must preserve source provenance`);
}
for(const id of ['plotViewComplete','plotGroupStandard','plotGroupTitleless','movableInspector','movableDataControl','fixedDataControl','scientificSecondary','portable'])assert(UNIT_CHROME_POLICIES[id],`missing chrome policy ${id}`);
assert.deepStrictEqual(UNIT_CHROME_POLICIES.plotViewComplete.coreActions,['placement','export']);
assert.deepStrictEqual(UNIT_CHROME_POLICIES.plotGroupStandard.coreActions,['placement','columns','collapse','close']);
assert.strictEqual(UNIT_CHROME_POLICIES.plotGroupTitleless.header,'none');
console.log(`SDK 1.51 native structure expressibility PASS (${counts.buttons} buttons / ${counts.fields} fields / ${counts.selects} selects / ${counts.checks} checks / ${counts.tables} tables)`);
