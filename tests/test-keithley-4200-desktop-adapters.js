#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const net=require('node:net');
const {resolveLocalAddress,resolveLocalCandidates,createTcpRuntime}=require('../desktop/main-modules/tcp-runtime');
const interfaces={
  'Ethernet':[{family:'IPv4',address:'169.254.111.116',internal:false}],
  'Wi-Fi':[{family:'IPv4',address:'10.87.70.30',internal:false}],
  'Loopback':[{family:'IPv4',address:'127.0.0.1',internal:true}]
};
const target={host:'169.254.111.118',port:1225};
assert.deepEqual(resolveLocalAddress({...target,networkMode:'auto'},interfaces),
  {address:'',interfaceName:'',networkMode:'auto',routeStrategy:'system-routing'});
assert.equal(resolveLocalAddress({...target,networkMode:'auto',preferLinkLocalEthernet:true},interfaces).address,'169.254.111.116');
assert.equal(resolveLocalAddress({...target,networkMode:'ethernet'},interfaces).interfaceName,'Ethernet');
assert.equal(resolveLocalAddress({...target,networkMode:'ethernet'}, {'以太网 2':[{family:'IPv4',address:'169.254.111.116',internal:false}]}).interfaceName,'以太网 2');
assert.equal(resolveLocalAddress({host:'192.168.3.8',networkMode:'wifi'}, {'无线网络连接':[{family:'IPv4',address:'192.168.3.9',internal:false}]}).interfaceName,'无线网络连接');
assert.equal(resolveLocalAddress({...target,networkMode:'interface',interfaceName:'Ethernet'},interfaces).address,'169.254.111.116');
assert.equal(resolveLocalAddress({host:'10.87.70.31',networkMode:'wifi'},interfaces).address,'10.87.70.30');
assert.equal(resolveLocalAddress({...target,networkMode:'wifi'},interfaces).address,'10.87.70.30');
assert.equal(resolveLocalAddress({...target,networkMode:'wifi'},interfaces).routeStrategy,'wifi-route-required');
assert.throws(()=>resolveLocalAddress({...target,networkMode:'interface',interfaceName:'Ethernet'}, {'Ethernet':[{family:'IPv4',address:'192.168.1.3',internal:false}]}),/169\.254/);
assert.throws(()=>resolveLocalAddress({...target,networkMode:'ethernet'}, {...interfaces,'Ethernet 2':[{family:'IPv4',address:'169.254.111.117',internal:false}]}),/Several ethernet adapters/);
assert.throws(()=>resolveLocalAddress({...target,localAddress:'__invalid__'},interfaces),/IPv4/);
const allCandidates=resolveLocalCandidates({...target,networkMode:'auto',preferLinkLocalEthernet:true},{
  'Ethernet A':[{family:'IPv4',address:'169.254.111.116',internal:false}],
  'Ethernet B':[{family:'IPv4',address:'169.254.111.117',internal:false}],
  'Wi-Fi':[{family:'IPv4',address:'10.87.70.30',internal:false}]
});
assert.deepEqual(allCandidates.slice(0,3).map(x=>x.address),['169.254.111.116','169.254.111.117','10.87.70.30']);
assert.equal(allCandidates.at(-1).routeStrategy,'system-routing','Auto probing must retain OS routing as a last resort.');
assert.equal(resolveLocalCandidates({...target,networkMode:'ethernet'},{
  'Ethernet A':[{family:'IPv4',address:'169.254.111.116',internal:false}],
  'Ethernet B':[{family:'IPv4',address:'169.254.111.117',internal:false}]
}).length,2,'Ethernet mode must enumerate every matching adapter instead of failing on ambiguity.');


// Validate real Node TCP exchange on local loopback WITHOUT a connected Keithley.
async function main(){
 const server=net.createServer(socket=>socket.on('data',bytes=>{
   assert.deepEqual([...bytes],[42,73,68,78,63,0]);
   socket.write(Buffer.from('KEITHLEY INSTRUMENTS,KI4200A,TEST,V0\0','utf8'));
 }));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

 const probeTcp=createTcpRuntime({networkInterfaces:()=>({
   'Ethernet A':[{family:'IPv4',address:'192.0.2.10',internal:false}],
   'Ethernet B':[{family:'IPv4',address:'127.0.0.1',internal:false}]
 })});
 const tcp=createTcpRuntime();
 try{

   const probed=await probeTcp.open({host:'127.0.0.1',port:server.address().port,networkMode:'ethernet',connectTimeoutMs:2000});
   assert.equal(probed.interfaceName,'Ethernet B','TCP runtime must continue to the next adapter when the first source IP cannot bind.');
   assert.equal(probed.localAddress,'127.0.0.1');
   await probeTcp.close({sessionId:probed.sessionId});
   probeTcp.closeAll();
   const opened=await tcp.open({host:'127.0.0.1',port:server.address().port,networkMode:'auto',connectTimeoutMs:2000});
   assert.equal(opened.routeStrategy,'system-routing');
   const response=await tcp.exchange({sessionId:opened.sessionId,base64:Buffer.from('*IDN?\0').toString('base64'),
     readTimeoutMs:2000,idleTimeoutMs:25,maxBytes:2048});
   assert.match(Buffer.from(response.base64,'base64').toString(),/^KEITHLEY INSTRUMENTS,KI4200A,TEST/);
   await tcp.close({sessionId:opened.sessionId});
 } finally {tcp.closeAll();server.close();}
 console.log('4200 desktop adapter selection, ambiguity guard and TCP identity test PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
