(function(root,factory){
  const core=root.DKDSScience||{},modules=root.DKDSPluginModules;if(!modules?.define)throw new Error('Plugin Module Runtime unavailable.');
  if(modules.get?.('builtin.resonance-detector-robust','algorithm'))return;
  modules.define('builtin.resonance-detector-robust','algorithm',Object.freeze(factory(core)));
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median,mad,clamp,nearestIndex,preset}=core;
  function buildSweeps(dataset){
    const pts=dataset.points;
    if(pts.length<2) return [];
    const dvs=[]; for(let k=1;k<pts.length;k++) if(Math.abs(pts[k].v-pts[k-1].v)>1e-12) dvs.push(Math.abs(pts[k].v-pts[k-1].v));
    const step=median(dvs)||0.01;

    const runs=[];
    let start=0, dir=0;
    function edgeDir(a,b){ const d=b.v-a.v; return d>step*0.05?1:d<-step*0.05?-1:0; }
    for(let k=1;k<pts.length;k++){
      const ed=edgeDir(pts[k-1],pts[k]);
      if(ed===0) continue;
      if(dir===0){dir=ed;start=Math.max(0,k-1);continue;}
      if(ed!==dir){
        runs.push({dir,points:pts.slice(start,k),startIndex:start,endIndex:k-1});
        start=Math.max(0,k-1); dir=ed;
      }
    }
    if(dir!==0) runs.push({dir,points:pts.slice(start),startIndex:start,endIndex:pts.length-1});

    function range(r){const xs=r.points.map(p=>p.v);return [Math.min(...xs),Math.max(...xs)];}
    const groups=[];
    for(const r of runs){
      const [r0,r1]=range(r);
      let target=null;
      for(const g of groups){
        if(g.dir!==r.dir) continue;
        const [g0,g1]=g.range;
        const overlap=Math.max(0,Math.min(g1,r1)-Math.max(g0,r0));
        const minSpan=Math.max(step,Math.min(g1-g0,r1-r0));
        const gap=Math.max(0,Math.max(g0,r0)-Math.min(g1,r1));
        const onlyEndpointOrGap = overlap <= 3*step || gap <= 3*step;
        const largeOverlap = overlap/minSpan > 0.20;
        // Merge split pieces of one same-direction sweep, but not a repeated full cycle.
        if(onlyEndpointOrGap && !largeOverlap){ target=g; break; }
      }
      if(!target){target={dir:r.dir,runs:[],range:[r0,r1]};groups.push(target);}
      target.runs.push(r);
      target.range=[Math.min(target.range[0],r0),Math.max(target.range[1],r1)];
    }

    const sweeps=[];
    let upCount=0,downCount=0;
    for(const g of groups){
      const bucket=new Map();
      for(const r of g.runs){
        for(const p of r.points){
          const key=(Math.round(p.v/step)*step).toFixed(12);
          if(!bucket.has(key)) bucket.set(key,[]);
          bucket.get(key).push(p);
        }
      }
      const merged=[];
      for(const arr of bucket.values()){
        const v=arr.reduce((s,p)=>s+p.v,0)/arr.length;
        const i=arr.reduce((s,p)=>s+p.i,0)/arr.length;
        merged.push({v,i,rawIndices:arr.map(p=>p.index)});
      }
      merged.sort((a,b)=>a.v-b.v);
      const cycleIndex=g.dir>0?++upCount:++downCount;
      const name=g.dir>0?(upCount===1?'正扫':`正扫 ${cycleIndex}`):(downCount===1?'反扫':`反扫 ${cycleIndex}`);
      sweeps.push({
        id:`${dataset.path}::${g.dir>0?'up':'down'}::${cycleIndex}`,
        datasetPath:dataset.path,datasetName:dataset.name,vg:dataset.vg,
        direction:g.dir,scanLabel:name,points:merged,step,
        sourceRuns:g.runs.map(r=>({start:r.startIndex,end:r.endIndex}))
      });
    }
    return sweeps.sort((a,b)=>b.direction-a.direction);
  }

  function movingAverage(y, radius){
    const out=new Array(y.length); const r=Math.max(1,Math.round(radius));
    let sum=0;
    for(let i=0;i<y.length;i++){
      sum+=y[i]; if(i-r-1>=0) sum-=y[i-r-1];
      const lo=Math.max(0,i-r), hi=i; out[i]=sum/(hi-lo+1);
    }
    // symmetric pass
    const out2=new Array(y.length); sum=0;
    for(let i=y.length-1;i>=0;i--){
      sum+=out[i]; if(i+r+1<y.length) sum-=out[i+r+1];
      const hi=Math.min(y.length-1,i+r), lo=i; out2[i]=sum/(hi-lo+1);
    }
    return out2;
  }

  function localProminence(y,j,window=12){
    const lo=Math.max(0,j-window), hi=Math.min(y.length-1,j+window);
    let lmin=Infinity,rmin=Infinity;
    for(let k=lo;k<=j;k++) lmin=Math.min(lmin,y[k]);
    for(let k=j;k<=hi;k++) rmin=Math.min(rmin,y[k]);
    return y[j]-Math.max(lmin,rmin);
  }

  function estimateWidth(points,j){
    const y=points.map(p=>Math.abs(p.i)); const peak=y[j];
    const prom=Math.max(0,localProminence(y,j,16));
    const baseline=peak-prom; const half=baseline+prom/2;
    let l=j,r=j;
    while(l>0 && y[l]>half) l--;
    while(r<y.length-1 && y[r]>half) r++;
    const left=points[l].v,right=points[r].v;
    return {left,right,fwhm:Math.max(points[1]?.v-points[0]?.v||0, right-left)};
  }


  function robustFiniteScale(values, fallback=1e-30){
    const finite=values.filter(Number.isFinite);
    if(!finite.length)return fallback;
    const m=mad(finite);
    if(Number.isFinite(m)&&m>0)return m;
    const med=median(finite.map(v=>Math.abs(v)));
    return Number.isFinite(med)&&med>0?med*0.05:fallback;
  }

  function derivativeArray(y,x){
    const out=new Array(y.length).fill(NaN);
    if(y.length<2)return out;
    for(let j=1;j<y.length-1;j++){
      const dx=x[j+1]-x[j-1];
      if(Number.isFinite(y[j-1])&&Number.isFinite(y[j+1])&&Math.abs(dx)>1e-15){
        out[j]=(y[j+1]-y[j-1])/dx;
      }
    }
    if(y.length>=2){
      const dx0=x[1]-x[0],dx1=x.at(-1)-x.at(-2);
      if(Number.isFinite(y[0])&&Number.isFinite(y[1])&&Math.abs(dx0)>1e-15)out[0]=(y[1]-y[0])/dx0;
      if(Number.isFinite(y.at(-1))&&Number.isFinite(y.at(-2))&&Math.abs(dx1)>1e-15)out[out.length-1]=(y.at(-1)-y.at(-2))/dx1;
    }
    return out;
  }

  function computeTransformSweep(sweep,type='raw',options={}){
    const pts=sweep?.points||[];
    if(!pts.length)return {type,points:[],unit:'',label:type};
    const x=pts.map(p=>p.v);
    const rawI=pts.map(p=>p.i);
    const absI=rawI.map(Math.abs);
    const step=Math.abs(sweep.step||median(x.slice(1).map((v,i)=>v-x[i]))||0.01);
    const radius=Math.max(1,Math.round(options.radius??2));
    const smI=movingAverage(rawI,radius);
    const smAbs=movingAverage(absI,radius);
    const bgRadius=Math.max(radius+3,Math.round(0.14/Math.max(step,1e-12)));
    const bg=movingAverage(absI,bgRadius);
    const residual=absI.map((v,i)=>v-bg[i]);

    const didv=derivativeArray(smI,x);
    const d2idv2=derivativeArray(didv,x);
    const dAbsDidv=derivativeArray(smAbs,x);
    const d2abs=derivativeArray(dAbsDidv,x);

    const currentScale=Math.max(median(absI.filter(v=>v>0))||0,1e-30);
    const currentFloor=Math.max(options.currentFloor||0,currentScale*1e-7,1e-18);
    const logI=absI.map(v=>Math.log(Math.max(v,currentFloor)));
    const dlog=derivativeArray(movingAverage(logI,radius),x);

    const gScale=Math.max(median(didv.filter(Number.isFinite).map(Math.abs))||0,1e-30);
    const gFloor=Math.max(gScale*1e-3,1e-30);
    const dvdi=didv.map(g=>Number.isFinite(g)&&Math.abs(g)>gFloor?1/g:NaN);
    const resistance=pts.map(p=>Math.abs(p.i)>currentFloor?Math.abs(p.v/p.i):NaN);

    const defs={
      raw:{y:rawI,label:'原始 I–V',unit:'A'},
      detrend:{y:residual,label:'去背景 I−I_bg',unit:'A'},
      didv:{y:didv,label:'dI/dV',unit:'A/V'},
      d2idv2:{y:d2idv2,label:'d²I/dV²',unit:'A/V²'},
      dlog:{y:dlog,label:'d ln|I|/dV',unit:'1/V'},
      dvdi:{y:dvdi,label:'dV/dI',unit:'V/A'},
      resistance:{y:resistance,label:'R=|V/I|',unit:'Ω'}
    };
    const def=defs[type]||defs.raw;
    return {
      type,
      label:def.label,
      unit:def.unit,
      points:pts.map((p,i)=>({v:p.v,y:def.y[i],rawIndex:i,rawI:p.i})),
      background:bg,
      residual,
      didv,
      d2idv2,
      d2abs,
      dlog,
      dvdi,
      resistance
    };
  }

  function transformSweep(sweep,type='raw',options={}){
    const perf=globalThis.DKDSPerformance;
    if(!perf?.memoWeak||!sweep||typeof sweep!=='object')return computeTransformSweep(sweep,type,options);
    const key=[String(type||'raw'),Number(options?.radius??2),Number(options?.currentFloor??0),Number(sweep?.step??0)].join('|');
    return perf.memoWeak('science.transformSweep',sweep,key,()=>computeTransformSweep(sweep,type,options),{signature:sweep.points,limit:12});
  }

  function localExtremaScore(y,j,kind='max',window=5){
    const lo=Math.max(0,j-window),hi=Math.min(y.length-1,j+window);
    const center=y[j];
    if(!Number.isFinite(center))return NaN;
    const sides=[];
    for(let k=lo;k<=hi;k++){
      if(Math.abs(k-j)>=Math.max(2,Math.floor(window/2))&&Number.isFinite(y[k]))sides.push(y[k]);
    }
    if(!sides.length)return NaN;
    const sideRef=median(sides);
    const noise=robustFiniteScale(sides.map(v=>v-sideRef));
    const effect=kind==='min'?sideRef-center:center-sideRef;
    return effect/Math.max(noise,1e-30);
  }

  function transformedCandidates(sweep,algorithm,threshold){
    const radii=(algorithm==='raw'||algorithm==='snr')?[1]:[1,2,3];
    const out=[];
    for(const radius of radii){
      const t=transformSweep(sweep,
        algorithm==='diff'?'didv':
        algorithm==='curvature'?'d2idv2':
        algorithm==='dlog'?'dlog':
        algorithm==='dvdi'?'dvdi':
        algorithm==='resistance'?'resistance':
        algorithm==='detrend'?'detrend':'raw',
        {radius}
      );
      const y=t.points.map(p=>p.y);
      const absRaw=sweep.points.map(p=>Math.abs(p.i));
      const step=Math.abs(sweep.step||0.01);

      if(algorithm==='raw'||algorithm==='snr'){
        for(let j=2;j<absRaw.length-2;j++){
          if(!(absRaw[j]>absRaw[j-1]&&absRaw[j]>=absRaw[j+1]))continue;
          const prom=localProminence(absRaw,j,Math.max(8,Math.round(0.12/Math.max(step,1e-12))));
          const local=[];
          for(let k=Math.max(1,j-10);k<=Math.min(absRaw.length-2,j+10);k++){
            if(Math.abs(k-j)>2)local.push(absRaw[k+1]-2*absRaw[k]+absRaw[k-1]);
          }
          const noise=Math.max((mad(local)||0)/Math.sqrt(6),Math.abs(absRaw[j])*1e-5,1e-30);
          const score=prom/noise;
          if(score>=threshold){
            out.push({index:j,score,algorithm,channel:algorithm,scale:radius,prominence:prom,snr:score});
          }
        }
        continue;
      }

      if(algorithm==='detrend'){
        const noise=robustFiniteScale(y);
        for(let j=2;j<y.length-2;j++){
          if(Number.isFinite(y[j])&&y[j]>0&&y[j]>y[j-1]&&y[j]>=y[j+1]){
            const score=y[j]/Math.max(noise,1e-30);
            if(score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius,residual:y[j]});
          }
        }
        continue;
      }

      if(algorithm==='diff'||algorithm==='dlog'){
        for(let j=3;j<y.length-3;j++){
          if(!Number.isFinite(y[j]))continue;
          if(y[j]<=y[j-1]&&y[j]<y[j+1]){
            const score=localExtremaScore(y,j,'min',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='curvature'){
        // Detection uses curvature of |I| so positive- and negative-current
        // resonances have the same sign convention. Preview still shows d²I/dV².
        const curvature=t.d2abs.map(v=>Number.isFinite(v)?-v:NaN);
        for(let j=3;j<curvature.length-3;j++){
          if(!Number.isFinite(curvature[j]))continue;
          if(curvature[j]>=curvature[j-1]&&curvature[j]>curvature[j+1]){
            const score=localExtremaScore(curvature,j,'max',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='dvdi'){
        const ay=y.map(v=>Number.isFinite(v)?Math.abs(v):NaN);
        const finite=ay.filter(Number.isFinite);
        const med=median(finite)||0;
        const cap=(med||1)*1000;
        for(let j=3;j<ay.length-3;j++){
          if(!Number.isFinite(ay[j])||ay[j]>cap)continue;
          if(ay[j]>=ay[j-1]&&ay[j]>ay[j+1]){
            const score=localExtremaScore(ay,j,'max',5);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
        continue;
      }

      if(algorithm==='resistance'){
        for(let j=3;j<y.length-3;j++){
          if(Math.abs(sweep.points[j].v)<Math.max(0.03,2*step))continue;
          if(!Number.isFinite(y[j]))continue;
          if(y[j]<=y[j-1]&&y[j]<y[j+1]){
            const score=localExtremaScore(y,j,'min',6);
            if(Number.isFinite(score)&&score>=threshold)out.push({index:j,score,algorithm,channel:algorithm,scale:radius});
          }
        }
      }
    }
    return out;
  }

  function projectCandidateToRaw(sweep,centerIndex,items){
    const pts=sweep.points,absI=pts.map(p=>Math.abs(p.i));
    const step=Math.abs(sweep.step||0.01);
    const spread=Math.max(0,...items.map(z=>Math.abs(z.index-centerIndex)));
    const radius=Math.max(3,spread+2,Math.round(0.055/Math.max(step,1e-12)));
    const lo=Math.max(1,centerIndex-radius),hi=Math.min(pts.length-2,centerIndex+radius);

    const bgRadius=Math.max(radius+3,Math.round(0.14/Math.max(step,1e-12)));
    const bg=movingAverage(absI,bgRadius);
    const residual=absI.map((v,i)=>v-bg[i]);
    const noise=robustFiniteScale(residual.slice(Math.max(0,lo-radius),Math.min(residual.length,hi+radius+1)));

    const rawMaxima=[];
    for(let j=lo;j<=hi;j++){
      if(absI[j]>absI[j-1]&&absI[j]>=absI[j+1]){
        const prom=localProminence(absI,j,Math.max(8,radius));
        const score=(Math.max(0,residual[j])/Math.max(noise,1e-30))*1.4 +
          prom/Math.max(Math.abs(absI[j])*0.01,noise,1e-30) -
          0.12*Math.abs(j-centerIndex);
        rawMaxima.push({j,score});
      }
    }
    if(rawMaxima.length){
      rawMaxima.sort((a,b)=>b.score-a.score);
      return {index:rawMaxima[0].j,method:'raw-local-maximum'};
    }

    // Monotonic shoulder: choose the strongest ORIGINAL-I residual sample.
    // This is still an actual measured I-V point; derivative/R transforms never
    // become the reported Vpk coordinate.
    let best={j:clamp(centerIndex,lo,hi),score:-Infinity};
    for(let j=lo;j<=hi;j++){
      const score=(Number.isFinite(residual[j])?residual[j]:-Infinity)-0.05*noise*Math.abs(j-centerIndex);
      if(score>best.score)best={j,score};
    }
    return {index:best.j,method:'raw-residual-projection'};
  }

  function rawProminence(sweep, threshold){
    const pts=sweep.points, y=pts.map(p=>Math.abs(p.i)); const out=[];
    for(let j=1;j<pts.length-1;j++){
      if(y[j]>y[j-1] && y[j]>=y[j+1]){
        const prom=localProminence(y,j,14);
        const scale=Math.max(Math.abs(y[j]),1e-30);
        if(prom/scale>=threshold){out.push({index:j,score:prom/scale,prominence:prom});}
      }
    }
    return out;
  }

  function localSnr(sweep, threshold){
    const pts=sweep.points,y=pts.map(p=>Math.abs(p.i)); const out=[];
    for(let j=2;j<pts.length-2;j++){
      if(!(y[j]>y[j-1]&&y[j]>=y[j+1])) continue;
      const prom=localProminence(y,j,12);
      const lo=Math.max(1,j-10),hi=Math.min(y.length-2,j+10),d2=[];
      for(let k=lo;k<=hi;k++) if(Math.abs(k-j)>2) d2.push(y[k+1]-2*y[k]+y[k-1]);
      const noise=(mad(d2)||1e-30)/Math.sqrt(6); const snr=prom/Math.max(noise,1e-30);
      if(snr>=threshold) out.push({index:j,score:snr,prominence:prom,snr});
    }
    return out;
  }

  function differentialDip(sweep, threshold){
    const pts=sweep.points; if(pts.length<9) return [];
    const dx=sweep.step||median(pts.slice(1).map((p,i)=>p.v-pts[i].v))||0.01;
    const y=pts.map(p=>p.i); const sm=movingAverage(y,2); const g=new Array(y.length).fill(NaN);
    for(let j=1;j<y.length-1;j++) g[j]=(sm[j+1]-sm[j-1])/(2*dx);
    const out=[];
    for(let j=2;j<g.length-2;j++){
      if(!Number.isFinite(g[j])) continue;
      if(g[j]<g[j-1]&&g[j]<=g[j+1]){
        const left=Math.max(g[j-2],g[j-1]), right=Math.max(g[j+1],g[j+2]);
        const depth=Math.min(left-g[j],right-g[j]);
        const scale=Math.max(Math.abs(g[j]),0.5*(Math.abs(left)+Math.abs(right)),1e-30);
        const rel=depth/scale;
        if(rel>=threshold) out.push({index:j,score:rel,diffDepth:rel,gmin:g[j]});
      }
    }
    return out;
  }

  function detrendedShoulder(sweep, threshold){
    const pts=sweep.points,y=pts.map(p=>Math.abs(p.i)); const r=Math.max(4,Math.round(0.16/(sweep.step||0.01)));
    const bg=movingAverage(y,r); const res=y.map((v,i)=>v-bg[i]); const noise=mad(res)||1e-30; const out=[];
    for(let j=1;j<res.length-1;j++){
      if(res[j]>res[j-1]&&res[j]>=res[j+1]&&res[j]/noise>=threshold) out.push({index:j,score:res[j]/noise,residual:res[j]});
    }
    return out;
  }

  function curvatureCandidates(sweep, threshold){
    const pts=sweep.points,y=movingAverage(pts.map(p=>Math.abs(p.i)),2); const dx=sweep.step||0.01; const c=new Array(y.length).fill(0);
    for(let j=1;j<y.length-1;j++) c[j]=-(y[j+1]-2*y[j]+y[j-1])/(dx*dx);
    const noise=mad(c)||1e-30; const out=[];
    for(let j=2;j<c.length-2;j++) if(c[j]>c[j-1]&&c[j]>=c[j+1]&&c[j]/noise>=threshold) out.push({index:j,score:c[j]/noise,curvature:c[j]});
    return out;
  }


  // ------------------------------------------------------------------
  // v3.7 robust multiscale matched-filter core
  // ------------------------------------------------------------------
  function rollingMedian(y,radius){
    const r=Math.max(1,Math.round(radius));
    const out=new Array(y.length).fill(NaN);
    for(let j=0;j<y.length;j++){
      const lo=Math.max(0,j-r),hi=Math.min(y.length-1,j+r);
      out[j]=median(y.slice(lo,hi+1));
    }
    return out;
  }

  function matchedFilterCandidates(sweep,mode='balanced',range=null){
    const pts=sweep.points||[];
    if(pts.length<11)return [];
    const x=pts.map(p=>p.v);
    const y=pts.map(p=>Math.abs(p.i));
    const step=Math.max(Math.abs(sweep.step||median(x.slice(1).map((v,i)=>v-x[i]))||0.01),1e-12);

    // A rolling median is deliberately used instead of a polynomial global
    // background: it tolerates strong asymmetric tunnelling background and
    // isolated resonances without pulling the baseline through the peak.
    const bgRadius=Math.max(5,Math.round(0.20/step));
    const bg=rollingMedian(y,bgRadius);
    const residual=y.map((v,i)=>v-bg[i]);

    // Noise is estimated from first differences of the detrended residual,
    // which is much less sensitive to the slowly varying tunnelling current.
    const diffs=[];
    for(let j=1;j<residual.length;j++){
      if(Number.isFinite(residual[j])&&Number.isFinite(residual[j-1]))diffs.push((residual[j]-residual[j-1])/Math.sqrt(2));
    }
    const globalNoise=Math.max(mad(diffs)||mad(residual)||0,median(y)*1e-5||0,1e-30);

    const scaleV=[0.018,0.028,0.042,0.062,0.090,0.130];
    const threshold=mode==='strict'?4.7:mode==='sensitive'?2.9:3.65;
    const out=[];

    for(const sigmaV of scaleV){
      const sigma=Math.max(1.15,sigmaV/step);
      const kr=Math.max(3,Math.ceil(3.2*sigma));
      if(2*kr+3>=pts.length)continue;

      // Zero-mean Mexican-hat/Ricker kernel. Zero mean suppresses a local
      // linear/constant background and makes shoulders visible without
      // reporting the transform coordinate as the final Vpk.
      const kernel=[];
      for(let q=-kr;q<=kr;q++){
        const t=q/sigma;
        kernel.push((1-t*t)*Math.exp(-0.5*t*t));
      }
      const km=kernel.reduce((s,v)=>s+v,0)/kernel.length;
      for(let k=0;k<kernel.length;k++)kernel[k]-=km;
      const norm=Math.sqrt(kernel.reduce((s,v)=>s+v*v,0))||1;

      const resp=new Array(pts.length).fill(NaN);
      for(let j=kr;j<pts.length-kr;j++){
        let sum=0;
        for(let q=-kr;q<=kr;q++)sum+=kernel[q+kr]*residual[j+q];
        resp[j]=sum/norm;
      }

      const respNoise=Math.max(mad(resp.filter(Number.isFinite))||0,globalNoise,1e-30);
      for(let j=kr+1;j<pts.length-kr-1;j++){
        if(!Number.isFinite(resp[j]))continue;
        if(!(resp[j]>resp[j-1]&&resp[j]>=resp[j+1]))continue;
        const score=resp[j]/respNoise;
        if(score<threshold)continue;

        const v=pts[j].v;
        if(range){
          if(Number.isFinite(range.vMin)&&v<range.vMin)continue;
          if(Number.isFinite(range.vMax)&&v>range.vMax)continue;
        }
        out.push({
          index:j,
          score,
          algorithm:'matched',
          channel:'matched',
          scale:sigmaV,
          matchedResponse:resp[j]
        });
      }
    }
    return out;
  }

  function pointInsideDetectionRange(point,range){
    if(!range)return true;
    if(Number.isFinite(range.vMin)&&point.v<range.vMin)return false;
    if(Number.isFinite(range.vMax)&&point.v>range.vMax)return false;
    if(Number.isFinite(range.iMin)&&point.i<range.iMin)return false;
    if(Number.isFinite(range.iMax)&&point.i>range.iMax)return false;
    return true;
  }

  function detectPeaks(sweep, settings, options={}){
    const defaults=preset(settings?._preset||'balanced');
    const cfg={...defaults,...(settings||{})};
    const keys=['raw','snr','diff','detrend','curvature','dlog','dvdi','resistance'];
    const detections=[];
    const mode=['strict','balanced','sensitive'].includes(cfg._preset)?cfg._preset:'balanced';
    const range=options?.range||null;

    // Candidate collection is intentionally permissive. Acceptance is decided
    // later by independent evidence, persistence across scales, and the new
    // matched-filter core.
    const collectFactor=mode==='strict'?0.84:mode==='sensitive'?0.78:0.68;

    for(const key of keys){
      const c=cfg[key]||defaults[key];
      if(!c?.enabled)continue;
      const arr=transformedCandidates(sweep,key,Number(c.threshold)*collectFactor);
      for(const d of arr){
        const pt=sweep.points[d.index];
        if(!pt)continue;
        if(range){
          const pad=Math.max(0.02,2*Math.abs(sweep.step||0.01));
          if(Number.isFinite(range.vMin)&&pt.v<range.vMin-pad)continue;
          if(Number.isFinite(range.vMax)&&pt.v>range.vMax+pad)continue;
        }
        detections.push(d);
      }
    }

    // Always-on core: robust, multiscale, zero-mean matched filtering.
    // It is not exposed as another user threshold because the user-facing
    // workflow should remain only Reliable / Balanced / Sensitive.
    detections.push(...matchedFilterCandidates(sweep,mode,range));
    if(!detections.length)return [];

    detections.sort((a,b)=>a.index-b.index);
    const tol=Math.max(1,Math.round(0.045/Math.max(Math.abs(sweep.step||0.01),1e-12)));
    const clusters=[];
    for(const d of detections){
      let g=null,bestDist=Infinity;
      for(const c of clusters){
        const dist=Math.abs(c.centerIndex-d.index);
        if(dist<=tol&&dist<bestDist){g=c;bestDist=dist;}
      }
      if(!g){g={items:[],centerIndex:d.index};clusters.push(g);}
      g.items.push(d);
      const weights=g.items.map(z=>Math.max(1,Math.min(14,Number(z.score)||1)));
      const denom=weights.reduce((s,v)=>s+v,0);
      g.centerIndex=Math.round(g.items.reduce((s,z,i)=>s+z.index*weights[i],0)/Math.max(denom,1e-30));
    }

    const candidates=[];
    for(const c of clusters){
      const channels=[...new Set(c.items.map(z=>z.channel))];
      const scales=[...new Set(c.items.map(z=>`${z.channel}:${z.scale}`))];
      const matchedItems=c.items.filter(z=>z.channel==='matched');
      const matchedScales=[...new Set(matchedItems.map(z=>z.scale))];
      const maxScore=Math.max(...c.items.map(z=>Number(z.score)||0));
      const matchedScore=matchedItems.length?Math.max(...matchedItems.map(z=>Number(z.score)||0)):0;
      const hasRaw=channels.includes('raw')||channels.includes('snr');
      const hasResidual=channels.includes('detrend');
      const hasSlope=channels.includes('diff')||channels.includes('dlog')||channels.includes('curvature');
      const physicalEvidenceCount=channels.filter(k=>!['resistance','dvdi'].includes(k)).length;
      const evidenceCount=c.items.length;
      const persistentMatched=matchedScales.length>=2;

      // Acceptance now prioritizes stable matched-filter persistence and
      // agreement with an independent raw/residual/slope channel. R and dV/dI
      // remain corroborating evidence and cannot create a peak on their own.
      let accept=false;
      if(mode==='strict'){
        accept=
          (persistentMatched&&(hasRaw||hasResidual||hasSlope)&&matchedScore>=4.4) ||
          (hasRaw&&hasResidual&&hasSlope&&maxScore>=5.0);
      }else if(mode==='sensitive'){
        accept=
          (matchedItems.length>=1&&matchedScore>=3.0&&(hasRaw||hasResidual||hasSlope)) ||
          (persistentMatched&&matchedScore>=4.2&&(hasResidual||hasSlope)) ||
          (hasRaw&&hasResidual&&maxScore>=3.2) ||
          (hasResidual&&hasSlope&&maxScore>=3.6);
      }else{
        accept=
          (persistentMatched&&(hasRaw||hasResidual||hasSlope)&&matchedScore>=3.45) ||
          (matchedItems.length>=1&&matchedScore>=4.15&&(hasRaw||hasResidual||hasSlope)) ||
          (hasRaw&&hasResidual&&maxScore>=3.8);
      }
      if(!accept)continue;

      const projected=projectCandidateToRaw(sweep,c.centerIndex,c.items);
      const j=clamp(projected.index,0,sweep.points.length-1);
      const edgeGuard=Math.max(3,Math.round(0.05/Math.max(Math.abs(sweep.step||0.01),1e-12)));
      if(j<edgeGuard||j>sweep.points.length-1-edgeGuard)continue;
      const p=sweep.points[j];

      // A local-search rectangle constrains the FINAL raw-I point, not merely
      // a derivative/matched-filter candidate.
      if(!pointInsideDetectionRange(p,range))continue;

      const width=estimateWidth(sweep.points,j);
      const primary=c.items.slice().sort((x,y)=>(Number(y.score)||0)-(Number(x.score)||0))[0];

      let confidence=
        0.12*Math.min(4,physicalEvidenceCount) +
        0.10*Math.min(4,matchedScales.length) +
        0.30*Math.min(1,maxScore/7) +
        0.18*Math.min(1,matchedScore/6) +
        (hasRaw?0.10:0) +
        (hasResidual?0.08:0);
      if(!matchedItems.length)confidence-=0.08;
      confidence=clamp(confidence,0,1);

      candidates.push({
        id:`${sweep.id}::auto::${Date.now()}::${candidates.length}::${Math.random().toString(36).slice(2,7)}`,
        sweepId:sweep.id,datasetPath:sweep.datasetPath,vg:sweep.vg,direction:sweep.direction,
        index:j,v:p.v,i:p.i,accepted:true,manual:false,locked:false,
        algorithms:channels,
        primaryAlgorithm:primary.algorithm,
        score:maxScore,
        confidence,
        supportCount:evidenceCount,
        supportChannels:channels,
        supportScales:scales,
        matchedScaleCount:matchedScales.length,
        matchedScore,
        candidateCenterIndex:c.centerIndex,
        candidateCenterV:sweep.points[clamp(c.centerIndex,0,sweep.points.length-1)]?.v,
        projectionMethod:projected.method,
        prominence:localProminence(sweep.points.map(q=>Math.abs(q.i)),j,14),
        snr:primary.snr??NaN,
        diffDepth:primary.diffDepth??NaN,
        widthLeft:width.left,widthRight:width.right,fwhm:width.fwhm,
        peakOrder:null,peakLabel:'',customColor:null,
        orderAnchor:false
      });
    }

    // Non-maximum suppression after RAW-I projection.
    candidates.sort((x,y)=>y.confidence-x.confidence || y.score-x.score);
    const kept=[];
    const minSep=Math.max(2*Math.abs(sweep.step||0.01),0.032);
    for(const c of candidates){
      const old=kept.find(k=>Math.abs(k.v-c.v)<minSep);
      if(!old){kept.push(c);continue;}
      // Prefer the candidate supported by more matched-filter scales.
      const cRank=(c.matchedScaleCount||0)*2+(c.confidence||0);
      const oRank=(old.matchedScaleCount||0)*2+(old.confidence||0);
      if(cRank>oRank){
        kept.splice(kept.indexOf(old),1,c);
      }
    }
    return kept.sort((x,y)=>x.v-y.v);
  }

  function finiteNumber(value){
    const n=Number(value);
    return Number.isFinite(n)?n:NaN;
  }

  function peakAnalysisWindow(peak,sweep){
    const pts=sweep?.points||[];
    if(!pts.length)return {left:NaN,right:NaN,source:'none'};
    const xs=pts.map(p=>p.v);
    const dataLo=Math.min(...xs),dataHi=Math.max(...xs);
    const step=Math.max(Math.abs(sweep?.step||median(xs.slice(1).map((v,i)=>v-xs[i]))||0.01),1e-12);
    const center=clamp(finiteNumber(peak?.v),dataLo,dataHi);

    let left=finiteNumber(peak?.analysisLeft),right=finiteNumber(peak?.analysisRight);
    if(Number.isFinite(left)&&Number.isFinite(right)){
      const savedLeft=Math.min(left,right),savedRight=Math.max(left,right);
      left=clamp(savedLeft,dataLo,dataHi);
      right=clamp(savedRight,dataLo,dataHi);
      if(left<center&&right>center)return {left,right,source:'saved'};
    }

    // Legacy projects stored the draggable FWHM endpoints as widthLeft/widthRight.
    // They are preserved as a seed only; the new analysis window is expanded so
    // baseline fitting uses shoulder/background data outside the half-height region.
    const legacyLeft=finiteNumber(peak?.widthLeft),legacyRight=finiteNumber(peak?.widthRight);
    let seedLeft=Number.isFinite(legacyLeft)?Math.min(legacyLeft,center):center-3*step;
    let seedRight=Number.isFinite(legacyRight)?Math.max(legacyRight,center):center+3*step;
    let leftHalf=Math.max(center-seedLeft,3*step);
    let rightHalf=Math.max(seedRight-center,3*step);
    const seedSpan=Math.max(seedRight-seedLeft,6*step);
    leftHalf=Math.max(leftHalf*3.5,seedSpan*1.6,10*step);
    rightHalf=Math.max(rightHalf*3.5,seedSpan*1.6,10*step);
    left=clamp(center-leftHalf,dataLo,dataHi);
    right=clamp(center+rightHalf,dataLo,dataHi);
    return {left,right,source:'legacy-auto'};
  }

  function leastSquaresLine(samples){
    if(!samples.length)return null;
    const mx=samples.reduce((s,p)=>s+p.x,0)/samples.length;
    const my=samples.reduce((s,p)=>s+p.y,0)/samples.length;
    let sxx=0,sxy=0;
    for(const p of samples){sxx+=(p.x-mx)*(p.x-mx);sxy+=(p.x-mx)*(p.y-my);}
    const slope=sxx>1e-30?sxy/sxx:0;
    return {slope,intercept:my-slope*mx};
  }

  function robustLine(samples){
    if(samples.length<2)return null;
    let keep=samples.slice();
    let model=leastSquaresLine(keep);
    for(let pass=0;pass<4&&model&&keep.length>=4;pass++){
      const residuals=keep.map(p=>p.y-(model.slope*p.x+model.intercept));
      const center=median(residuals);
      const scale=Math.max(mad(residuals)||0,1e-30);
      if(!(scale>1e-30))break;
      const next=keep.filter((p,idx)=>{
        const r=residuals[idx]-center;
        // Resonances are positive excursions in |I|, so reject upward
        // contamination more aggressively than downward noise.
        return r<=2.4*scale&&r>=-3.5*scale;
      });
      if(next.length<Math.max(4,Math.ceil(samples.length*0.45))||next.length===keep.length)break;
      keep=next;model=leastSquaresLine(keep);
    }
    if(!model)return null;
    const residuals=keep.map(p=>p.y-(model.slope*p.x+model.intercept));
    return {...model,error:mad(residuals)||0,n:keep.length};
  }

  function baselineForWindow(pts,lo,j,hi){
    const leftCount=Math.max(0,j-lo),rightCount=Math.max(0,hi-j);
    const edgeLeft=Math.max(2,Math.ceil(leftCount*0.34));
    const edgeRight=Math.max(2,Math.ceil(rightCount*0.34));
    const samples=[];
    for(let k=lo;k<Math.min(j,lo+edgeLeft);k++)samples.push({x:pts[k].v,y:Math.abs(pts[k].i)});
    for(let k=Math.max(j+1,hi-edgeRight+1);k<=hi;k++)samples.push({x:pts[k].v,y:Math.abs(pts[k].i)});

    if(samples.length<3){
      const y0=0.5*(Math.abs(pts[lo]?.i||0)+Math.abs(pts[hi]?.i||0));
      return {mode:'constant',slope:0,intercept:y0,error:0,n:samples.length};
    }

    const constant=median(samples.map(p=>p.y));
    const constError=mad(samples.map(p=>p.y-constant))||0;
    const line=robustLine(samples);
    if(!line)return {mode:'constant',slope:0,intercept:constant,error:constError,n:samples.length};

    const span=Math.abs(pts[hi].v-pts[lo].v);
    const excursion=Math.abs(line.slope)*span;
    const noise=Math.max(line.error,constError*0.15,Math.abs(constant)*1e-9,1e-30);
    const materiallySloped=excursion>2.5*noise;
    const fitImproves=constError<=1e-30?excursion>noise:line.error<constError*0.98;
    if(materiallySloped&&fitImproves)return {mode:'linear',...line};
    return {mode:'constant',slope:0,intercept:constant,error:constError,n:samples.length};
  }

  function interpolateCrossing(x1,r1,x2,r2,target){
    if(![x1,r1,x2,r2,target].every(Number.isFinite))return NaN;
    const d=r2-r1;
    if(Math.abs(d)<1e-30)return 0.5*(x1+x2);
    const t=clamp((target-r1)/d,0,1);
    return x1+t*(x2-x1);
  }

  function integratePositiveResidual(pts,baselineAt,left,right){
    if(!Number.isFinite(left)||!Number.isFinite(right)||right<=left)return NaN;
    const samples=[];
    function residualAtPoint(p){return Math.max(0,Math.abs(p.i)-baselineAt(p.v));}
    const li=nearestIndex(pts.map(p=>p.v),left),ri=nearestIndex(pts.map(p=>p.v),right);
    const lo=Math.min(li,ri),hi=Math.max(li,ri);
    const interpResidual=x=>{
      let k=Math.max(0,Math.min(pts.length-2,nearestIndex(pts.map(p=>p.v),x)));
      if(pts[k].v>x&&k>0)k--;
      if(pts[k+1]?.v<x&&k<pts.length-2)k++;
      const a=pts[k],b=pts[k+1]||a;
      if(Math.abs(b.v-a.v)<1e-30)return residualAtPoint(a);
      const t=clamp((x-a.v)/(b.v-a.v),0,1);
      const yi=Math.abs(a.i)+t*(Math.abs(b.i)-Math.abs(a.i));
      return Math.max(0,yi-baselineAt(x));
    };
    samples.push({x:left,y:interpResidual(left)});
    for(let k=lo;k<=hi;k++)if(pts[k].v>left&&pts[k].v<right)samples.push({x:pts[k].v,y:residualAtPoint(pts[k])});
    samples.push({x:right,y:interpResidual(right)});
    samples.sort((a,b)=>a.x-b.x);
    let area=0;
    for(let k=0;k<samples.length-1;k++)area+=0.5*(samples[k].y+samples[k+1].y)*(samples[k+1].x-samples[k].x);
    return area;
  }

  function peakMetrics(peak,sweep){
    const pts=sweep?.points||[];
    if(!pts.length)return {...peak,amplitude:NaN,area:NaN,baseline:NaN,fwhm:NaN,fwhmLeft:NaN,fwhmRight:NaN,fwhmValid:false};
    const xs=pts.map(p=>p.v);
    const j=nearestIndex(xs,peak.v);
    const p=pts[j];
    const window=peakAnalysisWindow(peak,sweep);
    const leftIdx=nearestIndex(xs,window.left),rightIdx=nearestIndex(xs,window.right);
    const lo=Math.min(leftIdx,rightIdx),hi=Math.max(leftIdx,rightIdx);
    if(!(lo<j&&j<hi))return {...peak,analysisLeft:window.left,analysisRight:window.right,amplitude:NaN,area:NaN,baseline:NaN,fwhm:NaN,fwhmLeft:NaN,fwhmRight:NaN,fwhmValid:false,baselineMode:'invalid'};

    const fit=baselineForWindow(pts,lo,j,hi);
    const baselineAt=x=>Math.max(0,fit.slope*x+fit.intercept);
    const baseline=baselineAt(p.v);
    const amplitude=Math.max(0,Math.abs(p.i)-baseline);
    const halfResidual=amplitude/2;
    const residual=pts.map(q=>Math.abs(q.i)-baselineAt(q.v));

    let fwhmLeft=NaN,fwhmRight=NaN;
    if(amplitude>0){
      for(let k=j-1;k>=lo;k--){
        const a=residual[k]-halfResidual,b=residual[k+1]-halfResidual;
        if(a===0||b===0||a*b<0){
          fwhmLeft=interpolateCrossing(pts[k].v,residual[k],pts[k+1].v,residual[k+1],halfResidual);
          break;
        }
      }
      for(let k=j;k<hi;k++){
        const a=residual[k]-halfResidual,b=residual[k+1]-halfResidual;
        if(a===0||b===0||a*b<0){
          fwhmRight=interpolateCrossing(pts[k].v,residual[k],pts[k+1].v,residual[k+1],halfResidual);
          break;
        }
      }
    }
    const fwhmValid=Number.isFinite(fwhmLeft)&&Number.isFinite(fwhmRight)&&fwhmRight>fwhmLeft;
    const fwhm=fwhmValid?fwhmRight-fwhmLeft:NaN;
    const area=fwhmValid?integratePositiveResidual(pts,baselineAt,fwhmLeft,fwhmRight):NaN;
    return {
      ...peak,
      analysisLeft:window.left,analysisRight:window.right,analysisWindowSource:window.source,
      amplitude,area,baseline,
      baselineMode:fit.mode,baselineSlope:fit.slope,baselineIntercept:fit.intercept,baselineError:fit.error,
      halfResidual,halfHeightAtPeak:baseline+halfResidual,
      fwhmLeft,fwhmRight,fwhm,fwhmValid
    };
  }
  return {buildSweeps,transformSweep,detectPeaks,peakAnalysisWindow,peakMetrics};
});
