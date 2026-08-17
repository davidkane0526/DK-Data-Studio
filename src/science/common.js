(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const ALG_COLORS = {
    raw: '#64748b',
    snr: '#64748b',
    diff: '#64748b',
    detrend: '#64748b',
    curvature: '#64748b',
    matched: '#64748b',
    manual: '#64748b'
  };

  // Algorithm identity is represented by SHAPE in the UI.
  // Peak order / user label is represented by COLOR.
  const ALG_SYMBOLS = {
    raw: 'circle',
    snr: 'diamond',
    diff: 'triangle',
    detrend: 'square',
    curvature: 'cross',
    matched: 'circle',
    dlog: 'hexagon',
    dvdi: 'kite',
    resistance: 'triangle-down',
    manual: 'star'
  };

  function median(arr){
    const a = arr.filter(Number.isFinite).slice().sort((x,y)=>x-y);
    if(!a.length) return NaN;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function mad(arr){
    const m=median(arr); if(!Number.isFinite(m)) return NaN;
    return 1.4826*median(arr.map(v=>Math.abs(v-m)));
  }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function nearestIndex(xs, x){
    let lo=0, hi=xs.length-1;
    if(!xs.length) return -1;
    while(hi-lo>1){ const mid=(lo+hi)>>1; if(xs[mid]<x) lo=mid; else hi=mid; }
    return Math.abs(xs[lo]-x)<=Math.abs(xs[hi]-x)?lo:hi;
  }

  return {ALG_COLORS,ALG_SYMBOLS,median,mad,clamp,nearestIndex};
});
