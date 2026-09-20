'use strict';
const assert=require('assert');
const {scanAll}=require('../tools/sdk/native-state-census');
const {STATE_CHANNELS}=require('../src/core/ui/modules/composition/unit-template-spec');
const {NATIVE_PLUGIN_STATE_BLUEPRINTS}=require('../tools/sdk/native-blueprints');
const all=scanAll();
assert.deepStrictEqual(Object.keys(NATIVE_PLUGIN_STATE_BLUEPRINTS).sort(),Object.keys(all).sort(),'state blueprints must cover every native plugin directory');
for(const [id,row] of Object.entries(all)){
  const bp=NATIVE_PLUGIN_STATE_BLUEPRINTS[id];assert(bp,`missing state blueprint ${id}`);
  const channels=[...new Set(row.states.map(x=>x.state))].sort();
  const roles=[...new Set(row.roles.filter(x=>x.name==='role'&&x.value).map(x=>x.value))].sort();
  const tabIndex=[...new Set(row.roles.filter(x=>x.name==='tabindex'&&x.value!=='').map(x=>Number(x.value)))].sort((a,b)=>a-b);
  const aria=[...new Set(row.a11y.map(x=>x.name))].sort();
  const keys=[...new Set(row.keyboard.map(x=>x.key))].sort();
  assert.deepStrictEqual(bp.channels,channels,`${id} state channels drifted from frozen source`);
  assert.deepStrictEqual(bp.roles,roles,`${id} roles drifted from frozen source`);
  assert.deepStrictEqual(bp.tabIndex,tabIndex,`${id} tabindex semantics drifted from frozen source`);
  assert.deepStrictEqual(bp.aria,aria,`${id} ARIA semantics drifted from frozen source`);
  assert.deepStrictEqual(bp.keys,keys,`${id} keyboard semantics drifted from frozen source`);
  assert.deepStrictEqual(bp.counts,row.counts,`${id} state census counts drifted`);
  for(const channel of bp.channels)assert(STATE_CHANNELS[channel],`${id} blueprint references unknown state channel ${channel}`);
}
console.log(`SDK 1.51 native state blueprints PASS (${Object.keys(all).length} plugins)`);
