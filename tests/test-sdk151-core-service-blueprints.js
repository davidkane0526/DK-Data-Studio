'use strict';
const assert=require('assert');const fs=require('fs');const path=require('path');
const {UNIT_CATALOG,CORE_SERVICE_CATALOG,FORMAL_CORE_SERVICE_METHODS,VISUAL_SERVICE_MIGRATIONS}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_SERVICE_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
const pluginDirs=fs.readdirSync('src/plugins').filter(name=>fs.statSync(path.join('src/plugins',name)).isDirectory()).sort();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_SERVICE_BLUEPRINTS).sort(),pluginDirs,'Every native plugin needs a Core Service Blueprint.');
const exactVisual={};for(const key of Object.keys(VISUAL_SERVICE_MIGRATIONS))exactVisual[key.replace(/^ctx\.(?:ui\.)?/,'')]=VISUAL_SERVICE_MIGRATIONS[key];
let serviceRefs=0,migrationRefs=0;
for(const plugin of pluginDirs){
  const blueprint=NATIVE_PLUGIN_SERVICE_BLUEPRINTS[plugin],actual=new Set(),specific=[];const dir=path.join('src/plugins',plugin);
  for(const file of fs.readdirSync(dir,{recursive:true}).filter(x=>String(x).endsWith('.js'))){const full=path.join(dir,file);if(!fs.existsSync(full)||!fs.statSync(full).isFile())continue;const text=fs.readFileSync(full,'utf8');for(const match of text.matchAll(/ctx\.ui\.([A-Za-z_$][\w$]*)(?:\.([A-Za-z_$][\w$]*))?/g)){actual.add(match[1]);specific.push(`${match[1]}.${match[2]||'*'}`);serviceRefs++;}for(const match of text.matchAll(/ctx\.(parameters)\.([A-Za-z_$][\w$]*)/g)){actual.add(match[1]);specific.push(`${match[1]}.${match[2]}`);serviceRefs++;}}
  assert.deepStrictEqual([...actual].sort(),[...(blueprint.services||[])].sort(),`${plugin}: Core Service Blueprint drift`);
  for(const service of actual)assert(CORE_SERVICE_CATALOG[service],`${plugin}: unknown/unclassified Core UI service ${service}`);
  const expected=new Map();for(const call of specific){if(call.endsWith('.*'))continue;const target=exactVisual[call];if(target)expected.set(`${call}->${target}`,(expected.get(`${call}->${target}`)||0)+1);else assert(FORMAL_CORE_SERVICE_METHODS[call],`${plugin}: direct Core method is neither Unit migration nor formal service: ${call}`);}
  const declared=new Map((blueprint.migrations||[]).map(row=>[`${row.from}->${row.to}`,row.count]));assert.deepStrictEqual([...declared.entries()].sort(),[...expected.entries()].sort(),`${plugin}: visual-service migration blueprint drift`);migrationRefs+=expected.size;
  for(const row of blueprint.migrations||[])assert(UNIT_CATALOG[row.to],`${plugin}: migration target Unit missing: ${row.to}`);
}
assert(serviceRefs>100&&migrationRefs>=8,'Service census unexpectedly lost coverage.');
assert.strictEqual(CORE_SERVICE_CATALOG.dom.forbiddenVisualMethods.includes('style'),true,'dom.style must remain classified as visual migration debt.');
assert(!FORMAL_CORE_SERVICE_METHODS['dom.style'],'dom.style must never be whitelisted as a formal service method');
assert(FORMAL_CORE_SERVICE_METHODS['dom.create'].kind==='domain-content-helper','dom.create is allowed only as domain-content helper');
console.log(`SDK 1.51 Core Service Blueprints PASS (${serviceRefs} Core service refs / ${migrationRefs} visual migration kinds)`);
