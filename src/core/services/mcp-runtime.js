(() => {
  let configured={};
  const VERSION='3.61.98';
  const PROTOCOLS=new Set(['2025-06-18','2025-11-25']);
  const result=(id,value)=>({jsonrpc:'2.0',id,result:value});
  const error=(id,code,message,data)=>({jsonrpc:'2.0',id,error:{code,message,...(data===undefined?{}:{data})}});
  const kernel=()=>configured.kernel||window.DKDSKernel;
  const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return null;}}};
  const toolRows=()=>{
    const K=kernel();
    const rows=K?.list?.()||[];
    return [
      {name:'kernel_call',description:'Call any DK Data Studio kernel capability by stable tool id. This is the generic full-kernel escape hatch.',inputSchema:{type:'object',required:['tool'],properties:{tool:{type:'string'},args:{type:'object'}},additionalProperties:false},kernelId:''},
      ...rows.map(row=>({name:row.mcpName,description:`[${row.domain}] ${row.description||row.title} (kernel id: ${row.id})`,inputSchema:clone(row.inputSchema||{type:'object',properties:{}}),kernelId:row.id}))
    ];
  };
  const resourceRows=()=>[
    {uri:'dkds://kernel',name:'DK Data Studio kernel',description:'Kernel version, domains and registered tool count.',mimeType:'application/json'},
    {uri:'dkds://project',name:'Current project',description:'Current project/workspace/history snapshot.',mimeType:'application/json'},
    {uri:'dkds://artifacts',name:'Project artifacts',description:'Canonical project data artifact catalog.',mimeType:'application/json'},
    {uri:'dkds://capabilities',name:'Core capability registry',description:'All Core and plugin capabilities callable through the stable capability runtime.',mimeType:'application/json'},
    {uri:'dkds://plugins',name:'Plugin registry',description:'Installed builtin and external plugin states.',mimeType:'application/json'},
    {uri:'dkds://plots',name:'Rendered plots',description:'Currently rendered D3 plots and bounded trace/layout snapshots.',mimeType:'application/json'},
    {uri:'dkds://sdk',name:'SDK authoring reference',description:'Packaged SDK 1.17.8 / Plugin API authoring corpus summary for autonomous plugin development.',mimeType:'application/json'},
    {uri:'dkds://sdk/files',name:'SDK authoring files',description:'List packaged SDK contracts, schemas, API definitions, guides and plugin templates.',mimeType:'application/json'}
  ];
  const resourceTemplates=()=>[
    {uriTemplate:'dkds://artifact/{id}',name:'Artifact by id',description:'Read one canonical project artifact by id.',mimeType:'application/json'},
    {uriTemplate:'dkds://sdk/file/{path}',name:'SDK authoring file',description:'Read one packaged SDK authoring file. Encode the full relative path as the template path value.',mimeType:'text/plain'}
  ];
  function describe(){const K=kernel();return {name:'DK Data Studio',version:VERSION,transport:'Streamable HTTP',protocolVersions:[...PROTOCOLS],kernel:K?.describe?.()||null,toolCount:toolRows().length,resources:resourceRows().map(row=>row.uri),resourceTemplates:resourceTemplates().map(row=>row.uriTemplate),access:'full Studio kernel through a shared capability registry on desktop and Android'};}
  async function call(name,args={}){
    const K=kernel();if(!K)throw new Error('Studio Kernel Runtime is unavailable.');
    if(name==='kernel_call')return K.call(String(args.tool||''),args.args||{},{source:'mcp'});
    const row=toolRows().find(item=>item.name===name);if(!row?.kernelId)throw new Error(`Unknown MCP tool: ${name}`);
    return K.call(row.kernelId,args||{},{source:'mcp',mcpName:name});
  }
  async function readResource(uri){
    const K=kernel();if(!K)throw new Error('Studio Kernel Runtime is unavailable.');
    if(uri==='dkds://kernel')return K.describe();
    if(uri==='dkds://project')return K.call('project.snapshot',{}, {source:'mcp-resource'});
    if(uri==='dkds://artifacts')return K.call('data.artifacts.list',{includeTransient:true},{source:'mcp-resource'});
    if(uri==='dkds://capabilities')return K.call('core.capabilities.list',{}, {source:'mcp-resource'});
    if(uri==='dkds://plugins')return K.call('plugin.list',{}, {source:'mcp-resource'});
    if(uri==='dkds://plots')return K.call('plot.inspect',{limit:50},{source:'mcp-resource'});
    if(uri==='dkds://sdk')return K.call('sdk.authoring.describe',{}, {source:'mcp-resource'});
    if(uri==='dkds://sdk/files')return K.call('sdk.authoring.files.list',{}, {source:'mcp-resource'});
    if(uri.startsWith('dkds://sdk/file/'))return K.call('sdk.authoring.read',{path:decodeURIComponent(uri.slice('dkds://sdk/file/'.length)),maxChars:500000},{source:'mcp-resource'});
    if(uri.startsWith('dkds://artifact/'))return K.call('data.artifacts.get',{id:decodeURIComponent(uri.slice('dkds://artifact/'.length))},{source:'mcp-resource'});
    throw new Error(`Unknown MCP resource: ${uri}`);
  }
  async function handle(raw,protocolHeader=''){
    let req;try{req=JSON.parse(String(raw||''));}catch(err){return error(null,-32700,'Parse error',err.message);}
    const id=req?.id??null;if(req?.jsonrpc!=='2.0'||typeof req?.method!=='string')return error(id,-32600,'Invalid Request');
    if(req.method==='initialize'){
      const requested=String(req.params?.protocolVersion||'');if(!requested)return error(id,-32602,'initialize requires params.protocolVersion');if(!PROTOCOLS.has(requested))return error(id,-32019,`Unsupported protocol version: ${requested}`);
      return result(id,{protocolVersion:requested,capabilities:{tools:{listChanged:true},resources:{subscribe:false,listChanged:true}},serverInfo:{name:'DK Data Studio',version:VERSION},instructions:'This server exposes the full DK Data Studio capability kernel. Inspect kernel/tools and project/artifacts before mutating data. Use plugin tools to author and install .dkplugin packages when requested.'});
    }
    if(protocolHeader&&!PROTOCOLS.has(protocolHeader))return error(id,-32019,`Unsupported MCP-Protocol-Version: ${protocolHeader}`);
    if(req.method==='ping')return result(id,{});
    if(req.method==='tools/list')return result(id,{tools:toolRows().map(({kernelId,...row})=>row)});
    if(req.method==='tools/call'){
      try{const value=await call(String(req.params?.name||''),req.params?.arguments||{});return result(id,{content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value,isError:false});}
      catch(err){return result(id,{content:[{type:'text',text:String(err?.message||err)}],isError:true});}
    }
    if(req.method==='resources/list')return result(id,{resources:resourceRows()});
    if(req.method==='resources/templates/list')return result(id,{resourceTemplates:resourceTemplates()});
    if(req.method==='resources/read'){
      try{const uri=String(req.params?.uri||''),value=await readResource(uri);return result(id,{contents:[{uri,mimeType:'application/json',text:JSON.stringify(value)}]});}
      catch(err){return error(id,-32002,String(err?.message||err));}
    }
    if(req.method.startsWith('notifications/'))return null;
    return error(id,-32601,`Method not found: ${req.method}`);
  }
  async function receive(payload={}){
    try{const value=await handle(payload.body,payload.protocolVersion||'');if(value==null)return window.electronAPI?.mcpRespond?.({id:payload.id,ok:true,value:{jsonrpc:'2.0',id:null,result:{}}});return window.electronAPI?.mcpRespond?.({id:payload.id,ok:true,value});}
    catch(err){return window.electronAPI?.mcpRespond?.({id:payload.id,ok:false,error:String(err?.message||err)});}
  }
  let off=null;function bind(){off?.();off=typeof window.electronAPI?.onMcpRequest==='function'?window.electronAPI.onMcpRequest(receive):null;}
  window.DKDSMcpRuntime=Object.freeze({configure(next={}){configured={...configured,...next};bind();},handle,describe,tools:()=>toolRows().map(row=>({...row,inputSchema:clone(row.inputSchema)})),resources:()=>resourceRows().map(clone),resourceTemplates:()=>resourceTemplates().map(clone)});
})();
