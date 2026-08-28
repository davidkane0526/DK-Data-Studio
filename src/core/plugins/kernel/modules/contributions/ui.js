'use strict';
const {state, disabled}=require('../context');
const {definitionById, defaultPluginIcon, workspaceMeta}=require('../bootstrap');
const {addCleanup}=require('../registry');
const {renderActivityBar, sortContributions, sortButtons, refreshExportMenuPresentation, refreshToolMenuPresentation, refreshActivityVisibility, chooseFallbackActivity}=require('../activity/shell');
const {closeCommandMenu}=require('../shortcuts/menu');
const {runCommand, registerContribution}=require('../commands/toolbar');
const {registerTypedContribution}=require('./typed');
const {reflowContextToolbar}=require('../shell/context-toolbar');
const {pluginTypeOf}=require('../manifest');
  function registerActivity(pluginId,id,spec={}) {
    const definition=definitionById(pluginId);
    const meta=workspaceMeta(definition?.manifest);
    const role=String(spec.role||((meta.role==='top'&&(!meta.activity||meta.activity===id))?'top':'')).trim().toLowerCase();
    const value={id,label:id,order:100,icon:defaultPluginIcon(definition?.manifest),...spec,id,pluginId,role};
    // TOP plugins are always first-class workspace tabs. Whether a TOP opens
    // embedded or in its independent window is decided by the SUPER state.
    if(value.primary===undefined&&(role==='top'||value.openMode==='window'))value.primary=true;
    registerTypedContribution(pluginId,'ui.activities',id,value);
    addCleanup(pluginId,()=>{
      if(state.activeActivityId===id){
        state.activeActivityId=null;
        queueMicrotask(()=>chooseFallbackActivity());
      }else{
        renderActivityBar();
        refreshActivityVisibility();
      }
    });
    renderActivityBar();
    return value;
  }
  function sidebarHost() {
    return document.querySelector('[data-plugin-sidebar]')||document.querySelector('#pluginSidebarSections');
  }
  function addSidebarSection(pluginId,spec={}) {
    const mount=sidebarHost();
    if(!mount)throw new Error('Plugin sidebar mount not found.');
    const section=document.createElement('section');
    section.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-sidebar`;
    section.className=`plugin-sidebar-section ${spec.className||''}`.trim();
    section.dataset.pluginId=pluginId;
    section.dataset.pluginActivity=spec.activity||'';
    section.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)section.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    else if(spec.title)section.innerHTML=`<h3>${String(spec.title)}</h3>`;
    mount.appendChild(section);
    sortContributions(mount,'.plugin-sidebar-section');
    addCleanup(pluginId,()=>section.remove());
    spec.onMount?.({section,host:state.host});
    refreshActivityVisibility();
    return section;
  }
  function addMainOverlay(pluginId,spec={}) {
    const mount=document.querySelector(spec.mountSelector||'#mainPlotWrap');
    if(!mount)throw new Error(`Plugin main overlay mount not found: ${spec.mountSelector||'#mainPlotWrap'}`);
    const element=document.createElement(spec.tagName||'div');
    element.id=spec.elementId||`${pluginId.replace(/[.]/g,'-')}-${spec.id}-overlay`;
    element.className=`plugin-main-overlay ${spec.className||''}`.trim();
    element.dataset.pluginId=pluginId;
    element.dataset.pluginActivity=spec.activity||'';
    element.dataset.pluginOrder=String(Number(spec.order)||100);
    if(spec.html!==undefined)element.innerHTML=typeof spec.html==='function'?spec.html():String(spec.html);
    mount.appendChild(element);
    registerContribution(pluginId,'ui.mainOverlays',spec.id,{id:spec.id,element,activity:spec.activity||'',pluginId});
    addCleanup(pluginId,()=>element.remove());
    spec.onMount?.({element,host:state.host});
    refreshActivityVisibility();
    return element;
  }
  function createScopedButton(pluginId,spec,mountSelector,className) {
    const mount=document.querySelector(mountSelector);
    if(!mount)throw new Error(`Plugin mount not found: ${mountSelector}`);
    const button=document.createElement('button');
    button.type='button';
    button.id=spec.id||`${pluginId}__${spec.command||spec.label}`;
    button.className=className;
    button.textContent=spec.label||spec.id||pluginId;
    button.setAttribute('aria-label',String(spec.label||spec.title||spec.id||pluginId));
    button.dataset.pluginId=pluginId;
    button.dataset.pluginOrder=String(Number(spec.order)||100);
    button.dataset.pluginActivity=spec.activity||'';
    button.addEventListener('click',async event=>{
      try{
        if(spec.onClick)await spec.onClick(event);
        else if(spec.command)await runCommand(spec.command,{event});
      }catch(err){
        console.error(`[DKDS plugin action:${pluginId}]`,err);
        state.host?.setStatus?.(`插件 ${pluginId} 执行失败：${err.message}`);
      }
    });
    mount.appendChild(button);
    sortButtons(mount);
    addCleanup(pluginId,()=>button.remove());
    refreshActivityVisibility();
    return button;
  }
  function addMainTool(pluginId,spec) {
    return createScopedButton(pluginId,spec,'[data-plugin-main-tools]','plugin-main-tool-btn');
  }
  function addMenuItem(pluginId,spec={}) {
    const definition=definitionById(pluginId);const defaultMenu=definition&&pluginTypeOf(definition.manifest)==='tool'?'tools':'export';
    const menu=String(spec.menu||defaultMenu);
    const mount=document.querySelector(`[data-plugin-menu="${menu}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${menu}`);
    const button=createScopedButton(pluginId,{...spec,menu},`[data-plugin-menu="${menu}"]`,'plugin-menu-item');
    button.addEventListener('click',()=>closeCommandMenu(button.closest('.command-menu')));
    const refresh=()=>{refreshExportMenuPresentation();refreshToolMenuPresentation();};
    queueMicrotask(refresh);addCleanup(pluginId,()=>queueMicrotask(refresh));
    return button;
  }
module.exports=Object.freeze({registerActivity, sidebarHost, addSidebarSection, addMainOverlay, createScopedButton, addMainTool, addMenuItem});
