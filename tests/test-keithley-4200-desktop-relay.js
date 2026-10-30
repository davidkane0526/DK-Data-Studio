#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {createLanKxciRelay,privateIpV4,SESSION_PREFIX}=require('../desktop/main-modules/lan-kxci-relay');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const IDE=Buffer.from('*IDN?\0').toString('base64');
assert(privateIpV4('192.168.1.10')&&privateIpV4('10.20.1.1')&&privateIpV4('172.16.0.1'));
assert(!privateIpV4('8.8.8.8')&&!privateIpV4('127.0.0.1')&&!privateIpV4('169.254.111.118'));
assert(read('desktop/main.js').includes("payload.networkMode==='via-mobile'?lanKxciRelay.open(payload)"));
assert(read('desktop/main.js').includes("lanKxciRelay.isRelay(payload.sessionId)"));
assert(read('src/plugins/keithley-4200/unit-presentation.js').includes("value:'via-mobile'"));
assert(read('src/plugins/keithley-4200/plugin.js').includes('withoutSecret(target)'));
assert(!read('src/plugins/keithley-4200/plugin.js').includes('profiles.push({name,endpoint:target})'));
assert(read('desktop/main-modules/lan-kxci-relay.js').includes("Only NUL-terminated *IDN?") ||
  read('desktop/main-modules/lan-kxci-relay.js').includes("allows only NUL-terminated *IDN?"));
let next=0,seen=[],sessions=0;
const server=http.createServer(async(req,res)=>{
  let body='';
  for await(const part of req)body+=part.toString();
  const send=(code,object,headers={})=>{res.writeHead(code,{'content-type':'application/json',...headers});res.end(JSON.stringify(object));};
  if(req.method==='GET'&&req.url?.startsWith('/?key=')){
    next++;
    if(req.url==='/?key=1234')return send(302,{},{'set-cookie':'dkds_pair=0123456789abcdef0123456789abcdef; Path=/; HttpOnly; SameSite=Strict','location':'/'});
    return send(200,{ok:false});
  }
  assert.equal(req.headers['x-dkds-rpc'],'kxci-readonly-v1');
  assert.equal(req.headers.origin,'http://127.0.0.1:'+server.address().port);
  assert.equal(req.headers.cookie,'dkds_pair=0123456789abcdef0123456789abcdef');
  const op=JSON.parse(body);
  seen.push(op);
  if(op.op==='open'){sessions++;return send(200,{ok:true,value:{sessionId:'android-internal-'+sessions,remoteAddress:op.payload.host,remotePort:op.payload.port}});}
  if(op.op==='exchange'){assert.equal(op.payload.base64,IDE);return send(200,{ok:true,value:{base64:Buffer.from('KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14').toString('base64'),bytesRead:45}});}
  if(op.op==='close')return send(200,{ok:true,value:{closed:true}});
  return send(403,{ok:false,error:'Unsupported'});
});
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const relay=createLanKxciRelay({allowLoopback:true});
  const base={host:'169.254.111.118',port:1225,networkMode:'via-mobile',mobileHost:'127.0.0.1',mobilePort:server.address().port,
    mobilePairKey:'1234',mobileNetworkMode:'ethernet',connectTimeoutMs:5000};
  try{
    await assert.rejects(()=>relay.open({...base,mobileHost:'8.8.8.8'}),/private IPv4/);
    await assert.rejects(()=>relay.open({...base,mobilePairKey:'0000'}),/pairing failed/i);
    const opened=await relay.open(base);
    assert(opened.sessionId.startsWith(SESSION_PREFIX));
    assert.equal(opened.networkMode,'via-mobile');
    assert.equal(opened.mobileNetworkMode,'ethernet');
    assert.equal(seen[0].op,'open');
    assert.equal(seen[0].payload.networkMode,'ethernet');
    assert.equal(seen[0].payload.host,'169.254.111.118');
    await assert.rejects(()=>relay.exchange({sessionId:opened.sessionId,base64:Buffer.from('forcev 1').toString('base64')}),/allows only/);
    assert.equal(seen.length,1,'Rejected unsafe command must never reach the tablet.');
    const out=await relay.exchange({sessionId:opened.sessionId,base64:IDE});
    assert.equal(Buffer.from(out.base64,'base64').toString(),'KEITHLEY INSTRUMENTS,KI4200A,1498377,V1.14');
    assert.equal(await relay.close({sessionId:opened.sessionId}),true);
    assert.equal(seen.map(x=>x.op).join(','),'open,exchange,close');
    assert.equal(next,2,'Pairing runs once per explicit connection; no command retries.');
    await assert.rejects(()=>relay.exchange({sessionId:opened.sessionId,base64:IDE}),/unavailable/);
  }finally{relay.closeAll();server.close();}
  console.log('Windows via-Android LAN KXCI read-only pairing, routing and safety PASS');
}
main().catch(err=>{server.close();console.error(err);process.exitCode=1;});
