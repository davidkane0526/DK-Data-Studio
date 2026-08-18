(() => {
  DKDSPlugins.define({
    id:'builtin.ter-analysis',
    name:'TER Analysis',
    version:'2.2.0',
    apiVersion:'1.4.0',
    description:'Same-Vd TER matrix and extrema workspace with plugin-owned UI.',
    source:'builtin',
    order:120,
    capabilities:['ui.activity','ui.page','analysis.ter','chart.heatmap','chart.resistance-voltage','ui.linked-selection','ui.sticky-inspector','ui.chart-layout','ui.keyboard-adjustment','chart.export','ui.top-workspace','ui.infrastructure','ui.portable','ui.dynamic-actions','ui.shortcuts'],
    workspace:{role:'top',activity:'ter',icon:'▧',title:'TER 分析'}
  }, async ctx => {
    const h=ctx.host;
    const T=h.ter;
    const CHART_COUNT=6;
    const FACTORS=[1,2,3,6];
    let selectedTerPoint=null;
    let lastResult=null;
    let resultRevision=0;
    let renderTicket=0;
    let observer=null;
    const clickBindings=new Map();
    const manualStateByResult=new WeakMap();
    let keyboardContributionsBound=false;
    const portableCharts=new Map();
    let layoutSettings={rows:2,cols:3,sticky:true};

    ctx.ui.styles.add('linked-resistance-voltage', `
      #terMaxPage .ter-chart-grid{
        --ter-grid-cols:3;
        --ter-grid-rows:2;
        display:grid!important;
        grid-template-columns:repeat(var(--ter-grid-cols),minmax(0,1fr))!important;
        grid-template-rows:repeat(var(--ter-grid-rows),auto);
        align-items:start;
        gap:14px;
      }
      #terMaxPage .ter-chart-grid > .heatmap-square-card,
      #terMaxPage .ter-chart-grid > .ter-resistance-card{
        width:100%;
        max-width:none;
        align-self:start;
      }
      #terMaxPage .ter-chart-grid > .ter-reduction-grid{
        display:contents!important;
      }
      #terMaxPage .ter-reduction-grid > .analysis-chart-card{
        min-width:0;
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
        #terMaxPage .ter-chart-grid{grid-template-columns:1fr!important;grid-template-rows:none}
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
      let rows=FACTORS.includes(Number(input.rows))?Number(input.rows):2;
      let cols=FACTORS.includes(Number(input.cols))?Number(input.cols):3;
      if(rows*cols!==CHART_COUNT){
        if(CHART_COUNT%rows===0)cols=CHART_COUNT/rows;
        else if(CHART_COUNT%cols===0)rows=CHART_COUNT/cols;
        else {rows=2;cols=3;}
      }
      return {rows,cols,sticky:input.sticky!==false};
    }

    function syncLayoutControls(){
      const rows=document.getElementById('terLayoutRows');
      const cols=document.getElementById('terLayoutCols');
      const sticky=document.getElementById('terResistanceStickyToggle');
      if(rows)rows.value=String(layoutSettings.rows);
      if(cols)cols.value=String(layoutSettings.cols);
      if(sticky)sticky.checked=!!layoutSettings.sticky;
      const quick=document.getElementById('terResistanceStickyBtn');
      if(quick){
        quick.textContent=layoutSettings.sticky?'取消悬浮':'悬浮';
        quick.title=layoutSettings.sticky?'关闭 R–V 随页面滚动吸附':'让 R–V 图随页面滚动保持可见';
      }
    }

    function resizeTerPlots(){
      if(!window.Plotly?.Plots?.resize)return;
      requestAnimationFrame(()=>{
        for(const id of ['terHeatmapPlot','terResistancePlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
          const el=document.getElementById(id);
          if(el)try{ Plotly.Plots.resize(el); }catch(_err){}
        }
      });
    }

    function applyLayoutSettings({capture=false}={}){
      layoutSettings=sanitizeLayout(layoutSettings);
      const grid=document.querySelector('#terMaxPage .ter-chart-grid');
      if(grid){
        grid.style.setProperty('--ter-grid-cols',String(layoutSettings.cols));
        grid.style.setProperty('--ter-grid-rows',String(layoutSettings.rows));
      }
      const card=document.getElementById('terResistanceCard');
      card?.classList.toggle('ter-sticky-enabled',!!layoutSettings.sticky);
      syncLayoutControls();
      resizeTerPlots();
      if(capture)h.captureActiveProjectTab?.();
    }

    function setRows(rows){
      const n=Number(rows);
      if(!FACTORS.includes(n)||CHART_COUNT%n!==0)return;
      layoutSettings.rows=n;
      layoutSettings.cols=CHART_COUNT/n;
      applyLayoutSettings({capture:true});
      h.setStatus?.(`TER 图表布局：${layoutSettings.rows} 行 × ${layoutSettings.cols} 列。`);
    }

    function setCols(cols){
      const n=Number(cols);
      if(!FACTORS.includes(n)||CHART_COUNT%n!==0)return;
      layoutSettings.cols=n;
      layoutSettings.rows=CHART_COUNT/n;
      applyLayoutSettings({capture:true});
      h.setStatus?.(`TER 图表布局：${layoutSettings.rows} 行 × ${layoutSettings.cols} 列。`);
    }

    function setSticky(value){
      layoutSettings.sticky=!!value;
      applyLayoutSettings({capture:true});
      h.setStatus?.(`R–V 悬浮显示已${layoutSettings.sticky?'开启':'关闭'}。`);
    }

    function ensureLayoutControls(){
      const page=document.getElementById('terMaxPage');
      const summary=document.getElementById('terSummary');
      if(!page||!summary)return null;
      let card=document.getElementById('terPluginLayoutControls');
      if(card){syncLayoutControls();return card;}
      card=document.createElement('div');
      card.id='terPluginLayoutControls';
      card.className='analysis-control-card ter-layout-controls';
      card.dataset.pluginOwned='builtin.ter-analysis';
      const options=FACTORS.map(v=>`<option value="${v}">${v}</option>`).join('');
      card.innerHTML=`
        <strong>图表布局</strong>
        <label>行数 <select id="terLayoutRows">${options}</select></label>
        <label>列数 <select id="terLayoutCols">${options}</select></label>
        <label class="ter-sticky-check"><input id="terResistanceStickyToggle" type="checkbox"> R–V 随滚动悬浮</label>
        <span class="ter-layout-note">共 6 张图；修改行数或列数时另一项自动匹配。窄屏自动切换为单列。</span>
      `;
      summary.insertAdjacentElement('beforebegin',card);
      card.querySelector('#terLayoutRows')?.addEventListener('change',e=>setRows(e.target.value));
      card.querySelector('#terLayoutCols')?.addEventListener('change',e=>setCols(e.target.value));
      card.querySelector('#terResistanceStickyToggle')?.addEventListener('change',e=>setSticky(e.target.checked));
      syncLayoutControls();
      return card;
    }

    function ensureResistanceCard(){
      const page=document.getElementById('terMaxPage');
      const heatmapCard=page?.querySelector('.ter-chart-grid > .heatmap-square-card');
      if(!page||!heatmapCard)return null;
      let card=document.getElementById('terResistanceCard');
      if(card){
        card.classList.toggle('ter-sticky-enabled',!!layoutSettings.sticky);
        return card;
      }
      card=document.createElement('div');
      card.id='terResistanceCard';
      card.className='analysis-chart-card ter-resistance-card';
      card.dataset.pluginOwned='builtin.ter-analysis';
      card.innerHTML=`
        <div class="ter-resistance-card-header">
          <span class="ter-card-title-text">全部 Vg 的电阻–电压（R–V）正扫 / 反扫</span>
          <div class="ter-chart-actions">
            <button id="terResistanceClearBtn" type="button" title="恢复显示全部栅压曲线">清除高亮</button>
            <button id="terResistanceStickyBtn" type="button">取消悬浮</button>
            <button type="button" data-ter-export="data" data-ter-plot="resistance">CSV</button>
            <button type="button" data-ter-export="svg" data-ter-plot="resistance">SVG</button>
            <button type="button" data-ter-export="png" data-ter-plot="resistance">PNG</button>
          </div>
        </div>
        <div class="ter-resistance-hint">同一 Vg 使用同一颜色：实线为正扫（Vds 递增），虚线为反扫（Vds 递减）。点击 TER_Max / 峰位图的数据点后，其他曲线变淡并在正扫、反扫曲线上分别标出对应位置。选中后可按 Ctrl+← / Ctrl+→ 沿 Vds 数据点移动红色标记，并将该位置手动设为对应 Vg 与 Vd 的 TER_Max。</div>
        <div id="terResistanceSelection" class="ter-resistance-selection">尚未选择 TER 数据点。</div>
        <div id="terResistancePlot" class="analysis-chart"></div>
      `;
      heatmapCard.insertAdjacentElement('afterend',card);
      card.querySelector('#terResistanceClearBtn')?.addEventListener('click',()=>{
        selectedTerPoint=null;
        renderResistancePlot();
      });
      card.querySelector('#terResistanceStickyBtn')?.addEventListener('click',()=>setSticky(!layoutSettings.sticky));
      card.classList.toggle('ter-sticky-enabled',!!layoutSettings.sticky);
      syncLayoutControls();
      return card;
    }

    function chartSpecs(){
      return [
        {key:'heatmap',plotId:'terHeatmapPlot',fileBase:'TER_heatmap'},
        {key:'maxVg',plotId:'terMaxVgPlot',fileBase:'TER_Max-Vg'},
        {key:'maxVgArg',plotId:'terMaxVgArgPlot',fileBase:'Vd_at_TER_Max-Vg'},
        {key:'maxVd',plotId:'terMaxVdPlot',fileBase:'TER_Max-Vd'},
        {key:'maxVdArg',plotId:'terMaxVdArgPlot',fileBase:'Vg_at_TER_Max-Vd'}
      ];
    }

    function decoratePlotCard(spec){
      const plot=document.getElementById(spec.plotId);
      const card=plot?.closest('.analysis-chart-card');
      if(!plot||!card)return;
      let title=card.querySelector(':scope > .analysis-chart-title');
      if(!title||title.dataset.terDecorated==='1')return;
      const text=title.textContent.trim();
      title.dataset.terOriginalTitle=text;
      title.dataset.terDecorated='1';
      title.classList.add('ter-card-title-row');
      title.innerHTML=`
        <span class="ter-card-title-text"></span>
        <span class="ter-chart-actions">
          <button type="button" data-ter-export="data" data-ter-plot="${spec.key}">CSV</button>
          <button type="button" data-ter-export="svg" data-ter-plot="${spec.key}">SVG</button>
          <button type="button" data-ter-export="png" data-ter-plot="${spec.key}">PNG</button>
        </span>
      `;
      title.querySelector('.ter-card-title-text').textContent=text;
    }

    function ensurePerChartActions(){
      for(const spec of chartSpecs())decoratePlotCard(spec);
      const page=document.getElementById('terMaxPage');
      if(!page||page.dataset.terExportBound==='1')return;
      page.dataset.terExportBound='1';
      page.addEventListener('click',handleExportClick);
    }


    function ensurePortableCharts(){
      if(!ctx.ui.portable?.create)return;
      const specs=[
        ...chartSpecs().map(spec=>({...spec,title:document.getElementById(spec.plotId)?.closest('.analysis-chart-card')?.querySelector('.ter-card-title-text,.analysis-chart-title')?.textContent?.trim()||spec.fileBase,handle:'.analysis-chart-title'})),
        {key:'resistance',plotId:'terResistancePlot',title:'电阻–电压 R–V',handle:'.ter-resistance-card-header'}
      ];
      for(const spec of specs){
        if(portableCharts.has(spec.key))continue;
        const card=document.getElementById(spec.plotId)?.closest('.analysis-chart-card');
        if(!card)continue;
        try{
          portableCharts.set(spec.key,ctx.ui.portable.create(`ter-chart-${spec.key}`,card,{
            title:spec.title,
            handle:spec.handle,
            useTargetAsWrapper:true,
            placements:['home','float','left','right','bottom'],
            defaultPlacement:'home'
          }));
        }catch(err){console.warn('[TER portable chart]',spec.key,err);}
      }
    }

    function restorePerChartActions(){
      const page=document.getElementById('terMaxPage');
      if(page){
        page.removeEventListener('click',handleExportClick);
        delete page.dataset.terExportBound;
      }
      for(const title of document.querySelectorAll('#terMaxPage .analysis-chart-title[data-ter-decorated="1"]')){
        const original=title.dataset.terOriginalTitle||title.textContent.trim();
        title.classList.remove('ter-card-title-row');
        title.textContent=original;
        delete title.dataset.terDecorated;
        delete title.dataset.terOriginalTitle;
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
      await window.electronAPI.saveText({
        defaultName:`${spec.fileBase}.csv`,
        content:spec.csv,
        filters:[{name:'CSV',extensions:['csv']}]
      });
      h.setStatus?.(`已导出 ${spec.fileBase}.csv。`);
    }

    async function exportChartImage(key,format){
      const spec=exportSpec(key);
      if(!spec)return;
      await h.savePlotlyImage?.(spec.plotId,spec.fileBase,format);
      h.setStatus?.(`已导出 ${spec.fileBase}.${format}。`);
    }

    function handleExportClick(event){
      const button=event.target?.closest?.('[data-ter-export][data-ter-plot]');
      if(!button)return;
      const type=button.dataset.terExport;
      const key=button.dataset.terPlot;
      Promise.resolve(type==='data'?exportChartData(key):exportChartImage(key,type)).catch(err=>{
        console.error('[TER export]',err);
        h.setStatus?.(`TER 图表导出失败：${err.message}`);
      });
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
      if(!result||!window.Plotly)return;
      const maxVg=result.terMaxByVg||result.terMax||[];
      const maxVd=result.terMaxByVd||[];
      const config={responsive:true,scrollZoom:true,displaylogo:false};
      const react=(id,traces,layout)=>{
        const el=document.getElementById(id);
        if(!el)return;
        try{ Plotly.react(el,traces,layout,config); }catch(err){ console.error(`[TER manual render:${id}]`,err); }
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

      const vgTable=document.getElementById('terMaxVgTable');
      if(vgTable)vgTable.innerHTML=`
        <thead><tr><th>Vg (V)</th><th>TER_Max–Vg (%)</th><th>Vd@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th><th>方式</th></tr></thead>
        <tbody>${maxVg.map(d=>`<tr><td>${d.vg}</td><td>${Number(d.terMax).toPrecision(7)}</td><td>${d.vdsAtMax}</td><td>${Number(d.iUp).toExponential(6)}</td><td>${Number(d.iDown).toExponential(6)}</td><td>${Number(d.rUp).toExponential(6)}</td><td>${Number(d.rDown).toExponential(6)}</td><td>${d.manual?'手动':'自动'}</td></tr>`).join('')}</tbody>`;
      const vdTable=document.getElementById('terMaxVdTable');
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
        h.setStatus?.(`当前 Vg=${formatNumber(selectedTerPoint.vg)} V 的 TER 标记已到 ${step<0?'最左':'最右'}有效 Vds 点。`);
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
      h.captureActiveProjectTab?.();
      h.setStatus?.(`已手动设定 TER_Max：Vg=${formatNumber(row.vg)} V，Vds=${formatNumber(row.vds)} V，TER=${formatNumber(row.ter)}%。该 Vg 与该 Vd 的 TER_Max 已同步更新。`);
      return true;
    }

    function bindKeyboardAdjuster(){
      if(keyboardContributionsBound)return;
      keyboardContributionsBound=true;
      const invoke=step=>{
        const page=document.getElementById('terMaxPage');
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
      const el=document.getElementById('terResistanceSelection');
      if(!el)return;
      if(!selectedTerPoint){
        el.textContent='尚未选择 TER 数据点；当前显示全部栅压下的正扫/反扫 R–V 曲线。';
        return;
      }
      const row=findSelectedRecord(result)||selectedTerPoint;
      const source=row?.sourceFile||selectedTerPoint.sourceFile||'';
      const ter=finiteNumber(row?.ter??selectedTerPoint.ter);
      const manual=selectedTerPoint.manual?'；<strong>手动 TER_Max</strong>':'';
      el.innerHTML=`<strong>当前联动：</strong> Vg=${formatNumber(selectedTerPoint.vg)} V，Vds=${formatNumber(selectedTerPoint.vds)} V，TER=${formatNumber(ter)}%；正扫 R=${formatNumber(row?.rUp)} Ω，反扫 R=${formatNumber(row?.rDown)} Ω${manual}${source?`；${String(source).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}`:''}`;
    }

    function renderResistancePlot(){
      const card=ensureResistanceCard();
      const plot=document.getElementById('terResistancePlot');
      const state=T.getState?.();
      const result=state?.result||null;
      if(!card||!plot||!window.Plotly)return;

      if(result!==lastResult){
        lastResult=result;
        resultRevision++;
        selectedTerPoint=null;
      }

      if(!result){
        try{ Plotly.purge(plot); }catch(_err){}
        const label=document.getElementById('terResistanceSelection');
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
      Plotly.react(plot,traces,{
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
      });
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

    function bindPlotClick(plotId,rowProvider,selectionFactory){
      const el=document.getElementById(plotId);
      if(!el||typeof el.on!=='function')return;
      const old=clickBindings.get(plotId);
      if(old&&typeof el.removeListener==='function'){
        try{ el.removeListener('plotly_click',old); }catch(_err){}
      }
      const handler=event=>{
        const point=event?.points?.[0];
        const index=Number(point?.pointIndex);
        if(!Number.isInteger(index)||index<0)return;
        const rows=rowProvider();
        const selection=selectionFactory(rows[index]);
        if(!selection)return;
        selectedTerPoint=selection;
        renderResistancePlot();
      };
      el.on('plotly_click',handler);
      clickBindings.set(plotId,handler);
    }

    function bindHeatmapClick(result){
      const plotId='terHeatmapPlot';
      const el=document.getElementById(plotId);
      if(!el||typeof el.on!=='function')return;
      const old=clickBindings.get(plotId);
      if(old&&typeof el.removeListener==='function'){
        try{ el.removeListener('plotly_click',old); }catch(_err){}
      }
      const handler=event=>{
        const point=event?.points?.[0];
        const vg=finiteNumber(point?.y),vds=finiteNumber(point?.x);
        if(vg===null||vds===null)return;
        const row=(result.records||[]).find(item=>nearlyEqual(item.vg,vg)&&nearlyEqual(item.vds,vds));
        selectedTerPoint={
          vg,vds,
          rUp:row?.rUp,
          rDown:row?.rDown,
          ter:row?.ter,
          sourceFile:String(row?.sourceFile||'')
        };
        renderResistancePlot();
      };
      el.on('plotly_click',handler);
      clickBindings.set(plotId,handler);
    }

    function bindLinkedPlotClicks(){
      const result=T.getState?.()?.result;
      if(!result)return;
      const maxVg=()=>result.terMaxByVg||result.terMax||[];
      const maxVd=()=>result.terMaxByVd||[];
      bindPlotClick('terMaxVgPlot',maxVg,selectionFromMaxVg);
      bindPlotClick('terMaxVgArgPlot',maxVg,selectionFromMaxVg);
      bindPlotClick('terMaxVdPlot',maxVd,selectionFromMaxVd);
      bindPlotClick('terMaxVdArgPlot',maxVd,selectionFromMaxVd);
      bindHeatmapClick(result);
    }

    function renderLinkedUi(){
      ensureLayoutControls();
      ensureResistanceCard();
      ensurePerChartActions();
      ensurePortableCharts();
      applyLayoutSettings();
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
        requestAnimationFrame(()=>{
          if(ticket!==renderTicket)return;
          bindLinkedPlotClicks();
          resizeTerPlots();
        });
      };
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
      else setTimeout(run,0);
    }


    const pageHtml="\n      <div class=\"analysis-page-header\">\n        <div>\n          <h2>TER 热图 / TER_Max 分析</h2>\n          <div id=\"terMaxProjectName\" class=\"analysis-subtitle\">当前项目</div>\n        </div>\n        <button class=\"analysis-page-close\" data-analysis-target=\"terMaxPage\">关闭窗口</button>\n      </div>\n      <div class=\"analysis-page-body\">\n        <div class=\"ter-workspace-shell\">\n          <div class=\"ter-workspace-left\">\n        <div class=\"analysis-control-card ter-controls\">\n          <label>Vds min (V)<input id=\"terVmin\" type=\"number\" step=\"any\"></label>\n          <label>Vds max (V)<input id=\"terVmax\" type=\"number\" step=\"any\"></label>\n          <label>Vds step (V)<input id=\"terVstep\" type=\"number\" step=\"any\"></label>\n          <label>配对容差 (V)<input id=\"terTolerance\" type=\"number\" step=\"any\"></label>\n          <label>电流下限 (A)<input id=\"terCurrentFloor\" type=\"number\" step=\"any\" value=\"1e-15\"></label>\n          <label class=\"inline-check\"><input id=\"terOnlyFullyVisible\" type=\"checkbox\">仅使用正反扫均显示的数据文件</label>\n          <button id=\"terAutoParamsBtn\">自动参数</button>\n          <button id=\"terCalculateBtn\" class=\"primary\">计算 TER_max</button>\n        </div>\n\n        <div class=\"analysis-note\">\n          TER 热图中的每个像素都对应一个实际 (Vd, Vg) 组合：在相同 Vd 下配对正扫/反扫，\n          R=|Vd/I|，TER=(Rhigh−Rlow)/Rlow×100%。TER_Max–Vg 是固定 Vg 后沿 Vd 方向取最大值；\n          TER_Max–Vd 是固定 Vd 后沿 Vg 方向取最大值。\n        </div>\n\n        <div class=\"analysis-control-card heatmap-display-controls\">\n          <strong>热图显示</strong>\n          <label>色图\n            <select id=\"terColorScale\">\n              <option value=\"Viridis\">Viridis</option>\n              <option value=\"Turbo\">Turbo</option>\n              <option value=\"Cividis\">Cividis</option>\n              <option value=\"Jet\">Jet</option>\n              <option value=\"Hot\">Hot</option>\n            </select>\n          </label>\n          <label>色阶最小 (%)\n            <input id=\"terColorMin\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>色阶最大 (%)\n            <input id=\"terColorMax\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>色阶刻度 (%)\n            <input id=\"terColorTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>Vds 刻度 (V)\n            <input id=\"terXTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <label>Vg 刻度 (V)\n            <input id=\"terYTick\" type=\"number\" step=\"any\" placeholder=\"自动\">\n          </label>\n          <button id=\"terApplyDisplayBtn\">应用显示</button>\n          <button id=\"terResetDisplayBtn\">自动色阶/刻度</button>\n        </div>\n          </div>\n          <div class=\"ter-workspace-main\">\n        <div id=\"terSummary\" class=\"ter-summary\"></div>\n\n        <div class=\"ter-chart-grid\">\n          <div class=\"analysis-chart-card heatmap-square-card\">\n            <div class=\"analysis-chart-title\">TER(Vd, Vg) 全组合热图</div>\n            <div id=\"terHeatmapPlot\" class=\"analysis-chart ter-heatmap-square\"></div>\n          </div>\n\n          <div class=\"ter-reduction-grid\">\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">TER_Max–Vg：max over Vd</div>\n              <div id=\"terMaxVgPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">Vd@TER_Max–Vg</div>\n              <div id=\"terMaxVgArgPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">TER_Max–Vd：max over Vg</div>\n              <div id=\"terMaxVdPlot\" class=\"analysis-chart\"></div>\n            </div>\n            <div class=\"analysis-chart-card\">\n              <div class=\"analysis-chart-title\">Vg@TER_Max–Vd</div>\n              <div id=\"terMaxVdArgPlot\" class=\"analysis-chart\"></div>\n            </div>\n          </div>\n        </div>\n          </div>\n        </div>\n\n        <div class=\"analysis-control-card export-card\">\n          <strong>热图/矩阵导出</strong>\n          <button id=\"terExportLongBtn\">TER_long.csv</button>\n          <button id=\"terCopyLongBtn\" class=\"copy-btn\">复制 long</button>\n          <button id=\"terExportMatrixBtn\">TER_matrix.csv</button>\n          <button id=\"terCopyMatrixBtn\" class=\"copy-btn\">复制 matrix</button>\n          <button id=\"terExportHeatmapSvgBtn\">热图 SVG</button>\n          <button id=\"terExportHeatmapPngBtn\">热图 PNG</button>\n        </div>\n\n        <div class=\"analysis-control-card export-card\">\n          <strong>TER_Max–Vg</strong>\n          <button id=\"terExportMaxVgBtn\">数据 CSV</button>\n          <button id=\"terCopyMaxVgBtn\" class=\"copy-btn\">复制数据</button>\n          <button id=\"terExportMaxVgSvgBtn\">图形 SVG</button>\n          <button id=\"terExportMaxVgPngBtn\">图形 PNG</button>\n          <strong>TER_Max–Vd</strong>\n          <button id=\"terExportMaxVdBtn\">数据 CSV</button>\n          <button id=\"terCopyMaxVdBtn\" class=\"copy-btn\">复制数据</button>\n          <button id=\"terExportMaxVdSvgBtn\">图形 SVG</button>\n          <button id=\"terExportMaxVdPngBtn\">图形 PNG</button>\n        </div>\n\n        <h3 class=\"analysis-section-title\">TER_Max–Vg 数据</h3>\n        <div class=\"analysis-table-wrap\">\n          <table id=\"terMaxVgTable\" class=\"analysis-table\"></table>\n        </div>\n\n        <h3 class=\"analysis-section-title\">TER_Max–Vd 数据</h3>\n        <div class=\"analysis-table-wrap\">\n          <table id=\"terMaxVdTable\" class=\"analysis-table\"></table>\n        </div>\n      </div>\n    ";

    ctx.ui.activities.add({
      id:'ter',label:'TER分析',contextLabel:'TER 分析',icon:'▧',order:30,openMode:'window',
      description:'同 Vd TER 矩阵与极值分析',
      onActivate:()=>{h.openAnalysisPage('terMaxPage');T.render();}
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

    const terHeader=page.querySelector('.analysis-page-header');
    const terHeaderActionsHost=document.createElement('div');
    terHeaderActionsHost.className='dkds-plugin-header-actions';
    terHeader?.querySelector('.analysis-page-close')?.before(terHeaderActionsHost);
    const terHeaderActions=ctx.ui.actions?.mount?.(terHeaderActionsHost,{
      activity:'ter',
      actions:[
        {id:'auto',icon:'↻',label:'自动参数',order:10,onInvoke:()=>T.autoParameters()},
        {id:'calculate',icon:'∑',label:'计算 TER',className:'primary',order:20,shortcut:'Ctrl+Enter',onInvoke:()=>T.calculate()},
        {id:'reset-display',icon:'⌁',label:'自动显示',order:30,onInvoke:()=>T.resetDisplay()},
        {id:'export',icon:'⇩',label:'导出矩阵',order:40,enabled:()=>!!T.getState?.()?.result,onInvoke:()=>T.exportMatrix()}
      ]
    });

    ctx.ui.topWorkspace.register({
      id:'ter',activity:'ter',label:'TER 分析',icon:'▧',
      layout:{
        mode:'split',root:{selector:'.ter-workspace-shell'},
        left:{role:'data-display',pageId:page.id,selector:'.ter-workspace-left',stack:true,defaultFraction:0.20,minFraction:0.14,maxFraction:0.42},
        main:{role:'primary-data',pageId:page.id,selector:'.ter-workspace-main',interaction:'plugin-owned'},
        prime:[]
      }
    });

    page.querySelector('#terAutoParamsBtn').onclick=()=>T.autoParameters();
    page.querySelector('#terCalculateBtn').onclick=()=>T.calculate();
    page.querySelector('#terApplyDisplayBtn').onclick=()=>T.applyDisplay();
    page.querySelector('#terResetDisplayBtn').onclick=()=>T.resetDisplay();
    page.querySelector('#terOnlyFullyVisible').onchange=e=>T.setOnlyFullyVisible(e.target.checked);

    page.querySelector('#terExportLongBtn').onclick=()=>T.exportLong();
    page.querySelector('#terCopyLongBtn').onclick=()=>T.copyLong();
    page.querySelector('#terExportMatrixBtn').onclick=()=>T.exportMatrix();
    page.querySelector('#terCopyMatrixBtn').onclick=()=>T.copyMatrix();
    page.querySelector('#terExportHeatmapSvgBtn').onclick=()=>T.exportHeatmapSvg();
    page.querySelector('#terExportHeatmapPngBtn').onclick=()=>T.exportHeatmapPng();

    page.querySelector('#terExportMaxVgBtn').onclick=()=>T.exportMaxVg();
    page.querySelector('#terCopyMaxVgBtn').onclick=()=>T.copyMaxVg();
    page.querySelector('#terExportMaxVgSvgBtn').onclick=()=>T.exportMaxVgSvg();
    page.querySelector('#terExportMaxVgPngBtn').onclick=()=>T.exportMaxVgPng();

    page.querySelector('#terExportMaxVdBtn').onclick=()=>T.exportMaxVd();
    page.querySelector('#terCopyMaxVdBtn').onclick=()=>T.copyMaxVd();
    page.querySelector('#terExportMaxVdSvgBtn').onclick=()=>T.exportMaxVdSvg();
    page.querySelector('#terExportMaxVdPngBtn').onclick=()=>T.exportMaxVdPng();

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
      reset:()=>{layoutSettings={rows:2,cols:3,sticky:true};applyLayoutSettings();}
    });

    ctx.events.on('layout:resize',()=>{
      for(const id of ['terHeatmapPlot','terResistancePlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
        const el=document.getElementById(id);
        if(el&&el.offsetParent!==null){try{Plotly.Plots.resize(el);}catch{}}
      }
    });

    ctx.registry.add('analysis.providers','ter',{
      id:'ter',
      name:'Same-Vd TER',
      computeMatrix:window.DKDSScience.computeTerMatrix,
      computeResonant:window.DKDSScience.computeResonantTerForLabel
    });

    const summary=document.getElementById('terSummary');
    if(summary&&typeof MutationObserver!=='undefined'){
      observer=new MutationObserver(()=>queueLinkedRender());
      observer.observe(summary,{childList:true,subtree:true,characterData:true});
    }
    ctx.events.on('analysis:opened',({id})=>{if(id==='terMaxPage')queueLinkedRender();});
    ctx.events.on('project:restored',()=>queueLinkedRender());
    ensureLayoutControls();
    ensureResistanceCard();
    ensurePerChartActions();
    ensurePortableCharts();
    applyLayoutSettings();
    bindKeyboardAdjuster();

    return {deactivate(){
      observer?.disconnect();observer=null;
      for(const [plotId,handler] of clickBindings){
        const el=document.getElementById(plotId);
        if(el&&typeof el.removeListener==='function'){try{el.removeListener('plotly_click',handler);}catch{}}
      }
      clickBindings.clear();
      unbindKeyboardAdjuster();
      const plot=document.getElementById('terResistancePlot');
      if(plot&&window.Plotly){try{Plotly.purge(plot);}catch{}}
      restorePerChartActions();
      document.getElementById('terPluginLayoutControls')?.remove();
      document.getElementById('terResistanceCard')?.remove();
    }};
  });
})();
