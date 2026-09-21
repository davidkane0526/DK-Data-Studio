(() => {
  function setId(node,id){if(node)node.id=String(id);return node;}
  function textNode(dom,host,{tag='div',id='',className='',text=''}){
    const node=dom.create(tag);if(id)node.id=id;if(className)node.className=className;node.textContent=String(text);host.appendChild(node);return node;
  }
  function directAction(units,host,{id,label,variant='',className='',title='',nativeSave='',nativeCopy='',onInvoke}){
    const row=units.action.create(host,{id,label,variant:variant||undefined,className,title:title||label,nativeSave:nativeSave||undefined,nativeCopy:nativeCopy||undefined,direct:true,onInvoke});
    return setId(row.button||row.element,id);
  }
  function field(units,host,{id,label,kind='input',inputType='text',options,placeholder,min,max,step,value,title}){
    return units.field.create(host,{variant:'analysis-control',id,label,kind,inputType,options,placeholder,min,max,step,value,attributes:title?{title}:undefined});
  }
  function rangeField(units,dom,host,{label,startId,endId,startMin=0,endMin=1}){
    const wrap=units.layout.create(host,{tagName:'label',variant:'identity'});wrap.append(String(label));
    const inline=units.layout.create(wrap,{variant:'inline-range',className:'pulse-inline-range'});
    units.field.create(inline,{variant:'analysis-control',controlOnly:true,label:false,id:startId,inputType:'number',min:startMin,step:1,placeholder:'自动'});
    inline.appendChild(dom.create('span',{textContent:'–'}));
    units.field.create(inline,{variant:'analysis-control',controlOnly:true,label:false,id:endId,inputType:'number',min:endMin,step:1,placeholder:'自动'});
    return wrap;
  }

  function mount(ctx,page,P){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    if(!units)throw new Error('Pulse Unit presentation requires ui.unit-templates.');

    // Page shell. The accepted Pulse page owns this header; Unit owns its
    // semantics/action geometry while Pulse keeps the accepted text and detail CSS.
    const header=units.pageHeader.create(page,{tagName:'div',variant:'page-owned',activity:'pulse',className:'pulse-page-header',title:'脉冲 / 读取电流分析',close:true,onClose:()=>ctx.workspace.closePage?.('pulseAnalysisPage'),actions:[
      {id:'current',icon:'▶',label:'分析当前',order:10,shortcut:'Ctrl+Enter',onInvoke:()=>P.analyzeCurrent()},
      {id:'checked',icon:'▶▶',label:'分析勾选',className:'primary',variant:'primary',order:20,shortcut:'Ctrl+Shift+Enter',onInvoke:()=>P.analyzeChecked()}
    ]});
    if(header.close)header.close.dataset.analysisTarget='pulseAnalysisPage';
    const pageUnit=units.page.create(page,{tagName:'div',variant:'analysis',className:'pulse-analysis-body'}),body=pageUnit.element;
    body.classList.add('dkds-unified-workbench-body');
    const workspaceHost=dom.create('div');workspaceHost.className='dkds-plugin-workbench-root';body.appendChild(workspaceHost);
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'pulse',primaryScroll:'auto',primaryEndInset:{mode:'content'},leftWidth:390,leftMin:300,leftReserve:640,resizableRight:false,resizableBottom:false});

    // DATA-CONTROL PRIME. It remains permanently titleless/headerless by the
    // shared PRIME contract; accepted Pulse detail geometry stays in plugin CSS.
    const controls=units.layout.create(null,{variant:'identity',className:'pulse-control-rail'});

    const filePanel=units.panel.create(controls,{tagName:'aside',variant:'plain',header:false,className:'pulse-card pulse-file-manager-card dkds-surface'});
    units.header.create(filePanel.element,{tagName:'div',kind:'panel',variant:'panel',className:'pulse-card-heading pulse-file-manager-heading',stacked:true,titleTag:'h3',titleClassName:false,titleWrapperClassName:'dkds-surface-heading-stack',title:'脉冲数据文件',subtitle:'勾选决定是否参与批量分析和叠加比较；点击文件切换当前编辑对象。',actions:false});
    const fileToolbar=units.layout.create(filePanel.element,{variant:'file-toolbar',className:'pulse-file-toolbar dkds-toolbar'});
    directAction(units,fileToolbar,{id:'pulseCheckAllBtn',label:'全选'});
    directAction(units,fileToolbar,{id:'pulseUncheckAllBtn',label:'全不选'});
    directAction(units,fileToolbar,{id:'pulseRemoveFilesBtn',label:'从脉冲分析移除'});
    const fileList=units.list.create(filePanel.element,{tagName:'div',variant:'plain',className:'pulse-file-list'}).element;setId(fileList,'pulseFileList');
    textNode(dom,fileList,{className:'pulse-file-empty',text:'尚未添加脉冲数据文件'});
    const fileSummary=units.note.create(filePanel.element,{tagName:'div',variant:'meta',className:'pulse-file-summary',text:'0 个文件'});setId(fileSummary,'pulseBatchFileSummary');

    const configPanel=units.panel.create(controls,{tagName:'section',variant:'plain',header:false,className:'pulse-card pulse-config-card dkds-surface'});
    units.header.create(configPanel.element,{tagName:'div',kind:'panel',variant:'panel',className:'pulse-card-heading',stacked:true,titleTag:'h3',titleClassName:false,titleWrapperClassName:'dkds-surface-heading-stack',title:'当前文件与提取设置',subtitle:'“自动”会优先使用明确的时间协议；无协议但有电压时使用等点数分段。仅电流数据请填写写入/读取宽度。',actionsTagName:'div',actionsClassName:'pulse-current-file-actions',integratedActions:false});
    const noActive=units.layout.create(configPanel.element,{variant:'identity',className:'pulse-current-empty'});setId(noActive,'pulseNoActiveFile');noActive.textContent='从左侧添加并选择一个文件。';
    const editor=units.layout.create(configPanel.element,{variant:'identity',className:'hidden'});setId(editor,'pulseActiveEditor');
    const activeHead=units.layout.create(editor,{variant:'active-file-head',className:'pulse-active-file-head',responsiveTarget:controls,geometry:{padding:'11px 14px 2px'}});
    const activeIdentity=units.layout.create(activeHead,{variant:'identity'});
    textNode(dom,activeIdentity,{id:'pulseActiveFileName',className:'pulse-active-path',text:'—'});
    textNode(dom,activeIdentity,{id:'pulseActiveFileMeta',className:'pulse-active-meta',text:'—'});
    units.field.create(activeHead,{variant:'analysis-control',className:'pulse-label-edit dkds-field',id:'pulseSeriesLabel',label:'显示标签',inputType:'text',placeholder:'例如 read=0.5 V / Device A'});

    const form=units.layout.create(editor,{variant:'form-grid-2',className:'pulse-control-grid',responsiveTarget:controls,geometry:{padding:'10px 11px 11px'}});
    field(units,form,{id:'pulseSegmentationMode',label:'分段方式',kind:'select',options:[
      {value:'auto',label:'自动（推荐）'},{value:'cycle',label:'按周期点数'},{value:'timing',label:'按时间协议'},{value:'waveform',label:'按记录电压平台'},{value:'equal-count',label:'等点数分段'}
    ]});
    field(units,form,{id:'pulseTimeCol',label:'时间列',kind:'select',options:[]});
    field(units,form,{id:'pulseCurrentCol',label:'电流列',kind:'select',options:[]});
    field(units,form,{id:'pulseVoltageCol',label:'记录电压列',kind:'select',options:[]});
    field(units,form,{id:'pulseCycleSamples',label:'每周期点数',inputType:'number',min:0,step:1,placeholder:'0 = 自动，例如 300'});
    field(units,form,{id:'pulseCycleOffsetSamples',label:'首周期偏移点数',inputType:'number',min:0,step:1,value:0});
    rangeField(units,dom,form,{label:'写入统计区间（点）',startId:'pulseWriteStartSample',endId:'pulseWriteEndSample'});
    rangeField(units,dom,form,{label:'读取统计区间（点）',startId:'pulseReadStartSample',endId:'pulseReadEndSample'});
    field(units,form,{id:'pulseWriteDuration',label:'写入宽度 (s)',inputType:'number',min:0,step:'any',placeholder:'例如 0.1'});
    field(units,form,{id:'pulseReadDuration',label:'读取宽度 (s)',inputType:'number',min:0,step:'any',placeholder:'例如 1'});
    field(units,form,{id:'pulsePhaseOrder',label:'相位顺序',kind:'select',options:[{value:'write-read',label:'写入 → 读取'},{value:'read-write',label:'读取 → 写入'}]});
    field(units,form,{id:'pulseSampleInterval',label:'采样间隔 (s，可选)',inputType:'number',min:0,step:'any',placeholder:'仅无时间列时需要'});
    field(units,form,{id:'pulseReadVoltageFallback',label:'读取电压 (V，可选)',inputType:'number',step:'any',placeholder:'未记录电压时可填写'});
    field(units,form,{id:'pulsePulseVoltageFallback',label:'写入电压 (V，可选)',inputType:'number',step:'any',placeholder:'未知时留空，横轴用序号'});
    field(units,form,{id:'pulseBlockSamples',label:'每个平台点数',inputType:'number',min:0,step:1,value:0,title:'仅等点数分段模式使用；0 = 自动识别'});
    field(units,form,{id:'pulseReadPairMode',label:'读取平台配对',kind:'select',options:[{value:'after',label:'脉冲后的读取平台'},{value:'before',label:'脉冲前的读取平台'}]});
    field(units,form,{id:'pulseWindowStart',label:'稳态窗口起点 (%)',inputType:'number',min:0,max:95,step:1,value:25});
    field(units,form,{id:'pulseWindowEnd',label:'稳态窗口终点 (%)',inputType:'number',min:5,max:100,step:1,value:75});
    const analyzeCell=units.layout.create(form,{variant:'identity',className:'pulse-analyze-cell'});directAction(units,analyzeCell,{id:'pulseApplySettingsBtn',label:'当前设置应用到勾选文件'});

    units.note.create(editor,{variant:'normal',className:'pulse-protocol-hint',html:'周期数据可直接使用“每周期点数”。例如你的 DataDeal 脚本 <code>segs=300</code> 对应每周期 300 点；若只想统计周期内 105–115 点，可把读取统计区间设为 105–115。留空时会结合电压跳变或读写宽度比例自动确定相位。文件名也可携带 <code>t=0.1s read=0.1 1s</code> 等时间协议。'});
    const summary=units.layout.create(editor,{variant:'identity',className:'pulse-summary pulse-summary-grid'});setId(summary,'pulseSummary');
    units.note.create(summary,{tagName:'span',variant:'normal',className:'pulse-summary-placeholder',text:'当前文件尚未分析。'});

    // PRIMARY result composition. Pulse is a sequential scientific content flow:
    // compare -> result plots -> result table -> raw diagnostic. Presenter owns only
    // platform placement; Unit Layout/Panel/PlotView own the content geometry.
    const primaryMain=units.layout.create(null,{variant:'stack-comfortable',className:'pulse-primary-surface',geometry:{width:'100%',minWidth:'0',boxSizing:'border-box',padding:'0 14px 14px'},responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px',padding:'0 8px 8px'}}]});
    const visual=units.layout.create(primaryMain,{variant:'stack-comfortable',className:'pulse-results-visual-pane',responsiveTarget:primaryMain,responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px'}}]});
    const comparePanel=units.panel.create(visual,{tagName:'section',variant:'plain',header:false,className:'pulse-card pulse-compare-toolbar-card dkds-surface'});
    const compareHeader=units.header.create(comparePanel.element,{tagName:'div',kind:'panel',variant:'panel',className:'pulse-card-heading pulse-compare-toolbar',dataset:{dkdsMobileDensity:'compact',dkdsMobileHeaderLayout:'row'},stacked:false,titleTag:'h3',titleClassName:false,title:'结果比较',actionsTagName:'div',actionsClassName:'pulse-compare-actions',integratedActions:false});
    const scopeLabel=units.layout.create(compareHeader.actions,{tagName:'label',variant:'identity',className:'pulse-scope-action'});scopeLabel.appendChild(dom.create('span',{textContent:'显示范围'}));
    units.field.create(scopeLabel,{variant:'select',controlOnly:true,label:false,kind:'select',id:'pulseResultScope',options:[{value:'checked',label:'全部勾选文件'},{value:'active',label:'仅当前文件'}]});
    const compared=units.chip.create(compareHeader.actions,{tagName:'div',variant:'quiet',className:'pulse-compared-summary',text:'0 个已分析文件'});setId(compared,'pulseComparedSummary');
    units.note.create(comparePanel.element,{variant:'normal',className:'pulse-compare-note',text:'有脉冲电压时使用电压横轴；未记录/未指定时自动改用脉冲序号。'});

    const resultGrid=units.layout.create(visual,{variant:'two-card-grid',className:'pulse-results-grid',responsiveTarget:primaryMain,geometry:{gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'14px',width:'100%',minWidth:'0'},responsiveGeometry:[{maxWidth:980,geometry:{gap:'8px'}},{maxWidth:520,geometry:{gridTemplateColumns:'minmax(0,1fr)'}}]});
    const plotViews=[],scientificSurfaces=[];
    function createPlotCard(host,{viewId,plotId,title,raw=false}){
      const panel=units.panel.create(host,{tagName:'section',variant:raw?'plain':'plot-card',header:false,className:`pulse-card ${raw?'pulse-raw-card':'pulse-result-card'} dkds-surface`});
      units.layout.apply(panel.element,{variant:'plot-card-fill',geometry:raw?{minHeight:'320px'}:{height:'360px',minHeight:'320px'}});
      const plotHeader=units.header.create(panel.element,{tagName:'div',kind:'plot',variant:'plot-minimal',className:'pulse-card-heading pulse-plot-heading',titleTag:'h3',titleClassName:'dkds-plot-view-title',title,actionsTagName:'div',actionsClassName:'pulse-plot-actions',integratedActions:false});
      const plot=units.layout.create(panel.element,{variant:'identity',className:`${raw?'pulse-raw-plot':'pulse-result-plot'} pulse-plot-surface`,dataset:{scientificPlot:'true'},geometry:{width:'100%',minWidth:'0',overflow:'hidden'}});setId(plot,plotId);
      const spec={variant:'complete',placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',detailGeometry:{contentMinHeightPx:raw?360:320,contentMaxHeightPx:raw?360:320}};
      const stateVersion=raw?'pulse-raw-flow-v5':'pulse-result-grid-v6';
      const view=units.plotView.adopt(`pulse:${viewId}`,panel.element,{...spec,title,plot,header:plotHeader.element,fileStem:()=>`pulse_${viewId}`,csv:()=>'',images:true,actions:raw?[{id:'fit',label:'适应全部',onInvoke:()=>P.fitRaw()}]:[],stateVersion,portableFactory:(id,node,pSpec)=>workbench?.portable?workbench.portable(id,node,pSpec):ctx.ui.portable.create(id,node,pSpec)});
      const surface=units.scientificPlot.create(plot,{variant:'curve',source:`pulse:${viewId}`,renderOwner:'runtime'});plotViews.push(view);scientificSurfaces.push(surface);
      return {panel:panel.element,header:plotHeader,plot,view,surface};
    }
    const readPlot=createPlotCard(resultGrid,{viewId:'read',plotId:'pulseReadPlot',title:'脉冲条件 → 读取电流'});
    const pulsePlot=createPlotCard(resultGrid,{viewId:'pulse',plotId:'pulsePulsePlot',title:'脉冲条件 → 脉冲电流'});

    // Keep compare, both bounded result cards and their table under one normal-
    // flow owner. A Portable PlotView may change rendering state, but it can no
    // longer make the following table/raw section resolve against a sibling
    // stack that has already collapsed its height.
    const tablePanel=units.panel.create(visual,{tagName:'section',variant:'plain',header:false,sizing:'content',className:'pulse-card pulse-results-table-card dkds-surface'});
    const tableHeader=units.header.create(tablePanel.body,{tagName:'div',kind:'panel',variant:'panel',className:'pulse-card-heading pulse-table-heading',stacked:true,titleTag:'h3',titleClassName:false,titleWrapperClassName:'dkds-surface-heading-stack',title:'批量提取结果',subtitle:'未知电压保持为空；CSV 不会用 0 或其他数值替代未记录电压。',actionsTagName:'div',actionsClassName:'pulse-table-actions',integratedActions:false});
    setId(tableHeader.subtitle,'pulseResultMeta');
    directAction(units,tableHeader.actions,{id:'pulseCopyCsvBtn',label:'复制可见结果',className:'copy-btn',nativeCopy:'clipboard'});
    directAction(units,tableHeader.actions,{id:'pulseExportCsvBtn',label:'导出可见 CSV',nativeSave:'export'});
    const tableWrap=units.layout.create(tablePanel.body,{variant:'scroll-pane',className:'pulse-table-wrap dkds-table-wrap',geometry:{minHeight:'180px',maxHeight:'330px'}});
    const table=dom.create('table');table.id='pulseResultTable';table.className='pulse-result-table dkds-table';tableWrap.appendChild(table);
    const tableEmpty=units.layout.create(tableWrap,{variant:'empty-centered',className:'pulse-results-empty'});setId(tableEmpty,'pulseResultEmpty');units.emptyState.create(tableEmpty,{variant:'standard',text:'暂无可显示的已分析结果'});
    const tableSurface=units.table.bind('pulse-results',table,{variant:'standard',columns:[],rows:[],persistKey:'pulse-results'});

    // Raw diagnostic remains part of the same PRIMARY flow. PlotView itself keeps
    // the canonical home/portable lifecycle, so no extra Workspace PRIME is needed.
    const rawPlot=createPlotCard(visual,{viewId:'raw',plotId:'pulseRawPlot',title:'当前文件 · 原始波形诊断',raw:true});
    const dataControl=units.prime.build({id:'data-control',label:'参数',variant:'fixed-titleless',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:92,collapsible:true,autoOpen:true,existingNode:controls,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'presentation-v1'});

    workbench.compose({primary:{id:'main',label:'脉冲分析',scroll:'auto',titlePolicy:'host-only',mainNode:primaryMain},primes:[dataControl],subs:[]});

    return Object.freeze({page,body,header,workbench,controls,primaryMain,tableSurface,plotViews,scientificSurfaces,rawPlot,readPlot,pulsePlot,dispose(){try{tableSurface?.dispose?.();}catch{}for(const surface of scientificSurfaces)try{surface?.dispose?.();}catch{}for(const view of plotViews)try{view?.dispose?.();}catch{}try{workbench?.dispose?.();}catch{}}});
  }

  window.DKDSPluginModules.define('builtin.pulse-analysis','unit-presentation',Object.freeze({mount}));
})();
