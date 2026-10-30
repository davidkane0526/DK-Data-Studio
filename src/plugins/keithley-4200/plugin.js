(() => {
  const manifest={
    id:'com.dkds.keithley-4200',name:'Keithley 4200A KXCI',version:'0.1.0',apiVersion:'1.19.0',entry:'plugin.js',enabled:true,order:82,
    description:'Phase 1 read-only Keithley 4200A-SCS KXCI connection and identity verification over the generic TCP Host service.',
    pluginType:'developer',
    requiresCore:['runtime','status','services','capabilities','workspace','ui.activities','ui.pages','ui.unit-templates'],
    capabilities:['instrument.keithley-4200','network.tcp-client','ui.page'],
    platformPresentation:{desktop:{mode:'shared'},mobile:{mode:'adaptive'}}
  };

  DKDSPlugins.define(manifest, async ctx => {
    const units=ctx.ui.unitTemplates;
    const tcp=ctx.services.require('tcp');
    const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8');
    let session=null,identified=null,workbench=null;
    let commandTail=Promise.resolve();
    let hostField,portField,interfaceField,serialField,stateNote,responseNote;

    const encodeBase64=text=>{
      const bytes=encoder.encode(text);
      let binary='';
      for(const value of bytes)binary+=String.fromCharCode(value);
      return btoa(binary);
    };
    const decodeBase64=value=>{
      const binary=atob(String(value||''));
      const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      return decoder.decode(bytes);
    };
    const enqueue=fn=>{
      const run=commandTail.then(fn,fn);
      commandTail=run.catch(()=>{});
      return run;
    };
    const endpoint=()=>({
      host:String(hostField.control.value||'').trim(),
      port:Number(portField.control.value)||1225,
      interfaceName:String(interfaceField.control.value||'').trim(),
      expectedSerial:String(serialField.control.value||'').trim()
    });
    const renderState=(headline,detail='')=>{
      stateNote.textContent=headline;
      responseNote.textContent=detail||'—';
    };
    const closeSession=async()=>{
      const id=session?.sessionId;
      session=null;identified=null;
      if(id){try{await tcp.close({sessionId:id});}catch{}}
      renderState('未连接','—');
      ctx.status.set('Keithley 4200A：连接已关闭。');
      return true;
    };
    const openSession=async()=>{
      if(session)return session;
      const target=endpoint();
      if(!target.host)throw new Error('请输入仪器 IP。');
      renderState('正在连接…',target.host+':'+target.port);
      try{
        session=await tcp.open({host:target.host,port:target.port,connectTimeoutMs:5000,interfaceName:target.interfaceName});
        renderState('TCP 已连接，尚未识别仪器',target.host+':'+target.port+(target.interfaceName?' · interface='+target.interfaceName:''));
        ctx.status.set('Keithley 4200A：TCP 已连接，等待只读身份识别。');
        return session;
      }catch(error){
        session=null;identified=null;
        renderState('连接失败',String(error?.message||error));
        ctx.status.set('Keithley 4200A 连接失败：'+String(error?.message||error));
        throw error;
      }
    };
    const connect=()=>enqueue(openSession);
    const identify=()=>enqueue(async()=>{
      const target=endpoint();
      await openSession();
      renderState('正在执行只读身份查询…','KXCI: *IDN? + NUL');
      try{
        const result=await tcp.exchange({
          sessionId:session.sessionId,
          base64:encodeBase64('*IDN?\0'),
          readTimeoutMs:5000,
          idleTimeoutMs:120,
          maxBytes:8192
        });
        const raw=decodeBase64(result?.base64||'').replace(/\0+$/g,'').trim();
        const fields=raw.split(',').map(value=>value.trim());
        if(fields[0]!=='KEITHLEY INSTRUMENTS'||fields[1]!=='KI4200A')throw new Error('Unexpected instrument identity: '+(raw||'(empty response)'));
        if(target.expectedSerial&&fields[2]!==target.expectedSerial)throw new Error('Serial mismatch: expected '+target.expectedSerial+', received '+(fields[2]||'(missing)'));
        identified={manufacturer:fields[0],model:fields[1],serial:fields[2]||'',version:fields[3]||'',raw};
        renderState('仪器身份验证成功',raw);
        ctx.status.set('Keithley 4200A 已识别：'+(fields[2]||'serial unknown'));
        return identified;
      }catch(error){
        const failedSession=session?.sessionId;
        session=null;identified=null;
        if(failedSession){try{await tcp.close({sessionId:failedSession});}catch{}}
        renderState('身份查询失败，会话已关闭',String(error?.message||error));
        ctx.status.set('Keithley 4200A 身份查询失败：'+String(error?.message||error));
        throw error;
      }
    });

    ctx.ui.activities.add({
      id:'keithley-4200',label:'4200A',contextLabel:'Keithley 4200A KXCI',icon:'K',order:82,primary:true,
      description:'只读连接与设备身份验证；Phase 1 不提供 SMU 输出控制。',
      onActivate:()=>ctx.workspace.openPage('keithley4200Page')
    });
    const page=ctx.ui.pages.add({id:'keithley-4200-page',pageId:'keithley4200Page',activity:'keithley-4200',label:'4200A',title:'Keithley 4200A KXCI',toolbar:false,html:''});
    units.pageHeader.create(page,{variant:'page-owned',activity:'keithley-4200',title:'Keithley 4200A KXCI',subtitle:'Phase 1 · TCP / *IDN? 只读验证'});
    const body=units.page.create(page,{variant:'tool'}).element;
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'keithley-4200',primaryScroll:'safe'});
    const main=units.layout.create(null,{variant:'stack-comfortable'});
    units.note.create(main,{variant:'normal',text:'安全边界：本阶段只允许 Connect / Identify / Disconnect。不会设置电压、电流、扫描或脉冲，也不会自动重发写入命令。'});
    const connectionPanel=units.panel.create(main,{variant:'headed',title:'KXCI 连接',sizing:'content'});
    units.layout.apply(connectionPanel.body,{variant:'form-grid-2'});
    hostField=units.field.create(connectionPanel.body,{label:'仪器 IP',inputType:'text',value:'169.254.111.118'});
    portField=units.field.create(connectionPanel.body,{label:'TCP 端口',inputType:'number',value:1225});
    interfaceField=units.field.create(connectionPanel.body,{label:'Android 网络接口',inputType:'text',value:'eth0'});
    serialField=units.field.create(connectionPanel.body,{label:'预期序列号',inputType:'text',value:'1498377'});
    units.toolbar.create(connectionPanel.body,{variant:'ordinary',actions:[
      {id:'connect',label:'Connect',onInvoke:()=>connect()},
      {id:'identify',label:'Identify',variant:'primary',onInvoke:()=>identify()},
      {id:'disconnect',label:'Disconnect',onInvoke:()=>enqueue(closeSession)}
    ]});
    const statePanel=units.panel.create(main,{variant:'headed',title:'设备状态',sizing:'content'});
    stateNote=units.note.create(statePanel.body,{variant:'normal',text:'未连接'});
    responseNote=units.note.create(statePanel.body,{variant:'meta',text:'—'});
    workbench.compose({primary:{id:'main',label:'4200A',presentationRole:'utility-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},primes:[],subs:[]});

    ctx.capabilities.register('instrument.keithley-4200',{
      kind:'instrument.connection',title:'Keithley 4200A KXCI',remote:false,
      methods:{
        status:()=>({connected:!!session,identified:identified?{...identified}:null,endpoint:endpoint()}),
        connect,
        identify,
        disconnect:()=>enqueue(closeSession)
      }
    });

    return {deactivate(){const id=session?.sessionId;session=null;identified=null;workbench?.dispose?.();if(id)void tcp.close({sessionId:id}).catch(()=>{});}};
  });
})();
