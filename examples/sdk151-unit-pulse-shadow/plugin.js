(() => {
  const manifest={"id":"com.example.unit-pulse-shadow","name":"Pulse Unit-only Shadow Reconstruction","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":923,"description":"Parallel, non-production Pulse Analysis reconstruction built only from public Unit Templates for seven-layer parity auditing.","requiresCore":["status","workspace","analysis.providers","ui.dom","ui.workspace","ui.plot-views","ui.actions","ui.interaction","ui.pages","ui.portable","ui.scientific-plot","ui.table","ui.unit-templates"],"capabilities":["ui.page","ui.plugin-workspace","ui.scientific-plot"],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.pulse.trace"]}};

  DKDSPlugins.define(manifest,async ctx=>{
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const shadowState={calls:[],resultScope:'checked',checked:true,settings:{}};
    const nativeProvider=()=>ctx.analysis.providers.get('pulse-read');
    const record=(intent,nativeMethod,payload={})=>{shadowState.calls.push({intent,nativeMethod,payload,providerAvailable:!!nativeProvider()});ctx.status.set(`Pulse Unit shadow：${intent} 已映射；生产 Pulse 未被替换。`);};
    const command=(intent,nativeMethod,payload={})=>record(intent,nativeMethod,payload);
    const geom=(target,geometry,responsiveGeometry=[])=>units.layout.apply(target,{variant:'identity',geometry,responsiveGeometry});

    const page=ctx.ui.pages.add({id:'unit-pulse-shadow',pageId:'unitPulseShadowPage',label:'Pulse Unit Shadow',order:923,html:''});
    const pageUnit=units.page.create(page,{variant:'analysis'});
    const body=pageUnit.element;
    units.pageHeader.create(body,{variant:'page-owned',title:'脉冲 / 读取电流分析 · Unit Shadow',subtitle:'仅用于 Unit Templates 七层 parity；不替换生产 Pulse。',actions:[
      {id:'analyze-current',label:'分析当前',variant:'primary',onInvoke:()=>command('analyze-current','analyzeCurrent')},
      {id:'analyze-checked',label:'分析勾选',onInvoke:()=>command('analyze-checked','analyzeChecked')}
    ]});

    const workspaceHost=units.layout.create(body,{variant:'stack'});
    const wb=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'unit-pulse-shadow',primaryScroll:'auto'});

    // data-control PRIME: file manager + current-file editor
    const controls=units.layout.create(null,{variant:'stack-comfortable'});
    const filePanel=units.panel.create(controls,{variant:'headed',title:'脉冲数据文件',meta:'勾选决定是否参与批量分析和叠加比较；点击文件切换当前编辑对象。'});
    units.toolbar.create(filePanel.body,{variant:'ordinary',actions:[
      {id:'check-all',label:'全选',onInvoke:()=>{shadowState.checked=true;command('check-all','setAllChecked',{value:true});}},
      {id:'uncheck-all',label:'全不选',onInvoke:()=>{shadowState.checked=false;command('check-all','setAllChecked',{value:false});}},
      {id:'remove',label:'从脉冲分析移除',onInvoke:()=>command('remove','removeChecked')}
    ]});
    const fileList=units.list.create(filePanel.body,{variant:'selectable'});
    const fileRowContent=units.layout.create(null,{variant:'batch-file-row'});
    units.check.create(fileRowContent,{variant:'checkbox',label:false,checked:true,onChange:event=>command('check-one','setFileChecked',{id:'shadow-file-1',value:event.target.checked})});
    const fileText=units.layout.create(fileRowContent,{variant:'stack-compact'});
    fileText.append(dom.create('strong',{textContent:'shadow_pulse_trace.csv'}),dom.create('span',{textContent:'示例文件 · 300 points/cycle'}));
    units.chip.create(fileRowContent,{variant:'quiet',text:'当前'});
    units.list.item(fileList.element,{tagName:'div',selectable:true,selected:true,content:fileRowContent,onInvoke:()=>command('select-file','setActiveFile',{id:'shadow-file-1'})});
    units.emptyState.create(filePanel.body,{variant:'standard',text:'尚未添加脉冲数据文件'}).element.hidden=true;
    units.note.create(filePanel.body,{variant:'meta',text:'1 个文件 · 1 个勾选 · 0 个已分析'});

    const configPanel=units.panel.create(controls,{variant:'headed',title:'当前文件与提取设置',meta:'“自动”优先使用明确的时间协议；无协议但有电压时使用等点数分段。'});
    const fileHead=units.layout.create(configPanel.body,{variant:'active-file-head'});
    const fileIdentity=units.layout.create(fileHead,{variant:'stack-compact'});
    fileIdentity.append(dom.create('strong',{textContent:'shadow_pulse_trace.csv'}),dom.create('span',{textContent:'1000 rows · current/time/voltage'}));
    const labelField=units.field.create(fileHead,{variant:'input',label:'显示标签',value:'Device A',onChange:event=>command('series-label','setSeriesLabel',{value:event.target.value})});
    geom(labelField.control,{minWidth:'128px'});

    const form=units.layout.create(configPanel.body,{variant:'form-grid'});
    const select=(id,label,options,nativeMethod='setSetting')=>units.field.create(form,{variant:'select',kind:'select',id,label,options,onChange:event=>{shadowState.settings[id]=event.target.value;command(id,nativeMethod,{value:event.target.value});}});
    const input=(id,label,extra={})=>units.field.create(form,{variant:'input',id,label,inputType:'number',...extra,onChange:event=>{shadowState.settings[id]=event.target.value;command(id,'setSetting',{value:event.target.value});}});
    select('segmentationMode','分段方式',[{value:'auto',label:'自动（推荐）'},{value:'cycle',label:'按周期点数'},{value:'timing',label:'按时间协议'},{value:'waveform',label:'按记录电压平台'},{value:'equal-count',label:'等点数分段'}]);
    select('timeCol','时间列',['1: Time','2: Current','3: Voltage']);
    select('currentCol','电流列',['1: Time','2: Current','3: Voltage']);
    select('voltageCol','记录电压列',['— 未记录 —','3: Voltage']);
    input('cycleSamples','每周期点数',{min:0,step:1,placeholder:'0 = 自动，例如 300'});
    input('cycleOffsetSamples','首周期偏移点数',{min:0,step:1,value:0});

    const writeRange=units.layout.create(form,{variant:'stack-compact'});writeRange.append(dom.create('span',{textContent:'写入统计区间（点）'}));
    const writeInline=units.layout.create(writeRange,{variant:'inline-range'});
    units.field.create(writeInline,{variant:'input',label:false,inputType:'number',min:0,step:1,placeholder:'自动'});
    writeInline.append(dom.create('span',{textContent:'–'}));
    units.field.create(writeInline,{variant:'input',label:false,inputType:'number',min:1,step:1,placeholder:'自动'});
    const readRange=units.layout.create(form,{variant:'stack-compact'});readRange.append(dom.create('span',{textContent:'读取统计区间（点）'}));
    const readInline=units.layout.create(readRange,{variant:'inline-range'});
    units.field.create(readInline,{variant:'input',label:false,inputType:'number',min:0,step:1,placeholder:'自动'});
    readInline.append(dom.create('span',{textContent:'–'}));
    units.field.create(readInline,{variant:'input',label:false,inputType:'number',min:1,step:1,placeholder:'自动'});

    input('writeDuration','写入宽度 (s)',{min:0,step:'any',placeholder:'例如 0.1'});
    input('readDuration','读取宽度 (s)',{min:0,step:'any',placeholder:'例如 1'});
    select('phaseOrder','相位顺序',[{value:'write-read',label:'写入 → 读取'},{value:'read-write',label:'读取 → 写入'}]);
    input('sampleInterval','采样间隔 (s，可选)',{min:0,step:'any'});
    input('readVoltageFallback','读取电压 (V，可选)',{step:'any'});
    input('pulseVoltageFallback','写入电压 (V，可选)',{step:'any'});
    input('blockSamples','每个平台点数',{min:0,step:1,value:0});
    select('readPairMode','读取平台配对',[{value:'after',label:'脉冲后的读取平台'},{value:'before',label:'脉冲前的读取平台'}]);
    input('windowStart','稳态窗口起点 (%)',{min:0,max:95,step:1,value:25});
    input('windowEnd','稳态窗口终点 (%)',{min:5,max:100,step:1,value:75});
    units.action.create(form,{id:'apply-settings',label:'当前设置应用到勾选文件',onInvoke:()=>command('apply-settings','applySettingsToChecked')});
    units.note.create(configPanel.body,{variant:'normal',text:'周期数据可直接使用“每周期点数”。留空时会结合电压跳变或读写宽度比例自动确定相位。'});
    const metrics=units.summary.create(configPanel.body,{variant:'row'});
    for(const [label,value] of [['周期','—'],['写入','—'],['读取','—'],['结果','尚未分析']])units.metric.create(metrics.element,{label,value});

    const dataControl=units.prime.build({id:'data-control',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:92,collapsible:true,autoOpen:true,existingNode:controls,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'pulse-unit-shadow-results-v2'});

    // Main results: one sequential PRIMARY content flow using generic Layout/Panel/PlotView Units.
    const main=units.layout.create(null,{variant:'stack-comfortable',geometry:{width:'min(1840px,100%)',minWidth:'0',boxSizing:'border-box',padding:'0 14px 14px'},responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px',padding:'0 8px 8px'}}]});
    const visual=units.layout.create(main,{variant:'stack-comfortable',responsiveTarget:main,responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px'}}]});
    const compare=units.panel.create(visual,{variant:'plain',header:false});
    const compareHeader=units.header.create(compare.element,{kind:'panel',variant:'panel',title:'结果比较',stacked:false,dataset:{dkdsMobileDensity:'compact',dkdsMobileHeaderLayout:'row'}});
    const compareActions=units.layout.create(compareHeader.actions,{variant:'compare-actions'});
    const scope=units.field.create(compareActions,{variant:'integrated',layout:'integrated',kind:'select',label:'显示范围',value:'checked',options:[{value:'checked',label:'全部勾选文件'},{value:'active',label:'仅当前文件'}],onChange:event=>{shadowState.resultScope=event.target.value;command('result-scope','setResultScope',{value:event.target.value});}});
    geom(scope.control,{width:'174px'});
    units.chip.create(compareActions,{variant:'quiet',text:'0 个已分析文件'});
    units.note.create(compare.element,{variant:'normal',text:'有脉冲电压时使用电压横轴；未记录/未指定时自动改用脉冲序号。'});

    const resultGrid=units.layout.create(visual,{variant:'two-card-grid',responsiveTarget:main,geometry:{gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'14px',width:'100%',minWidth:'0'},responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px'}},{maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}}]});
    const surfaces=[];
    function resultPlot(id,title,nativeCsv){
      const panel=units.panel.create(resultGrid,{variant:'plot-card',header:false});
      units.layout.apply(panel.element,{variant:'plot-card-fill',geometry:{height:'360px',minHeight:'320px'}});
      const header=units.header.create(panel.element,{kind:'plot',variant:'plot',title});
      const plot=units.layout.create(panel.element,{variant:'identity',geometry:{width:'100%',minWidth:'0',overflow:'hidden'}});
      const view=units.plotView.adopt(id,panel.element,{variant:'complete',title,plot,header:header.element,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',detailGeometry:{contentMinHeightPx:320,contentMaxHeightPx:320},fileStem:()=>id,csv:()=>'',images:true,stateVersion:'pulse-unit-shadow-results-v5'});
      const surface=units.scientificPlot.create(plot,{variant:'curve',source:`pulse-unit-shadow:${id}`});surfaces.push(surface);
      const legend=units.legend.create(panel.element,{variant:'strip'});legend.append(dom.create('span',{textContent:'Device A'}));
      command(`${id}-export-map`,nativeCsv);
      return view;
    }
    resultPlot('pulse-shadow-read','脉冲条件 → 读取电流','exportReadCsv');
    resultPlot('pulse-shadow-pulse','脉冲条件 → 脉冲电流','exportPulseCsv');

    const tablePanel=units.panel.create(main,{variant:'headed',title:'批量提取结果',meta:'未知电压保持为空；CSV 不会用 0 或其他数值替代未记录电压。',actions:[
      {id:'copy-results',label:'复制可见结果',onInvoke:()=>command('copy-results','copyResults')},
      {id:'export-results',label:'导出可见 CSV',onInvoke:()=>command('export-results','exportResults')}
    ]});
    const tableWrap=units.layout.create(tablePanel.body,{variant:'scroll-pane',geometry:{minHeight:'180px',maxHeight:'330px'}});
    const resultTable=units.table.mount('pulse-shadow-results',tableWrap,{variant:'standard',columns:[{id:'file',label:'文件'},{id:'pulseIndex',label:'Pulse #'},{id:'pulseVoltage',label:'Pulse V'},{id:'readVoltage',label:'Read V'},{id:'readCurrent',label:'Read I'},{id:'pulseCurrent',label:'Pulse I'}],rows:[],persistKey:'pulse-shadow-results'});
    const emptyBody=units.layout.create(tableWrap,{variant:'empty-centered'});units.emptyState.create(emptyBody,{variant:'standard',text:'暂无可显示的已分析结果'});

    // Raw diagnostic remains the final item in the same PRIMARY content flow.
    const rawPanel=units.panel.create(main,{variant:'plot-card',header:false});
    units.layout.apply(rawPanel.element,{variant:'plot-card-fill',geometry:{minHeight:'320px'}});
    const rawHeader=units.header.create(rawPanel.element,{kind:'plot',variant:'plot',title:'当前文件 · 原始波形诊断',actions:[{id:'fit-raw',label:'适配视图',onInvoke:()=>command('fit-raw','fitRaw')}]});
    const rawPlot=units.layout.create(rawPanel.element,{variant:'identity',geometry:{width:'100%',minWidth:'0',overflow:'hidden'}});
    const rawView=units.plotView.adopt('pulse-shadow-raw',rawPanel.element,{variant:'complete',title:'当前文件 · 原始波形诊断',plot:rawPlot,header:rawHeader.element,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',detailGeometry:{contentMinHeightPx:360,contentMaxHeightPx:360},fileStem:()=> 'pulse-shadow-raw',csv:()=>'',images:true,stateVersion:'pulse-unit-shadow-flow-v4'});
    const rawSurface=units.scientificPlot.create(rawPlot,{variant:'curve',source:'pulse-unit-shadow:raw'});surfaces.push(rawSurface);
    const rawMenu=units.menu.create({id:'pulse-shadow-export',variant:'dropdown',items:[
      {id:'raw-csv',label:'当前文件 · 原始波形数据 CSV',onInvoke:()=>command('export-raw-csv','exportRawCsv')},
      {id:'read-csv',label:'当前可见结果 · 读取电流 CSV',onInvoke:()=>command('export-read-csv','exportReadCsv')},
      {id:'pulse-csv',label:'当前可见结果 · 脉冲电流 CSV',onInvoke:()=>command('export-pulse-csv','exportPulseCsv')}
    ]});
    wb.compose({primary:{id:'main',label:'脉冲分析',scroll:'auto',titlePolicy:'host-only',mainNode:main},primes:[dataControl],subs:[]});
    ctx.status.set('Pulse Unit-only shadow reconstruction 已加载；生产 Pulse 保持原样。');

    return {shadowState,rawView,rawMenu,deactivate(){try{resultTable?.dispose?.();}catch{}for(const surface of surfaces)try{surface?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}};
  });
})();
