(() => {
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const fmt=(value,digits=5)=>{const n=Number(value);if(!Number.isFinite(n))return '—';if(Math.abs(n)>=1e4||(Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);return n.toFixed(digits);};
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';
  function project({selectedSweep=null,selectedPeak=null,workspace={},sweepById=null,peakMetrics=null}={}){
    const sw=selectedSweep||null,p=selectedPeak||null;
    if(!sw&&!p)return Object.freeze({kind:'empty',title:'',rows:Object.freeze([])});
    if(p){
      const psw=(typeof sweepById==='function'?sweepById(p.sweepId):null)||sw;
      const m=(typeof peakMetrics==='function'?peakMetrics(p):null)||{};
      const rows=[
        ['file','文件',String(psw?.datasetName||'—')],
        ['vg','Vg',`${fmt(p.vg,5)} V`],
        ['direction','扫描',directionName(p.direction)],
        ['vpk','Vpk',`${fmt(p.v,6)} V`],
        ['ipk','Ipk',`${fmt(p.i,6)} A`],
        ['fwhm','FWHM',finite(m.fwhm)?`${fmt(m.fwhm,6)} V`:'—（半高交点不完整）'],
        ['half-height','半高交点',finite(m.fwhmLeft)&&finite(m.fwhmRight)?`${fmt(m.fwhmLeft,6)} ~ ${fmt(m.fwhmRight,6)} V`:'—'],
        ['baseline','局部基线',m.baselineMode==='linear'?`线性 · ${fmt(m.baselineSlope,6)} A/V`:(m.baselineMode==='constant'?'常数':'—')],
        ['analysis-window','分析窗口',`${finite(m.analysisLeft)&&finite(m.analysisRight)?`${fmt(m.analysisLeft,5)} ~ ${fmt(m.analysisRight,5)} V`:'—'}${p.analysisManual?' · 手动范围':' · 自动范围'}`],
        ['amplitude','Amplitude',`${fmt(m.amplitude,6)} A`],
        ['area','Area',`${fmt(m.area,6)} A·V`],
        ['evidence','寻峰证据',String((p.supportChannels||p.algorithms||[]).join('、')||'手动')],
        ['confidence','置信度',finite(p.confidence)?`${Math.round(Number(p.confidence)*100)}%`:'—'],
        ['status','状态',`${p.accepted!==false?'采纳':'不采纳'}${p.locked?' · 已锁定':''}${p.manual?' · 手动':''}`]
      ].map(([key,label,value])=>Object.freeze({key,label,value}));
      return Object.freeze({kind:'peak',title:'选中峰',rows:Object.freeze(rows)});
    }
    const points=Array.isArray(sw?.points)?sw.points:[],peaks=Array.isArray(workspace?.peaks)?workspace.peaks:[];
    const rows=[
      ['file','文件',String(sw?.datasetName||'—')],
      ['vg','Vg',`${fmt(sw?.vg,5)} V`],
      ['direction','扫描',directionName(sw?.direction)],
      ['range','范围',`${fmt(points[0]?.v,4)} ~ ${fmt(points.at(-1)?.v,4)} V`],
      ['points','数据点',String(points.length)],
      ['peaks','峰',String(peaks.filter(q=>String(q?.sweepId||'')===String(sw?.id||'')).length)]
    ].map(([key,label,value])=>Object.freeze({key,label,value}));
    return Object.freeze({kind:'sweep',title:'选中曲线',rows:Object.freeze(rows)});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','inspector-detail-projection',Object.freeze({project}));
})();
