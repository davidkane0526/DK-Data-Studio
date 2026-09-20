(() => {
  // Owns Resonance peak-algorithm execution and metric cache lifecycle.
  // Detection/metrics share the same version-locked Algorithm + Pipeline path;
  // interaction modules only commit domain edits and request metric refresh.
  function create(context){
    const {live,services,actions,utils}=context;
    const {S,setStatus}=services;
    const {clone}=utils;
    let detectorRuntime=null;
    let algorithmPipelineInstalled=false;
    const METRIC_CACHE_LIMIT=1024;
    let peakMetricCache=new Map(),metricEpoch=0;
    let peakMetricRevision=0,peakMetricSettledRevision=0,metricFailureCount=0,metricLastError='';
    const metricPending=new Set(),metricDirtyPeaks=new Set(),metricFailedPeaks=new Set();
    const metricCacheKey=p=>String(p?.id||'');
    function metricCacheGet(p){const key=metricCacheKey(p);return key?peakMetricCache.get(key):null;}
    function metricCacheSet(p,value){const key=metricCacheKey(p);if(!key)return value;peakMetricCache.delete(key);peakMetricCache.set(key,value);while(peakMetricCache.size>METRIC_CACHE_LIMIT)peakMetricCache.delete(peakMetricCache.keys().next().value);return value;}
    function metricCacheDelete(p){const key=metricCacheKey(p);if(key)peakMetricCache.delete(key);}

    const reactivePeakGeometry=p=>`resonance.peak.geometry:${String(p?.id||'')}`;
    const reactivePeakMetricInput=p=>`resonance.peak.metric-input:${String(p?.id||'')}`;
    function reactiveTouch(keys,meta={}){try{return live.reactiveRuntime?.touch?.(keys,meta)||null;}catch(err){console.warn('[resonance reactive touch]',err);return null;}}
    function finishMetricWave(jobKey){
      metricPending.delete(jobKey);
      if(metricPending.size||(!metricDirtyPeaks.size&&!metricFailedPeaks.size))return false;
      const peakIds=[...metricDirtyPeaks],failedPeakIds=[...metricFailedPeaks];metricDirtyPeaks.clear();metricFailedPeaks.clear();peakMetricSettledRevision+=1;actions.invalidatePhysics();
      const meta={reason:failedPeakIds.length?'metric-wave-settled-with-errors':'metric-wave-resolved',peakCount:peakIds.length,failedPeakCount:failedPeakIds.length,peakId:peakIds.length===1&&!failedPeakIds.length?peakIds[0]:'',settledRevision:peakMetricSettledRevision};
      reactiveTouch('resonance.peak.metrics',meta);actions.metricWaveSettled?.(meta);
      return true;
    }
    function invalidatePeakMetric(p,{geometry=false,reason='peak-edit',refresh=true}={}){
      if(!p)return;metricCacheDelete(p);peakMetricRevision+=1;actions.invalidatePhysics();const keys=[reactivePeakMetricInput(p),'resonance.peak.metric-input'];if(geometry)keys.push(reactivePeakGeometry(p),'resonance.peak.geometry');
      if(live.reactiveRuntime?.transact)live.reactiveRuntime.transact(`resonance:${reason}`,tx=>tx.touch(keys,{peakId:p.id,reason}));else reactiveTouch(keys,{peakId:p.id,reason});if(refresh)void refreshPeakMetric(p);
    }
    function commitPeakMetricEdit(p,{geometry=false,reason='peak-edit'}={}){if(!p)return null;invalidatePeakMetric(p,{geometry,reason,refresh:false});return peakMetrics(p);}

    function installPipeline(){
      const pipeline=live.pipelineRuntime,algorithms=live.algorithmRuntime;if(!pipeline?.register||!algorithms||algorithmPipelineInstalled)return false;
      if(!pipeline.get?.('peaks.detect'))pipeline.register('peaks.detect',{title:'Peak detection via Algorithm Provider',kind:'analysis',execution:'async',allowEmptyInput:true,cache:false,outputTypes:['science.resonance.peak-set'],run:async(input,{parameters})=>{const ref=parameters?.algorithmRef||{};const peaks=await algorithms.run(ref,input,{parameters:parameters?.settings||{},range:parameters?.range||null});return {value:{peaks:Array.isArray(peaks)?peaks:[],algorithm:algorithms.provenance?.(ref)||null},metadata:{algorithm:algorithms.provenance?.(ref)||null}};}});
      if(!pipeline.get?.('peaks.metrics'))pipeline.register('peaks.metrics',{title:'Peak metrics via Algorithm Provider',kind:'analysis',allowEmptyInput:true,cache:false,outputTypes:['science.resonance.peak-metrics'],run:(input,{parameters})=>{const ref=parameters?.algorithmRef||{},result=algorithms.run(ref,input,{parameters:parameters?.settings||{}}),wrap=metrics=>({value:metrics,metadata:{algorithm:algorithms.provenance?.(ref)||null}});return result&&typeof result.then==='function'?result.then(wrap):wrap(result);}});
      algorithmPipelineInstalled=true;return true;
    }
    function resetPipeline(){algorithmPipelineInstalled=false;return installPipeline();}
    function selectDetectorProvider(providers=[]){const active=String(live.workspace.activeDetector||'');let provider=providers.find(p=>String(p.id)===active)||providers.find(p=>String(p.algorithmId||'')===active)||null;if(!provider&&active.includes('@'))return null;if(!provider)provider=providers.find(p=>p.default)||providers[0]||null;if(provider&&String(provider.id||'').includes('@')&&String(live.workspace.activeDetector||'')!==String(provider.id))live.workspace.activeDetector=String(provider.id);return provider;}
    function missingLockedAlgorithm(category,active){const algorithms=live.algorithmRuntime;if(!algorithms?.diagnose||!String(active||'').includes('@'))return null;const d=algorithms.diagnose(String(active),{category});return d?.status==='missing-version'?d:null;}
    async function runPeakDetector(provider,sweep,settings,options={}){
      if(!provider){const d=missingLockedAlgorithm('peak-detector',live.workspace.activeDetector);if(d)throw new Error(`工程锁定的寻峰算法版本缺失：${d.requested.id}@${d.requested.version}；可用版本：${d.alternatives.map(x=>x.version).join('、')||'无'}`);throw new Error('当前没有可用的 Peak Detector Algorithm Provider。');}
      const algorithmId=String(provider.algorithmId||provider.id||'').split('@')[0],ref={id:algorithmId,version:String(provider.version||''),category:'peak-detector'};installPipeline();
      if(live.pipelineRuntime?.run&&live.algorithmRuntime){const result=await live.pipelineRuntime.run('peaks.detect',sweep,{parameters:{algorithmRef:ref,settings:settings||{},range:options?.range||null},publish:false});return result?.value?.peaks||[];}
      if(provider.detect)return await provider.detect(sweep,settings||{},options||{});if(provider.run)return await provider.run(sweep,{parameters:settings||{},...options});throw new Error(`Peak Detector Provider ${algorithmId||'(unknown)'} 没有可执行入口。`);
    }
    function detectorSettingsKey(provider,activeId){return String(provider?.algorithmId||provider?.id||activeId||'').split('@')[0];}
    function detectorSettingsFor(provider,activeId){const base=detectorSettingsKey(provider,activeId);return live.workspace.detectorSettings?.[activeId]||live.workspace.detectorSettings?.[base]||live.workspace.algorithms||{};}
    function algorithmProvenance(provider,category='peak-detector'){const algorithmId=String(provider?.algorithmId||provider?.id||'').split('@')[0],version=String(provider?.version||''),algorithms=live.algorithmRuntime;return algorithms?.provenance?.({id:algorithmId,version,category})||{pluginId:provider?.owner||provider?.pluginId||'',algorithmId,algorithmVersion:version,category,title:provider?.title||provider?.name||algorithmId};}

    async function detectRange(range=live.selectedRange){
      if(!range)return;const lo=Math.min(Number(range.min??range.vMin??range.xMin),Number(range.max??range.vMax??range.xMax)),hi=Math.max(Number(range.min??range.vMin??range.xMin),Number(range.max??range.vMax??range.xMax));
      const hasY=Number.isFinite(Number(range.iMin??range.yMin))&&Number.isFinite(Number(range.iMax??range.yMax)),yLo=hasY?Math.min(Number(range.iMin??range.yMin),Number(range.iMax??range.yMax)):NaN,yHi=hasY?Math.max(Number(range.iMin??range.yMin),Number(range.iMax??range.yMax)):NaN;
      const candidates=range.sweepId?[actions.sweepById(range.sweepId)].filter(Boolean):actions.visibleSweeps(),pointsInBox=sw=>(sw?.points||[]).filter(p=>Number(p.v)>=lo&&Number(p.v)<=hi&&(!hasY||(Number(p.i)>=yLo&&Number(p.i)<=yHi))),targets=candidates.filter(sw=>pointsInBox(sw).length>0);
      if(!targets.length){setStatus('框选矩形内没有可见数据点。');return;}const beforeDetection=clone(live.workspace),providers=detectorRuntime?.list?.()||[],provider=selectDetectorProvider(providers),activeId=String(provider?.id||live.workspace.activeDetector||''),settings=detectorSettingsFor(provider,activeId);
      const inside=new Set(actions.peaksInRange(range).filter(p=>!p.manual&&!p.locked).map(p=>p.id));live.workspace.peaks=(live.workspace.peaks||[]).filter(p=>!inside.has(p.id));const added=[];let insufficient=0;
      for(const sw of targets){const points=pointsInBox(sw);if(points.length<5){insufficient++;continue;}const subset={...sw,points};try{const found=await runPeakDetector(provider,subset,settings,{range:{vMin:lo,vMax:hi}}),provenance=algorithmProvenance(provider);added.push(...actions.assignDetectedOrders(found||[]).map(p=>({...p,sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,algorithm:provenance,algorithmRef:`${provenance.algorithmId}@${provenance.algorithmVersion}`})));}catch(err){console.warn('[resonance range detect]',sw.id,err);}}
      live.workspace.peaks.push(...added);actions.normalizeCategories();if(added[0])actions.publishPeakSelection(added[0],'resonance-range');else actions.render();actions.commitWorkspaceEdit(beforeDetection,'重新寻峰');setStatus(`局部寻峰完成：${targets.length-insufficient}/${targets.length} 条扫描，新增 ${added.length} 个峰。`);
    }
    async function runDetection(scope='selected'){
      const targets=scope==='all'?actions.visibleSweeps():[actions.selectedSweep()].filter(Boolean);if(!targets.length){setStatus('没有可寻峰的可见扫描。');return;}
      const beforeDetection=clone(live.workspace),targetIds=new Set(targets.map(sw=>sw.id)),preserved=(live.workspace.peaks||[]).filter(p=>!targetIds.has(p.sweepId)||p.manual||p.locked),added=[],providers=detectorRuntime?.list?.()||[],provider=selectDetectorProvider(providers),activeId=String(provider?.id||live.workspace.activeDetector||'');
      for(const sw of targets){try{const settings=detectorSettingsFor(provider,activeId),peaks=await runPeakDetector(provider,sw,settings,{}),provenance=algorithmProvenance(provider);added.push(...actions.assignDetectedOrders(peaks||[]).map(p=>({...p,algorithm:provenance,algorithmRef:`${provenance.algorithmId}@${provenance.algorithmVersion}`})));}catch(err){console.warn('[resonance window detect]',sw.id,err);}}
      live.workspace.peaks=preserved.concat(added);actions.normalizeCategories();actions.setSelectedPeakId(added[0]?.id||live.selectedPeakId);actions.render();actions.commitWorkspaceEdit(beforeDetection,'重新寻峰');setStatus(`寻峰完成：${targets.length} 条扫描，新增 ${added.length} 个自动峰。`);
    }

    function metricProvider(){const algorithms=live.algorithmRuntime,rows=algorithms?.list?.({category:'peak-metrics'})||[],active=String(live.workspace.activeMetricAlgorithm||'');let row=rows.find(x=>`${x.id}@${x.version}`===active)||rows.find(x=>x.id===active)||null;if(!row&&active.includes('@'))return null;if(!row)row=rows.find(x=>x.default)||rows[0]||null;if(row&&!live.workspace.activeMetricAlgorithm)live.workspace.activeMetricAlgorithm=`${row.id}@${row.version}`;return row;}
    function metricSignature(p,sw,row){return [p?.id,p?.v,p?.i,p?.analysisLeft,p?.analysisRight,p?.analysisManual,sw?.id,sw?.step,row?.id,row?.version].join('|');}
    function scheduleMetricRefresh(rows=[]){for(const p of rows||[]){metricCacheDelete(p);void refreshPeakMetric(p);}}
    function storePeakMetric(p,signature,value,provider,epoch=metricEpoch){if(epoch!==metricEpoch||!value||typeof value!=='object')return null;const sw=actions.sweepById(p?.sweepId),current=metricProvider();if(!sw||!current||metricSignature(p,sw,current)!==signature)return null;const ref={id:provider.id,version:provider.version,category:'peak-metrics'},next={...value,algorithm:live.algorithmRuntime?.provenance?.(ref)||{pluginId:provider.owner||'',algorithmId:provider.id,algorithmVersion:provider.version,category:'peak-metrics',title:provider.title||provider.id}};metricCacheSet(p,{signature,value:next,promise:null,epoch});metricFailureCount=0;metricLastError='';peakMetricRevision+=1;metricDirtyPeaks.add(String(p?.id||''));if(String(live.selectedPeakId||'')===String(p?.id||''))reactiveTouch('resonance.peak.metric-focus',{reason:'selected-metric-resolved',peakId:String(p?.id||'')});return next;}
    async function refreshPeakMetric(p){const sw=actions.sweepById(p?.sweepId),provider=metricProvider();if(!p||!sw||!provider)return null;const signature=metricSignature(p,sw,provider),cached=metricCacheGet(p);if(cached?.signature===signature&&cached?.epoch===metricEpoch){if(cached.value)return cached.value;if(cached.promise)return cached.promise;if(cached.failed)return null;}const ref={id:provider.id,version:provider.version,category:'peak-metrics'},epoch=metricEpoch,jobKey=`${epoch}::${String(p.id)}::${signature}`;installPipeline();metricPending.add(jobKey);const promise=(async()=>{try{const compute=async()=>{if(live.pipelineRuntime?.run&&live.algorithmRuntime){const result=await live.pipelineRuntime.run('peaks.metrics',{peak:p,sweep:sw},{parameters:{algorithmRef:ref,settings:{}},publish:false});return result?.value;}return provider.run?.({peak:p,sweep:sw},{parameters:{}});};const task=live.reactiveRuntime?.runLatest?await live.reactiveRuntime.runLatest(`resonance.metric:${p.id}`,compute,{dependsOn:[reactivePeakGeometry(p),reactivePeakMetricInput(p)]}):{accepted:true,value:await compute()};if(!task?.accepted||epoch!==metricEpoch)return null;return storePeakMetric(p,signature,task.value,provider,epoch);}catch(err){if(epoch!==metricEpoch)return null;metricFailureCount+=1;metricLastError=String(err?.message||err||'Peak metrics failed');metricFailedPeaks.add(String(p?.id||''));console.warn('[resonance peak metrics algorithm]',p?.id,err);if(metricFailureCount===1)setStatus(`峰指标计算失败：${metricLastError}`);if(metricSignature(p,actions.sweepById(p?.sweepId),metricProvider()||provider)===signature)metricCacheSet(p,{signature,value:null,promise:null,failed:true,error:metricLastError,epoch});return null;}if(epoch===metricEpoch&&metricSignature(p,actions.sweepById(p?.sweepId),metricProvider()||provider)===signature){const current=metricCacheGet(p);if(!current?.value&&!current?.failed)metricCacheSet(p,{signature,value:null,promise:null,epoch});}return null;})().finally(()=>finishMetricWave(jobKey));metricCacheSet(p,{signature,value:null,promise,failed:false,epoch});return promise;}
    function peakMetrics(p){const sw=actions.sweepById(p?.sweepId);if(!sw||!p)return null;const provider=metricProvider();if(!provider&&missingLockedAlgorithm('peak-metrics',live.workspace.activeMetricAlgorithm))return null;if(provider){const signature=metricSignature(p,sw,provider),cached=metricCacheGet(p);if(cached?.epoch===metricEpoch&&cached?.signature===signature){if(cached.value)return cached.value;if(cached.promise||cached.failed)return null;}void refreshPeakMetric(p);return null;}return null;}
    function resetMetricCache({reason='metric-reset'}={}){metricEpoch+=1;peakMetricCache=new Map();metricPending.clear();metricDirtyPeaks.clear();metricFailedPeaks.clear();metricFailureCount=0;metricLastError='';peakMetricRevision+=1;peakMetricSettledRevision+=1;actions.invalidatePhysics();reactiveTouch(['resonance.peak.metric-input','resonance.peak.metrics'],{reason,settledRevision:peakMetricSettledRevision});}
    function setDetectorRuntime(runtime){detectorRuntime=runtime||null;}
    return Object.freeze({runDetection,detectRange,peakMetrics,commitPeakMetricEdit,scheduleMetricRefresh,installPipeline,resetPipeline,resetMetricCache,setDetectorRuntime,revision:()=>peakMetricRevision,settledRevision:()=>peakMetricSettledRevision,diagnostics:()=>Object.freeze({epoch:metricEpoch,cacheEntries:peakMetricCache.size,pending:metricPending.size,failures:metricFailureCount,lastError:metricLastError})});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-peak-runtime',Object.freeze({create}));
})();
