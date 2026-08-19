(() => {
  DKDSPlugins.define({
    id:'builtin.status-monitor',
    name:'Status Monitor',
    version:'1.0.0',
    apiVersion:'1.8.0',requiresCore:["runtime","events","status","services","ui.dom","ui.status-bar"],
    order:7,
    description:'Unified bottom status bar runtime and LAN state monitor.',
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

    const runtimeItem=ctx.ui.statusBar.add({
      id:'runtime-mode',
      side:'right',
      order:10,
      icon:'◉',
      label:ctx.runtime.isWebClient?'网页版':'桌面端',
      state:'info',
      className:'compact',
      title:'当前运行模式',
      onClick:()=>{
        const runtime=runtimeStatus?.runtime|| (ctx.runtime.isWebClient?'web':'desktop');
        const platform=runtimeStatus?.platform||navigator.platform||'';
        ctx.status.set(`运行模式：${runtime} ${platform?`· ${platform}`:''}`);
      }
    });

    const memoryItem=ctx.ui.statusBar.add({
      id:'memory',
      side:'right',
      order:20,
      icon:'▤',
      label:'内存 —',
      state:'info',
      className:'compact',
      title:'实时内存占用',
      onClick:()=>{
        const m=runtimeStatus?.memory||{};
        const used=Number(m.workingSetBytes||m.jsHeapUsedBytes)||0;
        const limit=Number(m.jsHeapLimitBytes)||0;
        const processes=Number(runtimeStatus?.processCount)||0;
        ctx.status.set(
          limit>0
            ? `内存：${formatBytes(used)} / JS 上限 ${formatBytes(limit)}`
            : `内存：${formatBytes(used)}${processes?` · ${processes} 个进程`:''}`
        );
      }
    });

    const lanItem=ctx.ui.statusBar.add({
      id:'lan-web',
      side:'right',
      order:30,
      icon:'●',
      label:ctx.runtime.isWebClient?'网页版 已连接':'网页版 检查中',
      state:ctx.runtime.isWebClient?'ok':'info',
      title:'局域网网页版状态；点击打开/恢复面板',
      onClick:()=>{
        if(ctx.runtime.isWebClient){
          ctx.status.set(`当前就是局域网网页版：${location.origin}`);
          return;
        }
        void lanService.openPanel?.();
      }
    });

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
      memoryItem.update({
        label:`内存 ${formatBytes(used)}`,
        state:ratio>.9?'error':ratio>.78?'warn':'info',
        title:limit>0?`JS 内存 ${formatBytes(used)} / ${formatBytes(limit)}`:`实时内存占用 ${formatBytes(used)}`
      });
    }

    function applyLan(status){
      if(stopped)return;
      if(ctx.runtime.isWebClient){
        lanStatus={running:true,webClient:true,pairedClients:1,urls:[location.origin]};
        lanItem.update({label:'网页版 已连接',state:'ok',title:`当前网页版：${location.origin}`});
        return;
      }
      if(!status)return;
      lanStatus=status;
      const running=!!status.running;
      const clients=Number(status.pairedClients)||0;
      const label=status.error
        ? '网页版 异常'
        : running
          ? `网页版 已开启${clients?` · ${clients}`:''}`
          : '网页版 已关闭';
      lanItem.update({
        label,
        state:status.error?'error':running?'ok':'warn',
        title:status.error
          ? `局域网网页版启动失败：${status.error}`
          : running
            ? `局域网网页版正在运行${clients?`，已配对 ${clients} 个会话`:''}；点击打开面板`
            : '局域网网页版未运行；点击打开面板'
      });
    }

    async function refreshRuntime(){
      try{
        const status=await runtimeService.getStatus?.();
        if(status)applyRuntime(status);
      }catch(err){
        memoryItem.update({label:'内存 —',state:'warn',title:`无法读取内存状态：${err?.message||err}`});
      }
    }

    async function refreshLan(){
      if(ctx.runtime.isWebClient){applyLan();return;}
      try{
        const status=await lanService.getStatus?.();
        if(status)applyLan(status);
      }catch(err){
        lanItem.update({label:'网页版 状态未知',state:'warn',title:`无法读取局域网网页版状态：${err?.message||err}`});
      }
    }

    ctx.events.on('lanweb:status',applyLan);
    await Promise.all([refreshRuntime(),refreshLan()]);
    const stopPolling=ctx.ui.dom.interval(()=>{void refreshRuntime();void refreshLan();},1500);

    return {
      deactivate(){stopped=true;stopPolling?.();},
      getState(){return {runtimeStatus,lanStatus};}
    };
  });
})();
