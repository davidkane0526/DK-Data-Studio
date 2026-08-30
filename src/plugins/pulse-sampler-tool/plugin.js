(() => {
  const manifest={
    id:'com.dkds.tools.pulse-sampler',name:'脉冲与采样处理',version:'1.9.2',apiVersion:'1.18.0',entry:'plugin.js',scripts:['plugin.js'],styles:['plugin.css'],enabled:true,order:360,
    description:'三路 Vd/Vs/Vg 脉冲序列生成、拼接、预览，以及按脉冲时间轴对工程测量数据进行分段稳态平均和读写电流提取。',pluginType:'tool',
    requiresCore:['events','status','project','workspace','data.sources','data.artifacts','data.model','ui.dom','ui.workspace','ui.scientific-plot','ui.series','ui.table','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','ui.table','data.scoped-sources'],
    workspace:{role:'top',activity:'pulse-sampler-tool',icon:'⌁',title:'脉冲与采样处理'},
    window:{activity:'pulse-sampler-tool',title:'脉冲与采样处理',width:1320,height:860,minWidth:960,minHeight:640,dependencies:['scientific-renderer'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    data:{accepts:['data.table','science.transport.iv','science.transport.transfer']},
    compatibility:{app:'>=3.62.0 <4.0.0',pluginApi:'^1.18.0'}
  };

  const EPS=1e-10;
  const CHANNELS=['Vd','Vs','Vg'];
  const DEFAULT_PARAMS={voltageMax:4,voltageStep:0.5,voltageRead:0,pulseTime:0.05,readTime:0.05,timeShift:0,cycle:0.5,ratio:1};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const finite=v=>Number.isFinite(Number(v));
  const num=(v,fallback=0)=>finite(v)?Number(v):fallback;
  const round=(value,digits=8)=>Number(Number(value).toFixed(Math.max(0,Math.min(12,digits))));

  function validCycle(value){
    const c=Number(value);
    return c===0.25||c===0.5||(Number.isInteger(c)&&c>=1);
  }

  function validateParams(p){
    const keys=['voltageMax','voltageStep','voltageRead','pulseTime','readTime','timeShift','cycle','ratio'];
    for(const k of keys) if(!finite(p[k])) throw new Error(`参数“${k}”必须是数字。`);
    if(p.pulseTime<0||p.readTime<0) throw new Error('读取时间和脉冲时间不能为负数。');
    if(p.pulseTime===0&&p.readTime===0) throw new Error('读取时间和脉冲时间不能同时为 0。');
    if(!validCycle(p.cycle)) throw new Error('周期只能为 0.25、0.5，或大于等于 1 的整数。');
    if(p.voltageMax===0&&p.voltageStep===0) throw new Error('脉冲电压上限和步长不能同时为 0。');
    if(p.ratio===0) throw new Error('拉伸系数不能为 0。');
  }

  // Faithful JS port of pulse.py for the normal read-time > 0 path.
  // The zero-read-time branch is implemented by explicit pulse-only filtering,
  // avoiding the original Python branch's inconsistent time/value lengths.
  function pulseGenerator(raw){
    const p={
      voltageMax:Number(raw.voltageMax),voltageStep:Number(raw.voltageStep),voltageRead:Number(raw.voltageRead),
      pulseTime:Number(raw.pulseTime),readTime:Number(raw.readTime),timeShift:Number(raw.timeShift),cycle:Number(raw.cycle),ratio:Number(raw.ratio)
    };
    validateParams(p);
    let Voltage_Max=p.voltageMax,Voltage_Step=p.voltageStep,Voltage_read=p.voltageRead;
    const pulse_time=p.pulseTime,read_time=p.readTime,time_shift=p.timeShift,cycle=p.cycle,ratio=p.ratio;
    let typeSign=0;
    if(Voltage_Step>=Math.abs(Voltage_Max)){
      Voltage_Step=Math.trunc(Voltage_Step);typeSign=5;
    }else if(Voltage_Max>0&&Voltage_Step>0){typeSign=1;}
    else if(Voltage_Max<0&&Voltage_Step>0){typeSign=2;Voltage_Max=-Voltage_Max;}
    else if(Voltage_Max>0&&Voltage_Step<0){typeSign=3;Voltage_Step=-Voltage_Step;}
    else if(Voltage_Max<0&&Voltage_Step<0){typeSign=4;Voltage_Max=-Voltage_Max;Voltage_Step=-Voltage_Step;}
    else throw new Error('当前电压上限/步长组合无法形成有效脉冲。');

    let time=[],voltage=[];
    let timeUp=[],timeDown=[],timeLeft=[],timeRight=[];
    let vUp=[],vDown=[],vLeft=[],vRight=[];

    if(typeSign>=1&&typeSign<=4){
      timeUp.push(read_time);vUp.push(Voltage_read);
      timeUp.push(read_time+pulse_time);vUp.push(Voltage_Max);
      let vTemp=Voltage_Max,tTemp=read_time+pulse_time,filter=1,guard=0;
      while(guard++<100000){
        if(filter%2===1){tTemp+=read_time;timeUp.push(tTemp);vUp.push(Voltage_read);filter++;}
        else{
          tTemp+=pulse_time;timeUp.push(tTemp);vTemp-=Voltage_Step;
          if(vTemp-Voltage_read<=1e-4){timeUp=timeUp.slice(0,-1);break;}
          vUp.push(vTemp);filter++;
        }
      }
      if(guard>=100000) throw new Error('脉冲步进未收敛，请检查电压上限、读取电压和步长。');

      timeDown=timeUp.slice();
      for(let i=0;i<vUp.length;i++) vDown.push(i%2===1?-vUp[i]:vUp[i]);
      vTemp=vDown[vDown.length-2];tTemp=timeDown[timeDown.length-1];filter=0;guard=0;
      while(guard++<100000){
        if(filter%2===1){tTemp+=read_time;timeDown.push(tTemp);vDown.push(Voltage_read);filter++;}
        else{
          tTemp+=pulse_time;timeDown.push(tTemp);vTemp+=Voltage_Step;
          if(Math.abs(vTemp-Voltage_read)<1e-4||vTemp-Voltage_read>=1e-4){timeDown=timeDown.slice(0,-1);break;}
          vDown.push(vTemp);filter++;
        }
      }
      if(guard>=100000) throw new Error('反向脉冲步进未收敛，请检查参数。');

      timeLeft=timeUp.slice();vLeft=vUp.slice().reverse();
      timeRight=timeDown.slice();vRight=vDown.slice().reverse();
      if(timeLeft.length<4||timeRight.length<4) throw new Error('脉冲点数过少，无法构造完整扫描周期。');
      let timeLeftUp=timeLeft.concat(timeUp.slice(3).map(x=>x+timeLeft[timeLeft.length-4]));
      let vLeftUp=vLeft.concat(vUp.slice(3));
      let timeRightDown=timeRight.concat(timeDown.slice(3).map(x=>x+timeRight[timeRight.length-4]));
      let vRightDown=vRight.concat(vDown.slice(3));
      const split=[];
      for(let i=0;i<vRightDown.length;i++) if(vRightDown[i]<Voltage_read) split.push(i);
      if(Voltage_read<0&&split.length){
        const base=timeRightDown[Math.max(0,split[0]-2)];
        timeRightDown=timeRightDown.map(x=>x-base).slice(Math.max(0,split[0]-1),split[split.length-1]+2);
        vRightDown=vRightDown.slice(Math.max(0,split[0]-1),split[split.length-1]+2);
      }

      if(typeSign===1){
        if(cycle===0.25){time=timeLeft;voltage=vLeft;}
        else if(cycle===0.5){time=timeLeftUp;voltage=vLeftUp;}
        else{
          let tt=timeLeftUp.concat(timeRightDown.slice(1).map(x=>x+timeLeftUp[timeLeftUp.length-2]));
          let vv=vLeftUp.concat(vRightDown.slice(1));
          for(let c=1;c<Math.trunc(cycle);c++){const base=tt[tt.length-2],copy=tt.slice(1).map(x=>x+base);tt=tt.concat(copy);vv=vv.concat(vv.slice(1));}
          time=tt;voltage=vv;
        }
      }else if(typeSign===2){
        if(cycle===0.25){time=timeRight;voltage=vRight;}
        else if(cycle===0.5){time=timeRightDown;voltage=vRightDown;}
        else{
          let tt=timeRightDown.concat(timeLeftUp.slice(1).map(x=>x+timeRightDown[timeRightDown.length-2]));
          let vv=vRightDown.concat(vLeftUp.slice(1));
          for(let c=1;c<Math.trunc(cycle);c++){const base=tt[tt.length-2],copy=tt.slice(1).map(x=>x+base);tt=tt.concat(copy);vv=vv.concat(vv.slice(1));}
          time=tt;voltage=vv;
        }
      }else if(typeSign===3){
        if(cycle===0.25){time=timeUp;voltage=vUp;}
        else if(cycle===0.5){time=timeUp.concat(timeRight.slice(1).map(x=>x+timeUp[timeUp.length-2]));voltage=vUp.concat(vRight.slice(1));}
        else{
          const t3=timeUp.concat(timeRightDown.slice(1).map(x=>x+timeUp[timeUp.length-2]));
          const v3=vUp.concat(vRightDown.slice(1));
          let tt=t3.concat(timeLeft.slice(1).map(x=>x+t3[t3.length-2]));
          let vv=v3.concat(vLeft.slice(1));
          for(let c=1;c<Math.trunc(cycle);c++){const oldT=tt.slice(),oldV=vv.slice(),base=oldT[oldT.length-4];tt=oldT.slice(0,-1).concat(oldT.slice(2).map(x=>x+base));vv=oldV.slice(0,-1).concat(oldV.slice(2));}
          time=tt;voltage=vv;
        }
      }else if(typeSign===4){
        if(cycle===0.25){time=timeDown;voltage=vDown;}
        else if(cycle===0.5){time=timeDown.concat(timeLeft.slice(1).map(x=>x+timeDown[timeDown.length-2]));voltage=vDown.concat(vLeft.slice(1));}
        else{
          const t4=timeDown.concat(timeLeftUp.slice(1).map(x=>x+timeDown[timeDown.length-2]));
          const v4=vDown.concat(vLeftUp.slice(1));
          let tt=t4.concat(timeRight.slice(1).map(x=>x+t4[t4.length-2]));
          let vv=v4.concat(vRight.slice(1));
          for(let c=1;c<Math.trunc(cycle);c++){const oldT=tt.slice(),oldV=vv.slice(),base=oldT[oldT.length-4];tt=oldT.slice(0,-1).concat(oldT.slice(2).map(x=>x+base));vv=oldV.slice(0,-1).concat(oldV.slice(2));}
          time=tt;voltage=vv;
        }
      }
    }else if(typeSign===5){
      let count=Math.trunc(Voltage_Step);
      if(cycle===0.25) count=Math.trunc(0.25*count);
      else if(cycle===0.5) count=Math.trunc(0.5*count);
      else count=Math.trunc(count*cycle);
      if(count<1) throw new Error('方波数量必须至少为 1。');
      let t=0;
      for(let i=0;i<count;i++){
        t+=read_time;time.push(t);voltage.push(Voltage_read);
        t+=pulse_time;time.push(t);voltage.push(Voltage_Max);
      }
      t+=read_time;time.push(t);voltage.push(Voltage_read);
    }

    if(read_time===0){
      const t=[],v=[];
      for(let i=0;i<time.length;i++) if(i%2===1){t.push(time[i]);v.push(voltage[i]);}
      time=t;voltage=v;
    }
    const digits=Math.min(10,Math.max(String(read_time).length,String(pulse_time).length)+2);
    time=time.map(x=>round(x+time_shift,digits));
    voltage=voltage.map(x=>round(x*ratio,Math.min(10,String(Voltage_read).length+2)));
    return {time,voltage,typeSign,params:clone(p)};
  }

  function concatSegments(segments,preview=null){
    const list=segments.slice();
    if(preview&&preview.time?.length) list.push(preview);
    let time=[],voltage=[];
    for(const seg of list){
      if(!seg?.time?.length) continue;
      if(!time.length){time=seg.time.slice();voltage=seg.voltage.slice();continue;}
      const base=time[time.length-1];
      const shifted=seg.time.map(x=>round(x+base,10));
      time=time.slice(0,-1).concat(shifted);
      voltage=voltage.slice(0,-1).concat(seg.voltage);
    }
    return {time,voltage};
  }

  function valueAt(time,values,t){
    if(!time.length) return 0;
    let lo=0,hi=time.length-1;
    if(t<time[0]-EPS) return 0;
    if(t>=time[hi]-EPS) return values[hi]??0;
    while(lo<=hi){const mid=(lo+hi)>>1;if(time[mid]<=t+EPS)lo=mid+1;else hi=mid-1;}
    return values[Math.max(0,hi)]??0;
  }

  function mergeChannels(channelData){
    const set=new Set();
    for(const c of CHANNELS) for(const t of channelData[c].time||[]) set.add(round(t,10));
    const time=[...set].sort((a,b)=>a-b);
    return time.map(t=>({time:t,Vd:valueAt(channelData.Vd.time,channelData.Vd.voltage,t),Vs:valueAt(channelData.Vs.time,channelData.Vs.voltage,t),Vg:valueAt(channelData.Vg.time,channelData.Vg.voltage,t)}));
  }

  function stepPoints(time,values,maxPoints=12000){
    if(!time?.length) return [];
    const points=[];
    const stride=Math.max(1,Math.ceil(time.length/maxPoints));
    let prev=values[0];
    points.push({x:0,y:prev});
    for(let i=0;i<time.length;i+=stride){const t=time[i],v=values[i];points.push({x:t,y:prev});points.push({x:t,y:v});prev=v;}
    const last=time.length-1;
    if((last%stride)!==0){points.push({x:time[last],y:prev});points.push({x:time[last],y:values[last]});}
    return points;
  }

  function median(values){
    if(!values.length) return NaN;
    const a=values.slice().sort((x,y)=>x-y),m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }

  function inferSampleStep(times){
    const diffs=[];
    for(let i=1;i<times.length&&diffs.length<5000;i++){const d=times[i]-times[i-1];if(Number.isFinite(d)&&d>0)diffs.push(d);}
    return median(diffs);
  }

  function decimalPlaces(x){
    if(!Number.isFinite(x)||x<=0) return 0;
    const s=x.toExponential(8),parts=s.split('e'),mant=parts[0],exp=Number(parts[1]),dec=(mant.split('.')[1]||'').replace(/0+$/,'').length;
    return Math.max(0,Math.min(8,dec-exp));
  }

  function nearestIndex(sorted,value){
    if(!sorted.length) return -1;
    let lo=0,hi=sorted.length-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if(sorted[mid]<value)lo=mid+1;else hi=mid-1;}
    if(lo<=0)return 0;if(lo>=sorted.length)return sorted.length-1;
    return Math.abs(sorted[lo]-value)<Math.abs(sorted[lo-1]-value)?lo:lo-1;
  }

  function extractSteadyState(dataTimes,dataCurrent,pulseTime,pulseVoltage,trimLeftRaw,trimRightRaw){
    if(dataTimes.length!==dataCurrent.length||!dataTimes.length) throw new Error('Time 与 Current 数据长度不一致或为空。');
    if(!pulseTime.length||pulseTime.length!==pulseVoltage.length) throw new Error('当前通道没有可用脉冲序列。');
    for(let i=1;i<dataTimes.length;i++) if(dataTimes[i]<dataTimes[i-1]) throw new Error('Time 列必须按时间递增。');
    const dt=inferSampleStep(dataTimes);
    const tolerance=Number.isFinite(dt)?Math.max(dt*0.55,1e-9):1e-6;
    const boundaries=[];
    for(const t of pulseTime){
      const idx=nearestIndex(dataTimes,t);
      if(idx<0) break;
      if(Math.abs(dataTimes[idx]-t)<=tolerance) boundaries.push(idx); else break;
    }
    if(!boundaries.length) throw new Error('实测时间轴与脉冲时间轴没有可匹配的边界。');
    const usablePulseTime=pulseTime.slice(0,boundaries.length);
    const usablePulseVoltage=pulseVoltage.slice(0,boundaries.length);
    const autoTrim=Math.max(0,decimalPlaces(dt));
    const trimLeft=trimLeftRaw===''||trimLeftRaw==null?autoTrim:Math.max(0,Math.trunc(Number(trimLeftRaw)));
    const trimRight=trimRightRaw===''||trimRightRaw==null?autoTrim:Math.max(0,Math.trunc(Number(trimRightRaw)));
    const means=[];const segmentRows=[];
    let start=0;
    for(let i=0;i<boundaries.length;i++){
      const end=boundaries[i];
      const a=start+trimLeft,b=end-trimRight;
      if(a>b) throw new Error(`第 ${i+1} 个区段剔除点过多，没有剩余数据。`);
      let sum=0,count=0;
      for(let j=a;j<=b;j++){const v=Number(dataCurrent[j]);if(Number.isFinite(v)){sum+=v;count++;}}
      if(!count) throw new Error(`第 ${i+1} 个区段没有有效 Current 数据。`);
      const mean=sum/count;means.push(mean);
      segmentRows.push({segment:i+1,startTime:dataTimes[start],endTime:dataTimes[end],points:end-start+1,used:count,meanCurrent:mean,pulseVoltage:usablePulseVoltage[i]});
      start=end+1;
    }
    const readVoltage=[],readCurrent=[],pulseV=[],pulseCurrent=[];
    for(let i=0;i<means.length;i++){
      if(i%2===0){readVoltage.push(usablePulseVoltage[i]);readCurrent.push(means[i]);}
      else{pulseV.push(usablePulseVoltage[i]);pulseCurrent.push(means[i]);}
    }
    return {dt,tolerance,trimLeft,trimRight,boundaries,means,segmentRows,readVoltage,readCurrent,pulseVoltage:pulseV,pulseCurrent,matched:boundaries.length,totalPulse:pulseTime.length};
  }

  function initialState(){
    const channels={};for(const c of CHANNELS)channels[c]={segments:[],preview:null,params:clone(DEFAULT_PARAMS)};
    return {activeChannel:'Vd',channels,analysis:{sourceId:'',timeKey:'',currentKey:'',trimLeft:'',trimRight:'',xMode:'readVoltage',yMode:'readCurrent'},result:null};
  }

  DKDSPlugins.define(manifest, async ctx => {
    let model=initialState();
    let workbench=null,waveSurface=null,resultSurface=null,waveTable=null,resultTable=null,segmentTable=null;
    let mounted=false;
    const el={};

    const persistable=()=>({activeChannel:model.activeChannel,channels:model.channels,analysis:{...model.analysis},result:null});
    ctx.project.registerSlice('pulse-sampler-tool',{
      serialize:()=>persistable(),
      restore:data=>{if(data&&typeof data==='object'){
        const fresh=initialState();
        model.activeChannel=CHANNELS.includes(data.activeChannel)?data.activeChannel:fresh.activeChannel;
        for(const c of CHANNELS){const src=data.channels?.[c];if(src){model.channels[c].segments=Array.isArray(src.segments)?src.segments:[];model.channels[c].preview=src.preview||null;model.channels[c].params={...fresh.channels[c].params,...(src.params||{})};}}
        model.analysis={...fresh.analysis,...(data.analysis||{})};delete model.analysis.logY;model.result=null;
        if(mounted) renderAll();
      }},
      reset:()=>{model=initialState();if(mounted)renderAll();}
    });

    const q=(selector,root)=>ctx.ui.dom.query(selector,root||page);
    const channelFinal=c=>concatSegments(model.channels[c].segments,model.channels[c].preview);
    const channelCommitted=c=>concatSegments(model.channels[c].segments,null);
    const allChannelData=()=>({Vd:channelFinal('Vd'),Vs:channelFinal('Vs'),Vg:channelFinal('Vg')});
    const setStatus=text=>ctx.status.set(text);

    function readParamsFromUI(){
      return {
        voltageMax:num(el.voltageMax.value),voltageStep:num(el.voltageStep.value),voltageRead:num(el.voltageRead.value),
        pulseTime:num(el.pulseTime.value),readTime:num(el.readTime.value),timeShift:num(el.timeShift.value),cycle:num(el.cycle.value),ratio:num(el.ratio.value)
      };
    }
    function writeParamsToUI(p){
      if(!mounted)return;
      for(const k of ['voltageMax','voltageStep','voltageRead','pulseTime','readTime','timeShift','cycle','ratio']) el[k].value=String(p[k]);
    }
    function syncActiveParams(){model.channels[model.activeChannel].params=readParamsFromUI();}

    function generate(){
      try{
        const p=readParamsFromUI();const out=pulseGenerator(p);model.channels[model.activeChannel].params=clone(p);model.channels[model.activeChannel].preview=out;
        model.result=null;renderAll();setStatus(`${model.activeChannel} 已生成 ${out.time.length} 个脉冲边界点。`);
      }catch(err){setStatus(err.message||String(err));}
    }
    function addSegment(){
      const ch=model.channels[model.activeChannel];
      if(!ch.preview){setStatus('请先生成当前脉冲片段。');return;}
      ch.segments.push(clone(ch.preview));ch.preview=null;model.result=null;renderAll();setStatus(`${model.activeChannel} 已加入第 ${ch.segments.length} 个片段。`);
    }
    function clearChannel(){
      const ch=model.channels[model.activeChannel];ch.segments=[];ch.preview=null;model.result=null;renderAll();setStatus(`${model.activeChannel} 已清空。`);
    }
    function removeSegment(index){
      const ch=model.channels[model.activeChannel];if(index<0||index>=ch.segments.length)return;ch.segments.splice(index,1);model.result=null;renderAll();setStatus(`已删除 ${model.activeChannel} 第 ${index+1} 个片段。`);
    }

    function renderChannelTabs(){
      for(const c of CHANNELS){const btn=q(`[data-channel="${c}"]`,page);if(btn)btn.classList.toggle('active',c===model.activeChannel);btn.setAttribute('aria-pressed',c===model.activeChannel?'true':'false');}
      el.channelTitle.textContent=model.activeChannel;
      const ch=model.channels[model.activeChannel],final=channelFinal(model.activeChannel);
      el.channelMeta.textContent=`${ch.segments.length} 个已加入片段 · ${ch.preview?'1 个当前预览 · ':''}${final.time.length} 个边界点`;
    }


    function renderWavePlot(){
      waveSurface?.requestRender?.('waveform');
      const merged=mergeChannels(allChannelData());
      const rows=merged.slice(0,5000);
      const cols=[{key:'time',label:'Time',unit:'s'},{key:'Vd',label:'Vd',unit:'V'},{key:'Vs',label:'Vs',unit:'V'},{key:'Vg',label:'Vg',unit:'V'}];
      if(!waveTable) waveTable=ctx.ui.tables.mount('pulse-sampler-wave-table',el.waveTableHost,{columns:cols,rows});
      else waveTable.setData(cols,rows);
      el.waveCount.textContent=merged.length>5000?`显示前 5000 / ${merged.length} 行`:`${merged.length} 行`;
    }

    function renderSegments(){
      const ch=model.channels[model.activeChannel];
      const rows=ch.segments.map((s,i)=>({index:i+1,voltageMax:s.params?.voltageMax,step:s.params?.voltageStep,read:s.params?.voltageRead,pulseTime:s.params?.pulseTime,readTime:s.params?.readTime,cycle:s.params?.cycle,points:s.time?.length||0}));
      const cols=[{key:'index',label:'#'},{key:'voltageMax',label:'上限',unit:'V'},{key:'step',label:'步长'},{key:'read',label:'读取',unit:'V'},{key:'pulseTime',label:'脉冲',unit:'s'},{key:'readTime',label:'读取',unit:'s'},{key:'cycle',label:'周期'},{key:'points',label:'点数'}];
      if(!segmentTable) segmentTable=ctx.ui.tables.mount('pulse-sampler-segment-table',el.segmentTableHost,{columns:cols,rows});
      else segmentTable.setData(cols,rows);
      el.segmentRemove.disabled=!rows.length;
    }

    function sourceRows(){
      const sources=ctx.data.sources.list();
      const src=sources.find(s=>s.artifactId===model.analysis.sourceId)||sources[0];
      if(!src)return {sources,src:null,artifact:null,rows:[]};
      const artifact=ctx.data.artifacts.get(src.artifactId);if(!artifact)return {sources,src,artifact:null,rows:[]};
      const rows=ctx.data.model.rows(artifact)||[];return {sources,src,artifact,rows};
    }

    function chooseLikely(keys,needles,fallback=''){
      const lower=keys.map(k=>String(k).toLowerCase());
      for(const n of needles){const idx=lower.findIndex(k=>k===n||k.includes(n));if(idx>=0)return keys[idx];}
      return fallback||keys[0]||'';
    }

    function refreshSources(){
      if(!mounted)return;
      const sources=ctx.data.sources.list();
      const old=model.analysis.sourceId;
      ctx.ui.dom.html(el.source,'');
      for(const s of sources){const o=ctx.ui.dom.create('option');o.value=s.artifactId;o.textContent=s.name||s.sourceName||s.path||s.artifactId;ctx.ui.dom.append(el.source,o);}
      if(sources.length){model.analysis.sourceId=sources.some(s=>s.artifactId===old)?old:sources[0].artifactId;el.source.value=model.analysis.sourceId;refreshColumns();}
      else{model.analysis.sourceId='';model.analysis.timeKey='';model.analysis.currentKey='';el.sourceMeta.textContent='尚未分配工程数据，可使用窗口顶部的标准导入入口。';ctx.ui.dom.html(el.timeColumn,'');ctx.ui.dom.html(el.currentColumn,'');}
    }

    function refreshColumns(){
      const {src,rows}=sourceRows();
      if(!src||!rows.length){el.sourceMeta.textContent=src?'数据表为空。':'尚未分配工程数据。';return;}
      const keys=Object.keys(rows[0]||{});
      const time=model.analysis.timeKey&&keys.includes(model.analysis.timeKey)?model.analysis.timeKey:chooseLikely(keys,['time','时间','t']);
      const current=model.analysis.currentKey&&keys.includes(model.analysis.currentKey)?model.analysis.currentKey:chooseLikely(keys,['current','电流','id','ids','i'],keys[1]||keys[0]);
      model.analysis.timeKey=time;model.analysis.currentKey=current;
      for(const [select,value] of [[el.timeColumn,time],[el.currentColumn,current]]){
        ctx.ui.dom.html(select,'');for(const k of keys){const o=ctx.ui.dom.create('option');o.value=k;o.textContent=k;ctx.ui.dom.append(select,o);}select.value=value;
      }
      const dt=inferSampleStep(rows.map(r=>Number(r[time])).filter(Number.isFinite));
      el.sourceMeta.textContent=`${src.name||src.sourceName||'数据表'} · ${rows.length} 行${Number.isFinite(dt)?` · 采样间隔≈${round(dt,8)} s`:''}`;
    }

    function runExtraction(){
      try{
        const {src,rows}=sourceRows();if(!src||!rows.length)throw new Error('请先导入并分配一份测量数据。');
        model.analysis.timeKey=el.timeColumn.value;model.analysis.currentKey=el.currentColumn.value;model.analysis.trimLeft=el.trimLeft.value;model.analysis.trimRight=el.trimRight.value;
        const times=[],curr=[];
        for(const r of rows){const t=Number(r[model.analysis.timeKey]),i=Number(r[model.analysis.currentKey]);if(Number.isFinite(t)&&Number.isFinite(i)){times.push(t);curr.push(i);}}
        const pulse=channelFinal(model.activeChannel);const result=extractSteadyState(times,curr,pulse.time,pulse.voltage,model.analysis.trimLeft,model.analysis.trimRight);
        model.result={...result,channel:model.activeChannel,sourceId:src.artifactId};renderResult();
        setStatus(`提取完成：匹配 ${result.matched}/${result.totalPulse} 个脉冲边界，得到 ${result.readCurrent.length} 个读取点和 ${result.pulseCurrent.length} 个脉冲点。`);
      }catch(err){model.result=null;renderResult();setStatus(err.message||String(err));}
    }

    function currentXY(){
      const r=model.result;if(!r)return {x:[],y:[],xLabel:'X',yLabel:'Current'};
      const xMap={readVoltage:['readVoltage','Read Voltage (V)'],pulseVoltage:['pulseVoltage','Pulse Voltage (V)'],readIndex:['readIndex','Read Index'],pulseIndex:['pulseIndex','Pulse Index']};
      const yMap={readCurrent:['readCurrent','Read Current (A)'],pulseCurrent:['pulseCurrent','Pulse Current (A)']};
      const [xKey,xLabel]=xMap[model.analysis.xMode]||xMap.readVoltage,[yKey,yLabel]=yMap[model.analysis.yMode]||yMap.readCurrent;
      let x=xKey==='readIndex'?r.readCurrent.map((_,i)=>i+1):xKey==='pulseIndex'?r.pulseCurrent.map((_,i)=>i+1):(r[xKey]||[]).slice();
      let y=(r[yKey]||[]).slice();
      if(Math.abs(x.length-y.length)===1){if(x.length>y.length)x=x.slice(1);else y=y.slice(1);}
      const n=Math.min(x.length,y.length);x=x.slice(0,n);y=y.slice(0,n);
      return {x,y,xLabel,yLabel};
    }

    function renderResult(){
      const r=model.result;
      if(!r){el.resultMeta.textContent='尚未执行提取。';if(resultTable)resultTable.setData([],[]);resultSurface?.requestRender?.('empty');return;}
      el.resultMeta.textContent=`${r.channel} · 匹配 ${r.matched}/${r.totalPulse} · 自动/实际剔除 ${r.trimLeft}/${r.trimRight} 点 · 容差 ${round(r.tolerance,8)} s`;
      const xy=currentXY();
      const rows=xy.x.map((x,i)=>({index:i+1,x,y:xy.y[i]}));
      const cols=[{key:'index',label:'#'},{key:'x',label:xy.xLabel},{key:'y',label:xy.yLabel}];
      if(!resultTable) resultTable=ctx.ui.tables.mount('pulse-sampler-result-table',el.resultTableHost,{columns:cols,rows});
      else resultTable.setData(cols,rows);
      resultSurface?.requestRender?.('result');
    }

    function renderAll(){
      if(!mounted)return;
      renderChannelTabs();writeParamsToUI(model.channels[model.activeChannel].params);
      el.trimLeft.value=model.analysis.trimLeft??'';el.trimRight.value=model.analysis.trimRight??'';el.xMode.value=model.analysis.xMode;el.yMode.value=model.analysis.yMode;
      renderSegments();renderWavePlot();renderResult();refreshSources();
    }

    function csvFromMerged(){
      const rows=mergeChannels(allChannelData());
      return ['Time_s,Vd_V,Vs_V,Vg_V',...rows.map(r=>[r.time,r.Vd,r.Vs,r.Vg].join(','))].join('\n');
    }
    function csvFromResult(){
      const r=model.result;if(!r)return '';
      const n=Math.max(r.readCurrent.length,r.pulseCurrent.length);
      const lines=['Read_Index,Read_Voltage_V,Read_Current_A,Pulse_Index,Pulse_Voltage_V,Pulse_Current_A'];
      for(let i=0;i<n;i++)lines.push([i<r.readCurrent.length?i+1:'',r.readVoltage[i]??'',r.readCurrent[i]??'',i<r.pulseCurrent.length?i+1:'',r.pulseVoltage[i]??'',r.pulseCurrent[i]??''].join(','));
      return lines.join('\n');
    }
    function downloadText(name,text){
      if(!text){setStatus('当前没有可导出的数据。');return;}
      const blob=new Blob([text],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=ctx.ui.dom.create('a');a.href=url;a.download=name;a.style.display='none';ctx.ui.dom.append(page,a);a.click();a.remove();URL.revokeObjectURL(url);
    }

    ctx.ui.activities.add({
      id:'pulse-sampler-tool',label:'脉冲与采样处理',contextLabel:'Pulse & Sampling',icon:'⌁',order:360,primary:true,openMode:'window',artifactHydration:'live',
      description:'生成并组合 Vd/Vs/Vg 脉冲，按时间轴提取稳态读写电流。',onActivate:()=>{ctx.workspace.openPage('pulseSamplerToolPage');refreshSources();}
    });

    const page=ctx.ui.pages.add({
      id:'pulse-sampler-tool-page',pageId:'pulseSamplerToolPage',activity:'pulse-sampler-tool',label:'脉冲与采样处理',title:'脉冲与采样处理',toolbar:false,
      html:`
        <div class="analysis-page-header pulse-sampler-page-header">
          <div><h2>脉冲与采样处理</h2><div class="pulse-sampler-subtitle">Pulse Generator · Vd / Vs / Vg · Steady-state Sampling</div></div>
          <div data-dkds-slot="workbench-import"></div>
        </div>
        <div class="analysis-page-body"><div class="pulse-sampler-workbench"></div></div>`
    });
    const host=q('.pulse-sampler-workbench',page);
    workbench=ctx.ui.workspaceSurface.create(host,{header:false,activity:'pulse-sampler-tool',primaryScroll:'safe'});
    workbench.mountPrimary({id:'main',label:'工具',scroll:'safe',mount:({main})=>{
      const domDisposers=[];
      const on=(target,event,handler,options)=>{const dispose=ctx.ui.dom.on(target,event,handler,options);domDisposers.push(dispose);return dispose;};
      const shell=ctx.ui.dom.create('div',{className:'pulse-sampler-shell'});
      ctx.ui.dom.html(shell,`
        <section class="ps-card ps-designer dkds-surface">
          <div class="ps-card-head"><div><div class="ps-kicker">PULSE DESIGNER</div><div class="ps-title-row"><h3 data-role="channel-title">Vd</h3><span data-role="channel-meta"></span></div></div><div class="ps-channel-tabs dkds-toolbar"><button data-channel="Vd">Vd</button><button data-channel="Vs">Vs</button><button data-channel="Vg">Vg</button></div></div>
          <div class="ps-param-grid">
            <label>脉冲电压上限 <span>V</span><input class="dkds-field-control" data-field="voltageMax" type="number" step="any"></label>
            <label>电压步长 / 方波数 <input class="dkds-field-control" data-field="voltageStep" type="number" step="any"></label>
            <label>读取电压 <span>V</span><input class="dkds-field-control" data-field="voltageRead" type="number" step="any"></label>
            <label>脉冲时间 <span>s</span><input class="dkds-field-control" data-field="pulseTime" type="number" min="0" step="any"></label>
            <label>读取时间 <span>s</span><input class="dkds-field-control" data-field="readTime" type="number" min="0" step="any"></label>
            <label>时间偏移 <span>s</span><input class="dkds-field-control" data-field="timeShift" type="number" step="any"></label>
            <label>周期 <input class="dkds-field-control" data-field="cycle" type="number" step="0.25"></label>
            <label>拉伸系数 <input class="dkds-field-control" data-field="ratio" type="number" step="any"></label>
          </div>
          <div class="ps-actions dkds-toolbar"><button class="primary" data-action="generate">生成预览</button><button data-action="add-segment">加入序列</button><button data-action="clear-channel">清空通道</button><button data-action="export-wave">导出合并 CSV</button></div>
          <div class="ps-segment-bar dkds-toolbar"><strong>已加入片段</strong><button data-action="remove-segment">删除最后片段</button></div>
          <div class="ps-mini-table" data-host="segments"></div>
        </section>
        <section class="ps-card ps-wave dkds-surface">
          <div class="ps-card-head"><div><div class="ps-kicker">MERGED WAVEFORM</div><h3>三路合并波形</h3></div><span data-role="wave-count"></span></div>
          <div class="ps-plot" data-host="wave-plot"></div>
          <div class="ps-table" data-host="wave-table"></div>
        </section>
        <section class="ps-card ps-analysis dkds-surface">
          <div class="ps-card-head"><div><div class="ps-kicker">SAMPLING</div><h3>测量数据提取</h3></div><span data-role="source-meta"></span></div>
          <div class="ps-analysis-controls dkds-toolbar">
            <label class="ps-wide">工程数据<select class="dkds-field-control" data-field="source"></select></label>
            <label>Time 列<select class="dkds-field-control" data-field="timeColumn"></select></label>
            <label>Current 列<select class="dkds-field-control" data-field="currentColumn"></select></label>
            <label>前剔除点<input class="dkds-field-control" data-field="trimLeft" type="number" min="0" step="1" placeholder="自动"></label>
            <label>后剔除点<input class="dkds-field-control" data-field="trimRight" type="number" min="0" step="1" placeholder="自动"></label>
            <button class="primary" data-action="extract">提取稳态电流</button>
          </div>
          <div class="ps-result-controls dkds-toolbar">
            <label>X<select class="dkds-field-control" data-field="xMode"><option value="readVoltage">Read Voltage</option><option value="pulseVoltage">Pulse Voltage</option><option value="readIndex">Read Index</option><option value="pulseIndex">Pulse Index</option></select></label>
            <label>Y<select class="dkds-field-control" data-field="yMode"><option value="readCurrent">Read Current</option><option value="pulseCurrent">Pulse Current</option></select></label>
            <button data-action="copy-result">复制结果表</button><button data-action="export-result">导出结果 CSV</button>
          </div>
          <div class="ps-card-head ps-result-head"><div><div class="ps-kicker">RESULT</div><h3>读写电流映射</h3></div><span data-role="result-meta"></span></div>
          <div class="ps-result-grid"><div class="ps-plot" data-host="result-plot"></div><div class="ps-table ps-result-table" data-host="result-table"></div></div>
        </section>`);
      ctx.ui.dom.append(main,shell);

      const field=name=>q(`[data-field="${name}"]`,shell),action=name=>q(`[data-action="${name}"]`,shell),hostSel=name=>q(`[data-host="${name}"]`,shell);
      Object.assign(el,{shell,channelTitle:q('[data-role="channel-title"]',shell),channelMeta:q('[data-role="channel-meta"]',shell),waveCount:q('[data-role="wave-count"]',shell),sourceMeta:q('[data-role="source-meta"]',shell),resultMeta:q('[data-role="result-meta"]',shell),
        voltageMax:field('voltageMax'),voltageStep:field('voltageStep'),voltageRead:field('voltageRead'),pulseTime:field('pulseTime'),readTime:field('readTime'),timeShift:field('timeShift'),cycle:field('cycle'),ratio:field('ratio'),source:field('source'),timeColumn:field('timeColumn'),currentColumn:field('currentColumn'),trimLeft:field('trimLeft'),trimRight:field('trimRight'),xMode:field('xMode'),yMode:field('yMode'),
        wavePlotHost:hostSel('wave-plot'),waveTableHost:hostSel('wave-table'),segmentTableHost:hostSel('segments'),resultPlotHost:hostSel('result-plot'),resultTableHost:hostSel('result-table'),segmentRemove:action('remove-segment')});

      const waveSeries=Object.fromEntries(CHANNELS.map((channel,index)=>{
        const id=`pulse-sampler-${channel.toLowerCase()}`;
        const descriptor=ctx.ui.series.register({id,label:channel,group:'pulse-sampler-wave'},index);
        return [channel,descriptor];
      }));
      waveSurface=ctx.ui.scientificPlot.create(el.wavePlotHost,{
        minHeight:260,xTitle:'Time (s)',yTitle:'Voltage (V)',
        legend:{enabled:true,placement:'auto',interaction:'isolate',maxRows:2},
        getCurves:()=>{
          const d=allChannelData();
          return CHANNELS.map(channel=>{
            const series=waveSeries[channel];
            return {
              id:series.id,entityId:series.id,label:series.label,name:series.label,color:series.color,
              points:stepPoints(d[channel].time,d[channel].voltage),
              source:{channel,label:series.label,seriesId:series.id}
            };
          }).filter(curve=>curve.points.length);
        },
        getMarkers:()=>[]
      });
      resultSurface=ctx.ui.scientificPlot.create(el.resultPlotHost,{minHeight:260,getCurves:()=>{
        const xy=currentXY();if(!xy.x.length)return[];const n=Math.min(xy.x.length,xy.y.length);return[{id:'result',points:xy.x.slice(0,n).map((x,i)=>({x,y:xy.y[i]}))}];
      },getMarkers:()=>[]});

      for(const c of CHANNELS){const btn=q(`[data-channel="${c}"]`,shell);on(btn,'click',()=>{syncActiveParams();model.activeChannel=c;writeParamsToUI(model.channels[c].params);model.result=null;renderAll();});}
      on(action('generate'),'click',generate);
      on(action('add-segment'),'click',addSegment);
      on(action('clear-channel'),'click',clearChannel);
      on(action('remove-segment'),'click',()=>removeSegment(model.channels[model.activeChannel].segments.length-1));
      on(action('export-wave'),'click',()=>downloadText('pulse-waveform.csv',csvFromMerged()));
      on(action('extract'),'click',runExtraction);
      on(action('copy-result'),'click',()=>{if(resultTable){const ok=resultTable.copyVisibleTable({includeHeader:true});setStatus(ok?'结果表已复制。':'复制结果表失败。');}else setStatus('当前没有结果表。');});
      on(action('export-result'),'click',()=>downloadText('pulse-sampling-result.csv',csvFromResult()));
      on(el.source,'change',()=>{model.analysis.sourceId=el.source.value;refreshColumns();model.result=null;renderResult();});
      on(el.timeColumn,'change',()=>{model.analysis.timeKey=el.timeColumn.value;});
      on(el.currentColumn,'change',()=>{model.analysis.currentKey=el.currentColumn.value;});
      on(el.xMode,'change',()=>{model.analysis.xMode=el.xMode.value;renderResult();});
      on(el.yMode,'change',()=>{model.analysis.yMode=el.yMode.value;renderResult();});

      mounted=true;el.trimLeft.value=model.analysis.trimLeft;el.trimRight.value=model.analysis.trimRight;el.xMode.value=model.analysis.xMode;el.yMode.value=model.analysis.yMode;renderAll();
      return()=>{mounted=false;for(const dispose of domDisposers.splice(0))dispose?.();waveSurface?.dispose?.();resultSurface?.dispose?.();waveTable?.dispose?.();resultTable?.dispose?.();segmentTable?.dispose?.();waveSurface=resultSurface=waveTable=resultTable=segmentTable=null;};
    }});

    ctx.ui.topWorkspace.register({id:'pulse-sampler-tool',activity:'pulse-sampler-tool',label:'脉冲与采样处理',icon:'⌁',layout:{mode:'native',root:{selector:'#pulseSamplerToolPage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary',presentationRole:'utility-primary',priority:100,collapsible:false},prime:[],sub:[]}});
    const off=ctx.events.on('data:artifacts-changed',()=>{refreshSources();});
    return{deactivate(){off?.();waveSurface?.dispose?.();resultSurface?.dispose?.();waveTable?.dispose?.();resultTable?.dispose?.();segmentTable?.dispose?.();workbench?.dispose?.();}};
  });
})();
