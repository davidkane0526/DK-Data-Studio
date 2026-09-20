(() => {
  const manifest={"id":"com.example.unit-vth-shadow","name":"Vth Unit Live Shadow Reconstruction","version":"1.1.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":927,"description":"Parallel, non-production Transfer Vth Unit reconstruction bound through the dependency-gated production live-domain owner for side-by-side parity.","requiresCore":["status","services","workspace","data.artifacts","data.sources","ui.dom","ui.workspace","ui.scientific-plot","ui.table","ui.pages","ui.top-workspace","ui.unit-templates"],"capabilities":["ui.page","ui.plugin-workspace","ui.scientific-plot","ui.table"],"pluginDependencies":[{"id":"com.dkds.transfer-vth-lab"}],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.transport.iv","science.transport.transfer"]}};

  DKDSPlugins.define(manifest,async ctx=>{
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    let liveDomain=null;try{liveDomain=ctx.services?.domain?.connect?.('com.dkds.transfer-vth-lab/live')||null;}catch{}
    const shadowState={calls:[],selectedCurveId:'',parameters:{method:'linear-window',branch:'auto',targetCurrent:4e-10,lowCurrent:2e-10,highCurrent:2e-9,absoluteCurrent:true,logY:true,showAllCurves:true},liveParity:{connected:!!liveDomain,revision:0,numericDigest:'',presentationDigest:''}};
    const record=(intent,payload={})=>{shadowState.calls.push({intent,payload});ctx.status.set(`Vth Unit shadow：${intent} ${liveDomain?'已通过生产 domain owner 执行':'等待生产 domain owner'}；生产 Vth 未被替换。`);};
    let syncLiveState=async()=>null;
    const invoke=async(id,payload={})=>{record(id,payload);if(!liveDomain)return null;try{const value=await liveDomain.invoke(id,payload);await syncLiveState();return value;}catch(error){ctx.status.set(`Vth Unit shadow live action 失败：${error.message}`);return null;}};
    const geom=(target,geometry,responsiveGeometry=[])=>units.layout.apply(target,{variant:'identity',geometry,responsiveGeometry});
    const numericInput=value=>{const text=String(value??'').trim();if(!text)return null;const number=Number(text);return Number.isFinite(number)?number:null;};
    const formatInput=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'':String(value);

    const page=ctx.ui.pages.add({id:'unit-vth-shadow',pageId:'unitVthShadowPage',label:'Vth Unit Shadow',order:927,html:''});
    const pageUnit=units.page.create(page,{variant:'analysis'}),body=pageUnit.element;
    units.pageHeader.create(body,{variant:'page-owned',title:'Vth 工作台 · Unit Shadow',subtitle:'恒流邻域 Vth · 双向扫描 · 交互拟合窗口；与生产 Vth 共用唯一状态/Task/数值结果 owner。',actions:[
      {id:'refresh',icon:'↻',label:'刷新数据',onInvoke:()=>invoke('refresh',{announce:true})},
      {id:'fit',icon:'⌂',label:'适应视图',onInvoke:()=>invoke('fitView')},
      {id:'settings',icon:'⚙',label:'默认设置',onInvoke:()=>record('settings',{nativeOwner:'ctx.ui.settings/defaults'})}
    ]});

    const workspaceHost=units.layout.create(body,{variant:'stack'});
    const wb=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'unit-vth-shadow',primaryScroll:'contained',leftWidth:300,leftMin:260,leftReserve:300,layoutStateVersion:'vth-unit-shadow-v2'});

    const controls=units.layout.create(null,{variant:'stack-comfortable',geometry:{gap:'10px',minWidth:'0'}});
    const dataPanel=units.panel.create(controls,{variant:'headed',title:'数据',sizing:'content'});
    units.layout.apply(dataPanel.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}});
    const sourceBadge=units.chip.create(dataPanel.header.actions,{variant:'quiet',text:'等待生产数据'});
    const curve=units.field.create(dataPanel.body,{variant:'select',kind:'select',label:'当前曲线',value:'',options:[],onChange:event=>invoke('setSelectedCurve',{value:event.target.value})});
    units.note.create(dataPanel.body,{variant:'meta',text:'数据导入由 Core 统一提供；这里只显示分配给 Vth 工作台的数据。'});
    units.toolbar.create(dataPanel.body,{variant:'ordinary',actions:[
      {id:'refresh',label:'刷新',onInvoke:()=>invoke('refresh',{announce:true})},
      {id:'demo',label:'示例',onInvoke:()=>invoke('demo')}
    ]});

    const extraction=units.panel.create(controls,{variant:'plain',header:false,sizing:'content'});
    units.layout.apply(extraction.body,{variant:'stack',geometry:{padding:'10px',gap:'8px',minWidth:'0'}});
    units.header.create(extraction.body,{kind:'content',variant:'content',title:'阈值提取',actions:false});
    const method=units.field.create(extraction.body,{variant:'select',kind:'select',label:'方法',value:'linear-window',options:[{value:'linear-window',label:'恒流邻域线性回归'},{value:'interpolation',label:'恒流插值'}],onChange:event=>invoke('setParameter',{key:'method',value:event.target.value})});
    const branch=units.field.create(extraction.body,{variant:'select',kind:'select',label:'扫描段',value:'auto',options:[{value:'auto',label:'自动'},{value:'first',label:'第一扫描段'},{value:'second',label:'第二扫描段'},{value:'all',label:'全部数据'}],onChange:event=>invoke('setParameter',{key:'branch',value:event.target.value})});
    const targetCurrent=units.field.create(extraction.body,{variant:'input',label:'目标电流 / A',inputType:'number',step:'any',value:'4e-10',onChange:event=>invoke('setParameter',{key:'targetCurrent',value:numericInput(event.target.value)})});
    const lowCurrent=units.field.create(extraction.body,{variant:'input',label:'拟合下限 / A',inputType:'number',step:'any',value:'2e-10',onChange:event=>invoke('setParameter',{key:'lowCurrent',value:numericInput(event.target.value)})});
    const highCurrent=units.field.create(extraction.body,{variant:'input',label:'拟合上限 / A',inputType:'number',step:'any',value:'2e-9',onChange:event=>invoke('setParameter',{key:'highCurrent',value:numericInput(event.target.value)})});
    const absoluteCurrent=units.check.create(extraction.body,{variant:'checkbox',label:'使用 |I|',checked:true,onChange:event=>invoke('setParameter',{key:'absoluteCurrent',value:event.target.checked})});
    const logY=units.check.create(extraction.body,{variant:'checkbox',label:'对数显示',checked:true,onChange:event=>invoke('setParameter',{key:'logY',value:event.target.checked})});
    const showAllCurves=units.check.create(extraction.body,{variant:'checkbox',label:'显示全部曲线',checked:true,onChange:event=>invoke('setParameter',{key:'showAllCurves',value:event.target.checked})});
    const fieldControls={method:method.control,branch:branch.control,targetCurrent:targetCurrent.control,lowCurrent:lowCurrent.control,highCurrent:highCurrent.control};
    const checkControls={absoluteCurrent:absoluteCurrent.input,logY:logY.input,showAllCurves:showAllCurves.input};
    shadowState.controls={curve:curve.control,...fieldControls,...checkControls,sourceBadge};

    const dataControl=units.prime.build({id:'data-control',label:'数据',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:90,collapsible:true,fixed:true,header:false,existingNode:controls,autoOpen:true,defaultPlacement:'left',placements:['left'],stateVersion:'vth-unit-shadow-v2'});

    const main=units.layout.create(null,{variant:'fill-rows',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',gap:'10px'}});
    const metricsHost=units.layout.create(main,{variant:'metric-grid'});
    const metricRefs={};for(const [key,label] of [['vth','Vth'],['branch','扫描段'],['r2','R²'],['n','拟合点数']])metricRefs[key]=units.metric.create(metricsHost,{variant:'standard',label,value:'—'});

    const plotPanel=units.panel.detached({variant:'plot-card',header:false,sizing:'fill'});
    units.layout.apply(plotPanel.body,{variant:'plot-card-fill'});
    const plotHeader=units.header.create(plotPanel.body,{kind:'plot',variant:'plot',title:'转移曲线',meta:'未加载数据'});
    units.layout.apply(plotHeader.element,{variant:'plot-card-header'});
    const plotTarget=units.layout.create(plotPanel.body,{variant:'identity',geometry:{width:'100%',height:'100%',minWidth:'0',minHeight:'0',overflow:'hidden'}});
    let currentPlot={title:'转移曲线',status:'未加载数据',xTitle:'Gate voltage (V)',yTitle:'|I| (A)',yScaleType:'log',curves:[],manipulators:[],view:{}},plotSurface=null,lastScaleKey='';
    const curveIdOf=payload=>payload?.curve?.source?.curveId||payload?.curve?.entityId||String(payload?.curve?.id||'').replace(/^data:/,'');
    function createPlotSurface(){plotSurface?.dispose?.();lastScaleKey=`${currentPlot.yScaleType}|${currentPlot.yTitle}`;plotSurface=units.scientificPlot.create(plotTarget,{variant:'curve',source:'unit-vth-shadow:transfer',xTitle:currentPlot.xTitle,yTitle:currentPlot.yTitle,yScaleType:currentPlot.yScaleType,navigationTools:true,getCurves:()=>currentPlot.curves||[],getMarkers:()=>[],getManipulators:()=>currentPlot.manipulators||[],getView:()=>currentPlot.view||{},setView:view=>invoke('setView',{value:view}),showMarkers:()=>true,onCurveSelect:payload=>{const id=curveIdOf(payload);if(id)invoke('setSelectedCurve',{value:id});},onManipulationCommit:payload=>{if(payload?.manipulator?.id==='fit-window'){const g=payload.geometry||{};invoke('setManualWindow',{value:[g.start,g.end]});}else if(payload?.manipulator?.id==='target-current'){invoke('setParameter',{key:'targetCurrent',value:payload?.geometry?.value});}},onManipulationReset:payload=>{if(payload?.manipulator?.id==='fit-window')invoke('resetManualWindow');},onRangeSelect:payload=>{const values=[payload?.x0,payload?.x1,payload?.range?.x0,payload?.range?.x1,payload?.range?.[0],payload?.range?.[1]].filter(Number.isFinite).map(Number);if(values.length>=2)invoke('setManualWindow',{value:[values[0],values[1]]});},onReset:()=>invoke('setView',{value:null})});return plotSurface;}
    createPlotSurface();

    const resultsHost=units.layout.create(null,{variant:'scroll-pane',geometry:{minHeight:'140px'}});
    const tableColumns=[{key:'curve',label:'曲线'},{key:'branch',label:'扫描段'},{key:'vth',label:'Vth / V'},{key:'r2',label:'R²'},{key:'n',label:'N'},{key:'status',label:'状态'}];
    const tableSurface=units.table.mount('vth-shadow-results',resultsHost,{variant:'standard',persistKey:'vth-shadow-results',appearance:{density:'compact',stripe:'subtle'},columns:tableColumns,rows:[]});
    const split=units.splitPane.create(main,{id:'vth-shadow-results-height',variant:'resizable',axis:'y',resizeTarget:'second',defaultSize:180,min:140,reserve:300,reflowBelow:920,trackToken:'--dkds-unit-results-height',first:plotPanel.element,second:resultsHost});

    const renderCurveOptions=rows=>{const select=curve.control;if(!select)return;const options=(rows||[]).map(row=>({value:String(row.id),label:String(row.name||row.id)}));if(typeof select.replaceChildren==='function'&&dom.create){const nodes=options.map(row=>dom.create('option',{value:row.value,textContent:row.label}));select.replaceChildren(...nodes);}else if(typeof dom.html==='function'){const esc=value=>String(value).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));dom.html(select,options.map(row=>`<option value="${esc(row.value)}">${esc(row.label)}</option>`).join(''));}select.value=shadowState.selectedCurveId||'';};
    const digestResult=live=>JSON.stringify({selectedCurveId:live?.selectedCurveId||'',parameters:live?.state?.parameters||{},manualWindows:live?.state?.manualWindows||{},results:(live?.curves||[]).map(row=>[row.id,row.result?.ok?row.result.vth:null,row.result?.branch||'',row.result?.n??null])});
    syncLiveState=async()=>{if(!liveDomain)return null;const envelope=liveDomain.snapshot(),live=envelope?.state||{},state=live.state||{},parameters=state.parameters||{},presentation=live.presentation||{},plot=presentation.plot||{};shadowState.liveParity.revision=Number(envelope?.descriptor?.revision)||0;shadowState.selectedCurveId=String(live.selectedCurveId||'');shadowState.parameters={...shadowState.parameters,...parameters};sourceBadge.textContent=live.sourceMode==='project'?`${live.curves?.length||0} 组工程数据`:live.sourceMode==='demo'?'示例数据':'等待导入';renderCurveOptions(live.curves||[]);for(const [key,control] of Object.entries(fieldControls)){if(key==='method'||key==='branch')control.value=String(parameters[key]??shadowState.parameters[key]??'');else control.value=formatInput(parameters[key]);}for(const [key,input] of Object.entries(checkControls))input.checked=!!parameters[key];for(const [key,ref] of Object.entries(metricRefs))ref.value.textContent=String(presentation.metrics?.[key]??'—');plotHeader.title.textContent=String(plot.title||'转移曲线');if(plotHeader.meta)plotHeader.meta.textContent=String(plot.status||'未加载数据');currentPlot={...currentPlot,...plot,curves:Array.isArray(plot.curves)?plot.curves:[],manipulators:Array.isArray(plot.manipulators)?plot.manipulators:[],view:plot.view||{}};const scaleKey=`${currentPlot.yScaleType}|${currentPlot.yTitle}`;if(scaleKey!==lastScaleKey)createPlotSurface();else plotSurface?.requestRender?.('vth-live-domain');tableSurface?.setData?.(tableColumns,Array.isArray(presentation.tableRows)?presentation.tableRows:[]);shadowState.liveParity.numericDigest=digestResult(live);shadowState.liveParity.presentationDigest=JSON.stringify({metrics:presentation.metrics||{},plot:{title:currentPlot.title,status:currentPlot.status,yTitle:currentPlot.yTitle,yScaleType:currentPlot.yScaleType,curves:currentPlot.curves,manipulators:currentPlot.manipulators},tableRows:presentation.tableRows||[]});return envelope;};

    wb.compose({primary:{id:'vth-main',label:'Vth 工作台',presentationRole:'scientific-primary',scroll:'contained',titlePolicy:'host-only',mainNode:main},primes:[dataControl],subs:[]});
    ctx.ui.topWorkspace.register({id:'unit-vth-shadow',activity:'unit-vth-shadow',label:'Vth Unit Shadow',icon:'Vₜ',layout:{mode:'native',root:{selector:'#unitVthShadowPage .dkds-plugin-workspace'},primary:{id:'vth-main',role:'analysis-primary',presentationRole:'scientific-primary',priority:100,collapsible:false},prime:[{id:'data-control',label:'数据',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:90,collapsible:true}],sub:[]}});
    const liveOff=liveDomain?.subscribe?.(()=>{void syncLiveState();},{immediate:true})||(()=>{});if(liveDomain){await invoke('analyzeAll');await syncLiveState();}
    ctx.status.set(liveDomain?'Vth Unit shadow 已连接生产 live-domain；生产 Vth 保持唯一状态/Task/数值 owner。':'Vth Unit shadow 已加载，但当前 production live-domain 尚不可用。');

    return{shadowState,syncLiveState,plotSurface:()=>plotSurface,tableSurface,split,deactivate(){try{liveOff?.();}catch{}try{plotSurface?.dispose?.();}catch{}try{tableSurface?.dispose?.();}catch{}try{split?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}};
  });
})();
