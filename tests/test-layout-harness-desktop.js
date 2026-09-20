'use strict';
const assert=require('assert');const {DESKTOP,SURFACE_STATES,runLayoutHarness}=require('../sdk/layout-harness');
assert.deepStrictEqual(DESKTOP,[[1920,1080],[1600,900],[1440,900],[1280,720]]);const result=runLayoutHarness({browser:false});assert(result.ok,result.issues.join('; '));assert.strictEqual(SURFACE_STATES.length,8);assert.strictEqual(result.cases,64);console.log('Desktop layout harness PASS');
