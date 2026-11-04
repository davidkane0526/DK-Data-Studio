(() => {
  'use strict';
  const manifest={
    id:'com.dkds.keithley-4200',name:'Keithley 4200A KXCI',version:'0.3.0',apiVersion:'1.19.0',entry:'plugin.js',
    scripts:['measurement-model.js','kxci-protocol.js','unit-presentation.js','plugin.js'],styles:['plugin.css'],enabled:false,
    description:"Automatic Keithley 4200A connection and identity verification with a compact simulation workbench.",
    pluginType:'developer',workspace:{role:'top',activity:'keithley-4200',icon:'K',title:'Keithley 4200A'},window:{activity:'keithley-4200',title:'Keithley 4200A KXCI',width:1280,height:850,minWidth:880,minHeight:620,dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project'},
    requiresCore:['runtime','status','services','modules','project','io','workspace','capabilities','ui.dom','ui.activities','ui.top-workspace','ui.pages','ui.unit-templates','ui.scientific-plot','ui.table'],
    capabilities:['instrument.keithley-4200','network.tcp-client','ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','ui.table'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}
  };
  DKDSPlugins.define(manifest,async ctx=>{
    const tcp=ctx.services.require('tcp');
    const Model=ctx.modules.require('measurement-model');
    const Kxci=ctx.modules.require('kxci-protocol');
    const Presentation=ctx.modules.require('unit-presentation');
    const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8');
    let session=null,sessionTarget=null,identified=null,ui=null,connectPending=null;
    let dataset=null,run=null,plotByCycle=new Map(),commandTail=Promise.resolve();
    const connectionKeys=['host','port','networkMode','expectedSerial','mobileHost','mobilePort','mobileNetworkMode','mobilePairKey'];
    const planKeys=['mode','direction','loops','points','startV','stopV','complianceA','delayMs','speed','sourceSmU','measureSmU','gateSmU','gateBiasV'];
    const enqueue=fn=>{const task=commandTail.then(fn,fn);commandTail=task.catch(()=>{});return task;};
    const message=error=>String(error?.message||error||'未知错误');
    const connectionHint=(failures,target)=>{
      const joined=failures.join(' ').toLowerCase(),address=target.host+':'+target.port;
      if(/en(et)?unreach|network is unreachable|no route to host/.test(joined))return '无法到达 '+address+'。请检查网线与 IP 路由，或选择平板中继。';
      if(/econnrefused|connection refused/.test(joined))return '已到达 '+target.host+'，但端口 '+target.port+' 拒绝连接。请确认 KXCI 服务已启动。';
      if(/serial|序列号|manufacturer|model|identity|识别|idn/.test(joined))return '网络已接通，但仪器身份校验失败。请检查型号与序列号。';
      if(/timeout|timed out|etimedout/.test(joined))return '连接 '+address+' 超时。请检查网线、路由与 KXCI 服务。';
      return '未能连接 '+address+'。请检查网络或展开连接诊断。';
    };
    const status=(text,detail='')=>{ctx.status.set('Keithley 4200A：'+text);if(ui?.setConnectionState){const state=text==='已连接'?'connected':/正在|探测|校验/.test(text)?'connecting':/失败|异常/.test(text)?'error':'idle';ui.setConnectionState(state,text,detail);}};
    const encodeBase64=text=>{
      const bytes=encoder.encode(text);let binary='';
      for(const n of bytes)binary+=String.fromCharCode(n);
      return btoa(binary);
    };
    const decodeBase64=base64=>{
      const binary=atob(String(base64||''));const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      return decoder.decode(bytes);
    };
    const endpoint=()=>{
      const networkMode=String(ui.get('networkMode')||'auto');
      return {
        host:String(ui.get('host')||'169.254.111.118').trim(),
        port:Number(ui.get('port')||1225),
        networkMode,
        connectTimeoutMs:networkMode==='via-mobile'?2500:1800,
        readTimeoutMs:networkMode==='via-mobile'?2500:1500,
        expectedSerial:String(ui.get('expectedSerial')||'').trim(),
        mobileHost:String(ui.get('mobileHost')||'').trim(),
        mobilePort:Number(ui.get('mobilePort')||45910),
        mobileNetworkMode:String(ui.get('mobileNetworkMode')||'auto'),
        mobilePairKey:String(ui.get('mobilePairKey')||'').trim()
      };
    };
    const validateEndpoint=value=>{
      if(!value.host||value.host.length>253||/[\s\/\\]/.test(value.host))throw Error('请输入有效仪器 IP 或主机名');
      if(!Number.isInteger(value.port)||value.port<1||value.port>65535)throw Error('KXCI TCP 端口无效');
      if(!['auto','via-mobile','wifi','ethernet','interface'].includes(value.networkMode))throw Error('无效连接路径');
      if(value.networkMode==='via-mobile'){
        if(!tcp.supportsRelay)throw Error('通过移动端模式仅支持 Windows 桌面程序');
        const octets=value.mobileHost.split('.').map(Number);
        if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('请输入有效的平板 Wi-Fi IPv4 地址');
        if(!Number.isInteger(value.mobilePort)||value.mobilePort<1024||value.mobilePort>65535)throw Error('平板服务端口无效');
        if(!/^\d{4}$/.test(value.mobilePairKey))throw Error('请输入平板当前显示的 4 位配对 Key');
        if(!['auto','wifi','ethernet'].includes(value.mobileNetworkMode))throw Error('平板连接路径无效');
      }
      return value;
    };
    const routeKey=t=>JSON.stringify([t.host,t.port,t.networkMode,t.networkMode==='via-mobile'?[t.mobileHost,t.mobilePort,t.mobileNetworkMode,t.mobilePairKey]:null]);
    const withoutSecret=t=>{if(!t)return null;const {mobilePairKey,...rest}=t;return rest;};
    const currentRoute=()=>sessionTarget?routeKey(sessionTarget):null;
    async function closeSession(){
      const old=session?.sessionId;session=null;sessionTarget=null;identified=null;
      if(old)try{await tcp.close({sessionId:old});}catch{}
      status('未连接','下次进入工作台时会自动重新探测。');
      return true;
    }
    async function connectAndIdentify(){
      const target=validateEndpoint(endpoint());
      if(session&&identified&&currentRoute()===routeKey(target)){
        ui?.setConnectionState?.('connected','已连接',identified.model+' · S/N '+identified.serial);
        return identified;
      }
      if(session)await closeSession();
      // Auto enumerates all eligible Ethernet/Wi-Fi interfaces; avoid repeating the same probes.
      const modes=target.networkMode==='via-mobile'?['via-mobile']:['auto'];
      const failures=[];
      ui?.setConnectionState?.('connecting','正在自动连接…','依次检查可用网卡与网络路由；随后自动校验仪器身份。');
      for(const mode of modes){
        const attempt={...target,networkMode:mode};
        try{
          const opened=await tcp.open({
            host:target.host,port:target.port,networkMode:mode,
            preferLinkLocalEthernet:mode==='auto'&&target.host.startsWith('169.254.'),
            connectTimeoutMs:target.connectTimeoutMs,
            ...(mode==='via-mobile'?{
              mobileHost:target.mobileHost,mobilePort:target.mobilePort,
              mobilePairKey:target.mobilePairKey,mobileNetworkMode:target.mobileNetworkMode
            }:{})
          });
          session=opened;sessionTarget=target;identified=null;
          const routeDetail=[opened.interfaceName,opened.localAddress,opened.routeStrategy,opened.networkPreparation]
            .filter(Boolean).join(' · ');
          ui?.setConnectionState?.('connecting','网络已接通，正在识别仪器…',routeDetail||target.host+':'+target.port);
          const answer=await tcp.exchange({
            sessionId:session.sessionId,base64:encodeBase64(Kxci.IDN_REQUEST),
            readTimeoutMs:target.readTimeoutMs,idleTimeoutMs:120,maxBytes:8192
          });
          identified=Kxci.parseIdentity(decodeBase64(answer?.base64||''),target.expectedSerial);
          status('已连接',identified.model+' · S/N '+identified.serial+' · '+(routeDetail||target.host+':'+target.port));
          return identified;
        }catch(error){
          failures.push((mode==='via-mobile'?'平板中继':mode==='auto'?'自动网卡探测':mode==='ethernet'?'网线':'Wi-Fi')+'：'+message(error));
          const old=session?.sessionId;session=null;sessionTarget=null;identified=null;
          if(old)try{await tcp.close({sessionId:old});}catch{}
        }
      }
      const hint=connectionHint(failures,target);
      const diagnostic=['目标：'+target.host+':'+target.port,'尝试过的连接路径：',...failures].join('\n\n');
      ctx.status.set('Keithley 4200A：连接失败');
      ui?.setConnectionState?.('error','连接失败',hint,diagnostic);
      const error=new Error(hint);error.connectionHandled=true;
      throw error;
    }
    const connect=()=>{
      if(connectPending)return connectPending;
      const request=enqueue(connectAndIdentify);
      connectPending=request;
      request.then(()=>{if(connectPending===request)connectPending=null;},()=>{if(connectPending===request)connectPending=null;});
      return request;
    };
    const disconnect=()=>enqueue(closeSession);
    const toggleConnection=()=>enqueue(async()=>session?closeSession():connectAndIdentify());
    const form=keys=>Object.fromEntries(keys.map(key=>[key,ui.get(key)]));
    function plan(){return Model.validatePlan(form(planKeys));}
    function preview(){
      try{
        const p=plan();
        const first=Model.sample(p,0),last=Model.sample(p,p.totalPoints-1);
        ui.renderPreview('方案有效（仅仿真）：'+p.mode+' · '+p.direction+' · '+p.loops+' 循环 · 每循环 '+p.perCycle+' 点 · 共 '+p.totalPoints+' 点。首点 '+Number(first.x).toPrecision(4)+'，末点 '+Number(last.x).toPrecision(4)+'。端口 '+p.sourceSmU+'/'+p.measureSmU+'/'+p.gateSmU+'；限流 '+p.complianceA+' A。硬件量程与实际命令尚未验证。');
        return p;
      }catch(error){ui.renderPreview('方案错误：'+message(error));throw error;}
    }
    const plotCurves=()=>{
      const list=[...plotByCycle.entries()].slice(-12);
      return list.map(([cycle,points])=>({id:'sim-cycle-'+cycle,label:'模拟 Cycle '+cycle,points}));
    };
    function renderData(){
      if(!dataset)return;
      ui.renderData(plotCurves(),dataset.rows.slice(-100));
      ui.renderProgress('SIMULATION · '+dataset.rows.length+' / '+dataset.plan.totalPoints+' 点 · '+(run?'采集中':dataset.stopped?'用户停止':'完成')+' · 图中最多显示最后 12 个循环，表格显示最后 100 点');
    }
    function stop(){
      if(!run)return false;
      run.cancelled=true;
      run.timer?.();
      run=null;
      if(dataset){dataset.complete=true;dataset.stopped=true;}
      ui.setRunning(false);renderData();ctx.status.set('Keithley 4200A：仿真已停止；已采集数据保留。');
      return true;
    }
    function simulate(){
      if(run)throw Error('已有仿真采集进行中');
      const p=preview();
      dataset=Model.createDataset(p,null);
      plotByCycle=new Map();
      let index=0,plotAt=0;
      const token={cancelled:false,timer:null};
      run=token;ui.setRunning(true);ui.renderProgress('SIMULATION · 初始化');
      const speedFactor=p.speed==='fast'?4:p.speed==='quiet'?1:2;
      const tickMs=Math.max(20,Math.min(200,p.delayMs||20));
      const batch=Math.max(1,Math.min(40,Math.round(speedFactor*40/tickMs)));
      const step=()=>{
        if(run!==token||token.cancelled)return;
        const now=Date.now();
        for(let i=0;i<batch&&index<p.totalPoints;i++,index++){
          const s=Model.sample(p,index),v=s.voltageV;
          const measuredV=v*0.9999;
          const current=(0.000002*Math.tanh(v*3)+0.00000035*v+Math.sin(index*0.19)*0.000000025);
          const r=Model.append(dataset,{cycle:s.cycle,point:s.point,elapsed_s:index*p.delayMs/1000,set_v:v,read_v:measuredV,read_a:current,status:'simulated'});
          let points=plotByCycle.get(r.cycle);
          if(!points){points=[];plotByCycle.set(r.cycle,points);if(plotByCycle.size>12)plotByCycle.delete(plotByCycle.keys().next().value);}
          if(points.length<1800||r.point%Math.ceil(p.perCycle/1800)===0)points.push({x:p.mode==='timed'?r.elapsed_s:r.set_v,y:r.read_a});
        }
        if(now-plotAt>160){plotAt=now;renderData();}
        if(index>=p.totalPoints){
          run=null;dataset.complete=true;dataset.stopped=false;ui.setRunning(false);renderData();
          ctx.status.set('Keithley 4200A：模拟采集完成；'+dataset.rows.length+' 点。');
        }else token.timer=ctx.ui.dom.timeout(step,tickMs);
      };
      token.timer=ctx.ui.dom.timeout(step,0);
      return {simulated:true,totalPoints:p.totalPoints};
    }
    async function saveFile(name,text,extension){
      if(!dataset||!dataset.rows.length)throw Error('尚无数据可导出');
      const ok=await ctx.io.saveText({defaultName:name,content:text,filters:[{name:extension.toUpperCase(),extensions:[extension]}],source:'plugin:com.dkds.keithley-4200:simulation-export'});
      if(ok)ctx.status.set('Keithley 4200A：已导出 '+name);
      return !!ok;
    }
    const exportCsv=()=>saveFile('4200-simulation.csv',Model.csv(dataset),'csv');
    const exportJson=()=>saveFile('4200-simulation.json',JSON.stringify(dataset,null,2),'json');
    function svgImage(){
      const curves=plotCurves();
      if(!curves.some(c=>c.points.length))throw Error('没有可绘制的数据');
      const all=curves.flatMap(c=>c.points);
      let minX=Math.min(...all.map(p=>p.x)),maxX=Math.max(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxY=Math.max(...all.map(p=>p.y));
      if(minX===maxX){minX-=1;maxX+=1;}if(minY===maxY){minY-=1e-9;maxY+=1e-9;}
      const width=1100,height=650,left=115,right=35,top=55,bottom=85;
      const x=p=>left+(p-minX)/(maxX-minX)*(width-left-right);
      const y=p=>height-bottom-(p-minY)/(maxY-minY)*(height-top-bottom);
      const colors=['#2563eb','#f97316','#16a34a','#9333ea','#dc2626','#0891b2'];
      const xt=dataset.plan.mode==='timed'?'Time (s)':'Source voltage (V)';
      // Compose an export-only SVG as XML nodes. Avoid injecting SVG paint
      // markup directly into plugin source or styling the live application DOM.
      const ns='http://www.w3.org/2000/svg';
      const escXml=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const element=(tag,attrs={},value=null,raw=false)=>{
        const attributes=Object.entries(attrs).map(([key,item])=>' '+key+'="'+escXml(item)+'"').join('');
        return value===null?'<'+tag+attributes+'/>':'<'+tag+attributes+'>'+(raw?String(value):escXml(value))+'</'+tag+'>';
      };
      const items=[
        element('rect',{width:'100%',height:'100%',fill:'white'}),
        element('text',{x:50,y:30,'font-size':20},'Keithley 4200A — SIMULATION ONLY'),
        element('line',{x1:left,y1:top,x2:left,y2:height-bottom,stroke:'#333'}),
        element('line',{x1:left,y1:height-bottom,x2:width-right,y2:height-bottom,stroke:'#333'}),
        element('text',{x:width/2-60,y:height-25,'font-size':18},xt),
        element('text',{x:12,y:height/2,'font-size':18},'Current (A)'),
        element('text',{x:left,y:height-45,'font-size':14},minX.toPrecision(4)),
        element('text',{x:width-right-75,y:height-45,'font-size':14},maxX.toPrecision(4)),
        element('text',{x:15,y:top,'font-size':14},maxY.toExponential(3)),
        element('text',{x:15,y:height-bottom,'font-size':14},minY.toExponential(3))
      ];
      curves.forEach((curve,i)=>items.push(element('polyline',{fill:'none',stroke:colors[i%colors.length],'stroke-width':2,points:curve.points.map(p=>x(p.x).toFixed(2)+','+y(p.y).toFixed(2)).join(' ')})));
      return '<?xml version="1.0" encoding="UTF-8"?>\n'+
        element('svg',{xmlns:ns,width,height,viewBox:'0 0 '+width+' '+height},items.join(''),true);
    }
    const exportSvg=()=>saveFile('4200-simulation-curve.svg',svgImage(),'svg');
    function onEdit(id){
      if(connectionKeys.includes(id)){
        identified=null;
        if(session)void enqueue(closeSession);
        ui?.setConnectionState?.('idle','连接参数已修改','参数仅在本次页面会话有效；点击连接重新探测。');
      }
      if(planKeys.includes(id)){
        try{preview();}catch{}
        ctx.project.capture();
      }
    }
    function safe(fn){return (...args)=>{const fail=e=>{ctx.status.set('Keithley 4200A：操作失败');ui?.renderProgress?.('操作失败：'+message(e).slice(0,120));return false;};try{return Promise.resolve(fn(...args)).catch(fail);}catch(e){return fail(e);}};}
    function safeConnection(fn){return (...args)=>{const fail=e=>{if(e?.connectionHandled)return false;const hint=message(e).slice(0,150);ctx.status.set('Keithley 4200A：连接失败');ui?.setConnectionState?.('error','连接失败',hint,message(e));return false;};try{return Promise.resolve(fn(...args)).catch(fail);}catch(e){return fail(e);}};}
    ctx.ui.activities.add({id:'keithley-4200',label:'4200A',contextLabel:'Keithley 4200A',icon:'K',order:82,primary:true,openMode:'window',description:'KXCI 连接 + 安全仿真测试工作台',onActivate:()=>{ctx.workspace.openPage('keithley4200Page');void safeConnection(connect)();}});
    const page=ctx.ui.pages.add({id:'keithley-4200-page',pageId:'keithley4200Page',activity:'keithley-4200',label:'4200A',title:'Keithley 4200A KXCI',toolbar:false,html:'',onOpen:()=>{void safeConnection(connect)();}});
    ui=Presentation.mount(ctx,page,{
      onEdit,
      desktopHost:tcp.supportsRelay===true,
      toggleConnection:safeConnection(toggleConnection),
      preview:safe(preview),simulate:safe(simulate),stop:safe(stop),
      exportCsv:safe(exportCsv),exportJson:safe(exportJson),exportSvg:safe(exportSvg)
    });
    // Android's analysis drawer projects only fully registered TOP workspaces.
    ctx.ui.topWorkspace.register({
      id:'keithley-4200',activity:'keithley-4200',label:'4200A',icon:'K',
      layout:{
        mode:'native',root:{selector:'#keithley4200Page .dkds-plugin-workspace'},
        primary:{id:'main',label:'4200A',role:'analysis-primary',presentationRole:'utility-primary',priority:100,collapsible:false},
        prime:[],sub:[]
      }
    });
    ctx.project.registerSlice('keithley-4200',{
      serialize:()=>({plan:form(planKeys)}),
      restore:value=>{
        if(!value||typeof value!=='object')return;
        for(const key of planKeys)if(value.plan&&Object.prototype.hasOwnProperty.call(value.plan,key))ui.set(key,value.plan[key]);
      },
      reset:()=>{}
    });
    ctx.capabilities.register('instrument.keithley-4200',{
      kind:'instrument.connection',title:'Keithley 4200A KXCI',remote:false,
      methods:{
        status:()=>({connected:!!session,sessionEndpoint:withoutSecret(sessionTarget),identified:identified?{...identified}:null,endpoint:withoutSecret(endpoint()),configurationChanged:!!sessionTarget&&routeKey(sessionTarget)!==routeKey(endpoint()),runningSimulation:!!run}),
        connect,identify:connectAndIdentify,disconnect,
        validatePlan:()=>plan(),
        simulate:()=>simulate(),
        stopSimulation:()=>stop(),
        datasetSummary:()=>dataset?{source:dataset.source,count:dataset.rows.length,complete:dataset.complete,stopped:dataset.stopped}:null
      }
    });
    return {deactivate(){stop();const old=session?.sessionId;session=null;sessionTarget=null;identified=null;ui?.dispose?.();if(old)void tcp.close({sessionId:old}).catch(()=>{});}};
  });
})();