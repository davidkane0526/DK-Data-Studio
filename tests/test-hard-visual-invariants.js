'use strict';
const assert=require('assert');
const fs=require('fs');
const {validate}=require('../tools/quality/visual-invariants');
const result=validate();
assert.equal(result.ok,true);
const runtime=fs.readFileSync('src/diagnostics/automation-test-runtime.js','utf8');
assert(runtime.indexOf("'ui.hard-visual-invariants'")<runtime.indexOf("'runtime.package-mode'"),'Hard visual runtime gate must execute before the ordinary automation suite.');
console.log('hard visual invariants: PASS');
