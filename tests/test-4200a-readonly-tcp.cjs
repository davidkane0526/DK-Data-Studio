'use strict';
const assert=require('node:assert/strict');
const net=require('node:net');
const {discover,ReadonlyKXCISocket}=require('../desktop/4200a-readonly-discovery.cjs');
async function mockServer(responder){
 const commands=[];
 const server=net.createServer(socket=>{
  let pending='';
  socket.on('data',chunk=>{
   pending+=chunk.toString('latin1');
   while(pending.includes('\0')){
    const pos=pending.indexOf('\0'),cmd=pending.slice(0,pos);pending=pending.slice(pos+1);commands.push(cmd);
    const response=responder(cmd);
    if(response!==undefined)socket.write(response+'\0');
   }
  });
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,commands,port:server.address().port,close:()=>new Promise(r=>server.close(r))};
}
(async()=>{
 const a=await mockServer(cmd=>cmd==='*IDN?'?'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14':cmd==='*OPT?'?'SMU1,HPSMUPA2,CVU':undefined);
 try{
  const result=await discover({host:'127.0.0.1',port:a.port,timeoutMs:2000});
  assert.equal(result.verifiedIdentity,true);
  assert.equal(result.executionAuthorized,false);
  assert.deepEqual(a.commands,['*IDN?','*OPT?']);
  assert.deepEqual(result.inventory.addressableSMUs.map(x=>x.resource),['SMU1','SMU2']);
  assert.equal(Buffer.from(result.rawFrames[0].payloadBase64,'base64').toString('utf8'),result.idn);
  const socket=new ReadonlyKXCISocket({host:'127.0.0.1',port:a.port});
  await socket.connect();
  await assert.rejects(()=>socket.query('ME1'),/Only \*IDN\? and \*OPT\?/);
  assert.throws(()=>new ReadonlyKXCISocket({host:'127.0.0.1\nME1'}),/host/);
  socket.close();
 }finally{await a.close();}
 const b=await mockServer(cmd=>cmd==='*IDN?'?'FAKE,123,0,0':'SMU1');
 try{
  await assert.rejects(()=>discover({host:'127.0.0.1',port:b.port,timeoutMs:2000}),/Unexpected instrument identity/);
  assert.deepEqual(b.commands,['*IDN?']);
 }finally{await b.close();}
 console.log('4200A KXCI TCP discovery: loopback socket test passed; query whitelist and identity gate enforced');
})().catch(err=>{console.error(err);process.exitCode=1;});
