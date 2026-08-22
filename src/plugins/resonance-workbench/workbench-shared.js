(() => {
  const PLUGIN_ID='builtin.resonance-workbench';
  const VIEW_CATALOG=Object.freeze([
    Object.freeze({id:'main',label:'共振分析',role:'primary'}),
    Object.freeze({id:'inspect',label:'曲线检查',role:'inspector'}),
    Object.freeze({id:'group',label:'组图分析',role:'group'}),
    Object.freeze({id:'physics',label:'物理机制',role:'physics'}),
    Object.freeze({id:'spacing',label:'峰间距',role:'derived'}),
    Object.freeze({id:'gate',label:'栅压分析',role:'derived'})
  ]);
  const VIEW_IDS=new Set(VIEW_CATALOG.map(v=>v.id));
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';

  function registerDataTypes(ctx){
    if(!ctx?.data?.types)return;
    for(const [id,spec] of [
      ['resonance.dataset',{title:'共振数据集',parent:'data.artifact',kind:'data',key:v=>v?.path||v?.id,selection:v=>({id:v?.path||v?.id,ref:{datasetPath:v?.path||''},value:{id:v?.id,path:v?.path,name:v?.name,vg:v?.vg}})}],
      ['resonance.sweep',{title:'共振扫描',parents:['data.sweep','science.iv.raw'],kind:'data',key:v=>v?.id,selection:v=>({id:v?.id,ref:{sweepId:v?.id,datasetPath:v?.datasetPath},value:{id:v?.id,datasetPath:v?.datasetPath,datasetName:v?.datasetName,vg:v?.vg,direction:v?.direction}})}],
      ['resonance.peak',{title:'共振峰',parents:['data.point','science.resonance.peak'],kind:'result',key:v=>v?.id,selection:v=>({id:v?.id,ref:{peakId:v?.id,sweepId:v?.sweepId},value:{id:v?.id,sweepId:v?.sweepId,datasetPath:v?.datasetPath,vg:v?.vg,direction:v?.direction,v:v?.v,i:v?.i,peakOrder:v?.peakOrder,peakLabel:v?.peakLabel}})}],
      ['resonance.fwhm',{title:'共振半峰全宽',parent:'science.resonance.fwhm',kind:'result',key:v=>v?.id||`${v?.peakId||''}:fwhm`,selection:v=>({id:v?.id||`${v?.peakId||''}:fwhm`,ref:{peakId:v?.peakId||''},value:{id:v?.id,peakId:v?.peakId,fwhm:v?.fwhm,left:v?.left,right:v?.right,unit:v?.unit||'V'}})}],
      ['resonance.peak-family',{title:'共振峰族',parent:'result.analysis',kind:'result',key:v=>v?.id||`${v?.direction||0}:${v?.label||''}`,selection:v=>({id:v?.id||`${v?.direction||0}:${v?.label||''}`,value:{id:v?.id,direction:v?.direction,label:v?.label,order:v?.order,summary:v?.summary}})}],
      ['resonance.range',{title:'共振电压选区',parent:'data.range',kind:'region',key:v=>v?.id||`${v?.sweepId||''}:${v?.min||''}:${v?.max||''}`}],
      ['resonance.analysis-result',{title:'共振派生分析',parent:'result.analysis',kind:'result',key:v=>v?.id,selection:v=>({id:v?.id,ref:{resultId:v?.id||''},value:{id:v?.id,name:v?.name,kind:v?.kind,summary:v?.summary}})}],
      ['resonance.gate-analysis',{title:'栅压依赖共振分析',parent:'resonance.analysis-result',kind:'result',tags:['resonance','gate'],key:v=>v?.id||'resonance.gate-analysis'}],
      ['resonance.feature-field',{title:'共振跨曲线特征场',parent:'science.scalar-field',kind:'result',shape:'matrix',tags:['resonance','gate','feature','heatmap'],key:v=>v?.id||'resonance.feature-field'}]
    ])if(!ctx.data.types.get(id))ctx.data.types.register(id,spec);
  }

  function pluginSliceFromProject(project){
    return project?.plugins?.[PLUGIN_ID]?.workspace||null;
  }

  function defaultWorkspace(project={},science=window.DKDSScience){
    return {
      schema:1,
      datasetMeta:(project.datasets||[]).map(d=>({path:d.path,name:d.name,vg:d.vg})),
      scanVisibility:[],
      peaks:[],
      peakCategories:[],
      algorithms:clone(science?.preset?.('balanced')||{_preset:'balanced'}),
      activeDetector:'',
      activeMetricAlgorithm:'',
      detectorSettings:{},
      peakDisplay:{showRejected:false,showWidth:true,showPoints:true},
      physicsShowLabels:true,
      spacingSettings:{seriesA:'',seriesB:'',mode:'abs'},
      gateAnalysisSettings:{seriesA:'',seriesB:'',hysteresisLabel:'',widthMode:'hwhm',useCarrierDensity:false,cg:null,cnp:0,featureMetric:'fwhm',featureDirection:'all',terSettings:{vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false},terAlgorithmRef:{category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'}},
      transformPreviewByDataset:[],
      legacyVisibilityExplicit:false,
      legacyVisibilityDatasetPaths:[],
      groupColumns:'auto',
      mainView:{xDomain:null,yDomain:null},
      activeView:'main'
    };
  }

  function normalizeWorkspace(raw,project={},science=window.DKDSScience){
    const base=defaultWorkspace(project,science);
    const source=raw&&typeof raw==='object'?raw:{};
    return {
      ...base,...clone(source),schema:1,
      datasetMeta:Array.isArray(source.datasetMeta)?clone(source.datasetMeta):base.datasetMeta,
      scanVisibility:Array.isArray(source.scanVisibility)?clone(source.scanVisibility):base.scanVisibility,
      peaks:Array.isArray(source.peaks)?clone(source.peaks):base.peaks,
      peakCategories:Array.isArray(source.peakCategories)?clone(source.peakCategories):base.peakCategories,
      algorithms:{...(base.algorithms||{}),...(source.algorithms||{})},
      activeDetector:String(source.activeDetector||base.activeDetector||''),
      activeMetricAlgorithm:String(source.activeMetricAlgorithm||base.activeMetricAlgorithm||''),
      detectorSettings:{...(base.detectorSettings||{}),...(source.detectorSettings||{})},
      peakDisplay:{...(base.peakDisplay||{}),...(source.peakDisplay||{})},
      spacingSettings:{...(base.spacingSettings||{}),...(source.spacingSettings||{})},
      gateAnalysisSettings:{...(base.gateAnalysisSettings||{}),...(source.gateAnalysisSettings||{}),terSettings:{...(base.gateAnalysisSettings?.terSettings||{}),...(source.gateAnalysisSettings?.terSettings||{})},terAlgorithmRef:{...(base.gateAnalysisSettings?.terAlgorithmRef||{}),...(source.gateAnalysisSettings?.terAlgorithmRef||{})}},
      transformPreviewByDataset:Array.isArray(source.transformPreviewByDataset)?clone(source.transformPreviewByDataset):base.transformPreviewByDataset,
      legacyVisibilityExplicit:source.legacyVisibilityExplicit===true,
      legacyVisibilityDatasetPaths:Array.isArray(source.legacyVisibilityDatasetPaths)?source.legacyVisibilityDatasetPaths.map(String):base.legacyVisibilityDatasetPaths,
      groupColumns:['auto','1','2','3','4','5','6'].includes(String(source.groupColumns))?String(source.groupColumns):'auto',
      mainView:{xDomain:Array.isArray(source.mainView?.xDomain)?source.mainView.xDomain.map(Number):null,yDomain:Array.isArray(source.mainView?.yDomain)?source.mainView.yDomain.map(Number):null},
      activeView:VIEW_IDS.has(String(source.activeView))?String(source.activeView):'main'
    };
  }

  function stateSnapshot(service){
    const raw=service?.getState?.()||{};
    const workspace=raw.workspace&&typeof raw.workspace==='object'?raw.workspace:raw;
    const datasets=raw.datasets||workspace.datasets||[];
    const sweeps=raw.sweeps||workspace.sweeps||[];
    const peaks=raw.peaks||workspace.peaks||[];
    const selectedPeak=service?.selectedPeak?.()||raw.selectedPeak||null;
    const selectedSweep=service?.selectedSweep?.()||raw.selectedSweep||null;
    let visibleIds=[];
    if(service?.visibleSweepIds) visibleIds=service.visibleSweepIds()||[];
    else if(Array.isArray(raw.visibleSweepIds)) visibleIds=raw.visibleSweepIds;
    else visibleIds=sweeps.map(sw=>sw.id);
    return {raw,workspace,datasets,sweeps,peaks,selectedPeak,selectedSweep,visibleSweepIds:visibleIds};
  }

  function categoryLabel(service,peak){
    if(service?.peakLabel)return service.peakLabel(peak);
    return String(peak?.peakLabel||`峰${Math.max(1,Math.round(Number(peak?.peakOrder)||1))}`);
  }

  function metricFor(service,science,peak,sweep){
    if(service?.metrics)return service.metrics(peak,sweep);
    return science?.peakMetrics?.(peak,sweep);
  }

  function buildTrendModel(controller){
    const service=controller.service,science=controller.science;
    const snapshot=stateSnapshot(service);
    const visibleIds=new Set(snapshot.visibleSweepIds);
    const accepted=snapshot.peaks.filter(p=>p.accepted!==false&&visibleIds.has(p.sweepId));
    // Group/trend figures are projections of the complete VISIBLE data set.
    // A focused sweep/peak is an interaction focus only and must never collapse
    // the series to one scan direction. Selection may style a point, but the
    // visibility contract alone decides which forward/reverse families exist.
    const wanted=[];
    const seen=new Set();
    for(const q of accepted){
      const label=categoryLabel(service,q),key=`${q.direction}::${label}`;
      if(!seen.has(key)){seen.add(key);wanted.push({direction:q.direction,label});}
    }
    const sweepById=id=>service?.sweepById?.(id)||snapshot.sweeps.find(x=>x.id===id)||null;
    const series=[];
    for(const w of wanted){
      const points=accepted.filter(q=>q.direction===w.direction&&categoryLabel(service,q)===w.label)
        .map(q=>{
          const s=sweepById(q.sweepId);if(!s)return null;
          // Vpk/Ipk/peak identity already exist on the accepted peak and must
          // not disappear merely because an optional peak-metrics Provider is
          // still computing FWHM/amplitude/area.  Merge metric output when it
          // exists, but keep the base trend series independently usable.
          const m=metricFor(service,science,q,s)||{};
          return {...m,vg:Number.isFinite(Number(m.vg))?Number(m.vg):Number(q.vg),v:Number.isFinite(Number(m.v))?Number(m.v):Number(q.v),i:Number.isFinite(Number(m.i))?Number(m.i):Number(q.i),_peak:q};
        })
        .filter(Boolean).sort((a,b)=>Number(a.vg)-Number(b.vg));
      if(!points.length)continue;
      const repr=points[0]._peak||{};
      const order=Number(repr.peakOrder)||1;
      const color=service?.colorForPeakOrder?.(order,w.direction)||undefined;
      series.push({key:`${w.direction}::${w.label}`,name:`${service?.directionName?.(w.direction)||directionName(w.direction)}·${w.label}`,direction:w.direction,label:w.label,order,color,points});
    }
    const labels=[...new Set(accepted.map(q=>categoryLabel(service,q)))];
    const terSeries=[];
    for(const label of labels){
      const reps=accepted.filter(q=>categoryLabel(service,q)===label);
      const order=reps.length?Number(reps[0].peakOrder)||1:1;
      const data=science?.computeResonantTerForLabel?.(snapshot.peaks,snapshot.sweeps,label,[...visibleIds])||[];
      const pair=service?.pairedTerColors?.(order)||{};
      if(data.length)terSeries.push({name:`共振TER·${label}`,label,order,forwardColor:pair.forward,reverseColor:pair.reverse,points:data});
    }
    return {...snapshot,series,terSeries};
  }

  function acceptedSeriesOptions(controller){
    const {peaks,visibleSweepIds}=stateSnapshot(controller.service);
    const visible=new Set(visibleSweepIds);
    const seen=new Map();
    for(const p of peaks){
      if(p.accepted===false||!visible.has(p.sweepId))continue;
      const label=categoryLabel(controller.service,p);
      const key=`${p.direction}::${label}`;
      if(!seen.has(key))seen.set(key,{key,direction:p.direction,label,name:`${controller.service?.directionName?.(p.direction)||directionName(p.direction)} · ${label}`});
    }
    return [...seen.values()].sort((a,b)=>a.direction-b.direction||a.label.localeCompare(b.label,'zh-CN'));
  }

  function chooseRepresentativePeak(list){
    return list.slice().sort((a,b)=>Number(b.locked)-Number(a.locked)||Number(b.manual)-Number(a.manual)||(Number(b.score)||0)-(Number(a.score)||0))[0]||null;
  }

  function computeSpacingRows(controller,keyA,keyB){
    const aOpt=acceptedSeriesOptions(controller).find(x=>x.key===keyA);
    const bOpt=acceptedSeriesOptions(controller).find(x=>x.key===keyB);
    if(!aOpt||!bOpt)return [];
    const {peaks,visibleSweepIds}=stateSnapshot(controller.service);
    const visible=new Set(visibleSweepIds);
    const filtered=peaks.filter(p=>p.accepted!==false&&visible.has(p.sweepId));
    const a=filtered.filter(p=>p.direction===aOpt.direction&&categoryLabel(controller.service,p)===aOpt.label);
    const b=filtered.filter(p=>p.direction===bOpt.direction&&categoryLabel(controller.service,p)===bOpt.label);
    const vgs=[...new Set(a.map(p=>Number(p.vg)).filter(Number.isFinite).filter(vg=>b.some(q=>Number(q.vg)===vg)))].sort((x,y)=>x-y);
    const out=[];
    for(const vg of vgs){
      const pa=chooseRepresentativePeak(a.filter(p=>Number(p.vg)===vg));
      const pb=chooseRepresentativePeak(b.filter(p=>Number(p.vg)===vg));
      if(!pa||!pb)continue;
      out.push({vg,vA:pa.v,vB:pb.v,deltaV:pb.v-pa.v,spacing:Math.abs(pb.v-pa.v),labelA:aOpt.name,labelB:bOpt.name,peakA:pa,peakB:pb});
    }
    return out;
  }

  function createController(service,{mode='super',science=window.DKDSScience,host=null}={}){
    if(!service)throw new Error('Resonance shared controller requires a resonance service.');
    const controller={
      mode,service,science,host,views:VIEW_CATALOG,
      state:()=>stateSnapshot(service),
      serialize:()=>service.serialize?.(),
      restore:(data,options)=>service.restore?.(data,options),
      reset:()=>service.reset?.(),
      render:()=>service.render?.()||service.renderAll?.(),
      resize:()=>service.resize?.(),
      setView:view=>service.setView?.(view),
      buildTrendModel:()=>buildTrendModel(controller),
      acceptedSeriesOptions:()=>acceptedSeriesOptions(controller),
      computeSpacingRows:(a,b)=>computeSpacingRows(controller,a,b)
    };
    return Object.freeze(controller);
  }

  window.DKDSPluginModules.define('builtin.resonance-workbench','workbench-shared',Object.freeze({
    PLUGIN_ID,VIEW_CATALOG,registerDataTypes,pluginSliceFromProject,defaultWorkspace,normalizeWorkspace,
    stateSnapshot,buildTrendModel,acceptedSeriesOptions,computeSpacingRows,createController
  }));
})();
