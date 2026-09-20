(() => {
  async function mount(ctx,controller=null,adapter={}){
    const featureUtils=window.DKDSPluginModules.require('builtin.ter-analysis','feature-utils');
    const SelectionLink=window.DKDSPluginModules.require('builtin.ter-analysis','selection-link-runtime');
    const {finiteNumber,nearlyEqual,formatNumber,csvCell,sanitizeLayout,heatmapCsv,resistanceCsv,maxVgCsv,maxVgArgCsv,maxVdCsv,maxVdArgCsv}=featureUtils;
    const dom=ctx.ui.dom;
    const T=controller;
    if(!SelectionLink?.create)throw new Error('TER selection-link runtime is unavailable.');
    const selectionLink=SelectionLink.create({sourceScanReference:(vg,source,direction)=>T?.sourceScanReference?.(vg,source,direction)||null,nearlyEqual,selectionReferences:ctx.ui.selection?.refs||null});
    const CHART_COUNT=7;
    const GRID_COLUMNS=[1,2,3,4,7];
    const DOMAIN_FOCUS={focus:{enabled:false}};
    let selectedTerPoint=null;
    let lastResult=null;
    let resultRevision=0;
    let renderTicket=0;
    const reactive=ctx.data.reactive||null;
    let reactiveBindingsInstalled=false;
    let resistanceBaseRevision=-1;
    let resistanceGroups=[];
    let resistanceBaseTraceCount=0;
    const manualStateByResult=new WeakMap();
    let keyboardContributionsBound=false;
    const terPlotViews=new Map();
    let workbench=null;
    let gridController=null;
    let layoutSettings={version:3,rows:3,cols:3};
    let terHeaderActions=null;
    let transformPanel=null;
    let presentation=null;
    let canonicalSelectionOff=null;

    function syncLayoutControls(){
      const rows=dom.query('#terLayoutRows');
      const cols=dom.query('#terLayoutCols');
      if(rows)rows.value=String(layoutSettings.rows);
      if(cols)cols.value=String(layoutSettings.cols);
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
      else if(grid)dom.token(grid,{'--dkds-grid-columns':String(layoutSettings.cols)});
      syncLayoutControls();
      resizeTerPlots();
      if(capture)ctx.project.capture?.();
    }

    function setCols(cols){
      const n=Number(cols);
      if(!GRID_COLUMNS.includes(n))return;
      layoutSettings.cols=n;
      layoutSettings.rows=Math.max(1,Math.ceil(CHART_COUNT/n));
      applyLayoutSettings({capture:true});
      ctx.status.set(`TER 图表布局：${layoutSettings.rows} 行 × ${layoutSettings.cols} 列。`);
    }


    function ensureLayoutControls(){
      syncLayoutControls();
      return null;
    }

    function ensureResistanceCard(){
      const card=dom.query('#terResistanceCard');
      if(!card)return null;
      syncLayoutControls();
      return card;
    }

    function transformOptions(){
      const rows=ctx.data.transforms?.list?.({supportsScalarField:true})||T.listTransforms?.()||[];
      return rows.filter(row=>row?.id&&row?.public!==false&&(!row.tags?.length||row.tags.includes('transport'))).map(row=>({value:String(row.id),label:String(row.title||row.label||row.id)}));
    }
    function ensureTransformControls(){
      if(!presentation?.transformForm)throw new Error('TER Unit presentation did not provide the transform ParameterForm.');
      transformPanel=presentation.transformForm;
      return transformPanel;
    }

    function selectTerPoint(selection,source='ter-plot',options={}){
      if(!selection)return null;
      selectedTerPoint=selection;
      if(options.publish!==false)controller?.select?.({...selection,selectionType:selection.selectionType||'ter.matrix-point',id:selection.id||`${selection.vg??''}:${selection.vds??''}:${selection.axis||''}`},{source});
      // Direct chart clicks update R–V synchronously; reactive signals remain for transactional edits.
      applyResistanceSelection();
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
      const sourceScans=(matrix.vgs||[]).map((vg,index)=>{const ref=T.sourceScanReference?.(vg,matrix.sources?.[index],matrix.direction);return ref?{ref,type:'data.sweep',role:'source-scan',meta:{label:`${matrix.sources?.[index]||'source'} · ${directionLabel}`}}:null;});
      const field={x:matrix.targets,y:matrix.vgs,z:matrix.matrix,xName:'Vds',yName:'Vg',valueName:matrix.label||matrix.type,xUnit:'V',yUnit:'V',valueUnit:matrix.unit||'',diverging:signed,sourceScans,sourceScanType:'data.sweep',metadata:{scientificTransform:{diverging:signed}}};
      const render=ctx.ui.scientificPlot.scalarField(plot,field,{colorscale:signed?'RdBu':'Viridis',reversescale:signed,zmid:signed?0:undefined,xDimension:'voltage',yDimension:'voltage',xQuantity:'drain-source-voltage',yQuantity:'gate-voltage',viewportPolicy:{link:true,linkGroup:'ter-vds-viewport',linkedAxes:['x']},
        hovertemplate:`Vg=%{y:.6g} V<br>Vds=%{x:.6g} V<br>${matrix.label||matrix.type}=%{z:.6g}${matrix.unit?` ${matrix.unit}`:''}<extra>${directionLabel}</extra>`,
        xaxis:{title:'Vds (V)',showgrid:false},yaxis:{title:'Vg (V)',showgrid:false},
        layout:{uirevision:`ter-transform-${matrix.type}-${matrix.direction}`},interaction:T.interaction,controllers:DOMAIN_FOCUS,source:'ter-transform-heatmap',renderKey:`ter-transform:${resultRevision}:${matrix.type}:${matrix.direction}:${matrix.missing}`,renderPriority:'idle',onClick:event=>selectTerPoint(transformHeatmapSelection(matrix,event),'ter-transform-heatmap',{publish:false})});
      render?.catch?.(err=>console.warn('[TER transformed heatmap]',err));
      return matrix;
    }

    function ensurePlotViews(){
      if(!presentation?.plotViews?.size)throw new Error('TER Unit presentation did not provide PlotViews.');
      for(const [key,view] of presentation.plotViews)if(!terPlotViews.has(key))terPlotViews.set(key,view);
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
      const hasTerExport=()=>Array.isArray(T.getState?.()?.result?.records)&&T.getState().result.records.length>0;
      for(const [id,label,order,onClick] of menuRows)ctx.ui.menus.add({id,menu:'export',label,activity:'ter',order,onClick,availability:hasTerExport});
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
      const currentVg=result.terMaxByVg||[];
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

    function renderTerHeatmap(result){
      const plot=dom.query('#terHeatmapPlot');if(!plot||!result||!ctx.ui.scientificPlot)return null;
      const state=T.getState?.()||{},display=state.display||{};
      const vals=(result.matrix||[]).flat().filter(Number.isFinite),autoMin=vals.length?Math.min(...vals):0,autoMax=vals.length?Math.max(...vals):1;
      const zmin=finiteNumber(display.zmin)??autoMin,zmax=finiteNumber(display.zmax)??autoMax;
      const sourceScans=selectionLink.sourceScans(result);
      const field={x:result.targets||[],y:result.vgs||[],z:result.matrix||[],xName:'Vds',yName:'Vg',valueName:'TER',xUnit:'V',yUnit:'V',valueUnit:'%',diverging:false,sourceScans,sourceScanType:'data.sweep'};
      const rendered=ctx.ui.scientificPlot.scalarField(plot,field,{colorscale:display.colorscale||'Viridis',zmin,zmax,xDimension:'voltage',yDimension:'voltage',xQuantity:'drain-source-voltage',yQuantity:'gate-voltage',viewportPolicy:{link:true,linkGroup:'ter-vds-viewport',linkedAxes:['x']},
        hovertemplate:'Vg=%{y:.6g} V<br>Vds=%{x:.6g} V<br>TER=%{z:.6g}%<extra></extra>',
        colorbar:{title:{text:'TER (%)',side:'right'},thickness:18,len:.86,tickmode:display.colorDtick?'linear':'auto',dtick:display.colorDtick||undefined},
        xaxis:{title:'Vds (V)',tickmode:display.xDtick?'linear':'auto',dtick:display.xDtick||undefined,automargin:true,constrain:'domain',showgrid:false},
        yaxis:{title:'Vg (V)',tickmode:display.yDtick?'linear':'auto',dtick:display.yDtick||undefined,automargin:true,constrain:'domain',showgrid:false},
        config:{responsive:true,scrollZoom:true,displaylogo:false,toImageButtonOptions:{format:'png',filename:'TER_heatmap',width:1400,height:900,scale:2}},
        layout:{uirevision:`ter-heatmap-${resultRevision}`},interaction:T.interaction,controllers:DOMAIN_FOCUS,source:'ter-heatmap',renderKey:`ter-heatmap:${resultRevision}`,renderPriority:'frame',
        onClick:event=>{const point=event?.points?.[0],vg=finiteNumber(point?.y),vds=finiteNumber(point?.x);if(vg===null||vds===null)return;const row=(result.records||[]).find(item=>nearlyEqual(item.vg,vg)&&nearlyEqual(item.vds,vds));selectTerPoint({vg,vds,rUp:row?.rUp,rDown:row?.rDown,ter:row?.ter,sourceFile:String(row?.sourceFile||''),id:`ter:${vg}:${vds}`,selectionType:'ter.matrix-point'},'ter-heatmap',{publish:false});}
      });
      rendered?.catch?.(err=>console.warn('[TER heatmap]',err));return rendered;
    }

    function renderReductionPlots(result){
      if(!result||!ctx.ui.scientificPlot)return;
      const maxVg=result.terMaxByVg||[];
      const maxVd=result.terMaxByVd||[];
      const config={responsive:true,scrollZoom:true,displaylogo:false};
      const react=(id,traces,layout,onClick,pointEntity)=>{
        const el=dom.query('#'+id);if(!el)return;
        try{ctx.ui.scientificPlot.react(el,traces,layout,config,{interaction:T.interaction,source:`ter-${id}`,renderKey:`ter-reduction:${resultRevision}:${id}:${reactive?.revision?.('ter.maxima')||0}`,renderPriority:'idle',onClick,pointEntity});}catch(err){console.error(`[TER reduction render:${id}]`,err);}
      };
      const clickRow=(rows,factory,plotId)=>event=>{const point=event?.points?.[0],index=Number(point?.pointIndex??point?.pointNumber);if(!Number.isInteger(index)||index<0)return;const selection=factory(rows[index]);if(!selection)return;selection.id=selection.id||`${plotId}:${selection.vg??''}:${selection.vds??''}`;selection.selectionType='ter.max-point';selectTerPoint(selection,`ter-${plotId}`,{publish:false});};
      const pointEntity=(rows,factory)=>({pointIndex})=>selectionLink.sourceScanEntity(factory(rows?.[Number(pointIndex)]));
      react('terMaxVgPlot',[{
        x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),mode:'lines+markers',line:{width:2},marker:{size:8},
        customdata:maxVg.map(d=>[d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'手动':'自动']),
        hovertemplate:'Vg=%{x}<br>TER_Max–Vg=%{y:.5g}%<br>Vd@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<br>%{customdata[5]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vg (V)'},yaxis:{title:'TER_Max–Vg (%)'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vg-manual'
      },clickRow(maxVg,selectionFromMaxVg,'terMaxVgPlot'),pointEntity(maxVg,selectionFromMaxVg));
      react('terMaxVgArgPlot',[{
        x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),mode:'lines+markers',line:{width:2},marker:{size:8},
        customdata:maxVg.map(d=>[d.terMax,d.manual?'手动':'自动']),
        hovertemplate:'Vg=%{x}<br>Vd@TER_Max–Vg=%{y:.5g} V<br>TER_Max=%{customdata[0]:.5g}%<br>%{customdata[1]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vg (V)'},yaxis:{title:'Vd @ TER_Max–Vg (V)'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vg-arg-manual'
      },clickRow(maxVg,selectionFromMaxVg,'terMaxVgArgPlot'),pointEntity(maxVg,selectionFromMaxVg));
      react('terMaxVdPlot',[{
        x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),mode:'lines+markers',line:{width:2},marker:{size:7},
        customdata:maxVd.map(d=>[d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown,d.manual?'手动':'自动']),
        hovertemplate:'Vd=%{x}<br>TER_Max–Vd=%{y:.5g}%<br>Vg@max=%{customdata[0]:.5g} V<br>I_up=%{customdata[1]:.5g} A<br>I_down=%{customdata[2]:.5g} A<br>%{customdata[5]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vd (V)'},yaxis:{title:'TER_Max–Vd (%)'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vd-manual'
      },clickRow(maxVd,selectionFromMaxVd,'terMaxVdPlot'),pointEntity(maxVd,selectionFromMaxVd));
      react('terMaxVdArgPlot',[{
        x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.vgAtMax),mode:'lines+markers',line:{width:2},marker:{size:7},
        customdata:maxVd.map(d=>[d.terMax,d.manual?'手动':'自动']),
        hovertemplate:'Vd=%{x}<br>Vg@TER_Max–Vd=%{y:.5g} V<br>TER_Max=%{customdata[0]:.5g}%<br>%{customdata[1]} TER_Max<extra></extra>'
      }],{
        margin:{l:72,r:20,t:20,b:60},xaxis:{title:'Vd (V)'},yaxis:{title:'Vg @ TER_Max–Vd (V)'},dragmode:'zoom',autosize:true,uirevision:'ter-max-vd-arg-manual'
      },clickRow(maxVd,selectionFromMaxVd,'terMaxVdArgPlot'),pointEntity(maxVd,selectionFromMaxVd));

      const fmtExp=value=>Number.isFinite(Number(value))?Number(value).toExponential(6):'';
      const vgRows=maxVg.map(d=>({vg:d.vg,terMax:Number(d.terMax).toPrecision(7),vdsAtMax:d.vdsAtMax,iUp:fmtExp(d.iUp),iDown:fmtExp(d.iDown),rUp:fmtExp(d.rUp),rDown:fmtExp(d.rDown),mode:d.manual?'手动':'自动'}));
      const vdRows=maxVd.map(d=>({vds:d.vds,terMax:Number(d.terMax).toPrecision(7),vgAtMax:d.vgAtMax,iUp:fmtExp(d.iUp),iDown:fmtExp(d.iDown),rUp:fmtExp(d.rUp),rDown:fmtExp(d.rDown),mode:d.manual?'手动':'自动'}));
      presentation?.tableVg?.setData?.(presentation.vgColumns||[],vgRows);
      presentation?.tableVd?.setData?.(presentation.vdColumns||[],vdRows);
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
      if(reactive?.transact)reactive.transact('ter:manual-maximum',tx=>{tx.touch(['ter.maxima','ter.selection'],{reason:'keyboard-adjust'});});else{renderReductionPlots(result);applyResistanceSelection();resizeTerPlots();}
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
        el.textContent='尚未选择 TER 数据点；当前显示全部栅压下的正扫/反扫 R–V 曲线。';
        return;
      }
      const row=findSelectedRecord(result)||selectedTerPoint;
      const source=row?.sourceFile||selectedTerPoint.sourceFile||'';
      const ter=finiteNumber(row?.ter??selectedTerPoint.ter);
      const manual=selectedTerPoint.manual?'；<strong>手动 TER_Max</strong>':'';
      dom.html(el,`<strong>当前联动：</strong> Vg=${formatNumber(selectedTerPoint.vg)} V，Vds=${formatNumber(selectedTerPoint.vds)} V，TER=${formatNumber(ter)}%；正扫 R=${formatNumber(row?.rUp)} Ω，反扫 R=${formatNumber(row?.rDown)} Ω${manual}${source?`；${String(source).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}`:''}`);
    }

    function syncCanonicalScanSelection(snapshot,meta={}){
      const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;
      if(!focus){if((snapshot?.items||[]).length===0&&selectedTerPoint){selectedTerPoint=null;applyResistanceSelection();}return null;}
      if(String(focus.type||'')!=='data.sweep')return null;
      const result=T.getState?.()?.result||null;if(!result)return null;
      const groups=resistanceGroups.length?resistanceGroups:groupedResistanceRecords(result);
      const matched=selectionLink.matchSelection(snapshot,groups);if(!matched)return null;
      selectedTerPoint={vg:Number(matched.group.vg),vds:null,sourceFile:String(matched.group.sourceFile||''),scanDirection:matched.direction,selectionType:'data.sweep'};
      applyResistanceSelection();
      return selectedTerPoint;
    }

    function sourceTraceIdentity(vg,sourceFile,direction){
      const ref=T.sourceScanReference?.(vg,sourceFile,direction);return ref?{artifactId:ref.artifactId,seriesId:ref.seriesId,entityType:'data.sweep'}:{};
    }

    function renderResistanceBase(){
      const card=ensureResistanceCard(),plot=dom.query('#terResistancePlot'),result=T.getState?.()?.result||null;
      if(!card||!plot||!ctx.ui.scientificPlot)return;
      syncResultRevision();
      if(!result){resistanceBaseRevision=-1;resistanceGroups=[];resistanceBaseTraceCount=0;try{ctx.ui.scientificPlot.purge(plot);}catch{}controller?.clearSelection?.({source:'ter-result-cleared'});const label=dom.query('#terResistanceSelection');if(label)label.textContent='计算 TER_max 后显示全部栅压的正扫/反扫 R–V 曲线。';return;}
      if(resistanceBaseRevision===resultRevision&&plot?.data?.length)return;
      resistanceGroups=groupedResistanceRecords(result);const traces=[];
      resistanceGroups.forEach((group,index)=>{
        const color=colorForIndex(index,resistanceGroups.length),vgLabel=`Vg=${formatNumber(group.vg)} V${group.duplicateVg&&group.sourceFile?` · ${group.sourceFile}`:''}`,common={mode:'lines',legendgroup:`vg-${index}`,hoverlabel:{namelength:-1},opacity:.58};
        const up=group.rows.filter(row=>Number.isFinite(row.rUp)&&row.rUp>0),down=group.rows.filter(row=>Number.isFinite(row.rDown)&&row.rDown>0);
        traces.push({...common,...sourceTraceIdentity(group.vg,group.sourceFile,1),x:up.map(row=>row.vds),y:up.map(row=>row.rUp),name:vgLabel,line:{color,width:1.5,dash:'solid'},customdata:up.map(row=>[group.vg,row.sourceFile||'',row.iUp,row.ter]),hovertemplate:'Vg=%{customdata[0]:.6g} V<br>正扫（Vds 递增）<br>Vds=%{x:.6g} V<br>R=%{y:.6g} Ω<br>I=%{customdata[2]:.6g} A<br>TER=%{customdata[3]:.6g}%<extra>%{customdata[1]}</extra>'});
        traces.push({...common,...sourceTraceIdentity(group.vg,group.sourceFile,-1),x:down.map(row=>row.vds),y:down.map(row=>row.rDown),name:`${vgLabel} · 反扫`,showlegend:false,line:{color,width:1.5,dash:'dash'},customdata:down.map(row=>[group.vg,row.sourceFile||'',row.iDown,row.ter]),hovertemplate:'Vg=%{customdata[0]:.6g} V<br>反扫（Vds 递减）<br>Vds=%{x:.6g} V<br>R=%{y:.6g} Ω<br>I=%{customdata[2]:.6g} A<br>TER=%{customdata[3]:.6g}%<extra>%{customdata[1]}</extra>'});
      });
      resistanceBaseTraceCount=traces.length;
      traces.push({x:[],y:[],mode:'markers',showlegend:false,hoverinfo:'text',marker:{size:12,color:'#dc2626',symbol:'circle',line:{color:'#fff',width:1.5}},text:[]});
      traces.push({x:[],y:[],mode:'markers',showlegend:false,hoverinfo:'text',marker:{size:12,color:'#dc2626',symbol:'diamond',line:{color:'#fff',width:1.5}},text:[]});
      resistanceBaseRevision=resultRevision;
      const rendered=ctx.ui.scientificPlot.react(plot,traces,{margin:{l:82,r:24,t:22,b:92},xaxis:{title:'Vds (V)',zeroline:true,automargin:true},yaxis:{title:'R = |Vds / I| (Ω)',type:'log',automargin:true},legend:{orientation:'h',x:0,y:-0.23,xanchor:'left',yanchor:'top',font:{size:10},groupclick:'togglegroup'},hovermode:'closest',dragmode:'zoom',autosize:true,shapes:[],uirevision:`ter-resistance-${resultRevision}`},{responsive:true,scrollZoom:true,displaylogo:false,modeBarButtonsToAdd:['select2d'],toImageButtonOptions:{format:'png',filename:'TER_resistance_voltage',width:1400,height:1000,scale:2}},{interaction:T.interaction,selectionTarget:'series',controllers:DOMAIN_FOCUS,source:'ter-resistance',renderKey:`ter-resistance:${resultRevision}`,renderPriority:'frame',axisSemantics:{x:{name:'Vds',role:'x',unit:'V',dimension:'voltage',quantity:'drain-source-voltage'},y:{name:'R',role:'y',unit:'Ω',dimension:'resistance',quantity:'resistance'}},viewportPolicy:{link:true,linkGroup:'ter-vds-viewport',linkedAxes:['x']},onClick:event=>{const selection=selectionLink.resistancePoint(event,result,resistanceGroups);if(selection)selectTerPoint(selection,'ter-resistance-point',{publish:false});}});
      Promise.resolve(rendered).then(()=>applyResistanceSelection()).catch(err=>console.warn('[TER resistance render]',err));
    }

    function applyResistanceSelection(){
      const plot=dom.query('#terResistancePlot'),result=T.getState?.()?.result||null;if(!plot||!result||!ctx.ui.scientificPlot)return;
      if(resistanceBaseRevision!==resultRevision||!plot?.data?.length){renderResistanceBase();return;}
      if(selectedTerPoint&&!resistanceGroups.some(group=>nearlyEqual(group.vg,selectedTerPoint.vg)))selectedTerPoint=null;
      const opacities=[],widths=[],indices=[];
      resistanceGroups.forEach((group,index)=>{const selected=groupIsSelected(group),dimmed=!!selectedTerPoint&&!selected;for(let j=0;j<2;j++){indices.push(index*2+j);opacities.push(dimmed?.035:(selected?1:.58));widths.push(selected?3.4:1.5);}});
      if(indices.length)ctx.ui.scientificPlot.restyle(plot,{opacity:opacities,'line.width':widths},indices);
      const row=findSelectedRecord(result),vds=finiteNumber(selectedTerPoint?.vds),rUp=finiteNumber(row?.rUp??selectedTerPoint?.rUp),rDown=finiteNumber(row?.rDown??selectedTerPoint?.rDown),ter=finiteNumber(row?.ter??selectedTerPoint?.ter);
      const upIndex=resistanceBaseTraceCount,downIndex=resistanceBaseTraceCount+1;
      const upOk=vds!==null&&rUp!==null&&rUp>0,downOk=vds!==null&&rDown!==null&&rDown>0;
      ctx.ui.scientificPlot.restyle(plot,{x:[upOk?[vds]:[]],y:[upOk?[rUp]:[]],text:[upOk?[`正扫选中点<br>Vg=${formatNumber(selectedTerPoint?.vg)} V<br>Vds=${formatNumber(vds)} V<br>R=${formatNumber(rUp)} Ω<br>TER=${formatNumber(ter)}%`]:[]]},[upIndex]);
      ctx.ui.scientificPlot.restyle(plot,{x:[downOk?[vds]:[]],y:[downOk?[rDown]:[]],text:[downOk?[`反扫选中点<br>Vg=${formatNumber(selectedTerPoint?.vg)} V<br>Vds=${formatNumber(vds)} V<br>R=${formatNumber(rDown)} Ω<br>TER=${formatNumber(ter)}%`]:[]]},[downIndex]);
      const shapes=selectedTerPoint&&vds!==null?[{type:'line',xref:'x',yref:'paper',x0:vds,x1:vds,y0:0,y1:1,line:{color:'#dc2626',width:1,dash:'dot'}}]:[];
      ctx.ui.scientificPlot.relayout(plot,{shapes});updateSelectionText(result);
    }

    function renderResistancePlot(){renderResistanceBase();applyResistanceSelection();}

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

    function syncResultRevision(){
      const result=T.getState?.()?.result||null;
      if(result!==lastResult){
        lastResult=result;
        resultRevision++;resistanceBaseRevision=-1;resistanceGroups=[];resistanceBaseTraceCount=0;
        selectedTerPoint=null;
      }
      return result;
    }

    function renderLinkedUi(){
      const result=syncResultRevision();ensureLayoutControls();ensureTransformControls();ensureResistanceCard();ensurePlotViews();
      if(result){renderTerHeatmap(result);renderReductionPlots(result);}else{for(const id of ['terHeatmapPlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){const el=dom.query('#'+id);if(el)try{ctx.ui.scientificPlot.purge(el);}catch{}}}
      renderTransformHeatmap();renderResistanceBase();
    }

    function installReactiveBindings(){
      if(reactiveBindingsInstalled||!reactive?.effect)return;reactiveBindingsInstalled=true;
      reactive.effect('ter.view.result',{dependsOn:['ter.result','ter.view.request'],scheduler:'frame',effect:()=>{renderLinkedUi();resizeTerPlots();}});
      reactive.effect('ter.view.selection',{dependsOn:['ter.selection'],scheduler:'frame',effect:()=>applyResistanceSelection()});
      reactive.effect('ter.view.maxima',{dependsOn:['ter.maxima'],scheduler:'frame',effect:()=>{const result=T.getState?.()?.result;if(result)renderReductionPlots(result);applyResistanceSelection();resizeTerPlots();}});
    }

    function queueLinkedRender(){
      installReactiveBindings();
      if(reactive?.touch){reactive.touch('ter.view.request',{reason:'ui-refresh'});return;}
      const ticket=++renderTicket;dom.frame(()=>{if(ticket!==renderTicket)return;renderLinkedUi();resizeTerPlots();});
    }


    ctx.ui.activities.add({
      id:'ter',label:'TER分析',contextLabel:'TER 分析',icon:'▧',order:30,openMode:'window',artifactHydration:'live',
      description:'同 Vd TER 矩阵与极值分析',
      // Page onOpen owns presentation synchronization.  Calling T.render()
      // again here duplicated all control/table synchronization on every
      // activation and made restored TER projects visibly settle twice.
      onActivate:()=>ctx.workspace.openPage('terMaxPage')
    });

    const unitPresentation=adapter?.unitPresentation;
    if(!unitPresentation?.mount)throw new Error('TER Unit presentation runtime unavailable.');
    let pageOpenRenderPendingRefresh=false;
    const syncPageOpen=()=>{T.render();pageOpenRenderPendingRefresh=true;return true;};
    presentation=unitPresentation.mount(ctx,T,{setCols,exportSpec,transformOptions,onPageOpen:syncPageOpen,onTransformChange:()=>{renderTransformHeatmap();ctx.project.capture?.();},clearSelection:()=>{selectedTerPoint=null;controller?.clearSelection?.({source:'ter-resistance-clear'});renderResistancePlot();}});
    const page=presentation.page;
    workbench=presentation.workbench;
    gridController=presentation.plotGroup;
    terHeaderActions=presentation.header?.actionGroup||null;
    ensurePlotViews();

    ctx.ui.topWorkspace.register({
      id:'ter',activity:'ter',label:'TER 分析',icon:'▧',
      layout:{
        mode:'native',root:{selector:'#terMaxPage .dkds-plugin-workbench-root'},
        primary:{id:'main',role:'analysis-primary',presentationRole:'scientific-primary',priority:100,collapsible:false},prime:[{id:'data-control',label:'参数',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:90,collapsible:true}],sub:[]
      }
    });

    dom.on(dom.query('#terApplyDisplayBtn',page),'click',()=>T.applyDisplay());
    dom.on(dom.query('#terResetDisplayBtn',page),'click',()=>T.resetDisplay());
    dom.on(dom.query('#terOnlyFullyVisible',page),'change',event=>T.setOnlyFullyVisible(event.target.checked));

    dom.on(dom.query('#terExportLongBtn',page),'click',()=>T.exportLong());
    dom.on(dom.query('#terCopyLongBtn',page),'click',()=>T.copyLong());
    dom.on(dom.query('#terExportMatrixBtn',page),'click',()=>T.exportMatrix());
    dom.on(dom.query('#terCopyMatrixBtn',page),'click',()=>T.copyMatrix());




    ctx.events.on('analysis:refresh',({id})=>{if(id==='terMaxPage'){if(pageOpenRenderPendingRefresh)pageOpenRenderPendingRefresh=false;else T.render();terHeaderActions?.render?.();queueLinkedRender();}});

    // TER persistence is namespaced by plugin; project-format owns historical
    // project migration before runtime restoration.
    ctx.project.registerSlice('workspace',{
      serialize:()=>T.serialize(),
      restore:data=>T.restore(data),
      reset:()=>T.reset()
    });

    ctx.project.registerSlice('layout',{
      serialize:()=>({version:3,rows:layoutSettings.rows,cols:layoutSettings.cols}),
      restore:saved=>{
        const normalized=sanitizeLayout(saved&&typeof saved==='object'?saved:{});
        layoutSettings={version:3,...normalized};
        applyLayoutSettings();
      },
      reset:()=>{layoutSettings={version:3,rows:3,cols:3};applyLayoutSettings();}
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
      computeResonant:(peaks,sweeps,label,visibleSweepIds=null,options={})=>ctx.tasks.submit('resonant-ter',{peaks,sweeps,label,visibleSweepIds,options},{key:`provider-resonant-ter:${String(label||'')}`,latest:true}).promise
    });

    ctx.events.on('analysis:opened',({id})=>{if(id==='terMaxPage')queueLinkedRender();});
    ctx.events.on('project:restored',()=>queueLinkedRender());
    ensureLayoutControls();
    ensureTransformControls();
    ensureResistanceCard();
    ensurePlotViews();
    canonicalSelectionOff=T.interaction?.subscribe?.(syncCanonicalScanSelection,{immediate:true})||null;
    applyLayoutSettings();
    bindKeyboardAdjuster();

    return {deactivate(){
      transformPanel=null;
      canonicalSelectionOff?.();canonicalSelectionOff=null;
      unbindKeyboardAdjuster();
      const plot=dom.query('#terResistancePlot');
      if(plot&&ctx.ui.scientificPlot){try{ctx.ui.scientificPlot.purge(plot);}catch{}}
      terPlotViews.clear();
      try{presentation?.dispose?.();}catch{}presentation=null;
    }};
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','feature-runtime',Object.freeze({mount}));
})();
