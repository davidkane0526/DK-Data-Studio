'use strict';
const assert=require('assert');const fs=require('fs');
const {UNIT_CATALOG}=require('../src/core/ui/modules/composition/unit-template-spec');
const api=fs.readFileSync('src/core/plugins/kernel/modules/plugin-api.js','utf8'),match=/const classes=Object\.freeze\(\{([^}]+)\}\)/.exec(api);assert(match,'Plugin API design-system class map missing');
const canonical=[...match[1].matchAll(/(\w+):'([^']+)'/g)].map(row=>({key:row[1],className:row[2]}));
const covered=new Set(Object.values(UNIT_CATALOG).flatMap(row=>row.classes||[]));const missing=canonical.filter(row=>!covered.has(row.className));assert.deepStrictEqual(missing,[],`Unit Catalog does not cover canonical Design System classes: ${missing.map(row=>row.className).join(', ')}`);
console.log(`SDK 1.51 Design System -> Unit Catalog coverage PASS (${canonical.length}/${canonical.length} canonical classes)`);
