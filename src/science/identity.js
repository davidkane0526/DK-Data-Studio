(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median}=core;

  function linearTrackFit(points){
    const pts=points.filter(q=>Number.isFinite(q.vg)&&Number.isFinite(q.v));
    if(pts.length<2)return null;
    const mx=pts.reduce((s,q)=>s+q.vg,0)/pts.length;
    const my=pts.reduce((s,q)=>s+q.v,0)/pts.length;
    let sxx=0,sxy=0;
    for(const q of pts){sxx+=(q.vg-mx)**2;sxy+=(q.vg-mx)*(q.v-my);}
    if(sxx<=1e-20)return null;
    return {slope:sxy/sxx,intercept:my-(sxy/sxx)*mx};
  }

  function enumerateTrackAssignments(peaks,K,predicted,referencePositions,scale){
    const m=peaks.length;
    if(!m||m>K)return null;
    let best=null;
    const chosen=[];

    function evaluate(){
      const diffs=chosen.map((k,j)=>peaks[j].v-predicted[k]);
      const commonShift=median(diffs)||0;
      let cost=0;
      for(let j=0;j<m;j++){
        const p=peaks[j],k=chosen[j];
        const target=predicted[k]+commonShift;
        const d=(p.v-target)/Math.max(scale,1e-6);
        cost+=d*d;

        const ref=referencePositions[k];
        if(Number.isFinite(ref)&&Math.abs(ref)>0.055&&Math.abs(p.v)>0.055&&Math.sign(ref)!==Math.sign(p.v)){
          cost+=30;
        }

        if((p.orderAnchor||p.locked)&&Number.isFinite(Number(p.peakOrder))){
          if(k!==Math.max(0,Math.round(Number(p.peakOrder))-1))cost+=1e7;
        }
      }

      for(let j=0;j<m;j++){
        const old=Math.round(Number(peaks[j].peakOrder)||0)-1;
        if(old>=0&&old<K&&old!==chosen[j])cost+=0.03;
      }

      if(!best||cost<best.cost)best={cost,tracks:chosen.slice(),commonShift};
    }

    function walk(j,startK){
      if(j===m){evaluate();return;}
      const remaining=m-j-1;
      for(let k=startK;k<=K-1-remaining;k++){
        if((peaks[j].orderAnchor||peaks[j].locked)&&Number.isFinite(Number(peaks[j].peakOrder))){
          const fixed=Math.max(0,Math.round(Number(peaks[j].peakOrder))-1);
          if(k!==fixed)continue;
        }
        chosen.push(k);
        walk(j+1,k+1);
        chosen.pop();
      }
    }
    walk(0,0);
    return best;
  }

  function solvePeakTracks(rows,{requestedSweep=null,minimumK=0}={}){
    if(!rows?.length)return {K:0,assignments:new Map(),fitsByDirection:new Map(),referencePositions:[],scale:NaN};

    let K=Math.max(Number(minimumK)||0,...rows.map(r=>r.peaks.length));
    for(const row of rows){
      for(const p of row.peaks){
        if(p.orderAnchor||p.locked)K=Math.max(K,Math.max(1,Math.round(Number(p.peakOrder)||1)));
      }
    }
    K=Math.max(1,K);

    const full=rows.filter(r=>r.peaks.length===K);
    let refRow=null;
    if(full.length){
      if(requestedSweep){
        refRow=full.slice().sort((a,b)=>{
          const da=Math.abs(a.sw.vg-requestedSweep.vg)+(a.sw.direction===requestedSweep.direction?0:.25);
          const db=Math.abs(b.sw.vg-requestedSweep.vg)+(b.sw.direction===requestedSweep.direction?0:.25);
          return da-db;
        })[0];
      }else{
        const vgs=full.map(r=>r.sw.vg).filter(Number.isFinite).sort((a,b)=>a-b);
        const mid=vgs.length?vgs[Math.floor(vgs.length/2)]:0;
        refRow=full.slice().sort((a,b)=>Math.abs(a.sw.vg-mid)-Math.abs(b.sw.vg-mid))[0];
      }
    }else{
      refRow=rows.slice().sort((a,b)=>b.peaks.length-a.peaks.length)[0];
    }

    const referencePositions=new Array(K).fill(NaN);
    if(refRow.peaks.length===K){
      refRow.peaks.forEach((p,i)=>referencePositions[i]=p.v);
    }else{
      for(const p of refRow.peaks){
        const o=Math.round(Number(p.peakOrder)||0);
        if(o>=1&&o<=K)referencePositions[o-1]=p.v;
      }
      const sorted=refRow.peaks.map(p=>p.v).sort((a,b)=>a-b);
      for(let i=0;i<K;i++){
        if(Number.isFinite(referencePositions[i]))continue;
        const frac=K===1?0:i/(K-1);
        referencePositions[i]=sorted[0]+frac*((sorted.at(-1)??sorted[0])-sorted[0]);
      }
    }

    const gaps=[];
    for(let k=1;k<K;k++){
      const g=Math.abs(referencePositions[k]-referencePositions[k-1]);
      if(g>1e-6)gaps.push(g);
    }
    const scale=Math.max(0.045,(median(gaps)||0.14)*0.42);

    let assignments=new Map();
    let fitsByDirection=new Map();

    for(let iteration=0;iteration<4;iteration++){
      const next=new Map();
      for(const row of rows){
        const predicted=referencePositions.map((ref,k)=>{
          const f=fitsByDirection.get(row.sw.direction)?.[k];
          return f?f.slope*row.sw.vg+f.intercept:ref;
        });
        const result=enumerateTrackAssignments(row.peaks,K,predicted,referencePositions,scale);
        if(result)next.set(row.sw.id,result.tracks);
      }
      assignments=next;

      fitsByDirection=new Map();
      for(const direction of [1,-1]){
        const fits=new Array(K).fill(null);
        for(let k=0;k<K;k++){
          const pts=[];
          for(const row of rows.filter(r=>r.sw.direction===direction)){
            const tracks=assignments.get(row.sw.id);
            if(!tracks)continue;
            const j=tracks.indexOf(k);
            if(j>=0)pts.push({vg:row.sw.vg,v:row.peaks[j].v});
          }
          fits[k]=linearTrackFit(pts);
        }
        fitsByDirection.set(direction,fits);
      }
    }

    return {K,assignments,fitsByDirection,referencePositions,scale,referenceSweepId:refRow?.sw?.id||null};
  }

  return {linearTrackFit,enumerateTrackAssignments,solvePeakTracks};
});
