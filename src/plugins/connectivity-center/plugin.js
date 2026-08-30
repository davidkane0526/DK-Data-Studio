(() => {
  const requiresCore=['runtime','status','io','services','capabilities','data.import-workbench','ui.dom','ui.menus','ui.status-bar','ui.workspace'];
  DKDSPlugins.define({
    id:'builtin.connectivity-center',pluginType:'foundation',name:'SMB & AI Services',version:'1.2.6',apiVersion:'1.18.0',requiresCore:requiresCore,
    order:34,description:'SMB file-browser import plus full-kernel AI Agent/MCP settings and chat.',
    capabilities:['network.smb','ai.agent.kernel','ai.chat.mentions','mcp.kernel-server','ui.status-bar']
  }, async ctx => {
    const dom=ctx.ui.dom;
    const connectivity=ctx.services.require('connectivity');
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=n=>{const v=Number(n)||0;if(v<1024)return `${v} B`;if(v<1048576)return `${(v/1024).toFixed(1)} KB`;return `${(v/1048576).toFixed(1)} MB`;};
    const basename=value=>String(value||'').replaceAll('\\','/').split('/').filter(Boolean).pop()||'remote.dat';
    const parentPath=value=>String(value||'').replaceAll('\\','/').replace(/^\/+|\/+$/g,'').split('/').slice(0,-1).join('/');
    const prefsKey='dkds.smb.browser.v1';
    const loadPrefs=()=>{try{return {server:'',share:'',domain:'',username:'',guest:false,favorites:[],...JSON.parse(localStorage.getItem(prefsKey)||'{}'),password:''};}catch{return {server:'',share:'',domain:'',username:'',password:'',guest:false,favorites:[]};}};
    const savePrefs=value=>{const current=loadPrefs(),next={...current,...value,password:''};localStorage.setItem(prefsKey,JSON.stringify(next));return next;};

    const smbOverlay=dom.create('div',{className:'dksvc-overlay dkds-overlay hidden',html:`
      <div class="dksvc-window dksmb-window dkds-dialog-shell" role="dialog" aria-modal="true">
        <div class="dksvc-head dkds-surface-header"><span class="dksvc-title dkds-surface-title">SMB 网络文件</span><span id="dksmbModeLabel" class="dksvc-sub dkds-meta">导入数据</span><button id="dksmbClose" class="dksvc-close dkds-icon-button" aria-label="关闭">×</button></div>
        <div class="dksmb-layout">
          <aside class="dksmb-nav dkds-surface-muted"><div class="dksmb-nav-title"><span>网络位置</span><button id="dksmbDiscover" class="dksmb-btn dkds-action-button">扫描</button></div><div id="dksmbNav"></div></aside>
          <section class="dksmb-browser">
            <div class="dksmb-toolbar dkds-surface-muted"><button id="dksmbUp" class="dksmb-btn dkds-action-button">↑ 上级</button><div id="dksmbPath" class="dksmb-path">尚未连接 SMB 共享</div><button id="dksmbFavorite" class="dksmb-btn dkds-action-button" data-dkds-tooltip="收藏当前共享">☆</button><button id="dksmbRefresh" class="dksmb-btn dkds-action-button">刷新</button></div>
            <div class="dksmb-list-head"><span></span><span>名称</span><span>大小</span><span>修改时间</span></div><div id="dksmbList" class="dksmb-list dkds-list"><div class="dksmb-empty">输入服务器地址或点击左侧扫描网络设备。</div></div>
            <div class="dksmb-connection dkds-surface-muted"><input id="dksmbServer" placeholder="服务器 / IP"><input id="dksmbShare" placeholder="共享"><input id="dksmbDomain" placeholder="域（可选）"><input id="dksmbUser" placeholder="用户名"><input id="dksmbPassword" type="password" placeholder="密码"><label class="dksmb-guest dkds-check"><input id="dksmbGuest" type="checkbox">访客</label></div>
          </section>
        </div>
        <div class="dksmb-foot dkds-surface-muted"><button id="dksmbShares" class="dksmb-btn dkds-action-button">列出共享</button><span id="dksmbFootNote" class="dksmb-foot-note">SMB 通过系统/Native Host 访问，不复制到插件私有文件系统。</span><button id="dksmbCancel" class="dksmb-btn dkds-action-button">取消</button><button id="dksmbCommit" class="dksmb-primary primary" disabled>导入所选文件</button></div>
      </div>`});
    dom.append(dom.query('body'),smbOverlay);

    const settingsOverlay=dom.create('div',{className:'dksvc-overlay dkds-overlay hidden',html:`
      <div class="dksvc-window dkai-window dkds-dialog-shell" role="dialog" aria-modal="true">
        <div class="dksvc-head dkds-surface-header"><span class="dksvc-title dkds-surface-title">AI Agent / MCP</span><span class="dksvc-sub dkds-meta">Studio Kernel 服务</span><button id="dkaiSettingsClose" class="dksvc-close dkds-icon-button" aria-label="关闭">×</button></div>
        <div class="dkai-settings-body" data-dkds-material-content="true">
          <section class="dkai-section"><div class="dkai-section-title">AI Agent</div><div class="dkai-grid">
            <div class="dkai-field dkds-field"><label>Provider</label><select id="dkaiPreset"></select></div><div class="dkai-field dkds-field"><label>模型</label><input id="dkaiModel" placeholder="model id"></div>
            <div class="dkai-field dkds-field full"><label>Endpoint</label><input id="dkaiEndpoint" placeholder="https://.../chat/completions"></div>
            <div class="dkai-field dkds-field"><label>API Key</label><input id="dkaiKey" type="password" autocomplete="off" placeholder="保存在系统安全存储"></div><div class="dkai-field dkds-field"><label>权限</label><select id="dkaiAccess"><option value="full">完整内核（推荐）</option><option value="read-only">只读分析</option></select></div>
          </div><div class="dkai-actions dkds-toolbar"><button id="dkaiSave" class="primary">保存</button><button id="dkaiTest">测试连接</button><span id="dkaiAgentState" class="dkai-statusline dkds-meta">未测试</span></div></section>
          <section class="dkai-section"><div class="dkai-section-title">MCP Server</div><div class="dkai-grid"><div class="dkai-field dkds-field full"><label>访问 Token</label><input id="dkaiMcpToken" autocomplete="off" placeholder="任意非空 Token；建议使用随机长 Token"></div></div><div class="dkai-actions dkds-toolbar"><button id="dkaiMcpStart" class="primary">启动 MCP</button><button id="dkaiMcpStop">停止</button><button id="dkaiMcpCopy">复制地址</button></div><div id="dkaiMcpState" class="dkai-mcp-state dkds-status">检查中…</div></section>
          <section class="dkai-section dkai-help dkds-note">AI Agent 与 MCP 共用 Studio Kernel Registry。完整模式可以读取/清洗数据、分析与绘制数据图、运行算法与 Workflow、访问文件/SMB、编写/验证/安装插件。Token 仅要求非空且不超过 256 字符，没有人为的最小位数限制。</section>
        </div>
      </div>`});
    dom.append(dom.query('body'),settingsOverlay);

    const chat=dom.create('section',{className:'dkai-chat dkds-floating-surface hidden',html:`
      <div class="dkai-chat-head dkds-surface-header"><span id="dkaiChatDot" class="dkai-chat-dot dkds-status-dot"></span><span class="dkai-chat-title dkds-surface-title">AI Agent</span><span id="dkaiChatModel" class="dkai-chat-model dkds-meta"></span><button id="dkaiChatSettings" class="dkds-icon-button" aria-label="AI / MCP 设置">⚙</button><button id="dkaiChatClose" class="dkds-icon-button" aria-label="收起">×</button></div>
      <div id="dkaiMessages" class="dkai-messages"><div class="dkai-msg dkds-message assistant">可以直接让我分析、清洗、绘图、调用插件或编写插件。输入 <strong>@</strong> 可引用当前数据、数据图和插件结果。</div></div>
      <div id="dkaiRefs" class="dkai-refbar"></div>
      <div class="dkai-compose dkds-surface-muted"><div id="dkaiMentions" class="dkai-mentions dkds-surface-elevated hidden"></div><div class="dkai-compose-row"><textarea id="dkaiInput" class="dkai-input dkds-field-control" placeholder="给 AI Agent 发消息；输入 @ 引用 Studio 对象"></textarea><button id="dkaiSend" class="dkai-send primary" aria-label="发送">↑</button></div><div class="dkai-compose-hint dkds-meta">Enter 发送 · Shift+Enter 换行 · @ 数据 / 数据图 / 插件结果</div></div>`});
    dom.append(dom.query('body'),chat);

    const $=sel=>dom.query(sel);
    const smbMove=ctx.ui.layout.move({id:'smb-browser-dialog',target:$('.dksmb-window'),handle:$('.dksmb-window .dksvc-head'),bounds:smbOverlay});
    const settingsMove=ctx.ui.layout.move({id:'agent-settings-dialog',target:$('.dkai-window'),handle:$('.dkai-window .dksvc-head'),bounds:settingsOverlay});
    const setText=(sel,value)=>{const el=$(sel);if(el)el.textContent=String(value??'');};
    const hide=el=>el?.classList.add('hidden');
    const show=el=>el?.classList.remove('hidden');
    const setBusy=async(sel,fn,label='处理中')=>{const button=$(sel),original=button?.textContent||'';if(button){button.disabled=true;button.dataset.busy='true';button.textContent=label;}try{return await fn();}finally{if(button){button.disabled=false;button.dataset.busy='false';button.textContent=original;}}};

    // ---- SMB file manager -------------------------------------------------
    let smbMode='auto',smbPath='',smbEntries=[],selectedPaths=new Set(),servers=[],shares=[],smbBusy=false;
    const pref=loadPrefs();
    $('#dksmbServer').value=pref.server||'';$('#dksmbShare').value=pref.share||'';$('#dksmbDomain').value=pref.domain||'';$('#dksmbUser').value=pref.username||'';$('#dksmbGuest').checked=!!pref.guest;
    const connection=()=>({server:$('#dksmbServer').value.trim(),share:$('#dksmbShare').value.trim(),domain:$('#dksmbGuest').checked?'':$('#dksmbDomain').value.trim(),username:$('#dksmbGuest').checked?'':$('#dksmbUser').value.trim(),password:$('#dksmbGuest').checked?'':$('#dksmbPassword').value});
    const favoriteKey=(server,share)=>`${server}/${share}`.toLowerCase();
    const favorites=()=>Array.isArray(loadPrefs().favorites)?loadPrefs().favorites:[];
    const persistSmb=()=>savePrefs({...connection(),password:'',guest:$('#dksmbGuest').checked});
    function renderSmbNav(){
      const current=connection(),fav=favorites();
      const faveHtml=fav.length?`<div class="dksmb-nav-title"><span>收藏</span></div>${fav.map((row,i)=>`<button class="dksmb-nav-row dkds-list-item" data-favorite="${i}"><span>★</span><span>${esc(row.share)}<small>${esc(row.server)}</small></span></button>`).join('')}`:'';
      const deviceHtml=servers.length?servers.map((row,i)=>`<button class="dksmb-nav-row dkds-list-item ${String(row.address||row.name)===current.server?'active':''}" data-server="${i}"><span>▣</span><span>${esc(row.name||row.address)}<small>${esc(row.address||'')}</small></span></button>`).join(''):'<div class="dksmb-empty">尚未扫描设备</div>';
      const shareHtml=shares.length?`<div class="dksmb-nav-title"><span>共享</span></div>${shares.map((name,i)=>`<button class="dksmb-nav-row dkds-list-item ${name===current.share?'active':''}" data-share="${i}"><span>▤</span><span>${esc(name)}</span></button>`).join('')}`:'';
      $('#dksmbNav').innerHTML=`${faveHtml}<div class="dksmb-nav-title"><span>网络设备</span></div>${deviceHtml}${shareHtml}`;
    }
    function renderSmbFiles(){
      const host=$('#dksmbList');const c=connection();
      setText('#dksmbPath',c.server&&c.share?`\\\\${c.server}\\${c.share}${smbPath?`\\${smbPath.replaceAll('/','\\')}`:''}`:'尚未连接 SMB 共享');
      if(!smbEntries.length){host.innerHTML='<div class="dksmb-empty">当前目录没有可浏览的文件。</div>';}
      else host.innerHTML=smbEntries.map((row,i)=>`<div class="dksmb-row dkds-list-item ${selectedPaths.has(row.path)?'selected':''}" data-entry="${i}"><span>${row.directory?'▸':`<input type="checkbox" ${selectedPaths.has(row.path)?'checked':''}>`}</span><span class="dksmb-name">${row.directory?'📁':'·'} ${esc(row.name)}</span><span class="dksmb-meta">${row.directory?'文件夹':fmt(row.size)}</span><span class="dksmb-meta">${esc(row.modifiedAt?String(row.modifiedAt).replace('T',' ').slice(0,16):'')}</span></div>`).join('');
      const commit=$('#dksmbCommit');commit.disabled=smbBusy||!selectedPaths.size;commit.textContent=smbMode==='auto'?`打开所选文件${selectedPaths.size?` (${selectedPaths.size})`:''}`:`导入所选文件${selectedPaths.size?` (${selectedPaths.size})`:''}`;
      const fav=favorites().some(row=>favoriteKey(row.server,row.share)===favoriteKey(c.server,c.share));$('#dksmbFavorite').textContent=fav?'★':'☆';
      setText('#dksmbModeLabel',smbMode==='auto'?'自动识别':'导入数据');
    }
    async function refreshShares(){
      const c=connection();if(!c.server)throw new Error('请输入 SMB 服务器地址。');persistSmb();shares=await connectivity.smb.listShares(c)||[];renderSmbNav();ctx.status.set(`SMB：发现 ${shares.length} 个共享。`);
    }
    async function refreshSmb(){
      const c=connection();if(!c.server||!c.share)throw new Error('请先选择服务器和共享。');persistSmb();smbBusy=true;renderSmbFiles();try{smbEntries=await connectivity.smb.list(c,smbPath)||[];selectedPaths=new Set([...selectedPaths].filter(path=>smbEntries.some(row=>row.path===path)));}finally{smbBusy=false;renderSmbFiles();}
    }
    async function discover(){const found=await connectivity.smb.discover()||[];servers=(Array.isArray(found)?found:[]).map(row=>typeof row==='string'?{name:row,address:row}:{name:String(row.name||row.address||''),address:String(row.address||row.name||'')}).filter(row=>row.address);renderSmbNav();ctx.status.set(`SMB：扫描到 ${servers.length} 台设备。`);}
    function openSmb(mode='auto'){smbMode=mode==='auto'?'auto':'data';selectedPaths.clear();show(smbOverlay);dom.frame(()=>smbMove.clamp({persist:false}));renderSmbNav();renderSmbFiles();if(connection().server&&connection().share)void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));}
    function closeSmb(){hide(smbOverlay);}
    dom.on($('#dksmbClose'),'click',closeSmb);dom.on($('#dksmbCancel'),'click',closeSmb);dom.on(smbOverlay,'click',event=>{if(event.target===smbOverlay)closeSmb();});
    dom.on($('#dksmbDiscover'),'click',()=>{ctx.status.set('SMB：正在扫描局域网设备…');return setBusy('#dksmbDiscover',discover,'扫描中').catch(err=>ctx.status.set(`SMB 扫描失败：${err.message}`));});
    dom.on($('#dksmbShares'),'click',()=>setBusy('#dksmbShares',refreshShares).catch(err=>ctx.status.set(`SMB 共享失败：${err.message}`)));
    dom.on($('#dksmbRefresh'),'click',()=>setBusy('#dksmbRefresh',refreshSmb).catch(err=>ctx.status.set(`SMB 刷新失败：${err.message}`)));
    dom.on($('#dksmbUp'),'click',()=>{if(!smbPath)return;smbPath=parentPath(smbPath);void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));});
    dom.on($('#dksmbNav'),'click',event=>{
      const fav=event.target?.closest?.('[data-favorite]');if(fav){const row=favorites()[Number(fav.dataset.favorite)];if(!row)return;$('#dksmbServer').value=row.server;$('#dksmbShare').value=row.share;smbPath='';void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));return;}
      const server=event.target?.closest?.('[data-server]');if(server){const row=servers[Number(server.dataset.server)];if(!row)return;$('#dksmbServer').value=row.address;$('#dksmbShare').value='';smbPath='';shares=[];renderSmbNav();void refreshShares().catch(err=>ctx.status.set(`SMB：${err.message}`));return;}
      const share=event.target?.closest?.('[data-share]');if(share){const name=shares[Number(share.dataset.share)];if(!name)return;$('#dksmbShare').value=name;smbPath='';selectedPaths.clear();void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));}
    });
    dom.on($('#dksmbList'),'click',event=>{const hit=event.target?.closest?.('[data-entry]');if(!hit)return;const row=smbEntries[Number(hit.dataset.entry)];if(!row)return;if(row.directory){if(event.detail>=2){smbPath=row.path;selectedPaths.clear();void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));}return;}if(selectedPaths.has(row.path))selectedPaths.delete(row.path);else selectedPaths.add(row.path);renderSmbFiles();});
    dom.on($('#dksmbFavorite'),'click',()=>{const c=connection();if(!c.server||!c.share)return;let rows=favorites(),key=favoriteKey(c.server,c.share);if(rows.some(row=>favoriteKey(row.server,row.share)===key))rows=rows.filter(row=>favoriteKey(row.server,row.share)!==key);else rows.push({server:c.server,share:c.share});savePrefs({favorites:rows});renderSmbNav();renderSmbFiles();});
    dom.on($('#dksmbCommit'),'click',()=>setBusy('#dksmbCommit',async()=>{
      const c=connection(),paths=[...selectedPaths];if(!paths.length)return;const rows=await connectivity.smb.read(c,paths);if(!rows?.length)throw new Error('SMB 未返回文件内容。');
      if(smbMode==='auto'){
        const files=[];let projects=0;
        for(let index=0;index<rows.length;index++){
          const row=rows[index],name=basename(row.name||paths[index]),path=`smb://${c.server}/${c.share}/${String(row.name||paths[index]).replace(/^\/+/, '')}`;
          let project=false;
          if(name.toLowerCase().endsWith('.json'))project=!!(await ctx.capabilities.invoke('core.project-loader','isProjectBase64',{base64:row.base64,name,path}));
          if(project){await ctx.capabilities.invoke('core.project-loader','openBase64',{base64:row.base64,path,name});projects++;}
          else files.push({name,path,base64:row.base64,size:Math.floor(String(row.base64||'').length*3/4)});
        }
        if(files.length)ctx.data.importWorkbench.open({files,source:'smb'});closeSmb();ctx.status.set(projects&&files.length?`SMB：自动打开 ${projects} 个工程，其余 ${files.length} 个文件进入导入工作台。`:projects?`SMB：已打开 ${projects} 个工程。`:`已将 ${files.length} 个 SMB 文件送入导入工作台。`);return;
      }
      const files=rows.map((row,index)=>({name:basename(row.name||paths[index]),path:`smb://${c.server}/${c.share}/${String(row.name||paths[index]).replace(/^\/+/, '')}`,base64:row.base64,size:Math.floor(String(row.base64||'').length*3/4)}));
      ctx.data.importWorkbench.open({files,source:'smb'});closeSmb();ctx.status.set(`已将 ${files.length} 个 SMB 文件送入导入工作台。`);
    }).catch(err=>ctx.status.set(`SMB 读取失败：${err.message}`)));

    // ---- AI Agent / MCP settings ----------------------------------------
    let aiHealth='idle',aiBusy=false,aiPhase='idle',lastMcp={running:false};
    const presets=connectivity.agent.presets();
    $('#dkaiPreset').innerHTML=presets.map(row=>`<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('');
    function presetById(id){return presets.find(row=>row.id===id)||presets[0];}
    function fillPreset(id,{overwrite=true}={}){const row=presetById(id);if(!row)return;if(overwrite||!$('#dkaiEndpoint').value)$('#dkaiEndpoint').value=row.endpoint||'';if(overwrite||!$('#dkaiModel').value)$('#dkaiModel').value=row.models?.[0]||'';}
    async function loadAiSettings(){
      const settings=connectivity.agent.loadSettings(),mcpSettings=connectivity.mcp.loadSettings?.()||{};$('#dkaiPreset').value=settings.presetId||'openai';$('#dkaiEndpoint').value=settings.endpoint||'';$('#dkaiModel').value=settings.model||'';$('#dkaiAccess').value=settings.accessMode||'full';$('#dkaiKey').value=await connectivity.agent.getSecret(settings.presetId||'default')||'';$('#dkaiMcpToken').value=mcpSettings.token||'';setText('#dkaiChatModel',settings.model||settings.presetId||'');await refreshMcp();
    }
    async function saveAiSettings(){const preset=presetById($('#dkaiPreset').value),settings=connectivity.agent.saveSettings({presetId:preset.id,provider:preset.provider,endpoint:$('#dkaiEndpoint').value.trim(),model:$('#dkaiModel').value.trim(),accessMode:$('#dkaiAccess').value});await connectivity.agent.setSecret(settings.presetId,$('#dkaiKey').value);setText('#dkaiChatModel',settings.model);aiHealth='idle';aiPhase='idle';await refreshAiStatus();return settings;}
    async function refreshMcp(){try{lastMcp=await connectivity.mcp.status()||{running:false};const line=lastMcp.running?`运行中\n${lastMcp.url||lastMcp.lanUrl||lastMcp.localUrl||''}\nHeader: ${lastMcp.tokenHeader||'x-dkds-token'}`:`未启动${lastMcp.error?`\n${lastMcp.error}`:''}`;setText('#dkaiMcpState',line);}catch(err){lastMcp={running:false,error:err.message};setText('#dkaiMcpState',`状态不可用：${err.message}`);}return lastMcp;}
    async function refreshAiStatus(){
      const settings=connectivity.agent.loadSettings();let hasKey=false;try{hasKey=!!(await connectivity.agent.getSecret(settings.presetId||'default'));}catch{}await refreshMcp();
      const configured=!!(settings.endpoint&&settings.model&&hasKey);
      const state=aiPhase==='starting'?'starting':aiPhase==='waiting'?'waiting':aiPhase==='done'?'done':aiHealth==='error'||aiPhase==='error'?'error':lastMcp.running?'mcp':configured?'ready':'';
      const label=lastMcp.running&&!['starting','waiting','done','error'].includes(state)?'AI · MCP':'AI';
      const title=state==='starting'?'AI Agent 正在准备上下文':state==='waiting'?'AI Agent 已提交请求，等待响应':state==='done'?'AI Agent 已完成最近一次任务':state==='error'?'AI Agent 最近连接或执行失败':configured?(lastMcp.running?'AI Agent 已配置 · MCP 已开启':'AI Agent 已配置'):'AI Agent 尚未配置';
      aiStatus.update({label,title,state,icon:'✦'});$('#dkaiChatDot')?.classList.remove('ready','busy','error');if(state==='starting'||state==='waiting')$('#dkaiChatDot')?.classList.add('busy');else if(state==='error')$('#dkaiChatDot')?.classList.add('error');else if(configured||state==='done')$('#dkaiChatDot')?.classList.add('ready');return {configured,state};
    }
    function openSettings(){show(settingsOverlay);dom.frame(()=>settingsMove.clamp({persist:false}));void loadAiSettings().catch(err=>ctx.status.set(`AI 设置读取失败：${err.message}`));}
    function closeSettings(){hide(settingsOverlay);}
    dom.on($('#dkaiSettingsClose'),'click',closeSettings);dom.on(settingsOverlay,'click',event=>{if(event.target===settingsOverlay)closeSettings();});
    dom.on($('#dkaiPreset'),'change',()=>fillPreset($('#dkaiPreset').value));
    dom.on($('#dkaiSave'),'click',()=>setBusy('#dkaiSave',async()=>{await saveAiSettings();setText('#dkaiAgentState','已保存');ctx.status.set('AI Agent 设置已保存。');}).catch(err=>{aiHealth='error';setText('#dkaiAgentState',err.message);void refreshAiStatus();}));
    dom.on($('#dkaiTest'),'click',()=>setBusy('#dkaiTest',async()=>{const settings=await saveAiSettings();setText('#dkaiAgentState','测试中…');await connectivity.agent.test(settings);aiHealth='ok';setText('#dkaiAgentState','连接正常');await refreshAiStatus();}).catch(err=>{aiHealth='error';setText('#dkaiAgentState',`失败：${err.message}`);void refreshAiStatus();}));
    dom.on($('#dkaiMcpStart'),'click',()=>setBusy('#dkaiMcpStart',async()=>{const token=$('#dkaiMcpToken').value.trim();await connectivity.mcp.start(token);await refreshMcp();await refreshAiStatus();}).catch(err=>setText('#dkaiMcpState',`启动失败：${err.message}`)));
    dom.on($('#dkaiMcpStop'),'click',()=>setBusy('#dkaiMcpStop',async()=>{await connectivity.mcp.stop();await refreshMcp();await refreshAiStatus();}).catch(err=>setText('#dkaiMcpState',`停止失败：${err.message}`)));
    dom.on($('#dkaiMcpCopy'),'click',()=>{const url=lastMcp?.url||lastMcp?.lanUrl||lastMcp?.localUrl;if(url)void ctx.io.clipboard.writeText(url);});

    // ---- Bottom status AI chat ------------------------------------------
    const smbStatus=ctx.ui.statusBar.add({id:'smb-browser',side:'right',order:31,icon:'▦',label:'SMB',title:'打开 SMB 网络文件面板',state:'',className:'compact dksmb-status',onClick:()=>openSmb('auto')});
    const aiStatus=ctx.ui.statusBar.add({id:'ai-agent',side:'right',order:32,icon:'✦',label:'AI',title:'AI Agent',state:'',colorPolicy:'semantic',className:'dkai-status',onClick:()=>toggleChat()});
    let conversation=[],selectedRefs=[],mentionRows=[],mentionAt=-1;
    const typeLabel=type=>type==='plot'?'数据图':type==='result'?'插件结果':'数据';
    function renderRefs(){$('#dkaiRefs').innerHTML=selectedRefs.map((row,i)=>`<button class="dkai-ref dkds-chip" data-ref-remove="${i}" aria-label="移除引用 ${esc(row.label)}">@${esc(row.label)} ×</button>`).join('');}
    function renderMessages(){const host=$('#dkaiMessages');const starter='<div class="dkai-msg dkds-message assistant">可以直接让我分析、清洗、绘图、调用插件或编写插件。输入 <strong>@</strong> 可引用当前数据、数据图和插件结果。</div>';host.innerHTML=starter+conversation.map(row=>`<div class="dkai-msg dkds-message ${row.role==='user'?'user':row.error?'error':'assistant'}"><div class="dkai-msg-meta dkds-message-meta">${row.role==='user'?'你':'AI Agent'}${row.refs?.length?` · ${row.refs.map(x=>`@${esc(x.label)}`).join(' ')}`:''}</div>${esc(row.display??row.content).replace(/\n/g,'<br>')}</div>`).join('');host.scrollTop=host.scrollHeight;}
    async function mentionCatalog(){const catalog=await ctx.capabilities.invoke('core.ai-context','catalog');const artifacts=(catalog?.artifacts||[]).map(row=>({type:'artifact',id:String(row.id),label:String(row.name||row.id),detail:`${row.semanticType||row.kind||'artifact'} · ${row.id}`}));const resultIds=new Set((catalog?.results||[]).map(row=>String(row.id)));const results=(catalog?.results||[]).map(row=>({type:'result',id:String(row.id),label:String(row.name||row.id),detail:`${row.semanticType||row.kind||'result'} · ${row.id}`}));const plots=(catalog?.plots||[]).map(row=>({type:'plot',id:String(row.id),label:String(row.title||row.id),detail:`${row.traces?.length||0} traces · ${row.id}`}));return [...plots,...results,...artifacts.filter(row=>!resultIds.has(row.id))];}
    function renderMentions(query=''){const q=String(query||'').trim().toLowerCase(),rows=mentionRows.filter(row=>!q||`${row.label} ${row.detail}`.toLowerCase().includes(q)).slice(0,30);const host=$('#dkaiMentions');host.innerHTML=rows.length?rows.map((row,i)=>`<button class="dkai-mention dkds-list-item" data-mention="${i}"><span class="dkai-mention-type">${typeLabel(row.type)}</span><span class="dkai-mention-label">${esc(row.label)}</span><span class="dkai-mention-detail">${esc(row.detail)}</span></button>`).join(''):'<div class="dksmb-empty">没有匹配的 Studio 对象</div>';host._rows=rows;show(host);}
    async function updateMentionMenu(){const input=$('#dkaiInput'),pos=input.selectionStart??input.value.length,before=input.value.slice(0,pos),at=before.lastIndexOf('@');if(at<0||/\s/.test(before.slice(at+1))){hide($('#dkaiMentions'));mentionAt=-1;return;}mentionAt=at;if(!mentionRows.length)mentionRows=await mentionCatalog();renderMentions(before.slice(at+1));}
    function chooseMention(row){if(!row)return;if(!selectedRefs.some(ref=>ref.type===row.type&&ref.id===row.id))selectedRefs.push(row);const input=$('#dkaiInput'),pos=input.selectionStart??input.value.length,start=mentionAt>=0?mentionAt:pos;input.value=input.value.slice(0,start)+`@${row.label} `+input.value.slice(pos);input.focus();input.selectionStart=input.selectionEnd=start+row.label.length+2;hide($('#dkaiMentions'));mentionAt=-1;renderRefs();}
    async function sendChat(){
      const input=$('#dkaiInput'),text=input.value.trim();if(!text||aiBusy)return;aiPhase='starting';const refs=selectedRefs.map(row=>({...row}));let resolved=[];if(refs.length)resolved=await ctx.capabilities.invoke('core.ai-context','resolve',refs);let contextText='';if(resolved.length){let raw=JSON.stringify(resolved);if(raw.length>600000)raw=raw.slice(0,600000)+'…';contextText=`<studio-context>\n用户通过 @ 明确引用以下 Studio 对象。引用 ID 是真实内核 ID；如需更多数据请继续调用 Kernel 工具。\n${raw}\n</studio-context>\n`;}
      const modelContent=`${contextText}用户消息：\n${text}`;conversation.push({role:'user',content:modelContent,display:text,refs});conversation=conversation.slice(-20);input.value='';selectedRefs=[];renderRefs();renderMessages();aiBusy=true;await refreshAiStatus();$('#dkaiSend').disabled=true;
      try{aiPhase='waiting';await refreshAiStatus();const result=await connectivity.agent.chat(conversation.map(row=>({role:row.role,content:row.content})));conversation.push({role:'assistant',content:String(result?.text||'AI 已完成操作，但没有返回文字摘要。')});aiHealth='ok';aiPhase='done';}
      catch(err){conversation.push({role:'assistant',content:`${err.message||err}`,error:true});aiHealth='error';aiPhase='error';}
      finally{aiBusy=false;$('#dkaiSend').disabled=false;conversation=conversation.slice(-20);renderMessages();await refreshAiStatus();if(aiPhase==='done')dom.timeout(()=>{if(aiPhase!=='done')return;aiPhase='idle';void refreshAiStatus();},3500);}
    }
    function toggleChat(force){const open=force===undefined?chat.classList.contains('hidden'):!!force;chat.classList.toggle('hidden',!open);if(open){void refreshAiStatus();dom.timeout(()=>$('#dkaiInput')?.focus(),0);}}
    dom.on($('#dkaiChatClose'),'click',()=>toggleChat(false));dom.on($('#dkaiChatSettings'),'click',openSettings);dom.on($('#dkaiSend'),'click',()=>void sendChat());
    dom.on($('#dkaiInput'),'keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!$('#dkaiMentions').classList.contains('hidden'))return;if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendChat();}});dom.on($('#dkaiInput'),'input',()=>void updateMentionMenu());
    dom.on($('#dkaiMentions'),'click',event=>{const hit=event.target?.closest?.('[data-mention]');if(!hit)return;chooseMention($('#dkaiMentions')._rows?.[Number(hit.dataset.mention)]);});
    dom.on($('#dkaiRefs'),'click',event=>{const hit=event.target?.closest?.('[data-ref-remove]');if(!hit)return;selectedRefs.splice(Number(hit.dataset.refRemove),1);renderRefs();});

    ctx.commands.register('connectivity.smb.import',()=>openSmb('data'));
    ctx.commands.register('connectivity.smb.open',()=>openSmb('auto'));
    ctx.commands.register('connectivity.ai.settings',()=>openSettings());
    ctx.commands.register('connectivity.ai.chat',()=>toggleChat(true));
    if(!ctx.runtime.isAuxiliaryWindow&&ctx.ui.menus?.add){
      ctx.ui.menus.add({id:'smb-import',menu:'import-data',label:'SMB 网络文件…',order:20,onClick:()=>openSmb('auto')});
      ctx.ui.menus.add({id:'ai-mcp-settings',menu:'manage',label:'AI Agent / MCP…',order:35,onClick:openSettings});
    }

    const cancelStatusPoll=dom.interval(()=>void refreshAiStatus(),10000);
    void refreshAiStatus();
    const mcpSettings=connectivity.mcp.loadSettings?.();if(mcpSettings?.enabled&&mcpSettings.token)void connectivity.mcp.status().then(state=>{if(!state?.running)return connectivity.mcp.start(mcpSettings.token);}).then(()=>refreshAiStatus()).catch(()=>{});
    return {deactivate(){cancelStatusPoll?.();smbOverlay.remove();settingsOverlay.remove();chat.remove();}};
  });
})();
