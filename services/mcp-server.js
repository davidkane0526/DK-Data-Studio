const http = require('node:http');
const os = require('node:os');

const MCP_PORT = 8766;
const MCP_PATH = '/mcp';
const MCP_PROTOCOL_VERSION = '2025-06-18';
const MCP_PROTOCOL_VERSIONS = new Set(['2025-06-18','2025-11-25']);
const MCP_TOKEN_HEADER = 'x-dkds-token';
const MAX_BODY_BYTES = 16 * 1024 * 1024;

function normalizeToken(value){
  const token=String(value??'').trim();
  if(!token)throw new Error('MCP Token 不能为空');
  if(token.length>256)throw new Error('MCP Token 不能超过 256 个字符');
  if(/[\r\n]/.test(token))throw new Error('MCP Token 不能包含换行');
  return token;
}
function lanAddress(){
  for(const entries of Object.values(os.networkInterfaces()))for(const row of entries||[]){
    if(row?.family==='IPv4'&&!row.internal)return row.address;
  }
  return '';
}
function readBody(request){return new Promise((resolve,reject)=>{
  const chunks=[];let size=0,done=false;
  const fail=err=>{if(done)return;done=true;reject(err);};
  request.on('data',chunk=>{size+=chunk.length;if(size>MAX_BODY_BYTES){fail(new Error('MCP 请求超过 16 MiB'));request.destroy();return;}chunks.push(chunk);});
  request.on('end',()=>{if(done)return;done=true;resolve(Buffer.concat(chunks).toString('utf8'));});request.on('error',fail);
});}
function sendJson(response,status,value){const body=typeof value==='string'?value:JSON.stringify(value);response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store'});response.end(body);}
function sendAccepted(response){response.writeHead(202,{'Cache-Control':'no-store','Content-Length':'0'});response.end();}
function rpcError(code,message,data){return {jsonrpc:'2.0',id:null,error:{code,message,...(data===undefined?{}:{data})}};}
function requestMetadata(body){try{const value=JSON.parse(body);if(!value||Array.isArray(value)||typeof value!=='object')return {method:'',name:null,notification:false};const method=typeof value.method==='string'?value.method:'';return {method,name:method==='tools/call'&&typeof value.params?.name==='string'?value.params.name:null,notification:method.startsWith('notifications/')&&value.id===undefined};}catch{return {method:'',name:null,notification:false};}}

class McpServer{
  constructor({dispatch,log=()=>{}}){this.dispatch=dispatch;this.log=log;this.server=null;this.token='';this.info=null;}
  start(tokenValue){
    const token=normalizeToken(tokenValue);
    if(this.server){if(token!==this.token)throw new Error('请先停止 MCP Server 再修改 Token');return Promise.resolve(this.info);}
    this.token=token;
    const server=http.createServer(async(request,response)=>{try{
      const url=new URL(request.url||'/','http://localhost');
      if(url.pathname!==MCP_PATH)return sendJson(response,404,rpcError(-32601,'MCP endpoint not found'));
      if(request.method!=='POST')return sendJson(response,405,rpcError(-32600,'MCP Streamable HTTP endpoint requires POST'));
      if(String(request.headers[MCP_TOKEN_HEADER]||'')!==this.token)return sendJson(response,401,rpcError(-32001,'Unauthorized'));
      const protocolVersion=String(request.headers['mcp-protocol-version']||'');
      if(protocolVersion&&!MCP_PROTOCOL_VERSIONS.has(protocolVersion))return sendJson(response,400,rpcError(-32019,`Unsupported MCP-Protocol-Version: ${protocolVersion}`));
      const body=await readBody(request),metadata=requestMetadata(body);
      if(metadata.notification)return sendAccepted(response);
      const result=await this.dispatch({body,method:metadata.method,name:metadata.name,protocolVersion});sendJson(response,200,result);
    }catch(error){sendJson(response,500,rpcError(-32603,error?.message||String(error)));}});
    return new Promise((resolve,reject)=>{
      const onError=error=>{if(error?.code==='EADDRINUSE')reject(new Error(`MCP 端口 ${MCP_PORT} 已被占用`));else reject(error);};server.once('error',onError);
      server.listen(MCP_PORT,'0.0.0.0',()=>{server.removeListener('error',onError);this.server=server;const address=lanAddress();const localUrl=`http://127.0.0.1:${MCP_PORT}${MCP_PATH}`;const lanUrl=address?`http://${address}:${MCP_PORT}${MCP_PATH}`:'';this.info={running:true,localUrl,lanUrl,url:lanUrl||localUrl,port:MCP_PORT,tokenHeader:MCP_TOKEN_HEADER,protocolVersion:MCP_PROTOCOL_VERSION};this.log(`[MCP] ${this.info.url}`);server.on('error',error=>this.log(`[MCP] ${error?.message||error}`));resolve(this.info);});
    });
  }
  status(){return this.info?{...this.info,running:true}:{running:false,localUrl:'',lanUrl:'',url:'',port:MCP_PORT,tokenHeader:MCP_TOKEN_HEADER,protocolVersion:MCP_PROTOCOL_VERSION};}
  stop(){if(!this.server){this.info=null;this.token='';return Promise.resolve(this.status());}const server=this.server;this.server=null;this.info=null;this.token='';return new Promise(resolve=>server.close(()=>resolve(this.status())));}
}
module.exports={McpServer,MCP_PORT,MCP_PATH,MCP_PROTOCOL_VERSION,MCP_PROTOCOL_VERSIONS,MCP_TOKEN_HEADER};
