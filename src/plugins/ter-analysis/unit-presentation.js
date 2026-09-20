(() => {
  function setId(node,id){if(node)node.id=String(id);return node;}
  function directAction(units,host,{id,label,variant='',title='',nativeSave='',nativeCopy='',className='',onInvoke}){
    const handle=units.action.create(host,{id,label,variant:variant||undefined,title:title||label,nativeSave:nativeSave||undefined,nativeCopy:nativeCopy||undefined,className,direct:true,onInvoke});
    return setId(handle.button||handle.element,id);
  }
  function mount(ctx,T,handlers={}){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    if(!units)throw new Error('TER Unit presentation requires ui.unit-templates.');
    const page=ctx.ui.pages.add({id:'ter-max',pageId:'terMaxPage',activity:'ter',toolbar:false,label:'TER_max',order:50,html:'',onOpen:()=>handlers.onPageOpen?.()??T.render()});

    // Reproduce the accepted native page hierarchy first. Units own semantics,
    // lifecycle and services; TER keeps its accepted detail geometry.
    const header=units.pageHeader.create(page,{tagName:'div',variant:'page-owned',activity:'ter',title:'TER 热图 / TER_Max 分析',close:true,onClose:()=>ctx.workspace.closePage?.('terMaxPage'),actions:[
      {id:'auto',icon:'↻',label:'自动参数',order:10,onInvoke:()=>T.autoParameters()},
      {id:'calculate',icon:'∑',label:'计算 TER',variant:'primary',className:'primary',order:20,shortcut:'Ctrl+Enter',onInvoke:()=>T.calculate()},
      {id:'layout',icon:'▦',label:'布局',menu:true,order:30,items:()=>[
        {id:'3x3',icon:'▦',label:'3 列 × 3 行（默认）',onInvoke:()=>handlers.setCols?.(3)},
        {id:'4x2',icon:'▦',label:'4 列 × 2 行',onInvoke:()=>handlers.setCols?.(4)},
        {id:'2x4',icon:'▦',label:'2 列 × 4 行',onInvoke:()=>handlers.setCols?.(2)},
        {id:'1x7',icon:'▤',label:'1 列 × 7 行',onInvoke:()=>handlers.setCols?.(1)},
        {id:'7x1',icon:'▥',label:'7 列 × 1 行',onInvoke:()=>handlers.setCols?.(7)}
      ]}
    ]});
    if(header.close)header.close.dataset.analysisTarget='terMaxPage';
    const pageUnit=units.page.create(page,{tagName:'div',variant:'analysis'}),pageBody=pageUnit.element;
    pageBody.classList.add('dkds-unified-workbench-body');
    const workspaceHost=dom.create('div');workspaceHost.className='dkds-plugin-workbench-root';pageBody.appendChild(workspaceHost);
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'ter',primaryScroll:'auto',primaryEndInset:{mode:'content'}});

    // Parameters: exact accepted native content anatomy, deliberately titleless.
    const controls=units.layout.create(null,{variant:'identity',className:'ter-workspace-left'});
    const parameterPanel=units.panel.create(controls,{tagName:'div',variant:'control-card',header:false,className:'ter-controls dkds-surface'});
    const nativeMobile=ctx.runtime?.isNativeClient===true;
    if(nativeMobile)units.layout.apply(parameterPanel.element,{variant:'form-grid-2'});
    for(const [id,label] of [['terVmin','Vds min (V)'],['terVmax','Vds max (V)'],['terVstep','Vds step (V)'],['terTolerance','配对容差 (V)'],['terCurrentFloor','电流下限 (A)']])
      units.field.create(parameterPanel.element,{variant:'analysis-control',id,label,inputType:'number',step:'any',value:id==='terCurrentFloor'?'1e-15':''});
    const algorithmField=units.field.create(parameterPanel.element,{variant:'analysis-control',kind:'select',id:'terAlgorithmSelect',label:'TER 算法',options:[{value:'ter.high-low-ratio@1.0.0',label:'TER 高低电阻比 · ter.high-low-ratio@1.0.0'}]});
    if(nativeMobile)units.layout.apply(algorithmField.element,{variant:'identity',geometry:{gridColumn:'1 / -1'}});
    const recover=directAction(units,parameterPanel.element,{id:'terRecoverAlgorithmBtn',label:'定位/恢复缺失算法'});recover?.classList?.add('hidden');
    const visible=units.check.create(parameterPanel.element,{variant:'analysis-check',className:'inline-check',label:'仅使用正反扫均显示的数据文件',checked:false});setId(visible.input,'terOnlyFullyVisible');
    if(nativeMobile)units.layout.apply(visible.element,{variant:'identity',geometry:{gridColumn:'1 / -1'}});

    units.note.create(controls,{variant:'normal',className:'analysis-note',text:'TER 热图中的每个像素都对应一个实际 (Vd, Vg) 组合：在相同 Vd 下配对正扫/反扫，R=|Vd/I|，TER=(Rhigh−Rlow)/Rlow×100%。TER_Max–Vg 是固定 Vg 后沿 Vd 方向取最大值；TER_Max–Vd 是固定 Vd 后沿 Vg 方向取最大值。'});

    const displayPanel=units.panel.create(controls,{tagName:'div',variant:'control-card',header:false,className:'heatmap-display-controls dkds-surface'});
    units.layout.apply(displayPanel.element,{variant:'form-grid-2',geometry:{padding:'10px 12px'}});
    const displayTitle=dom.create('strong',{text:'热图显示'});displayPanel.element.appendChild(displayTitle);units.layout.apply(displayTitle,{variant:'identity',geometry:{gridColumn:'1 / -1'}});
    units.field.create(displayPanel.element,{kind:'select',id:'terColorScale',label:'色图',value:'Viridis',options:['Viridis','Turbo','Cividis','Jet','Hot']});
    for(const [id,label] of [['terColorMin','色阶最小 (%)'],['terColorMax','色阶最大 (%)'],['terColorTick','色阶刻度 (%)'],['terXTick','Vds 刻度 (V)'],['terYTick','Vg 刻度 (V)']])
      units.field.create(displayPanel.element,{id,label,inputType:'number',step:'any',placeholder:'自动'});
    directAction(units,displayPanel.element,{id:'terApplyDisplayBtn',label:'应用显示'});
    directAction(units,displayPanel.element,{id:'terResetDisplayBtn',label:'自动色阶/刻度'});

    const transformPanel=units.panel.create(controls,{tagName:'div',variant:'control-card',header:false,className:'dkds-surface'});
    transformPanel.element.appendChild(dom.create('strong',{text:'Vg–Vd 数据变换热图'}));
    const transformHost=units.layout.create(transformPanel.element,{variant:'identity'});setId(transformHost,'terTransformSettings');
    const transformForm=units.parameterForm.mount(transformHost,{fields:[
      {id:'type',type:'select',label:'处理量',required:true,default:'didv',options:handlers.transformOptions?.()||[{value:'didv',label:'dI/dV（微分电导）'}]},
      {id:'direction',type:'select',label:'扫描方向',required:true,default:'1',options:[{value:'1',label:'正扫（Vds 递增）'},{value:'-1',label:'反扫（Vds 递减）'}]}
    ]},{compact:true,value:{type:String(T.getTransformSettings?.()?.type||'didv'),direction:String(Number(T.getTransformSettings?.()?.direction)<0?-1:1)},onChange:(next,result)=>{if(result&&!result.ok)return;T.setTransformSettings?.({type:next.type,direction:Number(next.direction)<0?-1:1});handlers.onTransformChange?.();}});

    // Primary content: same native source grouping and classes.
    const primaryMain=dom.create('div');primaryMain.className='ter-primary-surface';
    units.layout.apply(primaryMain,{variant:'identity',geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'}});
    const main=units.layout.create(primaryMain,{variant:'identity',className:'ter-workspace-main'});
    const summary=units.summary.create(main,{variant:'strip',items:[]});setId(summary.element,'terSummary');
    const groupHost=units.layout.create(main,{variant:'identity',className:'ter-chart-grid'});
    const plotGroup=units.plotGroup.create(groupHost,{columns:3,preferredColumns:3,minItemWidth:260,maxColumns:7,responsive:true,density:'comfortable',gapPx:14});
    const plotEntries=new Map(),plotViews=new Map(),scientificSurfaces=[];

    function makePlot({key,plotId,title,accessibleTitle='',kind='curve',heatmap=false,transform=false,meta='',resistance=false,fileBase}){
      const className=resistance?'ter-resistance-card dkds-surface':heatmap?`heatmap-square-card${transform?' ter-transform-heatmap-card':''} dkds-surface`:'dkds-surface';
      const panel=units.panel.detached({tagName:'div',variant:'plot-card',header:false,className}),card=panel.element;
      // Accepted TER source anatomy: feature-runtime resolves the R–V owner by this stable id.
      // Keep the id on the Unit-composed card instead of teaching Core a TER-specific selector.
      if(resistance)setId(card,'terResistanceCard');
      let plotHeader;
      if(resistance){
        plotHeader=units.header.create(card,{tagName:'div',kind:'panel',variant:'panel',className:'ter-resistance-card-header',titleClassName:'ter-card-title-text',titleWrapperClassName:'dkds-plot-view-title',actionsTagName:'div',actionsClassName:'ter-chart-actions',dataset:{dkdsPlotHeader:'true'},title,actions:[{id:'clear-highlight',label:'清除高亮',title:'恢复显示全部栅压曲线',onInvoke:()=>handlers.clearSelection?.()}]});
        if(accessibleTitle&&plotHeader.title)plotHeader.title.title=accessibleTitle;
      }else{
        plotHeader=units.header.create(card,{tagName:'div',kind:'plot',variant:'plot',title});
      }
      if(key==='transform')setId(plotHeader.title,'terTransformHeatmapTitle');
      if(meta){const hint=units.note.create(card,{variant:'meta',className:'ter-resistance-hint',text:meta});if(key==='transform')setId(hint,'terTransformHeatmapMeta');}
      if(resistance){const selection=units.status.create(card,{variant:'text',className:'ter-resistance-selection',text:'尚未选择 TER 数据点。'});setId(selection,'terResistanceSelection');}
      const plot=units.layout.create(card,{variant:'identity',className:`analysis-chart${heatmap?' ter-heatmap-square':''}${transform?' ter-transform-square':''}`});setId(plot,plotId);
      const view=plotGroup.adoptPlot(`ter:${key}`,card,{title,plot,header:plotHeader.element,fileStem:()=>fileBase||key,csv:()=>handlers.exportSpec?.(key)?.csv||'',images:true,...(heatmap?{detailGeometry:{contentAspectRatio:1,contentMinHeightPx:80,contentMaxHeightPx:860}}:{}),placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',stateVersion:'ter-plot-view-v3',portableFactory:(id,node,pSpec)=>workbench?.portable?workbench.portable(id,node,pSpec):ctx.ui.portable.create(id,node,pSpec)});
      const surface=units.scientificPlot.create(plot,{variant:kind,source:`ter:${key}`,renderOwner:'runtime'});
      plotEntries.set(key,{key,card,plot,header:plotHeader.element,title,fileBase:fileBase||key,resistance,view,surface});plotViews.set(key,view);scientificSurfaces.push(surface);return view;
    }
    makePlot({key:'heatmap',plotId:'terHeatmapPlot',title:'TER(Vd, Vg) 全组合热图',kind:'heatmap',heatmap:true,fileBase:'TER_heatmap'});
    makePlot({key:'transform',plotId:'terTransformHeatmapPlot',title:'dI/dV · 正扫',kind:'heatmap',heatmap:true,transform:true,meta:'与 TER 的 Vg/Vd 网格和源文件选择保持一致',fileBase:'TER_transformed_heatmap'});
    makePlot({key:'resistance',plotId:'terResistancePlot',title:'R–V 全 Vg · 正扫 / 反扫',accessibleTitle:'全部 Vg 的电阻–电压（R–V）正扫 / 反扫',resistance:true,meta:'同一 Vg 使用同一颜色：实线为正扫（Vds 递增），虚线为反扫（Vds 递减）。点击 TER_Max / 峰位图的数据点后，其他曲线变淡并在正扫、反扫曲线上分别标出对应位置。',fileBase:'TER_resistance_voltage_all_Vg'});
    makePlot({key:'maxVg',plotId:'terMaxVgPlot',title:'TER_Max–Vg：max over Vd',fileBase:'TER_Max-Vg'});
    makePlot({key:'maxVgArg',plotId:'terMaxVgArgPlot',title:'Vd@TER_Max–Vg',fileBase:'Vd_at_TER_Max-Vg'});
    makePlot({key:'maxVd',plotId:'terMaxVdPlot',title:'TER_Max–Vd：max over Vg',fileBase:'TER_Max-Vd'});
    makePlot({key:'maxVdArg',plotId:'terMaxVdArgPlot',title:'Vg@TER_Max–Vd',fileBase:'Vg_at_TER_Max-Vd'});

    const exportPanel=units.panel.create(primaryMain,{tagName:'div',variant:'control-card',header:false,className:'export-card dkds-surface'});
    exportPanel.element.appendChild(dom.create('strong',{text:'热图/矩阵导出'}));
    directAction(units,exportPanel.element,{id:'terExportLongBtn',label:'TER_long.csv',nativeSave:'export'});
    directAction(units,exportPanel.element,{id:'terCopyLongBtn',label:'复制 long',nativeCopy:'clipboard',className:'copy-btn'});
    directAction(units,exportPanel.element,{id:'terExportMatrixBtn',label:'TER_matrix.csv',nativeSave:'export'});
    directAction(units,exportPanel.element,{id:'terCopyMatrixBtn',label:'复制 matrix',nativeCopy:'clipboard',className:'copy-btn'});

    const vgColumns=[{key:'vg',label:'Vg (V)'},{key:'terMax',label:'TER_Max–Vg (%)'},{key:'vdsAtMax',label:'Vd@max (V)'},{key:'iUp',label:'I_up (A)'},{key:'iDown',label:'I_down (A)'},{key:'rUp',label:'R_up (Ω)'},{key:'rDown',label:'R_down (Ω)'},{key:'mode',label:'方式'}];
    const vdColumns=[{key:'vds',label:'Vd (V)'},{key:'terMax',label:'TER_Max–Vd (%)'},{key:'vgAtMax',label:'Vg@max (V)'},{key:'iUp',label:'I_up (A)'},{key:'iDown',label:'I_down (A)'},{key:'rUp',label:'R_up (Ω)'},{key:'rDown',label:'R_down (Ω)'},{key:'mode',label:'方式'}];
    function resultTable(id,title,columns){
      const section=units.section.create(primaryMain,{variant:'result',title,titleMode:'heading',titleTag:'h3',titleClassName:'analysis-section-title',anatomy:'siblings',bodyClassName:'analysis-table-wrap dkds-table-wrap'});
      const table=dom.create('table');table.id=id;table.className='analysis-table dkds-table';section.body.appendChild(table);
      return units.table.bind(id,table,{variant:'standard',columns,rows:[],persistKey:id});
    }
    const tableVg=resultTable('terMaxVgTable','TER_Max–Vg 数据',vgColumns),tableVd=resultTable('terMaxVdTable','TER_Max–Vd 数据',vdColumns);

    const dataControl=units.prime.build({id:'data-control',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:90,collapsible:true,autoOpen:true,existingNode:controls,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'presentation-v1'});
    workbench.compose({primary:{id:'main',label:'TER 分析',scroll:'auto',titlePolicy:'host-only',mainNode:primaryMain},primes:[dataControl],subs:[]});
    return Object.freeze({page,pageBody,header,workbench,main,controls,plotGroup,plotEntries,plotViews,scientificSurfaces,transformForm,tableVg,tableVd,vgColumns,vdColumns,dispose(){try{transformForm?.destroy?.();transformForm?.dispose?.();}catch{}try{tableVg?.dispose?.();tableVd?.dispose?.();}catch{}for(const surface of scientificSurfaces)try{surface?.dispose?.();}catch{}for(const view of plotViews.values())try{view?.dispose?.();}catch{}try{plotGroup?.dispose?.();}catch{}try{workbench?.dispose?.();}catch{}}});
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','unit-presentation',Object.freeze({mount}));
})();
