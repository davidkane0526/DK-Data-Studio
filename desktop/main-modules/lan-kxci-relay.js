'use strict';

// Explicit Windows -> Android LAN -> Keithley 4200A relay.
// Android permits exactly *IDN?\0 and owns the instrument socket; this client
// repeats the allowlist. No power/sweep/raw-file command is accepted here.
const http=require('http');
const crypto=require('crypto');
const net=require('net');

const IDN=Buffer.from('*IDN?\0','ascii');
const SESSION_PREFIX='dkds-mobile-kxci:';

function privateIpV4(host,{allowLoopback=false}={}){
  if(net.isIP(host)!==4)return false;
  const [a,b]=host.split('.').map(Number);
  return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(allowLoopback&&a===127);
}
function numeric(value,fallback,min,max){
  const n=Number(value);
  if(!Number.isInteger(n)||n<min||n>max)throw Error('Invalid relay value (expected '+min+'..'+max+').');
  return n;
}
function requestJson({host,port,path,method='POST',cookie='',body=null,timeout=6000,maxResponse=16384,origin=''}){
  return new Promise((resolve,reject)=>{
    const data=body===null?null:Buffer.from(JSON.stringify(body),'utf8');
    if(data&&data.length>4096)return reject(Error('Remote request exceeds 4096-byte limit.'));
    const headers={'Accept':'application/json','Connection':'close','Host':host+':'+port};
    if(cookie)headers.Cookie='dkds_pair='+cookie;
    if(data){
      headers['Content-Type']='application/json';
      headers['X-DKDS-RPC']='kxci-readonly-v1';
      headers['Origin']=origin;
      headers['Content-Length']=data.length;
    }
    const req=http.request({host,port,path,method,headers,timeout,agent:false},res=>{
      const chunks=[];let length=0,failed=false;
      res.on('data',chunk=>{
        length+=chunk.length;
        if(length>maxResponse){failed=true;req.destroy(Error('Mobile relay response too large.'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{if(failed)return;resolve({status:res.statusCode,headers:res.headers,text:Buffer.concat(chunks).toString('utf8')});});
      res.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(Error('Mobile relay request timed out.')));
    req.on('error',reject);
    if(data)req.write(data);
    req.end();
  });
}
function createLanKxciRelay({allowLoopback=false}={}){
  const sessions=new Map();
  function isRelay(id){return typeof id==='string'&&id.startsWith(SESSION_PREFIX);}
  function readSession(id){
    const session=sessions.get(String(id||''));
    if(!session)throw Error('Mobile relay session is unavailable. Reconnect.');
    return session;
  }
  async function rpc(row,op,payload){
    const result=await requestJson({
      host:row.host,port:row.port,path:'/__dkds_kxci',cookie:row.cookie,
      origin:'http://'+row.host+':'+row.port,body:{op,payload},
      timeout:Math.min(13000,Math.max(2000,Number(payload?.readTimeoutMs||payload?.connectTimeoutMs||5000)+2000))
    });
    let json;try{json=JSON.parse(result.text);}catch{}
    if(result.status!==200||json?.ok!==true)throw Error(String(json?.error||'Mobile gateway HTTP '+result.status));
    return json.value;
  }
  async function open(payload={}){
    const host=String(payload.mobileHost||'').trim(),port=numeric(Number(payload.mobilePort??45910),45910,1024,65535);
    if(!privateIpV4(host,{allowLoopback}))throw Error('The Android relay address must be a private IPv4 address on a trusted LAN.');
    const key=String(payload.mobilePairKey||'').trim();
    if(!/^[0-9]{4}$/.test(key))throw Error('Enter the four-digit pairing Key displayed in the Android LAN web panel.');
    const mode=String(payload.mobileNetworkMode||'auto');
    if(!['auto','ethernet','wifi','interface'].includes(mode))throw Error('Unsupported mobile outgoing network mode.');
    const probe=await requestJson({host,port,path:'/?key='+encodeURIComponent(key),method:'GET',timeout:6000,maxResponse:16384});
    const header=probe.headers['set-cookie'];
    const cookies=Array.isArray(header)?header:[header];
    const cookie=cookies.filter(Boolean).map(x=>/^dkds_pair=([a-f0-9]{32});/i.exec(x)).find(Boolean)?.[1]||'';
    if(probe.status!==302||!cookie)throw Error('Android pairing failed. Enable the Key and verify the displayed PIN.');
    const row={host,port,cookie};
    const req={
      host:String(payload.host||'').trim(),
      port:numeric(Number(payload.port),1225,1,65535),
      connectTimeoutMs:numeric(Number(payload.connectTimeoutMs??5000),5000,250,10000),
      networkMode:mode,interfaceName:mode==='interface'?String(payload.interfaceName||'').trim():''
    };
    if(!req.host||req.host.length>253||/[\s/\\]/.test(req.host))throw Error('Invalid instrument target.');
    if(mode==='interface'&&!req.interfaceName)throw Error('Android interface name is required.');
    const opened=await rpc(row,'open',req);
    if(!opened?.sessionId)throw Error('Mobile gateway did not return an instrument session.');
    const id=SESSION_PREFIX+crypto.randomUUID();
    sessions.set(id,{...row,remoteSessionId:opened.sessionId,busy:false});
    return {...opened,sessionId:id,networkMode:'via-mobile',mobileHost:host,mobilePort:port,mobileNetworkMode:mode};
  }
  async function exchange(payload={}){
    const id=String(payload.sessionId||''),row=readSession(id);
    if(row.busy)throw Error('Another mobile KXCI exchange is in progress.');
    const raw=Buffer.from(String(payload.base64||''),'base64');
    if(!raw.equals(IDN))throw Error('Mobile KXCI relay allows only NUL-terminated *IDN? (read-only).');
    row.busy=true;
    try{
      const result=await rpc(row,'exchange',{
        sessionId:row.remoteSessionId,base64:IDN.toString('base64'),
        readTimeoutMs:numeric(Number(payload.readTimeoutMs??5000),5000,250,10000),
        idleTimeoutMs:numeric(Number(payload.idleTimeoutMs??120),120,20,1500),
        maxBytes:numeric(Number(payload.maxBytes??8192),8192,1,8192)
      });
      if(!result?.base64)throw Error('Empty reply from Android gateway.');
      return {base64:result.base64,bytesRead:result.bytesRead};
    }catch(error){sessions.delete(id);throw error;}
    finally{row.busy=false;}
  }
  async function close(payload={}){
    const id=String(payload.sessionId||''),row=sessions.get(id);
    if(!row)return false;
    sessions.delete(id);
    try{await rpc(row,'close',{sessionId:row.remoteSessionId});}catch{}
    return true;
  }
  function closeAll(){for(const row of sessions.values())rpc(row,'close',{sessionId:row.remoteSessionId}).catch(()=>{});sessions.clear();}
  return Object.freeze({isRelay,open,exchange,close,closeAll});
}
module.exports={createLanKxciRelay,privateIpV4,SESSION_PREFIX};
