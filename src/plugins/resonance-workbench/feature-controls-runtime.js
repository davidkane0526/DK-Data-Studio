(() => {
  // Resonance control rail controller. Rendering is declarative; persistent DOM
  // lifecycle is owned by ctx.ui.dom and dataset rows use constant event delegation.
  function create(context){
    const {live,services,actions,utils}=context;
    const {$,dom,dialogs,transforms,S,setStatus}=services;
    const {esc,finite,directionName}=utils;
    let dataSourcesRuntime=null;
    let datasetContextBehavior=null;
    let datasetListNode=null;
    let datasetListDisposers=[];

    function transformDefinitions(){
      return transforms?.list?.({supportsScalarField:true})?.filter?.(row=>row?.public!==false&&(!row.tags?.length||row.tags.includes('transport')))||[];
    }
    function transformOptionsHtml(selected='raw'){
      const rows=transformDefinitions();
      const source=rows.length?rows:[
        {id:'raw',title:'原始 I–V'},{id:'detrend',title:'去背景 I−Ibg'},{id:'didv',title:'dI/dV'},
        {id:'d2idv2',title:'d²I/dV²'},{id:'dlog',title:'d ln|I|/dV'},{id:'dvdi',title:'dV/dI'},{id:'resistance',title:'R=|V/I|'}
      ];
      return source.map(row=>`<option value="${esc(row.id)}" ${String(row.id)===String(selected)?'selected':''}>${esc(row.title||row.label||row.id)}</option>`).join('');
    }
    function currentTransform(sw){
      const map=new Map(live.workspace.transformPreviewByDataset||[]);
      const requested=String(map.get(sw?.datasetPath)||'raw');
      return transforms?.resolve?.(requested)?.id||requested;
    }
    function setTransform(type){
      const sw=actions.selectedSweep();if(!sw)return;
      const map=new Map(live.workspace.transformPreviewByDataset||[]);
      map.set(sw.datasetPath,String(type||'raw'));
      live.workspace.transformPreviewByDataset=[...map.entries()];
      actions.render();actions.scheduleSnapshot();
    }
    function setDatasetVg(path,value){
      if(!finite(value))return;
      const next=Number(value),rows=live.workspace.datasetMeta||[],row=rows.find(x=>String(x.path)===String(path));
      if(row)row.vg=next;else rows.push({path,vg:next});
      for(const d of live.datasets)if(String(d.path)===String(path))d.vg=next;
      actions.rebuild();
      const vgByPath=new Map(live.datasets.map(d=>[String(d.path),Number(d.vg)]));
      for(const p of live.workspace.peaks||[])if(vgByPath.has(String(p.datasetPath)))p.vg=vgByPath.get(String(p.datasetPath));
      actions.render();actions.scheduleSnapshot();
    }
    function fitVisibleData(reason='visibility'){
      live.workspace.mainView={xDomain:null,yDomain:null};
      actions.ensureMainSurface()?.fitToData?.({source:'resonance',reason});
    }
    function syncSelectedSweepToVisibility(){
      const visible=actions.visibleSweeps();
      if(actions.isVisible(actions.selectedSweep()))return;
      actions.setSelectedSweepId(visible[0]?.id||'');
    }
    function setVisibility(path,direction,value){
      const map=actions.visibilityMap(),row=map.get(String(path))||{forward:true,reverse:true};
      if(direction>0)row.forward=!!value;else row.reverse=!!value;
      map.set(String(path),row);live.workspace.scanVisibility=[...map.entries()];
      syncSelectedSweepToVisibility();
      syncDatasetVisibility($('#reswinDatasetList'));syncVisibilityModeButtons();
      fitVisibleData('visibility');actions.visibilityChanged?.('visibility');actions.scheduleSnapshot();
    }
    function visibilityMode(){
      const map=actions.visibilityMap();if(!live.datasets.length)return'all';
      let allF=true,allR=true,anyF=false,anyR=false;
      for(const d of live.datasets){
        const row=map.get(String(d.path))||{forward:true,reverse:true},f=row.forward!==false,r=row.reverse!==false;
        allF&&=f;allR&&=r;anyF||=f;anyR||=r;
      }
      if(allF&&allR)return'all';if(allF&&!anyR)return'forward';if(!anyF&&allR)return'reverse';if(!anyF&&!anyR)return'none';return'';
    }
    function syncVisibilityModeButtons(){
      const mode=visibilityMode(),rows={all:'#reswinShowAll',forward:'#reswinShowForward',reverse:'#reswinShowReverse',none:'#reswinHideAll'};
      for(const [key,selector] of Object.entries(rows)){
        const button=$(selector);if(!button)continue;const selected=mode===key;
        button.classList.remove('active');button.classList.toggle('selected',selected);
        button.setAttribute('aria-pressed',String(selected));button.removeAttribute('aria-current');
      }
    }
    function setAllVisibility(value){
      const map=actions.visibilityMap(),mode=typeof value==='string'?value:(value?'all':'none');
      for(const d of live.datasets)map.set(String(d.path),{forward:mode==='all'||mode==='forward',reverse:mode==='all'||mode==='reverse'});
      live.workspace.scanVisibility=[...map.entries()];
      syncSelectedSweepToVisibility();
      syncDatasetVisibility($('#reswinDatasetList'));syncVisibilityModeButtons();
      fitVisibleData('visibility-all');actions.visibilityChanged?.('visibility-all');actions.scheduleSnapshot();
    }
    function setPreset(name){
      live.workspace.algorithms={...(S.preset?.(name)||live.workspace.algorithms||{}),_preset:String(name||'balanced')};
      render();actions.scheduleSnapshot();
    }

    function datasetSource(path){return live.datasets.find(row=>String(row?.path||row?.name||'')===String(path||''))||null;}
    async function renameDatasetSource(path){
      const row=datasetSource(path);if(!row||!dataSourcesRuntime?.rename||!dialogs?.prompt)return false;
      const label=await dialogs.prompt({title:'修改数据标签',inputLabel:'数据标签',value:String(row.name||row.path||''),confirmLabel:'保存'});
      if(label===null)return false;const name=String(label||'').trim();if(!name)return false;
      try{await dataSourcesRuntime.rename({path:String(row.path||path)},name);actions.refreshData();setStatus(`数据标签已修改为：${name}`);return true;}
      catch(err){setStatus(`修改数据标签失败：${err?.message||err}`);return false;}
    }
    async function toggleDatasetSourceExcluded(path){
      const row=datasetSource(path);if(!row||!dataSourcesRuntime?.setExcluded)return false;const next=row.excluded!==true;
      try{await dataSourcesRuntime.setExcluded({path:String(row.path||path)},next);actions.refreshData();setStatus(`${next?'已排除':'已恢复'}数据：${row.name||row.path}`);return true;}
      catch(err){setStatus(`修改数据参与状态失败：${err?.message||err}`);return false;}
    }
    async function deleteDatasetSource(path){
      const row=datasetSource(path);if(!row||!dataSourcesRuntime?.remove||!dialogs?.confirm)return false;
      const confirmed=await dialogs.confirm({title:'删除源数据',message:`删除“${row.name||row.path}”？`,confirmLabel:'删除',destructive:true});
      if(!confirmed)return false;
      try{const result=await dataSourcesRuntime.remove([{path:String(row.path||path)}]);actions.refreshData();const count=Array.isArray(result?.removed)?result.removed.length:0;setStatus(count?`已删除 ${count} 组源数据。`:'源数据已不存在。');return count>0;}
      catch(err){setStatus(`删除源数据失败：${err?.message||err}`);return false;}
    }
    function datasetActionItems(path){
      const row=datasetSource(path);if(!row)return[];
      return [
        {id:'rename',label:'修改标签',icon:'✎',enabled:!!dataSourcesRuntime?.rename,onInvoke:()=>void renameDatasetSource(path)},
        {id:'exclude',label:row.excluded===true?'恢复参与分析':'排除',icon:row.excluded===true?'○':'⊘',enabled:!!dataSourcesRuntime?.setExcluded,onInvoke:()=>void toggleDatasetSourceExcluded(path)},
        {type:'separator'},
        {id:'delete',label:'删除',icon:'×',enabled:!!dataSourcesRuntime?.remove,onInvoke:()=>void deleteDatasetSource(path)}
      ];
    }
    function ensureDatasetContextBehavior(list){
      if(datasetContextBehavior||!list||!live.uiRuntime?.interactionBehaviors?.create)return;
      datasetContextBehavior=live.uiRuntime.interactionBehaviors.create('resonance-dataset-context',{bindings:[{id:'resonance.dataset.context',gesture:'context',target:'dataset',intent:'context-menu',contextActions:context=>datasetActionItems(context.path)}]});
      datasetContextBehavior.bind(list,{selector:'.respar-dataset-item',gestures:['context'],target:'dataset',targetId:({element})=>String(element.dataset.datasetPath||''),payload:({element})=>({path:String(element.dataset.datasetPath||''),dataset:datasetSource(String(element.dataset.datasetPath||''))})});
    }
    function datasetRowsHtml(){
      const vis=actions.visibilityMap();
      return live.datasets.map(d=>{
        const row=vis.get(String(d.path))||{forward:true,reverse:true};
        const transform=new Map(live.workspace.transformPreviewByDataset||[]).get(String(d.path))||'raw';
        return `<div class="respar-dataset-item dkds-list-item${d.excluded===true?' is-excluded':''}" data-dataset-path="${esc(d.path)}" data-entity-id="${esc(actions.datasetEntityId(d.path))}" data-selection-key="${esc(actions.datasetEntityId(d.path))}" data-dkds-mobile-width-critical><input class="reswin-master" type="checkbox" ${row.forward!==false&&row.reverse!==false?'checked':''} ${d.excluded===true?'disabled':''}><div class="respar-dataset-content"><div class="respar-dataset-title" data-dkds-tooltip="${esc(d.path)}">${esc(d.name||d.path||'数据')}</div><label class="respar-dataset-vg"><span>Vg</span><input class="reswin-vg" type="number" step="any" value="${finite(d.vg)?Number(d.vg):''}" placeholder="?"><span>V</span></label><div class="respar-scan-toggle"><label><input class="reswin-forward" type="checkbox" ${row.forward!==false?'checked':''}> 正扫</label><label><input class="reswin-reverse" type="checkbox" ${row.reverse!==false?'checked':''}> 反扫</label></div><label class="respar-dataset-transform" data-dkds-tooltip="只改变检查器中的辅助视图；主图与峰位始终使用原始 I–V"><span>辅助</span><select class="reswin-dataset-transform">${transformOptionsHtml(transform)}</select></label></div></div>`;
      }).join('')||'<div class="empty-state">工程中没有数据。</div>';
    }
    function resetDatasetDelegation(){
      for(const dispose of datasetListDisposers.splice(0))try{dispose?.();}catch{}
      datasetListNode=null;
    }
    function ensureDatasetDelegation(list){
      if(!list||datasetListNode===list)return;
      resetDatasetDelegation();datasetListNode=list;
      datasetListDisposers.push(dom.on(list,'click',event=>{
        if(event.target?.closest?.('.reswin-vg'))event.stopPropagation();
      }));
      datasetListDisposers.push(dom.on(list,'change',event=>{
        const target=event.target,row=target?.closest?.('.respar-dataset-item');
        if(!target||!row||!list.contains(row))return;
        const path=String(row.dataset.datasetPath||'');if(!path)return;
        if(target.classList.contains('reswin-vg')){setDatasetVg(path,target.value);return;}
        if(target.classList.contains('reswin-master')){
          const map=actions.visibilityMap(),next=map.get(path)||{forward:true,reverse:true};
          next.forward=next.reverse=!!target.checked;map.set(path,next);live.workspace.scanVisibility=[...map.entries()];
          syncSelectedSweepToVisibility();
          syncDatasetVisibility(list);syncVisibilityModeButtons();fitVisibleData('visibility-master');actions.visibilityChanged?.('visibility-master');actions.scheduleSnapshot();return;
        }
        if(target.classList.contains('reswin-forward')){setVisibility(path,1,target.checked);return;}
        if(target.classList.contains('reswin-reverse')){setVisibility(path,-1,target.checked);return;}
        if(target.classList.contains('reswin-dataset-transform')){
          const map=new Map(live.workspace.transformPreviewByDataset||[]);map.set(path,String(target.value||'raw'));
          live.workspace.transformPreviewByDataset=[...map.entries()];actions.renderLinkedSelection({includeGroup:false});actions.scheduleSnapshot();
        }
      }));
    }
    function syncDatasetVisibility(list){
      if(!list)return;const visibility=actions.visibilityMap();
      for(const row of dom.all('.respar-dataset-item',list)){
        const path=String(row.dataset.datasetPath||''),state=visibility.get(path)||{forward:true,reverse:true};
        const forward=state.forward!==false,reverse=state.reverse!==false,master=dom.query('.reswin-master',row),forwardInput=dom.query('.reswin-forward',row),reverseInput=dom.query('.reswin-reverse',row);
        if(master){master.checked=forward&&reverse;master.indeterminate=forward!==reverse;}
        if(forwardInput)forwardInput.checked=forward;if(reverseInput)reverseInput.checked=reverse;
      }
    }
    function render(){
      const list=$('#reswinDatasetList');
      if(list){
        dom.html(list,datasetRowsHtml());ensureDatasetDelegation(list);ensureDatasetContextBehavior(list);syncDatasetVisibility(list);
      }
      for(const id of ['reswinSweepSelect','reswinInspectSweepSelect']){
        const sweep=$('#'+id);if(!sweep)continue;const rows=actions.visibleSweeps().length?actions.visibleSweeps():live.sweeps;
        dom.html(sweep,rows.map(sw=>`<option value="${esc(sw.id)}">${esc(sw.datasetName)} · Vg=${Number(sw.vg)} · ${directionName(sw.direction)}</option>`).join(''));
        if(rows.some(sw=>sw.id===live.selectedSweepId))sweep.value=live.selectedSweepId;
      }
      syncVisibilityModeButtons();
      const preset=$('#reswinPreset');if(preset)preset.value=live.workspace.algorithms?._preset||'balanced';
      const transform=$('#reswinTransform');if(transform)transform.value=currentTransform(actions.selectedSweep());
      const display=live.workspace.peakDisplay||{};
      const rejected=$('#reswinShowRejected');if(rejected)rejected.checked=display.showRejected===true;
      const width=$('#reswinShowWidth');if(width)width.checked=display.showWidth!==false;
      const points=$('#reswinShowPoints');if(points)points.checked=display.showPoints!==false;
      const physics=$('#reswinPhysicsLabels');if(physics)physics.checked=live.workspace.physicsShowLabels!==false;
      const legend=$('#reswinPeakLegend');
      if(legend){
        const cats=(live.workspace.peakCategories||[]).slice().sort((a,b)=>Number(a.order)-Number(b.order));
        dom.html(legend,cats.length?cats.map((cat,index)=>`<span><i class="dkds-series-swatch-line" data-peak-category-color="${index}"></i>${esc(cat.label||`峰${cat.order}`)}</span>`).join(''):'<span>尚无峰类别</span>');
        dom.all('[data-peak-category-color]',legend).forEach((swatch,index)=>dom.token(swatch,{'--dkds-series-color':actions.colorForPeakOrder(cats[index]?.order,1)}));
      }
    }
    function setDataSourceRuntime(runtime){dataSourcesRuntime=runtime||null;}
    function uiRuntimeChanged(){datasetContextBehavior?.dispose?.();datasetContextBehavior=null;}
    function dispose(){uiRuntimeChanged();resetDatasetDelegation();dataSourcesRuntime=null;}
    return Object.freeze({render,currentTransform,setTransform,setDatasetVg,setVisibility,setAllVisibility,setPreset,fitVisibleData,setDataSourceRuntime,uiRuntimeChanged,dispose});
  }
  window.DKDSPluginModules.define('builtin.resonance-workbench','feature-controls-runtime',Object.freeze({create}));
})();
