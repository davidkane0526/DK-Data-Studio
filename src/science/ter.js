(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {nearestIndex}=core;
  function detectTerVoltageParameters(datasets){
    let globalMin=Infinity, globalMax=-Infinity, globalStep=Infinity;
    for(const ds of datasets||[]){
      const pts=ds.points||[];
      for(const p of pts){
        if(Number.isFinite(p.v)){
          globalMin=Math.min(globalMin,p.v);
          globalMax=Math.max(globalMax,p.v);
        }
      }
      for(let k=1;k<pts.length;k++){
        const d=Math.abs(pts[k].v-pts[k-1].v);
        if(Number.isFinite(d)&&d>1e-12)globalStep=Math.min(globalStep,d);
      }
    }
    if(!Number.isFinite(globalStep)||!Number.isFinite(globalMin)||!Number.isFinite(globalMax)||globalMax<=globalMin){
      throw new Error('无法从当前项目检测有效的 Vds 范围或步长。');
    }
    return {vmin:globalMin,vmax:globalMax,vstep:globalStep};
  }

  function sweepDirectionsRaw(points,tolerance){
    const dirs=new Int8Array(points.length);
    for(let index=0;index<points.length;index++){
      if(index>0 && Math.abs(points[index].v-points[index-1].v)>tolerance){
        dirs[index]=points[index].v>points[index-1].v?1:-1;
      }else if(index+1<points.length && Math.abs(points[index+1].v-points[index].v)>tolerance){
        dirs[index]=points[index+1].v>points[index].v?1:-1;
      }
    }
    return dirs;
  }

  // Python's built-in round() uses bankers rounding for exact .5 ties.
  // ter_gui.py uses round(abs(vmin)/step) and round(vmax/step) to decide
  // the number of target samples, so reproduce that behavior explicitly.
  function pythonRoundInt(value){
    const n=Number(value);
    if(!Number.isFinite(n))return NaN;
    const lo=Math.floor(n),frac=n-lo;
    // Do not use an epsilon here: Python only applies ties-to-even when the
    // actual binary floating value is exactly halfway. 9.499999999999998,
    // for example, must round to 9 rather than being snapped to 9.5.
    if(frac===.5)return (Math.abs(lo)%2===0)?lo:lo+1;
    return Math.round(n);
  }

  function terVoltageGrid(vmin,vmax,step){
    if(!(vmin<0&&vmax>0))throw new Error('TER_max 要求 Vds 范围跨过 0 V。');
    if(!(step>0))throw new Error('Vds 步长必须大于 0。');
    const nNegative=pythonRoundInt(Math.abs(vmin)/step);
    const nPositive=pythonRoundInt(vmax/step);
    if(!Number.isFinite(nNegative)||!Number.isFinite(nPositive)||nNegative<0||nPositive<0){
      throw new Error('无法生成有效的 TER Vds 网格。');
    }
    const negative=[];
    for(let index=0;index<nNegative;index++)negative.push(Number((vmin+index*step).toFixed(12)));
    const positive=[];
    for(let index=0;index<nPositive;index++)positive.push(Number(((index+1)*step).toFixed(12)));
    return negative.concat(positive);
  }

  function calculateTerHighLow(rUp,rDown){
    if(!Number.isFinite(rUp)||!Number.isFinite(rDown))return NaN;
    const low=Math.min(rUp,rDown), high=Math.max(rUp,rDown);
    return low!==0?(high-low)/low*100:NaN;
  }

  function processDatasetTer(dataset,targets,tolerance,currentFloor){
    const pts=dataset.points||[];
    const dirs=sweepDirectionsRaw(pts,tolerance);
    const records=[];
    for(const target of targets){
      let upIndex=-1,downIndex=-1;
      for(let k=0;k<pts.length;k++){
        if(Math.abs(pts[k].v-target)<=tolerance){
          if(upIndex<0&&dirs[k]===1)upIndex=k;
          if(downIndex<0&&dirs[k]===-1)downIndex=k;
          if(upIndex>=0&&downIndex>=0)break;
        }
      }
      const iUp=upIndex>=0?pts[upIndex].i:NaN;
      const iDown=downIndex>=0?pts[downIndex].i:NaN;
      const rUp=Number.isFinite(iUp)&&Math.abs(iUp)>currentFloor?Math.abs(target/iUp):NaN;
      const rDown=Number.isFinite(iDown)&&Math.abs(iDown)>currentFloor?Math.abs(target/iDown):NaN;
      const ter=Number.isFinite(rUp)&&Number.isFinite(rDown)?calculateTerHighLow(rUp,rDown):NaN;
      records.push({
        vg:dataset.vg,vds:target,
        iUp,iDown,rUp,rDown,ter,
        sourceFile:dataset.name
      });
    }
    return records;
  }

  function computeTerMatrix(datasets,options={}){
    if(!datasets?.length)throw new Error('当前项目没有可用于 TER_max 的数据。');
    const detected=detectTerVoltageParameters(datasets);
    const optionNumber=(key,predicate=Number.isFinite)=>{
      const raw=options?.[key];
      if(raw===null||raw===undefined||raw==='')return null;
      const value=Number(raw);
      return predicate(value)?value:null;
    };
    const vmin=optionNumber('vmin')??detected.vmin;
    const vmax=optionNumber('vmax')??detected.vmax;
    const vstep=optionNumber('vstep',v=>Number.isFinite(v)&&v>0)??detected.vstep;
    // A blank/null tolerance means the same automatic vstep/20 used by
    // ter_gui.py; Number(null) must not silently become 0 here.
    const tolerance=optionNumber('tolerance',v=>Number.isFinite(v)&&v>=0)??vstep/20;
    const currentFloor=optionNumber('currentFloor',v=>Number.isFinite(v)&&v>0)??1e-15;
    const targets=terVoltageGrid(vmin,vmax,vstep);

    const records=[];
    for(const ds of datasets){
      records.push(...processDatasetTer(ds,targets,tolerance,currentFloor));
    }
    records.sort((x,y)=>(x.vg-y.vg)||(x.vds-y.vds));

    const vgs=[...new Set(records.map(r=>r.vg).filter(Number.isFinite))].sort((x,y)=>x-y);
    const matrix=vgs.map(vg=>targets.map(vds=>{
      const r=records.find(q=>q.vg===vg&&Math.abs(q.vds-vds)<=Math.max(1e-12,tolerance*0.01));
      return r?.ter??NaN;
    }));

    // TER_Max-Vg: for each Vg, maximize along the Vds axis.
    const terMaxByVg=[];
    for(const vg of vgs){
      const rows=records.filter(r=>r.vg===vg&&Number.isFinite(r.ter));
      if(!rows.length)continue;
      let best=rows[0];
      for(const r of rows){
        if(r.ter>best.ter)best=r;
      }
      terMaxByVg.push({
        vg,
        terMax:best.ter,
        vdsAtMax:best.vds,
        iUp:best.iUp,
        iDown:best.iDown,
        rUp:best.rUp,
        rDown:best.rDown,
        sourceFile:best.sourceFile
      });
    }

    // TER_Max-Vd: for each Vds, maximize along the Vg axis.
    const terMaxByVd=[];
    for(const vds of targets){
      const rows=records.filter(r=>Math.abs(r.vds-vds)<=Math.max(1e-12,tolerance*0.01)&&Number.isFinite(r.ter));
      if(!rows.length)continue;
      let best=rows[0];
      for(const r of rows){
        if(r.ter>best.ter)best=r;
      }
      terMaxByVd.push({
        vds,
        terMax:best.ter,
        vgAtMax:best.vg,
        iUp:best.iUp,
        iDown:best.iDown,
        rUp:best.rUp,
        rDown:best.rDown,
        sourceFile:best.sourceFile
      });
    }

    const missing=matrix.reduce((s,row)=>s+row.filter(v=>!Number.isFinite(v)).length,0);
    return {
      detected,
      used:{vmin,vmax,vstep,tolerance,currentFloor},
      targets,vgs,records,matrix,
      // Backward-compatible alias used by older project code.
      terMax:terMaxByVg,
      terMaxByVg,
      terMaxByVd,
      missing
    };
  }

  function interpolateSweepAtV(sweep,targetV){
    const pts=sweep?.points||[];
    if(!pts.length||!Number.isFinite(targetV))return null;
    const xs=pts.map(p=>p.v);
    const j=nearestIndex(xs,targetV);
    const p=pts[j];
    if(!p)return null;

    const exactTol=Math.max(1e-12,Math.abs(sweep.step||0)*0.05);
    if(Math.abs(p.v-targetV)<=exactTol){
      return {v:targetV,i:p.i,index:j,method:'sample'};
    }

    let a=j,b=j;
    if(p.v<targetV){a=j;b=Math.min(pts.length-1,j+1);}
    else {a=Math.max(0,j-1);b=j;}
    const p0=pts[a],p1=pts[b];
    if(!p0||!p1||p0.v===p1.v)return {v:targetV,i:p.i,index:j,method:'nearest'};
    if(targetV<Math.min(p0.v,p1.v)||targetV>Math.max(p0.v,p1.v))return {v:targetV,i:p.i,index:j,method:'nearest'};

    const f=(targetV-p0.v)/(p1.v-p0.v);
    return {v:targetV,i:p0.i+f*(p1.i-p0.i),index:j,method:'linear'};
  }

  function computeTerAtSameV(upSweep,downSweep,v,currentFloor=1e-15){
    if(!upSweep||!downSweep||!Number.isFinite(v)||Math.abs(v)<=1e-15)return null;
    const up=interpolateSweepAtV(upSweep,v);
    const down=interpolateSweepAtV(downSweep,v);
    if(!up||!down)return null;
    if(!Number.isFinite(up.i)||!Number.isFinite(down.i))return null;
    if(Math.abs(up.i)<=currentFloor||Math.abs(down.i)<=currentFloor)return null;

    const rUp=Math.abs(v/up.i),rDown=Math.abs(v/down.i);
    const ter=calculateTerHighLow(rUp,rDown);
    if(!Number.isFinite(ter))return null;
    return {
      v,ter,
      iUp:up.i,iDown:down.i,
      rUp,rDown,
      upMethod:up.method,downMethod:down.method
    };
  }

  function computeResonantTerForLabel(peaks,sweeps,label,visibleSweepIds=null,options={}){
    const vis=visibleSweepIds?new Set(visibleSweepIds):null;
    const currentFloor=Math.max(0,Number(options.currentFloor)||1e-15);

    const accepted=(peaks||[]).filter(p=>
      p.accepted &&
      p.peakLabel===label &&
      (!vis||vis.has(p.sweepId))
    );

    const sweepGroups=new Map();
    for(const sw of sweeps||[]){
      if(vis&&!vis.has(sw.id))continue;
      const key=Number.isFinite(sw.vg)?String(sw.vg):`nan::${sw.datasetPath}`;
      if(!sweepGroups.has(key))sweepGroups.set(key,{vg:sw.vg,up:null,down:null,sweeps:[]});
      const g=sweepGroups.get(key);
      g.sweeps.push(sw);
      if(sw.direction>0)g.up=sw;
      if(sw.direction<0)g.down=sw;
    }

    const byVg=new Map();
    for(const p of accepted){
      const key=Number.isFinite(p.vg)?String(p.vg):`nan::${p.datasetPath}`;
      if(!byVg.has(key))byVg.set(key,[]);
      byVg.get(key).push(p);
    }

    const out=[];
    for(const [key,candidates] of byVg){
      const g=sweepGroups.get(key);
      if(!g?.up||!g?.down)continue;

      // Union of resonance coordinates from BOTH scan directions.
      // A resonance is not omitted merely because one direction has no peak.
      const evaluated=[];
      for(const p of candidates){
        const same=computeTerAtSameV(g.up,g.down,p.v,currentFloor);
        if(!same)continue;
        evaluated.push({
          ...same,
          anchorPeakId:p.id,
          anchorDirection:p.direction,
          anchorLabel:p.peakLabel,
          anchorV:p.v
        });
      }
      if(!evaluated.length)continue;

      // Avoid double counting nearly identical forward/reverse Vpk values.
      evaluated.sort((x,y)=>x.v-y.v);
      const uniq=[];
      const mergeTol=Math.max(
        Math.abs(g.up.step||0),
        Math.abs(g.down.step||0),
        1e-6
      )*1.5;
      for(const e of evaluated){
        const near=uniq.find(q=>Math.abs(q.v-e.v)<=mergeTol);
        if(!near)uniq.push(e);
        else if(e.ter>near.ter)Object.assign(near,e);
      }

      const best=uniq.slice().sort((x,y)=>y.ter-x.ter)[0];
      out.push({
        vg:g.vg,
        label,
        ter:best.ter,
        vdAtTer:best.v,
        forwardI:best.iUp,
        reverseI:best.iDown,
        forwardV:best.v,
        reverseV:best.v,
        rUp:best.rUp,
        rDown:best.rDown,
        anchorPeakId:best.anchorPeakId,
        anchorDirection:best.anchorDirection,
        anchorV:best.anchorV,
        candidateCount:uniq.length,
        forwardPeakId:candidates.find(p=>p.direction>0)?.id||null,
        reversePeakId:candidates.find(p=>p.direction<0)?.id||null,
        candidates:uniq
      });
    }
    return out.sort((x,y)=>{
      if(Number.isFinite(x.vg)&&Number.isFinite(y.vg))return x.vg-y.vg;
      return 0;
    });
  }

  function computeTerForLabel(peaks,sweeps,label,visibleSweepIds=null){
    return computeResonantTerForLabel(peaks,sweeps,label,visibleSweepIds);
  }
  return {detectTerVoltageParameters,sweepDirectionsRaw,terVoltageGrid,calculateTerHighLow,processDatasetTer,computeTerMatrix,interpolateSweepAtV,computeTerAtSameV,computeResonantTerForLabel,computeTerForLabel};
});
