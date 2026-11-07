'use strict';
const assert=require('node:assert/strict');
const d=require('../src/4200a-fspro/domain/native-raw-data');
const raw=()=>({
 schema:'dkts.4200a.native.raw.v1',
 source:'keithley-4200a-kxci',
 captureId:'4200A-capture-0001',instrumentId:'KI4200A,serial-test-only',
 planHash:'a'.repeat(64),startedAt:'2026-11-07T00:00:00.000Z',
 columns:[{id:'time',label:'Time',unit:'s'},{id:'voltage',label:'Voltage',unit:'V'},{id:'current',label:'Current',unit:'A'}],
 samples:[{index:0,sweepId:'s1',status:0,time:'0.000000000',voltage:'0',current:'1.234567890123e-9'},
          {index:1,sweepId:'s1',status:0,time:'0.010000000',voltage:'0.1',current:'-5.0000000000e-8'},
          {index:2,sweepId:'s2',status:0,time:'0.020000000',voltage:'0.2',current:null}],
 rawFrames:[{command:'GN',readOrder:0,payloadBase64:'VEVTVA=='}],status:'complete'
});
const fail=(code,mutate)=>{const r=raw();mutate(r);const v=d.validate(r);assert.equal(v.valid,false,code);assert.ok(v.errors.some(x=>x.code===code),JSON.stringify(v.errors));};
assert.equal(d.validate(raw()).valid,true);
const csv=d.toCSV(raw());assert.ok(csv.includes('1.234567890123e-9'),'must retain source precision');assert.ok(csv.includes('-5.0000000000e-8'));assert.ok(csv.includes('0.2,\r\n'),'null raw values remain blank');
const traces=d.traces(raw(),{x:'voltage',y:'current'});assert.equal(traces.length,1,'invalid sample excluded');assert.equal(traces[0].x.length,2);assert.equal(traces[0].meta.source,d.SOURCE);
fail('SOURCE',r=>{r.source='simulation';});
fail('PLAN_HASH',r=>{r.planHash='unknown';});
fail('INVALID_DATUM',r=>{r.samples[0].current='Infinity';});
fail('SAMPLE_ORDER',r=>{r.samples[1].index=0;});
fail('MISSING_RAW_FRAMES',r=>{r.rawFrames=[];});
fail('DUPLICATE_COLUMN',r=>{r.columns[2].id='voltage';});
fail('ROW_LIMIT',r=>{r.samples.push({...r.samples[0],index:3});});
assert.equal(d.validate(raw(),{limit:2}).valid,false,'sample bound');
assert.throws(()=>d.traces(raw(),{x:'missing',y:'current'}),/Plot columns not found/);
console.log('4200A native raw contract: precision/provenance/index/column/sweep/CSV verified in offline tests only');
