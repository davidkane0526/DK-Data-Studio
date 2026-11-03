(() => {
  'use strict';
  function mount(ctx,page,actions={}){
    const units=ctx.ui.unitTemplates,dom=ctx.ui.dom;
    const controls=new Map(),fieldElements=new Map(),buttons=new Map();
    let currentCurves=[],plotRevision=0,table=null,plot=null,workbench=null;
    const field=(host,id,label,value,opts={})=>{
      const kind=opts.kind||'input';
      const item=units.field.create(host,{
        variant:opts.variant||(kind==='select'?'select':'input'),
        kind,label,value,inputType:opts.inputType||'number',
        options:opts.options||[],min:opts.min,max:opts.max,step:opts.step||'any',
        placeholder:opts.placeholder||'',className:'dkds-4200-field '+(opts.className||''),onChange:()=>actions.onEdit?.(id)
      });
      controls.set(id,item.control);
      fieldElements.set(id,item.element);
      return item;
    };
    const action=(host,id,label,primary=false,className='')=>{
      const item=units.action.create(host,{id,label,variant:primary?'primary':undefined,className,direct:true,onInvoke:()=>actions[id]?.()});
      buttons.set(id,item.button||item.element);
      return item.button||item.element;
    };
    const textNode=(host,tag,className,text)=>{
      const node=dom.create(tag);
      node.className=className;
      node.textContent=String(text||'');
      host.appendChild(node);
      return node;
    };
    const show=(id,visible)=>{const node=fieldElements.get(id);if(node)node.hidden=!visible;};
    const body=units.page.create(page,{variant:'tool',className:'dkds-4200-page'}).element;
    units.pageHeader.create(body,{variant:'page-owned',activity:'keithley-4200',title:'Keithley 4200A',subtitle:'仪器连接与测试工作台'});
    const workspaceHost=units.layout.create(body,{variant:'identity',className:'dkds-4200-workspace-host'});
    workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'keithley-4200',primaryScroll:'safe'});
    const main=units.layout.create(null,{variant:'stack-comfortable',className:'dkds-4200-workbench'});
    const topCards=units.layout.create(main,{variant:'two-card-grid',className:'dkds-4200-top-cards'});

    const device=units.panel.create(topCards,{tagName:'section',variant:'plain',header:false,className:'dkds-4200-card dkds-4200-device-card'});
    device.element.classList.add('dkds-surface-elevated');
    const deviceHead=units.layout.create(device.element,{variant:'row-between',className:'dkds-4200-device-head'});
    const deviceIdentity=units.layout.create(deviceHead,{variant:'stack-compact',className:'dkds-4200-device-identity'});
    textNode(deviceIdentity,'div','dkds-4200-eyebrow','仪器连接');
    textNode(deviceIdentity,'div','dkds-4200-device-title','Keithley 4200A-SCS');
    textNode(deviceIdentity,'div','dkds-4200-device-subtitle','自动连接并校验仪器身份');
    action(deviceHead,'toggleConnection','正在准备连接…',true,'dkds-4200-connect-button');
    const stateNote=units.note.create(device.element,{variant:'meta',className:'dkds-4200-status',text:'准备连接'});
    const routeNote=units.note.create(device.element,{variant:'meta',className:'dkds-4200-route-detail',text:'169.254.111.118:1225'});
    const diagnosticDetails=dom.create('details');diagnosticDetails.className='dkds-4200-diagnostics';diagnosticDetails.hidden=true;
    const diagnosticSummary=dom.create('summary');diagnosticSummary.textContent='查看连接诊断';diagnosticDetails.appendChild(diagnosticSummary);
    const diagnosticLog=textNode(diagnosticDetails,'pre','dkds-4200-diagnostic-log','');
    device.element.appendChild(diagnosticDetails);
    const desktopHost=actions.desktopHost===true;

    const connectionDetails=dom.create('details');
    connectionDetails.className='dkds-4200-advanced';
    const connectionSummary=dom.create('summary');
    connectionSummary.textContent='高级连接设置（本次会话有效，不保存）';
    connectionDetails.appendChild(connectionSummary);
    const cgrid=units.layout.create(connectionDetails,{variant:'form-grid-2',className:'dkds-4200-advanced-grid'});
    field(cgrid,'host','仪器 IP / 主机名','169.254.111.118',{inputType:'text'});
    field(cgrid,'port','KXCI TCP 端口',1225,{step:1});
    field(cgrid,'expectedSerial','序列号校验（留空则不校验）','1498377',{inputType:'text'});
    if(desktopHost){
      field(cgrid,'networkMode','连接路径','auto',{kind:'select',options:[
        {value:'auto',label:'自动尝试直连网卡（推荐）'},
        {value:'via-mobile',label:'通过安卓平板中继'}
      ]});
      field(cgrid,'mobileHost','平板 Wi-Fi IPv4 地址','',{inputType:'text'});
      field(cgrid,'mobilePort','平板网页服务端口',45910,{step:1});
      field(cgrid,'mobilePairKey','平板当前 4 位配对 Key','',{inputType:'password'});
      field(cgrid,'mobileNetworkMode','平板到仪器的路径','auto',{kind:'select',options:[
        {value:'auto',label:'自动尝试'},{value:'ethernet',label:'平板 USB Ethernet'},{value:'wifi',label:'平板 Wi-Fi'}
      ]});
    }
    device.element.appendChild(connectionDetails);

    const design=units.panel.create(topCards,{tagName:'section',variant:'plain',header:false,className:'dkds-4200-card dkds-4200-design-card'});
    design.element.classList.add('dkds-surface-elevated');
    const designHeading=units.layout.create(design.element,{variant:'stack-compact',className:'dkds-4200-card-heading'});
    textNode(designHeading,'h3','dkds-surface-title','测试设置');
    textNode(designHeading,'p','dkds-meta','目前仅支持参数仿真，不会驱动 SMU');
    const dgrid=units.layout.create(design.element,{variant:'form-grid-2',className:'dkds-4200-parameter-grid'});
    field(dgrid,'mode','测试模式','iv',{kind:'select',options:[
      {value:'iv',label:'I–V 曲线'},{value:'transfer',label:'转移特性'},{value:'output',label:'输出特性'},{value:'timed',label:'时间响应'}
    ]});
    field(dgrid,'startV','扫描起点 / 固定偏置 (V)',-1);
    field(dgrid,'stopV','扫描终点 (V)',1);
    field(dgrid,'points','采样点数',101,{step:1,min:2,max:5001});
    field(dgrid,'loops','循环次数',3,{step:1,min:1,max:1000});
    field(dgrid,'complianceA','电流限值 (A)',0.0001,{min:0.000000000001,max:1});
    const planAdvanced=dom.create('details');
    planAdvanced.className='dkds-4200-advanced dkds-4200-plan-advanced';
    const planSummary=dom.create('summary');planSummary.textContent='高级测试参数（端口与速度）';planAdvanced.appendChild(planSummary);
    const pgrid=units.layout.create(planAdvanced,{variant:'form-grid-2',className:'dkds-4200-advanced-grid'});
    field(pgrid,'direction','扫描方向','roundtrip',{kind:'select',options:[
      {value:'forward',label:'正向'},{value:'reverse',label:'反向'},{value:'roundtrip',label:'正反往返'}
    ]});
    field(pgrid,'delayMs','采样间隔 (ms)',20,{step:1,min:0,max:60000});
    field(pgrid,'speed','速度预设','normal',{kind:'select',options:[
      {value:'fast',label:'快速'},{value:'normal',label:'标准'},{value:'quiet',label:'低噪声'}
    ]});
    field(pgrid,'sourceSmU','源 SMU',1,{step:1,min:1,max:9});
    field(pgrid,'measureSmU','测量 SMU',2,{step:1,min:1,max:9});
    field(pgrid,'gateSmU','Gate SMU（0 = 不使用）',3,{step:1,min:0,max:9});
    field(pgrid,'gateBiasV','Gate 偏置 (V)',0);
    design.element.appendChild(planAdvanced);
    const designActions=units.layout.create(design.element,{variant:'row-wrap',className:'dkds-4200-run-actions'});
    action(designActions,'simulate','运行仿真',true,'dkds-4200-run-button');
    action(designActions,'stop','停止',false,'dkds-4200-stop-button');
    const previewNote=units.note.create(design.element,{variant:'meta',className:'dkds-4200-plan-summary',text:'方案参数变更后自动校验。'});

    const chart=units.panel.create(main,{tagName:'section',variant:'plain',header:false,className:'dkds-4200-card dkds-4200-chart-card'});
    chart.element.classList.add('dkds-surface-elevated');
    const chartHeading=units.layout.create(chart.element,{variant:'stack-compact',className:'dkds-4200-card-heading'});
    textNode(chartHeading,'h3','dkds-surface-title','曲线预览');
    textNode(chartHeading,'p','dkds-meta','SIMULATION · 仅本地仿真，非仪器原始数据');
    const progressNote=units.note.create(chart.element,{variant:'meta',className:'dkds-4200-progress',text:'运行仿真后显示曲线'});
    const plotHost=units.layout.create(chart.element,{variant:'identity',className:'dkds-4200-plot-host',geometry:{width:'100%',minHeight:'260px'}});
    plotHost.hidden=true;
    plot=units.scientificPlot.create(plotHost,{variant:'curve',source:'keithley-4200:simulation',minHeight:260,xTitle:'Source voltage (V) / Time index',yTitle:'Current (A)',legend:{enabled:true,placement:'auto',interaction:'isolate',maxRows:2},getCurves:()=>currentCurves,getMarkers:()=>[]});
    const tableDetails=dom.create('details');tableDetails.className='dkds-4200-data-details';tableDetails.hidden=true;
    const tableSummary=dom.create('summary');tableSummary.textContent='查看模拟数据点（0 点）';tableDetails.appendChild(tableSummary);
    const tableHost=units.layout.create(tableDetails,{variant:'identity',className:'dkds-4200-table-host',geometry:{minHeight:'120px'}});
    const columns=[{key:'cycle',label:'Cycle'},{key:'point',label:'Point'},{key:'elapsed_s',label:'Time (s)'},{key:'set_v',label:'Set (V)'},{key:'read_v',label:'Read (V)'},{key:'read_a',label:'Current (A)'},{key:'status',label:'Status'}];
    table=units.table.mount('keithley-4200-sim-data',tableHost,{variant:'standard',appearance:{density:'compact',stripe:'subtle'},columns,rows:[]});
    chart.element.appendChild(tableDetails);
    units.note.create(chart.element,{variant:'meta',className:'dkds-4200-native-note',text:'仪器原生数据文件与原生图获取尚未接通。此处曲线和数据表均为 DK Data Studio 仿真产物，不能作为 4200A 原始数据。'});

    workbench.compose({primary:{id:'main',label:'4200A',presentationRole:'utility-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},primes:[],subs:[]});
    const get=id=>controls.get(id)?.value;
    const set=(id,value)=>{const node=controls.get(id);if(node)node.value=String(value??'');if(id==='mode')updateModeVisibility(String(value||'iv'));};
    const setConnectionState=(state,headline,detail,diagnostic='')=>{
      if(stateNote)stateNote.textContent=String(headline||'未连接');
      if(routeNote)routeNote.textContent=String(detail||'—');
      device.element.dataset.connectionState=state;
      diagnosticDetails.hidden=!diagnostic;
      diagnosticLog.textContent=String(diagnostic||'').slice(0,6000);
      diagnosticDetails.open=false;
      const button=buttons.get('toggleConnection');
      if(button){
        button.textContent=state==='connected'?'断开':state==='connecting'?'正在连接…':'连接';
        button.disabled=state==='connecting';
        button.dataset.connectionState=state;
      }
    };
    const renderPreview=value=>{previewNote.textContent=String(value||'');};
    const renderProgress=value=>{progressNote.textContent=String(value||'');};
    const renderData=(curves,rows)=>{
      currentCurves=curves||[];
      const hasData=Array.isArray(rows)&&rows.length>0;
      plotHost.hidden=!hasData;
      tableDetails.hidden=!hasData;
      table.setData?.(columns,rows||[]);
      tableSummary.textContent='查看模拟数据点（'+(rows?.length||0)+' 点）';
      plot.requestRender?.('keithley-4200:sim:'+ ++plotRevision);
    };
    const setRunning=running=>{
      const start=buttons.get('simulate'),stop=buttons.get('stop');
      if(start)start.disabled=!!running;
      if(stop)stop.disabled=!running;
    };
    const updateModeVisibility=mode=>{
      const timed=mode==='timed';
      show('direction',!timed);
      show('stopV',!timed);
      const startLabel=fieldElements.get('startV')?.querySelector?.('label');
      if(startLabel)startLabel.textContent=timed?'固定偏置 (V)':'扫描起点 (V)';
      const gate=mode==='transfer'||mode==='output';
      show('gateBiasV',gate);
      show('gateSmU',gate);
    };
    setConnectionState('idle','等待打开工作台','连接参数仅在本次会话有效；每次进入页面自动重新探测。');
    setRunning(false);
    updateModeVisibility('iv');
    const initialMode=controls.get('mode');
    if(initialMode){initialMode.addEventListener('change',()=>updateModeVisibility(String(initialMode.value||'iv')));}
    const updateConnectionPathVisibility=mode=>{
      const relay=mode==='via-mobile';
      for(const id of ['mobileHost','mobilePort','mobilePairKey','mobileNetworkMode'])show(id,relay);
    };
    const connectionMode=controls.get('networkMode');
    if(connectionMode)connectionMode.addEventListener('change',()=>updateConnectionPathVisibility(String(connectionMode.value||'auto')));
    updateConnectionPathVisibility(String(connectionMode?.value||'auto'));
    return Object.freeze({
      get,set,setConnectionState,renderPreview,renderProgress,renderData,setRunning,
      dispose(){table?.dispose?.();plot?.dispose?.();workbench?.dispose?.();}
    });
  }
  window.DKDSPluginModules.define('com.dkds.keithley-4200','unit-presentation',Object.freeze({mount}));
})();