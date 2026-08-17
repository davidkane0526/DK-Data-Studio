(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  function gateLinearFit(rows,xKey,yKey){
    const pts=rows.map(r=>[Number(r[xKey]),Number(r[yKey])]).filter(([x,y])=>Number.isFinite(x)&&Number.isFinite(y));
    if(pts.length<2)return null;
    const n=pts.length;
    const mx=pts.reduce((s,p)=>s+p[0],0)/n;
    const my=pts.reduce((s,p)=>s+p[1],0)/n;
    let sxx=0,sxy=0,syy=0;
    for(const [x,y] of pts){sxx+=(x-mx)**2;sxy+=(x-mx)*(y-my);syy+=(y-my)**2;}
    if(sxx<=0)return null;
    const slope=sxy/sxx,intercept=my-slope*mx;
    const r=syy>0?sxy/Math.sqrt(sxx*syy):NaN;
    return {n,slope,intercept,r,r2:Number.isFinite(r)?r*r:NaN,xMin:Math.min(...pts.map(p=>p[0])),xMax:Math.max(...pts.map(p=>p[0]))};
  }

  function gatePearson(rows,xKey,yKey){
    return gateLinearFit(rows,xKey,yKey)?.r??NaN;
  }

  function gateJoinTerByVg(rows,ter){
    const map=new Map((ter||[]).map(d=>[String(d.vg),d]));
    return rows.map(r=>{
      const t=map.get(String(r.vg));
      return {...r,terMax:t?.terMax,vStar:t?.vdsAtMax};
    });
  }

  function pairGateSeries(Arows,Brows,terByVg,settings={}){
    const bMap=new Map((Brows||[]).map(r=>[String(r.vg),r]));
    const common=[];
    for(const a of Arows||[]){
      const b=bMap.get(String(a.vg));
      if(!b)continue;
      const delta=0.5*(b.v-a.v);
      const hwhmEff=0.5*(a.hwhm+b.hwhm);
      const fwhmEff=0.5*(a.fwhm+b.fwhm);
      const ampSum=a.amplitude+b.amplitude;
      common.push({
        vg:a.vg,
        vA:a.v,vB:b.v,
        V0:0.5*(a.v+b.v),
        delta,absDelta:Math.abs(delta),
        fwhmA:a.fwhm,fwhmB:b.fwhm,
        hwhmA:a.hwhm,hwhmB:b.hwhm,
        hwhmEff,fwhmEff,
        deltaOverW:hwhmEff>0?Math.abs(delta)/hwhmEff:NaN,
        iA:a.i,iB:b.i,
        amplitudeA:a.amplitude,amplitudeB:b.amplitude,
        amplitudeRatio:b.amplitude>0?a.amplitude/b.amplitude:NaN,
        etaEff:ampSum>0?a.amplitude/ampSum:NaN,
        baselineA:a.baseline,baselineB:b.baseline,
        peakToBgA:a.peakToBg,peakToBgB:b.peakToBg
      });
    }

    const rows=gateJoinTerByVg(common,terByVg);
    const e=1.602176634e-19;
    if(settings.useCarrierDensity&&Number.isFinite(Number(settings.cg))&&Number(settings.cg)>0){
      for(const r of rows){
        r.ng_m2=Number(settings.cg)*(r.vg-Number(settings.cnp||0))/e;
        r.ng_cm2=r.ng_m2/1e4;
      }
    }
    return rows;
  }

  function summarizeGateRows(rows,hysteresis=[]){
    return {
      fits:{
        V0:gateLinearFit(rows,'vg','V0'),
        delta:gateLinearFit(rows,'vg','delta'),
        deltaAbs:gateLinearFit(rows,'vg','absDelta'),
        deltaOverW:gateLinearFit(rows,'vg','deltaOverW'),
        terMax:gateLinearFit(rows,'vg','terMax'),
        vStar:gateLinearFit(rows,'vg','vStar'),
        eta:gateLinearFit(rows,'vg','etaEff'),
        hysteresis:gateLinearFit(hysteresis,'vg','absDeltaVR')
      },
      correlations:{
        terVsDeltaOverW:gatePearson(rows,'deltaOverW','terMax'),
        vStarVsV0:gatePearson(rows,'V0','vStar'),
        terVsDelta:gatePearson(rows,'absDelta','terMax'),
        terVsBg:gatePearson(rows,'baselineA','terMax')
      }
    };
  }

  return {gateLinearFit,gatePearson,gateJoinTerByVg,pairGateSeries,summarizeGateRows};
});
