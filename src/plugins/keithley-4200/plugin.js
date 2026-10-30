(() => {
  'use strict';
  const manifest={
    id:'com.dkds.keithley-4200',name:'Keithley 4200A KXCI',version:'0.2.0',apiVersion:'1.19.0',entry:'plugin.js',
    scripts:['measurement-model.js','unit-presentation.js','plugin.js'],enabled:true,order:82,
    description:"Configurable KXCI connection, simulation-only GUI plan editor, live scientific plots and CSV/JSON/SVG export.",
    pluginType:'developer',workspace:{role:'top',activity:'keithley-4200',icon:'K',title:'Keithley 4200A'},window:{activity:'keithley-4200',title:'Keithley 4200A KXCI',width:1280,height:850,minWidth:880,minHeight:620,dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project'},
    requiresCore:['runtime','status','services','modules','project','io','workspace','capabilities','ui.dom','ui.activities','ui.top-workspace','ui.pages','ui.unit-templates','ui.scientific-plot','ui.table'],
    capabilities:['instrument.keithley-4200','network.tcp-client','ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','ui.table'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}
  };
  DKDSPlugins.define(manifest,async ctx=>{
    const tcp=ctx.services.require('tcp');
    const Model=ctx.modules.require('measurement-model');
    const Presentation=ctx.modules.require('unit-presentation');
    const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8');
    let session=null,sessionTarget=null,identified=null,ui=null;
    let profiles=[],dataset=null,run=null,plotByCycle=new Map(),commandTail=Promise.resolve();
    const connectionKeys=['host','port','networkMode','interfaceName','connectTimeoutMs','readTimeoutMs','expectedSerial','mobileHost','mobilePort','mobileNetworkMode'];
    const planKeys=['mode','direction','loops','points','startV','stopV','complianceA','delayMs','speed','sourceSmU','measureSmU','gateSmU','gateBiasV'];
    const enqueue=fn=>{const task=commandTail.then(fn,fn);commandTail=task.catch(()=>{});return task;};
    const message=error=>String(error?.message||error||'未知错误');
    const status=(text,detail='')=>{ui?.renderStatus(text,detail);ctx.status.set('Keithley 4200A：'+text);};
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
    const endpoint=()=>({
      host:String(ui.get('host')||'').trim(),port:Number(ui.get('port')),
      networkMode:String(ui.get('networkMode')||'auto'),
      interfaceName:String(ui.get('interfaceName')||'').trim(),
      connectTimeoutMs:Number(ui.get('connectTimeoutMs')),readTimeoutMs:Number(ui.get('readTimeoutMs')),
      expectedSerial:String(ui.get('expectedSerial')||'').trim(),
      mobileHost:String(ui.get('mobileHost')||'').trim(),
      mobilePort:Number(ui.get('mobilePort')||45910),
      mobileNetworkMode:String(ui.get('mobileNetworkMode')||'ethernet'),
      mobilePairKey:String(ui.get('mobilePairKey')||'').trim()
    });
    const validateEndpoint=value=>{
      if(!value.host||value.host.length>253||/[\s\/\\]/.test(value.host))throw Error('请输入有效 IP 或主机名');
      if(!Number.isInteger(value.port)||value.port<1||value.port>65535)throw Error('端口必须为 1–65535');
      if(!['auto','wifi','ethernet','interface','via-mobile'].includes(value.networkMode))throw Error('无效网络选择');
      if(value.networkMode==='interface'&&!/^[a-zA-Z0-9_.:-]{1,32}$/.test(value.interfaceName))throw Error('指定接口名称无效');
      for(const key of ['connectTimeoutMs','readTimeoutMs'])if(!Number.isInteger(value[key])||value[key]<250||value[key]>120000)throw Error(key+' 应为 250–120000 ms');
      if(value.networkMode==='via-mobile'){
        if(window.electronAPI?.isWebClient!==undefined)throw Error('通过移动端模式仅支持 Windows 桌面程序');
        if(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value.mobileHost))throw Error('请输入平板 Wi-Fi IPv4 地址');
        if(!Number.isInteger(value.mobilePort)||value.mobilePort<1024||value.mobilePort>65535)throw Error('平板服务端口无效');
        if(!/^\d{4}$/.test(value.mobilePairKey))throw Error('请输入平板当前显示的 4 位配对 Key');
        if(!['auto','wifi','ethernet','interface'].includes(value.mobileNetworkMode))throw Error('平板网络模式无效');
        if(value.connectTimeoutMs>10000||value.readTimeoutMs>10000)throw Error('通过平板的连接与读取超时不得超过 10000 ms');
      }
      return value;
    };
    const routeKey=t=>JSON.stringify([t.host,t.port,t.networkMode,t.networkMode==='interface'?t.interfaceName:'',t.networkMode==='via-mobile'?[t.mobileHost,t.mobilePort,t.mobileNetworkMode,t.mobilePairKey]:null]);
    const withoutSecret=t=>{if(!t)return null;const {mobilePairKey,...rest}=t;return rest;};
    const currentRoute=()=>sessionTarget?routeKey(sessionTarget):null;
    async function closeSession(){
      const old=session?.sessionId;session=null;sessionTarget=null;identified=null;
      if(old)try{await tcp.close({sessionId:old});}catch{}
      status('未连接','—');return true;
    }
    async function openSession(){
      const target=validateEndpoint(endpoint());
      if(session&&currentRoute()===routeKey(target))return session;
      if(session)await closeSession();
      status('正在连接 TCP',target.host+':'+target.port+' · '+(target.networkMode==='via-mobile'?'经安卓平板 '+target.mobileHost:target.networkMode));
      try{
        const opened=await tcp.open({
          host:target.host,port:target.port,networkMode:target.networkMode,
          interfaceName:(target.networkMode==='interface'||target.networkMode==='via-mobile'&&target.mobileNetworkMode==='interface')?target.interfaceName:'',
          connectTimeoutMs:target.connectTimeoutMs,
          ...(target.networkMode==='via-mobile'?{
            mobileHost:target.mobileHost,mobilePort:target.mobilePort,mobilePairKey:target.mobilePairKey,
            mobileNetworkMode:target.mobileNetworkMode
          }:{})
        });
        session=opened;sessionTarget=target;identified=null;
        status('TCP 已连接，等待身份校验',(opened.remoteAddress||target.host)+':'+target.port+' · '+target.networkMode);
        return opened;
      }catch(error){session=null;sessionTarget=null;identified=null;status('连接失败',message(error));throw error;}
    }
    const connect=()=>enqueue(async()=>{if(session)await closeSession();return openSession();});
    const disconnect=()=>enqueue(closeSession);
    const identify=()=>enqueue(async()=>{
      const target=validateEndpoint(endpoint());
      await openSession();
      status('正在识别仪器','KXCI: *IDN? + NUL');
      try{
        const answer=await tcp.exchange({sessionId:session.sessionId,base64:encodeBase64('*IDN?\0'),readTimeoutMs:target.readTimeoutMs,idleTimeoutMs:120,maxBytes:8192});
        const raw=decodeBase64(answer?.base64||'').replace(/\0+$/g,'').trim();
        const parts=raw.split(',').map(s=>s.trim());
        if(parts[0]!=='KEITHLEY INSTRUMENTS'||parts[1]!=='KI4200A')throw Error('仪器身份不匹配：'+(raw||'空响应'));
        if(target.expectedSerial&&parts[2]!==target.expectedSerial)throw Error('序列号不匹配：预期 '+target.expectedSerial+'，实际 '+(parts[2]||'未知'));
        identified={manufacturer:parts[0],model:parts[1],serial:parts[2]||'',version:parts[3]||'',raw};
        status('仪器身份校验成功',raw);return identified;
      }catch(error){
        const old=session?.sessionId;session=null;sessionTarget=null;identified=null;
        if(old)try{await tcp.close({sessionId:old});}catch{}
        status('身份校验失败，连接已关闭',message(error));throw error;
      }
    });
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
      if(run.timer)clearTimeout(run.timer);
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
        }else token.timer=setTimeout(step,tickMs);
      };
      token.timer=setTimeout(step,0);
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
      const lines=curves.map((c,i)=>'<polyline fill="none" stroke="'+colors[i%colors.length]+'" stroke-width="2" points="'+c.points.map(p=>x(p.x).toFixed(2)+','+y(p.y).toFixed(2)).join(' ')+'"/>').join('');
      const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const xt=dataset.plan.mode==='timed'?'Time (s)':'Source voltage (V)';
      return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'"><rect width="100%" height="100%" fill="white"/><text x="50" y="30" font-size="20">Keithley 4200A — SIMULATION ONLY</text><line x1="'+left+'" y1="'+top+'" x2="'+left+'" y2="'+(height-bottom)+'" stroke="#333"/><line x1="'+left+'" y1="'+(height-bottom)+'" x2="'+(width-right)+'" y2="'+(height-bottom)+'" stroke="#333"/><text x="'+(width/2-60)+'" y="'+(height-25)+'" font-size="18">'+esc(xt)+'</text><text x="12" y="'+(height/2)+'" font-size="18">Current (A)</text><text x="'+left+'" y="'+(height-45)+'" font-size="14">'+minX.toPrecision(4)+'</text><text x="'+(width-right-75)+'" y="'+(height-45)+'" font-size="14">'+maxX.toPrecision(4)+'</text><text x="15" y="'+top+'" font-size="14">'+maxY.toExponential(3)+'</text><text x="15" y="'+(height-bottom)+'" font-size="14">'+minY.toExponential(3)+'</text>'+lines+'</svg>';
    }
    const exportSvg=()=>saveFile('4200-simulation-curve.svg',svgImage(),'svg');
    function refreshProfiles(){
      ui.setOptions('profiles',[{value:'',label:'— 选择配置 —'},...profiles.map(p=>({value:p.name,label:p.name+' · '+p.endpoint.host+':'+p.endpoint.port}))],'');
    }
    function saveProfile(){
      const target=validateEndpoint(endpoint()),name=String(ui.get('profileName')||'').trim();
      if(!name||name.length>60)throw Error('配置名称需为 1–60 个字符');
      profiles=profiles.filter(p=>p.name!==name);
      if(profiles.length>=20)profiles.shift();
      profiles.push({name,endpoint:withoutSecret(target)});
      refreshProfiles();ctx.project.capture();ctx.status.set('Keithley 4200A：连接配置已保存到当前工程。');
      return true;
    }
    function loadProfile(){
      const name=String(ui.get('profiles')||'');
      const selected=profiles.find(p=>p.name===name);
      if(!selected)throw Error('请选择已有配置');
      for(const key of connectionKeys)if(selected.endpoint[key]!==undefined)ui.set(key,selected.endpoint[key]);
      ui.set('mobilePairKey','');
      ui.set('profileName',selected.name);
      ctx.status.set('Keithley 4200A：已加载配置，需重新连接并识别设备。');
      return true;
    }
    function onEdit(id){
      if(connectionKeys.includes(id)){
        identified=null;
        if(session)ui.renderStatus('连接配置已更改；请重新连接 / 识别',sessionTarget?.host||'');
      }
      if(planKeys.includes(id))ui.renderPreview('方案已更改，请重新预览。');
      ctx.project.capture();
    }
    function safe(fn){return (...args)=>{try{return Promise.resolve(fn(...args)).catch(e=>{ctx.status.set('Keithley 4200A：'+message(e));ui.renderProgress('操作失败：'+message(e));return false;});}catch(e){ctx.status.set('Keithley 4200A：'+message(e));ui.renderProgress('操作失败：'+message(e));return false;}};}
    ctx.ui.activities.add({id:'keithley-4200',label:'4200A',contextLabel:'Keithley 4200A',icon:'K',order:82,primary:true,openMode:'window',description:'KXCI 连接 + 安全仿真测试工作台',onActivate:()=>ctx.workspace.openPage('keithley4200Page')});
    const page=ctx.ui.pages.add({id:'keithley-4200-page',pageId:'keithley4200Page',activity:'keithley-4200',label:'4200A',title:'Keithley 4200A KXCI',toolbar:false,html:''});
    ui=Presentation.mount(ctx,page,{
      onEdit,
      connect:safe(connect),identify:safe(identify),disconnect:safe(disconnect),
      saveProfile:safe(saveProfile),loadProfile:safe(loadProfile),
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
      serialize:()=>({profiles:profiles.map(p=>({name:p.name,endpoint:{...p.endpoint}})),connection:form(connectionKeys),plan:form(planKeys)}),
      restore:value=>{
        if(!value||typeof value!=='object')return;
        profiles=Array.isArray(value.profiles)?value.profiles.filter(p=>p&&typeof p.name==='string'&&p.endpoint&&typeof p.endpoint==='object').slice(0,20).map(p=>({...p,endpoint:withoutSecret(p.endpoint)})):[];
        for(const key of connectionKeys)if(value.connection&&Object.prototype.hasOwnProperty.call(value.connection,key))ui.set(key,value.connection[key]);
        for(const key of planKeys)if(value.plan&&Object.prototype.hasOwnProperty.call(value.plan,key))ui.set(key,value.plan[key]);
        refreshProfiles();
      },
      reset:()=>{profiles=[];refreshProfiles();}
    });
    refreshProfiles();
    ctx.capabilities.register('instrument.keithley-4200',{
      kind:'instrument.connection',title:'Keithley 4200A KXCI',remote:false,
      methods:{
        status:()=>({connected:!!session,sessionEndpoint:withoutSecret(sessionTarget),identified:identified?{...identified}:null,endpoint:withoutSecret(endpoint()),configurationChanged:!!sessionTarget&&routeKey(sessionTarget)!==routeKey(endpoint()),runningSimulation:!!run}),
        connect,identify,disconnect,
        validatePlan:()=>plan(),
        simulate:()=>simulate(),
        stopSimulation:()=>stop(),
        datasetSummary:()=>dataset?{source:dataset.source,count:dataset.rows.length,complete:dataset.complete,stopped:dataset.stopped}:null
      }
    });
    return {deactivate(){stop();const old=session?.sessionId;session=null;sessionTarget=null;identified=null;ui?.dispose?.();if(old)void tcp.close({sessionId:old}).catch(()=>{});}};
  });
})();