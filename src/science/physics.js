(function(root,factory){
  const core=(root.GRSScience=root.GRSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median}=core;

  const PHYSICS_TYPES={
    R:{name:'静态共振候选',detail:'正反扫均稳定存在，峰位差相对峰宽较小。'},
    H:{name:'历史依赖共振',detail:'正反扫均可追踪，但峰位存在显著扫描历史偏移。'},
    D:{name:'动态/切换候选',detail:'主要稳定存在于单一扫描方向；需与 switching ridge / 畴动力学进一步核对。'},
    X:{name:'额外稳定 ridge',detail:'第三条及以上稳定双向 ridge；仅在简单模型不足时考虑有限转角等额外机制。'},
    Q:{name:'待定',detail:'跨栅压/跨扫描方向证据尚不足。'}
  };

  function medianFinite(values){
    const a=values.filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return NaN;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:0.5*(a[m-1]+a[m]);
  }

  function analyzePhysicalFamilies({peaks,sweepById,peakMetrics,labelForOrder}){
    const accepted=(peaks||[]).filter(p=>p.accepted);
    const byOrder=new Map();
    for(const p of accepted){
      const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
      if(!byOrder.has(order))byOrder.set(order,[]);
      byOrder.get(order).push(p);
    }

    const families=[];
    const peakMap=new Map();

    for(const [order,arr] of [...byOrder.entries()].sort((a,b)=>a[0]-b[0])){
      const forward=arr.filter(p=>p.direction>0);
      const reverse=arr.filter(p=>p.direction<0);
      const fVgs=[...new Set(forward.map(p=>p.vg).filter(Number.isFinite))];
      const rVgs=[...new Set(reverse.map(p=>p.vg).filter(Number.isFinite))];
      const fMap=new Map(forward.map(p=>[String(p.vg),p]));
      const rMap=new Map(reverse.map(p=>[String(p.vg),p]));
      const common=[...fMap.keys()].filter(k=>rMap.has(k));

      const deltas=common.map(k=>Math.abs(fMap.get(k).v-rMap.get(k).v));
      const widths=arr.map(p=>{
        const sw=sweepById(p.sweepId);
        return sw?peakMetrics(p,sw).fwhm:NaN;
      });
      const medianWidth=medianFinite(widths);
      const medianDelta=medianFinite(deltas);
      const threshold=Math.max(0.04,Number.isFinite(medianWidth)?0.50*medianWidth:0.06);
      const stableF=fVgs.length>=3;
      const stableR=rVgs.length>=3;
      const bothStable=stableF&&stableR&&common.length>=2;

      let code='Q';
      if(bothStable&&order>2)code='X';
      else if(bothStable&&Number.isFinite(medianDelta)&&medianDelta<=threshold)code='R';
      else if(bothStable)code='H';
      else if((stableF||stableR)&&!(stableF&&stableR))code='D';

      const row={
        order,label:labelForOrder(order),code,
        type:PHYSICS_TYPES[code].name,
        forwardCount:fVgs.length,reverseCount:rVgs.length,
        commonCount:common.length,
        medianDelta,medianWidth,threshold,
        stableF,stableR,bothStable
      };
      families.push(row);
      for(const p of arr)peakMap.set(p.id,row);
    }

    const stableBoth=families.filter(f=>f.bothStable);
    const dynamic=families.filter(f=>f.code==='H'||f.code==='D');
    const extras=families.filter(f=>f.code==='X');

    let modelCode='M0',modelTitle='证据不足：继续提取/人工确认 ridge';
    let modelText='当前稳定峰轨迹不足，暂不增加物理模型复杂度。';

    if(extras.length){
      modelCode='M3';
      modelTitle='M3：存在额外稳定 ridge，有限转角为候选机制';
      modelText='已出现第三条及以上跨 Vg、正反扫均稳定的 ridge。应先确认 M1/M2 无法解释，再讨论有限转角或其他额外通道。';
    }else if(dynamic.length){
      modelCode='M2';
      modelTitle='M2：动态多畴 / 历史依赖模型优先';
      modelText='存在明显正反扫偏移或单向稳定特征。应将共振 ridge 与 switching/dynamic ridge 分开追踪。';
    }else if(stableBoth.length&&stableBoth.length<=2){
      modelCode='M1';
      modelTitle='M1：零转角静态两-ridge 模型优先';
      modelText='当前主要稳定轨迹不超过两条，且正反扫差异相对较小。优先用最简单静态共振模型描述。';
    }

    let v0Delta=null;
    if(stableBoth.length>=2){
      const a=stableBoth[0],b=stableBoth[1];
      const pa=accepted.filter(p=>Number(p.peakOrder)===a.order);
      const pb=accepted.filter(p=>Number(p.peakOrder)===b.order);
      const vgs=[...new Set(pa.map(p=>p.vg).filter(v=>pb.some(q=>q.vg===v)))].sort((x,y)=>x-y);
      const rows=[];
      for(const vg of vgs){
        const meanV=list=>{
          const vals=list.filter(p=>p.vg===vg).map(p=>p.v);
          return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:NaN;
        };
        const va=meanV(pa),vb=meanV(pb);
        if(Number.isFinite(va)&&Number.isFinite(vb)){
          rows.push({vg,V0:0.5*(va+vb),delta:0.5*Math.abs(vb-va)});
        }
      }
      if(rows.length)v0Delta=rows;
    }

    return {families,peakMap,modelCode,modelTitle,modelText,v0Delta};
  }

  return {PHYSICS_TYPES,medianFinite,analyzePhysicalFamilies};
});
