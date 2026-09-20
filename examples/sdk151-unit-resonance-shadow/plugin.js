(() => {
  const manifest={"id":"com.example.unit-resonance-shadow","name":"Resonance Unit-only Shadow Reconstruction","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":924,"description":"Parallel, non-production Resonance Workbench reconstruction built only from public Unit Templates for seven-layer parity auditing.","requiresCore":["status","workspace","parameters","analysis.providers","ui.dom","ui.workspace","ui.group-area","ui.plot-views","ui.actions","ui.interaction","ui.pages","ui.portable","ui.scientific-plot","ui.table","ui.unit-templates"],"capabilities":["ui.page","ui.plugin-workspace","ui.group-area","ui.scientific-plot"],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.transport.iv"]}};

  DKDSPlugins.define(manifest,async ctx=>{
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,g=units.metrics.acceptedScientific;
    const shadowState={calls:[],scanMode:'all',selectedSweep:'forward',groupColumns:'auto',showRejected:false,showWidth:false,showPoints:true,physicsLabels:true,range:null};
    const record=(intent,nativeMethod,payload={})=>{shadowState.calls.push({intent,nativeMethod,payload});ctx.status.set(`Resonance Unit shadow：${intent} 已映射；生产 Resonance 未被替换。`);return true;};
    const command=(intent,nativeMethod,payload={})=>record(intent,nativeMethod,payload);
    const geom=(target,geometry,responsiveGeometry=[])=>units.layout.apply(target,{variant:'identity',geometry,responsiveGeometry});
    const text=(tag,value)=>dom.create(tag,{textContent:String(value)});
    const emptyCurves=()=>[];
    const emptyMarkers=()=>[];
    const plotSurfaces=[];
    const tables=[];
    let rangePopover=null;

    const page=ctx.ui.pages.add({id:'unit-resonance-shadow',pageId:'unitResonanceShadowPage',label:'Resonance Unit Shadow',order:924,html:''});
    const pageUnit=units.page.create(page,{variant:'analysis'}),body=pageUnit.element;
    units.pageHeader.create(body,{variant:'page-owned',title:'共振分析 · Unit Shadow',subtitle:'41-Unit 真实迁移压力测试；accepted scientific preset 仅作为同一路径组合参考，生产 Resonance 保持冻结。',actions:[
      {id:'export',label:'导出',menu:true,items:()=>[
        {id:'main-svg',label:'共振 I–V 主图 · SVG',onInvoke:()=>command('main-svg','exportMainSvg')},
        {id:'main-png',label:'共振 I–V 主图 · PNG',onInvoke:()=>command('main-png','exportMainPng')},
        {id:'main-csv',label:'共振 I–V 主图数据 · CSV',onInvoke:()=>command('main-csv','exportMainCsv')},
        {id:'peaks-csv',label:'峰参数 CSV',onInvoke:()=>command('peaks-csv','exportPeaks')}
      ]},
      {id:'settings',label:'设置',onInvoke:()=>command('settings','settingsSurface.open')}
    ]});

    const workspaceHost=units.layout.create(body,{variant:'stack'});
    const wb=units.workspace.create(workspaceHost,{variant:'accepted-scientific',header:false,activity:'unit-resonance-shadow',primaryScroll:'contained',leftWidth:g.leftWidthPx,leftMin:g.leftMinPx,canvasLeftWidth:g.canvasLeftWidthPx,canvasRightWidth:g.canvasRightWidthPx,canvasBottomHeight:g.canvasBottomHeightPx});

    // DATA-CONTROL PRIME — dataset manager, detector configuration, display controls and inline disclosure.
    const controls=units.layout.create(null,{variant:'stack-comfortable'});
    const datasets=units.section.create(controls,{variant:'controls',title:'数据列表'});
    const scanActions=units.layout.create(datasets.body,{variant:'action-grid-4'});
    const setScanMode=mode=>{shadowState.scanMode=mode;command(`scan-${mode}`,'setAllVisibility',{mode});};
    units.action.create(scanActions,{id:'all',label:'全部扫描',variant:'selected',onInvoke:()=>setScanMode('all')});
    units.action.create(scanActions,{id:'forward',label:'仅正扫',onInvoke:()=>setScanMode('forward')});
    units.action.create(scanActions,{id:'reverse',label:'仅反扫',onInvoke:()=>setScanMode('reverse')});
    units.action.create(scanActions,{id:'none',label:'全不选',onInvoke:()=>setScanMode('none')});
    const datasetList=units.list.create(datasets.body,{variant:'selectable'});
    for(const row of [
      {id:'shadow-forward',name:'Vg = +20 V · 正扫',vg:'+20',transform:'原始 I–V',current:true},
      {id:'shadow-reverse',name:'Vg = +20 V · 反扫',vg:'+20',transform:'dI/dV',current:false}
    ]){
      const content=units.layout.create(null,{variant:'dataset-row'});
      const identity=units.layout.create(content,{variant:'stack-compact'});identity.append(text('strong',row.name),text('span','示例扫描 · 401 points'));
      const vg=units.field.create(content,{variant:'integrated',layout:'integrated',kind:'select',label:'Vg',options:[{value:row.vg,label:row.vg}],value:row.vg,onChange:event=>command('dataset-vg','selectSweep',{id:row.id,vg:event.target.value})});
      geom(vg.control,{width:'92px'});
      const transform=units.field.create(content,{variant:'integrated',layout:'integrated',kind:'select',label:'视图',options:['原始 I–V','dI/dV','d²I/dV²'],value:row.transform,onChange:event=>command('dataset-transform','renderMain',{id:row.id,transform:event.target.value})});
      geom(transform.control,{width:'118px'});
      units.list.item(datasetList.element,{tagName:'div',selectable:true,selected:row.current,content,onInvoke:()=>command('dataset-current','selectSweep',{id:row.id})});
    }

    const detector=units.section.create(controls,{variant:'controls',title:'智能寻峰'});
    units.note.create(detector.body,{variant:'normal',text:'自动融合原始 I–V 与辅助通道；最终峰位始终回到原始采样点。'});
    const detectorSelect=units.field.create(detector.body,{variant:'integrated',layout:'integrated',kind:'select',label:'寻峰算法',options:[{value:'robust',label:'Robust resonance detector'}],onChange:event=>command('detector','setActiveDetector',{value:event.target.value})});
    const metricSelect=units.field.create(detector.body,{variant:'integrated',layout:'integrated',kind:'select',label:'峰宽/基线算法',options:[{value:'local',label:'Local FWHM / baseline'}],onChange:event=>command('metric-algorithm','setActiveMetricAlgorithm',{value:event.target.value})});
    geom(detectorSelect.control,{width:'100%'});geom(metricSelect.control,{width:'100%'});
    units.note.create(detector.body,{variant:'normal',text:'FWHM、峰高、面积与局部基线由可版本化算法插件计算。'});
    const preset=units.field.create(detector.body,{variant:'integrated',layout:'integrated',kind:'select',label:'预设',options:[{value:'strict',label:'可靠'},{value:'balanced',label:'平衡'},{value:'sensitive',label:'灵敏'}],value:'balanced',onChange:event=>command('preset','setDetectorSettings',{preset:event.target.value})});
    geom(preset.control,{width:'118px'});
    const advanced=units.section.create(detector.body,{variant:'disclosure',title:'高级设置（一般不用改）',open:false,onToggle:({open})=>command('advanced-toggle','setDetectorSettings',{advancedOpen:open})});
    let detectorForm=null;
    try{
      detectorForm=units.parameterForm.mount(advanced.body,{fields:[
        {id:'minProminence',type:'number',label:'最小 prominence',default:0.02},
        {id:'minDistance',type:'number',label:'最小峰间距',default:0.05},
        {id:'smoothWindow',type:'number',label:'平滑窗口',default:9}
      ]},{compact:true,value:{minProminence:0.02,minDistance:0.05,smoothWindow:9},onChange:next=>command('detector-settings','setDetectorSettings',next)});
    }catch(error){units.note.create(advanced.body,{variant:'warning',text:`参数表单运行时不可用：${error.message}`});}
    const detectActions=units.layout.create(detector.body,{variant:'action-grid-2'});
    units.action.create(detectActions,{id:'detect-selected',label:'当前扫描寻峰',variant:'primary',onInvoke:()=>command('detect-selected','runDetection',{mode:'selected'})});
    units.action.create(detectActions,{id:'detect-all',label:'全部可见寻峰',onInvoke:()=>command('detect-all','runDetection',{mode:'all'})});
    units.action.create(detector.body,{id:'sort-peaks',label:'跨 Vg 智能整理峰序',onInvoke:()=>command('sort-peaks','sortPeakOrderByVd')});
    const peakLegend=units.legend.create(detector.body,{variant:'strip'});peakLegend.append(text('span','峰1'),text('span','峰2'),text('span','AB / BA'));

    const display=units.section.create(controls,{variant:'controls',title:'显示'});
    units.check.create(display.body,{variant:'checkbox',label:'显示不采纳峰',checked:false,onChange:event=>{shadowState.showRejected=event.target.checked;command('show-rejected','renderMain',{value:event.target.checked});}});
    units.check.create(display.body,{variant:'checkbox',label:'显示选中峰宽',checked:false,onChange:event=>{shadowState.showWidth=event.target.checked;command('show-width','renderMain',{value:event.target.checked});}});
    units.check.create(display.body,{variant:'checkbox',label:'显示峰位点',checked:true,onChange:event=>{shadowState.showPoints=event.target.checked;command('show-points','renderMain',{value:event.target.checked});}});
    units.check.create(display.body,{variant:'checkbox',label:'主图标注物理类型',checked:true,onChange:event=>{shadowState.physicsLabels=event.target.checked;command('physics-labels','togglePhysicsLabels',{value:event.target.checked});}});
    units.field.create(display.body,{variant:'integrated',layout:'integrated',kind:'select',label:'辅助视图',options:['原始 I–V','dI/dV','d²I/dV²','log|I|'],onChange:event=>command('transform','renderMain',{value:event.target.value})});

    const manual=units.section.create(controls,{variant:'controls',title:'手动操作'});
    units.note.create(manual.body,{variant:'meta',text:'Ctrl / Shift + 左键点击曲线：新增峰 · Ctrl / Shift + 右键点击峰点：删除峰 · 直接拖框：选择峰 · Ctrl + 拖框：框选缩放 · 拖峰点：吸附到真实采样点 · L / Shift+L：锁定/解锁 · ↑/↓ 切换曲线 · ←/→ 移动峰。'});

    const dataControl=units.prime.build({id:'data-control',label:'参数',title:'共振参数与数据',variant:'accepted-scientific-data-control',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:95,autoOpen:true,content:controls,defaultPlacement:'left',placements:['left'],stateVersion:'resonance-unit-shadow-v1'});

    // PRIMARY — exact manual Unit composition corresponding to the accepted scientific preset.
    const main=units.layout.create(null,{variant:'accepted-main-area'});
    const mainWorkspace=units.layout.create(main,{variant:'accepted-main-workspace'});
    const plotWrap=units.layout.create(mainWorkspace,{variant:'accepted-plot-wrap'});
    const mainHeader=units.layout.create(plotWrap,{variant:'accepted-main-header'});
    units.floatingChrome.create(mainHeader,{variant:'accepted-main',actions:[
      {id:'lock',label:'锁定所选',onInvoke:()=>command('lock','lockSelectedPeaks',{locked:true})},
      {id:'unlock',label:'解锁所选',onInvoke:()=>command('unlock','lockSelectedPeaks',{locked:false})},
      {id:'smart-order',label:'智能峰序',onInvoke:()=>command('smart-order','sortPeakOrderByVd')},
      {id:'physics',label:'物理标记',onInvoke:()=>command('physics','togglePhysicsLabels')},
      {id:'reset',label:'重新居中',onInvoke:()=>command('reset','resetMainView')}
    ]});
    const mainLegend=units.legend.create(mainHeader,{variant:'accepted-main'});mainLegend.append(text('span','正扫'),text('span','反扫'),text('span','选中峰'));
    const mainPlotHost=units.layout.create(plotWrap,{variant:'accepted-main-plot'});

    const openRangePopover=point=>{
      try{rangePopover?.close?.();}catch{}
      const content=units.layout.create(null,{variant:'stack-compact'});
      const grid=units.layout.create(content,{variant:'action-grid-4'});
      units.action.create(grid,{id:'range-detect',label:'局部寻峰',variant:'primary',onInvoke:()=>command('range-detect','detectSelectedRange')});
      units.action.create(grid,{id:'range-delete',label:'删除框选峰',variant:'destructive',onInvoke:()=>{units.dialog.confirm({title:'删除框选峰',message:'仅验证 Unit dialog / destructive action 路径。'});command('range-delete','deleteSelectedRangePeaks');}});
      units.action.create(grid,{id:'range-lock',label:'锁定框选峰',onInvoke:()=>command('range-lock','setSelectedRangeLocked',{locked:true})});
      units.action.create(grid,{id:'range-unlock',label:'解锁框选峰',onInvoke:()=>command('range-unlock','setSelectedRangeLocked',{locked:false})});
      const identity=units.layout.create(content,{variant:'form-grid-2'});
      const order=units.field.create(identity,{variant:'select',kind:'select',label:'统一峰序',options:['峰1','峰2','峰3']});
      const label=units.field.create(identity,{variant:'input',label:'统一峰标签',placeholder:'例如 峰3 / AB'});
      units.action.create(content,{id:'apply-range-identity',label:'应用到框选峰',onInvoke:()=>command('range-identity','applySelectedRangeIdentity',{order:order.control.value,label:label.control.value})});
      units.note.create(content,{variant:'meta',text:'峰位始终落在原始 I–V 采样点。'});
      rangePopover=units.popover.create(body,{variant:'picker',title:'已框选区域',content,point,placement:'point',offset:8,onClose:()=>{rangePopover=null;command('range-close','clearSelectedRange');}});
      return rangePopover;
    };

    const mainSurface=units.scientificPlot.create(mainPlotHost,{variant:'curve',source:'resonance-unit-shadow:main',activity:'unit-resonance-shadow',getCurves:emptyCurves,getMarkers:emptyMarkers,showMarkers:()=>shadowState.showPoints,showWidth:()=>shadowState.showWidth,interactionExtensions:[
      {id:'resonance.curve.shift-add',gesture:'click',target:'curve',modifiers:['shift'],intent:'select',selectionMode:'additive',onInvoke:()=>command('curve-shift-add','addManualPeak')},
      {id:'resonance.marker.ctrl-delete',gesture:'context',target:'marker',modifiers:['ctrl'],intent:'command',onInvoke:()=>command('marker-delete','deleteSelectedPeaks')},
      {id:'resonance.marker.shift-delete',gesture:'context',target:'marker',modifiers:['shift'],intent:'command',onInvoke:()=>command('marker-delete','deleteSelectedPeaks')},
      {id:'resonance.marker.drag',gesture:'drag',target:'marker',intent:'manipulate',onInvoke:()=>command('marker-drag','moveSelectedPeakBy')},
      {id:'resonance.key.lock',gesture:'key',target:'keyboard',chord:'L',intent:'command',onInvoke:()=>command('key-lock','lockSelectedPeaks',{locked:true})},
      {id:'resonance.key.unlock',gesture:'key',target:'keyboard',chord:'Shift+L',intent:'command',onInvoke:()=>command('key-unlock','lockSelectedPeaks',{locked:false})},
      {id:'resonance.key.up',gesture:'key',target:'keyboard',chord:'ArrowUp',intent:'command',onInvoke:()=>command('key-up','switchSelectedSweep',{delta:-1})},
      {id:'resonance.key.down',gesture:'key',target:'keyboard',chord:'ArrowDown',intent:'command',onInvoke:()=>command('key-down','switchSelectedSweep',{delta:1})},
      {id:'resonance.key.left',gesture:'key',target:'keyboard',chord:'ArrowLeft',intent:'command',onInvoke:()=>command('key-left','moveSelectedPeakBy',{delta:-1})},
      {id:'resonance.key.right',gesture:'key',target:'keyboard',chord:'ArrowRight',intent:'command',onInvoke:()=>command('key-right','moveSelectedPeakBy',{delta:1})}
    ],onRangeSelect:payload=>{shadowState.range=payload;openRangePopover(payload?.event||payload?.point||{x:120,y:120});command('range-select','clearSelectedRange',{selected:true});},onReset:()=>command('plot-reset','resetMainView')});
    plotSurfaces.push(mainSurface);
    const status=units.status.create(main,{variant:'accepted-summary'});
    const summary=units.layout.create(status,{variant:'accepted-summary'});summary.append(text('span','2 条扫描 · 4 个峰 · Vg +20 V'),text('span','Unit-only shadow / production frozen'));

    // INSPECTOR PRIME — movable, Core-owned accepted inspector chrome.
    const inspectorContent=units.layout.create(null,{variant:'stack-comfortable'});
    const inspectorRow=units.layout.create(inspectorContent,{variant:'row-between'});inspectorRow.append(text('strong','当前峰：峰2 · Vd = 0.42 V'));
    units.action.create(inspectorRow,{id:'clear-selection',label:'清除选择',onInvoke:()=>command('clear-selection','clearSelection')});
    const kv=units.layout.create(inspectorContent,{variant:'key-value-standard'});
    for(const [k,v] of [['峰位','0.42 V'],['FWHM','0.061 V'],['峰高 A','3.8 µA'],['峰面积 S','0.24 µA·V'],['局部基线','0.7 µA']]){kv.append(text('span',k),text('strong',v));}
    const inspectActions=units.layout.create(inspectorContent,{variant:'action-grid-2'});
    units.action.create(inspectActions,{id:'inspect-lock',label:'锁定峰',onInvoke:()=>command('inspect-lock','lockSelectedPeaks',{locked:true})});
    units.action.create(inspectActions,{id:'inspect-delete',label:'删除峰',variant:'destructive',onInvoke:()=>command('inspect-delete','deleteSelectedPeaks')});
    const inspectPlotPanel=units.panel.create(inspectorContent,{variant:'plot-card',header:false});
    const inspectPlotHeader=units.header.create(inspectPlotPanel.element,{kind:'plot',variant:'plot',title:'局部峰形与分析窗口'});
    const inspectPlotHost=units.layout.create(inspectPlotPanel.element,{variant:'identity'});geom(inspectPlotHost,{minHeight:'220px'});
    const inspectSurface=units.scientificPlot.create(inspectPlotHost,{variant:'curve',source:'resonance-unit-shadow:inspector',getCurves:emptyCurves,getMarkers:emptyMarkers});plotSurfaces.push(inspectSurface);
    const inspectorSection=units.layout.create(inspectorContent,{variant:'inspector-section'});
    units.field.create(inspectorSection,{variant:'integrated',layout:'integrated',kind:'select',label:'物理类型',options:['未分类','AB','BA','其他'],onChange:event=>command('peak-class','selectPeak',{category:event.target.value})});
    const palette=units.layout.create(inspectorSection,{variant:'palette-grid'});
    for(const label of ['AB','BA','正扫峰','反扫峰'])units.check.create(palette,{variant:'radio',kind:'radio',name:'res-shadow-category',label,onChange:()=>command('peak-category','selectPeak',{label})});
    units.field.create(inspectorSection,{variant:'input',label:'峰标签',placeholder:'自定义峰标签',onChange:event=>command('peak-label','selectPeak',{label:event.target.value})});
    const inspector=units.prime.build({id:'curve-inspector',label:'检查',title:'曲线检查器',variant:'accepted-scientific-inspector',presentationRole:'inspector',semanticKind:'panel',priority:90,collapsible:true,content:inspectorContent,defaultPlacement:'right',placements:['float','global','left','right','bottom'],stateVersion:'resonance-unit-shadow-v1',mount:()=>command('inspect-show','renderInspection')});

    // GROUP PRIME — same accepted PlotGroup path, with complete child PlotViews.
    const groupTitles=['峰位 Vpk','峰电流 Ipk','FWHM','峰高 A','峰面积 S','峰突出度'];
    const groupPlots=groupTitles.map((title,index)=>({id:`res-shadow-group-${index+1}`,title,csv:()=>'',images:true,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',render:host=>{const surface=units.scientificPlot.create(host,{variant:'curve',source:`resonance-unit-shadow:group-${index+1}`,getCurves:emptyCurves,getMarkers:emptyMarkers});plotSurfaces.push(surface);}}));
    const group=units.plotGroup.buildPrime({id:'group-analysis',label:'组图',title:'组图面板',variant:'accepted-scientific',presentationRole:'scientific-secondary',semanticKind:'plot-group',priority:70,collapsible:true,meta:'当前 Vg +20 V · 6 个派生图',density:'regular',group:{columns:3,preferredColumns:3,maxColumns:6,minItemWidth:290,responsive:true},plots:groupPlots,defaultPlacement:'bottom',placements:['float','global','left','right','bottom'],stateVersion:'resonance-unit-shadow-v1',onGroupReady:controller=>{shadowState.groupColumns=controller.getColumnPreference?.()||'auto';command('group-ready','renderGroup',{columns:shadowState.groupColumns});}});

    // SUB pages: physics, spacing, gate-analysis. The workspace remains the sole PRIMARY/PRIME/SUB composer.
    const makeSubShell=(title,id)=>{const shell=units.layout.create(null,{variant:'stack-comfortable'});const head=units.header.create(shell,{kind:'section',variant:'section',title,actions:[{id:`${id}-back`,label:'返回主图',onInvoke:()=>{wb.showPrimary?.();command(`${id}-back`,'renderMain');}}]});return {shell,head};};

    const physics=makeSubShell('物理机制分析','physics');
    const physicsSummary=units.summary.create(physics.shell,{variant:'row'});for(const [label,value] of [['稳定 ridge','2'],['有效分裂 δ','0.18 V'],['模型','sliding-FE']])units.metric.create(physicsSummary.element,{label,value});
    const physicsGrid=units.layout.create(physics.shell,{variant:'responsive-two-column'});
    const physicsPlot=units.panel.create(physicsGrid,{variant:'plot-card',header:false});units.header.create(physicsPlot.element,{kind:'plot',variant:'plot',title:'稳定 ridge：V0 与有效分裂 δ'});const physicsHost=units.layout.create(physicsPlot.element,{variant:'identity'});geom(physicsHost,{minHeight:'260px'});plotSurfaces.push(units.scientificPlot.create(physicsHost,{variant:'curve',source:'resonance-unit-shadow:physics',getCurves:emptyCurves,getMarkers:emptyMarkers}));
    const modelPanel=units.panel.create(physicsGrid,{variant:'plot-card',header:false});units.header.create(modelPanel.element,{kind:'plot',variant:'plot',title:'物理机制判据'});units.note.create(modelPanel.element,{variant:'normal',text:'Shadow 只验证结果表面、布局和 domain action 边界，不复制生产物理判据计算。'});
    tables.push(units.table.mount('res-shadow-physics-table',physics.shell,{variant:'standard',columns:[{id:'vg',label:'Vg'},{id:'v0',label:'V0'},{id:'delta',label:'δ'}],rows:[],persistKey:'res-shadow-physics'}));

    const spacing=makeSubShell('两峰间距分析','spacing');
    const spacingControls=units.layout.create(spacing.shell,{variant:'form-grid'});
    units.field.create(spacingControls,{variant:'select',kind:'select',label:'峰序列 A',options:['峰1','峰2']});
    units.field.create(spacingControls,{variant:'select',kind:'select',label:'峰序列 B',options:['峰2','峰3']});
    units.field.create(spacingControls,{variant:'select',kind:'select',label:'显示',options:['|VB − VA|','VB − VA']});
    units.action.create(spacingControls,{id:'spacing-export',label:'分析数据 CSV',onInvoke:()=>command('spacing-export','renderSpacing',{export:true})});
    const spacingPlot=units.panel.create(spacing.shell,{variant:'plot-card',header:false});units.header.create(spacingPlot.element,{kind:'plot',variant:'plot',title:'峰间距随 Vg 变化'});const spacingHost=units.layout.create(spacingPlot.element,{variant:'identity'});geom(spacingHost,{minHeight:'260px'});plotSurfaces.push(units.scientificPlot.create(spacingHost,{variant:'curve',source:'resonance-unit-shadow:spacing',getCurves:emptyCurves,getMarkers:emptyMarkers}));
    tables.push(units.table.mount('res-shadow-spacing-table',spacing.shell,{variant:'standard',columns:[{id:'vg',label:'Vg'},{id:'a',label:'VA'},{id:'b',label:'VB'},{id:'spacing',label:'ΔV'}],rows:[],persistKey:'res-shadow-spacing'}));

    const gate=makeSubShell('栅压物理分析','gate');
    const gateControls=units.layout.create(gate.shell,{variant:'gate-controls'});
    units.field.create(gateControls,{variant:'select',kind:'select',label:'ridge',options:['自动配对','峰1 ↔ 峰2']});
    units.field.create(gateControls,{variant:'input',label:'载流子密度换算',placeholder:'可选'});
    units.action.create(gateControls,{id:'gate-refresh',label:'重新分析',variant:'primary',onInvoke:()=>command('gate-refresh','renderGate')});
    const gateSummary=units.summary.create(gate.shell,{variant:'row'});for(const [label,value] of [['曲线','2'],['峰','4'],['TERmax','—'],['Vd*','—']])units.metric.create(gateSummary.element,{label,value});
    const gateGrid=units.layout.create(gate.shell,{variant:'responsive-two-column'});
    const gateTitles=['共振 ridge','共振中心 V0','有效分裂 δ','峰宽与 |δ|/w','TERmax','最佳读出偏压 Vd*','正反扫回滞','峰高与有效权重','TERmax vs |δ|/w','Vd* vs V0','局域背景与峰/背景比','载流子浓度依赖（可选）','跨曲线特征场'];
    for(const [index,title] of gateTitles.entries()){
      const card=units.panel.create(gateGrid,{variant:'plot-card',header:false});units.header.create(card.element,{kind:'plot',variant:'plot',title});if(index===12)units.note.create(card.element,{variant:'normal',text:'跨曲线特征场由生产 domain service 计算；Shadow 保持 Core scientific surface。'});const host=units.layout.create(card.element,{variant:'identity'});geom(host,{minHeight:'220px'});plotSurfaces.push(units.scientificPlot.create(host,{variant:'curve',source:`resonance-unit-shadow:gate-${index+1}`,getCurves:emptyCurves,getMarkers:emptyMarkers}));
    }
    units.note.create(gate.shell,{variant:'normal',text:'栅压分析报告占位：验证 report surface、图阵列、表格和 Presenter 投影；不复制生产数值算法。'});
    tables.push(units.table.mount('res-shadow-gate-table',gate.shell,{variant:'standard',columns:[{id:'vg',label:'Vg'},{id:'v0',label:'V0'},{id:'delta',label:'δ'},{id:'width',label:'width'},{id:'ter',label:'TERmax'}],rows:[],persistKey:'res-shadow-gate'}));

    wb.compose({primary:{id:'main',label:'共振分析',scroll:'contained',titlePolicy:'host-only',mainNode:main},primes:[dataControl,inspector,group],subs:[
      {id:'physics',label:'物理机制',presentationRole:'scientific-secondary',semanticKind:'view',priority:60,collapsible:true,existingNode:physics.shell,onShow:()=>command('physics-show','renderPhysics')},
      {id:'spacing',label:'峰间距',presentationRole:'scientific-secondary',semanticKind:'view',priority:50,collapsible:true,existingNode:spacing.shell,onShow:()=>command('spacing-show','renderSpacing')},
      {id:'gate-analysis',label:'栅压分析',presentationRole:'scientific-secondary',semanticKind:'view',priority:40,collapsible:true,existingNode:gate.shell,onShow:()=>command('gate-show','renderGate')}
    ]});

    // Host contributions use semantic Units, never native plugin ids or visual selectors.
    units.status.contribute({id:'resonance-shadow-summary',side:'left',order:1,activity:'unit-resonance-shadow',label:'Resonance Shadow · 2 scans · 4 peaks'});
    units.menu.contribute({id:'resonance-shadow-export',menu:'export',activity:'unit-resonance-shadow',order:80,label:'Resonance Shadow 峰参数 CSV',onClick:()=>command('menu-export','exportPeaks')});
    ctx.status.set('Resonance Unit-only shadow reconstruction 已加载；生产 Resonance 保持原样。');

    return {shadowState,openRangePopover,deactivate(){try{rangePopover?.close?.();}catch{}try{detectorForm?.destroy?.();detectorForm?.dispose?.();}catch{}for(const table of tables)try{table?.dispose?.();}catch{}for(const surface of plotSurfaces)try{surface?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}};
  });
})();
