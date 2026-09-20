(() => {
  const manifest={"id":"com.dkds.tools.pulse-sampler","name":"脉冲与采样处理","version":"1.9.31","apiVersion":"1.19.0","entry":"plugin.js","scripts":["live-domain.js","domain-adapter.js","unit-presentation.js","plugin.js"],"styles":[],"enabled":true,"order":360,"description":"三路 Vd/Vs/Vg 脉冲序列生成、拼接、预览，以及按脉冲时间轴对工程测量数据进行分段稳态平均和读写电流提取。","pluginType":"tool","requiresCore":["runtime","events","status","services","modules","project","io","workspace","data.sources","data.artifacts","data.model","ui.dom","ui.workspace","ui.scientific-plot","ui.series","ui.table","ui.activities","ui.top-workspace","ui.pages","execution.tasks","ui.unit-templates"],"capabilities":["ui.page","ui.top-workspace","ui.plugin-workspace","ui.scientific-plot","ui.table","data.scoped-sources","ui.unit-templates"],"workspace":{"role":"top","activity":"pulse-sampler-tool","icon":"⌁","title":"脉冲与采样处理"},"window":{"activity":"pulse-sampler-tool","title":"脉冲与采样处理","width":1320,"height":860,"minWidth":960,"minHeight":640,"dependencies":["scientific-renderer"],"prewarm":false,"reuse":true,"persistence":"project","artifactHydration":"live"},"data":{"accepts":["data.table","science.transport.iv","science.transport.transfer"]},"platformPresentation":{"desktop":{"mode":"shared"},"mobile":{"mode":"adaptive"}},"tasks":[{"id":"extract-steady-state","entry":"steady-state-task.js"}]};

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


  function initialState(){
    const channels={};for(const c of CHANNELS)channels[c]={segments:[],preview:null,params:clone(DEFAULT_PARAMS)};
    return {activeChannel:'Vd',channels,analysis:{sourceId:'',timeKey:'',currentKey:'',trimLeft:'',trimRight:'',xMode:'readVoltage',yMode:'readCurrent'},result:null};
  }

  DKDSPlugins.define(manifest, async ctx => {
    const LiveDomain=ctx.modules.require('live-domain');
    let liveDomain=null;
    let model=initialState();
    let workbench=null,waveSurface=null,resultSurface=null,waveTable=null,resultTable=null,segmentTable=null,presentation=null;
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
        if(mounted) renderAll();liveDomain?.notify?.('project-restore');
      }},
      reset:()=>{model=initialState();if(mounted)renderAll();liveDomain?.notify?.('project-reset');}
    });

    const channelFinal=c=>concatSegments(model.channels[c].segments,model.channels[c].preview);
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

    function setChannel(payload={}){
      const next=String(payload?.value||payload?.channel||payload||'');
      if(!CHANNELS.includes(next))return model.activeChannel;
      if(payload?.currentParameters&&typeof payload.currentParameters==='object'){
        const current=model.channels[model.activeChannel].params;
        model.channels[model.activeChannel].params={...current,...payload.currentParameters};
      }
      model.activeChannel=next;model.result=null;
      if(mounted){writeParamsToUI(model.channels[next].params);renderAll();}
      return next;
    }
    function setParameters(payload={}){
      const channel=CHANNELS.includes(String(payload?.channel||''))?String(payload.channel):model.activeChannel;
      const patch=payload?.value&&typeof payload.value==='object'?payload.value:(payload?.parameters&&typeof payload.parameters==='object'?payload.parameters:payload);
      const current=model.channels[channel].params,next={...current};
      for(const key of Object.keys(DEFAULT_PARAMS))if(patch&&Object.prototype.hasOwnProperty.call(patch,key))next[key]=num(patch[key],current[key]);
      model.channels[channel].params=next;
      if(mounted&&channel===model.activeChannel)writeParamsToUI(next);
      return clone(next);
    }
    function generate(payload={}){
      const channel=CHANNELS.includes(String(payload?.channel||''))?String(payload.channel):model.activeChannel;
      try{
        const current=model.channels[channel].params;
        const raw=payload?.parameters&&typeof payload.parameters==='object'?{...current,...payload.parameters}:(mounted&&channel===model.activeChannel?readParamsFromUI():current);
        const out=pulseGenerator(raw);model.channels[channel].params=clone(out.params);model.channels[channel].preview=out;
        model.result=null;if(mounted)renderAll();setStatus(`${channel} 已生成 ${out.time.length} 个脉冲边界点。`);return clone(out);
      }catch(err){setStatus(err.message||String(err));throw err;}
    }
    function addSegment(payload={}){
      const channel=CHANNELS.includes(String(payload?.channel||''))?String(payload.channel):model.activeChannel;
      const ch=model.channels[channel];
      if(!ch.preview){setStatus('请先生成当前脉冲片段。');return false;}
      ch.segments.push(clone(ch.preview));ch.preview=null;model.result=null;if(mounted)renderAll();setStatus(`${channel} 已加入第 ${ch.segments.length} 个片段。`);return true;
    }
    function clearChannel(payload={}){
      const channel=CHANNELS.includes(String(payload?.channel||''))?String(payload.channel):model.activeChannel;
      const ch=model.channels[channel];ch.segments=[];ch.preview=null;model.result=null;if(mounted)renderAll();setStatus(`${channel} 已清空。`);return true;
    }
    function removeSegment(payload={}){
      const channel=CHANNELS.includes(String(payload?.channel||''))?String(payload.channel):model.activeChannel;
      const index=Number.isFinite(Number(payload?.index))?Number(payload.index):Number(payload);
      const ch=model.channels[channel];if(index<0||index>=ch.segments.length)return false;ch.segments.splice(index,1);model.result=null;if(mounted)renderAll();setStatus(`已删除 ${channel} 第 ${index+1} 个片段。`);return true;
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
      const sources=ctx.data.sources.list();
      const old=model.analysis.sourceId;
      if(sources.length){
        model.analysis.sourceId=sources.some(row=>row.artifactId===old)?old:sources[0].artifactId;
        refreshColumns(false);
      }else{
        model.analysis.sourceId='';model.analysis.timeKey='';model.analysis.currentKey='';
      }
      if(mounted)renderAll();
    }

    function refreshColumns(shouldRender=true){
      const {src,rows}=sourceRows();
      if(src&&rows.length){
        const keys=Object.keys(rows[0]||{});
        model.analysis.timeKey=model.analysis.timeKey&&keys.includes(model.analysis.timeKey)?model.analysis.timeKey:chooseLikely(keys,['time','时间','t']);
        model.analysis.currentKey=model.analysis.currentKey&&keys.includes(model.analysis.currentKey)?model.analysis.currentKey:chooseLikely(keys,['current','电流','id','ids','i'],keys[1]||keys[0]);
      }
      if(shouldRender&&mounted)renderAll();
    }

    function setAnalysis(payload={}){
      const patch=payload?.value&&typeof payload.value==='object'?payload.value:payload;
      if(!patch||typeof patch!=='object')return clone(model.analysis);
      const allowed=['sourceId','timeKey','currentKey','trimLeft','trimRight','xMode','yMode'];
      const previousSource=model.analysis.sourceId;
      for(const key of allowed)if(Object.prototype.hasOwnProperty.call(patch,key))model.analysis[key]=patch[key]??'';
      if(Object.prototype.hasOwnProperty.call(patch,'sourceId')&&String(previousSource)!==String(model.analysis.sourceId))model.result=null;
      if(mounted){
        if(Object.prototype.hasOwnProperty.call(patch,'sourceId'))refreshSources();
        else renderAll();
      }
      return clone(model.analysis);
    }

    function sourcePresentation(){
      const {sources,src,rows}=sourceRows();
      const keys=rows.length?Object.keys(rows[0]||{}):[];
      const timeKey=model.analysis.timeKey&&keys.includes(model.analysis.timeKey)?model.analysis.timeKey:chooseLikely(keys,['time','时间','t']);
      const currentKey=model.analysis.currentKey&&keys.includes(model.analysis.currentKey)?model.analysis.currentKey:chooseLikely(keys,['current','电流','id','ids','i'],keys[1]||keys[0]);
      const dt=timeKey?inferSampleStep(rows.map(row=>Number(row[timeKey])).filter(Number.isFinite)):NaN;
      const label=src?(src.name||src.sourceName||src.path||src.artifactId):'';
      return {
        options:(sources||[]).map(row=>({id:String(row.artifactId||''),label:String(row.name||row.sourceName||row.path||row.artifactId||'')})),
        activeId:String(src?.artifactId||''),columns:keys.map(String),timeKey:String(timeKey||''),currentKey:String(currentKey||''),rowCount:rows.length,
        meta:src?`${label||'数据表'} · ${rows.length} 行${Number.isFinite(dt)?` · 采样间隔≈${round(dt,8)} s`:''}`:'尚未分配工程数据。'
      };
    }

    function segmentRowsFor(channel=model.activeChannel){
      const ch=model.channels[channel]||model.channels[model.activeChannel];
      return (ch?.segments||[]).map((seg,index)=>({index:index+1,voltageMax:seg.params?.voltageMax,step:seg.params?.voltageStep,read:seg.params?.voltageRead,pulseTime:seg.params?.pulseTime,readTime:seg.params?.readTime,cycle:seg.params?.cycle,points:seg.time?.length||0}));
    }

    function resultPresentation(){
      const result=model.result;if(!result)return {available:false,meta:'尚未执行提取。',rows:[],x:[],y:[],xLabel:'X',yLabel:'Current'};
      const xy=currentXY();
      return {available:true,channel:String(result.channel||model.activeChannel),sourceId:String(result.sourceId||''),matched:Number(result.matched)||0,totalPulse:Number(result.totalPulse)||0,trimLeft:result.trimLeft,trimRight:result.trimRight,tolerance:result.tolerance,x:xy.x.slice(),y:xy.y.slice(),xLabel:xy.xLabel,yLabel:xy.yLabel,rows:xy.x.map((x,index)=>({index:index+1,x,y:xy.y[index]})),meta:`${result.channel} · 匹配 ${result.matched}/${result.totalPulse} · 自动/实际剔除 ${result.trimLeft}/${result.trimRight} 点 · 容差 ${round(result.tolerance,8)} s`};
    }

    function liveSnapshot(){
      const active=model.activeChannel,ch=model.channels[active],final=channelFinal(active),channelData=allChannelData(),merged=mergeChannels(channelData),source=sourcePresentation(),result=resultPresentation();
      return {schema:1,activeChannel:active,channels:Object.fromEntries(CHANNELS.map(channel=>[channel,{params:clone(model.channels[channel].params),segments:segmentRowsFor(channel),segmentCount:model.channels[channel].segments.length,hasPreview:!!model.channels[channel].preview,boundaryPoints:channelFinal(channel).time.length}])),active:{channel:active,params:clone(ch.params),segments:segmentRowsFor(active),segmentCount:ch.segments.length,hasPreview:!!ch.preview,boundaryPoints:final.time.length},waveform:{totalRows:merged.length,rows:clone(merged.slice(0,5000)),curves:CHANNELS.map(channel=>({id:`pulse-sampler-${channel.toLowerCase()}`,label:channel,points:stepPoints(channelData[channel].time,channelData[channel].voltage)})).filter(row=>row.points.length)},source,analysis:{...clone(model.analysis),sourceId:source.activeId,timeKey:source.timeKey,currentKey:source.currentKey},result};
    }

    async function runExtraction(payload={}){
      try{
        if(payload?.analysis&&typeof payload.analysis==='object')model.analysis={...model.analysis,...payload.analysis};
        else if(mounted)model.analysis={...model.analysis,timeKey:el.timeColumn.value,currentKey:el.currentColumn.value,trimLeft:el.trimLeft.value,trimRight:el.trimRight.value};
        const {src,rows}=sourceRows();if(!src||!rows.length)throw new Error('请先导入并分配一份测量数据。');
        const times=[],curr=[];
        for(const r of rows){const t=Number(r[model.analysis.timeKey]),i=Number(r[model.analysis.currentKey]);if(Number.isFinite(t)&&Number.isFinite(i)){times.push(t);curr.push(i);}}
        const pulse=channelFinal(model.activeChannel);
        if(!ctx.tasks?.submit)throw new Error('Core Task Runner 不可用。');
        setStatus(`正在后台提取 ${times.length} 个采样点…`);
        const job=ctx.tasks.submit('extract-steady-state',{dataTimes:times,dataCurrent:curr,pulseTime:pulse.time,pulseVoltage:pulse.voltage,trimLeftRaw:model.analysis.trimLeft,trimRightRaw:model.analysis.trimRight},{key:'steady-state-extraction',latest:true});
        const result=await job.promise;
        model.result={...result,channel:model.activeChannel,sourceId:src.artifactId};if(mounted)renderAll();
        setStatus(`提取完成：匹配 ${result.matched}/${result.totalPulse} 个脉冲边界，得到 ${result.readCurrent.length} 个读取点和 ${result.pulseCurrent.length} 个脉冲点。`);
      }catch(err){if(err?.name==='AbortError')return;model.result=null;if(mounted)renderAll();setStatus(err.message||String(err));}
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

    function renderAll(){
      if(!mounted)return;
      presentation?.render?.(liveSnapshot());
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
    async function downloadText(name,text){
      if(!text){setStatus('当前没有可导出的数据。');return false;}
      const ok=await ctx.io.saveText({defaultName:name,content:text,filters:[{name:'CSV',extensions:['csv']}],source:`plugin:${manifest.id}:csv-export`});
      if(ok)setStatus(`已导出 ${name}。`);return !!ok;
    }
    async function copyResult(){
      if(resultTable){const ok=await resultTable.copyVisibleTable({includeHeader:true});setStatus(ok?'结果表已复制。':'复制结果表失败。');return !!ok;}
      const result=resultPresentation();if(!result.available){setStatus('当前没有结果表。');return false;}
      const lines=[[ '#',result.xLabel,result.yLabel ].join('\t'),...result.rows.map(row=>[row.index,row.x,row.y].join('\t'))];
      const ok=await ctx.io.clipboard.writeText(lines.join('\n'));setStatus(ok===false?'复制结果表失败。':'结果表已复制。');return ok!==false;
    }

    liveDomain=LiveDomain.create({
      snapshot:liveSnapshot,
      actions:{
        setChannel,setParameters,generate,addSegment,clearChannel,removeSegment,setAnalysis,extract:runExtraction,
        exportWave:()=>downloadText('pulse-waveform.csv',csvFromMerged()),copyResult,exportResult:()=>downloadText('pulse-sampling-result.csv',csvFromResult())
      }
    });
    if(!ctx.runtime.isAuxiliaryWindow)ctx.modules.require('domain-adapter')?.provide?.(ctx,liveDomain);

    ctx.ui.activities.add({
      id:'pulse-sampler-tool',label:'脉冲与采样处理',contextLabel:'Pulse & Sampling',icon:'⌁',order:360,primary:true,openMode:'window',artifactHydration:'live',
      description:'生成并组合 Vd/Vs/Vg 脉冲，按时间轴提取稳态读写电流。',onActivate:()=>{ctx.workspace.openPage('pulseSamplerToolPage');refreshSources();}
    });

    const page=ctx.ui.pages.add({id:'pulse-sampler-tool-page',pageId:'pulseSamplerToolPage',activity:'pulse-sampler-tool',label:'脉冲与采样处理',title:'脉冲与采样处理',toolbar:false,html:''});
    const UnitPresentation=ctx.modules.require('unit-presentation');
    presentation=UnitPresentation.mount(ctx,page,{actions:liveDomain.actions,snapshot:liveSnapshot});
    workbench=presentation.workbench;waveSurface=presentation.waveSurface;resultSurface=presentation.resultSurface;waveTable=presentation.waveTable;resultTable=presentation.resultTable;segmentTable=presentation.segmentTable;
    Object.assign(el,presentation.controls||{});
    mounted=true;
    // Preserve the production owner behavior that selects the first available scoped source/columns.
    refreshSources();
    renderAll();

    ctx.ui.topWorkspace.register({id:'pulse-sampler-tool',activity:'pulse-sampler-tool',label:'脉冲与采样处理',icon:'⌁',layout:{mode:'native',root:{selector:'#pulseSamplerToolPage .dkds-plugin-workspace'},primary:{id:'main',role:'analysis-primary',presentationRole:'utility-primary',priority:100,collapsible:false},prime:[{id:'parameters',label:'参数',semanticKind:'panel',presentationPurpose:'parameters',presentationRole:'data-control',priority:96,collapsible:true}],sub:[]}});
    const off=ctx.events.on('data:artifacts-changed',event=>{refreshSources();liveDomain?.notify?.('data:artifacts-changed',event);});
    return{deactivate(){off?.();mounted=false;presentation?.dispose?.();presentation=null;waveSurface=resultSurface=waveTable=resultTable=segmentTable=workbench=null;}};
  });
})();
