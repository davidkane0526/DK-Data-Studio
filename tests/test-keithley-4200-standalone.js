#!/usr/bin/env node
'use strict';
// End-to-end, offline extraction test: run the exported CLI against a fake TCP KI4200A.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const cp=require('node:child_process');
const {promisify}=require('node:util');
const execFile=promisify(cp.execFile);
const root=path.resolve(__dirname,'..');
const cliRelative='tools/4200-extract/identify.js';
async function execute(file,args){
  return execFile(process.execPath,[file,...args],{timeout:10000,maxBuffer:65536,windowsHide:true});
}
async function main(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dkds-4200-standalone-'));
  const output=path.join(dir,'export');
  const extraction=path.join(root,'tools/4200-extract/extract.js');
  let server;
  try{
    const verified=await execute(extraction,['--verify']);
    assert.match(verified.stdout,/extraction verified/);
    const copied=await execute(extraction,['--output',output]);
    assert.match(copied.stdout,/copied to/);
    const cli=path.join(output,cliRelative);
    assert(fs.existsSync(cli),'Exported read-only CLI missing.');
    assert(fs.existsSync(path.join(output,'src/plugins/keithley-4200/kxci-protocol.js')));
    assert(fs.existsSync(path.join(output,'desktop/main-modules/tcp-runtime.js')));
    const help=await execute(cli,['--help']);
    assert.match(help.stdout,/read-only identity/);
    const noIdentify=await execute(cli,['--host','127.0.0.1']);
    assert.match(noIdentify.stdout,/Usage:/);
    let serverReads=0;
    server=net.createServer(socket=>socket.on('data',data=>{
      serverReads++;
      assert.deepEqual([...data],[42,73,68,78,63,0]);
      socket.write(Buffer.from('KEITHLEY INSTRUMENTS,KI4200A,FAKE4200,V1.14\0','ascii'));
    }));
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const port=String(server.address().port);
    const good=await execute(cli,['--identify','--host','127.0.0.1','--port',port,'--mode','auto','--serial','FAKE4200','--timeout-ms','1500']);
    assert.match(good.stdout,/Verified KI4200A serial: FAKE4200/);
    assert.match(good.stdout,/Route: OS selected \(system-routing\)/);
    assert.equal(serverReads,1,'Only one read-only query should reach the server.');
    await assert.rejects(
      ()=>execute(cli,['--identify','--host','127.0.0.1','--port',port,'--mode','auto','--serial','INCORRECT']),
      e=>/序列号不匹配/.test(String(e.stderr))
    );
    assert.equal(serverReads,2,'Serial mismatch should send only a read-only query.');
    await assert.rejects(
      ()=>execute(cli,['--identify','--host','127.0.0.1','--port',port,'--mode','unsafe']),
      e=>/Invalid --mode/.test(String(e.stderr))
    );
    assert.equal(serverReads,2,'Invalid parameters must fail before connecting.');
    console.log('4200 extracted read-only CLI works without DKDS and sends exactly one NUL-terminated IDN query PASS');
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dir,{force:true,recursive:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
