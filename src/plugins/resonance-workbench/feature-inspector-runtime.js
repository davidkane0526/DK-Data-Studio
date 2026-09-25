(() => {
  const InspectorProjection=window.DKDSPluginModules.require('builtin.resonance-workbench','inspector-detail-projection');
  // Inspector is a projection of the shared selection/domain state. Its root owns
  // one delegated click handler through ctx.ui.dom; re-rendering never multiplies listeners.
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,dom,charts,S,transforms,setStatus}=services;
    const {esc,fmt,finite,directionName}=utils;
    let boundHost=null;
    let disposeClick=null;

    function ensureDelegation(host){
      if(boundHost===host)return;
      disposeClick?.();disposeClick=null;boundHost=host;
      disposeClick=dom.on(host,'click',event=>{
        const button=event.target?.closest?.('button');if(!button||!host.contains(button))return;
        const p=actions.selectedPeak();if(!p)return;
        if(button.dataset.peakCategory!==undefined){actions.assignPeakCategory(p,button.dataset.peakCategory);return;}
        switch(button.id){
          case 'reswinAddPeakCategory':actions.createPeakCategoryForPeak(p);break;
          case 'reswinApplyPeakLabel':actions.renameSelectedCategory(dom.query('#reswinPeakLabelInput',host)?.value);break;
          case 'reswinAcceptPeak':actions.updatePeak(p.id,{accepted:p.accepted===false});break;
          case 'reswinLockPeak':actions.updatePeak(p.id,{locked:!p.locked});break;
          case 'reswinResetFwhmWindow':
            delete p.analysisLeft;delete p.analysisRight;delete p.analysisManual;
            actions.commitPeakMetricEdit(p,{reason:'fwhm-window-reset'});actions.scheduleSnapshot();setStatus('已恢复自动 FWHM 分析窗口。');break;
          case 'reswinDeletePeak':actions.deletePeak(p.id);break;
          case 'reswinSelectCurve':{const row=actions.sweepById(p.sweepId);if(row)actions.publishSweepSelection(row,'resonance-inspector');break;}
        }
      });
    }

    function render(){
      const host=$('#reswinInspectorBody');if(!host)return;ensureDelegation(host);
      const sw=actions.selectedSweep(),p=actions.selectedPeak();actions.normalizeCategories();
      if(!sw&&!p){dom.html(host,'<div class="empty-state">未选中曲线或峰。可在主图中直接点击曲线/峰位。</div>');return;}
      const details=InspectorProjection.project({selectedSweep:sw,selectedPeak:p,workspace:live.workspace,sweepById:actions.sweepById,peakMetrics:actions.peakMetrics});
      const detailMarkup=`<div class="respar-inspector-section dkds-inspector-section"><h4>${esc(details.title)}</h4><div class="respar-inspector-kv">${details.rows.map(row=>`<div class="k">${esc(row.label)}</div><div>${esc(row.value)}</div>`).join('')}</div></div>`;
      const transformMarkup=sw?'<div class="respar-inspector-transform"><div class="respar-inspector-hint dkds-meta">辅助视图仅用于检查；主图、峰位与 FWHM 始终基于原始 I–V 采样。</div><div id="reswinInspectPlot" class="analysis-chart respar-inspect-plot"></div></div>':'';
      if(p){
        const categories=live.workspace.peakCategories||[];
        const categoryButtons=categories.map((c,index)=>`<button type="button" class="peak-category-choice dkds-action-button dkds-choice-button ${Number(c.order)===Number(p.peakOrder)?'selected':''}" data-peak-category="${Number(c.order)}"><span class="category-pair-swatch dkds-series-swatch-pair"><i data-peak-pair-color="${index}:1"></i><i data-peak-pair-color="${index}:-1"></i></span><span>${esc(c.label)}</span></button>`).join('');
        dom.html(host,`${detailMarkup}<div class="respar-inspector-section dkds-inspector-section"><h4>峰类别 / 峰标签</h4><div class="respar-inspector-hint dkds-meta">点击已有颜色即可把该峰归入现有类别；新增类别会自动分配下一组正扫冷色/反扫暖色。</div><div class="peak-category-palette">${categoryButtons}</div><div class="respar-inspector-row dkds-toolbar"><button id="reswinAddPeakCategory">＋ 新增类别/颜色</button></div><div class="respar-peak-class-grid"><label>当前类别<input type="text" value="峰${Math.max(1,Number(p.peakOrder)||1)}" disabled></label><label>类别标签<input id="reswinPeakLabelInput" type="text" value="${esc(actions.peakLabel(p))}"></label></div><div class="respar-inspector-row dkds-toolbar"><button id="reswinApplyPeakLabel">重命名当前类别</button></div></div><div class="respar-inspector-action-grid dkds-action-row"><button id="reswinAcceptPeak">${p.accepted!==false?'不采纳':'恢复采纳'}</button><button id="reswinLockPeak">${p.locked?'解除锁定':'锁定峰位'}</button><button id="reswinResetFwhmWindow">FWHM 自动窗口</button><button id="reswinDeletePeak" class="danger-soft">删除峰</button><button id="reswinSelectCurve">选中所属曲线</button></div>${transformMarkup}`);
        dom.all('[data-peak-pair-color]',host).forEach(swatch=>{const [indexText,directionText]=String(swatch.dataset.peakPairColor||'').split(':'),category=categories[Number(indexText)],direction=Number(directionText)||1;if(category)dom.token(swatch,{'--dkds-series-color':actions.colorForPeakOrder(category.order,direction)});});
      }else{
        dom.html(host,`${detailMarkup}${transformMarkup}`);
      }
      const plot=dom.query('#reswinInspectPlot',host);if(plot&&charts&&sw){
        const transformId=actions.currentTransform(sw),t=transforms?.runCurve?.(transformId,sw)||S.transformSweep?.(sw,transformId)||{points:(sw.points||[]).map(q=>({v:q.v,y:q.i})),label:'I',unit:'A'};
        const transformColor=actions.colorForSeries(`resonance.inspector.${transformId}`,t.label||transformId,'resonance.inspector');
        const traces=[{x:t.points.map(q=>q.v),y:t.points.map(q=>q.y),mode:'lines',name:t.label,line:{width:1.8,color:transformColor}}],peaks=(live.workspace.peaks||[]).filter(q=>q.sweepId===sw.id&&q.accepted!==false);
        if(peaks.length){const xs=t.points.map(q=>q.v),ys=peaks.map(q=>t.points[S.nearestIndex(xs,q.v)]?.y);traces.push({x:peaks.map(q=>q.v),y:ys,mode:'markers',name:'原始峰位投影',marker:{size:9,color:peaks.map(q=>actions.peakColor(q)),symbol:peaks.map(q=>q.manual?'diamond':'circle-open')},customdata:peaks.map(q=>[q.id]),hovertemplate:'Vpk=%{x:.6g} V<extra></extra>'});}
        actions.scientificReact(plot,traces,{margin:{l:62,r:16,t:20,b:50},xaxis:{title:'Vd (V)'},yaxis:{title:t.label||''},legend:{orientation:'h',y:-.18},autosize:true},{responsive:true,displaylogo:false,displayModeBar:false},{traceEntity:(trace,index)=>index===0?{id:String(sw.id),type:'resonance.sweep',parents:[actions.datasetEntityId(sw.datasetPath)]}:null,pointEntity:actions.peakPointEntity,onEntitySelect:({entity,event})=>{const peak=actions.peakById(entity?.id);if(peak)actions.publishPeakSelection(peak,'resonance-inspector',{additive:!!(event?.event?.ctrlKey||event?.event?.metaKey)});}}).catch(()=>{});
      }
    }
    function dispose(){disposeClick?.();disposeClick=null;boundHost=null;}
    return Object.freeze({render,dispose});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-inspector-runtime',Object.freeze({create}));
})();
