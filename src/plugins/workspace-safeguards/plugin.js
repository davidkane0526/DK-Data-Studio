(function(root,factory){
  const helpers=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root?.DKDSPlugins)return;

  root.DKDSPlugins.define({
    id:'builtin.workspace-safeguards',
    name:'Workspace Safeguards',
    version:'1.0.0',
    apiVersion:'1.3.0',
    description:'Adaptive shell layout, incremental-import result preservation, and duplicate-name warnings.',
    source:'builtin',
    order:5,
    capabilities:['ui.styles','workspace.integrity','data.import']
  },async ctx=>{
    const h=ctx.host;
    const R=h?.resonance;
    if(!R?.getState)throw new Error('Resonance host state is unavailable.');

    ctx.ui.styles.add('workspace-safeguards',`
      /* Use the actual free width in the top command bar. The old max-width on
         activity-switcher left a large unusable blank area before More Workspace. */
      .workspace-commandbar{flex:1 1 auto!important;min-width:0!important}
      .primary-activity-cluster{flex:0 1 auto!important;min-width:0!important;width:auto!important;max-width:none!important}
      .primary-activity-bar{flex:0 0 auto!important}
      .context-commandbar{flex:0 1 auto!important;min-width:0!important}
      .plugin-context-toolbar{flex:0 1 auto!important;min-width:0!important}
      .activity-switcher{flex:1 1 0!important;min-width:72px!important;max-width:none!important;width:auto!important}
      #activityBar{min-width:0!important;flex:0 1 auto!important}

      /* The import file list is the scroll region. The action row must never be
         pushed below the visible workbench when many files are selected. */
      .import-workbench-header,.import-workbench-footer{flex:0 0 auto!important}
      .import-workbench-body{min-height:0!important;overflow:hidden!important}
      .import-file-pane{min-height:0!important;overflow:hidden!important}
      .import-file-list{min-height:0!important;overflow:auto!important;overscroll-behavior:contain}
      .import-file-actions{flex:0 0 auto!important;position:relative;z-index:6;background:#fff}
      .import-main-pane{min-height:0!important}

      .import-duplicate-warning{
        flex:0 0 auto;margin:0;padding:7px 9px;border-top:1px solid #f2d29b;
        background:#fff8e8;color:#8a4b08;font-size:10px;line-height:1.45;
      }
      .import-file-item.import-name-warning{border-color:#edb45f;background:#fffaf0}
      .import-file-item.import-replace-warning{border-color:#df8b60;background:#fff7f2}
      .import-duplicate-badge{
        flex:0 0 auto;margin-left:auto;padding:2px 5px;border-radius:999px;
        background:#fff0d5;border:1px solid #efc27c;color:#8a4b08;font-size:9px;font-weight:700;
      }
      .import-file-item.import-replace-warning .import-duplicate-badge{
        background:#ffeadf;border-color:#e9a47d;color:#9a3412;
      }
    `);

    const clone=helpers.cloneValue;
    let baseline=null;
    let pendingRestore=null;
    let restoring=false;
    let duplicateReport={rows:[],hasDuplicates:false};
    let duplicateRefreshQueued=false;
    let shellRefreshQueued=false;
    let fileListObserver=null;
    let shellMutationObserver=null;
    let shellResizeObserver=null;

    function captureBaseline(){
      const s=R.getState();
      baseline={
        datasetRefs:new Map((s.datasets||[]).map(ds=>[String(ds.path||''),ds])),
        peaks:clone(s.peaks||[])
      };
    }

    function scheduleRestore(plan){
      pendingRestore=plan;
      queueMicrotask(()=>{
        if(!pendingRestore||restoring)return;
        const currentPlan=pendingRestore;
        pendingRestore=null;
        const s=R.getState();
        s.peaks=helpers.mergePreservedPeaks(
          s.peaks||[],
          currentPlan.preservedPeaks,
          currentPlan.unchangedPaths
        );

        const liveIds=new Set((s.peaks||[]).map(p=>p?.id).filter(Boolean));
        if(s.selectedPeakIds instanceof Set){
          s.selectedPeakIds=new Set([...s.selectedPeakIds].filter(id=>liveIds.has(id)));
        }
        if(s.selectedPeakId&&!liveIds.has(s.selectedPeakId))s.selectedPeakId=null;

        restoring=true;
        try{h.renderAll?.();}
        finally{
          restoring=false;
          captureBaseline();
        }
        h.setStatus?.(
          `增量导入完成：原有 ${currentPlan.unchangedPaths.size} 组数据的分析结果保持不变；`
          + `自动寻峰只保留在新增或明确替换的数据上。`
        );
      });
    }

    function onArtifactsChanged(){
      if(restoring||!baseline)return;
      const s=R.getState();
      const plan=helpers.makePreservationPlan(baseline,s.datasets||[]);
      if(!plan.changed||!plan.unchangedPaths.size)return;
      const preservedPeaks=(baseline.peaks||[])
        .filter(p=>plan.unchangedPaths.has(String(p?.datasetPath||'')))
        .map(clone);
      scheduleRestore({...plan,preservedPeaks});
    }

    function pendingImportRows(){
      return [...document.querySelectorAll('#importFileList .import-file-item')].map(el=>{
        const nameEl=el.querySelector('.import-file-name');
        return {
          element:el,
          name:String(nameEl?.textContent||'').trim(),
          path:String(nameEl?.getAttribute('title')||'').trim()
        };
      }).filter(row=>row.name);
    }

    function existingImportRows(){
      const seen=new Map();
      for(const ds of R.getState().datasets||[]){
        const path=String(ds?.sourcePath||ds?.path||'').trim();
        const name=String(ds?.sourceName||helpers.basename(path)||ds?.name||'').trim();
        const key=`${path}\n${name}`;
        if(path&&name&&!seen.has(key))seen.set(key,{path,name});
      }
      return [...seen.values()];
    }

    function ensureDuplicateWarning(){
      const pane=document.querySelector('.import-file-pane');
      const actions=pane?.querySelector('.import-file-actions');
      if(!pane||!actions)return null;
      let node=pane.querySelector('.import-duplicate-warning');
      if(!node){
        node=document.createElement('div');
        node.className='import-duplicate-warning hidden';
        pane.insertBefore(node,actions);
      }
      return node;
    }

    function refreshDuplicateWarnings(){
      duplicateRefreshQueued=false;
      const pending=pendingImportRows();
      duplicateReport=helpers.findDuplicateImports(pending,existingImportRows());
      const warning=ensureDuplicateWarning();

      for(const row of pending){
        row.element.classList.remove('import-name-warning','import-replace-warning');
        row.element.querySelector('.import-duplicate-badge')?.remove();
        const hit=duplicateReport.rows.find(x=>x.path===row.path&&x.nameKey===helpers.normalizeName(row.name));
        if(!hit)continue;
        row.element.classList.add(hit.exactPath?'import-replace-warning':'import-name-warning');
        const badge=document.createElement('span');
        badge.className='import-duplicate-badge';
        badge.textContent=hit.exactPath?'将替换':'同名';
        row.element.querySelector('.import-file-top')?.appendChild(badge);
      }

      if(warning){
        if(!duplicateReport.hasDuplicates){
          warning.classList.add('hidden');
          warning.textContent='';
        }else{
          const names=[...new Set(duplicateReport.rows.map(r=>r.name))];
          const replacements=duplicateReport.rows.filter(r=>r.exactPath).length;
          warning.classList.remove('hidden');
          warning.textContent=
            `检测到同名/已存在数据：${names.slice(0,5).join('、')}${names.length>5?'…':''}。`
            + (replacements?` 其中 ${replacements} 项与工程中的源文件路径相同，继续导入会替换该源文件的数据；`:' ')
            + `不同路径的同名文件会作为独立数据保留，请确认来源后再导入。`;
        }
      }
      return duplicateReport;
    }

    function scheduleDuplicateRefresh(){
      if(duplicateRefreshQueued)return;
      duplicateRefreshQueued=true;
      queueMicrotask(refreshDuplicateWarnings);
    }

    function onImportCommitCapture(event){
      const report=refreshDuplicateWarnings();
      if(!report.hasDuplicates)return;
      const names=[...new Set(report.rows.map(r=>r.name))];
      const exact=report.rows.filter(r=>r.exactPath).length;
      const message=
        `检测到同名或已存在的数据：\n\n${names.slice(0,10).join('\n')}${names.length>10?'\n…':''}`
        + `\n\n${exact?`其中 ${exact} 项来自与工程中相同的源文件路径，继续会替换这些源文件已有的数据。\n`:''}`
        + `不同路径的同名文件会作为独立数据保留。\n\n确认继续导入吗？`;
      if(!root.confirm(message)){
        event.preventDefault();
        event.stopImmediatePropagation();
        h.setStatus?.('已取消导入：请先确认同名文件或已有源文件。');
      }
    }

    function reflowSecondaryActivities(){
      shellRefreshQueued=false;
      const wrap=document.querySelector('.activity-switcher');
      const bar=document.querySelector('#activityBar');
      const menu=document.querySelector('#activityMoreMenu');
      const more=document.querySelector('#activityMoreBtn');
      if(!wrap||!bar||!menu||!more)return;

      shellMutationObserver?.disconnect();
      try{
        const buttons=[
          ...bar.querySelectorAll(':scope > .activity-tab'),
          ...menu.querySelectorAll(':scope > .activity-tab')
        ];
        buttons.sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100));
        for(const button of buttons)bar.appendChild(button);
        menu.classList.add('hidden');
        more.classList.add('hidden');
        more.setAttribute('aria-expanded','false');
        if(!buttons.length)return;

        const width=Math.max(0,Math.floor(wrap.getBoundingClientRect().width));
        if(!width)return;
        const widths=new Map(buttons.map(b=>[b,Math.ceil(b.getBoundingClientRect().width)+4]));
        const total=buttons.reduce((sum,b)=>sum+(widths.get(b)||0),0);
        if(total<=width)return;

        more.classList.remove('hidden');
        const moreWidth=Math.ceil(more.getBoundingClientRect().width)||86;
        const available=Math.max(0,width-moreWidth-4);
        const activeId=ctx.ui.activities.active?.()||'';
        const ranked=buttons.slice().sort((a,b)=>{
          const aa=a.dataset.activityId===activeId?1:0;
          const bb=b.dataset.activityId===activeId?1:0;
          return bb-aa||(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100);
        });
        const keep=new Set();
        let used=0;
        for(const button of ranked){
          const w=widths.get(button)||0;
          if((used+w<=available)||keep.size===0){keep.add(button);used+=w;}
        }
        for(const button of buttons)if(!keep.has(button))menu.appendChild(button);
      }finally{
        if(shellMutationObserver){
          shellMutationObserver.observe(bar,{childList:true});
          shellMutationObserver.observe(menu,{childList:true});
        }
      }
    }

    function scheduleShellRefresh(){
      if(shellRefreshQueued)return;
      shellRefreshQueued=true;
      requestAnimationFrame(reflowSecondaryActivities);
    }

    captureBaseline();
    ctx.events.on('data:artifacts-changed',onArtifactsChanged);
    ctx.events.on('workspace:render',()=>{
      if(!pendingRestore&&!restoring)captureBaseline();
      scheduleDuplicateRefresh();
      scheduleShellRefresh();
    });

    const fileList=document.querySelector('#importFileList');
    if(fileList){
      fileListObserver=new MutationObserver(scheduleDuplicateRefresh);
      fileListObserver.observe(fileList,{childList:true});
    }
    document.querySelector('#importCommitBtn')?.addEventListener('click',onImportCommitCapture,true);

    const activityBar=document.querySelector('#activityBar');
    const activityMenu=document.querySelector('#activityMoreMenu');
    if(activityBar&&activityMenu){
      shellMutationObserver=new MutationObserver(scheduleShellRefresh);
      shellMutationObserver.observe(activityBar,{childList:true});
      shellMutationObserver.observe(activityMenu,{childList:true});
    }
    if(root.ResizeObserver){
      shellResizeObserver=new ResizeObserver(scheduleShellRefresh);
      for(const el of [
        document.querySelector('.topbar-primary'),
        document.querySelector('.workspace-commandbar'),
        document.querySelector('.primary-activity-cluster'),
        document.querySelector('.activity-switcher')
      ])if(el)shellResizeObserver.observe(el);
    }else{
      root.addEventListener('resize',scheduleShellRefresh,{passive:true});
    }

    scheduleDuplicateRefresh();
    scheduleShellRefresh();

    return {
      deactivate(){
        fileListObserver?.disconnect();
        shellMutationObserver?.disconnect();
        shellResizeObserver?.disconnect();
        document.querySelector('#importCommitBtn')?.removeEventListener('click',onImportCommitCapture,true);
        if(!root.ResizeObserver)root.removeEventListener('resize',scheduleShellRefresh);
        document.querySelector('.import-duplicate-warning')?.remove();
      }
    };
  });
})(typeof window!=='undefined'?window:globalThis,function(){
  function cloneValue(value){
    if(typeof structuredClone==='function')return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeName(value){
    return String(value||'').trim().toLocaleLowerCase();
  }

  function basename(value){
    return String(value||'').split(/[\\/]/).filter(Boolean).pop()||'';
  }

  function makePreservationPlan(baseline,currentDatasets){
    const previous=baseline?.datasetRefs instanceof Map?baseline.datasetRefs:new Map();
    const current=new Map((currentDatasets||[]).map(ds=>[String(ds?.path||''),ds]));
    let changed=previous.size!==current.size;
    if(!changed){
      for(const [path,ref] of previous){
        if(current.get(path)!==ref){changed=true;break;}
      }
    }
    const unchangedPaths=new Set();
    for(const [path,ref] of current){
      if(path&&previous.get(path)===ref)unchangedPaths.add(path);
    }
    return {changed,unchangedPaths};
  }

  function mergePreservedPeaks(currentPeaks,preservedPeaks,unchangedPaths){
    const keep=unchangedPaths instanceof Set?unchangedPaths:new Set(unchangedPaths||[]);
    const generated=(currentPeaks||[]).filter(p=>!keep.has(String(p?.datasetPath||'')));
    return [...(preservedPeaks||[]).map(cloneValue),...generated];
  }

  function findDuplicateImports(pendingRows,existingRows){
    const pending=(pendingRows||[]).map(row=>({
      ...row,
      name:String(row?.name||'').trim(),
      path:String(row?.path||'').trim(),
      nameKey:normalizeName(row?.name)
    })).filter(row=>row.nameKey);
    const existing=(existingRows||[]).map(row=>({
      ...row,
      name:String(row?.name||'').trim(),
      path:String(row?.path||'').trim(),
      nameKey:normalizeName(row?.name)
    })).filter(row=>row.nameKey);

    const pendingCounts=new Map();
    for(const row of pending)pendingCounts.set(row.nameKey,(pendingCounts.get(row.nameKey)||0)+1);
    const existingByName=new Map();
    const existingPaths=new Set();
    for(const row of existing){
      if(!existingByName.has(row.nameKey))existingByName.set(row.nameKey,[]);
      existingByName.get(row.nameKey).push(row);
      if(row.path)existingPaths.add(row.path);
    }

    const rows=[];
    for(const row of pending){
      const exactPath=!!row.path&&existingPaths.has(row.path);
      const pendingSameName=(pendingCounts.get(row.nameKey)||0)>1;
      const existingSameName=(existingByName.get(row.nameKey)||[]).some(x=>x.path!==row.path||!row.path);
      if(exactPath||pendingSameName||existingSameName){
        rows.push({...row,exactPath,pendingSameName,existingSameName});
      }
    }
    return {rows,hasDuplicates:rows.length>0};
  }

  return {cloneValue,normalizeName,basename,makePreservationPlan,mergePreservedPeaks,findDuplicateImports};
});
