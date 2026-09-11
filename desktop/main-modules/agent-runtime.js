'use strict';

const fs=require('fs');
const path=require('path');

function createAgentRuntime({app,safeStorage}){
  function agentSecretsPath(){return path.join(app.getPath('userData'),'agent-secrets.json');}
  function readAgentSecrets(){try{return JSON.parse(fs.readFileSync(agentSecretsPath(),'utf8'))||{};}catch{return {};}}
  function writeAgentSecrets(value){const target=agentSecretsPath();fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+'\n','utf8');}
  function secretKeyName(key){const value=String(key||'default').trim();if(!/^[A-Za-z0-9._-]{1,80}$/.test(value))throw new Error('无效的密钥标识。');return value;}
  function storeAgentSecret(key,value){
    const name=secretKeyName(key),rows=readAgentSecrets(),plain=String(value||'');
    if(!plain){delete rows[name];writeAgentSecrets(rows);return true;}
    if(!safeStorage.isEncryptionAvailable())throw new Error('当前系统安全存储不可用，未保存 API Key。');
    rows[name]={encrypted:safeStorage.encryptString(plain).toString('base64')};writeAgentSecrets(rows);return true;
  }
  function loadAgentSecret(key){
    const name=secretKeyName(key),row=readAgentSecrets()[name];if(!row?.encrypted)return '';
    if(!safeStorage.isEncryptionAvailable())return '';
    try{return safeStorage.decryptString(Buffer.from(row.encrypted,'base64'));}catch{return '';}
  }
  async function agentHttpJson(payload={}){
    const endpoint=String(payload.endpoint||'').trim();
    let url;try{url=new URL(endpoint);}catch{throw new Error('AI Endpoint 无效。');}
    if(!['https:','http:'].includes(url.protocol))throw new Error('AI Endpoint 只允许 HTTP/HTTPS。');
    const timeoutMs=Math.max(1000,Math.min(120000,Number(payload.timeoutMs)||60000));
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{method:String(payload.method||'POST').toUpperCase(),headers:{'content-type':'application/json',...(payload.headers||{})},body:payload.body==null?undefined:JSON.stringify(payload.body),signal:controller.signal});
      const text=await response.text();if(text.length>8*1024*1024)throw new Error('AI 响应超过 8 MiB 限制。');
      let body=null;try{body=text?JSON.parse(text):null;}catch{body={text};}
      return {ok:response.ok,status:response.status,statusText:response.statusText,body};
    }catch(error){if(error?.name==='AbortError')throw new Error('AI 请求超时。');throw error;}finally{clearTimeout(timer);}
  }
  return Object.freeze({agentSecretsPath,readAgentSecrets,writeAgentSecrets,storeAgentSecret,loadAgentSecret,agentHttpJson});
}

module.exports={createAgentRuntime};
