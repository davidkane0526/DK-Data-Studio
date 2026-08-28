'use strict';
const {state, disabled, projectSlices}=require('../context');
const {assertId,addCleanup}=require('../registry');
const {eventEmit}=require('../events/history');
const {sortContributions}=require('../activity/shell');
const {registerContribution}=require('../commands/toolbar');
const {restorePluginProjectState}=require('../lifecycle');
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
      button.removeAttribute?.('title');
      delete button.dataset.dkdsTooltip;
      const accessibleName=String(current.title||current.label||'').trim();if(accessibleName)button.setAttribute('aria-label',accessibleName);else button.removeAttribute('aria-label');
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
        try{clickHandler({event,eventSource:'state.host',element:button,pluginId,id,host:state.host});return true;}
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
module.exports=Object.freeze({statusBarZone, addStatusBarItem, registerProjectSlice, serializeProject, restoreProject, resetProjectSlices});
