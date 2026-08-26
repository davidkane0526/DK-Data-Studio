
  function reflowActivities(){
    const bar=document.querySelector('#activityBar');
    const menu=document.querySelector('#activityMoreMenu');
    const more=document.querySelector('#activityMoreBtn');
    const wrap=document.querySelector('.activity-switcher');
    if(!bar||!menu||!more||!wrap)return;

    for(const btn of [...menu.querySelectorAll('.activity-tab')])bar.appendChild(btn);
    const buttons=[...bar.querySelectorAll('.activity-tab')];
    buttons.sort((a,b)=>(Number(a.dataset.activityOrder)||100)-(Number(b.dataset.activityOrder)||100));
    buttons.forEach(b=>bar.appendChild(b));
    menu.classList.add('hidden');
    more.classList.add('hidden');

    const width=Math.max(0,wrap.getBoundingClientRect().width);
    if(!width||buttons.length<=1)return;
    const reserve=92;
    const max=Math.max(150,width-reserve);
    let used=0;
    const measured=buttons.map(b=>Math.ceil(b.getBoundingClientRect().width)+4);
    for(let i=0;i<buttons.length;i++)used+=measured[i];
    if(used<=width)return;

    more.classList.remove('hidden');
    used=0;
    // Always keep the active activity visible when possible.
    const activeBtn=buttons.find(b=>b.dataset.activityId===activeActivityId);
    const ordered=buttons.filter(b=>b!==activeBtn);
    if(activeBtn)ordered.unshift(activeBtn);
    const keep=new Set();
    for(const b of ordered){
      const idx=buttons.indexOf(b),w=measured[idx];
      if(used+w<=max||keep.size===0){keep.add(b);used+=w;}
    }
    for(const b of buttons)if(!keep.has(b))menu.appendChild(b);
  }

  function renderToolMenu(rows=activityRows()){
    const toolsMenu=document.querySelector('#pluginToolsMenu');
    if(!toolsMenu)return;
    toolsMenu.querySelectorAll?.('[data-tool-workspace-entry]')?.forEach?.(el=>el.remove());
    if(host?.isAuxiliaryWindow){refreshToolMenuPresentation();return;}
    for(const row of rows){
      const spec=row.value||{};
      const definition=definitionById(row.pluginId);
      const toolWorkspace=pluginTypeForManifest(definition?.manifest||{})==='tool'&&spec.role==='top'&&row.pluginId!==superPluginId;
      if(!toolWorkspace)continue;
      const toolButton=document.createElement('button');
      toolButton.type='button';toolButton.className='plugin-menu-item tool-workspace-menu-item';
      toolButton.dataset.toolWorkspaceEntry='1';toolButton.dataset.pluginId=row.pluginId;toolButton.dataset.activityId=spec.id;toolButton.dataset.pluginOrder=String(Number(spec.order)||100);
      toolButton.title=spec.title||spec.description||spec.label||spec.id;
      toolButton.innerHTML=`${spec.icon?`<span class="activity-icon" aria-hidden="true">${spec.icon}</span>`:''}<span>${spec.label||spec.id}</span>`;
      toolButton.onclick=async()=>{
        try{
          document.querySelector('#pluginToolsMenu')?.classList?.add('hidden');
          document.querySelector('#toolsMenuBtn')?.setAttribute?.('aria-expanded','false');
          const opened=await host?.openActivityWindow?.(spec.id);
          if(opened===false)host?.setStatus?.(`工具 ${spec.label||spec.id} 未能打开。`);
        }catch(err){console.error(`[DKDS tool-window:${spec.id}]`,err);host?.setStatus?.(`工具 ${spec.label||spec.id} 打开失败：${err.message||err}`);}
      };
      toolsMenu.appendChild(toolButton);
    }
    sortButtons(toolsMenu);refreshToolMenuPresentation();
  }

  function renderActivityBar() {
    const mount=document.querySelector('#activityBar');
    const primaryMount=document.querySelector('#primaryActivityBar');
    const overflow=document.querySelector('#activityMoreMenu');
    if(!mount)return;
    const rows=activityRows().filter(row=>String(row.value?.navigation||'')!=='system');
    mount.innerHTML='';
    if(primaryMount)primaryMount.innerHTML='';
    if(overflow)overflow.innerHTML='';
    renderToolMenu(rows);
    for(const row of rows){
      const spec=row.value||{};
      const definition=definitionById(row.pluginId);
      const toolWorkspace=pluginTypeForManifest(definition?.manifest||{})==='tool'&&spec.role==='top'&&row.pluginId!==superPluginId&&!host?.isAuxiliaryWindow;
      if(toolWorkspace)continue;
      const button=document.createElement('button');
      button.type='button';
      button.className='activity-tab';
      button.dataset.activityId=spec.id;
      button.dataset.pluginId=row.pluginId;
      button.dataset.activityOrder=String(Number(spec.order)||100);
      button.dataset.activityRole=spec.role||'';
      button.classList.toggle('top-workspace-tab',spec.role==='top');
      button.classList.toggle('super-workspace-tab',row.pluginId===superPluginId);
      button.title=(row.pluginId===superPluginId?'主界面 · ':'')+(spec.title||spec.description||spec.label||spec.id);
      const icon=spec.icon?`<span class="activity-icon" aria-hidden="true">${spec.icon}</span>`:'';
      button.innerHTML=`${icon}<span class="activity-label">${spec.label||spec.id}</span>`;
      button.classList.toggle('active',spec.id===activeActivityId);
      button.onclick=async()=>{
        const nonSuperTop=spec.role==='top'&&row.pluginId!==superPluginId&&!host?.isAuxiliaryWindow;
        if(nonSuperTop||(spec.openMode==='window'&&!host?.isAuxiliaryWindow&&row.pluginId!==superPluginId)){
          try{
            const opened=await host?.openActivityWindow?.(spec.id);
            if(opened===false)host?.setStatus?.(`工作区 ${spec.label||spec.id} 未能打开。`);
          }catch(err){
            console.error(`[DKDS activity-window:${spec.id}]`,err);
            host?.setStatus?.(`工作区 ${spec.label||spec.id} 打开失败：${err.message||err}`);
          }
          return;
        }
        try{await setActiveActivity(spec.id,{invoke:true});}
        catch(err){console.error(`[DKDS activity:${spec.id}]`,err);host?.setStatus?.(`工作区 ${spec.label||spec.id} 打开失败：${err.message||err}`);}
      };
      const target=(spec.primary&&primaryMount)?primaryMount:mount;
      target.appendChild(button);
    }
    queueMicrotask(reflowActivities);
  }

  function sortContributions(hostEl,selector='[data-plugin-order]') {
    if(!hostEl)return;
    const rows=[...hostEl.children].filter(el=>el.matches?.(selector));
    rows.sort((a,b)=>(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100)
      ||String(a.id||'').localeCompare(String(b.id||'')));
    for(const row of rows)hostEl.appendChild(row);
  }

  function sortButtons(hostEl) {
    sortContributions(hostEl,'.plugin-toolbar-btn,.plugin-main-tool-btn,.plugin-menu-item');
  }

  function refreshExportMenuPresentation(){
    const pluginMenu=document.querySelector('#pluginExportMenu');
    const visiblePluginItems=[...(pluginMenu?.querySelectorAll('.plugin-menu-item')||[])].filter(el=>!el.classList.contains('plugin-activity-hidden')&&!el.classList.contains('hidden'));
    const hasPluginExport=visiblePluginItems.length>0;
    document.querySelectorAll('[data-legacy-plot-export]').forEach(el=>el.classList.toggle('hidden',hasPluginExport));
    const active=activeActivity();
    let context=pluginMenu?.querySelector?.('[data-plugin-export-context]')||null;
    if(hasPluginExport&&pluginMenu){
      if(!context){context=document.createElement('div');context.className='plugin-export-context';context.dataset.pluginExportContext='1';pluginMenu.prepend(context);}
      context.textContent=`当前：${active?.contextLabel||active?.label||'当前插件'}`;
      context.classList.remove('hidden');
    }else context?.classList?.add('hidden');
    const trigger=document.querySelector('#exportMenuBtn');if(trigger){trigger.textContent='导出数据 ▾';trigger.title=hasPluginExport?`导出 ${active?.contextLabel||active?.label||'当前插件'} 的数据或图形`:'导出当前数据或图形';}
  }


  function refreshToolMenuPresentation(){
    const menu=document.querySelector('#pluginToolsMenu');
    const trigger=document.querySelector('#toolsMenuBtn');
    if(!menu||!trigger)return;
    const items=[...menu.querySelectorAll('.plugin-menu-item')].filter(el=>!el.classList.contains('hidden'));
    trigger.disabled=items.length===0;
    trigger.title=items.length?`打开工具（${items.length}）`:'当前没有已启用的工具插件';
    let empty=menu.querySelector('[data-tools-empty]');
    if(!items.length){if(!empty){empty=document.createElement('div');empty.dataset.toolsEmpty='1';empty.className='command-menu-empty';empty.textContent='当前没有已启用的工具';menu.appendChild(empty);}empty.classList.remove('hidden');}
    else empty?.classList?.add('hidden');
  }

  function refreshActivityVisibility() {
    const id=activeActivityId;
    document.querySelectorAll('[data-plugin-activity]').forEach(el=>{
      const own=el.dataset.pluginActivity||'';
      el.classList.toggle('plugin-activity-hidden',!!own&&!!id&&own!==id);
    });
    const title=document.querySelector('#activityContextTitle');
    const active=activeActivity();
    if(document?.body){
      document.body.dataset.superPlugin=superPluginId||'';
      document.body.dataset.superActivity=superPluginId?topActivityIdForPlugin(superPluginId):'';
      document.body.classList.toggle('super-unconfigured',!superPluginId);
    }
    if(title)title.textContent=active?.contextLabel||active?.label||'工作区';
    document.querySelectorAll('#activityBar .activity-tab,#primaryActivityBar .activity-tab').forEach(btn=>btn.classList.toggle('active',btn.dataset.activityId===id));
    reflowContextToolbar();
    refreshExportMenuPresentation();
    refreshToolMenuPresentation();
    eventEmit('activity:changed',{id,activity:active});
  }

  async function setActiveActivity(id,{invoke=true,forceEmbedded=false}={}) {
    const row=activityRows().find(x=>x.value?.id===id);
    if(!row) return false;
    const top=row.value?.role==='top'||isTopDefinition(definitionById(row.pluginId));
    if(top&&!forceEmbedded&&!host?.isAuxiliaryWindow&&row.pluginId!==superPluginId){
      await host?.openActivityWindow?.(id);
      return 'window';
    }
    activeActivityId=id;
    renderActivityBar();
    refreshActivityVisibility();
    host?.applySuperWorkspace?.(superState());
    if(invoke){
      try { await row.value?.onActivate?.({id,host,pluginId:row.pluginId,super:row.pluginId===superPluginId}); }
      catch(err){
        console.error(`[DKDS activity:${id}]`,err);
        host?.setStatus?.(`工作区 ${row.value?.label||id} 打开失败：${err.message}`);
        return false;
      }
    }
    return true;
  }

  function chooseFallbackActivity() {
    const rows=activityRows();
    if(host?.isAuxiliaryWindow){
      if(activeActivityId&&rows.some(r=>r.value?.id===activeActivityId))return activeActivityId;
      const preferred=rows.find(r=>r.value?.default===true)||rows[0]||null;
      activeActivityId=preferred?.value?.id||null;
      renderActivityBar();
      refreshActivityVisibility();
      return activeActivityId;
    }
    const current=superState();
    if(current.available){
      activeActivityId=current.activityId;
      renderActivityBar();
      refreshActivityVisibility();
      return activeActivityId;
    }
    activeActivityId=null;
    renderActivityBar();
    refreshActivityVisibility();
    host?.showNoSuperWorkspace?.(current);
    return null;
  }
