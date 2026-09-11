'use strict';
const {state, disabled}=require('../context');
const {definitionById, defaultPluginIcon, workspaceMeta}=require('../bootstrap');
const {addCleanup}=require('../registry');
const {renderActivityBar, sortContributions, sortButtons, refreshExportMenuPresentation, refreshToolMenuPresentation, refreshActivityVisibility, chooseFallbackActivity}=require('../activity/shell');
const {closeCommandMenu}=require('../shortcuts/menu');
const {eventOn}=require('../events/history');
const {runCommand, registerContribution}=require('../commands/toolbar');
const {registerTypedContribution}=require('./typed');
const {reflowContextToolbar}=require('../shell/context-toolbar');
const {pluginTypeOf}=require('../manifest');
const {pluginHostView}=require('../host-facade');
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
    spec.onMount?.({section,host:pluginHostView()});
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
    spec.onMount?.({element,host:pluginHostView()});
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
  let menuAvailabilityEventsBound=false;
  function normalizeMenuAvailability(value){
    if(value===undefined||value===null)return {visible:true,enabled:true,reason:''};
    if(typeof value==='boolean')return {visible:value,enabled:value,reason:''};
    if(typeof value!=='object')throw new Error('Menu availability must return a boolean or { visible, enabled, reason }.');
    return {visible:value.visible!==false,enabled:value.enabled!==false,reason:String(value.reason||'')};
  }
  function evaluateMenuAvailability(button,spec,pluginId,menu){
    let value;
    try{
      value=typeof spec.availability==='function'
        ?spec.availability({host:pluginHostView(),activityId:state.activeActivityId,pluginId,menu})
        :spec.availability;
      if(value&&typeof value.then==='function')throw new Error('Menu availability must be synchronous.');
      const status=normalizeMenuAvailability(value);
      button.hidden=!status.visible;
      button.disabled=status.visible&&!status.enabled;
      button.dataset.dkdsAvailability=status.visible?(status.enabled?'available':'disabled'):'unavailable';
      delete button.dataset.dkdsAvailabilityError;
      if(status.reason){button.title=status.reason;button.setAttribute('aria-description',status.reason);}
      else{button.removeAttribute('title');button.removeAttribute('aria-description');}
      return status;
    }catch(err){
      console.error(`[DKDS menu availability:${pluginId}/${spec.id||spec.label||menu}]`,err);
      button.hidden=true;button.disabled=true;button.dataset.dkdsAvailability='error';button.dataset.dkdsAvailabilityError=String(err?.message||err);
      return {visible:false,enabled:false,reason:String(err?.message||err),error:err};
    }
  }
  function refreshMenuAvailability(menu=''){
    const selector=menu?`[data-plugin-menu="${String(menu)}"] .plugin-menu-item`: '[data-plugin-menu] .plugin-menu-item';
    for(const button of document.querySelectorAll(selector)){
      const row=button.__dkdsMenuContribution;if(!row)continue;
      evaluateMenuAvailability(button,row.spec,row.pluginId,row.menu);
    }
    refreshExportMenuPresentation();
    refreshToolMenuPresentation();
  }
  function ensureMenuAvailabilityEvents(){
    if(menuAvailabilityEventsBound)return;
    menuAvailabilityEventsBound=true;
    for(const name of ['data:artifacts-changed','project:restored','activity:changed'])eventOn(name,()=>refreshMenuAvailability(),'core.menu-availability');
  }
  function addMenuItem(pluginId,spec={}) {
    const definition=definitionById(pluginId);const defaultMenu=definition&&pluginTypeOf(definition.manifest)==='tool'?'tools':'export';
    const menu=String(spec.menu||defaultMenu);
    const mount=document.querySelector(`[data-plugin-menu="${menu}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${menu}`);
    const button=createScopedButton(pluginId,{...spec,menu},`[data-plugin-menu="${menu}"]`,'plugin-menu-item');
    if(menu==='export')button.dataset.dkdsNativeSave='export';
    if(spec.nativeCopy)button.dataset.dkdsNativeCopy='clipboard';
    button.__dkdsMenuContribution={spec,pluginId,menu};
    const menuHost=mount.closest('.command-menu')||mount;
    if(!menuHost.__dkdsAvailabilityBound){
      menuHost.__dkdsAvailabilityBound=true;
      menuHost.addEventListener('dkds:menu-will-open',()=>refreshMenuAvailability(menu));
    }
    ensureMenuAvailabilityEvents();
    button.addEventListener('click',()=>closeCommandMenu(button.closest('.command-menu')));
    queueMicrotask(()=>refreshMenuAvailability(menu));
    addCleanup(pluginId,()=>queueMicrotask(()=>{refreshExportMenuPresentation();refreshToolMenuPresentation();}));
    return button;
  }
module.exports=Object.freeze({registerActivity, sidebarHost, addSidebarSection, addMainOverlay, createScopedButton, addMainTool, normalizeMenuAvailability, evaluateMenuAvailability, refreshMenuAvailability, addMenuItem});
