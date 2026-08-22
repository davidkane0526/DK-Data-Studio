(() => {
  DKDSPlugins.define({
    id:'builtin.status-monitor',pluginType:'foundation',
    name:'Status Monitor',
    version:'1.1.0',
    apiVersion:'1.9.0',requiresCore:["runtime","events","status","services","ui.dom","ui.status-bar"],
    order:7,
    description:'Unified bottom status bar runtime, appearance, memory and LAN state monitor.',
    capabilities:['ui.status-bar','system.runtime-status','lan.web-status']
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

    let runtimeStatus=null;
    let lanStatus=null;
    let stopped=false;
    let cancelMemoryHide=null;

    const themeName=()=>String(window.DKDSTheme?.current?.()||'light')==='dark'?'dark':'light';
    const themeItem=ctx.ui.statusBar.add({
      id:'appearance',side:'right',order:5,
      icon:themeName()==='dark'?'◐':'☼',
      label:themeName()==='dark'?'暗色':'亮色',state:'info',className:'compact appearance-status-item',
      title:themeName()==='dark'?'当前为暗色模式；点击切换到亮色模式':'当前为亮色模式；点击切换到暗色模式',
      onClick:()=>window.DKDSTheme?.toggle?.()
    });

    const runtimeItem=ctx.ui.statusBar.add({
      id:'runtime-mode',side:'right',order:10,icon:'◉',
      label:ctx.runtime.isWebClient?'网页版':'桌面端',state:'info',className:'compact',title:'当前运行模式',
      onClick:()=>{
        const runtime=runtimeStatus?.runtime|| (ctx.runtime.isWebClient?'web':'desktop');
        const platform=runtimeStatus?.platform||navigator.platform||'';
        ctx.status.set(`运行模式：${runtime} ${platform?`· ${platform}`:''}`);
      }
    });

    const panel=ctx.ui.dom.create('aside',{className:'dkds-memory-panel hidden',attrs:{id:'dkdsMemoryBreakdownPanel','aria-label':'内存占用明细'},html:`
      <div class="dkds-memory-panel-head">
        <div><strong>内存占用</strong><span id="dkdsMemoryPanelTotal">—</span></div>
        <button id="dkdsMemoryPanelClose" type="button" title="关闭">×</button>
      </div>
      <div class="dkds-memory-panel-note">按 Electron 进程 / 插件窗口统计工作集内存</div>
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
        return `<div class="dkds-memory-component-row" data-plugin-id="${String(row.pluginId||'').replace(/["&<>]/g,'')}">
          <div class="dkds-memory-component-main"><span class="dkds-memory-component-name">${String(row.label||row.type||'组件').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span><strong>${formatBytes(used)}</strong></div>
          <div class="dkds-memory-component-meta">${meta.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
          <div class="dkds-memory-meter"><span style="width:${ratio.toFixed(1)}%"></span></div>
        </div>`;
      }).join('');
    }
    const showMemoryPanel=()=>{renderMemoryPanel();panel.classList.remove('hidden');scheduleMemoryHide();};

    const memoryItem=ctx.ui.statusBar.add({
      id:'memory',side:'right',order:20,icon:'▤',label:'内存 —',state:'info',className:'compact memory-status-item',title:'实时内存占用；点击查看组件明细',
      onClick:()=>{if(panel.classList.contains('hidden'))showMemoryPanel();else hideMemoryPanel();}
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

    function applyTheme(){
      const dark=themeName()==='dark';
      themeItem.update({icon:dark?'◐':'☼',label:dark?'暗色':'亮色',title:dark?'当前为暗色模式；点击切换到亮色模式':'当前为亮色模式；点击切换到暗色模式'});
    }
    function applyRuntime(status){
      if(!status||stopped)return;
      runtimeStatus=status;
      const runtime=String(status.runtime||'desktop');
      const runtimeLabel=runtime==='web'?'网页版':runtime==='android'?'Android':'桌面端';
      runtimeItem.update({label:runtimeLabel,state:runtime==='web'?'ok':'info',title:`运行模式：${runtimeLabel}`});
      const m=status.memory||{};
      const used=Number(m.workingSetBytes||m.jsHeapUsedBytes)||0;
      const limit=Number(m.jsHeapLimitBytes)||0;
      const ratio=limit>0?used/limit:0;
      memoryItem.update({label:`内存 ${formatBytes(used)}`,state:ratio>.9?'error':ratio>.78?'warn':'info',title:`实时内存占用 ${formatBytes(used)}；点击查看 ${Number(status.processCount)||0} 个组件 / 进程明细`});
      if(!panel.classList.contains('hidden'))renderMemoryPanel();
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
    const onOutsidePointer=event=>{if(panel.classList.contains('hidden'))return;if(panel.contains(event.target)||memoryItem.element?.contains?.(event.target))return;hideMemoryPanel();};
    const onKeyDown=event=>{if(event.key==='Escape'&&!panel.classList.contains('hidden'))hideMemoryPanel();};
    ctx.ui.dom.on(window,'dkds:theme-changed',onThemeChanged);
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
      deactivate(){
        stopped=true;stopPolling?.();clearMemoryTimer();panel.remove();
      },
      getState(){return {runtimeStatus,lanStatus,theme:themeName()};}
    };
  });
})();
