'use strict';
const assert=require('assert');
const fs=require('fs');const path=require('path');const Module=require('module');
process.env.NODE_PATH=[path.join(process.cwd(),'src/core'),process.env.NODE_PATH||''].filter(Boolean).join(path.delimiter);Module._initPaths();
const {UNIT_TEMPLATE_SPEC_VERSION,UNIT_CATALOG,UNIT_CONTRACTS,ACCEPTED_LAYOUT_GEOMETRY_VALUES,ACCEPTED_LAYOUT_BREAKPOINTS,assertUnitVariant}=require('../src/core/ui/modules/composition/unit-template-spec');
global.window={addEventListener(){},removeEventListener(){},DKDSPlotPresentation:null};global.document={querySelector:()=>null,documentElement:{classList:{contains:()=>false},dataset:{}}};global.DKDSStyleGate={set(){},setToken(){},remove(){},snapshot(){return{};}};window.DKDSStyleGate=global.DKDSStyleGate;
const {UnitTemplateRuntime}=require('../src/core/ui/modules/composition/unit-templates');

assert.strictEqual(UNIT_TEMPLATE_SPEC_VERSION,'2.5.38');
assert.deepStrictEqual(Object.keys(UNIT_CONTRACTS).sort(),Object.keys(UNIT_CATALOG).sort(),'Every Unit must have a detailed contract.');
for(const [id,row] of Object.entries(UNIT_CONTRACTS)){
  assert(typeof row.purpose==='string'&&row.purpose.length>12,`${id}: purpose missing`);
  assert(Array.isArray(row.slots)&&row.slots.length,`${id}: slot anatomy missing`);
  assert(typeof row.responsive==='string'&&row.responsive.length,`${id}: responsive contract missing`);
  assert(Array.isArray(row.accessibility),`${id}: accessibility contract missing`);
  assert(Array.isArray(row.invariants)&&row.invariants.length,`${id}: invariants missing`);
  assert(Array.isArray(row.extensionPoints)&&row.extensionPoints.length,`${id}: extension points missing`);
  assert(Array.isArray(row.forbidden)&&row.forbidden.length,`${id}: forbidden overrides missing`);
}
for(const [id,row] of Object.entries(UNIT_CATALOG))for(const variant of row.variants||[])assert.strictEqual(assertUnitVariant(id,variant),variant);
assert.throws(()=>assertUnitVariant('panel','made-up-private-variant'),/UNIT_TEMPLATE_UNKNOWN_VARIANT/);
assert.throws(()=>assertUnitVariant('not-a-unit','x'),/UNIT_TEMPLATE_UNKNOWN_UNIT/);
const fake={interactionBehaviors:{compile:s=>s},track(){},options:{contributions:{}},plotViews:{},tables:{},scientificPlot:{},actions:{},panels:{},menus:{}};
const runtime=new UnitTemplateRuntime(fake,{plotGroups:{}});
assert.strictEqual(runtime.contracts,UNIT_CONTRACTS,'Runtime must expose the same Core-owned detailed contracts.');
assert.strictEqual(runtime.layoutGeometryValues,ACCEPTED_LAYOUT_GEOMETRY_VALUES,'Runtime must expose the same accepted geometry vocabulary.');
assert.strictEqual(runtime.layoutBreakpoints,ACCEPTED_LAYOUT_BREAKPOINTS,'Runtime must expose the same accepted layout breakpoints.');

assert.throws(()=>runtime.panel.detached({variant:'plugin-private-card'}),/UNIT_TEMPLATE_UNKNOWN_VARIANT/);
assert.throws(()=>runtime.toolbar.create({}, {variant:'plugin-private-toolbar'}),/UNIT_TEMPLATE_UNKNOWN_VARIANT/);
const dts=fs.readFileSync('sdk/plugin-api.d.ts','utf8');
for(const token of ['DKDSUnitTemplateContract','DKDSUnitLayoutGeometry','DKDSUnitLayoutResponsiveGeometry','DKDSUnitLayoutBreakpoint','DKDSUnitGeometryOwnershipPolicy','readonly geometryOwnershipPolicy:','readonly layoutGeometryValues:','readonly layoutBreakpoints:','apply(target:Element|string','version:\'2.5.38\''])assert(dts.includes(token),`d.ts missing ${token}`);
assert(dts.includes("principle:'single-writer-bounded-configuration-v1'"),'SDK types must expose the geometry single-writer policy.');
assert.strictEqual(runtime.geometryOwnershipPolicy.principle,'single-writer-bounded-configuration-v1','Runtime must expose the same geometry ownership policy.');
const docs=fs.readFileSync('sdk/UNIT_TEMPLATE_CATALOG.md','utf8');
for(const token of ['Purpose:','Slots:','Responsive:','Accessibility:','Invariants:','Extension points:','Forbidden:','Accepted geometry vocabulary','Private geometry migration bridges','Geometry ownership policy','single-writer-bounded-configuration-v1'])assert(docs.includes(token),`Generated catalog missing ${token}`);
console.log(`SDK 1.51 detailed Unit contracts PASS (${Object.keys(UNIT_CONTRACTS).length} units)`);
