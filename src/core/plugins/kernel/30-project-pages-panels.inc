  function statusBarZone(side='right') {
    const normalized=String(side||'right').toLowerCase()==='left'?'left':'right';
    return document.querySelector(normalized==='left'?'#statusBarPluginLeft':'#statusBarPluginRight');
  }

  function addStatusBarItem(pluginId,spec={}) {
    const id=String(spec.id||'').trim();
    assertId(id,'status item id');
    let current={order:100,side:'right',icon:'',label:'',title:'',state:'',hidden:false,disabled:false,className:'',...spec,id};
    const button=document.createElement('button');
    button.type='button';
    button.className='plugin-status-item';
    button.dataset.pluginId=pluginId;
    button.dataset.pluginStatusId=id;
    const icon=document.createElement('span');
    icon.className='plugin-status-icon';
    icon.setAttribute('aria-hidden','true');
    const label=document.createElement('span');
    label.className='plugin-status-label';
    button.append(icon,label);
    let clickHandler=typeof current.onClick==='function'?current.onClick:null;

    const moveToZone=()=>{
      const zone=statusBarZone(current.side);
      if(!zone)return false;
      if(button.parentElement!==zone)zone.appendChild(button);
      sortContributions(zone,'.plugin-status-item');
      return true;
    };
    const apply=patch=>{
      if(patch&&typeof patch==='object')current={...current,...patch,id};
      clickHandler=typeof current.onClick==='function'?current.onClick:null;
      button.dataset.pluginOrder=String(Number(current.order)||100);
      button.dataset.state=String(current.state||'');
      button.className=`plugin-status-item ${current.className||''} ${clickHandler?'':'passive'}`.trim();
      button.classList.toggle('hidden',!!current.hidden);
      button.disabled=!!current.disabled;
      button.title=String(current.title||current.label||'');
      icon.textContent=String(current.icon||'');
      icon.classList.toggle('hidden',!current.icon);
      label.textContent=String(current.label??'');
      label.classList.toggle('hidden',current.label===undefined||current.label===null||String(current.label)==='');
      moveToZone();
      queueMicrotask(()=>eventEmit('status:changed',{pluginId,id,value:{...current}}));
      return controller;
    };
    const controller={
      id,pluginId,element:button,
      update:patch=>apply(patch),
      invoke:event=>{
        if(button.disabled||typeof clickHandler!=='function')return false;
        try{clickHandler({event,eventSource:'host',element:button,pluginId,id,host});return true;}
        catch(err){console.error(`[DKDS status bar:${pluginId}/${id}]`,err);return false;}
      },
      remove:()=>{button.remove();eventEmit('status:changed',{pluginId,id,removed:true});},
      get value(){return {...current};}
    };
    button.addEventListener('click',event=>controller.invoke(event));
    registerContribution(pluginId,'ui.statusItems',id,controller);
    addCleanup(pluginId,()=>button.remove());
    apply(current);
    return controller;
  }

  function registerProjectSlice(pluginId, key, hooks) {
    assertId(key, 'project slice key');
    if (!projectSlices.has(pluginId)) projectSlices.set(pluginId, new Map());
    const map = projectSlices.get(pluginId);
    map.set(key, hooks || {});
    return addCleanup(pluginId, () => map.delete(key));
  }

  function serializeProject(base={}) {
    let out = {};
    try { out = JSON.parse(JSON.stringify(base || {})); } catch { out = {}; }
    for (const [pluginId, slices] of projectSlices) {
      const pluginData = {};
      for (const [key, hooks] of slices) {
        if (typeof hooks.serialize !== 'function') continue;
        try { pluginData[key] = hooks.serialize(); }
        catch (err) { console.error(`[DKDS plugin project serialize:${pluginId}/${key}]`, err); }
      }
      if (Object.keys(pluginData).length) out[pluginId] = pluginData;
    }
    return out;
  }

  function restoreProject(data={}) {
    // Project-format migration resolves historical root fields before the plugin
    // kernel sees a project. Runtime restoration therefore consumes namespaced
    // plugin slices only; a missing slice is a fresh/reset state.
    for (const pluginId of projectSlices.keys()) restorePluginProjectState(pluginId, data);
    eventEmit('project:restored', { data });
  }

  function resetProjectSlices() {
    for (const [pluginId, slices] of projectSlices) {
      for (const [key, hooks] of slices) {
        if (typeof hooks.reset !== 'function') continue;
        try { hooks.reset(); }
        catch (err) { console.error(`[DKDS plugin project reset:${pluginId}/${key}]`, err); }
      }
    }
  }

  function addStyle(pluginId, id, cssText) {
    const el = document.createElement('style');
    el.dataset.pluginId = pluginId;
    el.dataset.pluginStyle = id;
    const css = String(cssText || '');
    el.textContent = `@layer dkds.plugin {\n${css}\n}`;
    // Plugin styles have one explicit cascade owner. They no longer depend on
    // activation order or on being inserted before/after a particular Core file.
    document.head.appendChild(el);
    return addCleanup(pluginId, () => el.remove());
  }

  function workbenchImportMeta(manifest={}){
    const type=pluginTypeForManifest(manifest),workspace=workspaceMeta(manifest);
    const accepts=Array.isArray(manifest?.data?.accepts)?manifest.data.accepts.map(String).filter(Boolean):[];
    if(type!=='workbench'&&!(type==='tool'&&workspace.role==='top'&&accepts.length))return null;
    return {accepts,label:String(workspace.title||manifest.name||manifest.id||'当前工作台'),icon:String(workspace.icon||defaultPluginIcon(manifest))};
  }

  function mountWorkbenchImportAction(pluginId,page,pageActivity,manifest,spec={}){
    const meta=workbenchImportMeta(manifest);if(!meta||!page)return null;
    const commandId=`${pluginId}.${String(spec.id||'workbench')}.core-import-data`;
    registerCommand(pluginId,commandId,()=>host?.openImportWorkbench?.({mode:'scoped',consumerId:pluginId,consumerLabel:meta.label,consumerIcon:meta.icon,accepts:meta.accepts,source:'workbench-action'}));
    const embeddedSuper=isTopDefinition(manifest)&&superPluginId===pluginId;
    if(embeddedSuper&&pageActivity){
      return createToolbarButton(pluginId,{id:`${String(spec.id||'workbench')}-core-import`,label:'导入数据',title:`导入到 ${meta.label}`,icon:'⇩',activity:pageActivity,section:'DATA',order:0,priority:100,command:commandId,className:'dkds-core-import-action'});
    }
    const header=page.querySelector('.analysis-page-header');
    if(!header){
      if(pageActivity){
        return createToolbarButton(pluginId,{id:`${String(spec.id||'workbench')}-core-import`,label:'导入数据',title:`导入到 ${meta.label}`,icon:'⇩',activity:pageActivity,section:'DATA',order:0,priority:100,command:commandId,className:'dkds-core-import-action'});
      }
      return null;
    }
    let slot=page.querySelector('[data-dkds-slot="workbench-import"]');
    if(!slot){
      slot=document.createElement('div');slot.dataset.dkdsSlot='workbench-import';
      const pluginActions=header.querySelector('.dkds-plugin-header-actions');
      const close=header.querySelector('.analysis-page-close');
      if(pluginActions)header.insertBefore(slot,pluginActions);else if(close)header.insertBefore(slot,close);else header.appendChild(slot);
    }
    slot.classList.add('dkds-core-workbench-import-slot');slot.replaceChildren();
    const button=document.createElement('button');button.type='button';button.className='dkds-core-import-action';button.dataset.dkdsCoreAction='workbench-import';button.title=`导入到 ${meta.label}`;button.textContent='导入数据';button.onclick=()=>runCommand(commandId,{source:'workbench-import-action'});slot.appendChild(button);
    return button;
  }

  function addPage(pluginId, spec) {
    const definition=definitionById(pluginId),manifest=definition?.manifest||{};
    let page = spec.pageId ? document.getElementById(spec.pageId) : null;
    if (!page && spec.html) {
      page = document.createElement('section');
      page.id = spec.pageId || `${pluginId.replace(/[.]/g,'-')}-${spec.id}-page`;
      page.className = `analysis-page hidden plugin-analysis-page ${spec.className || ''}`.trim();
      page.dataset.pluginId = pluginId;
      page.innerHTML = spec.html;
      document.querySelector('#app')?.appendChild(page);
      addCleanup(pluginId, () => page.remove());
    }
    if (!page) throw new Error(`Plugin page not found: ${spec.pageId || spec.id}`);
    const standaloneWorkbench=pluginTypeForManifest(manifest)==='workbench'&&!workspaceMeta(manifest).role&&!spec.activity&&spec.presentation!=='toolbar'&&spec.primary!==false;
    const pageActivity=String(spec.activity||(standaloneWorkbench?spec.activityId||spec.id:'')||page.dataset.pluginActivity||'');
    page.dataset.pluginActivity = pageActivity;
    mountWorkbenchImportAction(pluginId,page,pageActivity,manifest,spec);

    for (const close of page.querySelectorAll('.analysis-page-close')) {
      if (close.dataset.dkdsPluginCloseBound === '1') continue;
      close.dataset.dkdsPluginCloseBound = '1';
      close.addEventListener('click', () => {
        if(host?.isAuxiliaryWindow)host?.closeCurrentWindow?.();
        else host?.closeAnalysisPage?.(page.id);
      });
    }

    registerContribution(pluginId, 'ui.pages', spec.id, {
      ...spec,
      pageId: page.id,
      element: page
    });
    addCleanup(pluginId, () => page.classList.add('hidden'));

    if (standaloneWorkbench) {
      const commandId = `${pluginId}.${spec.id}.open`;
      registerCommand(pluginId, commandId, async () => {
        host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host });
      });
      registerActivity(pluginId,pageActivity,{
        label:spec.label||manifest.name||spec.id,
        title:spec.title||manifest.description||'',
        icon:String(spec.icon||defaultPluginIcon(manifest)),
        order:Number(spec.order??manifest.order??100),
        primary:true,
        description:String(spec.description||manifest.description||''),
        onActivate:()=>runCommand(commandId,{source:'activity'})
      });
    } else if (spec.toolbar !== false) {
      const commandId = `${pluginId}.${spec.id}.open`;
      registerCommand(pluginId, commandId, async () => {
        host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host });
      });
      createToolbarButton(pluginId, {
        id: spec.buttonId,
        label: spec.label || spec.id,
        title: spec.title || '',
        className: spec.buttonClass || '',
        group: spec.group || 'analysis',
        activity: spec.activity || '',
        order: spec.order || 100,
        priority: spec.priority || 0,
        section: spec.section || '',
        command: commandId
      });
    }
    return page;
  }

  function addPanel(pluginId,spec={}) {
    let panel=spec.panelId?document.getElementById(spec.panelId):null;
    let created=false;
    if(!panel){
      panel=document.createElement('div');
      panel.id=spec.panelId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-panel`;
      panel.className=`floating-panel hidden ${spec.className||''}`.trim();
      panel.dataset.pluginId=pluginId;
      panel.dataset.pluginActivity=spec.activity||'';
      panel.innerHTML=`
        <div class="floating-header drag-handle">
          <span>${spec.label||spec.id||pluginId}</span>
          <div class="panel-header-actions">
            ${spec.headerActionsHtml||''}
            <button class="panel-close" type="button" aria-label="关闭">×</button>
          </div>
        </div>
        <div class="floating-body ${spec.bodyClass||''}">${spec.html||''}</div>`;
      document.querySelector('#app')?.appendChild(panel);
      created=true;
      panel.querySelector('.panel-close')?.addEventListener('click',()=>panel.classList.add('hidden'));
      host?.makeFloating?.(panel);
      addCleanup(pluginId,()=>panel.remove());
    }
    panel.dataset.pluginActivity=spec.activity||panel.dataset.pluginActivity||'';
    registerContribution(pluginId,'ui.panels',spec.id,{...spec,panelId:panel.id,element:panel});
    if(spec.toolbar!==false){
      const commandId=`${pluginId}.${spec.id}.toggle`;
      registerCommand(pluginId,commandId,async()=>{
        panel.classList.toggle('hidden');
        if(!panel.classList.contains('hidden'))await spec.onOpen?.({panel,host});
      });
      createToolbarButton(pluginId,{
        id:spec.buttonId,label:spec.toolbarLabel||spec.label||spec.id,title:spec.title||'',
        className:spec.buttonClass||'',group:spec.group||'analysis',activity:spec.activity||'',
        order:spec.order||100,priority:spec.priority||0,section:spec.section||'',command:commandId
      });
    }
    spec.onMount?.({panel,created,host});
    refreshActivityVisibility();
    return panel;
  }

  function addPanelToggle(pluginId, spec) {
    const panel = document.getElementById(spec.panelId);
    if (!panel) throw new Error(`Plugin panel not found: ${spec.panelId}`);
    panel.dataset.pluginActivity = spec.activity || panel.dataset.pluginActivity || '';
    const commandId = `${pluginId}.${spec.id}.toggle`;
    addCleanup(pluginId, () => panel.classList.add('hidden'));
    registerCommand(pluginId, commandId, () => {
      if (spec.toggle) return spec.toggle({ panel, host });
      panel.classList.toggle('hidden');
    });
    return createToolbarButton(pluginId, {
      id: spec.buttonId,
      label: spec.label,
      title: spec.title,
      className: spec.buttonClass,
      group: spec.group || 'analysis',
      activity: spec.activity || '',
      order: spec.order || 100,
      priority: spec.priority || 0,
      section: spec.section || '',
      command: commandId
    });
  }
