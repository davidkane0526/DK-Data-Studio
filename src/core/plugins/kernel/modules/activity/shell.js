'use strict';
const {state, active, disabled}=require('../context');
const {definitionById, isTopDefinition, topActivityIdForPlugin, superState}=require('../bootstrap');
const {eventEmit, activityRows, activeActivity}=require('../events/history');
const {reflowContextToolbar}=require('../shell/context-toolbar');
const {pluginHostView}=require('../host-facade');


  function reflowActivities(){
    // Shell overflow geometry is owned by the Core shell-navigation recipe.
    // Kernel activity code only requests a reflow; it never reparents buttons.
    try{window.dispatchEvent(new CustomEvent('dkds:shell-navigation-reflow'));}catch{}
  }

  function renderToolMenu(){
    return state.host?.renderActivityNavigation?.({reason:'tool-menu'})||false;
  }

  function renderActivityBar() {
    const rendered=state.host?.renderActivityNavigation?.({reason:'activity-registry'})||false;
    if(rendered){
      sortButtons(document.querySelector('#pluginToolsMenu'));
      refreshToolMenuPresentation();
      queueMicrotask(reflowActivities);
    }
    return rendered;
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
    if(!pluginMenu)return;
    const scopedItems=[...pluginMenu.querySelectorAll('.plugin-menu-item')].filter(el=>!el.classList.contains('plugin-activity-hidden'));
    const availableItems=scopedItems.filter(el=>!el.hidden&&!el.classList.contains('hidden'));
    const registered=scopedItems.length>0;
    const active=activeActivity();
    let context=pluginMenu.querySelector('[data-plugin-export-context]')||null;
    if(registered){
      if(!context){context=document.createElement('div');context.className='plugin-export-context';context.dataset.pluginExportContext='1';pluginMenu.prepend(context);}
      context.textContent=`当前：${active?.contextLabel||active?.label||'当前插件'}`;
      context.classList.remove('hidden');
    }else context?.classList?.add('hidden');
    let empty=pluginMenu.querySelector('[data-plugin-export-empty]')||null;
    if(registered&&!availableItems.length){
      if(!empty){empty=document.createElement('div');empty.className='command-menu-empty';empty.dataset.pluginExportEmpty='1';empty.textContent='当前工作区没有可导出内容';pluginMenu.appendChild(empty);}
      empty.classList.remove('hidden');
    }else empty?.classList?.add('hidden');
    const trigger=document.querySelector('#exportMenuBtn');if(trigger){trigger.textContent='导出';trigger.disabled=!registered;trigger.removeAttribute('title');trigger.setAttribute('aria-label','导出');}
  }


  function refreshToolMenuPresentation(){
    const menu=document.querySelector('#pluginToolsMenu');
    const trigger=document.querySelector('#toolsMenuBtn');
    if(!menu||!trigger)return;
    const items=[...menu.querySelectorAll('.plugin-menu-item')].filter(el=>!el.classList.contains('hidden'));
    trigger.disabled=items.length===0;
    trigger.removeAttribute('title');trigger.setAttribute('aria-label','工具');
    let empty=menu.querySelector('[data-tools-empty]');
    if(!items.length){if(!empty){empty=document.createElement('div');empty.dataset.toolsEmpty='1';empty.className='command-menu-empty';empty.textContent='当前没有已启用的工具';menu.appendChild(empty);}empty.classList.remove('hidden');}
    else empty?.classList?.add('hidden');
  }

  function refreshActivityVisibility() {
    const id=state.activeActivityId;
    document.querySelectorAll('[data-plugin-activity]').forEach(el=>{
      const own=el.dataset.pluginActivity||'';
      el.classList.toggle('plugin-activity-hidden',!!own&&own!==String(id||''));
    });
    const title=document.querySelector('#activityContextTitle');
    const active=activeActivity();
    if(document?.body){
      document.body.dataset.superPlugin=state.superPluginId||'';
      document.body.dataset.superActivity=state.superPluginId?topActivityIdForPlugin(state.superPluginId):'';
      document.body.classList.toggle('super-unconfigured',!state.superPluginId);
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
    if(top&&!forceEmbedded&&!state.host?.isAuxiliaryWindow&&row.pluginId!==state.superPluginId){
      try{
        const opened=await state.host?.openActivityWindow?.(id);
        if(opened===false){state.host?.setStatus?.(`工作区 ${row.value?.label||id} 未能打开。`);return false;}
        return 'window';
      }catch(err){
        console.error(`[DKDS activity-window:${id}]`,err);
        state.host?.setStatus?.(`工作区 ${row.value?.label||id} 打开失败：${err.message||err}`);
        return false;
      }
    }
    state.activeActivityId=id;
    renderActivityBar();
    refreshActivityVisibility();
    state.host?.applySuperWorkspace?.(superState());
    if(invoke){
      try { await row.value?.onActivate?.({id,host:pluginHostView(),pluginId:row.pluginId,super:row.pluginId===state.superPluginId}); }
      catch(err){
        console.error(`[DKDS activity:${id}]`,err);
        state.host?.setStatus?.(`工作区 ${row.value?.label||id} 打开失败：${err.message}`);
        return false;
      }
    }
    return true;
  }

  function chooseFallbackActivity() {
    const rows=activityRows();
    if(state.host?.isAuxiliaryWindow){
      if(state.activeActivityId&&rows.some(r=>r.value?.id===state.activeActivityId))return state.activeActivityId;
      const preferred=rows.find(r=>r.value?.default===true)||rows[0]||null;
      state.activeActivityId=preferred?.value?.id||null;
      renderActivityBar();
      refreshActivityVisibility();
      return state.activeActivityId;
    }
    const current=superState();
    if(current.available){
      state.activeActivityId=current.activityId;
      renderActivityBar();
      refreshActivityVisibility();
      return state.activeActivityId;
    }
    state.activeActivityId=null;
    renderActivityBar();
    refreshActivityVisibility();
    state.host?.showNoSuperWorkspace?.(current);
    return null;
  }

module.exports=Object.freeze({reflowActivities, renderToolMenu, renderActivityBar, sortContributions, sortButtons, refreshExportMenuPresentation, refreshToolMenuPresentation, refreshActivityVisibility, setActiveActivity, chooseFallbackActivity});
