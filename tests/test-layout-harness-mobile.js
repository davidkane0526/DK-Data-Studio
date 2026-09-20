'use strict';
const assert=require('assert');const {MOBILE,SURFACE_STATES,runLayoutHarness}=require('../sdk/layout-harness');
assert.strictEqual(MOBILE.length,4);assert(MOBILE.some(([w,h])=>h>w));assert(MOBILE.some(([w,h])=>w>h));assert.strictEqual(SURFACE_STATES.length,8);const result=runLayoutHarness({browser:false});assert(result.ok,result.issues.join('; '));assert.strictEqual(result.cases,64);console.log('Mobile layout harness PASS');
