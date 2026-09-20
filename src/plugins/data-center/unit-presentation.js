(() => {
  const setId=(node,id)=>{if(node)node.id=String(id);return node;};
  const setAttrs=(node,attrs={})=>{if(!node)return node;for(const [key,value] of Object.entries(attrs||{})){if(value===undefined||value===null)continue;if(key==='tabIndex')node.tabIndex=Number(value);else if(key==='role')node.setAttribute('role',String(value));else node.setAttribute(key,String(value));}return node;};
  function directAction(units,host,{id,label,variant='',className='',title='',onInvoke}){
    const row=units.action.create(host,{id,label,variant:variant||undefined,className,title:title||label,direct:true,onInvoke});return setId(row.button||row.element,id);
  }
  function control(units,host,{id,kind='input',className='',ariaLabel='',options=[],value,placeholder='',inputType='text'}){
    const row=units.field.create(host,{controlOnly:true,variant:kind==='select'?'select':'input',kind:kind==='select'?'select':'input',id,label:false,className,attributes:ariaLabel?{'aria-label':ariaLabel}:{},options,value,placeholder,inputType});return row.control;
  }
  function mount(ctx,page,controller,handlers={}){
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;if(!units)throw new Error('Data Center Unit presentation requires ui.unit-templates.');
    const disposables=[];
    const header=units.pageHeader.create(page,{variant:'page-owned',className:'data-center-header',activity:'data-center',title:'数据中心',close:true,actions:[
      {id:'refresh',icon:'↻',label:'刷新数据',order:10,onInvoke:()=>handlers.refresh?.()},
      {id:'workflow',icon:'▶',label:'运行工作流',className:'primary',variant:'primary',order:30,shortcut:'Ctrl+Enter',onInvoke:()=>handlers.runWorkflow?.()}
    ]});
    const pageUnit=units.page.create(page,{variant:'data',className:'data-center-body dkds-unified-workbench-body'}),body=pageUnit.element;
    const workspaceHost=units.layout.create(body,{variant:'identity',className:'dkds-plugin-workbench-root'});
    const workbench=units.workspace.create(workspaceHost,{variant:'standard',header:false,navigation:'hidden',activity:'data-center',primaryScroll:'auto',primaryEndInset:{mode:'content'}});

    // DATA-CONTROL PRIME: source-faithful content heading, no PRIME titlebar.
    const objects=units.panel.detached({variant:'plain',header:false,className:'dc-card dc-artifact-pane'});
    const objectHeader=units.header.create(objects.element,{kind:'panel',variant:'panel',className:'dc-section-head',dataset:{dkdsMobileHeaderLayout:'row'},titleTag:'strong',titleClassName:false,titleWrapperClassName:'dkds-surface-heading',title:'数据对象',meta:'0',metaTag:'span',metaClassName:'dkds-meta',integratedActions:false});
    setId(objectHeader.meta,'dcArtifactCount');
    const assignment=control(units,objectHeader.actions,{id:'dcAssignmentFilter',kind:'select',className:'dc-assignment-filter',ariaLabel:'按分析用途筛选',options:[{value:'all',label:'全部用途'}]});assignment.title='按分析用途筛选';
    const filterStack=units.layout.create(objects.element,{variant:'identity',className:'dc-filter-stack'});
    const filters=units.layout.create(filterStack,{variant:'identity',className:'dc-filter-row'});filters.dataset.dkdsMobileWidthCritical='true';
    const lineage=control(units,filters,{id:'dcLineageFilter',kind:'select',ariaLabel:'按数据层级筛选',options:[{value:'all',label:'全部层级'},{value:'raw',label:'原始数据'},{value:'derived',label:'派生数据'}]});lineage.title='按数据层级筛选';
    const fieldFilter=control(units,filters,{id:'dcFieldFilter',kind:'select',className:'dc-field-filter',ariaLabel:'按实际列标题 / 数据字段筛选',options:[{value:'',label:'全部字段'}]});fieldFilter.title='按实际列标题 / 数据字段筛选';
    const selectionActions=units.layout.create(filterStack,{variant:'identity',className:'dc-selection-tools'});selectionActions.dataset.dkdsMobileWidthCritical='true';
    directAction(units,selectionActions,{id:'dcMultiSelectBtn',label:'多选'}).setAttribute('aria-pressed','false');
    directAction(units,selectionActions,{id:'dcSelectAllBtn',label:'全选'});
    directAction(units,selectionActions,{id:'dcInvertSelectionBtn',label:'反选'});
    directAction(units,selectionActions,{id:'dcClearSelectionBtn',label:'清除'});
    const artifactList=units.list.create(objects.element,{variant:'selectable',className:'dc-artifact-list'});setId(artifactList.element,'dcArtifactList');setAttrs(artifactList.element,{tabIndex:0,role:'listbox','aria-label':'数据对象列表'});
    const dataControl=units.prime.build({id:'data-control',label:'数据',variant:'fixed-titleless',presentationRole:'data-control',semanticKind:'panel',priority:94,collapsible:true,fixed:true,header:false,existingNode:objects.element,sizing:'fill',autoOpen:true,defaultPlacement:'left',placements:['left'],stateVersion:'presentation-v1'});

    // PRIMARY: bounded preview + formula/workflow/provenance tool flow.
    const main=units.layout.create(null,{variant:'identity',className:'dc-main',geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%'}});
    const sourcePanel=units.panel.create(main,{variant:'plain',header:false,className:'dc-card dc-source-preview'});
    const sourceHeader=units.header.create(sourcePanel.element,{kind:'panel',variant:'panel',className:'dc-section-head',titleTag:'strong',titleClassName:false,titleWrapperClassName:'dkds-surface-heading',title:'未选择数据',meta:'—',metaTag:'span',metaClassName:'dkds-meta',actionsTagName:'div',actionsClassName:'dc-source-actions',integratedActions:false});
    setId(sourceHeader.title,'dcActiveName');setId(sourceHeader.meta,'dcActiveMeta');
    const tabs=units.tabs.create(sourceHeader.actions,{variant:'standard',className:'dc-tabs',tabsClassName:'dc-tabs',items:[
      {id:'dcFormulaTab',label:'公式',selected:true,dataset:{dcTab:'formula'}},
      {id:'dcWorkflowTab',label:'工作流',dataset:{dcTab:'workflow'}},
      {id:'dcProvenanceTab',label:'来源链',dataset:{dcTab:'provenance'}}
    ]});
    directAction(units,sourceHeader.actions,{id:'dcDataActionsBtn',label:'编辑 ▾'}).disabled=true;
    const previewHost=units.layout.create(sourcePanel.element,{variant:'identity',className:'dc-table-preview'});setId(previewHost,'dcTablePreview');previewHost.dataset.dkdsHorizontalScroll='true';
    const previewTableNode=dom.create('table');previewTableNode.className='dc-preview-table dkds-table';previewHost.appendChild(previewTableNode);
    const previewTable=units.table.bind('data-center-preview',previewTableNode,{variant:'standard',columns:[],rows:[],persist:true,appearance:{density:'compact',stripe:'subtle'},interaction:controller?.interaction});
    const previewNoteRow=units.layout.create(sourcePanel.element,{variant:'row',className:'dc-preview-note-row',geometry:{justifyContent:'flex-end',boxSizing:'border-box',width:'100%',padding:'0 20px 4px 12px'}});
    const previewNote=units.note.create(previewNoteRow,{variant:'meta',className:'hidden',text:''});
    const previewJson=dom.create('pre');previewJson.className='dc-json-preview hidden';sourcePanel.element.appendChild(previewJson);

    const formulaPanel=units.panel.create(main,{variant:'plain',header:false,className:'dc-card dc-tool-pane'});setId(formulaPanel.element,'dcFormulaPane');
    const formulaHeader=units.header.create(formulaPanel.element,{kind:'panel',variant:'panel',className:'dc-tool-title',titleTag:'strong',titleClassName:false,titleWrapperClassName:'dkds-surface-heading',title:'公式 / 派生列',actionsTagName:'div',integratedActions:false});
    directAction(units,formulaHeader.actions,{id:'dcApplyFormula',label:'生成派生列',variant:'primary',className:'primary'});
    const formulaParams=units.layout.create(formulaPanel.element,{variant:'formula-grid',responsiveTarget:formulaPanel.element});setId(formulaParams,'dcFormulaParams');
    const formulaRefs=units.layout.create(formulaPanel.element,{variant:'identity',className:'dc-formula-refs'});setId(formulaRefs,'dcFormulaRefs');

    const workflowPanel=units.panel.create(main,{variant:'plain',header:false,className:'dc-card dc-tool-pane hidden'});setId(workflowPanel.element,'dcWorkflowPane');
    const workflowHeader=units.header.create(workflowPanel.element,{kind:'panel',variant:'panel',className:'dc-tool-title',titleTag:'strong',titleClassName:false,titleWrapperClassName:'dkds-surface-heading',title:'Workflow / Recipe',actionsTagName:'div',integratedActions:false});
    directAction(units,workflowHeader.actions,{id:'dcSaveRecipe',label:'保存 Recipe'});
    const recipeBar=units.layout.create(workflowPanel.element,{variant:'identity',className:'dc-recipe-bar dkds-action-row'});
    const recipeNameLabel=dom.create('label',{text:'名称 '});const recipeName=control(units,recipeNameLabel,{id:'dcRecipeName',value:'我的工作流'});recipeBar.appendChild(recipeNameLabel);
    const savedLabel=dom.create('label',{text:'已保存 '});const savedRecipe=control(units,savedLabel,{id:'dcSavedRecipe',kind:'select',options:[{value:'',label:'—'}]});recipeBar.appendChild(savedLabel);
    directAction(units,recipeBar,{id:'dcLoadRecipe',label:'载入'});
    const addStep=units.layout.create(workflowPanel.element,{variant:'identity',className:'dc-add-step dkds-action-row'});
    control(units,addStep,{id:'dcStepType',kind:'select',options:[{value:'processor',label:'Processor'},{value:'analyzer',label:'Analyzer'}]});
    control(units,addStep,{id:'dcProviderSelect',kind:'select',options:[]});
    directAction(units,addStep,{id:'dcAddStep',label:'添加步骤'});
    const workflowSteps=units.layout.create(workflowPanel.element,{variant:'identity',className:'dc-workflow-steps'});setId(workflowSteps,'dcWorkflowSteps');
    const workflowStatus=units.status.create(workflowPanel.element,{variant:'text',className:'dc-workflow-status',text:'尚未运行。'});setId(workflowStatus,'dcWorkflowStatus');

    const provenancePanel=units.panel.create(main,{variant:'plain',header:false,className:'dc-card dc-tool-pane hidden'});setId(provenancePanel.element,'dcProvenancePane');
    const provenanceHeader=units.header.create(provenancePanel.element,{kind:'panel',variant:'panel',className:'dc-tool-title',titleTag:'strong',titleClassName:false,titleWrapperClassName:'dkds-surface-heading',title:'Provenance',actionsTagName:'div',integratedActions:false});
    const copyProv=directAction(units,provenanceHeader.actions,{id:'dcCopyProvenance',label:'复制 JSON'});copyProv.dataset.dkdsNativeCopy='clipboard';
    const provenanceList=units.layout.create(provenancePanel.element,{variant:'identity',className:'dc-provenance-list'});setId(provenanceList,'dcProvenanceList');

    // SCIENTIFIC-SECONDARY PRIME. PRIME is the only placement owner.
    const chartPanel=units.panel.detached({variant:'plot-card',header:false,className:'dc-card dc-chart-pane'});
    const chartHeader=units.header.create(chartPanel.element,{kind:'plot',variant:'plot',className:'dc-tool-title',titleTag:'strong',titleWrapperClassName:'dkds-surface-heading',title:'通用图形预览',actionsTagName:'div',actionsClassName:'dc-chart-toolbar',integratedActions:false});
    const provider=control(units,chartHeader.actions,{id:'dcChartProvider',kind:'select',className:'dc-chart-provider',ariaLabel:'图形类型',options:[]});
    const plotActions=dom.create('span');setId(plotActions,'dcPlotViewActions');chartHeader.actions.appendChild(plotActions);
    const chartParams=units.layout.create(chartPanel.element,{variant:'identity',className:'dc-chart-params',geometry:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)',justifyContent:'stretch',alignItems:'end',rowGap:'4px',columnGap:'12px',minWidth:'0'}});setId(chartParams,'dcChartParams');
    const chart=units.layout.create(chartPanel.element,{variant:'identity',className:'dc-chart'});setId(chart,'dcChart');chart.dataset.scientificPlot='true';
    const chartView=units.plotView.adopt('data-center:preview',chartPanel.element,{variant:'prime-contained',positionOwner:'prime',title:'通用图形预览',plot:chart,header:chartHeader.element,actionsHost:plotActions,fileStem:()=>handlers.chartFileStem?.()||'data_center_chart',csv:()=>handlers.chartCsv?.()||'',images:true,stateVersion:'data-center-chart-inline-v2'});
    const scientificSurface=units.scientificPlot.create(chart,{variant:'curve',source:'data-center:preview',renderOwner:'runtime'});
    const chartPrime=units.prime.build({id:'chart-preview',label:'图形预览',title:'通用图形预览',variant:'canonical-header',presentationRole:'scientific-secondary',semanticKind:'panel',priority:60,collapsible:true,existingNode:chartPanel.element,inlineHost:main,autoOpen:true,handle:chartHeader.element,controlsHost:plotActions,defaultPlacement:'inline',placements:['inline','right','bottom','float','global'],stateVersion:'data-center-chart-inline-v2',mount:()=>dom.frame(()=>{try{ctx.ui.scientificPlot.resize(chart);}catch{}})});

    workbench.compose({primary:{id:'main',label:'数据中心',presentationRole:'data-primary',scroll:'auto',titlePolicy:'host-only',mainNode:main},primes:[dataControl,chartPrime],subs:[]});

    function clearPreview(){try{previewTable?.table?.replaceChildren?.();previewTable?.refresh?.();}catch{}previewHost.classList.remove('hidden');previewJson.classList.add('hidden');previewJson.textContent='';previewNote.classList.add('hidden');previewNote.textContent='';}
    function showPreviewTable(columns,rows,{note='',selection=null}={}){previewJson.classList.add('hidden');previewHost.classList.remove('hidden');previewTable.updateSpec?.({interaction:controller?.interaction,selection});previewTable.setData?.(columns,rows);previewNote.textContent=String(note||'');previewNote.classList.toggle('hidden',!note);return true;}
    function showPreviewEmpty(message='暂无数据对象'){clearPreview();previewTable?.table?.replaceChildren?.();previewNote.textContent=String(message||'');previewNote.classList.remove('hidden');return true;}
    function showPreviewJson(value){clearPreview();previewHost.classList.add('hidden');previewNote.classList.add('hidden');previewJson.textContent=String(value||'');previewJson.classList.remove('hidden');return true;}
    function renderFormulaRefs(rows=[]){formulaRefs.replaceChildren();for(const row of rows){const key=String(row?.key??row?.id??row??'');if(!key)continue;const chip=units.chip.create(formulaRefs,{variant:'quiet',className:'dc-ref-chip',text:key,interactive:true});chip.dataset.ref=key;}return formulaRefs;}
    function mountParameterForm(host,schema,options){return units.parameterForm.mount(host,schema,options);}

    disposables.push(()=>previewTable?.dispose?.(),()=>chartView?.dispose?.(),()=>scientificSurface?.dispose?.(),()=>workbench?.dispose?.());
    return Object.freeze({page,body,header,workbench,objects,objectHeader,artifactList:artifactList.element,artifactListUnit:artifactList,main,sourcePanel,sourceHeader,tabs,previewHost,previewTable,previewNote,previewJson,formulaPanel:formulaPanel.element,formulaParams,formulaRefs,workflowPanel:workflowPanel.element,workflowSteps,workflowStatus,provenancePanel:provenancePanel.element,provenanceList,chartPanel:chartPanel.element,chartHeader,chartParams,chart,chartView,scientificSurface,provider,showPreviewTable,showPreviewEmpty,showPreviewJson,renderFormulaRefs,mountParameterForm,dispose(){for(const fn of disposables.splice(0).reverse())try{fn?.();}catch{}}});
  }
  window.DKDSPluginModules.define('builtin.data-center','unit-presentation',Object.freeze({mount}));
})();
