'use strict';
const assert=require('node:assert/strict');
const m=require('../src/4200a-fspro/domain/kxci-opt-inventory.js');
const parsed=m.parseOptReply('SMU1,HPSMUPA2,CVU,PMURPM,VS1,VM2,');
assert.equal(parsed.slots.length,6);
assert.deepEqual(parsed.addressableSMUs.map(x=>x.resource),['SMU1','SMU2']);
assert.equal(parsed.unresolvedSlots.length,2,'PMU and CVU without channel remain unresolved (no fake mapping)');
const opt=m.toModuleCapabilities('SMU,HPSMUPA,CVU,VM',
  {instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',lineFrequencyHz:50,
    verifiedSlotMapping:{1:'SMU2',2:'SMU4'}});
assert.deepEqual(opt.smus.map(x=>[x.resource,x.model,x.preamplifier]),[['SMU2',null,false],['SMU4',null,true]]);
assert.equal(opt.executionAuthorized,false);
assert.equal(opt.readyForCompiler,false,'*OPT? never proves 4200 vs 4201 / 4210 vs 4211');
const cardRows=[
 'slotno:1,name:SMU2,model:KI4201,serialno:500001,hwver:2,fwver:3',
 'slotno:2,name:SMU4,model:KI4211,serialno:500002,hwver:4,fwver:5'
].join(',');
const audited=m.toModuleCapabilities('SMU,HPSMUPA,CVU,VM',
  {instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',lineFrequencyHz:50,
   verifiedSlotMapping:{1:'SMU2',2:'SMU4'},instrumentInfoRaw:cardRows,
   remoteModuleInfoRaw:'slotno:2,name:PA2,model:KI4200,serialno:PA123,hwver:1,fwver:2'});
assert.equal(audited.readyForCompiler,true,'physical model and serial observed for both SMUs');
assert.deepEqual(audited.smus.map(x=>[x.resource,x.model,x.modelVerified]),[
 ['SMU2','4201-SMU',true],['SMU4','4211-SMU',true]]);
const mismatch=m.toModuleCapabilities('SMU,HPSMU',
 {instrumentId:'KI4200A',lineFrequencyHz:50,verifiedSlotMapping:{1:'SMU1',2:'SMU2'},
 instrumentInfoRaw:'slotno:1,name:SMU1,model:KI4210,serialno:123,slotno:2,name:SMU2,model:KI4210,serialno:234'});
assert.equal(mismatch.readyForCompiler,false);
assert.ok(mismatch.unresolved.some(x=>x.reason==='PHYSICAL_POWER_CLASS_MISMATCH'));
assert.equal(m.parseInstrumentInfo(cardRows).length,2);
const missingPa=m.toModuleCapabilities('SMU,HPSMUPA',
 {instrumentId:'KI4200A',lineFrequencyHz:50,verifiedSlotMapping:{1:'SMU2',2:'SMU4'},
 instrumentInfoRaw:cardRows});
assert.equal(missingPa.readyForCompiler,false,'PA flag requires physical remote module evidence');
assert.ok(missingPa.unresolved.some(x=>x.reason==='PREAMPLIFIER_NOT_VERIFIED'));
const badName=m.toModuleCapabilities('SMU,HPSMUPA',
 {instrumentId:'KI4200A',lineFrequencyHz:50,verifiedSlotMapping:{1:'SMU2',2:'SMU4'},
 instrumentInfoRaw:'slotno:1,name:CVU1,model:KI4201,serialno:5,slotno:2,name:SMU4,model:KI4211,serialno:6',
 remoteModuleInfoRaw:'slotno:2,name:PA2,model:KI4200,serialno:PA123'});
assert.equal(badName.readyForCompiler,false,'CVU card cannot masquerade as SMU despite numeric model substring');
const unknown=m.toModuleCapabilities('SMU,SMUPA,NOTAMODULE', {instrumentId:'KI4200A',lineFrequencyHz:50});
assert.equal(unknown.readyForCompiler,false);
assert.equal(unknown.unresolved.length,3);
assert.throws(()=>m.toModuleCapabilities('SMU1,SMU2',{instrumentId:'FAKE',lineFrequencyHz:50}),/IDN/);
assert.throws(()=>m.toModuleCapabilities('SMU1,SMU2',{instrumentId:'KI4200A',lineFrequencyHz:0}),/frequency/);
assert.throws(()=>m.toModuleCapabilities('SMU,HPSMU',{instrumentId:'KI4200A',lineFrequencyHz:50,verifiedSlotMapping:{1:'SMU1',2:'SMU1'}}),/Duplicate/);
assert.throws(()=>m.parseOptReply('SMU1,'.repeat(10)),/up to eight/);
console.log('4200A *OPT? module mapping: conservative slot parsing; no fabricated KCon assignments');
