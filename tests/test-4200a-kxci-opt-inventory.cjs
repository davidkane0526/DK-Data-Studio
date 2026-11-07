'use strict';
const assert=require('node:assert/strict');
const m=require('../src/4200a-fspro/domain/kxci-opt-inventory.js');
const parsed=m.parseOptReply('SMU1,HPSMUPA2,CVU,PMURPM,VS1,VM2,');
assert.equal(parsed.slots.length,7);
assert.deepEqual(parsed.addressableSMUs.map(x=>x.resource),['SMU1','SMU2']);
assert.equal(parsed.unresolvedSlots.length,2,'PMU and CVU without channel remain unresolved (no fake mapping)');
const opt=m.toModuleCapabilities('SMU,HPSMUPA,CVU,VM',
  {instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',lineFrequencyHz:50,
    verifiedSlotMapping:{1:'SMU2',2:'SMU4'}});
assert.deepEqual(opt.smus.map(x=>[x.resource,x.model,x.preamplifier]),[['SMU2','4200-SMU',false],['SMU4','4210-SMU',true]]);
assert.equal(opt.executionAuthorized,false);
assert.equal(opt.readyForCompiler,true);
const unknown=m.toModuleCapabilities('SMU,SMUPA,NOTAMODULE', {instrumentId:'KI4200A',lineFrequencyHz:50});
assert.equal(unknown.readyForCompiler,false);
assert.equal(unknown.unresolved.length,3);
assert.throws(()=>m.toModuleCapabilities('SMU1,SMU2',{instrumentId:'FAKE',lineFrequencyHz:50}),/IDN/);
assert.throws(()=>m.toModuleCapabilities('SMU1,SMU2',{instrumentId:'KI4200A',lineFrequencyHz:0}),/frequency/);
assert.throws(()=>m.toModuleCapabilities('SMU,HPSMU',{instrumentId:'KI4200A',lineFrequencyHz:50,verifiedSlotMapping:{1:'SMU1',2:'SMU1'}}),/Duplicate/);
assert.throws(()=>m.parseOptReply('SMU1,'.repeat(10)),/up to eight/);
console.log('4200A *OPT? module mapping: conservative slot parsing; no fabricated KCon assignments');
