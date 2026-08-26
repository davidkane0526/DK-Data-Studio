(() => {
  let core={};
  const settingsKey='dkds.connectivity.agent.v2';
  const auditKey='dkds.connectivity.agent.audit.v1';
  const mcpSettingsKey='dkds.connectivity.mcp.v1';
  const text=value=>String(value??'').trim();
  const presets=[
    {id:'openai',label:'OpenAI',provider:'openai-compatible',endpoint:'https://api.openai.com/v1/chat/completions',models:['gpt-5','gpt-5-mini','gpt-4.1']},
    {id:'anthropic',label:'Anthropic Claude',provider:'anthropic',endpoint:'https://api.anthropic.com/v1/messages',models:['claude-sonnet-4-5','claude-haiku-4-5']},
    {id:'deepseek',label:'DeepSeek',provider:'openai-compatible',endpoint:'https://api.deepseek.com/chat/completions',models:['deepseek-chat','deepseek-reasoner']},
    {id:'kimi',label:'Moonshot Kimi',provider:'openai-compatible',endpoint:'https://api.moonshot.cn/v1/chat/completions',models:['kimi-k2-0905-preview','moonshot-v1-32k']},
    {id:'glm',label:'智谱 GLM',provider:'openai-compatible',endpoint:'https://open.bigmodel.cn/api/paas/v4/chat/completions',models:['glm-4.6','glm-4.5-air']},
    {id:'qwen',label:'通义千问',provider:'openai-compatible',endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',models:['qwen3-max','qwen-plus']},
    {id:'custom',label:'自定义 OpenAI 兼容接口',provider:'openai-compatible',endpoint:'',models:[]}
  ];
  const defaultSettings={presetId:'openai',provider:'openai-compatible',endpoint:'https://api.openai.com/v1/chat/completions',model:'gpt-5-mini',accessMode:'full',maxToolRounds:12,temperature:null};
  const clone=value=>{try{return structuredClone(value);}catch{try{return JSON.parse(JSON.stringify(value));}catch{return null;}}};
  function loadSettings(){try{return {...defaultSettings,...JSON.parse(localStorage.getItem(settingsKey)||'{}')};}catch{return {...defaultSettings};}}
  function saveSettings(value){const next={...loadSettings(),...(value||{})};next.accessMode=next.accessMode==='read-only'?'read-only':'full';next.maxToolRounds=Math.max(1,Math.min(24,Number(next.maxToolRounds)||12));localStorage.setItem(settingsKey,JSON.stringify(next));return next;}
  function snapshot(){return typeof core.snapshot==='function'?core.snapshot():window.DKDSMobileHost?.snapshot?.()||{};}
  function normalizeConnection(connection={}){return {server:text(connection.server),share:text(connection.share),username:String(connection.username||''),password:String(connection.password||''),domain:String(connection.domain||'')};}
  function api(name,...args){const fn=window.electronAPI?.[name];if(typeof fn!=='function')throw new Error(`Host capability unavailable: ${name}`);return fn(...args);}
  const files=Object.freeze({openDirectory:()=>api('openDataDirectory'),listDirectory:payload=>api('listDataDirectory',payload||{}),read:payload=>api('readDataDocument',payload||{}),saveText:payload=>api('saveText',payload||{}),saveBase64:payload=>api('saveBase64',payload||{})});
  const smb=Object.freeze({discover:()=>api('smbDiscover'),listShares:connection=>api('smbListShares',normalizeConnection(connection)),list:(connection,path='')=>api('smbList',{connection:normalizeConnection(connection),path:String(path||'')}),read:(connection,paths)=>api('smbRead',{connection:normalizeConnection(connection),paths:Array.isArray(paths)?paths:[]})});
  function loadMcpSettings(){try{return {enabled:false,token:'',...JSON.parse(localStorage.getItem(mcpSettingsKey)||'{}')};}catch{return {enabled:false,token:''};}}
  function saveMcpSettings(value={}){const current=loadMcpSettings(),token=String(value.token??current.token??'').replace(/[\r\n]/g,'');const next={...current,...value,token,enabled:!!value.enabled};localStorage.setItem(mcpSettingsKey,JSON.stringify(next));return next;}
  const mcp=Object.freeze({
    status:()=>api('mcpGetStatus'),
    start:async token=>{const clean=String(token??loadMcpSettings().token??'').trim();if(!clean)throw new Error('MCP Token 不能为空。');if(clean.length>256)throw new Error('MCP Token 不能超过 256 个字符。');const result=await api('mcpStart',{token:clean});saveMcpSettings({token:clean,enabled:true});return result;},
    stop:async()=>{const result=await api('mcpStop');saveMcpSettings({enabled:false});return result;},
    loadSettings:loadMcpSettings,saveSettings:saveMcpSettings
  });

  function kernel(){if(!window.DKDSKernel)throw new Error('Studio Kernel Runtime 尚未就绪。');return window.DKDSKernel;}
  function availableTools(settings=loadSettings()){
    const rows=kernel().list();return settings.accessMode==='read-only'?rows.filter(row=>row.readOnly===true):rows;
  }
  function openAiTools(settings){return availableTools(settings).map(row=>({type:'function',function:{name:row.mcpName,description:`${row.description||row.title} [kernel:${row.id}]`,parameters:clone(row.inputSchema||{type:'object',properties:{}})}}));}
  function anthropicTools(settings){return availableTools(settings).map(row=>({name:row.mcpName,description:`${row.description||row.title} [kernel:${row.id}]`,input_schema:clone(row.inputSchema||{type:'object',properties:{}})}));}
  function rowByToolName(name){return kernel().list().find(row=>row.mcpName===name||row.id===name)||null;}
  function safeJson(value,maxChars=3000000){let raw;try{raw=JSON.stringify(value);}catch{raw=JSON.stringify({error:'Tool result is not serializable.'});}if(raw.length<=maxChars)return raw;return JSON.stringify({truncated:true,originalChars:raw.length,message:'Tool result exceeded Agent context limit. Use data.artifacts.preview/stats or narrower queries.',preview:raw.slice(0,maxChars)});}
  function loadAudit(){try{return JSON.parse(localStorage.getItem(auditKey)||'[]');}catch{return [];}}
  function appendAudit(entry){const rows=loadAudit();rows.push({...entry,time:new Date().toISOString()});while(rows.length>200)rows.shift();try{localStorage.setItem(auditKey,JSON.stringify(rows));}catch{}return rows.length;}
  async function invokeTool(name,args,settings,runId){const row=rowByToolName(name);if(!row)throw new Error(`AI 调用了未知内核工具：${name}`);if(settings.accessMode==='read-only'&&!row.readOnly)throw new Error(`只读模式拒绝修改工具：${row.id}`);const started=performance.now();try{const value=await kernel().call(row.id,args||{},{source:'ai-agent',runId});appendAudit({runId,tool:row.id,args:clone(args),ok:true,durationMs:Math.round(performance.now()-started)});return value;}catch(err){appendAudit({runId,tool:row.id,args:clone(args),ok:false,error:String(err?.message||err),durationMs:Math.round(performance.now()-started)});throw err;}}
  function systemPrompt(settings){return `你是 DK Data Studio 的内核级 AI Agent。你拥有由 Studio Kernel Registry 暴露的${settings.accessMode==='read-only'?'只读':'完整'}能力。你的任务是实际使用工具完成用户要求，而不是只给操作建议。\n规则：\n1. 对数据、图、插件或工程状态的结论必须先调用工具读取真实状态，不得猜测 ID、列名、插件能力或图形内容。\n2. 分析数据优先先 list/preview/stats，再按需读取完整 artifact；清洗和派生必须生成规范 DKDS artifact 并保留 lineage/history。\n3. 绘图使用 plot.render；分析当前图使用 plot.inspect。\n4. 插件已有专用能力时，先 core.capabilities.list/get，再通过 core.capabilities.invoke 深入调用；数据导入/导出/变换/分析 Provider 可通过 data.flows.list/run 直接发现和执行。\n5. 需要新功能时先读取 plugin.authoring.contract；复杂插件必须继续调用 sdk.authoring.search / sdk.authoring.read 查阅随软件打包的完整 SDK 1.17.8、Plugin API 类型、manifest schema、UI/Workspace/DataModel 文档和模板，再编写完整 .dkplugin。先 plugin.package.validate，再 plugin.package.install。插件代码应使用 SDK/Core 契约，不得私接 Electron/React Native bridge。\n6. 文件、SMB、工作流、科学变换、历史和诊断都通过相应 Kernel 工具；需要把分析结果、源码或报告交给用户时可用 filesystem.save.*。\n7. 不要索取或输出 API Key。不要虚构工具执行结果。\n8. 工具已经经过本地权限边界；完整模式下用户明确授权你执行必要的修改操作。\n9. 完成后用简洁中文说明你实际做了什么、生成/修改了哪些数据或插件以及重要分析结论。`;}
  async function http(settings,key,body){const headers=settings.provider==='anthropic'?{'x-api-key':key,'anthropic-version':'2023-06-01'}:{Authorization:`Bearer ${key}`};return api('agentHttpJson',{endpoint:settings.endpoint,headers,body,timeoutMs:120000});}
  function normalizeChatMessages(messages){return (Array.isArray(messages)?messages:[]).map(row=>({role:row?.role==='assistant'?'assistant':'user',content:String(row?.content??row?.text??'')})).filter(row=>row.content.trim()).slice(-24);}
  async function runOpenAI(history,settings,key,runId){
    const messages=[{role:'system',content:systemPrompt(settings)},...normalizeChatMessages(history)],tools=openAiTools(settings),audit=[];
    for(let round=0;round<settings.maxToolRounds;round++){
      const body={model:settings.model,messages,tools,tool_choice:'auto'};if(Number.isFinite(Number(settings.temperature)))body.temperature=Number(settings.temperature);
      const response=await http(settings,key,body);if(!response?.ok)throw new Error(`AI 请求失败：HTTP ${response?.status||0} ${response?.body?.error?.message||response?.statusText||''}`.trim());
      const message=response.body?.choices?.[0]?.message;if(!message)throw new Error('AI Provider 未返回 message。');const calls=Array.isArray(message.tool_calls)?message.tool_calls:[];
      if(!calls.length)return {runId,text:String(message.content||''),rounds:round+1,audit,provider:settings.presetId,model:settings.model};
      messages.push({role:'assistant',content:message.content||null,tool_calls:calls});
      for(const call of calls){const name=String(call?.function?.name||'');let args={};try{args=JSON.parse(call?.function?.arguments||'{}');}catch{throw new Error(`AI 工具参数不是合法 JSON：${name}`);}let value,errorText='';try{value=await invokeTool(name,args,settings,runId);}catch(err){errorText=String(err?.message||err);value={ok:false,error:errorText};}audit.push({tool:rowByToolName(name)?.id||name,ok:!errorText});messages.push({role:'tool',tool_call_id:String(call.id||''),name,content:safeJson(value)});}
    }
    throw new Error(`AI Agent 已达到最大工具轮次 ${settings.maxToolRounds}，请缩小任务或继续下一轮。`);
  }
  async function runAnthropic(history,settings,key,runId){
    const messages=normalizeChatMessages(history),tools=anthropicTools(settings),audit=[];
    for(let round=0;round<settings.maxToolRounds;round++){
      const body={model:settings.model,max_tokens:4096,system:systemPrompt(settings),messages,tools};if(Number.isFinite(Number(settings.temperature)))body.temperature=Number(settings.temperature);
      const response=await http(settings,key,body);if(!response?.ok)throw new Error(`AI 请求失败：HTTP ${response?.status||0} ${response?.body?.error?.message||response?.statusText||''}`.trim());
      const content=Array.isArray(response.body?.content)?response.body.content:[],calls=content.filter(row=>row?.type==='tool_use');
      if(!calls.length)return {runId,text:content.filter(row=>row?.type==='text').map(row=>row.text).join('\n').trim(),rounds:round+1,audit,provider:settings.presetId,model:settings.model};
      messages.push({role:'assistant',content});const toolResults=[];
      for(const call of calls){let value,errorText='';try{value=await invokeTool(call.name,call.input||{},settings,runId);}catch(err){errorText=String(err?.message||err);value={ok:false,error:errorText};}audit.push({tool:rowByToolName(call.name)?.id||call.name,ok:!errorText});toolResults.push({type:'tool_result',tool_use_id:call.id,content:safeJson(value),is_error:!!errorText});}
      messages.push({role:'user',content:toolResults});
    }
    throw new Error(`AI Agent 已达到最大工具轮次 ${settings.maxToolRounds}，请缩小任务或继续下一轮。`);
  }
  async function chat(messages,override={}){const settings=saveSettings(override),key=await api('agentGetSecret',settings.presetId||'default');if(!key)throw new Error('请先保存 AI API Key。');if(!text(settings.endpoint)||!text(settings.model))throw new Error('请设置 AI Endpoint 与模型。');const history=normalizeChatMessages(messages);if(!history.length)throw new Error('请输入要交给 AI Agent 的内容。');const runId=`agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;appendAudit({runId,event:'start',accessMode:settings.accessMode,model:settings.model,turns:history.length});try{const result=settings.provider==='anthropic'?await runAnthropic(history,settings,key,runId):await runOpenAI(history,settings,key,runId);appendAudit({runId,event:'finish',ok:true,rounds:result.rounds});return result;}catch(err){appendAudit({runId,event:'finish',ok:false,error:String(err?.message||err)});throw err;}}
  async function run(instruction,override={}){return chat([{role:'user',content:String(instruction||'')}],override);}
  async function test(settingsOverride={}){const settings=saveSettings(settingsOverride),key=await api('agentGetSecret',settings.presetId||'default');if(!key)throw new Error('请先保存 AI API Key。');const body=settings.provider==='anthropic'?{model:settings.model,max_tokens:16,messages:[{role:'user',content:'Reply with OK.'}]}:{model:settings.model,messages:[{role:'user',content:'Reply with OK.'}],max_tokens:8};const response=await http(settings,key,body);if(!response?.ok)throw new Error(`连接失败：HTTP ${response?.status||0}`);return true;}

  // Backward-compatible planning APIs remain for older plugins; new UI should use run().
  async function requestPlan(instruction,override={}){return {summary:'完整内核 Agent 已启用；此兼容接口不再生成待确认 UI 计划。',operations:[],agentResult:await run(instruction,override)};}
  async function applyPlan(plan){return plan?.agentResult||plan||null;}
  const agent=Object.freeze({presets:()=>presets.map(row=>({...row,models:[...row.models]})),loadSettings,saveSettings,getSecret:key=>api('agentGetSecret',key),setSecret:(key,value)=>api('agentSetSecret',{key,value}),test,chat,run,requestPlan,applyPlan,context:snapshot,tools:()=>availableTools(loadSettings()),audit:()=>loadAudit()});
  window.DKDSConnectivity=Object.freeze({configure(next={}){core={...core,...next};},files,smb,agent,mcp});
})();
