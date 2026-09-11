(() => {
  async function mount(ctx,controller=null,views=null,adapter={}){
    const D=ctx.data.model,F=ctx.data.formula,Commands=ctx.modules.require('command-runtime');
    const dom=ctx.ui.dom;
    const sharedViews=views||window.DKDSPluginModules.get('builtin.data-center','shared-views')?.create?.(controller)||null;
    const stateStore=controller?.store;
    if(!stateStore)throw new Error('Data Center Controller state store is unavailable.');
    const sourceCapability=ctx.data.sources;
    const historyCapability=ctx.capabilities?.proxy?.('core.project-history')||null;
    let state=controller.getState();
    let assignmentFilter='all',lineageFilter='all',fieldFilter='';
    let multiSelectMode=false;
    let page=null,lastExecution=null,quickPanel=null,chartPanel=null,stepPanels=[],catalogCache={revision:-1,rows:[]},fullCache={id:'',revision:-1,artifact:null};
    const $=(sel,root=page)=>dom.query(sel,root)||null;
    const $$=(sel,root=page)=>dom.all(sel,root)||[];
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    ctx.ui.activities.add({
      id:'data-center',label:'数据中心',contextLabel:'数据中心',icon:'▦',order:20,openMode:'window',navigation:'system',artifactHydration:'live',
      description:'标准数据对象、公式、Workflow / Recipe 与来源链',
      onActivate:()=>ctx.workspace.openPage(page?.id||'builtin-data-center-data-center-page')
    });

    const formulaSchema=Commands.installFormula(ctx,{model:D,formula:F});

    ctx.workflow.processors.register('table.select-columns',{
      name:'选择列',description:'只保留指定列，生成新的 DataTable。',inputKinds:['data.table'],outputKinds:['data.table'],
      parameterSchema:{fields:[{id:'columns',type:'columns',label:'保留列',required:true,description:'可多选；列顺序按原表保持。'}]},
      run({inputs,parameters}){
        const table=inputs.table||inputs.input||Object.values(inputs)[0];
        const keys=new Set(parameters.columns||[]);const cols=table.columns.filter(c=>keys.has(c.key)).map(D.deepClone);
        if(!cols.length)throw new Error('至少选择一列。');
        return D.derive(table,{name:`${table.name} · columns`,patch:{columns:cols,rowCount:table.rowCount}},{type:'process',label:'Select columns',providerId:'table.select-columns',pluginId:ctx.manifest.id,version:ctx.manifest.version,parameters});
      }
    });

    ctx.workflow.processors.register('table.finite-rows',{
      name:'有限值筛选',description:'根据指定列删除 NaN/Infinity 行。',inputKinds:['data.table'],outputKinds:['data.table'],
      parameterSchema:{fields:[
        {id:'columns',type:'columns',label:'检查列',required:true},
        {id:'mode',type:'select',label:'保留条件',default:'all',options:[{value:'all',label:'所有选择列都为有限值'},{value:'any',label:'任一选择列为有限值'}]}
      ]},
      run({inputs,parameters}){
        const table=inputs.table||inputs.input||Object.values(inputs)[0];const cols=(parameters.columns||[]).map(k=>D.column(table,k)).filter(Boolean);if(!cols.length)throw new Error('请选择检查列。');
        const keep=[];for(let r=0;r<table.rowCount;r++){const flags=cols.map(c=>Number.isFinite(c.values[r]));if(parameters.mode==='any'?flags.some(Boolean):flags.every(Boolean))keep.push(r);}
        const outCols=table.columns.map(c=>({...D.deepClone(c),values:keep.map(r=>c.values[r]),length:keep.length}));
        return D.derive(table,{name:`${table.name} · finite`,patch:{columns:outCols,rowCount:keep.length}},{type:'process',label:'Filter finite rows',providerId:'table.finite-rows',pluginId:ctx.manifest.id,version:ctx.manifest.version,parameters});
      }
    });

    ctx.workflow.analyzers.register('table.summary',{
      name:'列统计摘要',description:'计算数值列的 count / min / max / mean / median / std。',inputKinds:['data.table'],outputKinds:['result.analysis'],parameterSchema:{fields:[{id:'columns',type:'columns',label:'统计列',required:false,description:'留空时分析全部数值列。'}]},
      run({inputs,parameters}){
        const table=inputs.table||inputs.input||Object.values(inputs)[0];const selected=new Set(parameters.columns||[]);const rows=[];
        for(const c of table.columns){if(selected.size&&!selected.has(c.key))continue;const a=c.values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)continue;const mean=a.reduce((s,v)=>s+v,0)/a.length;const mid=Math.floor(a.length/2),median=a.length%2?a[mid]:(a[mid-1]+a[mid])/2;const variance=a.length>1?a.reduce((s,v)=>s+(v-mean)**2,0)/(a.length-1):0;rows.push({key:c.key,name:c.name,unit:c.unit,count:a.length,min:a[0],max:a.at(-1),mean,median,std:Math.sqrt(variance)});}
        return D.createAnalysisResult({name:`${table.name} · summary`,summary:{sourceTable:table.id,columnCount:rows.length},tables:[{name:'summary',rows}],source:{artifactId:table.id}});
      }
    });

    const chartSchema={fields:[
      {id:'x',type:'column',label:'X 列',required:true},
      {id:'ys',type:'columns',label:'Y 列',required:true},
      {id:'mode',type:'select',label:'绘图模式',default:'lines+markers',options:[{value:'lines',label:'折线'},{value:'markers',label:'散点'},{value:'lines+markers',label:'折线 + 点'}]},
      {id:'showLegend',type:'boolean',label:'显示图例',default:true}
    ]};
    ctx.charts.register('xy-line',{
      name:'XY 多序列图',description:'通用 DataTable X/Y 折线或散点图。',inputKinds:['data.table'],parameterSchema:chartSchema,
      render({container,artifact,parameters}){
        const x=D.column(artifact,parameters.x);if(!x)throw new Error(`未找到 X 列 ${parameters.x}`);const ys=(parameters.ys||[]).map(k=>D.column(artifact,k)).filter(Boolean);if(!ys.length)throw new Error('至少选择一个 Y 列。');
        const artifactRevision=ctx.data.artifacts.artifactRevision(artifact.id),traces=ys.map(y=>({x:x.values,y:y.values,mode:parameters.mode||'lines+markers',name:y.name,artifactId:artifact.id,artifactRevision,seriesId:D.seriesId(artifact,y.key),...(Array.isArray(artifact.rowIds)?{rowIds:artifact.rowIds}:{rowIdAt:index=>D.rowId(artifact,index)}),hovertemplate:`${esc(x.name)}=%{x}<br>${esc(y.name)}=%{y}<extra>${esc(y.name)}</extra>`}));
        return ctx.ui.scientificPlot.react(container,traces,{margin:{l:72,r:22,t:30,b:62},xaxis:{title:`${x.name}${x.unit?` (${x.unit})`:''}`,automargin:true},yaxis:{title:ys.length===1?`${ys[0].name}${ys[0].unit?` (${ys[0].unit})`:''}`:'Value',automargin:true},legend:{orientation:'h',y:1.08},showlegend:parameters.showLegend!==false,hovermode:'closest',autosize:true},{responsive:true,displaylogo:false,scrollZoom:true},{interaction:controller?.interaction,source:'data-center-chart',renderKey:`data-center:${artifact.id}:${artifactRevision}:${JSON.stringify(parameters||{})}`,legendPolicy:{link:true,linkGroup:`data-center:${artifact.id}:legend`},traceEntity:(trace,index)=>{const y=ys[index];if(!y)return {id:artifact.id,type:'data-center.artifact',label:artifact.name};const ref=ctx.ui.selection.refs.series(artifact.id,D.seriesId(artifact,y.key),{artifactRevision});return {id:`data-center.column:${artifact.id}:${y.key}`,type:'data-center.column',parents:[artifact.id],label:y.name,ref,metadata:{columnId:String(y.key),name:y.name,unit:y.unit,role:y.role}};}});
      }
    });

    ctx.workflow.recipes.register('formula-example',{
      schema:1,id:'formula-example',name:'公式派生列',version:'1.0.0',description:'从一张 DataTable 计算新的派生列。',
      inputs:[{id:'main',kind:'data.table'}],nodes:[{id:'derive',type:'processor',provider:'formula.derived-column',inputs:{table:'input:main'},parameters:{name:'Resistance',formula:'abs(Vd / Id)',unit:'Ω',role:'derived',replace:false}}],outputs:{result:'node:derive'}
    });

    page=ctx.ui.pages.add({
      id:'data-center',activity:'data-center',label:'数据中心',title:'可定制数据处理中心',order:15,buttonClass:'primary',toolbar:false,
      html:sharedViews?.pageHtml?.()||''
    });

    const workbench=sharedViews?.attach?.(ctx,page)||null;
    const dcHeader=$('.analysis-page-header');
    const dcHeaderActionsHost=ctx.ui.dom.create('div');
    dcHeaderActionsHost.className='dkds-plugin-header-actions';
    dom.query('.analysis-page-close',dcHeader)?.before(dcHeaderActionsHost);
    ctx.ui.actions?.mount?.(dcHeaderActionsHost,{
      activity:'data-center',
      actions:[
        {id:'refresh',icon:'↻',label:'刷新数据',order:10,onInvoke:()=>renderAllUi()},
        {id:'workflow',icon:'▶',label:'运行工作流',className:'primary',variant:'primary',order:30,shortcut:'Ctrl+Enter',onInvoke:()=>runWorkflow()}
      ]
    });

    ctx.ui.topWorkspace.register({
      id:'data-center',activity:'data-center',label:'数据中心',icon:'▦',
      layout:{
        mode:'native',root:{selector:workbench?'.data-center-body .dkds-plugin-workbench-root':'.data-center-body'},
        primary:{id:'main',role:'analysis-primary',presentationRole:'data-primary',priority:100,collapsible:false},prime:[{id:'data-control',label:'数据',presentationRole:'data-control',priority:94,collapsible:true},{id:'chart-preview',presentationRole:'scientific-secondary',priority:60,collapsible:true}],sub:[]
      }
    });

    if(!ctx.runtime.isAuxiliaryWindow&&ctx.ui.menus?.add){
      const hasActiveTable=()=>{const table=currentOutputArtifact();return !!(table&&table.kind==='data.table'&&Array.isArray(table.columns)&&table.columns.length&&Number(table.rowCount||0)>0);};
      const hasActiveArtifact=()=>!!activeMeta();
      const menuRows=[
        ['dc-export-table-csv','当前数据表 · CSV',10,()=>exportActiveTableCsv(),hasActiveTable],
        ['dc-export-chart-png','数据中心图形预览 · PNG',30,()=>ctx.ui.scientificPlot.saveImage('dcChart','data_center_chart','png'),hasActiveTable],
        ['dc-copy-provenance','当前数据对象 · 复制来源链 JSON',50,()=>ctx.io.clipboard.writeText(JSON.stringify(activeArtifact()?.provenance||[],null,2)),hasActiveArtifact]
      ];
      for(const [id,label,order,onClick,availability] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'data-center',order,onClick,availability,nativeCopy:id==='dc-copy-provenance'?'clipboard':undefined});
    }

    const chartPane=$('.dc-chart-pane');
    if(chartPane){
      try{
        if(workbench?.registerPrime)workbench.registerPrime({id:'chart-preview',label:'图形预览',title:'通用图形预览',node:chartPane,inlineHost:'.dc-main',handle:'.dc-tool-title',controlsHost:'#dcPlotViewActions',useTargetAsWrapper:true,defaultPlacement:'inline',placements:['inline','right','bottom','float','global'],stateVersion:'data-center-chart-inline-v2',autoOpen:true,mount:()=>dom.frame(()=>{try{ctx.ui.scientificPlot.resize($('#dcChart'));}catch{}})});
        else if(ctx.ui.portable?.create)ctx.ui.portable.create('data-center-chart',chartPane,{title:'通用图形预览',handle:'.dc-tool-title',controlsHost:'#dcPlotViewActions',controlsPlacement:'start',useTargetAsWrapper:true,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home'});
        const plot=$('#dcChart');
        if(plot&&ctx.ui.plotViews?.bind){
          const chartCard=plot.closest('.dc-chart-pane');
          if(chartCard)ctx.ui.plotViews.bind('data-center:preview',chartCard,{
            plot,header:'.dc-tool-title',actionsHost:'#dcPlotViewActions',portable:false,
            portableTitle:'通用图形预览',fileStem:()=>`data_center_${state.chart.provider||'chart'}`
          });
        }
      }catch(err){console.warn('[Data Center chart view]',err);}
    }

    function assignmentTargets(){try{return sourceCapability?.targets?.()||[];}catch{return [];}}
    function artifactAssignments(a){return Array.isArray(a?.metadata?.dataAssignments)?a.metadata.dataAssignments.map(String):null;}
    function assignmentMatches(a,filter=assignmentFilter){if(filter==='all')return true;const rows=artifactAssignments(a);if(filter==='unassigned')return Array.isArray(rows)&&rows.length===0;if(!Array.isArray(rows))return false;return rows.includes('*')||rows.includes(filter);}
    function assignmentSummary(a){const rows=artifactAssignments(a);if(!Array.isArray(rows))return '';if(rows.includes('*'))return '全部分析';if(!rows.length)return '仅数据中心';const map=new Map(assignmentTargets().map(row=>[String(row.id),String(row.label||row.name||row.id)]));return rows.map(id=>map.get(id)||id).join('、');}
    function artifactOrigin(a){
      const parents=Array.isArray(a?.lineage?.parents)?a.lineage.parents.filter(Boolean):[];
      const imported=a?.metadata?.importedSource===true||(a?.provenance||[]).some(step=>String(step?.type||'').toLowerCase()==='import')||(a?.provenanceTypes||[]).some(type=>String(type||'').toLowerCase()==='import');
      return imported&&!parents.length?'raw':(parents.length||!imported?'derived':'raw');
    }
    function lineageMatches(a){return lineageFilter==='all'||artifactOrigin(a)===lineageFilter;}
    function artifactFields(a){
      const rows=[];const add=value=>{const label=String(value||'').trim();if(label&&!rows.some(row=>row.toLocaleLowerCase()===label.toLocaleLowerCase()))rows.push(label);};
      if(a?.kind==='data.table')for(const c of a.columns||[]){if(String(c?.role||'')==='index')continue;add(c?.name||c?.key);}
      else if(['data.series','data.sweep','data.transform'].includes(a?.kind)){add(a.xName);add(a.yName);}
      else if(a?.kind==='result.matrix'){add(a.xName);add(a.yName);add(a.valueName);}
      return rows;
    }
    function fieldMatches(a){if(!fieldFilter)return true;const wanted=fieldFilter.toLocaleLowerCase();return artifactFields(a).some(field=>field.toLocaleLowerCase()===wanted);}
    function catalog(){const revision=Number(ctx.data.artifacts.revision?.())||0;if(catalogCache.revision===revision)return catalogCache.rows;const rows=ctx.data.artifacts.listMetadata({includeTransient:true});catalogCache={revision,rows};return rows;}
    function assignmentArtifacts(){return catalog().filter(a=>assignmentMatches(a));}
    function lineageArtifacts(){return assignmentArtifacts().filter(lineageMatches);}
    function artifacts(){return lineageArtifacts().filter(fieldMatches);}
    function availableArtifactFields(){const counts=new Map();for(const a of lineageArtifacts())for(const field of artifactFields(a)){const key=field.toLocaleLowerCase(),row=counts.get(key)||{field,count:0};row.count+=1;counts.set(key,row);}return [...counts.values()].sort((a,b)=>b.count-a.count||a.field.localeCompare(b.field,'zh-CN',{numeric:true,sensitivity:'base'}));}
    function renderDataNavigation(){
      const lineage=$('#dcLineageFilter'),field=$('#dcFieldFilter');if(!lineage||!field)return;
      lineage.value=['all','raw','derived'].includes(lineageFilter)?lineageFilter:'all';lineageFilter=lineage.value;
      const current=fieldFilter,rows=availableArtifactFields();dom.html(field,'<option value="">全部字段</option>'+rows.map(row=>`<option value="${esc(row.field)}">${esc(row.field)}${row.count>1?` · ${row.count}`:''}</option>`).join(''));
      field.value=[...field.options].some(option=>option.value.toLocaleLowerCase()===String(current).toLocaleLowerCase())?current:'';fieldFilter=field.value;
    }
    const selectionRuntime=window.DKDSPluginModules.get('builtin.data-center','artifact-selection')?.create?.({ctx,controller,visibleArtifacts:()=>artifacts()});
    if(!selectionRuntime)throw new Error('Data Center artifact selection runtime unavailable.');
    const contextArtifacts=(target=activeArtifact())=>selectionRuntime.contextArtifacts(target);
    const normalizeArtifactRows=rows=>selectionRuntime.normalizeRows(rows);
    function selectAllVisibleArtifacts(){const rows=selectionRuntime.selectAll({focusId:state.activeArtifactId});artifactSelectionView?.refresh?.({reveal:false});return rows.length;}
    function invertVisibleArtifactSelection(){const next=selectionRuntime.invert();if(next.length)state.activeArtifactId=next.at(-1).id;artifactSelectionView?.refresh?.({reveal:false});return next.length;}
    function clearVisibleArtifactSelection(){selectionRuntime.clear();artifactSelectionView?.refresh?.({reveal:false});return true;}
    function renderAssignmentFilter(){const select=$('#dcAssignmentFilter');if(!select)return;const targets=assignmentTargets(),value=assignmentFilter;dom.html(select,'<option value="all">全部用途</option><option value="unassigned">仅数据中心</option>'+targets.map(row=>`<option value="${esc(row.id)}">${esc(row.icon||'◇')} ${esc(row.label||row.name||row.id)}</option>`).join(''));select.value=[...select.options].some(option=>option.value===value)?value:'all';assignmentFilter=select.value;}
    function expandedAssignments(a,targets=assignmentTargets()){const raw=artifactAssignments(a)||[];return raw.includes('*')?targets.map(row=>String(row.id)):raw.slice();}
    async function setArtifactAssignments(rows,ids){
      const eligible=normalizeArtifactRows(rows).filter(a=>isImportedSource(a)&&sourceCapability?.setAssignments);if(!eligible.length)return false;
      for(const a of eligible){const ref=sourceRef(a);if(!ref.path&&!ref.sourcePath&&!ref.artifactId)continue;await sourceCapability.setAssignments(ref,ids);}
      renderAllUi();ctx.status.set(eligible.length>1?`已更新 ${eligible.length} 个选中源数据的数据用途。`:'已更新数据用途。');return true;
    }
    async function toggleAssignmentForArtifacts(rows,targetId){
      const targets=assignmentTargets(),eligible=normalizeArtifactRows(rows).filter(a=>isImportedSource(a)&&sourceCapability?.setAssignments);if(!eligible.length)return false;
      const id=String(targetId),allSelected=eligible.every(a=>expandedAssignments(a,targets).includes(id));
      for(const a of eligible){const expanded=expandedAssignments(a,targets),next=allSelected?expanded.filter(value=>value!==id):[...new Set([...expanded,id])];await sourceCapability.setAssignments(sourceRef(a),next);}
      renderAllUi();ctx.status.set(`${allSelected?'已取消':'已设置'} ${eligible.length} 个选中源数据的数据用途。`);return true;
    }
    function assignmentActionItems(rows){const selectedRows=normalizeArtifactRows(rows),eligible=selectedRows.filter(a=>isImportedSource(a)&&sourceCapability?.setAssignments);if(!eligible.length)return [];const targets=assignmentTargets();return [
      {type:'separator'},
      {id:'assignment-title',label:selectedRows.length>1?`数据用途 · ${eligible.length} 项`:'数据用途',icon:'↦',enabled:false},
      ...targets.map(row=>{const id=String(row.id),allSelected=eligible.every(a=>expandedAssignments(a,targets).includes(id));return {id:`assignment:${id}`,label:`${allSelected?'✓':'○'} ${row.label||row.name||row.id}`,onInvoke:()=>void toggleAssignmentForArtifacts(eligible,id)};}),
      {id:'assignment:none',label:'仅数据中心',icon:eligible.every(a=>expandedAssignments(a,targets).length===0)?'✓':'○',onInvoke:()=>void setArtifactAssignments(eligible,[])}
    ];}
    function activeMeta(){const rows=artifacts();let a=rows.find(x=>x.id===state.activeArtifactId)||rows.find(x=>x.kind==='data.table')||rows[0]||null;if(a&&a.id!==state.activeArtifactId)state.activeArtifactId=a.id;return a;}
    function activeArtifact(){const meta=activeMeta();if(!meta){fullCache={id:'',revision:-1,artifact:null};return null;}const revision=Number(meta.artifactRevision)||0;if(fullCache.id===String(meta.id)&&fullCache.revision===revision&&fullCache.artifact)return fullCache.artifact;const artifact=ctx.data.artifacts.get(meta.id);fullCache={id:String(meta.id),revision,artifact};return artifact;}
    function isImportedSource(a){return !!a&&a.kind==='data.table'&&a.metadata?.importedSource===true&&!!String(a?.metadata?.seriesPath||a?.source?.path||a.id||'');}
    function sourceRef(a){return {artifactId:String(a?.id||''),path:String(a?.metadata?.seriesPath||a?.id||''),sourcePath:String(a?.source?.path||'')};}
    function isExcluded(a){return !!a&&a.metadata?.excluded===true;}
    function renderDataAction(a=activeArtifact()){const button=$('#dcDataActionsBtn');if(!button)return;button.disabled=!a;button.title=a?'编辑标签、用途、排除状态或删除当前数据对象':'请选择数据对象';}
    async function removeActiveSource(target=activeArtifact()){
      const a=target;
      if(!isImportedSource(a)||!sourceCapability?.remove){ctx.status.set('当前选择不是可移除的导入源数据。');return false;}
      const ref=sourceRef(a);
      try{
        const result=await sourceCapability.remove([ref]);
        const ids=new Set((result?.removedArtifactIds||[]).map(String));
        if(ids.size)ctx.data.artifacts.batch?.(api=>{for(const id of ids)api.remove?.(id);});
        state.activeArtifactId='';lastExecution=null;renderAllUi();
        const count=Array.isArray(result?.removed)?result.removed.length:0;
        ctx.status.set(count?`已从工程移除 ${count} 组源数据。`:'源数据已不存在。');
        return count>0;
      }catch(err){ctx.status.set(`移除源数据失败：${err.message||err}`);return false;}
    }
    async function renameArtifact(a=activeArtifact()){
      if(!a)return false;const label=await ctx.ui.dialogs.prompt({title:'修改数据标签',inputLabel:'数据标签',value:String(a.name||''),confirmLabel:'保存'});if(label===null||label===undefined)return false;const name=String(label||'').trim();if(!name)return false;
      if(isImportedSource(a)&&sourceCapability?.rename){await sourceCapability.rename(sourceRef(a),name);}
      else{const current=ctx.data.artifacts.get?.(a.id);if(!current){ctx.status.set('当前数据对象已不存在。');return false;}const next={...D.deepClone(current),name};if(historyCapability?.commitArtifactMutation)await historyCapability.commitArtifactMutation({label:`修改数据标签 · ${name}`,before:{upserts:[D.deepClone(current)],removedIds:[]},after:{upserts:[next],removedIds:[]}});else ctx.data.artifacts.upsert(next);}
      state.activeArtifactId=a.id;renderAllUi();ctx.status.set(`数据标签已修改为：${name}`);return true;
    }
    async function setArtifactsExcluded(rows,value){
      const selectedRows=normalizeArtifactRows(rows);if(!selectedRows.length)return false;const next=!!value;
      const imported=selectedRows.filter(a=>isImportedSource(a)&&sourceCapability?.setExcluded),local=selectedRows.filter(a=>!imported.includes(a));
      for(const a of imported)await sourceCapability.setExcluded(sourceRef(a),next);
      if(local.length){const fullLocal=local.map(a=>ctx.data.artifacts.get?.(a.id)).filter(Boolean),before=fullLocal.map(D.deepClone),after=fullLocal.map(a=>({...D.deepClone(a),metadata:{...(a.metadata||{}),excluded:next}}));if(historyCapability?.commitArtifactMutation)await historyCapability.commitArtifactMutation({label:`${next?'排除':'恢复'} ${local.length} 个数据对象`,before:{upserts:before,removedIds:[]},after:{upserts:after,removedIds:[]}});else ctx.data.artifacts.batch?.(api=>after.forEach(row=>api.upsert?.(row)));}
      state.activeArtifactId=selectedRows.at(-1)?.id||state.activeArtifactId;renderAllUi();ctx.status.set(`${next?'已排除':'已恢复'} ${selectedRows.length} 个选中数据对象。`);return true;
    }
    async function toggleArtifactExcluded(a=activeArtifact()){if(!a)return false;return setArtifactsExcluded([a],!isExcluded(a));}
    async function deleteArtifacts(rows,{confirm=true}={}){
      const selectedRows=normalizeArtifactRows(rows);if(!selectedRows.length)return false;
      if(confirm){const label=selectedRows.length===1?`“${selectedRows[0].name||selectedRows[0].id}”`:`选中的 ${selectedRows.length} 个数据对象`;const confirmed=await ctx.ui.dialogs.confirm({title:selectedRows.length===1?'删除数据对象':'删除选中数据',message:`删除${label}？派生后代也会一并删除。`,confirmLabel:'删除',destructive:true});if(!confirmed)return false;}
      const imported=selectedRows.filter(isImportedSource),localRoots=selectedRows.filter(a=>!isImportedSource(a));
      if(imported.length){if(!sourceCapability?.remove){ctx.status.set('当前选择包含无法移除的导入源数据。');return false;}await sourceCapability.remove(imported.map(sourceRef));}
      const currentLocal=localRoots.map(a=>ctx.data.artifacts.get?.(a.id)).filter(Boolean);
      if(currentLocal.length){const removeMap=new Map();for(const root of currentLocal){const lineage=ctx.data.artifacts.lineage?.(root.id);for(const row of [...(lineage?.descendants||[]),root])if(row?.id)removeMap.set(String(row.id),row);}const removed=[...removeMap.values()],ids=[...removeMap.keys()];if(historyCapability?.commitArtifactMutation)await historyCapability.commitArtifactMutation({label:`删除 ${currentLocal.length} 个数据对象`,before:{upserts:removed.map(D.deepClone),removedIds:[]},after:{upserts:[],removedIds:ids}});else ctx.data.artifacts.batch?.(api=>{for(const id of ids.slice().reverse())api.remove?.(id);});}
      controller?.clearSelection?.({source:'data-center-delete-selection'});state.activeArtifactId='';selectionRuntime.setAnchor('');lastExecution=null;renderAllUi();ctx.status.set(`已删除 ${selectedRows.length} 个选中数据对象。`);return true;
    }
    async function deleteArtifact(a=activeArtifact()){return deleteArtifacts(a?[a]:[],{confirm:true});}
    function dataActionItems(target=activeArtifact()){
      const rows=normalizeArtifactRows(target);if(!rows.length)return [];const single=rows.length===1,allExcluded=rows.every(isExcluded),count=rows.length;
      return [
        {id:'rename',label:single?'修改标签':'修改标签（仅单项）',icon:'✎',enabled:single,onInvoke:()=>single&&void renameArtifact(rows[0])},
        {id:'exclude',label:allExcluded?(single?'恢复参与分析':`恢复选中（${count}）`):(single?'排除':`排除选中（${count}）`),icon:allExcluded?'○':'⊘',onInvoke:()=>void setArtifactsExcluded(rows,!allExcluded)},
        ...assignmentActionItems(rows),
        {type:'separator'},
        {id:'delete',label:single?'删除':`删除选中（${count}）`,icon:'×',onInvoke:()=>void deleteArtifacts(rows,{confirm:true})}
      ];
    }
    function openDataActions(event,a=activeArtifact()){
      if(!a)return null;const rows=contextArtifacts(a);return ctx.ui.contextMenus?.open?.({x:event?.clientX??0,y:event?.clientY??0,items:dataActionItems(rows),context:{artifact:a,artifacts:rows}})||null;
    }
    function provider(type,id){const list=type==='processor'?ctx.workflow.processors.list():ctx.workflow.analyzers.list();return list.find(p=>p.id===id)||null;}
    function currentOutputArtifact(){const result=lastExecution?.outputs?.result;if(D.isArtifact(result)&&result.kind==='data.table')return result;if(lastExecution?.nodeResults){const candidates=Object.values(lastExecution.nodeResults).flatMap(v=>D.isArtifact(v)?[v]:v&&typeof v==='object'?Object.values(v).filter(D.isArtifact):[]).filter(a=>a.kind==='data.table');if(candidates.length)return candidates.at(-1);}return activeArtifact();}
    function csvCell(value){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
    function activeTableCsv(){const table=currentOutputArtifact();if(!table||table.kind!=='data.table')throw new Error('当前没有可导出的 DataTable。');const columns=Array.isArray(table.columns)?table.columns:[];if(!columns.length)throw new Error('当前 DataTable 没有列。');const rows=[columns.map(c=>csvCell(c.name||c.key||'column')).join(',')];for(let r=0;r<Number(table.rowCount||0);r++)rows.push(columns.map(c=>csvCell(c.values?.[r]??'')).join(','));return {table,text:rows.join('\n')};}
    async function exportActiveTableCsv(){const {table,text}=activeTableCsv();const safe=String(table.name||'data_table').replace(/[\/:*?"<>|]+/g,'_');await ctx.io.saveCsv(text,`${safe}.csv`);ctx.status.set(`已导出 ${safe}.csv。`);}

    function syncArtifactChecks(){const s=selectionRuntime.selectedIds();for(const i of $$('.dc-artifact-item')){const c=dom.query('.dc-artifact-check',i);if(c)c.checked=s.has(String(i.dataset.artifactId||''));}}
    function renderArtifacts(){
      const list=$('#dcArtifactList');if(!list)return;renderAssignmentFilter();renderDataNavigation();list.classList.toggle('is-multi-select',multiSelectMode);const multiBtn=$('#dcMultiSelectBtn');if(multiBtn){multiBtn.classList.toggle('selected',multiSelectMode);multiBtn.setAttribute('aria-pressed',multiSelectMode?'true':'false');}const rows=artifacts();$('#dcArtifactCount').textContent=`${rows.length} 个`;dom.html(list,'');
      if(!rows.length){dom.html(list,'<div class="empty-state">当前筛选条件下没有数据对象。可清除用途/层级/字段筛选，或从主界面导入并调整“数据用途”。</div>');return;}
      for(const a of rows){
        ctx.data.entities?.projectArtifact?.(a);const sum=D.summarize(a);const dimensions=a.kind==='data.table'?`${sum.rows??'—'} 行 · ${sum.columns??'—'} 列`:a.kind==='data.series'||a.kind==='data.sweep'||a.kind==='data.transform'?`${sum.length??'—'} 点`:a.kind,usage=assignmentSummary(a);
        const b=dom.create('div',{className:`dc-artifact-item dkds-list-item${isExcluded(a)?' is-excluded':''}`,attrs:{role:'option'},dataset:{selectionKey:String(a.id),artifactId:String(a.id)},html:`<input class="dc-artifact-check" type="checkbox" tabindex="-1" aria-label="选择 ${esc(a.name)}"><span class="dc-artifact-copy"><span class="dc-artifact-name">${esc(a.name)}</span><span class="dc-artifact-meta dkds-meta">${esc(a.kind)} · ${esc(dimensions)} · provenance ${a.provenanceCount??sum.provenance}${usage?` · 用途 ${esc(usage)}`:''}${isExcluded(a)?' · 已排除':''}</span></span>`});
        dom.append(list,b);
      }
      syncArtifactChecks();
    }
    function bindPreviewTable(meta=activeMeta()){const table=$('#dcTablePreview table');if(table)ctx.ui.tables?.bind?.('data-center-preview',table,{persist:true,appearance:{density:'compact',stripe:'subtle'},interaction:controller?.interaction,selection:meta?.kind==='data.table'?{artifactId:String(meta.id),type:'data.point',role:'row',source:'data-center-table'}:null});return table;}
    function renderPreview(){
      const meta=activeMeta();renderDataAction(meta);$('#dcActiveName').textContent=meta?.name||'未选择数据';$('#dcActiveMeta').textContent=meta?`${meta.kind} · ${meta.id}`:'—';const host=$('#dcTablePreview');
      if(!meta){dom.html(host,'<div class="empty-state">暂无数据对象</div>');return;}
      if(meta.kind==='data.table'){
        const columns=ctx.data.artifacts.columnMetadata(meta.id)||[],n=Math.min(Number(meta.rowCount)||0,18),ranges=n?columns.map(column=>ctx.data.artifacts.readColumnRange(meta.id,column.id,{start:0,limit:n})):columns.map(()=>null);
        const cell=(columnIndex,rowIndex)=>ranges[columnIndex]?.values?.[rowIndex];
        const artifact=activeArtifact();dom.html(host,`<table class="dc-preview-table dkds-table"><thead><tr><th>#</th>${columns.map(c=>`<th>${esc(c.name)}${c.unit?` (${esc(c.unit)})`:''}</th>`).join('')}</tr></thead><tbody>${Array.from({length:n},(_,r)=>`<tr data-row-id="${esc(D.rowId(artifact,r))}"><td>${r+1}</td>${columns.map((_c,index)=>{const value=cell(index,r);return `<td>${Number.isFinite(value)?Number(value).toPrecision(7):esc(value)}</td>`;}).join('')}</tr>`).join('')}</tbody></table>${Number(meta.rowCount||0)>n?`<div class="import-diagnosis">预览前 ${n} / ${meta.rowCount} 行</div>`:''}`);bindPreviewTable(meta);return;
      }
      const a=activeArtifact();if(a?.kind==='result.analysis'){
        const table=a.tables?.[0],rows=table?.rows||[];if(rows.length){const keys=Object.keys(rows[0]);const n=Math.min(rows.length,18);dom.html(host,`<div class="import-diagnosis">${esc(JSON.stringify(a.summary||{}))}</div><table class="dc-preview-table dkds-table"><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,n).map(row=>`<tr>${keys.map(k=>`<td>${Number.isFinite(row[k])?Number(row[k]).toPrecision(7):esc(row[k])}</td>`).join('')}</tr>`).join('')}</tbody></table>`);bindPreviewTable();return;}
      }
      dom.html(host,`<pre class="dc-json-preview">${esc(JSON.stringify(D.summarize(a||meta),null,2))}</pre>`);
    }
    function renderFormula(){
      const a=activeArtifact();quickPanel?.destroy?.();const host=$('#dcFormulaParams'),refs=$('#dcFormulaRefs');
      if(!a||a.kind!=='data.table'){dom.html(host,'<div class="empty-state">公式派生列需要选择 data.table。</div>');dom.html(refs,'');return;}
      quickPanel=ctx.parameters.render(host,formulaSchema,{value:{name:'Derived',formula:a.columns.some(c=>c.key==='Vd')&&a.columns.some(c=>c.key==='Id')?'abs(Vd / Id)':'abs('+a.columns[0].key+')',unit:'',role:'derived',replace:false},context:{table:a}});
      dom.html(refs,a.columns.map(c=>`<button class="dc-ref-chip dkds-chip" data-ref="${esc(c.key)}">${esc(c.key)}</button>`).join(''));
    }
    const formulaCommandId=Commands.register(ctx,{model:D,activeMeta,panel:()=>quickPanel,onOutput:(out,exec)=>{state.activeArtifactId=out.id;lastExecution=exec;ctx.status.set(`已生成派生 DataTable：${out.name}`);renderAllUi();}});

    function refreshProviderSelect(){const type=$('#dcStepType')?.value||'processor',select=$('#dcProviderSelect');if(!select)return;const rows=type==='processor'?ctx.workflow.processors.list():ctx.workflow.analyzers.list();dom.html(select,rows.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.id)}</option>`).join(''));}
    function renderSteps(){
      const host=$('#dcWorkflowSteps');if(!host)return;stepPanels.forEach(h=>h?.destroy?.());stepPanels=[];dom.html(host,'');
      if(!state.steps.length){dom.html(host,'<div class="empty-state">尚无步骤。选择 Processor / Analyzer 后点击“添加步骤”。</div>');return;}
      const table=activeArtifact();state.steps.forEach((step,index)=>{const p=provider(step.type,step.provider);const card=dom.create('div',{className:'dc-step-card dkds-list-item',dataset:{stepIndex:index},html:`<div class="dc-step-head dkds-surface-header"><strong>${index+1}. ${esc(p?.name||step.provider)} <span class="plugin-card-id">${esc(step.type)}</span></strong><div class="dc-step-actions dkds-toolbar"><button data-act="up">↑</button><button data-act="down">↓</button><button data-act="remove">删除</button></div></div><div class="dc-step-params"></div>`});dom.append(host,card);if(p){const handle=ctx.parameters.render(dom.query('.dc-step-params',card),p.parameterSchema||{fields:[]},{value:step.parameters||{},context:{table},compact:true,onChange:value=>step.parameters=value});stepPanels.push(handle);step.parameters=handle.getValue();}});
    }
    function addStep(){const type=$('#dcStepType').value,providerId=$('#dcProviderSelect').value;if(!providerId)return;const p=provider(type,providerId);state.steps.push({id:`step-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,type,provider:providerId,parameters:ctx.parameters.defaults(p?.parameterSchema||{fields:[]},{})});renderSteps();}
    function currentRecipe(){stepPanels.forEach((h,i)=>{if(state.steps[i])state.steps[i].parameters=h.getValue();});state.recipeName=$('#dcRecipeName').value.trim()||'我的工作流';return ctx.workflow.buildSequentialRecipe({id:`user.${D.hashString(state.recipeName)}`,name:state.recipeName,steps:state.steps.map(s=>({...s})),workspace:{sourceArtifactId:state.activeArtifactId}});}
    async function runWorkflow(){const a=activeArtifact();if(!a){ctx.status.set('请选择输入 DataTable。');return;}const status=$('#dcWorkflowStatus');try{status.className='dc-workflow-status dkds-status running';status.textContent='正在运行…';const recipe=currentRecipe();const exec=await ctx.workflow.run(recipe,{inputs:{main:a},onProgress:p=>{status.textContent=`${p.index}/${p.total} · ${p.provider?.name||p.node?.provider}`;}});lastExecution=exec;const outputs=[];const seen=new Set();const collect=value=>{if(D.isArtifact(value)){if(!seen.has(value.id)){seen.add(value.id);outputs.push(value);}return;}if(Array.isArray(value)){value.forEach(collect);return;}if(value&&typeof value==='object')Object.values(value).forEach(collect);};Object.values(exec.nodeResults||{}).forEach(collect);Object.values(exec.outputs||{}).forEach(collect);ctx.data.artifacts.batch?.(api=>{for(const artifact of outputs)(api.publish?.(artifact)||api.upsert?.(artifact));})||outputs.forEach(artifact=>ctx.data.artifacts.publish?.(artifact)||ctx.data.artifacts.upsert(artifact));const lastTable=outputs.filter(o=>o.kind==='data.table').at(-1);if(lastTable)state.activeArtifactId=lastTable.id;status.className='dc-workflow-status dkds-status done';status.textContent=`完成 · ${recipe.nodes.length} 步 · 保存 ${outputs.length} 个结果对象`;ctx.status.set(`工作流“${recipe.name}”执行完成。`);renderAllUi();}catch(err){status.className='dc-workflow-status dkds-status error';status.textContent=`失败：${err.message}`;ctx.status.set(`工作流失败：${err.message}`);}}
    function renderSavedRecipes(){const sel=$('#dcSavedRecipe');if(!sel)return;const registered=ctx.workflow.recipes.list();dom.html(sel,'<option value="">—</option>'+`${registered.length?`<optgroup label="插件 Recipe">${registered.map(r=>`<option value="plugin:${esc(r.id)}">${esc(r.name||r.id)}</option>`).join('')}</optgroup>`:''}${state.savedRecipes.length?`<optgroup label="当前工程">${state.savedRecipes.map(r=>`<option value="saved:${esc(r.id)}">${esc(r.name)}</option>`).join('')}</optgroup>`:''}`);}
    function saveRecipe(){const recipe=currentRecipe();const saved={...D.deepClone(recipe),savedAt:new Date().toISOString()};const i=state.savedRecipes.findIndex(r=>r.id===saved.id);if(i>=0)state.savedRecipes[i]=saved;else state.savedRecipes.push(saved);renderSavedRecipes();$('#dcSavedRecipe').value=`saved:${saved.id}`;ctx.status.set(`Recipe 已保存到当前工程：${saved.name}`);}
    function loadRecipe(){const raw=$('#dcSavedRecipe').value;if(!raw)return;const pluginRecipe=raw.startsWith('plugin:');const id=raw.replace(/^(plugin:|saved:)/,'');const r=pluginRecipe?ctx.workflow.recipes.list().find(x=>x.id===id):state.savedRecipes.find(x=>x.id===id);if(!r)return;state.recipeName=r.name||r.id;state.steps=(r.nodes||[]).map(n=>({id:n.id,type:n.type,provider:n.provider,parameters:D.deepClone(n.parameters||{})}));$('#dcRecipeName').value=state.recipeName;renderSteps();ctx.status.set(`${pluginRecipe?'已载入插件 Recipe':'已载入工程 Recipe'}：${state.recipeName}`);}

    function renderProvenance(){const a=activeArtifact();const host=$('#dcProvenanceList');if(!host)return;if(!a?.provenance?.length){dom.html(host,'<div class="empty-state">暂无 provenance。</div>');return;}dom.html(host,a.provenance.slice().reverse().map(p=>`<div class="dc-prov-item"><div class="dc-prov-time dkds-meta">${esc(p.timestamp||'—')}</div><div class="dc-prov-main"><strong>${esc(p.label||p.type)}</strong><div>${esc([p.pluginId,p.providerId,p.version].filter(Boolean).join(' · '))}</div><div>${esc(JSON.stringify(p.parameters||{}))}</div>${p.note?`<div>${esc(p.note)}</div>`:''}</div></div>`).join(''));}
    function chartProviders(){const a=currentOutputArtifact();return ctx.charts.list().filter(p=>!p.inputKinds?.length||!a||p.inputKinds.includes(a.kind));}
    function renderChartControls(){const providers=chartProviders();const select=$('#dcChartProvider');if(!select)return;dom.html(select,providers.map(p=>`<option value="${esc(p.id)}">${esc(p.name||p.id)}</option>`).join(''));if(providers.some(p=>p.id===state.chart.provider))select.value=state.chart.provider;else state.chart.provider=select.value||'';select.hidden=providers.length<=1;select.title=providers.length>1?'切换 Chart Provider':'';renderChartParams();}
    let chartRenderRevision=0;
    function clearChartPreview(message='选择 DataTable 后可配置图形。'){
      chartRenderRevision+=1;const host=$('#dcChart');if(!host)return false;
      try{ctx.ui.scientificPlot.purge?.(host);}catch{}
      try{ctx.ui.scientificPlot.get?.(host)?.dispose?.();}catch{}
      dom.replace(host);if(message)dom.html(host,`<div class="empty-state">${esc(message)}</div>`);return true;
    }
    function renderChartParams(){const a=currentOutputArtifact();chartPanel?.destroy?.();const p=ctx.charts.list().find(x=>x.id===$('#dcChartProvider')?.value);if(!p||!a||a.kind!=='data.table'){const host=$('#dcChartParams');if(host)dom.html(host,'<div class="empty-state">选择 DataTable 后可配置图形。</div>');clearChartPreview();return;}state.chart.provider=p.id;const defaults={...ctx.parameters.defaults(p.parameterSchema||{fields:[]},state.chart.parameters||{})};const validKeys=new Set((a.columns||[]).map(c=>String(c.key)));if(!validKeys.has(String(defaults.x||'')))defaults.x=a.columns.find(c=>c.role==='x')?.key||a.columns[0]?.key||'';defaults.ys=(Array.isArray(defaults.ys)?defaults.ys:[]).filter(key=>validKeys.has(String(key)));if(!defaults.ys.length)defaults.ys=[a.columns.find(c=>c.role==='y'&&c.key!==defaults.x)?.key||a.columns.find(c=>c.key!==defaults.x)?.key].filter(Boolean);chartPanel=ctx.parameters.render($('#dcChartParams'),p.parameterSchema||{fields:[]},{value:defaults,context:{table:a},compact:true,autoFit:true,onChange:value=>{state.chart.parameters=value;scheduleChartPreview('parameter-change');}});state.chart.parameters=chartPanel.getValue();}
    async function renderChart({silent=false}={}){const a=currentOutputArtifact();const select=$('#dcChartProvider');const p=ctx.charts.list().find(x=>x.id===select?.value);if(!a||!p||a.kind!=='data.table'){clearChartPreview();return false;}const valid=chartPanel?.validate?.();if(valid&&!valid.ok){if(!silent)ctx.status.set('图形参数存在错误。');return false;}state.chart.parameters=chartPanel?.getValue?.()||state.chart.parameters||{};const revision=++chartRenderRevision;try{await Promise.resolve(p.render({container:$('#dcChart'),artifact:a,parameters:state.chart.parameters,context:{page}}));if(revision!==chartRenderRevision)return false;dom.frame(()=>{try{ctx.ui.scientificPlot.resize($('#dcChart'));}catch{}});return true;}catch(err){if(revision!==chartRenderRevision)return false;const host=$('#dcChart');if(host&&!dom.query('.dkds-scientific-chart-host',host))dom.html(host,`<div class="empty-state">图形预览失败：${esc(err?.message||err)}</div>`);ctx.status.set(`绘图失败：${err?.message||err}`);return false;}}
    function scheduleChartPreview(reason='auto'){const revision=++chartRenderRevision;dom.frame(()=>{if(revision!==chartRenderRevision)return;void renderChart({silent:reason!=='manual'});});}
    function switchTab(tab){for(const name of ['formula','workflow','provenance']){$(`#dc${name[0].toUpperCase()+name.slice(1)}Pane`)?.classList.toggle('hidden',name!==tab);}$$('[data-dc-tab]').forEach(b=>{const selected=b.dataset.dcTab===tab;b.classList.toggle('selected',selected);b.setAttribute('aria-selected',selected?'true':'false');});if(tab==='provenance')renderProvenance();}
    function renderAllUi(){renderArtifacts();renderPreview();renderFormula();refreshProviderSelect();renderSteps();renderSavedRecipes();renderProvenance();renderChartControls();scheduleChartPreview('auto');}
    const artifactSelectionView=controller?.interaction?.bindView?.('data-center-artifacts',$('#dcArtifactList'),{selector:'.dc-artifact-item',itemVariant:'row',itemKey:el=>el.dataset.artifactId||el.dataset.selectionKey,entityLinked:true,revealFocus:true,onActivate:({event,element})=>{
      const id=String(element.dataset.artifactId||''),rows=artifacts(),a=rows.find(row=>String(row.id)===id);if(!a)return;if(multiSelectMode){selectionRuntime.activate(a,rows,{ctrlKey:true,metaKey:false,shiftKey:false});artifactSelectionView?.refresh?.({reveal:false});syncArtifactChecks();return;}state.activeArtifactId=a.id;lastExecution=null;selectionRuntime.activate(a,rows,event||{});renderAllUi();
    }});
    const offArtifactSelectionChecks=controller?.interaction?.subscribe?.(()=>syncArtifactChecks(),{immediate:true});
    const artifactContextBehavior=ctx.ui.interactionBehaviors?.create?.('data-center-artifact-context',{bindings:[{id:'data-center.artifact.context',gesture:'context',target:'artifact',intent:'context-menu',contextActions:context=>dataActionItems(contextArtifacts(context.artifact))}]});
    artifactContextBehavior?.bind?.($('#dcArtifactList'),{selector:'.dc-artifact-item',gestures:['context'],target:'artifact',targetId:({element})=>String(element.dataset.artifactId||''),payload:({element})=>({artifact:ctx.data.artifacts.get(String(element.dataset.artifactId||''))}),beforeRoute:({input})=>{const a=input.payload?.artifact;if(!a)return;state.activeArtifactId=a.id;lastExecution=null;selectionRuntime.focusContext(a);artifactSelectionView?.refresh?.({reveal:false});}});

    const artifactListEl=$('#dcArtifactList'),artifactPane=$('.dc-artifact-pane');
    selectionRuntime.bindPaneShortcuts({dom,page,pane:artifactPane,list:artifactListEl,onSelectAll:selectAllVisibleArtifacts,onInvert:invertVisibleArtifactSelection,onClear:clearVisibleArtifactSelection});
    dom.on($('#dcMultiSelectBtn'),'click',()=>{multiSelectMode=!multiSelectMode;renderArtifacts();artifactSelectionView?.refresh?.({reveal:false});});
    dom.on($('#dcSelectAllBtn'),'click',()=>selectAllVisibleArtifacts());
    dom.on($('#dcInvertSelectionBtn'),'click',()=>invertVisibleArtifactSelection());
    dom.on($('#dcClearSelectionBtn'),'click',()=>clearVisibleArtifactSelection());
    dom.on($('#dcApplyFormula'),'click',()=>ctx.commands.run(formulaCommandId).catch(err=>ctx.status.set(`公式计算失败：${err.message}`)));
    const dataActionsBtn=$('#dcDataActionsBtn');dom.on(dataActionsBtn,'click',event=>{const rect=dataActionsBtn.getBoundingClientRect();openDataActions({clientX:rect.left,clientY:rect.bottom+4},activeArtifact());event.stopPropagation();});
    const assignmentFilterEl=$('#dcAssignmentFilter');dom.on(assignmentFilterEl,'change',()=>{assignmentFilter=assignmentFilterEl.value||'all';renderAllUi();});
    const lineageFilterEl=$('#dcLineageFilter');dom.on(lineageFilterEl,'change',()=>{lineageFilter=lineageFilterEl.value||'all';fieldFilter='';renderAllUi();});
    const fieldFilterEl=$('#dcFieldFilter');dom.on(fieldFilterEl,'change',()=>{fieldFilter=fieldFilterEl.value||'';renderAllUi();});
    dom.delegate(page,'click','[data-dc-tab]',(_event,button)=>switchTab(button.dataset.dcTab));
    dom.on($('#dcStepType'),'change',refreshProviderSelect);
    dom.on($('#dcAddStep'),'click',addStep);
    dom.on($('#dcSaveRecipe'),'click',saveRecipe);
    dom.on($('#dcLoadRecipe'),'click',loadRecipe);
    dom.on($('#dcSavedRecipe'),'change',loadRecipe);
    dom.on($('#dcChartProvider'),'change',()=>{state.chart.provider=$('#dcChartProvider').value||'';renderChartParams();scheduleChartPreview('provider-change');});
    dom.on($('#dcCopyProvenance'),'click',()=>ctx.io.clipboard.writeText(JSON.stringify(activeArtifact()?.provenance||[],null,2)));
    dom.delegate($('#dcFormulaRefs'),'click','.dc-ref-chip',(_event,button)=>{const host=$('#dcFormulaParams'),ta=dom.query('[data-param-id="formula"] textarea',host);if(!ta)return;const token=/\s/.test(button.dataset.ref)?`[${button.dataset.ref}]`:button.dataset.ref;ta.setRangeText(token,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input',{bubbles:true}));});
    dom.delegate($('#dcWorkflowSteps'),'click','[data-act]',(_event,button)=>{const card=button.closest('.dc-step-card'),index=Number(card?.dataset?.stepIndex),act=button.dataset.act;if(!Number.isInteger(index)||index<0||index>=state.steps.length)return;if(act==='up'&&index){[state.steps[index-1],state.steps[index]]=[state.steps[index],state.steps[index-1]];renderSteps();}else if(act==='down'&&index<state.steps.length-1){[state.steps[index+1],state.steps[index]]=[state.steps[index],state.steps[index+1]];renderSteps();}else if(act==='remove'){state.steps.splice(index,1);renderSteps();}});
    ctx.events.on('data:artifacts-changed',()=>{if(!page.classList.contains('hidden'))renderAllUi();});ctx.events.on('layout:resize',()=>{if(!page.classList.contains('hidden'))dom.frame(()=>{try{ctx.ui.scientificPlot.resize($('#dcChart'));}catch{}});});

    stateStore.subscribe((next,meta)=>{
      state=next;
      if(meta?.reason==='project-reset'||meta?.reason==='reset')lastExecution=null;
      if(page&&!page.classList.contains('hidden')&&(meta?.reason==='project-restore'||meta?.reason==='project-reset'||meta?.reason==='reset'))renderAllUi();
    });

    ctx.events.on('analysis:opened',({id})=>{if(id===page.id)renderAllUi();});
    return {deactivate(){offArtifactSelectionChecks?.();artifactSelectionView?.dispose?.();quickPanel?.destroy?.();chartPanel?.destroy?.();stepPanels.forEach(h=>h?.destroy?.());ctx.ui.scientificPlot.get?.($('#dcChart'))?.dispose?.();}};
  }
  window.DKDSPluginModules.define('builtin.data-center','feature-runtime',Object.freeze({mount}));
})();
