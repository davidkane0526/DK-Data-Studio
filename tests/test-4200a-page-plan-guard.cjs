'use strict';
const assert=require('node:assert/strict');
const {validatePagePlan}=require('../src/4200a-fspro/domain/page-plan-guard');
const base=()=>({
  name:'FET family', testMode:'dc_point_by_point',
  terminals:[
    {logical:'S',resource:'SMU1',role:'CONDITION',sourceMode:'voltage',bias:'0',compliance:'1e-3'},
    {logical:'D',resource:'SMU2',role:'X',sourceMode:'voltage',relativeTo:'S',compliance:'1e-3',measureRange:{mode:'auto'}},
    {logical:'G',resource:'SMU3',role:'P',sourceMode:'voltage',relativeTo:'S',compliance:'1e-4',measureRange:{mode:'fixed',value:'1e-6'}}
  ],
  xSweep:{mode:'linear_step',start:'0',stop:'1',step:'0.1'},
  pSweep:{mode:'linear_points',start:'-1',stop:'1',points:5}
});
const clone=()=>structuredClone(base());
function check(code,edit){
  const p=clone();edit(p);
  const result=validatePagePlan(p);
  assert.equal(result.valid,false,code);
  assert.ok(result.errors.some(v=>v.code===code),JSON.stringify(result.errors));
  assert.equal(result.executionAuthorized,false);
}
{
  const v=validatePagePlan(base());
  assert.equal(v.valid,true);
  assert.equal(v.executionAuthorized,false,'offline plan must never authorize instrument output');
}
check('X_ROLE_COUNT',p=>{p.terminals[1].role='CONDITION';p.terminals[1].bias='0';});
check('P_ROLE_COUNT',p=>{p.terminals[0].role='P';});
check('DUPLICATE_TERMINAL',p=>{p.terminals[1].logical='S';});
check('DUPLICATE_RESOURCE',p=>{p.terminals[1].resource='SMU1';});
check('INVALID_COMPLIANCE',p=>{p.terminals[1].compliance='Infinity';});
check('INVALID_MEASURE_RANGE',p=>{p.terminals[2].measureRange.value='0';});
check('MINIMUM_CURRENT_RANGE_ONLY',p=>{p.terminals[2].sourceMode='current';
 p.terminals[2].measureRange={mode:'minimum',value:'1'};});
check('INVALID_MEASURE_RANGE',p=>{p.terminals[2].measureRange={mode:'minimum',value:'0'};});
{
 const p=clone();p.terminals[2].measureRange={mode:'minimum',value:'1e-9'};
 assert.equal(validatePagePlan(p).valid,true,'current autorange floor is valid for offline Page configuration');
}
check('UNKNOWN_REFERENCE',p=>{p.terminals[1].relativeTo='floating';});
check('SELF_REFERENCE',p=>{p.terminals[1].relativeTo='D';});
check('REFERENCE_CYCLE',p=>{p.terminals[0].relativeTo='D';});
check('UNUSED_P_SWEEP',p=>{p.terminals[2].role='CONDITION';p.terminals[2].bias='0';});
check('MISSING_SEQUENCE_FIELD',p=>{delete p.xSweep.stop;});
check('INVALID_STEP',p=>{p.xSweep.step='0';});
check('HARDWARE_THEORY_LIMIT',p=>{p.xSweep.stop='1000';});
check('HARDWARE_THEORY_LIMIT',p=>{p.pSweep.start='-1000';});
check('HARDWARE_THEORY_LIMIT',p=>{p.terminals[0].bias='1000';});
check('HARDWARE_THEORY_LIMIT',p=>{p.terminals[1].compliance='1000';});
check('HARDWARE_THEORY_LIMIT',p=>{p.terminals[2].measureRange.value='2';});
check('HARDWARE_THEORY_RANGE_COMBINATION',p=>{
 p.xSweep.stop='210';p.terminals[1].compliance='0.2';
});
check('HARDWARE_THEORY_RANGE_COMBINATION',p=>{
 p.terminals[1].sourceMode='current';
 p.xSweep.stop='0.5';p.xSweep.step='0.1';p.terminals[1].compliance='100';
});
{
  const p=clone();
  p.xSweep.stop='210';
  p.terminals[1].compliance='0.105';
  p.terminals[2].measureRange.value='1.05';
  const result=validatePagePlan(p);
  assert.equal(result.valid,true,'the maximum theoretical 4200A envelope must not be artificially reduced');
  assert.equal(result.executionAuthorized,false,'within theoretical envelope is still not an output permit');
}
{
  const p=clone();p.terminals[2].resource='None';
  const v=validatePagePlan(p);
  assert.equal(v.valid,true,'unassigned channel may remain editable draft');
  assert.ok(v.warnings.some(w=>w.code==='UNASSIGNED_RESOURCE'));
  assert.equal(v.executionAuthorized,false);
}
console.log('4200A PagePlan: offline hardware-envelope checks reject 1000 V/A without applying artificial derating');
