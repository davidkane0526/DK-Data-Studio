'use strict';
const {state, disabled}=require('../context');
const {definitionById, defaultPluginIcon, workspaceMeta}=require('../bootstrap');
const {addCleanup}=require('../events/history');
const {renderActivityBar, sortContributions, sortButtons, refreshExportMenuPresentation, refreshToolMenuPresentation, refreshActivityVisibility, chooseFallbackActivity}=require('../activity/shell');
const closeCommandMenu=(...args)=>require('../shortcuts/menu').closeCommandMenu(...args);
const closeOtherCommandMenus=(...args)=>require('../shortcuts/menu').closeOtherCommandMenus(...args);
const runCommand=(...args)=>require('../commands/toolbar').runCommand(...args);
const registerContribution=(...args)=>require('../commands/toolbar').registerContribution(...args);
const registerTypedContribution=(...args)=>require('./typed').registerTypedContribution(...args);
const pluginTypeForManifest=(...args)=>require('../lifecycle').pluginTypeForManifest(...args);

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
    button.title=spec.title||'';
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
    const definition=definitionById(pluginId);const defaultMenu=definition&&pluginTypeForManifest(definition.manifest)==='tool'?'tools':'export';
    const menu=String(spec.menu||defaultMenu);
    const mount=document.querySelector(`[data-plugin-menu="${menu}"]`);
    if(!mount)throw new Error(`Plugin menu mount not found: ${menu}`);
    const button=createScopedButton(pluginId,{...spec,menu},`[data-plugin-menu="${menu}"]`,'plugin-menu-item');
    button.addEventListener('click',()=>closeCommandMenu(button.closest('.command-menu')));
    const refresh=()=>{refreshExportMenuPresentation();refreshToolMenuPresentation();};
    queueMicrotask(refresh);addCleanup(pluginId,()=>queueMicrotask(refresh));
    return button;
  }

  function markToolbarSections(hostEl){
    if(!hostEl)return;
    const buttons=[...hostEl.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    let lastSection=null;
    for(const button of buttons){
      const section=button.dataset.pluginSection||'';
      const isStart=!!section&&section!==lastSection;
      button.classList.toggle('plugin-section-start',isStart);
      if(section)button.title=button.title||section;
      lastSection=section||lastSection;
    }
  }

  function closeContextOverflowPopup(){
    state.contextOverflowPopup?.dispose?.();
    state.contextOverflowPopup=null;
    document.querySelector('#contextOverflowBtn')?.setAttribute('aria-expanded','false');
  }

  function contextOverflowItems(container){
    const buttons=[...container.querySelectorAll(':scope > .plugin-toolbar-btn')]
      .filter(button=>!button.classList.contains('plugin-activity-hidden'));
    const items=[];
    let lastSection='';
    for(const button of buttons){
      const section=String(button.dataset.pluginSection||'');
      if(items.length&&section&&lastSection&&section!==lastSection)items.push({type:'separator'});
      items.push({
        id:button.id||`overflow-${items.length}`,
        label:String(button.textContent||button.title||'功能').trim(),
        enabled:()=>!button.disabled,
        onInvoke:()=>button.click()
      });
      if(section)lastSection=section;
    }
    return items;
  }

  function openContextOverflowPopup(button,container){
    if(!button||!container)return;
    closeContextOverflowPopup();
    const items=contextOverflowItems(container);
    if(!items.length)return;
    closeOtherCommandMenus();
    document.querySelectorAll('[aria-expanded="true"]').forEach(node=>{if(node!==button)node.setAttribute('aria-expanded','false');});
    const Menu=window.DKDSUI?.ContextMenu;
    if(!Menu){container.classList.remove('hidden');button.setAttribute('aria-expanded','true');return;}
    const rect=button.getBoundingClientRect();
    const menu=state.contextOverflowPopup=new Menu('core.shell',{onClose:()=>{button.setAttribute('aria-expanded','false');if(state.contextOverflowPopup===menu)state.contextOverflowPopup=null;}});
    button.setAttribute('aria-expanded','true');
    menu.open({x:Math.max(6,rect.right-184),y:rect.bottom+4,items});
  }

  function reflowContextToolbar() {
    closeContextOverflowPopup();
    const toolbar=document.querySelector('#pluginToolbarAnalysis');
    const overflow=document.querySelector('#contextOverflowMenu');
    const overflowBtn=document.querySelector('#contextOverflowBtn');
    const row=document.querySelector('.context-commandbar');
    if(!toolbar||!overflow||!overflowBtn||!row)return;

    // Return previous overflow items before measuring. Reflow must be stable
    // after resize, plugin activation, activity switches, and font changes.
    for(const child of [...overflow.querySelectorAll('.plugin-toolbar-btn')])toolbar.appendChild(child);
    sortButtons(toolbar);
    overflow.classList.add('hidden');
    overflowBtn.classList.add('hidden');

    const visible=[...toolbar.querySelectorAll('.plugin-toolbar-btn')]
      .filter(b=>!b.classList.contains('plugin-activity-hidden'));
    if(!visible.length){markToolbarSections(toolbar);return;}

    const available=Math.max(90,row.getBoundingClientRect().width);
    const widths=new Map(visible.map(b=>[b,Math.ceil(b.getBoundingClientRect().width)+3]));
    const total=visible.reduce((sum,b)=>sum+(widths.get(b)||0),0);
    if(total<=available){markToolbarSections(toolbar);return;}

    overflowBtn.classList.remove('hidden');
    const overflowWidth=Math.ceil(overflowBtn.getBoundingClientRect().width)||52;
    const target=Math.max(54,available-overflowWidth-4);

    // Priority decides which actions survive on the single-row command bar.
    // DOM/order still decides their final left-to-right sequence.
    const ranked=visible.slice().sort((a,b)=>(Number(b.dataset.pluginPriority)||0)-(Number(a.dataset.pluginPriority)||0)
      ||(Number(a.dataset.pluginOrder)||100)-(Number(b.dataset.pluginOrder)||100));
    const keep=new Set();
    let used=0;
    for(const b of ranked){
      const w=widths.get(b)||0;
      if(used+w<=target || keep.size===0){keep.add(b);used+=w;}
    }

    for(const b of visible)if(!keep.has(b))overflow.appendChild(b);
    if(!overflow.children.length)overflowBtn.classList.add('hidden');
    markToolbarSections(toolbar);
    markToolbarSections(overflow);
  }

module.exports=Object.freeze({registerActivity, sidebarHost, addSidebarSection, addMainOverlay, createScopedButton, addMainTool, addMenuItem, markToolbarSections, closeContextOverflowPopup, contextOverflowItems, openContextOverflowPopup, reflowContextToolbar});
