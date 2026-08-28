(function(root,factory){
  const helpers=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=helpers;
  if(!root?.DKDSHostRecipes)return;

  root.DKDSHostRecipes.register('workspace-safeguards',async ctx=>{

    let duplicateReport={rows:[],hasDuplicates:false};
    let duplicateRefreshQueued=false;
    let fileListObserver=null;

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
      const project=ctx.project.create?.()||{};
      for(const artifact of (Array.isArray(project?.dataModel?.artifacts)?project.dataModel.artifacts:[])){
        if(artifact?.metadata?.importedSource!==true)continue;
        const path=String(artifact?.source?.path||'').trim();
        const name=String(artifact?.source?.name||helpers.basename(path)||artifact?.name||'').trim();
        const key=`${path}\n${name}`;
        if(name&&!seen.has(key))seen.set(key,{path,name});
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
        ctx.status.set('已取消导入：请先确认同名文件或已有源文件。');
      }
    }

    ctx.events.on('data:artifacts-changed',scheduleDuplicateRefresh);
    ctx.events.on('workspace:render',scheduleDuplicateRefresh);

    const fileList=document.querySelector('#importFileList');
    if(fileList){
      fileListObserver=new MutationObserver(scheduleDuplicateRefresh);
      fileListObserver.observe(fileList,{childList:true});
    }
    document.querySelector('#importCommitBtn')?.addEventListener('click',onImportCommitCapture,true);

    scheduleDuplicateRefresh();

    return {
      deactivate(){
        fileListObserver?.disconnect();
        document.querySelector('#importCommitBtn')?.removeEventListener('click',onImportCommitCapture,true);
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
