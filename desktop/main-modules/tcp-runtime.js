'use strict';

const net=require('net');
const crypto=require('crypto');

function boundedInt(value,fallback,min,max){
  const n=Number(value);
  if(!Number.isFinite(n))return fallback;
  return Math.max(min,Math.min(max,Math.trunc(n)));
}

function createTcpRuntime(){
  const sessions=new Map();

  function getSession(id){
    const key=String(id||'').trim();
    const row=sessions.get(key);
    if(!row||row.socket.destroyed)throw new Error('TCP session is unavailable or closed.');
    return row;
  }

  function closeSession(id){
    const key=String(id||'').trim();
    const row=sessions.get(key);
    if(!row)return false;
    sessions.delete(key);
    try{row.socket.destroy();}catch{}
    return true;
  }

  async function open(payload={}){
    const host=String(payload.host||'').trim();
    const port=boundedInt(payload.port,0,1,65535);
    const connectTimeoutMs=boundedInt(payload.connectTimeoutMs,5000,250,120000);
    const localAddress=String(payload.localAddress||'').trim();
    if(!host)throw new Error('TCP host is required.');
    if(!port)throw new Error('TCP port must be between 1 and 65535.');

    return await new Promise((resolve,reject)=>{
      const id=crypto.randomUUID();
      const socket=new net.Socket();
      const row={id,socket,busy:false,lastError:''};
      let settled=false;
      const finishError=error=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        try{socket.destroy();}catch{}
        reject(error instanceof Error?error:new Error(String(error||'TCP connect failed.')));
      };
      const timer=setTimeout(()=>finishError(new Error('TCP connect timeout after '+connectTimeoutMs+' ms.')),connectTimeoutMs);
      socket.setNoDelay(true);
      socket.once('error',finishError);
      socket.once('connect',()=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        socket.removeListener('error',finishError);
        sessions.set(id,row);
        socket.on('error',error=>{row.lastError=String(error?.message||error||'TCP socket error');});
        socket.on('close',()=>sessions.delete(id));
        resolve({
          sessionId:id,
          localAddress:socket.localAddress||'',
          localPort:Number(socket.localPort)||0,
          remoteAddress:socket.remoteAddress||host,
          remotePort:Number(socket.remotePort)||port
        });
      });
      socket.connect({host,port,...(localAddress?{localAddress}:{})});
    });
  }

  async function exchange(payload={}){
    const row=getSession(payload.sessionId);
    if(row.busy)throw new Error('TCP session already has an active exchange.');
    const write=Buffer.from(String(payload.base64||''),'base64');
    const readTimeoutMs=boundedInt(payload.readTimeoutMs,5000,250,120000);
    const idleTimeoutMs=boundedInt(payload.idleTimeoutMs,120,20,10000);
    const maxBytes=boundedInt(payload.maxBytes,65536,1,8*1024*1024);
    if(write.length>1024*1024)throw new Error('TCP write exceeds the 1 MiB safety limit.');

    row.busy=true;
    return await new Promise((resolve,reject)=>{
      const socket=row.socket;
      const chunks=[];
      let total=0,done=false,idleTimer=null,readTimer=null;
      const cleanup=()=>{
        if(readTimer)clearTimeout(readTimer);
        if(idleTimer)clearTimeout(idleTimer);
        socket.removeListener('data',onData);
        socket.removeListener('error',onError);
        socket.removeListener('close',onClose);
        row.busy=false;
      };
      const finishOk=()=>{
        if(done)return;
        done=true;cleanup();
        const bytes=Buffer.concat(chunks,total);
        resolve({base64:bytes.toString('base64'),bytesRead:bytes.length});
      };
      const finishError=error=>{
        if(done)return;
        done=true;cleanup();
        reject(error instanceof Error?error:new Error(String(error||'TCP exchange failed.')));
      };
      const armIdle=()=>{
        if(idleTimer)clearTimeout(idleTimer);
        idleTimer=setTimeout(finishOk,idleTimeoutMs);
      };
      const onData=chunk=>{
        if(done)return;
        const data=Buffer.from(chunk);
        if(total+data.length>maxBytes){
          closeSession(row.id);
          finishError(new Error('TCP response exceeded '+maxBytes+' bytes; session closed.'));
          return;
        }
        chunks.push(data);total+=data.length;armIdle();
      };
      const onError=error=>finishError(error);
      const onClose=()=>{if(total>0)finishOk();else finishError(new Error('TCP session closed before a response was received.'));};

      readTimer=setTimeout(()=>{
        if(total>0)return finishOk();
        closeSession(row.id);
        finishError(new Error('TCP read timeout after '+readTimeoutMs+' ms; session closed to prevent late-response contamination.'));
      },readTimeoutMs);
      socket.on('data',onData);
      socket.once('error',onError);
      socket.once('close',onClose);
      socket.write(write,error=>{if(error)finishError(error);});
    });
  }

  async function close(payload={}){return closeSession(payload.sessionId);}
  function closeAll(){for(const id of [...sessions.keys()])closeSession(id);}

  return Object.freeze({open,exchange,close,closeAll});
}

module.exports={createTcpRuntime};
