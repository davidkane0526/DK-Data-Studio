(() => {
  const manifest={"id":"com.example.unit-ter-shadow","name":"TER Unit-only Shadow Reconstruction","version":"1.0.0","apiVersion":"1.19.0","entry":"plugin.js","scripts":["plugin.js"],"enabled":true,"order":922,"description":"Parallel, non-production TER reconstruction built from public Unit Templates for seven-layer parity auditing.","requiresCore":["status","services","workspace","parameters","analysis.providers","ui.dom","ui.workspace","ui.group-area","ui.plot-views","ui.actions","ui.interaction","ui.pages","ui.portable","ui.scientific-plot","ui.table","ui.unit-templates"],"capabilities":["ui.page","ui.plugin-workspace","ui.group-area","ui.scientific-plot"],"pluginDependencies":[{"id":"builtin.ter-analysis"}],"pluginType":"workbench","platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"data":{"accepts":["science.transport.iv"]}};

  DKDSPlugins.define(manifest,async ctx=>{
    const dom=ctx.ui.dom,units=ctx.ui.unitTemplates;
    const shadowState={layout:{cols:3,rows:3},calls:[],settings:{},display:{},transform:{type:'didv',direction:'1'},liveParity:{connected:false,revision:0,numericDigest:'',presentationDigest:''}};
    let liveDomain=null;try{liveDomain=ctx.services?.domain?.connect?.('builtin.ter-analysis/live')||null;}catch{}
    shadowState.liveParity.connected=!!liveDomain;
    const record=(intent,payload={})=>{shadowState.calls.push({intent,payload});ctx.status.set(`TER Unit shadow：${intent} ${liveDomain?'已通过生产 domain owner 执行':'仅完成边界映射'}；生产 TER 未被替换。`);};
    const nativeProvider=()=>ctx.analysis.providers.get('ter');
    let syncLiveState=()=>null;
    const command=async(id,nativeMethod,payload={})=>{record(id,{nativeMethod,...payload,providerAvailable:!!nativeProvider(),liveDomain:!!liveDomain});if(!liveDomain)return null;try{const result=await liveDomain.invoke(id,payload);await syncLiveState();return result;}catch(error){ctx.status.set(`TER Unit shadow live action 失败：${error.message}`);return null;}};
    const applyGeometry=(target,geometry,responsiveGeometry=[])=>units.layout.apply(target,{variant:'identity',geometry,responsiveGeometry});
    const formatInput=value=>value===null||value===undefined||!Number.isFinite(Number(value))?'':String(value);
    const parameterControls=new Map(),displayControls=new Map(),plotSurfaces=new Map();
    let onlyVisibleControl=null,algorithmControl=null,transformForm=null,resistanceSelection=null,liveOff=()=>{};

    const page=ctx.ui.pages.add({id:'unit-ter-shadow',pageId:'unitTerShadowPage',label:'TER Unit Shadow',order:922,html:''});
    const pageUnit=units.page.create(page,{variant:'analysis'});
    const pageBody=pageUnit.element;
    units.pageHeader.create(pageBody,{
      variant:'page-owned',
      title:'TER 热图 / TER_Max 分析 · Unit Shadow',
      subtitle:'仅用于 Unit Templates 七层 parity；不替换、不写入生产 TER。',
      actions:[
        {id:'auto',icon:'↻',label:'自动参数',order:10,onInvoke:()=>command('autoParameters','autoParameters')},
        {id:'calculate',icon:'∑',label:'计算 TER',className:'primary',variant:'primary',order:20,shortcut:'Ctrl+Enter',onInvoke:()=>command('calculate','calculate')},
        {id:'layout',icon:'▦',label:'布局',menu:true,order:30,items:()=>[3,4,2,1,7].map(cols=>({id:`cols-${cols}`,icon:cols===1?'▤':cols===7?'▥':'▦',label:`${cols} 列 × ${Math.ceil(7/cols)} 行${cols===3?'（默认）':''}`,onInvoke:()=>{shadowState.layout={cols,rows:Math.ceil(7/cols)};plotGroup.setColumns(cols);record('setCols',{cols,rows:shadowState.layout.rows});}}))}
      ]
    });

    const workspaceHost=units.layout.create(pageBody,{variant:'stack'});
    const wb=units.workspace.create(workspaceHost,{variant:'standard',header:false,activity:'unit-ter-shadow',primaryScroll:'auto',leftWidth:420,leftMin:320,leftReserve:760,layoutStateVersion:'ter-visual-parity-v1'});

    const main=units.layout.create(null,{variant:'stack-comfortable',geometry:{padding:'12px',boxSizing:'border-box',width:'100%',maxWidth:'100%',minWidth:'0'}});
    const liveSummary=units.summary.create(main,{variant:'strip',items:[]});

    const groupHost=units.layout.create(main,{variant:'identity'});
    const plotGroup=units.plotGroup.create(groupHost,{columns:3,preferredColumns:3,minItemWidth:260,maxColumns:7,responsive:true,density:'comfortable'});
    const scientificSurfaces=[];

    function makePlot({id,title,kind='curve',heatmap=false,meta='',resistance=false}){
      const panel=units.panel.detached({variant:'plot-card',header:false});
      const card=panel.element;
      if(resistance)units.layout.apply(card,{variant:'resistance-card'});
      else units.layout.apply(card,{variant:'plot-card-fill'});
      const header=units.header.create(card,{kind:'plot',variant:'plot',title,actions:resistance?[{id:'clear-highlight',label:'清除高亮',title:'恢复显示全部栅压曲线',onInvoke:()=>command('clearSelection','controller.clearSelection',{source:'ter-unit-shadow'})}]:[]});
      if(resistance)units.layout.apply(header.element,{variant:'card-title-row'});
      if(meta){
        const hint=units.note.create(card,{variant:'meta',text:meta});
        applyGeometry(hint,{margin:'7px 10px 0'});
      }
      if(resistance){
        resistanceSelection=units.status.create(card,{variant:'text',text:'尚未选择 TER 数据点；当前显示全部栅压下的正扫/反扫 R–V 曲线。'});
        applyGeometry(resistanceSelection,{margin:'6px 10px 0',minHeight:'20px'});
      }
      const plot=units.layout.create(card,{variant:heatmap?'square-plot':'identity',className:'analysis-chart'});
      if(heatmap)applyGeometry(card,{width:'min(860px,100%)',maxWidth:'100%',alignSelf:'center'},[{maxWidth:950,geometry:{width:'min(760px,100%)'}}]);
      const view=plotGroup.adoptPlot(id,card,{title,plot,header:header.element,fileStem:()=>id,csv:()=>'',images:true,placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',stateVersion:'ter-unit-shadow-v2'});
      const surface=units.scientificPlot.create(plot,{variant:kind,source:`ter-unit-shadow:${id}`});
      plotSurfaces.set(id,surface);scientificSurfaces.push(surface);
      return view;
    }

    makePlot({id:'ter-shadow-heatmap',title:'TER(Vd, Vg) 全组合热图',kind:'heatmap',heatmap:true});
    makePlot({id:'ter-shadow-transform',title:'dI/dV · 正扫',kind:'heatmap',heatmap:true,meta:'与 TER 的 Vg/Vd 网格和源文件选择保持一致'});
    makePlot({id:'ter-shadow-resistance',title:'R–V 全 Vg · 正扫 / 反扫',resistance:true,meta:'同一 Vg 使用同一颜色：实线为正扫（Vds 递增），虚线为反扫（Vds 递减）。点击 TER_Max / 峰位图的数据点后，其他曲线变淡并标出对应位置。'});
    makePlot({id:'ter-shadow-max-vg',title:'TER_Max–Vg：max over Vd'});
    makePlot({id:'ter-shadow-max-vg-arg',title:'Vd@TER_Max–Vg'});
    makePlot({id:'ter-shadow-max-vd',title:'TER_Max–Vd：max over Vg'});
    makePlot({id:'ter-shadow-max-vd-arg',title:'Vg@TER_Max–Vd'});

    const exportPanel=units.panel.create(main,{variant:'control-card',header:false});
    const exportLayout=units.layout.create(exportPanel.element,{variant:'row-wrap'});
    exportLayout.appendChild(dom.create('strong',{textContent:'热图/矩阵导出'}));
    units.actionRow.create(exportLayout,{variant:'wrap',actions:[
      {id:'export-long',label:'TER_long.csv',onInvoke:()=>command('exportLong','exportLong')},
      {id:'copy-long',label:'复制 long',onInvoke:()=>command('copyLong','copyLong')},
      {id:'export-matrix',label:'TER_matrix.csv',onInvoke:()=>command('exportMatrix','exportMatrix')},
      {id:'copy-matrix',label:'复制 matrix',onInvoke:()=>command('copyMatrix','copyMatrix')}
    ]});

    function mountResultTable(id,title,columns){
      const section=units.section.create(main,{role:'controls',title});
      return units.table.mount(id,section.body,{variant:'standard',columns,rows:[],persistKey:`${id}-shadow`});
    }
    const vgColumns=[{key:'vg',label:'Vg (V)'},{key:'terMax',label:'TER_Max–Vg (%)'},{key:'vdsAtMax',label:'Vd@max (V)'},{key:'iUp',label:'I_up (A)'},{key:'iDown',label:'I_down (A)'},{key:'rUp',label:'R_up (Ω)'},{key:'rDown',label:'R_down (Ω)'},{key:'mode',label:'方式'}];
    const vdColumns=[{key:'vds',label:'Vd (V)'},{key:'terMax',label:'TER_Max–Vd (%)'},{key:'vgAtMax',label:'Vg@max (V)'},{key:'iUp',label:'I_up (A)'},{key:'iDown',label:'I_down (A)'},{key:'rUp',label:'R_up (Ω)'},{key:'rDown',label:'R_down (Ω)'},{key:'mode',label:'方式'}];
    const tableVg=mountResultTable('ter-shadow-max-vg-table','TER_Max–Vg 数据',vgColumns);
    const tableVd=mountResultTable('ter-shadow-max-vd-table','TER_Max–Vd 数据',vdColumns);

    const numericDigest=result=>{if(!result)return '';const maxVg=(result.terMaxByVg||[]).map(row=>[row.vg,row.terMax,row.vdsAtMax]);const maxVd=(result.terMaxByVd||[]).map(row=>[row.vds,row.terMax,row.vgAtMax]);return JSON.stringify({vgs:result.vgs||[],targets:result.targets||[],missing:result.missing,maxVg,maxVd});};
    const groupedResistanceRecords=result=>{
      const rows=(result?.records||[]).filter(row=>Number.isFinite(row?.vg)&&Number.isFinite(row?.vds)),groups=new Map();
      for(const row of rows){const source=String(row.sourceFile||''),key=`${Number(row.vg)}\u0000${source}`;if(!groups.has(key))groups.set(key,{vg:Number(row.vg),sourceFile:source,rows:[]});groups.get(key).rows.push(row);}
      return [...groups.values()].map(group=>{const byVds=new Map();for(const row of group.rows){const key=Number(row.vds).toPrecision(15);if(!byVds.has(key))byVds.set(key,row);}group.rows=[...byVds.values()].sort((a,b)=>a.vds-b.vds);return group;}).sort((a,b)=>(a.vg-b.vg)||a.sourceFile.localeCompare(b.sourceFile));
    };
    const setSurface=(id,data,layout={})=>{const surface=plotSurfaces.get(id);return surface?.set?.({data,layout,config:{responsive:true,scrollZoom:true,displaylogo:false},renderKey:`ter-unit-shadow:${shadowState.liveParity.revision}:${id}`});};
    const renderPlots=(result,transformMatrix)=>{
      if(!result){for(const surface of plotSurfaces.values())surface?.set?.({data:[],layout:{},config:{responsive:true},renderKey:`ter-unit-shadow:empty:${shadowState.liveParity.revision}`});return;}
      setSurface('ter-shadow-heatmap',[{x:result.targets||[],y:result.vgs||[],z:result.matrix||[],type:'heatmap'}],{xaxis:{title:'Vds (V)'},yaxis:{title:'Vg (V)'}});
      const tm=transformMatrix;if(tm)setSurface('ter-shadow-transform',[{x:tm.targets||[],y:tm.vgs||[],z:tm.matrix||[],type:'heatmap'}],{xaxis:{title:'Vds (V)'},yaxis:{title:'Vg (V)'}});else setSurface('ter-shadow-transform',[],{});
      const resistance=[];for(const group of groupedResistanceRecords(result)){const up=group.rows.filter(row=>Number.isFinite(row.rUp)&&row.rUp>0),down=group.rows.filter(row=>Number.isFinite(row.rDown)&&row.rDown>0);resistance.push({x:up.map(row=>row.vds),y:up.map(row=>row.rUp),mode:'lines',name:`Vg=${group.vg} V`});resistance.push({x:down.map(row=>row.vds),y:down.map(row=>row.rDown),mode:'lines',name:`Vg=${group.vg} V · 反扫`,line:{dash:'dash'}});}setSurface('ter-shadow-resistance',resistance,{xaxis:{title:'Vds (V)'},yaxis:{title:'R = |Vds / I| (Ω)',type:'log'}});
      const maxVg=result.terMaxByVg||[],maxVd=result.terMaxByVd||[];
      setSurface('ter-shadow-max-vg',[{x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),mode:'lines+markers'}],{xaxis:{title:'Vg (V)'},yaxis:{title:'TER_Max–Vg (%)'}});
      setSurface('ter-shadow-max-vg-arg',[{x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),mode:'lines+markers'}],{xaxis:{title:'Vg (V)'},yaxis:{title:'Vd @ TER_Max–Vg (V)'}});
      setSurface('ter-shadow-max-vd',[{x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),mode:'lines+markers'}],{xaxis:{title:'Vd (V)'},yaxis:{title:'TER_Max–Vd (%)'}});
      setSurface('ter-shadow-max-vd-arg',[{x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.vgAtMax),mode:'lines+markers'}],{xaxis:{title:'Vd (V)'},yaxis:{title:'Vg @ TER_Max–Vd (V)'}});
    };
    const renderSummary=result=>{
      const texts=result?[`Vg 数：${result.vgs?.length||0}`,`Vds 点：${result.targets?.length||0}`,`缺失 TER：${result.missing}`,`Vds：${result.used?.vmin} ~ ${result.used?.vmax} V`,`step=${result.used?.vstep} V`,`tolerance=${result.used?.tolerance} V`,`current floor=${result.used?.currentFloor} A`,`算法：${result.algorithm?.algorithmId||shadowState.algorithmRef?.id||'ter.high-low-ratio'}@${result.algorithm?.algorithmVersion||shadowState.algorithmRef?.version||'1.0.0'}`]:['尚未计算 TER_max'];
      liveSummary.element.replaceChildren();for(const text of texts)units.chip.create(liveSummary.element,{variant:'quiet',text});return texts;
    };
    const syncSelection=selection=>{if(!resistanceSelection)return '';const focus=selection?.focus||selection?.items?.at?.(-1)||null;let text='尚未选择 TER 数据点；当前显示全部栅压下的正扫/反扫 R–V 曲线。';if(focus){const ref=focus.ref||{};text=`当前联动：${ref.vg!==undefined?` Vg=${ref.vg} V，`:''}${ref.vd!==undefined?`Vds=${ref.vd} V，`:''}${focus.id||focus.type||'TER 数据点'}`;}resistanceSelection.textContent=text;return text;};

    const controls=units.layout.create(null,{variant:'identity'});
    const parameterPanel=units.panel.create(controls,{variant:'control-card',header:false});
    const parameterFields=[['vmin','Vds min (V)','number'],['vmax','Vds max (V)','number'],['vstep','Vds step (V)','number'],['tolerance','配对容差 (V)','number'],['currentFloor','电流下限 (A)','number']];
    const numericInput=value=>{const text=String(value??'').trim();if(!text)return null;const number=Number(text);return Number.isFinite(number)?number:null;};
    for(const [key,label,inputType] of parameterFields){
      const field=units.field.create(parameterPanel.element,{variant:'analysis-control',label,inputType,step:'any',value:key==='currentFloor'?'1e-15':'',onChange:event=>{const value=numericInput(event.target.value);shadowState.settings[key]=value;command('setSetting','settings',{key,value});}});
      applyGeometry(field.control,{minWidth:'118px',width:'135px'});
      parameterControls.set(key,field.control);
    }
    const algorithm=units.field.create(parameterPanel.element,{variant:'analysis-control',kind:'select',label:'TER 算法',options:[{value:'ter.high-low-ratio@1.0.0',label:'TER 高低电阻比 · ter.high-low-ratio@1.0.0'}],onChange:event=>command('setAlgorithm','algorithmRef',{value:event.target.value})});
    algorithmControl=algorithm.control;
    units.action.create(parameterPanel.element,{id:'recover-algorithm',label:'定位/恢复缺失算法',variant:'quiet',onInvoke:()=>command('recoverAlgorithm','algorithm recovery')});
    const onlyVisible=units.check.create(parameterPanel.element,{variant:'checkbox',className:'inline-check',label:'仅使用正反扫均显示的数据文件',checked:false,onChange:event=>command('setOnlyFullyVisible','setOnlyFullyVisible',{value:event.target.checked})});
    onlyVisibleControl=onlyVisible.input;

    units.note.create(controls,{variant:'normal',className:'analysis-note',text:'TER 热图中的每个像素都对应一个实际 (Vd, Vg) 组合：在相同 Vd 下配对正扫/反扫，R=|Vd/I|，TER=(Rhigh−Rlow)/Rlow×100%。TER_Max–Vg 是固定 Vg 后沿 Vd 方向取最大值；TER_Max–Vd 是固定 Vd 后沿 Vg 方向取最大值。'});

    const displayPanel=units.panel.create(controls,{variant:'control-card',header:false});
    displayPanel.element.appendChild(dom.create('strong',{textContent:'热图显示'}));
    const scale=units.field.create(displayPanel.element,{variant:'analysis-control',kind:'select',label:'色图',value:'Viridis',options:['Viridis','Turbo','Cividis','Jet','Hot'],onChange:event=>{shadowState.display.colorscale=event.target.value;command('setDisplay','display',{key:'colorscale',value:event.target.value});}});
    applyGeometry(scale.control,{minWidth:'105px',width:'112px'});
    displayControls.set('colorscale',scale.control);
    for(const [key,label] of [['zmin','色阶最小 (%)'],['zmax','色阶最大 (%)'],['colorDtick','色阶刻度 (%)'],['xDtick','Vds 刻度 (V)'],['yDtick','Vg 刻度 (V)']]){
      const field=units.field.create(displayPanel.element,{variant:'analysis-control',label,inputType:'number',step:'any',placeholder:'自动',onChange:event=>{const value=numericInput(event.target.value);shadowState.display[key]=value;command('setDisplay','display',{key,value});}});
      applyGeometry(field.control,{minWidth:'105px',width:'112px'});
      displayControls.set(key,field.control);
    }
    units.action.create(displayPanel.element,{id:'apply-display',label:'应用显示',variant:'quiet',onInvoke:()=>command('applyDisplay','applyDisplay')});
    units.action.create(displayPanel.element,{id:'reset-display',label:'自动色阶/刻度',variant:'quiet',onInvoke:()=>command('resetDisplay','resetDisplay')});

    const transformPanel=units.panel.create(controls,{variant:'control-card',header:false});
    transformPanel.element.appendChild(dom.create('strong',{textContent:'Vg–Vd 数据变换热图'}));
    const transformHost=units.layout.create(transformPanel.element,{variant:'identity'});applyGeometry(transformHost,{width:'100%'});
    try{
      transformForm=units.parameterForm.mount(transformHost,{fields:[
        {id:'type',type:'select',label:'处理量',required:true,default:'didv',options:[{value:'didv',label:'dI/dV（微分电导）'}]},
        {id:'direction',type:'select',label:'扫描方向',required:true,default:'1',options:[{value:'1',label:'正扫（Vds 递增）'},{value:'-1',label:'反扫（Vds 递减）'}]}
      ]},{autoFit:true,value:{...shadowState.transform},onChange:(next,result)=>{if(result&&!result.ok)return;shadowState.transform={...next};command('setTransformSettings','setTransformSettings',{value:next});}});
    }catch(error){units.note.create(transformHost,{variant:'warning',text:`参数表单运行时不可用：${error.message}`});}

    syncLiveState=async()=>{if(!liveDomain)return null;const snap=liveDomain.snapshot(),state=snap?.state||{},result=state.result||null,settings=state.settings||{},display=state.display||{},transform=state.transform||{};shadowState.liveParity.revision=Number(snap?.descriptor?.revision)||0;shadowState.liveParity.numericDigest=numericDigest(result);shadowState.settings={...settings};shadowState.display={...display};shadowState.transform={...transform,direction:String(transform.direction??1)};shadowState.algorithmRef={...(state.algorithmRef||{})};for(const [key,control] of parameterControls)control.value=formatInput(settings[key]);if(onlyVisibleControl)onlyVisibleControl.checked=!!settings.onlyFullyVisible;if(algorithmControl){const ref=state.algorithmRef||{};algorithmControl.value=`${ref.id||'ter.high-low-ratio'}@${ref.version||'1.0.0'}`;}for(const [key,control] of displayControls)control.value=key==='colorscale'?String(display[key]||'Viridis'):formatInput(display[key]);transformForm?.setValue?.({type:transform.type||'didv',direction:String(Number(transform.direction)<0?-1:1)});const summary=renderSummary(result),selectionText=syncSelection(state.interaction?.selection);const vgRows=(result?.terMaxByVg||[]).map(row=>({vg:String(row.vg),terMax:Number(row.terMax).toPrecision(7),vdsAtMax:String(row.vdsAtMax),iUp:Number(row.iUp).toExponential(6),iDown:Number(row.iDown).toExponential(6),rUp:Number(row.rUp).toExponential(6),rDown:Number(row.rDown).toExponential(6),mode:row.manual?'手动':'自动'})),vdRows=(result?.terMaxByVd||[]).map(row=>({vds:String(row.vds),terMax:Number(row.terMax).toPrecision(7),vgAtMax:String(row.vgAtMax),iUp:Number(row.iUp).toExponential(6),iDown:Number(row.iDown).toExponential(6),rUp:Number(row.rUp).toExponential(6),rDown:Number(row.rDown).toExponential(6),mode:row.manual?'手动':'自动'}));tableVg?.setData?.(vgColumns,vgRows);tableVd?.setData?.(vdColumns,vdRows);renderPlots(result,state.derived?.transformMatrix||null);shadowState.liveParity.presentationDigest=JSON.stringify({settings:shadowState.settings,display:shadowState.display,transform:shadowState.transform,algorithmRef:shadowState.algorithmRef,summary,selectionText,vgRows,vdRows,plotData:[...plotSurfaces].map(([id,surface])=>[id,surface?.spec?.data||surface?.lastSpec?.data||null])});return snap;};

    const dataControl=units.prime.build({
      id:'data-control',label:'参数',variant:'accepted-scientific-data-control',presentationRole:'data-control',presentationPurpose:'parameters',semanticKind:'panel',priority:90,collapsible:true,autoOpen:true,content:controls,defaultPlacement:'left',placements:['left'],fixed:true,stateVersion:'ter-unit-shadow-presentation-v2'
    });

    wb.compose({primary:{id:'main',label:'TER 分析',scroll:'auto',titlePolicy:'host-only',mainNode:main},primes:[dataControl],subs:[]});
    liveOff=liveDomain?.subscribe?.(()=>{void syncLiveState();},{immediate:true})||(()=>{});void syncLiveState();
    ctx.status.set(liveDomain?'TER Unit-only shadow 已连接生产 domain owner；生产 TER 保持唯一数值/状态 owner。':'TER Unit-only shadow reconstruction 已加载；生产 TER 保持原样。');

    return {shadowState,syncLiveState,deactivate(){try{liveOff?.();}catch{}try{transformForm?.destroy?.();transformForm?.dispose?.();}catch{}try{tableVg?.dispose?.();tableVd?.dispose?.();}catch{}for(const surface of scientificSurfaces)try{surface?.dispose?.();}catch{}try{plotGroup?.dispose?.();}catch{}try{wb?.dispose?.();}catch{}}};
  });
})();
