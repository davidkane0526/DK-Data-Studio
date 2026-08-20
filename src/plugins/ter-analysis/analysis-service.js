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
    async create({project:initialProject,bootstrap,setStatus,copyTextToClipboard,savePlotlyImage,scheduleSnapshot,getVisibility,artifacts,io=window.DKDSIO,charts=window.DKDSCharts,dom=window.DKDSComponents?.createScope?.('builtin.ter-analysis')||null,performance=null,pipeline=null}){
      const $=s=>dom?.query?.(s)||null;
      let project=initialProject||{};
      let settings={};
      let display={};
      let transform={type:'didv',direction:1};
      let result=null;
      let matrixViewModel=null;
      let transformViewModel=null;
      let projectEpoch=0;
      function invalidateComputeCaches(){performance?.trimAll?.({targetEntries:0,dropWeak:true,reason:'ter-project-change'});}

      function applyProject(next){
        project=next||{};projectEpoch+=1;invalidateComputeCaches();
        settings={
          vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,
          ...(project.terMaxSettings||{})
        };
        display={
          colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null,
          ...(project.terHeatmapDisplay||{})
        };
        transform={type:'didv',direction:1,...(project.terTransformSettings||{})};
        transform.type=['raw','detrend','didv','dlog','dvdi','resistance'].includes(String(transform.type))?String(transform.type):'didv';
        transform.direction=Number(transform.direction)<0?-1:1;
        result=project.terMaxResult?cloneSerializable(project.terMaxResult):null;
      }
      applyProject(project);

      function visibilityMap(){
        const live=typeof getVisibility==='function'?getVisibility():null;
        if(live instanceof Map)return new Map(live);
        if(Array.isArray(live))return new Map(live);
        return new Map(Array.isArray(project.scanVisibility)?project.scanVisibility:[]);
      }
      function inputCacheKey(){
        const tableRevision=Number(artifacts?.revision?.('data.table'))||0;
        const visibility=settings.onlyFullyVisible?[...visibilityMap().entries()].map(([path,row])=>`${path}:${row?.forward!==false?1:0}${row?.reverse!==false?1:0}`).sort().join('|'):'all';
        return `${projectEpoch}|table:${tableRevision}|visible:${settings.onlyFullyVisible?1:0}|${visibility}`;
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
          let next=source.slice();
          if(settings.onlyFullyVisible){const vis=visibilityMap();next=next.filter(ds=>{const v=vis.get(ds.path);return !!v?.forward&&!!v?.reverse;});}
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
        if(pipeline?.runSync){
          const executed=pipeline.runSync('transform-matrix',sourceArtifacts(),{parameters,publish:true,revision:inputCacheKey()});
          transformViewModel=executed?.viewModel||null;
          return executed?.value||null;
        }
        const parameterKey=[transform.type,transform.direction,result.used?.tolerance??'',JSON.stringify(result.targets||[]),JSON.stringify(result.vgs||[]),JSON.stringify(sourceFileByVg())].join('::');
        const compute=()=>A.computeSweepTransformMatrix(allSweeps(),result.targets||[],result.vgs||[],parameters);
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
        const type=String(next.type??transform.type??'didv'),direction=Number(next.direction??transform.direction)<0?-1:1;
        transform={type:['raw','detrend','didv','dlog','dvdi','resistance'].includes(type)?type:'didv',direction};invalidateComputeCaches({inputs:false});
        if(result)publishDerivedArtifacts();
        scheduleSnapshot();
        return cloneSerializable(transform);
      }

      function setInput(id,value){
        const el=$('#'+id);if(!el)return;
        el.value=value===null||value===undefined||!Number.isFinite(Number(value))?'':String(value);
      }
      function syncInputs(){
        setInput('terVmin',settings.vmin);setInput('terVmax',settings.vmax);
        setInput('terVstep',settings.vstep);setInput('terTolerance',settings.tolerance);
        if($('#terCurrentFloor'))$('#terCurrentFloor').value=String(settings.currentFloor??1e-15);
        if($('#terOnlyFullyVisible'))$('#terOnlyFullyVisible').checked=!!settings.onlyFullyVisible;
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
            const executed=pipeline.runSync('ter-matrix',sourceArtifacts(),{parameters:{settings:{...settings}},publish:true,revision:inputCacheKey()});
            result=executed?.value||null;matrixViewModel=executed?.viewModel||null;
          }else result=A.computeTerMatrix(datasets(),settings);
          if(!result)throw new Error('TER pipeline did not return a result.');
          settings={...settings,
            vmin:result.used.vmin,vmax:result.used.vmax,vstep:result.used.vstep,
            tolerance:result.used.tolerance,currentFloor:result.used.currentFloor
          };
          syncInputs();renderResult();publishDerivedArtifacts();scheduleSnapshot();
          setStatus(`TER 热图计算完成：${result.vgs.length} 个 Vg × ${result.targets.length} 个 Vd。`);
          return result;
        }catch(err){
          result=null;
          if($('#terSummary'))$('#terSummary').innerHTML=`<span class="ter-summary-chip">计算失败：${String(err.message||err)}</span>`;
          setStatus(`TER_max 计算失败：${err.message||err}`);
          return null;
        }
      }

      function plotConfig(name){
        return {responsive:true,scrollZoom:true,displaylogo:false,toImageButtonOptions:{format:'png',filename:name,width:1400,height:900,scale:2}};
      }
      function baseLayout(xTitle,yTitle){
        return {
          margin:{l:72,r:24,t:20,b:60},
          xaxis:{title:xTitle,gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:yTitle,gridcolor:'#edf0f5',automargin:true},
          dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        };
      }
      function purge(){
        for(const id of ['terHeatmapPlot','terMaxVgPlot','terMaxVgArgPlot','terMaxVdPlot','terMaxVdArgPlot']){
          const el=dom?.query?.('#'+id);if(el)try{charts.purge(el);}catch{}
        }
      }

      function renderResult(){
        if(!result)return;
        const r=result;
        if($('#terSummary'))$('#terSummary').innerHTML=[
          `Vg 数：${r.vgs.length}`,`Vds 点：${r.targets.length}`,`缺失 TER：${r.missing}`,
          `Vds：${r.used.vmin} ~ ${r.used.vmax} V`,`step=${r.used.vstep} V`,
          `tolerance=${r.used.tolerance} V`,`current floor=${r.used.currentFloor} A`
        ].map(t=>`<span class="ter-summary-chip">${t}</span>`).join('');

        // Analysis is intentionally headless-safe: chart availability must not
        // determine whether the scientific result exists or can be persisted.
        if(!charts?.react)return;
        const vals=r.matrix.flat().filter(Number.isFinite);
        const autoMin=vals.length?Math.min(...vals):0,autoMax=vals.length?Math.max(...vals):1;
        const zmin=finite(display.zmin)?Number(display.zmin):autoMin;
        const zmax=finite(display.zmax)?Number(display.zmax):autoMax;
        const pipelineTrace=matrixViewModel?.traces?.[0]||null;
        charts.react('terHeatmapPlot',[{
          x:pipelineTrace?.x||r.targets,y:pipelineTrace?.y||r.vgs,z:pipelineTrace?.z||r.matrix,type:'heatmap',colorscale:display.colorscale||'Viridis',
          zmin,zmax,zsmooth:false,
          colorbar:{title:{text:'TER (%)',side:'right'},thickness:18,len:.86,
            tickmode:display.colorDtick?'linear':'auto',dtick:display.colorDtick||undefined},
          hovertemplate:pipelineTrace?.hovertemplate||'Vg=%{y}<br>Vds=%{x}<br>TER=%{z:.4g}%<extra></extra>'
        }],{
          margin:{l:76,r:96,t:26,b:66},
          xaxis:{title:'Vds (V)',automargin:true,tickmode:display.xDtick?'linear':'auto',dtick:display.xDtick||undefined,constrain:'domain'},
          yaxis:{title:'Vg (V)',automargin:true,tickmode:display.yDtick?'linear':'auto',dtick:display.yDtick||undefined,constrain:'domain'},
          dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        },plotConfig('TER_heatmap'));

        const maxVg=r.terMaxByVg||r.terMax||[],maxVd=r.terMaxByVd||[];
        charts.react('terMaxVgPlot',[{
          x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),mode:'lines+markers',name:'TER_Max–Vg',
          marker:{size:8},line:{width:2},customdata:maxVg.map(d=>d.vdsAtMax),
          hovertemplate:'Vg=%{x}<br>TER_Max=%{y:.5g}%<br>Vd@max=%{customdata:.5g} V<extra></extra>'
        }],baseLayout('Vg (V)','TER_Max–Vg (%)'),plotConfig('TER_Max-Vg'));
        charts.react('terMaxVgArgPlot',[{
          x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),mode:'lines+markers',name:'Vd@max',marker:{size:8}
        }],baseLayout('Vg (V)','Vd @ TER_Max–Vg (V)'),plotConfig('Vd_at_TER_Max-Vg'));
        charts.react('terMaxVdPlot',[{
          x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),mode:'lines+markers',name:'TER_Max–Vd',marker:{size:7},line:{width:2},
          customdata:maxVd.map(d=>d.vgAtMax),
          hovertemplate:'Vd=%{x}<br>TER_Max=%{y:.5g}%<br>Vg@max=%{customdata:.5g} V<extra></extra>'
        }],baseLayout('Vd (V)','TER_Max–Vd (%)'),plotConfig('TER_Max-Vd'));
        charts.react('terMaxVdArgPlot',[{
          x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.vgAtMax),mode:'lines+markers',name:'Vg@max',marker:{size:7}
        }],baseLayout('Vd (V)','Vg @ TER_Max–Vd (V)'),plotConfig('Vg_at_TER_Max-Vd'));

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
          purge();
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
          title:'TER matrix',kind:'analysis',inputTypes:['data.table'],outputTypes:['science.ter.matrix'],allowEmptyInput:true,cacheLimit:4,
          run:(input,{parameters})=>{
            const canonical=D?.legacyDatasetsFromArtifacts?.(Array.isArray(input)?input:[])||[];
            const source=canonical.length?canonical:datasets();
            const computed=A.computeTerMatrix(source,parameters?.settings||settings);
            const matrix=D.createMatrix({id:'ter.matrix:main',name:'TER(Vd,Vg)',x:computed.targets,y:computed.vgs,z:computed.matrix,xName:'Vd',yName:'Vg',valueName:'TER',xUnit:'V',yUnit:'V',valueUnit:'%',parameters:{...(computed.used||{})}});
            return {artifacts:[matrix],value:computed};
          },
          selection:({artifacts,value})=>artifacts[0]?[{type:'ter.matrix-result',id:artifacts[0].id,ref:{artifactId:artifacts[0].id},value:{id:artifacts[0].id,rows:value?.vgs?.length||0,cols:value?.targets?.length||0}}]:[],
          project:({value})=>({kind:'heatmap',traces:[{x:value?.targets||[],y:value?.vgs||[],z:value?.matrix||[],type:'heatmap',hovertemplate:'Vg=%{y}<br>Vds=%{x}<br>TER=%{z:.4g}%<extra></extra>'}],axes:{x:{name:'Vd',unit:'V'},y:{name:'Vg',unit:'V'},z:{name:'TER',unit:'%'}}})
        });
        pipeline.register('transform-matrix',{
          title:'Transport scalar-field transform',kind:'transform',inputTypes:['data.table'],outputTypes:['science.scalar-field'],allowEmptyInput:true,cacheLimit:6,
          run:(input,{parameters})=>{
            const canonical=D?.legacyDatasetsFromArtifacts?.(Array.isArray(input)?input:[])||[];
            const source=canonical.length?canonical:datasets();
            const sweeps=source.flatMap(ds=>A.buildSweeps(ds)||[]);
            const computed=A.computeSweepTransformMatrix(sweeps,parameters?.targets||[],parameters?.vgs||[],parameters||{});
            const artifact=D.createMatrix({id:`ter.transform:${computed.type}:${computed.direction}`,name:`${computed.label||computed.type} · ${Number(computed.direction)<0?'反扫':'正扫'}`,x:computed.targets,y:computed.vgs,z:computed.matrix,xName:'Vd',yName:'Vg',valueName:computed.label||computed.type,xUnit:'V',yUnit:'V',valueUnit:computed.unit||'',parameters:{type:computed.type,direction:computed.direction,tolerance:parameters?.tolerance}});
            return {artifacts:[artifact],value:computed};
          },
          project:({value})=>({kind:'heatmap',traces:[{x:value?.targets||[],y:value?.vgs||[],z:value?.matrix||[],type:'heatmap'}],axes:{x:{name:'Vd',unit:'V'},y:{name:'Vg',unit:'V'},z:{name:value?.label||value?.type||'value',unit:value?.unit||''}}})
        });
      }

      const service={
        serialize:()=>({schema:2,settings:cloneSerializable(settings),display:cloneSerializable(display),transform:cloneSerializable(transform),result:result?cloneSerializable(result):null}),
        restore(data,{legacyProject}={}){
          const legacy=legacyProject&&typeof legacyProject==='object'?{
            settings:legacyProject.terMaxSettings,
            display:legacyProject.terHeatmapDisplay,
            transform:legacyProject.terTransformSettings,
            result:legacyProject.terMaxResult
          }:null;
          const source=data&&typeof data==='object'?data:legacy;
          if(!source)return;
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,...(source.settings||{})};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null,...(source.display||{})};
          transform={type:'didv',direction:1,...(source.transform||{})};
          transform.type=['raw','detrend','didv','dlog','dvdi','resistance'].includes(String(transform.type))?String(transform.type):'didv';
          transform.direction=Number(transform.direction)<0?-1:1;
          result=source.result?cloneSerializable(source.result):null;invalidateComputeCaches();
          if($('#terSummary'))render();
        },
        reset(){
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          transform={type:'didv',direction:1};
          result=null;invalidateComputeCaches();
          if($('#terSummary'))render();
          scheduleSnapshot();
        },
        render,getState:()=>({settings,display,transform,result}),autoParameters,calculate,
        getTransformSettings:()=>cloneSerializable(transform),setTransformSettings,getTransformMatrix:transformMatrix,transformCsv,
        applyDisplay(){readDisplay();if(result)renderResult();setStatus('TER 热图显示范围/刻度已应用。');},
        resetDisplay(){
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          syncDisplay();if(result)renderResult();scheduleSnapshot();setStatus('TER 热图色阶和坐标刻度已恢复自动。');
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
        serviceName:'ter',service,render,
        setProject(next){applyProject(next);if($('#terSummary'))render();},
        syncProject(target){
          target.terMaxSettings={...settings};
          target.terHeatmapDisplay={...display};
          target.terTransformSettings={...transform};
          target.terMaxResult=result?cloneSerializable(result):null;
        },
        getState:()=>({settings,display,transform,result})
      };
    }
  });
})();
