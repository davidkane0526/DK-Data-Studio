'use strict';
/* Read-only KXCI discovery using the previously tested DKTS TCP routing runtime.
 * An authenticated instrument identity is a prerequisite to querying modules.
 * No source/sweep/abort command exists in this module.
 */
const {createTcpRuntime}=require('./4200a-tcp-runtime.cjs');
const wire=require('../src/4200a-fspro/domain/kxci-wire');
const opt=require('../src/4200a-fspro/domain/kxci-opt-inventory');
const ALLOWED=new Set(['*IDN?','*OPT?']);
function validHost(host){
 return typeof host==='string'&&host.length>0&&host.length<=253&&
  /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|(?:\d{1,3}\.){3}\d{1,3})$/i.test(host);
}
function parseResponse(bytes,command){
 if(!(bytes instanceof Uint8Array)||bytes.length<2)throw Error('Empty KXCI reply: '+command);
 const decoder=wire.createDecoder({maxBytes:65536});
 const messages=decoder.push(bytes);
 if(messages.length!==1||decoder.pendingBytes()!==0)
  throw Error('Unexpected KXCI reply framing: '+command);
 if(!messages[0].text.trim())throw Error('Empty KXCI reply body: '+command);
 return messages[0];
}
async function discoverRouted({host,port=1225,timeoutMs=5000,networkMode='auto',
 interfaceName='',localAddress='',expectedSerial=''}={},runtime=createTcpRuntime()){
 if(!validHost(host))throw TypeError('Valid instrument host required');
 if(!Number.isSafeInteger(port)||port<1||port>65535)throw RangeError('Invalid port');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<250||timeoutMs>30000)throw RangeError('Invalid timeout');
 if(!['auto','ethernet','wifi','interface'].includes(networkMode))throw Error('Unrecognized network mode');
 if(typeof interfaceName!=='string'||interfaceName.length>100)throw Error('Invalid interfaceName');
 if(typeof localAddress!=='string'||localAddress.length>40)throw Error('Invalid localAddress');
 if(typeof expectedSerial!=='string'||expectedSerial.length>128)throw Error('Invalid expectedSerial');
 const opened=await runtime.open({host,port,networkMode,interfaceName,localAddress,
  connectTimeoutMs:timeoutMs,preferLinkLocalEthernet:networkMode==='auto'&&host.startsWith('169.254.')});
 const query=async command=>{
  if(!ALLOWED.has(command))throw Error('Readonly KXCI command denied');
  const encoded=wire.encode(command);
  const answer=await runtime.exchange({sessionId:opened.sessionId,
   base64:Buffer.from(encoded).toString('base64'),
   noReply:false,readTimeoutMs:timeoutMs,idleTimeoutMs:120,maxBytes:65536});
  return parseResponse(Buffer.from(answer.base64||'','base64'),command);
 };
 try{
  const idn=await query('*IDN?');
  const fields=idn.text.trim().split(',').map(x=>x.trim());
  if(fields[0]!=='KEITHLEY INSTRUMENTS'||fields[1]!=='KI4200A')throw Error('Unexpected instrument identity');
  if(expectedSerial&&fields[2]!==expectedSerial)throw Error('Instrument serial number mismatch');
  const options=await query('*OPT?');
  return Object.freeze({
   schema:'dkts.4200a.readonly-discovery.v2',verifiedIdentity:true,
   idn:idn.text.trim(),options:options.text.trim(),inventory:opt.parseOptReply(options.text),
   route:Object.freeze({
    localAddress:String(opened.localAddress||''),remoteAddress:String(opened.remoteAddress||host),
    remotePort:Number(opened.remotePort||port),interfaceName:String(opened.interfaceName||''),
    routeStrategy:String(opened.routeStrategy||'')
   }),
   rawFrames:Object.freeze([
    Object.freeze({command:'*IDN?',payloadBase64:Buffer.from(idn.bytes).toString('base64'),readOrder:0}),
    Object.freeze({command:'*OPT?',payloadBase64:Buffer.from(options.bytes).toString('base64'),readOrder:1})
   ]),
   executionAuthorized:false
  });
 }finally{
  try{await runtime.close({sessionId:opened.sessionId});}catch{}
 }
}
module.exports={discoverRouted,parseResponse};
