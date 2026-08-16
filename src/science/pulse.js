(function(root,factory){
  const core=(root.GRSScience=root.GRSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median,mad,inspectDataText,defaultImportOptions}=core;
  function pulseHeaderIndex(headers,kind){
    const hs=(headers||[]).map(h=>String(h||'').toLowerCase());
    if(kind==='current'){
      let j=hs.findIndex(h=>/\bcurrent\b|(^|[^a-z])id(?:\W|$)|(^|[^a-z])ids?(?:\W|$)/i.test(h));
      if(j<0)j=hs.findIndex(h=>/(^|[^a-z])i(?:\W|$)/i.test(h));
      return j;
    }
    if(kind==='voltage'){
      let j=hs.findIndex(h=>/\bvd\b|\bvds\b|voltage|bias/i.test(h));
      if(j<0)j=hs.findIndex(h=>/(^|[^a-z])v(?:\W|$)/i.test(h)&&!/vg|gate/i.test(h));
      return j;
    }
    if(kind==='time'){
      return hs.findIndex(h=>/time|秒|时间/i.test(h));
    }
    return -1;
  }

  function medianAbsDeviation(values){
    const a=(values||[]).filter(Number.isFinite);
    if(!a.length)return NaN;
    const m=median(a);
    return median(a.map(v=>Math.abs(v-m)));
  }

  function groupNearbyIndices(indices,maxGap=3){
    const groups=[];
    for(const idx of indices){
      const g=groups.at(-1);
      if(!g||idx-g.at(-1)>maxGap)groups.push([idx]);
      else g.push(idx);
    }
    return groups;
  }

  function estimatePulseBlockSamples(voltage){
    if(!voltage||voltage.length<20)return NaN;
    const finite=voltage.filter(Number.isFinite);
    if(finite.length<20)return NaN;
    const vr=Math.max(...finite)-Math.min(...finite);
    const diffs=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d))diffs.push(d);
    }
    const dm=median(diffs)||0;
    const dn=medianAbsDeviation(diffs)||0;
    const threshold=Math.max(vr*.035,dm+8*dn,1e-9);
    const idx=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d)&&d>=threshold)idx.push(k);
    }
    const groups=groupNearbyIndices(idx,3);
    const changes=groups.map(g=>g[0]);
    const gaps=[];
    for(let k=1;k<changes.length;k++){
      const d=changes[k]-changes[k-1];
      if(d>=4&&d<=Math.max(400,voltage.length/3))gaps.push(d);
    }
    if(!gaps.length)return NaN;
    const rounded=Math.max(2,Math.round(median(gaps)));
    return rounded;
  }

  function estimateBlockOffset(voltage,blockSamples){
    const n=Math.max(2,Math.round(blockSamples));
    const finite=voltage.filter(Number.isFinite);
    const vr=finite.length?Math.max(...finite)-Math.min(...finite):0;
    const diffs=[];
    for(let k=1;k<voltage.length;k++){
      const d=Math.abs(voltage[k]-voltage[k-1]);
      if(Number.isFinite(d))diffs.push(d);
    }
    const dm=median(diffs)||0,dn=medianAbsDeviation(diffs)||0;
    const threshold=Math.max(vr*.035,dm+8*dn,1e-9);
    const residues=[];
    for(let k=1;k<voltage.length;k++){
      if(Math.abs(voltage[k]-voltage[k-1])>=threshold)residues.push(k%n);
    }
    if(!residues.length)return 0;
    const counts=new Array(n).fill(0);
    for(const r of residues)counts[r]++;
    let best=0;
    for(let r=1;r<n;r++)if(counts[r]>counts[best])best=r;
    return best;
  }

  function stableBlockAverage(values,start,end,startFraction=.25,endFraction=.75){
    const n=Math.max(0,end-start);
    if(!n)return NaN;
    let a=start+Math.floor(n*Math.max(0,Math.min(.95,startFraction)));
    let b=start+Math.ceil(n*Math.max(.05,Math.min(1,endFraction)));
    if(b<=a){a=start;b=end;}
    const arr=values.slice(a,b).filter(Number.isFinite);
    return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:NaN;
  }

  function analyzePulseReadData(file,options={}){
    const inspectOptions={
      ...defaultImportOptions(),
      ...(options.importOptions||{}),
      skipRows:Number(options.skipRows)||0,
      delimiter:options.delimiter||'auto',
      headerMode:options.headerMode||'auto'
    };
    const ins=inspectDataText(file,inspectOptions);
    if(ins.rowCount<8)throw new Error('有效数据行过少，无法识别脉冲。');

    const headers=ins.headers;
    let timeCol=Number.isFinite(Number(options.timeCol))?Number(options.timeCol):pulseHeaderIndex(headers,'time');
    let currentCol=Number.isFinite(Number(options.currentCol))?Number(options.currentCol):pulseHeaderIndex(headers,'current');
    let voltageCol=Number.isFinite(Number(options.voltageCol))?Number(options.voltageCol):pulseHeaderIndex(headers,'voltage');

    if(timeCol<0)timeCol=0;
    if(currentCol<0)currentCol=Math.min(1,headers.length-1);
    if(voltageCol<0)voltageCol=Math.min(headers.length-1,Math.max(2,currentCol+1));

    const rows=ins.numericRows.filter(r=>
      Number.isFinite(r.values[currentCol])&&Number.isFinite(r.values[voltageCol])
    );
    const time=rows.map((r,k)=>Number.isFinite(r.values[timeCol])?r.values[timeCol]:k);
    const current=rows.map(r=>r.values[currentCol]);
    const voltage=rows.map(r=>r.values[voltageCol]);

    let blockSamples=Math.round(Number(options.blockSamples)||0);
    if(blockSamples<=1)blockSamples=estimatePulseBlockSamples(voltage);
    if(!Number.isFinite(blockSamples)||blockSamples<2)throw new Error('无法自动识别单个平台点数，请在高级设置中手动指定。');

    let offset=Number.isFinite(Number(options.offsetSamples))
      ? Math.max(0,Math.round(Number(options.offsetSamples)))
      : estimateBlockOffset(voltage,blockSamples);
    offset=offset%blockSamples;

    const startFraction=Number.isFinite(Number(options.windowStartFraction))?Number(options.windowStartFraction):.25;
    const endFraction=Number.isFinite(Number(options.windowEndFraction))?Number(options.windowEndFraction):.75;

    const blocks=[];
    for(let start=offset,bi=0;start+blockSamples<=voltage.length;start+=blockSamples,bi++){
      const end=start+blockSamples;
      const vAvg=stableBlockAverage(voltage,start,end,startFraction,endFraction);
      const iAvg=stableBlockAverage(current,start,end,startFraction,endFraction);
      const tAvg=stableBlockAverage(time,start,end,startFraction,endFraction);
      if(!Number.isFinite(vAvg)||!Number.isFinite(iAvg))continue;
      blocks.push({
        blockIndex:bi,startIndex:start,endIndex:end-1,
        voltage:vAvg,current:iAvg,time:tAvg
      });
    }
    if(blocks.length<4)throw new Error('识别到的平台数量过少。');

    const parityStats=[0,1].map(parity=>{
      const vals=blocks.filter(b=>b.blockIndex%2===parity).map(b=>b.voltage);
      return {
        parity,
        count:vals.length,
        median:median(vals),
        mad:medianAbsDeviation(vals)
      };
    });
    parityStats.sort((a,b)=>{
      const am=Number.isFinite(a.mad)?a.mad:Infinity;
      const bm=Number.isFinite(b.mad)?b.mad:Infinity;
      return am-bm;
    });
    const readParity=Number.isFinite(Number(options.readParity))
      ? Math.abs(Math.round(Number(options.readParity)))%2
      : parityStats[0].parity;
    const readVals=blocks.filter(b=>b.blockIndex%2===readParity).map(b=>b.voltage);
    const readVoltage=median(readVals);

    const pairMode=['after','before'].includes(options.readPairMode)?options.readPairMode:'after';
    const points=[];
    const byIndex=new Map(blocks.map(b=>[b.blockIndex,b]));
    for(const pulseBlock of blocks.filter(b=>b.blockIndex%2!==readParity)){
      let readBlock=null;
      if(pairMode==='before')readBlock=byIndex.get(pulseBlock.blockIndex-1)||byIndex.get(pulseBlock.blockIndex+1);
      else readBlock=byIndex.get(pulseBlock.blockIndex+1)||byIndex.get(pulseBlock.blockIndex-1);
      if(!readBlock||readBlock.blockIndex%2!==readParity)continue;
      points.push({
        index:points.length,
        pulseVoltage:pulseBlock.voltage,
        pulseCurrent:pulseBlock.current,
        readVoltage:readBlock.voltage,
        readCurrent:readBlock.current,
        pulseTime:pulseBlock.time,
        readTime:readBlock.time,
        pulseBlockIndex:pulseBlock.blockIndex,
        readBlockIndex:readBlock.blockIndex
      });
    }

    return {
      fileName:file.name||'pulse-data',
      inspection:ins,
      columns:{timeCol,currentCol,voltageCol},
      blockSamples,
      offsetSamples:offset,
      readParity,
      readVoltage,
      windowStartFraction:startFraction,
      windowEndFraction:endFraction,
      pairMode,
      blocks,
      points,
      raw:{time,current,voltage}
    };
  }

  return {analyzePulseReadData};
});
