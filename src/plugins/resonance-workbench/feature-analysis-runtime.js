(() => {
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,dom,charts,artifacts,performance,S,D}=services;
    const {
      sweepById,peakMetrics,category,visibleSweepIds,peakLabel,scientificReact,peakById,publishPeakSelection
    }=actions;
    const {esc,fmt,csvCell,finite,directionName}=utils;
    let spacingResult=[];
    let gateResult=null;
    let gateComputeKey='';
    let physicsCache={key:'',value:null};

    function physicalAnalysis(){
      const peakKey=(live.workspace.peaks||[]).map(p=>`${p.id}:${p.sweepId}:${p.v}:${p.i}:${p.vg}:${p.direction}:${p.peakOrder}:${p.accepted!==false?1:0}:${p.locked?1:0}`).join('|');
      const dataKey=(live.workspace.datasetMeta||[]).map(d=>`${d.path}:${d.vg}`).join('|');
      const key=`${peakKey}##${dataKey}`;
      if(physicsCache.key===key&&physicsCache.value)return physicsCache.value;
      try{
        const value=S.analyzePhysicalFamilies?.({peaks:live.workspace.peaks||[],sweepById,peakMetrics:p=>peakMetrics(p)||{},labelForOrder:o=>category(o).label})||{families:[],modelCode:'M0',modelTitle:'数据不足',modelText:'当前稳定峰轨迹不足。',v0Delta:null};
        physicsCache={key,value};return value;
      }catch(err){console.warn('[resonance physical analysis]',err);const value={families:[],modelCode:'M0',modelTitle:'计算失败',modelText:err.message||String(err),v0Delta:null};physicsCache={key,value};return value;}
    }
    function renderPhysics(){
      const r=physicalAnalysis();
      const summary=$('#reswinPhysicsSummary');if(summary)dom.html(summary,[`模型 ${r.modelCode||'—'}`,`峰族 ${r.families?.length||0}`,`稳定双向 ${(r.families||[]).filter(f=>f.bothStable).length}`].map(t=>`<div>${esc(t)}</div>`).join(''));
      const model=$('#reswinPhysicsModel');if(model)dom.html(model,`<strong>${esc(r.modelTitle||'')}</strong><p>${esc(r.modelText||'')}</p><p>该判断来自当前已采纳峰轨迹的稳定性、正反扫差异与峰宽尺度；它是模型筛选依据，不等同于对微观机制的唯一证明。</p>`);
      const table=$('#reswinPhysicsTable');if(table)dom.html(table,`<thead><tr><th>峰族</th><th>类型</th><th>正扫点</th><th>反扫点</th><th>共同 Vg</th><th>中位 |ΔV|</th><th>中位峰宽</th></tr></thead><tbody>${(r.families||[]).map(f=>`<tr><td>${esc(f.label||`峰${f.order}`)}</td><td>${esc(f.type||f.code||'')}</td><td>${f.forwardCount||0}</td><td>${f.reverseCount||0}</td><td>${f.commonCount||0}</td><td>${fmt(f.medianDelta,5)}</td><td>${fmt(f.medianWidth,5)}</td></tr>`).join('')}</tbody>`);
      const plot=$('#reswinPhysicsPlot');if(plot&&charts){
        const rows=Array.isArray(r.v0Delta)?r.v0Delta:[];
        const traces=rows.length?[{x:rows.map(x=>x.vg),y:rows.map(x=>x.V0),mode:'lines+markers',name:'V0'},{x:rows.map(x=>x.vg),y:rows.map(x=>x.delta),mode:'lines+markers',name:'|δ|',yaxis:'y2'}]:[];
        scientificReact(plot,traces,{margin:{l:64,r:66,t:26,b:54},xaxis:{title:'Vg (V)'},yaxis:{title:'V0 (V)'},yaxis2:{title:'|δ| (V)',overlaying:'y',side:'right',showgrid:false},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});
      }
    }

    function dataSeriesOptions(){
      const visible=new Set(visibleSweepIds().map(String)),seen=new Map();
      for(const p of live.workspace.peaks||[]){
        if(p.accepted===false||!visible.has(String(p.sweepId)))continue;
        const label=peakLabel(p),direction=Number(p.direction),key=`${direction}::${label}`;
        if(!seen.has(key))seen.set(key,{key,direction,label,name:`${directionName(direction)} · ${label}`});
      }
      return [...seen.values()].sort((a,b)=>a.direction-b.direction||a.label.localeCompare(b.label,'zh-CN'));
    }
    function acceptedSeriesOptions(){
      const rows=live.sharedController?.acceptedSeriesOptions?.()||[];
      return rows.length?rows:dataSeriesOptions();
    }
    function chooseRepresentativePeak(list){return list.slice().sort((a,b)=>Number(b.locked)-Number(a.locked)||Number(b.manual)-Number(a.manual)||(Number(b.score)||0)-(Number(a.score)||0))[0]||null;}
    function computeSpacingResult(keyA,keyB){return live.sharedController?.computeSpacingRows?.(keyA,keyB)||[];}
    function populateSpacing(){
      const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=live.workspace.spacingSettings||{};
      if(!valid.has(s.seriesA))s.seriesA=opts[0]?.key||'';
      if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=opts.find(o=>o.key!==s.seriesA)?.key||s.seriesA||'';
      live.workspace.spacingSettings=s;
      const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
      const a=$('#reswinSpacingA'),b=$('#reswinSpacingB');if(a){dom.html(a,markup);a.value=s.seriesA;}if(b){dom.html(b,markup);b.value=s.seriesB;}
      const mode=$('#reswinSpacingMode');if(mode)mode.value=s.mode||'abs';
    }
    function renderSpacing(){
      populateSpacing();const s=live.workspace.spacingSettings;spacingResult=computeSpacingResult(s.seriesA,s.seriesB);
      const plot=$('#reswinSpacingPlot');if(plot&&charts){const key=s.mode==='signed'?'deltaV':'spacing';scientificReact(plot,[{x:spacingResult.map(d=>d.vg),y:spacingResult.map(d=>d[key]),mode:'lines+markers',name:'峰间距',customdata:spacingResult.map(d=>[d.vA,d.vB])}],{margin:{l:68,r:20,t:28,b:56},xaxis:{title:'Vg (V)'},yaxis:{title:s.mode==='signed'?'VB − VA (V)':'|VB − VA| (V)'},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});}
      const table=$('#reswinSpacingTable');if(table)dom.html(table,`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>VB−VA</th><th>|ΔV|</th></tr></thead><tbody>${spacingResult.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.deltaV,6)}</td><td>${fmt(d.spacing,6)}</td></tr>`).join('')}</tbody>`);
    }
    function spacingCsv(){const rows=['Vg_V,series_A,V_A_V,series_B,V_B_V,delta_V_B_minus_A_V,absolute_spacing_V'];for(const d of spacingResult)rows.push([d.vg,csvCell(d.labelA),d.vA,csvCell(d.labelB),d.vB,d.deltaV,d.spacing].join(','));return rows.join('\n');}

    function gateSeriesRows(key){
      const [dirS,label]=String(key||'').split('::'),direction=Number(dirS);if(!label||!Number.isFinite(direction))return [];
      const grouped=new Map();
      for(const p of (live.workspace.peaks||[]).filter(p=>p.accepted!==false&&p.direction===direction&&peakLabel(p)===label)){if(!grouped.has(String(p.vg)))grouped.set(String(p.vg),[]);grouped.get(String(p.vg)).push(p);}
      const rows=[];
      for(const list of grouped.values()){const p=chooseRepresentativePeak(list),sw=sweepById(p?.sweepId);if(!p||!sw)continue;const m=peakMetrics(p)||{},baseline=Number(m.baseline),peakToBg=Number.isFinite(baseline)&&Math.abs(baseline)>Number.EPSILON?Math.abs(Number(p.i))/Math.abs(baseline):NaN;rows.push({vg:p.vg,peak:p,v:p.v,i:p.i,fwhm:m.fwhm,hwhm:Number(m.fwhm)/2,amplitude:m.amplitude,baseline:m.baseline,area:m.area,prominence:Number(p.prominence),peakToBg});}
      return rows.sort((a,b)=>a.vg-b.vg);
    }
    const GATE_FEATURE_METRICS=Object.freeze({
      v:{label:'峰位 V_R',unit:'V',diverging:true},fwhm:{label:'FWHM',unit:'V',diverging:false},amplitude:{label:'峰高',unit:'A',diverging:false},
      prominence:{label:'Prominence',unit:'',diverging:false},area:{label:'峰面积',unit:'A·V',diverging:false},baseline:{label:'局域基线',unit:'A',diverging:true},peakToBg:{label:'峰/背景比',unit:'',diverging:false}
    });
    function gateFeatureDefinition(metric){return GATE_FEATURE_METRICS[String(metric||'fwhm')]||GATE_FEATURE_METRICS.fwhm;}
    function gateFeatureField(settings=live.workspace.gateAnalysisSettings||{}){
      const metric=GATE_FEATURE_METRICS[settings.featureMetric]?settings.featureMetric:'fwhm',direction=['all','forward','reverse'].includes(String(settings.featureDirection))?String(settings.featureDirection):'all';
      const definition=gateFeatureDefinition(metric),allowed=direction==='forward'?1:(direction==='reverse'?-1:0);
      const options=acceptedSeriesOptions().filter(row=>!allowed||Number(String(row.key||'').split('::')[0])===allowed);
      const series=options.map(option=>({option,rows:gateSeriesRows(option.key)})).filter(row=>row.rows.length);
      const x=[...new Set(series.flatMap(row=>row.rows.map(item=>Number(item.vg))).filter(Number.isFinite))].sort((a,b)=>a-b),y=series.map(row=>row.option.name||row.option.key),seriesKeys=series.map(row=>row.option.key);
      const z=[],cellPeakIds=[];let missing=0;
      for(const row of series){const byVg=new Map(row.rows.map(item=>[String(Number(item.vg)),item]));const zr=[],ids=[];for(const vg of x){const item=byVg.get(String(Number(vg))),value=Number(item?.[metric]);if(Number.isFinite(value)){zr.push(value);ids.push(String(item?.peak?.id||''));}else{zr.push(NaN);ids.push('');missing++;}}z.push(zr);cellPeakIds.push(ids);}
      return {metric,direction,label:definition.label,unit:definition.unit,diverging:definition.diverging,x,y,z,xName:'Vg',yName:'峰族 / 扫描',xUnit:'V',yUnit:'',valueName:definition.label,valueUnit:definition.unit,semanticType:'resonance.feature-field',seriesKeys,cellPeakIds,missing};
    }
    function gateFeatureArtifact(field){
      if(!field||!D?.createMatrix)return null;const sourcePeakIds=[...new Set((field.cellPeakIds||[]).flat().map(String).filter(Boolean))],sourcePeaks=new Set(sourcePeakIds),parents=[...new Set((live.workspace.peaks||[]).filter(p=>sourcePeaks.has(String(p.id))).map(p=>`resonance.peaks:${p.sweepId}`))];
      return D.createMatrix({id:`resonance.feature-field:${field.metric}:${field.direction}`,name:`${field.label} · 跨曲线特征场`,semanticType:'resonance.feature-field',transient:true,x:field.x,y:field.y,z:field.z,xName:'Vg',yName:'峰族 / 扫描',valueName:field.label,xUnit:'V',valueUnit:field.unit,parameters:{metric:field.metric,direction:field.direction},metadata:{metric:field.metric,direction:field.direction,seriesKeys:field.seriesKeys,cellPeakIds:field.cellPeakIds,sourcePeakCount:sourcePeakIds.length,metricAlgorithmRef:live.workspace.activeMetricAlgorithm||'',missing:field.missing},lineage:{parents,role:'analysis',producer:'builtin.resonance-workbench',operation:'project-peak-feature-field',parameters:{metric:field.metric,direction:field.direction,metricAlgorithmRef:live.workspace.activeMetricAlgorithm||''}}});
    }
    function gateFeatureFieldCsv(field=gateResult?.featureField||gateFeatureField()){
      if(!field?.x?.length)return '';const rows=[['series',...field.x.map(v=>`Vg_${v}`)].join(',')];for(let i=0;i<field.y.length;i++)rows.push([csvCell(field.y[i]),...(field.z[i]||[]).map(v=>Number.isFinite(Number(v))?Number(v):'')].join(','));return rows.join('\n');
    }
    function peakFromFeatureFieldPoint(field,event){
      const point=event?.points?.[0];if(!point||!field)return null;let ri=field.y.indexOf(point.y),ci=field.x.findIndex(v=>Number(v)===Number(point.x));if(Array.isArray(point.pointNumber)){ri=Number(point.pointNumber[0]);ci=Number(point.pointNumber[1]);}const id=field.cellPeakIds?.[ri]?.[ci]||'';return id?peakById(id):null;
    }
    function gateHysteresisRows(label){
      if(!label)return [];const up=gateSeriesRows(`1::${label}`),down=gateSeriesRows(`-1::${label}`),u=new Map(up.map(r=>[String(r.vg),r])),d=new Map(down.map(r=>[String(r.vg),r]));
      return [...u.keys()].filter(k=>d.has(k)).map(k=>{const a=u.get(k),b=d.get(k);return {vg:a.vg,forwardV:a.v,reverseV:b.v,deltaVR:a.v-b.v,absDeltaVR:Math.abs(a.v-b.v)};}).sort((a,b)=>a.vg-b.vg);
    }
    function gateLabels(){const labels=[...new Set((live.workspace.peaks||[]).filter(p=>p.accepted!==false).map(peakLabel))];return labels.filter(label=>{const ps=(live.workspace.peaks||[]).filter(p=>p.accepted!==false&&peakLabel(p)===label);return ps.some(p=>p.direction>0)&&ps.some(p=>p.direction<0);});}
    function populateGate(){
      const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=live.workspace.gateAnalysisSettings||{};
      const defaultA=opts[0]?.key||'',defaultB=opts.find(o=>o.key!==defaultA)?.key||defaultA;
      if(!valid.has(s.seriesA))s.seriesA=defaultA;if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=defaultB;
      const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
      for(const [id,value] of [['reswinGateA',s.seriesA],['reswinGateB',s.seriesB]]){const el=$('#'+id);if(el){dom.html(el,markup);el.value=value||'';}}
      const labels=gateLabels();if(!labels.includes(s.hysteresisLabel))s.hysteresisLabel=labels[0]||'';
      const hys=$('#reswinGateHysteresis');if(hys){dom.html(hys,labels.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join(''));hys.value=s.hysteresisLabel||'';}
      const width=$('#reswinGateWidth');if(width)width.value=s.widthMode||'hwhm';
      s.featureMetric=GATE_FEATURE_METRICS[s.featureMetric]?s.featureMetric:'fwhm';s.featureDirection=['all','forward','reverse'].includes(String(s.featureDirection))?String(s.featureDirection):'all';
      const featureMetric=$('#reswinGateFeatureMetric');if(featureMetric)featureMetric.value=s.featureMetric;const featureDirection=$('#reswinGateFeatureDirection');if(featureDirection)featureDirection.value=s.featureDirection;
      const use=$('#reswinGateUseDensity');if(use)use.checked=!!s.useCarrierDensity;
      const cg=$('#reswinGateCg');if(cg)cg.value=finite(s.cg)?s.cg:'';
      const cnp=$('#reswinGateCnp');if(cnp)cnp.value=finite(s.cnp)?s.cnp:0;
      live.workspace.gateAnalysisSettings=s;
    }
    function readGate(){
      const num=id=>{const raw=$('#'+id)?.value?.trim?.()??'';if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null;};
      const previous=live.workspace.gateAnalysisSettings||{};
      live.workspace.gateAnalysisSettings={...previous,seriesA:$('#reswinGateA')?.value||'',seriesB:$('#reswinGateB')?.value||'',hysteresisLabel:$('#reswinGateHysteresis')?.value||'',widthMode:$('#reswinGateWidth')?.value||'hwhm',featureMetric:$('#reswinGateFeatureMetric')?.value||'fwhm',featureDirection:$('#reswinGateFeatureDirection')?.value||'all',useCarrierDensity:!!$('#reswinGateUseDensity')?.checked,cg:num('reswinGateCg'),cnp:num('reswinGateCnp')??0};
    }
    function gateOption(key){return acceptedSeriesOptions().find(o=>o.key===key)||null;}
    function gateTerSettings(){return {vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,...(live.workspace.gateAnalysisSettings?.terSettings||{})};}
    function gateTerAlgorithmRef(){const ref=live.workspace.gateAnalysisSettings?.terAlgorithmRef||{category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'};return typeof ref==='string'?(()=>{const at=ref.lastIndexOf('@');return {category:'ter-analysis',id:at>0?ref.slice(0,at):ref,version:at>0?ref.slice(at+1):''};})():{category:String(ref.category||'ter-analysis'),id:String(ref.id||ref.algorithmId||'ter.high-low-ratio'),version:String(ref.version||ref.algorithmVersion||'1.0.0')};}
    function computeGateTer(settings={}){const ref=gateTerAlgorithmRef(),row=live.algorithmRuntime?.resolve?.(ref,{category:'ter-analysis'});if(row&&live.algorithmRuntime?.run){const value=live.algorithmRuntime.run({id:row.id,version:row.version,category:'ter-analysis'},live.datasets,{category:'ter-analysis',parameters:{settings}});if(value&&typeof value.then==='function')throw new Error(`Gate TER requires a local Algorithm Provider: ${row.id}@${row.version}`);return {...value,algorithm:live.algorithmRuntime.provenance?.({id:row.id,version:row.version,category:'ter-analysis'})||value?.algorithm||null};}return S.computeTerMatrix?.(live.datasets,settings)||null;}
    let installedPipeline=null;
    function installPipeline(){
      const pipeline=live.pipelineRuntime;if(!pipeline?.register||pipeline===installedPipeline)return false;
      pipeline.register('gate-analysis',{
        title:'Gate-dependent resonance analysis',kind:'analysis',inputTypes:['science.transport.iv','data.table'],outputTypes:['resonance.gate-analysis','resonance.feature-field'],allowEmptyInput:true,cacheLimit:6,
        run:(_input,{parameters})=>{
          const s={...(parameters?.settings||live.workspace.gateAnalysisSettings||{})};
          const Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);let terResult=null;
          try{terResult=computeGateTer(parameters?.terSettings||gateTerSettings());}catch{}
          const rows=S.pairGateSeries?.(Arows,Brows,terResult?.terMaxByVg||[],s)||[];
          const hysteresis=gateHysteresisRows(s.hysteresisLabel);
          const summary=S.summarizeGateRows?.(rows,hysteresis)||{fits:{},correlations:{}};const featureField=gateFeatureField(s);
          const value={settings:{...s},seriesA:gateOption(s.seriesA),seriesB:gateOption(s.seriesB),Arows,Brows,rows,hysteresis,terResult,featureField,fits:summary.fits||{},correlations:summary.correlations||{}};
          const artifact=D.createAnalysisResult({id:'resonance.analysis:gate',name:'栅压依赖共振分析',summary:{rows:rows.length,hysteresis:hysteresis.length,hasTer:!!terResult,featureSeries:featureField.y.length},payload:value,transient:true}),featureArtifact=gateFeatureArtifact(featureField);
          return {artifacts:[artifact,...(featureArtifact?[featureArtifact]:[])],value};
        },
        selection:({artifacts,value})=>artifacts[0]?[{type:'resonance.gate-analysis',id:artifacts[0].id,ref:{artifactId:artifacts[0].id},value:{id:artifacts[0].id,rows:value?.rows?.length||0}}]:[],
        project:({value})=>({kind:'series-group',series:{A:value?.Arows||[],B:value?.Brows||[],hysteresis:value?.hysteresis||[],paired:value?.rows||[]}})
      });
      installedPipeline=pipeline;return true;
    }

    function computeGate(){
      installPipeline();readGate();const s=live.workspace.gateAnalysisSettings;
      const peakKey=(live.workspace.peaks||[]).filter(p=>p.accepted!==false).map(p=>[p.id,p.sweepId,p.v,p.i,p.vg,p.direction,p.peakOrder,p.peakLabel,p.analysisLeft,p.analysisRight]).flat().join('|');
      const dataRevision=artifacts?.revision?.('data.table')||0;
      const terSettings=gateTerSettings(),terAlgorithmRef=gateTerAlgorithmRef();
      const key=`${dataRevision}::metric:${live.peakMetricRevision}::${JSON.stringify(s)}::${JSON.stringify(terSettings)}::${JSON.stringify(terAlgorithmRef)}::${peakKey}`;
      const compute=()=>{const Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);let terResult=null;try{terResult=computeGateTer(terSettings);}catch{}const rows=S.pairGateSeries?.(Arows,Brows,terResult?.terMaxByVg||[],s)||[];const hysteresis=gateHysteresisRows(s.hysteresisLabel);const summary=S.summarizeGateRows?.(rows,hysteresis)||{fits:{},correlations:{}};const featureField=gateFeatureField(s);return {settings:{...s},seriesA:gateOption(s.seriesA),seriesB:gateOption(s.seriesB),Arows,Brows,rows,hysteresis,terResult,featureField,fits:summary.fits||{},correlations:summary.correlations||{}};};
      gateComputeKey=key;
      if(live.pipelineRuntime?.runSync){
        const source=(artifacts?.list?.({kind:'data.table',includeTransient:true})||[]).filter(a=>String(a?.semanticType||'')==='science.transport.iv');
        try{
          const executed=live.pipelineRuntime.runSync('gate-analysis',source,{parameters:{settings:{...s},terSettings:{...terSettings},terAlgorithmRef,peakKey,metricRevision:live.peakMetricRevision},publish:true,revision:dataRevision});
          gateResult=executed?.value||compute();
        }catch(err){
          console.warn('[Resonance gate pipeline fallback]',err);
          gateResult=performance?.stage?.('gate-compute',dataRevision,key,compute,{limit:6})||compute();
        }
      }else gateResult=performance?.stage?.('gate-compute',dataRevision,key,compute,{limit:6})||compute();
      return gateResult;
    }
    function gateBase(x,y){return {margin:{l:66,r:26,t:20,b:52},xaxis:{title:x},yaxis:{title:y},legend:{orientation:'h',y:-.2},autosize:true};}
    function renderGate(){
      populateGate();const r=computeGate(),rows=r.rows||[],a=r.seriesA?.name||'ridge A',b=r.seriesB?.name||'ridge B';
      const summary=$('#reswinGateSummary');if(summary)dom.html(summary,[`共同 Vg ${rows.length}`,`A ${a}`,`B ${b}`,`TER ${r.terResult?'可用':'不可用'}`,`特征场 ${(r.featureField?.y||[]).length} 序列`].map(t=>`<span>${esc(t)}</span>`).join(''));
      const plots={
        reswinGateRidges:{traces:[{x:r.Arows.map(d=>d.vg),y:r.Arows.map(d=>d.v),mode:'lines+markers',name:a},{x:r.Brows.map(d=>d.vg),y:r.Brows.map(d=>d.v),mode:'lines+markers',name:b}],layout:gateBase('Vg (V)','V_R (V)')},
        reswinGateV0:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.V0),mode:'lines+markers',name:'V0'}],layout:gateBase('Vg (V)','V0 (V)')},
        reswinGateDelta:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.delta),mode:'lines+markers',name:'δ'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.absDelta),mode:'lines+markers',name:'|δ|',line:{dash:'dot'}}],layout:gateBase('Vg (V)','δ (V)')},
        reswinGateWidthPlot:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d[(r.settings.widthMode||'hwhm')+'A']),mode:'lines+markers',name:'宽度 A'},{x:rows.map(d=>d.vg),y:rows.map(d=>d[(r.settings.widthMode||'hwhm')+'B']),mode:'lines+markers',name:'宽度 B'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.deltaOverW),mode:'lines+markers',name:'|δ|/w',yaxis:'y2'}],layout:{...gateBase('Vg (V)',r.settings.widthMode==='fwhm'?'FWHM (V)':'HWHM (V)'),yaxis2:{title:'|δ|/w',overlaying:'y',side:'right',showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
        reswinGateTer:{traces:[{x:rows.filter(d=>Number.isFinite(d.terMax)).map(d=>d.vg),y:rows.filter(d=>Number.isFinite(d.terMax)).map(d=>d.terMax),mode:'lines+markers',name:'TERmax'}],layout:gateBase('Vg (V)','TERmax (%)')},
        reswinGateVStar:{traces:[{x:rows.filter(d=>Number.isFinite(d.vStar)).map(d=>d.vg),y:rows.filter(d=>Number.isFinite(d.vStar)).map(d=>d.vStar),mode:'lines+markers',name:'Vd*'}],layout:gateBase('Vg (V)','Vd* (V)')},
        reswinGateHysteresisPlot:{traces:[{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.forwardV),mode:'lines+markers',name:'正扫'},{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.reverseV),mode:'lines+markers',name:'反扫'},{x:r.hysteresis.map(d=>d.vg),y:r.hysteresis.map(d=>d.absDeltaVR),mode:'lines+markers',name:'|ΔV_R|',yaxis:'y2'}],layout:{...gateBase('Vg (V)','V_R (V)'),yaxis2:{title:'|ΔV_R| (V)',overlaying:'y',side:'right',showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
        reswinGateAmplitude:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeA),mode:'lines+markers',name:'A_A'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.amplitudeB),mode:'lines+markers',name:'A_B'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.etaEff),mode:'lines+markers',name:'η_eff',yaxis:'y2'}],layout:{...gateBase('Vg (V)','峰高 (A)'),yaxis2:{title:'η_eff',overlaying:'y',side:'right',range:[0,1],showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
        reswinGateTerCorrelation:{traces:[{x:rows.filter(d=>Number.isFinite(d.terMax)&&Number.isFinite(d.deltaOverW)).map(d=>d.deltaOverW),y:rows.filter(d=>Number.isFinite(d.terMax)&&Number.isFinite(d.deltaOverW)).map(d=>d.terMax),mode:'markers',name:'TERmax'}],layout:gateBase('|δ|/w','TERmax (%)')},
        reswinGateReadoutCorrelation:{traces:[{x:rows.filter(d=>Number.isFinite(d.V0)&&Number.isFinite(d.vStar)).map(d=>d.V0),y:rows.filter(d=>Number.isFinite(d.V0)&&Number.isFinite(d.vStar)).map(d=>d.vStar),mode:'markers',name:'Vd*'}],layout:gateBase('V0 (V)','Vd* (V)')},
        reswinGateBackground:{traces:[{x:rows.map(d=>d.vg),y:rows.map(d=>d.baselineA),mode:'lines+markers',name:'背景 A'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.baselineB),mode:'lines+markers',name:'背景 B'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.peakToBgA),mode:'lines+markers',name:'峰/背景 A',yaxis:'y2'},{x:rows.map(d=>d.vg),y:rows.map(d=>d.peakToBgB),mode:'lines+markers',name:'峰/背景 B',yaxis:'y2'}],layout:{...gateBase('Vg (V)','局域背景 (A)'),yaxis2:{title:'峰/背景比',overlaying:'y',side:'right',showgrid:false},margin:{l:66,r:64,t:20,b:52}}},
        reswinGateDensity:{traces:r.settings.useCarrierDensity?[{x:rows.filter(d=>Number.isFinite(d.ng_cm2)).map(d=>d.ng_cm2),y:rows.filter(d=>Number.isFinite(d.ng_cm2)).map(d=>d.delta),mode:'lines+markers',name:'δ'},{x:rows.filter(d=>Number.isFinite(d.ng_cm2)&&Number.isFinite(d.terMax)).map(d=>d.ng_cm2),y:rows.filter(d=>Number.isFinite(d.ng_cm2)&&Number.isFinite(d.terMax)).map(d=>d.terMax),mode:'lines+markers',name:'TERmax',yaxis:'y2'}]:[],layout:{...gateBase('n_g (cm⁻²)','δ (V)'),yaxis2:{title:'TERmax (%)',overlaying:'y',side:'right',showgrid:false},margin:{l:74,r:64,t:20,b:52}}}
      };
      for(const [id,spec] of Object.entries(plots)){const el=$('#'+id);if(el)scientificReact(el,spec.traces,spec.layout,{responsive:true,displaylogo:false},{renderKey:`gate:${gateComputeKey}:${id}`}).catch(()=>{});}
      const field=r.featureField||gateFeatureField(r.settings||{}),fieldPlot=$('#reswinGateFeatureField'),fieldTitle=$('#reswinGateFeatureFieldTitle'),fieldMeta=$('#reswinGateFeatureFieldMeta');
      if(fieldTitle)fieldTitle.textContent=`跨曲线特征场 · ${field.label}`;if(fieldMeta)fieldMeta.textContent=`${field.y.length} 个峰序列 × ${field.x.length} 个 Vg · 缺失 ${field.missing} · 点击单元格可定位真实峰`;
      if(fieldPlot){if(field.x.length&&field.y.length&&live.uiRuntime?.scientificPlot?.scalarField){live.uiRuntime.scientificPlot.scalarField(fieldPlot,field,{diverging:field.diverging,colorscale:field.diverging?'RdBu':'Viridis',reversescale:field.diverging,zmid:field.diverging?0:undefined,yaxis:{type:'category',automargin:true},source:'resonance-feature-field',renderKey:`gate-feature:${gateComputeKey}:${field.metric}:${field.direction}:${field.missing}`,hovertemplate:`Vg=%{x:.6g} V<br>%{y}<br>${field.label}=%{z:.6g}${field.unit?` ${field.unit}`:''}<extra></extra>`,onClick:event=>{const peak=peakFromFeatureFieldPoint(field,event);if(peak)publishPeakSelection(peak,'resonance-feature-field',{openInspector:true});}}).catch(()=>{});}else if(!field.x.length||!field.y.length)try{live.uiRuntime?.scientificPlot?.purge?.(fieldPlot);}catch{}}
      const report=$('#reswinGateReport');if(report){const f=r.fits||{},c=r.correlations||{};dom.html(report,`<strong>栅压物理分析摘要</strong><p>V0 表示两条所选共振 ridge 的共模位置；δ=(VB−VA)/2 表示有效分裂。用于可分辨度比较时使用 |δ|/w。</p><p>dV0/dVg=${fmt(f.V0?.slope,6)}，R²=${fmt(f.V0?.r2,4)}；d|δ|/dVg=${fmt(f.deltaAbs?.slope,6)}；r[TERmax, |δ|/w]=${fmt(c.terVsDeltaOverW,4)}；r[Vd*, V0]=${fmt(c.vStarVsV0,4)}。</p><p>这些相关量用于检验机制假设，不把 η_eff 直接解释为畴面积，也不把正反扫峰位差直接等同于 coercive voltage。</p>`);}
      const table=$('#reswinGateTable');if(table)dom.html(table,`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>V0</th><th>δ</th><th>|δ|/w</th><th>TERmax</th><th>Vd*</th><th>η_eff</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.V0,6)}</td><td>${fmt(d.delta,6)}</td><td>${fmt(d.deltaOverW,5)}</td><td>${fmt(d.terMax,4)}</td><td>${fmt(d.vStar,6)}</td><td>${fmt(d.etaEff,4)}</td></tr>`).join('')}</tbody>`);
    }
    function gateCsv(){const rows=['Vg,V_A,V_B,V0,delta,abs_delta,delta_over_w,TER_max,Vd_star,eta_eff'];for(const d of gateResult?.rows||[])rows.push([d.vg,d.vA,d.vB,d.V0,d.delta,d.absDelta,d.deltaOverW,d.terMax,d.vStar,d.etaEff].join(','));return rows.join('\n');}
    function gateReportText(){const r=gateResult||computeGate(),f=r.fits||{},c=r.correlations||{};return ['# 栅压物理分析报告','',`ridge A: ${r.seriesA?.name||'—'}`,`ridge B: ${r.seriesB?.name||'—'}`,`共同 Vg 点: ${r.rows?.length||0}`,'',`dV0/dVg = ${fmt(f.V0?.slope,7)} V/V`,`R²(V0) = ${fmt(f.V0?.r2,4)}`,`d|δ|/dVg = ${fmt(f.deltaAbs?.slope,7)} V/V`,`Pearson r[TERmax, |δ|/w] = ${fmt(c.terVsDeltaOverW,4)}`,`Pearson r[Vd*, V0] = ${fmt(c.vStarVsV0,4)}`,'','解释边界：V0 是共模轨迹位置；δ 是有效共振分裂；η_eff 是有效电学权重；正反扫峰位差不自动等同于 coercive voltage。'].join('\n');}

    function invalidatePhysics(){physicsCache={key:'',value:null};}
    function getState(){return {spacingResult:[...spacingResult],gateResult,gateComputeKey,physicsCached:!!physicsCache.value};}
    function getGateFeatureField(){return gateResult?.featureField||gateFeatureField();}
    installPipeline();
    return Object.freeze({
      physicalAnalysis,renderPhysics,renderSpacing,spacingCsv,renderGate,gateCsv,gateReportText,
      gateFeatureFieldCsv,getGateFeatureField,invalidatePhysics,installPipeline,readGate,getState
    });
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-analysis-runtime',Object.freeze({create}));
})();
