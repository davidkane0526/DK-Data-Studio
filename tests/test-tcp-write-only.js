'use strict';
const assert=require('assert');
const net=require('net');
const {createTcpRuntime}=require('../desktop/main-modules/tcp-runtime');

(async()=>{
  const received=[];
  const server=net.createServer(socket=>{
    let pending='';
    socket.on('data',chunk=>{
      pending+=chunk.toString('ascii');
      while(pending.includes('\0')){
        const end=pending.indexOf('\0');
        const command=pending.slice(0,end+1);
        pending=pending.slice(end+1);
        received.push(command);
        if(command==='*IDN?\0')socket.write('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14\0');
        // UL and DE intentionally produce no response, matching KXCI write semantics.
      }
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const runtime=createTcpRuntime({networkInterfaces:()=>({})});
  let opened=null;
  try{
    opened=await runtime.open({host:'127.0.0.1',port:server.address().port,networkMode:'auto',connectTimeoutMs:1000});
    const encode=value=>Buffer.from(value,'ascii').toString('base64');
    const ul=await runtime.exchange({sessionId:opened.sessionId,base64:encode('UL\0'),noReply:true,readTimeoutMs:250,idleTimeoutMs:20,maxBytes:1024});
    assert.strictEqual(ul.bytesRead,0);
    const identity=await runtime.exchange({sessionId:opened.sessionId,base64:encode('*IDN?\0'),readTimeoutMs:1000,idleTimeoutMs:30,maxBytes:1024});
    assert.match(Buffer.from(identity.base64,'base64').toString('ascii'),/KEITHLEY INSTRUMENTS,KI4200A/);
    const de=await runtime.exchange({sessionId:opened.sessionId,base64:encode('DE\0'),noReply:true,readTimeoutMs:250,idleTimeoutMs:20,maxBytes:1024});
    assert.strictEqual(de.bytesRead,0);
    await assert.rejects(()=>runtime.exchange({sessionId:opened.sessionId,base64:encode('EX unsafe\0'),noReply:true}),/restricted to fixed KXCI UL\/DE/);
    assert.deepStrictEqual(received,['UL\0','*IDN?\0','DE\0']);
  }finally{
    if(opened)await runtime.close({sessionId:opened.sessionId});
    await new Promise(resolve=>server.close(resolve));
  }
  console.log('Write-only TCP exchange semantics PASS.');
})().catch(error=>{console.error(error);process.exitCode=1;});
