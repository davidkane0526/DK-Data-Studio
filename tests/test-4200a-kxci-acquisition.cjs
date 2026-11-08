'use strict';
const assert=require('node:assert/strict');
const dc=require('../src/4200a-fspro/domain/kxci-dc-compiler');
const raw=require('../src/4200a-fspro/domain/native-raw-data');
const {assemble,rawTokens}=require('../desktop/4200a-kxci-acquisition.cjs');
const capabilities={schema:'dkts.4200a.module-capabilities.v1',instrumentId:'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14',
 lineFrequencyHz:50,smus:[1,2].map(n=>({resource:'SMU'+n,model:'4200-SMU',preamplifier:false}))};
const page={schema:'dkts.fspro.page.v1',info:{testType:'DC'},
 strategy:{scope:'Local Setting',method:'Custom',integrationTime:'0.02',delayTime:'0.04',sourceRange:'Auto',measureRange:'Auto'},
 terminals:[
  {logical:'S',resource:'SMU1',role:'CONDITION',sourceMode:'voltage',relativeTo:'GND',generator:'Constant',bias:'0',compliance:'0.001',measureRange:{mode:'auto'}},
  {logical:'D',resource:'SMU2',role:'X',sourceMode:'voltage',relativeTo:'S',generator:'Linear Step',start:'0',stop:'0.2',step:'0.1',compliance:'0.001',measureRange:{mode:'auto'}}
 ]};
const compiled=dc.compile(page,{capabilities});assert.equal(compiled.totalPoints,3);
const nums=['N+0','N+1.234567890123E-9','C-2.3000e-6'];
const replies=compiled.read.map((q,i)=>({command:q.command,bytes:Buffer.from(nums.map((v,j)=>(j===2&&i===1?'C':'N')+'+'+String(i+j+1)+'e-7').join(',')+'\0','utf8')}));
const capture=assemble({compiled,replies,instrumentId:capabilities.instrumentId,captureId:'OFFLINE-MOCK-ONLY',startedAt:'2026-11-08T00:00:00Z'});
assert.equal(raw.validate(capture).valid,true);
assert.equal(capture.samples.length,3);
assert.equal(capture.columns.some(c=>c.id==='voltage'),true);
assert.equal(capture.columns.some(c=>c.id==='current'),true);
assert.equal(capture.rawFrames.length,4);
assert.equal(capture.samples[0].status,0,'N status recorded');
assert.equal(capture.samples[2].status,1,'C compliance recorded');
assert.equal(capture.samples[2].channelStatuses.i1,'C','per-channel status recorded');
assert.ok(raw.toCSV(capture).includes('X Voltage (V)'));
assert.deepEqual(rawTokens(Buffer.from(nums.join(';')),3).map(x=>x.rawToken),nums);
assert.deepEqual(rawTokens(Buffer.from('1.234E-8,-5.0000000000E-9,+0.00000001'),3).map(x=>x.status),
 [null,null,null],'DO section 5 numeric-only data has no fabricated compliance flags');
const numericOnly=replies.map((row,i)=>({command:row.command,
 bytes:Buffer.from(['+0','-1.2000000000E-8','2.345E-9'].join(',')+'\\0','utf8')}));
const numerical=assemble({compiled,replies:numericOnly,instrumentId:capabilities.instrumentId,
 captureId:'OFFLINE-MOCK-PLAIN',startedAt:'2026-11-08T00:00:00Z'});
assert.equal(numerical.nativeStatusCoverage,'unavailable');
assert.equal(numerical.samples[0].status,undefined,'plain DO cannot invent N status');
assert.equal(numerical.samples[0].channelStatuses,undefined,'no fake per-channel flags');
assert.ok(raw.toCSV(numerical).includes('-1.2000000000E-8'),'plain numeric precision preserved');
const mixed=replies.map((row,i)=>({command:row.command,
 bytes:Buffer.from(i===0?'N+0,N+0,C+2':'0,-1.2e-8,2.0e-9','utf8')}));
const partial=assemble({compiled,replies:mixed,instrumentId:capabilities.instrumentId,
 captureId:'OFFLINE-MOCK-MIXED'});
assert.equal(partial.nativeStatusCoverage,'partial');
assert.equal(partial.samples[1].status,undefined);
assert.equal(partial.samples[2].status,1,'genuine C always flags compliance, even if other channels omitted status');
assert.throws(()=>rawTokens(Buffer.from('N+1;N+2'),3),/count mismatch/);
assert.throws(()=>rawTokens(Buffer.from('N+1;NaN;C+3'),3),/Invalid KXCI/);
const corrupted=replies.map(x=>({...x}));
corrupted[0].command='DO \'I9\'';
assert.throws(()=>assemble({compiled,replies:corrupted,instrumentId:capabilities.instrumentId,captureId:'TEST'}),/Out-of-order/);
assert.throws(()=>assemble({compiled,replies,instrumentId:'FAKE',captureId:'TEST'}),/instrument ID/);
assert.deepEqual(capture.rawFrames.map(x=>Buffer.from(x.payloadBase64,'base64').toString('utf8')),replies.map(x=>x.bytes.toString('utf8')));
console.log('4200A offline DO acquisition fixture: exact numeric text and original response bytes preserved');
