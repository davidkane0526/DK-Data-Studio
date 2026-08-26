  async function saveChartImage(plotId,defaultName,format){
    const data=await window.DKDSCharts.toImage(plotId,{format,width:1500,height:950,scale:format==='png'?2:1});
    if(format==='svg'){
      const raw=data.split(',')[1]||'';
      const content=decodeURIComponent(raw);
      return window.electronAPI.saveText({defaultName:`${defaultName}.svg`,content,filters:[{name:'SVG',extensions:['svg']}]});
    }
    const base64=data.split(',')[1]||'';
    return window.electronAPI.saveBase64({defaultName:`${defaultName}.png`,base64,filters:[{name:'PNG',extensions:['png']}]});
  }

  function activeGroupChartProviders(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    const context=pluginUiContext();
    return (window.DKDSPlugins?.registry?.values?.('ui.groupCharts')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .filter(p=>{
        try{return typeof p.supports==='function'?p.supports(context)!==false:true;}catch{return false;}
      })
      .sort((a,b)=>(Number(a.order)||100)-(Number(b.order)||100));
  }

  function activeGroupViewProvider(){
    const activityId=window.DKDSPlugins?.activities?.active?.()||null;
    return (window.DKDSPlugins?.registry?.values?.('ui.groupViews')||[])
      .filter(p=>!p.activity||p.activity===activityId)
      .sort((a,b)=>(Number(b.priority)||0)-(Number(a.priority)||0))[0]||null;
  }

  function traceColor(trace){
    return trace?.line?.color || trace?.marker?.color || '#64748b';
  }

  function renderSubplotLegend(host,traces){
    if(!host)return;
    if(!traces.length){host.innerHTML='<span class="muted">无可显示序列</span>';return;}
    host.innerHTML=traces.map(t=>{
      const c=traceColor(t),reverse=t?.line?.dash==='dash';
      return `<span class="trend-legend-chip dkds-legend-item"><i class="trend-legend-line ${reverse?'reverse':''}" style="color:${c}"></i><span>${escapeHtml(t.name||'')}</span></span>`;
    }).join('');
  }

  function resolvedTrendColumns(){
    const host=$('#trendGrid');
    const panel=$('#groupPanel');
    const count=Math.max(1,activeGroupChartProviders().length);
    if(state.trendColumns!=='auto'){
      const n=Math.max(1,Math.min(6,Number(state.trendColumns)||1));
      return Math.min(n,count);
    }
    const bodyWidth=Math.max(300,host?.parentElement?.clientWidth || panel?.clientWidth || 880);
    const maxByWidth=Math.max(1,Math.min(count,Math.floor(bodyWidth/300)));
    for(let c=maxByWidth;c>=1;c--)if(count%c===0)return c;
    return maxByWidth;
  }

  function updateTrendLayout(resizePlots=true){
    const grid=$('#trendGrid');
    if(!grid)return;
    const cols=resolvedTrendColumns();
    grid.style.setProperty('--trend-cols',String(cols));
    const gridWidth=Math.max(280,grid.clientWidth || grid.parentElement?.clientWidth || 800);
    const gap=12;
    const cardWidth=Math.max(160,(gridWidth-gap*(cols-1))/cols);
    const plotHeight=Math.max(220,Math.min(390,Math.round(cardWidth*0.62)));
    grid.style.setProperty('--trend-plot-height',`${plotHeight}px`);
    document.querySelectorAll('[data-trend-cols]').forEach(b=>{
      b.classList.toggle('active',String(b.dataset.trendCols)===String(state.trendColumns));
    });
    if(resizePlots){
      requestAnimationFrame(()=>{
        document.querySelectorAll('.trend-plot').forEach(plot=>{try{window.DKDSCharts?.resize?.(plot);}catch{}});
      });
    }
  }

  function setTrendColumns(value){
    state.trendColumns=value==='auto'?'auto':Math.max(1,Math.min(6,Number(value)||1));
    saveTrendColumnsPreference(state.trendColumns);
    const tab=activeProjectTab();if(tab)tab.trendColumns=state.trendColumns;
    updateTrendLayout(true);
    setStatus(`组图排列：${state.trendColumns==='auto'?'自动':`每行 ${state.trendColumns} 个`}`);
  }

  function bindPluginGroupPointClick(plot,provider,result){
    if(!plot||!window.DKDSCharts?.bind)return;
    try{plot.__dkdsGroupPointOff?.();}catch{}
    const off=window.DKDSCharts.bind('core.group-plots',plot,'dkds_chart_click',ev=>{
      try{provider.onPointClick?.({event:ev,point:ev?.points?.[0],result,context:pluginUiContext()});}
      catch(err){console.error('[DKDS group point click]',err);}
    });
    try{Object.defineProperty(plot,'__dkdsGroupPointOff',{value:off,writable:true,configurable:true});}catch{plot.__dkdsGroupPointOff=off;}
  }

  function renderTrendPanel(){
    const host=$('#trendGrid');
    if(!host)return;
    host.innerHTML='';
    const providers=activeGroupChartProviders();
    const view=activeGroupViewProvider();
    const context=pluginUiContext();
    const panelHeader=$('#groupPanelHeaderTitle');
    if(panelHeader)panelHeader.textContent=view?.panelTitle||view?.label||'组图';
    const title=$('#groupPanelTitle');
    if(title){
      try{title.textContent=view?.title?.(context)||view?.label||'组图';}
      catch{title.textContent='组图';}
    }

    if(!providers.length){
      host.innerHTML='<div class="empty-state">当前工作区没有提供组图类型。插件可以注册自己的数据模型、图形和导出方式。</div>';
      updateTrendLayout(false);
      return;
    }

    for(const provider of providers){
      let result;
      try{result=provider.build({context,host:window.DKDSPlugins?.host})||{};}
      catch(err){
        console.error(`[DKDS group chart:${provider.id}]`,err);
        result={title:provider.title||provider.name||provider.id,unit:'',traces:[],error:err.message};
      }

      const titleText=result.title||provider.title||provider.name||provider.id;
      const unit=result.unit||provider.unit||'';
      const card=document.createElement('div');
      card.className='trend-card';
      card.dataset.dkdsPlotScope='1';
      card.dataset.groupChartId=provider.id;
      card.innerHTML=`
        <div class="trend-card-header">
          <span>${escapeHtml(titleText)}</span>
          <span class="trend-header-actions dkds-integrated-action-group">
            <button type="button" class="trend-csv-btn">CSV</button>
            <button type="button" class="trend-copy-btn copy-btn">复制</button>
          </span>
        </div>
        <div class="trend-plot"></div>
        <div class="trend-card-legend" data-dkds-legend></div>`;
      host.appendChild(card);
      const plot=card.querySelector('.trend-plot');
      const legend=card.querySelector('.trend-card-legend');
      const traces=Array.isArray(result.traces)?result.traces:[];

      if(result.error){
        plot.innerHTML=`<div class="empty-state">${escapeHtml(result.error)}</div>`;
      }else{
        renderSubplotLegend(legend,traces);
        const layout={
          margin:{l:60,r:14,t:14,b:48},
          xaxis:{title:result.xTitle||'Vg (V)',gridcolor:'#edf0f5',automargin:true},
          yaxis:{title:unit,gridcolor:'#edf0f5',automargin:true},
          showlegend:false,hovermode:'closest',dragmode:'zoom',autosize:true,
          ...(result.layout||{})
        };
        const config={displayModeBar:false,responsive:true,doubleClick:'reset',...(result.config||{})};
        window.DKDSCharts.react(plot,traces,layout,config).then(()=>bindPluginGroupPointClick(plot,provider,result));
      }

      card.addEventListener('dblclick',event=>{
        if(event.target.closest('button')||!traces.length)return;
        openZoomChart(titleText,unit,traces,provider,result);
      });
      card.querySelector('.trend-csv-btn').onclick=event=>{
        event.stopPropagation();
        const text=typeof result.csvText==='function'?result.csvText():result.csvText;
        if(text)window.electronAPI.saveText({defaultName:`${safeName(titleText)}.csv`,content:text,filters:[{name:'CSV',extensions:['csv']}]});
      };
      card.querySelector('.trend-copy-btn').onclick=event=>{
        event.stopPropagation();
        const text=typeof result.csvText==='function'?result.csvText():result.csvText;
        if(text)copyTextToClipboard(text,`${titleText} CSV`);
      };
    }
    updateTrendLayout(true);
  }


  function openZoomChart(title,unit,traces,provider=null,result=null){
    state.zoomChart={title,unit,traces}; $('#zoomPanelTitle').textContent=title; $('#zoomPanel').classList.remove('hidden');
    const layout={
      margin:{l:78,r:145,t:42,b:62},xaxis:{title:'Vg (V)',automargin:true},yaxis:{title:unit,automargin:true},
      legend:{orientation:'v',x:1.02,xanchor:'left',y:1},hovermode:'closest',dragmode:'zoom',uirevision:`zoom-${title}`
    };
    const config={
      responsive:true,displaylogo:false,displayModeBar:true,scrollZoom:true,doubleClick:'reset+autosize',
      modeBarButtonsToAdd:['select2d','lasso2d'],toImageButtonOptions:{format:'svg',filename:safeName(title),width:1400,height:900}
    };
    window.DKDSCharts.react('zoomPlot',traces,layout,config).then(()=>{
      if(provider)bindPluginGroupPointClick($('#zoomPlot'),provider,result||{});
      requestAnimationFrame(()=>{try{window.DKDSCharts?.resize?.($('#zoomPlot'));}catch{}});
    });
  }

  function zoomCsvText(){
    if(!state.zoomChart)return '';
    const rows=['series,Vg,value'];
    for(const t of state.zoomChart.traces)for(let i=0;i<t.x.length;i++)rows.push([csvCell(t.name),t.x[i],t.y[i]].join(','));
    return rows.join('\n');
  }

  function currentMainViewCsvText(){
    const provider=activeMainViewProvider();
    if(provider?.csvText){
      try{return String(provider.csvText({state,context:pluginUiContext()})||'');}
      catch(err){setStatus(`主图数据导出失败：${err.message}`);return '';}
    }
    return '';
  }

  async function exportCurrentMainCsv(){
    const provider=activeMainViewProvider();
    if(provider?.exportCsv)return provider.exportCsv({state,context:pluginUiContext()});
    const text=currentMainViewCsvText();
    if(!text){setStatus('当前主图插件没有提供数据导出。');return false;}
    const name=provider?.exportBaseName||'main_view_data';
    return window.electronAPI.saveText({defaultName:`${safeName(name)}.csv`,content:text,filters:[{name:'CSV',extensions:['csv']}]});
  }

  async function exportCurrentMainSvg(){
    const provider=activeMainViewProvider();
    if(provider?.exportSvg)return provider.exportSvg({state,context:pluginUiContext()});
    setStatus('当前主图插件没有提供 SVG 导出。');
    return false;
  }

  async function exportCurrentMainPng(){
    const provider=activeMainViewProvider();
    if(provider?.exportPng)return provider.exportPng({state,context:pluginUiContext()});
    setStatus('当前主图插件没有提供 PNG 导出。');
    return false;
  }
