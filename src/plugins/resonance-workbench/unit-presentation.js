(() => {
  const setId=(node,id)=>{if(node)node.id=String(id);return node;};
  const text=(dom,tag,value,className='')=>{const node=dom.create(tag,{text:String(value??'')});if(className)node.className=className;return node;};
  const PARAMETER_INLINE_LABEL_LAYOUT=Object.freeze({
    variant:'identity',
    geometry:Object.freeze({display:'grid',gridTemplateColumns:'70px minmax(0,1fr)',alignItems:'center',columnGap:'8px',rowGap:'4px',margin:'7px 0'}),
    responsiveGeometry:Object.freeze([{maxWidth:310,geometry:Object.freeze({gridTemplateColumns:'minmax(0,1fr)',margin:'6px 0'})}])
  });
  const layout=(units,host,{tagName='div',namespace='',variant='identity',className='',id='',dataset,geometry,responsiveGeometry,responsiveTarget}={})=>{const node=units.layout.create(host,{tagName,namespace,variant,className,geometry,responsiveGeometry,responsiveTarget});if(id)setId(node,id);if(dataset)for(const [key,value] of Object.entries(dataset))if(value!==undefined)node.dataset[key]=String(value);return node;};
  const directAction=(units,host,{id,label,className='',variant='',title='',nativeSave='',nativeCopy='',domId=id})=>{
    const row=units.action.create(host,{id,label,className,variant:variant||undefined,title:title||label,nativeSave:nativeSave||undefined,nativeCopy:nativeCopy||undefined,direct:true});
    const button=row.button||row.element;if(domId)setId(button,domId);return button;
  };
  const control=(units,host,{id,kind='input',type='text',className='',value,placeholder,min,max,step,options=[],attributes={}}={})=>{
    const row=units.field.create(host,{variant:kind==='select'?'select':'input',controlOnly:true,kind:kind==='select'?'select':undefined,inputType:type,id,className,value,placeholder,min,max,step,options,attributes});
    return setId(row.control,id);
  };
  const labeledControl=(dom,units,host,{id,label,kind='select',type='text',className='',labelClassName='',layoutSpec=null,value,placeholder,min,max,step,options=[],attributes={}}={})=>{
    const wrapper=layout(units,host,{tagName:'label',className:labelClassName,...(layoutSpec||{})});wrapper.append(String(label||''));
    const ctl=control(units,wrapper,{id,kind,type,className,value,placeholder,min,max,step,options,attributes});return {wrapper,control:ctl};
  };
  const check=(units,host,{id,label,className='',checked=false}={})=>{const row=units.check.create(host,{variant:'analysis-check',className,label,checked});setId(row.input,id);return row;};
  const runtimePlot=(units,node,{variant='curve',source})=>units.scientificPlot.create(node,{variant,source,renderOwner:'runtime'});

  function transformOptions(ctx){
    const rows=ctx?.data?.transforms?.list?.({supportsScalarField:true})?.filter?.(row=>row?.public!==false&&(!row.tags?.length||row.tags.includes('transport')))||[];
    const source=rows.length?rows:[{id:'raw',title:'原始 I–V'},{id:'detrend',title:'去背景 I−Ibg'},{id:'didv',title:'dI/dV'},{id:'d2idv2',title:'d²I/dV²'},{id:'dlog',title:'d ln|I|/dV'},{id:'dvdi',title:'dV/dI'},{id:'resistance',title:'R=|V/I|'}];
    return source.map(row=>({value:String(row.id),label:String(row.title||row.label||row.id)}));
  }

  function buildDataControl(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,nativeMobile=!!ctx.runtime?.host?.profile?.nativeMobile;
    const left=layout(units,null,{className:'respar-left-panel'});

    const dataSection=layout(units,left,{tagName:'section'});
    dataSection.appendChild(text(dom,'h3','数据列表','respar-data-list-title'));
    const scan=layout(units,dataSection,{variant:'action-grid-2',className:'respar-scan-global dkds-mode-group'});scan.setAttribute('role','group');scan.setAttribute('aria-label','扫描可见性模式');
    directAction(units,scan,{id:'reswinShowAll',label:'全部扫描',className:'dkds-action-button'});
    directAction(units,scan,{id:'reswinShowForward',label:'仅正扫',className:'dkds-action-button'});
    directAction(units,scan,{id:'reswinShowReverse',label:'仅反扫',className:'dkds-action-button'});
    directAction(units,scan,{id:'reswinHideAll',label:'全不选',className:'dkds-action-button'});
    const sweep=control(units,dataSection,{id:'reswinSweepSelect',kind:'select',className:'hidden'});sweep.setAttribute('aria-hidden','true');sweep.setAttribute('tabindex','-1');
    const list=units.list.create(dataSection,{variant:'plain',className:'respar-dataset-list'}).element;setId(list,'reswinDatasetList');

    const detector=layout(units,left,{tagName:'section'});detector.appendChild(text(dom,'h3','智能寻峰'));
    const note=units.note.create(detector,{variant:'normal',className:'respar-note',text:'自动融合原始 I–V 与辅助通道；最终峰位始终回到原始采样点。'});setId(note,'reswinDetectorDescription');
    labeledControl(dom,units,detector,{id:'reswinDetectorSelect',label:'寻峰算法',kind:'select',labelClassName:'respar-select-label dkds-field',layoutSpec:nativeMobile?PARAMETER_INLINE_LABEL_LAYOUT:null});
    directAction(units,detector,{id:'reswinRecoverDetector',label:'定位/恢复缺失寻峰算法',className:'wide hidden'});
    labeledControl(dom,units,detector,{id:'reswinMetricAlgorithmSelect',label:'峰宽/基线算法',kind:'select',labelClassName:'respar-select-label dkds-field',layoutSpec:nativeMobile?PARAMETER_INLINE_LABEL_LAYOUT:null});
    directAction(units,detector,{id:'reswinRecoverMetricAlgorithm',label:'定位/恢复缺失峰宽算法',className:'wide hidden'});
    const metricNote=units.note.create(detector,{variant:'normal',className:'respar-note',text:'FWHM、峰高、面积与局部基线由可版本化算法插件计算。'});setId(metricNote,'reswinMetricAlgorithmDescription');
    const presetRow=layout(units,detector,{className:'respar-preset-row'});
    labeledControl(dom,units,presetRow,{id:'reswinPreset',label:'预设',kind:'select',options:[{value:'strict',label:'可靠'},{value:'balanced',label:'平衡'},{value:'sensitive',label:'灵敏'}]});
    const advanced=layout(units,detector,{tagName:'details',className:'respar-advanced'});advanced.dataset.dkdsUnitTemplate='section-v2';advanced.dataset.dkdsUnitVariant='disclosure';advanced.appendChild(text(dom,'summary','高级设置（一般不用改）'));layout(units,advanced,{id:'reswinDetectorParams'});
    const detectActions=layout(units,detector,{variant:'action-grid-2',className:'respar-detect-actions'});
    directAction(units,detectActions,{id:'reswinDetectSelected',label:'当前扫描寻峰',variant:'primary',className:'primary'});
    directAction(units,detectActions,{id:'reswinDetectAll',label:'全部可见寻峰'});
    directAction(units,detector,{id:'reswinSortPeaks',label:'跨 Vg 智能整理峰序',className:'wide'});
    const legend=units.legend.create(detector,{variant:'strip',className:'respar-peak-legend dkds-toolbar dkds-surface-muted'});setId(legend,'reswinPeakLegend');legend.dataset.dkdsLegend='true';

    const display=layout(units,left,{tagName:'section'});
    if(nativeMobile)units.layout.apply(display,{variant:'form-grid-2'});
    const displayTitle=text(dom,'h3','显示');display.appendChild(displayTitle);if(nativeMobile)units.layout.apply(displayTitle,{variant:'identity',geometry:{gridColumn:'1 / -1'}});
    check(units,display,{id:'reswinShowRejected',label:' 显示不采纳峰'});
    check(units,display,{id:'reswinShowWidth',label:' 显示选中峰宽'});
    check(units,display,{id:'reswinShowPoints',label:' 显示峰位点'});
    check(units,display,{id:'reswinPhysicsLabels',label:' 主图标注物理类型'});
    const transform=labeledControl(dom,units,display,{id:'reswinTransform',label:'辅助视图',kind:'select',labelClassName:'respar-select-label dkds-field',layoutSpec:nativeMobile?PARAMETER_INLINE_LABEL_LAYOUT:null,options:transformOptions(ctx)});
    if(nativeMobile)units.layout.apply(transform.wrapper,{variant:'identity',geometry:{gridColumn:'1 / -1'}});

    const manual=layout(units,left,{tagName:'section'});manual.appendChild(text(dom,'h3','手动操作'));
    units.note.create(manual,{variant:'meta',className:'respar-hint',html:'Ctrl / Shift + 左键点击曲线：新增峰<br>Ctrl / Shift + 右键点击峰点：删除峰<br>直接拖框：选择峰并打开区域操作<br>Ctrl + 拖框：框选缩放<br>拖峰点：吸附到当前曲线真实采样点<br>拖分析窗口手柄：调整局部基线 / FWHM 自动计算范围<br>L / Shift+L：锁定 / 解锁所选峰<br>滚轮：围绕鼠标缩放<br>双击主图：恢复全部范围<br>↑/↓：切换曲线；←/→：移动峰'});
    return left;
  }

  function buildMain(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const main=layout(units,null,{tagName:'main',variant:'accepted-main-area',className:'respar-main-area'});
    const workspace=layout(units,main,{variant:'accepted-main-workspace',className:'respar-main-workspace'});
    const wrap=layout(units,workspace,{variant:'accepted-plot-wrap',className:'respar-plot-wrap',id:'resparMainPlotWrap',dataset:{dkdsPlotScope:'true',dkdsSurfaceEdge:'none'}});
    const head=layout(units,wrap,{variant:'accepted-main-header',className:'respar-main-plot-header'});
    const tools=units.floatingChrome.create(head,{variant:'accepted-main',className:'respar-main-tools dkds-toolbar dkds-floating-surface dkds-integrated-action-group'}).element;
    directAction(units,tools,{id:'respar-lock-selected',label:'锁定所选',domId:''}).dataset.resparLock='1';
    directAction(units,tools,{id:'respar-unlock-selected',label:'解锁所选',domId:''}).dataset.resparLock='0';
    directAction(units,tools,{id:'resparSortPeakOrder',label:'智能峰序'});
    directAction(units,tools,{id:'resparTogglePhysics',label:'物理标记'});
    directAction(units,tools,{id:'resparResetView',label:'重新居中'});
    const legend=units.legend.create(head,{variant:'strip',className:'respar-main-legend dkds-scroll-x-compact dkds-legend-strip'});setId(legend,'resparMainLegend');legend.dataset.dkdsLegend='true';
    const svg=layout(units,wrap,{tagName:'svg',namespace:'svg',variant:'accepted-main-plot',className:'respar-main-svg',id:'reswinMainPlot'});runtimePlot(units,svg,{variant:'curve',source:'resonance:main'});
    const range=layout(units,wrap,{className:'respar-range-menu command-menu hidden range-action-menu',id:'resparRangeMenu',dataset:{dkdsMenuBehavior:'rich'}});range.setAttribute('role','dialog');range.setAttribute('aria-label','框选区域操作');
    const rangeSummary=layout(units,range,{className:'respar-range-summary range-action-summary',id:'resparRangeSummary'});rangeSummary.textContent='已框选区域';
    const grid=layout(units,range,{className:'respar-range-grid range-action-grid'});
    directAction(units,grid,{id:'resparRangeDetect',label:'局部寻峰',variant:'primary',className:'dkds-action-button primary'});
    directAction(units,grid,{id:'resparRangeDelete',label:'删除框选峰',variant:'destructive',className:'dkds-action-button danger-soft'});
    directAction(units,grid,{id:'resparRangeLock',label:'锁定框选峰',className:'dkds-action-button'});
    directAction(units,grid,{id:'resparRangeUnlock',label:'解锁框选峰',className:'dkds-action-button'});
    const identity=layout(units,range,{className:'respar-range-identity range-action-identity'});identity.appendChild(text(dom,'div','统一峰序 / 峰标签'));
    control(units,identity,{id:'resparRangeOrder',kind:'select'});control(units,identity,{id:'resparRangeLabel',placeholder:'类别标签，例如 峰3 / AB'});directAction(units,identity,{id:'resparRangeApplyIdentity',label:'应用到框选峰',className:'dkds-action-button'});
    const footer=layout(units,range,{className:'respar-range-footer range-action-footer'});footer.appendChild(text(dom,'span','峰位始终落在原始 I–V 采样点'));directAction(units,footer,{id:'resparRangeClose',label:'关闭',className:'dkds-action-button'});
    const tip=units.note.create(wrap,{variant:'meta',className:'respar-hover-tip dkds-tooltip hidden',text:''});setId(tip,'resparHoverTip');
    const status=units.status.create(main,{variant:'accepted-summary',className:'respar-status-row',dataset:{dkdsInlineSummaryRow:'true'}});const summary=layout(units,status,{variant:'accepted-summary',className:'respar-summary',id:'reswinSummary',dataset:{dkdsInlineSummary:'true'}});
    return main;
  }

  function buildInspector(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const panel=layout(units,null,{className:'respar-floating-panel respar-inspector-panel hidden',id:'resparInspectorPanel'});
    const header=units.header.create(panel,{tagName:'div',kind:'portable',variant:'portable',className:'respar-floating-header dkds-portable-header dkds-surface-header',title:'曲线检查器',actionsTagName:'div',actionsClassName:'dkds-integrated-action-group',integratedActions:false,dataset:{dkdsInspectorHeader:'true'}});
    if(header.title)header.title.className='';
    const close=directAction(units,header.actions,{id:'resparInspectClose',label:'×',className:'respar-panel-close'});close.dataset.resparClose='inspect';close.setAttribute('aria-label','关闭');
    const body=layout(units,panel,{className:'respar-floating-body'});layout(units,body,{className:'respar-inspector-body',id:'reswinInspectorBody'});
    return {panel,header};
  }

  function buildGroup(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const panel=layout(units,null,{className:'respar-floating-panel respar-group-panel hidden',id:'resparGroupPanel'});
    const header=units.header.create(panel,{tagName:'div',kind:'portable',variant:'portable',className:'respar-floating-header dkds-portable-header dkds-surface-header',title:'组图面板',actionsTagName:'div',actionsClassName:'dkds-integrated-action-group',integratedActions:false});if(header.title)header.title.className='';
    const context=dom.create('small',{textContent:''});context.id='reswinGroupContext';context.className='respar-group-context';header.title.appendChild(context);
    const menuHost=layout(units,header.actions,{tagName:'span'});menuHost.dataset.resparGroupColsMenuHost='';
    const collapse=directAction(units,header.actions,{id:'resparGroupCollapse',label:'−'});collapse.dataset.resparCollapse='group';collapse.setAttribute('aria-label','缩小');
    const close=directAction(units,header.actions,{id:'resparGroupClose',label:'×',className:'respar-panel-close'});close.dataset.resparClose='group';close.setAttribute('aria-label','关闭');
    const body=layout(units,panel,{className:'respar-floating-body'});
    const grid=layout(units,body,{variant:'accepted-group-grid',className:'reswin-group-grid',id:'reswinGroupGrid'});
    return {panel,header,grid};
  }

  function derivedHeader(dom,units,host,title){const header=layout(units,host,{className:'respar-derived-header dkds-surface-header'});header.appendChild(text(dom,'h3',title));const back=directAction(units,header,{id:`reswinBack-${title}`,label:'返回主图'});back.dataset.reswinView='main';return header;}
  function plotCard(dom,units,host,{title,id,className='',plotClass='analysis-chart',variant='curve'}={}){const card=units.panel.create(host,{tagName:'div',variant:'plot-card',header:false,className:`${className}`}).element;units.header.create(card,{tagName:'div',kind:'plot',variant:'plot',title});const plot=layout(units,card,{className:plotClass,id});runtimePlot(units,plot,{variant,source:`resonance:${id}`});return {card,plot};}
  function table(dom,units,host,id){const wrap=layout(units,host,{className:'analysis-table-wrap dkds-table-wrap'});const t=dom.create('table');t.id=id;t.className='analysis-table dkds-table';wrap.appendChild(t);let binding=null;try{binding=units.table.bind(`resonance:${id}`,t,{variant:'standard',columns:[],rows:[],persistKey:`resonance:${id}`});}catch{}return {wrap,table:t,binding};}

  function buildPhysics(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,node=layout(units,null,{tagName:'section',className:'respar-derived hidden'});node.dataset.reswinViewPanel='physics';derivedHeader(dom,units,node,'物理机制分析');
    layout(units,node,{className:'reswin-physics-summary',id:'reswinPhysicsSummary'});
    const grid=layout(units,node,{className:'reswin-two-col'});plotCard(dom,units,grid,{title:'稳定 ridge：V0 与有效分裂 δ',id:'reswinPhysicsPlot',plotClass:'analysis-chart reswin-medium-plot'});
    const modelCard=units.panel.create(grid,{tagName:'div',variant:'plot-card',header:false}).element;units.header.create(modelCard,{tagName:'div',kind:'plot',variant:'plot',title:'物理机制判据'});layout(units,modelCard,{className:'reswin-report',id:'reswinPhysicsModel'});
    const t=table(dom,units,node,'reswinPhysicsTable');return {node,tables:[t.binding].filter(Boolean)};
  }
  function buildSpacing(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,node=layout(units,null,{tagName:'section',className:'respar-derived hidden'});node.dataset.reswinViewPanel='spacing';derivedHeader(dom,units,node,'两峰间距分析');
    const controls=layout(units,node,{className:'analysis-control-card reswin-spacing-controls'});
    labeledControl(dom,units,controls,{id:'reswinSpacingA',label:'峰序列 A',kind:'select'});labeledControl(dom,units,controls,{id:'reswinSpacingB',label:'峰序列 B',kind:'select'});labeledControl(dom,units,controls,{id:'reswinSpacingMode',label:'显示',kind:'select',options:[{value:'abs',label:'|VB − VA|'},{value:'signed',label:'VB − VA'}]});directAction(units,controls,{id:'reswinSpacingExport',label:'分析数据 CSV',nativeSave:'export'});
    plotCard(dom,units,node,{title:'峰间距随 Vg 变化',id:'reswinSpacingPlot',plotClass:'analysis-chart reswin-medium-plot'});const t=table(dom,units,node,'reswinSpacingTable');return {node,tables:[t.binding].filter(Boolean)};
  }
  function buildGate(ctx){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,node=layout(units,null,{tagName:'section',className:'respar-derived hidden'});node.dataset.reswinViewPanel='gate';derivedHeader(dom,units,node,'栅压物理分析');
    const controls=layout(units,node,{className:'analysis-control-card reswin-gate-controls dkds-inline-form-row'});
    labeledControl(dom,units,controls,{id:'reswinGateA',label:'ridge A',kind:'select'});labeledControl(dom,units,controls,{id:'reswinGateB',label:'ridge B',kind:'select'});labeledControl(dom,units,controls,{id:'reswinGateHysteresis',label:'回滞峰',kind:'select'});labeledControl(dom,units,controls,{id:'reswinGateWidth',label:'峰宽',kind:'select',options:[{value:'hwhm',label:'HWHM'},{value:'fwhm',label:'FWHM'}]});
    labeledControl(dom,units,controls,{id:'reswinGateFeatureMetric',label:'特征场',kind:'select',options:[{value:'v',label:'峰位 V_R'},{value:'fwhm',label:'FWHM'},{value:'amplitude',label:'峰高'},{value:'prominence',label:'Prominence'},{value:'area',label:'峰面积'},{value:'baseline',label:'局域基线'},{value:'peakToBg',label:'峰/背景比'}]});
    labeledControl(dom,units,controls,{id:'reswinGateFeatureDirection',label:'特征场扫描',kind:'select',options:[{value:'all',label:'正扫 + 反扫'},{value:'forward',label:'仅正扫'},{value:'reverse',label:'仅反扫'}]});
    const density=units.check.create(controls,{variant:'analysis-check',className:'inline-check',label:''});setId(density.input,'reswinGateUseDensity');density.element.append('换算 n',text(dom,'sub','g'));
    labeledControl(dom,units,controls,{id:'reswinGateCg',label:'Cg (F/m²)',kind:'input',type:'number',step:'any'});
    const cnpLabel=layout(units,controls,{tagName:'label'});cnpLabel.append('V',text(dom,'sub','CNP'),' (V)');control(units,cnpLabel,{id:'reswinGateCnp',kind:'input',type:'number',step:'any'});
    directAction(units,controls,{id:'reswinGateRun',label:'刷新分析',variant:'primary',className:'primary'});directAction(units,controls,{id:'reswinGateExportCsv',label:'数据 CSV',nativeSave:'export'});directAction(units,controls,{id:'reswinGateFeatureExport',label:'特征场 CSV',nativeSave:'export'});directAction(units,controls,{id:'reswinGateExportReport',label:'报告',nativeSave:'export'});
    const summary=units.summary.create(node,{variant:'row',className:'reswin-summary'}).element;setId(summary,'reswinGateSummary');
    const grid=layout(units,node,{className:'reswin-gate-grid'});const defs=[['共振 ridge','reswinGateRidges'],['共振中心 V0','reswinGateV0'],['有效分裂 δ','reswinGateDelta'],['峰宽与 |δ|/w','reswinGateWidthPlot'],['TERmax','reswinGateTer'],['最佳读出偏压 Vd*','reswinGateVStar'],['正反扫回滞','reswinGateHysteresisPlot'],['峰高与有效权重','reswinGateAmplitude'],['TERmax vs |δ|/w','reswinGateTerCorrelation'],['Vd* vs V0','reswinGateReadoutCorrelation'],['局域背景与峰/背景比','reswinGateBackground'],['载流子浓度依赖（可选）','reswinGateDensity']];
    for(const [title,id] of defs)plotCard(dom,units,grid,{title,id});
    const feature=units.panel.create(grid,{tagName:'div',variant:'plot-card',header:false,className:'reswin-feature-field-card'}).element;const fh=units.header.create(feature,{tagName:'div',kind:'plot',variant:'plot',title:'跨曲线特征场'});setId(fh.title,'reswinGateFeatureFieldTitle');const meta=units.note.create(feature,{variant:'normal',className:'respar-note dkds-note',text:''});setId(meta,'reswinGateFeatureFieldMeta');const fp=layout(units,feature,{className:'analysis-chart reswin-feature-field-plot',id:'reswinGateFeatureField'});runtimePlot(units,fp,{variant:'scalar-field',source:'resonance:gate-feature-field'});
    layout(units,node,{className:'reswin-report',id:'reswinGateReport'});const t=table(dom,units,node,'reswinGateTable');return {node,tables:[t.binding].filter(Boolean)};
  }

  function mount(ctx,controller,{mode='top'}={}){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates,R=controller.service,isTop=mode==='top'||ctx.runtime.isAuxiliaryWindow,nativeMobile=!!ctx.runtime?.host?.profile?.nativeMobile;
    if(!units)throw new Error('Resonance Unit presentation requires ui.unit-templates.');
    const page=ctx.ui.pages.add({id:'resonance-dedicated',pageId:'resonanceDedicatedPage',activity:'resonance',toolbar:false,label:'共振分析',order:10,html:'',onOpen:()=>controller.render()});
    const header=units.pageHeader.create(page,{tagName:'div',variant:'page-owned',activity:'resonance',title:'共振分析'});header.element.className='analysis-page-header resonance-window-header';header.actions.id='reswinHeaderActions';header.actions.className='respar-header-actions dkds-toolbar';header.actions.setAttribute('aria-label','共振分析命令');
    const pageUnit=units.page.create(page,{tagName:'div',variant:'analysis',className:'resonance-dedicated-body dkds-unified-workbench-body'}),body=pageUnit.element;
    const host=layout(units,body,{className:'dkds-plugin-workbench-root resonance-parity-host'});
    const settingsSurface=ctx.ui.settings?.get?.('defaults')||null,pluginDefaults=settingsSurface?.get?.()||{},allowed=new Set(['float','global','left','right','bottom']);
    const inspectDefault=allowed.has(String(pluginDefaults.inspectPlacement||''))?String(pluginDefaults.inspectPlacement):'right',groupDefault=allowed.has(String(pluginDefaults.groupPlacement||''))?String(pluginDefaults.groupPlacement):'bottom';
    const wb=units.workspace.create(host,{variant:'accepted-scientific',header:false,activity:'resonance',hostMode:isTop?'top':'super',primaryScroll:'contained',leftWidth:280,leftMin:230,canvasLeftWidth:360,canvasRightWidth:390,canvasBottomHeight:360});
    const dataNode=buildDataControl(ctx),mainNode=buildMain(ctx),ins=buildInspector(ctx),grp=buildGroup(ctx),physics=buildPhysics(ctx),spacing=buildSpacing(ctx),gate=buildGate(ctx);const tableBindings=[...physics.tables,...spacing.tables,...gate.tables];
    const dataControl=units.prime.build({id:'data-control',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:100,collapsible:true,autoOpen:true,existingNode:dataNode,defaultPlacement:'left',placements:['left'],stateVersion:'workspace-v4',mount:({container})=>container.classList.remove('hidden'),onPlacementChanged:()=>controller.resize?.()});
    const inspector=units.prime.build({id:'curve-inspector',label:'检查',title:'曲线检查器',variant:'canonical-header',presentationRole:'inspector',semanticKind:'panel',priority:90,collapsible:true,autoOpen:!nativeMobile,existingNode:ins.panel,detailGeometry:{minContentInlinePx:320,minContentBlockPx:220},defaultPlacement:inspectDefault,placements:['float','global','left','right','bottom'],stateVersion:'workspace-v5',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="inspect"]',mount:({container})=>{container.classList.remove('hidden');R.renderInspection?.();},onPlacementChanged:()=>controller.resize?.()});
    const group=units.prime.build({id:'group-analysis',label:'组图',title:'组图面板',variant:'canonical-header',presentationRole:'scientific-secondary',semanticKind:'panel',priority:70,collapsible:true,autoOpen:!nativeMobile,existingNode:grp.panel,detailGeometry:{minContentBlockPx:220},defaultPlacement:groupDefault,placements:['float','global','left','right','bottom'],stateVersion:'workspace-v5',handle:'.respar-floating-header',controlsHost:'.respar-floating-header>div',closeSelector:'[data-respar-close="group"]',collapseSelector:'[data-respar-collapse="group"]',actionHost:'[data-respar-group-cols-menu-host]',actions:[{id:'group-columns',menu:true,order:10,label:()=>`每行：${String(R.getEffectiveGroupColumns?.()||1)}`,title:'设置每行子图数量',items:()=>{const current=String(R.getCurrentGroupColumnPreference?.()||'auto');return ['auto','1','2','3','4','5','6'].map(value=>({id:`group-cols-${value}`,icon:current===value?'✓':'',label:value==='auto'?'自动排列':`每行 ${value} 个子图`,onInvoke:()=>{R.setGroupColumns?.(value);const row=wb.primes?.get?.('group-analysis');row?.actionGroup?.render?.();}}));}}],mount:({container})=>{container.classList.remove('hidden');R.renderGroup?.();},onClose:()=>R.closeGroupViews?.(),onPlacementChanged:()=>controller.resize?.()});
    wb.compose({primary:{id:'main',label:'共振分析',presentationRole:'scientific-primary',semanticKind:'view',priority:100,collapsible:false,scroll:'contained',titlePolicy:'host-only',mainNode},primes:[dataControl,inspector,group],subs:[
      {id:'physics',label:'物理机制',presentationRole:'scientific-secondary',semanticKind:'view',priority:60,collapsible:true,existingNode:physics.node,onShow:({container})=>{container.classList.remove('hidden');R.renderPhysics?.();}},
      {id:'spacing',label:'峰间距',presentationRole:'scientific-secondary',semanticKind:'view',priority:50,collapsible:true,existingNode:spacing.node,onShow:({container})=>{container.classList.remove('hidden');R.renderSpacing?.();}},
      {id:'gate-analysis',label:'栅压分析',presentationRole:'scientific-secondary',semanticKind:'view',priority:40,collapsible:true,existingNode:gate.node,onShow:({container})=>{container.classList.remove('hidden');try{R.renderGate?.();}catch(err){console.error('[Resonance gate view]',err);ctx.status.set(`栅压分析渲染失败：${err?.message||err}`);}}}
    ]});
    return Object.freeze({page,header,body,host,workbench:wb,dataNode,mainNode,inspector:ins.panel,group:grp.panel,settingsSurface,isTop,tableBindings,dispose(){for(const table of tableBindings)try{table?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}});
  }

  window.DKDSPluginModules.define('builtin.resonance-workbench','unit-presentation',Object.freeze({mount}));
})();
