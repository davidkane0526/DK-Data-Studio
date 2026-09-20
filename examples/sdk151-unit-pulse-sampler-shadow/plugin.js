(() => {
  const manifest={"id":"com.example.unit-pulse-sampler-shadow","name":"Pulse Sampler Tool Unit Shadow","version":"1.1.2","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":false,"order":926,"description":"Non-production Unit-only reconstruction of the built-in Pulse Sampler Tool for source-parity auditing.","requiresCore":["runtime","services","status","project","workspace","data.sources","data.artifacts","data.model","ui.dom","ui.workspace","ui.scientific-plot","ui.series","ui.table","ui.pages","ui.unit-templates","ui.activities","ui.top-workspace"],"capabilities":["ui.page","ui.plugin-workspace","ui.scientific-plot","ui.table","ui.top-workspace"],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["data.table","science.transport.iv","science.transport.transfer"]},"pluginDependencies":[{"id":"com.dkds.tools.pulse-sampler"}]};
  DKDSPlugins.define(manifest,async ctx=>{
    const units=ctx.ui.unitTemplates,dom=ctx.ui.dom;
    if(!units)throw new Error('Pulse Sampler Unit shadow requires ui.unit-templates.');
    let live=null,liveOff=null;try{live=ctx.services?.domain?.connect?.('com.dkds.tools.pulse-sampler/live')||null;}catch{}
    const intents=[],controls=new Map(),actionButtons=new Map();
    const shadowState={liveSnapshot:null,liveParity:{connected:!!live,revision:0,activeChannel:'',segmentRows:0,waveRows:0,resultRows:0,sourceId:'',timeKey:'',currentKey:''},plotRenderCount:0};
    let currentWaveCurves=[],currentResult={available:false,x:[],y:[]};
    const record=(id,payload={})=>{intents.push({id,payload});return true;};
    let syncLiveState=async()=>null,shadowLiveSnapshot=null;
    const liveSnapshot=()=>shadowLiveSnapshot;
    const invokeLive=async(id,payload={})=>{record(id,payload);if(!live)return null;const result=await live.invoke(id,payload);await syncLiveState();return result;};
    const fieldControl=(host,{id,label,unit='',kind='input',inputType='number',options=[],value='',placeholder='',min,max,step,wide=false,responsiveTarget=null,onChange})=>{
      const field=units.field.create(host,{label,unit,kind,variant:kind==='select'?'select':'input',inputType,options,value,placeholder,min,max,step,onChange});
      if(wide)units.layout.apply(field.element,{variant:'identity',responsiveTarget:responsiveTarget||host,responsiveGeometry:[{maxWidth:1120,geometry:{gridColumn:'1 / -1'}}]});
      if(id)controls.set(id,field.control);
      return field.control;
    };
    const direct=(host,id,label,variant='',payload=()=>({}))=>{const action=units.action.create(host,{id,label,variant:variant||undefined,direct:true,onInvoke:()=>live?invokeLive(id,payload()):record(id,payload())});actionButtons.set(id,action.button);return action.button;};
    const setSelectOptions=(control,rows,value='')=>{if(!control)return;control.replaceChildren?.();for(const row of rows||[]){const option=dom.create('option');option.value=String(row.value??row.id??'');option.textContent=String(row.label??row.value??row.id??'');control.appendChild(option);}control.value=String(value??'');};

    const page=ctx.ui.pages.add({id:'unit-pulse-sampler-shadow',pageId:'unitPulseSamplerShadowPage',label:'Pulse Sampler Unit Shadow',order:926,html:''});
    const pageUnit=units.page.create(page,{variant:'tool'}),body=pageUnit.element;
    units.pageHeader.create(body,{variant:'page-owned',title:'脉冲与采样处理',subtitle:'Pulse Generator · Vd / Vs / Vg · Steady-state Sampling',actions:[]});
    const workspaceHost=units.layout.create(body,{variant:'identity'});
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'unit-pulse-sampler-shadow',primaryScroll:'safe',leftWidth:540,leftMin:520,leftReserve:520,layoutStateVersion:'pulse-sampler-shadow-v1'});

    // Titleless parameter PRIME reconstructed only from reusable Units.
    const designer=units.panel.detached({variant:'plain',header:false});
    units.layout.apply(designer.element,{variant:'identity',geometry:{height:'100%',minHeight:'0',boxSizing:'border-box'}});
    const designerStack=units.layout.create(designer.element,{variant:'fill-rows',geometry:{height:'100%',minHeight:'0'}});
    const designerTop=units.layout.create(designerStack,{variant:'stack',geometry:{gap:'10px',minHeight:'0'}});
    const designerHeader=units.header.create(designerTop,{kind:'panel',variant:'content',eyebrow:'PULSE DESIGNER',title:'Vd',titleEmphasis:'prominent',meta:'0 个已加入片段 · 0 个边界点',metaPlacement:'title-inline'});
    const channelTabs=units.tabs.create(designerHeader.actions,{variant:'compact',items:[{id:'Vd',label:'Vd',selected:true},{id:'Vs',label:'Vs'},{id:'Vg',label:'Vg'}],onChange:value=>live?invokeLive('setChannel',{value}):record('setChannel',{value})});
    const parameterGrid=units.layout.create(designerTop,{variant:'form-grid-2'});
    const parameterField=(id,label,value,extra={})=>fieldControl(parameterGrid,{id,label,value,...extra,onChange:event=>live?invokeLive('setParameters',{channel:liveSnapshot()?.activeChannel||'Vd',value:{[id]:event.target.value}}):record('setParameters',{channel:'Vd',value:{[id]:event.target.value}})});
    parameterField('voltageMax','脉冲电压上限','4',{unit:'V',step:'any'});
    parameterField('voltageStep','电压步长 / 方波数','0.5',{step:'any'});
    parameterField('voltageRead','读取电压','0',{unit:'V',step:'any'});
    parameterField('pulseTime','脉冲时间','0.05',{unit:'s',min:0,step:'any'});
    parameterField('readTime','读取时间','0.05',{unit:'s',min:0,step:'any'});
    parameterField('timeShift','时间偏移','0',{unit:'s',step:'any'});
    parameterField('cycle','周期','0.5',{step:'0.25'});
    parameterField('ratio','拉伸系数','1',{step:'any'});
    const designerActions=units.layout.create(designerTop,{variant:'action-grid-4'});
    direct(designerActions,'generate','生成预览','primary',()=>({channel:liveSnapshot()?.activeChannel||'Vd',parameters:Object.fromEntries(Object.keys({voltageMax:1,voltageStep:1,voltageRead:1,pulseTime:1,readTime:1,timeShift:1,cycle:1,ratio:1}).map(key=>[key,controls.get(key)?.value]))}));
    direct(designerActions,'addSegment','加入序列','',()=>({channel:liveSnapshot()?.activeChannel||'Vd'}));
    direct(designerActions,'clearChannel','清空通道','',()=>({channel:liveSnapshot()?.activeChannel||'Vd'}));
    direct(designerActions,'exportWave','导出合并 CSV');
    const segmentBar=units.toolbar.create(designerTop,{variant:'ordinary'}).element;units.layout.apply(segmentBar,{variant:'segment-bar'});segmentBar.appendChild(dom.create('strong',{text:'已加入片段'}));direct(segmentBar,'removeSegment','删除最后片段','',()=>({channel:liveSnapshot()?.activeChannel||'Vd',index:Math.max(0,(liveSnapshot()?.active?.segmentCount||0)-1)}));
    const segmentHost=units.layout.create(designerStack,{variant:'scroll-pane',geometry:{minHeight:'120px',height:'100%'}});
    const segmentTable=units.table.mount('pulse-sampler-shadow-segments',segmentHost,{variant:'standard',columns:[{key:'index',label:'#'},{key:'voltageMax',label:'上限',unit:'V'},{key:'step',label:'步长'},{key:'read',label:'读取',unit:'V'},{key:'pulseTime',label:'脉冲',unit:'s'},{key:'readTime',label:'读取',unit:'s'},{key:'cycle',label:'周期'},{key:'points',label:'点数'}],rows:[]});

    const main=units.layout.create(null,{variant:'stack-comfortable',geometry:{gap:'12px',padding:'12px',minWidth:'0',minHeight:'0',boxSizing:'border-box'}});
    const wave=units.panel.create(main,{variant:'plain',header:false,sizing:'content'});
    units.layout.apply(wave.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto minmax(0,1fr) minmax(0,.58fr)',gap:'10px',padding:'14px',minHeight:'560px',boxSizing:'border-box'}});
    const waveHeader=units.header.create(wave.body,{kind:'panel',variant:'content',eyebrow:'MERGED WAVEFORM',title:'三路合并波形',titleEmphasis:'prominent',meta:'0 行',metaPlacement:'trailing'});
    const wavePlot=units.layout.create(wave.body,{variant:'identity',geometry:{minHeight:'260px'}});
    const waveSurface=units.scientificPlot.create(wavePlot,{variant:'curve',source:'pulse-sampler-shadow:waveform',minHeight:260,xTitle:'Time (s)',yTitle:'Voltage (V)',legend:{enabled:true,placement:'auto',interaction:'isolate',maxRows:2},getCurves:()=>currentWaveCurves,getMarkers:()=>[]});
    const waveTableHost=units.layout.create(wave.body,{variant:'identity',geometry:{minHeight:'120px'}});
    const waveTable=units.table.mount('pulse-sampler-shadow-wave',waveTableHost,{variant:'standard',columns:[{key:'time',label:'Time',unit:'s'},{key:'Vd',label:'Vd',unit:'V'},{key:'Vs',label:'Vs',unit:'V'},{key:'Vg',label:'Vg',unit:'V'}],rows:[]});

    const analysis=units.panel.create(main,{variant:'plain',header:false,sizing:'content'});
    units.layout.apply(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto auto auto',gap:'10px',padding:'14px',width:'100%',maxWidth:'100%',minWidth:'0',minHeight:'520px',boxSizing:'border-box'}});
    const analysisHeader=units.header.create(analysis.body,{kind:'panel',variant:'content',eyebrow:'SAMPLING',title:'测量数据提取',titleEmphasis:'prominent',meta:'尚未分配工程数据',metaPlacement:'trailing'});
    const commandSurface=units.layout.create(analysis.body,{variant:'identity',geometry:{display:'grid',gridTemplateRows:'auto auto',gap:'8px',padding:'10px',width:'100%',maxWidth:'100%',minWidth:'0',boxSizing:'border-box'}});
    const extractionGrid=units.layout.create(commandSurface,{variant:'analysis-control-grid'});
    fieldControl(extractionGrid,{id:'sourceId',label:'工程数据',kind:'select',options:[{value:'',label:'—'}],wide:true,onChange:event=>live?invokeLive('setAnalysis',{sourceId:event.target.value}):record('setAnalysis',{sourceId:event.target.value})});
    fieldControl(extractionGrid,{id:'timeKey',label:'Time 列',kind:'select',options:[{value:'',label:'—'}],onChange:event=>live?invokeLive('setAnalysis',{timeKey:event.target.value}):record('setAnalysis',{timeKey:event.target.value})});
    fieldControl(extractionGrid,{id:'currentKey',label:'Current 列',kind:'select',options:[{value:'',label:'—'}],onChange:event=>live?invokeLive('setAnalysis',{currentKey:event.target.value}):record('setAnalysis',{currentKey:event.target.value})});
    fieldControl(extractionGrid,{id:'trimLeft',label:'前剔除点',value:'',placeholder:'自动',min:0,step:1,onChange:event=>live?invokeLive('setAnalysis',{trimLeft:event.target.value}):record('setAnalysis',{trimLeft:event.target.value})});
    fieldControl(extractionGrid,{id:'trimRight',label:'后剔除点',value:'',placeholder:'自动',min:0,step:1,onChange:event=>live?invokeLive('setAnalysis',{trimRight:event.target.value}):record('setAnalysis',{trimRight:event.target.value})});
    direct(extractionGrid,'extract','提取稳态电流','primary',()=>({analysis:{sourceId:controls.get('sourceId')?.value,timeKey:controls.get('timeKey')?.value,currentKey:controls.get('currentKey')?.value,trimLeft:controls.get('trimLeft')?.value,trimRight:controls.get('trimRight')?.value,xMode:controls.get('xMode')?.value,yMode:controls.get('yMode')?.value}}));
    const resultControls=units.layout.create(commandSurface,{variant:'result-control-grid'});
    fieldControl(resultControls,{id:'xMode',label:'X',kind:'select',options:[{value:'readVoltage',label:'Read Voltage'},{value:'pulseVoltage',label:'Pulse Voltage'},{value:'readIndex',label:'Read Index'},{value:'pulseIndex',label:'Pulse Index'}],value:'readVoltage',onChange:event=>live?invokeLive('setAnalysis',{xMode:event.target.value}):record('setAnalysis',{xMode:event.target.value})});
    fieldControl(resultControls,{id:'yMode',label:'Y',kind:'select',options:[{value:'readCurrent',label:'Read Current'},{value:'pulseCurrent',label:'Pulse Current'}],value:'readCurrent',onChange:event=>live?invokeLive('setAnalysis',{yMode:event.target.value}):record('setAnalysis',{yMode:event.target.value})});
    direct(resultControls,'copyResult','复制结果表');direct(resultControls,'exportResult','导出结果 CSV');
    const resultHeader=units.header.create(analysis.body,{kind:'panel',variant:'content',eyebrow:'RESULT',title:'读写电流映射',titleEmphasis:'prominent',meta:'尚未执行提取。',metaPlacement:'trailing'});
    units.layout.apply(resultHeader.element,{variant:'identity',geometry:{paddingTop:'10px'}});
    const resultGrid=units.layout.create(analysis.body,{variant:'result-grid-asymmetric',geometry:{width:'100%',maxWidth:'100%',minWidth:'0'}});
    const resultPlot=units.layout.create(resultGrid,{variant:'identity',geometry:{minHeight:'260px'}});
    const resultSurface=units.scientificPlot.create(resultPlot,{variant:'curve',source:'pulse-sampler-shadow:result',minHeight:260,getCurves:()=>{if(!currentResult?.available||!Array.isArray(currentResult.x)||!currentResult.x.length)return[];const n=Math.min(currentResult.x.length,Array.isArray(currentResult.y)?currentResult.y.length:0);return n?[{id:'result',label:'Result',points:currentResult.x.slice(0,n).map((x,index)=>({x,y:currentResult.y[index]}))}]:[];},getMarkers:()=>[]});
    const resultTableHost=units.layout.create(resultGrid,{variant:'identity',geometry:{minHeight:'260px'}});
    const resultTable=units.table.mount('pulse-sampler-shadow-result',resultTableHost,{variant:'standard',columns:[{key:'index',label:'#'},{key:'voltage',label:'Voltage'},{key:'current',label:'Current'}],rows:[]});

    const segmentColumns=[{key:'index',label:'#'},{key:'voltageMax',label:'上限',unit:'V'},{key:'step',label:'步长'},{key:'read',label:'读取',unit:'V'},{key:'pulseTime',label:'脉冲',unit:'s'},{key:'readTime',label:'读取',unit:'s'},{key:'cycle',label:'周期'},{key:'points',label:'点数'}];
    const waveColumns=[{key:'time',label:'Time',unit:'s'},{key:'Vd',label:'Vd',unit:'V'},{key:'Vs',label:'Vs',unit:'V'},{key:'Vg',label:'Vg',unit:'V'}];
    const setHeaderText=(header,key,value)=>{if(header?.[key])header[key].textContent=String(value??'');};
    const setChannelTabState=value=>{for(const button of channelTabs?.tabs?.querySelectorAll?.('[role=tab]')||[]){const selected=String(button.textContent||'')===String(value||'');button.setAttribute?.('aria-selected',selected?'true':'false');units.state?.set?.(button,'selected',selected,{unit:'tabs'});}};
    const updateWaveSurface=waveform=>{currentWaveCurves=(waveform?.curves||[]).map(curve=>({id:curve.id,label:curve.label||curve.id,name:curve.label||curve.id,points:Array.isArray(curve.points)?curve.points:[]}));waveSurface.requestRender?.(`pulse-sampler-shadow:wave:${shadowState.liveParity.revision}`);shadowState.plotRenderCount+=1;};
    const updateResultSurface=result=>{currentResult=result||{available:false,x:[],y:[]};resultSurface.requestRender?.(`pulse-sampler-shadow:result:${shadowState.liveParity.revision}`);shadowState.plotRenderCount+=1;};
    syncLiveState=async()=>{
      if(!live)return null;
      const packet=live.snapshot(),snap=packet?.state||{};shadowLiveSnapshot=snap;shadowState.liveSnapshot=snap;shadowState.liveParity.revision=Number(packet?.descriptor?.revision)||0;
      const active=snap.active||{},params=active.params||{},analysisState=snap.analysis||{},source=snap.source||{},result=snap.result||{};
      setHeaderText(designerHeader,'title',snap.activeChannel||'Vd');setHeaderText(designerHeader,'meta',`${active.segmentCount||0} 个已加入片段 · ${active.hasPreview?'1 个当前预览 · ':''}${active.boundaryPoints||0} 个边界点`);setChannelTabState(snap.activeChannel||'Vd');
      for(const key of ['voltageMax','voltageStep','voltageRead','pulseTime','readTime','timeShift','cycle','ratio'])if(controls.get(key))controls.get(key).value=String(params[key]??'');
      segmentTable.setData?.(segmentColumns,active.segments||[]);if(actionButtons.get('removeSegment'))actionButtons.get('removeSegment').disabled=!(active.segments||[]).length;
      waveTable.setData?.(waveColumns,snap.waveform?.rows||[]);setHeaderText(waveHeader,'meta',(snap.waveform?.totalRows||0)>5000?`显示前 5000 / ${snap.waveform.totalRows} 行`:`${snap.waveform?.totalRows||0} 行`);updateWaveSurface(snap.waveform||{});
      setSelectOptions(controls.get('sourceId'),(source.options||[]).map(row=>({value:row.id,label:row.label})),source.activeId||'');
      const columnOptions=(source.columns||[]).map(value=>({value,label:value}));setSelectOptions(controls.get('timeKey'),columnOptions,source.timeKey||analysisState.timeKey||'');setSelectOptions(controls.get('currentKey'),columnOptions,source.currentKey||analysisState.currentKey||'');
      for(const key of ['trimLeft','trimRight','xMode','yMode'])if(controls.get(key))controls.get(key).value=String(analysisState[key]??'');
      setHeaderText(analysisHeader,'meta',source.meta||'尚未分配工程数据');setHeaderText(resultHeader,'meta',result.meta||'尚未执行提取。');
      const resultColumns=[{key:'index',label:'#'},{key:'x',label:result.xLabel||'X'},{key:'y',label:result.yLabel||'Current'}];resultTable.setData?.(resultColumns,result.rows||[]);updateResultSurface(result);
      shadowState.liveParity={connected:true,revision:Number(packet?.descriptor?.revision)||0,activeChannel:String(snap.activeChannel||''),segmentRows:(active.segments||[]).length,waveRows:(snap.waveform?.rows||[]).length,waveTotalRows:Number(snap.waveform?.totalRows)||0,resultRows:(result.rows||[]).length,sourceId:String(source.activeId||''),timeKey:String(source.timeKey||''),currentKey:String(source.currentKey||''),parameters:{...params},analysis:{...analysisState}};
      return snap;
    };

    const parameterPrime=units.prime.build({id:'parameters',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:96,collapsible:true,header:false,embedded:true,existingNode:designer.element,detailGeometry:{contentInsetPx:14},sizing:'fill',autoOpen:false,defaultPlacement:'left',placements:['left'],stateVersion:'pulse-sampler-shadow-v3'});
    workbench.compose({primary:{id:'main',label:'工具',presentationRole:'utility-primary',scroll:'safe',titlePolicy:'host-only',mainNode:main},primes:[parameterPrime],subs:[]});
    ctx.ui.topWorkspace.register({id:'unit-pulse-sampler-shadow',activity:'unit-pulse-sampler-shadow',label:'Pulse Sampler Unit Shadow',icon:'⌁',layout:{mode:'native',root:{selector:'#unitPulseSamplerShadowPage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary',presentationRole:'utility-primary',priority:100,collapsible:false},prime:[{id:'parameters',label:'参数',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:96,collapsible:true}],sub:[]}});
    if(live){liveOff=live.subscribe(()=>{void syncLiveState();},{immediate:true});await syncLiveState();}
    return{intents,shadowState,syncLiveState,invokeLive,deactivate(){try{liveOff?.();}catch{}for(const x of [segmentTable,waveTable,resultTable,waveSurface,resultSurface])try{x?.dispose?.();}catch{}try{workbench?.dispose?.();}catch{}}};
  });
})();
