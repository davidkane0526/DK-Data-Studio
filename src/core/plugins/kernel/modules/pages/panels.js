'use strict';
const {state}=require('../context');
const {definitionById, defaultPluginIcon, workspaceMeta, isTopDefinition}=require('../bootstrap');
const {addCleanup}=require('../events/history');
const {refreshActivityVisibility}=require('../activity/shell');
const {registerActivity}=require('../contributions/ui');
const {createToolbarButton, registerCommand, runCommand, registerContribution}=require('../commands/toolbar');
const pluginTypeForManifest=(...args)=>require('../lifecycle').pluginTypeForManifest(...args);


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
    registerCommand(pluginId,commandId,()=>state.host?.openImportWorkbench?.({mode:'scoped',consumerId:pluginId,consumerLabel:meta.label,consumerIcon:meta.icon,accepts:meta.accepts,source:'workbench-action'}));
    const embeddedSuper=isTopDefinition(manifest)&&state.superPluginId===pluginId;
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
        if(state.host?.isAuxiliaryWindow)state.host?.closeCurrentWindow?.();
        else state.host?.closeAnalysisPage?.(page.id);
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
        state.host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host:state.host });
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
        state.host?.openAnalysisPage?.(page.id);
        await spec.onOpen?.({ page, host:state.host });
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
      state.host?.makeFloating?.(panel);
      addCleanup(pluginId,()=>panel.remove());
    }
    panel.dataset.pluginActivity=spec.activity||panel.dataset.pluginActivity||'';
    registerContribution(pluginId,'ui.panels',spec.id,{...spec,panelId:panel.id,element:panel});
    if(spec.toolbar!==false){
      const commandId=`${pluginId}.${spec.id}.toggle`;
      registerCommand(pluginId,commandId,async()=>{
        panel.classList.toggle('hidden');
        if(!panel.classList.contains('hidden'))await spec.onOpen?.({panel,host:state.host});
      });
      createToolbarButton(pluginId,{
        id:spec.buttonId,label:spec.toolbarLabel||spec.label||spec.id,title:spec.title||'',
        className:spec.buttonClass||'',group:spec.group||'analysis',activity:spec.activity||'',
        order:spec.order||100,priority:spec.priority||0,section:spec.section||'',command:commandId
      });
    }
    spec.onMount?.({panel,created,host:state.host});
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
      if (spec.toggle) return spec.toggle({ panel, host:state.host });
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

module.exports=Object.freeze({addStyle, workbenchImportMeta, mountWorkbenchImportAction, addPage, addPanel, addPanelToggle});
