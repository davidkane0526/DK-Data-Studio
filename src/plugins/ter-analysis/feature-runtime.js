(() => {
  async function mount(ctx,controller=null,views=null,adapter={}){
    const dom=ctx.ui.dom;
    const T=controller;
    const sharedViews=views||window.DKDSPluginModules.get('builtin.ter-analysis','shared-views')?.create?.(controller)||null;
    const CHART_COUNT=7;
    const GRID_COLUMNS=[1,2,3,4,7];
    let selectedTerPoint=null;
    let lastResult=null;
    let resultRevision=0;
    let renderTicket=0;
    let observer=null;
    const manualStateByResult=new WeakMap();
    let keyboardContributionsBound=false;
    const terPlotViews=new Map();
    let workbench=null;
    let gridController=null;
    let layoutSettings={rows:3,cols:3,sticky:true};
    let transformPanel=null;

    ctx.ui.styles.add('linked-resistance-voltage', `
      #terMaxPage .ter-chart-grid{
        --dkds-grid-columns:3;
        display:grid!important;
        grid-template-columns:repeat(var(--dkds-grid-columns),minmax(0,1fr))!important;
        grid-auto-rows:auto!important;
        align-items:start;
        gap:14px;
      }
      #terMaxPage .ter-chart-grid > .heatmap-square-card,
      #terMaxPage .ter-chart-grid > .ter-resistance-card{
        width:100%;
        max-width:none;
        align-self:start;
      }
      #terMaxPage .ter-resistance-card{
        min-width:0;
        position:relative;
        z-index:4;
      }
      #terMaxPage .ter-resistance-card.ter-sticky-enabled{
        position:sticky;
        top:8px;
        z-index:30;
        box-shadow:0 10px 30px rgba(15,23,42,.16);
      }
      #terMaxPage .ter-resistance-card .analysis-chart{
        min-height:380px;
        height:clamp(400px,42vw,590px);
      }
      #terMaxPage .ter-card-title-row,
      #terMaxPage .ter-resistance-card-header{
        min-height:38px;
        height:auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        padding:5px 8px 5px 10px;
        background:#fafbfe;
        border-bottom:1px solid #edf0f5;
        flex-wrap:wrap;
      }
      #terMaxPage .ter-card-title-text{
        min-width:0;
        flex:1 1 150px;
        font-size:12px;
        font-weight:700;
      }
      #terMaxPage .ter-chart-actions{
        display:flex;
        align-items:center;
        justify-content:flex-end;
        gap:5px;
        flex:0 0 auto;
      }
      #terMaxPage .ter-chart-actions button,
      #terMaxPage .ter-resistance-card-header button{
        min-width:0;
        min-height:25px;
        height:25px;
        padding:2px 7px;
        font-size:10px;
        line-height:1;
        white-space:nowrap;
      }
      #terMaxPage .ter-resistance-hint{
        margin:7px 10px 0;
        color:#64748b;
        font-size:11px;
        line-height:1.45;
      }
      #terMaxPage .ter-resistance-selection{
        margin:6px 10px 0;
        min-height:20px;
        color:#334155;
        font-size:11px;
      }
      #terMaxPage .ter-resistance-selection strong{color:#b91c1c}
      #terMaxPage .ter-layout-controls{
        align-items:center;
      }
      #terMaxPage .ter-layout-controls strong{
        color:#334155;
        margin-right:2px;
      }
      #terMaxPage .ter-layout-controls label{
        flex-direction:row;
        align-items:center;
        gap:6px;
      }
      #terMaxPage .ter-layout-controls select{
        width:72px;
        min-width:72px;
        height:30px;
      }
      #terMaxPage .ter-layout-controls .ter-layout-note{
        color:#64748b;
        font-size:11px;
      }
      #terMaxPage .ter-layout-controls .ter-sticky-check{
        padding:0 4px;
      }
      #terMaxPage .ter-layout-controls .ter-sticky-check input{
        min-width:auto;
        width:auto;
        height:auto;
        margin:0;
      }
      #terMaxPage .heatmap-square-card .ter-heatmap-square{
        width:100%;
      }
      .dkds-pointer-coarse #terMaxPage .ter-chart-actions button,
      .dkds-pointer-coarse #terMaxPage .ter-resistance-card-header button{
        min-height:var(--dkds-touch-target,44px);
        height:auto;
        padding:6px 9px;
      }
      @media(max-width:1180px){
        #terMaxPage .ter-resistance-card .analysis-chart{height:500px}
      }
      @media(max-width:850px){
        #terMaxPage .ter-resistance-card .analysis-chart{height:450px}
      }
      @media(max-width:680px){
        #terMaxPage .ter-resistance-card .analysis-chart{height:410px;min-height:340px}
        #terMaxPage .ter-card-title-row,
        #terMaxPage .ter-resistance-card-header{align-items:flex-start}
      }
    `);

    function finiteNumber(v){
      const n=Number(v);
      return Number.isFinite(n)?n:null;
    }

    function nearlyEqual(a,b){
      const x=finiteNumber(a),y=finiteNumber(b);
      if(x===null||y===null)return false;
      return Math.abs(x-y)<=Math.max(1e-10,Math.max(Math.abs(x),Math.abs(y))*1e-9);
    }

    function formatNumber(v,digits=6){
      const n=finiteNumber(v);
      if(n===null)return '—';
      if(n===0)return '0';
      const a=Math.abs(n);
      if(a>=1e5||a<1e-4)return n.toExponential(Math.min(4,digits));
      return Number(n.toPrecision(digits)).toString();
    }

    function csvCell(value){
      const s=String(value??'');
      return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
    }

    function sanitizeLayout(raw){
      const input=raw&&typeof raw==='object'?raw:{};
      let cols=GRID_COLUMNS.includes(Number(input.cols))?Number(input.cols):3;
      let rows=Math.max(1,Math.ceil(CHART_COUNT/cols));
      if(Number.isFinite(Number(input.rows))&&Number(input.rows)>0&&Number(input.cols)<=0){
        rows=Math.max(1,Math.min(CHART_COUNT,Math.round(Number(input.rows))));
        cols=Math.max(1,Math.ceil(CHART_COUNT/rows));
      }
      return {rows,cols,sticky:input.sticky!==false};
    }

    function syncLayoutControls(){
      const rows=dom.query('#terLayoutRows');
      const cols=dom.query('#terLayoutCols');
      const sticky=dom.query('#terResistanceStickyToggle');
      if(rows)rows.value=String(layoutSettings.rows);
      if(cols)cols.value=String(layoutSettings.cols);
      if(sticky)sticky.checked=!!layoutSettings.sticky;
    }

    function resizeTerPlots(){
      if(!ctx.ui.scientificPlot?.resize)return;
      dom.frame(()=>{
        for(const id of ['terHeatmapPlot','terTransformHeatmapPlot','terResistancePlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
          const el=dom.query('#'+id);
          if(el)try{ ctx.ui.scientificPlot.resize(el); }catch(_err){}
        }
      });
    }

    function applyLayoutSettings({capture=false}={}){
      layoutSettings=sanitizeLayout(layoutSettings);
      const grid=dom.query('#terMaxPage .ter-chart-grid');
      if(gridController)gridController.setColumns(layoutSettings.cols);
      else if(grid)grid.style.setProperty('--dkds-grid-columns',String(layoutSettings.cols));
      const card=dom.query('#terResistanceCard');
      card?.classList.toggle('ter-sticky-enabled',!!layoutSettings.sticky);
      syncLayoutControls();
      resizeTerPlots();
      if(capture)ctx.project.capture?.();
    }

    function setRows(rows){
      const n=Math.max(1,Math.min(CHART_COUNT,Math.round(Number(rows)||1)));
      layoutSettings.rows=n;
      layoutSettings.cols=Math.max(1,Math.ceil(CHART_COUNT/n));
      applyLayoutSettings({capture:true});
      ctx.status.set(`TER 图表布局：${layoutSettings.rows} 行 × ${layoutSettings.cols} 列。`);
    }

    function setCols(cols){
      const n=Number(cols);
      if(!GRID_COLUMNS.includes(n))return;
      layoutSettings.cols=n;
      layoutSettings.rows=Math.max(1,Math.ceil(CHART_COUNT/n));
      applyLayoutSettings({capture:true});
      ctx.status.set(`TER 图表布局：${layoutSettings.rows} 行 × ${layoutSettings.cols} 列。`);
    }

    function setSticky(value){
      layoutSettings.sticky=!!value;
      const prime=workbench?.primes?.get?.('resistance-inspector');
      if(prime?.mounted)workbench.setPrimePlacement?.('resistance-inspector',layoutSettings.sticky?'sticky':'inline');
      applyLayoutSettings({capture:true});
      ctx.status.set(`R–V 随滚动吸附已${layoutSettings.sticky?'开启':'关闭'}。`);
    }

    function ensureLayoutControls(){
      syncLayoutControls();
      return null;
    }

    function ensureResistanceCard(){
      const card=dom.query('#terResistanceCard');
      if(!card)return null;
      card.classList.toggle('ter-sticky-enabled',!!layoutSettings.sticky);
      if(card.dataset.terBound!=='1'){
        card.dataset.terBound='1';
        const clearBtn=card.querySelector('#terResistanceClearBtn');
        if(clearBtn)clearBtn.onclick=()=>{
          selectedTerPoint=null;
          controller?.clearSelection?.({source:'ter-resistance-clear'});
          renderResistancePlot();
        };
      }
      syncLayoutControls();
      return card;
    }

    function transformOptions(){
      const rows=ctx.data.transforms?.list?.({supportsScalarField:true})||T.listTransforms?.()||[];
      return rows.filter(row=>row?.id&&row?.public!==false&&(!row.tags?.length||row.tags.includes('transport'))).map(row=>({value:String(row.id),label:String(row.title||row.label||row.id)}));
    }
    function transformSchema(){
      const options=transformOptions();
      return {fields:[
        {id:'type',type:'select',label:'处理量',required:true,default:'didv',options:options.length?options:[{value:'didv',label:'dI/dV（微分电导）'}]},
        {id:'direction',type:'select',label:'扫描方向',required:true,default:'1',options:[
          {value:'1',label:'正扫（Vds 递增）'},{value:'-1',label:'反扫（Vds 递减）'}]}
      ]};
    }

    function ensureTransformControls(){
      const host=dom.query('#terTransformSettings');if(!host||!ctx.parameters?.render)return null;
      if(transformPanel)return transformPanel;
      const current=T.getTransformSettings?.()||T.getState?.()?.transform||{type:'didv',direction:1};
      transformPanel=ctx.parameters.render(host,transformSchema(),{
        value:{type:String(current.type||'didv'),direction:String(Number(current.direction)<0?-1:1)},
        compact:true,
        onChange:(next,result)=>{
          if(result&&!result.ok)return;
          T.setTransformSettings?.({type:next.type,direction:Number(next.direction)<0?-1:1});
          renderTransformHeatmap();
          ctx.project.capture?.();
        }
      });
      return transformPanel;
    }

    function selectTerPoint(selection,source='ter-plot'){
      if(!selection)return null;
      selectedTerPoint=selection;
      controller?.select?.({...selection,selectionType:selection.selectionType||'ter.matrix-point',id:selection.id||`${selection.vg??''}:${selection.vds??''}:${selection.axis||''}`},{source});
      renderResistancePlot();
      return selection;
    }

    function transformHeatmapSelection(matrix,event){
      const point=event?.points?.[0],vg=finiteNumber(point?.y),vds=finiteNumber(point?.x);
      if(vg===null||vds===null)return null;
      const result=T.getState?.()?.result;
      let rows=(result?.records||[]).filter(item=>nearlyEqual(item.vg,vg)&&nearlyEqual(item.vds,vds));
      const source=String(matrix?.sources?.[(matrix?.vgs||[]).findIndex(value=>nearlyEqual(value,vg))]||'');
      if(source){const exact=rows.filter(item=>String(item.sourceFile||'')===source);if(exact.length)rows=exact;}
      const row=rows[0];
      return {vg,vds,rUp:row?.rUp,rDown:row?.rDown,ter:row?.ter,sourceFile:String(row?.sourceFile||source||''),id:`transform:${vg}:${vds}`,selectionType:'ter.matrix-point'};
    }

    function renderTransformHeatmap(){
      const plot=dom.query('#terTransformHeatmapPlot'),title=dom.query('#terTransformHeatmapTitle'),meta=dom.query('#terTransformHeatmapMeta');
      if(!plot||!ctx.ui.scientificPlot)return null;
      const matrix=T.getTransformMatrix?.();
      if(!matrix){try{ctx.ui.scientificPlot.purge(plot);}catch{}if(meta)meta.textContent='计算 TER 后生成与 TER 网格严格对齐的变换数据热图。';return null;}
      const directionLabel=Number(matrix.direction)<0?'反扫':'正扫';
      if(title)title.textContent=`${matrix.label||matrix.type} · ${directionLabel}`;
      if(meta)meta.textContent=`${matrix.vgs.length} × ${matrix.targets.length} 网格 · 缺失 ${matrix.missing} · 与 TER 的 Vg/Vd 网格和源文件选择保持一致`;
      const definition=ctx.data.transforms?.resolve?.(matrix.transformId||matrix.type)||T.getTransformDefinition?.()||null;
      const signed=definition?.diverging!==false;
      const trace={x:matrix.targets,y:matrix.vgs,z:matrix.matrix,type:'heatmap',colorscale:signed?'RdBu':'Viridis',reversescale:signed,zsmooth:false,
        colorbar:{title:{text:`${matrix.label||matrix.type}${matrix.unit?` (${matrix.unit})`:''}`,side:'right'},thickness:18,len:.86},
        hovertemplate:`Vg=%{y:.6g} V<br>Vds=%{x:.6g} V<br>${matrix.label||matrix.type}=%{z:.6g}${matrix.unit?` ${matrix.unit}`:''}<extra>${directionLabel}</extra>`};
      if(signed)trace.zmid=0;
      ctx.ui.scientificPlot.react(plot,[trace],{margin:{l:76,r:98,t:26,b:66},xaxis:{title:'Vds (V)',automargin:true,constrain:'domain'},yaxis:{title:'Vg (V)',automargin:true,constrain:'domain'},dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff',uirevision:`ter-transform-${matrix.type}-${matrix.direction}`},{responsive:true,displaylogo:false,scrollZoom:true},{interaction:T.interaction,source:'ter-transform-heatmap',renderKey:`ter-transform:${resultRevision}:${matrix.type}:${matrix.direction}:${matrix.missing}`,onClick:event=>selectTerPoint(transformHeatmapSelection(matrix,event),'ter-transform-heatmap')})
        .catch?.(err=>console.warn('[TER transformed heatmap]',err));
      return matrix;
    }

    function chartSpecs(){
      return [
        {key:'heatmap',plotId:'terHeatmapPlot',fileBase:'TER_heatmap'},
        {key:'transform',plotId:'terTransformHeatmapPlot',fileBase:'TER_transformed_heatmap'},
        {key:'maxVg',plotId:'terMaxVgPlot',fileBase:'TER_Max-Vg'},
        {key:'maxVgArg',plotId:'terMaxVgArgPlot',fileBase:'Vd_at_TER_Max-Vg'},
        {key:'maxVd',plotId:'terMaxVdPlot',fileBase:'TER_Max-Vd'},
        {key:'maxVdArg',plotId:'terMaxVdArgPlot',fileBase:'Vg_at_TER_Max-Vd'}
      ];
    }

    function ensurePlotViews(){
      if(!ctx.ui.plotViews?.bind)return;
      const specs=[...chartSpecs(),{key:'resistance',plotId:'terResistancePlot',fileBase:'TER_resistance_voltage_all_Vg',prime:true}];
      for(const spec of specs){
        if(terPlotViews.has(spec.key))continue;
        const plot=dom.query(`#${spec.plotId}`);
        const card=plot?.closest('.analysis-chart-card');
        if(!plot||!card)continue;
        const header=card.querySelector(spec.prime?'.ter-resistance-card-header':'.analysis-chart-title');
        const title=(header?.querySelector('.ter-card-title-text')?.textContent||header?.textContent||spec.fileBase).trim();
        try{
          const view=ctx.ui.plotViews.bind(`ter:${spec.key}`,card,{
            plot,header,actionsHost:spec.prime?'.ter-chart-actions':null,portableTitle:title,
            fileStem:()=>spec.fileBase,
            csv:()=>exportSpec(spec.key)?.csv||'',
            portable:!spec.prime,
            placements:['home','left','right','bottom','float','global'],defaultPlacement:'home',stateVersion:'plot-view-v1',
            portableFactory:(id,node,pSpec)=>workbench?.portable?workbench.portable(id,node,pSpec):ctx.ui.portable.create(id,node,pSpec)
          });
          terPlotViews.set(spec.key,view);
        }catch(err){console.warn('[TER PlotView]',spec.key,err);}
      }
    }

    function heatmapCsv(result){
      const rows=['Vg_V,Vds_V,TER_percent'];
      for(let yi=0;yi<(result?.vgs||[]).length;yi++){
        for(let xi=0;xi<(result?.targets||[]).length;xi++){
          const value=result.matrix?.[yi]?.[xi];
          rows.push([result.vgs[yi],result.targets[xi],Number.isFinite(value)?value:''].join(','));
        }
      }
      return rows.join('\n');
    }

    function resistanceCsv(result){
      const rows=['Vg_V,Vds_V,R_forward_ohm,R_reverse_ohm,I_forward_A,I_reverse_A,TER_percent,source_file'];
      for(const d of (result?.records||[])){
        rows.push([d.vg,d.vds,d.rUp,d.rDown,d.iUp,d.iDown,d.ter,csvCell(d.sourceFile)].join(','));
      }
      return rows.join('\n');
    }

    function maxVgCsv(result){
      const rows=['Vg_V,TER_Max_Vg_percent,Vd_at_max_V,I_forward_A,I_reverse_A,R_forward_ohm,R_reverse_ohm,selection_mode,source_file'];
      for(const d of (result?.terMaxByVg||result?.terMax||[])){
        rows.push([d.vg,d.terMax,d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'manual':'auto',csvCell(d.sourceFile)].join(','));
      }
      return rows.join('\n');
    }

    function maxVgArgCsv(result){
      const rows=['Vg_V,Vd_at_TER_Max_Vg_V,TER_Max_Vg_percent,selection_mode,source_file'];
      for(const d of (result?.terMaxByVg||result?.terMax||[])){
        rows.push([d.vg,d.vdsAtMax,d.terMax,d.manual?'manual':'auto',csvCell(d.sourceFile)].join(','));
      }
      return rows.join('\n');
    }

    function maxVdCsv(result){
      const rows=['Vds_V,TER_Max_Vd_percent,Vg_at_max_V,I_forward_A,I_reverse_A,R_forward_ohm,R_reverse_ohm,selection_mode,source_file'];
      for(const d of (result?.terMaxByVd||[])){
        rows.push([d.vds,d.terMax,d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'manual':'auto',csvCell(d.sourceFile)].join(','));
      }
      return rows.join('\n');
    }

    function maxVdArgCsv(result){
      const rows=['Vds_V,Vg_at_TER_Max_Vd_V,TER_Max_Vd_percent,selection_mode,source_file'];
      for(const d of (result?.terMaxByVd||[])){
        rows.push([d.vds,d.vgAtMax,d.terMax,d.manual?'manual':'auto',csvCell(d.sourceFile)].join(','));
      }
      return rows.join('\n');
    }

    function exportSpec(key){
      const result=T.getState?.()?.result;
      if(!result)return null;
      const map={
        heatmap:{plotId:'terHeatmapPlot',fileBase:'TER_heatmap',csv:heatmapCsv(result)},
        transform:{plotId:'terTransformHeatmapPlot',fileBase:'TER_transformed_heatmap',csv:T.transformCsv?.()||''},
        resistance:{plotId:'terResistancePlot',fileBase:'TER_resistance_voltage_all_Vg',csv:resistanceCsv(result)},
        maxVg:{plotId:'terMaxVgPlot',fileBase:'TER_Max-Vg',csv:maxVgCsv(result)},
        maxVgArg:{plotId:'terMaxVgArgPlot',fileBase:'Vd_at_TER_Max-Vg',csv:maxVgArgCsv(result)},
        maxVd:{plotId:'terMaxVdPlot',fileBase:'TER_Max-Vd',csv:maxVdCsv(result)},
        maxVdArg:{plotId:'terMaxVdArgPlot',fileBase:'Vg_at_TER_Max-Vd',csv:maxVdArgCsv(result)}
      };
      return map[key]||null;
    }

    async function exportChartData(key){
      const spec=exportSpec(key);
      if(!spec?.csv)return;
      await ctx.io.saveText({
        defaultName:`${spec.fileBase}.csv`,
        content:spec.csv,
        filters:[{name:'CSV',extensions:['csv']}]
      });
      ctx.status.set(`已导出 ${spec.fileBase}.csv。`);
    }

    async function exportChartImage(key,format){
      const spec=exportSpec(key);
      if(!spec)return;
      await ctx.ui.scientificPlot.saveImage(spec.plotId,spec.fileBase,format);
      ctx.status.set(`已导出 ${spec.fileBase}.${format}。`);
    }

    if(!ctx.runtime.isAuxiliaryWindow&&ctx.ui.menus?.add){
      const menuRows=[
        ['ter-export-long','TER 全组合热图 · Long CSV',10,()=>T.exportLong?.()],
        ['ter-export-matrix','TER 全组合热图 · 矩阵 CSV',20,()=>T.exportMatrix?.()],
        ['ter-export-heatmap-svg','TER 全组合热图 · SVG',30,()=>T.exportHeatmapSvg?.()],
        ['ter-export-heatmap-png','TER 全组合热图 · PNG',40,()=>T.exportHeatmapPng?.()],
        ['ter-export-transform-csv','Vg–Vd 变换热图 · CSV',45,()=>exportChartData('transform')],
        ['ter-export-transform-svg','Vg–Vd 变换热图 · SVG',46,()=>exportChartImage('transform','svg')],
        ['ter-export-transform-png','Vg–Vd 变换热图 · PNG',47,()=>exportChartImage('transform','png')],
        ['ter-export-rv-csv','R–V 联动图 · CSV',60,()=>exportChartData('resistance')],
        ['ter-export-rv-svg','R–V 联动图 · SVG',70,()=>exportChartImage('resistance','svg')],
        ['ter-export-rv-png','R–V 联动图 · PNG',80,()=>exportChartImage('resistance','png')],
        ['ter-export-maxvg-csv','TER_Max–Vg · CSV',100,()=>exportChartData('maxVg')],
        ['ter-export-maxvg-svg','TER_Max–Vg · SVG',110,()=>exportChartImage('maxVg','svg')],
        ['ter-export-maxvg-png','TER_Max–Vg · PNG',120,()=>exportChartImage('maxVg','png')],
        ['ter-export-maxvd-csv','TER_Max–Vd · CSV',140,()=>exportChartData('maxVd')],
        ['ter-export-maxvd-svg','TER_Max–Vd · SVG',150,()=>exportChartImage('maxVd','svg')],
        ['ter-export-maxvd-png','TER_Max–Vd · PNG',160,()=>exportChartImage('maxVd','png')]
      ];
      for(const [id,label,order,onClick] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'ter',order,onClick});
    }

    function groupedResistanceRecords(result){
      const records=(result?.records||[]).filter(row=>Number.isFinite(row?.vg)&&Number.isFinite(row?.vds));
      const vgCounts=new Map();
      const uniqueSourcesByVg=new Map();
      for(const row of records){
        const vg=Number(row.vg);
        if(!uniqueSourcesByVg.has(vg))uniqueSourcesByVg.set(vg,new Set());
        uniqueSourcesByVg.get(vg).add(String(row.sourceFile||''));
      }
      for(const [vg,sources] of uniqueSourcesByVg)vgCounts.set(vg,sources.size);

      const groups=new Map();
      for(const row of records){
        const source=String(row.sourceFile||'');
        const key=`${Number(row.vg)}\u0000${source}`;
        if(!groups.has(key))groups.set(key,{vg:Number(row.vg),sourceFile:source,rows:[]});
        groups.get(key).rows.push(row);
      }
      return [...groups.values()]
        .map(g=>{
          const byVds=new Map();
          for(const row of g.rows){
            const key=Number(row.vds).toPrecision(15);
            if(!byVds.has(key))byVds.set(key,row);
          }
          g.rows=[...byVds.values()].sort((a,b)=>a.vds-b.vds);
          g.duplicateVg=(vgCounts.get(g.vg)||0)>1;
          return g;
        })
        .sort((a,b)=>(a.vg-b.vg)||a.sourceFile.localeCompare(b.sourceFile));
    }

    function groupIsSelected(group){
      if(!selectedTerPoint||!nearlyEqual(group.vg,selectedTerPoint.vg))return false;
      if(!selectedTerPoint.sourceFile)return true;
      return group.sourceFile===selectedTerPoint.sourceFile;
    }

    function colorForIndex(index,total){
      const n=Math.max(1,total);
      const hue=(210+(index*300/n))%360;
      return `hsl(${hue.toFixed(1)} 68% 46%)`;
    }

    function findSelectedRecord(result){
      if(!selectedTerPoint)return null;
      const records=result?.records||[];
      let candidates=records.filter(row=>nearlyEqual(row.vg,selectedTerPoint.vg)&&nearlyEqual(row.vds,selectedTerPoint.vds));
      if(selectedTerPoint.sourceFile){
        const exact=candidates.filter(row=>String(row.sourceFile||'')===selectedTerPoint.sourceFile);
        if(exact.length)candidates=exact;
      }
      return candidates[0]||null;
    }

    function numberKey(v){
      const n=finiteNumber(v);
      return n===null?'':n.toPrecision(15);
    }

    function maxVgRowFromRecord(row){
      return {
        vg:row.vg,
        terMax:row.ter,
        vdsAtMax:row.vds,
        iUp:row.iUp,
        iDown:row.iDown,
        rUp:row.rUp,
        rDown:row.rDown,
        sourceFile:row.sourceFile,
        manual:true
      };
    }

    function maxVdRowFromRecord(row){
      return {
        vds:row.vds,
        terMax:row.ter,
        vgAtMax:row.vg,
        iUp:row.iUp,
        iDown:row.iDown,
        rUp:row.rUp,
        rDown:row.rDown,
        sourceFile:row.sourceFile,
        manual:true
      };
    }

    function automaticMaximaFromRecords(result){
      const records=(result?.records||[]).filter(row=>Number.isFinite(row?.ter));
      const vgs=(result?.vgs||[...new Set(records.map(row=>row.vg))]).filter(Number.isFinite);
      const targets=(result?.targets||[...new Set(records.map(row=>row.vds))]).filter(Number.isFinite);
      const byVg=[];
      for(const vg of vgs){
        const rows=records.filter(row=>nearlyEqual(row.vg,vg));
        if(!rows.length)continue;
        let best=rows[0];
        for(const row of rows)if(row.ter>best.ter)best=row;
        const max=maxVgRowFromRecord(best);
        delete max.manual;
        byVg.push(max);
      }
      const byVd=[];
      for(const vds of targets){
        const rows=records.filter(row=>nearlyEqual(row.vds,vds));
        if(!rows.length)continue;
        let best=rows[0];
        for(const row of rows)if(row.ter>best.ter)best=row;
        const max=maxVdRowFromRecord(best);
        delete max.manual;
        byVd.push(max);
      }
      return {byVg,byVd};
    }

    function findRecordForDisplayedMax(result,displayed,axis){
      if(!displayed)return null;
      const vg=axis==='vg'?displayed.vg:displayed.vgAtMax;
      const vds=axis==='vg'?displayed.vdsAtMax:displayed.vds;
      let rows=(result?.records||[]).filter(row=>nearlyEqual(row.vg,vg)&&nearlyEqual(row.vds,vds)&&Number.isFinite(row.ter));
      const source=String(displayed.sourceFile||'');
      if(source){
        const exact=rows.filter(row=>String(row.sourceFile||'')===source);
        if(exact.length)rows=exact;
      }
      return rows[0]||null;
    }

    function displayedMaxDiffers(a,b,axis){
      if(!a||!b)return !!a!==!!b;
      if(axis==='vg')return !nearlyEqual(a.vdsAtMax,b.vdsAtMax)||!nearlyEqual(a.terMax,b.terMax)||String(a.sourceFile||'')!==String(b.sourceFile||'');
      return !nearlyEqual(a.vgAtMax,b.vgAtMax)||!nearlyEqual(a.terMax,b.terMax)||String(a.sourceFile||'')!==String(b.sourceFile||'');
    }

    function manualStateFor(result){
      if(!result||typeof result!=='object')return null;
      const cached=manualStateByResult.get(result);
      if(cached)return cached;
      const base=automaticMaximaFromRecords(result);
      const state={baseMaxVg:base.byVg,baseMaxVd:base.byVd,byVg:new Map(),byVd:new Map(),vgToVd:new Map()};
      const currentVg=result.terMaxByVg||result.terMax||[];
      for(const displayed of currentVg){
        const original=base.byVg.find(row=>nearlyEqual(row.vg,displayed.vg));
        if(displayedMaxDiffers(displayed,original,'vg')){
          const record=findRecordForDisplayedMax(result,displayed,'vg');
          if(record){
            state.byVg.set(numberKey(record.vg),record);
            state.vgToVd.set(numberKey(record.vg),numberKey(record.vds));
          }
        }
      }
      const currentVd=result.terMaxByVd||[];
      for(const displayed of currentVd){
        const original=base.byVd.find(row=>nearlyEqual(row.vds,displayed.vds));
        if(displayedMaxDiffers(displayed,original,'vd')){
          const record=findRecordForDisplayedMax(result,displayed,'vd');
          if(record)state.byVd.set(numberKey(record.vds),record);
        }
      }
      manualStateByResult.set(result,state);
      return state;
    }

    function applyManualState(result,state){
      if(!result||!state)return;
      const maxVg=state.baseMaxVg.map(base=>{
        const record=state.byVg.get(numberKey(base.vg));
        return record?maxVgRowFromRecord(record):{...base};
      });
      const maxVd=state.baseMaxVd.map(base=>{
        const record=state.byVd.get(numberKey(base.vds));
        return record?maxVdRowFromRecord(record):{...base};
      });
      result.terMaxByVg=maxVg;
      result.terMax=maxVg;
      result.terMaxByVd=maxVd;
    }

    function setManualMaximumAtRecord(result,row){
      const state=manualStateFor(result);
      if(!state||!row||!Number.isFinite(row.ter))return false;
      const vgKey=numberKey(row.vg);
      const vdsKey=numberKey(row.vds);
      const previousVdsKey=state.vgToVd.get(vgKey);
      if(previousVdsKey&&previousVdsKey!==vdsKey){
        const previous=state.byVd.get(previousVdsKey);
        if(previous&&nearlyEqual(previous.vg,row.vg))state.byVd.delete(previousVdsKey);
      }
      state.byVg.set(vgKey,row);
      state.vgToVd.set(vgKey,vdsKey);
      state.byVd.set(vdsKey,row);
      applyManualState(result,state);
      return true;
    }

    function selectedVgRecords(result){
      if(!selectedTerPoint)return [];
      let rows=(result?.records||[]).filter(row=>nearlyEqual(row.vg,selectedTerPoint.vg)&&Number.isFinite(row.ter));
      const source=String(selectedTerPoint.sourceFile||'');
      if(source){
        const exact=rows.filter(row=>String(row.sourceFile||'')===source);
        if(exact.length)rows=exact;
      }
      const byVds=new Map();
      for(const row of rows){
        const key=numberKey(row.vds);
        if(!byVds.has(key))byVds.set(key,row);
      }
      return [...byVds.values()].sort((a,b)=>a.vds-b.vds);
    }

    function renderReductionPlots(result){
      if(!result||!ctx.ui.scientificPlot)return;
      const maxVg=result.terMaxByVg||result.terMax||[];
      const maxVd=result.terMaxByVd||[];
      const config={responsive:true,scrollZoom:true,displaylogo:false};
      const react=(id,traces,layout)=>{
        const el=dom.query('#'+id);
        if(!el)return;
        try{ ctx.ui.scientificPlot.react(el,traces,layout,config,{interaction:T.interaction,source:'ter-reduction'}); }catch(err){ console.error(`[TER manual render:${id}]`,err); }
      };
      react('terMaxVgPlot',[{
        x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),mode:'lines+markers',line:{width:2},marker:{size:8},
        customdata:maxVg.map(d=>[d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'手动':'自动']),
        hovertemplate:'Vg=%{x}<br>TER_Max–Vg=%{y:.5g}%<br>Vd@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<br>%{customdata[5]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'TER_Max–Vg (%)',gridcolor:'#edf0f5'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vg-manual'
      });
      react('terMaxVgArgPlot',[{
        x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),mode:'lines+markers',line:{width:2},marker:{size:8},
        customdata:maxVg.map(d=>[d.terMax,d.manual?'手动':'自动']),
        hovertemplate:'Vg=%{x}<br>Vd@TER_Max–Vg=%{y:.5g} V<br>TER_Max=%{customdata[0]:.5g}%<br>%{customdata[1]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'Vd @ TER_Max–Vg (V)',gridcolor:'#edf0f5'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vg-arg-manual'
      });
      react('terMaxVdPlot',[{
        x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),mode:'lines+markers',line:{width:2},marker:{size:7},
        customdata:maxVd.map(d=>[d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'手动':'自动']),
        hovertemplate:'Vd=%{x}<br>TER_Max–Vd=%{y:.5g}%<br>Vg@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<br>%{customdata[5]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},yaxis:{title:'TER_Max–Vd (%)',gridcolor:'#edf0f5'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vd-manual'
      });
      react('terMaxVdArgPlot',[{
        x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.vgAtMax),mode:'lines+markers',line:{width:2},marker:{size:7},
        customdata:maxVd.map(d=>[d.terMax,d.manual?'手动':'自动']),
        hovertemplate:'Vd=%{x}<br>Vg@TER_Max–Vd=%{y:.5g} V<br>TER_Max=%{customdata[0]:.5g}%<br>%{customdata[1]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},yaxis:{title:'Vg @ TER_Max–Vd (V)',gridcolor:'#edf0f5'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vd-arg-manual'
      });

      const vgTable=dom.query('#terMaxVgTable');
      if(vgTable)vgTable.innerHTML=`
        <thead><tr><th>Vg (V)</th><th>TER_Max–Vg (%)</th><th>Vd@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th><th>方式</th></tr></thead>
        <tbody>${maxVg.map(d=>`<tr><td>${d.vg}</td><td>${Number(d.terMax).toPrecision(7)}</td><td>${d.vdsAtMax}</td><td>${Number(d.iUp).toExponential(6)}</td><td>${Number(d.iDown).toExponential(6)}</td><td>${Number(d.rUp).toExponential(6)}</td><td>${Number(d.rDown).toExponential(6)}</td><td>${d.manual?'手动':'自动'}</td></tr>`).join('')}</tbody>`;
      const vdTable=dom.query('#terMaxVdTable');
      if(vdTable)vdTable.innerHTML=`
        <thead><tr><th>Vd (V)</th><th>TER_Max–Vd (%)</th><th>Vg@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th><th>方式</th></tr></thead>
        <tbody>${maxVd.map(d=>`<tr><td>${d.vds}</td><td>${Number(d.terMax).toPrecision(7)}</td><td>${d.vgAtMax}</td><td>${Number(d.iUp).toExponential(6)}</td><td>${Number(d.iDown).toExponential(6)}</td><td>${Number(d.rUp).toExponential(6)}</td><td>${Number(d.rDown).toExponential(6)}</td><td>${d.manual?'手动':'自动'}</td></tr>`).join('')}</tbody>`;
    }

    function moveSelectedTerPoint(step){
      const result=T.getState?.()?.result;
      if(!result||!selectedTerPoint)return false;
      const rows=selectedVgRecords(result);
      if(!rows.length)return false;
      let index=rows.findIndex(row=>nearlyEqual(row.vds,selectedTerPoint.vds));
      if(index<0){
        let best=0,bestDistance=Infinity;
        rows.forEach((row,i)=>{
          const distance=Math.abs(row.vds-selectedTerPoint.vds);
          if(distance<bestDistance){bestDistance=distance;best=i;}
        });
        index=best;
      }
      const next=Math.max(0,Math.min(rows.length-1,index+(step<0?-1:1)));
      if(next===index){
        ctx.status.set(`当前 Vg=${formatNumber(selectedTerPoint.vg)} V 的 TER 标记已到 ${step<0?'最左':'最右'}有效 Vds 点。`);
        return true;
      }
      const row=rows[next];
      selectedTerPoint={
        vg:row.vg,vds:row.vds,rUp:row.rUp,rDown:row.rDown,ter:row.ter,
        sourceFile:String(row.sourceFile||''),manual:true
      };
      if(!setManualMaximumAtRecord(result,row))return false;
      renderReductionPlots(result);
      renderResistancePlot();
      bindLinkedPlotClicks();
      resizeTerPlots();
      ctx.project.capture?.();
      ctx.status.set(`已手动设定 TER_Max：Vg=${formatNumber(row.vg)} V，Vds=${formatNumber(row.vds)} V，TER=${formatNumber(row.ter)}%。该 Vg 与该 Vd 的 TER_Max 已同步更新。`);
      return true;
    }

    function bindKeyboardAdjuster(){
      if(keyboardContributionsBound)return;
      keyboardContributionsBound=true;
      const invoke=step=>{
        const page=dom.query('#terMaxPage');
        if(!page||page.classList.contains('hidden')||!selectedTerPoint)return false;
        return moveSelectedTerPoint(step);
      };
      ctx.ui.shortcuts.add({id:'ter-manual-max-left',activity:'ter',key:'Ctrl+ArrowLeft',priority:320,handler:()=>invoke(-1)});
      ctx.ui.shortcuts.add({id:'ter-manual-max-right',activity:'ter',key:'Ctrl+ArrowRight',priority:320,handler:()=>invoke(1)});
    }

    function unbindKeyboardAdjuster(){
      // Shortcut contributions are owned by the plugin kernel and are removed
      // atomically with the rest of the plugin lifecycle.
      keyboardContributionsBound=false;
    }

    function updateSelectionText(result){
      const el=dom.query('#terResistanceSelection');
      if(!el)return;
      if(!selectedTerPoint){
        controller?.clearSelection?.({source:'ter-linked-selection'});
        el.textContent='尚未选择 TER 数据点；当前显示全部栅压下的正扫/反扫 R–V 曲线。';
        return;
      }
      const row=findSelectedRecord(result)||selectedTerPoint;
      controller?.select?.({...selectedTerPoint,...row},{source:'ter-linked-selection'});
      const source=row?.sourceFile||selectedTerPoint.sourceFile||'';
      const ter=finiteNumber(row?.ter??selectedTerPoint.ter);
      const manual=selectedTerPoint.manual?'；<strong>手动 TER_Max</strong>':'';
      el.innerHTML=`<strong>当前联动：</strong> Vg=${formatNumber(selectedTerPoint.vg)} V，Vds=${formatNumber(selectedTerPoint.vds)} V，TER=${formatNumber(ter)}%；正扫 R=${formatNumber(row?.rUp)} Ω，反扫 R=${formatNumber(row?.rDown)} Ω${manual}${source?`；${String(source).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}`:''}`;
    }

    function renderResistancePlot(){
      const card=ensureResistanceCard();
      const plot=dom.query('#terResistancePlot');
      const state=T.getState?.();
      const result=state?.result||null;
      if(!card||!plot||!ctx.ui.scientificPlot)return;

      syncResultRevision();

      if(!result){
        try{ ctx.ui.scientificPlot.purge(plot); }catch(_err){}
        controller?.clearSelection?.({source:'ter-result-cleared'});
        const label=dom.query('#terResistanceSelection');
        if(label)label.textContent='计算 TER_max 后显示全部栅压的正扫/反扫 R–V 曲线。';
        return;
      }

      const groups=groupedResistanceRecords(result);
      if(selectedTerPoint&&!groups.some(group=>nearlyEqual(group.vg,selectedTerPoint.vg))){
        selectedTerPoint=null;
      }
      const traces=[];
      groups.forEach((group,index)=>{
        const color=colorForIndex(index,groups.length);
        const isSelected=groupIsSelected(group);
        const dimmed=!!selectedTerPoint&&!isSelected;
        const vgLabel=`Vg=${formatNumber(group.vg)} V${group.duplicateVg&&group.sourceFile?` · ${group.sourceFile}`:''}`;
        const common={
          mode:'lines',
          legendgroup:`vg-${index}`,
          hoverlabel:{namelength:-1},
          opacity:dimmed?0.09:(isSelected?1:0.58)
        };
        const up=group.rows.filter(row=>Number.isFinite(row.rUp)&&row.rUp>0);
        const down=group.rows.filter(row=>Number.isFinite(row.rDown)&&row.rDown>0);
        traces.push({
          ...common,
          x:up.map(row=>row.vds),y:up.map(row=>row.rUp),
          name:vgLabel,
          line:{color,width:isSelected?3.2:1.5,dash:'solid'},
          customdata:up.map(row=>[group.vg,row.sourceFile||'',row.iUp,row.ter]),
          hovertemplate:'Vg=%{customdata[0]:.6g} V<br>正扫（Vds 递增）<br>Vds=%{x:.6g} V<br>R=%{y:.6g} Ω<br>I=%{customdata[2]:.6g} A<br>TER=%{customdata[3]:.6g}%<extra>%{customdata[1]}</extra>'
        });
        traces.push({
          ...common,
          x:down.map(row=>row.vds),y:down.map(row=>row.rDown),
          name:`${vgLabel} · 反扫`,
          showlegend:false,
          line:{color,width:isSelected?3.2:1.5,dash:'dash'},
          customdata:down.map(row=>[group.vg,row.sourceFile||'',row.iDown,row.ter]),
          hovertemplate:'Vg=%{customdata[0]:.6g} V<br>反扫（Vds 递减）<br>Vds=%{x:.6g} V<br>R=%{y:.6g} Ω<br>I=%{customdata[2]:.6g} A<br>TER=%{customdata[3]:.6g}%<extra>%{customdata[1]}</extra>'
        });
      });

      const selectedRow=findSelectedRecord(result);
      if(selectedTerPoint){
        const vds=finiteNumber(selectedTerPoint.vds);
        const rUp=finiteNumber(selectedRow?.rUp??selectedTerPoint.rUp);
        const rDown=finiteNumber(selectedRow?.rDown??selectedTerPoint.rDown);
        if(vds!==null&&rUp!==null&&rUp>0){
          traces.push({
            x:[vds],y:[rUp],mode:'markers',showlegend:false,hoverinfo:'text',
            marker:{size:12,color:'#dc2626',symbol:'circle',line:{color:'#fff',width:1.5}},
            text:[`正扫选中点<br>Vg=${formatNumber(selectedTerPoint.vg)} V<br>Vds=${formatNumber(vds)} V<br>R=${formatNumber(rUp)} Ω<br>TER=${formatNumber(selectedRow?.ter??selectedTerPoint.ter)}%`]
          });
        }
        if(vds!==null&&rDown!==null&&rDown>0){
          traces.push({
            x:[vds],y:[rDown],mode:'markers',showlegend:false,hoverinfo:'text',
            marker:{size:12,color:'#dc2626',symbol:'diamond',line:{color:'#fff',width:1.5}},
            text:[`反扫选中点<br>Vg=${formatNumber(selectedTerPoint.vg)} V<br>Vds=${formatNumber(vds)} V<br>R=${formatNumber(rDown)} Ω<br>TER=${formatNumber(selectedRow?.ter??selectedTerPoint.ter)}%`]
          });
        }
      }

      const shapes=[];
      if(selectedTerPoint&&finiteNumber(selectedTerPoint.vds)!==null){
        shapes.push({
          type:'line',xref:'x',yref:'paper',x0:selectedTerPoint.vds,x1:selectedTerPoint.vds,y0:0,y1:1,
          line:{color:'#dc2626',width:1,dash:'dot'}
        });
      }

      updateSelectionText(result);
      ctx.ui.scientificPlot.react(plot,traces,{
        margin:{l:82,r:24,t:22,b:92},
        xaxis:{title:'Vds (V)',gridcolor:'#edf0f5',zeroline:true,zerolinecolor:'#cbd5e1',automargin:true},
        yaxis:{title:'R = |Vds / I| (Ω)',type:'log',gridcolor:'#edf0f5',automargin:true},
        legend:{orientation:'h',x:0,y:-0.23,xanchor:'left',yanchor:'top',font:{size:10},groupclick:'togglegroup'},
        hovermode:'closest',
        dragmode:'zoom',
        autosize:true,
        shapes,
        uirevision:`ter-resistance-${resultRevision}`
      },{
        responsive:true,scrollZoom:true,displaylogo:false,
        modeBarButtonsToAdd:['select2d'],
        toImageButtonOptions:{format:'png',filename:'TER_resistance_voltage',width:1400,height:1000,scale:2}
      },{interaction:T.interaction,source:'ter-resistance',renderKey:`ter-resistance:${resultRevision}:${selectedTerPoint?.id||''}`});
    }

    function selectionFromMaxVg(row){
      if(!row)return null;
      return {
        vg:row.vg,
        vds:row.vdsAtMax,
        rUp:row.rUp,
        rDown:row.rDown,
        ter:row.terMax,
        manual:!!row.manual,
        sourceFile:String(row.sourceFile||'')
      };
    }

    function selectionFromMaxVd(row){
      if(!row)return null;
      return {
        vg:row.vgAtMax,
        vds:row.vds,
        rUp:row.rUp,
        rDown:row.rDown,
        ter:row.terMax,
        manual:!!row.manual,
        sourceFile:String(row.sourceFile||'')
      };
    }

    function attachReductionSelection(plotId,rowProvider,selectionFactory){
      const el=dom.query('#'+plotId);if(!el)return null;
      return ctx.ui.scientificPlot.attach(el,{interaction:T.interaction,source:`ter-${plotId}`,onClick:event=>{
        const point=event?.points?.[0],index=Number(point?.pointIndex??point?.pointNumber);
        if(!Number.isInteger(index)||index<0)return;
        const selection=selectionFactory(rowProvider()[index]);if(!selection)return;
        selection.id=selection.id||`${plotId}:${selection.vg??''}:${selection.vds??''}`;selection.selectionType='ter.max-point';
        selectTerPoint(selection,`ter-${plotId}`);
      }});
    }

    function attachHeatmapSelection(result){
      const el=dom.query('#terHeatmapPlot');if(!el)return null;
      return ctx.ui.scientificPlot.attach(el,{interaction:T.interaction,source:'ter-heatmap',onClick:event=>{
        const point=event?.points?.[0],vg=finiteNumber(point?.y),vds=finiteNumber(point?.x);if(vg===null||vds===null)return;
        const row=(result.records||[]).find(item=>nearlyEqual(item.vg,vg)&&nearlyEqual(item.vds,vds));
        selectTerPoint({vg,vds,rUp:row?.rUp,rDown:row?.rDown,ter:row?.ter,sourceFile:String(row?.sourceFile||''),id:`ter:${vg}:${vds}`,selectionType:'ter.matrix-point'},'ter-heatmap');
      }});
    }

    function bindLinkedPlotClicks(){
      const result=T.getState?.()?.result;if(!result)return;
      const maxVg=()=>result.terMaxByVg||result.terMax||[],maxVd=()=>result.terMaxByVd||[];
      attachReductionSelection('terMaxVgPlot',maxVg,selectionFromMaxVg);
      attachReductionSelection('terMaxVgArgPlot',maxVg,selectionFromMaxVg);
      attachReductionSelection('terMaxVdPlot',maxVd,selectionFromMaxVd);
      attachReductionSelection('terMaxVdArgPlot',maxVd,selectionFromMaxVd);
      attachHeatmapSelection(result);
    }

    function syncResultRevision(){
      const result=T.getState?.()?.result||null;
      if(result!==lastResult){
        lastResult=result;
        resultRevision++;
        selectedTerPoint=null;
      }
      return result;
    }

    function renderLinkedUi(){
      syncResultRevision();
      ensureLayoutControls();
      ensureTransformControls();
      ensureResistanceCard();
      ensurePlotViews();
      applyLayoutSettings();
      renderTransformHeatmap();
      renderResistancePlot();
      bindLinkedPlotClicks();
    }

    function queueLinkedRender(){
      const ticket=++renderTicket;
      const run=()=>{
        if(ticket!==renderTicket)return;
        renderLinkedUi();
        // Plotly.newPlot in the legacy TER renderer is promise-based. Rebind once
        // more after the current frame so links survive a fresh plot rebuild.
        dom.frame(()=>{
          if(ticket!==renderTicket)return;
          bindLinkedPlotClicks();
          resizeTerPlots();
        });
      };
      dom.frame(run);
    }


    const pageHtml=sharedViews?.pageHtml?.()||'';

    ctx.ui.activities.add({
      id:'ter',label:'TER分析',contextLabel:'TER 分析',icon:'▧',order:30,openMode:'window',
      description:'同 Vd TER 矩阵与极值分析',
      onActivate:()=>{ctx.workspace.openPage('terMaxPage');T.render();}
    });

    const page=ctx.ui.pages.add({
      id:'ter-max',
      pageId:'terMaxPage',
      activity:'ter',
      toolbar:false,
      label:'TER_max',
      order:50,
      html:pageHtml,
      onOpen:()=>T.render()
    });

    workbench=sharedViews?.attach?.(ctx,page)||null;
    const terGrid=page.querySelector('.ter-chart-grid');
    // An explicit TER layout choice is authoritative. Responsive clamping made
    // e.g. “6 列 × 1 行” silently collapse back to 3 columns on normal screens,
    // which looked like a dead button. The surrounding workbench owns overflow.
    if(workbench?.grid&&terGrid)gridController=workbench.grid(terGrid,{columns:layoutSettings.cols,minItemWidth:260,maxColumns:7,responsive:false});
    if(workbench?.registerPrime){
      workbench.registerPrime({
        id:'resistance-inspector',label:'R–V 联动',title:'全部 Vg 的电阻–电压',node:'#terResistanceCard',inlineHost:'.ter-chart-grid',handle:'.ter-resistance-card-header',controlsHost:'.ter-chart-actions',
        defaultPlacement:layoutSettings.sticky?'sticky':'inline',placements:['inline','sticky','right','bottom','float','global'],autoOpen:true,
        onPlacementChanged:({placement})=>{layoutSettings.sticky=placement==='sticky';syncLayoutControls();ctx.project.capture?.();},
        mount:()=>{ensureResistanceCard();renderResistancePlot();}
      });
    }
    const terHeader=page.querySelector('.analysis-page-header');
    const terHeaderActionsHost=dom.create('div');
    terHeaderActionsHost.className='dkds-plugin-header-actions';
    terHeader?.querySelector('.analysis-page-close')?.before(terHeaderActionsHost);
    const terHeaderActions=ctx.ui.actions?.mount?.(terHeaderActionsHost,{
      activity:'ter',
      actions:[
        {id:'auto',icon:'↻',label:'自动参数',order:10,onInvoke:()=>T.autoParameters()},
        {id:'calculate',icon:'∑',label:'计算 TER',className:'primary',order:20,shortcut:'Ctrl+Enter',onInvoke:()=>T.calculate()},
        {id:'layout',icon:'▦',label:'布局',menu:true,order:30,items:()=>[
          {id:'3x3',icon:'▦',label:'3 列 × 3 行（默认）',onInvoke:()=>setCols(3)},
          {id:'4x2',icon:'▦',label:'4 列 × 2 行',onInvoke:()=>setCols(4)},
          {id:'2x4',icon:'▦',label:'2 列 × 4 行',onInvoke:()=>setCols(2)},
          {id:'1x7',icon:'▤',label:'1 列 × 7 行',onInvoke:()=>setCols(1)},
          {id:'7x1',icon:'▥',label:'7 列 × 1 行',onInvoke:()=>setCols(7)},
          {type:'separator'},
          {id:'sticky',icon:layoutSettings.sticky?'✓':'',label:`R–V 随滚动吸附：${layoutSettings.sticky?'开':'关'}`,onInvoke:()=>setSticky(!layoutSettings.sticky)}
        ]}
      ]
    });

    ctx.ui.topWorkspace.register({
      id:'ter',activity:'ter',label:'TER 分析',icon:'▧',
      layout:{
        mode:'native',root:{selector:'#terMaxPage .dkds-plugin-workbench-root'},
        primary:{id:'main',role:'analysis-primary'},prime:[{id:'resistance-inspector'}],sub:[]
      }
    });

    page.querySelector('#terApplyDisplayBtn').onclick=()=>T.applyDisplay();
    page.querySelector('#terResetDisplayBtn').onclick=()=>T.resetDisplay();
    page.querySelector('#terOnlyFullyVisible').onchange=e=>T.setOnlyFullyVisible(e.target.checked);

    page.querySelector('#terExportLongBtn').onclick=()=>T.exportLong();
    page.querySelector('#terCopyLongBtn').onclick=()=>T.copyLong();
    page.querySelector('#terExportMatrixBtn').onclick=()=>T.exportMatrix();
    page.querySelector('#terCopyMatrixBtn').onclick=()=>T.copyMatrix();
    page.querySelector('#terExportHeatmapSvgBtn')?.addEventListener('click',()=>T.exportHeatmapSvg());
    page.querySelector('#terExportHeatmapPngBtn')?.addEventListener('click',()=>T.exportHeatmapPng());

    page.querySelector('#terExportMaxVgBtn')?.addEventListener('click',()=>T.exportMaxVg());
    page.querySelector('#terCopyMaxVgBtn')?.addEventListener('click',()=>T.copyMaxVg());
    page.querySelector('#terExportMaxVgSvgBtn')?.addEventListener('click',()=>T.exportMaxVgSvg());
    page.querySelector('#terExportMaxVgPngBtn')?.addEventListener('click',()=>T.exportMaxVgPng());

    page.querySelector('#terExportMaxVdBtn')?.addEventListener('click',()=>T.exportMaxVd());
    page.querySelector('#terCopyMaxVdBtn')?.addEventListener('click',()=>T.copyMaxVd());
    page.querySelector('#terExportMaxVdSvgBtn')?.addEventListener('click',()=>T.exportMaxVdSvg());
    page.querySelector('#terExportMaxVdPngBtn')?.addEventListener('click',()=>T.exportMaxVdPng());

    ctx.events.on('analysis:refresh',({id})=>{if(id==='terMaxPage'){T.render();terHeaderActions?.render?.();queueLinkedRender();}});

    // Dedicated-window persistence is namespaced by plugin. This slice is the
    // canonical TER cache; legacy root-level TER fields are migration input.
    ctx.project.registerSlice('workspace',{
      serialize:()=>T.serialize(),
      restore:(data,{legacyProject})=>T.restore(data,{legacyProject}),
      reset:()=>T.reset()
    });

    ctx.project.registerSlice('layout',{
      serialize:()=>({...layoutSettings}),
      restore:saved=>{layoutSettings=sanitizeLayout(saved);applyLayoutSettings();},
      reset:()=>{layoutSettings={rows:3,cols:3,sticky:true};applyLayoutSettings();}
    });

    ctx.events.on('layout:resize',()=>{
      for(const id of ['terHeatmapPlot','terTransformHeatmapPlot','terResistancePlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
        const el=dom.query('#'+id);
        if(el&&el.offsetParent!==null){try{ctx.ui.scientificPlot.resize(el);}catch{}}
      }
    });

    ctx.analysis.providers.register('ter',{
      id:'ter',
      name:'Same-Vd TER',
      computeMatrix:(datasets,settings={})=>{const ref=T.getState?.()?.algorithmRef||{category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'};return ctx.analysis.algorithms.run(ref,datasets,{category:'ter-analysis',parameters:{settings}});},
      computeResonant:window.DKDSScience.computeResonantTerForLabel
    });

    const summary=dom.query('#terSummary');
    if(summary){
      const off=dom.observe(summary,()=>queueLinkedRender(),{mutation:{childList:true,subtree:true,characterData:true}});
      observer={disconnect:off};
    }
    ctx.events.on('analysis:opened',({id})=>{if(id==='terMaxPage')queueLinkedRender();});
    ctx.events.on('project:restored',()=>queueLinkedRender());
    ensureLayoutControls();
    ensureTransformControls();
    ensureResistanceCard();
    ensurePlotViews();
    applyLayoutSettings();
    bindKeyboardAdjuster();

    return {deactivate(){
      observer?.disconnect();observer=null;
      transformPanel?.destroy?.();transformPanel?.dispose?.();transformPanel=null;
      unbindKeyboardAdjuster();
      const plot=dom.query('#terResistancePlot');
      if(plot&&ctx.ui.scientificPlot){try{ctx.ui.scientificPlot.purge(plot);}catch{}}
      for(const view of terPlotViews.values())view?.dispose?.();
      terPlotViews.clear();
      const resistanceCard=dom.query('#terResistanceCard');
      if(resistanceCard){
        const clearBtn=resistanceCard.querySelector('#terResistanceClearBtn');
        if(clearBtn)clearBtn.onclick=null;delete resistanceCard.dataset.terBound;
      }
    }};
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','feature-runtime',Object.freeze({mount}));
})();
