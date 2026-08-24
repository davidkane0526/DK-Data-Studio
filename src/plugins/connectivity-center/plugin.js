(() => {
  const requiresCore=['runtime','status','io','services','capabilities','data.import-workbench','ui.dom','ui.styles','ui.menus','ui.status-bar'];
  DKDSPlugins.define({
    id:'builtin.connectivity-center',pluginType:'foundation',name:'SMB & AI Services',version:'1.2.2',apiVersion:'1.16.0',requiresCore:requiresCore,
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

    ctx.ui.styles.add('smb-ai-services',`
      .dksvc-overlay{position:fixed;inset:0;z-index:920;background:rgba(11,18,30,.28);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px}.dksvc-overlay.hidden{display:none}
      .dksvc-window{background:var(--dkui-surface);color:var(--dkui-text);border:1px solid var(--dkui-border);border-radius:16px;box-shadow:0 22px 65px rgba(12,20,34,.19);min-width:0;overflow:hidden}.dksvc-head{height:48px;display:flex;align-items:center;gap:10px;padding:0 14px 0 16px;background:var(--dkui-surface-soft)}.dksvc-title{font-weight:700;font-size:14px}.dksvc-sub{font-size:10px;color:var(--dkui-text-muted);margin-left:4px}.dksvc-close{margin-left:auto;width:30px;height:30px;border:0;background:transparent;color:var(--dkui-text-muted);border-radius:8px;font-size:21px;cursor:pointer}.dksvc-close:hover{background:var(--dkui-surface-hover)}
      .dksmb-window{width:min(960px,92vw);height:min(670px,82vh);display:grid;grid-template-rows:48px minmax(0,1fr) auto}.dksmb-layout{display:grid;grid-template-columns:235px minmax(0,1fr);min-height:0}.dksmb-nav{padding:12px 10px;background:var(--dkui-surface-soft);overflow:auto}.dksmb-nav-title{display:flex;align-items:center;justify-content:space-between;padding:3px 7px 8px;font-size:10px;color:var(--dkui-text-muted);font-weight:700}.dksmb-nav button,.dksmb-browser button,.dkai-window button,.dkai-chat button{font:inherit;color:inherit}.dksmb-nav-row{width:100%;border:0;background:transparent;border-radius:9px;padding:8px 9px;text-align:left;cursor:pointer;display:flex;gap:8px;align-items:center}.dksmb-nav-row:hover,.dksmb-nav-row.active{background:var(--dkui-surface-hover)}.dksmb-nav-row small{display:block;color:var(--dkui-text-muted);font-size:9px;overflow:hidden;text-overflow:ellipsis}.dksmb-nav-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dksmb-browser{display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;min-width:0;min-height:0}.dksmb-toolbar{display:flex;gap:7px;align-items:center;padding:10px 12px}.dksmb-btn{height:30px;border:1px solid var(--dkui-border-strong);background:var(--dkui-surface)!important;color:var(--dkui-text)!important;border-radius:8px;padding:0 10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}.dksmb-btn:hover{background:var(--dkui-surface-hover)!important}.dksmb-btn[data-busy=\"true\"]{cursor:progress;opacity:.82}.dksmb-btn[data-busy=\"true\"]::before{content:\"\";width:10px;height:10px;border:1.5px solid color-mix(in srgb,var(--dkui-text-muted) 45%,transparent);border-top-color:var(--dkui-accent);border-radius:50%;animation:dksmb-spin .72s linear infinite}@keyframes dksmb-spin{to{transform:rotate(360deg)}}.dksmb-path{flex:1;min-width:0;padding:7px 10px;border-radius:8px;background:var(--dkui-surface-soft);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dksmb-list-head,.dksmb-row{display:grid;grid-template-columns:34px minmax(170px,1fr) 90px 105px;align-items:center;min-height:36px;padding:0 10px;column-gap:8px}.dksmb-list-head{font-size:9.5px;color:var(--dkui-text-muted);font-weight:700;background:var(--dkui-surface-soft)}.dksmb-list{overflow:auto;min-height:0}.dksmb-row{font-size:11px;cursor:default}.dksmb-row:hover{background:var(--dkui-surface-hover)}.dksmb-row.selected{background:color-mix(in srgb,var(--dkui-accent) 8%,var(--dkui-surface))}.dksmb-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dksmb-meta{color:var(--dkui-text-muted);font-size:9.5px}.dksmb-empty{padding:42px 18px;text-align:center;color:var(--dkui-text-muted);font-size:11px}.dksmb-connection{display:grid;grid-template-columns:repeat(6,minmax(80px,1fr));gap:7px;padding:9px 12px 11px;background:var(--dkui-surface-soft)}.dksmb-connection input{min-width:0;height:30px;border:1px solid var(--dkui-border-strong)!important;background:var(--dkui-surface)!important;color:var(--dkui-text)!important;border-radius:8px;padding:0 8px;font-size:10px}.dksmb-connection input::placeholder{color:var(--dkui-text-muted)!important;opacity:.82}.dksmb-connection input[type=checkbox]{accent-color:var(--dkui-accent)}.dksmb-guest{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--dkui-text-muted);white-space:nowrap}.dksmb-foot{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--dkui-surface-soft)}.dksmb-foot-note{font-size:9.5px;color:var(--dkui-text-muted);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dksmb-primary{height:32px;border:0;border-radius:9px;background:var(--dkui-accent);color:#fff!important;padding:0 14px;cursor:pointer;font-weight:700}.dksmb-primary:disabled{opacity:.45;cursor:default}
      .dkai-window{width:min(610px,91vw);max-height:min(650px,84vh);display:grid;grid-template-rows:48px minmax(0,1fr);}.dkai-settings-body{overflow:auto;padding:14px 16px 16px}.dkai-section{padding:12px 0}.dkai-section:first-child{padding-top:0}.dkai-section-title{font-size:11px;font-weight:700;margin-bottom:9px}.dkai-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.dkai-field{display:grid;gap:5px}.dkai-field.full{grid-column:1/-1}.dkai-field label{font-size:9.5px;color:var(--dkui-text-muted)}.dkai-field input,.dkai-field select{height:32px;border:1px solid var(--dkui-border-strong);background:var(--dkui-control-bg,var(--dkui-surface));color:inherit;border-radius:8px;padding:0 9px;font-size:10.5px}.dkai-actions{display:flex;gap:7px;align-items:center;margin-top:11px}.dkai-actions button{height:32px;border:1px solid var(--dkui-border-strong);background:var(--dkui-surface);border-radius:8px;padding:0 11px;cursor:pointer}.dkai-actions button.primary{background:var(--dkui-accent);border-color:transparent;color:#fff}.dkai-statusline{font-size:9.5px;color:var(--dkui-text-muted);margin-left:auto}.dkai-mcp-state{padding:8px 10px;background:var(--dkui-surface-soft);border-radius:9px;font-size:9.5px;color:var(--dkui-text-muted);white-space:pre-wrap}.dkai-help{font-size:9.5px;line-height:1.55;color:var(--dkui-text-muted)}
      .plugin-status-item.dkai-status[data-state="ready"] .plugin-status-icon,.plugin-status-item.dkai-status[data-state="mcp"] .plugin-status-icon{color:#2f9d62}.plugin-status-item.dkai-status[data-state="busy"] .plugin-status-icon{color:var(--dkui-accent)}.plugin-status-item.dkai-status[data-state="error"] .plugin-status-icon{color:#cf5b55}
      .dkai-chat{position:fixed;right:14px;bottom:35px;z-index:915;width:min(430px,calc(100vw - 28px));height:min(575px,calc(100vh - 92px));display:grid;grid-template-rows:46px minmax(0,1fr) auto auto;background:var(--dkui-surface);color:var(--dkui-text);border:1px solid var(--dkui-border);border-radius:15px;box-shadow:0 20px 60px rgba(13,22,38,.19);overflow:hidden}.dkai-chat.hidden{display:none}.dkai-chat-head{display:flex;align-items:center;gap:8px;padding:0 11px 0 13px;background:var(--dkui-surface-soft)}.dkai-chat-dot{width:8px;height:8px;border-radius:50%;background:#98a2b3}.dkai-chat-dot.ready{background:#2f9d62}.dkai-chat-dot.busy{background:var(--dkui-accent)}.dkai-chat-dot.error{background:#cf5b55}.dkai-chat-title{font-size:12px;font-weight:700}.dkai-chat-model{font-size:9px;color:var(--dkui-text-muted)}.dkai-chat-head button{margin-left:0;border:0;background:transparent;color:var(--dkui-text-muted);border-radius:8px;width:30px;height:30px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.dkai-chat-head #dkaiChatSettings{margin-left:auto}.dkai-chat-head button:hover{background:var(--dkui-surface-hover);color:var(--dkui-text)}.dkai-messages{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:9px}.dkai-msg{max-width:90%;padding:8px 10px;border-radius:11px;font-size:10.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}.dkai-msg.user{align-self:flex-end;background:color-mix(in srgb,var(--dkui-accent) 12%,var(--dkui-surface));}.dkai-msg.assistant{align-self:flex-start;background:var(--dkui-surface-soft)}.dkai-msg.error{align-self:flex-start;background:rgba(207,91,85,.10);color:#b94743}.dkai-msg-meta{font-size:8.5px;color:var(--dkui-text-muted);margin-bottom:3px}.dkai-refbar{display:flex;gap:5px;flex-wrap:wrap;padding:0 10px 6px}.dkai-refbar:empty{display:none}.dkai-ref{border:0;background:var(--dkui-surface-soft);color:var(--dkui-text-muted);border-radius:12px;padding:4px 7px;font-size:9px;cursor:pointer}.dkai-compose{position:relative;padding:8px 10px 10px;background:var(--dkui-surface-soft)}.dkai-compose-row{display:grid;grid-template-columns:minmax(0,1fr) 34px;gap:7px}.dkai-input{resize:none;min-height:58px;max-height:130px;border:1px solid var(--dkui-border-strong);background:var(--dkui-control-bg,var(--dkui-surface));color:inherit;border-radius:10px;padding:9px 10px;font:inherit;font-size:10.5px;line-height:1.45;outline:none}.dkai-send{border:0;border-radius:10px;background:var(--dkui-accent);color:#fff;font-size:17px;cursor:pointer}.dkai-send:disabled{opacity:.45}.dkai-compose-hint{font-size:8.5px;color:var(--dkui-text-muted);margin-top:5px}.dkai-mentions{position:absolute;left:10px;right:51px;bottom:82px;max-height:240px;overflow:auto;background:var(--dkui-surface);border:1px solid var(--dkui-border);border-radius:10px;box-shadow:0 12px 34px rgba(11,18,30,.16);padding:5px;z-index:3}.dkai-mentions.hidden{display:none}.dkai-mention{width:100%;display:grid;grid-template-columns:54px minmax(0,1fr);gap:7px;border:0;background:transparent;border-radius:8px;padding:7px;text-align:left;cursor:pointer}.dkai-mention:hover{background:var(--dkui-surface-hover)}.dkai-mention-type{font-size:8.5px;color:var(--dkui-accent);font-weight:700}.dkai-mention-label{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dkai-mention-detail{grid-column:2;font-size:8.5px;color:var(--dkui-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      [data-dkds-theme="dark"] .dksvc-overlay{background:rgba(0,0,0,.37)}[data-dkds-theme="dark"] .dksvc-window,[data-dkds-theme="dark"] .dkai-chat{box-shadow:0 22px 62px rgba(0,0,0,.30)}
      @media(max-width:760px){.dksvc-overlay{padding:8px}.dksmb-window{width:100%;height:calc(100vh - 18px)}.dksmb-layout{grid-template-columns:150px minmax(0,1fr)}.dksmb-connection{grid-template-columns:1fr 1fr}.dksmb-list-head,.dksmb-row{grid-template-columns:30px minmax(120px,1fr) 70px}.dksmb-list-head>:last-child,.dksmb-row>:last-child{display:none}.dkai-grid{grid-template-columns:1fr}.dkai-field.full{grid-column:auto}.dkai-chat{right:7px;bottom:7px;width:calc(100vw - 14px);height:min(540px,calc(100vh - 18px))}}
    `);

    const smbOverlay=dom.create('div',{className:'dksvc-overlay hidden',html:`
      <div class="dksvc-window dksmb-window" role="dialog" aria-modal="true">
        <div class="dksvc-head"><span class="dksvc-title">SMB 网络文件</span><span id="dksmbModeLabel" class="dksvc-sub">导入数据</span><button id="dksmbClose" class="dksvc-close" aria-label="关闭">×</button></div>
        <div class="dksmb-layout">
          <aside class="dksmb-nav"><div class="dksmb-nav-title"><span>网络位置</span><button id="dksmbDiscover" class="dksmb-btn">扫描</button></div><div id="dksmbNav"></div></aside>
          <section class="dksmb-browser">
            <div class="dksmb-toolbar"><button id="dksmbUp" class="dksmb-btn">↑ 上级</button><div id="dksmbPath" class="dksmb-path">尚未连接 SMB 共享</div><button id="dksmbFavorite" class="dksmb-btn" title="收藏当前共享">☆</button><button id="dksmbRefresh" class="dksmb-btn">刷新</button></div>
            <div class="dksmb-list-head"><span></span><span>名称</span><span>大小</span><span>修改时间</span></div><div id="dksmbList" class="dksmb-list"><div class="dksmb-empty">输入服务器地址或点击左侧扫描网络设备。</div></div>
            <div class="dksmb-connection"><input id="dksmbServer" placeholder="服务器 / IP"><input id="dksmbShare" placeholder="共享"><input id="dksmbDomain" placeholder="域（可选）"><input id="dksmbUser" placeholder="用户名"><input id="dksmbPassword" type="password" placeholder="密码"><label class="dksmb-guest"><input id="dksmbGuest" type="checkbox">访客</label></div>
          </section>
        </div>
        <div class="dksmb-foot"><button id="dksmbShares" class="dksmb-btn">列出共享</button><span id="dksmbFootNote" class="dksmb-foot-note">SMB 通过系统/Native Host 访问，不复制到插件私有文件系统。</span><button id="dksmbCancel" class="dksmb-btn">取消</button><button id="dksmbCommit" class="dksmb-primary" disabled>导入所选文件</button></div>
      </div>`});
    dom.append(dom.query('body'),smbOverlay);

    const settingsOverlay=dom.create('div',{className:'dksvc-overlay hidden',html:`
      <div class="dksvc-window dkai-window" role="dialog" aria-modal="true">
        <div class="dksvc-head"><span class="dksvc-title">AI Agent / MCP</span><span class="dksvc-sub">Studio Kernel 服务</span><button id="dkaiSettingsClose" class="dksvc-close" aria-label="关闭">×</button></div>
        <div class="dkai-settings-body">
          <section class="dkai-section"><div class="dkai-section-title">AI Agent</div><div class="dkai-grid">
            <div class="dkai-field"><label>Provider</label><select id="dkaiPreset"></select></div><div class="dkai-field"><label>模型</label><input id="dkaiModel" placeholder="model id"></div>
            <div class="dkai-field full"><label>Endpoint</label><input id="dkaiEndpoint" placeholder="https://.../chat/completions"></div>
            <div class="dkai-field"><label>API Key</label><input id="dkaiKey" type="password" autocomplete="off" placeholder="保存在系统安全存储"></div><div class="dkai-field"><label>权限</label><select id="dkaiAccess"><option value="full">完整内核（推荐）</option><option value="read-only">只读分析</option></select></div>
          </div><div class="dkai-actions"><button id="dkaiSave" class="primary">保存</button><button id="dkaiTest">测试连接</button><span id="dkaiAgentState" class="dkai-statusline">未测试</span></div></section>
          <section class="dkai-section"><div class="dkai-section-title">MCP Server</div><div class="dkai-grid"><div class="dkai-field full"><label>访问 Token</label><input id="dkaiMcpToken" autocomplete="off" placeholder="任意非空 Token；建议使用随机长 Token"></div></div><div class="dkai-actions"><button id="dkaiMcpStart" class="primary">启动 MCP</button><button id="dkaiMcpStop">停止</button><button id="dkaiMcpCopy">复制地址</button></div><div id="dkaiMcpState" class="dkai-mcp-state">检查中…</div></section>
          <section class="dkai-section dkai-help">AI Agent 与 MCP 共用 Studio Kernel Registry。完整模式可以读取/清洗数据、分析与绘制数据图、运行算法与 Workflow、访问文件/SMB、编写/验证/安装插件。Token 仅要求非空且不超过 256 字符，没有人为的最小位数限制。</section>
        </div>
      </div>`});
    dom.append(dom.query('body'),settingsOverlay);

    const chat=dom.create('section',{className:'dkai-chat hidden',html:`
      <div class="dkai-chat-head"><span id="dkaiChatDot" class="dkai-chat-dot"></span><span class="dkai-chat-title">AI Agent</span><span id="dkaiChatModel" class="dkai-chat-model"></span><button id="dkaiChatSettings" title="AI / MCP 设置">⚙</button><button id="dkaiChatClose" title="收起">×</button></div>
      <div id="dkaiMessages" class="dkai-messages"><div class="dkai-msg assistant">可以直接让我分析、清洗、绘图、调用插件或编写插件。输入 <strong>@</strong> 可引用当前数据、数据图和插件结果。</div></div>
      <div id="dkaiRefs" class="dkai-refbar"></div>
      <div class="dkai-compose"><div id="dkaiMentions" class="dkai-mentions hidden"></div><div class="dkai-compose-row"><textarea id="dkaiInput" class="dkai-input" placeholder="给 AI Agent 发消息；输入 @ 引用 Studio 对象"></textarea><button id="dkaiSend" class="dkai-send" title="发送">↑</button></div><div class="dkai-compose-hint">Enter 发送 · Shift+Enter 换行 · @ 数据 / 数据图 / 插件结果</div></div>`});
    dom.append(dom.query('body'),chat);

    const $=sel=>dom.query(sel);
    const setText=(sel,value)=>{const el=$(sel);if(el)el.textContent=String(value??'');};
    const hide=el=>el?.classList.add('hidden');
    const show=el=>el?.classList.remove('hidden');
    const setBusy=async(sel,fn,label='处理中')=>{const button=$(sel),original=button?.textContent||'';if(button){button.disabled=true;button.dataset.busy='true';button.textContent=label;}try{return await fn();}finally{if(button){button.disabled=false;button.dataset.busy='false';button.textContent=original;}}};

    // ---- SMB file manager -------------------------------------------------
    let smbMode='data',smbPath='',smbEntries=[],selectedPaths=new Set(),servers=[],shares=[],smbBusy=false;
    const pref=loadPrefs();
    $('#dksmbServer').value=pref.server||'';$('#dksmbShare').value=pref.share||'';$('#dksmbDomain').value=pref.domain||'';$('#dksmbUser').value=pref.username||'';$('#dksmbGuest').checked=!!pref.guest;
    const connection=()=>({server:$('#dksmbServer').value.trim(),share:$('#dksmbShare').value.trim(),domain:$('#dksmbGuest').checked?'':$('#dksmbDomain').value.trim(),username:$('#dksmbGuest').checked?'':$('#dksmbUser').value.trim(),password:$('#dksmbGuest').checked?'':$('#dksmbPassword').value});
    const favoriteKey=(server,share)=>`${server}/${share}`.toLowerCase();
    const favorites=()=>Array.isArray(loadPrefs().favorites)?loadPrefs().favorites:[];
    const persistSmb=()=>savePrefs({...connection(),password:'',guest:$('#dksmbGuest').checked});
    function renderSmbNav(){
      const current=connection(),fav=favorites();
      const faveHtml=fav.length?`<div class="dksmb-nav-title"><span>收藏</span></div>${fav.map((row,i)=>`<button class="dksmb-nav-row" data-favorite="${i}"><span>★</span><span>${esc(row.share)}<small>${esc(row.server)}</small></span></button>`).join('')}`:'';
      const deviceHtml=servers.length?servers.map((row,i)=>`<button class="dksmb-nav-row ${String(row.address||row.name)===current.server?'active':''}" data-server="${i}"><span>▣</span><span>${esc(row.name||row.address)}<small>${esc(row.address||'')}</small></span></button>`).join(''):'<div class="dksmb-empty">尚未扫描设备</div>';
      const shareHtml=shares.length?`<div class="dksmb-nav-title"><span>共享</span></div>${shares.map((name,i)=>`<button class="dksmb-nav-row ${name===current.share?'active':''}" data-share="${i}"><span>▤</span><span>${esc(name)}</span></button>`).join('')}`:'';
      $('#dksmbNav').innerHTML=`${faveHtml}<div class="dksmb-nav-title"><span>网络设备</span></div>${deviceHtml}${shareHtml}`;
    }
    function renderSmbFiles(){
      const host=$('#dksmbList');const c=connection();
      setText('#dksmbPath',c.server&&c.share?`\\\\${c.server}\\${c.share}${smbPath?`\\${smbPath.replaceAll('/','\\')}`:''}`:'尚未连接 SMB 共享');
      if(!smbEntries.length){host.innerHTML='<div class="dksmb-empty">当前目录没有可浏览的文件。</div>';}
      else host.innerHTML=smbEntries.map((row,i)=>`<div class="dksmb-row ${selectedPaths.has(row.path)?'selected':''}" data-entry="${i}"><span>${row.directory?'▸':`<input type="checkbox" ${selectedPaths.has(row.path)?'checked':''}>`}</span><span class="dksmb-name">${row.directory?'📁':'·'} ${esc(row.name)}</span><span class="dksmb-meta">${row.directory?'文件夹':fmt(row.size)}</span><span class="dksmb-meta">${esc(row.modifiedAt?String(row.modifiedAt).replace('T',' ').slice(0,16):'')}</span></div>`).join('');
      const commit=$('#dksmbCommit');commit.disabled=smbBusy||!selectedPaths.size;commit.textContent=smbMode==='project'?'读取所选项目':smbMode==='auto'?`打开所选文件${selectedPaths.size?` (${selectedPaths.size})`:''}`:`导入所选文件${selectedPaths.size?` (${selectedPaths.size})`:''}`;
      const fav=favorites().some(row=>favoriteKey(row.server,row.share)===favoriteKey(c.server,c.share));$('#dksmbFavorite').textContent=fav?'★':'☆';
      setText('#dksmbModeLabel',smbMode==='project'?'读取项目':smbMode==='auto'?'自动识别':'导入数据');
    }
    async function refreshShares(){
      const c=connection();if(!c.server)throw new Error('请输入 SMB 服务器地址。');persistSmb();shares=await connectivity.smb.listShares(c)||[];renderSmbNav();ctx.status.set(`SMB：发现 ${shares.length} 个共享。`);
    }
    async function refreshSmb(){
      const c=connection();if(!c.server||!c.share)throw new Error('请先选择服务器和共享。');persistSmb();smbBusy=true;renderSmbFiles();try{smbEntries=await connectivity.smb.list(c,smbPath)||[];selectedPaths=new Set([...selectedPaths].filter(path=>smbEntries.some(row=>row.path===path)));}finally{smbBusy=false;renderSmbFiles();}
    }
    async function discover(){const found=await connectivity.smb.discover()||[];servers=(Array.isArray(found)?found:[]).map(row=>typeof row==='string'?{name:row,address:row}:{name:String(row.name||row.address||''),address:String(row.address||row.name||'')}).filter(row=>row.address);renderSmbNav();ctx.status.set(`SMB：扫描到 ${servers.length} 台设备。`);}
    function openSmb(mode='data'){smbMode=mode==='project'?'project':mode==='auto'?'auto':'data';selectedPaths.clear();show(smbOverlay);renderSmbNav();renderSmbFiles();if(connection().server&&connection().share)void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));}
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
    dom.on($('#dksmbList'),'click',event=>{const hit=event.target?.closest?.('[data-entry]');if(!hit)return;const row=smbEntries[Number(hit.dataset.entry)];if(!row)return;if(row.directory){if(event.detail>=2){smbPath=row.path;selectedPaths.clear();void refreshSmb().catch(err=>ctx.status.set(`SMB：${err.message}`));}return;}if(smbMode==='project')selectedPaths=new Set([row.path]);else{if(selectedPaths.has(row.path))selectedPaths.delete(row.path);else selectedPaths.add(row.path);}renderSmbFiles();});
    dom.on($('#dksmbFavorite'),'click',()=>{const c=connection();if(!c.server||!c.share)return;let rows=favorites(),key=favoriteKey(c.server,c.share);if(rows.some(row=>favoriteKey(row.server,row.share)===key))rows=rows.filter(row=>favoriteKey(row.server,row.share)!==key);else rows.push({server:c.server,share:c.share});savePrefs({favorites:rows});renderSmbNav();renderSmbFiles();});
    dom.on($('#dksmbCommit'),'click',()=>setBusy('#dksmbCommit',async()=>{
      const c=connection(),paths=[...selectedPaths];if(!paths.length)return;const rows=await connectivity.smb.read(c,paths);if(!rows?.length)throw new Error('SMB 未返回文件内容。');
      if(smbMode==='project'){
        const row=rows[0],path=`smb://${c.server}/${c.share}/${String(row.name||paths[0]).replace(/^\/+/, '')}`;
        await ctx.capabilities.invoke('core.project-loader','openBase64',{base64:row.base64,path,name:basename(row.name||paths[0])});closeSmb();return;
      }
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
    let aiHealth='idle',aiBusy=false,lastMcp={running:false};
    const presets=connectivity.agent.presets();
    $('#dkaiPreset').innerHTML=presets.map(row=>`<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('');
    function presetById(id){return presets.find(row=>row.id===id)||presets[0];}
    function fillPreset(id,{overwrite=true}={}){const row=presetById(id);if(!row)return;if(overwrite||!$('#dkaiEndpoint').value)$('#dkaiEndpoint').value=row.endpoint||'';if(overwrite||!$('#dkaiModel').value)$('#dkaiModel').value=row.models?.[0]||'';}
    async function loadAiSettings(){
      const settings=connectivity.agent.loadSettings(),mcpSettings=connectivity.mcp.loadSettings?.()||{};$('#dkaiPreset').value=settings.presetId||'openai';$('#dkaiEndpoint').value=settings.endpoint||'';$('#dkaiModel').value=settings.model||'';$('#dkaiAccess').value=settings.accessMode||'full';$('#dkaiKey').value=await connectivity.agent.getSecret(settings.presetId||'default')||'';$('#dkaiMcpToken').value=mcpSettings.token||'';setText('#dkaiChatModel',settings.model||settings.presetId||'');await refreshMcp();
    }
    async function saveAiSettings(){const preset=presetById($('#dkaiPreset').value),settings=connectivity.agent.saveSettings({presetId:preset.id,provider:preset.provider,endpoint:$('#dkaiEndpoint').value.trim(),model:$('#dkaiModel').value.trim(),accessMode:$('#dkaiAccess').value});await connectivity.agent.setSecret(settings.presetId,$('#dkaiKey').value);setText('#dkaiChatModel',settings.model);aiHealth='idle';await refreshAiStatus();return settings;}
    async function refreshMcp(){try{lastMcp=await connectivity.mcp.status()||{running:false};const line=lastMcp.running?`运行中\n${lastMcp.url||lastMcp.lanUrl||lastMcp.localUrl||''}\nHeader: ${lastMcp.tokenHeader||'x-dkds-token'}`:`未启动${lastMcp.error?`\n${lastMcp.error}`:''}`;setText('#dkaiMcpState',line);}catch(err){lastMcp={running:false,error:err.message};setText('#dkaiMcpState',`状态不可用：${err.message}`);}return lastMcp;}
    async function refreshAiStatus(){
      const settings=connectivity.agent.loadSettings();let hasKey=false;try{hasKey=!!(await connectivity.agent.getSecret(settings.presetId||'default'));}catch{}await refreshMcp();
      const configured=!!(settings.endpoint&&settings.model&&hasKey);const state=aiBusy?'busy':aiHealth==='error'?'error':lastMcp.running?'mcp':configured?'ready':'';const label=aiBusy?'AI…':lastMcp.running?'AI · MCP':'AI';const title=aiBusy?'AI Agent 正在执行':aiHealth==='error'?'AI Agent 最近连接失败':configured?(lastMcp.running?'AI Agent 已配置 · MCP 已开启':'AI Agent 已配置'):'AI Agent 尚未配置';aiStatus.update({label,title,state,icon:'✦'});$('#dkaiChatDot')?.classList.remove('ready','busy','error');if(state==='busy')$('#dkaiChatDot')?.classList.add('busy');else if(state==='error')$('#dkaiChatDot')?.classList.add('error');else if(configured)$('#dkaiChatDot')?.classList.add('ready');return {configured,state};
    }
    function openSettings(){show(settingsOverlay);void loadAiSettings().catch(err=>ctx.status.set(`AI 设置读取失败：${err.message}`));}
    function closeSettings(){hide(settingsOverlay);}
    dom.on($('#dkaiSettingsClose'),'click',closeSettings);dom.on(settingsOverlay,'click',event=>{if(event.target===settingsOverlay)closeSettings();});
    dom.on($('#dkaiPreset'),'change',()=>fillPreset($('#dkaiPreset').value));
    dom.on($('#dkaiSave'),'click',()=>setBusy('#dkaiSave',async()=>{await saveAiSettings();setText('#dkaiAgentState','已保存');ctx.status.set('AI Agent 设置已保存。');}).catch(err=>{aiHealth='error';setText('#dkaiAgentState',err.message);void refreshAiStatus();}));
    dom.on($('#dkaiTest'),'click',()=>setBusy('#dkaiTest',async()=>{const settings=await saveAiSettings();setText('#dkaiAgentState','测试中…');await connectivity.agent.test(settings);aiHealth='ok';setText('#dkaiAgentState','连接正常');await refreshAiStatus();}).catch(err=>{aiHealth='error';setText('#dkaiAgentState',`失败：${err.message}`);void refreshAiStatus();}));
    dom.on($('#dkaiMcpStart'),'click',()=>setBusy('#dkaiMcpStart',async()=>{const token=$('#dkaiMcpToken').value.trim();await connectivity.mcp.start(token);await refreshMcp();await refreshAiStatus();}).catch(err=>setText('#dkaiMcpState',`启动失败：${err.message}`)));
    dom.on($('#dkaiMcpStop'),'click',()=>setBusy('#dkaiMcpStop',async()=>{await connectivity.mcp.stop();await refreshMcp();await refreshAiStatus();}).catch(err=>setText('#dkaiMcpState',`停止失败：${err.message}`)));
    dom.on($('#dkaiMcpCopy'),'click',()=>{const url=lastMcp?.url||lastMcp?.lanUrl||lastMcp?.localUrl;if(url)void ctx.io.clipboard.writeText(url);});

    // ---- Bottom status AI chat ------------------------------------------
    const aiStatus=ctx.ui.statusBar.add({id:'ai-agent',side:'right',order:32,icon:'✦',label:'AI',title:'AI Agent',className:'dkai-status',onClick:()=>toggleChat()});
    let conversation=[],selectedRefs=[],mentionRows=[],mentionAt=-1;
    const typeLabel=type=>type==='plot'?'数据图':type==='result'?'插件结果':'数据';
    function renderRefs(){$('#dkaiRefs').innerHTML=selectedRefs.map((row,i)=>`<button class="dkai-ref" data-ref-remove="${i}" title="移除引用">@${esc(row.label)} ×</button>`).join('');}
    function renderMessages(){const host=$('#dkaiMessages');const starter='<div class="dkai-msg assistant">可以直接让我分析、清洗、绘图、调用插件或编写插件。输入 <strong>@</strong> 可引用当前数据、数据图和插件结果。</div>';host.innerHTML=starter+conversation.map(row=>`<div class="dkai-msg ${row.role==='user'?'user':row.error?'error':'assistant'}"><div class="dkai-msg-meta">${row.role==='user'?'你':'AI Agent'}${row.refs?.length?` · ${row.refs.map(x=>`@${esc(x.label)}`).join(' ')}`:''}</div>${esc(row.display??row.content).replace(/\n/g,'<br>')}</div>`).join('');host.scrollTop=host.scrollHeight;}
    async function mentionCatalog(){const catalog=await ctx.capabilities.invoke('core.ai-context','catalog');const artifacts=(catalog?.artifacts||[]).map(row=>({type:'artifact',id:String(row.id),label:String(row.name||row.id),detail:`${row.semanticType||row.kind||'artifact'} · ${row.id}`}));const resultIds=new Set((catalog?.results||[]).map(row=>String(row.id)));const results=(catalog?.results||[]).map(row=>({type:'result',id:String(row.id),label:String(row.name||row.id),detail:`${row.semanticType||row.kind||'result'} · ${row.id}`}));const plots=(catalog?.plots||[]).map(row=>({type:'plot',id:String(row.id),label:String(row.title||row.id),detail:`${row.traces?.length||0} traces · ${row.id}`}));return [...plots,...results,...artifacts.filter(row=>!resultIds.has(row.id))];}
    function renderMentions(query=''){const q=String(query||'').trim().toLowerCase(),rows=mentionRows.filter(row=>!q||`${row.label} ${row.detail}`.toLowerCase().includes(q)).slice(0,30);const host=$('#dkaiMentions');host.innerHTML=rows.length?rows.map((row,i)=>`<button class="dkai-mention" data-mention="${i}"><span class="dkai-mention-type">${typeLabel(row.type)}</span><span class="dkai-mention-label">${esc(row.label)}</span><span class="dkai-mention-detail">${esc(row.detail)}</span></button>`).join(''):'<div class="dksmb-empty">没有匹配的 Studio 对象</div>';host._rows=rows;show(host);}
    async function updateMentionMenu(){const input=$('#dkaiInput'),pos=input.selectionStart??input.value.length,before=input.value.slice(0,pos),at=before.lastIndexOf('@');if(at<0||/\s/.test(before.slice(at+1))){hide($('#dkaiMentions'));mentionAt=-1;return;}mentionAt=at;if(!mentionRows.length)mentionRows=await mentionCatalog();renderMentions(before.slice(at+1));}
    function chooseMention(row){if(!row)return;if(!selectedRefs.some(ref=>ref.type===row.type&&ref.id===row.id))selectedRefs.push(row);const input=$('#dkaiInput'),pos=input.selectionStart??input.value.length,start=mentionAt>=0?mentionAt:pos;input.value=input.value.slice(0,start)+`@${row.label} `+input.value.slice(pos);input.focus();input.selectionStart=input.selectionEnd=start+row.label.length+2;hide($('#dkaiMentions'));mentionAt=-1;renderRefs();}
    async function sendChat(){
      const input=$('#dkaiInput'),text=input.value.trim();if(!text||aiBusy)return;const refs=selectedRefs.map(row=>({...row}));let resolved=[];if(refs.length)resolved=await ctx.capabilities.invoke('core.ai-context','resolve',refs);let contextText='';if(resolved.length){let raw=JSON.stringify(resolved);if(raw.length>600000)raw=raw.slice(0,600000)+'…';contextText=`<studio-context>\n用户通过 @ 明确引用以下 Studio 对象。引用 ID 是真实内核 ID；如需更多数据请继续调用 Kernel 工具。\n${raw}\n</studio-context>\n`;}
      const modelContent=`${contextText}用户消息：\n${text}`;conversation.push({role:'user',content:modelContent,display:text,refs});conversation=conversation.slice(-20);input.value='';selectedRefs=[];renderRefs();renderMessages();aiBusy=true;await refreshAiStatus();$('#dkaiSend').disabled=true;
      try{const result=await connectivity.agent.chat(conversation.map(row=>({role:row.role,content:row.content})));conversation.push({role:'assistant',content:String(result?.text||'AI 已完成操作，但没有返回文字摘要。')});aiHealth='ok';}
      catch(err){conversation.push({role:'assistant',content:`${err.message||err}`,error:true});aiHealth='error';}
      finally{aiBusy=false;$('#dkaiSend').disabled=false;conversation=conversation.slice(-20);renderMessages();await refreshAiStatus();}
    }
    function toggleChat(force){const open=force===undefined?chat.classList.contains('hidden'):!!force;chat.classList.toggle('hidden',!open);if(open){void refreshAiStatus();dom.timeout(()=>$('#dkaiInput')?.focus(),0);}}
    dom.on($('#dkaiChatClose'),'click',()=>toggleChat(false));dom.on($('#dkaiChatSettings'),'click',openSettings);dom.on($('#dkaiSend'),'click',()=>void sendChat());
    dom.on($('#dkaiInput'),'keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!$('#dkaiMentions').classList.contains('hidden'))return;if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendChat();}});dom.on($('#dkaiInput'),'input',()=>void updateMentionMenu());
    dom.on($('#dkaiMentions'),'click',event=>{const hit=event.target?.closest?.('[data-mention]');if(!hit)return;chooseMention($('#dkaiMentions')._rows?.[Number(hit.dataset.mention)]);});
    dom.on($('#dkaiRefs'),'click',event=>{const hit=event.target?.closest?.('[data-ref-remove]');if(!hit)return;selectedRefs.splice(Number(hit.dataset.refRemove),1);renderRefs();});

    ctx.commands.register('connectivity.smb.import',()=>openSmb('data'));
    ctx.commands.register('connectivity.smb.project',()=>openSmb('project'));
    ctx.commands.register('connectivity.smb.open',()=>openSmb('auto'));
    ctx.commands.register('connectivity.ai.settings',()=>openSettings());
    ctx.commands.register('connectivity.ai.chat',()=>toggleChat(true));
    if(!ctx.runtime.isAuxiliaryWindow&&ctx.ui.menus?.add){
      ctx.ui.menus.add({id:'smb-import',menu:'import-data',label:'SMB 网络文件…',order:20,onClick:()=>openSmb('data')});
      ctx.ui.menus.add({id:'smb-project',menu:'open-project',label:'SMB 网络项目…',order:20,onClick:()=>openSmb('project')});
      ctx.ui.menus.add({id:'ai-mcp-settings',menu:'manage',label:'AI Agent / MCP…',order:35,onClick:openSettings});
    }

    const cancelStatusPoll=dom.interval(()=>void refreshAiStatus(),10000);
    void refreshAiStatus();
    const mcpSettings=connectivity.mcp.loadSettings?.();if(mcpSettings?.enabled&&mcpSettings.token)void connectivity.mcp.status().then(state=>{if(!state?.running)return connectivity.mcp.start(mcpSettings.token);}).then(()=>refreshAiStatus()).catch(()=>{});
    return {deactivate(){cancelStatusPoll?.();smbOverlay.remove();settingsOverlay.remove();chat.remove();}};
  });
})();
