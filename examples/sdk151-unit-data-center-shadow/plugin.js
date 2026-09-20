(() => {
  const manifest={"id":"com.example.unit-data-center-shadow","name":"Data Center Unit-only Shadow Reconstruction","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":925,"description":"Parallel, non-production Data Center reconstruction built only from public Unit Templates for seven-layer parity auditing.","requiresCore":["status","services","workspace","parameters","data.artifacts","charts","charts.providers","ui.dom","ui.workspace","ui.plot-views","ui.actions","ui.pages","ui.portable","ui.scientific-plot","ui.table","ui.unit-templates"],"capabilities":["ui.page","ui.plugin-workspace","ui.scientific-plot","ui.table"],"pluginDependencies":[{"id":"builtin.data-center"}],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["data.table","result.analysis"]}};

  DKDSPlugins.define(manifest,async ctx=>{
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    let live=null,liveOff=null;try{live=ctx.services?.domain?.connect?.('builtin.data-center/live')||null;}catch{}
    const shadowState={calls:[],activeTab:'formula',multiSelect:true,selected:new Set(['artifact-a','artifact-b']),workflowSteps:1,liveSnapshot:null,liveParity:null,chartRenderCount:0};
    const record=(intent,nativeMethod,payload={})=>{shadowState.calls.push({intent,nativeMethod,payload});ctx.status.set(`Data Center Unit shadow：${intent} 已映射；生产 Data Center 未被替换。`);return true;};
    const command=(intent,nativeMethod,payload={})=>record(intent,nativeMethod,payload);
    const geom=(target,geometry,responsiveGeometry=[])=>units.layout.apply(target,{variant:'identity',geometry,responsiveGeometry});
    const text=(tag,value)=>dom.create(tag,{text:String(value)});
    const surfaces=[];const tables=[];const forms=[];let formulaForm=null,chartForm=null;const workflowForms=[];

    const page=ctx.ui.pages.add({id:'unit-data-center-shadow',pageId:'unitDataCenterShadowPage',label:'Data Center Unit Shadow',order:925,html:''});
    const pageUnit=units.page.create(page,{variant:'data'}),body=pageUnit.element;
    units.pageHeader.create(body,{variant:'page-owned',title:'数据中心 · Unit Shadow',subtitle:'41-Unit 非 scientific-first 压力测试；生产 Data Center 保持冻结。',actions:[
      {id:'refresh',icon:'↻',label:'刷新数据',onInvoke:()=>live?invokeLive('refresh'):command('refresh','renderAllUi')},
      {id:'run',icon:'▶',label:'运行工作流',className:'primary',variant:'primary',shortcut:'Ctrl+Enter',onInvoke:()=>live?invokeLive('runWorkflow'):command('run-workflow','runWorkflow')}
    ]});

    const workspaceHost=units.layout.create(body,{variant:'stack'});
    const wb=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'unit-data-center-shadow',primaryScroll:'auto'});

    // DATA-CONTROL PRIME — artifact browser, filters and multi-selection.
    const objects=units.panel.detached({variant:'plain',header:false});
    const objectHeader=units.header.create(objects.element,{kind:'panel',variant:'panel',title:'数据对象',meta:'3 个',actionHost:true});
    const assignment=units.field.create(objectHeader.actionHost,{variant:'select',kind:'select',label:false,attributes:{'aria-label':'按分析用途筛选'},options:[{value:'all',label:'全部用途'},{value:'resonance',label:'共振分析'},{value:'none',label:'仅数据中心'}],value:'all',onChange:event=>live?invokeLive('setFilters',{assignment:event.target.value}):command('assignment','setArtifactAssignments',{value:event.target.value})});
    geom(assignment.control,{width:'132px'});
    const filterStack=units.layout.create(objects.element,{variant:'identity',geometry:{display:'grid',gap:'7px',padding:'8px 9px 9px',minWidth:'0'}});
    const filters=units.layout.create(filterStack,{variant:'identity',geometry:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:'6px',minWidth:'0'}});
    const lineage=units.field.create(filters,{variant:'select',kind:'select',label:false,attributes:{'aria-label':'按数据层级筛选'},options:[{value:'all',label:'全部层级'},{value:'raw',label:'原始数据'},{value:'derived',label:'派生数据'}],onChange:event=>live?invokeLive('setFilters',{lineage:event.target.value}):command('lineage-filter','renderAllUi',{value:event.target.value})});
    const fieldFilter=units.field.create(filters,{variant:'integrated',kind:'select',label:false,attributes:{'aria-label':'按数据字段筛选'},options:[{value:'',label:'全部字段'},{value:'Vd',label:'Vd'},{value:'Id',label:'Id'},{value:'Vg',label:'Vg'}],onChange:event=>live?invokeLive('setFilters',{field:event.target.value}):command('field-filter','renderAllUi',{value:event.target.value})});
    const selectionActions=units.layout.create(filterStack,{variant:'identity',geometry:{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'5px',minWidth:'0'}});
    const multi=units.action.create(selectionActions,{id:'multi',label:'多选',variant:'selected',onInvoke:()=>{shadowState.multiSelect=!shadowState.multiSelect;return live?invokeLive('setMultiSelect',{value:shadowState.multiSelect}):command('multi-select','renderArtifacts',{value:shadowState.multiSelect});}});
    units.action.create(selectionActions,{id:'all',label:'全选',onInvoke:()=>live?invokeLive('selectAll'):command('select-all','selectAllVisibleArtifacts')});
    units.action.create(selectionActions,{id:'invert',label:'反选',onInvoke:()=>live?invokeLive('invertSelection'):command('invert','invertVisibleArtifactSelection')});
    units.action.create(selectionActions,{id:'clear',label:'清除',onInvoke:()=>live?invokeLive('clearSelection'):command('clear','clearVisibleArtifactSelection')});
    units.state.set(multi,'pressed',true,{unit:'action'});
    const artifactListGeometry=units.layout.create(objects.element,{variant:'artifact-list'});
    const artifactList=units.list.create(artifactListGeometry,{variant:'selectable'});
    const sampleArtifacts=[
      {id:'artifact-a',name:'device83 · sweep',kind:'data.table',meta:'401 行 · 4 列 · provenance 1 · 用途 共振分析',checked:true},
      {id:'artifact-b',name:'device83 · derived resistance',kind:'data.table',meta:'401 行 · 5 列 · provenance 2',checked:true},
      {id:'artifact-c',name:'summary result',kind:'result.analysis',meta:'1 table · provenance 3',checked:false}
    ];
    function renderArtifactRows(rows=sampleArtifacts,selectionIds=new Set()){
      artifactList.element.replaceChildren?.();
      for(const row of rows){
        const content=units.layout.create(null,{variant:'artifact-row-selectable'}),checked=selectionIds.has(String(row.id))||row.checked===true;
        units.check.create(content,{variant:'checkbox',label:'',checked,onChange:event=>live?invokeLive('toggleArtifactSelection',{id:row.id,checked:event.target.checked}):command('artifact-check','renderArtifacts',{id:row.id,checked:event.target.checked})});
        const copy=units.layout.create(content,{variant:'stack-compact'});copy.append(text('strong',row.name));const meta=row.meta||`${row.kind}${row.rowCount?` · ${row.rowCount} 行`:''}${row.provenanceCount!==undefined?` · provenance ${row.provenanceCount}`:''}${row.usage?` · 用途 ${row.usage}`:''}`;units.note.create(copy,{variant:'meta',text:meta});
        const item=units.list.item(artifactList.element,{tagName:'div',selectable:true,selected:selectionIds.has(String(row.id)),content,onInvoke:()=>live?invokeLive('activateArtifact',{id:row.id}):command('artifact-activate','renderAllUi',{id:row.id})});item.setAttribute('role','option');
      }
    }
    renderArtifactRows();
    const dataControl=units.prime.build({id:'data-control',label:'数据',title:'数据对象',variant:'canonical-header',presentationRole:'data-control',semanticKind:'panel',priority:94,collapsible:true,autoOpen:true,existingNode:objects.element,handle:objectHeader.element,controlsHost:objectHeader.actions,content:objects.element,defaultPlacement:'left',placements:['left','global','right','bottom'],stateVersion:'data-center-unit-shadow-v1'});

    // DATA PRIMARY — bounded table preview plus tool tabs.
    const main=units.layout.create(null,{variant:'primary-flow',responsiveTarget:body,geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'}});
    const sourcePanel=units.panel.create(main,{variant:'headed',title:'device83 · sweep',meta:'data.table · artifact-a'});units.layout.apply(sourcePanel.element,{variant:'identity',geometry:{gridArea:'source',gridColumn:'1 / -1'}});
    const tabs=units.tabs.create(sourcePanel.header.actions,{variant:'standard',items:[
      {id:'formula',label:'公式',selected:true,onClick:()=>switchTool('formula')},
      {id:'workflow',label:'工作流',onClick:()=>switchTool('workflow')},
      {id:'provenance',label:'来源链',onClick:()=>switchTool('provenance')}
    ]});
    units.action.create(sourcePanel.header.actions,{id:'edit',label:'编辑 ▾',onInvoke:()=>openDataMenu()});
    const preview=units.layout.create(sourcePanel.body,{variant:'scroll-pane',geometry:{maxHeight:'250px'}});
    const previewRows=Array.from({length:18},(_,i)=>({index:i+1,Vd:(-0.85+i*0.1).toFixed(2),Id:(1e-8*(i+1)).toExponential(3),Vg:20}));
    const previewTableNode=dom.create('table',{className:'dkds-table'});preview.appendChild(previewTableNode);const previewTable=units.table.bind('data-center-shadow-preview',previewTableNode,{variant:'standard',persistKey:'data-center-shadow-preview'});previewTable.setData?.([{id:'index',label:'#'},{id:'Vd',label:'Vd (V)'},{id:'Id',label:'Id (A)'},{id:'Vg',label:'Vg (V)'}],previewRows);tables.push(previewTable);
    const previewNote=units.note.create(sourcePanel.body,{variant:'meta',text:'预览前 18 / 12800 行 · bounded row window'});

    const formulaPanel=units.panel.create(main,{variant:'headed',title:'公式 / 派生列',actions:[{id:'derive',label:'生成派生列',variant:'primary',onInvoke:()=>live?invokeLive('deriveFormula',{artifactId:shadowState.liveSnapshot?.active?.id||'',parameters:formulaForm?.getValue?.()||shadowState.liveSnapshot?.formula?.value||{}}):command('formula','renderFormula')} ]});
    units.layout.apply(formulaPanel.element,{variant:'identity',geometry:{gridArea:'tool'}});
    const formulaFormHost=units.layout.create(formulaPanel.body,{variant:'formula-grid'});
    try{formulaForm=units.parameterForm.mount(formulaFormHost,{fields:[
      {id:'name',type:'text',label:'新列名称',default:'Derived'},
      {id:'formula',type:'formula',label:'公式',default:'abs(Vd / Id)'},
      {id:'unit',type:'text',label:'单位',default:''},
      {id:'role',type:'select',label:'角色',default:'derived',options:[{value:'derived',label:'派生量'},{value:'x',label:'X'},{value:'y',label:'Y'},{value:'group',label:'分组'},{value:'',label:'未指定'}]},
      {id:'replace',type:'checkbox',label:'同名列存在时替换',default:false}
    ]},{compact:true,layoutOwner:'host',value:{name:'Derived',formula:'abs(Vd / Id)',unit:'',role:'derived',replace:false},onChange:value=>live?invokeLive('setFormulaParameters',{value}):command('formula-change','renderFormula',value)});forms.push(formulaForm);}catch(error){units.note.create(formulaFormHost,{variant:'warning',text:`参数表单运行时不可用：${error.message}`});}
    const refs=units.layout.create(formulaPanel.body,{variant:'wrap-strip'});
    function renderFormulaRefs(keys=['Vd','Id','Vg']){refs.replaceChildren?.();for(const key of keys){const ref=units.chip.create(refs,{variant:'quiet',text:key,interactive:true,onInvoke:()=>command('formula-ref','renderFormula',{key})});geom(ref,{padding:'3px 6px'});}}
    renderFormulaRefs();

    const workflowPanel=units.panel.create(main,{variant:'headed',title:'Workflow / Recipe',actions:[{id:'save',label:'保存 Recipe',onInvoke:()=>live?invokeLive('saveRecipe'):command('save-recipe','saveRecipe')} ]});
    units.layout.apply(workflowPanel.element,{variant:'identity',geometry:{gridArea:'tool'}});
    const recipeBar=units.layout.create(workflowPanel.body,{variant:'toolbar-bottom'});
    const recipeName=units.field.create(recipeBar,{variant:'input',label:'名称',value:'我的工作流',onChange:event=>live?invokeLive('setRecipeName',{value:event.target.value}):command('recipe-name','saveRecipe',{value:event.target.value})});
    const savedRecipe=units.field.create(recipeBar,{variant:'select',kind:'select',label:'已保存',options:[{value:'',label:'—'}],onChange:event=>{savedRecipe.control.value=event.target.value;}});
    units.action.create(recipeBar,{id:'load',label:'载入',onInvoke:()=>live?invokeLive('loadRecipe',{value:savedRecipe.control.value}):command('load-recipe','loadRecipe')});
    const addStepBar=units.layout.create(workflowPanel.body,{variant:'toolbar-bottom'});
    const stepType=units.field.create(addStepBar,{variant:'select',kind:'select',label:false,attributes:{'aria-label':'步骤类型'},options:[{value:'processor',label:'Processor'},{value:'analyzer',label:'Analyzer'}],onChange:()=>renderWorkflowProviderOptions(shadowState.liveSnapshot?.workflow)});
    const stepProvider=units.field.create(addStepBar,{variant:'select',kind:'select',label:false,attributes:{'aria-label':'Provider'},options:[]});
    units.action.create(addStepBar,{id:'add-step',label:'添加步骤',onInvoke:()=>live?invokeLive('addStep',{type:stepType.control.value,provider:stepProvider.control.value}):command('add-step','addStep')});
    const workflowList=units.list.create(workflowPanel.body,{variant:'plain'});
    const workflowStatus=units.status.create(workflowPanel.body,{variant:'text',text:'尚未运行。'});
    function setSelectOptions(control,rows,value=''){if(!control)return;const options=(rows||[]).map(row=>{const option=dom.create('option',{text:String(row.label??row.name??row.id??row.value??'')});option.value=String(row.value??row.id??'');return option;});control.replaceChildren?.(...options);control.value=String(value??'');}
    function renderWorkflowProviderOptions(workflow=shadowState.liveSnapshot?.workflow){const rows=String(stepType.control.value||'processor')==='analyzer'?workflow?.providerOptions?.analyzers:workflow?.providerOptions?.processors;setSelectOptions(stepProvider.control,rows||[],stepProvider.control.value||rows?.[0]?.id||'');}
    function renderWorkflowSteps(rows=[]){for(const form of workflowForms.splice(0))try{form?.destroy?.();form?.dispose?.();}catch{}workflowList.element.replaceChildren?.();for(const [index,step] of rows.entries()){const stepCard=units.panel.detached({variant:'plain',header:false});const stepHead=units.layout.create(stepCard.element,{variant:'workflow-step-head'});stepHead.append(text('strong',`${index+1}. ${step.providerName||step.provider} · ${step.type}`));units.toolbar.create(stepHead,{variant:'header',actions:[{id:`up-${index}`,label:'↑',onInvoke:()=>live?invokeLive('moveStep',{index,direction:-1}):command('step-up','renderSteps')},{id:`down-${index}`,label:'↓',onInvoke:()=>live?invokeLive('moveStep',{index,direction:1}):command('step-down','renderSteps')},{id:`remove-${index}`,label:'删除',variant:'destructive',onInvoke:()=>live?invokeLive('removeStep',{index}):command('step-remove','renderSteps')} ]});const stepParams=units.section.create(stepCard.element,{variant:'controls'});try{const form=units.parameterForm.mount(stepParams.body,step.parameterSchema||{fields:[]},{compact:true,value:step.parameters||{},onChange:value=>live?invokeLive('setStepParameters',{index,value}):command('step-parameters','renderSteps',value)});workflowForms.push(form);forms.push(form);}catch(error){units.note.create(stepParams.body,{variant:'warning',text:error.message});}units.list.item(workflowList.element,{tagName:'div',content:stepCard.element});}if(!rows.length)units.note.create(workflowList.element,{variant:'meta',text:'尚无步骤。选择 Processor / Analyzer 后点击“添加步骤”。'});}
    renderWorkflowSteps([{id:'sample',type:'processor',provider:'table.finite-rows',providerName:'有限值筛选',parameters:{columns:['Vd','Id'],mode:'all'},parameterSchema:{fields:[{id:'columns',type:'text',label:'检查列',default:'Vd, Id'},{id:'mode',type:'select',label:'保留条件',default:'all',options:[{value:'all',label:'全部有限'}]}]}}]);

    const provenancePanel=units.panel.create(main,{variant:'headed',title:'Provenance',actions:[{id:'copy',label:'复制 JSON',onInvoke:()=>live?invokeLive('copyProvenance'):command('copy-provenance','renderProvenance')} ]});
    units.layout.apply(provenancePanel.element,{variant:'identity',geometry:{gridArea:'tool'}});
    const provenanceList=units.layout.create(provenancePanel.body,{variant:'provenance-list'});
    function renderProvenanceRows(rows=[]){provenanceList.replaceChildren?.();if(!rows.length){units.note.create(provenanceList,{variant:'meta',text:'暂无 provenance。'});return;}for(const row of rows.slice().reverse()){const line=units.layout.create(provenanceList,{variant:'provenance-row'});units.note.create(line,{variant:'meta',text:row.timestamp||'—'});const detail=units.list.create(line,{variant:'plain'}),meta=[row.pluginId,row.providerId,row.version].filter(Boolean).join(' · ');units.list.item(detail.element,{tagName:'div',content:[text('strong',row.label||row.type||''),text('div',meta),text('div',JSON.stringify(row.parameters||{})),...(row.note?[text('div',row.note)]:[])]});}}
    renderProvenanceRows([{timestamp:'2026-09-12 14:02',label:'Import',pluginId:'builtin.flexible-import',providerId:'csv'}]);
    units.state.set(workflowPanel,'visible',false);units.state.set(provenancePanel,'visible',false);

    function showTool(name){shadowState.activeTab=name;units.state.set(formulaPanel,'visible',name==='formula');units.state.set(workflowPanel,'visible',name==='workflow');units.state.set(provenancePanel,'visible',name==='provenance');for(const button of tabs.tabs?.querySelectorAll?.('[role=tab]')||[]){const selected=String(button.textContent||'').trim()===({formula:'公式',workflow:'工作流',provenance:'来源链'}[name]||'');units.state.set(button,'selected',selected,{unit:'tabs'});}}
    function switchTool(name){showTool(name);return live?invokeLive('switchTab',{tab:name}):command('switch-tab','switchTab',{name});}
    function openDataMenu(){const active=shadowState.liveSnapshot?.active||null,targets=shadowState.liveSnapshot?.filterOptions?.assignmentTargets||[];return units.menu.open({id:'data-center-shadow-context',variant:'context',items:[
      {id:'rename',label:'修改标签',enabled:!!active,onInvoke:async()=>{const value=await Promise.resolve(units.dialog.prompt({title:'修改数据标签',inputLabel:'数据标签',value:String(active?.name||''),confirmLabel:'保存'}));if(value===null||value===undefined)return false;return live?invokeLive('renameArtifact',{id:active?.id,name:value}):command('rename','renameArtifact',{name:value});}},
      {id:'exclude',label:active?.excluded?'恢复参与分析':'排除',enabled:!!active,onInvoke:()=>live?invokeLive('setArtifactsExcluded',{ids:[active?.id],value:!active?.excluded}):command('exclude','setArtifactsExcluded',{value:!active?.excluded})},
      ...targets.map(target=>{const assigned=Array.isArray(active?.assignments)&&(active.assignments.includes('*')||active.assignments.includes(target.id));return {id:`assignment:${target.id}`,label:`${assigned?'✓':'○'} ${target.label}`,onInvoke:()=>live?invokeLive('toggleAssignmentForArtifacts',{ids:[active?.id],targetId:target.id}):command('toggle-assignment','toggleAssignmentForArtifacts',{targetId:target.id})};}),
      {type:'separator'},
      {id:'delete',label:'删除',variant:'destructive',enabled:!!active,onInvoke:async()=>{const confirmed=await Promise.resolve(units.dialog.confirm({title:'删除数据对象',message:'删除当前数据对象？派生后代也会一并删除。',confirmLabel:'删除',destructive:true}));if(confirmed===false)return false;return live?invokeLive('deleteArtifacts',{ids:[active?.id],confirm:false}):command('delete','deleteArtifacts');}}
    ]});}

    // SCIENTIFIC-SECONDARY PRIME — outer PRIME owns movement; inner PlotView owns title/export only.
    const chartPanel=units.panel.detached({variant:'plot-card',header:false});units.layout.apply(chartPanel.element,{variant:'identity',geometry:{gridArea:'chart'}});
    const chartHeader=units.header.create(chartPanel.element,{kind:'plot',variant:'plot',title:'通用图形预览',actionHost:true});
    const provider=units.field.create(chartHeader.actionHost,{variant:'integrated',layout:'integrated',kind:'select',label:false,attributes:{'aria-label':'图形类型'},options:[{value:'xy-line',label:'XY 多序列图'}],onChange:event=>live?invokeLive('setChartProvider',{value:event.target.value}):command('chart-provider','renderChartControls',{value:event.target.value})});
    geom(provider.control,{flex:'0 1 180px'});
    const chartParams=units.layout.create(chartPanel.element,{variant:'identity',geometry:{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(72px,.55fr)',justifyContent:'stretch',alignItems:'end',rowGap:'4px',columnGap:'12px',minWidth:'0'}});
    try{chartForm=units.parameterForm.mount(chartParams,{fields:[
      {id:'x',type:'select',label:'X',default:'Vd',options:[{value:'Vd',label:'Vd'}]},
      {id:'ys',type:'select',label:'Y',default:'Id',options:[{value:'Id',label:'Id'}]},
      {id:'mode',type:'select',label:'模式',default:'lines',options:[{value:'lines',label:'线'}]},
      {id:'showLegend',type:'checkbox',label:'图例',default:true}
    ]},{compact:true,autoFit:true,layoutOwner:'host',value:{x:'Vd',ys:['Id'],mode:'lines+markers',showLegend:true},onChange:value=>live?invokeLive('setChartParameters',{value}):command('chart-parameters','renderChartParams',value)});forms.push(chartForm);}catch(error){units.note.create(chartParams,{variant:'warning',text:error.message});}
    const chart=units.layout.create(chartPanel.element,{variant:'identity',geometry:{height:'clamp(180px,42dvh,340px)',minHeight:'180px',overflow:'hidden'}});
    const chartView=units.plotView.adopt('data-center-shadow-preview-plot',chartPanel.element,{variant:'prime-contained',positionOwner:'prime',title:'通用图形预览',plot:chart,header:chartHeader.element,actionsHost:chartHeader.actions,fileStem:()=> 'data_center_shadow_chart',csv:()=> 'Vd,Id\n',images:true,stateVersion:'data-center-unit-shadow-v1'});
    surfaces.push(units.scientificPlot.create(chart,{variant:'curve',source:'data-center-unit-shadow:preview',renderOwner:'runtime'}));
    const chartPrime=units.prime.build({id:'chart-preview',label:'图形预览',title:'通用图形预览',variant:'canonical-header',presentationRole:'scientific-secondary',semanticKind:'panel',priority:60,collapsible:true,existingNode:chartPanel.element,handle:chartHeader.element,controlsHost:chartHeader.actions,content:chartPanel.element,defaultPlacement:'inline',placements:['inline','right','bottom','float','global'],stateVersion:'data-center-unit-shadow-v1',mount:()=>live?renderLiveChart(shadowState.liveSnapshot):command('chart-mount','renderChart')});

    async function renderLiveChart(snap=shadowState.liveSnapshot){if(!live||!snap?.chart)return false;const providerRow=ctx.charts?.list?.().find?.(row=>String(row.id)===String(snap.chart.provider||'')),artifactId=String(snap.chart.artifactId||snap.active?.id||''),artifact=ctx.data?.artifacts?.get?.(artifactId)||null;if(!providerRow||!artifact||artifact.kind!=='data.table'){chart.replaceChildren?.();units.note.create(chart,{variant:'meta',text:'选择 DataTable 后可配置图形。'});return false;}await Promise.resolve(providerRow.render({container:chart,artifact,parameters:snap.chart.parameters||{},context:{sideBySide:true,source:'data-center-unit-shadow'}}));shadowState.chartRenderCount+=1;return true;}
    function updateLiveFilters(snap){if(objectHeader.meta)objectHeader.meta.textContent=`${Array.isArray(snap.artifacts)?snap.artifacts.length:0} 个`;const assignmentRows=[{value:'all',label:'全部用途'},{value:'unassigned',label:'仅数据中心'},...(snap.filterOptions?.assignmentTargets||[]).map(row=>({value:row.id,label:`${row.icon?`${row.icon} `:''}${row.label}`}))];setSelectOptions(assignment.control,assignmentRows,snap.filters?.assignment||'all');lineage.control.value=String(snap.filters?.lineage||'all');const fields=[{value:'',label:'全部字段'},...(snap.filterOptions?.fields||[]).map(row=>({value:row.field,label:`${row.field}${row.count>1?` · ${row.count}`:''}`}))];setSelectOptions(fieldFilter.control,fields,snap.filters?.field||'');}
    function updateLivePrimary(snap){const active=snap.active||null,table=active?.preview||null;if(sourcePanel.header?.title)sourcePanel.header.title.textContent=active?.name||'未选择数据';if(sourcePanel.header?.meta)sourcePanel.header.meta.textContent=active?`${active.kind} · ${active.id}`:'—';if(table&&Array.isArray(table.columns)&&Array.isArray(table.rows)){const columns=[{id:'__index',label:'#'},...table.columns.map(row=>({id:String(row.id),label:`${row.name}${row.unit?` (${row.unit})`:''}`}))];previewTable.setData?.(columns,table.rows);previewNote.textContent=table.totalRows>table.rows.length?`预览前 ${table.rows.length} / ${table.totalRows} 行`:`${table.rows.length} 行`;}else{previewTable.setData?.([],[]);previewNote.textContent=active?'当前对象没有表格预览。':'暂无数据对象';}}
    function updateLiveFormula(snap){renderFormulaRefs(snap.formula?.refs||[]);if(formulaForm&&snap.formula?.value)formulaForm.setValue?.(snap.formula.value);}
    function updateLiveWorkflow(snap){recipeName.control.value=String(snap.workflow?.recipeName||'我的工作流');const saved=[{value:'',label:'—'},...(snap.workflow?.savedRecipes||[]).map(row=>({value:`saved:${row.id}`,label:row.name||row.id}))];setSelectOptions(savedRecipe.control,saved,savedRecipe.control.value&&saved.some(row=>row.value===savedRecipe.control.value)?savedRecipe.control.value:'');renderWorkflowProviderOptions(snap.workflow);renderWorkflowSteps(snap.workflow?.steps||[]);workflowStatus.textContent=String(snap.workflow?.status?.text||'尚未运行。');}
    function updateLiveProvenance(snap){renderProvenanceRows(snap.provenance||[]);}
    async function updateLiveChart(snap){const rows=snap.chart?.providers||[];setSelectOptions(provider.control,rows.map(row=>({value:row.id,label:row.name})),snap.chart?.provider||'');provider.control.hidden=rows.length<=1;if(chartForm)chartForm.setValue?.(snap.chart?.parameters||{});await renderLiveChart(snap);}
    async function syncLiveState(){
      if(!live)return null;const packet=live.snapshot(),snap=packet?.state||{};shadowState.liveSnapshot=snap;
      const selected=new Set((snap.selection?.items||[]).filter(row=>row?.type==='data-center.artifact').map(row=>String(row.id||'')));
      renderArtifactRows(Array.isArray(snap.artifacts)?snap.artifacts:[],selected);shadowState.selected=selected;shadowState.multiSelect=!!snap.multiSelectMode;units.state.set(multi,'pressed',shadowState.multiSelect,{unit:'action'});
      updateLiveFilters(snap);updateLivePrimary(snap);updateLiveFormula(snap);updateLiveWorkflow(snap);updateLiveProvenance(snap);showTool(snap.view?.activeTool||'formula');await updateLiveChart(snap);
      const table=snap.active?.preview||null;shadowState.liveParity={artifactCount:Array.isArray(snap.artifacts)?snap.artifacts.length:0,activeArtifactId:String(snap.active?.id||''),previewRows:Array.isArray(table?.rows)?table.rows.length:0,selectionIds:[...selected].sort(),formulaRefs:[...(snap.formula?.refs||[])],formulaValue:snap.formula?.value||null,activeTool:String(snap.view?.activeTool||''),workflowSteps:Array.isArray(snap.workflow?.steps)?snap.workflow.steps.length:0,workflowStatus:String(snap.workflow?.status?.state||''),provenanceRows:Array.isArray(snap.provenance)?snap.provenance.length:0,chartProvider:String(snap.chart?.provider||''),chartArtifactId:String(snap.chart?.artifactId||''),chartParameters:snap.chart?.parameters||{}};return snap;
    }
    async function invokeLive(action,payload){if(!live)return null;const result=await live.invoke(action,payload);await syncLiveState();return result;}
    units.menu.contribute({id:'data-center-shadow-export',menu:'export',activity:'unit-data-center-shadow',order:90,label:'Data Center Shadow · 当前数据表 CSV',onClick:()=>live?invokeLive('exportActiveTableCsv'):command('export-table','exportActiveTableCsv')});
    command('chart-controls-map','renderChartControls');command('chart-render-map','renderChart');

    wb.compose({primary:{id:'main',label:'数据中心',presentationRole:'data-primary',scroll:'auto',titlePolicy:'host-only',mainNode:main},primes:[dataControl,chartPrime],subs:[]});
    if(live){liveOff=live.subscribe(()=>{void syncLiveState();});await syncLiveState();ctx.status.set('Data Center Unit shadow 已连接 production live domain；仍未替换生产界面。');}
    else ctx.status.set('Data Center Unit-only shadow reconstruction 已加载；production live domain 当前不可用。');

    return {shadowState,tabs,chartView,syncLiveState,invokeLive,deactivate(){try{liveOff?.();}catch{}for(const form of forms)try{form?.destroy?.();form?.dispose?.();}catch{}for(const table of tables)try{table?.dispose?.();}catch{}for(const surface of surfaces)try{surface?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}};
  });
})();
