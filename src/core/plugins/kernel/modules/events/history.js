'use strict';
const {state, registries, cleanupByPlugin, eventListeners}=require('../context');
const listContributions=(...args)=>require('../contributions/typed').listContributions(...args);

  function assertId(id, what='id') {
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(String(id || ''))) {
      throw new Error(`Invalid plugin ${what}: ${id}`);
    }
  }

  function getRegistry(kind) {
    if (!registries.has(kind)) registries.set(kind, new Map());
    return registries.get(kind);
  }

  function eventOn(name, fn, owner) {
    if (!eventListeners.has(name)) eventListeners.set(name, new Set());
    const row = { fn, owner };
    eventListeners.get(name).add(row);
    return () => eventListeners.get(name)?.delete(row);
  }


  function eventEmitNow(name, payload) {
    const isLayout = name === 'layout:resize';
    const previousDispatching = state.layoutResizeDispatching;
    if (isLayout) state.layoutResizeDispatching = true;
    try {
      for (const row of eventListeners.get(name) || []) {
        try { row.fn(payload); } catch (err) { console.error(`[DKDS event:${name}]`, err); }
      }
    } finally {
      if (isLayout) state.layoutResizeDispatching = previousDispatching;
    }
  }

  function eventEmit(name, payload) {
    if (name !== 'layout:resize') return eventEmitNow(name, payload);
    // layout:resize is a frame signal, not a synchronous command. Window
    // resize, splitters, grids and renderer ResizeObservers may all report the
    // same geometry change. Coalesce them globally and reject recursive
    // layout notifications from listeners so a plugin can never create a
    // frame-by-frame feedback loop.
    if (state.layoutResizeDispatching) return false;
    state.layoutResizePending = { ...(state.layoutResizePending || {}), ...(payload || {}) };
    if (state.layoutResizeFrame) return true;
    const raf = globalThis.requestAnimationFrame || (fn => setTimeout(fn, 16));
    state.layoutResizeFrame = raf(() => {
      state.layoutResizeFrame = 0;
      const next = state.layoutResizePending || {};
      state.layoutResizePending = null;
      eventEmitNow('layout:resize', next);
    });
    return true;
  }

  function addCleanup(pluginId, fn) {
    if (typeof fn !== 'function') return fn;
    if (!cleanupByPlugin.has(pluginId)) cleanupByPlugin.set(pluginId, []);
    cleanupByPlugin.get(pluginId).push(fn);
    return fn;
  }

  function activityRows() {
    return listContributions('ui.activities')
      .slice()
      .sort((a,b)=>(Number(a.value?.order)||100)-(Number(b.value?.order)||100)
        || String(a.value?.label||a.id).localeCompare(String(b.value?.label||b.id)));
  }

  function activeActivity() {
    return activityRows().find(row=>row.value?.id===state.activeActivityId)?.value || null;
  }

  function activePluginId() {
    return activityRows().find(row=>row.value?.id===state.activeActivityId)?.pluginId || state.superPluginId || '';
  }

  function activeEditRows() {
    const pluginId=activePluginId();
    if(!pluginId)return [];
    return listContributions('ui.editActions').filter(row=>row.pluginId===pluginId).sort((a,b)=>(Number(a.value?.order)||100)-(Number(b.value?.order)||100));
  }

  function invokeEditAction(action,payload={}) {
    const name=String(action||'').trim();if(!name)return false;
    const pluginId=activePluginId(),rows=activeEditRows();
    for(const row of rows){
      const fn=row.value?.[name]||row.value?.actions?.[name];if(typeof fn!=='function')continue;
      try{
        const result=fn({action:name,payload,host:state.host,pluginId,activityId:state.activeActivityId});
        if(result&&typeof result.then==='function')return Promise.resolve(result).then(value=>value!==false).catch(err=>{console.error(`[DKDS edit:${pluginId}:${name}]`,err);return false;});
        return result!==false;
      }catch(err){console.error(`[DKDS edit:${pluginId}:${name}]`,err);return false;}
    }
    return false;
  }

  function supportsEditAction(action) {
    const name=String(action||'').trim();if(!name)return false;
    return activeEditRows().some(row=>typeof (row.value?.[name]||row.value?.actions?.[name])==='function');
  }

  function editActionAvailable(action) {
    const name=String(action||'').trim();if(!name)return false;
    for(const row of activeEditRows()){
      const fn=row.value?.[name]||row.value?.actions?.[name];if(typeof fn!=='function')continue;
      const guard=name==='undo'?(row.value?.canUndo||row.value?.history?.canUndo):name==='redo'?(row.value?.canRedo||row.value?.history?.canRedo):null;
      if(typeof guard!=='function')return true;
      try{if(guard({action:name,host:state.host,pluginId:row.pluginId,activityId:state.activeActivityId})!==false)return true;}catch(err){console.error(`[DKDS edit:${row.pluginId}:${name}:guard]`,err);}
    }
    return false;
  }

  function editHistoryState() {
    const pluginId=activePluginId();
    for(const row of activeEditRows()){
      const fn=row.value?.historyState||row.value?.history?.state;
      if(typeof fn!=='function')continue;
      try{
        const value=fn({host:state.host,pluginId,activityId:state.activeActivityId});
        if(value&&typeof value.then==='function')return Promise.resolve(value).then(state=>({...state,pluginId,providerId:row.id}));
        return {...(value||{}),pluginId,providerId:row.id};
      }catch(err){console.error(`[DKDS edit:${pluginId}:history]`,err);return null;}
    }
    return null;
  }

  function notifyEditHistory(pluginId,detail={}) {
    const payload={pluginId:String(pluginId||activePluginId()||''),activityId:String(state.activeActivityId||''),reason:String(detail?.reason||'change'),at:Date.now(),...(detail&&typeof detail==='object'?detail:{})};
    eventEmit('history:changed',payload);
    try{window.dispatchEvent(new CustomEvent('dkds:history-changed',{detail:payload}));}catch{}
    return true;
  }

module.exports=Object.freeze({assertId, getRegistry, eventOn, eventEmitNow, eventEmit, addCleanup, activityRows, activeActivity, activePluginId, activeEditRows, invokeEditAction, supportsEditAction, editActionAvailable, editHistoryState, notifyEditHistory});
