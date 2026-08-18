(() => {
  const S=window.DKDSScience;
  const $=selector=>document.querySelector(selector);
  const clone=value=>{if(value===undefined)return undefined;try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite=value=>value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));
  const directionName=dir=>Number(dir)>0?'正扫':'反扫';

  function defaultWorkspace(project={}){
    return {
      schema:1,
      datasetMeta:(project.datasets||[]).map(d=>({path:d.path,name:d.name,vg:d.vg})),
      scanVisibility:Array.isArray(project.scanVisibility)?clone(project.scanVisibility):[],
      peaks:Array.isArray(project.peaks)?clone(project.peaks):[],
      peakCategories:Array.isArray(project.peakCategories)?clone(project.peakCategories):[],
      algorithms:clone(project.algorithms||S.preset?.('balanced')||{_preset:'balanced'}),
      physicsShowLabels:project.physicsShowLabels!==false,
      spacingSettings:clone(project.spacingSettings||{seriesA:'',seriesB:'',mode:'abs'}),
      gateAnalysisSettings:clone(project.gateAnalysisSettings||{}),
      transformPreviewByDataset:Array.isArray(project.transformPreviewByDataset)?clone(project.transformPreviewByDataset):[]
    };
  }

  function normalizeWorkspace(raw,project={}){
    const base=defaultWorkspace(project);
    const source=raw&&typeof raw==='object'?raw:{};
    return {
      ...base,...clone(source),schema:1,
      datasetMeta:Array.isArray(source.datasetMeta)?clone(source.datasetMeta):base.datasetMeta,
      scanVisibility:Array.isArray(source.scanVisibility)?clone(source.scanVisibility):base.scanVisibility,
      peaks:Array.isArray(source.peaks)?clone(source.peaks):base.peaks,
      peakCategories:Array.isArray(source.peakCategories)?clone(source.peakCategories):base.peakCategories,
      algorithms:{...(base.algorithms||{}),...(source.algorithms||{})},
      spacingSettings:{...(base.spacingSettings||{}),...(source.spacingSettings||{})},
      gateAnalysisSettings:{...(base.gateAnalysisSettings||{}),...(source.gateAnalysisSettings||{})},
      transformPreviewByDataset:Array.isArray(source.transformPreviewByDataset)?clone(source.transformPreviewByDataset):base.transformPreviewByDataset
    };
  }

  function parseDatasets(project={}){
    return (project.datasets||[]).flatMap(d=>{
      if(Array.isArray(d.points)&&d.points.length){
        return [{...clone(d),points:d.points.map((p,index)=>({...p,index:Number.isFinite(Number(p.index))?Number(p.index):index}))}];
      }
      if(typeof d.text==='string'&&d.text.trim()&&typeof S.parseCsv==='function'){
        try{return [{...S.parseCsv({name:d.name,path:d.path,text:d.text}),...clone(d)}];}catch{}
      }
      return [];
    });
  }

  window.DKDSPluginWindowRuntime={
    async create({host,project:initialProject,setStatus,scheduleSnapshot,copyTextToClipboard,savePlotlyImage}){
      let project=clone(initialProject||{});
      let datasets=[];
      let sweeps=[];
      let workspace={};
      let selectedSweepId='';
      let selectedPeakId='';
      let plotBound=false;

      function pluginSliceFromProject(p){
        return p?.plugins?.['builtin.resonance-workbench']?.workspace||null;
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
        datasets=parseDatasets(project);
        applyWorkspaceToDatasets();
        sweeps=[];
        for(const dataset of datasets){
          try{sweeps.push(...(S.buildSweeps?.(dataset)||[]));}catch(err){console.warn('[resonance window buildSweeps]',dataset?.name,err);}
        }
        if(!sweeps.some(sw=>sw.id===selectedSweepId))selectedSweepId=visibleSweeps()[0]?.id||sweeps[0]?.id||'';
      }

      function visibilityMap(){
        const map=new Map((workspace.scanVisibility||[]).map(([path,value])=>[String(path),{forward:value?.forward!==false,reverse:value?.reverse!==false}]));
        for(const d of datasets)if(!map.has(String(d.path)))map.set(String(d.path),{forward:true,reverse:true});
        return map;
      }

      function isVisible(sw){
        const row=visibilityMap().get(String(sw.datasetPath))||{forward:true,reverse:true};
        return sw.direction>0?row.forward!==false:row.reverse!==false;
      }
      function visibleSweeps(){return sweeps.filter(isVisible);}
      function selectedSweep(){return sweeps.find(sw=>sw.id===selectedSweepId)||visibleSweeps()[0]||sweeps[0]||null;}
      function selectedPeak(){return (workspace.peaks||[]).find(p=>p.id===selectedPeakId)||null;}

      function normalizeCategories(){
        const by=new Map();
        for(const c of workspace.peakCategories||[]){
          const order=Math.max(1,Math.round(Number(c?.order)||1));
          if(!by.has(order))by.set(order,{order,label:String(c?.label||`峰${order}`)});
        }
        for(const p of workspace.peaks||[]){
          const order=Math.max(1,Math.round(Number(p.peakOrder)||1));
          if(!by.has(order))by.set(order,{order,label:String(p.peakLabel||`峰${order}`)});
          p.peakOrder=order;p.peakLabel=String(p.peakLabel||by.get(order).label);
        }
        workspace.peakCategories=[...by.values()].sort((a,b)=>a.order-b.order);
      }

      function currentTransform(sw){
        const map=new Map(workspace.transformPreviewByDataset||[]);
        return String(map.get(sw?.datasetPath)||'raw');
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
        // Peaks remain tied to dataset/sweep; keep their stored Vg in sync.
        const vgByPath=new Map(datasets.map(d=>[String(d.path),Number(d.vg)]));
        for(const p of workspace.peaks||[])if(vgByPath.has(String(p.datasetPath)))p.vg=vgByPath.get(String(p.datasetPath));
        render();scheduleSnapshot();
      }

      function setVisibility(path,direction,value){
        const map=visibilityMap();
        const row=map.get(String(path))||{forward:true,reverse:true};
        if(direction>0)row.forward=!!value;else row.reverse=!!value;
        map.set(String(path),row);workspace.scanVisibility=[...map.entries()];
        if(!isVisible(selectedSweep()||{}))selectedSweepId=visibleSweeps()[0]?.id||'';
        render();scheduleSnapshot();
      }

      function category(order){
        normalizeCategories();
        const n=Math.max(1,Math.round(Number(order)||1));
        return workspace.peakCategories.find(c=>Number(c.order)===n)||{order:n,label:`峰${n}`};
      }

      function assignDetectedOrders(rows){
        const ordered=rows.slice().sort((a,b)=>Number(a.v)-Number(b.v));
        ordered.forEach((peak,index)=>{
          const order=index+1;const c=category(order);
          peak.peakOrder=order;peak.peakLabel=c.label;
        });
        normalizeCategories();
        return ordered;
      }

      function runDetection(scope='selected'){
        const targets=scope==='all'?visibleSweeps():[selectedSweep()].filter(Boolean);
        if(!targets.length){setStatus('没有可寻峰的可见扫描。');return;}
        const targetIds=new Set(targets.map(sw=>sw.id));
        const preserved=(workspace.peaks||[]).filter(p=>!targetIds.has(p.sweepId)||p.manual||p.locked);
        const added=[];
        for(const sw of targets){
          try{added.push(...assignDetectedOrders(S.detectPeaks(sw,workspace.algorithms||{},{})));}
          catch(err){console.warn('[resonance window detect]',sw.id,err);}
        }
        workspace.peaks=preserved.concat(added);
        normalizeCategories();
        selectedPeakId=added[0]?.id||'';
        render();scheduleSnapshot();
        setStatus(`寻峰完成：${targets.length} 条扫描，新增 ${added.length} 个自动峰。`);
      }

      function addManualPeak(v){
        const sw=selectedSweep();if(!sw||!sw.points?.length||!finite(v))return;
        let best=sw.points[0],bestIndex=0,bestDist=Math.abs(Number(best.v)-Number(v));
        sw.points.forEach((p,index)=>{const dist=Math.abs(Number(p.v)-Number(v));if(dist<bestDist){best=p;bestIndex=index;bestDist=dist;}});
        const existing=(workspace.peaks||[]).filter(p=>p.sweepId===sw.id);
        const order=Math.max(1,...existing.map(p=>Number(p.peakOrder)||0))+1;
        const c=category(order);
        const peak={
          id:`${sw.id}::manual::${Date.now()}::${Math.random().toString(36).slice(2,7)}`,
          sweepId:sw.id,datasetPath:sw.datasetPath,vg:sw.vg,direction:sw.direction,
          index:bestIndex,v:best.v,i:best.i,accepted:true,manual:true,locked:false,
          algorithms:['manual'],primaryAlgorithm:'manual',score:1,confidence:1,
          widthLeft:best.v,widthRight:best.v,fwhm:0,peakOrder:order,peakLabel:c.label,customColor:null
        };
        workspace.peaks.push(peak);normalizeCategories();selectedPeakId=peak.id;
        render();scheduleSnapshot();setStatus(`已在 Vd=${Number(best.v).toPrecision(6)} V 添加手动峰。`);
      }

      function updatePeak(id,patch){
        const peak=(workspace.peaks||[]).find(p=>p.id===id);if(!peak)return;
        Object.assign(peak,patch||{});normalizeCategories();render();scheduleSnapshot();
      }
      function deletePeak(id){workspace.peaks=(workspace.peaks||[]).filter(p=>p.id!==id);if(selectedPeakId===id)selectedPeakId='';render();scheduleSnapshot();}

      function setPreset(value){
        const preset=['strict','balanced','sensitive'].includes(String(value))?String(value):'balanced';
        workspace.algorithms={...(S.preset?.(preset)||{}),_preset:preset};
        renderControls();scheduleSnapshot();
      }

      function datasetRowsHtml(){
        const vis=visibilityMap();
        return datasets.map(d=>{
          const row=vis.get(String(d.path))||{forward:true,reverse:true};
          return `<div class="reswin-dataset" data-dataset-path="${esc(d.path)}">
            <div class="reswin-dataset-title" title="${esc(d.path)}">${esc(d.name||d.path||'数据')}</div>
            <label>Vg <input class="reswin-vg" type="number" step="any" value="${finite(d.vg)?Number(d.vg):0}"></label>
            <label class="reswin-check"><input class="reswin-forward" type="checkbox" ${row.forward!==false?'checked':''}>正扫</label>
            <label class="reswin-check"><input class="reswin-reverse" type="checkbox" ${row.reverse!==false?'checked':''}>反扫</label>
          </div>`;
        }).join('')||'<div class="empty-state">工程中没有数据。</div>';
      }

      function renderControls(){
        const list=$('#reswinDatasetList');if(list){
          list.innerHTML=datasetRowsHtml();
          list.querySelectorAll('.reswin-dataset').forEach(row=>{
            const path=row.dataset.datasetPath;
            row.querySelector('.reswin-vg')?.addEventListener('change',e=>setDatasetVg(path,e.target.value));
            row.querySelector('.reswin-forward')?.addEventListener('change',e=>setVisibility(path,1,e.target.checked));
            row.querySelector('.reswin-reverse')?.addEventListener('change',e=>setVisibility(path,-1,e.target.checked));
          });
        }
        const sweep=$('#reswinSweepSelect');if(sweep){
          const rows=visibleSweeps();
          sweep.innerHTML=rows.map(sw=>`<option value="${esc(sw.id)}">${esc(sw.datasetName)} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}</option>`).join('');
          if(rows.some(sw=>sw.id===selectedSweepId))sweep.value=selectedSweepId;
        }
        const preset=$('#reswinPreset');if(preset)preset.value=workspace.algorithms?._preset||'balanced';
        const transform=$('#reswinTransform');if(transform)transform.value=currentTransform(selectedSweep());
      }

      function plotTraces(){
        const selected=selectedSweep();
        const traces=[];
        for(const sw of visibleSweeps()){
          const isSelected=sw.id===selected?.id;
          const transformed=S.transformSweep?.(sw,currentTransform(sw))||{points:sw.points.map(p=>({v:p.v,y:p.i})),label:'I',unit:'A'};
          traces.push({
            x:transformed.points.map(p=>p.v),y:transformed.points.map(p=>p.y),
            mode:'lines',name:`${sw.datasetName} · ${directionName(sw.direction)}`,
            line:{width:isSelected?2.6:1.1},opacity:isSelected?1:.28,
            hovertemplate:'Vd=%{x:.6g}<br>值=%{y:.6g}<extra></extra>'
          });
        }
        const peaks=(workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleSweeps().some(sw=>sw.id===p.sweepId));
        if(peaks.length)traces.push({
          x:peaks.map(p=>p.v),y:peaks.map(p=>p.i),mode:'markers',name:'峰位',
          marker:{size:9,symbol:peaks.map(p=>p.manual?'diamond':'circle'),line:{width:1}},
          customdata:peaks.map(p=>[p.id,p.peakLabel||`峰${p.peakOrder||''}`,p.vg,directionName(p.direction)]),
          hovertemplate:'%{customdata[1]}<br>Vg=%{customdata[2]}<br>%{customdata[3]}<br>Vd=%{x:.6g}<extra></extra>'
        });
        return traces;
      }

      function bindPlot(){
        const plot=$('#reswinMainPlot');if(!plot||typeof plot.on!=='function')return;
        try{plot.removeAllListeners?.('plotly_click');}catch{}
        plot.on('plotly_click',event=>{
          const point=event?.points?.[0];
          const peakId=point?.customdata?.[0];
          if(peakId){selectedPeakId=String(peakId);renderPeakTable();return;}
          if(event?.event?.shiftKey&&finite(point?.x))addManualPeak(point.x);
        });
        plotBound=true;
      }

      function renderMainPlot(){
        const plot=$('#reswinMainPlot');if(!plot||!window.Plotly)return;
        const sw=selectedSweep();
        const transform=currentTransform(sw);
        const label=sw?(S.transformSweep?.(sw,transform)?.label||'I–V'):'I–V';
        Plotly.react(plot,plotTraces(),{
          margin:{l:72,r:22,t:46,b:58},
          title:{text:sw?`${sw.datasetName} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}`:'共振 I–V',font:{size:14}},
          xaxis:{title:'Vd (V)',gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:label,gridcolor:'#edf0f5',automargin:true},
          hovermode:'closest',dragmode:'zoom',showlegend:true,legend:{orientation:'h',y:-.19},autosize:true
        },{responsive:true,scrollZoom:true,displaylogo:false,toImageButtonOptions:{format:'png',filename:'resonance_iv',scale:2}}).then(bindPlot).catch(()=>{});
      }

      function renderTrend(){
        const plot=$('#reswinTrendPlot');if(!plot||!window.Plotly)return;
        normalizeCategories();
        const groups=new Map();
        for(const p of workspace.peaks||[]){
          if(p.accepted===false)continue;
          const key=`${p.direction>0?'up':'down'}::${p.peakOrder||1}`;
          if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
        }
        const traces=[...groups.entries()].map(([key,rows])=>{
          rows.sort((a,b)=>Number(a.vg)-Number(b.vg));
          const first=rows[0]||{};
          return {x:rows.map(p=>p.vg),y:rows.map(p=>p.v),mode:'lines+markers',name:`${directionName(first.direction)} · ${first.peakLabel||`峰${first.peakOrder||1}`}`,customdata:rows.map(p=>[p.id]),hovertemplate:'Vg=%{x}<br>Vpk=%{y:.6g} V<extra></extra>'};
        });
        Plotly.react(plot,traces,{margin:{l:62,r:20,t:36,b:50},xaxis:{title:'Vg (V)',gridcolor:'#edf0f5'},yaxis:{title:'Vpk (V)',gridcolor:'#edf0f5'},legend:{orientation:'h',y:-.2},autosize:true},{responsive:true,displaylogo:false}).catch(()=>{});
      }

      function renderPeakTable(){
        const table=$('#reswinPeakTable');if(!table)return;
        const sw=selectedSweep();
        const rows=(workspace.peaks||[]).filter(p=>!sw||p.sweepId===sw.id).sort((a,b)=>Number(a.v)-Number(b.v));
        table.innerHTML=`<thead><tr><th>类别</th><th>Vpk (V)</th><th>I (A)</th><th>来源</th><th>采纳</th><th>锁定</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr data-peak-id="${esc(p.id)}" class="${p.id===selectedPeakId?'selected':''}"><td>${esc(p.peakLabel||`峰${p.peakOrder||''}`)}</td><td>${Number(p.v).toPrecision(7)}</td><td>${Number(p.i).toExponential(5)}</td><td>${p.manual?'手动':'自动'}</td><td><input data-action="accept" type="checkbox" ${p.accepted!==false?'checked':''}></td><td><input data-action="lock" type="checkbox" ${p.locked?'checked':''}></td><td><button data-action="delete" class="danger-soft">删除</button></td></tr>`).join('')}</tbody>`;
        table.querySelectorAll('tbody tr').forEach(row=>{
          const id=row.dataset.peakId;
          row.onclick=e=>{if(e.target.closest('button,input'))return;selectedPeakId=id;renderPeakTable();};
          row.querySelector('[data-action="accept"]')?.addEventListener('change',e=>updatePeak(id,{accepted:e.target.checked}));
          row.querySelector('[data-action="lock"]')?.addEventListener('change',e=>updatePeak(id,{locked:e.target.checked}));
          row.querySelector('[data-action="delete"]')?.addEventListener('click',()=>deletePeak(id));
        });
      }

      function renderSummary(){
        const host=$('#reswinSummary');if(!host)return;
        host.innerHTML=`<span>数据 ${datasets.length}</span><span>扫描 ${sweeps.length}</span><span>可见 ${visibleSweeps().length}</span><span>峰 ${(workspace.peaks||[]).length}</span><span>手动 ${(workspace.peaks||[]).filter(p=>p.manual).length}</span>`;
      }

      function render(){renderControls();renderSummary();renderMainPlot();renderTrend();renderPeakTable();}

      function peaksCsv(){
        const rows=['dataset,vg,direction,peak_order,peak_label,vpk,i,accepted,manual,locked'];
        for(const p of workspace.peaks||[])rows.push([p.datasetPath,p.vg,directionName(p.direction),p.peakOrder,p.peakLabel,p.v,p.i,p.accepted!==false,p.manual===true,p.locked===true].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','));
        return rows.join('\n');
      }

      function mainCsv(){
        const sw=selectedSweep();if(!sw)return '';
        return ['Vd,I',...(sw.points||[]).map(p=>`${p.v},${p.i}`)].join('\n');
      }

      const service={
        serialize:()=>clone(workspace),
        restore(data,{legacyProject}={}){workspace=normalizeWorkspace(data,legacyProject||project);rebuild();if($('#reswinMainPlot'))render();},
        reset(){workspace=defaultWorkspace(project);rebuild();render();scheduleSnapshot();},
        render,
        selectSweep(id){selectedSweepId=String(id||'');render();},
        setTransform,setPreset,runDetection,addManualPeak,
        exportPeaks:()=>window.electronAPI?.saveText?.({defaultName:'resonance_peaks.csv',content:peaksCsv(),filters:[{name:'CSV',extensions:['csv']}]}),
        copyPeaks:()=>copyTextToClipboard(peaksCsv(),'峰参数 CSV'),
        exportMainCsv:()=>window.electronAPI?.saveText?.({defaultName:'resonance_iv.csv',content:mainCsv(),filters:[{name:'CSV',extensions:['csv']}]}),
        exportMainSvg:()=>savePlotlyImage('reswinMainPlot','resonance_iv','svg'),
        exportMainPng:()=>savePlotlyImage('reswinMainPlot','resonance_iv','png'),
        getState:()=>({workspace,datasets,sweeps,selectedSweep:selectedSweep(),selectedPeak:selectedPeak()})
      };

      function setProject(next){
        project=clone(next||{});
        workspace=normalizeWorkspace(pluginSliceFromProject(project),project);
        rebuild();
        if($('#reswinMainPlot'))render();
      }

      await setProject(project);
      return {
        serviceName:'resonance',service,render,
        setProject,
        syncProject(target){
          target.plugins=target.plugins&&typeof target.plugins==='object'?target.plugins:{};
          const plugin=target.plugins['builtin.resonance-workbench']&&typeof target.plugins['builtin.resonance-workbench']==='object'?target.plugins['builtin.resonance-workbench']:{};
          plugin.workspace=clone(workspace);
          target.plugins['builtin.resonance-workbench']=plugin;
        },
        getState:service.getState
      };
    }
  };
})();
