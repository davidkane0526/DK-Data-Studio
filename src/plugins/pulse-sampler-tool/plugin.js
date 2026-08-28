(() => {
  const manifest={
    id:'com.dkds.tools.pulse-sampler',name:'脉冲与采样处理',version:'1.4.1',apiVersion:'1.18.0',pluginType:'tool',
    requiresCore:['events','status','state','project','workspace','data.sources','data.artifacts','data.model','ui.dom','ui.workspace','ui.scientific-plot','ui.series','ui.table','ui.actions','ui.activities','ui.top-workspace','ui.pages'],
    capabilities:['ui.page','ui.top-workspace','ui.plugin-workspace','ui.scientific-plot','ui.table','data.scoped-sources'],
    workspace:{role:'top',activity:'pulse-sampler-tool',icon:'⌁',title:'脉冲与采样处理'},
    window:{activity:'pulse-sampler-tool',title:'脉冲与采样处理',width:1320,height:860,minWidth:960,minHeight:640,dependencies:['scientific-renderer','data-model'],prewarm:false,reuse:true,persistence:'project',artifactHydration:'live'},
    data:{accepts:['data.table','science.transport.iv','science.transport.transfer']},compatibility:{app:'>=3.62.0 <4.0.0',pluginApi:'^1.18.0'}
  };
  DKDSPlugins.define(manifest,async ctx=>{
    const CHANNELS=['Vd','Vs','Vg'],EPS=1e-10;
    const finite=v=>Number.isFinite(Number(v));
    const num=(v,f=0)=>finite(v)?Number(v):f;
    const round=(v,d=9)=>Number(Number(v).toFixed(d));
    const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
    const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const defaultParams=()=>({voltageMax:4,voltageStep:.5,voltageRead:0,pulseTime:.05,readTime:.05,timeShift:0,cycle:1,ratio:1});
    const initial=()=>({schema:2,activeChannel:'Vg',channels:Object.fromEntries(CHANNELS.map(id=>[id,{params:defaultParams(),segments:[],preview:null}])),analysis:{sourceId:'',timeKey:'',currentKey:'',channel:'Vg',trimFraction:.18},result:[]});
    const state=ctx.state.create(initial());
    ctx.project.registerSlice('workspace',{serialize:()=>clone(state.get()),restore:value=>{if(!value||typeof value!=='object')return;const base=initial(),channels={...base.channels};for(const id of CHANNELS){const row=value.channels?.[id]||{};channels[id]={params:{...base.channels[id].params,...(row.params||{})},segments:Array.isArray(row.segments)?clone(row.segments):[],preview:row.preview&&Array.isArray(row.preview.time)?clone(row.preview):null};}state.set({...base,...value,channels,analysis:{...base.analysis,...(value.analysis||{})},result:Array.isArray(value.result)?clone(value.result):[]});},reset:()=>state.set(initial())});

    function validParams(p){
      for(const key of ['voltageMax','voltageStep','voltageRead','pulseTime','readTime','timeShift','cycle','ratio'])if(!finite(p[key]))throw new Error(`参数 ${key} 必须是数字。`);
      if(p.pulseTime<0||p.readTime<0||p.pulseTime+p.readTime<=0)throw new Error('读取时间/脉冲时间无效。');
      if(Math.abs(p.voltageStep)<EPS)throw new Error('电压步长不能为 0。');
      if(![.25,.5].includes(p.cycle)&&(!Number.isInteger(p.cycle)||p.cycle<1))throw new Error('周期只能为 0.25、0.5 或 ≥1 的整数。');
      if(Math.abs(p.ratio)<EPS)throw new Error('拉伸系数不能为 0。');
    }
    function ramp(from,to,step){const out=[from],dir=Math.sign(to-from)||1,delta=Math.abs(step)*dir;let v=from,guard=0;while((dir>0?v<to-EPS:v>to+EPS)&&guard++<10000){v+=delta;if(dir>0&&v>to)v=to;if(dir<0&&v<to)v=to;out.push(round(v));}return out;}
    function scanLevels(p){
      const read=p.voltageRead,max=p.voltageMax,step=Math.abs(p.voltageStep);
      if(Math.abs(p.voltageStep)>=Math.max(1,Math.abs(max-read))&&Number.isInteger(Math.abs(p.voltageStep))){const count=Math.max(1,Math.trunc(Math.abs(p.voltageStep)*p.cycle));return Array.from({length:count},()=>max);}
      const quarter=ramp(max,read,step),half=quarter.concat(quarter.slice(0,-1).reverse());
      if(p.cycle===.25)return quarter;
      if(p.cycle===.5)return half;
      const opposite=half.map(v=>round(2*read-v));
      const cycle=half.concat(opposite.slice(1));let out=[];for(let i=0;i<p.cycle;i++)out=out.concat(i?cycle.slice(1):cycle);return out;
    }
    function generate(raw){
      const p={};for(const key of Object.keys(defaultParams()))p[key]=num(raw[key]);validParams(p);
      const pulseLevels=scanLevels(p),time=[],voltage=[];let t=p.timeShift;
      const push=(dt,v)=>{t=round(t+dt,10);time.push(t);voltage.push(round(v*p.ratio,10));};
      if(p.readTime>0)push(p.readTime,p.voltageRead);
      for(const level of pulseLevels){if(p.pulseTime>0)push(p.pulseTime,level);if(p.readTime>0)push(p.readTime,p.voltageRead);}
      return{time,voltage,params:clone(p)};
    }
    function concatSegments(channel){
      const list=[...(channel.segments||[])];if(channel.preview?.time?.length)list.push(channel.preview);
      let time=[],voltage=[];for(const segment of list){if(!segment?.time?.length)continue;const origin=time.length?time.at(-1):0;const first=segment.time[0]||0;const shifted=segment.time.map(t=>round(t-first+origin,10));if(time.length){time=time.concat(shifted.slice(1));voltage=voltage.concat(segment.voltage.slice(1));}else{time=shifted;voltage=segment.voltage.slice();}}return{time,voltage};
    }
    function valueAt(series,t){const time=series.time||[],values=series.voltage||[];if(!time.length)return 0;let i=0;while(i+1<time.length&&time[i+1]<=t+EPS)i++;return values[i]??0;}
    function mergedRows(){const data=Object.fromEntries(CHANNELS.map(id=>[id,concatSegments(state.get().channels[id])]));const stamps=[...new Set(CHANNELS.flatMap(id=>data[id].time||[]).map(t=>round(t,10)))].sort((a,b)=>a-b);return stamps.map(time=>({time,...Object.fromEntries(CHANNELS.map(id=>[id,valueAt(data[id],time)]))}));}
    function curveFor(id){const series=concatSegments(state.get().channels[id]);const reg=ctx.ui.series.register({id:`pulse.${id}`,label:id,group:'pulse.channels'});return{id:`pulse.${id}`,label:id,legendLabel:id,color:reg.color,points:series.time.map((x,i)=>({x,y:series.voltage[i]})),source:{channel:id}};}

    function dataTable(artifact){return artifact?.kind==='data.table'?artifact:null;}
    function sourceRows(){const rows=ctx.data.sources.list();return Array.isArray(rows)?rows.filter(x=>!x?.excluded):[];}
    function sourceArtifact(){const id=state.get().analysis.sourceId;const descriptor=sourceRows().find(x=>String(x.id||x.artifactId)===String(id));return descriptor?ctx.data.artifacts.get(descriptor.artifactId):null;}
    function tableColumns(){return dataTable(sourceArtifact())?.columns||[];}
    function sample(){
      const a=state.get().analysis,artifact=dataTable(sourceArtifact());if(!artifact)throw new Error('请选择工程数据源。');
      const tcol=artifact.columns?.find(c=>c.key===a.timeKey),icol=artifact.columns?.find(c=>c.key===a.currentKey);if(!tcol||!icol)throw new Error('请选择时间列和电流列。');
      const wave=concatSegments(state.get().channels[a.channel]),rows=[];if(wave.time.length<2)throw new Error('所选通道还没有可采样的脉冲波形。');
      const source=[];for(let i=0;i<Math.min(tcol.values?.length||0,icol.values?.length||0);i++){const t=num(tcol.values[i],NaN),current=num(icol.values[i],NaN);if(finite(t)&&finite(current))source.push({t,current});}
      const trim=Math.max(0,Math.min(.45,num(a.trimFraction,.18)));
      for(let i=0;i<wave.time.length-1;i++){const start=wave.time[i],end=wave.time[i+1];if(end<=start)continue;const left=start+(end-start)*trim,right=end-(end-start)*trim,values=source.filter(r=>r.t>=left&&r.t<=right).map(r=>r.current);const voltage=wave.voltage[i],read=Math.abs(voltage-num(state.get().channels[a.channel].params.voltageRead)*num(state.get().channels[a.channel].params.ratio,1))<1e-8;rows.push({index:rows.length+1,start,end,voltage,kind:read?'read':'pulse',current:values.length?values.reduce((x,y)=>x+y,0)/values.length:NaN,n:values.length});}
      state.patch({result:rows});ctx.project.capture();renderAll('sample');ctx.status.set(`稳态采样完成：${rows.length} 个区间。`);return rows;
    }

    let root,workbench,left,main,wavePlot,resultPlot,waveTable,resultTable,controls={};
    function readParams(){const p={};for(const key of Object.keys(defaultParams()))p[key]=num(controls[key]?.value);return p;}
    function syncParams(){const s=state.get(),id=s.activeChannel,next=clone(s.channels);next[id].params=readParams();state.patch({channels:next});}
    function generateActive(){try{syncParams();const s=state.get(),id=s.activeChannel,next=clone(s.channels);next[id].preview=generate(next[id].params);state.patch({channels:next,result:[]});ctx.project.capture();renderAll('generate');ctx.status.set(`${id} 已生成 ${next[id].preview.time.length} 个边界点。`);}catch(err){ctx.status.set(err.message||String(err));}}
    function addSegment(){const s=state.get(),id=s.activeChannel,next=clone(s.channels),row=next[id];if(!row.preview?.time?.length){ctx.status.set('请先生成当前脉冲片段。');return;}row.segments.push(row.preview);row.preview=null;state.patch({channels:next,result:[]});ctx.project.capture();renderAll('add-segment');}
    function clearActive(){const s=state.get(),id=s.activeChannel,next=clone(s.channels);next[id].segments=[];next[id].preview=null;state.patch({channels:next,result:[]});ctx.project.capture();renderAll('clear');}
    function setActive(id){if(!CHANNELS.includes(id))return;syncParams();state.patch({activeChannel:id,result:[]});renderAll('channel');}
    function renderParams(){const s=state.get(),p=s.channels[s.activeChannel].params;for(const key of Object.keys(defaultParams()))if(controls[key])controls[key].value=String(p[key]);for(const id of CHANNELS)controls[`tab${id}`]?.classList.toggle('active',id===s.activeChannel);const meta=root?.querySelector('[data-ps="channel-meta"]');if(meta){const ch=s.channels[s.activeChannel],wave=concatSegments(ch);meta.textContent=`${s.activeChannel} · ${ch.segments.length} 个片段 · ${wave.time.length} 个边界点`;}}
    function renderSources(){const a=state.get().analysis,src=controls.source,rows=sourceRows();src.innerHTML='<option value="">选择工程数据</option>'+rows.map(r=>`<option value="${esc(r.id||r.artifactId)}">${esc(r.name||r.sourceName||r.path||r.artifactId)}</option>`).join('');src.value=a.sourceId||'';const cols=tableColumns(),options='<option value="">选择列</option>'+cols.map(c=>`<option value="${esc(c.key)}">${esc(c.label||c.name||c.key)}</option>`).join('');controls.timeKey.innerHTML=options;controls.currentKey.innerHTML=options;controls.timeKey.value=a.timeKey||'';controls.currentKey.value=a.currentKey||'';controls.sampleChannel.value=a.channel||'Vg';controls.trimFraction.value=String(a.trimFraction??.18);}
    function renderTables(){const rows=mergedRows();waveTable?.setData([{key:'time',label:'Time / s'},...CHANNELS.map(key=>({key,label:`${key} / V`}))],rows);const result=state.get().result||[];resultTable?.setData([{key:'index',label:'#'},{key:'kind',label:'类型'},{key:'voltage',label:'电压 / V'},{key:'start',label:'开始 / s'},{key:'end',label:'结束 / s'},{key:'current',label:'平均电流 / A'},{key:'n',label:'N'}],result);}
    function resultCurves(){const rows=(state.get().result||[]).filter(r=>finite(r.current)),out=[];for(const kind of ['read','pulse']){const subset=rows.filter(r=>r.kind===kind);if(!subset.length)continue;const reg=ctx.ui.series.register({id:`pulse.sample.${kind}`,label:kind==='read'?'读取电流':'脉冲电流',group:'pulse.samples'});out.push({id:`sample.${kind}`,label:reg.label,color:reg.color,points:subset.map((r,i)=>({x:i+1,y:r.current}))});}return out;}
    function renderAll(reason='render'){if(!root)return;renderParams();renderSources();renderTables();wavePlot?.requestRender?.(reason);resultPlot?.requestRender?.(reason);}

    ctx.ui.activities.add({id:'pulse-sampler-tool',label:'脉冲与采样处理',contextLabel:'脉冲与采样处理',icon:'⌁',order:70,primary:true,openMode:'window',artifactHydration:'live',description:'三路脉冲设计与稳态采样',onActivate:()=>{ctx.workspace.openPage('pulseSamplerToolPage');renderAll('activate');}});
    const page=ctx.ui.pages.add({id:'pulse-sampler-tool-page',pageId:'pulseSamplerToolPage',label:'脉冲与采样处理',title:'脉冲与采样处理',order:70,toolbar:false,activity:'pulse-sampler-tool',className:'pulse-sampler-tool-page',html:'<div class="analysis-page-header"><div><h2>脉冲与采样处理</h2><div class="analysis-subtitle">Vd / Vs / Vg 三路波形 · 片段拼接 · 稳态采样</div></div><div class="dkds-plugin-header-actions" data-ps="header-actions"></div><button type="button" class="analysis-page-close">关闭窗口</button></div><div class="analysis-page-body pulse-sampler-page-body"><div class="pulse-sampler-root" data-ps="root"></div></div>'});
    const host=ctx.ui.dom.query('[data-ps="root"]',page);workbench=ctx.ui.workspaceSurface.create(host,{header:false,activity:'pulse-sampler-tool',primaryScroll:'safe',canvasLeftWidth:310});
    left=ctx.ui.dom.create('div',{className:'ps-sidebar'});main=ctx.ui.dom.create('div',{className:'ps-main'});
    left.innerHTML=`<section class="ps-card dkds-surface"><h3>通道</h3><div class="ps-channel-tabs dkds-toolbar">${CHANNELS.map(id=>`<button type="button" data-ps-tab="${id}">${id}</button>`).join('')}</div><p class="ps-meta dkds-note" data-ps="channel-meta"></p></section><section class="ps-card dkds-surface"><h3>脉冲参数</h3>${[['voltageMax','脉冲上限 / V'],['voltageStep','步长 / V'],['voltageRead','读取电压 / V'],['pulseTime','脉冲时间 / s'],['readTime','读取时间 / s'],['timeShift','时间偏移 / s'],['cycle','周期'],['ratio','拉伸系数']].map(([key,label])=>`<div class="ps-field dkds-field"><label>${label}</label><input data-ps="${key}" type="number" step="any"></div>`).join('')}<div class="ps-actions"><button type="button" class="primary" data-ps="generate">生成</button><button type="button" data-ps="add">加入片段</button><button type="button" data-ps="clear">清空通道</button></div></section><section class="ps-card dkds-surface"><h3>稳态采样</h3><div class="ps-field dkds-field"><label>工程数据</label><select data-ps="source"></select></div><div class="ps-source-row"><div class="ps-field dkds-field"><label>时间列</label><select data-ps="timeKey"></select></div><div class="ps-field dkds-field"><label>电流列</label><select data-ps="currentKey"></select></div></div><div class="ps-source-row"><div class="ps-field dkds-field"><label>采样通道</label><select data-ps="sampleChannel">${CHANNELS.map(id=>`<option>${id}</option>`).join('')}</select></div><div class="ps-field dkds-field"><label>边缘剔除比例</label><input data-ps="trimFraction" type="number" min="0" max="0.45" step="0.01"></div></div><button type="button" class="primary" data-ps="sample">执行稳态采样</button></section>`;
    main.innerHTML='<section class="ps-wave-card dkds-surface"><div class="ps-card-head dkds-surface-header"><strong>三路合并波形</strong><span class="dkds-note">颜色由 Core Series Registry 分配</span></div><div class="ps-wave-grid"><div class="ps-wave-plot" data-ps="wave-plot"></div><div class="ps-wave-table" data-ps="wave-table"></div></div></section><section class="ps-result-card dkds-surface"><div class="ps-card-head dkds-surface-header"><strong>采样结果</strong><span class="dkds-note">读取 / 脉冲区间稳态均值</span></div><div class="ps-result-grid"><div class="ps-result-plot" data-ps="result-plot"></div><div class="ps-result-table" data-ps="result-table"></div></div></section>';
    workbench.mountPrimary({id:'pulse-sampler-main',label:'脉冲与采样',scroll:'safe',leftNode:left,mainNode:main});root=workbench.shell||host;
    for(const id of CHANNELS)controls[`tab${id}`]=left.querySelector(`[data-ps-tab="${id}"]`);for(const key of Object.keys(defaultParams()))controls[key]=left.querySelector(`[data-ps="${key}"]`);for(const key of ['source','timeKey','currentKey','sampleChannel','trimFraction'])controls[key]=left.querySelector(`[data-ps="${key}"]`);
    waveTable=ctx.ui.tables.mount('pulse-sampler-wave-table',main.querySelector('[data-ps="wave-table"]'),{appearance:{density:'compact',stripe:'subtle'}});resultTable=ctx.ui.tables.mount('pulse-sampler-result-table',main.querySelector('[data-ps="result-table"]'),{appearance:{density:'compact',stripe:'subtle'}});
    wavePlot=ctx.ui.scientificPlot.create(main.querySelector('[data-ps="wave-plot"]'),{xTitle:'Time (s)',yTitle:'Voltage (V)',navigationTools:true,source:'pulse-sampler-wave',getCurves:()=>CHANNELS.map(curveFor),getMarkers:()=>[]});
    resultPlot=ctx.ui.scientificPlot.create(main.querySelector('[data-ps="result-plot"]'),{xTitle:'Sample index',yTitle:'Current (A)',navigationTools:true,source:'pulse-sampler-result',getCurves:resultCurves,getMarkers:()=>[]});
    for(const id of CHANNELS)controls[`tab${id}`].addEventListener('click',()=>setActive(id));left.querySelector('[data-ps="generate"]').addEventListener('click',generateActive);left.querySelector('[data-ps="add"]').addEventListener('click',addSegment);left.querySelector('[data-ps="clear"]').addEventListener('click',clearActive);left.querySelector('[data-ps="sample"]').addEventListener('click',()=>{try{state.patch({analysis:{...state.get().analysis,sourceId:controls.source.value,timeKey:controls.timeKey.value,currentKey:controls.currentKey.value,channel:controls.sampleChannel.value,trimFraction:num(controls.trimFraction.value,.18)}});sample();}catch(err){ctx.status.set(err.message||String(err));}});
    controls.source.addEventListener('change',()=>{state.patch({analysis:{...state.get().analysis,sourceId:controls.source.value,timeKey:'',currentKey:''},result:[]});renderAll('source');});for(const key of ['timeKey','currentKey','sampleChannel','trimFraction'])controls[key].addEventListener('change',()=>state.patch({analysis:{...state.get().analysis,[key]:key==='trimFraction'?num(controls[key].value,.18):controls[key].value}}));
    ctx.ui.actions.mount(ctx.ui.dom.query('[data-ps="header-actions"]',page),{activity:'pulse-sampler-tool',actions:[{id:'fit',icon:'⌂',label:'适应波形',order:10,onInvoke:()=>wavePlot?.fitToData?.({source:'pulse-sampler'})}]});
    ctx.ui.topWorkspace.register({id:'pulse-sampler-tool',activity:'pulse-sampler-tool',label:'脉冲与采样处理',icon:'⌁',layout:{mode:'native',root:{selector:'#pulseSamplerToolPage .dkds-plugin-workspace'},primary:{id:'pulse-sampler-main',role:'analysis-primary'},prime:[],sub:[]}});
    const off=ctx.events.on('data:artifacts-changed',()=>renderAll('artifacts'));renderAll('initial');
    return{deactivate(){off?.();workbench?.dispose?.();wavePlot?.dispose?.();resultPlot?.dispose?.();waveTable?.dispose?.();resultTable?.dispose?.();}};
  });
})();
