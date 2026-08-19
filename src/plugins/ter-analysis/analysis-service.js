(() => {
  const A=window.Analysis;
  const $=s=>document.querySelector(s);

  function finite(value){return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(Number(value));}
  function numOrNull(value){if(!finite(value))return null;return Number(value);}
  function csvCell(value){const s=String(value??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}

  function cloneSerializable(value){
    if(value===null||value===undefined)return value;
    try{return structuredClone(value);}catch{return JSON.parse(JSON.stringify(value));}
  }

  window.DKDSTERAnalysisService={
    async create({host,project:initialProject,bootstrap,setStatus,copyTextToClipboard,savePlotlyImage,scheduleSnapshot}){
      let project=initialProject||{};
      let settings={};
      let display={};
      let result=null;

      function applyProject(next){
        project=next||{};
        settings={
          vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,
          ...(project.terMaxSettings||{})
        };
        display={
          colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null,
          ...(project.terHeatmapDisplay||{})
        };
        result=project.terMaxResult?cloneSerializable(project.terMaxResult):null;
      }
      applyProject(project);

      function visibilityMap(){
        return new Map(Array.isArray(project.scanVisibility)?project.scanVisibility:[]);
      }
      function datasets(){
        const rows=Array.isArray(project.datasets)?project.datasets:[];
        if(!settings.onlyFullyVisible)return rows.slice();
        const vis=visibilityMap();
        return rows.filter(ds=>{
          const v=vis.get(ds.path);
          return !!v?.forward&&!!v?.reverse;
        });
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
        const read=id=>numOrNull($('#'+id)?.value);
        settings={
          vmin:read('terVmin'),vmax:read('terVmax'),vstep:read('terVstep'),
          tolerance:read('terTolerance'),currentFloor:read('terCurrentFloor')??1e-15,
          onlyFullyVisible:!!$('#terOnlyFullyVisible')?.checked
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
        readInputs();
        try{
          result=A.computeTerMatrix(datasets(),settings);
          settings={...settings,
            vmin:result.used.vmin,vmax:result.used.vmax,vstep:result.used.vstep,
            tolerance:result.used.tolerance,currentFloor:result.used.currentFloor
          };
          syncInputs();renderResult();scheduleSnapshot();
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
          const el=document.getElementById(id);if(el)try{Plotly.purge(el);}catch{}
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

        const vals=r.matrix.flat().filter(Number.isFinite);
        const autoMin=vals.length?Math.min(...vals):0,autoMax=vals.length?Math.max(...vals):1;
        const zmin=finite(display.zmin)?Number(display.zmin):autoMin;
        const zmax=finite(display.zmax)?Number(display.zmax):autoMax;
        Plotly.react('terHeatmapPlot',[{
          x:r.targets,y:r.vgs,z:r.matrix,type:'heatmap',colorscale:display.colorscale||'Viridis',
          zmin,zmax,zsmooth:false,
          colorbar:{title:{text:'TER (%)',side:'right'},thickness:18,len:.86,
            tickmode:display.colorDtick?'linear':'auto',dtick:display.colorDtick||undefined},
          hovertemplate:'Vg=%{y}<br>Vds=%{x}<br>TER=%{z:.4g}%<extra></extra>'
        }],{
          margin:{l:76,r:96,t:26,b:66},
          xaxis:{title:'Vds (V)',automargin:true,tickmode:display.xDtick?'linear':'auto',dtick:display.xDtick||undefined,constrain:'domain'},
          yaxis:{title:'Vg (V)',automargin:true,tickmode:display.yDtick?'linear':'auto',dtick:display.yDtick||undefined,constrain:'domain'},
          dragmode:'zoom',autosize:true,paper_bgcolor:'#fff',plot_bgcolor:'#fff'
        },plotConfig('TER_heatmap'));

        const maxVg=r.terMaxByVg||r.terMax||[],maxVd=r.terMaxByVd||[];
        Plotly.react('terMaxVgPlot',[{
          x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.terMax),mode:'lines+markers',name:'TER_Max–Vg',
          marker:{size:8},line:{width:2},customdata:maxVg.map(d=>d.vdsAtMax),
          hovertemplate:'Vg=%{x}<br>TER_Max=%{y:.5g}%<br>Vd@max=%{customdata:.5g} V<extra></extra>'
        }],baseLayout('Vg (V)','TER_Max–Vg (%)'),plotConfig('TER_Max-Vg'));
        Plotly.react('terMaxVgArgPlot',[{
          x:maxVg.map(d=>d.vg),y:maxVg.map(d=>d.vdsAtMax),mode:'lines+markers',name:'Vd@max',marker:{size:8}
        }],baseLayout('Vg (V)','Vd @ TER_Max–Vg (V)'),plotConfig('Vd_at_TER_Max-Vg'));
        Plotly.react('terMaxVdPlot',[{
          x:maxVd.map(d=>d.vds),y:maxVd.map(d=>d.terMax),mode:'lines+markers',name:'TER_Max–Vd',marker:{size:7},line:{width:2},
          customdata:maxVd.map(d=>d.vgAtMax),
          hovertemplate:'Vd=%{x}<br>TER_Max=%{y:.5g}%<br>Vg@max=%{customdata:.5g} V<extra></extra>'
        }],baseLayout('Vd (V)','TER_Max–Vd (%)'),plotConfig('TER_Max-Vd'));
        Plotly.react('terMaxVdArgPlot',[{
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
      async function saveCsv(name,content){if(!content)return false;return window.electronAPI.saveText({defaultName:name,content,filters:[{name:'CSV',extensions:['csv']}]});}

      const service={
        serialize:()=>({schema:1,settings:cloneSerializable(settings),display:cloneSerializable(display),result:result?cloneSerializable(result):null}),
        restore(data,{legacyProject}={}){
          const legacy=legacyProject&&typeof legacyProject==='object'?{
            settings:legacyProject.terMaxSettings,
            display:legacyProject.terHeatmapDisplay,
            result:legacyProject.terMaxResult
          }:null;
          const source=data&&typeof data==='object'?data:legacy;
          if(!source)return;
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false,...(source.settings||{})};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null,...(source.display||{})};
          result=source.result?cloneSerializable(source.result):null;
          if($('#terSummary'))render();
        },
        reset(){
          settings={vmin:null,vmax:null,vstep:null,tolerance:null,currentFloor:1e-15,onlyFullyVisible:false};
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          result=null;
          if($('#terSummary'))render();
          scheduleSnapshot();
        },
        render,getState:()=>({settings,display,result}),autoParameters,calculate,
        applyDisplay(){readDisplay();if(result)renderResult();setStatus('TER 热图显示范围/刻度已应用。');},
        resetDisplay(){
          display={colorscale:'Viridis',zmin:null,zmax:null,colorDtick:null,xDtick:null,yDtick:null};
          syncDisplay();if(result)renderResult();scheduleSnapshot();setStatus('TER 热图色阶和坐标刻度已恢复自动。');
        },
        setOnlyFullyVisible(value){settings.onlyFullyVisible=!!value;autoParameters();},
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
          target.terMaxResult=result?cloneSerializable(result):null;
        },
        getState:()=>({settings,display,result})
      };
    }
  };
})();
