'use strict';
const assert=require('assert');
const {scanAll}=require('../tools/sdk/native-state-census');
const {STATE_CHANNELS,ACCESSIBILITY_ATTRIBUTES,ACCESSIBILITY_ROLES,ACCESSIBILITY_TABINDEX,KEYBOARD_KEYS}=require('../src/core/ui/modules/composition/unit-template-state');
const all=scanAll();assert.strictEqual(Object.keys(all).length,18,'all native plugin directories must be state/accessibility inventoried');
let totals={states:0,roles:0,a11y:0,keyboard:0,unmapped:0};
for(const [id,row] of Object.entries(all)){
  for(const key of Object.keys(totals))totals[key]+=row.counts[key];
  for(const item of row.states){assert(item.file&&item.line>0,`${id} state row must preserve provenance`);assert(STATE_CHANNELS[item.state],`${id} state row ${item.raw} must map to public state channel`);}
  for(const item of row.a11y){assert(ACCESSIBILITY_ATTRIBUTES[item.name],`${id} uses unregistered accessibility attribute ${item.name} at ${item.file}:${item.line}`);}
  for(const item of row.roles){if(item.name==='role'&&item.value)assert(ACCESSIBILITY_ROLES.includes(item.value),`${id} uses unregistered role ${item.value} at ${item.file}:${item.line}`);if(item.name==='tabindex'&&item.value!=='')assert(ACCESSIBILITY_TABINDEX.includes(Number(item.value)),`${id} uses unregistered tabindex ${item.value}`);}
  for(const item of row.keyboard)assert(KEYBOARD_KEYS.includes(item.key),`${id} uses unregistered keyboard key ${item.key}`);
}
assert.strictEqual(totals.unmapped,0,'native state census must have zero unmapped state semantics');
assert(totals.states>50&&totals.a11y>10&&totals.keyboard>0,'state census unexpectedly empty');
console.log(`SDK 1.51 native state/accessibility census PASS (${totals.states} states / ${totals.roles} role-tabindex / ${totals.a11y} ARIA / ${totals.keyboard} keyboard)`);
