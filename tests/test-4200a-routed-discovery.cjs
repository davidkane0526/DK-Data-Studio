'use strict';
const assert=require('node:assert/strict');
const net=require('node:net');
const {discoverRouted,openReadonlySession}=require('../desktop/4200a-routed-discovery.cjs');
const {resolveLocalCandidates}=require('../desktop/4200a-tcp-runtime.cjs');
async function serverFor(optionsFn){
 const commands=[];
 const server=net.createServer(socket=>{
  let buf='';
  socket.on('data',bytes=>{
   buf+=bytes.toString('utf8');
   while(buf.includes('\0')){
    const n=buf.indexOf('\0'),command=buf.slice(0,n);buf=buf.slice(n+1);commands.push(command);
    socket.write((optionsFn(command)||'')+'\0');
   }
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {commands,port:server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
(async()=>{
 const srv=await serverFor(command=>command==='*IDN?'?'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14':'SMU1,SMUPA2,CVU3');
 try{
  const found=await discoverRouted({host:'127.0.0.1',port:srv.port,timeoutMs:2000,expectedSerial:'1498377'});
  assert.equal(found.verifiedIdentity,true);
  assert.equal(found.executionAuthorized,false);
  assert.equal(found.route.remotePort,srv.port);
  assert.equal(found.inventory.slots.length,3);
  assert.deepEqual(found.inventory.addressableSMUs.map(x=>x.resource),['SMU1','SMU2']);
  assert.deepEqual(srv.commands,['*IDN?','*OPT?']);
  assert.equal(Buffer.from(found.rawFrames[0].payloadBase64,'base64').toString(),'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14');
  const held=await openReadonlySession({host:'127.0.0.1',port:srv.port,timeoutMs:1000,expectedSerial:'1498377'});
  assert.equal(held.isConnected(),true,'read-only socket stays connected after identity');
  assert.equal(held.summary.verifiedIdentity,true);
  assert.equal(typeof held.sendCommand,'undefined','never expose generic KXCI sender');
  assert.equal(await held.disconnect(),true);
  assert.equal(held.isConnected(),false,'explicit disconnect releases the socket');
  assert.equal(await held.disconnect(),false,'idempotent disconnect');
  await assert.rejects(()=>discoverRouted({host:'127.0.0.1',port:srv.port,timeoutMs:1000,expectedSerial:'unexpected'}),/serial number mismatch/);
  assert.deepEqual(srv.commands.slice(-1),['*IDN?'],'must not query modules after serial mismatch');
 }finally{await srv.close();}
 const simulatedInterfaces={
  Ethernet:[{family:'IPv4',address:'169.254.111.115',internal:false}],
  WiFi:[{family:'IPv4',address:'192.168.1.5',internal:false}]
 };
 const candidates=resolveLocalCandidates({host:'169.254.111.118',networkMode:'auto',preferLinkLocalEthernet:true},simulatedInterfaces);
 assert.equal(candidates[0].address,'169.254.111.115','reuse DKTS verified local Ethernet source');
 assert.ok(candidates.some(c=>c.address==='192.168.1.5'),'Wi-Fi as secondary candidate');
 assert.ok(candidates.some(c=>c.routeStrategy==='system-routing'),'last OS routing fallback');
 const invalid=async x=>assert.rejects(()=>discoverRouted(x),/host|port|timeout|network mode/);
 await invalid({host:'127.0.0.1\nME1'});
 await invalid({host:'127.0.0.1',port:-1});
 await invalid({host:'127.0.0.1',timeoutMs:1});
 console.log('4200A routed read-only discovery: loopback, serial gating, Ethernet and Wi-Fi route candidates passed');
})().catch(err=>{console.error(err);process.exitCode=1});
