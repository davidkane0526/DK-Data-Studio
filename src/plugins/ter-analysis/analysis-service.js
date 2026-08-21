(() => {
  const A=window.Analysis;
  const D=window.DKDSData;

  function finite(value){return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));}
  function numOrNull(value){if(!finite(value))return null;return Number(value);}
  function csvCell(value){const s=String(value??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}

  function cloneSerializable(value){
    if(value===null||value===undefined)return value;
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  }

  window.DKDSPluginModules.define('builtin.ter-analysis','analysis-service',{
    async create({project:initialProject,bootstrap,setStatus,copyTextToClipboard,savePlotlyImage,scheduleSnapshot,artifacts,io=window.DKDSIO,dom=window.DKDSComponents?.createScope?.('builtin.ter-analysis')||null,performance=null,pipeline=null,transforms=null,algorithms=null,reactive=null}){
      const $=s=>dom?.query?.(s)||null;
      let project=initialProject||{};
      let settings={};
      let display={};
      let transform={type:'didv',direction:1};
      const DEFAULT_TER_ALGORITHM=Object.freeze({category:'ter-analysis',id:'ter.high-low-ratio',version:'1.0.0'});
      let terAlgorithmRef={...DEFAULT_TER_ALGORITHM};
      const normalizeAlgorithmRef=value=>{if(!value)return {...DEFAULT_TER_ALGORITHM};if(typeof value==='string'){const text=String(value||''),at=text.lastIndexOf('@');return {category:'ter-analysis',id:at>0?text.slice(0,at):text,version:at>0?text.slice(at+1):''};}return {category:String(value.category||'ter-analysis'),id:String(value.id||value.algorithmId||DEFAULT_TER_ALGORITHM.id),version:String(value.version||value.algorithmVersion||'')};};
      const algorithmApi=()=>algorithms||window.DKDSScientificAlgorithms||null;
      const listTerAlgorithms=()=>{const api=algorithmApi();return api?.list?.({category:'ter-analysis'})||[];};
      const resolveTerAlgorithm=(ref=terAlgorithmRef)=>{const api=algorithmApi(),wanted=normalizeAlgorithmRef(ref);if(!api)return listTerAlgorithms()[0]||null;if(wanted.version)return api.resolve?.(wanted,{category:'ter-analysis'})||null;const row=api.resolve?.(wanted,{category:'ter-analysis'})||listTerAlgorithms()[0]||null;if(row)terAlgorithmRef=api.lock?.({category:'ter-analysis',id:row.id,version:row.version})||{category:'ter-analysis',id:row.id,version:row.version};return row;};
      const algorithmProvenance=row=>row?{pluginId:row.owner,algorithmId:row.id,algorithmVersion:row.version,category:row.category,title:row.title}:null;
      function runTerAlgorithm(source,algorithmRef,algorithmSettings){const api=algorithmApi(),row=resolveTerAlgorithm(algorithmRef);if(!row&&api?.diagnose){const d=api.diagnose(algorithmRef,{category:'ter-analysis'});if(d.status==='missing-version')throw new Error(`工程锁定的 TER 算法版本缺失：${d.requested.id}@${d.requested.version}；可用版本：${d.alternatives.map(x=>x.version).join('、')||'无'}`);}if(row&&api?.run){const value=api.run({id:row.id,version:row.version,category:'ter-analysis'},source,{category:'ter-analysis',parameters:{settings:{...algorithmSettings}}});if(value&&typeof value.then==='function')throw new Error(`TER 算法必须是本地同步 Provider：${row.id}@${row.version}`);return {...value,algorithm:algorithmProvenance(row)};}const value=A.computeTerMatrix(source,algorithmSettings);return {...value,algorithm:null};}
      const fallbackTransformIds=new Set(['raw','detrend','didv','d2idv2','dlog','dvdi','resistance']);
      function normalizeTransformType(value){const id=String(value||'didv');const row=transforms?.resolve?.(id)||transforms?.get?.(id);return row?.supportsScalarField!==false&&row?.id?row.id:(fallbackTransformIds.has(id)?id:'didv');}
      function transformDefinition(value=transform.type){return transforms?.resolve?.(value)||transforms?.get?.(value)||null;}
      let result=null;
      let matrixViewModel=null;
      let transformViewModel=null;
      let projectEpoch=0;
      function invalidateComputeCaches(){performance?.trimAll?.({targetEntries:0,dropWeak:true,reason:'ter-project-change'});}

      function applyProject(next){
        project=next||{};projectEpoch+=1;invalidateComputeCaches();
        settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false};
        display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
        transform={type:'didv',direction:1};
        terAlgorithmRef={...DEFAULT_TER_ALGORITHM};
        result=null;
      }
      applyProject(project);

      function inputCacheKey(){
        const tableRevision=Number(artifacts?.revision?.('data.table'))||0;
        return `${projectEpoch}|table:${tableRevision}|complete:${settings.onlyFullyVisible?1:0}`;
      }
      function datasets(){
        // Imported source data is canonical through the shared Artifact Store.
        // `project.datasets` remains a compatibility fallback for old project
        // files and bootstrap phases before the data-model bridge is available.
        const revision=inputCacheKey();
        const compute=()=>{
          const rows=artifacts?.list?.({includeTransient:true})||[];
          const canonical=D?.legacyDatasetsFromArtifacts?.(rows)||[];
          const source=canonical.length?canonical:(Array.isArray(project.datasets)?project.datasets:[]);
          let next=source.filter(dataset=>dataset?.excluded!==true);
          if(settings.onlyFullyVisible)next=next.filter(ds=>{const sweeps=A.buildSweeps?.(ds)||[];return sweeps.some(sw=>Number(sw.direction)>0)&&sweeps.some(sw=>Number(sw.direction)<0);});
          return next;
        };
        return performance?.stage?.('datasets',revision,'legacy-adapter',compute,{limit:4})||compute();
      }

      function allSweeps(){
        if(typeof A?.buildSweeps!=='function')return [];
        const revision=inputCacheKey();
        const compute=()=>datasets().flatMap(ds=>A.buildSweeps(ds)||[]);
        return performance?.stage?.('sweeps',revision,'buildSweeps',compute,{limit:4})||compute();
      }
      function sourceArtifacts(){
        return (artifacts?.list?.({includeTransient:true})||[]).filter(artifact=>artifact?.kind==='data.table'&&artifact?.metadata?.adapter==='legacy-dataset');
      }
      function sourceFileByVg(){
        const out={};if(!result)return out;
        for(const vg of result.vgs||[]){
          const row=(result.records||[]).find(item=>Number(item?.vg)===Number(vg)&&String(item?.sourceFile||''));
          if(row)out[String(vg)]=String(row.sourceFile||'');
        }
        return out;
      }
      function transformMatrix(){
        if(!result||typeof A?.computeSweepTransformMatrix!=='function')return null;
        const parameters={type:transform.type,direction:transform.direction,tolerance:result.used?.tolerance,targets:result.targets||[],vgs:result.vgs||[],sourceFileByVg:sourceFileByVg()};
        if(pipeline?.runSync&&transforms?.fieldStageId){
          const stageId=transforms.fieldStageId(transform.type);
          const executed=pipeline.runSync(stageId,sourceArtifacts(),{parameters,publish:true,revision:inputCacheKey()});
          transformViewModel=executed?.viewModel||null;
          return executed?.value||null;
        }
        const parameterKey=[transform.type,transform.direction,result.used?.tolerance??'',JSON.stringify(result.targets||[]),JSON.stringify(result.vgs||[]),JSON.stringify(sourceFileByVg())].join('::');
        const compute=()=>transforms?.runScalarField?.(transform.type,allSweeps(),parameters)||A.computeSweepScalarField?.(allSweeps(),result.targets||[],result.vgs||[],parameters)||A.computeSweepTransformMatrix(allSweeps(),result.targets||[],result.vgs||[],parameters);
        return performance?.stage?.('transform-matrix',inputCacheKey(),parameterKey,compute,{limit:6})||compute();
      }
      function transformCsv(){
        const matrix=transformMatrix();if(!matrix)return '';
        const rows=[['Vg_V',...matrix.targets].join(',')];
        matrix.vgs.forEach((vg,i)=>rows.push([vg,...matrix.matrix[i].map(v=>Number.isFinite(v)?v:'')].join(',')));
        return rows.join('\n');
      }
      function sourceArtifactIds(){
        const ids=[];for(const artifact of (artifacts?.list?.({includeTransient:true})||[])){if(artifact?.metadata?.adapter==='legacy-dataset')ids.push(String(artifact.id));}return ids;
      }
      function publishDerivedArtifacts(){
        if(!result||!D||!artifacts)return false;
        const parents=sourceArtifactIds(),publish=api=>{
          if(!pipeline?.runSync){
            const matrix=D.createMatrix({id:'ter.matrix:main',name:'TER(Vd,Vg)',x:result.targets,y:result.vgs,z:result.matrix,xName:'Vd',yName:'Vg',valueName:'TER',xUnit:'V',yUnit:'V',valueUnit:'%',parameters:{...(result.used||{})},lineage:{parents,role:'analysis',producer:'builtin.ter-analysis',operation:'computeTerMatrix',parameters:{...(result.used||{})}}});
            (api.publish?.(matrix)||api.upsert?.(matrix));
          }
          const tm=transformMatrix();if(tm&&!pipeline?.runSync){const transformed=D.createMatrix({id:`ter.transform:${tm.type}:${tm.direction}`,name:`${tm.label||tm.type} · ${Number(tm.direction)<0?'反扫':'正扫'}`,x:tm.targets,y:tm.vgs,z:tm.matrix,xName:'Vd',yName:'Vg',valueName:tm.label||tm.type,xUnit:'V',yUnit:'V',valueUnit:tm.unit||'',parameters:{type:tm.type,direction:tm.direction,tolerance:result.used?.tolerance},lineage:{parents,role:'transform',producer:'builtin.ter-analysis',operation:'computeSweepTransformMatrix',parameters:{type:tm.type,direction:tm.direction,tolerance:result.used?.tolerance}}});(api.publish?.(transformed)||api.upsert?.(transformed));}
          const maxima=D.createAnalysisResult({id:'ter.analysis:maxima',name:'TER Maxima',summary:{vgCount:result.vgs?.length||0,vdCount:result.targets?.length||0,missing:result.missing||0},payload:{terMaxByVg:result.terMaxByVg||result.terMax||[],terMaxByVd:result.terMaxByVd||[]},lineage:{parents:['ter.matrix:main'],role:'analysis',producer:'builtin.ter-analysis',operation:'reduceTerMax',parameters:{axes:['Vg','Vd']}}});(api.publish?.(maxima)||api.upsert?.(maxima));
        };
        if(artifacts.batch)artifacts.batch(publish);else publish(artifacts);return true;
      }
      function setTransformSettings(next={}){
        const type=normalizeTransformType(next.type??transform.type??'didv'),direction=Number(next.direction??transform.direction)<0?-1:1;
        transform={type,direction};invalidateComputeCaches({inputs:false});
        if(result)publishDerivedArtifacts();
        scheduleSnapshot();
        return cloneSerializable(transform);
      }

      function setInput(id,value){
        const el=$('#'+id);if(!el)return;
        el.value=value===null||value===undefined||!Number.isFinite(Number(value))?'':String(value);
      }
      function syncTerAlgorithmControl(){
        const select=$('#terAlgorithmSelect');if(!select)return;
        const rows=listTerAlgorithms(),resolved=resolveTerAlgorithm(terAlgorithmRef),api=algorithmApi(),diagnostic=api?.diagnose?.(terAlgorithmRef,{category:'ter-analysis'});
        const missing=diagnostic?.status==='missing-version'||diagnostic?.status==='missing-algorithm';
        select.innerHTML=(missing?`<option value="${String(terAlgorithmRef.id)}@${String(terAlgorithmRef.version)}">缺失版本 · ${String(terAlgorithmRef.id)}@${String(terAlgorithmRef.version)}</option>`:'')+rows.map(row=>`<option value="${String(row.id)}@${String(row.version)}">${String(row.title||row.id)} · ${String(row.id)}@${String(row.version)}</option>`).join('');
        if(resolved){terAlgorithmRef=api?.lock?.({category:'ter-analysis',id:resolved.id,version:resolved.version})||{category:'ter-analysis',id:resolved.id,version:resolved.version};select.value=`${resolved.id}@${resolved.version}`;}else if(missing)select.value=`${terAlgorithmRef.id}@${terAlgorithmRef.version}`;
        const recover=$('#terRecoverAlgorithmBtn');if(recover){recover.classList.toggle('hidden',!missing||typeof api?.recover!=='function');recover.disabled=false;if(recover.dataset.terRecoverBound!=='1'){recover.dataset.terRecoverBound='1';recover.addEventListener('click',async()=>{recover.disabled=true;try{const catalog=await api.locate?.(terAlgorithmRef);const compatible=(catalog?.candidates||[]).filter(row=>row.compatible&&row.recoverable);if(!compatible.length){const found=(catalog?.candidates||[]).length;setStatus(found?`已定位到 ${found} 个包含该 TER 算法的包，但当前环境不兼容。`:`未在当前包或插件历史中找到 ${terAlgorithmRef.id}@${terAlgorithmRef.version}。`);return;}const restored=await api.recover(terAlgorithmRef,compatible[0]);setStatus(`已恢复 TER 算法 ${restored.id}@${restored.version}。`);syncTerAlgorithmControl();render();}catch(err){setStatus(`恢复 TER 算法失败：${err.message}`);}finally{recover.disabled=false;}});}}
        if(select.dataset.terAlgorithmBound!=='1'){select.dataset.terAlgorithmBound='1';select.addEventListener('change',()=>{const next=normalizeAlgorithmRef(select.value);const row=resolveTerAlgorithm(next);if(!row)return;const changed=terAlgorithmRef.id!==row.id||terAlgorithmRef.version!==row.version;terAlgorithmRef={category:'ter-analysis',id:row.id,version:row.version};if(changed){result=null;matrixViewModel=null;invalidateComputeCaches();reactive?.touch?.('ter.result',{reason:'algorithm-change'});render();scheduleSnapshot();setStatus(`TER 算法已切换为 ${row.id}@${row.version}，请重新计算。`);}});}
      }
      function syncInputs(){
        setInput('terVmin',settings.vmin);setInput('terVmax',settings.vmax);
        setInput('terVstep',settings.vstep);setInput('terTolerance',settings.tolerance);
        if($('#terCurrentFloor'))$('#terCurrentFloor').value=String(settings.currentFloor??1e-15);
        if($('#terOnlyFullyVisible'))$('#terOnlyFullyVisible').checked=!!settings.onlyFullyVisible;
        syncTerAlgorithmControl();
      }
      function readInputs(){
        const read=(id,current)=>{const el=$('#'+id);return el?numOrNull(el.value):current;};
        const visibleControl=$('#terOnlyFullyVisible');
        settings={
          vmin:read('terVmin',settings.vmin),vmax:read('terVmax',settings.vmax),vstep:read('terVstep',settings.vstep),
          tolerance:read('terTolerance',settings.tolerance),currentFloor:read('terCurrentFloor',settings.currentFloor)??1e-15,
          onlyFullyVisible:visibleControl?!!visibleControl.checked:!!settings.onlyFullyVisible
        };
        scheduleSnapshot();
        return settings;
      }

      function syncDisplay(){
        if($('#terColorScale'))$('#terColorScale').value=display.colorscale||'Viridis';
        setInput('terColorMin',display.zmin);setInput('terColorMax',display.zmax);
        setInput('terColorTick',display.colorDtick);setInput('terXTick',display.xDtick);setInput('terYTick',display.yDtick);
      }
      function readDisplay(){
        display={
          colorscale:$('#terColorScale')?.value||'Viridis',
          zmin:numOrNull($('#terColorMin')?.value),
          zmax:numOrNull($('#terColorMax')?.value),
          colorDtick:numOrNull($('#terColorTick')?.value),
          xDtick:numOrNull($('#terXTick')?.value),
          yDtick:numOrNull($('#terYTick')?.value)
        };
        for(const key of ['colorDtick','xDtick','yDtick'])if(!(display[key]>0))display[key]=null;
        if(finite(display.zmin)&&finite(display.zmax)&&display.zmax<=display.zmin){
          [display.zmin,display.zmax]=[display.zmax,display.zmin];
        }
        scheduleSnapshot();
      }

      function autoParameters(){
        try{
          const d=A.detectTerVoltageParameters(datasets());
          settings.vmin=d.vmin;settings.vmax=d.vmax;settings.vstep=d.vstep;
          settings.tolerance=d.vstep/20;settings.currentFloor=settings.currentFloor||1e-15;
          syncInputs();scheduleSnapshot();
          setStatus(`TER 参数已自动检测：Vds ${d.vmin} ~ ${d.vmax} V，step=${d.vstep} V。`);
          return true;
        }catch(err){setStatus(`TER 参数检测失败：${err.message}`);return false;}
      }

      function calculate(){
        readInputs();invalidateComputeCaches({inputs:false});
        try{
          if(pipeline?.runSync){
            const executed=pipeline.runSync('ter-matrix',sourceArtifacts(),{parameters:{settings:{...settings},algorithmRef:{...terAlgorithmRef}},publish:true,revision:`${inputCacheKey()}|ter:${terAlgorithmRef.id}@${terAlgorithmRef.version}`});
            result=executed?.value||null;matrixViewModel=executed?.viewModel||null;
          }else result=runTerAlgorithm(datasets(),terAlgorithmRef,settings);
          if(!result)throw new Error('TER pipeline did not return a result.');
          settings={...settings,
            vmin:result.used.vmin,vmax:result.used.vmax,vstep:result.used.vstep,
            tolerance:result.used.tolerance,currentFloor:result.used.currentFloor
          };
          syncInputs();renderResult();publishDerivedArtifacts();reactive?.touch?.('ter.result',{reason:'calculate'});scheduleSnapshot();
          setStatus(`TER 热图计算完成：${result.vgs.length} 个 Vg × ${result.targets.length} 个 Vd。`);
          return result;
        }catch(err){
          result=null;reactive?.touch?.('ter.result',{reason:'calculate-failed'});
          if($('#terSummary'))$('#terSummary').innerHTML=`<span class="ter-summary-chip">计算失败：${String(err.message||err)}</span>`;
          setStatus(`TER_max 计算失败：${err.message||err}`);
          return null;
        }
      }

      function renderResult(){
        if(!result)return;
        const r=result;
        if($('#terSummary'))$('#terSummary').innerHTML=[
          `Vg 数：${r.vgs.length}`,`Vds 点：${r.targets.length}`,`缺失 TER：${r.missing}`,
          `Vds：${r.used.vmin} ~ ${r.used.vmax} V`,`step=${r.used.vstep} V`,
          `tolerance=${r.used.tolerance} V`,`current floor=${r.used.currentFloor} A`,
          `算法：${r.algorithm?.algorithmId||terAlgorithmRef.id}@${r.algorithm?.algorithmVersion||terAlgorithmRef.version}`
        ].map(t=>`<span class="ter-summary-chip">${t}</span>`).join('');
        const maxVg=r.terMaxByVg||r.terMax||[],maxVd=r.terMaxByVd||[];
        if($('#terMaxVgTable'))$('#terMaxVgTable').innerHTML=`
          <thead><tr><th>Vg (V)</th><th>TER_Max–Vg (%)</th><th>Vd@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th></tr></thead>
          <tbody>${maxVg.map(d=>`<tr><td>${d.vg}</td><td>${Number(d.terMax).toPrecision(7)}</td><td>${d.vdsAtMax}</td><td>${Number(d.iUp).toExponential(6)}</td><td>${Number(d.iDown).toExponential(6)}</td><td>${Number(d.rUp).toExponential(6)}</td><td>${Number(d.rDown).toExponential(6)}</td></tr>`).join('')}</tbody>`;
        if($('#terMaxVdTable'))$('#terMaxVdTable').innerHTML=`
          <thead><tr><th>Vd (V)</th><th>TER_Max–Vd (%)</th><th>Vg@max (V)</th><th>I_up (A)</th><th>I_down (A)</th><th>R_up (Ω)</th><th>R_down (Ω)</th></tr></thead>
          <tbody>${maxVd.map(d=>`<tr><td>${d.vds}</td><td>${Number(d.terMax).toPrecision(7)}</td><td>${d.vgAtMax}</td><td>${Number(d.iUp).toExponential(6)}</td><td>${Number(d.iDown).toExponential(6)}</td><td>${Number(d.rUp).toExponential(6)}</td><td>${Number(d.rDown).toExponential(6)}</td></tr>`).join('')}</tbody>`;
      }

      function render(){
        if($('#terMaxProjectName'))$('#terMaxProjectName').textContent=`项目：${bootstrap?.title||project.projectName||'当前项目'}`;
        syncInputs();syncDisplay();
        if(result)renderResult();
        else{
          if($('#terSummary'))$('#terSummary').innerHTML='<span class="ter-summary-chip">尚未计算 TER_max</span>';
          if($('#terMaxVgTable'))$('#terMaxVgTable').innerHTML='';
          if($('#terMaxVdTable'))$('#terMaxVdTable').innerHTML='';
        }
      }

      function longCsv(){
        if(!result)return '';
        const rows=['Vg_V,Vds_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,TER_percent,source_file'];
        for(const d of result.records)rows.push([d.vg,d.vds,d.iUp,d.iDown,d.rUp,d.rDown,d.ter,csvCell(d.sourceFile)].join(','));
        return rows.join('\n');
      }
      function matrixCsv(){
        if(!result)return '';
        const rows=[['Vg_V',...result.targets].join(',')];
        result.vgs.forEach((vg,i)=>rows.push([vg,...result.matrix[i].map(v=>Number.isFinite(v)?v:'')].join(',')));
        return rows.join('\n');
      }
      function maxVgCsv(){
        if(!result)return '';
        const rows=['Vg_V,TER_Max_Vg_percent,Vd_at_max_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,source_file'];
        for(const d of (result.terMaxByVg||result.terMax||[]))rows.push([d.vg,d.terMax,d.vdsAtMax,d.iUp,d.iDown,d.rUp,d.rDown,csvCell(d.sourceFile)].join(','));
        return rows.join('\n');
      }
      function maxVdCsv(){
        if(!result)return '';
        const rows=['Vd_V,TER_Max_Vd_percent,Vg_at_max_V,I_up_A,I_down_A,R_up_ohm,R_down_ohm,source_file'];
        for(const d of (result.terMaxByVd||[]))rows.push([d.vds,d.terMax,d.vgAtMax,d.iUp,d.iDown,d.rUp,d.rDown,csvCell(d.sourceFile)].join(','));
        return rows.join('\n');
      }
      async function saveCsv(name,content){if(!content)return false;return io.saveCsv(content,name);}

      if(pipeline?.register){
        pipeline.register('ter-matrix',{
          title:'TER matrix',kind:'analysis',inputTypes:['science.transport.iv','data.table'],outputTypes:['science.ter.matrix'],allowEmptyInput:true,cacheLimit:4,
          run:(input,{parameters})=>{
            const canonical=D?.legacyDatasetsFromArtifacts?.(Array.isArray(input)?input:[])||[];
            const source=canonical.length?canonical:datasets();
            const algorithmRef=normalizeAlgorithmRef(parameters?.algorithmRef||terAlgorithmRef);
            const computed=runTerAlgorithm(source,algorithmRef,parameters?.settings||settings);
            const matrix=D.createMatrix({id:'ter.matrix:main',name:'TER(Vd,Vg)',x:computed.targets,y:computed.vgs,z:computed.matrix,xName:'Vd',yName:'Vg',valueName:'TER',xUnit:'V',yUnit:'V',valueUnit:'%',parameters:{...(computed.used||{}),algorithmRef},metadata:{algorithm:computed.algorithm||null}});
            return {artifacts:[matrix],value:computed};
          },
          selection:({artifacts,value})=>artifacts[0]?[{type:'ter.matrix-result',id:artifacts[0].id,ref:{artifactId:artifacts[0].id},value:{id:artifacts[0].id,rows:value?.vgs?.length||0,cols:value?.targets?.length||0}}]:[],
          project:({value})=>({kind:'heatmap',traces:[{x:value?.targets||[],y:value?.vgs||[],z:value?.matrix||[],type:'heatmap',hovertemplate:'Vg=%{y}<br>Vds=%{x}<br>TER=%{z:.4g}%<extra></extra>'}],axes:{x:{name:'Vd',unit:'V'},y:{name:'Vg',unit:'V'},z:{name:'TER',unit:'%'}}})
        });

      }

      const service={
        serialize:()=>({schema:3,settings:cloneSerializable(settings),display:cloneSerializable(display),transform:cloneSerializable(transform),algorithmRef:cloneSerializable(terAlgorithmRef),result:result?cloneSerializable(result):null}),
        restore(data){
          const source=data&&typeof data==='object'?data:null;
          if(!source)return;
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,...(source.settings||{})};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null,...(source.display||{})};
          transform={type:'didv',direction:1,...(source.transform||{})};
          terAlgorithmRef=normalizeAlgorithmRef(source.algorithmRef||DEFAULT_TER_ALGORITHM);
          transform.type=normalizeTransformType(transform.type);
          transform.direction=Number(transform.direction)<0?-1:1;
          result=source.result?cloneSerializable(source.result):null;invalidateComputeCaches();reactive?.touch?.('ter.result',{reason:'restore'});
          if($('#terSummary'))render();
        },
        reset(){
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          transform={type:'didv',direction:1};
          terAlgorithmRef={...DEFAULT_TER_ALGORITHM};
          result=null;invalidateComputeCaches();reactive?.touch?.('ter.result',{reason:'reset'});
          if($('#terSummary'))render();
          scheduleSnapshot();
        },
        render,getState:()=>({settings,display,transform,algorithmRef:cloneSerializable(terAlgorithmRef),result}),autoParameters,calculate,listTerAlgorithms,getTerAlgorithmRef:()=>cloneSerializable(terAlgorithmRef),
        getTransformSettings:()=>cloneSerializable(transform),getTransformDefinition:()=>cloneSerializable(transformDefinition()),listTransforms:()=>transforms?.list?.({supportsScalarField:true})||[],setTransformSettings,getTransformMatrix:transformMatrix,transformCsv,
        applyDisplay(){readDisplay();if(result)renderResult();reactive?.touch?.('ter.view.request',{reason:'display'});setStatus('TER 热图显示范围/刻度已应用。');},
        resetDisplay(){
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          syncDisplay();if(result)renderResult();reactive?.touch?.('ter.view.request',{reason:'display-reset'});scheduleSnapshot();setStatus('TER 热图色阶和坐标刻度已恢复自动。');
        },
        setOnlyFullyVisible(value){settings.onlyFullyVisible=!!value;invalidateComputeCaches();autoParameters();},
        exportLong:()=>saveCsv('TER_long.csv',longCsv()),
        copyLong:()=>copyTextToClipboard(longCsv(),'TER_long CSV'),
        exportMatrix:()=>saveCsv('TER_matrix.csv',matrixCsv()),
        copyMatrix:()=>copyTextToClipboard(matrixCsv(),'TER_matrix CSV'),
        exportHeatmapSvg:()=>result&&savePlotlyImage('terHeatmapPlot','TER_heatmap','svg'),
        exportHeatmapPng:()=>result&&savePlotlyImage('terHeatmapPlot','TER_heatmap','png'),
        exportMaxVg:()=>saveCsv('TER_Max-Vg.csv',maxVgCsv()),
        copyMaxVg:()=>copyTextToClipboard(maxVgCsv(),'TER_Max–Vg CSV'),
        exportMaxVgSvg:()=>result&&savePlotlyImage('terMaxVgPlot','TER_Max-Vg','svg'),
        exportMaxVgPng:()=>result&&savePlotlyImage('terMaxVgPlot','TER_Max-Vg','png'),
        exportMaxVd:()=>saveCsv('TER_Max-Vd.csv',maxVdCsv()),
        copyMaxVd:()=>copyTextToClipboard(maxVdCsv(),'TER_Max–Vd CSV'),
        exportMaxVdSvg:()=>result&&savePlotlyImage('terMaxVdPlot','TER_Max-Vd','svg'),
        exportMaxVdPng:()=>result&&savePlotlyImage('terMaxVdPlot','TER_Max-Vd','png')
      };

      return {
        serviceName:'builtin.ter-analysis.runtime',service,render,
        setProject(next){applyProject(next);if($('#terSummary'))render();},
        syncProject(target){
          target.plugins=target.plugins&&typeof target.plugins==='object'?target.plugins:{};
          const plugin=target.plugins['builtin.ter-analysis']&&typeof target.plugins['builtin.ter-analysis']==='object'?target.plugins['builtin.ter-analysis']:{};
          plugin.workspace=service.serialize();
          target.plugins['builtin.ter-analysis']=plugin;
        },
        getState:()=>({settings,display,transform,algorithmRef:cloneSerializable(terAlgorithmRef),result})
      };
    }
  });
})();
