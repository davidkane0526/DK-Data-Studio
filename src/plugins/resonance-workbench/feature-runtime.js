(() => {
  // Resonance feature runtime: all functional rendering/event binding lives here.
  // Keep every runtime helper local to this module. During the v3.31 shared
  // View/Controller extraction these helpers were accidentally left behind in
  // the old dedicated-window closure, which made the plugin fail at first use
  // with `clone is not defined`. SUPER and TOP now execute the exact same
  // explicit helper prelude.
  const Shared=window.DKDSPluginModules.require('builtin.resonance-workbench','workbench-shared');
  const S=window.DKDSScience;
  const D=window.DKDSData;
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';
  const csvCell=value=>{const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
  const fmt=(value,digits=5)=>{const n=Number(value);if(!Number.isFinite(n))return '—';if(Math.abs(n)>=1e4||(Math.abs(n)>0&&Math.abs(n)<1e-3))return n.toExponential(3);return n.toFixed(digits);};
  if(!Shared)throw new Error('Resonance shared workbench layer is unavailable.');
  if(!S)throw new Error('Resonance science runtime is unavailable.');
  // SUPER/TOP adapters are intentionally limited to container/lifecycle mapping.
  async function mountSuper(ctx,controller,adapter={}){
    const views=window.DKDSPluginModules.get('builtin.resonance-workbench','view-components');
    if(!views?.mountUnified)throw new Error('Resonance unified View runtime is unavailable.');
    return views.mountUnified(ctx,controller,{mode:'super',adapter});
  }

  const defaultWorkspace=(project={})=>Shared.defaultWorkspace(project,S);
  const normalizeWorkspace=(raw,project={})=>Shared.normalizeWorkspace(raw,project,S);

  function normalizeLegacyDatasets(rows=[]){
    return rows.flatMap(d=>{
      if(Array.isArray(d?.points)&&d.points.length){
        return [{...clone(d),points:d.points.map((p,index)=>({...p,index:Number.isFinite(Number(p.index))?Number(p.index):index}))}];
      }
      if(typeof d?.text==='string'&&d.text.trim()&&typeof S.parseCsv==='function'){
        try{return [{...S.parseCsv({name:d.name,path:d.path,text:d.text}),...clone(d)}];}catch{}
      }
      return [];
    });
  }

  function parseDatasets(project={},artifacts=null){
    const rows=artifacts?.list?.({includeTransient:true})||[];
    const canonical=D?.legacyDatasetsFromArtifacts?.(rows)||[];
    return normalizeLegacyDatasets(canonical.length?canonical:(project.datasets||[]));
  }

  async function createTop({project:initialProject,artifacts,setStatus,scheduleSnapshot:persistSnapshot,copyTextToClipboard,savePlotlyImage,io=window.DKDSIO,charts=window.DKDSCharts,dom=window.DKDSComponents?.createScope?.('builtin.resonance-workbench')||null,performance=null,pipeline=null,transforms=null,algorithms=null,adapter={}}){
      const $=selector=>dom?.query?.(selector)||null;
      const $$=selector=>dom?.all?.(selector)||[];
      let project=clone(initialProject||{});
      let datasets=[];
      let sweeps=[];
      let workspace={};
      let selectedSweepId='';
      let selectedPeakId='';
      let selectedPeakIds=new Set();
      let uiBound=false;
      let currentView='main';
      let spacingResult=[];
      let gateResult=null;
      let gateComputeKey='';
      let sharedController=null;
      let workspaceNavigator=null;
      let detectorRuntime=null;
      let algorithmRuntime=algorithms||null;
      let pipelineRuntime=pipeline||null;
      let algorithmPipelineInstalled=false;
      let peakMetricCache=new WeakMap();
      let metricRenderFrame=null;
      let interactionRuntime=null;
      let interactionSelection=null;
      let interactionSelectionOff=null;
      const linkedSelectionViewIds=['resonance-dataset-list','resonance-main-legend'];
      let applyingExternalSelection=false;
      let interactionMenus=null;
      let selectedRange=null;
      let physicsCache={key:'',value:null};
      let resizeRaf=0;
      let uiRuntime=null;
      let entityRuntime=null;
      let workspaceRuntime=null;
      let mainSurface=null;
      const groupPortables=new Map();
      const groupCards=new Map();
      const groupPlotViews=new Map();
      const registeredEntityIds=new Set();
      let groupRenderKey='';
      let undoStack=[];
      let committedWorkspace=null;
      const workspaceFingerprint=value=>{try{return JSON.stringify(value);}catch{return '';}};
      function resetUndoHistory(){undoStack=[];committedWorkspace=clone(workspace);}
      function scheduleSnapshot({recordHistory=true}={}){
        const current=clone(workspace);
        if(recordHistory&&committedWorkspace&&workspaceFingerprint(committedWorkspace)!==workspaceFingerprint(current)){
          undoStack.push(committedWorkspace);if(undoStack.length>80)undoStack.shift();
        }
        committedWorkspace=current;persistSnapshot?.();
      }
      function undoLastAction(){
        const previous=undoStack.pop();if(!previous){setStatus('没有可回退的共振编辑。');return false;}
        workspace=normalizeWorkspace(previous,project);committedWorkspace=clone(workspace);currentView=workspace.activeView||'main';physicsCache={key:'',value:null};selectedRange=null;selectedPeakIds.clear();rebuild();
        if(selectedPeakId&&!peakById(selectedPeakId))selectedPeakId='';if(selectedSweepId&&!sweepById(selectedSweepId))selectedSweepId='';
        interactionSelection?.clear?.({source:'resonance-undo'});render();persistSnapshot?.();setStatus('已回退上一步共振编辑。');return true;
      }

      function pluginSliceFromProject(p){return Shared.pluginSliceFromProject(p);}
      function sweepById(id){return sweeps.find(sw=>sw.id===id)||null;}
      function peakById(id){return (workspace.peaks||[]).find(p=>p.id===id)||null;}

      const datasetEntityId=path=>`resonance.dataset:${String(path||'')}`;
      function syncEntities(){
        const entities=entityRuntime;if(!entities?.upsert)return false;const live=new Set();
        entities.transact?.(()=>{
          for(const ds of datasets){const id=datasetEntityId(ds.path);live.add(id);entities.upsert({id,type:'resonance.dataset',label:ds.name||ds.path,ref:{datasetPath:ds.path},value:{path:ds.path,name:ds.name,vg:ds.vg},metadata:{vg:ds.vg,sourcePath:ds.sourcePath||''},visible:true,hidden:false});}
          for(const sw of sweeps){live.add(String(sw.id));const visible=isVisible(sw);entities.upsert({id:String(sw.id),type:'resonance.sweep',label:`${sw.datasetName||sw.datasetPath} · ${directionName(sw.direction)}`,parents:[datasetEntityId(sw.datasetPath)],ref:{sweepId:sw.id,datasetPath:sw.datasetPath},value:{id:sw.id,datasetPath:sw.datasetPath,datasetName:sw.datasetName,vg:sw.vg,direction:sw.direction},metadata:{vg:sw.vg,direction:sw.direction},visible,hidden:!visible});}
          for(const peak of workspace.peaks||[]){live.add(String(peak.id));const sw=sweepById(peak.sweepId),visible=!!sw&&isVisible(sw)&&peak.accepted!==false;entities.upsert({id:String(peak.id),type:'resonance.peak',label:peakLabel(peak),parents:[String(peak.sweepId||'')],ref:{peakId:peak.id,sweepId:peak.sweepId,datasetPath:peak.datasetPath},value:{id:peak.id,sweepId:peak.sweepId,datasetPath:peak.datasetPath,vg:peak.vg,direction:peak.direction,v:peak.v,i:peak.i,peakOrder:peak.peakOrder,peakLabel:peakLabel(peak)},metadata:{accepted:peak.accepted!==false,manual:!!peak.manual},visible,hidden:!visible,locked:!!peak.locked});}
        });
        for(const id of [...registeredEntityIds])if(!live.has(id))entities.remove?.(id);registeredEntityIds.clear();for(const id of live)registeredEntityIds.add(id);return true;
      }
      function syncDerivedArtifacts(){
        if(!artifacts?.publish||!D?.createSweep||!D?.createPeakSet)return false;const sourceRows=artifacts.list?.({includeTransient:true})||[];const rawByPath=new Map(sourceRows.filter(a=>a?.metadata?.adapter==='legacy-dataset').map(a=>[String(a.metadata.legacyDatasetPath||''),a.id]));
        const publishAll=api=>{for(const sw of sweeps){const parentId=rawByPath.get(String(sw.datasetPath||''))||'';api.publish(D.createSweep({id:String(sw.id),name:`${sw.datasetName||'Sweep'} · ${directionName(sw.direction)}`,x:(sw.points||[]).map(p=>p.v),y:(sw.points||[]).map(p=>p.i),xName:'Vd',yName:'Id',xUnit:'V',yUnit:'A',direction:sw.direction,scanAxis:'Vd',transient:true,metadata:{datasetPath:sw.datasetPath,vg:sw.vg},lineage:{parents:parentId?[parentId]:[],role:'sweep',producer:'builtin.resonance-workbench',operation:'split-sweep'}}));const peaks=(workspace.peaks||[]).filter(p=>String(p.sweepId)===String(sw.id));api.publish(D.createPeakSet({id:`resonance.peaks:${sw.id}`,name:`${sw.datasetName||'Sweep'} · 峰`,peaks,transient:true,metadata:{sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,algorithmRef:workspace.activeDetector||'',metricAlgorithmRef:workspace.activeMetricAlgorithm||''},lineage:{parents:[String(sw.id)],role:'analysis',producer:'builtin.resonance-workbench',operation:'peak-detection',parameters:{algorithmRef:workspace.activeDetector||'',settings:workspace.detectorSettings?.[workspace.activeDetector]||workspace.algorithms||{},metricAlgorithmRef:workspace.activeMetricAlgorithm||''}}}));}};
        if(artifacts.batch)artifacts.batch(publishAll);else publishAll(artifacts);return true;
      }

      function scientificReact(target,traces,layout,config={},spec={}){
        const runtime=uiRuntime?.scientificPlot;if(runtime?.react)return runtime.react(target,traces,layout,config,{interaction:interactionRuntime,source:'resonance-plot',...spec});
        return charts?.react?.(target,traces,layout,config);
      }
      function peakPointEntity({customdata}){const id=String(customdata?.[0]||'');const p=peakById(id);return p?{id:String(p.id),type:'resonance.peak',parents:[String(p.sweepId||'')],label:peakLabel(p),ref:{peakId:p.id,sweepId:p.sweepId,datasetPath:p.datasetPath},value:{id:p.id,sweepId:p.sweepId,datasetPath:p.datasetPath,vg:p.vg,direction:p.direction,v:p.v,i:p.i}}:null;}

      function selectionSweepItem(sw){return sw?{type:'resonance.sweep',id:String(sw.id),role:'sweep',value:{id:sw.id,datasetPath:sw.datasetPath,datasetName:sw.datasetName,vg:sw.vg,direction:sw.direction}}:null;}
      function selectionPeakItem(p){return p?{type:'resonance.peak',id:String(p.id),role:'peak',value:{id:p.id,sweepId:p.sweepId,datasetPath:p.datasetPath,vg:p.vg,direction:p.direction,v:p.v,i:p.i,peakOrder:p.peakOrder,peakLabel:peakLabel(p)}}:null;}
      function focusedDatasetPath(snapshot){const focus=snapshot?.focus||snapshot?.items?.at?.(-1)||null;return String(focus?.ref?.datasetPath||focus?.value?.datasetPath||'');}
      function bindLinkedSelectionViews(){
        if(!uiBound||!interactionRuntime?.bindView)return false;
        const list=$('#reswinDatasetList'),legend=$('#resparMainLegend');
        if(list)interactionRuntime.bindView('resonance-dataset-list',list,{selector:'.respar-dataset-item',itemVariant:'row',itemKey:el=>el.dataset.entityId||datasetEntityId(el.dataset.datasetPath),entityLinked:true,revealFocus:true,ignore:'input,select,label,button,a',onActivate:({element})=>{const path=String(element.dataset.datasetPath||'');const current=selectedSweep();const rows=(visibleSweeps().length?visibleSweeps():sweeps).filter(sw=>String(sw.datasetPath)===path);const preferred=current&&String(current.datasetPath)===path?current:(rows.find(sw=>Number(sw.direction)>0)||rows[0]);if(preferred)publishSweepSelection(preferred,'resonance-dataset');}});
        if(legend)interactionRuntime.bindView('resonance-main-legend',legend,{selector:'.respar-legend-chip',itemVariant:'chip',itemKey:el=>el.dataset.entityId||datasetEntityId(el.dataset.datasetPath),entityLinked:true,revealFocus:true,dimOthers:true,horizontalWheel:true,hideScrollbar:true,onActivate:({element})=>{const sw=sweepById(String(element.dataset.sweepId||''));if(sw)publishSweepSelection(sw,'resonance-main-legend');}});
        return true;
      }
      function selectedPeakWidthShapes(){
        const selectedP=selectedPeak();if(!selectedP||workspace.peakDisplay?.showWidth===false)return [];
        const m=peakMetrics(selectedP)||{},left=Number(m.fwhmLeft),right=Number(m.fwhmRight);if(!Number.isFinite(left)||!Number.isFinite(right)||right<=left)return [];
        return [{type:'rect',xref:'x',yref:'paper',x0:left,x1:right,y0:0,y1:1,fillcolor:'rgba(58,96,246,.08)',line:{color:'rgba(58,96,246,.38)',width:1,dash:'dot'},layer:'below'}];
      }
      function renderLinkedSelection({includeGroup=true,controls=false}={}){
        // Selection is Core-owned. D3 main surface receives the current entity IDs
        // through its declarative selection getters, while Plotly ScientificPlot
        // views subscribe to the same Interaction Runtime and restyle themselves.
        // Do not rebuild or privately restyle trend/group plots on focus changes.
        if(controls)renderControls();
        renderSummary();
        if($('#reswinMainPlot')?.offsetParent!==null){const surface=ensureMainSurface();surface?.requestRender?.('entity-selection');}
        if($('#reswinInspectPlot')?.offsetParent!==null)renderInspection();
        if(includeGroup){const context=$('#reswinGroupContext');if(context)context.textContent=groupContextText();}
      }
      function publishSweepSelection(sw,source='resonance-main'){
        if(!sw)return false;selectedSweepId=String(sw.id);selectedPeakId='';selectedPeakIds.clear();
        const candidates=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id&&p.accepted!==false);
        const autoPeak=candidates.length===1?candidates[0]:null;
        if(autoPeak){selectedPeakId=String(autoPeak.id);selectedPeakIds=new Set([selectedPeakId]);}
        if(interactionSelection&&!applyingExternalSelection){
          const item=autoPeak?selectionPeakItem(autoPeak):selectionSweepItem(sw);
          interactionSelection.select(item,{source,context:{datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,autoPeak:!!autoPeak}});
        }else renderLinkedSelection({includeGroup:true,controls:true});
        return true;
      }
      function publishPeakSelection(p,source='resonance-main',{openInspector=false,additive=false}={}){
        if(!p)return false;selectedPeakId=String(p.id);selectedSweepId=String(p.sweepId||selectedSweepId);if(additive)selectedPeakIds.add(selectedPeakId);else selectedPeakIds=new Set([selectedPeakId]);
        if(interactionSelection&&!applyingExternalSelection){interactionSelection.select(selectionPeakItem(p),{source,additive,context:{sweepId:p.sweepId,datasetPath:p.datasetPath,vg:p.vg,direction:p.direction}});}else renderLinkedSelection({includeGroup:true});
        if(openInspector)workspaceNavigator?.('inspect');
        return true;
      }
      function publishRangeSelection(range,source='resonance-main'){
        if(!range)return false;selectedRange={...range};
        if(interactionSelection){
          const selected=peaksInRange(selectedRange).map(selectionPeakItem).filter(Boolean);
          if(interactionSelection.selectRegion)interactionSelection.selectRegion(selectedRange,selected,{rangeType:'resonance.range',source,context:{range:selectedRange,sweepId:selectedRange.sweepId||''}});
          else interactionSelection.setRange(selectedRange,{type:'resonance.range',source});
        }
        return true;
      }
      function applyInteractionSelection(snapshot,meta={}){
        if(!snapshot||applyingExternalSelection)return;
        const focus=snapshot.focus||snapshot.items?.at?.(-1)||null;if(!focus)return;
        const previousSweep=selectedSweepId,previousPeak=selectedPeakId;
        applyingExternalSelection=true;
        try{
          selectedPeakIds=new Set((snapshot.items||[]).filter(item=>item.type==='resonance.peak').map(item=>String(item.id||item.value?.id||'')).filter(Boolean));
          if(focus.type==='resonance.peak'){const p=peakById(focus.id)||peakById(focus.value?.id);if(p){selectedPeakId=p.id;selectedSweepId=p.sweepId;selectedPeakIds.add(String(p.id));}}
          else if(focus.type==='resonance.sweep'){const sw=sweepById(focus.id)||sweepById(focus.value?.id);if(sw){selectedSweepId=sw.id;selectedPeakId='';selectedPeakIds.clear();}}
          const changed=previousSweep!==selectedSweepId||previousPeak!==selectedPeakId;
          if(changed)renderLinkedSelection({includeGroup:meta?.source!=='resonance-group',controls:previousSweep!==selectedSweepId});
          else {if($('#reswinMainPlot')?.offsetParent!==null){const surface=ensureMainSurface();surface?.requestRender?.('resonance-host-resize');}if($('#reswinTrendPlot')?.offsetParent!==null)renderTrend();if($('#reswinInspectPlot')?.offsetParent!==null)renderInspection();}
        }finally{applyingExternalSelection=false;}
      }

      function peaksInRange(range=selectedRange){
        if(!range)return [];const lo=Math.min(Number(range.min),Number(range.max)),hi=Math.max(Number(range.min),Number(range.max));
        return (workspace.peaks||[]).filter(p=>(!range.sweepId||p.sweepId===range.sweepId)&&Number(p.v)>=lo&&Number(p.v)<=hi);
      }
      function setRangeLocked(value){for(const p of peaksInRange())p.locked=!!value;physicsCache={key:'',value:null};renderLinkedSelection();scheduleSnapshot();}
      function setRangeCategory(order){
        const cat=category(order),rows=peaksInRange();if(!rows.length)return false;
        for(const p of rows){p.peakOrder=cat.order;p.peakLabel=cat.label;p.orderAnchor=true;}
        physicsCache={key:'',value:null};render();scheduleSnapshot();setStatus(`已将框选的 ${rows.length} 个峰统一设为 ${cat.label}。`);return true;
      }
      function applyRangeIdentity(order,label=''){
        const n=Math.max(1,Math.round(Number(order)||1)),rows=peaksInRange();if(!rows.length)return false;normalizeCategories();let c=category(n);const text=String(label||'').trim();
        if(text){const cat=(workspace.peakCategories||[]).find(row=>Number(row.order)===n);if(cat)cat.label=text;for(const p of workspace.peaks||[])if(Number(p.peakOrder)===n)p.peakLabel=text;c={...c,label:text};}
        for(const p of rows){p.peakOrder=n;p.peakLabel=c.label;p.manual=true;p.orderAnchor=true;}
        physicsCache={key:'',value:null};render();scheduleSnapshot();setStatus(`已将框选的 ${rows.length} 个峰统一设为 ${c.label}。`);return true;
      }
      function deleteRangePeaks(){const ids=new Set(peaksInRange().filter(p=>!p.locked).map(p=>p.id));workspace.peaks=(workspace.peaks||[]).filter(p=>!ids.has(p.id));if(ids.has(selectedPeakId))selectedPeakId='';for(const id of ids)selectedPeakIds.delete(String(id));physicsCache={key:'',value:null};render();scheduleSnapshot();}
      function installAlgorithmPipeline(){
        if(!pipelineRuntime?.register||!algorithmRuntime||algorithmPipelineInstalled)return false;
        if(!pipelineRuntime.get?.('peaks.detect'))pipelineRuntime.register('peaks.detect',{
          title:'Peak detection via Algorithm Provider',kind:'analysis',execution:'async',allowEmptyInput:true,cache:false,outputTypes:['science.resonance.peak-set'],
          run:async(input,{parameters})=>{const ref=parameters?.algorithmRef||{};const peaks=await algorithmRuntime.run(ref,input,{parameters:parameters?.settings||{},range:parameters?.range||null});return {value:{peaks:Array.isArray(peaks)?peaks:[],algorithm:algorithmRuntime.provenance?.(ref)||null},metadata:{algorithm:algorithmRuntime.provenance?.(ref)||null}};}
        });
        if(!pipelineRuntime.get?.('peaks.metrics'))pipelineRuntime.register('peaks.metrics',{
          title:'Peak metrics via Algorithm Provider',kind:'analysis',execution:'async',allowEmptyInput:true,cache:false,outputTypes:['science.resonance.peak-metrics'],
          run:async(input,{parameters})=>{const ref=parameters?.algorithmRef||{};const metrics=await algorithmRuntime.run(ref,input,{parameters:parameters?.settings||{}});return {value:metrics,metadata:{algorithm:algorithmRuntime.provenance?.(ref)||null}};}
        });
        algorithmPipelineInstalled=true;return true;
      }
      function selectDetectorProvider(providers=[]){
        const active=String(workspace.activeDetector||'');let provider=providers.find(p=>String(p.id)===active)||providers.find(p=>String(p.algorithmId||'')===active)||null;
        if(!provider)provider=providers.find(p=>p.default)||providers[0]||null;
        if(provider&&String(provider.id||'').includes('@')&&String(workspace.activeDetector||'')!==String(provider.id))workspace.activeDetector=String(provider.id);
        return provider;
      }
      async function runPeakDetector(provider,sweep,settings,options={}){
        if(!provider)return S.detectPeaks(sweep,workspace.algorithms||{},options||{});
        const algorithmId=String(provider.algorithmId||provider.id||'').split('@')[0],ref={id:algorithmId,version:String(provider.version||''),category:'peak-detector'};
        installAlgorithmPipeline();
        if(pipelineRuntime?.run&&algorithmRuntime){const result=await pipelineRuntime.run('peaks.detect',sweep,{parameters:{algorithmRef:ref,settings:settings||{},range:options?.range||null},publish:false});return result?.value?.peaks||[];}
        if(provider.detect)return await provider.detect(sweep,settings||{},options||{});
        if(provider.run)return await provider.run(sweep,{parameters:settings||{},...options});
        return S.detectPeaks(sweep,workspace.algorithms||{},options||{});
      }
      function detectorSettingsKey(provider,activeId){return String(provider?.algorithmId||provider?.id||activeId||'').split('@')[0];}
      function detectorSettingsFor(provider,activeId){const base=detectorSettingsKey(provider,activeId);return workspace.detectorSettings?.[activeId]||workspace.detectorSettings?.[base]||workspace.algorithms||{};}
      function algorithmProvenance(provider,category='peak-detector'){const algorithmId=String(provider?.algorithmId||provider?.id||'').split('@')[0],version=String(provider?.version||'');return algorithmRuntime?.provenance?.({id:algorithmId,version,category})||{pluginId:provider?.owner||provider?.pluginId||'',algorithmId,algorithmVersion:version,category,title:provider?.title||provider?.name||algorithmId};}
      async function detectRange(range=selectedRange){
        if(!range)return;
        const lo=Math.min(Number(range.min),Number(range.max)),hi=Math.max(Number(range.min),Number(range.max));
        const targets=range.sweepId?[sweepById(range.sweepId)].filter(Boolean):visibleSweeps();
        if(!targets.length){setStatus('框选范围内没有可见扫描。');return;}
        const providers=detectorRuntime?.list?.()||[];const provider=selectDetectorProvider(providers);const activeId=String(provider?.id||workspace.activeDetector||'');
        const settings=detectorSettingsFor(provider,activeId);
        const inside=new Set(peaksInRange(range).filter(p=>!p.manual&&!p.locked).map(p=>p.id));workspace.peaks=(workspace.peaks||[]).filter(p=>!inside.has(p.id));
        const added=[];let insufficient=0;
        for(const sw of targets){
          const points=(sw.points||[]).filter(p=>Number(p.v)>=lo&&Number(p.v)<=hi);if(points.length<5){insufficient++;continue;}
          const subset={...sw,points};
          try{
            const found=await runPeakDetector(provider,subset,settings,{range:{vMin:lo,vMax:hi}});
            const provenance=algorithmProvenance(provider);
            added.push(...assignDetectedOrders(found||[]).map(p=>({...p,sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,algorithm:provenance,algorithmRef:`${provenance.algorithmId}@${provenance.algorithmVersion}`})));
          }catch(err){console.warn('[resonance range detect]',sw.id,err);}
        }
        workspace.peaks.push(...added);normalizeCategories();
        if(added[0])publishPeakSelection(added[0],'resonance-range');else render();scheduleSnapshot();
        setStatus(`局部寻峰完成：${targets.length-insufficient}/${targets.length} 条扫描，新增 ${added.length} 个峰。`);
      }
      function openRangeMenu(event){
        if(!interactionMenus?.open||!selectedRange)return;const count=peaksInRange().length;
        const categoryItems=(workspace.peakCategories||[]).slice(0,12).map(cat=>({id:`category-${cat.order}`,label:`设为 ${cat.label||`峰${cat.order}`}`,icon:'●',enabled:count>0,onInvoke:()=>setRangeCategory(cat.order)}));
        interactionMenus.open({x:Number(event?.clientX)||window.innerWidth/2,y:Number(event?.clientY)||160,items:[
          {id:'detect',label:'局部寻峰',icon:'⌕',onInvoke:()=>detectRange()},
          {id:'lock',label:`锁定框选峰 (${count})`,icon:'🔒',enabled:count>0,onInvoke:()=>setRangeLocked(true)},
          {id:'unlock',label:`解除框选峰锁定 (${count})`,icon:'🔓',enabled:count>0,onInvoke:()=>setRangeLocked(false)},
          {type:'separator'},...categoryItems,{type:'separator'},
          {id:'delete',label:`删除未锁定框选峰 (${count})`,icon:'×',enabled:count>0,onInvoke:()=>deleteRangePeaks()}
        ]});
      }

      function applyWorkspaceToDatasets(){
        const meta=new Map((workspace.datasetMeta||[]).map(row=>[String(row?.path||''),row]));
        for(const d of datasets){
          const row=meta.get(String(d.path||''));
          if(!row)continue;
          if(finite(row.vg))d.vg=Number(row.vg);
          if(row.name)d.name=String(row.name);
        }
      }

      function rebuild(){
        datasets=parseDatasets(project,artifacts);
        applyWorkspaceToDatasets();
        sweeps=[];
        for(const dataset of datasets){
          try{sweeps.push(...(S.buildSweeps?.(dataset)||[]));}catch(err){console.warn('[resonance window buildSweeps]',dataset?.name,err);}
        }
        if(!sweeps.some(sw=>sw.id===selectedSweepId))selectedSweepId=visibleSweeps()[0]?.id||sweeps[0]?.id||'';
        if(selectedPeakId&&!peakById(selectedPeakId))selectedPeakId='';
        syncEntities();syncDerivedArtifacts();
      }

      function refreshData(){
        rebuild();fitVisibleData('data-refresh');
        if($('#reswinMainPlot'))render();
        return datasets.length;
      }

      function visibilityMap(){
        const map=new Map((workspace.scanVisibility||[]).map(([path,value])=>[String(path),{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
        for(const d of datasets)if(!map.has(String(d.path)))map.set(String(d.path),{forward:true,reverse:true});
        return map;
      }
      function isVisible(sw){
        if(!sw)return false;
        const row=visibilityMap().get(String(sw.datasetPath))||{forward:true,reverse:true};
        return sw.direction>0?row.forward!==false:row.reverse!==false;
      }
      function visibleSweeps(){return sweeps.filter(isVisible);}
      function visibleSweepIds(){return visibleSweeps().map(sw=>sw.id);}
      function selectedSweep(){return sweeps.find(sw=>sw.id===selectedSweepId)||visibleSweeps()[0]||sweeps[0]||null;}
      function selectedPeak(){return peakById(selectedPeakId);}

      function normalizeCategories(){
        const by=new Map();
        for(const c of workspace.peakCategories||[]){
          const order=Math.max(1,Math.round(Number(c?.order)||1));
          if(!by.has(order))by.set(order,{order,label:String(c?.label||`峰${order}`)});
        }
        for(const p of workspace.peaks||[]){
          const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
          if(!by.has(order))by.set(order,{order,label:String(p.peakLabel||`峰${order}`)});
          p.peakOrder=order;
          p.peakLabel=String(p.peakLabel||by.get(order).label);
          if(p.accepted===undefined)p.accepted=true;
          if(p.manual===undefined)p.manual=false;
          if(p.locked===undefined)p.locked=false;
        }
        workspace.peakCategories=[...by.values()].sort((a,b)=>a.order-b.order);
      }
      function category(order){
        normalizeCategories();
        const n=Math.max(1,Math.round(Number(order)||1));
        return workspace.peakCategories.find(c=>Number(c.order)===n)||{order:n,label:`峰${n}`};
      }
      function peakLabel(p){return String(p?.peakLabel||category(p?.peakOrder||1).label||`峰${p?.peakOrder||1}`);}
      const COOL=['#0057D9','#00A6A6','#6D28D9','#0EA5E9','#1E3A8A','#14B8A6','#7C3AED','#0369A1','#22D3EE','#4338CA','#0F766E','#60A5FA'];
      const WARM=['#D7191C','#FF7A00','#C2185B','#F2B705','#8B1E3F','#F4511E','#E11D48','#CA8A04','#FF3D00','#A21CAF','#B91C1C','#FB923C'];
      function colorForPeakOrder(order,direction){const n=Math.max(1,Math.round(Number(order)||1));const palette=direction>0?COOL:WARM;return palette[(n-1)%palette.length];}
      function assignPeakCategory(p,order){if(!p)return;const n=Math.max(1,Math.round(Number(order)||1));const c=category(n);p.peakOrder=n;p.peakLabel=c.label;p.manual=true;normalizeCategories();render();scheduleSnapshot();}
      function createPeakCategoryForPeak(p){if(!p)return null;normalizeCategories();const n=Math.max(0,...workspace.peakCategories.map(c=>Number(c.order)||0))+1;const c={order:n,label:`峰${n}`};workspace.peakCategories.push(c);p.peakOrder=n;p.peakLabel=c.label;p.manual=true;render();scheduleSnapshot();return c;}
      function renamePeakCategory(p,label){if(!p)return;selectedPeakId=p.id;renameSelectedCategory(label);}

      function transformDefinitions(){return transforms?.list?.({supportsScalarField:true})?.filter?.(row=>row?.public!==false&&(!row.tags?.length||row.tags.includes('transport')))||[];}
      function transformOptionsHtml(selected='raw'){const rows=transformDefinitions();const source=rows.length?rows:[{id:'raw',title:'原始 I–V'},{id:'detrend',title:'去背景 I−Ibg'},{id:'didv',title:'dI/dV'},{id:'d2idv2',title:'d²I/dV²'},{id:'dlog',title:'d ln|I|/dV'},{id:'dvdi',title:'dV/dI'},{id:'resistance',title:'R=|V/I|'}];return source.map(row=>`<option value="${esc(row.id)}" ${String(row.id)===String(selected)?'selected':''}>${esc(row.title||row.label||row.id)}</option>`).join('');}
      function currentTransform(sw){
        const map=new Map(workspace.transformPreviewByDataset||[]),requested=String(map.get(sw?.datasetPath)||'raw');
        return transforms?.resolve?.(requested)?.id||requested;
      }
      function setTransform(type){
        const sw=selectedSweep();if(!sw)return;
        const map=new Map(workspace.transformPreviewByDataset||[]);
        map.set(sw.datasetPath,String(type||'raw'));
        workspace.transformPreviewByDataset=[...map.entries()];
        render();scheduleSnapshot();
      }

      function setDatasetVg(path,value){
        if(!finite(value))return;
        const next=Number(value);
        const rows=workspace.datasetMeta||[];
        const row=rows.find(x=>String(x.path)===String(path));
        if(row)row.vg=next;else rows.push({path,vg:next});
        for(const d of datasets)if(String(d.path)===String(path))d.vg=next;
        rebuild();
        const vgByPath=new Map(datasets.map(d=>[String(d.path),Number(d.vg)]));
        for(const p of workspace.peaks||[])if(vgByPath.has(String(p.datasetPath)))p.vg=vgByPath.get(String(p.datasetPath));
        render();scheduleSnapshot();
      }

      function fitVisibleData(reason='visibility'){
        workspace.mainView={xDomain:null,yDomain:null};
        mainSurface?.fitToData?.({source:'resonance',reason});
      }
      function setVisibility(path,direction,value){
        const map=visibilityMap();
        const row=map.get(String(path))||{forward:true,reverse:true};
        if(direction>0)row.forward=!!value;else row.reverse=!!value;
        map.set(String(path),row);workspace.scanVisibility=[...map.entries()];
        if(!isVisible(selectedSweep()))selectedSweepId=visibleSweeps()[0]?.id||sweeps[0]?.id||'';
        fitVisibleData('visibility');render();scheduleSnapshot();
      }
      function setAllVisibility(value){
        const map=visibilityMap();
        const mode=typeof value==='string'?value:(value?'all':'none');
        for(const d of datasets)map.set(String(d.path),{forward:mode==='all'||mode==='forward',reverse:mode==='all'||mode==='reverse'});
        workspace.scanVisibility=[...map.entries()];
        const next=visibleSweeps()[0]||sweeps[0]||null;if(next&&!isVisible(selectedSweep()))selectedSweepId=next.id;
        fitVisibleData('visibility-all');render();scheduleSnapshot();
      }

      function assignDetectedOrders(rows){
        const ordered=rows.slice().sort((a,b)=>Number(a.v)-Number(b.v));
        ordered.forEach((peak,index)=>{const order=index+1,c=category(order);peak.peakOrder=order;peak.peakLabel=c.label;});
        normalizeCategories();
        return ordered;
      }
      function setPreset(name){workspace.algorithms={...(S.preset?.(name)||workspace.algorithms||{}),_preset:String(name||'balanced')};renderControls();scheduleSnapshot();}

      async function runDetection(scope='selected'){
        const targets=scope==='all'?visibleSweeps():[selectedSweep()].filter(Boolean);
        if(!targets.length){setStatus('没有可寻峰的可见扫描。');return;}
        const targetIds=new Set(targets.map(sw=>sw.id));
        const preserved=(workspace.peaks||[]).filter(p=>!targetIds.has(p.sweepId)||p.manual||p.locked);
        const added=[];
        const providers=detectorRuntime?.list?.()||[];
        const provider=selectDetectorProvider(providers);
        const activeId=String(provider?.id||workspace.activeDetector||'');
        for(const sw of targets){
          try{
            const settings=detectorSettingsFor(provider,activeId);
            const peaks=await runPeakDetector(provider,sw,settings,{});
            const provenance=algorithmProvenance(provider);
            added.push(...assignDetectedOrders(peaks||[]).map(p=>({...p,algorithm:provenance,algorithmRef:`${provenance.algorithmId}@${provenance.algorithmVersion}`})));
          }catch(err){console.warn('[resonance window detect]',sw.id,err);}
        }
        workspace.peaks=preserved.concat(added);normalizeCategories();selectedPeakId=added[0]?.id||selectedPeakId;
        render();scheduleSnapshot();
        setStatus(`寻峰完成：${targets.length} 条扫描，新增 ${added.length} 个自动峰。`);
      }

      function addManualPeak(v){
        const sw=selectedSweep();if(!sw||!sw.points?.length||!finite(v))return;
        let best=sw.points[0],bestIndex=0,bestDist=Math.abs(Number(best.v)-Number(v));
        sw.points.forEach((p,index)=>{const dist=Math.abs(Number(p.v)-Number(v));if(dist<bestDist){best=p;bestIndex=index;bestDist=dist;}});
        const existing=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id);
        const order=Math.max(1,...existing.map(p=>Number(p.peakOrder)||0))+1;
        const c=category(order),leftIndex=Math.max(0,bestIndex-3),rightIndex=Math.min(sw.points.length-1,bestIndex+3);
        const widthLeft=Number(sw.points[leftIndex]?.v),widthRight=Number(sw.points[rightIndex]?.v);
        const peak={
          id:`${sw.id}::manual::${Date.now()}::${Math.random().toString(36).slice(2,7)}`,
          sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,
          index:bestIndex,v:best.v,i:best.i,accepted:true,manual:true,locked:false,
          algorithms:['manual'],primaryAlgorithm:'manual',score:1,confidence:1,
          widthLeft,widthRight,fwhm:Math.abs(widthRight-widthLeft),peakOrder:order,peakLabel:c.label,customColor:null
        };
        workspace.peaks.push(peak);normalizeCategories();selectedPeakId=peak.id;
        render();scheduleSnapshot();setStatus(`已在 Vd=${Number(best.v).toPrecision(6)} V 添加手动峰。`);
      }

      function updatePeak(id,patch){
        const peak=peakById(id);if(!peak)return;
        Object.assign(peak,patch||{});normalizeCategories();render();scheduleSnapshot();
      }
      function deletePeak(id){
        workspace.peaks=(workspace.peaks||[]).filter(p=>p.id!==id);
        if(selectedPeakId===id)selectedPeakId='';
        render();scheduleSnapshot();
      }
      function renameSelectedCategory(label){
        const p=selectedPeak();if(!p)return;
        const next=String(label||'').trim();if(!next)return;
        const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
        const c=workspace.peakCategories.find(row=>Number(row.order)===order)||{order,label:next};
        if(!workspace.peakCategories.includes(c))workspace.peakCategories.push(c);
        c.label=next;
        for(const peak of workspace.peaks||[])if(Number(peak.peakOrder)===order)peak.peakLabel=next;
        normalizeCategories();render();scheduleSnapshot();
      }

      function sortPeakOrderByVd(){
        const rows=visibleSweeps().map(sw=>({sw,peaks:(workspace.peaks||[]).filter(p=>p.sweepId===sw.id&&p.accepted!==false).sort((a,b)=>a.v-b.v)})).filter(r=>r.peaks.length);
        if(!rows.length)return;
        try{
          const solved=S.solvePeakTracks?.(rows,{requestedSweep:selectedSweep()});
          if(solved?.assignments){
            for(const row of rows){
              const tracks=solved.assignments.get(row.sw.id);if(!tracks)continue;
              row.peaks.forEach((p,j)=>{const k=tracks[j];if(k===undefined)return;const order=k+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
            }
          }else{
            for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
          }
        }catch{
          for(const row of rows)row.peaks.forEach((p,index)=>{const order=index+1,c=category(order);p.peakOrder=order;p.peakLabel=c.label;});
        }
        normalizeCategories();render();scheduleSnapshot();setStatus('已按跨 Vg 峰轨迹重新整理峰序。');
      }

      function datasetRowsHtml(){
        const vis=visibilityMap();
        return datasets.map(d=>{
          const row=vis.get(String(d.path))||{forward:true,reverse:true},transform=new Map(workspace.transformPreviewByDataset||[]).get(String(d.path))||'raw';
          return `<div class="respar-dataset-item" data-dataset-path="${esc(d.path)}" data-entity-id="${esc(datasetEntityId(d.path))}" data-selection-key="${esc(datasetEntityId(d.path))}"><input class="reswin-master" type="checkbox" ${row.forward!==false&&row.reverse!==false?'checked':''}><div class="respar-dataset-content"><div class="respar-dataset-title" title="${esc(d.path)}">${esc(d.name||d.path||'数据')}</div><label class="respar-dataset-vg" title="可直接修改该数据组的栅压标记"><span>Vg</span><input class="reswin-vg" type="number" step="any" value="${finite(d.vg)?Number(d.vg):''}" placeholder="?"><span>V</span></label><div class="respar-scan-toggle"><label><input class="reswin-forward" type="checkbox" ${row.forward!==false?'checked':''}> 正扫</label><label><input class="reswin-reverse" type="checkbox" ${row.reverse!==false?'checked':''}> 反扫</label></div><label class="respar-dataset-transform" title="只改变检查器中的辅助视图；主图与峰位始终使用原始 I–V"><span>辅助</span><select class="reswin-dataset-transform">${transformOptionsHtml(transform)}</select></label></div></div>`;
        }).join('')||'<div class="empty-state">工程中没有数据。</div>';
      }

      function renderControls(){
        const list=$('#reswinDatasetList');if(list){
          list.innerHTML=datasetRowsHtml();
          list.querySelectorAll('.respar-dataset-item').forEach(row=>{
            const path=row.dataset.datasetPath;
            row.querySelector('.reswin-vg')?.addEventListener('click',e=>e.stopPropagation());
            row.querySelector('.reswin-vg')?.addEventListener('change',e=>setDatasetVg(path,e.target.value));
            const master=row.querySelector('.reswin-master');if(master){const state=visibilityMap().get(String(path))||{forward:true,reverse:true};master.indeterminate=state.forward!==state.reverse;master.addEventListener('change',e=>{const map=visibilityMap(),next=map.get(String(path))||{forward:true,reverse:true};next.forward=next.reverse=!!e.target.checked;map.set(String(path),next);workspace.scanVisibility=[...map.entries()];fitVisibleData('visibility-master');render();scheduleSnapshot();});}
            row.querySelector('.reswin-forward')?.addEventListener('change',e=>setVisibility(path,1,e.target.checked));
            row.querySelector('.reswin-reverse')?.addEventListener('change',e=>setVisibility(path,-1,e.target.checked));
            const tr=row.querySelector('.reswin-dataset-transform');if(tr){tr.value=new Map(workspace.transformPreviewByDataset||[]).get(String(path))||'raw';tr.addEventListener('change',e=>{const map=new Map(workspace.transformPreviewByDataset||[]);map.set(String(path),String(e.target.value||'raw'));workspace.transformPreviewByDataset=[...map.entries()];renderLinkedSelection({includeGroup:false});scheduleSnapshot();});}
          });
        }
        for(const id of ['reswinSweepSelect','reswinInspectSweepSelect']){
          const sweep=$("#"+id);if(!sweep)continue;
          const rows=visibleSweeps().length?visibleSweeps():sweeps;
          sweep.innerHTML=rows.map(sw=>`<option value="${esc(sw.id)}">${esc(sw.datasetName)} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}</option>`).join('');
          if(rows.some(sw=>sw.id===selectedSweepId))sweep.value=selectedSweepId;
        }
        const preset=$('#reswinPreset');if(preset)preset.value=workspace.algorithms?._preset||'balanced';
        const transform=$('#reswinTransform');if(transform)transform.value=currentTransform(selectedSweep());
        const display=workspace.peakDisplay||{};
        const rejected=$('#reswinShowRejected');if(rejected)rejected.checked=display.showRejected===true;
        const width=$('#reswinShowWidth');if(width)width.checked=display.showWidth!==false;
        const points=$('#reswinShowPoints');if(points)points.checked=display.showPoints!==false;
        const physics=$('#reswinPhysicsLabels');if(physics)physics.checked=workspace.physicsShowLabels!==false;
        const legend=$('#reswinPeakLegend');if(legend){const cats=(workspace.peakCategories||[]).slice().sort((a,b)=>Number(a.order)-Number(b.order));legend.innerHTML=cats.length?cats.map(cat=>`<span><i style="background:${esc(colorForPeakOrder(cat.order,1))}"></i>${esc(cat.label||`峰${cat.order}`)}</span>`).join(''):'<span>尚无峰类别</span>';}
      }

      function nearestSweepAtPixel(px,py,x,y,rows,maxDistancePx=18){
        if(!rows?.length)return null;
        const targetV=x.invert(px);let best=null;
        for(const sw of rows){
          const points=sw.points||[];if(!points.length)continue;
          const idx=S.nearestIndex?.(points.map(p=>p.v),targetV)??0;
          for(let j=Math.max(0,idx-2);j<=Math.min(points.length-1,idx+2);j++){
            const p=points[j],dx=x(Number(p.v))-px,dy=y(Number(p.i))-py,dist=Math.hypot(dx,dy);
            if(!best||dist<best.distance)best={sw,point:p,index:j,distance:dist};
          }
        }
        return best&&best.distance<=maxDistancePx?best:null;
      }
      function scaleDomainAround(domain,center,factor,minSpan=1e-12){
        const lo=center+(domain[0]-center)*factor,hi=center+(domain[1]-center)*factor;
        return Number.isFinite(lo)&&Number.isFinite(hi)&&Math.abs(hi-lo)>=minSpan?[lo,hi]:domain.slice();
      }
      function peakColor(p){return p?.customColor||colorForPeakOrder(p?.peakOrder||1,p?.direction||1);}
      function d3SymbolType(algorithm){
        const d3=window.d3;return ({raw:d3?.symbolCircle,snr:d3?.symbolDiamond,diff:d3?.symbolTriangle,detrend:d3?.symbolSquare,curvature:d3?.symbolCross,matched:d3?.symbolCircle,manual:d3?.symbolStar})[algorithm]||d3?.symbolCircle;
      }
      function markerPath(p,selected=false){const d3=window.d3;return d3?.symbol?.().type(d3SymbolType(p?.primaryAlgorithm)).size(selected?180:105)()||'';}
      function movePeakToIndex(p,sw,index){
        const points=sw?.points||[];if(!p||!points.length)return;
        const idx=Math.max(0,Math.min(points.length-1,Number(index)||0)),pt=points[idx],oldV=Number(p.v);
        p.index=Number.isFinite(Number(pt.index))?Number(pt.index):idx;p.v=Number(pt.v);p.i=Number(pt.i);p.manual=true;
        const delta=Number(p.v)-oldV;if(Number.isFinite(delta)){if(Number.isFinite(Number(p.widthLeft)))p.widthLeft=Number(p.widthLeft)+delta;if(Number.isFinite(Number(p.widthRight)))p.widthRight=Number(p.widthRight)+delta;if(Number.isFinite(Number(p.analysisLeft)))p.analysisLeft=Number(p.analysisLeft)+delta;if(Number.isFinite(Number(p.analysisRight)))p.analysisRight=Number(p.analysisRight)+delta;}
        physicsCache={key:'',value:null};
      }
      function clearMainRangeMenu({keepSelection=false}={}){
        $('#resparRangeMenu')?.classList.add('hidden');
        if(!keepSelection)selectedRange=null;
      }
      function showMainRangeMenu(range,event){
        selectedRange={...range};publishRangeSelection({axis:'Vd',min:range.vMin,max:range.vMax,sweepId:range.sweepId||''},'resonance-main-range');
        const menu=$('#resparRangeMenu'),wrap=$('#resparMainPlotWrap');if(!menu||!wrap)return;
        const count=peaksInRange(selectedRange).length,targets=range.sweepId?1:visibleSweeps().length;
        const summary=$('#resparRangeSummary');if(summary)summary.textContent=`Vd ${fmt(range.vMin,4)} ~ ${fmt(range.vMax,4)} V · 框内 ${count} 个峰 · 局部寻峰作用于${range.sweepId?'当前曲线':`${targets} 条可见曲线`}`;
        const orderSelect=$('#resparRangeOrder'),labelInput=$('#resparRangeLabel');normalizeCategories();
        if(orderSelect){const rows=workspace.peakCategories||[];orderSelect.innerHTML=rows.map(c=>`<option value="${Number(c.order)}">${esc(c.label||`峰${c.order}`)}</option>`).join('');const selected=peaksInRange(range)[0];if(selected&&rows.some(c=>Number(c.order)===Number(selected.peakOrder)))orderSelect.value=String(selected.peakOrder);}
        if(labelInput){const selected=peaksInRange(range)[0];labelInput.value=selected?peakLabel(selected):'';}
        menu.classList.remove('hidden');
        dom.frame(()=>{const wr=wrap.getBoundingClientRect(),mr=menu.getBoundingClientRect();const cx=Number(event?.clientX)||wr.left+wr.width/2,cy=Number(event?.clientY)||wr.top+90;menu.style.left=`${Math.max(8,Math.min(wr.width-mr.width-8,cx-wr.left+8))}px`;menu.style.top=`${Math.max(42,Math.min(wr.height-mr.height-8,cy-wr.top+8))}px`;});
      }
      function compactLegendNumber(value,maxDigits=6){
        const n=Number(value);if(!Number.isFinite(n))return '?';
        const normalized=Object.is(n,-0)?0:n;
        return new Intl.NumberFormat('zh-CN',{useGrouping:false,maximumSignificantDigits:Math.max(1,Math.min(12,Number(maxDigits)||6))}).format(normalized);
      }
      function renderMainLegend(curveColor){
        const host=$('#resparMainLegend');if(!host)return;host.innerHTML='';
        const current=selectedSweep();
        for(const ds of datasets){
          const visible=visibilityMap().get(String(ds.path))||{forward:true,reverse:true};if(!visible.forward&&!visible.reverse)continue;
          const candidates=sweeps.filter(sw=>sw.datasetPath===ds.path&&isVisible(sw)),preferred=current?.datasetPath===ds.path?current:(candidates.find(sw=>sw.direction>0)||candidates[0]);
          const chip=dom.create('button');chip.type='button';chip.className='respar-legend-chip';chip.dataset.datasetPath=String(ds.path||'');chip.dataset.entityId=datasetEntityId(ds.path);chip.dataset.selectionKey=datasetEntityId(ds.path);chip.dataset.sweepId=String(preferred?.id||'');
          const c=curveColor(Number.isFinite(Number(ds.vg))?Number(ds.vg):0),dash=preferred?.direction<0?' reverse':'';
          chip.innerHTML=`<i class="respar-legend-line${dash}" style="color:${esc(c)}"></i><span>${compactLegendNumber(ds.vg)} V</span>`;chip.title=`${ds.name||ds.path}${preferred?` · ${directionName(preferred.direction)}`:''}`;
          host.appendChild(chip);
        }
      }
      function peakMarkerShape(p){return ({raw:'circle',snr:'diamond',diff:'triangle',detrend:'square',curvature:'cross',matched:'circle',manual:'star'})[p?.primaryAlgorithm]||'circle';}
      function mainSurfaceMarkers(){
        const display=workspace.peakDisplay||{},visibleIds=new Set(visibleSweepIds());if(display.showPoints===false)return [];
        return (workspace.peaks||[]).filter(p=>visibleIds.has(p.sweepId)&&(p.accepted!==false||display.showRejected===true)).map(p=>({id:String(p.id),entityId:String(p.id),curveId:String(p.sweepId),x:Number(p.v),y:Number(p.i),color:peakColor(p),locked:!!p.locked,accepted:p.accepted!==false,shape:peakMarkerShape(p),source:p}));
      }
      function markerWidthSpec(marker){
        const p=marker?.source,sw=p?sweepById(p.sweepId):null;if(!p||!sw)return null;const m=peakMetrics(p)||{};
        const sign=Math.sign(Number(p.i)||1)||1,baselineAt=xv=>Math.max(0,(Number(m.baselineSlope)||0)*Number(xv)+(Number.isFinite(Number(m.baselineIntercept))?Number(m.baselineIntercept):Number(m.baseline)||0));
        const left=Number(m.fwhmLeft),right=Number(m.fwhmRight),halfResidual=Number(m.halfResidual);
        const windowLeft=Number(m.analysisLeft),windowRight=Number(m.analysisRight);if(!Number.isFinite(windowLeft)||!Number.isFinite(windowRight)||windowRight<=windowLeft)return null;
        return {left,right,yLeft:Number.isFinite(left)&&Number.isFinite(halfResidual)?sign*(baselineAt(left)+halfResidual):NaN,yRight:Number.isFinite(right)&&Number.isFinite(halfResidual)?sign*(baselineAt(right)+halfResidual):NaN,windowLeft,windowRight,baseline:{x1:windowLeft,y1:sign*baselineAt(windowLeft),x2:windowRight,y2:sign*baselineAt(windowRight)},handlePosition:'top'};
      }
      function ensureMainSurface(){
        const node=$('#reswinMainPlot');if(!node)return null;if(mainSurface&&mainSurface.target===node)return mainSurface;mainSurface?.dispose?.();mainSurface=null;
        const factory=uiRuntime?.scientificPlot;if(!factory?.create)return null;
        mainSurface=factory.create(node,{
          container:'#resparMainPlotWrap',minWidth:260,minHeight:180,margin:{top:62,right:30,bottom:50,left:78},xTitle:'Vd (V)',yTitle:'I (A)',xValue:p=>p?.v,yValue:p=>p?.i,
          yTickFormat:v=>{const a=Math.abs(v);return a>=1e-6?`${(v*1e6).toFixed(1)}μA`:a>=1e-9?`${(v*1e9).toFixed(1)}nA`:`${(v*1e12).toFixed(0)}pA`;},
          interaction:interactionRuntime,source:'resonance-main',
          getCurves:()=>visibleSweeps().map(sw=>({id:String(sw.id),entityId:String(sw.id),points:sw.points||[],colorValue:finite(sw.vg)?Number(sw.vg):0,direction:Number(sw.direction),source:sw})),
          getColorDomainValues:()=>datasets.map(ds=>finite(ds?.vg)?Number(ds.vg):null).filter(Number.isFinite),
          getMarkers:()=>mainSurfaceMarkers(),
          getView:()=>workspace.mainView||{xDomain:null,yDomain:null},setView:(next,meta)=>{workspace.mainView={xDomain:Array.isArray(next?.xDomain)?next.xDomain.slice():null,yDomain:Array.isArray(next?.yDomain)?next.yDomain.slice():null};if(meta?.reason==='box-zoom'){scheduleSnapshot();setStatus('Ctrl+框选缩放完成；滚轮可继续围绕鼠标缩放，双击或 R 恢复。');}},
          getRangeSelection:()=>selectedRange?{xMin:selectedRange.min,xMax:selectedRange.max}:null,showMarkers:()=>workspace.peakDisplay?.showPoints!==false,showWidth:()=>workspace.peakDisplay?.showWidth!==false,
          getMarkerWidth:marker=>markerWidthSpec(marker),
          onColorScale:scale=>renderMainLegend(scale),
          onCurveSelect:({curve})=>{clearMainRangeMenu();const sw=curve?.source;if(sw)publishSweepSelection(sw,'resonance-main');},
          onCurveModifiedClick:({curve,x,event})=>{clearMainRangeMenu();const sw=curve?.source;if(!sw)return;selectedSweepId=sw.id;publishSweepSelection(sw,'resonance-main-manual');addManualPeak(Number(x));workspaceNavigator?.('inspect');},
          onCurveDoubleClick:({curve})=>{const sw=curve?.source;if(sw){publishSweepSelection(sw,'resonance-main');workspaceNavigator?.('inspect');}},
          onMarkerSelect:({marker,additive})=>{const p=marker?.source;if(p){clearMainRangeMenu();publishPeakSelection(p,'resonance-main',{openInspector:true,additive});}},
          onMarkerDoubleClick:({marker})=>{const p=marker?.source;if(p)publishPeakSelection(p,'resonance-main',{openInspector:true});},
          onMarkerDelete:({marker})=>{const p=marker?.source;if(!p)return;const label=`${directionName(p.direction)} · ${peakLabel(p)}`;deletePeak(p.id);setStatus(`已删除 ${label}。`);},
          onLockedMarkerAction:()=>setStatus('该峰位已锁定。'),
          onMarkerHover:({marker,event,phase})=>{const tip=$('#resparHoverTip');if(!tip)return;if(phase==='leave'){tip.classList.add('hidden');return;}const p=marker?.source;if(!p)return;if(phase==='enter'){tip.innerHTML=`<b>${esc(directionName(p.direction))} · ${esc(peakLabel(p))}</b><br>Vg=${fmt(p.vg,4)} V · Vd=${fmt(p.v,6)} V<br>I=${fmt(p.i,6)} A${p.locked?' · 已锁定':''}`;tip.classList.remove('hidden');}const wrap=$('#resparMainPlotWrap'),wr=wrap?.getBoundingClientRect?.();if(wr){tip.style.left=`${event.clientX-wr.left+12}px`;tip.style.top=`${event.clientY-wr.top+12}px`; }},
          onMarkerDragStart:({marker})=>{const p=marker?.source;if(!p)return;selectedSweepId=p.sweepId;selectedPeakId=p.id;selectedPeakIds=new Set([String(p.id)]);},
          onMarkerDrag:({marker,curve,index})=>{const p=marker?.source,sw=curve?.source;if(!p||!sw)return;movePeakToIndex(p,sw,index);},
          onMarkerDragEnd:({marker})=>{const p=marker?.source;if(!p)return;publishPeakSelection(p,'resonance-peak-drag');if($('#reswinInspectorBody')?.offsetParent!==null)renderInspection();scheduleSnapshot();setStatus(`已移动 ${directionName(p.direction)} · ${peakLabel(p)} 至 Vd=${fmt(p.v,6)} V。`);},
          onWidthDrag:({marker,side,point})=>{const p=marker?.source,sw=p?sweepById(p.sweepId):null;if(!p||!point||!sw)return;const snap=Number(point.v);if(!Number.isFinite(snap))return;const xs=(sw.points||[]).map(q=>Number(q.v)).filter(Number.isFinite);if(!xs.length)return;const dataLo=Math.min(...xs),dataHi=Math.max(...xs),minGap=Math.max(Math.abs(Number(sw.step)||0.01)*3,1e-12);if(side==='left')p.analysisLeft=Math.max(dataLo,Math.min(snap,Number(p.v)-minGap));else p.analysisRight=Math.min(dataHi,Math.max(snap,Number(p.v)+minGap));const m=peakMetrics(p)||{};if(!Number.isFinite(Number(p.analysisLeft)))p.analysisLeft=Number(m.analysisLeft);if(!Number.isFinite(Number(p.analysisRight)))p.analysisRight=Number(m.analysisRight);p.analysisManual=true;physicsCache={key:'',value:null};},
          onWidthReset:({marker})=>{const p=marker?.source;if(!p)return;delete p.analysisLeft;delete p.analysisRight;delete p.analysisManual;physicsCache={key:'',value:null};renderMainScientific();if($('#reswinInspectorBody')?.offsetParent!==null)renderInspection();scheduleSnapshot();setStatus('已恢复自动 FWHM 分析窗口。');},
          onWidthDragEnd:()=>{if($('#reswinInspectorBody')?.offsetParent!==null)renderInspection();scheduleSnapshot();},
          onRangeStart:()=>clearMainRangeMenu(),
          onWheelZoomStart:()=>clearMainRangeMenu({keepSelection:true}),
          onRangeSelect:({xMin,xMax,yMin,yMax,event})=>showMainRangeMenu({vMin:xMin,vMax:xMax,iMin:yMin,iMax:yMax,min:xMin,max:xMax,sweepId:selectedSweepId||''},event),
          onClearSelection:()=>{selectedSweepId='';selectedPeakId='';selectedPeakIds.clear();interactionSelection?.clear?.({source:'resonance-main'});renderMainPlot();},
          onReset:()=>{workspace.mainView={xDomain:null,yDomain:null};clearMainRangeMenu();scheduleSnapshot();setStatus('主图已恢复全部当前可见数据。');},
          onEmpty:({svg,width,height})=>{$('#resparMainLegend').innerHTML='';svg.append('text').attr('x',width/2).attr('y',height/2).attr('text-anchor','middle').attr('fill','#6b7280').text('请勾选要显示的正扫/反扫数据');},
          afterRender:({dataLayer,x,y,markers})=>{if(workspace.physicsShowLabels===false||workspace.peakDisplay?.showPoints===false)return;try{const ph=physicalAnalysis(),colors={R:'#167d4a',H:'#7c3aed',D:'#d97706',X:'#b91c1c',Q:'#64748b'},hasSelection=!!selectedSweepId;dataLayer.append('g').selectAll('text.respar-physics-label').data(markers.filter(m=>m.accepted!==false),m=>m.id).join('text').attr('class','respar-physics-label').attr('x',m=>x(Number(m.x))+8).attr('y',m=>y(Number(m.y))-8).attr('opacity',m=>hasSelection?(String(m.curveId)===String(selectedSweepId)?1:.08):.92).attr('fill',m=>colors[ph?.peakMap?.get?.(m.id)?.code||'Q']).text(m=>{const code=ph?.peakMap?.get?.(m.id)?.code||'Q';return code==='Q'?'?':code;});}catch{} }
        });
        return mainSurface;
      }
      function resetMainView(){workspace.mainView={xDomain:null,yDomain:null};clearMainRangeMenu();const surface=ensureMainSurface();if(surface)surface.resetView();else{renderMainPlot();scheduleSnapshot();setStatus('主图已恢复全部当前可见数据。');}return true;}
      function renderMainPlot(){const surface=ensureMainSurface();if(surface){surface.render('resonance');return;}const node=$('#reswinMainPlot'),wrap=$('#resparMainPlotWrap');if(!node||!wrap)return;const rect=wrap.getBoundingClientRect(),width=Math.round(rect.width),height=Math.round(rect.height);node.replaceChildren();node.setAttribute('width',String(Math.max(0,width)));node.setAttribute('height',String(Math.max(0,height)));const text=dom.createNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',String(Math.max(0,width)/2));text.setAttribute('y',String(Math.max(0,height)/2));text.setAttribute('text-anchor','middle');text.setAttribute('fill','#b91c1c');text.textContent='ScientificCurveSurface 基座未就绪';node.appendChild(text);}

      function groupSeries(){
        if(!sharedController)return [];
        return sharedController.buildTrendModel().series.map(sr=>({...sr,peaks:sr.points.map(row=>row._peak).filter(Boolean)}));
      }

      function renderTrend(){
        const plot=$('#reswinTrendPlot');if(!plot||!charts)return;
        const traces=groupSeries().map(sr=>({x:sr.peaks.map(p=>p.vg),y:sr.peaks.map(p=>p.v),mode:'lines+markers',name:sr.name,line:{color:sr.color,dash:sr.direction<0?'dash':'solid'},marker:{color:sr.color,size:7,line:{width:1}},customdata:sr.peaks.map(p=>[p.id,p.sweepId]),hovertemplate:'Vg=%{x}<br>Vpk=%{y:.6g} V<extra></extra>'}));
        scientificReact(plot,traces,{margin:{l:62,r:20,t:36,b:50},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'Vpk (V)',gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.2},autosize:true},{responsive:true,displaylogo:false},{pointEntity:peakPointEntity,onEntitySelect:({entity,event})=>{const p=peakById(entity?.id);if(p)publishPeakSelection(p,'resonance-trend',{openInspector:true,additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
      }

      function metricProvider(){const rows=algorithmRuntime?.list?.({category:'peak-metrics'})||[];const active=String(workspace.activeMetricAlgorithm||'');let row=rows.find(x=>`${x.id}@${x.version}`===active)||rows.find(x=>x.id===active)||rows.find(x=>x.default)||rows[0]||null;if(row&&!workspace.activeMetricAlgorithm)workspace.activeMetricAlgorithm=`${row.id}@${row.version}`;return row;}
      function metricSignature(p,sw,row){return [p?.id,p?.v,p?.i,p?.analysisLeft,p?.analysisRight,p?.analysisManual,sw?.id,sw?.step,row?.id,row?.version].join('|');}
      function scheduleMetricRefresh(rows=[]){for(const p of rows||[])void refreshPeakMetric(p);}
      async function refreshPeakMetric(p){
        const sw=sweepById(p?.sweepId),provider=metricProvider();if(!p||!sw||!provider)return null;
        const signature=metricSignature(p,sw,provider),cached=peakMetricCache.get(p);if(cached?.signature===signature){if(cached.value)return cached.value;if(cached.promise)return cached.promise;}
        const ref={id:provider.id,version:provider.version,category:'peak-metrics'};installAlgorithmPipeline();
        const promise=(async()=>{try{let value;if(pipelineRuntime?.run&&algorithmRuntime){const result=await pipelineRuntime.run('peaks.metrics',{peak:p,sweep:sw},{parameters:{algorithmRef:ref,settings:{}},publish:false});value=result?.value;}else value=await provider.run?.({peak:p,sweep:sw},{parameters:{}});if(value&&typeof value==='object'){value={...value,algorithm:algorithmRuntime?.provenance?.(ref)||{pluginId:provider.owner||'',algorithmId:provider.id,algorithmVersion:provider.version,category:'peak-metrics',title:provider.title||provider.id}};peakMetricCache.set(p,{signature,value,promise:null});if(!metricRenderFrame){const flushMetricRender=()=>{metricRenderFrame=null;if($('#reswinMainPlot'))render();};if(dom?.frame)metricRenderFrame=dom.frame(flushMetricRender);else flushMetricRender();}return value;}}catch(err){console.warn('[resonance peak metrics algorithm]',p?.id,err);}peakMetricCache.set(p,{signature,value:null,promise:null});return null;})();
        peakMetricCache.set(p,{signature,value:null,promise});return promise;
      }
      function peakMetrics(p){const sw=sweepById(p?.sweepId);if(!sw||!p)return null;const provider=metricProvider();if(provider){const signature=metricSignature(p,sw,provider),cached=peakMetricCache.get(p);if(cached?.signature===signature&&cached.value)return cached.value;if(!cached||cached.signature!==signature||!cached.promise)void refreshPeakMetric(p);return null;}return S.peakMetrics?.(p,sw)||null;}
      function renderPeakTable(){
        const table=$('#reswinPeakTable');if(!table)return;
        const sw=selectedSweep();const rows=(workspace.peaks||[]).filter(p=>!sw||p.sweepId===sw.id).sort((a,b)=>Number(a.v)-Number(b.v));
        table.innerHTML=`<thead><tr><th>类别</th><th>Vpk (V)</th><th>I (A)</th><th>来源</th><th>采纳</th><th>锁定</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr data-peak-id="${esc(p.id)}" class="${p.id===selectedPeakId?'selected':''}"><td>${esc(peakLabel(p))}</td><td>${fmt(p.v,6)}</td><td>${fmt(p.i,6)}</td><td>${p.manual?'手动':'自动'}</td><td><input data-action="accept" type="checkbox" ${p.accepted!==false?'checked':''}></td><td><input data-action="lock" type="checkbox" ${p.locked?'checked':''}></td><td><button data-action="delete" class="danger-soft">删除</button></td></tr>`).join('')}</tbody>`;
        table.querySelectorAll('tbody tr').forEach(row=>{
          const id=row.dataset.peakId;
          row.onclick=e=>{if(e.target.closest('button,input'))return;const p=peakById(id);if(p)publishPeakSelection(p,'resonance-inspector',{additive:!!(e.ctrlKey||e.metaKey)});};
          row.querySelector('[data-action="accept"]')?.addEventListener('change',e=>updatePeak(id,{accepted:e.target.checked}));
          row.querySelector('[data-action="lock"]')?.addEventListener('change',e=>updatePeak(id,{locked:e.target.checked}));
          row.querySelector('[data-action="delete"]')?.addEventListener('click',()=>deletePeak(id));
        });
      }

      function renderInspection(){
        const host=$('#reswinInspectorBody');if(!host)return;
        const sw=selectedSweep(),p=selectedPeak();normalizeCategories();
        if(!sw&&!p){host.innerHTML='<div class="empty-state">未选中曲线或峰。可在主图中直接点击曲线/峰位。</div>';return;}
        const transformMarkup=sw?`<div class="respar-inspector-transform"><div class="respar-inspector-hint">辅助视图仅用于检查；主图、峰位与 FWHM 始终基于原始 I–V 采样。</div><div id="reswinInspectPlot" class="analysis-chart respar-inspect-plot"></div></div>`:'';
        if(p){
          const psw=sweepById(p.sweepId)||sw,m=peakMetrics(p)||{};
          const categoryButtons=(workspace.peakCategories||[]).map(c=>`<button type="button" class="peak-category-choice ${Number(c.order)===Number(p.peakOrder)?'selected':''}" data-peak-category="${Number(c.order)}"><span class="category-pair-swatch"><i style="background:${esc(colorForPeakOrder(c.order,1))}"></i><i style="background:${esc(colorForPeakOrder(c.order,-1))}"></i></span><span>${esc(c.label)}</span></button>`).join('');
          host.innerHTML=`<div class="respar-inspector-section"><h4>选中峰</h4><div class="respar-inspector-kv"><div class="k">文件</div><div>${esc(psw?.datasetName||'—')}</div><div class="k">Vg</div><div>${fmt(p.vg,5)} V</div><div class="k">扫描</div><div>${directionName(p.direction)}</div><div class="k">Vpk</div><div>${fmt(p.v,6)} V</div><div class="k">Ipk</div><div>${fmt(p.i,6)} A</div><div class="k">FWHM</div><div>${finite(m.fwhm)?`${fmt(m.fwhm,6)} V`:'—（半高交点不完整）'}</div><div class="k">半高交点</div><div>${finite(m.fwhmLeft)&&finite(m.fwhmRight)?`${fmt(m.fwhmLeft,6)} ~ ${fmt(m.fwhmRight,6)} V`:'—'}</div><div class="k">局部基线</div><div>${m.baselineMode==='linear'?`线性 · ${fmt(m.baselineSlope,6)} A/V`:(m.baselineMode==='constant'?'常数':'—')}</div><div class="k">分析窗口</div><div>${finite(m.analysisLeft)&&finite(m.analysisRight)?`${fmt(m.analysisLeft,5)} ~ ${fmt(m.analysisRight,5)} V`:'—'}${p.analysisManual?' · 手动范围':' · 自动范围'}</div><div class="k">Amplitude</div><div>${fmt(m.amplitude,6)} A</div><div class="k">Area</div><div>${fmt(m.area,6)} A·V</div><div class="k">寻峰证据</div><div>${esc((p.supportChannels||p.algorithms||[]).join('、')||'手动')}</div><div class="k">置信度</div><div>${finite(p.confidence)?`${Math.round(Number(p.confidence)*100)}%`:'—'}</div><div class="k">状态</div><div>${p.accepted!==false?'采纳':'不采纳'}${p.locked?' · 已锁定':''}${p.manual?' · 手动':''}</div></div></div><div class="respar-inspector-section"><h4>峰类别 / 峰标签</h4><div class="respar-inspector-hint">点击已有颜色即可把该峰归入现有类别；新增类别会自动分配下一组正扫冷色/反扫暖色。</div><div class="peak-category-palette">${categoryButtons}</div><div class="respar-inspector-row"><button id="reswinAddPeakCategory">＋ 新增类别/颜色</button></div><div class="respar-peak-class-grid"><label>当前类别<input type="text" value="峰${Math.max(1,Number(p.peakOrder)||1)}" disabled></label><label>类别标签<input id="reswinPeakLabelInput" type="text" value="${esc(peakLabel(p))}"></label></div><div class="respar-inspector-row"><button id="reswinApplyPeakLabel">重命名当前类别</button></div></div><div class="respar-inspector-action-grid"><button id="reswinAcceptPeak">${p.accepted!==false?'不采纳':'恢复采纳'}</button><button id="reswinLockPeak">${p.locked?'解除锁定':'锁定峰位'}</button><button id="reswinResetFwhmWindow">FWHM 自动窗口</button><button id="reswinDeletePeak" class="danger-soft">删除峰</button><button id="reswinSelectCurve">选中所属曲线</button></div>${transformMarkup}`;
          host.querySelectorAll('[data-peak-category]').forEach(btn=>btn.onclick=()=>assignPeakCategory(p,btn.dataset.peakCategory));
          host.querySelector('#reswinAddPeakCategory').onclick=()=>createPeakCategoryForPeak(p);
          host.querySelector('#reswinApplyPeakLabel').onclick=()=>renameSelectedCategory(host.querySelector('#reswinPeakLabelInput')?.value);
          host.querySelector('#reswinAcceptPeak').onclick=()=>updatePeak(p.id,{accepted:p.accepted===false});
          host.querySelector('#reswinLockPeak').onclick=()=>updatePeak(p.id,{locked:!p.locked});
          host.querySelector('#reswinResetFwhmWindow').onclick=()=>{delete p.analysisLeft;delete p.analysisRight;delete p.analysisManual;physicsCache={key:'',value:null};renderMainScientific();renderInspection();renderGroup();scheduleSnapshot();setStatus('已恢复自动 FWHM 分析窗口。');};
          host.querySelector('#reswinDeletePeak').onclick=()=>deletePeak(p.id);
          host.querySelector('#reswinSelectCurve').onclick=()=>{const row=sweepById(p.sweepId);if(row)publishSweepSelection(row,'resonance-inspector');};
        }else{
          const count=(workspace.peaks||[]).filter(q=>q.sweepId===sw.id).length;
          host.innerHTML=`<div class="respar-inspector-section"><h4>选中曲线</h4><div class="respar-inspector-kv"><div class="k">文件</div><div>${esc(sw.datasetName||'—')}</div><div class="k">Vg</div><div>${fmt(sw.vg,5)} V</div><div class="k">扫描</div><div>${directionName(sw.direction)}</div><div class="k">范围</div><div>${fmt(sw.points?.[0]?.v,4)} ~ ${fmt(sw.points?.at(-1)?.v,4)} V</div><div class="k">数据点</div><div>${sw.points?.length||0}</div><div class="k">峰</div><div>${count}</div></div></div><div class="respar-inspector-section"><div class="respar-inspector-hint">峰序是跨 Vg 的轨迹身份，不是单条曲线中的临时编号。</div><button id="reswinInspectorSort">跨 Vg 智能整理峰序</button></div>${transformMarkup}`;
          host.querySelector('#reswinInspectorSort').onclick=()=>sortPeakOrderByVd();
        }
        const plot=host.querySelector('#reswinInspectPlot');if(plot&&charts&&sw){
          const transformId=currentTransform(sw);
          const t=transforms?.runCurve?.(transformId,sw)||S.transformSweep?.(sw,transformId)||{points:(sw.points||[]).map(q=>({v:q.v,y:q.i})),label:'I',unit:'A'};
          const traces=[{x:t.points.map(q=>q.v),y:t.points.map(q=>q.y),mode:'lines',name:t.label,line:{width:1.8,color:'#315efb'}}];
          const peaks=(workspace.peaks||[]).filter(q=>q.sweepId===sw.id&&q.accepted!==false);
          if(peaks.length){const xs=t.points.map(q=>q.v),ys=peaks.map(q=>t.points[S.nearestIndex(xs,q.v)]?.y);traces.push({x:peaks.map(q=>q.v),y:ys,mode:'markers',name:'原始峰位投影',marker:{size:9,color:peaks.map(q=>peakColor(q)),symbol:peaks.map(q=>q.manual?'diamond':'circle-open')},customdata:peaks.map(q=>[q.id]),hovertemplate:'Vpk=%{x:.6g} V<extra></extra>'});}
          scientificReact(plot,traces,{margin:{l:62,r:16,t:20,b:50},xaxis:{title:'Vd (V)',gridcolor:'#edf0f5'},yaxis:{title:t.label||'',gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false,displayModeBar:false},{traceEntity:(trace,index)=>index===0?{id:String(sw.id),type:'resonance.sweep',parents:[datasetEntityId(sw.datasetPath)]}:null,pointEntity:peakPointEntity,onEntitySelect:({entity,event})=>{const peak=peakById(entity?.id);if(peak)publishPeakSelection(peak,'resonance-inspector',{additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
        }
      }

      function groupMetricRows(metric){
        const series=groupSeries();
        return series.map(sr=>({
          ...sr,
          rows:sr.peaks.map(p=>{const m=peakMetrics(p)||{};return {p,value:metric==='v'?p.v:metric==='i'?p.i:metric==='prominence'?Number(p.prominence):Number(m[metric])};}).filter(r=>Number.isFinite(r.value))
        })).filter(sr=>sr.rows.length);
      }
      function groupCsv(title,series){
        const rows=['series,label,direction,Vg,value'];
        for(const sr of series)for(const r of sr.rows){const direction=Number.isFinite(Number(sr.direction))?directionName(sr.direction):'';rows.push([sr.name,sr.label,direction,r.p.vg,r.value].map(csvCell).join(','));}
        return rows.join('\n');
      }
      function groupContextText(){
        const p=selectedPeak(),sw=selectedSweep(),visible=visibleSweeps().length;
        if(p)return `主图可见数据：${directionName(p.direction)} · ${peakLabel(p)} · ${visible} 条扫描`;
        if(sw)return `主图可见数据：${directionName(sw.direction)} · 当前曲线峰族 · ${visible} 条扫描`;
        return `主图可见数据：全部已采纳峰族 · ${visible} 条扫描`;
      }
      function groupLegendHtml(series=[]){
        return series.map(sr=>`<span class="reswin-group-legend-item"><i style="background:${esc(sr.color||'#64748b')}"></i>${esc(sr.name||sr.label||'序列')}</span>`).join('');
      }
      function ensureGroupCard(key,title){
        let row=groupCards.get(String(key));if(row?.card?.isConnected)return row;
        const hostEl=$('#reswinGroupGrid');if(!hostEl)return null;
        const card=dom.create('div');card.className='reswin-group-card';card.dataset.groupMetric=String(key);
        card.innerHTML=`<div class="reswin-group-head"><span class="reswin-group-title">${esc(title)}</span><span class="reswin-group-card-actions"></span></div><div class="reswin-group-plot"></div><div class="reswin-group-legend"></div>`;
        hostEl.appendChild(card);
        const plot=card.querySelector('.reswin-group-plot');
        row={key:String(key),title,card,plot,chart:null,portable:null,plotView:null,series:[]};groupCards.set(String(key),row);
        const plotView=uiRuntime?.plotViews?.bind?.(`resonance-group:${key}`,card,{
          plot,header:'.reswin-group-head',actionsHost:'.reswin-group-card-actions',fileStem:()=>`resonance_${row.key}`,csv:()=>groupCsv(row.title,row.series||[]),copyText:(text)=>copyTextToClipboard(text,`${row.title} CSV`),
          placements:['home','left','right','bottom','global'],defaultPlacement:'home',stateVersion:'workspace-v3',snap:false,portableFactory:(id,node,spec)=>workspaceRuntime?.portable?.(id,node,{...spec,onPlacementChanged:()=>resize()})
        })||null;
        if(plotView){row.plotView=plotView;row.portable=plotView.portable||null;groupPlotViews.set(String(key),plotView);if(row.portable)groupPortables.set(String(key),row.portable);}
        return row;
      }
      function disposeGroupViews(){
        groupRenderKey='';
        for(const view of groupPlotViews.values())try{view?.dispose?.();}catch{}groupPlotViews.clear();groupPortables.clear();
        for(const row of groupCards.values())try{row.card?.remove?.();}catch{}groupCards.clear();
      }
      function groupDataFingerprint(){
        const visibleIds=visibleSweepIds().map(String).sort();
        const peaks=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleIds.includes(String(p.sweepId))).map(p=>[
          p.id,p.sweepId,p.v,p.i,p.vg,p.direction,p.peakOrder,peakLabel(p),p.prominence,p.widthLeft,p.widthRight,p.analysisLeft,p.analysisRight,p.manual?1:0,p.locked?1:0
        ].join(':')).join('|');
        return `${workspace.groupColumns||'auto'}##${visibleIds.join(',')}##${peaks}`;
      }
      function renderGroup(){
        const hostEl=$('#reswinGroupGrid');if(!hostEl||!charts)return;
        const context=$('#reswinGroupContext');if(context)context.textContent=groupContextText();
        const nextKey=groupDataFingerprint();
        if(nextKey===groupRenderKey&&groupCards.size){uiRuntime?.infrastructure?.requestChartResize?.({reason:'resonance-group-focus'});return;}
        groupRenderKey=nextKey;
        const defs=[['v','峰位 Vpk','V'],['i','峰电流 Ipk','A'],['fwhm','FWHM','V'],['amplitude','峰高 A','A'],['area','峰面积 S','A·V'],['prominence','峰突出度','A']];
        const visibleIds=new Set(visibleSweepIds().map(String));
        const acceptedVisible=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleIds.has(String(p.sweepId)));
        const labels=[...new Set(acceptedVisible.map(peakLabel))];
        const terSeries=labels.map(label=>{const representative=acceptedVisible.find(p=>peakLabel(p)===label),order=Number(representative?.peakOrder)||1;return {name:`共振TER·${label}`,label,order,color:colorForPeakOrder(order,1),points:S.computeResonantTerForLabel?.(workspace.peaks,sweeps,label,[...visibleIds])||[]};}).filter(x=>x.points.length);
        const count=defs.length+(terSeries.length?1:0);
        let cols=workspace.groupColumns==='auto'?Math.max(1,Math.min(6,Math.floor((hostEl.clientWidth||1000)/330))):Number(workspace.groupColumns)||2;
        cols=Math.min(Math.max(1,cols),Math.max(1,count));
        hostEl.style.setProperty('--reswin-group-cols',String(cols));
        const cardWidth=Math.max(220,((hostEl.clientWidth||1000)-12*(cols-1))/cols);hostEl.style.setProperty('--reswin-group-height',`${Math.max(230,Math.min(360,Math.round(cardWidth*.62)))}px`);
        const activeKeys=new Set();
        for(const [metric,title,unit] of defs){
          activeKeys.add(metric);const series=groupMetricRows(metric),row=ensureGroupCard(metric,title);if(!row)continue;row.card.classList.remove('hidden');row.title=title;row.series=series;row.card.querySelector('.reswin-group-title').textContent=title;row.card.querySelector('.reswin-group-legend').innerHTML=groupLegendHtml(series);
          const traces=series.map(sr=>({x:sr.rows.map(r=>r.p.vg),y:sr.rows.map(r=>r.value),mode:'lines+markers',name:sr.name,line:{color:sr.color,dash:sr.direction<0?'dash':'solid'},marker:{color:sr.color,size:7,line:{width:1}},customdata:sr.rows.map(r=>[r.p.id,r.p.sweepId]),hovertemplate:`Vg=%{x}<br>${title}=%{y}<extra>%{fullData.name}</extra>`}));
          const layout={margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:unit,gridcolor:'#edf0f5'},showlegend:false,autosize:true};
          scientificReact(row.plot,traces,layout,{responsive:true,displayModeBar:false},{pointEntity:peakPointEntity,onEntitySelect:({entity,event})=>{const p=peakById(entity?.id);if(p)publishPeakSelection(p,'resonance-group',{openInspector:true,additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
        }
        const terKey='ter';
        if(terSeries.length){
          activeKeys.add(terKey);const row=ensureGroupCard(terKey,'共振 TER');if(row){row.card.classList.remove('hidden');row.title='共振 TER';row.series=terSeries.map(sr=>({...sr,rows:sr.points.map(p=>({p:{vg:p.vg},value:p.ter}))}));row.card.querySelector('.reswin-group-title').textContent='共振 TER';row.card.querySelector('.reswin-group-legend').innerHTML=groupLegendHtml(terSeries);
            const traces=terSeries.map(sr=>({x:sr.points.map(p=>p.vg),y:sr.points.map(p=>p.ter),mode:'lines+markers',name:sr.label,line:{color:sr.color},marker:{color:sr.color},hovertemplate:'Vg=%{x}<br>TER=%{y:.4g}%<extra>%{fullData.name}</extra>'}));
            const layout={margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'TER (%)',gridcolor:'#edf0f5'},showlegend:false,autosize:true};
            scientificReact(row.plot,traces,layout,{responsive:true,displayModeBar:false}).catch(()=>{});
          }
        }
        for(const [key,row] of groupCards)row.card.classList.toggle('hidden',!activeKeys.has(key));
        uiRuntime?.infrastructure?.requestChartResize?.({reason:'resonance-group-render'});dom.frame(()=>resize());
      }

      function physicalAnalysis(){
        const peakKey=(workspace.peaks||[]).map(p=>`${p.id}:${p.sweepId}:${p.v}:${p.i}:${p.vg}:${p.direction}:${p.peakOrder}:${p.accepted!==false?1:0}:${p.locked?1:0}`).join('|');
        const dataKey=(workspace.datasetMeta||[]).map(d=>`${d.path}:${d.vg}`).join('|');
        const key=`${peakKey}##${dataKey}`;
        if(physicsCache.key===key&&physicsCache.value)return physicsCache.value;
        try{
          const value=S.analyzePhysicalFamilies?.({peaks:workspace.peaks||[],sweepById,peakMetrics:p=>peakMetrics(p)||{},labelForOrder:o=>category(o).label})||{families:[],modelCode:'M0',modelTitle:'数据不足',modelText:'当前稳定峰轨迹不足。',v0Delta:null};
          physicsCache={key,value};return value;
        }catch(err){console.warn('[resonance physical analysis]',err);const value={families:[],modelCode:'M0',modelTitle:'计算失败',modelText:err.message||String(err),v0Delta:null};physicsCache={key,value};return value;}
      }
      function renderPhysics(){
        const r=physicalAnalysis();
        const summary=$('#reswinPhysicsSummary');if(summary)summary.innerHTML=[`模型 ${r.modelCode||'—'}`,`峰族 ${r.families?.length||0}`,`稳定双向 ${(r.families||[]).filter(f=>f.bothStable).length}`].map(t=>`<div>${esc(t)}</div>`).join('');
        const model=$('#reswinPhysicsModel');if(model)model.innerHTML=`<strong>${esc(r.modelTitle||'')}</strong><p>${esc(r.modelText||'')}</p><p>该判断来自当前已采纳峰轨迹的稳定性、正反扫差异与峰宽尺度；它是模型筛选依据，不等同于对微观机制的唯一证明。</p>`;
        const table=$('#reswinPhysicsTable');if(table)table.innerHTML=`<thead><tr><th>峰族</th><th>类型</th><th>正扫点</th><th>反扫点</th><th>共同 Vg</th><th>中位 |ΔV|</th><th>中位峰宽</th></tr></thead><tbody>${(r.families||[]).map(f=>`<tr><td>${esc(f.label||`峰${f.order}`)}</td><td>${esc(f.type||f.code||'')}</td><td>${f.forwardCount||0}</td><td>${f.reverseCount||0}</td><td>${f.commonCount||0}</td><td>${fmt(f.medianDelta,5)}</td><td>${fmt(f.medianWidth,5)}</td></tr>`).join('')}</tbody>`;
        const plot=$('#reswinPhysicsPlot');if(plot&&charts){
          const rows=Array.isArray(r.v0Delta)?r.v0Delta:[];
          const traces=rows.length?[{x:rows.map(x=>x.vg),y:rows.map(x=>x.V0),mode:'lines+markers',name:'V0'},{x:rows.map(x=>x.vg),y:rows.map(x=>x.delta),mode:'lines+markers',name:'|δ|',yaxis:'y2'}]:[];
          scientificReact(plot,traces,{margin:{l:64,r:66,t:26,b:54},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'V0 (V)',gridcolor:'#edf0f5'},yaxis2:{title:'|δ| (V)',overlaying:'y',side:'right',showgrid:false},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});
        }
      }

      function acceptedSeriesOptions(){return sharedController?.acceptedSeriesOptions?.()||[];}
      function chooseRepresentativePeak(list){return list.slice().sort((a,b)=>Number(b.locked)-Number(a.locked)||Number(b.manual)-Number(a.manual)||(Number(b.score)||0)-(Number(a.score)||0))[0]||null;}
      function computeSpacingResult(keyA,keyB){return sharedController?.computeSpacingRows?.(keyA,keyB)||[];}
      function populateSpacing(){
        const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=workspace.spacingSettings||{};
        if(!valid.has(s.seriesA))s.seriesA=opts[0]?.key||'';
        if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=opts.find(o=>o.key!==s.seriesA)?.key||s.seriesA||'';
        workspace.spacingSettings=s;
        const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
        const a=$('#reswinSpacingA'),b=$('#reswinSpacingB');if(a){a.innerHTML=markup;a.value=s.seriesA;}if(b){b.innerHTML=markup;b.value=s.seriesB;}
        const mode=$('#reswinSpacingMode');if(mode)mode.value=s.mode||'abs';
      }
      function renderSpacing(){
        populateSpacing();const s=workspace.spacingSettings;spacingResult=computeSpacingResult(s.seriesA,s.seriesB);
        const plot=$('#reswinSpacingPlot');if(plot&&charts){const key=s.mode==='signed'?'deltaV':'spacing';scientificReact(plot,[{x:spacingResult.map(d=>d.vg),y:spacingResult.map(d=>d[key]),mode:'lines+markers',name:'峰间距',customdata:spacingResult.map(d=>[d.vA,d.vB])}],{margin:{l:68,r:20,t:28,b:56},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:s.mode==='signed'?'VB − VA (V)':'|VB − VA| (V)',gridcolor:'#edf0f5'},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});}
        const table=$('#reswinSpacingTable');if(table)table.innerHTML=`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>VB−VA</th><th>|ΔV|</th></tr></thead><tbody>${spacingResult.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.deltaV,6)}</td><td>${fmt(d.spacing,6)}</td></tr>`).join('')}</tbody>`;
      }
      function spacingCsv(){const rows=['Vg_V,series_A,V_A_V,series_B,V_B_V,delta_V_B_minus_A_V,absolute_spacing_V'];for(const d of spacingResult)rows.push([d.vg,csvCell(d.labelA),d.vA,csvCell(d.labelB),d.vB,d.deltaV,d.spacing].join(','));return rows.join('\n');}

      function gateSeriesRows(key){
        const [dirS,label]=String(key||'').split('::'),direction=Number(dirS);if(!label||!Number.isFinite(direction))return [];
        const grouped=new Map();
        for(const p of (workspace.peaks||[]).filter(p=>p.accepted!==false&&p.direction===direction&&peakLabel(p)===label)){if(!grouped.has(String(p.vg)))grouped.set(String(p.vg),[]);grouped.get(String(p.vg)).push(p);}
        const rows=[];
        for(const list of grouped.values()){const p=chooseRepresentativePeak(list),sw=sweepById(p?.sweepId);if(!p||!sw)continue;const m=peakMetrics(p)||{};rows.push({vg:p.vg,peak:p,v:p.v,i:p.i,fwhm:m.fwhm,hwhm:Number(m.fwhm)/2,amplitude:m.amplitude,baseline:m.baseline,area:m.area,prominence:Number(p.prominence),peakToBg:Number(m.baseline)>0?Math.abs(p.i)/Number(m.baseline):NaN});}
        return rows.sort((a,b)=>a.vg-b.vg);
      }
      function gateHysteresisRows(label){
        if(!label)return [];const up=gateSeriesRows(`1::${label}`),down=gateSeriesRows(`-1::${label}`),u=new Map(up.map(r=>[String(r.vg),r])),d=new Map(down.map(r=>[String(r.vg),r]));
        return [...u.keys()].filter(k=>d.has(k)).map(k=>{const a=u.get(k),b=d.get(k);return {vg:a.vg,forwardV:a.v,reverseV:b.v,deltaVR:a.v-b.v,absDeltaVR:Math.abs(a.v-b.v)};}).sort((a,b)=>a.vg-b.vg);
      }
      function gateLabels(){const labels=[...new Set((workspace.peaks||[]).filter(p=>p.accepted!==false).map(peakLabel))];return labels.filter(label=>{const ps=(workspace.peaks||[]).filter(p=>p.accepted!==false&&peakLabel(p)===label);return ps.some(p=>p.direction>0)&&ps.some(p=>p.direction<0);});}
      function populateGate(){
        const opts=acceptedSeriesOptions(),valid=new Set(opts.map(o=>o.key)),s=workspace.gateAnalysisSettings||{};
        const defaultA=opts[0]?.key||'',defaultB=opts.find(o=>o.key!==defaultA)?.key||defaultA;
        if(!valid.has(s.seriesA))s.seriesA=defaultA;if(!valid.has(s.seriesB)||s.seriesB===s.seriesA)s.seriesB=defaultB;
        const markup=opts.map(o=>`<option value="${esc(o.key)}">${esc(o.name)}</option>`).join('');
        for(const [id,value] of [['reswinGateA',s.seriesA],['reswinGateB',s.seriesB]]){const el=$('#'+id);if(el){el.innerHTML=markup;el.value=value||'';}}
        const labels=gateLabels();if(!labels.includes(s.hysteresisLabel))s.hysteresisLabel=labels[0]||'';
        const hys=$('#reswinGateHysteresis');if(hys){hys.innerHTML=labels.map(l=>`<option value="${esc(l)}">${esc(l)}</option>`).join('');hys.value=s.hysteresisLabel||'';}
        const width=$('#reswinGateWidth');if(width)width.value=s.widthMode||'hwhm';
        const use=$('#reswinGateUseDensity');if(use)use.checked=!!s.useCarrierDensity;
        const cg=$('#reswinGateCg');if(cg)cg.value=finite(s.cg)?s.cg:'';
        const cnp=$('#reswinGateCnp');if(cnp)cnp.value=finite(s.cnp)?s.cnp:0;
        workspace.gateAnalysisSettings=s;
      }
      function readGate(){
        const num=id=>{const raw=$('#'+id)?.value?.trim?.()??'';if(raw==='')return null;const n=Number(raw);return Number.isFinite(n)?n:null;};
        workspace.gateAnalysisSettings={seriesA:$('#reswinGateA')?.value||'',seriesB:$('#reswinGateB')?.value||'',hysteresisLabel:$('#reswinGateHysteresis')?.value||'',widthMode:$('#reswinGateWidth')?.value||'hwhm',useCarrierDensity:!!$('#reswinGateUseDensity')?.checked,cg:num('reswinGateCg'),cnp:num('reswinGateCnp')??0};
      }
      function gateOption(key){return acceptedSeriesOptions().find(o=>o.key===key)||null;}
      if(pipelineRuntime?.register){
        pipelineRuntime.register('gate-analysis',{
          title:'Gate-dependent resonance analysis',kind:'analysis',inputTypes:['data.table'],outputTypes:['resonance.gate-analysis'],allowEmptyInput:true,cacheLimit:6,
          run:(_input,{parameters})=>{
            const s={...(parameters?.settings||workspace.gateAnalysisSettings||{})};
            const Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);let terResult=null;
            try{terResult=S.computeTerMatrix?.(datasets,parameters?.terSettings||project.terMaxSettings||{})||null;}catch{}
            const rows=S.pairGateSeries?.(Arows,Brows,terResult?.terMaxByVg||[],s)||[];
            const hysteresis=gateHysteresisRows(s.hysteresisLabel);
            const summary=S.summarizeGateRows?.(rows,hysteresis)||{fits:{},correlations:{}};
            const value={settings:{...s},seriesA:gateOption(s.seriesA),seriesB:gateOption(s.seriesB),Arows,Brows,rows,hysteresis,terResult,fits:summary.fits||{},correlations:summary.correlations||{}};
            const artifact=D.createAnalysisResult({id:'resonance.analysis:gate',name:'栅压依赖共振分析',summary:{rows:rows.length,hysteresis:hysteresis.length,hasTer:!!terResult},payload:value,transient:true});
            return {artifacts:[artifact],value};
          },
          selection:({artifacts,value})=>artifacts[0]?[{type:'resonance.gate-analysis',id:artifacts[0].id,ref:{artifactId:artifacts[0].id},value:{id:artifacts[0].id,rows:value?.rows?.length||0}}]:[],
          project:({value})=>({kind:'series-group',series:{A:value?.Arows||[],B:value?.Brows||[],hysteresis:value?.hysteresis||[],paired:value?.rows||[]}})
        });
      }

      function computeGate(){
        readGate();const s=workspace.gateAnalysisSettings;
        const peakKey=(workspace.peaks||[]).filter(p=>p.accepted!==false).map(p=>[p.id,p.sweepId,p.v,p.i,p.vg,p.direction,p.peakOrder,p.peakLabel,p.analysisLeft,p.analysisRight]).flat().join('|');
        const dataRevision=artifacts?.revision?.('data.table')||0;
        const key=`${dataRevision}::${JSON.stringify(s)}::${JSON.stringify(project.terMaxSettings||{})}::${peakKey}`;
        const compute=()=>{const Arows=gateSeriesRows(s.seriesA),Brows=gateSeriesRows(s.seriesB);let terResult=null;try{terResult=S.computeTerMatrix?.(datasets,project.terMaxSettings||{})||null;}catch{}const rows=S.pairGateSeries?.(Arows,Brows,terResult?.terMaxByVg||[],s)||[];const hysteresis=gateHysteresisRows(s.hysteresisLabel);const summary=S.summarizeGateRows?.(rows,hysteresis)||{fits:{},correlations:{}};return {settings:{...s},seriesA:gateOption(s.seriesA),seriesB:gateOption(s.seriesB),Arows,Brows,rows,hysteresis,terResult,fits:summary.fits||{},correlations:summary.correlations||{}};};
        gateComputeKey=key;
        if(pipelineRuntime?.runSync){
          const source=(artifacts?.list?.({kind:'data.table',includeTransient:true})||[]).filter(a=>a?.metadata?.adapter==='legacy-dataset');
          const executed=pipelineRuntime.runSync('gate-analysis',source,{parameters:{settings:{...s},terSettings:{...(project.terMaxSettings||{})},peakKey},publish:true,revision:dataRevision});
          gateResult=executed?.value||null;
        }else gateResult=performance?.stage?.('gate-compute',dataRevision,key,compute,{limit:6})||compute();
        return gateResult;
      }
      function gateBase(x,y){return {margin:{l:66,r:26,t:20,b:52},xaxis:{title:x,gridcolor:'#edf0f5'},yaxis:{title:y,gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.2},autosize:true};}
      function renderGate(){
        populateGate();const r=computeGate(),rows=r.rows||[],a=r.seriesA?.name||'ridge A',b=r.seriesB?.name||'ridge B';
        const summary=$('#reswinGateSummary');if(summary)summary.innerHTML=[`共同 Vg ${rows.length}`,`A ${a}`,`B ${b}`,`TER ${r.terResult?'可用':'不可用'}`].map(t=>`<span>${esc(t)}</span>`).join('');
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
        const report=$('#reswinGateReport');if(report){const f=r.fits||{},c=r.correlations||{};report.innerHTML=`<strong>栅压物理分析摘要</strong><p>V0 表示两条所选共振 ridge 的共模位置；δ=(VB−VA)/2 表示有效分裂。用于可分辨度比较时使用 |δ|/w。</p><p>dV0/dVg=${fmt(f.V0?.slope,6)}，R²=${fmt(f.V0?.r2,4)}；d|δ|/dVg=${fmt(f.deltaAbs?.slope,6)}；r[TERmax, |δ|/w]=${fmt(c.terVsDeltaOverW,4)}；r[Vd*, V0]=${fmt(c.vStarVsV0,4)}。</p><p>这些相关量用于检验机制假设，不把 η_eff 直接解释为畴面积，也不把正反扫峰位差直接等同于 coercive voltage。</p>`;}
        const table=$('#reswinGateTable');if(table)table.innerHTML=`<thead><tr><th>Vg</th><th>VA</th><th>VB</th><th>V0</th><th>δ</th><th>|δ|/w</th><th>TERmax</th><th>Vd*</th><th>η_eff</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${fmt(d.vg,5)}</td><td>${fmt(d.vA,6)}</td><td>${fmt(d.vB,6)}</td><td>${fmt(d.V0,6)}</td><td>${fmt(d.delta,6)}</td><td>${fmt(d.deltaOverW,5)}</td><td>${fmt(d.terMax,4)}</td><td>${fmt(d.vStar,6)}</td><td>${fmt(d.etaEff,4)}</td></tr>`).join('')}</tbody>`;
      }
      function gateCsv(){const rows=['Vg,V_A,V_B,V0,delta,abs_delta,delta_over_w,TER_max,Vd_star,eta_eff'];for(const d of gateResult?.rows||[])rows.push([d.vg,d.vA,d.vB,d.V0,d.delta,d.absDelta,d.deltaOverW,d.terMax,d.vStar,d.etaEff].join(','));return rows.join('\n');}
      function gateReportText(){const r=gateResult||computeGate(),f=r.fits||{},c=r.correlations||{};return ['# 栅压物理分析报告','',`ridge A: ${r.seriesA?.name||'—'}`,`ridge B: ${r.seriesB?.name||'—'}`,`共同 Vg 点: ${r.rows?.length||0}`,'',`dV0/dVg = ${fmt(f.V0?.slope,7)} V/V`,`R²(V0) = ${fmt(f.V0?.r2,4)}`,`d|δ|/dVg = ${fmt(f.deltaAbs?.slope,7)} V/V`,`Pearson r[TERmax, |δ|/w] = ${fmt(c.terVsDeltaOverW,4)}`,`Pearson r[Vd*, V0] = ${fmt(c.vStarVsV0,4)}`,'','解释边界：V0 是共模轨迹位置；δ 是有效共振分裂；η_eff 是有效电学权重；正反扫峰位差不自动等同于 coercive voltage。'].join('\n');}

      function renderSummary(){const el=$('#reswinSummary');if(el)el.innerHTML=`<span>数据 ${datasets.length}</span><span>扫描 ${sweeps.length}</span><span>可见 ${visibleSweeps().length}</span><span>峰 ${(workspace.peaks||[]).length}</span><span>手动 ${(workspace.peaks||[]).filter(p=>p.manual).length}</span>`;}
      function renderMain(){renderControls();renderSummary();renderMainPlot();renderTrend();}
      function renderView(){
        currentView=workspace.activeView||currentView||'main';
        if(workspaceNavigator){
          if(currentView==='main')renderMain();
          else if(currentView==='inspect'){renderControls();renderInspection();}
          else if(currentView==='group')renderGroup();
          else if(currentView==='physics')renderPhysics();
          else if(currentView==='spacing')renderSpacing();
          else if(currentView==='gate')renderGate();
          return;
        }
        $$('.reswin-view').forEach(el=>el.classList.toggle('active',el.dataset.reswinViewPanel===currentView));
        $$('[data-reswin-view]').forEach(el=>el.classList.toggle('active',el.dataset.reswinView===currentView));
        if(currentView==='main')renderMain();
        else if(currentView==='inspect'){renderControls();renderInspection();}
        else if(currentView==='group')renderGroup();
        else if(currentView==='physics')renderPhysics();
        else if(currentView==='spacing')renderSpacing();
        else if(currentView==='gate')renderGate();
      }
      function setView(view){if(!['main','inspect','group','physics','spacing','gate'].includes(String(view)))return;workspace.activeView=String(view);currentView=workspace.activeView;if(workspaceNavigator)workspaceNavigator(currentView);else renderView();scheduleSnapshot();}
      function render(){normalizeCategories();syncEntities();syncDerivedArtifacts();if(workspaceNavigator){renderMain();if(currentView!=='main')workspaceNavigator(currentView);if($('#resparGroupPanel')?.offsetParent!==null&&currentView!=='group')renderGroup();}else renderView();}
      function resize(){
        if(resizeRaf)return;resizeRaf=dom.frame(()=>{resizeRaf=0;if($('#reswinMainPlot')?.offsetParent!==null)renderMainPlot();$$('.analysis-chart,.reswin-group-plot').filter(el=>el.offsetParent!==null).forEach(el=>{try{charts.resize(el);}catch{}});});
      }

      function peaksCsv(){const rows=['dataset,vg,direction,peak_order,peak_label,vpk,i,accepted,manual,locked'];for(const p of workspace.peaks||[])rows.push([p.datasetPath,p.vg,directionName(p.direction),p.peakOrder,peakLabel(p),p.v,p.i,p.accepted!==false,p.manual===true,p.locked===true].map(csvCell).join(','));return rows.join('\n');}
      function mainCsv(){const sw=selectedSweep();if(!sw)return '';return ['Vd,I',...(sw.points||[]).map(p=>`${p.v},${p.i}`)].join('\n');}

      async function exportMainSvg(){
        const svg=$('#reswinMainPlot');if(!svg)return false;const serializer=new XMLSerializer(),source=serializer.serializeToString(svg),content=`<?xml version="1.0" encoding="UTF-8"?>\n${source}`;await io.saveText({defaultName:'resonance_iv.svg',content,filters:[{name:'SVG',extensions:['svg']}]});return true;
      }
      async function exportMainPng(){
        const svg=$('#reswinMainPlot');if(!svg)return false;await io.svg.savePng(svg,'resonance_iv.png',{scale:2});return true;
      }

      function bindUi(page){
        if(uiBound||!page)return;uiBound=true;
        page.querySelectorAll('[data-reswin-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.reswinView));
        page.querySelector('#reswinSweepSelect')?.addEventListener('change',e=>{const sw=sweepById(e.target.value);if(sw)publishSweepSelection(sw,'resonance-toolbar');});
        page.querySelector('#reswinInspectSweepSelect')?.addEventListener('change',e=>{const sw=sweepById(e.target.value);if(sw)publishSweepSelection(sw,'resonance-inspector');});
        page.querySelector('#reswinTransform').onchange=e=>setTransform(e.target.value);
        page.querySelector('#reswinPreset').onchange=e=>setPreset(e.target.value);
        page.querySelector('#reswinDetectSelected').onclick=()=>runDetection('selected');
        page.querySelector('#reswinDetectAll').onclick=()=>runDetection('all');
        page.querySelector('#reswinSortPeaks').onclick=sortPeakOrderByVd;
        for(const [id,key] of [['reswinShowRejected','showRejected'],['reswinShowWidth','showWidth'],['reswinShowPoints','showPoints']])page.querySelector('#'+id)?.addEventListener('change',e=>{workspace.peakDisplay={...(workspace.peakDisplay||{}),[key]:!!e.target.checked};renderMainPlot();scheduleSnapshot();});
        page.querySelector('#reswinPhysicsLabels')?.addEventListener('change',e=>{workspace.physicsShowLabels=!!e.target.checked;renderMainPlot();scheduleSnapshot();});
        page.querySelector('#reswinShowAll').onclick=()=>setAllVisibility('all');
        page.querySelector('#reswinShowForward')?.addEventListener('click',()=>setAllVisibility('forward'));
        page.querySelector('#reswinShowReverse')?.addEventListener('click',()=>setAllVisibility('reverse'));
        page.querySelector('#reswinHideAll').onclick=()=>setAllVisibility('none');
        page.querySelector('#reswinExportMainCsv')?.addEventListener('click',()=>io.saveCsv(mainCsv(),'resonance_iv.csv') );
        page.querySelector('#reswinExportMainSvg')?.addEventListener('click',()=>exportMainSvg());
        page.querySelector('#reswinExportMainPng')?.addEventListener('click',()=>exportMainPng());
        page.querySelector('#reswinCopyMain')?.addEventListener('click',()=>copyTextToClipboard(mainCsv(),'主图 CSV'));
        page.querySelector('#reswinUndo')?.addEventListener('click',()=>undoLastAction());
        page.querySelector('#reswinDeselect')?.addEventListener('click',()=>clearSelection());
        page.querySelector('#reswinExportPeaks')?.addEventListener('click',()=>io.saveCsv(peaksCsv(),'resonance_peaks.csv') );
        page.querySelector('#reswinCopyPeaks')?.addEventListener('click',()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'));
        page.querySelector('#reswinApplyPeakLabel')?.addEventListener('click',()=>renameSelectedCategory(page.querySelector('#reswinPeakLabelInput')?.value));
        page.querySelector('#reswinDeletePeak')?.addEventListener('click',()=>{const p=selectedPeak();if(p)deletePeak(p.id);});
        for(const id of ['reswinSpacingA','reswinSpacingB','reswinSpacingMode'])page.querySelector('#'+id).onchange=()=>{workspace.spacingSettings={seriesA:$('#reswinSpacingA').value,seriesB:$('#reswinSpacingB').value,mode:$('#reswinSpacingMode').value};renderSpacing();scheduleSnapshot();};
        page.querySelector('#reswinSpacingExport').onclick=()=>io.saveCsv(spacingCsv(),'resonance_peak_spacing.csv');
        page.querySelector('#reswinGateRun').onclick=()=>{renderGate();scheduleSnapshot();};
        page.querySelector('#reswinGateExportCsv').onclick=()=>io.saveCsv(gateCsv(),'gate_physics_analysis.csv');
        page.querySelector('#reswinGateExportReport').onclick=()=>io.saveText({defaultName:'gate_physics_analysis_report.md',content:gateReportText(),filters:[{name:'Markdown',extensions:['md']},{name:'Text',extensions:['txt']}]});
        bindLinkedSelectionViews();
      }

      function switchSelectedSweep(step){
        const rows=visibleSweeps();if(!rows.length)return false;
        let index=Math.max(0,rows.findIndex(sw=>sw.id===selectedSweepId));
        index=(index+(Number(step)||0)+rows.length)%rows.length;
        publishSweepSelection(rows[index],'resonance-shortcut');scheduleSnapshot();return true;
      }
      function moveSelectedPeakBy(step){
        const peak=selectedPeak();if(!peak)return false;
        if(peak.locked){setStatus('该峰位已锁定，无法移动。');return true;}
        const sw=sweepById(peak.sweepId);const points=sw?.points||[];if(!points.length)return false;
        let index=points.reduce((best,p,i)=>Math.abs(Number(p.v)-Number(peak.v))<Math.abs(Number(points[best]?.v)-Number(peak.v))?i:best,0);
        index=Math.max(0,Math.min(points.length-1,index+(Number(step)||0)));
        const point=points[index],oldV=Number(peak.v);peak.v=Number(point.v);peak.i=Number(point.i);peak.index=Number.isFinite(Number(point.index))?Number(point.index):index;peak.manual=true;
        const delta=peak.v-oldV;if(Number.isFinite(delta)){if(Number.isFinite(Number(peak.widthLeft)))peak.widthLeft=Number(peak.widthLeft)+delta;if(Number.isFinite(Number(peak.widthRight)))peak.widthRight=Number(peak.widthRight)+delta;if(Number.isFinite(Number(peak.analysisLeft)))peak.analysisLeft=Number(peak.analysisLeft)+delta;if(Number.isFinite(Number(peak.analysisRight)))peak.analysisRight=Number(peak.analysisRight)+delta;}
        physicsCache={key:'',value:null};publishPeakSelection(peak,'resonance-peak-move');scheduleSnapshot();return true;
      }
      function selectAdjacentPeak(step){
        const sw=selectedSweep();if(!sw)return false;const rows=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id).sort((a,b)=>Number(a.v)-Number(b.v));if(!rows.length)return false;
        let index=Math.max(0,rows.findIndex(p=>p.id===selectedPeakId));index=Math.max(0,Math.min(rows.length-1,index+(Number(step)||0)));publishPeakSelection(rows[index],'resonance-shortcut');return true;
      }
      function lockSelectedPeaks(value=true){
        const ids=selectedPeakIds.size?new Set(selectedPeakIds):(selectedPeakId?new Set([String(selectedPeakId)]):new Set());if(!ids.size)return false;
        let count=0;for(const p of workspace.peaks||[])if(ids.has(String(p.id))){p.locked=!!value;count++;}
        physicsCache={key:'',value:null};renderLinkedSelection({includeGroup:true});scheduleSnapshot();setStatus(`${value?'已锁定':'已解锁'} ${count} 个峰。`);return true;
      }
      function deleteSelectedPeaks(){
        const ids=selectedPeakIds.size?new Set(selectedPeakIds):(selectedPeakId?new Set([String(selectedPeakId)]):new Set());if(!ids.size)return false;
        workspace.peaks=(workspace.peaks||[]).filter(p=>!ids.has(String(p.id)));selectedPeakIds.clear();selectedPeakId='';physicsCache={key:'',value:null};
        interactionSelection?.clear?.({source:'resonance-delete',keepRanges:true,keepContext:true});render();scheduleSnapshot();setStatus(`已删除 ${ids.size} 个峰。`);return true;
      }
      function clearSelectedRange(){clearMainRangeMenu();interactionSelection?.clearRange?.({source:'resonance-range-clear'});renderMainPlot();return true;}
      function clearSelection(){selectedPeakId='';selectedPeakIds.clear();selectedSweepId='';clearMainRangeMenu();interactionSelection?.clear?.({source:'resonance-deselect'});renderLinkedSelection({includeGroup:true,controls:true});setStatus('已退出共振选中。');return true;}
      function togglePhysicsLabels(){workspace.physicsShowLabels=workspace.physicsShowLabels===false;renderControls();renderMainPlot();scheduleSnapshot();return workspace.physicsShowLabels;}

      const service={
        serialize:()=>clone(workspace),
        selectedSweep,selectedPeak,sweepById,peakById,visibleSweepIds,
        directionName,peakLabel,colorForPeakOrder,assignPeakCategory,createPeakCategoryForPeak,renamePeakCategory,metrics:peakMetrics,
        restore(data,{legacyProject}={}){if(legacyProject&&typeof legacyProject==='object')project=clone(legacyProject);workspace=normalizeWorkspace(data,legacyProject||project);currentView=workspace.activeView||'main';rebuild();resetUndoHistory();if($('#reswinMainPlot'))render();},
        reset(){workspace=defaultWorkspace(project);currentView='main';rebuild();render();scheduleSnapshot();},
        render,resize,bindUi,setView,refreshData,
        renderMain,renderInspection,renderGroup,renderPhysics,renderSpacing,renderGate,
        getGroupColumns:()=>String(workspace.groupColumns||'auto'),setGroupColumns(value){const next=['auto','1','2','3','4','5','6'].includes(String(value))?String(value):'auto';workspace.groupColumns=next;renderGroup();scheduleSnapshot();return next;},closeGroupViews:disposeGroupViews,
        setWorkspaceNavigator(fn){workspaceNavigator=typeof fn==='function'?fn:null;},
        setWorkspaceRuntime(runtime){workspaceRuntime=runtime||null;},
        setUiRuntime(runtime){uiRuntime=runtime||null;mainSurface?.dispose?.();mainSurface=null;syncDerivedArtifacts();},
        setEntityRuntime(runtime){entityRuntime=runtime||null;syncEntities();},
        setDetectorRuntime(runtime){detectorRuntime=runtime||null;},
        setAlgorithmRuntime(runtime){algorithmRuntime=runtime||null;installAlgorithmPipeline();scheduleMetricRefresh(workspace.peaks||[]);},
        setPipelineRuntime(runtime){pipelineRuntime=runtime||null;installAlgorithmPipeline();},
        setInteractionRuntime(runtime={}){interactionSelectionOff?.();interactionSelectionOff=null;interactionRuntime=runtime.runtime||null;interactionSelection=runtime.selection||interactionRuntime?.selection||null;interactionMenus=runtime.contextMenus||null;if(interactionSelection?.subscribe)interactionSelectionOff=interactionSelection.subscribe(applyInteractionSelection,{immediate:false});bindLinkedSelectionViews();if(interactionSelection&&!interactionSelection.get?.()?.focus&&selectedSweep())publishSweepSelection(selectedSweep(),'resonance-initial');},
        selection:()=>interactionSelection?.get?.()||null,
        selectPeak:(id,options={})=>{const p=peakById(id);return p?publishPeakSelection(p,options.source||'resonance-api',options):false;},
        selectSweep:(id,options={})=>{const sw=sweepById(id);return sw?publishSweepSelection(sw,options.source||'resonance-api'):false;},
        selectRange:(range,options={})=>publishRangeSelection(range,options.source||'resonance-api'),
        setActiveDetector(id){workspace.activeDetector=String(id||'');renderControls();scheduleSnapshot();},
        setActiveMetricAlgorithm(id){workspace.activeMetricAlgorithm=String(id||'');peakMetricCache=new WeakMap();physicsCache={key:'',value:null};render();scheduleSnapshot();},
        setDetectorSettings(id,value){const key=String(id||workspace.activeDetector||'');if(!key)return;workspace.detectorSettings={...(workspace.detectorSettings||{}),[key]:clone(value||{})};scheduleSnapshot();},
        setPeakDisplay(key,value){workspace.peakDisplay={...(workspace.peakDisplay||{}),[String(key)]:!!value};renderMainPlot();scheduleSnapshot();},
        switchSelectedSweep,moveSelectedPeakBy,selectAdjacentPeak,lockSelectedPeaks,deleteSelectedPeaks,clearSelectedRange,clearSelection,undoLastAction,togglePhysicsLabels,
        setTransform,setPreset,runDetection,addManualPeak,sortPeakOrderByVd,setAllVisibility,
        exportPeaks:()=>io.saveCsv(peaksCsv(),'resonance_peaks.csv'),
        copyPeaks:()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'),
        exportMainCsv:()=>io.saveCsv(mainCsv(),'resonance_iv.csv'),
        copyMainCsv:()=>copyTextToClipboard(mainCsv(),'主图 CSV'),
        exportMainSvg,exportMainPng,
        resetMainView,detectSelectedRange:()=>detectRange(selectedRange),deleteSelectedRangePeaks:()=>deleteRangePeaks(),setSelectedRangeLocked:value=>setRangeLocked(value),applySelectedRangeIdentity:(order,label)=>applyRangeIdentity(order,label),
        getState:()=>({workspace,datasets,sweeps,selectedSweep:selectedSweep(),selectedPeak:selectedPeak(),activeView:currentView,spacingResult,gateResult})
      };
      sharedController=Shared.createController(service,{mode:'top-runtime',science:S});

      function setProject(next){project=clone(next||{});workspace=normalizeWorkspace(pluginSliceFromProject(project),project);currentView=workspace.activeView||'main';rebuild();resetUndoHistory();if($('#reswinMainPlot'))render();}
      await setProject(project);
      return {
        serviceName:'resonance',service,render,resize,setProject,
        syncProject(target){target.plugins=target.plugins&&typeof target.plugins==='object'?target.plugins:{};const plugin=target.plugins['builtin.resonance-workbench']&&typeof target.plugins['builtin.resonance-workbench']==='object'?target.plugins['builtin.resonance-workbench']:{};plugin.workspace=clone(workspace);target.plugins['builtin.resonance-workbench']=plugin;},
        getState:service.getState
      };
  }

  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-runtime',Object.freeze({mountSuper,createTop}));
})();
