(() => {
  const CHART_COUNT=7;
  const GRID_COLUMNS=[1,2,3,4,7];
  function finiteNumber(v){
    if(v===null||v===undefined||(typeof v==='string'&&!v.trim()))return null;
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
  function heatmapCsv(result){
    const rows=['Vg_V,Vds_V,TER_percent'];
    for(let r=0;r<(result?.vgs||[]).length;r++)for(let c=0;c<(result?.targets||[]).length;c++)rows.push([result.vgs[r],result.targets[c],result.matrix?.[r]?.[c]].map(csvCell).join(','));
    return rows.join('\n');
  }
  function resistanceCsv(result){
    const rows=['Vg_V,Vds_V,R_forward_ohm,R_reverse_ohm,I_forward_A,I_reverse_A,TER_percent,source_file'];
    for(const row of result?.records||[])rows.push([row.vg,row.vds,row.rUp,row.rDown,row.iUp,row.iDown,row.ter,row.sourceFile].map(csvCell).join(','));
    return rows.join('\n');
  }
  function maxVgCsv(result){
    const rows=['Vg_V,TER_Max_Vg_percent,Vd_at_max_V,I_forward_A,I_reverse_A,R_forward_ohm,R_reverse_ohm,selection_mode,source_file'];
    for(const row of result?.terMaxByVg||result?.terMax||[])rows.push([row.vg,row.ter,row.vdsAtMax,row.iUp,row.iDown,row.rUp,row.rDown,row.manual?'manual':'auto',row.sourceFile].map(csvCell).join(','));
    return rows.join('\n');
  }
  function maxVgArgCsv(result){
    const rows=['Vg_V,Vd_at_TER_Max_Vg_V,TER_Max_Vg_percent,selection_mode,source_file'];
    for(const row of result?.terMaxByVg||result?.terMax||[])rows.push([row.vg,row.vdsAtMax,row.ter,row.manual?'manual':'auto',row.sourceFile].map(csvCell).join(','));
    return rows.join('\n');
  }
  function maxVdCsv(result){
    const rows=['Vds_V,TER_Max_Vd_percent,Vg_at_max_V,I_forward_A,I_reverse_A,R_forward_ohm,R_reverse_ohm,selection_mode,source_file'];
    for(const row of result?.terMaxByVd||[])rows.push([row.vds,row.ter,row.vgAtMax,row.iUp,row.iDown,row.rUp,row.rDown,row.manual?'manual':'auto',row.sourceFile].map(csvCell).join(','));
    return rows.join('\n');
  }
  function maxVdArgCsv(result){
    const rows=['Vds_V,Vg_at_TER_Max_Vd_V,TER_Max_Vd_percent,selection_mode,source_file'];
    for(const row of result?.terMaxByVd||[])rows.push([row.vds,row.vgAtMax,row.ter,row.manual?'manual':'auto',row.sourceFile].map(csvCell).join(','));
    return rows.join('\n');
  }
  window.DKDSPluginModules.define('builtin.ter-analysis','feature-utils',Object.freeze({finiteNumber,nearlyEqual,formatNumber,csvCell,sanitizeLayout,heatmapCsv,resistanceCsv,maxVgCsv,maxVgArgCsv,maxVdCsv,maxVdArgCsv}));
})();
