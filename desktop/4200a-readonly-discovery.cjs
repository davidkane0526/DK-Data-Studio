'use strict';
/* Isolated, read-only 4200A KXCI discovery transport.
 * Only *IDN? and *OPT? are accepted by the public API. No source output.
 * KCon ethernet settings: String Terminator (NUL); network port generally 1225.
 */
const net=require('node:net');
const wire=require('../src/4200a-fspro/domain/kxci-wire');
const opt=require('../src/4200a-fspro/domain/kxci-opt-inventory');
const ALLOWED=new Set(['*IDN?','*OPT?']);
function isHost(value){
 return typeof value==='string'&&value.length<=255&&
  /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)*|(?:\d{1,3}\.){3}\d{1,3})$/i.test(value)&&
  !/[\s\x00-\x1F\x7F]/.test(value);
}
class ReadonlyKXCISocket {
 constructor({host,port=1225,timeoutMs=4500,maxReplyBytes=64*1024}={}){
  if(!isHost(host))throw new TypeError('Valid IP or DNS host is required');
  if(!Number.isSafeInteger(port)||port<1||port>65535)throw new RangeError('Invalid port');
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new RangeError('Invalid timeout');
  this.host=host;this.port=port;this.timeoutMs=timeoutMs;
  this.decoder=wire.createDecoder({maxBytes:maxReplyBytes});
  this.socket=null;this.pending=null;this.connected=false;this.closed=false;
 }
 async connect(){
  if(this.connected)return true;
  if(this.closed)throw new Error('KXCI connection already closed');
  const socket=net.createConnection({host:this.host,port:this.port});
  this.socket=socket;
  socket.setNoDelay(true);
  socket.on('data',bytes=>{
   try{
    const replies=this.decoder.push(bytes);
    if(replies.length>1||!this.pending&&replies.length)throw new Error('Unsolicited or multiple KXCI responses');
    for(const reply of replies){
     const active=this.pending;if(!active)throw new Error('Unexpected KXCI response');
     this.pending=null;clearTimeout(active.timer);
     if(!reply.text.trim())active.reject(new Error('Empty KXCI response'));
     else active.resolve(reply);
    }
   }catch(err){this.fail(err);}
  });
  socket.on('error',err=>this.fail(err));
  socket.on('close',()=>{this.connected=false;this.fail(new Error('KXCI socket closed'));});
  try{
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('KXCI connection timeout')),this.timeoutMs);
    socket.once('connect',()=>{clearTimeout(timer);resolve();});
    socket.once('error',err=>{clearTimeout(timer);reject(err);});
   });
   this.connected=true;return true;
  }catch(err){this.close();throw err;}
 }
 fail(err){
  const active=this.pending;
  this.pending=null;
  if(active){clearTimeout(active.timer);active.reject(err);}
  if(this.socket&&!this.socket.destroyed)this.socket.destroy();
 }
 async query(command){
  if(!ALLOWED.has(command))throw new Error('Only *IDN? and *OPT? are permitted in read-only discovery');
  if(!this.connected||!this.socket||this.socket.destroyed)throw new Error('KXCI socket not connected');
  if(this.pending)throw new Error('Concurrent KXCI queries are forbidden');
  const payload=Buffer.from(wire.encode(command));
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>this.fail(new Error('KXCI reply timeout: '+command)),this.timeoutMs);
   this.pending={resolve,reject,timer};
   this.socket.write(payload,err=>{if(err)this.fail(err);});
  });
 }
 close(){this.closed=true;this.connected=false;this.socket?.destroy();this.socket=null;}
}
async function discover({host,port=1225,timeoutMs=4500}={}){
 const socket=new ReadonlyKXCISocket({host,port,timeoutMs});
 try{
  await socket.connect();
  const idn=await socket.query('*IDN?');
  if(!/KEITHLEY INSTRUMENTS\s*,\s*KI?4200A/i.test(idn.text) &&
     !/KEITHLEY INSTRUMENTS\s*,\s*MODEL 4200A/i.test(idn.text))
   throw new Error('Unexpected instrument identity; refusing further commands');
  const options=await socket.query('*OPT?');
  const inventory=opt.parseOptReply(options.text);
  return Object.freeze({
   schema:'dkts.4200a.readonly-discovery.v1',verifiedIdentity:true,
   idn:idn.text.trim(),options:options.text.trim(),
   inventory,
   // For auditing, preserve the literal returned bytes before decoding.
   rawFrames:Object.freeze([
    Object.freeze({command:'*IDN?',payloadBase64:Buffer.from(idn.bytes).toString('base64'),readOrder:0}),
    Object.freeze({command:'*OPT?',payloadBase64:Buffer.from(options.bytes).toString('base64'),readOrder:1})
   ]),
   executionAuthorized:false
  });
 }finally{socket.close();}
}
if(require.main===module){
 const [host,portText]=process.argv.slice(2);
 discover({host,port:portText?Number(portText):1225})
  .then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n'))
  .catch(err=>{console.error('Readonly 4200A discovery failed: '+err.message);process.exitCode=1;});
}
module.exports={ReadonlyKXCISocket,discover};
