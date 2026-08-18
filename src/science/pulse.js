(function(root,factory){
  const core=(root.DKDSScience=root.DKDSScience||{});
  const api=factory(core);
  Object.assign(core,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(core){
  const {median,inspectDataText,defaultImportOptions}=core;

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
    if(kind==='time')return hs.findIndex(h=>/time|秒|时间/i.test(h));
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
    return Math.max(2,Math.round(median(gaps)));
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

  function finiteOrNull(value){
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }

  function durationToSeconds(value,unit){
    const n=Number(value);
    if(!Number.isFinite(n))return null;
    const u=String(unit||'s').toLowerCase();
    if(u==='ms')return n/1e3;
    if(u==='us'||u==='µs'||u==='μs')return n/1e6;
    if(u==='ns')return n/1e9;
    return n;
  }

  function inferPulseProtocolFromName(name){
    const text=String(name||'').replace(/\.[^.]+$/,'').toLowerCase();
    const out={writeDuration:null,readDuration:null,readVoltage:null,pulseVoltage:null};
    const num='([-+]?\\d*\\.?\\d+(?:e[-+]?\\d+)?)';
    const unit='(ns|us|µs|μs|ms|s)';

    let m=text.match(new RegExp(`(?:^|[\\s_,-])(?:t|tw|write(?:[_\\s-]*(?:time|width))?|pulse(?:[_\\s-]*(?:time|width))?)\\s*=\\s*${num}\\s*${unit}(?=$|[\\s_,-])`,'i'));
    if(m)out.writeDuration=durationToSeconds(m[1],m[2]);

    m=text.match(new RegExp(`read\\s*=\\s*${num}\\s*v?\\s*(?:[,;_\\s-]+)\\s*${num}\\s*${unit}`,'i'));
    if(m){
      out.readVoltage=finiteOrNull(m[1]);
      out.readDuration=durationToSeconds(m[2],m[3]);
    }else{
      m=text.match(new RegExp(`read(?:[_\\s-]*(?:time|width))?\\s*=\\s*${num}\\s*${unit}`,'i'));
      if(m)out.readDuration=durationToSeconds(m[1],m[2]);
      m=text.match(new RegExp(`read(?:[_\\s-]*v(?:oltage)?)?\\s*=\\s*${num}\\s*v(?=$|[\\s_,-])`,'i'));
      if(m)out.readVoltage=finiteOrNull(m[1]);
    }

    m=text.match(new RegExp(`(?:pulse|write|set)(?:[_\\s-]*v(?:oltage)?)?\\s*=\\s*${num}\\s*v(?=$|[\\s_,-])`,'i'));
    if(m)out.pulseVoltage=finiteOrNull(m[1]);

    return out;
  }

  function hasOwn(obj,key){return Object.prototype.hasOwnProperty.call(obj,key);}

  function resolveColumn(headers,options,key,kind,{required=false,fallback=-1}={}){
    if(hasOwn(options,key)){
      const raw=options[key];
      if(raw===null||raw===undefined||raw===''||String(raw).toLowerCase()==='none'||Number(raw)<0){
        if(required)throw new Error(`${kind} 列不能为空。`);
        return -1;
      }
      const n=Math.round(Number(raw));
      if(Number.isFinite(n)&&n>=0&&n<headers.length)return n;
      if(required)throw new Error(`${kind} 列超出范围。`);
      return -1;
    }
    const guessed=pulseHeaderIndex(headers,kind);
    if(guessed>=0)return guessed;
    if(required&&fallback<0)throw new Error(`无法识别${kind}列，请手动选择。`);
    return fallback;
  }

  function inspectPulseFile(file,options){
    const inspectOptions={
      ...defaultImportOptions(),
      ...(options.importOptions||{}),
      skipRows:Number(options.skipRows)||0,
      delimiter:options.delimiter||'auto',
      headerMode:options.headerMode||'auto'
    };
    const ins=inspectDataText(file,inspectOptions);
    if(ins.rowCount<4)throw new Error('有效数据行过少，无法识别脉冲。');
    return ins;
  }

  function legacyAnalyzePulseReadData(file,options,ins){
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
    if(!Number.isFinite(blockSamples)||blockSamples<2)throw new Error('无法自动识别单个平台点数，请切换“按时间协议”并填写写入/读取宽度，或手动指定旧版平台点数。');

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
      blocks.push({blockIndex:bi,startIndex:start,endIndex:end-1,voltage:vAvg,current:iAvg,time:tAvg});
    }
    if(blocks.length<4)throw new Error('识别到的平台数量过少。');

    const parityStats=[0,1].map(parity=>{
      const vals=blocks.filter(b=>b.blockIndex%2===parity).map(b=>b.voltage);
      return {parity,count:vals.length,median:median(vals),mad:medianAbsDeviation(vals)};
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
      fileName:file.name||'pulse-data',inspection:ins,
      columns:{timeCol,currentCol,voltageCol},blockSamples,offsetSamples:offset,
      readParity,readVoltage,windowStartFraction:startFraction,windowEndFraction:endFraction,
      pairMode,blocks,points,raw:{time,current,voltage}
    };
  }

  function average(values){
    const a=(values||[]).filter(Number.isFinite);
    return a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN;
  }

  function buildSamples(ins,columns,options){
    const {timeCol,currentCol,voltageCol}=columns;
    const sampleInterval=finiteOrNull(options.sampleInterval);
    if(timeCol<0&&!(sampleInterval>0))throw new Error('未记录时间列时，请填写“采样间隔”。');
    const rows=[];
    let ordinal=0;
    for(const row of ins.numericRows){
      const current=row.values[currentCol];
      if(!Number.isFinite(current))continue;
      const time=timeCol>=0?row.values[timeCol]:ordinal*sampleInterval;
      ordinal++;
      if(!Number.isFinite(time))continue;
      const voltage=voltageCol>=0&&Number.isFinite(row.values[voltageCol])?row.values[voltageCol]:null;
      rows.push({time,current,voltage});
    }
    rows.sort((a,b)=>a.time-b.time);
    if(rows.length<4)throw new Error('有效电流/时间样本过少。');
    return rows;
  }

  function segmentAverage(samples,start,end,startFraction,endFraction){
    const duration=end-start;
    if(!(duration>0))return null;
    const a=start+duration*Math.max(0,Math.min(.95,startFraction));
    const b=start+duration*Math.max(.05,Math.min(1,endFraction));
    let selected=samples.filter(s=>s.time>=a&&s.time<=b);
    if(!selected.length)selected=samples.filter(s=>s.time>=start&&s.time<=end);
    if(!selected.length)return null;
    const currents=selected.map(s=>s.current).filter(Number.isFinite);
    if(!currents.length)return null;
    const volts=selected.map(s=>s.voltage).filter(Number.isFinite);
    const times=selected.map(s=>s.time).filter(Number.isFinite);
    return {current:average(currents),voltage:volts.length?average(volts):null,time:average(times),sampleCount:selected.length};
  }

  function pointSamples(ins,columns,options={}){
    const {timeCol,currentCol,voltageCol}=columns;
    const sampleInterval=finiteOrNull(options.sampleInterval);
    const out=[];
    let ordinal=0;
    for(const row of ins.numericRows){
      const current=row.values[currentCol];
      if(!Number.isFinite(current))continue;
      const rawTime=timeCol>=0?row.values[timeCol]:NaN;
      const time=Number.isFinite(rawTime)?rawTime:(sampleInterval>0?ordinal*sampleInterval:ordinal);
      const voltage=voltageCol>=0&&Number.isFinite(row.values[voltageCol])?row.values[voltageCol]:null;
      out.push({ordinal,time,current,voltage});
      ordinal++;
    }
    if(out.length<8)throw new Error('有效脉冲样本过少。');
    return out;
  }

  function robustTransitionIndices(values){
    const finite=(values||[]).filter(Number.isFinite);
    if(finite.length<12)return [];
    const range=Math.max(...finite)-Math.min(...finite);
    const diffs=[];
    for(let i=1;i<values.length;i++){
      const d=Math.abs(Number(values[i])-Number(values[i-1]));
      if(Number.isFinite(d))diffs.push(d);
    }
    if(!diffs.length)return [];
    const dm=median(diffs)||0;
    const dn=medianAbsDeviation(diffs)||0;
    const threshold=Math.max(range*.03,dm+7*dn,Math.abs(median(finite))*1e-8,1e-12);
    const raw=[];
    for(let i=1;i<values.length;i++){
      const d=Math.abs(Number(values[i])-Number(values[i-1]));
      if(Number.isFinite(d)&&d>=threshold)raw.push(i);
    }
    return groupNearbyIndices(raw,3).map(g=>Math.round(median(g)));
  }

  function estimateCycleFromTransitions(values){
    const changes=robustTransitionIndices(values);
    if(changes.length<4)return null;
    const spans=[];
    for(let i=0;i+2<changes.length;i++){
      const span=changes[i+2]-changes[i];
      if(span>=8)spans.push(span);
    }
    if(!spans.length)return null;
    const center=median(spans);
    const spread=medianAbsDeviation(spans);
    if(!Number.isFinite(center)||center<8)return null;
    if(Number.isFinite(spread)&&spread/center>.18)return null;
    return Math.max(2,Math.round(center));
  }

  function estimatePulseCycleSamples(ins,options={}){
    if(!ins?.numericRows?.length)return null;
    const headers=ins.headers||[];
    const currentCol=resolveColumn(headers,options,'currentCol','current',{required:false,fallback:pulseHeaderIndex(headers,'current')});
    const voltageCol=resolveColumn(headers,options,'voltageCol','voltage',{required:false,fallback:pulseHeaderIndex(headers,'voltage')});
    if(voltageCol>=0){
      const voltage=ins.numericRows.map(r=>r.values[voltageCol]).filter(Number.isFinite);
      const fromVoltage=estimateCycleFromTransitions(voltage);
      if(fromVoltage)return fromVoltage;
    }
    if(currentCol>=0){
      const current=ins.numericRows.map(r=>r.values[currentCol]).filter(Number.isFinite);
      const fromCurrent=estimateCycleFromTransitions(current);
      if(fromCurrent)return fromCurrent;
    }
    return null;
  }

  function rangeOption(options,startKey,endKey,cycleSamples){
    const start=finiteOrNull(options[startKey]);
    const end=finiteOrNull(options[endKey]);
    if(start===null&&end===null)return null;
    const a=Math.max(0,Math.round(start??0));
    const b=Math.min(cycleSamples,Math.round(end??cycleSamples));
    if(!(b>a))throw new Error(`${startKey}/${endKey} 的周期内点数范围无效。`);
    return {start:a,end:b,explicit:true};
  }

  function averagePointRange(samples,cycleStart,range,startFraction,endFraction){
    const a=cycleStart+range.start;
    const b=cycleStart+range.end;
    if(!(b>a))return null;
    let begin=a,end=b;
    if(!range.explicit){
      const n=b-a;
      begin=a+Math.floor(n*Math.max(0,Math.min(.95,startFraction)));
      end=a+Math.ceil(n*Math.max(.05,Math.min(1,endFraction)));
      if(end<=begin){begin=a;end=b;}
    }
    const selected=samples.slice(begin,end);
    const currents=selected.map(v=>v.current).filter(Number.isFinite);
    if(!currents.length)return null;
    const volts=selected.map(v=>v.voltage).filter(Number.isFinite);
    const times=selected.map(v=>v.time).filter(Number.isFinite);
    return {
      current:average(currents),
      voltage:volts.length?average(volts):null,
      time:times.length?average(times):null,
      sampleCount:selected.length,
      startIndex:begin,
      endIndex:end-1
    };
  }

  function inferPointCycleRanges(samples,cycleSamples,options,fileName){
    const writeExplicit=rangeOption(options,'writeStartSample','writeEndSample',cycleSamples);
    const readExplicit=rangeOption(options,'readStartSample','readEndSample',cycleSamples);
    if(writeExplicit&&readExplicit)return {write:writeExplicit,read:readExplicit,source:'explicit'};

    const phaseOrder=['write-read','read-write'].includes(options.phaseOrder)?options.phaseOrder:'write-read';
    const inferred=inferPulseProtocolFromName(fileName||'');
    const writeDuration=finiteOrNull(options.writeDuration)??inferred.writeDuration;
    const readDuration=finiteOrNull(options.readDuration)??inferred.readDuration;
    let split=null;
    let source='half';

    if(writeDuration>0&&readDuration>0){
      split=Math.max(1,Math.min(cycleSamples-1,Math.round(cycleSamples*writeDuration/(writeDuration+readDuration))));
      source='duration-ratio';
    }

    if(split===null&&samples.some(s=>Number.isFinite(s.voltage))){
      const cycleCount=Math.floor(samples.length/cycleSamples);
      if(cycleCount>=2){
        const profile=new Array(cycleSamples).fill(0);
        const counts=new Array(cycleSamples).fill(0);
        for(let ci=0;ci<cycleCount;ci++){
          const base=ci*cycleSamples;
          for(let j=0;j<cycleSamples&&base+j<samples.length;j++){
            const v=samples[base+j].voltage;
            if(Number.isFinite(v)){profile[j]+=v;counts[j]++;}
          }
        }
        for(let j=0;j<cycleSamples;j++)profile[j]=counts[j]?profile[j]/counts[j]:NaN;
        let best=-1,bestScore=-Infinity;
        const guard=Math.max(2,Math.round(cycleSamples*.06));
        for(let j=guard;j<cycleSamples-guard;j++){
          const a=profile[j-1],b=profile[j];
          if(!Number.isFinite(a)||!Number.isFinite(b))continue;
          const score=Math.abs(b-a);
          if(score>bestScore){bestScore=score;best=j;}
        }
        if(best>0&&best<cycleSamples){
          split=best;
          source='voltage-transition';
        }
      }
    }

    if(split===null)split=Math.max(1,Math.min(cycleSamples-1,Math.round(cycleSamples/2)));
    const first={start:0,end:split,explicit:false};
    const second={start:split,end:cycleSamples,explicit:false};
    const auto=phaseOrder==='read-write'?{read:first,write:second}:{write:first,read:second};
    return {
      write:writeExplicit||auto.write,
      read:readExplicit||auto.read,
      source:(writeExplicit||readExplicit)?`${source}+partial-explicit`:source
    };
  }

  function pointCycleAnalyzePulseReadData(file,options,ins){
    const headers=ins.headers;
    const timeCol=resolveColumn(headers,options,'timeCol','time',{required:false,fallback:-1});
    const currentCol=resolveColumn(headers,options,'currentCol','current',{required:true,fallback:Math.min(1,headers.length-1)});
    const voltageCol=resolveColumn(headers,options,'voltageCol','voltage',{required:false,fallback:-1});
    if(currentCol===voltageCol)throw new Error('电流列和电压列不能是同一列；若未记录电压，请把电压列设为“未记录”。');

    const samples=pointSamples(ins,{timeCol,currentCol,voltageCol},options);
    let cycleSamples=Math.max(0,Math.round(Number(options.cycleSamples)||0));
    if(cycleSamples<=1)cycleSamples=estimatePulseCycleSamples(ins,{currentCol,voltageCol})||0;
    if(cycleSamples<=1)throw new Error('无法从周期性数据自动确定“每周期点数”，请手动填写。例如 DataDeal 脚本中的 segs=300 对应这里的每周期点数 300。');
    if(cycleSamples>samples.length)throw new Error(`每周期点数 ${cycleSamples} 大于有效数据点数 ${samples.length}。`);

    let offset=Math.max(0,Math.round(Number(options.cycleOffsetSamples)||0));
    if(offset>=cycleSamples)offset%=cycleSamples;
    const usable=samples.length-offset;
    const cycleCount=Math.floor(usable/cycleSamples);
    if(cycleCount<1)throw new Error('没有完整周期可用于脉冲分析。');

    const startFraction=Number.isFinite(Number(options.windowStartFraction))?Number(options.windowStartFraction):.25;
    const endFraction=Number.isFinite(Number(options.windowEndFraction))?Number(options.windowEndFraction):.75;
    const ranges=inferPointCycleRanges(samples.slice(offset,offset+cycleCount*cycleSamples),cycleSamples,options,file.name||'');
    const inferred=inferPulseProtocolFromName(file.name||'');
    const explicitReadVoltage=finiteOrNull(options.readVoltage)??inferred.readVoltage;
    const explicitPulseVoltage=finiteOrNull(options.pulseVoltage)??inferred.pulseVoltage;
    const blocks=[],points=[];

    for(let ci=0;ci<cycleCount;ci++){
      const base=offset+ci*cycleSamples;
      const write=averagePointRange(samples,base,ranges.write,startFraction,endFraction);
      const read=averagePointRange(samples,base,ranges.read,startFraction,endFraction);
      if(!write||!read)continue;
      const writeBlock={
        blockIndex:blocks.length,phase:'write',sequence:ci+1,
        startIndex:write.startIndex,endIndex:write.endIndex,current:write.current,voltage:write.voltage,time:write.time,
        sampleCount:write.sampleCount
      };
      blocks.push(writeBlock);
      const readBlock={
        blockIndex:blocks.length,phase:'read',sequence:ci+1,
        startIndex:read.startIndex,endIndex:read.endIndex,current:read.current,voltage:read.voltage,time:read.time,
        sampleCount:read.sampleCount
      };
      blocks.push(readBlock);
      const pulseVoltage=Number.isFinite(write.voltage)?write.voltage:explicitPulseVoltage;
      const readVoltage=Number.isFinite(read.voltage)?read.voltage:explicitReadVoltage;
      points.push({
        index:points.length,sequence:ci+1,
        pulseVoltage:Number.isFinite(pulseVoltage)?pulseVoltage:null,
        pulseCurrent:write.current,
        readVoltage:Number.isFinite(readVoltage)?readVoltage:null,
        readCurrent:read.current,
        pulseTime:write.time,readTime:read.time,
        pulseBlockIndex:writeBlock.blockIndex,readBlockIndex:readBlock.blockIndex,
        pulseSamples:write.sampleCount,readSamples:read.sampleCount
      });
    }
    if(!points.length)throw new Error('按周期点数没有得到有效的写入/读取对，请检查周期点数、偏移和周期内统计区间。');

    const readVoltages=points.map(p=>p.readVoltage).filter(Number.isFinite);
    return {
      fileName:file.name||'pulse-data',inspection:ins,
      segmentationMode:'cycle',hasRecordedVoltage:voltageCol>=0,
      columns:{timeCol,currentCol,voltageCol},
      cycleSamples,cycleOffsetSamples:offset,blockSamples:null,offsetSamples:offset,readParity:null,
      readVoltage:readVoltages.length?median(readVoltages):null,
      windowStartFraction:startFraction,windowEndFraction:endFraction,pairMode:'cycle',
      protocol:{
        cycleSamples,cycleOffsetSamples:offset,phaseRangeSource:ranges.source,
        writeRange:{start:ranges.write.start,end:ranges.write.end,explicit:!!ranges.write.explicit},
        readRange:{start:ranges.read.start,end:ranges.read.end,explicit:!!ranges.read.explicit}
      },
      blocks,points,
      raw:{time:samples.map(s=>s.time),current:samples.map(s=>s.current),voltage:samples.map(s=>s.voltage)}
    };
  }

  function timingAnalyzePulseReadData(file,options,ins){
    const headers=ins.headers;
    const timeCol=resolveColumn(headers,options,'timeCol','time',{required:false,fallback:-1});
    const currentCol=resolveColumn(headers,options,'currentCol','current',{required:true,fallback:Math.min(1,headers.length-1)});
    const voltageCol=resolveColumn(headers,options,'voltageCol','voltage',{required:false,fallback:-1});
    if(currentCol===voltageCol)throw new Error('电流列和电压列不能是同一列；若未记录电压，请把电压列设为“未记录”。');

    const protocol=inferPulseProtocolFromName(file.name||'');
    const writeDuration=finiteOrNull(options.writeDuration)??protocol.writeDuration;
    const readDuration=finiteOrNull(options.readDuration)??protocol.readDuration;
    if(!(writeDuration>0)||!(readDuration>0))throw new Error('按时间协议分段需要分别填写“写入宽度”和“读取宽度”；也可在文件名中使用 t=0.1s、read=0.1 1s 之类的协议标记。');
    const phaseOrder=['write-read','read-write'].includes(options.phaseOrder)?options.phaseOrder:'write-read';
    const startFraction=Number.isFinite(Number(options.windowStartFraction))?Number(options.windowStartFraction):.25;
    const endFraction=Number.isFinite(Number(options.windowEndFraction))?Number(options.windowEndFraction):.75;
    const explicitReadVoltage=finiteOrNull(options.readVoltage)??protocol.readVoltage;
    const explicitPulseVoltage=finiteOrNull(options.pulseVoltage)??protocol.pulseVoltage;
    const samples=buildSamples(ins,{timeCol,currentCol,voltageCol},options);
    const firstTime=samples[0].time;
    const maxTime=samples.at(-1).time;
    const startTime=finiteOrNull(options.startTime)??firstTime;
    const cycleDuration=writeDuration+readDuration;
    const includeIncomplete=options.includeIncomplete===true||String(options.includeIncomplete).toLowerCase()==='true';
    const points=[];
    const blocks=[];
    const phaseDurations={write:writeDuration,read:readDuration};
    const order=phaseOrder==='read-write'?['read','write']:['write','read'];
    let cursor=startTime;
    let sequence=0;
    const epsilon=Math.max(1e-12,cycleDuration*1e-9);

    while(cursor<=maxTime+epsilon){
      const cycle={};
      for(const phase of order){
        const duration=phaseDurations[phase];
        const end=cursor+duration;
        const complete=end<=maxTime+epsilon;
        if(!complete&&!includeIncomplete){cursor=end;continue;}
        const stat=segmentAverage(samples,cursor,Math.min(end,maxTime),startFraction,endFraction);
        if(stat){
          const block={
            blockIndex:blocks.length,phase,sequence,startTime:cursor,endTime:end,
            duration,current:stat.current,voltage:stat.voltage,time:stat.time,sampleCount:stat.sampleCount
          };
          blocks.push(block);cycle[phase]=block;
        }
        cursor=end;
      }
      if(cycle.write&&cycle.read){
        const pulseVoltage=Number.isFinite(cycle.write.voltage)?cycle.write.voltage:explicitPulseVoltage;
        const readVoltage=Number.isFinite(cycle.read.voltage)?cycle.read.voltage:explicitReadVoltage;
        points.push({
          index:points.length,sequence:sequence+1,
          pulseVoltage:Number.isFinite(pulseVoltage)?pulseVoltage:null,
          pulseCurrent:cycle.write.current,
          readVoltage:Number.isFinite(readVoltage)?readVoltage:null,
          readCurrent:cycle.read.current,
          pulseTime:cycle.write.time,readTime:cycle.read.time,
          pulseBlockIndex:cycle.write.blockIndex,readBlockIndex:cycle.read.blockIndex,
          pulseDuration:writeDuration,readDuration
        });
      }
      sequence++;
      if(sequence>Math.ceil((maxTime-startTime)/Math.max(cycleDuration,1e-15))+2)break;
    }
    if(!points.length)throw new Error('按时间协议未得到完整的写入/读取对；请检查起始时间、写入宽度、读取宽度和相位顺序。');

    const readVoltages=points.map(p=>p.readVoltage).filter(Number.isFinite);
    return {
      fileName:file.name||'pulse-data',inspection:ins,
      segmentationMode:'timing',hasRecordedVoltage:voltageCol>=0,
      columns:{timeCol,currentCol,voltageCol},blockSamples:null,offsetSamples:0,readParity:null,
      readVoltage:readVoltages.length?median(readVoltages):null,
      windowStartFraction:startFraction,windowEndFraction:endFraction,pairMode:'timing',
      protocol:{writeDuration,readDuration,phaseOrder,startTime,sampleInterval:finiteOrNull(options.sampleInterval)},
      blocks,points,
      raw:{time:samples.map(s=>s.time),current:samples.map(s=>s.current),voltage:samples.map(s=>s.voltage)}
    };
  }

  function waveformAnalyzePulseReadData(file,options,ins){
    const headers=ins.headers;
    const timeCol=resolveColumn(headers,options,'timeCol','time',{required:false,fallback:-1});
    const currentCol=resolveColumn(headers,options,'currentCol','current',{required:true,fallback:Math.min(1,headers.length-1)});
    const voltageCol=resolveColumn(headers,options,'voltageCol','voltage',{required:true,fallback:pulseHeaderIndex(headers,'voltage')});
    if(currentCol===voltageCol)throw new Error('电流列和电压列不能是同一列。');
    const samples=buildSamples(ins,{timeCol,currentCol,voltageCol},options);
    const voltage=samples.map(s=>s.voltage);
    const finite=voltage.filter(Number.isFinite);
    if(finite.length<4)throw new Error('记录电压不足，无法按电压平台分段。');
    const vr=Math.max(...finite)-Math.min(...finite);
    const diffs=[];
    for(let i=1;i<voltage.length;i++)if(Number.isFinite(voltage[i])&&Number.isFinite(voltage[i-1]))diffs.push(Math.abs(voltage[i]-voltage[i-1]));
    const threshold=Math.max(vr*.035,(median(diffs)||0)+8*(medianAbsDeviation(diffs)||0),1e-9);
    const boundaries=[0];
    for(let i=1;i<voltage.length;i++){
      if(Number.isFinite(voltage[i])&&Number.isFinite(voltage[i-1])&&Math.abs(voltage[i]-voltage[i-1])>=threshold)boundaries.push(i);
    }
    boundaries.push(samples.length);
    const compact=[boundaries[0]];
    for(const b of boundaries.slice(1))if(b-compact.at(-1)>=2)compact.push(b);
    if(compact.at(-1)!==samples.length)compact.push(samples.length);
    if(compact.length<5)throw new Error('电压跳变数量不足，无法可靠识别写入/读取平台；若两种平台宽度已知，请改用“按时间协议”。');

    const startFraction=Number.isFinite(Number(options.windowStartFraction))?Number(options.windowStartFraction):.25;
    const endFraction=Number.isFinite(Number(options.windowEndFraction))?Number(options.windowEndFraction):.75;
    const blocks=[];
    for(let bi=0;bi<compact.length-1;bi++){
      const a=compact[bi],b=compact[bi+1];
      if(b-a<2)continue;
      blocks.push({
        blockIndex:blocks.length,startIndex:a,endIndex:b-1,
        voltage:stableBlockAverage(voltage,a,b,startFraction,endFraction),
        current:stableBlockAverage(samples.map(s=>s.current),a,b,startFraction,endFraction),
        time:stableBlockAverage(samples.map(s=>s.time),a,b,startFraction,endFraction),
        duration:Math.max(0,samples[b-1].time-samples[a].time)
      });
    }
    if(blocks.length<4)throw new Error('识别到的电压平台数量过少。');

    const explicitRead=finiteOrNull(options.readVoltage)??inferPulseProtocolFromName(file.name||'').readVoltage;
    const tolerance=Math.max(vr*.025,medianAbsDeviation(blocks.map(b=>b.voltage))*4||0,1e-9);
    let readCenter=explicitRead;
    if(!Number.isFinite(readCenter)){
      const clusters=[];
      for(const b of blocks){
        let c=clusters.find(c=>Math.abs(c.center-b.voltage)<=tolerance);
        if(!c){c={center:b.voltage,values:[]};clusters.push(c);}
        c.values.push(b.voltage);c.center=average(c.values);
      }
      clusters.sort((a,b)=>b.values.length-a.values.length);
      readCenter=clusters[0]?.center;
    }
    const isRead=b=>Number.isFinite(readCenter)&&Math.abs(b.voltage-readCenter)<=tolerance;
    const pairMode=['after','before'].includes(options.readPairMode)?options.readPairMode:'after';
    const points=[];
    for(let i=0;i<blocks.length;i++){
      const pulse=blocks[i];
      if(isRead(pulse))continue;
      const candidates=pairMode==='before'?[blocks[i-1],blocks[i+1]]:[blocks[i+1],blocks[i-1]];
      let chosen=null;
      for(const c of candidates){if(c&&isRead(c)){chosen=c;break;}}
      if(!chosen)continue;
      points.push({
        index:points.length,sequence:points.length+1,
        pulseVoltage:pulse.voltage,pulseCurrent:pulse.current,
        readVoltage:chosen.voltage,readCurrent:chosen.current,
        pulseTime:pulse.time,readTime:chosen.time,
        pulseBlockIndex:pulse.blockIndex,readBlockIndex:chosen.blockIndex,
        pulseDuration:pulse.duration,readDuration:chosen.duration
      });
    }
    if(!points.length)throw new Error('未能从电压平台中配对写入与读取段；可手动指定读取电压，或改用“按时间协议”。');
    const readVoltages=points.map(p=>p.readVoltage).filter(Number.isFinite);
    return {
      fileName:file.name||'pulse-data',inspection:ins,
      segmentationMode:'waveform',hasRecordedVoltage:true,
      columns:{timeCol,currentCol,voltageCol},blockSamples:null,offsetSamples:0,readParity:null,
      readVoltage:readVoltages.length?median(readVoltages):null,
      windowStartFraction:startFraction,windowEndFraction:endFraction,pairMode,
      protocol:null,blocks,points,
      raw:{time:samples.map(s=>s.time),current:samples.map(s=>s.current),voltage:samples.map(s=>s.voltage)}
    };
  }

  function analyzePulseReadData(file,options={}){
    const ins=inspectPulseFile(file,options);
    const mode=String(options.segmentationMode||'auto').trim().toLowerCase();
    if(!['auto','cycle','legacy','timing','waveform'].includes(mode))throw new Error(`未知分段模式：${mode}`);
    const inferred=inferPulseProtocolFromName(file.name||'');
    const voltageCol=resolveColumn(ins.headers,options,'voltageCol','voltage',{required:false,fallback:pulseHeaderIndex(ins.headers,'voltage')});
    const hasTiming=(finiteOrNull(options.writeDuration)>0&&finiteOrNull(options.readDuration)>0)
      ||(inferred.writeDuration>0&&inferred.readDuration>0);
    const explicitCycle=Math.round(Number(options.cycleSamples)||0)>1;
    const inferredCycle=explicitCycle?Math.round(Number(options.cycleSamples)):null;

    if(mode==='cycle')return pointCycleAnalyzePulseReadData(file,{...options,cycleSamples:explicitCycle?options.cycleSamples:inferredCycle},ins);
    if(mode==='legacy')return legacyAnalyzePulseReadData(file,options,ins);
    if(mode==='timing')return timingAnalyzePulseReadData(file,options,ins);
    if(mode==='waveform')return waveformAnalyzePulseReadData(file,options,ins);

    // Auto mode trusts an explicit cycle point count first. The UI estimates
    // that value from periodic transitions when a file is loaded, while direct
    // API callers without cycleSamples retain the mature legacy behavior.
    if(inferredCycle>1)return pointCycleAnalyzePulseReadData(file,{...options,cycleSamples:inferredCycle},ins);
    if(hasTiming)return timingAnalyzePulseReadData(file,options,ins);
    if(voltageCol<0)return timingAnalyzePulseReadData(file,options,ins);
    return legacyAnalyzePulseReadData(file,options,ins);
  }

  return {analyzePulseReadData,inferPulseProtocolFromName,estimatePulseCycleSamples};
});
