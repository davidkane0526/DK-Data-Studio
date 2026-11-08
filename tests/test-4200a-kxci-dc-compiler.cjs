'use strict';
const assert=require('node:assert/strict');
const dc=require('../src/4200a-fspro/domain/kxci-dc-compiler');
const inv=()=>({schema:'dkts.4200a.module-capabilities.v1',instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',
 lineFrequencyHz:50,smus:[1,2,3].map(n=>({resource:'SMU'+n,model:'4200-SMU',preamplifier:false}))});
const page=()=>({schema:'dkts.fspro.page.v1',info:{testType:'DC'},strategy:{
 scope:'Local Setting',method:'Custom',integrationTime:'0.02',delayTime:'0.04',sourceRange:'Auto',measureRange:'Auto'},
 terminals:[
 {logical:'S',resource:'SMU1',role:'CONDITION',sourceMode:'voltage',relativeTo:'GND',generator:'Constant',bias:'0',compliance:'1e-3',measureRange:{mode:'auto'},segments:[]},
 {logical:'D',resource:'SMU2',role:'X',sourceMode:'voltage',relativeTo:'S',generator:'Linear Step',start:'0',stop:'1',step:'0.1',compliance:'1e-3',measureRange:{mode:'auto'},segments:[]},
 {logical:'G',resource:'SMU3',role:'P',sourceMode:'voltage',relativeTo:'S',generator:'Linear Points',start:'-1',stop:'1',points:'5',compliance:'1e-3',measureRange:{mode:'auto'},segments:[]}
]});
const fail=(code,change,env=inv())=>{
 const p=page();change(p,env);assert.throws(()=>dc.compile(p,{capabilities:env}),e=>e.code===code,code);
};
const out=dc.compile(page(),{capabilities:inv()});
assert.equal(out.executionAuthorized,false);
assert.equal(out.totalPoints,55);
assert.deepEqual(out.prepare.map(x=>x.command).filter(x=>/^(?:CH|VC|VR|VP|IT|DT|LI|ST)/.test(x)),[
 "CH1,'V1','I1',1,3","CH2,'V2','I2',1,1","CH3,'V3','I3',1,2",
 'VC1,0,0.001','ST 1,1','ST 2,1','ST 3,1',
 'VR1,0,1,0.1,0.001','VP -1,0.5,5,0.001','DT 0.04','IT4,0,0,1',"LI 'V1','I1','V2','I2','V3','I3'"
]);
assert.deepEqual(out.start.map(x=>x.command),['MD','ME1']);
assert.deepEqual(out.stop.map(x=>x.command),['MD','ME4','DE','CH1','CH2','CH3']);
assert.equal(out.poll.command,'SP');assert.equal(out.read.length,6);
fail('HARDWARE_LIMIT',p=>p.terminals[1].stop='1000');
fail('HARDWARE_LIMIT',p=>p.terminals[2].compliance='2');
fail('KXCI_CLAMPED_COMPLIANCE',p=>p.terminals[0].compliance='1e-10');
fail('KXCI_POINT_LIMIT',p=>{p.terminals[1].stop='102.5';p.terminals[1].step='0.1'});
fail('KXCI_POINT_LIMIT',p=>p.terminals[2].points='33');
const singleVar2=page();
singleVar2.terminals[2].start='0.5';
singleVar2.terminals[2].stop='0.5';
singleVar2.terminals[2].points='1';
const onePoint=dc.compile(singleVar2,{capabilities:inv()});
assert.equal(onePoint.pPoints,1,'VAR2 supports one point per KXCI manual');
assert.equal(onePoint.totalPoints,onePoint.xPoints);
assert.ok(onePoint.prepare.some(x=>x.command==='VP 0.5,0,1,0.001'));
fail('SINGLE_POINT_ENDPOINT_MISMATCH',p=>{p.terminals[2].points='1';p.terminals[2].stop='3';});
fail('STEP_DIRECTION_OR_DIVISION',p=>p.terminals[1].step='-0.1');
fail('STEP_DIRECTION_OR_DIVISION',p=>p.terminals[1].step='0.3');
fail('UNVERIFIED_RESOURCE',p=>p.terminals[1].resource='SMU4');
fail('DUPLICATE_RESOURCE',p=>p.terminals[1].resource='SMU1');
fail('FIXED_RANGE_NOT_COMPILED',p=>p.terminals[1].measureRange={mode:'fixed',value:'1e-3'});
fail('DYNAMIC_REFERENCE_UNSUPPORTED',p=>p.terminals[0].relativeTo='G');
fail('REFERENCE_CYCLE',p=>p.terminals[0].relativeTo='S');
fail('SEGMENTS_UNSUPPORTED',p=>p.terminals[1].segments=[{generator:'Linear Step'}]);
fail('TEST_MODE_UNSUPPORTED',p=>p.info.testType='Pulse');
fail('KXCI_DELAY_LIMIT',p=>p.strategy.delayTime='8');
fail('INTEGRATION_PLC_LIMIT',p=>p.strategy.integrationTime='2');
const four=page(),fourInventory=inv();
fourInventory.smus.push({resource:'SMU4',model:'4200-SMU',preamplifier:false});
four.terminals.push({...four.terminals[0],logical:'B',resource:'SMU4'});
four.outputs='Ib,Vgs';
const fourCompiled=dc.compile(four,{capabilities:fourInventory});
assert.deepEqual(fourCompiled.metadata.capturedFunctions,['V2','I2','V3','I3','I4','V1'],'four real channels with six explicitly selected functions');
assert.equal(fourCompiled.channels.length,4,'do not invent a three-SMU software limit');
assert.equal(fourCompiled.read.length,6);
fail('KXCI_LI_MAX_SIX_FUNCTIONS',p=>{
 p.terminals.push({...p.terminals[0],logical:'B',resource:'SMU4'});
 p.captureFunctions=['V1','I1','V4','I4'];
},{...fourInventory});
fail('OUTPUT_FUNCTION_UNSUPPORTED',p=>p.outputs='VnotMapped');
fail('SWEEP_UNSUPPORTED',p=>p.terminals[1].generator='Log Points');
fail('KXCI_VOLTAGE_QUANTIZATION',p=>{p.terminals[1].stop='0.001';p.terminals[1].step='0.0001';});
fail('INVALID_NUMBER',p=>p.terminals[0].bias='0;*RST');
fail('CURRENT_REFERENCE_UNSUPPORTED',p=>{p.terminals[1].sourceMode='current';p.terminals[1].relativeTo='S'});
const p=page();p.terminals[1].sourceMode='current';p.terminals[1].relativeTo='GND';p.terminals[1].start='0';p.terminals[1].stop='0.01';p.terminals[1].step='0.001';p.terminals[1].compliance='10';
const q=dc.compile(p,{capabilities:inv()});
assert.ok(q.prepare.some(x=>x.command==='IR1,0,0.01,0.001,10'));
const high=inv();high.smus[1].model='4210-SMU';p.terminals[1].stop='0.5';p.terminals[1].step='0.01';
assert.equal(dc.compile(p,{capabilities:high}).xPoints,51);
assert.deepEqual(dc.compile(page(),{capabilities:inv()}).prepare,out.prepare,'deterministic compiler');
console.log('4200A native KXCI DC compiler: checked published syntax, I/V hardware ceilings, reference semantics, no output authorization');
