(() => {
  DKDSPlugins.define({
    id:'builtin.status-monitor',pluginType:'foundation',
    name:'Status Monitor',
    version:'1.3.0',
    apiVersion:'1.9.0',requiresCore:["runtime","events","status","services","ui.dom","ui.status-bar","ui.theme"],
    order:7,
    description:'Unified bottom status bar for theme selection, memory, DevTools and LAN state.',
    capabilities:['ui.status-bar','system.runtime-status','lan.web-status','ui.theme']
  }, async ctx => {
    const runtimeService=ctx.services.require('runtime');
    const lanService=ctx.services.require('lanWeb');
    const formatBytes=value=>{
      const n=Number(value)||0;
      if(n<=0)return '—';
      const units=['B','KB','MB','GB'];
      let x=n,i=0;
      while(x>=1024&&i<units.length-1){x/=1024;i++;}
      const digits=i>=3?2:i>=2?1:0;
      return `${x.toFixed(digits)} ${units[i]}`;
    };
    const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    let runtimeStatus=null;
    let lanStatus=null;
    let stopped=false;
    let cancelMemoryHide=null;

    const themeMode=()=>String(window.DKDSTheme?.current?.()||'light')==='dark'?'dark':'light';
    const themeProfile=()=>String(window.DKDSTheme?.profile?.()||'builtin.default');
    const themeProfiles=()=>Array.isArray(window.DKDSTheme?.listProfiles?.())?window.DKDSTheme.listProfiles():[];
    const themeLabel=()=>themeProfiles().find(row=>String(row?.id||'')===themeProfile())?.label||themeProfile();

    const themeItem=ctx.ui.statusBar.add({
      id:'theme',side:'right',order:10,icon:'◐',label:'主题',state:'info',className:'compact theme-status-item',
      title:'选择主题',onClick:()=>toggleThemePanel()
    });

    const themePanel=ctx.ui.dom.create('aside',{className:'dkds-theme-panel dkds-material-role-popover hidden',attrs:{id:'dkdsThemePanel','aria-label':'主题选择'},html:`
      <div class="dkds-theme-panel-head dkds-surface-header">
        <div class="dkds-theme-panel-heading"><strong>主题</strong><span id="dkdsThemeCurrentLabel">—</span></div>
        <button id="dkdsThemePanelClose" class="dkds-icon-button" type="button" title="关闭" aria-label="关闭">×</button>
      </div>
      <div class="dkds-theme-panel-body">
        <div id="dkdsThemeProfileList" class="dkds-theme-profile-list" role="listbox" aria-label="主题配置"></div>
        <div class="dkds-theme-mode-row">
          <span>外观</span>
          <button id="dkdsThemeSettingsBtn" class="dkds-theme-settings-inline hidden" type="button">参数</button>
          <div class="dkds-integrated-action-group dkds-material-role-control dkds-theme-mode-switch" role="group" aria-label="亮暗模式">
            <button type="button" data-dkds-theme-mode="light">亮色</button>
            <button type="button" data-dkds-theme-mode="dark">暗色</button>
          </div>
        </div>
      </div>`});
    ctx.ui.dom.append(ctx.ui.dom.query('#app')||ctx.ui.dom.root(),themePanel);
    const themeList=ctx.ui.dom.query('#dkdsThemeProfileList',themePanel);
    const themeCurrentLabel=ctx.ui.dom.query('#dkdsThemeCurrentLabel',themePanel);
    const themeSettingsBtn=ctx.ui.dom.query('#dkdsThemeSettingsBtn',themePanel);

    function renderThemePanel(){
      const currentProfile=themeProfile(),mode=themeMode(),rows=themeProfiles();
      if(themeCurrentLabel)themeCurrentLabel.textContent=themeLabel();
      if(themeList)themeList.innerHTML=rows.map(row=>{
        const id=String(row?.id||''),active=id===currentProfile;
        return `<button type="button" class="dkds-theme-profile-option${active?' active':''}" data-theme-profile="${esc(id)}" role="option" aria-selected="${active?'true':'false'}"><span class="dkds-theme-profile-check">${active?'✓':''}</span><span class="dkds-theme-profile-name">${esc(row?.label||id)}</span></button>`;
      }).join('');
      if(themeSettingsBtn)themeSettingsBtn.classList.toggle('hidden',!(window.DKDSTheme?.settings?.(currentProfile)||[]).length);
      for(const button of themePanel.querySelectorAll('[data-dkds-theme-mode]')){
        const active=button.dataset.dkdsThemeMode===mode;
        button.classList.toggle('active',active);button.setAttribute('aria-pressed',active?'true':'false');
      }
      themeItem.update({icon:mode==='dark'?'◐':'☼',label:'主题',title:`主题：${themeLabel()} · ${mode==='dark'?'暗色':'亮色'}`});
    }
    const hideThemePanel=()=>themePanel.classList.add('hidden');
    const showThemePanel=()=>{renderThemePanel();themePanel.classList.remove('hidden');};
    function toggleThemePanel(){if(themePanel.classList.contains('hidden'))showThemePanel();else hideThemePanel();}

    ctx.ui.dom.on(themeList,'click',event=>{
      const button=event.target.closest?.('[data-theme-profile]');if(!button)return;
      const id=String(button.dataset.themeProfile||'');
      try{window.DKDSTheme?.setProfile?.(id);renderThemePanel();}catch(err){ctx.status.set(`主题切换失败：${err?.message||err}`);}
    });
    ctx.ui.dom.on(themePanel,'click',event=>{
      const button=event.target.closest?.('[data-dkds-theme-mode]');if(!button)return;
      try{window.DKDSTheme?.set?.(button.dataset.dkdsThemeMode);renderThemePanel();}catch(err){ctx.status.set(`外观切换失败：${err?.message||err}`);}
    });
    ctx.ui.dom.on(themeSettingsBtn,'click',()=>window.DKDSThemeSettingsUI?.open?.(themeProfile()));
    ctx.ui.dom.on(ctx.ui.dom.query('#dkdsThemePanelClose',themePanel),'click',hideThemePanel);

    const panel=ctx.ui.dom.create('aside',{className:'dkds-memory-panel hidden dkds-material-role-floating',attrs:{id:'dkdsMemoryBreakdownPanel','aria-label':'内存占用明细'},html:`
      <div class="dkds-memory-panel-head">
        <div><strong>内存占用</strong><span id="dkdsMemoryPanelTotal">—</span></div>
        <button id="dkdsMemoryPanelClose" type="button" title="关闭">×</button>
      </div>
      <div class="dkds-memory-panel-note">${ctx.runtime.isNativeClient?'按 Android 应用进程 PSS 统计实际驻留内存':'按 Electron 进程 / 插件窗口统计工作集内存'}</div>
      <div id="dkdsMemoryComponentList" class="dkds-memory-component-list"></div>`});
    ctx.ui.dom.append(ctx.ui.dom.query('#app')||ctx.ui.dom.root(),panel);
    const componentList=ctx.ui.dom.query('#dkdsMemoryComponentList',panel);
    const totalLabel=ctx.ui.dom.query('#dkdsMemoryPanelTotal',panel);

    const clearMemoryTimer=()=>{cancelMemoryHide?.();cancelMemoryHide=null;};
    const hideMemoryPanel=()=>{clearMemoryTimer();panel.classList.add('hidden');};
    const scheduleMemoryHide=(ms=6500)=>{clearMemoryTimer();cancelMemoryHide=ctx.ui.dom.timeout(()=>{cancelMemoryHide=null;hideMemoryPanel();},ms);};
    function renderMemoryPanel(){
      const status=runtimeStatus||{};
      const total=Number(status.memory?.workingSetBytes||status.memory?.jsHeapUsedBytes)||0;
      const rows=(Array.isArray(status.components)?status.components:[])
        .filter(row=>Number(row?.workingSetBytes)>0)
        .sort((a,b)=>(Number(b.workingSetBytes)||0)-(Number(a.workingSetBytes)||0));
      totalLabel.textContent=total>0?`总计 ${formatBytes(total)}`:'—';
      if(!rows.length){componentList.innerHTML='<div class="dkds-memory-empty">当前运行环境没有提供组件级内存明细。</div>';return;}
      componentList.innerHTML=rows.map(row=>{
        const used=Number(row.workingSetBytes)||0;
        const ratio=total>0?Math.max(3,Math.min(100,used/total*100)):0;
        const meta=[String(row.type||''),Number(row.pid)>0?`PID ${row.pid}`:''].filter(Boolean).join(' · ');
        return `<div class="dkds-memory-component-row" data-plugin-id="${esc(row.pluginId||'')}">
          <div class="dkds-memory-component-main"><span class="dkds-memory-component-name">${esc(row.label||row.type||'组件')}</span><strong>${formatBytes(used)}</strong></div>
          <div class="dkds-memory-component-meta">${esc(meta)}</div>
          <div class="dkds-memory-meter"><span style="width:${ratio.toFixed(1)}%"></span></div>
        </div>`;
      }).join('');
    }
    const showMemoryPanel=()=>{renderMemoryPanel();panel.classList.remove('hidden');scheduleMemoryHide();};

    const memoryItem=ctx.ui.statusBar.add({
      id:'memory',side:'right',order:20,icon:'▤',label:'内存 —',state:'info',className:'compact memory-status-item',title:'实时内存占用；点击查看组件明细',
      onClick:()=>{if(panel.classList.contains('hidden'))showMemoryPanel();else hideMemoryPanel();}
    });

    const devToolsItem=ctx.ui.statusBar.add({
      id:'devtools',side:'right',order:25,icon:'⌘',label:'DevTool',state:'info',className:'compact devtools-status-item',hidden:ctx.runtime.isWebClient||ctx.runtime.isNativeClient||typeof runtimeService.toggleDevTools!=='function',
      title:'打开当前窗口 DevTools',
      onClick:async()=>{try{if(window.DKDSPluginDevTools?.toggle){window.DKDSPluginDevTools.toggle();devToolsItem.update({state:'ok',title:'打开 Plugin DevTools；Chromium 可从面板内进入'});return;}const state=await runtimeService.toggleDevTools?.();devToolsItem.update({state:state?.open?'ok':'info',title:state?.open?'关闭当前窗口 DevTools':'打开当前窗口 DevTools'});}catch(err){ctx.status.set(`DevTool：${err?.message||err}`);}}
    });

    const lanItem=ctx.ui.statusBar.add({
      id:'lan-web',side:'right',order:30,icon:'●',
      label:ctx.runtime.isWebClient?'网页版 已连接':'网页版 检查中',state:ctx.runtime.isWebClient?'ok':'info',
      title:'局域网网页版状态；点击打开/恢复面板',
      onClick:()=>{
        if(ctx.runtime.isWebClient){ctx.status.set(`当前就是局域网网页版：${location.origin}`);return;}
        void lanService.openPanel?.();
      }
    });

    function applyTheme(){renderThemePanel();}
    function applyRuntime(status){
      if(!status||stopped)return;
      runtimeStatus=status;
      const m=status.memory||{};
      const used=Number(m.workingSetBytes||m.jsHeapUsedBytes)||0;
      const limit=Number(m.jsHeapLimitBytes)||0;
      const ratio=limit>0?used/limit:0;
      memoryItem.update({label:`内存 ${formatBytes(used)}`,state:ratio>.9?'error':ratio>.78?'warn':'info',title:`实时内存占用 ${formatBytes(used)}；点击查看 ${Number(status.processCount)||0} 个组件 / 进程明细`});
      if(!panel.classList.contains('hidden'))renderMemoryPanel();
      if(!ctx.runtime.isWebClient&&typeof runtimeService.getDevToolsState==='function')void Promise.resolve(runtimeService.getDevToolsState()).then(state=>devToolsItem.update({hidden:state?.available===false,state:state?.open?'ok':'info',title:state?.open?'关闭当前窗口 DevTools':'打开当前窗口 DevTools'})).catch(()=>{});
    }
    function applyLan(status){
      if(stopped)return;
      if(ctx.runtime.isWebClient){lanStatus={running:true,webClient:true,pairedClients:1,urls:[location.origin]};lanItem.update({label:'网页版 已连接',state:'ok',title:`当前网页版：${location.origin}`});return;}
      if(!status)return;
      lanStatus=status;
      const running=!!status.running,clients=Number(status.pairedClients)||0;
      const label=status.error?'网页版 异常':running?`网页版 已开启${clients?` · ${clients}`:''}`:'网页版 已关闭';
      lanItem.update({label,state:status.error?'error':running?'ok':'warn',title:status.error?`局域网网页版启动失败：${status.error}`:running?`局域网网页版正在运行${clients?`，已配对 ${clients} 个会话`:''}；点击打开面板`:'局域网网页版未运行；点击打开面板'});
    }
    async function refreshRuntime(){
      try{const status=await runtimeService.getStatus?.();if(status)applyRuntime(status);}
      catch(err){memoryItem.update({label:'内存 —',state:'warn',title:`无法读取内存状态：${err?.message||err}`});}
    }
    async function refreshLan(){
      if(ctx.runtime.isWebClient){applyLan();return;}
      try{const status=await lanService.getStatus?.();if(status)applyLan(status);}
      catch(err){lanItem.update({label:'网页版 状态未知',state:'warn',title:`无法读取局域网网页版状态：${err?.message||err}`});}
    }

    const onThemeChanged=()=>applyTheme();
    const onPanelPointerEnter=()=>clearMemoryTimer();
    const onPanelPointerLeave=()=>scheduleMemoryHide(2200);
    const onOutsidePointer=event=>{
      if(!themePanel.classList.contains('hidden')&&!themePanel.contains(event.target)&&!themeItem.element?.contains?.(event.target))hideThemePanel();
      if(!panel.classList.contains('hidden')&&!panel.contains(event.target)&&!memoryItem.element?.contains?.(event.target))hideMemoryPanel();
    };
    const onKeyDown=event=>{if(event.key!=='Escape')return;hideThemePanel();hideMemoryPanel();};
    ctx.ui.dom.on(window,'dkds:theme-changed',onThemeChanged);
    ctx.ui.dom.on(window,'dkds:theme-profile-changed',onThemeChanged);
    ctx.ui.dom.on(panel,'pointerenter',onPanelPointerEnter);
    ctx.ui.dom.on(panel,'pointerleave',onPanelPointerLeave);
    ctx.ui.dom.on(ctx.ui.dom.query('#dkdsMemoryPanelClose',panel),'click',hideMemoryPanel);
    ctx.ui.dom.on(ctx.ui.dom.root(),'pointerdown',onOutsidePointer,true);
    ctx.ui.dom.on(ctx.ui.dom.root(),'keydown',onKeyDown,true);
    ctx.events.on('lanweb:status',applyLan);
    applyTheme();
    await Promise.all([refreshRuntime(),refreshLan()]);
    const stopPolling=ctx.ui.dom.interval(()=>{void refreshRuntime();void refreshLan();},1500);

    return {
      deactivate(){stopped=true;stopPolling?.();clearMemoryTimer();themePanel.remove();panel.remove();},
      getState(){return {runtimeStatus,lanStatus,theme:{mode:themeMode(),profile:themeProfile()}};}
    };
  });
})();
