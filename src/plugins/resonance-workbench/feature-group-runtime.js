(() => {
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,dom,charts,copyTextToClipboard}=services;
    const {S}=services;
    const {
      groupSeries,peakMetrics,selectedPeak,selectedSweep,visibleSweeps,visibleSweepIds,
      peakLabel,colorForPeakOrder,scientificReact,peakPointEntity,peakById,publishPeakSelection,resize
    }=actions;
    const {esc,directionName,csvCell}=utils;
    const groupPortables=new Map();
    const groupCards=new Map();
    const groupPlotViews=new Map();
    let groupRenderKey='';

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
    function ensureGroupCard(key,title){
      let row=groupCards.get(String(key));if(row?.card?.isConnected)return row;
      const hostEl=$('#reswinGroupGrid');if(!hostEl)return null;
      const card=dom.create('div');card.className='reswin-group-card dkds-surface';card.dataset.groupMetric=String(key);
      card.innerHTML=`<div class="reswin-group-head dkds-plot-view-head"><span class="reswin-group-title dkds-plot-view-title">${esc(title)}</span><span class="reswin-group-card-actions dkds-plot-view-actions dkds-integrated-action-group"></span></div><div class="reswin-group-plot"></div>`;
      hostEl.appendChild(card);
      const plot=card.querySelector('.reswin-group-plot');
      row={key:String(key),title,card,plot,chart:null,portable:null,plotView:null,series:[]};groupCards.set(String(key),row);
      const plotView=live.uiRuntime?.plotViews?.bind?.(`resonance-group:${key}`,card,{
        plot,header:'.reswin-group-head',actionsHost:'.reswin-group-card-actions',fileStem:()=>`resonance_${row.key}`,csv:()=>groupCsv(row.title,row.series||[]),copyText:(text)=>copyTextToClipboard(text,`${row.title} CSV`),
        placements:['home','left','right','bottom','global'],defaultPlacement:'home',stateVersion:'workspace-v3',snap:false,portableFactory:(id,node,spec)=>live.workspaceRuntime?.portable?.(id,node,{...spec,onPlacementChanged:()=>resize()})
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
      const peaks=(live.workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleIds.includes(String(p.sweepId))).map(p=>[
        p.id,p.sweepId,p.v,p.i,p.vg,p.direction,p.peakOrder,peakLabel(p),p.prominence,p.widthLeft,p.widthRight,p.analysisLeft,p.analysisRight,p.manual?1:0,p.locked?1:0
      ].join(':')).join('|');
      return `${live.workspace.groupColumns||'auto'}##${visibleIds.join(',')}##${peaks}`;
    }
    function renderGroup(){
      const hostEl=$('#reswinGroupGrid');if(!hostEl||!charts)return;
      const context=$('#reswinGroupContext');if(context)context.textContent=groupContextText();
      const nextKey=groupDataFingerprint();
      if(nextKey===groupRenderKey&&groupCards.size){live.uiRuntime?.infrastructure?.requestChartResize?.({reason:'resonance-group-focus'});return;}
      groupRenderKey=nextKey;
      const defs=[['v','峰位 Vpk','V'],['i','峰电流 Ipk','A'],['fwhm','FWHM','V'],['amplitude','峰高 A','A'],['area','峰面积 S','A·V'],['prominence','峰突出度','A']];
      const visibleIds=new Set(visibleSweepIds().map(String));
      const acceptedVisible=(live.workspace.peaks||[]).filter(p=>p.accepted!==false&&visibleIds.has(String(p.sweepId)));
      let empty=hostEl.querySelector('.reswin-group-empty');
      if(!acceptedVisible.length){
        for(const row of groupCards.values())row.card.classList.add('hidden');
        if(!empty){empty=dom.create('div');empty.className='reswin-group-empty dkds-note';hostEl.appendChild(empty);}
        empty.textContent=(live.workspace.peaks||[]).length?'当前可见扫描没有已采纳峰，组图没有可绘制的数据。':'当前工程没有已保存共振峰。组图会在完成寻峰或恢复已保存峰后自动生成。';
        live.uiRuntime?.infrastructure?.requestChartResize?.({reason:'resonance-group-empty'});
        return;
      }
      empty?.remove?.();
      const labels=[...new Set(acceptedVisible.map(peakLabel))];
      const terSeries=labels.map(label=>{const representative=acceptedVisible.find(p=>peakLabel(p)===label),order=Number(representative?.peakOrder)||1;return {name:`共振TER·${label}`,label,order,color:colorForPeakOrder(order,1),points:S.computeResonantTerForLabel?.(live.workspace.peaks,live.sweeps,label,[...visibleIds])||[]};}).filter(x=>x.points.length);
      const count=defs.length+(terSeries.length?1:0);
      let cols=live.workspace.groupColumns==='auto'?Math.max(1,Math.min(6,Math.floor((hostEl.clientWidth||1000)/330))):Number(live.workspace.groupColumns)||2;
      cols=Math.min(Math.max(1,cols),Math.max(1,count));
      hostEl.style.setProperty('--reswin-group-cols',String(cols));
      const cardWidth=Math.max(220,((hostEl.clientWidth||1000)-12*(cols-1))/cols);hostEl.style.setProperty('--reswin-group-height',`${Math.max(168,Math.min(228,Math.round(cardWidth*.43)))}px`);
      const activeKeys=new Set();
      for(const [metric,title,unit] of defs){
        activeKeys.add(metric);const series=groupMetricRows(metric),row=ensureGroupCard(metric,title);if(!row)continue;row.card.classList.remove('hidden');row.title=title;row.series=series;row.card.querySelector('.reswin-group-title').textContent=title;
        const traces=series.map(sr=>({x:sr.rows.map(r=>r.p.vg),y:sr.rows.map(r=>r.value),mode:'lines+markers',name:sr.name,line:{color:sr.color,dash:sr.direction<0?'dash':'solid'},marker:{color:sr.color,size:7,line:{width:1}},customdata:sr.rows.map(r=>[r.p.id,r.p.sweepId]),hovertemplate:`Vg=%{x}<br>${title}=%{y}<extra>%{fullData.name}</extra>`}));
        const layout={margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)'},yaxis:{title:unit},autosize:true};
        scientificReact(row.plot,traces,layout,{responsive:true,displayModeBar:false},{focusPolicy:{inactiveOpacity:.28,pointInactiveOpacity:.34,pointSizeBoost:5,pointMinSize:12,activeLineWidth:2.8},pointEntity:peakPointEntity,onEntitySelect:({entity,event})=>{const p=peakById(entity?.id);if(p)publishPeakSelection(p,'resonance-group',{openInspector:true,additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
      }
      const terKey='ter';
      if(terSeries.length){
        activeKeys.add(terKey);const row=ensureGroupCard(terKey,'共振 TER');if(row){row.card.classList.remove('hidden');row.title='共振 TER';row.series=terSeries.map(sr=>({...sr,rows:sr.points.map(p=>({p:{vg:p.vg},value:p.ter}))}));row.card.querySelector('.reswin-group-title').textContent='共振 TER';
          const traces=terSeries.map(sr=>({x:sr.points.map(p=>p.vg),y:sr.points.map(p=>p.ter),mode:'lines+markers',name:sr.label,line:{color:sr.color},marker:{color:sr.color},hovertemplate:'Vg=%{x}<br>TER=%{y:.4g}%<extra>%{fullData.name}</extra>'}));
          const layout={margin:{l:62,r:14,t:16,b:52},xaxis:{title:'Vg (V)'},yaxis:{title:'TER (%)'},autosize:true};
          scientificReact(row.plot,traces,layout,{responsive:true,displayModeBar:false}).catch(()=>{});
        }
      }
      for(const [key,row] of groupCards)row.card.classList.toggle('hidden',!activeKeys.has(key));
      live.uiRuntime?.infrastructure?.requestChartResize?.({reason:'resonance-group-render'});dom.frame(()=>resize());
    }

    function invalidate(){groupRenderKey='';}
    function state(){return {cards:groupCards.size,plots:groupPlotViews.size,renderKey:groupRenderKey};}
    return Object.freeze({render:renderGroup,dispose:disposeGroupViews,invalidate,state,contextText:groupContextText});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-group-runtime',Object.freeze({create}));
})();
