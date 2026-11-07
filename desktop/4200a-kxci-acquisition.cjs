'use strict';
/* Assemble KXCI DO buffers into lossless raw sample columns.
 * Invoked only with actual reply byte buffers from a trusted transport.
 * Does not generate sample values, timestamps or SMU status.
 */
const crypto=require('node:crypto');
const rawModule=require('../src/4200a-fspro/domain/native-raw-data');
const numeric=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
function rawTokens(payload,expected){
 const buffer=Buffer.isBuffer(payload)?payload:Buffer.from(payload);
 if(!buffer.length||buffer.length>4*1024*1024)throw new Error('Empty or oversized KXCI DO response');
 const text=buffer.toString('utf8').replace(/\0+$/,'').trim();
 const tokens=text.split(/[,;\s]+/).filter(Boolean);
 if(tokens.length!==expected)throw new Error('KXCI DO point count mismatch: expected '+expected+', got '+tokens.length);
 return tokens.map((token,index)=>{
  // KXCI Rev E §3-1: system mode DO readings are X±N.NNNNE±NN.
  // X=N normal, X=C compliance. These are not user-mode XYZ records.
  const match=/^([NC])([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)$/.exec(token);
  if(!match||!numeric.test(match[2])||!Number.isFinite(Number(match[2])))
   throw new Error('Invalid KXCI system-mode DO status/number at '+index+': '+token.slice(0,32));
  return Object.freeze({status:match[1],valueText:match[2],rawToken:token});
 });
}
function assemble({compiled,replies,instrumentId,captureId,startedAt}={}){
 if(!compiled||compiled.schema!=='dkts.4200a.kxci.dc-compiled.v1'||
    !Array.isArray(compiled.read)||!Number.isInteger(compiled.totalPoints))throw new TypeError('Invalid compiled DC plan');
 if(typeof instrumentId!=='string'||!/KI4200A/i.test(instrumentId))throw new Error('Verified instrument ID required');
 if(typeof captureId!=='string'||!captureId.trim()||captureId.length>128)throw new Error('Capture ID required');
 if(!Array.isArray(replies)||replies.length!==compiled.read.length)throw new Error('Missing KXCI DO buffers');
 const channels=new Map(),frames=[],names=new Set();
 for(let i=0;i<compiled.read.length;i++){
  const req=compiled.read[i],entry=replies[i];
  if(!entry||entry.command!==req.command||!(Buffer.isBuffer(entry.bytes)||entry.bytes instanceof Uint8Array))
   throw new Error('Out-of-order or non-byte KXCI DO response: '+req.command);
  if(names.has(req.name))throw new Error('Duplicate KXCI DO channel');
  names.add(req.name);
  channels.set(req.name,rawTokens(entry.bytes,compiled.totalPoints));
  frames.push({command:req.command,payloadBase64:Buffer.from(entry.bytes).toString('base64'),readOrder:i});
 }
 const x=compiled.channels.find(ch=>ch.role==='X'),p=compiled.channels.find(ch=>ch.role==='P');
 if(!x)throw new Error('Xsweep channel missing');
 const index=ch=>{const m=/^SMU([1-9])$/.exec(ch?.resource||'');if(!m)throw new Error('Invalid mapped SMU');return m[1];};
 const xi=index(x);
 if(!channels.has('V'+xi)||!channels.has('I'+xi))throw new Error('Xsweep V/I readings unavailable');
 const pi=p?index(p):null;
 const columns=[
  {id:'voltage',label:'X Voltage',unit:'V'},
  {id:'current',label:'X Current',unit:'A'}
 ];
 if(pi){if(!channels.has('V'+pi))throw new Error('Psweep voltage readings unavailable');columns.push({id:'gate_voltage',label:'P Voltage',unit:'V'});}
 for(const name of names)columns.push({id:name.toLowerCase(),label:name,unit:name.startsWith('V')?'V':'A'});
 const samples=[];
 for(let i=0;i<compiled.totalPoints;i++){
  const channelStatuses=Object.fromEntries([...names].map(name=>[name.toLowerCase(),channels.get(name)[i].status]));
  const row={index:i,sweepId:'P'+Math.floor(i/compiled.xPoints),
    voltage:channels.get('V'+xi)[i].valueText,current:channels.get('I'+xi)[i].valueText,
    channelStatuses,status:Object.values(channelStatuses).includes('C')?1:0};
  if(pi)row.gate_voltage=channels.get('V'+pi)[i].valueText;
  for(const name of names)row[name.toLowerCase()]=channels.get(name)[i].valueText;
  samples.push(row);
 }
 const canonical=JSON.stringify({prepare:compiled.prepare,start:compiled.start,read:compiled.read,metadata:compiled.metadata});
 const planHash=crypto.createHash('sha256').update(canonical).digest('hex');
 const raw={
  schema:'dkts.4200a.native.raw.v1',source:'keithley-4200a-kxci',
  instrumentId,captureId,planHash,startedAt:startedAt||new Date().toISOString(),
  status:'complete',columns,samples,rawFrames:frames
 };
 const checked=rawModule.validate(raw);if(!checked.valid)throw new Error('Native raw contract rejected: '+checked.errors.map(x=>x.code).join(','));
 return raw;
}
module.exports={rawTokens,assemble};
